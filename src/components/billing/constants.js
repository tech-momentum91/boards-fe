import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';
import { MONTH_OPTIONS } from '@/constants/constants';
export const BILLING_GROUP_BY_PAGE_SIZE = 5;

export const BILLING_GROUP_BY_OPTIONS = [
  { value: 'client', label: 'Client' },
  { value: 'center', label: 'Center' },
  { value: 'category', label: 'Category' },
  { value: 'payment_status', label: 'Payment Status' },
];

/** Client detail billing — client is implicit from the page context. */
export const BILLING_GROUP_BY_OPTIONS_CLIENT_DETAIL = BILLING_GROUP_BY_OPTIONS.filter(
  (o) => o.value !== 'client',
);

/** API `group_by` field segment (before sort direction). */
export const BILLING_GROUP_BY_API_MAP = {
  client: 'client',
  center: 'center',
  category: 'billing_category',
  payment_status: 'payment_status',
};

export const BILLING_TAB_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'operations', label: 'Operations' },
  { value: 'legal', label: 'Legal' },
  { value: 'accounts', label: 'Accounts' },
  { value: 'invoice', label: 'Invoice Upload' },
];

// Doctypes
export const BILLING_DOCTYPE = 'Client Billing';
export const CLIENT_BILLING_CATEGORY_DOCTYPE = 'Client Billing Category';

// Default filters for billing list
export const getDefaultBillingYear = () => String(new Date().getFullYear());
export const getDefaultBillingMonth = () => MONTH_OPTIONS[new Date().getMonth()];

export const DEFAULT_BILLING_FILTERS = {
  search: '',
  center: [],
  client: [],
  tab: 'all',
  month: getDefaultBillingMonth(),
  year: getDefaultBillingYear(),
  trigger_month: '',
  trigger_year: '',
};

const BILLING_MULTI_FILTER_KEYS = [
  'center',
  'billing_category',
  'payment_status',
  'operations_signoff',
  'legal_signoff',
  'accounts_signoff',
];

/** Defaults for fields handled only by `compactFiltersForSessionStorage` (no runtime trigger defaults). */
const BILLING_VIEW_FILTER_COMPACT_STATIC_DEFAULTS = {
  center: [],
  billing_category: [],
  payment_status: [],
  operations_signoff: [],
  legal_signoff: [],
  accounts_signoff: [],
  tab: 'all',
  month: '',
  year: '',
};

const BILLING_VIEW_FILTER_COMPACT_STATIC_OPTS = {
  includeKeys: [...BILLING_MULTI_FILTER_KEYS, 'tab', 'month', 'year'],
  trimStringArrayElements: true,
  scalarDiffKeys: ['tab'],
  ignoreStringValuesByKey: { month: ['All'] },
};

/** Persist only active billing toolbar filters (not search, client, sorting). */
export function compactBillingViewFiltersForStorage(filters) {
  const base = compactFiltersForSessionStorage(
    filters,
    BILLING_VIEW_FILTER_COMPACT_STATIC_DEFAULTS,
    BILLING_VIEW_FILTER_COMPACT_STATIC_OPTS,
  );
  const out = { ...base };
  const tm = String(filters?.trigger_month ?? '').trim();
  const ty = String(filters?.trigger_year ?? '').trim();
  if (tm && tm !== 'All') out.trigger_month = tm;
  if (ty && ty !== 'all') out.trigger_year = ty;
  return out;
}

export function mergeStoredBillingViewFilters(stored) {
  if (!stored || typeof stored !== 'object') return {};
  const merged = { ...stored };
  for (const key of BILLING_MULTI_FILTER_KEYS) {
    if (merged[key] != null && !Array.isArray(merged[key])) merged[key] = [];
  }
  return merged;
}

/** Client detail billing tab — filter dropdown only (not toolbar month/year/tab/search/client). */
export const CLIENT_DETAIL_BILLING_POPOVER_FILTER_DEFAULTS = {
  center: [],
  billing_category: [],
  payment_status: [],
  operations_signoff: [],
  legal_signoff: [],
  accounts_signoff: [],
  trigger_month: '',
  trigger_year: '',
};

export const CLIENT_DETAIL_BILLING_POPOVER_FILTER_PERSIST_OPTS = {
  includeKeys: [
    'center',
    'billing_category',
    'payment_status',
    'operations_signoff',
    'legal_signoff',
    'accounts_signoff',
    'trigger_month',
    'trigger_year',
  ],
  trimStringArrayElements: true,
};

export function compactClientDetailBillingPopoverFiltersForStorage(filters) {
  const base = compactFiltersForSessionStorage(
    filters,
    CLIENT_DETAIL_BILLING_POPOVER_FILTER_DEFAULTS,
    CLIENT_DETAIL_BILLING_POPOVER_FILTER_PERSIST_OPTS,
  );
  const out = { ...base };
  const tm = String(filters?.trigger_month ?? '').trim();
  const ty = String(filters?.trigger_year ?? '').trim();
  if (tm && tm !== 'All') out.trigger_month = tm;
  if (ty && ty !== 'all') out.trigger_year = ty;
  return out;
}

