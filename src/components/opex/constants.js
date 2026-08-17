import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';
import { MONTH_OPTIONS } from '@/constants/constants';

export const getDefaultExpenseYear = () => String(new Date().getFullYear());
export const getDefaultExpenseMonth = () => MONTH_OPTIONS[new Date().getMonth()];

export const OPEX_DOCTYPE = 'Operating Expenses';
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes
export const IMAGE_EXTENSIONS = new Set(['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'SVG', 'BMP']);

export const OPEX_TAB_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'facility', label: 'Facility' },
  { value: 'zone_head', label: 'Zone Head' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'zoho', label: 'Zoho' },
];

/** role_type (User) → which tab `value`s are shown */
const OPEX_TAB_VALUES_BY_ROLE_TYPE = {
  'Facility Team': ['all', 'facility', 'zone_head', 'Admin'],
  'Zonal Team': ['all', 'facility', 'zone_head', 'Admin'],
  'Purchase Team': ['all', 'facility', 'purchase', 'zoho', 'Admin'],
  'Finance Team': ['all', 'facility', 'zoho', 'purchase', 'Admin'],
  'Accounts Team': ['all', 'facility', 'zoho', 'zone_head', 'purchase', 'Admin'],
};

export const getOpexTabOptionsForRoleType = (roleType) => {
  const roleTypes = Array.isArray(roleType) ? roleType : roleType ? [roleType] : [];
  if (roleTypes.length === 0) return OPEX_TAB_OPTIONS;

  const allowedValues = new Set();
  roleTypes.forEach((rt) => {
    const values = OPEX_TAB_VALUES_BY_ROLE_TYPE[rt];
    if (values) values.forEach((v) => allowedValues.add(v));
  });
  if (allowedValues.size === 0) return OPEX_TAB_OPTIONS;
  return OPEX_TAB_OPTIONS.filter((t) => allowedValues.has(t.value));
};

/** Only matching role_type(s) may change the given status field (User doc `role_type` may be a string or array). */
export const OPEX_STATUS_FIELD_ROLE = {
  vendor: {
    facility: 'Facility Team',
    crm: 'CRM Team',
    admin: 'Admin',
  },
  bill_uploaded: {
    facility: 'Facility Team',
    zone_head: 'Zonal Team',
    admin: 'Admin',
  },
  zone_head_check: {
    facility: 'Facility Team',
    zone_head: 'Zonal Team',
    admin: 'Admin',
  },
  purchase_check: {
    purchase: 'Purchase Team',
    admin: 'Admin',
  },
  zoho_uploaded: {
    finance: 'Finance Team',
    admin: 'Admin',
    accounts_team: 'Accounts Team',
  },
};

export const canEditOpexStatusField = (field, moduleCanEdit, userRoleType) => {
  if (!moduleCanEdit) return false;
  const roleTypes = Array.isArray(userRoleType) ? userRoleType : userRoleType ? [userRoleType] : [];
  const need = OPEX_STATUS_FIELD_ROLE[field];
  if (need && typeof need === 'object') {
    const allowedRoles = Object.values(need);
    return roleTypes.some((rt) => allowedRoles.includes(rt));
  }
  return !need || roleTypes.includes(need);
};

/** Workflow order: facility → zone_head → purchase → zoho */
export const OPEX_STATUS_FIELD_CHAIN = [
  'bill_uploaded',
  'zone_head_check',
  'purchase_check',
  'zoho_uploaded',
];

const OPEX_STAGE_EDITABLE_FIELDS = {
  facility: ['bill_uploaded'],
  zone_head: ['bill_uploaded', 'zone_head_check'],
  purchase: ['bill_uploaded', 'zone_head_check', 'purchase_check'],
  zoho: ['bill_uploaded', 'zone_head_check', 'purchase_check', 'zoho_uploaded'],
};

const OPEX_STATUS_FIELD_LABELS = {
  bill_uploaded: 'Bill uploaded',
  zone_head_check: 'Zone head check',
  purchase_check: 'Purchase check',
  zoho_uploaded: 'ZOHO uploaded',
};

export const normalizeOpexStage = (stage) => {
  const raw = String(stage ?? '')
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, '_');
  if (!raw) return '';
  if (raw === 'zonehead') return 'zone_head';
  return raw;
};

export const canEditOpexFieldAtStage = (field, opexStage) => {
  if (!OPEX_STATUS_FIELD_CHAIN.includes(field)) return true;
  const stage = normalizeOpexStage(opexStage);
  if (!stage) return true;
  const allowed = OPEX_STAGE_EDITABLE_FIELDS[stage];
  if (!allowed) return true;
  return allowed.includes(field);
};

