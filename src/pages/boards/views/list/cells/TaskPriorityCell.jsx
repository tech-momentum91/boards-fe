import { useState } from 'react';
import { RiFlagLine } from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import * as Popover from '@/components/ui/popover';
import { getPriorityColor, TASK_PRIORITY_OPTIONS } from '@/components/clients-management/constants';
import { cn } from '@/utils/cn';

export default function TaskPriorityCell({
  taskId,
  priority = '',
  onUpdate,
  disabled = false,
  compact = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedPriority = String(priority ?? '').trim();
  const hasPriority = Boolean(selectedPriority);

  const handleSelect = (value) => {
    onUpdate?.(taskId, value);
    setIsOpen(false);
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          type='button'
          disabled={disabled}
          aria-label='Edit priority'
          className={cn(
            'flex h-full w-full items-center text-left transition-colors',
            compact ? 'gap-1 px-2' : 'min-h-11 gap-1.5 px-3',
            'hover:bg-bg-weak-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-inset',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          {hasPriority ? (
            <>
              {!compact ? <RiFlagLine size={16} className='shrink-0 text-icon-sub-500' /> : null}
              <Badge.Root
                variant='light'
                color={getPriorityColor(selectedPriority)}
                className={cn(
                  'max-w-full truncate text-nowrap uppercase',
                  compact && 'h-5 px-1 text-[10px] leading-none',
                )}
              >
                {selectedPriority}
              </Badge.Root>
            </>
          ) : compact ? null : (
            <span className='truncate text-sm text-text-soft-400'>—</span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Content align='start' showArrow={false} className='w-44 p-1'>
        <div className='flex flex-col gap-0.5'>
          {TASK_PRIORITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type='button'
              disabled={disabled}
              onClick={() => handleSelect(option.value)}
              className={cn(
                'flex w-full items-center rounded-lg px-2 py-2 text-left transition-colors hover:bg-bg-weak-50 disabled:opacity-60',
                selectedPriority === option.value && 'bg-bg-weak-50',
              )}
            >
              <Badge.Root
                variant='light'
                color={getPriorityColor(option.value)}
                className='text-nowrap uppercase'
              >
                {option.label}
              </Badge.Root>
            </button>
          ))}
          {hasPriority ? (
            <button
              type='button'
              disabled={disabled}
              onClick={() => handleSelect('')}
              className='mt-0.5 w-full rounded-lg px-2 py-2 text-left text-xs text-text-sub-500 transition-colors hover:bg-bg-weak-50 disabled:opacity-60'
            >
              Clear
            </button>
          ) : null}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
