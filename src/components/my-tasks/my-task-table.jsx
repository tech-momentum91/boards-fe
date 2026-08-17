import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import { useDispatch } from 'react-redux';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import { findScrollableParent } from '@/components/event-management/event-participants-utils';
import { useColumnConfig } from '@/hooks/use-column-config';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { applyColumnConfig } from '@/lib/column-utils';
import { fetchMyTaskListPref, saveMyTaskListPref } from '@/redux/myTaskSlice';
import { formatDateDisplay } from '@/utils/date-utils';
import { cn } from '@/utils/cn';
import {
  getTaskStatusBadgeColor,
  getTaskPriorityBadgeColor,
  getModuleStyle,
} from './my-task-constants';

const MY_TASK_TABLE_ID = 'devx-my-task';
const MY_TASK_COLUMN_MIN_WIDTH = 100;

/** Default column widths — same approach as `crm-tasks-table.jsx` / `crm-contact-tasks-table.jsx`. */
const DEFAULT_MY_TASK_COLUMN_WIDTHS = {
  title: 400,
  module: 120,
  submodule: 220,
  assignees: 120,
  center: 180,
  due_date: 140,
  status: 180,
  priority: 120,
};

/** Empty cell — matches CRM account task list (`crm-tasks-table.jsx`). */
const EMPTY_CELL_CLASS = 'text-paragraph-xs text-text-sub-500';

const TitleCell = ({ title }) => {
  if (!title || title === '-') {
    return <span className={EMPTY_CELL_CLASS}>—</span>;
  }

  return (
    <Tooltip.Provider>
      <Tooltip.Root delayDuration={200}>
        <Tooltip.Trigger asChild>
          <span className='paragraph-small block min-w-0 cursor-default truncate font-medium text-text-strong-950'>
            {title}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Content side='top' className='max-w-[400px]'>
          {title}
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

// ─── Cell helpers ─────────────────────────────────────────────────────────────
// Status / priority: AlignUI Badge variant=light — same pattern as CRM account task list.

const StatusBadge = ({ status }) => {
  if (!status || status === '--' || status === '-') {
    return <span className={EMPTY_CELL_CLASS}>—</span>;
  }
  return (
    <Badge.Root
      variant='light'
      color={getTaskStatusBadgeColor(status)}
      size='small'
      className='shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-paragraph-xs font-medium'
    >
      {String(status)}
    </Badge.Root>
  );
};

const PriorityBadge = ({ priority }) => {
  if (!priority || priority === '--' || priority === '-') {
    return <span className={EMPTY_CELL_CLASS}>—</span>;
  }
  return (
    <Badge.Root
      variant='light'
      color={getTaskPriorityBadgeColor(priority)}
      size='small'
      className='shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-paragraph-xs font-medium'
    >
      {String(priority)}
    </Badge.Root>
  );
};

const ModuleBadge = ({ module }) => {
  if (!module) return <span className='paragraph-small text-text-sub-500'>-</span>;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-paragraph-xs font-medium whitespace-nowrap',
        getModuleStyle(module),
      )}
    >
      {module}
    </span>
  );
};

const SubmoduleBadge = ({ submodule }) => {
  if (!submodule) return <span className='paragraph-small text-text-sub-500'>-</span>;
  return (
    <span className='inline-flex items-center rounded-full border border-stroke-soft-200 bg-white px-2 py-0.5 text-paragraph-xs font-medium text-text-sub-600 whitespace-nowrap'>
      {submodule}
    </span>
  );
};

const AssigneeStack = ({ assignees }) => {
  if (!Array.isArray(assignees) || assignees.length === 0) {
    return <span className='paragraph-small text-text-sub-500'>-</span>;
  }
  return (
    <div className='flex items-center gap-1'>
      {assignees.slice(0, 3).map((a, i) => (
        <CrmAccountAvatar
          key={a.email ?? a.name ?? i}
          name={a.full_name ?? a.name ?? a.email ?? '?'}
          imgSrc={a.user_image ?? a.image}
          size={24}
        />
      ))}
      {assignees.length > 3 && (
        <span className='text-paragraph-xs text-text-sub-500'>+{assignees.length - 3}</span>
      )}
    </div>
  );
};

// ─── Column definitions ────────────────────────────────────────────────────────

