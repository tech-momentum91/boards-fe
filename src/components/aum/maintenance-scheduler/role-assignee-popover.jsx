import React, { memo, useState } from 'react';

import { MS_ROLE_OPTIONS } from '@/components/aum/maintenance-scheduler/maintenance-scheduler-constants';
import { getMsRoleAbbrev } from '@/components/aum/maintenance-scheduler/maintenance-scheduler-helper';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';

const RoleAssigneePopover = memo(({ value, onValueChange, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const roleAbbrev = getMsRoleAbbrev(value);

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
            'flex h-10 w-full items-center px-3 text-left',
            disabled && 'pointer-events-none cursor-default',
          )}
        >
          {roleAbbrev ? (
            <span className='inline-flex items-center rounded-full border border-stroke-soft-200 px-2 py-0.5 text-subheading-2xs uppercase text-text-sub-500'>
              {roleAbbrev}
            </span>
          ) : (
            <span className='text-paragraph-sm text-text-soft-400'>Select</span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Content
        align='start'
        sideOffset={4}
        showArrow={false}
        className='w-[160px] overflow-hidden rounded-xl p-2 shadow-regular-md'
      >
        {MS_ROLE_OPTIONS.map((option) => {
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              type='button'
              onClick={() => handleSelect(option.value)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-paragraph-sm transition-colors',
                isSelected
                  ? 'bg-bg-weak-100 font-medium text-text-main-900'
                  : 'text-text-main-900 hover:bg-bg-weak-100',
              )}
            >
              <span>{option.label}</span>
              <span className='text-subheading-2xs uppercase text-text-soft-400'>
                {option.abbrev}
              </span>
            </button>
          );
        })}
      </Popover.Content>
    </Popover.Root>
  );
});

RoleAssigneePopover.displayName = 'RoleAssigneePopover';

export default RoleAssigneePopover;
