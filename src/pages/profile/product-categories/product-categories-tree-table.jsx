import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RiAddLine, RiArrowDownSFill, RiDeleteBinLine, RiSearchLine } from 'react-icons/ri';

import * as CompactButton from '@/components/ui/compact-button';
import * as Input from '@/components/ui/input';
import * as Table from '@/components/ui/table';
import {
  CategoryDraftSelect,
  CategoryDraftTextInput,
  CategoryHsnSelect,
} from '@/pages/profile/product-categories/product-categories-inline-field';
import {
  getProductCategoryAssetType,
  getProductCategoryTabPlaceholders,
  PRODUCT_CATEGORY_ASSET_TYPE_OPTIONS,
  PRODUCT_CATEGORY_FIELD_KEYS,
  PRODUCT_CATEGORY_TAB_IDS,
} from '@/pages/profile/product-categories/constants';
import {
  buildProductCategoryTree,
  canAddRootCategoryGroup,
  getProductCategoryTreeIndent,
  getVisibleProductCategoryTreeRows,
  PRODUCT_CATEGORY_CHILD_TAB,
} from '@/pages/profile/product-categories/product-categories-tree-utils';
import { cn } from '@/utils/cn';
import { useDebounce } from '@/hooks/use-debounce';

function useStableCallback(callback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback((...args) => callbackRef.current?.(...args), []);
}

