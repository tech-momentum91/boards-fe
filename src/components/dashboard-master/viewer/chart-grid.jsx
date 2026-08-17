import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  RiDeleteBin6Line,
  RiDraggable,
  RiExpandDiagonalLine,
  RiMore2Fill,
  RiPencilLine,
  RiSettings3Line,
} from 'react-icons/ri';

import EmptyIllustration from '@/components/ui/empty-illustration';
import DevxAiChartCard from '@/components/devx-ai-chart-card';
import {
  chartMasterTypeToVizId,
  parseJsonObject,
  supportedComponentsForChartType,
} from '@/utils/chart-type-utils';
import {
  GRID_COLUMNS,
  GRID_ROW_HEIGHT,
  applyGridPositionUpdates,
  chartShowLegends,
  getChartGridDimensions,
  getDragOverlayStyle,
  getGridTileStyle,
  isKpiChartType,
  normalizeChartsGridLayout,
  resolveResizedLayout,
  resolveDraggedChartPositions,
  sortChartsByGrid,
} from '@/components/dashboard-master/viewer/dashboard-grid-utils';
import { updateChartLegendFilters } from '@/services/dashboard-master-service';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import * as CompactButton from '@/components/ui/compact-button';
import * as Dropdown from '@/components/ui/dropdown';
import { cn } from '@/utils/cn';

import '@/styles/dashboard-grid.css';

const GRID_GAP = 12; // matches gap: 0.75rem in CSS

function isKpiChart(chart) {
  return isKpiChartType(chart?.chart_type);
}

function parseHiddenLegendItems(raw) {
  if (!raw) return [];
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  const hidden = parsed?.hidden;
  return Array.isArray(hidden) ? hidden.map(String) : [];
}

function hiddenLegendItemsFromChart(chart) {
  return new Set(parseHiddenLegendItems(chart?.legend_filters_json));
}

/** Adapt Chart Master row → DevxAiChartCard-friendly chartData shape. */
function normalizeChartData(chart) {
  const raw = parseJsonObject(chart.chart_data) ?? {};
  const chartType = chart.chart_type || raw.chart_type || 'vertical_bar';
  const defaultViz = chartMasterTypeToVizId(chartType);
  const supported = raw.supported_components?.length
    ? raw.supported_components
    : supportedComponentsForChartType(chartType);

  let kpiData = raw.kpi;
  if (raw.kpi && typeof raw.kpi === 'object') {
    kpiData = {
      ...raw.kpi,
      subtitle: raw.kpi.subtitle || chart.summary || undefined,
    };
  } else if (chartType === 'kpi' && chart.summary) {
    kpiData = { subtitle: chart.summary };
  }

  if (
    chartType === 'kpi' &&
    (!kpiData ||
      (kpiData.value == null &&
        (kpiData.formatted_value == null || kpiData.formatted_value === '')))
  ) {
    const seriesValue = raw.datasets?.[0]?.data?.[0];
    if (seriesValue != null && seriesValue !== '') {
      kpiData = {
        ...kpiData,
        value: Number(seriesValue),
        label: kpiData?.label || raw.title || chart.title || 'Value',
        subtitle: kpiData?.subtitle || chart.summary || undefined,
      };
    }
  }

  const parsedAxisConfig = parseJsonObject(chart.axis_config);
  const parsedDataConfig = parseJsonObject(raw.chatbotConfig) ?? raw.chatbotConfig ?? null;
  const axisConfig =
    parsedAxisConfig && Object.keys(parsedAxisConfig).length > 0
      ? {
          ...(parsedDataConfig && typeof parsedDataConfig === 'object' ? parsedDataConfig : {}),
          ...parsedAxisConfig,
          chart_type: parsedAxisConfig.chart_type || chartType,
        }
      : parsedDataConfig;

  return {
    ...raw,
    title: raw.title || chart.title,
    chart_type: chartType,
    default_component: defaultViz,
    supported_components: supported,
    kpi: kpiData,
    show_legends: chartShowLegends(chart),
    legend_filters_json: chart.legend_filters_json ?? null,
    chatbotConfig: axisConfig,
    chatbotChartId: raw.chatbotChartId || chart.chart_id,
  };
}

