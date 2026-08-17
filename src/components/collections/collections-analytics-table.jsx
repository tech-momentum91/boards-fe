import React, { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RiExpandDiagonalLine } from 'react-icons/ri';
import { CollectionsSortableHeader } from '@/components/collections/collections-toolbar';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Select from '@/components/ui/select';
import * as Table from '@/components/ui/table';
import { COLLECTIONS_ANALYTICS_STATUS_FILTER_OPTIONS } from '@/collections/analytics-constants';

function StatusBadge({ status }) {
  const label = status === 'dlp' ? 'DLP' : String(status ?? '—').toUpperCase();
  return (
    <Badge.Root variant='light' color='purple' size='small' className='uppercase'>
      {label}
    </Badge.Root>
  );
}

export default function CollectionsAnalyticsTable({ title, rows = [], onExpand, className }) {
  const [statusFilter, setStatusFilter] = useState('dlp');
  const [sorting, setSorting] = useState([]);

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows;
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  const columns = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: () => <span className='text-paragraph-sm text-text-sub-600'>Name</span>,
        cell: ({ row }) => (
          <span className='truncate text-label-sm text-text-main-900'>{row.original.name}</span>
        ),
        enableSorting: false,
      },
      {
        id: 'amount',
        accessorKey: 'amount_sort',
        header: ({ column }) => <CollectionsSortableHeader label='Amount' column={column} />,
        cell: ({ row }) => (
          <span className='block truncate text-paragraph-sm text-text-sub-500'>
            {row.original.amount}
          </span>
        ),
        enableSorting: true,
      },
      {
        id: 'last_inv_date',
        accessorKey: 'last_inv_date',
        header: ({ column }) => (
          <CollectionsSortableHeader label='Last Inv. Date' column={column} />
        ),
        cell: ({ row }) => (
          <span className='block truncate text-paragraph-sm text-text-sub-500'>
            {row.original.last_inv_date}
          </span>
        ),
        enableSorting: true,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }) => <CollectionsSortableHeader label='Status' column={column} />,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        enableSorting: true,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div
      className={`flex min-h-[360px] min-w-0 flex-col overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-[0px_1px_2px_rgba(82,88,102,0.06)] ${className ?? ''}`}
    >
      <div className='flex min-w-0 items-center justify-between gap-3 border-b border-stroke-soft-200 px-4 py-3'>
        <h3 className='min-w-0 flex-1 truncate text-label-md text-text-strong-950'>{title}</h3>
        <div className='flex shrink-0 items-center gap-2'>
          <Select.Root value={statusFilter} onValueChange={setStatusFilter} size='xsmall'>
            <Select.Trigger className='w-[88px]'>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {COLLECTIONS_ANALYTICS_STATUS_FILTER_OPTIONS.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='xsmall'
            aria-label={`Expand ${title}`}
            onClick={() => onExpand?.({ title, rows: filteredRows, statusFilter })}
          >
            <Button.Icon as={RiExpandDiagonalLine} />
          </Button.Root>
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-hidden px-2 py-1'>
        <Table.Root variant='compact' className='w-full table-fixed'>
          <Table.Header>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Head key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </Table.Head>
                ))}
              </Table.Row>
            ))}
          </Table.Header>
          <Table.Body spacing={4}>
            {table.getRowModel().rows.map((row) => (
              <React.Fragment key={row.id}>
                <Table.Row>
                  {row.getVisibleCells().map((cell) => (
                    <Table.Cell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Cell>
                  ))}
                </Table.Row>
                <Table.RowDivider dividerClassName='bg-transparent' />
              </React.Fragment>
            ))}
          </Table.Body>
        </Table.Root>
      </div>
    </div>
  );
}
