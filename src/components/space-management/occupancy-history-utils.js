/**
 * List/table helpers for occupancy history (grouping and filtering).
 */

import { parseToDate } from '@/utils/date-utils';

const getRowLeaseBounds = (row) => {
  const start = parseToDate(row?.start_date ?? row?._original?.start_date);
  const end = parseToDate(row?.end_date ?? row?._original?.end_date) || start;
  return { start, end };
};

const getColumnMax = (rows, getter) => {
  const values = rows.map(getter).map((value) => Number(value) || 0);
  if (values.length === 0) return 0;
  return Math.max(...values, 0);
};

export function getOccupancyGroupKey(row, groupByField, centerFallback = '') {
  if (!groupByField || !row) return '';
  switch (groupByField) {
    case 'client':
      return row.client_name != null && row.client_name !== '' && row.client_name !== '--'
        ? String(row.client_name)
        : '—';
    case 'status':
      return row.status != null && row.status !== '' ? String(row.status) : '—';
    case 'center': {
      const center =
        row.center_name ||
        row.center ||
        row._original?.center_name ||
        row._original?.center ||
        centerFallback;
      return center != null && center !== '' ? String(center) : '—';
    }
    default:
      return '—';
  }
}

export function rowMatchesLeaseDateRange(row, fromValue, toValue) {
  if (!fromValue && !toValue) return true;

  const { start: rowStart, end: rowEnd } = getRowLeaseBounds(row);
  if (!rowStart && !rowEnd) return false;

  const filterFrom = parseToDate(fromValue);
  const filterTo = parseToDate(toValue);

  if (filterFrom && filterTo) {
    return rowStart <= filterTo && rowEnd >= filterFrom;
  }
  if (filterFrom) {
    return rowEnd >= filterFrom;
  }
  if (filterTo) {
    return rowStart <= filterTo;
  }
  return true;
}

/** Max values per numeric column from the current listview rows (for slider bounds). */
export function getOccupancyColumnMaxLimits(rows = []) {
  return {
    totalCredits: getColumnMax(rows, (row) => row.total_credits),
    pricePerSeat: getColumnMax(rows, (row) => row.price_per_seat),
    totalPrice: getColumnMax(rows, (row) => row.total_price),
  };
}

/** @deprecated Use getOccupancyColumnMaxLimits */
export function getOccupancyColumnRangeLimits(rows = []) {
  const limits = getOccupancyColumnMaxLimits(rows);
  return {
    totalCredits: { min: 0, max: limits.totalCredits },
    pricePerSeat: { min: 0, max: limits.pricePerSeat },
    totalPrice: { min: 0, max: limits.totalPrice },
  };
}

const isUpperBoundFilterActive = (selectedValue, columnMax) => {
  const selected = Number(selectedValue) || 0;
  const max = Number(columnMax) || 0;
  return selected > 0 && max > 0 && selected < max;
};

const rowMatchesUpperBound = (rowValue, selectedValue) => {
  const numericValue = Number(rowValue) || 0;
  const upperBound = Number(selectedValue) || 0;
  return numericValue >= 0 && numericValue <= upperBound;
};

export function countOccupancyActiveFilters(filters = {}, columnMaxLimits = {}) {
  let count = 0;
  if (Array.isArray(filters.clientName) && filters.clientName.length > 0) count += 1;
  if (Array.isArray(filters.status) && filters.status.length > 0) count += 1;
  if (filters.leaseDateFrom || filters.leaseDateTo) count += 1;
  if (isUpperBoundFilterActive(filters.totalCredits, columnMaxLimits.totalCredits)) {
    count += 1;
  }
  if (isUpperBoundFilterActive(filters.pricePerSeat, columnMaxLimits.pricePerSeat)) {
    count += 1;
  }
  if (isUpperBoundFilterActive(filters.totalPrice, columnMaxLimits.totalPrice)) {
    count += 1;
  }
  return count;
}

export function applyOccupancyFilters(rows = [], filters = {}, columnMaxLimits = {}) {
  const clientNames = Array.isArray(filters.clientName) ? filters.clientName : [];
  const statuses = Array.isArray(filters.status) ? filters.status : [];
  const hasLeaseFilter = Boolean(filters.leaseDateFrom || filters.leaseDateTo);

  const creditsFilterActive = isUpperBoundFilterActive(
    filters.totalCredits,
    columnMaxLimits.totalCredits,
  );
  const pricePerSeatFilterActive = isUpperBoundFilterActive(
    filters.pricePerSeat,
    columnMaxLimits.pricePerSeat,
  );
  const totalPriceFilterActive = isUpperBoundFilterActive(
    filters.totalPrice,
    columnMaxLimits.totalPrice,
  );

  return rows.filter((row) => {
    if (clientNames.length > 0) {
      const name = String(row.client_name || '').trim();
      if (!clientNames.includes(name)) return false;
    }

    if (statuses.length > 0) {
      const status = String(row.status || '').trim();
      if (!statuses.includes(status)) return false;
    }

    if (
      hasLeaseFilter &&
      !rowMatchesLeaseDateRange(row, filters.leaseDateFrom, filters.leaseDateTo)
    ) {
      return false;
    }

    if (creditsFilterActive && !rowMatchesUpperBound(row.total_credits, filters.totalCredits)) {
      return false;
    }

    if (
      pricePerSeatFilterActive &&
      !rowMatchesUpperBound(row.price_per_seat, filters.pricePerSeat)
    ) {
      return false;
    }

    if (totalPriceFilterActive && !rowMatchesUpperBound(row.total_price, filters.totalPrice)) {
      return false;
    }

    return true;
  });
}
