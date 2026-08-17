import { asArray } from '@/components/proposal-analytics/analytics-format-helpers';

const FIELD_ALIASES = {
  country: ['country', 'country_name', 'country_code'],
  device: ['device', 'device_type'],
  os: ['os', 'operating_system', 'platform'],
  browser: ['browser', 'browser_name'],
};

function parseMetadata(row) {
  let meta = row?.metadata ?? row?.meta ?? row?.event_metadata;
  if (!meta) return null;
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch {
      return null;
    }
  }
  return meta && typeof meta === 'object' ? meta : null;
}

function readAttr(row, field) {
  if (!row || typeof row !== 'object') return '';
  const keys = FIELD_ALIASES[field] || [field];

  for (const key of keys) {
    const value = String(row[key] || '').trim();
    if (value) return value;
  }

  const meta = parseMetadata(row);
  if (meta) {
    for (const key of keys) {
      const value = String(meta[key] || '').trim();
      if (value) return value;
    }
  }

  return '';
}

function collectActiveVisitorIds(timelineRows) {
  const ids = new Set();
  asArray(timelineRows).forEach((row) => {
    const id = String(row?.visitor_id || '').trim();
    if (id) ids.add(id);
  });
  return ids;
}

/**
 * Build visitor_id → attribute map from timeline + optional visitor profile rows.
 */
function buildAttributeMap(fullTimeline, profileRows, field) {
  const attrMap = new Map();

  asArray(profileRows).forEach((row) => {
    const id = String(row?.visitor_id || '').trim();
    const value = readAttr(row, field);
    if (!id || !value) return;
    if (!attrMap.has(id)) attrMap.set(id, value);
  });

  asArray(fullTimeline).forEach((row) => {
    const id = String(row?.visitor_id || '').trim();
    const value = readAttr(row, field);
    if (!id || !value) return;
    // Later timeline values win so newest known attr is used.
    attrMap.set(id, value);
  });

  return attrMap;
}

/**
 * Unique-visitor distribution for a field (device / os / browser / country).
 * Active visitors come from the filtered timeline; attributes from timeline + profiles.
 */
