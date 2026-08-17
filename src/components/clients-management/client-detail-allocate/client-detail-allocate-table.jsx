import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import * as Table from '@/components/ui/table';
import { cn } from '@/utils/cn';
import * as Badge from '@/components/ui/badge';
import { getSpaceTypeBadge, getSpaceStatusBadge } from '@/components/space-management/constants';
import { hasStatusBadgeColor, StatusColorPill } from '@/components/ui/status-color-pill';
import { SPACE_TYPE } from '@/components/clients-management/constants';

const ClientDetailAllocateTable = ({ data = [], variant = 'compact' }) => {
  const [localSorting, setLocalSorting] = useState([]);

  const handleSortingChange = (updaterOrValue) => {
    const newSorting =
      typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;
    setLocalSorting(newSorting);
  };

  // Flatten structure
  const tableData = useMemo(() => {
    if (!data) return [];

    // Case 1: If data already contains results directly
    const results = data.results || data.message?.results || data;

    if (!Array.isArray(results)) return [];

    return results.flatMap((center) =>
      (center.assigned_spaces || []).map((space) => ({
        center_name: center.center_name,
        ...space,
      })),
    );
  }, [data]);

  const isPureRentalOnly = useMemo(() => {
    if (tableData.length === 0) return false;
    return tableData.every((row) => row.space_type === SPACE_TYPE.PURE_RENTAL);
  }, [tableData]);

  const columns = useMemo(() => {
    const base = [
      {
        id: 'space_name',
        accessorKey: 'space_name',
        header: 'Space Name',
      },

      {
        id: 'space_type',
        accessorKey: 'space_type',
        header: ({ column }) => {
          const sortState = column.getIsSorted();
          return (
            <div className='flex items-center gap-1.5'>
              <span>Resource Type</span>
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
        cell: ({ row }) => {
          const typeBadge = getSpaceTypeBadge(row.original.space_type);

          return typeBadge ? (
            <Badge.Root variant='light' color={typeBadge.color} size='small'>
              {typeBadge.label}
            </Badge.Root>
          ) : (
            <span className='text-text-sub-500'>--</span>
          );
        },
      },
      ...(!isPureRentalOnly
        ? [
            {
              id: 'assigned_seats',
              accessorKey: 'assigned_seats',
              header: ({ column }) => {
                const sortState = column.getIsSorted();
                return (
                  <div className='flex items-center gap-1.5'>
                    <span>Seats</span>
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
                <span className='text-text-main-900'>{row.original.assigned_seats ?? '--'}</span>
              ),
            },
          ]
        : []),

      {
        id: 'center_name',
        accessorKey: 'center_name',
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
          <div className='flex items-center gap-2'>
            <span className='text-paragraph-sm text-text-main-900'>
              {row.original.center_name || '-'}
            </span>
          </div>
        ),
      },

      {
        id: 'lease_duration',
        accessorKey: 'lease_duration',
        header: 'Lease Duration',
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <span className='text-paragraph-sm text-text-main-900'>
              {row.original.lease_duration || '-'}
            </span>
          </div>
        ),
      },

      ...(!isPureRentalOnly
        ? [
            {
              id: 'rate_per_seat',
              accessorKey: 'rate_per_seat',
              header: 'Rate Per Seat (₹)',
              cell: ({ row }) => (
                <span className='text-text-main-900'>
                  {Number(row.original.rate_per_seat || 0).toLocaleString('en-IN')}
                </span>
              ),
            },
          ]
        : []),

      {
        id: 'total_rate',
        accessorKey: 'total_rate',
        header: 'Total Rate (₹)',
        cell: ({ row }) => (
          <div className='flex items-center gap-1'>
            <span className='text-text-main-900'>
              {Number(row.original.total_rate || 0).toLocaleString('en-IN')}
            </span>
          </div>
        ),
      },

      {
        id: 'total_carpet_sft',
        accessorKey: 'total_carpet_sft',
        header: 'Agreement Carpet Area',
        cell: ({ row }) =>
          row.original.space_type === SPACE_TYPE.PURE_RENTAL ? (
            <span className='text-text-main-900'>
              {row.original.total_carpet_area !== undefined &&
              row.original.total_carpet_area !== null
                ? `${row.original.total_carpet_area} sq.ft.`
                : row.original.total_carpet_sft !== undefined &&
                    row.original.total_carpet_sft !== null
                  ? `${row.original.total_carpet_sft} sq.ft.`
                  : '--'}
            </span>
          ) : (
            <span className='text-text-sub-500'>--</span>
          ),
      },

      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const { status } = row.original;
          if (!status) {
            return <span className='text-text-sub-500'>--</span>;
          }
          const statusColorRaw = row.original.status_color || row.original.statusColor;
          if (hasStatusBadgeColor(statusColorRaw)) {
            return (
              <StatusColorPill value={status} color={statusColorRaw} className='max-w-[140px]' />
            );
          }
          const statusBadge = getSpaceStatusBadge(status);
          return (
            <Badge.Root variant='light' color={statusBadge.color} size='small'>
              {statusBadge.label}
            </Badge.Root>
          );
        },
      },
    ];

    return base;
  }, [isPureRentalOnly]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting: localSorting },
    onSortingChange: handleSortingChange,
    enableSortingRemoval: true, // allows removing sorting by clicking again
  });

  if (tableData.length === 0) {
    return (
      <div className='w-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
        <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>No Spaces Found</h3>
        <p className='max-w-md text-sm text-text-sub-600'>
          This client has no allocated spaces yet.
        </p>
      </div>
    );
  }

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
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </Table.Head>
              ))}
            </Table.Row>
          ))}
        </Table.Header>

        <Table.Body>
          {table.getRowModel().rows.map((row, i, rows) => (
            <React.Fragment key={row.id}>
              <Table.Row>
                {row.getVisibleCells().map((cell) => (
                  <Table.Cell
                    key={cell.id}
                    className={cn(cell.column.columnDef.meta?.cellClassName, 'whitespace-nowrap')}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Cell>
                ))}
              </Table.Row>

              {i < rows.length - 1 && <Table.RowDivider />}
            </React.Fragment>
          ))}
        </Table.Body>
      </Table.Root>
    </div>
  );
};

export default ClientDetailAllocateTable;
