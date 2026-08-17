import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import { BILL_AND_INVOICE_LIST_COLUMN_WIDTHS } from '@/components/procurements/constants';
import BillAndInvoiceLinkedBillCell from '@/components/procurements/bill-and-invoice-linked-bill-cell';
import BillAndInvoiceStatusBadge from '@/components/procurements/bill-and-invoice-status-badge';
import { formatProcurementAmount } from '@/components/procurements/project-procurements-utils';
import { formatProjectCell } from '@/components/projects/shared';
import * as Button from '@/components/ui/button';
import * as Table from '@/components/ui/table';
import { applyColumnConfig } from '@/lib/column-utils';
import { cn } from '@/utils/cn';

const BILL_STATUS_SUBMITTED = 'Submitted for approval';
const BILL_STATUS_APPROVED = 'Approved';

function formatBillDate(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'dd MMM yyyy');
}

function formatGstAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  if (amount === 0) return '0';
  if (amount >= 1000 && amount < 1_00_000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return formatProcurementAmount(value);
}

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
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return <TextCell value='—' />;
  if (numeric === 0) return <TextCell value='0' />;
  return <TextCell value={formatProcurementAmount(value)} />;
}

function GstAmountCell({ value }) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return <TextCell value='—' />;
  if (numeric === 0) return <TextCell value='0' />;
  return <TextCell value={formatGstAmount(value)} />;
}

