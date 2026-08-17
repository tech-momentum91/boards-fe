import React, { useCallback } from 'react';

import { cn } from '@/utils/cn';

const MONTH_DAY_NUMBERS = Array.from({ length: 31 }, (_, i) => i + 1);

/**
 * Day-of-month multiselect (1–31) without month/year navigation.
 *
 * @param {{
 *   selectedDays: number[],
 *   onChange: (days: number[]) => void,
 *   disabled?: boolean,
 * }} props
 */
export default function ClientHotDeskMonthDayGrid({ selectedDays, onChange, disabled = false }) {
  const toggleDay = useCallback(
    (day) => {
      if (disabled) return;
      const next = selectedDays.includes(day)
        ? selectedDays.filter((d) => d !== day)
        : [...selectedDays, day].sort((a, b) => a - b);
      onChange(next);
    },
    [disabled, onChange, selectedDays],
  );

  return (
    <div className='w-full max-w-[320px]'>
      <div className='mb-2 grid grid-cols-7 gap-1'>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => (
          <span
            key={`${label}-${index}`}
            className='flex size-9 items-center justify-center text-label-sm font-medium uppercase text-text-soft-400'
          >
            {label}
          </span>
        ))}
      </div>
      <div className='grid grid-cols-7 gap-1'>
        {MONTH_DAY_NUMBERS.map((day) => {
          const isSelected = selectedDays.includes(day);
          return (
            <button
              key={day}
              type='button'
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={`Day ${day}`}
              onClick={() => toggleDay(day)}
              className={cn(
                'flex size-9 items-center justify-center rounded-lg text-label-sm font-medium transition',
                isSelected
                  ? 'bg-primary-base text-static-white shadow-sm'
                  : 'text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-strong-950',
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
