import React, { useEffect, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { applyColumnConfig } from '@/lib/column-utils';
import {
  PROJECT_DETAIL_INLINE_CELL,
  PROJECT_DETAIL_TABLE_ROOT_CLASS,
} from '@/components/projects/shared/project-detail-table-layout';
import {
  projectDetailDateSortingFn,
  projectDetailNumericSortingFn,
} from '@/components/projects/shared/project-detail-table-sorting';
import * as Badge from '@/components/ui/badge';
import { Datepicker } from '@/components/ui/datepicker';
import * as Input from '@/components/ui/input';
import * as Table from '@/components/ui/table';
import { getSortingIcon } from '@/components/ui/table';
import * as Tag from '@/components/ui/tag';
import { PROJECT_DETAIL_COLLECTION_STATUS_META } from '@/components/projects/constants';
import { cn } from '@/utils/cn';
import { formatDateToYYYYMMDD, formatToDDMMYYYY, parseToDate } from '@/utils/date-utils';

const EMPTY = '-';

const COLLECTION_COLUMN_WIDTHS = {
  milestone: 'w-[150px]',
  boq_type: 'w-[110px]',
  invoice_no: 'w-[125px]',
  expected_invoice_date: 'w-[145px]',
  actual_invoice_date: 'w-[145px]',
  expected_payment_date: 'w-[140px]',
  actual_payment_date: 'w-[170px]',
  payment_commitment_date: 'w-[205px]',
  net_receivable: 'w-[155px]',
  received: 'w-[120px]',
  pay_percent: 'w-[95px]',
  boq_ref_value: 'w-[150px]',
  invoice_with_gst: 'w-[160px]',
  tds_percent: 'w-[95px]',
  tds_amount: 'w-[125px]',
  balance: 'w-[115px]',
  status: 'w-[110px]',
  remarks: 'w-[160px]',
};

function isEmptyValue(value) {
  return value == null || value === '' || value === '—';
}

function displayValue(value) {
  return isEmptyValue(value) ? EMPTY : value;
}

function formatDateCell(value) {
  if (isEmptyValue(value)) return EMPTY;
  try {
    const parsed = value instanceof Date ? value : parseISO(String(value));
    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }
    return format(parsed, 'do MMM yy');
  } catch {
    return String(value);
  }
}

