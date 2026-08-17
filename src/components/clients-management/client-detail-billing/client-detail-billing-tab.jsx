import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiBuildingLine,
  RiSettings2Line,
  RiSearchLine,
} from 'react-icons/ri';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';

import BillingTable from '@/components/billing/billing-table';
import BillingViewDrawer from '@/components/billing/billing-view-drawer';
import BillingToolbar from '@/components/billing/billing-toolbar';
import AddBillingModal from '@/components/billing/add-billing-modal';
import {
  ROLE_COLUMN_CONFIGS,
  DEFAULT_BILLING_FILTERS,
  BILLING_DOCTYPE,
  CLIENT_DETAIL_BILLING_POPOVER_FILTER_DEFAULTS,
  compactClientDetailBillingPopoverFiltersForStorage,
  mergeStoredClientDetailBillingPopoverFilters,
  BILLING_GROUP_BY_OPTIONS_CLIENT_DETAIL,
  BILLING_GROUP_BY_PAGE_SIZE,
} from '@/components/billing/constants';
import { CLIENT_DETAIL_EMPTY_STATES } from '@/components/clients-management/constants';
import * as LinkButton from '@/components/ui/link-button';
import * as Popover from '@/components/ui/popover';
import * as Button from '@/components/ui/button';
import * as Switch from '@/components/ui/switch';
import * as Input from '@/components/ui/input';
import {
  fetchBillingList,
  updateBillingField,
  selectBillingList,
  setBillingFilters,
  replaceBillingFilters,
  setBillingGroupBy,
  fetchCenterWiseCategory,
  selectCenterWiseCategories,
  toggleClientBillingCategory,
} from '@/redux/billingSlice';
import { selectClientDetail } from '@/redux/clientDetailSlice';
import { useTableVariant } from '@/hooks/use-table-variant';
import { useDebounce } from '@/hooks/use-debounce';
import { getModulePermissions } from '@/utils/user-role-utils';

const PAGE_SIZE_FOR_CLIENT = 200;

