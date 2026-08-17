import React, { useState, useCallback, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useDispatch } from 'react-redux';
import {
  RecurrenceType,
  RecurrenceEndType,
  RECURRENCE_TYPE_OPTIONS,
  RECURRING_DATE_OPTIONS,
  RECURRING_MONTH_OPTIONS,
  DAYS_OF_WEEK,
} from './constants';
import * as Popover from '@/components/ui/popover';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Label from '@/components/ui/label';
import * as Button from '@/components/ui/button';
import { Datepicker } from '@/components/ui/datepicker';
import * as Input from '@/components/ui/input';
import ErrorText from '@/components/ui/error-text';
import { validateRecurringConflicts } from '@/redux/bookingSlice';
import BookingConflictsHint from '@/components/bookings/booking-conflicts-hint';
import BookingRecurringConflictsModal from '@/components/bookings/booking-recurring-conflicts-modal';

const BookingRecurrenceEditPopoverContent = ({
  recurrence,
  bookingDate,
  bookingEndDate,
  spaceId,
  startTime,
  endTime,
  recurringRef,
  onSave,
  onCancel,
  isOpen,
}) => {
  const dispatch = useDispatch();
  const [errors, setErrors] = useState({});
  const [conflictDates, setConflictDates] = useState([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [conflictApiError, setConflictApiError] = useState('');
  const conflictDebounceRef = useRef(null);
  const [hasUserChanged, setHasUserChanged] = useState(false);
  const [isConflictsModalOpen, setIsConflictsModalOpen] = useState(false);
  const [conflictsModalMode, setConflictsModalMode] = useState('view');
  const pendingSavePayloadRef = useRef(null);

  // Helper function to initialize recurrence state from props
  const initializeRecurrenceState = useCallback(() => {
    if (!recurrence) {
      return {
        recurrence: RecurrenceType.ONE_TIME,
        recurrence_end_type: RecurrenceEndType.AFTER_OCCURRENCES,
        recurrence_end_date: '',
        recurrence_occurrences: undefined,
        days_of_week: '',
        recurring_date: undefined,
        recurring_month: undefined,
      };
    }

    return {
      recurrence: recurrence.recurrence || recurrence.type || RecurrenceType.ONE_TIME,
      recurrence_end_type: recurrence.recurrence_end_date
        ? RecurrenceEndType.ON_DATE
        : recurrence.occurrence
          ? RecurrenceEndType.AFTER_OCCURRENCES
          : RecurrenceEndType.AFTER_OCCURRENCES,
      recurrence_end_date: recurrence.recurrence_end_date || recurrence.endDate || '',
      recurrence_occurrences: recurrence.occurrence || recurrence.occurrences || undefined,
      days_of_week: recurrence.week_days || recurrence.daysOfWeek || '',
      recurring_date: recurrence.recurring_date || recurrence.dayOfMonth || undefined,
      recurring_month: recurrence.recurring_month || recurrence.monthOfYear || undefined,
    };
  }, [recurrence]);

  const [localRecurrence, setLocalRecurrence] = useState(initializeRecurrenceState);

  // Reset state to original values when popover opens
  useEffect(() => {
    if (isOpen) {
      setLocalRecurrence(initializeRecurrenceState());
      setErrors({});
      setConflictDates([]);
      setConflictApiError('');
      setIsCheckingConflicts(false);
      setHasUserChanged(false);
      setIsConflictsModalOpen(false);
      setConflictsModalMode('view');
      pendingSavePayloadRef.current = null;
    } else {
      // Clear errors when popover closes
      setErrors({});
      setConflictDates([]);
      setConflictApiError('');
      setIsCheckingConflicts(false);
    }
  }, [isOpen, initializeRecurrenceState]);

  const handleRecurrenceTypeChange = useCallback((value) => {
    setHasUserChanged(true);
    setLocalRecurrence((previous) => ({
      ...previous,
      recurrence: value,
      // Reset dependent fields when changing type
      days_of_week: value === RecurrenceType.WEEKLY ? previous.days_of_week : '',
      recurring_date: undefined,
      recurring_month: undefined,
    }));
  }, []);

  const handleEndTypeChange = useCallback((type) => {
    setHasUserChanged(true);
    setLocalRecurrence((previous) => ({
      ...previous,
      recurrence_end_type: type,
    }));
  }, []);

  // Validate recurrence data
  const validateRecurrence = useCallback(() => {
    const newErrors = {};

    // Validate weekly recurrence - must have at least one day selected
    if (
      localRecurrence.recurrence === RecurrenceType.WEEKLY &&
      (!localRecurrence.days_of_week || localRecurrence.days_of_week.trim() === '')
    ) {
      newErrors.days_of_week = 'Please select at least one day for weekly recurrence';
    }

    // Validate monthly/quarterly recurrence - must have recurring date
    if (
      (localRecurrence.recurrence === RecurrenceType.MONTHLY ||
        localRecurrence.recurrence === RecurrenceType.QUARTERLY) &&
      !localRecurrence.recurring_date
    ) {
      newErrors.recurring_date = 'Please select a recurring date';
    }

    // Validate annually recurrence - must have both month and date
    if (localRecurrence.recurrence === RecurrenceType.ANNUALLY) {
      if (!localRecurrence.recurring_date) {
        newErrors.recurring_date = 'Please select a recurring date';
      }
      if (!localRecurrence.recurring_month) {
        newErrors.recurring_month = 'Please select a month';
      }
    }

    // Validate recurrence end - must have end date or occurrences
    if (localRecurrence.recurrence !== RecurrenceType.ONE_TIME) {
      if (localRecurrence.recurrence_end_type === RecurrenceEndType.ON_DATE) {
        if (!localRecurrence.recurrence_end_date) {
          newErrors.recurrence_end_date = 'Please select an end date for the recurrence';
        }
      } else if (
        localRecurrence.recurrence_end_type === RecurrenceEndType.AFTER_OCCURRENCES &&
        (!localRecurrence.recurrence_occurrences || localRecurrence.recurrence_occurrences < 1)
      ) {
        newErrors.recurrence_occurrences = 'Please enter the number of occurrences';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [localRecurrence]);

  const handleSave = useCallback(async () => {
    // Validate before saving
    if (!validateRecurrence()) {
      return;
    }

    const payload = {
      recurrence: localRecurrence.recurrence,
    };

    if (localRecurrence.recurrence === RecurrenceType.WEEKLY) {
      payload.week_days = localRecurrence.days_of_week || '';
    }

    if (
      localRecurrence.recurrence === RecurrenceType.MONTHLY ||
      localRecurrence.recurrence === RecurrenceType.QUARTERLY
    ) {
      payload.recurring_date = localRecurrence.recurring_date || null;
    }

    if (localRecurrence.recurrence === RecurrenceType.ANNUALLY) {
      payload.recurring_date = localRecurrence.recurring_date || null;
      payload.recurring_month = localRecurrence.recurring_month || null;
    }

    if (localRecurrence.recurrence_end_type === RecurrenceEndType.ON_DATE) {
      payload.recurrence_end_date = localRecurrence.recurrence_end_date
        ? format(new Date(localRecurrence.recurrence_end_date), 'yyyy-MM-dd')
        : '';
      payload.occurrence = 0;
    } else if (localRecurrence.recurrence_end_type === RecurrenceEndType.AFTER_OCCURRENCES) {
      payload.recurrence_end_date = '';
      payload.occurrence = localRecurrence.recurrence_occurrences || 0;
    }

    // If we don't have enough context, just save without conflict check
    if (!spaceId || !bookingDate || !startTime || !endTime) {
      onSave?.(payload);
      return;
    }

    // If there are conflicts, show confirmation modal (same as create drawer)
    if (conflictDates.length > 0) {
      pendingSavePayloadRef.current = payload;
      setConflictsModalMode('confirm');
      setIsConflictsModalOpen(true);
      return;
    }

    if (conflictApiError) {
      return;
    }

    onSave?.(payload);
  }, [
    localRecurrence,
    onSave,
    validateRecurrence,
    spaceId,
    bookingDate,
    startTime,
    endTime,
    conflictDates.length,
    conflictApiError,
  ]);

  // Live conflict check whenever recurrence values change (with debounce)
  useEffect(() => {
    if (!isOpen) {
      if (conflictDebounceRef.current) {
        clearTimeout(conflictDebounceRef.current);
        conflictDebounceRef.current = null;
      }
      return;
    }

    // Only run conflict check after user actually changes something
    if (!hasUserChanged) {
      return;
    }

    // Require minimal context for a meaningful conflict check
    if (!spaceId || !bookingDate || !startTime || !endTime) {
      setConflictDates([]);
      setConflictApiError('');
      setIsCheckingConflicts(false);
      return;
    }

    // Do not check for One Time recurrence
    if (localRecurrence.recurrence === RecurrenceType.ONE_TIME) {
      setConflictDates([]);
      setConflictApiError('');
      setIsCheckingConflicts(false);
      return;
    }

    // Require recurrence end condition
    const hasEndDate =
      localRecurrence.recurrence_end_type === RecurrenceEndType.ON_DATE &&
      localRecurrence.recurrence_end_date;
    const hasOccurrences =
      localRecurrence.recurrence_end_type === RecurrenceEndType.AFTER_OCCURRENCES &&
      localRecurrence.recurrence_occurrences &&
      localRecurrence.recurrence_occurrences > 0;

    if (!hasEndDate && !hasOccurrences) {
      setConflictDates([]);
      setConflictApiError('');
      setIsCheckingConflicts(false);
      return;
    }

    // Require type-specific fields
    if (
      localRecurrence.recurrence === RecurrenceType.WEEKLY &&
      (!localRecurrence.days_of_week || localRecurrence.days_of_week.trim() === '')
    ) {
      setConflictDates([]);
      setConflictApiError('');
      setIsCheckingConflicts(false);
      return;
    }

    if (
      (localRecurrence.recurrence === RecurrenceType.MONTHLY ||
        localRecurrence.recurrence === RecurrenceType.QUARTERLY) &&
      !localRecurrence.recurring_date
    ) {
      setConflictDates([]);
      setConflictApiError('');
      setIsCheckingConflicts(false);
      return;
    }

    if (
      localRecurrence.recurrence === RecurrenceType.ANNUALLY &&
      (!localRecurrence.recurring_date || !localRecurrence.recurring_month)
    ) {
      setConflictDates([]);
      setConflictApiError('');
      setIsCheckingConflicts(false);
      return;
    }

    const payload = {
      recurrence: localRecurrence.recurrence,
    };

    if (localRecurrence.recurrence === RecurrenceType.WEEKLY) {
      payload.week_days = localRecurrence.days_of_week || '';
    }

    if (
      localRecurrence.recurrence === RecurrenceType.MONTHLY ||
      localRecurrence.recurrence === RecurrenceType.QUARTERLY
    ) {
      payload.recurring_date = localRecurrence.recurring_date || null;
    }

    if (localRecurrence.recurrence === RecurrenceType.ANNUALLY) {
      payload.recurring_date = localRecurrence.recurring_date || null;
      payload.recurring_month = localRecurrence.recurring_month || null;
    }

    if (localRecurrence.recurrence_end_type === RecurrenceEndType.ON_DATE) {
      payload.recurrence_end_date = localRecurrence.recurrence_end_date
        ? format(new Date(localRecurrence.recurrence_end_date), 'yyyy-MM-dd')
        : '';
      payload.occurrence = 0;
    } else if (localRecurrence.recurrence_end_type === RecurrenceEndType.AFTER_OCCURRENCES) {
      payload.recurrence_end_date = '';
      payload.occurrence = localRecurrence.recurrence_occurrences || 0;
    }

    const endBookingDateFormatted = format(new Date(bookingEndDate || bookingDate), 'yyyy-MM-dd');

    const conflictPayload = {
      space_id: spaceId,
      recurrence: payload.recurrence,
      occurrence: payload.occurrence || 0,
      booking_date: format(new Date(bookingDate), 'yyyy-MM-dd'),
      end_booking_date: endBookingDateFormatted,
      recurrence_end_date: payload.recurrence_end_date || '',
      week_days: payload.week_days || '',
      recurring_date: payload.recurring_date || null,
      recurring_month: payload.recurring_month || null,
      start_time: startTime,
      end_time: endTime,
      exclude_recurring_ref: recurringRef || null,
    };

    setIsCheckingConflicts(true);
    setConflictApiError('');

    if (conflictDebounceRef.current) {
      clearTimeout(conflictDebounceRef.current);
    }

    conflictDebounceRef.current = setTimeout(async () => {
      try {
        const result = await dispatch(validateRecurringConflicts(conflictPayload)).unwrap();

        if (result?.status_code === 409 && Array.isArray(result.dates) && result.dates.length > 0) {
          setConflictDates(result.dates);
        } else {
          setConflictDates([]);
        }
        setIsCheckingConflicts(false);
      } catch (error) {
        console.error('Failed to validate recurring conflicts:', error);
        setConflictDates([]);
        setConflictApiError('Failed to check conflicts. Please try again.');
        setIsCheckingConflicts(false);
      }
    }, 400);

    return () => {
      if (conflictDebounceRef.current) {
        clearTimeout(conflictDebounceRef.current);
        conflictDebounceRef.current = null;
      }
    };
  }, [
    isOpen,
    hasUserChanged,
    localRecurrence,
    bookingDate,
    bookingEndDate,
    spaceId,
    startTime,
    endTime,
    recurringRef,
    dispatch,
  ]);

  const handleCancel = useCallback(() => {
    setErrors({}); // Clear all errors
    onCancel?.();
  }, [onCancel]);

  const handleContinueFromConflictsModal = useCallback(() => {
    const pending = pendingSavePayloadRef.current;
    if (!pending) return;
    onSave?.(pending, { ignoreConflictedDates: true });
    setIsConflictsModalOpen(false);
    setConflictsModalMode('view');
    pendingSavePayloadRef.current = null;
  }, [onSave]);

  const selectedDays =
    localRecurrence.days_of_week && typeof localRecurrence.days_of_week === 'string'
      ? localRecurrence.days_of_week.split(',').filter(Boolean)
      : Array.isArray(localRecurrence.days_of_week)
        ? localRecurrence.days_of_week
        : [];

  const handleDaySelect = useCallback(
    (dayValue) => {
      const newDays = selectedDays.includes(dayValue)
        ? selectedDays.filter((d) => d !== dayValue)
        : [...selectedDays, dayValue].sort();
      setHasUserChanged(true);
      setLocalRecurrence((previous) => ({
        ...previous,
        days_of_week: newDays.join(','),
      }));
    },
    [selectedDays],
  );

  return (
    <Popover.Content className='w-[400px] p-4' align='start' sideOffset={8}>
      <div className='flex flex-col gap-4'>
        <p className='text-subheading-2xsmall text-text-soft-400 uppercase tracking-wide'>
          Edit recurrence
        </p>

        <div className='flex flex-col gap-4'>
          {/* Recurrence Type */}
          <div className='flex flex-col gap-1'>
            <Label.Root className='text-label-sm text-text-main-900'>Recurrence</Label.Root>
            <SearchableSelect
              size='small'
              value={localRecurrence.recurrence}
              onValueChange={handleRecurrenceTypeChange}
              options={RECURRENCE_TYPE_OPTIONS}
              placeholder='Select recurrence'
              showArrow={true}
              isolateSearchKeyboard
            />
          </div>

          {/* Weekly Days Selection */}
          {localRecurrence.recurrence === RecurrenceType.WEEKLY && (
            <div className='flex flex-col gap-1'>
              <Label.Root className='text-label-sm text-text-main-900'>
                Days <Label.Asterisk />
              </Label.Root>
              <div className='flex items-center justify-start gap-1'>
                {DAYS_OF_WEEK.map((day, index) => {
                  const isSelected = selectedDays.includes(day.value);
                  return (
                    <Button.Root
                      key={index}
                      type='button'
                      className='rounded-full! size-8 p-1'
                      size='small'
                      onClick={() => handleDaySelect(day.value)}
                      variant={isSelected ? 'primary' : 'neutral'}
                      mode={isSelected ? 'filled' : 'stroke'}
                    >
                      <span>{day.label}</span>
                    </Button.Root>
                  );
                })}
              </div>
              {errors.days_of_week && <ErrorText>{errors.days_of_week}</ErrorText>}
            </div>
          )}

          {/* Monthly/Quarterly Recurring Date */}
          {(localRecurrence.recurrence === RecurrenceType.MONTHLY ||
            localRecurrence.recurrence === RecurrenceType.QUARTERLY) && (
            <div className='flex flex-col gap-1'>
              <Label.Root className='text-label-sm text-text-main-900'>
                Monthly Recurring Date <Label.Asterisk />
              </Label.Root>
              <SearchableSelect
                size='small'
                value={localRecurrence.recurring_date ? String(localRecurrence.recurring_date) : ''}
                onValueChange={(value) => {
                  setHasUserChanged(true);
                  setLocalRecurrence((previous) => ({
                    ...previous,
                    recurring_date: value ? Number.parseInt(value, 10) : undefined,
                  }));
                  // Clear error when value changes
                  if (errors.recurring_date) {
                    setErrors((previous) => ({ ...previous, recurring_date: '' }));
                  }
                }}
                options={RECURRING_DATE_OPTIONS}
                placeholder='Select date'
                showArrow={true}
                isolateSearchKeyboard
              />
              {errors.recurring_date && <ErrorText>{errors.recurring_date}</ErrorText>}
            </div>
          )}

          {/* Annually Recurring Month & Date */}
          {localRecurrence.recurrence === RecurrenceType.ANNUALLY && (
            <div className='flex gap-2'>
              <div className='flex-1 flex flex-col gap-1'>
                <Label.Root className='text-label-sm text-text-main-900'>
                  Month <Label.Asterisk />
                </Label.Root>
                <SearchableSelect
                  size='small'
                  hasError={Boolean(errors.recurring_month)}
                  value={
                    localRecurrence.recurring_month ? String(localRecurrence.recurring_month) : ''
                  }
                  onValueChange={(value) => {
                    setHasUserChanged(true);
                    setLocalRecurrence((previous) => ({
                      ...previous,
                      recurring_month: value ? Number.parseInt(value, 10) : undefined,
                    }));
                    // Clear error when value changes
                    if (errors.recurring_month) {
                      setErrors((previous) => ({ ...previous, recurring_month: '' }));
                    }
                  }}
                  options={RECURRING_MONTH_OPTIONS}
                  placeholder='Select month'
                  showArrow={true}
                  isolateSearchKeyboard
                />
                {errors.recurring_month && <ErrorText>{errors.recurring_month}</ErrorText>}
              </div>
              <div className='flex-1 flex flex-col gap-1'>
                <Label.Root className='text-label-sm text-text-main-900'>
                  Date <Label.Asterisk />
                </Label.Root>
                <SearchableSelect
                  size='small'
                  value={
                    localRecurrence.recurring_date ? String(localRecurrence.recurring_date) : ''
                  }
                  onValueChange={(value) => {
                    setHasUserChanged(true);
                    setLocalRecurrence((previous) => ({
                      ...previous,
                      recurring_date: value ? Number.parseInt(value, 10) : undefined,
                    }));
                    // Clear error when value changes
                    if (errors.recurring_date) {
                      setErrors((previous) => ({ ...previous, recurring_date: '' }));
                    }
                  }}
                  options={RECURRING_DATE_OPTIONS}
                  placeholder='Select date'
                  showArrow={true}
                  isolateSearchKeyboard
                />
                {errors.recurring_date && <ErrorText>{errors.recurring_date}</ErrorText>}
              </div>
            </div>
          )}

          {/* Recurrence Ends */}
          {localRecurrence.recurrence !== RecurrenceType.ONE_TIME && (
            <div className='flex flex-col gap-1'>
              <Label.Root className='text-label-sm text-text-main-900'>
                Recurrence Ends <Label.Asterisk />
              </Label.Root>
              <div className='group relative'>
                <div
                  className={`flex rounded-lg before:absolute before:inset-0 before:ring-1 before:ring-inset before:pointer-events-none before:rounded-[inherit] overflow-hidden ${
                    errors.recurrence_end_date || errors.recurrence_occurrences
                      ? 'before:ring-error-base'
                      : 'before:ring-stroke-soft-200'
                  }`}
                >
                  <div className='flex bg-bg-weak-100 p-1 border-r border-stroke-soft-200'>
                    <button
                      type='button'
                      onClick={() => {
                        handleEndTypeChange(RecurrenceEndType.ON_DATE);
                        // Clear errors when switching
                        setErrors((previous) => ({
                          ...previous,
                          recurrence_end_date: '',
                          recurrence_occurrences: '',
                        }));
                      }}
                      className={`px-2.5 py-1 rounded-md text-[14px] font-medium transition-colors ${
                        localRecurrence.recurrence_end_type === RecurrenceEndType.ON_DATE
                          ? 'bg-white shadow-sm text-text-main-900'
                          : 'text-text-soft-400'
                      }`}
                    >
                      On
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        handleEndTypeChange(RecurrenceEndType.AFTER_OCCURRENCES);
                        // Clear errors when switching
                        setErrors((previous) => ({
                          ...previous,
                          recurrence_end_date: '',
                          recurrence_occurrences: '',
                        }));
                      }}
                      className={`px-2.5 py-1 rounded-md text-[14px] font-medium transition-colors ${
                        localRecurrence.recurrence_end_type === RecurrenceEndType.AFTER_OCCURRENCES
                          ? 'bg-white shadow-sm text-text-main-900'
                          : 'text-text-soft-400'
                      }`}
                    >
                      After
                    </button>
                  </div>
                  <div className='flex-1 bg-white p-px'>
                    {localRecurrence.recurrence_end_type === RecurrenceEndType.ON_DATE ? (
                      <Datepicker
                        value={
                          localRecurrence.recurrence_end_date
                            ? new Date(localRecurrence.recurrence_end_date)
                            : undefined
                        }
                        onChange={(date) => {
                          setHasUserChanged(true);
                          setLocalRecurrence((previous) => ({
                            ...previous,
                            recurrence_end_date: date ? date.toISOString() : '',
                          }));
                          // Clear error when value changes
                          if (errors.recurrence_end_date) {
                            setErrors((previous) => ({ ...previous, recurrence_end_date: '' }));
                          }
                        }}
                        size='small'
                      />
                    ) : (
                      <Input.Root size='small' variant='borderless'>
                        <Input.Wrapper>
                          <Input.Input
                            type='number'
                            min='1'
                            value={localRecurrence.recurrence_occurrences || ''}
                            onChange={(e) => {
                              setHasUserChanged(true);
                              setLocalRecurrence((previous) => ({
                                ...previous,
                                recurrence_occurrences: e.target.value
                                  ? Number.parseInt(e.target.value, 10)
                                  : undefined,
                              }));
                              // Clear error when value changes
                              if (errors.recurrence_occurrences) {
                                setErrors((previous) => ({
                                  ...previous,
                                  recurrence_occurrences: '',
                                }));
                              }
                            }}
                            placeholder='7'
                            hasError={Boolean(errors.recurrence_occurrences)}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  </div>
                </div>
              </div>
              {errors.recurrence_end_date && <ErrorText>{errors.recurrence_end_date}</ErrorText>}
              {errors.recurrence_occurrences && (
                <ErrorText>{errors.recurrence_occurrences}</ErrorText>
              )}
            </div>
          )}

          {/* Recurring conflicts preview - same message/style as time edit */}
          {conflictDates.length > 0 && (
            <>
              <BookingConflictsHint
                conflicts={conflictDates}
                onViewAll={() => {
                  setConflictsModalMode('view');
                  setIsConflictsModalOpen(true);
                }}
              />

              <BookingRecurringConflictsModal
                isOpen={isConflictsModalOpen}
                onClose={() => {
                  setIsConflictsModalOpen(false);
                  setConflictsModalMode('view');
                  pendingSavePayloadRef.current = null;
                }}
                onContinue={
                  conflictsModalMode === 'confirm' ? handleContinueFromConflictsModal : undefined
                }
                conflicts={conflictDates}
                mode={conflictsModalMode}
                isSubmitting={false}
              />
            </>
          )}
          {conflictApiError && <ErrorText>{conflictApiError}</ErrorText>}

          {/* Footer Actions */}
          <div className='flex items-center justify-end gap-3 pt-2'>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={handleCancel}
              type='button'
            >
              Cancel
            </Button.Root>
            <Button.Root
              variant='primary'
              mode='filled'
              size='small'
              onClick={handleSave}
              type='button'
              disabled={isCheckingConflicts}
            >
              {isCheckingConflicts ? 'Checking...' : 'Save'}
            </Button.Root>
          </div>
        </div>
      </div>
    </Popover.Content>
  );
};

export default BookingRecurrenceEditPopoverContent;
