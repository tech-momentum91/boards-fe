import React, { memo, useCallback, useId, useState } from 'react';
import { RiAddLine, RiDownloadLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';

import {
  STOCKS_STOCK_OUT_GROUP_BY_OPTIONS,
  STOCKS_TOOLBAR_COPY,
} from '@/components/stocks/constants';
import StocksGroupByDropdown from '@/components/stocks/stocks-group-by-dropdown';
import StocksToolbarFilterSelect from '@/components/stocks/stocks-toolbar-filter-select';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

const StockOutToolbar = memo(
  ({
    searchValue,
    onSearchChange,
    center,
    onCenterChange,
    department,
    onDepartmentChange,
    status,
    onStatusChange,
    centerOptions,
    departmentOptions,
    statusOptions,
    groupBy,
    onGroupByChange,
    groupOrder,
    onGroupOrderChange,
    onAdd,
    columnConfig,
  }) => {
    const searchFieldId = useId();
    const [columnManagerOpen, setColumnManagerOpen] = useState(false);

    const handleDownload = useCallback(() => {}, []);

    return (
      <div className='flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='w-full shrink-0 sm:w-[276px] sm:max-w-[276px]'>
          <Input.Root size='medium'>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                id={searchFieldId}
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder='Search here...'
                autoComplete='off'
                aria-label='Search stock out'
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3'>
          <div className='w-[120px] shrink-0 sm:min-w-[120px]'>
            <StocksToolbarFilterSelect
              value={center}
              onValueChange={onCenterChange}
              options={centerOptions}
              placeholder='All Centers'
            />
          </div>
          <div className='w-[119px] shrink-0 sm:min-w-[119px]'>
            <StocksToolbarFilterSelect
              value={department}
              onValueChange={onDepartmentChange}
              options={departmentOptions}
              placeholder='All Departments'
            />
          </div>
          <div className='w-[108px] shrink-0 sm:min-w-[108px]'>
            <StocksToolbarFilterSelect
              value={status}
              onValueChange={onStatusChange}
              options={statusOptions}
              placeholder='All Status'
            />
          </div>

          <div className='flex shrink-0 flex-wrap items-center justify-end gap-3'>
            <StocksGroupByDropdown
              value={groupBy}
              onChange={onGroupByChange}
              groupOrder={groupOrder}
              onGroupOrderChange={onGroupOrderChange}
              options={STOCKS_STOCK_OUT_GROUP_BY_OPTIONS}
              defaultValue=''
              menuLabel='GROUP BY'
              clearLabel='Clear'
              triggerAriaLabel='View options'
              tooltipLabel='Group-By'
              selectPlaceholder='Select'
            />

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

            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='small'
              className='h-9 gap-1 px-2 shadow-[0px_1px_2px_0px_rgba(55,93,251,0.08)]'
              onClick={onAdd}
            >
              <Button.Icon as={RiAddLine} className='size-5' />
              <span className='text-label-sm font-medium px-1'>Add</span>
            </Button.Root>
          </div>
        </div>
      </div>
    );
  },
);

StockOutToolbar.displayName = 'StockOutToolbar';

export default StockOutToolbar;
