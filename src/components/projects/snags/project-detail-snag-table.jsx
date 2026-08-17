import React, { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  PROJECT_DETAIL_INLINE_CELL,
  PROJECT_DETAIL_INLINE_AREA_TRIGGER_CLASS,
  PROJECT_DETAIL_INLINE_FIELD_CLASS,
  PROJECT_DETAIL_INLINE_TRIGGER_CLASS,
  PROJECT_DETAIL_WIDE_TABLE_ROOT_CLASS,
  projectDetailColumnMeta,
} from '@/components/projects/shared/project-detail-table-layout';
import ProjectDetailSortableColumnHeader from '@/components/projects/shared/project-detail-sortable-column-header';
import {
  projectDetailDateSortingFn,
  projectDetailDueDateAccessor,
  projectDetailPrioritySortingFn,
} from '@/components/projects/shared/project-detail-table-sorting';
import {
  snagCategoryLabel,
  snagGroupBadgeColor,
  snagSourceLabel,
  snagSubcategoryLabel,
} from '@/components/projects/snags/project-snag-helpers';
import {
  colorForProjectTaskPriority,
  getProjectFloorSelectOptions,
} from '@/components/projects/shared';
import ProjectTaskStatusTitleCell from '@/components/projects/shared/project-task-status-title-cell';
import ProjectTaskAreaSelectField from '@/components/projects/shared/project-task-area-select-field';
import ProjectStatusDropdown from '@/components/projects/shared/project-status-dropdown';
import * as Avatar from '@/components/ui/avatar';
import * as AvatarGroup from '@/components/ui/avatar-group';
import * as Badge from '@/components/ui/badge';
import * as Select from '@/components/ui/select';
import * as Table from '@/components/ui/table';
import * as Tag from '@/components/ui/tag';
import { applyColumnConfig } from '@/lib/column-utils';
import { PROJECT_DETAIL_SNAG_COLUMN_WIDTHS } from '@/components/projects/constants';
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

function SnagAreaCell({ projectId, snag, layoutBundles, onFieldUpdate }) {
  return (
    <StopPropagation className={PROJECT_DETAIL_INLINE_CELL}>
      <ProjectTaskAreaSelectField
        projectId={projectId}
        floor={snag.floor}
        value={snag.area}
        layoutBundles={layoutBundles}
        layoutTaskType='Snag Tasks'
        onValueChange={(value) => onFieldUpdate?.(snag.id, 'area', value)}
        variant='borderless'
        contentClassName='min-w-[200px]'
        triggerClassName={PROJECT_DETAIL_INLINE_AREA_TRIGGER_CLASS}
      />
    </StopPropagation>
  );
}

function ProjectDetailColumnHeader({ label }) {
  return (
    <div className='flex items-center gap-0.5'>
      <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>{label}</span>
    </div>
  );
}

function columnMeta(key) {
  return projectDetailColumnMeta(PROJECT_DETAIL_SNAG_COLUMN_WIDTHS, key, {
    fluidKeys: [],
  });
}

