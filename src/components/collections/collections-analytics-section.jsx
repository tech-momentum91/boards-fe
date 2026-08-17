import React, { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import CollectionsAnalyticsChartCard from '@/components/collections/collections-analytics-chart-card';
import CollectionsAnalyticsStats from '@/components/collections/collections-analytics-stats';
import CollectionsAnalyticsTable from '@/components/collections/collections-analytics-table';
import { CollectionsSortableHeader } from '@/components/collections/collections-toolbar';
import {
  COLLECTIONS_ANALYTICS_FY_OPTIONS,
  COLLECTIONS_ANALYTICS_STATUS_FILTER_OPTIONS,
  COLLECTIONS_DLP_OUTSTANDING_ROWS,
  COLLECTIONS_PROJECT_OUTSTANDING_ROWS,
} from '@/collections/analytics-constants';
import * as Badge from '@/components/ui/badge';
import * as Modal from '@/components/ui/modal';
import * as Select from '@/components/ui/select';
import * as Table from '@/components/ui/table';

function ExpandedAnalyticsTable({ title, rows }) {
  const [statusFilter, setStatusFilter] = useState('dlp');
  const [sorting, setSorting] = useState([]);

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows;
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  const columns = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: () => <span className='text-paragraph-sm text-text-sub-600'>Name</span>,
        cell: ({ row }) => (
          <span className='text-label-sm text-text-main-900'>{row.original.name}</span>
        ),
      },
      {
        id: 'amount',
        accessorKey: 'amount_sort',
        header: ({ column }) => <CollectionsSortableHeader label='Amount' column={column} />,
        cell: ({ row }) => (
          <span className='text-paragraph-sm text-text-sub-500'>{row.original.amount}</span>
        ),
      },
      {
        id: 'last_inv_date',
        accessorKey: 'last_inv_date',
        header: ({ column }) => (
          <CollectionsSortableHeader label='Last Inv. Date' column={column} />
        ),
        cell: ({ row }) => (
          <span className='text-paragraph-sm text-text-sub-500'>{row.original.last_inv_date}</span>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }) => <CollectionsSortableHeader label='Status' column={column} />,
        cell: ({ row }) => (
          <Badge.Root variant='light' color='purple' size='small' className='uppercase'>
            {row.original.status === 'dlp' ? 'DLP' : row.original.status}
          </Badge.Root>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between gap-3'>
        <h3 className='text-label-lg text-text-strong-950'>{title}</h3>
        <Select.Root value={statusFilter} onValueChange={setStatusFilter} size='xsmall'>
          <Select.Trigger className='w-[88px]'>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {COLLECTIONS_ANALYTICS_STATUS_FILTER_OPTIONS.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </div>
      <Table.Root variant='compact'>
        <Table.Header>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Table.Head key={header.id}>
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
                  <Table.Cell key={cell.id}>
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

export default function CollectionsAnalyticsSection({
  billingPeriod,
  onBillingPeriodChange,
  collectionPeriod,
  onCollectionPeriodChange,
  fiscalYear,
  onFiscalYearChange,
  fiscalYearOptions = COLLECTIONS_ANALYTICS_FY_OPTIONS,
  stats,
  projectOutstanding = COLLECTIONS_PROJECT_OUTSTANDING_ROWS,
  dlpOutstanding = COLLECTIONS_DLP_OUTSTANDING_ROWS,
  billingChart,
  collectionChart,
  isLoading = false,
}) {
  const [expandedTable, setExpandedTable] = useState(null);
  const [expandedChart, setExpandedChart] = useState(null);

  return (
    <div className='flex min-w-0 flex-col gap-5 overflow-x-hidden pb-2'>
      <CollectionsAnalyticsStats stats={stats} />

      <div className='grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2'>
        <CollectionsAnalyticsTable
          title='Project Outstanding'
          rows={projectOutstanding}
          onExpand={setExpandedTable}
        />
        <CollectionsAnalyticsTable
          title='Total DLP Outstanding'
          rows={dlpOutstanding}
          onExpand={setExpandedTable}
        />
      </div>

      {isLoading ? (
        <div className='rounded-xl border border-stroke-soft-200 px-5 py-8 text-center text-paragraph-sm text-text-sub-500'>
          Loading analytics…
        </div>
      ) : null}

      <CollectionsAnalyticsChartCard
        title='Monthly Billing'
        chartType='billing'
        expectedLabel='Expected Billing'
        actualLabel='Actual Billing'
        period={billingPeriod}
        onPeriodChange={onBillingPeriodChange}
        fiscalYear={fiscalYear}
        onFiscalYearChange={onFiscalYearChange}
        fiscalYearOptions={fiscalYearOptions}
        chartData={billingChart}
        onExpand={setExpandedChart}
      />

      <CollectionsAnalyticsChartCard
        title='Monthly Collection'
        chartType='collection'
        expectedLabel='Expected Payment'
        actualLabel='Actual Payment'
        period={collectionPeriod}
        onPeriodChange={onCollectionPeriodChange}
        fiscalYear={fiscalYear}
        onFiscalYearChange={onFiscalYearChange}
        fiscalYearOptions={fiscalYearOptions}
        chartData={collectionChart}
        onExpand={setExpandedChart}
      />

      <Modal.Root
        open={Boolean(expandedTable)}
        onOpenChange={(open) => !open && setExpandedTable(null)}
      >
        <Modal.Content className='max-w-[720px]' showClose>
          <Modal.Body className='p-5'>
            {expandedTable ? (
              <ExpandedAnalyticsTable title={expandedTable.title} rows={expandedTable.rows} />
            ) : null}
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>

      <Modal.Root
        open={Boolean(expandedChart)}
        onOpenChange={(open) => !open && setExpandedChart(null)}
      >
        <Modal.Content className='max-w-[1120px]' showClose>
          <Modal.Body className='p-2'>
            {expandedChart ? (
              <CollectionsAnalyticsChartCard
                title={expandedChart.title}
                chartType={expandedChart.chartType}
                expectedLabel={expandedChart.expectedLabel}
                actualLabel={expandedChart.actualLabel}
                period={expandedChart.period}
                onPeriodChange={(value) => {
                  if (expandedChart.chartType === 'billing') {
                    onBillingPeriodChange(value);
                  } else {
                    onCollectionPeriodChange(value);
                  }
                  setExpandedChart((previous) => ({ ...previous, period: value }));
                }}
                fiscalYear={expandedChart.fiscalYear}
                onFiscalYearChange={(value) => {
                  onFiscalYearChange(value);
                  setExpandedChart((previous) => ({ ...previous, fiscalYear: value }));
                }}
                fiscalYearOptions={fiscalYearOptions}
                chartData={expandedChart.chartType === 'billing' ? billingChart : collectionChart}
                expanded
              />
            ) : null}
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
}
