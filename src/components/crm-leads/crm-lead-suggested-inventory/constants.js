export const REACT_TABLE_ID_LEAD_SUGGESTED_INVENTORY = 'crm-lead-suggested-inventory';

export const SUGGESTED_INVENTORY_COLUMN_DEFS = [
  { id: 'select', label: '', visible: true, enableHiding: false, size: 52 },
  { id: 'center', label: 'Center', visible: true, enableHiding: false, size: 260 },
  { id: 'space_type', label: 'Space Type', visible: true, size: 150 },
  { id: 'space_name', label: 'Space Name', visible: true, size: 220 },
  { id: 'match', label: 'Match', visible: true, size: 110 },
  { id: 'floor', label: 'Floor', visible: true, size: 180 },
  { id: 'status', label: 'Status', visible: true, size: 130 },
  { id: 'lead_req', label: 'Lead Req.', visible: true, size: 130 },
  { id: 'avail_seats', label: 'Avail. Seats', visible: true, size: 130 },
  { id: 'seat_diff', label: 'Seat Diff', visible: true, size: 120 },
  { id: 'rate_per_seat', label: 'Rate/Seat', visible: true, size: 120 },
  { id: 'est_monthly', label: 'Est. Monthly', visible: true, size: 160 },
  { id: 'actions', label: '', visible: true, enableHiding: false, size: 80 },
];

export const SORTABLE_COLUMN_IDS = new Set([
  'center',
  'space_type',
  'match',
  'floor',
  'status',
  'lead_req',
  'avail_seats',
  'seat_diff',
  'rate_per_seat',
  'est_monthly',
]);

export const EMPTY_STATES = {
  default: {
    title: 'No available inventory found',
    description: 'Try adding spaces manually or update lead city, product, and seat count.',
  },
  search: {
    title: 'No spaces match your search',
    description: 'Try a different search term.',
  },
};

export const INVENTORY_TYPE_OPTIONS = [
  { value: 'Co-working Space', label: 'Co-working Space' },
  { value: 'Managed Office', label: 'Managed Office' },
  { value: 'Resource', label: 'Resource' },
];

export const CREATE_PROPOSAL_LABEL = 'Create Proposal';
export const ADD_MORE_SPACES_LABEL = 'Add More Spaces';
