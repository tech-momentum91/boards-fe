import { TICKET_STATUS_META, TICKET_STATUS_BADGE_VARIANTS } from '@/constants/STATUS_CONSTANTS';

export { ROLE_KEYS, isClient } from '@/constants/users-constants';
export { TICKET_STATUS_META };
export { TICKET_STATUS_BADGE_VARIANTS as STATUS_BADGE_VARIANTS };
import { RiCheckLine, RiPauseCircleLine, RiRecordCircleLine, RiTimeLine } from 'react-icons/ri';

import { NO_CENTERS_EMPTY_STATE } from '@/utils/global-center-filter';

export const ROLE_SCOPE_LABELS = {
  global: 'All centers',
  center: 'Assigned centers',
  organization: 'Organization wide',
  assigned: 'Assigned tickets',
  self: 'Own tickets',
};

export const TICKET_TYPE = {
  'Internal ticket': {
    color: 'gray',
  },
  'Client ticket': {
    color: 'green',
  },
  Incident: {
    color: 'red',
  },
};

export const TITLE_COLUMN_ID = 'title';
export const TITLE_COLUMN_MIN_WIDTH = 220;
export const TITLE_COLUMN_DEFAULT_WIDTH = 280;
export const DEFAULT_TICKET_COLUMN_WIDTH = 160;
export const ACTIONS_COLUMN_WIDTH = 60;

export const getFixedTicketColumnWidth = (columnId, columnDefs = []) => {
  if (columnId === 'actions') return ACTIONS_COLUMN_WIDTH;
  if (columnId === TITLE_COLUMN_ID) return 0;

  const columnDef = columnDefs.find((col) => col.id === columnId);
  return columnDef?.size ?? DEFAULT_TICKET_COLUMN_WIDTH;
};

/**
 * Filter status options by role (e.g. Facility Manager must not see "Closed").
 * Use before passing options to the status dropdown.
 */
export const filterStatusOptionsForUser = (statusOptions = [], isFacilityManager = false) => {
  if (!isFacilityManager) return statusOptions;
  return statusOptions.filter((option) => {
    const optionValue = option.value ?? option;
    const normalized = String(optionValue ?? '').toLowerCase();
    return normalized !== 'closed';
  });
};

/** Get display label for a status value from options. */
export const getStatusLabel = (value, statusOptions = []) => {
  if (!value) return '';
  const option = statusOptions.find(
    (opt) => (opt.value ?? opt)?.toString().toLowerCase() === String(value).toLowerCase(),
  );
  return option?.label ?? option?.value ?? value;
};

/**
 * Meta for ticket `TicketStatusDropdown` / `StatusDropdown` (HD Ticket.status).
 * Color: Status Configuration on the option (`option.color` from `getStatusOptions`) wins;
 * `TICKET_STATUS_META` is fallback when the option has no configured color.
 * Percentage: canonical `TICKET_STATUS_META` when the status name matches, else `option.percentage`.
 */
export const getStatusMetaForOption = (option, statusMetaMap = null) => {
  const value = option?.value ?? option;
  const normalized = value ? String(value).toLowerCase() : '';
  const meta = statusMetaMap?.[normalized];
  const configured =
    option?.color != null && String(option.color).trim() !== ''
      ? String(option.color).trim()
      : null;
  const colorName = configured ?? meta?.color;
  let colorOut = 'gray';
  if (typeof colorName === 'string' && colorName.trim().startsWith('#')) {
    colorOut = colorName.trim();
  } else if (colorName) {
    colorOut = String(colorName).toLowerCase();
  }
  const percentage = meta?.percentage ?? option?.percentage;
  return {
    color: colorOut,
    percentage: percentage == null ? undefined : Math.min(100, Math.max(0, Number(percentage))),
  };
};

// Fallback status options - prefer using dynamic statuses from API
// Dynamic statuses are fetched from HD Ticket Status DocType with color and order
// Note: "Breached" is a special computed status based on SLA, not a real status value
export const STATUS_OPTIONS = [
  { label: 'Open', value: 'Open', color: 'blue', percentage: 20 },
  { label: 'In Progress', value: 'In Progress', color: 'orange', percentage: 40 },
  { label: 'On Hold', value: 'On Hold', color: 'purple', percentage: 60 },
  { label: 'Resolved', value: 'Resolved', color: 'green', percentage: 80 },
  { label: 'Closed', value: 'Closed', color: 'gray', percentage: 100 },
  { label: 'Escalated', value: 'Escalated', color: 'red' },
  { label: 'Breached', value: 'Breached', color: 'red' },
];

