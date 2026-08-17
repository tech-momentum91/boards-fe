export const FACILITY_TRACKER_MAIN_TABS = [
  'My Task',
  'Daily HK Tracker',
  'Daily Cafeteria Tracker',
  'Weekly HK Tracker',
  'Monthly Cleaning Tracker',
  'Annual PPM Tracker',
];

// ---------------------------------------------------------------------------
// Facility tracker — filter dropdown persistence helpers
// ---------------------------------------------------------------------------
//
// Mirrors the `usePersistedFilters` convention used by Centers / CP Account /
// Vendor detail pages. We persist one slot per center so floor + assignee
// selections don't bleed across centers (the option lists themselves are
// center-scoped).

export const FACILITY_FILTER_PERSISTED_KEYS = ['floor', 'assignee'];

export const DEFAULT_FACILITY_TRACKER_FILTERS = Object.freeze({
  floor: [],
  assignee: [],
});

export const getFacilityTrackerFiltersStorageKey = (centerId) =>
  centerId ? `facility-tracker-view-filter-dropdown-${String(centerId).trim()}` : null;

const trimNonEmptyList = (values) => {
  if (!Array.isArray(values)) return [];
  return values.map((v) => String(v).trim()).filter(Boolean);
};

export const mergeStoredFacilityTrackerFilters = (stored) => {
  const merged = { ...DEFAULT_FACILITY_TRACKER_FILTERS };
  if (!stored || typeof stored !== 'object') return merged;
  for (const key of FACILITY_FILTER_PERSISTED_KEYS) {
    if (Array.isArray(stored[key])) merged[key] = trimNonEmptyList(stored[key]);
  }
  return merged;
};
