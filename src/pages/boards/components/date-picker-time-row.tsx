import { getHours, getMinutes, setHours, setMinutes, setSeconds } from 'date-fns';
import * as Select from '@/components/ui/select';

export const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);
export const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) =>
  index.toString().padStart(2, '0'),
);
export const AM_PM_OPTIONS = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
];

export function to12Hour(date) {
  if (!date) {
    return { hour: 12, minute: '00', period: 'AM' };
  }

  const hours = getHours(date);
  const minutes = getMinutes(date);
  const period = hours < 12 ? 'AM' : 'PM';
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return {
    hour: hour12,
    minute: minutes.toString().padStart(2, '0'),
    period,
  };
}

export function from12Hour(baseDate, hour12, minute, period) {
  const base = baseDate ? new Date(baseDate) : new Date();
  const hours = period === 'AM' ? (hour12 === 12 ? 0 : hour12) : hour12 === 12 ? 12 : hour12 + 12;

  return setSeconds(setMinutes(setHours(base, hours), Number(minute)), 0);
}

export default function DatePickerTimeRow({ hour, minute, period, onChange, disabled = false }) {
  const handleTimePartChange = (part, value) => {
    onChange?.({
      hour: part === 'hour' ? Number(value) : hour,
      minute: part === 'minute' ? value : minute,
      period: part === 'period' ? value : period,
    });
  };

  return (
    <div className='flex items-center justify-center gap-1'>
      <Select.Root
        value={hour.toString()}
        onValueChange={(value) => handleTimePartChange('hour', value)}
        size='xsmall'
        matchTriggerWidth={false}
        disabled={disabled}
      >
        <Select.Trigger className='w-14 bg-bg-weak-50'>
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          {HOUR_OPTIONS.map((entry) => (
            <Select.Item key={entry} value={entry.toString()}>
              {entry}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      <span className='text-paragraph-sm text-text-sub-600'>:</span>
      <Select.Root
        value={minute}
        onValueChange={(value) => handleTimePartChange('minute', value)}
        size='xsmall'
        matchTriggerWidth={false}
        disabled={disabled}
      >
        <Select.Trigger className='w-14 bg-bg-weak-50'>
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          {MINUTE_OPTIONS.map((entry) => (
            <Select.Item key={entry} value={entry}>
              {entry}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      <Select.Root
        value={period}
        onValueChange={(value) => handleTimePartChange('period', value)}
        size='xsmall'
        matchTriggerWidth={false}
        disabled={disabled}
      >
        <Select.Trigger className='w-14 bg-bg-weak-50'>
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          {AM_PM_OPTIONS.map((option) => (
            <Select.Item key={option.value} value={option.value}>
              {option.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </div>
  );
}
