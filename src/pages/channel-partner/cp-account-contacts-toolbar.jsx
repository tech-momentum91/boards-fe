import React, { useState, useRef, useEffect } from 'react';
import { RiAddLine, RiSearchLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import TableVariantToggle from '@/components/ui/table-variant-toggle';
import CpContactsFilterDropdown from './cp-contacts-filter-dropdown';

const CP_ACCOUNT_CONTACTS_SEARCH_PLACEHOLDER = 'Search by name, email';

const CpAccountContactsToolbar = ({
  search,
  onSearchChange,
  onAddContact,
  tableVariant,
  onTableVariantToggle,
  onFiltersChange,
  appliedFilters = {},
  filterOptions = {},
  filterOptionsLoading = false,
}) => {
  const [searchValue, setSearchValue] = useState(search || '');
  const searchTimeoutRef = useRef(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const filterDropdownRef = useRef(null);

  useEffect(() => {
    setSearchValue(search || '');
  }, [search]);

  const handleSearch = ({ target: { value } }) => {
    setSearchValue(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => onSearchChange?.(value), 500);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const handleClearAllFilters = (e) => {
    e?.stopPropagation?.();
    onFiltersChange?.({});
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
            placeholder={CP_ACCOUNT_CONTACTS_SEARCH_PLACEHOLDER}
            value={searchValue}
            onChange={handleSearch}
            aria-label='Search CP contacts'
          />
        </Input.Wrapper>
      </Input.Root>

      <div className='flex flex-wrap items-center gap-3'>
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
            ariaLabel='Filter CP contacts'
          />
          <CpContactsFilterDropdown
            ref={filterDropdownRef}
            open={isFilterDropdownOpen}
            setFilterCount={setFilterCount}
            onFiltersChange={onFiltersChange}
            appliedFilters={appliedFilters}
            filterOptions={filterOptions}
            filterOptionsLoading={filterOptionsLoading}
          />
        </Popover.Root>

        {/* <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <span className='inline-flex'>
              <TableVariantToggle variant={tableVariant} onToggle={onTableVariantToggle} />
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Table Variant</p>
          </Tooltip.Content>
        </Tooltip.Root> */}

        <Button.Root size='small' className='gap-1' onClick={onAddContact}>
          <Button.Icon>
            <RiAddLine size={20} />
          </Button.Icon>
          Add CP Contact
        </Button.Root>
      </div>
    </header>
  );
};

export default CpAccountContactsToolbar;