/** Quick status chips below the ticket list search bar (matches clients engagement filters). */
export const TICKET_QUICK_STATUS_FILTER_OPTIONS = [
  { value: 'Open', label: 'Open', iconKey: 'open' },
  { value: 'In Progress', label: 'In Progress', iconKey: 'in-progress' },
  { value: 'On Hold', label: 'On Hold', iconKey: 'on-hold' },
  { value: 'Closed', label: 'Closed', iconKey: 'closed' },
];

export const STATUS_FILTER_ICONS = {
  open: RiRecordCircleLine,
  'in-progress': RiTimeLine,
  'on-hold': RiPauseCircleLine,
  closed: RiCheckLine,
};

export const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'Low' },
  { label: 'Medium', value: 'Medium' },
  { label: 'High', value: 'High' },
  { label: 'Urgent', value: 'Urgent' },
];
export const TICKET_TABLE_COLUMNS = [
  { key: 'name', label: 'ID', width: '120px' },
  { key: 'subject', label: 'Title', width: '200px' },
  { key: 'description', label: 'Description', width: '320px' },
  { key: 'status', label: 'Status', width: '140px' },
  { key: 'raised_by', label: 'Client', width: '160px' },
  { key: 'center', label: 'Center', width: '150px' },
  { key: 'priority', label: 'Priority', width: '120px' },
  { key: 'actions', label: '', width: '56px', isAction: true },
];

export const DEFAULT_FILTERS = {
  search: '',
  status: [],
  priority: [],
  center: [],
  zone: [],
  dateRange: null,
  custom_ticket_type: '',
  client: '',
  assignee: '',
  category: '',
  sub_category: '',
  severity: '',
  resolution_time: [],
  custom_center_name: '',
  custom_requires_rm: false,
};

/** Session compaction for ticket list filters (excludes search + client; keeps dateRange when set). */
export const TICKET_VIEW_FILTERS_STORAGE_COMPACT_OPTS = {
  excludeKeys: ['search', 'client'],
  truthyObjectKeys: ['dateRange'],
};

export function mergeStoredTicketViewFilters(stored) {
  const base = { ...DEFAULT_FILTERS };
  if (!stored || typeof stored !== 'object') return base;
  for (const key of Object.keys(DEFAULT_FILTERS)) {
    if (key === 'search' || key === 'client') continue;
    if (stored[key] === undefined) continue;
    base[key] = stored[key];
  }
  base.status = Array.isArray(base.status) ? base.status : [];
  base.priority = Array.isArray(base.priority) ? base.priority : [];
  base.center = Array.isArray(base.center) ? base.center : [];
  base.zone = Array.isArray(base.zone) ? base.zone : [];
  base.resolution_time = Array.isArray(base.resolution_time) ? base.resolution_time : [];
  return base;
}

// Ticket list filter UI (toolbar popover)
export const TICKET_FILTER_TABS = {
  CENTER: 'center',
  ZONE: 'zone',
  STATUS: 'status',
  RESOLUTION_TIME: 'resolution_time',
  ASSIGNEE: 'assignee',
  PRIORITY: 'priority',
  TICKET_TYPE: 'custom_ticket_type',
  CLIENT: 'client',
  CATEGORY: 'category',
  SUB_CATEGORY: 'sub_category',
  SEVERITY: 'severity',
};

export const RESOLUTION_TIME_FILTER_OPTIONS = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Resolved', value: 'Resolved' },
  { label: 'Breached', value: 'Breached' },
];

export const TICKET_FILTER_TAB_CONFIG = [
  { value: TICKET_FILTER_TABS.CENTER, label: 'Center' },
  { value: TICKET_FILTER_TABS.ZONE, label: 'Zone' },
  { value: TICKET_FILTER_TABS.STATUS, label: 'Status' },
  { value: TICKET_FILTER_TABS.RESOLUTION_TIME, label: 'Resolution Time' },
  { value: TICKET_FILTER_TABS.ASSIGNEE, label: 'Assignee' },
  { value: TICKET_FILTER_TABS.PRIORITY, label: 'Priority' },
  { value: TICKET_FILTER_TABS.TICKET_TYPE, label: 'Ticket Type' },
  { value: TICKET_FILTER_TABS.CLIENT, label: 'Client' },
  { value: TICKET_FILTER_TABS.CATEGORY, label: 'Category' },
  { value: TICKET_FILTER_TABS.SUB_CATEGORY, label: 'Sub Category' },
  { value: TICKET_FILTER_TABS.SEVERITY, label: 'Severity' },
];

