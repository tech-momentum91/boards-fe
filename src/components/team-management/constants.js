import { subDays } from 'date-fns';
import {
  RiGroupLine,
  RiUserLine,
  RiTeamLine,
  RiBuildingLine,
  RiHeadphoneLine,
} from 'react-icons/ri';
import { NO_CENTERS_EMPTY_STATE } from '@/utils/global-center-filter';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';

// --- Support team date range
export const RANGE_DAYS = 7;

/** Default 7-day range: today and previous 6 days (inclusive). */
export const getDefaultDateRange = () => {
  const to = new Date();
  const from = subDays(to, 6);
  return { from, to };
};

// --- Centers list pagination / scroll
export const PAGE_SIZE = 20;
export const SCROLL_LOAD_THRESHOLD = 150;

// --- Filter utilities
/** Normalize value to array (single value → [value], array → unchanged). */
export const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

/** Default “filter dropdown” state for Core / Support team list (session-persisted). */
export const DEFAULT_TEAM_DROPDOWN_FILTERS = {
  center: [],
  status: [],
  role: [],
};

export const mergeStoredTeamDropdownFilters = (persisted) => {
  const p = persisted && typeof persisted === 'object' ? persisted : {};
  return {
    center: ensureArray(p.center),
    status: ensureArray(p.status),
    role: ensureArray(p.role),
  };
};

/** Applied filter shape for a single center-detail team tab (core / support). */
export const DEFAULT_TEAM_APPLIED_FILTERS = {
  center: [],
  status: [],
  role: [],
};

const CENTER_DETAIL_TEAM_TAB_KEYS = ['core_team', 'support_team'];

/** Center detail → Teams tab filter model (per tab, session-persisted per center). */
export const CENTER_DETAIL_TEAM_FILTER_DEFAULTS = {
  core_team: { ...DEFAULT_TEAM_APPLIED_FILTERS },
  support_team: { ...DEFAULT_TEAM_APPLIED_FILTERS },
};

export const CENTER_DETAIL_TEAM_VIEW_FILTERS_KEY = 'center-detail-team-tab-filters';

const CENTER_DETAIL_TEAM_TAB_PERSIST_INCLUDE_KEYS = ['center', 'status', 'role'];

export function compactCenterDetailTeamTabFiltersForStorage(tabFilters) {
  if (!tabFilters || typeof tabFilters !== 'object') return {};
  const out = {};
  for (const tabKey of CENTER_DETAIL_TEAM_TAB_KEYS) {
    const compact = compactFiltersForSessionStorage(
      tabFilters[tabKey],
      DEFAULT_TEAM_APPLIED_FILTERS,
      {
        includeKeys: CENTER_DETAIL_TEAM_TAB_PERSIST_INCLUDE_KEYS,
        trimStringArrayElements: true,
      },
    );
    if (Object.keys(compact).length > 0) {
      out[tabKey] = compact;
    }
  }
  return out;
}

export function mergeStoredCenterDetailTeamTabFilters(stored) {
  const base = {
    core_team: { ...DEFAULT_TEAM_APPLIED_FILTERS },
    support_team: { ...DEFAULT_TEAM_APPLIED_FILTERS },
  };
  if (!stored || typeof stored !== 'object') return base;

  const mergeTab = (tabKey) => {
    const tabStored = stored[tabKey] && typeof stored[tabKey] === 'object' ? stored[tabKey] : {};
    return {
      center: Array.isArray(tabStored.center) ? tabStored.center : base[tabKey].center,
      status: Array.isArray(tabStored.status) ? tabStored.status : base[tabKey].status,
      role: Array.isArray(tabStored.role) ? tabStored.role : base[tabKey].role,
    };
  };

  return {
    core_team: mergeTab('core_team'),
    support_team: mergeTab('support_team'),
  };
}

