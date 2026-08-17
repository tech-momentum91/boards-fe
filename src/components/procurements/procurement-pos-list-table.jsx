import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';

import ProjectBoqOverviewCostBreakdownTooltip from '@/components/boq/project-boqs/components/project-boq-overview-cost-breakdown-tooltip';
import { PROCUREMENT_POS_COLUMN_WIDTHS } from '@/components/procurements/constants';
import ProcurementPosStageBadge from '@/components/procurements/procurement-pos-stage-badge';
import ProjectProcurementPaymentTag from '@/components/procurements/project-procurement-payment-tag';
import ProjectProcurementPosStatusBadge from '@/components/procurements/project-procurement-pos-status-badge';
import { formatProcurementAmount } from '@/components/procurements/project-procurements-utils';
import { formatProjectCell } from '@/components/projects/shared';
import * as Table from '@/components/ui/table';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { applyColumnConfig } from '@/lib/column-utils';
import { cn } from '@/utils/cn';
import { formatDateDisplay, parseToDate } from '@/utils/date-utils';

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

function AmountCell({ value, tone = 'default' }) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return <TextCell value='—' />;
  if (numeric === 0) return <TextCell value='0' />;
  return <TextCell value={formatProcurementAmount(value)} tone={tone} />;
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
  const date = parseToDate(value);
  if (!date) return <TextCell value='—' />;
  return <TextCell value={format(date, 'do MMMM yyyy')} />;
}

