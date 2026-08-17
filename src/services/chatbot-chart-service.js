import apiClient from '@/api/axios';
import { paletteColorAt, CHART_GROUP_COLORS } from '@/components/devx-ai-chart-visualizations';
import { chartMasterTypeToVizId, supportedComponentsForChartType } from '@/utils/chart-type-utils';

/** Unwrap Frappe `/api/method/...` responses. */
function unwrapFrappeMessage(data) {
  let msg = data?.message ?? data;
  if (msg?.message && typeof msg.message === 'object' && !Array.isArray(msg.message)) {
    msg = msg.message;
  }
  return msg;
}

function assertSuccess(msg, fallbackError) {
  if (msg?.status === 'error' || msg?.success === false) {
    const errors = Array.isArray(msg?.errors) ? msg.errors.join(', ') : null;
    throw new Error(errors || msg?.error || msg?.message || fallbackError);
  }
}

// ─── Chart Types ─────────────────────────────────────────────────────────────

/**
 * Fetch all supported chatbot chart types.
 * @returns {Promise<Array<{id: string, label: string, icon: string, requires_x_axis: boolean, requires_y_axis: boolean, supports_grouping: boolean}>>}
 */
export async function getChatbotChartTypes() {
  const { data } = await apiClient.get(
    '/method/devx_ai.chatbot.chart.api.chart_types.get_chart_types',
  );
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, 'Failed to load chart types');
  return Array.isArray(msg?.data) ? msg.data : [];
}

// ─── Axis Options ─────────────────────────────────────────────────────────────

/**
 * Fetch X-axis field options for a given chart type.
 *
 * @param {{ chartType: string, baseDoctype?: string | null }} params
 * @returns {Promise<Array<{value: string, label: string, doctype: string, fieldname: string, fieldtype: string, abstract_data_type: string, is_time_series: boolean, is_formula: boolean, join_path: Array, hops: number}>>}
 */
export async function getChatbotXAxisOptions({ chartType, baseDoctype = null }) {
  const params = { chart_type: chartType };
  if (baseDoctype) params.base_doctype = baseDoctype;

  const { data } = await apiClient.get(
    '/method/devx_ai.chatbot.chart.api.axis.get_x_axis_options',
    { params },
  );
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, 'Failed to load X-axis options');
  return Array.isArray(msg?.data) ? msg.data : [];
}

/**
 * Fetch Y-axis field options for a given chart type.
 *
 * @param {{ chartType: string, baseDoctype?: string | null }} params
 * @returns {Promise<Array<{value: string, label: string, doctype: string, fieldname: string, fieldtype: string, abstract_data_type: string, is_formula: boolean, join_path: Array, hops: number, valid_aggregations: string[], default_aggregation: string}>>}
 */
export async function getChatbotYAxisOptions({ chartType, baseDoctype = null }) {
  const params = { chart_type: chartType };
  if (baseDoctype) params.base_doctype = baseDoctype;

  const { data } = await apiClient.get(
    '/method/devx_ai.chatbot.chart.api.axis.get_y_axis_options',
    { params },
  );
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, 'Failed to load Y-axis options');
  return Array.isArray(msg?.data) ? msg.data : [];
}

// ─── Doctype-first Axis Picker ────────────────────────────────────────────────

/**
 * Fetch all registered doctypes that have at least one field eligible for the
 * given axis type, together with their field counts.
 *
 * This powers the first step of the two-step axis picker.
 *
 * @param {{ axisType: 'x'|'y'|'group', chartType: string, scopeDoctype?: string | null }} params
 * @returns {Promise<Array<{doctype: string, label: string, field_count: number}>>}
 */
export async function getAxisDoctypes({ axisType, chartType, scopeDoctype = null }) {
  const resolvedChartType = chartType === 'table' ? 'vertical_bar' : chartType;
  const params = { axis_type: axisType, chart_type: resolvedChartType };
  if (scopeDoctype) params.scope_doctype = scopeDoctype;
  const { data } = await apiClient.get('/method/devx_ai.chatbot.chart.api.axis.get_axis_doctypes', {
    params,
  });
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, 'Failed to load axis doctypes');
  return Array.isArray(msg?.data) ? msg.data : [];
}

/**
 * Fetch all axis-eligible field options for a single DocType.
 *
 * This powers the second step of the two-step axis picker.
 * The returned items have the same shape as getChatbotXAxisOptions / getChatbotYAxisOptions
 * so buildChatbotChartPayload does not need changes.
 *
 * @param {{ axisType: 'x'|'y'|'group', chartType: string, doctype: string }} params
 * @returns {Promise<Array<{value: string, label: string, doctype: string, fieldname: string, ...}>>}
 */
