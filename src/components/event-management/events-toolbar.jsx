import React, { useEffect, useRef, useState } from 'react';
import { RiLayoutColumnLine, RiSearchLine, RiAddLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import { EVENT_FILTER_CONFIG } from '@/components/event-management/constant';
import EventsFilterDropdown from '@/components/event-management/events-filter-dropdown';

/**
 * Generic toolbar for Events module (shared by micro / external / community).
 * Includes search, filter button (hooked to a dropdown passed from parent),
 * column manager, and \"Add Event\" button.
 */
const EventsToolbar = ({
  moduleType = 'spotlight',
  filters,
  onSearchChange,
  onFiltersChange,
  appliedFilters,
  centerOptions,
  partnerOptions,
  statusOptions,
  engagementModeOptions,
  revenueModeOptions,
  categoryOptions,
  participationTypeOptions,
  tableRef,
  onAddEvent,
}) => {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const [searchValue, setSearchValue] = useState(filters?.search || '');
  const searchTimeoutRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const filterConfig = EVENT_FILTER_CONFIG[moduleType] || [];

  useEffect(() => {
    setSearchValue(filters?.search || '');
  }, [filters?.search]);

  const handleSearch = ({ target: { value } }) => {
    setSearchValue(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      onSearchChange?.(value);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleClearAllFilters = (e) => {
    e?.stopPropagation();
    // Parent merges filters (`{ ...prev, ...next }`), so we must explicitly
    // overwrite each filter key to truly clear everything.
    onFiltersChange?.({
      center: [],
      partner: [],
      engagement_mode: [],
      revenue_mode: [],
      category: [],
      participation_type: [],
      status: [],
      search: '',
    });
    setFilterCount(0);
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
            placeholder='Search events...'
            value={searchValue}
            onChange={handleSearch}
            aria-label='Search events'
          />
        </Input.Wrapper>
      </Input.Root>

      <div className='flex flex-wrap items-center gap-3'>
        <Popover.Root
          open={isFilterDropdownOpen}
          onOpenChange={(open) => {
            const wasOpen = isFilterDropdownOpen;
            setIsFilterDropdownOpen(open);
            if (wasOpen && !open && filterDropdownRef.current?.handleClose) {
              filterDropdownRef.current.handleClose();
            }
          }}
        >
          <Filter.TriggerButton
            filterCount={filterCount}
            onClear={handleClearAllFilters}
            tooltipContent='Filter'
            ariaLabel='Filter events'
          />
          <EventsFilterDropdown
            ref={filterDropdownRef}
            open={isFilterDropdownOpen}
            setFilterCount={setFilterCount}
            onFiltersChange={onFiltersChange}
            appliedFilters={appliedFilters}
            filterConfig={filterConfig}
            centerOptions={centerOptions}
            partnerOptions={partnerOptions}
            statusOptions={statusOptions}
            engagementModeOptions={engagementModeOptions}
            revenueModeOptions={revenueModeOptions}
            categoryOptions={categoryOptions}
            participationTypeOptions={participationTypeOptions}
          />
        </Popover.Root>

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

        {onAddEvent && (
          <Button.Root size='small' className='gap-1' onClick={onAddEvent}>
            <Button.Icon>
              <RiAddLine size={20} />
            </Button.Icon>
            Add Event
          </Button.Root>
        )}
      </div>
    </header>
  );
};

export default EventsToolbar;
