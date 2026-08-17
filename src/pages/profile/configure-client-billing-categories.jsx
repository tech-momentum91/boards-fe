// React
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Third-party libraries
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import {
  buildFrozenColumnPinning,
  getFrozenHeaderTableProps,
  getFrozenLeftColumnExtras,
  getFrozenRootTableProps,
  getFrozenTanStackColumnProp,
  getFrozenWrapperClassName,
} from '@/lib/frozen-table-columns';
import { findScrollableParent } from '@/components/event-management/event-participants-utils';
import {
  RiAddLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiCloseLine,
  RiSearchLine,
} from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
// UI Components
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Filter from '@/components/ui/filter';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as Table from '@/components/ui/table';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Tooltip from '@/components/ui/tooltip';

// Feature Components
import AddBillingCategoryModal from '@/components/billing-management/add-billing-category-modal';
import EditBillingCategoryModal from '@/components/billing-management/edit-billing-category-modal';

// Hooks
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';

// Utils
import { serializeError, showErrorToast, showSuccessToast } from '@/utils/error-utils';

// Assets
import emptyState from '@/assets/images/empty-state.png';

// Redux Slice
import {
  clearClientCategoryMutationStatus,
  createClientBillingCategory,
  fetchClientBillingCategories,
  fetchClients,
  fetchListingMatrix,
  resetClientCategories,
  selectClientBillingCategories,
  updateClientBillingCategory,
} from '@/redux/billingSlice';
import { fetchCenterAccess, selectCenterAccess } from '@/redux/centerSlice';

const PINNED_CENTER_COLUMN_ID = 'center';
const PINNED_CLIENT_COLUMN_ID = 'client';
const PINNED_LEFT_COLUMN_IDS = [PINNED_CENTER_COLUMN_ID, PINNED_CLIENT_COLUMN_ID];
// ---------------------------------------------------------------------------
// Settings > Billing Categories > Configure tab — filter dropdown persistence
// ---------------------------------------------------------------------------
// `filters` is the applied state (drives matrix fetch); `localFilters` is the
// in-popover staging buffer that commits on close. Only `filters` is persisted
// so unsaved staged edits never leak across sessions.
const BILLING_CONFIGURE_FILTERS_STORAGE_KEY = 'settings-billing-configure-view-filter-dropdown';
const BILLING_CONFIGURE_FILTER_KEYS = ['center', 'client'];
const DEFAULT_BILLING_CONFIGURE_FILTERS = Object.freeze({ center: [], client: [] });

const trimBillingConfigureList = (values) =>
  Array.isArray(values) ? values.map((v) => String(v).trim()).filter(Boolean) : [];

const mergeStoredBillingConfigureFilters = (stored) => {
  const merged = { ...DEFAULT_BILLING_CONFIGURE_FILTERS };
  if (!stored || typeof stored !== 'object') return merged;
  for (const key of BILLING_CONFIGURE_FILTER_KEYS) {
    if (Array.isArray(stored[key])) merged[key] = trimBillingConfigureList(stored[key]);
  }
  return merged;
};

