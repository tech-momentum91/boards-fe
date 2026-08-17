import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RiGroupLine } from 'react-icons/ri';

import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import { isDrillDownSegmentActive } from '@/utils/chart-drill-down-utils';

const BAR_COLOR = '#375dfb';
const TRACK_COLOR = '#f6f8fa';

export { BAR_COLOR };

/** Monochromatic blue palette for pie / donut (matches Figma). */
export const RADIAL_CATEGORY_COLORS = ['#ebefff', '#c3cefe', '#9baefd', '#5f7dfc', '#375dfb'];

/** Line chart multi-series palette (monochromatic blue). */
export const LINE_SERIES_COLORS = [...RADIAL_CATEGORY_COLORS].reverse();

/** Richer palette for dashboard bar charts (matches Figma reference). */
export const BAR_CATEGORY_COLORS = [
  '#9ca3af',
  '#ef4444',
  '#375dfb',
  '#7c3aed',
  '#f97316',
  '#eab308',
  '#14b8a6',
  '#22c55e',
  '#ea580c',
  '#7c8cff',
  '#fb7185',
  '#38bdf8',
];

/** Palette for group-by / stacked bar segments (distinct, accessible hues). */
export const CHART_GROUP_COLORS = [
  '#375dfb',
  '#7c3aed',
  '#0891b2',
  '#059669',
  '#d97706',
  '#dc2626',
  '#db2777',
  '#4f46e5',
  '#0d9488',
  '#ca8a04',
];

/** Multicolor palette for battery chart segments (matches grouped/stacked bar charts). */
export const BATTERY_COLORS = [...CHART_GROUP_COLORS];

const EXTENDED_PALETTE_BASE_SIZE = 10;

function parseHexColor(hex) {
  const normalized = String(hex ?? '').replace('#', '');
  if (normalized.length !== 6) return null;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return { r, g, b };
}

