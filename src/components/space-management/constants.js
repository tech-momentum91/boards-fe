import {
  RiCheckboxCircleFill,
  RiCheckboxCircleLine,
  RiTimeLine,
  RiUserLine,
  RiMoneyRupeeCircleLine,
  RiAlertLine,
  RiPriceTag3Line,
  RiLayoutGridLine,
  RiBox3Line,
  RiMoneyDollarBoxFill,
  RiMoneyDollarCircleFill,
  RiTimeFill,
  RiTokenSwapFill,
  RiParkingLine,
  RiCommunityLine,
} from 'react-icons/ri';
import { SPACE_TYPE } from '@/schemas/space-schema';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';

export const SPACE_STATUS_TAB_OPTIONS = [
  { value: 'all', label: 'All', icon: null },
  { value: 'Occupied', label: 'Occupied Space', icon: RiUserLine },
  { value: 'Available', label: 'Available Space', icon: RiCheckboxCircleLine },
  { value: 'On Notice', label: 'On Notice', icon: RiAlertLine },
  { value: 'Resource', label: 'Resources', icon: RiBox3Line },
  { value: 'Parking', label: 'Parking', icon: RiParkingLine },
  { value: 'Common Area', label: 'Common Area', icon: RiCommunityLine },
];

/** Inventory-type tabs (not status tabs) — filter list by `inventory_type`. */
export const SPACE_INVENTORY_TYPE_TAB_VALUES = ['Resource', 'Parking', 'Common Area'];

/** Status tab values shown when primary role is Sales or Inside Sales (Occupied hidden). */
export const SPACE_STATUS_TAB_VALUES_SALES_INSIDE_SALES = [
  'all',
  'Available',
  'On Notice',
  'Resource',
  'Parking',
  'Common Area',
];

export const DEFAULT_SPACE_FILTERS = {
  search: '',
  status: 'all',
};

export const EMPTY_STATES = {
  default: {
    title: 'No spaces yet',
    description: 'Create your first space to get started.',
  },
  search: {
    title: 'No spaces match these filters',
    description: 'Try adjusting filters or clearing search.',
  },
};

/** Dropdown-only defaults for Spaces list (session compact / merge). Not search/sorting/tabs. */
export const SPACE_LIST_APPLIED_FILTER_DEFAULTS = {
  center: [],
  client: [],
  status: [],
  spaceType: [],
  availableSeats: '',
  zone: [],
  parkingType: [],
  assigningType: [],
};

export const PARKING_TYPE_FILTER_OPTIONS = [
  { label: 'Non Stackable', value: 'Non Stackable' },
  { label: 'Dual Stackable', value: 'Dual Stackable' },
  { label: 'Triple Stackable', value: 'Triple Stackable' },
];

export const ASSIGNING_TYPE_FILTER_OPTIONS = [
  { label: 'FCFS', value: 'FCFS' },
  { label: 'Dedicated', value: 'Dedicated' },
];

/**
 * Build API filter tuples from the space filter dropdown model. Zone selections expand to
 * centers using centerAccessData. When both zone and center are selected, centers must match
 * both (intersection). When only one is selected, that constraint alone applies.
 */
export function buildSpaceListApiFiltersFromApplied(filters, centerAccessData) {
  const filtersArray = [];
  const centersData = Array.isArray(centerAccessData) ? centerAccessData : [];

  const selectedCenters = Array.isArray(filters?.center) ? filters.center.filter(Boolean) : [];
  const selectedZones = Array.isArray(filters?.zone) ? filters.zone.filter(Boolean) : [];

  const getCentersInZones = (zones) =>
    centersData
      .filter((c) => zones.includes(c.zone))
      .map((c) => c.name || c.center_name)
      .filter(Boolean);

  let combinedCenters = [];

  if (selectedZones.length > 0 && selectedCenters.length > 0) {
    const zoneCenterSet = new Set(getCentersInZones(selectedZones));
    combinedCenters = selectedCenters.filter((c) => zoneCenterSet.has(c));
  } else if (selectedZones.length > 0) {
    combinedCenters = getCentersInZones(selectedZones);
  } else if (selectedCenters.length > 0) {
    combinedCenters = selectedCenters;
  }

  combinedCenters = [...new Set(combinedCenters)];

  if (selectedZones.length > 0 || selectedCenters.length > 0) {
    if (combinedCenters.length === 1) {
      filtersArray.push(['center', '=', combinedCenters[0]]);
    } else if (combinedCenters.length > 1) {
      filtersArray.push(['center', 'in', combinedCenters]);
    } else {
      // Explicit zone/center filter with no matching centres — match nothing.
      filtersArray.push(['name', '=', '']);
    }
  }

  const otherFieldsMap = {
    status: 'status',
    spaceType: 'inventory_type',
    parkingType: 'parking_type',
    assigningType: 'assigning_type',
  };
  Object.entries(otherFieldsMap).forEach(([key, field]) => {
    const values = filters?.[key];
    if (Array.isArray(values) && values.length > 0) {
      if (values.length === 1) {
        filtersArray.push([field, '=', values[0]]);
      } else {
        filtersArray.push([field, 'in', values]);
      }
    }
  });

  if (filters?.availableSeats) {
    const seatsValue = Number(filters.availableSeats);
    if (!Number.isNaN(seatsValue) && seatsValue > 0) {
      filtersArray.push(['available_seats', '>=', seatsValue]);
    }
  }

  return filtersArray;
}

