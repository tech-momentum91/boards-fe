import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import { prepareColumnsForConfig } from '@/lib/column-utils';
import { useColumnConfig } from '@/hooks/use-column-config';
import {
  STOCKS_STOCK_IN_COLUMN_CONFIG,
  STOCKS_STOCK_IN_COLUMN_CONFIG_TABLE_ID,
} from '@/components/stocks/constants';
import {
  isStockInPurchaseOrderRow,
  isStockInTransferRow,
  stockInSourceBadgeColor,
  stockInStatusBadgeColor,
} from '@/components/stocks/stock-in/helpers/shared';
import { fetchStockInListPref, saveStockInListPref } from '@/redux/stocksSlice';
import StocksListEmptyState from '@/components/stocks/shared/stocks-list-empty-state';
import * as Badge from '@/components/ui/badge';
import * as Table from '@/components/ui/table';
import { cn } from '@/utils/cn';

export const useStocksStockInColumnConfig = () => {
  const dispatch = useDispatch();
  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(STOCKS_STOCK_IN_COLUMN_CONFIG).map((column, index) => ({
        ...column,
        order: index,
      })),
    [],
  );

  const expectedColumnIds = useMemo(
    () => new Set(defaultColumnConfig.map((column) => column.id)),
    [defaultColumnConfig],
  );

  const fetchStockInColumns = useCallback(async () => {
    try {
      const data = await dispatch(fetchStockInListPref()).unwrap();
      if (!Array.isArray(data) || data.length === 0) return null;
      const savedIds = new Set(data.map((column) => column.id));
      const allPresent = [...expectedColumnIds].every((id) => savedIds.has(id));
      return allPresent ? data : null;
    } catch {
      return null;
    }
  }, [dispatch, expectedColumnIds]);

  const persistStockInColumns = useCallback(
    async (columns) => {
      await dispatch(saveStockInListPref(columns)).unwrap();
    },
    [dispatch],
  );

  return useColumnConfig(
    STOCKS_STOCK_IN_COLUMN_CONFIG_TABLE_ID,
    defaultColumnConfig,
    persistStockInColumns,
    fetchStockInColumns,
    { autoSave: true, debounce: 300 },
  );
};

/** Column widths from Figma stock-in table (`28919:360346`). */
const COL = {
  center: 'min-w-[165px] max-w-[200px]',
  vendor: 'min-w-[158px] max-w-[200px]',
  date: 'min-w-[131px] max-w-[150px]',
  source: 'min-w-[132px] max-w-[180px]',
  items: 'min-w-[86px] max-w-[100px]',
  acceptedQty: 'min-w-[130px] max-w-[160px]',
  totalValue: 'min-w-[120px] max-w-[150px]',
  status: 'min-w-[160px] max-w-[200px]',
};

const STOCK_IN_PINNED_COLUMN_ID = 'center';
const EMPTY_SORTING = [];
const STOCK_IN_SKELETON_ROW_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6'];

const stockInSortHeader = (label) => {
  const Inner = ({ column }) => (
    <Table.SortableHeader column={column} label={label} sortable={column?.getCanSort?.()} />
  );
  Inner.displayName = `StockInSortHeader(${label})`;
  return Inner;
};

