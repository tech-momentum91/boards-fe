import React, { useMemo, useImperativeHandle, useCallback, useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useDispatch } from 'react-redux';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import * as Avatar from '@/components/ui/avatar';
import * as AvatarGroup from '@/components/ui/avatar-group';
import * as Tooltip from '@/components/ui/tooltip';
import { SearchableSelect } from '@/components/ui/searchable-select';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import { Datepicker } from '@/components/ui/datepicker';
import { formatDateWithOrdinal, safeDisplayDateTime, parseToDate } from '@/utils/date-utils';
import {
  getPriorityColor,
  getStatusColor,
  CLIENT_DETAIL_EMPTY_STATES,
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
} from '@/components/clients-management/constants';
import TaskStatusDropdown from '@/components/client-onboarding/task-status-dropdown';
import { useColumnConfig, useColumnConfigPopoverRef } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import { useScopedTaskStatusOptions } from '@/hooks/use-status-options';
import SetStatusesModal, {
  StatusColumnPopover,
} from '@/components/space-management/status-configuration';
import {
  fetchVendorTaskColumnList,
  updateVendorTaskColumnList,
  updateVendorTaskInList,
  updateVendorTaskField,
} from '@/redux/vendorSlice';
import apiClient from '@/api/axios';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';
import { getAssigneeDisplayName, getAssigneeFirstNameInitial } from '@/utils/task-utils';

