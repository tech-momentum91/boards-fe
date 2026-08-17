import React from 'react';
import { RiArmchairLine } from 'react-icons/ri';

import * as Badge from '@/components/ui/badge';
import * as Popover from '@/components/ui/popover';
import { CanvasHoverScaleShell } from '@/pages/center/layout-annotation-space-info-popover';
import { getManagedOfficeSubSpaceTypeBadgeColor } from '@/utils/layout-annotation-subspace';

/**
 * Hover card for a server-synced sub-space pin (matches space hover pattern on the canvas).
 *
 * @param {{
 *   annotation: object,
 *   hoverOverlaySchedule?: { cancelClose?: () => void, scheduleClose?: () => void },
 * }} props
 */
export function SubSpaceInfoCanvasHoverPopover({
  annotation,
  hoverOverlaySchedule,
  elevated = false,
}) {
  const meta = annotation?.sub_space_meta ?? {};
  const name = String(meta.sub_space_name ?? annotation?.label ?? '').trim() || 'Sub-space';
  const typeLabel = String(meta.sub_space_type ?? '').trim();
  const typeBadgeColor = getManagedOfficeSubSpaceTypeBadgeColor(typeLabel);
  const canvasScale = hoverOverlaySchedule?.canvasScale ?? 1;

  const deskCountRaw = meta.desk_count ?? meta.desks?.length;
  const deskCountNum = Number(deskCountRaw);
  const deskLine =
    deskCountRaw != null && deskCountRaw !== '' && Number.isFinite(deskCountNum)
      ? `${deskCountNum} desk${deskCountNum === 1 ? '' : 's'}`
      : null;
  const status = String(meta.status ?? '').trim();

  return (
    <CanvasHoverScaleShell canvasScale={canvasScale}>
      <div
        className={
          elevated ? 'pointer-events-auto relative z-[200] isolate' : 'pointer-events-auto'
        }
      >
        <Popover.Root modal={false} open>
          <Popover.Anchor asChild>
            <span className='block size-1.5 shrink-0' aria-hidden />
          </Popover.Anchor>
          <Popover.Content
            portalled={false}
            align='center'
            side='top'
            sideOffset={8}
            collisionPadding={20}
            avoidCollisions
            showArrow
            className={
              elevated
                ? 'relative z-[200] flex w-[min(360px,calc(100vw-1.5rem))] max-w-none flex-col gap-2 overflow-y-auto rounded-xl border border-stroke-soft-200 bg-white p-4 shadow-regular-md ring-stroke-soft-200'
                : 'relative z-50 flex w-[min(360px,calc(100vw-1.5rem))] max-w-none flex-col gap-2 overflow-y-auto rounded-xl border border-stroke-soft-200 bg-white p-4 shadow-regular-sm ring-stroke-soft-200'
            }
            onPointerEnter={() => hoverOverlaySchedule?.cancelClose?.()}
            onPointerLeave={() => hoverOverlaySchedule?.scheduleClose?.()}
            onMouseEnter={() => hoverOverlaySchedule?.cancelClose?.()}
            onMouseLeave={() => hoverOverlaySchedule?.scheduleClose?.()}
          >
            <div
              aria-hidden
              className='pointer-events-auto absolute left-1/2 top-full z-[60] h-14 w-24 -translate-x-1/2'
              onPointerEnter={() => hoverOverlaySchedule?.cancelClose?.()}
              onPointerLeave={() => hoverOverlaySchedule?.scheduleClose?.()}
            />
            <div className='flex flex-wrap items-center gap-2'>
              {typeLabel ? (
                <Badge.Root color={typeBadgeColor} variant='light'>
                  {typeLabel}
                </Badge.Root>
              ) : (
                <Badge.Root color='gray' variant='light'>
                  Sub-space
                </Badge.Root>
              )}
              {status ? (
                <Badge.Root color='sky' variant='light'>
                  {status}
                </Badge.Root>
              ) : null}
            </div>
            <p className='text-title-h5 text-text-strong-950'>{name}</p>
            {deskLine && typeLabel !== 'Resource' ? (
              <p className='flex items-center gap-1.5 text-paragraph-sm text-text-sub-600'>
                <RiArmchairLine aria-hidden className='size-4 shrink-0' />
                <span className='font-medium text-text-strong-950'>{deskLine}</span>
              </p>
            ) : null}
          </Popover.Content>
        </Popover.Root>
      </div>
    </CanvasHoverScaleShell>
  );
}
