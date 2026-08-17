import React from 'react';
import { RiCheckLine } from 'react-icons/ri';
import { cn } from '@/utils/cn';
import { INBOX_FILTER_KEYS, INBOX_FILTER_OPTIONS } from './inbox-constants';

export { INBOX_FILTER_KEYS };

const InboxFilterDropdown = ({ appliedFilters = {}, onFiltersChange }) => {
  // Single-select behaviour: only one filter may be active at a time.
  const selectedArray = Array.isArray(appliedFilters) ? appliedFilters : [];
  const selectedValue = selectedArray.length > 0 ? selectedArray[0] : null;

  const handleToggle = (value) => {
    // If clicking the already-selected value -> clear; otherwise select only this value.
    const next = selectedValue === value ? [] : [value];
    onFiltersChange?.([...next]);
  };

  return (
    <div className='min-w-[220px] rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-2 shadow-regular-md'>
      {INBOX_FILTER_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isSelected = selectedValue === option.value;
        return (
          <button
            key={option.value}
            type='button'
            onClick={() => handleToggle(option.value)}
            className={cn(
              'w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-label-sm',
              'text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-strong-950',
              'transition duration-200 ease-out',
            )}
          >
            <span className='flex items-center gap-2'>
              <Icon className='size-5 text-text-sub-500 shrink-0' />
              <span>{option.label}</span>
            </span>
            {isSelected && (
              <RiCheckLine className='size-5 text-primary-base shrink-0' aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default InboxFilterDropdown;
