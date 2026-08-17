import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import { FIRST_COLUMN_NAME } from '@/constants/constants';
import StocksListEmptyState from '@/components/stocks/shared/stocks-list-empty-state';
import * as Badge from '@/components/ui/badge';
import * as Table from '@/components/ui/table';

const consumptionColor = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'high') return 'red';
  if (normalized === 'medium') return 'orange';
  return 'green';
};
const EMPTY_SORTING = [];
const STOCK_RULES_SKELETON_ROW_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6'];

const stockRulesSortHeader = (label) => {
  const Inner = ({ column }) => (
    <Table.SortableHeader column={column} label={label} sortable={column?.getCanSort?.()} />
  );
  Inner.displayName = `StockRulesSortHeader(${label})`;
  return Inner;
};

const StockRulesTable = ({
  rows = [],
  onRowClick,
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
        header: stockRulesSortHeader('Center'),
        meta: { className: 'min-w-[200px] max-w-[220px]' },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.center || '--'}</span>
        ),
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: stockRulesSortHeader('Category'),
        meta: { className: 'min-w-[132px] max-w-[160px]' },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.category || '--'}</span>
        ),
      },
      {
        id: 'product',
        accessorKey: 'product',
        header: stockRulesSortHeader('Product'),
        meta: { className: 'min-w-[200px] max-w-[280px]' },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.product || '--'}</span>
        ),
      },
      {
        id: 'unit',
        accessorKey: 'unit',
        header: stockRulesSortHeader('Unit'),
        meta: { className: 'min-w-[88px] max-w-[100px]' },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.unit || '--'}</span>
        ),
      },
      {
        id: 'min',
        accessorKey: 'min',
        header: stockRulesSortHeader('Min'),
        meta: { className: 'min-w-[88px] max-w-[96px]' },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>
            {String(row.original.min ?? '--')}
          </span>
        ),
      },
      {
        id: 'trigger',
        accessorKey: 'trigger',
        header: stockRulesSortHeader('Trigger'),
        meta: { className: 'min-w-[96px] max-w-[110px]' },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>
            {String(row.original.trigger ?? '--')}
          </span>
        ),
      },
      {
        id: 'target',
        accessorKey: 'target',
        header: stockRulesSortHeader('Target'),
        meta: { className: 'min-w-[96px] max-w-[110px]' },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>
            {String(row.original.target ?? '--')}
          </span>
        ),
      },
      {
        id: 'consumption',
        accessorKey: 'consumption',
        header: stockRulesSortHeader('Consumption'),
        meta: { className: 'min-w-[132px] max-w-[160px]' },
        cell: ({ row }) => (
          <Badge.Root
            size='small'
            variant='light'
            color={consumptionColor(row.original.consumption)}
            className='min-w-[58px] justify-center'
          >
            {row.original.consumption}
          </Badge.Root>
        ),
      },
      {
        id: 'frequency',
        accessorKey: 'frequency',
        header: stockRulesSortHeader('Frequency'),
        meta: { className: 'min-w-[120px] max-w-[150px]' },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>
            {row.original.frequency || '--'}
          </span>
        ),
      },
      {
        id: 'fifo',
        accessorKey: 'fifo',
        header: stockRulesSortHeader('FIFO'),
        meta: { className: 'min-w-[72px] max-w-[88px]' },
        cell: ({ row }) => (
          <Badge.Root
            size='small'
            variant='light'
            color={row.original.fifo ? 'blue' : 'gray'}
            className='min-w-[44px] justify-center'
          >
            {row.original.fifo ? 'Yes' : 'No'}
          </Badge.Root>
        ),
      },
      {
        id: 'critical',
        accessorKey: 'critical',
        header: stockRulesSortHeader('Critical'),
        meta: { className: 'min-w-[80px] max-w-[96px]' },
        cell: ({ row }) => (
          <Badge.Root
            size='small'
            variant='light'
            color={row.original.critical ? 'blue' : 'gray'}
            className='min-w-[44px] justify-center'
          >
            {row.original.critical ? 'Yes' : 'No'}
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

    // Align with ColumnManagerDropdown + applyColumnConfig: FIRST_COLUMN_NAME (e.g. product)
    // stays first in the table even when config order still lists it after center/category.
    if (FIRST_COLUMN_NAME?.length) {
      const pinnedId = FIRST_COLUMN_NAME.find((key) => result.some((def) => def.id === key));
      if (pinnedId) {
        const index = result.findIndex((def) => def.id === pinnedId);
        if (index > 0) {
          const reordered = [...result];
          const [pinned] = reordered.splice(index, 1);
          reordered.unshift(pinned);
          result = reordered;
        }
      }
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
    return <StocksListEmptyState context={context} error={error} onRetry={onRetry} />;
  }

  const skeletonBody = (
    <>
      {STOCK_RULES_SKELETON_ROW_KEYS.map((rowKey, index, allRows) => (
        <React.Fragment key={`stock-rules-skeleton-${rowKey}`}>
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

  return (
    <div className='overflow-x-auto rounded-xl  border-stroke-soft-200 bg-bg-white-0'>
      <Table.Root className='w-full' variant='compact'>
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
        <Table.Body spacing={8}>
          {isLoading && !hasRows
            ? skeletonBody
            : table.getRowModel().rows.map((row, index, allRows) => (
                <React.Fragment key={row.id}>
                  <Table.Row
                    className='cursor-pointer'
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
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
        </Table.Body>
      </Table.Root>
    </div>
  );
};

export default StockRulesTable;
