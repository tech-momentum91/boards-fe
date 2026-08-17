import {
  RiListCheck3,
  RiListCheck,
  RiCalendarLine,
  RiTicketLine,
  RiUserLine,
  RiBuilding4Line,
  RiUserStarLine,
  RiShakeHandsLine,
  RiFileListLine,
  RiBillLine,
} from 'react-icons/ri';

/** URL query `tab` values for /my-task persistence */
export const MY_TASK_URL_TAB = {
  TASK: 'task',
  TASK_INBOX: 'taskInbox',
  TASK_ANALYTICS: 'taskAnalytics',
};

export const MY_TASK_TABS = [
  { value: 'All', label: 'All', icon: RiListCheck3 },
  { value: 'Ticket', label: 'Ticket', icon: RiTicketLine },
  { value: 'Client', label: 'Client', icon: RiUserLine },
  { value: 'Center', label: 'Center', icon: RiBuilding4Line },
  { value: 'CRM', label: 'CRM', icon: RiUserStarLine },
  { value: 'CP', label: 'CP', icon: RiShakeHandsLine },
  { value: 'Agreement', label: 'Agreements', icon: RiFileListLine },
  { value: 'Billing', label: 'Billing', icon: RiBillLine },
];

export const MY_TASK_SUB_TAB_VALUES = MY_TASK_TABS.map((t) => t.value);

export function isValidMyTaskSubTab(value) {
  return typeof value === 'string' && MY_TASK_SUB_TAB_VALUES.includes(value);
}

/**
 * AlignUI `Badge` color for variant="light" — same mapping as CRM account task list
 * (`crm-tasks-table.jsx`) with extra keys for tickets / agreements / client tasks.
 */
export function getTaskStatusBadgeColor(status) {
  if (!status) return 'gray';
  const n = String(status).toLowerCase().trim().replaceAll(/\s+/g, ' ');
  const compact = n.replaceAll(/\s/g, '');

  const map = {
    // CRM ACL (matches crm-tasks-table.jsx read-only badges)
    pending: 'orange',
    ongoing: 'blue',
    completed: 'green',
    'on hold': 'gray',
    onhold: 'gray',
    // Tickets / HD / common
    open: 'blue',
    new: 'sky',
    closed: 'gray',
    resolved: 'green',
    'in progress': 'orange',
    inprogress: 'orange',
    active: 'green',
    inactive: 'gray',
    expired: 'red',
    overdue: 'red',
    done: 'green',
    approved: 'green',
    uploaded: 'teal',
    working: 'blue',
    cancelled: 'gray',
    'not uploaded': 'orange',
    notuploaded: 'orange',
    'not checked': 'gray',
    notchecked: 'gray',
    'not needed': 'gray',
    notneeded: 'gray',
    template: 'gray',
    'pending review': 'yellow',
    pendingreview: 'yellow',
    fullypaid: 'green',
  };

  return map[n] || map[compact] || 'gray';
}

/** Same as CRM account task list priority column (`low`→green, `medium`→orange, `high`/`urgent`→red). */
export function getTaskPriorityBadgeColor(priority) {
  if (!priority) return 'gray';
  const n = String(priority).toLowerCase().trim();
  const compact = n.replaceAll(/\s/g, '');
  const map = {
    low: 'green',
    medium: 'orange',
    high: 'red',
    urgent: 'red',
    critical: 'red',
  };
  return map[n] || map[compact] || 'gray';
}

/** Module badge colours */
export const MODULE_STYLES = {
  CRM: 'bg-purple-100 text-purple-800',
  CP: 'bg-sky-100 text-sky-800',
  Client: 'bg-teal-100 text-teal-800',
  Ticket: 'bg-blue-100 text-blue-800',
  Agreement: 'bg-orange-100 text-orange-800',
  Center: 'bg-green-100 text-green-800',
  Billing: 'bg-yellow-100 text-yellow-800',
};

export const MODULE_STYLE_DEFAULT = 'bg-bg-weak-100 text-text-sub-600';

export function getModuleStyle(module) {
  return MODULE_STYLES[module] ?? MODULE_STYLE_DEFAULT;
}

/** List / Calendar view toggle (My Tasks header). */
export const MY_TASK_VIEW_TABS = [
  { id: 'list', label: 'List', icon: RiListCheck },
  { id: 'calendar', label: 'Calendar', icon: RiCalendarLine },
];

/** Calendar grid weekday headers (matches Client Agreements calendar). */
export const MY_TASK_CALENDAR_WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** Max task chips per day before "+N MORE". */
export const MY_TASK_CALENDAR_MAX_VISIBLE = 2;

/** Max characters for task title in a day cell chip. */
export const MY_TASK_CALENDAR_LABEL_MAX_LENGTH = 22;

