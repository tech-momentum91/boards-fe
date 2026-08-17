import React, { useEffect, useRef, useState } from 'react';
import { RiGroupLine, RiLayoutColumnLine, RiSearchLine, RiStackLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import * as Dropdown from '@/components/ui/dropdown';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import AgreementsFilterDropdown from '@/components/agreements/agreements-filter-dropdown';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

/**
 * Toolbar for pending agreements: search, group-by (icon + menu; API wiring later), filter, column manager.
 */
const AgreementsPendingToolbar = ({
  slotBeforeToolbar,
  filters,
  onSearchChange,
  onFiltersChange,
  appliedFilters,
  clientOptions,
  centerOptions,
  membershipPlanOptions,
  statusOptions,
  tableRef,
  groupBy = 'none',
  onGroupByChange,
}) => {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [groupByMenuOpen, setGroupByMenuOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const [searchValue, setSearchValue] = useState(filters?.search || '');
  const searchTimeoutRef = useRef(null);
  const filterDropdownRef = useRef(null);

  useEffect(() => {
    setSearchValue(filters?.search || '');
  }, [filters?.search]);

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
    e?.stopPropagation();
    onFiltersChange?.({
      client: [],
      center: [],
      membershipPlan: [],
      type: [],
      status: [],
    });
    setFilterCount(0);
    setIsFilterDropdownOpen(false);
  };

  // const groupByLabel = GROUP_BY_OPTIONS.find((o) => o.value === groupBy)?.label ?? 'Group by';

  return (
    <header className='flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:gap-4'>
      {slotBeforeToolbar ? <div className='shrink-0'>{slotBeforeToolbar}</div> : null}

      <div
        className={cn(
          'flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:ml-auto lg:w-auto',
        )}
      >
        <Input.Root className='w-full min-w-0 sm:max-w-[372px] lg:w-[372px]'>
          <Input.Wrapper>
            <Input.Icon>
              <RiSearchLine />
            </Input.Icon>
            <Input.Input
              placeholder='Search here...'
              value={searchValue}
              onChange={handleSearch}
              aria-label='Search pending agreements'
            />
          </Input.Wrapper>
        </Input.Root>

        <div className='flex w-full min-w-0 flex-wrap items-center gap-3 sm:w-auto'>
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
              ariaLabel='Filter pending agreements'
            />
            <AgreementsFilterDropdown
              ref={filterDropdownRef}
              open={isFilterDropdownOpen}
              setFilterCount={setFilterCount}
              onFiltersChange={onFiltersChange}
              appliedFilters={appliedFilters}
              clientOptions={clientOptions}
              centerOptions={centerOptions}
              membershipPlanOptions={membershipPlanOptions}
              statusOptions={statusOptions}
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
                type='button'
                className='gap-1'
                aria-label='Columns'
              >
                <Button.Icon>
                  <RiLayoutColumnLine size={20} />
                </Button.Icon>
              </Button.Root>
            }
          />
        </div>
      </div>
    </header>
  );
};

export default AgreementsPendingToolbar;