/** Build Frappe list filters for center-detail team listview (optionally pin center / omit status). */
export function buildTeamListviewFilters(applied = {}, options = {}) {
  const { fixedCenter = null, includeStatus = true } = options;
  const filters = [];

  const centerValues = fixedCenter
    ? [String(fixedCenter).trim()].filter(Boolean)
    : ensureArray(applied.center);
  if (centerValues.length === 1) {
    filters.push(['center', '=', centerValues[0]]);
  } else if (centerValues.length > 1) {
    filters.push(['center', 'in', centerValues]);
  }

  if (includeStatus) {
    const status = ensureArray(applied.status);
    if (status.length === 1) {
      filters.push(['status', '=', status[0]]);
    } else if (status.length > 1) {
      filters.push(['status', 'in', status]);
    }
  }

  const role = ensureArray(applied.role);
  if (role.length === 1) {
    filters.push(['role', '=', role[0]]);
  } else if (role.length > 1) {
    filters.push(['role', 'in', role]);
  }

  return filters;
}

export const CENTER_VIEW_CORE_TEAM_TABLE_ID = 'CENTER_VIEW_CORE_TEAM';
export const CENTER_VIEW_SUPPORT_TEAM_TABLE_ID = 'CENTER_VIEW_SUPPORT_TEAM';

export const CENTER_VIEW_CORE_TEAM_DEFAULT_COLUMNS = [
  { id: 'name', label: 'Name', visible: true, order: 0 },
  { id: 'email', label: 'Email', visible: true, order: 1 },
  { id: 'cell_number', label: 'Phone', visible: true, order: 2 },
  { id: 'role', label: 'Role', visible: true, order: 3 },
  { id: 'status', label: 'Status', visible: true, order: 4 },
  { id: 'actions', label: 'Actions', visible: true, order: 5 },
];

export const CENTER_VIEW_SUPPORT_TEAM_DEFAULT_COLUMNS = [
  { id: 'name', label: 'Name', visible: true, order: 0 },
  { id: 'cell_number', label: 'Phone', visible: true, order: 1 },
  { id: 'role', label: 'Role', visible: true, order: 2 },
  { id: 'status', label: 'Status', visible: true, order: 3 },
  { id: 'actions', label: 'Actions', visible: true, order: 4 },
];

/** Normalize `get_list_pref` response for center team tables; optionally drop columns (e.g. center). */
export function parseTeamColumnPrefResponse(data, { excludeIds = [] } = {}) {
  const exclude = new Set(excludeIds);
  const raw =
    data?.columns ??
    data?.message?.columns ??
    (Array.isArray(data?.message) ? data.message : null) ??
    data?.data ??
    [];
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.columns) ? raw.columns : [];

  return list
    .filter((col) => col?.id && !exclude.has(col.id))
    .map((col, index) => ({
      ...col,
      visible: col.visible !== false,
      order: col.order ?? index,
    }));
}

/** Extract role name from `get_roles_with_type` entry (string or `{ name, req_field }`). */
const roleNameFromApiEntry = (item) => {
  if (typeof item === 'string') return item.trim();
  if (item && typeof item === 'object' && item.name != null) {
    return String(item.name).trim();
  }
  return '';
};

/**
 * Map `get_roles_with_type` message to `{ label, value }[]` for filter dropdowns.
 * API returns role objects `{ name, req_field }` when `group` is passed.
 */
export const mapRolesMessageToFilterOptions = (message) => {
  if (!message || typeof message !== 'object') return [];
  const names = new Set();

  const collectFromList = (list) => {
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      const name = roleNameFromApiEntry(item);
      if (name) names.add(name);
    });
  };

  Object.values(message).forEach((bucket) => {
    if (Array.isArray(bucket)) {
      collectFromList(bucket);
      return;
    }
    if (bucket && typeof bucket === 'object') {
      Object.values(bucket).forEach(collectFromList);
    }
  });

  return [...names].sort((a, b) => a.localeCompare(b)).map((value) => ({ label: value, value }));
};

