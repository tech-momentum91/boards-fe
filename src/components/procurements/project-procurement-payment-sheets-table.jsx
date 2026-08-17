import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import { PROJECT_PROCUREMENT_PAYMENT_SHEETS_COLUMN_WIDTHS } from '@/components/procurements/constants';
import ProjectProcurementPaymentStatusBadge from '@/components/procurements/project-procurement-payment-status-badge';
import { formatProcurementAmount } from '@/components/procurements/project-procurements-utils';
import { formatProjectCell } from '@/components/projects/shared';
import * as Table from '@/components/ui/table';
import { applyColumnConfig } from '@/lib/column-utils';
import { cn } from '@/utils/cn';
import { formatDateDisplay } from '@/utils/date-utils';

function SortableColumnHeader({ column, label }) {
  const sortState = column.getIsSorted();
  return (
    <div className='flex items-center gap-0.5'>
      <span className='text-paragraph-sm whitespace-nowrap text-text-soft-400'>{label}</span>
      <button
        type='button'
        className='flex cursor-pointer items-center justify-center transition-colors hover:text-text-strong-950'
        onClick={() => column.toggleSorting(sortState === 'asc')}
        aria-label={`Sort by ${label} ${sortState === 'asc' ? 'descending' : 'ascending'}`}
      >
        {Table.getSortingIcon(sortState)}
      </button>
    </div>
  );
}

function TextCell({ value, strong = false }) {
  return (
    <span
      className={cn(
        'block truncate text-paragraph-sm whitespace-nowrap',
        strong ? 'font-medium text-text-main-900' : 'font-normal text-text-sub-500',
      )}
    >
      {formatProjectCell(value)}
    </span>
  );
}

function AmountCell({ value }) {
  return <TextCell value={formatProcurementAmount(value)} />;
}

function CountCell({ value }) {
  const numeric = Number(value);
  const display = Number.isFinite(numeric) ? String(numeric) : '—';
  return <TextCell value={display} />;
}