function chartDisplaySettings(chart) {
  return {
    showAverage: Boolean(chart?.show_average),
    showDataLabels: Boolean(chart?.show_data_labels),
    displayAsStackedArea: Boolean(chart?.display_as_stacked_area),
    displayAs100Stacked: Boolean(chart?.display_as_100_stacked),
  };
}

function stopDragPointer(event) {
  event.stopPropagation();
}

function TileToolbar({
  chartRef,
  onEdit,
  onDelete,
  chart,
  canReorder,
  dragListeners = {},
  compact = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const canEdit = Boolean(onEdit);
  const canDelete = Boolean(onDelete);
  const showManageActions = canEdit || canDelete || canReorder;

  const toolbarClass = cn(
    'absolute right-3 top-3 z-20 flex items-center gap-1',
    'opacity-0 transition-opacity duration-200',
    'group-hover/tile:opacity-100',
    menuOpen && 'opacity-100',
  );

  if (compact) {
    if (!showManageActions) {
      return (
        <div data-devx-dashboard-no-drag className={toolbarClass} onPointerDown={stopDragPointer}>
          {canReorder ? (
            <CompactButton.Root
              variant='stroke'
              size='large'
              className='cursor-grab active:cursor-grabbing'
              aria-label='Drag to reorder'
              tabIndex={-1}
              {...dragListeners}
            >
              <CompactButton.Icon as={RiDraggable} />
            </CompactButton.Root>
          ) : null}
          <CompactButton.Root
            variant='stroke'
            size='large'
            aria-label='Expand chart'
            onClick={() => chartRef.current?.expand?.()}
          >
            <CompactButton.Icon as={RiExpandDiagonalLine} />
          </CompactButton.Root>
        </div>
      );
    }

    return (
      <div data-devx-dashboard-no-drag className={toolbarClass} onPointerDown={stopDragPointer}>
        {canReorder ? (
          <CompactButton.Root
            variant='stroke'
            size='large'
            className='cursor-grab active:cursor-grabbing'
            aria-label='Drag to reorder'
            tabIndex={-1}
            {...dragListeners}
          >
            <CompactButton.Icon as={RiDraggable} />
          </CompactButton.Root>
        ) : null}
        <Dropdown.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <Dropdown.Trigger asChild>
            <CompactButton.Root variant='stroke' size='large' aria-label='More options'>
              <CompactButton.Icon as={RiMore2Fill} />
            </CompactButton.Root>
          </Dropdown.Trigger>
          <Dropdown.Content align='end' className='min-w-[180px]'>
            <Dropdown.Item onClick={() => chartRef.current?.expand?.()}>
              <Dropdown.ItemIcon as={RiExpandDiagonalLine} />
              Expand
            </Dropdown.Item>
            {canEdit ? (
              <Dropdown.Item onClick={() => onEdit?.(chart)}>
                <Dropdown.ItemIcon as={RiSettings3Line} />
                Edit widget
              </Dropdown.Item>
            ) : null}
            {canDelete ? (
              <>
                {canEdit ? <Dropdown.Separator /> : null}
                <Dropdown.Item
                  className='text-error-base focus:text-error-base'
                  onClick={() => onDelete?.(chart)}
                >
                  <Dropdown.ItemIcon as={RiDeleteBin6Line} className='text-error-base' />
                  Delete
                </Dropdown.Item>
              </>
            ) : null}
          </Dropdown.Content>
        </Dropdown.Root>
      </div>
    );
  }

  return (
    <div data-devx-dashboard-no-drag className={toolbarClass} onPointerDown={stopDragPointer}>
      {canReorder ? (
        <CompactButton.Root
          variant='stroke'
          size='large'
          className='cursor-grab active:cursor-grabbing'
          aria-label='Drag to reorder'
          tabIndex={-1}
          {...dragListeners}
        >
          <CompactButton.Icon as={RiDraggable} />
        </CompactButton.Root>
      ) : null}

      <CompactButton.Root
        variant='stroke'
        size='large'
        aria-label='Expand chart'
        onClick={() => chartRef.current?.expand?.()}
      >
        <CompactButton.Icon as={RiExpandDiagonalLine} />
      </CompactButton.Root>

      {canEdit ? (
        <CompactButton.Root
          variant='stroke'
          size='large'
          aria-label='Edit chart settings'
          onClick={() => onEdit?.(chart)}
        >
          <CompactButton.Icon as={RiSettings3Line} />
        </CompactButton.Root>
      ) : null}

      {showManageActions ? (
        <Dropdown.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <Dropdown.Trigger asChild>
            <CompactButton.Root variant='stroke' size='large' aria-label='More options'>
              <CompactButton.Icon as={RiMore2Fill} />
            </CompactButton.Root>
          </Dropdown.Trigger>
          <Dropdown.Content align='end' className='min-w-[180px]'>
            {canEdit ? (
              <Dropdown.Item onClick={() => onEdit?.(chart)}>
                <Dropdown.ItemIcon as={RiPencilLine} />
                Edit widget
              </Dropdown.Item>
            ) : null}
            <Dropdown.Item onClick={() => chartRef.current?.expand?.()}>
              <Dropdown.ItemIcon as={RiExpandDiagonalLine} />
              Expand
            </Dropdown.Item>
            {canDelete ? (
              <>
                <Dropdown.Separator />
                <Dropdown.Item
                  className='text-error-base focus:text-error-base'
                  onClick={() => onDelete?.(chart)}
                >
                  <Dropdown.ItemIcon as={RiDeleteBin6Line} className='text-error-base' />
                  Delete
                </Dropdown.Item>
              </>
            ) : null}
          </Dropdown.Content>
        </Dropdown.Root>
      ) : null}
    </div>
  );
}

/** SE-corner resize grip. Uses pointer capture so the drag stays smooth even
 *  if the cursor leaves the handle element during fast movement. */
function ResizeHandle({ chart, gridRef, onResizeMove, onResizeEnd, disabled }) {
  const activeRef = useRef(false);

  const handlePointerDown = useCallback(
    (e) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      activeRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [disabled],
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!activeRef.current) return;
      e.preventDefault();
      onResizeMove(chart.chart_id, e.clientX, e.clientY);
    },
    [chart.chart_id, onResizeMove],
  );

  const handlePointerUp = useCallback(
    (e) => {
      if (!activeRef.current) return;
      activeRef.current = false;
      e.currentTarget.releasePointerCapture(e.pointerId);
      onResizeEnd(chart.chart_id);
    },
    [chart.chart_id, onResizeEnd],
  );

  if (disabled) return null;

  return (
    <div
      className='dashboard-grid-tile-resize-handle'
      data-devx-dashboard-no-drag
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      aria-label='Resize widget'
    />
  );
}

