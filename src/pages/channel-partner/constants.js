/**
 * CP Accounts page constants.
 * Central place for type options, labels, and config so design and integration can stay unchanged.
 */

import { NO_CENTERS_EMPTY_STATE } from '@/utils/global-center-filter';
import { DEFAULT_DATETIME_FILTER } from '@/components/crm-accounts/constants';
import { DEFAULT_LEAD_FILTERS } from '@/components/crm-leads/constants';
import { normalizeDatetimeFilter } from '@/utils/date-utils';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';

/** Tab options for filtering by CP type (All, Digital, IPC, DPC) */
export const CP_TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Aggregators', label: 'Aggregators' },
  { value: 'ipc', label: 'IPC' },
  { value: 'dpc', label: 'DPC' },
  { value: 'design consultants', label: 'Design Consultants' },
  { value: 'tenders', label: 'Tenders' },
  { value: 'vendors', label: 'Vendors' },
];

/** Type options for Create CP Account form (value matches API) */
export const CP_TYPE_SELECT_OPTIONS = [
  { value: 'Aggregators', label: 'Aggregators' },
  { value: 'IPC', label: 'IPC' },
  { value: 'DPC', label: 'DPC' },
  { value: 'Design Consultants', label: 'Design Consultants' },
  { value: 'Tenders', label: 'Tenders' },
  { value: 'Vendors', label: 'Vendors' },
];

/** Badge color per CP type for table Type column */
export const CP_TYPE_BADGE_COLORS = {
  IPC: 'blue',
  DPC: 'green',
  Aggregators: 'gray',
  'Design Consultants': 'orange',
  Tenders: 'purple',
  Vendors: 'yellow',
};

/** Default badge color when type is unknown */
export const CP_TYPE_DEFAULT_BADGE_COLOR = 'gray';

/** Table column IDs for sorting/filtering */
export const CP_ACCOUNTS_COLUMN_IDS = {
  LEGAL_NAME: 'legalName',
  BRAND_NAME: 'brandName',
  TYPE: 'type',
  INDUSTRY: 'industry',
  CITY: 'city',
  STATE: 'state',
  CREATED_AT: 'createdAt',
  LAST_MODIFIED_AT: 'lastModifiedAt',
  CONTACTS: 'contacts',
  WEBSITE: 'website',
  SALES_OWNER: 'salesOwner',
  YEAR_OF_ESTABLISHMENT: 'yearOfEstablishment',
  NO_OF_EMPLOYEES: 'noOfEmployees',
  RERA_NUMBER: 'reraNumber',
  OPERATIONAL_CITY: 'operationalCities',
  OPERATIONAL_STATE: 'operationalState',
  ACTIONS: 'actions',
};

/** Search placeholder */
export const CP_ACCOUNTS_SEARCH_PLACEHOLDER = 'Search here...';

/** Default toolbar filter shape for CP Accounts list (includes datetime filters). */
export const DEFAULT_CP_ACCOUNTS_FILTERS = {
  type: [],
  industry: [],
  city: [],
  state: [],
  salesOwner: [],
  created_at: { ...DEFAULT_DATETIME_FILTER },
  last_modified_at: { ...DEFAULT_DATETIME_FILTER },
};

/** Empty state when no accounts match filters */
export const CP_ACCOUNTS_EMPTY_MESSAGE = 'No CP accounts found.';

/** Empty states for table (same structure as vendor / CP contacts) */
export const CP_ACCOUNTS_EMPTY_STATES = {
  default: {
    title: 'No CP account yet',
    description: 'Create your first CP account to get started.',
  },
  search: {
    title: 'No Account match these filters',
    description: 'Try adjusting filters or clearing search.',
  },
  no_centers: { ...NO_CENTERS_EMPTY_STATE },
};

/** Default sorting (field, direction) */
export const CP_ACCOUNTS_DEFAULT_SORTING = [];

