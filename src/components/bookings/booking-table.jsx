import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { RiArrowDownSLine, RiArrowUpSLine, RiErrorWarningLine } from 'react-icons/ri';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import * as Badge from '@/components/ui/badge';
import { useColumnConfig, useColumnConfigPopoverRef } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import SetStatusesModal, {
  StatusColumnPopover,
} from '@/components/space-management/status-configuration';
import { hasStatusBadgeColor, StatusColorPill } from '@/components/ui/status-color-pill';
import { formatDateTimeRangeForTable, parseToDate } from '@/utils/date-utils';
import { format } from 'date-fns';
import {
  getResourceTypeBadge,
  BOOKINGS_EMPTY_STATES,
  getBookingStatusBadgeColor,
} from '@/components/bookings/constants';
import { useDispatch } from 'react-redux';
import { fetchBookingColumnList, updateBookingColumnList } from '@/redux/bookingSlice';
import { extractErrorMessage } from '@/utils/error-utils';

const BookingTable = React.forwardRef(
  (
    {
      data = [],
      isLoading = false,
      error = null,
      onRetry,
      onRowSelect,
      onSortingChange,
      sorting = [{ id: 'creation', desc: true }],
      context = 'default',
      // Scroll pagination props
      onLoadMore,
      hasMore = false,
      isLoadingMore = false,
      enableScrollPagination = false,
      variant = 'compact',
      groupByField = '',
      groupOrder = 'asc',
    },
    ref,
  ) => {
    const [localSorting, setLocalSorting] = useState(
      sorting.length > 0 ? sorting : [{ id: 'creation', desc: true }],
    );
    const [isSetStatusesOpen, setIsSetStatusesOpen] = useState(false);
    const { statusPopoverColumnConfig, syncColumnConfigHookToPopover } =
      useColumnConfigPopoverRef();
    const dispatch = useDispatch();

    // Sync local sorting with prop
    useEffect(() => {
      setLocalSorting(sorting.length > 0 ? sorting : [{ id: 'creation', desc: true }]);
    }, [sorting]);

    const handleSortingChange = useCallback(
      (updaterOrValue) => {
        const newSorting =
          typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;

        setLocalSorting(newSorting);

        if (onSortingChange) {
          onSortingChange(newSorting);
        }
      },
      [localSorting, onSortingChange],
    );

    // Setup scroll pagination
    const { sentinelRef } = useScrollPagination({
      onLoadMore: onLoadMore || (() => {}),
      hasMore: hasMore && enableScrollPagination,
      isLoading: isLoadingMore || isLoading,
      threshold: 200,
      scrollContainer: null,
      enabled: enableScrollPagination && Boolean(onLoadMore),
    });

    const emptyState = useMemo(
      () => BOOKINGS_EMPTY_STATES[context] || BOOKINGS_EMPTY_STATES.default,
      [context],
    );

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

    // Define all available columns
    const allColumnDefs = useMemo(
      () => [
        {
          id: 'client_name',
          accessorKey: 'client_name',
          columnLabel: 'Client',
          header: ({ column }) => <Table.SortableHeader column={column} label='Client' sortable />,
          cell: ({ row }) => {
            const client = row.original.client_name || '-';
            return renderTooltipText(client, { maxWidthClass: 'max-w-[180px]' });
          },
          enableSorting: true,
        },
        {
          id: 'center_name',
          accessorKey: 'center_name',
          columnLabel: 'Center',
          header: ({ column }) => <Table.SortableHeader column={column} label='Center' sortable />,
          cell: ({ row }) => {
            const centerName = row.original.center_name || row.original.center || '';
            // Extract center code from name if it exists (e.g., "The First (AMD)")
            const centerMatch = centerName.match(/^(.+?)\s*\(([^)]+)\)$/);
            const name = centerMatch ? centerMatch[1].trim() : centerName;
            const code = centerMatch ? centerMatch[2] : null;

            if (!name) return <span className='paragraph-small text-text-sub-400'>-</span>;

            const display = code ? `${name} (${code})` : name;
            return renderTooltipText(display, { maxWidthClass: 'max-w-[220px]' });
          },
          enableSorting: true,
        },
        {
          id: 'booking_title',
          accessorKey: 'booking_title',
          columnLabel: 'Title',
          header: ({ column }) => <Table.SortableHeader column={column} label='Title' sortable />,
          cell: ({ row }) => {
            const title = row.original.booking_title || row.original.title || '-';
            return renderTooltipText(title, { maxWidthClass: 'max-w-[217px]' });
          },
          enableSorting: true,
        },
        {
          id: 'space_name',
          accessorKey: 'space_name',
          columnLabel: 'Space',
          header: () => <Table.SortableHeader label='Space' />,
          cell: ({ row }) => {
            const spaceId = row.original.space_name || '-';
            return renderTooltipText(spaceId, { maxWidthClass: 'max-w-[165px]' });
          },
          enableSorting: false,
        },
        {
          id: 'resource_type',
          accessorKey: 'resource_type',
          columnLabel: 'Resource Type',
          header: () => <Table.SortableHeader label='Resource Type' />,
          cell: ({ row }) => {
            const resourceType = row.original.resource_type || '';
            if (!resourceType) return <span className='paragraph-small text-text-sub-400'>-</span>;

            // Map resource type to badge color
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
          enableSorting: false,
        },
        {
          id: 'booking_date',
          accessorKey: 'booking_date',
          columnLabel: 'Date & Time',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Date & Time' sortable />
          ),
          cell: ({ row }) => {
            const bookingDate = row.original.booking_date;
            const startTime = row.original.start_time;
            const endTime = row.original.end_time;
            // Build datetime strings for formatting
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
            <div className='flex items-center gap-0.5'>
              Status
              <StatusColumnPopover
                columnId='status'
                columnConfigHook={statusPopoverColumnConfig}
                onOpenStatuses={() => setIsSetStatusesOpen(true)}
              />
            </div>
          ),
          cell: ({ row }) => {
            const status = row.original.status || '';
            if (!status) return <span className='paragraph-small text-text-sub-400'>-</span>;

            const statusColorRaw = row.original.status_color;
            const badgeColor = getBookingStatusBadgeColor(status);
            const statusLabel = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

            return (
              <div className='flex items-center justify-start'>
                {hasStatusBadgeColor(statusColorRaw) ? (
                  <StatusColorPill
                    value={statusLabel}
                    color={statusColorRaw}
                    className='max-w-[min(100%,160px)]'
                  />
                ) : (
                  <Badge.Root variant='light' color={badgeColor} size='small' className='uppercase'>
                    {statusLabel}
                  </Badge.Root>
                )}
              </div>
            );
          },
          enableSorting: false,
        },
        // Hidden columns (default)
        {
          id: 'id',
          accessorKey: 'name',
          columnLabel: 'ID',
          header: () => <Table.SortableHeader label='ID' />,
          cell: ({ row }) => {
            const id = row.original.name || '-';
            return renderTooltipText(id, { maxWidthClass: 'max-w-[160px]' });
          },
          enableSorting: false,
        },
        {
          id: 'floor',
          accessorKey: 'floor',
          columnLabel: 'Floor',
          header: () => <div className='flex items-center gap-0.5'>Floor</div>,
          cell: ({ row }) => {
            const { floor } = row.original;
            if (!floor) return <span className='paragraph-small text-text-sub-400'>--</span>;
            return renderTooltipText(floor, { maxWidthClass: 'max-w-[160px]' });
          },
          enableSorting: false,
        },
        {
          id: 'used_credits',
          accessorKey: 'used_credits',
          columnLabel: 'Credits Used',
          header: () => <Table.SortableHeader label='Credits Used' />,
          cell: ({ row }) => {
            const credits = row.original.used_credits ?? row.original.credit_used;
            return (
              <span className='paragraph-small text-text-sub-500 whitespace-nowrap'>
                {credits == null ? '-' : credits}
              </span>
            );
          },
          enableSorting: false,
        },
        {
          id: 'owner',
          accessorKey: 'owner',
          columnLabel: 'Created By',
          header: () => <Table.SortableHeader label='Created By' />,
          cell: ({ row }) => {
            const createdBy = row.original.owner || '-';
            return renderTooltipText(createdBy, { maxWidthClass: 'max-w-[200px]' });
          },
          enableSorting: false,
        },
        {
          id: 'creation',
          accessorKey: 'creation',
          columnLabel: 'Created At',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Created At' sortable />
          ),
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
          enableSorting: true,
        },
      ],
      [renderTooltipText],
    );

    // Default column configuration
    const defaultColumnConfig = useMemo(() => {
      const config = prepareColumnsForConfig(allColumnDefs);
      // Default visible columns and order for the bookings list.
      const defaultVisibleOrder = [
        'booking_title',
        'client_name',
        'center_name',
        'space_name',
        'resource_type',
        'booking_date',
        'status',
      ];

      const defaultHiddenOrder = ['id', 'floor', 'used_credits', 'owner', 'creation'];

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

      // Set order for hidden columns
      let hiddenOrder = defaultVisibleOrder.length;
      defaultHiddenOrder.forEach((colId) => {
        const col = configMap.get(colId);
        if (col) {
          col.visible = false;
          col.order = hiddenOrder++;
        }
      });

      // Set order for any remaining columns
      config.forEach((col) => {
        if (col.order === undefined) {
          col.order = hiddenOrder++;
        }
      });

      return config.sort((a, b) => a.order - b.order);
    }, [allColumnDefs]);

    // Column config persistence with backend (similar to clients-table)
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
      'bookings-table',
      defaultColumnConfig,
      handlePersistColumnConfig,
      handleFetchColumnConfig,
      {
        autoSave: true,
        debounce: true,
      },
    );
    syncColumnConfigHookToPopover(columnConfigHook);

    const columns = useMemo(
      () => applyColumnConfig(allColumnDefs, columnConfigHook.columns),
      [allColumnDefs, columnConfigHook.columns],
    );

    const groupedSections = useMemo(() => {
      if (!groupByField || !data?.length) return null;
      const map = new Map();
      for (const row of data) {
        const raw = row[groupByField];
        const k = raw === null || raw === undefined || raw === '' ? '—' : String(raw);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(row);
      }
      const keys = [...map.keys()].sort((a, b) =>
        groupOrder === 'desc'
          ? b.localeCompare(a, undefined, { sensitivity: 'base' })
          : a.localeCompare(b, undefined, { sensitivity: 'base' }),
      );
      return keys.map((key) => ({ key, rows: map.get(key) }));
    }, [data, groupByField, groupOrder]);

    const [expandedGroupKeys, setExpandedGroupKeys] = useState({});

    useEffect(() => {
      if (!groupedSections) return;
      setExpandedGroupKeys((prev) => {
        const next = { ...prev };
        groupedSections.forEach((s) => {
          if (next[s.key] === undefined) next[s.key] = true;
        });
        return next;
      });
    }, [groupedSections]);

    const toggleGroupSection = useCallback((key) => {
      setExpandedGroupKeys((prev) => {
        const wasExpanded = prev[key] !== false;
        return { ...prev, [key]: !wasExpanded };
      });
    }, []);

    const tableData = useMemo(() => {
      if (!groupedSections) return data;
      return groupedSections.flatMap((s) => s.rows);
    }, [data, groupedSections]);

    const table = useReactTable({
      data: tableData,
      columns,
      state: {
        sorting: localSorting,
      },
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      manualSorting: true, // Backend sorting enabled
      enableSortingRemoval: true,
    });

    React.useImperativeHandle(ref, () => ({
      columnConfig: columnConfigHook.columns,
      columnConfigHook,
      reorderColumns: columnConfigHook.reorderColumns,
      toggleColumnVisibility: columnConfigHook.toggleColumnVisibility,
      showAllColumns: columnConfigHook.showAllColumns,
      hideAllColumns: columnConfigHook.hideAllColumns,
      resetToDefault: columnConfigHook.resetToDefault,
    }));

    if (error) {
      const errorMessage = extractErrorMessage(error, 'Unable to load bookings. Please try again.');
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
            <RiErrorWarningLine className='size-6 text-error-base' />
          </div>
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>Unable to Load Bookings</h3>
          <p className='mb-4 text-sm text-error-darker/80'>{errorMessage}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className='rounded-lg bg-error-base px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error-darker'
            >
              Try Again
            </button>
          )}
        </div>
      );
    }

    if (!isLoading && tableData.length === 0) {
      return (
        <div className='w-full px-4 py-4'>
          <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
            <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{emptyState.title}</h3>
            <p className='max-w-md text-sm text-text-sub-600'>{emptyState.description}</p>
          </div>
        </div>
      );
    }

    const renderSkeleton = () => (
      <Table.Body>
        {Array.from({ length: 6 }).map((_, index, array) => (
          <React.Fragment key={`bookings-skeleton-${index}`}>
            <Table.Row>
              {table.getAllColumns().map((column) => (
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

    const renderHeaderGroups = () =>
      table.getHeaderGroups().map((headerGroup) => (
        <Table.Row key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <Table.Head key={header.id} className='rounded-none!'>
              {header.isPlaceholder
                ? null
                : typeof header.column.columnDef.header === 'function'
                  ? header.column.columnDef.header({
                      column: header.column,
                      header,
                      table,
                    })
                  : header.column.columnDef.header}
            </Table.Head>
          ))}
        </Table.Row>
      ));

    return (
      <div
        className={
          groupedSections ? 'w-full' : 'flex-1 min-h-0 flex flex-col w-full overflow-hidden'
        }
      >
        <SetStatusesModal
          open={isSetStatusesOpen}
          onOpenChange={setIsSetStatusesOpen}
          doctype='Space Booking'
          field='status'
          showImport={false}
        />
        {isLoading && tableData.length === 0 ? (
          <Table.Root variant={variant} className='min-h-0 flex-1 overflow-auto'>
            <Table.Header className='sticky top-0 z-30 bg-bg-weak-50'>
              {renderHeaderGroups()}
            </Table.Header>
            {renderSkeleton()}
          </Table.Root>
        ) : groupedSections ? (
          <div className='flex w-full flex-col gap-8 px-4 py-4 sm:px-6'>
            {(() => {
              const modelRows = table.getRowModel().rows;
              let rowCursor = 0;
              return groupedSections.map((section) => {
                const slice = modelRows.slice(rowCursor, rowCursor + section.rows.length);
                rowCursor += section.rows.length;
                const isExpanded = expandedGroupKeys[section.key] !== false;
                return (
                  <div key={section.key} className='flex w-full flex-col items-start'>
                    <button
                      type='button'
                      onClick={() => toggleGroupSection(section.key)}
                      className='label-small flex w-full cursor-pointer items-center gap-1.5 py-2 font-medium text-text-sub-500 transition-opacity hover:opacity-80 text-left'
                    >
                      <span className='paragraph-small font-semibold uppercase tracking-wider text-text-soft-400'>
                        {section.key} ({section.rows.length})
                      </span>
                      {isExpanded ? (
                        <RiArrowUpSLine size={16} className='shrink-0' />
                      ) : (
                        <RiArrowDownSLine size={16} className='shrink-0' />
                      )}
                    </button>
                    {isExpanded && (
                      <div className='w-full overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-sm'>
                        <Table.Root variant={variant} className='w-full'>
                          <Table.Header className='bg-bg-weak-50'>
                            {renderHeaderGroups()}
                          </Table.Header>
                          <Table.Body>
                            {slice.map((row, rowIndex) => (
                              <React.Fragment key={row.id}>
                                <Table.Row
                                  onClick={() => onRowSelect?.(row.original)}
                                  className={
                                    onRowSelect ? 'cursor-pointer hover:bg-bg-weak-50/50' : ''
                                  }
                                >
                                  {row.getVisibleCells().map((cell) => (
                                    <Table.Cell key={cell.id}>
                                      {typeof cell.column.columnDef.cell === 'function'
                                        ? cell.column.columnDef.cell({
                                            cell,
                                            column: cell.column,
                                            row,
                                            table,
                                            getValue: cell.getValue,
                                            renderValue: cell.renderValue,
                                          })
                                        : cell.getValue()}
                                    </Table.Cell>
                                  ))}
                                </Table.Row>
                                {rowIndex < slice.length - 1 && <Table.RowDivider />}
                              </React.Fragment>
                            ))}
                          </Table.Body>
                        </Table.Root>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
            {enableScrollPagination && (
              <>
                {hasMore && <div ref={sentinelRef} data-scroll-sentinel className='h-1 w-full' />}
                {isLoadingMore && (
                  <div className='flex w-full justify-center py-8'>
                    <div className='flex items-center justify-center gap-2'>
                      <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                      <span className='paragraph-small text-text-sub-600'>
                        Loading more bookings...
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <Table.Root variant={variant} className='min-h-0 flex-1 overflow-auto'>
            <Table.Header className='sticky top-0 z-30 bg-bg-weak-50'>
              {renderHeaderGroups()}
            </Table.Header>

            <Table.Body>
              {table.getRowModel().rows.map((row, rowIndex, array) => (
                <React.Fragment key={row.id}>
                  <Table.Row
                    onClick={() => onRowSelect?.(row.original)}
                    className={onRowSelect ? 'cursor-pointer hover:bg-bg-weak-50' : ''}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell key={cell.id}>
                        {typeof cell.column.columnDef.cell === 'function'
                          ? cell.column.columnDef.cell({
                              cell,
                              column: cell.column,
                              row,
                              table,
                              getValue: cell.getValue,
                              renderValue: cell.renderValue,
                            })
                          : cell.getValue()}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                  {rowIndex < array.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))}

              {enableScrollPagination && (
                <>
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
              )}
            </Table.Body>
          </Table.Root>
        )}
      </div>
    );
  },
);

BookingTable.displayName = 'BookingTable';

export default BookingTable;