/**
 * Serialize filters for `get_space_listview`.
 * Supports legacy tuple arrays and the new object shape `{ clients: [...] }`.
 * When clients are selected, tuples (if any) are sent as `filter_conditions`.
 *
 * @param {Array<[string, string, unknown]>} tupleFilters
 * @param {object} [appliedFilters]
 * @returns {Array | object | undefined}
 */
export function buildSpaceListviewFiltersPayload(tupleFilters, appliedFilters) {
  const clients = Array.isArray(appliedFilters?.client)
    ? appliedFilters.client.map((id) => String(id || '').trim()).filter(Boolean)
    : [];
  const tuples = Array.isArray(tupleFilters) ? tupleFilters : [];

  if (clients.length === 0) {
    return tuples.length > 0 ? tuples : undefined;
  }

  const payload = { clients };
  if (tuples.length > 0) {
    payload.filter_conditions = tuples;
  }
  return payload;
}

export function compactSpaceListFiltersForStorage(filters) {
  return compactFiltersForSessionStorage(filters, SPACE_LIST_APPLIED_FILTER_DEFAULTS, {
    includeKeys: [
      'center',
      'client',
      'status',
      'spaceType',
      'zone',
      'availableSeats',
      'parkingType',
      'assigningType',
    ],
    trimStringArrayElements: true,
    positiveNumberStringKeys: ['availableSeats'],
  });
}

export function mergeStoredSpaceListFilters(stored) {
  const base = { ...SPACE_LIST_APPLIED_FILTER_DEFAULTS };
  if (!stored || typeof stored !== 'object') return base;
  return {
    ...base,
    center: Array.isArray(stored.center) ? stored.center : base.center,
    client: Array.isArray(stored.client) ? stored.client : base.client,
    status: Array.isArray(stored.status) ? stored.status : base.status,
    spaceType: Array.isArray(stored.spaceType) ? stored.spaceType : base.spaceType,
    zone: Array.isArray(stored.zone) ? stored.zone : base.zone,
    availableSeats:
      stored.availableSeats !== undefined && stored.availableSeats !== null
        ? String(stored.availableSeats)
        : base.availableSeats,
    parkingType: Array.isArray(stored.parkingType) ? stored.parkingType : base.parkingType,
    assigningType: Array.isArray(stored.assigningType) ? stored.assigningType : base.assigningType,
  };
}

/** True when the space filter dropdown has any non-default selection. */
export function hasSpaceListAppliedFilters(af) {
  if (!af || typeof af !== 'object') return false;
  const arrays = [
    'center',
    'client',
    'status',
    'spaceType',
    'zone',
    'parkingType',
    'assigningType',
  ].some((k) => Array.isArray(af[k]) && af[k].length > 0);
  const seats =
    af.availableSeats !== undefined &&
    af.availableSeats !== null &&
    String(af.availableSeats).trim() !== '' &&
    Number(af.availableSeats) > 0;
  return arrays || seats;
}