/** Max avatars to show in Related CP Contacts column before "+N" */
export const CP_CONTACTS_AVATAR_DISPLAY_COUNT = 4;

/** Default Group By options for CP Accounts toolbar */
export const CP_ACCOUNTS_GROUP_BY_OPTIONS = ['Type', 'Industry', 'City', 'State', 'Sales Owner'];

/** Map Group By display label to row field key */
export const CP_ACCOUNTS_GROUP_BY_FIELD_MAP = {
  Type: 'type',
  Industry: 'industry',
  City: 'city',
  State: 'state',
  'Sales Owner': 'salesOwner',
  'Legal Name': 'legalName',
  'Brand Name': 'brandName',
};

/** RERA Registered options for Create/Edit CP Account */
export const CP_RERA_OPTIONS = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

/** Default column config for CP Account Detail column dropdown manager (visibility + order) */
export const CP_ACCOUNT_DETAIL_COLUMNS_DEFAULT = [
  { id: 'legalName', label: 'Name', visible: true },
  { id: 'brandName', label: 'Brand Name', visible: true },
  { id: 'dropdownItems', label: 'Dropdown Items [1.0]', visible: true },
  { id: 'createdAt', label: 'Created At', visible: true },
  { id: 'relatedCpContacts', label: 'Related CP Contacts', visible: true },
  { id: 'website', label: 'Website', visible: true },
  { id: 'salesOwner', label: 'Sales Owner', visible: true },
  { id: 'yearOfEstablishment', label: 'Year of Establishment', visible: true },
  { id: 'noOfEmployees', label: 'No. of Employee', visible: true },
  { id: 'industry', label: 'Industry', visible: true },
  { id: 'parentCompany', label: 'Parent Company', visible: false },
];

/** Default column config for CP Contact Detail column dropdown manager */
export const CP_CONTACT_DETAIL_COLUMNS_DEFAULT = [
  { id: 'name', label: 'Name', visible: true },
  { id: 'account', label: 'Account', visible: true },
  { id: 'createdAt', label: 'Created At', visible: true },
  { id: 'salesOwner', label: 'Sales Owner', visible: true },
  { id: 'email', label: 'Email', visible: true },
  { id: 'openLeadsAmount', label: 'Open Leads Amount (₹)', visible: true },
  { id: 'dealWonAmount', label: 'Deal Won Amount (₹)', visible: true },
  { id: 'designation', label: 'Designation', visible: true },
  { id: 'department', label: 'Department', visible: true },
  { id: 'mobileNumber', label: 'Mobile Number', visible: true },
  { id: 'altMobileNumber', label: 'Alt. Mobile Number', visible: true },
  { id: 'dob', label: 'DOB (Date of Birth)', visible: true },
  { id: 'age', label: 'Age', visible: true },
  { id: 'city', label: 'City', visible: true },
  { id: 'lifecycleStage', label: 'Lifecycle Stage', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'primaryContact', label: 'Primary Contact', visible: true },
  { id: 'linkedinUrl', label: 'LinkedIn URL', visible: false },
  { id: 'facebookUrl', label: 'Facebook URL', visible: false },
  { id: 'instagramUrl', label: 'Instagram URL', visible: false },
  { id: 'createBy', label: 'Create By', visible: false },
  { id: 'lastModifiedAt', label: 'Last Modified At', visible: false },
];

/** CP Account detail tab id → sidebar module name for `read`. */
export const CP_ACCOUNT_DETAIL_TAB_READ_MODULE = Object.freeze({
  about: 'CP Account',
  cpcontacts: 'CP Contact',
  tasks: 'ACL Task',
  accounts: 'CRM Account',
  contacts: 'CRM Contact',
  leads: 'CRM Lead',
  proposals: null,
  activities: null,
});

/** Industry options for CP Account form (extend when API provides list) */
export const CP_INDUSTRY_OPTIONS = [
  { value: 'Real Estate', label: 'Real Estate' },
  { value: 'Technology', label: 'Technology' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Retail', label: 'Retail' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Other', label: 'Other' },
];

