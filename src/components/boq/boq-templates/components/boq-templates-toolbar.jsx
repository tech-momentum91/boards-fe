import React, { memo, useCallback, useRef, useState } from 'react';
import { RiAddLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';

import BoqTemplatesFilterDropdown from '@/components/boq/boq-templates/components/boq-templates-filter-dropdown';
import { DEFAULT_BOQ_TEMPLATE_FILTERS } from '@/components/boq/constants';
import { cloneBoqTemplateFilters, countBoqActiveFilters } from '@/components/boq/boq-helper';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Button from '@/components/ui/button';
import * as Filter from '@/components/ui/filter';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';

const BoqTemplatesToolbar = memo(
  ({
    searchValue,
    onSearchChange,
    appliedFilters,
    onFiltersChange,
    filterOptionsByTab,
    columnConfig,
    onNewTemplate,
  }) => {
    const searchId = React.useId();
    const filterDropdownRef = useRef(null);
    const [columnManagerOpen, setColumnManagerOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [stagedFilterCount, setStagedFilterCount] = useState(null);

    const appliedFilterCount = countBoqActiveFilters(appliedFilters);
    const filterCount =
      filterOpen && stagedFilterCount != null ? stagedFilterCount : appliedFilterCount;

    const handleClearAllFilters = useCallback(
      (event) => {
        event?.stopPropagation?.();
        onFiltersChange?.(cloneBoqTemplateFilters(DEFAULT_BOQ_TEMPLATE_FILTERS));
        setStagedFilterCount(null);
        setFilterOpen(false);
      },
      [onFiltersChange],
    );

    return (
      <div className='flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div className='w-full min-w-0 shrink-0 lg:max-w-[260px]'>
          <Input.Root size='medium'>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                id={searchId}
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder='Search here...'
                autoComplete='off'
                aria-label='Search BOQ templates'
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='flex min-w-0 flex-wrap items-center justify-end gap-3'>
          <Popover.Root
            open={filterOpen}
            onOpenChange={(open) => {
              const wasOpen = filterOpen;
              setFilterOpen(open);
              if (wasOpen && !open) {
                filterDropdownRef.current?.handleClose?.();
                setStagedFilterCount(null);
              }
            }}
          >
            <Filter.TriggerButton
              filterCount={filterCount}
              onClear={handleClearAllFilters}
              tooltipContent='Filter'
              ariaLabel='Filter BOQ templates'
            />

            <BoqTemplatesFilterDropdown
              ref={filterDropdownRef}
              open={filterOpen}
              appliedFilters={appliedFilters}
              onFiltersChange={onFiltersChange}
              filterOptionsByTab={filterOptionsByTab}
              setFilterCount={setStagedFilterCount}
            />
          </Popover.Root>

          <ColumnManagerDropdown
            open={columnManagerOpen}
            onOpenChange={setColumnManagerOpen}
            config={columnConfig}
            tooltipContent={<p>Columns</p>}
            trigger={
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='medium'
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

          <Button.Root
            type='button'
            variant='primary'
            mode='filled'
            size='medium'
            className='h-9 shrink-0 gap-1.5 bg-[#16a34a] px-4 text-white hover:bg-[#15803d]'
            onClick={onNewTemplate}
          >
            <Button.Icon as={RiAddLine} />
            <span className='text-label-sm font-semibold'>New template</span>
          </Button.Root>
        </div>
      </div>
    );
  },
);

BoqTemplatesToolbar.displayName = 'BoqTemplatesToolbar';

export default BoqTemplatesToolbar;
