import apiClient from './axios';
import { enrichWithScrapedProfile } from '@/utils/scraped-research';

/** Frappe returns whitelisted method result in response.message */
function unwrapMessage(data) {
  const list = data?.message ?? data;
  return Array.isArray(list) ? list : [];
}

/**
 * Create a new CRM Account.
 * @param {Object} payload – field values matching create_crm_account signature
 * @returns {Promise<{ name: string, message: string }>}
 */
export async function createCrmAccount(payload) {
  const { data } = await apiClient.post(
    '/method/devx.devx_crm.doctype.crm_account.crm_account.create_crm_account',
    payload,
  );
  return data?.message ?? data;
}

/**
 * Fetch a single CRM Account by name (Frappe resource API).
 * @param {string} name – CRM Account name (id)
 * @returns {Promise<Object>} Normalized account for detail view
 */
export async function getCrmAccount(name) {
  if (!name) return null;
  const encoded = encodeURIComponent(name);
  const { data } = await apiClient.get(`/resource/CRM Account/${encoded}`);
  const document_ = data?.data ?? data;
  if (!document_) return null;
  const account = normalizeCrmAccountDocument(document_);
  return enrichWithScrapedProfile(account, name, 'CRM Account');
}

/**
 * Fetch contacts for a CRM Account (associate_account = accountName, is_deleted = 0).
 * @param {string} accountName – CRM Account name (id)
 * @param {{ keyword?: string, pageSize?: number }} [opts]
 * @returns {Promise<Array<{ name, full_name }>>}
 */
export async function getCrmAccountContacts(accountName, { keyword, pageSize = 500 } = {}) {
  if (!accountName) return [];
  const params = { account_name: accountName, page_size: pageSize };
  const trimmedKeyword = typeof keyword === 'string' ? keyword.trim() : '';
  if (trimmedKeyword) params.keyword = trimmedKeyword;

  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_account.get_crm_account_contacts',
    { params },
  );
  const list = data?.message ?? data;
  return Array.isArray(list) ? list : [];
}

/**
 * Fetch CRM accounts linked to a CP Contact (cp_contact = cpContactId). For CP Contact detail Account tab.
 * @param {string} cpContactId – CP Contact document name (id)
 * @returns {Promise<Array<{ name, customer_name, created_at, related_contacts, website, sales_owner, cp_account }>>}
 */
export async function getCrmAccountsByCpContact(cpContactId) {
  if (!cpContactId) return [];
  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_account.get_crm_accounts_by_cp_contact',
    { params: { cp_contact_id: cpContactId } },
  );
  const list = data?.message ?? data;
  return Array.isArray(list) ? list : [];
}

/**
 * Fetch CRM accounts linked to a CP Account (cp_account = cpAccountId). For CP Account detail Accounts tab.
 * @param {string} cpAccountId – CP Account Details document name (id)
 * @returns {Promise<Array<{ name, customer_name, cp_contact, cp_contact_name, related_contacts, created_at, website, sales_owner }>>}
 */
export async function getCrmAccountsByCpAccount(cpAccountId) {
  if (!cpAccountId) return [];
  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_account.get_crm_accounts_by_cp_account',
    { params: { cp_account_id: cpAccountId } },
  );
  const list = data?.message ?? data;
  return Array.isArray(list) ? list : [];
}

/**
 * Map Frappe CRM Account doc to shape expected by detail page (About, Statutory, Bank).
 */
