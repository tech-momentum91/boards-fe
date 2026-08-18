// AlignUI Datepicker v0.0.0

'use client';

import * as React from 'react';
import { format } from 'date-fns';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import * as Popover from '@/components/ui/popover';
import * as DatepickerPrimivites from '@/components/ui/calendar';
import DatePickerTimeRow, {
  from12Hour,
  to12Hour,
} from '@/pages/boards/components/date-picker-time-row';
import { cn } from '@/utils/cn';

function normalizeValue(value) {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function Datepicker({
  value,
  defaultValue,
  onChange,
  onBlur,
  disabled,
  placeholder = 'Select a date',
  hasError = false,
  min,
  max,
  size = 'medium',
  readonly = false,
  variant = 'borderless',
  formatDate,
  optionalTime = false,
  valueIncludesTime = false,
  className,
  prefixIcon,
  suffixIcon,
  ...rest
}) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(() => normalizeValue(value ?? defaultValue));
  const [month, setMonth] = React.useState(
    () => normalizeValue(value ?? defaultValue) ?? new Date(),
  );
  const initialTime = to12Hour(normalizeValue(value ?? defaultValue) ?? null);
  const [hour, setHour] = React.useState(initialTime.hour);
  const [minute, setMinute] = React.useState(initialTime.minute);
  const [period, setPeriod] = React.useState(initialTime.period);
  const [includeTime, setIncludeTime] = React.useState(false);
  const openedValueMsRef = React.useRef(null);
  const dirtyRef = React.useRef(false);

  React.useEffect(() => {
    if (open) {
      return;
    }

    const normalized = normalizeValue(value ?? defaultValue);
    setDate(normalized);

    if (normalized) {
      setMonth(normalized);
    }

    const time = to12Hour(normalized ?? null);
    setHour(time.hour);
    setMinute(time.minute);
    setPeriod(time.period);
  }, [defaultValue, open, value]);

  React.useEffect(() => {
    if (open && date) {
      setMonth(date);
    }
  }, [open, date]);

  const buildSelectedDate = React.useCallback(
    (baseDate, nextIncludeTime = includeTime) => {
      const base = baseDate ?? date ?? new Date();

      if (!optionalTime || !nextIncludeTime) {
        return base;
      }

      return from12Hour(base, hour, minute, period);
    },
    [date, hour, includeTime, minute, optionalTime, period],
  );

  const getDisplayDate = () => {
    const normalized = normalizeValue(value ?? defaultValue);

    if (open) {
      return buildSelectedDate(date);
    }

    return normalized;
  };

  const displayDate = getDisplayDate();

  const displayLabel = displayDate
    ? formatDate
      ? formatDate(displayDate)
      : optionalTime && (open ? includeTime : valueIncludesTime)
        ? format(displayDate, 'LLL dd, y • hh:mm a')
        : format(displayDate, 'LLL dd, y')
    : null;

  const handleDateSelect = (selectedDate) => {
    dirtyRef.current = true;
    setDate(selectedDate);

    if (!optionalTime) {
      setDate(selectedDate);
      onChange?.(selectedDate);
      setOpen(false);
    }
  };

  const handleOpenChange = (nextOpen) => {
    if (!optionalTime) {
      setOpen(nextOpen);
      return;
    }

    if (nextOpen) {
      dirtyRef.current = false;
      const normalized = normalizeValue(value ?? defaultValue);
      openedValueMsRef.current = normalized ? normalized.getTime() : null;
      setDate(normalized);
      if (normalized) {
        setMonth(normalized);
      }

      const hasTime =
        valueIncludesTime ||
        (normalized
          ? normalized.getHours() !== 0 ||
            normalized.getMinutes() !== 0 ||
            normalized.getSeconds() !== 0
          : false);
      const time = to12Hour(normalized ?? null);
      setHour(time.hour);
      setMinute(time.minute);
      setPeriod(time.period);
      setIncludeTime(hasTime);
      setOpen(true);
      return;
    }

    setOpen(false);

    if (!dirtyRef.current) {
      onBlur?.();
      return;
    }

    const finalDate = buildSelectedDate(date, includeTime);
    const openedAt = openedValueMsRef.current;

    if (openedAt !== null && finalDate.getTime() === openedAt) {
      onBlur?.();
      return;
    }

    onChange?.(finalDate, { includeTime });
    onBlur?.();
  };

  const handleIncludeTimeChange = (checked) => {
    dirtyRef.current = true;
    setIncludeTime(Boolean(checked));
  };

  const handleTimeChange = ({ hour: nextHour, minute: nextMinute, period: nextPeriod }) => {
    dirtyRef.current = true;
    setHour(nextHour);
    setMinute(nextMinute);
    setPeriod(nextPeriod);
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange} {...rest}>
      <Popover.Trigger asChild>
        <Button.Root
          {...(variant === 'borderless'
            ? {
                variant: 'neutral',
                mode: 'ghost',
              }
            : {
                variant: 'neutral',
                mode: 'stroke',
              })}
          disabled={disabled}
          {...(readonly && {
            onClick: (event) => {
              event.preventDefault();
              event.stopPropagation();
            },
          })}
          className={cn(
            'w-full inline-flex items-center justify-start gap-1 text-left text-paragraph-sm',
            !displayDate && 'text-text-soft-400',
            hasError && [
              'ring-1! ring-inset! ring-error-base!',
              'focus-visible:ring-error-base! focus-visible:shadow-button-error-focus!',
              'hover:ring-error-base!',
            ],
            className,
          )}
          size={size}
        >
          {prefixIcon ? <span className='flex shrink-0 items-center'>{prefixIcon}</span> : null}
          <span className='flex-1 truncate'>{displayLabel || placeholder}</span>
          {suffixIcon ? <span className='flex shrink-0 items-center'>{suffixIcon}</span> : null}
        </Button.Root>
      </Popover.Trigger>
      <Popover.Content
        className='z-[100] max-w-[calc(100vw-32px)] overflow-hidden bg-bg-white-0 p-0'
        showArrow={false}
        side='bottom'
        align='start'
        sideOffset={8}
        collisionPadding={16}
      >
        <div className='flex flex-col bg-bg-white-0'>
          <DatepickerPrimivites.Calendar
            mode='single'
            selected={date}
            onSelect={handleDateSelect}
            month={month}
            onMonthChange={setMonth}
            min={min}
            max={max}
            className='bg-bg-white-0 p-3'
          />
          {optionalTime ? (
            <div className='flex flex-col gap-3 border-t border-stroke-soft-200 bg-bg-white-0 p-3'>
              <label className='flex items-center gap-2'>
                <Checkbox.Root
                  checked={includeTime}
                  onCheckedChange={handleIncludeTimeChange}
                  disabled={disabled}
                />
                <span className='text-label-sm text-text-sub-600'>Add time</span>
              </label>
              {includeTime ? (
                <DatePickerTimeRow
                  hour={hour}
                  minute={minute}
                  period={period}
                  onChange={handleTimeChange}
                  disabled={disabled}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

export { Datepicker };
