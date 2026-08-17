import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useDispatch } from 'react-redux';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
import CircularProgress from '@/components/ui/circular-progress';
import { cn } from '@/utils/cn';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import { useColumnConfig } from '@/hooks/use-column-config';
import {
  prepareColumnsForConfig,
  applyColumnConfig,
  reorderPipelineLifecycleGroup,
} from '@/lib/column-utils';
import {
  getCrmContactTaskColumnPreferences,
  saveCrmContactTaskColumnPreferences,
  getCrmAccountTaskColumnPreferences,
  saveCrmAccountTaskColumnPreferences,
  getCrmCpAccountTaskColumnPreferences,
  getCrmCpContactTaskColumnPreferences,
  saveCrmCpAccountTaskColumnPreferences,
  saveCrmCpContactTaskColumnPreferences,
  getCrmLeadTaskColumnPreferences,
  saveCrmLeadTaskColumnPreferences,
} from '@/redux/settingSlice';
import * as Select from '@/components/ui/select';
import { CrmLifecycleStagePill } from './crm-lifecycle-stage-pill';
import {
  TASK_COLUMN_MIN_WIDTH,
  TASK_COLUMN_MAX_WIDTH,
  DEFAULT_TASK_COLUMN_WIDTHS,
  TASK_PRIORITY_OPTIONS,
  FALLBACK_TASK_STATUS_OPTIONS,
  getTaskStatusColor,
} from './constants';
import { useScopedTaskStatusOptions } from '@/hooks/use-status-options';
import { resolveStatusSemanticKey } from '@/components/ui/status-color-pill';
import SetStatusesModal, {
  StatusColumnPopover,
} from '@/components/space-management/status-configuration';

/** Must match react_table_id values in settingSlice (get/save CRM task column prefs). */
const CRM_TASK_REACT_TABLE_IDS = {
  contact: 'crm-contact-tasks',
  account: 'crm-account-tasks',
  lead: 'crm-lead-tasks',
  cp_account: 'crm-cp-account-tasks',
  cp_contact: 'crm-cp-contact-tasks',
};

/** Default `prop = []` creates a new [] every render when omitted → useColumnConfig reload loop. */
const EMPTY_TASK_TYPE_OPTIONS = [];
const EMPTY_ASSIGNEE_OPTIONS = [];

const FALLBACK_STATUS_OPTIONS = FALLBACK_TASK_STATUS_OPTIONS;

const getTaskProgress = (status, statusOptions = []) => {
  if (!status) return { percentage: 0, color: 'gray' };
  const match = statusOptions.find(
    (option) =>
      String(option?.value || '').toLowerCase() === String(status).toLowerCase() ||
      String(option?.label || '').toLowerCase() === String(status).toLowerCase(),
  );
  if (match) {
    const semantic = resolveStatusSemanticKey(match.color) || 'blue';
    return {
      percentage: Number(match.percentage) || 40,
      color: semantic,
    };
  }
  const normalized = String(status).toLowerCase();
  if (normalized === 'completed') return { percentage: 100, color: 'green' };
  if (normalized === 'ongoing') return { percentage: 60, color: 'blue' };
  return { percentage: 25, color: getTaskStatusColor(status, 'orange') };
};

const getStatusBadgeColor = (status, statusOptions = []) => {
  const match = statusOptions.find(
    (option) =>
      String(option?.value || '').toLowerCase() === String(status).toLowerCase() ||
      String(option?.label || '').toLowerCase() === String(status).toLowerCase(),
  );
  if (match?.color) {
    return resolveStatusSemanticKey(match.color) || 'gray';
  }
  return getTaskStatusColor(status, 'gray');
};

const normalizeAssignees = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const PILL_CLASS =
  'inline-flex w-max max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-[999px] border border-stroke-soft-200 bg-white px-2.5 py-1 text-paragraph-xs font-medium leading-normal text-text-sub-600 text-center';
const EMPTY_CELL_CLASS = 'text-paragraph-xs text-text-sub-500';

const SinglePill = ({ value }) => {
  if (value == null || value === '' || value === '--' || value === '-') {
    return <span className={EMPTY_CELL_CLASS}>—</span>;
  }
  return <span className={PILL_CLASS}>{String(value)}</span>;
};

