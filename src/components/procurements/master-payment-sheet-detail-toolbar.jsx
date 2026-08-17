import React, { memo, useState } from 'react';
import { RiLayoutColumnLine, RiSaveLine, RiSearchLine } from 'react-icons/ri';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/utils/cn';

const iconButtonClassName = 'size-9 shrink-0 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]';

const filterTriggerClassName =
  'h-8 min-h-8 gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 pl-2 pr-1.5 font-normal text-text-main-900 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] ring-0 hover:bg-bg-weak-50 hover:ring-0 before:!content-none focus:shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] data-[state=open]:before:ring-0';

const MasterPaymentSheetDetailToolbar = memo(
  ({
    searchValue,
    onSearchChange,
    projectFilter,
    onProjectFilterChange,
    vendorFilter,
    onVendorFilterChange,
    categoryFilter,
    onCategoryFilterChange,
    projectOptions = [{ value: 'all', label: 'All Projects' }],
    vendorOptions = [{ value: 'all', label: 'All Vendors' }],
    categoryOptions = [{ value: 'all', label: 'All Categories' }],
    columnConfig,
    onSave,
    isSaving = false,
  }) => {
    const searchId = React.useId();
    const [columnManagerOpen, setColumnManagerOpen] = useState(false);

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
                placeholder='Search by here...'
                autoComplete='off'
                aria-label='Search payment sheet items'
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='flex min-w-0 flex-wrap items-center justify-end gap-2'>
          <SearchableSelect
            size='xsmall'
            variant='compact'
            showArrow
            value={projectFilter}
            onValueChange={onProjectFilterChange}
            options={projectOptions}
            placeholder='All Projects'
            searchPlaceholder='Search projects...'
            noResultsMessage='No projects found'
            triggerClassName={cn(filterTriggerClassName, 'min-w-[130px]')}
            contentClassName='min-w-[220px]'
          />

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
            triggerClassName={cn(filterTriggerClassName, 'min-w-[120px]')}
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
            triggerClassName={cn(filterTriggerClassName, 'min-w-[130px]')}
            contentClassName='min-w-[200px]'
          />

          <ColumnManagerDropdown
            open={columnManagerOpen}
            onOpenChange={setColumnManagerOpen}
            config={columnConfig}
            pinnedColumnId='project'
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

          {onSave ? (
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='xsmall'
              className='h-8 gap-1 px-2.5'
              disabled={isSaving}
              onClick={onSave}
            >
              <Button.Icon as={RiSaveLine} />
              <span className='px-0.5 text-label-sm text-white'>
                {isSaving ? 'Saving...' : 'Save'}
              </span>
            </Button.Root>
          ) : null}
        </div>
      </div>
    );
  },
);

MasterPaymentSheetDetailToolbar.displayName = 'MasterPaymentSheetDetailToolbar';

export default MasterPaymentSheetDetailToolbar;
