import { useEffect, useRef } from 'react';
import { isSameDay, getHours, startOfDay } from 'date-fns';

/**
 * Custom Hook: Auto-scroll to Current Time
 * Automatically scrolls calendar to the current time slot when viewing today
 * Supports both vertical (TimeGrid) and horizontal (TimelineGrid) scrolling
 *
 * @param {Object} options - Configuration options
 * @param {Date|string} options.viewDate - The date being viewed in the calendar
 * @param {Date} options.currentTime - Current time from calendar context
 * @param {number} options.startHour - Start hour of the calendar (e.g., 0)
 * @param {number} options.endHour - End hour of the calendar (e.g., 23)
 * @param {number} options.slotSize - Size of one hour slot in pixels (height for vertical, width for horizontal)
 * @param {number} options.gutterSize - Gutter size in pixels (0 for horizontal, gutterTimeSlotHeight for vertical)
 * @param {'vertical'|'horizontal'} options.direction - Scroll direction
 * @returns {React.RefObject} Ref to attach to the scrollable container
 */
export const useAutoScrollToCurrentTime = ({
  viewDate,
  currentTime,
  startHour,
  endHour,
  slotSize,
  gutterSize = 0,
  direction = 'vertical',
}) => {
  const scrollContainerRef = useRef(null);
  const hasScrolledToCurrentTime = useRef(false);
  const lastViewDateRef = useRef(null);

  // Auto-scroll to current time slot when viewing today
  // Only scroll when viewDate changes, not on currentTime updates
  useEffect(() => {
    // Normalize viewDate to a Date object and get start of day for comparison
    const viewDateObject = startOfDay(new Date(viewDate));
    const viewDateKey = viewDateObject.getTime();

    // Check if viewDate has actually changed
    const hasViewDateChanged = lastViewDateRef.current !== viewDateKey;

    if (!hasViewDateChanged) {
      // ViewDate hasn't changed, don't scroll
      return;
    }

    // Update the last viewDate
    lastViewDateRef.current = viewDateKey;
    // Reset scroll flag when viewDate changes
    hasScrolledToCurrentTime.current = false;

    // Only proceed if we have a container and haven't scrolled yet
    if (!scrollContainerRef.current || hasScrolledToCurrentTime.current) return;

    // Check if viewDate is today using date-fns
    const now = new Date();
    const isToday = isSameDay(viewDateObject, now);

    if (isToday) {
      // Get current hour using date-fns
      const currentHour = getHours(now);

      // Round down to nearest hour (e.g., 9:24 -> 9:00)
      const slotHour = currentHour;

      // Check if current hour is within the displayed range
      if (slotHour >= startHour && slotHour <= endHour) {
        // Calculate scroll position: position of the slot start
        const hoursFromStart = slotHour - startHour;
        const scrollPosition = hoursFromStart * slotSize + gutterSize;

        // Scroll to position (with a small offset to show a bit before)
        const scrollOffset = Math.max(0, scrollPosition - slotSize * 0.5);

        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          if (scrollContainerRef.current && !hasScrolledToCurrentTime.current) {
            if (direction === 'vertical') {
              scrollContainerRef.current.scrollTop = scrollOffset;
            } else {
              scrollContainerRef.current.scrollLeft = scrollOffset;
            }
            hasScrolledToCurrentTime.current = true;
          }
        }, 100);
      }
    }
    // Only depend on viewDate and layout-related props, not currentTime
  }, [viewDate, startHour, endHour, slotSize, gutterSize, direction]);

  return scrollContainerRef;
};
