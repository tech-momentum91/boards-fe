import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import { prepareColumnsForConfig } from '@/lib/column-utils';
import { useColumnConfig } from '@/hooks/use-column-config';
import {
  STOCKS_ORDERS_COLUMN_CONFIG,
  STOCKS_ORDERS_COLUMN_CONFIG_TABLE_ID,
  STOCKS_ORDER_STATUS,
} from '@/components/stocks/constants';
import { fetchPurchaseOrderListPref, savePurchaseOrderListPref } from '@/redux/stocksSlice';
import StocksListEmptyState from '@/components/stocks/shared/stocks-list-empty-state';
import * as Badge from '@/components/ui/badge';
import * as Table from '@/components/ui/table';
import { cn } from '@/utils/cn';

export const useStocksOrdersColumnConfig = () => {
  const dispatch = useDispatch();
  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(STOCKS_ORDERS_COLUMN_CONFIG).map((column, index) => ({
        ...column,
        order: index,
      })),
    [],
  );

  const expectedColumnIds = useMemo(
    () => new Set(defaultColumnConfig.map((column) => column.id)),
    [defaultColumnConfig],
  );

  const fetchOrdersColumns = useCallback(async () => {
    try {
      const data = await dispatch(fetchPurchaseOrderListPref()).unwrap();
      if (!Array.isArray(data) || data.length === 0) return null;
      const savedIds = new Set(data.map((column) => column.id));
      const allPresent = [...expectedColumnIds].every((id) => savedIds.has(id));
      return allPresent ? data : null;
    } catch {
      return null;
    }
  }, [dispatch, expectedColumnIds]);

  const persistOrdersColumns = useCallback(
    async (columns) => {
      await dispatch(savePurchaseOrderListPref(columns)).unwrap();
    },
    [dispatch],
  );

  return useColumnConfig(
    STOCKS_ORDERS_COLUMN_CONFIG_TABLE_ID,
    defaultColumnConfig,
    persistOrdersColumns,
    fetchOrdersColumns,
    { autoSave: true, debounce: 300 },
  );
};

const statusBadgeColor = (status) => {
  if (status === STOCKS_ORDER_STATUS.DRAFT) return 'gray';
  if (status === STOCKS_ORDER_STATUS.ORDERED) return 'blue';
  if (status === STOCKS_ORDER_STATUS.PARTIAL) return 'orange';
  if (status === STOCKS_ORDER_STATUS.FULLY_RECEIVED) return 'green';
  if (status === STOCKS_ORDER_STATUS.CANCELLED) return 'red';
  return 'gray';
};

/** Display `totalQty` from API (number or string). */
function formatTotalQtyCell(value) {
  if (value == null) return '—';
  const s = String(value).trim();
  return s === '' ? '—' : s;
}

/** Column min-widths from Figma `28919:368862` (Full Table header track sizes). */
const COL = {
  poId: 'min-w-[200px] max-w-[200px]',
  center: 'min-w-[165px] max-w-[200px]',
  vendor: 'min-w-[158px] max-w-[200px]',
  category: 'min-w-[141px] max-w-[180px]',
  orderDate: 'min-w-[132px] max-w-[150px]',
  expectedDelivery: 'min-w-[169px] max-w-[200px]',
  products: 'min-w-[109px] max-w-[130px]',
  totalQty: 'min-w-[113px] max-w-[130px]',
  orderValue: 'min-w-[129px] max-w-[160px]',
  status: 'min-w-[143px] max-w-[180px]',
};

const ORDER_PINNED_COLUMN_ID = 'orderNo';
const EMPTY_SORTING = [];
const ORDER_SKELETON_ROW_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6'];

const orderSortHeader = (label) => {
  const Inner = ({ column }) => (
    <Table.SortableHeader column={column} label={label} sortable={column?.getCanSort?.()} />
  );
  Inner.displayName = `OrderSortHeader(${label})`;
  return Inner;
};

