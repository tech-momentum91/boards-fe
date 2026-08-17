import React, { memo, useState } from 'react';
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiLayoutColumnLine,
  RiSearchLine,
  RiStackLine,
} from 'react-icons/ri';

import {
  PROJECT_PROCUREMENT_VENDORS_CATEGORY_FILTER_ALL,
  PROJECT_PROCUREMENT_VENDORS_GROUP_BY_OPTIONS,
  PROJECT_PROCUREMENT_VENDORS_TYPE_FILTER_ALL,
} from '@/components/procurements/constants';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Input from '@/components/ui/input';
import * as LinkButton from '@/components/ui/link-button';
import * as Popover from '@/components/ui/popover';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

const iconButtonClassName = 'size-9 shrink-0 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]';

const vendorFilterTriggerClassName =
  'h-8 min-h-8 gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 pl-2 pr-1.5 font-normal text-text-main-900 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] ring-0 hover:bg-bg-weak-50 hover:ring-0 before:!content-none focus:shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] data-[state=open]:before:ring-0';

const ProjectProcurementVendorsToolbar = memo(
  ({
    searchValue,
    onSearchChange,
    typeFilter,
    onTypeFilterChange,
    categoryFilter,
    onCategoryFilterChange,
    columnConfig,
    groupBy = '',
    groupOrder = 'asc',
    onGroupByChange,
    onGroupOrderChange,
    typeOptions = [PROJECT_PROCUREMENT_VENDORS_TYPE_FILTER_ALL],
    categoryOptions = [PROJECT_PROCUREMENT_VENDORS_CATEGORY_FILTER_ALL],
  }) => {
    const searchId = React.useId();
    const [columnManagerOpen, setColumnManagerOpen] = useState(false);
    const [groupByOpen, setGroupByOpen] = useState(false);

    return (
      <div className='flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div className='w-full min-w-0 shrink-0 lg:max-w-[337px]'>
          <Input.Root size='xsmall'>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                id={searchId}
                value={searchValue}
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder='Search by name, type,  category, etc.'
                autoComplete='off'
                aria-label='Search project vendors'
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='flex min-w-0 flex-wrap items-center justify-end gap-2'>
          <SearchableSelect
            size='xsmall'
            variant='compact'
            showArrow
            value={typeFilter}
            onValueChange={onTypeFilterChange}
            options={typeOptions}
            placeholder='All Types'
            searchPlaceholder='Search types...'
            noResultsMessage='No types found'
            triggerClassName={cn(vendorFilterTriggerClassName, 'min-w-[120px]')}
            contentClassName='min-w-[200px]'
          />

          <SearchableSelect
            size='xsmall'
            variant='compact'
            showArrow
            value={categoryFilter}
            onValueChange={onCategoryFilterChange}
            options={categoryOptions}
            placeholder='All Categories'
            searchPlaceholder='Search categories...'
            noResultsMessage='No categories found'
            triggerClassName={cn(vendorFilterTriggerClassName, 'min-w-[160px]')}
            contentClassName='min-w-[220px]'
          />

          <Popover.Root open={groupByOpen} onOpenChange={setGroupByOpen}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Popover.Trigger asChild>
                  <Button.Root
                    type='button'
                    variant={groupBy ? 'primary' : 'neutral'}
                    mode={groupBy ? 'lighter' : 'stroke'}
                    size='xsmall'
                    className={cn(
                      iconButtonClassName,
                      groupBy && 'ring-1 ring-primary-base',
                      groupByOpen && !groupBy && 'ring-2 ring-stroke-strong-950 ring-inset',
                    )}
                    aria-label='Group by'
                  >
                    <Button.Icon as={RiStackLine} />
                  </Button.Root>
                </Popover.Trigger>
              </Tooltip.Trigger>
              <Tooltip.Content size='xsmall' side='bottom'>
                Group by
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
                      onGroupOrderChange?.('asc');
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
                    setGroupByOpen(false);
                  }}
                  size='xsmall'
                  options={PROJECT_PROCUREMENT_VENDORS_GROUP_BY_OPTIONS.map((option) => ({
                    value: option,
                    label: option,
                  }))}
                  placeholder='Select group by'
                  triggerClassName='w-full'
                />

                <ButtonGroup.Root>
                  <ButtonGroup.Item
                    data-state={groupOrder === 'asc' ? 'on' : 'off'}
                    onClick={() => onGroupOrderChange?.('asc')}
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
                    onClick={() => onGroupOrderChange?.('desc')}
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

          <ColumnManagerDropdown
            open={columnManagerOpen}
            onOpenChange={setColumnManagerOpen}
            config={columnConfig}
            pinnedColumnId='vendor_name'
            tooltipContent={<p>Columns</p>}
            trigger={
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='xsmall'
                className={cn(
                  iconButtonClassName,
                  columnManagerOpen && 'ring-2 ring-stroke-strong-950 ring-inset',
                )}
                aria-label='Column settings'
                aria-expanded={columnManagerOpen}
              >
                <Button.Icon as={RiLayoutColumnLine} />
              </Button.Root>
            }
          />
        </div>
      </div>
    );
  },
);

ProjectProcurementVendorsToolbar.displayName = 'ProjectProcurementVendorsToolbar';

export default ProjectProcurementVendorsToolbar;
