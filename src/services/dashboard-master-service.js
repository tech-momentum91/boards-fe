import apiClient from '@/api/axios';

/** Unwrap Frappe `/api/method/...` response, which is always `{message: ...}`. */
function unwrap(data) {
  let msg = data?.message ?? data;
  if (msg?.message && typeof msg.message === 'object' && !Array.isArray(msg.message)) {
    msg = msg.message;
  }
  return msg;
}

function assertOk(msg, fallback) {
  if (msg?.status === 'error' || msg?.success === false) {
    throw new Error(msg?.error || msg?.message || fallback);
  }
}

const METHOD_BASE = '/method/devx_ai.chatbot.api.dashboard_master';

// ─── Dashboards ────────────────────────────────────────────────────────────

export async function listDashboards({ module, dashboardType } = {}) {
  const params = {};
  if (module) params.module = module;
  if (dashboardType) params.dashboard_type = dashboardType;

  const { data } = await apiClient.get(`${METHOD_BASE}.list_dashboards`, { params });
  const msg = unwrap(data);
  assertOk(msg, 'Failed to load dashboards');
  return {
    dashboards: msg?.data?.dashboards ?? [],
    permissions: msg?.data?.permissions ?? null,
  };
}

export async function getDashboard(dashboardId, { includeCharts = false } = {}) {
  if (!dashboardId) return null;
  const { data } = await apiClient.get(`${METHOD_BASE}.get_dashboard`, {
    params: { dashboard_id: dashboardId, include_charts: includeCharts ? 1 : 0 },
  });
  const msg = unwrap(data);
  assertOk(msg, 'Failed to load dashboard');
  return msg?.data ?? null;
}

export async function saveDashboard({
  dashboardId = null,
  dashboardName,
  icon = '',
  description = '',
  dashboardType = 'Operational',
  module = null,
  embedInModule = false,
  defaultTimeRange = 'Last 30 Days',
  enabledFilters = null,
  visibility = { roles: [], users: [] },
}) {
  const body = {
    dashboard_name: dashboardName,
    icon,
    description,
    dashboard_type: dashboardType,
    module: module || '',
    embed_in_module: embedInModule ? 1 : 0,
    default_time_range: defaultTimeRange,
    visibility: JSON.stringify(visibility ?? { roles: [], users: [] }),
  };
  if (dashboardId) body.dashboard_id = dashboardId;
  if (enabledFilters !== null) {
    body.enabled_filters = JSON.stringify(enabledFilters ?? { centers: true, clients: true });
  }

  const { data } = await apiClient.post(`${METHOD_BASE}.save_dashboard`, body);
  const msg = unwrap(data);
  assertOk(msg, 'Failed to save dashboard');
  return msg?.data ?? null;
}

export async function duplicateDashboard(dashboardId) {
  if (!dashboardId) return null;
  const { data } = await apiClient.post(`${METHOD_BASE}.duplicate_dashboard`, {
    dashboard_id: dashboardId,
  });
  const msg = unwrap(data);
  assertOk(msg, 'Failed to duplicate dashboard');
  return msg?.data ?? null;
}

export async function deleteDashboard(dashboardId) {
  if (!dashboardId) return true;
  const { data } = await apiClient.post(`${METHOD_BASE}.delete_dashboard`, {
    dashboard_id: dashboardId,
  });
  const msg = unwrap(data);
  assertOk(msg, 'Failed to delete dashboard');
  return true;
}

// ─── Tabs ──────────────────────────────────────────────────────────────────

export async function listTabs(dashboardId) {
  if (!dashboardId) return [];
  const { data } = await apiClient.get(`${METHOD_BASE}.list_tabs`, {
    params: { dashboard_id: dashboardId },
  });
  const msg = unwrap(data);
  assertOk(msg, 'Failed to load tabs');
  return msg?.data?.tabs ?? [];
}

export async function saveTab({
  tabId = null,
  dashboard,
  displayName,
  tabName = '',
  sortOrder = 0,
  daysFilter,
  centersFilter,
  clientFilter,
  extraFilter,
  isPinned = null,
  isDefault = null,
}) {
  const body = {
    dashboard,
    display_name: displayName,
    tab_name: tabName || displayName,
    sort_order: sortOrder,
  };
  if (tabId) body.tab_id = tabId;
  if (daysFilter !== undefined) body.days_filter = JSON.stringify(daysFilter ?? {});
  if (centersFilter !== undefined) body.centers_filter = JSON.stringify(centersFilter ?? {});
  if (clientFilter !== undefined) body.client_filter = JSON.stringify(clientFilter ?? {});
  if (extraFilter !== undefined) body.extra_filter = JSON.stringify(extraFilter ?? {});
  if (isPinned !== null) body.is_pinned = isPinned ? 1 : 0;
  if (isDefault !== null) body.is_default = isDefault ? 1 : 0;

  const { data } = await apiClient.post(`${METHOD_BASE}.save_tab`, body);
  const msg = unwrap(data);
  assertOk(msg, 'Failed to save tab');
  return msg?.data ?? null;
}

export async function duplicateTab(tabId) {
  if (!tabId) return null;
  const { data } = await apiClient.post(`${METHOD_BASE}.duplicate_tab`, { tab_id: tabId });
  const msg = unwrap(data);
  assertOk(msg, 'Failed to duplicate tab');
  return msg?.data ?? null;
}

export async function deleteTab(tabId) {
  if (!tabId) return true;
  const { data } = await apiClient.post(`${METHOD_BASE}.delete_tab`, { tab_id: tabId });
  const msg = unwrap(data);
  assertOk(msg, 'Failed to delete tab');
  return true;
}

