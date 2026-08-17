import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useDispatch } from 'react-redux';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
import CircularProgress from '@/components/ui/circular-progress';
import { cn } from '@/utils/cn';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import { getAclTaskColumnPreferences, saveAclTaskColumnPreferences } from '@/redux/settingSlice';
import {
  LIFECYCLE_STAGE_BADGE_MAP,
  TASK_COLUMN_MIN_WIDTH,
  TASK_COLUMN_MAX_WIDTH,
  DEFAULT_TASK_COLUMN_WIDTHS,
} from './constants';

const CRM_CONTACT_TASKS_TABLE_ID = 'crm-contact-tasks';

const getTaskProgress = (status) => {
  if (!status) {
    return { percentage: 0, color: 'gray' };
  }

  const normalized = String(status).toLowerCase();

  if (normalized === 'completed') {
    return { percentage: 100, color: 'green' };
  }

  if (normalized === 'ongoing') {
    return { percentage: 60, color: 'blue' };
  }

  // Pending / default
  return { percentage: 25, color: 'orange' };
};

const normalizeAssignees = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
};

/** Shared pill class matching crm-task-master / crm-tasks-table-common: compact, bordered. */
const PILL_CLASS =
  'inline-flex items-center rounded-full px-2 py-0.5 text-paragraph-xs font-medium text-text-sub-600 border border-stroke-soft-200';

const EMPTY_CELL_CLASS = 'text-paragraph-xs text-text-sub-500';

const LifecyclePill = ({ stage }) => {
  if (!stage || stage === '--' || stage === '-') {
    return <span className={EMPTY_CELL_CLASS}>—</span>;
  }

  const normalizedKey = String(stage || '')
    .toLowerCase()
    .trim();
  const info = LIFECYCLE_STAGE_BADGE_MAP[normalizedKey] || {
    color: 'gray',
    label: stage,
  };

  if (info.color === 'gray') {
    return <span className={PILL_CLASS}>{info.label}</span>;
  }

  return (
    <Badge.Root
      variant='light'
      color={info.color}
      size='small'
      className='rounded-full px-2 py-0.5 text-paragraph-xs font-medium'
    >
      {info.label}
    </Badge.Root>
  );
};

/** Single-value pill (Type, Lifecycle Stage Status) — matches crm-task-master. */
const SinglePill = ({ value }) => {
  if (value == null || value === '' || value === '--' || value === '-') {
    return <span className={EMPTY_CELL_CLASS}>—</span>;
  }
  const display = typeof value === 'string' ? value : String(value);
  return <span className={PILL_CLASS}>{display}</span>;
};

/** Tags list — original styling (unchanged). */
const PillList = ({ values }) => {
  const list = (Array.isArray(values) ? values : [values]).filter(
    (v) => v && v !== '--' && v !== '-',
  );

  if (list.length === 0) {
    return <span className='paragraph-small p-3 text-text-sub-600'>--</span>;
  }

  const visibleTags = list.slice(0, 2);
  const remainingTags = list.slice(2);

  return (
    <div className='flex flex-nowrap items-center gap-1.5 py-0.5 transition-opacity hover:opacity-80'>
      {visibleTags.map((item, index) => (
        <Badge.Root
          key={`${item}-${index}`}
          variant='stroke'
          className='shrink-0 border-stroke-soft-200 bg-white px-2 text-[10px] font-medium uppercase tracking-wider text-text-sub-500'
        >
          {item}
        </Badge.Root>
      ))}
      {remainingTags.length > 0 && (
        <Tooltip.Provider>
          <Tooltip.Root delayDuration={200}>
            <Tooltip.Trigger asChild>
              <Badge.Root
                variant='stroke'
                className='shrink-0 border-stroke-soft-200 bg-white px-2 text-[10px] font-medium uppercase tracking-wider text-text-sub-500 cursor-default'
              >
                +{remainingTags.length}
              </Badge.Root>
            </Tooltip.Trigger>
            <Tooltip.Content
              side='top'
              className='max-w-[250px] bg-white border border-stroke-soft-200 shadow-lg p-2 rounded-lg'
            >
              <div className='flex flex-wrap gap-1.5'>
                {remainingTags.map((tag, index) => (
                  <Badge.Root
                    key={index}
                    variant='stroke'
                    className='shrink-0 border-stroke-soft-200 bg-white px-2 text-[10px] font-medium uppercase tracking-wider text-text-sub-500'
                  >
                    {tag}
                  </Badge.Root>
                ))}
              </div>
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      )}
    </div>
  );
};

