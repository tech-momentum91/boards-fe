import apiClient from '@/api/axios';
import { mapAclTaskDocToCpTasksListRowPatch } from '@/utils/acl-task-list-row-patch';
import { extractErrorMessage } from '@/utils/error-utils';
import { enrichWithScrapedProfile } from '@/utils/scraped-research';

/**
 * CP Accounts service.
 * All API calls for CP Accounts live here. Swap implementations when backend is ready;
 * slice and page stay unchanged.
 */

/**
 * Fetch CP accounts list (filtered by backend: centers, search, type tab, applied filters).
 * @param {Object} params - { centers, search, type (tab), types, industry, city, state, salesOwner }
 * @returns {Promise<{ data: Array, totalCount?: number } | { error: string }>}
 */
export async function getCpAccountsList(params = {}) {
  try {
    const body = {
      centers: params.centers ?? [],
      search: params.search ?? '',
      type: params.type ?? 'all',
      types: params.types ?? [],
      industry: params.industry ?? [],
      city: params.city ?? [],
      state: params.state ?? [],
      sales_owner: params.salesOwner ?? [],
    };
    const response = await apiClient.post(
      '/method/devx.channel_partner.doctype.cp_account.cp_account.get_cp_accounts_list',
      body,
    );
    const result = response.data;
    if (result?.exc_type) {
      const msg = result._server_messages
        ? (() => {
            try {
              const arr = JSON.parse(result._server_messages);
              return Array.isArray(arr) ? arr.pop() : result.message;
            } catch {
              return result.message;
            }
          })()
        : result.message;
      return { error: msg || 'Failed to fetch CP accounts.' };
    }
    const list = Array.isArray(result?.message) ? result.message : (result?.message?.data ?? []);
    return { data: list };
  } catch (error) {
    const message =
      error.response?.data?.message || error.message || 'Failed to fetch CP accounts.';
    return { error: message };
  }
}

/**
 * Fetch CP Account type select options (Aggregators, IPC, …).
 * @returns {Promise<{ data: Array<{ value: string, label: string }> } | { error: string }>}
 */
export async function getCpAccountTypeOptions() {
  try {
    const response = await apiClient.post(
      '/method/devx.devx_crm.doctype.cp_account_type.cp_account_type.get_cp_account_type_options',
    );
    const result = response.data;
    if (result?.exc_type) {
      return {
        error: extractErrorMessage(
          { response: { data: result } },
          'Failed to fetch CP account types.',
        ),
      };
    }
    const raw = result?.message ?? result?.data ?? [];
    const list = Array.isArray(raw) ? raw : (raw?.types ?? raw?.data ?? []);
    return {
      data: list
        .map((item) => {
          if (typeof item === 'string') return { value: item, label: item };
          const value = item?.value ?? item?.name ?? item?.type ?? '';
          return value ? { value, label: item?.label ?? value } : null;
        })
        .filter(Boolean),
    };
  } catch (error) {
    return { error: extractErrorMessage(error, 'Failed to fetch CP account types.') };
  }
}

/**
 * Disable a CP account (soft delete). Backend sets disabled=1; list API excludes disabled accounts.
 * @param {string} id - CP Account Details document name/id
 * @returns {Promise<{ data?: { name } } | { error: string }>}
 */
export async function deleteCpAccount(id) {
  try {
    const response = await apiClient.post(
      '/method/devx.channel_partner.doctype.cp_account.cp_account.disable_cp_account_details',
      { name: id },
    );
    const result = response.data;
    if (result?.exc_type) {
      const msg = result._server_messages
        ? (() => {
            try {
              const arr = JSON.parse(result._server_messages);
              return Array.isArray(arr) ? arr.pop() : result.message;
            } catch {
              return result.message;
            }
          })()
        : result.message;
      return { error: msg || 'Failed to disable CP account.' };
    }
    return { data: { name: result?.message?.name ?? id } };
  } catch (error) {
    const message =
      error.response?.data?.message || error.message || 'Failed to disable CP account.';
    return { error: message };
  }
}

/**
 * Create a new CP account (CP Account Details in Frappe).
 * @param {Object} payload - CP Account fields (camelCase; backend maps to doctype)
 * @returns {Promise<{ data?: { name, data } } | { error: string }>}
 */
