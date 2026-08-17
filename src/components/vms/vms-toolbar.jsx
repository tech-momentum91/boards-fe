import React, { useEffect, useRef, useState } from 'react';
import {
  RiAddLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiCloseLine,
  RiLayoutColumnLine,
  RiSearchLine,
  RiStackLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
} from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as LinkButton from '@/components/ui/link-button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Filter from '@/components/ui/filter';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import { useLocation } from 'react-router-dom';
import VmsFilterDropdown from '@/components/vms/vms-filter-dropdown';
import VmsSpaceFilterDropdown from '@/components/vms/vms-space-filter-dropdown';
import VmsVendorFilterDropdown from '@/components/vms/vms-vendor-filter-dropdown';
import * as DatepickerPrimivites from '@/components/ui/calendar';
import { format, subDays, addDays, getDate, setDate, getDaysInMonth } from 'date-fns';
import { RANGE_DAYS, getDefaultDateRange } from '@/components/team-management/constants';
import { GROUP_BY_OPTIONS_MAP } from '@/components/vms/constants';

const RangeDatePicker = ({ range, onRangeChange, open, onOpenChange }) => {
  const effectiveRange = range?.from && range?.to ? range : getDefaultDateRange();
  const [displayMonth, setDisplayMonth] = useState(
    () => effectiveRange?.from ?? getDefaultDateRange().from,
  );

  useEffect(() => {
    if (open && effectiveRange?.from) {
      setDisplayMonth(effectiveRange.from);
    }
  }, [open, effectiveRange?.from]);

  const handleMonthChange = (newDisplayMonth) => {
    setDisplayMonth(newDisplayMonth);
    if (effectiveRange?.from && effectiveRange?.to) {
      const fromDay = getDate(effectiveRange.from);
      const toDay = getDate(effectiveRange.to);
      const maxDay = getDaysInMonth(newDisplayMonth);
      const newFrom = setDate(newDisplayMonth, Math.min(fromDay, maxDay));
      const newTo = setDate(newDisplayMonth, Math.min(toDay, maxDay));
      onRangeChange?.({ from: newFrom, to: newTo > newFrom ? newTo : newFrom });
    }
  };

  const handleChange = (selectedRange) => {
    onRangeChange?.(selectedRange);
    if (selectedRange?.from) setDisplayMonth(selectedRange.from);
    if (selectedRange?.from != null && selectedRange?.to != null) {
      onOpenChange?.(false);
    }
  };

  const handleDayClick = (day, _modifiers, e) => {
    if (e?.detail === 2) {
      onRangeChange?.({ from: day, to: day });
      onOpenChange?.(false);
    }
  };

  const handlePreviousRange = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!effectiveRange?.from || !effectiveRange?.to) return;
    const isSingleDay = effectiveRange.from.toDateString() === effectiveRange.to.toDateString();
    if (isSingleDay) {
      const newDay = subDays(effectiveRange.from, 1);
      onRangeChange?.({ from: newDay, to: newDay });
    } else {
      const diffMs = effectiveRange.to.getTime() - effectiveRange.from.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      const newFrom = subDays(effectiveRange.from, diffDays);
      const newTo = subDays(effectiveRange.to, diffDays);
      onRangeChange?.({ from: newFrom, to: newTo });
    }
  };

  const handleNextRange = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!effectiveRange?.from || !effectiveRange?.to) return;
    const isSingleDay = effectiveRange.from.toDateString() === effectiveRange.to.toDateString();
    if (isSingleDay) {
      const newDay = addDays(effectiveRange.from, 1);
      onRangeChange?.({ from: newDay, to: newDay });
    } else {
      const diffMs = effectiveRange.to.getTime() - effectiveRange.from.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      const newFrom = addDays(effectiveRange.from, diffDays);
      const newTo = addDays(effectiveRange.to, diffDays);
      onRangeChange?.({ from: newFrom, to: newTo });
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <ButtonGroup.Root>
          <ButtonGroup.Item>
            {effectiveRange?.from ? (
              <>
                {format(effectiveRange.from, 'LLL dd, y')}
                {effectiveRange.to &&
                  effectiveRange.from.toDateString() !== effectiveRange.to.toDateString() && (
                    <> - {format(effectiveRange.to, 'LLL dd, y')}</>
                  )}
              </>
            ) : (
              <span>Select a range</span>
            )}
          </ButtonGroup.Item>
          <ButtonGroup.Item onClick={handlePreviousRange} aria-label='Previous range'>
            <ButtonGroup.Icon as={RiArrowLeftSLine} />
          </ButtonGroup.Item>
          <ButtonGroup.Item onClick={handleNextRange} aria-label='Next range'>
            <ButtonGroup.Icon as={RiArrowRightSLine} />
          </ButtonGroup.Item>
        </ButtonGroup.Root>
      </Popover.Trigger>
      <Popover.Content className='p-0' showArrow={false}>
        <DatepickerPrimivites.Calendar
          mode='range'
          selected={effectiveRange}
          onSelect={handleChange}
          onDayClick={handleDayClick}
          month={displayMonth}
          onMonthChange={handleMonthChange}
        />
      </Popover.Content>
    </Popover.Root>
  );
};

