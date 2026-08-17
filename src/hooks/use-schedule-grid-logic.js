import { useMemo, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { useScheduleContext } from '@/components/ui/schedule/schedule-root';
import { useAutoScrollToCurrentTime } from '@/hooks/use-auto-scroll-to-current-time';
import { generateTimeSlots, groupEventsByResource } from '@/components/ui/schedule/schedule-utils';

const MIN_EVENT_DURATION = 30 * 60 * 1000; // 30 minutes
const EDGE_SCROLL_PX = 48;
const EDGE_SCROLL_STEP = 16;

function escapeDataScheduleLaneValue(id) {
  const s = String(id);
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(s);
  }
  return s.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

export const useScheduleGridLogic = ({
  resources,
  events,
  viewDate,
  startHour,
  endHour,
  slotSize,
  gutterSize = 0,
  orientation = 'vertical', // 'vertical' | 'horizontal'
  enableDragToCreate,
  allowPastEventCreation,
  onSlotMouseUp: onExternalSlotMouseUp,
  showCurrentTime,
}) => {
  const { currentTime, onSlotClick, eventTransformer, pastBufferMs, timelineDays } =
    useScheduleContext();

  // --- 1. Auto Scroll ---
  const scrollRef = useAutoScrollToCurrentTime({
    viewDate,
    currentTime,
    startHour,
    endHour,
    slotSize,
    gutterSize,
    direction: orientation,
  });

  // --- 2. Memoized Data Calculations ---
  const safeTimelineDays = Math.max(1, timelineDays || 1);
  const timeSlots = useMemo(
    () => generateTimeSlots(startHour, endHour, safeTimelineDays, viewDate),
    [startHour, endHour, safeTimelineDays, viewDate],
  );

  const eventsByResource = useMemo(
    () => groupEventsByResource(events, eventTransformer),
    [events, eventTransformer],
  );

  const currentTimePos = useMemo(() => {
    if (!showCurrentTime) return null;
    const rangeStart = new Date(viewDate);
    rangeStart.setHours(startHour, 0, 0, 0);
    const rangeEnd = new Date(viewDate);
    rangeEnd.setDate(rangeEnd.getDate() + safeTimelineDays - 1);
    rangeEnd.setHours(endHour, 59, 59, 999);

    if (currentTime < rangeStart || currentTime > rangeEnd) return null;
    const minutesFromStart = (currentTime.getTime() - rangeStart.getTime()) / (1000 * 60);
    return (minutesFromStart / 60) * slotSize + gutterSize;
  }, [
    showCurrentTime,
    viewDate,
    currentTime,
    startHour,
    endHour,
    slotSize,
    gutterSize,
    safeTimelineDays,
  ]);

  const getNextEventStart = useCallback(
    (resourceId, startTime) => {
      const resourceEvents = eventsByResource[resourceId] || [];
      let nextStart = null;
      for (const event of resourceEvents) {
        const eventStart = new Date(event.start);
        if (eventStart > startTime && (!nextStart || eventStart < nextStart)) {
          nextStart = eventStart;
        }
      }
      return nextStart;
    },
    [eventsByResource],
  );

  /** Returns the next available start time at or after requestedTime (snaps past overlapping events). */
  const getNextAvailableStartTime = useCallback(
    (resourceId, requestedTime) => {
      const resourceEvents = eventsByResource[resourceId] || [];
      let nextAvailable = new Date(requestedTime);
      for (const event of resourceEvents) {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        if (eventStart <= requestedTime && eventEnd > requestedTime && eventEnd > nextAvailable) {
          nextAvailable = new Date(eventEnd);
        }
      }
      return nextAvailable;
    },
    [eventsByResource],
  );

  const isSlotInPast = useCallback(
    (slotStartTime) => {
      if (allowPastEventCreation) return false;
      const slotDate = new Date(slotStartTime);
      // Check if the next hour has started (meaning this entire hour slot is past)
      slotDate.setHours(slotDate.getHours() + 1, 0, 0, 0);
      const cutoff = new Date(currentTime.getTime() - pastBufferMs);
      return slotDate < cutoff;
    },
    [allowPastEventCreation, currentTime, pastBufferMs],
  );

  // --- 3. Drag to Create Logic ---
  const [dragState, setDragState] = useState({
    isCreating: false,
    start: null, // { time: Date, pixel: number }
    end: null, // { time: Date, pixel: number }
    resourceId: null,
  });
  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;

  const lastPointerRef = useRef({ x: 0, y: 0 });
  const dragEndHandledRef = useRef(false);

  const handleDragStart = useCallback(
    (e, resourceId, slotStartTime, slotOriginPixel) => {
      if (!enableDragToCreate || e.target.closest('.calendar-event-wrapper')) {
        return;
      }
      if (isSlotInPast(slotStartTime)) {
        return;
      }

      e.preventDefault();

      // Calculate Time
      const startDate = new Date(slotStartTime);

      // Calculate Coordinates (Abstracting X vs Y based on orientation)
      const rect = e.currentTarget.getBoundingClientRect();
      const clientPos = orientation === 'horizontal' ? e.clientX : e.clientY;
      const rectOrigin = orientation === 'horizontal' ? rect.left : rect.top;

      const relativePos = clientPos - rectOrigin;
      const minutesInSlot = (relativePos / slotSize) * 60;
      const snappedMinutes = Math.floor(minutesInSlot / 30) * 30;
      startDate.setMinutes(snappedMinutes);

      // Determine the 30-min slot window we are starting from
      const slotStart = new Date(startDate);
      slotStart.setSeconds(0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + 30);

      // If this entire 30-min slot is already occupied by existing events
      // (possibly by multiple back-to-back events), do not allow drag-creation to start here.
      const resourceEvents = eventsByResource[resourceId] || [];
      const overlappingIntervals = [];

      for (const event of resourceEvents) {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);

        // Compute overlap between [eventStart, eventEnd] and [slotStart, slotEnd]
        const overlapStart = new Date(Math.max(eventStart.getTime(), slotStart.getTime()));
        const overlapEnd = new Date(Math.min(eventEnd.getTime(), slotEnd.getTime()));

        if (overlapEnd > overlapStart) {
          overlappingIntervals.push({ start: overlapStart, end: overlapEnd });
        }
      }

      if (overlappingIntervals.length > 0) {
        overlappingIntervals.sort((a, b) => a.start - b.start);

        const mergedStart = overlappingIntervals[0].start;
        let mergedEnd = overlappingIntervals[0].end;
        let hasGap = false;

        for (let i = 1; i < overlappingIntervals.length; i += 1) {
          const current = overlappingIntervals[i];
          if (current.start > mergedEnd) {
            // Found a gap in coverage inside the slot
            hasGap = true;
            break;
          }
          if (current.end > mergedEnd) {
            mergedEnd = current.end;
          }
        }

        const fullyCovered =
          !hasGap && mergedStart <= slotStart && mergedEnd >= slotEnd && mergedEnd > mergedStart;

        if (fullyCovered) {
          // Entire 30-min slot is already occupied – do not start creating a new event
          return;
        }
      }

      // If slot overlaps an existing event, snap start to next available time (e.g. 7:00 → 7:02 when previous ends at 7:02)
      const adjustedStart = getNextAvailableStartTime(resourceId, startDate);
      adjustedStart.setSeconds(0, 0);
      const startTimeToUse = adjustedStart;

      // Check if this specific 30-min slot is in the past
      // If the 30-min slot has completely passed beyond buffer, don't allow creation
      const now = new Date();
      const slotEndForCheck = new Date(startTimeToUse);
      slotEndForCheck.setMinutes(slotEndForCheck.getMinutes() + 30);
      const cutoff = new Date(now.getTime() - pastBufferMs);
      if (!allowPastEventCreation && slotEndForCheck <= cutoff) {
        return;
      }

      const startMinutesFromHour =
        startTimeToUse.getMinutes() / 60 + startTimeToUse.getSeconds() / 3600;
      const absolutePixel = slotOriginPixel + startMinutesFromHour * slotSize;

      dragEndHandledRef.current = false;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };

      setDragState({
        isCreating: true,
        resourceId,
        start: { time: startTimeToUse, pixel: absolutePixel },
        end: { time: startTimeToUse, pixel: absolutePixel },
      });
    },
    [
      enableDragToCreate,
      isSlotInPast,
      orientation,
      slotSize,
      allowPastEventCreation,
      getNextAvailableStartTime,
      pastBufferMs,
      eventsByResource,
    ],
  );

  const updateDragEndFromPointer = useCallback(
    (clientX, clientY) => {
      const previous = dragStateRef.current;
      if (!previous.isCreating || !previous.resourceId || !previous.start) {
        return;
      }

      const scrollEl = scrollRef.current;
      if (scrollEl) {
        const sRect = scrollEl.getBoundingClientRect();
        if (orientation === 'vertical') {
          if (clientY < sRect.top + EDGE_SCROLL_PX) {
            scrollEl.scrollTop -= EDGE_SCROLL_STEP;
          }
          if (clientY > sRect.bottom - EDGE_SCROLL_PX) {
            scrollEl.scrollTop += EDGE_SCROLL_STEP;
          }
        } else {
          if (clientX < sRect.left + EDGE_SCROLL_PX) {
            scrollEl.scrollLeft -= EDGE_SCROLL_STEP;
          }
          if (clientX > sRect.right - EDGE_SCROLL_PX) {
            scrollEl.scrollLeft += EDGE_SCROLL_STEP;
          }
        }
      }

      const { resourceId } = previous;
      const startTime = previous.start.time;
      const lane =
        scrollEl?.querySelector?.(
          `[data-schedule-lane="${escapeDataScheduleLaneValue(resourceId)}"]`,
        ) ?? null;
      if (!lane) {
        return;
      }

      const laneRect = lane.getBoundingClientRect();
      const clientPos = orientation === 'horizontal' ? clientX : clientY;
      const laneOrigin = orientation === 'horizontal' ? laneRect.left : laneRect.top;
      const relativePos = clientPos - laneOrigin;

      const innerRel = relativePos - gutterSize;
      const timelinePx = timeSlots.length * slotSize;
      const clampedRel = Math.max(0, Math.min(timelinePx - 0.01, innerRel));
      const slotIndex = Math.min(
        timeSlots.length - 1,
        Math.max(0, Math.floor(clampedRel / slotSize)),
      );
      const slotStartTime = timeSlots[slotIndex].start;
      const relativeInSlot = clampedRel - slotIndex * slotSize;

      const endDate = new Date(slotStartTime);
      const minutesInSlot = (relativeInSlot / slotSize) * 60;
      const snappedMinutes = Math.round(minutesInSlot / 30) * 30;
      endDate.setMinutes(snappedMinutes);

      const now = new Date();
      let clampedEndDate = new Date(endDate);

      if (clampedEndDate <= startTime) {
        clampedEndDate = new Date(startTime.getTime() + MIN_EVENT_DURATION);
      }

      if (!allowPastEventCreation) {
        const cutoff = new Date(now.getTime() - pastBufferMs);
        const minEndTime = new Date(
          Math.max(cutoff.getTime(), startTime.getTime() + MIN_EVENT_DURATION),
        );
        if (clampedEndDate < minEndTime) {
          clampedEndDate = new Date(minEndTime);
        }
      }

      const nextEventStart = getNextEventStart(resourceId, startTime);
      if (nextEventStart && clampedEndDate > nextEventStart) {
        clampedEndDate = new Date(nextEventStart);
      }

      const durationMs = clampedEndDate.getTime() - startTime.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);

      setDragState((p) => {
        if (!p.isCreating || p.resourceId !== resourceId || !p.start) {
          return p;
        }
        const absolutePixel = p.start.pixel + durationHours * slotSize;
        return {
          ...p,
          end: { time: clampedEndDate, pixel: absolutePixel },
        };
      });
    },
    [
      scrollRef,
      orientation,
      gutterSize,
      timeSlots,
      slotSize,
      allowPastEventCreation,
      getNextEventStart,
      pastBufferMs,
    ],
  );

  const handleDragEnd = useCallback(() => {
    if (dragEndHandledRef.current) {
      return;
    }

    const ds = dragStateRef.current;
    if (!ds.isCreating || !ds.start || !ds.end) {
      setDragState({ isCreating: false, start: null, end: null, resourceId: null });
      return;
    }

    dragEndHandledRef.current = true;

    try {
      let actualStart = ds.start.time;
      let actualEnd = ds.end.time;

      if (actualEnd <= actualStart) {
        actualEnd = new Date(actualStart.getTime() + MIN_EVENT_DURATION);
      }

      const now = new Date();
      const cutoff = new Date(now.getTime() - pastBufferMs);
      const SAFETY_BUFFER = 60 * 1000; // 1 minute buffer

      if (!allowPastEventCreation) {
        if (actualStart < cutoff) {
          actualStart = new Date(cutoff.getTime() + SAFETY_BUFFER);
        }

        const originalNudgedStart = new Date(actualStart);
        actualStart = getNextAvailableStartTime(ds.resourceId, actualStart);
        actualStart.setSeconds(0, 0);

        if (actualStart.getTime() !== originalNudgedStart.getTime()) {
          actualEnd = new Date(
            actualStart.getTime() + (ds.end.time.getTime() - ds.start.time.getTime()),
          );
        }
      }

      if (actualEnd < actualStart) {
        actualEnd = new Date(actualStart.getTime() + MIN_EVENT_DURATION);
      }

      const nextEventStart = getNextEventStart(ds.resourceId, actualStart);
      const minimumEndTime = new Date(actualStart.getTime() + MIN_EVENT_DURATION);
      if (nextEventStart && nextEventStart < minimumEndTime) {
        return;
      }
      if (nextEventStart && actualEnd > nextEventStart) {
        actualEnd = new Date(nextEventStart);
      }

      if (actualEnd <= actualStart) {
        actualEnd = new Date(actualStart.getTime() + MIN_EVENT_DURATION);
      }

      if (actualEnd.getTime() - actualStart.getTime() < MIN_EVENT_DURATION) {
        actualEnd = new Date(minimumEndTime);
      }

      if (onExternalSlotMouseUp) {
        onExternalSlotMouseUp({
          resourceId: ds.resourceId,
          start: actualStart.toISOString(),
          end: actualEnd.toISOString(),
        });
      }
    } finally {
      const cleared = { isCreating: false, start: null, end: null, resourceId: null };
      dragStateRef.current = cleared;
      dragEndHandledRef.current = false;
      setDragState(cleared);
    }
  }, [
    onExternalSlotMouseUp,
    allowPastEventCreation,
    getNextEventStart,
    pastBufferMs,
    getNextAvailableStartTime,
  ]);

  const handleDragEndRef = useRef(handleDragEnd);
  handleDragEndRef.current = handleDragEnd;

  useLayoutEffect(() => {
    if (!dragState.isCreating) {
      return undefined;
    }

    const onMove = (ev) => {
      lastPointerRef.current = { x: ev.clientX, y: ev.clientY };
      updateDragEndFromPointer(ev.clientX, ev.clientY);
    };

    const onUp = () => {
      handleDragEndRef.current();
    };

    const rafRef = { id: 0 };
    const tick = () => {
      if (!dragStateRef.current.isCreating) {
        return;
      }
      const { x, y } = lastPointerRef.current;
      updateDragEndFromPointer(x, y);
      rafRef.id = requestAnimationFrame(tick);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    rafRef.id = requestAnimationFrame(tick);

    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      cancelAnimationFrame(rafRef.id);
      document.body.style.userSelect = prevUserSelect;
    };
  }, [dragState.isCreating, updateDragEndFromPointer]);

  // --- 4. Helper for Preview Rendering ---
  const getCreationPreview = useCallback(() => {
    if (!dragState.isCreating || !dragState.start || !dragState.end) return null;

    const startPx = Math.min(dragState.start.pixel, dragState.end.pixel);
    const endPx = Math.max(dragState.start.pixel, dragState.end.pixel);
    const size = Math.max(endPx - startPx, slotSize / 2); // Minimum visual size

    // Return agnostic "offset" and "size" (left/width or top/height)
    return { offset: startPx, size };
  }, [dragState, slotSize]);

  // --- 5. Slot Click Handler ---
  const onSlotClickWrapper = useCallback(
    (resourceId, slotStartTime) => {
      if (isSlotInPast(slotStartTime) || dragState.isCreating || !onSlotClick) {
        return;
      }

      let start = new Date(slotStartTime);
      start.setSeconds(0, 0);

      const now = new Date();
      const cutoff = new Date(now.getTime() - pastBufferMs);
      const SAFETY_BUFFER = 60 * 1000; // 1 minute buffer

      // Precision / Nudge Logic
      if (
        !allowPastEventCreation && // Case A: More than 24h in past -> Nudge to 24h window
        start < cutoff
      ) {
        start = new Date(cutoff.getTime() + SAFETY_BUFFER);
      }

      // If start falls inside an existing event, snap to the next available time (e.g. 6:00 → 6:30 when 6:00–6:30 is taken)
      start = getNextAvailableStartTime(resourceId, start);
      start.setSeconds(0, 0);

      let end = new Date(start.getTime() + 30 * 60000);

      // Constrain end so we don't suggest a range that overlaps the next event
      const nextEventStart = getNextEventStart(resourceId, start);
      if (nextEventStart && end > nextEventStart) {
        end = new Date(nextEventStart);
        // Prefer full 30 min ending at next event (e.g. 5:30–6:00) when possible
        const candidateStart = new Date(end.getTime() - MIN_EVENT_DURATION);
        // Ensure candidateStart is not in the past beyond buffer, unless allowPastEventCreation is true
        if (allowPastEventCreation || candidateStart >= cutoff) {
          start = candidateStart;
        }
      }

      if (end <= start) {
        return;
      }

      onSlotClick({ resourceId, start: start.toISOString(), end: end.toISOString() });
    },
    [
      isSlotInPast,
      dragState.isCreating,
      onSlotClick,
      allowPastEventCreation,
      getNextEventStart,
      getNextAvailableStartTime,
      pastBufferMs,
    ],
  );

  return {
    scrollRef,
    timeSlots,
    eventsByResource,
    currentTimePos,
    isSlotInPast,
    dragState,
    handleDragStart,
    handleDragEnd,
    getCreationPreview,
    onSlotClickWrapper,
    currentTime,
  };
};