export async function createCpAccount(payload) {
  try {
    const response = await apiClient.post(
      '/method/devx.channel_partner.doctype.cp_account.cp_account.create_cp_account_details',
      payload,
    );
    const result = response.data;
    if (result?.exc_type) {
      const msg = result._server_messages
        ? (() => {
            try {
              const arr = JSON.parse(result._server_messages);
              return Array.isArray(arr) ? arr.pop() : result.message;
            } catch {
              return result.message;
            }
          })()
        : result.message;
      return { error: msg || 'Failed to create CP account.' };
    }
    return { data: result?.message ?? result };
  } catch (error) {
    const res = error.response?.data;
    const message = res?.message || res?.exc || error.message || 'Failed to create CP account.';
    return {
      error:
        typeof message === 'string' ? message : message.message || 'Failed to create CP account.',
    };
  }
}

/**
 * Fetch a single CP account by id (CP Account Details document name).
 * @param {string} id - CP Account Details document name/id
 * @returns {Promise<{ data?: object } | { error: string }>}
 */
export async function getCpAccountById(id) {
  try {
    const response = await apiClient.post(
      '/method/devx.channel_partner.doctype.cp_account.cp_account.get_cp_account_details',
      { name: id },
    );
    const result = response.data;
    if (result?.exc_type) {
      const msg = result._server_messages
        ? (() => {
            try {
              const arr = JSON.parse(result._server_messages);
              return Array.isArray(arr) ? arr.pop() : result.message;
            } catch {
              return result.message;
            }
          })()
        : result.message;
      return { error: msg || 'CP Account not found.' };
    }
    const data = result?.message ?? result?.data ?? null;
    if (!data) return { error: 'CP Account not found.' };
    const enriched = await enrichWithScrapedProfile(data, id, 'CP Account');
    return { data: enriched };
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch CP account.';
    return { error: message };
  }
}

/**
 * Update CP account details fields (camelCase payload).
 * Backend maps to doctype fieldnames and returns updated detail object.
 * @param {string} id - CP Account Details document name/id
 * @param {object} payload - camelCase fields to update (e.g. { legalName: 'Acme' })
 * @returns {Promise<{ data?: object } | { error: string }>}
 */
export async function updateCpAccountById(id, payload = {}) {
  try {
    const response = await apiClient.post(
      '/method/devx.channel_partner.doctype.cp_account.cp_account.update_cp_account_details',
      { name: id, payload },
    );
    const result = response.data;
    if (result?.exc_type) {
      const msg = result._server_messages
        ? (() => {
            try {
              const arr = JSON.parse(result._server_messages);
              return Array.isArray(arr) ? arr.pop() : result.message;
            } catch {
              return result.message;
            }
          })()
        : result.message;
      return { error: msg || 'Failed to update CP account.' };
    }
    const data = result?.message ?? result?.data ?? result ?? null;
    return data ? { data } : { error: 'Failed to update CP account.' };
  } catch (error) {
    const message =
      error.response?.data?.message || error.message || 'Failed to update CP account.';
    return { error: message };
  }
}

/**
 * Update one address row (Customer Address child) on a CP Account.
 * @param {string} cpAccountName - CP Account document name/id
 * @param {string} addressRowName - child row name (Customer Address .name)
 * @param {object} fields - address_line_1, address_line_2, city, state, pincode, country
 * @returns {Promise<{ data?: object } | { error: string }>}
 */
export async function updateCpAccountAddress(cpAccountName, addressRowName, fields = {}) {
  try {
    const fieldsArray = Array.isArray(fields) ? fields : [fields];
    const response = await apiClient.post(
      '/method/devx.channel_partner.doctype.cp_account.cp_account.update_cp_account_address',
      {
        cp_account_name: cpAccountName,
        address_name: addressRowName,
        fields: fieldsArray,
      },
    );
    const result = response.data;
    if (result?.exc_type) {
      const msg = result._server_messages
        ? (() => {
            try {
              const arr = JSON.parse(result._server_messages);
              return Array.isArray(arr) ? arr.pop() : result.message;
            } catch {
              return result.message;
            }
          })()
        : result.message;
      return { error: msg || 'Failed to update address.' };
    }
    const data = result?.message ?? result?.data ?? result ?? null;
    return data ? { data } : { error: 'Failed to update address.' };
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to update address.';
    return {
      error:
        typeof message === 'string' ? message : message?.message || 'Failed to update address.',
    };
  }
}

