import React, { useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { RiShoppingCartLine } from 'react-icons/ri';

import { applyColumnConfig, prepareColumnsForConfig } from '@/lib/column-utils';
import { useColumnConfig } from '@/hooks/use-column-config';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Table from '@/components/ui/table';
import { STOCKS_COLUMN_CONFIG_TABLE_ID } from '@/components/stocks/constants';
import StocksListEmptyState from '@/components/stocks/shared/stocks-list-empty-state';
import { fetchCurrentStockListPref, saveCurrentStockListPref } from '@/redux/stocksSlice';
import { cn } from '@/utils/cn';

const centerTagClassName =
  'text-[11px] font-medium uppercase leading-3 tracking-[0.22px] text-text-sub-600 [font-family:var(--font-figtree,Figtree),ui-sans-serif,sans-serif]';
const EMPTY_SORTING = [];

export const STOCKS_INVENTORY_COLUMN_CONFIG = [
  { id: 'product', columnLabel: 'Product', visible: true, enableHiding: true },
  { id: 'stock_center', columnLabel: 'Center', visible: true, enableHiding: true },
  { id: 'unit', columnLabel: 'Unit', visible: true, enableHiding: true },
  { id: 'qty', columnLabel: 'Qty', visible: true, enableHiding: true },
  { id: 'min', columnLabel: 'Min', visible: true, enableHiding: true },
  { id: 'trigger', columnLabel: 'Trigger', visible: true, enableHiding: true },
  { id: 'target', columnLabel: 'Target', visible: true, enableHiding: true },
  { id: 'reorderQty', columnLabel: 'Reorder Qty', visible: true, enableHiding: true },
  { id: 'rate', columnLabel: 'Rate', visible: true, enableHiding: true },
  { id: 'stockValue', columnLabel: 'Stock Value', visible: true, enableHiding: true },
  { id: 'lastIn', columnLabel: 'Last In', visible: true, enableHiding: true },
  { id: 'lastOut', columnLabel: 'Last Out', visible: true, enableHiding: true },
  { id: 'status', columnLabel: 'Status', visible: true, enableHiding: true },
];

export const useStocksInventoryColumnConfig = () => {
  const dispatch = useDispatch();
  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(STOCKS_INVENTORY_COLUMN_CONFIG).map((col, index) => ({
        ...col,
        order: index,
      })),
    [],
  );

  const expectedColumnIds = useMemo(
    () => new Set(defaultColumnConfig.map((column) => column.id)),
    [defaultColumnConfig],
  );

  const fetchStockColumns = useCallback(async () => {
    try {
      const data = await dispatch(fetchCurrentStockListPref()).unwrap();
      if (!Array.isArray(data) || data.length === 0) return null;
      const savedIds = new Set(data.map((column) => column.id));
      const allPresent = [...expectedColumnIds].every((id) => savedIds.has(id));
      return allPresent ? data : null;
    } catch {
      return null;
    }
  }, [dispatch, expectedColumnIds]);

  const persistStockColumns = useCallback(
    async (columns) => {
      await dispatch(saveCurrentStockListPref(columns)).unwrap();
    },
    [dispatch],
  );

  return useColumnConfig(
    STOCKS_COLUMN_CONFIG_TABLE_ID,
    defaultColumnConfig,
    persistStockColumns,
    fetchStockColumns,
    { autoSave: true, debounce: 300 },
  );
};

const stocksSortHeader = (label, sortableByDefault = true) => {
  const Inner = ({ column }) => (
    <Table.SortableHeader
      column={column}
      label={label}
      sortable={column?.id !== 'rowReorder' && (column?.getCanSort?.() ?? sortableByDefault)}
    />
  );
  Inner.displayName = `StocksSortHeader(${label})`;
  return Inner;
};

