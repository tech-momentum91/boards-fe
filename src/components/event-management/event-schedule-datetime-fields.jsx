import React from 'react';
import { Controller, useFormState, useWatch } from 'react-hook-form';
import { addMinutes, parseISO, startOfDay, subDays } from 'date-fns';
import * as Label from '@/components/ui/label';
import { DateTimePicker } from '@/components/ui/datetimepicker';
import ErrorText from '@/components/ui/error-text';

/**
 * Start / end datetime row — matches booking {@link BookingDateTimeSection} behavior (without all-day / recurrence).
 */
export function EventScheduleDateTimeFields({
  control,
  errors,
  isSubmitted,
  setValue,
  trigger,
  isSubmitting,
}) {
  const watchedEndDatetime = useWatch({ control, name: 'end_datetime' });
  const { dirtyFields, touchedFields } = useFormState({ control });
  const datetimeInteracted =
    Boolean(dirtyFields?.start_datetime) ||
    Boolean(dirtyFields?.end_datetime) ||
    Boolean(touchedFields?.start_datetime) ||
    Boolean(touchedFields?.end_datetime);
  const showDatetimeErrors = isSubmitted || datetimeInteracted;

  const startCalendarMin = startOfDay(subDays(new Date(), 1));

  return (
    <div className='flex flex-col gap-4 sm:flex-row sm:gap-4'>
      <div className='flex flex-1 flex-col gap-2'>
        <Label.Root className='text-text-main-900'>
          Start date &amp; time <Label.Asterisk />
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
              disabled={isSubmitting}
              hasError={showDatetimeErrors && Boolean(errors.start_datetime)}
              minDate={startCalendarMin}
            />
          )}
        />
        {showDatetimeErrors && errors.start_datetime && (
          <ErrorText>{errors.start_datetime.message}</ErrorText>
        )}
      </div>

      <div className='flex flex-1 flex-col gap-2'>
        <Label.Root className='text-text-main-900'>
          End date &amp; time <Label.Asterisk />
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
              disabled={isSubmitting}
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
  );
}
