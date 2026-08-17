import React, { useState } from 'react';
import { RiCalendarLine, RiCloseLine, RiPencilLine } from 'react-icons/ri';

import ClientHotDeskSelectDatesModal from '@/components/clients-management/client-detail-allocate/client-hot-desk-select-dates-modal';
import * as Label from '@/components/ui/label';
import { formatMonthDayOrdinal } from '@/utils/hot-desk-month-day-utils';
import { cn } from '@/utils/cn';

/**
 * Monthly recurrence — "Set Recurrence Dates" with chips and calendar modal.
 *
 * @param {{
 *   disabled?: boolean,
 *   selectedMonthDays: number[],
 *   onMonthDaysChange: (days: number[]) => void,
 * }} props
 */
export default function ClientHotDeskMonthlyRecurrenceDatesField({
  disabled = false,
  selectedMonthDays,
  onMonthDaysChange,
}) {
  const [selectDatesOpen, setSelectDatesOpen] = useState(false);
  const hasSelection = selectedMonthDays.length > 0;

  const handleRemoveDay = (day) => {
    onMonthDaysChange(selectedMonthDays.filter((d) => d !== day));
  };

  return (
    <>
      <div className='flex flex-col gap-2'>
        <Label.Root>
          Set Recurrence Dates
          <Label.Asterisk className='text-red-500' />
        </Label.Root>
        <div
          className={cn(
            'flex min-h-10 items-center gap-2 rounded-lg border border-stroke-soft-200 bg-white px-3 py-2',
            disabled && 'pointer-events-none opacity-60',
          )}
        >
          <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
            {hasSelection ? (
              selectedMonthDays.map((day) => (
                <span
                  key={day}
                  className='inline-flex items-center gap-1 rounded-md border border-stroke-soft-200 bg-bg-weak-50 px-2 py-0.5 text-label-sm text-text-strong-950'
                >
                  {formatMonthDayOrdinal(day)}
                  <button
                    type='button'
                    className='text-text-sub-500 hover:text-text-strong-950'
                    aria-label={`Remove ${formatMonthDayOrdinal(day)}`}
                    onClick={() => handleRemoveDay(day)}
                  >
                    <RiCloseLine className='size-3.5' aria-hidden />
                  </button>
                </span>
              ))
            ) : (
              <button
                type='button'
                className='flex items-center gap-2 text-paragraph-sm text-text-sub-600 hover:text-text-strong-950'
                onClick={() => setSelectDatesOpen(true)}
              >
                <RiCalendarLine className='size-4 shrink-0' aria-hidden />
                Set Dates
              </button>
            )}
          </div>
          {hasSelection ? (
            <button
              type='button'
              className='shrink-0 text-text-sub-500 hover:text-text-strong-950'
              aria-label='Edit recurrence dates'
              onClick={() => setSelectDatesOpen(true)}
            >
              <RiPencilLine className='size-4' aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      <ClientHotDeskSelectDatesModal
        open={selectDatesOpen}
        onOpenChange={setSelectDatesOpen}
        selectedMonthDays={selectedMonthDays}
        onSave={onMonthDaysChange}
      />
    </>
  );
}