function normalizeCrmAccountDocument(document_) {
  const addresses = document_.custom_addresses || [];
  const primaryRow = addresses.find((a) => a.is_primary);
  const billingRow = addresses.find((a) => a.is_billing);
  const toAddr = (row) =>
    row
      ? {
          address_line1: row.address_line_1 || '',
          address_line2: row.address_line_2 || '',
          city: row.city || '',
          state: row.state || '',
          country: row.country || '',
          pin_code: row.pincode || '',
        }
      : null;

  const bankRows = document_.custom_bank_details || [];
  const banks = bankRows.map((row, i) => ({
    id: row.name || `bank-${i}`,
    bank_name: row.bank_name || '',
    bank_account_number: row.bank_account_number || '',
    account_type: row.account_type || '',
    ifsc_code: row.ifsc_code || '',
    is_primary: Boolean(row.is_primary),
  }));

  const socialRows = document_.social_links || [];
  const platformToLink = (p) => {
    const row = socialRows.find((r) => (r.platform || '').toLowerCase() === p.toLowerCase());
    return row?.link || '';
  };

  return {
    name: document_.name,
    id: document_.name,
    customer_name: document_.customer_name,
    legal_name: document_.customer_name,
    account_name: document_.custom_legal_name,
    custom_legal_name: document_.custom_legal_name || '',
    sales_owner: document_.sales_owner || '',
    year_of_establishment: document_.custom_year_of_establishment || '',
    type_of_organization: document_.customer_group || '',
    industry: document_.industry || '',
    parent_company: document_.parent_company || null,
    associate_company: document_.associate_company || null,
    cp_account: document_.cp_account || '',
    cp_contact: document_.cp_contact || '',
    no_of_employees:
      document_.number_of_employees != null && document_.number_of_employees !== ''
        ? String(document_.number_of_employees)
        : '',
    website: document_.website || '',
    primary_address: toAddr(primaryRow),
    billing_address: toAddr(billingRow),
    banks,
    linkedin: platformToLink('LinkedIn'),
    instagram: platformToLink('Instagram'),
    facebook: platformToLink('Facebook'),
    // Statutory & Compliance (field names expected by crm-account-about-statutory)
    registration_number: document_.custom_organization_registration_number || '',
    pan_number: document_.pan_number || '',
    tan_number: document_.custom_tan_number || '',
    gst_status: document_.custom_gst_status || '',
    gstin: document_.gstin || '',
    msme_number: document_.custom__msme_registered_number || '',
    pf_number: document_.custom_provident_fund_number || '',
    esi_number: document_.custom_esi_number || '',
    professional_tax: document_.custom_professional_tax_number || '',
  };
}

/**
 * Build payload for PUT /api/resource/Crm Account/{name} from normalized account state.
 * Only includes editable fields; maps frontend names back to Frappe field names.
 */
export function buildCrmAccountPutPayload(account) {
  if (!account) return null;

  const primary = account.primary_address;
  const billing = account.billing_address;
  const toBackendAddr = (addr) => {
    if (!addr || typeof addr !== 'object') return null;
    return {
      address_line_1: (addr.address_line1 ?? '').toString().trim(),
      address_line_2: (addr.address_line2 ?? '').toString().trim(),
      city: (addr.city ?? '').toString().trim(),
      state: (addr.state ?? '').toString().trim(),
      country: (addr.country ?? '').toString().trim(),
      pincode: (addr.pin_code ?? '').toString().trim(),
    };
  };

  const custom_addresses = [];
  if (primary && Object.values(primary).some((v) => v != null && String(v).trim() !== '')) {
    custom_addresses.push({ ...toBackendAddr(primary), is_primary: 1, is_billing: 0 });
  }
  if (billing && Object.values(billing).some((v) => v != null && String(v).trim() !== '')) {
    custom_addresses.push({ ...toBackendAddr(billing), is_primary: 0, is_billing: 1 });
  }

  const custom_bank_details = (account.banks || []).map((b) => {
    const row = {
      bank_name: (b.bank_name ?? '').toString().trim(),
      bank_account_number: (b.bank_account_number ?? '').toString().trim(),
      account_type: (b.account_type ?? '').toString().trim(),
      ifsc_code: (b.ifsc_code ?? '').toString().trim(),
      is_primary: b.is_primary ? 1 : 0,
    };
    if (b.id && typeof b.id === 'string' && !b.id.startsWith('bank-')) {
      row.name = b.id;
    }
    return row;
  });

  const payload = {
    customer_name:
      (account.customer_name ?? account.legal_name ?? '').toString().trim() || undefined,
    custom_legal_name: (account.legal_name ?? '').toString().trim() || undefined,
    customer_group: (account.type_of_organization ?? '').toString().trim() || undefined,
    industry: (account.industry ?? '').toString().trim() || undefined,
    sales_owner: (account.sales_owner ?? '').toString().trim() || undefined,
    custom_year_of_establishment:
      (account.year_of_establishment ?? '').toString().trim() || undefined,
    website: (account.website ?? '').toString().trim() || undefined,
    number_of_employees:
      account.no_of_employees !== '' && account.no_of_employees != null
        ? String(account.no_of_employees).trim()
        : undefined,
    parent_company: (account.parent_company ?? '').toString().trim() || undefined,
    associate_company: (account.associate_company ?? '').toString().trim() || undefined,
    cp_account: (account.cp_account ?? '').toString().trim() || undefined,
    cp_contact: (account.cp_contact ?? '').toString().trim() || undefined,
    custom_addresses,
    custom_bank_details,
    custom_organization_registration_number:
      (account.registration_number ?? '').toString().trim() || undefined,
    pan_number: (account.pan_number ?? '').toString().trim() || undefined,
    custom_tan_number: (account.tan_number ?? '').toString().trim() || undefined,
    custom_gst_status: (account.gst_status ?? '').toString().trim() || undefined,
    gstin: (account.gstin ?? '').toString().trim() || undefined,
    custom__msme_registered_number: (account.msme_number ?? '').toString().trim() || undefined,
    custom_provident_fund_number: (account.pf_number ?? '').toString().trim() || undefined,
    custom_esi_number: (account.esi_number ?? '').toString().trim() || undefined,
    custom_professional_tax_number: (account.professional_tax ?? '').toString().trim() || undefined,
  };

  return payload;
}

