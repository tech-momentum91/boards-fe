import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  RiAddLine,
  RiDownloadLine,
  RiLayoutColumnLine,
  RiLayoutMasonryFill,
  RiLayoutMasonryLine,
  RiListCheck,
  RiSearchLine,
  RiStackLine,
} from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import TableVariantToggle from '@/components/ui/table-variant-toggle';
import * as ButtonGroup from '@/components/ui/button-group';
import SpaceFilterDropdown from './space-filter-dropdown';
import SpaceLayoutDownloadDropdown from './space-layout-download-dropdown';
import { hasModulePermission } from '@/utils/user-role-utils';

const SpaceToolbar = ({
  filters,
  isCommonAreaView = false,
  isParkingView = false,
  isExporting = false,
  isLayoutExporting = false,
  isLayoutView = false,
  viewMode = 'list',
  onViewModeChange,
  onSearchChange,
  onCreateSpace,
  onPdfExport,
  onLayoutDownload,
  onFiltersChange,
  appliedFilters,
  tableRef,
  tableVariant,
  onTableVariantToggle,
  layoutDownloadCenters = [],
}) => {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const searchTimeoutRef = useRef(null);
  const filterDropdownRef = useRef(null);

  const [filterCount, setFilterCount] = useState(0);

  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const canWrite = hasModulePermission(userSideBarPerm, 'Space', 'write');

  // Handle clear all filters
  const handleClearAllFilters = (e) => {
    e.stopPropagation(); // Prevent popover from opening
    const clearedFilters = {
      center: [],
      client: [],
      status: [],
      spaceType: [],
      availableSeats: '',
      zone: [],
      parkingType: [],
      assigningType: [],
    };
    // Clear filters and trigger API call
    onFiltersChange?.([], clearedFilters);
    setFilterCount(0);
    // Close popover if open
    setIsFilterDropdownOpen(false);
  };

  // Update local search value when filters.search changes externally
  useEffect(() => {
    setSearchValue(filters.search || '');
  }, [filters.search]);

  // Debounced search handler
  const handleSearch = ({ target: { value } }) => {
    setSearchValue(value);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      onSearchChange?.(value);
    }, 500);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <header className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
      <Input.Root className='w-full lg:w-[372px]'>
        <Input.Wrapper>
          <Input.Icon>
            <RiSearchLine />
          </Input.Icon>
          <Input.Input
            placeholder='Search by id, space name, or center'
            value={searchValue}
            onChange={handleSearch}
            aria-label='Search spaces'
          />
        </Input.Wrapper>
      </Input.Root>

      <div className='flex flex-wrap items-center gap-3'>
        <ButtonGroup.Root>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <ButtonGroup.Item
                type='button'
                aria-label='List view'
                title='List view'
                data-state={viewMode === 'list' ? 'on' : 'off'}
                onClick={() => onViewModeChange?.('list')}
                className='data-[state=on]:z-[1] data-[state=on]:bg-primary-lighter data-[state=on]:ring-1 data-[state=on]:ring-primary-base'
              >
                <ButtonGroup.Icon as={RiListCheck} />
              </ButtonGroup.Item>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>List view</p>
            </Tooltip.Content>
          </Tooltip.Root>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <ButtonGroup.Item
                type='button'
                aria-label='Layout view'
                title='Layout view'
                data-state={viewMode === 'layout' ? 'on' : 'off'}
                onClick={() => onViewModeChange?.('layout')}
                className='data-[state=on]:z-[1] data-[state=on]:bg-primary-lighter data-[state=on]:ring-1 data-[state=on]:ring-primary-base'
              >
                <ButtonGroup.Icon as={RiLayoutMasonryLine} />
              </ButtonGroup.Item>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Layout view</p>
            </Tooltip.Content>
          </Tooltip.Root>
        </ButtonGroup.Root>

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
            ariaLabel='Filter spaces'
          />
          <SpaceFilterDropdown
            ref={filterDropdownRef}
            open={isFilterDropdownOpen}
            setFilterCount={setFilterCount}
            onOpenChange={setIsFilterDropdownOpen}
            onFiltersChange={onFiltersChange}
            appliedFilters={appliedFilters}
            isParkingView={isParkingView}
            allowedTabs={viewMode === 'layout' ? ['client', 'spaceType', 'status'] : null}
          />
        </Popover.Root>

        {isLayoutView ? (
          <SpaceLayoutDownloadDropdown
            centers={layoutDownloadCenters}
            keyword={filters.search || ''}
            appliedFilters={appliedFilters}
            isExporting={isLayoutExporting}
            onDownload={onLayoutDownload}
          />
        ) : (
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                className='gap-1'
                onClick={onPdfExport}
                disabled={isExporting}
                aria-busy={isExporting}
                aria-label='Export spaces as PDF'
              >
                <Button.Icon>
                  <RiDownloadLine size={20} />
                </Button.Icon>
              </Button.Root>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Export as PDF</p>
            </Tooltip.Content>
          </Tooltip.Root>
        )}

        {viewMode === 'list' ? (
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
                className='gap-1'
                aria-label='Columns'
              >
                <Button.Icon>
                  <RiLayoutColumnLine size={20} />
                </Button.Icon>
              </Button.Root>
            }
          />
        ) : null}

        {/* <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <TableVariantToggle variant={tableVariant} onToggle={onTableVariantToggle} />
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Table Variant</p>
          </Tooltip.Content>
        </Tooltip.Root> */}

        {canWrite && !isParkingView && !isCommonAreaView && (
          <Button.Root size='small' className='gap-1' onClick={onCreateSpace}>
            <Button.Icon>
              <RiAddLine size={20} />
            </Button.Icon>
            Create Space
          </Button.Root>
        )}
      </div>
    </header>
  );
};

export default SpaceToolbar;
