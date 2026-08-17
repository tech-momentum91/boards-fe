import React, { useCallback, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import * as Button from '@/components/ui/button';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import * as Tooltip from '@/components/ui/tooltip';
import { RiTimeFill, RiInbox2Fill, RiCheckDoubleLine } from 'react-icons/ri';
import InboxFilterDropdown from './inbox-filter-dropdown';
import { INBOX_TAB_OPTIONS, FILTER_LABEL_MAP } from './inbox-constants';
import {
  fetchNotificationCountByTab,
  selectNotificationTabCounts,
} from '@/redux/notificationSlice';

const InboxStatusTabs = ({
  value = 'primary',
  onValueChange,
  appliedFilters = [],
  onFiltersChange,
  onClearAll,
  onUnclearAll,
  unclearCount = 0,
}) => {
  const dispatch = useDispatch();
  const counts = useSelector(selectNotificationTabCounts);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchNotificationCountByTab());
  }, [dispatch]);
  const filterCount = Array.isArray(appliedFilters) ? appliedFilters.length : 0;
  const firstFilter =
    Array.isArray(appliedFilters) && appliedFilters.length > 0 ? appliedFilters[0] : null;
  const filterLabel = firstFilter ? (FILTER_LABEL_MAP[firstFilter] ?? firstFilter) : '';

  const handleValueChange = useCallback(
    (newValue) => {
      if (onValueChange) {
        onValueChange(newValue);
      }
    },
    [onValueChange],
  );

  /** Reset inbox list filters only (does not clear notification items). */
  const handleClearFilterSelection = useCallback(
    (e) => {
      e?.stopPropagation();
      e?.preventDefault();
      onFiltersChange?.([]);
      setIsFilterDropdownOpen(false);
    },
    [onFiltersChange],
  );

  return (
    <TabMenuHorizontal.Root value={value} onValueChange={handleValueChange}>
      <div className='w-full border-b border-stroke-soft-200'>
        <TabMenuHorizontal.List
          className='w-full min-w-0 gap-6 border-t border-stroke-soft-200'
          wrapperClassName='w-full min-w-0'
        >
          {INBOX_TAB_OPTIONS.map((tab) => {
            let Icon = tab.icon;
            const count = counts[tab.value] ?? 0;
            const isActive = value === tab.value;
            if (isActive) {
              if (tab.value === 'primary') Icon = RiInbox2Fill;
              if (tab.value === 'later') Icon = RiTimeFill;
            }

            return (
              <TabMenuHorizontal.Trigger
                key={tab.value}
                value={tab.value}
                className='group h-12 gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
              >
                <TabMenuHorizontal.Icon as={Icon} className='size-4' />
                <span>{tab.label}</span>
                <span className='inline-flex items-center justify-center rounded-full bg-bg-weak-100 px-2 py-0.5 text-[12px] text-text-sub-600 group-data-[state=active]:text-white group-data-[state=active]:bg-green-500 group-data-[state=active]:font-semibold'>
                  {count}
                </span>
              </TabMenuHorizontal.Trigger>
            );
          })}

          <div className='ml-auto flex shrink-0 items-center gap-2'>
            <Popover.Root open={isFilterDropdownOpen} onOpenChange={setIsFilterDropdownOpen}>
              <Filter.TriggerButton
                filterCount={filterCount}
                filterLabel={filterLabel}
                onClear={handleClearFilterSelection}
                tooltipContent='Filter inbox'
                ariaLabel='Filter inbox'
              />
              <Popover.Content
                align='end'
                side='bottom'
                sideOffset={8}
                className='p-0'
                showArrow={false}
              >
                <InboxFilterDropdown
                  appliedFilters={appliedFilters}
                  onFiltersChange={(next) => {
                    onFiltersChange?.(next);
                    setIsFilterDropdownOpen(false);
                  }}
                />
              </Popover.Content>
            </Popover.Root>

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                {value === 'cleared' ? (
                  <Button.Root
                    type='button'
                    variant='neutral'
                    mode='stroke'
                    size='small'
                    className='gap-2 disabled:pointer-events-none disabled:opacity-50'
                    onClick={onUnclearAll}
                    disabled={!onUnclearAll || unclearCount === 0}
                  >
                    <Button.Icon>
                      <RiCheckDoubleLine size={18} />
                    </Button.Icon>
                    Unclear All
                  </Button.Root>
                ) : (
                  <Button.Root
                    type='button'
                    variant='neutral'
                    mode='stroke'
                    size='small'
                    className='gap-2 disabled:pointer-events-none disabled:opacity-50'
                    onClick={onClearAll}
                    disabled={value === 'later'}
                  >
                    <Button.Icon>
                      <RiCheckDoubleLine size={18} />
                    </Button.Icon>
                    Clear All
                  </Button.Root>
                )}
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p>
                  {value === 'cleared'
                    ? 'Unclear all notifications in this tab'
                    : value === 'later'
                      ? 'Disabled for this tab'
                      : 'Clear all notifications'}
                </p>
              </Tooltip.Content>
            </Tooltip.Root>
          </div>
        </TabMenuHorizontal.List>
      </div>
      {INBOX_TAB_OPTIONS.map((tab) => (
        <TabMenuHorizontal.Content key={tab.value} value={tab.value} className='sr-only'>
          {tab.label}
        </TabMenuHorizontal.Content>
      ))}
    </TabMenuHorizontal.Root>
  );
};

export default InboxStatusTabs;
