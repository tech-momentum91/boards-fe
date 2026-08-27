// ============================================================
// Imports
// ============================================================
import {
  addDays,
  addYears,
  differenceInMinutes,
  differenceInYears,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  formatISO,
  fromUnixTime,
  getDate,
  getMonth,
  getYear,
  intervalToDuration,
  isBefore,
  isToday,
  isValid,
  isYesterday,
  parse,
  parseISO,
  setDate,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subDays,
  subHours,
  subMinutes,
  subMonths,
  subQuarters,
  subWeeks,
  subYears,
  toDate,
} from 'date-fns';

import {
  DATETIME_FILTER_PRESET,
  DATETIME_FILTER_PRESET_OPTIONS,
  DEFAULT_DATETIME_FILTER,
} from '@/components/crm-accounts/constants';

// ============================================================
// Base Timestamp Utilities
// ============================================================

/**
 * Converts a timestamp to DD/MM/YYYY format string
 */
export const formatTimestampToDDMMYYYY = (timestamp) => {
  if (!timestamp || typeof timestamp !== 'number') return '';

  const date = new Date(timestamp);
  if (!isValid(date)) return '';

  return format(date, 'dd/MM/yyyy');
};

/**
 * Converts a timestamp to YYYY-MM-DD format string
 */
export const formatTimestampToYYYYMMDD = (timestamp) => {
  if (!timestamp || typeof timestamp !== 'number') return '';

  const date = new Date(timestamp);
  if (!isValid(date)) return '';

  return format(date, 'yyyy-MM-dd');
};

/**
 * Parses DD/MM/YYYY format string to timestamp
 */
export const parseDDMMYYYYToTimestamp = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null;

  // Support both 2-digit and 4-digit years
  const match = dateString.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);
  if (!match) return null;

  const [, dayStr, monthStr, yearStr] = match;
  const day = Number.parseInt(dayStr, 10);
  const month = Number.parseInt(monthStr, 10);
  let year = Number.parseInt(yearStr, 10);

  if (yearStr.length === 2) {
    year += year >= 50 ? 1900 : 2000;
  }

  const date = new Date(year, month - 1, day);

  // Validate that the date is actually real (e.g. not 31/02/2026)
  if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
    return null;
  }

  return date.getTime();
};

/**
 * Parses YYYY-MM-DD format string to timestamp
 */
export const parseYYYYMMDDToTimestamp = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null;

  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;

  const date = new Date(
    Number.parseInt(year, 10),
    Number.parseInt(month, 10) - 1,
    Number.parseInt(day, 10),
  );

  if (
    date.getDate() !== Number.parseInt(day, 10) ||
    date.getMonth() !== Number.parseInt(month, 10) - 1 ||
    date.getFullYear() !== Number.parseInt(year, 10)
  ) {
    return null;
  }

  return date.getTime();
};

/**
 * YYYY-MM-DD → DD/MM/YYYY
 */
export const convertYYYYMMDDToDDMMYYYY = (dateString) => {
  if (!dateString) return '';

  const timestamp = parseYYYYMMDDToTimestamp(dateString);
  if (!timestamp) return dateString;

  return formatTimestampToDDMMYYYY(timestamp);
};

/**
 * DD/MM/YYYY → YYYY-MM-DD
 */
export const convertDDMMYYYYToYYYYMMDD = (dateString) => {
  if (!dateString) return '';

  const timestamp = parseDDMMYYYYToTimestamp(dateString);
  if (!timestamp) return '';

  return formatTimestampToYYYYMMDD(timestamp);
};

/**
 * Validate DD/MM/YYYY
 */
export const isValidDDMMYYYYFormat = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return false;
  return parseDDMMYYYYToTimestamp(dateString) !== null;
};

/**
 * Current timestamp
 */
export const getCurrentTimestamp = () => Date.now();

// ============================================================
// date-fns Utilities
// ============================================================

export const DISPLAY_DATETIME_FORMAT = 'dd-MM-yyyy h:mm a';
export const DISPLAY_DATETIME_FORMAT_2 = 'dd MMM yyyy, h:mm a';

/**
 * Parses ISO, Frappe datetime, timestamps, and Date objects
 */
export const parseToDate = (input) => {
  if (!input) return null;

  if (input instanceof Date && isValid(input)) return input;

  if (typeof input === 'number') {
    const d = toDate(input);
    return isValid(d) ? d : null;
  }

  if (typeof input === 'string') {
    try {
      const iso = parseISO(input);
      if (isValid(iso)) return iso;
    } catch (error) {
      // Ignore parse errors, try next format
      void error;
    }

    // DD-MM-YYYY (e.g. activity feed due_date from backend)
    try {
      const ddmmyyyy = parse(input, 'dd-MM-yyyy', new Date());
      if (isValid(ddmmyyyy)) return ddmmyyyy;
    } catch (error) {
      void error;
    }

    try {
      const f1 = parse(input, 'yyyy-MM-dd HH:mm:ss.SSSSSS', new Date());
      if (isValid(f1)) return f1;
    } catch (error) {
      // Ignore parse errors, try next format
      void error;
    }

    try {
      const f2 = parse(input, 'yyyy-MM-dd HH:mm:ss', new Date());
      if (isValid(f2)) return f2;
    } catch (error) {
      // Ignore parse errors, try next format
      void error;
    }

    // Ordinal display formats used across project selection / layout UIs
    for (const fmt of ['do MMM yyyy', 'do MMM yy', 'd MMM yyyy', 'd MMM yy']) {
      try {
        const ordinal = parse(input, fmt, new Date());
        if (!isValid(ordinal)) continue;
        // date-fns `yy` can resolve to year 0–99; normalize to 2000–2099.
        if ((fmt.endsWith('yy') && !fmt.endsWith('yyyy')) || ordinal.getFullYear() < 100) {
          const year = ordinal.getFullYear();
          if (year >= 0 && year < 100) {
            ordinal.setFullYear(2000 + year);
          }
        }
        return ordinal;
      } catch (error) {
        void error;
      }
    }

    if (/^(?:\d{2}\/){2}\d{2,4}$/.test(input)) {
      return null; // Don't let DD/MM/YY fall through to loose native parsing
    }
    try {
      const fallback = toDate(input);
      return isValid(fallback) ? fallback : null;
    } catch {
      return null;
    }
  }

  return null;
};

/**
 * Whole years from date of birth to today (empty string when invalid or missing).
 */
export const calculateAgeFromDob = (dobInput) => {
  const date = parseToDate(dobInput);
  if (!date) return '';
  const years = differenceInYears(new Date(), date);
  if (!Number.isFinite(years) || years < 0) return '';
  return String(years);
};

/** Date-only display (e.g. DOB in tables): dd/MM/yyyy or lll dd, y */
export const formatDisplayDateOnly = (input, fallback = '') => {
  const date = parseToDate(input);
  if (!date) return input ? String(input) : fallback;
  return format(date, 'LLL dd, y') || format(date, 'dd/MM/yyyy');
};

