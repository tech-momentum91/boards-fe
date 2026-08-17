import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RiArrowDownSFill, RiExpandUpDownFill } from 'react-icons/ri';

import { Link } from 'react-router-dom';

import { applyColumnConfig } from '@/lib/column-utils';
import * as Badge from '@/components/ui/badge';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

const EMPTY_SORTING = [];

const productsSortHeader = (label) => {
  const Inner = ({ column }) => (
    <Table.SortableHeader column={column} label={label} sortable={column?.getCanSort?.()} nowrap />
  );
  Inner.displayName = `ProductsSortHeader(${label})`;
  return Inner;
};

const statusBadgeColor = (value) => {
  const normalized = String(value).toLowerCase();
  if (normalized === 'active') return 'green';
  if (normalized === 'inactive') return 'red';
  return 'gray';
};

const SUBROW_HEAD_CELL_CLASS =
  'h-9 bg-bg-weak-100 px-3 py-2 text-left text-paragraph-sm font-medium text-text-soft-400';
const SUBROW_CELL_CLASS = 'h-10 bg-bg-white-0 px-3 py-2 align-middle';

function SubRowSortableHeader({ label, sortable }) {
  return (
    <div className='flex items-center gap-0.5'>
      <span className='whitespace-nowrap'>{label}</span>
      {sortable ? (
        <RiExpandUpDownFill className='size-5 shrink-0 text-text-soft-400' aria-hidden />
      ) : null}
    </div>
  );
}

function renderSubRowCell(columnDefsById, columnId, rowData) {
  const def = columnDefsById?.[columnId];
  if (def?.cell) {
    return def.cell({ row: { original: rowData, depth: 1 } });
  }
  return <ProductsTruncatedTextCell value={rowData?.[columnId]} />;
}