/**
 * Update a CRM Account by name (Frappe resource PUT API).
 * @param {string} name – CRM Account name (id)
 * @param {Object} payload – document fields to update (Frappe field names)
 * @returns {Promise<Object>} Updated doc from response
 */
export async function updateCrmAccount(name, payload) {
  if (!name) throw new Error('Account name is required');
  const encoded = encodeURIComponent(name);
  const { data } = await apiClient.put(`/resource/CRM Account/${encoded}`, payload);
  return data?.data ?? data;
}

/**
 * Soft-delete a CRM Account and related contacts/leads (sets is_deleted = 1).
 * @param {string} accountName – CRM Account name (id)
 * @returns {Promise<{ message: string }>}
 */
export async function deleteCrmAccount(accountName) {
  if (!accountName) throw new Error('Account name is required');
  const { data } = await apiClient.post(
    '/method/devx.devx_crm.api.crm_account.soft_delete_crm_account',
    { account_name: accountName },
  );
  return data?.message ?? data;
}

/** Frontend field name → backend (Frappe) field name for single-field PUT */
export const CRM_ACCOUNT_FIELD_TO_BACKEND = {
  legal_name: 'customer_name',
  customer_name: 'customer_name',
  account_name: 'custom_legal_name',
  custom_legal_name: 'custom_legal_name',
  type_of_organization: 'customer_group',
  industry: 'industry',
  sales_owner: 'sales_owner',
  year_of_establishment: 'custom_year_of_establishment',
  website: 'website',
  no_of_employees: 'number_of_employees',
  parent_company: 'parent_company',
  associate_company: 'associate_company',
  cp_account: 'cp_account',
  cp_contact: 'cp_contact',
  registration_number: 'custom_organization_registration_number',
  pan_number: 'pan_number',
  tan_number: 'custom_tan_number',
  gst_status: 'custom_gst_status',
  gstin: 'gstin',
  msme_number: 'custom__msme_registered_number',
  pf_number: 'custom_provident_fund_number',
  esi_number: 'custom_esi_number',
  professional_tax: 'custom_professional_tax_number',
};

/**
 * Build a minimal PUT payload for a single field (e.g. { customer_name: "uoe91" }).
 * Do not use for primary_address, billing_address, banks, linkedin, instagram, facebook (use dedicated APIs).
 */
export function buildSingleFieldPayload(field, value) {
  const backendField = CRM_ACCOUNT_FIELD_TO_BACKEND[field] || field;
  let v = value;
  if (backendField === 'number_of_employees') {
    v =
      value !== '' && value != null && String(value).trim() !== ''
        ? String(value).trim()
        : undefined;
  } else if (typeof v === 'string') {
    v = v.trim() || undefined;
  }
  if (v === undefined || v === null) return { [backendField]: '' };
  return { [backendField]: v };
}

export async function updateCrmAccountAddress(accountName, addressType, addressData) {
  const { data } = await apiClient.post(
    '/method/devx.devx_crm.doctype.crm_account.crm_account.update_crm_account_address',
    { account_name: accountName, address_type: addressType, address_data: addressData },
  );
  return data?.message ?? data;
}

export async function updateCrmAccountSocialLinks(accountName, socialLinks) {
  const { data } = await apiClient.post(
    '/method/devx.devx_crm.doctype.crm_account.crm_account.update_crm_account_social_links',
    { account_name: accountName, social_links: socialLinks },
  );
  return data?.message ?? data;
}

export async function addCrmAccountBank(accountName, bankData) {
  const { data } = await apiClient.post(
    '/method/devx.devx_crm.doctype.crm_account.crm_account.add_crm_account_bank',
    { account_name: accountName, ...bankData },
  );
  return data?.message ?? data;
}

export async function updateCrmAccountBank(accountName, bankRowName, updates) {
  const { data } = await apiClient.post(
    '/method/devx.devx_crm.doctype.crm_account.crm_account.update_crm_account_bank',
    { account_name: accountName, bank_row_name: bankRowName, ...updates },
  );
  return data?.message ?? data;
}

export async function deleteCrmAccountBank(accountName, bankRowName) {
  const { data } = await apiClient.post(
    '/method/devx.devx_crm.doctype.crm_account.crm_account.delete_crm_account_bank',
    { account_name: accountName, bank_row_name: bankRowName },
  );
  return data?.message ?? data;
}

