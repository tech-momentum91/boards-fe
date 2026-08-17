import { RiListCheck, RiCalendarLine, RiBarChartHorizontalLine } from 'react-icons/ri';
import { NO_CENTERS_EMPTY_STATE } from '@/utils/global-center-filter';

export const AGREEMENTS_TABLE_ID = 'agreements-list-table';

export const AGREEMENTS_VIEW_TABS = [
  { id: 'list', label: 'List', icon: RiListCheck },
  { id: 'calendar', label: 'Calendar', icon: RiCalendarLine },
  { id: 'gantt', label: 'Gantt', icon: RiBarChartHorizontalLine },
];

export const AGREEMENTS_EMPTY_STATES = {
  default: {
    title: 'No agreements yet',
    description: 'Create your first client agreement to get started.',
  },
  search: {
    title: 'No agreements match these filters',
    description: 'Try adjusting filters or clearing your search.',
  },
  no_centers: { ...NO_CENTERS_EMPTY_STATE },
};

// Default applied filters for Agreements list page
export const AGREEMENTS_DEFAULT_FILTERS = {
  client: [],
  center: [],
  membershipPlan: [],
  type: [],
  status: [],
};

/** Keys persisted for the dropdown filter state (search/sorting are NOT included). */
export const AGREEMENTS_PERSISTED_FILTER_KEYS = [
  'client',
  'center',
  'membershipPlan',
  'type',
  'status',
];

/**
 * Build the sessionStorage key for the Agreements dropdown filters. Each
 * mode/tab pair gets its own slot so e.g. Client active ≠ Client pending ≠
 * Landlord active. Mirrors the per-feature key convention used by the
 * Clients / Centers / Team Management modules.
 */
export function buildAgreementsFilterStorageKey(mode = 'client', tab = 'active') {
  const safeMode = String(mode || 'client').toLowerCase();
  const safeTab = String(tab || 'active').toLowerCase();
  return `agreements-${safeMode}-${safeTab}-view-filter-dropdown`;
}

function trimNonEmptyAgreementList(values) {
  if (!Array.isArray(values)) return [];
  return values.map((x) => String(x).trim()).filter(Boolean);
}

/**
 * Merge a persisted snapshot back into the canonical filter shape, guaranteeing
 * every key is an array (downstream `apiFilters` builder + dropdown UI both
 * assume arrays — see `agreements-filter-dropdown.jsx::ensureArray`).
 */
export function mergeStoredAgreementsFilters(stored) {
  const merged = { ...AGREEMENTS_DEFAULT_FILTERS };
  if (!stored || typeof stored !== 'object') return merged;
  for (const key of AGREEMENTS_PERSISTED_FILTER_KEYS) {
    const value = stored[key];
    if (Array.isArray(value)) {
      merged[key] = trimNonEmptyAgreementList(value);
    }
  }
  return merged;
}

/** List toolbar — group-by choices (UI only until API is wired). */
export const AGREEMENTS_GROUP_BY_OPTIONS = [
  { value: 'client', label: 'Client' },
  { value: 'center', label: 'Center' },
  { value: 'status', label: 'Status' },
];

/** Row keys on client agreement list rows used for client-side grouping. */
export const AGREEMENTS_GROUP_BY_FIELD_MAP = {
  client: 'client',
  center: 'center_name',
  status: 'status',
};

/** Row keys for landlord listview when mirroring the same group-by dimensions as client. */
export const AGREEMENTS_GROUP_BY_FIELD_MAP_LANDLORD = {
  client: 'landlord_name',
  center: 'center_name',
  status: 'status',
};

/** `group_by` POST body value for get_agreement_entries_grouped (e.g. `client`). */
export const AGREEMENTS_GROUP_BY_API_PARAM_MAP = {
  client: 'client',
  center: 'center',
  status: 'status',
};

export const MEMBERSHIP_OPTIONS = [
  { value: 'MANAGED OFFICE', label: 'Managed Office' },
  { value: 'CO-WORKING', label: 'Co-working' },
  { value: 'RESOURCE', label: 'Resource' },
];

