import { buildGroupedBarChartFromRows } from '@/components/devx-ai-chart-visualizations';

/**
 * Convert execute_query results rows → chartData for DevxAiChartCard.
 */
function transformAxisResults(results, { hasGroupBy = false, title = '' } = {}) {
  if (!Array.isArray(results) || results.length === 0) {
    return {
      title,
      labels: [],
      datasets: [{ data: [] }],
      raw_data: [],
      supported_components: [],
    };
  }

  const groupedBar = hasGroupBy ? buildGroupedBarChartFromRows(results) : null;
  if (groupedBar) {
    return {
      title,
      labels: groupedBar.labels,
      datasets: [{ data: groupedBar.totals }],
      raw_data: results,
      groupedBar,
      hasGroupBy: true,
      supported_components: ['bar_chart', 'line_chart', 'data_table'],
      default_component: 'bar_chart',
      chart_type: 'bar',
    };
  }

  return {
    title,
    labels: results.map((r) => String(r.x_value ?? '')),
    datasets: [{ data: results.map((r) => Number(r.y_value ?? 0)) }],
    raw_data: results,
    supported_components: ['bar_chart', 'line_chart', 'data_table'],
    default_component: 'bar_chart',
    chart_type: 'bar',
  };
}

/**
 * Normalize conversational dashboard `chart_result` (query_results shape) → chartData.
 */
function transformChartResultToChartData(chartResult, { title = 'Chart' } = {}) {
  if (!chartResult || typeof chartResult !== 'object') return null;

  const results = chartResult.results ?? chartResult.rows ?? [];
  if (!Array.isArray(results) || results.length === 0) return null;

  const hasGroupBy = Boolean(
    chartResult.groupby_column ??
    chartResult.chart_config?.groupby_key ??
    results.some((r) => r?.group_value != null && r.group_value !== ''),
  );

  return transformAxisResults(results, { hasGroupBy, title });
}

/**
 * Normalize a chat or fallback chart payload into a storable chartData object.
 */
export function normalizeChartPayload(raw, { title = 'Chart' } = {}) {
  if (!raw) return null;

  const chartData =
    transformChartResultToChartData(raw, { title }) ?? (raw.labels || raw.raw_data ? raw : null);

  if (!chartData) return null;

  const base = { ...chartData };
  if (raw?.sql) base.sql = raw.sql;

  return base;
}
