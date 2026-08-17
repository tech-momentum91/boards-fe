import React, { useEffect, useRef, useState } from 'react';
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiCloseLine,
  RiLayoutColumnLine,
  RiSearchLine,
  RiAddLine,
  RiStackLine,
  RiDownloadLine,
} from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Input from '@/components/ui/input';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as LinkButton from '@/components/ui/link-button';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import AgreementsFilterDropdown from '@/components/agreements/agreements-filter-dropdown';
import { AGREEMENTS_GROUP_BY_OPTIONS } from '@/components/agreements/constants';
import { cn } from '@/utils/cn';

const AgreementsToolbar = ({
  mode = 'client',
  filters,
  onSearchChange,
  onFiltersChange,
  appliedFilters,
  clientOptions,
  centerOptions,
  membershipPlanOptions,
  typeOptions,
  statusOptions,
  tableRef,
  onCreateAgreement,
  permissions = {},
  /** Optional slot (e.g. Active / Pending ButtonGroup) rendered before search — same pattern as billing categories. */
  slotBeforeToolbar,
  /** Controlled group-by (client active list). Omit to use internal state (e.g. landlord). */
  groupBy: groupByProp,
  onGroupByChange,
  groupOrder: groupOrderProp,
  onGroupOrderChange,
}) => {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const [internalGroupBy, setInternalGroupBy] = useState('');
  const [internalGroupOrder, setInternalGroupOrder] = useState('asc');
  const [filterCount, setFilterCount] = useState(0);
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const searchTimeoutRef = useRef(null);
  const filterDropdownRef = useRef(null);

  const isGroupControlled = typeof onGroupByChange === 'function';
  const groupBy = isGroupControlled ? (groupByProp ?? '') : internalGroupBy;
  const groupOrder = isGroupControlled ? (groupOrderProp ?? 'asc') : internalGroupOrder;

  const setGroupBy = (next) => {
    const value = typeof next === 'function' ? next(groupBy) : next;
    if (isGroupControlled) onGroupByChange(value);
    else setInternalGroupBy(value);
  };

  const setGroupOrder = (next) => {
    const value = typeof next === 'function' ? next(groupOrder) : next;
    if (isGroupControlled) onGroupOrderChange?.(value);
    else setInternalGroupOrder(value);
  };

  const activeGroupLabel =
    AGREEMENTS_GROUP_BY_OPTIONS.find((o) => o.value === groupBy)?.label || groupBy || '';

  const setGroupOrderValue = (value) =>
    setGroupOrder(typeof value === 'function' ? value(groupOrder) : value);

  const canCreate = Boolean(permissions.canCreate);

  useEffect(() => {
    setSearchValue(filters.search || '');
  }, [filters.search]);

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
              aria-label='Search agreements'
            />
          </Input.Wrapper>
        </Input.Root>

        <div className='flex flex-wrap items-center gap-3'>
          <Popover.Root open={isGroupByOpen} onOpenChange={setIsGroupByOpen}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Popover.Trigger asChild>
                  <Button.Root
                    type='button'
                    variant={groupBy ? 'primary' : 'neutral'}
                    mode={groupBy ? 'lighter' : 'stroke'}
                    size='small'
                    className={cn(
                      'gap-2 flex items-center justify-center',
                      groupBy && 'ring-1 ring-primary-base',
                    )}
                    aria-label='Group by'
                  >
                    <Button.Icon as={RiStackLine} />
                    {groupBy ? <span className='label-small'>{activeGroupLabel}</span> : null}
                    {groupBy ? (
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <span
                            className='flex cursor-pointer items-center justify-center'
                            onClick={(e) => {
                              e.stopPropagation();
                              setGroupOrderValue((previous) =>
                                previous === 'asc' ? 'desc' : 'asc',
                              );
                            }}
                          >
                            {groupOrder === 'asc' ? (
                              <RiArrowUpLine size={20} />
                            ) : (
                              <RiArrowDownLine size={20} />
                            )}
                          </span>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          <span className='paragraph-xsmall'>
                            {groupOrder === 'asc' ? 'Ascending' : 'Descending'}
                          </span>
                        </Tooltip.Content>
                      </Tooltip.Root>
                    ) : null}
                    {groupBy ? (
                      <RiCloseLine
                        onClick={(e) => {
                          e.stopPropagation();
                          setGroupBy('');
                        }}
                        size={18}
                        className='rounded-sm bg-primary-light text-primary-dark'
                        aria-label='Clear group by'
                      />
                    ) : null}
                  </Button.Root>
                </Popover.Trigger>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <span className='paragraph-xsmall'>Group by</span>
              </Tooltip.Content>
            </Tooltip.Root>

            <Popover.Content align='end' className='w-[300px] p-3'>
              <div className='flex w-full flex-col gap-2'>
                <div className='flex w-full items-center justify-between'>
                  <span className='text-subheading-2xs text-text-soft-400'>GROUP BY</span>
                  <LinkButton.Root
                    variant='primary'
                    size='small'
                    onClick={() => {
                      setGroupOrder('asc');
                      setGroupBy('');
                      setIsGroupByOpen(false);
                    }}
                  >
                    Clear
                  </LinkButton.Root>
                </div>

                <SearchableSelect
                  value={groupBy || ''}
                  onValueChange={(value) => {
                    setGroupBy(value);
                    setIsGroupByOpen(false);
                  }}
                  size='small'
                  options={AGREEMENTS_GROUP_BY_OPTIONS}
                  placeholder='Select group by'
                  showArrow={true}
                  isolateSearchKeyboard
                />

                <ButtonGroup.Root>
                  <ButtonGroup.Item
                    data-state={groupOrder === 'asc' ? 'on' : 'off'}
                    onClick={() => setGroupOrder('asc')}
                    className='w-full data-[state=on]:z-1 data-[state=on]:bg-primary-lighter data-[state=on]:ring-1 data-[state=on]:ring-primary-base'
                  >
                    <ButtonGroup.Icon
                      data-state={groupOrder === 'asc' ? 'on' : 'off'}
                      className='data-[state=on]:text-primary-base'
                      as={RiArrowUpLine}
                    />
                    Ascending
                  </ButtonGroup.Item>
                  <ButtonGroup.Item
                    data-state={groupOrder === 'desc' ? 'on' : 'off'}
                    onClick={() => setGroupOrder('desc')}
                    className='w-full data-[state=on]:z-1 data-[state=on]:bg-primary-lighter data-[state=on]:ring-1 data-[state=on]:ring-primary-base'
                  >
                    <ButtonGroup.Icon
                      data-state={groupOrder === 'desc' ? 'on' : 'off'}
                      className='data-[state=on]:text-primary-base'
                      as={RiArrowDownLine}
                    />
                    Descending
                  </ButtonGroup.Item>
                </ButtonGroup.Root>
              </div>
            </Popover.Content>
          </Popover.Root>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                className='gap-1'
                // onClick={onExport}
                // disabled={isExporting}
                // aria-busy={isExporting}
                aria-label='Export spaces'
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
              ariaLabel='Filter agreements'
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
                className='gap-1'
                aria-label='Columns'
              >
                <Button.Icon>
                  <RiLayoutColumnLine size={20} />
                </Button.Icon>
              </Button.Root>
            }
          />

          {onCreateAgreement && canCreate && (
            <Button.Root
              size='small'
              className='gap-1'
              onClick={() => {
                onCreateAgreement?.();
              }}
            >
              <Button.Icon>
                <RiAddLine size={20} />
              </Button.Icon>
              {mode === 'landlord' ? 'Create Agreement' : 'Create Agreement'}
            </Button.Root>
          )}
        </div>
      </div>
    </header>
  );
};

export default AgreementsToolbar;
