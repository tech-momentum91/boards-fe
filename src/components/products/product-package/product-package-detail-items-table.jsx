import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RiAddLine, RiDeleteBinLine } from 'react-icons/ri';

import ProductPackageDetailItemNameSearch from '@/components/products/product-package/product-package-detail-item-name-search';
import {
  createPackageDraftItemRow,
  toBundleItemsPayload,
} from '@/components/products/product-package/product-package-utils';
import { PRODUCT_SUBROW_COLUMNS } from '@/components/products/products-subrow-columns';
import { defaultProductsStatusCell } from '@/components/products/products-table';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import * as CompactButton from '@/components/ui/compact-button';
import * as Table from '@/components/ui/table';
import * as Tooltip from '@/components/ui/tooltip';
import { showErrorToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';

const QUANTITY_COLUMN = {
  id: 'quantity',
  label: 'Qty.',
  className: 'min-w-[80px]',
  sortable: true,
};

const ITEM_COLUMNS = (() => {
  const columns = [...PRODUCT_SUBROW_COLUMNS];
  const nameIndex = columns.findIndex((column) => column.id === 'name');
  if (nameIndex >= 0) {
    columns[nameIndex] = {
      ...columns[nameIndex],
      className: 'w-[201px] min-w-[201px] max-w-[201px]',
    };
  }
  columns.splice(nameIndex >= 0 ? nameIndex + 1 : 0, 0, QUANTITY_COLUMN);
  return columns;
})();

const HEAD_CELL_CLASS =
  'sticky top-0 z-[3] h-9 bg-bg-weak-100 px-3 py-2 text-left text-paragraph-sm font-medium text-text-soft-400';
const BODY_CELL_CLASS = 'h-10 bg-bg-white-0 px-3 py-2 align-middle';
const STICKY_LEFT_HEAD_CLASS = 'sticky left-0 top-0 z-[6] bg-bg-weak-100';
const STICKY_LEFT_CELL_CLASS = 'sticky left-0 z-[4] bg-bg-white-0';
const STICKY_RIGHT_HEAD_CLASS =
  'sticky right-0 top-0 z-[6] h-9 w-12 min-w-12 border-l border-stroke-soft-200 bg-bg-weak-100 px-3 py-2';
const STICKY_RIGHT_CELL_CLASS =
  'sticky right-0 z-[4] h-10 w-12 min-w-12 border-l border-stroke-soft-200 bg-bg-white-0 px-3 py-2 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]';

function textCell(value) {
  const display = value == null || value === '' ? '--' : String(value);
  if (display === '--') {
    return <span className='paragraph-small text-text-sub-500'>{display}</span>;
  }

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            className='paragraph-small text-text-sub-500 block min-w-0 truncate'
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

function nameCell(value) {
  const display = value == null || value === '' ? '--' : String(value);
  if (display === '--') {
    return (
      <span className='truncate paragraph-small font-medium text-text-main-900'>{display}</span>
    );
  }

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span className='truncate paragraph-small font-medium text-text-main-900' title={display}>
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

function PackageItemNameWithCheckbox({ product, checked, onCheckedChange, children }) {
  return (
    <div className='flex min-w-0 items-center gap-3'>
      <Checkbox.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={`Select ${product.name || 'item'}`}
        className='shrink-0'
      />
      <div className='min-w-0 flex-1 overflow-hidden'>{children}</div>
    </div>
  );
}

function normalizeQuantity(value) {
  const normalized = String(value ?? '').trim();
  const parsed = Number(normalized);
  if (!normalized || !Number.isFinite(parsed) || parsed < 1) return '1';
  return String(Math.floor(parsed));
}

function QuantityInput({ rowId, value, disabled, onCommit }) {
  const [localValue, setLocalValue] = useState(value ?? '1');

  useEffect(() => {
    setLocalValue(value ?? '1');
  }, [rowId, value]);

  const commitValue = useCallback(() => {
    const nextValue = normalizeQuantity(localValue);
    setLocalValue(nextValue);
    onCommit(rowId, nextValue);
  }, [localValue, onCommit, rowId]);

  return (
    <input
      type='number'
      min='1'
      value={localValue}
      onChange={(event) => setLocalValue(event.target.value)}
      onBlur={commitValue}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
      }}
      disabled={disabled}
      className='h-8 w-12 min-w-12 border-0 bg-transparent p-0 text-paragraph-sm text-text-sub-500 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
    />
  );
}

export default function ProductPackageDetailItemsTable({
  products = [],
  categoryFilters = {},
  onSaveBundleItems,
  isSavingBundleItems = false,
}) {
  const [rows, setRows] = useState(products);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sorting, setSorting] = useState([]);

  useEffect(() => {
    setRows(products);
  }, [products]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const savedProductIds = useMemo(
    () => rows.filter((row) => !row.isDraft).map((row) => row.id),
    [rows],
  );

  const allSelected = rows.length > 0 && rows.every((item) => selectedSet.has(item.id));
  const someSelected = rows.some((item) => selectedSet.has(item.id)) && !allSelected;

  const handleToggleAll = useCallback(
    (checked) => {
      if (checked) {
        setSelectedIds(rows.map((item) => item.id));
        return;
      }
      setSelectedIds([]);
    },
    [rows],
  );

  const handleToggleOne = useCallback((id, checked) => {
    setSelectedIds((current) => {
      if (checked) return [...current, id];
      return current.filter((itemId) => itemId !== id);
    });
  }, []);

  const persistBundleItems = useCallback(
    async (nextRows, { errorMessage } = {}) => {
      if (!onSaveBundleItems) return;

      try {
        await onSaveBundleItems(toBundleItemsPayload(nextRows));
      } catch (error) {
        setRows(rows);
        if (errorMessage) {
          showErrorToast(error, { defaultMessage: errorMessage });
        }
      }
    },
    [onSaveBundleItems, rows],
  );

  const handleAddRow = useCallback(() => {
    setRows((current) => [...current, createPackageDraftItemRow()]);
  }, []);

  const handleDeleteRow = useCallback(
    async (rowId) => {
      const nextRows = rows.filter((row) => row.id !== rowId);
      setRows(nextRows);
      setSelectedIds((current) => current.filter((id) => id !== rowId));
      await persistBundleItems(nextRows);
    },
    [persistBundleItems, rows],
  );

  const handleProductSelect = useCallback(
    async (rowId, selectedProduct) => {
      const nextRows = rows.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...selectedProduct,
          id: selectedProduct.id,
          quantity: row.quantity || '1',
          isDraft: false,
        };
      });

      setRows(nextRows);
      await persistBundleItems(nextRows, {
        errorMessage: 'Failed to add package item.',
      });
    },
    [persistBundleItems, rows],
  );

  const handleQuantityCommit = useCallback(
    async (rowId, quantity) => {
      const currentRow = rows.find((row) => row.id === rowId);
      if (!currentRow || currentRow.isDraft || currentRow.quantity === quantity) return;

      const nextRows = rows.map((row) => (row.id === rowId ? { ...row, quantity } : row));
      setRows(nextRows);
      await persistBundleItems(nextRows);
    },
    [persistBundleItems, rows],
  );

  const columns = useMemo(() => {
    const dataColumns = ITEM_COLUMNS.map((columnConfig) => ({
      id: columnConfig.id,
      accessorKey: columnConfig.id,
      enableSorting: Boolean(columnConfig.sortable),
      header: ({ column }) => {
        if (columnConfig.id === 'name') {
          return (
            <div className='flex items-center gap-3'>
              <Checkbox.Root
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={handleToggleAll}
                aria-label='Select all items'
              />
              <Table.SortableHeader
                column={column}
                label={columnConfig.label}
                sortable={column.getCanSort()}
              />
            </div>
          );
        }

        return (
          <Table.SortableHeader
            column={column}
            label={columnConfig.label}
            sortable={column.getCanSort()}
          />
        );
      },
      cell: ({ row }) => {
        const item = row.original;

        if (columnConfig.id === 'name') {
          const nameContent = item.isDraft ? (
            <ProductPackageDetailItemNameSearch
              value=''
              categoryFilters={categoryFilters}
              excludeProductIds={savedProductIds.filter((id) => id !== item.id)}
              onSelect={(selectedProduct) => handleProductSelect(item.id, selectedProduct)}
              disabled={isSavingBundleItems}
            />
          ) : (
            <div className='flex min-w-0 items-center gap-3'>
              {item.imageUrl ? (
                <img src={item.imageUrl} alt='' className='size-8 shrink-0 rounded object-cover' />
              ) : (
                <div className='size-8 shrink-0 rounded bg-bg-weak-100' aria-hidden />
              )}
              {nameCell(item.name)}
            </div>
          );

          return (
            <PackageItemNameWithCheckbox
              product={item}
              checked={selectedSet.has(item.id)}
              onCheckedChange={(checked) => handleToggleOne(item.id, checked)}
            >
              {nameContent}
            </PackageItemNameWithCheckbox>
          );
        }

        if (columnConfig.id === 'quantity') {
          return (
            <QuantityInput
              rowId={item.id}
              value={item.quantity}
              disabled={isSavingBundleItems || item.isDraft}
              onCommit={handleQuantityCommit}
            />
          );
        }

        if (columnConfig.id === 'status') {
          return defaultProductsStatusCell({ row: { original: item } });
        }

        return textCell(item[columnConfig.id]);
      },
      meta: { columnConfig },
    }));

    return [
      ...dataColumns,
      {
        id: 'actions',
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => (
          <div className='flex items-center justify-center'>
            <CompactButton.Root
              type='button'
              variant='ghost'
              size='medium'
              className='p-0.5 text-text-soft-400 hover:text-text-strong-950'
              onClick={() => handleDeleteRow(row.original.id)}
              disabled={isSavingBundleItems}
              aria-label={`Remove ${row.original.name || 'item'}`}
            >
              <CompactButton.Icon as={RiDeleteBinLine} />
            </CompactButton.Root>
          </div>
        ),
        meta: { isActions: true },
      },
    ];
  }, [
    allSelected,
    someSelected,
    categoryFilters,
    handleDeleteRow,
    handleProductSelect,
    handleQuantityCommit,
    handleToggleAll,
    handleToggleOne,
    isSavingBundleItems,
    savedProductIds,
    selectedSet,
  ]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: true,
  });

  const tableRows = table.getRowModel().rows;

  return (
    <div className='flex w-full min-w-0 flex-col bg-bg-white-0'>
      <div className='flex shrink-0 items-center justify-between px-6 py-2'>
        <span className='text-[16px] font-semibold leading-6 text-text-sub-500'>Items</span>
        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='xsmall'
          className='min-w-[76px] gap-1 shadow-regular-xs'
          onClick={handleAddRow}
          disabled={isSavingBundleItems}
        >
          <Button.Icon as={RiAddLine} />
          Add
        </Button.Root>
      </div>

      <div className='w-full min-w-0 px-6 pb-5 pt-2'>
        <div className='w-full min-w-0 overflow-x-auto'>
          <table className='w-max min-w-full border-separate border-spacing-0'>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className='bg-bg-weak-100'>
                  {headerGroup.headers.map((header) => {
                    const columnConfig = header.column.columnDef.meta?.columnConfig;
                    const isActions = header.column.columnDef.meta?.isActions;

                    return (
                      <th
                        key={header.id}
                        className={cn(
                          !isActions && HEAD_CELL_CLASS,
                          columnConfig?.className,
                          columnConfig?.sticky && STICKY_LEFT_HEAD_CLASS,
                          columnConfig?.id !== 'name' && columnConfig?.headerClassName,
                          columnConfig?.id === 'name' && 'overflow-hidden',
                          isActions && STICKY_RIGHT_HEAD_CLASS,
                        )}
                        aria-label={isActions ? 'Actions' : undefined}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className='px-3 py-8 text-center text-paragraph-sm text-text-soft-400'
                  >
                    No products in this package.
                  </td>
                </tr>
              ) : (
                tableRows.map((row, rowIndex) => {
                  const isLastRow = rowIndex === tableRows.length - 1;

                  return (
                    <tr key={row.id} className='group bg-bg-white-0'>
                      {row.getVisibleCells().map((cell) => {
                        const columnConfig = cell.column.columnDef.meta?.columnConfig;
                        const isActions = cell.column.columnDef.meta?.isActions;

                        return (
                          <td
                            key={cell.id}
                            className={cn(
                              !isActions && BODY_CELL_CLASS,
                              !isLastRow && 'border-b border-stroke-soft-200',
                              columnConfig?.className,
                              columnConfig?.sticky && STICKY_LEFT_CELL_CLASS,
                              columnConfig?.id === 'name' && 'overflow-hidden',
                              isActions && STICKY_RIGHT_CELL_CLASS,
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