/** Parse year of establishment from string (e.g. "2026" or "2026-01-01") */
export const parseYearOfEstablishment = (value) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return undefined;
  if (/^\d{4}$/.test(trimmed)) return parseToDate(`${trimmed}-01-01`) || undefined;
  return parseToDate(trimmed) || undefined;
};

/** First selectable calendar day for next update: strictly after due (`yyyy-MM-dd`). */
export const getMinCustomNextUpdateDate = (dueYmd) => {
  const due = String(dueYmd ?? '').trim();
  if (!due) return undefined;
  const parsed = parseToDate(due);
  if (!parsed || Number.isNaN(parsed.getTime())) return undefined;
  return startOfDay(addDays(parsed, 1));
};

export const attendanceDateFormat = (date) => {
  if (!date) return '';
  const d = parseToDate(date);
  if (!d || !isValid(d)) return '';
  return format(d, 'yyyy-MM-dd');
};

/**
 * Display datetime formatter
 */
export const formatDisplayDateTime = (input) => {
  const date = parseToDate(input);
  if (!date) return '';
  return format(date, DISPLAY_DATETIME_FORMAT_2);
};

/**
 * Formats a date for activity feed (e.g. due date changes): DD-MM-YYYY
 * Accepts any input supported by parseToDate.
 */
export const formatActivityDate = (input) => {
  const date = parseToDate(input);
  if (!date) return '';
  return format(date, 'dd-MM-yyyy');
};

/**
 * Formats date as "12th Dec 25" (day with ordinal, month abbreviation, 2-digit year)
 * Accepts timestamp, YYYY-MM-DD string, or Date object
 */
export const formatDateWithOrdinal = (input) => {
  const date = parseToDate(input);
  if (!date) return '';
  return format(date, 'do MMM yy');
};

/** Section keys for inbox grouping by date */
export const INBOX_SECTION_KEYS = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_7_DAYS: 'last7days',
  EARLIER_THIS_MONTH: 'earlierThisMonth',
};

/** Prefix for dynamic month sections: "month-YYYY-M" e.g. month-2026-2 */
export const INBOX_SECTION_MONTH_PREFIX = 'month-';
/** Prefix for dynamic year sections: "year-YYYY" e.g. year-2025 */
export const INBOX_SECTION_YEAR_PREFIX = 'year-';

/** Month names for section labels */
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

/**
 * Returns the ordered list of inbox section keys and labels for the current date.
 * Order: Today, Last 7 days, Earlier this month, then previous months (e.g. February, January), then previous year (e.g. 2025).
 * @returns {{ key: string, label: string }[]}
 */
export const getInboxSectionOrder = () => {
  const now = new Date();
  const currentYear = getYear(now);
  const currentMonth = getMonth(now);
  const sections = [
    { key: INBOX_SECTION_KEYS.TODAY, label: 'Today' },
    { key: INBOX_SECTION_KEYS.YESTERDAY, label: 'Yesterday' },
    { key: INBOX_SECTION_KEYS.LAST_7_DAYS, label: 'Last 7 days' },
    { key: INBOX_SECTION_KEYS.EARLIER_THIS_MONTH, label: 'Earlier this month' },
  ];
  for (let m = currentMonth - 1; m >= 0; m--) {
    const monthKey = `${INBOX_SECTION_MONTH_PREFIX}${currentYear}-${m + 1}`;
    sections.push({ key: monthKey, label: MONTH_NAMES[m] });
  }
  sections.push({
    key: `${INBOX_SECTION_YEAR_PREFIX}${currentYear - 1}`,
    label: String(currentYear - 1),
  });
  return sections;
};

/**
 * Returns the display label for an inbox section key (static or dynamic).
 * @param {string} sectionKey
 * @returns {string}
 */
export const getInboxSectionLabel = (sectionKey) => {
  if (sectionKey === INBOX_SECTION_KEYS.TODAY) return 'Today';
  if (sectionKey === INBOX_SECTION_KEYS.YESTERDAY) return 'Yesterday';
  if (sectionKey === INBOX_SECTION_KEYS.LAST_7_DAYS) return 'Last 7 days';
  if (sectionKey === INBOX_SECTION_KEYS.EARLIER_THIS_MONTH) return 'Earlier this month';
  if (sectionKey.startsWith(INBOX_SECTION_MONTH_PREFIX)) {
    const parts = sectionKey.slice(INBOX_SECTION_MONTH_PREFIX.length).split('-');
    const monthNumber = Number(parts[1], 10);
    if (monthNumber >= 1 && monthNumber <= 12) return MONTH_NAMES[monthNumber - 1];
  }
  if (sectionKey.startsWith(INBOX_SECTION_YEAR_PREFIX))
    return sectionKey.slice(INBOX_SECTION_YEAR_PREFIX.length);
  return sectionKey;
};

/**
 * Returns which inbox section a date falls into.
 * @param {string|Date|number} input - createdAt value
 * @returns {string} Section key (today, last7days, earlierThisMonth, month-YYYY-M, or year-YYYY)
 */