/**
 * Calendar toolbar — date fields returned by My Tasks API (no backend changes).
 * - `due_date`: CRM / CP / Client / Ticket tasks
 * - Agreement fields: Agreement module `extra_fields`
 * - `expense_date`: Center OPEX (`period`)
 * - `preboarding_due_date`: Center Preboarding tasks
 */
export const MY_TASK_CALENDAR_DATE_FIELD_OPTIONS = [
  { value: 'due_date', label: 'Due Date' },
  { value: 'agreement_start_date', label: 'Agreement Start Date' },
  { value: 'rent_start_date', label: 'Rent Start Date' },
  { value: 'agreement_end_date', label: 'Agreement End Date' },
  { value: 'lock_in_end_date', label: 'Lock-in End Date' },
  { value: 'increment_date', label: 'Increment Date' },
  { value: 'expense_date', label: 'Expense Date' },
  { value: 'preboarding_due_date', label: 'Pre-boarding Task Due Date' },
];

export const MY_TASK_CALENDAR_DATE_FIELD_COLORS = [
  '#2563EB',
  '#079455',
  '#6E3FF3',
  '#DF1C41',
  '#F17B2C',
  '#E255F2',
  '#0D9488',
  '#0EA5E9',
];

const MY_TASK_CALENDAR_DATE_GRADIENTS = [
  'linear-gradient(180deg, #BFDBFE 0%, #DBEAFE 100%)',
  'linear-gradient(180deg, #D4F7E9 0%, #EFFAF6 100%)',
  'linear-gradient(180deg, #CAC2FF 0%, #EEEBFF 100%)',
  'linear-gradient(180deg, #F9D2DA 0%, #FDEDF0 100%)',
  'linear-gradient(180deg, #FFDAC2 0%, #FEF3EB 100%)',
  'linear-gradient(180deg, #F9C2FF 0%, #FDEBFF 100%)',
  'linear-gradient(180deg, #99F6E4 0%, #CCFBF1 100%)',
  'linear-gradient(180deg, #BAE6FD 0%, #E0F2FE 100%)',
];

/** Calendar chip style per selected date field (matches Agreements calendar pattern). */
export function getCalendarTaskDateTypeStyle(dateType) {
  const idx = MY_TASK_CALENDAR_DATE_FIELD_OPTIONS.findIndex((opt) => opt.value === dateType);
  const safeIdx = idx >= 0 ? idx : 0;
  const accentColor =
    MY_TASK_CALENDAR_DATE_FIELD_COLORS[safeIdx % MY_TASK_CALENDAR_DATE_FIELD_COLORS.length];
  const background =
    MY_TASK_CALENDAR_DATE_GRADIENTS[safeIdx % MY_TASK_CALENDAR_DATE_GRADIENTS.length];
  return { textColor: accentColor, background, accentColor };
}

const MY_TASK_CALENDAR_MODULE_COLORS = {
  CRM: '#6E3FF3',
  CP: '#0EA5E9',
  Client: '#0D9488',
  Ticket: '#2563EB',
  Agreement: '#F17B2C',
  Center: '#079455',
};

const MY_TASK_CALENDAR_MODULE_GRADIENTS = {
  CRM: 'linear-gradient(180deg, #CAC2FF 0%, #EEEBFF 100%)',
  CP: 'linear-gradient(180deg, #BAE6FD 0%, #E0F2FE 100%)',
  Client: 'linear-gradient(180deg, #99F6E4 0%, #CCFBF1 100%)',
  Ticket: 'linear-gradient(180deg, #BFDBFE 0%, #DBEAFE 100%)',
  Agreement: 'linear-gradient(180deg, #FFDAC2 0%, #FEF3EB 100%)',
  Center: 'linear-gradient(180deg, #D4F7E9 0%, #EFFAF6 100%)',
};

const MY_TASK_CALENDAR_DEFAULT_COLOR = '#64748B';
const MY_TASK_CALENDAR_DEFAULT_GRADIENT = 'linear-gradient(180deg, #E2E8F0 0%, #F1F5F9 100%)';

/** Calendar chip colors keyed by task module. */
export function getCalendarTaskModuleStyle(module) {
  const accentColor = MY_TASK_CALENDAR_MODULE_COLORS[module] ?? MY_TASK_CALENDAR_DEFAULT_COLOR;
  const background = MY_TASK_CALENDAR_MODULE_GRADIENTS[module] ?? MY_TASK_CALENDAR_DEFAULT_GRADIENT;
  return { textColor: accentColor, background, accentColor };
}

/** ACL / CP task submodules that use `CrmTaskViewDrawer` (same as CRM detail tasks). */
const CRM_CP_DRAWER_SUBMODULES = new Set([
  'Account',
  'Contact',
  'Lead',
  'CP Account',
  'CP Contact',
]);

