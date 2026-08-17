import React from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';

export const FILTER_BY_OPTIONS = [
  { value: 'all', label: 'All Activities' },
  { value: 'contact', label: 'Contact Changes' },
  { value: 'task', label: 'Tasks' },
  { value: 'email', label: 'Emails' },
];

export const TIME_PERIOD_OPTIONS = [
  { value: 'all', label: 'All Time Periods' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'thisMonth', label: 'This Month' },
];

const CpContactActivitiesToolbar = ({
  filterBy,
  onFilterByChange,
  timePeriod,
  onTimePeriodChange,
  filterOptions,
  timeFrameOptions,
}) => {
  const filterOpts = filterOptions ?? FILTER_BY_OPTIONS;
  const timeOpts = timeFrameOptions ?? TIME_PERIOD_OPTIONS;

  return (
    <div className='flex items-center gap-2 border-b border-stroke-soft-200 bg-bg-weak-100 px-6 py-3'>
      <span className='text-paragraph-sm text-text-sub-500 shrink-0'>Filter By:</span>

      <SearchableSelect
        value={filterBy}
        onValueChange={onFilterByChange}
        size='xsmall'
        variant='compact'
        options={filterOpts}
        triggerClassName='min-w-[160px]'
      />

      <SearchableSelect
        value={timePeriod}
        onValueChange={onTimePeriodChange}
        size='xsmall'
        variant='compact'
        options={timeOpts}
        triggerClassName='min-w-[180px]'
      />
    </div>
  );
};

export default CpContactActivitiesToolbar;
