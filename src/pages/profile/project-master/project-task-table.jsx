import React, { useMemo } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import * as Badge from '@/components/ui/badge';
import * as Input from '@/components/ui/input';
import InlineEditableText from '@/components/ui/inline-editable-text';
import * as Select from '@/components/ui/select';
import * as Table from '@/components/ui/table';
import * as Tag from '@/components/ui/tag';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import ProjectTaskTitleCell from '@/components/projects/shared/project-task-title-cell';
import { sanitizeUnsignedIntegerInput } from '@/components/client-onboarding/task-view-drawer-utils';
import { applyColumnConfig } from '@/lib/column-utils';
import { cn } from '@/utils/cn';
import { normalizeTaskAssigneeEntry } from '@/utils/task-utils';
import {
  ASSIGNEE_OPTIONS,
  PROJECT_TASK_COLUMN_WIDTHS,
  PROJECT_MASTER_ACTIONS_COLUMN_WIDTH,
  PRIORITY_OPTIONS,
  STAGE_OPTIONS,
  STATUS_OPTIONS,
  colorForPriority,
  colorForStage,
  colorForStatus,
} from '@/pages/profile/project-master/project-master.constants';
import ProjectMasterTableDeleteButton from '@/pages/profile/project-master/project-master-table-delete-button';

const ASSIGNEE_SELECT_ITEMS = ASSIGNEE_OPTIONS.map((name) => ({
  value: name,
  label: name,
  name,
  full_name: name,
}));

function stopRowClick(event) {
  event.stopPropagation();
}

function ProjectMasterColumnHeader({ label }) {
  return (
    <div className='flex items-center gap-0.5'>
      <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>{label}</span>
    </div>
  );
}