export function mergeStoredClientDetailBillingPopoverFilters(stored) {
  const base = { ...CLIENT_DETAIL_BILLING_POPOVER_FILTER_DEFAULTS };
  if (!stored || typeof stored !== 'object') return base;
  const merged = {
    ...base,
    center: Array.isArray(stored.center) ? stored.center : base.center,
    billing_category: Array.isArray(stored.billing_category)
      ? stored.billing_category
      : base.billing_category,
    payment_status: Array.isArray(stored.payment_status)
      ? stored.payment_status
      : base.payment_status,
    operations_signoff: Array.isArray(stored.operations_signoff)
      ? stored.operations_signoff
      : base.operations_signoff,
    legal_signoff: Array.isArray(stored.legal_signoff) ? stored.legal_signoff : base.legal_signoff,
    accounts_signoff: Array.isArray(stored.accounts_signoff)
      ? stored.accounts_signoff
      : base.accounts_signoff,
    trigger_month:
      stored.trigger_month === 'All' ? '' : (stored.trigger_month ?? base.trigger_month),
    trigger_year: stored.trigger_year === 'all' ? '' : (stored.trigger_year ?? base.trigger_year),
  };
  return merged;
}

/** Standalone Billing module — filter dropdown only. */
export const BILLING_MODULE_POPOVER_FILTER_DEFAULTS = {
  client: [],
  ...CLIENT_DETAIL_BILLING_POPOVER_FILTER_DEFAULTS,
};

export const BILLING_MODULE_POPOVER_FILTER_PERSIST_OPTS = {
  includeKeys: ['client', ...CLIENT_DETAIL_BILLING_POPOVER_FILTER_PERSIST_OPTS.includeKeys],
  trimStringArrayElements: true,
};

export function compactBillingModulePopoverFiltersForStorage(filters) {
  const base = compactFiltersForSessionStorage(
    filters,
    BILLING_MODULE_POPOVER_FILTER_DEFAULTS,
    BILLING_MODULE_POPOVER_FILTER_PERSIST_OPTS,
  );
  const out = { ...base };
  const tm = String(filters?.trigger_month ?? '').trim();
  const ty = String(filters?.trigger_year ?? '').trim();
  if (tm && tm !== 'All') out.trigger_month = tm;
  if (ty && ty !== 'all') out.trigger_year = ty;
  return out;
}

export function mergeStoredBillingModulePopoverFilters(stored) {
  const base = { ...BILLING_MODULE_POPOVER_FILTER_DEFAULTS };
  if (!stored || typeof stored !== 'object') return base;
  const merged = {
    ...mergeStoredClientDetailBillingPopoverFilters(stored),
    client: Array.isArray(stored.client) ? stored.client : base.client,
  };
  return merged;
}

/** Standalone Billing module — toolbar month/year/tab + filter dropdown. */
export const BILLING_MODULE_VIEW_FILTER_DEFAULTS = {
  ...BILLING_MODULE_POPOVER_FILTER_DEFAULTS,
  month: getDefaultBillingMonth(),
  year: getDefaultBillingYear(),
  tab: 'all',
};

/** Persist toolbar month/year (incl. `All`) and filter-dropdown values for the billing module. */
export function compactBillingModuleViewFiltersForStorage(filters) {
  const out = compactBillingModulePopoverFiltersForStorage(filters);

  const month = String(filters?.month ?? '').trim();
  const year = String(filters?.year ?? '').trim();
  const tab = String(filters?.tab ?? 'all').trim() || 'all';

  if (month) out.month = month;
  if (year) out.year = year;
  if (tab !== 'all') out.tab = tab;

  return out;
}

export const BILLING_COLUMN_CONFIG_DEFS = [
  { id: 'name', columnLabel: 'Client' },
  { id: 'center', columnLabel: 'Center' },
  { id: 'billing_category', columnLabel: 'Category' },
  { id: 'billing_month', columnLabel: 'Billing Month' },
  { id: 'triggered_month', columnLabel: 'Triggered Month' },
  { id: 'payment_due_date', columnLabel: 'Due Date' },
  { id: 'changes', columnLabel: 'Changes' },
  { id: 'operations_signoff', columnLabel: 'Operations Sign-off' },
  { id: 'legal_signoff', columnLabel: 'Legal Sign-off' },
  { id: 'accounts_signoff', columnLabel: 'Accounts Sign-off' },
  { id: 'basic_amount', columnLabel: 'Basic Amount' },
  { id: 'gst_amount', columnLabel: 'GST Amount' },
  { id: 'discount_percentage', columnLabel: 'Discount %' },
  { id: 'discount_amount', columnLabel: 'Discount' },
  { id: 'invoice_amount', columnLabel: 'Invoice Amount' },
  { id: 'tds_percentage', columnLabel: 'TDS %' },
  { id: 'tds_amount', columnLabel: 'TDS Amount' },
  { id: 'total_amount', columnLabel: 'Total Amount' },
  { id: 'collected_amount', columnLabel: 'Collected Amount' },
  { id: 'outstanding_amount', columnLabel: 'Outstanding Amount' },
  { id: 'payment_status', columnLabel: 'Payment Status' },
  { id: 'invoice_upload', columnLabel: 'Invoice PDF', enableHiding: false },
  { id: 'latest_comment', columnLabel: 'Latest Comment' },
  { id: 'committed_date', columnLabel: 'Committed Date', enableHiding: false },
];

