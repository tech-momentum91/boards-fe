import React from 'react';
import { format } from 'date-fns';
import { RiCheckLine } from 'react-icons/ri';

import ClientHotDeskMonthlyRecurrenceDatesField from '@/components/clients-management/client-detail-allocate/client-hot-desk-monthly-recurrence-dates-field';
import ClientHotDeskScheduleTimeField from '@/components/clients-management/client-detail-allocate/client-hot-desk-schedule-time-field';
import * as ButtonGroup from '@/components/ui/button-group';
import { Datepicker } from '@/components/ui/datepicker';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import { cn } from '@/utils/cn';

const RECURRENCE_END_BUTTON_ACTIVE_CLASS =
  'data-[state=on]:z-1 data-[state=on]:bg-primary-lighter data-[state=on]:ring-1 data-[state=on]:ring-primary-base';

export const HOT_DESK_RECURRENCE_TYPES = [
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
];

export const HOT_DESK_WEEKDAY_OPTIONS = [
  { key: 'sun', label: 'S', fullName: 'Sunday' },
  { key: 'mon', label: 'M', fullName: 'Monday' },
  { key: 'tue', label: 'T', fullName: 'Tuesday' },
  { key: 'wed', label: 'W', fullName: 'Wednesday' },
  { key: 'thu', label: 'T', fullName: 'Thursday' },
  { key: 'fri', label: 'F', fullName: 'Friday' },
  { key: 'sat', label: 'S', fullName: 'Saturday' },
];

export const HOT_DESK_RECURRENCE_END_ON = 'On';
export const HOT_DESK_RECURRENCE_END_AFTER = 'After';

/**
 * Recurring hot-desk assignment schedule (matches assign co-worker modal design).
 *
 * @param {{
 *   disabled?: boolean,
 *   recurrenceType: string,
 *   onRecurrenceTypeChange: (value: string) => void,
 *   selectedDayKeys: string[],
 *   onToggleDayKey: (key: string) => void,
 *   startTime: string,
 *   onStartTimeChange: (value: string) => void,
 *   endTime: string,
 *   onEndTimeChange: (value: string) => void,
 *   recurrenceEndType: string,
 *   onRecurrenceEndTypeChange: (value: string) => void,
 *   recurrenceEndDate: string,
 *   onRecurrenceEndDateChange: (value: string) => void,
 *   recurrenceEndAfter: string,
 *   onRecurrenceEndAfterChange: (value: string) => void,
 *   selectedMonthDays?: number[],
 *   onMonthDaysChange?: (days: number[]) => void,
 *   startDate: string,
 *   onStartDateChange: (value: string) => void,
 *   isHalfDay: boolean,
 *   onHalfDayChange: (checked: boolean) => void,
 * }} props
 */
