import {
  RiBuildingLine,
  RiCheckDoubleLine,
  RiTimeLine,
  RiCloseLine,
  RiArchiveLine,
} from 'react-icons/ri';

import { NO_CENTERS_EMPTY_STATE } from '@/utils/global-center-filter';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';

export const STATUS_TAB_OPTIONS = [
  {
    value: 'all',
    label: 'All',
    icon: RiBuildingLine,
  },
  {
    value: 'Active',
    label: 'Active',
    icon: RiCheckDoubleLine,
  },
  {
    value: 'Upcoming',
    label: 'Upcoming',
    icon: RiTimeLine,
  },
  {
    value: 'Inactive',
    label: 'Inactive',
    icon: RiCloseLine,
  },
  // {
  //   value: 'Archived',
  //   label: 'Archived',
  //   icon: RiArchiveLine,
  // },
];

/** Normalize filter dropdown status values to canonical tab values. */
export const STATUS_TAB_LOOKUP = Object.fromEntries(
  STATUS_TAB_OPTIONS.filter((opt) => opt.value !== 'all').flatMap((opt) => [
    [opt.value.toLowerCase(), opt.value],
    [opt.value, opt.value],
  ]),
);

export const DEFAULT_FILTERS = {
  search: '',
  status: [],
};

export const DOCUMENT_TYPE_CATEGORY_ORDER = [
  'Building Compliance Documents',
  'DevX Documents',
  'Layouts',
];

/** Centers list — dropdown filter defaults (session compact / merge). */
export const CENTER_LIST_APPLIED_FILTER_DEFAULTS = {
  city: [],
  state: [],
  zone: [],
  status: [],
  micro_market: [],
  carpet_area: null,
};

export function compactCenterListFiltersForStorage(filters) {
  return compactFiltersForSessionStorage(filters, CENTER_LIST_APPLIED_FILTER_DEFAULTS, {
    includeKeys: ['city', 'state', 'zone', 'status', 'micro_market', 'carpet_area'],
    numericKeys: ['carpet_area'],
    trimStringArrayElements: true,
  });
}

export function mergeStoredCenterListFilters(stored) {
  const base = { ...CENTER_LIST_APPLIED_FILTER_DEFAULTS };
  if (!stored || typeof stored !== 'object') return base;
  return {
    ...base,
    city: Array.isArray(stored.city) ? stored.city : base.city,
    state: Array.isArray(stored.state) ? stored.state : base.state,
    zone: Array.isArray(stored.zone) ? stored.zone : base.zone,
    status: Array.isArray(stored.status) ? stored.status : base.status,
    micro_market: Array.isArray(stored.micro_market) ? stored.micro_market : base.micro_market,
    carpet_area:
      stored.carpet_area !== undefined && stored.carpet_area !== null
        ? stored.carpet_area
        : base.carpet_area,
  };
}

/** Center detail → Space tab filter dropdown model. */
export const CENTER_DETAIL_SPACE_TAB_FILTER_DEFAULTS = {
  floor: [],
  spaceType: [],
  status: [],
  seats: 0,
};

export const CENTER_DETAIL_SPACE_TAB_PERSIST_INCLUDE_KEYS = [
  'floor',
  'spaceType',
  'status',
  'seats',
];

export const CENTER_DETAIL_SPACE_TAB_PERSIST_POSITIVE_NUMERIC_KEYS = ['seats'];

export function compactCenterDetailSpaceTabFiltersForStorage(filters) {
  return compactFiltersForSessionStorage(filters, CENTER_DETAIL_SPACE_TAB_FILTER_DEFAULTS, {
    includeKeys: CENTER_DETAIL_SPACE_TAB_PERSIST_INCLUDE_KEYS,
    trimStringArrayElements: true,
    positiveNumericKeys: CENTER_DETAIL_SPACE_TAB_PERSIST_POSITIVE_NUMERIC_KEYS,
  });
}

export function mergeStoredCenterDetailSpaceTabFilters(stored) {
  const base = { ...CENTER_DETAIL_SPACE_TAB_FILTER_DEFAULTS };
  if (!stored || typeof stored !== 'object') return base;
  return {
    ...base,
    floor: Array.isArray(stored.floor) ? stored.floor : base.floor,
    spaceType: Array.isArray(stored.spaceType) ? stored.spaceType : base.spaceType,
    status: Array.isArray(stored.status) ? stored.status : base.status,
    seats:
      stored.seats !== undefined && stored.seats !== null && Number(stored.seats) > 0
        ? Number(stored.seats)
        : base.seats,
  };
}