const ProductCategoriesTreeTable = ({
  rowsByTab,
  onRemoveRow,
  onAddCategoryGroup,
  onAddChild,
  onUpdateRow,
  onSaveRow,
  onNameChange,
  onAssetTypeChange,
  onHsnChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 200);
  const [sorting, setSorting] = useState([]);
  const tree = useMemo(() => buildProductCategoryTree(rowsByTab), [rowsByTab]);
  const [expandedById, setExpandedById] = useState({});

  const stableOnRemoveRow = useStableCallback(onRemoveRow);
  const stableOnAddChild = useStableCallback(onAddChild);
  const stableOnUpdateRow = useStableCallback(onUpdateRow);
  const stableOnSaveRow = useStableCallback(onSaveRow);
  const stableOnNameChange = useStableCallback(onNameChange);
  const stableOnAssetTypeChange = useStableCallback(onAssetTypeChange);
  const stableOnHsnChange = useStableCallback(onHsnChange);

  const visibleRows = useMemo(
    () => getVisibleProductCategoryTreeRows(tree, expandedById, debouncedSearchQuery),
    [tree, expandedById, debouncedSearchQuery],
  );

  const showAddCategoryGroup = canAddRootCategoryGroup();

  const toggleExpanded = useCallback((nodeId) => {
    setExpandedById((previous) => ({
      ...previous,
      [nodeId]: previous[nodeId] !== true,
    }));
  }, []);

  const handleAddChild = useCallback(
    (node) => {
      const childTabId = PRODUCT_CATEGORY_CHILD_TAB[node.tabId];
      if (!childTabId) return;

      setExpandedById((previous) => ({
        ...previous,
        [node.id]: true,
      }));
      stableOnAddChild(childTabId, node.row);
    },
    [stableOnAddChild],
  );

  const handleDelete = useCallback(
    (node) => {
      stableOnRemoveRow(node.tabId, node.row.id);
    },
    [stableOnRemoveRow],
  );

  const handleUpdateField = useCallback(
    (node, field, value) => {
      stableOnUpdateRow(node.tabId, node.row.id, { [field]: value });
    },
    [stableOnUpdateRow],
  );

  const handleDraftKeyDown = useCallback(
    (node, field, event, flushedValue) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      stableOnSaveRow(node.tabId, node.row.id, {
        [field]: flushedValue ?? event.currentTarget?.value ?? '',
      });
    },
    [stableOnSaveRow],
  );

  const handleAssetTypeChange = useCallback(
    (node, assetType) => {
      stableOnAssetTypeChange(node.tabId, node.row, assetType);
    },
    [stableOnAssetTypeChange],
  );

  const handleHsnChange = useCallback(
    (node, hsnCode) => {
      stableOnHsnChange(node.tabId, node.row, hsnCode);
    },
    [stableOnHsnChange],
  );

  const handleNameChange = useCallback(
    (node, name) => {
      stableOnNameChange(node.tabId, node.row, name);
    },
    [stableOnNameChange],
  );

  const isLeafLevel = (tabId) => tabId === PRODUCT_CATEGORY_TAB_IDS.PRODUCT_GROUP;

  const columns = useMemo(
    () => [
      {
        id: 'name',
        accessorFn: (node) => node.row.name ?? '',
        enableSorting: true,
        header: ({ column }) => (
          <Table.SortableHeader column={column} label='Name' sortable={column.getCanSort()} />
        ),
        cell: ({ row }) => {
          const node = row.original;
          const indent = getProductCategoryTreeIndent(node.depth);
          const isRoot = node.depth === 0;
          const isExpanded = expandedById[node.id] === true;
          const placeholders = getProductCategoryTabPlaceholders(node.tabId);

          return (
            <div
              className='flex h-10 min-w-0 items-center gap-1.5 pr-5'
              style={{ paddingLeft: indent }}
            >
              {node.isDraft ? (
                <div className='min-w-0 flex-1'>
                  <CategoryDraftTextInput
                    value={node.row.name}
                    onChange={(event) => handleUpdateField(node, 'name', event.target.value)}
                    onKeyDown={(event, flushedValue) =>
                      handleDraftKeyDown(node, 'name', event, flushedValue)
                    }
                    placeholder={placeholders.name}
                    isName={isRoot}
                  />
                </div>
              ) : (
                <>
                  <div className='min-w-0 flex-1'>
                    <CategoryDraftTextInput
                      value={node.row.name}
                      onChange={(event) => handleNameChange(node, event.target.value)}
                      placeholder={placeholders.name}
                      isName={isRoot}
                    />
                  </div>
                  {node.canAddChild ? (
                    <CompactButton.Root
                      type='button'
                      variant='ghost'
                      size='medium'
                      className='shrink-0 text-text-sub-500 opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100'
                      aria-label={`Add child to ${node.row.name}`}
                      onClick={() => handleAddChild(node)}
                    >
                      <CompactButton.Icon as={RiAddLine} className='-rotate-90' />
                    </CompactButton.Root>
                  ) : null}
                  {node.hasChildren ? (
                    <CompactButton.Root
                      type='button'
                      variant='ghost'
                      size='medium'
                      className='shrink-0 text-text-sub-500'
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      aria-expanded={isExpanded}
                      onClick={() => toggleExpanded(node.id)}
                    >
                      <CompactButton.Icon
                        as={RiArrowDownSFill}
                        className={cn(!isExpanded && '-rotate-90')}
                      />
                    </CompactButton.Root>
                  ) : null}
                </>
              )}
            </div>
          );
        },
        meta: { headClassName: 'flex-1' },
      },
      {
        id: 'description',
        accessorFn: (node) => node.row.description ?? '',
        enableSorting: true,
        header: ({ column }) => (
          <Table.SortableHeader
            column={column}
            label='Description'
            sortable={column.getCanSort()}
          />
        ),
        cell: ({ row }) => {
          const node = row.original;
          const placeholders = getProductCategoryTabPlaceholders(node.tabId);

          return (
            <div className='flex h-10 items-center px-3 pr-5'>
              {node.isDraft ? (
                <CategoryDraftTextInput
                  value={node.row.description}
                  onChange={(event) => handleUpdateField(node, 'description', event.target.value)}
                  onKeyDown={(event, flushedValue) =>
                    handleDraftKeyDown(node, 'description', event, flushedValue)
                  }
                  placeholder={placeholders.description}
                />
              ) : (
                <span className='paragraph-small truncate text-text-sub-500'>
                  {node.row.description}
                </span>
              )}
            </div>
          );
        },
        meta: { headClassName: 'flex-1' },
      },
      {
        id: 'assetType',
        accessorFn: (node) => getProductCategoryAssetType(node.row),
        enableSorting: true,
        header: ({ column }) => (
          <Table.SortableHeader column={column} label='Asset Type' sortable={column.getCanSort()} />
        ),
        cell: ({ row }) => {
          const node = row.original;

          return (
            <div className='flex h-10 items-center px-3'>
              <CategoryDraftSelect
                value={getProductCategoryAssetType(node.row)}
                onValueChange={(assetType) => handleAssetTypeChange(node, assetType)}
                options={PRODUCT_CATEGORY_ASSET_TYPE_OPTIONS}
                placeholder='Select'
              />
            </div>
          );
        },
        meta: { headClassName: 'w-[150px] shrink-0' },
      },
      {
        id: 'hsnCode',
        accessorFn: (node) => node.row[PRODUCT_CATEGORY_FIELD_KEYS.HSN_CODE] ?? '',
        enableSorting: true,
        header: ({ column }) => (
          <Table.SortableHeader column={column} label='HSN Code' sortable={column.getCanSort()} />
        ),
        cell: ({ row }) => {
          const node = row.original;

          return (
            <div className='flex h-10 min-w-0 items-center px-2'>
              {isLeafLevel(node.tabId) ? (
                <CategoryHsnSelect
                  value={node.row[PRODUCT_CATEGORY_FIELD_KEYS.HSN_CODE] || ''}
                  onValueChange={(hsnCode) => handleHsnChange(node, hsnCode)}
                />
              ) : (
                <span className='paragraph-small text-text-soft-400'>--</span>
              )}
            </div>
          );
        },
        meta: { headClassName: 'w-[180px] shrink-0' },
      },
      {
        id: 'actions',
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => {
          const node = row.original;

          return (
            <div className='flex h-10 items-center justify-center p-3'>
              <CompactButton.Root
                type='button'
                variant='ghost'
                size='medium'
                className='text-text-sub-500 hover:text-error-base'
                aria-label={node.isDraft ? 'Remove draft row' : `Delete ${node.row.name}`}
                onClick={() => handleDelete(node)}
              >
                <CompactButton.Icon as={RiDeleteBinLine} />
              </CompactButton.Root>
            </div>
          );
        },
        meta: { headClassName: 'w-16 shrink-0', isActions: true },
      },
    ],
    [expandedById],
  );

  const table = useReactTable({
    data: visibleRows,
    columns,
    getRowId: (row) => row.id,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: true,
    autoResetAll: false,
  });

  const tableRows = table.getRowModel().rows;

  return (
    <div className='flex w-full flex-col gap-5'>
      <div className='w-[276px]'>
        <Input.Root size='small'>
          <Input.Wrapper>
            <Input.Icon as={RiSearchLine} />
            <Input.Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder='Search here...'
              aria-label='Search categories'
            />
          </Input.Wrapper>
        </Input.Root>
      </div>

      <div className='w-full overflow-x-auto rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
        <Table.Root variant='compact' className='w-full overflow-visible' tableInstance={table}>
          <Table.Header>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id} className='border-0 hover:bg-transparent'>
                {headerGroup.headers.map((header) => (
                  <Table.Head
                    key={header.id}
                    column={header.column}
                    className={cn(
                      'h-9 border-0 bg-bg-weak-100 !rounded-none px-3 py-2 label-small font-medium text-text-soft-400',
                      header.column.columnDef.meta?.headClassName,
                      header.column.columnDef.meta?.isActions && 'p-0',
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </Table.Head>
                ))}
              </Table.Row>
            ))}
          </Table.Header>

          <Table.Body spacing={0}>
            {tableRows.map((row, index) => {
              const node = row.original;

              return (
                <React.Fragment key={node.id}>
                  <Table.Row className='group/row h-10 border-0 hover:bg-transparent'>
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell
                        key={cell.id}
                        column={cell.column}
                        className={cn(
                          'h-10 border-0 bg-bg-white-0 !rounded-none !p-0',
                          cell.column.id === 'name' && 'flex-1',
                          cell.column.id === 'description' && 'flex-1',
                          cell.column.id === 'assetType' && 'w-[150px] shrink-0',
                          cell.column.id === 'hsnCode' && 'w-[180px] shrink-0',
                          cell.column.id === 'actions' && 'w-16 shrink-0 p-0',
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    ))}
                  </Table.Row>

                  {index < tableRows.length - 1 ? (
                    <tr aria-hidden='true'>
                      <td colSpan={columns.length} className='py-[1.5px] !p-0'>
                        <div
                          className='h-px bg-stroke-soft-200'
                          style={{
                            marginLeft: getProductCategoryTreeIndent(
                              tableRows[index + 1].original.depth,
                            ),
                          }}
                        />
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}

            {showAddCategoryGroup ? (
              <>
                <Table.RowDivider className='[&_td]:!p-0' dividerClassName='!h-px' />

                <Table.Row className='border-0 bg-bg-weak-100 hover:bg-transparent'>
                  <Table.Cell
                    colSpan={5}
                    className='h-10 border-0 !rounded-none bg-bg-weak-100 px-3 py-2'
                  >
                    <button
                      type='button'
                      onClick={onAddCategoryGroup}
                      className='flex items-center gap-3 text-left paragraph-small text-text-sub-500 transition-colors hover:text-text-main-900'
                    >
                      <span
                        className='flex size-7 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'
                        aria-hidden
                      >
                        <RiAddLine className='size-5 text-text-sub-500' />
                      </span>
                      Add Category Group
                    </button>
                  </Table.Cell>
                </Table.Row>
              </>
            ) : null}
          </Table.Body>
        </Table.Root>
      </div>
    </div>
  );
};

export default ProductCategoriesTreeTable;
