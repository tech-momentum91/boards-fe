import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { addMinutes, isValid, parseISO } from 'date-fns';
import {
  checkSpaceAvailability,
  clearConflictCheck,
  fetchBookingDetail,
  updateSpaceBookingScoped,
  validateRecurringConflicts,
} from '@/redux/bookingSlice';
import { bookingToStartEndIsoStrings, isoPairToBookingFields } from '@/utils/date-utils';
import {
  BOOKING_EDIT_SCOPE,
  RecurrenceType,
  isScheduleOrSpaceEditable,
} from '@/components/bookings/constants';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

/** True when now falls between booking start and end (session in progress), regardless of status label. */
function isBookingInProgressBySchedule(booking) {
  if (!booking) return false;
  const { startIso, endIso } = bookingToStartEndIsoStrings(booking);
  if (!startIso || !endIso) return false;
  const startD = parseISO(startIso);
  const endD = parseISO(endIso);
  if (!isValid(startD) || !isValid(endD)) return false;
  const now = new Date();
  return startD.getTime() <= now.getTime() && now.getTime() < endD.getTime();
}

/** Stable key for comparing edited schedule to booking (API date/time shape). */
function buildScheduleSnapshotKeyFromBooking(booking) {
  const { startIso, endIso } = bookingToStartEndIsoStrings(booking);
  const fields = isoPairToBookingFields(startIso, endIso);
  if (!fields) return null;
  return JSON.stringify({
    booking_date: fields.booking_date,
    end_booking_date: fields.booking_end_date,
    start_time: fields.start_time,
    end_time: fields.end_time,
  });
}