export function mergeStoredBillingModuleViewFilters(stored) {
  const popover = mergeStoredBillingModulePopoverFilters(stored);

  const month =
    stored?.month != null && String(stored.month).trim() !== ''
      ? String(stored.month).trim()
      : getDefaultBillingMonth();
  const year =
    stored?.year != null && String(stored.year).trim() !== ''
      ? String(stored.year).trim()
      : getDefaultBillingYear();

  return {
    ...popover,
    month,
    year,
    tab: stored?.tab || 'all',
  };
}

export const BILLING_FILTER_SECTIONS = [
  { id: 'center', label: 'Centers' },
  { id: 'client', label: 'Clients' },
  { id: 'billing_category', label: 'Billing Categories' },
  { id: 'payment_status', label: 'Payment Status' },
  { id: 'operations_signoff', label: 'Operations Sign-off' },
  { id: 'legal_signoff', label: 'Legal Sign-off' },
  { id: 'accounts_signoff', label: 'Accounts Sign-off' },
  { id: 'date', label: 'Trigger Date' },
];

export const BILLING_SIGNOFF_OPTIONS = [
  { value: 'No change', label: 'No change', color: 'gray' },
  { value: 'Changes Informed', label: 'Changes Informed', color: 'blue' },
  { value: 'Changes In-progress', label: 'Changes In-progress', color: 'orange' },
  { value: 'Changes Incorporated', label: 'Changes Incorporated', color: 'green' },
];

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending', color: 'orange' },
  { value: 'Partially Paid', label: 'Partially Paid', color: 'blue' },
  { value: 'Fully Paid', label: 'Fully Paid', color: 'green' },
];

export const BILLING_COLUMN_IDS = [
  'name',
  'client',
  'center',
  'billing_category',
  'period',
  'billing_month',
  'triggered_month',
  'payment_status',
  'basic_amount',
  'gst_amount',
  'discount_percentage',
  'discount_amount',
  'invoice_amount',
  'tds_percentage',
  'tds_amount',
  'total_amount',
  'collected_amount',
  'outstanding_amount',
  'changes',
  'latest_comment',
  'payment_due_date',
  'operations_signoff',
  'legal_signoff',
  'accounts_signoff',
  'invoice_upload',
  'committed_date',
];

export const ROLE_COLUMN_CONFIGS = {
  all: BILLING_COLUMN_IDS,
  operations: BILLING_COLUMN_IDS,
  legal: BILLING_COLUMN_IDS,
  accounts: BILLING_COLUMN_IDS,
  invoice: BILLING_COLUMN_IDS,
};

/** Digits and at most one dot, max 2 digits after decimal. */
export const isValidBillingDecimalInput = (value) => value === '' || /^\d*\.?\d{0,2}$/.test(value);

export const BILLING_DECIMAL_FIELDS = [
  'basic_amount',
  'gst_amount',
  'discount_percentage',
  'discount_amount',
  'tds_percentage',
  'tds_amount',
  'collected_amount',
];

export const BILLING_FORMATTED_FIELDS = new Set([
  ...BILLING_DECIMAL_FIELDS,
  'invoice_amount',
  'total_amount',
]);

/** Round to max 2 decimals; integers stay without a decimal part. */
export const formatBillingDecimal = (value) => {
  if (value === '' || value == null) return '';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value).trim();
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
};

/** Invoice amount = basic + GST (discount is applied only on total/outstanding). */
export function computeBillingInvoiceAmount(basicAmount, gstAmount) {
  return (Number.parseFloat(basicAmount) || 0) + (Number.parseFloat(gstAmount) || 0);
}

/** Total / outstanding = invoice − TDS − discount. */
export function computeBillingTotalAmount(invoiceAmount, tdsAmount, discountAmount) {
  return (
    (Number.parseFloat(invoiceAmount) || 0) -
    (Number.parseFloat(tdsAmount) || 0) -
    (Number.parseFloat(discountAmount) || 0)
  );
}

