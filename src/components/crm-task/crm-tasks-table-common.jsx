import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
import { SearchableSelect } from '@/components/ui/searchable-select';
import TaskStatusDropdown from '@/components/client-onboarding/task-status-dropdown';
import { getStatusVariant, parseTags } from '@/utils/task-utils';
import { applyColumnConfig, reorderPipelineLifecycleGroup } from '@/lib/column-utils';
import {
  getPriorityColor,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from '@/components/client-onboarding/constants';
import { DEFAULT_CRM_COLUMN_WIDTHS } from '@/components/crm-task/crm-task-columns';
import { useScopedTaskStatusOptions } from '@/hooks/use-status-options';
import SetStatusesModal, {
  StatusColumnPopover,
} from '@/components/space-management/status-configuration';

/** Minimum width so column name + sort icon stay visible (no ellipsis when resizing). */
const COLUMN_MIN_WIDTH = 120;
const COLUMN_MAX_WIDTH = 500;

const DROP_REASON_PILL_CLASS =
  'inline-flex items-center rounded-full px-2 py-0.5 text-paragraph-xs font-medium text-text-sub-600 border border-stroke-soft-200';

function parseDropReasons(raw) {
  if (Array.isArray(raw)) return raw.map((v) => String(v || '').trim()).filter(Boolean);
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v || '').trim()).filter(Boolean);
      }
    } catch {
      /* plain string */
    }
    return [raw.trim()];
  }
  return [];
}