const ChartTileContent = React.memo(
  ({
    chart,
    chartRef,
    onEdit,
    onDelete,
    onDrillDown,
    activeDrillDownChartId = null,
    drillDownFilter = null,
    tabFilters = null,
    fetchDelayMs = 0,
    canReorder,
    dragListeners = {},
    isOverlay = false,
    gridRef,
    onResizeMove,
    onResizeEnd,
  }) => {
    const kpi = isKpiChart(chart);
    const showLegend = !kpi && chartShowLegends(chart);
    const chartData = useMemo(() => normalizeChartData(chart), [chart]);
    const displaySettings = useMemo(() => chartDisplaySettings(chart), [chart]);
    const [hiddenLegendItems, setHiddenLegendItems] = useState(() =>
      hiddenLegendItemsFromChart(chart),
    );

    useEffect(() => {
      setHiddenLegendItems(hiddenLegendItemsFromChart(chart));
    }, [chart.chart_id, chart.legend_filters_json]);

    const debouncedSaveLegendFilters = useDebouncedCallback((chartId, hidden) => {
      updateChartLegendFilters(chartId, { hidden: [...hidden] }).catch(() => {});
    }, 600);

    const handleLegendItemToggle = useCallback(
      (label) => {
        setHiddenLegendItems((prev) => {
          const next = new Set(prev);
          if (next.has(label)) {
            next.delete(label);
          } else {
            next.add(label);
          }
          debouncedSaveLegendFilters(chart.chart_id, next);
          return next;
        });
      },
      [chart.chart_id, debouncedSaveLegendFilters],
    );

    const isActiveDrillDown =
      activeDrillDownChartId && chart.chart_id === activeDrillDownChartId ? drillDownFilter : null;

    const handleDrillDown = useCallback(
      (filter) => {
        onDrillDown?.(chart, filter);
      },
      [chart, onDrillDown],
    );

    return (
      <div
        className={cn(
          'group/tile relative h-full w-full overflow-hidden rounded-xl',
          isOverlay && 'shadow-regular-md ring-2 ring-primary-base/30',
        )}
      >
        <TileToolbar
          chartRef={chartRef}
          onEdit={onEdit}
          onDelete={onDelete}
          chart={chart}
          canReorder={canReorder}
          dragListeners={dragListeners}
          compact={kpi}
        />
        <DevxAiChartCard
          ref={chartRef}
          chartData={chartData}
          tabFilters={tabFilters}
          showAddToDashboard={false}
          readOnly
          hideVizPicker
          dashboardMode
          dashboardTileType={kpi ? 'kpi' : 'chart'}
          dashboardFill={!kpi}
          enableDrillDown={!kpi && Boolean(chartData?.chatbotConfig?.x_axis?.fieldname)}
          drillDownFilter={isActiveDrillDown}
          onDrillDown={handleDrillDown}
          showLegend={showLegend}
          hiddenLegendItems={hiddenLegendItems}
          onLegendItemToggle={handleLegendItemToggle}
          showAverage={displaySettings.showAverage}
          showDataLabels={displaySettings.showDataLabels}
          displayAsStackedArea={displaySettings.displayAsStackedArea}
          displayAs100Stacked={displaySettings.displayAs100Stacked}
          fetchDelayMs={fetchDelayMs}
          className='relative z-0 h-full w-full max-w-none'
        />
        {!isOverlay && canReorder ? (
          <ResizeHandle
            chart={chart}
            gridRef={gridRef}
            onResizeMove={onResizeMove}
            onResizeEnd={onResizeEnd}
            disabled={!canReorder}
          />
        ) : null}
      </div>
    );
  },
);
ChartTileContent.displayName = 'ChartTileContent';