export default function ProcurementPosListTable({
  rows = [],
  columnConfig = [],
  sorting: sortingFromParent = [],
  onSortingChange,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  enableScrollPagination = false,
  emptyDescription = 'Adjust your search or filters to see results.',
  embedded = false,
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
        id: 'po_number',
        accessorKey: 'po_number',
        columnLabel: 'PO Number',
        enableHiding: false,
        header: ({ column }) => <SortableColumnHeader column={column} label='PO Number' />,
        cell: ({ row }) => <TextCell value={row.original.po_number} strong />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.po_number, 'whitespace-nowrap'),
        },
      },
      {
        id: 'project',
        accessorKey: 'project',
        columnLabel: 'Project',
        header: ({ column }) => <SortableColumnHeader column={column} label='Project' />,
        cell: ({ row }) => <TextCell value={row.original.project} />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.project, 'whitespace-nowrap'),
        },
      },
      {
        id: 'vendor_name',
        accessorKey: 'vendor_name',
        columnLabel: 'Vendor Name',
        header: ({ column }) => <SortableColumnHeader column={column} label='Vendor Name' />,
        cell: ({ row }) => <TextCell value={row.original.vendor_name} />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.vendor_name, 'whitespace-nowrap'),
        },
      },
      {
        id: 'package',
        accessorKey: 'package',
        columnLabel: 'Package',
        header: ({ column }) => <SortableColumnHeader column={column} label='Package' />,
        cell: ({ row }) => <ProjectProcurementPaymentTag value={row.original.package} />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.package, 'whitespace-nowrap'),
        },
      },
      {
        id: 'category',
        accessorKey: 'category',
        columnLabel: 'Category',
        header: ({ column }) => <SortableColumnHeader column={column} label='Category' />,
        cell: ({ row }) => <ProjectProcurementPaymentTag value={row.original.category} />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.category, 'whitespace-nowrap'),
        },
      },
      {
        id: 'po_date',
        accessorKey: 'po_date',
        columnLabel: 'PO Date',
        header: ({ column }) => <SortableColumnHeader column={column} label='PO Date' />,
        cell: ({ row }) => <TextCell value={formatDateDisplay(row.original.po_date, '—')} />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.po_date, 'whitespace-nowrap'),
        },
      },
      {
        id: 'type',
        accessorKey: 'type',
        columnLabel: 'Type',
        header: ({ column }) => <SortableColumnHeader column={column} label='Type' />,
        cell: ({ row }) => <ProjectProcurementPaymentTag value={row.original.type} />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.type, 'whitespace-nowrap'),
        },
      },
      {
        id: 'po_value',
        accessorKey: 'po_value',
        columnLabel: 'PO Value',
        header: ({ column }) => <SortableColumnHeader column={column} label='PO Value' />,
        cell: ({ row }) => <AmountCell value={row.original.po_value} />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.po_value, 'whitespace-nowrap'),
        },
      },
      {
        id: 'paid_amt',
        accessorKey: 'paid_amt',
        columnLabel: 'Paid Amt.',
        header: ({ column }) => <SortableColumnHeader column={column} label='Paid Amt.' />,
        cell: ({ row }) => <AmountCell value={row.original.paid_amt} tone='success' />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.paid_amt, 'whitespace-nowrap'),
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
          return <AmountCell value={value} />;
        },
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.pending_amt, 'whitespace-nowrap'),
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        columnLabel: 'Status',
        header: ({ column }) => <SortableColumnHeader column={column} label='Status' />,
        cell: ({ row }) => <ProjectProcurementPosStatusBadge value={row.original.status} />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.status, 'whitespace-nowrap'),
        },
      },
      {
        id: 'stage',
        accessorKey: 'procurement_stage',
        columnLabel: 'Stage',
        header: ({ column }) => <SortableColumnHeader column={column} label='Stage' />,
        cell: ({ row }) => <ProcurementPosStageBadge value={row.original.procurement_stage} />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.stage, 'whitespace-nowrap'),
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
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.internal_boq, 'whitespace-nowrap'),
        },
      },
      {
        id: 'purchase_boq',
        accessorKey: 'purchase_boq_value',
        columnLabel: 'Purchase BOQ',
        header: ({ column }) => <SortableColumnHeader column={column} label='Purchase BOQ' />,
        cell: ({ row }) => <AmountCell value={row.original.purchase_boq_value} />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.purchase_boq, 'whitespace-nowrap'),
        },
      },
      {
        id: 'boq_po_value',
        accessorKey: 'boq_po_value',
        columnLabel: 'PO Value',
        header: ({ column }) => <SortableColumnHeader column={column} label='PO Value' />,
        cell: ({ row }) => <AmountCell value={row.original.boq_po_value} />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.boq_po_value, 'whitespace-nowrap'),
        },
      },
      {
        id: 'pending_po',
        accessorKey: 'pending_po_value',
        columnLabel: 'Pending PO',
        header: ({ column }) => <SortableColumnHeader column={column} label='Pending PO' />,
        cell: ({ row }) => <AmountCell value={row.original.pending_po_value} />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.pending_po, 'whitespace-nowrap'),
        },
      },
      {
        id: 'paid_payment',
        accessorKey: 'paid_payment',
        columnLabel: 'Paid Payment',
        header: ({ column }) => <SortableColumnHeader column={column} label='Paid Payment' />,
        cell: ({ row }) => <AmountCell value={row.original.paid_payment} tone='success' />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.paid_payment, 'whitespace-nowrap'),
        },
      },
      {
        id: 'parent_project',
        accessorKey: 'parent_project',
        columnLabel: 'Parent Project',
        header: ({ column }) => <SortableColumnHeader column={column} label='Parent Project' />,
        cell: ({ row }) => <TextCell value={row.original.parent_project} />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.parent_project, 'whitespace-nowrap'),
        },
      },
      {
        id: 'design_start',
        accessorKey: 'design_start',
        columnLabel: 'Design Start',
        header: ({ column }) => <SortableColumnHeader column={column} label='Design Start' />,
        cell: ({ row }) => <DesignDateCell value={row.original.design_start} />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.design_start, 'whitespace-nowrap'),
        },
      },
      {
        id: 'design_end',
        accessorKey: 'design_end',
        columnLabel: 'Design End',
        header: ({ column }) => <SortableColumnHeader column={column} label='Design End' />,
        cell: ({ row }) => <DesignDateCell value={row.original.design_end} />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.design_end, 'whitespace-nowrap'),
        },
      },
      {
        id: 'milestone_end',
        accessorKey: 'milestone_end',
        columnLabel: 'Design End',
        header: ({ column }) => <SortableColumnHeader column={column} label='Design End' />,
        cell: ({ row }) => <DesignDateCell value={row.original.milestone_end} />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.milestone_end, 'whitespace-nowrap'),
        },
      },
      {
        id: 'created_by',
        accessorKey: 'created_by',
        columnLabel: 'Created By',
        header: 'Created By',
        cell: ({ row }) => <TextCell value={row.original.created_by} />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.created_by, 'whitespace-nowrap'),
        },
      },
      {
        id: 'updated_by',
        accessorKey: 'updated_by',
        columnLabel: 'Updated By',
        header: 'Updated By',
        cell: ({ row }) => <TextCell value={row.original.updated_by} />,
        meta: {
          headClassName: cn(PROCUREMENT_POS_COLUMN_WIDTHS.updated_by, 'whitespace-nowrap'),
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
    getRowId: (row, index) => row.id || row.po_number || String(index),
    manualSorting: true,
    enableSortingRemoval: false,
  });

  const { sentinelRef } = useScrollPagination({
    onLoadMore: onLoadMore || (() => {}),
    hasMore: hasMore && enableScrollPagination,
    isLoading: isLoadingMore || isLoading,
    threshold: 200,
    enabled: enableScrollPagination && Boolean(onLoadMore),
  });

  if (!isLoading && rows.length === 0) {
    return (
      <div
        className={cn(
          'flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center',
          !embedded && 'mx-8',
        )}
      >
        <p className='text-label-md text-text-strong-950'>No purchase orders found</p>
        <p className='mt-1 text-paragraph-sm text-text-sub-500'>{emptyDescription}</p>
      </div>
    );
  }

  const renderSkeleton = () => (
    <Table.Body spacing={4}>
      {Array.from({ length: embedded ? 4 : 8 }).map((_, index, array) => (
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
    <div
      className={cn(
        'overflow-x-auto bg-bg-white-0',
        embedded ? 'min-h-0' : 'min-h-0 flex-1 overflow-y-auto px-8',
      )}
    >
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

            {enableScrollPagination && hasMore ? (
              <Table.Row ref={sentinelRef} data-scroll-sentinel>
                <Table.Cell colSpan={visibleDefs.length} className='h-1 p-0' />
              </Table.Row>
            ) : null}

            {isLoadingMore
              ? Array.from({ length: 2 }).map((_, index) => (
                  <React.Fragment key={`loading-more-${index}`}>
                    <Table.Row>
                      {visibleDefs.map((column) => (
                        <Table.Cell key={column.id || column.accessorKey}>
                          <div className='h-4 w-full animate-pulse rounded bg-bg-soft-200' />
                        </Table.Cell>
                      ))}
                    </Table.Row>
                    <Table.RowDivider dividerClassName='bg-transparent' />
                  </React.Fragment>
                ))
              : null}
          </Table.Body>
        )}
      </Table.Root>
    </div>
  );
}
