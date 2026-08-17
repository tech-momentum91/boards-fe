import React, { memo, useMemo, useState } from 'react';
import { RiAddLine, RiDownloadLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';

import {
  AUM_FILTER_VALUE_ALL,
  AUM_IN_TOOLBAR_COPY,
  AUM_TOOLBAR_COPY,
  AUM_TRANSACTION_GROUP_BY_OPTIONS,
} from '@/components/aum/constants';
import StocksGroupByDropdown from '@/components/stocks/stocks-group-by-dropdown';
import StocksToolbarFilterSelect from '@/components/stocks/stocks-toolbar-filter-select';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import { cn } from '@/utils/cn';

const AumAssetInToolbar = memo(
  ({
    searchValue,
    onSearchChange,
    centerFilter,
    onCenterFilterChange,
    centerOptions = [],
    onExport,
    onAdd,
    columnConfig,
    pinnedColumnId,
    groupBy,
    onGroupByChange,
    groupOrder,
    onGroupOrderChange,
    isExporting = false,
  }) => {
    const searchId = React.useId();
    const [columnManagerOpen, setColumnManagerOpen] = useState(false);

    const centerSelectOptions = useMemo(() => {
      const options = Array.isArray(centerOptions) ? centerOptions : [];
      return [{ value: AUM_FILTER_VALUE_ALL, label: 'All Centers' }, ...options];
    }, [centerOptions]);

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
                placeholder={AUM_IN_TOOLBAR_COPY.searchPlaceholder}
                autoComplete='off'
                aria-label={AUM_IN_TOOLBAR_COPY.searchAriaLabel}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='flex min-w-0 shrink-0 flex-nowrap items-center justify-end gap-3'>
          <div className='w-[118px] shrink-0'>
            <StocksToolbarFilterSelect
              value={[centerFilter || AUM_FILTER_VALUE_ALL]}
              onValueChange={(values) => {
                const next = values?.[values.length - 1] ?? AUM_FILTER_VALUE_ALL;
                onCenterFilterChange?.(next);
              }}
              options={centerSelectOptions}
              placeholder={AUM_IN_TOOLBAR_COPY.centerPlaceholder}
            />
          </div>

          <StocksGroupByDropdown
            value={groupBy}
            onChange={onGroupByChange}
            groupOrder={groupOrder}
            onGroupOrderChange={onGroupOrderChange}
            options={AUM_TRANSACTION_GROUP_BY_OPTIONS}
            defaultValue=''
            menuLabel={AUM_TOOLBAR_COPY.groupByMenuLabel}
            clearLabel={AUM_TOOLBAR_COPY.groupByClear}
            triggerAriaLabel={AUM_TOOLBAR_COPY.viewOptionsAriaLabel}
            tooltipLabel='Group-By'
            selectPlaceholder='Select group by'
          />

          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='medium'
            onClick={onExport}
            disabled={isExporting}
            className='size-9 shrink-0 p-2 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
            aria-label='Download barcode labels (PDF)'
          >
            <Button.Icon as={RiDownloadLine} />
          </Button.Root>

          <ColumnManagerDropdown
            open={columnManagerOpen}
            onOpenChange={setColumnManagerOpen}
            config={columnConfig}
            pinnedColumnId={pinnedColumnId}
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
            size='medium'
            className='shrink-0 gap-1'
            onClick={onAdd}
          >
            <Button.Icon as={RiAddLine} />
            {AUM_IN_TOOLBAR_COPY.newAssetInLabel}
          </Button.Root>
        </div>
      </div>
    );
  },
);

AumAssetInToolbar.displayName = 'AumAssetInToolbar';

export default AumAssetInToolbar;
