import React, { useMemo, useState } from 'react';
import {
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendar2Line,
  RiCalendarLine,
  RiUserLine,
} from 'react-icons/ri';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import * as CompactButton from '@/components/ui/compact-button';
import * as Popover from '@/components/ui/popover';
import AgreementsMonthYearPicker from '@/components/agreements/agreements-month-year-picker';
import {
  VIEW_MODE_OPTIONS,
  formatWeekRangeLabel,
  getMondayOfWeek,
  addWeeks,
  toDateInputValue,
  getMonthValueFromDate,
} from './constants';

const TAB_ICONS = {
  monthly_capacity: RiCalendarLine,
  weekly_allocation: RiCalendar2Line,
  bench: RiUserLine,
};

const PeriodControls = ({
  viewMode,
  planningYear,
  planningMonth,
  planningWeekStart,
  onYearChange,
  onMonthChange,
  onWeekChange,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isWeekly = viewMode === 'weekly_allocation';
  const isYearOnly = viewMode === 'monthly_capacity' || viewMode === 'bench';

  const selectedMonth = useMemo(() => {
    if (planningMonth) return getMonthValueFromDate(planningMonth);
    if (isWeekly && planningWeekStart) return getMonthValueFromDate(planningWeekStart);
    return String(new Date().getMonth() + 1);
  }, [planningMonth, planningWeekStart, isWeekly]);

  const weekStartDate = useMemo(() => {
    if (planningWeekStart) return getMondayOfWeek(planningWeekStart);
    return getMondayOfWeek(new Date());
  }, [planningWeekStart]);

  const pickerValue = useMemo(() => {
    if (isWeekly) return weekStartDate;
    const monthNumber = Number(selectedMonth) || new Date().getMonth() + 1;
    return new Date(planningYear, monthNumber - 1, 1);
  }, [isWeekly, weekStartDate, planningYear, selectedMonth]);

  const handlePrev = () => {
    if (isWeekly) {
      onWeekChange?.(toDateInputValue(addWeeks(weekStartDate, -1)));
      return;
    }
    onYearChange?.(planningYear - 1);
  };

  const handleNext = () => {
    if (isWeekly) {
      onWeekChange?.(toDateInputValue(addWeeks(weekStartDate, 1)));
      return;
    }
    onYearChange?.(planningYear + 1);
  };

  const handlePickerSelect = (date) => {
    if (isWeekly) {
      onWeekChange?.(toDateInputValue(getMondayOfWeek(date)));
      onMonthChange?.(String(date.getMonth() + 1), date.getFullYear());
    } else {
      onYearChange?.(date.getFullYear());
      if (!isYearOnly || viewMode === 'monthly_capacity') {
        onMonthChange?.(String(date.getMonth() + 1), date.getFullYear());
      }
    }
    setPickerOpen(false);
  };

  return (
    <div className='flex shrink-0 items-center self-center overflow-hidden rounded-lg border border-stroke-soft-200'>
      <Popover.Root open={pickerOpen} onOpenChange={setPickerOpen}>
        <Popover.Trigger asChild>
          <button
            type='button'
            className='flex h-9 items-center gap-1.5 border-r border-stroke-soft-200 px-2 py-1.5 text-left'
          >
            <RiCalendarLine className='size-5 shrink-0 text-text-sub-500' />
            <span className='whitespace-nowrap text-label-sm font-medium text-text-sub-500'>
              {isWeekly ? formatWeekRangeLabel(weekStartDate) : planningYear}
            </span>
            <RiArrowDownSLine className='size-5 shrink-0 text-text-sub-500' />
          </button>
        </Popover.Trigger>
        <Popover.Content className='p-4' align='end' side='bottom' sideOffset={8}>
          <AgreementsMonthYearPicker
            value={pickerValue}
            onSelect={handlePickerSelect}
            onCancel={() => setPickerOpen(false)}
          />
        </Popover.Content>
      </Popover.Root>

      <CompactButton.Root
        variant='ghost'
        size='medium'
        className='h-9 w-9 rounded-none border-r border-stroke-soft-200'
        onClick={handlePrev}
        aria-label={isWeekly ? 'Previous week' : 'Previous year'}
      >
        <CompactButton.Icon as={RiArrowLeftSLine} />
      </CompactButton.Root>
      <CompactButton.Root
        variant='ghost'
        size='medium'
        className='h-9 w-9 rounded-none'
        onClick={handleNext}
        aria-label={isWeekly ? 'Next week' : 'Next year'}
      >
        <CompactButton.Icon as={RiArrowRightSLine} />
      </CompactButton.Root>
    </div>
  );
};

const TeamPlanningViewTabs = ({
  viewMode,
  planningYear,
  planningMonth,
  planningWeekStart,
  onViewModeChange,
  onYearChange,
  onMonthChange,
  onWeekChange,
}) => {
  return (
    <div className='relative flex h-12 items-stretch justify-between gap-4 border-b border-stroke-soft-200 bg-bg-white-0'>
      <TabMenuHorizontal.Root value={viewMode} onValueChange={onViewModeChange} className='h-full'>
        <TabMenuHorizontal.List className='h-full gap-6 border-0' wrapperClassName='h-full w-auto'>
          {VIEW_MODE_OPTIONS.map((tab) => {
            const TabIcon = TAB_ICONS[tab.value] || RiCalendarLine;
            return (
              <TabMenuHorizontal.Trigger
                key={tab.value}
                value={tab.value}
                className='h-full gap-1.5 px-0 py-0 text-label-sm font-medium text-text-sub-500 data-[state=active]:text-text-strong-950'
              >
                <TabMenuHorizontal.Icon as={TabIcon} className='size-5' />
                <span>{tab.label}</span>
              </TabMenuHorizontal.Trigger>
            );
          })}
        </TabMenuHorizontal.List>
      </TabMenuHorizontal.Root>

      <PeriodControls
        viewMode={viewMode}
        planningYear={planningYear}
        planningMonth={planningMonth}
        planningWeekStart={planningWeekStart}
        onYearChange={onYearChange}
        onMonthChange={onMonthChange}
        onWeekChange={onWeekChange}
      />
    </div>
  );
};

export default TeamPlanningViewTabs;