// Temporary space options used by Create/View Agreement.
// In a later iteration these should come from actual inventory data.
export const SPACE_MULTISELECT_OPTIONS = [
  { value: 'Managed Office 1', label: 'Managed Office 1' },
  { value: 'Dedicated Desk Zone 1', label: 'Dedicated Desk Zone 1' },
  { value: 'Dedicated Desk Zone 2', label: 'Dedicated Desk Zone 2' },
  { value: 'Flexi Desk Open Area', label: 'Flexi Desk Open Area' },
  { value: 'Manager Cabin B2', label: 'Manager Cabin B2' },
  { value: 'Meeting Room Beta', label: 'Meeting Room Beta' },
];

export const AGREEMENTS_CHANGE_TYPE_OPTIONS = [
  { value: 'Seats Change', label: 'Seats Change' },
  { value: 'Term Renewal', label: 'Term Renewal' },
  { value: 'Name Change', label: 'Name Change' },
  { value: 'Type Change', label: 'Type Change' },
  { value: 'Address Change', label: 'Address Change' },
  { value: 'Price Change', label: 'Price Change' },
  {
    value: 'Clarification On Rent Commencement Date',
    label: 'Clarification On Rent Commencement Date',
  },
];

export const AGREEMENTS_FILTER_MEMBERSHIP_PLAN_OPTIONS = [
  { value: 'MANAGED OFFICE', label: 'Managed Office' },
  { value: 'CO-WORKING', label: 'Co-working Space' },
  { value: 'RESOURCE', label: 'Resource' },
];

export const AGREEMENTS_FILTER_TYPE_OPTIONS = [
  { value: 'Managed Office', label: 'Managed Office' },
  { value: 'Co-working', label: 'Co-working' },
  { value: 'Resource', label: 'Resource' },
];

/** Map table column ids to backend field names for order_by */
export const AGREEMENTS_SORT_FIELD_MAP = {
  // Column ID : Backend Field Name
  clientName: 'client',
  center: 'center',
  office: 'office',
  spocName: 'spoc_name',
  contactNumber: 'spoc_contact',
  email: 'spoc_email',
  space: 'space',
  membershipPlan: 'membership_plan',
  seats: 'no_of_seats',
  areaSqFt: 'area',
  pricePerSeat: 'price_per_seat',
  monthlyRevenueWithGst: 'monthly_revenue',
  monthlyRevenueWithoutGst: 'monthly_revenue',
  noOfMDeposit: 'no_of_monthly_deposit',
  agreementStartDate: 'agreement_start_date',
  rentStartDate: 'rent_start_date',
  contractEndDate: 'agreement_end_date',
  lockInPeriod: 'lock_in_period',
  lockInEndDate: 'lock_in_end_date',
  incrementDate: 'increment_date',
  annualEscalation: 'annual_escalation',
  dueDate: 'payment_due_day',
  type: 'type',
  roc: 'roc',
  changeType: 'roc',
  noticePeriod: 'notice_period',
  parking: 'parking',
  noticePeriodClient: 'notice_period_of_client',
  noticePeriodDevX: 'notice_period_of_devx',
  status: 'status',
  createdBy: 'owner',
  createdAt: 'creation',
  lastModifiedAt: 'modified',
};

/** Payment due day options (1–31) for agreement forms */
export const PAYMENT_DUE_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/** Annual escalation duration options (years) */
export const ESCALATION_YEAR_OPTIONS = [1, 2, 3, 4, 5];

/** Calendar date field options (value/label; components add icons) */
export const CALENDAR_DATE_FIELD_OPTIONS = [
  { value: 'agreement_start_date', label: 'Agreement Start Date' },
  { value: 'rent_start_date', label: 'Rent Start Date' },
  { value: 'agreement_end_date', label: 'Agreement End Date' },
  { value: 'lock_in_end_date', label: 'Lock-in End Date' },
  { value: 'increment_date', label: 'Increment Date' },
];