/** Session key suffix (full key: `${KEY}-${clientId}`) — matches DevTools naming pattern */
const CLIENT_DETAIL_BILLING_VIEW_FILTERS_KEY = 'client-detail-billing-view-filter-dropdown';
const ClientBillingCategoryPanel = ({ categories = [], client }) => {
  const [search, setSearch] = useState('');
  const [categoryStates, setCategoryStates] = useState({});

  useEffect(() => {
    const initial = {};

    categories.forEach((center) => {
      center.categories.forEach((cat) => {
        const key = `${center.center}-${cat.category}`;
        initial[key] = Boolean(cat.value);
      });
    });

    setCategoryStates(initial);
  }, [categories]);

  const dispatch = useDispatch();

  const handleToggle = (center, category, checked) => {
    const key = `${center}-${category}`;

    setCategoryStates((prev) => ({
      ...prev,
      [key]: checked,
    }));

    dispatch(
      toggleClientBillingCategory({
        client,
        center,
        category,
        enabled: checked ? 1 : 0,
      }),
    ).then(() => {
      dispatch(fetchCenterWiseCategory({ client }));
    });
  };

  const handleToggleAll = (center) => {
    const allEnabled = center.categories.every(
      (cat) => categoryStates[`${center.center}-${cat.category}`],
    );

    const newValue = !allEnabled;

    const updates = {};
    const categoriesList = [];

    center.categories.forEach((cat) => {
      const key = `${center.center}-${cat.category}`;
      updates[key] = newValue;
      categoriesList.push(cat.category);
    });

    setCategoryStates((prev) => ({
      ...prev,
      ...updates,
    }));

    dispatch(
      toggleClientBillingCategory({
        client,
        center: center.center,
        categories: categoriesList,
        enabled: newValue ? 1 : 0,
      }),
    ).then(() => {
      dispatch(fetchCenterWiseCategory({ client }));
    });
  };
  // Filter centers + categories by search
  const filteredCenters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;

    return categories
      .map((center) => {
        const centerMatch = center.center_name?.toLowerCase().includes(q);

        const filteredCats = center.categories.filter((cat) =>
          cat.category?.toLowerCase().includes(q),
        );

        if (centerMatch) return center;

        if (filteredCats.length > 0) {
          return { ...center, categories: filteredCats };
        }

        return null;
      })
      .filter(Boolean);
  }, [categories, search]);

  return (
    <div className='flex flex-col shadow-regular-xs overflow-hidden'>
      {/* SEARCH */}
      <div className='p-3 border-b border-stroke-soft-200'>
        <Input.Root size='small'>
          <Input.Wrapper>
            <Input.Icon>
              <RiSearchLine className='size-4' />
            </Input.Icon>
            <Input.Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search...'
            />
          </Input.Wrapper>
        </Input.Root>
      </div>

      {/* CATEGORY LIST */}
      <div className='flex flex-col overflow-auto max-h-[300px]'>
        {filteredCenters.length === 0 && (
          <div className='p-4 text-paragraph-sm text-text-soft-400'>No categories found.</div>
        )}

        {filteredCenters.map((center) => (
          <div
            key={center.center}
            className='flex flex-col border-b border-stroke-soft-200 last:border-b-0'
          >
            {/* Center Header */}
            <div className='flex items-center justify-between px-3 py-2 min-h-10 bg-bg-weak-50'>
              <span className='text-paragraph-sm font-medium text-text-strong-950 truncate'>
                {center.center_name}
              </span>

              <button
                className='text-primary-base text-paragraph-sm hover:underline'
                onClick={() => handleToggleAll(center)}
              >
                {center.categories.every((c) => categoryStates[`${center.center}-${c.category}`])
                  ? 'Hide All'
                  : 'Show All'}
              </button>
            </div>

            {/* Categories */}
            {center.categories.map((cat) => {
              const key = `${center.center}-${cat.category}`;

              return (
                <div
                  key={key}
                  className='flex items-center justify-between gap-2 px-3 py-2 min-h-10 pl-5 hover:bg-bg-weak-50'
                >
                  <span className='text-paragraph-sm text-text-strong-950 truncate'>
                    {cat.category}
                  </span>

                  <Switch.Root
                    checked={Boolean(categoryStates[key])}
                    onCheckedChange={(checked) =>
                      handleToggle(center.center, cat.category, checked)
                    }
                    className='shrink-0'
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

const ClientDetailBillingTab = () => {
  const dispatch = useDispatch();
  const { id } = useParams();

  const clientDetail = useSelector(selectClientDetail);
  const client = clientDetail.data;
  const clientName = client?.name || client?.customer_name || id;

  const list = useSelector(selectBillingList);
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);

  const categoriesState = useSelector(selectCenterWiseCategories);
  const categories = categoriesState.data || [];

  const billingPermissions = useMemo(
    () => getModulePermissions(userSideBarPerm, BILLING_DOCTYPE),
    [userSideBarPerm],
  );
  const canEdit = billingPermissions?.write === true;
  const canCreate = billingPermissions?.create === true;

  const [selectedBillingId, setSelectedBillingId] = useState(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [expandedCenters, setExpandedCenters] = useState({});
  const [showAllByCenter, setShowAllByCenter] = useState({});
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isAddBillingOpen, setIsAddBillingOpen] = useState(false);

  const tableRef = useRef(null);
  const lastApiCallRef = useRef('');
  const lastDispatchedSearchRef = useRef(undefined);
  const lastClientLockRef = useRef(null);
  const skipFilterPersistRef = useRef(false);

  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'client-billing-table-all',
    'compact',
  );

  const currentFilters = list.filters || {};
  const activeTab = currentFilters.tab || 'all';

  const [searchTerm, setSearchTerm] = useState(currentFilters.search || '');
  const debouncedSearch = useDebounce(searchTerm, 500);

  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: clientName ? `${CLIENT_DETAIL_BILLING_VIEW_FILTERS_KEY}-${clientName}` : null,
    defaultFilters: CLIENT_DETAIL_BILLING_POPOVER_FILTER_DEFAULTS,
    compactFilters: compactClientDetailBillingPopoverFiltersForStorage,
  });

  // 1. Hydrate popover filters when session snapshot or client changes (toolbar month/year unchanged).
  useEffect(() => {
    if (!clientName) {
      setFiltersInitialized(false);
      lastClientLockRef.current = null;
      return;
    }

    const isSameClient = lastClientLockRef.current === clientName;
    const popoverFilters = mergeStoredClientDetailBillingPopoverFilters(persistedFilters);
    const toolbarMonth = list.filters?.month || DEFAULT_BILLING_FILTERS.month;
    const toolbarYear = list.filters?.year || DEFAULT_BILLING_FILTERS.year;
    const toolbarTab = list.filters?.tab || 'all';

    skipFilterPersistRef.current = true;
    dispatch(
      replaceBillingFilters({
        ...DEFAULT_BILLING_FILTERS,
        ...popoverFilters,
        month: isSameClient ? toolbarMonth : DEFAULT_BILLING_FILTERS.month,
        year: isSameClient ? toolbarYear : DEFAULT_BILLING_FILTERS.year,
        tab: isSameClient ? toolbarTab : 'all',
        client: [clientName],
        search: isSameClient ? list.filters?.search || '' : '',
      }),
    );
    lastClientLockRef.current = clientName;
    if (!isSameClient) {
      setSearchTerm('');
    }
    setFiltersInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate on client/session only, not toolbar edits
  }, [clientName, persistedFilters, dispatch]);

  // 2. Persist filter-dropdown values only (skip one cycle after hydrate).
  useEffect(() => {
    if (!clientName || !filtersInitialized) return;

    const clientFilter = currentFilters.client;
    const locked =
      Array.isArray(clientFilter) &&
      clientFilter.length === 1 &&
      String(clientFilter[0]) === String(clientName);
    if (!locked) return;

    if (skipFilterPersistRef.current) {
      skipFilterPersistRef.current = false;
      return;
    }

    const compact = compactClientDetailBillingPopoverFiltersForStorage(currentFilters);
    const persistedCompact = compactClientDetailBillingPopoverFiltersForStorage(
      mergeStoredClientDetailBillingPopoverFilters(persistedFilters),
    );
    if (JSON.stringify(compact) !== JSON.stringify(persistedCompact)) {
      setPersistedFilters(compact);
    }
  }, [clientName, currentFilters, persistedFilters, filtersInitialized, setPersistedFilters]);

  // Sync debounced search to Redux
  useEffect(() => {
    if (!filtersInitialized) return;
    const nextSearch = (debouncedSearch ?? '').trim();
    if (lastDispatchedSearchRef.current === nextSearch) return;
    lastDispatchedSearchRef.current = nextSearch;
    dispatch(setBillingFilters({ search: nextSearch }));
  }, [debouncedSearch, dispatch, filtersInitialized]);

  // Fetch billing list for this client when filters change
  useEffect(() => {
    if (!clientName || !filtersInitialized) return;

    const orderBy = 'creation desc';
    const page = 1;
    const pageSize = PAGE_SIZE_FOR_CLIENT;

    const filtersWithClient = {
      ...DEFAULT_BILLING_FILTERS,
      ...currentFilters,
      client: [clientName],
    };

    const callKey = `${JSON.stringify(filtersWithClient)}-${page}-${pageSize}-${orderBy}-${list.groupBy}-${list.groupOrder}`;
    if (lastApiCallRef.current === callKey) return;
    lastApiCallRef.current = callKey;

    dispatch(
      fetchBillingList({
        filters: filtersWithClient,
        page,
        pageSize,
        orderBy,
        append: false,
        groupBy: list.groupBy,
        groupOrder: list.groupOrder,
      }),
    );
  }, [dispatch, clientName, currentFilters, filtersInitialized, list.groupBy, list.groupOrder]);

  useEffect(() => {
    if (!clientName) return;

    dispatch(fetchCenterWiseCategory({ client: clientName }));
  }, [clientName, dispatch]);

  const handleRetryList = useCallback(() => {
    const orderBy = 'creation desc';
    dispatch(
      fetchBillingList({
        filters: {
          ...DEFAULT_BILLING_FILTERS,
          ...currentFilters,
          client: clientName ? [clientName] : [],
        },
        page: 1,
        pageSize: PAGE_SIZE_FOR_CLIENT,
        orderBy,
        append: false,
        groupBy: list.groupBy,
        groupOrder: list.groupOrder,
      }),
    );
  }, [dispatch, currentFilters, clientName, list.groupBy, list.groupOrder]);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  const handleTabChange = useCallback(
    (value) => {
      dispatch(setBillingFilters({ tab: value || 'all' }));
    },
    [dispatch],
  );

  const handleClearFilters = useCallback(() => {
    if (!clientName) return;
    dispatch(
      replaceBillingFilters({
        ...DEFAULT_BILLING_FILTERS,
        // Preserve outside toolbar billing month/year when clearing other filters
        month: currentFilters.month || DEFAULT_BILLING_FILTERS.month,
        year: currentFilters.year || DEFAULT_BILLING_FILTERS.year,
        client: [clientName],
        center: [],
        tab: 'all',
        search: '',
      }),
    );
    setSearchTerm('');
  }, [dispatch, clientName, currentFilters.month, currentFilters.year]);

  const handleMonthChange = useCallback(
    (newMonth) => {
      dispatch(setBillingFilters({ month: newMonth }));
    },
    [dispatch],
  );

  const handleYearChange = useCallback(
    (newYear) => {
      dispatch(setBillingFilters({ year: newYear }));
    },
    [dispatch],
  );

  const handleGroupByChange = useCallback(
    (value) => {
      dispatch(setBillingGroupBy({ groupBy: value || '', groupOrder: list.groupOrder }));
    },
    [dispatch, list.groupOrder],
  );

  const handleGroupOrderChange = useCallback(
    (value) => {
      const order = typeof value === 'function' ? value(list.groupOrder) : value;
      dispatch(setBillingGroupBy({ groupBy: list.groupBy, groupOrder: order || 'desc' }));
    },
    [dispatch, list.groupBy],
  );

  const handleRowSelect = useCallback((row) => {
    setSelectedBillingId(row.name ?? row.id);
    setIsViewDrawerOpen(true);
  }, []);

  const clientCenterOptions = useMemo(
    () =>
      (categories || []).map((center) => ({
        center: center.center,
        center_name: center.center_name,
      })),
    [categories],
  );

  const handleAddBillingSuccess = useCallback(() => {
    if (!clientName) return;

    lastApiCallRef.current = '';
    const orderBy = 'creation desc';
    const filtersWithClient = {
      ...DEFAULT_BILLING_FILTERS,
      ...currentFilters,
      client: [clientName],
    };

    dispatch(
      fetchBillingList({
        filters: filtersWithClient,
        page: 1,
        pageSize: PAGE_SIZE_FOR_CLIENT,
        orderBy,
        append: false,
      }),
    );
    dispatch(fetchCenterWiseCategory({ client: clientName }));
  }, [dispatch, clientName, currentFilters]);

  const handleViewDrawerClose = useCallback(() => {
    setIsViewDrawerOpen(false);
    setSelectedBillingId(null);
    if (!clientName) return;

    const orderBy = 'creation desc';
    const filtersWithClient = {
      ...DEFAULT_BILLING_FILTERS,
      ...currentFilters,
      client: [clientName],
    };

    dispatch(
      fetchBillingList({
        filters: filtersWithClient,
        page: 1,
        pageSize: PAGE_SIZE_FOR_CLIENT,
        orderBy,
        append: false,
        groupBy: list.groupBy,
        groupOrder: list.groupOrder,
      }),
    );
    dispatch(fetchCenterWiseCategory({ client: clientName }));
  }, [dispatch, clientName, currentFilters, list.groupBy, list.groupOrder]);

  const handleRowChange = useCallback(
    async (updatedRow, rowIndex, fieldName) => {
      const billingId = updatedRow?.name ?? updatedRow?.id;
      if (!billingId || !fieldName) return;
      const value = updatedRow[fieldName];
      try {
        await dispatch(
          updateBillingField({
            name: billingId,
            fieldname: fieldName,
            value,
          }),
        ).unwrap();
      } catch {
        // Error toast is handled inside the thunk utilities
      }
    },
    [dispatch],
  );

  const handleFieldUpdate = useCallback(
    async (billingId, fieldname, value) => {
      if (!billingId || !fieldname) return;
      try {
        await dispatch(
          updateBillingField({
            name: billingId,
            fieldname,
            value,
          }),
        ).unwrap();
      } catch {
        // Error toast is handled inside the thunk utilities
      }
    },
    [dispatch],
  );

  const groupedByCenter = useMemo(() => {
    if (!Array.isArray(list.rows) || list.rows.length === 0) return {};
    return list.rows.reduce((accumulator, row) => {
      const key = row.center_name || row.center || 'Unknown Center';
      if (!accumulator[key]) accumulator[key] = [];
      accumulator[key].push(row);
      return accumulator;
    }, {});
  }, [list.rows]);

  const centerEntries = useMemo(() => Object.entries(groupedByCenter), [groupedByCenter]);
  const useApiGroupedView = list.isGrouped && Boolean(list.groupBy);
  const hasBillingRows = useApiGroupedView
    ? (list.groupKeys?.length ?? 0) > 0
    : centerEntries.length > 0;

  const toolbarFilterCount = useMemo(() => {
    const f = currentFilters;
    return Object.keys(f || {}).reduce((accumulator, key) => {
      if (
        key === 'search' ||
        key === 'tab' ||
        key === 'client' ||
        key === 'month' ||
        key === 'year'
      ) {
        return accumulator;
      }
      const value = f[key];
      if (Array.isArray(value)) return accumulator + value.length;
      if (value) return accumulator + 1;
      return accumulator;
    }, 0);
  }, [currentFilters]);

  const currentIndex = useMemo(
    () => list.rows.findIndex((row) => String(row.name ?? row.id) === String(selectedBillingId)),
    [list.rows, selectedBillingId],
  );

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < list.rows.length - 1;

  const handleNavigatePrevious = useCallback(() => {
    if (currentIndex > 0) {
      const previous = list.rows[currentIndex - 1];
      setSelectedBillingId(previous?.name ?? previous?.id);
    }
  }, [list.rows, currentIndex]);

  const handleNavigateNext = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < list.rows.length - 1) {
      const next = list.rows[currentIndex + 1];
      setSelectedBillingId(next?.name ?? next?.id);
    }
  }, [list.rows, currentIndex]);

  const toggleCenter = useCallback((center) => {
    setExpandedCenters((previous) => ({
      ...previous,
      [center]: !previous[center],
    }));
  }, []);

  const toggleShowMore = useCallback((center) => {
    setShowAllByCenter((previous) => ({
      ...previous,
      [center]: !previous[center],
    }));
  }, []);

  const isLoading = list.status === 'loading';
  const hasError = Boolean(list.error);

  const hiddenTableForRef = (
    <div className='hidden' aria-hidden='true'>
      <BillingTable
        ref={tableRef}
        rows={[]}
        isLoading={false}
        error={null}
        onRetry={handleRetryList}
        variant={tableVariant}
        onRowSelect={handleRowSelect}
        onRowChange={canEdit ? handleRowChange : undefined}
        canEdit={canEdit}
        enableScrollPagination={false}
        hasMore={false}
        isLoadingMore={false}
        tableId='client-billing-table-all'
        defaultVisibleColumns={ROLE_COLUMN_CONFIGS.all}
      />
    </div>
  );

  return (
    <div className='flex flex-1 overflow-hidden'>
      <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0'>
        <div className='px-6 pb-6 pt-4'>
          <div className='flex items-start gap-2'>
            <div className='flex-1 min-w-0'>
              <BillingToolbar
                searchValue={searchTerm}
                onSearchChange={handleSearchChange}
                tableRef={tableRef}
                tableVariant={tableVariant}
                onTableVariantToggle={toggleTableVariant}
                filterCount={toolbarFilterCount}
                onClearFilters={handleClearFilters}
                hideClientFilter
                hideTabs
                month={currentFilters.month || DEFAULT_BILLING_FILTERS.month}
                year={currentFilters.year || DEFAULT_BILLING_FILTERS.year}
                onMonthChange={handleMonthChange}
                onYearChange={handleYearChange}
                showAddBilling={canCreate}
                onAddBillingClick={() => setIsAddBillingOpen(true)}
                groupBy={list.groupBy}
                onGroupByChange={handleGroupByChange}
                groupOrder={list.groupOrder}
                onGroupOrderChange={handleGroupOrderChange}
                groupByOptions={BILLING_GROUP_BY_OPTIONS_CLIENT_DETAIL}
              />
            </div>

            <AddBillingModal
              isOpen={isAddBillingOpen}
              onOpenChange={setIsAddBillingOpen}
              onSuccess={handleAddBillingSuccess}
              lockedClient={clientName}
              lockedClientLabel={client?.customer_name || client?.name || clientName}
              clientCenterOptions={clientCenterOptions}
            />
            <Popover.Root open={isManageCategoriesOpen} onOpenChange={setIsManageCategoriesOpen}>
              <Popover.Trigger asChild>
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='small'
                  className='shrink-0 mt-5 gap-1'
                >
                  <Button.Icon>
                    <RiSettings2Line />
                  </Button.Icon>
                  Categories
                </Button.Root>
              </Popover.Trigger>
              <Popover.Content
                align='end'
                side='bottom'
                className='flex flex-col min-h-0 w-[320px] max-h-[min(70vh,300px)] overflow-hidden px-0 pt-0 pb-2 ring-outset ring-stroke-soft-200'
                showArrow={true}
              >
                <ClientBillingCategoryPanel categories={categories} client={clientName} />
              </Popover.Content>
            </Popover.Root>
          </div>

          <div className='mt-4'>
            {isLoading ? (
              <>
                <div className='flex items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 py-24'>
                  <div className='w-8 h-8 border-4 border-primary-base border-t-transparent rounded-full animate-spin' />
                </div>
                {hiddenTableForRef}
              </>
            ) : hasError ? (
              <>
                <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
                  <p className='text-paragraph-sm text-error-base mb-2'>
                    Error loading billing records
                  </p>
                  <p className='text-paragraph-xs text-text-sub-500 mb-4'>{list.error}</p>
                  <LinkButton.Root variant='primary' size='small' onClick={handleRetryList}>
                    Retry
                  </LinkButton.Root>
                </div>
                {hiddenTableForRef}
              </>
            ) : !hasBillingRows ? (
              <>
                <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
                  <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>
                    {
                      (CLIENT_DETAIL_EMPTY_STATES.billing || CLIENT_DETAIL_EMPTY_STATES.default)
                        .title
                    }
                  </h3>
                  <p className='max-w-md text-sm text-text-sub-600'>
                    {
                      (CLIENT_DETAIL_EMPTY_STATES.billing || CLIENT_DETAIL_EMPTY_STATES.default)
                        .description
                    }
                  </p>
                </div>
                {hiddenTableForRef}
              </>
            ) : useApiGroupedView ? (
              <BillingTable
                ref={tableRef}
                rows={list.rows}
                isGrouped
                groupKeys={list.groupKeys}
                groupsMap={list.groupsMap}
                isLoading={false}
                error={null}
                onRetry={handleRetryList}
                variant={tableVariant}
                onRowSelect={handleRowSelect}
                onRowChange={canEdit ? handleRowChange : undefined}
                canEdit={canEdit}
                enableScrollPagination={list.groupKeys.length > BILLING_GROUP_BY_PAGE_SIZE}
                hasMore={list.groupKeys.length > 0}
                isLoadingMore={false}
                tableId='client-billing-table-all'
                defaultVisibleColumns={ROLE_COLUMN_CONFIGS.all}
              />
            ) : (
              centerEntries.map(([center, centerRows], index) => {
                const isExpanded = expandedCenters[center] !== false;
                const DEFAULT_VISIBLE_ROWS = 5;
                const showAllRows = showAllByCenter[center] === true;
                const visibleRows = showAllRows
                  ? centerRows
                  : centerRows.slice(0, DEFAULT_VISIBLE_ROWS);
                const hasMore = centerRows.length > DEFAULT_VISIBLE_ROWS;

                return (
                  <div key={center} className={index > 0 ? 'mt-6' : ''}>
                    <button
                      type='button'
                      onClick={() => toggleCenter(center)}
                      className='flex items-center gap-1 w-full'
                    >
                      <div className='flex items-center gap-2'>
                        <RiBuildingLine size={20} className='text-text-sub-500' />
                        <span className='text-label-sm text-text-sub-500'>{center}</span>
                      </div>
                      {isExpanded ? (
                        <RiArrowUpSLine className='size-5 text-text-soft-400' />
                      ) : (
                        <RiArrowDownSLine className='size-5 text-text-soft-400' />
                      )}
                    </button>

                    {isExpanded && (
                      <div className='mt-2'>
                        <BillingTable
                          ref={tableRef}
                          rows={visibleRows}
                          isLoading={false}
                          error={null}
                          onRetry={handleRetryList}
                          variant={tableVariant}
                          onRowSelect={handleRowSelect}
                          onRowChange={canEdit ? handleRowChange : undefined}
                          canEdit={canEdit}
                          enableScrollPagination={false}
                          hasMore={false}
                          isLoadingMore={false}
                          tableId='client-billing-table-all'
                          defaultVisibleColumns={ROLE_COLUMN_CONFIGS.all}
                        />

                        {hasMore && (
                          <div className='mt-2'>
                            <LinkButton.Root
                              variant='primary'
                              size='small'
                              underline
                              onClick={() => toggleShowMore(center)}
                            >
                              {showAllRows
                                ? 'Hide'
                                : `Show ${centerRows.length - DEFAULT_VISIBLE_ROWS} more...`}
                              <LinkButton.Icon
                                as={showAllRows ? RiArrowUpSLine : RiArrowDownSLine}
                              />
                            </LinkButton.Root>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {isViewDrawerOpen && (
          <BillingViewDrawer
            isOpen={isViewDrawerOpen}
            onClose={handleViewDrawerClose}
            billingId={selectedBillingId}
            onNavigatePrevious={handleNavigatePrevious}
            onNavigateNext={handleNavigateNext}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            onFieldUpdate={handleFieldUpdate}
            permissions={{ canEdit }}
          />
        )}
      </div>
    </div>
  );
};

export default ClientDetailBillingTab;
