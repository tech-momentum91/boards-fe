import { NO_CENTERS_EMPTY_STATE } from '@/utils/global-center-filter';

export const EMPTY_SORTING = [];

/** Matches VMS tablet visitor check-in (`whom_to_meet`). */
export const VISITOR_WHOM_TO_MEET_OPTIONS = [
  { value: 'devx', label: 'DevX' },
  { value: 'client', label: 'Client' },
];

/** Invite drawer — staff configures the visit ahead of check-in. */
export const VISITOR_WHOM_TO_MEET_INVITE_LABEL = 'Who will the visitor meet?';

/**
 * Empty-state copy for VMS tables, indexed by `context`.
 *
 * The page passes `context = 'no_centers'` when the global centre header is
 * explicitly empty so users see the shared "No centers selected" card instead
 * of the generic "No records" copy.
 */
export const VMS_EMPTY_STATES = {
  default: {
    title: 'No records found',
    description: 'Try adjusting filters or invite a new visitor / vendor to get started.',
  },
  search: {
    title: 'No records match these filters',
    description: 'Try adjusting filters or clearing your search.',
  },
  no_centers: { ...NO_CENTERS_EMPTY_STATE },
};

export const TYPE_OF_SPACE_OPTIONS = [
  'Managed Office',
  'Co-working',
  'Manager Cabin',
  'Meeting Room',
  'Confrence Room',
  'Event Space',
  'Day Pass',
  'Managed Space',
  'Coworking Space',
];

export const STATUS_COLOR_MAP = {
  'Checked In': 'green',
  'Checked Out': 'red',
  Pending: 'yellow',
  Invited: 'blue',
  Cancelled: 'red',
};

export const DRAWER_STATUS_COLOR_MAP = {
  'Checked In': 'green',
  'Checked Out': 'gray',
  Invited: 'yellow',
  Pending: 'yellow',
  Cancelled: 'red',
};

export const getStatusColor = (status, map = STATUS_COLOR_MAP) => map[status] || 'gray';

// ─── Status option lists ──────────────────────────────────────────────────────

export const VISITOR_STATUS_OPTIONS = [
  { value: 'Invited', label: 'Invited' },
  { value: 'Checked In', label: 'Checked In' },
  { value: 'Checked Out', label: 'Checked Out' },
  { value: 'Cancelled', label: 'Cancelled' },
];

// ─── Filter dropdown tab definitions ─────────────────────────────────────────

export const VISITOR_FILTER_TABS = [
  { value: 'center', label: 'Center' },
  { value: 'host_company', label: 'Host Company' },
  { value: 'status', label: 'Status' },
];

export const SPACE_FILTER_TABS = [
  { value: 'type_of_space', label: 'Type of Space' },
  { value: 'source_category', label: 'Source' },
  { value: 'partner_type', label: 'Partner Type' },
  { value: 'status', label: 'Status' },
];

export const VENDOR_FILTER_TABS = [
  { value: 'center', label: 'Center' },
  { value: 'vendor_type', label: 'Vendor Type' },
  { value: 'assigned_supervisor', label: 'Assigned Supervisor' },
  { value: 'status', label: 'Status' },
];

// ─── Toolbar: Group-by options ────────────────────────────────────────────────

export const GROUP_BY_OPTIONS_MAP = {
  visitors: [
    { value: 'center', label: 'Center' },
    { value: 'host_company_name', label: 'Host Company' },
    { value: 'status', label: 'Status' },
  ],
  'space-inquiries': [
    { value: 'type_of_space', label: 'Type of Space' },
    { value: 'source_category', label: 'Source' },
    { value: 'center', label: 'Center' },
    { value: 'status', label: 'Status' },
  ],
  vendors: [
    { value: 'center', label: 'Center' },
    { value: 'assigned_supervisor', label: 'Assigned Supervisor' },
    { value: 'vendor_type', label: 'Vendor Type' },
    { value: 'status', label: 'Status' },
  ],
  'event-participants': [
    { value: 'center', label: 'Center' },
    { value: 'status', label: 'Status' },
  ],
};

// ─── Stats display configuration ─────────────────────────────────────────────

import { RiCalendarCheckLine, RiStore2Line, RiBuilding2Line } from 'react-icons/ri';

export const STATS_DISPLAY_CONFIG = {
  total_visitors_today: {
    label: 'TOTAL TODAY',
    icon: RiCalendarCheckLine,
    gradient: 'from-[#fce0c2] to-[#feefe5]',
    textColor: 'text-[#8b1f1f]',
    iconColor: 'text-[#c15d2b]',
  },
  vendor_on_site: {
    label: 'VENDORS ON-SITE',
    icon: RiStore2Line,
    gradient: 'from-[#c8edff] to-[#e5f6ff]',
    textColor: 'text-[#136e97]',
    iconColor: 'text-[#0e7aa6]',
  },
  active_space_inquiry: {
    label: 'ACTIVE SPACE INQUIRIES',
    icon: RiBuilding2Line,
    gradient: 'from-[#b8f1df] to-[#e7f8f1]',
    textColor: 'text-[#0a7c5f]',
    iconColor: 'text-[#0a7c5f]',
  },
};

// Order in which to display stats cards
export const STATS_ORDER = [
  'total_visitors_today',
  'vendor_on_site',
  'active_space_inquiry',
  'active_event_participants',
];
