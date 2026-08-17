import { NO_CENTERS_EMPTY_STATE } from '@/utils/global-center-filter';
import { isCoworkingDeskSeatSelectionType } from '@/utils/layout-coworking-inventory-type';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';

export const STATUS_TAB_OPTIONS = [
  {
    value: 'active',
    label: 'All Clients',
  },
  {
    value: 'regular',
    label: 'Active Client',
  },
  {
    value: 'resource',
    label: 'Resource Clients',
  },
  {
    value: 'virtual',
    label: 'Virtual Clients',
  },
];

/** Maps status tab value → API list filter (field, operator, value). */
export const CLIENT_TAB_API_FILTERS = {
  regular: ['custom_customer_category', '=', 'Regular'],
  resource: ['custom_customer_category', '=', 'Resource'],
  virtual: ['custom_customer_category', '=', 'Virtual'],
};

/** Maps status tab value → `custom_customer_category` when creating a client. */
export const CLIENT_TAB_CUSTOMER_CATEGORY = {
  active: 'Regular',
  regular: 'Regular',
  resource: 'Resource',
  virtual: 'Virtual',
};

export const getClientTabCustomerCategory = (statusTab) =>
  CLIENT_TAB_CUSTOMER_CATEGORY[statusTab] ?? 'Regular';

/** Normalize API `status_counts` keys (e.g. `regular_clients`, `All`). */
export const normalizeClientStatusCountKey = (key) =>
  String(key).trim().toLowerCase().replaceAll(/\s+/g, '_');

/**
 * API `status_counts` keys (normalized) → tab value.
 * all → All Clients | regular_clients → Active Client | resource_clients → Resource | virtual_clients → Virtual
 */
export const CLIENT_TAB_COUNT_KEY_MAP = {
  all: 'active',
  all_clients: 'active',
  regular_clients: 'regular',
  active_clients: 'regular',
  resource_clients: 'resource',
  resource: 'resource',
  virtual_clients: 'virtual',
  virtual: 'virtual',
};

/**
 * Lifecycle engagement chips below the clients list search bar (Figma 109:537535).
 * iconKey maps to Untitled/Figma icon names: check, user-plus-01, alert-triangle, user-minus-01.
 */
export const CLIENT_ENGAGEMENT_FILTER_OPTIONS = [
  { value: 'Onboarding', label: 'Onboarding', iconKey: 'user-plus' },
  { value: 'Engagement', label: 'Engagement', iconKey: 'check' },
  { value: 'On Notice', label: 'On Notice', iconKey: 'alert-triangle' },
  { value: 'Exited', label: 'Exited', iconKey: 'user-minus' },
];

export const DEFAULT_FILTERS = {
  search: '',
  status: 'active',
  center: '',
  zone: '',
  floor: '',
  state: '',
  city: '',
  engagement: '',
};

/** Dropdown-only defaults for Clients list (session compact / merge). Not search/sorting. */
export const CLIENT_LIST_APPLIED_FILTER_DEFAULTS = {
  center: '',
  zone: '',
  floor: '',
  state: '',
  city: '',
  status: 'active',
};

export const CLIENT_LIST_FILTERS_PERSIST_INCLUDE_KEYS = [
  'center',
  'zone',
  'floor',
  'state',
  'city',
  'status',
];

/** Built-in session compaction options for `usePersistedFilters` (clients list). */
export const CLIENT_LIST_FILTERS_PERSIST_OPTS = {
  includeKeys: CLIENT_LIST_FILTERS_PERSIST_INCLUDE_KEYS,
  trimStringArrayElements: true,
  arrayOrStringDefaultEquivalence: { status: 'active' },
};

/**
 * Persist dropdown filters for the Clients list. Values may be strings (single-select)
 * or arrays (multi-select for center/state/city).
 */
export function compactClientListFiltersForStorage(filters) {
  return compactFiltersForSessionStorage(
    filters,
    CLIENT_LIST_APPLIED_FILTER_DEFAULTS,
    CLIENT_LIST_FILTERS_PERSIST_OPTS,
  );
}

export function mergeStoredClientListFilters(stored) {
  return {
    ...CLIENT_LIST_APPLIED_FILTER_DEFAULTS,
    ...(stored && typeof stored === 'object' ? stored : {}),
  };
}

const toClientFilterArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

