import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import { fetchProjectBoqListPref, saveProjectBoqListPref } from '@/api/projectBoqs';
import {
  BOQ_COLUMN_PREF_DEBOUNCE_MS,
  PROJECT_BOQS_COLUMN_CONFIG,
  PROJECT_BOQS_COLUMN_CONFIG_TABLE_ID,
} from '@/components/boq/constants';
import { getProjectBoqTypeLabel, getProjectBoqEmptyState } from '@/components/boq/boq-helper';
import ProjectBoqRowActions from '@/components/boq/project-boqs/components/project-boq-row-actions';
import BoqListEmptyState from '@/components/boq/shared/boq-list-empty-state';
import { applyColumnConfig, prepareColumnsForConfig } from '@/lib/column-utils';
import { useColumnConfig } from '@/hooks/use-column-config';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import * as Input from '@/components/ui/input';
import * as Table from '@/components/ui/table';

const EMPTY_SORTING = [];
const SKELETON_ROW_COUNT = 6;
const LOAD_MORE_SKELETON_COUNT = 2;

export const useProjectBoqsColumnConfig = () => {
  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(PROJECT_BOQS_COLUMN_CONFIG).map((column, index) => ({
        ...column,
        order: index,
      })),
    [],
  );

  const expectedColumnIds = useMemo(
    () => new Set(defaultColumnConfig.map((column) => column.id)),
    [defaultColumnConfig],
  );

  const fetchProjectBoqColumns = useCallback(async () => {
    try {
      const data = await fetchProjectBoqListPref();
      if (!Array.isArray(data) || data.length === 0) return null;
      const savedIds = new Set(data.map((column) => column.id));
      const allPresent = [...expectedColumnIds].every((id) => savedIds.has(id));
      return allPresent ? data : null;
    } catch {
      return null;
    }
  }, [expectedColumnIds]);

  const persistProjectBoqColumns = useCallback(async (columns) => {
    await saveProjectBoqListPref(columns);
  }, []);

  return useColumnConfig(
    PROJECT_BOQS_COLUMN_CONFIG_TABLE_ID,
    defaultColumnConfig,
    persistProjectBoqColumns,
    fetchProjectBoqColumns,
    { autoSave: true, debounce: BOQ_COLUMN_PREF_DEBOUNCE_MS },
  );
};

const projectBoqsSortHeader = (label) => {
  const Inner = ({ column }) => (
    <Table.SortableHeader column={column} label={label} sortable={column?.getCanSort?.()} />
  );
  Inner.displayName = `ProjectBoqsSortHeader(${label})`;
  return Inner;
};

const BoqNameEditCell = ({ rowId, value, isEditing, onStartEdit, onSave }) => {
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isEditing) setDraft(value ?? '');
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commit = (cancel = false) => {
    if (cancel) {
      setDraft(value ?? '');
      onSave(rowId, value ?? '', { cancel: true });
      return;
    }
    const trimmed = draft.trim();
    onSave(rowId, trimmed || value || '');
  };

  if (isEditing) {
    return (
      <div className='min-w-[140px]' onClick={(event) => event.stopPropagation()}>
        <Input.Root size='xsmall'>
          <Input.Wrapper className='border-[#3b82f6] ring-2 ring-[#3b82f6]/20'>
            <Input.Input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => commit()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commit();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  commit(true);
                }
              }}
              className='text-sm text-text-main-900'
              aria-label='Edit BOQ name'
            />
          </Input.Wrapper>
        </Input.Root>
      </div>
    );
  }

  return (
    <span className='paragraph-small block truncate text-text-sub-500' title={value}>
      {value || '--'}
    </span>
  );
};

