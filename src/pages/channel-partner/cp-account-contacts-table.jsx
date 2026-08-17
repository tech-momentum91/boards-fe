import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as Table from '@/components/ui/table';
import * as Avatar from '@/components/ui/avatar';
import * as Tooltip from '@/components/ui/tooltip';
import { RiDeleteBinLine, RiErrorWarningLine } from 'react-icons/ri';
import { parseToDate } from '@/utils/date-utils';
import emptyState from '@/assets/images/empty-state.png';

function formatLastContacted(input) {
  const d = parseToDate(input);
  if (!d) return '–';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatCurrency(value) {
  if (value == null || value === '') return '–';
  const num = Number(value);
  if (Number.isNaN(num)) return '–';
  return new Intl.NumberFormat('en-IN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(num);
}

const CpAccountContactsTable = React.forwardRef(
  ({ rows = [], isLoading = false, error = null, variant = 'compact', onDelete }, ref) => {
    const navigate = useNavigate();

    const columns = useMemo(
      () => [
        {
          id: 'name',
          accessorKey: 'name',
          header: ({ column }) => (
            <div className='flex items-center gap-1.5'>
              <span className='whitespace-nowrap'>Name</span>
              <button
                type='button'
                className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Name'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => (
            <div className='flex items-center gap-2'>
              <Avatar.Root size={32} color='gray'>
                <span className='text-xs font-medium text-text-main-900'>
                  {row.original.initials || row.original.name?.slice(0, 2)?.toUpperCase() || '–'}
                </span>
              </Avatar.Root>
              <span className='paragraph-small font-medium text-text-strong-950 whitespace-nowrap'>
                {row.original.name || '–'}
              </span>
            </div>
          ),
          enableSorting: true,
        },
        {
          id: 'email',
          accessorKey: 'email',
          header: <span className='whitespace-nowrap'>Email</span>,
          cell: ({ row }) => (
            <span
              className='paragraph-small text-text-sub-600 truncate max-w-[220px] block'
              title={row.original.email}
            >
              {row.original.email || '–'}
            </span>
          ),
        },
        {
          id: 'lastContactedAt',
          accessorKey: 'createdAt',
          header: ({ column }) => (
            <div className='flex items-center gap-1.5'>
              <span className='whitespace-nowrap'>Last Contacted At</span>
              <button
                type='button'
                className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Last Contacted At'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {formatLastContacted(row.original.createdAt)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'openLeadsAmount',
          accessorKey: 'openLeadsAmount',
          header: ({ column }) => (
            <div className='flex items-center gap-1.5'>
              <span className='whitespace-nowrap'>Open Leads Amount (₹)</span>
              <button
                type='button'
                className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Open Leads Amount'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {formatCurrency(row.original.openLeadsAmount)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'wonAmount',
          accessorKey: 'wonAmount',
          header: ({ column }) => (
            <div className='flex items-center gap-1.5'>
              <span className='whitespace-nowrap'>Won Amount (₹)</span>
              <button
                type='button'
                className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Won Amount'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {formatCurrency(row.original.wonAmount)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'actions',
          header: '',
          cell: ({ row }) => (
            <div className='flex justify-end'>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(row.original);
                    }}
                    className='inline-flex items-center justify-center rounded-md p-1.5 hover:bg-bg-weak-100 text-text-sub-500 hover:text-error-base transition-colors'
                    aria-label='Delete contact'
                  >
                    <RiDeleteBinLine className='size-4' />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <p>Delete CP Contact</p>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
          ),
        },
      ],
      [onDelete],
    );

    const table = useReactTable({
      data: rows,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
    });

    const hasRows = table.getRowModel().rows.length > 0;

    if (error) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
            <RiErrorWarningLine className='size-6 text-error-base' />
          </div>
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>
            Unable to Load CP Contacts
          </h3>
          <p className='mb-4 text-sm text-error-darker/80'>{error}</p>
        </div>
      );
    }

    if (!isLoading && rows.length === 0) {
      return (
        <div className='flex h-full min-h-[360px] flex-col items-center justify-center bg-bg-white-0 p-16 text-center'>
          <img src={emptyState} alt='Empty state' className='mb-4 h-48 w-48 object-contain' />
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>
            No contacts for this account
          </h3>
          <p className='max-w-md text-sm text-text-sub-600'>
            Contacts linked to this CP account will appear here.
          </p>
        </div>
      );
    }

    const renderSkeleton = () => (
      <Table.Body>
        {Array.from({ length: 6 }).map((_, index, array) => (
          <React.Fragment key={`skeleton-${index}`}>
            <Table.Row>
              {columns.map((col) => (
                <Table.Cell key={col.id}>
                  <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                </Table.Cell>
              ))}
            </Table.Row>
            {index < array.length - 1 && <Table.RowDivider />}
          </React.Fragment>
        ))}
      </Table.Body>
    );

    return (
      <div className='w-full overflow-x-auto'>
        <Table.Root variant={variant} className='w-full'>
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
          {isLoading && !hasRows ? (
            renderSkeleton()
          ) : (
            <Table.Body>
              {table.getRowModel().rows.map((row, rowIndex, arr) => (
                <React.Fragment key={row.id}>
                  <Table.Row
                    className='cursor-pointer hover:bg-bg-weak-50 transition-colors'
                    onClick={() => {
                      if (row.original?.id) {
                        navigate(`/channel-partner/contacts/${row.original.id}`);
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                  {rowIndex < arr.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))}
            </Table.Body>
          )}
        </Table.Root>
      </div>
    );
  },
);

CpAccountContactsTable.displayName = 'CpAccountContactsTable';

export default CpAccountContactsTable;
