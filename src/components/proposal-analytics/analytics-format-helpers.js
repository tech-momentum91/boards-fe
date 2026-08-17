export function formatDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return '—';
  if (value < 60) return `${Math.round(value)}s`;
  const mins = Math.floor(value / 60);
  const secs = Math.round(value % 60);
  if (mins < 60) return secs ? `${mins}m ${secs}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins ? `${hours}h ${remMins}m` : `${hours}h`;
}

/** Human-readable duration for chart tooltips, e.g. "1 minute 45.1 seconds". */
export function formatDurationDetailed(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return '—';
  if (value < 60) {
    const rounded = Math.round(value * 10) / 10;
    return `${rounded} second${rounded === 1 ? '' : 's'}`;
  }
  const mins = Math.floor(value / 60);
  const secs = Math.round((value % 60) * 10) / 10;
  const minLabel = `${mins} minute${mins === 1 ? '' : 's'}`;
  if (!secs) return minLabel;
  return `${minLabel} ${secs} second${secs === 1 ? '' : 's'}`;
}

export function formatChartDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatShortDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function formatNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return new Intl.NumberFormat().format(num);
}

export function truncateId(id, size = 10) {
  const value = String(id || '');
  if (value.length <= size) return value || '—';
  return `${value.slice(0, size)}…`;
}

/**
 * Stable display names: Visitor 1, Visitor 2, … ordered by first activity.
 * @param {Array<{ visitor_id: string, first_viewed?: string, last_viewed?: string }>} rows
 * @returns {Map<string, string>}
 */
export function buildVisitorDisplayNames(rows) {
  const byId = new Map();
  asArray(rows).forEach((row) => {
    const id = String(row?.visitor_id || '').trim();
    if (!id) return;
    const stamp = new Date(row.first_viewed || row.last_viewed || 0).getTime();
    const existing = byId.get(id);
    if (!existing || (Number.isFinite(stamp) && stamp < existing.stamp)) {
      byId.set(id, { id, stamp: Number.isFinite(stamp) ? stamp : Number.MAX_SAFE_INTEGER });
    }
  });

  return new Map(
    [...byId.values()]
      .sort((a, b) => a.stamp - b.stamp || a.id.localeCompare(b.id))
      .map((row, index) => [row.id, `Visitor ${index + 1}`]),
  );
}

const VISITOR_SERIES_COLORS = [
  'oklch(0.5862 0.1429 155.15)',
  'oklch(0.55 0.16 250)',
  'oklch(0.62 0.17 35)',
  'oklch(0.58 0.14 300)',
  'oklch(0.65 0.15 85)',
  'oklch(0.52 0.12 200)',
  'oklch(0.60 0.18 20)',
  'oklch(0.50 0.10 140)',
];

export function getVisitorSeriesColor(index) {
  return VISITOR_SERIES_COLORS[index % VISITOR_SERIES_COLORS.length];
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function formatPercent(value, digits = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return `${num.toFixed(digits)}%`;
}

export function averageOfField(rows, field) {
  const list = asArray(rows)
    .map((row) => Number(row?.[field]))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (list.length === 0) return 0;
  return list.reduce((sum, value) => sum + value, 0) / list.length;
}

/** Count distinct visitors with an event in the last `windowMs` (default 5 min). */
export function countLiveVisitors(timeline, windowMs = 5 * 60 * 1000) {
  const cutoff = Date.now() - windowMs;
  const seen = new Set();
  asArray(timeline).forEach((row) => {
    const id = String(row?.visitor_id || '').trim();
    if (!id) return;
    const time = row?.event_time ? new Date(row.event_time).getTime() : Number.NaN;
    if (!Number.isFinite(time) || time < cutoff) return;
    seen.add(id);
  });
  return seen.size;
}

export function isWithinDateRange(value, range) {
  if (!range?.from && !range?.to) return true;
  const time = toComparableTime(value);
  if (!Number.isFinite(time)) return false;
  if (range.from) {
    const from = new Date(range.from);
    from.setHours(0, 0, 0, 0);
    if (time < from.getTime()) return false;
  }
  if (range.to) {
    const to = new Date(range.to);
    to.setHours(23, 59, 59, 999);
    if (time > to.getTime()) return false;
  }
  return true;
}

/** Parse date-only keys as local calendar days to avoid UTC day shifts. */
function toComparableTime(value) {
  if (!value) return Number.NaN;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const [y, m, d] = value.trim().split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
  }
  return new Date(value).getTime();
}

function toLocalDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function eachLocalDateKey(from, to) {
  const keys = [];
  const cursor = new Date(from);
  cursor.setHours(12, 0, 0, 0);
  const end = new Date(to);
  end.setHours(12, 0, 0, 0);
  while (cursor.getTime() <= end.getTime()) {
    keys.push(toLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export function filterTimelineByRange(timeline, range) {
  return asArray(timeline).filter((row) => isWithinDateRange(row?.event_time, range));
}

/**
 * Filter daily trends to the selected range and fill every calendar day with 0
 * when there is no activity (so Last 7/30/90 always show the full window).
 */
export function filterDailyTrendsByRange(daily, range) {
  const byDate = new Map();

  asArray(daily).forEach((row) => {
    const raw = row?.date || row?.day || row?.period;
    const key = raw ? toLocalDateKey(raw) : '';
    if (!key || !isWithinDateRange(key, range)) return;
    byDate.set(key, {
      date: key,
      opens: Number(row.opens ?? row.count ?? 0),
      unique_visitors: Number(row.unique_visitors ?? row.unique ?? 0),
      visit_duration: Number(row.visit_duration ?? row.duration ?? 0),
    });
  });

  // All time: only days that already have activity.
  if (!range?.from && !range?.to) {
    return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  const from = range.from ? new Date(range.from) : null;
  const to = range.to ? new Date(range.to) : new Date();
  if (!from || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  return eachLocalDateKey(from, to).map((date) => {
    const existing = byDate.get(date);
    if (existing) return existing;
    return {
      date,
      opens: 0,
      unique_visitors: 0,
      visit_duration: 0,
    };
  });
}

export function hasAnalyticsSignal(data) {
  if (!data || typeof data !== 'object') return false;
  const overview = data.overview || {};
  const opens = Number(overview.total_opens || 0);
  const visitors = Number(overview.unique_visitors || 0);
  const duration = Number(overview.total_time_spent || 0);
  const sections = asArray(data.sections?.views || data.sections?.sections);
  const timeline =
    asArray(data.visitors?.visitor_timeline).length > 0 ||
    asArray(data.visitor_timeline).length > 0;
  return opens > 0 || visitors > 0 || duration > 0 || sections.length > 0 || timeline;
}