function StopPropagation({ children, className }) {
  return (
    <div
      className={className}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

function CollectionColumnHeader({ column, label }) {
  const sortState = column?.getIsSorted?.();
  return (
    <div className='flex items-center gap-0.5 whitespace-nowrap'>
      <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>{label}</span>
      <button
        type='button'
        className='flex shrink-0 cursor-pointer items-center justify-center transition-colors hover:text-text-strong-950'
        onClick={() => column.toggleSorting?.(sortState === 'asc')}
        aria-label={`Sort by ${label} ${sortState === 'asc' ? 'descending' : 'ascending'}`}
      >
        {getSortingIcon(sortState)}
      </button>
    </div>
  );
}

function CollectionStatusBadge({ status }) {
  const meta = PROJECT_DETAIL_COLLECTION_STATUS_META[status] ?? {
    label: status?.toUpperCase?.() ?? EMPTY,
    color: 'gray',
  };

  return (
    <Badge.Root variant='light' color={meta.color} size='small' className='uppercase'>
      {meta.label}
    </Badge.Root>
  );
}

function PlainCell({ value }) {
  return (
    <span className='truncate whitespace-nowrap text-paragraph-sm text-text-sub-500'>
      {displayValue(value)}
    </span>
  );
}

function DateCell({ value }) {
  return <PlainCell value={formatDateCell(value)} />;
}

function EditableDateCell({ value, onChange }) {
  return (
    <StopPropagation className={PROJECT_DETAIL_INLINE_CELL}>
      <Datepicker
        value={parseToDate(value) ?? undefined}
        onChange={(date) => onChange?.(date ? formatDateToYYYYMMDD(date) : '')}
        placeholder='DD/MM/YY'
        formatDate={(date) => formatToDDMMYYYY(date)}
        size='xsmall'
        variant='borderless'
        className='w-full -ml-2'
      />
    </StopPropagation>
  );
}

function EditableRemarksCell({ value, onChange }) {
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  return (
    <StopPropagation className={PROJECT_DETAIL_INLINE_CELL}>
      <Input.Root size='xsmall' variant='borderless'>
        <Input.Wrapper>
          <Input.Input
            value={draft}
            placeholder='Enter remark'
            className='-ml-2'
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => {
              const next = draft.trim();
              const previous = String(value ?? '').trim();
              if (next !== previous) onChange?.(next);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
        </Input.Wrapper>
      </Input.Root>
    </StopPropagation>
  );
}

export default function ProjectDetailCollectionsSplitTable({
  rows = [],
  columnConfig = [],
  onRowClick,
  onUpdateMilestone,
}) {
  const allColumnDefs = useMemo(
    () => [
      {
        id: 'milestone',
        accessorKey: 'milestone',
        columnLabel: 'Milestone',
        header: ({ column }) => <CollectionColumnHeader column={column} label='Milestone' />,
        cell: ({ row }) => (
          <span className='truncate text-label-sm text-text-main-900'>
            {displayValue(row.original.milestone)}
          </span>
        ),
        meta: { headClassName: cn(COLLECTION_COLUMN_WIDTHS.milestone, 'whitespace-nowrap') },
      },
      {
        id: 'boq_type',
        accessorKey: 'boq_type',
        columnLabel: 'BOQ Type',
        header: ({ column }) => <CollectionColumnHeader column={column} label='BOQ Type' />,
        cell: ({ row }) =>
          isEmptyValue(row.original.boq_type) ? (
            <PlainCell value={EMPTY} />
          ) : (
            <Tag.Root variant='stroke' className='h-5 rounded-full px-2 whitespace-nowrap'>
              {row.original.boq_type}
            </Tag.Root>
          ),
        meta: { headClassName: cn(COLLECTION_COLUMN_WIDTHS.boq_type, 'whitespace-nowrap') },
      },
      {
        id: 'invoice_no',
        accessorKey: 'invoice_no',
        columnLabel: 'Invoice No.',
        header: ({ column }) => <CollectionColumnHeader column={column} label='Invoice No.' />,
        cell: ({ row }) =>
          isEmptyValue(row.original.invoice_no) ? (
            <PlainCell value={EMPTY} />
          ) : (
            <span className='truncate whitespace-nowrap text-paragraph-sm text-text-sub-500 underline decoration-stroke-sub-300 underline-offset-2'>
              {row.original.invoice_no}
            </span>
          ),
        meta: { headClassName: cn(COLLECTION_COLUMN_WIDTHS.invoice_no, 'whitespace-nowrap') },
      },
      {
        id: 'expected_invoice_date',
        accessorKey: 'expected_invoice_date',
        sortingFn: projectDetailDateSortingFn,
        columnLabel: 'Exp. Inv. Date',
        header: ({ column }) => <CollectionColumnHeader column={column} label='Exp. Inv. Date' />,
        cell: ({ row }) => (
          <EditableDateCell
            value={row.original.expected_invoice_date}
            onChange={(next) => onUpdateMilestone?.(row.original, { expected_invoice_date: next })}
          />
        ),
        meta: {
          headClassName: cn(COLLECTION_COLUMN_WIDTHS.expected_invoice_date, 'whitespace-nowrap'),
        },
      },
      {
        id: 'actual_invoice_date',
        accessorKey: 'actual_invoice_date',
        sortingFn: projectDetailDateSortingFn,
        columnLabel: 'Actual Inv. Date',
        header: ({ column }) => <CollectionColumnHeader column={column} label='Actual Inv. Date' />,
        cell: ({ row }) => <DateCell value={row.original.actual_invoice_date} />,
        meta: {
          headClassName: cn(COLLECTION_COLUMN_WIDTHS.actual_invoice_date, 'whitespace-nowrap'),
        },
      },
      {
        id: 'expected_payment_date',
        accessorKey: 'expected_payment_date',
        sortingFn: projectDetailDateSortingFn,
        columnLabel: 'Exp. Pay Date',
        header: ({ column }) => <CollectionColumnHeader column={column} label='Exp. Pay Date' />,
        cell: ({ row }) => (
          <EditableDateCell
            value={row.original.expected_payment_date}
            onChange={(next) => onUpdateMilestone?.(row.original, { expected_payment_date: next })}
          />
        ),
        meta: {
          headClassName: cn(COLLECTION_COLUMN_WIDTHS.expected_payment_date, 'whitespace-nowrap'),
        },
      },
      {
        id: 'actual_payment_date',
        accessorKey: 'actual_payment_date',
        sortingFn: projectDetailDateSortingFn,
        columnLabel: 'Actual Payment Date',
        header: ({ column }) => (
          <CollectionColumnHeader column={column} label='Actual Payment Date' />
        ),
        cell: ({ row }) => <DateCell value={row.original.actual_payment_date} />,
        meta: {
          headClassName: cn(COLLECTION_COLUMN_WIDTHS.actual_payment_date, 'whitespace-nowrap'),
        },
      },
      {
        id: 'payment_commitment_date',
        accessorKey: 'payment_commitment_date',
        sortingFn: projectDetailDateSortingFn,
        columnLabel: 'Payment Commitment Date',
        header: ({ column }) => (
          <CollectionColumnHeader column={column} label='Payment Commitment Date' />
        ),
        cell: ({ row }) => <DateCell value={row.original.payment_commitment_date} />,
        meta: {
          headClassName: cn(COLLECTION_COLUMN_WIDTHS.payment_commitment_date, 'whitespace-nowrap'),
        },
      },
      {
        id: 'net_receivable',
        accessorKey: 'net_receivable_raw',
        sortingFn: projectDetailNumericSortingFn,
        columnLabel: 'Net Receivable (₹)',
        header: ({ column }) => (
          <CollectionColumnHeader column={column} label='Net Receivable (₹)' />
        ),
        cell: ({ row }) => <PlainCell value={row.original.net_receivable} />,
        meta: { headClassName: cn(COLLECTION_COLUMN_WIDTHS.net_receivable, 'whitespace-nowrap') },
      },
      {
        id: 'received',
        accessorKey: 'received_raw',
        sortingFn: projectDetailNumericSortingFn,
        columnLabel: 'Received (₹)',
        header: ({ column }) => <CollectionColumnHeader column={column} label='Received (₹)' />,
        cell: ({ row }) => <PlainCell value={row.original.received} />,
        meta: { headClassName: cn(COLLECTION_COLUMN_WIDTHS.received, 'whitespace-nowrap') },
      },
      {
        id: 'pay_percent',
        accessorKey: 'pay_percent',
        sortingFn: projectDetailNumericSortingFn,
        columnLabel: 'Pay (%)',
        header: ({ column }) => <CollectionColumnHeader column={column} label='Pay (%)' />,
        cell: ({ row }) => <PlainCell value={row.original.pay_percent} />,
        meta: { headClassName: cn(COLLECTION_COLUMN_WIDTHS.pay_percent, 'whitespace-nowrap') },
      },
      {
        id: 'boq_ref_value',
        accessorKey: 'boq_ref_value_raw',
        sortingFn: projectDetailNumericSortingFn,
        columnLabel: 'BOQ Ref. Val. (₹)',
        header: ({ column }) => (
          <CollectionColumnHeader column={column} label='BOQ Ref. Val. (₹)' />
        ),
        cell: ({ row }) => <PlainCell value={row.original.boq_ref_value} />,
        meta: { headClassName: cn(COLLECTION_COLUMN_WIDTHS.boq_ref_value, 'whitespace-nowrap') },
      },
      {
        id: 'invoice_with_gst',
        accessorKey: 'invoice_with_gst_raw',
        sortingFn: projectDetailNumericSortingFn,
        columnLabel: 'Inv. (with GST) (₹)',
        header: ({ column }) => (
          <CollectionColumnHeader column={column} label='Inv. (with GST) (₹)' />
        ),
        cell: ({ row }) => <PlainCell value={row.original.invoice_with_gst} />,
        meta: { headClassName: cn(COLLECTION_COLUMN_WIDTHS.invoice_with_gst, 'whitespace-nowrap') },
      },
      {
        id: 'tds_percent',
        accessorKey: 'tds_percent',
        sortingFn: projectDetailNumericSortingFn,
        columnLabel: 'TDS (%)',
        header: ({ column }) => <CollectionColumnHeader column={column} label='TDS (%)' />,
        cell: ({ row }) => <PlainCell value={row.original.tds_percent} />,
        meta: { headClassName: cn(COLLECTION_COLUMN_WIDTHS.tds_percent, 'whitespace-nowrap') },
      },
      {
        id: 'tds_amount',
        accessorKey: 'tds_amount_raw',
        sortingFn: projectDetailNumericSortingFn,
        columnLabel: 'TDS Amt. (₹)',
        header: ({ column }) => <CollectionColumnHeader column={column} label='TDS Amt. (₹)' />,
        cell: ({ row }) => <PlainCell value={row.original.tds_amount} />,
        meta: { headClassName: cn(COLLECTION_COLUMN_WIDTHS.tds_amount, 'whitespace-nowrap') },
      },
      {
        id: 'balance',
        accessorKey: 'balance_raw',
        sortingFn: projectDetailNumericSortingFn,
        columnLabel: 'Balance (₹)',
        header: ({ column }) => <CollectionColumnHeader column={column} label='Balance (₹)' />,
        cell: ({ row }) => <PlainCell value={row.original.balance} />,
        meta: { headClassName: cn(COLLECTION_COLUMN_WIDTHS.balance, 'whitespace-nowrap') },
      },
      {
        id: 'status',
        accessorKey: 'status',
        columnLabel: 'Status',
        header: ({ column }) => <CollectionColumnHeader column={column} label='Status' />,
        cell: ({ row }) => <CollectionStatusBadge status={row.original.status} />,
        meta: { headClassName: cn(COLLECTION_COLUMN_WIDTHS.status, 'whitespace-nowrap') },
      },
      {
        id: 'remarks',
        accessorKey: 'remarks',
        columnLabel: 'Remarks',
        header: ({ column }) => <CollectionColumnHeader column={column} label='Remarks' />,
        cell: ({ row }) => (
          <EditableRemarksCell
            value={row.original.remarks}
            onChange={(next) => onUpdateMilestone?.(row.original, { remarks: next })}
          />
        ),
        meta: { headClassName: cn(COLLECTION_COLUMN_WIDTHS.remarks, 'whitespace-nowrap') },
      },
    ],
    [onUpdateMilestone],
  );

  const columns = useMemo(
    () => applyColumnConfig(allColumnDefs, columnConfig),
    [allColumnDefs, columnConfig],
  );

  const [sorting, setSorting] = useState([]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Table.Root variant='compact' className={PROJECT_DETAIL_TABLE_ROOT_CLASS}>
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
              className='cursor-pointer'
              onClick={() => onRowClick?.(row.original)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onRowClick?.(row.original);
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <Table.Cell key={cell.id} className={cell.column.columnDef.meta?.cellClassName}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Table.Cell>
              ))}
            </Table.Row>
            <Table.RowDivider />
          </React.Fragment>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
