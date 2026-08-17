import React, { useEffect, useMemo, useRef } from 'react';
import { Controller, useWatch, useFormState } from 'react-hook-form';
import { RiTimeLine, RiAlertFill } from 'react-icons/ri';
import { startOfDay, subDays, addMinutes, parseISO, endOfDay } from 'date-fns';
import { RecurrenceType, RecurrenceEndType, RECURRENCE_TYPE_OPTIONS } from '../constants';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Checkbox from '@/components/ui/checkbox';
import * as Label from '@/components/ui/label';
import * as Input from '@/components/ui/input';
import * as Hint from '@/components/ui/hint';
import { Datepicker } from '@/components/ui/datepicker';
import { DateTimePicker } from '@/components/ui/datetimepicker';
import ErrorText from '@/components/ui/error-text';
import BookingRecurrenceFields from './booking-recurrence-fields';
import { formatConflictMessage } from '@/utils/date-utils';

const BookingDateTimeSection = ({
  control,
  errors,
  isSubmitted,
  setValue,
  trigger,
  watchedAllDay,
  watchedRecurrenceType,
  watchedRecurrenceEndType,
  watchedSpaceId,
  isSubmitting,
  hasTimeValidationErrors,
  conflictCheck,
  onViewAllConflicts,
}) => {
  const watchedStartDatetime = useWatch({ control, name: 'start_datetime' });
  const watchedEndDatetime = useWatch({ control, name: 'end_datetime' });
  const { dirtyFields, touchedFields } = useFormState({ control });
  const datetimeInteracted =
    Boolean(dirtyFields?.start_datetime) ||
    Boolean(dirtyFields?.end_datetime) ||
    Boolean(touchedFields?.start_datetime) ||
    Boolean(touchedFields?.end_datetime);
  /** Show validation as soon as the user edits date/time or after submit attempt */
  const showDatetimeErrors = isSubmitted || datetimeInteracted;

  const prevAllDayRef = useRef(false);
  const startSnapshotRef = useRef(watchedStartDatetime);
  startSnapshotRef.current = watchedStartDatetime;

  const startCalendarMin = useMemo(
    () =>
      watchedRecurrenceType === RecurrenceType.ONE_TIME
        ? startOfDay(subDays(new Date(), 1))
        : startOfDay(new Date()),
    [watchedRecurrenceType],
  );

  useEffect(() => {
    const turnedOn = watchedAllDay && !prevAllDayRef.current;
    prevAllDayRef.current = watchedAllDay;
    if (!watchedAllDay || !turnedOn) return;

    let base = new Date();
    const raw = startSnapshotRef.current;
    if (raw) {
      const p = parseISO(raw);
      if (!Number.isNaN(p.getTime())) base = p;
    }

    const d0 = startOfDay(base);
    setValue('start_datetime', d0.toISOString(), {
      shouldValidate: false,
      shouldDirty: true,
      shouldTouch: true,
    });
    setValue('end_datetime', endOfDay(d0).toISOString(), {
      shouldValidate: false,
      shouldDirty: true,
      shouldTouch: true,
    });
    trigger(['start_datetime', 'end_datetime']);
  }, [watchedAllDay, setValue, trigger]);

  const handleRecurrenceTypeChange = (value) => {
    setValue('recurrence_type', value);
    if (value !== RecurrenceType.ONE_TIME) {
      setValue('recurrence_end_type', RecurrenceEndType.AFTER_OCCURRENCES);
    }
    trigger(['start_datetime', 'end_datetime']);
  };

  return (
    <div className='border border-stroke-soft-200 rounded-[10px] overflow-hidden shrink-0'>
      <div className='bg-bg-weak-100 flex items-center gap-2 px-3 py-1.5'>
        <RiTimeLine className='size-5 text-text-sub-500' />
        <h3 className='text-label-sm text-text-sub-500'>Date & Time</h3>
      </div>

      <div className='flex flex-col gap-3 px-4 pb-4 pt-3'>
        <div className='flex flex-col gap-4 sm:flex-row sm:gap-4'>
          <div className='flex-1 flex flex-col gap-1'>
            <Label.Root className='text-text-main-900'>
              Start date & time <Label.Asterisk />
            </Label.Root>
            <Controller
              name='start_datetime'
              control={control}
              render={({ field }) => (
                <DateTimePicker
                  value={field.value ? parseISO(field.value) : undefined}
                  onBlur={field.onBlur}
                  onChange={(d) => {
                    field.onChange(d.toISOString());
                    if (watchedEndDatetime) {
                      const endD = parseISO(watchedEndDatetime);
                      if (!Number.isNaN(endD.getTime()) && endD.getTime() <= d.getTime()) {
                        setValue('end_datetime', addMinutes(d, 30).toISOString(), {
                          shouldValidate: true,
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }
                    } else {
                      setValue('end_datetime', addMinutes(d, 30).toISOString(), {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      });
                    }
                    trigger(['start_datetime', 'end_datetime']);
                  }}
                  placeholder='Select start'
                  disabled={watchedAllDay || isSubmitting}
                  hasError={showDatetimeErrors && Boolean(errors.start_datetime)}
                  minDate={startCalendarMin}
                />
              )}
            />
            {showDatetimeErrors && errors.start_datetime && (
              <ErrorText>{errors.start_datetime.message}</ErrorText>
            )}
          </div>

          <div className='flex-1 flex flex-col gap-1'>
            <Label.Root className='text-text-main-900'>
              End date & time <Label.Asterisk />
            </Label.Root>
            <Controller
              name='end_datetime'
              control={control}
              render={({ field }) => (
                <DateTimePicker
                  value={field.value ? parseISO(field.value) : undefined}
                  onBlur={field.onBlur}
                  onChange={(d) => {
                    field.onChange(d.toISOString());
                    trigger(['start_datetime', 'end_datetime']);
                  }}
                  placeholder='Select end'
                  disabled={watchedAllDay || isSubmitting}
                  hasError={showDatetimeErrors && Boolean(errors.end_datetime)}
                  minDate={startCalendarMin}
                />
              )}
            />
            {showDatetimeErrors && errors.end_datetime && (
              <ErrorText>{errors.end_datetime.message}</ErrorText>
            )}
          </div>
        </div>

        {!hasTimeValidationErrors &&
          watchedSpaceId &&
          watchedRecurrenceType === RecurrenceType.ONE_TIME &&
          conflictCheck?.oneTime?.statusCode === 409 &&
          conflictCheck?.oneTime?.errorOn === 'booking_time' &&
          conflictCheck?.oneTime?.message && (
            <ErrorText className='-mt-1'>{conflictCheck.oneTime.message}</ErrorText>
          )}

        {/* All Day */}
        <div className='flex items-center gap-2'>
          <Controller
            name='all_day'
            control={control}
            render={({ field }) => (
              <Checkbox.Root id='allDay' checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label.Root htmlFor='allDay' className='text-text-main-900'>
            All Day
          </Label.Root>
        </div>

        {/* --- Recurrence --- */}
        <div className='flex gap-4'>
          <div className='flex-1 flex flex-col gap-1'>
            <Label.Root className='text-text-main-900'>Recurrence</Label.Root>
            <Controller
              name='recurrence_type'
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  size='small'
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleRecurrenceTypeChange(value);
                  }}
                  disabled={watchedAllDay || isSubmitting}
                  options={RECURRENCE_TYPE_OPTIONS}
                  placeholder='Select recurrence'
                  showArrow={true}
                  isolateSearchKeyboard
                />
              )}
            />
          </div>

          <div className='flex-1'>
            <BookingRecurrenceFields
              control={control}
              errors={errors}
              isSubmitted={isSubmitted}
              setValue={setValue}
              watchedRecurrenceType={watchedRecurrenceType}
              watchedRecurrenceEndType={watchedRecurrenceEndType}
            />
          </div>
        </div>

        {/* Recurrence End Logic */}
        {watchedRecurrenceType === RecurrenceType.ONE_TIME ? null : (
          <div className='flex flex-1'>
            <div className='flex flex-col gap-1 shrink-0'>
              <Label.Root className='text-text-main-900'>
                Recurrence Ends <Label.Asterisk />
              </Label.Root>
              <div className='group relative'>
                <div
                  className={`flex rounded-lg before:absolute before:inset-0 before:ring-1 before:ring-inset before:pointer-events-none before:rounded-[inherit] overflow-hidden ${isSubmitted && (errors.recurrence_end_date || errors.recurrence_occurrences) ? 'before:ring-error-base' : 'before:ring-stroke-soft-200'}`}
                >
                  <div className='flex bg-bg-weak-100 p-1 border-r border-stroke-soft-200'>
                    <button
                      type='button'
                      onClick={() => setValue('recurrence_end_type', RecurrenceEndType.ON_DATE)}
                      className={`px-2.5 py-1 rounded-md text-[14px] font-medium transition-colors ${watchedRecurrenceEndType === RecurrenceEndType.ON_DATE ? 'bg-white shadow-sm' : 'text-text-soft-400'}`}
                    >
                      On
                    </button>
                    <button
                      type='button'
                      onClick={() =>
                        setValue('recurrence_end_type', RecurrenceEndType.AFTER_OCCURRENCES)
                      }
                      className={`px-2.5 py-1 rounded-md text-[14px] font-medium transition-colors ${watchedRecurrenceEndType === RecurrenceEndType.AFTER_OCCURRENCES ? 'bg-white shadow-sm' : 'text-text-soft-400'}`}
                    >
                      After
                    </button>
                  </div>
                  <div className='flex-1 bg-white p-px'>
                    {watchedRecurrenceEndType === RecurrenceEndType.ON_DATE ? (
                      <Controller
                        name='recurrence_end_date'
                        control={control}
                        render={({ field }) => (
                          <Datepicker
                            value={field.value ? new Date(field.value) : undefined}
                            onChange={(date) => {
                              field.onChange(date ? date.toISOString() : '');
                            }}
                            size='small'
                            min={new Date()}
                          />
                        )}
                      />
                    ) : (
                      <Controller
                        name='recurrence_occurrences'
                        control={control}
                        render={({ field }) => {
                          const handleChange = (e) => {
                            const raw = e.target.value.replaceAll(/\D/g, '');
                            if (raw === '') {
                              field.onChange(undefined);
                              return;
                            }
                            const number_ = Number.parseInt(raw, 10);
                            field.onChange(Number.isNaN(number_) ? undefined : number_);
                          };
                          return (
                            <Input.Root size='small' variant='borderless'>
                              <Input.Wrapper>
                                <Input.Input
                                  type='text'
                                  inputMode='numeric'
                                  value={field.value ?? ''}
                                  onChange={handleChange}
                                  placeholder='7'
                                />
                              </Input.Wrapper>
                            </Input.Root>
                          );
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {isSubmitted && errors.recurrence_end_date && (
                <ErrorText>{errors.recurrence_end_date.message}</ErrorText>
              )}
              {isSubmitted && errors.recurrence_occurrences && (
                <ErrorText>{errors.recurrence_occurrences.message}</ErrorText>
              )}
            </div>
            <div className='flex flex-1' />
          </div>
        )}

        {!hasTimeValidationErrors &&
          watchedSpaceId &&
          watchedRecurrenceType !== RecurrenceType.ONE_TIME &&
          conflictCheck?.conflicts?.length > 0 && (
            <Hint.Root hasError className=''>
              <Hint.Icon as={RiAlertFill} />
              <span className='text-paragraph-xs'>
                {formatConflictMessage(conflictCheck.conflicts)}{' '}
                <button
                  type='button'
                  className='underline font-medium text-text-sub-500'
                  onClick={onViewAllConflicts}
                >
                  View All
                </button>
              </span>
            </Hint.Root>
          )}
      </div>
    </div>
  );
};

export default BookingDateTimeSection;
