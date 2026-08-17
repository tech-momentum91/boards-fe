import React, { useMemo, useState, useImperativeHandle, forwardRef } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RiArrowDownSFill, RiErrorWarningLine, RiAddLine } from 'react-icons/ri';
import * as Table from '@/components/ui/table';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
import {
  AGREEMENTS_EMPTY_STATES,
  getMembershipBadge,
  getStatusBadge,
} from '@/components/agreements/constants';
import * as Dropdown from '@/components/ui/dropdown';
import { cn } from '@/utils/cn';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import { useDispatch } from 'react-redux';
import {
  fetchPendingAgreementColumnList,
  updatePendingAgreementColumnList,
} from '@/redux/agreementsSlice';

const PENDING_TABLE_ID = 'agreements-pending-table';

/** Split create control: primary label + menu (Create agreement, Create Amendment). */
function PendingRowCreateSplit({ primaryLabel = 'Create', onCreateAgreement, onCreateAmendment }) {
  if (!onCreateAmendment) {
    return (
      <Button.Root
        type='button'
        variant='neutral'
        mode='stroke'
        size='small'
        onClick={onCreateAgreement}
        className='gap-2'
      >
        {primaryLabel}
      </Button.Root>
    );
  }
  return (
    <Dropdown.Root>
      <div className='inline-flex overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'>
        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='small'
          onClick={onCreateAmendment}
          className='rounded-none border-0 shadow-none ring-0 gap-2'
        >
          {primaryLabel}
        </Button.Root>
        <Dropdown.Trigger asChild>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            className='rounded-none border-0 border-l border-stroke-soft-200 px-2 shadow-none ring-0'
            aria-label='More create options'
          >
            <RiArrowDownSFill className='size-4 text-text-sub-600' />
          </Button.Root>
        </Dropdown.Trigger>
      </div>
      <Dropdown.Content align='end' className='min-w-[200px]'>
        {onCreateAmendment ? (
          <Dropdown.Item onSelect={onCreateAmendment}>
            <RiAddLine className='text-primary-base' /> Amendment
          </Dropdown.Item>
        ) : null}
        <Dropdown.Item onSelect={onCreateAgreement}>
          <RiAddLine className='text-primary-base' /> Agreement
        </Dropdown.Item>
      </Dropdown.Content>
    </Dropdown.Root>
  );
}

function pendingPrimaryLabel(row) {
  if (row.primaryActionLabel) return row.primaryActionLabel;
  if (row.actionVariant === 'icon') return 'Create Agreement';
  return 'Create';
}

const PENDING_DEFAULT_COLUMNS = prepareColumnsForConfig([
  { id: 'client', columnLabel: 'Client', enableHiding: true },
  { id: 'center', columnLabel: 'Center', enableHiding: true },
  { id: 'space', columnLabel: 'Space', enableHiding: true },
  { id: 'membershipPlan', columnLabel: 'Membership Plan', enableHiding: true },
  { id: 'status', columnLabel: 'Status', enableHiding: true },
  { id: 'assignedSeats', columnLabel: 'No. of seats', enableHiding: true },
  { id: 'objective', columnLabel: 'Start - End Date', enableHiding: true },
]);

/**
 * Pending list table (mock rows). Exposes columnConfigHook for AgreementsPendingToolbar.
 */
