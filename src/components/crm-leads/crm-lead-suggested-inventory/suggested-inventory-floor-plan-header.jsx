import React from 'react';
import { RiArrowLeftSLine, RiArrowRightSLine, RiStackLine } from 'react-icons/ri';

import * as Badge from '@/components/ui/badge';
import * as CompactButton from '@/components/ui/compact-button';
import { cn } from '@/utils/cn';

/**
 * Floor plan popover header — Figma `31592:1851142`.
 */
const SuggestedInventoryFloorPlanHeader = ({
  floorLabel = 'Floor',
  availableCount = 0,
  floorIndex = 0,
  floorCount = 0,
  onPreviousFloor,
  onNextFloor,
  className,
}) => {
  const showFloorNav = floorCount > 1;

  return (
    <div
      className={cn('flex w-full min-w-0 items-center justify-between gap-2', className)}
      data-node-id='31592:1851142'
    >
      <div className='flex min-w-0 items-center gap-1' data-node-id='31592:1851143'>
        <div className='flex min-w-0 items-center gap-1 py-1'>
          <RiStackLine
            className='size-3.5 shrink-0 text-text-strong-950'
            aria-hidden
            data-node-id='31592:1851146'
          />
          <span
            className='truncate text-label-xs font-medium text-text-strong-950'
            data-node-id='31592:1851147'
          >
            {floorLabel}
          </span>
        </div>
        {availableCount > 0 ? (
          <Badge.Root
            size='small'
            variant='light'
            color='green'
            className='shrink-0 rounded-full px-1 py-0.5'
            data-node-id='31592:1851148'
          >
            <span className='text-subheading-2xs font-medium uppercase tracking-wider'>
              {availableCount} Space{availableCount === 1 ? '' : 's'} Available
            </span>
          </Badge.Root>
        ) : null}
      </div>

      {showFloorNav ? (
        <div className='flex shrink-0 items-center gap-1' data-node-id='31592:1851154'>
          <CompactButton.Root
            type='button'
            variant='ghost'
            size='medium'
            className='size-6 rounded-md p-0.5'
            disabled={floorIndex <= 0}
            onClick={onPreviousFloor}
            aria-label='Previous floor'
            data-node-id='31592:1851155'
          >
            <CompactButton.Icon as={RiArrowLeftSLine} className='size-5' />
          </CompactButton.Root>
          <span
            className='min-w-[1.75rem] text-center text-subheading-2xs font-medium uppercase tracking-wide text-text-sub-500'
            data-node-id='31592:1851156'
          >
            {floorIndex + 1}/{floorCount}
          </span>
          <CompactButton.Root
            type='button'
            variant='ghost'
            size='medium'
            className='size-6 rounded-md p-0.5'
            disabled={floorIndex >= floorCount - 1}
            onClick={onNextFloor}
            aria-label='Next floor'
            data-node-id='31592:1851157'
          >
            <CompactButton.Icon as={RiArrowRightSLine} className='size-5' />
          </CompactButton.Root>
        </div>
      ) : null}
    </div>
  );
};

export default SuggestedInventoryFloorPlanHeader;