export default function ProjectDetailSnagTable({
  rows,
  groupId,
  onRowClick,
  onFieldUpdate,
  columnConfig = [],
  categories = [],
  projectId,
  projectFloors = [],
  layoutBundles = null,
}) {
  const { statusOptions, statusMetaMap } = useTaskStatusScope();
  const allColumnDefs = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'title',
        columnLabel: 'Name',
        enableHiding: false,
        header: () => <ProjectDetailColumnHeader label='Name' />,
        cell: ({ row }) => (
          <ProjectTaskStatusTitleCell
            title={row.original.title}
            status={row.original.status}
            statusOptions={statusOptions}
            statusMetaMap={statusMetaMap}
            onStatusChange={(value) => onFieldUpdate?.(row.original.id, 'status', value)}
            onTitleClick={() => onRowClick?.(groupId, row.original.id)}
          />
        ),
        enableSorting: false,
        meta: columnMeta('name'),
      },
      {
        id: 'category',
        accessorKey: 'category',
        columnLabel: 'Product Category',
        header: () => <ProjectDetailColumnHeader label='Product Category' />,
        cell: ({ row }) => (
          <span className='text-paragraph-sm text-text-sub-500'>
            {snagCategoryLabel(row.original.category)}
          </span>
        ),
        meta: columnMeta('category'),
      },
      {
        id: 'sub_category',
        accessorKey: 'sub_category',
        columnLabel: 'Sub-category',
        header: ({ column }) => (
          <ProjectDetailSortableColumnHeader column={column} label='Sub-category' />
        ),
        cell: ({ row }) => (
          <span className='text-paragraph-sm text-text-sub-500'>
            {snagSubcategoryLabel(row.original.sub_category)}
          </span>
        ),
        meta: columnMeta('sub_category'),
      },
      {
        id: 'floor',
        accessorKey: 'floor',
        columnLabel: 'Floor',
        header: () => <ProjectDetailColumnHeader label='Floor' />,
        cell: ({ row }) => {
          const snag = row.original;
          const floorOptions = getProjectFloorSelectOptions(projectFloors, snag.floor);

          return (
            <StopPropagation className={PROJECT_DETAIL_INLINE_CELL}>
              <Select.Root
                size='xsmall'
                variant='borderless'
                value={snag.floor || undefined}
                onValueChange={(value) => onFieldUpdate?.(snag.id, 'floor', value)}
              >
                <Select.Trigger className={PROJECT_DETAIL_INLINE_TRIGGER_CLASS} showArrow={false}>
                  <Select.Value placeholder='Select' />
                </Select.Trigger>
                <Select.Content>
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
        enableSorting: false,
        meta: columnMeta('floor'),
      },
      {
        id: 'area',
        accessorKey: 'area',
        columnLabel: 'Area',
        header: ({ column }) => <ProjectDetailSortableColumnHeader column={column} label='Area' />,
        cell: ({ row }) => (
          <SnagAreaCell
            projectId={projectId}
            snag={row.original}
            layoutBundles={layoutBundles}
            onFieldUpdate={onFieldUpdate}
          />
        ),
        enableSorting: false,
        meta: columnMeta('area'),
      },
      {
        id: 'source',
        accessorKey: 'source',
        columnLabel: 'Source',
        header: ({ column }) => (
          <ProjectDetailSortableColumnHeader column={column} label='Source' />
        ),
        cell: ({ row }) => {
          const source = snagSourceLabel(row.original.source ?? row.original.snag_source);
          if (source === '—') {
            return <span className='text-paragraph-sm text-text-sub-500'>—</span>;
          }
          return (
            <Badge.Root size='small' variant='light' color={snagGroupBadgeColor(source)}>
              {source}
            </Badge.Root>
          );
        },
        meta: columnMeta('source'),
      },
      {
        id: 'raised_by',
        accessorKey: 'raised_by',
        columnLabel: 'Raised By',
        header: ({ column }) => (
          <ProjectDetailSortableColumnHeader column={column} label='Raised By' />
        ),
        cell: ({ row }) => (
          <span className='block truncate text-paragraph-sm text-text-sub-500'>
            {row.original.raised_by_name || row.original.raised_by || '—'}
          </span>
        ),
        meta: columnMeta('raised_by'),
      },
      {
        id: 'assignee',
        accessorKey: 'assignees',
        columnLabel: 'Assignee',
        header: () => <ProjectDetailColumnHeader label='Assignee' />,
        cell: ({ row }) => {
          const assignees = row.original.assignees ?? [];
          if (assignees.length === 0) {
            return <span className='text-paragraph-xs text-text-sub-500'>—</span>;
          }
          return (
            <AvatarGroup.Root size='24'>
              {assignees.map((assignee) => (
                <Avatar.Root key={assignee.id} size='24' color={assignee.color}>
                  {assignee.initials}
                </Avatar.Root>
              ))}
            </AvatarGroup.Root>
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
                  className='h-5 rounded-full whitespace-nowrap px-2'
                >
                  {tag}
                </Tag.Root>
              ))}
              {tags.length > 2 ? (
                <Tag.Root variant='stroke' className='h-5 rounded-full px-2'>
                  +{tags.length - 2}
                </Tag.Root>
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
        cell: ({ row }) => (
          <span className='text-paragraph-sm whitespace-nowrap text-text-sub-500'>
            {row.original.due_date || '—'}
          </span>
        ),
        meta: columnMeta('due_date'),
      },
      {
        id: 'status',
        accessorKey: 'status',
        columnLabel: 'Status',
        header: ({ column }) => (
          <ProjectDetailSortableColumnHeader column={column} label='Status' />
        ),
        cell: ({ row }) => (
          <StopPropagation className={PROJECT_DETAIL_INLINE_CELL}>
            <ProjectStatusDropdown
              className='w-full -ml-2'
              value={row.original.status}
              onValueChange={(value) => onFieldUpdate?.(row.original.id, 'status', value)}
              statusOptions={statusOptions}
              statusMetaMap={statusMetaMap}
              size='xsmall'
            />
          </StopPropagation>
        ),
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
        cell: ({ row }) => (
          <Badge.Root
            size='small'
            variant='light'
            color={colorForProjectTaskPriority(row.original.priority)}
            className='text-nowrap'
          >
            {String(row.original.priority ?? 'Medium').toUpperCase()}
          </Badge.Root>
        ),
        meta: columnMeta('priority'),
      },
    ],
    [
      categories,
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
      className={PROJECT_DETAIL_WIDE_TABLE_ROOT_CLASS}
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
