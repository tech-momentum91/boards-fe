import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RiDeleteBinLine } from 'react-icons/ri';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import { parseToDate, formatDisplayDateTime } from '@/utils/date-utils';
import emptyState from '@/assets/images/empty-state.png';

const TABLE_ID = 'cp-contact-leads-table';
const STORAGE_KEY = (id) => `column-config-${id}`;

function formatLastContactedAt(input) {
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

const tableHeadMeta = {
  headClassName:
    'bg-bg-weak-100 text-text-soft-400 label-small px-3 py-2 first:rounded-l-lg last:rounded-r-lg',
};
const headerCellClassName = 'flex items-center gap-0.5';
const headerLabelClassName = 'label-small text-text-soft-400 whitespace-nowrap';
const headerSortBtnClassName =
  'flex items-center justify-center size-5 cursor-pointer text-text-soft-400 hover:text-text-strong-950 transition-colors';

const CpContactLeadsTable = React.forwardRef(
  (
    {
      leads = [],
      isLoading = false,
      error = null,
      emptyMessage = 'No leads linked to this contact.',
      onDelete,
    },
    ref,
  ) => {
    const navigate = useNavigate();

    const handleLeadRowNavigate = useCallback(
      (lead) => {
        const leadId = lead?.id ?? lead?.name;
        if (!leadId) return;
        navigate(`/crm/leads/${encodeURIComponent(leadId)}`);
      },
      [navigate],
    );

    const columns = useMemo(
      () => [
        {
          id: 'name',
          accessorKey: 'name',
          meta: tableHeadMeta,
          header: ({ column }) => (
            <div className={headerCellClassName}>
              <span className={headerLabelClassName}>Name</span>
              <button
                type='button'
                className={headerSortBtnClassName}
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Name'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => (
            <span
              className='paragraph-small font-medium text-text-strong-950 truncate max-w-[220px] block'
              title={row.original.name}
            >
              {row.original.name || '–'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'account',
          accessorKey: 'account',
          meta: tableHeadMeta,
          header: ({ column }) => (
            <div className={headerCellClassName}>
              <span className={headerLabelClassName}>Account</span>
              <button
                type='button'
                className={headerSortBtnClassName}
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Account'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap truncate max-w-[180px] block'>
              {row.original.account || '–'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'cpAccount',
          accessorKey: 'cpAccount',
          meta: tableHeadMeta,
          header: ({ column }) => (
            <div className={headerCellClassName}>
              <span className={headerLabelClassName}>CP Account</span>
              <button
                type='button'
                className={headerSortBtnClassName}
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by CP Account'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap truncate max-w-[180px] block'>
              {row.original.cpAccount || '–'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'email',
          accessorKey: 'email',
          meta: tableHeadMeta,
          header: ({ column }) => (
            <div className={headerCellClassName}>
              <span className={headerLabelClassName}>Email</span>
              <button
                type='button'
                className={headerSortBtnClassName}
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Email'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => (
            <span
              className='paragraph-small text-text-sub-600 truncate max-w-[220px] block'
              title={row.original.email}
            >
              {row.original.email || '–'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'lastContactedAt',
          accessorKey: 'lastContactedAt',
          meta: tableHeadMeta,
          header: ({ column }) => (
            <div className={headerCellClassName}>
              <span className={headerLabelClassName}>Last Contacted At</span>
              <button
                type='button'
                className={headerSortBtnClassName}
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Last Contacted At'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {formatLastContactedAt(row.original.lastContactedAt)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'created_At',
          accessorKey: 'created_At',
          header: ({ column }) => (
            <Table.SortableHeader
              column={column}
              label='Created At'
              className='w-[120px]'
              sortable
            />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {formatDisplayDateTime(row.original.creation) || '–'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'actions',
          meta: tableHeadMeta,
          header: '',
          enableHiding: false,
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
                    className='p-2 rounded-md hover:bg-bg-weak-100 text-text-sub-500 hover:text-error-base transition-colors'
                    aria-label='Delete lead'
                  >
                    <RiDeleteBinLine size={20} />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <p>Delete</p>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
          ),
        },
      ],
      [onDelete],
    );

    const defaultColumnConfig = useMemo(() => prepareColumnsForConfig(columns), [columns]);

    const getCall = useCallback(
      () =>
        Promise.resolve().then(() => {
          try {
            const raw = localStorage.getItem(STORAGE_KEY(TABLE_ID));
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        }),
      [],
    );

    const persistCall = useCallback((payload) => {
      try {
        localStorage.setItem(STORAGE_KEY(TABLE_ID), JSON.stringify(payload));
      } catch (error_) {
        console.error('Failed to persist column config', error_);
      }
      return Promise.resolve(payload);
    }, []);

    const columnConfigHook = useColumnConfig(TABLE_ID, defaultColumnConfig, persistCall, getCall, {
      autoSave: true,
      debounce: 300,
    });

    React.useImperativeHandle(ref, () => ({
      columnConfigHook,
    }));

    const visibleDefs = useMemo(
      () => applyColumnConfig(columns, columnConfigHook.columns),
      [columns, columnConfigHook.columns],
    );

    const table = useReactTable({
      data: leads,
      columns: visibleDefs,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
    });

    const colCount = visibleDefs.length;

    if (!isLoading && !error && table.getRowModel().rows.length === 0) {
      return (
        <div className='flex h-full min-h-[360px] flex-col items-center justify-center bg-bg-white-0 p-16 text-center'>
          <img src={emptyState} alt='Empty state' className='mb-4 h-48 w-48 object-contain' />
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>No leads found</h3>
          <p className='max-w-md text-sm text-text-sub-600'>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <Table.Root variant='default' className='w-full'>
        <Table.Header>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Table.Head key={header.id} column={header.column}>
                  {header.isPlaceholder
                    ? null
                    : typeof header.column.columnDef.header === 'function'
                      ? header.column.columnDef.header({
                          column: header.column,
                          header,
                          table,
                        })
                      : header.column.columnDef.header}
                </Table.Head>
              ))}
            </Table.Row>
          ))}
        </Table.Header>
        <Table.Body>
          {isLoading && leads.length === 0 ? (
            <Table.Row>
              <Table.Cell
                colSpan={colCount}
                className='py-16 text-center paragraph-small text-text-sub-500'
              >
                Loading leads...
              </Table.Cell>
            </Table.Row>
          ) : error && leads.length === 0 ? (
            <Table.Row>
              <Table.Cell
                colSpan={colCount}
                className='py-16 text-center paragraph-small text-text-sub-500 text-error-base'
              >
                {error}
              </Table.Cell>
            </Table.Row>
          ) : (
            table.getRowModel().rows.map((row, rowIndex, arr) => (
              <React.Fragment key={row.id}>
                <Table.Row
                  className='hover:bg-bg-weak-100 transition-colors cursor-pointer'
                  onClick={() => handleLeadRowNavigate(row.original)}
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
    );
  },
);

CpContactLeadsTable.displayName = 'CpContactLeadsTable';

export default CpContactLeadsTable;