const VendorDetailTasksTable = React.forwardRef(
  (
    {
      tasks = [],
      isLoading = false,
      variant = 'compact',
      showRecurring = false,
      context = 'default', // Context for empty state: 'onboarding', 'engagement', 'exit', 'default', 'search'
      emptyStateTitle, // Optional override for title
      emptyStateDescription, // Optional override for description
      onRowClick,
      react_table_id, // Unique identifier for this table instance (e.g., 'onboarding-tasks', 'engagement-tasks', 'exit-tasks')
      sorting = [], // Sorting state from parent
      onSortingChange, // Callback when sorting changes
      onColumnConfigChange, // Callback when column config changes (so parent can sync state for ColumnManagerDropdown)
    },
    ref,
  ) => {
    const [localSorting, setLocalSorting] = useState(sorting);
    const dispatch = useDispatch();
    const [isSetStatusesOpen, setIsSetStatusesOpen] = useState(false);
    const [statusOptionsKey, setStatusOptionsKey] = useState(0);
    const { statusPopoverColumnConfig, syncColumnConfigHookToPopover } =
      useColumnConfigPopoverRef();

    const { options: statusOptions } = useScopedTaskStatusOptions({
      context: 'Vendor Onboarding',
      fallback: TASK_STATUS_OPTIONS,
      refreshKey: statusOptionsKey,
    });
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
    // Column definitions
    const allColumnDefs = useMemo(() => {
      const baseColumns = [
        {
          id: 'task',
          columnLabel: 'Client task',
          enableSorting: true,
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span className='text-paragraph-sm text-text-sub-600'>Task</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Task ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
              </div>
            );
          },
          cell: ({ row }) => {
            const task = row.original;
            const title = task.subject || task.name || '--';

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
            cellClassName:
              'px-4 py-3 paragraph-small text-[var(--color-text-sub-500)] max-w-[260px]',
          },
        },
        {
          id: 'assigned_to',
          columnLabel: 'Assignee',
          header: () => <div className='flex items-center gap-0.5'>Assignee</div>,
          cell: ({ row }) => {
            const task = row.original;
            const assignee = task.assignees;
            const taskId = task.name || task.id;

            // Normalize assignee value to array
            const assigneeValue = Array.isArray(assignee) ? assignee : assignee ? [assignee] : [];

            // If editable, show multi-select
            if (taskId) {
              return (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <AssigneeMultiSelect
                    value={assigneeValue}
                    onBlur={async (values) => {
                      if (!taskId) return;
                      try {
                        // Normalize assignees to array of strings
                        const normalizedAssignees = Array.isArray(values)
                          ? values
                              .map((v) =>
                                typeof v === 'string' ? v : v.value || v.email || v.name || v,
                              )
                              .filter(Boolean)
                          : values
                            ? [
                                typeof values === 'string'
                                  ? values
                                  : values.value || values.email || values.name || values,
                              ].filter(Boolean)
                            : [];

                        // Assignees add/remove should use assignment APIs (same as ticket management),
                        // not update_ref_doc_task.
                        await dispatch(
                          updateVendorTaskField({
                            taskName: taskId,
                            fieldName: 'assignees',
                            value: normalizedAssignees,
                            currentAssignees: task?.assignees ?? assigneeValue,
                          }),
                        ).unwrap();

                        // Update the task in the local list so the table reflects the new assignees
                        dispatch(
                          updateVendorTaskInList({
                            taskData: {
                              ...task,
                              assignees: normalizedAssignees,
                            },
                            taskType: context,
                          }),
                        );
                      } catch (error) {
                        const errorMessage = extractErrorMessage(error);
                        showErrorToast(
                          errorMessage || 'Failed to update assignees. Please try again.',
                        );
                      }
                    }}
                    placeholder='Select assignees'
                    maxVisibleAvatars={3}
                  />
                </div>
              );
            }

            // Show read-only avatars
            if (assigneeValue.length === 0) {
              return <span className='paragraph-small text-text-sub-400'>-</span>;
            }

            // For multiple assignees, use AvatarGroup
            return (
              <AvatarGroup.Root size={24}>
                {assigneeValue.slice(0, 3).map((assigneeItem, index) => {
                  const assigneeName = getAssigneeDisplayName(assigneeItem);
                  const assigneeInitial = getAssigneeFirstNameInitial(assigneeItem);
                  const assigneeImage =
                    typeof assigneeItem === 'object'
                      ? assigneeItem.user_image || assigneeItem.image || assigneeItem.avatar
                      : null;

                  return (
                    <Tooltip.Root size='xsmall' key={`${assigneeName}-${index}`}>
                      <Tooltip.Trigger asChild>
                        <Avatar.Root key={index} size={24} color='gray'>
                          {assigneeImage ? (
                            <Avatar.Image src={assigneeImage} alt={assigneeName} />
                          ) : (
                            <span className='text-label-sm'>{assigneeInitial}</span>
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
        },
        {
          id: 'due_date',
          enableSorting: true,
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap'>
                  Due Date
                </span>
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
            const task = row.original;
            const taskId = task.name || task.id;
            const dueDate = task.exp_end_date || task.due_date || '';

            // If editable, show datepicker
            if (taskId) {
              const dateValue = dueDate ? parseToDate(dueDate) : null;

              return (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Datepicker
                    value={dateValue}
                    onChange={async (date) => {
                      if (!taskId) return;
                      const dateStr = date
                        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                        : '';
                      try {
                        const payload = {
                          task_id: taskId,
                          exp_end_date: dateStr,
                        };

                        await apiClient.post(
                          '/method/devx.dev_x.api.document_task.update_ref_doc_task',
                          payload,
                        );

                        // Update the task in the local list so the table reflects the new date
                        dispatch(
                          updateVendorTaskInList({
                            taskData: {
                              ...task,
                              exp_end_date: dateStr,
                            },
                            taskType: context,
                          }),
                        );
                      } catch (error) {
                        const errorMessage = extractErrorMessage(error);
                        showErrorToast(
                          errorMessage || 'Failed to update due date. Please try again.',
                        );
                      }
                    }}
                    placeholder='Select date'
                    size='small'
                  />
                </div>
              );
            }

            // Show read-only date
            if (!dueDate) {
              return <span className='text-paragraph-sm text-text-sub-400'>--</span>;
            }
            return (
              <span className='text-paragraph-sm text-text-strong-950 overflow-hidden text-ellipsis whitespace-nowrap w-[250px]'>
                {formatDateWithOrdinal(dueDate)}
              </span>
            );
          },
        },
        {
          id: 'tags',
          header: () => <div className='flex items-center gap-0.5'>Tags</div>,
          cell: ({ row }) => {
            const task = row.original;
            const tags = task.tags || [];

            if (!tags || tags.length === 0) {
              return <span className='text-paragraph-sm text-text-sub-400'>--</span>;
            }

            return (
              <div className='flex gap-2'>
                {tags.slice(0, 3).map((tag, idx) => (
                  <Badge.Root
                    key={idx}
                    variant='stroke'
                    color='gray'
                    size='small'
                    className='bg-bg-white-0 ring-stroke-soft-200 text-text-sub-500 whitespace-nowrap normal-case'
                  >
                    {typeof tag === 'string' ? tag : tag.label || tag.name}
                  </Badge.Root>
                ))}
                {tags.length > 3 && (
                  <Badge.Root
                    variant='stroke'
                    color='gray'
                    size='small'
                    className='bg-bg-white-0 ring-stroke-soft-200 text-text-sub-500 whitespace-nowrap normal-case'
                  >
                    +{tags.length - 3}
                  </Badge.Root>
                )}
              </div>
            );
          },
        },
        {
          id: 'priority',
          enableSorting: true,
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
            const task = row.original;
            const taskId = task.name || task.id;
            const priority = task.priority || '';

            // If editable, show select dropdown
            if (taskId) {
              const safePriority = !priority || priority === '--' ? '' : priority;
              const color = getPriorityColor(safePriority);

              return (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <SearchableSelect
                    variant='borderless'
                    value={safePriority}
                    onValueChange={async (value) => {
                      if (!taskId || value === safePriority) return;
                      try {
                        const payload = {
                          task_id: taskId,
                          priority: value,
                        };

                        await apiClient.post(
                          '/method/devx.dev_x.api.document_task.update_ref_doc_task',
                          payload,
                        );

                        // Update the task in the local list so the table reflects the new priority
                        dispatch(
                          updateVendorTaskInList({
                            taskData: {
                              ...task,
                              priority: value,
                            },
                            taskType: context,
                          }),
                        );
                      } catch (error) {
                        const errorMessage = extractErrorMessage(error);
                        showErrorToast(
                          errorMessage || 'Failed to update priority. Please try again.',
                        );
                      }
                    }}
                    size='xsmall'
                    options={TASK_PRIORITY_OPTIONS}
                    placeholder='--'
                    triggerClassName='w-full'
                    showArrow={false}
                    renderTrigger={() =>
                      safePriority ? (
                        <Badge.Root variant='light' color={color} className='text-nowrap'>
                          {safePriority}
                        </Badge.Root>
                      ) : null
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
              return <span className='text-paragraph-sm text-text-sub-400'>--</span>;
            }
            return (
              <Badge.Root
                variant='light'
                color={getPriorityColor(priority)}
                className='text-nowrap'
              >
                {String(priority).toUpperCase()}
              </Badge.Root>
            );
          },
        },
        {
          id: 'status',
          header: ({ column }) => {
            const sortState = column.getIsSorted();
            return (
              <div className='flex items-center gap-1.5'>
                <span className='text-paragraph-sm text-text-sub-600'>Status</span>
                <button
                  type='button'
                  className='flex items-center justify-center cursor-pointer hover:text-text-strong-950 transition-colors'
                  onClick={() => column.toggleSorting(sortState === 'asc')}
                  aria-label={`Sort by Status ${sortState === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {Table.getSortingIcon(sortState)}
                </button>
                <StatusColumnPopover
                  columnId='status'
                  columnConfigHook={statusPopoverColumnConfig}
                  onOpenStatuses={() => setIsSetStatusesOpen(true)}
                />
              </div>
            );
          },
          cell: ({ row }) => {
            const task = row.original;
            if (!task.status) {
              return <span className='text-paragraph-sm text-text-sub-400'>--</span>;
            }

            const taskId = task.name || task.id;
            const currentStatus = task.status;

            return (
              <div
                onClick={(e) => {
                  // Prevent row click when changing status
                  e.stopPropagation();
                }}
              >
                <TaskStatusDropdown
                  value={currentStatus}
                  onValueChange={async (newStatus) => {
                    if (!taskId || newStatus === currentStatus) return;
                    try {
                      const payload = {
                        task_id: taskId,
                        status: newStatus,
                      };

                      await apiClient.post(
                        '/method/devx.dev_x.api.document_task.update_ref_doc_task',
                        payload,
                      );

                      // Update the task in the local list so the table reflects the new status
                      dispatch(
                        updateVendorTaskInList({
                          taskData: {
                            ...task,
                            status: newStatus,
                          },
                          taskType: context,
                        }),
                      );
                    } catch (error) {
                      const errorMessage = extractErrorMessage(error);
                      showErrorToast(errorMessage || 'Failed to update status. Please try again.');
                    }
                  }}
                  statusOptions={statusOptions}
                  size='small'
                  variant='inline'
                  className='w-full'
                />
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'description',
          header: () => <div className='flex items-center gap-0.5'>Description</div>,
          cell: ({ row }) => {
            const task = row.original;
            return (
              <p className='text-paragraph-sm text-text-strong-950 overflow-hidden text-ellipsis whitespace-nowrap w-[250px]'>
                {task.description || '--'}
              </p>
            );
          },
        },
        {
          id: 'created_by',
          header: () => <div className='flex items-center gap-0.5'>Created By</div>,
          cell: ({ row }) => {
            const task = row.original;
            return (
              <span className='text-paragraph-sm text-text-strong-950 overflow-hidden text-ellipsis whitespace-nowrap w-[250px]'>
                {task.created_by || '--'}
              </span>
            );
          },
        },
        {
          id: 'created_at',
          header: () => <div className='flex items-center gap-0.5'>Created At</div>,
          cell: ({ row }) => {
            const task = row.original;
            return (
              <span className='text-paragraph-sm text-text-strong-950 overflow-hidden text-ellipsis whitespace-nowrap w-[250px]'>
                {safeDisplayDateTime(task.created_at)}
              </span>
            );
          },
        },
        {
          id: 'last_updated',
          header: () => <div className='flex items-center gap-0.5'>Last Updated</div>,
          cell: ({ row }) => {
            const task = row.original;
            return (
              <span className='text-paragraph-sm text-text-strong-950 overflow-hidden text-ellipsis whitespace-nowrap w-[250px]'>
                {safeDisplayDateTime(task.last_updated)}
              </span>
            );
          },
        },
      ];

      // Add recurring column if enabled
      if (showRecurring) {
        const recurringColumn = {
          id: 'recurring',
          header: () => <div className='flex items-center gap-0.5'>Recurring</div>,
          cell: ({ row }) => {
            const task = row.original;
            const recurring = task?.custom_recurrence_period || null;

            return (
              <p className='text-paragraph-sm text-text-strong-950 overflow-hidden text-ellipsis whitespace-nowrap'>
                {recurring || '--'}
              </p>
            );
          },
        };

        // Insert recurring column after tags and before priority
        const tagsIndex = baseColumns.findIndex((col) => col.id === 'tags');
        baseColumns.splice(tagsIndex + 1, 0, recurringColumn);
      }

      return baseColumns;
    }, [showRecurring, context, dispatch, statusOptions, statusPopoverColumnConfig]);

    // Prepare default column configuration
    const defaultColumnConfig = useMemo(() => {
      const config = prepareColumnsForConfig(allColumnDefs);
      const defaultVisibleOrder = ['task', 'assigned_to', 'due_date', 'priority', 'status'];

      if (showRecurring) {
        defaultVisibleOrder.splice(3, 0, 'recurring');
      }

      const defaultHiddenOrder = ['tags'];

      const configMap = new Map(config.map((col) => [col.id, col]));

      // Hide all columns first
      config.forEach((col) => {
        if (col.enableHiding !== false) {
          col.visible = false;
        }
      });

      // Show visible columns
      defaultVisibleOrder.forEach((colId, index) => {
        const col = configMap.get(colId);
        if (col) {
          col.visible = true;
          col.order = index;
        }
      });

      // Set order for hidden columns
      let hiddenOrder = defaultVisibleOrder.length;
      defaultHiddenOrder.forEach((colId) => {
        const col = configMap.get(colId);
        if (col) {
          col.visible = false;
          col.order = hiddenOrder++;
        }
      });

      // Set order for any remaining columns
      config.forEach((col) => {
        if (col.order === undefined) {
          col.order = hiddenOrder++;
        }
      });

      return config.sort((a, b) => a.order - b.order);
    }, [allColumnDefs, showRecurring]);

    // Use column configuration hook

    // Stable callbacks so column pref APIs are not called on every parent re-render
    const handlePersistTaskColumnConfig = useCallback(
      async (data) => {
        await dispatch(updateVendorTaskColumnList({ react_table_id, columns: data })).unwrap();
      },
      [dispatch, react_table_id],
    );
    const handleFetchTaskColumnConfig = useCallback(async () => {
      return dispatch(fetchVendorTaskColumnList({ react_table_id }))
        .unwrap()
        .then((res) => res);
    }, [dispatch, react_table_id]);

    const {
      columns: columnConfig,
      visibleColumns: visibleColumnConfig,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    } = useColumnConfig(
      react_table_id || 'client-detail-tasks-table', // Use react_table_id for localStorage key
      defaultColumnConfig,
      handlePersistTaskColumnConfig,
      handleFetchTaskColumnConfig,
      {
        autoSave: true,
        debounce: true,
      },
    );

    syncColumnConfigHookToPopover({ toggleColumnVisibility });

    // Apply column configuration
    const columns = useMemo(
      () => applyColumnConfig(allColumnDefs, columnConfig),
      [allColumnDefs, columnConfig],
    );

    // Use React Table for sorting
    const table = useReactTable({
      data: tasks,
      columns,
      state: {
        sorting: localSorting,
      },
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      manualSorting: true, // Backend sorting enabled
      enableSortingRemoval: true,
    });

    // Expose column config hook via ref (for initial/fallback use in parent)
    const columnConfigHook = useMemo(
      () => ({
        columns: columnConfig,
        visibleColumns: visibleColumnConfig,
        reorderColumns,
        toggleColumnVisibility,
        showAllColumns,
        hideAllColumns,
        resetToDefault,
      }),
      [
        columnConfig,
        visibleColumnConfig,
        reorderColumns,
        toggleColumnVisibility,
        showAllColumns,
        hideAllColumns,
        resetToDefault,
      ],
    );

    useImperativeHandle(ref, () => ({
      columnConfig,
      columnConfigHook,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    }));

    // Notify parent when column config (data) changes so ColumnManagerDropdown receives fresh config.
    // Only depend on columnConfig: visibleColumnConfig is derived (new array every render) and would cause infinite loop.
    useEffect(() => {
      if (!onColumnConfigChange) return;
      onColumnConfigChange({
        columns: columnConfig,
        visibleColumns: visibleColumnConfig,
        reorderColumns,
        toggleColumnVisibility,
        showAllColumns,
        hideAllColumns,
        resetToDefault,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only columnConfig: notify when visibility/order changes
    }, [columnConfig, onColumnConfigChange]);

    // Empty state - use constants with context, fallback to props if provided
    const emptyState = useMemo(() => {
      const state = CLIENT_DETAIL_EMPTY_STATES[context] || CLIENT_DETAIL_EMPTY_STATES.default;
      return {
        title: emptyStateTitle || state.title,
        description: emptyStateDescription || state.description,
      };
    }, [context, emptyStateTitle, emptyStateDescription]);

    if (!isLoading && (!tasks || tasks.length === 0)) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{emptyState.title}</h3>
          <p className='max-w-md text-sm text-text-sub-600'>{emptyState.description}</p>
        </div>
      );
    }

    // Loading skeleton
    const renderSkeleton = () => (
      <Table.Body>
        {Array.from({ length: 6 }).map((_, index, array) => (
          <React.Fragment key={`skeleton-${index}`}>
            <Table.Row>
              {table.getHeaderGroups()[0]?.headers.map((header) => (
                <Table.Cell key={header.id}>
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
      <div className='w-full overflow-x-auto'>
        <SetStatusesModal
          open={isSetStatusesOpen}
          onOpenChange={setIsSetStatusesOpen}
          doctype='Task'
          field='status'
          context={'Vendor Onboarding'}
          fieldLabel={'Vendor Onboarding'}
          onSaved={() => setStatusOptionsKey((value) => value + 1)}
        />
        <Table.Root variant={variant}>
          <Table.Header>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Head
                    key={header.id}
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

          {isLoading && tasks.length === 0 ? (
            renderSkeleton()
          ) : (
            <Table.Body>
              {table.getRowModel().rows.map((row, i, rows) => (
                <React.Fragment key={row.id}>
                  <Table.Row
                    className={onRowClick ? 'cursor-pointer hover:bg-bg-weak-50' : ''}
                    onClick={() => {
                      if (onRowClick) {
                        onRowClick(row.original);
                      }
                    }}
                  >
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
            </Table.Body>
          )}
        </Table.Root>
      </div>
    );
  },
);

VendorDetailTasksTable.displayName = 'VendorDetailTasksTable';

export default VendorDetailTasksTable;
