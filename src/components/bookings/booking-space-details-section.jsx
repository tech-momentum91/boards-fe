import React, { useCallback, useState } from 'react';
import { RiBuilding2Line, RiBuildingFill, RiPencilLine } from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import * as Popover from '@/components/ui/popover';
import * as CompactButton from '@/components/ui/compact-button';
import { cn } from '@/lib/utils';
import { getResourceTypeBadge } from '@/components/bookings/constants';
import { BookingSpaceEditPopoverContent } from '@/components/bookings/booking-space-edit-popover';

const BookingSpaceDetailsSection = ({
  booking,
  resource,
  center,
  spaceEditable = false,
  centerId,
  onSpaceSave,
}) => {
  const hasSpace = Boolean(resource || booking?.space_name);

  const canEditSpace = Boolean(spaceEditable && centerId && typeof onSpaceSave === 'function');

  const [isSpacePopoverOpen, setIsSpacePopoverOpen] = useState(false);
  const [isSavingSpace, setIsSavingSpace] = useState(false);

  const handleSpacePopoverSave = useCallback(
    async (payload) => {
      setIsSavingSpace(true);
      try {
        await onSpaceSave(payload);
        setIsSpacePopoverOpen(false);
      } finally {
        setIsSavingSpace(false);
      }
    },
    [onSpaceSave],
  );

  if (!hasSpace) return null;

  const spaceName = booking?.space_name || resource?.name || '--';

  const centerLabel =
    center?.center_name || booking?.center_name || resource?.centerName || resource?.center || '';

  const floorLabel = resource?.floor ?? '';
  const resourceType = resource?.type ?? booking?.resource_type ?? '';
  const badgeColor = resourceType ? getResourceTypeBadge(resourceType) : undefined;

  const innerCard = (
    <div className={cn('flex gap-3 items-center', canEditSpace && 'pr-9')}>
      <div
        className='p-2 rounded-full shrink-0'
        style={{
          background: 'linear-gradient(to bottom, #c2d6ff, #ebf1ff)',
        }}
      >
        <RiBuildingFill className='size-5' style={{ color: '#253ea7' }} />
      </div>
      <div className='flex-1 min-w-0'>
        <div className='flex flex-col gap-1'>
          <span className='label-small text-text-main-900'>{spaceName}</span>
          <div className='flex items-center gap-2 text-paragraph-xs text-text-sub-500'>
            {centerLabel && (
              <>
                <span>{centerLabel}</span>
                {floorLabel && <span>•</span>}
              </>
            )}
            {floorLabel && <span>Floor {floorLabel}</span>}
          </div>
        </div>
      </div>
      {resourceType && (
        <Badge.Root variant='light' color={badgeColor} className='shrink-0'>
          {String(resourceType).toUpperCase()}
        </Badge.Root>
      )}
    </div>
  );

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center gap-2'>
        <RiBuilding2Line size={20} className='text-text-sub-500' />
        <span className='label-small text-text-sub-500'>Space Details</span>
      </div>

      {canEditSpace ? (
        <Popover.Root open={isSpacePopoverOpen} onOpenChange={setIsSpacePopoverOpen}>
          <div className='border border-stroke-soft-200 rounded-xl p-3 bg-white relative group'>
            {innerCard}
            <Popover.Trigger asChild>
              <CompactButton.Root
                type='button'
                variant='ghost'
                size='medium'
                className='absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100'
                aria-label='Edit space'
                onClick={(e) => e.stopPropagation()}
              >
                <CompactButton.Icon as={RiPencilLine} />
              </CompactButton.Root>
            </Popover.Trigger>
            {isSpacePopoverOpen && (
              <BookingSpaceEditPopoverContent
                centerId={centerId}
                initialResourceTypeId={booking?.resource_type}
                initialSpaceId={booking?.space_id}
                bookForAnyCenter={Number(booking?.book_for_any_center) === 1}
                onSave={handleSpacePopoverSave}
                onCancel={() => setIsSpacePopoverOpen(false)}
                isSaving={isSavingSpace}
              />
            )}
          </div>
        </Popover.Root>
      ) : (
        <div className='border border-stroke-soft-200 rounded-xl p-3 bg-white'>{innerCard}</div>
      )}
    </div>
  );
};

export default BookingSpaceDetailsSection;
