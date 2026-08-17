import React, { memo, useState } from 'react';
import { RiArrowDownSLine, RiArrowUpSLine, RiShoppingCartLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import CurrentStockTable from '@/components/stocks/current-stock/components/current-stock-table';
import {
  STOCKS_CATEGORY_PANEL_ID_PREFIX,
  STOCKS_CATEGORY_REORDER_BUTTON_PROPS,
  STOCKS_CATEGORY_SECTION_COPY,
} from '@/components/stocks/constants';
import { cn } from '@/utils/cn';

const CurrentStockCategorySection = memo(
  ({
    category,
    columnConfig,
    isLoading = false,
    onReorderStock,
    reorderingRowId = '',
    sorting,
    onSortingChange,
  }) => {
    const [expanded, setExpanded] = useState(true);
    const { id, name, itemCount, valueLabel, criticalCount, rows } = category;
    const panelId = `${STOCKS_CATEGORY_PANEL_ID_PREFIX}${id}`;

    return (
      <section className='flex w-full flex-col overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'>
        <div className='flex  flex-wrap items-center justify-between gap-3 border-b border-stroke-soft-200 px-3 py-1.5 sm:px-3'>
          <div className='flex min-w-0 flex-1 flex-wrap items-center gap-1.5'>
            <h2 className='truncate text-label-sm font-medium text-text-main-900'>{name}</h2>
            <Badge.Root
              size='small'
              variant='lighter'
              className='border border-stroke-soft-200'
              color='gray'
            >
              <span>
                {itemCount}
                {STOCKS_CATEGORY_SECTION_COPY.itemsSuffix}
              </span>
              <span className='size-1 shrink-0 rounded-full bg-[#344054]' aria-hidden />
              <span>{valueLabel}</span>
            </Badge.Root>
            {criticalCount > 0 ? (
              <Badge.Root
                size='small'
                variant='lighter'
                className='border border-error-light'
                color='red'
              >
                {criticalCount}
                {STOCKS_CATEGORY_SECTION_COPY.criticalSuffix}
              </Badge.Root>
            ) : null}
          </div>
          <div className='flex shrink-0 items-center gap-2'>
            <Button.Root
              variant={STOCKS_CATEGORY_REORDER_BUTTON_PROPS.variant}
              mode={STOCKS_CATEGORY_REORDER_BUTTON_PROPS.mode}
              size={STOCKS_CATEGORY_REORDER_BUTTON_PROPS.size}
              className='gap-2 px-1.5 text-primary-base hover:bg-primary-lighter/40'
            >
              <Button.Icon as={RiShoppingCartLine} className='text-primary-base' />
              {STOCKS_CATEGORY_SECTION_COPY.reorderCategory}
            </Button.Root>
            <Button.Root
              onClick={() => setExpanded((v) => !v)}
              variant='borderless'
              size='small'
              className='gap-2 px-1.5 text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-main-900 focus-visible:ring-2 focus-visible:ring-primary-base/30'
            >
              <Button.Icon
                as={expanded ? RiArrowUpSLine : RiArrowDownSLine}
                className='text-text-sub-600'
              />
            </Button.Root>
          </div>
        </div>

        <div id={panelId} className={cn(!expanded && 'hidden', 'border-t border-transparent')}>
          <div className='p-0'>
            <CurrentStockTable
              rows={rows}
              columnConfig={columnConfig}
              isLoading={isLoading}
              onReorderStock={onReorderStock}
              reorderingRowId={reorderingRowId}
              sorting={sorting}
              onSortingChange={onSortingChange}
            />
          </div>
        </div>
      </section>
    );
  },
);

CurrentStockCategorySection.displayName = 'CurrentStockCategorySection';

export default CurrentStockCategorySection;
