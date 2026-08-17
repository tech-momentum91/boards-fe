import React, { useState } from 'react';

import * as Badge from '@/components/ui/badge';
import * as Popover from '@/components/ui/popover';
import * as Tooltip from '@/components/ui/tooltip';

function parseSpaceLabel(label) {
  const trimmed = String(label || '').trim();
  const parenIndex = trimmed.lastIndexOf(' (');
  if (parenIndex > 0 && trimmed.endsWith(')')) {
    return {
      short: trimmed.slice(0, parenIndex).trim(),
      center: trimmed.slice(parenIndex + 2, -1).trim(),
      full: trimmed,
    };
  }
  return { short: trimmed, center: '', full: trimmed };
}

function SpaceBadge({ label, badgeVariant = 'lighter' }) {
  const { short, full } = parseSpaceLabel(label);
  if (!short) return null;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Badge.Root
          variant={badgeVariant}
          color='gray'
          size='medium'
          className='max-w-[min(100%,12rem)] shrink-0'
        >
          <span className='label-xs block min-w-0 truncate font-medium text-text-sub-500'>
            {short}
          </span>
        </Badge.Root>
      </Tooltip.Trigger>
      <Tooltip.Content side='bottom' className='max-w-sm break-words'>
        {full}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

const ProposalSpacesCell = ({ spaces = [], maxVisible = 1, badgeVariant = 'lighter' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const labels = (Array.isArray(spaces) ? spaces : []).filter(Boolean);

  if (labels.length === 0) {
    return <span className='paragraph-small text-text-sub-500'>—</span>;
  }

  const visible = labels.slice(0, maxVisible);
  const hiddenCount = labels.length - visible.length;

  return (
    <div className='flex min-w-0 items-center gap-2 overflow-hidden'>
      {visible.map((label, index) => (
        <SpaceBadge key={`${label}-${index}`} label={label} badgeVariant={badgeVariant} />
      ))}

      {hiddenCount > 0 ? (
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
          <Popover.Trigger asChild>
            <button
              type='button'
              className='inline-flex shrink-0 border-0 bg-transparent p-0'
              onClick={(event) => event.stopPropagation()}
              aria-label={`${hiddenCount} more space${hiddenCount === 1 ? '' : 's'}`}
            >
              <Badge.Root variant='lighter' color='gray' size='medium'>
                <span className='label-xs font-medium text-text-sub-500'>+{hiddenCount}</span>
              </Badge.Root>
            </button>
          </Popover.Trigger>
          <Popover.Content
            align='start'
            side='bottom'
            className='w-72 p-0'
            onClick={(event) => event.stopPropagation()}
          >
            <div className='border-b border-stroke-soft-200 px-3 py-2'>
              <p className='label-small text-text-strong-950'>
                {labels.length} space{labels.length === 1 ? '' : 's'}
              </p>
            </div>
            <ul className='max-h-52 overflow-y-auto py-1'>
              {labels.map((label, index) => {
                const { short, center } = parseSpaceLabel(label);
                return (
                  <li key={`${label}-${index}`} className='px-3 py-2 hover:bg-bg-weak-50'>
                    <p className='paragraph-small font-medium text-text-strong-950'>{short}</p>
                    {center ? (
                      <p className='paragraph-xs truncate text-text-sub-500'>{center}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Popover.Content>
        </Popover.Root>
      ) : null}
    </div>
  );
};

export default ProposalSpacesCell;
