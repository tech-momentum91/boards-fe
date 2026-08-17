import React, { memo } from 'react';
import { RiAddCircleFill, RiTimeLine } from 'react-icons/ri';

import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

/** Empty / add cell — plus icon to schedule maintenance. */
const SchedulerMonthCellIcon = memo(({ className }) => (
  <RiAddCircleFill className={cn('size-5 text-text-disabled-300', className)} />
));
SchedulerMonthCellIcon.displayName = 'SchedulerMonthCellIcon';

/** Planned badge — matches tracker `StatusIcon` / `FacilityTrackerApiCellIcon` pending state. */
const SchedulerPlannedBadge = memo(({ className, onRemove, ...rest }) => (
  <div
    className={cn('group relative inline-flex items-center justify-center', className)}
    {...rest}
  >
    <Badge.Root variant='light' color='blue' size='small' className='shrink-0'>
      <Badge.Icon as={RiTimeLine} />
      Planned
    </Badge.Root>

    {onRemove ? (
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              type='button'
              onClick={onRemove}
              onMouseDown={(event) => event.stopPropagation()}
              className='pointer-events-none absolute left-[calc(100%-4px)] top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-full bg-information-dark text-bg-white-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100'
              aria-label='Remove planned schedule'
            >
              <span className='block h-0.5 w-2.5 rounded-full bg-bg-white-0' aria-hidden />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content side='top' size='xsmall'>
            Remove
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    ) : null}
  </div>
));
SchedulerPlannedBadge.displayName = 'SchedulerPlannedBadge';

/** Floating badge shown while dragging — matches tracker drag preview. */
const SchedulerPlannedDragPreview = memo(({ visible, x, y }) => {
  if (!visible) return null;

  return (
    <div className='pointer-events-none fixed z-50' style={{ left: x + 12, top: y + 12 }}>
      <Badge.Root variant='light' color='blue' size='small'>
        <Badge.Icon as={RiTimeLine} />
        Planned
      </Badge.Root>
    </div>
  );
});
SchedulerPlannedDragPreview.displayName = 'SchedulerPlannedDragPreview';

export { SchedulerMonthCellIcon, SchedulerPlannedBadge, SchedulerPlannedDragPreview };
