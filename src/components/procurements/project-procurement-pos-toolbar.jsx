import React, { memo, useState } from 'react';
import {
  RiArrowDownLine,
  RiArrowRightSLine,
  RiArrowUpLine,
  RiCloseLine,
  RiLayoutColumnLine,
  RiSearchLine,
  RiStackLine,
} from 'react-icons/ri';

import { PROJECT_PROCUREMENT_POS_GROUP_BY_OPTIONS } from '@/components/procurements/constants';
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

const filterTriggerClassName =
  'h-8 min-h-8 gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 pl-2 pr-1.5 font-normal text-text-main-900 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] ring-0 hover:bg-bg-weak-50 hover:ring-0 before:!content-none focus:shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] data-[state=open]:before:ring-0';

const GROUP_BY_SELECT_OPTIONS = PROJECT_PROCUREMENT_POS_GROUP_BY_OPTIONS.map((option) =>
  typeof option === 'string' ? { value: option, label: option } : option,
);

function CategoryBreadcrumb({ breadcrumb }) {
  const parts = String(breadcrumb ?? '')
    .split('>')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <span className='flex min-w-0 flex-wrap items-center gap-0.5'>
      {parts.map((part, index) => (
        <React.Fragment key={`${part}-${index}`}>
          {index > 0 ? (
            <RiArrowRightSLine className='size-3.5 shrink-0 text-text-sub-500' aria-hidden />
          ) : null}
          <span className='text-paragraph-xs text-text-sub-500'>{part}</span>
        </React.Fragment>
      ))}
    </span>
  );
}

function CategoryOptionLabel({ option }) {
  const title = option?.title || option?.label || '';
  if (option?.value === 'all' || !option?.breadcrumb) {
    return <span className='truncate text-paragraph-sm text-text-main-900'>{title}</span>;
  }

  return (
    <span className='flex min-w-0 w-full flex-col gap-0.5 py-0.5'>
      <span className='truncate text-paragraph-sm font-medium text-text-main-900'>{title}</span>
      <CategoryBreadcrumb breadcrumb={option.breadcrumb} />
    </span>
  );
}

function getCategoryTriggerLabel(option) {
  if (!option) return '';
  if (option.value === 'all') return option.title || option.label || 'All Categories';
  return option.title || option.name || option.label || '';
}

const ProjectProcurementPosToolbar = memo(
  ({
    searchValue,
    onSearchChange,
    vendorFilter,
    onVendorFilterChange,
    packageFilter,
    onPackageFilterChange,
    categoryFilter,
    onCategoryFilterChange,
    vendorOptions = [{ value: 'all', label: 'All Vendors' }],
    packageOptions = [{ value: 'all', label: 'All Packages' }],
    categoryOptions = [{ value: 'all', label: 'All Categories', title: 'All Categories' }],
    columnConfig,
    groupBy = '',
    groupOrder = 'asc',
    onGroupByChange,
    onGroupOrderChange,
  }) => {
    const searchId = React.useId();
    const [columnManagerOpen, setColumnManagerOpen] = useState(false);
    const [groupByOpen, setGroupByOpen] = useState(false);

    const selectedGroupLabel =
      GROUP_BY_SELECT_OPTIONS.find((option) => option.value === groupBy)?.label ?? '';

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
                placeholder='Search by po no., name, package, etc.'
                autoComplete='off'
                aria-label='Search project purchase orders'
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='flex min-w-0 flex-wrap items-center justify-end gap-2'>
          <SearchableSelect
            size='xsmall'
            variant='compact'
            showArrow
            value={vendorFilter}
            onValueChange={onVendorFilterChange}
            options={vendorOptions}
            placeholder='All Vendors'
            searchPlaceholder='Search vendors...'
            noResultsMessage='No vendors found'
            triggerClassName={cn(filterTriggerClassName, 'min-w-[114px]')}
            contentClassName='min-w-[200px]'
          />

          <SearchableSelect
            size='xsmall'
            variant='compact'
            showArrow
            value={packageFilter}
            onValueChange={onPackageFilterChange}
            options={packageOptions}
            placeholder='All Packages'
            searchPlaceholder='Search packages...'
            noResultsMessage='No packages found'
            triggerClassName={cn(filterTriggerClassName, 'min-w-[124px]')}
            contentClassName='min-w-[220px]'
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
            getOptionLabel={(option) =>
              option?.value === 'all'
                ? option.title || option.label || 'All Categories'
                : [option?.title || option?.label, option?.breadcrumb].filter(Boolean).join(' ')
            }
            renderOptionLabel={(option) => <CategoryOptionLabel option={option} />}
            triggerClassName={cn(filterTriggerClassName, 'min-w-[132px]')}
            contentClassName='min-w-[min(100vw-24px,340px)] max-w-[min(100vw-24px,400px)]'
            renderTrigger={({ selectedOption, placeholder: triggerPlaceholder }) => (
              <span className='block min-w-0 truncate'>
                {selectedOption
                  ? getCategoryTriggerLabel(selectedOption)
                  : triggerPlaceholder || 'All Categories'}
              </span>
            )}
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
                      groupBy
                        ? 'h-9 shrink-0 gap-2 px-2 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
                        : iconButtonClassName,
                      groupBy && 'ring-1 ring-primary-base',
                      groupByOpen && !groupBy && 'ring-2 ring-stroke-strong-950 ring-inset',
                    )}
                    aria-label='Group by'
                  >
                    <Button.Icon as={RiStackLine} />
                    {groupBy ? (
                      <span className='text-label-sm whitespace-nowrap'>{selectedGroupLabel}</span>
                    ) : null}
                    {groupBy ? (
                      <span
                        className='inline-flex cursor-pointer items-center justify-center'
                        role='button'
                        tabIndex={0}
                        aria-label={
                          groupOrder === 'asc' ? 'Sort groups descending' : 'Sort groups ascending'
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          onGroupOrderChange?.(groupOrder === 'asc' ? 'desc' : 'asc');
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            event.stopPropagation();
                            onGroupOrderChange?.(groupOrder === 'asc' ? 'desc' : 'asc');
                          }
                        }}
                      >
                        {groupOrder === 'asc' ? (
                          <RiArrowUpLine size={18} />
                        ) : (
                          <RiArrowDownLine size={18} />
                        )}
                      </span>
                    ) : null}
                    {groupBy ? (
                      <RiCloseLine
                        size={16}
                        className='rounded-sm bg-primary-light text-primary-dark'
                        aria-label='Clear group by'
                        onClick={(event) => {
                          event.stopPropagation();
                          onGroupByChange?.('');
                        }}
                      />
                    ) : null}
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
                  options={GROUP_BY_SELECT_OPTIONS}
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
            pinnedColumnId='po_number'
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

ProjectProcurementPosToolbar.displayName = 'ProjectProcurementPosToolbar';

export default ProjectProcurementPosToolbar;
