import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import { PROJECT_PROCUREMENT_VENDORS_COLUMN_WIDTHS } from '@/components/procurements/constants';
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

function VendorTypeTag({ value }) {
  if (!value) return <span className='text-paragraph-sm text-text-soft-400'>—</span>;

  return (
    <span className='inline-flex items-center justify-center rounded-[6px] border border-[#d0d5dd] bg-white px-2 py-[3px] text-[12px] font-medium leading-[18px] text-[#344054]'>
      {value}
    </span>
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

function CountCell({ value }) {
  const numeric = Number(value);
  const display = Number.isFinite(numeric) ? String(numeric) : '—';
  return <TextCell value={display} />;
}

function AmountCell({ value, tone = 'default' }) {
  return <TextCell value={formatProcurementAmount(value)} tone={tone} />;
}

export default function ProjectProcurementVendorsTable({
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
        id: 'vendor_name',
        accessorKey: 'vendor_name',
        columnLabel: 'Vendor Name',
        enableHiding: false,
        header: ({ column }) => <SortableColumnHeader column={column} label='Vendor Name' />,
        cell: ({ row }) => <TextCell value={row.original.vendor_name} strong />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_VENDORS_COLUMN_WIDTHS.vendor_name,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'type',
        accessorKey: 'type',
        columnLabel: 'Type',
        header: ({ column }) => <SortableColumnHeader column={column} label='Type' />,
        cell: ({ row }) => <VendorTypeTag value={row.original.type} />,
        meta: {
          headClassName: cn(PROJECT_PROCUREMENT_VENDORS_COLUMN_WIDTHS.type, 'whitespace-nowrap'),
        },
      },
      {
        id: 'packages',
        accessorKey: 'packages',
        columnLabel: 'Packages',
        header: ({ column }) => <SortableColumnHeader column={column} label='Packages' />,
        cell: ({ row }) => <CountCell value={row.original.packages} />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_VENDORS_COLUMN_WIDTHS.packages,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'quotes',
        accessorKey: 'quotes',
        columnLabel: 'Quotes',
        header: ({ column }) => <SortableColumnHeader column={column} label='Quotes' />,
        cell: ({ row }) => <CountCell value={row.original.quotes} />,
        meta: {
          headClassName: cn(PROJECT_PROCUREMENT_VENDORS_COLUMN_WIDTHS.quotes, 'whitespace-nowrap'),
        },
      },
      {
        id: 'pos',
        accessorKey: 'pos',
        columnLabel: 'POS',
        header: ({ column }) => <SortableColumnHeader column={column} label='POS' />,
        cell: ({ row }) => <CountCell value={row.original.pos} />,
        meta: {
          headClassName: cn(PROJECT_PROCUREMENT_VENDORS_COLUMN_WIDTHS.pos, 'whitespace-nowrap'),
        },
      },
      {
        id: 'quote_value',
        accessorKey: 'quote_value',
        columnLabel: 'Quote Value',
        header: ({ column }) => <SortableColumnHeader column={column} label='Quote Value' />,
        cell: ({ row }) => <AmountCell value={row.original.quote_value} />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_VENDORS_COLUMN_WIDTHS.quote_value,
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
            PROJECT_PROCUREMENT_VENDORS_COLUMN_WIDTHS.po_value,
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
            PROJECT_PROCUREMENT_VENDORS_COLUMN_WIDTHS.paid_amt,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'pending_amt',
        accessorKey: 'pending_amt',
        columnLabel: 'Pending Amt.',
        header: ({ column }) => <SortableColumnHeader column={column} label='Pending Amt.' />,
        cell: ({ row }) => <AmountCell value={row.original.pending_amt} />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_VENDORS_COLUMN_WIDTHS.pending_amt,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'last_updated',
        accessorKey: 'last_updated',
        columnLabel: 'Last Updated',
        header: ({ column }) => <SortableColumnHeader column={column} label='Last Updated' />,
        cell: ({ row }) => <TextCell value={formatDateDisplay(row.original.last_updated, '—')} />,
        meta: {
          headClassName: cn(
            PROJECT_PROCUREMENT_VENDORS_COLUMN_WIDTHS.last_updated,
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
        <p className='text-label-md text-text-strong-950'>No vendors found</p>
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