export default function ProjectProcurementPaymentSheetsTable({
  rows = [],
  columnConfig = [],
  sorting: sortingFromParent = [],
  onSortingChange,
  onRowClick,
  isLoading = false,
}) {
  const [localSorting, setLocalSorting] = useState(sortingFromParent);

  useEffect(() => {
    setLocalSorting(sortingFromParent);
  }, [sortingFromParent]);

  const handleSortingChange = useCallback(
    (updaterOrValue) => {
      const nextSorting =
        typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;
      setLocalSorting(nextSorting);
      onSortingChange?.(nextSorting);
    },
    [localSorting, onSortingChange],
  );

  const allColumnDefs = useMemo(
    () => [
      {
        id: 'sheet_name',
        accessorKey: 'sheet_name',
        columnLabel: 'Sheet Name',
        enableHiding: false,
        header: ({ column }) => <SortableColumnHeader column={column} label='Sheet Name' />,
        cell: ({ row }) => (
          <button
            type='button'
            className='block w-full truncate text-left'
            onClick={() => onRowClick?.(row.original)}
          >
            <TextCell value={row.original.sheet_name} strong />
          </button>
        ),
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_PAYMENT_SHEETS_COLUMN_WIDTHS.sheet_name,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'sheet_no',
        accessorKey: 'sheet_no',
        columnLabel: 'Sheet No.',
        header: ({ column }) => <SortableColumnHeader column={column} label='Sheet No.' />,
        cell: ({ row }) => <TextCell value={row.original.sheet_no} />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_PAYMENT_SHEETS_COLUMN_WIDTHS.sheet_no,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'master_sheet',
        accessorKey: 'master_sheet',
        columnLabel: 'Master Sheet',
        header: 'Master Sheet',
        cell: ({ row }) => <TextCell value={row.original.master_sheet} />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_PAYMENT_SHEETS_COLUMN_WIDTHS.master_sheet,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'expected_payment_date',
        accessorKey: 'expected_payment_date',
        columnLabel: 'Expected Payment Date',
        header: ({ column }) => (
          <SortableColumnHeader column={column} label='Expected Payment Date' />
        ),
        cell: ({ row }) => (
          <TextCell value={formatDateDisplay(row.original.expected_payment_date, '—')} />
        ),
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_PAYMENT_SHEETS_COLUMN_WIDTHS.expected_payment_date,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'requested_budget',
        accessorKey: 'requested_budget',
        columnLabel: 'Requested Budget',
        header: ({ column }) => <SortableColumnHeader column={column} label='Requested Budget' />,
        cell: ({ row }) => <AmountCell value={row.original.requested_budget} />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_PAYMENT_SHEETS_COLUMN_WIDTHS.requested_budget,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'allocated_budget',
        accessorKey: 'allocated_budget',
        columnLabel: 'Allocated Budget',
        header: ({ column }) => <SortableColumnHeader column={column} label='Allocated Budget' />,
        cell: ({ row }) => <AmountCell value={row.original.allocated_budget} />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_PAYMENT_SHEETS_COLUMN_WIDTHS.allocated_budget,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'vendors',
        accessorKey: 'vendors',
        columnLabel: 'Vendors',
        header: 'Vendors',
        cell: ({ row }) => <CountCell value={row.original.vendors} />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_PAYMENT_SHEETS_COLUMN_WIDTHS.vendors,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        columnLabel: 'Status',
        header: ({ column }) => <SortableColumnHeader column={column} label='Status' />,
        cell: ({ row }) => <ProjectProcurementPaymentStatusBadge value={row.original.status} />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_PAYMENT_SHEETS_COLUMN_WIDTHS.status,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'created_by',
        accessorKey: 'created_by',
        columnLabel: 'Created By',
        header: 'Created By',
        cell: ({ row }) => <TextCell value={row.original.created_by} />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_PAYMENT_SHEETS_COLUMN_WIDTHS.created_by,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'created_at',
        accessorKey: 'created_at',
        columnLabel: 'Created At',
        header: 'Created At',
        cell: ({ row }) => <TextCell value={formatDateDisplay(row.original.created_at, '—')} />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_PAYMENT_SHEETS_COLUMN_WIDTHS.created_at,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'last_updated',
        accessorKey: 'last_updated',
        columnLabel: 'Last Updated',
        header: 'Last Updated',
        cell: ({ row }) => <TextCell value={formatDateDisplay(row.original.last_updated, '—')} />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_PAYMENT_SHEETS_COLUMN_WIDTHS.last_updated,
            'whitespace-nowrap',
          ),
        },
      },
    ],
    [onRowClick],
  );

  const visibleDefs = useMemo(
    () => applyColumnConfig(allColumnDefs, columnConfig),
    [allColumnDefs, columnConfig],
  );

  const table = useReactTable({
    data: rows,
    columns: visibleDefs,
    state: { sorting: localSorting },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    enableSortingRemoval: false,
  });

  if (!isLoading && rows.length === 0) {
    return (
      <div className='flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
        <p className='text-label-md text-text-strong-950'>No payment sheets found</p>
        <p className='mt-1 text-paragraph-sm text-text-sub-500'>
          Adjust your search or filters to see results.
        </p>
      </div>
    );
  }

  const renderSkeleton = () => (
    <Table.Body spacing={4}>
      {Array.from({ length: 5 }).map((_, index, array) => (
        <React.Fragment key={`skeleton-${index}`}>
          <Table.Row>
            {visibleDefs.map((column) => (
              <Table.Cell key={column.id || column.accessorKey}>
                <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
              </Table.Cell>
            ))}
          </Table.Row>
          {index < array.length - 1 && <Table.RowDivider dividerClassName='bg-transparent' />}
        </React.Fragment>
      ))}
    </Table.Body>
  );

  const hasRows = table.getRowModel().rows.length > 0;

  return (
    <div className='min-h-0 flex-1 overflow-x-auto overflow-y-auto'>
      <Table.Root variant='compact' className='min-w-[1100px]'>
        <Table.Header>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Table.Head key={header.id} className={header.column.columnDef.meta?.headClassName}>
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
        )}
      </Table.Root>
    </div>
  );
}
