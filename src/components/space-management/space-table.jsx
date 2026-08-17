import React, { useMemo, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import { StatusColorPill } from '@/components/ui/status-color-pill';
import { cn } from '@/utils/cn';
import { useColumnConfig, useColumnConfigPopoverRef } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import { fetchSpaceColumnList, updateSpaceColumnList } from '@/redux/spaceSlice';
import {
  EMPTY_STATES,
  getSpaceStatusBadge,
  getSpaceTypeBadge,
  isValidActualCarpetDecimalInput,
} from '@/components/space-management/constants';
import * as CompactButton from '@/components/ui/compact-button';
import { RiErrorWarningLine, RiDeleteBinLine, RiAddLine, RiSearchLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import { format } from 'date-fns';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import SetStatusesModal, {
  StatusColumnPopover,
} from '@/components/space-management/status-configuration';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import { useFrozenTableColumns } from '@/hooks/use-frozen-table-columns';
import * as Switch from '@/components/ui/switch';
import InlineEditableText from '@/components/ui/inline-editable-text';

const formatListInr = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  const n = Number(value);
  return `₹${n.toLocaleString('en-IN')}`;
};

const formatListSqFt = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  return `${Number(value).toLocaleString('en-IN')} sq.ft.`;
};

const renderInlineTextCell = (row, field, value, onFieldUpdate, opts = {}) => {
  const spaceId = row.original.id;
  const display =
    value === null || value === undefined || value === '' || value === '-' ? '' : String(value);
  const className = opts.className || 'text-paragraph-sm whitespace-nowrap text-text-sub-600';
  if (!onFieldUpdate || !spaceId || spaceId === '-') {
    return (
      <span className={className}>
        {opts.formatRead ? opts.formatRead(value) : display || '--'}
      </span>
    );
  }
  return (
    <div className='min-w-0 max-w-full' onClick={(e) => e.stopPropagation()}>
      <InlineEditableText
        value={display}
        displayValue={opts.formatRead ? opts.formatRead(value) : undefined}
        placeholder='—'
        numericOnly={opts.numericOnly}
        displayClassName={className}
        inputClassName={className}
        onSave={(v) => {
          const trimmed = String(v ?? '').trim();
          if (trimmed === display.trim()) return;
          if (opts.decimal) {
            if (!isValidActualCarpetDecimalInput(trimmed)) return;
            onFieldUpdate(spaceId, field, trimmed === '' ? 0 : Number.parseFloat(trimmed));
            return;
          }
          onFieldUpdate(
            spaceId,
            field,
            opts.numericOnly ? (trimmed === '' ? 0 : Number(trimmed)) : trimmed,
          );
        }}
      />
    </div>
  );
};

/** Sticky right column for delete action (match ticket-table). */
const STICKY_ACTIONS_META = {
  headClassName: 'sticky right-0 z-30 bg-bg-weak-50',
  cellClassName: 'border-stroke-soft-200 sticky right-0 z-30 bg-white',
};

/** Resource tab: hide seat/carpet columns (resources use pax; rate column stays visible). */
const RESOURCE_TAB_HIDDEN_COLUMN_IDS = [
  'totalSeats',
  'availableSeats',
  'sellableCarpetArea',
  'expectedCarpetRate',
  'totalRateOfSpace',
];

const getClientDisplayName = (client) => {
  if (!client) return '';
  if (typeof client === 'string') return client.trim() || '';
  return (
    client.custom_display_name ||
    client.customer_name ||
    client.custom_legal_name ||
    client.client_name ||
    client.name ||
    ''
  );
};

const getClientEntry = (client, index) => {
  const label = getClientDisplayName(client).trim() || '--';
  const rawId =
    typeof client === 'string'
      ? client
      : (client?.id ?? client?.name ?? client?.customer_id ?? index);
  return { id: `${rawId}-${index}`, label };
};

