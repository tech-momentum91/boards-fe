import { z } from 'zod';
import { startOfDay, parseISO } from 'date-fns';
import { RecurrenceType, RecurrenceEndType } from '@/components/bookings/constants';

// Helper to transform null/undefined to empty string for optional string fields
const optionalString = z
  .union([z.string(), z.array(z.string()), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(','); // Convert array to comma-separated string
    return value;
  })
  .pipe(z.string().optional());

// Helper for required string fields that handles null gracefully
const requiredString = (message) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => (value === null || value === undefined ? '' : value))
    .pipe(z.string().min(1, message));

const isoDatetimeRequired = (message) =>
  requiredString(message).refine(
    (val) => {
      const d = parseISO(val);
      return !Number.isNaN(d.getTime());
    },
    { message: 'Please select a valid date and time' },
  );

export const bookingSchema = z
  .object({
    title: optionalString,
    description: optionalString,
    comment: optionalString,
    book_for_any_center: z.boolean().optional(),
    center_id: requiredString('Please select a center'),
    resource_type_id: requiredString('Please select a resource type'),
    space_id: requiredString('Please select a space'),
    client_id: requiredString('Please select a client'),
    start_datetime: isoDatetimeRequired('Please select a start date and time'),
    end_datetime: isoDatetimeRequired('Please select an end date and time'),
    all_day: z.boolean().default(false),
    recurrence_type: z.nativeEnum(RecurrenceType, {
      errorMap: () => ({ message: 'Please select a recurrence type' }),
    }),
    days_of_week: optionalString,
    recurrence_end_type: z
      .nativeEnum(RecurrenceEndType, {
        errorMap: () => ({ message: 'Please select how the recurrence ends' }),
      })
      .optional(),
    recurrence_end_date: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((value) => (value === null || value === undefined ? '' : value))
      .pipe(z.string().optional()),
    recurrence_occurrences: z
      .union([z.number(), z.null(), z.undefined()])
      .transform((value) => (value === null || value === undefined ? undefined : value))
      .pipe(z.number().optional()),
    recurring_date: z
      .union([z.number(), z.null(), z.undefined()])
      .transform((value) => (value === null || value === undefined ? undefined : value))
      .pipe(z.number().min(1).max(31).optional()),
    recurring_month: z
      .union([z.number(), z.null(), z.undefined()])
      .transform((value) => (value === null || value === undefined ? undefined : value))
      .pipe(z.number().min(1).max(12).optional()),
  })
  .refine(
    (data) => {
      const s = parseISO(data.start_datetime);
      const e = parseISO(data.end_datetime);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return true;
      return e.getTime() > s.getTime();
    },
    {
      message: 'End must be after start',
      path: ['end_datetime'],
    },
  )
  .refine(
    (data) => {
      if (
        data.recurrence_type === RecurrenceType.WEEKLY &&
        (!data.days_of_week || data.days_of_week.trim() === '')
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Please select at least one day for weekly recurrence',
      path: ['days_of_week'],
    },
  )
  .refine(
    (data) => {
      if (
        data.recurrence_type !== RecurrenceType.ONE_TIME &&
        data.recurrence_end_type === RecurrenceEndType.ON_DATE &&
        !data.recurrence_end_date
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Please select an end date for the recurrence',
      path: ['recurrence_end_date'],
    },
  )
  .refine(
    (data) => {
      if (
        data.recurrence_type !== RecurrenceType.ONE_TIME &&
        data.recurrence_end_type === RecurrenceEndType.AFTER_OCCURRENCES &&
        !data.recurrence_occurrences
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Please enter the number of occurrences',
      path: ['recurrence_occurrences'],
    },
  )
  .refine(
    (data) => {
      if (
        data.recurrence_type !== RecurrenceType.ONE_TIME &&
        data.recurrence_end_type === RecurrenceEndType.AFTER_OCCURRENCES &&
        data.recurrence_occurrences != null
      ) {
        const n = Number(data.recurrence_occurrences);
        return n >= 2 && n <= 365;
      }
      return true;
    },
    {
      message: 'Occurrences must be between 2 and 365',
      path: ['recurrence_occurrences'],
    },
  )
  .refine(
    (data) => {
      if (data.start_datetime) {
        const dateObject = parseISO(data.start_datetime);
        if (Number.isNaN(dateObject.getTime())) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Please select a valid start date and time',
      path: ['start_datetime'],
    },
  )
  .refine(
    (data) => {
      if (
        (data.recurrence_type === RecurrenceType.MONTHLY ||
          data.recurrence_type === RecurrenceType.QUARTERLY) &&
        !data.recurring_date
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Please enter a recurring date (1-31)',
      path: ['recurring_date'],
    },
  )
  .refine(
    (data) => {
      if (
        data.recurrence_type === RecurrenceType.ANNUALLY &&
        (!data.recurring_date || !data.recurring_month)
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Please enter both recurring month and date for annual recurrence',
      path: ['recurring_month'],
    },
  )
  .refine(
    (data) => {
      // Prevent one-time bookings that started more than 24 hours ago
      if (!data.start_datetime || data.recurrence_type !== RecurrenceType.ONE_TIME) return true;

      const now = new Date();
      const GRACE_PERIOD = 60 * 1000;
      const cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000 - GRACE_PERIOD);

      let startDT;
      if (data.all_day) {
        startDT = startOfDay(parseISO(data.start_datetime));
      } else {
        startDT = parseISO(data.start_datetime);
      }

      if (Number.isNaN(startDT.getTime())) return true;
      return startDT.getTime() >= cutoffTime.getTime();
    },
    {
      message: 'Booking cannot be more than 24 hours in the past',
      path: ['start_datetime'],
    },
  );
