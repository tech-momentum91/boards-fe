import React, { useMemo, useState } from 'react';
import { formatToDDMMYYYY, parseToDate } from '@/utils/date-utils';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import ProjectDetailSortableColumnHeader from '@/components/projects/shared/project-detail-sortable-column-header';
import {
  projectDetailDateSortingFn,
  projectDetailDueDateAccessor,
  projectDetailPrioritySortingFn,
} from '@/components/projects/shared/project-detail-table-sorting';
import * as Badge from '@/components/ui/badge';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import { Datepicker } from '@/components/ui/datepicker';
import ProjectStatusDropdown from '@/components/projects/shared/project-status-dropdown';
import ProjectTaskStatusTitleCell from '@/components/projects/shared/project-task-status-title-cell';
import * as Select from '@/components/ui/select';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import * as Tag from '@/components/ui/tag';
import { applyColumnConfig } from '@/lib/column-utils';
import {
  PROJECT_DETAIL_PRIORITY_OPTIONS,
  PROJECT_DETAIL_TASK_COLUMN_WIDTHS,
} from '@/components/projects/constants';
import {
  colorForProjectTaskPriority,
  getProjectFloorSelectOptions,
} from '@/components/projects/shared';
import ProjectTaskAreaSelectField from '@/components/projects/shared/project-task-area-select-field';
import {
  PROJECT_DETAIL_INLINE_CELL,
  PROJECT_DETAIL_INLINE_AREA_TRIGGER_CLASS,
  PROJECT_DETAIL_INLINE_FIELD_CLASS,
  PROJECT_DETAIL_INLINE_TRIGGER_CLASS,
  PROJECT_DETAIL_TABLE_ROOT_CLASS,
  projectDetailColumnMeta,
} from '@/components/projects/shared/project-detail-table-layout';
import { cn } from '@/utils/cn';
import { normalizeProjectTaskAssigneeForSelect } from '@/components/projects/tasks/project-task-helpers';
import { useTaskStatusScope } from '@/components/projects/shared/task-status-scope-context';

function TaskAreaCell({ projectId, task, layoutBundles, onFieldUpdate }) {
  return (
    <StopPropagation className={PROJECT_DETAIL_INLINE_CELL}>
      <ProjectTaskAreaSelectField
        projectId={projectId}
        floor={task.floor}
        value={task.area}
        layoutBundles={layoutBundles}
        onValueChange={(value) => onFieldUpdate?.(task.id, 'area', value)}
        variant='borderless'
        contentClassName='min-w-[200px]'
        triggerClassName={PROJECT_DETAIL_INLINE_AREA_TRIGGER_CLASS}
      />
    </StopPropagation>
  );
}

function ProjectDetailColumnHeader({ label, className }) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>{label}</span>
    </div>
  );
}

function StopPropagation({ children, className }) {
  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      className={className}
    >
      {children}
    </div>
  );
}

