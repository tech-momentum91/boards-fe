import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  RiLayoutColumnLine,
  RiSearchLine,
  RiInboxLine,
  RiTaskLine,
  RiCheckDoubleLine,
  RiBarChartLine,
} from 'react-icons/ri';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { selectNotificationTabCounts } from '@/redux/notificationSlice';
import {
  selectMyTaskFilterOptionStatuses,
  selectMyTaskFilterOptionPriorities,
  selectMyTaskTabCounts,
} from '@/redux/myTaskSlice';
import { MY_TASK_TABS } from './my-task-constants';
import MyTaskFilterDropdown from './my-task-filter-dropdown';
import InboxFilterDropdown from '@/components/inbox/inbox-filter-dropdown';
import { FILTER_LABEL_MAP } from '@/components/inbox/inbox-constants';
import { cn } from '@/utils/cn';

const MyTaskToolbar = ({
  activeTab = 'All',
  onTabChange,
  activeSubTab = 'tasks',
  onSubTabChange,
  searchQuery = '',
  onSearchChange,
  dueDateRange = null,
  onDueDateRangeChange,
  filterStatuses = [],
  filterPriorities = [],
  onFiltersApply,
  onFilterClear,
  /** From MyTaskTable via state bridge — required for ColumnManagerDropdown to open with live handlers. */
  columnConfigHook,
  onClearAll,
  clearAllDisabled = false,
  inboxAppliedFilters = [],
  onInboxFiltersChange,
}) => {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isInboxFilterOpen, setIsInboxFilterOpen] = useState(false);
  const filterDropdownRef = useRef(null);
  const tabCounts = useSelector(selectNotificationTabCounts);
  const inboxCount = tabCounts?.primary ?? 0;
  const taskTabCounts = useSelector(selectMyTaskTabCounts);
  const statusOptions = useSelector(selectMyTaskFilterOptionStatuses);
  const priorityOptions = useSelector(selectMyTaskFilterOptionPriorities);

  const filterCount =
    (Array.isArray(filterStatuses) ? filterStatuses.length : 0) +
    (Array.isArray(filterPriorities) ? filterPriorities.length : 0);

  const inboxFilterCount = Array.isArray(inboxAppliedFilters) ? inboxAppliedFilters.length : 0;
  const formatTaskTabCount = useCallback((n) => {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return null;
    return v > 999 ? '999+' : String(v);
  }, []);

  const inboxFilterLabel = useMemo(() => {
    const first =
      Array.isArray(inboxAppliedFilters) && inboxAppliedFilters.length > 0
        ? inboxAppliedFilters[0]
        : null;
    return first ? (FILTER_LABEL_MAP[first] ?? first) : '';
  }, [inboxAppliedFilters]);

  const handleFilterPopoverChange = useCallback(
    (open) => {
      const wasOpen = isFilterOpen;
      setIsFilterOpen(open);
      if (wasOpen && !open && filterDropdownRef.current) {
        filterDropdownRef.current.handleClose();
      }
    },
    [isFilterOpen],
  );

  return (
    <div className='flex flex-col border-b border-stroke-soft-200'>
      {/* Row 1: Module tabs */}
      <TabMenuHorizontal.Root value={activeTab} onValueChange={onTabChange}>
        <TabMenuHorizontal.List className='gap-7' wrapperClassName='min-w-0'>
          {MY_TASK_TABS.map((tab) => {
            const Icon = tab.icon;
            const countLabel =
              activeSubTab === 'tasks' ? formatTaskTabCount(taskTabCounts?.[tab.value]) : null;
            return (
              <TabMenuHorizontal.Trigger
                key={tab.value}
                value={tab.value}
                className='h-12 gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
              >
                <TabMenuHorizontal.Icon as={Icon} className='size-4' />
                <span>{tab.label}</span>
                {countLabel != null && (
                  <span
                    className={cn(
                      'inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none',
                      activeTab === tab.value
                        ? 'bg-green-500 text-white'
                        : 'bg-bg-weak-100 text-text-sub-600',
                    )}
                  >
                    {countLabel}
                  </span>
                )}
              </TabMenuHorizontal.Trigger>
            );
          })}
        </TabMenuHorizontal.List>
      </TabMenuHorizontal.Root>

      {/* Row 2: Sub-tabs + search + actions */}
      <div className='flex items-center gap-3 py-2'>
        {/* Left: Tasks / Inbox sub-tabs */}
        <div className='flex shrink-0 items-center gap-1 rounded-lg border border-stroke-soft-200 bg-bg-weak-50 p-0.5'>
          <button
            type='button'
            onClick={() => onSubTabChange?.('tasks')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-label-sm font-medium transition-colors ${
              activeSubTab === 'tasks'
                ? 'bg-bg-white-0 text-text-strong-950 shadow-xs'
                : 'text-text-sub-600 hover:text-text-strong-950'
            }`}
          >
            <RiTaskLine size={14} />
            Tasks
          </button>
          <button
            type='button'
            onClick={() => onSubTabChange?.('inbox')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-label-sm font-medium transition-colors ${
              activeSubTab === 'inbox'
                ? 'bg-bg-white-0 text-text-strong-950 shadow-xs'
                : 'text-text-sub-600 hover:text-text-strong-950'
            }`}
          >
            <RiInboxLine size={14} />
            Inbox
            {inboxCount > 0 && (
              <span
                className={`inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ${
                  activeSubTab === 'inbox'
                    ? 'bg-green-500 text-white'
                    : 'bg-bg-weak-100 text-text-sub-600'
                }`}
              >
                {inboxCount}
              </span>
            )}
          </button>
          <button
            type='button'
            onClick={() => onSubTabChange?.('analytics')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-label-sm font-medium transition-colors ${
              activeSubTab === 'analytics'
                ? 'bg-bg-white-0 text-text-strong-950 shadow-xs'
                : 'text-text-sub-600 hover:text-text-strong-950'
            }`}
          >
            <RiBarChartLine size={14} />
            Analytics
          </button>
        </div>

        {/* Spacer: push search + actions to the right */}
        <div className='min-w-0 flex-1' aria-hidden />

        {/* Search sits to the left of column/filter (right cluster) */}
        {activeSubTab === 'tasks' && (
          <div className='relative w-full max-w-[320px] shrink-0'>
            <RiSearchLine
              size={16}
              className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-soft-400'
            />
            <input
              type='text'
              placeholder='Search here...'
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className='h-9 w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 pl-9 pr-3 text-paragraph-sm text-text-strong-950 placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base'
            />
          </div>
        )}
        {activeSubTab === 'tasks' && (
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <span className='inline-flex shrink-0'>
                <DateRangePicker
                  value={dueDateRange}
                  onChange={(range) => onDueDateRangeChange?.(range)}
                  className='shrink-0'
                />
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <span className='paragraph-xsmall'>Due Date Filter</span>
            </Tooltip.Content>
          </Tooltip.Root>
        )}

        {/* Right: actions */}
        <div className='flex shrink-0 items-center gap-2'>
          {activeSubTab === 'tasks' ? (
            <>
              <ColumnManagerDropdown
                open={isColumnManagerOpen}
                onOpenChange={setIsColumnManagerOpen}
                config={columnConfigHook}
                tooltipContent={<p>Column Manager</p>}
                trigger={
                  <Button.Root type='button' variant='neutral' mode='stroke' size='small'>
                    <Button.Icon>
                      <RiLayoutColumnLine size={18} />
                    </Button.Icon>
                  </Button.Root>
                }
              />
              <Popover.Root open={isFilterOpen} onOpenChange={handleFilterPopoverChange}>
                <Filter.TriggerButton
                  filterCount={filterCount}
                  onClear={(e) => {
                    e?.stopPropagation?.();
                    onFilterClear?.();
                    setIsFilterOpen(false);
                  }}
                  tooltipContent='Filter by status and priority'
                  ariaLabel='Filter tasks'
                  className={
                    filterCount > 0
                      ? 'ring-1 ring-inset ring-primary-base bg-primary-lighter/30'
                      : ''
                  }
                />
                <MyTaskFilterDropdown
                  ref={filterDropdownRef}
                  open={isFilterOpen}
                  statusOptions={statusOptions}
                  priorityOptions={priorityOptions}
                  appliedStatuses={filterStatuses}
                  appliedPriorities={filterPriorities}
                  onFiltersChange={onFiltersApply}
                />
              </Popover.Root>
            </>
          ) : (
            <>
              <Popover.Root open={isInboxFilterOpen} onOpenChange={setIsInboxFilterOpen}>
                <Filter.TriggerButton
                  filterCount={inboxFilterCount}
                  filterLabel={inboxFilterLabel}
                  onClear={(e) => {
                    e?.stopPropagation?.();
                    e?.preventDefault?.();
                    onInboxFiltersChange?.([]);
                    setIsInboxFilterOpen(false);
                  }}
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
                    appliedFilters={inboxAppliedFilters}
                    onFiltersChange={(next) => {
                      onInboxFiltersChange?.(next);
                      setIsInboxFilterOpen(false);
                    }}
                  />
                </Popover.Content>
              </Popover.Root>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <Button.Root
                    type='button'
                    variant='neutral'
                    mode='stroke'
                    size='small'
                    className='gap-2 disabled:pointer-events-none disabled:opacity-50'
                    onClick={onClearAll}
                    disabled={clearAllDisabled}
                  >
                    <Button.Icon>
                      <RiCheckDoubleLine size={18} />
                    </Button.Icon>
                    Clear All
                  </Button.Root>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <p>Clear all notifications</p>
                </Tooltip.Content>
              </Tooltip.Root>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyTaskToolbar;
