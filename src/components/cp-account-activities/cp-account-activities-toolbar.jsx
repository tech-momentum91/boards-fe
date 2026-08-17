import React from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';

export const FILTER_BY_OPTIONS = [
  { value: 'all', label: 'All Activities' },
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

const CpAccountActivitiesToolbar = ({
  filterBy,
  onFilterByChange,
  timePeriod,
  onTimePeriodChange,
}) => {
  return (
    <div className='flex items-center gap-2 border-b border-stroke-soft-200 bg-bg-weak-100 px-6 py-3'>
      <span className='text-paragraph-sm text-text-sub-500 shrink-0'>Filter By:</span>

      <SearchableSelect
        value={filterBy}
        onValueChange={onFilterByChange}
        size='xsmall'
        variant='compact'
        options={FILTER_BY_OPTIONS}
        triggerClassName='min-w-[160px]'
      />

      <SearchableSelect
        value={timePeriod}
        onValueChange={onTimePeriodChange}
        size='xsmall'
        variant='compact'
        options={TIME_PERIOD_OPTIONS}
        triggerClassName='min-w-[180px]'
      />
    </div>
  );
};

export default CpAccountActivitiesToolbar;
