import {
  differenceInCalendarDays,
  format,
  isBefore,
  isSameWeek,
  isValid,
  startOfDay,
} from 'date-fns';
import { parseToDate } from '@/utils/date-utils';

const LIST_WEEK_OPTIONS = { weekStartsOn: 1 };

export function boardTaskDateIncludesTime(value = '') {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    return false;
  }

  // Date-only strings (no time chosen in the picker).
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return false;
  }

  const date = parseToDate(normalized);

  if (!date || !isValid(date)) {
    return false;
  }

  // Datetime fields persist date-only values at midnight — keep those in All day.
  return date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
}

export function serializeBoardTaskDate(date, includeTime = false) {
  if (!date || !isValid(date)) {
    return '';
  }

  return includeTime ? format(date, 'yyyy-MM-dd HH:mm:ss') : format(date, 'yyyy-MM-dd');
}

export function formatBoardTaskDateLabel(value = '') {
  const date = parseToDate(value);

  if (!date) {
    return '';
  }

  if (boardTaskDateIncludesTime(value)) {
    return format(date, 'd MMM, h:mm a');
  }

  return format(date, 'd MMM');
}

function formatAbsoluteListDateLabel(date) {
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

/**
 * Relative list-cell date label:
 * Yesterday / Today / Tomorrow → weekday in current Mon–Sun week → DD/MM/YY.
 */
export function formatListDateLabel(value = '', now = new Date()) {
  const date = parseToDate(value);

  if (!date || !isValid(date)) {
    return String(value ?? '').trim();
  }

  const dayDiff = differenceInCalendarDays(date, now);

  if (dayDiff === -1) {
    return 'Yesterday';
  }

  if (dayDiff === 0) {
    return 'Today';
  }

  if (dayDiff === 1) {
    return 'Tomorrow';
  }

  if (isSameWeek(date, now, LIST_WEEK_OPTIONS)) {
    return format(date, 'EEE');
  }

  return formatAbsoluteListDateLabel(date);
}

/** True when the calendar day is strictly before today. */
export function isListDateOverdue(value = '', now = new Date()) {
  const date = parseToDate(value);

  if (!date || !isValid(date)) {
    return false;
  }

  return isBefore(startOfDay(date), startOfDay(now));
}
