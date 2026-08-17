import React from 'react';
import { format } from 'date-fns';

import ClientHotDeskScheduleTimeField from '@/components/clients-management/client-detail-allocate/client-hot-desk-schedule-time-field';
import { Datepicker } from '@/components/ui/datepicker';
import * as Label from '@/components/ui/label';

/**
 * Non-recurring hot desk assignment: start/end date + premium time pickers.
 *
 * @param {{
 *   disabled?: boolean,
 *   startDate: string,
 *   onStartDateChange: (value: string) => void,
 *   endDate: string,
 *   onEndDateChange: (value: string) => void,
 *   startTime: string,
 *   onStartTimeChange: (value: string) => void,
 *   endTime: string,
 *   onEndTimeChange: (value: string) => void,
 * }} props
 */
export default function ClientHotDeskOneTimeFields({
  disabled = false,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
}) {
  const parseDateValue = (value) => {
    if (!value) return undefined;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };

  return (
    <div className='flex flex-col gap-4'>
      <div className='grid grid-cols-2 gap-3'>
        <div className='flex flex-col gap-1.5'>
          <Label.Root>
            Start Date
            <Label.Asterisk className='text-red-500' />
          </Label.Root>
          <Datepicker
            value={parseDateValue(startDate)}
            onChange={(date) => onStartDateChange(date ? format(date, 'yyyy-MM-dd') : '')}
            placeholder='DD / MM / YYYY'
            size='small'
            variant='default'
            disabled={disabled}
            className='bg-white'
          />
        </div>
        <div className='flex flex-col gap-1.5'>
          <Label.Root>
            End Date
            <Label.Asterisk className='text-red-500' />
          </Label.Root>
          <Datepicker
            value={parseDateValue(endDate)}
            onChange={(date) => onEndDateChange(date ? format(date, 'yyyy-MM-dd') : '')}
            placeholder='DD / MM / YYYY'
            size='small'
            variant='default'
            min={parseDateValue(startDate)}
            disabled={disabled}
            className='bg-white'
          />
        </div>
      </div>

      <ClientHotDeskScheduleTimeField
        bookingDate={startDate}
        startTime={startTime}
        endTime={endTime}
        onStartTimeChange={onStartTimeChange}
        onEndTimeChange={onEndTimeChange}
        disabled={disabled}
      />
    </div>
  );
}
