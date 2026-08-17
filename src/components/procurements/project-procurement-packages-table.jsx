import React, { memo, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  PROJECT_PROCUREMENT_PACKAGE_STATUS_META,
  PROJECT_PROCUREMENT_PACKAGES_COLUMN_WIDTHS,
} from '@/components/procurements/constants';
import { formatProcurementAmount } from '@/components/procurements/project-procurements-utils';
import * as Badge from '@/components/ui/badge';
import * as Table from '@/components/ui/table';
import { applyColumnConfig } from '@/lib/column-utils';
import { cn } from '@/utils/cn';

const CATEGORY_TAG_CLASS =
  'inline-flex max-w-full items-center justify-center truncate rounded-md border border-[#d0d5dd] bg-white px-2 py-[3px] text-[12px] font-medium leading-[18px] text-[#344054]';

const BIDDER_TAG_CLASS =
  'inline-flex max-w-full items-center gap-1.5 rounded-md border border-[rgba(208,213,221,0.4)] bg-bg-weak-100 px-2 py-[3px]';

function SortableColumnHeader({ column, label }) {
  const sortState = column.getIsSorted();

  return (
    <div className='flex items-center gap-0.5'>
      <span className='whitespace-nowrap text-paragraph-sm font-medium tracking-[-0.084px] text-text-soft-400'>
        {label}
      </span>
      <button
        type='button'
        className='flex size-5 shrink-0 cursor-pointer items-center justify-center text-text-soft-400 transition-colors hover:text-text-strong-950'
        onClick={() => column.toggleSorting(sortState === 'asc')}
        aria-label={`Sort by ${label}`}
      >
        {Table.getSortingIcon(sortState)}
      </button>
    </div>
  );
}

function CategoryTags({ categories = [] }) {
  if (categories.length === 0) {
    return <span className='text-paragraph-sm text-text-sub-500'>-</span>;
  }

  const [primaryCategory, ...remainingCategories] = categories;
  const remainingCount = remainingCategories.length;
  const allCategoriesLabel = categories.join(', ');

  return (
    <div
      className='flex min-w-0 flex-nowrap items-center gap-1'
      title={remainingCount > 0 ? allCategoriesLabel : undefined}
    >
      <span className={CATEGORY_TAG_CLASS} title={primaryCategory}>
        {primaryCategory}
      </span>
      {remainingCount > 0 ? (
        <span className={cn(CATEGORY_TAG_CLASS, 'shrink-0')} aria-label={allCategoriesLabel}>
          +{remainingCount}
        </span>
      ) : null}
    </div>
  );
}

function BidderTag({ bidder }) {
  if (!bidder?.name) {
    return <span className='text-paragraph-sm text-text-sub-500'>-</span>;
  }

  return (
    <span
      className={BIDDER_TAG_CLASS}
      title={`${bidder.name} ${formatProcurementAmount(bidder.amount)}`}
    >
      <span className='min-w-0 truncate text-[12px] font-medium leading-[18px] text-[#344054]'>
        {bidder.name}
      </span>
      <span className='shrink-0 text-paragraph-sm font-bold tracking-[-0.084px] text-text-sub-500'>
        {formatProcurementAmount(bidder.amount)}
      </span>
    </span>
  );
}

function PackageStatusBadge({ status }) {
  const meta = PROJECT_PROCUREMENT_PACKAGE_STATUS_META[status];
  if (!meta) {
    return <span className='text-paragraph-sm text-text-sub-500'>-</span>;
  }

  return (
    <Badge.Root size='medium' variant='light' color={meta.color} className='uppercase'>
      {meta.label}
    </Badge.Root>
  );
}

function TextCell({ value, strong = false }) {
  return (
    <span
      className={cn(
        'block truncate text-paragraph-sm tracking-[-0.084px]',
        strong ? 'font-medium text-text-main-900' : 'text-text-sub-500',
      )}
      title={value != null && value !== '' ? String(value) : undefined}
    >
      {value ?? '-'}
    </span>
  );
}

