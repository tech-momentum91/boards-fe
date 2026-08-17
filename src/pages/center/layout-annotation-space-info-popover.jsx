import React, { useMemo, useRef, useState } from 'react';
import {
  RiArrowRightUpLine,
  RiExpandDiagonalLine,
  RiInformationLine,
  RiMoneyRupeeCircleLine,
  RiRulerLine,
  RiUser2Fill,
  RiUser2Line,
  RiUserLine,
} from 'react-icons/ri';

import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import * as Popover from '@/components/ui/popover';
import ManagedOfficeRoomStatCard from '@/pages/center/layout-annotation-managed-office-room-stat-card';
import { pickFirstFinitePositive } from '@/pages/center/layout-annotation-page-utils';
import {
  hasLayoutSpaceClientAssignment,
  isLayoutCoworkingDeskMarkerType,
  isLayoutCoworkingSpace,
  isLayoutSpaceExcludedFromAllocateAndSubSpace,
  normalizeCoworkingInventoryType,
  pickPrimaryLayoutClient,
} from '@/utils/layout-annotation-space';
import { getLayoutInventoryTypeBadgeColor } from '@/utils/layout-inventory-badge';

/** Responsive width for space detail panels (visual size after canvas counter-scale). */
const SPACE_INFO_POPOVER_WIDTH_CLASS = 'w-[min(400px,calc(100vw-1.5rem))]';

/**
 * Counteract react-zoom-pan-pinch scale so hover panels stay readable at any canvas zoom.
 *
 * @param {{ canvasScale?: number, transformOrigin?: string, children: React.ReactNode }} props
 */
export function CanvasHoverScaleShell({
  canvasScale = 1,
  transformOrigin = 'bottom center',
  children,
}) {
  const safeScale =
    typeof canvasScale === 'number' && Number.isFinite(canvasScale) && canvasScale > 0
      ? canvasScale
      : 1;
  const inverseScale = 1 / safeScale;

  if (Math.abs(inverseScale - 1) < 0.02) {
    return <div className='pointer-events-none w-max max-w-full'>{children}</div>;
  }

  return (
    <div
      className='pointer-events-none w-max max-w-full'
      style={{
        transform: `scale(${inverseScale})`,
        transformOrigin,
      }}
    >
      {children}
    </div>
  );
}

/**
 * @param {{
 *   space: object,
 *   canManageSubSpaces?: boolean,
 *   canCreateSubSpace?: boolean,
 *   canAllocateClient?: boolean,
 *   hasSubSpaces?: boolean,
 *   onCreateSubSpace?: () => void,
 *   onViewEditSubSpace?: () => void,
 *   onAllocateClient?: () => void,
 * }} props
 */
