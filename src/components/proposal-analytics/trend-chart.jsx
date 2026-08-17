import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { AnalyticsEmptyState } from '@/components/proposal-analytics/analytics-empty-state';
import {
  formatDurationDetailed,
  formatNumber,
  formatShortDate,
} from '@/components/proposal-analytics/analytics-format-helpers';
import {
  PROPOSAL_CHART_MARGIN,
  PROPOSAL_CHART_TICK,
  PROPOSAL_CHART_X_AXIS_HEIGHT,
  PROPOSAL_CHART_Y_AXIS_WIDTH,
  PROPOSAL_TREND_CHART_HEIGHT,
  getChartHostStyle,
  formatAxisDate,
  formatAxisDuration,
  formatAxisNumber,
} from '@/components/proposal-analytics/chart-layout';
import { cn } from '@/utils/cn';

const CHART_TYPES = [
  { id: 'area', label: 'Area' },
  { id: 'bar', label: 'Bar' },
];

const METRIC_CONFIG = {
  opens: {
    dataKey: 'opens',
    label: 'Total Visits',
    title: 'Total Visits',
  },
  unique: {
    dataKey: 'unique_visitors',
    label: 'Unique Visitors',
    title: 'Unique visitors',
  },
  duration: {
    dataKey: 'visit_duration',
    label: 'Total Visit Duration',
    title: 'Total visit duration',
  },
};

function useThemePrimaryColor() {
  const [color, setColor] = useState('#22c55e');

  useEffect(() => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-primary-base')
      .trim();
    if (value) setColor(value);
  }, []);

  return color;
}

function TrendTooltip({ active, payload, metric }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  const value = payload[0]?.value ?? 0;
  const config = METRIC_CONFIG[metric] || METRIC_CONFIG.opens;
  const isDuration = metric === 'duration';
  const when = formatShortDate(row.date || row.event_time);

  return (
    <div className='max-w-xs rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 shadow-regular-md'>
      <p className='text-[12px] font-medium text-text-strong-950'>{when}</p>
      {isDuration && row.unique_visitors ? (
        <p className='mt-1 text-[12px] text-text-sub-500'>
          Visitors:{' '}
          <span className='text-text-strong-950'>{formatNumber(row.unique_visitors)}</span>
        </p>
      ) : null}
      <p className='mt-1 text-[12px] text-text-sub-500'>
        {isDuration ? (
          <>
            <span className='font-medium text-text-strong-950'>
              {formatDurationDetailed(value)}
            </span>{' '}
            total
          </>
        ) : (
          <>
            {config.label}: {formatNumber(value)}
          </>
        )}
      </p>
    </div>
  );
}

/**
 * Traffic chart with area / bar modes. Drag to zoom in; double-click or pinch/scroll-out to reset.
 */
