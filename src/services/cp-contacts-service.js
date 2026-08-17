import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

/**
 * CP Contacts service.
 * All API calls for CP Contacts live here. Swap implementations when backend is ready.
 */

/**
 * Fetch filter options for CP Contacts list (cpAccount, salesOwner, designation, department, city, lifecycleStage, status).
 * Call once to populate filter dropdowns; options are dynamic from backend.
 * @param {Object} params - { centers } optional, to restrict options by center
 * @returns {Promise<{ data: { cpAccount, salesOwner, designation, department, city, lifecycleStage, status } } | { error: string }>}
 */
export async function getCpContactFilterOptions(params = {}) {
  try {
    const response = await apiClient.post(
      '/method/devx.channel_partner.api.channel_partner.get_cp_contact_filter_options',
      { centers: params.centers },
    );
    const result = response.data;
    if (result?.exc_type) {
      return {
        error: extractErrorMessage(
          { response: { data: result } },
          'Failed to fetch filter options.',
        ),
      };
    }
    const data = result?.message ?? result;
    return {
      data: {
        cpAccount: data?.cpAccount ?? [],
        salesOwner: data?.salesOwner ?? [],
        designation: data?.designation ?? [],
        department: data?.department ?? [],
        city: data?.city ?? [],
        lifecycleStage: data?.lifecycleStage ?? [],
        status: data?.status ?? [],
      },
    };
  } catch (error) {
    return { error: extractErrorMessage(error, 'Failed to fetch filter options.') };
  }
}

/**
 * Fetch CP contacts list (created by current user).
 * @param {Object} params - { centers, search, searchTerm, status, cpAccount, salesOwner, designation, department, state, city, lifecycleStage, groupBy, groupOrder }
 * @returns {Promise<{ data: Array, totalCount?: number } | { error: string }>}
 */
export async function getCpContactsList(params = {}) {
  try {
    const response = await apiClient.post(
      '/method/devx.channel_partner.api.channel_partner.get_cp_contacts_list',
      {
        centers: params.centers,
        search: params.search ?? params.searchTerm,
        status: params.status,
        cpAccount: params.cpAccount,
        salesOwner: params.salesOwner,
        designation: params.designation,
        department: params.department,
        state: params.state,
        city: params.city,
        lifecycleStage: params.lifecycleStage,
        groupBy: params.groupBy,
        groupOrder: params.groupOrder,
      },
    );
    const result = response.data;
    if (result?.exc_type) {
      return {
        error: extractErrorMessage({ response: { data: result } }, 'Failed to fetch CP contacts.'),
      };
    }
    const data = Array.isArray(result?.message) ? result.message : (result?.message?.data ?? []);
    return { data };
  } catch (error) {
    return { error: extractErrorMessage(error, 'Failed to fetch CP contacts.') };
  }
}

/**
 * Disable a CP contact by id (sets disabled=1 on CP Contact and enabled=0 on linked User).
 * GET APIs return only contacts where disabled=0, so the contact will no longer appear in lists.
 * @param {string} id - CP Contact document name/id
 * @returns {Promise<{ data?: { name, disabled } } | { error: string }>}
 */
export async function deleteCpContact(id) {
  try {
    const response = await apiClient.post(
      '/method/devx.channel_partner.api.channel_partner.disable_cp_contact',
      {
        name: id,
      },
    );
    const result = response.data;
    if (result?.exc_type) {
      return {
        error: extractErrorMessage({ response: { data: result } }, 'Failed to disable CP contact.'),
      };
    }
    return { data: result?.message ?? { name: id, disabled: 1 } };
  } catch (error) {
    return { error: extractErrorMessage(error, 'Failed to disable CP contact.') };
  }
}

/**
 * Create a new CP contact (creates Broker role if needed, User with Broker role,
 * CP Contact doc linked to CP Account, and sends welcome email with temp password and broker portal link).
 * @param {Object} payload - CP Contact fields (camelCase: firstName, lastName, email, cpAccountId, etc.)
 * @returns {Promise<{ data?: { name, data } } | { error: string }>}
 */
