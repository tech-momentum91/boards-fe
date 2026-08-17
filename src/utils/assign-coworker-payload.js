import { formatHotDeskMonthDaysForApi } from '@/utils/hot-desk-month-day-utils';

/** UI weekday keys → API numbers (Sun=0 … Sat=6; e.g. Mon/Wed/Fri → "1,3,5"). */
const WEEKDAY_KEY_TO_API_NUMBER = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/**
 * @param {string} hhmm - "HH:mm" or "HH:mm:ss"
 * @returns {string}
 */
export function formatAssignTimeForApi(hhmm) {
  const t = String(hhmm || '').trim();
  if (!t) return '';
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(t)) {
    const [h, m, s] = t.split(':');
    return `${String(h).padStart(2, '0')}:${m}:${s}`;
  }
  if (/^\d{1,2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(':');
    return `${String(h).padStart(2, '0')}:${m}:00`;
  }
  return t;
}

/**
 * @param {string[]} selectedDayKeys - e.g. ['mon', 'wed', 'fri']
 * @returns {string}
 */
export function formatWeekDaysForAssignApi(selectedDayKeys) {
  if (!Array.isArray(selectedDayKeys) || selectedDayKeys.length === 0) return '';
  return [...selectedDayKeys]
    .map((key) => WEEKDAY_KEY_TO_API_NUMBER[key])
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
    .join(',');
}

/**
 * @param {{
 *   customerId: string,
 *   spaceId: string,
 *   subSpaceId: string,
 *   deskId: string,
 *   coworkerId: string,
 *   centerId: string,
 * }} params
 */
export function buildAssignCoworkerBase(params) {
  return {
    customer_id: String(params.customerId || '').trim(),
    space_id: String(params.spaceId || '').trim(),
    sub_space_id: String(params.subSpaceId || '').trim(),
    desk_id: String(params.deskId || '').trim(),
    coworker_id: String(params.coworkerId || '').trim(),
    center_id: String(params.centerId || '').trim(),
  };
}

/**
 * Permanent co-worker on a non–hot-desk sub-space seat.
 *
 * @param {ReturnType<typeof buildAssignCoworkerBase> extends infer B ? B & {
 *   startDate: string,
 * }} params
 */
export function buildPermanentAssignPayload(params) {
  return {
    ...buildAssignCoworkerBase(params),
    permanent: 1,
    recurring: 0,
    start_date: String(params.startDate || '').trim(),
  };
}

/**
 * Recurring hot-desk assignment (Daily / Weekly / Monthly).
 *
 * @param {{
 *   customerId: string,
 *   spaceId: string,
 *   subSpaceId: string,
 *   deskId: string,
 *   coworkerId: string,
 *   centerId: string,
 *   recurringPeriod: 'Daily' | 'Weekly' | 'Monthly',
 *   startDate: string,
 *   startTime: string,
 *   endTime: string,
 *   selectedDayKeys?: string[],
 *   selectedMonthDays?: number[],
 *   recurrenceEndType?: 'On' | 'After',
 *   recurrenceEndDate?: string,
 *   recurrenceEndAfter?: string | number,
 * }} params
 */
export function buildRecurringAssignPayload(params) {
  const {
    recurringPeriod,
    startDate,
    startTime,
    endTime,
    selectedDayKeys = [],
    selectedMonthDays = [],
    recurrenceEndType,
    recurrenceEndDate,
    recurrenceEndAfter,
  } = params;

  const payload = {
    ...buildAssignCoworkerBase(params),
    permanent: 0,
    recurring: 1,
    recurring_period: recurringPeriod,
    start_date: String(startDate || '').trim(),
    start_time: formatAssignTimeForApi(startTime),
    end_time: formatAssignTimeForApi(endTime),
  };

  if (recurringPeriod === 'Weekly') {
    const weekDays = formatWeekDaysForAssignApi(selectedDayKeys);
    if (weekDays) payload.week_days = weekDays;
  }

  if (recurringPeriod === 'Monthly') {
    const monthDates = formatHotDeskMonthDaysForApi(selectedMonthDays);
    if (monthDates) payload.month_dates = monthDates;
  }

  if (recurrenceEndType === 'On' && recurrenceEndDate) {
    payload.recurrence_end_date = String(recurrenceEndDate).trim();
  } else if (recurrenceEndType === 'After') {
    const count = Number(recurrenceEndAfter);
    if (Number.isFinite(count) && count >= 1) {
      payload.occurrence = count;
    }
  }

  return payload;
}

/**
 * One-time hot-desk assignment (non-recurring date range).
 *
 * @param {{
 *   customerId: string,
 *   spaceId: string,
 *   subSpaceId: string,
 *   deskId: string,
 *   coworkerId: string,
 *   centerId: string,
 *   startDate: string,
 *   endDate: string,
 *   startTime: string,
 *   endTime: string,
 * }} params
 */
export function buildOneTimeHotDeskAssignPayload(params) {
  return {
    ...buildAssignCoworkerBase(params),
    permanent: 1,
    recurring: 0,
    start_date: String(params.startDate || '').trim(),
    end_date: String(params.endDate || '').trim(),
    start_time: formatAssignTimeForApi(params.startTime),
    end_time: formatAssignTimeForApi(params.endTime),
  };
}