/**
 * Fetch the paginated CRM Account list.
 * @param {Object} params
 * @param {string}  [params.keyword]     – search term
 * @param {number}  [params.page]        – 1-based page number
 * @param {number}  [params.pageSize]    – records (or groups) per page
 * @param {string}  [params.orderBy]     – backend field name to sort by
 * @param {string}  [params.orderDir]    – "asc" | "desc"
 * @param {Object}  [params.filters]     – dict of field → value filters (includes optional `cp_contact`, `cp_account`, `crm_contact` for scoped lists)
 * @param {string}  [params.groupBy]     – backend field to group by
 * @param {string}  [params.groupOrder]  – "asc" | "desc" for group keys
 * @returns {Promise<Object>} API response with results, pagination metadata
 */
export async function listCrmAccounts({
  keyword,
  page,
  pageSize,
  orderBy,
  orderDir,
  filters,
  groupBy,
  groupOrder,
} = {}) {
  const params = {};
  if (keyword) params.keyword = keyword;
  if (page) params.page = page;
  if (pageSize) params.page_size = pageSize;
  if (orderBy) params.order_by = orderBy;
  if (orderDir) params.order_dir = orderDir;
  if (filters && Object.keys(filters).length > 0) params.filters = JSON.stringify(filters);
  if (groupBy) params.group_by = groupBy;
  if (groupOrder) params.group_order = groupOrder;

  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_account.get_crm_account_list',
    { params },
  );
  return data?.message ?? data;
}

/**
 * Fetch Type of Organization options (Customer Group list).
 * @returns {Promise<Array<{ value: string, label: string }>>}
 */
export async function getCustomerGroupList() {
  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_options.get_customer_group_list',
  );
  return unwrapMessage(data);
}

/**
 * Fetch Industry options from get_industry_type_list.
 * Pass { grouped: true } when the caller needs industry names grouped under industry types.
 * Pass { scope: 'crm' } or { scope: 'cp' } to filter by is_crm / is_cp on Industry Type and Industry Name.
 * @returns {Promise<Array<{ value: string, label: string }> | { industry_type: Array, industry_name: Array }>}
 */
export async function getIndustryTypeList(options = {}) {
  const params = {};
  if (options.scope) params.scope = options.scope;
  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_options.get_industry_type_list',
    { params },
  );
  const message = data?.message ?? data;
  if (options.grouped) {
    return message ?? { industry_type: [], industry_name: [] };
  }
  if (Array.isArray(message)) return message;
  return Array.isArray(message?.industry_type) ? message.industry_type : [];
}

/**
 * Fetch Sales Team users (users with role type "Sales Team"). value = User.name, label = full name, email when set.
 * @param {{ keyword?: string, pageSize?: number }} [opts]
 * @returns {Promise<Array<{ value: string, label: string, email?: string | null }>>}
 */
export async function getSalesTeamUserList({ keyword, pageSize = 500 } = {}) {
  const params = { page_size: pageSize };
  const trimmedKeyword = typeof keyword === 'string' ? keyword.trim() : '';
  if (trimmedKeyword) params.keyword = trimmedKeyword;

  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_options.get_sales_team_user_list',
    { params },
  );
  return unwrapMessage(data);
}

/**
 * Fetch active, non-deleted CRM Accounts for Parent/Associate Company. value = name (id), label = customer_name.
 * @param {{ keyword?: string, pageSize?: number }} [opts]
 * @returns {Promise<Array<{ value: string, label: string }>>}
 */
export async function getCrmAccountList({ keyword, pageSize = 500 } = {}) {
  const params = { page_size: pageSize };
  const trimmedKeyword = typeof keyword === 'string' ? keyword.trim() : '';
  if (trimmedKeyword) params.keyword = trimmedKeyword;

  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_account.get_crm_account_options',
    { params },
  );
  return unwrapMessage(data);
}

/**
 * CRM Account options for searchable pickers (list view, forms).
 * Uses get_crm_account_list; label = customer_name (branch/account name), value = CRM Account name.
 * @param {{ keyword?: string, pageSize?: number }} [params]
 * @returns {Promise<Array<{ value: string, label: string }>>}
 */
export async function searchCrmAccountOptions({ keyword, pageSize = 500 } = {}) {
  const result = await listCrmAccounts({
    keyword: keyword?.trim() || undefined,
    page: 1,
    pageSize: Math.min(Math.max(1, pageSize), 500),
    orderBy: 'customer_name',
    orderDir: 'asc',
  });
  const rows = Array.isArray(result?.results) ? result.results : [];
  return rows.map((row) => ({
    value: row.name,
    label: (row.customer_name || row.name || '').trim() || row.name,
  }));
}