export const getInboxSection = (input) => {
  const date = parseToDate(input);
  if (!date) {
    const now = new Date();
    return `${INBOX_SECTION_YEAR_PREFIX}${getYear(now) - 1}`;
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const sevenDaysAgoStart = startOfDay(subDays(now, 7));
  const monthStart = startOfMonth(now);
  const dateYear = getYear(date);
  const dateMonth = getMonth(date);
  const currentYear = getYear(now);
  const currentMonth = getMonth(now);

  if (isToday(date)) return INBOX_SECTION_KEYS.TODAY;
  if (isYesterday(date)) return INBOX_SECTION_KEYS.YESTERDAY;
  if (isBefore(date, todayStart) && !isBefore(date, sevenDaysAgoStart))
    return INBOX_SECTION_KEYS.LAST_7_DAYS;
  if (isBefore(date, sevenDaysAgoStart) && !isBefore(date, monthStart))
    return INBOX_SECTION_KEYS.EARLIER_THIS_MONTH;
  if (dateYear === currentYear && dateMonth < currentMonth)
    return `${INBOX_SECTION_MONTH_PREFIX}${dateYear}-${dateMonth + 1}`;
  return `${INBOX_SECTION_YEAR_PREFIX}${dateYear}`;
};

/**
 * Formats inbox item date/time: today → time only (e.g. "11:52 AM"), else → "17th Feb 2026".
 * @param {string|Date|number} input - createdAt value
 * @returns {string}
 */
export const formatInboxDateTime = (input) => {
  const date = parseToDate(input);
  if (!date) return '';
  if (isToday(date)) return format(date, 'h:mm a');
  return format(date, 'MMM d');
};

/**
 * Format date for display with fallback (e.g. "12th Dec 25" or "--")
 */
export const formatDateDisplay = (value, fallback = '--') => {
  const s = formatDateWithOrdinal(value);
  return s || fallback;
};

/**
 * Format number as ordinal (e.g. 1 → "1st", 2 → "2nd", 3 → "3rd", 11 → "11th")
 */
export const formatOrdinal = (n) => {
  if (n == null || n === '') return '--';
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  const v = num % 100;
  if (v >= 11 && v <= 13) return `${num}th`;
  const s = ['th', 'st', 'nd', 'rd'];
  return `${num}${s[v % 10] || 'th'}`;
};

/**
 * Format to DD/MM/YYYY string. Accepts YYYY-MM-DD string, Date, or timestamp.
 */
export const formatToDDMMYYYY = (value) => {
  if (!value) return '';
  if (typeof value === 'string') {
    const converted = convertYYYYMMDDToDDMMYYYY(value);
    if (converted && converted !== value) return converted;
  }
  const date = parseToDate(value);
  if (!date) return '';
  return format(date, 'dd/MM/yyyy');
};

/**
 * Format to dd/MM/yy for Datepicker display (e.g. "09/03/26")
 */
export const formatDDMMYY = (input) => {
  const date = parseToDate(input);
  if (!date) return '';
  return format(date, 'dd/MM/yy');
};

/**
 * Format to yyyy-MM-dd for API / form values (e.g. "2026-03-09")
 */
export const formatDateToYYYYMMDD = (input) => {
  const date = parseToDate(input);
  if (!date) return '';
  return format(date, 'yyyy-MM-dd');
};

/**
 * Formats conflict dates for inline hint (e.g. "2nd Jun, 5th Jun and 3 more dates are unavailable.")
 */
export const formatConflictMessage = (conflicts) => {
  if (!conflicts || conflicts.length === 0) return '';
  const total = conflicts.length;
  const shown = conflicts.slice(0, 2).map(formatDateWithOrdinal);
  const remaining = total - shown.length;
  const baseText = shown.join(', ');
  if (remaining > 0) {
    return `${baseText} and ${remaining} more dates are unavailable.`;
  }
  return `${baseText} are unavailable.`;
};

/**
 * Formats a period range as "2nd Jun 25 - 10th Dec 25"
 * Accepts any inputs supported by parseToDate
 */
export const formatPeriod = (startDate, endDate) => {
  if (!startDate || !endDate) return '';

  const start = parseToDate(startDate);
  const end = parseToDate(endDate);

  if (!start || !end) return '';

  const startFormatted = formatDateWithOrdinal(start);
  const endFormatted = formatDateWithOrdinal(end);

  return `${startFormatted} - ${endFormatted}`;
};

/**
 * Formats a time range (e.g., "10:00 - 11:30 AM")
 * Accepts any inputs supported by parseToDate
 */
export const formatTimeRange = (start, end) => {
  if (!start || !end) return '';

  const startDate = parseToDate(start);
  const endDate = parseToDate(end);

  if (!startDate || !endDate) return '';

  const startTime = format(startDate, 'h:mm a');
  const endTime = format(endDate, 'h:mm a');
  return `${startTime} - ${endTime}`;
};

/**
 * Normalize Frappe Time field for `yyyy-MM-dd` + `T` + time (ISO-style) parsing.
 * Frappe may return single-digit hours (e.g. "5:00:00"); `parseISO` needs "05:00:00".
 */
export const normalizeApiTimeForLocalParse = (t) => {
  const s = String(t || '').trim();
  if (!s) return '00:00:00';

  const parts = s.split(':');
  if (parts.length < 2) return '00:00:00';

  const h = Math.min(23, Math.max(0, Number.parseInt(parts[0], 10) || 0));
  const m = Math.min(59, Math.max(0, Number.parseInt(parts[1], 10) || 0));
  const secPart = parts[2] == null ? '0' : String(parts[2]).split('.')[0];
  const sec = Math.min(59, Math.max(0, Number.parseInt(secPart, 10) || 0));

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const isBookingAllDay = (booking) =>
  booking?.all_day === 1 || booking?.all_day === true || Number(booking?.all_day) === 1;

/**
 * Single-line schedule label for Space Booking edit (supports booking_end_date spanning days).
 */
export const formatBookingScheduleLabel = (booking) => {
  if (!booking?.booking_date) return '';

  if (isBookingAllDay(booking)) {
    const sd = String(booking.booking_date).slice(0, 10);
    const ed = String(booking.booking_end_date || booking.booking_date).slice(0, 10);
    const d0 = parseToDate(sd);
    const d1 = parseToDate(ed);
    if (!d0 || !d1) return '';
    const same = format(d0, 'yyyy-MM-dd') === format(d1, 'yyyy-MM-dd');
    if (same) return `${format(d0, 'MMM d, yyyy')} (All day)`;
    return `${format(d0, 'MMM d, yyyy')} – ${format(d1, 'MMM d, yyyy')} (All day)`;
  }

  if (!booking?.start_time || !booking?.end_time) return '';

  const sd = String(booking.booking_date).slice(0, 10);
  const ed = String(booking.booking_end_date || booking.booking_date).slice(0, 10);
  const startDate = parseToDate(`${sd}T${normalizeApiTimeForLocalParse(booking.start_time)}`);
  const endDate = parseToDate(`${ed}T${normalizeApiTimeForLocalParse(booking.end_time)}`);

  if (!startDate || !endDate) return '';

  const sameCalendarDay = format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd');
  if (sameCalendarDay) {
    return `${format(startDate, 'MMM d, yyyy, h:mm a')} – ${format(endDate, 'h:mm a')}`;
  }
  return `${format(startDate, 'MMM d, yyyy, h:mm a')} – ${format(endDate, 'MMM d, yyyy, h:mm a')}`;
};

/**
 * Schedule line for calendar popover: prefers API fields via {@link formatBookingScheduleLabel},
 * then falls back to event `start` / `end` strings (multi-day aware).
 */
export const formatCalendarEventSchedule = (booking) => {
  if (!booking) return '';

  const primary = formatBookingScheduleLabel(booking);
  if (primary) return primary;

  if (!booking.start || !booking.end) return '';

  const startDate = parseToDate(booking.start);
  const endDate = parseToDate(booking.end);
  if (!startDate || !endDate) return '';

  if (isBookingAllDay(booking)) {
    const same = format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd');
    if (same) return `${format(startDate, 'MMM d, yyyy')} (All day)`;
    return `${format(startDate, 'MMM d, yyyy')} – ${format(endDate, 'MMM d, yyyy')} (All day)`;
  }

  const sameCalendarDay = format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd');
  if (sameCalendarDay) {
    return `${format(startDate, 'MMM d, yyyy, h:mm a')} – ${format(endDate, 'h:mm a')}`;
  }
  return `${format(startDate, 'MMM d, yyyy, h:mm a')} – ${format(endDate, 'MMM d, yyyy, h:mm a')}`;
};

/** Build ISO strings for DateTimePicker initial state from a booking row */
export const bookingToStartEndIsoStrings = (booking) => {
  if (!booking?.booking_date || !booking?.start_time || !booking?.end_time) {
    return { startIso: '', endIso: '' };
  }

  const sd = String(booking.booking_date).slice(0, 10);
  const ed = String(booking.booking_end_date || booking.booking_date).slice(0, 10);
  const startDate = parseToDate(`${sd}T${normalizeApiTimeForLocalParse(booking.start_time)}`);
  const endDate = parseToDate(`${ed}T${normalizeApiTimeForLocalParse(booking.end_time)}`);

  if (!startDate || !endDate) return { startIso: '', endIso: '' };

  return { startIso: formatISO(startDate), endIso: formatISO(endDate) };
};

/** Convert DateTimePicker ISO pair to Space Booking API fields */
export const isoPairToBookingFields = (startIso, endIso) => {
  if (!startIso || !endIso) return null;

  const start = parseISO(startIso);
  const end = parseISO(endIso);

  if (!isValid(start) || !isValid(end)) return null;

  return {
    booking_date: format(start, 'yyyy-MM-dd'),
    booking_end_date: format(end, 'yyyy-MM-dd'),
    start_time: format(start, 'HH:mm:ss'),
    end_time: format(end, 'HH:mm:ss'),
  };
};

// --- Events schedule (canonical `start_datetime` / `end_datetime`; booking helpers stay separate) ---

/**
 * ISO start/end for an Events list row from DocType datetimes.
 */
export function getEventRowScheduleIso(row) {
  const sd = row?.start_datetime;
  const ed = row?.end_datetime;
  if (sd != null && String(sd).trim() !== '' && ed != null && String(ed).trim() !== '') {
    const startDate = parseToDate(sd);
    const endDate = parseToDate(ed);
    if (startDate && endDate && isValid(startDate) && isValid(endDate)) {
      return {
        start_datetime: startDate.toISOString(),
        end_datetime: endDate.toISOString(),
      };
    }
  }
  return { start_datetime: '', end_datetime: '' };
}

/** API / ERP datetime string → ISO for form state. */
export function apiEventDatetimeToIso(value) {
  if (value == null || value === '') return '';
  const d = parseToDate(value);
  return d && isValid(d) ? d.toISOString() : '';
}

/** DateTimePicker value → ERP/Frappe local datetime string. */
export function formatEventDatetimeForApi(value) {
  const d = parseToDate(value);
  return d && isValid(d) ? format(d, 'yyyy-MM-dd HH:mm:ss') : '';
}

function formatEventScheduleIsoForTableCell(iso) {
  if (!iso) return '';
  const d = parseToDate(iso);
  return d && isValid(d) ? format(d, 'MMM d, yyyy, h:mm a') : '';
}

/** Table cell strings (date + time) derived from {@link getEventRowScheduleIso}. */
export function formatEventRowStartEndDisplay(row) {
  const { start_datetime, end_datetime } = getEventRowScheduleIso(row);
  return {
    start: formatEventScheduleIsoForTableCell(start_datetime),
    end: formatEventScheduleIsoForTableCell(end_datetime),
  };
}

/**
 * Formats a full date & time range for table display
 * Example: "20th Jan 24, 4:00 - 6:00 PM"
 * Accepts any inputs supported by parseToDate
 */
export const formatDateTimeRangeForTable = (start, end) => {
  if (!start || !end) return '-';

  const startDate = parseToDate(start);
  const endDate = parseToDate(end);
  if (!startDate || !endDate) return '-';

  const dateString = formatDateWithOrdinal(startDate);
  const timeString = formatTimeRange(start, end);
  return `${dateString}, ${timeString}`;
};

/**
 * Formats a date range label in DD/MM/YY - DD/MM/YY format
 * Accepts any inputs supported by parseToDate
 */
export const formatDateRangeLabel = (from, to, placeholder = 'DD/MM/YY - DD/MM/YY') => {
  if (!from || !to) return placeholder;

  const fromDate = parseToDate(from);
  const toDate = parseToDate(to);
  if (!fromDate || !toDate) return placeholder;

  const fromString = format(fromDate, 'dd/MM/yy');
  const toString_ = format(toDate, 'dd/MM/yy');
  return `${fromString} - ${toString_}`;
};

/**
 * Format month and year for display (e.g., "June 2025")
 * Accepts any inputs supported by parseToDate
 */
export const formatMonthYear = (input) => {
  if (!input) return '';

  const date = parseToDate(input);
  if (!date) return '';

  return format(date, 'MMMM yyyy');
};

/**
 * Safe display formatter
 */
export const safeDisplayDateTime = (input, fallback = '--') => {
  const value = formatDisplayDateTime(input);
  return value || fallback;
};

/**
 * Frappe `Duration` field stores total seconds. Short form e.g. `1d 22h 18m 29s`.
 * @param {unknown} value
 * @param {string} [fallback='--']
 */
export const formatDurationDisplay = (value, fallback = '--') => {
  if (value == null || value === '') return fallback;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return fallback;
  if (n === 0) return '0m';
  const {
    days = 0,
    hours = 0,
    minutes = 0,
    seconds = 0,
  } = intervalToDuration({
    start: fromUnixTime(0),
    end: fromUnixTime(n),
  });
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds) parts.push(`${seconds}s`);
  return parts.length > 0 ? parts.join(' ') : fallback;
};

// ============================================================
// SLA Utilities
// ============================================================

/**
 * SLA response countdown
 */
export const getResponseCountdown = (responseBy) => {
  const responseDate = parseToDate(responseBy);
  if (!responseDate) return null;

  const now = new Date();
  const minutesRemaining = differenceInMinutes(responseDate, now);

  if (minutesRemaining <= 0) {
    return { label: 'breached', isBreached: true, urgency: 'high' };
  }

  const urgency = minutesRemaining <= 60 ? 'high' : 'medium';

  if (minutesRemaining < 60) {
    return {
      label: `TAT in ${minutesRemaining} mins`,
      isBreached: false,
      urgency,
    };
  }

  const hours = Math.ceil(minutesRemaining / 60);
  return {
    label: `TAT in ${hours} hours`,
    isBreached: false,
    urgency,
  };
};

/**
 * SLA first-response duration
 */
export const getFirstResponseDuration = (firstRespondedOn, creation) => {
  const respondedDate = parseToDate(firstRespondedOn);
  if (!respondedDate) return null;

  const creationDate = parseToDate(creation) || respondedDate;
  const totalMinutes = Math.max(0, differenceInMinutes(respondedDate, creationDate));

  if (totalMinutes < 60) {
    const minutes = Math.max(1, totalMinutes);
    const label = minutes === 1 ? 'min' : 'mins';
    return `resolved in ${minutes} ${label}`;
  }

  const hours = Math.max(1, Math.ceil(totalMinutes / 60));
  const hLabel = hours === 1 ? 'hour' : 'hours';
  return `resolved in ${hours} ${hLabel}`;
};

// Time options for dropdowns (30-minute intervals, 12:00 AM - 11:30 PM)
export const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const totalHour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const hour = totalHour % 12 || 12;
  const period = totalHour < 12 ? 'AM' : 'PM';
  return `${hour}:${minute} ${period}`;
});

