/** CRM Accounts module — constants and column configuration. */

export const ACCOUNT_COLUMN_DEFS = [
  { id: 'name', label: 'Account Name', visible: true, enableHiding: false },
  { id: 'custom_legal_name', label: 'Company Legal Name', visible: false },
  { id: 'created_at', label: 'Created At', visible: true },
  { id: 'last_modified_at', label: 'Last Modified', visible: true },
  { id: 'related_contacts', label: 'CRM Contact', visible: true },
  { id: 'website', label: 'Website', visible: true },
  { id: 'sales_owner', label: 'Sales Owner', visible: true },
  { id: 'cp_account', label: 'CP Account', visible: false },
  { id: 'cp_contact', label: 'CP Contact', visible: false },
  { id: 'type_of_organization', label: 'Type Organization', visible: true },
  { id: 'year_of_establishment', label: 'Year of Establishment', visible: false },
  { id: 'no_of_employees', label: 'No. Employee', visible: false },
  { id: 'industry', label: 'Industry', visible: false },
];

export const DEFAULT_ACCOUNT_COLUMN_WIDTHS = {
  name: 240,
  custom_legal_name: 200,
  created_at: 175,
  last_modified_at: 190,
  related_contacts: 180,
  website: 175,
  sales_owner: 175,
  cp_account: 180,
  cp_contact: 180,
  type_of_organization: 210,
  year_of_establishment: 200,
  no_of_employees: 160,
  industry: 150,
};

export const ACCOUNT_COLUMN_MIN_WIDTH = 120;
export const ACCOUNT_COLUMN_MAX_WIDTH = 600;

export const ACCOUNT_COLUMN_STORAGE_KEY = 'crm-accounts-column-widths';
export const ACCOUNT_RESIZE_ENABLED_KEY = 'crm-accounts-resize-enabled';

/** Account list inside contact detail (own column prefs & widths). */
export const REACT_TABLE_ID_CONTACT_ACCOUNT = 'crm-accounts-table-contact-detail';
export const CONTACT_ACCOUNT_COLUMN_STORAGE_KEY = 'crm-accounts-column-widths-contact-detail';
export const CONTACT_ACCOUNT_RESIZE_ENABLED_KEY = 'crm-accounts-resize-enabled-contact-detail';

/** Account list inside lead detail (read-only, one row). */
export const REACT_TABLE_ID_LEAD_ACCOUNT = 'crm-accounts-table-lead-detail';
export const LEAD_ACCOUNT_COLUMN_STORAGE_KEY = 'crm-accounts-column-widths-lead-detail';
export const LEAD_ACCOUNT_RESIZE_ENABLED_KEY = 'crm-accounts-resize-enabled-lead-detail';

/** CRM accounts linked from CP Contact detail (Account tab). */
export const REACT_TABLE_ID_CP_CONTACT_CRM_ACCOUNTS = 'crm-accounts-table-cp-contact-crm-linked';
export const CP_CONTACT_CRM_ACCOUNTS_COLUMN_STORAGE_KEY =
  'crm-accounts-column-widths-cp-contact-crm-linked';
export const CP_CONTACT_CRM_ACCOUNTS_RESIZE_ENABLED_KEY =
  'crm-accounts-resize-enabled-cp-contact-crm-linked';

/** CRM accounts linked from CP Account detail (Accounts tab). */
export const REACT_TABLE_ID_CP_ACCOUNT_CRM_ACCOUNTS = 'crm-accounts-table-cp-account-crm-linked';
export const CP_ACCOUNT_CRM_ACCOUNTS_COLUMN_STORAGE_KEY =
  'crm-accounts-column-widths-cp-account-crm-linked';
export const CP_ACCOUNT_CRM_ACCOUNTS_RESIZE_ENABLED_KEY =
  'crm-accounts-resize-enabled-cp-account-crm-linked';

