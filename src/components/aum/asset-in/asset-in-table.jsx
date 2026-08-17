import React, { memo, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { formatAumDetailDateDisplay } from '@/components/aum/asset/asset-detail-helper';
import {
  AUM_ASSET_IN_LIST_TABLE_ID,
  AUM_IN_COLUMN_CONFIG,
  AUM_PINNED_COLUMN_ID,
} from '@/components/aum/constants';
import { applyColumnConfig } from '@/lib/column-utils';
import * as Badge from '@/components/ui/badge';
import * as Table from '@/components/ui/table';
import { cn } from '@/utils/cn';

const COL = {
  serialNumber: 'min-w-[140px] max-w-[170px]',
  inDate: 'min-w-[131px] max-w-[150px]',
  center: 'min-w-[165px] max-w-[200px]',
  floor: 'min-w-[110px] max-w-[140px]',
  area: 'min-w-[150px] max-w-[180px]',
  layout: 'min-w-[120px] max-w-[150px]',
  product: 'min-w-[180px] max-w-[240px]',
  qty: 'min-w-[72px] max-w-[90px]',
  unit_price: 'min-w-[120px] max-w-[150px]',
  total_value: 'min-w-[120px] max-w-[150px]',
  status: 'min-w-[110px] max-w-[130px]',
  createdBy: 'min-w-[140px] max-w-[180px]',
};

const EMPTY_SORTING = [];

const inSortHeader = (label) => {
  const Inner = ({ column }) => (
    <Table.SortableHeader column={column} label={label} sortable={column?.getCanSort?.()} />
  );
  Inner.displayName = `AumInSortHeader(${label})`;
  return Inner;
};

const textCell = (value) => (
  <span className='paragraph-small whitespace-nowrap text-text-sub-500'>{value ?? '—'}</span>
);

function getAssetInStatusBadgeColor(status) {
  return status === 'Completed' ? 'green' : 'orange';
}

const AumAssetInTable = memo(({ rows = [], columnConfig = [], onRowClick, embedded = false }) => {
  const [sorting, setSorting] = useState(EMPTY_SORTING);

  const allColumns = useMemo(
    () => [
      {
        id: 'serialNumber',
        accessorKey: 'serialNumber',
        header: inSortHeader('Serial Number'),
        meta: { className: COL.serialNumber },
        cell: ({ row }) => (
          <span
            onClick={() => onRowClick?.(row.original)}
            className='paragraph-small whitespace-nowrap font-medium text-primary-base cursor-pointer hover:underline'
          >
            {row.original.serialNumber}
          </span>
        ),
      },
      {
        id: 'inDate',
        accessorKey: 'inDate',
        header: inSortHeader('In Date'),
        meta: { className: COL.inDate },
        cell: ({ row }) => textCell(formatAumDetailDateDisplay(row.original.inDate)),
      },
      {
        id: 'center',
        accessorKey: 'centerName',
        header: inSortHeader('Center'),
        meta: { className: COL.center },
        cell: ({ row }) => textCell(row.original.centerName),
      },
      {
        id: 'floor',
        accessorKey: 'floor',
        header: inSortHeader('Floor'),
        meta: { className: COL.floor },
        cell: ({ row }) => textCell(row.original.floor),
      },
      {
        id: 'area',
        accessorKey: 'area',
        header: inSortHeader('Area'),
        meta: { className: COL.area },
        cell: ({ row }) => textCell(row.original.area),
      },
      {
        id: 'layout',
        accessorKey: 'layout',
        header: inSortHeader('Layout'),
        meta: { className: COL.layout },
        cell: ({ row }) => textCell(row.original.layout),
      },
      {
        id: 'productName',
        accessorKey: 'product',
        header: inSortHeader('Product'),
        meta: { className: COL.product },
        cell: ({ row }) => textCell(row.original.product),
      },
      {
        id: 'qty',
        accessorKey: 'qty',
        header: inSortHeader('Qty'),
        meta: { className: COL.qty },
        cell: ({ row }) => textCell(row.original.qty),
      },
      {
        id: 'unit_price',
        accessorKey: 'unit_price',
        header: inSortHeader('Unit Price'),
        meta: { className: COL.unit_price },
        cell: ({ row }) => textCell(row.original.unit_price),
      },
      {
        id: 'total_value',
        accessorKey: 'total_value',
        header: inSortHeader('Total Value'),
        meta: { className: COL.total_value },
        cell: ({ row }) => textCell(row.original.total_value),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: inSortHeader('Status'),
        meta: { className: COL.status },
        cell: ({ row }) => {
          const status = row.original.status || 'Draft';
          return (
            <Badge.Root size='small' variant='filled' color={getAssetInStatusBadgeColor(status)}>
              {status}
            </Badge.Root>
          );
        },
      },
      {
        id: 'createdBy',
        accessorKey: 'createdBy',
        header: inSortHeader('Created By'),
        meta: { className: COL.createdBy },
        cell: ({ row }) => textCell(row.original.createdBy),
      },
    ],
    [onRowClick],
  );

  const columns = useMemo(
    () =>
      applyColumnConfig(
        allColumns,
        columnConfig,
        AUM_IN_COLUMN_CONFIG,
        AUM_PINNED_COLUMN_ID[AUM_ASSET_IN_LIST_TABLE_ID],
      ),
    [allColumns, columnConfig],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: true,
  });

  if (Array.isArray(columnConfig) && columnConfig.length > 0) {
    const hasVisibleColumns = columnConfig.some((column) => column.visible !== false);
    if (!hasVisibleColumns) {
      return (
        <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-10 text-center text-label-sm text-text-sub-500'>
          No columns selected. Use the column settings to show fields.
        </div>
      );
    }
  }

  if (rows.length === 0) {
    return (
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-10 text-center text-label-sm text-text-sub-500'>
        No asset in transactions match these filters.
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto bg-bg-white-0', !embedded && 'rounded-xl')}>
      <Table.Root className='w-full min-w-[1320px]' variant='compact'>
        <Table.Header>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Table.Head
                  key={header.id}
                  className={cn(
                    'rounded-none first:rounded-none last:rounded-none',
                    header.column.columnDef.meta?.className,
                  )}
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
          {table.getRowModel().rows.map((row, index, allRows) => (
            <React.Fragment key={row.id}>
              <Table.Row>
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
});

AumAssetInTable.displayName = 'AumAssetInTable';

export default AumAssetInTable;