export const getSpaceStatusBadge = (status) => {
  const normalized = String(status || '')
    .trim()
    .toLowerCase();

  if (normalized === 'occupied') return { label: 'OCCUPIED', color: 'blue' };
  if (normalized === 'available') return { label: 'AVAILABLE', color: 'green' };
  if (normalized === 'reserved') return { label: 'RESERVED', color: 'orange' };
  if (normalized === 'left') return { label: 'LEFT', color: 'red' };
  if (normalized === 'on notice' || normalized === 'on-notice') {
    return { label: 'ON NOTICE', color: 'orange' };
  }
  if (normalized === 'notice') return { label: 'NOTICE', color: 'red' };
  if (normalized === 'inactive') return { label: 'INACTIVE', color: 'gray' };

  return { label: (status || '--').toString().toUpperCase(), color: 'gray' };
};

export const getSpaceTypeBadge = (value) => {
  const purpleLight = 'var(--color-purple-light)';
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (normalized.includes('managed')) return { label: 'MANAGED OFFICE', color: 'purple' };
  if (normalized.includes('co-work')) return { label: 'CO-WORKING', color: 'orange' };
  if (normalized.includes('common')) return { label: 'COMMON AREA', color: 'sky' };
  if (normalized.includes('resource')) return { label: 'RESOURCE', color: 'pink' };
  if (normalized.includes('parking')) return { label: 'PARKING', color: 'gray' };
  if (normalized.includes('pure')) return { label: 'PURE RENTAL', color: 'teal' };

  return { label: (value || '--').toString().toUpperCase(), color: 'gray' };
};

export const getSubSpaceTypeBadge = (value) => {
  const label = (value || '--').toString().toUpperCase();
  return { label, color: 'gray' };
};
export const ACTUAL_CARPET_DECIMAL_RE = /^\d*\.?\d{0,2}$/;

export const formatActualCarpetDecimal = (n) =>
  Number.isFinite(n) ? (Number.isInteger(n) ? String(n) : n.toFixed(2)) : '';

export const calcActualCarpetPctFromSqft = (sqft, agreementArea) => {
  const a = Number.parseFloat(agreementArea);
  const s = Number.parseFloat(sqft);
  return Number.isFinite(a) && a > 0 && Number.isFinite(s)
    ? formatActualCarpetDecimal((s / a) * 100)
    : '';
};

export const calcActualCarpetSqftFromPct = (pct, agreementArea) => {
  const a = Number.parseFloat(agreementArea);
  const p = Number.parseFloat(pct);
  return Number.isFinite(a) && Number.isFinite(p) ? formatActualCarpetDecimal((a * p) / 100) : '';
};

export const isValidActualCarpetDecimalInput = (value) =>
  value === '' || ACTUAL_CARPET_DECIMAL_RE.test(value);

export const officeFields = [
  {
    id: 'managed_office_type',
    label: 'Manage Office Type',
    icon: RiPriceTag3Line,
    type: 'select',
    required: true,
    placeholder: 'Select',
    options: [
      { label: 'Fitted Out', value: 'Fitted Out' },
      { label: 'Bare Shell', value: 'Bare Shell' },
    ],
    defaultValue: 'Fitted Out',
  },
  {
    id: 'total_carpet_area',
    label: 'Agreement Carpet Area',
    icon: RiLayoutGridLine,
    type: 'input',
    placeholder: 'Enter agreement carpet area',
    suffix: 'sq.ft.',
  },
  {
    id: 'actual_carpet_area',
    label: 'Actual Carpet Area',
    icon: RiLayoutGridLine,
    type: 'input',
    placeholder: 'Enter actual carpet area',
  },
  {
    id: 'expected_carpet_rate',
    label: 'Expected Carpet Rate',
    icon: RiMoneyRupeeCircleLine,
    type: 'input',
    placeholder: 'Enter rate per sq.ft.',
    suffix: '₹',
  },
  {
    id: 'total_seats',
    label: 'Total Sellable Seats',
    icon: RiBox3Line,
    type: 'input',
    placeholder: 'Enter total number of seats',
  },
  {
    id: 'expected_per_seat_rate',
    label: 'Expected Per Seat Rate',
    icon: RiMoneyRupeeCircleLine,
    type: 'input',
    placeholder: 'Enter rate per seat',
    suffix: '₹',
  },
  {
    id: 'no_of_workstations',
    label: 'No of Workstations',
    icon: RiPriceTag3Line,
    type: 'input',
    placeholder: 'Enter total no. of workstations',
  },
  {
    id: 'director_cabins',
    label: 'Director Cabins',
    icon: RiPriceTag3Line,
    type: 'input',
    placeholder: 'Enter total no. of director cabins',
  },
  {
    id: 'manager_cabins',
    label: 'Manager Cabins',
    icon: RiPriceTag3Line,
    type: 'input',
    placeholder: 'Enter total no. of manager cabins',
  },
  {
    id: 'meeting_rooms',
    label: 'Meeting Rooms',
    icon: RiPriceTag3Line,
    type: 'input',
    placeholder: 'Enter total no. of meeting rooms',
  },
  {
    id: 'conference_rooms',
    label: 'Conference Rooms',
    icon: RiPriceTag3Line,
    type: 'input',
    placeholder: 'Enter total no. of conference rooms',
  },
  {
    id: 'phonebooths',
    label: 'Phonebooths',
    icon: RiPriceTag3Line,
    type: 'input',
    placeholder: 'Enter total no. of phonebooths',
  },
  {
    id: 'breakout_zones',
    label: 'Breakout Zones',
    icon: RiPriceTag3Line,
    type: 'input',
    placeholder: 'Enter total no. of breakout zones',
  },
  {
    id: 'credit_per_seat',
    label: 'Credit Per Seat',
    icon: RiPriceTag3Line,
    type: 'input',
    defaultValue: '2',
  },
  {
    id: 'total_rate_of_space',
    label: 'Total Rate of Space',
    icon: RiMoneyRupeeCircleLine,
    type: 'input',
    defaultValue: '-',
    readOnly: true,
  },
];

