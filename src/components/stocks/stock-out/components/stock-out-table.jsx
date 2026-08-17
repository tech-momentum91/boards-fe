import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import { stockOutStatusBadgeColor } from '@/components/stocks/stock-out/constants';
import StocksListEmptyState from '@/components/stocks/shared/stocks-list-empty-state';
import * as Badge from '@/components/ui/badge';
import * as Table from '@/components/ui/table';
import { cn } from '@/utils/cn';

const statusBadgeColor = stockOutStatusBadgeColor;

const COL = {
  center: 'min-w-[165px] max-w-[200px]',
  department: 'min-w-[140px] max-w-[180px]',
  date: 'min-w-[131px] max-w-[150px]',
  category: 'min-w-[120px] max-w-[160px]',
  items: 'min-w-[86px] max-w-[100px]',
  issuedQty: 'min-w-[110px] max-w-[140px]',
  status: 'min-w-[160px] max-w-[200px]',
};
const EMPTY_SORTING = [];
const STOCK_OUT_SKELETON_ROW_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6'];

const stockOutSortHeader = (label) => {
  const Inner = ({ column }) => (
    <Table.SortableHeader column={column} label={label} sortable={column?.getCanSort?.()} />
  );
  Inner.displayName = `StockOutSortHeader(${label})`;
  return Inner;
};

const StockOutTable = ({
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
        header: stockOutSortHeader('Center'),
        meta: { className: COL.center },
        cell: ({ row }) => (
          <span className='paragraph-small whitespace-nowrap text-text-sub-500'>
            {row.original.center}
          </span>
        ),
      },
      {
        id: 'department',
        accessorKey: 'department',
        header: stockOutSortHeader('Department'),
        enableSorting: false,
        meta: { className: COL.department },
        cell: ({ row }) => (
          <span className='paragraph-small whitespace-nowrap text-text-sub-500'>
            {row.original.department}
          </span>
        ),
      },
      {
        id: 'date',
        accessorKey: 'date',
        header: stockOutSortHeader('Date'),
        meta: { className: COL.date },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.date}</span>
        ),
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: stockOutSortHeader('Category'),
        enableSorting: false,
        meta: { className: COL.category },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.category}</span>
        ),
      },
      {
        id: 'items',
        accessorKey: 'items',
        header: stockOutSortHeader('Items'),
        enableSorting: false,
        meta: { className: COL.items },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.items ?? '—'}</span>
        ),
      },
      {
        id: 'issuedQty',
        accessorKey: 'issuedQty',
        header: stockOutSortHeader('Issued qty'),
        enableSorting: false,
        meta: { className: COL.issuedQty },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.issuedQty}</span>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: stockOutSortHeader('Status'),
        meta: { className: COL.status },
        cell: ({ row }) => (
          <Badge.Root size='small' variant='light' color={statusBadgeColor(row.original.status)}>
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

    return [...allColumns]
      .sort((first, second) => orderedIds.indexOf(first.id) - orderedIds.indexOf(second.id))
      .filter((column) => visibleIds.has(column.id));
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
      {STOCK_OUT_SKELETON_ROW_KEYS.map((rowKey, index, allRows) => (
        <React.Fragment key={`stock-out-skeleton-${rowKey}`}>
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
      <Table.Root className='w-full min-w-[1100px]' variant='compact'>
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

export default StockOutTable;
