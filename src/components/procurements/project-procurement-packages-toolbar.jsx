import React, { memo, useCallback, useState } from 'react';
import { LuExpand } from 'react-icons/lu';
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiDownloadLine,
  RiFilter3Fill,
  RiLayoutColumnLine,
  RiSearchLine,
  RiSendPlaneLine,
} from 'react-icons/ri';

import { PRODUCT_FORM_FIELDS, searchProductFormOptions } from '@/api/productFormOptions';
import ProductFormSearchableSelect from '@/components/products/product-form-searchable-select';
import { PROJECT_PROCUREMENT_PACKAGE_STATUS_META } from '@/components/procurements/constants';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Button from '@/components/ui/button';
import * as Dropdown from '@/components/ui/dropdown';
import * as Input from '@/components/ui/input';
import { cn } from '@/utils/cn';

const iconButtonClassName = 'size-8 shrink-0 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]';

const CategoryOptionLabel = ({ option }) => {
  const breadcrumbParts = String(option.breadcrumb ?? '')
    .split('>')
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <span className='flex min-w-0 w-full flex-col gap-1 py-0.5'>
      <span className='truncate text-paragraph-sm font-medium text-text-main-900'>
        {option.title ?? option.label}
      </span>
      {breadcrumbParts.length > 0 ? (
        <span className='flex min-w-0 flex-wrap items-center gap-0.5'>
          {breadcrumbParts.map((part, index) => (
            <React.Fragment key={breadcrumbParts.slice(0, index + 1).join(' > ')}>
              {index > 0 ? (
                <RiArrowRightSLine className='size-4 shrink-0 text-text-sub-500' aria-hidden />
              ) : null}
              <span className='text-paragraph-xs text-text-sub-500'>{part}</span>
            </React.Fragment>
          ))}
        </span>
      ) : null}
    </span>
  );
};

const ProjectProcurementPackagesToolbar = memo(
  ({
    searchValue = '',
    onSearchChange,
    categoryFilter = 'all',
    categoryFilterLabel = 'All Category',
    onCategoryFilterChange,
    statusFilter = 'all',
    onStatusFilterChange,
    columnConfig,
    onExpand,
    onSendRfq,
    className,
  }) => {
    const [columnManagerOpen, setColumnManagerOpen] = useState(false);

    const loadCategoryOptions = useCallback(
      async ({ search }) => [
        { id: 'all', value: 'all', label: 'All Category', title: 'All Category' },
        ...(await searchProductFormOptions({
          field: PRODUCT_FORM_FIELDS.CATEGORY,
          search,
          limit: 200,
        })),
      ],
      [],
    );
    const statusMeta = PROJECT_PROCUREMENT_PACKAGE_STATUS_META[statusFilter];
    const statusLabel = statusFilter === 'all' ? 'All Status' : (statusMeta?.label ?? 'All Status');

    return (
      <div
        className={cn(
          'flex w-full min-w-0 flex-wrap items-center justify-between gap-3',
          className,
        )}
      >
        <Input.Root size='medium' className='w-full max-w-[337px]'>
          <Input.Wrapper>
            <Input.Icon as={RiSearchLine} />
            <Input.Input
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder='Search by code, name, category'
              aria-label='Search packages'
              autoComplete='off'
            />
          </Input.Wrapper>
        </Input.Root>

        <div className='flex shrink-0 flex-wrap items-center gap-2'>
          <div className='w-[112px] shrink-0'>
            <ProductFormSearchableSelect
              value={categoryFilter}
              onValueChange={onCategoryFilterChange}
              field={PRODUCT_FORM_FIELDS.CATEGORY}
              loadOptions={loadCategoryOptions}
              renderOptionLabel={(option) => <CategoryOptionLabel option={option} />}
              renderTriggerValue={({ placeholder }) => (
                <span className='block min-w-0 max-w-full truncate'>
                  {categoryFilterLabel || placeholder}
                </span>
              )}
              getOptionValue={(option) => option.id ?? option.value}
              getOptionLabel={(option) => option.label}
              placeholder='All Category'
              searchPlaceholder='Search categories...'
              noResultsMessage='No categories found'
              size='xsmall'
              variant='compact'
              triggerClassName='h-8 gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 font-normal text-text-main-900 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] ring-0'
              contentClassName='min-w-[220px]'
            />
          </div>

          <Dropdown.Root>
            <Dropdown.Trigger asChild>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                className='h-8 gap-1.5 px-2 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'
              >
                <span className='text-paragraph-sm text-text-main-900'>{statusLabel}</span>
                <Button.Icon as={RiArrowDownSLine} />
              </Button.Root>
            </Dropdown.Trigger>
            <Dropdown.Content align='end' className='min-w-[180px]'>
              <Dropdown.Item onSelect={() => onStatusFilterChange?.('all')}>
                All Status
              </Dropdown.Item>
              {Object.entries(PROJECT_PROCUREMENT_PACKAGE_STATUS_META).map(([id, meta]) => (
                <Dropdown.Item key={id} onSelect={() => onStatusFilterChange?.(id)}>
                  {meta.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Content>
          </Dropdown.Root>

          <Button.Root
            variant='neutral'
            mode='stroke'
            size='xsmall'
            className={iconButtonClassName}
            aria-label='Expand packages view'
            type='button'
            onClick={onExpand}
          >
            <Button.Icon as={LuExpand} />
          </Button.Root>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='xsmall'
            className={iconButtonClassName}
            aria-label='Filter packages'
            type='button'
          >
            <Button.Icon as={RiFilter3Fill} />
          </Button.Root>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='xsmall'
            className={iconButtonClassName}
            aria-label='Download packages'
            type='button'
          >
            <Button.Icon as={RiDownloadLine} />
          </Button.Root>

          <ColumnManagerDropdown
            open={columnManagerOpen}
            onOpenChange={setColumnManagerOpen}
            config={columnConfig}
            pinnedColumnId='name'
            tooltipContent={<p>Columns</p>}
            trigger={
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='xsmall'
                className={cn(
                  iconButtonClassName,
                  columnManagerOpen && 'ring-2 ring-inset ring-stroke-strong-950',
                )}
                aria-label='Manage columns'
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

ProjectProcurementPackagesToolbar.displayName = 'ProjectProcurementPackagesToolbar';

export default ProjectProcurementPackagesToolbar;
