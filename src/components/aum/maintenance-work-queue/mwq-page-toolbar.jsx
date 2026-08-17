import React, { memo, useRef, useState } from 'react';
import {
  RiCheckboxCircleLine,
  RiDownloadLine,
  RiExpandUpDownLine,
  RiLayoutColumnLine,
  RiSearchLine,
} from 'react-icons/ri';

import MwqFilterDropdown from '@/components/aum/maintenance-work-queue/mwq-filter-dropdown';
import AumMultiGroupByDropdown from '@/components/aum/asset/aum-multi-group-by-dropdown';
import {
  MwqCenterSelect,
  MwqMonthSelect,
} from '@/components/aum/maintenance-work-queue/maintenance-work-queue-selects';
import {
  MWQ_DEFAULT_APPLIED_FILTERS,
  MWQ_TOOLBAR_COPY,
} from '@/components/aum/maintenance-work-queue/maintenance-work-queue-constants';
import { AUM_TOOLBAR_COPY } from '@/components/aum/constants';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Avatar from '@/components/ui/avatar';
import * as Button from '@/components/ui/button';
import * as Filter from '@/components/ui/filter';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

const searchShadow = 'shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]';
const iconButtonClass = 'size-8 shrink-0 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]';

const MwqPageToolbar = memo(
  ({
    searchValue,
    onSearchChange,
    showMonthSelect = false,
    selectedMonth,
    onMonthChange,
    selectedCenter,
    onCenterChange,
    centerOptions,
    filterOptions,
    appliedFilters = MWQ_DEFAULT_APPLIED_FILTERS,
    onFiltersChange,
    groupByRules,
    onGroupByRulesChange,
    columnConfig,
    pinnedColumnId = 'name',
    onExport,
    isGroupedView = false,
    groupsExpanded = true,
    onToggleGroupsExpanded,
    enableCompletedQuickFilter = false,
    completedQuickFilterActive = false,
    onCompletedQuickFilterToggle,
    showAssigneeToolbarButton = false,
  }) => {
    const searchId = React.useId();
    const [columnManagerOpen, setColumnManagerOpen] = useState(false);
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const [filterCount, setFilterCount] = useState(0);
    const filterDropdownRef = useRef(null);

    const handleFilterClear = (event) => {
      event?.stopPropagation?.();
      onFiltersChange?.(MWQ_DEFAULT_APPLIED_FILTERS);
      setFilterCount(0);
      setIsFilterDropdownOpen(false);
    };

    return (
      <div className='flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div className='w-full min-w-0 shrink-0 lg:max-w-[276px]'>
          <Input.Root size='small' className={searchShadow}>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                id={searchId}
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={MWQ_TOOLBAR_COPY.searchPlaceholder}
                autoComplete='off'
                aria-label={MWQ_TOOLBAR_COPY.searchAriaLabel}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='flex min-w-0 flex-nowrap items-center justify-end gap-2 overflow-x-auto'>
          {showMonthSelect ? (
            <MwqMonthSelect value={selectedMonth} onValueChange={onMonthChange} />
          ) : null}
          <div className='w-[118px] shrink-0'>
            <MwqCenterSelect
              value={selectedCenter}
              onValueChange={onCenterChange}
              centerOptions={centerOptions}
            />
          </div>

          <AumMultiGroupByDropdown rules={groupByRules} onChange={onGroupByRulesChange} />

          <Popover.Root
            open={isFilterDropdownOpen}
            onOpenChange={(open) => {
              const wasOpen = isFilterDropdownOpen;
              setIsFilterDropdownOpen(open);
              if (wasOpen && !open && filterDropdownRef.current) {
                filterDropdownRef.current.handleClose();
              }
            }}
          >
            <Filter.TriggerButton
              filterCount={filterCount}
              onClear={handleFilterClear}
              tooltipContent={MWQ_TOOLBAR_COPY.filterTooltip}
              ariaLabel={MWQ_TOOLBAR_COPY.filterAriaLabel}
            />
            <MwqFilterDropdown
              ref={filterDropdownRef}
              open={isFilterDropdownOpen}
              setFilterCount={setFilterCount}
              appliedFilters={appliedFilters}
              onFiltersChange={onFiltersChange}
              filterOptions={filterOptions}
            />
          </Popover.Root>

          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            className={iconButtonClass}
            onClick={onToggleGroupsExpanded}
            disabled={!isGroupedView}
            aria-label={
              groupsExpanded
                ? AUM_TOOLBAR_COPY.collapseAllGroupsAriaLabel
                : AUM_TOOLBAR_COPY.expandAllGroupsAriaLabel
            }
          >
            <Button.Icon as={RiExpandUpDownLine} />
          </Button.Root>

          {/* <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={onExport}
            className={iconButtonClass}
            aria-label='Export'
          >
            <Button.Icon as={RiDownloadLine} />
          </Button.Root> */}

          <ColumnManagerDropdown
            open={columnManagerOpen}
            onOpenChange={setColumnManagerOpen}
            config={columnConfig}
            pinnedColumnId={pinnedColumnId}
            tooltipContent={<p>{AUM_TOOLBAR_COPY.columnsTooltip}</p>}
            trigger={
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                className={cn(
                  iconButtonClass,
                  columnManagerOpen && 'ring-2 ring-stroke-strong-950 ring-inset',
                )}
                aria-label={AUM_TOOLBAR_COPY.columnsAriaLabel}
                aria-expanded={columnManagerOpen}
              >
                <Button.Icon as={RiLayoutColumnLine} />
              </Button.Root>
            }
          />

          {enableCompletedQuickFilter ? (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button.Root
                  type='button'
                  variant={completedQuickFilterActive ? 'primary' : 'neutral'}
                  mode={completedQuickFilterActive ? 'lighter' : 'stroke'}
                  size='small'
                  className={iconButtonClass}
                  aria-label={MWQ_TOOLBAR_COPY.completedQuickFilterAriaLabel}
                  aria-pressed={completedQuickFilterActive}
                  onClick={onCompletedQuickFilterToggle}
                >
                  <Button.Icon as={RiCheckboxCircleLine} />
                </Button.Root>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p>{MWQ_TOOLBAR_COPY.completedQuickFilterTooltip}</p>
              </Tooltip.Content>
            </Tooltip.Root>
          ) : null}

          {showAssigneeToolbarButton ? (
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              className='size-8 shrink-0 p-1 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
              aria-label='Assignee filter'
            >
              <Avatar.Root size={24} color='blue'>
                <span className='text-label-xs font-medium'>SA</span>
              </Avatar.Root>
            </Button.Root>
          ) : null}
        </div>
      </div>
    );
  },
);

MwqPageToolbar.displayName = 'MwqPageToolbar';

export default MwqPageToolbar;