export function buildUniqueVisitorDistribution(
  timelineInRange,
  fullTimeline,
  field,
  profileRows = [],
) {
  const activeVisitors = collectActiveVisitorIds(timelineInRange);
  if (activeVisitors.size === 0) return [];

  const attrMap = buildAttributeMap(fullTimeline, profileRows, field);

  const counts = new Map();
  activeVisitors.forEach((id) => {
    // Keep every active visitor visible — missing attrs become Unknown, not dropped.
    const label = attrMap.get(id) || 'Unknown';
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return [...counts.entries()]
    .map(([key, users]) => ({ [field]: key, users }))
    .sort((a, b) => b.users - a.users || String(a[field]).localeCompare(String(b[field])));
}

/**
 * Prefer timeline-derived distribution for the active visitor set.
 * When a date filter is on, never fall back to all-time API heatmap —
 * the date range is global across chart + breakdowns.
 * Without a date filter, API heatmap is used when timeline attrs are missing.
 */
export function resolveDistribution({
  timelineInRange,
  fullTimeline,
  field,
  profileRows = [],
  apiRows = [],
  hasDateFilter = false,
}) {
  const fromTimeline = buildUniqueVisitorDistribution(
    timelineInRange,
    fullTimeline,
    field,
    profileRows,
  );
  if (fromTimeline.length > 0) return fromTimeline;

  // Date filter is global: empty range ⇒ empty breakdowns (no all-time leak).
  if (hasDateFilter) return [];

  // Fall back to API heatmap so device/OS/browser/country never disappear.
  return asArray(apiRows);
}

/**
 * Section views + duration from timeline events in the selected range.
 */
export function buildSectionsFromTimeline(timelineRows) {
  const byName = new Map();

  asArray(timelineRows).forEach((row) => {
    const name = String(row?.section_name || '').trim();
    if (!name) return;
    const existing = byName.get(name) || {
      section_name: name,
      views: 0,
      duration: 0,
      enterSessions: new Set(),
    };
    const type = String(row.event_type || '').toLowerCase();
    const sessionKey = `${row.visitor_id || ''}::${row.session_id || ''}::${name}`;
    if (type === 'section_enter') {
      existing.enterSessions.add(sessionKey);
    }
    const duration = Number(row.duration ?? 0);
    if (Number.isFinite(duration) && duration > 0) {
      existing.duration += duration;
      if (type === 'section_exit' || type === 'proposal_close') {
        existing.enterSessions.add(sessionKey);
      }
    }
    byName.set(name, existing);
  });

  return [...byName.values()]
    .map((row) => ({
      section_name: row.section_name,
      views: row.enterSessions.size > 0 ? row.enterSessions.size : row.duration > 0 ? 1 : 0,
      duration: row.duration,
      average_duration: 0,
    }))
    .filter((row) => row.views > 0 || row.duration > 0)
    .sort((a, b) => b.views - a.views || b.duration - a.duration);
}

/**
 * Visitor table rows from timeline events in the selected range.
 * Visit totals prefer proposal_close duration so section_exit times are not double-counted.
 */
export function buildVisitorRowsFromTimeline(timelineRows) {
  const byVisitor = new Map();

  asArray(timelineRows).forEach((row) => {
    const id = String(row?.visitor_id || '').trim();
    if (!id) return;
    const existing = byVisitor.get(id) || {
      visitor_id: id,
      visits: new Set(),
      sessions: new Map(),
      last_viewed: null,
      first_viewed: null,
      device: '',
      os: '',
      browser: '',
      country: '',
    };
    if (row.session_id) existing.visits.add(String(row.session_id));

    const sessionKey = String(row.session_id || '').trim() || 'session';
    const session = existing.sessions.get(sessionKey) || {
      close_duration: 0,
      section_duration: 0,
      untagged_duration: 0,
    };
    const duration = Number(row.duration ?? 0);
    const eventType = String(row.event_type || '').toLowerCase();
    if (Number.isFinite(duration) && duration > 0) {
      if (eventType === 'proposal_close') {
        session.close_duration = Math.max(session.close_duration, duration);
      } else if (eventType === 'section_exit') {
        session.section_duration += duration;
      } else if (!eventType) {
        session.untagged_duration += duration;
      }
      existing.sessions.set(sessionKey, session);
    }

    // Keep latest known device attrs on the visitor row for heatmap fallback.
    ['device', 'os', 'browser', 'country'].forEach((field) => {
      const value = readAttr(row, field);
      if (value) existing[field] = value;
    });
    const eventTime = row.event_time || null;
    if (eventTime) {
      const stamp = new Date(eventTime).getTime();
      if (Number.isFinite(stamp)) {
        const last = existing.last_viewed ? new Date(existing.last_viewed).getTime() : 0;
        const first = existing.first_viewed
          ? new Date(existing.first_viewed).getTime()
          : Number.POSITIVE_INFINITY;
        if (stamp >= last) existing.last_viewed = eventTime;
        if (stamp < first) existing.first_viewed = eventTime;
      }
    }
    byVisitor.set(id, existing);
  });

  return [...byVisitor.values()].map((row) => {
    const visitDurations = [...row.sessions.values()].map((session) =>
      session.close_duration > 0
        ? session.close_duration
        : session.section_duration > 0
          ? session.section_duration
          : session.untagged_duration,
    );
    const totalTime = visitDurations.reduce((sum, value) => sum + value, 0);
    // Avg time = total timed duration / distinct visits (same denominator as visits).
    const visits = row.visits.size || 1;
    return {
      visitor_id: row.visitor_id,
      visits,
      avg_time: visits > 0 ? totalTime / visits : 0,
      total_time: totalTime,
      last_viewed: row.last_viewed,
      first_viewed: row.first_viewed,
      device: row.device,
      os: row.os,
      browser: row.browser,
      country: row.country,
    };
  });
}

/** Prefer timeline-derived rows when present; otherwise API rows. */
export function pickDistribution(timelineDerived, apiRows) {
  if (asArray(timelineDerived).length > 0) return timelineDerived;
  return asArray(apiRows);
}
