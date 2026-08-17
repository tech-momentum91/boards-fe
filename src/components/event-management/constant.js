import { z } from 'zod';
import { formatDateToYYYYMMDD } from '@/utils/date-utils';
import {
  RiCalendarEventLine,
  RiCalendarTodoLine,
  RiFileList2Fill,
  RiFileList2Line,
  RiGroupFill,
  RiGroupLine,
  RiInformationFill,
  RiInformationLine,
  RiCalendarLine,
  RiCalendarEventFill,
  RiCalendarTodoFill,
  RiCheckboxCircleFill,
  RiTaskFill,
  RiTodoFill,
  RiTodoLine,
  RiLineChartLine,
  RiPercentLine,
  RiStackLine,
  RiTeamLine,
} from 'react-icons/ri';

import { FILTER_TABS, TASK_STATUS_OPTIONS } from '@/components/clients-management/constants';

/** Shared zod helper for optional date fields. */
export const zOptionalDateString = z.preprocess((value) => {
  if (value == null || value === '') return undefined;
  if (value instanceof Date) return formatDateToYYYYMMDD(value);
  if (typeof value === 'string') return value;
  return undefined;
}, z.string().optional());

/** Shared status-to-badge-color mapping for all event sub-types. */
export const getEventStatusBadgeColor = (status) => {
  const normalized = String(status || '')
    .trim()
    .toLowerCase();
  if (!normalized) return 'gray';

  const colorByStatus = {
    exploration: 'blue',
    'proposed to ho': 'orange',
    'approved by ho': 'green',
    planned: 'purple',
    executed: 'teal',
    'rejected by ho': 'red',
    'open for registration': 'sky',
    completed: 'green',
    'registration closed': 'orange',
    ongoing: 'blue',
    cancelled: 'red',
    draft: 'gray',
    'all centers': 'sky',
    'all clients': 'sky',
  };

  return colorByStatus[normalized] || 'gray';
};

/**
 * Build `filters` for `get_event_type_list`: [["field","in",[values]], ...]
 * Only includes clauses with at least one value.
 */
export const buildEventTypeListFiltersArray = (filters = {}, moduleType = 'micro') => {
  const statusField = moduleType === 'community' ? 'community_status' : 'status';
  const entries = [
    ['centre_name', Array.isArray(filters.center) ? filters.center : []],
    ['partner_name', Array.isArray(filters.partner) ? filters.partner : []],
    [statusField, Array.isArray(filters.status) ? filters.status : []],
    ['engagement_mode', Array.isArray(filters.engagement_mode) ? filters.engagement_mode : []],
    ['revenue_mode', Array.isArray(filters.revenue_mode) ? filters.revenue_mode : []],
    ['event_category', Array.isArray(filters.category) ? filters.category : []],
    [
      'participation_type',
      Array.isArray(filters.participation_type) ? filters.participation_type : [],
    ],
  ];
  return entries
    .filter(([, values]) => Array.isArray(values) && values.length > 0)
    .map(([field, values]) => [field, 'in', values]);
};

/** Default ordering for `get_event_type_list` (must match thunk default). */
export const EVENTS_LIST_DEFAULT_ORDER_BY = 'creation desc';

/** Schedule columns derive display from date + times; list API sorts by doc date field. */
const EVENT_SCHEDULE_SORT_FIELDS = {
  event_start_datetime: 'start_datetime',
  event_end_datetime: 'start_datetime',
};

/**
 * Maps events table column ids → backend field names for `order_by`.
 * Most ids match the Events doctype; only exceptions are listed per module.
 */
const EVENTS_LIST_SORT_FIELD_OVERRIDES = {
  spotlight: EVENT_SCHEDULE_SORT_FIELDS,
  hosted: EVENT_SCHEDULE_SORT_FIELDS,
  community: {
    ...EVENT_SCHEDULE_SORT_FIELDS,
    /** List column "Clients" reads `clients_applicable` / related fields. */
    clients: 'clients_applicable',
    /** Community list shows `created_by` in the Owner column. */
    owner: 'created_by',
  },
};

/**
 * Build `order_by` for `getEventTypeListThunk` from TanStack sorting state.
 * Event name is not sortable in the UI and must not appear in `sorting`.
 *
 * @param {'spotlight' | 'community' | 'hosted'} moduleType
 * @param {import('@tanstack/react-table').SortingState} sorting
 */
export const buildEventsListOrderBy = (moduleType = 'spotlight', sorting = []) => {
  const overrides = EVENTS_LIST_SORT_FIELD_OVERRIDES[moduleType] || {};
  if (!Array.isArray(sorting) || sorting.length === 0) {
    return EVENTS_LIST_DEFAULT_ORDER_BY;
  }
  const clause = sorting
    .filter((s) => s && s.id && s.id !== 'event_name')
    .map((s) => {
      const field = overrides[s.id] ?? s.id;
      return `${field} ${s.desc ? 'desc' : 'asc'}`;
    })
    .join(', ');
  return clause || EVENTS_LIST_DEFAULT_ORDER_BY;
};

