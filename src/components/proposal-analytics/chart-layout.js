/**
 * Fixed Recharts viewport — plot area stays the same pixel box
 * regardless of tick label length, metric, or date-range density.
 */

/** Outer chart host height (px). Same for trend + duration so switching KPIs does not jump. */
export const PROPOSAL_TREND_CHART_HEIGHT = 220;
export const PROPOSAL_DURATION_CHART_HEIGHT = 220;

/**
 * Chart margins (outside axes). Keep identical across metrics/types
 * so the inner plot rectangle never shifts.
 */
export const PROPOSAL_CHART_MARGIN = Object.freeze({
  top: 8,
  right: 12,
  left: 4,
  bottom: 4,
});

/** Reserved Y-axis column — same for visits and duration. */
export const PROPOSAL_CHART_Y_AXIS_WIDTH = 44;

/** Reserved X-axis row. */
export const PROPOSAL_CHART_X_AXIS_HEIGHT = 28;

/** Stable host box for ResponsiveContainer (avoids blank/collapsed plots in modals). */
export function getChartHostStyle(height = PROPOSAL_TREND_CHART_HEIGHT) {
  return {
    width: '100%',
    height,
    minHeight: height,
    minWidth: 0,
    position: 'relative',
  };
}

export const PROPOSAL_CHART_TICK = Object.freeze({
  fill: '#6b7280',
  fontSize: 11,
});

/** Compact count for Y-axis. */
export function formatAxisNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  const abs = Math.abs(num);
  if (abs >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  }
  if (abs >= 1_000) {
    return `${(num / 1_000).toFixed(abs >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k`;
  }
  return String(Math.round(num));
}

/** Compact duration for Y-axis (45s / 12m / 2h). */
export function formatAxisDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value < 60) return `${Math.round(value)}s`;
  if (value < 3600) return `${Math.round(value / 60)}m`;
  const hours = value / 3600;
  return `${hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10}h`.replace(/\.0h$/, 'h');
}

/** Short X-axis date (Jul 20). */
export function formatAxisDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 6);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Short X-axis datetime for visit-duration spikes. */
export function formatAxisDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 8);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
