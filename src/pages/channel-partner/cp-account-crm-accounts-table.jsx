import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import { RiDeleteBinLine, RiErrorWarningLine } from 'react-icons/ri';
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

function formatCreatedAt(input) {
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

const VISIBLE_RELATED = 4;

function RelatedContactsCell({ relatedContacts }) {
  const list = Array.isArray(relatedContacts) ? relatedContacts : [];
  if (list.length === 0) return <span className='paragraph-small text-text-sub-600'>–</span>;

  const visible = list.slice(0, VISIBLE_RELATED);
  const extra = list.length - visible.length;

  const renderList = () => (
    <div className='flex flex-col gap-3'>
      <span className='text-label-xs text-text-sub-500 font-medium'>Related contacts</span>
      {list.map((c, idx) => {
        const name = c?.full_name || c?.name || c?.email || '—';
        const email = c?.email || c?.email_id || '';
        return (
          <div key={`${name}-${idx}`} className='flex items-center gap-2 min-w-0'>
            <CrmAccountAvatar name={name} index={idx} size={32} className='shrink-0' />
            <div className='flex flex-col min-w-0'>
              <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>
                {name}
              </span>
              {email ? (
                <span className='text-paragraph-xs text-text-sub-500 truncate'>{email}</span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className='flex items-center'>
      {visible.map((c, i) => {
        const name = c?.full_name || c?.name || c?.email || '—';
        return (
          <Tooltip.Root key={i}>
            <Tooltip.Trigger asChild>
              <span
                className='inline-block ring-2 ring-white rounded-full'
                style={{ marginLeft: i === 0 ? 0 : -8, zIndex: i }}
              >
                <CrmAccountAvatar name={name} index={i} size={24} />
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content side='top' variant='light' size='medium' className='max-w-[280px] p-3'>
              {renderList()}
            </Tooltip.Content>
          </Tooltip.Root>
        );
      })}
      {extra > 0 ? (
        <Tooltip.Root delayDuration={0}>
          <Tooltip.Trigger asChild>
            <span
              className='inline-block ring-2 ring-white rounded-full cursor-default'
              style={{ marginLeft: -8, zIndex: visible.length }}
            >
              <CrmAccountAvatar
                name={`+${extra}`}
                index={0}
                initials={`+${extra}`}
                size={24}
                className='bg-neutral-200 text-neutral-700 shadow-[inset_0px_-8px_16px_0px_rgba(197,199,201,0.48)]'
              />
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content side='top' variant='light' size='medium' className='max-w-[280px] p-3'>
            {renderList()}
          </Tooltip.Content>
        </Tooltip.Root>
      ) : null}
    </div>
  );
}

const CpAccountCrmAccountsTable = React.forwardRef(
  (
    { rows = [], isLoading = false, error = null, variant = 'compact', mode = 'account', onDelete },
    ref,
  ) => {
    const navigate = useNavigate();
    const isContactMode = mode === 'contact';

    const columns = useMemo(
      () => [
        {
          id: 'customer_name',
          accessorKey: 'customer_name',
          header: ({ column }) => (
            <SortableHeader
              column={column}
              label={isContactMode ? 'Name' : 'Account Name'}
              ariaLabel={`Sort by ${isContactMode ? 'Name' : 'Account Name'}`}
            />
          ),
          cell: ({ row }) => (
            <div className='flex items-center gap-2 min-w-0'>
              <CrmAccountAvatar name={row.original.customer_name} variant='weak' size={32} />
              <span className='paragraph-small font-medium text-text-strong-950 truncate'>
                {row.original.customer_name || '–'}
              </span>
            </div>
          ),
          enableSorting: true,
        },
        ...(!isContactMode
          ? [
            {
              id: 'cp_contact_name',
              accessorKey: 'cp_contact_name',
              header: <span className='whitespace-nowrap'>CP Contact</span>,
              cell: ({ row }) => (
                <span className='paragraph-small text-text-sub-600 truncate max-w-[200px] block'>
                  {row.original.cp_contact_name || '–'}
                </span>
              ),
            },
          ]
          : []),
        {
          id: 'related_contacts',
          accessorKey: 'related_contacts',
          header: (
            <span className='whitespace-nowrap'>
              {isContactMode ? 'Related Contacts' : 'Related Contact'}
            </span>
          ),
          cell: ({ row }) => (
            <RelatedContactsCell relatedContacts={row.original.related_contacts} />
          ),
        },
        {
          id: 'created_at',
          accessorKey: 'created_at',
          header: ({ column }) => (
            <SortableHeader column={column} label='Created At' ariaLabel='Sort by Created At' />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {formatCreatedAt(row.original.created_at)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'website',
          accessorKey: 'website',
          header: <span className='whitespace-nowrap'>Website</span>,
          cell: ({ row }) => (
            <span
              className='paragraph-small text-text-sub-600 truncate max-w-[220px] block'
              title={row.original.website}
            >
              {row.original.website || '–'}
            </span>
          ),
        },
        {
          id: 'sales_owner',
          accessorKey: 'sales_owner',
          header: <span className='whitespace-nowrap'>Sales Owner</span>,
          cell: ({ row }) => {
            const so = row.original.sales_owner;
            const name = so?.name || so?.email || '';
            return name ? (
              <div className='flex items-center gap-2 min-w-0'>
                <CrmAccountAvatar name={name} variant='weak' size={24} />
                <span className='paragraph-small text-text-sub-600 truncate max-w-[180px]'>
                  {name}
                </span>
              </div>
            ) : (
              <span className='paragraph-small text-text-sub-600'>–</span>
            );
          },
        },
        ...(isContactMode && onDelete
          ? [
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
                        aria-label='Unlink account'
                      >
                        <RiDeleteBinLine className='size-4' />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <p>Unlink CRM Account</p>
                    </Tooltip.Content>
                  </Tooltip.Root>
                </div>
              ),
            },
          ]
          : []),
      ],
      [isContactMode, onDelete],
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
            {isContactMode ? 'Unable to Load CRM Accounts' : 'Unable to Load Accounts'}
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
            {isContactMode ? 'No CRM accounts linked' : 'No accounts found'}
          </h3>
          <p className='max-w-md text-sm text-text-sub-600'>
            {isContactMode
              ? 'CRM accounts created by or linked to this CP contact will appear here.'
              : 'Accounts linked to this CP account will appear here.'}
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
                  Loading accounts...
                </Table.Cell>
              </Table.Row>
            ) : (
              table.getRowModel().rows.map((row, rowIndex, arr) => (
                <React.Fragment key={row.id}>
                  <Table.Row
                    className='cursor-pointer hover:bg-bg-weak-50 transition-colors'
                    onClick={() => {
                      const cpAccountId = row.original?.cp_account;
                      if (isContactMode && cpAccountId) {
                        navigate(`/channel-partner/accounts/${cpAccountId}`);
                      } else if (row.original?.name) {
                        navigate(`/crm/accounts/${row.original.name}`);
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
              ))
            )}
          </Table.Body>
        </Table.Root>
      </div>
    );
  },
);

CpAccountCrmAccountsTable.displayName = 'CpAccountCrmAccountsTable';

export default CpAccountCrmAccountsTable;
