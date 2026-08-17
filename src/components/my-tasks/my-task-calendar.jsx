import React, { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addDays,
  format,
  isSameMonth,
  isToday,
} from 'date-fns';
import { cn } from '@/utils/cn';
import * as Popover from '@/components/ui/popover';
import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';
import { RiTaskLine } from 'react-icons/ri';
import {
  MY_TASK_CALENDAR_WEEKDAY_LABELS,
  MY_TASK_CALENDAR_MAX_VISIBLE,
  MY_TASK_CALENDAR_LABEL_MAX_LENGTH,
  getCalendarTaskDateTypeStyle,
} from '@/components/my-tasks/my-task-constants';

function tasksByDate(tasks, dateFields = ['due_date']) {
  const map = new Map();
  const fields = Array.isArray(dateFields) && dateFields.length > 0 ? dateFields : ['due_date'];

  for (const task of tasks || []) {
    for (const field of fields) {
      const d = task[field];
      if (!d) continue;
      const key = typeof d === 'string' ? d.slice(0, 10) : format(d, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      const list = map.get(key);
      const entry = { ...task, date_type: field };
      if (!list.some((item) => item.name === entry.name && item.date_type === entry.date_type)) {
        list.push(entry);
      }
    }
  }
  return map;
}

function truncateLabel(title) {
  if (!title) return '';
  return title.length > MY_TASK_CALENDAR_LABEL_MAX_LENGTH
    ? `${title.slice(0, MY_TASK_CALENDAR_LABEL_MAX_LENGTH - 3)}...`
    : title;
}

function taskItemKey(task, index) {
  return task.date_type ? `${task.name}-${task.date_type}-${index}` : `${task.name}-${index}`;
}

const CalendarDayCell = ({ date, isCurrentMonth, tasks = [], className, onTaskClick }) => {
  const isCurrentDay = isToday(date);
  const dateKey = format(date, 'yyyy-MM-dd');
  const dayLabel = format(date, 'd');
  const isLastOfMonth = date.getDate() === endOfMonth(date).getDate();
  const displayDate = isLastOfMonth ? format(date, 'd MMM').toUpperCase() : dayLabel;

  const visible = tasks.slice(0, MY_TASK_CALENDAR_MAX_VISIBLE);
  const moreCount = tasks.length - MY_TASK_CALENDAR_MAX_VISIBLE;

  return (
    <div
      className={cn('flex flex-col shrink-0 overflow-hidden', className)}
      style={{
        display: 'flex',
        height: '120px',
        padding: '8px',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        alignSelf: 'stretch',
        borderRight: '1px solid var(--color-stroke-soft-200)',
        borderBottom: '1px solid var(--color-stroke-soft-200)',
        background: 'var(--color-bg-white-0)',
      }}
      data-date={dateKey}
    >
      <span
        className={cn(
          'text-label-sm w-full text-left flex items-center gap-2',
          !isCurrentMonth && 'text-[var(--color-text-disabled-300)]',
          isCurrentMonth && 'text-[var(--color-text-sub-600)]',
          isCurrentDay && 'font-semibold text-primary-base',
        )}
      >
        {isCurrentDay && (
          <div className='h-full border-r rounded-r-full border-2 gap-2 border-primary-base border-solid' />
        )}
        {displayDate}
      </span>
      <div className='flex flex-col gap-1.5 w-full min-h-0 overflow-hidden items-stretch'>
        {visible.map((task, index) => {
          const chipStyle = getCalendarTaskDateTypeStyle(task?.date_type);
          return (
            <Tooltip.Root key={taskItemKey(task, index)}>
              <Tooltip.Trigger asChild>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='ghost'
                  size='xxsmall'
                  className='rounded px-2.5 py-1 truncate label-xsmall w-full justify-start hover:opacity-90'
                  style={{
                    background: chipStyle.background,
                    color: chipStyle.textColor,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskClick?.(task);
                  }}
                >
                  {truncateLabel(task.title)}
                </Button.Root>
              </Tooltip.Trigger>
              <Tooltip.Content
                side='right'
                variant='light'
                size='small'
                className='flex items-center gap-2'
              >
                <RiTaskLine size={16} color={chipStyle.accentColor} className='shrink-0' />
                <span className='text-text-main-900'>{task.title}</span>
              </Tooltip.Content>
            </Tooltip.Root>
          );
        })}
        {moreCount > 0 && (
          <Popover.Root>
            <Popover.Trigger asChild>
              <div className='label-xsmall bg-[#F6F8FA] text-[var(--color-text-sub-600)] text-center px-2.5 py-1 rounded-lg cursor-pointer'>
                +{moreCount} MORE
              </div>
            </Popover.Trigger>
            <Popover.Content className='pl-1.5 flex flex-col max-h-80 overflow-y-auto overscroll-contain'>
              {tasks.map((task, index) => {
                const chipStyle = getCalendarTaskDateTypeStyle(task?.date_type);
                return (
                  <Button.Root
                    key={taskItemKey(task, index)}
                    type='button'
                    variant='neutral'
                    mode='ghost'
                    size='small'
                    className='w-full justify-start gap-1.5 paragraph-small text-[var(--color-text-sub-600)] px-2 py-1.5 rounded'
                    onClick={() => onTaskClick?.(task)}
                  >
                    <RiTaskLine size={16} color={chipStyle.accentColor} className='shrink-0' />
                    {task.title}
                  </Button.Root>
                );
              })}
            </Popover.Content>
          </Popover.Root>
        )}
      </div>
    </div>
  );
};

const MyTaskCalendar = ({
  month,
  tasks,
  dateFields = ['due_date'],
  className,
  onTaskClick,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  const displayMonth = month instanceof Date ? month : new Date(month);
  const byDate = useMemo(() => tasksByDate(tasks, dateFields), [tasks, dateFields]);

  const monthStart = startOfMonth(displayMonth);
  const monthEnd = endOfMonth(displayMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const totalSlots = 42;
  const paddedDays =
    days.length >= totalSlots
      ? days.slice(0, totalSlots)
      : Array.from({ length: totalSlots }, (_, i) =>
          i < days.length ? days[i] : addDays(calendarEnd, i - days.length + 1),
        );

  if (error) {
    return (
      <div
        className={cn('flex flex-col w-full items-center justify-center gap-3 py-12', className)}
      >
        <p className='text-paragraph-sm text-[var(--color-text-sub-600)]'>{error}</p>
        {onRetry && (
          <Button.Root variant='neutral' mode='stroke' size='small' onClick={onRetry}>
            Retry
          </Button.Root>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('flex flex-col w-full items-center justify-center py-12', className)}>
        <p className='text-paragraph-sm text-[var(--color-text-sub-600)]'>Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col w-full', className)}>
      <div className='grid grid-cols-7 border-t border-[var(--color-stroke-soft-200)] bg-[var(--color-bg-weak-50)]'>
        {MY_TASK_CALENDAR_WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className='flex items-center justify-center py-2 text-label-sm font-medium text-[var(--color-text-soft-400)] uppercase border-r border-[var(--color-stroke-soft-200)] last:border-r-0'
          >
            {label}
          </div>
        ))}
      </div>
      <div className='grid grid-cols-7 flex-1 border-t border-[var(--color-stroke-soft-200)]'>
        {paddedDays.map((date) => (
          <CalendarDayCell
            key={date.getTime()}
            date={date}
            isCurrentMonth={isSameMonth(date, displayMonth)}
            tasks={byDate.get(format(date, 'yyyy-MM-dd')) || []}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </div>
  );
};

export default MyTaskCalendar;
