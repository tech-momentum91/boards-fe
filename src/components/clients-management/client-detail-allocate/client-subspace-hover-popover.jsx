import React from 'react';

import { ClientSubspaceHoverCard } from '@/components/clients-management/client-detail-allocate/client-subspace-hover-card';
import * as Popover from '@/components/ui/popover';

/**
 * Click-triggered popover for a client sub-space highlight on the floor plan.
 *
 * Shown when the user selects (clicks) a sub-space; closed when the user
 * clicks elsewhere (which deselects in the editor).
 *
 * Department is read-only and comes from `client_department` on the layout API.
 *
 * @param {{
 *   annotation: object,
 * }} props
 */
export default function ClientSubspaceHoverPopover({ annotation }) {
  const title = String(annotation?.sub_space_name || annotation?.label || '').trim() || 'Sub-space';
  const areaTypeLabel = String(
    annotation?.sub_space_area_type_label || annotation?.sub_space_area_type || '',
  ).trim();
  const clientDepartment = String(annotation?.client_department || '').trim();

  return (
    <Popover.Root modal={false} open>
      <Popover.Anchor asChild>
        <span className='block size-1.5 shrink-0' aria-hidden />
      </Popover.Anchor>
      <Popover.Content
        portalled={false}
        align='center'
        side='right'
        sideOffset={12}
        collisionPadding={20}
        avoidCollisions
        showArrow
        className='max-w-none border-0 bg-transparent p-0 shadow-none ring-0 pointer-events-auto'
      >
        <ClientSubspaceHoverCard
          title={title}
          areaTypeLabel={areaTypeLabel}
          clientDepartment={clientDepartment}
        />
      </Popover.Content>
    </Popover.Root>
  );
}