/** Month abbreviations for month/year picker */
export const MONTH_ABBREV = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
export const DATE_VALIDATION_FIELDS = [
  'agreement_start_date',
  'rent_start_date',
  'agreement_end_date',
  'lock_in_end_date',
  'increment_date',
];

export const YEAR_RANGE_SIZE = 12;
export const YEAR_BASE = 2025;

/** Filter dropdown vertical tab keys and labels */
export const AGREEMENTS_FILTER_VERTICAL_TABS = [
  { value: 'client', label: 'Client' },
  { value: 'center', label: 'Center' },
  { value: 'membershipPlan', label: 'Membership Plan' },
  // { value: 'type', label: 'Type' },
  { value: 'status', label: 'Status' },
];

/** Calendar: weekday column labels */
export const CALENDAR_WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** Calendar: max agreement chips shown per day before "+N MORE" */
export const CALENDAR_MAX_VISIBLE_AGREEMENTS = 2;

/** Calendar: max length for agreement name in day cell */
export const CALENDAR_AGREEMENT_LABEL_MAX_LENGTH = 22;

/** Calendar: colors for agreement list in "+N MORE" popover */
export const CALENDAR_AGREEMENT_COLORS = ['#079455', '#6E3FF3', '#DF1C41', '#F17B2C', '#E255F2'];

const CALENDAR_AGREEMENT_GRADIENTS = [
  // Green
  'linear-gradient(180deg, #D4F7E9 0%, #EFFAF6 100%)',
  // Purple
  'linear-gradient(180deg, #CAC2FF 0%, #EEEBFF 100%)',
  // Red
  'linear-gradient(180deg, #F9D2DA 0%, #FDEDF0 100%)',
  // Orange
  'linear-gradient(180deg, #FFDAC2 0%, #FEF3EB 100%)',
  // Pink
  'linear-gradient(180deg, #F9C2FF 0%, #FDEBFF 100%)',
];

/**
 * Calendar: chip style per calendar `date_type` (matches icon colors in calendar toolbar).
 * `date_type` values come from calendar API (e.g. agreement_start_date, rent_start_date, ...).
 */
export function getCalendarAgreementDateTypeStyle(dateType) {
  const idx = CALENDAR_DATE_FIELD_OPTIONS.findIndex((opt) => opt.value === dateType);
  const safeIdx = idx >= 0 ? idx : 0;
  const accentColor = CALENDAR_AGREEMENT_COLORS[safeIdx % CALENDAR_AGREEMENT_COLORS.length];
  const background = CALENDAR_AGREEMENT_GRADIENTS[safeIdx % CALENDAR_AGREEMENT_GRADIENTS.length];
  return {
    textColor: accentColor,
    background,
    accentColor,
  };
}

/** Status badge config for agreement status (Active, Expired, etc.) */
export function getStatusBadge(status) {
  const normalized = String(status || '')
    .trim()
    .toLowerCase();
  if (normalized === 'active') return { label: 'ACTIVE', color: 'green' };
  if (normalized === 'expired') return { label: 'EXPIRED', color: 'red' };
  if (normalized === 'upcoming') return { label: 'UPCOMING', color: 'blue' };
  if (normalized === 'updated') return { label: 'UPDATED', color: 'red' };
  return { label: (status || '--').toString().toUpperCase(), color: 'gray' };
}

/**
 * Normalizes Frappe/child `space` rows: Link/Select, `{ plans }`, `plan` string, etc. → `["…"]`.
 */
export function membershipPlanValues(raw) {
  const cell = (x) => {
    if (x == null) return null;
    if (typeof x !== 'object' || x instanceof Date) return x;
    let v =
      x.space_types ??
      (typeof x.membership_plan === 'string' || typeof x.membership_plan === 'number'
        ? x.membership_plan
        : null) ??
      x.plans ??
      x.plan ??
      x.inventory_type ??
      x.inventory_plan ??
      x.inventory_plans ??
      x.name ??
      x.title ??
      x.value ??
      x.label;
    if (v == null && x.membership_plan != null && typeof x.membership_plan === 'object') {
      v = cell(x.membership_plan);
    }
    if (v == null) return null;
    return typeof v === 'object' && v !== null && !(v instanceof Date) ? cell(v) : v;
  };
  return (Array.isArray(raw) ? raw : raw == null || raw === '' ? [] : [raw])
    .map((x) => cell(x))
    .filter((s) => s != null && s !== '' && typeof s !== 'object')
    .map((s) => String(s).trim());
}