/**
 * Parse Visitor Entry `visit_date_time` from DB (space-separated or ISO) for date pickers.
 * @param {string|Date|null|undefined} raw
 * @returns {Date|null}
 */
export const visitDateTimeRawToDate = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim();
  let d;
  if (s.includes('T')) {
    d = parseISO(s);
  } else if (s.includes(' ')) {
    const [dp, tp] = s.split(' ');
    const normalized = normalizeApiTimeForLocalParse(tp || '00:00:00');
    d = parseISO(`${dp}T${normalized}`);
  } else {
    d = parseToDate(s);
  }
  return d && isValid(d) ? d : null;
};

/**
 * Map stored visit datetime to the nearest TIME_OPTIONS slot (30-minute grid).
 * @param {string|Date|null|undefined} raw
 * @returns {string}
 */
export const visitDateTimeRawToTimeOption = (raw) => {
  const d = visitDateTimeRawToDate(raw);
  if (!d) return '';
  const totalMinutes = d.getHours() * 60 + d.getMinutes();
  const idx = Math.min(47, Math.max(0, Math.round(totalMinutes / 30)));
  return TIME_OPTIONS[idx];
};

/**
 * Format time from API format (HH:mm:ss) to display format (h:mm a)
 * @param {string} timeString - Time in HH:mm:ss format (e.g., \"13:00:00\")
 * @returns {string} Time in display format (e.g., \"1:00 PM\")
 */