// Base stats data per events sub-module
export const EVENT_MANAGEMENT_STATS = {
  spotlight: {
    stat: [
      {
        key: 'total_spotlight_events',
        label: 'Total Spotlight Events',
        value: 0,
        icon: RiCalendarLine,
      },
      {
        key: 'upcoming_events',
        label: 'Upcoming Events',
        value: 0,
        icon: RiCalendarLine,
      },
      {
        key: 'completed_events',
        label: 'Completed Events',
        value: 0,
        icon: RiCalendarLine,
      },
    ],
  },
  hosted: {
    stat: [
      {
        key: 'total_events',
        label: 'Total Events',
        value: 0,
        icon: RiCalendarLine,
      },
      {
        key: 'upcoming_events',
        label: 'Upcoming Events',
        value: 0,
        icon: RiCalendarLine,
      },
      {
        key: 'executed_events',
        label: 'Executed Events',
        value: 0,
        icon: RiCalendarLine,
      },
      {
        key: 'approved_by_hod',
        label: 'Approved by HO',
        value: 0,
        icon: RiCalendarLine,
      },
      {
        key: 'total_seat_capacity',
        label: 'Total Seat Capacity',
        value: 0,
        icon: RiCalendarLine,
      },
    ],
  },
  community: {
    stat: [
      {
        key: 'total_events',
        label: 'Total Events',
        value: 0,
        icon: RiCalendarLine,
      },
      {
        key: 'open_for_registration',
        label: 'Open for Registration',
        value: 0,
        icon: RiCalendarLine,
      },
      {
        key: 'completed_events',
        label: 'Completed Events',
        value: 0,
        icon: RiCalendarLine,
      },
      {
        key: 'total_registrations',
        label: 'Total Registrations',
        value: 0,
        icon: RiCalendarLine,
      },
      {
        key: 'upcoming_events_community',
        label: 'Upcoming',
        value: 0,
        icon: RiCalendarLine,
      },
    ],
  },
};

export const PARTICIPATION_TYPE_OPTIONS = [
  { label: 'Single Participation', value: 'Single Participation' },
  { label: 'Team Participation', value: 'Team Participation' },
];

// Community Events — used by create + detail UIs
export const COMMUNITY_PARTICIPATION_OPTIONS = [
  { label: 'Single Participation', value: 'Single Participation' },
  { label: 'Team Participation', value: 'Team Participation' },
];

// Hosted Events — registration mode select (detail view)
export const REGISTRATION_MODE_OPTIONS = [
  { label: 'Internal Registration Form', value: 'INTERNAL' },
  { label: 'External Registration Form', value: 'EXTERNAL' },
  { label: 'Offline', value: 'OFFLINE' },
];

/** Display label when max registrations is unlimited (empty / 0 on the Events doctype). */
export const MAX_REGISTRATIONS_NO_LIMIT_LABEL = 'No Limit';

export const isMaxRegistrationsUnlimited = (value) => {
  if (value == null || value === '') return true;
  if (typeof value === 'string' && value.trim().toLowerCase() === 'no limit') return true;
  const n = Number(value);
  return !Number.isNaN(n) && n === 0;
};

export const formatMaxRegistrationsDisplay = (value) =>
  isMaxRegistrationsUnlimited(value) ? MAX_REGISTRATIONS_NO_LIMIT_LABEL : String(value);

/** Persist unlimited as `0` (Int field); otherwise a positive integer string/number. */
export const parseMaxRegistrationsInput = (value) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed || trimmed.toLowerCase() === 'no limit') return 0;
  const n = Number.parseInt(trimmed, 10);
  // Reject NaN / zero / negatives as unlimited (0). Only positive ints persist as capacity.
  if (Number.isNaN(n) || n < 1) return 0;
  return n;
};
export const OWNER_OPTIONS = [
  { label: 'Karan Madan', value: 'Karan Madan' },
  { label: 'Muskan Heda', value: 'Muskan Heda' },
];

export const CENTER_OPTIONS = [
  { label: 'DevX Prahladnagar', value: 'DevX Prahladnagar' },
  { label: 'DevX Corporate House', value: 'DevX Corporate House' },
];

