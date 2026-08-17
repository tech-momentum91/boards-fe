import React, { useState, useEffect } from 'react';
import { format, setHours, setMinutes, setSeconds, getHours, getMinutes } from 'date-fns';
import * as Button from '@/components/ui/button';
import * as Popover from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import * as Select from '@/components/ui/select';
import { cn } from '@/utils/cn';

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const AM_PM_OPTIONS = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
];

function to12Hour(date) {
  if (!date) return { hour: 12, minute: '00', period: 'AM' };
  const h = getHours(date);
  const m = getMinutes(date);
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return {
    hour: hour12,
    minute: m.toString().padStart(2, '0'),
    period,
  };
}

function from12Hour(baseDate, hour12, minute, period) {
  const base = baseDate ? new Date(baseDate) : new Date();
  const hours = period === 'AM' ? (hour12 === 12 ? 0 : hour12) : hour12 === 12 ? 12 : hour12 + 12;
  return setSeconds(setMinutes(setHours(base, hours), Number(minute)), 0);
}

/**
 * Combined date + time picker: one popover with Calendar and time row (12 : 00 PM).
 * mode: 'date_time' = calendar + time, 'time_only' = only time row.
 * Default is 'date_time'.
 */
function AttendanceDateTimePicker({
  value,
  onChange,
  placeholder,
  hasError,
  disabled,
  className,
  mode = 'date_time',
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(value ?? undefined);
  const [month, setMonth] = useState(() => value ?? new Date());
  const time12 = to12Hour(value ?? null);
  const [hour, setHour] = useState(time12.hour);
  const [minute, setMinute] = useState(time12.minute);
  const [period, setPeriod] = useState(time12.period);

  useEffect(() => {
    const t = to12Hour(value ?? null);
    setHour(t.hour);
    setMinute(t.minute);
    setPeriod(t.period);
  }, [value]);

  useEffect(() => {
    setDate(value ?? undefined);
    if (value) setMonth(value);
  }, [value]);

  useEffect(() => {
    if (open && date) setMonth(date);
  }, [open, date]);

  const baseDate = date ?? new Date();

  const handleDateSelect = (selectedDate) => {
    setDate(selectedDate);
    const d = from12Hour(selectedDate ?? new Date(), hour, minute, period);
    onChange?.(d);
  };

  const handleTimePartChange = (part, value_) => {
    if (part === 'hour') setHour(Number(value_));
    if (part === 'minute') setMinute(value_);
    if (part === 'period') setPeriod(value_);
    const base = date ?? new Date();
    const newDate = from12Hour(
      base,
      part === 'hour' ? Number(value_) : hour,
      part === 'minute' ? value_ : minute,
      part === 'period' ? value_ : period,
    );
    setDate(newDate);
    onChange?.(newDate);
  };

  const displayLabel =
    value &&
    (mode === 'time_only' ? format(value, 'hh : mm a') : format(value, 'LLL dd, y • hh : mm a'));

  const showCalendar = mode === 'date_time';

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button.Root
          variant='neutral'
          mode='stroke'
          disabled={disabled}
          className={cn(
            'w-full inline-flex items-center justify-start gap-1 text-left text-paragraph-sm',
            !value && 'text-text-soft-400',
            hasError && [
              'ring-1! ring-inset! ring-error-base!',
              'focus-visible:ring-error-base!',
              'hover:ring-error-base!',
            ],
            className,
          )}
          size='small'
        >
          <span className='flex-1 truncate'>{displayLabel || placeholder}</span>
        </Button.Root>
      </Popover.Trigger>
      <Popover.Content
        className='p-0 max-w-[calc(100vw-32px)]'
        showArrow={false}
        side='bottom'
        align='start'
        sideOffset={8}
        collisionPadding={16}
      >
        <div className='flex flex-col'>
          {showCalendar && (
            <Calendar
              mode='single'
              selected={date}
              onSelect={handleDateSelect}
              month={month}
              onMonthChange={setMonth}
            />
          )}
          <div className='flex items-center justify-center gap-1 border-t border-stroke-soft-200 p-3'>
            <Select.Root
              value={hour.toString()}
              onValueChange={(v) => handleTimePartChange('hour', v)}
              size='xsmall'
            >
              <Select.Trigger className='w-14 bg-bg-weak-50'>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {HOUR_OPTIONS.map((h) => (
                  <Select.Item key={h} value={h.toString()}>
                    {h}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <span className='text-paragraph-sm text-text-sub-600'>:</span>
            <Select.Root
              value={minute}
              onValueChange={(v) => handleTimePartChange('minute', v)}
              size='xsmall'
            >
              <Select.Trigger className='w-14 bg-bg-weak-50'>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {MINUTE_OPTIONS.map((m) => (
                  <Select.Item key={m} value={m}>
                    {m}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <Select.Root
              value={period}
              onValueChange={(v) => handleTimePartChange('period', v)}
              size='xsmall'
            >
              <Select.Trigger className='w-14 bg-bg-weak-50'>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {AM_PM_OPTIONS.map((opt) => (
                  <Select.Item key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

export { AttendanceDateTimePicker };