export function ClientHotDeskRecurringFields({
  disabled = false,
  recurrenceType,
  onRecurrenceTypeChange,
  selectedDayKeys,
  onToggleDayKey,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  recurrenceEndType,
  onRecurrenceEndTypeChange,
  recurrenceEndDate,
  onRecurrenceEndDateChange,
  recurrenceEndAfter,
  onRecurrenceEndAfterChange,
  selectedMonthDays = [],
  onMonthDaysChange,
  startDate,
  onStartDateChange,
  isHalfDay,
  onHalfDayChange,
}) {
  const parseDateValue = (value) => {
    if (!value) return undefined;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };

  const showWeekdays = recurrenceType === 'Weekly';
  const showMonthlyDates = recurrenceType === 'Monthly';

  return (
    <div className={cn('flex flex-col gap-4 ', disabled && 'pointer-events-none opacity-40')}>
      <div className='flex flex-col gap-1.5'>
        <Label.Root>
          Start Date
          <Label.Asterisk className='text-red-500' />
        </Label.Root>
        <Datepicker
          value={parseDateValue(startDate)}
          onChange={(date) => onStartDateChange(date ? format(date, 'yyyy-MM-dd') : '')}
          placeholder='DD / MM / YYYY'
          size='small'
          variant='default'
          disabled={disabled}
          className='bg-white'
        />
      </div>

      <ClientHotDeskHalfDayCheckbox
        checked={isHalfDay}
        onCheckedChange={onHalfDayChange}
        disabled={disabled}
      />

      <div className='flex flex-col gap-1.5'>
        <Label.Root>
          Recurrence
          <Label.Asterisk className='text-red-500' />
        </Label.Root>
        <Select.Root
          value={recurrenceType}
          onValueChange={onRecurrenceTypeChange}
          size='small'
          disabled={disabled}
        >
          <Select.Trigger className='w-full bg-white'>
            <Select.Value placeholder='Select' />
          </Select.Trigger>
          <Select.Content>
            {HOT_DESK_RECURRENCE_TYPES.map((opt) => (
              <Select.Item key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </div>

      {showMonthlyDates && onMonthDaysChange ? (
        <ClientHotDeskMonthlyRecurrenceDatesField
          disabled={disabled}
          selectedMonthDays={selectedMonthDays}
          onMonthDaysChange={onMonthDaysChange}
        />
      ) : null}

      {showWeekdays ? (
        <div className='flex flex-col gap-2'>
          <Label.Root>
            Set Recurrence Day
            <Label.Asterisk className='text-red-500' />
          </Label.Root>
          <div className='flex flex-wrap gap-2'>
            {HOT_DESK_WEEKDAY_OPTIONS.map((day) => {
              const isSelected = selectedDayKeys.includes(day.key);
              return (
                <button
                  key={day.key}
                  type='button'
                  disabled={disabled}
                  aria-pressed={isSelected}
                  aria-label={day.fullName}
                  onClick={() => onToggleDayKey(day.key)}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-full border text-label-sm font-medium transition',
                    isSelected
                      ? 'border-primary-base bg-primary-base text-static-white'
                      : 'border-stroke-soft-200 bg-white text-text-sub-600 hover:border-stroke-soft-300',
                  )}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <ClientHotDeskScheduleTimeField
        bookingDate={startDate}
        startTime={startTime}
        endTime={endTime}
        onStartTimeChange={onStartTimeChange}
        onEndTimeChange={onEndTimeChange}
        disabled={disabled}
      />

      <div className='flex flex-col gap-2'>
        <Label.Root>
          Recurrence Ends
          <Label.Asterisk className='text-red-500' />
        </Label.Root>
        <div className='flex flex-wrap items-center gap-2'>
          <ButtonGroup.Root size='small'>
            {[HOT_DESK_RECURRENCE_END_ON, HOT_DESK_RECURRENCE_END_AFTER].map((mode) => (
              <ButtonGroup.Item
                key={mode}
                type='button'
                disabled={disabled}
                data-state={recurrenceEndType === mode ? 'on' : 'off'}
                className={cn('min-w-[52px]', RECURRENCE_END_BUTTON_ACTIVE_CLASS)}
                onClick={() => onRecurrenceEndTypeChange(mode)}
              >
                {mode}
              </ButtonGroup.Item>
            ))}
          </ButtonGroup.Root>

          {recurrenceEndType === HOT_DESK_RECURRENCE_END_ON ? (
            <div className='min-w-[180px] flex-1'>
              <Datepicker
                value={parseDateValue(recurrenceEndDate)}
                onChange={(date) =>
                  onRecurrenceEndDateChange(date ? format(date, 'yyyy-MM-dd') : '')
                }
                placeholder='DD / MM / YYYY'
                size='small'
                variant='default'
                disabled={disabled}
                className='bg-white'
              />
            </div>
          ) : (
            <div className='min-w-[120px] flex-1'>
              <Input.Root size='small'>
                <Input.Wrapper className='bg-white'>
                  <Input.Input
                    type='number'
                    min={1}
                    placeholder='Occurrences'
                    value={recurrenceEndAfter}
                    onChange={(e) => onRecurrenceEndAfterChange(e.target.value)}
                    disabled={disabled}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Styled recurring-assignment checkbox row.
 *
 * @param {{
 *   checked: boolean,
 *   onCheckedChange: (checked: boolean) => void,
 *   disabled?: boolean,
 * }} props
 */
function ClientHotDeskStyledCheckbox({ checked, onCheckedChange, disabled, label }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2.5',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <span
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded border transition',
          checked
            ? 'border-primary-base bg-primary-base text-static-white'
            : 'border-stroke-soft-300 bg-white',
        )}
      >
        {checked ? <RiCheckLine className='size-3' aria-hidden /> : null}
      </span>
      <input
        type='checkbox'
        className='sr-only'
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
      <span className='text-paragraph-sm font-medium text-text-strong-950'>{label}</span>
    </label>
  );
}

export function ClientHotDeskRecurringCheckbox({ checked, onCheckedChange, disabled = false }) {
  return (
    <ClientHotDeskStyledCheckbox
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      label='Recurring Assignment'
    />
  );
}

export function ClientHotDeskHalfDayCheckbox({ checked, onCheckedChange, disabled = false }) {
  return (
    <ClientHotDeskStyledCheckbox
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      label='Half Day'
    />
  );
}
