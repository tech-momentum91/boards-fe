import React, { useMemo, useState } from 'react';
import {
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarLine,
} from 'react-icons/ri';
import { addMonths, format, startOfMonth, subMonths } from 'date-fns';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import { formatDateToISO, getPreviousWeekDate, getNextWeekDate } from '@/utils/date-utils';

const getStaticWeekBandStartDay = (dayOfMonth) =>
  dayOfMonth < 8 ? 1 : dayOfMonth < 15 ? 8 : dayOfMonth < 22 ? 15 : 22;

const getStaticWeekBandEndDate = (weekStartDate) => {
  const start = new Date(weekStartDate);
  if (Number.isNaN(start.getTime())) return new Date();
  const startDay = start.getDate();
  if (startDay !== 22) {
    const end = new Date(start);
    end.setDate(startDay + 6);
    return end;
  }
  return new Date(start.getFullYear(), start.getMonth() + 1, 0);
};

export const normalizeFacilityWeekStart = (value) => {
  const source = value ? new Date(value) : new Date();
  if (Number.isNaN(source.getTime())) return '';
  const startDay = getStaticWeekBandStartDay(source.getDate());
  return formatDateToISO(new Date(source.getFullYear(), source.getMonth(), startDay));
};

/**
 * Calendar-grid week picker — 4 fixed divisions per month (1–7, 8–14, 15–21, 22–end).
 */
const FacilityWeekPicker = ({ value, onSelect, onCancel }) => {
  const parsedValue = value ? new Date(value) : new Date();
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(parsedValue));

  const [pendingWeekStart, setPendingWeekStart] = useState(() =>
    normalizeFacilityWeekStart(parsedValue),
  );

  // Build 4 weeks for the displayed month.
  const weeks = useMemo(() => {
    const yr = displayMonth.getFullYear();
    const mo = displayMonth.getMonth();
    const daysInMonth = new Date(yr, mo + 1, 0).getDate();
    return [1, 8, 15, 22].map((startDay, idx) => {
      const endDay = idx < 3 ? startDay + 6 : daysInMonth;
      return {
        weekStart: formatDateToISO(new Date(yr, mo, startDay)),
        days: Array.from({ length: endDay - startDay + 1 }, (_, i) => startDay + i),
      };
    });
  }, [displayMonth]);

  return (
    <div className='flex flex-col min-w-[280px]'>
      <div className='flex items-center justify-between rounded-lg bg-[var(--color-bg-weak-50)] h-9 px-2 gap-2 mb-3'>
        <Button.Root
          type='button'
          variant='neutral'
          mode='ghost'
          size='xxsmall'
          className='size-8 min-w-0 p-0'
          onClick={() => setDisplayMonth(startOfMonth(subMonths(displayMonth, 1)))}
        >
          <Button.Icon as={RiArrowLeftSLine} className='size-5' />
        </Button.Root>
        <span className='text-label-sm font-medium text-[var(--color-text-strong-950)]'>
          {format(displayMonth, 'MMMM yyyy')}
        </span>
        <Button.Root
          type='button'
          variant='neutral'
          mode='ghost'
          size='xxsmall'
          className='size-8 min-w-0 p-0'
          onClick={() => setDisplayMonth(startOfMonth(addMonths(displayMonth, 1)))}
        >
          <Button.Icon as={RiArrowRightSLine} className='size-5' />
        </Button.Root>
      </div>

      <div className='flex flex-col gap-1 mb-4'>
        {weeks.map((week) => {
          const isSelected = pendingWeekStart === week.weekStart;
          return (
            <div
              key={week.weekStart}
              className={cn(
                'grid grid-cols-7 rounded-lg cursor-pointer px-1 py-0.5',
                isSelected ? 'bg-primary-base' : 'hover:bg-[var(--color-bg-weak-50)]',
              )}
              onClick={() => setPendingWeekStart(week.weekStart)}
            >
              {week.days.map((day) => (
                <div
                  key={day}
                  className={cn(
                    'flex items-center justify-center h-8 text-label-sm',
                    isSelected ? 'text-white' : 'text-[var(--color-text-strong-950)]',
                  )}
                >
                  {day}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className='flex items-center gap-2 pt-2 border-t border-[var(--color-stroke-soft-200)]'>
        <Button.Root
          variant='neutral'
          mode='stroke'
          size='small'
          className='flex-1'
          onClick={onCancel}
        >
          Cancel
        </Button.Root>
        <Button.Root
          variant='primary'
          mode='filled'
          size='small'
          className='flex-1'
          onClick={() => onSelect?.(pendingWeekStart)}
        >
          Apply
        </Button.Root>
      </div>
    </div>
  );
};

/**
 * Week control for facility list filters (for weekly tracking mode).
 */
const FacilityListWeekToolbar = ({ value, onWeekChange, className }) => {
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const normalizedValue = normalizeFacilityWeekStart(value);
  const displayDate = normalizedValue ? new Date(normalizedValue) : new Date();

  const handlePreviousWeek = () => {
    const prevWeek = getPreviousWeekDate(displayDate);
    if (prevWeek) onWeekChange?.(prevWeek);
  };

  const handleNextWeek = () => {
    const nextWeek = getNextWeekDate(displayDate);
    if (nextWeek) onWeekChange?.(nextWeek);
  };

  const weekStartDate = new Date(displayDate);
  const weekEndDate = getStaticWeekBandEndDate(weekStartDate);

  return (
    <div className={cn('flex items-center gap-0 shrink-0', className)}>
      <ButtonGroup.Root size='small' className='shrink-0'>
        <Popover.Root open={weekPickerOpen} onOpenChange={setWeekPickerOpen}>
          <Popover.Trigger asChild>
            <ButtonGroup.Item
              type='button'
              className='min-w-[140px] justify-center gap-1 px-3'
              aria-label='Select week'
            >
              <RiCalendarLine className='size-5 shrink-0 text-[var(--color-text-sub-600)]' />
              <span className='text-label-sm text-[var(--color-text-strong-950)]'>
                {format(weekStartDate, 'MMM d')} - {format(weekEndDate, 'd')}
              </span>
              <RiArrowDownSLine className='size-5 shrink-0 text-[var(--color-text-sub-600)]' />
            </ButtonGroup.Item>
          </Popover.Trigger>
          <Popover.Content className='p-4' align='start' side='bottom' sideOffset={8}>
            <FacilityWeekPicker
              value={value}
              onSelect={(weekKey) => {
                onWeekChange?.(weekKey);
                setWeekPickerOpen(false);
              }}
              onCancel={() => setWeekPickerOpen(false)}
            />
          </Popover.Content>
        </Popover.Root>
        <ButtonGroup.Item type='button' onClick={handlePreviousWeek} aria-label='Previous week'>
          <ButtonGroup.Icon as={RiArrowLeftSLine} />
        </ButtonGroup.Item>
        <ButtonGroup.Item type='button' onClick={handleNextWeek} aria-label='Next week'>
          <ButtonGroup.Icon as={RiArrowRightSLine} />
        </ButtonGroup.Item>
      </ButtonGroup.Root>
    </div>
  );
};

export { FacilityWeekPicker, FacilityListWeekToolbar };
