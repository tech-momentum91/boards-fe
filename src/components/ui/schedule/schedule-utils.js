/**
 * Calendar Utility Functions
 * Pure utility functions for time formatting, calculations, and date manipulation
 * No business logic, fully reusable across any calendar implementation
 */

import {
  addDays,
  compareAsc,
  differenceInMilliseconds,
  format,
  getHours,
  getMinutes,
  isAfter,
  isBefore,
  isSameDay as dfIsSameDay,
  isValid,
  parseISO,
  roundToNearestMinutes,
  set,
  setMilliseconds,
  setSeconds,
  startOfDay,
} from 'date-fns';

/** @param {string|Date|number|null|undefined} input */
const toDate = (input) => {
  if (input == null) return null;
  if (input instanceof Date && isValid(input)) return input;
  if (typeof input === 'string') {
    const iso = parseISO(input);
    if (isValid(iso)) return iso;
  }
  const d = new Date(input);
  return isValid(d) ? d : null;
};

// ============================================================================
// TIME FORMATTING
// ============================================================================

/**
 * Format an hour label for the time axis
 * @param {number} hour - Hour (0-23)
 * @returns {string} Formatted hour label (e.g., "9 AM", "12 PM")
 */
export const formatHourLabel = (hour) =>
  format(
    set(new Date(2020, 0, 1), { hours: hour, minutes: 0, seconds: 0, milliseconds: 0 }),
    'h a',
  );

/**
 * Format date to display format
 * @param {string|Date} date - Date to format
 * @param {'short' | 'long' | 'time'} preset - Display preset
 * @returns {string} Formatted date
 */
export const formatDate = (date, preset = 'short') => {
  const d = toDate(date);
  if (!d) return '';

  if (preset === 'short') {
    return format(d, 'MMM d, yy');
  }

  if (preset === 'long') {
    return format(d, 'EEEE, MMMM d, yyyy');
  }

  if (preset === 'time') {
    return format(d, 'h:mm a');
  }

  return format(d, 'P');
};

// ============================================================================
// POSITION CALCULATIONS
// ============================================================================

/**
 * Unified calculation for event geometry (position and size).
 * Works for both Time Grid (vertical) and Timeline (horizontal).
 *
 * @param {string|Date} start - Event start time
 * @param {string|Date} end - Event end time
 * @param {number} startHour - The hour the calendar grid starts (e.g., 0 for midnight)
 * @param {number} pixelsPerHour - Width (timeline) or Height (time grid) of one hour slot
 * @param {'vertical'|'horizontal'} orientation - Layout direction
 * @param {number} baseOffset - Optional starting offset (e.g., gutterHeight for TimeGrid)
 * @returns {{top: number, height: number}|{left: number, width: number}}
 */
export const calculateEventPosition = (
  start,
  end,
  startHour,
  pixelsPerHour = 120,
  orientation = 'horizontal',
  baseOffset = 0,
  rangeStart = null,
) => {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate || !endDate) {
    return orientation === 'vertical' ? { top: 0, height: 0 } : { left: 0, width: 0 };
  }

  const durationMs = differenceInMilliseconds(endDate, startDate);
  const durationHours = durationMs / 1000 / 60 / 60;
  const pixelSize = durationHours * pixelsPerHour;

  const rangeStartDate = rangeStart ? toDate(rangeStart) : null;
  const hoursFromStart = rangeStartDate
    ? differenceInMilliseconds(startDate, rangeStartDate) / (1000 * 60 * 60)
    : getHours(startDate) + getMinutes(startDate) / 60 - startHour;
  const pixelPosition = hoursFromStart * pixelsPerHour + baseOffset;

  if (orientation === 'vertical') {
    return { top: pixelPosition, height: pixelSize };
  }

  return { left: pixelPosition, width: pixelSize };
};

/**
 * Calculate current time position in the grid
 * @param {number} startHour - Calendar start hour
 * @param {number} endHour - Calendar end hour
 * @param {number} pixelsPerHour - Pixels per hour
 * @param {Date} currentTime - Current time (defaults to now)
 * @returns {number|null} Position in pixels, or null if outside range
 */
export const calculateCurrentTimePosition = (
  startHour,
  endHour,
  pixelsPerHour = 120,
  currentTime = new Date(),
  gutterTimeSlotHeight = 0,
) => {
  const hours = getHours(currentTime);
  const minutes = getMinutes(currentTime);

  if (hours < startHour || hours > endHour) {
    return null;
  }

  const minutesFromStart = (hours - startHour) * 60 + minutes;
  return (minutesFromStart / 60) * pixelsPerHour + gutterTimeSlotHeight;
};

// ============================================================================
// DATE MANIPULATION
// ============================================================================

/**
 * Check if an event is in the past
 * @param {string|Date} eventEndTime - Event end time
 * @param {Date} referenceTime - Reference time (defaults to now)
 * @returns {boolean} True if event has ended
 */
export const isEventPast = (eventEndTime, referenceTime = new Date()) => {
  const end = toDate(eventEndTime);
  if (!end) return false;
  return isBefore(end, referenceTime);
};

/**
 * Check if two dates are on the same day
 * @param {string|Date} date1 - First date
 * @param {string|Date} date2 - Second date
 * @returns {boolean} True if same day
 */