/** Type of Organization options — from the image */
export const TYPE_OF_ORGANIZATION_OPTIONS = [
  { value: 'Private Limited Company', label: 'Private Limited Company' },
  { value: 'Public Limited Company', label: 'Public Limited Company' },
  { value: 'LLP', label: 'LLP' },
  { value: 'Partnership Firm', label: 'Partnership Firm' },
  { value: 'Sole Proprietorship', label: 'Sole Proprietorship' },
  { value: 'OPC', label: 'OPC' },
  { value: 'Government Organization', label: 'Government Organization' },
  { value: 'PSU', label: 'PSU' },
  { value: 'NGO', label: 'NGO' },
  { value: 'Startup', label: 'Startup' },
  { value: 'MNC', label: 'MNC' },
];

/** Industry options — from the image */
export const INDUSTRY_OPTIONS = [
  { value: 'IT', label: 'IT' },
  { value: 'SaaS', label: 'SaaS' },
  { value: 'FinTech', label: 'FinTech' },
  { value: 'EdTech', label: 'EdTech' },
  { value: 'HealthTech', label: 'HealthTech' },
  { value: 'Hospitality', label: 'Hospitality' },
  { value: 'Consulting', label: 'Consulting' },
  { value: 'FMCG', label: 'FMCG' },
  { value: 'Government', label: 'Government' },
  { value: 'Insurance', label: 'Insurance' },
  { value: 'Construction', label: 'Construction' },
  { value: 'Manufacturing', label: 'Manufacturing' },
  { value: 'E-commerce', label: 'E-commerce' },
  { value: 'Retail', label: 'Retail' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Education', label: 'Education' },
  { value: 'Real Estate', label: 'Real Estate' },
  { value: 'Media', label: 'Media' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Logistics', label: 'Logistics' },
  { value: 'Agriculture', label: 'Agriculture' },
  { value: 'Energy', label: 'Energy' },
  { value: 'Telecommunications', label: 'Telecommunications' },
];

/** Group-by options — from the image */
export const GROUP_BY_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'type_of_organization', label: 'Type Organization' },
  { value: 'industry', label: 'Industry' },
];

/** Filter tab keys */
export const ACCOUNT_FILTER_TABS = {
  TYPE_OF_ORGANIZATION: 'type_of_organization',
  INDUSTRY: 'industry',
  CREATED_AT: 'created_at',
  LAST_MODIFIED: 'last_modified_at',
};

export const ACCOUNT_FILTER_TAB_CONFIG = [
  { value: ACCOUNT_FILTER_TABS.TYPE_OF_ORGANIZATION, label: 'Type of Organization' },
  { value: ACCOUNT_FILTER_TABS.INDUSTRY, label: 'Industry' },
  { value: ACCOUNT_FILTER_TABS.CREATED_AT, label: 'Created At' },
  { value: ACCOUNT_FILTER_TABS.LAST_MODIFIED, label: 'Last Modified' },
];

export const DATETIME_FILTER_PRESET = {
  ANY_TIME: 'any_time',
  LAST_30_MINUTES: 'last_30_minutes',
  LAST_60_MINUTES: 'last_60_minutes',
  LAST_2_HOURS: 'last_2_hours',
  LAST_24_HOURS: 'last_24_hours',
  YESTERDAY: 'yesterday',
  TODAY: 'today',
  LAST_WEEK: 'last_week',
  THIS_WEEK: 'this_week',
  LAST_MONTH: 'last_month',
  THIS_MONTH: 'this_month',
  LAST_7_DAYS: 'last_7_days',
  LAST_30_DAYS: 'last_30_days',
  LAST_60_DAYS: 'last_60_days',
  LAST_90_DAYS: 'last_90_days',
  LAST_180_DAYS: 'last_180_days',
  LAST_365_DAYS: 'last_365_days',
  LAST_QUARTER: 'last_quarter',
  THIS_QUARTER: 'this_quarter',
  LAST_YEAR: 'last_year',
  THIS_YEAR: 'this_year',
  IS_BEFORE: 'is_before',
  IS_AFTER: 'is_after',
  IS_BETWEEN: 'is_between',
  IS_EMPTY: 'is_empty',
  IS_NOT_EMPTY: 'is_not_empty',
};