// ---------------------------------------------------------------------------
// CP Account detail tab — per-tab filter persistence helpers
// ---------------------------------------------------------------------------
//
// One per-cpAccountId sessionStorage slot per tab, mirroring the
// "Center > Configuration / Landlords-tab" convention and reusing the
// `usePersistedFilters` hook (see `hooks/use-persisted-filters.js`).
// Compactors drop empty buckets so an "all clear" state evicts the slot;
// merge helpers normalise hydrated snapshots back to the canonical filter
// shape (everything that is supposed to be an array is guaranteed to be one).

const buildCpAccountFilterKey = (suffix, cpAccountId) =>
  cpAccountId ? `cp-account-${suffix}-view-filter-dropdown-${String(cpAccountId).trim()}` : null;

const buildCpContactFilterKey = (suffix, cpContactId) =>
  cpContactId ? `cp-contact-${suffix}-view-filter-dropdown-${String(cpContactId).trim()}` : null;

const trimNonEmptyList = (values) => {
  if (!Array.isArray(values)) return [];
  return values.map((v) => String(v).trim()).filter(Boolean);
};

// ---- CP Contacts tab -------------------------------------------------------
// NB: the `cpAccount` key is intentionally NOT persisted — the section always
// forces it to `[account.id]` at fetch time, so storing it would be redundant
// and could leak the (transient) account id into other states.
export const CP_ACCOUNT_CONTACTS_PERSISTED_KEYS = [
  'salesOwner',
  'designation',
  'department',
  'state',
  'city',
  'reportingManager',
];

export const DEFAULT_CP_ACCOUNT_CONTACTS_FILTERS = Object.freeze({
  cpAccount: [],
  salesOwner: [],
  designation: [],
  department: [],
  state: [],
  city: [],
  reportingManager: [],
});

export const getCpAccountContactsFiltersStorageKey = (cpAccountId) =>
  buildCpAccountFilterKey('contacts', cpAccountId);

export const mergeStoredCpAccountContactsFilters = (stored) => {
  const merged = { ...DEFAULT_CP_ACCOUNT_CONTACTS_FILTERS };
  if (!stored || typeof stored !== 'object') return merged;
  for (const key of CP_ACCOUNT_CONTACTS_PERSISTED_KEYS) {
    if (Array.isArray(stored[key])) merged[key] = trimNonEmptyList(stored[key]);
  }
  return merged;
};

// ---- Tasks tab -------------------------------------------------------------
export const CP_ACCOUNT_TASKS_PERSISTED_KEYS = ['type', 'priority', 'status'];

export const DEFAULT_CP_ACCOUNT_TASKS_FILTERS = Object.freeze({
  type: [],
  priority: [],
  status: [],
});

export const getCpAccountTasksFiltersStorageKey = (cpAccountId) =>
  buildCpAccountFilterKey('tasks', cpAccountId);

export const mergeStoredCpAccountTasksFilters = (stored) => {
  const merged = { ...DEFAULT_CP_ACCOUNT_TASKS_FILTERS };
  if (!stored || typeof stored !== 'object') return merged;
  for (const key of CP_ACCOUNT_TASKS_PERSISTED_KEYS) {
    if (Array.isArray(stored[key])) merged[key] = trimNonEmptyList(stored[key]);
  }
  return merged;
};

// ---- Linked CRM Accounts tab ----------------------------------------------
export const CP_ACCOUNT_CRM_ACCOUNTS_PERSISTED_KEYS = [
  'type_of_organization',
  'industry',
  'created_at',
  'last_modified_at',
];

export const getCpAccountCrmAccountsFiltersStorageKey = (cpAccountId) =>
  buildCpAccountFilterKey('crm-accounts', cpAccountId);

