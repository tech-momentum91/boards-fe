import React, { memo, useState } from 'react';

import { MS_FREQUENCY_OPTIONS } from '@/components/aum/maintenance-scheduler/maintenance-scheduler-constants';
import { getMsFrequencyLabel } from '@/components/aum/maintenance-scheduler/maintenance-scheduler-helper';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';

const FrequencySelectPopover = memo(({ value, onValueChange, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const displayLabel = getMsFrequencyLabel(value);

  const handleSelect = (nextValue) => {
    onValueChange?.(nextValue);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          type='button'
          className={cn(
            'flex h-10 w-full items-center px-3 text-left text-paragraph-sm',
            value ? 'text-text-main-900' : 'text-text-soft-400',
            disabled && 'pointer-events-none cursor-default',
          )}
        >
          {displayLabel}
        </button>
      </Popover.Trigger>

      <Popover.Content
        align='start'
        sideOffset={4}
        showArrow={false}
        className='w-[153px] overflow-hidden rounded-xl p-2 shadow-regular-md'
      >
        {MS_FREQUENCY_OPTIONS.map((option) => {
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              type='button'
              onClick={() => handleSelect(option.value)}
              className={cn(
                'flex w-full items-center rounded-lg px-2 py-2 text-left text-paragraph-sm transition-colors',
                isSelected
                  ? 'bg-bg-weak-100 font-medium text-text-main-900'
                  : 'text-text-main-900 hover:bg-bg-weak-100',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </Popover.Content>
    </Popover.Root>
  );
});

FrequencySelectPopover.displayName = 'FrequencySelectPopover';

export default FrequencySelectPopover;
