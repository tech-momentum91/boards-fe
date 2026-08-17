/**
 * @param {number} day
 * @returns {string}
 */
export function formatMonthDayOrdinal(day) {
  const n = Number(day);
  if (!Number.isFinite(n) || n < 1 || n > 31) return '';
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * @param {number[]} monthDays
 * @returns {string}
 */
export function formatHotDeskMonthDaysForApi(monthDays) {
  return [...monthDays]
    .filter((d) => Number.isFinite(d) && d >= 1 && d <= 31)
    .sort((a, b) => a - b)
    .join(',');
}

/**
 * Map day-of-month numbers to Date objects in the given month (for calendar UI).
 *
 * @param {Date} monthAnchor
 * @param {number[]} monthDays
 * @returns {Date[]}
 */
export function monthDaysToCalendarDates(monthAnchor, monthDays) {
  if (!monthAnchor || !Array.isArray(monthDays)) return [];
  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  return monthDays.map((day) => new Date(year, month, day)).filter((d) => d.getMonth() === month);
}

/**
 * @param {Date[] | undefined} dates
 * @returns {number[]}
 */
export function calendarDatesToMonthDays(dates) {
  if (!Array.isArray(dates)) return [];
  const days = dates.map((d) => d.getDate()).filter((day) => day >= 1 && day <= 31);
  return [...new Set(days)].sort((a, b) => a - b);
}

/**
 * @param {number[]} monthDays
 * @param {number} day
 * @returns {number[]}
 */
export function toggleMonthDay(monthDays, day) {
  const n = Number(day);
  if (!Number.isFinite(n)) return monthDays;
  return monthDays.includes(n)
    ? monthDays.filter((d) => d !== n)
    : [...monthDays, n].sort((a, b) => a - b);
}
