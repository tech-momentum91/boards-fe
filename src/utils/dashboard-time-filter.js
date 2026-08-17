import { endOfDay, format, startOfDay, startOfQuarter, startOfYear, subDays } from 'date-fns';

const PRESET_DAY_COUNTS = {
  'last 7 days': 7,
  'last 30 days': 30,
  'last 90 days': 90,
};

/** Format a Date as YYYY-MM-DD for API payloads. */
export function formatDateForApi(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, 'yyyy-MM-dd');
}

/** Parse YYYY-MM-DD (or ISO) into a local Date at midnight. */
export function parseApiDate(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/**
 * Resolve inclusive date bounds for a dashboard tab time filter.
 * Mirrors backend rules in `time_filter.py`.
 *
 * @returns {{ fromDate: string, toDate: string } | null}
 */
export function resolveTimeBounds({ timeRange, fromDate = null, toDate = null } = {}) {
  const label = (timeRange || '').trim();
  if (!label) return null;

  const today = startOfDay(new Date());

  if (label === 'Today') {
    const d = formatDateForApi(today);
    return { fromDate: d, toDate: d };
  }

  if (label === 'Custom') {
    const from = formatDateForApi(fromDate);
    const to = formatDateForApi(toDate);
    if (!from || !to) return null;
    return from <= to ? { fromDate: from, toDate: to } : { fromDate: to, toDate: from };
  }

  const key = label.toLowerCase();
  if (key in PRESET_DAY_COUNTS) {
    const days = PRESET_DAY_COUNTS[key];
    return {
      fromDate: formatDateForApi(subDays(today, days)),
      toDate: formatDateForApi(today),
    };
  }

  if (label === 'MTD') {
    return {
      fromDate: formatDateForApi(startOfDay(new Date(today.getFullYear(), today.getMonth(), 1))),
      toDate: formatDateForApi(today),
    };
  }

  if (label === 'QTD') {
    return {
      fromDate: formatDateForApi(startOfQuarter(today)),
      toDate: formatDateForApi(today),
    };
  }

  if (label === 'YTD') {
    return {
      fromDate: formatDateForApi(startOfYear(today)),
      toDate: formatDateForApi(today),
    };
  }

  return null;
}

/**
 * Build the `days_filter` object for saveTab / chart API tab filters.
 */
export function buildDaysFilterPayload({ timeRange, customDateRange = null } = {}) {
  const label = (timeRange || '').trim();
  if (!label) return {};

  if (label === 'Custom') {
    const from = customDateRange?.from ?? null;
    const to = customDateRange?.to ?? null;
    const bounds = resolveTimeBounds({ timeRange: label, fromDate: from, toDate: to });
    if (!bounds) {
      return { time_range: label };
    }
    return {
      time_range: label,
      from_date: bounds.fromDate,
      to_date: bounds.toDate,
    };
  }

  const bounds = resolveTimeBounds({ timeRange: label });
  if (!bounds) {
    return { time_range: label };
  }

  return {
    time_range: label,
    from_date: bounds.fromDate,
    to_date: bounds.toDate,
  };
}

/** Values persisted when an object was coerced with String() — treat as "All". */
function isInvalidDimensionFilterValue(value) {
  const text = String(value ?? '').trim();
  if (!text || text.toLowerCase() === 'all') return true;
  if (text === '[object Object]') return true;
  return false;
}

/** Normalize tab center/client filter state to a list of IDs. */
export function normalizeDimensionFilterValues(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((value) => String(value ?? '').trim())
      .filter((value) => !isInvalidDimensionFilterValue(value));
  }

  if (raw != null && typeof raw === 'object') {
    return normalizeDimensionFilterValues(raw.value ?? raw.values ?? []);
  }

  const value = String(raw ?? '').trim();
  if (isInvalidDimensionFilterValue(value)) return [];
  return [value];
}

/** Restore persisted tab filter value into multi-select state. */
export function restoreDimensionFilterValues(raw, validIds = null) {
  const values = normalizeDimensionFilterValues(raw?.value ?? raw);
  if (!Array.isArray(validIds) || validIds.length === 0) return values;

  const allowed = new Set(validIds.map(String));
  const filtered = values.filter((id) => allowed.has(String(id)));
  // Drop stale IDs saved on the tab so the UI falls back to "All".
  return filtered;
}