export const formatTimeFromAPI = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return '';
  try {
    // Parse time string in HH:mm:ss format
    const parsedTime = parse(timeString, 'HH:mm:ss', new Date());
    if (!parsedTime || Number.isNaN(parsedTime.getTime())) return '';
    // Format to display format (h:mm a) and uppercase
    return format(parsedTime, 'h:mm a').toUpperCase();
  } catch (error) {
    console.error('Error formatting time from API:', error);
    return '';
  }
};

/**
 * Format time from display format (h:mm a) to API format (HH:mm:ss)
 * @param {string} timeString - Time in display format (e.g., \"1:00 PM\")
 * @returns {string} Time in API format (e.g., \"13:00:00\")
 */
export const formatTimeToAPI = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return '';
  try {
    const parsedTime = parse(timeString, 'h:mm a', new Date());
    if (!parsedTime || Number.isNaN(parsedTime.getTime())) return '';
    return format(parsedTime, 'HH:mm:ss');
  } catch (error) {
    console.error('Error formatting time to API:', error);
    return '';
  }
};

/** Convert ISO datetime string to API time field (HH:mm:ss). */
export const formatIsoDatetimeToApiTime = (isoString) => {
  if (!isoString || typeof isoString !== 'string') return '';
  try {
    const d = parseISO(isoString);
    if (!d || Number.isNaN(d.getTime())) return '';
    return format(d, 'HH:mm:ss');
  } catch {
    return '';
  }
};

/**
 * Validate time format (h:mm a or h:mm AM/PM)
 * @param {string} timeStr - Time string to validate
 * @returns {boolean} True if valid format
 */
export const isValidTimeFormat = (timeString) => {
  if (!timeString) return false;
  return /^(1[0-2]|0?[1-9]):[0-5]\d\s+(am|pm)$/i.test(timeString);
};

/**
 * Compare if end time is after start time
 * @param {string} startTimeStr - Start time in display format
 * @param {string} endTimeStr - End time in display format
 * @returns {boolean} True if end time is after start time
 */
export const isEndTimeAfterStartTime = (startTimeString, endTimeString) => {
  if (!startTimeString || !endTimeString) return true; // Skip validation if either is empty
  try {
    const start = parse(startTimeString, 'h:mm a', new Date());
    const end = parse(endTimeString, 'h:mm a', new Date());
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return true;
    return end > start;
  } catch {
    return true;
  }
};

/**
 * Validate time pair (start and end)
 * @param {string} startTime - Start time string
 * @param {string} endTime - End time string
 * @returns {{isValid: boolean, errors: {start_time?: string, end_time?: string}}}
 */
export const validateTimePair = (startTime, endTime) => {
  const errors = {};
  let isValidTime = true;

  // Validate start time format
  if (startTime && !isValidTimeFormat(startTime)) {
    errors.start_time = 'Invalid time format. Use format: 12:00 AM';
    isValidTime = false;
  }

  // Validate end time format
  if (endTime && !isValidTimeFormat(endTime)) {
    errors.end_time = 'Invalid time format. Use format: 12:00 PM';
    isValidTime = false;
  }

  // Validate time range (end after start)
  if (isValidTime && startTime && endTime && !isEndTimeAfterStartTime(startTime, endTime)) {
    errors.end_time = 'End time must be after start time';
    isValidTime = false;
  }

  return { isValid: isValidTime, errors };
};

// ============================================================
// Weekly Navigation Utilities
// ============================================================

/**
 * Get the 4 static week start dates for a given month
 * Weeks start on: 1st, 8th, 15th, 22nd of each month
 * @param {Date|string|number} monthDate - Any date in the month
 * @returns {Date[]} Array of 4 week start dates
 */
export const getWeekStartDatesForMonth = (monthDate) => {
  const date = parseToDate(monthDate);
  if (!date) return [];

  const monthStart = startOfMonth(date);
  return [1, 8, 15, 22].map((day) => setDate(monthStart, day));
};

/**
 * Format date to YYYY-MM-DD format for API
 * @param {Date|string|number} dateInput - Date to format
 * @returns {string} Date in YYYY-MM-DD format or empty string
 */
export const formatDateToISO = (dateInput) => {
  const date = parseToDate(dateInput);
  if (!date) return '';
  return format(date, 'yyyy-MM-dd');
};

/**
 * Get the next week's start date for weekly navigation
 * Cycles through: 1st, 8th, 15th, 22nd, then to next month's 1st
 * @param {Date|string|number} currentDate - Current week start date
 * @returns {string} Next week start date in YYYY-MM-DD format
 */
export const getNextWeekDate = (currentDate) => {
  const date = parseToDate(currentDate);
  if (!date) return '';

  const dayOfMonth = getDate(date);
  let nextDay;
  let nextMonth = getMonth(date);
  let nextYear = getYear(date);

  // Cycle through week starts: 1 → 8 → 15 → 22 → 1 (next month)
  if (dayOfMonth < 8) {
    nextDay = 8;
  } else if (dayOfMonth < 15) {
    nextDay = 15;
  } else if (dayOfMonth < 22) {
    nextDay = 22;
  } else {
    nextDay = 1;
    nextMonth += 1;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
  }

  const nextDate = parse(
    `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`,
    'yyyy-MM-dd',
    new Date(),
  );
  if (!isValid(nextDate)) return '';
  return formatDateToISO(nextDate);
};

