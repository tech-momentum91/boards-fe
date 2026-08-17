import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import { fetchBoqTemplateListPref, saveBoqTemplateListPref } from '@/api/boqTemplates';
import BoqTemplateStatusBadge from '@/components/boq/boq-templates/components/boq-template-status-badge';
import BoqTemplateRowActions from '@/components/boq/boq-templates/components/boq-template-row-actions';
import {
  BOQ_TEMPLATES_COLUMN_CONFIG,
  BOQ_TEMPLATES_COLUMN_CONFIG_TABLE_ID,
  BOQ_COLUMN_PREF_DEBOUNCE_MS,
} from '@/components/boq/constants';
import { formatMarginsDisplay, EMPTY_BOQ_SORTING } from '@/components/boq/boq-helper';
import BoqListEmptyState from '@/components/boq/shared/boq-list-empty-state';
import { applyColumnConfig, prepareColumnsForConfig } from '@/lib/column-utils';
import { useColumnConfig } from '@/hooks/use-column-config';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import * as Input from '@/components/ui/input';
import * as Table from '@/components/ui/table';
import * as Tag from '@/components/ui/tag';
import * as Tooltip from '@/components/ui/tooltip';

const SKELETON_ROW_COUNT = 6;
const LOAD_MORE_SKELETON_COUNT = 2;

export const useBoqTemplatesColumnConfig = () => {
  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(BOQ_TEMPLATES_COLUMN_CONFIG).map((column, index) => ({
        ...column,
        order: index,
      })),
    [],
  );

  const expectedColumnIds = useMemo(
    () => new Set(defaultColumnConfig.map((column) => column.id)),
    [defaultColumnConfig],
  );

  const fetchBoqTemplateColumns = useCallback(async () => {
    try {
      const data = await fetchBoqTemplateListPref();
      if (!Array.isArray(data) || data.length === 0) return null;
      const savedIds = new Set(data.map((column) => column.id));
      const allPresent = [...expectedColumnIds].every((id) => savedIds.has(id));
      return allPresent ? data : null;
    } catch {
      return null;
    }
  }, [expectedColumnIds]);

  const persistBoqTemplateColumns = useCallback(async (columns) => {
    await saveBoqTemplateListPref(columns);
  }, []);

  return useColumnConfig(
    BOQ_TEMPLATES_COLUMN_CONFIG_TABLE_ID,
    defaultColumnConfig,
    persistBoqTemplateColumns,
    fetchBoqTemplateColumns,
    { autoSave: true, debounce: BOQ_COLUMN_PREF_DEBOUNCE_MS },
  );
};

const boqTemplatesSortHeader = (label) => {
  const Inner = ({ column }) => (
    <Table.SortableHeader column={column} label={label} sortable={column?.getCanSort?.()} />
  );
  Inner.displayName = `BoqTemplatesSortHeader(${label})`;
  return Inner;
};

const TemplateNameEditCell = ({ rowId, value, isEditing, onSave, onOpen }) => {
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
    if (!trimmed) {
      setDraft(value ?? '');
      onSave(rowId, value ?? '', { cancel: true });
      return;
    }
    onSave(rowId, trimmed);
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
              aria-label='Rename template'
            />
          </Input.Wrapper>
        </Input.Root>
      </div>
    );
  }

  return (
    <button
      type='button'
      className='paragraph-small block max-w-full truncate text-left text-primary-base hover:underline'
      title={value}
      onClick={(event) => {
        event.stopPropagation();
        onOpen?.();
      }}
    >
      {value || '--'}
    </button>
  );
};