const ClientsPopover = ({ clients }) => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  if (!clients?.length) {
    return <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>--</span>;
  }

  const entries = clients.map(getClientEntry);
  const first = entries[0];
  const remaining = entries.slice(1);
  const overflowCount = clients.length - 1;

  // Single client — just a pill, no popover
  if (clients.length === 1) {
    return (
      <span className='inline-flex items-center rounded-full bg-bg-weak-100 px-2 py-0.5'>
        <span
          className='block max-w-[150px] overflow-hidden text-ellipsis text-nowrap text-paragraph-sm text-text-strong-950'
          title={first.label}
        >
          {first.label}
        </span>
      </span>
    );
  }

  const searchTerm = search.trim().toLowerCase();
  const filtered = searchTerm
    ? entries.filter((entry) => entry.label.toLowerCase().includes(searchTerm))
    : entries;

  return (
    <div className='inline-flex items-center gap-1 min-w-0'>
      <span className='inline-flex items-center rounded-full bg-bg-weak-100 px-2 py-0.5'>
        <span
          className='block max-w-[150px] overflow-hidden text-ellipsis text-nowrap text-paragraph-sm text-text-strong-950'
          title={first.label}
        >
          {first.label}
        </span>
      </span>

      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch('');
        }}
      >
        <Tooltip.Root delayDuration={200}>
          <Tooltip.Trigger asChild>
            <Popover.Trigger asChild>
              <button
                type='button'
                className='inline-flex shrink-0 cursor-pointer items-center rounded-full bg-bg-weak-100 px-2 py-0.5 text-paragraph-sm text-text-strong-950 whitespace-nowrap'
                onClick={(e) => e.stopPropagation()}
              >
                +{overflowCount}
              </button>
            </Popover.Trigger>
          </Tooltip.Trigger>
          {!open && (
            <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
              <div className='flex flex-col gap-1'>
                {remaining.map((entry) => (
                  <div
                    key={entry.id}
                    className='text-paragraph-sm text-text-sub-600 max-w-[200px] truncate'
                    title={entry.label}
                  >
                    {entry.label}
                  </div>
                ))}
              </div>
            </Tooltip.Content>
          )}
        </Tooltip.Root>

        <Popover.Content
          className='p-0'
          align='center'
          side='top'
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className='w-[180px]'>
            <div className='flex items-center gap-2 border-b border-stroke-soft-200 px-3 py-2'>
              <RiSearchLine className='h-4 w-4 shrink-0 text-text-sub-200' />
              <input
                type='text'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search client'
                className='flex-1 min-w-0 bg-transparent text-paragraph-sm text-text-strong-950 outline-none placeholder:text-text-sub-400'
                autoFocus
              />
            </div>

            <div className='max-h-52 overflow-y-auto py-1'>
              {filtered.length > 0 ? (
                filtered.map((entry) => (
                  <div
                    key={entry.id}
                    className='px-3 py-2 text-paragraph-sm text-text-sub-600 truncate'
                    title={entry.label}
                  >
                    {entry.label}
                  </div>
                ))
              ) : (
                <div className='px-3 py-2 text-paragraph-sm text-text-sub-600'>
                  No clients found
                </div>
              )}
            </div>
          </div>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
};

