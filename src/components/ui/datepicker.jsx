// AlignUI Datepicker v0.0.0

'use client';

import * as React from 'react';
import { format } from 'date-fns';

import * as Button from '@/components/ui/button';
import * as Popover from '@/components/ui/popover';
import * as DatepickerPrimivites from '@/components/ui/calendar';
import { cn } from '@/utils/cn';

function Datepicker({
  value,
  defaultValue,
  onChange,
  disabled,
  placeholder = 'Select a date',
  hasError = false,
  min,
  max,
  size = 'medium',
  readonly = false,
  variant = 'borderless',
  formatDate,
  className,
  popoverContentClassName,
  prefixIcon,
  suffixIcon,
  iconOnlyWhenEmpty = false,
  triggerAriaLabel,
  ...rest
}) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(value ?? defaultValue ?? undefined);
  const [month, setMonth] = React.useState(() => {
    return value ?? defaultValue ?? new Date();
  });

  React.useEffect(() => {
    setDate(value ?? defaultValue ?? undefined);
    if (value ?? defaultValue) {
      setMonth(value ?? defaultValue);
    }
  }, [value, defaultValue]);

  React.useEffect(() => {
    if (open && date) {
      setMonth(date);
    }
  }, [open, date]);

  const handleChange = (selectedDate) => {
    setDate(selectedDate);
    onChange?.(selectedDate);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen} {...rest}>
      <Popover.Trigger asChild>
        <Button.Root
          // variant={variant}
          // mode={mode}
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
          aria-label={triggerAriaLabel}
          {...(readonly && {
            onClick: (e) => {
              e.preventDefault();
              e.stopPropagation();
            },
          })}
          className={cn(
            'w-full inline-flex items-center justify-start gap-1 text-left text-paragraph-sm',
            !date && 'text-text-soft-400',
            iconOnlyWhenEmpty && !date && 'justify-center',
            hasError && [
              'ring-1! ring-inset! ring-error-base!',
              'focus-visible:ring-error-base! focus-visible:shadow-button-error-focus!',
              'hover:ring-error-base!',
            ],
            className,
          )}
          size={size}
        >
          {prefixIcon ? <span className='flex items-center shrink-0'>{prefixIcon}</span> : null}
          {!(iconOnlyWhenEmpty && !date) ? (
            <span className='flex-1 truncate'>
              {date ? (formatDate ? formatDate(date) : format(date, 'LLL dd, y')) : placeholder}
            </span>
          ) : null}
          {suffixIcon ? <span className='flex items-center shrink-0'>{suffixIcon}</span> : null}
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
        <DatepickerPrimivites.Calendar
          mode='single'
          selected={date}
          onSelect={handleChange}
          month={month}
          onMonthChange={setMonth}
          min={min}
          max={max}
        />
      </Popover.Content>
    </Popover.Root>
  );
}

export { Datepicker };
