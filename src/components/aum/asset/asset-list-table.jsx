import React, { memo, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  formatAumDetailDateDisplay,
  getAumConditionBadgeColor,
} from '@/components/aum/asset/asset-detail-helper';
import { AumBadgeWithCaret } from '@/components/aum/asset/aum-badge-with-caret';
import {
  AUM_ASSET_LIST_COLUMN_CONFIG,
  AUM_ASSET_LIST_TABLE_ID,
  AUM_PINNED_COLUMN_ID,
} from '@/components/aum/constants';
import { applyColumnConfig } from '@/lib/column-utils';
import * as Badge from '@/components/ui/badge';
import * as Table from '@/components/ui/table';
import { resolveFileUrl } from '@/lib/utils';
import { cn } from '@/utils/cn';

const COL = {
  serialNumber: 'w-[168px] min-w-[168px] max-w-[168px] overflow-hidden',
  productCode: 'w-[140px] min-w-[140px] max-w-[140px] overflow-hidden',
  barcode: 'w-[180px] min-w-[180px] max-w-[220px] overflow-hidden',
  condition: 'w-[130px] min-w-[130px] max-w-[130px] overflow-hidden',
  brand: 'w-[142px] min-w-[142px] max-w-[142px] overflow-hidden',
  area: 'w-[130px] min-w-[130px] max-w-[130px] overflow-hidden',
  center: 'w-[130px] min-w-[130px] max-w-[130px] overflow-hidden',
  productType: 'w-[140px] min-w-[140px] max-w-[140px] overflow-hidden',
  productGroup: 'w-[150px] min-w-[150px] max-w-[150px] overflow-hidden',
  productCategory: 'w-[150px] min-w-[150px] max-w-[150px] overflow-hidden',
  categoryGroup: 'w-[170px] min-w-[170px] max-w-[170px] overflow-hidden',
  purchaseDate: 'w-[150px] min-w-[150px] max-w-[150px] overflow-hidden',
  availableForUseDate: 'w-[170px] min-w-[170px] max-w-[170px] overflow-hidden',
  warrantyDueDate: 'w-[170px] min-w-[170px] max-w-[170px] overflow-hidden',
  originalValue: 'w-[140px] min-w-[140px] max-w-[140px] overflow-hidden',
  currentValue: 'w-[140px] min-w-[140px] max-w-[140px] overflow-hidden',
  lastMaintenanceDate: 'w-[170px] min-w-[170px] max-w-[170px] overflow-hidden',
  totalMaintenanceValue: 'w-[200px] min-w-[200px] max-w-[200px] overflow-hidden',
};

const EMPTY_SORTING = [];

const listSortHeader = (label) => {
  const Inner = ({ column }) => (
    <Table.SortableHeader column={column} label={label} sortable={column?.getCanSort?.()} />
  );
  Inner.displayName = `AumListSortHeader(${label})`;
  return Inner;
};

const textCell = (value = '—') => (
  <span className='paragraph-small block w-full truncate text-text-sub-500' title={String(value)}>
    {value}
  </span>
);

function NameCell({ row, indentedName }) {
  const imageUrl = row.original.image ? resolveFileUrl(row.original.image) : '';

  return (
    <div className={cn('flex min-w-0 items-center gap-3', indentedName && 'pl-[52px]')}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=''
          className='size-8 shrink-0 rounded-lg border border-stroke-soft-200 object-cover'
        />
      ) : (
        <div className='size-8 shrink-0 rounded-lg border border-stroke-soft-200 bg-bg-weak-100' />
      )}
      <span className='paragraph-small truncate font-medium text-text-main-900'>
        {row.original.name || row.original.productName || '—'}
      </span>
    </div>
  );
}

function BadgeWithCaret({ children, color }) {
  return <AumBadgeWithCaret color={color}>{children}</AumBadgeWithCaret>;
}

