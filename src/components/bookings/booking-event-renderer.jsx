/**
 * Booking Event Renderer
 * Custom event card renderer for booking-specific features
 */

import React, { forwardRef } from 'react';
import { RiRefreshLine } from 'react-icons/ri';
import { format, isSameDay } from 'date-fns';
import { formatTimeRange, parseToDate } from '@/utils/date-utils';
import {
  getColorGradientStyles,
  getGradientRingColor,
  EVENT_RING_COLORS,
} from '@/components/bookings/constants';

/**
 * Booking Event Card - Renders a booking event with category-based styling
 */
export const BookingEventCard = forwardRef(
  ({ event, isPast = false, isActive = false, onClick, style, readOnly = false }, ref) => {
    // Get color gradient from event data (color_gradient field from backend)
    // Fallback to category-based styling if color_gradient is not available
    const gradientValue = event.color_gradient || event._raw?.color_gradient;
    const gradientStyles = getColorGradientStyles(gradientValue);

    // Override styles for past events - use gray color scheme
    const cardStyles = isPast
      ? {
          gradient: 'from-[#eef1f5] to-[#e6ebf0]',
          textColor: 'text-[#525866]',
          borderColor: 'border-[#e2e4e9]',
        }
      : gradientStyles;

    const handleClick = (e) => {
      e.stopPropagation();
      onClick?.(event);
    };

    // Add active/selected ring styling
    // Use gradient-based ring color if available, otherwise fallback to category-based
    const ringColor = isPast
      ? 'ring-gray-500'
      : gradientValue
        ? getGradientRingColor(gradientValue)
        : EVENT_RING_COLORS[event.category] || 'ring-blue-500';
    const ringClass = isActive ? `ring-2 ring-offset-1 ${ringColor}` : '';
    const startDate = parseToDate(event.start);
    const endDate = parseToDate(event.end);
    const timeLabel =
      startDate && endDate && !isSameDay(startDate, endDate)
        ? `${format(startDate, 'd MMM, h:mm a')} - ${format(endDate, 'd MMM, h:mm a')}`
        : formatTimeRange(event.start, event.end);

    return (
      <div
        ref={ref}
        onClick={handleClick}
        className={`
          bg-linear-to-b ${cardStyles.gradient}
          relative h-full cursor-pointer overflow-hidden rounded-lg
          px-2.5 py-2
          transition-all duration-150 select-none
          hover:shadow-md
          ${ringClass}
        `}
      >
        <div className={`flex min-w-0 flex-col gap-1 ${cardStyles.textColor}`}>
          {/* Time range — wrap so multi-day ranges stay visible; clipped by card overflow-hidden */}
          <p className='text-subheading-2xs uppercase opacity-80 wrap-break-word leading-snug'>
            {timeLabel}
          </p>

          {/* Event title — hidden in read-only occupancy mode (no title from API) */}
          {!readOnly && (
            <p className='text-label-xs overflow-hidden text-ellipsis line-clamp-2'>
              {event.booking_title || event.title}
            </p>
          )}
        </div>

        {/* Recurring icon */}
        {!readOnly && event.is_recurrence && (
          <div className={`absolute bottom-2 right-2 ${cardStyles.textColor}`}>
            <RiRefreshLine className='size-4' />
          </div>
        )}
      </div>
    );
  },
);

BookingEventCard.displayName = 'BookingEventCard';