/** Sparse applied filter object (only active keys) for Space tab UI + API. */
export function buildCenterDetailSpaceTabAppliedFilters(stored) {
  const merged = mergeStoredCenterDetailSpaceTabFilters(stored);
  const next = {};
  if (merged.floor?.length > 0) next.floor = merged.floor;
  if (merged.spaceType?.length > 0) next.spaceType = merged.spaceType;
  if (merged.status?.length > 0) next.status = merged.status;
  if (merged.seats > 0) next.seats = merged.seats;
  return next;
}

export function computeCenterDetailSpaceTabFilterCount(filters = {}) {
  return (
    (Array.isArray(filters.floor) ? filters.floor.length : 0) +
    (Array.isArray(filters.spaceType) ? filters.spaceType.length : 0) +
    (Array.isArray(filters.status) ? filters.status.length : 0) +
    (filters.seats > 0 ? 1 : 0)
  );
}

/** Center detail → Document tab filter dropdown model. */
export const CENTER_DETAIL_DOCUMENT_TAB_FILTER_DEFAULTS = {
  documentType: [],
  status: [],
  /** Inclusive ISO date strings (YYYY-MM-DD) for expiry-date range. */
  expiryDateFrom: null,
  expiryDateTo: null,
};

export const CENTER_DETAIL_DOCUMENT_TAB_PERSIST_INCLUDE_KEYS = [
  'documentType',
  'status',
  'expiryDateFrom',
  'expiryDateTo',
];

export const CENTER_DETAIL_DOCUMENT_TAB_PERSIST_TRUTHY_OBJECT_KEYS = [
  'expiryDateFrom',
  'expiryDateTo',
];

export function compactCenterDetailDocumentTabFiltersForStorage(filters) {
  return compactFiltersForSessionStorage(filters, CENTER_DETAIL_DOCUMENT_TAB_FILTER_DEFAULTS, {
    includeKeys: CENTER_DETAIL_DOCUMENT_TAB_PERSIST_INCLUDE_KEYS,
    trimStringArrayElements: true,
    truthyObjectKeys: CENTER_DETAIL_DOCUMENT_TAB_PERSIST_TRUTHY_OBJECT_KEYS,
  });
}

export function mergeStoredCenterDetailDocumentTabFilters(stored) {
  const base = { ...CENTER_DETAIL_DOCUMENT_TAB_FILTER_DEFAULTS };
  if (!stored || typeof stored !== 'object') return base;
  return {
    ...base,
    documentType: Array.isArray(stored.documentType) ? stored.documentType : base.documentType,
    status: Array.isArray(stored.status) ? stored.status : base.status,
    expiryDateFrom: stored.expiryDateFrom || base.expiryDateFrom,
    expiryDateTo: stored.expiryDateTo || base.expiryDateTo,
  };
}

export const EMPTY_STATES = {
  default: {
    title: 'No centers yet',
    description: 'Create your first center to get started.',
  },
  search: {
    title: 'No centers match these filters',
    description: 'Try adjusting filters or clearing search.',
  },
  no_centers: NO_CENTERS_EMPTY_STATE,
};

/** Settings > Center Task Master — Status / Priority filter (Task Master). */
export const CENTER_TASK_MASTER_FILTER_TABS = {
  STATUS: 'status',
  PRIORITY: 'priority',
};

export const CENTER_TASK_MASTER_FILTER_TAB_CONFIG = [
  { value: CENTER_TASK_MASTER_FILTER_TABS.STATUS, label: 'Status' },
  { value: CENTER_TASK_MASTER_FILTER_TABS.PRIORITY, label: 'Priority' },
];

export const CENTER_TASK_MASTER_FILTER_OPTION = {
  status: [],
  priority: [],
};

export const CENTER_TASK_MASTER_FILTERS_KEY = 'center-task-master-filters';

// export const ZONE_OPTIONS = {
//   'Zone 1' : {

//   }
// }