function SelectBadgeCell({ value, options, colorFn, onChange, className }) {
  return (
    <Select.Root variant='borderless' value={value || ''} onValueChange={onChange} size='xsmall'>
      <Select.Trigger className={cn('h-8 w-full p-0', className)} showArrow={false}>
        <Select.Value>
          {value ? (
            <Badge.Root
              variant='light'
              color={colorFn(value)}
              className='max-w-full truncate text-nowrap'
            >
              {value === 'high'
                ? 'HIGH'
                : value === 'medium'
                  ? 'MEDIUM'
                  : value === 'low'
                    ? 'LOW'
                    : value}
            </Badge.Root>
          ) : (
            <span className='text-paragraph-xs text-text-sub-500'>—</span>
          )}
        </Select.Value>
      </Select.Trigger>
      <Select.Content className='min-w-[148px]'>
        {options.map((option) => (
          <Select.Item key={option} value={option}>
            <Badge.Root variant='light' color={colorFn(option)} className={cn('text-nowrap')}>
              {option === 'high'
                ? 'HIGH'
                : option === 'medium'
                  ? 'MEDIUM'
                  : option === 'low'
                    ? 'LOW'
                    : option}
            </Badge.Root>
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

function columnMeta(key) {
  return projectDetailColumnMeta(PROJECT_DETAIL_TASK_COLUMN_WIDTHS, key, {
    fluidKeys: ['title'],
  });
}

export default function ProjectDetailTaskTable({
  tasks,
  groupId,
  onRowClick,
  onFieldUpdate,
  columnConfig = [],
  projectId,
  projectFloors = [],
  layoutBundles = null,
}) {
  const { statusOptions, statusMetaMap } = useTaskStatusScope();
  const allColumnDefs = useMemo(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        columnLabel: 'Title',
        enableHiding: false,
        header: () => <ProjectDetailColumnHeader label='Title' />,
        cell: ({ row }) => {
          const task = row.original;
          const taskId = task.id;

          return (
            <ProjectTaskStatusTitleCell
              title={task.title}
              status={task.status}
              statusOptions={statusOptions}
              statusMetaMap={statusMetaMap}
              onStatusChange={(value) => onFieldUpdate?.(taskId, 'status', value)}
              onTitleClick={() => onRowClick?.(groupId, taskId)}
            />
          );
        },
        enableSorting: false,
        meta: columnMeta('title'),
      },
      {
        id: 'assignee',
        accessorKey: 'assignees',
        columnLabel: 'Assignee',
        header: () => <ProjectDetailColumnHeader label='Assignee' />,
        cell: ({ row }) => {
          const task = row.original;
          const taskId = task.id;
          const value = (task.assignees ?? [])
            .map((entry) => normalizeProjectTaskAssigneeForSelect(entry))
            .filter(Boolean);

          return (
            <StopPropagation className={PROJECT_DETAIL_INLINE_CELL}>
              <AssigneeMultiSelect
                value={value}
                onBlur={(nextValue) =>
                  onFieldUpdate?.(taskId, 'assignees', Array.isArray(nextValue) ? nextValue : [])
                }
                placeholder='Select'
                maxVisibleAvatars={2}
                variant='borderless'
                size='xsmall'
                projectId={projectId}
                className='w-full -ml-2'
              />
            </StopPropagation>
          );
        },
        enableSorting: false,
        meta: columnMeta('assignee'),
      },
      {
        id: 'floor',
        accessorKey: 'floor',
        columnLabel: 'Floor',
        header: ({ column }) => <ProjectDetailSortableColumnHeader column={column} label='Floor' />,
        cell: ({ row }) => {
          const task = row.original;
          const taskId = task.id;
          const floorOptions = getProjectFloorSelectOptions(projectFloors, task.floor);

          return (
            <StopPropagation className={PROJECT_DETAIL_INLINE_CELL}>
              <Select.Root
                size='xsmall'
                variant='borderless'
                value={task.floor || undefined}
                onValueChange={(value) => onFieldUpdate?.(taskId, 'floor', value)}
              >
                <Select.Trigger className={PROJECT_DETAIL_INLINE_TRIGGER_CLASS} showArrow={false}>
                  <Select.Value placeholder='Select' />
                </Select.Trigger>
                <Select.Content className='min-w-[148px]'>
                  {floorOptions.map((option) => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </StopPropagation>
          );
        },
        meta: columnMeta('floor'),
      },
      {
        id: 'area',
        accessorKey: 'area',
        columnLabel: 'Area',
        header: ({ column }) => <ProjectDetailSortableColumnHeader column={column} label='Area' />,
        cell: ({ row }) => {
          const task = row.original;
          return (
            <TaskAreaCell
              projectId={projectId}
              task={task}
              layoutBundles={layoutBundles}
              onFieldUpdate={onFieldUpdate}
            />
          );
        },
        meta: columnMeta('area'),
      },
      {
        id: 'tags',
        accessorKey: 'tags',
        columnLabel: 'Tags',
        header: () => <ProjectDetailColumnHeader label='Tags' />,
        cell: ({ row }) => {
          const tags = row.original.tags ?? [];
          if (tags.length === 0) {
            return <span className='text-paragraph-xs text-text-sub-500'>—</span>;
          }
          return (
            <div className='flex min-w-0 max-w-full items-center gap-1 overflow-hidden'>
              {tags.slice(0, 2).map((tag) => (
                <Tag.Root
                  key={tag}
                  variant='stroke'
                  size='small'
                  className='max-w-[90px] truncate whitespace-nowrap'
                >
                  {tag}
                </Tag.Root>
              ))}

              {tags.length > 2 ? (
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <Tag.Root variant='stroke' size='small' className='shrink-0 whitespace-nowrap'>
                      +{tags.length - 2}
                    </Tag.Root>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <div className='flex flex-col gap-1'>
                      {tags.slice(2).map((tag) => (
                        <span key={tag} className='text-paragraph-xs text-white whitespace-nowrap'>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </Tooltip.Content>
                </Tooltip.Root>
              ) : null}
            </div>
          );
        },
        enableSorting: false,
        meta: columnMeta('tags'),
      },
      {
        id: 'due_date',
        accessorKey: 'due_date',
        accessorFn: projectDetailDueDateAccessor,
        sortingFn: projectDetailDateSortingFn,
        columnLabel: 'Due Date',
        header: ({ column }) => (
          <ProjectDetailSortableColumnHeader column={column} label='Due Date' />
        ),
        cell: ({ row }) => {
          const task = row.original;
          const taskId = task.id;
          const dateValue = parseToDate(task.exp_end_date ?? task.due_date) ?? undefined;

          return (
            <StopPropagation className={PROJECT_DETAIL_INLINE_CELL}>
              <Datepicker
                value={dateValue}
                onChange={(date) => onFieldUpdate?.(taskId, 'exp_end_date', date ?? '')}
                placeholder='DD/MM/YYYY'
                formatDate={(date) => formatToDDMMYYYY(date)}
                size='xsmall'
                variant='borderless'
                className='w-full -ml-2'
              />
            </StopPropagation>
          );
        },
        meta: columnMeta('due_date'),
      },
      {
        id: 'status',
        accessorKey: 'status',
        columnLabel: 'Status',
        header: ({ column }) => (
          <ProjectDetailSortableColumnHeader column={column} label='Status' />
        ),
        cell: ({ row }) => {
          const task = row.original;
          const taskId = task.id;

          return (
            <StopPropagation className={PROJECT_DETAIL_INLINE_CELL}>
              <ProjectStatusDropdown
                value={row.original.status}
                onValueChange={(value) => onFieldUpdate?.(taskId, 'status', value)}
                statusOptions={statusOptions}
                statusMetaMap={statusMetaMap}
                size='xsmall'
                className='w-full -ml-2'
              />
            </StopPropagation>
          );
        },
        meta: columnMeta('status'),
      },
      {
        id: 'priority',
        accessorKey: 'priority',
        sortingFn: projectDetailPrioritySortingFn,
        columnLabel: 'Priority',
        header: ({ column }) => (
          <ProjectDetailSortableColumnHeader column={column} label='Priority' />
        ),
        cell: ({ row }) => {
          const task = row.original;
          const priority = task.priority || 'medium';

          return (
            <StopPropagation className={PROJECT_DETAIL_INLINE_CELL}>
              <SelectBadgeCell
                value={priority}
                options={PROJECT_DETAIL_PRIORITY_OPTIONS}
                colorFn={colorForProjectTaskPriority}
                onChange={(value) => onFieldUpdate?.(task.id, 'priority', value)}
                className='-ml-2'
              />
            </StopPropagation>
          );
        },
        meta: columnMeta('priority'),
      },
    ],
    [
      groupId,
      layoutBundles,
      onFieldUpdate,
      onRowClick,
      projectFloors,
      projectId,
      statusMetaMap,
      statusOptions,
    ],
  );

  const visibleDefs = useMemo(
    () => applyColumnConfig(allColumnDefs, columnConfig),
    [allColumnDefs, columnConfig],
  );

  const [sorting, setSorting] = useState([]);

  const table = useReactTable({
    data: tasks,
    columns: visibleDefs,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Table.Root variant='compact' tableInstance={table} className={PROJECT_DETAIL_TABLE_ROOT_CLASS}>
      <Table.Header>
        {table.getHeaderGroups().map((headerGroup) => (
          <Table.Row key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <Table.Head key={header.id} className={header.column.columnDef.meta?.headClassName}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </Table.Head>
            ))}
          </Table.Row>
        ))}
      </Table.Header>
      <Table.Body spacing={4}>
        {table.getRowModel().rows.map((row) => (
          <React.Fragment key={row.id}>
            <Table.Row
              className='cursor-pointer'
              onClick={() => onRowClick?.(groupId, row.original.id)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  onRowClick?.(groupId, row.original.id);
                }
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <Table.Cell key={cell.id} className={cell.column.columnDef.meta?.cellClassName}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Table.Cell>
              ))}
            </Table.Row>
            <Table.RowDivider />
          </React.Fragment>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