export const useBookingTimeEditor = ({
  booking,
  selectedBookingId,
  recurrence,
  shouldShowRecurrence,
  effectiveEditScope,
  conflictCheck,
  handleFieldChange,
}) => {
  const dispatch = useDispatch();

  const [isTimeEditing, setIsTimeEditing] = useState(false);
  const [isTimePopoverOpen, setIsTimePopoverOpen] = useState(false);
  const [timeEditConflicts, setTimeEditConflicts] = useState([]);
  const [datetimeInputs, setDatetimeInputs] = useState({ startIso: '', endIso: '' });
  const [datetimeErrors, setDatetimeErrors] = useState({ start: '', end: '' });

  const conflictCheckRef = useRef(null);
  const oneTimeConflictCheckRef = useRef(null);
  const lastOneTimeParamsRef = useRef(null);
  const timeFieldRef = useRef(null);
  /** Snapshot when popover opened; availability API runs only when current schedule differs */
  const originalScheduleSnapshotRef = useRef(null);

  const isTimeEditable = isScheduleOrSpaceEditable(booking?.status || '');

  // When booking is part of a series but edit scope is THIS_ONLY,
  // treat it like a single booking for conflict checks.
  const isSeriesScope = shouldShowRecurrence && effectiveEditScope !== BOOKING_EDIT_SCOPE.THIS_ONLY;

  const showOneTimeConflictError =
    !datetimeErrors.start &&
    !datetimeErrors.end &&
    !isSeriesScope &&
    booking?.space_id &&
    conflictCheck?.oneTime?.statusCode === 409 &&
    conflictCheck?.oneTime?.errorOn === 'booking_time' &&
    Boolean(conflictCheck?.oneTime?.message);

  // Reset time editing state on unmount
  useEffect(() => {
    return () => {
      setIsTimeEditing(false);
      setIsTimePopoverOpen(false);
      if (oneTimeConflictCheckRef.current) {
        clearTimeout(oneTimeConflictCheckRef.current);
        oneTimeConflictCheckRef.current = null;
      }
      lastOneTimeParamsRef.current = null;
    };
  }, []);

  // Save time or schedule (updates must already be API-shaped: HH:mm:ss and optional booking dates)
  const performTimeSave = useCallback(
    async (scope, updates, options = {}) => {
      if (!booking || !selectedBookingId) return;

      const currentBookingId = booking?.name || booking?.id || selectedBookingId;

      const payload = { ...updates };
      if (options.ignoreConflictedDates) {
        payload.ignore_conflicted_dates = 1;
      }

      if (!payload.start_time || !payload.end_time) {
        showErrorToast('Invalid time values');
        return;
      }

      const apiScope = scope || 'THIS_ONLY';

      try {
        await dispatch(
          updateSpaceBookingScoped({
            bookingId: currentBookingId,
            scope: apiScope,
            updates: payload,
          }),
        ).unwrap();

        showSuccessToast('Schedule updated successfully');
        dispatch(fetchBookingDetail(currentBookingId));
        setTimeEditConflicts([]);
        setIsTimeEditing(false);
        setIsTimePopoverOpen(false);
      } catch (error) {
        console.error('Failed to update time:', error);
        showErrorToast(error, { defaultMessage: 'Failed to update time' });
      }
    },
    [booking, selectedBookingId, dispatch],
  );

  // Handle time field click to enter edit mode (via popover)
  const handleTimeClick = useCallback(() => {
    if (!isTimeEditable) return;

    const { startIso, endIso } = bookingToStartEndIsoStrings(booking);
    setDatetimeInputs({ startIso, endIso });
    setDatetimeErrors({ start: '', end: '' });

    setIsTimeEditing(true);
    setIsTimePopoverOpen(true);

    dispatch(clearConflictCheck());
    lastOneTimeParamsRef.current = null;
    originalScheduleSnapshotRef.current = buildScheduleSnapshotKeyFromBooking(booking);
  }, [isTimeEditable, booking, dispatch]);

  // Time edit Cancel handler
  const handleTimeCancel = useCallback(() => {
    const { startIso, endIso } = bookingToStartEndIsoStrings(booking);
    setDatetimeInputs({ startIso, endIso });
    setDatetimeErrors({ start: '', end: '' });
    setIsTimeEditing(false);
    setIsTimePopoverOpen(false);
  }, [booking]);

  const handleDatetimeChange = useCallback((which, dateValue) => {
    const iso = dateValue instanceof Date ? dateValue.toISOString() : String(dateValue || '');
    setDatetimeInputs((previous) => {
      const nextStart = which === 'start' ? iso : previous.startIso;
      let nextEnd = which === 'end' ? iso : previous.endIso;

      if (which === 'start' && nextStart) {
        const startD = parseISO(nextStart);
        const endD = previous.endIso ? parseISO(previous.endIso) : null;
        if (isValid(startD) && endD && isValid(endD) && endD.getTime() <= startD.getTime()) {
          nextEnd = addMinutes(startD, 30).toISOString();
        }
      }

      return { startIso: nextStart, endIso: nextEnd };
    });
    setDatetimeErrors({ start: '', end: '' });
  }, []);

  const validateDatetimePairForSave = useCallback(() => {
    const fields = isoPairToBookingFields(datetimeInputs.startIso, datetimeInputs.endIso);
    if (!fields) {
      setDatetimeErrors({ start: 'Invalid start', end: 'Invalid end' });
      return null;
    }

    const startD = parseISO(datetimeInputs.startIso);
    const endD = parseISO(datetimeInputs.endIso);
    if (!isValid(startD) || !isValid(endD) || endD.getTime() <= startD.getTime()) {
      setDatetimeErrors({ end: 'End must be after start' });
      return null;
    }

    // In-session bookings: start is before "now" by design — do not apply upcoming-only rule.
    if (!isSeriesScope) {
      const statusOngoing =
        String(booking?.status || '')
          .toLowerCase()
          .trim() === 'ongoing';
      const inProgress = statusOngoing || isBookingInProgressBySchedule(booking);
      if (!inProgress) {
        const today = new Date();
        if (startD < today) {
          setDatetimeErrors({ start: 'Start cannot be in the past' });
          return null;
        }
      }
    }

    return fields;
  }, [datetimeInputs.startIso, datetimeInputs.endIso, isSeriesScope, booking]);

  // Time edit Save handler
  const handleTimeSave = useCallback(() => {
    const fields = validateDatetimePairForSave();
    if (!fields) return;

    if (isSeriesScope) {
      if (shouldShowRecurrence && timeEditConflicts.length > 0) {
        return;
      }

      performTimeSave(effectiveEditScope, {
        booking_date: fields.booking_date,
        booking_end_date: fields.booking_end_date,
        start_time: fields.start_time,
        end_time: fields.end_time,
      });
      return;
    }

    if (conflictCheck?.oneTime?.statusCode === 409) {
      showErrorToast(conflictCheck.oneTime.message || 'The selected slot is already occupied.');
      return;
    }

    const schedulePayload = {
      booking_date: fields.booking_date,
      booking_end_date: fields.booking_end_date,
      start_time: fields.start_time,
      end_time: fields.end_time,
    };

    if (handleFieldChange) {
      handleFieldChange('start_time', fields.start_time, {
        payload: schedulePayload,
        forceUpdate: true,
        successMessage: 'Schedule updated successfully',
      });
    } else {
      const currentBookingId = booking?.name || booking?.id || selectedBookingId;

      dispatch(
        updateSpaceBookingScoped({
          bookingId: currentBookingId,
          scope: 'THIS_ONLY',
          updates: schedulePayload,
        }),
      )
        .unwrap()
        .then(() => {
          showSuccessToast('Schedule updated successfully');
          dispatch(fetchBookingDetail(currentBookingId));
        })
        .catch((error) => {
          console.error('Failed to update schedule:', error);
          showErrorToast(error, { defaultMessage: 'Failed to update schedule' });
        });
    }

    setIsTimeEditing(false);
    setIsTimePopoverOpen(false);
  }, [
    isSeriesScope,
    validateDatetimePairForSave,
    shouldShowRecurrence,
    timeEditConflicts.length,
    performTimeSave,
    effectiveEditScope,
    conflictCheck?.oneTime?.statusCode,
    conflictCheck?.oneTime?.message,
    handleFieldChange,
    dispatch,
    selectedBookingId,
    booking,
  ]);

  const handleTimeSaveWithIgnore = useCallback(() => {
    const fields = isoPairToBookingFields(datetimeInputs.startIso, datetimeInputs.endIso);
    if (!fields?.start_time || !fields?.end_time) return;
    performTimeSave(
      effectiveEditScope,
      {
        booking_date: fields.booking_date,
        booking_end_date: fields.booking_end_date,
        start_time: fields.start_time,
        end_time: fields.end_time,
      },
      { ignoreConflictedDates: true },
    );
  }, [performTimeSave, effectiveEditScope, datetimeInputs.startIso, datetimeInputs.endIso]);

  // Check conflicts when time popover is open and user edits schedule (recurring series scope)
  useEffect(() => {
    if (!isTimePopoverOpen || !isTimeEditing || !booking || !isSeriesScope) {
      if (!isTimePopoverOpen || !isTimeEditing) setTimeEditConflicts([]);
      return;
    }

    if (!datetimeInputs.startIso || !datetimeInputs.endIso) {
      return;
    }

    const fields = isoPairToBookingFields(datetimeInputs.startIso, datetimeInputs.endIso);
    if (!fields) return;

    const startD = parseISO(datetimeInputs.startIso);
    const endD = parseISO(datetimeInputs.endIso);
    if (!isValid(startD) || !isValid(endD) || endD.getTime() <= startD.getTime()) {
      return;
    }

    const scheduleCoreKey = JSON.stringify({
      booking_date: fields.booking_date,
      end_booking_date: fields.booking_end_date,
      start_time: fields.start_time,
      end_time: fields.end_time,
    });

    if (
      originalScheduleSnapshotRef.current &&
      scheduleCoreKey === originalScheduleSnapshotRef.current
    ) {
      setTimeEditConflicts([]);
      return;
    }

    const recurrenceType = recurrence?.recurrence || recurrence?.type || RecurrenceType.ONE_TIME;
    if (recurrenceType === RecurrenceType.ONE_TIME) return;

    const occurrence = recurrence?.occurrence || 0;
    const recurrenceEndDate = recurrence?.recurrence_end_date || recurrence?.endDate || '';
    const recurringRef = recurrence?.name || booking?.recurring_booking_ref || null;

    const payload = {
      space_id: booking?.space_id,
      recurrence: recurrenceType,
      occurrence: occurrence || 0,
      booking_date: fields.booking_date,
      end_booking_date: fields.booking_end_date,
      recurrence_end_date: recurrenceEndDate || '',
      week_days: recurrence?.week_days || recurrence?.daysOfWeek || '',
      recurring_date: recurrence?.recurring_date || recurrence?.dayOfMonth || null,
      recurring_month: recurrence?.recurring_month || recurrence?.monthOfYear || null,
      start_time: fields.start_time,
      end_time: fields.end_time,
      exclude_recurring_ref: recurringRef,
    };

    if (conflictCheckRef.current) clearTimeout(conflictCheckRef.current);
    conflictCheckRef.current = setTimeout(async () => {
      try {
        const result = await dispatch(validateRecurringConflicts(payload)).unwrap();
        if (result.status_code === 409 && result.dates) {
          setTimeEditConflicts(result.dates || []);
        } else {
          setTimeEditConflicts([]);
        }
      } catch (error) {
        console.error('Failed to check conflicts:', error);
        setTimeEditConflicts([]);
      }
    }, 400);

    return () => {
      if (conflictCheckRef.current) clearTimeout(conflictCheckRef.current);
    };
  }, [
    isTimePopoverOpen,
    isTimeEditing,
    datetimeInputs.startIso,
    datetimeInputs.endIso,
    booking,
    isSeriesScope,
    recurrence,
    dispatch,
  ]);

  // One-time booking conflict check for time edit popover (single / THIS_ONLY)
  useEffect(() => {
    if (!isTimePopoverOpen || !isTimeEditing || isSeriesScope || !booking?.space_id) {
      return;
    }

    if (!datetimeInputs.startIso || !datetimeInputs.endIso) {
      return;
    }

    const fields = isoPairToBookingFields(datetimeInputs.startIso, datetimeInputs.endIso);
    if (!fields) return;

    const startD = parseISO(datetimeInputs.startIso);
    const endD = parseISO(datetimeInputs.endIso);
    if (!isValid(startD) || !isValid(endD) || endD.getTime() <= startD.getTime()) {
      return;
    }

    const bookingDate = fields.booking_date;
    const endBookingDate = fields.booking_end_date;
    const startTimeAPI = fields.start_time;
    const endTimeAPI = fields.end_time;

    if (!startTimeAPI || !endTimeAPI) {
      return;
    }

    const scheduleCoreKey = JSON.stringify({
      booking_date: bookingDate,
      end_booking_date: endBookingDate,
      start_time: startTimeAPI,
      end_time: endTimeAPI,
    });

    if (
      originalScheduleSnapshotRef.current &&
      scheduleCoreKey === originalScheduleSnapshotRef.current
    ) {
      dispatch(clearConflictCheck());
      lastOneTimeParamsRef.current = scheduleCoreKey;
      return;
    }

    const bookingDocName = booking?.name || booking?.id || selectedBookingId;
    const payload = {
      space_id: booking.space_id,
      booking_date: bookingDate,
      end_booking_date: endBookingDate,
      start_time: startTimeAPI,
      end_time: endTimeAPI,
      ...(bookingDocName ? { exclude_name: bookingDocName } : {}),
      ...(booking?.recurring_booking_ref
        ? { exclude_recurring_ref: booking.recurring_booking_ref }
        : {}),
    };

    const key = JSON.stringify(payload);
    if (lastOneTimeParamsRef.current === key) {
      return;
    }
    lastOneTimeParamsRef.current = key;

    if (oneTimeConflictCheckRef.current) {
      clearTimeout(oneTimeConflictCheckRef.current);
    }

    oneTimeConflictCheckRef.current = setTimeout(() => {
      dispatch(checkSpaceAvailability(payload));
    }, 400);

    return () => {
      if (oneTimeConflictCheckRef.current) {
        clearTimeout(oneTimeConflictCheckRef.current);
        oneTimeConflictCheckRef.current = null;
      }
    };
  }, [
    isTimePopoverOpen,
    isTimeEditing,
    isSeriesScope,
    booking,
    datetimeInputs.startIso,
    datetimeInputs.endIso,
    dispatch,
    selectedBookingId,
  ]);

  useEffect(() => {
    if (!isTimePopoverOpen) {
      originalScheduleSnapshotRef.current = null;
    }
  }, [isTimePopoverOpen]);

  const timeEditor = {
    isTimeEditable,
    isTimeEditing,
    isTimePopoverOpen,
    handleTimeClick,
    timeFieldRef,
    datetimeInputs,
    datetimeErrors,
    onDatetimeChange: handleDatetimeChange,
    showOneTimeConflictError,
    timeEditConflicts,
    onSave: handleTimeSave,
    onCancel: handleTimeCancel,
  };

  return {
    timeEditor,
    handleTimeSaveWithIgnore,
  };
};
