import React from 'react';

import { ClientDeskCoworkerHoverCard } from '@/components/clients-management/client-detail-allocate/client-desk-coworker-hover-card';
import * as Popover from '@/components/ui/popover';

/**
 * Hover card for an assigned desk co-worker (floor-plan editor hover bridge).
 *
 * @param {{
 *   details: object,
 *   assignment?: object | null,
 *   onUpdate?: () => void,
 *   hoverOverlaySchedule?: { cancelClose?: () => void, scheduleClose?: () => void },
 * }} props
 */
export default function ClientDeskCoworkerHoverPopover({
  details,
  assignment = null,
  onUpdate,
  hoverOverlaySchedule,
}) {
  return (
    <Popover.Root modal={false} open>
      <Popover.Anchor asChild>
        <span className='block size-1.5 shrink-0' aria-hidden />
      </Popover.Anchor>
      <Popover.Content
        portalled={false}
        align='center'
        side='top'
        sideOffset={10}
        collisionPadding={20}
        avoidCollisions
        showArrow
        className='max-w-none border-0 bg-transparent p-0 shadow-none ring-0 pointer-events-auto'
        onPointerEnter={() => hoverOverlaySchedule?.cancelClose?.()}
        onPointerLeave={() => hoverOverlaySchedule?.scheduleClose?.()}
        onMouseEnter={() => hoverOverlaySchedule?.cancelClose?.()}
        onMouseLeave={() => hoverOverlaySchedule?.scheduleClose?.()}
      >
        <div
          aria-hidden
          className='pointer-events-auto absolute left-1/2 top-full z-[60] h-12 w-20 -translate-x-1/2'
          onPointerEnter={() => hoverOverlaySchedule?.cancelClose?.()}
          onPointerLeave={() => hoverOverlaySchedule?.scheduleClose?.()}
        />
        <ClientDeskCoworkerHoverCard
          details={details}
          assignment={assignment}
          onUpdate={onUpdate}
        />
      </Popover.Content>
    </Popover.Root>
  );
}
