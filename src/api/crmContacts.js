import apiClient from './axios';

/**
 * Create a new CRM Contact.
 * @param {Object} payload – field values: first_name, last_name, email, mobile_number, alt_mobile_number,
 *   dob, associate_account, sales_owner, designation, department, city,
 *   subscription_status, amb_subscription_status, subscription_type (array), unsubscribed_reason,
 *   linkedin, facebook, instagram
 * @returns {Promise<{ name: string, message: string }>}
 */
export async function createCrmContact(payload) {
  const { data } = await apiClient.post(
    '/method/devx.devx_crm.doctype.crm_contact.crm_contact.create_crm_contact',
    payload,
  );
  return data?.message ?? data;
}

/**
 * Fetch the paginated CRM Contact list.
 * @param {Object} params
 * @param {string}  [params.keyword]     – search term
 * @param {number}  [params.page]        – 1-based page number
 * @param {number}  [params.pageSize]    – records (or groups) per page
 * @param {string}  [params.orderBy]     – backend field name to sort by
 * @param {string}  [params.orderDir]    – "asc" | "desc"
 * @param {Object}  [params.filters]     – dict of field → value filters
 * @param {string}  [params.groupBy]     – backend field to group by
 * @param {string}  [params.groupOrder]  – "asc" | "desc" for group keys
 * @returns {Promise<Object>} API response with results, pagination metadata
 */
export async function listCrmContacts({
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
    '/method/devx.devx_crm.api.crm_contact.get_crm_contact_list',
    { params },
  );
  return data?.message ?? data;
}

/**
 * Fetch CRM contacts linked to a CP Account (CRM Contact.cp_account = cpAccountId). For CP Account detail Contacts tab.
 * @param {string} cpAccountId – CP Account Details document name (id)
 * @returns {Promise<Array<{ name, full_name, account, cp_contact, cp_contact_name, email, last_connected_at }>>}
 */
export async function getCrmContactsByCpAccount(cpAccountId) {
  if (!cpAccountId) return [];
  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_contact.get_crm_contacts_by_cp_account',
    { params: { cp_account_id: cpAccountId } },
  );
  const list = data?.message ?? data;
  return Array.isArray(list) ? list : [];
}

/**
 * Fetch all CRM Contact dropdown options in one call.
 * Used by create drawer, detail page, and filters.
 * @returns {Promise<{
 *   subscription_type: Array<{ value: string, label: string }>,
 *   designation: Array<{ value: string, label: string }>,
 *   department: Array<{ value: string, label: string }>,
 *   unsubscribed_reason: Array<{ value: string, label: string }>
 * }>}
 */
/**
 * Fetch a single CRM Contact by name (Frappe resource API).
 * @param {string} name – CRM Contact name (id)
 * @returns {Promise<Object>} Normalized contact for detail view
 */
export async function getCrmContact(name) {
  if (!name) return null;
  const encoded = encodeURIComponent(name);
  const { data } = await apiClient.get(`/resource/CRM Contact/${encoded}`);
  const document_ = data?.data ?? data;
  if (!document_) return null;
  return normalizeCrmContactDocument(document_);
}

/**
 * Map Frappe CRM Contact doc to shape expected by detail page.
 */
function normalizeCrmContactDocument(document_) {
  const first = (document_.first_name || '').trim();
  const last = (document_.last_name || '').trim();
  const fullName = [first, last].filter(Boolean).join(' ') || document_.name || '';

  const socialRows = document_.social_links || [];
  const platformToLink = (p) => {
    const row = socialRows.find((r) => (r.platform || '').toLowerCase() === p.toLowerCase());
    return row?.link || '';
  };

  const subTypes = (document_.contact_subscription_type || []).map((r) => r.type).filter(Boolean);

  return {
    id: document_.name,
    name: document_.name,
    full_name: fullName,
    first_name: first,
    last_name: last,
    email: document_.email_id || '',
    email_id: document_.email_id || '',
    mobile_number: document_.mobile_number || '',
    alt_mobile_number: document_.alt_mobile_number || '',
    dob: document_.dob || '',
    associate_account: document_.associate_account || '',
    account: document_.associate_account || '',
    cp_account: document_.cp_account || '',
    cp_contact: document_.cp_contact || '',
    sales_owner: document_.sales_owner || '',
    designation: document_.designation || '',
    department: document_.department || '',
    city: document_.city || '',
    subscription_status: document_.subscription_status || '',
    amb_subscription_status: document_.amb_subscription_status || '',
    subscription_type: subTypes,
    unsubscribed_reason: document_.unsubscribed_reason || '',
    linkedin: platformToLink('LinkedIn'),
    instagram: platformToLink('Instagram'),
    facebook: platformToLink('Facebook'),
    creation: document_.creation,
    modified: document_.modified,
  };
}

