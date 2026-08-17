import React, { useCallback, useMemo, useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiUserLine } from 'react-icons/ri';
import PageLayout from '@/components/page-layout';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import {
  ClientsStatusTabs,
  ClientsToolbar,
  ClientsEngagementFilters,
  ClientsTable,
  DEFAULT_FILTERS,
  STATUS_TAB_OPTIONS,
  CLIENT_TAB_COUNT_KEY_MAP,
  normalizeClientStatusCountKey,
} from '@/components/clients-management';
import {
  CLIENT_LIST_APPLIED_FILTER_DEFAULTS,
  CLIENT_LIST_FILTERS_PERSIST_OPTS,
  buildClientListFilterPayload,
  compactClientListFiltersForStorage,
  mergeStoredClientListFilters,
} from '@/components/clients-management/constants';

const ClientCreateDrawer = lazy(
  () => import('@/components/clients-management/client-create-drawer'),
);
import { useDispatch, useSelector } from 'react-redux';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';

import { fetchCenterAccess, selectCenterAccess, setSelectedCenters } from '@/redux/centerSlice';
import {
  getClientListThunk,
  selectClientListData,
  resetClientList,
  setClientSorting,
} from '@/redux/clientSlice';
import { useTableVariant } from '@/hooks/use-table-variant';
import { useDebounce } from '@/hooks/use-debounce';
import WithModulePermission from '@/route-protection/with-module-permission';
import {
  adaptGlobalCenterIntent,
  deriveGlobalCenterIntent,
  isExplicitlyEmptyIntent,
} from '@/utils/global-center-filter';

/**
 * Map global-centre access state → `navbarFilter` value for
 * `getClientListThunk`. Thin wrapper around the shared adapter so the page
 * stays free of the centre-filter contract details (see
 * `@/utils/global-center-filter`).
 *
 * - `undefined` → access not yet resolved; caller should hold off the API call.
 * - `null`      → all accessible centres are selected (omit the navbar param).
 * - `{ center: string[] }` → explicit subset (incl. `{ center: [] }` when the
 *   user cleared the header, which the backend honours as "match nothing").
 */
function buildClientNavbarFilter(centerAccess) {
  return adaptGlobalCenterIntent.client(deriveGlobalCenterIntent(centerAccess));
}

