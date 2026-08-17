import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiCloseLine, RiLayoutGridLine, RiPencilLine, RiShareLine } from 'react-icons/ri';

import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { toast } from '@/components/ui/toast';
import { cn } from '@/utils/cn';

import { saveChart, getChart } from '@/services/dashboard-master-service';
import {
  getDefaultGridWidth,
  getDefaultGridHeight,
} from '@/components/dashboard-master/viewer/dashboard-grid-utils';
import {
  buildChatbotChartPayload,
  previewChartTableData,
  getDrillDownDetailRows,
  upsertChartFormula,
  getDefaultTimeBucket,
  isDatetimeAxisField,
} from '@/services/chatbot-chart-service';
import ChartPreview from './chart-preview';
import { chartMasterTypeToVizId, parseJsonObject } from '@/utils/chart-type-utils';
import ChartSettingSection from './sections/chart-setting-section';
import DisplaySettingSection from './sections/display-setting-section';
import AxisMappingSection from './sections/axis-mapping-section';
import DataOptionsSection from './sections/data-options-section';
import FormulaBuilderSection from './sections/formula-builder-section';
import FiltersSection from './sections/filters-section';
import ChartDataTab from './chart-data-tab';
import { emptyRootGroup, serializeFilterTree } from '@/components/dashboard-master/custom-filter';
import { useChartPreview, useChartTypes } from './chart-builder-hooks';
import {
  formulaHasCompleteTerms,
  getFormulaCompatibility,
  isFormulaSentinel,
  validateFormulaJson,
} from '@/utils/formula-builder-utils';

const MIN_PANEL_WIDTH = 400;
const MIN_PREVIEW_WIDTH = 280;
const PANEL_WIDTH_STORAGE_KEY = 'devx-chart-builder-side-panel-width';

function readStoredPanelWidth() {
  if (typeof window === 'undefined') return null;
  const stored = Number(window.localStorage.getItem(PANEL_WIDTH_STORAGE_KEY));
  return Number.isFinite(stored) && stored >= MIN_PANEL_WIDTH ? stored : null;
}

const MODAL_OVERLAY_CLASS = 'z-[200] !items-stretch !justify-end gap-0 !p-0 backdrop-blur-[2px]';

const MODAL_CONTENT_CLASS = cn(
  'flex !h-[100dvh] !max-h-[100dvh] !w-[min(1343px,calc(100vw-24px))] !max-w-none flex-col gap-0',
  'overflow-hidden !rounded-none border-0 !p-0 shadow-regular-lg ml-auto',
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full',
  'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  'duration-300',
);

const emptyForm = (initialType = 'vertical_bar') => ({
  title: '',
  summary: '',
  chartType: initialType,
  showAverage: false,
  showLegends: true,
  showDataLabels: false,
  displayAsStackedArea: false,
  displayAs100Stacked: false,
  xValue: null,
  xTimeBucket: null,
  yValue: null,
  yAggregation: 'sum',
  groupByValue: null,
  formulaJson: null,
  filters: emptyRootGroup(),
  sortBy: null,
  sortDirection: null,
  rowLimit: null,
});

/**
 * Chart Settings panel — full-height slide-over with live preview (left)
 * and Config / Data tabs (right). Matches Figma chart-builder flow.
 */
