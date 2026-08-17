/**
 * Inbox notification buckets are keyed by timeframe labels ("Today", "2025", …).
 * `Object.keys()` does NOT preserve API order: numeric-looking keys like "2025" are
 * enumerated first (array-index rule), so years jump above "Today".
 * Order here matches devx.api.notification._ordered_primary_timeframes / TIMEFRAME_ORDER_LATER.
 */

const FIXED_PRIMARY = ['Today', 'Yesterday', 'Last 7 days', 'Earlier this month'];

const FIXED_LATER = ['Today', 'Tomorrow', 'Next 7 days', 'Later'];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function monthNameToNum(name) {
  const i = MONTH_NAMES.indexOf(name);
  return i >= 0 ? i + 1 : null;
}

/** Sort tuple aligned with notification.py _timeframe_primary_sort_key. */
function primaryTfSortTuple(tf) {
  const rank = {
    Today: [0, 0],
    Yesterday: [0, 1],
    'Last 7 days': [0, 2],
    'Earlier this month': [0, 3],
  };
  if (Object.prototype.hasOwnProperty.call(rank, tf)) return rank[tf];
  if (tf === 'Older') return [9, 0];
  if (/^\d{4}$/.test(tf)) {
    const y = Number.parseInt(tf, 10);
    return [2, -y];
  }
  const mn = monthNameToNum(tf);
  if (mn != null) return [1, -mn];
  return [8, 0, tf];
}

function compareTuples(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const va = a[i];
    const vb = b[i];
    if (va === vb) continue;
    if (typeof va === 'number' && typeof vb === 'number') {
      if (va < vb) return -1;
      if (va > vb) return 1;
      continue;
    }
    const sa = String(va);
    const sb = String(vb);
    if (sa < sb) return -1;
    if (sa > sb) return 1;
  }
  return 0;
}

/**
 * @param {string[]} keys - Timeframe keys present in the payload
 * @param {string} tab - 'Primary' | 'Later' | 'Cleared' (Cleared uses same order as Primary)
 * @returns {string[]} keys in correct display order
 */
export function orderNotificationTimeframeKeys(keys, tab = 'Primary') {
  const keySet = new Set(Array.isArray(keys) ? keys : []);
  const t = String(tab || 'Primary').toLowerCase();

  if (t === 'later') {
    return FIXED_LATER.filter((k) => keySet.has(k));
  }

  const seen = new Set(FIXED_PRIMARY);
  const dynamic = (Array.isArray(keys) ? keys : []).filter((k) => !seen.has(k));
  dynamic.sort((a, b) => compareTuples(primaryTfSortTuple(a), primaryTfSortTuple(b)));

  return [...FIXED_PRIMARY.filter((k) => keySet.has(k)), ...dynamic];
}

/**
 * Build section list from getNotifications() result without relying on Object.key order.
 */
export function inboxPayloadToSections(data, tab = 'Primary') {
  const obj = data && typeof data === 'object' ? data : {};
  const orderedKeys = orderNotificationTimeframeKeys(Object.keys(obj), tab);
  return orderedKeys
    .filter((k) => (obj[k]?.length ?? 0) > 0)
    .map((k) => ({
      sectionKey: k,
      sectionLabel: k,
      items: obj[k] || [],
    }));
}
