import { STOCKS_FILTER_VALUE_ALL } from '@/components/stocks/shared/constants';

/** Merge center filter options using center id as value and center name as label. */
export function mergeCurrentStockCenterOptions(previousOptions, rows, allLabel = 'All Centers') {
  const map = new Map();
  for (const option of previousOptions ?? []) {
    if (option?.value) map.set(option.value, option);
  }
  for (const row of rows ?? []) {
    const centerId = String(row.centerId ?? '').trim();
    const centerName = String(row.center ?? '').trim();
    if (centerId && !map.has(centerId)) {
      map.set(centerId, { value: centerId, label: centerName || centerId });
    }
  }
  const allOption = map.get(STOCKS_FILTER_VALUE_ALL) ?? {
    value: STOCKS_FILTER_VALUE_ALL,
    label: allLabel,
  };
  map.delete(STOCKS_FILTER_VALUE_ALL);
  const sorted = [...map.values()].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
  );
  return [allOption, ...sorted];
}

/** Merge category filter options from loaded rows. */
export function mergeCurrentStockCategoryOptions(
  previousOptions,
  rows,
  allLabel = 'All Categories',
) {
  const map = new Map();
  for (const option of previousOptions ?? []) {
    if (option?.value) map.set(option.value, option);
  }
  for (const row of rows ?? []) {
    const category = String(row.category ?? '').trim();
    if (category && !map.has(category)) {
      map.set(category, { value: category, label: category });
    }
  }
  const allOption = map.get(STOCKS_FILTER_VALUE_ALL) ?? {
    value: STOCKS_FILTER_VALUE_ALL,
    label: allLabel,
  };
  map.delete(STOCKS_FILTER_VALUE_ALL);
  const sorted = [...map.values()].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
  );
  return [allOption, ...sorted];
}
