import React from 'react';
import { addMinutes, parseISO, startOfDay, subDays } from 'date-fns';
import * as Label from '@/components/ui/label';
import { DateTimePicker } from '@/components/ui/datetimepicker';

/**
 * Controlled start/end datetime editors for event detail (basic info) pages.
 */
export function EventScheduleDateTimeInline({
  startDatetimeIso = '',
  endDatetimeIso = '',
  onCommit,
  disabled = false,
}) {
  const startCalendarMin = startOfDay(subDays(new Date(), 1));

  const handleStartChange = (d) => {
    const startIso = d.toISOString();
    let endD = parseISO(String(endDatetimeIso || ''));
    if (!Number.isNaN(endD.getTime()) && endD.getTime() <= d.getTime()) {
      endD = addMinutes(d, 30);
    } else if (Number.isNaN(endD.getTime())) {
      endD = addMinutes(d, 30);
    }
    onCommit?.(startIso, endD.toISOString());
  };

  const handleEndChange = (d) => {
    const startD = parseISO(String(startDatetimeIso || ''));
    const startIso = Number.isNaN(startD.getTime()) ? d.toISOString() : startD.toISOString();
    onCommit?.(startIso, d.toISOString());
  };

  return (
    <div className='flex flex-col gap-4 sm:flex-row sm:gap-4'>
      <div className='flex flex-1 flex-col gap-1'>
        <Label.Root className='text-text-main-900'>
          Start date &amp; time <Label.Asterisk />
        </Label.Root>
        <DateTimePicker
          value={startDatetimeIso ? parseISO(startDatetimeIso) : undefined}
          onChange={handleStartChange}
          placeholder='Select start'
          disabled={disabled}
          minDate={startCalendarMin}
        />
      </div>
      <div className='flex flex-1 flex-col gap-1'>
        <Label.Root className='text-text-main-900'>
          End date &amp; time <Label.Asterisk />
        </Label.Root>
        <DateTimePicker
          value={endDatetimeIso ? parseISO(endDatetimeIso) : undefined}
          onChange={handleEndChange}
          placeholder='Select end'
          disabled={disabled}
          minDate={startCalendarMin}
        />
      </div>
    </div>
  );
}
