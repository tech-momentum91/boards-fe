/**
 * Parses activity action strings and returns segments for rendering.
 * Uses the action field directly — from/to are not used for display.
 *
 * Action formats from backend:
 * - "Status changes to `Pending` → `Ongoing`"
 * - "Added `Subscribed` in Subscription Status"
 * - "Removed `Subscribed` from Subscription Status"
 * - "[Bhavesh] changes to [Admin]" (brackets = user/role link)
 */

import { getInfoCallStatusBadgeColor } from '@/components/crm-leads/constants';

const BADGE_COLOR_OPTIONS = [
  'gray',
  'blue',
  'orange',
  'green',
  'purple',
  'sky',
  'pink',
  'teal',
  'yellow',
];

function hashToColor(str) {
  if (!str || typeof str !== 'string') return 'gray';
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return BADGE_COLOR_OPTIONS[Math.abs(h) % BADGE_COLOR_OPTIONS.length];
}

export function isSpecialField(fieldName) {
  const f = String(fieldName || '').toLowerCase();
  return /status|priority|stage/.test(f);
}

export function isDateField(fieldName) {
  return /date/i.test(String(fieldName || ''));
}

export function isInfoCallStatusField(fieldName) {
  const f = String(fieldName || '')
    .toLowerCase()
    .replaceAll(/[\s_]/g, '');
  return f.includes('infocallstatus') || f === 'callstatus' || f.includes('delaconinfocallstatus');
}

export function getStatusColor(status) {
  const s = String(status || '')
    .toLowerCase()
    .trim();
  // TruePulse / Info Call Status (Answered / Missed / Unknown)
  if (
    [
      'answered',
      'connected',
      'missed',
      'no answer',
      'not answered',
      'unknown',
      'busy',
      'voicemail',
    ].includes(s)
  ) {
    return getInfoCallStatusBadgeColor(status);
  }
  // Agreement / shared lifecycle
  if (s === 'active') return 'green';
  if (s === 'expired') return 'red';
  if (s === 'upcoming') return 'blue';
  // CRM-style task statuses
  if (s === 'completed') return 'green';
  if (s === 'ongoing') return 'blue';
  if (s === 'on hold') return 'gray';
  return 'orange';
}

export function getPriorityColor(priority) {
  const p = String(priority || '').toLowerCase();
  if (p === 'low') return 'green';
  if (p === 'medium') return 'orange';
  if (p === 'high' || p === 'urgent') return 'red';
  return 'gray';
}

export function getStageColor(stage) {
  const s = String(stage || '').toLowerCase();
  const colorMap = {
    qualification: 'orange',
    proposal: 'blue',
    negotiation: 'purple',
    closed_won: 'green',
    closed_lost: 'red',
    discovery: 'sky',
  };
  return colorMap[s] || hashToColor(stage);
}

export function getColorForValue(fieldName, value) {
  const f = String(fieldName || '').toLowerCase();
  if (
    isInfoCallStatusField(fieldName) ||
    /info[\s_-]?call[\s_-]?status|call[\s_-]?status/.test(f)
  ) {
    return getInfoCallStatusBadgeColor(value);
  }
  if (/status/.test(f)) return getStatusColor(value);
  if (/priority/.test(f)) return getPriorityColor(value);
  if (/stage/.test(f)) return getStageColor(value);
  return hashToColor(value);
}

/**
 * Parse action string into segments.
 * Returns: [{ type: 'text'|'backtick'|'bracket', value: string }, ...]
 */
export function parseActionToSegments(action) {
  const str = String(action || '').trim();
  if (!str) return [{ type: 'text', value: '' }];

  const segments = [];
  let i = 0;

  while (i < str.length) {
    if (str[i] === '`') {
      const end = str.indexOf('`', i + 1);
      if (end !== -1) {
        segments.push({ type: 'backtick', value: str.slice(i + 1, end).trim() });
        i = end + 1;
        continue;
      }
    }
    if (str[i] === '[') {
      const end = str.indexOf(']', i + 1);
      if (end !== -1) {
        segments.push({ type: 'bracket', value: str.slice(i + 1, end).trim() });
        i = end + 1;
        continue;
      }
    }

    let j = i;
    while (j < str.length && str[j] !== '`' && str[j] !== '[') {
      j++;
    }
    if (j > i) {
      segments.push({ type: 'text', value: str.slice(i, j) });
    }
    i = j > i ? j : i + 1;
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: str }];
}