export const FALLBACK_CENTERS = [
  { label: 'The First (AMD)', value: 'The First (AMD)' },
  { label: 'Capital Edge Center', value: 'Capital Edge Center' },
  { label: 'MetroPoint Workspace', value: 'MetroPoint Workspace' },
  { label: 'Zenith Innovation Hub', value: 'Zenith Innovation Hub' },
];

export const FLOOR_OPTIONS = [
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
];

export const SPACE_TYPE_OPTIONS = [
  { label: SPACE_TYPE.MANAGED_OFFICE, value: SPACE_TYPE.MANAGED_OFFICE },
  { label: SPACE_TYPE.CO_WORKING, value: SPACE_TYPE.CO_WORKING },
  { label: SPACE_TYPE.RESOURCE, value: SPACE_TYPE.RESOURCE },
  { label: SPACE_TYPE.PARKING, value: SPACE_TYPE.PARKING },
  { label: SPACE_TYPE.PURE_RENTAL, value: SPACE_TYPE.PURE_RENTAL },
];

export const STATUS_OPTIONS = [
  { label: 'Available', value: 'Available' },
  { label: 'Occupied', value: 'Occupied' },
  { label: 'On Notice', value: 'Notice' },
  // { label: 'Inactive', value: 'Inactive' },
  // { label: 'Reserved', value: 'Reserved' },
  // { label: 'Left', value: 'Left' },
  // { label: 'Notice', value: 'Notice' },
];

/** Assign Space statuses in occupancy history drawer status dropdown. */
export const SPACE_OCCUPANCY_STATUS_OPTIONS = ['Occupied', 'On Notice', 'Left'];

export const OCCUPANCY_STATUS_OPTIONS = SPACE_OCCUPANCY_STATUS_OPTIONS.map((value) => ({
  label: value,
  value,
}));

export const CO_WORKING_SPACE_TYPE_OPTIONS = [
  { label: 'Private Cabin', value: 'Private Cabin' },
  { label: 'Manager Cabin', value: 'Manager Cabin' },
  { label: 'Dedicated Desk', value: 'Dedicated Desk' },
  { label: 'Hot Desk', value: 'Hot Desk' },
];

export const PURE_RENTAL_TYPE_OPTIONS = [
  { label: 'Furnished', value: 'Furnished' },
  { label: 'Unfurnished', value: 'Unfurnished' },
];

