import React from 'react';
import { RiAddLine, RiDeleteBinLine, RiDraggable } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Switch from '@/components/ui/switch';
import { cn } from '@/utils/cn';

function StatusRow({ status, onToggle, onDelete }) {
  const isDisabled = !status.enabled;

  return (
    <div
      className={cn(
        'group flex h-9 items-center gap-2 overflow-hidden rounded-md border px-1.5 py-3 shadow-regular-xs',
        isDisabled
          ? 'border-stroke-soft-200 bg-bg-weak-100'
          : 'border-stroke-soft-200 bg-bg-white-0 hover:bg-bg-weak-100',
      )}
    >
      <span className={cn('text-text-soft-400', isDisabled ? 'opacity-50' : '')}>
        <RiDraggable className='size-4' />
      </span>

      <div className='flex min-w-0 flex-1 items-center gap-1.5'>
        <div
          className={cn(
            'rounded border p-[3px]',
            isDisabled ? 'border-stroke-disabled-100' : 'border-stroke-sub-300',
          )}
        >
          <span
            className={cn(
              'block size-2.5 rounded-[2px]',
              status.color,
              isDisabled ? 'opacity-20' : 'opacity-100',
            )}
          />
        </div>
        <p
          className={cn(
            'truncate text-label-sm',
            isDisabled ? 'text-text-disabled-300' : 'text-text-strong-950',
          )}
        >
          {status.label}
        </p>
      </div>

      <div className='flex items-center gap-1.5'>
        <Switch.Root
          checked={status.enabled}
          onCheckedChange={(checked) => onToggle(status.id, checked)}
          aria-label={`Toggle ${status.label}`}
        />
        <button
          type='button'
          onClick={() => onDelete(status.id)}
          className='text-text-soft-400 opacity-0 transition-opacity hover:text-red-base group-hover:opacity-100 group-focus-within:opacity-100'
          aria-label={`Delete ${status.label}`}
        >
          <RiDeleteBinLine className='size-4' />
        </button>
      </div>
    </div>
  );
}

export default function ProjectTaskStatusTab({
  statuses,
  onToggle,
  onDelete,
  onAddStatus,
  title = 'Task Statuses',
  subtitle = 'Create and manage task statuses',
}) {
  return (
    <div className='flex w-full flex-col gap-4'>
      <div className='flex w-full items-start gap-3'>
        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <p className='text-label-sm text-text-strong-950'>{title}</p>
          <p className='text-paragraph-xs text-text-sub-500'>{subtitle}</p>
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        <div className='flex items-center border-b border-stroke-soft-200 px-0 py-1.5'>
          <p className='text-label-xs uppercase tracking-[0.04em] text-text-soft-400'>Status</p>
        </div>

        {statuses.length > 0 && (
          <div className='flex flex-col gap-2'>
            {statuses.map((status) => (
              <StatusRow key={status.id} status={status} onToggle={onToggle} onDelete={onDelete} />
            ))}
          </div>
        )}

        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='small'
          onClick={onAddStatus}
          className='h-9 w-full gap-1 border-dashed border-stroke-sub-300 bg-bg-weak-100 text-text-sub-500 hover:bg-bg-weak-100'
        >
          <Button.Icon as={RiAddLine} />
          Add Status
        </Button.Root>
      </div>
    </div>
  );
}