/**
 * Get the previous week's start date for weekly navigation
 * Cycles through: 22nd, 15th, 8th, 1st, then to previous month's 22nd
 * @param {Date|string|number} currentDate - Current week start date
 * @returns {string} Previous week start date in YYYY-MM-DD format
 */
export const getPreviousWeekDate = (currentDate) => {
  const date = parseToDate(currentDate);
  if (!date) return '';

  const dayOfMonth = getDate(date);
  let prevDay;
  let prevMonth = getMonth(date);
  let prevYear = getYear(date);

  // Cycle through week starts: 22 → 15 → 8 → 1 → 22 (previous month)
  if (dayOfMonth > 22) {
    prevDay = 22;
  } else if (dayOfMonth > 15) {
    prevDay = 15;
  } else if (dayOfMonth > 8) {
    prevDay = 8;
  } else if (dayOfMonth > 1) {
    prevDay = 1;
  } else {
    prevDay = 22;
    prevMonth -= 1;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear -= 1;
    }
  }

  const prevDate = parse(
    `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevDay).padStart(2, '0')}`,
    'yyyy-MM-dd',
    new Date(),
  );
  if (!isValid(prevDate)) return '';
  return formatDateToISO(prevDate);
};

/**
 * Get the next year for annual navigation
 * @param {Date|string|number} currentDate - Current date
 * @returns {string} Next year's date (Jan 1st) in YYYY-MM-DD format
 */
export const getNextYearDate = (currentDate) => {
  const date = parseToDate(currentDate);
  if (!date) return '';

  return formatDateToISO(startOfYear(addYears(date, 1)));
};

/**
 * Get the previous year for annual navigation
 * @param {Date|string|number} currentDate - Current date
 * @returns {string} Previous year's date (Jan 1st) in YYYY-MM-DD format
 */
export const getPreviousYearDate = (currentDate) => {
  const date = parseToDate(currentDate);
  if (!date) return '';

  return formatDateToISO(startOfYear(subYears(date, 1)));
};

/**
 * Extract year from a date string or date object
 * @param {Date|string|number} dateInput - Date to extract year from
 * @returns {string} Year as string (e.g., "2026")
 */
export const extractYear = (dateInput) => {
  const date = parseToDate(dateInput);
  if (!date) return '';
  return String(getYear(date));
};

// ============================================================
// Datetime filter helpers (CRM list filters)
// ============================================================

const DATETIME_FILTER_WEEK_OPTIONS = { weekStartsOn: 1 };

export function normalizeDatetimeFilter(value) {
  if (!value || typeof value !== 'object') return { ...DEFAULT_DATETIME_FILTER };
  return {
    preset: value.preset || DATETIME_FILTER_PRESET.ANY_TIME,
    date: value.date || null,
    from: value.from || null,
    to: value.to || null,
  };
}

export function isCalendarPreset(preset) {
  return (
    preset === DATETIME_FILTER_PRESET.IS_BEFORE ||
    preset === DATETIME_FILTER_PRESET.IS_AFTER ||
    preset === DATETIME_FILTER_PRESET.IS_BETWEEN
  );
}

export function shouldShowDatetimeCalendar(preset) {
  return (
    preset &&
    preset !== DATETIME_FILTER_PRESET.ANY_TIME &&
    preset !== DATETIME_FILTER_PRESET.IS_EMPTY &&
    preset !== DATETIME_FILTER_PRESET.IS_NOT_EMPTY
  );
}

export function toDateOrUndefined(value) {
  if (!value) return undefined;
  const date = parseToDate(value);
  return date || undefined;
}

export function toIsoDateString(date) {
  if (!date) return null;
  const parsed = date instanceof Date ? date : parseToDate(date);
  if (!parsed) return null;
  return formatDateToYYYYMMDD(parsed);
}

function resolveDatetimeFilterPresetRange(preset, now = new Date()) {
  switch (preset) {
    case DATETIME_FILTER_PRESET.LAST_30_MINUTES:
      return { from: subMinutes(now, 30), to: now, useDatetime: true };
    case DATETIME_FILTER_PRESET.LAST_60_MINUTES:
      return { from: subMinutes(now, 60), to: now, useDatetime: true };
    case DATETIME_FILTER_PRESET.LAST_2_HOURS:
      return { from: subHours(now, 2), to: now, useDatetime: true };
    case DATETIME_FILTER_PRESET.LAST_24_HOURS:
      return { from: subHours(now, 24), to: now, useDatetime: true };
    case DATETIME_FILTER_PRESET.YESTERDAY: {
      const day = subDays(now, 1);
      return { from: startOfDay(day), to: endOfDay(day), useDatetime: true };
    }
    case DATETIME_FILTER_PRESET.TODAY:
      return { from: startOfDay(now), to: endOfDay(now), useDatetime: true };
    case DATETIME_FILTER_PRESET.LAST_WEEK: {
      const previousWeek = subWeeks(now, 1);
      return {
        from: startOfWeek(previousWeek, DATETIME_FILTER_WEEK_OPTIONS),
        to: endOfWeek(previousWeek, DATETIME_FILTER_WEEK_OPTIONS),
        useDatetime: true,
      };
    }
    case DATETIME_FILTER_PRESET.THIS_WEEK:
      return {
        from: startOfWeek(now, DATETIME_FILTER_WEEK_OPTIONS),
        to: now,
        useDatetime: true,
      };
    case DATETIME_FILTER_PRESET.LAST_MONTH: {
      const previousMonth = subMonths(now, 1);
      return {
        from: startOfMonth(previousMonth),
        to: endOfMonth(previousMonth),
        useDatetime: true,
      };
    }
    case DATETIME_FILTER_PRESET.THIS_MONTH:
      return { from: startOfMonth(now), to: now, useDatetime: true };
    case DATETIME_FILTER_PRESET.LAST_7_DAYS:
      return { from: startOfDay(subDays(now, 7)), to: now, useDatetime: true };
    case DATETIME_FILTER_PRESET.LAST_30_DAYS:
      return { from: startOfDay(subDays(now, 30)), to: now, useDatetime: true };
    case DATETIME_FILTER_PRESET.LAST_60_DAYS:
      return { from: startOfDay(subDays(now, 60)), to: now, useDatetime: true };
    case DATETIME_FILTER_PRESET.LAST_90_DAYS:
      return { from: startOfDay(subDays(now, 90)), to: now, useDatetime: true };
    case DATETIME_FILTER_PRESET.LAST_180_DAYS:
      return { from: startOfDay(subDays(now, 180)), to: now, useDatetime: true };
    case DATETIME_FILTER_PRESET.LAST_365_DAYS:
      return { from: startOfDay(subDays(now, 365)), to: now, useDatetime: true };
    case DATETIME_FILTER_PRESET.LAST_QUARTER: {
      const previousQuarter = subQuarters(now, 1);
      return {
        from: startOfQuarter(previousQuarter),
        to: endOfQuarter(previousQuarter),
        useDatetime: true,
      };
    }
    case DATETIME_FILTER_PRESET.THIS_QUARTER:
      return { from: startOfQuarter(now), to: now, useDatetime: true };
    case DATETIME_FILTER_PRESET.LAST_YEAR: {
      const previousYear = subYears(now, 1);
      return {
        from: startOfYear(previousYear),
        to: endOfYear(previousYear),
        useDatetime: true,
      };
    }
    case DATETIME_FILTER_PRESET.THIS_YEAR:
      return { from: startOfYear(now), to: now, useDatetime: true };
    default:
      return null;
  }
}