const ProjectBoqsTable = ({
  rows = [],
  sorting: sortingFromParent = EMPTY_SORTING,
  onSortingChange,
  columnConfig = [],
  editingBoqNameRowId = null,
  onBoqNameEditStart,
  onBoqNameSave,
  onDuplicateBoq,
  onDeleteBoq,
  onRowClick,
  context = 'default',
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  enableScrollPagination = false,
}) => {
  const [localSorting, setLocalSorting] = useState(sortingFromParent);

  useEffect(() => {
    setLocalSorting(sortingFromParent);
  }, [sortingFromParent]);

  const handleSortingChange = useCallback(
    (updaterOrValue) => {
      const next =
        typeof updaterOrValue === 'function' ? updaterOrValue(localSorting) : updaterOrValue;
      setLocalSorting(next);
      onSortingChange?.(next);
    },
    [localSorting, onSortingChange],
  );

  const emptyState = getProjectBoqEmptyState(context);

  const allColumnDefs = useMemo(
    () => [
      {
        id: 'code',
        accessorKey: 'code',
        columnLabel: 'Code',
        visible: true,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[90px] max-w-[110px]' },
        header: projectBoqsSortHeader('Code'),
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.code || '--'}</span>
        ),
        enableSorting: true,
      },
      {
        id: 'boqName',
        accessorKey: 'boqName',
        columnLabel: 'BOQ Name',
        visible: true,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[180px] max-w-[220px]' },
        header: projectBoqsSortHeader('BOQ Name'),
        cell: ({ row }) => (
          <BoqNameEditCell
            rowId={row.original.id}
            value={row.original.boqName}
            isEditing={editingBoqNameRowId === row.original.id}
            onStartEdit={onBoqNameEditStart}
            onSave={onBoqNameSave}
          />
        ),
        enableSorting: true,
      },
      {
        id: 'project',
        accessorKey: 'project',
        columnLabel: 'Project',
        visible: true,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[160px] max-w-[200px]' },
        header: projectBoqsSortHeader('Project'),
        cell: ({ row }) => (
          <span
            className='paragraph-small block truncate text-text-sub-500'
            title={row.original.project}
          >
            {row.original.project || '--'}
          </span>
        ),
        enableSorting: true,
      },
      {
        id: 'client',
        accessorKey: 'client',
        columnLabel: 'Client',
        visible: true,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[120px] max-w-[180px]' },
        header: projectBoqsSortHeader('Client'),
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.client || '--'}</span>
        ),
        enableSorting: true,
      },
      {
        id: 'clientValue',
        accessorKey: 'clientValue',
        columnLabel: 'Client value',
        visible: true,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[100px] max-w-[120px]' },
        header: projectBoqsSortHeader('Client value'),
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>
            {row.original.clientValue || '--'}
          </span>
        ),
        enableSorting: true,
      },
      {
        id: 'boqType',
        accessorKey: 'boqType',
        columnLabel: 'BOQ Type',
        visible: false,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[120px]' },
        header: projectBoqsSortHeader('BOQ Type'),
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>
            {getProjectBoqTypeLabel(row.original.boqType) || '--'}
          </span>
        ),
        enableSorting: true,
      },
      {
        id: 'version',
        accessorKey: 'version',
        columnLabel: 'Version',
        visible: false,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[80px]' },
        header: projectBoqsSortHeader('Version'),
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.version || '--'}</span>
        ),
        enableSorting: true,
      },
      {
        id: 'createdBy',
        accessorKey: 'createdBy',
        columnLabel: 'Created by',
        visible: false,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[120px]' },
        header: projectBoqsSortHeader('Created by'),
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>
            {row.original.createdBy || '--'}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: 'updated',
        accessorKey: 'updated',
        columnLabel: 'Updated',
        visible: false,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[100px]' },
        header: projectBoqsSortHeader('Updated'),
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.updated || '--'}</span>
        ),
        enableSorting: true,
      },
      {
        id: 'rowActions',
        header: () => (
          <div className='flex w-full items-center justify-end'>
            <span className='whitespace-nowrap text-paragraph-sm text-text-sub-600'>Actions</span>
          </div>
        ),
        enableHiding: false,
        enableSorting: false,
        meta: {
          columnClassName: 'w-[108px] min-w-[108px] max-w-[108px]',
          headClassName: 'sticky right-0 z-30 w-[108px] min-w-[108px] max-w-[108px] bg-bg-weak-50',
          cellClassName:
            'sticky right-0 z-20 w-[108px] min-w-[108px] max-w-[108px] px-2 bg-bg-white-0 group-hover/row:bg-bg-weak-50',
        },
        cell: ({ row }) => (
          <ProjectBoqRowActions
            onRename={() => onBoqNameEditStart?.(row.original.id)}
            onDuplicate={() => onDuplicateBoq?.(row.original)}
            onDelete={() => onDeleteBoq?.(row.original)}
          />
        ),
      },
    ],
    [editingBoqNameRowId, onBoqNameEditStart, onBoqNameSave, onDuplicateBoq, onDeleteBoq],
  );

  const columns = useMemo(() => {
    const configurableColumns = allColumnDefs.filter((column) => column.id !== 'rowActions');
    const configuredColumns = applyColumnConfig(configurableColumns, columnConfig);
    const actionsColumn = allColumnDefs.find((column) => column.id === 'rowActions');
    return actionsColumn ? [...configuredColumns, actionsColumn] : configuredColumns;
  }, [allColumnDefs, columnConfig]);

  const table = useReactTable({
    data: rows,
    columns,
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
      <BoqListEmptyState
        context={context}
        title={emptyState.title}
        description={emptyState.description}
      />
    );
  }

  const hasRows = table.getRowModel().rows.length > 0;

  const renderSkeletonRows = (count, keyPrefix) =>
    Array.from({ length: count }).map((_, index, array) => (
      <React.Fragment key={`${keyPrefix}-${index}`}>
        <Table.Row>
          {columns.map((column) => (
            <Table.Cell key={column.id || column.accessorKey} column={column}>
              <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
            </Table.Cell>
          ))}
        </Table.Row>
        {index < array.length - 1 ? <Table.RowDivider /> : null}
      </React.Fragment>
    ));

  return (
    <div className='w-full overflow-x-auto border-stroke-soft-200 bg-bg-white-0'>
      <Table.Root
        variant='compact'
        className='w-full min-w-[900px] overflow-x-auto'
        tableInstance={table}
      >
        <Table.Header className='bg-bg-weak-50'>
          <Table.Row>
            {table.getHeaderGroups().map((headerGroup) =>
              headerGroup.headers.map((header) => (
                <Table.Head
                  key={header.id}
                  column={header.column}
                  className='rounded-none first:rounded-none last:rounded-none'
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </Table.Head>
              )),
            )}
          </Table.Row>
        </Table.Header>
        {isLoading && !hasRows ? (
          <Table.Body spacing={8}>{renderSkeletonRows(SKELETON_ROW_COUNT, 'skeleton')}</Table.Body>
        ) : (
          <Table.Body spacing={8}>
            {table.getRowModel().rows.map((row, rowIndex, allRows) => (
              <React.Fragment key={row.id}>
                <Table.Row
                  className='group/row cursor-pointer hover:bg-bg-weak-50'
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <Table.Cell
                      key={cell.id}
                      column={cell.column}
                      onClick={(event) => {
                        if (
                          cell.column.id === 'rowActions' ||
                          (cell.column.id === 'boqName' && editingBoqNameRowId === row.original.id)
                        ) {
                          event.stopPropagation();
                        }
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Cell>
                  ))}
                </Table.Row>
                {rowIndex < allRows.length - 1 ? <Table.RowDivider /> : null}
              </React.Fragment>
            ))}
            {enableScrollPagination && hasMore ? (
              <Table.Row ref={sentinelRef} data-scroll-sentinel>
                <Table.Cell colSpan={columns.length} className='h-1 p-0' />
              </Table.Row>
            ) : null}
            {isLoadingMore ? renderSkeletonRows(LOAD_MORE_SKELETON_COUNT, 'loading-more') : null}
          </Table.Body>
        )}
      </Table.Root>
    </div>
  );
};

export default ProjectBoqsTable;