export async function getAxisFieldsForDoctype({ axisType, chartType, doctype }) {
  const resolvedChartType = chartType === 'table' ? 'vertical_bar' : chartType;
  const params = { axis_type: axisType, chart_type: resolvedChartType, doctype };
  const { data } = await apiClient.get(
    '/method/devx_ai.chatbot.chart.api.axis.get_axis_fields_for_doctype',
    { params },
  );
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, 'Failed to load axis fields');
  return Array.isArray(msg?.data) ? msg.data : [];
}

// ─── Time bucket helpers ──────────────────────────────────────────────────────

export const TIME_BUCKET_OPTIONS = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'quarter', label: 'Quarterly' },
  { value: 'year', label: 'Yearly' },
];

/** True when an axis field supports date/time bucketing on the x-axis. */
export function isDatetimeAxisField(option) {
  if (!option) return false;
  if (option.is_time_series) return true;
  const abstractType = (option.abstract_data_type || '').toLowerCase();
  return abstractType === 'date' || abstractType === 'datetime';
}

export function getDefaultTimeBucket(option) {
  if (!isDatetimeAxisField(option)) return null;
  return option.default_time_bucket || 'month';
}

export function getValidTimeBucketOptions(option) {
  const allowed = option?.valid_time_buckets;
  if (Array.isArray(allowed) && allowed.length > 0) {
    return TIME_BUCKET_OPTIONS.filter((opt) => allowed.includes(opt.value));
  }
  return TIME_BUCKET_OPTIONS;
}

// ─── Chart Data ───────────────────────────────────────────────────────────────

function isAbortError(error) {
  return (
    error?.code === 'ERR_CANCELED' ||
    error?.name === 'AbortError' ||
    error?.name === 'CanceledError'
  );
}

/**
 * Build the `data` payload for preview_chart / get_chart_data endpoints.
 *
 * @param {{
 *   chartType: string,
 *   xAxisOption: object | null,
 *   yAxisOption: object | null,
 *   yAggregation?: string | null,
 *   groupByOption?: object | null,
 *   filters?: Array | null,
 * }} config
 */
export function buildChatbotChartPayload({
  chartType,
  xAxisOption,
  yAxisOption,
  yAggregation = null,
  groupByOption = null,
  filters = null,
  xTimeBucket = null,
  tableExtraFields = null,
  sortBy = null,
  sortDirection = null,
  rowLimit = null,
}) {
  const x_axis = xAxisOption
    ? {
        doctype: xAxisOption.doctype,
        fieldname: xAxisOption.fieldname,
        label: xAxisOption.label,
        fieldtype: xAxisOption.fieldtype,
        alias: 'x_axis',
        join_path: xAxisOption.join_path ?? [],
        is_formula: xAxisOption.is_formula ?? false,
        ...(xTimeBucket && isDatetimeAxisField(xAxisOption) ? { time_bucket: xTimeBucket } : {}),
      }
    : null;

  const agg = yAggregation || yAxisOption?.default_aggregation || null;
  const y_axis = yAxisOption
    ? {
        doctype: yAxisOption.doctype,
        fieldname: yAxisOption.fieldname,
        label: yAxisOption.label,
        fieldtype: yAxisOption.fieldtype,
        alias: 'y_axis',
        ...(agg ? { aggregation: agg } : {}),
        join_path: yAxisOption.join_path ?? [],
        is_formula: yAxisOption.is_formula ?? false,
      }
    : null;

  const group_by =
    groupByOption && groupByOption.doctype
      ? [
          {
            doctype: groupByOption.doctype,
            fieldname: groupByOption.fieldname,
            label: groupByOption.label,
            alias: 'group_0',
            join_path: groupByOption.join_path ?? [],
          },
        ]
      : [];

  return {
    chart_type: chartType,
    x_axis,
    y_axis,
    group_by,
    filters: filters ?? [],
    ...(Array.isArray(tableExtraFields) && tableExtraFields.length > 0
      ? { table_extra_fields: tableExtraFields }
      : {}),
    ...(sortBy
      ? {
          sort_by: sortBy,
          sort_direction: sortDirection || 'desc',
        }
      : {}),
    ...(rowLimit != null && rowLimit > 0 ? { row_limit: rowLimit } : {}),
  };
}

