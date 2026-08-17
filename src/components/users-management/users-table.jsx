import React, { useMemo, useImperativeHandle, useEffect, useRef } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as Table from '@/components/ui/table';
import { useColumnConfig } from '@/hooks/use-column-config';
import { applyColumnConfig } from '@/lib/column-utils';
import { createColumnDefs } from '@/components/users-management/users-table-columns';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/utils/cn';
import { EMPTY_STATES } from '@/components/users-management/constants';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';

const UsersTable = React.forwardRef(
  (
    {
      data,
      apiColumns,
      onColumnChange,
      variant = 'compact',
      isLoading = false,
      context = 'default',
      onLoadMore,
      hasMore = false,
      isLoadingMore = false,
      enableScrollPagination = false,
    },
    ref,
  ) => {
    const [sorting, setSorting] = React.useState([]);
    const isInitialLoadRef = useRef(true);
    const previousColumnConfigRef = useRef(null);
    const { user } = useAuth();
    const loggedInUserEmail = user?.email;
    // Setup scroll pagination
    const { sentinelRef } = useScrollPagination({
      onLoadMore: onLoadMore || (() => {}),
      hasMore: hasMore && enableScrollPagination,
      isLoading: isLoadingMore || isLoading,
      threshold: 200,
      scrollContainer: null, // Use window/viewport as scroll container
      enabled: enableScrollPagination && Boolean(onLoadMore),
    });

    // Filter out the logged-in user from the data
    const filteredData = useMemo(() => {
      if (!Array.isArray(data)) return [];
      if (!loggedInUserEmail) return data;
      return data.filter((user) => user.email !== loggedInUserEmail);
    }, [data, loggedInUserEmail]);

    // Ensure data is always an array to prevent undefined errors
    const tableData = filteredData;

    // Create columns based on API response
    const allColumnDefs = useMemo(() => createColumnDefs(apiColumns), [apiColumns]);

    // Define all possible column IDs (excluding actions)
    // This ensures ALL columns are included in dropdown, even if hidden
    // Note: 'user_image' is excluded as it should not be displayed
    const allPossibleColumnIds = useMemo(
      () => ['name', 'email', 'user_role', 'enabled', 'center', 'last_login'],
      [],
    );

    // Prepare default column config from all possible columns
    // We create config objects for all columns, then merge with API preferences
    const defaultColumnConfig = useMemo(() => {
      // Map of column IDs to their display labels
      const columnLabelMap = {
        name: 'Name',
        email: 'Email',
        user_role: 'Role',
        enabled: 'Status',
        center: 'Center',

        last_login: 'Last Login',
      };

      return allPossibleColumnIds.map((id, index) => {
        // Find the column definition if it exists
        const columnDef = allColumnDefs.find((col) => col.id === id);
        // Use mapped label if available, otherwise generate from ID
        const label =
          columnLabelMap[id] ||
          id
            .replaceAll('_', ' ')
            .replaceAll(/([A-Z])/g, ' $1')
            .trim()
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        return {
          id,
          label,
          visible: true, // Default to visible
          order: index,
          enableHiding: columnDef?.enableHiding !== false,
        };
      });
    }, [allPossibleColumnIds, allColumnDefs]);

    // Create column config by merging API preferences with all available columns
    // This ensures ALL columns appear in dropdown, even if hidden
    const apiColumnConfig = useMemo(() => {
      // If no API columns, return default config
      if (!apiColumns || apiColumns.length === 0) {
        return defaultColumnConfig;
      }

      // Create a map of API preferences for quick lookup
      const apiPrefsMap = new Map(
        apiColumns.filter((col) => col.id !== 'actions').map((col) => [col.id, col]),
      );

      // Merge ALL default columns with API preferences
      // This ensures hidden columns still appear in dropdown
      const config = defaultColumnConfig.map((defaultCol) => {
        const apiPref = apiPrefsMap.get(defaultCol.id);

        if (apiPref) {
          // Use API preference (includes visibility state)
          // Preserve the exact visible value from API (defaults to true if undefined)
          const visibleValue = apiPref.visible === undefined ? true : apiPref.visible;

          // Preserve specific labels for name and enabled columns
          const preservedLabels = { name: 'Name', enabled: 'Status' };
          const label = preservedLabels[defaultCol.id] || apiPref.label || defaultCol.label;

          return {
            ...defaultCol,
            visible: visibleValue,
            label,
          };
        }

        // Keep default column if no API preference (shouldn't happen, but safe fallback)
        return defaultCol;
      });

      // Sort by API order if preferences exist
      if (apiColumns.length > 0) {
        config.sort((a, b) => {
          const aIndex = apiColumns.findIndex((col) => col.id === a.id);
          const bIndex = apiColumns.findIndex((col) => col.id === b.id);

          // If both have API order, sort by that
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          }
          // If only a has API order, it comes first
          if (aIndex !== -1) return -1;
          // If only b has API order, it comes first
          if (bIndex !== -1) return 1;
          // Otherwise maintain default order
          return 0;
        });
      }

      // Always add actions column at the end (never filtered, always visible)
      const actionsColumnConfig = {
        id: 'actions',
        label: 'Actions',
        visible: true,
        order: config.length,
        enableHiding: false,
      };
      config.push(actionsColumnConfig);

      return config;
    }, [apiColumns, defaultColumnConfig]);

    // Use column configuration hook without localStorage (tableId: null, autoSave: false)
    // When tableId is null, it won't load from localStorage and will use defaultColumns
    const {
      columns: columnConfig,
      visibleColumns: visibleColumnConfig,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      setColumns,
    } = useColumnConfig(null, apiColumnConfig, {
      autoSave: false, // Disable localStorage persistence - columns won't be saved
      debounce: false,
    });

    // Sync columns when API columns change (no localStorage, only API)
    // This ensures columns are always based on API response, not localStorage
    useEffect(() => {
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
    useEffect(() => {
      // Skip on initial load or if no callback provided
      if (isInitialLoadRef.current || !onColumnChange || columnConfig.length === 0) {
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

      // Format columns for API (exclude actions column)
      const columnsForAPI = columnConfig
        .filter((col) => col.id !== 'actions')
        .map((col) => ({
          id: col.id,
          visible: col.visible !== false,
        }));

      // Call the callback with formatted data
      onColumnChange(columnsForAPI);
    }, [columnConfig, onColumnChange]);

    // Apply column configuration to get final columns for the table
    const columns = useMemo(() => {
      const appliedColumns = applyColumnConfig(allColumnDefs, columnConfig);

      // Always ensure actions column is present and at the end
      const actionsColumnDef = allColumnDefs.find((col) => col.id === 'actions');
      const columnsWithoutActions = appliedColumns.filter((col) => col.id !== 'actions');

      // Always add actions column at the end (even if not in config)
      if (actionsColumnDef) {
        return [...columnsWithoutActions, actionsColumnDef];
      }

      return appliedColumns;
    }, [allColumnDefs, columnConfig]);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      columnConfig,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
    }));

    const table = useReactTable({
      data: tableData,
      columns,
      onSortingChange: setSorting,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      state: { sorting },
      initialState: {
        sorting: [{ id: 'name', desc: true }],
      },
    });

    // Empty state - only show when not loading and no data
    if (!isLoading && tableData.length === 0) {
      const state = EMPTY_STATES[context] || EMPTY_STATES.default;
      return (
        <div className='w-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{state.title}</h3>
          <p className='max-w-md text-sm text-text-sub-600'>{state.description}</p>
        </div>
      );
    }

    // Skeleton rendering function
    const renderSkeleton = () => {
      // Use the number of columns from the table headers, or fallback to apiColumns or default
      const headerGroups = table.getHeaderGroups();
      const skeletonColumnCount =
        (headerGroups.length > 0 && headerGroups[0]?.headers.length) ||
        (apiColumns.length > 0 ? apiColumns.length : 6);
      return (
        <Table.Body>
          {Array.from({ length: 6 }).map((_, index, array) => (
            <React.Fragment key={`skeleton-row-${index}`}>
              <Table.Row>
                {Array.from({ length: skeletonColumnCount }).map((_, cellIndex) => (
                  <Table.Cell key={`skeleton-cell-${index}-${cellIndex}`}>
                    <div className='h-4 w-3/4 bg-bg-weak-50 rounded animate-pulse' />
                  </Table.Cell>
                ))}
              </Table.Row>
              {index < array.length - 1 && <Table.RowDivider />}
            </React.Fragment>
          ))}
        </Table.Body>
      );
    };

    return (
      <div className='w-full overflow-x-auto'>
        <Table.Root variant={variant}>
          <Table.Header>
            {table.getHeaderGroups().map((hg) => (
              <Table.Row key={hg.id}>
                {hg.headers.map((header) => (
                  <Table.Head
                    key={header.id}
                    className={cn(header.column.columnDef.meta?.headClassName, 'whitespace-nowrap')}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </Table.Head>
                ))}
              </Table.Row>
            ))}
          </Table.Header>

          {isLoading && tableData.length === 0 ? (
            renderSkeleton()
          ) : (
            <Table.Body>
              {table.getRowModel().rows.map((row, i, rows) => (
                <React.Fragment key={row.id}>
                  <Table.Row data-state={row.getIsSelected() && 'selected'}>
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell
                        key={cell.id}
                        className={cn(
                          cell.column.columnDef.meta?.cellClassName,
                          'whitespace-nowrap',
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    ))}
                  </Table.Row>

                  {i < rows.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))}
              {/* Scroll pagination sentinel and loading indicator */}
              {enableScrollPagination && (
                <>
                  <Table.Row ref={sentinelRef} data-scroll-sentinel>
                    <Table.Cell colSpan={columns.length} className='h-1 p-0' />
                  </Table.Row>
                  {isLoadingMore && (
                    <Table.Row>
                      <Table.Cell colSpan={columns.length} className='text-center py-4'>
                        <span className='text-paragraph-sm text-text-sub-600'>
                          Loading more users...
                        </span>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </>
              )}
            </Table.Body>
          )}
        </Table.Root>
      </div>
    );
  },
);

UsersTable.displayName = 'UsersTable';

export default UsersTable;