const AumAssetListTable = memo(
  ({ rows = [], columnConfig = [], indentedName = true, embedded = false }) => {
    const [sorting, setSorting] = useState(EMPTY_SORTING);

    const allColumns = useMemo(
      () => [
        {
          id: 'name',
          accessorKey: 'name',
          header: listSortHeader('Name'),
          meta: {
            className: cn(
              indentedName
                ? 'w-[280px] min-w-[280px] max-w-[280px] overflow-hidden'
                : 'w-[256px] min-w-[256px] max-w-[256px] overflow-hidden',
            ),
          },
          cell: ({ row }) => <NameCell row={row} indentedName={indentedName} />,
        },
        {
          id: 'serialNumber',
          accessorKey: 'serialNumber',
          header: listSortHeader('Serial Number'),
          meta: { className: COL.serialNumber },
          cell: ({ row }) => textCell(row.original.serialNumber),
        },
        {
          id: 'productCode',
          accessorKey: 'productCode',
          header: listSortHeader('Product Code'),
          meta: { className: COL.productCode },
          cell: ({ row }) => textCell(row.original.productCode),
        },
        {
          id: 'barcode',
          accessorKey: 'barcode',
          header: listSortHeader('Barcode'),
          meta: { className: COL.barcode },
          cell: ({ row }) => (
            <span
              className='paragraph-small block w-full truncate font-medium text-primary-base'
              title={String(row.original.barcode || '')}
            >
              {row.original.barcode || '—'}
            </span>
          ),
        },
        {
          id: 'condition',
          accessorKey: 'condition',
          header: listSortHeader('Condition'),
          meta: { className: COL.condition },
          cell: ({ row }) =>
            row.original.condition ? (
              <BadgeWithCaret color={getAumConditionBadgeColor(row.original.condition)}>
                {row.original.condition}
              </BadgeWithCaret>
            ) : (
              textCell('—')
            ),
        },
        {
          id: 'brand',
          accessorKey: 'brand',
          header: listSortHeader('Brand'),
          meta: { className: COL.brand },
          cell: ({ row }) => textCell(row.original.brand),
        },
        {
          id: 'area',
          accessorKey: 'area',
          header: listSortHeader('Area'),
          meta: { className: COL.area },
          cell: ({ row }) => textCell(row.original.area),
        },
        {
          id: 'center',
          accessorKey: 'centerName',
          header: listSortHeader('Center'),
          meta: { className: COL.center },
          cell: ({ row }) => textCell(row.original.centerName),
        },
        {
          id: 'productType',
          accessorKey: 'productType',
          header: listSortHeader('Product Type'),
          meta: { className: COL.productType },
          cell: ({ row }) => textCell(row.original.productType),
        },
        {
          id: 'productGroup',
          accessorKey: 'productGroup',
          header: listSortHeader('Product Group'),
          meta: { className: COL.productGroup },
          cell: ({ row }) => textCell(row.original.productGroup),
        },
        {
          id: 'productCategory',
          accessorKey: 'productCategory',
          header: listSortHeader('Category Type'),
          meta: { className: COL.productCategory },
          cell: ({ row }) => textCell(row.original.productCategory),
        },
        {
          id: 'categoryGroup',
          accessorKey: 'categoryGroup',
          header: listSortHeader('Category Group'),
          meta: { className: COL.categoryGroup },
          cell: ({ row }) => textCell(row.original.categoryGroup),
        },
        {
          id: 'purchaseDate',
          accessorKey: 'purchaseDate',
          header: listSortHeader('Purchase Date'),
          meta: { className: COL.purchaseDate },
          cell: ({ row }) => textCell(formatAumDetailDateDisplay(row.original.purchaseDate)),
        },
        {
          id: 'availableForUseDate',
          accessorKey: 'availableForUseDate',
          header: listSortHeader('Available for Use Date'),
          meta: { className: COL.availableForUseDate },
          cell: ({ row }) => textCell(formatAumDetailDateDisplay(row.original.availableForUseDate)),
        },
        {
          id: 'warrantyDueDate',
          accessorKey: 'warrantyDueDate',
          header: listSortHeader('Warranty Due Date'),
          meta: { className: COL.warrantyDueDate },
          cell: ({ row }) => textCell(formatAumDetailDateDisplay(row.original.warrantyDueDate)),
        },
        {
          id: 'originalValue',
          accessorKey: 'originalValue',
          header: listSortHeader('Original Value'),
          meta: { className: COL.originalValue },
          cell: ({ row }) => textCell(row.original.originalValue),
        },
        {
          id: 'currentValue',
          accessorKey: 'currentValue',
          header: listSortHeader('Current Value'),
          meta: { className: COL.currentValue },
          cell: ({ row }) => textCell(row.original.currentValue),
        },
        {
          id: 'lastMaintenanceDate',
          accessorKey: 'lastMaintenanceDate',
          header: listSortHeader('Last Maintenance'),
          meta: { className: COL.lastMaintenanceDate },
          cell: ({ row }) => textCell(formatAumDetailDateDisplay(row.original.lastMaintenanceDate)),
        },
        {
          id: 'totalMaintenanceValue',
          accessorKey: 'totalMaintenanceValue',
          header: listSortHeader('Total Maintenance Value'),
          meta: { className: COL.totalMaintenanceValue },
          cell: ({ row }) => textCell(row.original.totalMaintenanceValue),
        },
      ],
      [indentedName],
    );

    const columns = useMemo(
      () =>
        applyColumnConfig(
          allColumns,
          columnConfig,
          AUM_ASSET_LIST_COLUMN_CONFIG,
          AUM_PINNED_COLUMN_ID[AUM_ASSET_LIST_TABLE_ID],
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
      return null;
    }

    return (
      <div className={cn('overflow-x-auto bg-bg-white-0', !embedded && 'rounded-xl')}>
        <Table.Root className='w-full min-w-[2770px] table-fixed' variant='compact'>
          <Table.Header className='bg-bg-weak-100'>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Head
                    key={header.id}
                    className={cn(
                      'h-9 overflow-hidden rounded-none bg-bg-weak-100 first:rounded-none last:rounded-none',
                      header.column.id === 'name' && indentedName && 'pl-[52px]',
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
                    <Table.Cell
                      key={cell.id}
                      className={cn('overflow-hidden', cell.column.columnDef.meta?.className)}
                    >
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
  },
);

AumAssetListTable.displayName = 'AumAssetListTable';

export default AumAssetListTable;
