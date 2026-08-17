import React, { useState } from 'react';
import { RiAddLine, RiDownloadLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Tooltip from '@/components/ui/tooltip';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import { SearchableSelect } from '@/components/ui/searchable-select';
import TableVariantToggle from '@/components/ui/table-variant-toggle';
import { buildProjectStageFilterOptions } from '@/components/projects/project-stage-status-helpers';

const CITY_MIN_SEARCH_LEN = 2;

export default function ProjectsToolbar({
  searchTerm,
  onSearchChange,
  stageFilter,
  onStageFilterChange,
  stageFilterOptions = buildProjectStageFilterOptions([]),
  cityFilter,
  onCityFilterChange,
  cityFilterOptions = [],
  accountFilter,
  onAccountFilterChange,
  accountFilterOptions = [],
  columnConfig,
  tableVariant,
  onTableVariantToggle,
  onAddProject,
}) {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);

  return (
    <div className='w-full flex items-center justify-between'>
      <div className='w-full '>
        <Input.Root size='xsmall' className=' max-w-[372px]'>
          <Input.Wrapper>
            <Input.Icon as={RiSearchLine} />
            <Input.Input
              placeholder='Search by project name, city'
              value={searchTerm}
              onChange={(event) => onSearchChange?.(event.target.value)}
              aria-label='Search projects'
            />
          </Input.Wrapper>
        </Input.Root>
      </div>

      <div className='flex  flex-row items-center gap-2'>
        <Select.Root size='xsmall' value={stageFilter} onValueChange={onStageFilterChange}>
          <Select.Trigger className='w-[120px]'>
            <Select.Value placeholder='All Stages' />
          </Select.Trigger>
          <Select.Content>
            {stageFilterOptions.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>

        <SearchableSelect
          size='xsmall'
          value={cityFilter}
          onValueChange={onCityFilterChange}
          options={cityFilterOptions}
          placeholder='All Cities'
          searchPlaceholder='Search Indian cities...'
          minSearchLength={CITY_MIN_SEARCH_LEN}
          minSearchMessage={`Type at least ${CITY_MIN_SEARCH_LEN} characters to search cities.`}
          noResultsMessage='No cities found'
          emptyMessage='Search for an Indian city'
          triggerClassName='w-[140px]'
          contentClassName='min-w-[240px]'
        />

        <SearchableSelect
          size='xsmall'
          value={accountFilter}
          onValueChange={onAccountFilterChange}
          options={accountFilterOptions}
          placeholder='All Accounts'
          searchPlaceholder='Search accounts...'
          noResultsMessage='No accounts found'
          emptyMessage='No accounts available'
          triggerClassName='w-[140px]'
          contentClassName='min-w-[280px]'
        />

        <ColumnManagerDropdown
          open={isColumnManagerOpen}
          onOpenChange={setIsColumnManagerOpen}
          config={columnConfig}
          tooltipContent={<p>Manage columns</p>}
          trigger={
            <Button.Root variant='neutral' mode='stroke' size='xsmall' aria-label='Manage columns'>
              <Button.Icon as={RiLayoutColumnLine} />
            </Button.Root>
          }
        />

        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <span className='inline-flex'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                aria-label='Export projects'
                disabled
              >
                <Button.Icon as={RiDownloadLine} />
              </Button.Root>
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content>Export coming soon</Tooltip.Content>
        </Tooltip.Root>

        {onTableVariantToggle ? (
          <TableVariantToggle variant={tableVariant} onToggle={onTableVariantToggle} />
        ) : null}

        <Button.Root size='xsmall' className='gap-1 px-3' onClick={onAddProject}>
          <Button.Icon as={RiAddLine} />
          Add
        </Button.Root>
      </div>
    </div>
  );
}
