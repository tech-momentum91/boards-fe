import React from 'react';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

/** Single-line truncated task title with full text in a hover tooltip. */
export default function ProjectTaskTitleCell({
  title,
  className,
  maxWidthClassName,
  emptyLabel = '—',
}) {
  const raw = title == null || title === '' ? '' : String(title).trim();
  const display = raw || emptyLabel;

  if (!raw) {
    return (
      <span
        className={cn(
          'block min-w-0 truncate text-label-sm text-text-strong-950',
          maxWidthClassName,
          className,
        )}
      >
        {display}
      </span>
    );
  }

  return (
    <Tooltip.Root size='xsmall'>
      <Tooltip.Trigger asChild>
        <span
          className={cn(
            'block min-w-0 cursor-default truncate text-left text-label-sm text-text-strong-950',
            maxWidthClassName,
            className,
          )}
        >
          {display}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content side='bottom' className='max-w-sm break-words'>
        {display}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}