export async function createCpContact(payload) {
  try {
    const response = await apiClient.post(
      '/method/devx.channel_partner.api.channel_partner.create_cp_contact',
      payload,
    );
    const result = response.data;
    if (result?.exc_type) {
      return {
        error: extractErrorMessage({ response: { data: result } }, 'Failed to create CP contact.'),
      };
    }
    return { data: result?.message ?? result };
  } catch (error) {
    return { error: extractErrorMessage(error, 'Failed to create CP contact.') };
  }
}

/**
 * Fetch a single CP contact by id (full detail for detail page).
 * Calls backend get_cp_contact; response is camelCase with cpTasks, socialLinks, etc.
 * @param {string} id - CP Contact document name/id
 * @returns {Promise<{ data?: object } | { error: string }>}
 */
export async function getCpContactById(id) {
  try {
    const response = await apiClient.post(
      '/method/devx.channel_partner.api.channel_partner.get_cp_contact',
      {
        name: id,
      },
    );
    const result = response.data;
    if (result?.exc_type) {
      return {
        error: extractErrorMessage({ response: { data: result } }, 'Contact not found.'),
      };
    }
    const data = result?.message ?? result;
    if (!data || !data.id) {
      return { error: 'Contact not found.' };
    }
    // Ensure initials for avatar (from name or firstName + lastName)
    const fullName =
      data.name || [data.firstName, data.lastName].filter(Boolean).join(' ') || data.email;
    const initials =
      fullName
        .split(/\s+/)
        .map((s) => (s && s[0]) || '')
        .join('')
        .slice(0, 2)
        .toUpperCase() || '–';
    return {
      data: {
        ...data,
        name: fullName || data.id,
        initials,
        cp_tasks: data.cpTasks ?? data.cp_tasks ?? [],
      },
    };
  } catch (error) {
    return { error: extractErrorMessage(error, 'Failed to fetch CP contact details.') };
  }
}

/**
 * Fetch the CP Account linked to a CP Contact (contact's cp_account field).
 * Used on CP Contact detail page for the CP Account tab.
 * @param {string} cpContactId - CP Contact document name/id
 * @returns {Promise<{ data?: object | null } | { error: string }>}
 */
const cpAccountByContactInflight = new Map();

export async function getCpAccountByCpContact(cpContactId) {
  if (!cpContactId) {
    return { data: null };
  }

  const inflightKey = String(cpContactId);
  if (cpAccountByContactInflight.has(inflightKey)) {
    return cpAccountByContactInflight.get(inflightKey);
  }

  const request = (async () => {
    try {
      const response = await apiClient.get(
        '/method/devx.channel_partner.api.channel_partner.get_cp_account_by_cp_contact',
        {
          params: { cp_contact_id: cpContactId },
        },
      );
      const result = response.data;
      if (result?.exc_type) {
        return {
          error: extractErrorMessage({ response: { data: result } }, 'Failed to fetch CP account.'),
        };
      }
      const data = result?.message ?? result ?? null;
      return { data: data || null };
    } catch (error) {
      return { error: extractErrorMessage(error, 'Failed to fetch CP account.') };
    } finally {
      cpAccountByContactInflight.delete(inflightKey);
    }
  })();

  cpAccountByContactInflight.set(inflightKey, request);
  return request;
}

/**
 * Fetch leads linked to a CP Contact (from CRM Lead where cp_contact = cpContactId).
 * For use on CP Contact detail page, Leads tab.
 * @param {string} cpContactId - CP Contact document name/id
 * @param {Object} params - { keyword, filters } optional keyword and filters (lifecycle_stage, status, sales_owner, product, lead_source, source, city)
 * @returns {Promise<{ data: Array, totalCount: number } | { error: string }>}
 */
