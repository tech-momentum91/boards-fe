import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiMoneyDollarCircleLine } from 'react-icons/ri';

import PageLayout from '@/components/page-layout';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import WithModulePermission from '@/route-protection/with-module-permission';
import { useTableVariant } from '@/hooks/use-table-variant';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import BillingStats from '@/components/billing/billing-stats';
import BillingToolbar from '@/components/billing/billing-toolbar';
import BillingTable from '@/components/billing/billing-table';
import BillingViewDrawer from '@/components/billing/billing-view-drawer';
import AddBillingModal from '@/components/billing/add-billing-modal';
import {
  ROLE_COLUMN_CONFIGS,
  BILLING_DOCTYPE,
  DEFAULT_BILLING_FILTERS,
  BILLING_MODULE_VIEW_FILTER_DEFAULTS,
  compactBillingModuleViewFiltersForStorage,
  mergeStoredBillingModuleViewFilters,
  BILLING_GROUP_BY_PAGE_SIZE,
} from '@/components/billing/constants';
import {
  fetchBillingList,
  fetchBillingStats,
  fetchBillingFilterOptions,
  updateBillingField,
  setBillingFilters,
  resetBillingFilters,
  replaceBillingFilters,
  setBillingSorting,
  setBillingGroupBy,
  selectBillingList,
  selectBillingStats,
  selectBillingFilterOptions,
} from '@/redux/billingSlice';
import { selectCenterAccess, setSelectedCenters } from '@/redux/centerSlice';
import { getModulePermissions } from '@/utils/user-role-utils';
import { showErrorToast } from '@/utils/error-utils';

const BILLING_MODULE_VIEW_FILTERS_KEY = 'billing-module-view-filter-dropdown';

