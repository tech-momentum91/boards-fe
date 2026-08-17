import React, { memo, useState } from 'react';
import { RiArrowDownSLine } from 'react-icons/ri';

import * as Badge from '@/components/ui/badge';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';

function getBadgeCaretTheme(color, variant = 'filled') {
  if (variant === 'light' || variant === 'lighter') {
    return {
      divider: 'border-current/20',
      icon: 'text-current',
    };
  }

  if (color === 'yellow') {
    return {
      divider: 'border-black/20',
      icon: 'text-text-main-900',
    };
  }

  return {
    divider: 'border-white/40',
    icon: 'text-static-white',
  };
}

export function AumBadgeWithCaret({
  children,
  color = 'gray',
  variant = 'filled',
  className,
  showCaret = true,
  as: Component = 'div',
  ...props
}) {
  const caretTheme = getBadgeCaretTheme(color, variant);
  const isSoftVariant = variant === 'light' || variant === 'lighter';

  return (
    <Badge.Root
      asChild
      size='small'
      variant={variant}
      color={color}
      className={cn(
        'inline-flex h-5 min-h-5 w-fit min-w-0 max-w-full items-stretch gap-0 overflow-hidden p-0 normal-case',
        isSoftVariant ? 'rounded-full' : 'rounded-md',
        showCaret ? 'pr-0.5' : 'px-2',
        className,
      )}
    >
      <Component {...props} title={typeof children === 'string' ? children : props.title}>
        <span className='flex min-w-0 flex-1 items-center truncate px-2 text-subheading-2xs uppercase leading-4 tracking-[0.04em]'>
          {children}
        </span>
        {showCaret ? (
          <span
            className={cn(
              'flex w-5 shrink-0 items-center justify-center self-stretch border-l border-solid p-0.5',
              caretTheme.divider,
            )}
          >
            <RiArrowDownSLine className={cn('size-4 shrink-0', caretTheme.icon)} aria-hidden />
          </span>
        ) : null}
      </Component>
    </Badge.Root>
  );
}

const AumEditableBadgeWithCaret = memo(
  ({
    value,
    options = [],
    onChange,
    color = 'gray',
    variant = 'filled',
    disabled = false,
    ariaLabel,
    uppercase = false,
    className,
  }) => {
    const [open, setOpen] = useState(false);
    const displayValue = uppercase && value ? String(value).toUpperCase() : value;

    if (disabled || options.length === 0) {
      if (!value) return null;
      return (
        <AumBadgeWithCaret color={color} variant={variant} showCaret={false} className={className}>
          {displayValue}
        </AumBadgeWithCaret>
      );
    }

    return (
      <div className={cn('max-w-full', className)}>
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <AumBadgeWithCaret
              as='button'
              type='button'
              color={color}
              variant={variant}
              className='max-w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-base'
              aria-label={ariaLabel ?? `Change ${value}`}
              aria-expanded={open}
            >
              {displayValue}
            </AumBadgeWithCaret>
          </Popover.Trigger>
          <Popover.Content align='start' className='min-w-[140px] p-1'>
            {options.map((option) => (
              <button
                key={option}
                type='button'
                onClick={() => {
                  onChange?.(option);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full rounded-md px-2 py-1.5 text-left text-label-sm text-text-main-900 hover:bg-bg-weak-100',
                  option === value && 'bg-bg-weak-100 font-medium',
                )}
              >
                {uppercase ? String(option).toUpperCase() : option}
              </button>
            ))}
          </Popover.Content>
        </Popover.Root>
      </div>
    );
  },
);

AumEditableBadgeWithCaret.displayName = 'AumEditableBadgeWithCaret';

export default AumEditableBadgeWithCaret;