/**
 * Append one or more new address rows to a CP Account's `custom_addresses`
 * (Customer Address child table) via the Frappe resource API.
 *
 * Reads the current document first so existing rows (and their child names) are
 * preserved, then PUTs the merged array. Used when a CP Account has no address yet
 * (the dedicated update_cp_account_address method requires an existing row name).
 *
 * @param {string} cpAccountName - CP Account document name/id
 * @param {Array<object>} rows - address rows: { address_line_1, address_line_2, city, state, pincode, country, is_primary, is_billing }
 * @returns {Promise<{ data?: object } | { error: string }>}
 */
export async function addCpAccountAddresses(cpAccountName, rows = []) {
  if (!cpAccountName) {
    return { error: 'CP account is required.' };
  }
  const newRows = (Array.isArray(rows) ? rows : [rows]).filter(Boolean);
  if (newRows.length === 0) {
    return { error: 'No address to add.' };
  }

  try {
    const encoded = encodeURIComponent(cpAccountName);

    const getResponse = await apiClient.get(`/resource/CP Account/${encoded}`);
    const document_ = getResponse.data?.data ?? getResponse.data ?? {};
    const existing = Array.isArray(document_.custom_addresses) ? document_.custom_addresses : [];

    const normalizedRows = newRows.map((row) => ({
      address_line_1: (row.address_line_1 ?? '').toString().trim(),
      address_line_2: (row.address_line_2 ?? '').toString().trim(),
      city: (row.city ?? '').toString().trim(),
      state: (row.state ?? '').toString().trim(),
      pincode: (row.pincode ?? '').toString().trim(),
      country: (row.country ?? '').toString().trim(),
      is_primary: row.is_primary ? 1 : 0,
      is_billing: row.is_billing ? 1 : 0,
      is_shipping: row.is_shipping ? 1 : 0,
    }));

    const custom_addresses = [...existing, ...normalizedRows];

    const putResponse = await apiClient.put(`/resource/CP Account/${encoded}`, {
      custom_addresses,
    });
    const result = putResponse.data;
    if (result?.exc_type) {
      const message = extractErrorMessage(result, 'Failed to add address.');
      return { error: message || 'Failed to add address.' };
    }
    const data = result?.data ?? result?.message ?? result ?? null;
    return data ? { data } : { error: 'Failed to add address.' };
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to add address.';
    return {
      error: typeof message === 'string' ? message : message?.message || 'Failed to add address.',
    };
  }
}

/**
 * Add bank row for CP account.
 * @param {string} accountName - CP Account document name/id
 * @param {object} bankData
 * @returns {Promise<{ data?: object } | { error: string }>}
 */
export async function addCpAccountBank(accountName, bankData = {}) {
  try {
    const response = await apiClient.post(
      '/method/devx.channel_partner.doctype.cp_account.cp_account.add_cp_account_bank',
      { account_name: accountName, ...bankData },
    );
    const result = response.data;
    if (result?.exc_type) {
      const msg = result._server_messages
        ? (() => {
            try {
              const arr = JSON.parse(result._server_messages);
              return Array.isArray(arr) ? arr.pop() : result.message;
            } catch {
              return result.message;
            }
          })()
        : result.message;
      return { error: msg || 'Failed to add bank.' };
    }
    const data = result?.message ?? result?.data ?? result ?? null;
    return data ? { data } : { error: 'Failed to add bank.' };
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to add bank.';
    return { error: message };
  }
}

/**
 * Update bank row for CP account.
 * @param {string} accountName - CP Account document name/id
 * @param {string} bankRowName - child row id
 * @param {object} updates
 * @returns {Promise<{ data?: object } | { error: string }>}
 */
export async function updateCpAccountBank(accountName, bankRowName, updates = {}) {
  try {
    const response = await apiClient.post(
      '/method/devx.channel_partner.doctype.cp_account.cp_account.update_cp_account_bank',
      {
        account_name: accountName,
        bank_row_name: bankRowName,
        updates,
      },
    );
    const result = response.data;
    if (result?.exc_type) {
      const msg = result._server_messages
        ? (() => {
            try {
              const arr = JSON.parse(result._server_messages);
              return Array.isArray(arr) ? arr.pop() : result.message;
            } catch {
              return result.message;
            }
          })()
        : result.message;
      return { error: msg || 'Failed to update bank.' };
    }
    const data = result?.message ?? result?.data ?? result ?? null;
    return data ? { data } : { error: 'Failed to update bank.' };
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to update bank.';
    return { error: message };
  }
}

