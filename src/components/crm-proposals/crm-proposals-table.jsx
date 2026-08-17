import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RiArrowDownSLine, RiArrowUpSLine, RiErrorWarningLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Table from '@/components/ui/table';

import { cn } from '@/utils/cn';
import { useColumnConfig } from '@/hooks/use-column-config';
import { applyColumnConfig, prepareColumnsForConfig } from '@/lib/column-utils';
import {
  buildGlobalProposalColumns,
  buildLeadDetailProposalColumns,
} from '@/components/crm-proposals/crm-proposals-table-columns.jsx';
import {
  DEFAULT_GLOBAL_PROPOSAL_COLUMN_WIDTHS,
  DEFAULT_LEAD_DETAIL_PROPOSAL_COLUMN_WIDTHS,
  EMPTY_PROPOSAL_HIDE_COLUMNS,
  GLOBAL_PROPOSAL_COLUMN_DEFS,
  LEAD_DETAIL_PROPOSAL_COLUMN_DEFS,
  PROPOSAL_COLUMN_MAX_WIDTH,
  PROPOSAL_COLUMN_MIN_WIDTH,
  PROPOSAL_EMPTY_STATES,
} from '@/components/crm-proposals/constants';
import {
  buildFrozenColumnPinning,
  getFrozenHeaderTableProps,
  getFrozenRootTableProps,
  getFrozenTanStackColumnProp,
  getFrozenWrapperClassName,
  orderColumnsWithActionsLast,
  withFrozenColumnPinning,
} from '@/lib/frozen-table-columns';

const PINNED_PROPOSAL_COLUMN_ID = 'proposal';

const GroupTable = React.memo(
  ({ groupRows, columns, getWidth, variant, onRowClick, tableMinWidth, freezeColumns = true }) => {
    const [localSorting, setLocalSorting] = useState([]);

    const groupTable = useReactTable({
      data: groupRows,
      columns,
      enableColumnPinning: freezeColumns,
      state: withFrozenColumnPinning(
        { sorting: localSorting },
        buildFrozenColumnPinning({
          enabled: freezeColumns,
          leftColumnId: PINNED_PROPOSAL_COLUMN_ID,
          columns,
        }),
      ),
      onSortingChange: setLocalSorting,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      enableSortingRemoval: true,
    });

    return (
      <Table.Root
        variant={variant}
        {...getFrozenRootTableProps(freezeColumns, {
          tableInstance: groupTable,
          unfrozenClassName: 'w-full',
        })}
        style={{ tableLayout: 'fixed', width: '100%', minWidth: tableMinWidth }}
      >
        <Table.Header {...getFrozenHeaderTableProps(freezeColumns)}>
          {groupTable.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id} className='bg-bg-weak-50'>
              {headerGroup.headers.map((header) => {
                const colId = header.column.id;
                const width = getWidth(colId);
                return (
                  <Table.Head
                    key={header.id}
                    {...getFrozenTanStackColumnProp(freezeColumns, header.column)}
                    className={cn(
                      'overflow-hidden text-left label-small text-text-sub-600 font-medium pl-4 pr-4',
                      header.column.columnDef.meta?.headClassName,
                    )}
                    style={{
                      width,
                      minWidth: colId === 'actions' ? width : PROPOSAL_COLUMN_MIN_WIDTH,
                      maxWidth: colId === 'proposal' ? width : PROPOSAL_COLUMN_MAX_WIDTH,
                    }}
                  >
                    <div className='flex min-w-0 items-center gap-0.5'>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  </Table.Head>
                );
              })}
            </Table.Row>
          ))}
        </Table.Header>
        <Table.Body>
          {groupTable.getRowModel().rows.map((row, rowIndex, allRows) => (
            <React.Fragment key={row.id}>
              <Table.Row
                onClick={() => onRowClick?.(row.original)}
                className={onRowClick ? 'cursor-pointer hover:bg-bg-weak-50' : ''}
              >
                {row.getVisibleCells().map((cell) => {
                  const colId = cell.column.id;
                  const width = getWidth(colId);
                  return (
                    <Table.Cell
                      key={cell.id}
                      {...getFrozenTanStackColumnProp(freezeColumns, cell.column)}
                      className={cn('align-middle px-4', cell.column.columnDef.meta?.cellClassName)}
                      style={{
                        width,
                        minWidth: colId === 'actions' ? width : PROPOSAL_COLUMN_MIN_WIDTH,
                        maxWidth: colId === 'proposal' ? width : PROPOSAL_COLUMN_MAX_WIDTH,
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Cell>
                  );
                })}
              </Table.Row>
              {rowIndex < allRows.length - 1 && <Table.RowDivider />}
            </React.Fragment>
          ))}
        </Table.Body>
      </Table.Root>
    );
  },
);