/** Build Frappe list filters from toolbar applied-filter shape (center / status / role). */
export const buildTeamListApiFiltersFromApplied = (applied = {}) => {
  const filters = [];
  const center = ensureArray(applied.center);
  if (center.length === 1) {
    filters.push(['center', '=', center[0]]);
  } else if (center.length > 1) {
    filters.push(['center', 'in', center]);
  }
  const status = ensureArray(applied.status);
  if (status.length === 1) {
    filters.push(['status', '=', status[0]]);
  } else if (status.length > 1) {
    filters.push(['status', 'in', status]);
  }
  const role = ensureArray(applied.role);
  if (role.length === 1) {
    filters.push(['role', '=', role[0]]);
  } else if (role.length > 1) {
    filters.push(['role', 'in', role]);
  }
  return filters;
};

// --- Support team role badge (display names)
export const SUPPORT_TEAM_ROLE_BADGE_MAP = {
  Security: 'blue',
  'HK Staff': 'purple',
  MST: 'yellow',
  'Office Boy': 'pink',
  'Pantry Boy': 'orange',
  Valet: 'yellow',
};

export const getSupportTeamRoleBadgeColor = (role) => {
  return SUPPORT_TEAM_ROLE_BADGE_MAP[role] ?? 'gray';
};

export const CORE_TEAM_GROUP_BY_OPTIONS = ['Center', 'Zone', 'Role', 'Status'];

export const SUPPORT_TEAM_GROUP_BY_OPTIONS = ['Center', 'Role'];

export const TEAM_STATUS_TAB_OPTIONS = [
  { value: 'centers', path: '/team-management', label: 'Centers', icon: RiBuildingLine },
  { value: 'core', path: '/team-management/core_team', label: 'Core Team', icon: RiGroupLine },
  {
    value: 'support',
    path: '/team-management/support_team',
    label: 'Support Team',
    icon: RiHeadphoneLine,
  },
];

export const DEFAULT_TEAM_FILTERS = {
  search: '',
  status: '',
};

export const EMPTY_STATES = {
  default: {
    title: 'No team members found',
    description: 'Get started by adding your first team member.',
  },
  search: {
    title: 'No results found',
    description: 'Try adjusting your search or filters to find what you are looking for.',
  },
  no_centers: NO_CENTERS_EMPTY_STATE,
};

export const STATUS_OPTIONS = [
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
];

export const STATUS_COLOR_MAP = {
  Active: 'green',
  Inactive: 'red',
};

export const getStatusBadgeColor = (status) => {
  return STATUS_COLOR_MAP[status] || 'gray';
};

export const ROLE_OPTIONS = [
  { label: 'OFFICE BOY', value: 'OFFICE BOY' },
  { label: 'PANTRY BOY', value: 'PANTRY BOY' },
  { label: 'SECURITY STAFF', value: 'SECURITY STAFF' },
  { label: 'HK STAFF', value: 'HK STAFF' },
  { label: 'MST', value: 'MST' },
  { label: 'SUPERVISOR', value: 'SUPERVISOR' },
];

export const ROLE_COLOR_MAP = {
  'OFFICE BOY': 'blue',
  'PANTRY BOY': 'pink',
  SECURITY: 'orange',
  'HK STAFF': 'purple',
  MST: 'yellow',
  SUPERVISOR: 'red',
};

export const getRoleBadgeColor = (role) => {
  return ROLE_COLOR_MAP[role] || 'gray';
};

// Core team roles (values only from API message) – each role has a distinct badge color
export const CORE_TEAM_ROLE_COLOR_MAP = {
  Admin: 'blue',
  'Sub Admin': 'sky',
  'Super Admin': 'purple',
  'Booking Manager': 'green',
  'Facility Lead': 'teal',
  'Facility Manager': 'green',
  'Facility Team': 'teal',
  'FM Team': 'sky',
  'Client Admin': 'blue',
  'Client User': 'pink',
  CRM: 'purple',
  'CRM User': 'orange',
  'Finance Manager': 'red',
  'Zone Manager': 'yellow',
  'HK Staff': 'purple',
};

export const getCoreTeamRoleBadgeColor = (role) => {
  return CORE_TEAM_ROLE_COLOR_MAP[role] ?? 'gray';
};