export async function reorderTabs(dashboardId, orderedTabIds) {
  const { data } = await apiClient.post(`${METHOD_BASE}.reorder_tabs`, {
    dashboard_id: dashboardId,
    order: JSON.stringify(orderedTabIds ?? []),
  });
  const msg = unwrap(data);
  assertOk(msg, 'Failed to reorder tabs');
  return true;
}

// ─── Charts ────────────────────────────────────────────────────────────────

export async function listCharts(tabId) {
  if (!tabId) return [];
  const { data } = await apiClient.get(`${METHOD_BASE}.list_charts`, {
    params: { tab_id: tabId },
  });
  const msg = unwrap(data);
  assertOk(msg, 'Failed to load charts');
  return msg?.data?.charts ?? [];
}

export async function getChart(chartId) {
  if (!chartId) return null;
  const { data } = await apiClient.get(`${METHOD_BASE}.get_chart`, {
    params: { chart_id: chartId },
  });
  const msg = unwrap(data);
  assertOk(msg, 'Failed to load chart');
  return msg?.data ?? null;
}

export async function saveChart({
  chartId = null,
  dashboardTab,
  title,
  summary = '',
  chartType = 'vertical_bar',
  sortOrder = 0,
  axisConfig = {},
  showAverage = false,
  showLegends = true,
  showDataLabels = false,
  displayAsStackedArea = false,
  displayAs100Stacked = false,
  legendFiltersJson = null,
  filtersJson = {},
  finalSqlQueryJson = {},
  formula = '',
  formulaJson = null,
  chartData = {},
  gridX = null,
  gridY = null,
  gridWidth = null,
  gridHeight = null,
}) {
  const body = {
    dashboard_tab: dashboardTab,
    title,
    summary,
    chart_type: chartType,
    sort_order: sortOrder,
    axis_config: JSON.stringify(axisConfig ?? {}),
    show_average: showAverage ? 1 : 0,
    show_legends: showLegends ? 1 : 0,
    show_data_labels: showDataLabels ? 1 : 0,
    display_as_stacked_area: displayAsStackedArea ? 1 : 0,
    display_as_100_stacked: displayAs100Stacked ? 1 : 0,
    filters_json: JSON.stringify(filtersJson ?? {}),
    final_sql_query_json: JSON.stringify(finalSqlQueryJson ?? {}),
    formula,
    formula_json: JSON.stringify(formulaJson ?? {}),
    chart_data: JSON.stringify(chartData ?? {}),
  };
  if (chartId) body.chart_id = chartId;
  if (gridX != null) body.grid_x = gridX;
  if (gridY != null) body.grid_y = gridY;
  if (gridWidth != null) body.grid_width = gridWidth;
  if (gridHeight != null) body.grid_height = gridHeight;
  if (legendFiltersJson !== null) {
    body.legend_filters_json = JSON.stringify(legendFiltersJson ?? {});
  }

  const { data } = await apiClient.post(`${METHOD_BASE}.save_chart`, body);
  const msg = unwrap(data);
  assertOk(msg, 'Failed to save chart');
  return msg?.data ?? null;
}

export async function deleteChart(chartId) {
  if (!chartId) return true;
  const { data } = await apiClient.post(`${METHOD_BASE}.delete_chart`, { chart_id: chartId });
  const msg = unwrap(data);
  assertOk(msg, 'Failed to delete chart');
  return true;
}

export async function updateChartPositions(tabId, positions = []) {
  const { data } = await apiClient.post(`${METHOD_BASE}.update_chart_positions`, {
    tab_id: tabId,
    positions: JSON.stringify(
      (positions ?? []).map((entry) => ({
        chart_id: entry.chartId,
        grid_x: entry.gridX,
        grid_y: entry.gridY,
        ...(entry.gridWidth != null ? { grid_width: entry.gridWidth } : {}),
        ...(entry.gridHeight != null ? { grid_height: entry.gridHeight } : {}),
      })),
    ),
  });
  const msg = unwrap(data);
  assertOk(msg, 'Failed to update chart positions');
  return true;
}

export async function updateChartLegendFilters(chartId, legendFiltersJson = {}) {
  const { data } = await apiClient.post(`${METHOD_BASE}.update_chart_legend_filters`, {
    chart_id: chartId,
    legend_filters_json: JSON.stringify(legendFiltersJson ?? {}),
  });
  const msg = unwrap(data);
  assertOk(msg, 'Failed to update legend filters');
  return true;
}

export async function reorderCharts(tabId, orderedChartIds) {
  const { data } = await apiClient.post(`${METHOD_BASE}.reorder_charts`, {
    tab_id: tabId,
    order: JSON.stringify(orderedChartIds ?? []),
  });
  const msg = unwrap(data);
  assertOk(msg, 'Failed to reorder charts');
  return true;
}

// ─── Visibility picker options ─────────────────────────────────────────────

export async function listVisibilityOptions({ search = '', limit = 25 } = {}) {
  const params = { search, limit };
  const { data } = await apiClient.get(`${METHOD_BASE}.list_visibility_options`, { params });
  const msg = unwrap(data);
  assertOk(msg, 'Failed to load visibility options');
  return {
    roles: msg?.data?.roles ?? [],
    users: msg?.data?.users ?? [],
  };
}

// ─── Frontend constants ────────────────────────────────────────────────────

export const DASHBOARD_TYPES = ['Operational', 'Analytical', 'Executive'];

export const DASHBOARD_FILTER_TYPES = ['centers', 'clients'];

export const DEFAULT_ENABLED_FILTERS = { centers: true, clients: true };

export const DEFAULT_TIME_RANGES = [
  'Today',
  'Last 7 Days',
  'Last 30 Days',
  'Last 90 Days',
  'MTD',
  'QTD',
  'YTD',
  'Custom',
];