function GridChartTile({
  chart,
  onEdit,
  onDelete,
  onDrillDown,
  activeDrillDownChartId,
  drillDownFilter,
  tabFilters,
  fetchDelayMs = 0,
  canReorder,
  gridRef,
  onResizeMove,
  onResizeEnd,
}) {
  const chartRef = useRef(null);
  const kpi = isKpiChart(chart);

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: chart.chart_id,
    disabled: !canReorder,
    data: {
      type: 'chart-tile',
      chartId: chart.chart_id,
    },
  });

  const { setNodeRef: setDropRef } = useDroppable({
    id: chart.chart_id,
    disabled: !canReorder,
    data: {
      type: 'chart-tile',
      chartId: chart.chart_id,
    },
  });

  const setNodeRef = useCallback(
    (node) => {
      setDragRef(node);
      setDropRef(node);
    },
    [setDragRef, setDropRef],
  );

  const style = {
    ...getGridTileStyle(chart),
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'dashboard-grid-tile relative',
        kpi ? 'dashboard-grid-tile--kpi' : 'dashboard-grid-tile--chart',
        isDragging && 'z-50',
      )}
      {...attributes}
    >
      <ChartTileContent
        chart={chart}
        chartRef={chartRef}
        onEdit={onEdit}
        onDelete={onDelete}
        onDrillDown={onDrillDown}
        activeDrillDownChartId={activeDrillDownChartId}
        drillDownFilter={drillDownFilter}
        tabFilters={tabFilters}
        fetchDelayMs={fetchDelayMs}
        canReorder={canReorder}
        dragListeners={canReorder ? listeners : {}}
        gridRef={gridRef}
        onResizeMove={onResizeMove}
        onResizeEnd={onResizeEnd}
      />
    </div>
  );
}