GroupTable.displayName = 'GroupTable';

const GroupedProposalsView = ({
  sortedKeys,
  groups,
  columns,
  getWidth,
  variant,
  onRowClick,
  tableMinWidth,
  freezeColumns = true,
}) => {
  const [expandedKeys, setExpandedKeys] = useState(() =>
    Object.fromEntries(sortedKeys.map((k) => [k, true])),
  );

  useEffect(() => {
    setExpandedKeys((previous) => {
      const next = { ...previous };
      sortedKeys.forEach((k) => {
        if (next[k] === undefined) next[k] = true;
      });
      return next;
    });
  }, [sortedKeys]);

  const toggle = (key) => setExpandedKeys((previous) => ({ ...previous, [key]: !previous[key] }));

  return (
    <div className='w-full flex flex-col gap-10'>
      {sortedKeys.map((key) => {
        const groupRows = groups[key] || [];
        const isExpanded = expandedKeys[key] !== false;
        return (
          <div key={key} className='flex w-full flex-col items-start gap-1'>
            <button
              type='button'
              onClick={() => toggle(key)}
              className='label-small flex items-center gap-1 font-medium text-text-sub-500 cursor-pointer hover:opacity-80 transition-opacity w-full text-left'
            >
              {key}
              <span className='text-text-soft-400 font-normal'>({groupRows.length})</span>
              {isExpanded ? (
                <RiArrowUpSLine size={16} className='shrink-0' />
              ) : (
                <RiArrowDownSLine size={16} className='shrink-0' />
              )}
            </button>

            {isExpanded && (
              <div className='w-full pt-2 [&_table]:table-fixed'>
                <GroupTable
                  groupRows={groupRows}
                  columns={columns}
                  getWidth={getWidth}
                  variant={variant}
                  onRowClick={onRowClick}
                  tableMinWidth={tableMinWidth}
                  freezeColumns={freezeColumns}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const CrmProposalsTable = forwardRef(
  (
    {
      rows = [],
      isLoading = false,
      error = null,
      onRetry,
      onOpenProposal,
      onDeleteProposal,
      onRowClick,
      groupBy = '',
      groupOrder = 'asc',
      variant = 'compact',
      persistColumnConfig,
      fetchColumnConfig,
      columnConfigId = 'crm-proposals-table',
      columnWidths = {},
      hideColumns = EMPTY_PROPOSAL_HIDE_COLUMNS,
      emptyTitle,
      emptyDescription,
      emptyVariant = 'default',
      freezeColumns = true,
      tableVariant = 'lead',
    },
    ref,
  ) => {
    const [localSorting, setLocalSorting] = useState([]);

    const data = rows;
    const handleRowClick = onRowClick ?? onOpenProposal;
    const isGlobalVariant = tableVariant === 'global';
    const defaultWidthMap = isGlobalVariant
      ? DEFAULT_GLOBAL_PROPOSAL_COLUMN_WIDTHS
      : DEFAULT_LEAD_DETAIL_PROPOSAL_COLUMN_WIDTHS;

    const hideColumnsKey = hideColumns.length > 0 ? hideColumns.join('|') : '';

    const visibleColumnDefs = useMemo(() => {
      const baseColumnDefs = isGlobalVariant
        ? GLOBAL_PROPOSAL_COLUMN_DEFS
        : LEAD_DETAIL_PROPOSAL_COLUMN_DEFS;
      return baseColumnDefs.filter((col) => !hideColumns.includes(col.id));
    }, [isGlobalVariant, hideColumnsKey, hideColumns]);

    const getWidth = useCallback(
      (columnId) => {
        if (columnId === 'actions') return defaultWidthMap.actions ?? 56;
        const width = columnWidths[columnId] ?? defaultWidthMap[columnId] ?? 140;
        // Keep proposal title readable; never shrink below the default.
        if (columnId === 'proposal') {
          return Math.max(width, defaultWidthMap.proposal ?? 280);
        }
        return width;
      },
      [columnWidths, defaultWidthMap],
    );

    const allColumnDefs = useMemo(() => {
      if (isGlobalVariant) {
        return buildGlobalProposalColumns({ freezeColumns, hideColumns, onDeleteProposal });
      }
      return buildLeadDetailProposalColumns({ freezeColumns, hideColumns });
    }, [freezeColumns, hideColumns, isGlobalVariant, onDeleteProposal]);

    const defaultColumnConfig = useMemo(() => {
      const config = prepareColumnsForConfig(visibleColumnDefs);
      config.forEach((col, index) => {
        const def = visibleColumnDefs.find((c) => c.id === col.id);
        if (def) {
          col.visible = def.visible !== false;
          col.enableHiding = def.enableHiding !== false;
        }
        col.order = index;
      });
      return config.sort((a, b) => a.order - b.order);
    }, [visibleColumnDefs]);

    const defaultPersist = useCallback(() => {}, []);
    const defaultFetch = useCallback(() => Promise.resolve([]), []);

    const {
      columns: columnConfig,
      visibleColumns: visibleColumnConfig,
      reorderColumns,
      toggleColumnVisibility,
      showAllColumns,
      hideAllColumns,
      resetToDefault,
    } = useColumnConfig(
      columnConfigId,
      defaultColumnConfig,
      persistColumnConfig ?? defaultPersist,
      fetchColumnConfig ?? defaultFetch,
      { autoSave: true, debounce: 500 },
    );

    const columns = useMemo(
      () => orderColumnsWithActionsLast(applyColumnConfig(allColumnDefs, columnConfig)),
      [allColumnDefs, columnConfig],
    );

    const handleSortingChange = useCallback((updater) => {
      setLocalSorting((previous) => (typeof updater === 'function' ? updater(previous) : updater));
    }, []);

    const table = useReactTable({
      data,
      columns,
      enableColumnPinning: freezeColumns,
      state: withFrozenColumnPinning(
        { sorting: localSorting },
        buildFrozenColumnPinning({
          enabled: freezeColumns,
          leftColumnId: PINNED_PROPOSAL_COLUMN_ID,
          columns,
        }),
      ),
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      enableSortingRemoval: true,
    });

    useImperativeHandle(ref, () => ({
      columnConfigHook: {
        columns: columnConfig,
        visibleColumns: visibleColumnConfig,
        reorderColumns,
        toggleColumnVisibility,
        showAllColumns,
        hideAllColumns,
        resetToDefault,
      },
    }));

    const tableMinWidth = useMemo(
      () => columns.reduce((sum, col) => sum + getWidth(col.id), 0),
      [columns, getWidth],
    );

    const groupedData = useMemo(() => {
      if (!groupBy) return null;
      const groups = {};
      for (const row of data) {
        let key = row[groupBy];
        if (key === undefined || key === null || key === '' || key === '-') key = '(None)';
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      }
      const sortedKeys = Object.keys(groups).sort((a, b) =>
        groupOrder === 'desc' ? b.localeCompare(a) : a.localeCompare(b),
      );
      return { sortedKeys, groups };
    }, [groupBy, groupOrder, data]);

    const emptyState = {
      title:
        emptyTitle ??
        PROPOSAL_EMPTY_STATES[emptyVariant]?.title ??
        PROPOSAL_EMPTY_STATES.default.title,
      description:
        emptyDescription ??
        PROPOSAL_EMPTY_STATES[emptyVariant]?.description ??
        PROPOSAL_EMPTY_STATES.default.description,
    };

    const renderHeaderRow = (headerGroups) =>
      headerGroups.map((headerGroup) => (
        <Table.Row key={headerGroup.id} className='bg-bg-weak-50'>
          {headerGroup.headers.map((header) => {
            const colId = header.column.id;
            const width = getWidth(colId);
            return (
              <Table.Head
                key={header.id}
                {...getFrozenTanStackColumnProp(freezeColumns, header.column)}
                className={cn(
                  'overflow-hidden text-left label-small text-text-sub-600 font-medium pl-4 pr-4',
                  header.column.columnDef.meta?.headClassName,
                )}
                style={{
                  width,
                  minWidth: colId === 'actions' ? width : PROPOSAL_COLUMN_MIN_WIDTH,
                  maxWidth: colId === 'proposal' ? width : PROPOSAL_COLUMN_MAX_WIDTH,
                }}
              >
                <div className='flex min-w-0 items-center gap-0.5'>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </div>
              </Table.Head>
            );
          })}
        </Table.Row>
      ));

    const renderRow = (row, rowIndex, array) => (
      <React.Fragment key={row.id}>
        <Table.Row
          onClick={() => handleRowClick?.(row.original)}
          className={handleRowClick ? 'cursor-pointer hover:bg-bg-weak-50' : ''}
        >
          {row.getVisibleCells().map((cell) => (
            <Table.Cell
              key={cell.id}
              {...getFrozenTanStackColumnProp(freezeColumns, cell.column)}
              className={cn('align-middle px-4', cell.column.columnDef.meta?.cellClassName)}
              style={{
                width: getWidth(cell.column.id),
                minWidth:
                  cell.column.id === 'actions'
                    ? getWidth(cell.column.id)
                    : PROPOSAL_COLUMN_MIN_WIDTH,
                maxWidth:
                  cell.column.id === 'proposal'
                    ? getWidth(cell.column.id)
                    : PROPOSAL_COLUMN_MAX_WIDTH,
              }}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </Table.Cell>
          ))}
        </Table.Row>
        {rowIndex < array.length - 1 && <Table.RowDivider />}
      </React.Fragment>
    );

    const renderSkeleton = () => (
      <Table.Body>
        {Array.from({ length: 6 }).map((_, index, array) => (
          <React.Fragment key={`proposals-skeleton-${index}`}>
            <Table.Row>
              {table.getAllColumns().map((column) => (
                <Table.Cell
                  key={column.id}
                  style={{ width: getWidth(column.id), minWidth: PROPOSAL_COLUMN_MIN_WIDTH }}
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

    if (error) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <RiErrorWarningLine className='size-12 text-error-base mb-4' />
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>Unable to load proposals</h3>
          <p className='mb-4 text-sm text-error-darker/80'>{error}</p>
          {onRetry ? (
            <Button.Root type='button' variant='error' mode='filled' size='small' onClick={onRetry}>
              Try again
            </Button.Root>
          ) : null}
        </div>
      );
    }

    if (!isLoading && data.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center h-full'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{emptyState.title}</h3>
          <p className='max-w-md text-sm text-text-sub-600'>{emptyState.description}</p>
        </div>
      );
    }

    if (groupedData) {
      if (isLoading) {
        return (
          <div className={getFrozenWrapperClassName(freezeColumns)}>
            <Table.Root
              variant={variant}
              {...getFrozenRootTableProps(freezeColumns, { tableInstance: table })}
              style={{ tableLayout: 'fixed', width: '100%', minWidth: tableMinWidth }}
            >
              <Table.Header {...getFrozenHeaderTableProps(freezeColumns)}>
                {renderHeaderRow(table.getHeaderGroups())}
              </Table.Header>
              {renderSkeleton()}
            </Table.Root>
          </div>
        );
      }

      return (
        <div className={getFrozenWrapperClassName(freezeColumns)}>
          <GroupedProposalsView
            sortedKeys={groupedData.sortedKeys}
            groups={groupedData.groups}
            columns={columns}
            getWidth={getWidth}
            variant={variant}
            onRowClick={handleRowClick}
            tableMinWidth={tableMinWidth}
            freezeColumns={freezeColumns}
          />
        </div>
      );
    }

    return (
      <div className={getFrozenWrapperClassName(freezeColumns)}>
        <Table.Root
          variant={variant}
          {...getFrozenRootTableProps(freezeColumns, { tableInstance: table })}
          style={{ tableLayout: 'fixed', width: '100%', minWidth: tableMinWidth }}
        >
          <Table.Header {...getFrozenHeaderTableProps(freezeColumns)}>
            {renderHeaderRow(table.getHeaderGroups())}
          </Table.Header>
          {isLoading ? (
            renderSkeleton()
          ) : (
            <Table.Body>
              {table
                .getRowModel()
                .rows.map((row, rowIndex, array) => renderRow(row, rowIndex, array))}
            </Table.Body>
          )}
        </Table.Root>
      </div>
    );
  },
);

CrmProposalsTable.displayName = 'CrmProposalsTable';

export default CrmProposalsTable;
