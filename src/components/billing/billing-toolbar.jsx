import React, { useMemo, useRef, useState } from 'react';
import { RiAddLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import * as Select from '@/components/ui/select';
import * as Tooltip from '@/components/ui/tooltip';
import TableVariantToggle from '@/components/ui/table-variant-toggle';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import { MONTH_OPTIONS } from '@/constants/constants';
import BillingTabs from '@/components/billing/billing-tabs';
import BillingFilterPopover from '@/components/billing/billing-filter-popover';
import GroupByToolbarControl from '@/components/ui/group-by-toolbar-control';
import { BILLING_GROUP_BY_OPTIONS } from '@/components/billing/constants';

const BillingToolbar = React.memo(
  ({
    searchValue = '',
    onSearchChange,
    activeTab = 'all',
    onTabChange,
    tableRef,
    tableVariant = 'compact',
    onTableVariantToggle,
    filters = {},
    filterCount: filterCountProperty,
    onFilterChange,
    onClearFilters,
    centerOptions = [],
    categoryOptions = [],
    hideClientFilter = false,
    hideCenterFilter = false,
    hideTabs = false,
    month = '',
    onMonthChange,
    year = '',
    onYearChange,
    showAddBilling = false,
    onAddBillingClick,
    groupBy = '',
    onGroupByChange,
    groupOrder = 'desc',
    onGroupOrderChange,
    groupByOptions = BILLING_GROUP_BY_OPTIONS,
  }) => {
    const inputRef = useRef(null);
    const filterDropdownRef = useRef(null);
    const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

    const handleSearch = (event) => {
      onSearchChange?.(event.target.value);
    };

    const handleClearAllFilters = (e) => {
      e.stopPropagation();
      onClearFilters?.();
      setIsFilterDropdownOpen(false);
    };

    const computedFilterCount = useMemo(() => {
      return Object.keys(filters).reduce((accumulator, key) => {
        // Exclude toolbar filters (billing month/year), search, and tab from badge count
        if (key === 'search' || key === 'tab' || key === 'month' || key === 'year')
          return accumulator;
        if (hideClientFilter && key === 'client') return accumulator;
        if (hideCenterFilter && key === 'center') return accumulator;
        const value = filters[key];
        if (Array.isArray(value)) return accumulator + value.length;
        if (value) return accumulator + 1;
        return accumulator;
      }, 0);
    }, [filters, hideClientFilter, hideCenterFilter]);

    const totalFilterCount =
      filterCountProperty === undefined ? computedFilterCount : filterCountProperty;

    return (
      <div className='flex flex-row justify-between gap-3 mt-5'>
        {!hideTabs && <BillingTabs value={activeTab} onValueChange={onTabChange} />}

        <div className='flex items-center gap-3 justify-between flex-1'>
          <div className='flex items-center gap-2 min-w-[240px] max-w-md flex-1'>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Icon>
                  <RiSearchLine className='size-4' />
                </Input.Icon>
                <Input.Input
                  ref={inputRef}
                  value={searchValue}
                  onChange={handleSearch}
                  placeholder='Search here...'
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <div className='flex items-center gap-2'>
            {showAddBilling && (
              <Button.Root
                type='button'
                variant='primary'
                mode='filled'
                size='small'
                className='shrink-0 gap-1'
                onClick={onAddBillingClick}
              >
                <Button.Icon as={RiAddLine} />
                Add Billing
              </Button.Root>
            )}

            <div className='flex items-center gap-2'>
              <Select.Root value={year} onValueChange={onYearChange}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Select.Trigger size='small' className='w-24'>
                      <Select.Value placeholder='Year' />
                    </Select.Trigger>
                  </Tooltip.Trigger>
                  <Tooltip.Content side='top' size='small' variant='dark'>
                    Select Billing Year
                  </Tooltip.Content>
                </Tooltip.Root>
                <Select.Content>
                  {Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i)).map(
                    (y) => (
                      <Select.Item key={y} value={y}>
                        {y}
                      </Select.Item>
                    ),
                  )}
                </Select.Content>
              </Select.Root>

              <Select.Root value={month} onValueChange={onMonthChange}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Select.Trigger size='small' className='w-28'>
                      <Select.Value placeholder='Month' />
                    </Select.Trigger>
                  </Tooltip.Trigger>
                  <Tooltip.Content side='top' size='small' variant='dark'>
                    Select Billing Month
                  </Tooltip.Content>
                </Tooltip.Root>
                <Select.Content>
                  {['All', ...MONTH_OPTIONS].map((m) => (
                    <Select.Item key={m} value={m}>
                      {m}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>

            <Popover.Root
              open={isFilterDropdownOpen}
              onOpenChange={(open) => {
                const wasOpen = isFilterDropdownOpen;
                if (wasOpen && !open && filterDropdownRef.current) {
                  filterDropdownRef.current.handleClose?.();
                }
                setIsFilterDropdownOpen(open);
              }}
            >
              <Filter.TriggerButton
                filterCount={totalFilterCount}
                onClear={handleClearAllFilters}
              />
              <BillingFilterPopover
                ref={filterDropdownRef}
                open={isFilterDropdownOpen}
                hideClientSection={hideClientFilter}
                hideCenterSection={hideCenterFilter}
                onPopoverClearFilters={onClearFilters}
                onInteractOutside={() => setIsFilterDropdownOpen(false)}
                onEscapeKeyDown={() => setIsFilterDropdownOpen(false)}
              />
            </Popover.Root>

            <GroupByToolbarControl
              options={groupByOptions}
              groupBy={groupBy}
              onGroupByChange={onGroupByChange}
              groupOrder={groupOrder}
              onGroupOrderChange={onGroupOrderChange}
            />

            <ColumnManagerDropdown
              open={isColumnManagerOpen}
              onOpenChange={setIsColumnManagerOpen}
              config={tableRef?.current?.columnConfigHook}
              tooltipContent={<p>Column Manager</p>}
              trigger={
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='small'
                  className='shrink-0 gap-1'
                >
                  <Button.Icon>
                    <RiLayoutColumnLine size={20} />
                  </Button.Icon>
                </Button.Root>
              }
            />

            {/* <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <TableVariantToggle variant={tableVariant} onToggle={onTableVariantToggle} />
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p>Table Variant</p>
              </Tooltip.Content>
            </Tooltip.Root> */}
          </div>
        </div>
      </div>
    );
  },
);
BillingToolbar.displayName = 'BillingToolbar';

export default BillingToolbar;