export default function BillAndInvoiceListTable({
  rows = [],
  columnConfig = [],
  sorting: sortingFromParent = [],
  onSortingChange,
  onLinkedBillUpload,
  onLinkedBillRemove,
  onApprove,
  approvingId = null,
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
        id: 'invoice_no',
        accessorKey: 'invoice_no',
        columnLabel: 'Invoice No.',
        enableHiding: false,
        header: 'Invoice No.',
        cell: ({ row }) => <TextCell value={row.original.invoice_no} strong />,
        meta: {
          headClassName: cn(BILL_AND_INVOICE_LIST_COLUMN_WIDTHS.invoice_no, 'whitespace-nowrap'),
        },
      },
      {
        id: 'vendor',
        accessorKey: 'vendor',
        columnLabel: 'Vendor',
        header: ({ column }) => <SortableColumnHeader column={column} label='Vendor' />,
        cell: ({ row }) => <TextCell value={row.original.vendor} />,
        meta: {
          headClassName: cn(BILL_AND_INVOICE_LIST_COLUMN_WIDTHS.vendor, 'whitespace-nowrap'),
        },
      },
      {
        id: 'project',
        accessorKey: 'project',
        columnLabel: 'Project',
        header: ({ column }) => <SortableColumnHeader column={column} label='Project' />,
        cell: ({ row }) => <TextCell value={row.original.project} />,
        meta: {
          headClassName: cn(BILL_AND_INVOICE_LIST_COLUMN_WIDTHS.project, 'whitespace-nowrap'),
        },
      },
      {
        id: 'po_no',
        accessorKey: 'po_no',
        columnLabel: 'PO No.',
        header: ({ column }) => <SortableColumnHeader column={column} label='PO No.' />,
        cell: ({ row }) => <TextCell value={row.original.po_no} />,
        meta: {
          headClassName: cn(BILL_AND_INVOICE_LIST_COLUMN_WIDTHS.po_no, 'whitespace-nowrap'),
        },
      },
      {
        id: 'po_value',
        accessorKey: 'po_value',
        columnLabel: 'PO Value',
        header: ({ column }) => <SortableColumnHeader column={column} label='PO Value' />,
        cell: ({ row }) => <AmountCell value={row.original.po_value} />,
        meta: {
          headClassName: cn(BILL_AND_INVOICE_LIST_COLUMN_WIDTHS.po_value, 'whitespace-nowrap'),
        },
      },
      {
        id: 'bill_date',
        accessorKey: 'bill_date',
        columnLabel: 'Bill Date',
        header: ({ column }) => <SortableColumnHeader column={column} label='Bill Date' />,
        cell: ({ row }) => <TextCell value={formatBillDate(row.original.bill_date)} />,
        meta: {
          headClassName: cn(BILL_AND_INVOICE_LIST_COLUMN_WIDTHS.bill_date, 'whitespace-nowrap'),
        },
      },
      {
        id: 'bill_amt',
        accessorKey: 'bill_amt',
        columnLabel: 'Bill Amt.',
        header: ({ column }) => <SortableColumnHeader column={column} label='Bill Amt.' />,
        cell: ({ row }) => <AmountCell value={row.original.bill_amt} />,
        meta: {
          headClassName: cn(BILL_AND_INVOICE_LIST_COLUMN_WIDTHS.bill_amt, 'whitespace-nowrap'),
        },
      },
      {
        id: 'gst_amt',
        accessorKey: 'gst_amt',
        columnLabel: 'GST Amt.',
        header: ({ column }) => <SortableColumnHeader column={column} label='GST Amt.' />,
        cell: ({ row }) => <GstAmountCell value={row.original.gst_amt} />,
        meta: {
          headClassName: cn(BILL_AND_INVOICE_LIST_COLUMN_WIDTHS.gst_amt, 'whitespace-nowrap'),
        },
      },
      {
        id: 'linked_bill',
        accessorKey: 'linked_bill',
        columnLabel: 'Linked Bill',
        header: ({ column }) => <SortableColumnHeader column={column} label='Linked Bill' />,
        cell: ({ row }) => {
          const locked = row.original.status === BILL_STATUS_APPROVED;
          return (
            <BillAndInvoiceLinkedBillCell
              file={row.original.linked_bill}
              locked={locked}
              onUpload={(file) => onLinkedBillUpload?.(row.original.id, file)}
              onRemove={() => onLinkedBillRemove?.(row.original.id)}
            />
          );
        },
        meta: {
          headClassName: cn(BILL_AND_INVOICE_LIST_COLUMN_WIDTHS.linked_bill, 'whitespace-nowrap'),
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        columnLabel: 'Status',
        header: ({ column }) => <SortableColumnHeader column={column} label='Status' />,
        cell: ({ row }) => <BillAndInvoiceStatusBadge value={row.original.status} />,
        meta: {
          headClassName: cn(BILL_AND_INVOICE_LIST_COLUMN_WIDTHS.status, 'whitespace-nowrap'),
        },
      },
      {
        id: 'actions',
        accessorKey: 'actions',
        columnLabel: 'Actions',
        enableHiding: false,
        enableSorting: false,
        header: 'Actions',
        cell: ({ row }) => {
          if (row.original.status !== BILL_STATUS_SUBMITTED) {
            return <span className='text-paragraph-sm text-text-soft-400'>—</span>;
          }
          const isApproving = approvingId === row.original.id;
          return (
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='xsmall'
              disabled={isApproving || Boolean(approvingId)}
              className='h-8 px-2.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
              onClick={(event) => {
                event.stopPropagation();
                onApprove?.(row.original.id);
              }}
            >
              <span className='text-label-sm'>{isApproving ? 'Approving…' : 'Approve'}</span>
            </Button.Root>
          );
        },
        meta: {
          headClassName: cn(BILL_AND_INVOICE_LIST_COLUMN_WIDTHS.actions, 'whitespace-nowrap'),
        },
      },
      {
        id: 'created_by',
        accessorKey: 'created_by',
        columnLabel: 'Created By',
        header: 'Created By',
        cell: ({ row }) => <TextCell value={row.original.created_by} />,
        meta: {
          headClassName: cn(BILL_AND_INVOICE_LIST_COLUMN_WIDTHS.created_by, 'whitespace-nowrap'),
        },
      },
      {
        id: 'last_updated',
        accessorKey: 'last_updated',
        columnLabel: 'Last Updated',
        header: 'Last Updated',
        cell: ({ row }) => <TextCell value={formatBillDate(row.original.last_updated)} />,
        meta: {
          headClassName: cn(BILL_AND_INVOICE_LIST_COLUMN_WIDTHS.last_updated, 'whitespace-nowrap'),
        },
      },
    ],
    [approvingId, onApprove, onLinkedBillRemove, onLinkedBillUpload],
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
        <p className='text-label-md text-text-strong-950'>No bills or invoices found</p>
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
    <div className='h-full min-h-0 flex-1 overflow-x-auto overflow-y-auto'>
      <Table.Root variant='compact' className='min-w-[1602px] overflow-visible'>
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