const VmsToolbar = ({
  searchValue = '',
  onSearchChange,
  onInvite,
  /** Live column-manager API from parent (preferred over reading tableRef once per render). */
  columnConfigHook,
  tableRef,
  groupBy = '',
  groupOrder = 'asc',
  onGroupByChange,
  onGroupOrderChange,
  filterCount = 0,
  showInvBtn = true,
  onClearFilters,
  activeTab = 'visitors',
  dateRange,
  onDateRangeChange,
  appliedFilters,
  onFiltersChange,
}) => {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const filterDropdownRef = useRef(null);
  const skipNextFilterApplyRef = useRef(false);

  const currentPath = useLocation()?.pathname?.split('/')[2];

  const groupByOptions = GROUP_BY_OPTIONS_MAP[activeTab] || GROUP_BY_OPTIONS_MAP.visitors;
  const groupByLabel = groupBy
    ? groupByOptions.some((o) => o.value === groupBy)
      ? groupByOptions.find((o) => o.value === groupBy)?.label
      : groupBy
    : groupBy;

  const setOrdBtn = (value) =>
    onGroupOrderChange?.(typeof value === 'function' ? value(groupOrder) : value);

  const handleSearch = (event) => {
    onSearchChange?.(event.target.value);
  };

  const handleClearFilters = (e) => {
    e.stopPropagation();
    skipNextFilterApplyRef.current = true;
    if (activeTab === 'visitors') {
      onFiltersChange?.([], { center: [], host_company: [], status: [] });
    } else if (activeTab === 'space-inquiries') {
      onFiltersChange?.([], {
        center: [],
        type_of_space: [],
        source_category: [],
        sales_owner: [],
        partner_type: [],
        status: [],
      });
    } else if (activeTab === 'vendors') {
      onFiltersChange?.([], {
        center: [],
        vendor_type: [],
        assigned_supervisor: [],
        status: [],
      });
    } else {
      onClearFilters?.();
    }
    setIsFilterDropdownOpen(false);
  };

  return (
    <header className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
      <Input.Root className='w-full lg:w-[372px]'>
        <Input.Wrapper>
          <Input.Icon>
            <RiSearchLine />
          </Input.Icon>
          <Input.Input
            placeholder='Search'
            value={searchValue}
            onChange={handleSearch}
            aria-label={`Search ${activeTab}`}
          />
        </Input.Wrapper>
      </Input.Root>

      <div className='flex flex-wrap items-center gap-3'>
        <RangeDatePicker
          range={dateRange}
          onRangeChange={onDateRangeChange}
          open={isDatePickerOpen}
          onOpenChange={setIsDatePickerOpen}
        />

        <Popover.Root
          open={isFilterDropdownOpen}
          onOpenChange={(open) => {
            const wasOpen = isFilterDropdownOpen;
            setIsFilterDropdownOpen(open);
            if (wasOpen && !open && filterDropdownRef.current) {
              if (skipNextFilterApplyRef.current) {
                skipNextFilterApplyRef.current = false;
                return;
              }
              filterDropdownRef.current.handleClose();
            }
          }}
        >
          <Filter.TriggerButton
            filterCount={filterCount}
            onClear={handleClearFilters}
            tooltipContent='Filter'
            ariaLabel='Filter records'
          />
          {activeTab === 'visitors' && (
            <VmsFilterDropdown
              ref={filterDropdownRef}
              open={isFilterDropdownOpen}
              setFilterCount={() => {}}
              onOpenChange={setIsFilterDropdownOpen}
              onFiltersChange={onFiltersChange}
              appliedFilters={appliedFilters}
            />
          )}
          {activeTab === 'space-inquiries' && (
            <VmsSpaceFilterDropdown
              ref={filterDropdownRef}
              open={isFilterDropdownOpen}
              setFilterCount={() => {}}
              onOpenChange={setIsFilterDropdownOpen}
              onFiltersChange={onFiltersChange}
              appliedFilters={appliedFilters}
            />
          )}
          {activeTab === 'vendors' && (
            <VmsVendorFilterDropdown
              ref={filterDropdownRef}
              open={isFilterDropdownOpen}
              setFilterCount={() => {}}
              onOpenChange={setIsFilterDropdownOpen}
              onFiltersChange={onFiltersChange}
              appliedFilters={appliedFilters}
            />
          )}
        </Popover.Root>

        <Popover.Root open={isGroupByOpen} onOpenChange={setIsGroupByOpen}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Popover.Trigger asChild>
                <Button.Root
                  variant={groupBy ? 'primary' : 'neutral'}
                  mode={groupBy ? 'lighter' : 'stroke'}
                  size='small'
                  className={`gap-2 flex items-center justify-center ${groupBy ? 'ring-1 ring-primary-base' : ''}`}
                  aria-label='Group By'
                >
                  <Button.Icon as={RiStackLine} />
                  {groupBy && <span className='label-small'>{groupByLabel}</span>}
                  {groupBy && (
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <span
                          className='cursor-pointer flex items-center justify-center'
                          onClick={(e) => {
                            e.stopPropagation();
                            setOrdBtn((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                          }}
                        >
                          {groupOrder === 'asc' ? (
                            <RiArrowUpLine size={20} />
                          ) : (
                            <RiArrowDownLine size={20} />
                          )}
                        </span>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        <span className='paragraph-xsmall'>
                          {groupOrder === 'asc' ? 'Asc' : 'Desc'}
                        </span>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  )}
                  {groupBy && (
                    <RiCloseLine
                      onClick={(e) => {
                        e.stopPropagation();
                        onGroupByChange?.('');
                      }}
                      size={18}
                      className='text-primary-dark bg-primary-light rounded-sm'
                    />
                  )}
                </Button.Root>
              </Popover.Trigger>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <span className='paragraph-xsmall'>Group-By</span>
            </Tooltip.Content>
          </Tooltip.Root>

          <Popover.Content align='end' className='w-[300px] p-3'>
            <div className='flex w-full flex-col gap-2'>
              <div className='w-full flex items-center justify-between'>
                <span className='text-subheading-2xs text-text-soft-400'>GROUP BY</span>
                <LinkButton.Root
                  variant='primary'
                  size='small'
                  onClick={() => {
                    setOrdBtn('');
                    onGroupByChange?.('');
                  }}
                >
                  Clear
                </LinkButton.Root>
              </div>

              <SearchableSelect
                value={groupBy || ''}
                onValueChange={(value) => {
                  onGroupByChange?.(value);
                  setIsGroupByOpen(false);
                }}
                size='small'
                options={groupByOptions}
                placeholder='Select group by'
                triggerClassName='w-full'
              />

              <ButtonGroup.Root>
                <ButtonGroup.Item
                  data-state={groupOrder === 'asc' ? 'on' : 'off'}
                  onClick={() => setOrdBtn('asc')}
                  className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
                >
                  <ButtonGroup.Icon
                    data-state={groupOrder === 'asc' ? 'on' : 'off'}
                    className='data-[state=on]:text-primary-base'
                    as={RiArrowUpLine}
                  />
                  Ascending
                </ButtonGroup.Item>
                <ButtonGroup.Item
                  data-state={groupOrder === 'desc' ? 'on' : 'off'}
                  onClick={() => setOrdBtn('desc')}
                  className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
                >
                  <ButtonGroup.Icon
                    data-state={groupOrder === 'desc' ? 'on' : 'off'}
                    className='data-[state=on]:text-primary-base'
                    as={RiArrowDownLine}
                  />
                  Descending
                </ButtonGroup.Item>
              </ButtonGroup.Root>
            </div>
          </Popover.Content>
        </Popover.Root>

        <ColumnManagerDropdown
          open={isColumnManagerOpen}
          onOpenChange={setIsColumnManagerOpen}
          config={columnConfigHook ?? tableRef?.current?.columnConfigHook}
          tooltipContent={<p>Column Manager</p>}
          trigger={
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              className='gap-1'
              aria-label='Columns'
            >
              <Button.Icon>
                <RiLayoutColumnLine size={20} />
              </Button.Icon>
            </Button.Root>
          }
        />

        {currentPath !== 'event-participants' && (
          <Button.Root size='small' className='gap-1 shrink-0' onClick={onInvite}>
            <Button.Icon>
              <RiAddLine size={20} />
            </Button.Icon>
            Invite
          </Button.Root>
        )}
      </div>
    </header>
  );
};

export default VmsToolbar;
