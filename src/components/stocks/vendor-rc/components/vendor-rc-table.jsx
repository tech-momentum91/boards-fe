import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import { formatVendorRcDateDisplay } from '@/components/stocks/stocks-helper';
import StocksListEmptyState from '@/components/stocks/shared/stocks-list-empty-state';
import * as Badge from '@/components/ui/badge';
import * as Table from '@/components/ui/table';
import * as Tag from '@/components/ui/tag';
import * as Tooltip from '@/components/ui/tooltip';
const VENDOR_RC_PINNED_COLUMN_ID = 'vendor';
const EMPTY_SORTING = [];
const VENDOR_RC_SKELETON_ROW_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6'];

const vendorRcSortHeader = (label) => {
  const Inner = ({ column }) => (
    <Table.SortableHeader column={column} label={label} sortable={column?.getCanSort?.()} />
  );
  Inner.displayName = `VendorRcSortHeader(${label})`;
  return Inner;
};

const vendorRcStatusBadgeColor = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('cancel')) return 'gray';
  if (normalized.includes('expired') && !normalized.includes('expiring')) return 'red';
  if (normalized.includes('expiring')) return 'orange';
  return 'green';
};

const VendorRcTable = ({
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
        id: 'vendor',
        accessorKey: 'vendor',
        header: vendorRcSortHeader('Vendor'),
        meta: { className: 'min-w-[209px] max-w-[260px]' },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.vendor || '--'}</span>
        ),
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: vendorRcSortHeader('Category'),
        meta: { className: 'min-w-[144px] max-w-[180px]' },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.category || '--'}</span>
        ),
      },
      {
        id: 'center',
        accessorKey: 'centers',
        header: vendorRcSortHeader('Center'),
        enableSorting: false,
        meta: { className: 'min-w-[280px] max-w-[360px]' },
        cell: ({ row }) => {
          const centers = Array.isArray(row.original.centers) ? row.original.centers : [];
          const [first, ...rest] = centers;
          return (
            <div className='flex flex-wrap items-center gap-1.5'>
              {first ? (
                <Tag.Root variant='stroke' className='max-w-full truncate bg-[#F6F8FA]'>
                  <span className='truncate'>{first}</span>
                </Tag.Root>
              ) : (
                <span className='paragraph-small text-text-sub-500'>--</span>
              )}
              {rest.length > 0 ? (
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Tag.Root
                      variant='stroke'
                      color='gray'
                      className='max-w-full truncate bg-[#F6F8FA]'
                    >
                      +{rest.length}
                    </Tag.Root>
                  </Tooltip.Trigger>
                  <Tooltip.Content
                    size='small'
                    variant='light'
                    side='top'
                    className='max-w-xs bg-black text-white'
                  >
                    {rest.map((center) => center).join(', ')}
                  </Tooltip.Content>
                </Tooltip.Root>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'products',
        accessorKey: 'productCount',
        header: vendorRcSortHeader('Products'),
        enableSorting: false,
        meta: { className: 'min-w-[127px] max-w-[140px]' },
        cell: ({ row }) => {
          const items = Array.isArray(row.original.lineItems) ? row.original.lineItems : [];
          const fromLines = items.filter((item) => String(item?.product || '').trim()).length;
          const display =
            fromLines > 0
              ? fromLines
              : (row.original.productCount ?? (items.length > 0 ? items.length : null));
          return (
            <span className='paragraph-small text-text-sub-500'>
              {display === null || display === undefined || display === '' ? '--' : String(display)}
            </span>
          );
        },
      },
      {
        id: 'startDate',
        accessorKey: 'startDate',
        header: vendorRcSortHeader('Start Date'),
        meta: { className: 'min-w-[144px] max-w-[180px]' },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>
            {formatVendorRcDateDisplay(row.original.startDate)}
          </span>
        ),
      },
      {
        id: 'endDate',
        accessorKey: 'endDate',
        header: vendorRcSortHeader('End Date'),
        meta: { className: 'min-w-[144px] max-w-[180px]' },
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>
            {formatVendorRcDateDisplay(row.original.endDate)}
          </span>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: vendorRcSortHeader('Status'),
        meta: { className: 'min-w-[114px] max-w-[140px]' },
        cell: ({ row }) => (
          <Badge.Root
            size='small'
            variant='light'
            color={vendorRcStatusBadgeColor(row.original.status)}
            className='min-w-[72px] justify-center whitespace-nowrap'
          >
            {row.original.status || '--'}
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

    const pinIndex = result.findIndex((def) => def.id === VENDOR_RC_PINNED_COLUMN_ID);
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
    return <StocksListEmptyState context={context} error={error} onRetry={onRetry} />;
  }

  const skeletonBody = (
    <>
      {VENDOR_RC_SKELETON_ROW_KEYS.map((rowKey, index, allRows) => (
        <React.Fragment key={`vendor-rc-skeleton-${rowKey}`}>
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
    <div className='overflow-x-auto rounded-xl border-stroke-soft-200 bg-bg-white-0'>
      <Table.Root className='w-full min-w-[1104px]' variant='compact'>
        <Table.Header>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Table.Head key={header.id} className='rounded-none '>
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

export default VendorRcTable;