/** Immutable base keys used to compute the filter badge count. */
export const COUNTABLE_FILTER_KEYS = Object.freeze([
  TICKET_FILTER_TABS.CENTER,
  TICKET_FILTER_TABS.ZONE,
  TICKET_FILTER_TABS.PRIORITY,
  TICKET_FILTER_TABS.TICKET_TYPE,
  TICKET_FILTER_TABS.CLIENT,
  TICKET_FILTER_TABS.CATEGORY,
  TICKET_FILTER_TABS.SUB_CATEGORY,
  TICKET_FILTER_TABS.SEVERITY,
  TICKET_FILTER_TABS.RESOLUTION_TIME,
]);

/** @deprecated Use `COUNTABLE_FILTER_KEYS` / `getCountableFilterKeys` — kept for imports. */
export const countableKeys = COUNTABLE_FILTER_KEYS;

/** Build the key list for filter-count math without mutating shared state. */
export const getCountableFilterKeys = (includeStatus = false) => {
  const keys = [...COUNTABLE_FILTER_KEYS];
  if (includeStatus) keys.push(TICKET_FILTER_TABS.STATUS);
  return keys;
};

/** Non-mutating keys for filter badge counts (optionally includes status on the All tab). */
export function getTicketCountableFilterKeys(includeStatus = false) {
  const keys = includeStatus ? [...countableKeys, TICKET_FILTER_TABS.STATUS] : [...countableKeys];
  return [...new Set(keys)];
}

export const ensureTicketFilterArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
};

export const getDefaultTicketFilterLocalFilters = (filters = {}) => ({
  custom_ticket_type: ensureTicketFilterArray(filters.custom_ticket_type),
  client: ensureTicketFilterArray(filters.client),
  center: ensureTicketFilterArray(filters.center),
  zone: ensureTicketFilterArray(filters.zone),
  status: ensureTicketFilterArray(filters.status),
  resolution_time: ensureTicketFilterArray(filters.resolution_time),
  assignee: ensureTicketFilterArray(filters.assignee),
  priority: ensureTicketFilterArray(filters.priority),
  category: ensureTicketFilterArray(filters.category),
  sub_category: ensureTicketFilterArray(filters.sub_category),
  severity: ensureTicketFilterArray(filters.severity),
});

export const EMPTY_STATES = {
  default: {
    title: 'No tickets yet',
    description: 'Create your first ticket to get started.',
  },
  search: {
    title: 'No tickets match these filters',
    description: 'Try adjusting filters or clearing search.',
  },
  no_centers: NO_CENTERS_EMPTY_STATE,
};

export const getStatusVariant = (status) => {
  if (!status) return 'disabled';

  const normalized = String(status).toLowerCase();

  return TICKET_STATUS_BADGE_VARIANTS[normalized] || 'disabled';
};

// Priority accent colors for ticket ID column
export const PRIORITY_ACCENT_COLORS = {
  low: 'bg-green-500',
  medium: 'bg-purple-500',
  high: 'bg-orange-500',
  critical: 'bg-error-base',
};

// Priority colors for badges and labels
export const PRIORITY_COLORS = {
  low: 'green',
  medium: 'purple',
  high: 'orange',
  critical: 'red',
};

// Field mapping labels for ticket view drawer
export const TICKET_FIELD_LABELS = {
  TICKET_TYPE: 'Ticket Type',
  CATEGORY: 'Category',
  SUB_CATEGORY: 'Sub Category',
  SEVERITY: 'Severity',
  CREATED_AT: 'Created At',
  ASSIGNED_AT: 'Assigned At',
  CENTER: 'Center',
  FLOOR_ZONE: 'Floor / Zone',
  SPACE: 'Space',
  ASSIGN_TO: 'Assign To',
};

/** Frontend key used in forms/local state for ticket layout marker coordinates. */
export const TICKET_MARKER_COORDINATE_FIELD = 'marker_coordinate';

/** HD Ticket doctype field for saved layout marker coordinates. */
export const TICKET_MARKER_COORDINATE_API_FIELD = 'custom_marker_coordinate';

