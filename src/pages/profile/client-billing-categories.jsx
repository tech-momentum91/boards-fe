// React
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Third-party libraries
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  RiAddLine,
  RiArrowRightSLine,
  RiLayoutColumnLine,
  RiPencilLine,
  RiSearchLine,
} from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';

// UI Components
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Filter from '@/components/ui/filter';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as Table from '@/components/ui/table';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Tooltip from '@/components/ui/tooltip';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';

// Feature Components
import AddBillingCategoryModal from '@/components/billing-management/add-billing-category-modal';
import EditBillingCategoryModal from '@/components/billing-management/edit-billing-category-modal';

// Hooks
import { useColumnConfig } from '@/hooks/use-column-config';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';

// Utils
import { safeDisplayDateTime } from '@/utils/date-utils';
import { serializeError, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { prepareColumnsForConfig } from '@/lib/column-utils';

// Assets
import emptyState from '@/assets/images/empty-state.png';

// Redux Slice
import {
  clearClientCategoryMutationStatus,
  createClientBillingCategory,
  fetchClientBillingCategories,
  fetchClientBillingCategoryFilters,
  fetchClientBillingColumnList,
  resetClientCategories,
  saveClientBillingColumnList,
  selectClientBillingCategories,
  updateClientBillingCategory,
} from '@/redux/billingSlice';

// ---------------------------------------------------------------------------
// Settings > Billing Categories > Category tab — filter dropdown persistence
// ---------------------------------------------------------------------------
const BILLING_CATEGORY_FILTERS_STORAGE_KEY = 'settings-billing-categories-view-filter-dropdown';
const BILLING_CATEGORY_FILTER_KEYS = ['category', 'status'];
const DEFAULT_BILLING_CATEGORY_FILTERS = Object.freeze({ category: [], status: [] });

const trimBillingCategoryList = (values) =>
  Array.isArray(values) ? values.map((v) => String(v).trim()).filter(Boolean) : [];

const mergeStoredBillingCategoryFilters = (stored) => {
  const merged = { ...DEFAULT_BILLING_CATEGORY_FILTERS };
  if (!stored || typeof stored !== 'object') return merged;
  for (const key of BILLING_CATEGORY_FILTER_KEYS) {
    if (Array.isArray(stored[key])) merged[key] = trimBillingCategoryList(stored[key]);
  }
  return merged;
};

const ClientBillingCategories = ({ slotBeforeToolbar }) => {
  const dispatch = useDispatch();
  const clientCategories = useSelector(selectClientBillingCategories);
  const billingData = clientCategories.rows;
  const filterData = clientCategories.filterOptions;
  const { page, hasMore, isLoadingMore, status } = clientCategories;
  const isFetchLoading = status === 'loading' && billingData.length === 0;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // ─── UI State ───────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('category');
  const [persistedFilters, setFilters] = usePersistedFilters({
    storageKey: BILLING_CATEGORY_FILTERS_STORAGE_KEY,
    defaultFilters: DEFAULT_BILLING_CATEGORY_FILTERS,
    persistTrimStringArrays: true,
  });
  const filters = useMemo(
    () => mergeStoredBillingCategoryFilters(persistedFilters),
    [persistedFilters],
  );
  const [filterSearchText, setFilterSearchText] = useState('');
  const [localFilters, setLocalFilters] = useState(() => filters);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const filterWasOpenRef = useRef(false);

  // ─── Debounced search ───────────────────────────────────
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const lastApiCallRef = useRef('');

  // ─── Modal State ────────────────────────────────────────
  const isAddLoading = clientCategories.createStatus === 'loading';
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const isEditLoading = clientCategories.updateStatus === 'loading';
  const [editBillingData, setEditBillingData] = useState(null);

  // ─── Fetch data when search/filters change ─────────────
  useEffect(() => {
    const currentApiCall = `${debouncedSearchTerm}-${JSON.stringify(filters)}`;
    if (lastApiCallRef.current !== currentApiCall) {
      dispatch(resetClientCategories());
      lastApiCallRef.current = currentApiCall;
    }

    dispatch(
      fetchClientBillingCategories({
        keyword: debouncedSearchTerm,
        filters,
        page: 1,
        pageSize: 20,
        append: false,
      }),
    );
  }, [debouncedSearchTerm, dispatch, filters]);

  // ─── Fetch filter options on mount ─────────────────────
  useEffect(() => {
    dispatch(fetchClientBillingCategoryFilters());
  }, [dispatch]);

  // ─── Cleanup on unmount ────────────────────────────────
  useEffect(() => {
    return () => {
      lastApiCallRef.current = '';
      dispatch(resetClientCategories());
    };
  }, [dispatch]);

  useEffect(() => {
    if (filterWasOpenRef.current && !filterOpen) {
      setFilters(localFilters);
    }
    filterWasOpenRef.current = filterOpen;
  }, [filterOpen, localFilters, setFilters]);

  // ─── Scroll Pagination ─────────────────────────────────
  const handleLoadMore = useCallback(() => {
    if (status === 'loading' || isLoadingMore || !hasMore) return;

    dispatch(
      fetchClientBillingCategories({
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

  // Preserve scroll position when data is appended
  const previousRowsLengthRef = useRef(billingData.length);
  const scrollPositionBeforeUpdateRef = useRef(0);
  const isAppendingRef = useRef(false);

  React.useLayoutEffect(() => {
    if (billingData.length > previousRowsLengthRef.current) {
      scrollPositionBeforeUpdateRef.current =
        window.pageYOffset || document.documentElement.scrollTop;
      isAppendingRef.current = true;
    }
    previousRowsLengthRef.current = billingData.length;
  }, [billingData.length]);

  React.useLayoutEffect(() => {
    if (isAppendingRef.current && !isLoadingMore && scrollPositionBeforeUpdateRef.current > 0) {
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
      if (Math.abs(scrollPositionBeforeUpdateRef.current - currentScroll) > 5) {
        window.scrollTo(0, scrollPositionBeforeUpdateRef.current);
      }
      isAppendingRef.current = false;
      scrollPositionBeforeUpdateRef.current = 0;
    }
  }, [billingData.length, isLoadingMore]);

  // ─── Add Billing Category Handler ──────────────────────
  const handleAddBillingCategory = useCallback(
    async (data) => {
      try {
        await dispatch(createClientBillingCategory(data)).unwrap();
        showSuccessToast('New billing category added successfully.');
        setIsAddModalOpen(false);
        dispatch(
          fetchClientBillingCategories({
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

  // ─── Edit Billing Category Handler ────────────────────
  const handleEditBillingCategory = useCallback(
    async (data) => {
      try {
        await dispatch(updateClientBillingCategory(data)).unwrap();
        showSuccessToast('Billing category updated successfully.');
        setIsEditModalOpen(false);
        setEditBillingData(null);

        dispatch(
          fetchClientBillingCategories({
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

  // ─── Clean up mutation statuses when modals close ──────
  useEffect(() => {
    if (!isAddModalOpen && !isEditModalOpen) {
      dispatch(clearClientCategoryMutationStatus());
    }
  }, [isAddModalOpen, isEditModalOpen, dispatch]);

  // ─── Filter Config ─────────────────────────────────────

  const FILTER_TAB_CONFIG = [
    { value: 'category', label: 'Category' },
    { value: 'status', label: 'Status' },
  ];

  // ─── Column Management (Backend-driven) ────────────────

  const defaultColumns = useMemo(
    () => [
      { id: 'name', label: 'Name', visible: true },
      { id: 'clients', label: 'Clients', visible: true },
      { id: 'status', label: 'Status', visible: true },
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
      await dispatch(saveClientBillingColumnList(cols)).unwrap();
    },
    [dispatch],
  );

  const getCall = useCallback(async () => {
    const result = await dispatch(fetchClientBillingColumnList()).unwrap();
    return result;
  }, [dispatch]);

  const columnConfigHook = useColumnConfig(
    'client-billing-categories-table',
    defaultColumnConfig,
    persistCall,
    getCall,
  );

  const statusColor = {
    Active: 'green',
    Inactive: 'gray',
  };

  // ─── Column Definitions ────────────────────────────────
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
      clients: {
        id: 'clients',
        accessorKey: 'apply_to_clients',
        header: () => <span>Clients</span>,
        cell: ({ row }) => {
          const rawValue = row.original.apply_to_clients;

          if (!rawValue || (Array.isArray(rawValue) && rawValue.length === 0)) {
            return (
              <span className='text-paragraph-sm text-text-soft-400 whitespace-nowrap'>-</span>
            );
          }

          if (typeof rawValue === 'string') {
            // Backend sends "All Clients" as a string
            return <span className='text-paragraph-sm text-text-strong-950'>{rawValue}</span>;
          }

          const clients = Array.isArray(rawValue) ? rawValue : [rawValue];
          const visibleClients = clients.slice(0, 2);
          const remaining = clients.length - visibleClients.length;
          const remainingClients = remaining > 0 ? clients.slice(visibleClients.length) : [];

          return (
            <div className='flex flex-wrap items-center gap-1'>
              {visibleClients.map((clientName) => (
                <Tooltip.Root key={clientName} size='xsmall'>
                  <Tooltip.Trigger asChild>
                    <Badge.Root
                      size='small'
                      variant='light'
                      color='gray'
                      className='max-w-none whitespace-nowrap'
                    >
                      {String(clientName || '').length > 50
                        ? `${String(clientName).slice(0, 50)}...`
                        : clientName}
                    </Badge.Root>
                  </Tooltip.Trigger>
                  <Tooltip.Content side='bottom'>{clientName}</Tooltip.Content>
                </Tooltip.Root>
              ))}
              {remaining > 0 && (
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Badge.Root
                      size='small'
                      variant='outline'
                      color='gray'
                      className='cursor-default'
                    >
                      +{remaining}
                    </Badge.Root>
                  </Tooltip.Trigger>
                  <Tooltip.Content side='bottom' className='max-w-xs'>
                    <div className='flex flex-col gap-1'>
                      {remainingClients.map((clientName) => (
                        <span
                          key={clientName}
                          className='text-paragraph-xs text-white whitespace-nowrap'
                        >
                          {clientName}
                        </span>
                      ))}
                    </div>
                  </Tooltip.Content>
                </Tooltip.Root>
              )}
            </div>
          );
        },
        meta: {
          headClassName: 'min-w-[180px] whitespace-nowrap',
          cellClassName: 'min-w-[180px] max-w-[520px]',
        },
        enableSorting: false,
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
        cell: ({ row }) => {
          return (
            <Badge.Root size='small' variant='light' color={statusColor[row.original.status]}>
              {row.original.status}
            </Badge.Root>
          );
        },
        enableSorting: true,
      },
    }),
    [],
  );

  // Actions column - always sticky on the right, not part of column config
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
              setEditBillingData(row.original);
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

  // ─── Filter Logic ──────────────────────────────────────

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
      setLocalFilters((previous) => {
        const merged = mergeStoredBillingCategoryFilters(previous);
        const currentList = merged[activeFilterTab] || [];
        const isSelected = currentList.includes(value);
        const newValues = isSelected
          ? currentList.filter((item) => item !== value)
          : [...currentList, value];
        return { ...merged, [activeFilterTab]: newValues };
      });
    },
    [activeFilterTab],
  );

  const handleFilterClear = useCallback(
    (e) => {
      if (e?.stopPropagation) e.stopPropagation();
      if (e?.preventDefault) e.preventDefault();
      const clearedFilters = { ...DEFAULT_BILLING_CATEGORY_FILTERS };
      setLocalFilters(clearedFilters);
      setFilters(clearedFilters);
      setFilterSearchText('');
    },
    [setFilters],
  );

  const filterCount = Object.values(filterOpen ? localFilters : filters).reduce(
    (sum, array) => sum + array.length,
    0,
  );

  const table = useReactTable({
    data: billingData,
    columns: tableColumns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
  });

  // ─── Search handler ────────────────────────────────────
  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

  // ─── Render ────────────────────────────────────────────

  return (
    <div className='w-full flex flex-col gap-5 items-center justify-center'>
      <div className='w-full flex items-center gap-3 p-px'>
        {slotBeforeToolbar}
        <div className='flex items-center gap-3 ml-auto'>
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

          <Popover.Root
            open={filterOpen}
            onOpenChange={(open) => {
              if (open) {
                setLocalFilters(filters);
              }
              setFilterOpen(open);
            }}
          >
            <Filter.TriggerButton
              filterCount={filterCount}
              onClear={handleFilterClear}
              ariaLabel='Filter Billing Categories'
            />

            <Filter.Root>
              <Filter.Header title='FILTERS' onClear={handleFilterClear} />

              <Filter.Body>
                <Filter.Sidebar width='180px'>
                  <TabMenuVertical.Root value={activeFilterTab} onValueChange={setActiveFilterTab}>
                    <TabMenuVertical.List className='p-2 border-r-0'>
                      {FILTER_TAB_CONFIG.map((tab) => {
                        const count = localFilters[tab.value]?.length || 0;
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
                    selectedValues={localFilters[activeFilterTab] || []}
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
            className='px-[10px] gap-[8px]'
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
                      {Array.from({ length: colCount }).map((_, cellIndex) => (
                        <Table.Cell key={`skeleton-cell-${index}-${cellIndex}`}>
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
        ) : billingData.length > 0 ? (
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
                        className={cell.column.columnDef.meta?.cellClassName || ''}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext()) ||
                          cell.renderValue()}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                  {index < array.length - 1 && <Table.RowDivider />}
                </React.Fragment>
              ))}

              {/* Sentinel Row for Scroll Pagination */}
              {hasMore && (
                <Table.Row ref={sentinelRef}>
                  <Table.Cell colSpan={tableColumns.length} className='p-0 h-1' />
                </Table.Row>
              )}

              {/* Loading More Indicator */}
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

      {/* ─── Modals ────────────────────────────────────────── */}

      <AddBillingCategoryModal
        isOpen={isAddModalOpen}
        isLoading={isAddLoading}
        handleOpenChange={setIsAddModalOpen}
        handleSave={handleAddBillingCategory}
        categoryOptions={filterData}
      />

      <EditBillingCategoryModal
        isOpen={isEditModalOpen}
        isLoading={isEditLoading}
        handleOpenChange={setIsEditModalOpen}
        billingCategoryData={editBillingData}
        handleSave={handleEditBillingCategory}
      />
    </div>
  );
};

export default ClientBillingCategories;
