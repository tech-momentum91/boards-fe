import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useDispatch, useSelector } from 'react-redux';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import { resolveCenterDisplayLabel } from '@/utils/coworker-centers';
import { RiDeleteBinLine, RiPencilLine } from 'react-icons/ri';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import {
  getCoworkerColumnPreferencesThunk,
  saveCoworkerColumnPreferencesThunk,
} from '@/redux/coworkerSlice';

const ClientDetailCoworkersTable = React.forwardRef(
  (
    {
      rows = [],
      variant = 'compact',
      isLoading = false,
      isLoadingMore = false,
      hasMore = false,
      enableScrollPagination = false,
      onLoadMore,
      onEditCoworker,
      onDeleteCoworker,
      onViewCoworker,
      assignedCenterOptions = [],
    },
    ref,
  ) => {
    const [localSorting, setLocalSorting] = useState([]);
    const sentinelRef = useRef(null);
    const dispatch = useDispatch();
    const { columnPreferences } = useSelector((state) => state.coworker);
    const isInitialLoadRef = useRef(true);
    const previousColumnConfigRef = useRef('');

    useEffect(() => {
      dispatch(getCoworkerColumnPreferencesThunk());
    }, [dispatch]);

    useEffect(() => {
      if (!enableScrollPagination || !hasMore || !onLoadMore) return undefined;
      const node = sentinelRef.current;
      if (!node) return undefined;

      const observer = new IntersectionObserver(
        (entries) => {
          const firstEntry = entries[0];
          if (firstEntry?.isIntersecting && !isLoading && !isLoadingMore) {
            onLoadMore();
          }
        },
        { root: null, rootMargin: '200px 0px', threshold: 0.01 },
      );

      observer.observe(node);
      return () => observer.disconnect();
    }, [enableScrollPagination, hasMore, isLoading, isLoadingMore, onLoadMore, rows.length]);

    const handleSortingChange = (updaterOrValue) => {
      const newSorting =
        typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;
      setLocalSorting(newSorting);
    };

    const allColumnDefs = useMemo(
      () => [
        {
          id: 'name',
          accessorFn: (row) =>
            [row.first_name, row.last_name].filter(Boolean).join(' ') || row.name || '',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span>Name</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => (
            <button
              type='button'
              className='text-paragraph-sm text-text-main-900 font-medium cursor-pointer hover:text-primary-base'
              onClick={() => onViewCoworker?.(row.original)}
            >
              {[row.original.first_name, row.original.last_name].filter(Boolean).join(' ') || '-'}
            </button>
          ),
        },
        {
          id: 'email',
          accessorKey: 'email',
          header: 'Email',
          cell: ({ row }) => (
            <span className='text-paragraph-sm text-text-main-900'>{row.original.email}</span>
          ),
        },
        {
          id: 'phone',
          accessorKey: 'phone',
          header: 'Phone',
          cell: ({ row }) => (
            <span className='text-paragraph-sm text-text-main-900'>
              {row.original.phone_number || row.original.phone || '-'}
            </span>
          ),
        },
        {
          id: 'department',
          accessorKey: 'department',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span>Department</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => (
            <span className='text-paragraph-sm text-text-main-900'>{row.original.department}</span>
          ),
        },
        {
          id: 'designation',
          accessorKey: 'designation',
          header: 'Designation',
          cell: ({ row }) => (
            <span className='text-paragraph-sm text-text-main-900'>{row.original.designation}</span>
          ),
        },
        {
          id: 'DOB',
          accessorKey: 'DOB',
          header: 'DOB',
          cell: ({ row }) => (
            <span className='text-paragraph-sm text-text-main-900'>
              {row.original.date_of_birth || row.original.DOB || '-'}
            </span>
          ),
        },
        {
          id: 'employee_id',
          accessorKey: 'employee_id',
          header: 'Employee ID',
          cell: ({ row }) => (
            <span className='text-paragraph-sm text-text-main-900'>
              {row?.original?.employee_id || '-'}
            </span>
          ),
        },
        {
          id: 'reporting_manager',
          accessorKey: 'reporting_manager',
          header: 'Reporting Manager',
          cell: ({ row }) => (
            <span className='text-paragraph-sm text-text-main-900'>
              {row.original.reporting_manager || '-'}
            </span>
          ),
        },
        {
          id: 'work_mode',
          accessorKey: 'work_mode',
          header: 'Work Mode',
          cell: ({ row }) => (
            <span className='text-paragraph-sm text-text-main-900'>
              {row.original.work_mode || '-'}
            </span>
          ),
        },
        {
          id: 'center',
          accessorFn: (row) => row.assigned_center || row.center || '',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span>Center</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => (
            <span className='text-paragraph-sm text-text-main-900'>
              {resolveCenterDisplayLabel(
                row.original.assigned_center || row.original.center,
                assignedCenterOptions,
              )}
            </span>
          ),
        },
        {
          id: 'access',
          accessorKey: 'access',
          header: 'Access',
          cell: ({ row }) => {
            const access = row.original.access_type || row.original.access || '-';
            const isAdmin = access === 'Admin';
            return (
              <Badge.Root variant='light' color={isAdmin ? 'orange' : 'gray'} size='small'>
                {access}
              </Badge.Root>
            );
          },
        },
        {
          id: 'status',
          accessorKey: 'status',
          header: 'Status',
          cell: ({ row }) => {
            const status = row.original.status || 'Active';
            const isActive = status === 'Active';
            return (
              <Badge.Root variant='light' color={isActive ? 'green' : 'gray'} size='small'>
                {status}
              </Badge.Root>
            );
          },
        },
        {
          id: 'action',
          header: '',
          enableSorting: false,
          enableHiding: false,
          cell: ({ row }) => (
            <div className='flex items-center gap-1.5 justify-end'>
              <button
                type='button'
                className='h-7 w-7 rounded-md flex items-center justify-center text-text-sub-500 hover:bg-bg-weak-100 hover:text-text-main-900'
                onClick={() => onEditCoworker?.(row.original)}
                aria-label='Edit coworker'
              >
                <RiPencilLine />
              </button>
              <button
                type='button'
                className='h-7 w-7 rounded-md flex items-center justify-center text-error-base hover:bg-error-lighter'
                onClick={() => onDeleteCoworker?.(row.original)}
                aria-label='Delete coworker'
              >
                <RiDeleteBinLine />
              </button>
            </div>
          ),
          meta: {
            headClassName: 'sticky right-0 z-30 bg-bg-weak-50',
            cellClassName: 'border-stroke-soft-200 sticky right-0 z-30 bg-white',
          },
        },
      ],
      [assignedCenterOptions, onDeleteCoworker, onEditCoworker, onViewCoworker],
    );

    const defaultColumnConfig = useMemo(
      () => prepareColumnsForConfig(allColumnDefs),
      [allColumnDefs],
    );

    const apiColumnConfig = useMemo(() => {
      const apiColumns = columnPreferences.data || [];
      if (!apiColumns || apiColumns.length === 0) {
        return defaultColumnConfig;
      }

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

    const internalColumnConfigHook = useColumnConfig(null, apiColumnConfig, {
      autoSave: false,
      debounce: false,
    });

    const {
      columns: columnConfig,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
      setColumns,
    } = internalColumnConfigHook;

    useEffect(() => {
      if (apiColumnConfig.length > 0) {
        const configString = JSON.stringify(
          apiColumnConfig.map((col) => ({ id: col.id, visible: col.visible, order: col.order })),
        );

        if (previousColumnConfigRef.current !== configString) {
          setColumns(apiColumnConfig);
          if (isInitialLoadRef.current) {
            isInitialLoadRef.current = false;
          }
          previousColumnConfigRef.current = configString;
        }
      }
    }, [apiColumnConfig, setColumns]);

    useEffect(() => {
      if (isInitialLoadRef.current || columnConfig.length === 0) {
        return;
      }

      const currentConfigString = JSON.stringify(
        columnConfig.map((col) => ({ id: col.id, visible: col.visible, order: col.order })),
      );

      if (currentConfigString === previousColumnConfigRef.current) {
        return;
      }

      previousColumnConfigRef.current = currentConfigString;

      const columnsForAPI = columnConfig.map((col) => ({
        id: col.id,
        visible: col.visible !== false,
      }));

      dispatch(saveCoworkerColumnPreferencesThunk(columnsForAPI));
    }, [columnConfig, dispatch]);

    useImperativeHandle(ref, () => ({
      columnConfig,
      columnConfigHook: internalColumnConfigHook,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    }));

    const columns = useMemo(() => {
      return applyColumnConfig(allColumnDefs, columnConfig);
    }, [allColumnDefs, columnConfig]);

    const table = useReactTable({
      data: rows,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      state: { sorting: localSorting },
      onSortingChange: handleSortingChange,
      enableSortingRemoval: true,
    });

    if (isLoading) {
      return (
        <div className='w-full rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-4'>
          <div className='space-y-3'>
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={`coworker-skeleton-${index}`}
                className='h-8 animate-pulse rounded-md bg-bg-weak-100'
              />
            ))}
          </div>
        </div>
      );
    }

    if (rows.length === 0) {
      return (
        <div className='w-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>No coworkers match</h3>
          <p className='max-w-md text-sm text-text-sub-600'>
            Try adjusting your search or filters to see results.
          </p>
        </div>
      );
    }

    return (
      <div className='w-full overflow-x-auto'>
        <Table.Root variant={variant} tableInstance={table}>
          <Table.Header>
            {table.getHeaderGroups().map((hg) => (
              <Table.Row key={hg.id}>
                {hg.headers.map((header) => (
                  <Table.Head
                    key={header.id}
                    column={header.column}
                    className={cn(header.column.columnDef.meta?.headClassName, 'whitespace-nowrap')}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </Table.Head>
                ))}
              </Table.Row>
            ))}
          </Table.Header>

          <Table.Body>
            {table.getRowModel().rows.map((row, i, allRows) => (
              <React.Fragment key={row.id}>
                <Table.Row>
                  {row.getVisibleCells().map((cell) => (
                    <Table.Cell
                      key={cell.id}
                      column={cell.column}
                      className={cn(cell.column.columnDef.meta?.cellClassName, 'whitespace-nowrap')}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Cell>
                  ))}
                </Table.Row>

                {i < allRows.length - 1 && <Table.RowDivider />}
              </React.Fragment>
            ))}
            {enableScrollPagination && hasMore ? (
              <Table.Row ref={sentinelRef}>
                <Table.Cell colSpan={columns.length} className='h-1 p-0' />
              </Table.Row>
            ) : null}
            {enableScrollPagination && isLoadingMore ? (
              <Table.Row>
                <Table.Cell colSpan={columns.length} className='py-6 text-center'>
                  <div className='flex items-center justify-center gap-2'>
                    <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                    <span className='text-paragraph-sm text-text-sub-600'>
                      Loading more co-workers...
                    </span>
                  </div>
                </Table.Cell>
              </Table.Row>
            ) : null}
          </Table.Body>
        </Table.Root>
      </div>
    );
  },
);

ClientDetailCoworkersTable.displayName = 'ClientDetailCoworkersTable';

export default ClientDetailCoworkersTable;
