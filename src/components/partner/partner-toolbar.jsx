import React, { useRef, useState } from 'react';
import { RiSearchLine, RiLayoutColumnLine, RiDownloadLine, RiAddLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import PartnerFilterDropdown from '@/components/partner/partner-filter-dropdown';
import PartnerViewToggle, { VIEW_LIST } from '@/components/partner/partner-view-toggle';

const PartnerToolbar = ({
  searchValue,
  onSearchChange,
  onClearFilters,
  appliedFilters,
  onFiltersChange,
  ownerOptions = [],
  onboardingStageFilterOptions,
  tableRef,
  isColumnManagerOpen,
  onOpenColumnManagerChange,
  onExport,
  onAddPartner,
  view,
  onViewChange,
}) => {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const filterDropdownRef = useRef(null);

  const handleFilterClear = (e) => {
    e?.stopPropagation?.();
    onClearFilters?.();
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
            placeholder='Search by partner name, city, category or...'
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label='Search partners'
          />
        </Input.Wrapper>
      </Input.Root>

      <div className='flex flex-wrap items-center gap-3'>
        {/* Filter */}
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
            tooltipContent='Filter partners'
            ariaLabel='Filter partners'
          />
          <PartnerFilterDropdown
            ref={filterDropdownRef}
            open={isFilterDropdownOpen}
            setFilterCount={setFilterCount}
            appliedFilters={appliedFilters}
            onFiltersChange={onFiltersChange}
            ownerOptions={ownerOptions}
            onboardingStageOptions={onboardingStageFilterOptions}
          />
        </Popover.Root>

        {view === VIEW_LIST && (
          <ColumnManagerDropdown
            open={isColumnManagerOpen}
            onOpenChange={onOpenColumnManagerChange}
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
        )}

        <Button.Root
          variant='neutral'
          mode='stroke'
          size='xsmall'
          className='gap-1'
          onClick={onExport}
        >
          <Button.Icon>
            <RiDownloadLine size={20} />
          </Button.Icon>
          {/* Exports */}
        </Button.Root>

        {onViewChange && (
          <PartnerViewToggle view={view} onViewChange={onViewChange} className='shrink-0' />
        )}

        <Button.Root size='xsmall' className='gap-1' onClick={onAddPartner}>
          <Button.Icon>
            <RiAddLine size={20} />
          </Button.Icon>
          Add Partner
        </Button.Root>
      </div>
    </header>
  );
};

export default PartnerToolbar;
