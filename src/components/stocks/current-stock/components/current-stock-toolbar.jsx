import React, { memo, useCallback, useState } from 'react';
import { RiDownloadLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';

import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import StocksGroupByDropdown from '@/components/stocks/stocks-group-by-dropdown';
import StocksToolbarFilterSelect from '@/components/stocks/stocks-toolbar-filter-select';
import {
  STOCKS_TOOLBAR_CENTER_OPTIONS,
  STOCKS_TOOLBAR_COPY,
  STOCKS_TOOLBAR_STATUS_OPTIONS,
} from '@/components/stocks/constants';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

const CurrentStockToolbar = memo(
  ({
    searchValue,
    onSearchChange,
    category,
    onCategoryChange,
    center,
    onCenterChange,
    status,
    onStatusChange,
    categoryOptions = [],
    centerOptions = STOCKS_TOOLBAR_CENTER_OPTIONS,
    statusOptions = STOCKS_TOOLBAR_STATUS_OPTIONS,
    groupBy,
    onGroupByChange,
    groupOrder = 'asc',
    onGroupOrderChange,
    columnConfig,
  }) => {
    const searchId = React.useId();
    const [columnManagerOpen, setColumnManagerOpen] = useState(false);

    const handleDownload = useCallback(() => {
      // Placeholder until export API exists
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
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={STOCKS_TOOLBAR_COPY.searchPlaceholder}
                autoComplete='off'
                aria-label={STOCKS_TOOLBAR_COPY.searchAriaLabel}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='flex min-w-0 flex-wrap items-center justify-end gap-3'>
          <div className='w-full min-w-0 sm:min-w-[168px] sm:max-w-[240px] sm:flex-1'>
            <StocksToolbarFilterSelect
              value={category}
              onValueChange={onCategoryChange}
              options={categoryOptions}
              placeholder={STOCKS_TOOLBAR_COPY.categoryPlaceholder}
            />
          </div>
          <div className='w-full min-w-0 sm:min-w-[138px] sm:max-w-[220px] sm:flex-1'>
            <StocksToolbarFilterSelect
              value={center}
              onValueChange={onCenterChange}
              options={centerOptions}
              placeholder={STOCKS_TOOLBAR_COPY.centerPlaceholder}
            />
          </div>
          <div className='w-full min-w-0 sm:min-w-[138px] sm:max-w-[220px] sm:flex-1'>
            <StocksToolbarFilterSelect
              value={status}
              onValueChange={onStatusChange}
              options={statusOptions}
              placeholder={STOCKS_TOOLBAR_COPY.statusPlaceholder}
            />
          </div>

          <div className='flex shrink-0 items-center gap-3'>
            <StocksGroupByDropdown
              value={groupBy}
              onChange={onGroupByChange}
              groupOrder={groupOrder}
              onGroupOrderChange={onGroupOrderChange}
            />

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='medium'
                  className='size-9 shrink-0 p-2 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
                  aria-label={STOCKS_TOOLBAR_COPY.downloadAriaLabel}
                  onClick={handleDownload}
                >
                  <Button.Icon as={RiDownloadLine} />
                </Button.Root>
              </Tooltip.Trigger>
              <Tooltip.Content size='xsmall' side='bottom'>
                {STOCKS_TOOLBAR_COPY.downloadTooltip}
              </Tooltip.Content>
            </Tooltip.Root>

            <ColumnManagerDropdown
              open={columnManagerOpen}
              onOpenChange={setColumnManagerOpen}
              config={columnConfig}
              tooltipContent={<p>{STOCKS_TOOLBAR_COPY.columnsTooltip}</p>}
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
                  aria-label={STOCKS_TOOLBAR_COPY.columnsAriaLabel}
                  aria-expanded={columnManagerOpen}
                >
                  <Button.Icon as={RiLayoutColumnLine} />
                </Button.Root>
              }
            />
          </div>
        </div>
      </div>
    );
  },
);

CurrentStockToolbar.displayName = 'CurrentStockToolbar';

export default CurrentStockToolbar;