export default function ChartGrid({
  charts,
  loading,
  tabFilters = null,
  onEdit,
  onDelete,
  onDrillDown,
  activeDrillDownChartId = null,
  drillDownFilter = null,
  isSetupMode = false,
  canManage = true,
  onPositionChange,
}) {
  const [items, setItems] = useState([]);
  const [isResizing, setIsResizing] = useState(false);

  // Snapshot of items at the moment a resize starts — used as the base for
  // live overlap resolution so cumulative drift doesn't compound.
  const resizeOriginRef = useRef(null);
  // Tracks {chartId, origW, origH, gridX, startX, startY} for the active resize.
  const resizeStateRef = useRef(null);
  // Last snapped dimensions to skip redundant layout recalculations.
  const lastSnapRef = useRef({ w: 0, h: 0 });
  // Ref to the CSS grid element so we can read its pixel width.
  const gridRef = useRef(null);
  // Snapshot of items at drag start — used to compute persistence and cancel restore.
  const dragOriginRef = useRef(null);
  // Last hovered tile id during drag — avoids redundant layout recalculations.
  const lastOverIdRef = useRef(null);
  // Actual grid pixel width captured at drag start for overlay sizing.
  const overlayWidthRef = useRef(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    const normalized = sortChartsByGrid(normalizeChartsGridLayout(charts ?? []));
    setItems(normalized);

    if (!onPositionChange || !charts?.length) return;

    const wasLegacyVerticalStack =
      charts.length > 1 &&
      charts.every((chart) => (Number(chart?.grid_x) || 0) === 0) &&
      charts.some((chart) => (Number(chart?.grid_y) || 0) > 0);

    if (!wasLegacyVerticalStack) return;

    const updates = normalized
      .filter((item) => {
        const orig = charts.find((c) => c.chart_id === item.chart_id);
        if (!orig) return false;
        return (
          item.grid_x !== orig.grid_x ||
          item.grid_y !== orig.grid_y ||
          item.grid_width !== orig.grid_width ||
          item.grid_height !== orig.grid_height
        );
      })
      .map((item) => ({
        chartId: item.chart_id,
        gridX: item.grid_x,
        gridY: item.grid_y,
        gridWidth: item.grid_width,
        gridHeight: item.grid_height,
      }));

    if (updates.length > 0) {
      onPositionChange(updates);
    }
  }, [charts, onPositionChange]);

  const canReorder = Boolean(onPositionChange);

  // ── Drag-and-drop ────────────────────────────────────────────────────────

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const [activeId, setActiveId] = useState(null);
  const activeChart = useMemo(
    () => items.find((chart) => chart.chart_id === activeId) ?? null,
    [activeId, items],
  );

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
    dragOriginRef.current = itemsRef.current;
    lastOverIdRef.current = null;
    overlayWidthRef.current = gridRef.current?.offsetWidth ?? null;
  }, []);

  const handleDragOver = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id || over.id === lastOverIdRef.current) return;

    lastOverIdRef.current = over.id;
    const updates = resolveDraggedChartPositions(itemsRef.current, active.id, over.id);
    if (!updates?.length) return;

    const nextItems = applyGridPositionUpdates(itemsRef.current, updates);
    itemsRef.current = nextItems;
    setItems(nextItems);
  }, []);

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      const origin = dragOriginRef.current ?? [];
      setActiveId(null);
      lastOverIdRef.current = null;
      dragOriginRef.current = null;

      if (!over) {
        if (origin.length > 0) {
          setItems(origin);
        }
        return;
      }

      const currentItems = itemsRef.current;
      const updates = currentItems
        .filter((item) => {
          const orig = origin.find((o) => o.chart_id === item.chart_id);
          if (!orig) return false;
          return item.grid_x !== orig.grid_x || item.grid_y !== orig.grid_y;
        })
        .map((item) => ({
          chartId: item.chart_id,
          gridX: item.grid_x,
          gridY: item.grid_y,
        }));

      if (updates.length > 0) {
        onPositionChange?.(updates);
      }
    },
    [onPositionChange],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    lastOverIdRef.current = null;
    if (dragOriginRef.current) {
      setItems(dragOriginRef.current);
      dragOriginRef.current = null;
    }
  }, []);

  // ── Resize ───────────────────────────────────────────────────────────────

  // Called from ResizeHandle onPointerDown via the first pointer event.
  // We store the initial state here because ResizeHandle's onPointerDown fires
  // before the first onPointerMove, giving us a clean capture window.
  const handleResizeMove = useCallback(
    (chartId, clientX, clientY) => {
      // Lazily initialise resizeState on the first move after a pointer-down.
      if (!resizeStateRef.current || resizeStateRef.current.chartId !== chartId) {
        const chart = items.find((c) => c.chart_id === chartId);
        if (!chart) return;
        const { gridWidth, gridHeight, gridX } = getChartGridDimensions(chart);
        resizeStateRef.current = {
          chartId,
          startX: clientX,
          startY: clientY,
          origW: gridWidth,
          origH: gridHeight,
          gridX,
        };
        resizeOriginRef.current = items;
        lastSnapRef.current = { w: gridWidth, h: gridHeight };
        setIsResizing(true);
        return;
      }

      const { startX, startY, origW, origH, gridX } = resizeStateRef.current;
      const gridEl = gridRef.current;
      if (!gridEl) return;

      // Column pixel width: grid total width minus (GRID_COLUMNS-1) gaps, divided by columns
      const colPx = (gridEl.offsetWidth - (GRID_COLUMNS - 1) * GRID_GAP) / GRID_COLUMNS;
      const rowPx = GRID_ROW_HEIGHT + GRID_GAP;

      const dX = clientX - startX;
      const dY = clientY - startY;

      const newW = Math.max(1, Math.min(GRID_COLUMNS - gridX, origW + Math.round(dX / colPx)));
      const newH = Math.max(1, origH + Math.round(dY / rowPx));

      if (newW === lastSnapRef.current.w && newH === lastSnapRef.current.h) return;
      lastSnapRef.current = { w: newW, h: newH };

      const resolved = resolveResizedLayout(resizeOriginRef.current, chartId, newW, newH);
      const nextItems = sortChartsByGrid(resolved);
      itemsRef.current = nextItems;
      setItems(nextItems);
    },
    [items],
  );

  const handleResizeEnd = useCallback(
    (chartId) => {
      if (!resizeStateRef.current) return;

      const origin = resizeOriginRef.current ?? [];

      // Collect every chart whose position or dimensions changed during this resize.
      const updates = items
        .filter((item) => {
          const orig = origin.find((o) => o.chart_id === item.chart_id);
          if (!orig) return false;
          return (
            item.grid_x !== orig.grid_x ||
            item.grid_y !== orig.grid_y ||
            item.grid_width !== orig.grid_width ||
            item.grid_height !== orig.grid_height
          );
        })
        .map((item) => ({
          chartId: item.chart_id,
          gridX: item.grid_x,
          gridY: item.grid_y,
          gridWidth: item.grid_width,
          gridHeight: item.grid_height,
        }));

      resizeStateRef.current = null;
      resizeOriginRef.current = null;
      lastSnapRef.current = { w: 0, h: 0 };
      setIsResizing(false);

      if (updates.length > 0) {
        onPositionChange?.(updates);
      }
    },
    [items, onPositionChange],
  );

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className='flex flex-1 items-center justify-center py-24 text-text-sub-500'>
        Loading charts…
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-5 py-24'>
        <EmptyIllustration className='size-[108px]' />
        <p className='paragraph-small text-center text-text-soft-400'>
          {canManage
            ? 'There are no widgets here yet. Use Add above to create one.'
            : 'No widgets configured for this tab.'}
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className='dashboard-grid-container px-6 pb-6'>
        <div
          ref={gridRef}
          className={cn(
            'dashboard-grid',
            isResizing && 'dashboard-grid--resizing',
            activeId && 'dashboard-grid--dragging',
          )}
        >
          {items.map((chart, index) => (
            <GridChartTile
              key={chart.chart_id}
              chart={chart}
              onEdit={onEdit}
              onDelete={onDelete}
              onDrillDown={onDrillDown}
              activeDrillDownChartId={activeDrillDownChartId}
              drillDownFilter={drillDownFilter}
              tabFilters={tabFilters}
              fetchDelayMs={index * 120}
              canReorder={canReorder}
              gridRef={gridRef}
              onResizeMove={handleResizeMove}
              onResizeEnd={handleResizeEnd}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 200 }}>
        {activeChart ? (
          <div style={getDragOverlayStyle(activeChart, overlayWidthRef.current)}>
            <ChartTileContent
              chart={activeChart}
              chartRef={{ current: null }}
              onEdit={onEdit}
              onDelete={onDelete}
              onDrillDown={onDrillDown}
              activeDrillDownChartId={activeDrillDownChartId}
              drillDownFilter={drillDownFilter}
              tabFilters={tabFilters}
              canReorder={canReorder}
              isOverlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