export const PARTNER_OPTIONS = [
  { label: 'GrowthX', value: 'GrowthX' },
  { label: 'TiE Ahmedabad', value: 'TiE Ahmedabad' },
];
// Visual config for each stat key – used by EventStats
export const EVENT_STATS_CONFIG = {
  total_spotlight_events: {
    icon: RiCalendarEventFill,
    gradient: 'from-[#CAC2FF] to-[#EEEBFF]',
    textColor: 'text-[#2B1664]',
    iconColor: 'fill-[#5A36BF]',
    order: 1,
  },
  upcoming_events: {
    icon: RiCalendarTodoFill,
    gradient: 'from-[#FBEDB1] to-[#FEF7EC]',
    textColor: 'text-[#693D11]',
    iconColor: 'fill-[#B47818]',
    order: 2,
  },
  completed_events: {
    icon: RiCheckboxCircleFill,
    gradient: 'from-[#C2D6FF] to-[#EBF1FF]',
    textColor: 'text-[#162664]',
    iconColor: 'fill-[#253EA7]',
    order: 3,
  },
  total_tasks: {
    icon: RiTaskFill,
    gradient: 'from-[#F9C2FF] to-[#FDEBFF]',
    textColor: 'text-[#620F6C]',
    iconColor: 'fill-[#9C23A9]',
    order: 4,
  },
  executed_events: {
    icon: RiCheckboxCircleFill,
    gradient: 'from-[#C2D6FF] to-[#EBF1FF]',
    textColor: 'text-[#162664]',
    iconColor: 'fill-[#253EA7]',
    order: 5,
  },
  total_events: {
    icon: RiCalendarEventFill,
    gradient: 'from-[#F9D2DA] to-[#FDEDF0]',
    textColor: 'text-[#710E21]',
    iconColor: 'fill-[#AF1D38]',
    order: 6,
  },
  approved_by_hod: {
    icon: RiCheckboxCircleFill,
    gradient: 'from-[#CAC2FF] to-[#EEEBFF]',
    textColor: 'text-[#2B1664]',
    iconColor: 'fill-[#5A36BF]',
    order: 7,
  },
  total_seat_capacity: {
    icon: RiGroupFill,
    gradient: 'from-[#C2D6FF] to-[#EBF1FF]',
    textColor: 'text-[#162664]',
    iconColor: 'fill-[#253EA7]',
    order: 8,
  },
  open_for_registration: {
    icon: RiCalendarTodoFill,
    gradient: 'from-[#FBEDB1] to-[#FEF7EC]',
    textColor: 'text-[#693D11]',
    iconColor: 'fill-[#B47818]',
    order: 9,
  },
  total_registrations: {
    icon: RiGroupFill,
    gradient: 'from-[#F9C2FF] to-[#FDEBFF]',
    textColor: 'text-[#620F6C]',
    iconColor: 'fill-[#9C23A9]',
    order: 10,
  },
  upcoming_events_community: {
    icon: RiCalendarEventFill,
    gradient: 'from-[#F9D2DA] to-[#FDEDF0]',
    textColor: 'text-[#710E21]',
    iconColor: 'fill-[#AF1D38]',
    order: 11,
  },
};

// Status filter tabs for events – shared by all sub-modules (spotlight, hosted, community)
export const EVENT_STATUS_TAB_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'exploration', label: 'Exploration' },
  { value: 'proposed_to_ho', label: 'Proposed to HO' },
  { value: 'approved_by_ho', label: 'Approved by HO' },
  { value: 'planned', label: 'Planned' },
  { value: 'executed', label: 'Executed' },
  { value: 'rejected_by_ho', label: 'Rejected by HO' },
];

/**
 * Event Tasks (CRM) — same four statuses as other document tasks (table, create drawer, detail drawer).
 * Uses `color` / `percentage` for `TaskStatusDropdown` (see `task-status-dropdown.jsx`).
 */
export const EVENT_TASK_STATUS_OPTIONS = TASK_STATUS_OPTIONS;

export const EVENT_TASK_PRIORITY_OPTIONS = [
  { value: 'High', label: 'High', badgeColor: 'red' },
  { value: 'Medium', label: 'Medium', badgeColor: 'orange' },
  { value: 'Low', label: 'Low', badgeColor: 'green' },
];

/**
 * Event Activities (right panel) default filters/timeframes.
 * API can override via `activity_filter_options` and `time_frame_options`.
 */
export const EVENT_ACTIVITY_DEFAULT_FILTER_OPTIONS = [
  { value: 'all', label: 'All Activities' },
  { value: 'event', label: 'Event' },
  { value: 'task', label: 'Task' },
];

export const EVENT_ACTIVITY_DEFAULT_TIME_FRAME_OPTIONS = [
  { value: 'all', label: 'All Time Periods' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'older', label: 'Older' },
];

/**
 * Event attachments.
 */
export const EVENT_ATTACHMENT_TYPE_OPTIONS = [
  { label: 'xlsx', value: 'xlsx' },
  { label: 'pdf', value: 'pdf' },
  { label: 'txt', value: 'txt' },
];

