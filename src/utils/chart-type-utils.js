/** Parse JSON object fields returned as strings from Frappe DocTypes. */
export function parseJsonObject(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Stable key for chatbot axis-config React effect dependencies. */
export function chatbotConfigDependencyKey(cfg) {
  if (!cfg) return '';
  try {
    return JSON.stringify(cfg);
  } catch {
    return String(cfg);
  }
}

/** Map Chart Master `chart_type` to the viz component id used by chart cards. */
export function chartMasterTypeToVizId(chartType) {
  const map = {
    vertical_bar: 'bar_chart',
    horizontal_bar: 'horizontal_bar_chart',
    line: 'line_chart',
    pie: 'pie_chart',
    donut: 'donut_chart',
    kpi: 'kpi_tile',
    battery: 'battery_chart',
    table: 'data_table',
  };
  return map[String(chartType || '').toLowerCase()] ?? 'bar_chart';
}

/** Supported viz components for a chart type (dashboard tiles + data table fallback). */
export function supportedComponentsForChartType(chartType) {
  const type = String(chartType || 'vertical_bar').toLowerCase();
  const defaultViz = chartMasterTypeToVizId(type);

  if (type === 'kpi') return ['kpi_tile', 'data_table'];
  if (type === 'table') return ['data_table'];
  if (type === 'battery') return ['battery_chart', 'data_table'];
  if (type === 'horizontal_bar') return ['horizontal_bar_chart', 'data_table'];

  return [defaultViz, 'data_table', 'bar_chart', 'line_chart', 'pie_chart', 'donut_chart'].filter(
    (value, index, arr) => arr.indexOf(value) === index,
  );
}
