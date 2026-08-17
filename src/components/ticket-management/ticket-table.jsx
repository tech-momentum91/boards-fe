import React, { useMemo, useCallback } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RiErrorWarningLine, RiDeleteBinLine } from 'react-icons/ri';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import * as Select from '@/components/ui/select';
import * as CompactButton from '@/components/ui/compact-button';
import { cn } from '@/lib/utils';
import {
  EMPTY_STATES,
  getStatusVariant,
  PRIORITY_ACCENT_COLORS,
  PRIORITY_COLORS,
  getTicketFieldValue,
  isClient,
  TITLE_COLUMN_MIN_WIDTH,
  TITLE_COLUMN_DEFAULT_WIDTH,
  getFixedTicketColumnWidth,
  TITLE_COLUMN_ID,
  DEFAULT_TICKET_COLUMN_WIDTH,
  ACTIONS_COLUMN_WIDTH,
} from '@/components/ticket-management/constants';
import { isFacilityManager } from '@/constants/users-constants';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import TicketStatusDropdown from '@/components/ticket-management/ticket-status-dropdown';
import SetStatusesModal, {
  StatusColumnPopover,
} from '@/components/space-management/status-configuration';
import { hasStatusBadgeColor, StatusColorPill } from '@/components/ui/status-color-pill';
import * as Badge from '@/components/ui/badge';
import * as Avatar from '@/components/ui/avatar';
import * as AvatarGroup from '@/components/ui/avatar-group';
import { useColumnConfig, useColumnConfigPopoverRef } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import { getStatusOptions } from '@/api/dynamic-status';
import {
  safeDisplayDateTime,
  getResponseCountdown,
  getFirstResponseDuration,
} from '@/utils/date-utils';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTicketColumnList, updateTicketColumnList } from '@/redux/ticketManagementSlice';
import { upperFirst } from 'lodash';

const sortableHeader = (label, className) => {
  const SortableColumnHeader = ({ column }) => (
    <Table.SortableHeader column={column} label={label} sortable className={className} />
  );
  SortableColumnHeader.displayName = `SortableHeader(${label})`;
  return SortableColumnHeader;
};