function ExpandedSubRowsTable({
  childRows,
  subRowColumns,
  subRowColumnDefsById,
  embedded,
  isLastParentRow,
  scrollViewportWidth,
  onRowClick,
}) {
  return (
    <div
      className='sticky left-0 z-10 overflow-x-auto overscroll-x-contain bg-bg-white-0'
      style={scrollViewportWidth ? { width: scrollViewportWidth } : undefined}
    >
      <table className='w-max min-w-full border-collapse'>
        <thead>
          <tr className='bg-bg-weak-100'>
            {subRowColumns.map((column) => (
              <th
                key={column.id}
                className={cn(
                  SUBROW_HEAD_CELL_CLASS,
                  embedded && 'bg-bg-weak-50',
                  column.className,
                  column.headerClassName,
                )}
              >
                <SubRowSortableHeader label={column.label} sortable={column.sortable} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {childRows.length === 0 ? (
            <tr>
              <td
                colSpan={subRowColumns.length}
                className={cn(
                  SUBROW_CELL_CLASS,
                  'py-8 text-center text-paragraph-sm text-text-soft-400',
                )}
              >
                No items found.
              </td>
            </tr>
          ) : (
            childRows.map((childRow, childIndex) => {
              const isLastChild = childIndex === childRows.length - 1;

              return (
                <tr
                  key={childRow.id}
                  className={cn(
                    'bg-bg-white-0',
                    onRowClick && 'cursor-pointer hover:bg-bg-weak-50',
                  )}
                  onClick={
                    onRowClick
                      ? () => {
                          onRowClick(childRow.original);
                        }
                      : undefined
                  }
                >
                  {subRowColumns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(
                        SUBROW_CELL_CLASS,
                        !isLastChild && 'border-b border-stroke-soft-200',
                        column.className,
                        column.id === 'name' && 'pl-9',
                        embedded &&
                          isLastParentRow &&
                          isLastChild &&
                          column.id === subRowColumns[0]?.id &&
                          'rounded-bl-xl',
                        embedded &&
                          isLastParentRow &&
                          isLastChild &&
                          column.id === subRowColumns[subRowColumns.length - 1]?.id &&
                          'rounded-br-xl',
                      )}
                    >
                      {renderSubRowCell(subRowColumnDefsById, column.id, childRow.original)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

const ProductsTable = ({
  rows = [],
  columnConfig = [],
  columnDefsById = {},
  emptyLabel = 'No products found',
  sorting: sortingFromParent = EMPTY_SORTING,
  onSortingChange,
  isLoading = false,
  embedded = false,
  getSubRows,
  subRowColumns,
  subRowColumnDefsById,
  onRowClick,
}) => {
  const [localSorting, setLocalSorting] = useState(sortingFromParent);
  const [expanded, setExpanded] = useState({});
  const supportsRowExpansion = typeof getSubRows === 'function';
  const supportsSubRowHeader = supportsRowExpansion && subRowColumns?.length > 0;
  const rootRef = useRef(null);
  const [scrollViewportWidth, setScrollViewportWidth] = useState(null);

  useLayoutEffect(() => {
    if (!supportsSubRowHeader || !rootRef.current) return undefined;

    const scrollEl = embedded ? rootRef.current.parentElement : rootRef.current;
    if (!scrollEl) return undefined;

    const updateWidth = () => {
      setScrollViewportWidth(scrollEl.clientWidth);
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(scrollEl);
    window.addEventListener('resize', updateWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [embedded, supportsSubRowHeader]);

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

  const allColumnDefs = useMemo(() => {
    return Object.entries(columnDefsById).map(([id, def]) => ({
      id,
      accessorKey: id,
      columnLabel: def.columnLabel,
      visible: def.visible !== false,
      enableHiding: def.enableHiding !== false,
      meta: def.meta,
      header: productsSortHeader(def.columnLabel),
      cell: def.cell,
      enableSorting: def.enableSorting ?? false,
    }));
  }, [columnDefsById]);

  const visibleDefs = useMemo(
    () => applyColumnConfig(allColumnDefs, columnConfig),
    [allColumnDefs, columnConfig],
  );

  const table = useReactTable({
    data: rows,
    columns: visibleDefs,
    state: {
      sorting: localSorting,
      ...(supportsRowExpansion ? { expanded } : {}),
    },
    onSortingChange: handleSortingChange,
    ...(supportsRowExpansion
      ? {
          onExpandedChange: setExpanded,
          getSubRows,
          getExpandedRowModel: getExpandedRowModel(),
          getRowCanExpand: (row) => (getSubRows(row.original)?.length ?? 0) > 0,
        }
      : {}),
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    getRowId: (row) => row.id,
    enableSortingRemoval: true,
  });

  const hasRows = table.getRowModel().rows.length > 0;

  if (!hasRows && isLoading) {
    return (
      <div className='w-full overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-sm'>
        <div className='flex flex-col items-center justify-center py-12'>
          <p className='paragraph-small text-text-sub-600'>Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasRows) {
    return (
      <div className='w-full overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-sm'>
        <div className='flex flex-col items-center justify-center py-12'>
          <p className='text-paragraph-sm font-medium text-text-sub-600'>{emptyLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        'w-full min-w-0 bg-bg-white-0',
        embedded ? 'border-0' : 'overflow-x-auto rounded-xl border border-stroke-soft-200',
      )}
    >
      <Table.Root
        variant='compact'
        className={cn('w-full', supportsSubRowHeader && '!overflow-visible')}
        tableInstance={table}
      >
        <Table.Header className={cn('bg-bg-weak-100', embedded && 'bg-bg-weak-50')}>
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

        <Table.Body spacing={embedded ? 0 : 8}>
          {(supportsSubRowHeader
            ? table.getRowModel().rows.filter((row) => row.depth === 0)
            : table.getRowModel().rows
          ).map((row, rowIndex, visibleRows) => {
            const isLastRow = rowIndex === visibleRows.length - 1;
            const isChildRow = !supportsSubRowHeader && row.depth > 0;
            const isExpanded = row.getIsExpanded?.() ?? false;
            const childRows = row.subRows ?? [];
            const parentColSpan = table.getVisibleLeafColumns().length;
            const isRowClickable =
              Boolean(onRowClick) && (supportsSubRowHeader ? row.depth === 0 : true);

            return (
              <React.Fragment key={row.id}>
                <Table.Row
                  className={cn(
                    isChildRow && 'bg-bg-white-0',
                    isRowClickable && 'cursor-pointer hover:bg-bg-weak-50',
                  )}
                  onClick={
                    isRowClickable
                      ? () => {
                          onRowClick(row.original);
                        }
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell, cellIndex) => (
                    <Table.Cell
                      key={cell.id}
                      column={cell.column}
                      className={cn(
                        embedded && '!rounded-none',
                        embedded &&
                          isLastRow &&
                          !isExpanded &&
                          'first:!rounded-bl-xl last:!rounded-br-xl',
                        isChildRow && cellIndex === 0 && 'pl-9',
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Cell>
                  ))}
                </Table.Row>

                {supportsSubRowHeader && isExpanded ? (
                  <>
                    <Table.Row aria-hidden='true'>
                      <Table.Cell
                        colSpan={parentColSpan}
                        className='h-px p-0 !rounded-none bg-stroke-soft-200'
                      />
                    </Table.Row>

                    <Table.Row>
                      <Table.Cell
                        colSpan={parentColSpan}
                        className='h-auto min-w-0 p-0 !rounded-none'
                      >
                        <ExpandedSubRowsTable
                          childRows={childRows}
                          subRowColumns={subRowColumns}
                          subRowColumnDefsById={subRowColumnDefsById}
                          embedded={embedded}
                          isLastParentRow={isLastRow}
                          scrollViewportWidth={scrollViewportWidth}
                          onRowClick={onRowClick}
                        />
                      </Table.Cell>
                    </Table.Row>
                  </>
                ) : null}

                {rowIndex < visibleRows.length - 1 ? <Table.RowDivider /> : null}
              </React.Fragment>
            );
          })}
        </Table.Body>
      </Table.Root>
    </div>
  );
};

function renderProductsNameContent({ id, name, onProductOpen, useRowClickNavigation, linkTo }) {
  const label = name || '--';
  const className = 'truncate text-left paragraph-small font-medium text-text-main-900';

  if (useRowClickNavigation) {
    return <span className={className}>{label}</span>;
  }

  if (onProductOpen) {
    return (
      <button type='button' onClick={() => onProductOpen(id)} className={className}>
        {label}
      </button>
    );
  }

  return (
    <Link to={linkTo ?? `/products/${id}`} className={className}>
      {label}
    </Link>
  );
}

export const defaultProductsNameCell = ({ row, onProductOpen, useRowClickNavigation }) => {
  const { id, name, imageUrl } = row.original;

  const nameContent = renderProductsNameContent({
    id,
    name,
    onProductOpen,
    useRowClickNavigation,
  });

  return (
    <div className='flex min-w-0 items-center gap-3'>
      {imageUrl ? (
        <img src={imageUrl} alt='' className='size-8 shrink-0 rounded object-cover' />
      ) : (
        <div className='size-8 shrink-0 rounded bg-bg-weak-100' aria-hidden />
      )}
      {nameContent}
    </div>
  );
};

export const productsProductNameCell = ({ row, onProductOpen, useRowClickNavigation }) => {
  const { id, name, imageUrl } = row.original;
  const isChildRow = row.depth > 0;
  const hasVariations = !isChildRow && (row.original.variations?.length ?? 0) > 0;

  const nameContent = renderProductsNameContent({
    id,
    name,
    onProductOpen,
    useRowClickNavigation,
  });

  return (
    <div className='flex min-w-0 items-center gap-3'>
      {imageUrl ? (
        <img src={imageUrl} alt='' className='size-8 shrink-0 rounded object-cover' />
      ) : (
        <div className='size-8 shrink-0 rounded bg-bg-weak-100' aria-hidden />
      )}
      <div className='flex min-w-0 items-center gap-1'>
        {nameContent}
        {hasVariations ? (
          <button
            type='button'
            className='flex shrink-0 items-center justify-center text-text-soft-400'
            onClick={(event) => {
              event.stopPropagation();
              row.getToggleExpandedHandler()(event);
            }}
            aria-expanded={row.getIsExpanded()}
            aria-label={row.getIsExpanded() ? 'Collapse variations' : 'Expand variations'}
          >
            <RiArrowDownSFill className={cn('size-5', !row.getIsExpanded() && '-rotate-90')} />
          </button>
        ) : null}
      </div>
    </div>
  );
};

export const productsPackageNameCell = ({ row, onPackageOpen, useRowClickNavigation }) => {
  const { id, name, imageUrl } = row.original;
  const isChildRow = row.depth > 0;
  const hasProducts = (row.original.products?.length ?? 0) > 0;

  if (isChildRow) {
    return defaultProductsNameCell({ row, useRowClickNavigation });
  }

  const nameContent = renderProductsNameContent({
    id,
    name,
    onProductOpen: onPackageOpen,
    useRowClickNavigation,
  });

  return (
    <div className='flex min-w-0 items-center gap-3'>
      {imageUrl ? (
        <img src={imageUrl} alt='' className='size-8 shrink-0 rounded object-cover' />
      ) : (
        <div className='size-8 shrink-0 rounded bg-bg-weak-100' aria-hidden />
      )}
      <div className='flex min-w-0 items-center gap-1'>
        {nameContent}
        {hasProducts ? (
          <button
            type='button'
            className='flex shrink-0 items-center justify-center text-text-soft-400'
            onClick={(event) => {
              event.stopPropagation();
              row.getToggleExpandedHandler()(event);
            }}
            aria-expanded={row.getIsExpanded()}
            aria-label={
              row.getIsExpanded() ? 'Collapse package products' : 'Expand package products'
            }
          >
            <RiArrowDownSFill className={cn('size-5', !row.getIsExpanded() && '-rotate-90')} />
          </button>
        ) : null}
      </div>
    </div>
  );
};

export const productsPackageCodeCell = ({ row }) => (
  <ProductsTruncatedTextCell value={row.original.packageCode || row.original.productCode} />
);

export const productsJobCodeCell = ({ row }) => (
  <ProductsTruncatedTextCell value={row.original.jobCode || row.original.productCode} />
);

function ProductsTruncatedTextCell({ value }) {
  const raw = value == null || value === '' ? '' : String(value);
  const display = raw || '--';

  if (display === '--') {
    return (
      <span className='paragraph-small text-text-sub-500 block min-w-0 truncate'>{display}</span>
    );
  }

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            className='paragraph-small text-text-sub-500 block min-w-0 w-full cursor-default truncate text-left'
            title={display}
          >
            {display}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Content side='bottom' className='max-w-sm break-words'>
          {display}
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export const defaultProductsTextCell = (field) => {
  const Cell = ({ row }) => <ProductsTruncatedTextCell value={row.original[field]} />;
  Cell.displayName = `DefaultProductsTextCell(${field})`;
  return Cell;
};

export const defaultProductsStatusCell = ({ row }) => {
  const status = row.original.status || '--';
  return (
    <Badge.Root size='small' variant='light' color={statusBadgeColor(status)}>
      {status}
    </Badge.Root>
  );
};

const BADGE_LIST_VISIBLE_COUNT = 2;

export function productsBadgeListCell(field, { visibleCount = BADGE_LIST_VISIBLE_COUNT } = {}) {
  const Cell = ({ row }) => {
    const values = Array.isArray(row.original[field])
      ? row.original[field].map((value) => String(value || '').trim()).filter(Boolean)
      : [];

    if (values.length === 0) {
      return <span className='paragraph-small text-text-sub-500'>--</span>;
    }

    const visible = values.slice(0, visibleCount);
    const overflowCount = values.length - visible.length;

    return (
      <div className='flex min-w-0 items-center gap-2'>
        {visible.map((value) => (
          <Badge.Root
            key={value}
            size='small'
            variant='stroke'
            color='gray'
            className='shrink-0 whitespace-nowrap bg-bg-white-0 px-2 py-0.5 text-label-xs font-medium text-text-sub-500 ring-stroke-soft-200 normal-case'
          >
            {value}
          </Badge.Root>
        ))}
        {overflowCount > 0 ? (
          <Badge.Root
            size='small'
            variant='lighter'
            color='gray'
            className='shrink-0 whitespace-nowrap bg-bg-weak-100 px-2 py-0.5 text-label-xs font-medium text-text-sub-500 normal-case'
          >
            +{overflowCount}
          </Badge.Root>
        ) : null}
      </div>
    );
  };

  Cell.displayName = `ProductsBadgeListCell(${field})`;
  return Cell;
}

export default React.memo(ProductsTable);
