import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import { applyColumnConfig, prepareColumnsForConfig } from '@/lib/column-utils';
import { useColumnConfig } from '@/hooks/use-column-config';
import { STOCKS_PRODUCT_MASTER_COLUMN_CONFIG_TABLE_ID } from '@/components/stocks/constants';
import { fetchProductMasterListPref, saveProductMasterListPref } from '@/redux/stocksSlice';
import StocksListEmptyState from '@/components/stocks/shared/stocks-list-empty-state';
import * as Badge from '@/components/ui/badge';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';

const EMPTY_SORTING = [];

export const STOCKS_PRODUCT_MASTER_COLUMN_CONFIG = [
  { id: 'product', columnLabel: 'Product', visible: true, enableHiding: true },
  { id: 'category', columnLabel: 'Category', visible: true, enableHiding: true },
  { id: 'unit', columnLabel: 'Unit', visible: true, enableHiding: true },
  { id: 'type', columnLabel: 'Type', visible: true, enableHiding: true },
  { id: 'brand', columnLabel: 'Brand', visible: true, enableHiding: true },
  { id: 'price', columnLabel: 'Price', visible: true, enableHiding: true },
  { id: 'status', columnLabel: 'Status', visible: true, enableHiding: true },
  { id: 'createBy', columnLabel: 'Create By', visible: false, enableHiding: true },
  { id: 'createAt', columnLabel: 'Create At', visible: false, enableHiding: true },
  { id: 'lastModifiedAt', columnLabel: 'Last Modified At', visible: false, enableHiding: true },
];

const LEGACY_PRICE_COLUMN_IDS = new Set(['marketPrice', 'purchasePrice']);

function migrateProductMasterColumnConfig(savedColumns, defaultColumns) {
  if (!Array.isArray(savedColumns) || savedColumns.length === 0) return null;

  const defaultById = new Map(defaultColumns.map((column) => [column.id, column]));
  const migrated = [];
  const used = new Set();
  let insertedPrice = false;
  let priceVisible = false;
  let priceOrder = null;

  for (const saved of savedColumns) {
    const id = saved?.id;
    if (!id) continue;

    if (LEGACY_PRICE_COLUMN_IDS.has(id)) {
      priceVisible = priceVisible || saved.visible !== false;
      if (priceOrder == null) priceOrder = saved.order;
      continue;
    }

    const defCol = defaultById.get(id);
    if (!defCol) continue;
    used.add(id);
    migrated.push({
      ...defCol,
      visible: saved.visible !== false,
      order: saved.order ?? migrated.length,
    });
    if (id === 'price') insertedPrice = true;
  }

  if (!insertedPrice && defaultById.has('price')) {
    const priceDef = defaultById.get('price');
    migrated.push({
      ...priceDef,
      visible: priceVisible || priceDef.visible !== false,
      order: priceOrder ?? migrated.length,
    });
    used.add('price');
  }

  for (const defCol of defaultColumns) {
    if (used.has(defCol.id)) continue;
    migrated.push({
      ...defCol,
      order: migrated.length,
    });
  }

  return migrated
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((column, index) => ({ ...column, order: index }));
}

export const useStocksProductMasterColumnConfig = () => {
  const dispatch = useDispatch();
  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(STOCKS_PRODUCT_MASTER_COLUMN_CONFIG).map((column, index) => ({
        ...column,
        order: index,
      })),
    [],
  );

  const fetchProductMasterColumns = useCallback(async () => {
    try {
      const data = await dispatch(fetchProductMasterListPref()).unwrap();
      if (!Array.isArray(data) || data.length === 0) return null;
      return migrateProductMasterColumnConfig(data, defaultColumnConfig);
    } catch {
      return null;
    }
  }, [dispatch, defaultColumnConfig]);

  const persistProductMasterColumns = useCallback(
    async (columns) => {
      await dispatch(saveProductMasterListPref(columns)).unwrap();
    },
    [dispatch],
  );

  return useColumnConfig(
    STOCKS_PRODUCT_MASTER_COLUMN_CONFIG_TABLE_ID,
    defaultColumnConfig,
    persistProductMasterColumns,
    fetchProductMasterColumns,
    { autoSave: true, debounce: 300 },
  );
};

