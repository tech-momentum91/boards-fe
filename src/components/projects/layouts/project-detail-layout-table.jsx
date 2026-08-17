import React, { useMemo, useState } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  PROJECT_DETAIL_INLINE_CELL,
  PROJECT_DETAIL_INLINE_AREA_TRIGGER_CLASS,
  PROJECT_DETAIL_INLINE_FIELD_CLASS,
  PROJECT_DETAIL_INLINE_TRIGGER_CLASS,
  PROJECT_DETAIL_TABLE_ROOT_CLASS,
  projectDetailColumnMeta,
} from '@/components/projects/shared/project-detail-table-layout';
import ProjectDetailSortableColumnHeader from '@/components/projects/shared/project-detail-sortable-column-header';
import {
  projectDetailDateSortingFn,
  projectDetailDueDateAccessor,
  projectDetailPrioritySortingFn,
} from '@/components/projects/shared/project-detail-table-sorting';
import * as Badge from '@/components/ui/badge';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import ProjectFloorVersionSyncAction from '@/components/projects/shared/project-floor-version-sync-action';
import ProjectTaskTitleCell from '@/components/projects/shared/project-task-title-cell';
import * as Tooltip from '@/components/ui/tooltip';
import { Datepicker } from '@/components/ui/datepicker';
import ProjectStatusDropdown from '@/components/projects/shared/project-status-dropdown';
import * as Select from '@/components/ui/select';
import * as Table from '@/components/ui/table';
import * as Tag from '@/components/ui/tag';
import { applyColumnConfig } from '@/lib/column-utils';
import { getProjectFloorSelectOptions } from '@/components/projects/shared';
import {
  getLayoutListVersionLabel,
  getLayoutVersionBadgeColor,
  getLayoutVersionIndentClass,
  resolveLayoutVersionKind,
} from '@/components/projects/layouts/project-layout-helpers';
import { normalizeProjectTaskAssigneeForSelect } from '@/components/projects/tasks/project-task-helpers';
import {
  PROJECT_DETAIL_LAYOUT_COLUMN_WIDTHS,
  PROJECT_DETAIL_PRIORITY_OPTIONS,
  colorForLayoutPriority,
} from '@/components/projects/constants';
import { cn } from '@/utils/cn';
import { formatToDDMMYYYY, parseToDate } from '@/utils/date-utils';

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
      <Select.Trigger className={cn('h-8 w-full px-2', className)} showArrow={false}>
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
            <Badge.Root variant='light' color={colorFn(option)} className='text-nowrap'>
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

function getLayoutVersionSubRows(row) {
  const versions = Array.isArray(row?.versions) ? row.versions : [];
  if (versions.length === 0) return [];

  const mainId = String(row?.id ?? row?.name ?? '').trim();
  const floorLockedVersion = Number(row?.floor_locked_version ?? 0);

  return versions
    .filter((version) => {
      const versionId = String(version?.id ?? version?.name ?? '').trim();
      return versionId && versionId !== mainId;
    })
    .map((version) => ({
      ...version,
      floor_locked_version: version.floor_locked_version ?? floorLockedVersion,
      version_kind: resolveLayoutVersionKind({
        ...version,
        floor_locked_version: version.floor_locked_version ?? floorLockedVersion,
      }),
    }));
}

function columnMeta(key) {
  return projectDetailColumnMeta(PROJECT_DETAIL_LAYOUT_COLUMN_WIDTHS, key, {
    fluidKeys: [],
  });
}