const BoqTemplatesTable = ({
  rows = [],
  sorting: sortingFromParent = EMPTY_BOQ_SORTING,
  onSortingChange,
  columnConfig = [],
  editingTemplateNameRowId = null,
  onTemplateNameEditStart,
  onTemplateNameSave,
  onDuplicateTemplate,
  onDeleteTemplate,
  onRowClick,
  context = 'default',
  loadError = null,
  onRetry,
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

  const allColumnDefs = useMemo(
    () => [
      {
        id: 'code',
        accessorKey: 'code',
        columnLabel: 'Code',
        visible: true,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[90px] max-w-[110px]' },
        header: boqTemplatesSortHeader('Code'),
        cell: ({ row }) => (
          <button
            type='button'
            className='paragraph-small text-left text-primary-base hover:underline'
            onClick={(event) => {
              event.stopPropagation();
              onRowClick?.(row.original);
            }}
          >
            {row.original.code || '--'}
          </button>
        ),
        enableSorting: true,
      },
      {
        id: 'templateName',
        accessorKey: 'templateName',
        columnLabel: 'Template Name',
        visible: true,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[180px] max-w-[220px]' },
        header: boqTemplatesSortHeader('Template Name'),
        cell: ({ row }) => (
          <TemplateNameEditCell
            rowId={row.original.id}
            value={row.original.templateName}
            isEditing={editingTemplateNameRowId === row.original.id}
            onSave={onTemplateNameSave}
            onOpen={() => onRowClick?.(row.original)}
          />
        ),
        enableSorting: true,
      },
      {
        id: 'type',
        accessorKey: 'type',
        columnLabel: 'Type',
        visible: true,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[160px] max-w-[200px]' },
        header: boqTemplatesSortHeader('Type'),
        cell: ({ row }) => (
          <span
            className='paragraph-small block truncate text-text-sub-500'
            title={row.original.type}
          >
            {row.original.type || '--'}
          </span>
        ),
        enableSorting: true,
      },
      {
        id: 'status',
        accessorKey: 'status',
        columnLabel: 'Status',
        visible: true,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[100px] max-w-[120px]' },
        header: boqTemplatesSortHeader('Status'),
        cell: ({ row }) => <BoqTemplateStatusBadge status={row.original.status} />,
        enableSorting: true,
      },
      {
        id: 'category',
        accessorKey: 'category',
        columnLabel: 'Category',
        visible: true,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[140px] max-w-[180px]' },
        header: boqTemplatesSortHeader('Category'),
        cell: ({ row }) => (
          <span
            className='paragraph-small block truncate text-text-sub-500'
            title={row.original.category}
          >
            {row.original.category || '--'}
          </span>
        ),
        enableSorting: true,
      },
      {
        id: 'sqftArea',
        accessorKey: 'sqftArea',
        columnLabel: 'Sqft Area',
        visible: true,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[100px] max-w-[120px]' },
        header: boqTemplatesSortHeader('Sqft Area'),
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>
            {row.original.sqftArea == null || row.original.sqftArea === ''
              ? '--'
              : row.original.sqftArea}
          </span>
        ),
        enableSorting: true,
      },
      {
        id: 'products',
        accessorKey: 'products',
        columnLabel: 'Product',
        visible: true,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[90px] max-w-[110px]' },
        header: boqTemplatesSortHeader('Product'),
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.products ?? '--'}</span>
        ),
        enableSorting: true,
      },
      {
        id: 'tags',
        accessorKey: 'tags',
        columnLabel: 'Tags',
        visible: true,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[140px] max-w-[220px]' },
        header: boqTemplatesSortHeader('Tags'),
        cell: ({ row }) => {
          const tagList = Array.isArray(row.original.tags)
            ? [...new Set(row.original.tags.map((tag) => String(tag).trim()).filter(Boolean))]
            : [];
          if (tagList.length === 0) {
            return <span className='text-paragraph-xs text-text-sub-500'>—</span>;
          }
          return (
            <div className='flex min-w-0 max-w-full items-center gap-1 overflow-hidden'>
              {tagList.slice(0, 1).map((tag) => (
                <Tag.Root
                  key={tag}
                  variant='stroke'
                  className='h-5 max-w-[90px] shrink-0 truncate whitespace-nowrap px-2'
                >
                  {tag}
                </Tag.Root>
              ))}

              {tagList.length > 1 ? (
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <Tag.Root variant='stroke' className='h-5 shrink-0 whitespace-nowrap px-2'>
                      +{tagList.length - 1}
                    </Tag.Root>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <div className='flex flex-col gap-1'>
                      {tagList.slice(1).map((tag) => (
                        <span key={tag} className='whitespace-nowrap text-paragraph-xs text-white'>
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
      },
      {
        id: 'buyTotal',
        accessorKey: 'buyTotal',
        columnLabel: 'Buy total',
        visible: false,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[100px] max-w-[120px]' },
        header: boqTemplatesSortHeader('Buy total'),
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>{row.original.buyTotal || '--'}</span>
        ),
        enableSorting: true,
      },
      {
        id: 'sellTotal',
        accessorKey: 'sellTotal',
        columnLabel: 'Sell total',
        visible: false,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[100px] max-w-[120px]' },
        header: boqTemplatesSortHeader('Sell total'),
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>
            {row.original.sellTotal || '--'}
          </span>
        ),
        enableSorting: true,
      },
      {
        id: 'margins',
        accessorKey: 'margins',
        columnLabel: 'Margins',
        visible: false,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[90px] max-w-[120px]' },
        header: boqTemplatesSortHeader('Margins'),
        cell: ({ row }) => (
          <span className='paragraph-small text-text-sub-500'>
            {formatMarginsDisplay(row.original.margins)}
          </span>
        ),
        enableSorting: true,
      },
      {
        id: 'createdBy',
        accessorKey: 'createdBy',
        columnLabel: 'Created by',
        visible: false,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[140px] max-w-[180px]' },
        header: boqTemplatesSortHeader('Created by'),
        cell: ({ row }) => (
          <span
            className='paragraph-small block truncate text-text-sub-500'
            title={row.original.createdBy}
          >
            {row.original.createdBy || '--'}
          </span>
        ),
        enableSorting: true,
      },
      {
        id: 'updated',
        accessorKey: 'updated',
        columnLabel: 'Updated',
        visible: false,
        enableHiding: true,
        meta: { columnClassName: 'min-w-[120px] max-w-[160px]' },
        header: boqTemplatesSortHeader('Updated'),
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
            'sticky right-0 z-20 w-[108px] min-w-[108px] max-w-[108px] px-2 bg-bg-white-0',
        },
        cell: ({ row }) => (
          <BoqTemplateRowActions
            onEdit={() => onTemplateNameEditStart?.(row.original.id)}
            onDuplicate={() => onDuplicateTemplate?.(row.original)}
            onDelete={() => onDeleteTemplate?.(row.original)}
          />
        ),
      },
    ],
    [
      editingTemplateNameRowId,
      onTemplateNameEditStart,
      onTemplateNameSave,
      onDuplicateTemplate,
      onDeleteTemplate,
      onRowClick,
    ],
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
    return <BoqListEmptyState context={context} error={loadError} onRetry={onRetry} />;
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
                  className='cursor-pointer hover:bg-bg-weak-50'
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <Table.Cell
                      key={cell.id}
                      column={cell.column}
                      onClick={(event) => {
                        if (
                          cell.column.id === 'rowActions' ||
                          cell.column.id === 'margins' ||
                          (cell.column.id === 'templateName' &&
                            editingTemplateNameRowId === row.original.id)
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

export default BoqTemplatesTable;