const STATIC_COLUMN_DEFS = [
  { id: 'title', label: 'Title', visible: true, enableHiding: false },
  { id: 'module', label: 'Module', visible: true },
  { id: 'submodule', label: 'Submodule', visible: true },
  { id: 'assignees', label: 'Assignee', visible: true },
  { id: 'center', label: 'Center', visible: true },
  { id: 'due_date', label: 'Due Date', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
];

// ─── Table component ───────────────────────────────────────────────────────────

const MyTaskTable = React.forwardRef(
  (
    {
      items = [],
      loading = false,
      loadingMore = false,
      hasMore = false,
      onLoadMore,
      /** Opens the module-specific detail drawer with the row payload (`row.original`). */
      onRowClick,
      variant = 'compact',
      /** Pushes latest column manager API to parent so toolbar can subscribe (refs alone do not re-render parents). */
      onColumnConfigBridge,
      /** Custom empty-state copy. Used by parent to surface the shared
       *  "No centers selected" card when the global filter is explicit-empty. */
      emptyTitle,
      emptyDescription,
    },
    ref,
  ) => {
    const dispatch = useDispatch();
    const tableRootRef = useRef(null);
    const [scrollContainerEl, setScrollContainerEl] = useState(null);

    const getWidth = useCallback((columnId) => DEFAULT_MY_TASK_COLUMN_WIDTHS[columnId] ?? 150, []);

    useEffect(() => {
      const next = tableRootRef.current ? findScrollableParent(tableRootRef.current) : null;
      setScrollContainerEl(next || null);
    }, [items.length, loading, loadingMore, onLoadMore]);

    const { sentinelRef } = useScrollPagination({
      onLoadMore: onLoadMore || (() => {}),
      hasMore: Boolean(hasMore && onLoadMore),
      isLoading: loadingMore || loading,
      threshold: 200,
      scrollContainer: scrollContainerEl,
      enabled: Boolean(scrollContainerEl && onLoadMore),
    });

    // ── Column config persistence ─────────────────────────────────────────────
    const handleFetchColumnConfig = useCallback(async () => {
      const data = await dispatch(fetchMyTaskListPref()).unwrap();
      if (!Array.isArray(data) || data.length === 0) return null;
      // If the saved config is missing any expected column (e.g. a newly added
      // column like "center"), discard it so useColumnConfig falls back to the
      // frontend STATIC_COLUMN_DEFS order instead of appending new cols at the end.
      const expectedIds = new Set(STATIC_COLUMN_DEFS.map((c) => c.id));
      const savedIds = new Set(data.map((c) => c.id));
      const allPresent = [...expectedIds].every((id) => savedIds.has(id));
      return allPresent ? data : null;
    }, [dispatch]);

    const handlePersistColumnConfig = useCallback(
      async (data) => {
        await dispatch(saveMyTaskListPref(data)).unwrap();
      },
      [dispatch],
    );

    // ── Default column config (derived from STATIC_COLUMN_DEFS) ───────────────
    const defaultColumnConfig = useMemo(() => {
      return STATIC_COLUMN_DEFS.map((col, index) => ({
        ...col,
        order: index,
      }));
    }, []);

    const {
      columns: columnConfig,
      visibleColumns: visibleColumnConfig,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    } = useColumnConfig(
      MY_TASK_TABLE_ID,
      defaultColumnConfig,
      handlePersistColumnConfig,
      handleFetchColumnConfig,
      { autoSave: true, debounce: 500 },
    );

    // Handlers from useColumnConfig may get new references each render; keep in a ref so
    // useImperativeHandle / parent bridge do not change every frame (avoids infinite update loops).
    const columnHandlersRef = useRef({});
    columnHandlersRef.current = {
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    };

    const buildColumnConfigHook = useCallback(
      () => ({
        columns: columnConfig,
        visibleColumns: visibleColumnConfig,
        reorderColumns: (...args) => columnHandlersRef.current.reorderColumns(...args),
        toggleColumnVisibility: (id) => columnHandlersRef.current.toggleColumnVisibility(id),
        showAllColumns: () => columnHandlersRef.current.showAllColumns(),
        hideAllColumns: () => columnHandlersRef.current.hideAllColumns(),
        resetToDefault: () => columnHandlersRef.current.resetToDefault(),
      }),
      [columnConfig, visibleColumnConfig],
    );

    // ── TanStack column defs ─────────────────────────────────────────────────
    const allColumnDefs = useMemo(
      () => [
        {
          id: 'title',
          accessorKey: 'title',
          header: 'Title',
          enableHiding: false,
          cell: ({ row }) => <TitleCell title={row.original.title} />,
        },
        {
          id: 'module',
          accessorKey: 'module',
          header: 'Module',
          cell: ({ row }) => (
            <div className='min-w-0 overflow-hidden'>
              <ModuleBadge module={row.original.module} />
            </div>
          ),
        },
        {
          id: 'submodule',
          accessorKey: 'submodule',
          header: 'Submodule',
          cell: ({ row }) => (
            <div className='min-w-0 overflow-hidden'>
              <SubmoduleBadge submodule={row.original.submodule} />
            </div>
          ),
        },
        {
          id: 'assignees',
          accessorKey: 'assignees',
          header: 'Assignee',
          cell: ({ row }) => <AssigneeStack assignees={row.original.assignees} />,
        },
        {
          id: 'center',
          accessorKey: 'center',
          header: 'Center',
          cell: ({ row }) => (
            <span className='paragraph-small block min-w-0 truncate text-text-sub-600'>
              {row.original.center || '-'}
            </span>
          ),
        },
        {
          id: 'due_date',
          accessorKey: 'due_date',
          header: 'Due Date',
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {formatDateDisplay(row.original.due_date)}
            </span>
          ),
        },
        {
          id: 'status',
          accessorKey: 'status',
          header: 'Status',
          cell: ({ row }) => (
            <div className='min-w-0 overflow-hidden'>
              <StatusBadge status={row.original.status} />
            </div>
          ),
        },
        {
          id: 'priority',
          accessorKey: 'priority',
          header: 'Priority',
          cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
        },
      ],
      [],
    );

    const columns = useMemo(
      () => applyColumnConfig(allColumnDefs, columnConfig),
      [allColumnDefs, columnConfig],
    );

    const table = useReactTable({
      data: items,
      columns,
      getCoreRowModel: getCoreRowModel(),
    });

    const tableMinWidth = useMemo(
      () => columns.reduce((sum, col) => sum + getWidth(col.id), 0),
      [columns, getWidth],
    );

    // Stable fingerprint: same data even if columnConfig array identity changes each render.
    const columnConfigSig = JSON.stringify(
      columnConfig?.map((c) => ({
        id: c.id,
        visible: c.visible,
        order: c.order,
        label: c.label,
      })) ?? [],
    );

    // ── Expose columnConfigHook via ref + parent bridge (toolbar needs live config) ──
    React.useImperativeHandle(
      ref,
      () => ({
        columnConfigHook: buildColumnConfigHook(),
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps -- stable sig only; avoid ref churn
      [columnConfigSig],
    );

    useEffect(() => {
      if (!onColumnConfigBridge) return;
      onColumnConfigBridge(buildColumnConfigHook());
      // eslint-disable-next-line react-hooks/exhaustive-deps -- bridge when sig changes only
    }, [columnConfigSig, onColumnConfigBridge]);

    const hasRows = table.getRowModel().rows.length > 0;

    const renderSkeleton = () => (
      <Table.Body>
        {Array.from({ length: 8 }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <React.Fragment key={i}>
            <Table.Row>
              {columns.map((col) => (
                <Table.Cell key={col.id}>
                  <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                </Table.Cell>
              ))}
            </Table.Row>
            {i < 7 && <Table.RowDivider />}
          </React.Fragment>
        ))}
      </Table.Body>
    );

    return (
      <div ref={tableRootRef} className='flex min-h-0 w-full flex-1 flex-col'>
        <Table.Root
          variant={variant}
          tableInstance={table}
          className='min-h-0 flex-1 overflow-auto'
          style={{ tableLayout: 'fixed', width: tableMinWidth, minWidth: tableMinWidth }}
        >
          <Table.Header className='sticky top-0 z-30 bg-bg-weak-50'>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id} className='bg-bg-weak-50'>
                {headerGroup.headers.map((header) => (
                  <Table.Head
                    key={header.id}
                    column={header.column}
                    className='px-4 label-small font-medium text-text-sub-600 whitespace-nowrap'
                    style={{
                      width: getWidth(header.column.id),
                      minWidth: MY_TASK_COLUMN_MIN_WIDTH,
                    }}
                  >
                    <div className='flex min-w-0 items-center'>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  </Table.Head>
                ))}
              </Table.Row>
            ))}
          </Table.Header>

          {loading && !hasRows ? (
            renderSkeleton()
          ) : (
            <Table.Body>
              {table.getRowModel().rows.map((row, rowIndex, allRows) => (
                <React.Fragment key={row.id}>
                  <Table.Row
                    className={cn('hover:bg-bg-weak-50', onRowClick && 'cursor-pointer')}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell
                        key={cell.id}
                        column={cell.column}
                        className='px-4 align-middle'
                        style={{
                          width: getWidth(cell.column.id),
                          minWidth: MY_TASK_COLUMN_MIN_WIDTH,
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                  {rowIndex < allRows.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))}

              {hasMore && (
                <Table.Row ref={sentinelRef} data-scroll-sentinel>
                  <Table.Cell colSpan={columns.length} className='h-1 p-0' />
                </Table.Row>
              )}

              {loadingMore && (
                <Table.Row>
                  <Table.Cell colSpan={columns.length} className='py-4 text-center'>
                    <span className='paragraph-small text-text-sub-500'>Loading more...</span>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          )}
        </Table.Root>

        {!loading && !hasRows && (
          <div className='flex flex-col items-center justify-center py-16 text-center'>
            <p className='text-paragraph-sm text-text-sub-500'>{emptyTitle || 'No tasks found'}</p>
            <p className='text-paragraph-xs text-text-sub-400 mt-1'>
              {emptyDescription || 'Try adjusting the filters or tab selection.'}
            </p>
          </div>
        )}
      </div>
    );
  },
);

MyTaskTable.displayName = 'MyTaskTable';

export default MyTaskTable;