const StockInTable = ({
  rows = [],
  onRowView,
  embedded = false,
  columnConfig = [],
  sorting: sortingFromParent = EMPTY_SORTING,
  onSortingChange,
  isLoading = false,
  error = null,
  context = 'default',
  onRetry,
}) => {
  const [localSorting, setLocalSorting] = useState(sortingFromParent);

  useEffect(() => {
    setLocalSorting(sortingFromParent);
  }, [sortingFromParent]);

  const handleSortingChange = useCallback(
    (updaterOrValue) => {
      const next =
        typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;
      setLocalSorting(next);
      onSortingChange?.(next);
    },
    [localSorting, onSortingChange],
  );

  const allColumns = useMemo(
    () => [
      {
        id: 'center',
        accessorKey: 'center',
        header: stockInSortHeader('Center'),
        meta: { className: COL.center },
        cell: ({ row }) => (
          <span className='paragraph-small whitespace-nowrap text-text-sub-500'>
            {row.original.center}
          </span>
        ),
      },
      {
        id: 'vendor',
        accessorKey: 'vendor',
        header: stockInSortHeader('Vendor'),
        meta: { className: COL.vendor },
        cell: ({ row }) => (
          <span className='paragraph-small whitespace-nowrap text-text-sub-500'>
            {row.original.vendor}
          </span>
        ),
      },
      {
        id: 'date',
        accessorKey: 'date',
        header: stockInSortHeader('Date'),
        meta: { className: COL.date },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.date}</span>
        ),
      },
      {
        id: 'source',
        accessorKey: 'source',
        header: stockInSortHeader('Source'),
        meta: { className: COL.source },
        cell: ({ row }) => (
          <Badge.Root
            size='small'
            variant='light'
            color={stockInSourceBadgeColor(row.original)}
            className='uppercase tracking-wide'
          >
            {isStockInPurchaseOrderRow(row.original)
              ? 'Purchase Order'
              : isStockInTransferRow(row.original)
                ? 'Transfer'
                : 'Manual Entry'}
          </Badge.Root>
        ),
      },
      {
        id: 'items',
        accessorKey: 'items',
        header: stockInSortHeader('Items'),
        enableSorting: false,
        meta: { className: COL.items },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.items ?? '—'}</span>
        ),
      },
      {
        id: 'acceptedQty',
        accessorKey: 'acceptedQty',
        header: stockInSortHeader('Accepted Qty'),
        enableSorting: false,
        meta: { className: COL.acceptedQty },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.acceptedQty}</span>
        ),
      },
      {
        id: 'totalValue',
        accessorKey: 'totalValue',
        header: stockInSortHeader('Total Value'),
        meta: { className: COL.totalValue },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.totalValue}</span>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: stockInSortHeader('Status'),
        meta: { className: COL.status },
        cell: ({ row }) => (
          <Badge.Root
            size='small'
            variant='light'
            color={stockInStatusBadgeColor(row.original.status)}
          >
            {row.original.status}
          </Badge.Root>
        ),
      },
    ],
    [],
  );

  const columns = useMemo(() => {
    if (!Array.isArray(columnConfig) || columnConfig.length === 0) return allColumns;
    const visibleIds = new Set(
      columnConfig.filter((column) => column.visible !== false).map((column) => column.id),
    );
    const orderedIds = columnConfig.map((column) => column.id);

    let result = [...allColumns]
      .sort((first, second) => orderedIds.indexOf(first.id) - orderedIds.indexOf(second.id))
      .filter((column) => visibleIds.has(column.id));

    const pinIndex = result.findIndex((def) => def.id === STOCK_IN_PINNED_COLUMN_ID);
    if (pinIndex > 0) {
      const reordered = [...result];
      const [pinned] = reordered.splice(pinIndex, 1);
      reordered.unshift(pinned);
      result = reordered;
    }

    return result;
  }, [allColumns, columnConfig]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting: localSorting },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    enableSortingRemoval: true,
  });

  const skeletonColumns = table.getVisibleFlatColumns();
  const hasRows = table.getRowModel().rows.length > 0;

  if (!hasRows && !isLoading) {
    return (
      <StocksListEmptyState embedded={embedded} context={context} error={error} onRetry={onRetry} />
    );
  }

  const skeletonBody = (
    <>
      {STOCK_IN_SKELETON_ROW_KEYS.map((rowKey, index, allRows) => (
        <React.Fragment key={`stock-in-skeleton-${rowKey}`}>
          <Table.Row>
            {skeletonColumns.map((column) => (
              <Table.Cell key={column.id} className={column.columnDef.meta?.className}>
                <div className='h-4 w-3/4 max-w-[10rem] animate-pulse rounded-md bg-bg-weak-50' />
              </Table.Cell>
            ))}
          </Table.Row>
          {index < allRows.length - 1 ? <Table.RowDivider /> : null}
        </React.Fragment>
      ))}
    </>
  );

  const body = (
    <>
      {table.getRowModel().rows.map((row, index, allRows) => (
        <React.Fragment key={row.id}>
          <Table.Row
            className={onRowView ? 'cursor-pointer' : undefined}
            onClick={onRowView ? () => onRowView(row.original) : undefined}
          >
            {row.getVisibleCells().map((cell) => (
              <Table.Cell key={cell.id} className={cell.column.columnDef.meta?.className}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </Table.Cell>
            ))}
          </Table.Row>
          {index < allRows.length - 1 ? <Table.RowDivider /> : null}
        </React.Fragment>
      ))}
    </>
  );

  return (
    <div className={cn('overflow-x-auto bg-bg-white-0', embedded ? '' : 'rounded-xl')}>
      <Table.Root className='w-full min-w-[1301px]' variant='compact'>
        <Table.Header>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Table.Head
                  key={header.id}
                  className={`rounded-none first:rounded-none last:rounded-none ${header.column.columnDef.meta?.className || ''}`}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </Table.Head>
              ))}
            </Table.Row>
          ))}
        </Table.Header>
        <Table.Body spacing={8}>{isLoading && !hasRows ? skeletonBody : body}</Table.Body>
      </Table.Root>
    </div>
  );
};

export default StockInTable;
