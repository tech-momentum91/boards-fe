import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import {
  getSpaceStatusBadge,
  SPACE_DETAIL_OCCUPANCY_TABLE_ID,
  OCCUPANCY_GROUP_BY_OPTIONS,
  OCCUPANCY_HISTORY_DEFAULT_COLUMNS,
} from '@/components/space-management/constants';
import { getOccupancyGroupKey } from '@/components/space-management/occupancy-history-utils';

const OCCUPANCY_COLUMN_CONFIG_STORAGE_KEY = `column-config-${SPACE_DETAIL_OCCUPANCY_TABLE_ID}`;

// Map frontend column IDs to backend field names for sorting
const mapColumnIdToBackendField = (columnId) => {
  const fieldMap = {
    total_credits: 'credit_per_seat',
    price_per_seat: 'expected_per_seat_rate',
    total_price: 'total_rate',
    total_carpet_area: 'total_carpet_area',
    client_name: 'customer_name',
    total_seats: 'assigned_seats',
    lease_duration: 'lease_duration',
    status: 'status',
  };
  return fieldMap[columnId] || columnId;
};

const VISIBLE_PARKING_BADGES = 2;

const parseParkingLabels = (assignSubSpaces) => {
  if (!Array.isArray(assignSubSpaces)) return [];
  return assignSubSpaces
    .map((x) =>
      typeof x === 'string' ? x : (x?.desk_id ?? x?.parking_no ?? x?.sub_space_id ?? ''),
    )
    .filter(Boolean);
};

const AssignParkingBadges = ({ labels }) => {
  if (labels.length === 0) {
    return <span className='text-paragraph-sm text-text-sub-600'>--</span>;
  }
  const extra = labels.length - VISIBLE_PARKING_BADGES;
  return (
    <div className='flex flex-wrap items-center gap-2'>
      {labels.slice(0, VISIBLE_PARKING_BADGES).map((lab, i) => (
        <Badge.Root key={`${lab}-${i}`} variant='lighter' color='gray' size='medium'>
          <span className='paragraph-small block max-w-[100px] truncate font-medium text-text-strong-950'>
            {lab}
          </span>
        </Badge.Root>
      ))}
      {extra > 0 ? (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Badge.Root variant='lighter' color='gray' size='medium'>
              <span className='text-label-xs font-semibold text-text-strong-950'>+{extra}</span>
            </Badge.Root>
          </Tooltip.Trigger>
          <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
            <div className='flex flex-col gap-1'>
              <span className='mb-1 text-paragraph-sm font-medium text-text-strong-950'>
                Additional Parkings ({extra})
              </span>
              <div className='flex flex-col gap-1'>
                {labels.slice(VISIBLE_PARKING_BADGES).map((lab, index) => (
                  <div key={index} className='text-paragraph-sm text-text-sub-600'>
                    {lab}
                  </div>
                ))}
              </div>
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      ) : null}
    </div>
  );
};

// Convert TanStack sorting to backend order_by format
const convertSortingToOrderBy = (sorting) => {
  if (!sorting || sorting.length === 0) {
    return 'creation desc';
  }

  const sort = sorting[0];
  const backendField = mapColumnIdToBackendField(sort.id);
  const direction = sort.desc ? 'desc' : 'asc';
  return `${backendField} ${direction}`;
};