const ProjectProcurementPackagesTable = memo(
  ({ rows = [], columnConfig, className, onRowClick }) => {
    const [sorting, setSorting] = useState([]);

    const allColumns = useMemo(
      () => [
        {
          id: 'name',
          accessorKey: 'name',
          columnLabel: 'Package Name',
          enableHiding: false,
          header: ({ column }) => <SortableColumnHeader column={column} label='Package Name' />,
          cell: ({ row }) => <TextCell value={row.original.name} strong />,
          meta: {
            headClassName: cn(PROJECT_PROCUREMENT_PACKAGES_COLUMN_WIDTHS.name, 'whitespace-nowrap'),
          },
        },
        {
          id: 'code',
          accessorKey: 'code',
          columnLabel: 'Code',
          header: ({ column }) => <SortableColumnHeader column={column} label='Code' />,
          cell: ({ row }) => <TextCell value={row.original.code} />,
          meta: {
            headClassName: cn(PROJECT_PROCUREMENT_PACKAGES_COLUMN_WIDTHS.code, 'whitespace-nowrap'),
          },
        },
        {
          id: 'categories',
          accessorFn: (row) => (row.categories ?? []).join(', '),
          columnLabel: 'Category',
          header: ({ column }) => <SortableColumnHeader column={column} label='Category' />,
          cell: ({ row }) => <CategoryTags categories={row.original.categories} />,
          meta: {
            headClassName: PROJECT_PROCUREMENT_PACKAGES_COLUMN_WIDTHS.categories,
            cellClassName: 'py-2',
          },
        },
        {
          id: 'itemCount',
          accessorKey: 'itemCount',
          columnLabel: 'Items',
          header: ({ column }) => <SortableColumnHeader column={column} label='Items' />,
          cell: ({ row }) => <TextCell value={row.original.itemCount} />,
          meta: {
            headClassName: cn(
              PROJECT_PROCUREMENT_PACKAGES_COLUMN_WIDTHS.itemCount,
              'whitespace-nowrap',
            ),
          },
        },
        {
          id: 'packageValue',
          accessorKey: 'packageValue',
          columnLabel: 'Package Value',
          header: ({ column }) => <SortableColumnHeader column={column} label='Package Value' />,
          cell: ({ row }) => (
            <TextCell value={formatProcurementAmount(row.original.packageValue)} />
          ),
          meta: {
            headClassName: cn(
              PROJECT_PROCUREMENT_PACKAGES_COLUMN_WIDTHS.packageValue,
              'whitespace-nowrap',
            ),
          },
        },
        {
          id: 'invitedCount',
          accessorKey: 'invitedCount',
          columnLabel: 'Invited',
          header: ({ column }) => <SortableColumnHeader column={column} label='Invited' />,
          cell: ({ row }) => <TextCell value={row.original.invitedCount} />,
          meta: {
            headClassName: cn(
              PROJECT_PROCUREMENT_PACKAGES_COLUMN_WIDTHS.invitedCount,
              'whitespace-nowrap',
            ),
          },
        },
        {
          id: 'quotes',
          accessorFn: (row) => `${row.quotesReceived ?? 0}/${row.quotesInvited ?? 0}`,
          columnLabel: 'Quotes',
          header: ({ column }) => <SortableColumnHeader column={column} label='Quotes' />,
          cell: ({ row }) => (
            <TextCell
              value={`${row.original.quotesReceived ?? 0}/${row.original.quotesInvited ?? 0}`}
            />
          ),
          meta: {
            headClassName: cn(
              PROJECT_PROCUREMENT_PACKAGES_COLUMN_WIDTHS.quotes,
              'whitespace-nowrap',
            ),
          },
        },
        {
          id: 'lowestBidder',
          accessorFn: (row) => row.lowestBidder?.name ?? '',
          columnLabel: 'Lowest Bidder',
          header: ({ column }) => <SortableColumnHeader column={column} label='Lowest Bidder' />,
          cell: ({ row }) => <BidderTag bidder={row.original.lowestBidder} />,
          meta: {
            headClassName: PROJECT_PROCUREMENT_PACKAGES_COLUMN_WIDTHS.lowestBidder,
            cellClassName: 'py-2',
          },
        },
        {
          id: 'status',
          accessorKey: 'status',
          columnLabel: 'Status',
          header: ({ column }) => <SortableColumnHeader column={column} label='Status' />,
          cell: ({ row }) => <PackageStatusBadge status={row.original.status} />,
          meta: {
            headClassName: cn(
              PROJECT_PROCUREMENT_PACKAGES_COLUMN_WIDTHS.status,
              'whitespace-nowrap',
            ),
          },
        },
        {
          id: 'lastUpdated',
          accessorKey: 'lastUpdated',
          columnLabel: 'Last Updated',
          header: ({ column }) => <SortableColumnHeader column={column} label='Last Updated' />,
          cell: ({ row }) => <TextCell value={row.original.lastUpdated || '-'} />,
          meta: {
            headClassName: cn(
              PROJECT_PROCUREMENT_PACKAGES_COLUMN_WIDTHS.lastUpdated,
              'whitespace-nowrap',
            ),
          },
        },
      ],
      [],
    );

    const visibleColumns = useMemo(
      () => applyColumnConfig(allColumns, columnConfig?.columns, undefined, 'name'),
      [allColumns, columnConfig?.columns],
    );

    const tableMinWidth = useMemo(() => {
      const widths = visibleColumns.map((column) => {
        const className = column.meta?.headClassName ?? '';
        const match = String(className).match(/min-w-\[(\d+)px]/);
        return match ? Number.parseInt(match[1], 10) : 140;
      });
      return widths.reduce((sum, width) => sum + width, 0);
    }, [visibleColumns]);

    const table = useReactTable({
      data: rows,
      columns: visibleColumns,
      state: { sorting },
      onSortingChange: setSorting,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
    });

    const hasRows = table.getRowModel().rows.length > 0;

    if (!hasRows) {
      return (
        <div
          className={cn(
            'flex min-h-[240px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center',
            className,
          )}
        >
          <p className='text-label-md text-text-strong-950'>No packages found</p>
          <p className='mt-1 text-paragraph-sm text-text-sub-500'>
            Adjust your search or filters to see results.
          </p>
        </div>
      );
    }

    return (
      <div
        className={cn(
          'min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain',
          className,
        )}
      >
        <Table.Root variant='compact' style={{ minWidth: tableMinWidth }}>
          <Table.Header>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Head
                    key={header.id}
                    className={header.column.columnDef.meta?.headClassName}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </Table.Head>
                ))}
              </Table.Row>
            ))}
          </Table.Header>

          <Table.Body spacing={4}>
            {table.getRowModel().rows.map((row) => (
              <React.Fragment key={row.id}>
                <Table.Row
                  className={cn(onRowClick && 'cursor-pointer')}
                  onClick={() => onRowClick?.(row.original)}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(event) => {
                    if (!onRowClick) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onRowClick(row.original);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <Table.Cell key={cell.id} className={cell.column.columnDef.meta?.cellClassName}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Cell>
                  ))}
                </Table.Row>
                <Table.RowDivider dividerClassName='bg-transparent' />
              </React.Fragment>
            ))}
          </Table.Body>
        </Table.Root>
      </div>
    );
  },
);

ProjectProcurementPackagesTable.displayName = 'ProjectProcurementPackagesTable';

export default ProjectProcurementPackagesTable;
