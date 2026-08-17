import React, { useRef, useState } from 'react';
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
import * as Switch from '@/components/ui/switch';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import * as Select from '@/components/ui/select';
import * as LinkButton from '@/components/ui/link-button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Filter from '@/components/ui/filter';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import CrmContactsFilterDropdown from './crm-contacts-filter-dropdown';
import { DEFAULT_CONTACT_FILTERS, GROUPS_BY_OPTIONS } from './constants';

const CrmContactsToolbar = ({
  searchValue = '',
  onSearchChange,
  onAddContact,
  onFiltersChange,
  appliedFilters = {},
  groupBy = '',
  onGroupByChange,
  groupOrder = 'asc',
  onGroupOrderChange,
  tableRef,
  resizeColumnsEnabled = true,
  onResizeEnabledChange,
  onResetColumnSizes,
  contactOptions = {},
  hideAccountFilter = false,
  showFilters = true,
  showGroupBy = true,
  showAddButton = true,
  saveViewMenu = null,
}) => {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const filterDropdownRef = useRef(null);

  const setOrdButton = (value) =>
    onGroupOrderChange?.(typeof value === 'function' ? value(groupOrder) : value);

  const handleClearAllFilters = (e) => {
    e.stopPropagation();
    onFiltersChange?.({
      ...DEFAULT_CONTACT_FILTERS,
      ...(hideAccountFilter ? { account: appliedFilters.account || [] } : {}),
    });
    setFilterCount(0);
    setIsFilterDropdownOpen(false);
  };

  // Derive label from GROUPS_BY_OPTIONS for active group display
  const activeGroupLabel =
    GROUPS_BY_OPTIONS.find((o) => o.value === groupBy)?.label || groupBy || '';

  return (
    <header className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between w-full'>
      {/* Search */}
      <Input.Root className='w-full lg:w-[340px]'>
        <Input.Wrapper className='bg-bg-weak-100/50'>
          <Input.Icon>
            <RiSearchLine className='text-text-sub-500' />
          </Input.Icon>
          <Input.Input
            placeholder='Search here...'
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            aria-label='Search contacts'
            className='bg-transparent border-0 ring-0 focus:ring-0 shadow-none'
          />
        </Input.Wrapper>
      </Input.Root>

      {/* Actions */}
      <div className='flex flex-wrap items-center gap-3'>
        {saveViewMenu}

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
                    {groupBy && <span className='label-small'>{activeGroupLabel}</span>}
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
                            {groupOrder === 'asc' ? 'Asc' : 'Desc'}
                          </span>
                        </Tooltip.Content>
                      </Tooltip.Root>
                    ) : null}
                    {groupBy && (
                      <RiCloseLine
                        onClick={(e) => {
                          e.stopPropagation();
                          onGroupByChange?.('');
                        }}
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
                    <Select.Value placeholder='Select group by' />
                  </Select.Trigger>
                  <Select.Content>
                    {GROUPS_BY_OPTIONS.filter((o) => o.value !== '').map((opt) => (
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
        )}

        {showFilters && (
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
              ariaLabel='Filter contacts'
            />
            <CrmContactsFilterDropdown
              ref={filterDropdownRef}
              open={isFilterDropdownOpen}
              setFilterCount={setFilterCount}
              contactOptions={contactOptions}
              onOpenChange={setIsFilterDropdownOpen}
              onFiltersChange={onFiltersChange}
              appliedFilters={appliedFilters}
              hideAccountFilter={hideAccountFilter}
            />
          </Popover.Root>
        )}

        {/* Column Manager */}
        <ColumnManagerDropdown
          open={isColumnManagerOpen}
          onOpenChange={setIsColumnManagerOpen}
          config={tableRef?.current?.columnConfigHook}
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
          footer={
            onResizeEnabledChange != null || onResetColumnSizes != null ? (
              <div className='w-full flex flex-col items-center gap-3'>
                {onResizeEnabledChange != null && (
                  <div className='w-full flex items-center justify-between gap-2'>
                    <span className='text-paragraph-sm text-text-main-900'>Resize columns</span>
                    <Switch.Root
                      checked={resizeColumnsEnabled}
                      onCheckedChange={onResizeEnabledChange}
                      className='h-5 w-8'
                    />
                  </div>
                )}
                {onResetColumnSizes != null && (
                  <Button.Root
                    type='button'
                    variant='neutral'
                    mode='stroke'
                    size='small'
                    className='w-full'
                    onClick={onResetColumnSizes}
                  >
                    Reset column sizes
                  </Button.Root>
                )}
              </div>
            ) : null
          }
        />

        {showAddButton && (
          <Button.Root variant='primary' size='small' className='gap-1' onClick={onAddContact}>
            <Button.Icon>
              <RiAddLine size={20} />
            </Button.Icon>
            Add Contact
          </Button.Root>
        )}
      </div>
    </header>
  );
};

export default CrmContactsToolbar;
