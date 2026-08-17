import React, { useMemo } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import * as Badge from '@/components/ui/badge';
import * as Select from '@/components/ui/select';
import * as Table from '@/components/ui/table';
import * as Tag from '@/components/ui/tag';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import ProjectTaskTitleCell from '@/components/projects/shared/project-task-title-cell';
import { applyColumnConfig } from '@/lib/column-utils';
import { cn } from '@/utils/cn';
import { normalizeTaskAssigneeEntry } from '@/utils/task-utils';
import {
  ASSIGNEE_OPTIONS,
  PROJECT_DOCUMENT_COLUMN_WIDTHS,
  PROJECT_MASTER_ACTIONS_COLUMN_WIDTH,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  colorForPriority,
  colorForStatus,
} from '@/pages/profile/project-master/project-master.constants';
import { getDocumentRowFieldValue } from '@/pages/profile/project-master/project-master-helpers';
import ProjectMasterTableDeleteButton from '@/pages/profile/project-master/project-master-table-delete-button';

function resolveCategoryLabel(categoryOptions, value) {
  const match = categoryOptions.find((option) => option.value === value);
  return match?.label ?? value;
}

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

export default function ProjectDocumentTable({
  documents,
  onFieldUpdate,
  onOpenDocument,
  onDelete,
  columnConfig = [],
  categoryOptions = [],
}) {
  const allColumnDefs = useMemo(
    () => [
      {
        id: 'title',
        accessorKey: 'task_name',
        columnLabel: 'Title',
        enableHiding: false,
        header: () => <ProjectMasterColumnHeader label='Title' />,
        cell: ({ row }) => {
          const document = row.original;

          return (
            <div className='min-w-0 max-w-[380px]'>
              <ProjectTaskTitleCell title={document.task_name} />
            </div>
          );
        },
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_DOCUMENT_COLUMN_WIDTHS.title, 'whitespace-nowrap') },
      },
      {
        id: 'category',
        accessorKey: 'category',
        columnLabel: 'Category',
        header: () => <ProjectMasterColumnHeader label='Category' />,
        cell: ({ row }) => {
          const document = row.original;
          const documentCategory = getDocumentRowFieldValue(document, 'document_category');
          const options =
            documentCategory && !categoryOptions.some((option) => option.value === documentCategory)
              ? [{ value: documentCategory, label: documentCategory }, ...categoryOptions]
              : categoryOptions;

          return (
            <div onClick={stopRowClick} className='w-[140px]'>
              <Select.Root
                variant='borderless'
                value={documentCategory}
                onValueChange={(value) =>
                  onFieldUpdate?.(document.name, 'document_category', value)
                }
                size='xsmall'
              >
                <Select.Trigger className='w-full' showArrow={false}>
                  <Select.Value>
                    <span className='truncate text-paragraph-sm text-text-sub-500'>
                      {resolveCategoryLabel(options, documentCategory) || '—'}
                    </span>
                  </Select.Value>
                </Select.Trigger>
                <Select.Content>
                  {options.map((option) => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
          );
        },
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_DOCUMENT_COLUMN_WIDTHS.category, 'whitespace-nowrap') },
      },
      {
        id: 'assignee',
        accessorKey: 'assignee',
        columnLabel: 'Assignee',
        header: () => <ProjectMasterColumnHeader label='Assignee' />,
        cell: ({ row }) => {
          const document = row.original;
          const documentId = document.name;
          const rows = document.assignees ?? document.assignee ?? [];
          const list = Array.isArray(rows) ? rows : [rows];
          const value = list.map((entry) => normalizeTaskAssigneeEntry(entry)).filter(Boolean);

          return (
            <div onClick={stopRowClick}>
              <AssigneeMultiSelect
                value={value}
                options={ASSIGNEE_SELECT_ITEMS}
                onBlur={(nextValue) =>
                  onFieldUpdate?.(documentId, 'assignee', Array.isArray(nextValue) ? nextValue : [])
                }
                placeholder='Select'
                maxVisibleAvatars={2}
                variant='borderless'
                size='xsmall'
              />
            </div>
          );
        },
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_DOCUMENT_COLUMN_WIDTHS.assignee, 'whitespace-nowrap') },
      },
      {
        id: 'tags',
        accessorKey: 'tags',
        columnLabel: 'Tags',
        header: () => <ProjectMasterColumnHeader label='Tags' />,
        cell: ({ row }) => {
          const tags = getDocumentRowFieldValue(row.original, 'tags');
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
        meta: { headClassName: cn(PROJECT_DOCUMENT_COLUMN_WIDTHS.tags, 'whitespace-nowrap') },
      },
      {
        id: 'status',
        accessorKey: 'status',
        columnLabel: 'Status',
        header: () => <ProjectMasterColumnHeader label='Status' />,
        cell: ({ row }) => {
          const document = row.original;
          const status = document.status || '';
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
                onChange={(value) => onFieldUpdate?.(document.name, 'status', value)}
              />
            </div>
          );
        },
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_DOCUMENT_COLUMN_WIDTHS.status, 'whitespace-nowrap') },
      },
      {
        id: 'priority',
        accessorKey: 'priority',
        columnLabel: 'Priority',
        header: () => <ProjectMasterColumnHeader label='Priority' />,
        cell: ({ row }) => {
          const document = row.original;

          return (
            <div className='w-[200px]'>
              <SelectBadgeCell
                value={document.priority || ''}
                options={PRIORITY_OPTIONS}
                colorFn={colorForPriority}
                onChange={(value) => onFieldUpdate?.(document.name, 'priority', value)}
              />
            </div>
          );
        },
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_DOCUMENT_COLUMN_WIDTHS.priority, 'whitespace-nowrap') },
      },
    ],
    [categoryOptions, onFieldUpdate],
  );

  const actionsColumn = useMemo(
    () => ({
      id: 'actions',
      columnLabel: 'Actions',
      enableHiding: false,
      header: () => <span className='sr-only'>Actions</span>,
      cell: ({ row }) => {
        const document = row.original;
        const label = document.task_name || document.name || 'document';

        return (
          <ProjectMasterTableDeleteButton
            ariaLabel={`Delete ${label}`}
            onClick={() => onDelete?.(document)}
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
    data: documents,
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
              onClick={() => onOpenDocument?.(row.original)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onOpenDocument?.(row.original);
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