/** Serialize multi-select state for tab persistence. */
export function serializeDimensionFilterValues(values) {
  const normalized = normalizeDimensionFilterValues(values);
  if (normalized.length === 0) return 'all';
  if (normalized.length === 1) return normalized[0];
  return normalized;
}

/**
 * Build center/client filter payloads for chart data API calls.
 */
export function buildDimensionFilterPayload({ centerFilter, clientFilter } = {}) {
  const tabFilters = {};

  const centerValues = normalizeDimensionFilterValues(centerFilter);
  if (centerValues.length > 0) {
    tabFilters.center_filter = {
      value: centerValues.length === 1 ? centerValues[0] : centerValues,
    };
  }

  const clientValues = normalizeDimensionFilterValues(clientFilter);
  if (clientValues.length > 0) {
    tabFilters.client_filter = {
      value: clientValues.length === 1 ? clientValues[0] : clientValues,
    };
  }

  return tabFilters;
}

/**
 * Build `dashboard_tab_filters` for chart data API calls.
 * Returns null when the filter is incomplete (e.g. Custom without both dates).
 */
export function buildTabFiltersForChart({
  timeRange,
  customDateRange = null,
  centerFilter = [],
  clientFilter = [],
} = {}) {
  const daysFilter = buildDaysFilterPayload({ timeRange, customDateRange });
  const dimensionFilters = buildDimensionFilterPayload({ centerFilter, clientFilter });

  if (!daysFilter.time_range) {
    return Object.keys(dimensionFilters).length > 0 ? dimensionFilters : null;
  }
  if (daysFilter.time_range === 'Custom' && (!daysFilter.from_date || !daysFilter.to_date)) {
    return Object.keys(dimensionFilters).length > 0 ? dimensionFilters : null;
  }

  return {
    days_filter: daysFilter,
    ...dimensionFilters,
  };
}

/** Restore custom picker value from persisted tab `days_filter`. */
export function restoreCustomDateRange(daysFilter) {
  if (!daysFilter || daysFilter.time_range !== 'Custom') return null;
  const from = parseApiDate(daysFilter.from_date);
  const to = parseApiDate(daysFilter.to_date);
  if (!from || !to) return null;
  return { from, to };
}

/**
 * Time-series charts bucket the x-axis by date/time. Dashboard tab date presets
 * (e.g. Today) must not add a separate creation filter that zeroes out tiles
 * while the chart builder preview (unfiltered) still shows the saved trend.
 */
export function isTimeSeriesChartConfig(chatbotConfig) {
  return Boolean(chatbotConfig?.x_axis?.time_bucket);
}

/**
 * Dashboard tab filters for chart data fetches.
 * Time-series charts (x-axis time buckets) keep centre/client scoping but skip
 * tab date presets — those charts already define their range via the x-axis.
 */
export function tabFiltersForChartType(tabFilters, chartType, chatbotConfig = null) {
  if (!tabFilters) return null;

  if (isTimeSeriesChartConfig(chatbotConfig)) {
    const { days_filter: _daysFilter, ...dimensionFilters } = tabFilters;
    return Object.keys(dimensionFilters).length > 0 ? dimensionFilters : null;
  }

  return tabFilters;
}

/** Stable key for React effect dependencies. */
export function tabFiltersDependencyKey(tabFilters) {
  if (!tabFilters) return '';

  const days = tabFilters.days_filter || {};
  const center = normalizeDimensionFilterValues(tabFilters.center_filter?.value).join(',');
  const client = normalizeDimensionFilterValues(tabFilters.client_filter?.value).join(',');

  return [days.time_range || '', days.from_date || '', days.to_date || '', center, client].join(
    '|',
  );
}

/** End-of-day helper for display-only formatting. */
export function toInclusiveEndDate(value) {
  const date = value instanceof Date ? value : parseApiDate(value);
  return date ? endOfDay(date) : null;
}
