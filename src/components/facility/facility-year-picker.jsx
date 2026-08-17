import React, { useMemo, useState } from 'react';
import {
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarLine,
} from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import { formatDateToISO, getPreviousYearDate, getNextYearDate } from '@/utils/date-utils';

/**
 * Grid-based year picker (same style as AgreementsMonthYearPicker year view).
 */
const FacilityYearPicker = ({ value, onSelect, onCancel }) => {
  const currentYear = value instanceof Date ? value.getFullYear() : new Date().getFullYear();
  const RANGE_SIZE = 12;
  const BASE = 2020;

  const [pendingYear, setPendingYear] = useState(currentYear);
  const [rangeStart, setRangeStart] = useState(
    () => Math.floor((currentYear - BASE) / RANGE_SIZE) * RANGE_SIZE + BASE,
  );

  const yearsInRange = Array.from({ length: RANGE_SIZE }, (_, i) => rangeStart + i);
  const rangeLabel = `${yearsInRange[0]} – ${yearsInRange[yearsInRange.length - 1]}`;

  return (
    <div className='flex flex-col min-w-[280px]'>
      <div className='flex items-center justify-between rounded-lg bg-[var(--color-bg-weak-50)] h-9 px-2 gap-2 mb-3'>
        <Button.Root
          type='button'
          variant='neutral'
          mode='ghost'
          size='xxsmall'
          className='size-8 min-w-0 p-0'
          onClick={() => setRangeStart((s) => Math.max(BASE - RANGE_SIZE, s - RANGE_SIZE))}
          aria-label='Previous year range'
        >
          <Button.Icon as={RiArrowLeftSLine} className='size-5' />
        </Button.Root>
        <span className='text-label-sm font-medium text-[var(--color-text-strong-950)]'>
          {rangeLabel}
        </span>
        <Button.Root
          type='button'
          variant='neutral'
          mode='ghost'
          size='xxsmall'
          className='size-8 min-w-0 p-0'
          onClick={() => setRangeStart((s) => s + RANGE_SIZE)}
          aria-label='Next year range'
        >
          <Button.Icon as={RiArrowRightSLine} className='size-5' />
        </Button.Root>
      </div>

      <div className='grid grid-cols-4 gap-1 mb-4'>
        {yearsInRange.map((y) => (
          <Button.Root
            key={y}
            type='button'
            variant={pendingYear === y ? 'primary' : 'neutral'}
            mode='filled'
            size='xsmall'
            className={cn(
              'h-10 px-0 rounded-lg text-label-sm font-medium',
              pendingYear !== y &&
                'bg-transparent hover:bg-[var(--color-bg-weak-50)] text-[var(--color-text-strong-950)]',
            )}
            onClick={() => setPendingYear(y)}
          >
            {y}
          </Button.Root>
        ))}
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
          onClick={() => onSelect?.(pendingYear)}
        >
          Apply
        </Button.Root>
      </div>
    </div>
  );
};

/**
 * Year control for facility list filters (for annual tracking mode).
 */
const FacilityListYearToolbar = ({ value, onYearChange, className }) => {
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const displayDate = value ? new Date(value) : new Date();
  const year = displayDate.getFullYear();

  const handlePreviousYear = () => {
    const prevYear = getPreviousYearDate(displayDate);
    if (prevYear) onYearChange?.(prevYear);
  };

  const handleNextYear = () => {
    const nextYear = getNextYearDate(displayDate);
    if (nextYear) onYearChange?.(nextYear);
  };

  return (
    <div className={cn('flex items-center gap-0 shrink-0', className)}>
      <ButtonGroup.Root size='small' className='shrink-0'>
        <Popover.Root open={yearPickerOpen} onOpenChange={setYearPickerOpen}>
          <Popover.Trigger asChild>
            <ButtonGroup.Item
              type='button'
              className='min-w-[140px] justify-center gap-1 px-3'
              aria-label='Select year'
            >
              <RiCalendarLine className='size-5 shrink-0 text-[var(--color-text-sub-600)]' />
              <span className='text-label-sm text-[var(--color-text-strong-950)]'>{year}</span>
              <RiArrowDownSLine className='size-5 shrink-0 text-[var(--color-text-sub-600)]' />
            </ButtonGroup.Item>
          </Popover.Trigger>
          <Popover.Content className='p-4' align='start' side='bottom' sideOffset={8}>
            <FacilityYearPicker
              value={displayDate}
              onSelect={(selectedYear) => {
                onYearChange?.(formatDateToISO(new Date(selectedYear, 0, 1)));
                setYearPickerOpen(false);
              }}
              onCancel={() => setYearPickerOpen(false)}
            />
          </Popover.Content>
        </Popover.Root>
        <ButtonGroup.Item type='button' onClick={handlePreviousYear} aria-label='Previous year'>
          <ButtonGroup.Icon as={RiArrowLeftSLine} />
        </ButtonGroup.Item>
        <ButtonGroup.Item type='button' onClick={handleNextYear} aria-label='Next year'>
          <ButtonGroup.Icon as={RiArrowRightSLine} />
        </ButtonGroup.Item>
      </ButtonGroup.Root>
    </div>
  );
};

export { FacilityYearPicker, FacilityListYearToolbar };
