import React, { memo, useCallback, useState } from 'react';
import { RiAddLine, RiDownloadLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';

import {
  STOCKS_VENDOR_RC_GROUP_BY_OPTIONS,
  STOCKS_VENDOR_RC_STATUS_FILTER_OPTIONS,
} from '@/components/stocks/constants';
import StocksGroupByDropdown from '@/components/stocks/stocks-group-by-dropdown';
import StocksToolbarFilterSelect from '@/components/stocks/stocks-toolbar-filter-select';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

const VendorRcToolbar = memo(
  ({
    searchValue,
    onSearchChange,
    category,
    onCategoryChange,
    status,
    onStatusChange,
    groupBy,
    onGroupByChange,
    groupOrder,
    onGroupOrderChange,
    onAdd,
    columnConfig,
    categoryOptions = [],
  }) => {
    const searchId = React.useId();
    const [columnManagerOpen, setColumnManagerOpen] = useState(false);

    const handleDownload = useCallback(() => {
      // Placeholder until export API exists.
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
                aria-label='Search vendor rate cards'
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3'>
          <div className='flex w-full min-w-0 flex-wrap items-center gap-3 sm:flex-1 sm:justify-end'>
            <div className='w-full min-w-0 sm:min-w-[138px] sm:max-w-[220px] sm:flex-1'>
              <StocksToolbarFilterSelect
                value={category}
                onValueChange={onCategoryChange}
                options={categoryOptions}
                placeholder='All Categories'
              />
            </div>
            <div className='w-full min-w-0 sm:min-w-[138px] sm:max-w-[220px] sm:flex-1'>
              <StocksToolbarFilterSelect
                value={status}
                onValueChange={onStatusChange}
                options={STOCKS_VENDOR_RC_STATUS_FILTER_OPTIONS}
                placeholder='All Status'
              />
            </div>
          </div>

          <div className='flex shrink-0 items-center gap-3'>
            <StocksGroupByDropdown
              value={groupBy}
              onChange={onGroupByChange}
              groupOrder={groupOrder}
              onGroupOrderChange={onGroupOrderChange}
              options={STOCKS_VENDOR_RC_GROUP_BY_OPTIONS}
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
              tooltipContent={<p>Columns</p>}
              trigger={
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='medium'
                  className={cn(
                    'size-9 shrink-0 p-2 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]',
                    columnManagerOpen && 'ring-2 ring-stroke-soft-200',
                  )}
                  aria-label='Column settings'
                  aria-expanded={columnManagerOpen}
                >
                  <Button.Icon as={RiLayoutColumnLine} />
                </Button.Root>
              }
            />

            <Button.Root
              variant='primary'
              mode='filled'
              size='small'
              className='flex items-center gap-1 p-2'
              onClick={onAdd}
            >
              <Button.Icon as={RiAddLine} className='size-5' />
              <span className='text-label-sm px-1'>Add</span>
            </Button.Root>
          </div>
        </div>
      </div>
    );
  },
);

VendorRcToolbar.displayName = 'VendorRcToolbar';

export default VendorRcToolbar;
