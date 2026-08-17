import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { showSuccessToast, showErrorToast, serializeError } from '@/utils/error-utils';
import { safeDisplayDateTime } from '@/utils/date-utils';
import emptyState from '@/assets/images/empty-state.png';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as Input from '@/components/ui/input';
import * as Badge from '@/components/ui/badge';
import * as Filter from '@/components/ui/filter';
import * as Popover from '@/components/ui/popover';
import * as Tooltip from '@/components/ui/tooltip';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import {
  RiArrowRightSLine,
  RiSearchLine,
  RiAddLine,
  RiPencilLine,
  RiLayoutColumnLine,
} from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Table from '@/components/ui/table';
import AddOpexModal from '@/components/opex-management/add-opex-modal';
import EditOpexModal from '@/components/opex-management/edit-opex-modal';
import RemoveOpexModal from '@/components/opex-management/remove-opex-modal';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig } from '@/lib/column-utils';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import {
  fetchClientOpexCategories,
  fetchClientOpexCategoryFilters,
  createClientOpexCategory,
  selectClientOpexCategories,
  clearClientCategoryMutationStatus,
  resetClientCategories,
  fetchClientOpexColumnList,
  saveClientOpexColumnList,
  updateClientOpexCategory,
} from '@/redux/opexSlice';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';

// ---------------------------------------------------------------------------
// Settings > Opex Categories > Category tab — filter dropdown persistence
// ---------------------------------------------------------------------------
const OPEX_CATEGORY_FILTERS_STORAGE_KEY = 'settings-opex-categories-view-filter-dropdown';
const OPEX_CATEGORY_FILTER_KEYS = ['category', 'status'];
const DEFAULT_OPEX_CATEGORY_FILTERS = Object.freeze({ category: [], status: [] });

const trimOpexCategoryList = (values) =>
  Array.isArray(values) ? values.map((v) => String(v).trim()).filter(Boolean) : [];

const mergeStoredOpexCategoryFilters = (stored) => {
  const merged = { ...DEFAULT_OPEX_CATEGORY_FILTERS };
  if (!stored || typeof stored !== 'object') return merged;
  for (const key of OPEX_CATEGORY_FILTER_KEYS) {
    if (Array.isArray(stored[key])) merged[key] = trimOpexCategoryList(stored[key]);
  }
  return merged;
};

