import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { RiCalendarLine } from 'react-icons/ri';
import { Calendar } from '@/components/ui/calendar';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import { parseToDate } from '@/utils/date-utils';
import { formatListDateLabel, isListDateOverdue } from '@/pages/boards/utils/board-task-date-utils';

export default function TaskDueDateCell({
  taskId,
  dueDate = '',
  onUpdate,
  disabled = false,
  compact = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasDueDate = Boolean(String(dueDate ?? '').trim());
  const isOverdue = hasDueDate && isListDateOverdue(dueDate);
  const dueDateLabel = hasDueDate ? formatListDateLabel(dueDate) : '';

  const selectedDate = useMemo(() => (dueDate ? parseToDate(dueDate) : undefined), [dueDate]);

  const handleSelect = (date) => {
    const nextDueDate = date ? format(date, 'yyyy-MM-dd') : '';

    if (nextDueDate === (dueDate || '')) {
      setIsOpen(false);
      return;
    }

    onUpdate?.(taskId, nextDueDate);
    setIsOpen(false);
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          type='button'
          disabled={disabled}
          aria-label='Edit due date'
          className={cn(
            'flex h-full w-full items-center text-left transition-colors',
            compact ? 'gap-1 px-2' : 'min-h-11 gap-1.5 px-3',
            'hover:bg-bg-weak-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-inset',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          {hasDueDate ? (
            <>
              <RiCalendarLine
                size={compact ? 14 : 16}
                className={cn('shrink-0', isOverdue ? 'text-error-base' : 'text-icon-sub-500')}
              />
              <span
                className={cn(
                  'truncate',
                  compact ? 'text-xs' : 'text-sm',
                  isOverdue ? 'text-error-base' : 'text-text-sub-500',
                )}
              >
                {dueDateLabel}
              </span>
            </>
          ) : compact ? null : (
            <span className='truncate text-sm text-text-soft-400'>—</span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Content align='start' showArrow={false} className='w-auto p-2'>
        <Calendar mode='single' selected={selectedDate} onSelect={handleSelect} initialFocus />
        {hasDueDate ? (
          <button
            type='button'
            disabled={disabled}
            onClick={() => handleSelect(undefined)}
            className='mt-2 w-full rounded-lg px-2 py-1.5 text-left text-xs text-text-sub-500 transition-colors hover:bg-bg-weak-50 disabled:opacity-60'
          >
            Clear date
          </button>
        ) : null}
      </Popover.Content>
    </Popover.Root>
  );
}