const productMasterSortHeader = (label) => {
  const Inner = ({ column }) => (
    <Table.SortableHeader column={column} label={label} sortable={column?.getCanSort?.()} />
  );
  Inner.displayName = `ProductMasterSortHeader(${label})`;
  return Inner;
};

const typeBadgeColor = (value) => (value?.toLowerCase() === 'tagged' ? 'purple' : 'blue');
const statusBadgeColor = (value) => (value?.toLowerCase() === 'active' ? 'green' : 'gray');

const PRODUCT_MASTER_SKELETON_ROW_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'];

const ProductMasterTable = React.forwardRef(
  (
    {
      rows = [],
      sorting: sortingFromParent = EMPTY_SORTING,
      onSortingChange,
      columnConfig = [],
      onRowClick,
      isLoading = false,
      error = null,
      context = 'default',
      onRetry,
    },
    ref,
  ) => {
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
          id: 'product',
          accessorKey: 'product',
          columnLabel: 'Product',
          visible: true,
          enableHiding: true,
          meta: { columnClassName: 'min-w-[209px] max-w-[209px]' },
          header: productMasterSortHeader('Product'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500'>
              {row.original.product || '--'}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: 'category',
          accessorKey: 'category',
          columnLabel: 'Category',
          visible: true,
          enableHiding: true,
          meta: { columnClassName: 'min-w-[144px] max-w-[144px]' },
          header: productMasterSortHeader('Category'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500'>
              {row.original.category || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'unit',
          accessorKey: 'unit',
          columnLabel: 'Unit',
          visible: true,
          enableHiding: true,
          meta: { columnClassName: 'min-w-[144px] max-w-[144px]' },
          header: productMasterSortHeader('Unit'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500'>{row.original.unit || '--'}</span>
          ),
          enableSorting: true,
        },
        {
          id: 'type',
          accessorKey: 'type',
          columnLabel: 'Type',
          visible: true,
          enableHiding: true,
          meta: { columnClassName: 'min-w-[144px] max-w-[144px]' },
          header: productMasterSortHeader('Type'),
          cell: ({ row }) => (
            <Badge.Root size='small' variant='light' color={typeBadgeColor(row.original.type)}>
              {row.original.type || '--'}
            </Badge.Root>
          ),
          enableSorting: true,
        },
        {
          id: 'brand',
          accessorKey: 'brand',
          columnLabel: 'Brand',
          visible: true,
          enableHiding: true,
          meta: { columnClassName: 'min-w-[127px] max-w-[127px]' },
          header: productMasterSortHeader('Brand'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500'>{row.original.brand || '--'}</span>
          ),
          enableSorting: true,
        },
        {
          id: 'price',
          accessorKey: 'price',
          columnLabel: 'Price',
          visible: true,
          enableHiding: true,
          meta: { columnClassName: 'min-w-[114px] max-w-[114px]' },
          header: productMasterSortHeader('Price'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500'>
              {row.original.price || row.original.purchasePrice || row.original.marketPrice || '--'}
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
          meta: { columnClassName: 'min-w-[108px] max-w-[108px]' },
          header: productMasterSortHeader('Status'),
          cell: ({ row }) => (
            <Badge.Root size='small' variant='light' color={statusBadgeColor(row.original.status)}>
              {row.original.status || '--'}
            </Badge.Root>
          ),
          enableSorting: true,
        },
        {
          id: 'createBy',
          accessorKey: 'createBy',
          columnLabel: 'Create By',
          visible: false,
          enableHiding: true,
          meta: { columnClassName: 'min-w-[132px] max-w-[150px]' },
          header: productMasterSortHeader('Create By'),
          cell: ({ row }) => (
            <div className='overflow-hidden text-ellipsis whitespace-nowrap max-w-[150px]'>
              <span className='paragraph-small text-text-sub-500'>
                <Tooltip.Root size='xsmall'>
                  <Tooltip.Trigger asChild>
                    <span className='paragraph-small text-text-sub-500'>
                      {row.original.createBy || '--'}
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Content side='bottom'>{row.original.createBy || '--'}</Tooltip.Content>
                </Tooltip.Root>
              </span>
            </div>
          ),
          enableSorting: true,
        },
        {
          id: 'createAt',
          accessorKey: 'createAt',
          columnLabel: 'Create At',
          visible: false,
          enableHiding: true,
          meta: { columnClassName: 'min-w-[132px] max-w-[132px]' },
          header: productMasterSortHeader('Create At'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500'>
              {row.original.createAt || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'lastModifiedAt',
          accessorKey: 'lastModifiedAt',
          columnLabel: 'Last Modified At',
          visible: false,
          enableHiding: true,
          meta: { columnClassName: 'min-w-[152px] max-w-[152px]' },
          header: productMasterSortHeader('Last Modified At'),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500'>
              {row.original.lastModifiedAt || '--'}
            </span>
          ),
          enableSorting: true,
        },
      ],
      [],
    );

    const visibleDefs = useMemo(
      () => applyColumnConfig(allColumnDefs, columnConfig),
      [allColumnDefs, columnConfig],
    );

    React.useImperativeHandle(ref, () => ({
      columnConfig,
      visibleDefs,
    }));

    const table = useReactTable({
      data: rows,
      columns: visibleDefs,
      state: {
        sorting: localSorting,
      },
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      manualSorting: true,
      getRowId: (row) => row.id,
      enableSortingRemoval: true,
    });

    const hasRows = table.getRowModel().rows.length > 0;

    if (!hasRows && isLoading) {
      const skeletonColumns = table.getVisibleFlatColumns();
      return (
        <div className='w-full overflow-hidden rounded-xl bg-bg-white-0 shadow-sm'>
          <div className='overflow-x-auto'>
            <Table.Root variant='compact' className='w-full min-w-0' tableInstance={table}>
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

              <Table.Body spacing={8}>
                {PRODUCT_MASTER_SKELETON_ROW_KEYS.map((rowKey, index, array) => (
                  <React.Fragment key={`product-master-skeleton-${rowKey}`}>
                    <Table.Row>
                      {skeletonColumns.map((column) => (
                        <Table.Cell key={column.id} column={column}>
                          <div className='h-4 w-3/4 max-w-[10rem] animate-pulse rounded-md bg-bg-weak-50' />
                        </Table.Cell>
                      ))}
                    </Table.Row>
                    {index < array.length - 1 && <Table.RowDivider />}
                  </React.Fragment>
                ))}
              </Table.Body>
            </Table.Root>
          </div>
        </div>
      );
    }

    if (!hasRows) {
      return <StocksListEmptyState context={context} error={error} onRetry={onRetry} />;
    }

    return (
      <div className='w-full overflow-x-auto border-stroke-soft-200 bg-bg-white-0'>
        <Table.Root variant='compact' className='w-full overflow-x-auto' tableInstance={table}>
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

          <Table.Body spacing={8}>
            {table.getRowModel().rows.map((row, rowIndex, allRows) => (
              <React.Fragment key={row.id}>
                <Table.Row
                  className={onRowClick ? 'cursor-pointer' : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <Table.Cell key={cell.id} column={cell.column}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Cell>
                  ))}
                </Table.Row>
                {rowIndex < allRows.length - 1 && <Table.RowDivider />}
              </React.Fragment>
            ))}
          </Table.Body>
        </Table.Root>
      </div>
    );
  },
);

ProductMasterTable.displayName = 'ProductMasterTable';

export default React.memo(ProductMasterTable);