const SpaceTable = React.forwardRef(
  (
    {
      rows = [],
      isLoading = false,
      error = null,
      context = 'default',
      isParkingView = false,
      isResourceView = false,
      hideOpportunityLossColumn = false, // ← added from fix/space-ticket-bugs
      onRetry,
      onRowSelect,
      onSortingChange,
      sorting = [],
      tableId = 'space-management-table',
      variant = 'compact',
      onLoadMore,
      hasMore = false,
      isLoadingMore = false,
      enableScrollPagination = false,
      onDelete,
      onAllocate,
      permissions = {},
      onFieldUpdate,
    },
    ref,
  ) => {
    const canDelete = permissions?.canDelete === true && typeof onDelete === 'function';
    const dispatch = useDispatch();
    const [localSorting, setLocalSorting] = React.useState(sorting);
    const [isSetStatusesOpen, setIsSetStatusesOpen] = React.useState(false);
    const { statusPopoverColumnConfig, syncColumnConfigHookToPopover } =
      useColumnConfigPopoverRef();
    React.useEffect(() => {
      setLocalSorting(sorting);
    }, [sorting]);

    // Setup scroll pagination
    const { sentinelRef } = useScrollPagination({
      onLoadMore: onLoadMore || (() => {}),
      hasMore: hasMore && enableScrollPagination,
      isLoading: isLoadingMore || isLoading,
      threshold: 200,
      scrollContainer: null, // Use window/viewport as scroll container
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

    const isParkingTable = Boolean(isParkingView);
    const isResourceTable = Boolean(isResourceView);

    const allColumnDefs = useMemo(() => {
      return [
        // {
        //   id: 'id',
        //   accessorKey: 'id',
        //   columnLabel: 'ID',
        //   header: ({ column }) => {
        //     const sortState = column.getIsSorted();
        //     return (
        //       <div className='flex items-center gap-1.5'>
        //         <span className='text-paragraph-sm text-text-sub-600'>ID</span>
        //         <button
        //           type='button'
        //           className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
        //           onClick={() => column.toggleSorting(sortState === 'asc')}
        //           aria-label={`Sort by ID ${sortState === 'asc' ? 'descending' : 'ascending'}`}
        //         >
        //           {Table.getSortingIcon(sortState)}
        //         </button>
        //       </div>
        //     );
        //   },
        //   cell: ({ row }) => {
        //     return (
        //       <button
        //         onClick={(e) => {
        //           e.stopPropagation();
        //           onRowSelect?.(row.original);
        //         }}
        //         className='text-nowrap text-text-strong-950 hover:text-primary-base transition-colors cursor-pointer underline-offset-2 hover:underline paragraph-small'
        //       >
        //         {row.original.id || '--'}
        //       </button>
        //     );
        //   },
        //   enableSorting: true,
        // },
        {
          id: 'spaceName',
          accessorKey: 'spaceName',
          columnLabel: 'Space Name',
          enableHiding: false, // pinned + always visible
          header: () => {
            return (
              <div className='flex items-center gap-0.5 '>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                  Space Name
                </span>
              </div>
            );
          },
          cell: ({ row }) => {
            const spaceId = row.original.id;
            const val = String(row.original.spaceName ?? '').trim();
            return (
              <div className='w-[240px] max-w-[240px] overflow-hidden'>
                <Tooltip.Root size='xsmall'>
                  <Tooltip.Trigger asChild>
                    <div className='min-w-0 overflow-hidden'>
                      <InlineEditableText
                        value={val}
                        editOnIconOnly
                        placeholder='—'
                        displayClassName='text-paragraph-sm text-text-strong-950 truncate'
                        inputClassName='text-paragraph-sm text-text-strong-950'
                        onSave={(v) => {
                          const next = String(v ?? '').trim();
                          if (next === val) return;
                          onFieldUpdate?.(spaceId, 'spaceName', next);
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
            cellClassName: 'min-w-[260px] max-w-[260px] whitespace-nowrap',
          },
          enableSorting: false,
        },
        {
          id: 'totalSeats',
          accessorKey: 'totalSeats',
          columnLabel: 'Total Sellable Seats',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-0.5 '>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                  Total Sellable Seats
                </span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Total Sellable Seats ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const value = row.original.totalSeats;
            return (
              <span className='text-paragraph-sm whitespace-nowrap'>
                {value !== undefined && value !== null ? value : '--'}
              </span>
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
              <div className='flex items-center gap-0.5 '>
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
          cell: ({ row }) => (
            <Tooltip.Root size='xsmall'>
              <Tooltip.Trigger asChild>
                <span className='text-paragraph-sm  block max-w-[440px] whitespace-nowrap overflow-hidden text-ellipsis'>
                  {row.original.center || '--'}
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content side='bottom'>{row.original.center || '--'}</Tooltip.Content>
            </Tooltip.Root>
          ),
          meta: {
            cellClassName: 'min-w-[160px] max-w-[260px] whitespace-nowrap',
          },
          enableSorting: true,
        },
        {
          id: 'floor',
          accessorKey: 'floor',
          columnLabel: 'Floor',
          header: () => {
            return (
              <div className='flex items-center gap-0.5 '>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>Floor</span>
              </div>
            );
          },
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {row.original.floor ?? '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'block',
          accessorKey: 'block',
          columnLabel: 'Block',
          header: () => (
            <div className='flex items-center gap-0.5 '>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>Block</span>
            </div>
          ),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {row.original.block ?? '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'spaceType',
          accessorKey: 'spaceType',
          columnLabel: 'Space Type',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-0.5 '>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                  Space Type
                </span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Space Type ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const badge = getSpaceTypeBadge(row.original.spaceType);
            return (
              <Badge.Root
                size='small'
                variant='light'
                color={badge.color}
                className='whitespace-nowrap'
              >
                {badge.label}
              </Badge.Root>
            );
          },
          enableSorting: true,
        },
        {
          id: 'timesBooked',
          accessorKey: 'timesBooked',
          columnLabel: 'Times booked',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-0.5 '>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                  Times booked
                </span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Times booked ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const n = row.original.timesBooked;
            return (
              <span className='text-paragraph-sm whitespace-nowrap'>
                {n !== undefined && n !== null && !Number.isNaN(Number(n)) ? Number(n) : '--'}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: 'bookable',
          accessorKey: 'bookable',
          columnLabel: 'Bookable',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-0.5 '>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                  Bookable
                </span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Bookable ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const spaceId = row.original.id;
            const spaceType = String(row.original.spaceType || '').trim();
            const isResource = spaceType === 'Resource';
            const isBookable = row.original.bookable === 'Yes' || row.original.bookable === true;
            return (
              <div className='flex items-center gap-2' onClick={(e) => e.stopPropagation()}>
                {isResource && (
                  <Switch.Root
                    checked={isBookable}
                    onCheckedChange={(checked) => {
                      onFieldUpdate?.(spaceId, 'bookable', checked ? 'Yes' : 'No');
                    }}
                  />
                )}
                {!isResource && <span className='text-paragraph-sm text-text-sub-600'>--</span>}
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'parkingType',
          accessorKey: 'parkingType',
          columnLabel: 'Type',
          header: () => {
            return (
              <div className='flex items-center gap-0.5 '>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>Type</span>
              </div>
            );
          },
          cell: ({ row }) => {
            const value =
              row.original?.parkingType ?? row.original?.type ?? row.original?.subSpaceType;
            return (
              <span className='text-paragraph-sm whitespace-nowrap'>
                {value !== undefined && value !== null && value !== '' ? value : '--'}
              </span>
            );
          },
          enableSorting: false,
        },
        {
          id: 'vehicleType',
          accessorFn: (row) => row?.vehicleType ?? row?.vehicle_type,
          columnLabel: 'Vehicle Type',
          header: () => (
            <div className='flex items-center gap-0.5 '>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                Vehicle Type
              </span>
            </div>
          ),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {row.original?.vehicleType ?? row.original?.vehicle_type ?? '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'assigningType',
          accessorFn: (row) => row?.assigningType ?? row?.assigning_type,
          columnLabel: 'Assignment Type',
          header: () => (
            <div className='flex items-center gap-0.5 '>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                Assignment Type
              </span>
            </div>
          ),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {row.original?.assigningType ?? row.original?.assigning_type ?? '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'availableParking',
          accessorKey: 'availableSeats',
          columnLabel: 'Available parking',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-0.5 '>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                  Available parking
                </span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Available parking ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const value = row.original.availableSeats;
            return (
              <span className='text-paragraph-sm whitespace-nowrap'>
                {value !== undefined && value !== null ? value : '--'}
              </span>
            );
          },
          enableSorting: true,
        },
        // {
        //   id: 'subSpaceType',
        //   accessorKey: 'subSpaceType',
        //   columnLabel: 'Sub-space Type',
        //   header: ({ column }) => {
        //     const sortState = column.getIsSorted();
        //     return (
        //       <div className='flex items-center gap-0.5 px-3 py-2'>
        //         <span className='text-paragraph-sm text-text-sub-600'>Sub-space Type</span>
        //         <button
        //           type='button'
        //           className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
        //           onClick={() => column.toggleSorting(sortState === 'asc')}
        //           aria-label={`Sort by Sub-space Type ${sortState === 'asc' ? 'descending' : 'ascending'}`}
        //         >
        //           {Table.getSortingIcon(sortState)}
        //         </button>
        //       </div>
        //     );
        //   },
        //   cell: ({ row }) => {
        //     const badge = getSubSpaceTypeBadge(row.original.subSpaceType);
        //     return (
        //       <Badge.Root size='small' variant='stroke' color={badge.color}>
        //         {badge.label}
        //       </Badge.Root>
        //     );
        //   },
        //   enableSorting: true,
        // },
        {
          id: 'status',
          accessorKey: 'status',
          columnLabel: 'Status',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1'>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                  Status
                </span>
                <CompactButton.Root
                  type='button'
                  variant='neutral'
                  mode='ghost'
                  size='medium'
                  onClick={() => column.toggleSorting?.(sortState === 'asc')}
                  aria-label={`Sort by Status ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </CompactButton.Root>

                <StatusColumnPopover
                  columnId='status'
                  columnConfigHook={statusPopoverColumnConfig}
                  onOpenStatuses={() => setIsSetStatusesOpen(true)}
                />
              </div>
            );
          },
          cell: ({ row }) => {
            const rawStatus = String(row.original.status || '').trim();
            const hexColor = row.original.statusColor || null;
            return (
              <div className='flex items-center'>
                <StatusColorPill
                  value={rawStatus || '—'}
                  color={hexColor}
                  className='max-w-[min(100%,140px)]'
                />
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'availableSeats',
          accessorKey: 'availableSeats',
          columnLabel: 'Available Seats',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-0.5 '>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                  Available Seats
                </span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Available Seats ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const value = row.original.availableSeats;
            return (
              <span className='text-paragraph-sm whitespace-nowrap'>
                {value !== undefined && value !== null ? value : '--'}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: 'pax',
          accessorKey: 'pax',
          columnLabel: 'PAX',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-0.5 '>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>PAX</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by PAX ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const value = row.original.pax;
            return (
              <span className='text-paragraph-sm whitespace-nowrap'>
                {value !== undefined && value !== null ? value : '--'}
              </span>
            );
          },
          enableSorting: true,
        },
        // actual carpet area fix
        {
          id: 'actualCarpetArea',
          accessorKey: 'actualCarpetArea',
          columnLabel: 'Actual Carpet Area',
          header: () => (
            <div className='flex items-center gap-0.5 '>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                Actual Carpet Area (sq.ft)
              </span>
            </div>
          ),
          cell: ({ row }) =>
            renderInlineTextCell(
              row,
              'actualCarpetArea',
              row.original.actualCarpetArea,
              onFieldUpdate,
              { decimal: true },
            ),
          enableSorting: false,
        },
        {
          id: 'sellableCarpetArea',
          accessorKey: 'carpetArea',
          columnLabel: 'Total sellable Carpet Area',
          header: () => (
            <div className='flex items-center gap-0.5 '>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                Total sellable Carpet Area (sq.ft)
              </span>
            </div>
          ),
          cell: ({ row }) =>
            renderInlineTextCell(row, 'carpetArea', row.original.carpetArea, onFieldUpdate, {
              numericOnly: true,
              formatRead: formatListSqFt,
            }),
          enableSorting: false,
        },
        {
          id: 'expectedCarpetRate',
          accessorKey: 'expectedCarpetRate',
          columnLabel: 'Expected Carpet Rate',
          header: () => (
            <div className='flex items-center gap-0.5 '>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                Expected Carpet Rate
              </span>
            </div>
          ),
          cell: ({ row }) =>
            renderInlineTextCell(
              row,
              'expectedCarpetRate',
              row.original.expectedCarpetRate,
              onFieldUpdate,
              { numericOnly: true, formatRead: formatListInr },
            ),
          enableSorting: false,
        },
        {
          id: 'expectedPerSeatRateCol',
          accessorKey: 'expectedPerSeatRate',
          columnLabel: 'Expected Per Seat Rate',
          header: () => (
            <div className='flex items-center gap-0.5 '>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                Expected Per Seat Rate
              </span>
            </div>
          ),
          cell: ({ row }) =>
            renderInlineTextCell(
              row,
              'expectedPerSeatRate',
              row.original.expectedPerSeatRate,
              onFieldUpdate,
              { numericOnly: true, formatRead: formatListInr },
            ),
          enableSorting: false,
        },
        {
          id: 'totalRateOfSpace',
          accessorKey: 'totalRateOfSpace',
          columnLabel: 'Total Rate of Space',
          header: () => (
            <div className='flex items-center gap-0.5 '>
              <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                Total Rate of Space
              </span>
            </div>
          ),
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {row.original.totalRateOfSpace === null || row.original.totalRateOfSpace === undefined
                ? '--'
                : formatListInr(row.original.totalRateOfSpace)}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'opportunityLoss',
          accessorKey: 'opportunityLoss',
          columnLabel: 'Opportunity loss',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-0.5 '>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                  Opportunity loss
                </span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Opportunity loss ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const st = String(row.original.spaceType || '').trim();
            if (st === 'Pure Rental') {
              return (
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>--</span>
              );
            }
            return (
              <span className='text-paragraph-sm whitespace-nowrap'>
                {formatListInr(row.original.opportunityLoss)}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: 'createdBy',
          accessorKey: 'createdBy',
          columnLabel: 'Created By',
          header: () => {
            return (
              <div className='flex items-center gap-0.5 '>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                  Created By
                </span>
              </div>
            );
          },
          cell: ({ row }) => (
            <span className='text-paragraph-sm whitespace-nowrap'>
              {row.original.createdBy || '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'createdAt',
          accessorKey: 'createdAt',
          columnLabel: 'Created At',
          header: () => {
            return (
              <div className='flex items-center gap-0.5 '>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                  Created At
                </span>
              </div>
            );
          },
          cell: ({ row }) => {
            const date = row.original.createdAt;
            if (!date) return <span className='text-paragraph-sm whitespace-nowrap'>--</span>;
            try {
              const formatted = format(new Date(date), 'dd MMM yyyy');
              return <span className='text-paragraph-sm whitespace-nowrap'>{formatted}</span>;
            } catch {
              return <span className='text-paragraph-sm whitespace-nowrap'>{date}</span>;
            }
          },
          enableSorting: false,
        },
        {
          id: 'clients',
          accessorKey: 'clients',
          columnLabel: 'Client Name',
          header: () => {
            return (
              <div className='flex items-center gap-0.5 max-w-24 '>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                  Clients
                </span>
              </div>
            );
          },
          cell: ({ row }) => {
            const clients = row.original.clients || [];

            if (clients.length === 0) {
              return (
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>--</span>
              );
            }

            return <ClientsPopover clients={clients} />;
          },
          enableSorting: false,
        },
        {
          id: 'lastUpdated',
          accessorKey: 'lastUpdated',
          columnLabel: 'Last Updated',
          header: () => {
            return (
              <div className='flex items-center gap-0.5 '>
                <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                  Last Updated
                </span>
              </div>
            );
          },
          cell: ({ row }) => {
            const date = row.original.lastUpdated;
            if (!date) return <span className='text-paragraph-sm whitespace-nowrap'>--</span>;
            try {
              const formatted = format(new Date(date), 'dd MMM yyyy');
              return <span className='text-paragraph-sm whitespace-nowrap'>{formatted}</span>;
            } catch {
              return <span className='text-paragraph-sm whitespace-nowrap'>{date}</span>;
            }
          },
          enableSorting: false,
        },
        ...(canDelete || typeof onAllocate === 'function'
          ? [
              {
                id: 'actions',
                accessorKey: 'id',
                columnLabel: 'Actions',
                enableHiding: false,
                header: () => (
                  <div className='flex items-center justify-end w-full'>
                    <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>
                      Actions
                    </span>
                  </div>
                ),
                cell: ({ row }) => {
                  const isAvailable = String(row.original.status).toLowerCase() === 'available';
                  const isResource = ['resource', 'resources'].includes(
                    String(row.original.spaceType || '')
                      .toLowerCase()
                      .trim(),
                  );
                  return (
                    <div
                      className='flex items-center justify-end gap-1'
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isAvailable && typeof onAllocate === 'function' && (
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <Button.Root
                              type='button'
                              variant='neutral'
                              mode='ghost'
                              size='medium'
                              onClick={(e) => {
                                e.stopPropagation();
                                onAllocate?.(row.original);
                              }}
                              aria-label='Allocate client'
                              className='inline-flex items-center justify-center rounded-full text-text-sub-500 hover:text-primary-base transition-colors duration-200'
                            >
                              <Button.Icon as={RiAddLine} />
                            </Button.Root>
                          </Tooltip.Trigger>
                          <Tooltip.Content>
                            <p>Allocate Client</p>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      )}
                      {canDelete && (
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <Button.Root
                              type='button'
                              variant='neutral'
                              mode='ghost'
                              size='medium'
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete?.(row.original);
                              }}
                              aria-label='Delete space'
                              className='inline-flex items-center justify-center rounded-full'
                            >
                              <Button.Icon as={RiDeleteBinLine} className='text-error-base' />
                            </Button.Root>
                          </Tooltip.Trigger>
                          <Tooltip.Content>
                            <p>Delete this space. This action cannot be undone.</p>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      )}
                    </div>
                  );
                },
                enableSorting: false,
                meta: STICKY_ACTIONS_META,
              },
            ]
          : []),
      ];
    }, [canDelete, onDelete, onAllocate, onFieldUpdate]);

    // Actions column is excluded from saved prefs / column manager and always appended last (ticket-table pattern)
    const defaultColumnConfig = useMemo(
      () => prepareColumnsForConfig(allColumnDefs.filter((col) => col.id !== 'actions')),
      [allColumnDefs],
    );

    const columnConfigHook = useColumnConfig(
      tableId,
      defaultColumnConfig,
      (cols) => dispatch(updateSpaceColumnList(cols)).unwrap(),
      () => dispatch(fetchSpaceColumnList()).unwrap(),
      { autoSave: true, debounce: 300 },
    );

    const customizedColumnConfigHook = useMemo(() => {
      return {
        ...columnConfigHook,
        columns: columnConfigHook.columns.map((col) => {
          let hideFromManager = false;
          const priceColIds = [
            'sellableCarpetArea',
            'expectedCarpetRate',
            ...(isResourceTable ? [] : ['expectedPerSeatRateCol']),
            'totalRateOfSpace',
          ];
          const hideSeatCarpetPriceForTab =
            col.id === 'totalSeats' || col.id === 'availableSeats' || priceColIds.includes(col.id);
          if ((isParkingTable || isResourceTable) && hideSeatCarpetPriceForTab) {
            hideFromManager = true;
          } else if (isResourceTable && (col.id === 'totalSeats' || col.id === 'availableSeats')) {
            hideFromManager = true;
          } else if (
            !isParkingTable &&
            (col.id === 'parkingType' ||
              col.id === 'parkingNo' ||
              col.id === 'vehicleType' ||
              col.id === 'assigningType' ||
              col.id === 'availableParking' ||
              col.id === 'block')
          ) {
            hideFromManager = true;
          } else if (!isResourceTable && col.id === 'timesBooked') {
            hideFromManager = true;
          } else if (hideOpportunityLossColumn && col.id === 'opportunityLoss') {
            hideFromManager = true;
          } else if (!isResourceTable && col.id === 'pax') {
            hideFromManager = true;
          } else if (!isResourceTable && col.id === 'bookable') {
            hideFromManager = true;
          }
          return { ...col, hideFromManager };
        }),
      };
    }, [columnConfigHook, isParkingTable, isResourceTable, hideOpportunityLossColumn]);
    syncColumnConfigHookToPopover(customizedColumnConfigHook);

    React.useImperativeHandle(ref, () => ({
      columnConfigHook: customizedColumnConfigHook,
    }));

    const actionsColumn = useMemo(
      () => allColumnDefs.find((col) => col.id === 'actions'),
      [allColumnDefs],
    );

    const columns = useMemo(() => {
      const configurableColumnDefs = allColumnDefs.filter((col) => col.id !== 'actions');

      let configuredColumns = applyColumnConfig(configurableColumnDefs, columnConfigHook.columns);

      if (isParkingTable) {
        const defsById = new Map(configuredColumns.map((col) => [col.id, col]));

        const defaultOrderedIds = [
          'spaceName',
          'center',
          'floor',
          'spaceType',
          'status',
          'createdBy',
          'createdAt',
          'clients',
          'lastUpdated',
          'parkingType',
          'vehicleType',
          'assigningType',
          'parkingNo',
          'availableParking',
        ];

        const orderedIds = columnConfigHook.columns
          .map((col) => col.id)
          .filter((id) => defaultOrderedIds.includes(id));

        configuredColumns = orderedIds
          .map((id) => defsById.get(id))
          .filter(Boolean)
          .filter(
            (col) =>
              col.id !== 'block' &&
              col.id !== 'totalSeats' &&
              col.id !== 'availableSeats' &&
              col.id !== 'pax' &&
              col.id !== 'sellableCarpetArea' &&
              col.id !== 'expectedCarpetRate' &&
              col.id !== 'expectedPerSeatRateCol' &&
              col.id !== 'totalRateOfSpace',
          );
      } else if (isResourceTable) {
        const defsById = new Map(configuredColumns.map((col) => [col.id, col]));

        const defaultOrderedIds = [
          'spaceName',
          'pax',
          'expectedPerSeatRateCol',
          'center',
          'floor',
          'spaceType',
          'status',
          'createdBy',
          'createdAt',
          'clients',
          'lastUpdated',
          'timesBooked',
          'bookable',
          'actions',
        ];

        const orderedIds = columnConfigHook.columns
          .map((col) => col.id)
          .filter((id) => defaultOrderedIds.includes(id));

        configuredColumns = orderedIds
          .map((id) => defsById.get(id))
          .filter(Boolean)
          .filter(
            (col) =>
              col.id !== 'parkingType' &&
              col.id !== 'vehicleType' &&
              col.id !== 'assigningType' &&
              col.id !== 'parkingNo' &&
              col.id !== 'availableParking' &&
              col.id !== 'block' &&
              col.id !== 'totalSeats' &&
              col.id !== 'availableSeats',
          );
      } else {
        configuredColumns = configuredColumns.filter(
          (col) =>
            col.id !== 'parkingType' &&
            col.id !== 'vehicleType' &&
            col.id !== 'assigningType' &&
            col.id !== 'parkingNo' &&
            col.id !== 'availableParking' &&
            col.id !== 'block' &&
            col.id !== 'pax',
        );
      }

      if (!isResourceTable) {
        configuredColumns = configuredColumns.filter((col) => col.id !== 'timesBooked');
      }

      if (hideOpportunityLossColumn) {
        configuredColumns = configuredColumns.filter((col) => col.id !== 'opportunityLoss');
      }

      if (isResourceTable) {
        const hidden = new Set(RESOURCE_TAB_HIDDEN_COLUMN_IDS);
        configuredColumns = configuredColumns.filter((col) => !hidden.has(col.id));
      }

      return actionsColumn ? [...configuredColumns, actionsColumn] : configuredColumns;
    }, [
      allColumnDefs,
      columnConfigHook.columns,
      isParkingTable,
      isResourceTable,
      actionsColumn,
      hideOpportunityLossColumn,
    ]);

    const frozenTable = useFrozenTableColumns({
      enabled: true,
      leftColumnId: 'spaceName',
      rightColumnId: 'actions',
      columns,
    });

    const table = useReactTable({
      data: rows,
      columns,
      state: frozenTable.withTableState({ sorting: localSorting }),
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      enableSortingRemoval: true,
      manualSorting: true, // Backend sorting - don't sort client-side
      enableColumnPinning: frozenTable.enableColumnPinning,
    });

    // Error state (match ticket-management styling)
    if (error) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
            <RiErrorWarningLine className='size-6 text-error-base' />
          </div>
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>Unable to Load Spaces</h3>
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

    // Empty state (match ticket-management styling)
    if (!isLoading && rows.length === 0) {
      const state = EMPTY_STATES[context] || EMPTY_STATES.default;
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{state.title}</h3>
          <p className='max-w-md text-sm text-text-sub-600'>{state.description}</p>
        </div>
      );
    }

    // Loading skeleton (same visual as before, only when table has no data yet)
    const renderSkeleton = () => (
      <Table.Body spacing={8}>
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

    const hasRows = table.getRowModel().rows.length > 0;

    return (
      <>
        <SetStatusesModal
          open={isSetStatusesOpen}
          onOpenChange={setIsSetStatusesOpen}
          showImport={false}
        />
        <div className='flex-1 min-h-0 flex flex-col w-full overflow-hidden'>
          <Table.Root
            variant={variant}
            {...frozenTable.getRootTableProps(table, 'min-h-0 flex-1 overflow-auto')}
          >
            <Table.Header {...frozenTable.headerProps}>
              {table.getHeaderGroups().map((headerGroup) => (
                <Table.Row key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <Table.Head key={header.id} {...frozenTable.getHeaderColumnProp(header)}>
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
                        <Table.Cell
                          key={cell.id}
                          {...frozenTable.getCellColumnProp(cell)}
                          onClick={(e) => {
                            if (cell.column.id === 'clients' || cell.column.id === 'actions') {
                              e.stopPropagation();
                            }
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                    <Table.RowDivider />
                  </React.Fragment>
                ))}
                {enableScrollPagination && (
                  <>
                    <Table.Row ref={sentinelRef} data-scroll-sentinel>
                      <Table.Cell colSpan={columns.length} className='h-1 p-0' />
                    </Table.Row>
                    {isLoadingMore && (
                      <Table.Row>
                        <Table.Cell colSpan={columns.length} className='text-center py-4'>
                          <span className='text-paragraph-sm text-text-sub-600'>
                            Loading more spaces...
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
      </>
    );
  },
);

SpaceTable.displayName = 'SpaceTable';

export default SpaceTable;
