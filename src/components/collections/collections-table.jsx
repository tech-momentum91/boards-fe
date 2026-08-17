import React, { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RiArrowDownSLine, RiArrowRightSLine } from 'react-icons/ri';
import CollectionsMilestoneTable from '@/components/collections/collections-milestone-table';
import CollectionsProgressCell from '@/components/collections/collections-progress-cell';
import { CollectionsSortableHeader } from '@/components/collections/collections-toolbar';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import * as Table from '@/components/ui/table';
import { applyColumnConfig } from '@/lib/column-utils';

const EXPANDED_PROJECT_ROW_BG = '#EAECF5';

function PlainValueCell({ value }) {
  return <span className='truncate text-paragraph-sm text-text-sub-500'>{value || '—'}</span>;
}

export default function CollectionsTable({
  rows = [],
  columnConfig = [],
  sorting,
  onSortingChange,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  scrollContainer = null,
}) {
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const { sentinelRef } = useScrollPagination({
    onLoadMore: onLoadMore || (() => {}),
    hasMore: Boolean(hasMore),
    isLoading: Boolean(isLoadingMore || isLoading),
    threshold: 200,
    scrollContainer,
    enabled: Boolean(onLoadMore),
  });

  const toggleExpanded = (projectId) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const allColumnDefs = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        columnLabel: 'Name',
        header: ({ column }) => <CollectionsSortableHeader label='Name' column={column} />,
        cell: ({ row }) => {
          const isExpanded = expandedIds.has(row.original.id);
          const hasMilestones = (row.original.milestones?.length ?? 0) > 0;

          return (
            <div className='flex min-w-0 items-center gap-1'>
              <span className='truncate text-label-sm text-text-main-900'>{row.original.name}</span>
              {hasMilestones ? (
                <button
                  type='button'
                  className='inline-flex size-5 shrink-0 items-center justify-center rounded text-text-sub-500 transition hover:bg-bg-weak-100 hover:text-text-main-900'
                  aria-label={isExpanded ? 'Collapse project' : 'Expand project'}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleExpanded(row.original.id);
                  }}
                >
                  {isExpanded ? (
                    <RiArrowDownSLine className='size-4' />
                  ) : (
                    <RiArrowRightSLine className='size-4' />
                  )}
                </button>
              ) : null}
            </div>
          );
        },
        enableSorting: true,
        meta: { headClassName: 'w-[149px]', cellClassName: 'w-[149px]' },
      },
      {
        id: 'account',
        accessorKey: 'account',
        columnLabel: 'Account',
        header: ({ column }) => <CollectionsSortableHeader label='Account' column={column} />,
        cell: ({ row }) => <PlainValueCell value={row.original.account} />,
        enableSorting: true,
        meta: { headClassName: 'w-[120px]', cellClassName: 'w-[120px]' },
      },
      {
        id: 'boq_value',
        accessorKey: 'boq_value',
        columnLabel: 'BOQ Value (₹)',
        header: ({ column }) => <CollectionsSortableHeader label='BOQ Value (₹)' column={column} />,
        cell: ({ row }) => <PlainValueCell value={row.original.boq_value} />,
        enableSorting: true,
        meta: { headClassName: 'w-[135px]', cellClassName: 'w-[135px]' },
      },
      {
        id: 'invoiced',
        accessorKey: 'invoiced',
        columnLabel: 'Invoiced (₹)',
        header: ({ column }) => <CollectionsSortableHeader label='Invoiced (₹)' column={column} />,
        cell: ({ row }) => <PlainValueCell value={row.original.invoiced} />,
        enableSorting: true,
        meta: { headClassName: 'w-[112px]', cellClassName: 'w-[112px]' },
      },
      {
        id: 'received',
        accessorKey: 'received',
        columnLabel: 'Received (₹)',
        header: ({ column }) => <CollectionsSortableHeader label='Received (₹)' column={column} />,
        cell: ({ row }) => <PlainValueCell value={row.original.received} />,
        enableSorting: true,
        meta: { headClassName: 'w-[117px]', cellClassName: 'w-[117px]' },
      },
      {
        id: 'outstanding',
        accessorKey: 'outstanding',
        columnLabel: 'Outstanding (₹)',
        header: ({ column }) => (
          <CollectionsSortableHeader label='Outstanding (₹)' column={column} />
        ),
        cell: ({ row }) => <PlainValueCell value={row.original.outstanding} />,
        enableSorting: true,
        meta: { headClassName: 'w-[143px]', cellClassName: 'w-[143px]' },
      },
      {
        id: 'collection_progress',
        accessorKey: 'collection_progress',
        columnLabel: 'Collection',
        header: () => <span className='text-paragraph-sm text-text-sub-600'>Collection</span>,
        cell: ({ row }) => <CollectionsProgressCell value={row.original.collection_progress} />,
        enableSorting: false,
        meta: { headClassName: 'w-[140px]', cellClassName: 'w-[140px]' },
      },
      {
        id: 'project_progress',
        accessorKey: 'project_progress',
        columnLabel: 'Project',
        header: () => <span className='text-paragraph-sm text-text-sub-600'>Project</span>,
        cell: ({ row }) => <CollectionsProgressCell value={row.original.project_progress} />,
        enableSorting: false,
        meta: { headClassName: 'w-[140px]', cellClassName: 'w-[140px]' },
      },
      {
        id: 'vendor_progress',
        accessorKey: 'vendor_progress',
        columnLabel: 'Vendor',
        header: () => <span className='text-paragraph-sm text-text-sub-600'>Vendor</span>,
        cell: ({ row }) => <CollectionsProgressCell value={row.original.vendor_progress} />,
        enableSorting: false,
        meta: { headClassName: 'w-[140px]', cellClassName: 'w-[140px]' },
      },
    ],
    [expandedIds],
  );

  const visibleDefs = useMemo(
    () => applyColumnConfig(allColumnDefs, columnConfig),
    [allColumnDefs, columnConfig],
  );

  const table = useReactTable({
    data: rows,
    columns: visibleDefs,
    state: { sorting },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className='flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-paragraph-sm text-text-sub-500'>
        Loading collections…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className='flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
        <p className='text-label-md text-text-strong-950'>No collections found</p>
        <p className='mt-1 text-paragraph-sm text-text-sub-500'>
          Adjust your search or project filter.
        </p>
      </div>
    );
  }

  return (
    <Table.Root variant='compact' className='min-w-max'>
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
      <Table.Body spacing={4}>
        {table.getRowModel().rows.map((row) => {
          const isExpanded = expandedIds.has(row.original.id);

          return (
            <React.Fragment key={row.id}>
              <Table.Row
                style={isExpanded ? { backgroundColor: EXPANDED_PROJECT_ROW_BG } : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <Table.Cell key={cell.id} className={cell.column.columnDef.meta?.cellClassName}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Cell>
                ))}
              </Table.Row>

              {isExpanded ? (
                <Table.Row>
                  <Table.Cell colSpan={visibleDefs.length} className='bg-bg-white-0 px-3 py-3'>
                    <CollectionsMilestoneTable milestones={row.original.milestones ?? []} />
                  </Table.Cell>
                </Table.Row>
              ) : null}

              <Table.RowDivider dividerClassName='bg-transparent' />
            </React.Fragment>
          );
        })}

        {onLoadMore && hasMore && !isLoading ? (
          <Table.Row ref={sentinelRef} data-scroll-sentinel>
            <Table.Cell colSpan={visibleDefs.length} className='h-1 p-0' />
          </Table.Row>
        ) : null}

        {isLoadingMore ? (
          <Table.Row>
            <Table.Cell colSpan={visibleDefs.length} className='py-4 text-center'>
              <span className='text-paragraph-sm text-text-sub-500'>Loading more…</span>
            </Table.Cell>
          </Table.Row>
        ) : null}
      </Table.Body>
    </Table.Root>
  );
}
