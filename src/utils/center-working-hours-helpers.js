export function safeWorkingHoursSummaryText(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string' || typeof value === 'number') {
    const t = String(value).trim();
    return t || null;
  }
  return null;
}

export const WEEKDAYS_SUN_FIRST = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function sortWeekApiEntriesSunFirst(week) {
  return [...week].sort((a, b) => {
    const ia = WEEKDAYS_SUN_FIRST.indexOf(a.weekday);
    const ib = WEEKDAYS_SUN_FIRST.indexOf(b.weekday);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}

function isOne(v) {
  return v === 1 || v === true || v === '1';
}

export function parseTimeForTimeInput(t) {
  if (t == null || t === '') return '09:00';
  const s = String(t).trim();
  const iso = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (iso) {
    const h = Math.min(23, Math.max(0, Number.parseInt(iso[1], 10)));
    const m = Math.min(59, Math.max(0, Number.parseInt(iso[2], 10)));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const ap = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)\s*$/i);
  if (ap) {
    let h = Number.parseInt(ap[1], 10);
    const m = Number.parseInt(ap[2], 10);
    const mer = ap[3].toUpperCase();
    if (mer === 'PM' && h !== 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return '09:00';
}

export function toApiHhMmss(hhmm) {
  if (!hhmm || !String(hhmm).trim()) return '09:00:00';
  const p = String(hhmm).trim();
  return p.length === 5 ? `${p}:00` : p;
}

export function hhmmStringToDate(hhmm) {
  if (hhmm == null || !String(hhmm).includes(':')) return undefined;
  const p = String(hhmm).trim();
  const [sh, sm] = p.split(':');
  const H = Number.parseInt(sh, 10);
  const M = Number.parseInt(sm, 10);
  if (Number.isNaN(H) || Number.isNaN(M)) return undefined;
  const d = new Date();
  d.setHours(H, M, 0, 0);
  return d;
}

export function dateToHhmmString(d) {
  if (!d || Number.isNaN(d.getTime())) return '09:00';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function isHolidaySummaryLabel(s) {
  if (s == null || s === '') return false;
  const raw = String(s).trim();
  const t = raw.toLowerCase();
  if (t === 'holiday' || t === 'public holiday') return true;
  return /\bholiday\b/i.test(raw);
}

export function stripLeadingWeekdayFromSummaryText(text, dayName) {
  const s = String(text ?? '').trim();
  if (!s || !dayName) return s;
  const ESCAPE_REGEX = /[$()*+.?[\\\]^{|}]/g;
  const esc = String(dayName).replaceAll(ESCAPE_REGEX, String.raw`\$&`);
  const re = new RegExp(`^${esc}(\\s+|\\s*[–—-]\\s*)`, 'i');
  const stripped = s.replace(re, '').trim();
  return stripped.length > 0 ? stripped : s;
}

function hhmmTo12HourLabel(hhmm) {
  if (!hhmm || !String(hhmm).includes(':')) return String(hhmm ?? '');
  const [H, M] = hhmm.split(':').map((x) => Number.parseInt(x, 10));
  if (Number.isNaN(H) || Number.isNaN(M)) return String(hhmm);
  const ap = H >= 12 ? 'PM' : 'AM';
  const h12 = H % 12 || 12;
  return `${h12}:${String(M).padStart(2, '0')} ${ap}`;
}

function formatTimeTokenForDisplay(t) {
  if (t == null || t === '') return '';
  const str = String(t).trim();
  if (/\b(am|pm)\b/i.test(str)) return str;
  return hhmmTo12HourLabel(parseTimeForTimeInput(str));
}

function formatRangeForDisplay(raw) {
  if (raw == null || raw === '') return raw;
  const s = String(raw);
  const m = s.match(/^(.+?)\s*[–—-]\s*(.+)$/);
  if (m) {
    return `${formatTimeTokenForDisplay(m[1].trim())} – ${formatTimeTokenForDisplay(m[2].trim())}`;
  }
  return formatTimeTokenForDisplay(s.trim());
}

function displayTimeRangeFromRow(row) {
  if (!row || isOne(row.is_closed) || isOne(row.open_24_hours)) return null;
  const direct =
    row.formatted_hours ??
    row.hours_display ??
    row.time_range ??
    row.display_range ??
    row.working_hours_display;
  if (direct != null && String(direct).trim() !== '') return String(direct).trim();
  const a = row.start_time == null ? '' : String(row.start_time).trim();
  const b = row.end_time == null ? '' : String(row.end_time).trim();
  if (!a && !b) return null;
  if (a && b) return `${a} – ${b}`;
  return a || b;
}

export function formatWorkingDayLine(row) {
  if (!row) return { text: 'Not set', tone: 'muted' };
  if (
    isOne(row.is_holiday) ||
    isOne(row.holiday) ||
    String(row.day_state || row.working_label || '').toLowerCase() === 'holiday'
  ) {
    return { text: 'Holiday', tone: 'holiday' };
  }
  if (isOne(row.is_closed)) return { text: 'Closed', tone: 'closed' };
  if (isOne(row.open_24_hours)) return { text: 'Open 24 hours', tone: 'open' };
  const range = displayTimeRangeFromRow(row);
  if (range) {
    const text = /\b(am|pm)\b/i.test(range) ? range : formatRangeForDisplay(range);
    return { text, tone: 'open' };
  }
  return { text: 'Not set', tone: 'muted' };
}

export function normalizeWorkingHoursSummaryTone(docSummary) {
  const raw = String(docSummary ?? '').trim();
  if (!raw) return { text: '', tone: 'muted' };
  if (isHolidaySummaryLabel(raw)) return { text: 'Holiday', tone: 'holiday' };
  const lower = raw.toLowerCase();
  if (lower === 'closed') return { text: 'Closed', tone: 'closed' };
  if (lower.includes('24') && lower.includes('hour')) return { text: raw, tone: 'open' };
  if (/\d/.test(raw) || /\b(am|pm)\b/i.test(raw)) {
    const text = /\b(am|pm)\b/i.test(raw) ? raw : formatRangeForDisplay(raw);
    return { text, tone: 'open' };
  }
  return { text: raw, tone: 'muted' };
}

export function toneFromWeekKind(kind) {
  const k = String(kind ?? '').toLowerCase();
  if (k === 'holiday') return 'holiday';
  if (k === 'closed') return 'closed';
  if (k === 'empty' || k === 'not_set' || k === '') return 'muted';
  if (k === 'open_24' || k === 'open24' || (k.includes('24') && k.includes('hour'))) return 'open';
  if (k === 'timed' || k === 'time' || k === 'hours') return 'open';
  return 'open';
}

export function toneFromTodayLabelString(text) {
  if (text == null || String(text).trim() === '') return 'muted';
  const s = String(text).trim();
  if (isHolidaySummaryLabel(s)) return 'holiday';
  const lower = s.toLowerCase();
  if (lower === 'closed') return 'closed';
  if (lower.includes('24') && lower.includes('hour')) return 'open';
  if (/\d/.test(s) || /\b(am|pm)\b/i.test(s)) return 'open';
  return 'open';
}

export function workingApiRowsToDraft(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const draft = {};
  for (const day of WEEKDAYS_SUN_FIRST) {
    const r = list.find((x) => x.day === day);
    if (!r) {
      draft[day] = { isOpen: false, open24: false, start: '09:00', end: '17:00' };
    } else if (isOne(r.is_closed)) {
      draft[day] = {
        isOpen: false,
        open24: false,
        start: parseTimeForTimeInput(r.start_time),
        end: parseTimeForTimeInput(r.end_time),
      };
    } else {
      draft[day] = {
        isOpen: true,
        open24: isOne(r.open_24_hours),
        start: parseTimeForTimeInput(r.start_time),
        end: parseTimeForTimeInput(r.end_time),
      };
    }
  }
  return draft;
}

export function buildTodayWorkingSummary({
  workingHoursTodayApi,
  workingHoursWeek,
  workingHoursRows,
  todayWorkingHoursFromDetails,
  docWorkingHoursSummary,
  todayIso,
  todayWeekdayName,
}) {
  if (workingHoursTodayApi != null && String(workingHoursTodayApi).trim() !== '') {
    const t = String(workingHoursTodayApi).trim();
    return { dayName: todayWeekdayName, text: t, tone: toneFromTodayLabelString(t) };
  }

  const fromDetails = safeWorkingHoursSummaryText(todayWorkingHoursFromDetails);
  if (fromDetails) {
    return {
      dayName: todayWeekdayName,
      text: fromDetails,
      tone: toneFromTodayLabelString(fromDetails),
    };
  }

  const weekToday = workingHoursWeek.find((w) => w.date === todayIso);
  if (weekToday?.label != null && String(weekToday.label).trim() !== '') {
    return {
      dayName: todayWeekdayName,
      text: String(weekToday.label).trim(),
      tone: toneFromWeekKind(weekToday.kind),
    };
  }

  const row = workingHoursRows.find((r) => r.day === todayWeekdayName);
  const line = formatWorkingDayLine(row);
  const docSummary = safeWorkingHoursSummaryText(docWorkingHoursSummary);

  if (docSummary != null && String(docSummary).trim() !== '' && isHolidaySummaryLabel(docSummary)) {
    return { dayName: todayWeekdayName, text: 'Holiday', tone: 'holiday' };
  }

  if (line.text !== 'Not set' && line.tone !== 'muted') {
    return { dayName: todayWeekdayName, text: line.text, tone: line.tone };
  }

  if (docSummary != null && String(docSummary).trim() !== '') {
    const n = normalizeWorkingHoursSummaryTone(docSummary);
    return { dayName: todayWeekdayName, text: n.text, tone: n.tone };
  }

  return { dayName: todayWeekdayName, text: 'Not set', tone: 'muted' };
}

export function buildScheduleWeekRows(
  workingHoursWeek,
  workingHoursRows,
  todayIso,
  todayWeekdayName,
) {
  if (workingHoursWeek.length > 0) {
    return sortWeekApiEntriesSunFirst(workingHoursWeek).map((w) => ({
      key: w.date || w.weekday,
      left: w.weekday,
      text: w.label != null && String(w.label).trim() !== '' ? String(w.label).trim() : '—',
      tone: toneFromWeekKind(w.kind),
      isToday: w.date === todayIso,
    }));
  }
  return WEEKDAYS_SUN_FIRST.map((day) => {
    const row = workingHoursRows.find((r) => r.day === day);
    const line = formatWorkingDayLine(row);
    return {
      key: day,
      left: day,
      text: line.text,
      tone: line.tone,
      isToday: day === todayWeekdayName,
    };
  });
}
