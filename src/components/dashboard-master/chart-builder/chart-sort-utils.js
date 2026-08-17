/**
 * Build sort-by options from configured axes.
 * Aliases match backend SQL column aliases (x_axis, y_axis, group_0).
 */
export function buildSortByOptions({ chartTypeMeta, xValue, yValue, groupByValue }) {
  const options = [];

  if (chartTypeMeta?.requires_x_axis !== false && xValue) {
    options.push({
      value: 'x_axis',
      label: xValue.label || xValue.fieldname || 'X Axis',
    });
  }

  if (yValue) {
    options.push({
      value: 'y_axis',
      label: yValue.label || yValue.fieldname || 'Y Axis',
    });
  }

  if (chartTypeMeta?.supports_grouping !== false && groupByValue) {
    options.push({
      value: 'group_0',
      label: groupByValue.label || groupByValue.fieldname || 'Group By',
    });
  }

  return options;
}

/** Default sort field/direction when the user has not chosen explicit values. */
export function getDefaultSortOptions(chartType, chartTypeMeta) {
  const isLine = (chartType || '').toLowerCase() === 'line';
  const supportsX = chartTypeMeta?.requires_x_axis !== false;

  if (isLine && supportsX) {
    return { sortBy: 'x_axis', sortDirection: 'asc' };
  }

  return { sortBy: 'y_axis', sortDirection: 'desc' };
}

export function resolveSortDirection({ chartType, chartTypeMeta, sortBy, sortDirection }) {
  if (sortDirection) return sortDirection;
  if (!sortBy) return null;
  return getDefaultSortOptions(chartType, chartTypeMeta).sortDirection;
}