const CrmTasksTableCommon = ({
  tasks = [],
  tableVariant = 'compact',
  sorting = null,
  onTaskClick,
  onSortChange,
  searchTerm = '',
  columns = [],
  visibleColumnConfig = null,
  columnLabels = {},
  columnWidths: columnWidthsProperty = null,
  onColumnResize = null,
  onPriorityUpdate = null,
  onStatusUpdate = null,
  onTypeUpdate = null,
  onLifecycleStageUpdate = null,
  onLifecycleStageStatusUpdate = null,
  pipelineOptions = [],
  taskTypeOptions = [],
  lifecycleStages = [],
  showLifecycleFields = false,
  statusContext = 'CRM Tasks',
  /** Set Statuses gear — only for record detail tables, not Task Master settings. */
  enableStatusConfiguration = false,
}) => {
  const [localSorting, setLocalSorting] = useState([]);
  const [resizing, setResizing] = useState(null);
  const resizingRef = useRef(null);
  const liveWidthRef = useRef(null);
  const [isSetStatusesOpen, setIsSetStatusesOpen] = useState(false);
  const [statusOptionsKey, setStatusOptionsKey] = useState(0);
  const { options: statusOptions } = useScopedTaskStatusOptions({
    doctype: 'ACL Task',
    field: 'status',
    context: statusContext,
    fallback: TASK_STATUS_OPTIONS,
    refreshKey: statusOptionsKey,
  });

  const columnWidths = useMemo(() => {
    if (columnWidthsProperty && typeof columnWidthsProperty === 'object') {
      return { ...DEFAULT_CRM_COLUMN_WIDTHS, ...columnWidthsProperty };
    }
    return DEFAULT_CRM_COLUMN_WIDTHS;
  }, [columnWidthsProperty]);

  const getWidth = useCallback(
    (columnId) => {
      const w = resizing?.columnId === columnId ? resizing.liveWidth : columnWidths[columnId];
      return typeof w === 'number'
        ? Math.min(COLUMN_MAX_WIDTH, Math.max(COLUMN_MIN_WIDTH, w))
        : (DEFAULT_CRM_COLUMN_WIDTHS[columnId] ?? 120);
    },
    [columnWidths, resizing],
  );

  const handleResizeStart = useCallback(
    (columnId, startX) => {
      const startWidth = columnWidths[columnId] ?? DEFAULT_CRM_COLUMN_WIDTHS[columnId] ?? 120;
      const clamped = Math.min(COLUMN_MAX_WIDTH, Math.max(COLUMN_MIN_WIDTH, startWidth));
      setResizing({ columnId, startX, startWidth: clamped, liveWidth: clamped });
      resizingRef.current = { columnId, startX, startWidth: clamped };
      liveWidthRef.current = clamped;
    },
    [columnWidths],
  );

  useEffect(() => {
    if (!resizing) return;

    const onMouseMove = (e) => {
      if (!resizingRef.current) return;
      const delta = e.clientX - resizingRef.current.startX;
      let next = resizingRef.current.startWidth + delta;
      next = Math.max(COLUMN_MIN_WIDTH, Math.min(COLUMN_MAX_WIDTH, next));
      liveWidthRef.current = next;
      setResizing((previous) => (previous ? { ...previous, liveWidth: next } : null));
    };

    const onMouseUp = () => {
      if (resizingRef.current && onColumnResize && liveWidthRef.current != null) {
        const finalWidth = Math.max(
          COLUMN_MIN_WIDTH,
          Math.min(COLUMN_MAX_WIDTH, liveWidthRef.current),
        );
        onColumnResize(resizingRef.current.columnId, finalWidth);
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
  }, [resizing, onColumnResize]);

  useEffect(() => {
    if (sorting?.field) {
      setLocalSorting([{ id: sorting.field, desc: sorting.direction === 'desc' }]);
    } else {
      setLocalSorting([]);
    }
  }, [sorting]);

  const handleSortingChange = useCallback(
    (updaterOrValue) => {
      const newSorting =
        typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;
      setLocalSorting(newSorting);
      if (newSorting?.length > 0 && onSortChange) {
        onSortChange(newSorting[0].id);
      } else if (onSortChange && sorting?.field) {
        onSortChange(sorting.field);
      }
    },
    [localSorting, onSortChange, sorting],
  );

  const allColumnDefs = useMemo(() => {
    const label = (key, fallback) => columnLabels[key] ?? fallback;
    return [
      {
        id: 'task',
        enableSorting: true,
        header: () => {
          const isActive = sorting?.field === 'task';
          const currentDirection = isActive ? sorting.direction : null;
          return (
            <div className='flex items-center gap-0.5 min-w-0'>
              <span className='min-w-0 truncate'>{label('task', 'Task')}</span>
              {onSortChange && (
                <button
                  type='button'
                  className='cursor-pointer shrink-0'
                  onClick={() => onSortChange('task')}
                  aria-label='Sort by task'
                >
                  {Table.getSortingIcon(currentDirection)}
                </button>
              )}
            </div>
          );
        },
        cell: ({ row }) => {
          const task = row.original;
          const title = task.task_name || task.subject || task.name || '—';
          return (
            <Tooltip.Root size='xsmall'>
              <Tooltip.Trigger asChild>
                <span className='font-medium text-text-main-900 block max-w-[320px] whitespace-nowrap overflow-hidden text-ellipsis'>
                  {title}
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content side='bottom'>{title}</Tooltip.Content>
            </Tooltip.Root>
          );
        },
        meta: { cellClassName: 'px-4 paragraph-small text-text-sub-500 max-w-[260px]' },
      },
      {
        id: 'department',
        enableSorting: false,
        header: () => <span>{label('department', 'Department')}</span>,
        cell: ({ row }) => {
          const dept = row.original.department;
          if (!Array.isArray(dept) || dept.length === 0) {
            return <span className='paragraph-small text-text-sub-500'>—</span>;
          }
          const text = dept
            .map((d) => (typeof d === 'string' ? d : d?.assignee || d?.user || ''))
            .filter(Boolean)
            .join(', ');
          return <span className='paragraph-small text-text-sub-500'>{text || '—'}</span>;
        },
        meta: { cellClassName: 'px-4 paragraph-small text-text-sub-500' },
      },
      {
        id: 'type',
        enableSorting: true,
        header: () => {
          const isActive = sorting?.field === 'type';
          const currentDirection = isActive ? sorting.direction : null;
          return (
            <div className='flex items-center gap-0.5 min-w-0'>
              <span className='min-w-0 truncate'>{label('type', 'Type')}</span>
              {onSortChange && (
                <button
                  type='button'
                  className='cursor-pointer shrink-0'
                  onClick={() => onSortChange('type')}
                  aria-label='Sort by type'
                >
                  {Table.getSortingIcon(currentDirection)}
                </button>
              )}
            </div>
          );
        },
        cell: ({ row }) => {
          const taskId = row.original.name;
          const v = row.original.type || '';
          if (onTypeUpdate && taskId && taskTypeOptions.length > 0) {
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <SearchableSelect
                  variant='borderless'
                  value={v}
                  onValueChange={(value) => onTypeUpdate(taskId, value)}
                  size='xsmall'
                  options={taskTypeOptions.map((opt) => ({
                    value: opt.name ?? opt.type ?? opt.value,
                    label: opt.type ?? opt.label ?? opt.name,
                  }))}
                  placeholder='—'
                  showArrow={false}
                  renderTrigger={({ selectedOption }) =>
                    v ? (
                      <span className='inline-flex items-center rounded-full px-2 py-0.5 text-paragraph-xs font-medium text-text-sub-600 border border-stroke-soft-200'>
                        {v}
                      </span>
                    ) : (
                      <span className='text-paragraph-xs text-text-sub-500'>—</span>
                    )
                  }
                />
              </div>
            );
          }
          if (!v) return <span className='text-paragraph-xs text-text-sub-500'>—</span>;
          return (
            <span className='inline-flex items-center rounded-full px-2 py-0.5 text-paragraph-xs font-medium text-text-sub-600 border border-stroke-soft-200'>
              {v}
            </span>
          );
        },
        meta: { cellClassName: 'px-4' },
      },
      {
        id: 'tags',
        header: () => <div className='flex items-center gap-0.5'>{label('tags', 'Tags')}</div>,
        cell: ({ row }) => {
          const tagsValue = parseTags(row.original.tags);
          if (tagsValue.length === 0)
            return <span className='text-paragraph-xs text-text-sub-500'>—</span>;
          return (
            <div className='flex flex-wrap gap-1'>
              {tagsValue.slice(0, 3).map((tag) => (
                <Badge.Root
                  key={typeof tag === 'string' ? tag : (tag?.label ?? tag?.name ?? String(tag))}
                  variant='stroke'
                  color='gray'
                  size='small'
                  className='bg-bg-white-0 ring-stroke-soft-200 text-text-sub-500 whitespace-nowrap normal-case'
                >
                  {typeof tag === 'string' ? tag : (tag?.label ?? tag?.name ?? tag)}
                </Badge.Root>
              ))}
              {tagsValue.length > 3 && (
                <Badge.Root
                  variant='stroke'
                  color='gray'
                  size='small'
                  className='bg-bg-white-0 ring-stroke-soft-200 text-text-sub-500'
                >
                  +{tagsValue.length - 3}
                </Badge.Root>
              )}
            </div>
          );
        },
        meta: { cellClassName: 'px-4' },
      },
      {
        id: 'priority',
        enableSorting: true,
        header: () => {
          const isActive = sorting?.field === 'priority';
          const currentDirection = isActive ? sorting.direction : null;
          return (
            <div className='flex items-center gap-0.5 min-w-0'>
              <span className='min-w-0 truncate'>{label('priority', 'Priority')}</span>
              {onSortChange && (
                <button
                  type='button'
                  className='cursor-pointer shrink-0'
                  onClick={() => onSortChange('priority')}
                  aria-label='Sort by priority'
                >
                  {Table.getSortingIcon(currentDirection)}
                </button>
              )}
            </div>
          );
        },
        cell: ({ row }) => {
          const taskId = row.original.name;
          const priority = row.original.priority || '';
          if (onPriorityUpdate && taskId) {
            const safePriority = !priority || priority === '--' ? '' : priority;
            const color = getPriorityColor(safePriority);
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <SearchableSelect
                  variant='borderless'
                  value={safePriority}
                  onValueChange={(value) => onPriorityUpdate(taskId, value)}
                  size='xsmall'
                  options={TASK_PRIORITY_OPTIONS}
                  placeholder='—'
                  showArrow={false}
                  renderTrigger={({ selectedOption }) =>
                    safePriority ? (
                      <Badge.Root variant='light' color={color} className='text-nowrap'>
                        {String(safePriority).toUpperCase()}
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
          if (!priority) return <span className='text-paragraph-xs text-text-sub-500'>—</span>;
          return (
            <Badge.Root variant='light' color={getPriorityColor(priority)}>
              {String(priority).toUpperCase()}
            </Badge.Root>
          );
        },
        meta: { cellClassName: 'px-4' },
      },
      {
        id: 'status',
        enableSorting: true,
        header: () => {
          const isActive = sorting?.field === 'status';
          const currentDirection = isActive ? sorting.direction : null;
          return (
            <div className='flex items-center gap-0.5 min-w-0'>
              <span className='min-w-0 truncate'>{label('status', 'Status')}</span>
              {onSortChange && (
                <button
                  type='button'
                  className='cursor-pointer shrink-0'
                  onClick={() => onSortChange('status')}
                  aria-label='Sort by status'
                >
                  {Table.getSortingIcon(currentDirection)}
                </button>
              )}
              {enableStatusConfiguration ? (
                <StatusColumnPopover
                  columnId='status'
                  onOpenStatuses={() => setIsSetStatusesOpen(true)}
                />
              ) : null}
            </div>
          );
        },
        cell: ({ row }) => {
          const taskId = row.original.name;
          const status = row.original.status || '';
          if (onStatusUpdate && taskId) {
            const safeStatus = !status || status === '--' ? '' : status;
            return (
              <div onClick={(e) => e.stopPropagation()} className='flex items-center'>
                <TaskStatusDropdown
                  value={safeStatus}
                  onValueChange={(value) => onStatusUpdate(taskId, value)}
                  statusOptions={statusOptions}
                  size='small'
                  variant='inline'
                />
              </div>
            );
          }
          if (!status) return <span className='text-paragraph-xs text-text-sub-500'>—</span>;
          return (
            <Badge.Root variant='light' color={getStatusVariant(status)}>
              {String(status).toUpperCase()}
            </Badge.Root>
          );
        },
        meta: { cellClassName: 'px-4' },
      },
      {
        id: 'duration',
        enableSorting: true,
        header: () => {
          const isActive = sorting?.field === 'duration';
          const currentDirection = isActive ? sorting.direction : null;
          return (
            <div className='flex items-center gap-0.5 min-w-0'>
              <span className='min-w-0 truncate'>{label('duration', 'Duration')}</span>
              {onSortChange && (
                <button
                  type='button'
                  className='cursor-pointer shrink-0'
                  onClick={() => onSortChange('duration')}
                  aria-label='Sort by duration'
                >
                  {Table.getSortingIcon(currentDirection)}
                </button>
              )}
            </div>
          );
        },
        cell: ({ row }) => {
          const d = row.original.duration;
          return (
            <span className='paragraph-small text-text-sub-500'>
              {d != null && d !== '' ? `${d} Days` : '—'}
            </span>
          );
        },
        meta: { cellClassName: 'px-4 paragraph-small whitespace-nowrap text-text-sub-500' },
      },
      {
        id: 'trigger_type',
        enableSorting: true,
        header: () => {
          const isActive = sorting?.field === 'trigger_type';
          const currentDirection = isActive ? sorting.direction : null;
          return (
            <div className='flex items-center gap-0.5 min-w-0'>
              <span className='min-w-0 truncate'>{label('trigger_type', 'Trigger Type')}</span>
              {onSortChange && (
                <button
                  type='button'
                  className='cursor-pointer shrink-0'
                  onClick={() => onSortChange('trigger_type')}
                  aria-label='Sort by trigger type'
                >
                  {Table.getSortingIcon(currentDirection)}
                </button>
              )}
            </div>
          );
        },
        cell: ({ row }) => {
          const triggered =
            Number(row.original.set_trigger) === 1 ||
            row.original.set_trigger === true ||
            row.original.set_trigger === '1';
          if (!triggered) {
            return <span className='text-paragraph-xs text-text-sub-500'>—</span>;
          }
          const raw = String(row.original.trigger_type || '').trim();
          const display = /drop/i.test(raw)
            ? 'Drop Reason'
            : /pipeline/i.test(raw) || !raw
              ? 'Pipeline'
              : raw;
          return <span className='text-paragraph-xs text-text-main-900'>{display}</span>;
        },
        meta: { cellClassName: 'px-4' },
      },
      {
        id: 'drop_reason',
        enableSorting: false,
        header: () => (
          <div className='flex items-center gap-0.5 min-w-0'>
            <span className='min-w-0 truncate'>{label('drop_reason', 'Drop Reason')}</span>
          </div>
        ),
        cell: ({ row }) => {
          const reasons = parseDropReasons(row.original.drop_reason);
          if (reasons.length === 0) {
            return <span className='text-paragraph-xs text-text-sub-500'>—</span>;
          }
          const visible = reasons.slice(0, 2);
          const overflow = reasons.slice(2);
          return (
            <div className='flex flex-wrap items-center gap-1.5'>
              {visible.map((reason, index) => (
                <span key={`${reason}-${index}`} className={DROP_REASON_PILL_CLASS}>
                  {reason}
                </span>
              ))}
              {overflow.length > 0 && (
                <Tooltip.Root delayDuration={0}>
                  <Tooltip.Trigger asChild>
                    <span className={`${DROP_REASON_PILL_CLASS} cursor-default`}>
                      +{overflow.length}
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Content
                    side='top'
                    variant='light'
                    size='medium'
                    className='max-w-[280px] p-3'
                  >
                    <div className='flex flex-col gap-2'>
                      <span className='text-label-xs text-text-sub-500 font-medium'>
                        Drop reasons
                      </span>
                      <div className='flex flex-wrap gap-1.5'>
                        {reasons.map((reason, index) => (
                          <span key={`${reason}-${index}`} className={DROP_REASON_PILL_CLASS}>
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Tooltip.Content>
                </Tooltip.Root>
              )}
            </div>
          );
        },
        meta: { cellClassName: 'px-4' },
      },
      {
        id: 'pipeline',
        enableSorting: true,
        header: () => {
          const isActive = sorting?.field === 'pipeline';
          const currentDirection = isActive ? sorting.direction : null;
          return (
            <div className='flex items-center gap-0.5 min-w-0'>
              <span className='min-w-0 truncate'>{label('pipeline', 'Pipeline')}</span>
              {onSortChange && (
                <button
                  type='button'
                  className='cursor-pointer shrink-0'
                  onClick={() => onSortChange('pipeline')}
                  aria-label='Sort by pipeline'
                >
                  {Table.getSortingIcon(currentDirection)}
                </button>
              )}
            </div>
          );
        },
        cell: ({ row }) => {
          const v = (row.original.pipeline || '').trim();
          const display =
            row.original.pipeline_label || pipelineOptions.find((o) => o.value === v)?.label || v;
          if (!v) return <span className='text-paragraph-xs text-text-sub-500'>—</span>;
          return <span className='text-paragraph-xs text-text-main-900'>{display}</span>;
        },
        meta: { cellClassName: 'px-4' },
      },
      {
        id: 'lifecycle_stage',
        header: () => (
          <div className='flex items-center gap-0.5'>
            {label('lifecycle_stage', 'Lifecycle Stage')}
          </div>
        ),
        cell: ({ row }) => {
          const taskId = row.original.name;
          const rowPl = (row.original.pipeline || '').trim();
          const stagesForRow = (lifecycleStages || []).filter(
            (s) => !rowPl || (s.pipeline || '').trim() === rowPl,
          );
          const v = row.original.lifecycle_stage || row.original.lifecycle_stage_name || '';
          const stageLabel =
            stagesForRow.find((s) => s.name === v)?.stage ||
            lifecycleStages.find((s) => s.name === v)?.stage ||
            row.original.lifecycle_stage_name ||
            v;
          const color = row.original.lifecycle_stage_color;
          const pillStyle = {
            backgroundColor: color ? `${color}20` : 'var(--bg-weak-200, #f0f0f0)',
            color: color || 'var(--text-sub-600, #4a4a4a)',
            border: color ? `1px solid ${color}` : '1px solid var(--stroke-soft-200, #e5e5e5)',
          };
          if (showLifecycleFields && onLifecycleStageUpdate && taskId && stagesForRow.length > 0) {
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <SearchableSelect
                  variant='borderless'
                  value={v}
                  onValueChange={(value) => onLifecycleStageUpdate(taskId, value)}
                  size='xsmall'
                  options={stagesForRow.map((s) => ({
                    value: s.name,
                    label: s.stage,
                    color: s.color,
                  }))}
                  placeholder='—'
                  showArrow={false}
                  renderTrigger={({ selectedOption }) =>
                    v ? (
                      <span
                        className='inline-flex items-center rounded-full px-2 py-0.5 text-paragraph-xs font-medium'
                        style={pillStyle}
                      >
                        {stageLabel}
                      </span>
                    ) : (
                      <span className='text-paragraph-xs text-text-sub-500'>—</span>
                    )
                  }
                  renderOptionLabel={(option) => (
                    <span className='flex items-center gap-2'>
                      {option.color && (
                        <span
                          className='size-2.5 rounded-full shrink-0'
                          style={{ backgroundColor: option.color }}
                        />
                      )}
                      {option.label}
                    </span>
                  )}
                />
              </div>
            );
          }
          if (!v) return <span className='text-paragraph-xs text-text-sub-500'>—</span>;
          return (
            <span
              className='inline-flex items-center rounded-full px-2 py-0.5 text-paragraph-xs font-medium'
              style={pillStyle}
            >
              {stageLabel}
            </span>
          );
        },
        meta: { cellClassName: 'px-4' },
      },
      {
        id: 'lifecycle_stage_status',
        header: () => (
          <div className='flex items-center gap-0.5'>
            {label('lifecycle_stage_status', 'Lifecycle Stage Status')}
          </div>
        ),
        cell: ({ row }) => {
          const taskId = row.original.name;
          const v = row.original.lifecycle_stage_status || '';
          const rowPl = (row.original.pipeline || '').trim();
          const stagesForRow = (lifecycleStages || []).filter(
            (s) => !rowPl || (s.pipeline || '').trim() === rowPl,
          );
          const stageStatusOptions = row.original.lifecycle_stage
            ? (stagesForRow.find((s) => s.name === row.original.lifecycle_stage)
                ?.crm_stage_status ?? [])
            : [];
          const statusLabel =
            stageStatusOptions.find((o) => (o.name || '') === v)?.status ||
            stageStatusOptions.find((o) => (o.status || '') === v)?.status ||
            v;
          const pillClass =
            'inline-flex items-center rounded-full px-2 py-0.5 text-paragraph-xs font-medium text-text-sub-600 border border-stroke-soft-200';
          if (
            showLifecycleFields &&
            onLifecycleStageStatusUpdate &&
            taskId &&
            stageStatusOptions.length > 0
          ) {
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <SearchableSelect
                  variant='borderless'
                  value={v}
                  onValueChange={(value) => onLifecycleStageStatusUpdate(taskId, value)}
                  size='xsmall'
                  options={stageStatusOptions.map((s) => ({
                    value: s.name || s.status,
                    label: s.status ?? s.name,
                  }))}
                  placeholder='—'
                  showArrow={false}
                  renderTrigger={({ selectedOption }) =>
                    v ? (
                      <span className={pillClass}>{statusLabel}</span>
                    ) : (
                      <span className='text-paragraph-xs text-text-sub-500'>—</span>
                    )
                  }
                />
              </div>
            );
          }
          if (!v) return <span className='text-paragraph-xs text-text-sub-500'>—</span>;
          return <span className={pillClass}>{statusLabel}</span>;
        },
        meta: { cellClassName: 'px-4' },
      },
    ];
  }, [
    sorting,
    onSortChange,
    columnLabels,
    onPriorityUpdate,
    onStatusUpdate,
    onTypeUpdate,
    onLifecycleStageUpdate,
    onLifecycleStageStatusUpdate,
    pipelineOptions,
    taskTypeOptions,
    lifecycleStages,
    showLifecycleFields,
    statusOptions,
    enableStatusConfiguration,
  ]);

  const columnsToUse = useMemo(() => {
    const columnMap = new Map(allColumnDefs.map((col) => [col.id, col]));
    if (
      visibleColumnConfig &&
      Array.isArray(visibleColumnConfig) &&
      visibleColumnConfig.length > 0
    ) {
      const hasVisibleProperty = visibleColumnConfig.some((config) => 'visible' in config);
      if (hasVisibleProperty) {
        const result = applyColumnConfig(allColumnDefs, visibleColumnConfig);
        if (result.length > 0) return reorderPipelineLifecycleGroup(result);
      }
      const result = visibleColumnConfig
        .map((config) => columnMap.get(typeof config === 'string' ? config : config.id))
        .filter(Boolean);
      if (result.length > 0) return reorderPipelineLifecycleGroup(result);
    }
    const fallbackIds = columns.map((c) => (typeof c === 'string' ? c : c.id)).filter(Boolean);
    const fallback = fallbackIds.map((id) => columnMap.get(id)).filter(Boolean);
    if (fallback.length > 0) return reorderPipelineLifecycleGroup(fallback);
    return reorderPipelineLifecycleGroup(allColumnDefs);
  }, [allColumnDefs, visibleColumnConfig, columns]);

  const table = useReactTable({
    data: tasks,
    columns: columnsToUse,
    state: { sorting: localSorting },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
    enableSortingRemoval: true,
  });

  const colSpan = columnsToUse.length;
  const canResize = typeof onColumnResize === 'function';

  const tableMinWidth = useMemo(() => {
    return columnsToUse.reduce((sum, col) => sum + getWidth(col.id), 0);
  }, [columnsToUse, getWidth, resizing]);

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
      <Table.Root
        variant={tableVariant}
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
                    className='text-left label-small text-text-sub-600 font-medium relative pl-4 pr-4'
                    style={{
                      width,
                      minWidth: COLUMN_MIN_WIDTH,
                      maxWidth: COLUMN_MAX_WIDTH,
                      paddingRight: canResize ? '2rem' : undefined,
                    }}
                  >
                    <div className='flex items-center gap-0.5 min-w-0'>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                    {canResize && (
                      <div
                        role='separator'
                        aria-orientation='vertical'
                        aria-label={`Resize ${colId} column`}
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
            table.getRowModel().rows.map((row, i, rows) => (
              <React.Fragment key={row.id}>
                <Table.Row
                  key={row.id}
                  onClick={() => onTaskClick && onTaskClick(row.original)}
                  className={onTaskClick ? 'cursor-pointer' : ''}
                >
                  {row.getVisibleCells().map((cell) => {
                    const w = getWidth(cell.column.id);
                    return (
                      <Table.Cell
                        key={cell.id}
                        className={cell.column.columnDef.meta?.cellClassName}
                        style={{ width: w, minWidth: COLUMN_MIN_WIDTH, maxWidth: COLUMN_MAX_WIDTH }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    );
                  })}
                </Table.Row>
                {i < rows.length - 1 && <Table.RowDivider />}
              </React.Fragment>
            ))
          )}
        </Table.Body>
      </Table.Root>
    </>
  );
};

export default CrmTasksTableCommon;
