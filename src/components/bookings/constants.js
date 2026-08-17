// Booking Constants
import { format } from 'date-fns';
import { MONTH_OPTIONS } from '@/constants/constants';
import { formatDateWithOrdinal } from '@/utils/date-utils';

// Recurrence Type Enum (also matches backend recurrence strings for recurring bookings)
export const RecurrenceType = {
  ONE_TIME: 'One Time',
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  ANNUALLY: 'Annually',
};

// Helper to generate ordinal day labels (1st, 2nd, 3rd, ...)
const getOrdinalLabel = (n) => {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
};

// Recurring date options for 1–31, used in Monthly / Quarterly / Annually dropdowns
export const RECURRING_DATE_OPTIONS = Array.from({ length: 31 }, (_, index) => {
  const day = index + 1;
  return {
    value: String(day), // used as numeric string; API gets Number.parseInt(...)
    label: getOrdinalLabel(day),
  };
});

// Recurring month options (1–12) with full month names
export const RECURRING_MONTH_OPTIONS = MONTH_OPTIONS.map((label, index) => ({
  value: String(index + 1), // numeric string; API gets Number.parseInt(...)
  label,
}));

// Recurrence End Type Enum
export const RecurrenceEndType = {
  ON_DATE: 'on_date',
  AFTER_OCCURRENCES: 'after_occurrences',
  NEVER: 'never',
};

// Booking calendar auto-refresh interval (in milliseconds)
export const BOOKING_CALENDAR_UPDATE_INTERVAL_MS = 60000;
// Developer config: how many consecutive days to render in calendar timeline
export const BOOKING_CALENDAR_TIMELINE_DAYS = 2;

// Booking Status - Single source of truth (matches backend status options)
export const BOOKING_STATUS = {
  upcoming: {
    label: 'Upcoming',
    badgeColor: 'yellow',
  },
  ongoing: {
    label: 'Ongoing',
    badgeColor: 'blue',
  },
  completed: {
    label: 'Completed',
    badgeColor: 'green',
  },
  cancelled: {
    label: 'Cancelled',
    badgeColor: 'red',
  },
};

// Conflict Status Enum (internal use only)
const ConflictStatus = {
  NO_CONFLICT: 'no_conflict',
  HAS_CONFLICT: 'has_conflict',
  PARTIALLY_AVAILABLE: 'partially_available',
};

// Days of Week Enum - 0 (Monday) to 6 (Sunday)
export const DaysOfWeek = {
  MONDAY: '0',
  TUESDAY: '1',
  WEDNESDAY: '2',
  THURSDAY: '3',
  FRIDAY: '4',
  SATURDAY: '5',
  SUNDAY: '6',
};

// Default Booking Form State
export const defaultBookingFormState = {
  data: {
    id: '',
    title: null,
    description: null,
    space: {
      centerId: '',
      centerName: '',
      resourceTypeId: '',
      resourceTypeName: '',
      spaceId: '',
      spaceName: '',
      creditsRequired: 0,
      capacity: 0,
      floor: null,
      amenities: [],
    },
    client: {
      clientId: '',
      clientName: '',
      clientType: 'registered',
      availableCredits: 0,
      email: null,
      phone: null,
      company: null,
    },
    dateTime: {
      date: '',
      startTime: '',
      endTime: '',
      allDay: false,
      durationMinutes: 0,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    recurrence: {
      type: RecurrenceType.ONE_TIME,
      endType: RecurrenceEndType.NEVER,
      endDate: null,
      occurrences: null,
      interval: 1,
      daysOfWeek: [],
      dayOfMonth: null,
      monthOfYear: null,
    },
    comment: null,
    creditSummary: {
      creditsPerOccurrence: 0,
      totalOccurrences: 1,
      totalCreditsRequired: 0,
      clientAvailableCredits: 0,
      creditsAfterBooking: 0,
      hasSufficientCredits: false,
    },
    conflictInfo: {
      status: ConflictStatus.NO_CONFLICT,
      conflictedDates: [],
      availableDates: [],
      message: null,
    },
    status: BOOKING_STATUS.upcoming.label,
    isRecurring: false,
    parentBookingId: null,
    occurrences: [],
    metadata: {
      createdBy: '',
      createdAt: '',
      updatedBy: null,
      updatedAt: null,
      cancelledBy: null,
      cancelledAt: null,
      cancellationReason: null,
    },
  },
  validation: {
    errors: {},
    touched: {},
    isValid: false,
  },
  isSubmitting: false,
  isDirty: false,
  submitError: null,
};

// Event ring colors (used by booking-event-renderer.jsx)
export const EVENT_RING_COLORS = {
  meeting: 'ring-blue-500',
  workshop: 'ring-orange-500',
  training: 'ring-purple-500',
  demo: 'ring-teal-500',
  event: 'ring-pink-500',
};

// Resource type badges (used by booking-resource-renderer.jsx)
export const RESOURCE_TYPE_BADGES = {
  'Meeting Room': 'pink',
  'Conference Room': 'purple',
  'Breakout Area': 'blue',
  'Training Room': 'yellow',
};

export const getResourceTypeBadge = (type) => {
  return RESOURCE_TYPE_BADGES[type] || RESOURCE_TYPE_BADGES['Meeting Room'];
};

// Empty states for bookings table (list view)
export const BOOKINGS_EMPTY_STATES = {
  default: {
    title: 'No bookings yet',
    description: 'Create your first booking to get started.',
  },
  search: {
    title: 'No bookings match these filters',
    description: 'Try adjusting filters or clearing search.',
  },
};

// Get status badge color (for Badge component color prop)
export const getBookingStatusBadgeColor = (status) => {
  if (!status) return 'gray';
  const normalized = String(status).toLowerCase().trim();
  return BOOKING_STATUS[normalized]?.badgeColor || 'gray';
};

// Get status badge styles
export const getBookingStatusBadgeStyles = (status) => {
  if (!status) {
    return {
      badgeColor: 'gray',
      label: '--',
    };
  }
  const normalized = String(status).toLowerCase().trim();
  return (
    BOOKING_STATUS[normalized] || {
      badgeColor: 'gray',
      label: String(status),
    }
  );
};

// Time options for time picker (30-minute intervals)
export const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const totalHour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const hour = totalHour % 12 || 12;
  const period = totalHour < 12 ? 'AM' : 'PM';
  return `${hour}:${minute} ${period}`;
});

