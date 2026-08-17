import React, {
  useMemo,
  useCallback,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiFileList2Line } from 'react-icons/ri';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import * as Badge from '@/components/ui/badge';
import { getBookingStatusBadgeColor } from '@/components/bookings/constants';
import { formatDateTimeRangeForTable, parseToDate } from '@/utils/date-utils';
import { format } from 'date-fns';
import {
  fetchBookings,
  fetchBookingColumnList,
  updateBookingColumnList,
} from '@/redux/bookingSlice';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';

const SpaceBookingTable = forwardRef(({ spaceId, dateRange, clientFilter, onRowSelect }, ref) => {
  const dispatch = useDispatch();
  const { bookings, reloadKey } = useSelector((state) => state.booking.listView);
  const bookingsData = bookings.data;
  useEffect(() => {
    if (spaceId) {
      const filters = {
        spaceId: [spaceId],
      };

      if (clientFilter && clientFilter !== 'all') {
        filters.clients = [clientFilter];
      }

      dispatch(
        fetchBookings({
          filters,
          dateRange,
        }),
      );
    }
  }, [dispatch, spaceId, dateRange, clientFilter, reloadKey]);

  // Helper for rendering tooltip text
  const renderTooltipText = useCallback((value, { maxWidthClass = '' } = {}) => {
    const text = value ?? '-';
    const showTooltip = text !== '-';

    return (
      <Tooltip.Root size='xsmall'>
        <Tooltip.Trigger asChild>
          <span
            className={`paragraph-small text-text-sub-500 overflow-hidden text-ellipsis whitespace-nowrap block ${maxWidthClass}`.trim()}
          >
            {text}
          </span>
        </Tooltip.Trigger>
        {showTooltip && <Tooltip.Content size='xsmall'>{text}</Tooltip.Content>}
      </Tooltip.Root>
    );
  }, []);

  // All column definitions (full set)
  const allColumnDefs = useMemo(
    () => [
      {
        id: 'booking_title',
        accessorKey: 'booking_title',
        columnLabel: 'Title',
        header: () => (
          <div className='flex items-center gap-1.5'>
            <span className='text-paragraph-sm text-text-sub-600'>Title</span>
          </div>
        ),
        cell: ({ row }) => {
          const title = row.original.booking_title || row.original.title || '-';
          return renderTooltipText(title, { maxWidthClass: 'max-w-[217px]' });
        },
      },
      {
        id: 'client_name',
        accessorKey: 'client_name',
        columnLabel: 'Client',
        header: () => (
          <div className='flex items-center gap-1.5'>
            <span className='text-paragraph-sm text-text-sub-600'>Client</span>
          </div>
        ),
        cell: ({ row }) => {
          const client =
            row.original.client_name || row.original.customer_name || row.original.client || '-';
          return renderTooltipText(client, { maxWidthClass: 'max-w-[180px]' });
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        columnLabel: 'Status',
        header: () => (
          <div className='flex items-center gap-0.5 text-paragraph-sm text-text-sub-600'>
            Status
          </div>
        ),
        cell: ({ row }) => {
          const status = row.original.status || '';
          if (!status) return <span className='paragraph-small text-text-sub-400'>-</span>;

          const badgeColor = getBookingStatusBadgeColor(status);
          const statusLabel = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

          return (
            <div className='flex items-center justify-start'>
              <Badge.Root variant='light' color={badgeColor} size='small' className='uppercase'>
                {statusLabel}
              </Badge.Root>
            </div>
          );
        },
      },
      {
        id: 'booking_date',
        accessorKey: 'booking_date',
        columnLabel: 'Date & Time',
        header: ({ column }) => {
          const sortState = column.getIsSorted();
          return (
            <div className='flex items-center gap-1.5'>
              <span className='text-paragraph-sm text-text-sub-600'>Date & Time</span>
              <button
                type='button'
                className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(sortState === 'asc')}
                aria-label={`Sort by Date & Time ${sortState === 'asc' ? 'descending' : 'ascending'}`}
              >
                {Table.getSortingIcon(sortState)}
              </button>
            </div>
          );
        },
        cell: ({ row }) => {
          const bookingDate = row.original.booking_date;
          const startTime = row.original.start_time || row.original.from_time;
          const endTime = row.original.end_time || row.original.to_time;
          // Build datetime strings for formatting
          const start = bookingDate && startTime ? `${bookingDate} ${startTime}` : null;
          const end = bookingDate && endTime ? `${bookingDate} ${endTime}` : start;
          const formatted = formatDateTimeRangeForTable(start, end);
          return renderTooltipText(formatted, { maxWidthClass: 'max-w-[241px]' });
        },
      },
      {
        id: 'id',
        accessorKey: 'name',
        columnLabel: 'ID',
        header: () => (
          <div className='flex items-center gap-1.5'>
            <span className='text-paragraph-sm text-text-sub-600'>ID</span>
          </div>
        ),
        cell: ({ row }) => {
          const id = row.original.name || '-';
          return renderTooltipText(id, { maxWidthClass: 'max-w-[160px]' });
        },
      },
      {
        id: 'used_credits',
        accessorKey: 'credit_used',
        columnLabel: 'Credits Used',
        header: () => (
          <div className='flex items-center gap-1.5'>
            <span className='text-paragraph-sm text-text-sub-600'>Credits Used</span>
          </div>
        ),
        cell: ({ row }) => {
          const credits = row.original.credit_used;
          return (
            <span className='paragraph-small text-text-sub-500 whitespace-nowrap'>
              {credits == null ? '-' : credits}
            </span>
          );
        },
      },
      {
        id: 'owner',
        accessorKey: 'owner',
        columnLabel: 'Created By',
        header: () => (
          <div className='flex items-center gap-1.5'>
            <span className='text-paragraph-sm text-text-sub-600'>Created By</span>
          </div>
        ),
        cell: ({ row }) => {
          const createdBy = row.original.owner || '-';
          return renderTooltipText(createdBy, { maxWidthClass: 'max-w-[200px]' });
        },
      },
      {
        id: 'creation',
        accessorKey: 'creation',
        columnLabel: 'Created At',
        header: ({ column }) => {
          const sortState = column.getIsSorted();
          return (
            <div className='flex items-center gap-1.5'>
              <span className='text-paragraph-sm text-text-sub-600'>Created At</span>
              <button
                type='button'
                className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                onClick={() => column.toggleSorting(sortState === 'asc')}
                aria-label={`Sort by Created At ${sortState === 'asc' ? 'descending' : 'ascending'}`}
              >
                {Table.getSortingIcon(sortState)}
              </button>
            </div>
          );
        },
        cell: ({ row }) => {
          const createdAt = row.original.creation || '-';
          if (createdAt === '-') {
            return <span className='paragraph-small text-text-sub-500 whitespace-nowrap'>-</span>;
          }
          const date = parseToDate(createdAt);
          if (!date)
            return <span className='paragraph-small text-text-sub-500 whitespace-nowrap'>-</span>;
          const formatted = format(date, 'do MMM yy, h:mm a');
          return renderTooltipText(formatted, { maxWidthClass: 'max-w-[220px]' });
        },
      },
    ],
    [renderTooltipText],
  );

  // Default column config matching BookingTable.jsx logic
  const defaultColumnConfig = useMemo(() => {
    const config = prepareColumnsForConfig(allColumnDefs);

    const defaultVisibleOrder = [
      'booking_title',
      'client_name',
      'status',
      'booking_date',
      'id',
      'used_credits',
      'owner',
      'creation',
    ];

    const configMap = new Map(config.map((col) => [col.id, col]));

    // Hide all columns first
    config.forEach((col) => {
      if (col.enableHiding !== false) {
        col.visible = false;
      }
    });

    // Show visible columns
    defaultVisibleOrder.forEach((colId, index) => {
      const col = configMap.get(colId);
      if (col) {
        col.visible = true;
        col.order = index;
      }
    });

    // Set order for any remaining columns
    let hiddenOrder = defaultVisibleOrder.length;
    config.forEach((col) => {
      if (col.order === undefined) {
        col.order = hiddenOrder++;
      }
    });

    return config.sort((a, b) => a.order - b.order);
  }, [allColumnDefs]);

  // Column config persistence with backend
  const handlePersistColumnConfig = useCallback(
    async (data) => {
      await dispatch(updateBookingColumnList(data)).unwrap();
      await dispatch(fetchBookingColumnList());
    },
    [dispatch],
  );

  const handleFetchColumnConfig = useCallback(async () => {
    return dispatch(fetchBookingColumnList())
      .unwrap()
      .then((data) => data);
  }, [dispatch]);

  const columnConfigHook = useColumnConfig(
    'space-bookings-table',
    defaultColumnConfig,
    handlePersistColumnConfig,
    handleFetchColumnConfig,
    {
      autoSave: true,
      debounce: 500,
    },
  );

  const { columns: columnConfig, visibleColumns: visibleColumnConfig } = columnConfigHook;

  // Apply column config to get visible columns in configured order
  const columns = useMemo(
    () => applyColumnConfig(allColumnDefs, columnConfig),
    [allColumnDefs, columnConfig],
  );

  // Expose column config hook via ref for the toolbar
  useImperativeHandle(
    ref,
    () => ({
      columnConfigHook,
    }),
    [columnConfigHook],
  );

  const [sorting, setSorting] = useState([]);

  const table = useReactTable({
    data: bookingsData || [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  return (
    <div className='w-full'>
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

        <Table.Body>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row, rowIndex, array) => (
              <React.Fragment key={row.id}>
                <Table.Row
                  onClick={() => onRowSelect?.(row.original)}
                  className={onRowSelect ? 'cursor-pointer hover:bg-bg-weak-50' : ''}
                >
                  {row.getVisibleCells().map((cell) => (
                    <Table.Cell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Cell>
                  ))}
                </Table.Row>

                {rowIndex < array.length - 1 && <Table.RowDivider />}
              </React.Fragment>
            ))
          ) : (
            <Table.Row>
              <Table.Cell colSpan={columns.length} className='h-[200px] text-center'>
                <div className='flex flex-col items-center justify-center gap-3 py-8'>
                  <div className='flex size-12 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-weak-50 shadow-sm'>
                    <RiFileList2Line className='size-6 text-text-sub-400' />
                  </div>
                  <div className='flex flex-col gap-1'>
                    <p className='text-label-md font-semibold text-text-main-900'>
                      No bookings found
                    </p>
                    <p className='text-paragraph-sm text-text-sub-500'>
                      There are no bookings for this space yet.
                    </p>
                  </div>
                </div>
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>
    </div>
  );
});

SpaceBookingTable.displayName = 'SpaceBookingTable';

export default SpaceBookingTable;