/**
 * Run a chart preview (limit 100 rows) via the chatbot API.
 *
 * @param {object} payload - output of buildChatbotChartPayload
 * @returns {Promise<{status: string, chart_type: string, data: object, metadata: object}>}
 */
export async function previewChatbotChart(payload) {
  const { data } = await apiClient.post('/method/devx_ai.chatbot.chart.api.chart.preview_chart', {
    data: JSON.stringify(payload),
  });
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, 'Chart preview failed');
  return msg;
}

/**
 * Fetch Data-tab rows only (optional extra columns). Does not affect chart rendering.
 *
 * @param {object} payload - output of buildChatbotChartPayload (may include table_extra_fields)
 * @returns {Promise<{status: string, raw_rows: Array, metadata: object}>}
 */
export async function previewChartTableData(payload) {
  const { data } = await apiClient.post(
    '/method/devx_ai.chatbot.chart.api.chart.preview_chart_table_data',
    { data: JSON.stringify(payload) },
  );
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, 'Failed to load table data');
  return msg;
}

/**
 * Fetch Data-tab rows for a saved chart with an additional drill-down filter applied.
 *
 * @param {string} chartId
 * @param {object} drillDownFilter
 * @param {Array | null} tableExtraFields
 */
export async function previewChartDataWithFilter(
  chartId,
  drillDownFilter,
  tableExtraFields = null,
) {
  const { data } = await apiClient.post(
    '/method/devx_ai.chatbot.api.dashboard_master.preview_chart_data_with_filter',
    {
      chart_id: chartId,
      drill_down_filter: JSON.stringify(drillDownFilter),
      ...(Array.isArray(tableExtraFields) && tableExtraFields.length > 0
        ? { table_extra_fields: JSON.stringify(tableExtraFields) }
        : {}),
    },
  );
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, 'Failed to load filtered table data');
  return msg;
}

/**
 * Fetch individual (non-aggregated) source records for a drill-down segment.
 *
 * @param {{ chartId?: string | null, axisConfig?: object | null, drillDownFilter: object }} params
 */
export async function getDrillDownDetailRows({
  chartId = null,
  axisConfig = null,
  drillDownFilter,
  tableExtraFields = null,
}) {
  const { data } = await apiClient.post(
    '/method/devx_ai.chatbot.api.dashboard_master.get_drill_down_detail_rows',
    {
      ...(chartId ? { chart_id: chartId } : {}),
      ...(axisConfig ? { axis_config: JSON.stringify(axisConfig) } : {}),
      drill_down_filter: JSON.stringify(drillDownFilter),
      ...(Array.isArray(tableExtraFields) && tableExtraFields.length > 0
        ? { table_extra_fields: JSON.stringify(tableExtraFields) }
        : {}),
    },
  );
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, 'Failed to load detail rows');
  return msg;
}

/**
 * Scalar, queryable fields for the Data-tab column picker.
 *
 * @param {string} doctype
 */
export async function getDataTabFields(doctype) {
  if (!doctype) return [];
  const { data } = await apiClient.get(
    '/method/devx_ai.chatbot.chart.api.chart.get_data_tab_fields',
    { params: { doctype } },
  );
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, 'Failed to load data tab fields');
  return Array.isArray(msg?.data) ? msg.data : [];
}

/**
 * Fetch the full chart dataset via the chatbot API.
 *
 * Errors are rethrown with an `httpStatus` property so callers can distinguish
 * a 403 PermissionError (access revoked) from transient failures.
 *
 * @param {object} payload - Chart axis config (from `buildChatbotChartPayload` or saved `axis_config`).
 * @param {object} [options]
 * @param {AbortSignal} [options.signal] - Abort in-flight / queued requests when deps change.
 * @returns {Promise<{status: string, chart_type: string, data: object, metadata: object}>}
 */
export async function getChatbotChartData(payload, { signal } = {}) {
  if (signal?.aborted) {
    const wrapped = new Error('Aborted');
    wrapped.code = 'ERR_CANCELED';
    throw wrapped;
  }

  const apiPayload = {
    ...payload,
    chart_type: resolvePreviewChartType(payload?.chart_type),
  };

  try {
    const { data } = await apiClient.post(
      '/method/devx_ai.chatbot.chart.api.chart.get_chart_data',
      { data: JSON.stringify(apiPayload) },
      { signal },
    );
    const msg = unwrapFrappeMessage(data);
    assertSuccess(msg, 'Failed to fetch chart data');
    return msg;
  } catch (error) {
    if (isAbortError(error)) {
      const wrapped = new Error('Aborted');
      wrapped.code = 'ERR_CANCELED';
      throw wrapped;
    }
    const httpStatus = error?.response?.status;
    const message =
      error?.response?.data?.exception ||
      error?.response?.data?._server_messages ||
      error?.message ||
      'Failed to fetch chart data';
    const wrapped = new Error(message);
    wrapped.httpStatus = httpStatus;
    throw wrapped;
  }
}

