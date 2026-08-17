import React, { useMemo, useState } from 'react';
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
import * as Tag from '@/components/ui/tag';
import { applyColumnConfig } from '@/lib/column-utils';
import * as Tooltip from '@/components/ui/tooltip';
import {
  PROJECT_DETAIL_DOCUMENT_COLUMN_WIDTHS,
  PROJECT_DETAIL_PRIORITY_OPTIONS,
  colorForLayoutPriority,
} from '@/components/projects/constants';
import { normalizeProjectTaskAssigneeForSelect } from '@/components/projects/tasks/project-task-helpers';
import { formatToDDMMYYYY, parseToDate } from '@/utils/date-utils';
import { cn } from '@/utils/cn';
import { useTaskStatusScope } from '@/components/projects/shared/task-status-scope-context';

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

function ProjectDetailColumnHeader({ label }) {
  return (
    <div className='flex items-center gap-0.5'>
      <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>{label}</span>
    </div>
  );
}

function SelectBadgeCell({ value, options, colorFn, onChange, className }) {
  return (
    <Select.Root variant='borderless' value={value || ''} onValueChange={onChange} size='xsmall'>
      <Select.Trigger className={cn('h-8 w-fit px-2', className)} showArrow={false}>
        <Select.Value>
          {value ? (
            <Badge.Root variant='light' color={colorFn(value)} className={cn('text-nowrap')}>
              {String(value).toUpperCase()}
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
              {String(option).toUpperCase()}
            </Badge.Root>
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

function columnMeta(key) {
  const width = PROJECT_DETAIL_DOCUMENT_COLUMN_WIDTHS[key];
  return {
    headClassName: cn(width, 'whitespace-nowrap'),
    cellClassName: cn(width, key === 'name' && 'overflow-hidden'),
  };
}

export default function ProjectDetailDocumentTable({
  rows,
  onRowClick,
  onUpdateRow,
  onFieldUpdate,
  columnConfig = [],
  categoryOptions = [],
  projectId,
}) {
  const { statusOptions, statusMetaMap } = useTaskStatusScope();
  const handleUpdate = useMemo(() => {
    if (onFieldUpdate) return onFieldUpdate;
    return (taskId, fieldName, value) => {
      onUpdateRow?.(taskId, { [fieldName]: value });
    };
  }, [onFieldUpdate, onUpdateRow]);

  const allColumnDefs = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'title',
        columnLabel: 'Name',
        enableHiding: false,
        header: () => <ProjectDetailColumnHeader label='Name' />,
        cell: ({ row }) => {
          const doc = row.original;
          return (
            <ProjectTaskStatusTitleCell
              title={doc.title}
              status={doc.status}
              statusOptions={statusOptions}
              statusMetaMap={statusMetaMap}
              onStatusChange={(value) => handleUpdate(doc.id, 'status', value)}
              onTitleClick={() => onRowClick?.(doc)}
            />
          );
        },
        enableSorting: false,
        meta: columnMeta('name'),
      },
      {
        id: 'category',
        accessorKey: 'category',
        columnLabel: 'Category',
        header: ({ column }) => (
          <ProjectDetailSortableColumnHeader column={column} label='Category' />
        ),
        cell: ({ row }) => {
          const doc = row.original;
          const taskId = doc.id;
          const categoryValue = doc.category || '';
          const hasOption = categoryOptions.some((option) => option.value === categoryValue);
          const resolvedOptions =
            categoryValue && !hasOption
              ? [...categoryOptions, { value: categoryValue, label: categoryValue }]
              : categoryOptions;
          const categoryLabel =
            resolvedOptions.find((option) => option.value === categoryValue)?.label ??
            categoryValue;

          return (
            <StopPropagation>
              <Select.Root
                size='xsmall'
                variant='borderless'
                value={categoryValue || undefined}
                onValueChange={(value) => handleUpdate(taskId, 'category', value)}
              >
                <Select.Trigger className='h-8 min-w-[120px]'>
                  <Select.Value placeholder='Select category' />
                </Select.Trigger>
                <Select.Content>
                  {categoryOptions.map((option) => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </StopPropagation>
          );
        },
        meta: columnMeta('category'),
      },
      {
        id: 'assignee',
        accessorKey: 'assignees',
        columnLabel: 'Assignee',
        header: () => <ProjectDetailColumnHeader label='Assignee' />,
        cell: ({ row }) => {
          const doc = row.original;
          const taskId = doc.id;
          const value = (doc.assignees ?? [])
            .map((entry) => normalizeProjectTaskAssigneeForSelect(entry))
            .filter(Boolean);

          return (
            <StopPropagation className='min-w-0 max-w-full overflow-hidden'>
              <AssigneeMultiSelect
                value={value}
                onBlur={(nextValue) =>
                  handleUpdate(taskId, 'assignees', Array.isArray(nextValue) ? nextValue : [])
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
        id: 'tags',
        accessorKey: 'tags',
        columnLabel: 'Tags',
        header: () => <ProjectDetailColumnHeader label='Tags' />,
        cell: ({ row }) => {
          const totalTags = row.original.tags ?? [];
          if (totalTags.length === 0) {
            return <span className='text-paragraph-xs text-text-sub-500'>—</span>;
          }
          return (
            <div className='flex min-w-0 max-w-full items-center gap-1 overflow-hidden'>
              {totalTags.slice(0, 2).map((tag) => (
                <Tag.Root
                  key={tag}
                  variant='stroke'
                  className='h-5 rounded-full whitespace-nowrap px-2'
                >
                  {tag}
                </Tag.Root>
              ))}
              {totalTags.length > 2 ? (
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <Tag.Root variant='stroke' className='h-5 rounded-full px-2'>
                      +{totalTags.length - 2}
                    </Tag.Root>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <div className='flex flex-col gap-1'>
                      {totalTags.slice(2).map((tag) => (
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
          const doc = row.original;
          const taskId = doc.id;
          const dateValue = parseToDate(doc.exp_end_date ?? doc.due_date) ?? undefined;

          return (
            <StopPropagation className='min-w-0 w-full'>
              <Datepicker
                value={dateValue}
                onChange={(date) => handleUpdate(taskId, 'exp_end_date', date ?? '')}
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
          const doc = row.original;
          const taskId = doc.id;
          return (
            <StopPropagation>
              <ProjectStatusDropdown
                value={doc.status}
                onValueChange={(value) => handleUpdate(taskId, 'status', value)}
                statusOptions={statusOptions}
                statusMetaMap={statusMetaMap}
                size='xsmall'
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
          const doc = row.original;
          const priority = doc.priority || 'medium';

          return (
            <StopPropagation>
              <SelectBadgeCell
                value={priority}
                options={PROJECT_DETAIL_PRIORITY_OPTIONS}
                colorFn={colorForLayoutPriority}
                onChange={(value) => handleUpdate(doc.id, 'priority', value)}
              />
            </StopPropagation>
          );
        },
        meta: columnMeta('priority'),
      },
    ],
    [categoryOptions, handleUpdate, onRowClick, projectId, statusMetaMap, statusOptions],
  );

  const visibleDefs = useMemo(
    () => applyColumnConfig(allColumnDefs, columnConfig),
    [allColumnDefs, columnConfig],
  );

  const [sorting, setSorting] = useState([]);

  const table = useReactTable({
    data: rows,
    columns: visibleDefs,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Table.Root
      variant='compact'
      tableInstance={table}
      className='w-full overflow-x-auto [&_table]:table-fixed [&_table]:w-full'
    >
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
              className='group/row cursor-pointer'
              onClick={() => onRowClick?.(row.original.id)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  onRowClick?.(row.original.id);
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
