import React, { memo, useCallback, useRef, useState } from 'react';
import { RiAddLine, RiDownloadLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';

import ProductsFilterDropdown from '@/components/products/products-filter-dropdown';
import {
  PRODUCTS_GROUP_BY_DEFAULT,
  PRODUCTS_GROUP_BY_OPTIONS,
  PRODUCTS_TAB_IDS,
} from '@/components/products/constants';
import StocksGroupByDropdown from '@/components/stocks/stocks-group-by-dropdown';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Button from '@/components/ui/button';
import * as Filter from '@/components/ui/filter';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

const ProductsToolbar = memo(
  ({
    tabId = PRODUCTS_TAB_IDS.PRODUCT,
    searchValue,
    onSearchChange,
    columnConfig,
    addButtonLabel = 'Add Product',
    onAddProduct,
    showGroupBy = false,
    groupBy,
    onGroupByChange,
    groupOrder,
    onGroupOrderChange,
    groupByOptions = PRODUCTS_GROUP_BY_OPTIONS,
    groupByDefault = PRODUCTS_GROUP_BY_DEFAULT,
    showFilter = false,
    appliedFilters,
    onFiltersApply,
  }) => {
    const searchId = React.useId();
    const [columnManagerOpen, setColumnManagerOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterCount, setFilterCount] = useState(0);
    const filterDropdownRef = useRef(null);

    const handleAddProduct = useCallback(() => {
      onAddProduct?.();
    }, [onAddProduct]);

    const handleGroupByChange = useCallback(
      (next) => {
        onGroupByChange?.(next || groupByDefault);
      },
      [groupByDefault, onGroupByChange],
    );

    const handleClearAllFilters = useCallback(
      (event) => {
        event?.stopPropagation?.();
        onFiltersApply?.(null);
        setFilterCount(0);
        setIsFilterOpen(false);
      },
      [onFiltersApply],
    );

    const handleDownload = useCallback(() => {
      // Export will be wired when API is available.
    }, []);

    return (
      <div className='flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div className='w-full min-w-0 shrink-0 lg:max-w-[276px]'>
          <Input.Root size='medium'>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                id={searchId}
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder='Search here...'
                autoComplete='off'
                aria-label='Search products'
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='flex min-w-0 flex-wrap items-center justify-end gap-3'>
          <div className='flex shrink-0 items-center gap-3'>
            {showGroupBy ? (
              <StocksGroupByDropdown
                value={groupBy}
                onChange={handleGroupByChange}
                groupOrder={groupOrder}
                onGroupOrderChange={onGroupOrderChange}
                options={groupByOptions}
                defaultValue={groupByDefault}
                menuLabel='GROUP BY'
                clearLabel='Clear'
                triggerAriaLabel='Group products'
                tooltipLabel='Group By'
                selectPlaceholder='Select group by'
              />
            ) : null}

            {showFilter ? (
              <Popover.Root
                open={isFilterOpen}
                onOpenChange={(open) => {
                  const wasOpen = isFilterOpen;
                  setIsFilterOpen(open);
                  if (wasOpen && !open && filterDropdownRef.current) {
                    filterDropdownRef.current.handleClose();
                  }
                }}
              >
                <Filter.TriggerButton
                  filterCount={filterCount}
                  onClear={handleClearAllFilters}
                  tooltipContent='Filter'
                  ariaLabel='Filter products'
                />
                <ProductsFilterDropdown
                  ref={filterDropdownRef}
                  open={isFilterOpen}
                  tabId={tabId}
                  appliedFilters={appliedFilters}
                  onFiltersApply={onFiltersApply}
                  setFilterCount={setFilterCount}
                />
              </Popover.Root>
            ) : null}

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='medium'
                  className='size-9 shrink-0 p-2 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
                  aria-label='Download'
                  onClick={handleDownload}
                >
                  <Button.Icon as={RiDownloadLine} />
                </Button.Root>
              </Tooltip.Trigger>
              <Tooltip.Content size='xsmall' side='bottom'>
                Download
              </Tooltip.Content>
            </Tooltip.Root>

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
              className='shrink-0'
              onClick={handleAddProduct}
            >
              <Button.Icon as={RiAddLine} />
              {addButtonLabel}
            </Button.Root>
          </div>
        </div>
      </div>
    );
  },
);

ProductsToolbar.displayName = 'ProductsToolbar';

export default ProductsToolbar;
