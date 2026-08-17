import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiBarChartBoxLine } from 'react-icons/ri';

import DevxAiChartCard from '@/components/devx-ai-chart-card';
import {
  chartMasterTypeToVizId,
  parseJsonObject,
  supportedComponentsForChartType,
} from '@/utils/chart-type-utils';
import { cn } from '@/utils/cn';

export const KPI_TILE_WIDTH = 280;
export const KPI_TILE_HEIGHT = 120;
export const KPI_EXPAND_WIDTH = 400;
export const KPI_EXPAND_HEIGHT = 160;

/** Normalize raw chart payload for dashboard-style preview rendering. */
export function buildPreviewChartData({
  chartData,
  title = '',
  summary = '',
  chartType = 'vertical_bar',
  chatbotConfig = null,
}) {
  const resolvedChartData = parseJsonObject(chartData) ?? chartData;
  if (!resolvedChartData || typeof resolvedChartData !== 'object') return null;

  const resolvedType = chartType || resolvedChartData.chart_type || 'vertical_bar';
  const isKpi = resolvedType === 'kpi';
  const defaultViz = chartMasterTypeToVizId(resolvedType);

  let kpi = resolvedChartData.kpi;
  if (resolvedChartData.kpi && typeof resolvedChartData.kpi === 'object') {
    kpi = {
      ...resolvedChartData.kpi,
      subtitle: resolvedChartData.kpi.subtitle || summary || undefined,
    };
  } else if (isKpi && summary) {
    kpi = { subtitle: summary };
  }

  const parsedChatbotConfig = parseJsonObject(chatbotConfig) ?? chatbotConfig;

  return {
    ...resolvedChartData,
    title: title || resolvedChartData.title,
    chart_type: resolvedType,
    default_component: defaultViz,
    supported_components: isKpi ? ['kpi_tile'] : supportedComponentsForChartType(resolvedType),
    kpi,
    chatbotConfig: parsedChatbotConfig || resolvedChartData.chatbotConfig || null,
  };
}

function PreviewEmptyState({ message }) {
  return (
    <div className='flex flex-col items-center justify-center gap-3 px-6 text-center text-text-soft-400'>
      <RiBarChartBoxLine className='size-10' />
      <span className='paragraph-small max-w-xs'>{message}</span>
    </div>
  );
}

function PreviewStatusOverlay({ refreshing, error }) {
  return (
    <>
      {refreshing ? (
        <div className='absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-bg-white-0/70'>
          <div className='animate-pulse paragraph-small text-text-sub-500'>Updating chart…</div>
        </div>
      ) : null}
      {error ? (
        <div className='mb-3 shrink-0 rounded-lg bg-error-lighter px-3 py-2 text-error-base paragraph-xsmall'>
          {error}
        </div>
      ) : null}
    </>
  );
}

/** KPI-only: gray canvas with a centered dashboard-faithful tile. */
function KpiCanvasPreview({ previewChartData, refreshing, isExpand }) {
  const tileWidth = isExpand ? KPI_EXPAND_WIDTH : KPI_TILE_WIDTH;
  const tileHeight = isExpand ? KPI_EXPAND_HEIGHT : KPI_TILE_HEIGHT;

  return (
    <div
      className={cn(
        'relative flex min-h-0 flex-1 items-center justify-center bg-bg-soft-200',
        isExpand
          ? 'p-8 lg:p-12'
          : 'm-6 min-h-[360px] rounded-2xl border border-stroke-soft-200 p-8',
      )}
    >
      {refreshing ? (
        <div className='absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-bg-soft-200/80'>
          <div className='animate-pulse paragraph-small text-text-sub-500'>Updating chart…</div>
        </div>
      ) : null}

      <div
        className='relative shrink-0 shadow-[0_2px_4px_0_rgba(27,28,29,0.04)]'
        style={{ width: tileWidth, height: tileHeight }}
      >
        <DevxAiChartCard
          chartData={previewChartData}
          showAddToDashboard={false}
          readOnly
          hideVizPicker
          hideTitle
          dashboardMode
          dashboardTileType='kpi'
          className='h-full w-full max-w-none'
        />
      </div>
    </div>
  );
}

