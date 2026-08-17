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
import * as Select from '@/components/ui/select';
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
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { useScopedTaskStatusOptions } from '@/hooks/use-status-options';
import SetStatusesModal, {
  StatusColumnPopover,
} from '@/components/space-management/status-configuration';
import {
  fetchCenterTaskColumnList,
  updateCenterTaskColumnList,
  updateCenterTaskInList,
  updateCenterTaskField,
} from '@/redux/centerSlice';
import apiClient from '@/api/axios';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';

const CenterDetailTasksTable = React.forwardRef(
  (
    {
      tasks = [],
      isLoading = false,
      isLoadingMore = false,
      variant = 'compact',
      showRecurring = false,
      context = 'default',
      emptyStateTitle,
      emptyStateDescription,
      onRowClick,
      react_table_id,
      sorting = [],
      onSortingChange,
      onColumnConfigChange,
      onLoadMore,
      hasMore = false,
      enableScrollPagination = false,
      scrollContainer = null,
    },
    ref,
  ) => {
    const [localSorting, setLocalSorting] = useState(sorting);
    const [isSetStatusesOpen, setIsSetStatusesOpen] = useState(false);
    const [statusOptionsKey, setStatusOptionsKey] = useState(0);
    const dispatch = useDispatch();
    const { statusPopoverColumnConfig, syncColumnConfigHookToPopover } =
      useColumnConfigPopoverRef();
    const { options: statusOptions } = useScopedTaskStatusOptions({
      context: 'Center Preboarding',
      fallback: TASK_STATUS_OPTIONS,
      refreshKey: statusOptionsKey,
    });

    useEffect(() => {
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

    const { sentinelRef } = useScrollPagination({
      onLoadMore: onLoadMore || (() => {}),
      hasMore: Boolean(hasMore && enableScrollPagination),
      isLoading: Boolean(isLoadingMore || isLoading),
      threshold: 200,
      scrollContainer,
      enabled: Boolean(enableScrollPagination && onLoadMore),
    });

    const allColumnDefs = useMemo(() => {
      const baseColumns = [
        {
          id: 'task',
          columnLabel: 'Task',
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
            const assigneeValue = Array.isArray(assignee) ? assignee : assignee ? [assignee] : [];

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

                        await dispatch(
                          updateCenterTaskField({
                            taskName: taskId,
                            fieldName: 'assignees',
                            value: normalizedAssignees,
                            currentAssignees: task?.assignees ?? assigneeValue,
                          }),
                        ).unwrap();

                        dispatch(
                          updateCenterTaskInList({
                            taskData: { ...task, assignees: normalizedAssignees },
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

            if (assigneeValue.length === 0) {
              return <span className='paragraph-small text-text-sub-400'>-</span>;
            }

            return (
              <AvatarGroup.Root size={24}>
                {assigneeValue.slice(0, 3).map((assigneeItem, index) => {
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
                              {assigneeName.charAt(0).toUpperCase()}
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
                        await apiClient.post(
                          '/method/devx.dev_x.api.document_task.update_ref_doc_task',
                          {
                            task_id: taskId,
                            exp_end_date: dateStr,
                          },
                        );
                        dispatch(
                          updateCenterTaskInList({
                            taskData: { ...task, exp_end_date: dateStr },
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
            if (!dueDate) return <span className='text-paragraph-sm text-text-sub-400'>--</span>;
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
            if (taskId) {
              const safePriority = !priority || priority === '--' ? '' : priority;
              const color = getPriorityColor(safePriority);
              return (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Select.Root
                    variant='borderless'
                    value={safePriority}
                    onValueChange={async (value) => {
                      if (!taskId || value === safePriority) return;
                      try {
                        await apiClient.post(
                          '/method/devx.dev_x.api.document_task.update_ref_doc_task',
                          {
                            task_id: taskId,
                            priority: value,
                          },
                        );
                        dispatch(
                          updateCenterTaskInList({
                            taskData: { ...task, priority: value },
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
                  >
                    <Select.Trigger className='w-full' showArrow={false}>
                      <Select.Value>
                        {safePriority ? (
                          <Badge.Root variant='light' color={color} className='text-nowrap'>
                            {safePriority}
                          </Badge.Root>
                        ) : (
                          <span className='text-paragraph-sm text-text-sub-400'>--</span>
                        )}
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content className='min-w-[150px]'>
                      {TASK_PRIORITY_OPTIONS.map((option) => (
                        <Select.Item key={option.value} value={option.value}>
                          <Badge.Root
                            variant='light'
                            color={getPriorityColor(option.value)}
                            className='text-nowrap'
                          >
                            {option.label}
                          </Badge.Root>
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              );
            }
            if (!priority) return <span className='text-paragraph-sm text-text-sub-400'>--</span>;
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
          enableSorting: true,
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
            if (!task.status)
              return <span className='text-paragraph-sm text-text-sub-400'>--</span>;
            const taskId = task.name || task.id;
            const currentStatus = task.status;
            return (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <TaskStatusDropdown
                  value={currentStatus}
                  onValueChange={async (newStatus) => {
                    if (!taskId || newStatus === currentStatus) return;
                    try {
                      await apiClient.post(
                        '/method/devx.dev_x.api.document_task.update_ref_doc_task',
                        {
                          task_id: taskId,
                          status: newStatus,
                        },
                      );
                      dispatch(
                        updateCenterTaskInList({
                          taskData: { ...task, status: newStatus },
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
        const tagsIndex = baseColumns.findIndex((col) => col.id === 'tags');
        baseColumns.splice(tagsIndex + 1, 0, recurringColumn);
      }

      return baseColumns;
    }, [showRecurring, context, dispatch, statusOptions, statusPopoverColumnConfig]);

    const defaultColumnConfig = useMemo(() => {
      const config = prepareColumnsForConfig(allColumnDefs);
      const defaultVisibleOrder = ['task', 'assigned_to', 'due_date', 'priority', 'status'];
      const defaultHiddenOrder = ['tags'];
      const configMap = new Map(config.map((col) => [col.id, col]));

      config.forEach((col) => {
        if (col.enableHiding !== false) col.visible = false;
      });

      defaultVisibleOrder.forEach((colId, index) => {
        const col = configMap.get(colId);
        if (col) {
          col.visible = true;
          col.order = index;
        }
      });

      let hiddenOrder = defaultVisibleOrder.length;
      defaultHiddenOrder.forEach((colId) => {
        const col = configMap.get(colId);
        if (col) {
          col.visible = false;
          col.order = hiddenOrder++;
        }
      });

      config.forEach((col) => {
        if (col.order === undefined) col.order = hiddenOrder++;
      });

      return config.sort((a, b) => a.order - b.order);
    }, [allColumnDefs]);

    const handlePersistTaskColumnConfig = useCallback(
      async (data) => {
        await dispatch(updateCenterTaskColumnList({ react_table_id, columns: data })).unwrap();
      },
      [dispatch, react_table_id],
    );

    const handleFetchTaskColumnConfig = useCallback(async () => {
      return dispatch(fetchCenterTaskColumnList({ react_table_id }))
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
      react_table_id || 'center-detail-tasks-table',
      defaultColumnConfig,
      handlePersistTaskColumnConfig,
      handleFetchTaskColumnConfig,
      { autoSave: true, debounce: true },
    );

    syncColumnConfigHookToPopover({ toggleColumnVisibility });

    const columns = useMemo(
      () => applyColumnConfig(allColumnDefs, columnConfig),
      [allColumnDefs, columnConfig],
    );

    const table = useReactTable({
      data: tasks,
      columns,
      state: { sorting: localSorting },
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      manualSorting: true,
      enableSortingRemoval: true,
    });

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

    useEffect(() => {
      if (!onColumnConfigChange) return;
      onColumnConfigChange(columnConfigHook);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [columnConfig]);

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
          context='Center Preboarding'
          fieldLabel='Center Preboarding'
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
                    onClick={() => onRowClick?.(row.original)}
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

              {enableScrollPagination && (
                <>
                  <Table.Row ref={sentinelRef} data-scroll-sentinel>
                    <Table.Cell colSpan={columns.length} className='h-1 p-0' />
                  </Table.Row>
                  {isLoadingMore && (
                    <Table.Row>
                      <Table.Cell colSpan={columns.length} className='py-8 text-center'>
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
            </Table.Body>
          )}
        </Table.Root>
      </div>
    );
  },
);

CenterDetailTasksTable.displayName = 'CenterDetailTasksTable';

export default CenterDetailTasksTable;