export const pureRentalFields = [
  {
    id: 'pure_rental_type',
    label: 'Pure Rental Type',
    icon: RiPriceTag3Line,
    type: 'select',
    required: true,
    placeholder: 'Select',
    options: PURE_RENTAL_TYPE_OPTIONS,
  },
  {
    id: 'total_carpet_sft',
    label: 'Agreement Carpet Area',
    icon: RiLayoutGridLine,
    type: 'input',
    required: true,
    placeholder: 'Enter agreement carpet area',
    suffix: 'sq.ft.',
  },
  {
    id: 'actual_carpet_area',
    label: 'Actual Carpet Area',
    icon: RiLayoutGridLine,
    type: 'input',
    placeholder: 'Enter actual carpet area',
  },
  {
    id: 'expected_carpet_rate',
    label: 'Expected Carpet Rate',
    icon: RiMoneyRupeeCircleLine,
    type: 'input',
    required: true,
    placeholder: 'Enter rate per sq.ft.',
    suffix: '₹',
  },
];

// ----------------------------
// Space detail – mock constants (temporary)
// ----------------------------

export const SPACE_DETAIL_OCCUPANCY_TABLE_ID = 'space-detail-occupancy-history';

/** Center list pref `react_table_id` for space detail occupancy history column manager. */
export const CENTER_OCCUPANCY_HISTORY_TABLE_ID = 'center occupancy history';

/** Values match occupancy history row fields used for client-side grouping */
export const OCCUPANCY_GROUP_BY_OPTIONS = [
  { value: 'client', label: 'Client' },
  { value: 'status', label: 'Status' },
  { value: 'center', label: 'Centre' },
];

export const ASSIGN_SPACE_STATUS_OPTIONS = [
  { value: 'Locked', label: 'Locked' },
  { value: 'Occupied', label: 'Occupied' },
  { value: 'Left', label: 'Left' },
];

export const DEFAULT_OCCUPANCY_FILTERS = {
  clientName: [],
  status: [],
  leaseDateFrom: null,
  leaseDateTo: null,
  totalCredits: '',
  pricePerSeat: '',
  totalPrice: '',
};

/** Session key prefix for space detail occupancy history filter dropdown (suffix with space id). */
export const OCCUPANCY_HISTORY_FILTER_SESSION_KEY =
  'space-detail-occupancy-history-filter-dropdown';

export const OCCUPANCY_HISTORY_FILTER_PERSIST_INCLUDE_KEYS = [
  'clientName',
  'status',
  'leaseDateFrom',
  'leaseDateTo',
  'totalCredits',
  'pricePerSeat',
  'totalPrice',
];

export const OCCUPANCY_HISTORY_FILTER_PERSIST_POSITIVE_NUMBER_STRING_KEYS = [
  'totalCredits',
  'pricePerSeat',
  'totalPrice',
];

export function compactOccupancyHistoryFiltersForStorage(filters) {
  return compactFiltersForSessionStorage(filters, DEFAULT_OCCUPANCY_FILTERS, {
    includeKeys: OCCUPANCY_HISTORY_FILTER_PERSIST_INCLUDE_KEYS,
    trimStringArrayElements: true,
    positiveNumberStringKeys: OCCUPANCY_HISTORY_FILTER_PERSIST_POSITIVE_NUMBER_STRING_KEYS,
  });
}

export function mergeStoredOccupancyHistoryFilters(stored) {
  const base = { ...DEFAULT_OCCUPANCY_FILTERS };
  if (!stored || typeof stored !== 'object') return base;

  const toSliderString = (value, fallback) => {
    if (value === undefined || value === null || value === '') return fallback;
    const n = Number(value);
    return !Number.isNaN(n) && n > 0 ? String(value) : fallback;
  };

  return {
    ...base,
    clientName: Array.isArray(stored.clientName) ? stored.clientName : base.clientName,
    status: Array.isArray(stored.status) ? stored.status : base.status,
    leaseDateFrom: stored.leaseDateFrom ?? base.leaseDateFrom,
    leaseDateTo: stored.leaseDateTo ?? base.leaseDateTo,
    totalCredits: toSliderString(stored.totalCredits, base.totalCredits),
    pricePerSeat: toSliderString(stored.pricePerSeat, base.pricePerSeat),
    totalPrice: toSliderString(stored.totalPrice, base.totalPrice),
  };
}

/** Frontend-managed occupancy history columns (no get_list_pref). */
export const OCCUPANCY_HISTORY_DEFAULT_COLUMNS = [
  { id: 'client_name', label: 'Client Name', visible: true },
  { id: 'lease_duration', label: 'Lease Duration', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'total_credits', label: 'Total Credits', visible: true },
  { id: 'price_per_seat', label: 'Price/Seat', visible: true },
  { id: 'total_price', label: 'Total Price', visible: true },
];

