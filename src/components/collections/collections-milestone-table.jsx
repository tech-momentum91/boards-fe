import React, { useMemo } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import * as Badge from '@/components/ui/badge';
import * as Table from '@/components/ui/table';
import * as Tag from '@/components/ui/tag';
import { COLLECTION_PAYMENT_STATUS_META } from '@/collections/constants';
import { cn } from '@/utils/cn';

const EMPTY = '-';

function isEmptyValue(value) {
  return value == null || value === '' || value === '—';
}

function displayValue(value) {
  return isEmptyValue(value) ? EMPTY : value;
}

function MilestoneColumnHeader({ label }) {
  return <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>{label}</span>;
}

function PlainCell({ value }) {
  return (
    <span className='truncate whitespace-nowrap text-paragraph-sm text-text-sub-500'>
      {displayValue(value)}
    </span>
  );
}

function PaymentStatusBadge({ status }) {
  const meta = COLLECTION_PAYMENT_STATUS_META[status] ?? {
    label: status?.toUpperCase?.() ?? EMPTY,
    color: 'gray',
  };

  return (
    <Badge.Root variant='light' color={meta.color} size='small' className='uppercase'>
      {meta.label}
    </Badge.Root>
  );
}

const MILESTONE_COLUMNS = [
  { id: 'expected_invoice_date', label: 'Exp. Inv. Date', width: 'w-[130px]' },
  { id: 'actual_invoice_date', label: 'Actual Inv. Date', width: 'w-[140px]' },
  { id: 'expected_payment_date', label: 'Exp. Pay Date', width: 'w-[130px]' },
  { id: 'actual_payment_date', label: 'Actual Payment Date', width: 'w-[170px]' },
  { id: 'payment_commitment_date', label: 'Payment Commitment Date', width: 'w-[205px]' },
  { id: 'net_receivable', label: 'Net Receivable (₹)', width: 'w-[150px]' },
  { id: 'received', label: 'Received (₹)', width: 'w-[115px]' },
  { id: 'pay_percent', label: 'Pay (%)', width: 'w-[90px]' },
  { id: 'boq_ref_value', label: 'BOQ Ref. Val. (₹)', width: 'w-[145px]' },
  { id: 'invoice_with_gst', label: 'Inv. (with GST) (₹)', width: 'w-[155px]' },
  { id: 'tds_percent', label: 'TDS (%)', width: 'w-[90px]' },
  { id: 'tds_amount', label: 'TDS Amt. (₹)', width: 'w-[120px]' },
  { id: 'balance', label: 'Balance (₹)', width: 'w-[110px]' },
];

export default function CollectionsMilestoneTable({ milestones = [] }) {
  const columns = useMemo(
    () => [
      {
        id: 'milestone',
        accessorKey: 'milestone',
        header: () => <MilestoneColumnHeader label='Milestone' />,
        cell: ({ row }) => (
          <span className='truncate whitespace-nowrap pl-6 text-label-sm text-text-main-900'>
            {displayValue(row.original.milestone)}
          </span>
        ),
        meta: { headClassName: 'w-[159px]', cellClassName: 'w-[159px]' },
      },
      {
        id: 'boq_type',
        accessorKey: 'boq_type',
        header: () => <MilestoneColumnHeader label='BOQ Type' />,
        cell: ({ row }) =>
          isEmptyValue(row.original.boq_type) ? (
            <PlainCell value={EMPTY} />
          ) : (
            <Tag.Root
              variant='stroke'
              className={cn(
                'h-5 rounded-full px-2 whitespace-nowrap',
                row.original.boq_type === 'Additional' && 'border-warning-base text-warning-base',
              )}
            >
              {row.original.boq_type}
            </Tag.Root>
          ),
        meta: { headClassName: 'w-[113px]', cellClassName: 'w-[113px]' },
      },
      {
        id: 'invoice_no',
        accessorKey: 'invoice_no',
        header: () => <MilestoneColumnHeader label='Invoice No.' />,
        cell: ({ row }) =>
          isEmptyValue(row.original.invoice_no) ? (
            <PlainCell value={EMPTY} />
          ) : (
            <span className='truncate whitespace-nowrap text-paragraph-sm text-text-sub-500 underline decoration-stroke-sub-300 underline-offset-2'>
              {row.original.invoice_no}
            </span>
          ),
        meta: { headClassName: 'w-[123px]', cellClassName: 'w-[123px]' },
      },
      ...MILESTONE_COLUMNS.map(({ id, label, width }) => ({
        id,
        accessorKey: id,
        header: () => <MilestoneColumnHeader label={label} />,
        cell: ({ row }) => <PlainCell value={row.original[id]} />,
        meta: { headClassName: width, cellClassName: width },
      })),
      {
        id: 'payment_status',
        accessorKey: 'payment_status',
        header: () => <MilestoneColumnHeader label='Status' />,
        cell: ({ row }) => <PaymentStatusBadge status={row.original.payment_status} />,
        meta: { headClassName: 'w-[120px]', cellClassName: 'w-[120px]' },
      },
      {
        id: 'remarks',
        accessorKey: 'remarks',
        header: () => <MilestoneColumnHeader label='Remarks' />,
        cell: ({ row }) => <PlainCell value={row.original.remarks} />,
        meta: { headClassName: 'w-[150px]', cellClassName: 'w-[150px]' },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: milestones,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (milestones.length === 0) {
    return (
      <div className='rounded-lg border border-dashed border-stroke-soft-200 px-4 py-6 text-center text-paragraph-sm text-text-sub-500'>
        No milestones found for this project.
      </div>
    );
  }

  return (
    <div className='overflow-x-auto rounded-lg border border-stroke-soft-200 bg-bg-weak-50/40'>
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
          {table.getRowModel().rows.map((row) => (
            <React.Fragment key={row.id}>
              <Table.Row>
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
}
