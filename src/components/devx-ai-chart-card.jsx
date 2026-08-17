import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
  RiAddLine,
  RiBarChartLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiExternalLinkLine,
  RiFullscreenLine,
  RiGridLine,
  RiLineChartLine,
  RiLockLine,
  RiPieChartLine,
  RiSettings3Line,
  RiTableLine,
} from 'react-icons/ri';

import {
  BatteryChartBlock,
  CompareTileBlock,
  HeatmapBlock,
  HorizontalBarChartBlock,
  KpiTileBlock,
  LineChartBlock,
  niceCeil,
  normalizeSupportedForCard,
  pickInitialViz,
  RadialCategoryChartBlock,
  StackedVerticalBarChartBlock,
  VerticalBarChartBlock,
  vizLabel,
  CHART_GROUP_COLORS,
  RADIAL_CATEGORY_COLORS,
  BAR_CATEGORY_COLORS,
  buildCategoryColorMap,
  colorsForLabels,
  paletteColorAt,
} from '@/components/devx-ai-chart-visualizations';
import { DashboardWidgetExpandModal } from '@/components/dashboard-master/viewer/dashboard-widget-expand-modal';
import DashboardChartFilterEmptyState from '@/components/dashboard-master/viewer/dashboard-chart-filter-empty';
import ChartLegendPanel from '@/components/dashboard-master/viewer/chart-legend-panel';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import * as Dropdown from '@/components/ui/dropdown';
import {
  getChatbotChartData,
  transformChatbotResponseToChartData,
} from '@/services/chatbot-chart-service';
import { cn } from '@/utils/cn';
import { buildDrillDownFilter } from '@/utils/chart-drill-down-utils';
import { BatteryChartTypeIcon } from '@/components/dashboard-master/chart-type-icons';
import {
  chartMasterTypeToVizId,
  chatbotConfigDependencyKey,
  supportedComponentsForChartType,
} from '@/utils/chart-type-utils';
import { tabFiltersDependencyKey, tabFiltersForChartType } from '@/utils/dashboard-time-filter';

export { chartMasterTypeToVizId };

// ── Deprecated legacy hooks/consts ───────────────────────────────────────
// The old portfolio-dashboard system was removed in favour of Dashboard Master.
// These stubs preserve the render surface of this card (charts still render fine
// in AI chat and elsewhere) while the "Add to Dashboard" and inline settings
// features are turned off. Persistence now happens through Chart Master, driven
// from the Dashboard Master viewer page.
const PORTFOLIO_DASHBOARD_TABS = [];
const useDashboardWidgets = () => null;
const ChatbotChartBuilderModal = () => null;
const getChatbotChart = async () => null;
const saveChatbotChart = async () => null;
const revokeAllChartShares = async () => null;

