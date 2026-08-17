import React from 'react';

import { BookingSingleTimeWheelField } from '@/components/ui/booking-time-wheel-field';
import * as Label from '@/components/ui/label';

/**
 * Hot-desk start and end time fields (separate scroll-wheel pickers).
 * Both pickers show the full 12-hour range with AM and PM — no current-time
 * floor and no peer-time constraint.
 *
 * @param {{
 *   startTime: string,
 *   endTime: string,
 *   onStartTimeChange: (value: string) => void,
 *   onEndTimeChange: (value: string) => void,
 *   disabled?: boolean,
 * }} props
 */
export default function ClientHotDeskScheduleTimeField({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  disabled = false,
}) {
  return (
    <div className='grid grid-cols-2 gap-3'>
      <div className='flex flex-col gap-1.5'>
        <Label.Root>
          Start Time
          <Label.Asterisk className='text-red-500' />
        </Label.Root>
        <BookingSingleTimeWheelField
          mode='start'
          value={startTime}
          onChange={onStartTimeChange}
          applyTodayStartBookableFloor={false}
          disabled={disabled}
          placeholder='HH:MM'
          ariaLabel='Start time'
        />
      </div>
      <div className='flex flex-col gap-1.5'>
        <Label.Root>
          End Time
          <Label.Asterisk className='text-red-500' />
        </Label.Root>
        <BookingSingleTimeWheelField
          mode='end'
          value={endTime}
          onChange={onEndTimeChange}
          restrictByPeerTime={false}
          disabled={disabled}
          placeholder='HH:MM'
          ariaLabel='End time'
        />
      </div>
    </div>
  );
}