/** Stable column key for optional data-tab fields (matches backend alias). */
export function chartTableExtraFieldKey(doctype, fieldname) {
  return `extra__${doctype}__${fieldname}`;
}

/**
 * Map chart_type string to the viz component identifier used by devx-ai-chart-card.
 */
function chatbotChartTypeToVizId(chartType) {
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
  return map[(chartType || '').toLowerCase()] ?? 'bar_chart';
}

/** Map UI chart types to backend-supported preview types when needed. */
export function resolvePreviewChartType(chartType) {
  const type = String(chartType || '').toLowerCase();
  if (type === 'battery') return 'pie';
  if (type === 'table') return 'vertical_bar';
  return type;
}

/**
 * Convert the chatbot API chart response into a dashboard-widget-compatible chartData object.
 *
 * @param {{
 *   apiResponse: object,
 *   title?: string,
 *   chatbotConfig?: object,
 * }} params
 * @returns {object | null}
 */
export function transformChatbotResponseToChartData({
  apiResponse,
  title = '',
  chatbotConfig = null,
}) {
  if (!apiResponse || apiResponse.status !== 'success') return null;

  const chartData = apiResponse.data ?? {};
  const apiChartType = (apiResponse.chart_type || 'vertical_bar').toLowerCase();
  const intendedType = String(chatbotConfig?.chart_type || apiChartType).toLowerCase();
  const defaultViz = chartMasterTypeToVizId(intendedType);

  // KPI cards return a single value payload ({ value, formatted_value, label, subtitle }),
  // not the labels/datasets structure used by bar/line/pie charts.
  if (intendedType === 'kpi') {
    const raw_rows = Array.isArray(apiResponse.raw_rows) ? apiResponse.raw_rows : [];
    const rawValue = chartData.value ?? raw_rows[0]?.y_axis ?? apiResponse.metadata?.value ?? null;
    const value =
      typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : Number(rawValue ?? 0);
    const rows = raw_rows.length > 0 ? raw_rows : [{ y_axis: value }];

    return {
      title: title || chartData.label || apiResponse.metadata?.y_label || 'KPI',
      labels: [],
      datasets: [{ data: [value] }],
      raw_data: rows,
      raw_rows: rows,
      kpi: {
        value,
        formatted_value: chartData.formatted_value ?? null,
        label: chartData.label ?? apiResponse.metadata?.y_label ?? 'Value',
        subtitle: chartData.subtitle ?? null,
      },
      chart_type: 'kpi',
      supported_components: ['kpi_tile', 'data_table'],
      default_component: 'kpi_tile',
      isChatbotChart: true,
      chatbotConfig: chatbotConfig ?? null,
      metadata: apiResponse.metadata ?? {},
    };
  }

  const labels = Array.isArray(chartData.labels) ? chartData.labels.map(String) : [];
  const datasets = Array.isArray(chartData.datasets) ? chartData.datasets : [{ data: [] }];

  const primaryDataset = datasets[0] ?? { data: [] };

  // For grouped charts (multiple datasets), build the groupedBar structure and
  // collapse to per-label totals for the non-grouped views (pie / line / table).
  let groupedBar = null;
  let primarySeries = Array.isArray(primaryDataset.data) ? primaryDataset.data : [];
  if (datasets.length > 1) {
    const totals = labels.map((_, i) =>
      datasets.reduce((sum, ds) => sum + (Number(ds.data?.[i]) || 0), 0),
    );
    groupedBar = {
      labels,
      groups: datasets.map((ds, i) => ({
        label: ds.label || '',
        color: paletteColorAt(CHART_GROUP_COLORS, i),
        data: ds.data ?? [],
      })),
      totals,
    };
    // Without this, pie/line/table would show only the first group's values.
    primarySeries = totals;
  }

  // Build raw_data (table + fallback series) from labels + the effective series.
  const raw_data = labels.map((lbl, i) => ({
    x_value: lbl,
    y_value: primarySeries[i] ?? 0,
  }));

  return {
    title: title || apiResponse.metadata?.x_label || 'Chart',
    labels,
    datasets: [{ data: primarySeries }],
    raw_data,
    raw_rows: Array.isArray(apiResponse.raw_rows) ? apiResponse.raw_rows : raw_data,
    groupedBar: groupedBar ?? undefined,
    hasGroupBy: Boolean(groupedBar),
    chart_type: intendedType,
    supported_components: supportedComponentsForChartType(intendedType),
    default_component: defaultViz,
    isChatbotChart: true,
    chatbotConfig: chatbotConfig ?? null,
    metadata: apiResponse.metadata ?? {},
  };
}

