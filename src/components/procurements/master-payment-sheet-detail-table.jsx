import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import { MASTER_PAYMENT_SHEET_DETAIL_COLUMN_WIDTHS } from '@/components/procurements/constants';
import ProjectProcurementPaymentTag from '@/components/procurements/project-procurement-payment-tag';
import { formatProcurementAmount } from '@/components/procurements/project-procurements-utils';
import { formatProjectCell } from '@/components/projects/shared';
import * as Table from '@/components/ui/table';
import { applyColumnConfig } from '@/lib/column-utils';
import { cn } from '@/utils/cn';

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

function TextCell({ value, strong = false, className }) {
  return (
    <span
      className={cn(
        'block truncate text-paragraph-sm whitespace-nowrap',
        strong ? 'font-medium text-text-main-900' : 'font-normal text-text-sub-500',
        className,
      )}
    >
      {formatProjectCell(value)}
    </span>
  );
}

const AMOUNT_TONE_CLASS = {
  paid: 'text-primary-dark',
  pending: 'text-[#b47818]',
  default: 'text-text-sub-500',
};

function AmountCell({ value, tone = 'default' }) {
  const toneClassName = AMOUNT_TONE_CLASS[tone] ?? AMOUNT_TONE_CLASS.default;

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return <TextCell value='—' />;
  if (numeric === 0) return <TextCell value='₹0' className={toneClassName} />;
  return <TextCell value={formatProcurementAmount(value)} className={toneClassName} />;
}