const formatDropReasonDisplay = (raw) => {
  const toLabel = (v) => String(v ?? '').trim();
  if (Array.isArray(raw)) return raw.map(toLabel).filter(Boolean).join(', ');
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(toLabel).filter(Boolean).join(', ');
    } catch {
      /* plain string */
    }
    return toLabel(raw);
  }
  return '';
};

const PillList = ({ values }) => {
  const list = (Array.isArray(values) ? values : [values]).filter(
    (v) => v && v !== '--' && v !== '-',
  );
  if (list.length === 0) return <span className='paragraph-small p-3 text-text-sub-600'>--</span>;
  const visibleTags = list.slice(0, 2);
  const remainingTags = list.slice(2);
  return (
    <div className='flex flex-nowrap items-center gap-1.5 py-0.5 transition-opacity hover:opacity-80'>
      {visibleTags.map((item, index) => (
        <Badge.Root
          key={`${item}-${index}`}
          variant='stroke'
          className='shrink-0 border-stroke-soft-200 bg-white px-2 text-[10px] font-medium uppercase tracking-wider text-text-sub-500'
        >
          {item}
        </Badge.Root>
      ))}
      {remainingTags.length > 0 && (
        <Tooltip.Provider>
          <Tooltip.Root delayDuration={200}>
            <Tooltip.Trigger asChild>
              <Badge.Root
                variant='stroke'
                className='shrink-0 border-stroke-soft-200 bg-white px-2 text-[10px] font-medium uppercase tracking-wider text-text-sub-500 cursor-default'
              >
                +{remainingTags.length}
              </Badge.Root>
            </Tooltip.Trigger>
            <Tooltip.Content
              side='top'
              className='max-w-[250px] bg-white border border-stroke-soft-200 shadow-lg p-2 rounded-lg'
            >
              <div className='flex flex-wrap gap-1.5'>
                {remainingTags.map((tag, index) => (
                  <Badge.Root
                    key={index}
                    variant='stroke'
                    className='shrink-0 border-stroke-soft-200 bg-white px-2 text-[10px] font-medium uppercase tracking-wider text-text-sub-500'
                  >
                    {tag}
                  </Badge.Root>
                ))}
              </div>
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      )}
    </div>
  );
};