// ---------------------------------------------------------------------------
// My Task — per-sub-tab filter dropdown persistence
// ---------------------------------------------------------------------------
//
// Mirrors the Clients / CP / Center conventions: a single sessionStorage slot
// stores the per-tab filter map `{ All: {...}, Ticket: {...}, ... }`. The
// compactor drops empty buckets so an "all clear" state evicts them; the merge
// helper guarantees every sub-tab key is initialised to the canonical
// `{ statuses, priorities, dueDate }` shape on read, and rehydrates the
// `dueDate` range from ISO strings back into Date instances so the toolbar's
// date picker can consume it directly.

export const MY_TASK_FILTERS_STORAGE_KEY = 'my-task-view-filter-dropdown-by-tab';

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const trimStringList = (values) => {
  if (!Array.isArray(values)) return [];
  return values.map((v) => String(v).trim()).filter(Boolean);
};

const serializeMyTaskDueDate = (range) => {
  if (!isPlainObject(range)) return null;
  const toIso = (v) => {
    if (!v) return undefined;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  };
  const from = toIso(range.from);
  const to = toIso(range.to);
  if (!from && !to) return null;
  const out = {};
  if (from) out.from = from;
  if (to) out.to = to;
  return out;
};

const hydrateMyTaskDueDate = (range) => {
  if (!isPlainObject(range)) return null;
  const toDate = (v) => {
    if (!v) return null;
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const from = toDate(range.from);
  const to = toDate(range.to);
  if (!from && !to) return null;
  const out = {};
  if (from) out.from = from;
  if (to) out.to = to;
  return out;
};

const EMPTY_MY_TASK_BUCKET = Object.freeze({ statuses: [], priorities: [], dueDate: null });

const isMyTaskBucketEmpty = (bucket) =>
  !bucket ||
  ((!Array.isArray(bucket.statuses) || bucket.statuses.length === 0) &&
    (!Array.isArray(bucket.priorities) || bucket.priorities.length === 0) &&
    !bucket.dueDate);

export function createDefaultMyTaskFiltersByTab() {
  const initial = {};
  MY_TASK_SUB_TAB_VALUES.forEach((tab) => {
    initial[tab] = { ...EMPTY_MY_TASK_BUCKET };
  });
  return initial;
}

export function compactMyTaskFiltersByTabForStorage(filtersByTab) {
  if (!isPlainObject(filtersByTab)) return {};
  const out = {};
  for (const tab of MY_TASK_SUB_TAB_VALUES) {
    const bucket = filtersByTab[tab];
    if (!isPlainObject(bucket) || isMyTaskBucketEmpty(bucket)) continue;
    const compactBucket = {};
    const statuses = trimStringList(bucket.statuses);
    if (statuses.length > 0) compactBucket.statuses = statuses;
    const priorities = trimStringList(bucket.priorities);
    if (priorities.length > 0) compactBucket.priorities = priorities;
    const dueDate = serializeMyTaskDueDate(bucket.dueDate);
    if (dueDate) compactBucket.dueDate = dueDate;
    if (Object.keys(compactBucket).length > 0) out[tab] = compactBucket;
  }
  return out;
}

export function mergeStoredMyTaskFiltersByTab(stored) {
  const merged = createDefaultMyTaskFiltersByTab();
  if (!isPlainObject(stored)) return merged;
  for (const tab of MY_TASK_SUB_TAB_VALUES) {
    const bucket = stored[tab];
    if (!isPlainObject(bucket)) continue;
    merged[tab] = {
      statuses: trimStringList(bucket.statuses),
      priorities: trimStringList(bucket.priorities),
      dueDate: hydrateMyTaskDueDate(bucket.dueDate),
    };
  }
  return merged;
}

/**
 * Maps a My Tasks API row to which existing "view" drawer to open.
 * Returns `null` when there is no supported drawer for this row.
 */
export function getMyTaskDrawerKind(row) {
  if (!row || typeof row !== 'object') return null;
  const module = row.module;
  const submodule = String(row.submodule || '').trim();

  if (module === 'Ticket') return 'ticket';
  if ((module === 'CRM' || module === 'CP') && CRM_CP_DRAWER_SUBMODULES.has(submodule))
    return 'crm';
  if (
    module === 'Client' &&
    (submodule === 'Client Onboarding' || submodule === 'Client Engagement')
  ) {
    return 'client';
  }
  if (module === 'Agreement') return 'agreement';
  if (module === 'Center' && submodule === 'OPEX') return 'opex';
  if (module === 'Billing' || submodule === 'Client Billing') return 'billing';
  return null;
}