/** Standard charts: full-area preview (builder + expand). */
function StandardChartPreview({
  previewChartData,
  chartType = 'vertical_bar',
  refreshing,
  error,
  isExpand,
  hideTitle = false,
  enableDrillDown = false,
  drillDownFilter = null,
  onDrillDown = null,
  showAverage = false,
  showLegends = true,
  showDataLabels = false,
  displayAsStackedArea = false,
  displayAs100Stacked = false,
}) {
  const [hiddenLegendItems, setHiddenLegendItems] = useState(() => new Set());

  useEffect(() => {
    setHiddenLegendItems(new Set());
  }, [previewChartData]);

  const handleLegendItemToggle = useCallback((label) => {
    setHiddenLegendItems((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  return (
    <div
      className={cn(
        'relative flex min-h-0 flex-1 flex-col',
        isExpand ? 'px-6 pb-8 pt-4 lg:px-10 lg:pb-10' : 'px-6 pb-6',
      )}
    >
      <PreviewStatusOverlay refreshing={refreshing} error={error} />
      <DevxAiChartCard
        chartData={previewChartData}
        showAddToDashboard={false}
        readOnly
        hideVizPicker
        hideTitle={hideTitle}
        dashboardMode
        dashboardTileType='chart'
        dashboardFill
        showLegend={showLegends}
        hiddenLegendItems={hiddenLegendItems}
        onLegendItemToggle={handleLegendItemToggle}
        showAverage={showAverage}
        showDataLabels={showDataLabels}
        displayAsStackedArea={displayAsStackedArea}
        displayAs100Stacked={displayAs100Stacked}
        enableDrillDown={enableDrillDown}
        drillDownFilter={drillDownFilter}
        onDrillDown={onDrillDown}
        className='min-h-0 flex-1 max-w-none border-0 shadow-none'
      />
    </div>
  );
}

/**
 * Widget preview for Chart Settings and expand.
 * KPI uses the centered canvas tile; all other chart types fill the preview area.
 */
export default function DashboardWidgetPreview({
  title,
  summary = '',
  chartType = 'vertical_bar',
  chartData,
  loading = false,
  refreshing = false,
  error = null,
  variant = 'builder',
  emptyMessage = 'Select axes in Config and press Generate Chart to see the chart.',
  className,
  enableDrillDown = false,
  drillDownFilter = null,
  onDrillDown = null,
  chatbotConfig = null,
  showAverage = false,
  showLegends = true,
  showDataLabels = false,
  displayAsStackedArea = false,
  displayAs100Stacked = false,
}) {
  const isKpi = chartType === 'kpi';
  const isExpand = variant === 'expand';

  const previewChartData = useMemo(
    () => buildPreviewChartData({ chartData, title, summary, chartType, chatbotConfig }),
    [chartData, title, summary, chartType, chatbotConfig],
  );

  if (loading) {
    return (
      <div className={cn('flex flex-1 items-center justify-center text-text-sub-500', className)}>
        <div className='animate-pulse paragraph-small'>Generating preview…</div>
      </div>
    );
  }

  if (error && !chartData) {
    return (
      <div
        className={cn(
          'flex flex-1 items-center justify-center text-error-base paragraph-small',
          className,
        )}
      >
        {error}
      </div>
    );
  }

  if (!previewChartData) {
    return (
      <div className={cn('flex flex-1 items-center justify-center', className)}>
        <PreviewEmptyState message={emptyMessage} />
      </div>
    );
  }

  if (isKpi) {
    const useBuilderKpi = variant === 'builder' && !isExpand;
    return (
      <div className={cn('relative flex min-h-0 flex-1 flex-col', className)}>
        {error ? (
          <div className='mx-6 mb-3 shrink-0 rounded-lg bg-error-lighter px-3 py-2 text-error-base paragraph-xsmall'>
            {error}
          </div>
        ) : null}
        {useBuilderKpi ? (
          <DevxAiChartCard
            chartData={previewChartData}
            showAddToDashboard={false}
            readOnly
            hideVizPicker
            hideTitle
            dashboardFill
            kpiBuilderPreview
            showLegend={showLegends}
            className='min-h-0 flex-1 max-w-none border-0 shadow-none'
          />
        ) : (
          <KpiCanvasPreview
            previewChartData={previewChartData}
            refreshing={refreshing}
            isExpand={isExpand}
          />
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative flex min-h-0 flex-1 flex-col', className)}>
      <StandardChartPreview
        previewChartData={previewChartData}
        chartType={chartType}
        refreshing={refreshing}
        error={error}
        isExpand={isExpand}
        hideTitle={variant === 'builder'}
        enableDrillDown={enableDrillDown}
        drillDownFilter={drillDownFilter}
        onDrillDown={onDrillDown}
        showAverage={showAverage}
        showLegends={showLegends}
        showDataLabels={showDataLabels}
        displayAsStackedArea={displayAsStackedArea}
        displayAs100Stacked={displayAs100Stacked}
      />
    </div>
  );
}

export { DashboardWidgetExpandModal } from '@/components/dashboard-master/viewer/dashboard-widget-expand-modal';