export const getAttachmentTypeColor = (type) => {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'xlsx') return 'orange';
  if (normalized === 'pdf') return 'purple';
  if (normalized === 'txt') return 'pink';
  if (normalized === 'png') return 'blue';
  return 'gray';
};

export const getEventAttachmentTypeColor = (type) => {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'brief') return 'orange';
  if (normalized === 'creative') return 'purple';
  return 'gray';
};

export const EVENT_INLINE_EDIT_PENCIL_ICON_CLASSNAME =
  'pointer-events-none absolute right-1.5 top-1/2 size-4 -translate-y-1/2 text-text-soft-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100';

export const getEventTaskStatusLabel = (value) => {
  const key = String(value ?? '').trim();
  const found = EVENT_TASK_STATUS_OPTIONS.find((o) => o.value === key);
  return found?.label ?? key;
};

export const getEventTaskStatusColor = (status) => {
  const key = String(status ?? '').trim();
  if (!key) return 'gray';
  const found = EVENT_TASK_STATUS_OPTIONS.find((o) => o.value === key);
  if (found?.color) return found.color;
  const normalized = key.toLowerCase();
  const legacy = {
    pending: 'orange',
    ongoing: 'blue',
    'pending review': 'orange',
    'in progress': 'blue',
    done: 'green',
    open: 'sky',
    working: 'blue',
    overdue: 'red',
    template: 'purple',
    completed: 'green',
    cancelled: 'red',
  };
  return legacy[normalized] || 'gray';
};

export const getEventTaskPriorityColor = (priority) => {
  const key = String(priority ?? '').trim();
  if (!key) return 'gray';
  const found = EVENT_TASK_PRIORITY_OPTIONS.find((o) => o.value === key);
  if (found?.badgeColor) return found.badgeColor;
  const normalized = key.toLowerCase();
  if (normalized === 'high') return 'red';
  if (normalized === 'medium') return 'orange';
  if (normalized === 'low') return 'green';
  return 'gray';
};

// Filter configuration per sub-module
export const EVENT_FILTER_CONFIG = {
  spotlight: ['center', 'partner', 'engagement_mode', 'revenue_mode', 'category'],
  community: ['center', 'participation_type'],
  hosted: ['center', 'partner', 'revenue_mode', 'category'],
};

// Vertical tabs definition for Events filter dropdown
export const EVENT_FILTER_VERTICAL_TABS = [
  { value: 'center', label: 'Center' },
  { value: 'partner', label: 'Partner' },
  { value: 'engagement_mode', label: 'Engagement Mode' },
  { value: 'revenue_mode', label: 'Revenue Mode' },
  { value: 'category', label: 'Event Category' },
  { value: 'participation_type', label: 'Participation Type' },
];

/** Event detail → Event Tasks tab filter dropdown (center / status / priority). */
export const EVENT_TASKS_APPLIED_FILTER_DEFAULTS = {
  center: [],
  task_status: [],
  task_priority: [],
};

export const EVENT_TASKS_FILTER_PERSIST_KEYS = ['center', 'task_status', 'task_priority'];

export function mergeStoredEventTasksFilters(stored) {
  const base = { ...EVENT_TASKS_APPLIED_FILTER_DEFAULTS };
  if (!stored || typeof stored !== 'object') return base;
  return {
    ...base,
    center: Array.isArray(stored.center) ? stored.center : base.center,
    task_status: Array.isArray(stored.task_status) ? stored.task_status : base.task_status,
    task_priority: Array.isArray(stored.task_priority) ? stored.task_priority : base.task_priority,
  };
}

/** Session key scoped by module + event (same pattern as `events-view-filter-dropdown-${moduleType}`). */
export function eventTasksFilterStorageKey(eventName, moduleType = 'spotlight') {
  const name = String(eventName ?? '').trim();
  if (!name) return null;
  const mod = String(moduleType ?? 'spotlight').trim() || 'spotlight';
  return `event-tasks-view-filter-dropdown-${mod}-${name}`;
}

