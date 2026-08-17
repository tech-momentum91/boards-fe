import React, { useMemo, useCallback } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { RiErrorWarningLine } from 'react-icons/ri';

import * as Table from '@/components/ui/table';
import { EMPTY_STATES } from './constants';
import * as Badge from '@/components/ui/badge';
import * as Select from '@/components/ui/select';
import InlineEditableText from '@/components/ui/inline-editable-text';
import * as Tooltip from '@/components/ui/tooltip';
import emptyState from '@/assets/images/empty-state.png';
import { useColumnConfig, useColumnConfigPopoverRef } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import { useDispatch, useSelector } from 'react-redux';
import {
  getCenterColumnPreferencesThunk,
  saveCenterColumnPreferencesThunk,
} from '@/redux/centerSlice';
import { cn } from '@/utils/cn';
import { extractErrorMessage } from '@/utils/error-utils';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import SetStatusesModal, {
  StatusColumnPopover,
} from '@/components/space-management/status-configuration';
import { hasStatusBadgeColor, StatusColorPill } from '@/components/ui/status-color-pill';
import { toStatusFilterOptions, useStatusOptions } from '@/hooks/use-status-options';

// Status to badge variant mapping
const getStatusVariant = (status) => {
  if (!status) return 'disabled';

  const normalized = status.toLowerCase();

  return (
    {
      active: 'green',
      upcoming: 'orange',
      inactive: 'gray',
    }[normalized] || 'disabled'
  );
};

/** List view: Holiday (amber), Closed (red), hours / open (green). */
function getWorkingHoursListClassName(summary) {
  if (summary == null || String(summary).trim() === '') {
    return 'text-text-sub-500';
  }
  const raw = String(summary).trim();
  const lower = raw.toLowerCase();
  if (lower === 'holiday' || lower === 'public holiday' || /\bholiday\b/i.test(raw)) {
    return 'text-amber-600';
  }
  if (lower.includes('closed')) {
    return 'text-red-600';
  }
  if (lower.includes('24') && lower.includes('hour')) {
    return 'text-green-600';
  }
  return 'text-green-600';
}

const CENTER_STATUS_FALLBACK_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Upcoming', label: 'Upcoming' },
];

const CENTER_ZONE_OPTIONS = [
  { value: 'Zone 1', label: 'Zone 1' },
  { value: 'Zone 2', label: 'Zone 2' },
  { value: 'Zone 3', label: 'Zone 3' },
  { value: 'Zone 4', label: 'Zone 4' },
  { value: 'Zone 5', label: 'Zone 5' },
  { value: 'Zone 6', label: 'Zone 6' },
];

const renderInlineTextCell = (
  row,
  field,
  value,
  onFieldUpdate,
  className = 'paragraph-small text-text-sub-600',
) => {
  const centerId = row.original.name;
  const display = String(value ?? '').trim();
  if (!onFieldUpdate || !centerId) {
    return <span className={className}>{display || '--'}</span>;
  }
  return (
    <div className='min-w-0 max-w-full' onClick={(e) => e.stopPropagation()}>
      <InlineEditableText
        value={display}
        placeholder='—'
        displayClassName={className}
        inputClassName={className}
        onSave={(v) => {
          const trimmed = String(v ?? '').trim();
          if (trimmed === display) return;
          onFieldUpdate(centerId, field, trimmed);
        }}
      />
    </div>
  );
};

