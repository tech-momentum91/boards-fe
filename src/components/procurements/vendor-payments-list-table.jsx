import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import ProjectBoqOverviewCostBreakdownTooltip from '@/components/boq/project-boqs/components/project-boq-overview-cost-breakdown-tooltip';
import { VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS } from '@/components/procurements/constants';
import ProcurementPosStageBadge from '@/components/procurements/procurement-pos-stage-badge';
import ProjectProcurementPosStatusBadge from '@/components/procurements/project-procurement-pos-status-badge';
import { formatProcurementAmount } from '@/components/procurements/project-procurements-utils';
import VendorPaymentsBillNoCell from '@/components/procurements/vendor-payments-bill-no-cell';
import { formatProjectCell } from '@/components/projects/shared';
import * as Table from '@/components/ui/table';
import { applyColumnConfig } from '@/lib/column-utils';
import { cn } from '@/utils/cn';
import { parseToDate } from '@/utils/date-utils';

function formatVendorPaymentDate(value) {
  const date = parseToDate(value);
  if (!date) return '—';
  return format(date, 'do MMM yyyy');
}

function formatTdsAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
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

function TextCell({ value, strong = false, tone = 'default' }) {
  const toneClassName =
    tone === 'success' ? 'text-[#067644]' : strong ? 'text-text-main-900' : 'text-text-sub-500';

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

function AmountCell({ value, tone = 'default', formatter = formatProcurementAmount }) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return <TextCell value='—' />;
  if (numeric === 0) return <TextCell value='0' />;
  return <TextCell value={formatter(value)} tone={tone} />;
}

function InternalBoqCell({ value, breakdown }) {
  const formatted = formatProcurementAmount(value);
  const breakdownItems = Array.isArray(breakdown) ? breakdown : [];

  if (breakdownItems.length === 0) {
    return <TextCell value={formatted} />;
  }

  return (
    <div className='flex items-center gap-1'>
      <span className='text-paragraph-sm text-text-sub-500'>{formatted}</span>
      <ProjectBoqOverviewCostBreakdownTooltip
        items={breakdownItems}
        iconColor='text-text-soft-400'
      />
    </div>
  );
}

function DesignDateCell({ value }) {
  return <TextCell value={formatVendorPaymentDate(value)} />;
}

