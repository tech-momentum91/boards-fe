import React, { useState, useRef, useEffect } from 'react';
import {
  RiAddLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiCloseLine,
  RiDownloadLine,
  RiLayoutColumnLine,
  RiSearchLine,
  RiStackLine,
} from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import * as Select from '@/components/ui/select';
import * as LinkButton from '@/components/ui/link-button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Filter from '@/components/ui/filter';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import TableVariantToggle from '@/components/ui/table-variant-toggle';
import TeamFilterDropdown from './team-filter-dropdown';

const DEFAULT_GROUP_BY_OPTIONS = ['Center', 'Role', 'Status'];

const TeamToolbar = ({
  filters,
  isExporting = false,
  onSearchChange,
  onAddMember,
  onExport,
  tableRef,
  tableVariant,
  onTableVariantToggle,
  onGroupByChange,
  groupBy,
  groupOrder = 'asc',
  onGroupOrderChange,
  onFiltersChange,
  appliedFilters,
  showStatusFilter = true,
  showFilter = true,
  showGroupBy = true,
  showColumnManager = true,
  roleOptions,
  groupByOptions = DEFAULT_GROUP_BY_OPTIONS,
  showAddButton = true,
}) => {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const searchTimeoutRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const [filterCount, setFilterCount] = useState(0);

  const ordButton = groupOrder;
  const setOrdButton = (value) =>
    onGroupOrderChange?.(typeof value === 'function' ? value(groupOrder) : value);

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
            placeholder='Search'
            value={searchValue}
            onChange={handleSearch}
            aria-label='Search team members'
          />
        </Input.Wrapper>
      </Input.Root>

      <div className='flex flex-wrap items-center gap-3'>
        {showFilter && (
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
              onClear={(e) => {
                e.stopPropagation();
                const clearedFilters = {
                  center: [],
                  status: [],
                  role: [],
                };
                onFiltersChange?.([], clearedFilters);
                setFilterCount(0);
                setIsFilterDropdownOpen(false);
              }}
              tooltipContent='Filter'
              ariaLabel='Filter team members'
            />
            <TeamFilterDropdown
              ref={filterDropdownRef}
              open={isFilterDropdownOpen}
              setFilterCount={setFilterCount}
              onOpenChange={setIsFilterDropdownOpen}
              onFiltersChange={onFiltersChange}
              appliedFilters={appliedFilters}
              showStatusTab={showStatusFilter}
              roleOptions={roleOptions}
            />
          </Popover.Root>
        )}

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
                    {groupBy && <span className='label-small'>{groupBy}</span>}
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
                    {groupBy && (
                      <RiCloseLine
                        onClick={() => onGroupByChange?.('')}
                        size={18}
                        className='text-primary-dark bg-primary-light rounded-sm'
                      />
                    )}
                  </Button.Root>
                </Popover.Trigger>
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
                      setOrdButton('');
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

        {showColumnManager && tableRef?.current?.columnConfigHook && (
          <ColumnManagerDropdown
            open={isColumnManagerOpen}
            onOpenChange={setIsColumnManagerOpen}
            config={tableRef.current.columnConfigHook}
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

        {/* <Tooltip.Root>
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
              aria-label='Export team members'
            >
              <Button.Icon>
                <RiDownloadLine size={20} />
              </Button.Icon>
            </Button.Root>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Export</p>
          </Tooltip.Content>
        </Tooltip.Root>

        {showAddButton && onAddMember && (
          <Button.Root size='small' className='gap-1' onClick={onAddMember}>
            <Button.Icon>
              <RiAddLine size={20} />
            </Button.Icon>
            Add Member
          </Button.Root>
        )}
      </div>
    </header>
  );
};

export default TeamToolbar;
