/**
 * CRM Task Master — tab-specific column configs (id + label).
 * Kept separate so Account, Contact, and Lead columns can change independently in future.
 */

/** Default column widths (px) for CRM task table. No ellipsis: every header label + sort icon fits (padding ~48px). Only overrides are stored in localStorage. */
export const DEFAULT_CRM_COLUMN_WIDTHS = {
  task: 220,
  department: 180,
  type: 130,
  tags: 110,
  priority: 130,
  status: 165,
  duration: 135,
  pipeline: 150,
  trigger_type: 200,
  drop_reason: 220,
  lifecycle_stage: 160,
  lifecycle_stage_status: 210,
};

export const CRM_ACCOUNT_COLUMN_DEFS = [
  { id: 'task', label: 'Task', visible: true },
  { id: 'department', label: 'Department', visible: true },
  { id: 'type', label: 'Type', visible: true },
  { id: 'tags', label: 'Tags', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'duration', label: 'Duration', visible: true },
];

export const CRM_CONTACT_COLUMN_DEFS = [
  { id: 'task', label: 'Task', visible: true },
  { id: 'department', label: 'Department', visible: true },
  { id: 'type', label: 'Type', visible: true },
  { id: 'tags', label: 'Tags', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'duration', label: 'Duration', visible: true },
  { id: 'trigger_type', label: 'Trigger Type', visible: true },
  { id: 'drop_reason', label: 'Drop Reason', visible: true },
  { id: 'pipeline', label: 'Pipeline', visible: true },
  { id: 'lifecycle_stage', label: 'Lifecycle Stage', visible: true },
  { id: 'lifecycle_stage_status', label: 'Lifecycle Stage Status', visible: true },
];

export const CRM_LEAD_COLUMN_DEFS = [
  { id: 'task', label: 'Task', visible: true },
  { id: 'department', label: 'Department', visible: true },
  { id: 'type', label: 'Type', visible: true },
  { id: 'tags', label: 'Tags', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'duration', label: 'Duration', visible: true },
  { id: 'trigger_type', label: 'Trigger Type', visible: true },
  { id: 'drop_reason', label: 'Drop Reason', visible: true },
  { id: 'pipeline', label: 'Pipeline', visible: true },
  { id: 'lifecycle_stage', label: 'Lifecycle Stage', visible: true },
  { id: 'lifecycle_stage_status', label: 'Lifecycle Stage Status', visible: true },
];

export const getCrmColumnDefsForTab = (tabId) => {
  if (tabId === 'account' || tabId === 'cp_account' || tabId === 'cp_contact')
    return CRM_ACCOUNT_COLUMN_DEFS;
  if (tabId === 'contact') return CRM_CONTACT_COLUMN_DEFS;
  if (tabId === 'lead') return CRM_LEAD_COLUMN_DEFS;
  return CRM_ACCOUNT_COLUMN_DEFS;
};
