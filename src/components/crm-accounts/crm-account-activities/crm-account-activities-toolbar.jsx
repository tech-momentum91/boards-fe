import React from 'react';
import { RiUserLine } from 'react-icons/ri';
import * as Select from '@/components/ui/select';
import * as Tooltip from '@/components/ui/tooltip';
const DEFAULT_FILTER_OPTIONS = [
  { value: 'all', label: 'All Activities' },
  { value: 'account', label: 'Account' },
  { value: 'task', label: 'Task' },
];

const DEFAULT_TIME_OPTIONS = [
  { value: 'all', label: 'All Time Periods' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'older', label: 'Older' },
];

const CrmAccountActivitiesToolbar = ({
  filterBy,
  onFilterByChange,
  timePeriod,
  onTimePeriodChange,
  filterOptions = DEFAULT_FILTER_OPTIONS,
  timeFrameOptions = DEFAULT_TIME_OPTIONS,
  showUserDetails = false,
  onShowUserDetailsChange,
}) => {
  return (
    <div className='group flex items-center gap-2 border-b border-stroke-soft-200 bg-bg-weak-100 px-6 py-3'>
      <span className='text-paragraph-sm text-text-sub-500 shrink-0'>Filter By:</span>

      <Select.Root
        value={filterBy}
        onValueChange={onFilterByChange}
        size='xsmall'
        variant='compact'
        matchTriggerWidth={false}
      >
        <Select.Trigger className='min-w-[160px]'>
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          {filterOptions.map((opt) => (
            <Select.Item key={opt.value} value={opt.value}>
              {opt.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>

      <Select.Root
        value={timePeriod}
        onValueChange={onTimePeriodChange}
        size='xsmall'
        variant='compact'
        matchTriggerWidth={false}
      >
        <Select.Trigger className='min-w-[180px]'>
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          {timeFrameOptions.map((opt) => (
            <Select.Item key={opt.value} value={opt.value}>
              {opt.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>

      <div className='flex-1' aria-hidden />

      {onShowUserDetailsChange && (
        <Tooltip.Provider delayDuration={300}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type='button'
                onClick={() => onShowUserDetailsChange((v) => !v)}
                className={`
                  flex items-center gap-1.5 rounded px-2 py-1 text-paragraph-xs transition-opacity
                  hover:bg-bg-soft-200
                  group-hover:opacity-100
                  ${showUserDetails ? 'opacity-100 text-primary-base' : 'opacity-0'}
                `}
                aria-label={showUserDetails ? 'Hide user names' : 'Show user names'}
              >
                <RiUserLine size={14} />
                <span>{showUserDetails ? 'Hide user names' : 'Show user names'}</span>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content size='xsmall' variant='dark' side='bottom'>
              {showUserDetails
                ? 'Hide user names in activity messages'
                : 'Show user names by default in activity messages'}
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      )}
    </div>
  );
};

export default CrmAccountActivitiesToolbar;