const OccupancyHistoryTable = forwardRef(
  (
    {
      data = [],
      spaceId,
      isPureRentalSpace = false,
      isParkingSpace = false,
      onRowClick,
      onSortingChange,
      sorting = [],
      isLoading = false,
      isFetchingMore = false,
      hasMore = false,
      onLoadMore,
      tableId = SPACE_DETAIL_OCCUPANCY_TABLE_ID,
      groupBy = '',
      groupOrder = 'asc',
      centerName = '',
      isApiGrouped = false,
    },
    ref,
  ) => {
    const [localSorting, setLocalSorting] = useState(sorting);
    const sentinelRef = useRef(null);

    // Sync local sorting with prop
    useEffect(() => {
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

    // Intersection observer for scroll-based pagination
    useEffect(() => {
      const sentinel = sentinelRef.current;
      if (!sentinel || !onLoadMore || !hasMore || isApiGrouped) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !isFetchingMore && !isLoading) {
            onLoadMore();
          }
        },
        { threshold: 0.1 },
      );

      observer.observe(sentinel);
      return () => observer.disconnect();
    }, [onLoadMore, hasMore, isFetchingMore, isLoading, isApiGrouped]);

    const isParking = useMemo(() => {
      if (isParkingSpace) return true;
      const t = String(data?.[0]?.inventory_type ?? data?.[0]?._original?.inventory_type ?? '');
      return t.toLowerCase().includes('park');
    }, [isParkingSpace, data]);

    // Create column definitions for TanStack Table
    const allColumnDefs = useMemo(() => {
      const columns = OCCUPANCY_HISTORY_DEFAULT_COLUMNS;

      let filteredColumns = columns;
      if (isPureRentalSpace) {
        filteredColumns = (columns || [])
          .filter((c) => c?.id !== 'total_credits')
          .map((c) => {
            if (c?.id === 'price_per_seat') {
              return {
                ...c,
                id: 'total_carpet_area',
                label: 'Agreement Carpet Area',
                visible: true,
              };
            }
            return c;
          });
      } else if (isParking) {
        filteredColumns = (columns || []).map((c) =>
          c?.id === 'total_credits'
            ? { ...c, id: 'assign_parking_details', label: 'Assign Parking Details' }
            : c,
        );
      }

      // Define which columns are sortable
      const sortableColumns = ['total_credits', 'price_per_seat', 'total_price', 'assigned_seats'];

      return filteredColumns.map((col) => {
        const isSortable = sortableColumns.includes(col.id);

        const columnDef = {
          id: col.id,
          accessorKey: col.id,
          columnLabel: col.label || col.id,
          enableSorting: isSortable,
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-0.5'>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                  {col.label || col.id}
                </span>
                {isSortable && (
                  <button
                    type='button'
                    className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                    onClick={() => column.toggleSorting(sortState === 'asc')}
                    aria-label={`Sort by ${col.label} ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                  >
                    {Table.getSortingIcon(sortState)}
                  </button>
                )}
              </div>
            );
          },
          cell: ({ row }) => {
            const value = row.original[col.id];

            if (col.id === 'client_name') {
              return (
                <button
                  type='button'
                  className='text-paragraph-sm text-text-strong-950 hover:text-primary-base transition-colors cursor-pointer underline-offset-2 hover:underline'
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onRowClick) {
                      onRowClick(row.original, data.indexOf(row.original));
                    }
                  }}
                >
                  {value ?? '--'}
                </button>
              );
            }

            if (col.id === 'status') {
              const statusText = String(value || '--');
              const { label, color } = getSpaceStatusBadge(statusText);
              return (
                <Badge.Root size='small' variant='light' color={color}>
                  {label}
                </Badge.Root>
              );
            }

            if (col.id === 'assign_parking_details') {
              return (
                <AssignParkingBadges
                  labels={parseParkingLabels(
                    row.original.assign_sub_spaces ?? row.original._original?.assign_sub_spaces,
                  )}
                />
              );
            }

            if (col.id === 'total_carpet_area') {
              return (
                <span className='text-paragraph-sm text-text-sub-600'>
                  {value !== undefined && value !== null && value !== '' ? `${value} sq.ft.` : '--'}
                </span>
              );
            }

            return <span className='text-paragraph-sm text-text-sub-600'>{value ?? '--'}</span>;
          },
        };

        return columnDef;
      });
    }, [data, onRowClick, isPureRentalSpace, isParking]);

    const defaultColumnConfig = useMemo(
      () => prepareColumnsForConfig(allColumnDefs),
      [allColumnDefs],
    );

    const persistColumnConfig = useCallback(async (cols) => {
      try {
        localStorage.setItem(OCCUPANCY_COLUMN_CONFIG_STORAGE_KEY, JSON.stringify(cols));
      } catch (error) {
        console.error('Failed to save occupancy history column preferences', error);
      }
    }, []);

    const fetchColumnConfig = useCallback(async () => {
      try {
        const raw = localStorage.getItem(OCCUPANCY_COLUMN_CONFIG_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : parsed?.columns || [];
      } catch {
        return [];
      }
    }, []);

    const columnConfigHook = useColumnConfig(
      tableId,
      defaultColumnConfig,
      persistColumnConfig,
      fetchColumnConfig,
      { autoSave: true, debounce: 300 },
    );

    const visibleColumnDefs = useMemo(
      () => applyColumnConfig(allColumnDefs, columnConfigHook.columns),
      [allColumnDefs, columnConfigHook.columns],
    );

    const tableData = useMemo(() => {
      if (!groupBy || isApiGrouped) return data;
      return [...data].sort((a, b) => {
        const ka = String(getOccupancyGroupKey(a, groupBy, centerName));
        const kb = String(getOccupancyGroupKey(b, groupBy, centerName));
        const c = ka.localeCompare(kb, undefined, { sensitivity: 'base' });
        if (c !== 0) return groupOrder === 'asc' ? c : -c;
        const na = a.client_name || '';
        const nb = b.client_name || '';
        return String(na).localeCompare(String(nb), undefined, { sensitivity: 'base' });
      });
    }, [data, groupBy, groupOrder, centerName, isApiGrouped]);

    const groupByColumnLabel = useMemo(
      () => OCCUPANCY_GROUP_BY_OPTIONS.find((o) => o.value === groupBy)?.label || groupBy,
      [groupBy],
    );

    const table = useReactTable({
      data: tableData,
      columns: visibleColumnDefs,
      state: {
        sorting: localSorting,
      },
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      manualSorting: true, // Backend sorting
      enableSortingRemoval: true,
    });

    // Expose column config to parent via ref
    useImperativeHandle(ref, () => ({
      columnConfigHook,
    }));

    return (
      <div className='mt-4 rounded-xl bg-bg-white-0 overflow-hidden'>
        <div className='w-full overflow-x-auto'>
          <Table.Root variant='compact' className='w-full'>
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
            <Table.Body spacing={8}>
              {isLoading ? (
                <Table.Row>
                  <Table.Cell colSpan={999} className='h-28'>
                    <div className='flex flex-col items-center justify-center gap-1 py-6'>
                      <p className='text-label-sm text-text-strong-950'>Loading...</p>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ) : table.getRowModel().rows.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={999} className='h-28'>
                    <div className='flex flex-col items-center justify-center gap-1 py-6'>
                      <p className='text-label-sm text-text-strong-950'>
                        No occupancy records found
                      </p>
                      <p className='text-paragraph-xs text-text-sub-600'>
                        No allocated spaces for this space yet.
                      </p>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ) : (
                table.getRowModel().rows.map((row, i, rows) => {
                  const gkey = groupBy
                    ? String(getOccupancyGroupKey(row.original, groupBy, centerName))
                    : '';
                  const prevKey =
                    i > 0 && groupBy
                      ? String(getOccupancyGroupKey(rows[i - 1].original, groupBy, centerName))
                      : null;
                  const showGroupHeader = Boolean(groupBy) && (i === 0 || gkey !== prevKey);

                  return (
                    <React.Fragment key={row.id}>
                      {showGroupHeader && (
                        <Table.Row className='bg-bg-weak-50 hover:bg-bg-weak-50'>
                          <Table.Cell
                            colSpan={visibleColumnDefs.length}
                            className='py-2 border-b border-stroke-soft-200'
                          >
                            <span className='label-small text-text-sub-600'>
                              {groupByColumnLabel}:{' '}
                              <span className='font-semibold text-text-strong-950'>{gkey}</span>
                            </span>
                          </Table.Cell>
                        </Table.Row>
                      )}
                      <Table.Row
                        className='cursor-pointer hover:bg-bg-weak-50'
                        onClick={() => {
                          if (onRowClick) {
                            onRowClick(row.original, data.indexOf(row.original));
                          }
                        }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <Table.Cell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </Table.Cell>
                        ))}
                      </Table.Row>
                      {i < rows.length - 1 && <Table.RowDivider />}
                    </React.Fragment>
                  );
                })
              )}
              {isFetchingMore && (
                <Table.Row>
                  <Table.Cell colSpan={999}>
                    <div className='flex items-center justify-center py-3'>
                      <p className='text-paragraph-xs text-text-sub-600'>Loading more...</p>
                    </div>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        </div>
        {/* Scroll sentinel — triggers onLoadMore when visible */}
        <div ref={sentinelRef} className='h-1' aria-hidden='true' />
      </div>
    );
  },
);

OccupancyHistoryTable.displayName = 'OccupancyHistoryTable';

export default OccupancyHistoryTable;
export { convertSortingToOrderBy };
