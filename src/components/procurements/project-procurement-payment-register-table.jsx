import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import { PROJECT_PROCUREMENT_PAYMENT_REGISTER_COLUMN_WIDTHS } from '@/components/procurements/constants';
import ProjectProcurementPaymentStatusBadge from '@/components/procurements/project-procurement-payment-status-badge';
import ProjectProcurementPaymentTag from '@/components/procurements/project-procurement-payment-tag';
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

function TextCell({ value, strong = false, tone = 'default' }) {
  const toneClassName =
    tone === 'success'
      ? 'text-[#067644]'
      : tone === 'warning'
        ? 'text-[#b47818]'
        : strong
          ? 'text-text-main-900'
          : 'text-text-sub-500';

  return (
    <span
      className={cn(
        'block truncate text-paragraph-sm whitespace-nowrap',
        strong ? 'font-medium' : 'font-normal',
        toneClassName,
      )}
    >
      {formatProjectCell(value)}
    </span>
  );
}

function AmountCell({ value, tone = 'default' }) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return <TextCell value='—' />;
  if (numeric === 0) return <TextCell value='0' />;
  return <TextCell value={formatProcurementAmount(value)} tone={tone} />;
}

export default function ProjectProcurementPaymentRegisterTable({
  rows = [],
  columnConfig = [],
  sorting: sortingFromParent = [],
  onSortingChange,
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
        id: 'vendor',
        accessorKey: 'vendor',
        columnLabel: 'Vendor',
        enableHiding: false,
        header: ({ column }) => <SortableColumnHeader column={column} label='Vendor' />,
        cell: ({ row }) => <TextCell value={row.original.vendor} strong />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_PAYMENT_REGISTER_COLUMN_WIDTHS.vendor,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'po_no',
        accessorKey: 'po_no',
        columnLabel: 'PO No.',
        header: 'PO No.',
        cell: ({ row }) => <TextCell value={row.original.po_no} />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_PAYMENT_REGISTER_COLUMN_WIDTHS.po_no,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'package',
        accessorKey: 'package',
        columnLabel: 'Package',
        header: 'Package',
        cell: ({ row }) => <ProjectProcurementPaymentTag value={row.original.package} />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_PAYMENT_REGISTER_COLUMN_WIDTHS.package,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'category',
        accessorKey: 'category',
        columnLabel: 'Category',
        header: 'Category',
        cell: ({ row }) => <ProjectProcurementPaymentTag value={row.original.category} />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_PAYMENT_REGISTER_COLUMN_WIDTHS.category,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'po_value',
        accessorKey: 'po_value',
        columnLabel: 'PO Value',
        header: ({ column }) => <SortableColumnHeader column={column} label='PO Value' />,
        cell: ({ row }) => <AmountCell value={row.original.po_value} />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_PAYMENT_REGISTER_COLUMN_WIDTHS.po_value,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'paid_amt',
        accessorKey: 'paid_amt',
        columnLabel: 'Paid Amt.',
        header: ({ column }) => <SortableColumnHeader column={column} label='Paid Amt.' />,
        cell: ({ row }) => <AmountCell value={row.original.paid_amt} tone='success' />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_PAYMENT_REGISTER_COLUMN_WIDTHS.paid_amt,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'pending_amt',
        accessorKey: 'pending_amt',
        columnLabel: 'Pending Amt.',
        header: ({ column }) => <SortableColumnHeader column={column} label='Pending Amt.' />,
        cell: ({ row }) => {
          const value = row.original.pending_amt;
          if (Number(value) === 0) return <TextCell value='0' />;
          return <AmountCell value={value} tone='warning' />;
        },
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_PAYMENT_REGISTER_COLUMN_WIDTHS.pending_amt,
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
            PROJECT_PROCUREMENT_PAYMENT_REGISTER_COLUMN_WIDTHS.status,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'created_at',
        accessorKey: 'created_at',
        columnLabel: 'Create At',
        header: 'Create At',
        cell: ({ row }) => <TextCell value={formatDateDisplay(row.original.created_at, '—')} />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_PAYMENT_REGISTER_COLUMN_WIDTHS.created_at,
            'whitespace-nowrap',
          ),
        },
      },
    ],
    [],
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
        <p className='text-label-md text-text-strong-950'>No payment records found</p>
        <p className='mt-1 text-paragraph-sm text-text-sub-500'>
          Adjust your search or filters to see results.
        </p>
      </div>
    );
  }

  const renderSkeleton = () => (
    <Table.Body spacing={4}>
      {Array.from({ length: 6 }).map((_, index, array) => (
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
      <Table.Root variant='compact' className='min-w-[1107px]'>
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
