import React, { useState, useRef, useEffect } from 'react';
import {
  RiSearchLine,
  RiAddLine,
  RiLayoutColumnLine,
  RiStackLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiCloseLine,
} from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as LinkButton from '@/components/ui/link-button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Filter from '@/components/ui/filter';
import VendorFilterDropdown from './vendor-filter-dropdown';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import VendorStatusTab from './vendor-status-tab';
import { DEFAULT_GROUP_BY_OPTIONS } from './constants';

const VendorToolbar = ({
  filters,
  isExporting = false,
  onSearchChange,
  onAddVendor,
  onExport,
  onFiltersChange,
  appliedFilters,
  tableVariant,
  onTableVariantToggle,
  tableRef,
  statusTab,
  setStatusTab,
  statusCounts,
  categoryOptions = [],
  subCategoryOptions = [],
  centerOptions = [],
  isLoadingOptions = false,
  canCreate = true,
  groupBy = '',
  groupOrder = 'asc',
  onGroupByChange,
  onGroupOrderChange,
  groupByOptions = DEFAULT_GROUP_BY_OPTIONS,
  showGroupBy = true,
  showColumnManager = true,
}) => {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(filters?.search || '');
  const searchTimeoutRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const [filterCount, setFilterCount] = useState(0);

  const ordButton = groupOrder;
  const setOrdButton = (value) =>
    onGroupOrderChange?.(typeof value === 'function' ? value(groupOrder) : value);

  const handleClearAllFilters = (e) => {
    e.stopPropagation();
    const clearedFilters = { category: [], subCategory: [], center: [] };
    onFiltersChange?.(clearedFilters);
    setFilterCount(0);
    setIsFilterDropdownOpen(false);
  };
  useEffect(() => {
    setSearchValue(filters?.search || '');
  }, [filters?.search]);

  const handleSearch = ({ target: { value } }) => {
    setSearchValue(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      onSearchChange?.(value);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  return (
    <header className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
      <div className='flex items-center gap-3'>
        <VendorStatusTab value={statusTab} onChange={setStatusTab} counts={statusCounts} />
      </div>

      <div className='flex flex-wrap items-center gap-3 lg:ml-auto'>
        {/* Search */}
        <Input.Root className='w-full lg:w-[372px]'>
          <Input.Wrapper>
            <Input.Icon>
              <RiSearchLine />
            </Input.Icon>
            <Input.Input
              placeholder='Search by vendor name, contact name, or city'
              value={searchValue}
              onChange={handleSearch}
              aria-label='Search vendors'
            />
          </Input.Wrapper>
        </Input.Root>

        {/* Filters */}
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
            onClear={handleClearAllFilters}
            tooltipContent='Filter'
            ariaLabel='Filter vendors'
          />
          <VendorFilterDropdown
            ref={filterDropdownRef}
            open={isFilterDropdownOpen}
            setFilterCount={setFilterCount}
            onOpenChange={setIsFilterDropdownOpen}
            onFiltersChange={onFiltersChange}
            appliedFilters={appliedFilters}
            categoryOptions={categoryOptions}
            subCategoryOptions={subCategoryOptions}
            centerOptions={centerOptions}
            isLoadingOptions={isLoadingOptions}
          />
        </Popover.Root>

        {showGroupBy && (
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
                    {groupBy ? <span className='label-small'>{groupBy}</span> : null}
                    {groupBy ? (
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <span
                            className='cursor-pointer flex items-center justify-center'
                            onClick={(e) => {
                              e.stopPropagation();
                              setOrdButton((previous) => (previous === 'asc' ? 'desc' : 'asc'));
                            }}
                          >
                            {ordButton === 'asc' ? (
                              <RiArrowUpLine size={20} />
                            ) : (
                              <RiArrowDownLine size={20} />
                            )}
                          </span>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          <span className='paragraph-xsmall'>
                            {ordButton === 'asc' ? 'Asc' : 'Desc'}
                          </span>
                        </Tooltip.Content>
                      </Tooltip.Root>
                    ) : null}
                    {groupBy ? (
                      <RiCloseLine
                        onClick={() => onGroupByChange?.('')}
                        size={18}
                        className='text-primary-dark bg-primary-light rounded-sm'
                      />
                    ) : null}
                  </Button.Root>
                </Popover.Trigger>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <span className='paragraph-xsmall'>Group-By</span>
              </Tooltip.Content>
            </Tooltip.Root>
            <Popover.Content align='left' className='w-[300px] p-3'>
              <div className='flex w-full flex-col gap-2'>
                <div className='flex w-full items-center justify-between'>
                  <span className='text-subheading-2xs text-text-soft-400'>GROUP BY </span>

                  <LinkButton.Root
                    variant='primary'
                    size='small'
                    onClick={() => {
                      onGroupOrderChange?.('asc');
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
                  options={groupByOptions.map((opt) => ({ value: opt, label: opt }))}
                  placeholder='Select group by'
                  triggerClassName='w-full'
                />

                <ButtonGroup.Root>
                  <ButtonGroup.Item
                    data-state={ordButton === 'asc' ? 'on' : 'off'}
                    onClick={() => setOrdButton('asc')}
                    className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
                  >
                    <ButtonGroup.Icon
                      data-state={ordButton === 'asc' ? 'on' : 'off'}
                      className='data-[state=on]:text-primary-base '
                      as={RiArrowUpLine}
                    />
                    Ascending
                  </ButtonGroup.Item>
                  <ButtonGroup.Item
                    data-state={ordButton === 'desc' ? 'on' : 'off'}
                    onClick={() => setOrdButton('desc')}
                    className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1  data-[state=on]:ring-primary-base'
                  >
                    <ButtonGroup.Icon
                      data-state={ordButton === 'desc' ? 'on' : 'off'}
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

        {/* Table Variant Toggle */}
        {/* <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <TableVariantToggle variant={tableVariant} onToggle={onTableVariantToggle} />
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Table Variant</p>
          </Tooltip.Content>
        </Tooltip.Root> */}

        {/* Column Manager (flat list only — same as team support toolbar) */}
        {showColumnManager && (
          <ColumnManagerDropdown
            open={isColumnManagerOpen}
            onOpenChange={setIsColumnManagerOpen}
            config={tableRef?.current?.columnConfigHook}
            tooltipContent={<p>Column Manager</p>}
            trigger={
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                className='gap-1'
              >
                <Button.Icon>
                  <RiLayoutColumnLine size={18} />
                </Button.Icon>
              </Button.Root>
            }
          />
        )}

        {/* Add Vendor */}
        {canCreate && (
          <Button.Root size='small' className='gap-1' onClick={onAddVendor}>
            <Button.Icon>
              <RiAddLine size={20} />
            </Button.Icon>
            Create Vendor
          </Button.Root>
        )}
      </div>
    </header>
  );
};

export default VendorToolbar;