// Recurrence Type Options
export const RECURRENCE_TYPE_OPTIONS = [
  { value: RecurrenceType.ONE_TIME, label: 'One Time' },
  { value: RecurrenceType.DAILY, label: 'Daily' },
  { value: RecurrenceType.WEEKLY, label: 'Weekly' },
  { value: RecurrenceType.MONTHLY, label: 'Monthly' },
  { value: RecurrenceType.QUARTERLY, label: 'Quarterly' },
  { value: RecurrenceType.ANNUALLY, label: 'Annually' },
];

// Days of Week - Consolidated mapping (Monday (0) to Sunday (6))
export const DAYS_OF_WEEK = [
  {
    value: DaysOfWeek.MONDAY,
    label: 'M',
    abbreviation: 'Mon',
    numeric: 0,
  },
  {
    value: DaysOfWeek.TUESDAY,
    label: 'T',
    abbreviation: 'Tue',
    numeric: 1,
  },
  {
    value: DaysOfWeek.WEDNESDAY,
    label: 'W',
    abbreviation: 'Wed',
    numeric: 2,
  },
  {
    value: DaysOfWeek.THURSDAY,
    label: 'T',
    abbreviation: 'Thu',
    numeric: 3,
  },
  {
    value: DaysOfWeek.FRIDAY,
    label: 'F',
    abbreviation: 'Fri',
    numeric: 4,
  },
  {
    value: DaysOfWeek.SATURDAY,
    label: 'S',
    abbreviation: 'Sat',
    numeric: 5,
  },
  {
    value: DaysOfWeek.SUNDAY,
    label: 'S',
    abbreviation: 'Sun',
    numeric: 6,
  },
];

export const transformBookingsForSchedule = (bookings) => {
  return bookings.map((booking) => ({
    ...booking,
    start: `${booking.booking_date} ${booking.start_time}`,
    end: `${booking.booking_end_date || booking.booking_date} ${booking.end_time}`,
    id: booking.name,
    _raw: booking,
  }));
};

// Helper to check if status is "upcoming" (editable time)
export const isStatusUpcoming = (status) => {
  if (!status) return false;
  const normalized = String(status).toLowerCase().trim();
  return normalized === 'upcoming' || normalized === 'pending' || normalized === 'confirmed';
};

/** Upcoming-style or Ongoing — can edit schedule and move space (not completed/cancelled). */
export const isScheduleOrSpaceEditable = (status) => {
  if (!status) return false;
  const normalized = String(status).toLowerCase().trim();
  return (
    normalized === 'upcoming' ||
    normalized === 'pending' ||
    normalized === 'confirmed' ||
    normalized === 'ongoing'
  );
};