/**
 * Child / assign-space row from Agreement or get_assign_space_data: `space_types` is the plan key
 * on many APIs; also checks nested `space` link.
 */
export function membershipPlanValuesFromSpaceDetailRow(row) {
  if (row == null) return [];
  if (typeof row !== 'object' || row instanceof Date) {
    return membershipPlanValues(row);
  }
  const fromTop = membershipPlanValues(
    row.membership_plan ??
      row.membership_plans ??
      row.space_types ??
      row.assign_space_type ??
      row.space_type ??
      row.plan ??
      row.plans,
  );
  if (fromTop.length > 0) return fromTop;
  const sp = row.space;
  if (sp && typeof sp === 'object' && !Array.isArray(sp) && !(sp instanceof Date)) {
    return membershipPlanValues(
      sp.membership_plan ??
        sp.membership_plans ??
        sp.space_types ??
        sp.assign_space_type ??
        sp.space_type ??
        sp.plans ??
        sp.plan ??
        sp.name,
    );
  }
  return [];
}

/** Membership plan badge config */
export function getMembershipBadge(plan) {
  const resolved =
    plan != null && typeof plan === 'object' && !Array.isArray(plan)
      ? (membershipPlanValues([plan])[0] ?? null)
      : plan;
  const normalized = String(resolved || '')
    .trim()
    .toLowerCase();
  if (normalized.includes('managed')) return { label: 'MANAGED OFFICE', color: 'purple' };
  if (normalized.includes('co')) return { label: 'CO-WORKING', color: 'orange' };
  if (normalized.includes('resource')) return { label: 'RESOURCE', color: 'pink' };
  return {
    label: (resolved == null || resolved === '' ? '--' : String(resolved)).toUpperCase(),
    color: 'gray',
  };
}

/** Format currency for agreement tables (₹ with en-IN locale) */
export function formatAgreementCurrency(value) {
  if (value == null || value === '') return '--';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `₹ ${num.toLocaleString('en-IN')}`;
}

// Amendment rows (previous versions) for the Dev Accelerator agreement – shown when parent is expanded
const DEVX_AMENDMENT_V2 = {
  name: 'DEVX-BKC-DD-2026-V2',
  clientName: 'Dev Accelerator Limited',
  center: 'Skyline Hub (BOM)',
  space: 'Managed Office 1',
  membershipPlan: 'MANAGED OFFICE',
  seats: 40,
  areaSqFt: 12200,
  pricePerSeat: 3750,
  monthlyRevenueWithGst: 157500,
  monthlyRevenueWithoutGst: 150000,
  noOfMDeposit: 2,
  agreementStartDate: '2024-04-01',
  rentStartDate: '2024-04-01',
  contractEndDate: '2027-03-31',
  lockInPeriod: '18 Months',
  lockInEndDate: '2025-09-30',
  incrementDate: '2025-04-01',
  annualEscalation: '7.5%',
  dueDate: 5,
  type: 'Managed Office',
  roc: 'Yes',
  changeType: 'Seat Change',
  noticePeriodClient: '3 Months',
  noticePeriodDevX: '3 Months',
  status: 'Active',
  createdBy: 'John Doe',
  createdAt: '2024-03-15T10:00:00Z',
  lastModifiedAt: '2024-06-20T14:30:00Z',
};