const CurrentStockTable = React.forwardRef(
  (
    {
      rows = [],
      sorting: sortingFromParent = EMPTY_SORTING,
      onSortingChange,
      isLoading = false,
      columnConfig = [],
      onReorderStock,
      reorderingRowId = '',
      context = 'default',
      error = null,
      onRetry,
    },
    ref,
  ) => {
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

    const allColumnDefs = useMemo(
      () => [
        {
          id: 'product',
          accessorKey: 'product',
          columnLabel: 'Product',
          visible: true,
          enableHiding: true,
          header: stocksSortHeader('Product'),
          cell: ({ row }) => (
            <div className='w-[200px] truncate block  text-ellipsis'>
              <span className='paragraph-small  whitespace-nowrap text-text-sub-500'>
                {row.original.product || '--'}
              </span>
            </div>
          ),
          enableSorting: false,
        },
        {
          id: 'stock_center',
          accessorKey: 'center',
          columnLabel: 'Center',
          visible: true,
          enableHiding: true,
          header: stocksSortHeader('Center'),
          cell: ({ row }) => (
            <span className='inline-flex min-w-0 flex-wrap whitespace-nowrap items-baseline gap-x-1 paragraph-small text-text-sub-500'>
              <span>{row.original.center || '--'}</span>
              {/* {row.original.centerTag ? (
                <span className={centerTagClassName}>{`(${row.original.centerTag})`}</span>
              ) : null} */}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'unit',
          accessorKey: 'unit',
          columnLabel: 'Unit',
          visible: true,
          enableHiding: true,
          header: stocksSortHeader('Unit'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500'>{row.original.unit || '--'}</span>
          ),
          enableSorting: true,
        },
        {
          id: 'qty',
          accessorKey: 'qty',
          columnLabel: 'Qty',
          visible: true,
          enableHiding: true,
          header: stocksSortHeader('Qty'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500'>{row.original.qty || '--'}</span>
          ),
          enableSorting: true,
        },
        {
          id: 'min',
          accessorKey: 'min',
          columnLabel: 'Min',
          visible: true,
          enableHiding: true,
          header: stocksSortHeader('Min'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500'>{row.original.min || '--'}</span>
          ),
          enableSorting: true,
        },
        {
          id: 'trigger',
          accessorKey: 'trigger',
          columnLabel: 'Trigger',
          visible: true,
          enableHiding: true,
          header: stocksSortHeader('Trigger'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500'>
              {row.original.trigger || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'target',
          accessorKey: 'target',
          columnLabel: 'Target',
          visible: true,
          enableHiding: true,
          header: stocksSortHeader('Target'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500'>{row.original.target || '--'}</span>
          ),
          enableSorting: true,
        },
        {
          id: 'reorderQty',
          accessorKey: 'reorderQty',
          columnLabel: 'Reorder Qty',
          visible: true,
          enableHiding: true,
          header: stocksSortHeader('Reorder Qty'),
          cell: ({ row }) => (
            <span
              className={cn(
                'paragraph-small text-text-sub-500',
                row.original.reorderQtyCritical && 'text-error-base',
              )}
            >
              {row.original.reorderQty || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'rate',
          accessorKey: 'rate',
          columnLabel: 'Rate',
          visible: true,
          enableHiding: true,
          header: stocksSortHeader('Rate'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500'>{row.original.rate || '--'}</span>
          ),
          enableSorting: true,
        },
        {
          id: 'stockValue',
          accessorKey: 'stockValue',
          columnLabel: 'Stock Value',
          visible: true,
          enableHiding: true,
          header: stocksSortHeader('Stock Value'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500'>
              {row.original.stockValue || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'lastIn',
          accessorKey: 'lastIn',
          columnLabel: 'Last In',
          visible: true,
          enableHiding: true,
          header: stocksSortHeader('Last In'),
          cell: ({ row }) => (
            <span className='paragraph-small whitespace-nowrap text-text-sub-500'>
              {row.original.lastIn || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'lastOut',
          accessorKey: 'lastOut',
          columnLabel: 'Last Out',
          visible: true,
          enableHiding: true,
          header: stocksSortHeader('Last Out'),
          cell: ({ row }) => (
            <span className='paragraph-small whitespace-nowrap text-text-sub-500'>
              {row.original.lastOut || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'status',
          accessorKey: 'status',
          columnLabel: 'Status',
          visible: true,
          enableHiding: true,
          header: stocksSortHeader('Status'),
          cell: ({ row }) => {
            const isCritical = row.original.statusKey === 'critical';
            return (
              <Badge.Root size='small' variant='lighter' color={isCritical ? 'red' : 'green'}>
                <Badge.Dot />
                {row.original.status || '--'}
              </Badge.Root>
            );
          },
          enableSorting: true,
        },
        {
          id: 'rowReorder',
          accessorKey: 'rowReorder',
          visible: true,
          enableHiding: false,
          meta: { columnClassName: 'sticky right-0 ' },
          header: stocksSortHeader('', false),
          cell: ({ row }) => {
            const isReordering = reorderingRowId === row.original.id;
            return (
              <div className='flex'>
                <Button.Root
                  variant='borderless'
                  mode='filled'
                  size='small'
                  className='gap-1.5 px-1.5  hover:bg-primary-lighter/40'
                  disabled={isReordering}
                  onClick={(event) => {
                    event.stopPropagation();
                    onReorderStock?.(row.original);
                  }}
                >
                  <Button.Icon as={RiShoppingCartLine} />
                  {isReordering ? 'Loading…' : 'Reorder'}
                </Button.Root>
              </div>
            );
          },
          enableSorting: false,
        },
      ],
      [onReorderStock, reorderingRowId],
    );

    const visibleDefs = useMemo(
      () => applyColumnConfig(allColumnDefs, columnConfig),
      [allColumnDefs, columnConfig],
    );

    useImperativeHandle(ref, () => ({
      columnConfig,
      visibleDefs,
    }));

    const table = useReactTable({
      data: rows,
      columns: visibleDefs,
      state: {
        sorting: localSorting,
        columnPinning: { right: ['rowReorder'] },
      },
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      manualSorting: true,
      getRowId: (row) => row.id,
      enableSortingRemoval: true,
    });

    const hasRows = table.getRowModel().rows.length > 0;

    const renderSkeleton = () => (
      <Table.Body spacing={8}>
        {['one', 'two', 'three', 'four', 'five', 'six'].map((rowKey, index, array) => (
          <React.Fragment key={`stocks-skeleton-${rowKey}`}>
            <Table.Row>
              {visibleDefs.map((column) => (
                <Table.Cell key={column.id || column.accessorKey}>
                  <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                </Table.Cell>
              ))}
            </Table.Row>
            {index < array.length - 1 && <Table.RowDivider />}
          </React.Fragment>
        ))}
      </Table.Body>
    );

    if (!isLoading && !hasRows) {
      return <StocksListEmptyState embedded context={context} error={error} onRetry={onRetry} />;
    }

    return (
      <div className='w-full  border-stroke-soft-200 bg-bg-white-0'>
        <Table.Root variant='compact' className='w-full overflow-x-auto' tableInstance={table}>
          <Table.Header className='bg-bg-weak-50 '>
            <Table.Row>
              {table.getHeaderGroups().map((headerGroup) =>
                headerGroup.headers.map((header) => (
                  <Table.Head
                    key={header.id}
                    column={header.column}
                    className='rounded-none first:rounded-none last:rounded-none'
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </Table.Head>
                )),
              )}
            </Table.Row>
          </Table.Header>
          {isLoading && !hasRows ? (
            renderSkeleton()
          ) : (
            <Table.Body spacing={8}>
              {table.getRowModel().rows.map((row, rowIndex, allRows) => (
                <React.Fragment key={row.id}>
                  <Table.Row>
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell key={cell.id} column={cell.column}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                  {rowIndex < allRows.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))}
            </Table.Body>
          )}
        </Table.Root>
      </div>
    );
  },
);

CurrentStockTable.displayName = 'CurrentStockTable';

export default React.memo(CurrentStockTable);