/** Strip `centerId::floorLabel` composite values used by the Floor filter UI. */
const toFloorFilterLabels = (value) => {
  const labels = [];
  const seen = new Set();
  for (const raw of toClientFilterArray(value)) {
    const text = String(raw ?? '').trim();
    if (!text) continue;
    const separatorIndex = text.indexOf('::');
    const label = separatorIndex >= 0 ? text.slice(separatorIndex + 2).trim() : text;
    if (!label || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels;
};

/**
 * Build API filter tuples for the Clients list. When both zone and center are selected,
 * the backend ANDs them per center assignment (a client with multiple centres must have
 * at least one assignment that satisfies both filters).
 */
export function buildClientListFilterPayload({
  status,
  center,
  zone,
  floor,
  state,
  city,
  engagement,
}) {
  const payload = [];
  const tabFilter = CLIENT_TAB_API_FILTERS[status];
  if (tabFilter) payload.push(tabFilter);

  const selectedCenters = toClientFilterArray(center).filter(Boolean);
  const selectedZones = toClientFilterArray(zone).filter(Boolean);
  const selectedFloors = toFloorFilterLabels(floor);

  if (selectedZones.length > 0) {
    payload.push(['zone', 'in', selectedZones]);
  }
  if (selectedCenters.length > 0) {
    payload.push(['center', 'in', selectedCenters]);
  }
  if (selectedFloors.length > 0) {
    payload.push(['floor', 'in', selectedFloors]);
  }

  const stateList = toClientFilterArray(state);
  if (stateList.length > 0) payload.push(['state', 'in', stateList]);
  const cityList = toClientFilterArray(city);
  if (cityList.length > 0) payload.push(['city', 'in', cityList]);
  if (engagement) payload.push(['client_center_status', '=', engagement]);
  return payload;
}

/** Client detail > Booking tab — filter dropdown only (center + resource types). */
export const DEFAULT_CLIENT_BOOKING_VIEW_FILTERS = {
  center: null,
  resourceTypes: [],
};

/** Full shape persisted for client detail booking tab (toolbar + dropdown). */
export const CLIENT_DETAIL_BOOKING_TAB_PERSIST_DEFAULTS = {
  searchTerm: '',
  statusFilter: 'all',
  center: null,
  resourceTypes: [],
  dateRange: { from: undefined, to: undefined },
};

export const CLIENT_DETAIL_BOOKING_TAB_PERSIST_OPTS = {
  includeKeys: ['searchTerm', 'statusFilter', 'center', 'resourceTypes', 'dateRange'],
  trimStringArrayElements: true,
  scalarDiffKeys: ['statusFilter'],
  truthyObjectKeys: ['center'],
  objectSubkeysTruthyKeys: { dateRange: ['from', 'to'] },
};
export const FILTER_TABS = {
  CENTER: 'center',
  ZONE: 'zone',
  FLOOR: 'floor',
  STATE: 'state',
  CITY: 'city',
  STATUS: 'status',
  /** Customer / client picker (e.g. event participants filter). */
  CLIENT: 'client',
  /** Event / task list filters (not client lifecycle status). */
  TASK_STATUS: 'task_status',
  TASK_PRIORITY: 'task_priority',
};

export const FILTER_TAB_CONFIG = [
  { value: FILTER_TABS.CENTER, label: 'Center' },
  { value: FILTER_TABS.ZONE, label: 'Zone' },
  { value: FILTER_TABS.FLOOR, label: 'Floor' },
  { value: FILTER_TABS.STATE, label: 'State' },
  { value: FILTER_TABS.CITY, label: 'City' },
];

export const EMPTY_STATES = {
  default: {
    title: 'No clients yet',
    description:
      'Start by adding your first client to keep track of all relationships in one place.',
  },
  search: {
    title: 'No clients match your filters',
    description: 'Try adjusting your search term, status, or filters to see more clients.',
  },
  no_centers: NO_CENTERS_EMPTY_STATE,
};

/** Center Engaging badge in clients table — text #6E330C, bg #FFDAC2, ring #FFFFFF */
export const CENTER_ENGAGING_STATUS_BADGE_CLASS =
  '!bg-[#FFDAC2] !text-[#6E330C] ring-1 ring-inset ring-[#FFFFFF]';

const normalizeClientStatusKey = (status) =>
  String(status).toLowerCase().trim().replaceAll('-', ' ');

/** Parent row — client `custom_status` */
const CLIENT_STATUS_BADGE_MAP = {
  active: { color: 'green', label: 'Active' },
  inactive: { color: 'gray', label: 'Inactive' },
  onboarding: { color: 'blue', label: 'Onboarding' },
  offboarding: { color: 'red', label: 'Offboarding' },
  exiting: { color: 'yellow', label: 'Exiting' },
  prospects: { color: 'orange', label: 'Prospects' },
  pending: { color: 'orange', label: 'Pending' },
  completed: { color: 'green', label: 'Completed' },
  failed: { color: 'red', label: 'Failed' },
};

/** Child row — center `client_center_status` (distinct from client palette) */
const CENTER_STATUS_BADGE_MAP = {
  onboarding: { color: 'purple', label: 'Onboarding' },
  engaging: {
    label: 'Engaging',
    customClassName: CENTER_ENGAGING_STATUS_BADGE_CLASS,
  },
  engagement: {
    label: 'Engagement',
    customClassName: CENTER_ENGAGING_STATUS_BADGE_CLASS,
  },
  'on notice': { color: 'orange', label: 'On Notice' },
  exited: { color: 'red', label: 'Exited' },
  exit: { color: 'red', label: 'Exit' },
};

/**
 * Status badge config for clients list table and client detail (`custom_status`).
 * @param {string} status
 * @param {{ isCenterChild?: boolean }} [options]
 * @returns {{ color?: string, label: string, customClassName?: string }}
 */
export function getClientStatusBadgeVariant(status, { isCenterChild = false } = {}) {
  if (!status || status === '-') return { color: 'gray', label: '-' };

  const normalized = normalizeClientStatusKey(status);
  const statusMap = isCenterChild ? CENTER_STATUS_BADGE_MAP : CLIENT_STATUS_BADGE_MAP;

  return statusMap[normalized] || { color: 'gray', label: status };
}

export const CLIENT_STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  // { value: 'Inactive', label: 'Inactive' },
  // { value: 'Prospect', label: 'Prospect' },
  { value: 'Exiting', label: 'Exiting' },
];

export const GST_STATUS_OPTIONS = [
  { value: 'Registered', label: 'Registered' },
  { value: 'Unregistered', label: 'Unregistered' },
  { value: 'Composition', label: 'Composition' },
];

export const ACCOUNT_TYPE_OPTIONS = [
  { value: 'Current', label: 'Current' },
  { value: 'Savings', label: 'Savings' },
  // { value: 'Overdraft', label: 'Overdraft' },
];

export const ORGANIZATION_TYPE_OPTIONS = [
  // Company Types
  { value: 'Private Limited Company (Pvt. Ltd.)', label: 'Private Limited Company (Pvt. Ltd.)' },
  { value: 'Public Limited Company (Ltd.)', label: 'Public Limited Company (Ltd.)' },
  { value: 'Partnership Firm', label: 'Partnership Firm' },
  { value: 'Limited Liability Partnership (LLP)', label: 'Limited Liability Partnership (LLP)' },
  { value: 'Proprietorship / Sole Proprietor', label: 'Proprietorship / Sole Proprietor' },
  { value: 'One Person Company (OPC)', label: 'One Person Company (OPC)' },
  // Organization Types
  { value: 'Government Organization', label: 'Government Organization' },
  { value: 'Non-Governmental Organization (NGO)', label: 'Non-Governmental Organization (NGO)' },
  { value: 'Public Sector Undertaking (PSU)', label: 'Public Sector Undertaking (PSU)' },
  { value: 'Trust', label: 'Trust' },
  { value: 'Society', label: 'Society' },
  { value: 'Co-operative Society', label: 'Co-operative Society' },
  // Company Categories
  { value: 'Startup / MSME', label: 'Startup / MSME' },
  { value: 'MNC (Multinational Company)', label: 'MNC (Multinational Company)' },
];

export const COMPANY_SECTOR_OPTIONS = [
  { value: 'Technology', label: 'Technology' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Education', label: 'Education' },
  { value: 'Retail', label: 'Retail' },
  { value: 'Real Estate', label: 'Real Estate' },
  { value: 'Manufacturing', label: 'Manufacturing' },
  { value: 'Consulting', label: 'Consulting' },
  { value: 'Media', label: 'Media' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'E-commerce', label: 'E-commerce' },
  { value: 'Logistics', label: 'Logistics' },
  { value: 'Hospitality', label: 'Hospitality' },
  { value: 'Agriculture', label: 'Agriculture' },
  { value: 'Energy', label: 'Energy' },
  { value: 'Telecommunications', label: 'Telecommunications' },
];

export const DEPARTMENT_OPTIONS = [
  { value: 'Accounts', label: 'Accounts' },
  { value: 'HR', label: 'HR' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Other', label: 'Other' },
];

// Onboarding Tasks Constants
export const ONBOARDING_PRIORITY_COLORS = {
  high: 'orange',
  medium: 'purple',
  low: 'green',
  critical: 'red',
};

export const ONBOARDING_STATUS_COLORS = {
  // pending, ongoing, overdue, completed
  pending: 'orange',
  ongoing: 'blue',
  overdue: 'red',
  completed: 'green',
};

export const RECURRING_FREQUENCY_OPTIONS = [
  { value: 'One Time', label: 'One Time' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Yearly', label: 'Yearly' },
];

// Task Status and Priority Options
export const TASK_STATUS_OPTIONS = [
  // pending, ongoing, completed
  { value: 'Pending', label: 'Pending', color: 'orange', percentage: 20 },
  { value: 'Ongoing', label: 'Ongoing', color: 'blue', percentage: 50 },
  { value: 'Overdue', label: 'Overdue', color: 'red', percentage: 80 },
  { value: 'Completed', label: 'Completed', color: 'green', percentage: 100 },
];

export const TASK_PRIORITY_OPTIONS = [
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

// Task Filter Options
export const TASK_FILTER_OPTIONS = [
  { value: 'all', label: 'All Tasks' },
  { value: 'recurring', label: 'Recurring Tasks' },
  { value: 'one time', label: 'One Time Tasks' },
];

export const DEFAULT_TASK_FILTER = 'all';

// Helper function to get task filter label
export const getTaskFilterLabel = (filterValue) => {
  const option = TASK_FILTER_OPTIONS.find((opt) => opt.value === filterValue);
  return option?.label || 'All Tasks';
};

/** Engagement tab: recurrence filter only (not search/sorting) */
export function compactEngagementTabFiltersForStorage({ taskFilter }) {
  if (!taskFilter || taskFilter === DEFAULT_TASK_FILTER) return {};
  return { taskFilter };
}

export function mergeStoredEngagementTabFilters(stored) {
  const allowed = TASK_FILTER_OPTIONS.map((o) => o.value);
  if (!stored || typeof stored !== 'object') return { taskFilter: DEFAULT_TASK_FILTER };
  const tf = stored.taskFilter;
  if (tf && allowed.includes(tf)) return { taskFilter: tf };
  return { taskFilter: DEFAULT_TASK_FILTER };
}

// Utility functions for task colors
export const getPriorityColor = (priority) => {
  if (!priority) return 'gray';
  const normalized = String(priority).toLowerCase();
  return ONBOARDING_PRIORITY_COLORS[normalized] || 'gray';
};

export const getStatusColor = (status) => {
  if (!status) return 'gray';
  const normalized = String(status).toLowerCase();
  // Map common status values
  if (normalized === 'open' || normalized === 'in progress') return 'blue';
  if (normalized === 'pending') return 'orange';
  if (normalized === 'completed' || normalized === 'closed') return 'green';
  return ONBOARDING_STATUS_COLORS[normalized] || 'gray';
};

// Space Allocation Constants
export const SPACE_TYPE_OPTIONS = [
  { value: 'Managed Office', label: 'Managed Office' },
  { value: 'Co-working Space', label: 'Co-Working Space' },
  { value: 'Pure Rental', label: 'Pure Rental' },
  { value: 'Parking', label: 'Parking' },
  { value: 'Resource', label: 'Resource' },
];

// Space Type Values (for comparison and validation)
export const SPACE_TYPE = {
  MANAGED_OFFICE: 'Managed Office',
  COWORKING_SPACE: 'Co-working Space',
  PURE_RENTAL: 'Pure Rental',
  RESOURCE: 'Resource',
};

export const COWORKING_SPACE_TYPE_OPTIONS = [
  { value: 'Private Cabin', label: 'Private Cabin' },
  { value: 'Manager Cabin', label: 'Manager Cabin' },
  { value: 'Dedicated Desk', label: 'Dedicated Desk' },
  { value: 'Hot Desk', label: 'Hot Desk' },
];

// Co-working Space Type Values (for comparison and validation)
export const COWORKING_SPACE_TYPE = {
  PRIVATE_CABIN: 'Private Cabin',
  MANAGER_CABIN: 'Manager Cabin',
  DEDICATED_DESK: 'Dedicated Desk',
  HOT_DESK: 'Hot Desk',
};

export const SPACE_STATUS_OPTIONS = [
  { value: 'Available', label: 'Available' },
  { value: 'Occupied', label: 'Occupied' },
  // { value: 'Reserved', label: 'Reserved' },
  // { value: 'Left', label: 'Left' },
  // { value: 'Notice', label: 'Notice' },
  // { value: 'Inactive', label: 'Inactive' },
];

export const DEFAULT_SPACE_TYPE = SPACE_TYPE.MANAGED_OFFICE;

// Helper function to check if seat selection is required
export const requiresSeatSelection = (spaceType, coworkingSpaceType) => {
  return (
    spaceType === SPACE_TYPE.COWORKING_SPACE && isCoworkingDeskSeatSelectionType(coworkingSpaceType)
  );
};

// Helper function to check if space selection should be shown
export const shouldShowSpaceSelection = (spaceType, coworkingSpaceType) => {
  if (!spaceType) return false;
  // Show space selection for Resource, Managed Office, or Co-Working Space with coworking type selected
  return (
    spaceType === SPACE_TYPE.RESOURCE ||
    spaceType === SPACE_TYPE.MANAGED_OFFICE ||
    spaceType === SPACE_TYPE.PURE_RENTAL ||
    (spaceType === SPACE_TYPE.COWORKING_SPACE && Boolean(coworkingSpaceType))
  );
};

// Client detail empty states
export const CLIENT_DETAIL_EMPTY_STATES = {
  default: {
    title: 'No data available',
    description: 'There is no data to display.',
  },
  billing: {
    title: 'No billing records',
    description: 'There are no billing records available for this client.',
  },
  onboarding: {
    title: 'No Onboarding Tasks',
    description: 'There are no onboarding tasks available for this client.',
  },
  engagement: {
    title: 'No Engagement Tasks',
    description: 'There are no engagement tasks available for this client.',
  },
  exit: {
    title: 'No Exit Tasks',
    description: 'There are no exit tasks available for this client.',
  },
  csi: {
    title: 'No CSI Surveys',
    description: 'There are no CSI surveys available for this client.',
  },
  allocatedSpaces: {
    title: 'No allocated spaces available',
    description: 'Allocate a space to get started.',
  },
  clientLayout: {
    title: 'No layout available',
    description: 'There is no floor layout to display.',
  },
  bankDetails: {
    title: 'No bank details available',
    description: 'Add a bank account to get started.',
  },
  contacts: {
    title: 'No contacts available',
    description: 'Add a contact to get started.',
  },
  addresses: {
    title: 'No address available',
    description: 'Add an address to get started.',
  },
  search: {
    title: 'No results found',
    description: 'Try adjusting your search or filters.',
  },
};

/** Client detail main tab key → sidebar module name for `read`. */
export const CLIENT_DETAIL_TAB_READ_MODULE = Object.freeze({
  about: 'Customer',
  tickets: 'HD Ticket',
  bookings: 'Space Booking',
  allocate: 'Assign Space',
  billing: 'Client Billing',
  csi: 'CSI Survey',
  onboarding: 'Task',
  engagement: 'Task',
  exit: 'Task',
  'custom-vms': 'Customer',
});
export const TASK_FILTER_TABS = {
  STATUS: 'status',
  PRIORITY: 'priority',
  TAGS: 'tags',
  RECURRING: 'recurring',
};

export const ONBOARDING_TASK_FILTER_TAB_CONFIG = [
  { value: TASK_FILTER_TABS.STATUS, label: 'Status' },
  { value: TASK_FILTER_TABS.PRIORITY, label: 'Priority' },
  { value: TASK_FILTER_TABS.TAGS, label: 'Tags' },
];

export const ENGAGEMENT_TASK_FILTER_TAB_CONFIG = [
  { value: TASK_FILTER_TABS.RECURRING, label: 'Recurring' },
  { value: TASK_FILTER_TABS.STATUS, label: 'Status' },
  { value: TASK_FILTER_TABS.PRIORITY, label: 'Priority' },
  { value: TASK_FILTER_TABS.TAGS, label: 'Tags' },
];

export const EXIT_TASK_FILTER_TAB_CONFIG = [
  { value: TASK_FILTER_TABS.STATUS, label: 'Status' },
  { value: TASK_FILTER_TABS.PRIORITY, label: 'Priority' },
  { value: TASK_FILTER_TABS.TAGS, label: 'Tags' },
];

export const TASK_FILTER_OPTION = {
  status: [],
  priority: [],
  tags: [],
  recurring: [],
};

/** API `group_by` value for center grouping on `get_task_list_view`. */
export const CLIENT_TASK_GROUP_BY_CENTER = 'center';

/** Client detail task tabs — group-by toolbar options (UI label + API value). */
export const CLIENT_TASK_GROUP_BY_OPTIONS = [
  { label: 'Center', value: CLIENT_TASK_GROUP_BY_CENTER },
];

export const CLIENT_DETAIL_ONBOARDING_FILTERS_KEY = 'client-detail-onboarding-view-filters';
export const CLIENT_DETAIL_ENGAGEMENT_FILTERS_KEY = 'client-detail-engagement-view-filters';
export const CLIENT_DETAIL_EXIT_FILTERS_KEY = 'client-detail-exit-view-filters';
export const CLIENT_TASK_MASTER_ONBOARDING_FILTERS_KEY = 'client-task-master-onboarding-filters';
export const CLIENT_TASK_MASTER_ENGAGEMENT_FILTERS_KEY = 'client-task-master-engagement-filters';
export const CLIENT_TASK_MASTER_EXIT_FILTERS_KEY = 'client-task-master-exit-filters';
export const CLIENT_DETAIL_BILLING_FILTERS_KEY = 'client-detail-billing-view-filters';
export const CLIENT_DETAIL_BOOKING_FILTERS_KEY = 'client-detail-booking-view-filters';
export const CLIENT_DETAIL_ALLOCATE_FILTERS_KEY = 'client-detail-allocate-view-filters';

// Allocate Space Tab Filter Constants
export const ALLOCATE_FILTER_TABS = {
  RESOURCE_TYPE: 'resource_type',
  STATUS: 'status',
  SEATS: 'seats',
  LEASE_DURATION: 'lease_duration',
  TOTAL_RATE: 'total_rate',
};

export const ALLOCATE_FILTER_TAB_CONFIG = [
  { value: ALLOCATE_FILTER_TABS.RESOURCE_TYPE, label: 'Resource Type' },
  { value: ALLOCATE_FILTER_TABS.STATUS, label: 'Status' },
  { value: ALLOCATE_FILTER_TABS.SEATS, label: 'Seats' },
  { value: ALLOCATE_FILTER_TABS.LEASE_DURATION, label: 'Lease Duration' },
  { value: ALLOCATE_FILTER_TABS.TOTAL_RATE, label: 'Total Rate' },
];

export const ALLOCATE_FILTER_OPTION = {
  resource_type: [],
  status: [],
  seats: [],
  lease_duration: [],
  total_rate: [],
};

export const ALLOCATE_SPACE_STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Expired', label: 'Expired' },
];

export const ALLOCATE_SEATS_OPTIONS = [
  { value: '1-5', label: '1 – 5 Seats' },
  { value: '6-10', label: '6 – 10 Seats' },
  { value: '11-20', label: '11 – 20 Seats' },
  { value: '21-50', label: '21 – 50 Seats' },
  { value: '51+', label: '51+ Seats' },
];

export const ALLOCATE_LEASE_DURATION_OPTIONS = [
  { value: '0-6', label: '0 – 6 Months' },
  { value: '6-12', label: '6 – 12 Months' },
  { value: '12-24', label: '12 – 24 Months' },
  { value: '24+', label: '24+ Months' },
];

export const ALLOCATE_TOTAL_RATE_OPTIONS = [
  { value: '0-50000', label: '₹0 – ₹50,000' },
  { value: '50000-100000', label: '₹50,000 – ₹1,00,000' },
  { value: '100000-500000', label: '₹1,00,000 – ₹5,00,000' },
  { value: '500000+', label: '₹5,00,000+' },
];
