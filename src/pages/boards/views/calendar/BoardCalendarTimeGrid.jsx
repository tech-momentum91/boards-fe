import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays,
  eachDayOfInterval,
  format,
  getHours,
  getMinutes,
  isSameDay,
  isToday,
  parse,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { RiAddLine } from 'react-icons/ri';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import BoardCalendarTaskRow from './BoardCalendarTaskRow';
import BoardCalendarDropZone from './BoardCalendarDropZone';
import {
  BOARD_CALENDAR_LAYOUT_MODES,
  BOARD_CALENDAR_TIME_GRID,
  DEFAULT_BOARD_CALENDAR_DATE_FIELD,
  formatBoardCalendarHourLabel,
  getBoardCalendarDayHeaderLabel,
  getBoardCalendarHourLabels,
  isBoardCalendarWeekendDay,
  normalizeBoardCalendarLayoutMode,
  getBoardCalendarCreateStartDate,
  layoutOverlappingTimedTasks,
  splitBoardTasksForTimeGrid,
} from './board-calendar-utils';

function taskItemKey(task, index) {
  return `${task.id}-${index}`;
}

export default function BoardCalendarTimeGrid({
  anchorDate,
  layoutMode,
  tasks = [],
  dateField = DEFAULT_BOARD_CALENDAR_DATE_FIELD,
  statusGroups = [],
  allStatusGroups = [],
  className,
  onTaskClick,
  renderCreateTask,
  onTaskCreated,
  positionBoundaryRef,
  openTaskMenuId = null,
  onTaskMenuOpen,
  onTaskMenuClose,
  taskMenuProps = null,
}) {
  const scrollRef = useRef(null);
  const fixedHorizontalRef = useRef(null);
  const isSyncingScrollRef = useRef(false);
  const [viewportEl, setViewportEl] = useState(null);
  const setScrollRef = useCallback((node) => {
    scrollRef.current = node;
    setViewportEl(node);
  }, []);
  const [openCreateSlot, setOpenCreateSlot] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const resolvedLayoutMode = normalizeBoardCalendarLayoutMode(layoutMode);
  const isDayView = resolvedLayoutMode === BOARD_CALENDAR_LAYOUT_MODES.DAY;
  const displayAnchor = anchorDate instanceof Date ? anchorDate : new Date(anchorDate);

  const {
    START_HOUR,
    END_HOUR,
    HOUR_HEIGHT,
    TIME_LABEL_WIDTH,
    ALL_DAY_MIN_HEIGHT,
    DAY_HEADER_HEIGHT,
    DAY_COLUMN_MIN_WIDTH,
    ALL_DAY_MAX_HEIGHT,
    TASK_BLOCK_HEIGHT,
  } = BOARD_CALENDAR_TIME_GRID;

  const visibleDays = useMemo(() => {
    if (isDayView) {
      return [startOfDay(displayAnchor)];
    }

    const weekStart = startOfWeek(displayAnchor, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  }, [displayAnchor, isDayView]);

  const dayCount = visibleDays.length;

  const gridTemplateColumns = useMemo(
    () =>
      isDayView
        ? `${TIME_LABEL_WIDTH}px minmax(0, 1fr)`
        : `${TIME_LABEL_WIDTH}px repeat(${dayCount}, minmax(${DAY_COLUMN_MIN_WIDTH}px, 1fr))`,
    [TIME_LABEL_WIDTH, DAY_COLUMN_MIN_WIDTH, dayCount, isDayView],
  );

  const gridMinWidth = useMemo(
    () => (isDayView ? undefined : TIME_LABEL_WIDTH + dayCount * DAY_COLUMN_MIN_WIDTH),
    [TIME_LABEL_WIDTH, DAY_COLUMN_MIN_WIDTH, dayCount, isDayView],
  );

  const gridShellStyle = useMemo(
    () => ({
      display: 'grid',
      width: '100%',
      minWidth: gridMinWidth,
      gridTemplateColumns,
    }),
    [gridMinWidth, gridTemplateColumns],
  );

  const hourLabels = useMemo(
    () => getBoardCalendarHourLabels(START_HOUR, END_HOUR),
    [END_HOUR, START_HOUR],
  );

  const hoursCount = hourLabels.length;
  const gridHeight = hoursCount * HOUR_HEIGHT;

  const { allDayByDate, timedByDate } = useMemo(
    () => splitBoardTasksForTimeGrid(tasks, dateField),
    [dateField, tasks],
  );

  const showCurrentTimeLine = useMemo(() => visibleDays.some((day) => isToday(day)), [visibleDays]);

  const currentTimeTop = useMemo(() => {
    if (!showCurrentTimeLine) {
      return null;
    }

    const hours = getHours(currentTime);
    const minutes = getMinutes(currentTime);

    if (hours < START_HOUR || hours > END_HOUR) {
      return null;
    }

    return (((hours - START_HOUR) * 60 + minutes) / 60) * HOUR_HEIGHT;
  }, [HOUR_HEIGHT, START_HOUR, END_HOUR, currentTime, showCurrentTimeLine]);

  const openCreateDateKey = openCreateSlot?.dateKey ?? null;
  const openCreateHour = openCreateSlot?.hour ?? null;

  const openCreateDate = useMemo(() => {
    if (!openCreateDateKey) {
      return null;
    }

    return visibleDays.find((date) => format(date, 'yyyy-MM-dd') === openCreateDateKey) ?? null;
  }, [openCreateDateKey, visibleDays]);

  const openCreateDefaultStartDate = useMemo(
    () => getBoardCalendarCreateStartDate(openCreateDate, openCreateHour),
    [openCreateDate, openCreateHour],
  );

  const handleNavigateCreateDay = (delta) => {
    if (!openCreateSlot?.dateKey) {
      return;
    }

    const currentDate = parse(openCreateSlot.dateKey, 'yyyy-MM-dd', new Date());
    setOpenCreateSlot({
      ...openCreateSlot,
      dateKey: format(addDays(currentDate, delta), 'yyyy-MM-dd'),
    });
  };

  const collisionBoundary = useMemo(() => {
    if (!openCreateSlot) {
      return undefined;
    }

    return positionBoundaryRef?.current ?? viewportEl ?? undefined;
  }, [openCreateSlot, positionBoundaryRef, viewportEl]);

  const closeCreateTask = useCallback(() => {
    setOpenCreateSlot(null);
  }, []);

  const renderCreateTaskPopover = () =>
    openCreateSlot && openCreateDate && renderCreateTask ? (
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
          defaultStartDate: openCreateDefaultStartDate,
          onClose: closeCreateTask,
          onCreated: () => {
            closeCreateTask();
            onTaskCreated?.();
          },
          onNavigateDay: handleNavigateCreateDay,
        })}
      </Popover.Content>
    ) : null;

  const scrollTargetDate = useMemo(() => {
    const today = startOfDay(new Date());
    return visibleDays.find((day) => isSameDay(day, today)) ?? visibleDays[0];
  }, [visibleDays]);

  const syncHorizontalScroll = useCallback((source, target) => {
    if (!source || !target || isSyncingScrollRef.current) {
      return;
    }

    isSyncingScrollRef.current = true;
    target.scrollLeft = source.scrollLeft;
    window.requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  }, []);

  const handleTimeScroll = useCallback(
    (event) => {
      syncHorizontalScroll(event.currentTarget, fixedHorizontalRef.current);
    },
    [syncHorizontalScroll],
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!scrollRef.current || !isToday(scrollTargetDate)) {
      return;
    }

    const hours = getHours(new Date());
    if (hours < START_HOUR || hours > END_HOUR) {
      return;
    }

    const scrollPosition = Math.max(0, (hours - START_HOUR - 1) * HOUR_HEIGHT);

    window.setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollPosition;
      }
    }, 100);
  }, [HOUR_HEIGHT, START_HOUR, END_HOUR, scrollTargetDate]);

  const renderDayHeaders = () =>
    visibleDays.map((date) => {
      const isCurrentDay = isToday(date);
      const isWeekend = isBoardCalendarWeekendDay(date);

      return (
        <div
          key={date.getTime()}
          className='flex items-center justify-center border-r border-stroke-soft-200 px-2 last:border-r-0'
          style={{ height: DAY_HEADER_HEIGHT }}
        >
          <span
            className={cn(
              'text-label-sm whitespace-nowrap font-medium',
              isCurrentDay && 'text-primary-base',
              !isCurrentDay && isWeekend && 'text-error-base',
              !isCurrentDay && !isWeekend && 'text-text-sub-600',
            )}
          >
            {getBoardCalendarDayHeaderLabel(date, { compact: !isDayView })}
          </span>
        </div>
      );
    });

  const renderAllDayCells = () =>
    visibleDays.map((date) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const allDayTasks = allDayByDate.get(dateKey) || [];

      return (
        <BoardCalendarDropZone
          key={dateKey}
          zone='allday'
          dateKey={dateKey}
          className='group relative flex min-w-0 flex-col gap-1 overflow-y-auto border-r border-stroke-soft-200 p-1.5 last:border-r-0'
          style={{ minHeight: ALL_DAY_MIN_HEIGHT, maxHeight: ALL_DAY_MAX_HEIGHT }}
        >
          {openCreateSlot?.dateKey === dateKey && openCreateSlot?.hour == null ? (
            <Popover.Anchor asChild>
              <div className='pointer-events-none absolute inset-0' aria-hidden />
            </Popover.Anchor>
          ) : null}

          {allDayTasks.map((task, index) => (
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

          <div className='mt-auto flex justify-end'>
            <button
              type='button'
              aria-label={`Create task on ${format(date, 'MMMM d, yyyy')}`}
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded bg-primary-base text-white shadow-[0px_1px_2px_0px_rgba(15,23,42,0.12)] transition',
                'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                openCreateSlot?.dateKey === dateKey &&
                  openCreateSlot?.hour == null &&
                  'opacity-100',
              )}
              onClick={() => setOpenCreateSlot({ dateKey })}
            >
              <RiAddLine size={14} />
            </button>
          </div>
        </BoardCalendarDropZone>
      );
    });

  return (
    <Popover.Root
      open={Boolean(openCreateSlot)}
      modal={false}
      onOpenChange={(open) => {
        if (!open) {
          closeCreateTask();
        }
      }}
    >
      <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)}>
        <div ref={fixedHorizontalRef} className='shrink-0 overflow-x-hidden overflow-y-hidden'>
          <div style={{ minWidth: gridMinWidth, width: '100%' }}>
            <div className='border-b border-stroke-soft-200 bg-bg-white-0' style={gridShellStyle}>
              <div
                className='border-r border-stroke-soft-200 bg-bg-weak-50'
                style={{ height: DAY_HEADER_HEIGHT }}
              />
              {renderDayHeaders()}
            </div>

            <div className='border-b border-stroke-soft-200 bg-bg-white-0' style={gridShellStyle}>
              <div
                className='text-label-sm flex items-center border-r border-stroke-soft-200 bg-bg-weak-50 px-3 text-text-soft-400 whitespace-nowrap'
                style={{ minHeight: ALL_DAY_MIN_HEIGHT }}
              >
                All day
              </div>
              {renderAllDayCells()}
            </div>
          </div>
        </div>

        <div
          ref={setScrollRef}
          className='relative min-h-0 flex-1 overflow-auto'
          onScroll={handleTimeScroll}
        >
          <div style={{ minWidth: gridMinWidth, width: '100%' }}>
            <div style={gridShellStyle}>
              <div
                className='sticky left-0 z-10 border-r border-stroke-soft-200 bg-bg-white-0'
                style={{ height: gridHeight }}
              >
                {hourLabels.map(({ hour, label }) => (
                  <div key={hour} className='relative' style={{ height: HOUR_HEIGHT }}>
                    <span className='text-label-sm absolute -top-2 right-3 whitespace-nowrap text-text-soft-400'>
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {visibleDays.map((date) => {
                const dateKey = format(date, 'yyyy-MM-dd');
                const isCurrentDay = isToday(date);
                const timedTasks = timedByDate.get(dateKey) || [];
                const laidOutTimedTasks = layoutOverlappingTimedTasks(timedTasks);

                return (
                  <div
                    key={dateKey}
                    className='relative border-r border-stroke-soft-200 last:border-r-0'
                    style={{ height: gridHeight }}
                  >
                    {hourLabels.map(({ hour }) => (
                      <BoardCalendarDropZone
                        key={hour}
                        zone='time'
                        dateKey={dateKey}
                        hour={hour}
                        role='button'
                        tabIndex={0}
                        aria-label={`Create task on ${format(date, 'MMMM d, yyyy')} at ${formatBoardCalendarHourLabel(hour)}`}
                        className={cn(
                          'relative border-b border-stroke-soft-200 transition-colors',
                          'cursor-pointer hover:bg-bg-weak-50/80',
                        )}
                        style={{ height: HOUR_HEIGHT }}
                        onClick={() => setOpenCreateSlot({ dateKey, hour })}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setOpenCreateSlot({ dateKey, hour });
                          }
                        }}
                      >
                        {openCreateSlot?.dateKey === dateKey && openCreateSlot?.hour === hour ? (
                          <Popover.Anchor asChild>
                            <div className='pointer-events-none absolute inset-0' aria-hidden />
                          </Popover.Anchor>
                        ) : null}
                      </BoardCalendarDropZone>
                    ))}

                    {laidOutTimedTasks.map(({ task, top, columnIndex, columnCount }, index) => {
                      const horizontalGutter = 4;
                      const columnGap = 2;
                      const columnWidth = `calc((100% - ${horizontalGutter * 2}px - ${columnGap * (columnCount - 1)}px) / ${columnCount})`;
                      const left = `calc(${horizontalGutter}px + ${columnIndex} * (${columnWidth} + ${columnGap}px))`;

                      return (
                        <div
                          key={taskItemKey(task, index)}
                          className='absolute z-[2]'
                          style={{
                            top,
                            left,
                            width: columnWidth,
                            height: TASK_BLOCK_HEIGHT,
                          }}
                        >
                          <BoardCalendarTaskRow
                            task={task}
                            statusGroups={statusGroups}
                            allStatusGroups={allStatusGroups}
                            onTaskClick={onTaskClick}
                            isMenuOpen={openTaskMenuId === task.id}
                            onMenuOpen={onTaskMenuOpen}
                            onMenuClose={onTaskMenuClose}
                            taskMenuProps={taskMenuProps}
                            compact
                            className='h-full'
                          />
                        </div>
                      );
                    })}

                    {isCurrentDay && currentTimeTop != null ? (
                      <div
                        className='pointer-events-none absolute right-0 left-0 z-[3] -translate-y-1/2 border-t-2 border-dashed border-primary-base'
                        style={{ top: currentTimeTop }}
                        aria-hidden
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {renderCreateTaskPopover()}
    </Popover.Root>
  );
}
