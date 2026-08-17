import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as Table from '@/components/ui/table';
import { RiErrorWarningLine } from 'react-icons/ri';
import { parseToDate } from '@/utils/date-utils';
import emptyState from '@/assets/images/empty-state.png';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';

const SortableHeader = ({ column, label, ariaLabel }) => (
  <div className='flex items-center gap-1.5'>
    <span className='whitespace-nowrap'>{label}</span>
    <button
      type='button'
      className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      aria-label={ariaLabel || `Sort by ${label}`}
    >
      {Table.getSortingIcon(column.getIsSorted())}
    </button>
  </div>
);

function formatLastConnected(input) {
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

const CpAccountCrmContactsTable = React.forwardRef(
  ({ rows = [], isLoading = false, error = null, variant = 'compact' }, ref) => {
    const navigate = useNavigate();

    const columns = useMemo(
      () => [
        {
          id: 'full_name',
          accessorKey: 'full_name',
          header: ({ column }) => (
            <SortableHeader column={column} label='Contact Name' ariaLabel='Sort by Contact Name' />
          ),
          cell: ({ row }) => (
            <div className='flex items-center gap-2 min-w-0'>
              <CrmAccountAvatar name={row.original.full_name} variant='weak' size={32} />
              <span className='paragraph-small font-medium text-text-strong-950 truncate'>
                {row.original.full_name || '–'}
              </span>
            </div>
          ),
          enableSorting: true,
        },
        {
          id: 'account',
          accessorKey: 'account',
          header: <span className='whitespace-nowrap'>Account</span>,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 truncate max-w-[220px] block'>
              {row.original.account || '–'}
            </span>
          ),
        },
        {
          id: 'cp_contact',
          accessorKey: 'cp_contact',
          header: <span className='whitespace-nowrap'>CP Contact</span>,
          cell: ({ row }) => {
            const name = row.original.cp_contact_name || row.original.cp_contact || '';
            return name ? (
              <div className='flex items-center gap-2 min-w-0'>
                <CrmAccountAvatar name={name} variant='weak' size={24} />
                <span className='paragraph-small text-text-sub-600 truncate max-w-[200px]'>
                  {name}
                </span>
              </div>
            ) : (
              <span className='paragraph-small text-text-sub-600'>–</span>
            );
          },
        },
        {
          id: 'email',
          accessorKey: 'email',
          header: <span className='whitespace-nowrap'>Email</span>,
          cell: ({ row }) => (
            <span
              className='paragraph-small text-text-sub-600 truncate max-w-[240px] block'
              title={row.original.email}
            >
              {row.original.email || '–'}
            </span>
          ),
        },
        {
          id: 'last_connected_at',
          accessorKey: 'last_connected_at',
          header: ({ column }) => (
            <SortableHeader
              column={column}
              label='Last Connected'
              ariaLabel='Sort by Last Connected'
            />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {formatLastConnected(row.original.last_connected_at)}
            </span>
          ),
          enableSorting: true,
        },
      ],
      [],
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
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>Unable to Load Contacts</h3>
          <p className='mb-4 text-sm text-error-darker/80'>{error}</p>
        </div>
      );
    }

    if (!isLoading && rows.length === 0) {
      return (
        <div className='flex h-full min-h-[360px] flex-col items-center justify-center bg-bg-white-0 p-16 text-center'>
          <img src={emptyState} alt='Empty state' className='mb-4 h-48 w-48 object-contain' />
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>No contacts found</h3>
          <p className='max-w-md text-sm text-text-sub-600'>
            Contacts linked to this CP account will appear here.
          </p>
        </div>
      );
    }

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
          <Table.Body>
            {isLoading && !hasRows ? (
              <Table.Row>
                <Table.Cell
                  className='py-16 text-center paragraph-small text-text-sub-500'
                  colSpan={columns.length}
                >
                  Loading contacts...
                </Table.Cell>
              </Table.Row>
            ) : (
              table.getRowModel().rows.map((row, rowIndex, arr) => (
                <React.Fragment key={row.id}>
                  <Table.Row
                    className='cursor-pointer hover:bg-bg-weak-50 transition-colors'
                    onClick={() => {
                      if (row.original?.name) navigate(`/crm/contacts/${row.original.name}`);
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
              ))
            )}
          </Table.Body>
        </Table.Root>
      </div>
    );
  },
);

CpAccountCrmContactsTable.displayName = 'CpAccountCrmContactsTable';

export default CpAccountCrmContactsTable;
