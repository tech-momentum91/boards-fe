/**
 * CP Contacts page constants.
 */

import { DEFAULT_DATETIME_FILTER } from '@/components/crm-accounts/constants';
import { NO_CENTERS_EMPTY_STATE } from '@/utils/global-center-filter';

/** Status tab options (All, MQL, SQL, Opportunity, Closure, Customer) */
export const CP_CONTACTS_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'mql', label: 'MQL' },
  { value: 'sql', label: 'SQL' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'closure', label: 'Closure' },
  { value: 'customer', label: 'Customer' },
];

/** Table column IDs */
export const CP_CONTACTS_COLUMN_IDS = {
  NAME: 'name',
  CP_ACCOUNT: 'cpAccount',
  CREATED_AT: 'createdAt',
  LAST_MODIFIED_AT: 'lastModifiedAt',
  SALES_OWNER: 'salesOwner',
  REPORTING_MANAGER: 'reportingManager',
  EMAIL: 'email',
  OPEN_LEADS_AMOUNT: 'openLeadsAmount',
  WON_AMOUNT: 'wonAmount',
  DESIGNATION: 'designation',
  DEPARTMENT: 'department',
  MOBILE_NUMBER: 'mobileNumber',
  ALT_MOBILE_NUMBER: 'altMobileNumber',
  DOB: 'dob',
  AGE: 'age',
  CITY: 'city',
  LIFECYCLE_STAGE: 'lifecycleStage',
  STATUS: 'status',
  PRIMARY_CONTACT: 'primaryContact',
  LINKEDIN_URL: 'linkedinUrl',
  FACEBOOK_URL: 'facebookUrl',
  INSTAGRAM_URL: 'instagramUrl',
  WEBSITE: 'website',
  ACTIONS: 'actions',
};

/** Lifecycle stage badge color (SQL=purple, MQL=orange, Opportunity=green, etc.) */
export const CP_CONTACTS_LIFECYCLE_STAGE_COLORS = {
  sql: 'purple',
  mql: 'orange',
  opportunity: 'green',
  closure: 'blue',
  customer: 'teal',
};

/** Default toolbar filter shape for CP Contacts list (includes datetime filters). */
export const DEFAULT_CP_CONTACTS_FILTERS = {
  status: [],
  cpAccount: [],
  salesOwner: [],
  designation: [],
  department: [],
  state: [],
  city: [],
  lifecycleStage: [],
  created_at: { ...DEFAULT_DATETIME_FILTER },
  last_modified_at: { ...DEFAULT_DATETIME_FILTER },
};

/** Search placeholder */
export const CP_CONTACTS_SEARCH_PLACEHOLDER = 'Search here...';

/** Empty state message (fallback) */
export const CP_CONTACTS_EMPTY_MESSAGE = 'No CP contacts found.';

/** Empty states for table (same structure as vendor) */
export const CP_CONTACTS_EMPTY_STATES = {
  default: {
    title: 'No CP contacts yet',
    description: 'Create your first CP contact to get started.',
  },
  search: {
    title: 'No Contact match these filters',
    description: 'Try adjusting filters or clearing search.',
  },
  no_centers: { ...NO_CENTERS_EMPTY_STATE },
};

/** Group By options for toolbar */
export const CP_CONTACTS_GROUP_BY_OPTIONS = [
  'CP Account',
  'Sales Owner',
  'Designation',
  'Department',
  'City',
];

/** Group By label to row field key */
export const CP_CONTACTS_GROUP_BY_FIELD_MAP = {
  'CP Account': 'cpAccount',
  'Sales Owner': 'salesOwnerName',
  Designation: 'designation',
  Department: 'department',
  City: 'city',
  'Lifecycle Stage': 'lifecycleStage',
};

/** Options for Create CP Contact form dropdowns (extend from API when available) */
export const CP_CONTACT_DESIGNATION_OPTIONS = [
  { value: 'Manager', label: 'Manager' },
  { value: 'Director', label: 'Director' },
  { value: 'VP', label: 'VP' },
  { value: 'Executive', label: 'Executive' },
];

export const CP_CONTACT_DEPARTMENT_OPTIONS = [
  { value: 'Sales', label: 'Sales' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Human Resources', label: 'Human Resources' },
];

export const CP_CONTACT_LIFECYCLE_OPTIONS = [
  { value: 'mql', label: 'MQL' },
  { value: 'sql', label: 'SQL' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'closure', label: 'Closure' },
  { value: 'customer', label: 'Customer' },
];

export const CP_CONTACT_STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

/** CP Contact detail tab id → sidebar module name for `read`. */
export const CP_CONTACT_DETAIL_TAB_READ_MODULE = Object.freeze({
  about: 'CP Contact',
  cpAccount: 'CP Account',
  tasks: 'ACL Task',
  account: 'CRM Account',
  leads: 'CRM Lead',
  proposals: null,
  activities: null,
});