export function getDatetimeFilterCalendarSelection(filter) {
  const normalized = normalizeDatetimeFilter(filter);
  const { preset } = normalized;

  if (preset === DATETIME_FILTER_PRESET.IS_BETWEEN) {
    const fromDate = toDateOrUndefined(normalized.from);
    const toDate = toDateOrUndefined(normalized.to);
    return {
      mode: 'range',
      selected: { from: fromDate, to: toDate },
      defaultMonth: fromDate || toDate || new Date(),
    };
  }

  if (preset === DATETIME_FILTER_PRESET.IS_BEFORE || preset === DATETIME_FILTER_PRESET.IS_AFTER) {
    const singleDate = toDateOrUndefined(normalized.date);
    return {
      mode: 'single',
      selected: singleDate,
      defaultMonth: singleDate || new Date(),
    };
  }

  const range = resolveDatetimeFilterPresetRange(preset);
  if (range) {
    return {
      mode: 'range',
      selected: { from: startOfDay(range.from), to: startOfDay(range.to) },
      defaultMonth: startOfDay(range.from),
    };
  }

  return {
    mode: 'range',
    selected: undefined,
    defaultMonth: new Date(),
  };
}

/** DateRangePicker `{ from, to }` for an active datetime filter (Created At toolbar sync). */
export function getDatetimeFilterDateRange(filter) {
  const normalized = normalizeDatetimeFilter(filter);
  const { preset } = normalized;

  if (
    !preset ||
    preset === DATETIME_FILTER_PRESET.ANY_TIME ||
    preset === DATETIME_FILTER_PRESET.IS_EMPTY ||
    preset === DATETIME_FILTER_PRESET.IS_NOT_EMPTY
  ) {
    return null;
  }

  const selection = getDatetimeFilterCalendarSelection(filter);

  if (selection.mode === 'single' && selection.selected) {
    if (preset === DATETIME_FILTER_PRESET.IS_BEFORE) {
      return { to: selection.selected };
    }
    if (preset === DATETIME_FILTER_PRESET.IS_AFTER) {
      return { from: selection.selected };
    }
  }

  if (selection.selected?.from || selection.selected?.to) {
    return selection.selected;
  }

  return null;
}

/** Map toolbar DateRangePicker selection to Created At datetime filter state. */
export function datetimeFilterFromDateRange(range) {
  if (!range?.from && !range?.to) {
    return { ...DEFAULT_DATETIME_FILTER };
  }

  const fromDate = range.from || range.to;
  const toDate = range.to || range.from;

  return normalizeDatetimeFilter({
    preset: DATETIME_FILTER_PRESET.IS_BETWEEN,
    from: toIsoDateString(fromDate),
    to: toIsoDateString(toDate),
  });
}

export function countActiveDatetimeFilter(filter) {
  const normalized = normalizeDatetimeFilter(filter);
  if (!normalized.preset || normalized.preset === DATETIME_FILTER_PRESET.ANY_TIME) return 0;
  if (normalized.preset === DATETIME_FILTER_PRESET.IS_BETWEEN && !normalized.from) return 0;
  if (
    (normalized.preset === DATETIME_FILTER_PRESET.IS_BEFORE ||
      normalized.preset === DATETIME_FILTER_PRESET.IS_AFTER) &&
    !normalized.date
  ) {
    return 0;
  }
  return 1;
}

/**
 * Convert a datetime filter state object into a Frappe list filter tuple, e.g.
 * ['between', ['2026-01-01 00:00:00', '2026-01-31 23:59:59']].
 */
export function buildDatetimeApiFilter(filter) {
  const normalized = normalizeDatetimeFilter(filter);
  const { preset } = normalized;
  if (!preset || preset === DATETIME_FILTER_PRESET.ANY_TIME) return null;

  if (preset === DATETIME_FILTER_PRESET.IS_EMPTY) {
    return ['is', 'not set'];
  }
  if (preset === DATETIME_FILTER_PRESET.IS_NOT_EMPTY) {
    return ['is', 'set'];
  }
  if (preset === DATETIME_FILTER_PRESET.IS_BEFORE) {
    if (!normalized.date) return null;
    const date = parseToDate(normalized.date);
    if (!date) return null;
    return ['<', formatDateToYYYYMMDD(startOfDay(date))];
  }
  if (preset === DATETIME_FILTER_PRESET.IS_AFTER) {
    if (!normalized.date) return null;
    const date = parseToDate(normalized.date);
    if (!date) return null;
    return ['>', formatDateToYYYYMMDD(endOfDay(date))];
  }
  if (preset === DATETIME_FILTER_PRESET.IS_BETWEEN) {
    if (!normalized.from) return null;
    const fromDate = parseToDate(normalized.from);
    const toDate = parseToDate(normalized.to || normalized.from);
    if (!fromDate || !toDate) return null;
    return [
      'between',
      [
        formatEventDatetimeForApi(startOfDay(fromDate)),
        formatEventDatetimeForApi(endOfDay(toDate)),
      ],
    ];
  }

  const range = resolveDatetimeFilterPresetRange(preset);
  if (!range) return null;

  const formatValue = range.useDatetime ? formatEventDatetimeForApi : formatDateToYYYYMMDD;
  return ['between', [formatValue(range.from), formatValue(range.to)]];
}

export function formatDatetimeFilterSummary(filter) {
  const normalized = normalizeDatetimeFilter(filter);
  const option = DATETIME_FILTER_PRESET_OPTIONS.find((item) => item.value === normalized.preset);
  if (!option || normalized.preset === DATETIME_FILTER_PRESET.ANY_TIME) return '';

  if (normalized.preset === DATETIME_FILTER_PRESET.IS_BETWEEN) {
    const fromText = formatDateToYYYYMMDD(normalized.from);
    const toText = formatDateToYYYYMMDD(normalized.to || normalized.from);
    if (fromText || toText) return `${fromText || '—'} → ${toText || '—'}`;
  }

  if (
    normalized.preset === DATETIME_FILTER_PRESET.IS_BEFORE ||
    normalized.preset === DATETIME_FILTER_PRESET.IS_AFTER
  ) {
    const dateText = formatDateToYYYYMMDD(normalized.date);
    if (dateText) return `${option.label} ${dateText}`;
  }

  return option.label;
}

