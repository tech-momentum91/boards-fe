/**
 * Helpers for chart segment drill-down: build filters, merge with chart filters,
 * filter raw rows, and format UI labels.
 */

function normalizeCompareValue(value) {
  if (value == null) return '';
  return String(value).trim();
}

/**
 * Build a drill-down filter from a chart segment click and axis config.
 *
 * @param {{ index: number, label: string, value: number, groupValue?: string }} payload
 * @param {object | null | undefined} chatbotConfig
 */
export function buildDrillDownFilter(payload, chatbotConfig) {
  if (!payload || !chatbotConfig) return null;

  const xAxis = chatbotConfig.x_axis;
  const yAxis = chatbotConfig.y_axis;
  if (!xAxis?.fieldname) return null;

  const groupBy = Array.isArray(chatbotConfig.group_by) ? chatbotConfig.group_by[0] : null;

  return {
    index: payload.index,
    label: normalizeCompareValue(payload.label),
    value: payload.value,
    groupValue: payload.groupValue != null ? normalizeCompareValue(payload.groupValue) : null,
    xAxisFieldname: xAxis.fieldname,
    xAxisDoctype: xAxis.doctype,
    xAxisLabel: xAxis.label || xAxis.fieldname,
    yAxisDoctype: yAxis?.doctype ?? null,
    yAxisLabel: yAxis?.label || yAxis?.fieldname || null,
    groupFieldname: groupBy?.fieldname ?? null,
    groupDoctype: groupBy?.doctype ?? null,
    groupLabel: groupBy?.label || groupBy?.fieldname || null,
  };
}

/**
 * Convert drill-down filter to backend filter conditions.
 *
 * @param {ReturnType<typeof buildDrillDownFilter>} drillDownFilter
 * @returns {Array<{doctype: string, fieldname: string, operator: string, value: string}>}
 */
export function drillDownToConditions(drillDownFilter) {
  if (!drillDownFilter?.xAxisFieldname || !drillDownFilter?.xAxisDoctype) return [];

  const conditions = [
    {
      doctype: drillDownFilter.xAxisDoctype,
      fieldname: drillDownFilter.xAxisFieldname,
      operator: '=',
      value: drillDownFilter.label,
    },
  ];

  if (
    drillDownFilter.groupValue &&
    drillDownFilter.groupFieldname &&
    drillDownFilter.groupDoctype
  ) {
    conditions.push({
      doctype: drillDownFilter.groupDoctype,
      fieldname: drillDownFilter.groupFieldname,
      operator: '=',
      value: drillDownFilter.groupValue,
    });
  }

  return conditions;
}

/**
 * Merge drill-down conditions into existing chart filters for API calls.
 *
 * @param {Array | object | null | undefined} existingFilters
 * @param {ReturnType<typeof buildDrillDownFilter>} drillDownFilter
 */
export function mergeDrillDownIntoFilters(existingFilters, drillDownFilter) {
  const drillConditions = drillDownToConditions(drillDownFilter);
  if (drillConditions.length === 0) return existingFilters ?? [];

  if (!existingFilters || (Array.isArray(existingFilters) && existingFilters.length === 0)) {
    return { logic: 'AND', conditions: drillConditions };
  }

  if (Array.isArray(existingFilters)) {
    return { logic: 'AND', conditions: [...existingFilters, ...drillConditions] };
  }

  const existingConditions = Array.isArray(existingFilters.conditions)
    ? existingFilters.conditions
    : [];

  return {
    ...existingFilters,
    logic: existingFilters.logic || 'AND',
    conditions: [...existingConditions, ...drillConditions],
  };
}

/**
 * Client-side filter for Data-tab rows (`x_axis`, `group_0` aliases).
 *
 * @param {Array<object>} rows
 * @param {ReturnType<typeof buildDrillDownFilter>} drillDownFilter
 */
export function filterRowsByDrillDown(rows, drillDownFilter) {
  if (!drillDownFilter || !Array.isArray(rows)) return rows ?? [];

  return rows.filter((row) => {
    const xMatch = normalizeCompareValue(row?.x_axis) === drillDownFilter.label;
    if (!drillDownFilter.groupValue) return xMatch;
    return xMatch && normalizeCompareValue(row?.group_0) === drillDownFilter.groupValue;
  });
}

/**
 * Human-readable label for the active drill-down filter.
 *
 * @param {ReturnType<typeof buildDrillDownFilter>} drillDownFilter
 */
export function formatDrillDownFilterLabel(drillDownFilter) {
  if (!drillDownFilter) return '';

  const xLabel = drillDownFilter.xAxisLabel || 'Category';
  let text = `${xLabel} = "${drillDownFilter.label}"`;

  if (drillDownFilter.groupValue) {
    const gLabel = drillDownFilter.groupLabel || 'Group';
    text += ` · ${gLabel} = "${drillDownFilter.groupValue}"`;
  }

  if (drillDownFilter.yAxisLabel && drillDownFilter.yAxisDoctype) {
    text += ` · showing ${drillDownFilter.yAxisDoctype} records`;
  }

  return text;
}

/**
 * Whether a chart segment should be highlighted (not blurred).
 *
 * @param {ReturnType<typeof buildDrillDownFilter>} activeFilter
 * @param {{ index: number, groupValue?: string | null }} segment
 */
export function isDrillDownSegmentActive(activeFilter, segment) {
  if (!activeFilter) return true;
  if (activeFilter.index !== segment.index) return false;
  if (!activeFilter.groupValue) return true;
  return normalizeCompareValue(segment.groupValue) === activeFilter.groupValue;
}
