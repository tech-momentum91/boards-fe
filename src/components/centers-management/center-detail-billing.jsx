import { RiBillLine } from 'react-icons/ri';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import emptyState from '@/assets/images/empty-state.png';
import * as Badge from '@/components/ui/badge';
import * as Table from '@/components/ui/table';
import { withPrefix } from '@/lib/utils';
import { CURRENCY } from '@/constants/constants';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { getCenterBillingMonthlySummaryThunk } from '@/redux/centerSlice';

const LIMIT = 12;

const formatInrWithCommas = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return withPrefix(CURRENCY, '0');
  const sign = n < 0 ? '-' : '';
  const formatted = Math.abs(n).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  return `${sign}${withPrefix(CURRENCY, formatted)}`;
};

const billingStatusColor = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('partial')) return 'blue';
  if (s.includes('pending')) return 'orange';
  if (s.includes('full') || (s.includes('paid') && !s.includes('partial'))) return 'green';
  return 'gray';
};

const CenterDetailBilling = ({ centerId }) => {
  const dispatch = useDispatch();
  const { rows, page, limit, hasMore, isLoading, isLoadingMore, error } = useSelector(
    (s) => s.center.centerBillingMonthlySummary,
  );
  const [sorting, setSorting] = useState([]);

  const columns = useMemo(
    () => [
      {
        id: 'period',
        accessorFn: (r) => r.year * 100 + r.month_num,
        header: ({ column }) => <Table.SortableHeader column={column} label='Month' sortable />,
        cell: ({ row }) => (
          <>
            {row.original.month} {row.original.year}
          </>
        ),
        enableSorting: true,
      },
      {
        id: 'client_count',
        accessorKey: 'client_count',
        header: ({ column }) => (
          <Table.SortableHeader column={column} label='Client Count' sortable />
        ),
        enableSorting: true,
      },
      {
        id: 'billed_amount',
        accessorKey: 'billed_amount',
        header: ({ column }) => (
          <Table.SortableHeader column={column} label='Billed Amount' sortable />
        ),
        cell: ({ row }) => formatInrWithCommas(row.original.billed_amount),
        enableSorting: true,
      },
      {
        id: 'collected_amount',
        accessorKey: 'collected_amount',
        header: ({ column }) => <Table.SortableHeader column={column} label='Collected' sortable />,
        cell: ({ row }) => formatInrWithCommas(row.original.collected_amount),
        enableSorting: true,
      },
      {
        id: 'pending_amount',
        accessorKey: 'pending_amount',
        header: ({ column }) => <Table.SortableHeader column={column} label='Pending' sortable />,
        cell: ({ row }) => formatInrWithCommas(row.original.pending_amount),
        enableSorting: true,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }) => <Table.SortableHeader column={column} label='Status' sortable />,
        cell: ({ row }) => (
          <Badge.Root variant='light' color={billingStatusColor(row.original.status)} size='small'>
            {row.original.status || '--'}
          </Badge.Root>
        ),
        enableSorting: true,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => `${row.year}-${row.month_num}`,
    enableSortingRemoval: true,
  });

  useEffect(() => {
    if (!centerId) return;
    dispatch(getCenterBillingMonthlySummaryThunk({ centerId, page: 1, limit: LIMIT }));
  }, [dispatch, centerId]);

  const loadMore = useCallback(() => {
    if (!centerId || !hasMore || isLoadingMore || isLoading) return;
    dispatch(
      getCenterBillingMonthlySummaryThunk({
        centerId,
        page: page + 1,
        limit,
        append: true,
      }),
    );
  }, [centerId, dispatch, hasMore, isLoading, isLoadingMore, limit, page]);

  const { sentinelRef } = useScrollPagination({
    onLoadMore: loadMore,
    hasMore,
    isLoading: isLoadingMore || isLoading,
    threshold: 200,
    scrollContainer: null,
    enabled: Boolean(centerId) && rows.length > 0,
  });

  return (
    <div className='flex h-full flex-col gap-6'>
      <div className='flex items-center justify-between gap-4'>
        <div className='flex items-center gap-2'>
          <RiBillLine size={20} className='text-text-sub-500' />
          <h2 className='text-title-h6 text-text-strong-950'>Billing & Collection</h2>
        </div>
      </div>

      {!centerId ? (
        <div className='flex flex-1 flex-col items-center justify-center gap-5 py-12'>
          <span className='label-medium text-text-soft-400'>Select a center to view billing.</span>
        </div>
      ) : isLoading && rows.length === 0 ? (
        <div className='flex flex-1 flex-col items-center justify-center py-12'>
          <span className='label-medium text-text-soft-400'>Loading…</span>
        </div>
      ) : error && rows.length === 0 ? (
        <div className='flex flex-1 flex-col items-center justify-center py-12'>
          <span className='label-medium text-text-soft-400'>{String(error)}</span>
        </div>
      ) : rows.length === 0 ? (
        <div className='flex flex-1 flex-col items-center justify-center gap-5 py-12'>
          <img className='object-contain max-w-[200px]' src={emptyState} alt='no data' />
          <span className='label-medium text-text-soft-400'>No Bills found of this center.</span>
        </div>
      ) : (
        <div className='flex flex-col justify-start items-start gap-4'>
          <div className='flex shrink-0 w-full min-h-0 overflow-auto rounded-xl bg-bg-white-0'>
            <Table.Root variant='default' tableInstance={table} className='border-none'>
              <Table.Header>
                {table.getHeaderGroups().map((headerGroup) => (
                  <Table.Row key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <Table.Head key={header.id} column={header.column}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </Table.Head>
                    ))}
                  </Table.Row>
                ))}
              </Table.Header>
              <Table.Body spacing={8}>
                {table.getRowModel().rows.map((row) => (
                  <Table.Row
                    key={row.id}
                    className={
                      'group/row paragraph-small border-b border-stroke-soft-200 text-text-main-900'
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell key={cell.id} column={cell.column}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
                <>
                  <Table.Row ref={sentinelRef} data-scroll-sentinel>
                    <Table.Cell colSpan={columns.length} className='h-1 p-0' />
                  </Table.Row>
                  {isLoadingMore ? (
                    <Table.Row>
                      <Table.Cell colSpan={columns.length} className='py-4 text-center'>
                        <span className='text-paragraph-sm text-text-sub-600'>
                          Loading more billing…
                        </span>
                      </Table.Cell>
                    </Table.Row>
                  ) : null}
                </>
              </Table.Body>
            </Table.Root>
          </div>
        </div>
      )}
    </div>
  );
};

export default CenterDetailBilling;