// Legacy generic options (used by filters/other UIs)
export const EVENT_CATEGORY_OPTIONS = [
  { label: 'Sponsored Event', value: 'Sponsored Event' },
  { label: 'Brand Activation', value: 'Brand Activation' },
  { label: 'Corporate Training', value: 'Corporate Training' },
  { label: 'Demo Day', value: 'Demo Day' },
  { label: 'Panel Discussion', value: 'Panel Discussion' },
  { label: 'Knowledge Session', value: 'Knowledge Session' },
  { label: 'Networking Event', value: 'Networking Event' },
  { label: 'Workshop / Training', value: 'Workshop / Training' },
  { label: 'Recruitment Drive', value: 'Recruitment Drive' },
  { label: 'Investor Meet', value: 'Investor Meet' },
  { label: 'Corporate Private Event', value: 'Corporate Private Event' },
  { label: 'Product Launch', value: 'Product Launch' },
  { label: 'Startup Community Event', value: 'Startup Community Event' },
  { label: 'Learning & Personal Development', value: 'Learning & Personal Development' },
  { label: 'Food, Beverage & Nightlife', value: 'Food, Beverage & Nightlife' },
  { label: 'Social Impact & Volunteering', value: 'Social Impact & Volunteering' },
  { label: 'Cultural & Creative Engagement', value: 'Cultural & Creative Engagement' },
  { label: 'Fitness, Wellness & Lifestyle', value: 'Fitness, Wellness & Lifestyle' },
  {
    label: 'Networking & Professional Communities',
    value: 'Networking & Professional Communities',
  },
  { label: 'Brand Promotion Event', value: 'Brand Promotion Event' },
  { label: 'Industry Meetup', value: 'Industry Meetup' },
  { label: 'Private Closed-Door Event', value: 'Private Closed-Door Event' },
  { label: 'Art & Culture Workshop', value: 'Art & Culture Workshop' },
  { label: 'Seminar / Talk', value: 'Seminar / Talk' },
  { label: 'Networking Meetup', value: 'Networking Meetup' },
  { label: 'Startup Pitch', value: 'Startup Pitch' },
  { label: 'Product Demo', value: 'Product Demo' },
  { label: 'Community Engagement Activity', value: 'Community Engagement Activity' },
  { label: 'Fitness / Wellness', value: 'Fitness / Wellness' },
  { label: 'CSR Activity', value: 'CSR Activity' },
  { label: 'Other', value: 'Other' },
];

export const EVENT_ENGAGEMENT_MODE_OPTIONS = [
  { label: 'Physical', value: 'Physical' },
  { label: 'Virtual', value: 'Virtual' },
  { label: 'Hybrid', value: 'Hybrid' },
];

/**
 * Canonical `revenue_mode` values (single backend field for all event types).
 * Keep spotlight / hosted / list filters in sync with this list.
 */
export const EVENT_REVENUE_MODEL_CANONICAL_OPTIONS = [
  { label: 'Space Rental (Paid)', value: 'Space Rental (Paid)' },
  { label: 'Revenue Share Model', value: 'Revenue Share Model' },
  { label: 'Space Barter', value: 'Space Barter' },
  { label: 'Social Media Barter', value: 'Social Media Barter' },
  { label: 'Community Access Barter', value: 'Community Access Barter' },
  { label: 'Sponsorship-Based', value: 'Sponsorship-Based' },
  { label: 'Brand Collaboration', value: 'Brand Collaboration' },
  { label: 'Brand Activation Collaboration', value: 'Brand Activation Collaboration' },
  { label: 'Complimentary (No Revenue)', value: 'Complimentary (No Revenue)' },
  { label: 'Ticketed Event (Partner Managed)', value: 'Ticketed Event (Partner Managed)' },
  { label: 'Ticketed Event (DevX Managed)', value: 'Ticketed Event (DevX Managed)' },
];

export const EVENT_REVENUE_MODEL_CANONICAL_VALUES = EVENT_REVENUE_MODEL_CANONICAL_OPTIONS.map(
  (o) => o.value,
);

/** Older UI / stored strings → canonical value for selects and display. */
export const LEGACY_EVENT_REVENUE_MODE_TO_CANONICAL = {
  'Revenue Share': 'Revenue Share Model',
  Complimentary: 'Complimentary (No Revenue)',
  Free: 'Complimentary (No Revenue)',
};

/**
 * Normalize API/local `revenue_mode` for UI (select match + consistent labels).
 * Unknown values are returned unchanged.
 */
export function normalizeEventRevenueModeValue(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (Object.prototype.hasOwnProperty.call(LEGACY_EVENT_REVENUE_MODE_TO_CANONICAL, s)) {
    return LEGACY_EVENT_REVENUE_MODE_TO_CANONICAL[s];
  }
  const lower = s.toLowerCase();
  for (const [legacy, canonical] of Object.entries(LEGACY_EVENT_REVENUE_MODE_TO_CANONICAL)) {
    if (legacy.toLowerCase() === lower) return canonical;
  }
  const caseMatch = EVENT_REVENUE_MODEL_CANONICAL_VALUES.find((v) => v.toLowerCase() === lower);
  return caseMatch ?? s;
}

/** Listing filters — same values as backend `revenue_mode`. */
export const EVENT_REVENUE_MODE_OPTIONS = EVENT_REVENUE_MODEL_CANONICAL_OPTIONS;

