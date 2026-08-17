import React, { memo, useCallback, useState } from 'react';
import { RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri';

import ProductsTable from '@/components/products/products-table';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { cn } from '@/utils/cn';

export const packageSubRows = (row) => row?.products ?? [];
export const variantSubRows = (row) => row?.variations ?? [];

/** Inner accordion body: own vertical scroll, separate from the page groups list. */
const GROUP_ITEMS_SCROLL_CLASS =
  'min-w-0 max-h-[min(50vh,420px)] overflow-x-auto overflow-y-auto overscroll-y-contain';

const ProductsGroupSection = memo(
  ({
    section,
    columnConfig,
    columnDefsById,
    defaultExpanded = true,
    variant = 'card',
    getSubRows,
    subRowColumns,
    subRowColumnDefsById,
    onRowClick,
    onLoadMoreItems,
    hasMoreItems = false,
    isLoadingMoreItems = false,
  }) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [itemsScrollEl, setItemsScrollEl] = useState(null);
    const { id, groupName, rows, count } = section;
    const panelId = `products-group-panel-${id}`;

    const handleLoadMoreItems = useCallback(() => {
      onLoadMoreItems?.(id);
    }, [id, onLoadMoreItems]);

    const { renderSentinel } = useScrollPagination({
      onLoadMore: handleLoadMoreItems,
      hasMore: hasMoreItems,
      isLoading: isLoadingMoreItems,
      scrollContainer: itemsScrollEl,
      enabled: expanded && Boolean(onLoadMoreItems) && hasMoreItems,
    });

    if (variant === 'plain') {
      return (
        <div className='flex w-full min-w-0 flex-col gap-2'>
          <button
            type='button'
            onClick={() => setExpanded((previous) => !previous)}
            className='label-small flex w-full cursor-pointer items-center gap-1 text-left font-medium text-text-sub-500 transition-opacity hover:opacity-80'
            aria-expanded={expanded}
            aria-controls={panelId}
          >
            {groupName}
            {expanded ? (
              <RiArrowUpSLine size={16} className='shrink-0' />
            ) : (
              <RiArrowDownSLine size={16} className='shrink-0' />
            )}
          </button>

          {expanded ? (
            <div id={panelId} ref={setItemsScrollEl} className={GROUP_ITEMS_SCROLL_CLASS}>
              <ProductsTable
                rows={rows}
                columnConfig={columnConfig}
                columnDefsById={columnDefsById}
                emptyLabel='No items in this group'
                getSubRows={getSubRows}
                subRowColumns={subRowColumns}
                subRowColumnDefsById={subRowColumnDefsById}
                onRowClick={onRowClick}
              />
              {renderSentinel()}
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <section
        className={cn(
          'flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0',
          expanded && 'shadow-regular-xs',
        )}
      >
        <div
          className={cn(
            'flex shrink-0 flex-wrap items-center justify-between gap-3 px-3 py-1.5',
            expanded && 'border-b border-stroke-soft-200',
          )}
        >
          <div className='flex min-w-0 flex-1 flex-wrap items-center gap-1.5'>
            <h2 className='truncate text-label-sm font-medium text-text-main-900'>{groupName}</h2>
            <Badge.Root
              size='small'
              variant='lighter'
              className='border border-stroke-soft-200'
              color='gray'
            >
              {count} {count === 1 ? 'item' : 'items'}
            </Badge.Root>
          </div>
          <Button.Root
            type='button'
            onClick={() => setExpanded((previous) => !previous)}
            variant='borderless'
            size='small'
            className='gap-2 px-1.5 text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-main-900 focus-visible:ring-2 focus-visible:ring-primary-base/30'
            aria-expanded={expanded}
            aria-controls={panelId}
          >
            <Button.Icon
              as={expanded ? RiArrowUpSLine : RiArrowDownSLine}
              className='text-text-sub-600'
            />
          </Button.Root>
        </div>

        <div
          id={panelId}
          ref={setItemsScrollEl}
          className={cn(GROUP_ITEMS_SCROLL_CLASS, !expanded && 'hidden')}
        >
          <ProductsTable
            rows={rows}
            columnConfig={columnConfig}
            columnDefsById={columnDefsById}
            emptyLabel='No items in this group'
            embedded
            getSubRows={getSubRows}
            subRowColumns={subRowColumns}
            subRowColumnDefsById={subRowColumnDefsById}
            onRowClick={onRowClick}
          />
          {renderSentinel()}
        </div>
      </section>
    );
  },
);

ProductsGroupSection.displayName = 'ProductsGroupSection';

export default ProductsGroupSection;
