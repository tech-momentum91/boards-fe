import React from 'react';
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiCloseLine,
  RiLayoutColumnLine,
  RiSearchLine,
  RiStackLine,
} from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as LinkButton from '@/components/ui/link-button';
import * as Tooltip from '@/components/ui/tooltip';
import * as ButtonGroup from '@/components/ui/button-group';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import ClientsFilterDropdown from '@/components/clients-management/clients-filter-dropdown';
import { FILTER_TABS } from '@/components/clients-management/constants';
import {
  PARTICIPANTS_FILTER_TAB_CONFIG,
  PARTICIPANTS_GROUP_BY_OPTIONS,
} from '@/components/event-management/constant';

const EventParticipantsToolbar = ({
  searchValue,
  onSearchChange,
  isFilterOpen,
  setIsFilterOpen,
  filterCount,
  setFilterCount,
  onClearAllFilters,
  onFiltersChange,
  appliedFilters,
  centerOptionsOverride,
  clientOptionsOverride,
  isGroupByOpen,
  setIsGroupByOpen,
  groupBy,
  setGroupBy,
  groupOrder,
  setGroupOrder,
  isColumnManagerOpen,
  setIsColumnManagerOpen,
  columnConfig,
}) => {
  return (
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <Input.Root size='small' className='min-w-0 w-full max-w-[560px] flex-1'>
        <Input.Wrapper>
          <Input.Icon as={RiSearchLine} />
          <Input.Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder='Search by center or client name'
          />
        </Input.Wrapper>
      </Input.Root>

      <div className='flex shrink-0 flex-wrap items-center justify-end gap-3'>
        <Popover.Root open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <Filter.TriggerButton
            filterCount={filterCount}
            onClear={onClearAllFilters}
            tooltipContent='Filter'
            ariaLabel='Filter participants'
          />
          <ClientsFilterDropdown
            open={isFilterOpen}
            setFilterCount={setFilterCount}
            onOpenChange={setIsFilterOpen}
            onFiltersChange={onFiltersChange}
            appliedFilters={appliedFilters}
            tabConfig={PARTICIPANTS_FILTER_TAB_CONFIG}
            multiSelectTabs={[FILTER_TABS.CENTER, FILTER_TABS.CLIENT]}
            centerOptionsOverride={centerOptionsOverride}
            clientOptionsOverride={clientOptionsOverride}
          />
        </Popover.Root>

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
                            setGroupOrder((previous) => (previous === 'asc' ? 'desc' : 'asc'));
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
                          {groupOrder === 'asc' ? 'Asc' : 'Desc'}
                        </span>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  ) : null}
                  {groupBy && (
                    <RiCloseLine
                      onClick={(e) => {
                        e.stopPropagation();
                        setGroupBy('');
                        setGroupOrder('asc');
                      }}
                      size={18}
                      className='text-primary-dark bg-primary-light rounded-sm'
                      aria-label='Clear group by'
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
                    setGroupOrder('asc');
                    setGroupBy('');
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
                options={PARTICIPANTS_GROUP_BY_OPTIONS}
                placeholder='Select group by'
                triggerClassName='w-full text-left'
                showArrow
              />

              <ButtonGroup.Root>
                <ButtonGroup.Item
                  data-state={groupOrder === 'asc' ? 'on' : 'off'}
                  onClick={() => setGroupOrder('asc')}
                  className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
                >
                  <ButtonGroup.Icon
                    data-state={groupOrder === 'asc' ? 'on' : 'off'}
                    className='data-[state=on]:text-primary-base '
                    as={RiArrowUpLine}
                  />
                  Ascending
                </ButtonGroup.Item>
                <ButtonGroup.Item
                  data-state={groupOrder === 'desc' ? 'on' : 'off'}
                  onClick={() => setGroupOrder('desc')}
                  className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1  data-[state=on]:ring-primary-base'
                >
                  <ButtonGroup.Icon
                    data-state={groupOrder === 'desc' ? 'on' : 'off'}
                    className='data-[state=on]:text-primary-base '
                    as={RiArrowDownLine}
                  />
                  Descending
                </ButtonGroup.Item>
              </ButtonGroup.Root>
            </div>
          </Popover.Content>
        </Popover.Root>

        <ColumnManagerDropdown
          open={isColumnManagerOpen}
          onOpenChange={setIsColumnManagerOpen}
          config={columnConfig}
          tooltipContent={<p>Manage columns</p>}
          trigger={
            <Button.Root variant='neutral' mode='stroke' size='small' className='gap-1'>
              <Button.Icon as={RiLayoutColumnLine} />
            </Button.Root>
          }
        />
      </div>
    </div>
  );
};

export default EventParticipantsToolbar;
