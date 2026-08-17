import React, { useCallback, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as Avatar from '@/components/ui/avatar';
import * as Table from '@/components/ui/table';
import * as Tag from '@/components/ui/tag';
import { applyColumnConfig } from '@/lib/column-utils';
import { formatProjectCell } from '@/components/projects/shared';
import {
  PROJECT_DETAIL_BILLING_QC_COLUMN_WIDTHS,
  PROJECT_DETAIL_BILLING_QC_STATUS_META,
} from '@/components/projects/constants';
import { cn } from '@/utils/cn';

function StaticColumnHeader({ label }) {
  return (
    <div className='flex items-center gap-0.5'>
      <span className='text-paragraph-sm whitespace-nowrap text-text-soft-400'>{label}</span>
    </div>
  );
}

function SortableColumnHeader({ column, label }) {
  const sortState = column.getIsSorted();
  return (
    <div className='flex items-center gap-0.5'>
      <span className='text-paragraph-sm font-medium whitespace-nowrap text-text-soft-400'>
        {label}
      </span>
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

function BillingQcStatusBadge({ status }) {
  const meta = PROJECT_DETAIL_BILLING_QC_STATUS_META[status] ?? {
    label: String(status ?? '—').toUpperCase(),
    className: 'bg-bg-weak-100 text-text-sub-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-[0.22px] uppercase',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}

function CertifiedByCell({ certifiedBy }) {
  if (!certifiedBy?.name) {
    return <TextCell value='—' />;
  }

  return (
    <div className='flex min-w-0 items-center gap-3'>
      <Avatar.Root size='24' color={certifiedBy.color ?? 'gray'}>
        {certifiedBy.initials}
      </Avatar.Root>
      <span className='truncate text-paragraph-sm text-text-sub-500'>{certifiedBy.name}</span>
    </div>
  );
}

function PackageTagsCell({ packages = [] }) {
  if (packages.length === 0) {
    return <TextCell value='—' />;
  }

  const visiblePackages = packages.slice(0, 2);
  const remainingCount = packages.length - visiblePackages.length;

  return (
    <div className='flex min-w-0 flex-nowrap items-center gap-1'>
      {visiblePackages.map((pkg) => (
        <Tag.Root
          key={pkg}
          variant='stroke'
          className='h-5 max-w-[96px] shrink-0 rounded-md border-[#d0d5dd] px-1.5 py-0 text-[11px] font-medium leading-5 text-[#344054]'
        >
          <span className='block truncate'>{pkg}</span>
        </Tag.Root>
      ))}
      {remainingCount > 0 ? (
        <Tag.Root
          variant='stroke'
          className='h-5 shrink-0 rounded-md border-[#d0d5dd] px-1.5 py-0 text-[11px] font-medium leading-5 text-[#344054]'
        >
          +{remainingCount}
        </Tag.Root>
      ) : null}
    </div>
  );
}

export default function ProjectDetailBillingQcTable({ rows = [], columnConfig = [], onRowClick }) {
  const [sorting, setSorting] = useState([]);

  const allColumnDefs = useMemo(
    () => [
      {
        id: 'vendor_name',
        accessorKey: 'vendor_name',
        columnLabel: 'Vendor Name',
        enableHiding: false,
        header: () => <StaticColumnHeader label='Vendor Name' />,
        cell: ({ row }) => (
          <span className='truncate text-label-sm font-medium text-text-main-900'>
            {row.original.vendor_name}
          </span>
        ),
        enableSorting: false,
        meta: {
          headClassName: cn(
            PROJECT_DETAIL_BILLING_QC_COLUMN_WIDTHS.vendor_name,
            'whitespace-nowrap',
          ),
          cellClassName: cn(PROJECT_DETAIL_BILLING_QC_COLUMN_WIDTHS.vendor_name),
        },
      },
      {
        id: 'package',
        accessorKey: 'packages',
        columnLabel: 'Package',
        header: ({ column }) => <SortableColumnHeader column={column} label='Package' />,
        cell: ({ row }) => <PackageTagsCell packages={row.original.packages} />,
        meta: {
          headClassName: cn(PROJECT_DETAIL_BILLING_QC_COLUMN_WIDTHS.package, 'whitespace-nowrap'),
          cellClassName: cn(PROJECT_DETAIL_BILLING_QC_COLUMN_WIDTHS.package),
        },
      },
      {
        id: 'submission_date',
        accessorKey: 'submission_date',
        columnLabel: 'Submission Date',
        header: ({ column }) => <SortableColumnHeader column={column} label='Submission Date' />,
        cell: ({ row }) => <TextCell value={row.original.submission_date} />,
        meta: {
          headClassName: cn(
            PROJECT_DETAIL_BILLING_QC_COLUMN_WIDTHS.submission_date,
            'whitespace-nowrap',
          ),
          cellClassName: cn(PROJECT_DETAIL_BILLING_QC_COLUMN_WIDTHS.submission_date),
        },
      },
      {
        id: 'area',
        accessorKey: 'area',
        columnLabel: 'Area',
        header: ({ column }) => <SortableColumnHeader column={column} label='Area' />,
        cell: ({ row }) => <TextCell value={row.original.area} />,
        meta: {
          headClassName: cn(PROJECT_DETAIL_BILLING_QC_COLUMN_WIDTHS.area, 'whitespace-nowrap'),
          cellClassName: cn(PROJECT_DETAIL_BILLING_QC_COLUMN_WIDTHS.area),
        },
      },
      {
        id: 'certified_by',
        accessorKey: 'certified_by',
        columnLabel: 'Certified By',
        header: ({ column }) => <SortableColumnHeader column={column} label='Certified By' />,
        cell: ({ row }) => <CertifiedByCell certifiedBy={row.original.certified_by} />,
        meta: {
          headClassName: cn(
            PROJECT_DETAIL_BILLING_QC_COLUMN_WIDTHS.certified_by,
            'whitespace-nowrap',
          ),
          cellClassName: cn(PROJECT_DETAIL_BILLING_QC_COLUMN_WIDTHS.certified_by),
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        columnLabel: 'Status',
        header: ({ column }) => <SortableColumnHeader column={column} label='Status' />,
        cell: ({ row }) => <BillingQcStatusBadge status={row.original.status} />,
        meta: {
          headClassName: cn(PROJECT_DETAIL_BILLING_QC_COLUMN_WIDTHS.status, 'whitespace-nowrap'),
          cellClassName: cn(PROJECT_DETAIL_BILLING_QC_COLUMN_WIDTHS.status),
        },
      },
      {
        id: 'last_updated',
        accessorKey: 'last_updated',
        columnLabel: 'Last Updated',
        header: ({ column }) => <SortableColumnHeader column={column} label='Last Updated' />,
        cell: ({ row }) => <TextCell value={row.original.last_updated} />,
        meta: {
          headClassName: cn(
            PROJECT_DETAIL_BILLING_QC_COLUMN_WIDTHS.last_updated,
            'whitespace-nowrap',
          ),
          cellClassName: cn(PROJECT_DETAIL_BILLING_QC_COLUMN_WIDTHS.last_updated),
        },
      },
      {
        id: 'po_value',
        accessorKey: 'po_value',
        columnLabel: 'PO Value',
        header: ({ column }) => <SortableColumnHeader column={column} label='PO Value' />,
        cell: ({ row }) => <TextCell value={row.original.po_value} />,
        meta: {
          headClassName: cn(PROJECT_DETAIL_BILLING_QC_COLUMN_WIDTHS.po_value, 'whitespace-nowrap'),
          cellClassName: cn(PROJECT_DETAIL_BILLING_QC_COLUMN_WIDTHS.po_value),
        },
      },
      {
        id: 'gmr_value',
        accessorKey: 'gmr_value',
        columnLabel: 'GMR Value',
        header: ({ column }) => <SortableColumnHeader column={column} label='GMR Value' />,
        cell: ({ row }) => <TextCell value={row.original.gmr_value} />,
        meta: {
          headClassName: cn(PROJECT_DETAIL_BILLING_QC_COLUMN_WIDTHS.gmr_value, 'whitespace-nowrap'),
          cellClassName: cn(PROJECT_DETAIL_BILLING_QC_COLUMN_WIDTHS.gmr_value),
        },
      },
    ],
    [],
  );

  const columns = useMemo(
    () => applyColumnConfig(allColumnDefs, columnConfig),
    [allColumnDefs, columnConfig],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleRowClick = useCallback(
    (row) => {
      onRowClick?.(row.original);
    },
    [onRowClick],
  );

  if (rows.length === 0) {
    return (
      <div className='flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
        <p className='text-label-md text-text-strong-950'>No billing & QC records found</p>
        <p className='mt-1 text-paragraph-sm text-text-sub-500'>
          Adjust your search to find vendor submissions.
        </p>
      </div>
    );
  }

  return (
    <div className='min-h-0 flex-1 overflow-x-auto overflow-y-auto'>
      <Table.Root variant='compact' className='min-w-[960px]'>
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
          {table.getRowModel().rows.map((row) => (
            <React.Fragment key={row.id}>
              <Table.Row
                className={cn(onRowClick && 'cursor-pointer hover:bg-bg-weak-50')}
                onClick={() => handleRowClick(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(event) => {
                  if (!onRowClick) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleRowClick(row);
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <Table.Cell
                    key={cell.id}
                    className={cn('min-h-8 py-2', cell.column.columnDef.meta?.cellClassName)}
                  >
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
}
