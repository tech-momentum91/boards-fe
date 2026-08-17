import React, { memo } from 'react';
import { RiSearchLine } from 'react-icons/ri';

import { PROJECT_PROCUREMENT_PAYMENT_SHEET_DETAIL_STATUS_FILTER_OPTIONS } from '@/components/procurements/constants';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/utils/cn';

const filterTriggerClassName =
  'h-8 min-h-8 gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 pl-2 pr-1.5 font-normal text-text-main-900 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] ring-0 hover:bg-bg-weak-50 hover:ring-0 before:!content-none focus:shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] data-[state=open]:before:ring-0';

const ProjectProcurementPaymentSheetDetailToolbar = memo(
  ({
    searchValue,
    onSearchChange,
    categoryFilter,
    onCategoryFilterChange,
    categoryOptions = [{ value: 'all', label: 'All Categories' }],
    statusFilter,
    onStatusFilterChange,
  }) => {
    const searchId = React.useId();

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
                aria-label='Search payment sheet vendors'
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='flex min-w-0 flex-wrap items-center justify-end gap-2'>
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
            triggerClassName={cn(filterTriggerClassName, 'min-w-[132px]')}
            contentClassName='min-w-[200px]'
          />

          <SearchableSelect
            size='xsmall'
            variant='compact'
            showArrow
            value={statusFilter}
            onValueChange={onStatusFilterChange}
            options={PROJECT_PROCUREMENT_PAYMENT_SHEET_DETAIL_STATUS_FILTER_OPTIONS}
            placeholder='All Status'
            searchPlaceholder='Search statuses...'
            noResultsMessage='No statuses found'
            triggerClassName={cn(filterTriggerClassName, 'min-w-[102px]')}
            contentClassName='min-w-[180px]'
          />
        </div>
      </div>
    );
  },
);

ProjectProcurementPaymentSheetDetailToolbar.displayName =
  'ProjectProcurementPaymentSheetDetailToolbar';

export default ProjectProcurementPaymentSheetDetailToolbar;