// ─── Natural-language chat → chart (chatbot pipeline) ──────────────────────

/**
 * Run a natural-language query through the chatbot multi-agent pipeline.
 *
 * @param {string} query - User's natural language prompt
 * @returns {Promise<{
 *   status: 'success' | 'failed' | 'non_dashboard',
 *   chart_name?: string,
 *   chart_type?: string,
 *   data?: object,
 *   chart_spec?: object,
 *   metadata?: object,
 *   formula_used?: Array,
 *   failure_reason?: string,
 * }>}
 */
export async function generateChartFromQuery(query) {
  const { data } = await apiClient.post(
    '/method/devx_ai.chatbot.chart.api.ai_chart.generate_chart_from_query',
    { query },
  );
  const msg = unwrapFrappeMessage(data);
  return msg ?? { status: 'failed', failure_reason: 'No response from server.' };
}

// Chart persistence now lives in Chart Master — see @/services/dashboard-master-service.
// The old `AI Dashboard Config` doctype and its `saved_chart` endpoints were removed.

// ─── Formula Fields ──────────────────────────────────────────────────────────

/**
 * List active formula fields, optionally filtered by source doctype.
 *
 * @param {{ doctype?: string | null }} params
 * @returns {Promise<Array<{name: string, display_name: string, source_doctype: string, source_fieldname: string, aggregation_type: string, abstract_data_type: string}>>}
 */
export async function listChatbotFormulaFields({ doctype = null } = {}) {
  const params = {};
  if (doctype) params.doctype = doctype;

  const { data } = await apiClient.get(
    '/method/devx_ai.chatbot.chart.api.formula.list_formula_fields',
    { params },
  );
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, 'Failed to load formula fields');
  return Array.isArray(msg?.data) ? msg.data : [];
}

/**
 * Validate a formula definition without saving it.
 *
 * @param {{
 *   display_name: string,
 *   source_doctype: string,
 *   source_fieldname?: string,
 *   aggregation_type: string,
 *   formula_expression?: string,
 *   is_expression_mode?: boolean,
 * }} formulaData
 */
export async function validateChatbotFormula(formulaData) {
  const { data } = await apiClient.post(
    '/method/devx_ai.chatbot.chart.api.formula.validate_formula',
    { data: JSON.stringify(formulaData) },
  );
  const msg = unwrapFrappeMessage(data);
  return msg ?? { valid: false, errors: ['Unknown validation error'] };
}

/**
 * Create a new formula field.
 *
 * @param {{
 *   display_name: string,
 *   source_doctype: string,
 *   source_fieldname?: string,
 *   aggregation_type: string,
 *   formula_expression?: string,
 *   is_expression_mode?: boolean,
 *   description?: string,
 * }} formulaData
 */
export async function createChatbotFormula(formulaData) {
  const { data } = await apiClient.post(
    '/method/devx_ai.chatbot.chart.api.formula.create_formula',
    { data: JSON.stringify(formulaData) },
  );
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, 'Failed to create formula field');
  return msg?.data ?? msg;
}

/**
 * Delete (soft-deactivate) a formula field.
 *
 * @param {string} name - Formula record name
 */
export async function deleteChatbotFormula(name) {
  const { data } = await apiClient.post(
    '/method/devx_ai.chatbot.chart.api.formula.delete_formula',
    { name },
  );
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, 'Failed to delete formula field');
  return true;
}

/**
 * Fetch a single formula field with full details (including terms).
 *
 * @param {string} name - Formula record name
 */
export async function getChatbotFormula(name) {
  if (!name) return null;
  const { data } = await apiClient.get('/method/devx_ai.chatbot.chart.api.formula.get_formula', {
    params: { name },
  });
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, 'Failed to load formula field');
  return msg?.data ?? msg;
}

/**
 * Update an existing formula field.
 *
 * @param {string} name - Formula record name
 * @param {object} formulaData - Updated formula payload
 */