export const EVENT_STATUS_OPTIONS = [
  { label: 'Exploration', value: 'Exploration' },
  { label: 'Proposed to HO', value: 'Proposed to HO' },
  { label: 'Approved by HO', value: 'Approved by HO' },
  { label: 'Planned', value: 'Planned' },
  { label: 'Executed', value: 'Executed' },
  { label: 'Rejected by HO', value: 'Rejected by HO' },
];

// Spotlight Events (Internal) – create form options (as per finalized fields)
export const SPOTLIGHT_EVENT_CATEGORY_OPTIONS = [
  { label: 'Art & Culture', value: 'Art & Culture Workshop' },
  { label: 'Workshop / Training', value: 'Workshop / Training' },
  { label: 'Seminar / Talk', value: 'Seminar / Talk' },
  { label: 'Networking Meetup', value: 'Networking Meetup' },
  { label: 'Startup Pitch', value: 'Startup Pitch' },
  { label: 'Product Demo', value: 'Product Demo' },
  { label: 'Community Engagement Activity', value: 'Community Engagement Activity' },
  { label: 'Fitness / Wellness', value: 'Fitness / Wellness' },
  { label: 'CSR Activity', value: 'CSR Activity' },
  { label: 'Brand Activation', value: 'Brand Activation' },
  { label: 'Panel Discussion', value: 'Panel Discussion' },
  { label: 'Knowledge Session', value: 'Knowledge Session' },
  { label: 'Other', value: 'Other' },
];

export const SPOTLIGHT_EVENT_REVENUE_MODE_OPTIONS = EVENT_REVENUE_MODEL_CANONICAL_OPTIONS;

export const SPOTLIGHT_EVENT_FACILITY_OPTIONS = [
  { label: 'Projector', value: 'Projector' },
  { label: 'LED Screen', value: 'LED Screen' },
  { label: 'Sound System', value: 'Sound System' },
  { label: 'Microphone (Corded)', value: 'Microphone (Corded)' },
  { label: 'Microphone (Wireless)', value: 'Microphone (Wireless)' },
  { label: 'Podium', value: 'Podium' },
  { label: 'Stage Setup', value: 'Stage Setup' },
  { label: 'Extra Chairs', value: 'Extra Chairs' },
  { label: 'High Tables', value: 'High Tables' },
  { label: 'Tea & Coffee', value: 'Tea & Coffee' },
  { label: 'Catering Support', value: 'Catering Support' },
  { label: 'Water Bottles', value: 'Water Bottles' },
  { label: 'Registration Desk', value: 'Registration Desk' },
  { label: 'Branding Standee Space', value: 'Branding Standee Space' },
  { label: 'WiFi Access', value: 'WiFi Access' },
  { label: 'Extension Boards', value: 'Extension Boards' },
  { label: 'Photography Support', value: 'Photography Support' },
  { label: 'Videography Support', value: 'Videography Support' },
  { label: 'Security Support', value: 'Security Support' },
  { label: 'Housekeeping Support', value: 'Housekeeping Support' },
  { label: 'Parking Arrangement', value: 'Parking Arrangement' },
];

// Hosted Events (Internal Ops Form) – create/detail options (as per finalized fields)
export const HOSTED_EVENT_CATEGORY_OPTIONS = [
  { label: 'Startup Community Event', value: 'Startup Community Event' },
  { label: 'Corporate Private Event', value: 'Corporate Private Event' },
  { label: 'Product Launch', value: 'Product Launch' },
  { label: 'Brand Promotion Event', value: 'Brand Promotion Event' },
  { label: 'Investor Meet', value: 'Investor Meet' },
  { label: 'Recruitment Drive', value: 'Recruitment Drive' },
  { label: 'Workshop / Training', value: 'Workshop / Training' },
  { label: 'Industry Meetup', value: 'Industry Meetup' },
  { label: 'Networking Event', value: 'Networking Event' },
  { label: 'Knowledge Session', value: 'Knowledge Session' },
  { label: 'Panel Discussion', value: 'Panel Discussion' },
  { label: 'Private Closed-Door Event', value: 'Private Closed-Door Event' },
  { label: 'Brand Activation', value: 'Brand Activation' },
  { label: 'Sponsored Event', value: 'Sponsored Event' },
  { label: 'Other', value: 'Other' },
];

export const HOSTED_EVENT_REVENUE_MODE_OPTIONS = EVENT_REVENUE_MODEL_CANONICAL_OPTIONS;

/** @deprecated Use SPOTLIGHT_* exports — kept for any lingering imports. */
export const MICRO_EVENT_CATEGORY_OPTIONS = SPOTLIGHT_EVENT_CATEGORY_OPTIONS;
export const MICRO_EVENT_REVENUE_MODE_OPTIONS = SPOTLIGHT_EVENT_REVENUE_MODE_OPTIONS;
export const MICRO_EVENT_FACILITY_OPTIONS = SPOTLIGHT_EVENT_FACILITY_OPTIONS;
/** @deprecated Use HOSTED_* exports — kept for any lingering imports. */
export const EXTERNAL_EVENT_CATEGORY_OPTIONS = HOSTED_EVENT_CATEGORY_OPTIONS;
export const EXTERNAL_EVENT_REVENUE_MODE_OPTIONS = HOSTED_EVENT_REVENUE_MODE_OPTIONS;