/**
 * Delete bank row for CP account.
 * @param {string} accountName - CP Account document name/id
 * @param {string} bankRowName - child row id
 * @returns {Promise<{ data?: object } | { error: string }>}
 */
export async function deleteCpAccountBank(accountName, bankRowName) {
  try {
    const response = await apiClient.post(
      '/method/devx.channel_partner.doctype.cp_account.cp_account.delete_cp_account_bank',
      {
        account_name: accountName,
        bank_row_name: bankRowName,
      },
    );
    const result = response.data;
    if (result?.exc_type) {
      const msg = result._server_messages
        ? (() => {
            try {
              const arr = JSON.parse(result._server_messages);
              return Array.isArray(arr) ? arr.pop() : result.message;
            } catch {
              return result.message;
            }
          })()
        : result.message;
      return { error: msg || 'Failed to delete bank.' };
    }
    const data = result?.message ?? result?.data ?? result ?? null;
    return data ? { data } : { error: 'Failed to delete bank.' };
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to delete bank.';
    return { error: message };
  }
}

/**
 * Fetch tasks for a CP account.
 * @param {string} cpAccountId - CP Account document id
 * @returns {Promise<{ data: Array } | { error: string }>}
 */
export async function getCpAccountTasks(cpAccountId, query = {}) {
  if (!cpAccountId) {
    return { data: [] };
  }
  const { keyword = '', filters } = query;
  try {
    const params = {
      type: 'cp_account',
      entity_id: cpAccountId,
      keyword: keyword || '',
      page: 1,
      page_size: 20,
      order_by: 'creation',
      order_dir: 'desc',
    };
    if (filters && typeof filters === 'object' && Object.keys(filters).length > 0) {
      params.filters = JSON.stringify(filters);
    }
    const response = await apiClient.get('/method/devx.devx_crm.api.acl_task.get_acl_task_list', {
      params,
    });

    const raw = response?.data?.message ?? response?.data ?? {};
    const list = Array.isArray(raw?.results) ? raw.results : [];

    return { data: list };
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch tasks.';
    return { error: message };
  }
}

/**
 * Update a single CP account task.
 * @param {Object} payload
 */
export async function updateCpAccountTask(payload) {
  const name =
    payload?.name ?? payload?.task_row_id ?? payload?.taskId ?? payload?.id ?? payload?.name;
  let doc = payload?.doc;
  if (!doc) {
    const docObj = {};
    if (payload?.status != null) docObj.status = payload.status;
    if (payload?.due_date != null) docObj.exp_end_date = payload.due_date;
    if (payload?.subject != null) docObj.subject = payload.subject;
    if (payload?.description != null) docObj.description = payload.description;
    if (payload?.assignees != null) docObj.assignees = payload.assignees;
    if (payload?.tags != null) docObj.tags = payload.tags;
    if (payload?.priority != null) docObj.priority = payload.priority;
    if (payload?.type != null) docObj.type = payload.type;
    doc = JSON.stringify(docObj);
  }
  const doRequest = () =>
    apiClient.post('/method/devx.devx_crm.api.acl_task.update_acl_task', { name, doc });

  const parseResult = (result) => {
    if (result?.exc_type) {
      const msg = result._server_messages
        ? (() => {
            try {
              const arr = JSON.parse(result._server_messages);
              return Array.isArray(arr) ? arr.pop() : result.message;
            } catch {
              return result.message;
            }
          })()
        : result.message;
      return { error: msg || 'Failed to update task.' };
    }
    const raw = result?.message ?? result?.data ?? result ?? {};
    const doc = typeof raw === 'object' && raw !== null ? raw : {};
    return { data: mapAclTaskDocToCpTasksListRowPatch(doc) };
  };

  try {
    let response = await doRequest();
    let result = response.data;
    let out = parseResult(result);
    if (out.error && (response.status === 500 || result?.exc_type)) {
      await new Promise((r) => setTimeout(r, 400));
      try {
        response = await doRequest();
        result = response.data;
        out = parseResult(result);
      } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to update task.';
        return { error: message };
      }
    }
    return out;
  } catch (error) {
    if (error.response?.status === 500) {
      await new Promise((r) => setTimeout(r, 400));
      try {
        const response = await doRequest();
        return parseResult(response.data);
      } catch {
        // fall through
      }
    }
    const message = error.response?.data?.message || error.message || 'Failed to update task.';
    return { error: message };
  }
}