const OrdersTable = ({
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

  const allColumns = useMemo(() => {
    return [
      {
        id: 'orderNo',
        accessorKey: 'orderNo',
        header: orderSortHeader('PO ID'),
        meta: { className: COL.poId },
        cell: ({ row }) => (
          <span className='paragraph-small whitespace-nowrap font-medium text-text-main-900'>
            {row.original.orderNo}
          </span>
        ),
      },
      {
        id: 'poCenter',
        accessorKey: 'center',
        header: orderSortHeader('Center'),
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
        header: orderSortHeader('Vendor'),
        meta: { className: COL.vendor },
        cell: ({ row }) => (
          <span className='paragraph-small whitespace-nowrap text-text-sub-500'>
            {row.original.vendor}
          </span>
        ),
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: orderSortHeader('Category'),
        enableSorting: false,
        meta: { className: COL.category },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.category}</span>
        ),
      },
      {
        id: 'requestDate',
        accessorKey: 'requestDate',
        header: orderSortHeader('Order Date'),
        meta: { className: COL.orderDate },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.requestDate}</span>
        ),
      },
      {
        id: 'expectedDelivery',
        accessorKey: 'expectedDelivery',
        header: orderSortHeader('Expected Delivery'),
        meta: { className: COL.expectedDelivery },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.expectedDelivery}</span>
        ),
      },
      {
        id: 'products',
        accessorKey: 'lineItemCount',
        header: orderSortHeader('Products'),
        enableSorting: false,
        meta: { className: COL.products },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>
            {row.original.lineItemCount ?? '—'}
          </span>
        ),
      },
      {
        id: 'totalQty',
        accessorKey: 'totalQty',
        header: orderSortHeader('Total Qty'),
        enableSorting: false,
        meta: { className: COL.totalQty },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>
            {formatTotalQtyCell(row.original.totalQty)}
          </span>
        ),
      },
      {
        id: 'orderValue',
        accessorKey: 'totalAmountLabel',
        header: orderSortHeader('Order Value'),
        meta: { className: COL.orderValue },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.totalAmountLabel}</span>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: orderSortHeader('Status'),
        meta: { className: COL.status },
        cell: ({ row }) => (
          <Badge.Root size='small' variant='light' color={statusBadgeColor(row.original.status)}>
            {row.original.status}
          </Badge.Root>
        ),
      },
    ];
  }, []);

  const columns = useMemo(() => {
    if (!Array.isArray(columnConfig) || columnConfig.length === 0) return allColumns;
    const visibleIds = new Set(
      columnConfig.filter((column) => column.visible !== false).map((column) => column.id),
    );
    const orderedIds = columnConfig.map((column) => column.id);

    let result = [...allColumns]
      .sort((first, second) => orderedIds.indexOf(first.id) - orderedIds.indexOf(second.id))
      .filter((column) => visibleIds.has(column.id));

    const pinIndex = result.findIndex((def) => def.id === ORDER_PINNED_COLUMN_ID);
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

  const tableMinClass = useMemo(() => {
    const widths = {
      orderNo: 140,
      poCenter: 200,
      vendor: 200,
      category: 180,
      requestDate: 150,
      expectedDelivery: 200,
      products: 130,
      totalQty: 130,
      orderValue: 160,
      status: 180,
    };
    let sum = 0;
    for (const col of columns) {
      sum += widths[col.id] ?? 120;
    }
    const minPx = Math.max(sum + 32, 640);
    return `min-w-[${minPx}px]`;
  }, [columns]);

  const skeletonColumns = table.getVisibleFlatColumns();
  const hasRows = table.getRowModel().rows.length > 0;

  if (!hasRows && !isLoading) {
    return (
      <StocksListEmptyState embedded={embedded} context={context} error={error} onRetry={onRetry} />
    );
  }

  const skeletonBody = (
    <>
      {ORDER_SKELETON_ROW_KEYS.map((rowKey, index, allRows) => (
        <React.Fragment key={`orders-skeleton-${rowKey}`}>
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

  const flatBody = (
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
    <div className={cn('overflow-x-auto bg-bg-white-0', embedded ? '' : 'rounded-xl  ')}>
      <Table.Root className={cn('w-full', tableMinClass)} variant='compact'>
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
        <Table.Body spacing={8}>{isLoading && !hasRows ? skeletonBody : flatBody}</Table.Body>
      </Table.Root>
    </div>
  );
};

export default OrdersTable;