export function SpaceInfoPopoverBody({
  space,
  canManageSubSpaces = true,
  canCreateSubSpace,
  canAllocateClient,
  hasSubSpaces = false,
  onCreateSubSpace,
  onViewEditSubSpace,
  onAllocateClient,
}) {
  const resolvedCanCreateSubSpace = canCreateSubSpace ?? canManageSubSpaces;
  const resolvedCanAllocateClient = canAllocateClient ?? canManageSubSpaces;
  const details = space?.details && typeof space.details === 'object' ? space.details : null;
  const isManagedOffice = String(space?.inventory_type || '').trim() === 'Managed Office';

  const managedOfficeRoomItems = useMemo(() => {
    if (!details || !isManagedOffice) return [];
    return [
      { label: 'Director cabin', value: details.director_cabin },
      { label: 'Manager cabin', value: details.manager_cabins },
      { label: 'Meeting rooms', value: details.meeting_rooms },
      { label: 'Conference rooms', value: details.conference_rooms },
    ];
  }, [details, isManagedOffice]);

  const primaryClient = pickPrimaryLayoutClient(space?.clients);
  const carpetSftNum = pickFirstFinitePositive(
    details?.agreement_carpet_area,
    details?.total_carpet_sft,
    details?.total_carpet_area,
    details?.carpet_area,
    details?.carpet_sft,
    space?.agreement_carpet_area,
    space?.total_carpet_sft,
    space?.total_carpet_area,
    space?.carpet_area,
    primaryClient?.agreement_carpet_area,
    primaryClient?.total_carpet_sft,
    primaryClient?.total_carpet_area,
    primaryClient?.carpet_area,
  );
  const showArea = carpetSftNum != null;

  const rateNum = pickFirstFinitePositive(
    details?.expected_per_seat_cost,
    details?.expected_per_seat_rate,
    space?.expected_per_seat_cost,
    space?.expected_per_seat_rate,
    primaryClient?.expected_per_seat_cost,
    primaryClient?.expected_per_seat_rate,
  );
  const showRate = rateNum != null;

  const totalSeatsRaw = space?.total_seats ?? details?.total_seats;
  const totalSeatsNum = Number(totalSeatsRaw);
  const showSeats = Number.isFinite(totalSeatsNum) && totalSeatsNum > 0;

  const hasClient = hasLayoutSpaceClientAssignment(space, space?.clients);
  const statusLower = String(space?.status || '').toLowerCase();
  const inventoryType = String(space?.inventory_type || '').trim();
  const isCommonArea = inventoryType === 'Common Area';
  const commonAreaType = String(space?.common_area_type ?? details?.common_area_type ?? '').trim();
  const isCoworkingSpace = isLayoutCoworkingSpace(inventoryType);
  const coworkingInventoryType = normalizeCoworkingInventoryType(
    space?.coworking_inventory_type ?? space?.details?.coworking_inventory_type ?? '',
  );
  const usesDeskMarkerWorkflow = isLayoutCoworkingDeskMarkerType(coworkingInventoryType);
  const showAllocateAndSubSpaceActions =
    !isLayoutSpaceExcludedFromAllocateAndSubSpace(inventoryType);
  const showAllocateClient = !hasClient && !isCoworkingSpace;
  const subSpaceActionLabel = isCoworkingSpace ? 'Mark CoWorkers' : null;

  return (
    <div className='flex flex-col items-start gap-3 p-4'>
      <div className='flex w-full items-center justify-between gap-2'>
        <div className='flex flex-wrap items-center gap-2'>
          {space.inventory_type ? (
            <Badge.Root
              color={getLayoutInventoryTypeBadgeColor(space.inventory_type)}
              variant='light'
            >
              {space.inventory_type}
            </Badge.Root>
          ) : null}

          {space.status ? (
            <Badge.Root color={statusLower.includes('avail') ? 'green' : 'red'} variant='light'>
              {space.status}
            </Badge.Root>
          ) : null}
        </div>

        <CompactButton.Root type='button' aria-label='Expand'>
          <CompactButton.Icon as={RiExpandDiagonalLine} />
        </CompactButton.Root>
      </div>

      <div className='flex w-full flex-col items-start gap-3'>
        <span className='text-title-h5 leading-tight'>{space.inventory_name}</span>

        <div className='flex w-full flex-wrap items-center gap-x-4 gap-y-2 text-text-sub-600'>
          {showArea ? (
            <span className='flex items-center gap-1.5 text-paragraph-sm font-medium'>
              <RiRulerLine className='size-4 shrink-0 text-text-sub-600' aria-hidden />
              <span>{Math.round(carpetSftNum).toLocaleString('en-IN')} Sqft</span>
            </span>
          ) : null}
          {showSeats ? (
            <span className='flex items-center gap-1.5 text-paragraph-sm font-medium'>
              <RiUserLine className='size-4 shrink-0 text-text-sub-600' aria-hidden />
              <span>{totalSeatsNum} seats</span>
            </span>
          ) : null}
          {showRate ? (
            <span className='flex items-center gap-1.5 text-paragraph-sm font-medium'>
              <RiMoneyRupeeCircleLine className='size-4 shrink-0 text-text-sub-600' aria-hidden />
              <span>₹{rateNum.toLocaleString('en-IN')}/seat</span>
            </span>
          ) : null}
          {isCommonArea && commonAreaType ? (
            <span className='text-paragraph-sm font-medium'>{commonAreaType}</span>
          ) : null}
        </div>
      </div>

      {managedOfficeRoomItems.length > 0 ? (
        <div className='grid w-full grid-cols-2 gap-3 sm:grid-cols-2'>
          {managedOfficeRoomItems.map((item) => (
            <ManagedOfficeRoomStatCard key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      ) : null}

      {hasClient ? (
        <div className='flex w-full flex-col gap-3 pt-1'>
          <div className='flex items-center gap-1'>
            <RiUser2Line size={20} className='shrink-0 text-text-sub-600' aria-hidden />
            <span className='label-medium'>Client Details</span>
          </div>

          <div className='flex w-full items-center gap-3 rounded-[12px] bg-gradient-to-b from-[#ffdac2] to-[#fef3eb] p-2 shadow-sm ring-1 ring-stroke-soft-200/40'>
            <div className='flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-warning-lighter)] shadow-sm ring-1 ring-stroke-soft-200/80'>
              <RiUser2Fill size={20} className='text-[#ea580c]' aria-hidden />
            </div>
            <span className='min-w-0 flex-1 break-words text-paragraph-sm font-semibold text-[#7c2d12]'>
              {space.client_name}
            </span>
            <button
              type='button'
              className='flex size-8 shrink-0 items-center justify-center rounded-lg text-[#9a3412] transition hover:bg-white/60'
              aria-label='Open client'
              onClick={(e) => e.stopPropagation()}
            >
              <RiArrowRightUpLine className='size-5' aria-hidden />
            </button>
          </div>
        </div>
      ) : null}

      {resolvedCanAllocateClient && showAllocateAndSubSpaceActions && showAllocateClient ? (
        <div className='flex w-full flex-col items-stretch gap-2 border-t border-stroke-soft-200/80 pt-3'>
          <Button.Root
            className='w-full'
            size='small'
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              onAllocateClient?.();
            }}
          >
            Allocate Client
          </Button.Root>
        </div>
      ) : null}

      {resolvedCanCreateSubSpace && showAllocateAndSubSpaceActions ? (
        <div
          className={`flex w-full flex-col items-stretch gap-2 ${
            resolvedCanAllocateClient && showAllocateClient
              ? 'pt-0'
              : 'border-t border-stroke-soft-200/80 pt-3'
          }`}
        >
          {subSpaceActionLabel ? (
            <Button.Root
              className='w-full'
              size='small'
              variant='neutral'
              mode='stroke'
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                if (usesDeskMarkerWorkflow || hasSubSpaces) {
                  onViewEditSubSpace?.();
                } else {
                  onCreateSubSpace?.();
                }
              }}
            >
              {subSpaceActionLabel}
            </Button.Root>
          ) : hasSubSpaces ? (
            <Button.Root
              className='w-full'
              size='small'
              variant='neutral'
              mode='stroke'
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                onViewEditSubSpace?.();
              }}
            >
              View / Edit sub-space
            </Button.Root>
          ) : (
            <Button.Root
              className='w-full'
              size='small'
              variant='neutral'
              mode='stroke'
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                onCreateSubSpace?.();
              }}
            >
              Create Sub-Space
            </Button.Root>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Full space card anchored to the canvas hover slot (no visible trigger). Rendered in-place
 * (not portalled) so the pointer can move from the shape into the panel without losing hover.
 *
 * @param {{
 *   space: object,
 *   canManageSubSpaces?: boolean,
 *   canCreateSubSpace?: boolean,
 *   canAllocateClient?: boolean,
 *   hasSubSpaces?: boolean,
 *   onCreateSubSpace?: () => void,
 *   onViewEditSubSpace?: () => void,
 *   onAllocateClient?: () => void,
 *   hoverOverlaySchedule?: {
 *     cancelClose?: () => void,
 *     scheduleClose?: () => void,
 *     dismissHoverNow?: () => void,
 *   },
 * }} props
 */
export function SpaceInfoCanvasHoverPopover({
  space,
  canManageSubSpaces = true,
  canCreateSubSpace,
  canAllocateClient,
  hasSubSpaces = false,
  onCreateSubSpace,
  onViewEditSubSpace,
  onAllocateClient,
  hoverOverlaySchedule,
}) {
  const canvasScale = hoverOverlaySchedule?.canvasScale ?? 1;

  return (
    <CanvasHoverScaleShell canvasScale={canvasScale}>
      <div className='pointer-events-auto'>
        <Popover.Root modal={false} open>
          <Popover.Anchor asChild>
            <span className='block size-1.5 shrink-0' aria-hidden />
          </Popover.Anchor>
          <Popover.Content
            align='center'
            side='top'
            portalled={false}
            sideOffset={8}
            collisionPadding={20}
            avoidCollisions
            showArrow
            className={`relative z-50 flex max-h-[min(72vh,640px)] ${SPACE_INFO_POPOVER_WIDTH_CLASS} flex-col overflow-y-auto p-0 ring-stroke-soft-200`}
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
            <SpaceInfoPopoverBody
              space={space}
              canManageSubSpaces={canManageSubSpaces}
              canCreateSubSpace={canCreateSubSpace}
              canAllocateClient={canAllocateClient}
              hasSubSpaces={hasSubSpaces}
              onAllocateClient={() => {
                hoverOverlaySchedule?.dismissHoverNow?.();
                onAllocateClient?.();
              }}
              onCreateSubSpace={() => {
                hoverOverlaySchedule?.dismissHoverNow?.();
                onCreateSubSpace?.();
              }}
              onViewEditSubSpace={() => {
                hoverOverlaySchedule?.dismissHoverNow?.();
                onViewEditSubSpace?.();
              }}
            />
          </Popover.Content>
        </Popover.Root>
      </div>
    </CanvasHoverScaleShell>
  );
}

/**
 * @param {{
 *   space: object,
 *   canManageSubSpaces?: boolean,
 *   canCreateSubSpace?: boolean,
 *   canAllocateClient?: boolean,
 *   hasSubSpaces?: boolean,
 *   onCreateSubSpace?: () => void,
 *   onViewEditSubSpace?: () => void,
 *   onAllocateClient?: () => void,
 * }} props
 */
export default function SpaceInfoPopover({
  space,
  canManageSubSpaces = true,
  canCreateSubSpace,
  canAllocateClient,
  hasSubSpaces = false,
  onCreateSubSpace,
  onViewEditSubSpace,
  onAllocateClient,
}) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef(null);

  const handleEnter = () => {
    clearTimeout(closeTimerRef.current);
    setOpen(true);
  };
  const handleLeave = () => {
    closeTimerRef.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <Popover.Root modal={false} open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type='button'
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          className='flex size-7 cursor-pointer items-center justify-center rounded-full border border-stroke-soft-200 bg-white/90 text-primary-base shadow-sm hover:bg-bg-weak-50'
        >
          <RiInformationLine size={15} />
        </button>
      </Popover.Trigger>
      <Popover.Content
        align='center'
        sideOffset={12}
        collisionPadding={20}
        avoidCollisions
        showArrow
        className={`flex max-h-[min(60vh,600px)] ${SPACE_INFO_POPOVER_WIDTH_CLASS} flex-col overflow-y-auto p-0 ring-stroke-soft-200`}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <SpaceInfoPopoverBody
          space={space}
          canManageSubSpaces={canManageSubSpaces}
          canCreateSubSpace={canCreateSubSpace}
          canAllocateClient={canAllocateClient}
          hasSubSpaces={hasSubSpaces}
          onAllocateClient={() => {
            setOpen(false);
            onAllocateClient?.();
          }}
          onCreateSubSpace={() => {
            setOpen(false);
            onCreateSubSpace?.();
          }}
          onViewEditSubSpace={() => {
            setOpen(false);
            onViewEditSubSpace?.();
          }}
        />
      </Popover.Content>
    </Popover.Root>
  );
}