const AgreementsPendingTable = forwardRef(
  (
    {
      rows = [],
      groupBy = 'none',
      onLoadMore,
      hasMore = false,
      isLoading = false,
      isLoadingMore = false,
      enableScrollPagination = false,
      emptyStateContext = 'default',
      error = null,
      onRetry,
    },
    ref,
  ) => {
    const [sorting, setSorting] = useState([]);
    const dispatch = useDispatch();

    const columnConfigHook = useColumnConfig(
      PENDING_TABLE_ID,
      PENDING_DEFAULT_COLUMNS,
      (cols) => dispatch(updatePendingAgreementColumnList(cols)).unwrap(),
      () => dispatch(fetchPendingAgreementColumnList()).unwrap(),
      { autoSave: true, debounce: 300 },
    );

    useImperativeHandle(ref, () => ({ columnConfigHook }), [columnConfigHook]);

    const allColumnDefs = useMemo(
      () => [
        {
          id: 'client',
          accessorKey: 'client',
          columnLabel: 'Client',
          header: ({ column }) => <Table.SortableHeader column={column} label='Client' sortable />,
          cell: ({ row }) => (
            <span className='text-paragraph-sm text-text-strong-950'>{row.original.client}</span>
          ),
          enableSorting: true,
        },
        {
          id: 'center',
          accessorKey: 'center',
          columnLabel: 'Center',
          header: ({ column }) => <Table.SortableHeader column={column} label='Center' sortable />,
          cell: ({ row }) => (
            <span className='text-paragraph-sm text-text-strong-950'>{row.original.center}</span>
          ),
          enableSorting: true,
        },
        {
          id: 'space',
          accessorKey: 'primarySpaceLabel',
          columnLabel: 'Space',
          header: () => <Table.SortableHeader label='Space' />,
          cell: ({ row }) => (
            <div className='flex flex-nowrap items-center gap-2'>
              <span
                className={cn(
                  'inline-flex max-w-[220px] truncate rounded-lg border border-stroke-soft-200',
                  'bg-bg-white-0 px-2.5 py-1 text-paragraph-sm text-text-sub-600',
                )}
              >
                {row.original.primarySpaceLabel}
              </span>
              {row.original.extraSpaceCount > 0 ? (
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <span className='inline-flex h-6 min-w-6 shrink-0 cursor-default items-center justify-center rounded-full bg-bg-weak-100 px-1.5 text-label-xs text-text-sub-600'>
                      +{row.original.extraSpaceCount}
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
                    <div className='flex flex-col gap-1'>
                      <span className='text-paragraph-sm font-medium text-text-strong-950 mb-1'>
                        Additional Spaces ({row.original.extraSpaceCount})
                      </span>
                      <div className='flex flex-col gap-1'>
                        {(row.original.extraSpaceNames || []).map((spaceName, index) => (
                          <div
                            key={`${spaceName}-${index}`}
                            className='text-paragraph-sm text-text-sub-600'
                          >
                            {spaceName}
                          </div>
                        ))}
                      </div>
                    </div>
                  </Tooltip.Content>
                </Tooltip.Root>
              ) : null}
            </div>
          ),
          enableSorting: false,
        },
        {
          id: 'membershipPlan',
          accessorKey: 'membershipPlan',
          columnLabel: 'Membership Plan',
          header: () => <Table.SortableHeader label='Membership Plan' />,
          cell: ({ row }) => {
            const raw = row.original.membership_plan;
            const plans = Array.isArray(raw) ? raw : raw ? [raw] : [];
            const first = plans[0] || '--';
            const extraCount = Math.max(0, plans.length - 1);
            const firstBadge = getMembershipBadge(first);

            return (
              <div className='flex items-center gap-2'>
                <Badge.Root
                  size='small'
                  variant='light'
                  color={firstBadge.color}
                  className='whitespace-nowrap'
                >
                  {firstBadge.label}
                </Badge.Root>

                {extraCount > 0 && (
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <Badge.Root size='small' variant='lighter' color='gray'>
                        <span className='text-label-xs whitespace-nowrap'>+{extraCount}</span>
                      </Badge.Root>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <div className='flex flex-col gap-1'>
                        {plans.map((p) => {
                          const b = getMembershipBadge(p);
                          return (
                            <Badge.Root
                              key={p}
                              size='small'
                              variant='light'
                              color={b.color}
                              className='whitespace-nowrap'
                            >
                              {b.label}
                            </Badge.Root>
                          );
                        })}
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                )}
              </div>
            );
          },
          enableSorting: false,
        },
        {
          id: 'status',
          accessorKey: 'status',
          columnLabel: 'Status',
          header: () => <Table.SortableHeader label='Status' />,
          cell: ({ row }) => {
            const raw = row.original.status;
            const statuses = Array.isArray(raw) ? raw : raw ? [raw] : [];
            const first = statuses[0] || '--';
            const extraCount = Math.max(0, statuses.length - 1);
            const firstBadge = getStatusBadge(first);

            return (
              <div className='flex items-center gap-2'>
                <Badge.Root
                  size='small'
                  variant='light'
                  color={firstBadge.color}
                  className='whitespace-nowrap'
                >
                  {firstBadge.label}
                </Badge.Root>

                {extraCount > 0 && (
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <Badge.Root size='small' variant='lighter' color='gray'>
                        <span className='text-label-xs whitespace-nowrap'>+{extraCount}</span>
                      </Badge.Root>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <div className='flex flex-col gap-1'>
                        {statuses.map((s) => {
                          const b = getStatusBadge(s);
                          return (
                            <Badge.Root
                              key={s}
                              size='small'
                              variant='light'
                              color={b.color}
                              className='whitespace-nowrap'
                            >
                              {b.label}
                            </Badge.Root>
                          );
                        })}
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                )}
              </div>
            );
          },
          enableSorting: false,
        },
        {
          id: 'assignedSeats',
          accessorKey: 'assignedSeats',
          columnLabel: 'No. of seats',
          header: () => <Table.SortableHeader label='No. of seats' />,
          cell: ({ row }) => (
            <span className='text-paragraph-sm text-text-sub-600'>
              {row.original.assignedSeats}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'objective',
          accessorKey: 'objective',
          columnLabel: 'Start - End Date',
          header: () => <Table.SortableHeader label='Start - End Date' />,
          cell: ({ row }) => (
            <span className='text-paragraph-sm text-text-sub-600'>{row.original.objective}</span>
          ),
          enableSorting: false,
        },
      ],
      [],
    );

    const visibleDefs = useMemo(
      () => applyColumnConfig(allColumnDefs, columnConfigHook.columns),
      [allColumnDefs, columnConfigHook.columns],
    );

    const columnsWithActions = useMemo(
      () => [
        ...visibleDefs,
        {
          id: 'actions',
          enableHiding: false,
          enableSorting: false,
          header: () => <span className='sr-only'>Actions</span>,
          cell: ({ row }) => (
            <PendingRowCreateSplit
              primaryLabel={pendingPrimaryLabel(row.original)}
              onCreateAgreement={row.original.onCreateAgreement}
              onCreateAmendment={row.original.onCreateAmendment}
            />
          ),
        },
      ],
      [visibleDefs],
    );

    const table = useReactTable({
      data: rows,
      columns: columnsWithActions,
      state: { sorting },
      onSortingChange: setSorting,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getRowId: (row) => row.id,
      enableSortingRemoval: true,
    });

    const groupField = groupBy === 'client' ? 'client' : groupBy === 'center' ? 'center' : null;
    const colSpan = Math.max(columnsWithActions.length, 1);

    const dataRows = table.getRowModel().rows;

    const { renderSentinel } = useScrollPagination({
      onLoadMore: onLoadMore || (() => {}),
      hasMore: Boolean(hasMore) && Boolean(enableScrollPagination),
      isLoading: Boolean(isLoading) || Boolean(isLoadingMore),
      threshold: 200,
      scrollContainer: null,
      enabled: Boolean(enableScrollPagination) && Boolean(onLoadMore),
    });

    if (error) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
            <RiErrorWarningLine className='size-6 text-error-base' />
          </div>
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>
            Unable to load pending agreements
          </h3>
          <p className='mb-4 text-sm text-error-darker/80'>{error}</p>
          {onRetry && (
            <Button.Root variant='error' mode='filled' size='small' onClick={onRetry}>
              Try again
            </Button.Root>
          )}
        </div>
      );
    }

    if (!isLoading && rows.length === 0) {
      const state = AGREEMENTS_EMPTY_STATES[emptyStateContext] || AGREEMENTS_EMPTY_STATES.default;
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{state.title}</h3>
          <p className='max-w-md text-sm text-text-sub-600'>{state.description}</p>
        </div>
      );
    }

    const renderSkeletonBody = () => (
      <Table.Body spacing={8}>
        {Array.from({ length: 6 }).map((_, index, array) => (
          <React.Fragment key={`pending-skeleton-${index}`}>
            <Table.Row>
              {columnsWithActions.map((column) => (
                <Table.Cell key={column.id || column.accessorKey}>
                  <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                </Table.Cell>
              ))}
            </Table.Row>
            {index < array.length - 1 ? <Table.RowDivider /> : null}
          </React.Fragment>
        ))}
      </Table.Body>
    );

    return (
      <div className='flex-1 min-h-0 flex flex-col w-full h-full rounded-xl bg-bg-white-0 shadow-regular-xs'>
        <Table.Root className='min-h-0 flex-1 overflow-auto' stickyHeader={true}>
          <Table.Header>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <Table.Head
                    key={header.id}
                    className={cn(
                      header.column.id !== 'actions' && 'whitespace-nowrap',
                      header.column.id === 'actions' &&
                        'sticky right-0 z-30 bg-bg-weak-50 text-right border-l border-stroke-soft-200',
                      index === 0 && 'rounded-l-xl',
                      index === headerGroup.headers.length - 1 && 'rounded-r-xl text-right',
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </Table.Head>
                ))}
              </Table.Row>
            ))}
          </Table.Header>
          {isLoading && dataRows.length === 0 ? (
            renderSkeletonBody()
          ) : (
            <Table.Body spacing={8}>
              {groupField
                ? (() => {
                    let lastKey = null;
                    const out = [];
                    for (const tableRow of dataRows) {
                      const gKey = tableRow.original[groupField] ?? '—';
                      if (gKey !== lastKey) {
                        lastKey = gKey;
                        out.push(
                          <React.Fragment key={`group-${gKey}-${out.length}`}>
                            <Table.Row className='bg-bg-weak-50 hover:bg-bg-weak-50'>
                              <Table.Cell
                                colSpan={colSpan}
                                className='text-paragraph-sm font-medium text-text-sub-600'
                              >
                                {gKey}
                              </Table.Cell>
                            </Table.Row>
                            <Table.RowDivider />
                          </React.Fragment>,
                        );
                      }
                      out.push(
                        <React.Fragment key={tableRow.id}>
                          <Table.Row>
                            {tableRow.getVisibleCells().map((cell) => (
                              <Table.Cell
                                key={cell.id}
                                className={cn(
                                  cell.column.id !== 'actions' && 'whitespace-nowrap',
                                  cell.column.id === 'actions' &&
                                    'text-right w-px min-w-[160px] sticky right-0 z-20 bg-bg-white-0 border-l border-stroke-soft-200',
                                )}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </Table.Cell>
                            ))}
                          </Table.Row>
                          <Table.RowDivider />
                        </React.Fragment>,
                      );
                    }
                    return out;
                  })()
                : dataRows.map((tableRow) => (
                    <React.Fragment key={tableRow.id}>
                      <Table.Row>
                        {tableRow.getVisibleCells().map((cell) => (
                          <Table.Cell
                            key={cell.id}
                            className={cn(
                              cell.column.id !== 'actions' && 'whitespace-nowrap',
                              cell.column.id === 'actions' &&
                                'text-right w-px min-w-[160px] sticky right-0 z-20 bg-bg-white-0 border-l border-stroke-soft-200',
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </Table.Cell>
                        ))}
                      </Table.Row>
                      <Table.RowDivider />
                    </React.Fragment>
                  ))}
            </Table.Body>
          )}
        </Table.Root>
        {enableScrollPagination && (
          <div className='w-full'>
            {renderSentinel()}
            {isLoadingMore && (
              <div className='flex items-center justify-center gap-2 px-4 py-4'>
                <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                <span className='paragraph-small text-text-sub-600'>
                  Loading more agreements...
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

AgreementsPendingTable.displayName = 'AgreementsPendingTable';

export default AgreementsPendingTable;