export default function VendorPaymentsListTable({
  rows = [],
  columnConfig = [],
  sorting: sortingFromParent = [],
  onSortingChange,
  onBillNoChange,
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
        id: 'vendor_name',
        accessorKey: 'vendor_name',
        columnLabel: 'Vendor Name',
        enableHiding: false,
        header: ({ column }) => <SortableColumnHeader column={column} label='Vendor Name' />,
        cell: ({ row }) => <TextCell value={row.original.vendor_name} strong />,
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.vendor_name, 'whitespace-nowrap'),
        },
      },
      {
        id: 'project',
        accessorKey: 'project',
        columnLabel: 'Project',
        header: ({ column }) => <SortableColumnHeader column={column} label='Project' />,
        cell: ({ row }) => <TextCell value={row.original.project} />,
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.project, 'whitespace-nowrap'),
        },
      },
      {
        id: 'payment_date',
        accessorKey: 'payment_date',
        columnLabel: 'Payment Date',
        header: ({ column }) => <SortableColumnHeader column={column} label='Payment Date' />,
        cell: ({ row }) => <TextCell value={formatVendorPaymentDate(row.original.payment_date)} />,
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.payment_date, 'whitespace-nowrap'),
        },
      },
      {
        id: 'po_no',
        accessorKey: 'po_no',
        columnLabel: 'PO No.',
        header: ({ column }) => <SortableColumnHeader column={column} label='PO No.' />,
        cell: ({ row }) => <TextCell value={row.original.po_no} />,
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.po_no, 'whitespace-nowrap'),
        },
      },
      {
        id: 'invoice_no',
        accessorKey: 'invoice_no',
        columnLabel: 'Invoice No.',
        header: ({ column }) => <SortableColumnHeader column={column} label='Invoice No.' />,
        cell: ({ row }) => <TextCell value={row.original.invoice_no} />,
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.invoice_no, 'whitespace-nowrap'),
        },
      },
      {
        id: 'gross_amt',
        accessorKey: 'gross_amt',
        columnLabel: 'Gross Amt.',
        header: ({ column }) => <SortableColumnHeader column={column} label='Gross Amt.' />,
        cell: ({ row }) => <AmountCell value={row.original.gross_amt} />,
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.gross_amt, 'whitespace-nowrap'),
        },
      },
      {
        id: 'tds',
        accessorKey: 'tds',
        columnLabel: 'TDS',
        header: ({ column }) => <SortableColumnHeader column={column} label='TDS' />,
        cell: ({ row }) => <AmountCell value={row.original.tds} formatter={formatTdsAmount} />,
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.tds, 'whitespace-nowrap'),
        },
      },
      {
        id: 'net_paid',
        accessorKey: 'net_paid',
        columnLabel: 'Net Paid',
        header: ({ column }) => <SortableColumnHeader column={column} label='Net Paid' />,
        cell: ({ row }) => <AmountCell value={row.original.net_paid} tone='success' />,
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.net_paid, 'whitespace-nowrap'),
        },
      },
      {
        id: 'bill_received',
        accessorKey: 'bill_received',
        columnLabel: 'Bill Received',
        header: ({ column }) => <SortableColumnHeader column={column} label='Bill Received' />,
        cell: ({ row }) => <AmountCell value={row.original.bill_received} />,
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.bill_received, 'whitespace-nowrap'),
        },
      },
      {
        id: 'bill_no',
        accessorKey: 'bill_no',
        columnLabel: 'Bill No.',
        header: ({ column }) => <SortableColumnHeader column={column} label='Bill No.' />,
        cell: ({ row }) => (
          <VendorPaymentsBillNoCell
            value={row.original.bill_no}
            onChange={(nextValue) => onBillNoChange?.(row.original.id, nextValue)}
          />
        ),
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.bill_no, 'whitespace-nowrap'),
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        columnLabel: 'Status',
        header: ({ column }) => <SortableColumnHeader column={column} label='Status' />,
        cell: ({ row }) => <ProjectProcurementPosStatusBadge value={row.original.status} />,
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.status, 'whitespace-nowrap'),
        },
      },
      {
        id: 'procurement_stage',
        accessorKey: 'procurement_stage',
        columnLabel: 'Stage',
        header: ({ column }) => <SortableColumnHeader column={column} label='Stage' />,
        cell: ({ row }) => <ProcurementPosStageBadge value={row.original.procurement_stage} />,
        meta: {
          headClassName: cn(
            VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.procurement_stage,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'internal_boq',
        accessorKey: 'internal_boq_value',
        columnLabel: 'Internal BOQ',
        header: ({ column }) => <SortableColumnHeader column={column} label='Internal BOQ' />,
        cell: ({ row }) => (
          <InternalBoqCell
            value={row.original.internal_boq_value}
            breakdown={row.original.internal_boq_breakdown}
          />
        ),
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.internal_boq, 'whitespace-nowrap'),
        },
      },
      {
        id: 'purchase_boq',
        accessorKey: 'purchase_boq_value',
        columnLabel: 'Purchase BOQ',
        header: ({ column }) => <SortableColumnHeader column={column} label='Purchase BOQ' />,
        cell: ({ row }) => <AmountCell value={row.original.purchase_boq_value} />,
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.purchase_boq, 'whitespace-nowrap'),
        },
      },
      {
        id: 'po_value',
        accessorKey: 'po_value',
        columnLabel: 'PO Value',
        header: ({ column }) => <SortableColumnHeader column={column} label='PO Value' />,
        cell: ({ row }) => <AmountCell value={row.original.po_value} />,
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.po_value, 'whitespace-nowrap'),
        },
      },
      {
        id: 'pending_po',
        accessorKey: 'pending_po_value',
        columnLabel: 'Pending PO',
        header: ({ column }) => <SortableColumnHeader column={column} label='Pending PO' />,
        cell: ({ row }) => <AmountCell value={row.original.pending_po_value} />,
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.pending_po, 'whitespace-nowrap'),
        },
      },
      {
        id: 'paid_payment',
        accessorKey: 'paid_payment',
        columnLabel: 'Paid Payment',
        header: ({ column }) => <SortableColumnHeader column={column} label='Paid Payment' />,
        cell: ({ row }) => <AmountCell value={row.original.paid_payment} tone='success' />,
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.paid_payment, 'whitespace-nowrap'),
        },
      },
      {
        id: 'parent_project',
        accessorKey: 'parent_project',
        columnLabel: 'Parent Project',
        header: ({ column }) => <SortableColumnHeader column={column} label='Parent Project' />,
        cell: ({ row }) => <TextCell value={row.original.parent_project} />,
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.parent_project, 'whitespace-nowrap'),
        },
      },
      {
        id: 'design_start',
        accessorKey: 'design_start',
        columnLabel: 'Design Start',
        header: ({ column }) => <SortableColumnHeader column={column} label='Design Start' />,
        cell: ({ row }) => <DesignDateCell value={row.original.design_start} />,
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.design_start, 'whitespace-nowrap'),
        },
      },
      {
        id: 'design_end',
        accessorKey: 'design_end',
        columnLabel: 'Design End',
        header: ({ column }) => <SortableColumnHeader column={column} label='Design End' />,
        cell: ({ row }) => <DesignDateCell value={row.original.design_end} />,
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.design_end, 'whitespace-nowrap'),
        },
      },
      {
        id: 'milestone_end',
        accessorKey: 'milestone_end',
        columnLabel: 'Design End',
        header: ({ column }) => <SortableColumnHeader column={column} label='Design End' />,
        cell: ({ row }) => <DesignDateCell value={row.original.milestone_end} />,
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.milestone_end, 'whitespace-nowrap'),
        },
      },
      {
        id: 'created_by',
        accessorKey: 'created_by',
        columnLabel: 'Created By',
        header: 'Created By',
        cell: ({ row }) => <TextCell value={row.original.created_by} />,
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.created_by, 'whitespace-nowrap'),
        },
      },
      {
        id: 'last_updated',
        accessorKey: 'last_updated',
        columnLabel: 'Last Updated',
        header: 'Last Updated',
        cell: ({ row }) => <TextCell value={formatVendorPaymentDate(row.original.last_updated)} />,
        meta: {
          headClassName: cn(VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS.last_updated, 'whitespace-nowrap'),
        },
      },
    ],
    [onBillNoChange],
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
        <p className='text-label-md text-text-strong-950'>No vendor payments found</p>
        <p className='mt-1 text-paragraph-sm text-text-sub-500'>
          Adjust your search or filters to see results.
        </p>
      </div>
    );
  }

  const renderSkeleton = () => (
    <Table.Body spacing={4}>
      {Array.from({ length: 8 }).map((_, index, array) => (
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
      <Table.Root variant='compact' className='min-w-[1107px] overflow-visible'>
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
