import {
  addMonths,
  addQuarters,
  addWeeks,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from 'date-fns';

const WEEK_OPTIONS = { weekStartsOn: 1 };

/**
 * Calendar-aligned range for fixed presets (this/next week, month, quarter).
 *
 * @param {'this_week' | 'next_week' | 'this_month' | 'next_month' | 'next_quarter'} preset
 * @param {Date} [now]
 * @returns {{ from: Date, to: Date } | null}
 */
export function getLayoutAgreementDatePresetRange(preset, now = new Date()) {
  switch (preset) {
    case 'this_week': {
      return {
        from: startOfDay(startOfWeek(now, WEEK_OPTIONS)),
        to: startOfDay(endOfWeek(now, WEEK_OPTIONS)),
      };
    }
    case 'next_week': {
      const nextWeek = addWeeks(now, 1);
      return {
        from: startOfDay(startOfWeek(nextWeek, WEEK_OPTIONS)),
        to: startOfDay(endOfWeek(nextWeek, WEEK_OPTIONS)),
      };
    }
    case 'this_month': {
      return {
        from: startOfDay(startOfMonth(now)),
        to: startOfDay(endOfMonth(now)),
      };
    }
    case 'next_month': {
      const nextMonth = addMonths(startOfMonth(now), 1);
      return {
        from: startOfDay(nextMonth),
        to: startOfDay(endOfMonth(nextMonth)),
      };
    }
    case 'next_quarter': {
      const nextQuarter = addQuarters(startOfQuarter(now), 1);
      return {
        from: startOfDay(nextQuarter),
        to: startOfDay(endOfQuarter(nextQuarter)),
      };
    }
    default:
      return null;
  }
}
