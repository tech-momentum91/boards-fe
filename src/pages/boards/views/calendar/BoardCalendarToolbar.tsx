import { RiArrowDownSLine, RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';
import { startOfDay } from 'date-fns';
import * as Button from '@/components/ui/button';
import * as Select from '@/components/ui/select';
import { cn } from '@/utils/cn';
import {
  BOARD_CALENDAR_DATE_FIELD_OPTIONS,
  BOARD_CALENDAR_LAYOUT_OPTIONS,
  DEFAULT_BOARD_CALENDAR_DATE_FIELD,
  DEFAULT_BOARD_CALENDAR_LAYOUT_MODE,
  getBoardCalendarPeriodLabel,
  navigateBoardCalendarAnchor,
  normalizeBoardCalendarDateField,
  normalizeBoardCalendarLayoutMode,
} from './board-calendar-utils';

export default function BoardCalendarToolbar({
  anchorDate,
  onAnchorDateChange,
  layoutMode = DEFAULT_BOARD_CALENDAR_LAYOUT_MODE,
  onLayoutModeChange,
  dateField = DEFAULT_BOARD_CALENDAR_DATE_FIELD,
  onDateFieldChange,
  className,
}) {
  const displayDate = anchorDate instanceof Date ? anchorDate : new Date(anchorDate);
  const resolvedDateField = normalizeBoardCalendarDateField(dateField);
  const resolvedLayoutMode = normalizeBoardCalendarLayoutMode(layoutMode);
  const periodLabel = getBoardCalendarPeriodLabel(displayDate, resolvedLayoutMode);
  const layoutLabel =
    BOARD_CALENDAR_LAYOUT_OPTIONS.find((option) => option.value === resolvedLayoutMode)?.label ??
    'Month';

  const handleToday = () => {
    onAnchorDateChange?.(startOfDay(new Date()));
  };

  const handlePrevious = () => {
    onAnchorDateChange?.(navigateBoardCalendarAnchor(displayDate, resolvedLayoutMode, -1));
  };

  const handleNext = () => {
    onAnchorDateChange?.(navigateBoardCalendarAnchor(displayDate, resolvedLayoutMode, 1));
  };

  return (
    <header className={cn('flex w-full items-center justify-between gap-3', className)}>
      <div className='flex min-w-0 flex-wrap items-center gap-2'>
        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='small'
          className='shrink-0'
          onClick={handleToday}
        >
          Today
        </Button.Root>

        <Select.Root
          value={resolvedLayoutMode}
          onValueChange={onLayoutModeChange}
          size='small'
          variant='compact'
        >
          <Select.Trigger
            aria-label='Calendar layout'
            className='h-8 min-h-8 shrink-0 gap-1 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
            showArrow={false}
          >
            <span className='text-label-sm text-text-strong-950'>{layoutLabel}</span>
            <RiArrowDownSLine className='size-5 shrink-0 text-text-sub-600' />
          </Select.Trigger>
          <Select.Content align='start' className='min-w-[120px]'>
            {BOARD_CALENDAR_LAYOUT_OPTIONS.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>

        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='small'
          className='shrink-0 px-2'
          onClick={handlePrevious}
          aria-label='Previous period'
        >
          <RiArrowLeftSLine className='size-5' />
        </Button.Root>

        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='small'
          className='shrink-0 px-2'
          onClick={handleNext}
          aria-label='Next period'
        >
          <RiArrowRightSLine className='size-5' />
        </Button.Root>

        <span className='text-label-sm shrink-0 text-text-soft-400'>{periodLabel}</span>
      </div>

      <div className='flex min-w-0 items-center gap-2'>
        <span className='text-label-sm shrink-0 text-text-soft-400'>Tasks by</span>
        <Select.Root
          value={resolvedDateField}
          onValueChange={onDateFieldChange}
          size='small'
          variant='compact'
        >
          <Select.Trigger
            aria-label='Calendar date field'
            className='h-8 min-h-8 gap-1 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
            showArrow
          >
            <Select.Value />
          </Select.Trigger>
          <Select.Content align='end' className='min-w-[160px]'>
            {BOARD_CALENDAR_DATE_FIELD_OPTIONS.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </div>
    </header>
  );
}
