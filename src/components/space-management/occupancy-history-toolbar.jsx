import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiCloseLine,
  RiSearchLine,
  RiStackLine,
} from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as Select from '@/components/ui/select';
import * as LinkButton from '@/components/ui/link-button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Tooltip from '@/components/ui/tooltip';
import * as Filter from '@/components/ui/filter';
import { DEFAULT_OCCUPANCY_FILTERS, OCCUPANCY_GROUP_BY_OPTIONS } from './constants';
import OccupancyHistoryFilterDropdown from './occupancy-history-filter-dropdown';

const OccupancyHistoryToolbar = ({
  search = '',
  onSearchChange,
  groupBy = '',
  onGroupByChange,
  groupOrder = 'asc',
  onGroupOrderChange,
  appliedFilters = DEFAULT_OCCUPANCY_FILTERS,
  onFiltersChange,
  clientOptions = [],
  columnMaxLimits = {},
  columnManagerAction = null,
  allocateClientAction = null,
}) => {
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const filterDropdownRef = useRef(null);

  const setOrdButton = (value) =>
    onGroupOrderChange?.(typeof value === 'function' ? value(groupOrder) : value);

  const activeGroupLabel = useMemo(
    () => OCCUPANCY_GROUP_BY_OPTIONS.find((o) => o.value === groupBy)?.label || groupBy || '',
    [groupBy],
  );

  const handleClearAllFilters = useCallback(
    (e) => {
      e.stopPropagation();
      onFiltersChange?.({ ...DEFAULT_OCCUPANCY_FILTERS });
      setFilterCount(0);
      setIsFilterDropdownOpen(false);
    },
    [onFiltersChange],
  );

  return (
    <header className='mt-4 flex items-center justify-between gap-3'>
      <Input.Root className='min-w-[240px] w-full max-w-[372px]'>
        <Input.Wrapper>
          <Input.Icon>
            <RiSearchLine />
          </Input.Icon>
          <Input.Input
            placeholder='Search client'
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            aria-label='Search occupancy history by client name'
          />
        </Input.Wrapper>
      </Input.Root>

      <div className='flex items-center gap-2 shrink-0'>
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

              <Select.Root
                value={groupBy || ''}
                onValueChange={(value) => {
                  onGroupByChange?.(value);
                  setIsGroupByOpen(false);
                }}
                size='small'
              >
                <Select.Trigger className='w-full'>
                  <Select.Value placeholder='Select field' />
                </Select.Trigger>
                <Select.Content>
                  {OCCUPANCY_GROUP_BY_OPTIONS.map((opt) => (
                    <Select.Item key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>

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
            ariaLabel='Filter occupancy history'
          />
          <OccupancyHistoryFilterDropdown
            ref={filterDropdownRef}
            open={isFilterDropdownOpen}
            setFilterCount={setFilterCount}
            onFiltersChange={onFiltersChange}
            appliedFilters={appliedFilters}
            clientOptions={clientOptions}
            columnMaxLimits={columnMaxLimits}
          />
        </Popover.Root>

        {columnManagerAction}
        {allocateClientAction}
      </div>
    </header>
  );
};

export default OccupancyHistoryToolbar;
