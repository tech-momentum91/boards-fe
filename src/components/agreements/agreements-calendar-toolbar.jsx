import React, { useMemo, useState } from 'react';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowDownSLine,
  RiAddLine,
  RiCalendar2Fill,
  RiCalendarLine,
  RiCheckboxFill,
  RiCheckboxBlankLine,
} from 'react-icons/ri';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import * as Popover from '@/components/ui/popover';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import { buttonGroupVariants } from '@/components/ui/button-group';
import AgreementsMonthYearPicker from '@/components/agreements/agreements-month-year-picker';
import { CALENDAR_DATE_FIELD_OPTIONS as CALENDAR_DATE_FIELD_OPTIONS_BASE } from '@/components/agreements/constants';
import { cn } from '@/utils/cn';

const CALENDAR_DATE_FIELD_COLORS = ['#079455', '#6E3FF3', '#DF1C41', '#F17B2C', '#E255F2'];
const CALENDAR_DATE_FIELD_ICONS = CALENDAR_DATE_FIELD_COLORS.map((c, idx) => (
  <RiCalendar2Fill key={idx} color={c} />
));
const CALENDAR_DATE_FIELD_OPTIONS = CALENDAR_DATE_FIELD_OPTIONS_BASE.map((opt, i) => ({
  ...opt,
  icon: CALENDAR_DATE_FIELD_ICONS[i],
}));

/**
 * Left side: month/year selector (picker + month-by-month arrows).
 * Right side: multi-select date-type dropdown and Create Agreement button.
 */
const AgreementsCalendarToolbar = ({
  value,
  onMonthChange,
  dateFields = ['agreementStartDate'],
  onDateFieldsChange,
  onCreateAgreement,
  className,
  permissions = {},
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const displayDate = value instanceof Date ? value : new Date(value);

  const handlePrevMonth = () => {
    onMonthChange?.(startOfMonth(subMonths(displayDate, 1)));
  };
  const handleNextMonth = () => {
    onMonthChange?.(startOfMonth(addMonths(displayDate, 1)));
  };
  const handlePickerSelect = (date) => {
    onMonthChange?.(startOfMonth(date));
    setPickerOpen(false);
  };

  const selectedValues =
    Array.isArray(dateFields) && dateFields.length > 0 ? dateFields : ['agreement_start_date'];

  const primaryOption = useMemo(
    () =>
      CALENDAR_DATE_FIELD_OPTIONS.find((opt) => opt.value === selectedValues[0]) ||
      CALENDAR_DATE_FIELD_OPTIONS[0],
    [selectedValues],
  );

  const extraCount = selectedValues.length - 1;
  const triggerLabel =
    extraCount > 0 ? `${primaryOption.label} (+${extraCount})` : primaryOption.label;

  const isSelected = (value) => selectedValues.includes(value);

  const toggleDateField = (value) => {
    if (!onDateFieldsChange) return;

    let next;
    if (isSelected(value)) {
      // Prevent removing the last option – always keep at least one selected.
      if (selectedValues.length === 1) return;
      next = selectedValues.filter((v) => v !== value);
    } else {
      next = [...selectedValues, value];
    }

    onDateFieldsChange(next);
  };

  return (
    <header className={cn('flex  items-center justify-between gap-3 w-full', className)}>
      {/* Left: Month/Year selector + arrows */}
      <div className='flex items-center gap-0 shrink-0'>
        <ButtonGroup.Root size='small' className='shrink-0 '>
          <Popover.Root open={pickerOpen} onOpenChange={setPickerOpen}>
            <Popover.Trigger asChild>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                className={cn(
                  buttonGroupVariants({ size: 'small' }).item({ class: '' }),
                  'first:rounded-l-lg min-w-[140px] gap-1',
                )}
              >
                <RiCalendarLine
                  className='size-5 text-[var(--color-text-sub-600)] shrink-0'
                  size={20}
                />
                <span className='text-label-sm text-[var(--color-text-strong-950)]'>
                  {format(displayDate, 'MMM yy')}
                </span>
                <RiArrowDownSLine className='size-5 text-[var(--color-text-sub-600)] shrink-0' />
              </Button.Root>
            </Popover.Trigger>
            <Popover.Content className='p-4' align='start' side='bottom' sideOffset={8}>
              <AgreementsMonthYearPicker
                value={displayDate}
                onSelect={handlePickerSelect}
                onCancel={() => setPickerOpen(false)}
              />
            </Popover.Content>
          </Popover.Root>
          <ButtonGroup.Item onClick={handlePrevMonth} aria-label='Previous month'>
            <ButtonGroup.Icon as={RiArrowLeftSLine} />
          </ButtonGroup.Item>
          <ButtonGroup.Item onClick={handleNextMonth} aria-label='Next month'>
            <ButtonGroup.Icon as={RiArrowRightSLine} />
          </ButtonGroup.Item>
        </ButtonGroup.Root>
      </div>

      {/* Right: multi-select date type dropdown + Create Agreement */}
      <div className='flex items-center gap-2 shrink-0 '>
        <Popover.Root open={dateDropdownOpen} onOpenChange={setDateDropdownOpen}>
          <Popover.Trigger asChild>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              className='min-w-[220px] justify-between rounded-2xl px-3 h-9'
            >
              <span className='truncate'>{triggerLabel}</span>
              <RiArrowDownSLine className='size-4 text-text-soft-400 shrink-0' />
            </Button.Root>
          </Popover.Trigger>
          <Popover.Content className='p-2' align='start' side='bottom' sideOffset={8}>
            <div className='min-w-[260px] rounded-2xl flex flex-col '>
              {CALENDAR_DATE_FIELD_OPTIONS.map((opt) => {
                const checked = isSelected(opt.value);
                const color =
                  CALENDAR_DATE_FIELD_COLORS[
                    CALENDAR_DATE_FIELD_OPTIONS_BASE.findIndex((o) => o.value === opt.value)
                  ] || CALENDAR_DATE_FIELD_COLORS[0];
                return (
                  <Button.Root
                    key={opt.value}
                    type='button'
                    variant='neutral'
                    mode='ghost'
                    size='small'
                    className={cn(
                      'w-full justify-start gap-3 m-1 rounded-xl px-3 py-2 text-paragraph-sm',
                      checked && 'bg-bg-weak-50',
                    )}
                    onClick={() => toggleDateField(opt.value)}
                  >
                    {checked ? (
                      <RiCheckboxFill className='size-5 shrink-0' color='#067644' />
                    ) : (
                      <RiCheckboxBlankLine className='size-5 text-text-disabled-300 shrink-0' />
                    )}
                    <span className='flex items-center gap-2 min-w-0'>
                      {opt.icon}
                      <span className='truncate'>{opt.label}</span>
                    </span>
                  </Button.Root>
                );
              })}
            </div>
          </Popover.Content>
        </Popover.Root>
        {permissions.canCreate && (
          <Button.Root
            size='small'
            className='gap-1'
            onClick={() => {
              onCreateAgreement?.();
            }}
            aria-label='Create agreement'
          >
            <Button.Icon>
              <RiAddLine size={20} />
            </Button.Icon>
            Create Agreement
          </Button.Root>
        )}
      </div>
    </header>
  );
};

export default AgreementsCalendarToolbar;