/** Community Events only — listing filters, create form, and basic details status select. */
export const COMMUNITY_EVENT_STATUS_OPTIONS = [
  { label: 'Draft', value: 'Draft' },
  { label: 'Open For Registration', value: 'Open For Registration' },
  { label: 'Registration Closed', value: 'Registration Closed' },
  { label: 'Ongoing', value: 'Ongoing' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Cancelled', value: 'Cancelled' },
  { label: 'Planned', value: 'Planned' },
];

/** Community Events — status tabs on list page (values align with `status_counts` key normalization). */
export const COMMUNITY_EVENT_STATUS_TAB_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'open_for_registration', label: 'Open for Registration' },
  { value: 'registration_closed', label: 'Registration Closed' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'planned', label: 'Planned' },
];

export const COMMUNITY_EVENT_STATUS_TAB_TO_FILTER_VALUES = {
  all: [],
  draft: ['Draft'],
  // Must match DocType / Status Config label casing (`Open For Registration`).
  open_for_registration: ['Open For Registration'],
  registration_closed: ['Registration Closed'],
  ongoing: ['Ongoing'],
  completed: ['Completed'],
  cancelled: ['Cancelled'],
  planned: ['Planned'],
};

/**
 * `event_type` values sent to Events list/create APIs (must match backend Select options).
 *
 * Backend coordination: the Frappe Select options and existing rows were migrated from
 * "Micro Events" / "External Events" to "Spotlight Events" / "Hosted Events" by the
 * `rename_event_types_spotlight_hosted` patch (patches.txt, post_model_sync). These
 * strings are therefore valid on any env that has run migrations.
 */
export const EVENT_TYPE_API_VALUE = {
  spotlight: 'Spotlight Events',
  community: 'Community Events',
  hosted: 'Hosted Events',
  /** @deprecated Use `spotlight` / `hosted`. */
  micro: 'Spotlight Events',
  external: 'Hosted Events',
};

/** Page size for events list infinite scroll / pagination */
export const EVENTS_LIST_PAGE_SIZE = 20;

/** Events list route: titles and descriptions per module */
export const EVENTS_PAGE_CONFIG = {
  spotlight: {
    pageTitle: 'Spotlight Events',
    pageDescription: 'Manage and view all spotlight events',
  },
  community: {
    pageTitle: 'Community Events',
    pageDescription: 'Manage and view all community events',
  },
  hosted: {
    pageTitle: 'Hosted Events',
    pageDescription: 'Manage and view all hosted events',
  },
};

/** Micro / external status tabs → `get_event_type_list` status filter values (toolbar sync). */
export const STATUS_TAB_TO_FILTER_VALUES = {
  all: [],
  exploration: ['Exploration'],
  proposed_to_ho: ['Proposed to HO'],
  approved_by_ho: ['Approved by HO'],
  planned: ['Planned'],
  executed: ['Executed'],
  rejected_by_ho: ['Rejected by HO'],
};

export const EVENT_TAB_OPTIONS = [
  {
    value: 'basic-details',
    label: 'Basic Details',
    icon: RiInformationLine,
    activeIcon: RiInformationFill,
  },
  {
    value: 'event-details',
    label: 'Event Details',
    icon: RiFileList2Line,
    activeIcon: RiFileList2Fill,
  },
  { value: 'participants', label: 'Participants', icon: RiGroupLine, activeIcon: RiGroupFill },
  { value: 'event-tasks', label: 'Event Tasks', icon: RiTodoLine, activeIcon: RiTodoFill },
  {
    value: 'public-page-details',
    label: 'Public Page Details',
    icon: RiCalendarEventLine,
    activeIcon: RiCalendarEventFill,
  },
  {
    value: 'activities',
    label: 'Activities',
    icon: RiCalendarTodoLine,
    activeIcon: RiCalendarTodoFill,
  },
];
/**
 * RBAC module name passed to `hasModulePermission` for event detail tabs.
 * Product requirement: use **Events** for spotlight, hosted, and community (not per-subtype names).
 * List/create APIs still use distinct `EVENT_TYPE_API_VALUE` for `event_type`.
 */
export const EVENT_DETAIL_TAB_READ_MODULE_NAME = 'Events';

const EVENT_DETAIL_TAB_READ_MODULES_SHARED = Object.freeze(
  Object.fromEntries(EVENT_TAB_OPTIONS.map((t) => [t.value, EVENT_DETAIL_TAB_READ_MODULE_NAME])),
);

