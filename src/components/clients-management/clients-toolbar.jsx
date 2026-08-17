import React, { useState, useRef, useEffect } from 'react';
import { RiAddLine, RiDownloadLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';
import { useSelector } from 'react-redux';
import { hasModulePermission } from '@/utils/user-role-utils';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import TableVariantToggle from '@/components/ui/table-variant-toggle';
import { cn } from '@/lib/utils';
import ClientsFilterDropdown from './clients-filter-dropdown';
import { FILTER_TABS } from './constants';

/** `filter-row` — Figma Frame 6 filter bar: single 36px row (matches list page layout). */
const ClientsToolbar = ({
  layout = 'responsive',
  className,
  filters,
  onSearchChange,
  onFilterClick: _onFilterClick, // Unused - replaced with onFiltersChange
  onExport,
  onCreateClient,
  tableRef,
  tableVariant,
  onTableVariantToggle,
  onFiltersChange, // New callback for filter changes
  appliedFilters = {}, // Applied filters object
}) => {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const filterDropdownRef = useRef(null);
  const { userSideBarPerm } = useSelector((state) => state.auth);

  const canWrite = hasModulePermission(userSideBarPerm, 'Customer', 'write');
  const isFilterRow = layout === 'filter-row';

  const handleSearch = (event) => {
    onSearchChange?.(event.target.value);
  };

  // Handle clear all filters
  const handleClearAllFilters = (e) => {
    e.stopPropagation(); // Prevent popover from opening
    const clearedFilters = {
      center: '',
      zone: '',
      floor: '',
      state: '',
      city: '',
      status: 'active',
    };
    // Clear filters and trigger API call
    onFiltersChange?.(clearedFilters);
    setFilterCount(0);
    // Close popover if open
    setIsFilterDropdownOpen(false);
  };

  return (
    <header className={cn('w-full shrink-0', isFilterRow && 'h-9', className)}>
      <div
        className={cn(
          'flex w-full gap-3',
          isFilterRow
            ? 'h-9 flex-row items-center justify-between'
            : 'min-h-9 flex-col lg:flex-row lg:items-center lg:justify-between',
        )}
      >
        <Input.Root size='small' className='w-full lg:w-96'>
          <Input.Wrapper>
            <Input.Icon>
              <RiSearchLine />
            </Input.Icon>
            <Input.Input
              placeholder='Search by client name , center name, or SPOC name'
              value={filters.search}
              onChange={handleSearch}
              aria-label='Search clients'
            />
          </Input.Wrapper>
        </Input.Root>

        <div className='flex flex-wrap items-center gap-3'>
          <Popover.Root
            open={isFilterDropdownOpen}
            onOpenChange={(open) => {
              const wasOpen = isFilterDropdownOpen;
              setIsFilterDropdownOpen(open);
              // When popover closes (was open, now closed), trigger filter change
              if (wasOpen && !open && filterDropdownRef.current) {
                filterDropdownRef.current.handleClose();
              }
            }}
          >
            <Filter.TriggerButton
              filterCount={filterCount}
              onClear={handleClearAllFilters}
              tooltipContent='Filter'
              ariaLabel='Filter clients'
            />
            <ClientsFilterDropdown
              ref={filterDropdownRef}
              open={isFilterDropdownOpen}
              setFilterCount={setFilterCount}
              onOpenChange={setIsFilterDropdownOpen}
              onFiltersChange={onFiltersChange}
              appliedFilters={appliedFilters}
              multiSelectTabs={[
                FILTER_TABS.CENTER,
                FILTER_TABS.ZONE,
                FILTER_TABS.FLOOR,
                FILTER_TABS.STATE,
                FILTER_TABS.CITY,
              ]}
            />
          </Popover.Root>

          {/* <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              className='gap-1'
              onClick={onExport}
            >
              <Button.Icon>
                <RiDownloadLine size={20} />
              </Button.Icon>
            </Button.Root>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Export</p>
          </Tooltip.Content>
        </Tooltip.Root> */}

          {/* <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <TableVariantToggle variant={tableVariant} onToggle={onTableVariantToggle} />
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Table Variant</p>
          </Tooltip.Content>
          </Tooltip.Root> */}

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

          {canWrite && (
            <Button.Root size='small' className='gap-1' onClick={onCreateClient}>
              <Button.Icon>
                <RiAddLine size={20} />
              </Button.Icon>
              Add Client
            </Button.Root>
          )}
        </div>
      </div>
    </header>
  );
};

export default ClientsToolbar;