// Helper to format time from timestamp or date string
// This is a factory function that returns a formatter function
// Usage: const formatter = formatTimeFromBooking(parseToDate, format);
//        const time = formatter(timeValue);
export const formatTimeFromBooking = (parseToDateFn, formatFn) => {
  return (timeValue) => {
    if (!timeValue || !parseToDateFn || !formatFn) return '';
    const date = parseToDateFn(timeValue);
    if (!date) return '';
    return formatFn(date, 'h:mm a');
  };
};

// Color gradient options for booking event cards (from Figma design)
export const BOOKING_COLOR_GRADIENTS = {
  teal: {
    gradient: 'from-[#c2efff] to-[#ebfaff]',
    textColor: 'text-[#164564]',
    borderColor: 'border-[#c2efff]',
    value: 'teal',
    ringColor: 'ring-teal-500',
  },
  purple: {
    gradient: 'from-[#cac2ff] to-[#eeebff]',
    textColor: 'text-[#2b1664]',
    borderColor: 'border-[#cac2ff]',
    value: 'purple',
    ringColor: 'ring-purple-500',
  },
  blue: {
    gradient: 'from-[#c2d6ff] to-[#ebf1ff]',
    textColor: 'text-[#162664]',
    borderColor: 'border-[#c2d6ff]',
    value: 'blue',
    ringColor: 'ring-blue-500',
  },
  pink: {
    gradient: 'from-[#f9c2ff] to-[#fdebff]',
    textColor: 'text-[#620f6c]',
    borderColor: 'border-[#f9c2ff]',
    value: 'pink',
    ringColor: 'ring-pink-500',
  },
  orange: {
    gradient: 'from-[#ffdac2] to-[#fef3eb]',
    textColor: 'text-[#6e330c]',
    borderColor: 'border-[#ffdac2]',
    value: 'orange',
    ringColor: 'ring-orange-500',
  },
};

// Get all gradient values as an array
export const BOOKING_GRADIENT_VALUES = Object.values(BOOKING_COLOR_GRADIENTS).map(
  (gradient) => gradient.value,
);

// Edit scope constants (match backend scope strings exactly)
export const BOOKING_EDIT_SCOPE = {
  THIS_ONLY: 'THIS_ONLY',
  THIS_AND_FOLLOWING: 'THIS_AND_FOLLOWING',
  ALL: 'ALL',
};

export const EDIT_SCOPE_MESSAGES = {
  [BOOKING_EDIT_SCOPE.THIS_ONLY]: 'You are editing this booking in the series.',
  [BOOKING_EDIT_SCOPE.THIS_AND_FOLLOWING]:
    'You are editing this and following bookings in the series.',
  [BOOKING_EDIT_SCOPE.ALL]: 'You are editing all bookings in the series.',
};

/** Per Figma: two options in the segment when editing this event. */
export const EDIT_SCOPE_TOGGLE_OPTIONS = [
  // "Edit Series" should target the entire series (ALL),
  // while the second option edits this and following bookings only.
  { value: BOOKING_EDIT_SCOPE.ALL, label: 'Edit Series' },
  { value: BOOKING_EDIT_SCOPE.THIS_AND_FOLLOWING, label: 'Edit This and all following bookings.' },
];

// Delete modal scopes (reuse backend scope constants)
export const DELETE_SCOPE_OPTIONS = [
  { value: BOOKING_EDIT_SCOPE.THIS_ONLY, label: 'This Booking' },
  { value: BOOKING_EDIT_SCOPE.THIS_AND_FOLLOWING, label: 'This & Upcoming Bookings' },
];

// Get a random color gradient for new bookings
export const getRandomColorGradient = () => {
  const gradients = BOOKING_GRADIENT_VALUES;
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const randomIndex = array[0] % gradients.length;
  return gradients[randomIndex];
};

// Get color gradient styles by value
export const getColorGradientStyles = (gradientValue) => {
  if (!gradientValue) {
    // Default to blue if no gradient is set
    return BOOKING_COLOR_GRADIENTS.blue;
  }
  return (
    Object.values(BOOKING_COLOR_GRADIENTS).find((g) => g.value === gradientValue) ||
    BOOKING_COLOR_GRADIENTS.blue
  );
};

// Get ring color for gradient value
export const getGradientRingColor = (gradientValue) => {
  const gradientStyles = getColorGradientStyles(gradientValue);
  return gradientStyles.ringColor || 'ring-blue-500';
};