const renderInlineSelectCell = (row, field, value, options, onFieldUpdate, renderReadOnly) => {
  const centerId = row.original.name;
  if (!onFieldUpdate || !centerId) return renderReadOnly(value);
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Select.Root
        variant='borderless'
        value={value || ''}
        onValueChange={(next) => next !== value && onFieldUpdate(centerId, field, next)}
        size='xsmall'
      >
        <Select.Trigger className='w-full min-w-0' showArrow={false}>
          <Select.Value>{renderReadOnly(value)}</Select.Value>
        </Select.Trigger>
        <Select.Content className='min-w-[130px]'>
          {options.map((opt) => (
            <Select.Item size='medium' key={opt.value} value={opt.value}>
              {opt.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </div>
  );
};

const CentersTable = React.forwardRef(
  (
    {
      rows = [],
      isLoading = false,
      error = null,
      context = 'default',
      onRetry,
      onRowSelect,
      onSortingChange,
      sorting = [],
      permissions = {},
      tableId = 'centers-table',
      columnConfig: externalColumnConfig,
      onColumnConfigChange,
      variant = 'default', // Table variant: 'default' | 'compact'
      onLoadMore,
      hasMore = false,
      isLoadingMore = false,
      enableScrollPagination = false,
      onFieldUpdate,
    },
    ref,
  ) => {
    const [localSorting, setLocalSorting] = React.useState(sorting);
    const [isSetStatusesOpen, setIsSetStatusesOpen] = React.useState(false);
    const [statusOptionsRefreshKey, setStatusOptionsRefreshKey] = React.useState(0);
    const { statusPopoverColumnConfig, syncColumnConfigHookToPopover } =
      useColumnConfigPopoverRef();
    const { options: centerStatusOptions } = useStatusOptions({
      doctype: 'Center',
      field: 'status',
      refreshKey: statusOptionsRefreshKey,
    });
    const statusSelectOptions = React.useMemo(() => {
      const fromConfig = toStatusFilterOptions(centerStatusOptions);
      return fromConfig.length > 0 ? fromConfig : CENTER_STATUS_FALLBACK_OPTIONS;
    }, [centerStatusOptions]);

    const handleSetStatusesOpenChange = React.useCallback((open) => {
      setIsSetStatusesOpen(open);
      if (!open) setStatusOptionsRefreshKey((key) => key + 1);
    }, []);

    // Sync local sorting with prop
    React.useEffect(() => {
      setLocalSorting(sorting);
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

    const dispatch = useDispatch();

    const { centerListData, columnPreferences } = useSelector((state) => state.center);

    // Setup scroll pagination
    const { sentinelRef } = useScrollPagination({
      onLoadMore: onLoadMore || (() => {}),
      hasMore: hasMore && enableScrollPagination,
      isLoading: isLoadingMore || isLoading,
      threshold: 200,
      scrollContainer: null, // Use window/viewport as scroll container
      enabled: enableScrollPagination && Boolean(onLoadMore),
    });

    // Preserve scroll position when data is appended (scroll pagination)
    // This ensures smooth continuous scrolling without jumps to top
    const previousRowsLengthRef = React.useRef(rows.length);
    const scrollPositionBeforeUpdateRef = React.useRef(0);
    const isAppendingRef = React.useRef(false);

    // Store scroll position before data update
    React.useLayoutEffect(() => {
      if (enableScrollPagination && rows.length > previousRowsLengthRef.current) {
        // Data is being appended - store current scroll position
        scrollPositionBeforeUpdateRef.current =
          window.pageYOffset || document.documentElement.scrollTop;
        isAppendingRef.current = true;
      }
      previousRowsLengthRef.current = rows.length;
    }, [rows.length, enableScrollPagination]);

    // Restore scroll position after DOM update to maintain smooth scrolling
    React.useLayoutEffect(() => {
      if (
        enableScrollPagination &&
        isAppendingRef.current &&
        !isLoadingMore &&
        scrollPositionBeforeUpdateRef.current > 0
      ) {
        // Restore scroll position to maintain user's view
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        const scrollDifference = scrollPositionBeforeUpdateRef.current - currentScroll;

        if (Math.abs(scrollDifference) > 5) {
          // Only adjust if there's a significant difference (more than 5px)
          window.scrollTo(0, scrollPositionBeforeUpdateRef.current);
        }

        // Reset flags
        isAppendingRef.current = false;
        scrollPositionBeforeUpdateRef.current = 0;
      }
    }, [rows.length, isLoadingMore, enableScrollPagination]);

    // Track initial load and previous config to avoid calling API on initial sync
    const isInitialLoadRef = React.useRef(true);
    const previousColumnConfigRef = React.useRef('');

    // Clear any existing localStorage entries for centers table on mount
    React.useEffect(() => {
      const storageKeys = ['column_config_centers-table', 'column_config_centers-management-table'];
      storageKeys.forEach((key) => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
        }
      });
    }, []);

    // Fetch column preferences on component mount
    React.useEffect(() => {
      dispatch(getCenterColumnPreferencesThunk());
    }, [dispatch]);

    // Define all available columns with IDs for column management
    const allColumnDefs = useMemo(
      () => [
        // {
        //   id: 'id',
        //   accessorKey: 'id',
        //   header: ({ column }) => (
        //     <div className='flex items-center gap-0.5'>
        //       ID
        //       <button
        //         className='cursor-pointer'
        //         onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        //       >
        //         {getSortingIcon(column.getIsSorted())}
        //       </button>
        //     </div>
        //   ),
        //   cell: ({ row }) => {
        //     const centerId = row.original.id;
        //     return (
        //       <span className='paragraph-small text-nowrap text-text-strong-950'>
        //         {centerId || '--'}
        //       </span>
        //     );
        //   },
        //   enableSorting: true
        // },
        {
          id: 'name',
          accessorKey: 'name',
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              Name
              <button
                className='cursor-pointer'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => {
            const centerId = row.original.name;
            const val = (row.original.center_name || '').trim();
            return (
              <div className='w-[230px] max-w-[230px] overflow-hidden'>
                <Tooltip.Root size='xsmall'>
                  <Tooltip.Trigger asChild>
                    <div className='min-w-0 overflow-hidden'>
                      <InlineEditableText
                        value={val}
                        editOnIconOnly
                        placeholder='—'
                        displayClassName='paragraph-small font-medium text-text-strong-950 truncate'
                        inputClassName='paragraph-small font-medium text-text-strong-950'
                        onSave={(v) => {
                          const next = String(v ?? '').trim();
                          if (next === val) return;
                          onFieldUpdate?.(centerId, 'center_name', next);
                        }}
                      />
                    </div>
                  </Tooltip.Trigger>
                  {val && <Tooltip.Content size='xsmall'>{val}</Tooltip.Content>}
                </Tooltip.Root>
              </div>
            );
          },
          meta: {
            cellClassName: 'min-w-[250px] max-w-[250px] whitespace-nowrap',
          },
          enableSorting: true,
        },
        {
          id: 'city',
          accessorKey: 'city',
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              City
              <button
                className='cursor-pointer'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) => {
            const { city } = row.original;
            return (
              <span className='paragraph-small text-nowrap text-text-sub-600'>{city || '--'}</span>
            );
          },
          enableSorting: true,
        },
        {
          id: 'zone',
          accessorKey: 'zone',
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              Zone
              <button
                className='cursor-pointer'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
            </div>
          ),
          cell: ({ row }) =>
            renderInlineSelectCell(
              row,
              'zone',
              row.original.zone,
              CENTER_ZONE_OPTIONS,
              onFieldUpdate,
              (value) => (
                <span className='paragraph-small text-text-sub-600 text-nowrap'>
                  {value || '--'}
                </span>
              ),
            ),
          enableSorting: true,
        },
        {
          id: 'micro_market',
          accessorKey: 'micro_market',
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              <Table.SortableHeader
                column={column}
                label='Micro Market'
                className='cursor-pointer'
                sortable
              />
            </div>
          ),
          cell: ({ row }) =>
            renderInlineTextCell(row, 'micro_market', row.original.micro_market, onFieldUpdate),
          enableSorting: true,
        },
        {
          id: 'carpet_area',
          accessorKey: 'carpet_area',
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              <Table.SortableHeader
                column={column}
                label='Carpet Area(sq.ft)'
                className='cursor-pointer'
                sortable
              />
            </div>
          ),
          cell: ({ row }) => {
            const centerId = row.original.name;
            const display = String(row.original.carpet_area ?? '').trim();
            const displayWithUnit = display ? `${display} sq.ft` : '';

            if (!onFieldUpdate || !centerId) {
              return (
                <span className='paragraph-small text-text-sub-600'>{displayWithUnit || '--'}</span>
              );
            }

            return (
              <div
                className='flex min-w-0 max-w-full items-center gap-1'
                onClick={(e) => e.stopPropagation()}
              >
                <InlineEditableText
                  value={display}
                  placeholder='—'
                  numericOnly
                  displayClassName='paragraph-small text-text-sub-600'
                  inputClassName='paragraph-small text-text-sub-600'
                  onSave={(v) => {
                    const trimmed = String(v ?? '').trim();
                    if (trimmed === display) return;
                    onFieldUpdate(centerId, 'carpet_area', trimmed);
                  }}
                />
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'working_hours',
          accessorKey: 'working_hours',
          header: () => (
            <div className='flex items-center gap-0.5 whitespace-nowrap'>Working hours</div>
          ),
          cell: ({ row }) => {
            const wh = row.original.working_hours;
            const display =
              wh != null && wh !== ''
                ? typeof wh === 'string' || typeof wh === 'number'
                  ? String(wh)
                  : '--'
                : '--';
            return (
              <span
                className={cn(
                  'paragraph-small whitespace-nowrap',
                  getWorkingHoursListClassName(
                    typeof wh === 'string' || typeof wh === 'number' ? wh : null,
                  ),
                )}
              >
                {display}
              </span>
            );
          },
          meta: {
            cellClassName: 'min-w-[120px] max-w-[200px]',
          },
          enableSorting: false,
        },
        {
          id: 'total_space_count',
          accessorKey: 'total_space_count',
          header: () => <div className='w-full text-right whitespace-nowrap'>Spaces</div>,
          cell: ({ row }) => {
            const n = row.original.total_space_count;
            return (
              <span className='block text-right text-paragraph-sm text-text-sub-600 tabular-nums'>
                {n != null && n !== '' ? n : '--'}
              </span>
            );
          },
          meta: {
            cellClassName: 'min-w-[72px]',
            headClassName: 'text-right',
          },
          enableSorting: false,
        },
        {
          id: 'total_ticket_count',
          accessorKey: 'total_ticket_count',
          header: () => <div className='w-full text-right whitespace-nowrap'>Tickets</div>,
          cell: ({ row }) => {
            const n = row.original.total_ticket_count;
            return (
              <span className='block text-right text-paragraph-sm text-text-sub-600 tabular-nums'>
                {n != null && n !== '' ? n : '--'}
              </span>
            );
          },
          meta: {
            cellClassName: 'min-w-[72px]',
            headClassName: 'text-right',
          },
          enableSorting: false,
        },
        {
          id: 'status',
          accessorKey: 'status',
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              Status
              <button
                className='cursor-pointer'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              >
                {Table.getSortingIcon(column.getIsSorted())}
              </button>
              <StatusColumnPopover
                columnId='status'
                columnConfigHook={statusPopoverColumnConfig}
                onOpenStatuses={() => setIsSetStatusesOpen(true)}
              />
            </div>
          ),
          cell: ({ row }) =>
            renderInlineSelectCell(
              row,
              'status',
              row.original.status,
              statusSelectOptions,
              onFieldUpdate,
              (status) => {
                if (!status || status === '--') {
                  return <span className='paragraph-small text-text-sub-400'>--</span>;
                }
                const statusColorRaw = row.original.status_color || row.original.statusColor;
                if (hasStatusBadgeColor(statusColorRaw)) {
                  return (
                    <StatusColorPill
                      value={status}
                      color={statusColorRaw}
                      className='max-w-[min(100%,180px)]'
                    />
                  );
                }
                return (
                  <Badge.Root
                    variant='light'
                    color={getStatusVariant(status)}
                    className='text-nowrap'
                  >
                    {status}
                  </Badge.Root>
                );
              },
            ),
          enableSorting: true,
        },
        // {
        //   id: 'manager_name',
        //   accessorKey: 'manager_name',
        //   header: () => (
        //     <div className='flex items-center gap-0.5'>
        //       <Table.SortableHeader label='Manager Name' className='cursor-pointer' />
        //     </div>
        //   ),
        //   cell: ({ row }) => {
        //     const managerName = row.original.manager_name;
        //     return <span className='paragraph-small text-text-sub-600'>{managerName || '--'}</span>;
        //   },
        //   enableSorting: false,
        // },
        // {
        //   id: 'created_at',
        //   accessorKey: 'created_at',
        //   header: () => <div className='flex text-nowrap items-center gap-0.5'>Created At</div>,
        //   cell: ({ row }) => {
        //     const createdAt = row.original.created_at;
        //     return (
        //       <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
        //         {createdAt || '--'}
        //       </span>
        //     );
        //   },
        //   enableSorting: false,
        // },
        // {
        //   id: 'created_by',
        //   accessorKey: 'created_by',
        //   header: () => (
        //     <div className='flex items-center gap-0.5'>
        //       <Table.SortableHeader label='Created By' className='cursor-pointer' />
        //     </div>
        //   ),
        //   cell: ({ row }) => {
        //     const createdBy = row.original.created_by;
        //     return <span className='paragraph-small text-text-sub-600'>{createdBy || '--'}</span>;
        //   },
        //   enableSorting: false,
        // },
        // {
        //   id: 'last_updated',
        //   accessorKey: 'last_updated',
        //   header: () => (
        //     <div className='flex text-nowrap items-center gap-0.5'>Last Updated Date & Time</div>
        //   ),
        //   cell: ({ row }) => {
        //     const lastUpdated = row.original.last_updated;
        //     return (
        //       <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
        //         {lastUpdated || '--'}
        //       </span>
        //     );
        //   },
        //   enableSorting: false,
        // },
      ],
      [onFieldUpdate, statusPopoverColumnConfig, statusSelectOptions],
    );

    // Prepare columns for column management
    const defaultColumnConfig = useMemo(
      () => prepareColumnsForConfig(allColumnDefs),
      [allColumnDefs],
    );

    // Create column config from API response (similar to users-table)
    const apiColumnConfig = useMemo(() => {
      const apiColumns = columnPreferences.data || [];
      if (!apiColumns || apiColumns.length === 0) {
        return defaultColumnConfig;
      }

      // Create column config directly from API response, maintaining API order
      const config = apiColumns
        .map((apiCol, index) => {
          const columnDef = allColumnDefs.find((col) => col.id === apiCol.id);
          if (columnDef) {
            return {
              id: apiCol.id,
              label: apiCol.label || apiCol.id,
              visible: apiCol.visible !== false,
              order: index,
              enableHiding: columnDef.enableHiding !== false,
            };
          }
          return null;
        })
        .filter(Boolean);

      return config.length > 0 ? config : defaultColumnConfig;
    }, [columnPreferences.data, allColumnDefs, defaultColumnConfig]);

    // Use column configuration hook without localStorage (tableId: null, autoSave: false)
    // When tableId is null, it won't load from localStorage and will use apiColumnConfig
    const internalColumnConfigHook = useColumnConfig(null, apiColumnConfig, {
      autoSave: false, // Disable localStorage persistence - columns come from API
      debounce: false,
    });

    const {
      columns: columnConfig,
      visibleColumns: visibleColumnConfig,
      isLoading: isLoadingColumnConfig,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
      setColumns,
    } = internalColumnConfigHook;

    syncColumnConfigHookToPopover(externalColumnConfig || internalColumnConfigHook);

    // Sync columns when API columns change (no localStorage, only API)
    // This ensures columns are always based on API response, not localStorage
    React.useEffect(() => {
      if (apiColumnConfig.length > 0) {
        const configString = JSON.stringify(
          apiColumnConfig.map((col) => ({ id: col.id, visible: col.visible, order: col.order })),
        );

        // Only update if this is a new config from API (not from user changes)
        if (previousColumnConfigRef.current !== configString) {
          setColumns(apiColumnConfig);
          // Mark as initial load complete after first sync
          if (isInitialLoadRef.current) {
            isInitialLoadRef.current = false;
          }
          previousColumnConfigRef.current = configString;
        }
      }
    }, [apiColumnConfig, setColumns]);

    // Call API when column order or visibility changes (user-initiated changes)
    React.useEffect(() => {
      // Skip on initial load or if no columns
      if (isInitialLoadRef.current || columnConfig.length === 0) {
        return;
      }

      // Check if column config actually changed from previous state
      const currentConfigString = JSON.stringify(
        columnConfig.map((col) => ({ id: col.id, visible: col.visible, order: col.order })),
      );

      if (currentConfigString === previousColumnConfigRef.current) {
        return;
      }

      // Update previous config
      previousColumnConfigRef.current = currentConfigString;

      // Format columns for API
      const columnsForAPI = columnConfig.map((col) => ({
        id: col.id,
        visible: col.visible !== false,
      }));

      // Call the API to save column preferences
      dispatch(saveCenterColumnPreferencesThunk(columnsForAPI));
    }, [columnConfig, dispatch]);

    // Expose methods to parent via ref
    React.useImperativeHandle(ref, () => ({
      columnConfig,
      columnConfigHook: externalColumnConfig || internalColumnConfigHook, // Simplified API
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    }));

    // Apply column configuration to get final columns for the table
    const columns = useMemo(() => {
      return applyColumnConfig(allColumnDefs, columnConfig);
    }, [allColumnDefs, columnConfig]);

    // Use rows prop if provided, otherwise fall back to Redux data
    const tableData = useMemo(() => {
      return rows.length > 0 ? rows : centerListData.data || [];
    }, [rows, centerListData.data]);

    const table = useReactTable({
      data: tableData,
      columns,
      state: {
        sorting: localSorting,
      },
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      manualSorting: true, // Backend sorting - don't sort client-side
      enableSortingRemoval: true,
    });

    // Error state
    if (error) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
            <RiErrorWarningLine className='size-6 text-error-base' />
          </div>
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>Unable to Load Centers</h3>
          <p className='mb-4 text-sm text-error-darker/80'>{extractErrorMessage(error)}</p>
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

    // Loading skeleton
    const renderSkeleton = () => (
      <Table.Body>
        {Array.from({ length: 6 }).map((_, index, array) => (
          <React.Fragment key={`skeleton-${index}`}>
            <Table.Row>
              {columns.map((column) => (
                <Table.Cell
                  key={column.id || column.accessorKey}
                  className={column.meta?.cellClassName}
                >
                  <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                </Table.Cell>
              ))}
            </Table.Row>
            {index < array.length - 1 && <Table.RowDivider />}
          </React.Fragment>
        ))}
      </Table.Body>
    );

    if (!isLoading && tableData.length === 0) {
      const state = EMPTY_STATES[context] || EMPTY_STATES.default;
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{state.title}</h3>
          <p className='max-w-md text-sm text-text-sub-600'>{state.description}</p>
        </div>
      );
    }

    return (
      <>
        <SetStatusesModal
          open={isSetStatusesOpen}
          onOpenChange={handleSetStatusesOpenChange}
          doctype='Center'
          field='status'
          showImport={false}
        />
        <div className='flex-1 min-h-0 flex flex-col w-full'>
          <Table.Root
            variant={variant}
            className='min-h-0 flex-1 overflow-auto'
            stickyHeader={true}
          >
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

            {isLoading ? (
              renderSkeleton()
            ) : (
              <Table.Body>
                {table.getRowModel().rows.map((row, i, rows) => (
                  <React.Fragment key={row.id}>
                    <Table.Row
                      data-state={row.getIsSelected() && 'selected'}
                      className='cursor-pointer'
                      onClick={() => onRowSelect?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <Table.Cell
                          key={cell.id}
                          className={cell.column.columnDef.meta?.cellClassName}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Table.Cell>
                      ))}
                    </Table.Row>

                    {i < rows.length - 1 && <Table.RowDivider />}
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
                              Loading more centers...
                            </span>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </>
                )}
              </Table.Body>
            )}
          </Table.Root>
        </div>
      </>
    );
  },
);

CentersTable.displayName = 'CentersTable';

export default CentersTable;