export const getOpexStageBlockedFieldMessage = (field, opexStage) => {
  if (canEditOpexFieldAtStage(field, opexStage)) return null;
  const stage = normalizeOpexStage(opexStage);
  const allowed = OPEX_STAGE_EDITABLE_FIELDS[stage] || [];
  const maxIdx = Math.max(
    0,
    ...allowed.map((f) => OPEX_STATUS_FIELD_CHAIN.indexOf(f)).filter((i) => i >= 0),
  );
  const prerequisite = OPEX_STATUS_FIELD_CHAIN[maxIdx] || 'bill_uploaded';
  const label = OPEX_STATUS_FIELD_LABELS[prerequisite] || prerequisite;
  return `${label} field must be updated before changing this field`;
};

export const OPEX_FILTER_SECTIONS = [
  { id: 'center', label: 'Center' },
  { id: 'category', label: 'Category' },
  { id: 'subcategory', label: 'Subcategory' },
  { id: 'vendor', label: 'Vendor' },
  { id: 'bill_uploaded', label: 'Bill Uploaded' },
  { id: 'zone_head_check', label: 'Zone Head Check' },
  { id: 'purchase_check', label: 'Purchase Check' },
  { id: 'zoho_uploaded', label: 'ZOHO Check' },
  { id: 'creation', label: 'Trigger Date' },
];

export const ROLE_COLUMN_CONFIGS = {
  facility: [
    'name',
    'center',
    'assignee',
    'period',
    'total_amount',
    'gst_amount',
    'amount_without_gst',
    'vendor',
    'bill_url',
    'invoice_date',
    'bill_uploaded',
    'hard_copy_sent',
    'expense_month',
    'triggered_month',
  ],
  zone_head: [
    'name',
    'center',
    'assignee',
    'period',
    'total_amount',
    'gst_amount',
    'amount_without_gst',
    'vendor',
    'bill_url',
    'invoice_date',
    'bill_uploaded',
    'hard_copy_sent',
    'zone_head_check',
    'expense_month',
    'triggered_month',
  ],
  purchase: [
    'name',
    'center',
    'assignee',
    'period',
    'total_amount',
    'gst_amount',
    'amount_without_gst',
    'vendor',
    'bill_url',
    'invoice_date',
    'bill_uploaded',
    'hard_copy_sent',
    'zone_head_check',
    'purchase_check',
    'expense_month',
    'triggered_month',
  ],
  zoho: [
    'name',
    'center',
    'assignee',
    'period',
    'total_amount',
    'gst_amount',
    'amount_without_gst',
    'vendor',
    'bill_url',
    'invoice_date',
    'bill_uploaded',
    'hard_copy_sent',
    'zone_head_check',
    'purchase_check',
    'zoho_uploaded',
    'expense_month',
    'triggered_month',
  ],
  all: [
    'name',
    'center',
    'assignee',
    'period',
    'total_amount',
    'gst_amount',
    'amount_without_gst',
    'vendor',
    'bill_url',
    'invoice_date',
    'bill_uploaded',
    'hard_copy_sent',
    'zone_head_check',
    'purchase_check',
    'zoho_uploaded',
    'expense_month',
    'triggered_month',
  ],
};

export const STATUS_COLORS = {
  green: 'bg-[#12B76A]',
  red: 'bg-[#F04438]',
  blue: 'bg-[#3366FF]',
  gray: 'bg-[#667085]',
  orange: 'bg-[#F79009]',
  purple: 'bg-[#7A5AF8]',
};

export const BILL_UPLOADED_OPTIONS = [
  { value: 'Uploaded', label: 'Uploaded', color: 'green' },
  { value: 'Not Uploaded', label: 'Not Uploaded', color: 'gray' },
  { value: 'Not Needed', label: 'Not Needed', color: 'blue' },
  { value: 'Not Received', label: 'Not Received', color: 'red' },
  { value: 'Recheck', label: 'Recheck', color: 'orange', hidden: true },
];

export const APPROVAL_OPTIONS = [
  { value: 'Approved', label: 'Approved', color: 'green' },
  { value: 'Resubmit', label: 'Resubmit', color: 'purple' },
  { value: 'Rejected', label: 'Rejected', color: 'red' },
  { value: 'Not Checked', label: 'Not Checked', color: 'gray' },
  { value: 'Recheck', label: 'Recheck', color: 'orange', hidden: true },
];

export const ZOHO_OPTIONS = [
  { value: 'Done', label: 'Done', color: 'green' },
  { value: 'Pending', label: 'Pending', color: 'orange' },
  { value: 'Not Uploaded', label: 'Not Uploaded', color: 'gray' },
];

export const DEFAULT_STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

export const TYPE_OPTIONS = [
  { value: 'Recurring', label: 'Recurring' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'AMC', label: 'AMC' },
];

