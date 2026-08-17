import React, { memo, useState } from 'react';
import { RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';

import { buildProjectStageFilterOptions } from '@/components/projects/project-stage-status-helpers';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/utils/cn';

const CITY_MIN_SEARCH_LEN = 2;

const ProjectProcurementsToolbar = memo(
  ({
    searchValue,
    onSearchChange,
    stageFilter,
    onStageFilterChange,
    stageFilterOptions = buildProjectStageFilterOptions([]),
    onStageSearchQueryChange,
    onStageLoadMore,
    stageHasMore = false,
    stageIsLoadingMore = false,
    cityFilter,
    onCityFilterChange,
    cityFilterOptions = [],
    columnConfig,
  }) => {
    const searchId = React.useId();
    const [columnManagerOpen, setColumnManagerOpen] = useState(false);

    return (
      <div className='flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div className='w-full min-w-0 shrink-0 lg:max-w-[372px]'>
          <Input.Root size='xsmall'>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                id={searchId}
                value={searchValue}
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder='Search by project name, city'
                autoComplete='off'
                aria-label='Search project procurements'
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='flex min-w-0 flex-wrap items-center justify-end gap-2'>
          <SearchableSelect
            size='xsmall'
            value={stageFilter}
            onValueChange={onStageFilterChange}
            options={stageFilterOptions}
            placeholder='All Stages'
            searchPlaceholder='Search stages...'
            noResultsMessage='No stages found'
            emptyMessage='No stages available'
            triggerClassName='w-[158px]'
            contentClassName='min-w-[240px]'
            showArrow
            disableLocalFilter
            onSearchQueryChange={onStageSearchQueryChange}
            onLoadMore={onStageLoadMore}
            hasMore={stageHasMore}
            isLoadingMore={stageIsLoadingMore}
          />

          <SearchableSelect
            size='xsmall'
            value={cityFilter}
            onValueChange={onCityFilterChange}
            options={cityFilterOptions}
            placeholder='All Cities'
            searchPlaceholder='Search cities...'
            minSearchLength={CITY_MIN_SEARCH_LEN}
            minSearchMessage={`Type at least ${CITY_MIN_SEARCH_LEN} characters to search cities.`}
            noResultsMessage='No cities found'
            emptyMessage='Search for a city'
            triggerClassName='w-[103px]'
            contentClassName='min-w-[240px]'
          />

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
                  'size-9 shrink-0 p-2 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]',
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

ProjectProcurementsToolbar.displayName = 'ProjectProcurementsToolbar';

export default ProjectProcurementsToolbar;