const DEVX_AMENDMENT_V1 = {
  name: 'DEVX-BKC-DD-2026-V1',
  clientName: 'Dev Accelerator Limited',
  center: 'Skyline Hub (BOM)',
  space: 'Managed Office 1',
  membershipPlan: 'MANAGED OFFICE',
  seats: 40,
  areaSqFt: 12200,
  pricePerSeat: 3750,
  monthlyRevenueWithGst: 157500,
  monthlyRevenueWithoutGst: 150000,
  noOfMDeposit: 2,
  agreementStartDate: '2024-01-01',
  rentStartDate: '2024-01-01',
  contractEndDate: '2026-12-31',
  lockInPeriod: '12 Months',
  lockInEndDate: '2024-12-31',
  incrementDate: '2025-01-01',
  annualEscalation: '5%',
  dueDate: 5,
  type: 'Managed Office',
  roc: 'No',
  changeType: '-',
  noticePeriodClient: '3 Months',
  noticePeriodDevX: '3 Months',
  status: 'Active',
  createdBy: 'John Doe',
  createdAt: '2023-12-01T10:00:00Z',
  lastModifiedAt: '2024-03-10T12:00:00Z',
};

// Temporary dummy data for agreements list view – matches Column Manager column set
// Rows may include an `amendments` array; when present, the row shows an expand arrow to reveal amendment rows.
// NOTE: This will be replaced with API data later.
export const AGREEMENTS_DUMMY_DATA = [
  {
    name: 'DEVX-BKC-DD-2026-V3',
    clientName: 'Dev Accelerator Limited',
    center: 'Skyline Hub (BOM)',
    space: 'Managed Office 1',
    membershipPlan: 'MANAGED OFFICE',
    seats: 40,
    areaSqFt: 12200,
    pricePerSeat: 3750,
    monthlyRevenueWithGst: 157500,
    monthlyRevenueWithoutGst: 150000,
    noOfMDeposit: 2,
    agreementStartDate: '2026-02-01',
    rentStartDate: '2026-02-01',
    contractEndDate: '2026-03-01',
    lockInPeriod: '18 Months',
    lockInEndDate: '2027-08-01',
    incrementDate: '2027-02-01',
    annualEscalation: '7.5%',
    dueDate: 5,
    type: 'Managed Office',
    roc: 'Yes',
    changeType: 'Seat Change',
    noticePeriodClient: '3 Months',
    noticePeriodDevX: '3 Months',
    status: 'Active',
    createdBy: 'John Doe',
    createdAt: '2026-02-15T10:00:00Z',
    lastModifiedAt: '2026-03-01T14:30:00Z',
    amendments: [DEVX_AMENDMENT_V2, DEVX_AMENDMENT_V1],
  },
  {
    name: 'AURA-AMD-DD-V1',
    clientName: 'Aura Collective',
    center: 'Orion Tech Park (AMD)',
    space: 'Dedicated Desk Zone 1',
    membershipPlan: 'CO-WORKING',
    seats: 50,
    areaSqFt: 23000,
    pricePerSeat: 6400,
    monthlyRevenueWithGst: 352000,
    monthlyRevenueWithoutGst: 320000,
    noOfMDeposit: 2,
    agreementStartDate: '2025-11-01',
    rentStartDate: '2025-11-01',
    contractEndDate: '2026-10-31',
    lockInPeriod: '12 Months',
    lockInEndDate: '2026-10-31',
    incrementDate: '2026-11-01',
    annualEscalation: '5%',
    dueDate: 1,
    type: 'Co-working',
    roc: 'No',
    changeType: '-',
    noticePeriodClient: '2 Months',
    noticePeriodDevX: '2 Months',
    status: 'Active',
    createdBy: 'Jane Smith',
    createdAt: '2025-11-10T09:00:00Z',
    lastModifiedAt: '2026-02-20T11:00:00Z',
  },
  {
    name: 'UNIC-AMD-DD-V2',
    clientName: 'Unicorn 9 Overseas',
    center: 'Orion Tech Park (AMD)',
    space: 'Dedicated Desk Zone 2',
    membershipPlan: 'CO-WORKING',
    seats: 30,
    areaSqFt: 18000,
    pricePerSeat: 2417,
    monthlyRevenueWithGst: 72510,
    monthlyRevenueWithoutGst: 72510,
    noOfMDeposit: 1,
    agreementStartDate: '2025-07-15',
    rentStartDate: '2025-07-15',
    contractEndDate: '2026-07-14',
    lockInPeriod: '12 Months',
    lockInEndDate: '2026-07-14',
    incrementDate: '2026-07-15',
    annualEscalation: '6%',
    dueDate: 10,
    type: 'Co-working',
    roc: 'Yes',
    changeType: 'Price Change',
    noticePeriodClient: '3 Months',
    noticePeriodDevX: '3 Months',
    status: 'Active',
    createdBy: 'Admin User',
    createdAt: '2025-07-01T08:00:00Z',
    lastModifiedAt: '2026-01-20T16:45:00Z',
  },
  {
    name: 'MIDT-RJT-FD-V2',
    clientName: 'Midtown CoLab',
    center: 'Harbour View (RJT)',
    space: 'Flexi Desk Open Area',
    membershipPlan: 'CO-WORKING',
    seats: 40,
    areaSqFt: 12200,
    pricePerSeat: 1700,
    monthlyRevenueWithGst: 74800,
    monthlyRevenueWithoutGst: 68000,
    noOfMDeposit: 1,
    agreementStartDate: '2026-03-01',
    rentStartDate: '2026-03-01',
    contractEndDate: '2028-02-29',
    lockInPeriod: '24 Months',
    lockInEndDate: '2028-02-29',
    incrementDate: '2027-03-01',
    annualEscalation: '5%',
    dueDate: 1,
    type: 'Co-working',
    roc: 'No',
    changeType: '-',
    noticePeriodClient: '3 Months',
    noticePeriodDevX: '3 Months',
    status: 'Active',
    createdBy: 'Jane Smith',
    createdAt: '2026-02-20T12:00:00Z',
    lastModifiedAt: '2026-03-02T12:00:00Z',
  },
  {
    name: 'PERS-BOM-MC-V1',
    clientName: 'Persistent Systems Limited',
    center: 'Skyline Hub (BOM)',
    space: 'Manager Cabin B2',
    membershipPlan: 'RESOURCE',
    seats: 10,
    areaSqFt: 3200,
    pricePerSeat: 12000,
    monthlyRevenueWithGst: 132000,
    monthlyRevenueWithoutGst: 120000,
    noOfMDeposit: 1,
    agreementStartDate: '2025-04-01',
    rentStartDate: '2025-04-01',
    contractEndDate: '2026-03-31',
    lockInPeriod: '6 Months',
    lockInEndDate: '2025-09-30',
    incrementDate: '2026-04-01',
    annualEscalation: '0%',
    dueDate: 1,
    type: 'Resource',
    roc: 'No',
    changeType: '-',
    noticePeriodClient: '1 Month',
    noticePeriodDevX: '1 Month',
    status: 'Active',
    createdBy: 'John Doe',
    createdAt: '2025-03-15T10:30:00Z',
    lastModifiedAt: '2026-02-10T09:00:00Z',
  },
  {
    name: 'DURV-BOM-MR-V1',
    clientName: 'Durva Group',
    center: 'Skyline Hub (BOM)',
    space: 'Meeting Room Beta',
    membershipPlan: 'RESOURCE',
    seats: 12,
    areaSqFt: 2800,
    pricePerSeat: 7500,
    monthlyRevenueWithGst: 99000,
    monthlyRevenueWithoutGst: 90000,
    noOfMDeposit: 1,
    agreementStartDate: '2025-12-01',
    rentStartDate: '2025-12-01',
    contractEndDate: '2026-11-30',
    lockInPeriod: '3 Months',
    lockInEndDate: '2026-03-01',
    incrementDate: '-',
    annualEscalation: '0%',
    dueDate: 5,
    type: 'Resource',
    roc: 'No',
    changeType: '-',
    noticePeriodClient: '1 Month',
    noticePeriodDevX: '1 Month',
    status: 'Active',
    createdBy: 'Admin User',
    createdAt: '2025-11-15T14:00:00Z',
    lastModifiedAt: '2026-01-15T14:00:00Z',
  },
];