const CollectionPage = () => {
  const dispatch = useDispatch();
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);

  const list = useSelector(selectBillingList);
  const stats = useSelector(selectBillingStats);
  const filterOptions = useSelector(selectBillingFilterOptions);
  const centerAccess = useSelector(selectCenterAccess);

  const billingPermissions = useMemo(
    () => getModulePermissions(userSideBarPerm, BILLING_DOCTYPE),
    [userSideBarPerm],
  );
  const canEdit = billingPermissions?.write === true;
  const canCreate = billingPermissions?.create === true;

  const tableRef = useRef(null);
  const lastApiCallRef = useRef('');
  const isScrollPaginationRef = useRef(false);
  const skipFilterPersistRef = useRef(false);
  const moduleFiltersHydratedRef = useRef(false);
  const [selectedBillingId, setSelectedBillingId] = useState(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [isAddBillingOpen, setIsAddBillingOpen] = useState(false);

  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'billing-table',
    'compact',
  );

  const currentFilters = list.filters || {};

  const [searchTerm, setSearchTerm] = useState(currentFilters.search || '');
  const debouncedSearch = useDebounce(searchTerm, 500);

  const activeTab = currentFilters.tab || 'all';

  const filtersString = useMemo(() => JSON.stringify(currentFilters || {}), [currentFilters]);

  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: BILLING_MODULE_VIEW_FILTERS_KEY,
    defaultFilters: BILLING_MODULE_VIEW_FILTER_DEFAULTS,
    compactFilters: compactBillingModuleViewFiltersForStorage,
  });

  // 1. Hydrate toolbar + filter-dropdown from session on load.
  useEffect(() => {
    const isRehydrate = moduleFiltersHydratedRef.current;
    const viewFilters = mergeStoredBillingModuleViewFilters(persistedFilters);

    skipFilterPersistRef.current = true;
    dispatch(
      replaceBillingFilters({
        ...DEFAULT_BILLING_FILTERS,
        ...viewFilters,
        search: isRehydrate ? list.filters?.search || '' : '',
      }),
    );
    dispatch(setSelectedCenters(Array.isArray(viewFilters.center) ? viewFilters.center : []));
    if (!isRehydrate) {
      setSearchTerm('');
    }
    moduleFiltersHydratedRef.current = true;
    setFiltersInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate on session snapshot only
  }, [persistedFilters, dispatch]);

  // 2. Persist toolbar month/year/tab + filter-dropdown values (skip one cycle after hydrate).
  useEffect(() => {
    if (!filtersInitialized) return;

    if (skipFilterPersistRef.current) {
      skipFilterPersistRef.current = false;
      return;
    }

    const compact = compactBillingModuleViewFiltersForStorage(currentFilters);
    const persistedCompact = compactBillingModuleViewFiltersForStorage(
      mergeStoredBillingModuleViewFilters(persistedFilters),
    );
    if (JSON.stringify(compact) !== JSON.stringify(persistedCompact)) {
      setPersistedFilters(compact);
    }
  }, [currentFilters, persistedFilters, filtersInitialized, setPersistedFilters]);

  useEffect(() => {
    if (!filtersInitialized) return;
    if (debouncedSearch !== (currentFilters.search || '')) {
      dispatch(setBillingFilters({ search: debouncedSearch }));
    }
  }, [debouncedSearch, currentFilters.search, dispatch, filtersInitialized]);

  // Fetch first page + stats on mount and when filters/sort change.
  useEffect(() => {
    if (!filtersInitialized) return;

    if (isScrollPaginationRef.current && list.page > 1) {
      isScrollPaginationRef.current = false;
      return;
    }

    let orderBy = 'creation desc';
    if (list.sorting && list.sorting.length > 0) {
      const { id, desc } = list.sorting[0];
      orderBy = `${id} ${desc ? 'desc' : 'asc'}`;
    }

    const filters = list.filters || DEFAULT_BILLING_FILTERS;

    const callKey = `${filtersString}-${list.pageSize}-${orderBy}-${list.groupBy}-${list.groupOrder}`;
    if (lastApiCallRef.current === callKey) {
      return;
    }
    lastApiCallRef.current = callKey;

    dispatch(
      fetchBillingList({
        filters,
        page: 1,
        pageSize: list.pageSize,
        orderBy,
        append: false,
        groupBy: list.groupBy,
        groupOrder: list.groupOrder,
      }),
    );
    dispatch(fetchBillingStats({ filters }));
  }, [
    dispatch,
    filtersString,
    list.pageSize,
    list.sorting,
    list.groupBy,
    list.groupOrder,
    filtersInitialized,
  ]);

  const handleRetryList = useCallback(() => {
    let orderBy = 'creation desc';
    if (list.sorting && list.sorting.length > 0) {
      const { id, desc } = list.sorting[0];
      orderBy = `${id} ${desc ? 'desc' : 'asc'}`;
    }
    dispatch(
      fetchBillingList({
        filters: currentFilters,
        page: 1,
        pageSize: list.pageSize,
        orderBy,
        append: false,
        groupBy: list.groupBy,
        groupOrder: list.groupOrder,
      }),
    );
    dispatch(fetchBillingStats({ filters: currentFilters }));
  }, [dispatch, currentFilters, list.pageSize, list.sorting, list.groupBy, list.groupOrder]);

  const handleLoadMore = useCallback(() => {
    if (list.isGrouped || list.status === 'loading' || list.isLoadingMore || !list.hasMore) return;

    let orderBy = 'creation desc';
    if (list.sorting && list.sorting.length > 0) {
      const { id, desc } = list.sorting[0];
      orderBy = `${id} ${desc ? 'desc' : 'asc'}`;
    }

    isScrollPaginationRef.current = true;
    dispatch(
      fetchBillingList({
        filters: currentFilters,
        page: list.page + 1,
        pageSize: list.pageSize,
        orderBy,
        append: true,
        groupBy: list.groupBy,
        groupOrder: list.groupOrder,
      }),
    );
  }, [
    dispatch,
    currentFilters,
    list.page,
    list.pageSize,
    list.sorting,
    list.status,
    list.isLoadingMore,
    list.hasMore,
    list.isGrouped,
    list.groupBy,
    list.groupOrder,
  ]);

  // Close view drawer if the selected record no longer appears in the list
  useEffect(() => {
    if (!selectedBillingId || !isViewDrawerOpen) return;
    const stillInList = list.rows.some(
      (row) => String(row.name ?? row.id) === String(selectedBillingId),
    );
    if (!stillInList) {
      setIsViewDrawerOpen(false);
      setSelectedBillingId(null);
    }
  }, [list.rows, selectedBillingId, isViewDrawerOpen]);

  useEffect(() => {
    dispatch(fetchBillingFilterOptions());
  }, [dispatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      lastApiCallRef.current = '';
      isScrollPaginationRef.current = false;
    };
  }, []);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  const handleTabChange = useCallback(
    (value) => {
      dispatch(setBillingFilters({ tab: value || 'all' }));
    },
    [dispatch],
  );

  const handleSortingChange = useCallback(
    (newSorting) => {
      lastApiCallRef.current = '';
      dispatch(setBillingSorting(newSorting));
    },
    [dispatch],
  );

  const handleCenterSelectionChange = useCallback(
    (selectedCenters) => {
      dispatch(setSelectedCenters(selectedCenters));

      const normalized =
        Array.isArray(selectedCenters) && selectedCenters.length > 0 ? selectedCenters : [];

      dispatch(setBillingFilters({ center: normalized }));
    },
    [dispatch],
  );

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

  const handleViewDrawerClose = useCallback(() => {
    setIsViewDrawerOpen(false);
    setSelectedBillingId(null);

    let orderBy = 'creation desc';
    if (list.sorting && list.sorting.length > 0) {
      const { id, desc } = list.sorting[0];
      orderBy = `${id} ${desc ? 'desc' : 'asc'}`;
    }

    dispatch(
      fetchBillingList({
        filters: currentFilters,
        page: 1,
        pageSize: list.pageSize,
        orderBy,
        append: false,
        groupBy: list.groupBy,
        groupOrder: list.groupOrder,
      }),
    );
    dispatch(fetchBillingStats({ filters: currentFilters }));
    dispatch(fetchBillingFilterOptions());
  }, [dispatch, currentFilters, list.pageSize, list.sorting, list.groupBy, list.groupOrder]);

  const currentIndex = list.rows.findIndex(
    (row) => String(row.name ?? row.id) === String(selectedBillingId),
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
        dispatch(fetchBillingStats({ filters: currentFilters }));
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Failed to update billing field. Please try again.',
        });
      }
    },
    [dispatch, currentFilters],
  );

  const handleAddBillingSuccess = useCallback(() => {
    let orderBy = 'creation desc';
    if (list.sorting && list.sorting.length > 0) {
      const { id, desc } = list.sorting[0];
      orderBy = `${id} ${desc ? 'desc' : 'asc'}`;
    }

    lastApiCallRef.current = '';
    dispatch(
      fetchBillingList({
        filters: currentFilters,
        page: 1,
        pageSize: list.pageSize,
        orderBy,
        append: false,
      }),
    );
    dispatch(fetchBillingStats({ filters: currentFilters }));
  }, [dispatch, currentFilters, list.pageSize, list.sorting]);

  const handleFieldUpdate = useCallback(
    async (billingId, fieldname, value) => {
      try {
        await dispatch(
          updateBillingField({
            name: billingId,
            fieldname,
            value,
          }),
        ).unwrap();
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Failed to update billing field. Please try again.',
        });
      }
    },
    [dispatch],
  );

  return (
    <PageLayout
      pageTitle='Billing & Collection'
      pageIcon={<RiMoneyDollarCircleLine size={24} />}
      pageDescription='Manage client billing records and collection status.'
      headerActions={
        <CenterAccessDropdown
          centers={centerAccess.data}
          selectedCenters={centerAccess.selectedCenters}
          onChange={handleCenterSelectionChange}
          isLoading={centerAccess.status === 'loading'}
        />
      }
    >
      <div className='flex min-h-0 flex-1 flex-col gap-6 px-4 sm:px-6 lg:px-8'>
        <BillingStats stats={stats} />

        <BillingToolbar
          searchValue={searchTerm}
          onSearchChange={handleSearchChange}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tableRef={tableRef}
          tableVariant={tableVariant}
          onTableVariantToggle={toggleTableVariant}
          filters={currentFilters}
          onFilterChange={(newFilters) => dispatch(setBillingFilters(newFilters))}
          onClearFilters={() => dispatch(resetBillingFilters())}
          centerOptions={centerAccess.data.map((center) => ({
            value: center.name || center.center_name,
            label: center.center_name || center.name,
          }))}
          categoryOptions={filterOptions?.categories}
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
        />

        <AddBillingModal
          isOpen={isAddBillingOpen}
          onOpenChange={setIsAddBillingOpen}
          onSuccess={handleAddBillingSuccess}
        />

        {list.isGrouped ? (
          <div className='flex min-h-0 min-w-0 flex-1 flex-col'>
            <BillingTable
              key={activeTab}
              ref={tableRef}
              rows={list.rows}
              isGrouped={list.isGrouped}
              groupKeys={list.groupKeys}
              groupsMap={list.groupsMap}
              isLoading={list.status === 'loading'}
              error={list.error}
              onRetry={handleRetryList}
              variant={tableVariant}
              onSortingChange={handleSortingChange}
              sorting={list.sorting}
              tableId={`billing-table-${activeTab}`}
              defaultVisibleColumns={ROLE_COLUMN_CONFIGS[activeTab] || ROLE_COLUMN_CONFIGS.all}
              onRowSelect={handleRowSelect}
              onRowChange={canEdit ? handleRowChange : undefined}
              canEdit={canEdit}
              enableScrollPagination={list.groupKeys.length > BILLING_GROUP_BY_PAGE_SIZE}
              onLoadMore={handleLoadMore}
              hasMore={list.groupKeys.length > 0}
              isLoadingMore={list.isLoadingMore}
            />
          </div>
        ) : (
          <div className='flex min-h-0 min-w-0 flex-1 flex-col'>
            <BillingTable
              key={activeTab}
              ref={tableRef}
              rows={list.rows}
              isGrouped={list.isGrouped}
              groupKeys={list.groupKeys}
              groupsMap={list.groupsMap}
              isLoading={list.status === 'loading'}
              error={list.error}
              onRetry={handleRetryList}
              variant={tableVariant}
              onSortingChange={handleSortingChange}
              sorting={list.sorting}
              tableId={`billing-table-${activeTab}`}
              defaultVisibleColumns={ROLE_COLUMN_CONFIGS[activeTab] || ROLE_COLUMN_CONFIGS.all}
              onRowSelect={handleRowSelect}
              onRowChange={canEdit ? handleRowChange : undefined}
              canEdit={canEdit}
              enableScrollPagination
              onLoadMore={handleLoadMore}
              hasMore={list.hasMore}
              isLoadingMore={list.isLoadingMore}
            />
          </div>
        )}

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
    </PageLayout>
  );
};

// export default WithModulePermission(CollectionPage, BILLING_DOCTYPE);
export default CollectionPage;