export function TrendChart({
  data,
  metric = 'opens',
  chartType = 'area',
  onChartTypeChange,
  className,
}) {
  const primary = useThemePrimaryColor();
  const config = METRIC_CONFIG[metric] || METRIC_CONFIG.opens;
  const dataKey = config.dataKey;
  const fillId = 'proposalTrendPrimaryFill';
  const isDuration = metric === 'duration';

  const [refLeft, setRefLeft] = useState(null);
  const [refRight, setRefRight] = useState(null);
  const [zoomDomain, setZoomDomain] = useState(null);

  const rows = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.map((row, index) => {
      const visitDuration = Number(
        row.visit_duration ?? row.duration ?? row.average_session_time ?? 0,
      );
      const eventTime = row.event_time || row.date || row.day || row.period;
      return {
        ...row,
        date: row.date || row.day || row.period || eventTime,
        event_time: eventTime,
        opens: Number(row.opens ?? row.count ?? 0),
        unique_visitors: Number(
          row.unique_visitors ?? row.unique ?? row.visitors ?? row.uniqueVisitors ?? 0,
        ),
        visit_duration: Number.isFinite(visitDuration) ? visitDuration : 0,
        visitor_id: row.visitor_id || '',
        _key: `${eventTime || row.date || index}-${row.visitor_id || index}`,
      };
    });
  }, [data]);

  useEffect(() => {
    setZoomDomain(null);
    setRefLeft(null);
    setRefRight(null);
  }, [rows, metric, chartType]);

  const visibleRows = useMemo(() => {
    if (!zoomDomain?.left || !zoomDomain?.right) return rows;
    const leftIdx = rows.findIndex((row) => row.date === zoomDomain.left);
    const rightIdx = rows.findIndex((row) => row.date === zoomDomain.right);
    if (leftIdx < 0 || rightIdx < 0) return rows;
    const start = Math.min(leftIdx, rightIdx);
    const end = Math.max(leftIdx, rightIdx);
    return rows.slice(start, end + 1);
  }, [rows, zoomDomain]);

  const chartHostRef = React.useRef(null);

  useEffect(() => {
    const root = chartHostRef.current;
    if (!root) return undefined;
    const stripFocus = () => {
      root.querySelectorAll('.recharts-wrapper, .recharts-surface, svg').forEach((el) => {
        el.setAttribute('tabindex', '-1');
        el.style.outline = 'none';
        el.style.boxShadow = 'none';
      });
    };
    stripFocus();
    const frame = requestAnimationFrame(stripFocus);
    return () => cancelAnimationFrame(frame);
  }, [visibleRows, chartType, metric]);

  const resetZoom = () => {
    setZoomDomain(null);
    setRefLeft(null);
    setRefRight(null);
  };

  const yTickFormatter = isDuration ? formatAxisDuration : formatAxisNumber;

  const finishZoom = () => {
    if (refLeft == null || refRight == null || refLeft === refRight) {
      setRefLeft(null);
      setRefRight(null);
      return;
    }
    setZoomDomain({ left: refLeft, right: refRight });
    setRefLeft(null);
    setRefRight(null);
  };

  const zoomHandlers = {
    onMouseDown: (state) => {
      if (state?.activeLabel != null) setRefLeft(state.activeLabel);
    },
    onMouseMove: (state) => {
      if (refLeft != null && state?.activeLabel != null) setRefRight(state.activeLabel);
    },
    onMouseUp: finishZoom,
    onMouseLeave: () => {
      if (refLeft != null && refRight != null) finishZoom();
      else {
        setRefLeft(null);
        setRefRight(null);
      }
    },
    onDoubleClick: resetZoom,
  };

  const sharedAxis = (
    <>
      <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e5e7eb' />
      <XAxis
        dataKey='date'
        tickFormatter={formatAxisDate}
        tickLine={false}
        axisLine={false}
        tick={PROPOSAL_CHART_TICK}
        height={PROPOSAL_CHART_X_AXIS_HEIGHT}
        minTickGap={24}
        interval='preserveStartEnd'
      />
      <YAxis
        allowDecimals={isDuration}
        tickLine={false}
        axisLine={false}
        tick={PROPOSAL_CHART_TICK}
        width={PROPOSAL_CHART_Y_AXIS_WIDTH}
        tickFormatter={yTickFormatter}
      />
      <Tooltip
        content={<TrendTooltip metric={metric} />}
        cursor={false}
        isAnimationActive={false}
      />
      {refLeft && refRight ? (
        <ReferenceArea
          x1={refLeft}
          x2={refRight}
          strokeOpacity={0.3}
          fill={primary}
          fillOpacity={0.12}
        />
      ) : null}
    </>
  );

  let chart = null;
  if (visibleRows.length > 0) {
    if (chartType === 'bar') {
      chart = (
        <BarChart
          data={visibleRows}
          margin={PROPOSAL_CHART_MARGIN}
          accessibilityLayer={false}
          {...zoomHandlers}
        >
          {sharedAxis}
          <Bar
            dataKey={dataKey}
            fill={primary}
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
            isAnimationActive
            animationBegin={0}
            animationDuration={900}
            animationEasing='ease-out'
          />
        </BarChart>
      );
    } else {
      chart = (
        <AreaChart
          data={visibleRows}
          margin={PROPOSAL_CHART_MARGIN}
          accessibilityLayer={false}
          {...zoomHandlers}
        >
          <defs>
            <linearGradient id={fillId} x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0%' stopColor={primary} stopOpacity={0.35} />
              <stop offset='100%' stopColor={primary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {sharedAxis}
          <Area
            type='monotone'
            dataKey={dataKey}
            stroke={primary}
            strokeWidth={2}
            fill={`url(#${fillId})`}
            dot={visibleRows.length <= 3}
            activeDot={{ r: 4, fill: primary }}
            isAnimationActive
            animationBegin={0}
            animationDuration={900}
            animationEasing='ease-out'
          />
        </AreaChart>
      );
    }
  }

  return (
    <div className={cn('outline-none', className)}>
      {typeof onChartTypeChange === 'function' ? (
        <div className='mb-3 flex h-8 shrink-0 flex-wrap items-center justify-between gap-2'>
          <p className='text-[14px] font-semibold text-text-strong-950'>{config.title}</p>
          <div className='inline-flex rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-0.5'>
            {CHART_TYPES.map((type) => (
              <button
                key={type.id}
                type='button'
                className={cn(
                  'rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors',
                  chartType === type.id
                    ? 'bg-primary-base text-static-white'
                    : 'text-text-sub-500 hover:bg-bg-weak-50 hover:text-text-strong-950',
                )}
                onClick={() => onChartTypeChange(type.id)}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div
          className='flex items-center justify-center'
          style={getChartHostStyle(PROPOSAL_TREND_CHART_HEIGHT)}
        >
          <AnalyticsEmptyState
            title={isDuration ? 'No duration data yet' : 'No traffic yet'}
            description={
              isDuration
                ? 'Total duration appears after visitors spend time in sections and leave or close the proposal.'
                : 'Open the shared proposal link to start collecting daily opens across all days.'
            }
          />
        </div>
      ) : (
        <div
          ref={chartHostRef}
          className='proposal-analytics-chart w-full shrink-0'
          style={getChartHostStyle(PROPOSAL_TREND_CHART_HEIGHT)}
          onMouseDown={(event) => event.preventDefault()}
          onDoubleClick={resetZoom}
          onWheel={(event) => {
            if (!zoomDomain) return;
            if (event.ctrlKey) {
              event.preventDefault();
              resetZoom();
            }
          }}
        >
          {chart ? (
            <ResponsiveContainer
              width='100%'
              height={PROPOSAL_TREND_CHART_HEIGHT}
              minWidth={0}
              debounce={1}
            >
              {chart}
            </ResponsiveContainer>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default TrendChart;