export const isSameDay = (date1, date2) => {
  const d1 = toDate(date1);
  const d2 = toDate(date2);
  if (!d1 || !d2) return false;
  return dfIsSameDay(d1, d2);
};

/**
 * Get duration between two times in minutes
 * @param {string|Date} start - Start time
 * @param {string|Date} end - End time
 * @returns {number} Duration in minutes
 */
export const getDurationMinutes = (start, end) => {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate || !endDate) return 0;
  return Math.round(differenceInMilliseconds(endDate, startDate) / 60000);
};

/**
 * Snap time to interval (for drag-to-create functionality)
 * @param {Date} time - Time to snap
 * @param {number} intervalMinutes - Interval in minutes (default: 30)
 * @returns {Date} Snapped time
 */
export const snapToInterval = (time, intervalMinutes = 30) => {
  const base = toDate(time) || new Date();
  const rounded = roundToNearestMinutes(base, { nearestTo: intervalMinutes });
  return setMilliseconds(setSeconds(rounded, 0), 0);
};

// ============================================================================
// TIME SLOT GENERATION
// ============================================================================

/**
 * Generate time slots for the calendar grid
 * @param {number} startHour - Start hour (0-23)
 * @param {number} endHour - End hour (0-23)
 * @returns {Array<{hour: number, label: string}>} Array of time slots
 */
export const generateTimeSlots = (
  startHour = 0,
  endHour = 23,
  timelineDays = 1,
  baseDate = new Date(),
) => {
  const slots = [];
  const hoursPerDay = endHour - startHour + 1;
  const safeTimelineDays = Math.max(1, timelineDays || 1);
  const baseDay = startOfDay(toDate(baseDate) || new Date());

  for (let dayOffset = 0; dayOffset < safeTimelineDays; dayOffset += 1) {
    const dayDate = addDays(baseDay, dayOffset);
    for (let step = 0; step < hoursPerDay; step += 1) {
      const hour = startHour + step;
      const slotDate = set(dayDate, { hours: hour, minutes: 0, seconds: 0, milliseconds: 0 });
      const dateLabel = format(slotDate, 'MMM d, yy');

      slots.push({
        hour,
        label: formatHourLabel(hour),
        dateLabel,
        dayOffset,
        isDayStart: step === 0,
        start: slotDate.toISOString(),
        key: `${slotDate.toISOString()}-${hour}`,
      });
    }
  }
  return slots;
};

// ============================================================================
// EVENT GROUPING
// ============================================================================

/**
 * Group events by resource ID
 * @param {Array} events - Array of events with space_id
 * @param {Function} eventTransformer - Maps raw bookings to schedule events
 * @returns {Object} Object mapping resource ID to events array
 */
export const groupEventsByResource = (events, eventTransformer) => {
  const grouped = {};
  events.forEach((event) => {
    if (!grouped[event.space_id]) {
      grouped[event.space_id] = [];
    }
    grouped[event.space_id] = eventTransformer(event.bookings);
  });
  return grouped;
};

/**
 * Detect overlapping events in a single resource
 * @param {Array} events - Array of events for a resource
 * @returns {Array} Array of events with overlap information
 */
export const detectOverlaps = (events) => {
  const sorted = [...events].sort((a, b) =>
    compareAsc(toDate(a.start) || new Date(0), toDate(b.start) || new Date(0)),
  );

  return sorted.map((event, index) => {
    const eventStart = toDate(event.start);
    const eventEnd = toDate(event.end);
    if (!eventStart || !eventEnd) {
      return { ...event, hasOverlap: false, overlapCount: 0 };
    }

    const overlaps = sorted.filter((other, otherIndex) => {
      if (index === otherIndex) return false;
      const otherStart = toDate(other.start);
      const otherEnd = toDate(other.end);
      if (!otherStart || !otherEnd) return false;

      return isBefore(otherStart, eventEnd) && isAfter(otherEnd, eventStart);
    });

    return {
      ...event,
      hasOverlap: overlaps.length > 0,
      overlapCount: overlaps.length,
    };
  });
};

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate if an event fits within calendar bounds
 * @param {string|Date} start - Event start time
 * @param {string|Date} end - Event end time
 * @param {number} startHour - Calendar start hour
 * @param {number} endHour - Calendar end hour
 * @returns {{valid: boolean, reason: string|null}} Validation result
 */
export const validateEventBounds = (start, end, startHour, endHour) => {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate || !endDate) {
    return { valid: false, reason: 'Invalid start or end time' };
  }

  if (!isAfter(endDate, startDate)) {
    return { valid: false, reason: 'End time must be after start time' };
  }

  const startHourValue = getHours(startDate);
  const endHourValue = getHours(endDate);

  if (startHourValue < startHour || endHourValue > endHour) {
    return { valid: false, reason: 'Event is outside calendar time range' };
  }

  return { valid: true, reason: null };
};

export const areTimesAdjacent = (timeA, timeB) => {
  if (!timeA || !timeB) return false;
  const a = toDate(timeA);
  const b = toDate(timeB);
  if (!a || !b) return false;
  return Math.abs(differenceInMilliseconds(a, b)) < 1000;
};

export const isGridLine = (time) => {
  const date = toDate(time);
  if (!date) return false;
  return getMinutes(date) === 0;
};