export async function getLeadsByCpContactId(cpContactId, params = {}) {
  const body = {
    cp_contact_id: cpContactId,
    keyword: params.keyword ?? '',
  };
  const filters = params.filters;
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
      '/method/devx.channel_partner.api.lead.get_leads_by_cp_contact',
      body,
    );
    const result = response.data;
    if (result?.exc_type) {
      return {
        error: extractErrorMessage({ response: { data: result } }, 'Failed to fetch leads.'),
      };
    }
    const message = result?.message ?? result;
    const data = Array.isArray(message?.data) ? message.data : [];
    const totalCount = message?.total_count ?? data.length;
    return { data, totalCount };
  } catch (error) {
    return { error: extractErrorMessage(error, 'Failed to fetch leads.') };
  }
}

/**
 * Update a CP contact by id (partial camelCase payload).
 * @param {string} id - CP Contact document name/id
 * @param {Object} payload - Fields to update (camelCase: firstName, lastName, mobileNumber, designation, etc.)
 * @returns {Promise<{ data?: object } | { error: string }>}
 */
export async function updateCpContactById(id, payload = {}) {
  try {
    const response = await apiClient.post(
      '/method/devx.channel_partner.api.channel_partner.update_cp_contact',
      {
        name: id,
        payload,
      },
    );
    const result = response.data;
    if (result?.exc_type) {
      return {
        error: extractErrorMessage({ response: { data: result } }, 'Failed to update CP contact.'),
      };
    }
    const data = result?.message ?? result;
    return { data };
  } catch (error) {
    return { error: extractErrorMessage(error, 'Failed to update CP contact.') };
  }
}

/**
 * Fetch filter options for CP Contact detail (Leads/Proposals/Activities etc.).
 * Replace with real API when backend is ready.
 * @param {string} [contactId] - Optional contact id for context-specific options
 * @returns {Promise<{ data: { cpAccount, salesOwner, designation, department, city, lifecycleStage } } | { error: string }>}
 */
export async function getCpContactDetailFilterOptions(contactId) {
  try {
    // TODO: Replace with real API when backend is ready
    // const response = await apiClient.get('/resource/CP Contact/filter-options', { params: { id: contactId } });
    // return { data: response.data?.data };
    const data = {
      cpAccount: [
        { value: 'avenue-reality', label: 'Avenue Reality' },
        { value: 'one-advanced', label: 'One Advanced' },
        { value: 'knight-frank', label: 'Knight Frank' },
        { value: 'cbre', label: 'CBRE' },
        { value: 'jll', label: 'JLL' },
      ],
      salesOwner: [
        { value: 'ronald-richard', label: 'Ronald Richard' },
        { value: 'jane-cooper', label: 'Jane Cooper' },
      ],
      designation: [
        { value: 'manager', label: 'Manager' },
        { value: 'director', label: 'Director' },
        { value: 'vp', label: 'VP' },
        { value: 'executive', label: 'Executive' },
      ],
      department: [
        { value: 'sales', label: 'Sales' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'operations', label: 'Operations' },
      ],
      city: [
        { value: 'ahmedabad', label: 'Ahmedabad' },
        { value: 'bangalore', label: 'Bangalore' },
        { value: 'mumbai', label: 'Mumbai' },
        { value: 'delhi', label: 'Delhi' },
      ],
      lifecycleStage: [
        { value: 'MQL', label: 'MQL' },
        { value: 'SQL', label: 'SQL' },
        { value: 'Opportunity', label: 'Opportunity' },
        { value: 'Closure', label: 'Closure' },
        { value: 'Customer', label: 'Customer' },
      ],
    };
    return { data };
  } catch (error) {
    return { error: extractErrorMessage(error, 'Failed to fetch filter options.') };
  }
}