export default function ChartBuilderModal({
  open,
  onOpenChange,
  dashboardTabId,
  chartTypeSeed = null,
  editChartId = null,
  onSaved,
  initialDrillDownFilter = null,
  initialSidePanelTab = 'config',
  readOnly = false,
}) {
  const [form, setForm] = useState(() => emptyForm(chartTypeSeed || 'vertical_bar'));
  const [sidePanelTab, setSidePanelTab] = useState('config');
  const [previewData, setPreviewData] = useState(null);
  const [isGenerated, setIsGenerated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState('');
  const [drillDownFilter, setDrillDownFilter] = useState(null);
  const [panelWidth, setPanelWidth] = useState(() => readStoredPanelWidth() ?? MIN_PANEL_WIDTH);
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const [formulaDraft, setFormulaDraft] = useState({ pendingTerm: null });
  const generatedSnapshotRef = useRef(null);
  const bodyRef = useRef(null);
  const panelWidthRef = useRef(panelWidth);
  const resizeStateRef = useRef({ dragging: false, startX: 0, startWidth: 0 });

  const { types } = useChartTypes();
  const { preview, previewing, error: previewError } = useChartPreview();

  useEffect(() => {
    panelWidthRef.current = panelWidth;
  }, [panelWidth]);

  const clampPanelWidth = useCallback((nextWidth) => {
    const containerWidth = bodyRef.current?.getBoundingClientRect().width ?? 0;
    const maxWidth =
      containerWidth > 0
        ? Math.max(MIN_PANEL_WIDTH, containerWidth - MIN_PREVIEW_WIDTH)
        : MIN_PANEL_WIDTH * 2;
    return Math.min(Math.max(nextWidth, MIN_PANEL_WIDTH), maxWidth);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const stored = readStoredPanelWidth();
    if (stored != null) {
      setPanelWidth(clampPanelWidth(stored));
    } else {
      const raf = requestAnimationFrame(() => {
        const containerWidth = bodyRef.current?.getBoundingClientRect().width ?? 0;
        if (containerWidth > 0) {
          setPanelWidth(clampPanelWidth(Math.round(containerWidth * (2 / 3))));
        }
      });
      return () => cancelAnimationFrame(raf);
    }

    const handleWindowResize = () => {
      setPanelWidth((current) => clampPanelWidth(current));
    };
    handleWindowResize();
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [open, clampPanelWidth]);

  const handlePanelResizeStart = useCallback(
    (event) => {
      event.preventDefault();
      resizeStateRef.current = {
        dragging: true,
        startX: event.clientX,
        startWidth: panelWidthRef.current,
      };
      setIsResizingPanel(true);

      const handleMouseMove = (moveEvent) => {
        if (!resizeStateRef.current.dragging) return;
        const delta = resizeStateRef.current.startX - moveEvent.clientX;
        const nextWidth = clampPanelWidth(resizeStateRef.current.startWidth + delta);
        panelWidthRef.current = nextWidth;
        setPanelWidth(nextWidth);
      };

      const handleMouseUp = () => {
        resizeStateRef.current.dragging = false;
        setIsResizingPanel(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(panelWidthRef.current));
        }
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [clampPanelWidth],
  );

  const chartTypeMeta = useMemo(
    () =>
      types.find((t) => t.id === form.chartType) || {
        requires_x_axis: true,
        supports_grouping: true,
      },
    [types, form.chartType],
  );

  const formulaValidation = useMemo(
    () => validateFormulaJson(form.formulaJson, formulaDraft),
    [form.formulaJson, formulaDraft],
  );

  const handleFormulaDraftChange = useCallback((draft) => {
    setFormulaDraft((current) => {
      const nextPendingTerm = draft?.pendingTerm ?? null;
      const currentPendingTerm = current?.pendingTerm ?? null;
      if (currentPendingTerm === nextPendingTerm) return current;
      if (
        currentPendingTerm &&
        nextPendingTerm &&
        currentPendingTerm.aggregation === nextPendingTerm.aggregation &&
        currentPendingTerm.doctype === nextPendingTerm.doctype &&
        currentPendingTerm.fieldname === nextPendingTerm.fieldname &&
        currentPendingTerm.operator === nextPendingTerm.operator
      ) {
        return current;
      }
      return { pendingTerm: nextPendingTerm };
    });
  }, []);

  /**
   * Derive whether the formula builder is "active" (has at least one complete, valid term).
   * When active, the formula is used as the Y-axis for preview/SQL.
   */
  const formulaIsActive = Boolean(
    formulaHasCompleteTerms(form.formulaJson) && formulaValidation.valid,
  );

  const formulaCompatibility = useMemo(
    () => getFormulaCompatibility(form.formulaJson, form.xValue),
    [form.formulaJson, form.xValue],
  );

  const hasInvalidFormulaDraft = Boolean(
    form.formulaJson?.terms?.length > 0 && !formulaValidation.valid,
  );

  const baseDoctype = form.yValue?.doctype ?? null;

  const dataTabChatbotConfig = useMemo(
    () =>
      previewData?.chatbotConfig ??
      buildChatbotChartPayload({
        chartType: form.chartType,
        xAxisOption: form.xValue,
        xTimeBucket: form.xTimeBucket,
        yAxisOption: form.yValue,
        yAggregation: form.yAggregation,
        groupByOption: form.groupByValue,
        filters: serializeFilterTree(form.filters, form.filters?.doctype || baseDoctype),
        sortBy: form.sortBy,
        sortDirection: form.sortDirection,
        rowLimit: form.rowLimit,
      }),
    [previewData?.chatbotConfig, form, baseDoctype],
  );

  useEffect(() => {
    if (!open) {
      setFormulaDraft({ pendingTerm: null });
      return;
    }
    setFormulaDraft({ pendingTerm: null });
    if (!editChartId) {
      setDocLoading(false);
      setDocError('');
      setForm(emptyForm(chartTypeSeed || 'vertical_bar'));
      setPreviewData(null);
      setIsGenerated(false);
      generatedSnapshotRef.current = null;
      setDrillDownFilter(initialDrillDownFilter ?? null);
      setSidePanelTab(initialDrillDownFilter ? 'data' : initialSidePanelTab || 'config');
      return;
    }
    let cancelled = false;
    setDocLoading(true);
    setDocError('');
    getChart(editChartId)
      .then((doc) => {
        if (cancelled) return;
        if (!doc) {
          const message = 'Chart not found';
          setDocError(message);
          toast.error(message);
          onOpenChange(false);
          return;
        }
        const axis = parseJsonObject(doc.axis_config) ?? {};
        const savedChartData = parseJsonObject(doc.chart_data);
        const xAxisOption = axis.x_axis ? mapAxisNodeToOption(axis.x_axis) : null;
        setForm({
          title: doc.title || '',
          summary: doc.summary || '',
          chartType: doc.chart_type || 'vertical_bar',
          showAverage: Boolean(doc.show_average),
          showLegends: doc.show_legends == null ? true : Boolean(doc.show_legends),
          showDataLabels: Boolean(doc.show_data_labels),
          displayAsStackedArea: Boolean(doc.display_as_stacked_area),
          displayAs100Stacked: Boolean(doc.display_as_100_stacked),
          xValue: xAxisOption,
          xTimeBucket: axis.x_axis?.time_bucket || getDefaultTimeBucket(xAxisOption) || null,
          yValue: axis.y_axis ? mapAxisNodeToOption(axis.y_axis) : null,
          yAggregation: axis.y_axis?.aggregation || 'sum',
          groupByValue: axis.group_by?.[0] ? mapAxisNodeToOption(axis.group_by[0]) : null,
          formulaJson: (() => {
            const parsed = parseJsonObject(doc.formula_json);
            return parsed && Object.keys(parsed).length > 0 ? parsed : null;
          })(),
          filters: (() => {
            const parsed = parseJsonObject(doc.filters_json);
            return parsed && Object.keys(parsed).length > 0 ? parsed : emptyRootGroup();
          })(),
          sortBy: axis.sort_by || null,
          sortDirection: axis.sort_direction || null,
          rowLimit: axis.row_limit ?? null,
        });
        setPreviewData(savedChartData || null);
        setIsGenerated(Boolean(savedChartData));
        setDrillDownFilter(initialDrillDownFilter ?? null);
        setSidePanelTab(initialDrillDownFilter ? 'data' : initialSidePanelTab || 'config');
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error?.message || 'Failed to load chart';
        setDocError(message);
        toast.error(message);
        onOpenChange(false);
      })
      .finally(() => {
        if (!cancelled) setDocLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, editChartId, chartTypeSeed, initialDrillDownFilter, initialSidePanelTab, onOpenChange]);

  const handleDrillDownFromPreview = useCallback((filter) => {
    if (!filter) return;
    setDrillDownFilter(filter);
    setSidePanelTab('data');
  }, []);

  const handleClearDrillDown = useCallback(() => {
    setDrillDownFilter(null);
  }, []);

  const handleModalOpenChange = useCallback(
    (nextOpen) => {
      if (!nextOpen) {
        setDrillDownFilter(null);
        setSidePanelTab('config');
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  /**
   * Resolve the Y-axis option to use for preview/save.
   * If the formula builder is active, upsert the formula backend record first
   * and return a synthetic formula Y-axis option.
   */
  const resolveYAxisForQuery = useCallback(async () => {
    if (!formulaIsActive) {
      return {
        yOption: form.yValue,
        yAgg: form.yAggregation,
        updatedFormulaJson: form.formulaJson,
      };
    }

    try {
      const result = await upsertChartFormula(form.formulaJson);
      const formulaRecord = result?.formula_record;
      if (!formulaRecord) throw new Error('Formula record name missing from response');

      const updatedFormulaJson = { ...form.formulaJson, formula_record: formulaRecord };

      const yOption = {
        value: `formula::${formulaRecord}`,
        label: formulaRecord,
        fieldname: formulaRecord,
        doctype: null,
        is_formula: true,
        join_path: [],
      };

      return { yOption, yAgg: null, updatedFormulaJson };
    } catch (error) {
      throw new Error(`Formula error: ${error?.message || 'Failed to save formula'}`);
    }
  }, [form.formulaJson, form.yValue, form.yAggregation, formulaIsActive]);

  const runPreview = useCallback(async () => {
    let yOption = form.yValue;
    let yAgg = form.yAggregation;
    let resolvedFormulaJson = form.formulaJson;

    if (formulaIsActive) {
      try {
        const resolved = await resolveYAxisForQuery();
        yOption = resolved.yOption;
        yAgg = resolved.yAgg;
        resolvedFormulaJson = resolved.updatedFormulaJson ?? form.formulaJson;
        // Update formulaJson in form state with the resolved record name
        if (resolved.updatedFormulaJson) {
          setForm((prev) => ({ ...prev, formulaJson: resolved.updatedFormulaJson }));
        }
      } catch (error) {
        toast.error(error?.message || 'Formula preview failed');
        return;
      }
    }

    const result = await preview({
      chartType: form.chartType,
      xOption: form.xValue,
      xTimeBucket: form.xTimeBucket,
      yOption,
      yAgg,
      groupBy: form.groupByValue,
      filters: serializeFilterTree(form.filters, form.filters?.doctype || baseDoctype),
      title: form.title || yOption?.label || 'Chart',
      sortBy: form.sortBy,
      sortDirection: form.sortDirection,
      rowLimit: form.rowLimit,
    });
    if (result?.stale) return;
    if (result?.data) {
      const enrichedData = {
        ...result.data,
        chart_type: form.chartType,
        default_component: chartMasterTypeToVizId(form.chartType),
      };
      setPreviewData(enrichedData);
      setIsGenerated(true);
      generatedSnapshotRef.current = {
        previewData: enrichedData,
        axisPayload: result.payload,
        resolvedYOption: yOption,
        resolvedYAgg: yAgg,
        resolvedFormulaJson,
      };
    }
  }, [form, preview, baseDoctype, formulaIsActive, resolveYAxisForQuery]);

  const fetchTableData = useCallback(
    async (tableExtraFields = null, activeDrillDown = null) => {
      if (activeDrillDown) {
        const result = await getDrillDownDetailRows({
          chartId: editChartId || null,
          axisConfig: editChartId ? null : dataTabChatbotConfig,
          drillDownFilter: activeDrillDown,
          tableExtraFields,
        });
        return {
          __isDetailRows: true,
          rows: Array.isArray(result?.raw_rows) ? result.raw_rows : [],
          fields: Array.isArray(result?.fields) ? result.fields : [],
        };
      }

      let yOption = form.yValue;
      let yAgg = form.yAggregation;

      if (formulaIsActive) {
        const resolved = await resolveYAxisForQuery();
        yOption = resolved.yOption;
        yAgg = resolved.yAgg;
      }

      const baseFilters = serializeFilterTree(form.filters, form.filters?.doctype || baseDoctype);

      const payload = buildChatbotChartPayload({
        chartType: form.chartType,
        xAxisOption: form.xValue,
        xTimeBucket: form.xTimeBucket,
        yAxisOption: yOption,
        yAggregation: yAgg,
        groupByOption: form.groupByValue,
        filters: baseFilters,
        tableExtraFields,
        sortBy: form.sortBy,
        sortDirection: form.sortDirection,
        rowLimit: form.rowLimit,
      });

      const result = await previewChartTableData(payload);
      return Array.isArray(result?.raw_rows) ? result.raw_rows : [];
    },
    [form, baseDoctype, formulaIsActive, resolveYAxisForQuery, editChartId, dataTabChatbotConfig],
  );

  const handleSave = useCallback(async () => {
    if (!dashboardTabId) {
      toast.error('No active dashboard tab.');
      return;
    }
    if (!formulaIsActive && !form.yValue) {
      toast.error('Choose a Y-axis measure or build a formula first.');
      return;
    }

    const chartTitle =
      form.title.trim() ||
      form.yValue?.label ||
      generatedSnapshotRef.current?.resolvedYOption?.label ||
      'Untitled chart';

    setSaving(true);
    try {
      let resolvedYOption = form.yValue;
      let resolvedYAgg = form.yAggregation;
      let resolvedFormulaJson = form.formulaJson;
      let payloadForSave = previewData;
      let axisPayload = null;

      const snapshot = generatedSnapshotRef.current;
      const canReuseGeneratedSnapshot = !editChartId && isGenerated && snapshot?.previewData;

      if (canReuseGeneratedSnapshot) {
        payloadForSave = snapshot.previewData;
        axisPayload = snapshot.axisPayload ?? null;
        resolvedYOption = snapshot.resolvedYOption ?? form.yValue;
        resolvedYAgg = snapshot.resolvedYAgg ?? form.yAggregation;
        resolvedFormulaJson = snapshot.resolvedFormulaJson ?? form.formulaJson;
      } else {
        // Resolve Y-axis — either a regular field or a formula backend record.
        if (formulaIsActive) {
          const resolved = await resolveYAxisForQuery();
          resolvedYOption = resolved.yOption;
          resolvedYAgg = resolved.yAgg;
          resolvedFormulaJson = resolved.updatedFormulaJson ?? form.formulaJson;
        }

        const previewResult = await preview({
          chartType: form.chartType,
          xOption: form.xValue,
          xTimeBucket: form.xTimeBucket,
          yOption: resolvedYOption,
          yAgg: resolvedYAgg,
          groupBy: form.groupByValue,
          filters: serializeFilterTree(form.filters, form.filters?.doctype || baseDoctype),
          title: chartTitle,
          sortBy: form.sortBy,
          sortDirection: form.sortDirection,
          rowLimit: form.rowLimit,
        });
        if (previewResult?.stale) return;
        if (previewResult?.data) {
          payloadForSave = previewResult.data;
          axisPayload = previewResult.payload;
        }
      }

      await saveChart({
        chartId: editChartId || null,
        dashboardTab: dashboardTabId,
        title: chartTitle,
        summary: form.summary,
        chartType: form.chartType,
        gridWidth: getDefaultGridWidth(form.chartType),
        gridHeight: getDefaultGridHeight(form.chartType, form.showLegends),
        axisConfig: axisPayload ?? {
          chart_type: form.chartType,
          x_axis: form.xValue,
          y_axis: resolvedYOption ? { ...resolvedYOption, aggregation: resolvedYAgg } : null,
          group_by: form.groupByValue ? [form.groupByValue] : [],
          filters: [],
        },
        showAverage: form.showAverage,
        showLegends: form.showLegends,
        showDataLabels: form.showDataLabels,
        displayAsStackedArea: form.displayAsStackedArea,
        displayAs100Stacked: form.displayAs100Stacked,
        filtersJson: form.filters,
        finalSqlQueryJson: axisPayload ?? {},
        formula: '',
        formulaJson: resolvedFormulaJson ?? null,
        chartData: payloadForSave ?? {},
      });

      toast.success(editChartId ? 'Chart updated' : 'Chart added');
      onSaved?.();
      if (!editChartId) {
        onOpenChange(false);
      }
    } catch (error) {
      toast.error(error?.message || 'Failed to save chart');
    } finally {
      setSaving(false);
    }
  }, [
    dashboardTabId,
    form,
    previewData,
    preview,
    baseDoctype,
    editChartId,
    onSaved,
    onOpenChange,
    formulaIsActive,
    resolveYAxisForQuery,
    isGenerated,
  ]);

  const setField = (patch, { invalidateGenerated = true } = {}) => {
    setForm((prev) => ({ ...prev, ...patch }));
    if (invalidateGenerated) {
      setIsGenerated(false);
      generatedSnapshotRef.current = null;
    }
  };

  const handlePrimaryAction = useCallback(async () => {
    if (isGenerated) {
      await handleSave();
      return;
    }
    await runPreview();
  }, [isGenerated, handleSave, runPreview]);

  const primaryButtonLabel = previewing
    ? 'Generating…'
    : saving
      ? editChartId
        ? 'Saving…'
        : 'Adding…'
      : isGenerated
        ? editChartId
          ? 'Save Changes'
          : 'Add to Dashboard'
        : 'Generate Chart';

  const primaryButtonDisabled =
    saving ||
    previewing ||
    docLoading ||
    Boolean(docError) ||
    hasInvalidFormulaDraft ||
    (!form.yValue && !formulaIsActive) ||
    (isFormulaSentinel(form.yValue) && !formulaIsActive);

  const primaryButtonClassName = cn(
    'flex-1',
    !editChartId && isGenerated && 'bg-success-base text-white hover:bg-success-darker',
    editChartId && isGenerated && 'bg-success-base text-white hover:bg-success-darker',
  );

  const displayTitle = form.title || 'Untitled chart';

  return (
    <Modal.Root open={open} onOpenChange={handleModalOpenChange}>
      <Modal.Content
        className={MODAL_CONTENT_CLASS}
        overlayClassName={MODAL_OVERLAY_CLASS}
        showClose={false}
      >
        <Modal.Title className='sr-only'>Chart Settings</Modal.Title>
        <Modal.Description className='sr-only'>
          Configure chart type, axis mapping, formula, filters, and preview chart data.
        </Modal.Description>
        {/* ── Header ── */}
        <div className='relative flex h-[88px] shrink-0 items-center justify-between border-b border-stroke-soft-200 bg-bg-white-0 px-8 py-3'>
          <div className='flex min-w-0 flex-1 items-center gap-3.5'>
            <div className='flex size-12 shrink-0 items-center justify-center rounded-full bg-bg-weak-100'>
              <RiLayoutGridLine className='size-6 text-text-sub-500' />
            </div>
            <p className='label-medium text-text-strong-950'>Chart Settings</p>
          </div>
          <div className='flex shrink-0 items-center gap-2'>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='xsmall'
              className='gap-1'
              onClick={() => {}}
            >
              <Button.Icon as={RiShareLine} />
              Share
            </Button.Root>
            <CompactButton.Root
              variant='ghost'
              size='large'
              onClick={() => onOpenChange(false)}
              aria-label='Close'
            >
              <CompactButton.Icon as={RiCloseLine} />
            </CompactButton.Root>
          </div>
        </div>

        {/* ── Body: preview + config panel ── */}
        <div ref={bodyRef} className='flex min-h-0 flex-1 bg-bg-soft-200'>
          {/* Left: live preview — matches dashboard expand view */}
          <div className='flex min-h-0 min-w-0 flex-1 flex-col bg-bg-white-0'>
            <div className='flex shrink-0 items-center gap-2 border-b border-stroke-soft-200 px-6 py-5'>
              <h2 className='label-large truncate text-text-strong-950'>{displayTitle}</h2>
              <button
                type='button'
                className='flex size-7 shrink-0 items-center justify-center rounded-md text-text-sub-500 transition-colors hover:bg-bg-weak-50'
                onClick={() => setSidePanelTab('config')}
                aria-label='Edit title in settings'
              >
                <RiPencilLine className='size-4' />
              </button>
            </div>
            <ChartPreview
              title={form.title || 'Chart'}
              summary={form.summary}
              chartType={form.chartType}
              chartData={previewData}
              loading={previewing && !previewData}
              refreshing={previewing && Boolean(previewData)}
              error={previewError}
              enableDrillDown={Boolean(isGenerated && dataTabChatbotConfig?.x_axis?.fieldname)}
              drillDownFilter={drillDownFilter}
              onDrillDown={handleDrillDownFromPreview}
              chatbotConfig={dataTabChatbotConfig}
              showAverage={form.showAverage}
              showLegends={form.showLegends}
              showDataLabels={form.showDataLabels}
              displayAsStackedArea={form.displayAsStackedArea}
              displayAs100Stacked={form.displayAs100Stacked}
            />
          </div>

          <div
            role='separator'
            aria-orientation='vertical'
            aria-label='Resize chart preview and settings panels'
            aria-valuemin={MIN_PANEL_WIDTH}
            aria-valuenow={panelWidth}
            className={cn(
              'relative z-10 shrink-0 touch-none',
              'w-1 cursor-col-resize bg-stroke-soft-200 transition-colors',
              'hover:bg-stroke-sub-300',
              isResizingPanel && 'bg-stroke-sub-300',
            )}
            onMouseDown={handlePanelResizeStart}
          />

          {/* Right: config / data panel */}
          <div className='flex shrink-0 flex-col bg-bg-white-0' style={{ width: panelWidth }}>
            <TabMenuHorizontal.Root
              value={readOnly ? 'data' : sidePanelTab}
              onValueChange={readOnly ? undefined : setSidePanelTab}
              className='shrink-0'
            >
              <TabMenuHorizontal.List
                className='h-14 gap-0 border-x-0 border-t-0 px-6 [&>*]:flex-1 [&>*]:justify-center'
                wrapperClassName='w-full'
              >
                {!readOnly ? (
                  <TabMenuHorizontal.Trigger value='config'>Config</TabMenuHorizontal.Trigger>
                ) : null}
                <TabMenuHorizontal.Trigger value='data'>Data</TabMenuHorizontal.Trigger>
              </TabMenuHorizontal.List>
            </TabMenuHorizontal.Root>

            <div className='flex min-h-0 flex-1 flex-col'>
              <div className='min-h-0 flex-1 overflow-y-auto'>
                {!readOnly && sidePanelTab === 'config' ? (
                  <div className='flex flex-col pb-4'>
                    <ChartSettingSection
                      title={form.title}
                      summary={form.summary}
                      chartType={form.chartType}
                      onTitleChange={(v) => setField({ title: v }, { invalidateGenerated: false })}
                      onSummaryChange={(v) =>
                        setField({ summary: v }, { invalidateGenerated: false })
                      }
                      onChartTypeChange={(v) => setField({ chartType: v })}
                    />
                    <DisplaySettingSection
                      chartType={form.chartType}
                      showAverage={form.showAverage}
                      showLegends={form.showLegends}
                      showDataLabels={form.showDataLabels}
                      displayAsStackedArea={form.displayAsStackedArea}
                      displayAs100Stacked={form.displayAs100Stacked}
                      onChange={(patch) => setField(patch, { invalidateGenerated: false })}
                      onChartTypeChange={(v) => {
                        const currentIsPieLike =
                          form.chartType === 'pie' || form.chartType === 'donut';
                        const nextIsPieLike = v === 'pie' || v === 'donut';
                        setField(
                          { chartType: v },
                          { invalidateGenerated: !(currentIsPieLike && nextIsPieLike) },
                        );
                      }}
                    />
                    <AxisMappingSection
                      chartTypeMeta={chartTypeMeta}
                      chartType={form.chartType}
                      xValue={form.xValue}
                      xTimeBucket={form.xTimeBucket}
                      yValue={form.yValue}
                      yAggregation={form.yAggregation}
                      groupByValue={form.groupByValue}
                      formulaIsActive={formulaIsActive}
                      onXChange={(v) => {
                        setForm((prev) => {
                          const patch = {
                            xValue: v,
                            xTimeBucket: isDatetimeAxisField(v) ? getDefaultTimeBucket(v) : null,
                          };
                          const isLine = (prev.chartType || '').toLowerCase() === 'line';
                          if (
                            isLine &&
                            prev.groupByValue &&
                            (!v?.doctype || prev.groupByValue.doctype !== v.doctype)
                          ) {
                            patch.groupByValue = null;
                          }
                          return { ...prev, ...patch };
                        });
                        setIsGenerated(false);
                        generatedSnapshotRef.current = null;
                      }}
                      onXTimeBucketChange={(v) => setField({ xTimeBucket: v })}
                      onYChange={({ option, aggregation }) => {
                        setField({
                          ...(option === undefined ? {} : { yValue: option }),
                          ...(aggregation === undefined ? {} : { yAggregation: aggregation }),
                        });
                      }}
                      onGroupByChange={(v) => setField({ groupByValue: v })}
                    />
                    <DataOptionsSection
                      chartType={form.chartType}
                      chartTypeMeta={chartTypeMeta}
                      xValue={form.xValue}
                      yValue={form.yValue}
                      groupByValue={form.groupByValue}
                      sortBy={form.sortBy}
                      sortDirection={form.sortDirection}
                      rowLimit={form.rowLimit}
                      onChange={(patch) => setField(patch)}
                    />
                    <FormulaBuilderSection
                      formulaJson={form.formulaJson}
                      onChange={(v) => setField({ formulaJson: v })}
                      onDraftChange={handleFormulaDraftChange}
                    />
                    {formulaCompatibility ? (
                      <FormulaCompatibilityBanner compatibility={formulaCompatibility} />
                    ) : null}
                    <FiltersSection
                      baseDoctype={baseDoctype}
                      value={form.filters}
                      onChange={(v) => setField({ filters: v })}
                      onApply={runPreview}
                    />
                  </div>
                ) : (
                  <ChartDataTab
                    chartData={previewData}
                    chatbotConfig={dataTabChatbotConfig}
                    chartTypeMeta={chartTypeMeta}
                    onRefreshChart={runPreview}
                    onFetchTableData={fetchTableData}
                    chartPreviewing={previewing}
                    drillDownFilter={drillDownFilter}
                    onClearDrillDown={handleClearDrillDown}
                    editChartId={editChartId}
                  />
                )}
              </div>

              {/* Footer — scoped to right panel per Figma */}
              <div className='flex shrink-0 items-center gap-3 border-t border-stroke-soft-200 px-6 py-4'>
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='medium'
                  className={readOnly ? 'w-full' : 'flex-1'}
                  onClick={() => handleModalOpenChange(false)}
                  disabled={saving}
                >
                  {readOnly ? 'Close' : 'Cancel'}
                </Button.Root>
                {!readOnly ? (
                  <Button.Root
                    size='medium'
                    className={primaryButtonClassName}
                    onClick={handlePrimaryAction}
                    disabled={primaryButtonDisabled}
                  >
                    {primaryButtonLabel}
                  </Button.Root>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Modal.Content>
    </Modal.Root>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function mapAxisNodeToOption(node) {
  if (!node) return null;
  if (node.is_formula) {
    return {
      value: `formula::${node.fieldname || 'formula'}`,
      label: node.label ?? 'Formula',
      doctype: null,
      fieldname: node.fieldname ?? null,
      fieldtype: node.fieldtype,
      join_path: node.join_path ?? [],
      is_formula: true,
    };
  }
  return {
    value: `${node.doctype}::${node.fieldname}`,
    label: node.label ?? node.fieldname,
    doctype: node.doctype,
    fieldname: node.fieldname,
    fieldtype: node.fieldtype,
    abstract_data_type: node.abstract_data_type,
    is_time_series: Boolean(node.is_time_series),
    join_path: node.join_path ?? [],
    is_formula: Boolean(node.is_formula),
    valid_aggregations: node.valid_aggregations ?? undefined,
    valid_time_buckets: node.valid_time_buckets ?? undefined,
    default_time_bucket: node.default_time_bucket ?? undefined,
  };
}

function safeParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function FormulaCompatibilityBanner({ compatibility }) {
  if (!compatibility) return null;

  if (compatibility.sharesSource) {
    return (
      <div className='mx-6 mb-4 rounded-lg border border-success-base/30 bg-success-lighter px-3 py-2'>
        <p className='paragraph-xsmall text-success-base'>
          Formula and X-axis share the same source ({compatibility.xDoctype}).
        </p>
      </div>
    );
  }

  return (
    <div className='mx-6 mb-4 rounded-lg border border-warning-base/30 bg-warning-lighter px-3 py-2'>
      <p className='paragraph-xsmall text-warning-base'>
        Formula uses different doctypes ({compatibility.formulaDoctypes.join(', ')}) than the X-axis
        ({compatibility.xDoctype}) — the chart may return no data.
      </p>
    </div>
  );
}
