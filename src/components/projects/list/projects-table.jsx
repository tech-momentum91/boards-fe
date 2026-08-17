import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import * as Badge from '@/components/ui/badge';
import * as Select from '@/components/ui/select';
import * as Table from '@/components/ui/table';
import { applyColumnConfig } from '@/lib/column-utils';
import { cn } from '@/utils/cn';
import { PROJECT_COLUMN_WIDTHS } from '@/components/projects/constants';
import { colorForProjectStage, formatProjectCell } from '@/components/projects/shared';
import { formatDateDisplay } from '@/utils/date-utils';

function SortableColumnHeader({ column, label }) {
  const sortState = column.getIsSorted();
  return (
    <div className='flex items-center gap-0.5'>
      <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>{label}</span>
      <button
        type='button'
        className='flex cursor-pointer items-center justify-center transition-colors hover:text-text-strong-950'
        onClick={() => column.toggleSorting(sortState === 'asc')}
        aria-label={`Sort by ${label} ${sortState === 'asc' ? 'descending' : 'ascending'}`}
      >
        {Table.getSortingIcon(sortState)}
      </button>
    </div>
  );
}

function StaticColumnHeader({ label }) {
  return (
    <div className='flex items-center gap-0.5'>
      <span className='text-paragraph-sm whitespace-nowrap text-text-sub-600'>{label}</span>
    </div>
  );
}

function StageBadge({ stage, label }) {
  const display = label || stage;
  if (!display) {
    return <span className='text-paragraph-xs text-text-sub-500'>—</span>;
  }

  return (
    <Badge.Root
      size='small'
      variant='light'
      color={colorForProjectStage(display)}
      className='uppercase'
    >
      {display}
    </Badge.Root>
  );
}