function formatDisplayPercent(value) {
  if (!Number.isFinite(value)) return '';
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

function AmountPercentDisplay({ amountLabel, percentLabel }) {
  return (
    <div className='flex items-center'>
      <div className='flex h-8 min-w-[134px] items-center gap-1.5 rounded-l-lg border border-stroke-soft-200 bg-bg-white-0 pl-2 pr-1.5 py-1.5 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
        <span className='min-w-0 flex-1 truncate text-paragraph-sm text-text-sub-500'>
          {amountLabel}
        </span>
        <span className='shrink-0 text-[12px] font-medium uppercase tracking-[0.48px] text-text-soft-400'>
          ₹
        </span>
      </div>
      <div className='-ml-px flex h-8 w-[65px] items-center gap-1.5 rounded-r-lg border border-stroke-soft-200 bg-[rgba(246,248,250,0.4)] pl-2 pr-1.5 py-1.5 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
        <span className='min-w-0 flex-1 truncate text-paragraph-sm text-text-sub-500'>
          {percentLabel}
        </span>
        <span className='shrink-0 text-[12px] font-medium uppercase tracking-[0.48px] text-text-soft-400'>
          %
        </span>
      </div>
    </div>
  );
}

function RequestedAmtCell({ amount, percent, poValue }) {
  const amountNum = Number(amount);
  const base = Number(poValue) || 0;
  const percentNum = Number(percent);
  const resolvedPercent = Number.isFinite(percentNum)
    ? percentNum
    : Number.isFinite(amountNum) && base > 0
      ? Math.min(100, (amountNum / base) * 100)
      : null;

  const amountLabel = Number.isFinite(amountNum)
    ? amountNum === 0
      ? '0'
      : formatProcurementAmount(amountNum).replace(/^₹\s?/, '')
    : '—';

  return (
    <AmountPercentDisplay
      amountLabel={amountLabel}
      percentLabel={resolvedPercent != null ? formatDisplayPercent(resolvedPercent) : '—'}
    />
  );
}

const AllocatedAmtInputCell = React.memo(({ amount, percent, onAmountChange, onPercentChange }) => {
  return (
    <div className='flex items-center'>
      <div className='flex h-8 min-w-[134px] items-center gap-1.5 rounded-l-lg border border-stroke-soft-200 bg-bg-white-0 pl-2 pr-1.5 py-1.5 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
        <input
          type='text'
          inputMode='decimal'
          value={amount ?? ''}
          onChange={(event) => onAmountChange?.(event.target.value)}
          placeholder='Amount'
          className='min-w-0 flex-1 bg-transparent text-paragraph-sm text-text-sub-500 outline-none placeholder:text-text-soft-400'
        />
        <span className='shrink-0 text-[12px] font-medium uppercase tracking-[0.48px] text-text-soft-400'>
          ₹
        </span>
      </div>
      <div className='-ml-px flex h-8 w-[65px] items-center gap-1.5 rounded-r-lg border border-stroke-soft-200 bg-[rgba(246,248,250,0.4)] pl-2 pr-1.5 py-1.5 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
        <input
          type='text'
          inputMode='decimal'
          value={percent ?? ''}
          onChange={(event) => onPercentChange?.(event.target.value)}
          placeholder='0'
          className='min-w-0 flex-1 bg-transparent text-paragraph-sm text-text-sub-500 outline-none placeholder:text-text-soft-400'
        />
        <span className='shrink-0 text-[12px] font-medium uppercase tracking-[0.48px] text-text-soft-400'>
          %
        </span>
      </div>
    </div>
  );
});

AllocatedAmtInputCell.displayName = 'AllocatedAmtInputCell';

function FooterStatBadge({ label, value }) {
  return (
    <div className='rounded-[4px] border border-stroke-soft-200 bg-bg-weak-100 px-[7px] py-[5px]'>
      <div className='flex items-center gap-1 whitespace-nowrap leading-none'>
        <span className='text-[9px] font-bold uppercase tracking-[0.72px] text-text-soft-400'>
          {label}
        </span>
        <span className='text-[12px] font-bold text-text-sub-500'>{value}</span>
      </div>
    </div>
  );
}

export default function MasterPaymentSheetDetailTable({
  rows = [],
  columnConfig = [],
  sorting: sortingFromParent = [],
  onSortingChange,
  totals = {},
  allocatedValues = {},
  onAllocatedChange,
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
        id: 'project',
        accessorKey: 'project',
        columnLabel: 'Project',
        enableHiding: false,
        header: ({ column }) => <SortableColumnHeader column={column} label='Project' />,
        cell: ({ row }) => (
          <TextCell value={row.original.project_name || row.original.project} strong />
        ),
        meta: {
          headClassName: cn(MASTER_PAYMENT_SHEET_DETAIL_COLUMN_WIDTHS.project, 'whitespace-nowrap'),
        },
      },
      {
        id: 'vendor',
        accessorKey: 'vendor',
        columnLabel: 'Vendor',
        header: ({ column }) => <SortableColumnHeader column={column} label='Vendor' />,
        cell: ({ row }) => <TextCell value={row.original.vendor} />,
        meta: {
          headClassName: cn(MASTER_PAYMENT_SHEET_DETAIL_COLUMN_WIDTHS.vendor, 'whitespace-nowrap'),
        },
      },
      {
        id: 'category',
        accessorKey: 'category',
        columnLabel: 'Category',
        header: ({ column }) => <SortableColumnHeader column={column} label='Category' />,
        cell: ({ row }) => <ProjectProcurementPaymentTag value={row.original.category} />,
        meta: {
          headClassName: cn(
            MASTER_PAYMENT_SHEET_DETAIL_COLUMN_WIDTHS.category,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'po_no',
        accessorKey: 'po_no',
        columnLabel: 'PO No.',
        header: ({ column }) => <SortableColumnHeader column={column} label='PO No.' />,
        cell: ({ row }) => <TextCell value={row.original.po_no} />,
        meta: {
          headClassName: cn(MASTER_PAYMENT_SHEET_DETAIL_COLUMN_WIDTHS.po_no, 'whitespace-nowrap'),
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
            MASTER_PAYMENT_SHEET_DETAIL_COLUMN_WIDTHS.po_value,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'paid_amt',
        accessorKey: 'paid_amt',
        columnLabel: 'Paid Amt.',
        header: ({ column }) => <SortableColumnHeader column={column} label='Paid Amt.' />,
        cell: ({ row }) => <AmountCell value={row.original.paid_amt} tone='paid' />,
        meta: {
          headClassName: cn(
            MASTER_PAYMENT_SHEET_DETAIL_COLUMN_WIDTHS.paid_amt,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'pending_amt',
        accessorKey: 'pending_amt',
        columnLabel: 'Pending Amt.',
        header: ({ column }) => <SortableColumnHeader column={column} label='Pending Amt.' />,
        cell: ({ row }) => <AmountCell value={row.original.pending_amt} tone='pending' />,
        meta: {
          headClassName: cn(
            MASTER_PAYMENT_SHEET_DETAIL_COLUMN_WIDTHS.pending_amt,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'requested_amt',
        accessorKey: 'requested_amt',
        columnLabel: 'Requested Amt.',
        header: ({ column }) => <SortableColumnHeader column={column} label='Requested Amt.' />,
        cell: ({ row }) => (
          <RequestedAmtCell
            amount={row.original.requested_amt}
            percent={row.original.requested_pct}
            poValue={row.original.po_value}
          />
        ),
        meta: {
          headClassName: cn(
            MASTER_PAYMENT_SHEET_DETAIL_COLUMN_WIDTHS.requested_amt,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'allocated_amt',
        accessorKey: 'allocated_amt',
        columnLabel: 'Allocated Amt.',
        header: 'Allocated Amt.',
        cell: ({ row, table }) => {
          const { allocatedValues: values = {}, onAllocatedChange: onChange } =
            table.options.meta ?? {};
          const rowValues = values[row.original.id] ?? {};
          return (
            <AllocatedAmtInputCell
              amount={rowValues.amount ?? (row.original.allocated_amt || '')}
              percent={rowValues.percent ?? (row.original.allocated_pct || '')}
              onAmountChange={(value) => onChange?.(row.original.id, 'amount', value)}
              onPercentChange={(value) => onChange?.(row.original.id, 'percent', value)}
            />
          );
        },
        meta: {
          headClassName: cn(
            MASTER_PAYMENT_SHEET_DETAIL_COLUMN_WIDTHS.allocated_amt,
            'whitespace-nowrap',
          ),
        },
      },
      {
        id: 'remarks',
        accessorKey: 'remarks',
        columnLabel: 'Remarks',
        header: ({ column }) => <SortableColumnHeader column={column} label='Remarks' />,
        cell: ({ row }) => <TextCell value={row.original.remarks} />,
        meta: {
          headClassName: cn(MASTER_PAYMENT_SHEET_DETAIL_COLUMN_WIDTHS.remarks, 'whitespace-nowrap'),
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
    meta: { allocatedValues, onAllocatedChange },
  });

  if (!isLoading && rows.length === 0) {
    return (
      <div className='flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
        <p className='text-label-md text-text-strong-950'>No items found</p>
        <p className='mt-1 text-paragraph-sm text-text-sub-500'>
          Adjust your search or filters to see results.
        </p>
      </div>
    );
  }

  const hasRows = table.getRowModel().rows.length > 0;

  return (
    <div className='flex h-full min-h-0 flex-1 flex-col overflow-hidden'>
      <div className='min-h-0 flex-1 overflow-x-auto overflow-y-auto'>
        <Table.Root variant='compact' className='min-w-[1400px] overflow-visible'>
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
                <Table.Row>
                  {row.getVisibleCells().map((cell) => (
                    <Table.Cell key={cell.id} className={cell.column.columnDef.meta?.headClassName}>
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

      {hasRows && (
        <div className='flex shrink-0 items-center justify-between border-t border-stroke-soft-200 bg-[rgba(246,248,250,0.6)] px-3 py-3'>
          <span className='text-[14px] font-bold uppercase tracking-[0.84px] text-text-sub-500'>
            TOTAL
          </span>
          <div className='flex flex-wrap items-center justify-end gap-1.5 pr-4'>
            <FooterStatBadge label='budgeted' value={formatProcurementAmount(totals.budgeted)} />
            <FooterStatBadge
              label='Requested Amt.'
              value={formatProcurementAmount(totals.requested)}
            />
            <FooterStatBadge
              label='Allocated Amt.'
              value={formatProcurementAmount(totals.allocated)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
