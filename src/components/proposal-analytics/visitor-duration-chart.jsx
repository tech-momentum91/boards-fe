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
  formatChartDateTime,
  formatDurationDetailed,
  truncateId,
} from '@/components/proposal-analytics/analytics-format-helpers';
import {
  PROPOSAL_CHART_MARGIN,
  PROPOSAL_CHART_TICK,
  PROPOSAL_CHART_X_AXIS_HEIGHT,
  PROPOSAL_CHART_Y_AXIS_WIDTH,
  PROPOSAL_DURATION_CHART_HEIGHT,
  formatAxisDate,
  formatAxisDuration,
  getChartHostStyle,
} from '@/components/proposal-analytics/chart-layout';
import { cn } from '@/utils/cn';

const CHART_TYPES = [
  { id: 'area', label: 'Area' },
  { id: 'bar', label: 'Bar' },
];

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

function DurationTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  const duration = Number(row.visit_duration ?? payload[0]?.value ?? 0);
  const visitorName = row.visitor_name || 'Visitor';
  const visitorId = row.visitor_id || '';

  return (
    <div className='max-w-xs rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 shadow-regular-md'>
      <p className='text-[12px] font-medium text-text-strong-950'>
        {formatChartDateTime(row.event_time)}
      </p>
      <p className='mt-1.5 text-[12px] text-text-sub-500'>
        <span className='font-medium text-text-strong-950'>{visitorName}</span>
        {visitorId ? (
          <span className='ml-1 text-text-soft-400' title={visitorId}>
            ({truncateId(visitorId, 12)})
          </span>
        ) : null}
      </p>
      <p className='mt-1 text-[12px] text-text-sub-500'>
        <span className='font-medium text-text-strong-950'>{formatDurationDetailed(duration)}</span>{' '}
        Visit Duration
      </p>
    </div>
  );
}

/**
 * Visit-duration timeline — same fixed chart box as traffic trend charts.
 */
