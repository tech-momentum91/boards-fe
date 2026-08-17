import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import * as Tag from '@/components/ui/tag';
import * as Tooltip from '@/components/ui/tooltip';
import { SearchableSelect } from '@/components/ui/searchable-select';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import { Datepicker } from '@/components/ui/datepicker';
import {
  getStatusVariant,
  parseTags,
  getAssigneeDisplayName,
  normalizeTaskAssigneeEntry,
} from '@/utils/task-utils';
import { applyColumnConfig } from '@/lib/column-utils';
import {
  FALLBACK_PRIORITY_OPTIONS,
  getPriorityColor,
  normalizeCenterDisplayList,
} from './task-view-drawer-utils';
import { TASK_STATUS_OPTIONS } from './constants';
import TaskStatusDropdown from '@/components/client-onboarding/task-status-dropdown';
import { safeDisplayDateTime, parseToDate } from '@/utils/date-utils';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import SetStatusesModal, {
  StatusColumnPopover,
} from '@/components/space-management/status-configuration';

export const TASK_CENTER_NAME_MAX_LENGTH = 20;

/** Primary center display name for a task (name only, no id suffix). */
export function getTaskPrimaryCenterName(task) {
  const names = normalizeCenterDisplayList(task);
  if (names.length === 0) return null;
  const first = String(names[0]).trim();
  const match = first.match(/^(.+?)\s*\([^)]+\)$/);
  return match ? match[1].trim() : first;
}

export function truncateTaskCenterName(name, maxLength = TASK_CENTER_NAME_MAX_LENGTH) {
  const s = String(name || '').trim();
  if (!s) return { text: '', isTruncated: false };
  if (s.length <= maxLength) return { text: s, isTruncated: false };
  return { text: `${s.slice(0, maxLength)}...`, isTruncated: true };
}

/** Center name badge for task drawer (truncate at 20 chars, tooltip shows full name). */
export function TaskCenterNameBadge({ task, emptyPlaceholder = '--', className }) {
  const fullName = getTaskPrimaryCenterName(task);
  if (!fullName) {
    return <span className='paragraph-small text-text-sub-400'>{emptyPlaceholder}</span>;
  }

  const { text, isTruncated } = truncateTaskCenterName(fullName);

  const badge = (
    <Badge.Root variant='lighter' color='gray' size='medium' className={className}>
      <span className='paragraph-small font-medium text-text-strong-950'>{text}</span>
    </Badge.Root>
  );

  if (!isTruncated) return badge;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span className='inline-flex max-w-full'>{badge}</span>
      </Tooltip.Trigger>
      <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
        {fullName}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

/** Shared center column cell for task tables (`custom_center`, etc.). */
export function TaskCenterTableCell({ task }) {
  const centerNames = normalizeCenterDisplayList(task);
  if (centerNames.length === 0) {
    return <span className='paragraph-small text-text-sub-400 whitespace-nowrap'>--</span>;
  }

  const stripCenterIdSuffix = (label) => {
    const match = String(label).match(/^(.+?)\s*\([^)]+\)$/);
    return match ? match[1].trim() : String(label).trim();
  };

  const firstCenter = stripCenterIdSuffix(centerNames[0]);
  const additionalCenters = centerNames.slice(1).map(stripCenterIdSuffix);
  const additionalCount = additionalCenters.length;

  return (
    <div className='flex flex-wrap items-center gap-2 whitespace-nowrap'>
      <Badge.Root variant='lighter' color='gray' size='medium'>
        <span className='paragraph-small font-medium text-text-strong-950 max-w-[140px] truncate'>
          {firstCenter}
        </span>
      </Badge.Root>
      {additionalCount > 0 ? (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Badge.Root variant='lighter' color='gray' size='medium'>
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
                {additionalCenters.map((center, index) => (
                  <div key={index} className='text-paragraph-sm text-text-sub-600'>
                    {center}
                  </div>
                ))}
              </div>
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      ) : null}
    </div>
  );
}