export const DATETIME_FILTER_PRESET_OPTIONS = [
  { value: DATETIME_FILTER_PRESET.ANY_TIME, label: 'Any time' },
  { value: DATETIME_FILTER_PRESET.LAST_30_MINUTES, label: 'Last 30 minutes' },
  { value: DATETIME_FILTER_PRESET.LAST_60_MINUTES, label: 'Last 60 minutes' },
  { value: DATETIME_FILTER_PRESET.LAST_2_HOURS, label: 'Last 2 hours' },
  { value: DATETIME_FILTER_PRESET.LAST_24_HOURS, label: 'Last 24 hours' },
  { value: DATETIME_FILTER_PRESET.YESTERDAY, label: 'Yesterday' },
  { value: DATETIME_FILTER_PRESET.TODAY, label: 'Today' },
  { value: DATETIME_FILTER_PRESET.LAST_WEEK, label: 'Last week' },
  { value: DATETIME_FILTER_PRESET.THIS_WEEK, label: 'This week' },
  { value: DATETIME_FILTER_PRESET.LAST_MONTH, label: 'Last month' },
  { value: DATETIME_FILTER_PRESET.THIS_MONTH, label: 'This month' },
  { value: DATETIME_FILTER_PRESET.LAST_7_DAYS, label: 'Last 7 days' },
  { value: DATETIME_FILTER_PRESET.LAST_30_DAYS, label: 'Last 30 days' },
  { value: DATETIME_FILTER_PRESET.LAST_60_DAYS, label: 'Last 60 days' },
  { value: DATETIME_FILTER_PRESET.LAST_90_DAYS, label: 'Last 90 days' },
  { value: DATETIME_FILTER_PRESET.LAST_180_DAYS, label: 'Last 180 days' },
  { value: DATETIME_FILTER_PRESET.LAST_365_DAYS, label: 'Last 365 days' },
  { value: DATETIME_FILTER_PRESET.LAST_QUARTER, label: 'Last quarter' },
  { value: DATETIME_FILTER_PRESET.THIS_QUARTER, label: 'This quarter' },
  { value: DATETIME_FILTER_PRESET.LAST_YEAR, label: 'Last year' },
  { value: DATETIME_FILTER_PRESET.THIS_YEAR, label: 'This year' },
  { value: DATETIME_FILTER_PRESET.IS_BEFORE, label: 'Is before' },
  { value: DATETIME_FILTER_PRESET.IS_AFTER, label: 'Is after' },
  { value: DATETIME_FILTER_PRESET.IS_BETWEEN, label: 'Is between' },
  { value: DATETIME_FILTER_PRESET.IS_EMPTY, label: 'Is empty' },
  {
    value: DATETIME_FILTER_PRESET.IS_NOT_EMPTY,
    label: 'Is not empty (has any value)',
  },
];

export const DEFAULT_DATETIME_FILTER = { preset: DATETIME_FILTER_PRESET.ANY_TIME };

export const DEFAULT_ACCOUNT_FILTERS = {
  search: '',
  type_of_organization: [],
  industry: [],
  created_at: { ...DEFAULT_DATETIME_FILTER },
  last_modified_at: { ...DEFAULT_DATETIME_FILTER },
};

/** CRM Account detail tab key → sidebar module name for `read`. */
export const CRM_ACCOUNT_DETAIL_TAB_READ_MODULE = Object.freeze({
  about: 'CRM Account',
  tasks: 'ACL Task',
  contacts: 'CRM Contact',
  leads: 'CRM Lead',
  proposals: null,
  activities: null,
});
