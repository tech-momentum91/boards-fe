import React, { memo, useCallback, useRef, useState } from 'react';
import { LuExpand } from 'react-icons/lu';
import { RiAddLine, RiExpandDiagonalLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';

import BoqTemplateNewProductMenu from '@/components/boq/boq-templates/components/boq-template-new-product-menu';
import BoqTemplateProductsFilterDropdown from '@/components/boq/boq-templates/components/boq-template-products-filter-dropdown';
import { DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS } from '@/components/boq/constants';
import {
  cloneBoqTemplateProductFilters,
  countBoqTemplateProductFilters,
} from '@/components/boq/boq-helper';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Button from '@/components/ui/button';
import * as Filter from '@/components/ui/filter';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

const BoqTemplateProductsToolbar = memo(
  ({
    searchValue,
    onSearchChange,
    appliedFilters = DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS,
    onFiltersChange,
    onNewProductSelect,
    columnConfig,
    allDescriptionsExpanded = false,
    onAllDescriptionsExpandedChange,
  }) => {
    const searchId = React.useId();
    const filterDropdownRef = useRef(null);
    const [columnManagerOpen, setColumnManagerOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [stagedFilterCount, setStagedFilterCount] = useState(null);

    const appliedFilterCount = countBoqTemplateProductFilters(appliedFilters);
    const filterCount =
      filterOpen && stagedFilterCount != null ? stagedFilterCount : appliedFilterCount;

    const handleClearAllFilters = useCallback(
      (event) => {
        event?.stopPropagation?.();
        onFiltersChange?.(cloneBoqTemplateProductFilters(DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS));
        setStagedFilterCount(null);
        setFilterOpen(false);
      },
      [onFiltersChange],
    );

    const handleExpand = useCallback(() => {
      onAllDescriptionsExpandedChange?.(!allDescriptionsExpanded);
    }, [allDescriptionsExpanded, onAllDescriptionsExpandedChange]);

    return (
      <div className='flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div className='w-full min-w-0 shrink-0 lg:max-w-[370px]'>
          <Input.Root size='medium'>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                id={searchId}
                value={searchValue}
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder='Search products, descriptions, icons etc'
                autoComplete='off'
                aria-label='Search template products'
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='flex min-w-0 flex-wrap items-center justify-end gap-2'>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='medium'
                className={cn(
                  'size-8 shrink-0 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]',
                  allDescriptionsExpanded && 'ring-2 ring-stroke-strong-950 ring-inset',
                )}
                aria-label={
                  allDescriptionsExpanded ? 'Collapse descriptions' : 'Expand descriptions'
                }
                aria-pressed={allDescriptionsExpanded}
                onClick={handleExpand}
              >
                <Button.Icon
                  as={allDescriptionsExpanded ? RiExpandDiagonalLine : LuExpand}
                  className='size-4'
                />
              </Button.Root>
            </Tooltip.Trigger>
            <Tooltip.Content size='xsmall' side='bottom'>
              {allDescriptionsExpanded ? 'Collapse descriptions' : 'Expand descriptions'}
            </Tooltip.Content>
          </Tooltip.Root>

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
              ariaLabel='Filter template products'
            />

            <BoqTemplateProductsFilterDropdown
              ref={filterDropdownRef}
              open={filterOpen}
              appliedFilters={appliedFilters}
              onFiltersChange={onFiltersChange}
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
                  'size-8 shrink-0 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]',
                  columnManagerOpen && 'ring-2 ring-stroke-strong-950 ring-inset',
                )}
                aria-label='Column settings'
                aria-expanded={columnManagerOpen}
              >
                <Button.Icon as={RiLayoutColumnLine} />
              </Button.Root>
            }
          />

          <BoqTemplateNewProductMenu onSelect={onNewProductSelect}>
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='medium'
              className='h-8 shrink-0 gap-1 bg-[#079455] px-2.5 text-white hover:bg-[#067647]'
            >
              <Button.Icon as={RiAddLine} />
              <span className='text-label-sm font-medium'>New Product</span>
            </Button.Root>
          </BoqTemplateNewProductMenu>
        </div>
      </div>
    );
  },
);

BoqTemplateProductsToolbar.displayName = 'BoqTemplateProductsToolbar';

export default BoqTemplateProductsToolbar;
