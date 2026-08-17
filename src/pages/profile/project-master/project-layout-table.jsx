import React, { useMemo } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import * as Badge from '@/components/ui/badge';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Table from '@/components/ui/table';
import * as Tag from '@/components/ui/tag';
import { sanitizeUnsignedIntegerInput } from '@/components/client-onboarding/task-view-drawer-utils';
import { applyColumnConfig } from '@/lib/column-utils';
import { cn } from '@/utils/cn';
import ProjectTaskTitleCell from '@/components/projects/shared/project-task-title-cell';
import {
  LAYOUT_TYPE_OPTIONS,
  PROJECT_LAYOUT_COLUMN_WIDTHS,
  PROJECT_MASTER_ACTIONS_COLUMN_WIDTH,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  colorForPriority,
  colorForStatus,
} from '@/pages/profile/project-master/project-master.constants';
import { getLayoutRowFieldValue } from '@/pages/profile/project-master/project-master-helpers';
import ProjectMasterTableDeleteButton from '@/pages/profile/project-master/project-master-table-delete-button';

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

function getLayoutTags(layout) {
  return getLayoutRowFieldValue(layout, 'tags');
}

export default function ProjectLayoutTable({
  layouts,
  onFieldUpdate,
  onOpenLayout,
  onDelete,
  columnConfig = [],
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
          const layout = row.original;

          return (
            <div className='min-w-0 max-w-[380px]'>
              <ProjectTaskTitleCell title={layout.task_name} />
            </div>
          );
        },
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_LAYOUT_COLUMN_WIDTHS.title, 'whitespace-nowrap') },
      },
      {
        id: 'layout_type',
        accessorKey: 'layout_type',
        columnLabel: 'Layout Type',
        header: () => <ProjectMasterColumnHeader label='Layout Type' />,
        cell: ({ row }) => {
          const layout = row.original;
          const layoutType = layout.layout_type || '';
          const options =
            layoutType && !LAYOUT_TYPE_OPTIONS.includes(layoutType)
              ? [layoutType, ...LAYOUT_TYPE_OPTIONS]
              : LAYOUT_TYPE_OPTIONS;

          return (
            <div onClick={stopRowClick} className='w-[140px]'>
              <Select.Root
                variant='borderless'
                value={layoutType}
                onValueChange={(value) => onFieldUpdate?.(layout.name, 'layout_type', value)}
                size='xsmall'
              >
                <Select.Trigger className='w-full' showArrow={false}>
                  <Select.Value>
                    <span className='truncate text-paragraph-sm text-text-sub-500'>
                      {layoutType || '—'}
                    </span>
                  </Select.Value>
                </Select.Trigger>
                <Select.Content>
                  {options.map((option) => (
                    <Select.Item key={option} value={option}>
                      {option}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
          );
        },
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_LAYOUT_COLUMN_WIDTHS.layout_type, 'whitespace-nowrap') },
      },
      {
        id: 'tags',
        accessorKey: 'tags',
        columnLabel: 'Tags',
        header: () => <ProjectMasterColumnHeader label='Tags' />,
        cell: ({ row }) => {
          const tags = getLayoutTags(row.original);
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
        meta: { headClassName: cn(PROJECT_LAYOUT_COLUMN_WIDTHS.tags, 'whitespace-nowrap') },
      },
      {
        id: 'duration',
        accessorKey: 'duration',
        columnLabel: 'Duration',
        header: () => <ProjectMasterColumnHeader label='Duration' />,
        cell: ({ row }) => {
          const layout = row.original;
          const layoutId = layout.name;
          const duration =
            layout.duration != null && layout.duration !== '' ? String(layout.duration) : '';

          return (
            <div onClick={stopRowClick} className='w-[100px]'>
              <Input.Root variant='borderless' size='xsmall'>
                <Input.Wrapper>
                  <Input.Input
                    key={`${layoutId}-${duration}`}
                    type='text'
                    inputMode='numeric'
                    defaultValue={duration}
                    placeholder='0'
                    onBlur={(event) => {
                      const value = sanitizeUnsignedIntegerInput(event.target.value.trim());
                      onFieldUpdate?.(layoutId, 'duration', value);
                    }}
                  />
                  <Input.Affix>Days</Input.Affix>
                </Input.Wrapper>
              </Input.Root>
            </div>
          );
        },
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_LAYOUT_COLUMN_WIDTHS.duration, 'whitespace-nowrap') },
      },
      {
        id: 'status',
        accessorKey: 'status',
        columnLabel: 'Status',
        header: () => <ProjectMasterColumnHeader label='Status' />,
        cell: ({ row }) => {
          const layout = row.original;
          const status = layout.status || '';
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
                onChange={(value) => onFieldUpdate?.(layout.name, 'status', value)}
              />
            </div>
          );
        },
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_LAYOUT_COLUMN_WIDTHS.status, 'whitespace-nowrap') },
      },
      {
        id: 'priority',
        accessorKey: 'priority',
        columnLabel: 'Priority',
        header: () => <ProjectMasterColumnHeader label='Priority' />,
        cell: ({ row }) => {
          const layout = row.original;

          return (
            <div className='w-[200px]'>
              <SelectBadgeCell
                value={layout.priority || ''}
                options={PRIORITY_OPTIONS}
                colorFn={colorForPriority}
                onChange={(value) => onFieldUpdate?.(layout.name, 'priority', value)}
              />
            </div>
          );
        },
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_LAYOUT_COLUMN_WIDTHS.priority, 'whitespace-nowrap') },
      },
    ],
    [onFieldUpdate],
  );

  const actionsColumn = useMemo(
    () => ({
      id: 'actions',
      columnLabel: 'Actions',
      enableHiding: false,
      header: () => <span className='sr-only'>Actions</span>,
      cell: ({ row }) => {
        const layout = row.original;
        const label = layout.task_name || layout.name || 'layout';

        return (
          <ProjectMasterTableDeleteButton
            ariaLabel={`Delete ${label}`}
            onClick={() => onDelete?.(layout)}
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
    data: layouts,
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
              onClick={() => onOpenLayout?.(row.original)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onOpenLayout?.(row.original);
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