const CHART_TYPE_OPTIONS = [
  { value: 'vertical_bar', label: 'Vertical Bar Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'line', label: 'Line Chart' },
];

function formatTableCell(cell) {
  if (typeof cell !== 'number') {
    return String(cell ?? '');
  }
  if (Number.isInteger(cell)) {
    return cell;
  }
  return Math.round(cell * 100) / 100;
}

/** Build a key→display-label map from chatbotConfig axis definitions. */
function buildColLabels(chatbotConfig) {
  const map = {};
  const xLabel = chatbotConfig?.x_axis?.label;
  const yLabel = chatbotConfig?.y_axis?.label;
  if (xLabel) map.x_value = xLabel;
  if (yLabel) map.y_value = yLabel;
  return map;
}

function humaniseKey(key) {
  return key.replaceAll('_', ' ').replaceAll(/\b\w/g, (c) => c.toUpperCase());
}

/** Detail overlay shown when a table row is clicked. */
function TableRowDetailModal({ row, colLabels, onClose }) {
  const entries = Object.entries(row);
  return createPortal(
    <div
      className='fixed inset-0 z-[250] flex items-end justify-center sm:items-center'
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className='absolute inset-0 bg-black/40' aria-hidden />
      <div className='relative z-10 w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-bg-white-0 shadow-regular-lg overflow-hidden'>
        <div className='flex items-center justify-between border-b border-stroke-soft-200 px-4 py-3'>
          <span className='label-small text-text-strong-950'>Row detail</span>
          <button
            type='button'
            onClick={onClose}
            className='flex size-7 items-center justify-center rounded-md text-text-sub-500 hover:bg-bg-weak-50 transition-colors'
            aria-label='Close'
          >
            <RiCloseLine className='size-4' />
          </button>
        </div>
        <ul className='max-h-[60vh] overflow-y-auto divide-y divide-stroke-soft-100'>
          {entries.map(([key, value]) => (
            <li key={key} className='flex items-start gap-3 px-4 py-2.5'>
              <span className='w-[45%] shrink-0 paragraph-xsmall text-text-sub-500 pt-0.5'>
                {colLabels[key] ?? humaniseKey(key)}
              </span>
              <span className='min-w-0 flex-1 paragraph-small text-text-strong-950 break-words'>
                {formatTableCell(value)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

/** Table of raw chart data rows with proper field-name headers and clickable rows. */
function ChartRawDataTable({ rawRows, chatbotConfig }) {
  const [selectedRow, setSelectedRow] = useState(null);
  if (!Array.isArray(rawRows) || rawRows.length === 0) return null;

  const colLabels = buildColLabels(chatbotConfig);
  const getColLabel = (key) => colLabels[key] ?? humaniseKey(key);

  return (
    <>
      <table className='w-full min-w-[280px] border-collapse text-left text-[12px] text-text-main-900'>
        <thead className='sticky top-0 bg-bg-weak-50'>
          <tr>
            {Object.keys(rawRows[0]).map((key) => (
              <th
                key={key}
                className='border-b border-stroke-soft-200 px-2 py-1.5 font-medium text-text-sub-600'
              >
                {getColLabel(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rawRows.map((row, rowIdx) => {
            const rowKey = `row-${rowIdx}`;
            return (
              <tr
                key={rowKey}
                className='cursor-pointer border-b border-stroke-soft-100 transition-colors hover:bg-bg-soft-100 last:border-0'
                onClick={() => setSelectedRow(row)}
              >
                {Object.entries(row).map(([colKey, cell]) => (
                  <td key={`${rowKey}|${colKey}`} className='px-2 py-1.5'>
                    {formatTableCell(cell)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {selectedRow ? (
        <TableRowDetailModal
          row={selectedRow}
          colLabels={colLabels}
          onClose={() => setSelectedRow(null)}
        />
      ) : null}
    </>
  );
}

function inferSeriesFromRawRows(rawRows) {
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return { labels: [], series: [] };
  }

  const firstRow = rawRows.find((r) => r && typeof r === 'object');
  if (!firstRow) {
    return { labels: [], series: [] };
  }

  const keys = Object.keys(firstRow);
  if (keys.length === 0) {
    return { labels: [], series: [] };
  }

  const numericKey = keys.find((key) =>
    rawRows.every((row) => row && typeof row[key] === 'number' && Number.isFinite(row[key])),
  );

  const labelKey = keys.find(
    (key) =>
      key !== numericKey &&
      rawRows.every((row) => row && row[key] !== null && row[key] !== undefined && row[key] !== ''),
  );

  if (!numericKey || !labelKey) {
    return { labels: [], series: [] };
  }

  return {
    labels: rawRows.map((row) => String(row[labelKey])),
    series: rawRows.map((row) => Number(row[numericKey])),
  };
}

/** Inline spinner used inside axis sections while fetching options. */
function AxisLoadingSpinner({ size = 'sm', label }) {
  const sz = size === 'lg' ? 'size-6' : 'size-4';
  return (
    <span className='flex items-center gap-1.5 text-text-sub-500'>
      <svg
        className={cn('animate-spin', sz)}
        xmlns='http://www.w3.org/2000/svg'
        fill='none'
        viewBox='0 0 24 24'
        aria-hidden
      >
        <circle
          className='opacity-25'
          cx='12'
          cy='12'
          r='10'
          stroke='currentColor'
          strokeWidth='4'
        />
        <path
          className='opacity-75'
          fill='currentColor'
          d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
        />
      </svg>
      {label ? <span className='text-xs'>{label}</span> : null}
    </span>
  );
}

function vizIcon(id) {
  switch (id) {
    case 'data_table':
      return RiTableLine;
    case 'line_chart':
      return RiLineChartLine;
    case 'donut_chart':
    case 'pie_chart':
      return RiPieChartLine;
    case 'battery_chart':
      return BatteryChartTypeIcon;
    case 'horizontal_bar_chart':
      return RiBarChartLine;
    case 'heatmap':
      return RiGridLine;
    case 'compare_tile':
    case 'kpi_tile':
      return RiBarChartLine;
    default:
      return RiBarChartLine;
  }
}

function defaultSettingsFromChart(chartData) {
  const ct = String(chartData?.chart_type ?? 'bar').toLowerCase();
  const chartType = ct === 'pie' ? 'pie' : ct === 'line' ? 'line' : 'vertical_bar';
  return {
    chartTitle: chartData?.title ? String(chartData.title) : 'Chart',
    showDescription: false,
    chartType,
    dataSource: 'devx_ai',
    xAxis: 'client',
    sortBy: 'highest_amount',
    yAxis: 'amount',
    /** Dynamic axis configuration — null for AI-chat widgets without axis config. */
    axisConfig: null,
  };
}

const EMPTY_LEGEND_FILTER_SET = new Set();

function hasChartSnapshot(data) {
  if (!data) return false;
  if (data.kpi != null) return true;
  if (Array.isArray(data.labels) && data.labels.length > 0) return true;
  if (Array.isArray(data.raw_data) && data.raw_data.length > 0) return true;
  const series = data.datasets?.[0]?.data;
  return Array.isArray(series) && series.length > 0;
}

function filterGroupedBarByLegend(groupedBar, hidden) {
  if (!groupedBar?.groups?.length) return groupedBar;
  const filteredGroups = groupedBar.groups.filter((group) => !hidden.has(group.label));
  const filteredTotals = groupedBar.labels.map((_, index) =>
    filteredGroups.reduce((sum, group) => sum + (group.data[index] ?? 0), 0),
  );
  return {
    ...groupedBar,
    groups: filteredGroups,
    totals: filteredTotals,
  };
}

/** Figma-aligned chart card; supports optional dashboard widget toolbar + expanded settings modal. */
const DevxAiChartCard = forwardRef(
  (
    {
      chartData,
      className,
      showAddToDashboard = true,
      dashboardWidget,
      dashboardFill = false,
      readOnly = false,
      hideVizPicker = false,
      hideTitle = false,
      dashboardMode = false,
      dashboardTileType = null,
      enableDrillDown = false,
      drillDownFilter = null,
      onDrillDown = null,
      tabFilters = null,
      showLegend = false,
      hiddenLegendItems = null,
      onLegendItemToggle = null,
      showAverage = false,
      showDataLabels = false,
      displayAsStackedArea = false,
      displayAs100Stacked = false,
      kpiBuilderPreview = false,
      fetchDelayMs = 0,
    },
    ref,
  ) => {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [settingsSeed, setSettingsSeed] = useState(null);
    const [expandOpen, setExpandOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const dashboardWidgets = useDashboardWidgets();
    const fillMeasureRef = useRef(null);
    const [fillBodyH, setFillBodyH] = useState(200);

    // ── Live chart data (re-executed from the saved chatbot config) ─────────
    const [axisChartData, setAxisChartData] = useState(null);
    const [axisQueryLoading, setAxisQueryLoading] = useState(false);
    // True when the backend returned 403 — user no longer has read access to the
    // chart's base doctype.  We must NOT fall back to cached data in that case.
    const [accessRevoked, setAccessRevoked] = useState(false);

    const canPin = Boolean(showAddToDashboard && dashboardWidgets?.addChartToTab && chartData);
    const isDashboardWidget = Boolean(dashboardWidget?.tabId && dashboardWidget?.widget?.id);

    const baseDefaults = useMemo(() => defaultSettingsFromChart(chartData), [chartData]);
    const mergedSettings = useMemo(() => {
      const s = dashboardWidget?.widget?.settings;
      const axisFromChart =
        chartData?.axisConfig && typeof chartData.axisConfig === 'object'
          ? chartData.axisConfig
          : null;
      return {
        ...baseDefaults,
        ...(axisFromChart && !(s && s.axisConfig) ? { axisConfig: axisFromChart } : {}),
        ...(s && typeof s === 'object' ? s : {}),
      };
    }, [baseDefaults, dashboardWidget?.widget?.settings, chartData?.axisConfig]);

    const chatbotConfig = useMemo(
      () => mergedSettings.chatbotConfig ?? chartData?.chatbotConfig ?? null,
      [mergedSettings.chatbotConfig, chartData?.chatbotConfig],
    );

    const effectiveTabFilters = useMemo(
      () =>
        tabFiltersForChartType(
          tabFilters,
          chartData?.chart_type || chatbotConfig?.chart_type,
          chatbotConfig,
        ),
      [tabFilters, chartData?.chart_type, chatbotConfig],
    );

    const tabFiltersKey = useMemo(
      () => tabFiltersDependencyKey(effectiveTabFilters),
      [effectiveTabFilters],
    );
    const chatbotConfigKey = useMemo(
      () => chatbotConfigDependencyKey(chatbotConfig),
      [chatbotConfig],
    );
    const chartHasSnapshot = useMemo(() => hasChartSnapshot(chartData), [chartData]);

    // ── Mount-time: re-execute saved chatbot config so the tile shows live data ──
    useEffect(() => {
      const cfg = chatbotConfig;
      const chartTypeForQuery = cfg?.chart_type || chartData?.chart_type || null;

      setAccessRevoked(false);

      if (!cfg?.y_axis) {
        setAxisChartData(null);
        setAxisQueryLoading(false);
        return undefined;
      }

      const controller = new AbortController();
      let cancelled = false;

      const queryPayload = effectiveTabFilters
        ? { ...cfg, chart_type: chartTypeForQuery, dashboard_tab_filters: effectiveTabFilters }
        : { ...cfg, chart_type: chartTypeForQuery };

      const runFetch = () => {
        if (cancelled || controller.signal.aborted) return;

        if (!hasChartSnapshot(chartData)) {
          setAxisQueryLoading(true);
        }

        getChatbotChartData(queryPayload, { signal: controller.signal })
          .then((response) => {
            if (cancelled || controller.signal.aborted) return;
            const enriched = transformChatbotResponseToChartData({
              apiResponse: response,
              title: mergedSettings.chartTitle || chartData?.title || 'Chart',
              chatbotConfig: {
                ...cfg,
                chart_type: chartTypeForQuery || cfg?.chart_type,
              },
            });
            const filtered = Boolean(tabFiltersKey);
            if (enriched) {
              const intendedType = chartData?.chart_type || enriched.chart_type;
              setAxisChartData({
                ...enriched,
                chart_type: intendedType,
                default_component:
                  chartData?.default_component ?? chartMasterTypeToVizId(intendedType),
                supported_components: chartData?.supported_components?.length
                  ? chartData.supported_components
                  : supportedComponentsForChartType(intendedType),
              });
            } else if (filtered) {
              setAxisChartData({
                labels: [],
                datasets: [{ data: [] }],
                raw_data: [],
                title: mergedSettings.chartTitle || chartData?.title || 'Chart',
                filterEmpty: true,
                metadata: { row_count: 0 },
              });
            } else {
              setAxisChartData(null);
            }
          })
          .catch((error) => {
            if (cancelled || controller.signal.aborted || error?.code === 'ERR_CANCELED') return;
            if (error?.httpStatus === 403) {
              setAccessRevoked(true);
            }
            setAxisChartData(null);
          })
          .finally(() => {
            if (!cancelled && !controller.signal.aborted) {
              setAxisQueryLoading(false);
            }
          });
      };

      const delayMs = Math.max(0, Number(fetchDelayMs) || 0);
      const timer = window.setTimeout(runFetch, delayMs);

      return () => {
        cancelled = true;
        window.clearTimeout(timer);
        controller.abort();
        setAxisQueryLoading(false);
      };
    }, [chatbotConfigKey, tabFiltersKey, fetchDelayMs, effectiveTabFilters, chartData?.chart_type]);

    const showLoadingOverlay = axisQueryLoading && !chartHasSnapshot;

    // Use live query result when available. While refetching, keep showing the saved snapshot.
    const isDashboardFiltered = Boolean(tabFiltersKey);
    const activeChartData = useMemo(() => {
      if (accessRevoked) return null;
      if (axisChartData != null) return axisChartData;
      if (chartHasSnapshot && chartData) return chartData;
      if (isDashboardFiltered && !axisQueryLoading) return null;
      return chartData;
    }, [
      accessRevoked,
      axisChartData,
      chartHasSnapshot,
      isDashboardFiltered,
      axisQueryLoading,
      chartData,
    ]);

    const showFilterEmptyState = useMemo(() => {
      if (!isDashboardFiltered || axisQueryLoading || accessRevoked || axisChartData == null) {
        return false;
      }
      if (axisChartData.filterEmpty) return true;
      const rowCount = activeChartData?.metadata?.row_count ?? axisChartData?.metadata?.row_count;
      return rowCount === 0;
    }, [
      isDashboardFiltered,
      axisQueryLoading,
      accessRevoked,
      axisChartData,
      activeChartData?.metadata?.row_count,
    ]);

    const rawRows = Array.isArray(activeChartData?.raw_data) ? activeChartData.raw_data : [];
    // raw_rows from the API may carry real field names; prefer it for the table view
    const tableRows = Array.isArray(activeChartData?.raw_rows) ? activeChartData.raw_rows : rawRows;
    const kpi = activeChartData?.kpi ?? null;
    const hasTable = rawRows.length > 0;
    const rawFallback = useMemo(() => inferSeriesFromRawRows(rawRows), [rawRows]);
    const labels = useMemo(() => {
      const fromDataset = Array.isArray(activeChartData?.labels) ? activeChartData.labels : [];
      return fromDataset.length > 0 ? fromDataset : rawFallback.labels;
    }, [activeChartData?.labels, rawFallback.labels]);
    const series = useMemo(() => {
      const fromDataset = activeChartData?.datasets?.[0]?.data;
      return Array.isArray(fromDataset) && fromDataset.length > 0
        ? fromDataset
        : rawFallback.series;
    }, [activeChartData?.datasets, rawFallback.series]);

    const groupedBar = useMemo(
      () => activeChartData?.groupedBar ?? null,
      [activeChartData?.groupedBar],
    );

    const hiddenLegendSet = useMemo(
      () => hiddenLegendItems ?? EMPTY_LEGEND_FILTER_SET,
      [hiddenLegendItems],
    );

    const resolvedVizType = useMemo(
      () => chartMasterTypeToVizId(chartData?.chart_type),
      [chartData?.chart_type],
    );
    const isRadialVizType = resolvedVizType === 'donut_chart' || resolvedVizType === 'pie_chart';
    const isBatteryVizType = resolvedVizType === 'battery_chart';

    const categoryPalette = isRadialVizType
      ? BAR_CATEGORY_COLORS
      : isBatteryVizType
        ? CHART_GROUP_COLORS
        : BAR_CATEGORY_COLORS;

    const categoryColorMap = useMemo(() => {
      return buildCategoryColorMap(labels, categoryPalette, { extendPalette: !isRadialVizType });
    }, [labels, categoryPalette, isRadialVizType]);

    const legendItems = useMemo(() => {
      if (groupedBar?.groups?.length) {
        return groupedBar.groups.map((group, index) => ({
          label: group.label,
          color: group.color || paletteColorAt(CHART_GROUP_COLORS, index),
        }));
      }
      if (labels.length > 0) {
        return labels.map((label) => ({
          label,
          color: categoryColorMap.get(String(label)) ?? paletteColorAt(BAR_CATEGORY_COLORS, 0),
        }));
      }
      return [];
    }, [groupedBar, labels, categoryColorMap]);

    const filteredGroupedBar = useMemo(
      () => (groupedBar ? filterGroupedBarByLegend(groupedBar, hiddenLegendSet) : null),
      [groupedBar, hiddenLegendSet],
    );

    const filteredLabels = useMemo(
      () => labels.filter((label) => !hiddenLegendSet.has(label)),
      [labels, hiddenLegendSet],
    );

    const filteredSeries = useMemo(
      () => series.filter((_, index) => !hiddenLegendSet.has(labels[index])),
      [series, labels, hiddenLegendSet],
    );

    const legendFilteredEmpty = useMemo(() => {
      if (hiddenLegendSet.size === 0) return false;
      if (groupedBar?.groups?.length) {
        return !filteredGroupedBar?.groups?.length;
      }
      return filteredLabels.length === 0;
    }, [hiddenLegendSet, groupedBar, filteredGroupedBar, filteredLabels.length]);

    const chartLabels = hiddenLegendSet.size > 0 ? filteredLabels : labels;
    const chartSeries = hiddenLegendSet.size > 0 ? filteredSeries : series;
    const chartGroupedBar = hiddenLegendSet.size > 0 ? filteredGroupedBar : groupedBar;

    const chartSegmentColors = useMemo(
      () =>
        colorsForLabels(chartLabels, categoryColorMap, categoryPalette, {
          extendPalette: !isRadialVizType,
        }),
      [chartLabels, categoryColorMap, categoryPalette, isRadialVizType],
    );

    const hiddenLegendKey = useMemo(() => [...hiddenLegendSet].sort().join('|'), [hiddenLegendSet]);
    const [legendFilterAnimating, setLegendFilterAnimating] = useState(false);

    useEffect(() => {
      if (!showLegend) return undefined;
      setLegendFilterAnimating(true);
      const timer = setTimeout(() => setLegendFilterAnimating(false), 500);
      return () => clearTimeout(timer);
    }, [hiddenLegendKey, showLegend]);

    const maxVal = useMemo(() => {
      if (chartGroupedBar?.groups?.length && chartData?.chart_type === 'line') {
        if (displayAsStackedArea) {
          const n = chartGroupedBar.labels.length;
          let maxSum = 0;
          for (let i = 0; i < n; i++) {
            const colSum = chartGroupedBar.groups.reduce(
              (sum, group) => sum + (Number(group.data?.[i]) || 0),
              0,
            );
            if (colSum > maxSum) maxSum = colSum;
          }
          return niceCeil(maxSum > 0 ? maxSum : 0);
        }
        const allValues = chartGroupedBar.groups
          .flatMap((g) => g.data)
          .filter((n) => typeof n === 'number' && !Number.isNaN(n));
        const m = allValues.length > 0 ? Math.max(...allValues) : 0;
        return niceCeil(Number.isFinite(m) && m > 0 ? m : 0);
      }
      if (chartGroupedBar?.totals?.length) {
        const m = Math.max(
          ...chartGroupedBar.totals.filter((n) => typeof n === 'number' && !Number.isNaN(n)),
        );
        return niceCeil(Number.isFinite(m) && m > 0 ? m : 0);
      }
      const nums = chartSeries.filter((n) => typeof n === 'number' && !Number.isNaN(n));
      const m = nums.length > 0 ? Math.max(...nums) : 0;
      return niceCeil(m);
    }, [chartGroupedBar, chartSeries, chartData?.chart_type, displayAsStackedArea]);

    const tickValues = useMemo(() => {
      const steps = 4;
      return Array.from({ length: steps + 1 }, (_, i) => maxVal * (1 - i / steps));
    }, [maxVal]);

    const supportedList = useMemo(
      () => normalizeSupportedForCard(activeChartData),
      [activeChartData],
    );

    const forcedViz = useMemo(() => {
      if (!hideVizPicker) return null;
      const fromType = chartMasterTypeToVizId(chartData?.chart_type);
      if (supportedList.includes(fromType)) return fromType;
      const fromDefault = chartData?.default_component;
      if (typeof fromDefault === 'string' && supportedList.includes(fromDefault))
        return fromDefault;
      return supportedList[0] ?? fromType;
    }, [hideVizPicker, chartData?.chart_type, chartData?.default_component, supportedList]);

    const [activeViz, setActiveViz] = useState(() => {
      if (hideVizPicker) {
        const fromType = chartMasterTypeToVizId(chartData?.chart_type);
        const supported = normalizeSupportedForCard(chartData);
        if (supported.includes(fromType)) return fromType;
        return pickInitialViz(chartData, supported, chartData?.default_component);
      }
      return pickInitialViz(chartData, normalizeSupportedForCard(chartData), undefined);
    });

    useEffect(() => {
      if (hideVizPicker && forcedViz) {
        setActiveViz(forcedViz);
        return;
      }
      setActiveViz(pickInitialViz(activeChartData, supportedList, mergedSettings.vizComponent));
    }, [activeChartData, supportedList, mergedSettings.vizComponent, hideVizPicker, forcedViz]);

    useEffect(() => {
      if (!dashboardFill) return;
      const el = fillMeasureRef.current;
      if (!el) return;
      const measure = () => {
        const h = el.clientHeight;
        setFillBodyH(Math.max(140, h));
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      const t = requestAnimationFrame(measure);
      return () => {
        cancelAnimationFrame(t);
        ro.disconnect();
      };
    }, [dashboardFill, activeViz]);

    const displayTitle = mergedSettings.chartTitle || chartData?.title || 'Chart';

    const handleVizSelect = (id) => {
      setActiveViz(id);
      if (isDashboardWidget) {
        dashboardWidgets?.updateWidgetSettings?.(dashboardWidget.tabId, dashboardWidget.widget.id, {
          vizComponent: id,
        });
      }
    };

    const handleAddToTab = async (tabId) => {
      let dataToAdd = chartData;
      // Persist chatbot charts to the backend so settings can reload them.
      if (chartData?.chatbotConfig) {
        try {
          const chartId = await saveChatbotChart({
            title: chartData.title || 'Chart',
            chatbotConfig: chartData.chatbotConfig,
            chartData,
            chartId: chartData.chatbotChartId ?? null,
          });
          if (chartId) dataToAdd = { ...chartData, chatbotChartId: chartId };
        } catch {
          /* non-fatal — chart still works locally */
        }
      }
      const id = dashboardWidgets?.addChartToTab(tabId, dataToAdd);
      if (id) {
        const label = PORTFOLIO_DASHBOARD_TABS.find((t) => t.id === tabId)?.label ?? tabId;
        toast.success(`Chart added to ${label}`, {
          description: dataToAdd?.title ? String(dataToAdd.title) : undefined,
        });
      }
    };

    // ── Open the chatbot settings modal, prefilled from the saved config ────
    const openSettings = async () => {
      setExpandOpen(false);
      const chartId = mergedSettings.chatbotChartId ?? null;
      const localCfg = chatbotConfig;
      const localTitle = mergedSettings.chartTitle || chartData?.title || '';

      if (chartId) {
        setSettingsLoading(true);
        try {
          const saved = await getChatbotChart(chartId);
          setSettingsSeed({
            config: saved?.chatbot_config ?? localCfg,
            chartId,
            title: saved?.title ?? localTitle,
          });
        } catch {
          setSettingsSeed({ config: localCfg, chartId, title: localTitle });
        } finally {
          setSettingsLoading(false);
        }
      } else {
        setSettingsSeed({ config: localCfg, chartId: null, title: localTitle });
      }
      setSettingsOpen(true);
    };

    // ── Persist edits made in the chatbot settings modal back to the widget ─
    const handleChatbotSettingsSaved = (finalChartData, chartId) => {
      if (!isDashboardWidget || !finalChartData) return;
      setAxisChartData(finalChartData);
      dashboardWidgets?.updateWidgetChartData?.(
        dashboardWidget.tabId,
        dashboardWidget.widget.id,
        finalChartData,
      );
      dashboardWidgets?.updateWidgetSettings?.(dashboardWidget.tabId, dashboardWidget.widget.id, {
        chartTitle: finalChartData.title,
        chatbotConfig: finalChartData.chatbotConfig ?? null,
        ...(chartId ? { chatbotChartId: chartId } : {}),
        ...(finalChartData.default_component
          ? { vizComponent: finalChartData.default_component }
          : {}),
      });
      if (finalChartData.default_component) {
        setActiveViz(finalChartData.default_component);
      }
    };

    const handleConfirmDelete = () => {
      if (!isDashboardWidget) return;
      dashboardWidgets?.removeWidget?.(dashboardWidget.tabId, dashboardWidget.widget.id);
      setDeleteOpen(false);
      toast.success('Chart removed from dashboard');
      // Revoke all shares for this chart so recipients stop seeing it.
      const chartId =
        mergedSettings?.chatbotChartId ?? dashboardWidget?.widget?.settings?.chatbotChartId ?? null;
      if (chartId) {
        revokeAllChartShares(chartId).catch(() => {});
      }
    };

    const iconBtnClass = cn(
      'inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-stroke-soft-200',
      'bg-bg-white-0 text-text-sub-600 shadow-regular-xs transition',
      'hover:border-stroke-soft-300 hover:bg-bg-weak-50 hover:text-text-strong-950',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-base',
    );

    const hasChartLegend = showLegend && legendItems.length > 0;
    // `fillBodyH` is measured on a flex sibling of ChartLegendPanel, so the browser's
    // flexbox layout has ALREADY excluded the legend's rendered height from it — do not
    // subtract legend space again here, or the chart is forced smaller than its real
    // box and (combined with a min-height floor) can visually overflow onto the legend.
    const barXAxisRowHeight = activeViz === 'bar_chart' && dashboardMode ? 88 : 0;
    const barH = dashboardFill ? Math.max(80, fillBodyH - 16 - barXAxisRowHeight) : 139;
    const lineH = dashboardFill ? Math.max(200, fillBodyH - 20) : undefined;
    const radialSize = dashboardFill
      ? Math.max(160, Math.min(320, Math.floor(fillBodyH * 0.85)))
      : 200;

    const isKpiDashboardTile = dashboardMode && dashboardTileType === 'kpi';
    const isChartDashboardTile = dashboardMode && dashboardTileType === 'chart';
    const canExpand = isDashboardWidget || dashboardMode;
    const isRadialViz = activeViz === 'donut_chart' || activeViz === 'pie_chart';
    const chartTransitionClass = cn(
      'transition-all duration-500 ease-out',
      legendFilterAnimating && 'scale-[0.985] opacity-75',
    );

    const drillDownEnabled = Boolean(
      enableDrillDown && onDrillDown && chatbotConfig?.x_axis?.fieldname,
    );
    const activeDrillDownFilter = drillDownFilter ?? null;

    const handleCategoryClick = useCallback(
      (payload) => {
        if (!drillDownEnabled) return;
        const filter = buildDrillDownFilter(payload, chatbotConfig);
        if (!filter) return;
        onDrillDown(filter);
      },
      [drillDownEnabled, chatbotConfig, onDrillDown],
    );

    const resolvedChartType =
      chartData?.chart_type || (isKpiDashboardTile ? 'kpi' : 'vertical_bar');
    const previewSummary = kpi?.subtitle || chartData?.summary || '';

    useImperativeHandle(ref, () => ({
      expand: () => {
        setSettingsOpen(false);
        setExpandOpen(true);
      },
    }));

    const expandModal = canExpand ? (
      <DashboardWidgetExpandModal
        open={expandOpen}
        onOpenChange={setExpandOpen}
        title={displayTitle}
        summary={previewSummary}
        chartType={resolvedChartType}
        chartData={activeChartData ?? chartData}
        loading={showLoadingOverlay}
      />
    ) : null;

    if (isKpiDashboardTile || (kpiBuilderPreview && activeViz === 'kpi_tile')) {
      return (
        <div
          className={cn(
            'group/chartcard relative flex h-full w-full flex-col overflow-hidden',
            kpiBuilderPreview
              ? 'bg-bg-white-0'
              : 'rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-[0_1px_2px_0_rgba(228,229,231,0.24)]',
            className,
          )}
        >
          {showLoadingOverlay ? (
            <div className='absolute inset-0 z-10 flex items-center justify-center bg-bg-white-0/75'>
              <AxisLoadingSpinner size='sm' label='Loading…' />
            </div>
          ) : null}
          {accessRevoked && !showLoadingOverlay ? (
            <div className='flex h-full flex-col items-center justify-center gap-1 px-3 text-center'>
              <RiLockLine className='size-4 text-text-disabled-300' aria-hidden />
              <p className='text-[11px] font-medium text-text-sub-600'>Access Revoked</p>
            </div>
          ) : showFilterEmptyState ? (
            <DashboardChartFilterEmptyState compact className='h-full' />
          ) : (
            <KpiTileBlock
              rawRows={rawRows}
              series={series}
              kpi={kpi}
              title={displayTitle}
              variant={kpiBuilderPreview ? 'builder' : 'dashboard'}
            />
          )}
          {expandModal}
        </div>
      );
    }

    return (
      <div
        className={cn(
          'group/chartcard relative flex w-full max-w-[392px] flex-col rounded-xl border border-[rgba(226,228,233,0.6)]',
          'bg-bg-white-0 shadow-[0_2px_4px_0_rgba(27,28,29,0.04)]',
          isChartDashboardTile ? 'h-full gap-0 border-stroke-soft-200 p-0' : 'gap-4 px-4 pb-5 pt-4',
          dashboardFill && 'max-w-none min-h-0 flex-1',
          className,
        )}
      >
        {canPin ? (
          <div
            className={cn(
              'pointer-events-none absolute right-2 top-2 z-[5]',
              'opacity-0 transition-opacity duration-200',
              'group-hover/chartcard:pointer-events-auto group-hover/chartcard:opacity-100',
              'focus-within:pointer-events-auto focus-within:opacity-100',
            )}
          >
            <Dropdown.Root>
              <Dropdown.Trigger asChild>
                <button
                  type='button'
                  className={cn(
                    'pointer-events-auto flex items-center gap-1.5 rounded-lg border border-stroke-soft-200',
                    'bg-bg-white-0 px-2.5 py-1.5 text-[12px] font-medium text-text-strong-950 shadow-regular-md',
                    'transition hover:bg-bg-weak-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-base',
                  )}
                >
                  <RiAddLine className='size-4 shrink-0 text-primary-base' aria-hidden />
                  Add to Dashboard
                </button>
              </Dropdown.Trigger>
              <Dropdown.Content align='end' className='min-w-[220px]'>
                <Dropdown.Label>Choose tab</Dropdown.Label>
                {PORTFOLIO_DASHBOARD_TABS.map((tab) => (
                  <Dropdown.Item key={tab.id} onClick={() => handleAddToTab(tab.id)}>
                    {tab.label}
                  </Dropdown.Item>
                ))}
              </Dropdown.Content>
            </Dropdown.Root>
          </div>
        ) : null}

        {isDashboardWidget && !readOnly ? (
          <div
            data-devx-dashboard-no-drag
            className={cn(
              'pointer-events-none absolute right-2 top-2 z-[6] flex items-center gap-1',
              'opacity-0 transition-opacity duration-200',
              'group-hover/chartcard:pointer-events-auto group-hover/chartcard:opacity-100',
              'focus-within:pointer-events-auto focus-within:opacity-100',
            )}
          >
            <button
              type='button'
              className={cn(iconBtnClass, 'pointer-events-auto')}
              aria-label='Chart settings'
              disabled={settingsLoading}
              onClick={openSettings}
            >
              {settingsLoading ? (
                <AxisLoadingSpinner size='sm' />
              ) : (
                <RiSettings3Line className='size-4' aria-hidden />
              )}
            </button>
            <button
              type='button'
              className={cn(iconBtnClass, 'pointer-events-auto')}
              aria-label='Remove chart from dashboard'
              onClick={() => setDeleteOpen(true)}
            >
              <RiDeleteBinLine className='size-4' aria-hidden />
            </button>
            <button
              type='button'
              className={cn(iconBtnClass, 'pointer-events-auto')}
              aria-label='Expand chart'
              onClick={() => {
                setSettingsOpen(false);
                setExpandOpen(true);
              }}
            >
              <RiFullscreenLine className='size-4' aria-hidden />
            </button>
          </div>
        ) : null}

        {!hideTitle ? (
          <p
            className={cn(
              'font-medium text-text-main-900',
              isChartDashboardTile
                ? 'shrink-0 px-5 pt-5 pr-36 text-[16px] leading-6 tracking-[-0.011em]'
                : 'pr-[120px] text-[12px] leading-4',
            )}
          >
            {displayTitle}
          </p>
        ) : null}

        {supportedList.length > 0 && !hideVizPicker ? (
          <div
            data-devx-dashboard-no-drag
            className='flex flex-wrap gap-1.5'
            role='tablist'
            aria-label='Visualization type'
          >
            {supportedList.map((vizId) => {
              const Icon = vizIcon(vizId);
              const selected = activeViz === vizId;
              return (
                <button
                  key={vizId}
                  type='button'
                  role='tab'
                  aria-selected={selected}
                  onClick={() => handleVizSelect(vizId)}
                  className={cn(
                    'flex min-w-0 items-center gap-1 rounded-lg border px-2 py-1.5 text-left transition',
                    'border-stroke-soft-200 bg-bg-white-0 shadow-[0_1px_2px_0_rgba(228,229,231,0.24)]',
                    selected ? 'ring-1 ring-inset ring-purple-300' : 'hover:bg-bg-weak-50',
                  )}
                >
                  <span className='flex size-5 shrink-0 items-center justify-center rounded-md border border-stroke-soft-200 shadow-regular-xs'>
                    <Icon className='size-3.5 text-text-sub-600' aria-hidden />
                  </span>
                  <span className='paragraph-small truncate text-text-sub-500'>
                    {vizLabel(vizId)}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div
          className={cn(
            'flex min-h-0 flex-col',
            dashboardFill && 'min-h-0 flex-1',
            isChartDashboardTile && (hideTitle ? 'px-0 pb-0 pt-0' : 'px-0 pb-0 pt-0'),
          )}
        >
          <div
            ref={dashboardFill ? fillMeasureRef : null}
            className={cn(
              'relative flex min-h-0 flex-col',
              dashboardFill && 'min-h-0 flex-1 overflow-hidden',
              isChartDashboardTile && (hideTitle ? 'px-5 pt-5' : 'px-5 pt-3'),
            )}
          >
            {/* Axis query loading overlay — shown while re-fetching on mount */}
            {showLoadingOverlay ? (
              <div className='absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-bg-white-0/75'>
                <AxisLoadingSpinner size='sm' label='Loading chart…' />
              </div>
            ) : null}

            {/* Access-revoked state — user's role no longer grants read on this doctype */}
            {accessRevoked && !showLoadingOverlay ? (
              <div className='flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-lg border border-stroke-soft-200 bg-bg-weak-50 px-4 py-6 text-center'>
                <RiLockLine className='size-6 shrink-0 text-text-disabled-300' aria-hidden />
                <p className='text-[12px] font-medium text-text-sub-600'>Access Revoked</p>
                <p className='text-[11px] text-text-disabled-300'>
                  You no longer have permission to view this chart&apos;s data.
                </p>
              </div>
            ) : null}

            {showFilterEmptyState ? (
              <DashboardChartFilterEmptyState className={cn(dashboardFill && 'min-h-0 flex-1')} />
            ) : null}

            {!showFilterEmptyState && legendFilteredEmpty ? (
              <div className='flex min-h-[100px] flex-col items-center justify-center gap-1 rounded-lg border border-stroke-soft-200 bg-bg-weak-50 px-4 py-6 text-center'>
                <p className='paragraph-small text-text-sub-600'>All legend items are hidden.</p>
                <p className='text-[11px] text-text-disabled-300'>
                  Use the legend panel to show items again.
                </p>
              </div>
            ) : null}

            {!showFilterEmptyState &&
            !legendFilteredEmpty &&
            activeViz === 'data_table' &&
            hasTable ? (
              <div
                className={cn(
                  'overflow-auto rounded-lg border border-stroke-soft-200',
                  dashboardFill ? 'min-h-0 flex-1 max-h-none' : 'max-h-[240px]',
                )}
              >
                <ChartRawDataTable rawRows={tableRows} chatbotConfig={chatbotConfig} />
              </div>
            ) : null}

            {!showFilterEmptyState &&
            !legendFilteredEmpty &&
            activeViz === 'bar_chart' &&
            chartLabels.length > 0 ? (
              <div
                className={cn(
                  chartTransitionClass,
                  dashboardFill && 'min-h-0 flex-1 overflow-hidden',
                )}
              >
                {chartGroupedBar ? (
                  <StackedVerticalBarChartBlock
                    labels={chartGroupedBar.labels}
                    groups={chartGroupedBar.groups}
                    totals={chartGroupedBar.totals}
                    maxVal={maxVal}
                    tickValues={tickValues}
                    barAreaHeightPx={barH}
                    onCategoryClick={drillDownEnabled ? handleCategoryClick : undefined}
                    activeFilter={activeDrillDownFilter}
                    showDataLabels={showDataLabels}
                    variant={dashboardMode ? 'dashboard' : 'default'}
                    hasLegendBelow={hasChartLegend}
                  />
                ) : (
                  <VerticalBarChartBlock
                    labels={chartLabels}
                    series={chartSeries}
                    maxVal={maxVal}
                    tickValues={tickValues}
                    barAreaHeightPx={barH}
                    barColors={chartSegmentColors}
                    variant={dashboardMode ? 'dashboard' : 'default'}
                    showDataLabels={showDataLabels}
                    showAverage={showAverage}
                    onCategoryClick={drillDownEnabled ? handleCategoryClick : undefined}
                    activeFilter={activeDrillDownFilter}
                    hasLegendBelow={hasChartLegend}
                  />
                )}
              </div>
            ) : null}

            {!showFilterEmptyState &&
            !legendFilteredEmpty &&
            activeViz === 'horizontal_bar_chart' &&
            chartLabels.length > 0 ? (
              <div className={cn(chartTransitionClass, dashboardFill && 'min-h-0 flex-1')}>
                <HorizontalBarChartBlock
                  labels={chartLabels}
                  series={chartSeries}
                  maxVal={maxVal}
                  tickValues={tickValues}
                  barColors={chartSegmentColors}
                  showDataLabels={showDataLabels || dashboardMode}
                  showAverage={showAverage}
                  onCategoryClick={drillDownEnabled ? handleCategoryClick : undefined}
                  activeFilter={activeDrillDownFilter}
                />
              </div>
            ) : null}

            {!showFilterEmptyState &&
            !legendFilteredEmpty &&
            activeViz === 'line_chart' &&
            chartLabels.length > 0 ? (
              <div className={cn(chartTransitionClass, dashboardFill && 'min-h-0 flex-1')}>
                <LineChartBlock
                  labels={chartLabels}
                  series={chartSeries}
                  maxVal={maxVal}
                  tickValues={tickValues}
                  groups={chartGroupedBar?.groups ?? null}
                  displayAsStackedArea={displayAsStackedArea}
                  lineColors={CHART_GROUP_COLORS}
                  hideInlineLegend={showLegend && (chartGroupedBar?.groups?.length ?? 0) > 0}
                  {...(dashboardFill ? { plotHeightPx: lineH } : {})}
                />
              </div>
            ) : null}

            {!showFilterEmptyState &&
            !legendFilteredEmpty &&
            isRadialViz &&
            chartLabels.length > 0 ? (
              <div
                className={cn(
                  chartTransitionClass,
                  'flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2 py-1',
                )}
              >
                <RadialCategoryChartBlock
                  labels={chartLabels}
                  series={chartSeries}
                  segmentColors={chartSegmentColors}
                  donut={activeViz === 'donut_chart'}
                  size={radialSize}
                  onCategoryClick={drillDownEnabled ? handleCategoryClick : undefined}
                  activeFilter={activeDrillDownFilter}
                  hideBuiltInLegend={dashboardMode ? true : !showLegend}
                  showCenterTotal={Boolean(
                    activeViz === 'donut_chart' && (dashboardMode || showLegend),
                  )}
                  showSegmentLabels={Boolean(showDataLabels || dashboardMode)}
                  animateSegments={legendFilterAnimating}
                />
              </div>
            ) : null}

            {!showFilterEmptyState && activeViz === 'heatmap' && hasTable ? (
              <div className={cn(dashboardFill && 'min-h-0 flex-1 overflow-auto')}>
                <HeatmapBlock rawRows={rawRows} />
              </div>
            ) : null}

            {!showFilterEmptyState && activeViz === 'battery_chart' && chartLabels.length > 0 ? (
              <div
                className={cn(
                  chartTransitionClass,
                  'flex min-h-0 flex-1 flex-col items-center justify-center',
                  dashboardFill && 'min-h-0 flex-1',
                )}
              >
                <BatteryChartBlock
                  labels={chartLabels}
                  series={chartSeries}
                  segmentColors={chartSegmentColors}
                  displayAs100Stacked={displayAs100Stacked}
                  hideLegend={!showLegend}
                />
              </div>
            ) : null}

            {!showFilterEmptyState && activeViz === 'compare_tile' && hasTable ? (
              <div className={cn(dashboardFill && 'min-h-0 flex-1 overflow-auto')}>
                <CompareTileBlock rawRows={rawRows} />
              </div>
            ) : null}

            {!showFilterEmptyState && activeViz === 'kpi_tile' ? (
              <div className={cn(dashboardFill && 'min-h-0 flex-1 overflow-auto')}>
                <KpiTileBlock
                  rawRows={rawRows}
                  series={series}
                  kpi={kpi}
                  title={displayTitle}
                  variant={dashboardMode ? 'dashboard' : 'default'}
                />
              </div>
            ) : null}
          </div>

          {showLegend && legendItems.length > 0 && activeViz !== 'battery_chart' ? (
            <ChartLegendPanel
              items={legendItems}
              hiddenItems={hiddenLegendSet}
              onToggle={onLegendItemToggle}
            />
          ) : null}
        </div>

        {expandModal}

        {isDashboardWidget ? (
          <>
            {settingsOpen ? (
              <ChatbotChartBuilderModal
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                mode='edit'
                editChartId={settingsSeed?.chartId ?? null}
                initialConfig={settingsSeed?.config ?? null}
                initialTitle={settingsSeed?.title ?? ''}
                onSaved={handleChatbotSettingsSaved}
              />
            ) : null}
            <DeleteConfirmModal
              isOpen={deleteOpen}
              onOpenChange={setDeleteOpen}
              title={`Remove “${displayTitle}”?`}
              description='This chart will be removed from this dashboard tab. You can add it again from DevX AI later.'
              onConfirm={handleConfirmDelete}
              confirmLabel='Remove'
            />
          </>
        ) : null}
      </div>
    );
  },
);

DevxAiChartCard.displayName = 'DevxAiChartCard';

export default DevxAiChartCard;
