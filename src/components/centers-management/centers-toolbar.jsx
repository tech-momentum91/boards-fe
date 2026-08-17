import React, { useState, useRef, useEffect } from 'react';
import { RiAddLine, RiLayoutColumnLine, RiSearchLine, RiDownloadLine } from 'react-icons/ri';
import { useSelector } from 'react-redux';
import { hasModulePermission } from '@/utils/user-role-utils';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import TableVariantToggle from '@/components/ui/table-variant-toggle';
import CentersFilterDropdown from './centers-filter-dropdown';

const CentersToolbar = ({
  filters,
  isExporting = false,
  onSearchChange,
  onCreateCenter,
  onFilterClick: _onFilterClick, // Unused - replaced with onFiltersChange
  onColumnsClick: _onColumnsClick, // Unused prop - kept for API compatibility
  tableRef, // Reference to the table component
  tableVariant, // Current table variant
  onTableVariantToggle, // Callback to toggle table variant
  onExport,
  onFiltersChange, // New callback for filter changes
  appliedFilters = {}, // Applied filters object
}) => {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const filterDropdownRef = useRef(null);
  const { userSideBarPerm } = useSelector((state) => state.auth);

  const canWrite = hasModulePermission(userSideBarPerm, 'Center', 'write');

  const handleSearch = (event) => {
    onSearchChange?.(event.target.value);
  };

  // Handle clear all filters
  const handleClearAllFilters = (e) => {
    e.stopPropagation(); // Prevent popover from opening
    const clearedFilters = {
      zone: [],
      state: [],
      city: [],
      status: [],
      micro_market: [],
      carpet_area: null,
    };
    // Clear filters and trigger API call
    onFiltersChange?.([], clearedFilters);
    setFilterCount(0);
    // Close popover if open
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
            placeholder='Search center'
            value={filters.search}
            onChange={handleSearch}
            aria-label='Search centers'
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
            ariaLabel='Filter centers'
          />
          <CentersFilterDropdown
            ref={filterDropdownRef}
            open={isFilterDropdownOpen}
            setFilterCount={setFilterCount}
            onOpenChange={setIsFilterDropdownOpen}
            onFiltersChange={onFiltersChange}
            appliedFilters={appliedFilters}
          />
        </Popover.Root>
        {/*
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <TableVariantToggle variant={tableVariant} onToggle={onTableVariantToggle} />
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Table Variant</p>
          </Tooltip.Content>
        </Tooltip.Root> */}

        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              className='gap-1'
              onClick={onExport}
              disabled={isExporting}
              aria-busy={isExporting}
              aria-label='Export centers'
            >
              <Button.Icon>
                <RiDownloadLine size={20} />
              </Button.Icon>
            </Button.Root>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Export centers as PDF</p>
          </Tooltip.Content>
        </Tooltip.Root>

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
          <Button.Root size='small' className='gap-1' onClick={onCreateCenter}>
            <Button.Icon>
              <RiAddLine size={20} />
            </Button.Icon>
            Create Center
          </Button.Root>
        )}
      </div>
    </header>
  );
};

export default CentersToolbar;
