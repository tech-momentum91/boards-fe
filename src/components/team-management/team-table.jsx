import React, { useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import * as Avatar from '@/components/ui/avatar';
import { cn } from '@/utils/cn';
import { getInitials } from '@/lib/utils';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import {
  EMPTY_STATES,
  getRoleBadgeColor,
  getZonesFromMember,
} from '@/components/team-management/constants';
import { RiErrorWarningLine, RiPencilLine, RiDeleteBinLine } from 'react-icons/ri';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { setTeamUserDetailModal } from '@/redux/teamManagementSlice';
import * as Tooltip from '@/components/ui/tooltip';

const TeamTable = React.forwardRef(
  (
    {
      rows = [],
      isLoading = false,
      error = null,
      context = 'default',
      onRetry,
      onRowSelect,
      onEdit,
      onDelete,
      onSortingChange,
      sorting = [],
      tableId = 'team-management-table',
      variant = 'compact',
      onLoadMore,
      hasMore = false,
      isLoadingMore = false,
      enableScrollPagination = false,
      getRoleBadgeColor: getRoleBadgeColorProperty,
      fetchColumnConfig,
      persistColumnConfig,
    },
    ref,
  ) => {
    const dispatch = useDispatch();
    const [localSorting, setLocalSorting] = React.useState(sorting);
    const tableWrapperRef = React.useRef(null);

    React.useEffect(() => {
      setLocalSorting(sorting);
    }, [sorting]);

    // Setup scroll pagination
    const { sentinelRef } = useScrollPagination({
      onLoadMore: onLoadMore || (() => {}),
      hasMore: hasMore && enableScrollPagination,
      isLoading: isLoadingMore || isLoading,
      threshold: 200,
      scrollContainer: tableWrapperRef.current?.querySelector('.overflow-auto'),
      enabled: enableScrollPagination && Boolean(onLoadMore),
    });

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

    const allColumnDefs = useMemo(() => {
      return [
        {
          id: 'name',
          accessorKey: 'name',
          columnLabel: 'Name',
          enableHiding: false,
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-0.5 '>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>Name</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Name ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const displayName = row.original.name || '--';
            const userImage = row.original.image
              ? row.original.image
              : 'https://www.clipartmax.com/png/middle/258-2582267_circled-user-male-skin-type-1-2-icon-male-user-icon.png';
            const initials = getInitials(displayName) || '--';

            return (
              <div
                onClick={() => dispatch(setTeamUserDetailModal(true))}
                className='flex items-center gap-3 min-w-0'
              >
                <Avatar.Root size='32' color='gray' className='shrink-0'>
                  {userImage ? (
                    <Avatar.Image src={userImage} alt={displayName} />
                  ) : (
                    <span className='text-text-sub-500'>{initials}</span>
                  )}
                </Avatar.Root>
                <Tooltip.Root size='xsmall'>
                  <Tooltip.Trigger asChild>
                    <span className='text-paragraph-sm text-text-strong-950 truncate min-w-[220px] max-w-[220px]'>
                      {displayName}
                    </span>
                  </Tooltip.Trigger>
                  {displayName !== '--' && (
                    <Tooltip.Content size='xsmall'>{displayName}</Tooltip.Content>
                  )}
                </Tooltip.Root>
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'center',
          accessorKey: 'center',
          columnLabel: 'Center',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-0.5'>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                  Center
                </span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Center ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const centers = Array.isArray(row.original.centers)
              ? row.original.centers.filter(Boolean)
              : [];

            if (centers.length === 0) {
              return (
                <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>--</span>
              );
            }

            const firstCenter = centers[0];
            const additionalCenters = centers.slice(1);
            const additionalCount = additionalCenters.length;

            return (
              <div className='flex items-center gap-2 whitespace-nowrap'>
                <Badge.Root variant='lighter' color='gray' size='medium'>
                  <span className='text-paragraph-sm font-medium text-text-strong-950'>
                    {firstCenter.name}
                  </span>
                </Badge.Root>

                {additionalCount > 0 && (
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <Badge.Root
                        variant='lighter'
                        color='gray'
                        size='medium'
                        className='cursor-pointer'
                      >
                        <span className='text-label-xs font-semibold text-text-strong-950'>
                          +{additionalCount}
                        </span>
                      </Badge.Root>
                    </Tooltip.Trigger>
                    <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
                      <div className='flex flex-col gap-1'>
                        <span className='text-paragraph-sm font-medium text-text-strong-950 mb-1'>
                          Additional Centers ({additionalCount})
                        </span>
                        <div className='flex flex-col gap-1'>
                          {additionalCenters.map((center) => (
                            <div key={center.id} className='text-paragraph-sm text-text-sub-600'>
                              {center.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                )}
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'zone',
          accessorKey: 'zone',
          columnLabel: 'Zone',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-0.5'>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>Zone</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Zone ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const zones = getZonesFromMember(row.original);

            if (zones.length === 0) {
              return (
                <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>--</span>
              );
            }

            const firstZone = zones[0];
            const additionalZones = zones.slice(1);
            const additionalCount = additionalZones.length;

            return (
              <div className='flex items-center gap-2 whitespace-nowrap'>
                <Badge.Root variant='lighter' color='gray' size='medium'>
                  <span className='text-paragraph-sm font-medium text-text-strong-950'>
                    {firstZone}
                  </span>
                </Badge.Root>

                {additionalCount > 0 && (
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <Badge.Root
                        variant='lighter'
                        color='gray'
                        size='medium'
                        className='cursor-pointer'
                      >
                        <span className='text-label-xs font-semibold text-text-strong-950'>
                          +{additionalCount}
                        </span>
                      </Badge.Root>
                    </Tooltip.Trigger>
                    <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
                      <div className='flex flex-col gap-1'>
                        <span className='text-paragraph-sm font-medium text-text-strong-950 mb-1'>
                          Additional Zones ({additionalCount})
                        </span>
                        <div className='flex flex-col gap-1'>
                          {additionalZones.map((zone) => (
                            <div key={zone} className='text-paragraph-sm text-text-sub-600'>
                              {zone}
                            </div>
                          ))}
                        </div>
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                )}
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'email',
          accessorKey: 'email',
          columnLabel: 'Email',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-0.5 '>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>Email</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Email ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {row.original.email || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'cell_number',
          accessorKey: 'cell_number',
          columnLabel: 'Mobile Number',
          header: ({ column }) => (
            <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
              Mobile Number
            </span>
          ),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {row.original.cell_number || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'role',
          accessorKey: 'role',
          columnLabel: 'Role',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-0.5 '>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>Role</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Role ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => (
            <Badge.Root
              size='small'
              variant='light'
              color={(getRoleBadgeColorProperty ?? getRoleBadgeColor)(row.original.role)}
              className='whitespace-nowrap pt-[4px] pb-[2px] px-[6px]'
            >
              {row.original.role || '--'}
            </Badge.Root>
          ),
          enableSorting: true,
        },
        {
          id: 'status',
          accessorKey: 'status',
          columnLabel: 'Status',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-0.5 '>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                  Status
                </span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Status ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const { status } = row.original;
            const color = status === 'Active' ? 'green' : status === 'Inactive' ? 'red' : 'gray';
            return (
              <div className='flex items-center'>
                <Badge.Root
                  size='small'
                  variant='light'
                  color={color}
                  className='whitespace-nowrap pt-[4px] pb-[2px] px-[6px]'
                >
                  {status || '--'}
                </Badge.Root>
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'actions',
          accessorKey: 'actions',
          columnLabel: '',
          enableHiding: false,
          header: () => {
            return <div className='flex items-center gap-0.5 ' />;
          },
          cell: ({ row }) => (
            <div className='flex items-end justify-end  gap-2'>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(row.original);
                }}
                className='p-1 hover:bg-bg-weak-50 rounded transition-colors'
                aria-label='Edit member'
              >
                <RiPencilLine className='size-4 text-text-sub-600' />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(row.original);
                }}
                className='p-1 hover:bg-bg-weak-50 rounded transition-colors'
                aria-label='Delete member'
              >
                <RiDeleteBinLine className='size-4 text-text-sub-600' />
              </button>
            </div>
          ),
          enableSorting: false,
        },
      ];
    }, [onEdit, onDelete, getRoleBadgeColorProperty]);

    const defaultColumnConfig = useMemo(
      () => prepareColumnsForConfig(allColumnDefs),
      [allColumnDefs],
    );

    const getCall = React.useCallback(() => {
      if (typeof fetchColumnConfig === 'function') {
        return Promise.resolve(fetchColumnConfig()).then((res) => res ?? defaultColumnConfig);
      }
      return Promise.resolve(defaultColumnConfig);
    }, [fetchColumnConfig, defaultColumnConfig]);

    const persistCall = React.useCallback(
      (cols) => {
        if (typeof persistColumnConfig === 'function') {
          return Promise.resolve(persistColumnConfig(cols));
        }
        return Promise.resolve(cols);
      },
      [persistColumnConfig],
    );

    const columnConfigHook = useColumnConfig(tableId, defaultColumnConfig, persistCall, getCall, {
      autoSave: true,
      debounce: 300,
    });

    React.useImperativeHandle(ref, () => ({
      columnConfigHook,
    }));

    const visibleDefs = useMemo(
      () => applyColumnConfig(allColumnDefs, columnConfigHook.columns),
      [allColumnDefs, columnConfigHook.columns],
    );

    const table = useReactTable({
      data: rows,
      columns: visibleDefs,
      state: { sorting: localSorting },
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      enableSortingRemoval: true,
      manualSorting: true,
    });

    // Error state
    if (error) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
            <RiErrorWarningLine className='size-6 text-error-base' />
          </div>
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>
            Unable to Load Team Members
          </h3>
          <p className='mb-4 text-sm text-error-darker/80'>{error}</p>
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

    // Empty state
    if (!isLoading && rows.length === 0) {
      const state = EMPTY_STATES[context] || EMPTY_STATES.default;
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{state.title}</h3>
          <p className='max-w-md text-sm text-text-sub-600'>{state.description}</p>
        </div>
      );
    }

    // Loading skeleton
    const renderSkeleton = () => (
      <Table.Body spacing={8}>
        {Array.from({ length: 6 }).map((_, index, array) => (
          <React.Fragment key={`skeleton-${index}`}>
            <Table.Row>
              {visibleDefs.map((column) => (
                <Table.Cell key={column.id || column.accessorKey}>
                  <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                </Table.Cell>
              ))}
            </Table.Row>
            {index < array.length - 1 && <Table.RowDivider />}
          </React.Fragment>
        ))}
      </Table.Body>
    );

    const hasRows = table.getRowModel().rows.length > 0;

    return (
      <div ref={tableWrapperRef} className='flex-1 min-h-0 flex flex-col w-full'>
        <Table.Root
          variant={variant}
          className='min-h-0 flex-1 overflow-auto'
          style={{ minWidth: 1000 }}
        >
          <Table.Header className='sticky top-0 z-30 bg-bg-weak-50'>
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
          {isLoading && !hasRows ? (
            renderSkeleton()
          ) : (
            <Table.Body spacing={8}>
              {table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <Table.Row
                    className={cn('cursor-pointer')}
                    onClick={() => {
                      onRowSelect?.(row.original);
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                  <Table.RowDivider />
                </React.Fragment>
              ))}
              {/* Scroll pagination sentinel and loading indicator */}
              {enableScrollPagination && (
                <>
                  <Table.Row ref={sentinelRef} data-scroll-sentinel>
                    <Table.Cell colSpan={visibleDefs.length} className='h-1 p-0' />
                  </Table.Row>
                  {isLoadingMore && (
                    <Table.Row>
                      <Table.Cell colSpan={visibleDefs.length} className='text-center py-4'>
                        <span className='text-paragraph-sm text-text-sub-600'>
                          Loading more members...
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

TeamTable.displayName = 'TeamTable';

export default TeamTable;