export const EVENT_DETAIL_TAB_READ_MODULE_BY_MODULE = Object.freeze({
  spotlight: EVENT_DETAIL_TAB_READ_MODULES_SHARED,
  community: EVENT_DETAIL_TAB_READ_MODULES_SHARED,
  hosted: EVENT_DETAIL_TAB_READ_MODULES_SHARED,
});

export const getEventDetailTabReadModuleMap = (moduleType) =>
  EVENT_DETAIL_TAB_READ_MODULE_BY_MODULE[moduleType] ??
  EVENT_DETAIL_TAB_READ_MODULE_BY_MODULE.spotlight;

export const PARTICIPANTS_COLUMN_IDS = {
  list: 'community-event-participants-list-v1',
  groupCenter: 'community-event-participants-group-center-v1',
  groupClient: 'community-event-participants-group-client-v1',
};

export const PARTICIPANTS_LIST_PAGE_SIZE = 20;

/** Row-key / edit context when not using a grouped header (list view). */
export const PARTICIPANTS_FLAT_GROUP_CONTEXT = '__flat__';

export const PARTICIPANTS_GROUP_BY_OPTIONS = ['Center', 'Client'];

export const PARTICIPANT_NAME_TRUNCATE_LIMIT = 35;

export const PARTICIPANTS_FILTER_TAB_CONFIG = [
  { value: FILTER_TABS.CENTER, label: 'Center' },
  { value: FILTER_TABS.CLIENT, label: 'Client' },
];

export const PARTICIPANTS_LIST_COLUMNS = [
  { id: 'center_name', label: 'Center', visible: true },
  { id: 'client_name', label: 'Client', visible: true },
  { id: 'no_of_seats', label: 'No of Seats', visible: true },
  { id: 'expected_seats', label: 'Expected seats', visible: true },
  { id: 'participants_pct', label: 'Participants %', visible: true },
  { id: 'remarks', label: 'Remarks', visible: true },
];

export const PARTICIPANTS_GROUP_CENTER_COLUMNS = [
  { id: 'client_name', label: 'Client', visible: true },
  { id: 'no_of_seats', label: 'No of Seats', visible: true },
  { id: 'expected_seats', label: 'Expected seats', visible: true },
  { id: 'participants_pct', label: 'Participants %', visible: true },
  { id: 'remarks', label: 'Remarks', visible: true },
];

export const PARTICIPANTS_GROUP_CLIENT_COLUMNS = [
  { id: 'center_name', label: 'Center', visible: true },
  { id: 'no_of_seats', label: 'No of Seats', visible: true },
  { id: 'expected_seats', label: 'Expected seats', visible: true },
  { id: 'participants_pct', label: 'Participants %', visible: true },
  { id: 'remarks', label: 'Remarks', visible: true },
];

export const PARTICIPANT_COLUMN_WIDTH_CLASS = {
  center_name: 'w-[260px]',
  client_name: 'w-[260px]',
  no_of_seats: 'w-[140px]',
  expected_seats: 'w-[160px]',
  participants_pct: 'w-[150px]',
  remarks: 'w-[320px]',
};

export const PARTICIPANTS_GROUP_STATS_CARDS = [
  {
    key: 'no_of_clients',
    label: 'NO. OF CLIENTS',
    icon: RiTeamLine,
    styles: {
      gradient: 'from-[#cac2ff] to-[#eeebff]',
      text: 'text-[#2b1664]',
      icon: 'text-[#5A36BF]',
    },
  },
  {
    key: 'total_participants_seats',
    label: 'TOTAL PARTICIPANTS',
    icon: RiStackLine,
    styles: {
      gradient: 'from-[#fbedb1] to-[#fef7ec]',
      text: 'text-[#693d11]',
      icon: 'text-[#B47818]',
    },
  },
  {
    key: 'total_expected',
    label: 'TOTAL EXPECTED',
    icon: RiLineChartLine,
    styles: {
      gradient: 'from-[#c2d6ff] to-[#ebf1ff]',
      text: 'text-[#162664]',
      icon: 'text-[#253EA7]',
    },
  },
  {
    key: 'total_participants_pct',
    label: 'TOTAL PARTICIPANTS %',
    icon: RiPercentLine,
    styles: {
      gradient: 'from-[#f9c2ff] to-[#fdebff]',
      text: 'text-[#620f6c]',
      icon: 'text-[#9C23A9]',
    },
  },
];

export const EVENT_CENTER_NAME_MAX = 20;
/** Event detail fields gated to the document owner (centers / clients). */
export const EVENT_CENTER_CLIENT_FIELD_NAMES = new Set([
  'all_centers',
  'centre_name',
  'center',
  'all_clients',
  'clients',
  'clients_applicable',
]);