/**
 * Update a CRM Contact by name (Frappe resource PUT API).
 * @param {string} name – CRM Contact name (id)
 * @param {Object} payload – document fields to update (Frappe field names)
 * @returns {Promise<Object>} Updated doc from response
 */
export async function updateCrmContact(name, payload) {
  if (!name) throw new Error('Contact name is required');
  const encoded = encodeURIComponent(name);
  const { data } = await apiClient.put(`/resource/CRM Contact/${encoded}`, payload);
  return data?.data ?? data;
}

/**
 * Soft-delete a CRM Contact and related CRM Leads (sets is_deleted = 1).
 * @param {string} contactName – CRM Contact name (id)
 * @returns {Promise<{ message: string }>}
 */
export async function deleteCrmContact(contactName) {
  if (!contactName) throw new Error('Contact name is required');
  const { data } = await apiClient.post(
    '/method/devx.devx_crm.api.crm_contact.soft_delete_crm_contact',
    { contact_name: contactName },
  );
  return data?.message ?? data;
}

/** Frontend field name → backend (Frappe) field name for single-field PUT */
export const CRM_CONTACT_FIELD_TO_BACKEND = {
  first_name: 'first_name',
  last_name: 'last_name',
  email: 'email_id',
  email_id: 'email_id',
  mobile_number: 'mobile_number',
  alt_mobile_number: 'alt_mobile_number',
  dob: 'dob',
  account: 'associate_account',
  associate_account: 'associate_account',
  cp_account: 'cp_account',
  cp_contact: 'cp_contact',
  sales_owner: 'sales_owner',
  designation: 'designation',
  department: 'department',
  city: 'city',
  subscription_status: 'subscription_status',
  amb_subscription_status: 'amb_subscription_status',
  unsubscribed_reason: 'unsubscribed_reason',
};

/**
 * Build a minimal PUT payload for a single field.
 * For subscription_type pass an array; backend expects contact_subscription_type child table.
 */
export function buildCrmContactSingleFieldPayload(field, value) {
  if (field === 'subscription_type') {
    const arr = Array.isArray(value) ? value : [];
    return {
      contact_subscription_type: arr.map((t) => ({ type: String(t).trim() })).filter((r) => r.type),
    };
  }
  if (field === 'name') {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const first_name = parts[0] || '';
    const last_name = parts.slice(1).join(' ') || '';
    return { first_name, last_name };
  }
  const backendField = CRM_CONTACT_FIELD_TO_BACKEND[field] || field;
  const v = typeof value === 'string' ? value.trim() : value;
  if (v === undefined || v === null || v === '') return { [backendField]: '' };
  return { [backendField]: v };
}

/**
 * Update social links for a CRM Contact.
 * @param {string} contactName – CRM Contact name (id)
 * @param {Array<{ platform: string, link: string }>} socialLinks
 */
export async function updateCrmContactSocialLinks(contactName, socialLinks) {
  const { data } = await apiClient.post(
    '/method/devx.devx_crm.doctype.crm_contact.crm_contact.update_crm_contact_social_links',
    { contact_name: contactName, social_links: socialLinks },
  );
  return data?.message ?? data;
}

export async function getCrmContactOptions() {
  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_options.get_crm_contact_options',
  );
  const result = data?.message ?? data ?? {};
  return {
    subscription_type: Array.isArray(result.subscription_type) ? result.subscription_type : [],
    subscription_status: Array.isArray(result.subscription_status)
      ? result.subscription_status
      : [],
    designation: Array.isArray(result.designation) ? result.designation : [],
    department: Array.isArray(result.department) ? result.department : [],
    unsubscribed_reason: Array.isArray(result.unsubscribed_reason)
      ? result.unsubscribed_reason
      : [],
  };
}

/**
 * Fetch CP Contact dropdown options in one call (designation & department filtered by is_cp = 1).
 * Used by CP Contact create drawer, detail page, and filters.
 * @returns {Promise<{
 *   designation: Array<{ value: string, label: string }>,
 *   department:  Array<{ value: string, label: string }>
 * }>}
 */
export async function getCpContactOptions() {
  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_options.get_cp_contact_options',
  );
  const result = data?.message ?? data ?? {};
  return {
    designation: Array.isArray(result.designation) ? result.designation : [],
    department: Array.isArray(result.department) ? result.department : [],
  };
}