const TasksTableCommon = ({
  tasks = [],
  tableVariant = 'compact',
  sorting = null, // { field: 'priority', direction: 'asc' } or null
  onTaskClick,
  onSortChange, // (field) => void
  searchTerm = '',
  columns = ['task', 'assigned_to', 'duration', 'tags', 'priority', 'status'],
  visibleColumnConfig = null,
  showRecurring = false, // For frequency/recurrence_period sorting
  columnLabels = {}, // Map of column ID to label: { task: 'Task', assigned_to: 'Assignees', ... }
  onAssigneeUpdate, // (taskId, assignees, currentAssignees) => void
  onPriorityUpdate, // (taskId, priority) => void
  onStatusUpdate, // (taskId, status) => void
  onDueDateUpdate, // (taskId, dueDate) => void
  /** Partner detail CRM tasks use a wider status set than master (Active/Inactive) */
  taskStatusOptions = TASK_STATUS_OPTIONS,
  /**
   * When set, show status-column gear + Set Statuses modal.
   * Shape: { doctype, field, context?, fieldLabel?, showImport? }
   */
  statusConfigScope = null,
  statusColumnConfigHook = null,
  onStatusConfigSaved,
  /** When set, assignee column only lists these users (e.g. Partner Master sales team) */
  fixedAssigneeOptions,
  fixedAssigneeOptionsLoading = false,
  /** When set, assignee editor uses these options (e.g. Roles list) */
  assigneeOptions,
  assigneeOptionsLoading = false,

  // Optional infinite scroll pagination (matches ClientDetailTasksTable pattern)
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  enableScrollPagination = false,
}) => {
  const [localSorting, setLocalSorting] = useState([]);
  const [isSetStatusesOpen, setIsSetStatusesOpen] = useState(false);
  const canConfigureStatuses = Boolean(statusConfigScope?.doctype && statusConfigScope?.field);

  const { sentinelRef } = useScrollPagination({
    onLoadMore: onLoadMore || (() => {}),
    hasMore: Boolean(hasMore && enableScrollPagination),
    isLoading: Boolean(isLoadingMore),
    threshold: 200,
    scrollContainer: null,
    enabled: Boolean(enableScrollPagination && onLoadMore),
  });

  // Convert sorting prop to React Table format
  useEffect(() => {
    if (sorting?.field) {
      setLocalSorting([
        {
          id: sorting.field,
          desc: sorting.direction === 'desc',
        },
      ]);
    } else {
      setLocalSorting([]);
    }
  }, [sorting]);

  // Handle sorting change from React Table
  const handleSortingChange = useCallback(
    (updaterOrValue) => {
      const newSorting =
        typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;
      setLocalSorting(newSorting);

      // Convert to parent's format and call onSortChange
      if (newSorting && newSorting.length > 0) {
        const sort = newSorting[0];
        if (onSortChange) {
          // Simply call onSortChange - parent handles the cycle logic (null -> asc -> desc -> null)
          onSortChange(sort.id);
        }
      } else if (onSortChange && sorting?.field) {
        // Clearing sort - need to call onSortChange to clear parent state
        onSortChange(sorting.field);
      }
    },
    [localSorting, onSortChange, sorting],
  );

  // Define all column definitions
  const allColumnDefs = useMemo(() => {
    const baseColumns = [
      {
        id: 'task',
        enableSorting: true,
        header: ({ column }) => {
          const isActive = sorting?.field === 'task';
          const currentDirection = isActive ? sorting.direction : null;
          const label = columnLabels.task || 'Task';

          return (
            <div className='flex items-center gap-0.5'>
              <span>{label}</span>
              {onSortChange && (
                <button
                  type='button'
                  className='cursor-pointer'
                  onClick={() => {
                    onSortChange('task');
                  }}
                  aria-label={`Sort by ${label.toLowerCase()}`}
                >
                  {Table.getSortingIcon(currentDirection)}
                </button>
              )}
            </div>
          );
        },
        cell: ({ row }) => {
          const task = row.original;
          const title = task.task_name || task.subject || 'Untitled Task';
          return (
            <div className='flex flex-col gap-1 min-w-0'>
              <Tooltip.Root size='xsmall'>
                <Tooltip.Trigger asChild>
                  <span className='font-medium text-text-main-900 block max-w-[550px] whitespace-nowrap overflow-hidden text-ellipsis'>
                    {title}
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Content side='bottom'>{title}</Tooltip.Content>
              </Tooltip.Root>
            </div>
          );
        },
        meta: {
          cellClassName: 'px-4 paragraph-small text-[var(--color-text-sub-500)] max-w-[260px]',
        },
      },
      {
        id: 'assigned_to',
        header: () => (
          <div className='flex items-center gap-0.5'>{columnLabels.assigned_to || 'Assignee'}</div>
        ),
        cell: ({ row }) => {
          const task = row.original;
          const assignee = task.assignees || task.assigned_to;
          const taskId = task.name || task.task_id || task.id;

          const assigneeValueRaw = Array.isArray(assignee) ? assignee : assignee ? [assignee] : [];
          const assigneeValueForControl = assigneeValueRaw
            .map(normalizeTaskAssigneeEntry)
            .filter(Boolean);
          const previousAssigneeIds = assigneeValueRaw
            .map((a) =>
              typeof a === 'string'
                ? a
                : a.user || a.email || a.value || a.assignee || a.name || '',
            )
            .filter(Boolean);
          const currentSingleValue =
            typeof assigneeValueForControl[0] === 'string'
              ? assigneeValueForControl[0]
              : assigneeValueForControl[0]?.value || '';

          // If editable, show multi-select
          if (onAssigneeUpdate && taskId) {
            return (
              <div onClick={(e) => e.stopPropagation()}>
                {Array.isArray(assigneeOptions) ? (
                  (() => {
                    const matchedBase = assigneeOptions.find(
                      (o) =>
                        String(o?.value ?? '') === String(currentSingleValue) ||
                        String(o?.label ?? '') === String(currentSingleValue),
                    );
                    const displayFromTask =
                      assigneeValueRaw.length > 0
                        ? getAssigneeDisplayName(assigneeValueRaw[0])
                        : '';
                    const needsGhostOption =
                      Boolean(currentSingleValue) &&
                      !matchedBase &&
                      displayFromTask &&
                      String(displayFromTask).trim() !== '' &&
                      String(displayFromTask) !== String(currentSingleValue);
                    const ghostOption = needsGhostOption
                      ? [{ value: currentSingleValue, label: displayFromTask }]
                      : [];
                    const selectOptions = [...ghostOption, ...assigneeOptions];
                    const matched = selectOptions.find(
                      (o) =>
                        String(o?.value ?? '') === String(currentSingleValue) ||
                        String(o?.label ?? '') === String(currentSingleValue),
                    );
                    return (
                      <SearchableSelect
                        variant='borderless'
                        value={currentSingleValue}
                        onValueChange={(nextValue) => {
                          if (!nextValue || nextValue === currentSingleValue) return;
                          onAssigneeUpdate?.(taskId, [nextValue], previousAssigneeIds);
                        }}
                        size='xsmall'
                        disabled={assigneeOptionsLoading}
                        options={selectOptions}
                        placeholder='—'
                        renderTrigger={({ selectedOption }) =>
                          currentSingleValue ? (
                            <Badge.Root
                              variant='stroke'
                              color='gray'
                              size='small'
                              className='bg-bg-white-0 ring-stroke-soft-200 text-text-sub-500 whitespace-nowrap normal-case'
                            >
                              {selectedOption?.label || currentSingleValue}
                            </Badge.Root>
                          ) : (
                            <span className='text-paragraph-xs text-text-sub-500'>—</span>
                          )
                        }
                      />
                    );
                  })()
                ) : (
                  <AssigneeMultiSelect
                    value={assigneeValueForControl}
                    onBlur={(values) => {
                      const prev = [...previousAssigneeIds].sort().join(',');
                      const next = [...(Array.isArray(values) ? values : [])].sort().join(',');
                      if (prev === next) return;
                      onAssigneeUpdate?.(taskId, values, previousAssigneeIds);
                    }}
                    placeholder='Select assignees'
                    maxVisibleAvatars={3}
                    fixedAssigneeOptions={fixedAssigneeOptions}
                    fixedAssigneeOptionsLoading={fixedAssigneeOptionsLoading}
                  />
                )}
              </div>
            );
          }

          // Same avatar stack as editable event-task rows, but read-only (e.g. event task master list)
          if (!onAssigneeUpdate && taskId && fixedAssigneeOptions !== undefined) {
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <AssigneeMultiSelect
                  value={assigneeValueForControl}
                  readonly
                  fixedAssigneeOptions={fixedAssigneeOptions}
                  fixedAssigneeOptionsLoading={fixedAssigneeOptionsLoading}
                  maxVisibleAvatars={3}
                  placeholder='—'
                />
              </div>
            );
          }

          // Show read-only badges (like tags)
          if (assigneeValueRaw.length === 0) {
            return <span className='paragraph-small text-text-sub-400'>-</span>;
          }

          return (
            <div className='flex flex-wrap gap-1'>
              {assigneeValueRaw.slice(0, 2).map((raw, index) => {
                const label = getAssigneeDisplayName(raw);
                return (
                  <Badge.Root
                    key={`${label}-${index}`}
                    variant='stroke'
                    color='gray'
                    size='small'
                    className='bg-bg-white-0 ring-stroke-soft-200 text-text-sub-500 whitespace-nowrap normal-case'
                  >
                    {label}
                  </Badge.Root>
                );
              })}
              {assigneeValueRaw.length > 2 && (
                <Badge.Root
                  variant='stroke'
                  color='gray'
                  size='small'
                  className='bg-bg-white-0 ring-stroke-soft-200 text-text-sub-500 whitespace-nowrap normal-case'
                >
                  +{assigneeValueRaw.length - 2}
                </Badge.Root>
              )}
            </div>
          );
        },
        meta: {
          cellClassName: 'px-4',
        },
      },
      {
        id: 'centers',
        enableSorting: false,
        header: () => (
          <div className='flex items-center gap-0.5'>{columnLabels.centers || 'Center'}</div>
        ),
        cell: ({ row }) => <TaskCenterTableCell task={row.original} />,
        meta: {
          cellClassName: 'px-4',
        },
      },
      {
        id: 'duration',
        enableSorting: true,
        header: ({ column }) => {
          const isActive = sorting?.field === 'duration';
          const currentDirection = isActive ? sorting.direction : null;
          const label = columnLabels.duration || 'Duration';

          return (
            <div className='flex items-center gap-0.5'>
              <span>{label}</span>
              {onSortChange && (
                <button
                  type='button'
                  className='cursor-pointer'
                  onClick={() => {
                    onSortChange('duration');
                  }}
                  aria-label={`Sort by ${label.toLowerCase()}`}
                >
                  {Table.getSortingIcon(currentDirection)}
                </button>
              )}
            </div>
          );
        },
        cell: ({ row }) => {
          const task = row.original;
          return task.duration ? `${task.duration} Days` : '—';
        },
        meta: {
          cellClassName: 'px-4 paragraph-small whitespace-nowrap text-[var(--color-text-sub-500)]',
        },
      },
      {
        id: 'due_date',
        enableSorting: true,
        header: ({ column }) => {
          const isActive = sorting?.field === 'due_date';
          const currentDirection = isActive ? sorting.direction : null;
          const label = columnLabels.due_date || 'Due Date';

          return (
            <div className='flex items-center gap-0.5'>
              <span>{label}</span>
              {onSortChange && (
                <button
                  type='button'
                  className='cursor-pointer'
                  onClick={() => {
                    onSortChange('due_date');
                  }}
                  aria-label={`Sort by ${label.toLowerCase()}`}
                >
                  {Table.getSortingIcon(currentDirection)}
                </button>
              )}
            </div>
          );
        },
        cell: ({ row }) => {
          const task = row.original;
          const taskId = task.name || task.task_id || task.id;
          const dueDate = task.due_date || task.custom_due_date || '';

          // If editable, show datepicker
          if (onDueDateUpdate && taskId) {
            const dateValue = dueDate ? parseToDate(dueDate) : null;

            return (
              <div onClick={(e) => e.stopPropagation()}>
                <Datepicker
                  value={dateValue}
                  onChange={(date) => {
                    if (!taskId) return;
                    const dateString = date
                      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                      : '';
                    onDueDateUpdate?.(taskId, dateString);
                  }}
                  placeholder='Select date'
                  size='small'
                />
              </div>
            );
          }

          // Show read-only date
          if (!dueDate) {
            return <span className='text-paragraph-xs text-text-sub-500'>—</span>;
          }
          return (
            <span className='paragraph-small text-[var(--color-text-sub-500)]'>
              {safeDisplayDateTime(dueDate)}
            </span>
          );
        },
        meta: {
          cellClassName: 'px-4 paragraph-small whitespace-nowrap text-[var(--color-text-sub-500)]',
        },
      },
      {
        id: 'tags',
        header: () => (
          <div className='flex items-center gap-0.5'>{columnLabels.tags || 'Tags'}</div>
        ),
        cell: ({ row }) => {
          const task = row.original;
          const tagsValue = parseTags(task.tags);

          if (tagsValue.length === 0) {
            return <span className='text-paragraph-xs text-text-sub-500'>—</span>;
          }

          return (
            <div className='flex flex-wrap gap-1'>
              {tagsValue.slice(0, 3).map((tag, index) => (
                <Badge.Root
                  key={index}
                  variant='stroke'
                  color='gray'
                  size='small'
                  className='bg-bg-white-0 ring-stroke-soft-200 text-text-sub-500 whitespace-nowrap normal-case'
                >
                  {typeof tag === 'string' ? tag : tag.label || tag.name}
                </Badge.Root>
              ))}
              {tagsValue.length > 3 && (
                <Badge.Root
                  variant='stroke'
                  color='gray'
                  size='small'
                  className='bg-bg-white-0 ring-stroke-soft-200 text-text-sub-500 whitespace-nowrap normal-case'
                >
                  +{tagsValue.length - 3}
                </Badge.Root>
              )}
            </div>
          );
        },
        meta: {
          cellClassName: 'px-4',
        },
      },
      {
        id: 'priority',
        enableSorting: true,
        header: ({ column }) => {
          const isActive = sorting?.field === 'priority';
          const currentDirection = isActive ? sorting.direction : null;
          const label = columnLabels.priority || 'Priority';

          return (
            <div className='flex items-center gap-0.5'>
              <span>{label}</span>
              {onSortChange && (
                <button
                  type='button'
                  className='cursor-pointer'
                  onClick={() => {
                    onSortChange('priority');
                  }}
                  aria-label={`Sort by ${label.toLowerCase()}`}
                >
                  {Table.getSortingIcon(currentDirection)}
                </button>
              )}
            </div>
          );
        },
        cell: ({ row }) => {
          const task = row.original;
          const taskId = task.name || task.task_id || task.id;
          const priority = task.priority || '';

          // If editable, show select dropdown
          if (onPriorityUpdate && taskId) {
            const safePriority = !priority || priority === '--' ? '' : priority;
            const color = getPriorityColor(safePriority);

            return (
              <div onClick={(e) => e.stopPropagation()}>
                <SearchableSelect
                  variant='borderless'
                  value={safePriority}
                  onValueChange={(value) => {
                    if (!taskId) return;
                    onPriorityUpdate?.(taskId, value);
                  }}
                  size='xsmall'
                  options={FALLBACK_PRIORITY_OPTIONS}
                  placeholder='—'
                  renderTrigger={({ selectedOption }) =>
                    safePriority ? (
                      <Badge.Root variant='light' color={color} className='text-nowrap'>
                        {selectedOption?.label || safePriority}
                      </Badge.Root>
                    ) : (
                      <span className='text-paragraph-xs text-text-sub-500'>—</span>
                    )
                  }
                  renderOptionLabel={(option) => (
                    <Badge.Root
                      variant='light'
                      color={getPriorityColor(option.value)}
                      className='text-nowrap'
                    >
                      {option.label}
                    </Badge.Root>
                  )}
                />
              </div>
            );
          }

          // Show read-only badge
          if (!priority) {
            return <span className='text-paragraph-xs text-text-sub-500'>—</span>;
          }
          return (
            <Badge.Root variant='light' color={getPriorityColor(priority)}>
              {priority.toUpperCase()}
            </Badge.Root>
          );
        },
        meta: {
          cellClassName: 'px-4',
        },
      },
      {
        id: 'status',
        header: () => (
          <div className='flex items-center gap-0.5'>
            {columnLabels.status || 'Status'}
            {canConfigureStatuses ? (
              <StatusColumnPopover
                columnId='status'
                columnConfigHook={statusColumnConfigHook}
                onOpenStatuses={() => setIsSetStatusesOpen(true)}
              />
            ) : null}
          </div>
        ),
        cell: ({ row }) => {
          const task = row.original;
          const taskId = task.name || task.task_id || task.id;
          const status = task.status || '';

          // If editable, show StatusDropdown (button style like ticket management)
          if (onStatusUpdate && taskId) {
            const safeStatus = !status || status === '--' ? '' : status;

            return (
              <div onClick={(e) => e.stopPropagation()} className='flex items-center'>
                <TaskStatusDropdown
                  value={safeStatus}
                  onValueChange={(value) => {
                    if (!taskId) return;
                    onStatusUpdate?.(taskId, value);
                  }}
                  statusOptions={taskStatusOptions}
                  size='small'
                  variant='inline'
                />
              </div>
            );
          }

          // Show read-only badge
          if (!status) {
            return <span className='text-paragraph-xs text-text-sub-500'>—</span>;
          }
          return (
            <Badge.Root variant='light' color={getStatusVariant(status)}>
              {status.toUpperCase()}
            </Badge.Root>
          );
        },
        meta: {
          cellClassName: 'px-4',
        },
      },
    ];

    // Add recurrence_period column if showRecurring is true
    if (showRecurring) {
      baseColumns.push({
        id: 'recurrence_period',
        enableSorting: true,
        header: ({ column }) => {
          const isActive = sorting?.field === 'recurrence_period';
          const currentDirection = isActive ? sorting.direction : null;
          const label = columnLabels.recurrence_period || 'Recurrence Period';

          return (
            <div className='flex items-center gap-0.5'>
              <span>{label}</span>
              {onSortChange && (
                <button
                  type='button'
                  className='cursor-pointer'
                  onClick={() => {
                    onSortChange('recurrence_period');
                  }}
                  aria-label={`Sort by ${label.toLowerCase()}`}
                >
                  {Table.getSortingIcon(currentDirection)}
                </button>
              )}
            </div>
          );
        },
        cell: ({ row }) => {
          const task = row.original;
          return task.recurrence_period || '—';
        },
        meta: {
          cellClassName: 'px-4 paragraph-small whitespace-nowrap text-[var(--color-text-sub-500)]',
        },
      });
    }

    return baseColumns;
  }, [
    sorting,
    onSortChange,
    showRecurring,
    columnLabels,
    taskStatusOptions,
    onStatusUpdate,
    onAssigneeUpdate,
    onDueDateUpdate,
    onPriorityUpdate,
    fixedAssigneeOptions,
    fixedAssigneeOptionsLoading,
    assigneeOptions,
    assigneeOptionsLoading,
    canConfigureStatuses,
    statusColumnConfigHook,
  ]);

  // Apply column configuration if provided
  const columnsToUse = useMemo(() => {
    const columnMap = new Map(allColumnDefs.map((col) => [col.id, col]));

    if (
      visibleColumnConfig &&
      Array.isArray(visibleColumnConfig) &&
      visibleColumnConfig.length > 0
    ) {
      // Check if visibleColumnConfig has 'visible' property (full config) or just id/label
      const hasVisibleProperty = visibleColumnConfig.some((config) => 'visible' in config);

      if (hasVisibleProperty) {
        // Use applyColumnConfig for full config objects
        const result = applyColumnConfig(allColumnDefs, visibleColumnConfig);
        // If result is empty, fall back to all visible columns
        if (result.length > 0) {
          return result;
        }
      } else {
        // visibleColumnConfig is just an array of { id, label } - use it directly
        const result = visibleColumnConfig
          .map((config) => {
            const colId = typeof config === 'string' ? config : config.id;
            return columnMap.get(colId);
          })
          .filter(Boolean);
        // If result is empty, fall back to all visible columns
        if (result.length > 0) {
          return result;
        }
      }
    }

    // Fallback to columns prop if no config provided or config resulted in empty array
    const fallbackColumns = columns
      .filter((col) => {
        const colId = typeof col === 'string' ? col : col.id;
        return colId !== 'task_type' && colId !== 'task_name' && columnMap.has(colId);
      })
      .map((col) => {
        const colId = typeof col === 'string' ? col : col.id;
        return columnMap.get(colId);
      })
      .filter(Boolean);

    // If still empty, use all default columns
    if (fallbackColumns.length > 0) {
      return fallbackColumns;
    }

    // Last resort: return all column definitions (filtered)
    return allColumnDefs.filter((col) => {
      const colId = col.id;
      return colId !== 'task_type' && colId !== 'task_name';
    });
  }, [allColumnDefs, visibleColumnConfig, columns]);

  // Use React Table
  const table = useReactTable({
    data: tasks,
    columns: columnsToUse,
    state: {
      sorting: localSorting,
    },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true, // Backend sorting enabled
    enableSortingRemoval: true,
  });

  const colSpan = columnsToUse.length;

  return (
    <>
      {canConfigureStatuses ? (
        <SetStatusesModal
          open={isSetStatusesOpen}
          onOpenChange={setIsSetStatusesOpen}
          doctype={statusConfigScope.doctype}
          field={statusConfigScope.field}
          context={statusConfigScope.context}
          fieldLabel={
            statusConfigScope.fieldLabel || statusConfigScope.context || statusConfigScope.field
          }
          showImport={statusConfigScope.showImport !== false}
          onSaved={onStatusConfigSaved}
        />
      ) : null}
      <Table.Root variant={tableVariant}>
        <Table.Header>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id} className='bg-bg-weak-50'>
              {headerGroup.headers.map((header) => (
                <Table.Head
                  key={header.id}
                  className='px-4 text-left label-small text-text-sub-600 font-medium'
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </Table.Head>
              ))}
            </Table.Row>
          ))}
        </Table.Header>
        <Table.Body>
          {!tasks || tasks.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={colSpan} className='text-center py-8'>
                <span className='paragraph-small text-text-sub-500'>
                  {searchTerm ? 'No tasks found matching your search.' : 'No tasks found.'}
                </span>
              </Table.Cell>
            </Table.Row>
          ) : (
            <>
              {table.getRowModel().rows.map((row, i, rows) => (
                <React.Fragment key={row.id}>
                  <Table.Row key={row.id} onClick={() => onTaskClick && onTaskClick(row.original)}>
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
                  <Table.Row ref={sentinelRef} data-scroll-sentinel>
                    <Table.Cell colSpan={colSpan} className='h-1 p-0' />
                  </Table.Row>
                  {isLoadingMore && (
                    <Table.Row>
                      <Table.Cell colSpan={colSpan} className='py-8 text-center'>
                        <div className='flex items-center justify-center gap-2'>
                          <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                          <span className='paragraph-small text-text-sub-600'>
                            Loading more tasks...
                          </span>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </>
              )}
            </>
          )}
        </Table.Body>
      </Table.Root>
    </>
  );
};

export default TasksTableCommon;