function rgbToHex(r, g, b) {
  const clamp = (n) => Math.round(Math.max(0, Math.min(255, n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

/** Positive amount lightens; negative amount darkens. */
export function adjustHexColor(hex, amount) {
  const rgb = parseHexColor(hex);
  if (!rgb) return hex;
  const { r, g, b } = rgb;
  if (amount >= 0) {
    return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
  }
  const factor = 1 + amount;
  return rgbToHex(r * factor, g * factor, b * factor);
}

/**
 * Extend a base palette for large legend counts: base N, then N darker, then N lighter.
 * Supports up to 30 distinct solid colors before cycling (N defaults to 10).
 */
export function buildExtendedPalette(basePalette, baseSize = EXTENDED_PALETTE_BASE_SIZE) {
  if (!Array.isArray(basePalette) || basePalette.length === 0) return [];
  const base = basePalette.slice(0, baseSize);
  const darker = base.map((color) => adjustHexColor(color, -0.22));
  const lighter = base.map((color) => adjustHexColor(color, 0.22));
  return [...base, ...darker, ...lighter];
}

/** Resolve a color at index from an extended palette (cycles after 3× base size). */
export function paletteColorAt(basePalette, index, baseSize = EXTENDED_PALETTE_BASE_SIZE) {
  const extended = buildExtendedPalette(basePalette, baseSize);
  return extended[index % extended.length];
}

/** Stable category color from label identity (survives legend filtering). */
export function buildCategoryColorMap(
  labels,
  palette = RADIAL_CATEGORY_COLORS,
  { extendPalette = false } = {},
) {
  const resolvedPalette = extendPalette ? buildExtendedPalette(palette) : palette;
  const map = new Map();
  (labels ?? []).forEach((label, index) => {
    map.set(String(label), resolvedPalette[index % resolvedPalette.length]);
  });
  return map;
}

/** Resolve colors for a label list using a stable color map. */
export function colorsForLabels(
  labels,
  colorMap,
  palette = RADIAL_CATEGORY_COLORS,
  { extendPalette = false } = {},
) {
  const resolvedPalette = extendPalette ? buildExtendedPalette(palette) : palette;
  return (labels ?? []).map(
    (label, index) =>
      colorMap.get(String(label)) ?? resolvedPalette[index % resolvedPalette.length],
  );
}

/**
 *
 * @param {Array<{x_value: unknown, y_value: unknown, group_value?: unknown}>} rows
 * @returns {{ labels: string[], groups: Array<{label: string, color: string, data: number[]}>, totals: number[] } | null}
 */
export function buildGroupedBarChartFromRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const hasGroup = rows.some(
    (r) => r.group_value !== null && r.group_value !== undefined && String(r.group_value) !== '',
  );
  if (!hasGroup) return null;

  const labelOrder = [];
  const labelSet = new Set();
  const groupSet = new Set();
  /** @type {Map<string, number>} */
  const valueMap = new Map();

  for (const r of rows) {
    const x = String(r.x_value ?? '');
    const g = String(r.group_value ?? '');
    const y = Number(r.y_value ?? 0);
    if (!labelSet.has(x)) {
      labelSet.add(x);
      labelOrder.push(x);
    }
    groupSet.add(g);
    const key = `${x}\0${g}`;
    valueMap.set(key, (valueMap.get(key) ?? 0) + y);
  }

  const groupLabels = [...groupSet].sort((a, b) => a.localeCompare(b));
  const groupPalette = buildExtendedPalette(CHART_GROUP_COLORS);
  const groups = groupLabels.map((label, gi) => ({
    label,
    color: groupPalette[gi % groupPalette.length],
    data: labelOrder.map((x) => valueMap.get(`${x}\0${label}`) ?? 0),
  }));

  const totals = labelOrder.map((_, i) => groups.reduce((sum, g) => sum + (g.data[i] ?? 0), 0));

  // Sort X categories by descending total (matches SQL ORDER BY y_value DESC)
  const order = labelOrder
    .map((label, i) => ({ label, total: totals[i] ?? 0, index: i }))
    .sort((a, b) => b.total - a.total);

  const sortedLabels = order.map((o) => o.label);
  const sortedTotals = order.map((o) => o.total);
  const sortedGroups = groups.map((g) => ({
    ...g,
    data: order.map((o) => g.data[o.index] ?? 0),
  }));

  return { labels: sortedLabels, groups: sortedGroups, totals: sortedTotals };
}

function StackedChartTooltipBody({ categoryLabel, totalText, segments }) {
  const visible = segments.filter((s) => s.value > 0);
  return (
    <div className='min-w-[160px] space-y-2 text-left'>
      <p className='text-[12px] font-semibold leading-4 text-text-strong-950'>{categoryLabel}</p>
      {visible.length > 0 ? (
        <ul className='space-y-1'>
          {visible.map((seg, segIndex) => (
            <li
              key={`${seg.label}|${segIndex}`}
              className='flex items-center justify-between gap-4 text-[11px] leading-4'
            >
              <span className='flex min-w-0 items-center gap-1.5 text-text-sub-600'>
                <span
                  className='size-2 shrink-0 rounded-[2px]'
                  style={{ backgroundColor: seg.color }}
                  aria-hidden
                />
                <span className='truncate'>{seg.label}</span>
              </span>
              <span className='shrink-0 font-medium tabular-nums text-text-strong-950'>
                {seg.valueText}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className='border-t border-stroke-soft-200 pt-1.5 text-[11px] text-text-sub-600'>
        Total: <span className='font-semibold tabular-nums text-text-strong-950'>{totalText}</span>
      </p>
    </div>
  );
}

/** Preferred tab order for the visualization strip. */
const PREFERRED_VIZ_ORDER = [
  'compare_tile',
  'kpi_tile',
  'bar_chart',
  'horizontal_bar_chart',
  'battery_chart',
  'line_chart',
  'donut_chart',
  'pie_chart',
  'heatmap',
  'data_table',
];

const VIZ_LABELS = {
  compare_tile: 'Compare',
  kpi_tile: 'KPI',
  bar_chart: 'Bar',
  horizontal_bar_chart: 'Horizontal Bar',
  battery_chart: 'Battery',
  line_chart: 'Line',
  donut_chart: 'Donut',
  pie_chart: 'Pie',
  heatmap: 'Heatmap',
  data_table: 'Table',
};

/**
 * @param {object | null | undefined} chartData
 * @returns {string[]}
 */
export function normalizeSupportedForCard(chartData) {
  const raw = chartData?.supported_components;
  const list = Array.isArray(raw) ? raw.map((x) => String(x)) : [];
  const set = new Set(list);
  const out = [];
  for (const id of PREFERRED_VIZ_ORDER) {
    if (set.has(id)) out.push(id);
  }
  const hasData =
    (Array.isArray(chartData?.labels) && chartData.labels.length > 0) ||
    (Array.isArray(chartData?.raw_data) && chartData.raw_data.length > 0) ||
    chartData?.kpi != null;
  if (out.length === 0 && hasData) {
    return ['bar_chart', 'data_table'];
  }
  return out;
}

/**
 * @param {object | null | undefined} chartData
 * @param {string[]} supportedList
 * @param {string | undefined} savedViz from widget settings
 */
export function pickInitialViz(chartData, supportedList, savedViz) {
  const def = chartData?.default_component;
  if (typeof savedViz === 'string' && supportedList.includes(savedViz)) {
    return savedViz;
  }
  if (typeof def === 'string' && supportedList.includes(def)) {
    return def;
  }
  if (supportedList.length > 0) {
    return supportedList[0];
  }
  return 'bar_chart';
}

export function vizLabel(id) {
  return VIZ_LABELS[id] ?? id;
}

/** @param {number} max */
export function niceCeil(max) {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const exp = Math.floor(Math.log10(max));
  const f = max / 10 ** exp;
  let nf = 10;
  if (f <= 1) nf = 1;
  else if (f <= 2) nf = 2;
  else if (f <= 5) nf = 5;
  return nf * 10 ** exp;
}

/** @param {number} value @param {number} max */
function formatTick(value, max) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  if (value === 0) return '0';

  const valueAbs = Math.abs(value);
  const scaleAbs = Math.max(valueAbs, Math.abs(max));

  if (scaleAbs >= 1e7) {
    return `${(value / 1e7).toFixed(valueAbs >= 1e8 ? 0 : 1)}Cr`;
  }
  if (scaleAbs >= 1e5) {
    return `${(value / 1e5).toFixed(valueAbs >= 1e6 ? 0 : 1)}L`;
  }
  if (valueAbs >= 1e3) {
    return `${(value / 1e3).toFixed(valueAbs >= 1e4 ? 0 : 1)}K`;
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(2);
}

/** Exact value for legends, center labels, and tooltips — never rounds small values to 0K. */
export function formatChartMetric(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  if (Number.isInteger(value)) return String(value);
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

/** Percentage label for donut/pie segment badges. */
export function formatChartPercent(value, total) {
  if (typeof value !== 'number' || typeof total !== 'number' || total <= 0) return '0%';
  return `${((Math.abs(value) / total) * 100).toFixed(2)}%`;
}

function truncateLabel(label, maxLen = 11) {
  const s = String(label ?? '');
  if (s.length <= maxLen) return s;
  return `${s.slice(0, Math.max(0, maxLen - 2))}…`;
}

/** Tooltip value: prefer exact integers; otherwise match axis tick formatting. */
function formatTooltipMetric(value, scaleMax) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  if (Number.isInteger(value)) return String(value);
  if (Math.abs(value) < 1000) return formatChartMetric(value);
  return formatTick(value, scaleMax);
}

/** Chart.js / API often sends numeric strings; coerce for donut and other viz. */
function coerceSeriesNumber(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v == null) return Number.NaN;
  if (typeof v === 'string') {
    const s = v.trim().replaceAll(',', '');
    if (s === '') return Number.NaN;
    const n = Number(s);
    return Number.isFinite(n) ? n : Number.NaN;
  }
  return Number.NaN;
}

function ChartTooltipBody({ categoryLabel, valueText, valueDescription = 'Value' }) {
  return (
    <div className='max-w-[220px] space-y-0.5 text-left'>
      <p className='text-[11px] font-semibold leading-4 text-text-white-0'>{categoryLabel}</p>
      <p className='text-[10px] leading-3.5 text-text-white-0/85'>
        {valueDescription}: <span className='font-medium tabular-nums'>{valueText}</span>
      </p>
    </div>
  );
}

/** Fixed tooltip near pointer; Radix anchors to element box — clip-path wedges still have full-chart rect. */
function chartCursorTooltipPosition(clientX, clientY) {
  const pad = 10;
  const gap = 14;
  const estW = 240;
  const estH = 76;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const flipX = clientX + gap + estW > vw - pad;
  const flipY = clientY + gap + estH > vh - pad;
  const left = flipX ? clientX - gap : clientX + gap;
  const top = flipY ? clientY - gap : clientY + gap;
  const tx = flipX ? 'translateX(-100%)' : '';
  const ty = flipY ? 'translateY(-100%)' : '';
  const transform = [tx, ty].filter(Boolean).join(' ') || undefined;
  return { left, top, transform };
}

function verticalBarLayout(labels, { isDashboard }) {
  const count = Math.max(labels.length, 1);
  const autoRotate = isDashboard || count > 7;
  const labelRowHeight = autoRotate ? 88 : 24;
  const maxBarWidth = isDashboard ? 44 : 52;
  const minBarWidth = isDashboard ? 16 : 20;
  const barGap = Math.max(
    2,
    Math.min(isDashboard ? 16 : 24, Math.floor((isDashboard ? 96 : 160) / count)),
  );
  const compactBars = count <= 10;
  const labelStride = autoRotate ? 1 : Math.ceil(count / 8);
  return {
    autoRotate,
    labelRowHeight,
    barGap,
    maxBarWidth,
    minBarWidth,
    compactBars,
    count,
    labelStride,
  };
}

function verticalBarColumnStyle({ compactBars, maxBarWidth, minBarWidth }) {
  if (compactBars) {
    return {
      flex: '0 0 auto',
      width: maxBarWidth,
      maxWidth: maxBarWidth,
      minWidth: minBarWidth,
    };
  }
  return {
    flex: '1 1 0',
    minWidth: minBarWidth,
    maxWidth: maxBarWidth,
  };
}

function VerticalBarColumnsRow({ labels, compactBars, barGap, className, style, children }) {
  return (
    <div
      className={cn('relative z-[1] flex px-1', compactBars && 'justify-center', className)}
      style={{ gap: barGap, ...style }}
    >
      {labels.map((label, idx) => children(label, idx))}
    </div>
  );
}

function VerticalBarXAxisLabel({ categoryText, autoRotate, isDashboard, label, visible = true }) {
  if (autoRotate) {
    // Anchored at its own top-right corner (which sits at the tick, right at the
    // axis line) and rotated so it trails down-and-left into already-available
    // space. This is the opposite of anchoring top-left, which would make every
    // label — especially the last one, with nothing to its right — trail off
    // the edge of the chart and get clipped mid-glyph.
    return (
      <div
        className='relative h-full w-full'
        title={visible ? categoryText : undefined}
        aria-hidden={!visible}
      >
        <span
          className={cn(
            'absolute right-1/2 top-0 block max-w-[110px] truncate font-medium leading-none text-text-sub-500',
            isDashboard ? 'text-[10px]' : 'text-[9px]',
            !visible && 'invisible',
          )}
          style={{
            transform: 'translateX(4px) rotate(-45deg)',
            transformOrigin: 'right top',
          }}
        >
          {categoryText}
        </span>
      </div>
    );
  }

  return (
    <p
      className={cn(
        'mt-3 shrink-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-center font-medium text-text-sub-500',
        isDashboard ? 'text-[10px] leading-none' : 'text-[14px] leading-5 tracking-[-0.084px]',
        !visible && 'invisible',
      )}
      title={visible ? categoryText : undefined}
      aria-hidden={!visible}
    >
      {truncateLabel(label, isDashboard ? 14 : 11)}
    </p>
  );
}

/**
 * @param {{
 *   labels: string[],
 *   series: number[],
 *   maxVal: number,
 *   tickValues: number[],
 *   barAreaHeightPx?: number,
 *   onCategoryClick?: (payload: { index: number, label: string, value: number }) => void,
 *   activeFilter?: { index: number, groupValue?: string | null } | null,
 *   barColors?: string[] | null,
 *   variant?: 'default' | 'dashboard',
 *   showDataLabels?: boolean,
 *   hasLegendBelow?: boolean,
 * }} props
 */
export function VerticalBarChartBlock({
  labels,
  series,
  maxVal,
  tickValues,
  barAreaHeightPx = 139,
  onCategoryClick,
  activeFilter = null,
  barColors = null,
  variant = 'default',
  showDataLabels = false,
  showAverage = false,
  hasLegendBelow = false,
}) {
  const clickable = typeof onCategoryClick === 'function';
  const isDashboard = variant === 'dashboard';
  const { autoRotate, labelRowHeight, barGap, compactBars, maxBarWidth, minBarWidth, labelStride } =
    verticalBarLayout(labels, { isDashboard });
  const barAreaHeight = isDashboard ? Math.max(barAreaHeightPx, 160) : barAreaHeightPx;
  const columnStyle = verticalBarColumnStyle({ compactBars, maxBarWidth, minBarWidth });
  const showLabels = showDataLabels;
  // Rotated labels are anchored at top-right and trail down-and-left, so the very
  // first column's label has nothing to its left to spill into — reserve a strip
  // of padding so it lands inside the chart instead of getting clipped mid-word.
  const edgePadding = autoRotate ? 56 : 0;
  const averageValue = useMemo(() => {
    const nums = series.filter((n) => typeof n === 'number' && !Number.isNaN(n));
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }, [series]);
  const averagePct = maxVal > 0 ? (averageValue / maxVal) * 100 : 0;

  return (
    <Tooltip.Provider delayDuration={200} skipDelayDuration={250}>
      <div className={cn('flex w-full gap-2', hasLegendBelow && 'mb-4')}>
        <div
          className={cn(
            'flex shrink-0 flex-col justify-between py-0.5 font-medium text-text-sub-500',
            isDashboard
              ? 'w-7 text-[10px] leading-[14px]'
              : 'w-6 text-[14px] leading-5 tracking-[-0.084px]',
          )}
          style={{ height: barAreaHeight }}
          aria-hidden
        >
          {tickValues.map((tv) => (
            <span key={tv} className='block text-right tabular-nums'>
              {formatTick(tv, maxVal)}
            </span>
          ))}
        </div>
        <div
          className='relative flex min-w-0 flex-1 flex-col overflow-hidden'
          style={{ paddingLeft: edgePadding }}
        >
          <div
            className='pointer-events-none absolute right-0 top-0'
            style={{ left: edgePadding, height: barAreaHeight }}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className='absolute left-0 right-0 border-t border-stroke-soft-200/90'
                style={{ top: `${(i * 100) / 4}%` }}
              />
            ))}
            {showAverage ? (
              <div
                className='pointer-events-none absolute left-0 right-0 z-[2] border-t-2 border-dashed border-[#375dfb]/60'
                style={{ top: `${100 - averagePct}%` }}
              />
            ) : null}
          </div>
          <VerticalBarColumnsRow
            labels={labels}
            compactBars={compactBars}
            barGap={barGap}
            className='overflow-hidden'
            style={{ height: barAreaHeight }}
          >
            {(label, idx) => {
              const value = typeof series[idx] === 'number' ? series[idx] : 0;
              const pct = maxVal > 0 ? (value / maxVal) * 100 : 0;
              const categoryText = String(label ?? '');
              const valueText = formatChartMetric(value);
              const barColor = barColors?.[idx] ?? BAR_COLOR;
              const isActive = isDrillDownSegmentActive(activeFilter, { index: idx });
              const handleActivate = () => {
                if (!clickable) return;
                onCategoryClick({ index: idx, label: categoryText, value });
              };
              return (
                <Tooltip.Root key={`bar-${idx}`}>
                  <Tooltip.Trigger asChild>
                    <div
                      role={clickable ? 'button' : 'presentation'}
                      tabIndex={clickable ? 0 : undefined}
                      data-devx-dashboard-no-drag={clickable ? true : undefined}
                      className={cn(
                        'flex flex-col items-center outline-none transition-opacity duration-200',
                        compactBars ? 'shrink-0' : 'min-w-0',
                        clickable
                          ? 'cursor-pointer rounded-md focus-visible:ring-2 focus-visible:ring-primary-base/40'
                          : 'cursor-default',
                        activeFilter && (isActive ? 'opacity-100' : 'opacity-30'),
                        activeFilter &&
                          isActive &&
                          'ring-2 ring-primary-base/30 ring-inset rounded-md',
                      )}
                      style={{ ...columnStyle, height: barAreaHeight }}
                      onClick={handleActivate}
                      onKeyDown={(event) => {
                        if (!clickable) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleActivate();
                        }
                      }}
                    >
                      <div className='flex h-full w-full flex-col items-center justify-end'>
                        {showLabels && value > 0 ? (
                          <span
                            className={cn(
                              'mb-1 shrink-0 font-semibold tabular-nums text-text-strong-950',
                              isDashboard ? 'text-[11px] leading-none' : 'text-[9px] leading-none',
                            )}
                          >
                            {valueText}
                          </span>
                        ) : null}
                        <div
                          className='flex min-h-0 w-full flex-1 flex-col justify-end overflow-hidden rounded-t-[6px]'
                          style={{ backgroundColor: TRACK_COLOR }}
                        >
                          <div
                            className='w-full rounded-t-[6px] transition-all duration-500 ease-out'
                            style={{
                              height: `${pct}%`,
                              minHeight: value > 0 ? 4 : 0,
                              backgroundColor: barColor,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content side='top' size='small' className='max-w-[260px]'>
                    <ChartTooltipBody
                      categoryLabel={categoryText || 'Category'}
                      valueText={valueText}
                      valueDescription='Value'
                    />
                  </Tooltip.Content>
                </Tooltip.Root>
              );
            }}
          </VerticalBarColumnsRow>
          <VerticalBarColumnsRow
            labels={labels}
            compactBars={compactBars}
            barGap={barGap}
            className='shrink-0 overflow-visible'
            style={{ height: labelRowHeight }}
          >
            {(label, idx) => {
              const categoryText = String(label ?? '');
              return (
                <div
                  key={`xlabel-${idx}`}
                  className={cn(compactBars ? 'shrink-0' : 'min-w-0')}
                  style={{ ...columnStyle, height: labelRowHeight }}
                >
                  <VerticalBarXAxisLabel
                    categoryText={categoryText}
                    autoRotate={autoRotate}
                    isDashboard={isDashboard}
                    label={label}
                    visible={idx % labelStride === 0 || idx === labels.length - 1}
                  />
                </div>
              );
            }}
          </VerticalBarColumnsRow>
        </div>
      </div>
    </Tooltip.Provider>
  );
}

/**
 * Horizontal bar chart with track background and rounded bar ends (Figma-aligned).
 */
export function HorizontalBarChartBlock({
  labels,
  series,
  maxVal,
  tickValues,
  barAreaWidthPx = 400,
  onCategoryClick,
  activeFilter = null,
  barColors = null,
  showDataLabels = false,
  showAverage = false,
  averagePct = 0,
}) {
  const clickable = typeof onCategoryClick === 'function';
  const rowHeight = 40;
  const rowGap = 24;
  const labelWidth = 48;
  const totalHeight = labels.length * rowHeight + Math.max(0, labels.length - 1) * rowGap;
  const computedAveragePct =
    averagePct ||
    (() => {
      const nums = series.filter((n) => typeof n === 'number' && !Number.isNaN(n));
      if (nums.length === 0 || maxVal <= 0) return 0;
      return (nums.reduce((a, b) => a + b, 0) / nums.length / maxVal) * 100;
    })();

  return (
    <Tooltip.Provider delayDuration={200} skipDelayDuration={250}>
      <div className='flex w-full flex-col gap-3'>
        <div className='flex w-full gap-3'>
          <div
            className='flex shrink-0 flex-col justify-between'
            style={{ width: labelWidth, height: totalHeight }}
          >
            {labels.map((label, idx) => (
              <p
                key={`y-${idx}`}
                className='flex items-center justify-end text-[14px] font-medium leading-5 tracking-[-0.084px] text-text-sub-500'
                style={{ height: rowHeight }}
                title={String(label ?? '')}
              >
                {truncateLabel(label, 10)}
              </p>
            ))}
          </div>
          <div className='relative min-w-0 flex-1'>
            <div className='relative flex flex-col' style={{ gap: rowGap, height: totalHeight }}>
              {labels.map((label, idx) => {
                const value = typeof series[idx] === 'number' ? series[idx] : 0;
                const pct = maxVal > 0 ? (value / maxVal) * 100 : 0;
                const categoryText = String(label ?? '');
                const valueText = formatChartMetric(value);
                const barColor = barColors?.[idx] ?? BAR_COLOR;
                const isActive = isDrillDownSegmentActive(activeFilter, { index: idx });
                const handleActivate = () => {
                  if (!clickable) return;
                  onCategoryClick({ index: idx, label: categoryText, value });
                };
                return (
                  <Tooltip.Root key={`hbar-${idx}`}>
                    <Tooltip.Trigger asChild>
                      <div
                        role={clickable ? 'button' : 'presentation'}
                        tabIndex={clickable ? 0 : undefined}
                        className={cn(
                          'relative flex w-full items-center outline-none transition-opacity duration-200',
                          clickable ? 'cursor-pointer' : 'cursor-default',
                          activeFilter && (isActive ? 'opacity-100' : 'opacity-30'),
                        )}
                        style={{ height: rowHeight }}
                        onClick={handleActivate}
                        onKeyDown={(event) => {
                          if (!clickable) return;
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleActivate();
                          }
                        }}
                      >
                        <div
                          className='relative h-[40px] w-full overflow-hidden rounded-r-[6px]'
                          style={{ backgroundColor: TRACK_COLOR, maxWidth: barAreaWidthPx }}
                        >
                          <div
                            className='absolute left-0 top-0 h-full rounded-r-[6px] transition-all duration-500 ease-out'
                            style={{
                              width: `${pct}%`,
                              minWidth: value > 0 ? 4 : 0,
                              backgroundColor: barColor,
                            }}
                          />
                          {showDataLabels && value > 0 ? (
                            <span className='absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold tabular-nums text-text-strong-950'>
                              {valueText}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content side='top' size='small' className='max-w-[260px]'>
                      <ChartTooltipBody
                        categoryLabel={categoryText || 'Category'}
                        valueText={valueText}
                        valueDescription='Value'
                      />
                    </Tooltip.Content>
                  </Tooltip.Root>
                );
              })}
              {showAverage ? (
                <div
                  className='pointer-events-none absolute bottom-0 top-0 z-[2] border-l-2 border-dashed border-[#375dfb]/60'
                  style={{ left: `${computedAveragePct}%` }}
                />
              ) : null}
            </div>
          </div>
        </div>
        <div className='flex justify-between pl-[60px] pr-2 text-[14px] font-medium leading-5 tracking-[-0.084px] text-text-sub-500'>
          {[...tickValues].reverse().map((tv) => (
            <span key={tv} className='tabular-nums'>
              {formatTick(tv, maxVal)}
            </span>
          ))}
        </div>
      </div>
    </Tooltip.Provider>
  );
}

/**
 * Stacked vertical bar chart for group-by query results.
 * Each X category is one bar; segments are coloured by group_value.
 *
 * @param {{
 *   labels: string[],
 *   groups: Array<{label: string, color: string, data: number[]}>,
 *   totals: number[],
 *   maxVal: number,
 *   tickValues: number[],
 *   barAreaHeightPx?: number,
 *   onCategoryClick?: (payload: { index: number, label: string, value: number, groupValue?: string }) => void,
 *   activeFilter?: { index: number, groupValue?: string | null } | null,
 * }} props
 */
export function StackedVerticalBarChartBlock({
  labels,
  groups,
  totals,
  maxVal,
  tickValues,
  barAreaHeightPx = 139,
  onCategoryClick,
  showDataLabels = true,
  categoryLabels,
  formatValue,
  barMinWidthPx,
  activeFilter = null,
  variant = 'default',
  hasLegendBelow = false,
}) {
  const clickable = typeof onCategoryClick === 'function';
  const isDashboard = variant === 'dashboard';
  const { autoRotate, labelRowHeight, barGap, compactBars, maxBarWidth, minBarWidth, labelStride } =
    verticalBarLayout(labels, { isDashboard });
  const barAreaHeight = isDashboard ? Math.max(barAreaHeightPx, 80) : barAreaHeightPx;
  const columnStyle = verticalBarColumnStyle({ compactBars, maxBarWidth, minBarWidth });
  // Rotated labels are anchored at top-right and trail down-and-left, so the very
  // first column's label has nothing to its left to spill into — reserve a strip
  // of padding so it lands inside the chart instead of getting clipped mid-word.
  const edgePadding = autoRotate ? 56 : 0;

  const renderStackedBar = (label, idx) => {
    const total = typeof totals[idx] === 'number' ? totals[idx] : 0;
    const totalPct = maxVal > 0 ? (total / maxVal) * 100 : 0;
    const categoryText = String(label ?? '');
    const totalText = formatTooltipMetric(total, maxVal);

    const segments = groups.map((g, gi) => ({
      label: g.label,
      color: g.color || paletteColorAt(CHART_GROUP_COLORS, gi),
      value: typeof g.data[idx] === 'number' ? g.data[idx] : 0,
      valueText: formatTooltipMetric(typeof g.data[idx] === 'number' ? g.data[idx] : 0, maxVal),
    }));

    const visibleSegments = segments.filter((s) => s.value > 0);
    const isColumnActive = !activeFilter || activeFilter.index === idx;
    const handleActivate = () => {
      if (!clickable) return;
      onCategoryClick({ index: idx, label: categoryText, value: total });
    };

    return (
      <Tooltip.Root key={`stacked-bar-${idx}`}>
        <Tooltip.Trigger asChild>
          <div
            role={clickable ? 'button' : 'presentation'}
            tabIndex={clickable ? 0 : undefined}
            data-devx-dashboard-no-drag={clickable ? true : undefined}
            className={cn(
              'flex flex-col items-center outline-none transition-opacity duration-200',
              compactBars ? 'shrink-0' : 'min-w-0',
              clickable
                ? 'cursor-pointer rounded-md focus-visible:ring-2 focus-visible:ring-primary-base/40'
                : 'cursor-default',
              activeFilter && (isColumnActive ? 'opacity-100' : 'opacity-30'),
              activeFilter && isColumnActive && 'ring-2 ring-primary-base/30 ring-inset rounded-md',
            )}
            style={{ ...columnStyle, height: barAreaHeight }}
            onClick={handleActivate}
            onKeyDown={(event) => {
              if (!clickable) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleActivate();
              }
            }}
          >
            <div className='flex h-full w-full flex-col items-center justify-end'>
              {showDataLabels && total > 0 ? (
                <span
                  className={cn(
                    'mb-1 shrink-0 font-semibold leading-none tabular-nums text-text-strong-950',
                    isDashboard ? 'text-[11px]' : 'text-[9px] text-text-sub-600',
                  )}
                >
                  {totalText}
                </span>
              ) : null}
              <div
                className={cn(
                  'flex min-h-0 w-full flex-1 flex-col justify-end overflow-hidden',
                  isDashboard ? 'rounded-t-[6px]' : 'rounded-t-[4px] px-1',
                )}
                style={{ backgroundColor: TRACK_COLOR }}
              >
                <div
                  className={cn(
                    'flex w-full flex-col justify-end overflow-hidden',
                    isDashboard ? 'rounded-t-[6px]' : 'rounded-t-[4px]',
                  )}
                  style={{
                    height: `${totalPct}%`,
                    minHeight: total > 0 ? (isDashboard ? 4 : 2) : 0,
                  }}
                >
                  {visibleSegments.map((seg, segIndex) => {
                    const isSegmentActive = isDrillDownSegmentActive(activeFilter, {
                      index: idx,
                      groupValue: seg.label,
                    });
                    const handleSegmentClick = (e) => {
                      if (!clickable) return;
                      e.stopPropagation();
                      onCategoryClick({
                        index: idx,
                        label: categoryText,
                        value: seg.value,
                        groupValue: seg.label,
                      });
                    };

                    return (
                      <div
                        key={`${seg.label}|${segIndex}`}
                        role={clickable ? 'button' : 'presentation'}
                        tabIndex={clickable ? 0 : undefined}
                        className={cn(
                          'w-full shrink-0 transition-opacity duration-200',
                          clickable && 'cursor-pointer hover:brightness-110',
                          activeFilter?.groupValue &&
                            (isSegmentActive ? 'opacity-100' : 'opacity-35'),
                        )}
                        style={{
                          flex: `${seg.value} 0 0`,
                          minHeight: 2,
                          backgroundColor: seg.color,
                        }}
                        onClick={handleSegmentClick}
                        onKeyDown={(e) => {
                          if (!clickable) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSegmentClick(e);
                          }
                        }}
                        aria-label={`${seg.label}: ${seg.valueText}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content
          side='top'
          size='medium'
          variant='light'
          className='z-[260] max-w-[300px] p-3'
        >
          <StackedChartTooltipBody
            categoryLabel={categoryText || 'Category'}
            totalText={totalText}
            segments={segments}
          />
        </Tooltip.Content>
      </Tooltip.Root>
    );
  };

  return (
    <Tooltip.Provider delayDuration={200} skipDelayDuration={250}>
      <div className={cn('flex w-full gap-2', hasLegendBelow && 'mb-4')}>
        <div
          className={cn(
            'flex shrink-0 flex-col justify-between py-0.5 font-medium text-text-sub-500',
            isDashboard ? 'w-7 text-[10px] leading-[14px]' : 'w-[17px] text-[8px] leading-[11px]',
          )}
          style={{ height: barAreaHeight }}
          aria-hidden
        >
          {tickValues.map((tv) => (
            <span key={tv} className={cn('block text-right', isDashboard && 'tabular-nums')}>
              {formatTick(tv, maxVal)}
            </span>
          ))}
        </div>
        <div
          className='relative flex min-w-0 flex-1 flex-col overflow-hidden'
          style={{ paddingLeft: edgePadding }}
        >
          <div
            className='pointer-events-none absolute right-0 top-0'
            style={{ left: edgePadding, height: barAreaHeight }}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className='absolute left-0 right-0 border-t border-stroke-soft-200/90'
                style={{ top: `${(i * 100) / 4}%` }}
              />
            ))}
            {labels.map((label, idx) => {
              const total = typeof totals[idx] === 'number' ? totals[idx] : 0;
              const totalPct = maxVal > 0 ? (total / maxVal) * 100 : 0;
              const categoryText = String(categoryLabels?.[idx] ?? label ?? '');
              const axisLabel = String(label ?? '');
              const formatMetric = (value) =>
                typeof formatValue === 'function'
                  ? formatValue(value)
                  : formatTooltipMetric(value, maxVal);
              const totalText = formatMetric(total);

              const segments = groups.map((g, gi) => {
                const displayValue = typeof g.data[idx] === 'number' ? g.data[idx] : 0;
                const tooltipValue =
                  typeof g.tooltipData?.[idx] === 'number' ? g.tooltipData[idx] : displayValue;
                return {
                  label: g.label,
                  color: g.color || CHART_GROUP_COLORS[gi % CHART_GROUP_COLORS.length],
                  value: displayValue,
                  valueText: formatMetric(tooltipValue),
                };
              });

              const visibleSegments = segments.filter((s) => s.value > 0);

              const handleActivate = () => {
                if (!clickable) return;
                onCategoryClick({ index: idx, label: categoryText, value: total });
              };

              return (
                <Tooltip.Root key={`stacked-bar-${idx}`}>
                  <Tooltip.Trigger asChild>
                    <div
                      role={clickable ? 'button' : 'presentation'}
                      tabIndex={clickable ? 0 : undefined}
                      data-devx-dashboard-no-drag={clickable ? true : undefined}
                      className={cn(
                        'flex h-full flex-1 flex-col items-center gap-0.5 outline-none',
                        barMinWidthPx ? 'shrink-0' : 'min-w-[32px]',
                        clickable
                          ? 'cursor-pointer rounded-md focus-visible:ring-2 focus-visible:ring-primary-base/40'
                          : 'cursor-default',
                      )}
                      style={
                        barMinWidthPx ? { minWidth: barMinWidthPx, flex: '0 0 auto' } : undefined
                      }
                      onClick={handleActivate}
                      onKeyDown={(event) => {
                        if (!clickable) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleActivate();
                        }
                      }}
                    >
                      {showDataLabels && total > 0 ? (
                        <span className='text-[9px] font-semibold leading-none tabular-nums text-text-sub-600'>
                          {totalText}
                        </span>
                      ) : (
                        <span className='h-[9px]' aria-hidden />
                      )}
                      <div className='flex min-h-0 w-full min-w-[28px] max-w-[48px] flex-1 flex-col justify-end px-1'>
                        <div
                          className='flex min-h-0 w-full flex-1 flex-col justify-end overflow-hidden rounded-t-[4px]'
                          style={{ backgroundColor: TRACK_COLOR }}
                        >
                          <div
                            className='flex w-full flex-col justify-end overflow-hidden rounded-t-[4px]'
                            style={{
                              height: `${totalPct}%`,
                              minHeight: total > 0 ? 2 : 0,
                            }}
                          >
                            {visibleSegments.map((seg, segIndex) => {
                              const handleSegmentClick = (e) => {
                                if (!clickable) return;
                                e.stopPropagation();
                                onCategoryClick({
                                  index: idx,
                                  label: categoryText,
                                  value: seg.value,
                                  groupValue: seg.label,
                                });
                              };

                              return (
                                <div
                                  key={`${seg.label}|${segIndex}`}
                                  role={clickable ? 'button' : 'presentation'}
                                  tabIndex={clickable ? 0 : undefined}
                                  className={cn(
                                    'w-full shrink-0',
                                    clickable &&
                                      'cursor-pointer hover:brightness-110 transition-all',
                                  )}
                                  style={{
                                    flex: `${seg.value} 0 0`,
                                    minHeight: 2,
                                    backgroundColor: seg.color,
                                  }}
                                  onClick={handleSegmentClick}
                                  onKeyDown={(e) => {
                                    if (!clickable) return;
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      handleSegmentClick(e);
                                    }
                                  }}
                                  aria-label={`${seg.label}: ${seg.valueText}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <p
                        className='shrink-0 max-w-[72px] overflow-hidden text-ellipsis whitespace-nowrap text-center text-[8px] font-medium leading-[12px] text-text-sub-500'
                        title={axisLabel}
                      >
                        {truncateLabel(axisLabel, 14)}
                      </p>
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content
                    side='top'
                    size='medium'
                    variant='light'
                    className='z-[260] max-w-[300px] p-3'
                  >
                    <StackedChartTooltipBody
                      categoryLabel={categoryText || 'Category'}
                      totalText={totalText}
                      segments={segments}
                    />
                  </Tooltip.Content>
                </Tooltip.Root>
              );
            })}
          </div>
          <VerticalBarColumnsRow
            labels={labels}
            compactBars={compactBars}
            barGap={barGap}
            className={cn('overflow-hidden', !isDashboard && 'py-1 pr-1')}
            style={{ height: barAreaHeight }}
          >
            {(label, idx) => renderStackedBar(label, idx)}
          </VerticalBarColumnsRow>
          <VerticalBarColumnsRow
            labels={labels}
            compactBars={compactBars}
            barGap={barGap}
            className='shrink-0 overflow-visible'
            style={{ height: labelRowHeight }}
          >
            {(label, idx) => {
              const categoryText = String(label ?? '');
              return (
                <div
                  key={`stacked-xlabel-${idx}`}
                  className={cn(compactBars ? 'shrink-0' : 'min-w-0')}
                  style={{ ...columnStyle, height: labelRowHeight }}
                >
                  <VerticalBarXAxisLabel
                    categoryText={categoryText}
                    autoRotate={autoRotate}
                    isDashboard={isDashboard}
                    label={label}
                    visible={idx % labelStride === 0 || idx === labels.length - 1}
                  />
                </div>
              );
            }}
          </VerticalBarColumnsRow>
        </div>
      </div>
    </Tooltip.Provider>
  );
}

/**
 * @param {{ labels: string[], series: number[], donut?: boolean, size?: number, onCategoryClick?: (payload: { index: number, label: string, value: number }) => void, activeFilter?: { index: number, groupValue?: string | null } | null }} props
 */
export function RadialCategoryChartBlock({
  labels,
  series,
  donut = true,
  size = 200,
  onCategoryClick,
  activeFilter = null,
  hideBuiltInLegend = false,
  showCenterTotal = false,
  showSegmentLabels = false,
  animateSegments = false,
  segmentColors = null,
}) {
  const [cursorTip, setCursorTip] = useState(null);
  const clickable = typeof onCategoryClick === 'function';
  const segmentGap = 0.04;

  const { segments, total } = useMemo(() => {
    const nums = labels.map((_, i) => {
      const n = coerceSeriesNumber(series[i]);
      return Number.isFinite(n) ? n : 0;
    });
    const t = nums.reduce((a, b) => a + Math.abs(b), 0);
    if (t <= 0) {
      return { segments: [], total: 0 };
    }
    let angle = -Math.PI / 2;
    const segs = [];
    const colors = BAR_CATEGORY_COLORS;
    nums.forEach((v, i) => {
      const frac = Math.abs(v) / t;
      if (frac <= 0) return;
      const fullSweep = frac * Math.PI * 2;
      const sweep = Math.max(fullSweep - segmentGap, fullSweep * 0.92);
      const start = angle + segmentGap / 2;
      angle += fullSweep;
      segs.push({
        index: i,
        label: labels[i],
        value: v,
        start,
        sweep,
        color: segmentColors?.[i] ?? colors[i % colors.length],
      });
    });
    return { segments: segs, total: t };
  }, [labels, series]);

  const r = size / 2;
  const cx = r;
  const cy = r;
  const outer = r * 0.92;
  const inner = donut ? r * 0.52 : 0.08;

  const arcPath = (start, sweep, radius) => {
    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(start + sweep);
    const y2 = cy + radius * Math.sin(start + sweep);
    const large = sweep > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
  };

  /** Polygon hit mask per wedge — samples arc at every ~10° so large segments are fully covered. */
  const sectorClipPath = (start, sweep, innerR, outerR) => {
    const steps = Math.max(4, Math.ceil(Math.abs(sweep) / (Math.PI / 18)));
    const outerPts = Array.from({ length: steps + 1 }, (_, k) => {
      const a = start + (sweep * k) / steps;
      return [cx + outerR * Math.cos(a), cy + outerR * Math.sin(a)];
    });
    const innerPts =
      innerR < 1e-6
        ? [[cx, cy]]
        : Array.from({ length: steps + 1 }, (_, k) => {
            const a = start + sweep - (sweep * k) / steps;
            return [cx + innerR * Math.cos(a), cy + innerR * Math.sin(a)];
          });
    const pts = [...outerPts, ...innerPts];
    return `polygon(${pts.map(([x, y]) => `${(x / size) * 100}% ${(y / size) * 100}%`).join(', ')})`;
  };

  if (segments.length === 0) {
    return <p className='paragraph-sm text-text-sub-500'>No numeric values for this chart.</p>;
  }

  return (
    <div className={cn('flex w-full flex-col items-center', hideBuiltInLegend ? 'gap-0' : 'gap-3')}>
      <div
        className={cn(
          'relative shrink-0 transition-all duration-500 ease-out',
          animateSegments && 'devx-chart-segment-animate',
        )}
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className='pointer-events-none absolute inset-0 shrink-0'
          aria-hidden
        >
          {segments.map((s, i) => {
            const isActive = isDrillDownSegmentActive(activeFilter, { index: s.index });
            return (
              <path
                key={`vis-${s.label}|${i}`}
                d={arcPath(s.start, s.sweep, outer)}
                fill={s.color}
                opacity={activeFilter ? (isActive ? 0.95 : 0.28) : 0.92}
                className='transition-all duration-500 ease-out'
              />
            );
          })}
          {donut ? (
            <circle
              cx={cx}
              cy={cy}
              r={inner}
              fill='var(--bg-white-0, #fff)'
              className='fill-bg-white-0'
            />
          ) : null}
          {showSegmentLabels
            ? segments.map((s, i) => {
                if (s.sweep < 0.15) return null;
                const mid = s.start + s.sweep / 2;
                const labelR = (inner + outer) / 2;
                const lx = cx + labelR * Math.cos(mid);
                const ly = cy + labelR * Math.sin(mid);
                return (
                  <text
                    key={`pct-${s.label}|${i}`}
                    x={lx}
                    y={ly}
                    textAnchor='middle'
                    dominantBaseline='middle'
                    fill='#141414'
                    stroke='#ffffff'
                    strokeWidth='0.6'
                    paintOrder='stroke'
                    style={{ fontSize: Math.max(9, size * 0.048), fontWeight: 600 }}
                  >
                    {formatChartPercent(s.value, total)}
                  </text>
                );
              })
            : null}
        </svg>
        {showCenterTotal && donut ? (
          <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center'>
            <span className='text-[24px] font-medium leading-8 tracking-[-0.36px] text-text-strong-950'>
              {formatChartMetric(total)}
            </span>
          </div>
        ) : null}
        {segments.map((s, i) => {
          const category = String(s.label ?? 'Category');
          const valueText = formatTooltipMetric(s.value, total);
          const clip = sectorClipPath(s.start, s.sweep, inner, outer);
          const handleActivate = () => {
            if (!clickable) return;
            onCategoryClick({ index: s.index, label: category, value: s.value });
          };
          return (
            <div
              key={`hit-${s.label}|${i}`}
              role={clickable ? 'button' : 'presentation'}
              tabIndex={clickable ? 0 : undefined}
              data-devx-dashboard-no-drag={clickable ? true : undefined}
              className={cn(
                'absolute inset-0 z-[1] outline-none',
                clickable
                  ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-base/40'
                  : 'cursor-default',
              )}
              style={{ clipPath: clip }}
              onClick={handleActivate}
              onKeyDown={(event) => {
                if (!clickable) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleActivate();
                }
              }}
              onPointerEnter={(e) => {
                if (!e.isPrimary) return;
                const { left, top, transform } = chartCursorTooltipPosition(e.clientX, e.clientY);
                setCursorTip({ category, valueText, left, top, transform });
              }}
              onPointerMove={(e) => {
                if (!e.isPrimary) return;
                const { left, top, transform } = chartCursorTooltipPosition(e.clientX, e.clientY);
                setCursorTip((prev) =>
                  prev && prev.category === category && prev.valueText === valueText
                    ? { ...prev, left, top, transform }
                    : { category, valueText, left, top, transform },
                );
              }}
              onPointerLeave={(e) => {
                if (!e.isPrimary) return;
                setCursorTip((prev) =>
                  prev && prev.category === category && prev.valueText === valueText ? null : prev,
                );
              }}
            />
          );
        })}
      </div>
      {cursorTip && typeof document !== 'undefined'
        ? createPortal(
            <div
              className='pointer-events-none fixed z-[60] max-w-[260px] rounded-md bg-bg-strong-950 px-2.5 py-1 text-paragraph-sm shadow-tooltip'
              style={{
                left: cursorTip.left,
                top: cursorTip.top,
                transform: cursorTip.transform,
              }}
              aria-hidden
            >
              <ChartTooltipBody
                categoryLabel={cursorTip.category}
                valueText={cursorTip.valueText}
                valueDescription='Value'
              />
            </div>,
            document.body,
          )
        : null}
      {!hideBuiltInLegend ? (
        <div className='flex w-full max-w-[312px] items-start justify-between gap-4'>
          <ul className='flex flex-col gap-[18px] text-[12px] font-medium leading-[1.3] text-text-sub-500'>
            {segments.slice(0, Math.ceil(segments.length / 2)).map((s, i) => {
              const category = String(s.label ?? 'Category');
              return (
                <li key={`leg-l-${s.label}|${i}`} className='flex items-center gap-2'>
                  <span
                    className='inline-block size-4 shrink-0 rounded-[5px]'
                    style={{ backgroundColor: s.color }}
                    aria-hidden
                  />
                  <span className='truncate'>
                    {truncateLabel(category, 16)} {formatChartPercent(s.value, total)}
                  </span>
                </li>
              );
            })}
          </ul>
          <ul className='flex flex-col gap-4 text-[12px] font-medium leading-[1.3] text-text-sub-500'>
            {segments.slice(Math.ceil(segments.length / 2)).map((s, i) => {
              const category = String(s.label ?? 'Category');
              return (
                <li key={`leg-r-${s.label}|${i}`} className='flex items-center gap-2'>
                  <span
                    className='inline-block size-4 shrink-0 rounded-[5px]'
                    style={{ backgroundColor: s.color }}
                    aria-hidden
                  />
                  <span className='truncate'>
                    {truncateLabel(category, 16)} {formatChartPercent(s.value, total)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Width:height target for line plot (wider cards get taller plots, clamped). */
const LINE_PLOT_WIDTH_TO_HEIGHT = 2.05;
const LINE_PLOT_MIN_H = 200;
const LINE_PLOT_MAX_H = 340;

/**
 * Full-width line chart with Y ticks, horizontal grid, and X labels (aligned with bar chart layout).
 * @param {{
 *   labels: string[],
 *   series: number[],
 *   maxVal: number,
 *   tickValues: number[],
 *   plotHeightPx?: number,
 *   onCategoryClick?: (payload: { index: number, label: string, value: number }) => void,
 * }} props plotHeightPx — min height / initial height; plot also grows with card width (aspect clamped)
 */
export function LineChartBlock({
  labels,
  series,
  maxVal,
  tickValues,
  plotHeightPx = 220,
  onCategoryClick,
  groups = null,
  displayAsStackedArea = false,
  lineColors = null,
  hideInlineLegend = false,
}) {
  const measureRef = useRef(null);
  const clickable = typeof onCategoryClick === 'function';
  const [plotH, setPlotH] = useState(() =>
    Math.min(LINE_PLOT_MAX_H, Math.max(LINE_PLOT_MIN_H, plotHeightPx)),
  );

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      const fromAspect = Math.round(w / LINE_PLOT_WIDTH_TO_HEIGHT);
      const h = Math.min(
        LINE_PLOT_MAX_H,
        Math.max(LINE_PLOT_MIN_H, Math.max(plotHeightPx, fromAspect)),
      );
      setPlotH(h);
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [plotHeightPx]);

  const resolvedGroups = useMemo(() => {
    if (groups?.length) {
      return groups.map((g, i) => ({
        label: g.label,
        color: g.color || lineColors?.[i] || CHART_GROUP_COLORS[i % CHART_GROUP_COLORS.length],
        data: g.data ?? [],
      }));
    }
    return [
      {
        label: 'Series',
        color: lineColors?.[0] ?? BAR_COLOR,
        data: labels.map((_, i) => {
          const n = coerceSeriesNumber(series[i]);
          return Number.isFinite(n) ? n : 0;
        }),
      },
    ];
  }, [groups, labels, series, lineColors]);

  const scaleMax = maxVal > 0 ? maxVal : 1;
  const n = Math.max(labels.length, 1);
  const showEveryN =
    labels.length > 20 ? Math.ceil(labels.length / 10) : labels.length > 10 ? 2 : 1;

  const viewBoxW = 100;
  const viewBoxH = 100;
  const padX = 2;
  const padY = 4;
  const innerW = viewBoxW - padX * 2;
  const innerH = viewBoxH - padY * 2;

  const groupCoords = useMemo(() => {
    return resolvedGroups.map((group) =>
      group.data.map((v, i) => {
        const x = padX + innerW * (n <= 1 ? 0.5 : i / (n - 1));
        const y = padY + innerH * (1 - (Math.abs(v) / scaleMax || 0));
        return { x, y, v };
      }),
    );
  }, [resolvedGroups, n, innerW, innerH, scaleMax]);

  const stackedGroupCoords = useMemo(() => {
    if (!displayAsStackedArea || resolvedGroups.length === 0) return null;
    const pointCount = Math.max(labels.length, 1);
    const cumSums = Array.from({ length: pointCount }, () => 0);
    return resolvedGroups.map((group) => {
      const bottomY = cumSums.map((cum) => padY + innerH * (1 - cum / scaleMax));
      group.data.forEach((v, i) => {
        cumSums[i] += Math.abs(v) || 0;
      });
      const topY = cumSums.map((cum) => padY + innerH * (1 - cum / scaleMax));
      return group.data.map((v, i) => ({
        x: padX + innerW * (pointCount <= 1 ? 0.5 : i / (pointCount - 1)),
        yTop: topY[i],
        yBottom: bottomY[i],
        v,
      }));
    });
  }, [displayAsStackedArea, resolvedGroups, labels.length, innerW, innerH, scaleMax, padX, padY]);

  const stackedAreaPaths = useMemo(() => {
    if (!displayAsStackedArea || !stackedGroupCoords) return [];
    return stackedGroupCoords.map((coords) => {
      if (coords.length === 0) return '';
      const topPts = coords.map((p) => `${p.x},${p.yTop}`).join(' L ');
      const bottomPts = [...coords]
        .reverse()
        .map((p) => `${p.x},${p.yBottom}`)
        .join(' L ');
      return `M ${coords[0].x},${coords[0].yTop} L ${topPts} L ${bottomPts} Z`;
    });
  }, [displayAsStackedArea, stackedGroupCoords]);

  return (
    <Tooltip.Provider delayDuration={200} skipDelayDuration={250}>
      <div className='flex w-full gap-3'>
        <div
          className='flex w-6 shrink-0 flex-col justify-between py-0.5 text-[14px] font-medium leading-5 tracking-[-0.084px] text-text-sub-500'
          style={{ height: plotH }}
          aria-hidden
        >
          {tickValues.map((tv) => (
            <span key={tv} className='block text-right tabular-nums'>
              {formatTick(tv, maxVal)}
            </span>
          ))}
        </div>
        <div ref={measureRef} className='flex min-w-0 flex-1 flex-col'>
          <div className='relative w-full' style={{ height: plotH }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className='pointer-events-none absolute left-0 right-0 border-t border-stroke-soft-200/90'
                style={{ top: `${(i * 100) / 4}%` }}
              />
            ))}
            <div className='relative z-[1] h-full w-full'>
              <svg
                width='100%'
                height='100%'
                viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
                preserveAspectRatio='none'
                className='pointer-events-none absolute inset-0 block overflow-visible'
                aria-hidden
              >
                {displayAsStackedArea
                  ? stackedAreaPaths.map((path, i) => (
                      <path
                        key={`area-${i}`}
                        d={path}
                        fill={resolvedGroups[i].color}
                        fillOpacity={0.35}
                      />
                    ))
                  : null}
                {groupCoords.map((coords, groupIndex) => {
                  const linePoints = displayAsStackedArea
                    ? stackedGroupCoords?.[groupIndex]?.map((p) => `${p.x},${p.yTop}`)
                    : coords.map((p) => `${p.x},${p.y}`);
                  return (
                    <polyline
                      key={`line-${groupIndex}`}
                      fill='none'
                      stroke={resolvedGroups[groupIndex].color}
                      strokeWidth='2'
                      vectorEffect='non-scaling-stroke'
                      strokeLinejoin='round'
                      strokeLinecap='round'
                      points={linePoints?.join(' ') ?? ''}
                    />
                  );
                })}
              </svg>
              {resolvedGroups.flatMap((group, groupIdx) => {
                const coords = displayAsStackedArea
                  ? stackedGroupCoords?.[groupIdx]
                  : groupCoords[groupIdx];
                return (coords ?? []).map((p, i) => {
                  const lab =
                    labels[i] !== undefined && labels[i] !== null && String(labels[i]) !== ''
                      ? String(labels[i])
                      : `Point ${i + 1}`;
                  const tip = `${lab}: ${formatTooltipMetric(p.v, maxVal)}`;
                  const yCoord = displayAsStackedArea ? p.yTop : p.y;
                  const xpct = `${(p.x / viewBoxW) * 100}%`;
                  const ypct = `${(yCoord / viewBoxH) * 100}%`;
                  const handleActivate = () => {
                    if (!clickable || groupIdx !== 0) return;
                    onCategoryClick({ index: i, label: lab, value: p.v });
                  };
                  return (
                    <Tooltip.Root key={`line-tip-${groupIdx}-${lab}|${i}`}>
                      <Tooltip.Trigger asChild>
                        <button
                          type='button'
                          className={cn(
                            'absolute z-[2] flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center',
                            'rounded-full border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-primary-base',
                            clickable && groupIdx === 0 ? 'cursor-pointer' : 'cursor-default',
                          )}
                          style={{ left: xpct, top: ypct }}
                          aria-label={tip}
                          tabIndex={clickable && groupIdx === 0 ? 0 : -1}
                          data-devx-dashboard-no-drag={
                            clickable && groupIdx === 0 ? true : undefined
                          }
                          onClick={handleActivate}
                        >
                          <span
                            className='size-2.5 shrink-0 rounded-full ring-2 ring-bg-white-0'
                            style={{ backgroundColor: group.color }}
                            aria-hidden
                          />
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Content side='top' size='small' className='max-w-[260px]'>
                        <ChartTooltipBody
                          categoryLabel={lab || 'Category'}
                          valueText={formatTooltipMetric(p.v, maxVal)}
                          valueDescription={resolvedGroups.length > 1 ? group.label : 'Value'}
                        />
                      </Tooltip.Content>
                    </Tooltip.Root>
                  );
                });
              })}
            </div>
          </div>
          <div className='mt-3 flex w-full justify-between gap-1 px-0.5 pb-0.5'>
            {labels.map((label, idx) => {
              const showLabel = idx % showEveryN === 0 || idx === labels.length - 1;
              return (
                <p
                  key={`x-${idx}`}
                  className={cn(
                    'min-w-0 flex-1 text-center font-medium text-text-sub-500',
                    labels.length > 10
                      ? 'text-[11px] leading-4'
                      : 'text-[14px] leading-5 tracking-[-0.084px]',
                    !showLabel && 'invisible',
                  )}
                  title={String(label ?? '')}
                  aria-hidden={!showLabel}
                >
                  {truncateLabel(label, labels.length > 10 ? 8 : 11)}
                </p>
              );
            })}
          </div>
          {!hideInlineLegend && resolvedGroups.length > 1 ? (
            <div className='mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2'>
              {resolvedGroups.map((group) => (
                <div
                  key={group.label}
                  className='flex items-center gap-2 text-[12px] text-text-sub-500'
                >
                  <span
                    className='inline-block size-4 rounded-[5px]'
                    style={{ backgroundColor: group.color }}
                    aria-hidden
                  />
                  <span>{group.label}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Tooltip.Provider>
  );
}

/**
 * Minimal sparkline (fixed aspect); prefer {@link LineChartBlock} in cards for axes and labels.
 * @param {{ labels: string[], series: number[], heightPx?: number }} props
 */
export function SparklineChartBlock({ labels, series, heightPx = 120 }) {
  const { points, maxVal } = useMemo(() => {
    const nums = labels.map((_, i) => {
      const n = coerceSeriesNumber(series[i]);
      return Number.isFinite(n) ? n : 0;
    });
    const m = nums.length > 0 ? Math.max(...nums.map((n) => Math.abs(n)), 1e-6) : 1;
    return { points: nums, maxVal: niceCeil(m) };
  }, [labels, series]);

  const w = 320;
  const h = heightPx;
  const pad = 8;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const n = Math.max(points.length, 1);
  const coords = points.map((v, i) => {
    const x = pad + innerW * (n <= 1 ? 0.5 : i / (n - 1));
    const y = pad + innerH * (1 - (Math.abs(v) / maxVal || 0));
    return `${x},${y}`;
  });
  const poly = coords.join(' ');

  return (
    <div className='w-full overflow-x-auto'>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className='min-w-[280px] max-w-full'>
        <polyline
          fill='none'
          stroke={BAR_COLOR}
          strokeWidth='2'
          strokeLinejoin='round'
          strokeLinecap='round'
          points={poly}
          className='pointer-events-none'
        />
        {points.map((v, i) => {
          const x = pad + innerW * (n <= 1 ? 0.5 : i / (n - 1));
          const y = pad + innerH * (1 - (Math.abs(v) / maxVal || 0));
          const lab =
            labels[i] !== undefined && labels[i] !== null && String(labels[i]) !== ''
              ? String(labels[i])
              : `Point ${i + 1}`;
          const tip = `${lab}: ${formatTooltipMetric(v, maxVal)}`;
          return (
            <g key={`${lab}|${i}`}>
              <circle cx={x} cy={y} r='12' fill='transparent' className='cursor-default'>
                <title>{tip}</title>
              </circle>
              <circle cx={x} cy={y} r='3.5' fill={BAR_COLOR} pointerEvents='none' />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Per-cell intensity t ∈ [0,1] → background + foreground for readable labels. */
function heatmapCellColors(t) {
  const x = Math.max(0, Math.min(1, t));
  const h = 232;
  const s = 6 + 78 * x;
  const l = 97 - 58 * x;
  const bg = `hsl(${h} ${Math.round(s)}% ${Math.round(l)}%)`;
  const fg = x > 0.58 ? 'rgb(248 250 252)' : 'rgb(15 23 42)';
  return { bg, fg };
}

const HEATMAP_LEGEND_GRADIENT =
  'linear-gradient(90deg, hsl(232 8% 97%) 0%, hsl(232 42% 72%) 42%, hsl(232 72% 48%) 72%, hsl(232 82% 28%) 100%)';

/**
 * @param {{ rawRows: Record<string, unknown>[] }} props
 */
export function HeatmapBlock({ rawRows }) {
  const model = useMemo(() => {
    if (!rawRows || rawRows.length === 0) return null;
    const keys = Object.keys(rawRows[0]);
    const labelKey =
      keys.find(
        (k) =>
          !rawRows.every(
            (r) => typeof r[k] === 'number' && r[k] !== null && !Number.isNaN(Number(r[k])),
          ),
      ) ?? keys[0];
    const metricKeys = keys.filter(
      (k) =>
        k !== labelKey &&
        rawRows.some((r) => {
          const v = r[k];
          return typeof v === 'number' && !Number.isNaN(v);
        }),
    );
    if (metricKeys.length === 0) return null;
    const colMins = {};
    const colMaxs = {};
    for (const mk of metricKeys) {
      const vals = rawRows.map((r) => Number(r[mk]) || 0);
      colMins[mk] = Math.min(...vals);
      colMaxs[mk] = Math.max(...vals);
    }
    return { labelKey, metricKeys, colMins, colMaxs };
  }, [rawRows]);

  if (!model) {
    return (
      <p className='paragraph-sm text-text-sub-500'>Not enough numeric columns for a heatmap.</p>
    );
  }

  const { labelKey, metricKeys, colMins, colMaxs } = model;
  const maxRows = 24;
  const rows = rawRows.slice(0, maxRows);
  const labelHeader = humanizeKey(labelKey);
  const gridTemplateColumns = `minmax(7.5rem, 1.35fr) repeat(${metricKeys.length}, minmax(2.75rem, 1fr))`;

  return (
    <div
      className={cn(
        'flex w-full max-w-full flex-col gap-3 rounded-2xl border border-stroke-soft-200/90',
        'bg-gradient-to-b from-bg-white-0 via-violet-50/[0.12] to-slate-50/35 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]',
      )}
    >
      <div className='min-h-0 w-full max-h-[min(360px,52vh)] overflow-auto'>
        <div
          className='grid w-full min-w-[min(100%,280px)] gap-x-2 gap-y-1.5'
          style={{ gridTemplateColumns }}
        >
          <div
            className='sticky left-0 z-[1] flex min-h-[2.75rem] items-end justify-end rounded-lg bg-bg-white-0/95 px-1 pb-1 pt-2 shadow-[2px_0_8px_-4px_rgba(15,23,42,0.12)]'
            title={labelHeader}
          >
            <span className='line-clamp-2 max-w-full text-right text-[9px] font-semibold uppercase leading-tight tracking-wide text-text-sub-500'>
              {labelHeader}
            </span>
          </div>

          {metricKeys.map((mk) => (
            <div
              key={mk}
              className='flex min-h-[2.75rem] items-end justify-center px-0.5 pb-1 pt-2 text-center'
              title={humanizeKey(mk)}
            >
              <span className='line-clamp-2 max-w-full text-[9px] font-semibold uppercase leading-tight tracking-wide text-text-sub-500'>
                {humanizeKey(mk)}
              </span>
            </div>
          ))}

          {rows.map((row) => {
            const rk = String(
              Object.entries(row)
                .map(([k, v]) => `${k}:${String(v)}`)
                .join('|'),
            );
            return (
              <div key={rk} className='contents'>
                <div
                  className='sticky left-0 z-[1] flex min-h-[2.75rem] max-w-[11rem] items-center justify-end gap-1 rounded-lg bg-bg-white-0/95 py-1 pl-1 pr-2 shadow-[4px_0_12px_-6px_rgba(15,23,42,0.14)]'
                  title={String(row[labelKey])}
                >
                  <span className='truncate text-right text-[11px] font-medium leading-snug text-text-main-900'>
                    {truncateLabel(row[labelKey], 22)}
                  </span>
                </div>
                {metricKeys.map((mk) => {
                  const v = Number(row[mk]) || 0;
                  const lo = colMins[mk];
                  const hi = colMaxs[mk];
                  const t = hi > lo ? (v - lo) / (hi - lo) : 0.5;
                  const { bg, fg } = heatmapCellColors(t);
                  const rowLabel = String(row[labelKey]);
                  const colLabel = humanizeKey(mk);
                  const cellTip = `${rowLabel} — ${colLabel}: ${formatTooltipMetric(v, hi)}`;
                  return (
                    <div
                      key={`${rk}|${mk}`}
                      className={cn(
                        'flex min-h-[2.75rem] cursor-default items-center justify-center rounded-xl px-1 py-1',
                        'text-[11px] font-semibold tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]',
                        'ring-1 ring-inset ring-black/[0.04] transition-[transform,box-shadow] duration-150',
                        'hover:z-[2] hover:ring-black/[0.08] hover:shadow-md',
                      )}
                      style={{ backgroundColor: bg, color: fg }}
                      title={cellTip}
                    >
                      {formatTick(v, hi)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-stroke-soft-200/60 pt-2'>
        <span className='shrink-0 text-[10px] font-medium text-text-sub-500'>Intensity</span>
        <div className='flex min-w-0 flex-1 items-center gap-2 sm:max-w-[220px]'>
          <span className='shrink-0 text-[9px] tabular-nums text-text-sub-400'>Low</span>
          <div
            className='h-2.5 min-w-[100px] flex-1 rounded-full shadow-inner ring-1 ring-inset ring-stroke-soft-200/80'
            style={{ background: HEATMAP_LEGEND_GRADIENT }}
            title='Relative intensity within each metric column'
          />
          <span className='shrink-0 text-[9px] tabular-nums text-text-sub-400'>High</span>
        </div>
        <span className='text-[9px] leading-tight text-text-sub-400'>Scaled per metric</span>
      </div>
    </div>
  );
}

function humanizeKey(k) {
  return String(k ?? '')
    .replaceAll('_', ' ')
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * @param {{ rawRows: Record<string, unknown>[] }} props
 */
export function CompareTileBlock({ rawRows }) {
  const pair = useMemo(() => {
    if (!rawRows || rawRows.length === 0) return null;
    const keys = Object.keys(rawRows[0]);
    const nums = keys.filter((k) =>
      rawRows.some((r) => typeof r[k] === 'number' && !Number.isNaN(Number(r[k]))),
    );
    const pick = (re) => nums.find((n) => re.test(n));
    const a = pick(/collect|revenue|income|amount/i) ?? nums[0];
    const b = pick(/opex|cost|expense|spend/i) ?? nums.find((n) => n !== a) ?? nums[1];
    if (!a || !b || a === b) return null;
    const sumA = rawRows.reduce((s, r) => s + (Number(r[a]) || 0), 0);
    const sumB = rawRows.reduce((s, r) => s + (Number(r[b]) || 0), 0);
    return [
      { key: a, label: humanizeKey(a), value: sumA },
      { key: b, label: humanizeKey(b), value: sumB },
    ];
  }, [rawRows]);

  if (!pair) {
    return (
      <p className='paragraph-sm text-text-sub-500'>
        Compare view needs two numeric metrics in the data.
      </p>
    );
  }

  return (
    <div className='grid w-full grid-cols-2 gap-2'>
      {pair.map((p) => (
        <div
          key={p.key}
          title={`${p.label}: ${formatTooltipMetric(p.value, p.value)}`}
          className={cn(
            'flex cursor-default flex-col gap-1 rounded-xl border border-stroke-soft-200 bg-bg-weak-50/60',
            'px-3 py-3 shadow-[0_1px_2px_0_rgba(228,229,231,0.24)]',
          )}
        >
          <p className='text-[10px] font-medium leading-3 text-text-sub-500'>{p.label}</p>
          <p className='text-[16px] font-semibold leading-5 text-text-main-900'>
            {formatTick(p.value, p.value)}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Percentage label for battery legend (whole numbers, matches Figma). */
function formatBatteryLegendPercent(value, total) {
  if (typeof value !== 'number' || typeof total !== 'number' || total <= 0) return '0%';
  return `${Math.round((Math.abs(value) / total) * 100)}%`;
}

/** Value label for battery legend — compact axis-style for large numbers. */
function formatBatteryLegendValue(value, scaleMax) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  if (Math.abs(value) >= 1e5 || Math.abs(scaleMax) >= 1e5) {
    return formatTick(value, scaleMax);
  }
  return formatChartMetric(value);
}

/**
 * Horizontal 100% stacked "battery" bar with axis ticks and legend (Figma-aligned).
 * @see https://www.figma.com/design/N7uPdjh9Xu1xBqtjByfx3T/DevX---Final?node-id=35789-243588
 */
export function BatteryChartBlock({
  labels,
  series,
  segmentColors = null,
  displayAs100Stacked = false,
  hideLegend = false,
}) {
  const { segments, total } = useMemo(() => {
    const nums = labels.map((_, i) => {
      const n = coerceSeriesNumber(series[i]);
      return Number.isFinite(n) ? Math.abs(n) : 0;
    });
    const t = nums.reduce((a, b) => a + b, 0);
    if (t <= 0) return { segments: [], total: 0 };

    const colors = segmentColors ?? BATTERY_COLORS;
    const segs = nums.map((value, i) => ({
      label: labels[i],
      value,
      sharePct: (value / t) * 100,
      color: colors[i % colors.length],
    }));
    return { segments: segs, total: t };
  }, [labels, series, segmentColors]);

  if (segments.length === 0) {
    return <p className='paragraph-sm text-text-sub-500'>No numeric values for this chart.</p>;
  }

  const maxDisplay = displayAs100Stacked ? 100 : total;
  const tickCount = 10;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) =>
    displayAs100Stacked ? i * 10 : (maxDisplay / tickCount) * i,
  );

  const formatAxisTick = (tick) =>
    displayAs100Stacked ? `${tick}%` : formatTick(tick, maxDisplay);

  return (
    <div className='mx-auto flex w-full max-w-[528px] flex-col items-center px-5 py-6'>
      <div className='relative w-full'>
        <div className='relative h-[47px] w-full'>
          <div className='pointer-events-none absolute inset-0 flex' aria-hidden>
            {ticks.map((tick) => (
              <div key={`grid-${tick}`} className='flex flex-1 justify-center'>
                <div className='h-full w-px bg-stroke-soft-200' />
              </div>
            ))}
          </div>
          <div className='relative flex h-full w-full'>
            {segments.map((seg, i) => {
              const valueText = displayAs100Stacked
                ? formatBatteryLegendPercent(seg.value, total)
                : formatBatteryLegendValue(seg.value, total);
              return (
                <Tooltip.Root key={`seg-${seg.label}|${i}`}>
                  <Tooltip.Trigger asChild>
                    <div
                      className='h-full transition-[width] duration-500 ease-out'
                      style={{
                        width: `${seg.sharePct}%`,
                        backgroundColor: seg.color,
                        minWidth: seg.value > 0 ? 1 : 0,
                      }}
                    />
                  </Tooltip.Trigger>
                  <Tooltip.Content side='top' size='small' className='max-w-[260px]'>
                    <ChartTooltipBody
                      categoryLabel={seg.label || 'Category'}
                      valueText={valueText}
                      valueDescription={displayAs100Stacked ? 'Share' : 'Value'}
                    />
                  </Tooltip.Content>
                </Tooltip.Root>
              );
            })}
          </div>
        </div>

        <div className='mt-4 flex w-full'>
          {ticks.map((tick) => (
            <p
              key={tick}
              className='min-w-0 flex-1 text-center text-[11px] font-medium leading-[14px] text-text-sub-500 tabular-nums'
            >
              {formatAxisTick(tick)}
            </p>
          ))}
        </div>
      </div>

      {!hideLegend ? (
        <div className='mt-8 flex w-full flex-wrap items-start justify-center gap-x-[11px] gap-y-2'>
          {segments.map((seg, i) => (
            <div
              key={`leg-${seg.label}|${i}`}
              className='flex shrink-0 items-center gap-[8.5px] rounded-[11px]'
            >
              <span
                className='inline-block size-[17px] shrink-0 rounded-[6px]'
                style={{ backgroundColor: seg.color }}
                aria-hidden
              />
              <p className='whitespace-nowrap text-[14px] font-medium leading-[1.3] text-text-sub-500'>
                {seg.label}{' '}
                {displayAs100Stacked
                  ? formatBatteryLegendPercent(seg.value, total)
                  : `${formatBatteryLegendPercent(seg.value, total)} · ${formatBatteryLegendValue(seg.value, total)}`}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * @param {{
 *   rawRows: Record<string, unknown>[],
 *   series: number[],
 *   kpi?: { value?: number, formatted_value?: string | null, label?: string | null, subtitle?: string | null } | null,
 * }} props
 */
export function KpiTileBlock({ rawRows, series, kpi = null, variant = 'default', title = null }) {
  const text = useMemo(() => {
    if (kpi && (kpi.value != null || kpi.formatted_value != null)) {
      return {
        label: title || kpi.label || 'Value',
        value: kpi.value,
        formatted: kpi.formatted_value,
        subtitle: kpi.subtitle,
      };
    }
    if (Array.isArray(series) && series.length > 0) {
      const nums = series.filter((n) => typeof n === 'number' && !Number.isNaN(n));
      if (nums.length > 0) {
        const v = nums.reduce((a, b) => a + b, 0);
        return { label: title || 'Total (series)', value: v };
      }
    }
    if (!rawRows || rawRows.length === 0) return null;
    const keys = Object.keys(rawRows[0]);
    const nums = keys.filter((k) => rawRows.some((r) => typeof r[k] === 'number'));
    if (nums.length === 0) return null;
    const k = nums[0];
    const v = rawRows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
    return { label: title || humanizeKey(k), value: v };
  }, [rawRows, series, kpi, title]);

  if (!text) {
    return <p className='paragraph-sm text-text-sub-500'>No KPI value available.</p>;
  }

  const displayValue =
    text.formatted != null && text.formatted !== ''
      ? text.formatted
      : formatTick(text.value, text.value);

  if (variant === 'dashboard') {
    return (
      <div
        title={`${text.label}: ${formatTooltipMetric(text.value, text.value)}`}
        className='relative flex h-full w-full cursor-default flex-col justify-center px-5 py-4'
      >
        <div className='flex items-center gap-2'>
          <span
            className='flex size-5 shrink-0 items-center justify-center text-success-base'
            aria-hidden
          >
            <RiGroupLine className='size-5' />
          </span>
          <p className='truncate text-[13px] font-medium uppercase leading-4 tracking-[0.04em] text-text-sub-500'>
            {text.label}
          </p>
        </div>
        <p className='mt-2 text-[28px] font-bold leading-8 text-[#1b2232]'>{displayValue}</p>
        {text.subtitle ? (
          <p className='mt-1 truncate text-[12px] font-medium leading-4 text-text-sub-500'>
            {text.subtitle}
          </p>
        ) : null}
      </div>
    );
  }

  if (variant === 'builder') {
    return (
      <div
        title={`${text.label}: ${formatTooltipMetric(text.value, text.value)}`}
        className='relative flex h-full w-full cursor-default flex-col bg-bg-white-0 px-9 py-6'
      >
        <p className='text-[24px] font-medium leading-8 text-text-strong-950'>{text.label}</p>
        <div className='flex flex-1 items-center justify-center'>
          <p className='text-[106px] font-medium leading-[140px] tracking-[-1.6px] text-black'>
            {displayValue}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      title={`${text.label}: ${formatTooltipMetric(text.value, text.value)}`}
      className={cn(
        'flex w-full cursor-default flex-col items-center justify-center gap-1 rounded-xl border border-stroke-soft-200',
        'bg-gradient-to-b from-[#f7eefe]/80 to-bg-white-0 px-4 py-6 shadow-[0_1px_2px_0_rgba(228,229,231,0.24)]',
      )}
    >
      <p className='text-[11px] font-medium text-text-sub-500'>{text.label}</p>
      {text.subtitle ? <p className='text-[10px] text-text-sub-400'>{text.subtitle}</p> : null}
      <p className='text-[22px] font-bold leading-7 text-text-main-900'>{displayValue}</p>
    </div>
  );
}