/**
 * Fetch leads for a CP account (from CRM Lead where cp_account = cpAccountId).
 * @param {string} cpAccountId - CP Account document name/id
 * @param {Object} [filters] - Optional filters
 * @returns {Promise<{ data: Array } | { error: string }>}
 */
export async function getCpAccountLeads(cpAccountId, filters = null) {
  if (!cpAccountId) {
    return { data: [] };
  }
  const body = { cp_account_id: cpAccountId };
  if (filters && typeof filters === 'object') {
    const filterKeys = [
      'lifecycle_stage',
      'status',
      'sales_owner',
      'product',
      'lead_source',
      'source',
      'city',
      'creation',
    ];
    for (const key of filterKeys) {
      const val = filters[key];
      if (val == null) continue;
      if (key === 'creation') {
        body[key] = JSON.stringify(val);
      } else if (Array.isArray(val) && val.length > 0) {
        body[key] = val.length === 1 ? val[0] : val.join(',');
      } else if (typeof val === 'string' && val.trim()) {
        body[key] = val.trim();
      }
    }
  }
  try {
    const response = await apiClient.post(
      '/method/devx.channel_partner.doctype.cp_account.cp_account.get_cp_account_leads',
      body,
    );
    const result = response.data;
    if (result?.exc_type) {
      const msg = result._server_messages
        ? (() => {
            try {
              const arr = JSON.parse(result._server_messages);
              return Array.isArray(arr) ? arr.pop() : result.message;
            } catch {
              return result.message;
            }
          })()
        : result.message;
      return { error: msg || 'Failed to fetch leads.' };
    }
    const payload = result?.message ?? result?.data ?? result ?? {};
    return { data: Array.isArray(payload?.leads) ? payload.leads : [] };
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch leads.';
    return { error: message };
  }
}

/**
 * Disable a CRM Lead (sets disabled = 1).
 * @param {string} leadName - CRM Lead document name
 * @returns {Promise<{ ok: true } | { error: string }>}
 */
export async function disableCrmLead(leadName) {
  if (!leadName || !String(leadName).trim()) {
    return { error: 'Lead name is required' };
  }
  try {
    const response = await apiClient.post(
      '/method/devx.channel_partner.api.lead.disable_crm_lead',
      {
        lead_name: String(leadName).trim(),
      },
    );
    const result = response.data;
    if (result?.exc_type) {
      return {
        error: extractErrorMessage({ response: { data: result } }, 'Failed to disable lead.'),
      };
    }
    return { ok: true };
  } catch (error) {
    return { error: extractErrorMessage(error, 'Failed to disable lead.') };
  }
}

/** Mock data until API is available. Remove when using getCpAccountsList API. */
function getMockCpAccounts() {
  return [
    {
      id: '1',
      legalName: 'PropertyPistol',
      brandName: 'PropertyPistol',
      type: 'IPC',
      createdAt: '2026-01-12T12:23:24',
      contacts: [
        { initials: 'J' },
        { initials: 'S' },
        { initials: 'A' },
        { initials: 'E' },
        { extra: 9 },
      ],
      website: 'www.yontro.com',
      salesOwner: 'Ronald Richard',
      yearOfEstablishment: '2015',
      noOfEmployees: '120',
    },
    {
      id: '2',
      legalName: 'Cushman & Wakefield',
      brandName: 'Cushman & Wakefield',
      type: 'DPC',
      createdAt: '2026-01-11T10:15:00',
      contacts: [{ initials: 'R' }, { initials: 'D' }, { extra: 2 }],
      website: 'www.brisk.com',
      salesOwner: 'Jane Cooper',
      yearOfEstablishment: '2010',
      noOfEmployees: '85',
    },
    {
      id: '3',
      legalName: 'Knight Frank',
      brandName: 'Knight Frank',
      type: 'Digital',
      createdAt: '2026-01-10T09:00:00',
      contacts: [{ initials: 'T' }, { initials: 'W' }],
      website: 'www.knightfrank.com',
      salesOwner: 'Ronald Richard',
      yearOfEstablishment: '2018',
      noOfEmployees: '45',
    },
    {
      id: '4',
      legalName: 'CBRE',
      brandName: 'CBRE',
      type: 'DPC',
      createdAt: '2026-01-09T14:30:00',
      contacts: [{ initials: 'J' }, { initials: 'B' }, { initials: 'K' }, { extra: 5 }],
      website: 'www.cbre.com',
      salesOwner: 'Jane Cooper',
      yearOfEstablishment: '2012',
      noOfEmployees: '200',
    },
    {
      id: '5',
      legalName: 'JLL',
      brandName: 'JLL',
      type: 'IPC',
      createdAt: '2026-01-08T11:45:00',
      contacts: [{ initials: 'A' }, { initials: 'M' }],
      website: 'www.jll.com',
      salesOwner: 'Ronald Richard',
      yearOfEstablishment: '2008',
      noOfEmployees: '350',
    },
  ];
}