/** Unique zone labels from a core team member (from centers[].zone, or member.zone when grouped). */
export const getZonesFromMember = (member) => {
  if (Array.isArray(member?.centers) && member.centers.length > 0) {
    const zones = member.centers
      .map((c) => (typeof c === 'string' ? '' : (c?.zone || '').trim()))
      .filter(Boolean);
    return [...new Set(zones)];
  }
  if (typeof member?.zone === 'string' && member.zone.trim()) {
    return [member.zone.trim()];
  }
  return [];
};

export const HYGIENE_CHECKS = [
  {
    title: 'Wearing complete uniform',
    good: 1,
  },
  {
    title: 'ID badge visible',
    good: 0,
  },
  {
    title: 'Proper grooming & hygiene',
    good: 1,
  },
  {
    title: 'Safety shoes & gloves available',
    good: 1,
  },
  {
    title: 'Fit and ready to start duty',
    good: 0,
  },
];

export const MOCK_COMMENTS = [
  'Great work today!',
  'Uniform was unclean and did not meet the required hygiene standards.',
];

/**
 * Dummy data: Center name as key, array of user/team member data.
 * Use for development or when API is unavailable.
 */
export const DUMMY_CENTERS_WITH_USERS = {
  'Center A': [
    {
      id: 'user-1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      center: 'Center A',
      role: 'SUPERVISOR',
      status: 'Active',
      team: 'crm',
    },
    {
      id: 'user-2',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      center: 'Center A',
      role: 'MST',
      status: 'Active',
      team: 'fm',
    },
    {
      id: 'user-3',
      name: 'Mike Wilson',
      email: 'mike.wilson@example.com',
      center: 'Center A',
      role: 'HK STAFF',
      status: 'Active',
      team: 'hk',
    },
  ],
  'Center B': [
    {
      id: 'user-4',
      name: 'Sarah Brown',
      email: 'sarah.brown@example.com',
      center: 'Center B',
      role: 'SUPERVISOR',
      status: 'Active',
      team: 'crm',
    },
    {
      id: 'user-5',
      name: 'David Lee',
      email: 'david.lee@example.com',
      center: 'Center B',
      role: 'SECURITY STAFF',
      status: 'Active',
      team: 'security',
    },
  ],
  'Center C': [
    {
      id: 'user-6',
      name: 'Emily Davis',
      email: 'emily.davis@example.com',
      center: 'Center C',
      role: 'PANTRY BOY',
      status: 'Active',
      team: 'fm',
    },
    {
      id: 'user-7',
      name: 'Chris Taylor',
      email: 'chris.taylor@example.com',
      center: 'Center C',
      role: 'OFFICE BOY',
      status: 'Inactive',
      team: 'fm',
    },
  ],
};

export const getAttendanceData = (currentMonth) => {
  return {
    // Present dates
    present: [
      new Date(2026, currentMonth, 5),
      new Date(2026, currentMonth, 10),
      new Date(2026, currentMonth, 15),
      new Date(2026, currentMonth, 25),
      new Date(2026, currentMonth, 23),
      new Date(2026, currentMonth, 22),
      new Date(2026, currentMonth, 21),
      new Date(2026, currentMonth, 20),
    ],
    // Absent dates
    absent: [
      new Date(2026, currentMonth, 6),
      new Date(2026, currentMonth, 12),
      new Date(2026, currentMonth, 13),
      new Date(2026, currentMonth, 14),
      new Date(2026, currentMonth, 15),
      new Date(2026, currentMonth, 16),
      new Date(2026, currentMonth, 17),
      new Date(2026, currentMonth, 18),
      new Date(2026, currentMonth, 19),
    ],
    // Late dates
    late: [
      new Date(2026, currentMonth, 7),
      new Date(2026, currentMonth, 14),
      new Date(2026, currentMonth, 15),
    ],
    // Half day dates
    halfDay: [new Date(2026, currentMonth, 8)],
  };
};