const Clients = () => {
  const navigate = useNavigate();
  const CLIENTS_FILTER_SESSION_KEY = 'clients-management-view-filter-dropdown';

  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [appliedFilters, setAppliedFilters] = usePersistedFilters({
    storageKey: CLIENTS_FILTER_SESSION_KEY,
    defaultFilters: CLIENT_LIST_APPLIED_FILTER_DEFAULTS,
    persistIncludeKeys: CLIENT_LIST_FILTERS_PERSIST_OPTS.includeKeys,
    persistTrimStringArrays: CLIENT_LIST_FILTERS_PERSIST_OPTS.trimStringArrayElements,
    persistArrayOrStringDefaultEquivalence:
      CLIENT_LIST_FILTERS_PERSIST_OPTS.arrayOrStringDefaultEquivalence,
  });

  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
    status: 'active',
  }));

  // 1. Initialize from persistence
  useEffect(() => {
    if (filtersInitialized) return;

    const merged = mergeStoredClientListFilters(appliedFilters);
    setFilters((prev) => ({
      ...prev,
      center: merged.center ?? '',
      zone: merged.zone ?? '',
      floor: merged.floor ?? '',
      state: merged.state ?? '',
      city: merged.city ?? '',
      status: merged.status ?? 'active',
    }));
    setFiltersInitialized(true);
  }, [appliedFilters, filtersInitialized]);

  // 2. Persist to storage
  useEffect(() => {
    if (!filtersInitialized) return;

    const compacted = compactClientListFiltersForStorage(appliedFilters);
    const currentCompacted = compactClientListFiltersForStorage(filters);

    if (JSON.stringify(compacted) !== JSON.stringify(currentCompacted)) {
      setAppliedFilters(filters);
    }
  }, [filters, filtersInitialized, appliedFilters, setAppliedFilters]);
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const clientsTableRef = React.useRef(null);
  const initialStatusCountsRef = React.useRef(null);
  const initialTabCountsRef = React.useRef(null);
  const hasInitialCountsLoadedRef = React.useRef(false);
  const dispatch = useDispatch();
  const centerAccess = useSelector(selectCenterAccess);
  const clientListData = useSelector(selectClientListData);

  const currentFilters = filters || DEFAULT_FILTERS;

  const [searchTerm, setSearchTerm] = useState(currentFilters.search || '');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const isDebouncing = searchTerm !== debouncedSearchTerm;

  useEffect(() => {
    if (debouncedSearchTerm !== (currentFilters.search || '')) {
      setFilters((previous) => ({
        ...previous,
        search: debouncedSearchTerm || '',
      }));
    }
  }, [debouncedSearchTerm, currentFilters.search]);

  const lastApiCallRef = React.useRef('');
  const lastOrderByRef = React.useRef('');
  const isScrollPaginationRef = React.useRef(false);
  const pageSize = 20;

  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'clients-table',
    'compact',
  );

  useEffect(() => {
    if (centerAccess.status === 'idle') {
      dispatch(fetchCenterAccess());
    }
  }, [dispatch, centerAccess.status]);

  const filtersString = React.useMemo(
    () =>
      JSON.stringify({
        search: filters.search || '',
        status: filters.status || 'active',
        center: filters.center || '',
        zone: filters.zone || '',
        floor: filters.floor || '',
        state: filters.state || '',
        city: filters.city || '',
        engagement: filters.engagement || '',
      }),
    [
      filters.search,
      filters.status,
      filters.center,
      filters.floor,
      filters.state,
      filters.city,
      filters.zone,
      filters.engagement,
    ],
  );

  const filterPayload = React.useMemo(
    () =>
      buildClientListFilterPayload({
        status: filters.status || 'active',
        center: filters.center || '',
        zone: filters.zone || '',
        floor: filters.floor || '',
        state: filters.state || '',
        city: filters.city || '',
        engagement: filters.engagement || '',
      }),
    [
      filters.status,
      filters.center,
      filters.zone,
      filters.floor,
      filters.state,
      filters.city,
      filters.engagement,
    ],
  );

  const lastFiltersRef = React.useRef('');

  // Reset list and clear API call ref when filters change (including search cleared to "")
  // so the fetch effect always runs with the new filters (same pattern as ticket-management)
  useEffect(() => {
    const currentFiltersString = filtersString;
    const filtersChanged =
      lastFiltersRef.current !== currentFiltersString && lastFiltersRef.current !== '';

    if (filtersChanged) {
      dispatch(resetClientList());
      lastApiCallRef.current = '';
      isScrollPaginationRef.current = false;
    }

    lastFiltersRef.current = currentFiltersString;
  }, [dispatch, filtersString]);

  useEffect(() => {
    return () => {
      lastApiCallRef.current = '';
      lastOrderByRef.current = '';
      isScrollPaginationRef.current = false;
      lastFiltersRef.current = '';
      dispatch(resetClientList());
    };
  }, [dispatch]);

  const orderBy = React.useMemo(() => {
    if (clientListData.sorting && clientListData.sorting.length > 0) {
      const sort = clientListData.sorting[0];
      const fieldMap = {
        name: 'customer_name',
        customer_name: 'customer_name',
        spoc: 'custom_spoc_name',
      };
      const backendField = fieldMap[sort.id] || sort.id;
      const direction = sort.desc ? 'desc' : 'asc';
      return `${backendField} ${direction}`;
    }
    return 'creation desc';
  }, [clientListData.sorting]);

  useEffect(() => {
    if (!filtersInitialized) return;

    if (isScrollPaginationRef.current) {
      isScrollPaginationRef.current = false;
      return;
    }

    // Wait for centre access so the first call carries the correct global header. Skipping
    // this gate would race the auto-population logic and send an unscoped request.
    const navbarFilter = buildClientNavbarFilter(centerAccess);
    if (navbarFilter === undefined) return;

    let orderByValue = 'creation desc';
    if (clientListData.sorting && clientListData.sorting.length > 0) {
      const sort = clientListData.sorting[0];
      const fieldMap = {
        name: 'customer_name',
        customer_name: 'customer_name',
        spoc: 'custom_spoc_name',
      };
      const backendField = fieldMap[sort.id] || sort.id;
      const direction = sort.desc ? 'desc' : 'asc';
      orderByValue = `${backendField} ${direction}`;
    }

    const currentPage = 1;
    const callKey = `${filtersString}-${JSON.stringify(navbarFilter)}-${currentPage}-${pageSize}-${orderByValue}-${refetchTrigger}`;

    if (lastApiCallRef.current === callKey) {
      return;
    }

    lastApiCallRef.current = callKey;
    lastOrderByRef.current = orderByValue;

    // Reset list here ensuring it only happens when an API call is about to be made
    dispatch(resetClientList());

    const controller = dispatch(
      getClientListThunk({
        search: filters.search || '',
        filters: filterPayload,
        page: currentPage,
        pageSize,
        orderBy: orderByValue,
        append: false,
        navbarFilter,
        status: filters.status || 'active',
        center: filters.center || '',
        state: filters.state || '',
        city: filters.city || '',
      }),
    );

    return () => {
      controller.abort?.();
    };
  }, [
    dispatch,
    filtersString,
    filterPayload,
    clientListData.sorting,
    pageSize,
    refetchTrigger,
    centerAccess.status,
    centerAccess.selectedCenters,
    centerAccess.data?.length,
    filtersInitialized,
  ]);

  const handleLoadMore = useCallback(() => {
    if (clientListData.isLoading || clientListData.isLoadingMore || !clientListData.hasMore) {
      return;
    }

    const navbarFilter = buildClientNavbarFilter(centerAccess);
    if (navbarFilter === undefined) return;

    const nextPage = (clientListData.currentPage || 1) + 1;
    isScrollPaginationRef.current = true;

    dispatch(
      getClientListThunk({
        search: filters.search || '',
        filters: filterPayload,
        page: nextPage,
        pageSize,
        orderBy,
        append: true,
        navbarFilter,
        status: filters.status || 'active',
        center: filters.center || '',
        state: filters.state || '',
        city: filters.city || '',
      }),
    );
  }, [
    dispatch,
    clientListData.currentPage,
    clientListData.isLoading,
    clientListData.isLoadingMore,
    clientListData.hasMore,
    pageSize,
    filters,
    orderBy,
    centerAccess,
  ]);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  const handleStatusTabChange = useCallback((value) => {
    setFilters((previous) => ({ ...previous, status: value || 'active' }));
    lastApiCallRef.current = '';
    isScrollPaginationRef.current = false;
  }, []);

  const handleFiltersChange = useCallback((filtersObject) => {
    setAppliedFilters(filtersObject);
    setFilters((previous) => ({
      ...previous,
      center: filtersObject.center ?? '',
      zone: filtersObject.zone ?? '',
      floor: filtersObject.floor ?? '',
      state: filtersObject.state ?? '',
      city: filtersObject.city ?? '',
      status: filtersObject.status ?? 'active',
    }));
    lastApiCallRef.current = '';
    isScrollPaginationRef.current = false;
  }, []);

  const handleEngagementFilterChange = useCallback((engagement) => {
    setFilters((previous) => ({
      ...previous,
      engagement: engagement || '',
    }));
    lastApiCallRef.current = '';
    isScrollPaginationRef.current = false;
  }, []);

  const handleExport = useCallback(() => {
    const clients = clientListData.data || [];
    if (!clients || clients.length === 0) return;

    const headers = [
      'ID',
      'Customer Name',
      'Display Name',
      'Center',
      'Avg. CSI Score',
      'SPOC Name',
      'SPOC Contact Number',
      'Engagement',
      'Status',
      'Created By',
      'Created At',
    ];

    const csvRows = [
      headers.join(','),
      ...clients.map((row) => {
        let centerDisplay = '-';
        if (row.custom_center) {
          if (Array.isArray(row.custom_center)) {
            centerDisplay = row.custom_center.join(', ');
          } else if (typeof row.custom_center === 'string') {
            centerDisplay = row.custom_center;
          }
        }

        return [
          row.name || '-',
          row.customer_name || row.name || '-',
          row.custom_legal_name || '-',
          centerDisplay,
          row.custom_avg_csi_score || '-',
          row.custom_spoc_name || '-',
          row.custom_spoc_contact_num || '-',
          row.engagement || '-',
          row.custom_status || '-',
          row.owner || '-',
          row.creation || '-',
        ]
          .map((cell) => `"${(cell || '').toString().replaceAll('"', '""')}"`)
          .join(',');
      }),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `devx-clients-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [clientListData.data]);

  const handleCreateClient = useCallback(() => {
    setIsCreateClientOpen(true);
  }, []);

  const handleRefresh = useCallback(() => {
    lastApiCallRef.current = '';
    isScrollPaginationRef.current = false;
    setRefetchTrigger((previous) => previous + 1);
  }, []);

  const handleSortingChange = useCallback(
    (newSorting) => {
      lastApiCallRef.current = '';
      dispatch(setClientSorting(newSorting));
    },
    [dispatch],
  );

  const handleCreateClientSuccess = useCallback(() => {
    lastApiCallRef.current = '';
    isScrollPaginationRef.current = false;
    hasInitialCountsLoadedRef.current = false;
    initialStatusCountsRef.current = null;
    initialTabCountsRef.current = null;
    setRefetchTrigger((previous) => previous + 1);
    setIsCreateClientOpen(false);
  }, []);

  const handleRowSelect = useCallback(
    (row) => {
      const clientId = row.name || row.id;
      if (clientId) {
        const path = `/clients/${encodeURIComponent(clientId)}`;
        navigate(path);
      }
    },
    [navigate],
  );

  const handleCenterSelectionChange = useCallback(
    (selectedCenters) => {
      dispatch(setSelectedCenters(selectedCenters));
    },
    [dispatch],
  );

  const filteredClients = useMemo(() => {
    return clientListData.data || [];
  }, [clientListData.data]);

  const context = useMemo(() => {
    if (isExplicitlyEmptyIntent(deriveGlobalCenterIntent(centerAccess))) {
      return 'no_centers';
    }

    const engagement = currentFilters.engagement || '';
    const hasNonDefaultFilters =
      searchTerm ||
      (currentFilters.status && currentFilters.status !== 'active') ||
      currentFilters.center ||
      currentFilters.zone ||
      currentFilters.floor ||
      currentFilters.city ||
      currentFilters.state ||
      Boolean(engagement);

    // Lifecycle chip + toolbar filters always scope the list API
    if (engagement || hasNonDefaultFilters) {
      return 'search';
    }
    return 'default';
  }, [searchTerm, currentFilters, centerAccess]);

  const activeStatusTab = currentFilters.status || 'active';

  const resolveTabCount = useCallback((tabValue, statusCounts) => {
    if (!statusCounts || typeof statusCounts !== 'object') return 0;
    return Object.entries(statusCounts).reduce((sum, [apiKey, count]) => {
      const normalizedKey = normalizeClientStatusCountKey(apiKey);
      if (CLIENT_TAB_COUNT_KEY_MAP[normalizedKey] === tabValue) {
        return sum + (Number(count) || 0);
      }
      return sum;
    }, 0);
  }, []);

  const computeStatusTabCounts = useCallback(
    (statusCounts) =>
      STATUS_TAB_OPTIONS.reduce((accumulator, tab) => {
        accumulator[tab.value] = resolveTabCount(tab.value, statusCounts);
        return accumulator;
      }, {}),
    [resolveTabCount],
  );

  // Pin tab counts from the first unfiltered client_list_view response (same pattern as space management).
  useEffect(() => {
    const hasStatusCounts =
      clientListData.statusCounts && Object.keys(clientListData.statusCounts).length > 0;

    if (!hasInitialCountsLoadedRef.current && hasStatusCounts) {
      initialStatusCountsRef.current = clientListData.statusCounts;
      initialTabCountsRef.current = computeStatusTabCounts(clientListData.statusCounts);
      hasInitialCountsLoadedRef.current = true;
    }
  }, [clientListData.statusCounts, computeStatusTabCounts]);

  const statusTabCounts = useMemo(() => {
    if (initialTabCountsRef.current) {
      return initialTabCountsRef.current;
    }

    const hasStatusCounts =
      clientListData.statusCounts && Object.keys(clientListData.statusCounts).length > 0;

    if (hasStatusCounts) {
      return computeStatusTabCounts(clientListData.statusCounts);
    }

    return computeStatusTabCounts({});
  }, [clientListData.statusCounts, computeStatusTabCounts]);

  return (
    <PageLayout
      contentAreaClassName='overflow-hidden'
      pageTitle='Clients'
      pageIcon={<RiUserLine size={24} />}
      pageDescription='View and manage all your clients from here'
      headerActions={
        <CenterAccessDropdown
          centers={centerAccess.data}
          selectedCenters={centerAccess.selectedCenters}
          onChange={handleCenterSelectionChange}
          isLoading={centerAccess.status === 'loading'}
        />
      }
    >
      <div className='flex h-full min-h-0 flex-col px-8 pb-8'>
        <ClientsStatusTabs
          value={activeStatusTab}
          counts={statusTabCounts}
          onValueChange={handleStatusTabChange}
        />

        {/* Figma Frame 6: flex-col, items-start, gap 16px — filter 36px, badges 24px, table */}
        <div className='mt-5 flex min-h-0 w-full flex-1 flex-col items-start gap-[20px]'>
          <ClientsToolbar
            layout='filter-row'
            filters={{ ...currentFilters, search: searchTerm }}
            onSearchChange={handleSearchChange}
            onExport={handleExport}
            onCreateClient={handleCreateClient}
            tableRef={clientsTableRef}
            tableVariant={tableVariant}
            onTableVariantToggle={toggleTableVariant}
            onFiltersChange={handleFiltersChange}
            appliedFilters={appliedFilters}
          />

          <ClientsEngagementFilters
            value={currentFilters.engagement || ''}
            onValueChange={handleEngagementFilterChange}
          />

          <div className='flex min-h-0 w-full flex-1 flex-col'>
            <ClientsTable
              ref={clientsTableRef}
              rows={filteredClients}
              isLoading={(clientListData.isLoading || isDebouncing) && filteredClients.length === 0}
              error={clientListData.error}
              context={context}
              onRetry={handleRefresh}
              onRowSelect={handleRowSelect}
              onSortingChange={handleSortingChange}
              sorting={clientListData.sorting || []}
              variant={tableVariant}
              enableScrollPagination={true}
              onLoadMore={handleLoadMore}
              hasMore={clientListData.hasMore}
              isLoadingMore={clientListData.isLoadingMore}
            />
          </div>
        </div>
      </div>

      {isCreateClientOpen && (
        <Suspense fallback={null}>
          <ClientCreateDrawer
            open={isCreateClientOpen}
            onOpenChange={setIsCreateClientOpen}
            onSuccess={handleCreateClientSuccess}
            statusTab={activeStatusTab}
          />
        </Suspense>
      )}
    </PageLayout>
  );
};

export default WithModulePermission(Clients, 'Customer');
