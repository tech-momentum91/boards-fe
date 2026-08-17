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
import { RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';

export const ScheduleTimeGrid = ({
  resources = [],
  events = [],
  renderResourceHeader,
  renderEvent,
  renderTimeLabel,
  renderEmptySlot,
  slotHeight = SCHEDULE_DIMENSIONS.HOUR_HEIGHT,
  resourceColumnWidth = SCHEDULE_DIMENSIONS.RESOURCE_COLUMN_WIDTH,
  timeLabelWidth = SCHEDULE_DIMENSIONS.TIME_LABEL_WIDTH,
  resourceHeaderHeight = SCHEDULE_DIMENSIONS.RESOURCE_HEADER_HEIGHT,
  centerGroupHeaderHeight = SCHEDULE_DIMENSIONS.CENTER_GROUP_HEADER_HEIGHT,
  gutterTimeSlotHeight = SCHEDULE_DIMENSIONS.GUTTER_TIME_SLOT_HEIGHT,
  className,
  classNames = {},
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
  const orientation = 'vertical';
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
    slotSize: slotHeight,
    gutterSize: gutterTimeSlotHeight,
    orientation,
    enableDragToCreate,
    allowPastEventCreation,
    onSlotMouseUp,
    showCurrentTime,
  });

  const totalHeaderHeight = centerGroupHeaderHeight + resourceHeaderHeight;

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: -resourceColumnWidth,
        behavior: 'smooth',
      });
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: resourceColumnWidth,
        behavior: 'smooth',
      });
    }
  };

  const totalSlots = timeSlots.length;
  const gridHeight = totalSlots * slotHeight + gutterTimeSlotHeight * 2;
  const hoursPerDay = endHour - startHour + 1;
  const dayLabelWidth = 34;
  const dayGroups = Array.from({ length: Math.ceil(totalSlots / hoursPerDay) }, (_, dayIndex) => {
    const startIndex = dayIndex * hoursPerDay;
    const firstSlot = timeSlots[startIndex];
    if (!firstSlot) return null;
    return {
      key: `${firstSlot.dateLabel}-${dayIndex}`,
      label: firstSlot.dateLabel,
      top: startIndex * slotHeight + gutterTimeSlotHeight,
      height: hoursPerDay * slotHeight,
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

  const resourceGridMinWidth = resourcesOrdered.length * resourceColumnWidth;

  return (
    <div
      ref={scrollRef}
      className={cn(
        // items-start: full content height on both columns so sticky headers aren’t trapped in a viewport-short box
        'flex h-full items-start bg-white relative overflow-auto booking-calendar-scroll flex-row',
        className,
      )}
      {...rest}
    >
      {/* --- Time axis: single sticky column; header corner spans full schedule header height (no duplicate cells) --- */}
      <div
        className={cn(
          'shrink-0 bg-white sticky left-0 z-[50] self-start',
          classNames.timeLabelColumn,
        )}
        style={{ width: timeLabelWidth, height: gridHeight + totalHeaderHeight }}
      >
        <div
          className='sticky top-0 z-[55] flex shrink-0 flex-col border-r border-stroke-soft-200 bg-white'
          style={{ height: totalHeaderHeight }}
        >
          {/* Aligns visually with center band row (same bg treatment as header strip above resources) */}
          {/* <div
            className='shrink-0 border-b border-stroke-soft-200 bg-gray-100'
            style={{ height: centerGroupHeaderHeight }}
            aria-hidden
          /> */}
          <div
            className='flex min-h-0 flex-1 items-stretch gap-0 border-b border-stroke-soft-200 bg-white'
            style={{ height: resourceHeaderHeight }}
          >
            <button
              type='button'
              onClick={handleScrollLeft}
              className='flex h-full min-h-0 flex-1 items-center justify-center transition-colors hover:bg-gray-50'
              aria-label='Scroll left'
            >
              <RiArrowLeftSLine className='h-5 w-5 text-text-sub-500' />
            </button>
            <button
              type='button'
              onClick={handleScrollRight}
              className='flex h-full min-h-0 flex-1 items-center justify-center border-l border-stroke-soft-200 transition-colors hover:bg-gray-50'
              aria-label='Scroll right'
            >
              <RiArrowRightSLine className='h-5 w-5 text-text-sub-500' />
            </button>
          </div>
        </div>
        <div className='relative bg-white' style={{ height: gridHeight }}>
          {/* Top Gutter Line */}
          <div
            className='absolute top-0 w-full border-r border-stroke-soft-200'
            style={{ height: gutterTimeSlotHeight }}
          />

          {/* Sticky day-label strip (grouped by each day block) */}
          <div
            className='absolute top-0 bottom-0 left-0 border-r border-stroke-soft-200 bg-white z-10'
            style={{ width: dayLabelWidth }}
          />
          {dayGroups.map((group) => (
            <div
              key={group.key}
              className='absolute left-0 border-r border-stroke-soft-200 z-10 bg-white'
              style={{ top: group.top, height: group.height, width: dayLabelWidth }}
            >
              <div
                className='sticky flex items-center justify-center px-1 text-[11px] text-text-sub-500 font-medium'
                style={{ top: totalHeaderHeight + 6 }}
              >
                <span
                  style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    lineHeight: 1,
                  }}
                >
                  {group.label}
                </span>
              </div>
            </div>
          ))}

          {timeSlots.map((slot, i) => (
            <div
              key={slot.key}
              className='absolute w-full border-r border-stroke-soft-200'
              style={{ top: i * slotHeight + gutterTimeSlotHeight, height: slotHeight }}
            >
              <div className='absolute inset-0 flex items-start justify-center px-3 pt-8 pointer-events-none'>
                {renderTimeLabel ? (
                  renderTimeLabel(slot.hour)
                ) : (
                  <div className='flex flex-col items-center pl-8'>
                    <Schedule.TimeLabel hour={slot.hour} orientation={orientation} />
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Bottom Gutter Line */}
          <div
            className='absolute bottom-0 w-full border-r border-stroke-soft-200'
            style={{ height: gutterTimeSlotHeight }}
          />

          {currentTimePos !== null && (
            <Schedule.CurrentTimeBadge
              position={currentTimePos}
              orientation='vertical'
              currentTime={currentTime}
              className='right-0'
              zIndex={5}
            />
          )}
        </div>
      </div>

      {/* Resource area: one sticky stack (center row + resource headers) so both pin together */}
      <div className='flex min-w-0 flex-1 flex-col self-start'>
        <div
          className='sticky top-0 z-[45] flex shrink-0 flex-col bg-white'
          style={{ minWidth: resourceGridMinWidth }}
        >
          <div
            className='flex min-w-max shrink-0 bg-white'
            style={{ height: centerGroupHeaderHeight }}
          >
            {centerGroups.map((group, idx) => (
              <div
                key={`${group.centerId}-${idx}`}
                className={cn(
                  'flex items-center justify-center border-b border-r border-stroke-soft-200 px-2',
                  'bg-gray-100',
                  // 'last:border-r-0',
                )}
                style={{
                  width: group.count * resourceColumnWidth,
                  height: centerGroupHeaderHeight,
                }}
              >
                <span className='max-w-full truncate text-label-sm font-semibold text-text-main-900'>
                  {group.centerName}
                </span>
              </div>
            ))}
          </div>
          <div className='flex min-w-max shrink-0'>
            {resourcesOrdered.map((resource) => (
              <div
                key={`hdr-${resource.id}`}
                className={cn(
                  'shrink-0 border-r border-b border-stroke-soft-200 bg-gray-50 p-1',
                  classNames.resourceColumn,
                )}
                style={{ width: resourceColumnWidth, height: resourceHeaderHeight }}
              >
                <Schedule.ResourceHeader
                  renderContent={renderResourceHeader}
                  resource={resource}
                  variant='vertical'
                  sticky={false}
                />
              </div>
            ))}
          </div>
        </div>

        {/* --- Lanes only (headers live in sticky block above) --- */}
        <div
          className={cn('flex relative', classNames.gridContainer)}
          style={{
            minWidth: resourceGridMinWidth,
            height: gridHeight,
          }}
        >
          {resourcesOrdered.map((resource) => {
            const sortedEvents = (eventsByResource[resource.id] || []).sort(
              (a, b) => new Date(a.start) - new Date(b.start),
            );

            return (
              <div
                key={resource.id}
                className={cn('shrink-0', classNames.resourceColumn)}
                style={{
                  width: resourceColumnWidth,
                  minHeight: gridHeight,
                }}
              >
                <div
                  className='relative bg-white border-r border-stroke-soft-200'
                  style={{ height: gridHeight }}
                  data-schedule-lane={resource.id}
                >
                  <Schedule.Slot
                    state='disabled'
                    past
                    style={{ top: 0, height: gutterTimeSlotHeight, width: '100%' }}
                    orientation='vertical'
                    className='border-t-0'
                  />

                  {timeSlots.map((slot, i) => {
                    const slotTop = i * slotHeight + gutterTimeSlotHeight;
                    const isPast = isSlotInPast(slot.start);
                    const isCreating = dragState.isCreating && dragState.resourceId === resource.id;

                    return (
                      <Schedule.Slot
                        key={`${resource.id}-${slot.key}`}
                        state={isCreating ? 'creating' : isPast ? 'disabled' : 'default'}
                        past={isPast}
                        style={{
                          top: slotTop,
                          height: slotHeight,
                          width: '100%',
                          position: 'absolute',
                        }}
                        onClick={() => onSlotClickWrapper(resource.id, slot.start)}
                        onMouseDown={(e) => handleDragStart(e, resource.id, slot.start, slotTop)}
                        orientation='vertical'
                      >
                        {renderEmptySlot?.(resource.id, slot.hour)}
                      </Schedule.Slot>
                    );
                  })}

                  <Schedule.Slot
                    state='disabled'
                    past
                    style={{ bottom: 0, height: gutterTimeSlotHeight, width: '100%' }}
                    orientation='vertical'
                  />

                  {dragState.isCreating && dragState.resourceId === resource.id && preview && (
                    <Schedule.DragPreview
                      position={{ top: preview.offset, height: preview.size, left: 8, right: 8 }}
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
                    const marginTop = touchingPrevious ? padding / 2 : padding;
                    const marginBottom = touchingNext ? padding / 2 : padding;

                    const { top, height } = calculateEventPosition(
                      visibleStart,
                      visibleEnd,
                      startHour,
                      slotHeight,
                      'vertical',
                      gutterTimeSlotHeight,
                      rangeStart,
                    );

                    return (
                      <Schedule.Event
                        key={event.id}
                        event={event}
                        onClick={onEventClick}
                        renderContent={renderEvent}
                        isPast={new Date(event.end) < currentTime}
                        style={{
                          top: top + marginTop,
                          height: Math.max(height - marginTop - marginBottom, 0),
                          left: padding,
                          right: padding,
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
            <Schedule.CurrentTimeLine position={currentTimePos} orientation='vertical' zIndex={4} />
          )}
        </div>
      </div>
    </div>
  );
};
