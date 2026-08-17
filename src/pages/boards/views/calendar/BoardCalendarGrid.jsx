import { useCallback, useMemo, useRef, useState } from 'react';
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { RiAddLine } from 'react-icons/ri';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import * as Popover from '@/components/ui/popover';
import * as Button from '@/components/ui/button';
import { cn } from '@/utils/cn';
import BoardCalendarTaskRow from './BoardCalendarTaskRow';
import BoardCalendarTimeGrid from './BoardCalendarTimeGrid';
import BoardCalendarDropZone from './BoardCalendarDropZone';
import {
  parseBoardCalendarDropId,
  resolveCalendarTaskDropUpdate,
} from './board-calendar-dnd-utils';
import {
  BOARD_CALENDAR_LAYOUT_MODES,
  BOARD_CALENDAR_MAX_VISIBLE,
  BOARD_CALENDAR_WEEKDAY_LABELS_FULL,
  DEFAULT_BOARD_CALENDAR_DATE_FIELD,
  DEFAULT_BOARD_CALENDAR_LAYOUT_MODE,
  groupBoardTasksByCalendarDate,
  getBoardTaskTimedPlacement,
  normalizeBoardCalendarLayoutMode,
} from './board-calendar-utils';

function boardCalendarCollisionDetection(args) {
  const pointerCollisions = pointerWithin(args);
  const pointerDropCollisions = pointerCollisions.filter((collision) =>
    Boolean(parseBoardCalendarDropId(collision.id)),
  );

  if (pointerDropCollisions.length > 0) {
    return pointerDropCollisions;
  }

  const rectCollisions = rectIntersection(args);
  const rectDropCollisions = rectCollisions.filter((collision) =>
    Boolean(parseBoardCalendarDropId(collision.id)),
  );

  if (rectDropCollisions.length > 0) {
    return rectDropCollisions;
  }

  return pointerCollisions;
}

function taskItemKey(task, index) {
  return `${task.id}-${index}`;
}

function CalendarDayCell({
  date,
  isCurrentMonth,
  tasks = [],
  onTaskClick,
  statusGroups,
  allStatusGroups,
  isCreateOpen = false,
  isAnchorTarget = false,
  onRequestCreate,
  openTaskMenuId = null,
  onTaskMenuOpen,
  onTaskMenuClose,
  taskMenuProps = null,
  minCellHeight = 120,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isCurrentDay = isToday(date);
  const dateKey = format(date, 'yyyy-MM-dd');
  const dayLabel = format(date, 'd');
  const isLastOfMonth = date.getDate() === endOfMonth(date).getDate();
  const displayDate = isLastOfMonth ? format(date, 'd MMM').toUpperCase() : dayLabel;

  const hasOverflow = tasks.length > BOARD_CALENDAR_MAX_VISIBLE;
  const moreCount = tasks.length - BOARD_CALENDAR_MAX_VISIBLE;
  const displayedTasks =
    isExpanded || !hasOverflow ? tasks : tasks.slice(0, BOARD_CALENDAR_MAX_VISIBLE);

  return (
    <BoardCalendarDropZone
      zone='month'
      dateKey={dateKey}
      className={cn(
        'group relative flex min-h-[120px] flex-col overflow-hidden border-b border-r border-stroke-soft-200 bg-bg-white-0',
        isCurrentDay && 'border-t-2 border-t-primary-base',
        (isCreateOpen || isExpanded) && 'z-10',
      )}
      style={{ minHeight: minCellHeight }}
      data-date={dateKey}
    >
      {isAnchorTarget ? (
        <Popover.Anchor asChild>
          <div className='pointer-events-none absolute inset-0' aria-hidden />
        </Popover.Anchor>
      ) : null}

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-1 overflow-hidden p-2 pb-1',
          isExpanded && 'overflow-y-auto overscroll-contain',
        )}
      >
        {displayedTasks.map((task, index) => (
          <BoardCalendarTaskRow
            key={taskItemKey(task, index)}
            task={task}
            statusGroups={statusGroups}
            allStatusGroups={allStatusGroups}
            onTaskClick={onTaskClick}
            isMenuOpen={openTaskMenuId === task.id}
            onMenuOpen={onTaskMenuOpen}
            onMenuClose={onTaskMenuClose}
            taskMenuProps={taskMenuProps}
          />
        ))}
      </div>

      <div className='flex shrink-0 items-center justify-end gap-2 px-1.5 pb-1.5'>
        {hasOverflow && !isExpanded ? (
          <button
            type='button'
            className='label-xsmall px-0 py-0.5 uppercase tracking-wide text-text-soft-400 transition hover:text-text-sub-600'
            onClick={(event) => {
              event.stopPropagation();
              setIsExpanded(true);
            }}
          >
            + {moreCount} MORE
          </button>
        ) : null}

        {hasOverflow && isExpanded ? (
          <button
            type='button'
            className='label-xsmall px-0 py-0.5 uppercase tracking-wide text-text-soft-400 transition hover:text-text-sub-600'
            onClick={(event) => {
              event.stopPropagation();
              setIsExpanded(false);
            }}
          >
            LESS
          </button>
        ) : null}

        <button
          type='button'
          aria-label={`Create task on ${format(date, 'MMMM d, yyyy')}`}
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded bg-primary-base text-white shadow-[0px_1px_2px_0px_rgba(15,23,42,0.12)] transition',
            'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
            isCreateOpen && 'opacity-100',
          )}
          onClick={(event) => {
            event.stopPropagation();
            onRequestCreate?.(dateKey);
          }}
        >
          <RiAddLine size={14} />
        </button>

        <span
          className={cn(
            'text-label-sm shrink-0 tabular-nums',
            !isCurrentMonth && 'text-text-disabled-300',
            isCurrentMonth && 'text-text-sub-600',
            isCurrentDay && 'font-semibold text-primary-base',
          )}
        >
          {displayDate}
        </span>
      </div>
    </BoardCalendarDropZone>
  );
}

