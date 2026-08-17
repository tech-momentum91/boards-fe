import React, { useMemo, useRef, useState } from 'react';
import {
  RiStackLine,
  RiLayoutColumnLine,
  RiSearchLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiCloseLine,
  RiDownloadLine,
} from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import { MONTH_OPTIONS } from '@/constants/constants';
import OpexTabs from '@/components/opex/opex-tabs';
import OpexFilter from '@/components/opex/opex-filter';
import * as LinkButton from '@/components/ui/link-button';
import * as Select from '@/components/ui/select';
import * as ButtonGroup from '@/components/ui/button-group';

const groupByOptions = ['Center', 'Month', 'Vendor'];

const getDefaultYear = () => {
  const now = new Date();
  return String(now.getFullYear());
};

const getDefaultMonth = () => {
  const now = new Date();
  return MONTH_OPTIONS[now.getMonth()];
};

const OpexToolbar = ({
  searchValue = '',
  onSearchChange,
  activeTab = 'all',
  onTabChange,
  opexTabOptions,
  tableRef,
  tableVariant = 'compact',
  onTableVariantToggle,
  onGroupByClick,
  onGroupByChange,
  groupBy,
  onAddOpex,
  filters = {},
  onFilterChange,
  onClearFilters,
  showGroupBy = true,
  onGroupOrderChange,
  groupOrder,
  centerOptions = [],
  hideCenterFilter = false,
  categoryOptions = [],
  subcategoryOptions = [],
  isGroupedView = false,
  month = '',
  year = '',
  onMonthChange,
  onYearChange,
  onExport,
  isExporting = false,
  hasListData = true,
}) => {
  const inputRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const ordBtn = groupOrder;
  const setOrdBtn = (value) =>
    onGroupOrderChange?.(typeof value === 'function' ? value(groupOrder) : value);

  const handleSearch = (event) => {
    onSearchChange?.(event.target.value);
  };

  const handleClearAllFilters = (e) => {
    e.stopPropagation();
    onClearFilters?.();
    setIsFilterDropdownOpen(false);
  };

  const totalFilterCount = useMemo(() => {
    return Object.keys(filters).reduce((accumulator, key) => {
      // Exclude toolbar filters (expense month/year), search, and tab from badge count
      if (key === 'search' || key === 'tab' || key === 'month' || key === 'year')
        return accumulator;
      if (hideCenterFilter && key === 'center') return accumulator;
      const value = filters[key];
      if (key === 'year') return accumulator + (value ? 1 : 0);
      if (key === 'month') return accumulator + (value ? 1 : 0);
      if (Array.isArray(value)) return accumulator + value.length;
      if (value) return accumulator + 1;
      return accumulator;
    }, 0);
  }, [filters, hideCenterFilter]);

  const isExportDisabled = isExporting || !hasListData;
  const exportTooltip = !hasListData
    ? 'No OPEX records available to export'
    : isExporting
      ? 'Exporting...'
      : 'Export to Excel';

  return (
    <div className='flex flex-row justify-between gap-3 mt-5'>
      <OpexTabs value={activeTab} onValueChange={onTabChange} tabOptions={opexTabOptions} />

      <div className='flex items-center gap-3 justify-between'>
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
          <div className='flex items-center gap-2'>
            <Select.Root value={year} onValueChange={onYearChange}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <Select.Trigger size='small' className='w-24'>
                    <Select.Value placeholder='Year' />
                  </Select.Trigger>
                </Tooltip.Trigger>
                <Tooltip.Content side='top' size='small' variant='dark'>
                  Select Expense Year
                </Tooltip.Content>
              </Tooltip.Root>
              <Select.Content>
                {Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i)).map(
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
                  Select Expense Month
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

          {showGroupBy && (
            <Popover.Root open={isGroupByOpen} onOpenChange={setIsGroupByOpen}>
              <Popover.Trigger asChild>
                <Button.Root
                  variant={groupBy ? 'primary' : 'neutral'}
                  mode={groupBy ? 'lighter' : 'stroke'}
                  size='small'
                  className={`gap-2 flex items-center justify-center ${groupBy ? 'ring-1 ring-primary-base' : ''}`}
                  aria-label='Group By'
                >
                  <Button.Icon as={RiStackLine} />
                  {groupBy && <span className='label-small'>{groupBy}</span>}
                  {groupBy ? (
                    <span
                      className='cursor-pointer flex items-center justify-center ml-1'
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrdBtn((previous) => (previous === 'asc' ? 'desc' : 'asc'));
                      }}
                      title={ordBtn === 'asc' ? 'Ascending' : 'Descending'}
                    >
                      {ordBtn === 'asc' ? (
                        <RiArrowUpLine size={20} />
                      ) : (
                        <RiArrowDownLine size={20} />
                      )}
                    </span>
                  ) : null}
                  {groupBy && (
                    <RiCloseLine
                      onClick={(e) => {
                        e.stopPropagation();
                        onGroupByChange?.('');
                      }}
                      size={18}
                      className='text-primary-dark bg-primary-light rounded-sm ml-1 hover:bg-primary-light/80 transition-colors'
                      title='Clear Grouping'
                    />
                  )}
                </Button.Root>
              </Popover.Trigger>

              <Popover.Content align='left' className='w-[300px] p-3'>
                <div className='flex w-full flex-col gap-2'>
                  <div className='w-full flex items-center justify-between'>
                    <span className='text-subheading-2xs text-text-soft-400'>GROUP BY </span>

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

                  <Select.Root
                    value={groupBy || ''}
                    onValueChange={(value) => {
                      onGroupByChange?.(value);
                      setIsGroupByOpen(false);
                    }}
                    size='small'
                  >
                    <Select.Trigger className='w-full'>
                      <Select.Value placeholder='Select group by' />
                    </Select.Trigger>
                    <Select.Content>
                      {groupByOptions.map((opt) => (
                        <Select.Item key={opt} value={opt}>
                          {opt}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>

                  <ButtonGroup.Root>
                    <ButtonGroup.Item
                      data-state={ordBtn === 'asc' ? 'on' : 'off'}
                      onClick={() => setOrdBtn('asc')}
                      className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
                    >
                      <ButtonGroup.Icon
                        data-state={ordBtn === 'asc' ? 'on' : 'off'}
                        className='data-[state=on]:text-primary-base '
                        as={RiArrowUpLine}
                      />
                      Ascending
                    </ButtonGroup.Item>
                    <ButtonGroup.Item
                      data-state={ordBtn === 'desc' ? 'on' : 'off'}
                      onClick={() => setOrdBtn('desc')}
                      className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1  data-[state=on]:ring-primary-base'
                    >
                      <ButtonGroup.Icon
                        data-state={ordBtn === 'desc' ? 'on' : 'off'}
                        className='data-[state=on]:text-primary-base '
                        as={RiArrowDownLine}
                      />
                      Descending
                    </ButtonGroup.Item>
                  </ButtonGroup.Root>
                </div>
              </Popover.Content>
            </Popover.Root>
          )}

          <Popover.Root
            open={isFilterDropdownOpen}
            onOpenChange={(open) => {
              const wasOpen = isFilterDropdownOpen;
              if (wasOpen && !open && filterDropdownRef.current) {
                filterDropdownRef.current.handleClose();
              }
              setIsFilterDropdownOpen(open);
            }}
          >
            <Filter.TriggerButton filterCount={totalFilterCount} onClear={handleClearAllFilters} />
            <OpexFilter
              ref={filterDropdownRef}
              open={isFilterDropdownOpen}
              filters={filters}
              onFilterChange={onFilterChange}
              onClearFilters={onClearFilters}
              centerOptions={centerOptions}
              categoryOptions={categoryOptions}
              subcategoryOptions={subcategoryOptions}
              hideCenterSection={hideCenterFilter}
              onInteractOutside={() => setIsFilterDropdownOpen(false)}
              onEscapeKeyDown={() => setIsFilterDropdownOpen(false)}
            />
          </Popover.Root>

          {!isGroupedView && (
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
          )}

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <span className='inline-flex'>
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='small'
                  className='shrink-0 gap-1'
                  onClick={onExport}
                  disabled={isExportDisabled}
                  aria-busy={isExporting}
                  aria-label='Export to Excel'
                >
                  <Button.Icon>
                    <RiDownloadLine size={20} />
                  </Button.Icon>
                </Button.Root>
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>{exportTooltip}</p>
            </Tooltip.Content>
          </Tooltip.Root>
          {/*
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <TableVariantToggle variant={tableVariant} onToggle={onTableVariantToggle} />
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Table Variant</p>
            </Tooltip.Content>
          </Tooltip.Root> */}

          {/* <Button.Root
            variant='primary'
            mode='filled'
            size='small'
            className='shrink-0 gap-1'
            onClick={onAddOpex}
          >
            <Button.Icon>
              <RiAddLine size={20} />
            </Button.Icon>
            Add OPEX
          </Button.Root> */}
        </div>
      </div>
    </div>
  );
};

export default OpexToolbar;