function StageSelectCell({ value, options = [], onChange, disabled = false }) {
  const stageValue = value || '';
  const hasOption = options.some((option) => option.value === stageValue);
  const resolvedOptions =
    stageValue && !hasOption ? [...options, { value: stageValue, label: stageValue }] : options;
  const stageLabel =
    resolvedOptions.find((option) => option.value === stageValue)?.label ?? stageValue;

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Select.Root
        size='xsmall'
        variant='borderless'
        value={stageValue || undefined}
        onValueChange={onChange}
        disabled={disabled}
      >
        <Select.Trigger className='h-8 w-fit max-w-full px-2' showArrow={false}>
          <Select.Value placeholder='Select'>
            <StageBadge stage={stageValue} label={stageLabel} />
          </Select.Value>
        </Select.Trigger>
        <Select.Content className='min-w-[120px]'>
          {resolvedOptions.map((option) => (
            <Select.Item key={option.value} value={option.value}>
              <StageBadge stage={option.value} label={option.label} />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </div>
  );
}

function TextCell({ value, strong = false }) {
  return (
    <span
      className={cn(
        'block truncate text-paragraph-sm whitespace-nowrap',
        strong ? 'font-medium text-text-strong-950' : 'text-text-sub-500',
      )}
    >
      {formatProjectCell(value)}
    </span>
  );
}

export default function ProjectsTable({
  rows = [],
  columnConfig = [],
  sorting: sortingFromParent = [],
  onSortingChange,
  onRowClick,
  stageOptions = [],
  onStageChange,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  enableScrollPagination = false,
  variant = 'compact',
}) {
  const [localSorting, setLocalSorting] = useState(sortingFromParent);
  const [updatingStageId, setUpdatingStageId] = useState('');

  useEffect(() => {
    setLocalSorting(sortingFromParent);
  }, [sortingFromParent]);

  const handleSortingChange = useCallback(
    (updaterOrValue) => {
      const nextSorting =
        typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;
      setLocalSorting(nextSorting);
      onSortingChange?.(nextSorting);
    },
    [localSorting, onSortingChange],
  );

  const handleStageChange = useCallback(
    async (project, nextStage) => {
      const projectId = project?.name;
      if (!projectId || !onStageChange) return;
      if (String(project?.custom_project_stage ?? '') === String(nextStage ?? '')) return;

      setUpdatingStageId(projectId);
      try {
        await onStageChange(projectId, nextStage);
      } finally {
        setUpdatingStageId('');
      }
    },
    [onStageChange],
  );

  const allColumnDefs = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'project_name',
        columnLabel: 'Name',
        enableHiding: false,
        header: () => <StaticColumnHeader label='Name' />,
        cell: ({ row }) => <TextCell value={row.original.project_name} strong />,
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.name, 'whitespace-nowrap') },
      },
      {
        id: 'account',
        accessorKey: 'crm_account_name',
        columnLabel: 'Account',
        header: () => <StaticColumnHeader label='Account' />,
        cell: ({ row }) => (
          <TextCell value={row.original.crm_account_name ?? row.original.customer_name} />
        ),
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.account, 'whitespace-nowrap') },
      },
      {
        id: 'stage',
        accessorKey: 'custom_project_stage',
        columnLabel: 'Stage',
        header: ({ column }) => <SortableColumnHeader column={column} label='Stage' />,
        cell: ({ row }) => {
          const project = row.original;
          if (!onStageChange) {
            return <StageBadge stage={project.custom_project_stage} />;
          }

          return (
            <StageSelectCell
              value={project.custom_project_stage}
              options={stageOptions}
              disabled={updatingStageId === project.name}
              onChange={(value) => handleStageChange(project, value)}
            />
          );
        },
        enableSorting: true,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.stage, 'whitespace-nowrap') },
      },
      {
        id: 'city',
        accessorKey: 'custom_city',
        columnLabel: 'City',
        header: ({ column }) => <SortableColumnHeader column={column} label='City' />,
        cell: ({ row }) => <TextCell value={row.original.custom_city} />,
        enableSorting: true,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.city, 'whitespace-nowrap') },
      },
      {
        id: 'parent_project',
        accessorKey: 'parent_project',
        columnLabel: 'Parent Project',
        header: () => <StaticColumnHeader label='Parent Project' />,
        cell: ({ row }) => <TextCell value={row.original.parent_project} />,
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.parent_project, 'whitespace-nowrap') },
      },
      {
        id: 'design_start',
        accessorKey: 'custom_design_start_date',
        columnLabel: 'Design Start',
        header: ({ column }) => <SortableColumnHeader column={column} label='Design Start' />,
        cell: ({ row }) => (
          <TextCell value={formatDateDisplay(row.original.custom_design_start_date)} />
        ),
        enableSorting: true,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.design_start, 'whitespace-nowrap') },
      },
      {
        id: 'design_end',
        accessorKey: 'custom_design_end_date',
        columnLabel: 'Design End',
        header: ({ column }) => <SortableColumnHeader column={column} label='Design End' />,
        cell: ({ row }) => (
          <TextCell value={formatDateDisplay(row.original.custom_design_end_date)} />
        ),
        enableSorting: true,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.design_end, 'whitespace-nowrap') },
      },
      {
        id: 'project_start',
        accessorKey: 'custom_project_start_date',
        columnLabel: 'Project Start',
        header: ({ column }) => <SortableColumnHeader column={column} label='Project Start' />,
        cell: ({ row }) => (
          <TextCell value={formatDateDisplay(row.original.custom_project_start_date)} />
        ),
        enableSorting: true,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.project_start, 'whitespace-nowrap') },
      },
      {
        id: 'project_end',
        accessorKey: 'custom_project_end_date',
        columnLabel: 'Project End',
        header: ({ column }) => <SortableColumnHeader column={column} label='Project End' />,
        cell: ({ row }) => (
          <TextCell value={formatDateDisplay(row.original.custom_project_end_date)} />
        ),
        enableSorting: true,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.project_end, 'whitespace-nowrap') },
      },
      {
        id: 'carpet_area',
        accessorKey: 'custom_carpet_area',
        columnLabel: 'Carpet Area',
        header: ({ column }) => <SortableColumnHeader column={column} label='Carpet Area' />,
        cell: ({ row }) => <TextCell value={row.original.custom_carpet_area} />,
        enableSorting: true,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.carpet_area, 'whitespace-nowrap') },
      },
      {
        id: 'project_director',
        accessorKey: 'project_director',
        columnLabel: 'Project Director',
        header: () => <StaticColumnHeader label='Project Director' />,
        cell: ({ row }) => <TextCell value={row.original.project_director} />,
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.project_director, 'whitespace-nowrap') },
      },
      {
        id: 'execution_team',
        accessorKey: 'execution_team',
        columnLabel: 'Execution Team',
        header: () => <StaticColumnHeader label='Execution Team' />,
        cell: ({ row }) => <TextCell value={row.original.execution_team} />,
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.execution_team, 'whitespace-nowrap') },
      },
      {
        id: 'floors',
        accessorKey: 'floors',
        columnLabel: 'Floors',
        header: () => <StaticColumnHeader label='Floors' />,
        cell: ({ row }) => <TextCell value={row.original.floors} />,
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.floors, 'whitespace-nowrap') },
      },
      {
        id: 'crm',
        accessorKey: 'crm',
        columnLabel: 'CRM',
        header: () => <StaticColumnHeader label='CRM' />,
        cell: ({ row }) => <TextCell value={row.original.crm} />,
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.crm, 'whitespace-nowrap') },
      },
      {
        id: 'sales',
        accessorKey: 'sales',
        columnLabel: 'Sales',
        header: () => <StaticColumnHeader label='Sales' />,
        cell: ({ row }) => <TextCell value={row.original.sales} />,
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.sales, 'whitespace-nowrap') },
      },
      {
        id: 'interior_designer',
        accessorKey: 'interior_designer',
        columnLabel: 'Interior Designer',
        header: () => <StaticColumnHeader label='Interior Designer' />,
        cell: ({ row }) => <TextCell value={row.original.interior_designer} />,
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.interior_designer, 'whitespace-nowrap') },
      },
      {
        id: 'design_lead',
        accessorKey: 'design_lead',
        columnLabel: 'Design Lead',
        header: () => <StaticColumnHeader label='Design Lead' />,
        cell: ({ row }) => <TextCell value={row.original.design_lead} />,
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.design_lead, 'whitespace-nowrap') },
      },
      {
        id: 'execution_lead',
        accessorKey: 'execution_lead',
        columnLabel: 'Execution Lead',
        header: () => <StaticColumnHeader label='Execution Lead' />,
        cell: ({ row }) => <TextCell value={row.original.execution_lead} />,
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.execution_lead, 'whitespace-nowrap') },
      },
      {
        id: 'purchase',
        accessorKey: 'purchase',
        columnLabel: 'Purchase',
        header: () => <StaticColumnHeader label='Purchase' />,
        cell: ({ row }) => <TextCell value={row.original.purchase} />,
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.purchase, 'whitespace-nowrap') },
      },
      {
        id: 'safety_officer',
        accessorKey: 'safety_officer',
        columnLabel: 'Safety Officer',
        header: () => <StaticColumnHeader label='Safety Officer' />,
        cell: ({ row }) => <TextCell value={row.original.safety_officer} />,
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.safety_officer, 'whitespace-nowrap') },
      },
      {
        id: 'graphics',
        accessorKey: 'graphics',
        columnLabel: 'Graphics',
        header: () => <StaticColumnHeader label='Graphics' />,
        cell: ({ row }) => <TextCell value={row.original.graphics} />,
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.graphics, 'whitespace-nowrap') },
      },
      {
        id: 'documentation_incharge',
        accessorKey: 'documentation_incharge',
        columnLabel: 'Documentation Incharge',
        header: () => <StaticColumnHeader label='Documentation Incharge' />,
        cell: ({ row }) => <TextCell value={row.original.documentation_incharge} />,
        enableSorting: false,
        meta: {
          headClassName: cn(PROJECT_COLUMN_WIDTHS.documentation_incharge, 'whitespace-nowrap'),
        },
      },
      {
        id: 'gfc',
        accessorKey: 'gfc',
        columnLabel: 'GFC',
        header: () => <StaticColumnHeader label='GFC' />,
        cell: ({ row }) => <TextCell value={row.original.gfc} />,
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.gfc, 'whitespace-nowrap') },
      },
      {
        id: 'mepf',
        accessorKey: 'mepf',
        columnLabel: 'MEPF',
        header: () => <StaticColumnHeader label='MEPF' />,
        cell: ({ row }) => <TextCell value={row.original.mepf} />,
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.mepf, 'whitespace-nowrap') },
      },
      {
        id: 'boq_lead',
        accessorKey: 'boq_lead',
        columnLabel: 'BOQ Lead',
        header: () => <StaticColumnHeader label='BOQ Lead' />,
        cell: ({ row }) => <TextCell value={row.original.boq_lead} />,
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.boq_lead, 'whitespace-nowrap') },
      },
      {
        id: 'billing_lead',
        accessorKey: 'billing_lead',
        columnLabel: 'Billing Lead',
        header: () => <StaticColumnHeader label='Billing Lead' />,
        cell: ({ row }) => <TextCell value={row.original.billing_lead} />,
        enableSorting: false,
        meta: { headClassName: cn(PROJECT_COLUMN_WIDTHS.billing_lead, 'whitespace-nowrap') },
      },
    ],
    [handleStageChange, onStageChange, stageOptions, updatingStageId],
  );

  const visibleDefs = useMemo(
    () => applyColumnConfig(allColumnDefs, columnConfig),
    [allColumnDefs, columnConfig],
  );

  const table = useReactTable({
    data: rows,
    columns: visibleDefs,
    state: { sorting: localSorting },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    enableSortingRemoval: true,
  });

  const { sentinelRef } = useScrollPagination({
    onLoadMore: onLoadMore || (() => {}),
    hasMore: hasMore && enableScrollPagination,
    isLoading: isLoadingMore || isLoading,
    threshold: 200,
    enabled: enableScrollPagination && Boolean(onLoadMore),
  });

  if (!isLoading && rows.length === 0) {
    return (
      <div className='flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
        <p className='text-label-md text-text-strong-950'>No projects found</p>
        <p className='mt-1 text-paragraph-sm text-text-sub-500'>
          Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  const renderSkeleton = () => (
    <Table.Body spacing={4}>
      {Array.from({ length: 6 }).map((_, index, array) => (
        <React.Fragment key={`skeleton-${index}`}>
          <Table.Row>
            {visibleDefs.map((column) => (
              <Table.Cell key={column.id || column.accessorKey}>
                <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
              </Table.Cell>
            ))}
          </Table.Row>
          {index < array.length - 1 ? <Table.RowDivider /> : null}
        </React.Fragment>
      ))}
    </Table.Body>
  );

  const hasRows = table.getRowModel().rows.length > 0;

  return (
    <div className='w-full overflow-x-auto'>
      <Table.Root variant={variant} className='min-w-[1120px]'>
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
        {isLoading && !hasRows ? (
          renderSkeleton()
        ) : (
          <Table.Body spacing={4}>
            {table.getRowModel().rows.map((row) => (
              <React.Fragment key={row.id}>
                <Table.Row
                  className={cn(onRowClick && 'cursor-pointer')}
                  onClick={() => onRowClick?.(row.original)}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(event) => {
                    if (!onRowClick) return;
                    if (event.key === 'Enter' || event.key === ' ') onRowClick(row.original);
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
            {enableScrollPagination && hasMore ? (
              <Table.Row ref={sentinelRef} data-scroll-sentinel>
                <Table.Cell colSpan={visibleDefs.length} className='h-1 p-0' />
              </Table.Row>
            ) : null}
            {isLoadingMore
              ? Array.from({ length: 2 }).map((_, index) => (
                  <React.Fragment key={`loading-more-${index}`}>
                    <Table.Row>
                      {visibleDefs.map((column) => (
                        <Table.Cell key={column.id} className={column.meta?.cellClassName}>
                          <div className='h-4 w-full animate-pulse rounded bg-bg-soft-200' />
                        </Table.Cell>
                      ))}
                    </Table.Row>
                    <Table.RowDivider />
                  </React.Fragment>
                ))
              : null}
          </Table.Body>
        )}
      </Table.Root>
    </div>
  );
}
