import React, { useState, useEffect, useRef } from 'react';
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

function normalizeValue(value) {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Combined date + time picker: one popover with Calendar and time row (12 : 00 PM).
 * mode: 'date_time' = calendar + time, 'time_only' = only time row.
 * Default is 'date_time'.
 *
 * Updates are committed when the popover closes (like blur), not on every calendar/time tweak,
 * so parent forms are not validated or saved on intermediate steps.
 *
 * @param {() => void} [onBlur] — Called when the popover closes (after any commit), for react-hook-form touched/blur.
 */
function DateTimePicker({
  value,
  onChange,
  onBlur,
  placeholder,
  hasError,
  disabled,
  className,
  popoverContentClassName,
  mode = 'date_time',
  variant = 'default',
  /** Passed to Calendar (DayPicker): earliest selectable calendar day */
  minDate,
  /** Passed to Calendar: latest selectable calendar day */
  maxDate,
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => normalizeValue(value));
  const [month, setMonth] = useState(() => normalizeValue(value) ?? new Date());
  const time12 = to12Hour(value ?? null);
  const [hour, setHour] = useState(time12.hour);
  const [minute, setMinute] = useState(time12.minute);
  const [period, setPeriod] = useState(time12.period);

  const openedValueMsRef = useRef(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (open) return;
    const t = to12Hour(value ?? null);
    setHour(t.hour);
    setMinute(t.minute);
    setPeriod(t.period);
  }, [value, open]);

  useEffect(() => {
    if (open) return;
    const v = normalizeValue(value);
    setDate(v);
    if (v) setMonth(v);
  }, [value, open]);

  useEffect(() => {
    if (open && date) setMonth(date);
  }, [open, date]);

  const handleDateSelect = (selectedDate) => {
    dirtyRef.current = true;
    setDate(selectedDate);
  };

  const handleTimePartChange = (part, value_) => {
    dirtyRef.current = true;
    const nextHour = part === 'hour' ? Number(value_) : hour;
    const nextMinute = part === 'minute' ? value_ : minute;
    const nextPeriod = part === 'period' ? value_ : period;

    setHour(nextHour);
    setMinute(nextMinute);
    setPeriod(nextPeriod);

    const base = date ?? new Date();
    const newDate = from12Hour(base, nextHour, nextMinute, nextPeriod);
    setDate(newDate);
  };

  const handleOpenChange = (nextOpen) => {
    if (nextOpen) {
      dirtyRef.current = false;
      const v = normalizeValue(value);
      openedValueMsRef.current = v ? v.getTime() : null;

      if (mode === 'time_only') {
        const seed = v ?? new Date();
        setDate(seed);
        setMonth(seed);
      } else {
        setDate(v);
        if (v) setMonth(v);
      }

      const t = to12Hour(v ?? null);
      setHour(t.hour);
      setMinute(t.minute);
      setPeriod(t.period);
      setOpen(true);
      return;
    }

    setOpen(false);

    const base = date ?? new Date();
    const final = from12Hour(base, hour, minute, period);
    const openedAt = openedValueMsRef.current;

    if (!dirtyRef.current) {
      onBlur?.();
      return;
    }
    if (openedAt !== null && final.getTime() === openedAt) {
      onBlur?.();
      return;
    }

    onChange?.(final);
    onBlur?.();
  };

  const normalizedValue = normalizeValue(value);
  /** While popover is open, show draft so label matches calendar/time edits before commit */
  const previewDate = open ? from12Hour(date ?? new Date(), hour, minute, period) : null;
  const displayValue = previewDate ?? normalizedValue;

  const displayLabel =
    displayValue &&
    !Number.isNaN(displayValue.getTime()) &&
    (mode === 'time_only'
      ? format(displayValue, 'hh : mm a')
      : format(displayValue, 'LLL dd, y • hh : mm a'));

  const showCalendar = mode === 'date_time';

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <Button.Root
          variant='neutral'
          mode={variant === 'borderless' ? 'ghost' : 'stroke'}
          disabled={disabled}
          className={cn(
            'w-full inline-flex items-center justify-start gap-1 text-left text-paragraph-sm',
            !displayValue && 'text-text-soft-400',
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
        className={cn('p-0 max-w-[calc(100vw-32px)]', popoverContentClassName)}
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
              min={minDate}
              max={maxDate}
            />
          )}
          <div className='flex items-center justify-center gap-1 border-t border-stroke-soft-200 p-3'>
            <Select.Root
              value={hour.toString()}
              onValueChange={(v) => handleTimePartChange('hour', v)}
              size='xsmall'
              matchTriggerWidth={false}
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
              matchTriggerWidth={false}
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
              matchTriggerWidth={false}
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

export { DateTimePicker };
