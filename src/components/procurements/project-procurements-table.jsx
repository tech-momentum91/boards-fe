import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import ProjectBoqOverviewCostBreakdownTooltip from '@/components/boq/project-boqs/components/project-boq-overview-cost-breakdown-tooltip';
import { PROJECT_PROCUREMENTS_COLUMN_WIDTHS } from '@/components/procurements/constants';
import { formatProcurementAmount } from '@/components/procurements/project-procurements-utils';
import { colorForProjectStage, formatProjectCell } from '@/components/projects/shared';
import * as Badge from '@/components/ui/badge';
import * as Table from '@/components/ui/table';
import { applyColumnConfig } from '@/lib/column-utils';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
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

function colorForProcurementStatusBadge(status) {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized === 'e1') return 'orange';
  return colorForProjectStage(status);
}

function ProjectStageBadge({ stage }) {
  if (!stage) return <span className='text-paragraph-sm text-text-soft-400'>—</span>;

  return (
    <Badge.Root
      size='small'
      variant='light'
      color={colorForProcurementStatusBadge(stage)}
      className='uppercase'
    >
      {stage}
    </Badge.Root>
  );
}

function AmountCell({ value, breakdown, tone = 'default', showBreakdown = false }) {
  const formatted = formatProcurementAmount(value);
  const breakdownItems = showBreakdown && Array.isArray(breakdown) ? breakdown : [];

  const amountClassName = tone === 'success' ? 'text-[#067644]' : 'text-text-sub-500';

  if (breakdownItems.length === 0) {
    return <span className={cn('text-paragraph-sm', amountClassName)}>{formatted}</span>;
  }

  return (
    <div className='flex items-center gap-1'>
      <span className={cn('text-paragraph-sm', amountClassName)}>{formatted}</span>
      <ProjectBoqOverviewCostBreakdownTooltip items={breakdownItems} iconColor='text-[#162664]' />
    </div>
  );
}

function TextCell({ value, strong = false }) {
  return (
    <span
      className={cn(
        'block truncate text-paragraph-sm whitespace-nowrap',
        strong ? 'font-medium text-text-main-900' : 'text-text-sub-500',
      )}
    >
      {formatProjectCell(value)}
    </span>
  );
}