// Unified field mapping for both table and drawer
// Maps frontend field names to backend field names
export const TICKET_FIELD_MAPPING = {
  // Frontend field -> Backend field(s) with fallbacks
  // Column IDs (from ticket-table.jsx)
  ID: ['name'], // Column ID 'ID' maps to backend field 'name'
  title: ['subject'], // Column ID 'title' maps to backend field 'subject'
  // Field names
  ticket_title: ['subject', 'ticket_title'],
  description: ['description'],
  custom_ticket_type: ['custom_ticket_type'],
  status: ['status'],
  category: ['custom_l1'],
  sub_category: ['ticket_type', 'custom_l2'],
  sub_sub_category: ['ticket_type'],
  severity: ['priority'],
  priority: ['custom_priority'], // custom_priority first, then priority as fallback
  center: ['custom_center'],
  custom_center_name: ['custom_center_name'],
  zone: ['zone', 'custom_zone'],
  space: ['custom_space_name'],
  space_name: ['custom_space_name'],
  floor: ['custom_floor', 'floor'],
  floor_zone: ['custom_floor', 'floor', 'floor_zone'],
  marker_coordinate: [TICKET_MARKER_COORDINATE_API_FIELD],
  visible_to_client: ['custom_visible_to_client', 'visible_to_client'],
  due_date: ['custom_due_date', 'due_date'],
  incident_datetime: ['custom_incident_date_time', 'incident_datetime'],
  incident_area: ['custom_area_of_incident', 'incident_area'],
  incident_department: ['custom_incident_department', 'incident_department'],
  incident_type: ['custom_type_of_incident', 'incident_type'],
  incident_severity: ['custom_severity_of_incident', 'incident_severity'],
  incident_sensitivity: ['custom_sensitivity_level', 'incident_sensitivity'],
  incident_reported_via: ['custom_incident_reported_via', 'incident_reported_via'],
  management_informed: ['custom_management_informed', 'management_informed'],
  financial_impact: ['custom_financial_impact', 'financial_impact'],
  incident_data_loss: ['custom_data_or_information_loss', 'incident_data_loss'],
  incident_injuries_damage: ['custom_injuries_or_damage_occurred', 'incident_injuries_damage'],
  incident_corrective_action: ['custom_corrective_action_taken', 'incident_corrective_action'],
  incident_root_cause_analysis: ['custom_root_cause_analysis', 'incident_root_cause_analysis'],
  incident_preventive_action: ['custom_preventive_action_proposed', 'incident_preventive_action'],
  incident_closure_remarks: ['custom_closure_remarks', 'incident_closure_remarks'],
  requires_rm: ['custom_requires_rm'],
  rm_impact: ['custom_rm_impact'],
  related_ticket: ['custom_related_depended_ticket'],
  raised_by: ['raised_by'],
  issue_raised_by: ['raised_by'], // back-compat alias → standard raised_by email
  center_spoc: ['custom_center_spoc'],
  client_spoc: ['custom_client_spoc'],
  customer: ['customer', 'custom_customer_name'],
  assignee: ['_assign'],
  updated_datetime: ['modified'],
  resolution_time: ['resolution_time'],
  spoc: ['spoc'],
};

// Helper function to get ticket field value using unified mapping
// Works for both listing (transformed) and detail (raw) data
export const getTicketFieldValue = (ticket, fieldName) => {
  if (!ticket) return null;

  // Handle special cases first
  switch (fieldName) {
    case 'assigned_to':
      // Prefer assignees array from API (contains full_name and user_image)
      if (ticket.assignees && Array.isArray(ticket.assignees) && ticket.assignees.length > 0) {
        return ticket.assignees;
      }

      {
        // Check assigned_to first, then _assign, then agent (matching table logic)
        let assignee = ticket.assigned_to;

        // If assigned_to is not available, try to parse _assign
        if (!assignee && ticket._assign) {
          try {
            const parsed =
              typeof ticket._assign === 'string' ? JSON.parse(ticket._assign) : ticket._assign;
            if (Array.isArray(parsed) && parsed.length > 0) {
              assignee = parsed;
            }
          } catch {
            // If parsing fails, fall back to agent
            assignee = ticket.agent;
          }
        }

        // Final fallback to agent
        if (!assignee) {
          assignee = ticket.agent;
        }

        return assignee || null;
      }

    case 'created_datetime':
      return ticket.created_datetime || ticket.creation || null;

    case 'assigned_datetime':
      return ticket.assigned_datetime || null;

    default: {
      // Use field mapping if available
      const fieldMapping = TICKET_FIELD_MAPPING[fieldName];
      if (fieldMapping) {
        // ALWAYS check mapped fields FIRST (for raw API data)
        // This ensures we get the correct value from custom_* fields
        for (const mappedField of fieldMapping) {
          const value = ticket[mappedField];
          if (value !== undefined && value !== null && value !== '') {
            return value;
          }
        }
        // Only check the original field name if ALL mapping fields are empty/null/undefined
        // This is for transformed data that already has the frontend field name
        const originalValue = ticket[fieldName];
        if (originalValue !== undefined && originalValue !== null && originalValue !== '') {
          return originalValue;
        }
        return null;
      }

      // Fallback to direct field access
      return ticket[fieldName] || null;
    }
  }
};

export const TICKET_DOCTYPE = 'HD TICKET';