export const EXPENSE_MONTH_BASIS = [
  { value: 'Previous Month', label: 'Previous Month' },
  { value: 'Same Month', label: 'Same Month' },
];

const ensureOpexFilterArray = (value) => (Array.isArray(value) ? value : []);

/** Standalone OPEX module page — filter popover + centers (expense month/year are toolbar-only). */
export const OPEX_MODULE_POPOVER_FILTER_DEFAULTS = {
  center: [],
  category: [],
  subcategory: [],
  vendor: [],
  bill_uploaded: [],
  zone_head_check: [],
  purchase_check: [],
  zoho_uploaded: [],
  triggered_month: '',
  triggered_year: '',
};

export const OPEX_MODULE_POPOVER_FILTER_PERSIST_OPTS = {
  includeKeys: [
    'center',
    'category',
    'subcategory',
    'vendor',
    'bill_uploaded',
    'zone_head_check',
    'purchase_check',
    'zoho_uploaded',
    'triggered_month',
    'triggered_year',
  ],
  trimStringArrayElements: true,
};

export function mergeStoredOpexModulePopoverFilters(stored) {
  const base = { ...OPEX_MODULE_POPOVER_FILTER_DEFAULTS };
  if (!stored || typeof stored !== 'object') return base;
  return {
    ...base,
    center: Array.isArray(stored.center) ? stored.center : base.center,
    category: Array.isArray(stored.category) ? stored.category : base.category,
    subcategory: Array.isArray(stored.subcategory) ? stored.subcategory : base.subcategory,
    vendor: Array.isArray(stored.vendor) ? stored.vendor : base.vendor,
    bill_uploaded: Array.isArray(stored.bill_uploaded) ? stored.bill_uploaded : base.bill_uploaded,
    zone_head_check: Array.isArray(stored.zone_head_check)
      ? stored.zone_head_check
      : base.zone_head_check,
    purchase_check: Array.isArray(stored.purchase_check)
      ? stored.purchase_check
      : base.purchase_check,
    zoho_uploaded: Array.isArray(stored.zoho_uploaded) ? stored.zoho_uploaded : base.zoho_uploaded,
    triggered_month:
      stored.triggered_month === 'All' ? '' : (stored.triggered_month ?? base.triggered_month),
    triggered_year:
      stored.triggered_year === 'all' ? '' : (stored.triggered_year ?? base.triggered_year),
  };
}

export const compactOpexModulePopoverFiltersForStorage = (filters) => {
  const base = compactFiltersForSessionStorage(
    filters,
    OPEX_MODULE_POPOVER_FILTER_DEFAULTS,
    OPEX_MODULE_POPOVER_FILTER_PERSIST_OPTS,
  );
  const out = { ...base };
  const tm = String(filters?.triggered_month ?? '').trim();
  const ty = String(filters?.triggered_year ?? '').trim();
  if (tm && tm !== 'All') out.triggered_month = tm;
  if (ty && ty !== 'all') out.triggered_year = ty;
  return out;
};

/** Standalone OPEX module — toolbar month/year/tab + filter dropdown. */
export const OPEX_MODULE_VIEW_FILTER_DEFAULTS = {
  ...OPEX_MODULE_POPOVER_FILTER_DEFAULTS,
  month: getDefaultExpenseMonth(),
  year: getDefaultExpenseYear(),
  tab: 'all',
};

/** Persist toolbar month/year (incl. `All`) and filter-dropdown values for the opex module. */
export function compactOpexModuleViewFiltersForStorage(filters) {
  const out = compactOpexModulePopoverFiltersForStorage(filters);

  const month = String(filters?.month ?? '').trim();
  const year = String(filters?.year ?? '').trim();
  const tab = String(filters?.tab ?? 'all').trim() || 'all';

  if (month) out.month = month;
  if (year) out.year = year;
  if (tab !== 'all') out.tab = tab;

  return out;
}

export function mergeStoredOpexModuleViewFilters(stored) {
  const popover = mergeStoredOpexModulePopoverFilters(stored);

  const month =
    stored?.month != null && String(stored.month).trim() !== ''
      ? String(stored.month).trim()
      : getDefaultExpenseMonth();
  const year =
    stored?.year != null && String(stored.year).trim() !== ''
      ? String(stored.year).trim()
      : getDefaultExpenseYear();

  return {
    ...popover,
    month,
    year,
    tab: stored?.tab || 'all',
  };
}

/** Center detail OPEX tab — filter popover only (center + expense month/year are fixed outside). */
export const CENTER_DETAIL_OPEX_POPOVER_FILTER_DEFAULTS = {
  category: [],
  subcategory: [],
  vendor: [],
  bill_uploaded: [],
  zone_head_check: [],
  purchase_check: [],
  zoho_uploaded: [],
  triggered_month: '',
  triggered_year: '',
};