const ConfigureClientBillingCategories = ({ slotBeforeToolbar }) => {
  const dispatch = useDispatch();
  const clientCategories = useSelector(selectClientBillingCategories);
  const centerAccess = useSelector(selectCenterAccess);

  const listingMatrixRaw = useSelector((state) => state.billing.listingMatrix);
  const isMatrixLoading = useSelector((state) => state.billing.listingMatrix?.status === 'loading');
  const matrixCategories = listingMatrixRaw?.categories ?? [];
  const matrixRows = listingMatrixRaw?.rows ?? [];

  const matrixState = useSelector((state) => state.billing.listingMatrix);

  const hasMore = matrixState?.hasMore;
  const isLoadingMore = matrixState?.isLoadingMore;
  const currentPage = matrixState?.page || 1;

  const billingData = clientCategories.rows;
  const { status } = clientCategories;
  const clientList = useSelector((state) => state.billing.clientList);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // ─── UI State ───────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('center');
  const [persistedFilters, setFilters] = usePersistedFilters({
    storageKey: BILLING_CONFIGURE_FILTERS_STORAGE_KEY,
    defaultFilters: DEFAULT_BILLING_CONFIGURE_FILTERS,
    persistTrimStringArrays: true,
  });
  const filters = useMemo(
    () => mergeStoredBillingConfigureFilters(persistedFilters),
    [persistedFilters],
  );

  // Seed the popover staging buffer from the persisted (already hydrated) value
  // so the first open after a refresh shows what's actually applied.
  const [localFilters, setLocalFilters] = useState(() => filters);
  const [filterSearchText, setFilterSearchText] = useState('');

  // ─── Debounced search ───────────────────────────────────
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const lastApiCallRef = useRef('');
  // ─── Modal State ────────────────────────────────────────
  const isAddLoading = clientCategories.createStatus === 'loading';
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const isEditLoading = clientCategories.updateStatus === 'loading';
  const [editBillingData, setEditBillingData] = useState(null);
  const [page, setPage] = useState(1);

  const handleLoadMore = useCallback(() => {
    if (isMatrixLoading || isLoadingMore || !hasMore) return;

    dispatch(
      fetchListingMatrix({
        keyword: debouncedSearchTerm,
        filters,
        page: currentPage + 1,
        pageSize: 20,
        append: true,
      }),
    );
  }, [
    dispatch,
    debouncedSearchTerm,
    filters,
    currentPage,
    isMatrixLoading,
    isLoadingMore,
    hasMore,
  ]);
  const tableAreaRef = useRef(null);
  const [scrollContainerEl, setScrollContainerEl] = useState(null);

  useEffect(() => {
    const next = tableAreaRef.current ? findScrollableParent(tableAreaRef.current) : null;
    setScrollContainerEl(next);
  }, [matrixRows.length, isMatrixLoading, isLoadingMore]);

  const { sentinelRef } = useScrollPagination({
    onLoadMore: handleLoadMore,
    hasMore,
    isLoading: isLoadingMore || isMatrixLoading,
    threshold: 200,
    scrollContainer: scrollContainerEl,
    enabled: Boolean(scrollContainerEl),
  });
  // ─── Fetch data when search/filters change ─────────────
  useEffect(() => {
    const currentApiCall = `${debouncedSearchTerm}-${JSON.stringify(filters)}`;
    if (lastApiCallRef.current === currentApiCall) return;

    dispatch(resetClientCategories());
    lastApiCallRef.current = currentApiCall;

    dispatch(
      fetchListingMatrix({
        keyword: debouncedSearchTerm,
        filters,
        page: 1,
        pageSize: 20,
        append: false,
      }),
    );
  }, [debouncedSearchTerm, dispatch, filters]);

  // ─── Filter option sources (independent of applied matrix filters) ───
  useEffect(() => {
    if (centerAccess.status === 'idle') {
      dispatch(fetchCenterAccess({ silent: true }));
    }
    dispatch(fetchClients());
  }, [dispatch, centerAccess.status]);

  // ─── Cleanup on unmount ────────────────────────────────
  useEffect(() => {
    return () => {
      lastApiCallRef.current = '';
      dispatch(resetClientCategories());
    };
  }, [dispatch, page]);

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
        dispatch(
          fetchListingMatrix({
            page: page + 1,
            pageSize: 20,
            append: true,
          }),
        );
      } catch (error) {
        const err = serializeError(error);
        showErrorToast(err);
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
        dispatch(
          fetchListingMatrix({
            page: page + 1,
            pageSize: 20,
            append: true,
          }),
        );
      } catch (error) {
        const err = serializeError(error);
        showErrorToast(err);
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
    { value: 'center', label: 'Center' },
    { value: 'client', label: 'Client' },
  ];

  // ─── Matrix table: Center, Client, + one column per category ────────

  const matrixTableColumns = useMemo(() => {
    const centerColumn = {
      id: PINNED_CENTER_COLUMN_ID,
      accessorKey: 'center_name',
      header: () => <span>Center</span>,
      ...getFrozenLeftColumnExtras(true),
      cell: ({ row }) => {
        const name = row.original.center_name ?? row.original.center ?? '-';
        return (
          <Tooltip.Root size='xsmall'>
            <Tooltip.Trigger asChild>
              <span className='block max-w-[280px] label-small text-[var(--color-text-main-900)] whitespace-nowrap overflow-hidden text-ellipsis'>
                {name}
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content side='bottom'>{name}</Tooltip.Content>
          </Tooltip.Root>
        );
      },
      meta: {
        headClassName: 'min-w-[160px] whitespace-nowrap',
        cellClassName: 'min-w-[160px] max-w-[280px] whitespace-nowrap',
      },
      enableSorting: false,
    };

    const clientColumn = {
      id: PINNED_CLIENT_COLUMN_ID,
      accessorKey: 'client_name',
      header: () => <span>Client</span>,
      ...getFrozenLeftColumnExtras(true),
      cell: ({ row }) => {
        const name = row.original.client_name ?? row.original.client ?? '-';
        return (
          <Tooltip.Root size='xsmall'>
            <Tooltip.Trigger asChild>
              <span className='block max-w-[280px] label-small text-[var(--color-text-main-900)] whitespace-nowrap overflow-hidden text-ellipsis'>
                {name}
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content side='bottom'>{name}</Tooltip.Content>
          </Tooltip.Root>
        );
      },
      meta: {
        headClassName: 'min-w-[180px] whitespace-nowrap',
        cellClassName: 'min-w-[180px] max-w-[280px] whitespace-nowrap',
      },
      enableSorting: false,
    };

    const categoryColumns = matrixCategories.map((categoryName) => ({
      id: `category-${categoryName}`,
      accessorKey: `categories.${categoryName}`,
      accessorFn: (row) => row.categories?.[categoryName],
      header: () => (
        <span className='whitespace-nowrap' title={categoryName}>
          {categoryName}
        </span>
      ),
      cell: ({ row }) => {
        const value = row.original.categories?.[categoryName];
        const isActive = value === 1;

        return (
          <div className='w-full flex items-center justify-center'>
            {isActive ? (
              <RiCheckLine size={18} className='text-success-base shrink-0' />
            ) : (
              <RiCloseLine size={18} className='text-error-base shrink-0' />
            )}
          </div>
        );
      },
      meta: {
        headClassName: 'min-w-[100px] whitespace-nowrap text-center',
        cellClassName: 'min-w-[100px] text-center',
      },
      enableSorting: false,
    }));

    return [centerColumn, clientColumn, ...categoryColumns];
  }, [matrixCategories]);

  const tableColumns = matrixTableColumns;

  // ─── Filter Logic ──────────────────────────────────────
  // Centers: full list from get_zones_and_centers (via fetchCenterAccess), same as billing filters.
  const allCenters = useMemo(() => {
    const centers = centerAccess?.data || [];
    return centers.map((c) => ({
      value: c.name,
      label: c.center_name || c.name,
    }));
  }, [centerAccess?.data]);

  const allClients = useMemo(() => {
    const raw = clientList?.data;
    const rows = Array.isArray(raw) ? raw : raw?.data || [];
    return rows
      .map((client) => ({
        value: client.name,
        label: client.customer_name || client.name,
      }))
      .filter((option) => option.value)
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }, [clientList?.data]);

  const filterOptions = useMemo(
    () => ({
      center: allCenters,
      client: allClients,
    }),
    [allCenters, allClients],
  );

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
        const currentList = previous[activeFilterTab] || [];
        const isSelected = currentList.includes(value);
        const newValues = isSelected
          ? currentList.filter((item) => item !== value)
          : [...currentList, value];
        return { ...previous, [activeFilterTab]: newValues };
      });
    },
    [activeFilterTab],
  );

  const handleFilterClear = useCallback(
    (e) => {
      if (e?.stopPropagation) e.stopPropagation();
      if (e?.preventDefault) e.preventDefault();
      const clearedFilters = { center: [], client: [] };
      setLocalFilters(clearedFilters);
      setFilters(clearedFilters);
      setFilterSearchText('');
    },
    [filterOpen, setFilters],
  );

  const filterCount = Object.values(filterOpen ? localFilters : filters).reduce(
    (sum, array) => sum + array.length,
    0,
  );

  const table = useReactTable({
    data: matrixRows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnPinning: true,
    state: {
      columnPinning:
        buildFrozenColumnPinning({
          enabled: true,
          leftColumnIds: PINNED_LEFT_COLUMN_IDS,
          hideActionsColumn: true,
          columns: tableColumns,
        }) ?? {},
    },
  });

  // ─── Search handler ────────────────────────────────────
  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

  // ─── Render ────────────────────────────────────────────

  const frozenRootTableProps = getFrozenRootTableProps(true, { tableInstance: table });
  const frozenHeaderTableProps = getFrozenHeaderTableProps(true);

  const renderTableHeader = () =>
    table.getHeaderGroups().map((hg) => (
      <Table.Row key={hg.id}>
        {hg.headers.map((header) => (
          <Table.Head
            key={header.id}
            {...getFrozenTanStackColumnProp(true, header.column)}
            className={`whitespace-nowrap ${header.column.columnDef.meta?.headClassName || ''}`}
          >
            {header.isPlaceholder
              ? null
              : flexRender(header.column.columnDef.header, header.getContext())}
          </Table.Head>
        ))}
      </Table.Row>
    ));

  return (
    <div className='flex h-full min-h-0 w-full flex-1 flex-col gap-5'>
      <div className='flex w-full shrink-0 items-center gap-3 p-px'>
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
                // Seed staging buffer from the currently applied (and persisted)
                // filters so the popover always opens reflecting reality, even
                // after a fresh page load.
                setLocalFilters(filters);
              } else {
                setFilters(localFilters);
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
        </div>
      </div>

      <div ref={tableAreaRef} className={getFrozenWrapperClassName(true)}>
        {isMatrixLoading ? (
          <Table.Root variant='compact' {...frozenRootTableProps}>
            <Table.Header {...frozenHeaderTableProps}>{renderTableHeader()}</Table.Header>
            <Table.Body>
              {Array.from({ length: 5 }).map((_, index, array) => {
                const colCount = table.getHeaderGroups()[0]?.headers.length || 4;
                const headers = table.getHeaderGroups()[0]?.headers ?? [];
                return (
                  <React.Fragment key={`skeleton-row-${index}`}>
                    <Table.Row>
                      {headers.length > 0
                        ? headers.map((header) => (
                            <Table.Cell
                              key={`skeleton-cell-${index}-${header.id}`}
                              {...getFrozenTanStackColumnProp(true, header.column)}
                            >
                              <div className='h-4 w-3/4 rounded animate-pulse bg-bg-weak-50' />
                            </Table.Cell>
                          ))
                        : Array.from({ length: colCount }).map((__, cellIndex) => (
                            <Table.Cell key={`skeleton-cell-${index}-${cellIndex}`}>
                              <div className='h-4 w-3/4 rounded animate-pulse bg-bg-weak-50' />
                            </Table.Cell>
                          ))}
                    </Table.Row>
                    {index < array.length - 1 && <Table.RowDivider />}
                  </React.Fragment>
                );
              })}
            </Table.Body>
          </Table.Root>
        ) : matrixRows.length > 0 ? (
          <Table.Root variant='compact' {...frozenRootTableProps}>
            <Table.Header {...frozenHeaderTableProps}>{renderTableHeader()}</Table.Header>
            <Table.Body>
              {table.getRowModel().rows.map((row, index, array) => (
                <React.Fragment key={row.id}>
                  <Table.Row>
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell
                        key={cell.id}
                        {...getFrozenTanStackColumnProp(true, cell.column)}
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
              {hasMore && (
                <Table.Row ref={sentinelRef}>
                  <Table.Cell colSpan={tableColumns.length} className='h-1 p-0' />
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

export default ConfigureClientBillingCategories;