// Merge consumed against the canonical CRM Account default shape (which
// includes the `search` key the toolbar tracks separately, so we don't try
// to overwrite that here).
export const mergeStoredCpAccountCrmAccountsFilters = (defaults, stored) => {
  const merged = { ...defaults };
  if (!stored || typeof stored !== 'object') return merged;
  for (const key of CP_ACCOUNT_CRM_ACCOUNTS_PERSISTED_KEYS) {
    if (key === 'created_at' || key === 'last_modified_at') {
      if (stored[key]) merged[key] = normalizeDatetimeFilter(stored[key]);
    } else if (Array.isArray(stored[key])) {
      merged[key] = trimNonEmptyList(stored[key]);
    }
  }
  return merged;
};

// ---- Leads tab -------------------------------------------------------------
const CP_ACCOUNT_LEADS_PERSISTED_LIST_KEYS = [
  'lifecycle_stage',
  'status',
  'sales_owner',
  'product',
  'lead_source',
  'city',
  'lead_relevance',
  'need_urgency',
  'info_call_status',
  'lost_reason',
  'created_at',
  'last_modified_at',
];

export const getCpAccountLeadsFiltersStorageKey = (cpAccountId) =>
  buildCpAccountFilterKey('leads', cpAccountId);

const CP_ACCOUNT_LEADS_SESSION_COMPACT_OPTS = {
  includeKeys: CP_ACCOUNT_LEADS_PERSISTED_LIST_KEYS,
  trimStringArrayElements: true,
  objectSubkeysTruthyKeys: {
    created_at: ['preset', 'date', 'from', 'to'],
    last_modified_at: ['preset', 'date', 'from', 'to'],
  },
};

export const compactCpAccountLeadsFiltersForStorage = (filters) =>
  compactFiltersForSessionStorage(
    filters,
    DEFAULT_LEAD_FILTERS,
    CP_ACCOUNT_LEADS_SESSION_COMPACT_OPTS,
  );

export const mergeStoredCpAccountLeadsFilters = (defaults, stored) => {
  const merged = { ...defaults };
  if (!stored || typeof stored !== 'object') return merged;
  for (const key of CP_ACCOUNT_LEADS_PERSISTED_LIST_KEYS) {
    if (key === 'created_at' || key === 'last_modified_at') {
      if (stored[key]) merged[key] = normalizeDatetimeFilter(stored[key]);
    } else if (Array.isArray(stored[key])) {
      merged[key] = trimNonEmptyList(stored[key]);
    }
  }
  return merged;
};

// ---------------------------------------------------------------------------
// CP Contact detail tab — per-tab filter persistence helpers
// ---------------------------------------------------------------------------
//
// The CP Contact detail page mirrors the CP Account detail page (Tasks /
// Accounts / Leads) so the compact + merge helpers above are shape-identical
// and re-used here. We only need a distinct sessionStorage key namespace
// (`cp-contact-...`) and contact-side aliases for readability at call sites.

export const getCpContactTasksFiltersStorageKey = (cpContactId) =>
  buildCpContactFilterKey('tasks', cpContactId);

export const mergeStoredCpContactTasksFilters = mergeStoredCpAccountTasksFilters;
export const DEFAULT_CP_CONTACT_TASKS_FILTERS = DEFAULT_CP_ACCOUNT_TASKS_FILTERS;

export const getCpContactCrmAccountsFiltersStorageKey = (cpContactId) =>
  buildCpContactFilterKey('crm-accounts', cpContactId);

export const mergeStoredCpContactCrmAccountsFilters = mergeStoredCpAccountCrmAccountsFilters;

export const getCpContactLeadsFiltersStorageKey = (cpContactId) =>
  buildCpContactFilterKey('leads', cpContactId);

export const compactCpContactLeadsFiltersForStorage = compactCpAccountLeadsFiltersForStorage;
export const mergeStoredCpContactLeadsFilters = mergeStoredCpAccountLeadsFilters;
