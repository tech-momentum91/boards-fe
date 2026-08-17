import React, { memo, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  getAssetOutReasonBadgeColor,
  getAssetOutStatusBadgeColor,
} from '@/components/aum/asset-out/asset-out-helper';
import {
  AUM_ASSET_OUT_LIST_TABLE_ID,
  AUM_OUT_COLUMN_CONFIG,
  AUM_PINNED_COLUMN_ID,
} from '@/components/aum/constants';
import { formatAumDetailDateDisplay } from '@/components/aum/asset/asset-detail-helper';
import { applyColumnConfig } from '@/lib/column-utils';
import * as Badge from '@/components/ui/badge';
import * as Table from '@/components/ui/table';
import { cn } from '@/utils/cn';

const COL = {
  outNumber: 'min-w-[140px] max-w-[170px]',
  outDate: 'min-w-[110px] max-w-[130px]',
  center: 'min-w-[150px] max-w-[180px]',
  floor: 'min-w-[110px] max-w-[140px]',
  area: 'min-w-[150px] max-w-[180px]',
  reason: 'min-w-[130px] max-w-[160px]',
  qty: 'min-w-[72px] max-w-[90px]',
  value: 'min-w-[110px] max-w-[130px]',
  createdBy: 'min-w-[130px] max-w-[160px]',
  status: 'min-w-[120px] max-w-[140px]',
};

const EMPTY_SORTING = [];

const outSortHeader = (label) => {
  const Inner = ({ column }) => (
    <Table.SortableHeader column={column} label={label} sortable={column?.getCanSort?.()} />
  );
  Inner.displayName = `AumOutSortHeader(${label})`;
  return Inner;
};

const textCell = (value) => (
  <span className='paragraph-small whitespace-nowrap text-text-sub-500'>{value ?? '—'}</span>
);

const AssetOutTable = memo(({ rows = [], columnConfig = [], onRowClick, embedded = false }) => {
  const [sorting, setSorting] = useState(EMPTY_SORTING);

  const allColumns = useMemo(
    () => [
      {
        id: 'outNumber',
        accessorKey: 'outNumber',
        header: outSortHeader('OUT Number'),
        meta: { className: COL.outNumber },
        cell: ({ row }) => (
          <span
            onClick={() => onRowClick?.(row.original)}
            className='paragraph-small whitespace-nowrap font-medium text-primary-base cursor-pointer hover:underline'
          >
            {row.original.outNumber}
          </span>
        ),
      },
      {
        id: 'outDate',
        accessorKey: 'outDate',
        header: outSortHeader('Date'),
        meta: { className: COL.outDate },
        cell: ({ row }) => textCell(formatAumDetailDateDisplay(row.original.outDate)),
      },
      {
        id: 'center',
        accessorKey: 'centerName',
        header: outSortHeader('Center'),
        meta: { className: COL.center },
        cell: ({ row }) => textCell(row.original.centerName),
      },
      {
        id: 'floor',
        accessorKey: 'floor',
        header: outSortHeader('Floor'),
        meta: { className: COL.floor },
        cell: ({ row }) => textCell(row.original.floor),
      },
      {
        id: 'area',
        accessorKey: 'area',
        header: outSortHeader('Area'),
        meta: { className: COL.area },
        cell: ({ row }) => textCell(row.original.area),
      },
      {
        id: 'reason',
        accessorKey: 'reason',
        header: outSortHeader('Reason'),
        meta: { className: COL.reason },
        cell: ({ row }) => (
          <Badge.Root
            size='small'
            variant='filled'
            color={getAssetOutReasonBadgeColor(row.original.reasonSlug)}
          >
            {row.original.reason}
          </Badge.Root>
        ),
      },
      {
        id: 'qty',
        accessorKey: 'qty',
        header: outSortHeader('Qty'),
        meta: { className: COL.qty },
        cell: ({ row }) => textCell(row.original.qty),
      },
      {
        id: 'value',
        accessorKey: 'value',
        header: outSortHeader('Value'),
        meta: { className: COL.value },
        cell: ({ row }) => textCell(row.original.value),
      },
      {
        id: 'createdBy',
        accessorKey: 'createdBy',
        header: outSortHeader('Created By'),
        meta: { className: COL.createdBy },
        cell: ({ row }) => textCell(row.original.createdBy),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: outSortHeader('Status'),
        meta: { className: COL.status },
        cell: ({ row }) => (
          <Badge.Root
            size='small'
            variant='filled'
            color={getAssetOutStatusBadgeColor(row.original.status)}
          >
            {row.original.status}
          </Badge.Root>
        ),
      },
    ],
    [onRowClick],
  );

  const columns = useMemo(
    () =>
      applyColumnConfig(
        allColumns,
        columnConfig,
        AUM_OUT_COLUMN_CONFIG,
        AUM_PINNED_COLUMN_ID[AUM_ASSET_OUT_LIST_TABLE_ID],
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

  if (rows.length === 0) {
    return (
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-10 text-center text-label-sm text-text-sub-500'>
        No asset out transactions match these filters.
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto bg-bg-white-0', !embedded && 'rounded-xl')}>
      <Table.Root className='w-full min-w-[1280px]' variant='compact'>
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

AssetOutTable.displayName = 'AssetOutTable';

export default AssetOutTable;
