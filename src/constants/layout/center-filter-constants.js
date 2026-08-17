import { LAYOUT_FILTER_ALL } from '@/constants/layout/filter-sentinel';

export { LAYOUT_FILTER_ALL };

export const LAYOUT_OCCUPANCY_OPTIONS = [
  { value: LAYOUT_FILTER_ALL, label: 'All occupancies' },
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'notice', label: 'Notice' },
  { value: 'locked', label: 'Locked' },
];

/** Canonical inventory types for the space-type filter (labels match design). */
export const LAYOUT_SPACE_TYPE_FILTER_OPTIONS = [
  { value: LAYOUT_FILTER_ALL, label: 'All space type', color: null },
  { value: 'managed office', label: 'Managed office', color: '#9333ea' },
  { value: 'co-working space', label: 'Co-working', color: '#ea580c' },
  { value: 'resource', label: 'Resource', color: '#db2777' },
  { value: 'pure rental', label: 'Pure rental', color: '#2563eb' },
  { value: 'common', label: 'Common Area', color: '#44ACFF' },
];

/** Space-type multiselect options (excludes "All" sentinel). */
export const LAYOUT_SPACE_TYPE_MULTI_SELECT_OPTIONS = LAYOUT_SPACE_TYPE_FILTER_OPTIONS.filter(
  (opt) => opt.value !== LAYOUT_FILTER_ALL,
);

/** UI occupancy bucket → API `filters.status` label. */
export const LAYOUT_OCCUPANCY_UI_TO_API = {
  available: 'Available',
  occupied: 'Occupied',
  inactive: 'Inactive',
  notice: 'Notice',
  locked: 'Locked',
};

/** Agreement date filter types for layout annotation header. */
export const LAYOUT_AGREEMENT_DATE_FILTER_OPTIONS = [
  { value: 'agreement_end_date', label: 'Agreement End date' },
  { value: 'lock_in_end_date', label: 'Lock In End Date' },
];

/** Fixed / custom date range presets shown after picking a filter type. */
export const LAYOUT_AGREEMENT_DATE_RANGE_PRESET_OPTIONS = [
  { value: 'this_week', label: 'This Week' },
  { value: 'next_week', label: 'Next Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'next_month', label: 'Next Month' },
  { value: 'next_quarter', label: 'Next Quarter' },
  { value: 'custom', label: 'Custom' },
];

/** UI space-type key → API `filters.inventory_type` label. */
export const LAYOUT_INVENTORY_TYPE_UI_TO_API = {
  'managed office': 'Managed Office',
  'co-working space': 'Co-working Space',
  resource: 'Resource',
  'pure rental': 'Pure Rental',
  common: 'Common Area',
};
