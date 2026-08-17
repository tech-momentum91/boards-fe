import React, { useState } from 'react';
import { RiRestTimeLine } from 'react-icons/ri';
import { addDays, nextMonday, setHours, setMinutes, format } from 'date-fns';
import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import { SNOOZE_OPTIONS as ALL_SNOOZE_OPTIONS } from './inbox-constants';

const SNOOZE_ONLY_OPTIONS = ALL_SNOOZE_OPTIONS.filter((opt) => opt.value !== 'unsnooze');

function getSnoozeSecondary(value) {
  const now = new Date();
  const at8 = (d) => setMinutes(setHours(d, 8), 0);
  switch (value) {
    case 'tomorrow':
      return format(at8(addDays(now, 1)), 'EEE, h:mma');
    case 'in_2_days':
      return format(at8(addDays(now, 2)), 'EEE, h:mma');
    case 'next_week':
      return format(at8(nextMonday(now)), 'EEE, h:mma');
    default:
      return null;
  }
}

const InboxSnoozePopover = ({
  onSelect,
  onSnooze,
  onUnsnooze,
  triggerClassName,
  isSnoozed = false,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && onOpenChange != null;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;
  const options = isSnoozed ? ALL_SNOOZE_OPTIONS : SNOOZE_ONLY_OPTIONS;

  const handleSelect = (optionValue) => {
    if (optionValue === 'unsnooze') {
      if (onUnsnooze) onUnsnooze();
      else onSelect?.(optionValue);
    } else {
      if (onSnooze) onSnooze(optionValue);
      else onSelect?.(optionValue);
    }
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Popover.Trigger asChild>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='xsmall'
              className={cn('size-8 rounded-lg p-0', triggerClassName)}
              onClick={(e) => e.stopPropagation()}
            >
              <RiRestTimeLine size={18} className='text-text-sub-600' />
            </Button.Root>
          </Popover.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Content size='small' variant='dark'>
          <p>Snooze</p>
        </Tooltip.Content>
      </Tooltip.Root>
      <Popover.Content
        side='top'
        align='end'
        sideOffset={8}
        showArrow={false}
        className='min-w-[220px] rounded-xl p-2'
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className='flex flex-col gap-0.5'>
          {options.map((opt) => {
            const Icon = opt.icon;
            const secondary = opt.secondary ?? getSnoozeSecondary(opt.value);
            return (
              <button
                key={opt.value}
                type='button'
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-label-sm',
                  'text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-strong-950',
                  'transition duration-200 ease-out',
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(opt.value);
                }}
              >
                <span className='flex items-center gap-2'>
                  <Icon className='size-5 shrink-0 text-text-sub-500' aria-hidden />
                  <span>{opt.label}</span>
                </span>
                {secondary && (
                  <span className='paragraph-small shrink-0 text-text-sub-500'>{secondary}</span>
                )}
              </button>
            );
          })}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};

export default InboxSnoozePopover;
