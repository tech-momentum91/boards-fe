import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  RiAddLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiCloseLine,
  RiLayoutColumnLine,
  RiSearchLine,
  RiStackLine,
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
import CpContactsFilterDropdown from './cp-contacts-filter-dropdown';
import { hasModulePermission } from '@/utils/user-role-utils';
import {
  CP_CONTACTS_SEARCH_PLACEHOLDER,
  CP_CONTACTS_GROUP_BY_OPTIONS,
  DEFAULT_CP_CONTACTS_FILTERS,
} from './constants-cp-contacts';

const CpContactsToolbar = ({
  filters = {},
  onSearchChange,
  onCreateContact,
  tableRef,
  onGroupByChange,
  groupBy = '',
  groupOrder = 'asc',
  onGroupOrderChange,
  groupByOptions = CP_CONTACTS_GROUP_BY_OPTIONS,
  onFiltersChange,
  appliedFilters = {},
  filterOptions = {},
  filterOptionsLoading = false,
  onOpenFilters,
}) => {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const filterDropdownRef = useRef(null);
  const [searchValue, setSearchValue] = useState(filters.search ?? filters.searchTerm ?? '');
  const searchTimeoutRef = useRef(null);

  const emptyFilters = { ...DEFAULT_CP_CONTACTS_FILTERS };

  const handleClearAllFilters = (e) => {
    e?.stopPropagation?.();
    onFiltersChange?.(emptyFilters);
    setFilterCount(0);
    setIsFilterDropdownOpen(false);
  };

  const handleFilterOpenChange = (open) => {
    const wasOpen = isFilterDropdownOpen;
    setIsFilterDropdownOpen(open);
    if (open && !wasOpen && onOpenFilters) onOpenFilters();
    if (wasOpen && !open && filterDropdownRef.current) {
      filterDropdownRef.current.handleClose?.();
    }
  };

  const ordBtn = groupOrder;
  const setOrdBtn = (value) =>
    onGroupOrderChange?.(typeof value === 'function' ? value(groupOrder) : value);

  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const canWrite = hasModulePermission(userSideBarPerm, 'Channel Partner', 'write');

  const externalSearch = filters.search ?? filters.searchTerm ?? '';
  useEffect(() => {
    setSearchValue((prev) => (prev !== externalSearch ? externalSearch : prev));
  }, [externalSearch]);

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

  return (
    <header className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
      <Input.Root className='w-full lg:w-[372px]'>
        <Input.Wrapper>
          <Input.Icon>
            <RiSearchLine />
          </Input.Icon>
          <Input.Input
            placeholder={CP_CONTACTS_SEARCH_PLACEHOLDER}
            value={searchValue}
            onChange={handleSearch}
            aria-label='Search CP Contacts'
          />
        </Input.Wrapper>
      </Input.Root>

      <div className='flex flex-wrap items-center gap-3'>
        <Popover.Root open={isGroupByOpen} onOpenChange={setIsGroupByOpen}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <span className='inline-flex'>
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
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <span
                            className='cursor-pointer flex items-center justify-center'
                            onClick={(e) => {
                              e.stopPropagation();
                              setOrdBtn((previous) => (previous === 'asc' ? 'desc' : 'asc'));
                            }}
                          >
                            {ordBtn === 'asc' ? (
                              <RiArrowUpLine size={20} />
                            ) : (
                              <RiArrowDownLine size={20} />
                            )}
                          </span>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          <span className='paragraph-xsmall'>
                            {ordBtn === 'asc' ? 'Asc' : 'Desc'}
                          </span>
                        </Tooltip.Content>
                      </Tooltip.Root>
                    ) : null}
                    {groupBy && (
                      <RiCloseLine
                        size={18}
                        className='text-primary-dark bg-primary-light rounded-sm'
                        onClick={(e) => {
                          e.stopPropagation();
                          onGroupByChange?.('');
                        }}
                        aria-hidden
                      />
                    )}
                  </Button.Root>
                </Popover.Trigger>
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <span className='paragraph-xsmall'>Group-By</span>
            </Tooltip.Content>
          </Tooltip.Root>
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
                  className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
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

        <Popover.Root open={isFilterDropdownOpen} onOpenChange={handleFilterOpenChange}>
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

        {/* {canWrite && (
          <Button.Root
            variant='primary'
            mode='filled'
            size='small'
            className='gap-1'
            onClick={onCreateContact}
          >
            <Button.Icon>
              <RiAddLine size={20} />
            </Button.Icon>
            Add Contact
          </Button.Root>
        )} */}
        <Button.Root size='small' className='gap-1' onClick={onCreateContact}>
          <Button.Icon>
            <RiAddLine size={20} />
          </Button.Icon>
          Add CP Contact
        </Button.Root>
      </div>
    </header>
  );
};

export default CpContactsToolbar;
