/**
 * Shared CRM Task module constants.
 * Used by Contact, Account, and Lead detail pages.
 */

export const TASK_COLUMN_MIN_WIDTH = 100;
export const TASK_COLUMN_MAX_WIDTH = 600;

export const getTasksStorageKey = (entityType) => `crm-${entityType}-tasks-column-widths`;
export const getTasksResizeEnabledKey = (entityType) => `crm-${entityType}-tasks-resize-enabled`;
export const getTasksFilterStorageKey = (entityType, entityId) =>
  `crm-detail-tasks-filter-${entityType}-${entityId}`;

export const DEFAULT_TASK_COLUMN_WIDTHS = {
  task: 350,
  assignee: 120,
  type: 120,
  trigger_type: 200,
  pipeline: 140,
  lifecycle_stage: 150,
  lifecycle_stage_status: 160,
  drop_reason: 180,
  due_date: 120,
  tags: 230,
  priority: 140,
  status: 180,
  description: 350,
  attachments: 150,
  created_by: 200,
  created_at: 200,
  last_updated: 200,
};

/** Base columns (without lifecycle) for contact/lead. Account adds lifecycle_stage, lifecycle_stage_status. */
export const TASK_BASE_COLUMN_IDS = [
  'task',
  'assignee',
  'type',
  'due_date',
  'tags',
  'priority',
  'status',
  'description',
  'attachments',
  'created_by',
  'created_at',
  'last_updated',
];

export const TASK_ACCOUNT_EXTRA_COLUMN_IDS = ['lifecycle_stage', 'lifecycle_stage_status'];

export const LIFECYCLE_STAGE_BADGE_MAP = {
  subscriber: { color: 'blue', label: 'Subscriber' },
  lead: { color: 'yellow', label: 'Lead' },
  mql: { color: 'orange', label: 'MQL' },
  sql: { color: 'purple', label: 'SQL' },
  opportunity: { color: 'cyan', label: 'Opportunity' },
  customer: { color: 'green', label: 'Customer' },
  evangelist: { color: 'pink', label: 'Evangelist' },
  other: { color: 'gray', label: 'Other' },
};

/** Lifecycle stage options for Account task view/create drawers. */
export const LIFECYCLE_STAGE_OPTIONS = [
  'Subscriber',
  'Lead',
  'MQL',
  'SQL',
  'Opportunity',
  'Customer',
];

/** Status options for ACL Task inline edit. */
export const TASK_STATUS_OPTIONS = ['Pending', 'Ongoing', 'Completed', 'On Hold'];

/** Shared Pending/Ongoing/Completed/On Hold color map for badges + progress fallbacks. */
export const TASK_STATUS_COLOR_MAP = {
  Pending: 'orange',
  Ongoing: 'blue',
  Completed: 'green',
  'On Hold': 'gray',
};

export function getTaskStatusColor(status, fallback = 'gray') {
  const raw = String(status || '').trim();
  if (!raw) return fallback;
  if (TASK_STATUS_COLOR_MAP[raw]) return TASK_STATUS_COLOR_MAP[raw];
  const lower = raw.toLowerCase();
  const match = Object.entries(TASK_STATUS_COLOR_MAP).find(
    ([label]) => label.toLowerCase() === lower,
  );
  return match?.[1] || fallback;
}

export const FALLBACK_TASK_STATUS_OPTIONS = TASK_STATUS_OPTIONS.map((status) => ({
  value: status,
  label: status,
  color: getTaskStatusColor(status, 'blue'),
}));

/** Priority options for ACL Task inline edit. */
export const TASK_PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];

/** Task list filter sidebar tabs (aligned with `get_acl_task_list` filter payload). */
export const TASK_FILTER_TABS = {
  TYPE: 'type',
  PRIORITY: 'priority',
  STATUS: 'status',
};

export const TASK_FILTER_TAB_CONFIG = [
  { value: TASK_FILTER_TABS.TYPE, label: 'Type' },
  { value: TASK_FILTER_TABS.PRIORITY, label: 'Priority' },
  { value: TASK_FILTER_TABS.STATUS, label: 'Status' },
];

/** Lifecycle status options per stage (for Account tasks). */
export const LIFECYCLE_STATUS_MAP = {
  Subscriber: ['Active', 'Inactive'],
  Lead: ['New', 'In Conversation', 'Lead Drop'],
  MQL: ['MQL Qualified', 'MQL Drop'],
  SQL: ['SQL Qualified', 'SQL Drop'],
  Opportunity: ['Nurturing', 'Closure', 'Opportunity Drop'],
  Customer: ['Active', 'Churned'],
};

// ---------------------------------------------------------------------------
// CRM detail tasks toolbar — filter dropdown persistence helpers
// ---------------------------------------------------------------------------
//
// Mirrors the Clients-module convention: a single `usePersistedFilters` slot
// per (entityType, entityId) stores `{ type, priority, status }`. Compactor
// drops empty buckets so an "all clear" state evicts the slot. Merge helper
// guarantees every key is an array on the read side regardless of what is
// found in sessionStorage.
export const TASK_FILTER_PERSISTED_KEYS = ['type', 'priority', 'status'];

export const DEFAULT_TASK_FILTERS = Object.freeze({
  type: [],
  priority: [],
  status: [],
});

const trimTaskFilterList = (values) => {
  if (!Array.isArray(values)) return [];
  return values.map((v) => String(v).trim()).filter(Boolean);
};

export const mergeStoredTaskFilters = (stored) => {
  const merged = { ...DEFAULT_TASK_FILTERS };
  if (!stored || typeof stored !== 'object') return merged;
  for (const key of TASK_FILTER_PERSISTED_KEYS) {
    if (Array.isArray(stored[key])) merged[key] = trimTaskFilterList(stored[key]);
  }
  return merged;
};

/**
 * Total selected values across every filter bucket. Matches the count
 * computed by `crm-tasks-filter-dropdown` so the badge reads identically
 * whether it's driven by the dropdown (live) or the persisted state (idle).
 */
export const countTaskFilters = (filters) => {
  const merged = mergeStoredTaskFilters(filters);
  return TASK_FILTER_PERSISTED_KEYS.reduce((total, key) => total + (merged[key]?.length || 0), 0);
};
