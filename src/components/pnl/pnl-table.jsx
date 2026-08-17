import React, { useCallback, useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import * as Table from '@/components/ui/table';
import { applyColumnConfig, prepareColumnsForConfig } from '@/lib/column-utils';
import { formatInrCompact } from '@/utils/inr-format';
import { useColumnConfig } from '@/hooks/use-column-config';

const PNL_TABLE_ID = 'center-detail-pnl-table';

const formatPercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '--';
  return `${n.toFixed(2)}%`;
};

const PNL_COLUMN_CONFIG_SEED = [
  { id: 'period', columnLabel: 'Month' },
  { id: 'billed', columnLabel: 'Billed' },
  { id: 'collected', columnLabel: 'Collected' },
  { id: 'pending', columnLabel: 'Pending' },
  { id: 'opex', columnLabel: 'OPEX' },
  { id: 'profit', columnLabel: 'Profit' },
  { id: 'margin_percent', columnLabel: 'Margin%' },
  { id: 'collection_percent', columnLabel: 'Collection%' },
];

const PnlTable = React.forwardRef(
  (
    {
      rows = [],
      isLoading = false,
      variant = 'compact',
      tableId = PNL_TABLE_ID,
      sorting = [],
      onSortingChange,
    },
    ref,
  ) => {
    const defaultColumnConfig = useMemo(() => {
      const config = prepareColumnsForConfig(PNL_COLUMN_CONFIG_SEED);
      return config.map((col, index) => ({ ...col, order: index }));
    }, []);

    // NOTE: This mimics OPEX's "saved config" behavior, but uses localStorage until an API is available.
    const internalColumnConfigHook = useColumnConfig(
      tableId,
      defaultColumnConfig,
      async (cols) => {
        localStorage.setItem(`column-config-${tableId}`, JSON.stringify(cols));
        return cols;
      },
      async () => localStorage.getItem(`column-config-${tableId}`) || defaultColumnConfig,
      { autoSave: true, debounce: 300 },
    );

    const { columns: columnConfig } = internalColumnConfigHook;

    React.useImperativeHandle(ref, () => ({
      columnConfig: internalColumnConfigHook.columns,
      columnConfigHook: internalColumnConfigHook,
    }));

    const allColumnDefs = useMemo(
      () => [
        {
          id: 'period',
          accessorKey: 'period',
          columnLabel: 'Month',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Month' className='w-[140px]' sortable />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
              {row.original.period || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'billed',
          accessorKey: 'billed',
          columnLabel: 'Billed',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Billed' className='w-[140px]' sortable />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
              {formatInrCompact(row.original.billed || 0)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'collected',
          accessorKey: 'collected',
          columnLabel: 'Collected',
          header: ({ column }) => (
            <Table.SortableHeader
              column={column}
              label='Collected'
              className='w-[140px]'
              sortable
            />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
              {formatInrCompact(row.original.collected || 0)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'pending',
          accessorKey: 'pending',
          columnLabel: 'Pending',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Pending' className='w-[140px]' sortable />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
              {formatInrCompact(row.original.pending || 0)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'opex',
          accessorKey: 'opex',
          columnLabel: 'OPEX',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='OPEX' className='w-[140px]' sortable />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
              {formatInrCompact(row.original.opex || 0)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'profit',
          accessorKey: 'profit',
          columnLabel: 'Profit',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Profit' className='w-[140px]' sortable />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
              {formatInrCompact(row.original.profit || 0)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'margin_percent',
          accessorKey: 'margin_percent',
          columnLabel: 'Margin%',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Margin%' className='w-[120px]' sortable />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
              {formatPercent(row.original.margin_percent)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'collection_percent',
          accessorKey: 'collection_percent',
          columnLabel: 'Collection%',
          header: ({ column }) => (
            <Table.SortableHeader
              column={column}
              label='Collection%'
              className='w-[130px]'
              sortable
            />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
              {formatPercent(row.original.collection_percent)}
            </span>
          ),
          enableSorting: true,
        },
      ],
      [],
    );

    const columns = useMemo(
      () => applyColumnConfig(allColumnDefs, columnConfig),
      [allColumnDefs, columnConfig],
    );

    const handleSortingChange = useCallback(
      (updaterOrValue) => {
        const next =
          typeof updaterOrValue === 'function' ? updaterOrValue(sorting || []) : updaterOrValue;
        onSortingChange?.(next);
      },
      [onSortingChange, sorting],
    );

    const table = useReactTable({
      data: rows,
      columns,
      state: { sorting: sorting || [] },
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      manualSorting: false,
      enableSortingRemoval: true,
      autoResetPageIndex: false,
    });

    if (!isLoading && (!rows || rows.length === 0)) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>
            No P&amp;L records found
          </h3>
          <p className='max-w-md text-sm text-text-sub-600'>
            Try changing the month filter or search query.
          </p>
        </div>
      );
    }

    return (
      <div className='w-full'>
        <Table.Root variant={variant} tableInstance={table} className='h-[500px] overflow-auto'>
          <Table.Header className='sticky top-0 z-30 bg-bg-weak-50'>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Head key={header.id} column={header.column}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </Table.Head>
                ))}
              </Table.Row>
            ))}
          </Table.Header>
          <Table.Body>
            {table.getRowModel().rows.map((row, i, arr) => (
              <React.Fragment key={row.id}>
                <Table.Row className='cursor-default'>
                  {row.getVisibleCells().map((cell) => (
                    <Table.Cell key={cell.id} column={cell.column}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Cell>
                  ))}
                </Table.Row>
                {i < arr.length - 1 && <Table.RowDivider />}
              </React.Fragment>
            ))}
          </Table.Body>
        </Table.Root>
      </div>
    );
  },
);

PnlTable.displayName = 'PnlTable';

export default PnlTable;