export async function updateChatbotFormula(name, formulaData) {
  const { data } = await apiClient.post(
    '/method/devx_ai.chatbot.chart.api.formula.update_formula',
    { name, data: JSON.stringify(formulaData) },
  );
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, 'Failed to update formula field');
  return msg?.data ?? msg;
}

// ─── Filter Metadata ────────────────────────────────────────────────────────

export async function getFilterDoctypes() {
  const { data } = await apiClient.get(
    '/method/devx_ai.chatbot.chart.api.filter.get_filter_doctypes',
  );
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, 'Failed to load filter doctypes');
  return Array.isArray(msg?.data) ? msg.data : [];
}

export async function getFilterFields(doctype) {
  if (!doctype) return [];
  const { data } = await apiClient.get(
    '/method/devx_ai.chatbot.chart.api.filter.get_filter_fields',
    { params: { doctype } },
  );
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, 'Failed to load filter fields');
  return Array.isArray(msg?.data) ? msg.data : [];
}

export async function getFilterOptions(doctype, fieldname, query = '') {
  if (!doctype || !fieldname) return [];
  const { data } = await apiClient.get(
    '/method/devx_ai.chatbot.chart.api.filter.get_filter_options',
    { params: { doctype, fieldname, query } },
  );
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, 'Failed to load filter options');
  return Array.isArray(msg?.data) ? msg.data : [];
}

// ─── Formula Fields ──────────────────────────────────────────────────────────

/**
 * Return aggregatable fields for a doctype — used by the structured formula term builder
 * to populate the field dropdown after a DocType is entered.
 *
 * @param {string} doctype - DocType name (must exist in Chatbot Doctype Registry)
 * @returns {Promise<Array<{fieldname: string, label: string, fieldtype: string, abstract_data_type: string}>>}
 */
export async function getDocTypeAggregatableFields(doctype) {
  if (!doctype) return [];
  const { data } = await apiClient.get(
    '/method/devx_ai.chatbot.chart.api.formula.get_doctype_aggregatable_fields',
    { params: { doctype } },
  );
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, `Failed to load fields for doctype: ${doctype}`);
  return Array.isArray(msg?.data) ? msg.data : [];
}

/**
 * Return fields eligible for the formula builder (aggregatable + date fields for TAT-style math).
 * Falls back to aggregatable-only fields when the dedicated endpoint is unavailable.
 *
 * @param {string} doctype
 * @returns {Promise<Array<{fieldname: string, label: string, fieldtype: string, abstract_data_type: string}>>}
 */
export async function getFormulaBuilderFields(doctype) {
  if (!doctype) return [];

  try {
    const { data } = await apiClient.get(
      '/method/devx_ai.chatbot.chart.api.formula.get_formula_fields',
      { params: { doctype, include_date_fields: 1 } },
    );
    const msg = unwrapFrappeMessage(data);
    assertSuccess(msg, `Failed to load formula fields for doctype: ${doctype}`);
    if (Array.isArray(msg?.data)) {
      return msg.data;
    }
  } catch {
    // Backend may not expose get_formula_fields yet — fall through to aggregatable fields.
  }

  return getDocTypeAggregatableFields(doctype);
}

/**
 * Return all active doctypes from the Chatbot Doctype Registry.
 * Used by the inline formula builder to populate the DocType picker.
 *
 * @returns {Promise<Array<{name: string, label: string}>>}
 */
export async function listRegisteredDoctypes() {
  const { data } = await apiClient.get(
    '/method/devx_ai.chatbot.chart.api.formula.list_registered_doctypes',
  );
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, 'Failed to load registered doctypes');
  return Array.isArray(msg?.data) ? msg.data : [];
}

/**
 * Create or update a Chatbot Formula Field from the inline formula builder JSON.
 * Returns the formula record name so it can be used as the Y-axis.
 *
 * @param {{
 *   name: string,
 *   formula_record?: string,
 *   terms: Array<{aggregation: string, doctype: string, fieldname: string, operator?: string}>
 * }} formulaJson
 * @returns {Promise<{formula_record: string}>}
 */
export async function upsertChartFormula(formulaJson) {
  const { data } = await apiClient.post(
    '/method/devx_ai.chatbot.api.dashboard_master.upsert_chart_formula',
    { formula_json: JSON.stringify(formulaJson) },
  );
  const msg = unwrapFrappeMessage(data);
  assertSuccess(msg, 'Failed to save formula');
  return msg?.data ?? {};
}