const ClientOpexCategories = ({ slotBeforeToolbar }) => {
  const dispatch = useDispatch();
  const clientCategories = useSelector(selectClientOpexCategories);
  const opexData = clientCategories.rows;
  const filterData = clientCategories.filterOptions;
  const { page, hasMore, isLoadingMore, status } = clientCategories;
  const isFetchLoading = status === 'loading' && opexData.length === 0;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('category');
  const [persistedFilters, setFilters] = usePersistedFilters({
    storageKey: OPEX_CATEGORY_FILTERS_STORAGE_KEY,
    defaultFilters: DEFAULT_OPEX_CATEGORY_FILTERS,
    persistTrimStringArrays: true,
  });
  const filters = useMemo(
    () => mergeStoredOpexCategoryFilters(persistedFilters),
    [persistedFilters],
  );
  const [filterSearchText, setFilterSearchText] = useState('');
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const lastApiCallRef = useRef('');

  const isAddLoading = clientCategories.createStatus === 'loading';
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const isEditLoading = clientCategories.updateStatus === 'loading';
  const [editOpexData, setEditOpexData] = useState(null);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [isRemoveLoading, setIsRemoveLoading] = useState(false);
  const [removeOpexData, setRemoveOpexData] = useState(null);

  useEffect(() => {
    const currentApiCall = `${debouncedSearchTerm}-${JSON.stringify(filters)}`;
    if (lastApiCallRef.current !== currentApiCall) {
      dispatch(resetClientCategories());
      lastApiCallRef.current = currentApiCall;
    }

    dispatch(
      fetchClientOpexCategories({
        keyword: debouncedSearchTerm,
        filters,
        page: 1,
        pageSize: 20,
        append: false,
      }),
    );
  }, [debouncedSearchTerm, dispatch, filters]);

  useEffect(() => {
    dispatch(fetchClientOpexCategoryFilters());
  }, [dispatch]);

  useEffect(() => {
    return () => {
      lastApiCallRef.current = '';
      dispatch(resetClientCategories());
    };
  }, [dispatch]);

  const handleLoadMore = useCallback(() => {
    if (status === 'loading' || isLoadingMore || !hasMore) return;

    dispatch(
      fetchClientOpexCategories({
        keyword: debouncedSearchTerm,
        filters,
        page: page + 1,
        pageSize: 20,
        append: true,
      }),
    );
  }, [debouncedSearchTerm, filters, page, dispatch, status, isLoadingMore, hasMore]);

  const { sentinelRef } = useScrollPagination({
    onLoadMore: handleLoadMore,
    hasMore,
    isLoading: isLoadingMore || status === 'loading',
    threshold: 200,
    enabled: true,
  });

  const previousRowsLengthRef = useRef(opexData.length);
  const scrollPositionBeforeUpdateRef = useRef(0);
  const isAppendingRef = useRef(false);

  React.useLayoutEffect(() => {
    if (opexData.length > previousRowsLengthRef.current) {
      scrollPositionBeforeUpdateRef.current =
        window.pageYOffset || document.documentElement.scrollTop;
      isAppendingRef.current = true;
    }
    previousRowsLengthRef.current = opexData.length;
  }, [opexData.length]);

  React.useLayoutEffect(() => {
    if (isAppendingRef.current && !isLoadingMore && scrollPositionBeforeUpdateRef.current > 0) {
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
      if (Math.abs(scrollPositionBeforeUpdateRef.current - currentScroll) > 5) {
        window.scrollTo(0, scrollPositionBeforeUpdateRef.current);
      }
      isAppendingRef.current = false;
      scrollPositionBeforeUpdateRef.current = 0;
    }
  }, [opexData.length, isLoadingMore]);

  const handleAddOpex = useCallback(
    async (data) => {
      try {
        await dispatch(createClientOpexCategory(data)).unwrap();
        showSuccessToast('New operational expense added successfully.');
        setIsAddModalOpen(false);
        dispatch(
          fetchClientOpexCategories({
            keyword: debouncedSearchTerm,
            filters,
            page: 1,
            pageSize: 20,
            append: false,
          }),
        ).unwrap();
      } catch (error) {
        const error_ = serializeError(error);
        showErrorToast(error_);
      }
    },
    [dispatch, debouncedSearchTerm, filters],
  );

  const handleEditOpex = useCallback(
    async (data) => {
      try {
        await dispatch(updateClientOpexCategory(data)).unwrap();
        showSuccessToast('Operational expense updated successfully.');
        setIsEditModalOpen(false);
        setEditOpexData(null);
        dispatch(
          fetchClientOpexCategories({
            keyword: debouncedSearchTerm,
            filters,
            page: 1,
            pageSize: 20,
            append: false,
          }),
        );
      } catch (error) {
        const error_ = serializeError(error);
        showErrorToast(error_);
      }
    },
    [dispatch, debouncedSearchTerm, filters],
  );

  const handleRemoveOpex = useCallback(async () => {
    try {
      setIsRemoveLoading(true);
      setIsRemoveModalOpen(false);
      setRemoveOpexData(null);
    } catch (error) {
      const error_ = serializeError(error);
      showErrorToast(error_);
    } finally {
      setIsRemoveLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAddModalOpen && !isEditModalOpen && !isRemoveModalOpen) {
      dispatch(clearClientCategoryMutationStatus());
    }
  }, [isAddModalOpen, isEditModalOpen, isRemoveModalOpen, dispatch]);

  const FILTER_TAB_CONFIG = [
    { value: 'category', label: 'Category' },
    { value: 'status', label: 'Status' },
  ];

  const defaultColumns = useMemo(
    () => [
      { id: 'name', label: 'Name', visible: true },
      { id: 'category', label: 'Category', visible: true },
      { id: 'expense_month_basis', label: 'Expense Month Basis', visible: true },
      { id: 'status', label: 'Status', visible: true },
      { id: 'type', label: 'Type', visible: true },
      { id: 'created_by', label: 'Created By', visible: false },
      { id: 'created_at', label: 'Created At', visible: false },
    ],
    [],
  );

  const defaultColumnConfig = useMemo(
    () => prepareColumnsForConfig(defaultColumns),
    [defaultColumns],
  );

  const persistCall = useCallback(
    async (cols) => {
      await dispatch(saveClientOpexColumnList(cols)).unwrap();
    },
    [dispatch],
  );

  const getCall = useCallback(async () => {
    const result = await dispatch(fetchClientOpexColumnList()).unwrap();
    return result;
  }, [dispatch]);

  const columnConfigHook = useColumnConfig(
    'client-opex-table',
    defaultColumnConfig,
    persistCall,
    getCall,
  );

  const statueColor = {
    Active: 'green',
    Inactive: 'gray',
  };

  const columnDefs = useMemo(
    () => ({
      name: {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }) => <Table.SortableHeader column={column} label='Name' sortable />,
        cell: ({ row }) => {
          const { name } = row.original;
          return (
            <Tooltip.Root size='xsmall'>
              <Tooltip.Trigger asChild>
                <span className='block max-w-[550px] whitespace-nowrap overflow-hidden text-ellipsis'>
                  {name}
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content side='bottom'>{name}</Tooltip.Content>
            </Tooltip.Root>
          );
        },
        meta: {
          headClassName: 'min-w-[160px] whitespace-nowrap',
          cellClassName: 'min-w-[160px] max-w-[260px] whitespace-nowrap',
        },
        enableSorting: true,
      },
      category: {
        id: 'category',
        accessorKey: 'parent_opex_category',
        header: ({ column }) => <Table.SortableHeader column={column} label='Category' sortable />,
        cell: ({ row }) => {
          const category = row.original.parent_opex_category;
          return (
            <Tooltip.Root size='xsmall'>
              <Tooltip.Trigger asChild>
                <span className='block max-w-[550px] whitespace-nowrap overflow-hidden text-ellipsis'>
                  {category}
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content side='bottom'>{category}</Tooltip.Content>
            </Tooltip.Root>
          );
        },
        meta: {
          headClassName: 'min-w-[150px] whitespace-nowrap',
          cellClassName: 'min-w-[150px] max-w-[260px] whitespace-nowrap',
        },
        enableSorting: true,
      },
      expense_month_basis: {
        id: 'expense_month_basis',
        accessorKey: 'expense_month_basis',
        header: ({ column }) => (
          <Table.SortableHeader column={column} label='Expense Month Basis' sortable />
        ),
        cell: ({ row }) => row.original.expense_month_basis || '--',
        meta: {
          headClassName: 'min-w-[180px] whitespace-nowrap',
          cellClassName: 'min-w-[180px] whitespace-nowrap',
        },
        enableSorting: true,
      },
      created_by: {
        id: 'created_by',
        header: ({ column }) => (
          <Table.SortableHeader column={column} label='Created By' sortable />
        ),
        accessorKey: 'owner',
        cell: ({ row }) => row.original.owner,
        meta: {
          headClassName: 'min-w-[150px] whitespace-nowrap',
          cellClassName: 'min-w-[150px] whitespace-nowrap',
        },
        enableSorting: true,
      },
      created_at: {
        id: 'created_at',
        accessorKey: 'creation',
        header: ({ column }) => (
          <Table.SortableHeader column={column} label='Created At' sortable />
        ),
        cell: ({ row }) => safeDisplayDateTime(row.original.creation),
        meta: {
          headClassName: 'min-w-[150px] whitespace-nowrap',
          cellClassName: 'min-w-[150px] whitespace-nowrap',
        },
        enableSorting: true,
      },
      status: {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }) => <Table.SortableHeader column={column} label='Status' sortable />,
        cell: ({ row }) => (
          <Badge.Root size='small' variant='light' color={statueColor[row.original.status]}>
            {row.original.status}
          </Badge.Root>
        ),
        enableSorting: true,
      },
      type: {
        id: 'type',
        accessorKey: 'type',
        header: ({ column }) => <Table.SortableHeader column={column} label='Type' sortable />,
        cell: ({ row }) => row.original.type,
        meta: {
          headClassName: 'min-w-[150px] whitespace-nowrap',
          cellClassName: 'min-w-[150px] whitespace-nowrap',
        },
        enableSorting: true,
      },
    }),
    [],
  );

  const actionsColumn = useMemo(
    () => ({
      id: 'actions',
      header: <div className='invisible'>A</div>,
      enableHiding: false,
      cell: ({ row }) => (
        <div className='flex items-center justify-end gap-1'>
          <Button.Root
            variant='neutral'
            mode='ghost'
            size='xsmall'
            type='button'
            className='hover:bg-bg-weak-100'
            onClick={() => {
              setEditOpexData(row.original);
              setIsEditModalOpen(true);
            }}
          >
            <Button.Icon as={RiPencilLine} />
          </Button.Root>
        </div>
      ),
      enableSorting: false,
      meta: {
        headClassName: 'sticky right-0 z-30 bg-bg-weak-50',
        cellClassName: 'border-stroke-soft-200 sticky right-0 z-30 bg-white',
      },
    }),
    [],
  );

  const tableColumns = useMemo(() => {
    const configuredColumns = columnConfigHook.columns
      .filter((col) => col.visible)
      .map((col) => columnDefs[col.id])
      .filter(Boolean);
    return [...configuredColumns, actionsColumn];
  }, [columnConfigHook.columns, columnDefs, actionsColumn]);

  const filterOptions = useMemo(() => {
    const categoryOptions = (filterData || []).map((c) => ({
      value: c.category || c.name,
      label: c.category || c.name,
    }));

    const statusOptions = [
      { value: 'Active', label: 'Active' },
      { value: 'Inactive', label: 'Inactive' },
    ];

    return {
      category: categoryOptions,
      status: statusOptions,
    };
  }, [filterData]);

  const filteredFilterOptions = useMemo(() => {
    const options = filterOptions[activeFilterTab] || [];
    if (!filterSearchText) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(filterSearchText.toLowerCase()),
    );
  }, [activeFilterTab, filterOptions, filterSearchText]);

  const handleFilterToggle = useCallback(
    (value) => {
      setFilters((previous) => {
        const merged = mergeStoredOpexCategoryFilters(previous);
        const currentList = merged[activeFilterTab] || [];
        const isSelected = currentList.includes(value);
        const newValues = isSelected
          ? currentList.filter((item) => item !== value)
          : [...currentList, value];
        return { ...merged, [activeFilterTab]: newValues };
      });
    },
    [activeFilterTab, setFilters],
  );

  const handleFilterClear = useCallback(() => {
    setFilters({ ...DEFAULT_OPEX_CATEGORY_FILTERS });
    setFilterSearchText('');
  }, [setFilters]);

  const filterCount = Object.values(filters).reduce((sum, array) => sum + array.length, 0);

  const table = useReactTable({
    data: opexData,
    columns: tableColumns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
  });

  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

  return (
    <div className='w-full flex flex-col gap-5 items-center justify-center'>
      <div className='w-full flex items-center justify-between gap-[16px]'>
        {slotBeforeToolbar}
        <div className='flex items-center justify-end gap-3'>
          <div className='w-64'>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  value={searchTerm}
                  onChange={handleSearchChange}
                  type='text'
                  placeholder='Search here...'
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <Popover.Root open={filterOpen} onOpenChange={setFilterOpen}>
            <Filter.TriggerButton
              filterCount={filterCount}
              onClear={handleFilterClear}
              ariaLabel='Filter OPEX'
            />

            <Filter.Root>
              <Filter.Header title='FILTERS' onClear={handleFilterClear} />
              <Filter.Body>
                <Filter.Sidebar width='180px'>
                  <TabMenuVertical.Root value={activeFilterTab} onValueChange={setActiveFilterTab}>
                    <TabMenuVertical.List className='p-2 border-r-0'>
                      {FILTER_TAB_CONFIG.map((tab) => {
                        const count = filters[tab.value]?.length || 0;
                        return (
                          <TabMenuVertical.Trigger
                            className='w-full flex items-center justify-between'
                            key={tab.value}
                            value={tab.value}
                          >
                            {tab.label}
                            {count > 0 ? (
                              <Badge.Root
                                size='medium'
                                variant='filled'
                                className='shrink-0 rounded-full bg-black text-white'
                              >
                                {count}
                              </Badge.Root>
                            ) : (
                              <RiArrowRightSLine size={16} />
                            )}
                          </TabMenuVertical.Trigger>
                        );
                      })}
                    </TabMenuVertical.List>
                  </TabMenuVertical.Root>
                </Filter.Sidebar>

                <Filter.Content width='300px'>
                  <Filter.List
                    options={filteredFilterOptions}
                    selectedValues={filters[activeFilterTab] || []}
                    onToggle={handleFilterToggle}
                    searchValue={filterSearchText}
                    onSearchChange={setFilterSearchText}
                  />
                </Filter.Content>
              </Filter.Body>
            </Filter.Root>
          </Popover.Root>

          <ColumnManagerDropdown
            open={isColumnManagerOpen}
            onOpenChange={setIsColumnManagerOpen}
            config={columnConfigHook}
            tooltipContent={<p>Manage columns</p>}
            trigger={
              <Button.Root variant='neutral' mode='stroke' size='small' className=''>
                <Button.Icon as={RiLayoutColumnLine} />
              </Button.Root>
            }
          />

          <Button.Root
            variant='primary'
            mode='filled'
            size='xsmall'
            type='button'
            className='w-[68px] h-[32px] px-1 gap-2'
            onClick={() => setIsAddModalOpen(true)}
          >
            <Button.Icon as={RiAddLine} />
            Add
          </Button.Root>
        </div>
      </div>

      <div className='w-full overflow-x-auto'>
        {isFetchLoading ? (
          <Table.Root variant='compact'>
            <Table.Header>
              {table.getHeaderGroups().map((hg) => (
                <Table.Row key={hg.id}>
                  {hg.headers.map((header) => (
                    <Table.Head
                      key={header.id}
                      className={`whitespace-nowrap ${header.column.columnDef.meta?.headClassName || ''}`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </Table.Head>
                  ))}
                </Table.Row>
              ))}
            </Table.Header>
            <Table.Body>
              {Array.from({ length: 5 }).map((_, index, array) => {
                const colCount = table.getHeaderGroups()[0]?.headers.length || 4;
                return (
                  <React.Fragment key={`skeleton-row-${index}`}>
                    <Table.Row>
                      {Array.from({ length: colCount }).map((__, cellIndex) => (
                        <Table.Cell
                          key={`skeleton-cell-${index}-${cellIndex}`}
                          className='text-text-sub-500 text-paragraph-sm'
                        >
                          <div className='h-4 w-3/4 bg-bg-weak-50 rounded animate-pulse' />
                        </Table.Cell>
                      ))}
                    </Table.Row>
                    {index < array.length - 1 && <Table.RowDivider />}
                  </React.Fragment>
                );
              })}
            </Table.Body>
          </Table.Root>
        ) : opexData.length > 0 ? (
          <Table.Root variant='compact'>
            <Table.Header>
              {table.getHeaderGroups().map((hg) => (
                <Table.Row key={hg.id}>
                  {hg.headers.map((header) => (
                    <Table.Head
                      key={header.id}
                      className={`whitespace-nowrap ${header.column.columnDef.meta?.headClassName || ''}`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </Table.Head>
                  ))}
                </Table.Row>
              ))}
            </Table.Header>
            <Table.Body>
              {table.getRowModel().rows.map((row, index, array) => (
                <React.Fragment key={row.id}>
                  <Table.Row>
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell
                        key={cell.id}
                        className={`text-text-sub-500 text-paragraph-sm ${cell.column.columnDef.meta?.cellClassName || ''}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext()) ||
                          cell.renderValue()}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                  {index < array.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))}
              {hasMore && (
                <Table.Row ref={sentinelRef}>
                  <Table.Cell colSpan={tableColumns.length} className='p-0 h-1' />
                </Table.Row>
              )}
              {isLoadingMore && (
                <Table.Row>
                  <Table.Cell colSpan={tableColumns.length} className='py-4 text-center'>
                    <div className='flex items-center justify-center gap-2'>
                      <span className='h-4 w-4 rounded-full border-2 border-[var(--color-border-brand-strong)] border-t-transparent animate-spin' />
                      <span className='paragraph-small text-[var(--color-text-sub-600)]'>
                        Loading more...
                      </span>
                    </div>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        ) : (
          <div className='w-full flex flex-col items-center justify-center gap-4 py-10'>
            <img className='object-contain' src={emptyState} alt='no results' />
            <span className='label-medium text-[var(--color-text-soft-400)]'>
              No results found for your search.
            </span>
          </div>
        )}
      </div>

      <AddOpexModal
        isOpen={isAddModalOpen}
        isLoading={isAddLoading}
        handleOpenChange={setIsAddModalOpen}
        handleSave={handleAddOpex}
        categoryOptions={filterData}
      />

      <EditOpexModal
        isOpen={isEditModalOpen}
        isLoading={isEditLoading}
        handleOpenChange={setIsEditModalOpen}
        opexData={editOpexData}
        handleSave={handleEditOpex}
        categoryOptions={filterData}
      />

      <RemoveOpexModal
        isOpen={isRemoveModalOpen}
        isLoading={isRemoveLoading}
        handleOpenChange={setIsRemoveModalOpen}
        opexData={removeOpexData}
        handleRemove={handleRemoveOpex}
      />
    </div>
  );
};

export default ClientOpexCategories;