function SelectBadgeCell({ value, options, colorFn, onChange, className }) {
  return (
    <div onClick={stopRowClick}>
      <Select.Root variant='borderless' value={value || ''} onValueChange={onChange} size='xsmall'>
        <Select.Trigger className='w-full' showArrow={false}>
          <Select.Value>
            {value ? (
              <Badge.Root
                variant='light'
                color={colorFn(value)}
                className={cn('text-nowrap', className)}
              >
                {value}
              </Badge.Root>
            ) : (
              <span className='text-paragraph-xs text-text-sub-500'>—</span>
            )}
          </Select.Value>
        </Select.Trigger>
        <Select.Content className='min-w-[148px]'>
          {options.map((option) => (
            <Select.Item key={option} value={option}>
              <Badge.Root
                variant='light'
                color={colorFn(option)}
                className={cn('text-nowrap', className)}
              >
                {option}
              </Badge.Root>
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </div>
  );
}

export default function ProjectTaskTable({
  tasks,
  onFieldUpdate,
  onOpenTask,
  onDelete,
  columnConfig = [],
  stageOptions = STAGE_OPTIONS,
}) {
  const allColumnDefs = useMemo(
    () => [
      {
        id: 'title',
        accessorKey: 'task_name',
        columnLabel: 'Task',
        enableHiding: false,
        header: () => <ProjectMasterColumnHeader label='Task' />,
        cell: ({ row }) => {
          const task = row.original;
          const taskId = task.name;
          const title = task.task_name || task.subject || '';

          return (
            <div className='min-w-0 max-w-[380px]'>
              <ProjectTaskTitleCell title={title} />
            </div>
          );
        },
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_TASK_COLUMN_WIDTHS.title, 'whitespace-nowrap') },
      },
      {
        id: 'assignee',
        accessorKey: 'assignees',
        columnLabel: 'Assignee',
        header: () => <ProjectMasterColumnHeader label='Assignee' />,
        cell: ({ row }) => {
          const task = row.original;
          const taskId = task.name;
          const rows = task.assignees ?? task.assignee ?? [];
          const list = Array.isArray(rows) ? rows : [rows];
          const value = list.map((entry) => normalizeTaskAssigneeEntry(entry)).filter(Boolean);

          return (
            <div onClick={stopRowClick}>
              <AssigneeMultiSelect
                value={value}
                options={ASSIGNEE_SELECT_ITEMS}
                onBlur={(nextValue) =>
                  onFieldUpdate?.(taskId, 'assigned_to', Array.isArray(nextValue) ? nextValue : [])
                }
                placeholder='Select'
                maxVisibleAvatars={2}
                variant='borderless'
                size='small'
              />
            </div>
          );
        },
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_TASK_COLUMN_WIDTHS.assignee, 'whitespace-nowrap') },
      },
      {
        id: 'stage',
        accessorKey: 'stage',
        columnLabel: 'Stage',
        header: () => <ProjectMasterColumnHeader label='Stage' />,
        cell: ({ row }) => {
          const task = row.original;
          const stage = task.stage || '';
          const options =
            stage && !stageOptions.includes(stage) ? [stage, ...stageOptions] : stageOptions;

          return (
            <div className='w-[100px]'>
              <SelectBadgeCell
                value={stage}
                options={options}
                colorFn={colorForStage}
                className='uppercase'
                onChange={(value) => onFieldUpdate?.(task.name, 'stage', value)}
              />
            </div>
          );
        },
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_TASK_COLUMN_WIDTHS.stage, 'whitespace-nowrap') },
      },
      {
        id: 'tags',
        accessorKey: 'tags',
        columnLabel: 'Tags',
        header: () => <ProjectMasterColumnHeader label='Tags' />,
        cell: ({ row }) => {
          const tags = Array.isArray(row.original.tags) ? row.original.tags : [];
          if (tags.length === 0) {
            return <span className='text-paragraph-xs text-text-sub-500'>—</span>;
          }
          return (
            <div className='flex max-w-[140px] gap-1'>
              {tags.slice(0, 2).map((tag) => (
                <Tag.Root key={tag} variant='stroke' className='h-5 rounded-full'>
                  {tag}
                </Tag.Root>
              ))}
            </div>
          );
        },
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_TASK_COLUMN_WIDTHS.tags, 'whitespace-nowrap') },
      },
      {
        id: 'duration',
        accessorKey: 'duration',
        columnLabel: 'Duration',
        header: () => <ProjectMasterColumnHeader label='Duration' />,
        cell: ({ row }) => {
          const task = row.original;
          const taskId = task.name;
          const duration =
            task.duration != null && task.duration !== '' ? String(task.duration) : '';

          return (
            <div onClick={stopRowClick} className='w-[100px]'>
              <Input.Root variant='borderless' size='xsmall'>
                <Input.Wrapper>
                  <Input.Input
                    key={`${taskId}-${duration}`}
                    type='text'
                    inputMode='numeric'
                    defaultValue={duration}
                    placeholder='0'
                    onBlur={(event) => {
                      const value = sanitizeUnsignedIntegerInput(event.target.value.trim());
                      onFieldUpdate?.(taskId, 'duration', value);
                    }}
                  />
                  <Input.Affix>Days</Input.Affix>
                </Input.Wrapper>
              </Input.Root>
            </div>
          );
        },
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_TASK_COLUMN_WIDTHS.duration, 'whitespace-nowrap') },
      },
      {
        id: 'status',
        accessorKey: 'status',
        columnLabel: 'Status',
        header: () => <ProjectMasterColumnHeader label='Status' />,
        cell: ({ row }) => {
          const task = row.original;
          const status = task.status || '';
          const options =
            status && !STATUS_OPTIONS.includes(status)
              ? [status, ...STATUS_OPTIONS]
              : STATUS_OPTIONS;

          return (
            <div className='w-[200px]'>
              <SelectBadgeCell
                value={status}
                options={options}
                colorFn={colorForStatus}
                onChange={(value) => onFieldUpdate?.(task.name, 'status', value)}
              />
            </div>
          );
        },
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_TASK_COLUMN_WIDTHS.status, 'whitespace-nowrap') },
      },
      {
        id: 'priority',
        accessorKey: 'priority',
        columnLabel: 'Priority',
        header: () => <ProjectMasterColumnHeader label='Priority' />,
        cell: ({ row }) => {
          const task = row.original;
          const priority = task.priority || '';

          return (
            <div className='w-[200px]'>
              <SelectBadgeCell
                value={priority}
                options={PRIORITY_OPTIONS}
                colorFn={colorForPriority}
                onChange={(value) => onFieldUpdate?.(task.name, 'priority', value)}
              />
            </div>
          );
        },
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_TASK_COLUMN_WIDTHS.priority, 'whitespace-nowrap') },
      },
    ],
    [onFieldUpdate, stageOptions],
  );

  const actionsColumn = useMemo(
    () => ({
      id: 'actions',
      columnLabel: 'Actions',
      enableHiding: false,
      header: () => <span className='sr-only'>Actions</span>,
      cell: ({ row }) => {
        const task = row.original;
        const label = task.task_name || task.subject || task.name || 'task';

        return (
          <ProjectMasterTableDeleteButton
            ariaLabel={`Delete ${label}`}
            onClick={() => onDelete?.(task)}
          />
        );
      },
      enableSorting: false,
      meta: {
        headClassName: PROJECT_MASTER_ACTIONS_COLUMN_WIDTH,
        cellClassName: 'text-right',
      },
    }),
    [onDelete],
  );

  const visibleDefs = useMemo(() => {
    return [...applyColumnConfig(allColumnDefs, columnConfig), actionsColumn];
  }, [actionsColumn, allColumnDefs, columnConfig]);

  const table = useReactTable({
    data: tasks,
    columns: visibleDefs,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table.Root variant='compact' className='min-w-[1024px]'>
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
              onClick={() => onOpenTask(row.original)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onOpenTask(row.original);
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <Table.Cell key={cell.id} className={cell.column.columnDef.meta?.cellClassName}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Table.Cell>
              ))}
            </Table.Row>
            <Table.RowDivider dividerClassName='bg-transparent' />
          </React.Fragment>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
