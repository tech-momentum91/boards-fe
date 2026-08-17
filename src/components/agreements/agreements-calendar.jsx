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
import { RiFileListFill } from 'react-icons/ri';
import {
  CALENDAR_WEEKDAY_LABELS,
  CALENDAR_MAX_VISIBLE_AGREEMENTS,
  CALENDAR_AGREEMENT_LABEL_MAX_LENGTH,
  getCalendarAgreementDateTypeStyle,
} from '@/components/agreements/constants';

/**
 * Build a map of date string (yyyy-MM-dd) -> list of agreements for that date.
 * Supports one or more date fields (e.g. agreement_start_date, rent_start_date).
 */
function agreementsByDate(agreements, dateFields = ['agreement_start_date']) {
  const map = new Map();
  const fields =
    Array.isArray(dateFields) && dateFields.length > 0 ? dateFields : ['agreement_start_date'];

  for (const ag of agreements || []) {
    for (const field of fields) {
      const d = ag[field];
      if (!d) continue;
      const key = typeof d === 'string' ? d.slice(0, 10) : format(d, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      const list = map.get(key);
      // Avoid duplicate entries for the same agreement on the same day.
      if (!list.includes(ag)) {
        list.push(ag);
      }
    }
  }
  return map;
}

function truncateLabel(name) {
  if (!name) return '';
  return name.length > CALENDAR_AGREEMENT_LABEL_MAX_LENGTH
    ? `${name.slice(0, CALENDAR_AGREEMENT_LABEL_MAX_LENGTH - 3)}...`
    : name;
}

/** Unique key for calendar item (same agreement can appear multiple times per date for different date_type). */
function agreementItemKey(ag, index) {
  return ag.date_type ? `${ag.name}-${ag.date_type}-${index}` : `${ag.name}-${index}`;
}

/**
 * Single date cell: date number + agreement chips. Styling per Figma.
 */
const CalendarDayCell = ({
  date,
  isCurrentMonth,
  agreements = [],
  className,
  onAgreementClick,
}) => {
  const isCurrentDay = isToday(date);
  const dateKey = format(date, 'yyyy-MM-dd');
  const dayLabel = format(date, 'd');
  const isFirstOfMonth = date.getDate() === endOfMonth(date).getDate();
  const displayDate = isFirstOfMonth ? format(date, 'd MMM').toUpperCase() : dayLabel;

  const visible = agreements.slice(0, CALENDAR_MAX_VISIBLE_AGREEMENTS);
  const moreCount = agreements.length - CALENDAR_MAX_VISIBLE_AGREEMENTS;

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
          'text-label-sm w-full text-left flex items-center gap-2 ',
          !isCurrentMonth && 'text-[var(--color-text-disabled-300)]',
          isCurrentMonth && 'text-[var(--color-text-sub-600)]',
          isCurrentDay && 'font-semibold text-primary-base',
        )}
      >
        {isCurrentDay && (
          <div className='h-full  border-r rounded-r-full border-2 gap-2 border-primary-base border-solid' />
        )}
        {displayDate}
      </span>
      <div className='flex flex-col  gap-1.5 w-full min-h-0 overflow-hidden items-stretch'>
        {visible.map((ag, index) => {
          const chipStyle = getCalendarAgreementDateTypeStyle(ag?.date_type);
          return (
            <Tooltip.Root key={agreementItemKey(ag, index)}>
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
                    onAgreementClick?.(ag);
                  }}
                >
                  {truncateLabel(ag.name)}
                </Button.Root>
              </Tooltip.Trigger>
              <Tooltip.Content
                side='right'
                variant='light'
                size='small'
                className='flex items-center gap-2'
              >
                <RiFileListFill size={16} color={chipStyle.accentColor} className='shrink-0' />
                <span className='text-text-main-900'>{ag.name}</span>
              </Tooltip.Content>
            </Tooltip.Root>
          );
        })}
        {moreCount > 0 && (
          // <div className="label-xsmall bg-[#F6F8FA] text-[var(--color-text-sub-600)] text-center px-2.5 py-1 rounded-lg">
          //   +{moreCount} MORE
          // </div>
          <Popover.Root>
            <Popover.Trigger asChild>
              <div className='label-xsmall bg-[#F6F8FA] text-[var(--color-text-sub-600)] text-center px-2.5 py-1 rounded-lg'>
                +{moreCount} MORE
              </div>
            </Popover.Trigger>
            <Popover.Content className='pl-1.5 flex flex-col '>
              {agreements.map((ag, index) => (
                <Button.Root
                  key={agreementItemKey(ag, index)}
                  type='button'
                  variant='neutral'
                  mode='ghost'
                  size='small'
                  className='w-full justify-start gap-1.5 paragraph-small text-[var(--color-text-sub-600)] px-2 py-1.5 rounded'
                  onClick={() => onAgreementClick?.(ag)}
                >
                  <RiFileListFill
                    size={16}
                    color={getCalendarAgreementDateTypeStyle(ag?.date_type).accentColor}
                    className='shrink-0'
                  />
                  {ag.name}
                </Button.Root>
              ))}
            </Popover.Content>
          </Popover.Root>
        )}
      </div>
    </div>
  );
};

/**
 * Month calendar grid: weekdays row + 6 weeks of days.
 * Agreements are grouped by the given dateFields (e.g. agreement_start_date, rent_start_date, agreement_end_date).
 */
const AgreementsCalendar = ({
  month,
  agreements,
  dateFields = ['agreement_start_date'],
  className,
  onAgreementClick,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  const displayMonth = month instanceof Date ? month : new Date(month);
  const byDate = useMemo(() => agreementsByDate(agreements, dateFields), [agreements, dateFields]);

  const monthStart = startOfMonth(displayMonth);
  const monthEnd = endOfMonth(displayMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Ensure we show 6 rows (42 days) for consistent layout
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
      {/* Weekday headers */}
      <div className='grid grid-cols-7  border-t    border-[var(--color-stroke-soft-200)] bg-[var(--color-bg-weak-50)]'>
        {CALENDAR_WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className='flex  items-center justify-center py-2 text-label-sm font-medium text-[var(--color-text-soft-400)] uppercase border-r border-[var(--color-stroke-soft-200)] last:border-r-0'
          >
            {label}
          </div>
        ))}
      </div>
      {/* 6 rows of 7 days */}
      <div className='grid grid-cols-7 flex-1   border-t border-[var(--color-stroke-soft-200)]'>
        {paddedDays.map((date) => (
          <CalendarDayCell
            key={date.getTime()}
            date={date}
            isCurrentMonth={isSameMonth(date, displayMonth)}
            agreements={byDate.get(format(date, 'yyyy-MM-dd')) || []}
            onAgreementClick={onAgreementClick}
          />
        ))}
      </div>
    </div>
  );
};

export default AgreementsCalendar;
