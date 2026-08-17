import { format, parse } from 'date-fns';

export const BOOKING_TIME_WHEEL_ITEM_H = 40;
export const BOOKING_TIME_WHEEL_VISIBLE_ROWS = 3;
export const BOOKING_TIME_WHEEL_HEIGHT =
  BOOKING_TIME_WHEEL_ITEM_H * BOOKING_TIME_WHEEL_VISIBLE_ROWS;

export const HOURS_12 = ['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];
export const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
export const MERIDIEM = ['AM', 'PM'];

export const MIN_START_END_GAP_MINUTES = 15;
export const MIN_START_SLOT_MINUTES = 15;

export function minEndTotalMinutes(startM) {
  return startM + MIN_START_END_GAP_MINUTES;
}

export function buildWheelRows(options) {
  const n = options?.length ?? 0;
  if (n === 0) {
    return { rows: [], baseLen: 0 };
  }
  const rows = [];
  for (let i = 0; i < n; i += 1) {
    rows.push({
      key: `r${i}-${options[i]}`,
      value: options[i],
    });
  }
  return { rows, baseLen: n };
}

export function setScrollTopInstant(el, top) {
  if (!el) return;
  el.style.scrollBehavior = 'auto';
  el.scrollTop = top;
  el.style.removeProperty('scroll-behavior');
}

export function timeStringToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return 0;
  const parts = hhmm.split(':');
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  return h * 60 + Math.min(59, Math.max(0, m));
}

export function minutesToHHmm(total) {
  const t = Math.max(0, Math.min(24 * 60 - 1, Math.floor(total)));
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function to24Hour(hour12Str, minuteStr, meridiem) {
  let h = Number.parseInt(hour12Str, 10);
  const m = Number.parseInt(minuteStr, 10);
  if (Number.isNaN(h) || h < 1 || h > 12) h = 12;
  let h24;
  if (meridiem === 'AM') {
    h24 = h === 12 ? 0 : h;
  } else {
    h24 = h === 12 ? 12 : h + 12;
  }
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function totalMinutes12h(hour12Str, minuteStr, meridiem) {
  return timeStringToMinutes(to24Hour(hour12Str, minuteStr, meridiem));
}

export function endMeridiemsAfter(startM) {
  const minEnd = minEndTotalMinutes(startM);
  return MERIDIEM.filter((mer) =>
    HOURS_12.some((h) => MINUTES.some((mm) => totalMinutes12h(h, mm, mer) >= minEnd)),
  );
}

export function endHoursAfter(startM, meridiem, minuteStr) {
  const minEnd = minEndTotalMinutes(startM);
  return HOURS_12.filter((h) => totalMinutes12h(h, minuteStr, meridiem) >= minEnd);
}

export function endMinutesAfter(startM, hour12Str, meridiem) {
  const minEnd = minEndTotalMinutes(startM);
  return MINUTES.filter((mm) => totalMinutes12h(hour12Str, mm, meridiem) >= minEnd);
}

export function minStartTotalMinutesForBookingDate(bookingDateStr, now = new Date()) {
  if (!bookingDateStr || typeof bookingDateStr !== 'string') return 0;
  const todayStr = format(now, 'yyyy-MM-dd');
  if (bookingDateStr < todayStr || bookingDateStr > todayStr) return 0;
  const mins = now.getHours() * 60 + now.getMinutes();
  const slot = Math.ceil(mins / MIN_START_SLOT_MINUTES) * MIN_START_SLOT_MINUTES;
  return Math.min(24 * 60 - 1, Math.max(0, slot));
}

export function startMeridiemsValid(minStartM) {
  if (minStartM <= 0) return MERIDIEM;
  return MERIDIEM.filter((mer) =>
    HOURS_12.some((h) => MINUTES.some((mm) => totalMinutes12h(h, mm, mer) >= minStartM)),
  );
}

export function startHoursValid(minStartM, meridiem) {
  if (minStartM <= 0) return HOURS_12;
  return HOURS_12.filter((h) =>
    MINUTES.some((mm) => totalMinutes12h(h, mm, meridiem) >= minStartM),
  );
}

export function startMinutesValid(minStartM, hour12Str, meridiem) {
  if (minStartM <= 0) return MINUTES;
  return MINUTES.filter((mm) => totalMinutes12h(hour12Str, mm, meridiem) >= minStartM);
}

export function parsePickerTime(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') {
    return { hour12: '12', minute: '00', meridiem: 'AM' };
  }
  const parts = hhmm.split(':');
  const h24 = Number(parts[0]) || 0;
  const rawM = Number(parts[1]) || 0;
  const m = Math.min(59, Math.max(0, rawM));
  const minute = String(m).padStart(2, '0');
  const meridiem = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  const hour12 = String(h12).padStart(2, '0');
  return { hour12, minute, meridiem };
}

export function formatTimeSummary(dateStr, startTime, endTime) {
  if (!startTime || !endTime) return '';
  try {
    const base = dateStr ? parse(dateStr, 'yyyy-MM-dd', new Date()) : new Date();
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const s = new Date(base);
    s.setHours(sh, sm, 0, 0);
    const e = new Date(base);
    e.setHours(eh, em, 0, 0);
    return `${format(s, 'h:mm a')} – ${format(e, 'h:mm a')}`;
  } catch {
    return '';
  }
}

/** Display label for a single 24h "HH:mm" value. */
export function formatSingleTimeSummary(hhmm) {
  if (!hhmm) return '';
  try {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return format(d, 'h:mm a');
  } catch {
    return '';
  }
}

export function safeScrollTo(el, top, behavior) {
  if (!el) return;
  try {
    if (typeof el.scrollTo === 'function') {
      el.scrollTo(behavior ? { top, behavior } : { top });
      return;
    }
  } catch {
    /* fall through */
  }
  el.scrollTop = top;
}

export function wheelRowVisualStyle(dist) {
  if (dist <= 0) {
    return {
      opacity: 1,
      transform: 'scale(1)',
      textClass: 'text-base font-medium text-text-strong-950',
    };
  }
  if (dist === 1) {
    return {
      opacity: 0.48,
      transform: 'scale(0.87)',
      textClass: 'text-sm font-medium text-text-sub-600',
    };
  }
  if (dist === 2) {
    return {
      opacity: 0.35,
      transform: 'scale(0.78)',
      textClass: 'text-xs font-medium text-text-soft-400',
    };
  }
  return {
    opacity: 0.28,
    transform: 'scale(0.72)',
    textClass: 'text-xs font-normal text-text-soft-400',
  };
}
