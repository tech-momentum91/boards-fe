// AlignUI Calendar v0.0.0
import * as React from 'react';
import { RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';
import { DayPicker } from 'react-day-picker';
import { getYear, getMonth, setMonth, setYear, startOfMonth, subMonths, addMonths } from 'date-fns';
// import 'react-day-picker/style.css';

import { MONTH_OPTIONS } from '@/constants/constants';
import { compactButtonVariants } from '@/components/ui/compact-button';
import * as CompactButton from '@/components/ui/compact-button';
import * as Select from '@/components/ui/select';
import { cn } from '@/utils/cn';

function Calendar({
  classNames,
  showOutsideDays = true,
  min,
  max,
  month: propMonth,
  onMonthChange: propOnMonthChange,
  ...rest
}) {
  const [internalMonth, setInternalMonth] = React.useState(rest.defaultMonth || new Date());
  const month = propMonth || internalMonth;
  const onMonthChange = propOnMonthChange || setInternalMonth;

  // Generate year range based on min/max or default to 1900-2100
  const getYearRange = () => {
    const currentYear = getYear(new Date());
    const minYear = min ? getYear(min) : 1900;
    const maxYear = max ? getYear(max) : currentYear + 10;
    const years = [];
    for (let year = minYear; year <= maxYear; year++) {
      years.push(year);
    }
    return years;
  };

  const years = getYearRange();

  const CustomCaption = ({ displayMonth }) => {
    const displayYear = getYear(displayMonth);
    const displayMonthIndex = getMonth(displayMonth);

    const handleMonthSelect = (monthIndex) => {
      if (onMonthChange) {
        const newDate = startOfMonth(setMonth(displayMonth, Number.parseInt(monthIndex)));
        onMonthChange(newDate);
      }
    };

    const handleYearSelect = (year) => {
      if (onMonthChange) {
        const newDate = startOfMonth(setYear(displayMonth, Number.parseInt(year)));
        onMonthChange(newDate);
      }
    };

    return (
      <div className='flex justify-center items-center relative rounded-lg bg-bg-weak-50 h-9 px-2 gap-2'>
        {/* Previous month button */}
        <CompactButton.Root
          variant='white'
          size='large'
          onClick={() => {
            if (onMonthChange) {
              const newDate = startOfMonth(subMonths(displayMonth, 1));
              onMonthChange(newDate);
            }
          }}
          className='absolute left-1.5'
          aria-label='Previous month'
        >
          <CompactButton.Icon as={RiArrowLeftSLine} />
        </CompactButton.Root>

        {/* Month selector */}
        <Select.Root
          value={displayMonthIndex.toString()}
          onValueChange={handleMonthSelect}
          variant='inline'
          size='xsmall'
          matchTriggerWidth={false}
        >
          <Select.Trigger className='bg-transparent shadow-none!'>
            <Select.Value>{MONTH_OPTIONS[displayMonthIndex]}</Select.Value>
          </Select.Trigger>
          <Select.Content>
            {MONTH_OPTIONS.map((month, index) => (
              <Select.Item key={index} value={index.toString()}>
                {month}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>

        {/* Year selector */}
        <Select.Root
          value={displayYear.toString()}
          onValueChange={handleYearSelect}
          size='xsmall'
          matchTriggerWidth={false}
          variant='inline'
        >
          <Select.Trigger className='bg-transparent shadow-none!'>
            <Select.Value>{displayYear}</Select.Value>
          </Select.Trigger>
          <Select.Content className='max-h-[300px]'>
            {years.map((year) => (
              <Select.Item key={year} value={year.toString()}>
                {year}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>

        {/* Next month button */}
        <CompactButton.Root
          variant='white'
          size='large'
          onClick={() => {
            if (onMonthChange) {
              const newDate = startOfMonth(addMonths(displayMonth, 1));
              onMonthChange(newDate);
            }
          }}
          className='absolute right-1.5'
          aria-label='Next month'
        >
          <CompactButton.Icon as={RiArrowRightSLine} />
        </CompactButton.Root>
      </div>
    );
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      today={new Date()}
      fromDate={min}
      weekStartsOn={1}
      toDate={max}
      month={month}
      onMonthChange={onMonthChange}
      classNames={{
        multiple_months: '',
        caption_start: '',
        caption_end: 'p-2',
        months: 'flex divide-x divide-stroke-soft-200',
        month: 'space-y-2',
        caption: 'flex justify-center items-center relative rounded-lg bg-bg-weak-50 h-9',
        caption_label: 'text-label-sm text-text-sub-600 select-none',
        nav: 'flex items-center',
        nav_button: compactButtonVariants({
          variant: 'white',
          size: 'large',
        }).root({ class: 'absolute' }),
        nav_button_previous: 'top-1/2 -translate-y-1/2 left-1.5',
        nav_button_next: 'top-1/2 -translate-y-1/2 right-1.5',
        table: 'w-full border-collapse',
        head_row: 'flex gap-1',
        head_cell:
          'text-text-soft-400 text-label-sm uppercase size-10 flex items-center justify-center text-center select-none',
        row: 'grid grid-flow-col auto-cols-auto w-full mt-1 gap-1',
        cell: cn(
          // base
          'group/cell relative size-10 shrink-0 select-none p-0',
          // range
          '[&:has(.day-range-middle)]:bg-primary-lighter',
          'first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg',
          // first range el
          '[&:not(:has(button))+:has(.day-range-middle)]:rounded-l-lg',
          // last range el
          '[&:not(:has(+_*_button))]:rounded-r-lg',
          // hide before if next sibling not selected
          '[&:not(:has(+_*_[type=button]))]:before:hidden',
          // merged bg
          'before:absolute before:inset-y-0 before:-right-1 before:hidden before:w-1 before:bg-primary-lighter z-0',
          'last:[&:has(.day-range-middle)]:before:hidden',
          // middle
          '[&:has(.day-range-middle)]:before:block',
          // start
          '[&:has(.day-range-start)]:before:block [&:has(.day-range-start)]:before:w-3',
          // end
          '[&:has(.day-range-end):not(:first-child)]:before:!block [&:has(.day-range-end)]:before:left-0 [&:has(.day-range-end)]:before:right-auto',
        ),
        day: cn(
          // base
          'flex size-10 shrink-0 items-center justify-center rounded-lg text-center text-label-sm text-text-sub-600 outline-none relative z-1',
          'transition duration-200 ease-out',
          // hover
          'hover:bg-bg-weak-50 hover:text-text-strong-950',
          // selected
          'aria-[selected]:bg-primary-base aria-[selected]:text-static-white',
          // focus visible
          'focus:outline-none focus-visible:bg-bg-weak-50 focus-visible:text-text-strong-950',
        ),
        day_range_start: 'day-range-start',
        day_range_end: 'day-range-end',
        day_selected: 'day-selected',
        day_range_middle: 'day-range-middle !text-primary-base !bg-transparent',
        day_today: 'bg-primary-light/60 text-primary-base font-semibold',
        day_outside: 'day-outside !text-text-disabled-300 aria-[selected]:!text-static-white',
        day_disabled: 'day-disabled !text-text-disabled-300',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        IconLeft: () => <RiArrowLeftSLine className='size-5' />,
        IconRight: () => <RiArrowRightSLine className='size-5' />,
        Caption: CustomCaption,
      }}
      {...rest}
    />
  );
}

export { Calendar };
