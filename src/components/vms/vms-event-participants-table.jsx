import React, { useMemo, useCallback, useEffect } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RiDeleteBinLine, RiErrorWarningLine } from 'react-icons/ri';

import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import * as CompactButton from '@/components/ui/compact-button';
import * as Tooltip from '@/components/ui/tooltip';
import { VmsFirstNameCell } from '@/components/vms/vms-first-name-cell';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import VmsRemoveModal from '@/components/vms/vms-remove-modal';
import { EMPTY_SORTING, getStatusColor } from '@/components/vms/constants';

const VmsEventParticipantsTable = React.forwardRef(
  (
    {
      rows = [],
      isLoading = false,
      error = null,
      onRetry,
      onDelete,
      onRowClick,
      sorting = EMPTY_SORTING,
      onSortingChange,
      tableId = 'vms-event-participants-table',
      variant = 'compact',
      onColumnConfigHookChange,
    },
    ref,
  ) => {
    const [localSorting, setLocalSorting] = React.useState(sorting);
    const [removeModalRow, setRemoveModalRow] = React.useState(null);

    React.useEffect(() => {
      setLocalSorting(sorting);
    }, [sorting]);

    const handleSortingChange = useCallback(
      (updaterOrValue) => {
        const newSorting =
          typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;
        setLocalSorting(newSorting);
        onSortingChange?.(newSorting);
      },
      [localSorting, onSortingChange],
    );

    const allColumnDefs = useMemo(
      () => [
        {
          id: 'name',
          accessorKey: 'name',
          columnLabel: 'Name',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5 text-nowrap'>
                <span className='text-paragraph-sm text-text-sub-600'>Name</span>
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
          cell: ({ row }) => <VmsFirstNameCell row={row} nameVariant='full' />,
          enableSorting: true,
        },
        {
          id: 'mobile_number',
          accessorKey: 'mobile_number',
          columnLabel: 'Mobile Number',
          header: () => <div className='flex items-center text-nowrap'>Mobile Number</div>,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.mobile_number || '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'email_id',
          accessorKey: 'email_id',
          columnLabel: 'Email ID',
          header: () => <div className='flex items-center text-nowrap'>Email ID</div>,
          cell: ({ row }) => (
            <Tooltip.Root size='xsmall'>
              <Tooltip.Trigger asChild>
                <span className='paragraph-small text-text-sub-600 text-nowrap max-w-[180px] block overflow-hidden text-ellipsis'>
                  {row.original.email_id || '--'}
                </span>
              </Tooltip.Trigger>
              {row.original.email_id && (
                <Tooltip.Content size='xsmall'>{row.original.email_id}</Tooltip.Content>
              )}
            </Tooltip.Root>
          ),
          enableSorting: false,
        },
        {
          id: 'visitor_company',
          accessorKey: 'visitor_company',
          columnLabel: 'Visitor Company Name',
          header: () => <div className='flex items-center text-nowrap'>Visitor Company Name</div>,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.visitor_company || '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'center',
          accessorKey: 'center',
          columnLabel: 'Center',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5 text-nowrap'>
                <span className='text-paragraph-sm text-text-sub-600'>Center</span>
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
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.center || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'type',
          accessorKey: 'type',
          columnLabel: 'Type',
          header: () => <div className='flex items-center text-nowrap'>Type</div>,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.type || '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'no_of_visitors',
          accessorKey: 'no_of_visitors',
          columnLabel: 'No. of Visitors',
          header: () => <div className='flex items-center text-nowrap'>No. of Visitors</div>,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.no_of_visitors ?? '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'vehicle_no',
          accessorKey: 'vehicle_no',
          columnLabel: 'Vehicle No.',
          header: () => <div className='flex items-center text-nowrap'>Vehicle No.</div>,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.vehicle_no || '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'badge_no',
          accessorKey: 'badge_no',
          columnLabel: 'Badge No.',
          header: () => <div className='flex items-center text-nowrap'>Badge No.</div>,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.badge_no || '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'event',
          accessorKey: 'event',
          columnLabel: 'Event',
          header: () => <div className='flex items-center text-nowrap'>Event</div>,
          cell: ({ row }) => (
            <Badge.Root variant='stroke' className='text-nowrap'>
              {row.original.event || '--'}
            </Badge.Root>
          ),
          enableSorting: false,
        },
        {
          id: 'visit_date_time',
          accessorKey: 'visit_date_time',
          columnLabel: 'Visit Date & Time',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5 text-nowrap'>
                <span className='text-paragraph-sm text-text-sub-600'>Visit Date &amp; Time</span>
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
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.visit_date_time || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'status',
          accessorKey: 'status',
          columnLabel: 'Status',
          header: () => <div className='flex items-center text-nowrap'>Status</div>,
          cell: ({ row }) => {
            const { status } = row.original;
            if (!status) return <span className='paragraph-small text-text-sub-400'>--</span>;
            return (
              <Badge.Root variant='light' color={getStatusColor(status)} className='text-nowrap'>
                {status}
              </Badge.Root>
            );
          },
          enableSorting: false,
        },
        {
          id: 'check_in_date_time',
          accessorKey: 'check_in_date_time',
          columnLabel: 'Check In Date & Time',
          header: () => (
            <div className='flex items-center text-nowrap'>Check In Date &amp; Time</div>
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.check_in_date_time || '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'check_out_date_time',
          accessorKey: 'check_out_date_time',
          columnLabel: 'Check Out Date & Time',
          header: () => (
            <div className='flex items-center text-nowrap'>Check Out Date &amp; Time</div>
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.check_out_date_time || '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'duration',
          accessorKey: 'duration',
          columnLabel: 'Duration',
          header: () => <div className='flex items-center text-nowrap'>Duration</div>,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 text-nowrap'>
              {row.original.duration || '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'notes',
          accessorKey: 'notes',
          columnLabel: 'Notes',
          header: () => <div className='flex items-center text-nowrap'>Notes</div>,
          cell: ({ row }) => (
            <Tooltip.Root size='xsmall'>
              <Tooltip.Trigger asChild>
                <span className='paragraph-small text-text-sub-600 text-nowrap max-w-[180px] block overflow-hidden text-ellipsis'>
                  {row.original.notes || '--'}
                </span>
              </Tooltip.Trigger>
              {row.original.notes && (
                <Tooltip.Content size='xsmall'>{row.original.notes}</Tooltip.Content>
              )}
            </Tooltip.Root>
          ),
          enableSorting: false,
        },
        // {
        //   id: 'actions',
        //   enableHiding: false,
        //   header: () => <div className='invisible'>A</div>,
        //   cell: ({ row }) => (
        //     <div className='flex items-center justify-end'>
        //       <CompactButton.Root
        //         type='button'
        //         variant='error'
        //         onClick={(e) => {
        //           e.stopPropagation();
        //           setRemoveModalRow(row.original);
        //         }}
        //         aria-label='Delete event participant'
        //       >
        //         <CompactButton.Icon as={RiDeleteBinLine} />
        //       </CompactButton.Root>
        //     </div>
        //   ),
        //   enableSorting: false,
        //   meta: {
        //     headClassName: 'sticky right-0 z-10 bg-bg-weak-50',
        //     cellClassName: 'border-stroke-soft-200 sticky right-0 z-10 bg-white',
        //   },
        // },
      ],
      [onDelete],
    );

    const defaultColumnConfig = useMemo(() => {
      const configurableColumns = allColumnDefs.filter((col) => col.id !== 'actions');
      const config = prepareColumnsForConfig(configurableColumns);

      const defaultVisible = [
        'name',
        'mobile_number',
        'email_id',
        'visitor_company',
        'center',
        'type',
        'no_of_visitors',
        'event',
        'visit_date_time',
        'status',
        'check_in_date_time',
        'check_out_date_time',
        'duration',
      ];

      const configMap = new Map(config.map((col) => [col.id, col]));

      config.forEach((col) => {
        if (col.enableHiding !== false) {
          col.visible = false;
        }
      });

      defaultVisible.forEach((colId, index) => {
        const col = configMap.get(colId);
        if (col) {
          col.visible = true;
          col.order = index;
        }
      });

      let hiddenOrder = defaultVisible.length;
      config.forEach((col) => {
        if (!col.visible) {
          col.order = hiddenOrder++;
        }
      });

      return config.sort((a, b) => a.order - b.order);
    }, [allColumnDefs]);

    const internalColumnConfigHook = useColumnConfig(tableId, defaultColumnConfig);

    const {
      columns: columnConfig,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    } = internalColumnConfigHook;

    const columnConfigHookValue = useMemo(
      () => ({
        columns: columnConfig,
        reorderColumns,
        toggleColumnVisibility,
        showAllColumns,
        hideAllColumns,
        resetToDefault,
      }),
      [
        columnConfig,
        reorderColumns,
        toggleColumnVisibility,
        showAllColumns,
        hideAllColumns,
        resetToDefault,
      ],
    );

    useEffect(() => {
      onColumnConfigHookChange?.(columnConfigHookValue);
    }, [columnConfigHookValue, onColumnConfigHookChange]);

    React.useImperativeHandle(ref, () => ({
      columnConfigHook: columnConfigHookValue,
    }));

    const actionsColumn = useMemo(
      () => allColumnDefs.find((col) => col.id === 'actions'),
      [allColumnDefs],
    );

    const columns = useMemo(() => {
      const configurableColumnDefs = allColumnDefs.filter((col) => col.id !== 'actions');
      const configuredColumns = applyColumnConfig(configurableColumnDefs, columnConfig);
      return actionsColumn ? [...configuredColumns, actionsColumn] : configuredColumns;
    }, [allColumnDefs, columnConfig, actionsColumn]);

    const table = useReactTable({
      data: rows,
      columns,
      state: {
        sorting: localSorting,
        columnPinning: {
          left: ['name'],
        },
      },
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      manualSorting: true,
      enableSortingRemoval: true,
    });

    if (error) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
            <RiErrorWarningLine className='size-6 text-error-base' />
          </div>
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>
            Unable to Load Event Participants
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

    if (!isLoading && rows.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>
            No Event Participants Found
          </h3>
          <p className='max-w-md text-sm text-text-sub-600'>
            No event participant records match your current filters.
          </p>
        </div>
      );
    }

    const renderSkeleton = () => (
      <Table.Body>
        {Array.from({ length: 6 }).map((_, index, array) => (
          <React.Fragment key={`skeleton-${index}`}>
            <Table.Row>
              {(table.getHeaderGroups()[0]?.headers ?? []).map((header) => (
                <Table.Cell key={header.id} column={header.column}>
                  <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                </Table.Cell>
              ))}
            </Table.Row>
            {index < array.length - 1 && <Table.RowDivider />}
          </React.Fragment>
        ))}
      </Table.Body>
    );

    return (
      <div className='w-full'>
        <Table.Root variant={variant} tableInstance={table} className='overflow-auto'>
          <Table.Header className='sticky top-0 z-30 bg-bg-weak-50'>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Head
                    key={header.id}
                    column={header.column}
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

          {isLoading && rows.length === 0 ? (
            renderSkeleton()
          ) : (
            <Table.Body>
              {table.getRowModel().rows.map((row, i, allRows) => (
                <React.Fragment key={row.id}>
                  <Table.Row
                    className={onRowClick ? 'cursor-pointer' : undefined}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell
                        key={cell.id}
                        column={cell.column}
                        className={cell.column.columnDef.meta?.cellClassName}
                        onClick={(e) => {
                          if (cell.column.id === 'actions') {
                            e.stopPropagation();
                          }
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                  {i < allRows.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))}
            </Table.Body>
          )}
        </Table.Root>

        <VmsRemoveModal
          open={!!removeModalRow}
          onOpenChange={(open) => !open && setRemoveModalRow(null)}
          title='Remove event participant?'
          description='Are you sure you want to remove this event participant? This action cannot be undone.'
          onConfirm={() => {
            if (removeModalRow) onDelete?.(removeModalRow);
            setRemoveModalRow(null);
          }}
        />
      </div>
    );
  },
);

VmsEventParticipantsTable.displayName = 'VmsEventParticipantsTable';

export default VmsEventParticipantsTable;
