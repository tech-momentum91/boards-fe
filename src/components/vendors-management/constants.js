import { RiListCheck3, RiLoopLeftLine, RiToolsLine, RiShieldCheckLine } from 'react-icons/ri';

export const VENDOR_STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

export const VENDOR_STATUS_TAB_OPTIONS = [
  { value: 'all', label: 'All', icon: RiListCheck3 },
  { value: 'Recurring', label: 'Recurring', icon: RiLoopLeftLine },
  { value: 'Maintenance', label: 'Maintenance', icon: RiToolsLine },
  { value: 'AMC', label: 'AMC', icon: RiShieldCheckLine },
];

export const getVendorStatusBadge = (status) => {
  const normalized = String(status || '')
    .trim()
    .toLowerCase();

  if (normalized === 'active') return { label: 'ACTIVE', color: 'green' };
  if (normalized === 'inactive') return { label: 'INACTIVE', color: 'red' };

  return { label: (status || '--').toString().toUpperCase(), color: 'gray' };
};

export const EMPTY_STATES = {
  default: {
    title: 'No vendors yet',
    description: 'Create your first vendor to get started.',
  },
  search: {
    title: 'No vendors match these filters',
    description: 'Try adjusting filters or clearing search.',
  },
};

export const TASK_FILTER_TABS = {
  STATUS: 'status',
  PRIORITY: 'priority',
};

export const TASK_FILTER_TAB_CONFIG = [
  { value: TASK_FILTER_TABS.STATUS, label: 'Status' },
  { value: TASK_FILTER_TABS.PRIORITY, label: 'Priority' },
];

export const FILTER_OPTION = {
  status: [],
  priority: [],
};

/** Keys persisted for the Vendor Detail > Onboarding tab filter dropdown. */
export const VENDOR_ONBOARDING_PERSISTED_KEYS = ['status', 'priority'];

export const VENDOR_TASK_MASTER_ONBOARDING_FILTERS_KEY = 'vendor-task-master-onboarding-filters';

/**
 * Build a per-vendor sessionStorage key for the Onboarding tab's filter
 * dropdown. Mirrors the Center > Landlords / Configuration pattern so each
 * vendor scope owns its own slot and selections never leak across navigations.
 * Returns `null` when there is no vendor id yet — `usePersistedFilters` is
 * already null-safe for that case.
 */
export const getVendorOnboardingFiltersStorageKey = (vendorId) =>
  vendorId ? `vendor-detail-onboarding-view-filter-dropdown-${String(vendorId).trim()}` : null;

const trimNonEmptyVendorFilterList = (values) => {
  if (!Array.isArray(values)) return [];
  return values.map((v) => String(v).trim()).filter(Boolean);
};

/**
 * Normalize a hydrated snapshot back into the `FILTER_OPTION` shape — every
 * known key is guaranteed to be an array. The downstream toggle handler /
 * filter list both assume arrays, so this prevents a partial persisted blob
 * from breaking `length` reads.
 */
export const mergeStoredVendorOnboardingFilters = (stored) => {
  const merged = { ...FILTER_OPTION };
  if (!stored || typeof stored !== 'object') return merged;
  for (const key of VENDOR_ONBOARDING_PERSISTED_KEYS) {
    if (Array.isArray(stored[key])) {
      merged[key] = trimNonEmptyVendorFilterList(stored[key]);
    }
  }
  return merged;
};

export const VENDOR_BILL_COLUMN_CONFIG_SEED = [
  { id: 'subcategory', columnLabel: 'Sub Category' },
  { id: 'center_name', columnLabel: 'Center Name' },
  { id: 'billing_month', columnLabel: 'Billing Month' },
  { id: 'triggered_month', columnLabel: 'Triggered Month' },
  { id: 'total_amount', columnLabel: 'Total Amount' },
  { id: 'gst_amount', columnLabel: 'GST Amount' },
  { id: 'amount_without_gst', columnLabel: 'Amount (excl. GST)' },
  { id: 'bill_uploaded', columnLabel: 'Bill Uploaded' },
  { id: 'bill_url', columnLabel: 'Bill URL' },
  { id: 'invoice_date', columnLabel: 'Invoice Date' },
  { id: 'hard_copy_sent', columnLabel: 'Hard Copy Sent' },
  { id: 'zone_head_check', columnLabel: 'Zone Head Check' },
  { id: 'zone_head_checked_date', columnLabel: 'Zone Head Checked Date', visible: false },
  { id: 'purchase_check', columnLabel: 'Purchase Check' },
  { id: 'purchase_checked_date', columnLabel: 'Purchase Checked Date', visible: false },
  { id: 'assignee', columnLabel: 'Assignee' },
  { id: 'zoho_uploaded', columnLabel: 'Zoho Uploaded' },
  { id: 'modified', columnLabel: 'Last Modified' },
];

export const VENDOR_BILL_COLUMN_ORDER = [
  'subcategory',
  'center_name',
  'billing_month',
  'triggered_month',
  'total_amount',
  'gst_amount',
  'amount_without_gst',
  'bill_uploaded',
  'bill_url',
  'invoice_date',
  'hard_copy_sent',
  'zone_head_check',
  'zone_head_checked_date',
  'purchase_check',
  'purchase_checked_date',
  'assignee',
  'zoho_uploaded',
  'modified',
];

/** Vendor (supplier) detail main tab id → sidebar module name for `read`. */
export const VENDOR_DETAIL_TAB_READ_MODULE = Object.freeze({
  about: 'Supplier',
  documents: 'Supplier',
  onboarding: 'Task',
  rating: null,
  billings: 'Client Billing',
});

export const DEFAULT_GROUP_BY_OPTIONS = ['Center', 'Category'];

/** Match vendor detail trigger badges: show up to this many chips, then +N. */
export const VENDOR_OPEX_TRIGGER_BADGE_MAX = 2;

/** Vendors list table: default column visibility seed (new users / empty prefs). */
export const VENDOR_TABLE_DEFAULT_VISIBLE_COLUMN_IDS = [
  'vendorName',
  'center',
  'category',
  'subCategory',
  'status',
  'totalPaidAmount',
  'city',
  'primarySpoc',
];

/** Columns shown as hidden in the seed; empty = all configurable columns use visible order above. */
export const VENDOR_TABLE_DEFAULT_HIDDEN_COLUMN_IDS = [];

export const VENDOR_MAIN_TAB_ORDER = ['about', 'documents', 'onboarding', 'rating', 'billings'];

export const VENDOR_DETAIL_EMPTY_STATES = {
  rating: {
    title: 'No ratings yet',
    description: 'There are no ratings available for this vendor.',
  },
};
