/**
 * Booking Resource Renderer
 * Custom resource header renderer for booking-specific resources
 */

import React from 'react';
import * as Badge from '@/components/ui/badge';
import { getResourceTypeBadge } from '@/components/bookings/constants';

/**
 * Combined export - automatically chooses based on variant prop
 */
export const BookingResourceRenderer = ({ resource, variant = 'horizontal' }) => {
  const badgeStyles = resource.type ? getResourceTypeBadge(resource.type) : undefined;

  return (
    <div className='flex flex-col gap-2 items-start h-full'>
      <div className='flex flex-col gap-1 items-start'>
        <p className='text-label-sm text-text-main-900 whitespace-nowrap'>{resource.name}</p>
        <div className='flex gap-1.5 items-center'>
          <p className='text-paragraph-xs text-text-sub-500 whitespace-nowrap'>
            {resource.capacity} Seats
          </p>
          {resource.floor && (
            <>
              <div className='size-[3px] rounded-full bg-text-soft-400' />
              <p className='text-paragraph-xs text-text-sub-500 whitespace-nowrap'>
                {resource.floor}
              </p>
            </>
          )}
        </div>
      </div>
      {resource.type && (
        <Badge.Root variant='light' color={badgeStyles} className='whitespace-nowrap'>
          {resource.type}
        </Badge.Root>
      )}
    </div>
  );
};

export default BookingResourceRenderer;
