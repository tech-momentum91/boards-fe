import React, { useMemo } from 'react';
import {
  RiArrowDownSFill,
  RiArrowUpSFill,
  RiDownloadLine,
  RiLayoutColumnLine,
  RiSearchLine,
} from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import { COLLECTIONS_PROJECT_FILTER_OPTIONS } from '@/collections/constants';

export default function CollectionsToolbar({
  searchTerm,
  onSearchChange,
  projectFilter,
  onProjectFilterChange,
  projectOptions = COLLECTIONS_PROJECT_FILTER_OPTIONS,
  columnConfig,
  isColumnManagerOpen,
  onColumnManagerOpenChange,
}) {
  const resolvedProjectOptions = useMemo(
    () =>
      Array.isArray(projectOptions) && projectOptions.length > 0
        ? projectOptions
        : COLLECTIONS_PROJECT_FILTER_OPTIONS,
    [projectOptions],
  );

  return (
    <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
      <Input.Root size='xsmall' className='w-full lg:max-w-[372px]'>
        <Input.Wrapper>
          <Input.Icon as={RiSearchLine} />
          <Input.Input
            placeholder='Search by project name, city'
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </Input.Wrapper>
      </Input.Root>

      <div className='flex flex-wrap items-center justify-end gap-3'>
        <Select.Root value={projectFilter} onValueChange={onProjectFilterChange} size='xsmall'>
          <Select.Trigger className='min-w-[119px]'>
            <Select.Value placeholder='All Projects' />
          </Select.Trigger>
          <Select.Content>
            {resolvedProjectOptions.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>

        <ColumnManagerDropdown
          open={isColumnManagerOpen}
          onOpenChange={onColumnManagerOpenChange}
          config={columnConfig}
          tooltipContent={<p>Manage columns</p>}
          trigger={
            <Button.Root variant='neutral' mode='stroke' size='xsmall' aria-label='Manage columns'>
              <Button.Icon as={RiLayoutColumnLine} />
            </Button.Root>
          }
        />

        <Button.Root variant='neutral' mode='stroke' size='xsmall' aria-label='Download'>
          <Button.Icon as={RiDownloadLine} />
        </Button.Root>
      </div>
    </div>
  );
}

export function CollectionsSortableHeader({ label, column }) {
  const isSorted = column?.getIsSorted?.();

  return (
    <button
      type='button'
      className='group flex items-center gap-1'
      onClick={() => column?.toggleSorting?.(isSorted === 'asc')}
    >
      <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600 transition-colors group-hover:text-text-main-900'>
        {label}
      </span>
      <div className='flex -translate-y-px flex-col -space-y-2'>
        <RiArrowUpSFill
          size={16}
          className={
            isSorted === 'asc'
              ? 'text-primary-base'
              : 'text-text-sub-300 group-hover:text-text-sub-400'
          }
        />
        <RiArrowDownSFill
          size={16}
          className={
            isSorted === 'desc'
              ? 'text-primary-base'
              : 'text-text-sub-300 group-hover:text-text-sub-400'
          }
        />
      </div>
    </button>
  );
}
