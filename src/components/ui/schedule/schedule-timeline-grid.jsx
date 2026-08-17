import React, { useMemo } from 'react';
import * as Schedule from '@/components/ui/schedule';
import {
  calculateEventPosition,
  areTimesAdjacent,
  isGridLine,
} from '@/components/ui/schedule/schedule-utils';
import { SCHEDULE_DIMENSIONS } from '@/components/ui/schedule/schedule-constants';
import { buildCenterColumnGroups } from '@/components/ui/schedule/schedule-center-groups';
import { cn } from '@/lib/utils';
import { useScheduleGridLogic } from '@/hooks/use-schedule-grid-logic';

export const ScheduleTimelineGrid = ({
  resources = [],
  events = [],
  renderResourceHeader,
  renderEvent,
  renderTimeLabel,
  renderEmptySlot,
  timeSlotWidth = SCHEDULE_DIMENSIONS.TIME_SLOT_WIDTH || 120,
  resourceColumnWidth = SCHEDULE_DIMENSIONS.RESOURCE_SIDEBAR_WIDTH || 200,
  centerGroupSidebarWidth = SCHEDULE_DIMENSIONS.CENTER_GROUP_SIDEBAR_WIDTH ?? 96,
  resourceRowHeight = 96,
  headerHeight = SCHEDULE_DIMENSIONS.RESOURCE_HEADER_HEIGHT_HORIZONTAL || 48,
  gutterTimeSlotWidth = SCHEDULE_DIMENSIONS.GUTTER_TIME_SLOT_WIDTH ?? 40,
  className,
  ...rest
}) => {
  const { resourcesOrdered, centerGroups } = useMemo(
    () => buildCenterColumnGroups(resources),
    [resources],
  );

  const {
    viewDate,
    startHour,
    endHour,
    showCurrentTime,
    enableDragToCreate,
    allowPastEventCreation,
    onSlotMouseUp,
    onEventClick,
    onSlotClick,
  } = Schedule.useScheduleContext();
  const orientation = 'horizontal';
  const {
    scrollRef,
    timeSlots,
    eventsByResource,
    currentTimePos,
    isSlotInPast,
    dragState,
    handleDragStart,
    getCreationPreview,
    onSlotClickWrapper,
    currentTime,
  } = useScheduleGridLogic({
    resources: resourcesOrdered,
    events,
    viewDate,
    startHour,
    endHour,
    slotSize: timeSlotWidth,
    gutterSize: gutterTimeSlotWidth,
    orientation,
    enableDragToCreate,
    allowPastEventCreation,
    onSlotMouseUp,
    showCurrentTime,
  });

  const totalLeftWidth = centerGroupSidebarWidth + resourceColumnWidth;
  const timeAxisWidth = gutterTimeSlotWidth + timeSlots.length * timeSlotWidth;
  const totalContainerWidth = totalLeftWidth + timeAxisWidth;
  const hoursPerDay = endHour - startHour + 1;
  const dayHeaderHeight = 24;
  const dayGroups = Array.from({ length: Math.ceil(timeSlots.length / hoursPerDay) }, (_, i) => {
    const firstSlot = timeSlots[i * hoursPerDay];
    if (!firstSlot) return null;
    return {
      key: `${firstSlot.dateLabel}-${i}`,
      label: firstSlot.dateLabel,
      left: gutterTimeSlotWidth + i * hoursPerDay * timeSlotWidth,
      width: hoursPerDay * timeSlotWidth,
    };
  }).filter(Boolean);
  const rangeStartDate = new Date(timeSlots[0]?.start || new Date(viewDate).toISOString());
  const rangeEndDate = new Date(
    (timeSlots[timeSlots.length - 1] &&
      new Date(timeSlots[timeSlots.length - 1].start).getTime() + 60 * 60 * 1000) ||
      rangeStartDate.getTime() + 60 * 60 * 1000,
  );
  const rangeStart = rangeStartDate.toISOString();
  const preview = getCreationPreview();

  const totalBodyHeight = resourcesOrdered.length * resourceRowHeight;

  const leftSidebarGrid = useMemo(() => {
    if (resourcesOrdered.length === 0) return null;
    let rowStart = 1;
    let offset = 0;
    const nodes = [];
    for (const group of centerGroups) {
      const { count, centerName, centerId } = group;
      nodes.push(
        <div
          key={`cg-${centerId}-${rowStart}`}
          className='flex items-center justify-center border-b border-r border-stroke-soft-200 bg-gray-100 px-2'
          style={{ gridColumn: 1, gridRow: `${rowStart} / span ${count}` }}
        >
          <span className='line-clamp-4 text-center text-label-sm font-semibold text-text-main-900'>
            {centerName}
          </span>
        </div>,
      );
      for (let i = 0; i < count; i++) {
        const resource = resourcesOrdered[offset + i];
        nodes.push(
          <div
            key={resource.id}
            className='flex flex-col justify-center border-b border-stroke-soft-200 bg-gray-50 px-2'
            style={{ gridColumn: 2, gridRow: rowStart + i }}
          >
            <Schedule.ResourceHeader
              resource={resource}
              variant='horizontal'
              renderContent={renderResourceHeader}
            />
          </div>,
        );
      }
      rowStart += count;
      offset += count;
    }
    return nodes;
  }, [centerGroups, resourcesOrdered, renderResourceHeader]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        'relative h-full items-start overflow-auto bg-white booking-calendar-scroll',
        className,
      )}
      {...rest}
    >
      <div
        className='relative flex min-w-max flex-col bg-white'
        style={{ width: totalContainerWidth }}
      >
        {/* --- Header --- */}
        <div className='sticky top-0 z-40 border-b border-stroke-soft-200 bg-white'>
          {/* Day-group axis */}
          <div className='flex border-b border-stroke-soft-200' style={{ height: dayHeaderHeight }}>
            <div
              className='sticky left-0 z-50 shrink-0 border-r border-stroke-soft-200 bg-white'
              style={{ width: totalLeftWidth }}
              aria-hidden
            />
            <div className='relative shrink-0' style={{ width: timeAxisWidth }}>
              <div
                className='absolute top-0 bottom-0 left-0 bg-white'
                style={{ width: gutterTimeSlotWidth }}
                aria-hidden
              />
              {dayGroups.map((group) => (
                <div
                  key={group.key}
                  className='absolute top-0 bottom-0 flex items-center bg-white'
                  style={{ left: group.left, width: group.width }}
                >
                  <span className='text-[11px] font-medium text-text-sub-500 sticky -translate-x-1/2'>
                    {group.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Hour axis */}
          <div className='flex' style={{ height: headerHeight }}>
            <div
              className='sticky left-0 z-50 shrink-0 border-r border-stroke-soft-200 bg-white'
              style={{ width: totalLeftWidth }}
              aria-hidden
            />
            <div className='relative shrink-0' style={{ width: timeAxisWidth }}>
              <div
                className='absolute top-0 bottom-0 left-0 bg-white'
                style={{ width: gutterTimeSlotWidth }}
                aria-hidden
              />
              {timeSlots.map((slot, i) => (
                <div
                  key={slot.key}
                  className='absolute top-0 bottom-0'
                  style={{
                    left: gutterTimeSlotWidth + i * timeSlotWidth,
                    width: timeSlotWidth,
                  }}
                >
                  <div className='pointer-events-none absolute inset-0 flex items-end justify-center py-3 pl-8'>
                    {renderTimeLabel ? (
                      renderTimeLabel(slot.hour)
                    ) : (
                      <Schedule.TimeLabel hour={slot.hour} orientation={orientation} />
                    )}
                  </div>
                </div>
              ))}
              {currentTimePos !== null && (
                <Schedule.CurrentTimeBadge
                  position={currentTimePos}
                  orientation='horizontal'
                  currentTime={currentTime}
                  className='bottom-0'
                  zIndex={5}
                />
              )}
            </div>
          </div>
        </div>

        {/* --- Body: sticky left sidebar (center + resource) + time tracks --- */}
        <div className='relative flex flex-row items-start'>
          <div
            className='sticky left-0 z-30 grid shrink-0 border-r border-stroke-soft-200 bg-white'
            style={{
              gridTemplateColumns: `${centerGroupSidebarWidth}px ${resourceColumnWidth}px`,
              gridTemplateRows: `repeat(${resourcesOrdered.length}, ${resourceRowHeight}px)`,
              width: totalLeftWidth,
              minHeight: totalBodyHeight,
            }}
          >
            {leftSidebarGrid}
          </div>

          <div
            className='relative flex min-w-0 flex-1 flex-col'
            style={{ width: timeAxisWidth, minHeight: totalBodyHeight }}
          >
            {resourcesOrdered.map((resource) => {
              const { id } = resource;
              const sortedEvents = eventsByResource[id] || [];
              return (
                <div key={id} className='relative flex' style={{ height: resourceRowHeight }}>
                  <div
                    className='relative grow border-b border-stroke-soft-200'
                    data-schedule-lane={id}
                  >
                    <Schedule.Slot
                      state='disabled'
                      past
                      style={{
                        position: 'absolute',
                        left: 0,
                        width: gutterTimeSlotWidth,
                        height: '100%',
                      }}
                      orientation='horizontal'
                      className='border-r border-stroke-soft-200'
                    />
                    {timeSlots.map((slot, i) => {
                      const slotLeft = gutterTimeSlotWidth + i * timeSlotWidth;
                      const isPast = isSlotInPast(slot.start);
                      const isCreating = dragState.isCreating && dragState.resourceId === id;

                      return (
                        <Schedule.Slot
                          key={`${id}-${slot.key}`}
                          state={isCreating ? 'creating' : isPast ? 'disabled' : 'default'}
                          past={isPast}
                          style={{
                            position: 'absolute',
                            left: slotLeft,
                            width: timeSlotWidth,
                            height: '100%',
                            borderRight: '1px solid rgba(226,228,233,0.8)',
                          }}
                          onClick={() => onSlotClickWrapper(id, slot.start)}
                          onMouseDown={(e) => handleDragStart(e, id, slot.start, slotLeft)}
                          orientation='horizontal'
                        >
                          {renderEmptySlot?.(id, slot.hour)}
                        </Schedule.Slot>
                      );
                    })}

                    {dragState.isCreating && dragState.resourceId === id && preview && (
                      <Schedule.DragPreview
                        position={{ left: preview.offset, width: preview.size, top: 8, bottom: 8 }}
                        state='creating'
                      />
                    )}

                    {sortedEvents.map((event, i) => {
                      const visibleStart = new Date(
                        Math.max(new Date(event.start).getTime(), rangeStartDate.getTime()),
                      );
                      const visibleEnd = new Date(
                        Math.min(new Date(event.end).getTime(), rangeEndDate.getTime()),
                      );
                      if (visibleEnd <= visibleStart) {
                        return null;
                      }

                      const previous = sortedEvents[i - 1];
                      const next = sortedEvents[i + 1];
                      const padding = SCHEDULE_DIMENSIONS.EVENT_PADDING || 8;
                      const touchingPrevious =
                        areTimesAdjacent(previous?.end, event.start) && !isGridLine(event.start);
                      const touchingNext =
                        areTimesAdjacent(event.end, next?.start) && !isGridLine(event.end);
                      const marginLeft = touchingPrevious ? padding / 2 : padding;
                      const marginRight = touchingNext ? padding / 2 : padding;

                      const { left, width } = calculateEventPosition(
                        visibleStart,
                        visibleEnd,
                        startHour,
                        timeSlotWidth,
                        'horizontal',
                        gutterTimeSlotWidth,
                        rangeStart,
                      );

                      return (
                        <Schedule.Event
                          key={event.id ?? event.name}
                          event={event}
                          onClick={onEventClick}
                          renderContent={renderEvent}
                          isPast={new Date(event.end) < currentTime}
                          style={{
                            left: left + marginLeft,
                            width: Math.max(width - marginLeft - marginRight, 0),
                            top: padding,
                            bottom: padding,
                            zIndex: 3,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {currentTimePos !== null && (
              <Schedule.CurrentTimeLine
                position={currentTimePos}
                orientation='horizontal'
                zIndex={4}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