const isOccupancyUpperBoundFilterActive = (selectedValue, columnMax) => {
  const selected = Number(selectedValue) || 0;
  const max = Number(columnMax) || 0;
  return selected > 0 && max > 0 && selected < max;
};

/** Build API filter tuples for get_allocated_space_listview */
export function buildOccupancyApiFiltersFromApplied(filters = {}, columnMaxLimits = {}) {
  const payload = [];
  const clientNames = Array.isArray(filters.clientName) ? filters.clientName : [];
  if (clientNames.length > 0) {
    payload.push(['customer_name', 'in', clientNames]);
  }

  const statuses = Array.isArray(filters.status) ? filters.status : [];
  if (statuses.length > 0) {
    payload.push(['status', 'in', statuses]);
  }

  if (filters.leaseDateFrom) {
    payload.push(['lease_date_from', '=', filters.leaseDateFrom]);
  }
  if (filters.leaseDateTo) {
    payload.push(['lease_date_to', '=', filters.leaseDateTo]);
  }

  if (isOccupancyUpperBoundFilterActive(filters.totalCredits, columnMaxLimits.totalCredits)) {
    payload.push(['total_credits', '<=', Number(filters.totalCredits)]);
  }
  if (isOccupancyUpperBoundFilterActive(filters.pricePerSeat, columnMaxLimits.pricePerSeat)) {
    payload.push(['expected_per_seat_rate', '<=', Number(filters.pricePerSeat)]);
  }
  if (isOccupancyUpperBoundFilterActive(filters.totalPrice, columnMaxLimits.totalPrice)) {
    payload.push(['total_rate', '<=', Number(filters.totalPrice)]);
  }

  return payload;
}

export const SPACE_DETAIL_STAT_DEFS = {
  availableSeats: { label: 'Available Seats', icon: RiBox3Line },
  totalRevenue: { label: 'Total Revenue', icon: RiMoneyDollarBoxFill },
  totalPrice: { label: 'Total Price', icon: RiMoneyDollarCircleFill },
  avgLease: { label: 'Avg. Lease Duration', icon: RiTimeFill },
  totalCredits: { label: 'Total Credits', icon: RiTokenSwapFill },
};

export const normalizeSpaceTypeKey = (spaceType) => {
  const normalized = String(spaceType || '')
    .trim()
    .toLowerCase();

  if (normalized.includes('managed')) return 'managed';
  if (normalized.includes('co')) return 'coworking';
  if (normalized.includes('park')) return 'parking';
  if (normalized.includes('resource')) return 'resource';
  if (normalized.includes('pure')) return 'purerental';
  return 'managed';
};

/**
 * Space detail stats strip (per space type).
 * NOTE: values are placeholders for now; wire API later.
 */
