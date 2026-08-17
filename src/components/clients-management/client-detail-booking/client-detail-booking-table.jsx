import React, {
  useMemo,
  useCallback,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RiFileList2Line } from 'react-icons/ri';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import * as Badge from '@/components/ui/badge';
import { getBookingStatusBadgeColor, getResourceTypeBadge } from '@/components/bookings/constants';
import { formatDateTimeRangeForTable, parseToDate } from '@/utils/date-utils';
import { format } from 'date-fns';
import { fetchBookings, fetchListViewResources, openBookingDetail } from '@/redux/bookingSlice';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import apiClient from '@/api/axios';
import BookingEventDetailDrawer from '@/components/bookings/booking-event-detail-drawer';

const BOOKING_DOCTYPE = 'Space Booking';
const REACT_TABLE_ID = 'client_detail_booking';

const ClientDetailBookingTable = forwardRef(
  (
    {
      clientId,
      searchTerm,
      dateRange,
      statusFilter,
      variant = 'compact',
      onRowSelect,
      centerFilter,
      resourceTypesFilter,
      filtersInitialized,
    },
    ref,
  ) => {
    const dispatch = useDispatch();
    const { shared } = useSelector((state) => state.booking);
    const { bookings, reloadKey } = useSelector((state) => state.booking.listView);
    const bookingsData = bookings.data;
    const isLoading = bookings.isLoading;
    const isLoadingMore = bookings.isLoadingMore;
    const hasMore = bookings.hasMore;
    const currentPage = bookings.page || 1;
    const pageSize = bookings.pageSize || 20;

    const buildFilters = useCallback(() => {
      const filters = { clients: [clientId] };
      if (centerFilter) filters.center = centerFilter;
      if (Array.isArray(resourceTypesFilter) && resourceTypesFilter.length > 0) {
        filters.resourceTypes = resourceTypesFilter;
      }
      return filters;
    }, [clientId, centerFilter, resourceTypesFilter]);

    useEffect(() => {
      if (clientId && filtersInitialized) {
        dispatch(
          fetchBookings({
            keyword: searchTerm,
            status: statusFilter,
            filters: buildFilters(),
            dateRange,
            page: 1,
            pageSize,
            append: false,
          }),
        );
      }
    }, [
      dispatch,
      clientId,
      searchTerm,
      statusFilter,
      dateRange,
      reloadKey,
      centerFilter,
      resourceTypesFilter,
      buildFilters,
      pageSize,
      filtersInitialized,
    ]);

    const handleLoadMore = useCallback(() => {
      if (!hasMore || isLoading || isLoadingMore) return;
      dispatch(
        fetchBookings({
          keyword: searchTerm,
          status: statusFilter,
          filters: buildFilters(),
          dateRange,
          page: currentPage + 1,
          pageSize,
          append: true,
        }),
      );
    }, [
      dispatch,
      hasMore,
      isLoading,
      isLoadingMore,
      searchTerm,
      statusFilter,
      buildFilters,
      dateRange,
      currentPage,
      pageSize,
    ]);

    const { sentinelRef } = useScrollPagination({
      onLoadMore: handleLoadMore,
      hasMore,
      isLoading: isLoadingMore || isLoading,
      threshold: 200,
      scrollContainer: null,
      enabled: true,
    });

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

    const handleRowSelectInternal = useCallback(
      (booking) => {
        const rt = booking.resource_type || booking.resourceType;
        dispatch(
          fetchListViewResources({
            filters: {
              ...(booking.center && { center: booking.center }),
              ...(rt && { resource_type: rt }),
            },
          }),
        );
        dispatch(openBookingDetail(booking));
        onRowSelect?.(booking);
      },
      [dispatch, onRowSelect],
    );

    // All column definitions
    const allColumnDefs = useMemo(
      () => [
        {
          id: 'title',
          accessorKey: 'title',
          columnLabel: 'Title',
          header: () => (
            <div className='flex items-center gap-1.5'>
              <span className='text-paragraph-sm text-text-sub-600'>Title</span>
            </div>
          ),
          cell: ({ row }) => {
            const title = row.original.title || row.original.booking_title || '-';
            return renderTooltipText(title, { maxWidthClass: 'max-w-[217px]' });
          },
        },
        {
          id: 'center',
          accessorKey: 'center',
          columnLabel: 'Center',
          header: () => (
            <div className='flex items-center gap-1.5'>
              <span className='text-paragraph-sm text-text-sub-600'>Center</span>
            </div>
          ),
          cell: ({ row }) => {
            const center = row.original.center_name || '-';
            return renderTooltipText(center, { maxWidthClass: 'max-w-[180px]' });
          },
        },
        {
          id: 'space',
          accessorKey: 'space',
          columnLabel: 'Space',
          header: ({ column }) => (
            <Table.SortableHeader
              column={column}
              label='Space'
              sortable
              className='text-paragraph-sm text-text-sub-600'
            />
          ),
          cell: ({ row }) => {
            const space = row.original.space_name || '-';
            return renderTooltipText(space, { maxWidthClass: 'max-w-[180px]' });
          },
          enableSorting: true,
        },
        {
          id: 'resourceType',
          accessorKey: 'resourceType',
          columnLabel: 'Resource Type',
          header: ({ column }) => (
            <Table.SortableHeader
              column={column}
              label='Resource Type'
              sortable
              className='text-paragraph-sm text-text-sub-600'
            />
          ),
          cell: ({ row }) => {
            const resourceType = row.original.resourceType || row.original.resource_type || '';
            if (!resourceType) return <span className='paragraph-small text-text-sub-400'>-</span>;

            const badgeColor = getResourceTypeBadge(resourceType);
            const displayType = resourceType === 'Meeting Room' ? 'Meeting room' : resourceType;

            return (
              <div className='flex items-center justify-start'>
                <Badge.Root
                  variant='light'
                  color={badgeColor}
                  size='small'
                  className='uppercase whitespace-nowrap'
                >
                  {displayType}
                </Badge.Root>
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'booking_date',
          accessorKey: 'booking_date',
          columnLabel: 'Date & Time',
          header: ({ column }) => (
            <Table.SortableHeader
              column={column}
              label='Date & Time'
              sortable
              className='text-paragraph-sm text-text-sub-600'
            />
          ),
          cell: ({ row }) => {
            const bookingDate = row.original.booking_date;
            const startTime = row.original.start_time || row.original.from_time;
            const endTime = row.original.end_time || row.original.to_time;
            const start = bookingDate && startTime ? `${bookingDate} ${startTime}` : null;
            const end = bookingDate && endTime ? `${bookingDate} ${endTime}` : start;
            const formatted = formatDateTimeRangeForTable(start, end);
            return renderTooltipText(formatted, { maxWidthClass: 'max-w-[241px]' });
          },
          enableSorting: true,
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
                <Badge.Root
                  variant='light'
                  color={badgeColor}
                  size='small'
                  className='uppercase whitespace-nowrap'
                >
                  {statusLabel}
                </Badge.Root>
              </div>
            );
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
            const id = row.original.name || row.original.id || '-';
            return renderTooltipText(id, { maxWidthClass: 'max-w-[160px]' });
          },
        },
        {
          id: 'floor',
          accessorKey: 'floor',
          columnLabel: 'Floor',
          header: () => (
            <div className='flex items-center gap-1.5'>
              <span className='text-paragraph-sm text-text-sub-600'>Floor</span>
            </div>
          ),
          cell: ({ row }) => {
            const floor = row.original.floor || '-';
            return renderTooltipText(floor, { maxWidthClass: 'max-w-[160px]' });
          },
        },
        {
          id: 'used_credits',
          accessorKey: 'credit_used',
          columnLabel: 'Credits Used',
          header: () => (
            <div className='flex items-center gap-1.5 whitespace-nowrap'>
              <span className='text-paragraph-sm text-text-sub-600'>Credits Used</span>
            </div>
          ),
          cell: ({ row }) => {
            const credits = row.original.credit_used;
            return (
              <span className='paragraph-small text-text-sub-500 whitespace-nowrap'>
                {credits != null ? credits : '-'}
              </span>
            );
          },
        },
        {
          id: 'owner',
          accessorKey: 'owner',
          columnLabel: 'Created By',
          header: () => (
            <div className='flex items-center gap-1.5 whitespace-nowrap'>
              <span className='text-paragraph-sm text-text-sub-600'>Created By</span>
            </div>
          ),
          cell: ({ row }) => {
            const createdBy =
              row.original.owner || row.original.created_by || row.original.createdBy || '-';
            return renderTooltipText(createdBy, { maxWidthClass: 'max-w-[200px]' });
          },
        },
        {
          id: 'creation',
          accessorKey: 'creation',
          columnLabel: 'Created At',
          header: ({ column }) => {
            return (
              <Table.SortableHeader
                column={column}
                label='Created At'
                sortable
                className='text-paragraph-sm text-text-sub-600'
              />
            );
          },
          cell: ({ row }) => {
            const createdAt =
              row.original.creation || row.original.created_at || row.original.createdAt || '-';
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

    const defaultColumnConfig = useMemo(() => {
      const config = prepareColumnsForConfig(allColumnDefs);
      return config.map((col, index) => ({
        ...col,
        visible: true,
        order: index,
      }));
    }, [allColumnDefs]);

    const handlePersistColumnConfig = useCallback(async (data) => {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: BOOKING_DOCTYPE,
        react_table_id: REACT_TABLE_ID,
        columns: data,
      });
      return response?.data?.message;
    }, []);

    const handleFetchColumnConfig = useCallback(async () => {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: { doctype: BOOKING_DOCTYPE, react_table_id: REACT_TABLE_ID },
      });
      return response?.data?.message;
    }, []);

    const columnConfigHook = useColumnConfig(
      'client-detail-bookings-table',
      defaultColumnConfig,
      handlePersistColumnConfig,
      handleFetchColumnConfig,
      { autoSave: true, debounce: 500 },
    );

    const { columns: columnConfig } = columnConfigHook;

    const columns = useMemo(
      () => applyColumnConfig(allColumnDefs, columnConfig),
      [allColumnDefs, columnConfig],
    );

    useImperativeHandle(ref, () => ({ columnConfigHook }), [columnConfigHook]);

    const [sorting, setSorting] = useState([]);

    const table = useReactTable({
      data: bookingsData || [],
      columns,
      state: { sorting },
      onSortingChange: setSorting,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
    });

    if (isLoading) {
      return (
        <Table.Body spacing={8}>
          {Array.from({ length: 6 }).map((_, index, array) => (
            <React.Fragment key={`skeleton-${index}`}>
              <Table.Row>
                {allColumnDefs.map((column) => (
                  <Table.Cell key={column.id}>
                    <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                  </Table.Cell>
                ))}
              </Table.Row>
              {index < array.length - 1 && <Table.RowDivider />}
            </React.Fragment>
          ))}
        </Table.Body>
      );
    }

    return (
      <>
        <div className='w-full'>
          <Table.Root variant={variant} className='w-full'>
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
                <>
                  {table.getRowModel().rows.map((row, rowIndex, arr) => (
                    <React.Fragment key={row.id}>
                      <Table.Row
                        onClick={() => handleRowSelectInternal(row.original)}
                        className='cursor-pointer hover:bg-bg-weak-50'
                      >
                        {row.getVisibleCells().map((cell) => (
                          <Table.Cell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </Table.Cell>
                        ))}
                      </Table.Row>
                      {rowIndex < arr.length - 1 && <Table.RowDivider />}
                    </React.Fragment>
                  ))}

                  {hasMore && (
                    <Table.Row ref={sentinelRef} data-scroll-sentinel>
                      <Table.Cell colSpan={columns.length} className='h-1 p-0' />
                    </Table.Row>
                  )}
                  {isLoadingMore && (
                    <Table.Row>
                      <Table.Cell colSpan={columns.length} className='py-8 text-center'>
                        <div className='flex items-center justify-center gap-2'>
                          <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                          <span className='paragraph-small text-text-sub-600'>
                            Loading more bookings...
                          </span>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </>
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
                          There are no bookings matching your criteria.
                        </p>
                      </div>
                    </div>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        </div>

        {shared?.selectedBooking?.isOpen && <BookingEventDetailDrawer />}
      </>
    );
  },
);

ClientDetailBookingTable.displayName = 'ClientDetailBookingTable';

export default ClientDetailBookingTable;
