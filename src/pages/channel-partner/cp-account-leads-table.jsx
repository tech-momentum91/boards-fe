import React, { useMemo, useCallback, useState } from 'react';
import { RiDeleteBinLine } from 'react-icons/ri';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import emptyState from '@/assets/images/empty-state.png';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import { formatDisplayDateTime } from '@/utils/date-utils';

const TABLE_ID = 'cp-account-leads-table';
const STORAGE_KEY = (id) => `column-config-${id}`;

function formatCurrency(value) {
  if (value == null || value === '') return '–';
  const num = Number(value);
  if (Number.isNaN(num)) return '–';
  return new Intl.NumberFormat('en-IN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(num);
}

const CpAccountLeadsTable = React.forwardRef(
  (
    { rows = [], isLoading = false, error = null, variant = 'compact', onDisableLead = null },
    ref,
  ) => {
    const [leadToDisable, setLeadToDisable] = useState(null);
    const [isDisableLoading, setIsDisableLoading] = useState(false);

    const handleDeleteClick = useCallback((lead) => {
      setLeadToDisable(lead);
    }, []);

    const handleDisableConfirm = useCallback(
      async (item) => {
        if (!item?.name && !item?.id) return;
        const leadName = item.name ?? item.id;
        setIsDisableLoading(true);
        try {
          await onDisableLead?.(leadName);
          setLeadToDisable(null);
        } finally {
          setIsDisableLoading(false);
        }
      },
      [onDisableLead],
    );

    const columns = useMemo(
      () => [
        {
          id: 'leadName',
          accessorKey: 'leadName',
          header: ({ column }) => (
            <div className='flex items-center gap-1.5'>
              <span className='whitespace-nowrap'>Lead Name</span>
              <button
                type='button'
                className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Lead Name'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => (
            <span className='paragraph-small font-medium text-text-strong-950 whitespace-nowrap'>
              {row.original.leadName || row.original.name || '-–'}
            </span>
          ),
          enableSorting: false,
          enableHiding: false,
        },
        {
          id: 'contact',
          accessorKey: 'contact',
          header: <span className='whitespace-nowrap'>Contact</span>,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 truncate max-w-[180px] block'>
              {row.original.contact || '–'}
            </span>
          ),
        },
        {
          id: 'account',
          accessorKey: 'account',
          header: <span className='whitespace-nowrap'>Account</span>,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 truncate max-w-[180px] block'>
              {row.original.account || '–'}
            </span>
          ),
        },
        {
          id: 'lifecycleStage',
          accessorKey: 'lifecycleStage',
          header: ({ column }) => (
            <div className='flex items-center gap-1.5'>
              <span className='whitespace-nowrap'>Lifecycle Stage</span>
              <button
                type='button'
                className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Lifecycle Stage'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {row.original.lifecycleStage || row.original.lifeCycleStageStatus || '–'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'status',
          accessorKey: 'status',
          header: <span className='whitespace-nowrap'>Status</span>,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {row.original.status || '–'}
            </span>
          ),
        },
        {
          id: 'city',
          accessorKey: 'city',
          header: <span className='whitespace-nowrap'>City</span>,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {row.original.city || '–'}
            </span>
          ),
        },
        {
          id: 'estMonthlyValue',
          accessorKey: 'estMonthlyValue',
          header: ({ column }) => (
            <div className='flex items-center gap-1.5'>
              <span className='whitespace-nowrap'>Est. Monthly (₹)</span>
              <button
                type='button'
                className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                aria-label='Sort by Est. Monthly Value'
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {formatCurrency(row.original.estMonthlyValue)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'created_At',
          accessorKey: 'creation',
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
          header: '',
          enableHiding: false,
          cell: ({ row }) => (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(row.original);
                  }}
                  className='p-2 rounded-md hover:bg-bg-weak-100 text-text-sub-500 hover:text-error-base transition-colors'
                  aria-label='Disable lead'
                >
                  <RiDeleteBinLine size={20} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p>Disable lead</p>
              </Tooltip.Content>
            </Tooltip.Root>
          ),
        },
      ],
      [handleDeleteClick],
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
      data: rows,
      columns: visibleDefs,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
    });

    const hasRows = table.getRowModel().rows.length > 0;

    if (error) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>Unable to Load Leads</h3>
          <p className='text-sm text-error-darker/80'>{error}</p>
        </div>
      );
    }

    if (!isLoading && rows.length === 0) {
      return (
        <div className='flex h-full min-h-[360px] flex-col items-center justify-center bg-bg-white-0 p-16 text-center'>
          <img src={emptyState} alt='Empty state' className='mb-4 h-48 w-48 object-contain' />
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>
            No leads for this account
          </h3>
          <p className='max-w-md text-sm text-text-sub-600'>
            Leads linked to this CP account will appear here. Link leads to this account via the
            lead&apos;s CP Account field.
          </p>
        </div>
      );
    }

    const renderSkeleton = () => (
      <Table.Body>
        {Array.from({ length: 6 }).map((_, index, array) => (
          <React.Fragment key={`skeleton-${index}`}>
            <Table.Row>
              {visibleDefs.map((col) => (
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
      <>
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
                    <Table.Row className='hover:bg-bg-weak-50 transition-colors'>
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
        <DeleteConfirmModal
          isOpen={leadToDisable != null}
          onOpenChange={(open) => !open && setLeadToDisable(null)}
          title='Disable lead?'
          description='This lead will be disabled and removed from this list. You can re-enable it from CRM if needed.'
          item={leadToDisable}
          onConfirm={handleDisableConfirm}
          isLoading={isDisableLoading}
          confirmLabel='Disable'
          loadingLabel='Disabling...'
        />
      </>
    );
  },
);

CpAccountLeadsTable.displayName = 'CpAccountLeadsTable';

export default CpAccountLeadsTable;
