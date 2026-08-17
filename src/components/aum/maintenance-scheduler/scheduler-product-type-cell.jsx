import React, { memo } from 'react';
import { RiArrowDownSFill } from 'react-icons/ri';

import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

const SchedulerProductTypeCell = memo(
  ({ productType, rowKind = 'parent', hasChildren = false, isExpanded = true, onToggleExpand }) => {
    const isChild = rowKind === 'child';
    const showChevron = !isChild && hasChildren;

    return (
      <div
        className={cn(
          'relative flex h-full min-w-0 items-center',
          isChild ? 'gap-0.5 pl-9 pr-5' : 'gap-0.5 px-3',
        )}
      >
        {isChild ? (
          <>
            <span
              className='pointer-events-none absolute bottom-0 left-3 top-0 w-px bg-stroke-soft-200'
              aria-hidden
            />
            <span
              className='pointer-events-none absolute left-3 top-1/2 h-px w-3 -translate-y-1/2 bg-stroke-soft-200'
              aria-hidden
            />
          </>
        ) : null}

        <span
          className={cn(
            'min-w-0 truncate text-label-sm font-medium',
            isChild ? 'text-text-sub-500' : 'text-text-main-900',
          )}
        >
          {productType}
        </span>

        {showChevron ? (
          <Tooltip.Provider delayDuration={200}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type='button'
                  onClick={() => onToggleExpand?.()}
                  className='flex size-5 shrink-0 items-center justify-center text-text-soft-400'
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? 'Collapse product group' : 'Expand product group'}
                >
                  <RiArrowDownSFill
                    className={cn('size-5 transition-transform', !isExpanded && '-rotate-90')}
                    aria-hidden
                  />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content side='top' size='xsmall'>
                {isExpanded ? 'Collapse' : 'Expand'}
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        ) : null}
      </div>
    );
  },
);

SchedulerProductTypeCell.displayName = 'SchedulerProductTypeCell';

export default SchedulerProductTypeCell;