export default function ProjectProcurementsTable({
  rows = [],
  columnConfig = [],
  sorting: sortingFromParent = [],
  onSortingChange,
  onRowClick,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  enableScrollPagination = false,
  variant = 'compact',
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
        id: 'name',
        accessorKey: 'name',
        columnLabel: 'Name',
        enableHiding: false,
        header: ({ column }) => <SortableColumnHeader column={column} label='Name' />,
        cell: ({ row }) => <TextCell value={row.original.name} strong />,
        meta: { headClassName: cn(PROJECT_PROCUREMENTS_COLUMN_WIDTHS.name, 'whitespace-nowrap') },
      },
      {
        id: 'stage',
        accessorKey: 'stage',
        columnLabel: 'Stage',
        header: ({ column }) => <SortableColumnHeader column={column} label='Stage' />,
        cell: ({ row }) => <ProjectStageBadge stage={row.original.stage} />,
        meta: { headClassName: cn(PROJECT_PROCUREMENTS_COLUMN_WIDTHS.stage, 'whitespace-nowrap') },
      },
      {
        id: 'city',
        accessorKey: 'city',
        columnLabel: 'City',
        header: ({ column }) => <SortableColumnHeader column={column} label='City' />,
        cell: ({ row }) => <TextCell value={row.original.city} />,
        meta: { headClassName: cn(PROJECT_PROCUREMENTS_COLUMN_WIDTHS.city, 'whitespace-nowrap') },
      },
      {
        id: 'internal_boq',
        accessorKey: 'internal_boq_value',
        columnLabel: 'Internal BOQ',
        header: ({ column }) => <SortableColumnHeader column={column} label='Internal BOQ' />,
        cell: ({ row }) => (
          <AmountCell
            value={row.original.internal_boq_value}
            breakdown={row.original.internal_boq_breakdown}
            showBreakdown
          />
        ),
        meta: {
          headClassName: cn(PROJECT_PROCUREMENTS_COLUMN_WIDTHS.internal_boq, 'whitespace-nowrap'),
        },
      },
      {
        id: 'purchase_boq',
        accessorKey: 'purchase_boq_value',
        columnLabel: 'Purchase BOQ',
        header: ({ column }) => <SortableColumnHeader column={column} label='Purchase BOQ' />,
        cell: ({ row }) => <AmountCell value={row.original.purchase_boq_value} />,
        meta: {
          headClassName: cn(PROJECT_PROCUREMENTS_COLUMN_WIDTHS.purchase_boq, 'whitespace-nowrap'),
        },
      },
      {
        id: 'po_value',
        accessorKey: 'po_value',
        columnLabel: 'PO Value',
        header: ({ column }) => <SortableColumnHeader column={column} label='PO Value' />,
        cell: ({ row }) => <AmountCell value={row.original.po_value} />,
        meta: {
          headClassName: cn(PROJECT_PROCUREMENTS_COLUMN_WIDTHS.po_value, 'whitespace-nowrap'),
        },
      },
      {
        id: 'pending_po',
        accessorKey: 'pending_po_value',
        columnLabel: 'Pending PO',
        header: ({ column }) => <SortableColumnHeader column={column} label='Pending PO' />,
        cell: ({ row }) => <AmountCell value={row.original.pending_po_value} />,
        meta: {
          headClassName: cn(PROJECT_PROCUREMENTS_COLUMN_WIDTHS.pending_po, 'whitespace-nowrap'),
        },
      },
      {
        id: 'paid_payment',
        accessorKey: 'paid_payment',
        columnLabel: 'Paid Payment',
        header: ({ column }) => <SortableColumnHeader column={column} label='Paid Payment' />,
        cell: ({ row }) => <AmountCell value={row.original.paid_payment} tone='success' />,
        meta: {
          headClassName: cn(PROJECT_PROCUREMENTS_COLUMN_WIDTHS.paid_payment, 'whitespace-nowrap'),
        },
      },
      {
        id: 'pending_payment',
        accessorKey: 'pending_payment',
        columnLabel: 'Pending Payment',
        header: ({ column }) => <SortableColumnHeader column={column} label='Pending Payment' />,
        cell: ({ row }) => <AmountCell value={row.original.pending_payment} />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENTS_COLUMN_WIDTHS.pending_payment,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'parent_project',
        accessorKey: 'parent_project',
        columnLabel: 'Parent Project',
        header: ({ column }) => <SortableColumnHeader column={column} label='Parent Project' />,
        cell: ({ row }) => <TextCell value={row.original.parent_project} />,
        meta: {
          headClassName: cn(PROJECT_PROCUREMENTS_COLUMN_WIDTHS.parent_project, 'whitespace-nowrap'),
        },
      },
      {
        id: 'design_start',
        accessorKey: 'design_start',
        columnLabel: 'Design Start',
        header: ({ column }) => <SortableColumnHeader column={column} label='Design Start' />,
        cell: ({ row }) => <TextCell value={formatDateDisplay(row.original.design_start, '—')} />,
        meta: {
          headClassName: cn(PROJECT_PROCUREMENTS_COLUMN_WIDTHS.design_start, 'whitespace-nowrap'),
        },
      },
      {
        id: 'design_end',
        accessorKey: 'design_end',
        columnLabel: 'Design End',
        header: ({ column }) => <SortableColumnHeader column={column} label='Design End' />,
        cell: ({ row }) => <TextCell value={formatDateDisplay(row.original.design_end, '—')} />,
        meta: {
          headClassName: cn(PROJECT_PROCUREMENTS_COLUMN_WIDTHS.design_end, 'whitespace-nowrap'),
        },
      },
      {
        id: 'last_updated',
        accessorKey: 'last_updated',
        columnLabel: 'Last Updated',
        header: ({ column }) => <SortableColumnHeader column={column} label='Last Updated' />,
        cell: ({ row }) => <TextCell value={formatDateDisplay(row.original.last_updated, '—')} />,
        meta: {
          headClassName: cn(PROJECT_PROCUREMENTS_COLUMN_WIDTHS.last_updated, 'whitespace-nowrap'),
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

  const { sentinelRef } = useScrollPagination({
    onLoadMore: onLoadMore || (() => {}),
    hasMore: hasMore && enableScrollPagination,
    isLoading: isLoadingMore || isLoading,
    threshold: 200,
    enabled: enableScrollPagination && Boolean(onLoadMore),
  });

  if (!isLoading && rows.length === 0) {
    return (
      <div className='flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
        <p className='text-label-md text-text-strong-950'>No project procurements found</p>
        <p className='mt-1 text-paragraph-sm text-text-sub-500'>
          Adjust your filters or fiscal year to see results.
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
      <Table.Root variant={variant} className='min-w-[1351px]'>
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
                <Table.Row
                  className={cn(onRowClick && 'cursor-pointer')}
                  onClick={() => onRowClick?.(row.original)}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(event) => {
                    if (!onRowClick) return;
                    if (event.key === 'Enter' || event.key === ' ') onRowClick(row.original);
                  }}
                >
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
                        <Table.Cell key={column.id}>
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