export default function BoardCalendarGrid({
  anchorDate,
  layoutMode = DEFAULT_BOARD_CALENDAR_LAYOUT_MODE,
  tasks = [],
  dateField = DEFAULT_BOARD_CALENDAR_DATE_FIELD,
  statusGroups = [],
  allStatusGroups = [],
  className,
  onTaskClick,
  isLoading = false,
  error = null,
  onRetry,
  renderCreateTask,
  onTaskCreated,
  positionBoundaryRef,
  openTaskMenuId = null,
  onTaskMenuOpen,
  onTaskMenuClose,
  taskMenuProps = null,
  onTaskDateDrop,
}) {
  const viewportRef = useRef(null);
  const [viewportEl, setViewportEl] = useState(null);
  const [activeDragTask, setActiveDragTask] = useState(null);
  const setViewportRef = useCallback((node) => {
    viewportRef.current = node;
    setViewportEl(node);
  }, []);
  const [openCreateDateKey, setOpenCreateDateKey] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragStart = useCallback((event) => {
    setActiveDragTask(event.active.data.current?.task ?? null);
  }, []);

  const handleDragEnd = useCallback(
    async (event) => {
      setActiveDragTask(null);

      const { active, over } = event;

      if (!over || !onTaskDateDrop) {
        return;
      }

      const dropTarget = parseBoardCalendarDropId(over.id);

      if (!dropTarget) {
        return;
      }

      const task = active.data.current?.task;

      if (!task) {
        return;
      }

      const update = resolveCalendarTaskDropUpdate({ task, dropTarget, dateField });

      if (!update) {
        return;
      }

      await onTaskDateDrop(task, update);
    },
    [dateField, onTaskDateDrop],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragTask(null);
  }, []);
  const resolvedLayoutMode = normalizeBoardCalendarLayoutMode(layoutMode);
  const displayAnchor = anchorDate instanceof Date ? anchorDate : new Date(anchorDate);
  const displayMonth = startOfMonth(displayAnchor);
  const byDate = useMemo(() => groupBoardTasksByCalendarDate(tasks, dateField), [dateField, tasks]);

  const visibleDays = useMemo(() => {
    if (resolvedLayoutMode === BOARD_CALENDAR_LAYOUT_MODES.DAY) {
      return [startOfDay(displayAnchor)];
    }

    if (resolvedLayoutMode === BOARD_CALENDAR_LAYOUT_MODES.WEEK) {
      const weekStart = startOfWeek(displayAnchor, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    }

    const monthStart = startOfMonth(displayAnchor);
    const monthEnd = endOfMonth(displayAnchor);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const totalSlots = 42;

    return days.length >= totalSlots
      ? days.slice(0, totalSlots)
      : Array.from({ length: totalSlots }, (_, index) =>
          index < days.length ? days[index] : addDays(calendarEnd, index - days.length + 1),
        );
  }, [displayAnchor, resolvedLayoutMode]);

  const weekdayLabels =
    resolvedLayoutMode === BOARD_CALENDAR_LAYOUT_MODES.DAY
      ? [BOARD_CALENDAR_WEEKDAY_LABELS_FULL[displayAnchor.getDay()]]
      : BOARD_CALENDAR_WEEKDAY_LABELS_FULL;

  const gridColumnClass =
    resolvedLayoutMode === BOARD_CALENDAR_LAYOUT_MODES.DAY ? 'grid-cols-1' : 'grid-cols-7';

  const cellMinHeight =
    resolvedLayoutMode === BOARD_CALENDAR_LAYOUT_MODES.DAY
      ? 480
      : resolvedLayoutMode === BOARD_CALENDAR_LAYOUT_MODES.WEEK
        ? 280
        : 120;

  const openCreateDate = useMemo(() => {
    if (!openCreateDateKey) {
      return null;
    }

    return visibleDays.find((date) => format(date, 'yyyy-MM-dd') === openCreateDateKey) ?? null;
  }, [openCreateDateKey, visibleDays]);

  const handleNavigateCreateDay = (delta) => {
    if (!openCreateDateKey) {
      return;
    }

    const currentDate = parse(openCreateDateKey, 'yyyy-MM-dd', new Date());
    setOpenCreateDateKey(format(addDays(currentDate, delta), 'yyyy-MM-dd'));
  };

  const collisionBoundary = useMemo(() => {
    if (!openCreateDateKey) {
      return undefined;
    }

    return positionBoundaryRef?.current ?? viewportEl ?? undefined;
  }, [openCreateDateKey, positionBoundaryRef, viewportEl]);

  if (error) {
    return (
      <div
        className={cn('flex w-full flex-col items-center justify-center gap-3 py-12', className)}
      >
        <p className='text-paragraph-sm text-text-sub-600'>{error}</p>
        {onRetry ? (
          <Button.Root variant='neutral' mode='stroke' size='small' onClick={onRetry}>
            Retry
          </Button.Root>
        ) : null}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('flex w-full flex-col items-center justify-center py-12', className)}>
        <p className='text-paragraph-sm text-text-sub-600'>Loading calendar...</p>
      </div>
    );
  }

  const isTimeGridLayout =
    resolvedLayoutMode === BOARD_CALENDAR_LAYOUT_MODES.DAY ||
    resolvedLayoutMode === BOARD_CALENDAR_LAYOUT_MODES.WEEK;

  const dragOverlay = activeDragTask ? (
    <DragOverlay dropAnimation={null}>
      <BoardCalendarTaskRow
        task={activeDragTask}
        statusGroups={statusGroups}
        allStatusGroups={allStatusGroups}
        isDragOverlay
        compact={isTimeGridLayout && Boolean(getBoardTaskTimedPlacement(activeDragTask, dateField))}
      />
    </DragOverlay>
  ) : null;

  if (isTimeGridLayout) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={boardCalendarCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <BoardCalendarTimeGrid
          anchorDate={displayAnchor}
          layoutMode={resolvedLayoutMode}
          tasks={tasks}
          dateField={dateField}
          statusGroups={statusGroups}
          allStatusGroups={allStatusGroups}
          className={cn('h-full', className)}
          onTaskClick={onTaskClick}
          renderCreateTask={renderCreateTask}
          onTaskCreated={onTaskCreated}
          positionBoundaryRef={positionBoundaryRef}
          openTaskMenuId={openTaskMenuId}
          onTaskMenuOpen={onTaskMenuOpen}
          onTaskMenuClose={onTaskMenuClose}
          taskMenuProps={taskMenuProps}
        />
        {dragOverlay}
      </DndContext>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={boardCalendarCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div ref={setViewportRef} className={cn('relative flex w-full flex-col', className)}>
        <div className={cn('grid border-t border-stroke-soft-200 bg-bg-weak-50', gridColumnClass)}>
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className='text-label-sm flex items-center justify-center border-r border-stroke-soft-200 py-2 font-medium text-text-soft-400 last:border-r-0'
            >
              {label}
            </div>
          ))}
        </div>

        <Popover.Root
          open={Boolean(openCreateDateKey)}
          modal={false}
          onOpenChange={(open) => {
            if (!open) {
              setOpenCreateDateKey(null);
            }
          }}
        >
          <div className={cn('grid flex-1 border-t border-stroke-soft-200', gridColumnClass)}>
            {visibleDays.map((date) => {
              const dateKey = format(date, 'yyyy-MM-dd');

              return (
                <CalendarDayCell
                  key={date.getTime()}
                  date={date}
                  isCurrentMonth={isSameMonth(date, displayMonth)}
                  tasks={byDate.get(dateKey) || []}
                  onTaskClick={onTaskClick}
                  statusGroups={statusGroups}
                  allStatusGroups={allStatusGroups}
                  isCreateOpen={openCreateDateKey === dateKey}
                  isAnchorTarget={openCreateDateKey === dateKey}
                  onRequestCreate={setOpenCreateDateKey}
                  openTaskMenuId={openTaskMenuId}
                  onTaskMenuOpen={onTaskMenuOpen}
                  onTaskMenuClose={onTaskMenuClose}
                  taskMenuProps={taskMenuProps}
                  minCellHeight={cellMinHeight}
                />
              );
            })}
          </div>

          {openCreateDateKey && openCreateDate && renderCreateTask ? (
            <Popover.Content
              align='center'
              side='bottom'
              sideOffset={8}
              collisionPadding={24}
              collisionBoundary={collisionBoundary ?? undefined}
              showArrow={false}
              unstyled
              portalled={false}
              disableAnimation
              className='z-[60] w-[min(520px,calc(100%-32px))] border-0 bg-transparent p-0 shadow-none'
              onOpenAutoFocus={(event) => event.preventDefault()}
            >
              {renderCreateTask({
                date: openCreateDate,
                dateKey: openCreateDateKey,
                onClose: () => setOpenCreateDateKey(null),
                onCreated: () => {
                  setOpenCreateDateKey(null);
                  onTaskCreated?.();
                },
                onNavigateDay: handleNavigateCreateDay,
              })}
            </Popover.Content>
          ) : null}
        </Popover.Root>
      </div>
      {dragOverlay}
    </DndContext>
  );
}
