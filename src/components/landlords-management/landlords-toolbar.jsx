import React, { useState, useRef, useCallback, useMemo } from 'react';
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
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Popover from '@/components/ui/popover';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as LinkButton from '@/components/ui/link-button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Tooltip from '@/components/ui/tooltip';
import * as Filter from '@/components/ui/filter';
import CenterViewLandlordFilterDropdown, {
  DEFAULT_LANDLORD_VIEW_FILTERS,
} from '@/components/centers-management/center-view-landlord-filter-dropdown';
import { LANDLORDS_GROUP_BY_OPTIONS } from './constants';

const LandlordsToolbar = ({
  filters,
  onSearchChange,
  onCreateLandlord,
  tableRef,
  canWrite = false,
  pageLandlords = [],
  appliedLandlordFilters = DEFAULT_LANDLORD_VIEW_FILTERS,
  onLandlordFiltersChange,
  groupBy = '',
  onGroupByChange,
  groupOrder = 'asc',
  onGroupOrderChange,
}) => {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isLandlordFilterOpen, setIsLandlordFilterOpen] = useState(false);
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const landlordFilterRef = useRef(null);

  const setOrdButton = (value) =>
    onGroupOrderChange?.(typeof value === 'function' ? value(groupOrder) : value);

  const handleSearch = (event) => {
    onSearchChange?.(event.target.value);
  };

  const handleLandlordFiltersChange = useCallback(
    (next) => {
      onLandlordFiltersChange?.(next);
    },
    [onLandlordFiltersChange],
  );

  const handleClearLandlordFilters = useCallback(
    (e) => {
      e.stopPropagation();
      onLandlordFiltersChange?.(DEFAULT_LANDLORD_VIEW_FILTERS);
      setFilterCount(0);
      setIsLandlordFilterOpen(false);
    },
    [onLandlordFiltersChange],
  );

  const activeGroupLabel = useMemo(
    () => LANDLORDS_GROUP_BY_OPTIONS.find((o) => o.value === groupBy)?.label || groupBy || '',
    [groupBy],
  );

  return (
    <header className='flex flex-col lg:flex-row lg:items-center lg:justify-between'>
      <div />

      <div className='flex-1 flex flex-wrap items-center gap-3'>
        <Input.Root className='w-full lg:w-[372px]'>
          <Input.Wrapper>
            <Input.Icon>
              <RiSearchLine />
            </Input.Icon>
            <Input.Input
              placeholder='Search by landlord name, SPOC contact no, email, tags, shop no'
              value={filters.search}
              onChange={handleSearch}
              aria-label='Search landlords'
            />
          </Input.Wrapper>
        </Input.Root>
      </div>
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
                  className={`gap-2 flex items-center justify-center ${groupBy ? 'ring-1 ring-primary-base' : ''}`}
                  aria-label='Group by'
                >
                  <Button.Icon as={RiStackLine} />
                  {groupBy ? <span className='label-small'>{activeGroupLabel}</span> : null}
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
                        onGroupByChange?.('');
                      }}
                      size={18}
                      className='text-primary-dark bg-primary-light rounded-sm'
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
              <div className='w-full flex items-center justify-between'>
                <span className='text-subheading-2xs text-text-soft-400'>GROUP BY</span>
                <LinkButton.Root
                  variant='primary'
                  size='small'
                  onClick={() => {
                    setOrdButton('asc');
                    onGroupByChange?.('');
                    setIsGroupByOpen(false);
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
                options={LANDLORDS_GROUP_BY_OPTIONS}
                size='small'
                placeholder='Select field'
                searchPlaceholder='Search field...'
                showArrow
                isolateSearchKeyboard
              />

              <ButtonGroup.Root>
                <ButtonGroup.Item
                  data-state={groupOrder === 'asc' ? 'on' : 'off'}
                  onClick={() => setOrdButton('asc')}
                  className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
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
                  onClick={() => setOrdButton('desc')}
                  className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
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

        <Popover.Root
          open={isLandlordFilterOpen}
          onOpenChange={(open) => {
            const wasOpen = isLandlordFilterOpen;
            setIsLandlordFilterOpen(open);
            if (wasOpen && !open && landlordFilterRef.current) {
              landlordFilterRef.current.handleClose();
            }
          }}
        >
          <Filter.TriggerButton
            filterCount={filterCount}
            onClear={handleClearLandlordFilters}
            tooltipContent='Filter landlords'
            ariaLabel='Filter landlords'
          />
          <CenterViewLandlordFilterDropdown
            ref={landlordFilterRef}
            open={isLandlordFilterOpen}
            setFilterCount={setFilterCount}
            onFiltersChange={handleLandlordFiltersChange}
            appliedFilters={appliedLandlordFilters}
            pageLandlords={pageLandlords}
          />
        </Popover.Root>
        <ColumnManagerDropdown
          open={isColumnManagerOpen}
          onOpenChange={setIsColumnManagerOpen}
          columns={tableRef?.current?.columnConfig || []}
          onReorder={(start, end) => tableRef?.current?.reorderColumns?.(start, end)}
          onToggleVisibility={(id) => tableRef?.current?.toggleColumnVisibility?.(id)}
          onShowAll={() => tableRef?.current?.showAllColumns?.()}
          onHideAll={() => tableRef?.current?.hideAllColumns?.()}
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
          <Button.Root size='small' className='gap-1' onClick={onCreateLandlord}>
            <Button.Icon>
              <RiAddLine />
            </Button.Icon>
            Add Landlord
          </Button.Root>
        )}
      </div>
    </header>
  );
};

export default LandlordsToolbar;
