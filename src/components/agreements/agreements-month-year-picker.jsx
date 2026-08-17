import React, { useState, useCallback } from 'react';
import { RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';
import { getYear, getMonth, setYear, setMonth, startOfMonth } from 'date-fns';
import * as Button from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { MONTH_ABBREV, YEAR_RANGE_SIZE, YEAR_BASE } from '@/components/agreements/constants';

/**
 * Month + Year picker matching Figma: header with year (click to open year grid),
 * 3x4 month grid, Cancel/Apply. Optional year view: 2025–2036 grid, then back to month.
 */
const AgreementsMonthYearPicker = ({ value, onSelect, onCancel }) => {
  const date = value instanceof Date ? value : new Date(value);
  const [view, setView] = useState('month'); // 'month' | 'year'
  const [yearRangeStart, setYearRangeStart] = useState(() => {
    const y = getYear(date);
    return Math.floor((y - YEAR_BASE) / YEAR_RANGE_SIZE) * YEAR_RANGE_SIZE + YEAR_BASE;
  });
  const [pendingMonth, setPendingMonth] = useState(getMonth(date));
  const [pendingYear, setPendingYear] = useState(getYear(date));

  const yearsInRange = Array.from({ length: YEAR_RANGE_SIZE }, (_, i) => yearRangeStart + i);
  const yearRangeLabel = `${yearsInRange[0]} - ${yearsInRange[yearsInRange.length - 1]}`;

  const handleApply = useCallback(() => {
    const newDate = startOfMonth(setMonth(setYear(new Date(), pendingYear), pendingMonth));
    onSelect?.(newDate);
  }, [pendingMonth, pendingYear, onSelect]);

  const handleMonthClick = (monthIndex) => {
    setPendingMonth(monthIndex);
  };

  const handleYearClick = (y) => {
    setPendingYear(y);
    setYearRangeStart(Math.floor((y - YEAR_BASE) / YEAR_RANGE_SIZE) * YEAR_RANGE_SIZE + YEAR_BASE);
    setView('month');
  };

  const handlePrevYear = () => {
    if (view === 'month') setPendingYear((y) => y - 1);
    else setYearRangeStart((s) => Math.max(YEAR_BASE - YEAR_RANGE_SIZE, s - YEAR_RANGE_SIZE));
  };
  const handleNextYear = () => {
    if (view === 'month') setPendingYear((y) => y + 1);
    else setYearRangeStart((s) => s + YEAR_RANGE_SIZE);
  };

  return (
    <div className='flex flex-col min-w-[280px]'>
      {view === 'month' ? (
        <>
          {/* Header: year (click to open year grid) with prev/next year arrows */}
          <div className='flex items-center justify-between rounded-lg bg-[var(--color-bg-weak-50)] h-9 px-2 gap-2 mb-3'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='ghost'
              size='xxsmall'
              className='size-8 min-w-0 p-0'
              onClick={handlePrevYear}
              aria-label='Previous year'
            >
              <Button.Icon as={RiArrowLeftSLine} className='size-5' />
            </Button.Root>
            <Button.Root
              type='button'
              variant='neutral'
              mode='ghost'
              size='xxsmall'
              className='flex-1 text-label-sm font-medium text-[var(--color-text-strong-950)]'
              onClick={() => setView('year')}
            >
              {pendingYear}
            </Button.Root>
            <Button.Root
              type='button'
              variant='neutral'
              mode='ghost'
              size='xxsmall'
              className='size-8 min-w-0 p-0'
              onClick={handleNextYear}
              aria-label='Next year'
            >
              <Button.Icon as={RiArrowRightSLine} className='size-5' />
            </Button.Root>
          </div>
          {/* Month grid 3x4 */}
          <div className='grid grid-cols-4 gap-1 mb-4'>
            {MONTH_ABBREV.map((label, index) => (
              <Button.Root
                key={label}
                type='button'
                variant={pendingMonth === index ? 'primary' : 'neutral'}
                mode='filled'
                size='xsmall'
                className={cn(
                  pendingMonth === index
                    ? 'bg-primary-base h-10 px-0  text-[var(--color-text-white-0)]'
                    : 'text-[var(--color-text-strong-950)] px-0  h-10 bg-transparent hover:bg-[var(--color-bg-weak-50)]',
                )}
                onClick={() => handleMonthClick(index)}
              >
                {label}
              </Button.Root>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Year view: range label + arrows, then year grid */}
          <div className='flex  items-center justify-between rounded-lg bg-[var(--color-bg-weak-50)] h-9 px-2 gap-2 mb-3'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='ghost'
              size='xxsmall'
              className='size-8 min-w-0 p-0'
              onClick={handlePrevYear}
              aria-label='Previous year range'
            >
              <Button.Icon as={RiArrowLeftSLine} className='size-5' />
            </Button.Root>
            <span className='text-label-sm font-medium text-[var(--color-text-strong-950)]'>
              {yearRangeLabel}
            </span>
            <Button.Root
              type='button'
              variant='neutral'
              mode='ghost'
              size='xxsmall'
              className='size-8 min-w-0 p-0'
              onClick={handleNextYear}
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
                size='xxsmall'
                className={cn(
                  'py-2 px-3 rounded-lg text-label-sm font-medium',
                  pendingYear !== y && 'bg-transparent hover:bg-[var(--color-bg-weak-50)]',
                )}
                onClick={() => handleYearClick(y)}
              >
                {y}
              </Button.Root>
            ))}
          </div>
        </>
      )}
      {/* Cancel / Apply */}
      <div className='flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-stroke-soft-200)]'>
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
          onClick={handleApply}
        >
          Apply
        </Button.Root>
      </div>
    </div>
  );
};

export default AgreementsMonthYearPicker;