/**
 * Fetch filter options for CP Account detail (Leads/Proposals/Activities etc.).
 * Replace with real API when backend is ready.
 * @param {string} [accountId] - Optional account id for context-specific options
 * @returns {Promise<{ data: { types, industry, city, state, salesOwner } } | { error: string }>}
 */
export async function getCpAccountDetailFilterOptions(accountId) {
  try {
    // TODO: Replace with real API when backend is ready
    // const response = await apiClient.get('/resource/CP Account/filter-options', { params: { id: accountId } });
    // return { data: response.data?.data };
    const data = {
      types: [
        { value: 'Digital', label: 'Digital' },
        { value: 'IPC', label: 'IPC' },
        { value: 'DPC', label: 'DPC' },
      ],
      industry: [
        { value: 'real-estate', label: 'Real Estate' },
        { value: 'brokerage', label: 'Brokerage' },
        { value: 'property-tech', label: 'Property Tech' },
      ],
      city: [
        { value: 'bangalore', label: 'Bangalore' },
        { value: 'mumbai', label: 'Mumbai' },
        { value: 'delhi', label: 'Delhi' },
        { value: 'chennai', label: 'Chennai' },
        { value: 'hyderabad', label: 'Hyderabad' },
      ],
      state: [
        { value: 'karnataka', label: 'Karnataka' },
        { value: 'maharashtra', label: 'Maharashtra' },
        { value: 'delhi', label: 'Delhi' },
        { value: 'tamil-nadu', label: 'Tamil Nadu' },
        { value: 'telangana', label: 'Telangana' },
      ],
      salesOwner: [
        { value: 'ronald-richard', label: 'Ronald Richard' },
        { value: 'jane-cooper', label: 'Jane Cooper' },
      ],
    };
    return { data };
  } catch (error) {
    const message =
      error.response?.data?.message || error.message || 'Failed to fetch filter options.';
    return { error: message };
  }
}

/** Expanded mock detail for getCpAccountById. Remove when using real API. */
function getMockCpAccountDetail(id, base) {
  const primaryAddress = '123, Tech Park Tower, Whitefield Main Road, Bengaluru, Karnataka, 560066';
  return {
    id: base.id ?? id,
    legalName: base.legalName,
    brandName: base.brandName ?? base.legalName,
    type: base.type,
    salesOwner: base.salesOwner ?? '–',
    contacts: base.contacts ?? [],
    yearOfEstablishment: base.yearOfEstablishment ?? '–',
    industry: base.industry ?? 'Real Estate Brokerage',
    parentCompany: base.parentCompany ?? '–',
    associateCompany: base.associateCompany ?? '–',
    website: base.website
      ? base.website.startsWith('http')
        ? base.website
        : `https://${base.website}`
      : '–',
    noOfEmployees: base.noOfEmployees ?? '–',
    reraRegistered: base.reraRegistered ?? 'Yes',
    reraNumber: base.reraNumber ?? 'AG/GJ/AHM/1234/2025',
    primaryAddress: base.primaryAddress ?? primaryAddress,
    billingAddress: base.billingAddress ?? primaryAddress,
    linkedin: base.linkedin ?? 'https://in.linkedin.com/company/avenue-realty-llp',
    instagram: base.instagram ?? 'https://www.instagram.com/avenuerealtyin/',
    facebook: base.facebook ?? 'https://www.facebook.com/AvenueRealty00/',
    createdAt: base.createdAt,
  };
}