/** Enrich list item with detail-page fields for mock. */
function getMockContactDetail(base) {
  const status = base.status ?? 'sql';
  const statusUpper = status ? status.toUpperCase() : 'SQL';
  return {
    ...base,
    lifecycleStage: statusUpper,
    status: statusUpper,
    mobileNumber: base.mobileNumber ?? '+917555909504',
    altMobileNumber: base.altMobileNumber ?? '+919055555781',
    associateAccount: base.cpAccount,
    department: base.department ?? 'Sales',
    dateOfBirth: base.dateOfBirth ?? '12th Feb 1999',
    age: base.age ?? '40 Years',
    designation: base.designation ?? 'Manager',
    city: base.city ?? 'Ahmedabad',
    subscriptionStatus: base.subscriptionStatus ?? 'Subscribed',
    subscriptionTypes: base.subscriptionTypes ?? ['Newsletter', 'Promotion'],
    socialLinks: base.socialLinks ?? {
      linkedin: 'https://in.linkedin.com/company/avenue-realty-llp',
      instagram: 'https://www.instagram.com/avenuerealtyin/',
      facebook: 'https://www.facebook.com/AvenueRealty00/',
    },
  };
}

/** Mock data until API is available. */
function getMockCpContacts() {
  return [
    {
      id: '1',
      name: 'Courtney Henry',
      initials: 'CH',
      cpAccount: 'Avenue Reality',
      createdAt: '2026-01-12T12:23:24',
      salesOwnerName: 'RR Ronald Richards',
      salesOwnerInitials: 'RR',
      email: 'sara.cruz@example.com',
      openLeadsAmount: 720000,
      website: 'www.avenue.com',
      status: 'sql',
    },
    {
      id: '2',
      name: 'Thuhang Nute',
      initials: 'TN',
      cpAccount: 'One Advanced',
      createdAt: '2026-01-11T10:15:00',
      salesOwnerName: 'Ronald Richard',
      salesOwnerInitials: 'RR',
      email: 'thuhang.nute@example.com',
      openLeadsAmount: 1720000,
      website: null,
      status: 'sql',
    },
    {
      id: '3',
      name: 'Arlene McCoy',
      initials: 'AM',
      cpAccount: 'Knight Frank',
      createdAt: '2026-01-10T09:00:00',
      salesOwnerName: 'Jane Cooper',
      salesOwnerInitials: 'JC',
      email: 'arlene.mccoy@example.com',
      openLeadsAmount: null,
      website: 'www.knightfrank.com',
      status: 'opportunity',
    },
    {
      id: '4',
      name: 'Devon Lane',
      initials: 'DL',
      cpAccount: 'CBRE',
      createdAt: '2026-01-09T14:30:00',
      salesOwnerName: 'Jane Cooper',
      salesOwnerInitials: 'JC',
      email: 'devon.lane@example.com',
      openLeadsAmount: 500000,
      website: null,
      status: 'closure',
    },
    {
      id: '5',
      name: 'Cameron Williamson',
      initials: 'CW',
      cpAccount: 'JLL',
      createdAt: '2026-01-08T11:45:00',
      salesOwnerName: 'Ronald Richard',
      salesOwnerInitials: 'RR',
      email: 'cameron.w@example.com',
      openLeadsAmount: null,
      website: 'www.jll.com',
      status: 'customer',
    },
    // Repeat to get ~40 for tab counts
    ...Array.from({ length: 35 }, (_, i) => ({
      id: `mock-${i + 6}`,
      name: `Contact ${i + 6}`,
      initials: `C${i + 6}`.slice(0, 2),
      cpAccount: ['Avenue Reality', 'One Advanced', 'Knight Frank', 'CBRE', 'JLL'][i % 5],
      createdAt: '2026-01-01T12:00:00',
      salesOwnerName: i % 2 ? 'Ronald Richard' : 'Jane Cooper',
      salesOwnerInitials: i % 2 ? 'RR' : 'JC',
      email: `contact${i + 6}@example.com`,
      openLeadsAmount: i % 3 === 0 ? 100000 * (i + 1) : null,
      website: null,
      status: ['mql', 'sql', 'opportunity', 'closure', 'customer'][i % 5],
    })),
  ];
}