export const CENTER_DETAIL_OPEX_POPOVER_FILTER_PERSIST_OPTS = {
  includeKeys: [
    'category',
    'subcategory',
    'vendor',
    'bill_uploaded',
    'zone_head_check',
    'purchase_check',
    'zoho_uploaded',
    'triggered_month',
    'triggered_year',
  ],
  trimStringArrayElements: true,
};

export function mergeStoredCenterDetailOpexPopoverFilters(stored) {
  const base = { ...CENTER_DETAIL_OPEX_POPOVER_FILTER_DEFAULTS };
  if (!stored || typeof stored !== 'object') return base;
  return {
    ...base,
    category: Array.isArray(stored.category) ? stored.category : base.category,
    subcategory: Array.isArray(stored.subcategory) ? stored.subcategory : base.subcategory,
    vendor: Array.isArray(stored.vendor) ? stored.vendor : base.vendor,
    bill_uploaded: Array.isArray(stored.bill_uploaded) ? stored.bill_uploaded : base.bill_uploaded,
    zone_head_check: Array.isArray(stored.zone_head_check)
      ? stored.zone_head_check
      : base.zone_head_check,
    purchase_check: Array.isArray(stored.purchase_check)
      ? stored.purchase_check
      : base.purchase_check,
    zoho_uploaded: Array.isArray(stored.zoho_uploaded) ? stored.zoho_uploaded : base.zoho_uploaded,
    triggered_month:
      stored.triggered_month === 'All' ? '' : (stored.triggered_month ?? base.triggered_month),
    triggered_year:
      stored.triggered_year === 'all' ? '' : (stored.triggered_year ?? base.triggered_year),
  };
}

export const compactCenterDetailOpexPopoverFiltersForStorage = (filters) => {
  const base = compactFiltersForSessionStorage(
    filters,
    CENTER_DETAIL_OPEX_POPOVER_FILTER_DEFAULTS,
    CENTER_DETAIL_OPEX_POPOVER_FILTER_PERSIST_OPTS,
  );
  const out = { ...base };
  const tm = String(filters?.triggered_month ?? '').trim();
  const ty = String(filters?.triggered_year ?? '').trim();
  if (tm && tm !== 'All') out.triggered_month = tm;
  if (ty && ty !== 'all') out.triggered_year = ty;
  return out;
};

/** Merge session payload into full list.filters defaults (defaults from Redux DEFAULT_OPEX_FILTERS at call site). */
const OPEX_POPOVER_FILTER_KEYS = [
  'center',
  'category',
  'subcategory',
  'vendor',
  'bill_uploaded',
  'zone_head_check',
  'purchase_check',
  'zoho_uploaded',
  'triggered_month',
  'triggered_year',
];

const OPEX_POPOVER_ARRAY_KEYS = new Set([
  'center',
  'category',
  'subcategory',
  'vendor',
  'bill_uploaded',
  'zone_head_check',
  'purchase_check',
  'zoho_uploaded',
]);

export const getOpexPopoverFiltersFromApplied = (applied = {}) => ({
  center: ensureOpexFilterArray(applied.center),
  category: ensureOpexFilterArray(applied.category),
  subcategory: ensureOpexFilterArray(applied.subcategory),
  vendor: ensureOpexFilterArray(applied.vendor),
  bill_uploaded: ensureOpexFilterArray(applied.bill_uploaded),
  zone_head_check: ensureOpexFilterArray(applied.zone_head_check),
  purchase_check: ensureOpexFilterArray(applied.purchase_check),
  zoho_uploaded: ensureOpexFilterArray(applied.zoho_uploaded),
  triggered_month: applied.triggered_month || '',
  triggered_year: applied.triggered_year || '',
});

export const normalizeOpexPopoverFilters = (raw) => {
  const normalized = getOpexPopoverFiltersFromApplied(raw);
  if (normalized.triggered_month === 'All') normalized.triggered_month = '';
  return normalized;
};

export const areOpexPopoverFiltersEqual = (a, b) =>
  OPEX_POPOVER_FILTER_KEYS.every((key) => {
    if (OPEX_POPOVER_ARRAY_KEYS.has(key)) {
      const aArr = [...ensureOpexFilterArray(a[key])].sort();
      const bArr = [...ensureOpexFilterArray(b[key])].sort();
      return aArr.length === bArr.length && aArr.every((v, i) => v === bArr[i]);
    }
    return String(a[key] || '') === String(b[key] || '');
  });

export const getEmptyOpexPopoverFilters = () => getOpexPopoverFiltersFromApplied({});