/** Returns true when `value` satisfies an active datetime filter (client-side list filtering). */
export function matchesDatetimeFilter(value, filter) {
  const normalized = normalizeDatetimeFilter(filter);
  const { preset } = normalized;
  if (!preset || preset === DATETIME_FILTER_PRESET.ANY_TIME) return true;

  const date = parseToDate(value);

  if (preset === DATETIME_FILTER_PRESET.IS_EMPTY) {
    return !date;
  }
  if (preset === DATETIME_FILTER_PRESET.IS_NOT_EMPTY) {
    return Boolean(date);
  }
  if (!date) return false;

  if (preset === DATETIME_FILTER_PRESET.IS_BEFORE) {
    const bound = parseToDate(normalized.date);
    if (!bound) return true;
    return date < startOfDay(bound);
  }
  if (preset === DATETIME_FILTER_PRESET.IS_AFTER) {
    const bound = parseToDate(normalized.date);
    if (!bound) return true;
    return date > endOfDay(bound);
  }
  if (preset === DATETIME_FILTER_PRESET.IS_BETWEEN) {
    const fromDate = parseToDate(normalized.from);
    const toDate = parseToDate(normalized.to || normalized.from);
    if (!fromDate) return true;
    return date >= startOfDay(fromDate) && date <= endOfDay(toDate);
  }

  const range = resolveDatetimeFilterPresetRange(preset);
  if (!range) return true;
  return date >= range.from && date <= range.to;
}

/** Map CRM Accounts toolbar filters to list API filter dict. */
export function buildCrmAccountApiFilters(appliedFilters = {}, extraFilters = {}) {
  const filters = { ...extraFilters };

  if (appliedFilters.type_of_organization?.length > 0) {
    filters.customer_group = ['in', appliedFilters.type_of_organization];
  }
  if (appliedFilters.industry?.length > 0) {
    filters.industry = ['in', appliedFilters.industry];
  }

  const createdAtFilter = buildDatetimeApiFilter(appliedFilters.created_at);
  if (createdAtFilter) {
    filters.creation = createdAtFilter;
  }
  const lastModifiedFilter = buildDatetimeApiFilter(appliedFilters.last_modified_at);
  if (lastModifiedFilter) {
    filters.modified = lastModifiedFilter;
  }

  return filters;
}

/**
 * Map CRM Leads toolbar filters to list API filter dict.
 *
 * When `assignedToMe` is true, sets `assigned_to_me: 1`. Backend
 * `get_crm_lead_list` / count endpoints must treat that as “current session
 * user is Sales Owner OR Inside Sales” and ignore `sales_owner` /
 * `inside_sales` multi-selects. If the API ignores the key, Me mode UI will
 * look active while still returning everyone’s leads.
 */
export function buildCrmLeadApiFilters(
  appliedFilters = {},
  extraFilters = {},
  { assignedToMe = false } = {},
) {
  const filters = { ...extraFilters };

  if (assignedToMe) {
    filters.assigned_to_me = 1;
    delete filters.sales_owner;
    delete filters.inside_sales;
  }

  if (appliedFilters.lifecycle_stage?.length > 0) {
    filters.lifecycle_stage = ['in', appliedFilters.lifecycle_stage];
  }
  if (appliedFilters.status?.length > 0) {
    filters.status = ['in', appliedFilters.status];
  }
  if (appliedFilters.lead_of?.length > 0) {
    filters.lead_of = ['in', appliedFilters.lead_of];
  }
  // Me mode owns sales_owner / inside_sales — skip those multi-selects when active.
  if (!assignedToMe && appliedFilters.sales_owner?.length > 0) {
    filters.sales_owner = ['in', appliedFilters.sales_owner];
  }
  if (!assignedToMe && appliedFilters.inside_sales?.length > 0) {
    filters.inside_sales = ['in', appliedFilters.inside_sales];
  }
  if (appliedFilters.city?.length > 0) {
    filters.city = ['in', appliedFilters.city];
  }
  if (appliedFilters.product?.length > 0) {
    filters.product = ['in', appliedFilters.product];
  }
  if (appliedFilters.lead_source?.length > 0) {
    filters.lead_source = ['in', appliedFilters.lead_source];
  }
  if (appliedFilters.lead_relevance?.length > 0) {
    filters.lead_relevance = ['in', appliedFilters.lead_relevance];
  }
  if (appliedFilters.need_urgency?.length > 0) {
    filters.need_urgency = ['in', appliedFilters.need_urgency];
  }
  if (appliedFilters.info_call_status?.length > 0) {
    filters.info_call_status = ['in', appliedFilters.info_call_status];
  }
  if (appliedFilters.lost_reason?.length > 0) {
    filters.lost_reason = ['in', appliedFilters.lost_reason];
  }
  if (appliedFilters.contact?.length > 0) {
    filters.contact = ['in', appliedFilters.contact];
  }
  if (appliedFilters.account?.length > 0) {
    filters.account = ['in', appliedFilters.account];
  }
  if (appliedFilters.source?.length > 0) {
    filters.source = ['in', appliedFilters.source];
  }

  const createdAtFilter = buildDatetimeApiFilter(appliedFilters.created_at);
  if (createdAtFilter) {
    filters.creation = createdAtFilter;
  }
  const lastModifiedFilter = buildDatetimeApiFilter(appliedFilters.last_modified_at);
  if (lastModifiedFilter) {
    filters.modified = lastModifiedFilter;
  }

  return filters;
}

/** Map CRM Contacts toolbar filters to list API filter dict. */
export function buildCrmContactApiFilters(appliedFilters = {}, extraFilters = {}) {
  const filters = { ...extraFilters };

  if (appliedFilters.account?.length > 0) {
    filters.associate_account = ['in', appliedFilters.account];
  }
  if (appliedFilters.sales_owner?.length > 0) {
    filters.sales_owner = ['in', appliedFilters.sales_owner];
  }
  if (appliedFilters.designation?.length > 0) {
    filters.designation = ['in', appliedFilters.designation];
  }
  if (appliedFilters.department?.length > 0) {
    filters.department = ['in', appliedFilters.department];
  }
  if (appliedFilters.city?.length > 0) {
    filters.city = ['in', appliedFilters.city];
  }
  if (appliedFilters.subscription_status?.length > 0) {
    filters.subscription_status = ['in', appliedFilters.subscription_status];
  }

  const createdAtFilter = buildDatetimeApiFilter(appliedFilters.created_at);
  if (createdAtFilter) {
    filters.creation = createdAtFilter;
  }
  const lastModifiedFilter = buildDatetimeApiFilter(appliedFilters.last_modified_at);
  if (lastModifiedFilter) {
    filters.modified = lastModifiedFilter;
  }

  return filters;
}