/** Amount from basic * percent / 100, max 2 decimal places. */
export function computeBillingAmountFromPercent(basicAmount, percent) {
  const basic = Number.parseFloat(basicAmount) || 0;
  const pct = Number.parseFloat(percent) || 0;
  return Math.round(((basic * pct) / 100) * 100) / 100;
}

/** Percent from amount / basic, max 2 decimal places. Empty when basic <= 0. */
export function formatBillingPercentFromAmount(basicAmount, amount) {
  const basic = Number.parseFloat(basicAmount) || 0;
  if (basic <= 0) return '';
  const amt = Number.parseFloat(amount) || 0;
  const pct = (amt / basic) * 100;
  if (Number.isNaN(pct)) return '';
  return formatBillingDecimal(pct);
}

export const TDS_AMOUNT_EXCEEDS_BASIC_ERROR = 'TDS amount cannot be greater than basic amount.';

export const DISCOUNT_EXCEEDS_INVOICE_ERROR = 'Discount cannot be greater than basic + GST amount.';

export const DISCOUNT_PLUS_TDS_EXCEEDS_INVOICE_ERROR =
  'Discount + TDS cannot be greater than basic + GST amount.';

export const MAX_DECIMAL_PLACES_ERROR = 'Maximum 2 decimal places allowed.';

export const billingStatusColor = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('partial')) return 'blue';
  if (s.includes('pending')) return 'orange';
  if (s.includes('full') || (s.includes('paid') && !s.includes('partial'))) return 'green';
  return 'gray';
};

export const CHANGE_OPTIONS = [
  { value: 'Increment', label: 'Increment', color: 'green' },
  { value: 'Renewal', label: 'Renewal', color: 'blue' },
  { value: 'Not Applicable', label: 'Not Applicable', color: 'gray' },
  { value: 'Seat Changes', label: 'Seat Changes', color: 'orange' },
  { value: 'Price Change', label: 'Price Change', color: 'red' },
  { value: 'Service Change', label: 'Service Change', color: 'purple' },
  { value: 'Parking Reduced', label: 'Parking Reduced', color: 'yellow' },
  { value: 'Name Change', label: 'Name Change', color: 'pink' },
];

export const BILLING_STATUS_FIELD_CONFIG = {
  payment_status: { label: 'Payment Status', fallback: PAYMENT_STATUS_OPTIONS },
  changes: { label: 'Changes', fallback: CHANGE_OPTIONS },
  operations_signoff: { label: 'Operations Sign-off', fallback: BILLING_SIGNOFF_OPTIONS },
  legal_signoff: { label: 'Legal Sign-off', fallback: BILLING_SIGNOFF_OPTIONS },
  accounts_signoff: { label: 'Accounts Sign-off', fallback: BILLING_SIGNOFF_OPTIONS },
};

/** Popover-only filter keys (excludes toolbar billing month/year, search, tab). */
export const BILLING_POPOVER_FILTER_KEYS = [
  'center',
  'client',
  'billing_category',
  'payment_status',
  'operations_signoff',
  'legal_signoff',
  'accounts_signoff',
  'trigger_month',
  'trigger_year',
];

export const BILLING_POPOVER_ARRAY_KEYS = new Set([
  'center',
  'client',
  'billing_category',
  'payment_status',
  'operations_signoff',
  'legal_signoff',
  'accounts_signoff',
]);

const ensureArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

export const getBillingPopoverFiltersFromApplied = (applied = {}) => ({
  center: ensureArray(applied.center),
  client: ensureArray(applied.client),
  billing_category: ensureArray(applied.billing_category),
  payment_status: ensureArray(applied.payment_status),
  operations_signoff: ensureArray(applied.operations_signoff),
  legal_signoff: ensureArray(applied.legal_signoff),
  accounts_signoff: ensureArray(applied.accounts_signoff),
  trigger_month: applied.trigger_month || '',
  trigger_year: applied.trigger_year || '',
});

export const normalizeBillingPopoverFilters = (raw) => {
  const normalized = getBillingPopoverFiltersFromApplied(raw);
  if (normalized.trigger_month === 'All') normalized.trigger_month = '';
  if (normalized.trigger_year === 'all') normalized.trigger_year = '';
  return normalized;
};

export const areBillingPopoverFiltersEqual = (a, b) =>
  BILLING_POPOVER_FILTER_KEYS.every((key) => {
    if (BILLING_POPOVER_ARRAY_KEYS.has(key)) {
      const aArr = [...ensureArray(a[key])].sort();
      const bArr = [...ensureArray(b[key])].sort();
      return aArr.length === bArr.length && aArr.every((v, i) => v === bArr[i]);
    }
    return String(a[key] || '') === String(b[key] || '');
  });

export const getEmptyBillingPopoverFilters = () => getBillingPopoverFiltersFromApplied({});