const TicketTable = React.forwardRef(
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
      tableId = 'ticket-table', // Unique ID for persisting column config
      columnConfig: externalColumnConfig, // External column config (optional)
      onColumnConfigChange, // Callback when column config changes (optional)
      onAssigneeUpdate, // Callback when assignee is updated
      onStatusUpdate, // Callback when status is updated
      statusOptions = [], // Status options for dropdown
      onPriorityUpdate, // Callback when priority is updated
      priorityOptions = [], // Priority options for dropdown
      onDelete, // Callback when delete is clicked (opens confirmation modal from parent)
      // Scroll pagination props
      onLoadMore, // Callback when user scrolls near bottom
      hasMore = false, // Whether there are more items to load
      isLoadingMore = false, // Whether more data is currently loading
      enableScrollPagination = false, // Enable/disable scroll pagination
      variant = 'compact', // Table variant: 'default' | 'compact'
    },
    ref,
  ) => {
    const [localSorting, setLocalSorting] = React.useState(sorting);
    const [isSetStatusesOpen, setIsSetStatusesOpen] = React.useState(false);
    const { statusPopoverColumnConfig, syncColumnConfigHookToPopover } =
      useColumnConfigPopoverRef();
    const [dynamicStatusOptions, setDynamicStatusOptions] = React.useState([]);

    const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
    const roleMap = userSideBarPerm?.data?.message?.role;
    const isClientUser = isClient(roleMap);
    const isFacilityManagerUser = isFacilityManager(roleMap);
    const dispatch = useDispatch();

    const getPriorityColor = React.useCallback((priority, options = []) => {
      if (!priority) return 'gray';

      const option = options.find((opt) => opt.value?.toLowerCase() === priority?.toLowerCase());
      if (option?.color) {
        return option.color;
      }

      const normalized = priority.toLowerCase();
      return (
        {
          low: 'green',
          medium: 'purple',
          high: 'orange',
          critical: 'red',
        }[normalized] || 'gray'
      );
    }, []);

    // Sync local sorting with prop
    React.useEffect(() => {
      setLocalSorting(sorting);
    }, [sorting]);

    // Fetch dynamic configured statuses for HD Ticket.status.
    // Re-fetch after closing the configure modal so new/renamed statuses appear immediately.
    React.useEffect(() => {
      let cancelled = false;
      const fetchLatest = async () => {
        try {
          const opts = await getStatusOptions({ doctype: 'HD Ticket', field: 'status' });
          if (!cancelled) setDynamicStatusOptions(Array.isArray(opts) ? opts : []);
        } catch {
          if (!cancelled) setDynamicStatusOptions([]);
        }
      };

      fetchLatest();
      return () => {
        cancelled = true;
      };
    }, [isSetStatusesOpen]);

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

    // Define allowed column IDs for client users
    const clientUserAllowedColumns = useMemo(
      () => [
        'name',
        'title',
        'status',
        'center',
        'zone',
        'space',
        'assignee',
        'creation',
        'floor',
        'description',
        'raised_by',
        'spoc',
      ],
      [],
    );

    // Define all available columns with IDs for column management
    const allColumnDefs = useMemo(() => {
      const columns = [
        {
          id: 'ID',
          accessorKey: 'name',
          columnLabel: 'ID',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span className='text-paragraph-sm text-text-sub-600'>ID</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by ID ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const ticketId = row.original.name;
            const priority = row.original.priority || '';
            const normalizedPriority = priority.toLowerCase();
            const accentColor = PRIORITY_ACCENT_COLORS[normalizedPriority] || 'bg-slate-400';
            const isCritical = normalizedPriority === 'critical';

            return (
              <div className='flex items-center gap-2.5 relative'>
                {isCritical && (
                  <div
                    className={cn(
                      'absolute -left-2.5 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full',
                      accentColor,
                    )}
                    aria-hidden='true'
                  />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowSelect?.(row.original);
                  }}
                  className={cn(
                    'text-nowrap text-text-strong-950 hover:text-primary-base transition-colors cursor-pointer underline-offset-2 hover:underline',
                    isCritical
                      ? 'label-small text-error-base hover:text-error-darker'
                      : 'paragraph-small',
                  )}
                >
                  {ticketId || '--'}
                </button>
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'title',
          accessorKey: 'ticket_title',
          columnLabel: 'Title',

          size: TITLE_COLUMN_DEFAULT_WIDTH,
          minSize: TITLE_COLUMN_MIN_WIDTH,

          header: ({ column }) => {
            const sortState = column.getIsSorted();

            return (
              <div className='flex items-center gap-1.5 w-full min-w-0'>
                <span className='truncate text-paragraph-sm text-text-sub-600'>Title</span>

                <button
                  type='button'
                  className='shrink-0'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },

          cell: ({ row }) => {
            const title = row.original.ticket_title;

            const priority = row.original.priority || '';
            const normalizedPriority = priority.toLowerCase();

            const accentColor = PRIORITY_ACCENT_COLORS[normalizedPriority] || 'bg-slate-400';

            const isCritical = normalizedPriority === 'critical';

            return (
              <div className='flex items-center w-full min-w-0 relative'>
                {isCritical && (
                  <div
                    className={cn(
                      'absolute -left-2.5 top-1/2 -translate-y-1/2 h-[10px] w-1 rounded-r-full',
                      accentColor,
                    )}
                  />
                )}

                <Tooltip.Root size='xsmall'>
                  <Tooltip.Trigger asChild>
                    <span
                      className={cn(
                        'block w-full min-w-0 truncate paragraph-small font-medium',
                        isCritical ? 'text-error-base' : 'text-text-strong-550',
                      )}
                    >
                      {title || '--'}
                    </span>
                  </Tooltip.Trigger>

                  {title && <Tooltip.Content size='xsmall'>{title}</Tooltip.Content>}
                </Tooltip.Root>
              </div>
            );
          },

          enableSorting: true,
        },
        {
          id: 'description',
          accessorKey: 'description',
          columnLabel: 'Description',
          header: () => <div className='flex items-center gap-0.5 w-[300px]'>Description</div>,
          cell: ({ row }) => {
            const { description } = row.original;
            return (
              <p className='paragraph-small line-clamp-2 text-text-sub-600 text-ellipsis whitespace-nowrap w-[300px]'>
                {description || '--'}
              </p>
            );
          },
          enableSorting: false,
        },
        {
          id: 'status',
          accessorKey: 'status',
          columnLabel: 'Status',
          header: ({ column }) => (
            <div className='flex items-center gap-0.5'>
              <Table.SortableHeader column={column} label='Status' sortable />
              <StatusColumnPopover
                columnId='status'
                columnConfigHook={statusPopoverColumnConfig}
                onOpenStatuses={() => setIsSetStatusesOpen(true)}
              />
            </div>
          ),
          cell: ({ row }) => {
            const { status } = row.original;
            const statusColorRaw = row.original.status_color;
            const effectiveStatusOptions =
              dynamicStatusOptions.length > 0 ? dynamicStatusOptions : statusOptions;
            const statusNorm = String(status ?? '')
              .trim()
              .toLowerCase();
            const statusOptionMatch = effectiveStatusOptions.find(
              (o) =>
                String(o?.value ?? '')
                  .trim()
                  .toLowerCase() === statusNorm ||
                String(o?.label ?? '')
                  .trim()
                  .toLowerCase() === statusNorm,
            );
            const pillColor = statusColorRaw || statusOptionMatch?.color;

            if (!status || status === '--') {
              return <span className='paragraph-small text-text-sub-400'>-</span>;
            }

            // If editable and has update handler, show StatusDropdown
            if (
              !isClientUser &&
              permissions.canEdit &&
              onStatusUpdate &&
              effectiveStatusOptions.length > 0
            ) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <TicketStatusDropdown
                    value={status}
                    onValueChange={(newStatus) => {
                      const ticketId = row.original.name || row.original.id;
                      onStatusUpdate?.(ticketId, newStatus);
                    }}
                    statusOptions={effectiveStatusOptions}
                    disabled={!permissions.canEdit}
                    size='small'
                    className='w-full'
                    isFacilityManager={isFacilityManagerUser}
                  />
                </div>
              );
            }

            // Otherwise, show read-only badge
            const variant = getStatusVariant(status);

            return (
              <span className='paragraph-small'>
                {hasStatusBadgeColor(pillColor) ? (
                  <StatusColorPill
                    value={status}
                    color={pillColor}
                    className='max-w-[min(100%,180px)]'
                  />
                ) : (
                  <Badge.Root variant='light' color={variant} className='text-nowrap'>
                    {status}
                  </Badge.Root>
                )}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: 'customer',
          accessorKey: 'customer',
          columnLabel: 'Client',
          header: sortableHeader('Client'),
          cell: ({ row }) => {
            const client = row.original.customer || row.original.custom_customer_name;
            return (
              <Tooltip.Root size='xsmall'>
                <Tooltip.Trigger>
                  <span className='paragraph-small line-clamp-1 text-text-sub-600 text-left'>
                    {client || '--'}
                  </span>
                </Tooltip.Trigger>
                {client && <Tooltip.Content size='xsmall'>{client || '--'}</Tooltip.Content>}
              </Tooltip.Root>
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
              <div className='flex items-center gap-1.5'>
                <span className='text-paragraph-sm text-text-sub-600'>Center</span>
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
            const center = getTicketFieldValue(row.original, 'custom_center_name');
            return (
              <span className='paragraph-small line-clamp-1 text-text-sub-600 text-nowrap'>
                {center || '--'}
              </span>
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
              <div className='flex items-center gap-1.5'>
                <span className='text-paragraph-sm text-text-sub-600'>Zone</span>
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
            return (
              <span className='paragraph-small line-clamp-1 text-text-sub-600 text-nowrap'>
                {getTicketFieldValue(row.original, 'zone') || '--'}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: 'priority',
          accessorKey: 'priority',
          columnLabel: 'Priority',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span className='text-paragraph-sm text-text-sub-600'>Priority</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Priority ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const { priority } = row.original;
            const ticketId = row.original.name || row.original.id;
            const isEditable =
              !isClientUser &&
              permissions.canEdit &&
              Boolean(onPriorityUpdate) &&
              priorityOptions.length > 0 &&
              Boolean(ticketId);

            if (isEditable) {
              const safePriority = !priority || priority === '--' ? '' : priority;
              const color = getPriorityColor(safePriority, priorityOptions);

              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Select.Root
                    variant='borderless'
                    value={safePriority}
                    onValueChange={(value) => {
                      if (!ticketId) return;
                      onPriorityUpdate?.(ticketId, value);
                    }}
                    disabled={!permissions.canEdit}
                    size='xsmall'
                  >
                    <Select.Trigger
                      className='w-full bg-bg-white-100 hover:bg-bg-white-0'
                      showArrow={false}
                    >
                      <Select.Value>
                        <Badge.Root variant='light' color={color} className='text-nowrap'>
                          {safePriority || 'Not Set'}
                        </Badge.Root>
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content className='min-w-[150px]'>
                      {priorityOptions.map((option) => (
                        <Select.Item key={option.value} value={option.value}>
                          <Badge.Root
                            variant='light'
                            color={getPriorityColor(option.value, priorityOptions)}
                            className='text-nowrap'
                          >
                            {option.value}
                          </Badge.Root>
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              );
            }

            if (!priority || priority === '--') {
              return (
                <span className='paragraph-small inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500'>
                  --
                </span>
              );
            }

            const normalized = priority.toLowerCase();
            const color = PRIORITY_COLORS[normalized];

            return (
              <Badge.Root variant='light' color={color} className='text-nowrap'>
                {priority}
              </Badge.Root>
            );
          },
          enableSorting: true,
        },
        {
          id: 'severity',
          accessorKey: 'severity',
          columnLabel: 'Severity',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span className='text-paragraph-sm text-text-sub-600'>Severity</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Severity ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const { severity } = row.original;

            if (!severity || severity === '--') {
              return (
                <span className='paragraph-small inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500'>
                  --
                </span>
              );
            }

            return (
              <span className='paragraph-small line-clamp-1 text-text-sub-600 text-nowrap'>
                {severity || '--'}
              </span>
            );
          },
          enableSorting: true, // Backend sortable
        },
        {
          id: 'assignee',
          accessorKey: 'assigned_to',
          columnLabel: 'Assignee',
          header: sortableHeader('Assignee'),
          cell: ({ row }) => {
            // Use unified field mapping helper
            const assignee = getTicketFieldValue(row.original, 'assigned_to');

            // Normalize assignee value to array
            const assigneeValue = Array.isArray(assignee) ? assignee : assignee ? [assignee] : [];

            // If editable, show multi-select
            if (!isClientUser && permissions.canEdit && onAssigneeUpdate) {
              const ticketId = row.original.name || row.original.id;
              const ticketType = getTicketFieldValue(row.original, 'custom_ticket_type');
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <AssigneeMultiSelect
                    value={assigneeValue}
                    onBlur={(values) => {
                      // Trigger update on blur with final selection and current assignees
                      onAssigneeUpdate?.(ticketId, values, assigneeValue);
                    }}
                    disabled={!permissions.canEdit}
                    placeholder='Select assignees'
                    maxVisibleAvatars={3}
                    internalOnly={ticketType === 'Internal ticket'}
                  />
                </div>
              );
            }

            // Otherwise, show read-only avatars
            if (assigneeValue.length === 0) {
              return <span className='paragraph-small text-text-sub-400'>-</span>;
            }

            // For multiple assignees, use AvatarGroup
            return (
              <AvatarGroup.Root size={24}>
                {assigneeValue.slice(0, 3).map((assigneeItem, index) => {
                  // Handle new assignees structure with full_name and user_image
                  const assigneeName =
                    typeof assigneeItem === 'string'
                      ? assigneeItem
                      : assigneeItem.full_name || assigneeItem.name || assigneeItem.email || 'User';
                  const assigneeImage =
                    typeof assigneeItem === 'object'
                      ? assigneeItem.user_image || assigneeItem.image || assigneeItem.avatar
                      : null;

                  return (
                    <Tooltip.Root size='xsmall' key={assigneeName || index}>
                      <Tooltip.Trigger asChild>
                        <Avatar.Root key={index} size={24} color='gray'>
                          {assigneeImage ? (
                            <Avatar.Image src={assigneeImage} alt={assigneeName} />
                          ) : (
                            <span className='text-label-sm'>
                              {(() => {
                                const nameParts = assigneeName.trim().split(' ').filter(Boolean);
                                if (nameParts.length === 0) return 'U';
                                const fInitial = upperFirst(nameParts[0])[0] || '';
                                const lInitial =
                                  nameParts.length > 1 ? upperFirst(nameParts.at(-1))[0] || '' : '';
                                return fInitial + lInitial;
                              })()}
                            </span>
                          )}
                        </Avatar.Root>
                      </Tooltip.Trigger>
                      {assigneeName && (
                        <Tooltip.Content size='xsmall' side='bottom'>
                          {assigneeName}
                        </Tooltip.Content>
                      )}
                    </Tooltip.Root>
                  );
                })}
                {assigneeValue.length > 3 && (
                  <AvatarGroup.Overflow size={24}>+{assigneeValue.length - 3}</AvatarGroup.Overflow>
                )}
              </AvatarGroup.Root>
            );
          },
          enableSorting: true,
        },
        {
          id: 'resolution_time',
          accessorKey: 'resolution_time',
          columnLabel: 'Resolution Time',
          header: sortableHeader('Resolution Time'),
          cell: ({ row }) => {
            const ticket = row.original;
            const status = ticket.status || '';
            // agreement_status possible values: "First Response Due", "Resolution Due", "Failed", "Fulfilled", "Paused"
            const agreementStatus = ticket.agreement_status || '';
            const hasFirstResponse = Boolean(ticket.first_responded_on);

            if (hasFirstResponse) {
              const durationLabel = getFirstResponseDuration(
                ticket.first_responded_on,
                ticket.creation,
              );

              if (durationLabel) {
                return (
                  <span className='paragraph-small whitespace-nowrap text-success-base'>
                    {durationLabel}
                  </span>
                );
              }
            }

            const countdown = getResponseCountdown(ticket.response_by);

            if (countdown?.isBreached || agreementStatus === 'Failed') {
              return (
                <Badge.Root variant='light' color='red' className='text-nowrap'>
                  breached
                </Badge.Root>
              );
            }

            if (countdown) {
              const toneClass =
                countdown.urgency === 'high' ? 'text-error-base' : 'text-warning-base';

              return (
                <span className={cn('paragraph-small whitespace-nowrap', toneClass)}>
                  {countdown.label}
                </span>
              );
            }

            // Fallback when no SLA or response data
            if (status === 'Resolved' || status === 'Closed') {
              return (
                <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
                  Resolved
                </span>
              );
            }

            return (
              <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
                Not Resolved
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: 'category',
          accessorKey: 'category',
          columnLabel: 'Category',
          header: sortableHeader('Category'),
          cell: ({ row }) => {
            const category = getTicketFieldValue(row.original, 'category');
            return (
              <span className='paragraph-small line-clamp-1 text-text-sub-600 text-nowrap'>
                {category || '--'}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: 'sub_category',
          accessorKey: 'sub_category',
          columnLabel: 'Sub Category',
          header: sortableHeader('Sub Category'),
          cell: ({ row }) => {
            const subCategory = getTicketFieldValue(row.original, 'sub_category');
            return (
              <span className='paragraph-small line-clamp-1 text-text-sub-600 text-nowrap'>
                {subCategory || '--'}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: 'creation',
          accessorKey: 'creation',
          columnLabel: 'Start Date',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span className='text-paragraph-sm text-text-sub-600'>Start Date</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Start Date ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const datetime = row.original.creation;
            return (
              <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
                {safeDisplayDateTime(datetime)}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: 'updated_datetime',
          accessorKey: 'updated_datetime',
          columnLabel: 'Last Updated Date & Time',
          header: sortableHeader('Last Updated Date & Time'),
          cell: ({ row }) => {
            const datetime = row.original.updated_datetime;
            return (
              <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
                {safeDisplayDateTime(datetime)}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: 'custom_ticket_type',
          accessorKey: 'custom_ticket_type',
          columnLabel: 'Ticket Type',
          header: sortableHeader('Ticket Type'),
          cell: ({ row }) => {
            const ticketType = getTicketFieldValue(row.original, 'custom_ticket_type');
            return (
              <span className='paragraph-small line-clamp-1 text-text-sub-600 text-nowrap'>
                {ticketType || '--'}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: 'raised_by',
          accessorKey: 'raised_by',
          columnLabel: 'Issue Raised by',
          header: sortableHeader('Issue Raised by'),
          cell: ({ row }) => {
            const value =
              row.original.raised_by_label ||
              row.original.raised_by_display ||
              row.original.issue_raised_by_label ||
              row.original.issue_raised_by_display ||
              '';
            return (
              <Tooltip.Root size='xsmall'>
                <Tooltip.Trigger>
                  <span className='paragraph-small line-clamp-1 text-text-sub-600 text-nowrap'>
                    {value || '--'}
                  </span>
                </Tooltip.Trigger>
                {value && <Tooltip.Content size='xsmall'>{value}</Tooltip.Content>}
              </Tooltip.Root>
            );
          },
          enableSorting: true,
        },
        {
          id: 'spoc',
          columnLabel: 'SPOC',
          header: sortableHeader('SPOC'),
          cell: ({ row }) => {
            const ticketType = getTicketFieldValue(row.original, 'custom_ticket_type');
            const isClientTicket = ticketType === 'Client ticket';
            const value = isClientTicket
              ? row.original.client_spoc_label || row.original.client_spoc_display || ''
              : row.original.center_spoc_label || row.original.center_spoc_display || '';
            const label = isClientTicket ? 'Client SPOC' : 'Center SPOC';

            return (
              <Tooltip.Root size='xsmall'>
                <Tooltip.Trigger>
                  <span className='paragraph-small line-clamp-1 text-text-sub-600 text-wrap'>
                    {value || '--'}
                  </span>
                </Tooltip.Trigger>
                {value && (
                  <Tooltip.Content size='xsmall'>
                    {label}: {value}
                  </Tooltip.Content>
                )}
              </Tooltip.Root>
            );
          },
          enableSorting: true,
        },
        {
          id: 'floor',
          accessorKey: 'floor',
          columnLabel: 'Floor',
          header: sortableHeader('Floor'),
          cell: ({ row }) => {
            const floor = getTicketFieldValue(row.original, 'floor');
            return (
              <span className='paragraph-small line-clamp-1 text-text-sub-600 text-nowrap'>
                {floor || '--'}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: 'space',
          accessorKey: 'space',
          columnLabel: 'Space',
          header: sortableHeader('Space'),
          cell: ({ row }) => {
            // const space = getTicketFieldValue(row.original, 'space');
            return (
              <span className='paragraph-small line-clamp-1 text-text-sub-600 text-nowrap'>
                {row.original.custom_space_name || '--'}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: 'due_date',
          accessorKey: 'due_date',
          columnLabel: 'Due Date',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span className='text-paragraph-sm text-text-sub-600'>Due Date</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Due Date ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const dueDate = row.original.due_date || row.original.custom_due_date;
            return (
              <span className='paragraph-small whitespace-nowrap text-text-sub-600'>
                {dueDate ? safeDisplayDateTime(dueDate) : '--'}
              </span>
            );
          },
          enableSorting: true,
        },
        {
          id: 'visible_to_client',
          accessorKey: 'visible_to_client',
          columnLabel: 'Visible to Client',
          header: sortableHeader('Visible to Client'),
          cell: ({ row }) => {
            const visible = row.original.visible_to_client || row.original.custom_visible_to_client;
            return (
              <span className='paragraph-small text-text-sub-600'>{visible ? 'Yes' : 'No'}</span>
            );
          },
          enableSorting: true,
        },
        ...(permissions.canDelete
          ? [
              {
                id: 'actions',
                header: <div className='invisible'>A</div>,
                enableHiding: false,
                cell: ({ row }) => (
                  <div className='flex items-center justify-end'>
                    <CompactButton.Root
                      type='button'
                      variant='error'
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.(row.original);
                      }}
                      aria-label='Delete ticket'
                    >
                      <CompactButton.Icon as={RiDeleteBinLine} />
                    </CompactButton.Root>
                  </div>
                ),
                enableSorting: false,
                meta: {
                  headClassName: 'sticky right-0 z-30 bg-bg-weak-50',
                  cellClassName: 'border-stroke-soft-200 sticky right-0 z-30 bg-white',
                },
              },
            ]
          : []),
      ];

      // For client users, filter to only show allowed columns
      if (isClientUser) {
        return columns.filter((col) => clientUserAllowedColumns.includes(col.id));
      }

      return columns;
    }, [
      onRowSelect,
      permissions,
      onAssigneeUpdate,
      onStatusUpdate,
      statusOptions,
      dynamicStatusOptions,
      onPriorityUpdate,
      priorityOptions,
      onDelete,
      isClientUser,
      isFacilityManagerUser,
      getPriorityColor,
      clientUserAllowedColumns,
    ]);

    // Prepare columns for column management with default visibility and order
    // Note: Actions column is excluded from configuration and always rendered last
    const defaultColumnConfig = useMemo(() => {
      // Exclude actions column from configuration
      const configurableColumns = allColumnDefs.filter((col) => col.id !== 'actions');
      const config = prepareColumnsForConfig(configurableColumns);

      // Default visible columns differ for client vs non‑client users
      // Client: ID, Title, Status, Center, Zone, Assignee, Start Date (Floor and Description hidden by default)
      // Non‑client: Title, Status, Assignee, Resolution Time, Priority, Center, Client
      const defaultVisibleOrder = isClientUser
        ? [
            'name', // ID
            'title', // Title
            'status', // Status
            'center', // Center
            'zone', // Zone
            'raised_by',
            'spoc',
            'assignee', // Assignee
            'creation', // Start Date
            // 'floor' and 'description' are hidden by default
          ]
        : [
            // 'name', // ID
            'title', // Title
            'customer', // Client
            'center', // Center
            'zone', // Zone
            'space', // Space (internal tickets)
            'raised_by',
            'spoc',
            'assignee', // Assignee
            'resolution_time', // Resolution Time
            'status', // Status
            'priority', // Priority
            // 'severity', // Severity
          ];

      // Set visibility and order
      const configMap = new Map(config.map((col) => [col.id, col]));

      // First, set all columns to hidden by default (except those that can't be hidden)
      config.forEach((col) => {
        if (col.enableHiding !== false) {
          col.visible = false;
        }
      });

      // Then, set visible columns in the specified order
      defaultVisibleOrder.forEach((colId, index) => {
        const col = configMap.get(colId);
        if (col) {
          col.visible = true;
          col.order = index;
        }
      });

      // Set order for hidden columns (after visible ones)
      let hiddenOrder = defaultVisibleOrder.length;
      config.forEach((col) => {
        if (!col.visible) {
          col.order = hiddenOrder++;
        }
      });

      // Sort by order
      return config.sort((a, b) => a.order - b.order);
    }, [isClientUser]);

    // Use column configuration hook (only if external config not provided)
    const internalColumnConfigHook = useColumnConfig(
      tableId,
      defaultColumnConfig,
      async (data) => {
        // Only save, don't fetch back to avoid infinite loop
        await dispatch(updateTicketColumnList(data)).unwrap();
      },
      async () => {
        return await dispatch(fetchTicketColumnList())
          .unwrap()
          .then((data) => {
            return data;
          });
      },
      {
        autoSave: true,
        debounce: true,
      },
    );

    const activeColumnConfigHook = externalColumnConfig || internalColumnConfigHook;
    syncColumnConfigHookToPopover(activeColumnConfigHook);

    const {
      columns: columnConfig,
      visibleColumns: visibleColumnConfig,
      isLoading: isLoadingColumnConfig,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    } = activeColumnConfigHook;

    // Expose methods to parent via ref
    React.useImperativeHandle(ref, () => ({
      columnConfig,
      columnConfigHook: activeColumnConfigHook,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    }));

    // Get actions column separately (always last, not configurable)
    const actionsColumn = useMemo(
      () => allColumnDefs.find((col) => col.id === 'actions'),
      [allColumnDefs],
    );

    // Apply column config and always append actions column at the end
    const columns = useMemo(() => {
      // Filter out actions column before applying config
      const configurableColumnDefs = allColumnDefs.filter((col) => col.id !== 'actions');
      const configuredColumns = applyColumnConfig(configurableColumnDefs, columnConfig);
      // Always add actions column at the end if it exists
      return actionsColumn ? [...configuredColumns, actionsColumn] : configuredColumns;
    }, [allColumnDefs, columnConfig, actionsColumn]);

    const table = useReactTable({
      data: rows,
      columns,
      state: {
        sorting: localSorting,
      },
      defaultColumn: {
        minSize: 100,
        size: DEFAULT_TICKET_COLUMN_WIDTH,
      },
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      manualSorting: true,
      enableSortingRemoval: true,
    });

    const tableContainerRef = React.useRef(null);
    const [containerWidth, setContainerWidth] = React.useState(0);

    React.useEffect(() => {
      const container = tableContainerRef.current;
      if (!container) return undefined;

      const updateWidth = () => {
        setContainerWidth(container.clientWidth);
      };

      updateWidth();

      if (typeof ResizeObserver === 'undefined') {
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
      }

      const observer = new ResizeObserver(updateWidth);
      observer.observe(container);
      return () => observer.disconnect();
    }, []);

    const otherColumnsWidth = useMemo(
      () =>
        columns
          .filter((col) => col.id !== TITLE_COLUMN_ID)
          .reduce((sum, col) => sum + getFixedTicketColumnWidth(col.id, columns), 0),
      [columns],
    );

    const titleColumnWidth = useMemo(() => {
      if (!containerWidth) {
        return TITLE_COLUMN_DEFAULT_WIDTH;
      }

      const availableWidth = containerWidth - otherColumnsWidth;
      return Math.max(TITLE_COLUMN_MIN_WIDTH, availableWidth);
    }, [containerWidth, otherColumnsWidth]);

    const getColumnWidth = useCallback(
      (columnId) => {
        if (columnId === TITLE_COLUMN_ID) return titleColumnWidth;
        return getFixedTicketColumnWidth(columnId, columns);
      },
      [columns, titleColumnWidth],
    );

    const tableMinWidth = useMemo(
      () => otherColumnsWidth + TITLE_COLUMN_MIN_WIDTH,
      [otherColumnsWidth],
    );

    const getColumnStyle = useCallback(
      (columnId) => {
        const width = getColumnWidth(columnId);

        if (columnId === TITLE_COLUMN_ID) {
          return {
            width,
            minWidth: TITLE_COLUMN_MIN_WIDTH,
          };
        }

        if (columnId === 'actions') {
          return {
            width,
            minWidth: ACTIONS_COLUMN_WIDTH,
            maxWidth: ACTIONS_COLUMN_WIDTH,
          };
        }

        return {
          width,
          minWidth: width,
          maxWidth: width,
        };
      },
      [getColumnWidth],
    );

    // Error state
    if (error) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
            <RiErrorWarningLine className='size-6 text-error-base' />
          </div>
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>Unable to Load Tickets</h3>
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
      <Table.Body>
        {Array.from({ length: 6 }).map((_, index, array) => (
          <React.Fragment key={`skeleton-${index}`}>
            <Table.Row>
              {columns.map((column) => (
                <Table.Cell
                  key={column.id || column.accessorKey}
                  className={column.meta?.cellClassName}
                  style={getColumnStyle(column.id)}
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

    return (
      <div ref={tableContainerRef} className='flex-1 min-h-0 flex flex-col w-full overflow-hidden'>
        <SetStatusesModal
          open={isSetStatusesOpen}
          onOpenChange={setIsSetStatusesOpen}
          doctype='HD Ticket'
          field='status'
        />
        <Table.Root
          variant={variant}
          tableInstance={table}
          style={{ tableLayout: 'fixed', width: '100%', minWidth: tableMinWidth }}
          className='min-h-0 flex-1 overflow-auto'
        >
          <Table.Header className='sticky top-0 z-30 bg-bg-weak-50'>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Head
                    key={header.id}
                    column={header.column}
                    className={header.column.columnDef.meta?.headClassName}
                    style={getColumnStyle(header.column.id)}
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
                        column={cell.column}
                        className={cn(
                          cell.column.columnDef.meta?.cellClassName,
                          cell.column.id === TITLE_COLUMN_ID && 'overflow-hidden',
                        )}
                        style={getColumnStyle(cell.column.id)}
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

                  {i < rows.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))}

              {/* Scroll pagination sentinel and loading indicator */}
              {enableScrollPagination && (
                <>
                  {/* Sentinel row for intersection observer - must be a tr/td, not div */}
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
                            Loading more tickets...
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
    );
  },
);

TicketTable.displayName = 'TicketTable';

export default TicketTable;