const CrmContactTasksTable = React.forwardRef(
  (
    {
      rows = [],
      isLoading = false,
      error = null,
      onRetry,
      onRowClick,
      variant = 'compact',
      onAssigneeChange,
      react_table_id = CRM_CONTACT_TASKS_TABLE_ID,
      onColumnConfigChange,
      columnWidths: columnWidthsProperty = null,
      onColumnResize = null,
      resizeEnabled = true,
    },
    ref,
  ) => {
    const dispatch = useDispatch();
    const data = Array.isArray(rows) ? rows : [];
    const [sorting, setSorting] = useState([]);
    const [resizing, setResizing] = useState(null);
    const resizingRef = useRef(null);
    const liveWidthRef = useRef(null);
    const sentinelRef = useRef(null);

    // console.log("data is",data);

    const handleSortingChange = useCallback(
      (updaterOrValue) => {
        const next =
          typeof updaterOrValue === 'function' ? updaterOrValue(sorting) : updaterOrValue;
        setSorting(next);
      },
      [sorting],
    );

    // ── Column widths ─────────────────────────────────────────────────────────
    const [internalColumnWidths, setInternalColumnWidths] = useState(DEFAULT_TASK_COLUMN_WIDTHS);
    const columnWidths = useMemo(() => {
      if (columnWidthsProperty && typeof columnWidthsProperty === 'object') {
        return { ...DEFAULT_TASK_COLUMN_WIDTHS, ...columnWidthsProperty };
      }
      return { ...DEFAULT_TASK_COLUMN_WIDTHS, ...internalColumnWidths };
    }, [columnWidthsProperty, internalColumnWidths]);
    const useExternalWidths = columnWidthsProperty != null;

    const getWidth = useCallback(
      (columnId) => {
        const w = resizing?.columnId === columnId ? resizing.liveWidth : columnWidths[columnId];
        return typeof w === 'number'
          ? Math.min(TASK_COLUMN_MAX_WIDTH, Math.max(TASK_COLUMN_MIN_WIDTH, w))
          : (DEFAULT_TASK_COLUMN_WIDTHS[columnId] ?? 150);
      },
      [columnWidths, resizing],
    );

    const effectiveOnColumnResize = resizeEnabled && onColumnResize ? onColumnResize : null;

    const handlePersistAclTaskColumns = useCallback(
      async (cols) => {
        await dispatch(saveAclTaskColumnPreferences({ columns: cols, react_table_id })).unwrap();
      },
      [dispatch, react_table_id],
    );

    const handleFetchAclTaskColumns = useCallback(async () => {
      const result = await dispatch(getAclTaskColumnPreferences({ react_table_id })).unwrap();
      return result?.message ?? result?.data ?? result ?? [];
    }, [dispatch, react_table_id]);

    const handleResizeStart = useCallback(
      (columnId, startX) => {
        const startWidth = columnWidths[columnId] ?? DEFAULT_TASK_COLUMN_WIDTHS[columnId] ?? 150;
        const clamped = Math.min(
          TASK_COLUMN_MAX_WIDTH,
          Math.max(TASK_COLUMN_MIN_WIDTH, startWidth),
        );
        setResizing({ columnId, startX, startWidth: clamped, liveWidth: clamped });
        resizingRef.current = { columnId, startX, startWidth: clamped };
        liveWidthRef.current = clamped;
      },
      [columnWidths],
    );

    useEffect(() => {
      const onMouseMove = (e) => {
        if (!resizingRef.current) return;
        const delta = e.clientX - resizingRef.current.startX;
        let next = resizingRef.current.startWidth + delta;
        next = Math.max(TASK_COLUMN_MIN_WIDTH, Math.min(TASK_COLUMN_MAX_WIDTH, next));
        liveWidthRef.current = next;
        setResizing((previous) => (previous ? { ...previous, liveWidth: next } : null));
      };

      const onMouseUp = () => {
        if (resizingRef.current && liveWidthRef.current != null) {
          const finalWidth = Math.max(
            TASK_COLUMN_MIN_WIDTH,
            Math.min(TASK_COLUMN_MAX_WIDTH, liveWidthRef.current),
          );
          if (effectiveOnColumnResize) {
            effectiveOnColumnResize(resizingRef.current.columnId, finalWidth);
          } else {
            setInternalColumnWidths((previous) => ({
              ...previous,
              [resizingRef.current.columnId]: finalWidth,
            }));
          }
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
    }, [resizing, effectiveOnColumnResize]);

    const allColumnDefs = useMemo(
      () => [
        {
          id: 'task',
          accessorKey: 'task',
          header: ({ column }) => <Table.SortableHeader column={column} label='Task' sortable />,
          enableSorting: true,
          cell: ({ row }) => {
            const { status, task } = row.original;
            const progress = getTaskProgress(status);

            return (
              <div className='flex items-center gap-3'>
                <CircularProgress
                  percentage={progress.percentage}
                  color={progress.color}
                  size={18}
                />
                <Tooltip.Provider>
                  <Tooltip.Root delayDuration={200}>
                    <Tooltip.Trigger asChild>
                      <span className='paragraph-small font-medium text-text-strong-950 truncate max-w-[300px] block cursor-default'>
                        {task || '--'}
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content side='top' className='max-w-[300px]'>
                      {task}
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </div>
            );
          },
        },
        {
          id: 'assignee',
          accessorKey: 'assignee',
          header: () => <span className='text-paragraph-sm text-text-sub-600'>Assignee</span>,
          enableSorting: false,
          cell: ({ row }) => {
            return (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <AssigneeMultiSelect
                  value={normalizeAssignees(row.original.assignee)}
                  onBlur={(values) => {
                    onAssigneeChange?.(
                      row.original.id,
                      values,
                      normalizeAssignees(row.original.assignee),
                    );
                  }}
                  disabled={false}
                  placeholder='Select assignees'
                  maxVisibleAvatars={3}
                  internalOnly={false}
                />
              </div>
            );
          },
        },
        {
          id: 'type',
          accessorKey: 'type',
          header: ({ column }) => <Table.SortableHeader column={column} label='Type' sortable />,
          enableSorting: true,
          cell: ({ row }) => <SinglePill value={row.original.type} />,
        },
        {
          id: 'lifecycle_stage',
          accessorKey: 'lifecycle_stage',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Lifecycle Stage' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => <LifecyclePill stage={row.original.lifecycle_stage} />,
        },
        {
          id: 'lifecycle_stage_status',
          accessorKey: 'lifecycle_stage_status',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Lifecycle Stage Status' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => <SinglePill value={row.original.lifecycle_stage_status} />,
        },
        {
          id: 'due_date',
          accessorKey: 'due_date',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Due Date' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {row.original.due_date || '--'}
            </span>
          ),
        },
        {
          id: 'tags',
          accessorKey: 'tags',
          header: ({ column }) => <Table.SortableHeader column={column} label='Tags' sortable />,
          enableSorting: false,
          cell: ({ row }) => {
            return <PillList values={row.original.tags} />;
          },
        },
        {
          id: 'priority',
          accessorKey: 'priority',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Priority' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => {
            const { priority } = row.original;
            if (!priority || priority === '--' || priority === '-') {
              return <span className={EMPTY_CELL_CLASS}>—</span>;
            }

            const normalized = String(priority).toLowerCase();
            const color = { low: 'green', medium: 'orange', high: 'red' }[normalized] || 'gray';

            return (
              <Badge.Root
                variant='light'
                color={color}
                size='small'
                className='rounded-full px-2 py-0.5 text-paragraph-xs font-medium'
              >
                {String(priority)}
              </Badge.Root>
            );
          },
        },
        {
          id: 'status',
          accessorKey: 'status',
          header: ({ column }) => <Table.SortableHeader column={column} label='Status' sortable />,
          enableSorting: true,
          cell: ({ row }) => {
            const { status } = row.original;
            if (!status || status === '--' || status === '-') {
              return <span className={EMPTY_CELL_CLASS}>—</span>;
            }

            const normalized = String(status).toLowerCase();
            const color =
              { pending: 'orange', ongoing: 'blue', completed: 'green' }[normalized] || 'gray';

            return (
              <Badge.Root
                variant='light'
                color={color}
                size='small'
                className='rounded-full px-2 py-0.5 text-paragraph-xs font-medium'
              >
                {String(status)}
              </Badge.Root>
            );
          },
        },
        {
          id: 'description',
          accessorKey: 'description',
          header: () => <span className='text-paragraph-sm text-text-sub-600'>Description</span>,
          enableSorting: false,
          cell: ({ row }) => {
            const description = row.original.description || '--';
            return (
              <Tooltip.Provider>
                <Tooltip.Root delayDuration={200}>
                  <Tooltip.Trigger asChild>
                    <span className='paragraph-small text-text-sub-600 block truncate cursor-default'>
                      {description}
                    </span>
                  </Tooltip.Trigger>
                  {description !== '--' && (
                    <Tooltip.Content side='top' className='max-w-[400px]'>
                      {description}
                    </Tooltip.Content>
                  )}
                </Tooltip.Root>
              </Tooltip.Provider>
            );
          },
        },
        {
          id: 'attachments',
          accessorKey: 'attachments',
          header: () => <span className='text-paragraph-sm text-text-sub-600'>Attachments</span>,
          enableSorting: false,
          cell: ({ row }) => {
            const raw = row.original.attachments;
            const count = Array.isArray(raw) ? raw.length : Number(raw || 0);

            if (!count) {
              return (
                <div className='pl-8'>
                  <span className='paragraph-small text-text-sub-400'>--</span>
                </div>
              );
            }
            return (
              <div className='pl-4'>
                <Badge.Root
                  variant='stroke'
                  className='shrink-0 border-stroke-soft-200 bg-white px-2 text-[10px] font-medium uppercase tracking-wider text-text-sub-500'
                >
                  {count} File{count > 1 ? 's' : ''}
                </Badge.Root>
              </div>
            );
          },
        },
        {
          id: 'created_by',
          accessorKey: 'created_by',
          header: () => <span className='text-paragraph-sm text-text-sub-600'>Created By</span>,
          enableSorting: true,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {row.original.created_by || '--'}
            </span>
          ),
        },
        {
          id: 'created_at',
          accessorKey: 'created_at',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Created At' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {row.original.created_at || '--'}
            </span>
          ),
        },
        {
          id: 'last_updated',
          accessorKey: 'last_updated',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Last Updated' sortable />
          ),
          enableSorting: true,
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-600 whitespace-nowrap'>
              {row.original.last_updated || '--'}
            </span>
          ),
        },
      ],
      [],
    );

    const defaultColumnConfig = useMemo(
      () => prepareColumnsForConfig(allColumnDefs),
      [allColumnDefs],
    );

    const {
      columns: columnConfig,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    } = useColumnConfig(
      react_table_id,
      defaultColumnConfig,
      handlePersistAclTaskColumns,
      handleFetchAclTaskColumns,
      { autoSave: true, debounce: 300 },
    );

    const columns = useMemo(
      () => applyColumnConfig(allColumnDefs, columnConfig),
      [allColumnDefs, columnConfig],
    );

    const columnConfigHook = useMemo(
      () => ({
        columns: columnConfig,
        reorderColumns,
        toggleColumnVisibility,
        showAllColumns,
        hideAllColumns,
        resetToDefault,
      }),
      [
        columnConfig,
        reorderColumns,
        toggleColumnVisibility,
        showAllColumns,
        hideAllColumns,
        resetToDefault,
      ],
    );

    useEffect(() => {
      if (onColumnConfigChange) onColumnConfigChange(columnConfigHook);
    }, [columnConfigHook, onColumnConfigChange]);

    const tableMinWidth = useMemo(
      () => columns.reduce((sum, col) => sum + getWidth(col.id), 0),
      [columns, getWidth],
    );
    const table = useReactTable({
      data,
      columns,
      state: { sorting },
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      manualSorting: false,
      enableSortingRemoval: true,
    });

    React.useImperativeHandle(ref, () => ({
      table,
      columnConfigHook,
    }));

    if (error) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>Unable to Load Tasks</h3>
          <p className='mb-4 text-sm text-error-darker/80'>
            Something went wrong loading the task list.
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className='rounded-lg bg-error-base px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error-darker'
            >
              Try Again
            </button>
          )}
        </div>
      );
    }

    if (!isLoading && data.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>No tasks</h3>
          <p className='max-w-md text-sm text-text-sub-600'>
            Create a task to start tracking work for this contact.
          </p>
        </div>
      );
    }

    const renderSkeleton = () => (
      <Table.Body>
        {Array.from({ length: 4 }).map((_, index, array) => (
          <React.Fragment key={`tasks-skeleton-${index}`}>
            <Table.Row>
              {table.getAllLeafColumns().map((column) => (
                <Table.Cell
                  key={column.id}
                  style={{ width: getWidth(column.id), minWidth: TASK_COLUMN_MIN_WIDTH }}
                >
                  <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                </Table.Cell>
              ))}
            </Table.Row>
            {index < array.length - 1 && <Table.RowDivider />}
          </React.Fragment>
        ))}
      </Table.Body>
    );

    return (
      <div className='w-full'>
        <div className='w-full overflow-x-auto'>
          <Table.Root
            variant={variant}
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
                        className='px-4 relative font-medium label-small text-text-sub-600'
                        style={{
                          width,
                          minWidth: TASK_COLUMN_MIN_WIDTH,
                          maxWidth: TASK_COLUMN_MAX_WIDTH,
                          paddingRight: '2.5rem',
                        }}
                      >
                        <div className='flex items-center gap-0.5 min-w-0'>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </div>
                        {resizeEnabled && (effectiveOnColumnResize || !useExternalWidths) && (
                          <div
                            role='separator'
                            aria-orientation='vertical'
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

            {isLoading && data.length === 0 ? (
              renderSkeleton()
            ) : (
              <Table.Body>
                {table.getRowModel().rows.map((row, rowIndex, allRowsArray) => (
                  <React.Fragment key={row.id}>
                    <Table.Row
                      onClick={() => onRowClick?.(row.original)}
                      className={cn(onRowClick ? 'cursor-pointer hover:bg-bg-weak-50' : '')}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <Table.Cell
                          key={cell.id}
                          className='align-middle px-4'
                          style={{
                            width: getWidth(cell.column.id),
                            minWidth: TASK_COLUMN_MIN_WIDTH,
                            maxWidth: TASK_COLUMN_MAX_WIDTH,
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                    {rowIndex < allRowsArray.length - 1 && <Table.RowDivider />}
                  </React.Fragment>
                ))}
              </Table.Body>
            )}
          </Table.Root>
        </div>
      </div>
    );
  },
);

CrmContactTasksTable.displayName = 'CrmContactTasksTable';

export default CrmContactTasksTable;