const CrmTasksTable = React.forwardRef(
  (
    {
      rows = [],
      isLoading = false,
      error = null,
      onRetry,
      onRowClick,
      variant = 'compact',
      onAssigneeChange,
      entityType = 'contact',
      onColumnConfigChange,
      columnWidths: columnWidthsProperty = null,
      onColumnResize = null,
      resizeEnabled = true,
      showLifecycleFields = false,
      /** Contact/Lead: show lifecycle columns; values only when set_trigger; never editable inline. */
      showLifecycleTriggerReadOnlyColumns = false,
      emptyMessage = 'No tasks',
      emptyDescription,
      // Scroll pagination
      enableScrollPagination = false,
      onLoadMore,
      hasMore = false,
      isLoadingMore = false,
      onStatusUpdate = null,
      onPriorityUpdate = null,
      onTypeUpdate = null,
      taskTypeOptions,
      assigneeOptions,
      /** When true, assignee cells wait for sales-team user list (matches drawer/create flow). */
      assigneeOptionsLoading = false,
      /** ACL Task Status Master context (CRM Tasks / CP Tasks). */
      statusContext = 'CRM Tasks',
      /** Show Set Statuses gear — for record detail Tasks tabs, not Task Master settings. */
      enableStatusConfiguration = false,
    },
    ref,
  ) => {
    const dispatch = useDispatch();
    const taskTypeOpts = taskTypeOptions ?? EMPTY_TASK_TYPE_OPTIONS;
    const assigneeOpts = assigneeOptions ?? EMPTY_ASSIGNEE_OPTIONS;
    const data = Array.isArray(rows) ? rows : [];
    const [sorting, setSorting] = useState([]);
    const [resizing, setResizing] = useState(null);
    const resizingRef = useRef(null);
    const liveWidthRef = useRef(null);
    const sentinelRef = useRef(null);
    const [isSetStatusesOpen, setIsSetStatusesOpen] = useState(false);
    const [statusOptionsKey, setStatusOptionsKey] = useState(0);
    const { options: statusOptions } = useScopedTaskStatusOptions({
      doctype: 'ACL Task',
      field: 'status',
      context: statusContext,
      fallback: FALLBACK_STATUS_OPTIONS,
      refreshKey: statusOptionsKey,
      enabled: true,
    });
    /** Latest row-action handlers without listing them on allColumnDefs (avoids useColumnConfig reload loops). */
    const taskHandlersRef = useRef({});
    taskHandlersRef.current = {
      onAssigneeChange,
      onStatusUpdate,
      onPriorityUpdate,
      onTypeUpdate,
      statusOptions,
    };

    const handleSortingChange = useCallback(
      (updaterOrValue) => {
        const next =
          typeof updaterOrValue === 'function' ? updaterOrValue(sorting) : updaterOrValue;
        setSorting(next);
      },
      [sorting],
    );

    const [internalColumnWidths, setInternalColumnWidths] = useState(DEFAULT_TASK_COLUMN_WIDTHS);
    const columnWidths = useMemo(() => {
      if (columnWidthsProperty && typeof columnWidthsProperty === 'object') {
        return { ...DEFAULT_TASK_COLUMN_WIDTHS, ...columnWidthsProperty };
      }
      return { ...DEFAULT_TASK_COLUMN_WIDTHS, ...internalColumnWidths };
    }, [columnWidthsProperty, internalColumnWidths]);
    const useExternalWidths = columnWidthsProperty != null;

    const getWidth = useCallback(
      (columnId) => {
        const w = resizing?.columnId === columnId ? resizing.liveWidth : columnWidths[columnId];
        return typeof w === 'number'
          ? Math.min(TASK_COLUMN_MAX_WIDTH, Math.max(TASK_COLUMN_MIN_WIDTH, w))
          : (DEFAULT_TASK_COLUMN_WIDTHS[columnId] ?? 150);
      },
      [columnWidths, resizing],
    );

    const effectiveOnColumnResize = resizeEnabled && onColumnResize ? onColumnResize : null;

    const react_table_id = CRM_TASK_REACT_TABLE_IDS[entityType] ?? `crm-${entityType}-tasks`;

    const handlePersistColumns = useCallback(
      async (cols) => {
        const thunk =
          entityType === 'contact'
            ? saveCrmContactTaskColumnPreferences
            : entityType === 'account'
              ? saveCrmAccountTaskColumnPreferences
              : entityType === 'cp_account'
                ? saveCrmCpAccountTaskColumnPreferences
                : entityType === 'cp_contact'
                  ? saveCrmCpContactTaskColumnPreferences
                  : saveCrmLeadTaskColumnPreferences;
        await dispatch(thunk({ columns: cols })).unwrap();
      },
      [dispatch, entityType],
    );

    const handleFetchColumns = useCallback(async () => {
      const thunk =
        entityType === 'contact'
          ? getCrmContactTaskColumnPreferences
          : entityType === 'account'
            ? getCrmAccountTaskColumnPreferences
            : entityType === 'cp_account'
              ? getCrmCpAccountTaskColumnPreferences
              : entityType === 'cp_contact'
                ? getCrmCpContactTaskColumnPreferences
                : getCrmLeadTaskColumnPreferences;
      const result = await dispatch(thunk()).unwrap();
      return result?.message ?? result?.data ?? result ?? [];
    }, [dispatch, entityType]);

    const handleResizeStart = useCallback(
      (columnId, startX) => {
        const startWidth = columnWidths[columnId] ?? DEFAULT_TASK_COLUMN_WIDTHS[columnId] ?? 150;
        const clamped = Math.min(
          TASK_COLUMN_MAX_WIDTH,
          Math.max(TASK_COLUMN_MIN_WIDTH, startWidth),
        );
        setResizing({ columnId, startX, startWidth: clamped, liveWidth: clamped });
        resizingRef.current = { columnId, startX, startWidth: clamped };
        liveWidthRef.current = clamped;
      },
      [columnWidths],
    );

    useEffect(() => {
      const onMouseMove = (e) => {
        if (!resizingRef.current) return;
        const delta = e.clientX - resizingRef.current.startX;
        let next = resizingRef.current.startWidth + delta;
        next = Math.max(TASK_COLUMN_MIN_WIDTH, Math.min(TASK_COLUMN_MAX_WIDTH, next));
        liveWidthRef.current = next;
        setResizing((prev) => (prev ? { ...prev, liveWidth: next } : null));
      };
      const onMouseUp = () => {
        if (resizingRef.current && liveWidthRef.current != null) {
          const finalWidth = Math.max(
            TASK_COLUMN_MIN_WIDTH,
            Math.min(TASK_COLUMN_MAX_WIDTH, liveWidthRef.current),
          );
          if (effectiveOnColumnResize) {
            effectiveOnColumnResize(resizingRef.current.columnId, finalWidth);
          } else {
            setInternalColumnWidths((prev) => ({
              ...prev,
              [resizingRef.current.columnId]: finalWidth,
            }));
          }
        }
        setResizing(null);
        resizingRef.current = null;
        liveWidthRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      return () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
    }, [resizing, effectiveOnColumnResize]);

    // Scroll pagination: load more when sentinel enters viewport
    useEffect(() => {
      if (!enableScrollPagination || !onLoadMore || !sentinelRef.current) return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasMore && !isLoadingMore && !isLoading) {
            onLoadMore();
          }
        },
        { threshold: 0 },
      );
      observer.observe(sentinelRef.current);
      return () => observer.disconnect();
    }, [enableScrollPagination, onLoadMore, hasMore, isLoadingMore, isLoading]);

    const isTriggeredRow = (row) =>
      Number(row?.original?.set_trigger) === 1 || row?.original?.set_trigger === true;

    const pipelineColumn = useMemo(
      () => ({
        id: 'pipeline',
        accessorKey: 'pipeline',
        header: ({ column }) => <Table.SortableHeader column={column} label='Pipeline' sortable />,
        enableSorting: true,
        cell: ({ row }) => {
          const raw =
            row.original.pipeline_display ?? row.original.pipeline_label ?? row.original.pipeline;
          if (showLifecycleTriggerReadOnlyColumns && !showLifecycleFields) {
            return isTriggeredRow(row) ? (
              <SinglePill value={raw} />
            ) : (
              <span className={EMPTY_CELL_CLASS}>—</span>
            );
          }
          return <SinglePill value={raw} />;
        },
      }),
      [showLifecycleTriggerReadOnlyColumns, showLifecycleFields],
    );

    const lifecycleColumns = useMemo(() => {
      const triggerTypeColumn = {
        id: 'trigger_type',
        accessorKey: 'trigger_type',
        header: ({ column }) => (
          <Table.SortableHeader column={column} label='Trigger Type' sortable />
        ),
        enableSorting: true,
        cell: ({ row }) => {
          if (showLifecycleTriggerReadOnlyColumns && !isTriggeredRow(row)) {
            return <span className={EMPTY_CELL_CLASS}>—</span>;
          }
          const raw = String(row.original.trigger_type || '').trim();
          const display = /drop/i.test(raw)
            ? 'Drop Reason'
            : /pipeline/i.test(raw) || !raw
              ? 'Pipeline'
              : raw;
          const triggered =
            Number(row.original.set_trigger) === 1 ||
            row.original.set_trigger === true ||
            row.original.set_trigger === '1';
          if (!triggered && showLifecycleFields) {
            return <span className={EMPTY_CELL_CLASS}>—</span>;
          }
          return <SinglePill value={display} />;
        },
      };
      if (showLifecycleFields) {
        return [
          triggerTypeColumn,
          pipelineColumn,
          {
            id: 'lifecycle_stage',
            accessorKey: 'lifecycle_stage',
            header: ({ column }) => (
              <Table.SortableHeader column={column} label='Lifecycle Stage' sortable />
            ),
            enableSorting: true,
            cell: ({ row }) => (
              <CrmLifecycleStagePill
                value={row.original.lifecycle_stage}
                stageColor={row.original.lifecycle_stage_color}
              />
            ),
          },
          {
            id: 'lifecycle_stage_status',
            accessorKey: 'lifecycle_stage_status',
            header: ({ column }) => (
              <Table.SortableHeader column={column} label='Lifecycle Stage Status' sortable />
            ),
            enableSorting: true,
            cell: ({ row }) => <SinglePill value={row.original.lifecycle_stage_status} />,
          },
          {
            id: 'drop_reason',
            accessorKey: 'drop_reason',
            header: ({ column }) => (
              <Table.SortableHeader column={column} label='Drop Reason' sortable />
            ),
            enableSorting: true,
            cell: ({ row }) => {
              const text = formatDropReasonDisplay(row.original.drop_reason);
              return (
                <span className={text ? 'paragraph-small text-text-main-900' : EMPTY_CELL_CLASS}>
                  {text || '—'}
                </span>
              );
            },
          },
        ];
      }
      if (showLifecycleTriggerReadOnlyColumns) {
        return [
          triggerTypeColumn,
          pipelineColumn,
          {
            id: 'lifecycle_stage',
            accessorKey: 'lifecycle_stage',
            header: ({ column }) => (
              <Table.SortableHeader column={column} label='Lifecycle Stage' sortable />
            ),
            enableSorting: true,
            cell: ({ row }) =>
              isTriggeredRow(row) ? (
                <CrmLifecycleStagePill
                  value={row.original.lifecycle_stage}
                  stageColor={row.original.lifecycle_stage_color}
                />
              ) : (
                <span className={EMPTY_CELL_CLASS}>—</span>
              ),
          },
          {
            id: 'lifecycle_stage_status',
            accessorKey: 'lifecycle_stage_status',
            header: ({ column }) => (
              <Table.SortableHeader column={column} label='Lifecycle Stage Status' sortable />
            ),
            enableSorting: true,
            cell: ({ row }) =>
              isTriggeredRow(row) ? (
                <SinglePill value={row.original.lifecycle_stage_status} />
              ) : (
                <span className={EMPTY_CELL_CLASS}>—</span>
              ),
          },
          {
            id: 'drop_reason',
            accessorKey: 'drop_reason',
            header: ({ column }) => (
              <Table.SortableHeader column={column} label='Drop Reason' sortable />
            ),
            enableSorting: true,
            cell: ({ row }) => {
              const text = formatDropReasonDisplay(row.original.drop_reason);
              return (
                <span className={text ? 'paragraph-small text-text-main-900' : EMPTY_CELL_CLASS}>
                  {text || '—'}
                </span>
              );
            },
          },
        ];
      }
      return [];
    }, [showLifecycleFields, showLifecycleTriggerReadOnlyColumns, pipelineColumn]);

    const allColumnDefs = useMemo(
      () => [
        {
          id: 'task',
          accessorKey: 'task',
          header: ({ column }) => <Table.SortableHeader column={column} label='Task' sortable />,
          enableSorting: true,
          cell: ({ row }) => {
            const { status, task } = row.original;
            const progress = getTaskProgress(status, taskHandlersRef.current.statusOptions);
            return (
              <div className='flex items-center gap-3'>
                <CircularProgress
                  percentage={progress.percentage}
                  color={progress.color}
                  size={18}
                />
                <Tooltip.Provider>
                  <Tooltip.Root delayDuration={200}>
                    <Tooltip.Trigger asChild>
                      <span className='paragraph-small font-medium text-text-strong-950 truncate max-w-[300px] block cursor-default'>
                        {task || '--'}
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content side='top' className='max-w-[300px]'>
                      {task}
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </div>
            );
          },
        },
        {
          id: 'assignee',
          accessorKey: 'assignee',
          header: () => <span className='text-paragraph-sm text-text-sub-600'>Assignee</span>,
          enableSorting: false,
          cell: ({ row }) => (
            <div onClick={(e) => e.stopPropagation()}>
              <AssigneeMultiSelect
                value={normalizeAssignees(row.original.assignee)}
                onBlur={(values) =>
                  taskHandlersRef.current.onAssigneeChange?.(
                    row.original.id,
                    values,
                    normalizeAssignees(row.original.assignee),
                  )
                }
                disabled={false}
                placeholder='Select assignees'
                maxVisibleAvatars={3}
                internalOnly={false}
                options={assigneeOpts}
                optionsLoading={assigneeOptionsLoading}
              />
            </div>
          ),
        },
        {
          id: 'type',
          accessorKey: 'type',
          header: ({ column }) => <Table.SortableHeader column={column} label='Type' sortable />,
          enableSorting: true,
          cell: ({ row }) => {
            const taskId = row.original.id;
            const v = row.original.type || '';
            const typeOpts = taskTypeOpts;
            const typeUpdate = taskHandlersRef.current.onTypeUpdate;
            if (typeUpdate && taskId && typeOpts.length > 0) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Select.Root
                    variant='borderless'
                    value={v}
                    onValueChange={(value) => typeUpdate(taskId, value)}
                    size='xsmall'
                  >
                    <Select.Trigger className='w-full min-w-0' showArrow={false}>
                      <Select.Value>
                        {v ? (
                          <span className={PILL_CLASS}>{v}</span>
                        ) : (
                          <span className={EMPTY_CELL_CLASS}>—</span>
                        )}
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content className='min-w-[140px]'>
                      {typeOpts.map((opt) => (
                        <Select.Item
                          key={opt.name ?? opt.value}
                          value={opt.name ?? opt.type ?? opt.value ?? opt}
                        >
                          {opt.type ?? opt.label ?? opt.name ?? opt}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              );
            }
            return <SinglePill value={v} />;
          },
        },
        ...lifecycleColumns,
        {
          id: 'due_date',
          accessorKey: 'due_date',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Due Date' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {row.original.due_date || '--'}
            </span>
          ),
        },
        {
          id: 'tags',
          accessorKey: 'tags',
          header: ({ column }) => <Table.SortableHeader column={column} label='Tags' sortable />,
          enableSorting: false,
          cell: ({ row }) => <PillList values={row.original.tags} />,
        },
        {
          id: 'priority',
          accessorKey: 'priority',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Priority' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => {
            const taskId = row.original.id;
            const priority = row.original.priority;
            const priorityUpdate = taskHandlersRef.current.onPriorityUpdate;
            if (priorityUpdate && taskId && TASK_PRIORITY_OPTIONS.length > 0) {
              const v = priority || '';
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Select.Root
                    variant='borderless'
                    value={v}
                    onValueChange={(value) => priorityUpdate(taskId, value)}
                    size='xsmall'
                  >
                    <Select.Trigger className='w-full min-w-0' showArrow={false}>
                      <Select.Value>
                        {v ? (
                          <Badge.Root
                            variant='light'
                            color={
                              { low: 'green', medium: 'orange', high: 'red', urgent: 'red' }[
                                String(v).toLowerCase()
                              ] || 'gray'
                            }
                            size='small'
                            className='rounded-full px-2 py-0.5 text-paragraph-xs font-medium'
                          >
                            {v}
                          </Badge.Root>
                        ) : (
                          <span className={EMPTY_CELL_CLASS}>—</span>
                        )}
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content className='min-w-[120px]'>
                      {TASK_PRIORITY_OPTIONS.map((opt) => (
                        <Select.Item key={opt} value={opt}>
                          {opt}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              );
            }
            if (!priority || priority === '--' || priority === '-') {
              return <span className={EMPTY_CELL_CLASS}>—</span>;
            }
            const normalized = String(priority).toLowerCase();
            const color =
              { low: 'green', medium: 'orange', high: 'red', urgent: 'red' }[normalized] || 'gray';
            return (
              <Badge.Root
                variant='light'
                color={color}
                size='small'
                className='rounded-full px-2 py-0.5 text-paragraph-xs font-medium'
              >
                {String(priority)}
              </Badge.Root>
            );
          },
        },
        {
          id: 'status',
          accessorKey: 'status',
          header: ({ column }) => (
            <div className='flex items-center gap-1.5 min-w-0'>
              <Table.SortableHeader column={column} label='Status' sortable />
              {enableStatusConfiguration ? (
                <StatusColumnPopover
                  columnId='status'
                  onOpenStatuses={() => setIsSetStatusesOpen(true)}
                />
              ) : null}
            </div>
          ),
          enableSorting: true,
          cell: ({ row }) => {
            const taskId = row.original.id;
            const status = row.original.status;
            const statusUpdate = taskHandlersRef.current.onStatusUpdate;
            const options = taskHandlersRef.current.statusOptions || FALLBACK_STATUS_OPTIONS;
            if (statusUpdate && taskId && options.length > 0) {
              const v = status || '';
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Select.Root
                    variant='borderless'
                    value={v}
                    onValueChange={(value) => statusUpdate(taskId, value)}
                    size='xsmall'
                  >
                    <Select.Trigger className='w-full min-w-0' showArrow={false}>
                      <Select.Value>
                        {v ? (
                          <Badge.Root
                            variant='light'
                            color={getStatusBadgeColor(v, options)}
                            size='small'
                            className='rounded-full px-2 py-0.5 text-paragraph-xs font-medium'
                          >
                            {v}
                          </Badge.Root>
                        ) : (
                          <span className={EMPTY_CELL_CLASS}>—</span>
                        )}
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content className='min-w-[140px]'>
                      {options.map((opt) => {
                        const value = opt?.value ?? opt?.label ?? opt;
                        const label = opt?.label ?? opt?.value ?? opt;
                        return (
                          <Select.Item key={value} value={value}>
                            {label}
                          </Select.Item>
                        );
                      })}
                    </Select.Content>
                  </Select.Root>
                </div>
              );
            }
            if (!status || status === '--' || status === '-') {
              return <span className={EMPTY_CELL_CLASS}>—</span>;
            }
            return (
              <Badge.Root
                variant='light'
                color={getStatusBadgeColor(status, options)}
                size='small'
                className='rounded-full px-2 py-0.5 text-paragraph-xs font-medium'
              >
                {String(status)}
              </Badge.Root>
            );
          },
        },
        {
          id: 'description',
          accessorKey: 'description',
          header: () => <span className='text-paragraph-sm text-text-sub-600'>Description</span>,
          enableSorting: false,
          cell: ({ row }) => {
            const description = row.original.description || '--';
            return (
              <Tooltip.Provider>
                <Tooltip.Root delayDuration={200}>
                  <Tooltip.Trigger asChild>
                    <span className='paragraph-small text-text-sub-600 block truncate cursor-default'>
                      {description}
                    </span>
                  </Tooltip.Trigger>
                  {description !== '--' && (
                    <Tooltip.Content side='top' className='max-w-[400px]'>
                      {description}
                    </Tooltip.Content>
                  )}
                </Tooltip.Root>
              </Tooltip.Provider>
            );
          },
        },
        {
          id: 'attachments',
          accessorKey: 'attachments',
          header: () => <span className='text-paragraph-sm text-text-sub-600'>Attachments</span>,
          enableSorting: false,
          cell: ({ row }) => {
            const raw = row.original.attachments;
            const count = Array.isArray(raw) ? raw.length : Number(raw || 0);
            if (!count)
              return (
                <div className='pl-8'>
                  <span className='paragraph-small text-text-sub-400'>--</span>
                </div>
              );
            return (
              <div className='pl-4'>
                <Badge.Root
                  variant='stroke'
                  className='shrink-0 border-stroke-soft-200 bg-white px-2 text-[10px] font-medium uppercase tracking-wider text-text-sub-500'
                >
                  {count} File{count > 1 ? 's' : ''}
                </Badge.Root>
              </div>
            );
          },
        },
        {
          id: 'created_by',
          accessorKey: 'created_by',
          header: () => <span className='text-paragraph-sm text-text-sub-600'>Created By</span>,
          enableSorting: true,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {row.original.created_by || '--'}
            </span>
          ),
        },
        {
          id: 'created_at',
          accessorKey: 'created_at',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Created At' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {row.original.created_at || '--'}
            </span>
          ),
        },
        {
          id: 'last_updated',
          accessorKey: 'last_updated',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Last Updated' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {row.original.last_updated || '--'}
            </span>
          ),
        },
      ],
      [
        lifecycleColumns,
        taskTypeOpts,
        assigneeOpts,
        assigneeOptionsLoading,
        enableStatusConfiguration,
      ],
    );

    const defaultColumnConfig = useMemo(
      () => prepareColumnsForConfig(allColumnDefs),
      [allColumnDefs],
    );

    const {
      columns: columnConfig,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    } = useColumnConfig(
      react_table_id,
      defaultColumnConfig,
      handlePersistColumns,
      handleFetchColumns,
      {
        autoSave: true,
        debounce: 300,
      },
    );

    const columns = useMemo(
      () => reorderPipelineLifecycleGroup(applyColumnConfig(allColumnDefs, columnConfig)),
      [allColumnDefs, columnConfig],
    );

    const columnConfigHook = useMemo(
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

    const lastReportedConfigRef = useRef(null);
    useEffect(() => {
      if (!onColumnConfigChange) return;
      const cols = columnConfigHook?.columns;
      const key = cols?.map((c) => `${c.id}:${c.visible}`).join(',') ?? '';
      if (lastReportedConfigRef.current === key) return;
      lastReportedConfigRef.current = key;
      onColumnConfigChange(columnConfigHook);
    }, [columnConfigHook, onColumnConfigChange]);

    const tableMinWidth = useMemo(
      () => columns.reduce((sum, col) => sum + getWidth(col.id), 0),
      [columns, getWidth],
    );

    const table = useReactTable({
      data,
      columns,
      state: { sorting },
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      manualSorting: false,
      enableSortingRemoval: true,
    });

    React.useImperativeHandle(ref, () => ({ table, columnConfigHook }));

    if (error) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>Unable to Load Tasks</h3>
          <p className='mb-4 text-sm text-error-darker/80'>
            Something went wrong loading the task list.
          </p>
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

    if (!isLoading && data.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{emptyMessage}</h3>
          <p className='max-w-md text-sm text-text-sub-600'>
            {emptyDescription || 'Create a task to start tracking work.'}
          </p>
        </div>
      );
    }

    const renderSkeleton = () => (
      <Table.Body>
        {Array.from({ length: 4 }).map((_, index, array) => (
          <React.Fragment key={`tasks-skeleton-${index}`}>
            <Table.Row>
              {table.getAllLeafColumns().map((column) => (
                <Table.Cell
                  key={column.id}
                  style={{ width: getWidth(column.id), minWidth: TASK_COLUMN_MIN_WIDTH }}
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
      <>
        {enableStatusConfiguration ? (
          <SetStatusesModal
            open={isSetStatusesOpen}
            onOpenChange={setIsSetStatusesOpen}
            doctype='ACL Task'
            field='status'
            context={statusContext}
            fieldLabel={statusContext}
            onSaved={() => setStatusOptionsKey((value) => value + 1)}
          />
        ) : null}
        <div className='w-full'>
          <div className='w-full overflow-x-auto'>
            <Table.Root
              variant={variant}
              style={{ tableLayout: 'fixed', width: tableMinWidth, minWidth: tableMinWidth }}
            >
              <Table.Header>
                {table.getHeaderGroups().map((headerGroup) => (
                  <Table.Row key={headerGroup.id} className='bg-bg-weak-50'>
                    {headerGroup.headers.map((header) => {
                      const colId = header.column.id;
                      const width = getWidth(colId);
                      return (
                        <Table.Head
                          key={header.id}
                          className='px-4 relative font-medium label-small text-text-sub-600'
                          style={{
                            width,
                            minWidth: TASK_COLUMN_MIN_WIDTH,
                            maxWidth: TASK_COLUMN_MAX_WIDTH,
                            paddingRight: '2.5rem',
                          }}
                        >
                          <div className='flex items-center gap-0.5 min-w-0'>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </div>
                          {resizeEnabled && (effectiveOnColumnResize || !useExternalWidths) && (
                            <div
                              role='separator'
                              aria-orientation='vertical'
                              className='absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-stroke-sub-300 shrink-0'
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleResizeStart(colId, e.clientX);
                              }}
                            />
                          )}
                        </Table.Head>
                      );
                    })}
                  </Table.Row>
                ))}
              </Table.Header>
              {isLoading && data.length === 0 ? (
                renderSkeleton()
              ) : (
                <Table.Body>
                  {table.getRowModel().rows.map((row, rowIndex, allRowsArray) => (
                    <React.Fragment key={row.id}>
                      <Table.Row
                        onClick={() => onRowClick?.(row.original)}
                        className={cn(onRowClick ? 'cursor-pointer hover:bg-bg-weak-50' : '')}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <Table.Cell
                            key={cell.id}
                            className='align-middle px-4'
                            style={{
                              width: getWidth(cell.column.id),
                              minWidth: TASK_COLUMN_MIN_WIDTH,
                              maxWidth: TASK_COLUMN_MAX_WIDTH,
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </Table.Cell>
                        ))}
                      </Table.Row>
                      {rowIndex < allRowsArray.length - 1 && <Table.RowDivider />}
                    </React.Fragment>
                  ))}
                  {enableScrollPagination && (
                    <>
                      <Table.Row ref={sentinelRef} data-scroll-sentinel>
                        <Table.Cell
                          colSpan={table.getHeaderGroups()[0]?.headers?.length ?? 1}
                          className='h-1 p-0'
                        />
                      </Table.Row>
                      {isLoadingMore && (
                        <Table.Row>
                          <Table.Cell
                            colSpan={table.getHeaderGroups()[0]?.headers?.length ?? 1}
                            className='py-8 text-center'
                          >
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
        </div>
      </>
    );
  },
);

CrmTasksTable.displayName = 'CrmTasksTable';
export default CrmTasksTable;