export default function ProjectDetailLayoutTable({
  layouts,
  groupId,
  onRowClick,
  onFieldUpdate,
  onAcknowledgeFloorVersion,
  isAcknowledgingFloorVersion = false,
  acknowledgingLayoutId = '',
  columnConfig = [],
  projectId,
  projectFloors = [],
  statusOptions = [],
  statusMetaMap = {},
}) {
  const allColumnDefs = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'title',
        columnLabel: 'Name',
        enableHiding: false,
        header: () => <ProjectDetailColumnHeader label='Name' />,
        cell: ({ row }) => {
          const layout = row.original;
          const layoutId = layout.id;
          const canExpand = row.getCanExpand?.();
          const showWarning = layout.show_warning;
          const isChildRow = row.depth > 0;
          const versionLabel = getLayoutListVersionLabel(layout, { isChildRow });
          const versionBadgeColor = getLayoutVersionBadgeColor(layout, { isChildRow });

          return (
            <div
              className={cn(
                'flex w-full min-w-0 items-center gap-2',
                isChildRow && getLayoutVersionIndentClass(layout, { isChildRow: true }),
              )}
            >
              <StopPropagation className='shrink-0'>
                <ProjectStatusDropdown
                  variant='indicator'
                  value={layout.status}
                  onValueChange={(value) => onFieldUpdate?.(layoutId, 'status', value)}
                  statusOptions={statusOptions}
                  statusMetaMap={statusMetaMap}
                  size='xsmall'
                  showArrow={false}
                />
              </StopPropagation>
              <div
                className='flex min-w-0 flex-1 items-center gap-2 overflow-hidden'
                onClick={() => onRowClick?.(groupId, layoutId)}
              >
                <div className='flex shrink-0 items-center gap-1.5'>
                  {showWarning ? (
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <Badge.Root
                          size='small'
                          variant='light'
                          color='red'
                          className='normal-case tracking-normal'
                        >
                          {versionLabel}
                        </Badge.Root>
                      </Tooltip.Trigger>
                      <Tooltip.Content className='max-w-[240px]'>
                        <p>
                          {layout.warning_reason === 'floor_version_updated'
                            ? 'The floor layout has been locked at a newer version.'
                            : 'Floor layout has been updated. Please review and update this layout.'}
                        </p>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  ) : (
                    <Badge.Root
                      size='small'
                      variant='light'
                      color={versionBadgeColor}
                      className='normal-case tracking-normal'
                    >
                      {versionLabel}
                    </Badge.Root>
                  )}
                  {layout.can_acknowledge || showWarning ? (
                    <ProjectFloorVersionSyncAction
                      showWarning={showWarning}
                      canAcknowledge={layout.can_acknowledge}
                      floorVersionOptions={layout.floor_version_options}
                      warningReason={layout.warning_reason}
                      isAcknowledging={
                        isAcknowledgingFloorVersion && acknowledgingLayoutId === layoutId
                      }
                      onAcknowledge={(floorLockedVersion) =>
                        onAcknowledgeFloorVersion?.(layout, floorLockedVersion)
                      }
                    />
                  ) : null}
                </div>
                <div className='min-w-0 flex-1 overflow-hidden'>
                  <ProjectTaskTitleCell title={layout.title} />
                </div>
              </div>
              {canExpand ? (
                <StopPropagation
                  className={cn(
                    'ml-auto shrink-0',
                    'opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100',
                  )}
                >
                  <button
                    type='button'
                    aria-label={row.getIsExpanded() ? 'Hide versions' : 'Show versions'}
                    onClick={(event) => {
                      event.stopPropagation();
                      row.getToggleExpandedHandler()(event);
                    }}
                    className='inline-flex size-7 shrink-0 items-center justify-center rounded-md text-text-sub-500 transition hover:bg-bg-weak-50 hover:text-text-strong-950'
                  >
                    <RiArrowRightSLine
                      className={cn(
                        'size-4 transition-transform',
                        row.getIsExpanded() && 'rotate-90',
                      )}
                    />
                  </button>
                </StopPropagation>
              ) : null}
            </div>
          );
        },
        enableSorting: false,
        meta: columnMeta('name'),
      },
      {
        id: 'assignee',
        accessorKey: 'assignees',
        columnLabel: 'Assignee',
        header: () => <ProjectDetailColumnHeader label='Assignee' />,
        cell: ({ row }) => {
          const layout = row.original;
          const layoutId = layout.id;
          const value = (layout.assignees ?? [])
            .map((entry) => normalizeProjectTaskAssigneeForSelect(entry))
            .filter(Boolean);

          return (
            <StopPropagation className={PROJECT_DETAIL_INLINE_CELL}>
              <AssigneeMultiSelect
                value={value}
                onBlur={(nextValue) =>
                  onFieldUpdate?.(layoutId, 'assignees', Array.isArray(nextValue) ? nextValue : [])
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
          const layout = row.original;
          const layoutId = layout.id;
          const floorOptions = getProjectFloorSelectOptions(projectFloors, layout.floor);

          return (
            <StopPropagation className={PROJECT_DETAIL_INLINE_CELL}>
              <Select.Root
                size='xsmall'
                variant='borderless'
                value={layout.floor || undefined}
                onValueChange={(value) => onFieldUpdate?.(layoutId, 'floor', value)}
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
            <div className='flex min-w-0 max-w-full items-center justify-start gap-1 overflow-hidden'>
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
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <Tag.Root variant='stroke' className='h-5 rounded-full px-2'>
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
          const layout = row.original;
          const layoutId = layout.id;
          const dateValue = parseToDate(layout.exp_end_date ?? layout.due_date) ?? undefined;

          return (
            <StopPropagation className={PROJECT_DETAIL_INLINE_CELL}>
              <Datepicker
                value={dateValue}
                onChange={(date) => onFieldUpdate?.(layoutId, 'exp_end_date', date ?? '')}
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
          const layout = row.original;
          const layoutId = layout.id;

          return (
            <StopPropagation className={PROJECT_DETAIL_INLINE_CELL}>
              <ProjectStatusDropdown
                className='w-full -ml-2'
                value={layout.status}
                onValueChange={(value) => onFieldUpdate?.(layoutId, 'status', value)}
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
          const layout = row.original;
          const priority = layout.priority || 'medium';

          return (
            <StopPropagation className={PROJECT_DETAIL_INLINE_CELL}>
              <SelectBadgeCell
                value={priority}
                options={PROJECT_DETAIL_PRIORITY_OPTIONS}
                colorFn={colorForLayoutPriority}
                onChange={(value) => onFieldUpdate?.(layout.id, 'priority', value)}
                className='-ml-2'
              />
            </StopPropagation>
          );
        },
        meta: columnMeta('priority'),
      },
    ],
    [
      acknowledgingLayoutId,
      groupId,
      isAcknowledgingFloorVersion,
      onAcknowledgeFloorVersion,
      onFieldUpdate,
      onRowClick,
      projectId,
      projectFloors,
      statusOptions,
      statusMetaMap,
    ],
  );

  const visibleDefs = useMemo(
    () => applyColumnConfig(allColumnDefs, columnConfig),
    [allColumnDefs, columnConfig],
  );

  const [expanded, setExpanded] = useState({});
  const [sorting, setSorting] = useState([]);

  const table = useReactTable({
    data: layouts,
    columns: visibleDefs,
    state: { expanded, sorting },
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    getSubRows: (row) => getLayoutVersionSubRows(row),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) => getLayoutVersionSubRows(row.original).length > 0,
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
        {table.getRowModel().rows.map((row) => {
          const isChildRow = row.depth > 0;
          return (
            <React.Fragment key={row.id}>
              <Table.Row
                className={cn('group/row cursor-pointer', isChildRow && 'bg-bg-weak-50/60')}
                onClick={() => onRowClick?.(groupId, row.original.id)}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    onRowClick?.(groupId, row.original.id);
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <Table.Cell
                    key={cell.id}
                    className={cn(cell.column.columnDef.meta?.cellClassName)}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Cell>
                ))}
              </Table.Row>
              <Table.RowDivider />
            </React.Fragment>
          );
        })}
      </Table.Body>
    </Table.Root>
  );
}
