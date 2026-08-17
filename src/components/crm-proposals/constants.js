export const GLOBAL_PROPOSAL_FILTER_ALL = 'all';

export const DEFAULT_GLOBAL_PROPOSAL_FILTERS = {
  pipeline: GLOBAL_PROPOSAL_FILTER_ALL,
  lifecycle_stage: GLOBAL_PROPOSAL_FILTER_ALL,
  status: GLOBAL_PROPOSAL_FILTER_ALL,
};

export const PROPOSAL_STATUS_FILTER_OPTIONS = [
  { value: GLOBAL_PROPOSAL_FILTER_ALL, label: 'All Status' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Sent', label: 'Sent' },
  { value: 'Accepted', label: 'Accepted' },
  { value: 'Rejected', label: 'Rejected' },
];

export const GLOBAL_PROPOSAL_SEARCH_PLACEHOLDER =
  'Search by proposal name, lead, contact, account, etc.';

export const LEAD_PROPOSAL_SEARCH_PLACEHOLDER = 'Search by proposal name';

export const REACT_TABLE_ID_PROPOSALS = 'crm-proposals-table';
export const REACT_TABLE_ID_LEAD_PROPOSALS = 'crm-proposals-table-lead-detail';

/** Stable empty array for default hideColumns prop (avoids column-config effect loops). */
export const EMPTY_PROPOSAL_HIDE_COLUMNS = Object.freeze([]);

export const PROPOSAL_COLUMN_STORAGE_KEY = 'crm-proposals-column-widths';
export const PROPOSAL_RESIZE_ENABLED_KEY = 'crm-proposals-resize-enabled';

export const PROPOSAL_GROUP_BY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'validity_status', label: 'Status' },
  { value: 'proposal_date', label: 'Proposal Date' },
  { value: 'valid_till', label: 'Valid Till' },
];

export const GLOBAL_PROPOSAL_GROUP_BY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'status', label: 'Status' },
  { value: 'pipeline_label', label: 'Pipeline' },
  { value: 'lifecycle_stage_label', label: 'Life Cycle Stage' },
  { value: 'life_cycle_stage_status_label', label: 'Life Cycle Stage Status' },
  { value: 'account_name', label: 'Account' },
  { value: 'sales_owner_name', label: 'Sales Owner' },
];

/** Figma node 32320:1690229 — lead detail → Proposals tab */
export const DEFAULT_LEAD_DETAIL_PROPOSAL_COLUMN_WIDTHS = {
  proposal: 280,
  suggested_inventory: 360,
  proposal_amount: 184,
  proposal_date: 151,
  valid_till: 128,
  validity_status: 105,
};

export const DEFAULT_PROPOSAL_COLUMN_WIDTHS = {
  proposal: 280,
  format_label: 120,
  lead_req_seats: 150,
  spaces: 240,
  proposal_template: 160,
  status: 120,
  proposal_date: 130,
  valid_till: 130,
  color_theme: 120,
  account: 160,
  modified: 180,
  creation: 140,
  actions: 56,
};

/** Figma-aligned widths for global /crm/proposals list */
export const DEFAULT_GLOBAL_PROPOSAL_COLUMN_WIDTHS = {
  proposal: 280,
  lead_name: 207,
  contact_name: 180,
  account_name: 148,
  pipeline_label: 156,
  lifecycle_stage_label: 160,
  life_cycle_stage_status_label: 190,
  sales_owner_name: 193,
  proposal_amount: 184,
  proposal_date: 151,
  valid_till: 128,
  status: 105,
  actions: 56,
};

export const PROPOSAL_COLUMN_MIN_WIDTH = 120;
export const PROPOSAL_COLUMN_MAX_WIDTH = 480;

export const PROPOSAL_EMPTY_STATES = {
  default: {
    title: 'No proposals yet',
    description: 'Create a proposal from a lead’s Suggested Inventory tab.',
  },
  lead: {
    title: 'No proposals for this lead',
    description: 'Go to Suggested Inventory and use Create Proposal to start a deck for this lead.',
  },
};

export function getProposalStatusBadge(status) {
  const normalized = String(status || 'Draft')
    .trim()
    .toLowerCase();
  if (normalized === 'draft') return { label: 'Draft', color: 'gray' };
  if (normalized === 'sent') return { label: 'Sent', color: 'blue' };
  if (normalized === 'accepted') return { label: 'Accepted', color: 'green' };
  if (normalized === 'rejected') return { label: 'Rejected', color: 'red' };
  return { label: status || 'Draft', color: 'gray' };
}

/** Active / Expired validity badge for lead detail proposals (Figma). */
export function getProposalValidityStatusBadge(status) {
  const normalized = String(status || 'Active')
    .trim()
    .toLowerCase();
  if (normalized === 'expired') return { label: 'EXPIRED', color: 'red' };
  return { label: 'ACTIVE', color: 'green' };
}

export function deriveProposalValidityStatus(validTill) {
  if (!validTill) return 'Active';
  const end = new Date(String(validTill));
  if (Number.isNaN(end.getTime())) return 'Active';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return end < today ? 'Expired' : 'Active';
}

export function getProposalFormatLabel(format) {
  return format === 'multi' ? 'Multipage' : 'Single Page';
}

export const PROPOSAL_COLUMN_DEFS = [
  { id: 'proposal', label: 'Proposal', visible: true, enableHiding: false },
  { id: 'format_label', label: 'Format', visible: true },
  { id: 'lead_req_seats', label: 'Seats Required', visible: true },
  { id: 'spaces', label: 'Spaces', visible: true },
  { id: 'proposal_template', label: 'Template', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'proposal_date', label: 'Proposal Date', visible: false },
  { id: 'valid_till', label: 'Valid Till', visible: false },
  { id: 'color_theme', label: 'Theme', visible: false },
  { id: 'account', label: 'Account', visible: false },
  { id: 'modified', label: 'Modified', visible: true },
  { id: 'creation', label: 'Created', visible: false },
  { id: 'actions', label: 'Actions', visible: true, enableHiding: false },
];

/** Lead detail → Proposals tab — Figma node 32320:1690229 */
export const LEAD_DETAIL_PROPOSAL_COLUMN_DEFS = [
  { id: 'proposal', label: 'Proposal Name', visible: true, enableHiding: false },
  { id: 'suggested_inventory', label: 'Space proposed', visible: true },
  { id: 'proposal_amount', label: 'Proposal Amount (₹)', visible: true },
  { id: 'proposal_date', label: 'Proposal Date', visible: true },
  { id: 'valid_till', label: 'Valid Till', visible: true },
  { id: 'validity_status', label: 'Status', visible: true },
];

/** Global /crm/proposals page — Figma node 30635:252620 */
export const GLOBAL_PROPOSAL_COLUMN_DEFS = [
  { id: 'proposal', label: 'Name', visible: true, enableHiding: false },
  { id: 'lead_name', label: 'Lead', visible: true },
  { id: 'contact_name', label: 'Contact', visible: true },
  { id: 'account_name', label: 'Account', visible: true },
  { id: 'pipeline_label', label: 'Pipeline', visible: true },
  { id: 'lifecycle_stage_label', label: 'Life Cycle Stage', visible: true },
  { id: 'life_cycle_stage_status_label', label: 'Life Cycle Stage Status', visible: true },
  { id: 'sales_owner_name', label: 'Sales Owner', visible: true },
  { id: 'proposal_amount', label: 'Proposal Amount (₹)', visible: true },
  { id: 'proposal_date', label: 'Proposal Date', visible: true },
  { id: 'valid_till', label: 'Valid Till', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'actions', label: 'Actions', visible: true, enableHiding: false },
];