/**
 * Formats recurrence pattern for display (matches Figma design)
 * @param {Object} recurrence - Recurrence object with backend field names (recurrence, week_days, recurrence_end_date, occurrence, recurring_date, recurring_month)
 * @returns {string} Formatted recurrence string (e.g., "Weekly, Wed, Thu & Fri, Until 17th Aug 25")
 */
export const formatRecurrencePattern = (recurrence) => {
  if (!recurrence) return '';

  // Use backend field name 'recurrence' for type, or fallback to 'type' for compatibility
  const recurrenceType = recurrence.recurrence || recurrence.type;
  if (!recurrenceType || recurrenceType === RecurrenceType.ONE_TIME) {
    return '';
  }

  const parts = [recurrenceType];

  // Helper to format ordinal day using date-fns
  const formatOrdinalDay = (day) => {
    if (!day || day < 1 || day > 31) return null;
    const date = new Date(2024, 0, day);
    return format(date, 'do');
  };

  // Helper to format days of week
  const formatDaysOfWeek = (weekDays) => {
    if (!weekDays) return null;

    const dayValues = Array.isArray(weekDays)
      ? weekDays
      : typeof weekDays === 'string'
        ? weekDays.split(',').map((d) => d.trim())
        : [];

    const dayAbbrevs = dayValues
      .map((day) => {
        const numericDay = Number.parseInt(day, 10);
        return DAYS_OF_WEEK.find((d) => d.numeric === numericDay)?.abbreviation;
      })
      .filter(Boolean);

    if (dayAbbrevs.length === 0) return null;
    if (dayAbbrevs.length === 1) return dayAbbrevs[0];
    if (dayAbbrevs.length === 2) return `${dayAbbrevs[0]} & ${dayAbbrevs[1]}`;
    const lastDay = dayAbbrevs.pop();
    return `${dayAbbrevs.join(', ')} & ${lastDay}`;
  };

  // Add days of week for weekly recurrence - use backend field name 'week_days'
  if (recurrenceType === RecurrenceType.WEEKLY) {
    const weekDays = recurrence.week_days || recurrence.daysOfWeek;
    const daysFormatted = formatDaysOfWeek(weekDays);
    if (daysFormatted) parts.push(daysFormatted);
  }

  // Add day pattern for Monthly/Quarterly recurrence - use backend field name 'recurring_date'
  if (
    (recurrenceType === RecurrenceType.MONTHLY || recurrenceType === RecurrenceType.QUARTERLY) &&
    (recurrence.recurring_date || recurrence.dayOfMonth)
  ) {
    const day = Number.parseInt(recurrence.recurring_date || recurrence.dayOfMonth, 10);
    const ordinalDay = formatOrdinalDay(day);
    if (ordinalDay) {
      const period = recurrenceType === RecurrenceType.MONTHLY ? 'Month' : 'Quarter';
      parts.push(`${ordinalDay} of Every ${period}`);
    }
  }

  // Add day and month pattern for Annually recurrence - use backend field names
  if (recurrenceType === RecurrenceType.ANNUALLY) {
    const day = recurrence.recurring_date || recurrence.dayOfMonth;
    const month = recurrence.recurring_month || recurrence.monthOfYear;
    if (day && month) {
      const dayNumber = Number.parseInt(day, 10);
      const monthNumber = Number.parseInt(month, 10);
      if (dayNumber >= 1 && dayNumber <= 31 && monthNumber >= 1 && monthNumber <= 12) {
        const date = new Date(2024, monthNumber - 1, dayNumber);
        const ordinalDay = format(date, 'do');
        const monthAbbr = format(date, 'MMM');
        parts.push(`${ordinalDay} ${monthAbbr} Every Year`);
      }
    } else if (day) {
      const ordinalDay = formatOrdinalDay(Number.parseInt(day, 10));
      if (ordinalDay) parts.push(`${ordinalDay} Every Year`);
    }
  }

  // Add end condition (matching Figma format) - use backend field names
  const endDate = recurrence.recurrence_end_date || recurrence.endDate;
  const occurrences = recurrence.occurrence || recurrence.occurrences;
  const endType = endDate
    ? RecurrenceEndType.ON_DATE
    : occurrences
      ? RecurrenceEndType.AFTER_OCCURRENCES
      : RecurrenceEndType.NEVER;

  if (endType === RecurrenceEndType.ON_DATE && endDate) {
    const endDateFormatted = formatDateWithOrdinal(endDate);
    if (endDateFormatted) parts.push(`Until ${endDateFormatted}`);
  } else if (endType === RecurrenceEndType.AFTER_OCCURRENCES && occurrences) {
    parts.push(`${occurrences} Times`);
  }

  return parts.join(', ');
};
