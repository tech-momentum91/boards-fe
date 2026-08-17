import React from 'react';
import { PiChairDuotone } from 'react-icons/pi';
import { RiAddLine } from 'react-icons/ri';

import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import { toLayoutAssetUrl } from '@/utils/layout-asset-url';
import {
  computeDeskOverlayCounterScale,
  DESK_OVERLAY_BASE_PX,
} from '@/utils/layout-desk-overlay-scale';

/**
 * Desk marker overlay for layout annotation (view + Mark CoWorkers edit session).
 *
 * @param {{
 *   companyLogo?: string,
 *   clientName?: string,
 *   sequenceLabel?: string,
 *   showPlacementHint?: boolean,
 *   canvasScale?: number,
 *   className?: string,
 * }} props
 */
export default function LayoutAnnotationDeskMarkerOverlay({
  companyLogo = '',
  clientName = '',
  sequenceLabel = '',
  showPlacementHint = false,
  canvasScale = 1,
  className = '',
}) {
  const counterScale = computeDeskOverlayCounterScale(canvasScale, DESK_OVERLAY_BASE_PX);
  const logoUrl = companyLogo ? toLayoutAssetUrl(companyLogo) : '';
  const isAssignedClient = Boolean(clientName) && !showPlacementHint;
  const showClientTooltip = Boolean(clientName) && !showPlacementHint;
  const avatarSize = DESK_OVERLAY_BASE_PX - 4;

  const markerBody = (
    <span
      style={{
        width: DESK_OVERLAY_BASE_PX,
        height: DESK_OVERLAY_BASE_PX,
        transform: `scale(${counterScale})`,
        transformOrigin: 'center center',
      }}
      className={cn(
        'flex shrink-0 items-center justify-center border shadow-sm',
        isAssignedClient
          ? 'overflow-hidden rounded-full border-[var(--color-success-dark)] bg-white p-0.5'
          : showPlacementHint
            ? 'pointer-events-none rounded-full border-dashed border-stroke-soft-300 bg-white/90 text-text-sub-600'
            : 'pointer-events-none flex-col gap-0.5 rounded-md border-stroke-soft-200 bg-white/90 text-text-sub-600',
        showClientTooltip && 'pointer-events-auto cursor-default',
        className,
      )}
      aria-hidden={!showClientTooltip && (showPlacementHint || isAssignedClient)}
      aria-label={
        isAssignedClient
          ? clientName
            ? `Desk assigned to ${clientName}`
            : 'Assigned desk'
          : sequenceLabel
            ? `Desk ${sequenceLabel}`
            : undefined
      }
    >
      {showPlacementHint ? (
        <RiAddLine size={15} aria-hidden />
      ) : isAssignedClient ? (
        <CrmAccountAvatar
          name={clientName}
          image={logoUrl || null}
          size={avatarSize}
          showNativeTitle={false}
          className='size-full'
        />
      ) : (
        <>
          <PiChairDuotone size={14} />
          {sequenceLabel ? (
            <span className='text-[9px] leading-none text-text-sub-500'>{sequenceLabel}</span>
          ) : null}
        </>
      )}
    </span>
  );

  if (!showClientTooltip) {
    return markerBody;
  }

  return (
    <Tooltip.Root delayDuration={120}>
      <Tooltip.Trigger asChild>{markerBody}</Tooltip.Trigger>
      <Tooltip.Content variant='light' side='top' sideOffset={6} className='max-w-[220px]'>
        {clientName}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}