export function VisitorDurationChart({
  data = [],
  chartType = 'area',
  onChartTypeChange,
  className,
}) {
  const primary = useThemePrimaryColor();
  const fillId = 'visitDurationSpikeFill';
  const [selectedKey, setSelectedKey] = useState(null);
  const [refLeft, setRefLeft] = useState(null);
  const [refRight, setRefRight] = useState(null);
  const [zoomDomain, setZoomDomain] = useState(null);
  const chartHostRef = React.useRef(null);

  const rows = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data
      .map((row, index) => {
        const duration = Number(row.visit_duration ?? row.duration ?? 0);
        const eventTime = row.event_time || row.date;
        if (!eventTime || !Number.isFinite(duration) || duration <= 0) return null;
        const ts = new Date(eventTime).getTime();
        if (!Number.isFinite(ts)) return null;
        return {
          ...row,
          event_time: eventTime,
          date: eventTime,
          ts,
          visit_duration: duration,
          visitor_name: row.visitor_name || 'Visitor',
          visitor_id: row.visitor_id || '',
          _key: row._key || `${ts}-${row.visitor_id || index}-${index}`,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.ts - b.ts);
  }, [data]);

  useEffect(() => {
    setSelectedKey(null);
    setZoomDomain(null);
    setRefLeft(null);
    setRefRight(null);
  }, [rows, chartType]);

  const visibleRows = useMemo(() => {
    if (!zoomDomain?.left || !zoomDomain?.right) return rows;
    const leftIdx = rows.findIndex((row) => row.event_time === zoomDomain.left);
    const rightIdx = rows.findIndex((row) => row.event_time === zoomDomain.right);
    if (leftIdx < 0 || rightIdx < 0) return rows;
    const start = Math.min(leftIdx, rightIdx);
    const end = Math.max(leftIdx, rightIdx);
    return rows.slice(start, end + 1);
  }, [rows, zoomDomain]);

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
  }, [visibleRows, chartType]);

  const selectedRow = useMemo(
    () => visibleRows.find((row) => row._key === selectedKey) || null,
    [visibleRows, selectedKey],
  );

  const selectPoint = (point) => {
    if (!point?._key) return;
    setSelectedKey((prev) => (prev === point._key ? null : point._key));
  };

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

  const resetZoom = () => {
    setZoomDomain(null);
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

  const handleChartClick = (state) => {
    if (refLeft != null) return;
    const point = state?.activePayload?.[0]?.payload;
    if (point) selectPoint(point);
  };

  const handleDotClick = (_event, payload) => {
    selectPoint(payload?.payload);
  };

  const sharedAxis = (
    <>
      <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e5e7eb' />
      <XAxis
        dataKey='event_time'
        tickFormatter={formatAxisDate}
        tickLine={false}
        axisLine={false}
        tick={PROPOSAL_CHART_TICK}
        height={PROPOSAL_CHART_X_AXIS_HEIGHT}
        minTickGap={24}
        interval='preserveStartEnd'
      />
      <YAxis
        allowDecimals
        tickLine={false}
        axisLine={false}
        tick={PROPOSAL_CHART_TICK}
        width={PROPOSAL_CHART_Y_AXIS_WIDTH}
        tickFormatter={formatAxisDuration}
      />
      <Tooltip content={<DurationTooltip />} cursor={false} isAnimationActive={false} />
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

  const commonDot = {
    r: 3.5,
    fill: primary,
    strokeWidth: 0,
    cursor: 'pointer',
    onClick: handleDotClick,
  };

  const commonActiveDot = {
    r: 6,
    fill: primary,
    cursor: 'pointer',
    onClick: handleDotClick,
  };

  let chart = null;
  if (visibleRows.length > 0) {
    if (chartType === 'bar') {
      chart = (
        <BarChart
          data={visibleRows}
          margin={PROPOSAL_CHART_MARGIN}
          accessibilityLayer={false}
          {...zoomHandlers}
          onClick={handleChartClick}
        >
          {sharedAxis}
          <Bar
            dataKey='visit_duration'
            name='Visit Duration'
            fill={primary}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            cursor='pointer'
            isAnimationActive
            animationBegin={0}
            animationDuration={900}
            animationEasing='ease-out'
            onClick={(entry) => selectPoint(entry?.payload || entry)}
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
          onClick={handleChartClick}
        >
          <defs>
            <linearGradient id={fillId} x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0%' stopColor={primary} stopOpacity={0.4} />
              <stop offset='100%' stopColor={primary} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          {sharedAxis}
          <Area
            type='monotone'
            dataKey='visit_duration'
            name='Visit Duration'
            stroke={primary}
            strokeWidth={2}
            fill={`url(#${fillId})`}
            dot={commonDot}
            activeDot={commonActiveDot}
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
          <p className='text-[14px] font-semibold text-text-strong-950'>Visit Duration</p>
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
      ) : (
        <p className='mb-3 flex h-8 shrink-0 items-center text-[14px] font-semibold text-text-strong-950'>
          Visit Duration
        </p>
      )}

      {rows.length === 0 ? (
        <div
          className='flex items-center justify-center'
          style={getChartHostStyle(PROPOSAL_DURATION_CHART_HEIGHT)}
        >
          <AnalyticsEmptyState
            title='No duration data yet'
            description='Visit duration spikes appear after timed section or close events are recorded.'
          />
        </div>
      ) : (
        <div
          ref={chartHostRef}
          className='proposal-analytics-chart w-full shrink-0'
          style={getChartHostStyle(PROPOSAL_DURATION_CHART_HEIGHT)}
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
              height={PROPOSAL_DURATION_CHART_HEIGHT}
              minWidth={0}
              debounce={1}
            >
              {chart}
            </ResponsiveContainer>
          ) : null}
        </div>
      )}

      {selectedRow ? (
        <div className='mt-3 rounded-lg border border-stroke-soft-200 bg-bg-weak-50 px-3 py-2.5'>
          <div className='mb-1 flex items-center justify-between gap-2'>
            <p className='text-[12px] font-semibold text-text-strong-950'>
              {selectedRow.visitor_name}
            </p>
            <button
              type='button'
              className='text-[11px] font-medium text-text-sub-500 hover:text-text-strong-950'
              onClick={() => setSelectedKey(null)}
            >
              Clear
            </button>
          </div>
          <p className='text-[12px] text-text-sub-500'>
            {formatChartDateTime(selectedRow.event_time)}
            {' · '}
            <span className='font-medium text-text-strong-950'>
              {formatDurationDetailed(selectedRow.visit_duration)}
            </span>
          </p>
          {selectedRow.visitor_id ? (
            <p
              className='mt-1 truncate text-[11px] text-text-soft-400'
              title={selectedRow.visitor_id}
            >
              {selectedRow.visitor_id}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default VisitorDurationChart;
