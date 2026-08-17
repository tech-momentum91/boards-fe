import React, { useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TICKET_QUICK_STATUS_FILTER_OPTIONS, STATUS_FILTER_ICONS } from './constants';

const chipLabelClassName = (isActive) =>
  cn(
    'text-center font-[Inter,sans-serif] text-xs font-medium not-italic leading-[18px]',
    isActive
      ? 'text-[#344054]'
      : 'text-[var(--Component-colors-Utility-Gray-utility-gray-500,#667085)]',
  );

const StatusFilterIcon = ({ iconKey, isActive }) => {
  const Icon = STATUS_FILTER_ICONS[iconKey];
  if (!Icon) return null;

  return (
    <Icon
      className={cn(
        'size-4 shrink-0',
        isActive
          ? 'text-[#344054]'
          : 'text-[var(--Component-colors-Utility-Gray-utility-gray-500,#667085)]',
      )}
      aria-hidden
    />
  );
};

const TicketStatusFilters = ({ className, value, onValueChange, hideClosed = false }) => {
  const options = useMemo(
    () =>
      hideClosed
        ? TICKET_QUICK_STATUS_FILTER_OPTIONS.filter((option) => option.value !== 'Closed')
        : TICKET_QUICK_STATUS_FILTER_OPTIONS,
    [hideClosed],
  );

  const handleSelect = useCallback(
    (nextValue) => {
      if (!nextValue) return;
      onValueChange?.(nextValue === value ? '' : nextValue);
    },
    [onValueChange, value],
  );

  return (
    <div
      className={cn(
        'flex h-6 w-full max-w-[884px] shrink-0 flex-wrap items-center gap-2',
        className,
      )}
      role='group'
      aria-label='Filter tickets by status'
    >
      {options.map((option) => {
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            type='button'
            aria-pressed={isActive}
            onClick={() => handleSelect(option.value)}
            className={cn(
              'inline-flex h-6 shrink-0 items-center gap-1 rounded-full border-[1.5px] border-solid py-0 pl-2 pr-2.5',
              'transition-colors duration-200 ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-offset-1',
              isActive
                ? 'border-primary-base bg-primary-lighter'
                : 'border-[#D0D5DD] bg-transparent hover:bg-bg-weak-50',
            )}
          >
            <StatusFilterIcon iconKey={option.iconKey} isActive={isActive} />
            <span className={chipLabelClassName(isActive)}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default TicketStatusFilters;
