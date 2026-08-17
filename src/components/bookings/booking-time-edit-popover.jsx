import React from 'react';
import { parseISO, startOfDay, subDays } from 'date-fns';
import * as Popover from '@/components/ui/popover';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import { DateTimePicker } from '@/components/ui/datetimepicker';
import ErrorText from '@/components/ui/error-text';
import BookingConflictsHint from '@/components/bookings/booking-conflicts-hint';

const datetimeMinDate = startOfDay(subDays(new Date(), 1));

const BookingTimeEditPopoverContent = ({
  timeFieldRef,
  datetimeInputs,
  datetimeErrors,
  onDatetimeChange,
  showOneTimeConflictError,
  oneTimeConflictMessage,
  shouldShowRecurrence,
  timeEditConflicts,
  onViewAllConflicts,
  onSave,
  onCancel,
}) => {
  const showSeriesConflictHint =
    shouldShowRecurrence &&
    timeEditConflicts?.length > 0 &&
    !datetimeErrors?.start &&
    !datetimeErrors?.end;

  return (
    <Popover.Content className='w-[min(100vw-2rem,520px)] p-4' align='start' sideOffset={8}>
      <div className='flex flex-col gap-4'>
        <p className='text-subheading-2xsmall text-text-soft-400 uppercase tracking-wide'>
          Edit schedule
        </p>

        <div ref={timeFieldRef} className='flex flex-col gap-4 w-full'>
          <div className='flex flex-col gap-4 sm:flex-row sm:gap-4'>
            <div className='flex-1 flex flex-col gap-1'>
              <Label.Root className='text-text-main-900'>Start date &amp; time</Label.Root>
              <DateTimePicker
                value={datetimeInputs?.startIso ? parseISO(datetimeInputs.startIso) : undefined}
                onChange={(d) => onDatetimeChange('start', d)}
                placeholder='Select start'
                minDate={datetimeMinDate}
                hasError={Boolean(datetimeErrors?.start)}
              />
              {datetimeErrors?.start && <ErrorText>{datetimeErrors.start}</ErrorText>}
            </div>
            <div className='flex-1 flex flex-col gap-1'>
              <Label.Root className='text-text-main-900'>End date &amp; time</Label.Root>
              <DateTimePicker
                value={datetimeInputs?.endIso ? parseISO(datetimeInputs.endIso) : undefined}
                onChange={(d) => onDatetimeChange('end', d)}
                placeholder='Select end'
                minDate={datetimeMinDate}
                hasError={Boolean(datetimeErrors?.end)}
              />
              {datetimeErrors?.end && <ErrorText>{datetimeErrors.end}</ErrorText>}
            </div>
          </div>

          {showSeriesConflictHint && (
            <BookingConflictsHint conflicts={timeEditConflicts} onViewAll={onViewAllConflicts} />
          )}

          {showOneTimeConflictError && oneTimeConflictMessage && (
            <ErrorText>{oneTimeConflictMessage}</ErrorText>
          )}

          <div className='flex items-center justify-end gap-3 pt-2'>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              type='button'
              onClick={onCancel}
            >
              Cancel
            </Button.Root>
            <Button.Root
              variant='primary'
              mode='filled'
              size='small'
              type='button'
              onClick={onSave}
            >
              Save
            </Button.Root>
          </div>
        </div>
      </div>
    </Popover.Content>
  );
};

export default BookingTimeEditPopoverContent;