export const getSpaceDetailStats = (space) => {
  const typeKey = normalizeSpaceTypeKey(space?.spaceType);

  const base = {
    totalPrice: '₹1,50,000',
    totalRevenue: '₹12,50,000',
    avgLease: '12 Months',
    totalCredits: '150',
  };

  if (typeKey === 'parking') {
    const o = space?._original || {};
    const total = Number(o.total_seats ?? 0);
    const available = Number(o.available_seats ?? total);
    const rate = Number(o.expected_per_seat_rate ?? o.expected_per_seat_cost ?? 0);
    const totalRate = Math.round(total * rate);
    const inr = (n) => (Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '--');
    return [
      {
        key: 'totalParkings',
        label: 'Total parkings',
        icon: SPACE_DETAIL_STAT_DEFS.availableSeats.icon,
        value: total || '--',
        iconColor: '#1F87AD',
        bgColor: '#E6F4FA',
      },
      {
        key: 'availableParkings',
        label: 'Available Parkings',
        icon: SPACE_DETAIL_STAT_DEFS.totalPrice.icon,
        value: available ?? '--',
        iconColor: '#5A36BF',
        bgColor: '#EEEBFF',
      },
      {
        key: 'expectedPerParkingRate',
        label: 'Expected Per Parking Rate',
        icon: SPACE_DETAIL_STAT_DEFS.totalRevenue.icon,
        value: rate ? inr(rate) : '--',
        iconColor: '#1F87AD',
        bgColor: '#E6F4FA',
      },
      {
        key: 'totalRateOfParking',
        label: 'Total Rate of Parking',
        icon: SPACE_DETAIL_STAT_DEFS.avgLease.icon,
        value: inr(totalRate),
        iconColor: '#C2540A',
        bgColor: '#FEF3EB',
      },
    ];
  }

  if (typeKey === 'coworking') {
    return [
      {
        key: 'availableSeats',
        label: SPACE_DETAIL_STAT_DEFS.availableSeats.label,
        icon: SPACE_DETAIL_STAT_DEFS.availableSeats.icon,
        value: space?.availableSeats ?? space?.totalSeats ?? '--',
        iconColor: '#1F87AD',
        bgColor: '#E6F4FA',
      },
      {
        key: 'totalPrice',
        label: SPACE_DETAIL_STAT_DEFS.totalPrice.label,
        icon: SPACE_DETAIL_STAT_DEFS.totalPrice.icon,
        value: base.totalPrice,
        iconColor: '#5A36BF',
        bgColor: '#EEEBFF',
      },
      {
        key: 'totalRevenue',
        label: SPACE_DETAIL_STAT_DEFS.totalRevenue.label,
        icon: SPACE_DETAIL_STAT_DEFS.totalRevenue.icon,
        value: base.totalRevenue,
        iconColor: '#1F87AD',
        bgColor: '#E6F4FA',
      },
      {
        key: 'avgLease',
        label: SPACE_DETAIL_STAT_DEFS.avgLease.label,
        icon: SPACE_DETAIL_STAT_DEFS.avgLease.icon,
        value: base.avgLease,
        iconColor: '#C2540A',
        bgColor: '#FEF3EB',
      },
      {
        key: 'totalCredits',
        label: SPACE_DETAIL_STAT_DEFS.totalCredits.label,
        icon: SPACE_DETAIL_STAT_DEFS.totalCredits.icon,
        value: base.totalCredits,
        iconColor: '#9C23A9',
        bgColor: '#FDEBFF',
      },
    ];
  }

  // managed + fallback
  return [
    {
      key: 'totalRevenue',
      label: SPACE_DETAIL_STAT_DEFS.totalRevenue.label,
      icon: SPACE_DETAIL_STAT_DEFS.totalRevenue.icon,
      value: base.totalRevenue,
      iconColor: '#1F87AD',
      bgColor: '#E6F4FA',
    },
    {
      key: 'totalPrice',
      label: SPACE_DETAIL_STAT_DEFS.totalPrice.label,
      icon: SPACE_DETAIL_STAT_DEFS.totalPrice.icon,
      value: base.totalPrice,
      iconColor: '#5A36BF',
      bgColor: '#EEEBFF',
    },
    {
      key: 'avgLease',
      label: SPACE_DETAIL_STAT_DEFS.avgLease.label,
      icon: SPACE_DETAIL_STAT_DEFS.avgLease.icon,
      value: base.avgLease,
      iconColor: '#C2540A',
      bgColor: '#FEF3EB',
    },
    {
      key: 'totalCredits',
      label: SPACE_DETAIL_STAT_DEFS.totalCredits.label,
      icon: SPACE_DETAIL_STAT_DEFS.totalCredits.icon,
      value: base.totalCredits,
      iconColor: '#9C23A9',
      bgColor: '#FDEBFF',
    },
  ];
};
// Field mapping for frontend to backend column names
export const FIELD_MAP = {
  spaceName: 'inventory_name',
  totalSeats: 'total_seats',
  availableSeats: 'available_seats',
  availableParking: 'available_seats',
  pax: 'pax',
  center: 'center_name',
  floor: 'floor',
  spaceType: 'inventory_type',
  status: 'status',
  opportunityLoss: 'opportunity_loss',
  timesBooked: 'times_booked',
  createdBy: 'owner',
  createdAt: 'creation',
  lastUpdated: 'modified',
};

/** Space detail main row tab id → sidebar module name for `read`. */
export const SPACE_DETAIL_MAIN_TAB_READ_MODULE = Object.freeze({
  about: 'Space',
  bookings: 'Space Booking',
  occupancy: 'Assign Space',
  finance: null,
  lease: null,
  assets: null,
  layout: null,
  'sub-space': null,
});
