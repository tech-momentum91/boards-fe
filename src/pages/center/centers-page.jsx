import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiBuildingLine } from 'react-icons/ri';
import { useTableVariant } from '@/hooks/use-table-variant';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { useDebounce } from '@/hooks/use-debounce';

import PageLayout from '@/components/page-layout';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import {
  CentersStatusTabs,
  CentersToolbar,
  CentersTable,
  DEFAULT_FILTERS,
} from '@/components/centers-management';
import {
  mergeStoredCenterListFilters,
  STATUS_TAB_LOOKUP,
} from '@/components/centers-management/constants';
import { useDispatch, useSelector } from 'react-redux';
import {
  setCreateCenterDrawer,
  setViewCenterDrawer,
  getCenterListThunk,
  updateCenterThunk,
  fetchCenterAccess,
  fetchCenterExportData,
  selectCenterAccess,
  setSelectedCenters,
} from '@/redux/centerSlice';
import CenterExportModal from '@/components/centers-management/center-export-modal';
import { generateSpacePDF } from '@/utils/space-pdf-export';
import CreateCenterDrawer from '@/components/centers-management/create-center-drawer';
import CenterViewDrawer from '@/components/centers-management/center-view-drawer';
import { hasModulePermission } from '@/utils/user-role-utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  deriveGlobalCenterIntent,
  isExplicitlyEmptyIntent,
  isLoadingIntent,
} from '@/utils/global-center-filter';
import {
  buildCenterListRequestScope,
  partitionAppliedFiltersForUnion,
} from '@/utils/combined-scope-filter';

// Centers toolbar fields whose selections should UNION with the global
// header (vs. AND like a normal list filter). See
// `@/utils/combined-scope-filter` and `devx.api.union_with_navbar` for the
// full contract; in short: when the global header is a *subset* of centres
// and the user picks any of these toolbar values, the visible rows become
// `header_subset ∪ centres_matching(zone/state/city/micro_market)`.
//
// Only "scope-widening" attributes belong here. `status` is intentionally
// excluded — it's bound to the status tabs (Active / Upcoming / Inactive)
// which are hard narrowers; union-ing them would re-include every centre
// already in the header even when the user picks one specific tab.
const CENTER_UNION_ELIGIBLE_FIELDS = ['city', 'state', 'zone', 'micro_market'];

// Fields that ALWAYS AND with whichever scope the union/intersect logic
// produces, never widen it:
//   * `carpet_area` — `<=` upper bound
//   * `status`       — driven by the status tabs (single-pick narrower)
const CENTER_INTERSECT_ONLY_FIELDS = ['carpet_area', 'status'];

const buildCenterToolbarClause = (field, value) => {
  if (field === 'carpet_area') {
    if (value === undefined || value === null || value === '') return null;
    return ['carpet_area', '<=', value];
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (value.length === 1) return [field, '=', value[0]];
    return [field, 'in', value];
  }
  if (value === undefined || value === null || value === '') return null;
  return [field, '=', value];
};

const buildOrderByFromSorting = (sorting) => {
  if (!Array.isArray(sorting) || sorting.length === 0) {
    return 'creation desc';
  }
  const sortField = sorting[0].id;
  const sortOrder = sorting[0].desc ? 'desc' : 'asc';
  const fieldMap = {
    name: 'center_name',
    zone: 'zone',
    city: 'city',
    micro_market: 'micro_market',
    status: 'status',
    carpet_area: 'carpet_area',
  };
  const backendField = fieldMap[sortField] || sortField;
  if (backendField === 'carpet_area') {
    return `abs(${backendField}) ${sortOrder}`;
  }
  return `${backendField} ${sortOrder}`;
};

// Helper function to convert date string to UTC timestamp
const dateToUTCTimestamp = (dateString) => {
  if (!dateString) return null;

  // Handle YYYY-MM-DD format (for created_at)
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(`${dateString}T00:00:00Z`).getTime();
  }

  // Handle YYYY-MM-DD HH:MM AM/PM format (for last_updated)
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})\s+(am|pm)$/i);
  if (match) {
    const [, year, month, day, hour, minute, ampm] = match;
    let hour24 = Number.parseInt(hour, 10);
    if (ampm.toUpperCase() === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (ampm.toUpperCase() === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    return new Date(
      Date.UTC(
        Number.parseInt(year, 10),
        Number.parseInt(month, 10) - 1,
        Number.parseInt(day, 10),
        hour24,
        Number.parseInt(minute, 10),
        0,
        0,
      ),
    ).getTime();
  }

  // Fallback: try to parse as-is
  return new Date(dateString).getTime();
};

// Mock data for centers - replace with actual API calls
// const MOCK_CENTERS = [
//   {
//     id: 'CEN-001',
//     name: 'Downtown Center',
//     city: 'Mumbai',
//     state: 'Maharashtra',
//     micro_market: 'South Mumbai',
//     carpet_area: 5000,
//     status: 'Active',
//     manager_name: 'John Doe',
//     created_at: dateToUTCTimestamp('2024-01-15'),
//     created_by: 'Admin User',
//     last_updated: dateToUTCTimestamp('2024-01-20 10:30 AM'),
//   },
//   {
//     id: 'CEN-002',
//     name: 'Business Park Center',
//     city: 'Delhi',
//     state: 'Delhi',
//     micro_market: 'Gurgaon',
//     carpet_area: 7500,
//     status: 'Upcoming',
//     manager_name: 'Jane Smith',
//     created_at: dateToUTCTimestamp('2024-02-01'),
//     created_by: 'Admin User',
//     last_updated: dateToUTCTimestamp('2024-02-05 02:15 PM'),
//   },
//   {
//     id: 'CEN-003',
//     name: 'Tech Hub Center',
//     city: 'Bangalore',
//     state: 'Karnataka',
//     micro_market: 'Whitefield',
//     carpet_area: 6000,
//     status: 'Inactive',
//     manager_name: 'Mike Johnson',
//     created_at: dateToUTCTimestamp('2023-12-10'),
//     created_by: 'Admin User',
//     last_updated: dateToUTCTimestamp('2024-01-10 09:45 AM'),
//   },
//   {
//     id: 'CEN-004',
//     name: 'Corporate Plaza',
//     city: 'Pune',
//     state: 'Maharashtra',
//     micro_market: 'Hinjewadi',
//     carpet_area: 8500,
//     status: 'Active',
//     manager_name: 'Sarah Williams',
//     created_at: dateToUTCTimestamp('2024-01-20'),
//     created_by: 'Admin User',
//     last_updated: dateToUTCTimestamp('2024-01-25 11:20 AM'),
//   },
//   {
//     id: 'CEN-005',
//     name: 'Innovation Tower',
//     city: 'Hyderabad',
//     state: 'Telangana',
//     micro_market: 'HITEC City',
//     carpet_area: 9200,
//     status: 'Active',
//     manager_name: 'David Brown',
//     created_at: dateToUTCTimestamp('2024-01-10'),
//     created_by: 'Admin User',
//     last_updated: dateToUTCTimestamp('2024-01-18 03:45 PM'),
//   },
//   {
//     id: 'CEN-006',
//     name: 'Metro Center',
//     city: 'Chennai',
//     state: 'Tamil Nadu',
//     micro_market: 'OMR',
//     carpet_area: 6800,
//     status: 'Upcoming',
//     manager_name: 'Priya Sharma',
//     created_at: dateToUTCTimestamp('2024-02-10'),
//     created_by: 'Admin User',
//     last_updated: dateToUTCTimestamp('2024-02-15 09:30 AM'),
//   },
//   {
//     id: 'CEN-007',
//     name: 'Financial District',
//     city: 'Mumbai',
//     state: 'Maharashtra',
//     micro_market: 'Bandra Kurla',
//     carpet_area: 11000,
//     status: 'Active',
//     manager_name: 'Raj Patel',
//     created_at: dateToUTCTimestamp('2023-11-15'),
//     created_by: 'Admin User',
//     last_updated: dateToUTCTimestamp('2024-01-12 02:00 PM'),
//   },
//   {
//     id: 'CEN-008',
//     name: 'Green Valley Center',
//     city: 'Bangalore',
//     state: 'Karnataka',
//     micro_market: 'Electronic City',
//     carpet_area: 7200,
//     status: 'Inactive',
//     manager_name: 'Anita Reddy',
//     created_at: dateToUTCTimestamp('2023-10-20'),
//     created_by: 'Admin User',
//     last_updated: dateToUTCTimestamp('2023-12-05 10:15 AM'),
//   },
//   {
//     id: 'CEN-009',
//     name: 'Sunset Plaza',
//     city: 'Delhi',
//     state: 'Delhi',
//     micro_market: 'Noida',
//     carpet_area: 5500,
//     status: 'Upcoming',
//     manager_name: 'Vikram Singh',
//     created_at: dateToUTCTimestamp('2024-02-20'),
//     created_by: 'Admin User',
//     last_updated: dateToUTCTimestamp('2024-02-25 04:30 PM'),
//   },
//   {
//     id: 'CEN-010',
//     name: 'Riverside Center',
//     city: 'Kolkata',
//     state: 'West Bengal',
//     micro_market: 'Salt Lake',
//     carpet_area: 6400,
//     status: 'Active',
//     manager_name: 'Sneha Das',
//     created_at: dateToUTCTimestamp('2024-01-05'),
//     created_by: 'Admin User',
//     last_updated: dateToUTCTimestamp('2024-01-15 01:20 PM'),
//   },
//   {
//     id: 'CEN-011',
//     name: 'Tech Park North',
//     city: 'Bangalore',
//     state: 'Karnataka',
//     micro_market: 'Marathahalli',
//     carpet_area: 7800,
//     status: 'Active',
//     manager_name: 'Ravi Kumar',
//     created_at: dateToUTCTimestamp('2023-12-20'),
//     created_by: 'Admin User',
//     last_updated: dateToUTCTimestamp('2024-01-08 11:45 AM'),
//   },
//   {
//     id: 'CEN-012',
//     name: 'Central Business Hub',
//     city: 'Mumbai',
//     state: 'Maharashtra',
//     micro_market: 'Andheri',
//     carpet_area: 9600,
//     status: 'Upcoming',
//     manager_name: 'Meera Joshi',
//     created_at: dateToUTCTimestamp('2024-02-15'),
//     created_by: 'Admin User',
//     last_updated: dateToUTCTimestamp('2024-02-22 03:00 PM'),
//   },
//   {
//     id: 'CEN-013',
//     name: 'Heritage Center',
//     city: 'Delhi',
//     state: 'Delhi',
//     micro_market: 'Connaught Place',
//     carpet_area: 4200,
//     status: 'Inactive',
//     manager_name: 'Arjun Mehta',
//     created_at: dateToUTCTimestamp('2023-09-10'),
//     created_by: 'Admin User',
//     last_updated: dateToUTCTimestamp('2023-11-20 09:00 AM'),
//   },
//   {
//     id: 'CEN-014',
//     name: 'Skyline Tower',
//     city: 'Pune',
//     state: 'Maharashtra',
//     micro_market: 'Viman Nagar',
//     carpet_area: 8800,
//     status: 'Active',
//     manager_name: 'Neha Gupta',
//     created_at: dateToUTCTimestamp('2024-01-25'),
//     created_by: 'Admin User',
//     last_updated: dateToUTCTimestamp('2024-02-01 12:30 PM'),
//   },
//   {
//     id: 'CEN-015',
//     name: 'Ocean View Center',
//     city: 'Mumbai',
//     state: 'Maharashtra',
//     micro_market: 'Worli',
//     carpet_area: 10500,
//     status: 'Active',
//     manager_name: 'Karan Malhotra',
//     created_at: dateToUTCTimestamp('2023-12-05'),
//     created_by: 'Admin User',
//     last_updated: dateToUTCTimestamp('2024-01-10 02:45 PM'),
//   },
//   {
//     id: 'CEN-016',
//     name: 'Garden City Center',
//     city: 'Bangalore',
//     state: 'Karnataka',
//     micro_market: 'Indiranagar',
//     carpet_area: 5900,
//     status: 'Upcoming',
//     manager_name: 'Divya Nair',
//     created_at: dateToUTCTimestamp('2024-02-28'),
//     created_by: 'Admin User',
//     last_updated: dateToUTCTimestamp('2024-03-05 10:00 AM'),
//   },
//   {
//     id: 'CEN-017',
//     name: 'Capital Plaza',
//     city: 'Delhi',
//     state: 'Delhi',
//     micro_market: 'Dwarka',
//     carpet_area: 7100,
//     status: 'Inactive',
//     manager_name: 'Amit Verma',
//     created_at: dateToUTCTimestamp('2023-08-15'),
//     created_by: 'Admin User',
//     last_updated: dateToUTCTimestamp('2023-10-30 11:15 AM'),
//   },
//   {
//     id: 'CEN-018',
//     name: 'Silicon Valley Center',
//     city: 'Hyderabad',
//     state: 'Telangana',
//     micro_market: 'Gachibowli',
//     carpet_area: 8700,
//     status: 'Active',
//     manager_name: 'Lakshmi Rao',
//     created_at: dateToUTCTimestamp('2024-01-30'),
//     created_by: 'Admin User',
//     last_updated: dateToUTCTimestamp('2024-02-08 01:30 PM'),
//   },
//   {
//     id: 'CEN-019',
//     name: 'Marina Center',
//     city: 'Chennai',
//     state: 'Tamil Nadu',
//     micro_market: 'Adyar',
//     carpet_area: 5300,
//     status: 'Upcoming',
//     manager_name: 'Suresh Iyer',
//     created_at: dateToUTCTimestamp('2024-03-01'),
//     created_by: 'Admin User',
//     last_updated: dateToUTCTimestamp('2024-03-08 09:45 AM'),
//   },
//   {
//     id: 'CEN-020',
//     name: 'Sunrise Center',
//     city: 'Pune',
//     state: 'Maharashtra',
//     micro_market: 'Koregaon Park',
//     carpet_area: 6200,
//     status: 'Active',
//     manager_name: 'Pooja Desai',
//     created_at: dateToUTCTimestamp('2024-02-12'),
//     created_by: 'Admin User',
//     last_updated: dateToUTCTimestamp('2024-02-18 04:20 PM'),
//   },
// ];

const Centers = () => {
  const navigate = useNavigate();
  const CENTER_FILTER_SESSION_KEY = 'centers-management-view-filter-dropdown';

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // Table variant management with localStorage persistence
  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'centers-management-table',
    'compact',
  );
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [appliedFilters, setAppliedFilters] = usePersistedFilters({
    storageKey: CENTER_FILTER_SESSION_KEY,
    defaultFilters: mergeStoredCenterListFilters({}),
    persistIncludeKeys: ['city', 'state', 'zone', 'status', 'micro_market', 'carpet_area'],
    persistNumericKeys: ['carpet_area'],
    persistTrimStringArrays: true,
  });

  // 1. Initialize from persistence
  useEffect(() => {
    if (filtersInitialized) return;
    setFiltersInitialized(true);
  }, [appliedFilters, filtersInitialized]);
  const [sorting, setSorting] = useState([]);
  const centersTableRef = React.useRef(null);
  const isScrollPaginationRef = React.useRef(false);
  const lastApiCallRef = React.useRef('');
  const sortingRef = React.useRef(sorting);
  const didMountSortingRef = React.useRef(false);
  const initialStatusCountsRef = React.useRef(null);
  const initialTabCountsRef = React.useRef(null);
  const hasInitialCountsLoadedRef = React.useRef(false);
  const previousSelectedCentersRef = React.useRef(null);
  const searchKeywordRef = React.useRef('');
  const debouncedSearchRef = React.useRef('');
  const [isPendingFetch, setIsPendingFetch] = useState(false);

  const currentFilters = filters || DEFAULT_FILTERS;
  searchKeywordRef.current = currentFilters.search || '';
  const debouncedSearch = useDebounce(currentFilters.search || '', 500);
  debouncedSearchRef.current = debouncedSearch;

  const dispatch = useDispatch();
  const { isOpen: isCreateCenterDrawerOpen } = useSelector(
    (state) => state.center.createCenterDrawer,
  );
  const { isOpen: isViewCenterDrawerOpen, selectedCenter } = useSelector(
    (state) => state.center.viewCenterDrawer,
  );
  const {
    data: centers,
    isLoading,
    isLoadingMore,
    error,
    page,
    pageSize,
    hasMore,
    totalCount,
    // Pre-status-filter total — powers the "All" tab badge so it stays
    // constant while the user clicks between Active / Upcoming / Inactive.
    // See `devx.api.listview.list_with_search_filters`.
    totalCountExcludingStatus,
    status,
    statusCounts,
  } = useSelector((state) => state.center.centerListData);
  const centerAccess = useSelector(selectCenterAccess);

  // Keep latest sorting in a ref (so search/filters effect can use it without triggering extra fetches)
  React.useEffect(() => {
    sortingRef.current = sorting;
  }, [sorting]);

  // Partition the toolbar `appliedFilters` into two legs:
  //   - `intersectFilters`  -> sent as `filters` (always AND, e.g. carpet_area)
  //   - `unionFilters`      -> sent as `or_filters_with_navbar` (UNION with
  //                            the global navbar header — see
  //                            `@/utils/combined-scope-filter` and
  //                            `devx.api.union_with_navbar`).
  //
  // Returning both from a single memo keeps every call site (initial fetch,
  // sort fetch, load-more, refresh, drawer close) on the exact same scope so
  // pagination doesn't drift between the two legs.
  const { intersectFilters: filtersArray, unionFilters: orFiltersWithNavbar } = useMemo(
    () =>
      partitionAppliedFiltersForUnion({
        appliedFilters,
        unionFields: CENTER_UNION_ELIGIBLE_FIELDS,
        intersectFields: CENTER_INTERSECT_ONLY_FIELDS,
        buildClause: buildCenterToolbarClause,
      }),
    [appliedFilters],
  );

  const globalCenterIntent = useMemo(() => deriveGlobalCenterIntent(centerAccess), [centerAccess]);
  const noCenters = isExplicitlyEmptyIntent(globalCenterIntent);
  const centerAccessLoading = isLoadingIntent(globalCenterIntent);

  const centerListScope = useMemo(
    () => buildCenterListRequestScope(centerAccess, filtersArray, orFiltersWithNavbar),
    [centerAccess, filtersArray, orFiltersWithNavbar],
  );

  const dispatchCenterList = useCallback(
    (options = {}) => {
      const scope = options.scope ?? centerListScope;
      if (!scope?.shouldFetch) return;

      dispatch(
        getCenterListThunk({
          keyword: options.keyword ?? searchKeywordRef.current ?? '',
          filters: scope.filters,
          or_filters_with_navbar: scope.or_filters_with_navbar,
          navbar_filter: scope.navbar_filter,
          page: options.page ?? 1,
          pageSize: options.pageSize ?? 20,
          append: options.append ?? false,
          order_by:
            options.orderBy ??
            buildOrderByFromSorting(options.sorting ?? sortingRef.current ?? sorting),
        }),
      );
    },
    [dispatch, centerListScope, sorting],
  );

  // Fetch center access data on component mount
  // useEffect(() => {

  //   const fetchCenterAccessAPI = async () => {
  //     const result = await dispatch(fetchCenterAccess());
  //     debugger;
  //     if (result.type === 'center/getCenterList/rejected') {
  //       showErrorToast(result.payload);
  //       console.error('Error fetching center access:', result.payload);
  //     }
  //   };

  //   if (centerAccess.status === 'idle') {
  //     fetchCenterAccessAPI();
  //   }
  // }, [dispatch, centerAccess.status]);

  // Fetch center access when idle (header data for global filter + list scope)
  React.useEffect(() => {
    if (centerAccess.status === 'idle') {
      dispatch(fetchCenterAccess());
    }
  }, [dispatch, centerAccess.status]);

  // Fetch centers when debounced search/filters change
  React.useEffect(() => {
    if (!filtersInitialized) return;
    // Skip if this is a scroll-triggered pagination fetch
    if (isScrollPaginationRef.current && page > 1) {
      isScrollPaginationRef.current = false;
      return;
    }

    // Check if selectedCenters actually changed (prevent infinite loop)
    const currentSelectedCenters = JSON.stringify(centerAccess.selectedCenters || []);
    const previousSelectedCenters = JSON.stringify(previousSelectedCentersRef.current || []);

    // Only proceed if selectedCenters actually changed, or if it's the first time
    if (
      previousSelectedCentersRef.current !== null &&
      currentSelectedCenters === previousSelectedCenters
    ) {
      // Selected centers haven't changed, but we still need to check other dependencies
      // This will be handled by the API call tracking below
    } else {
      previousSelectedCentersRef.current = centerAccess.selectedCenters;
    }

    // Mark that a new fetch is about to be scheduled so the table can show loading state
    setIsPendingFetch(true);

    if (centerAccessLoading || noCenters || !centerListScope.shouldFetch) {
      setIsPendingFetch(false);
      return;
    }

    const orderBy = buildOrderByFromSorting(sortingRef.current || []);
    const currentApiCall = `${debouncedSearch}-${JSON.stringify(centerListScope)}-${orderBy}`;
    if (lastApiCallRef.current === currentApiCall) {
      setIsPendingFetch(false);
      return;
    }
    lastApiCallRef.current = currentApiCall;

    dispatchCenterList({ page: 1, pageSize: 20, append: false, orderBy, keyword: debouncedSearch });
  }, [
    debouncedSearch,
    appliedFilters,
    orFiltersWithNavbar,
    filtersArray,
    centerAccess.selectedCenters,
    page,
    filtersInitialized,
    centerAccess.status,
    centerAccessLoading,
    noCenters,
    centerListScope,
    dispatchCenterList,
  ]);

  // Clear pending flag once Redux loading state settles
  React.useEffect(() => {
    if (status !== 'loading') {
      setIsPendingFetch(false);
    }
  }, [status]);

  // Fetch immediately when sorting changes (backend sorting)
  React.useEffect(() => {
    if (!filtersInitialized || !didMountSortingRef.current) {
      didMountSortingRef.current = true;
      return;
    }

    if (centerAccessLoading || noCenters || !centerListScope.shouldFetch) {
      return;
    }

    // Build order_by from sorting
    let orderBy = 'creation desc';
    if (Array.isArray(sorting) && sorting.length > 0) {
      const sortField = sorting[0].id;
      const sortOrder = sorting[0].desc ? 'desc' : 'asc';
      // Map frontend field to backend field
      const fieldMap = {
        name: 'center_name',
        zone: 'zone',
        city: 'city',
        micro_market: 'micro_market',
        status: 'status',
        carpet_area: 'carpet_area',
      };
      const backendField = fieldMap[sortField] || sortField;
      if (backendField === 'carpet_area') {
        orderBy = `abs(${backendField}) ${sortOrder}`;
      } else {
        orderBy = `${backendField} ${sortOrder}`;
      }
    }

    // Share the same dedup key as the search/filters effect above - both
    // effects fetch "the current view of the center list", and without this
    // they race each other (and both fire) whenever an unrelated dependency
    // like centerListScope changes reference as centerAccess finishes loading.
    const currentApiCall = `${debouncedSearchRef.current}-${JSON.stringify(centerListScope)}-${orderBy}`;
    if (lastApiCallRef.current === currentApiCall) {
      return;
    }
    lastApiCallRef.current = currentApiCall;

    dispatch(
      getCenterListThunk({
        keyword: debouncedSearchRef.current,
        filters: filtersArray,
        or_filters_with_navbar: orFiltersWithNavbar,
        // navbar_filter: navbarFilter,
        page: 1,
        pageSize: 20,
        append: false,
        order_by: orderBy,
      }),
    );
  }, [
    sorting,
    filtersInitialized,
    centerAccessLoading,
    noCenters,
    centerListScope,
    filtersArray,
    orFiltersWithNavbar,
    dispatch,
  ]);

  // Handle load more for scroll pagination (match bookings/spaces behavior)
  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) {
      return;
    }

    if (centerAccessLoading || noCenters || !centerListScope.shouldFetch) {
      return;
    }

    const nextPage = page + 1;
    isScrollPaginationRef.current = true;
    const orderBy = buildOrderByFromSorting(sortingRef.current || []);

    dispatch(
      getCenterListThunk({
        keyword: currentFilters.search || '',
        filters: filtersArray,
        or_filters_with_navbar: orFiltersWithNavbar,
        // navbar_filter: navbarFilter,
        page: nextPage,
        pageSize,
        append: true,
        order_by: orderBy,
      }),
    );
  }, [
    centerAccessLoading,
    noCenters,
    centerListScope,
    dispatchCenterList,
    filtersArray,
    orFiltersWithNavbar,
    page,
    pageSize,
    hasMore,
    isLoading,
    isLoadingMore,
  ]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      lastApiCallRef.current = '';
      isScrollPaginationRef.current = false;
    };
  }, []);

  // Centers are already filtered by API, no need for client-side filtering
  const filteredCenters = useMemo(() => {
    if (!Array.isArray(centers)) {
      return [];
    }
    return centers;
  }, [centers]);

  // Get active status tab (prefer persisted/applied dropdown status).
  // This keeps the selected tab in sync after reload when filters are restored from session.
  const activeStatusTab =
    Array.isArray(appliedFilters?.status) && appliedFilters.status.length === 1
      ? appliedFilters.status[0]
      : currentFilters.status?.[0] || 'all';

  const context = useMemo(() => {
    if (noCenters) {
      return 'no_centers';
    }

    const hasSearch = Boolean(currentFilters.search);
    const hasStatusTab = Array.isArray(currentFilters.status) && currentFilters.status.length > 0;

    // Treat any non-empty applied filter (array with length or truthy scalar) as an active filter
    const hasFilterApplied = Object.values(appliedFilters || {}).some((value) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== undefined && value !== null && value !== '';
    });

    if (hasSearch || hasStatusTab || hasFilterApplied) {
      return 'search';
    }

    return 'default';
  }, [
    currentFilters.search,
    currentFilters.status,
    appliedFilters,
    // centerAccess.status,
    // centerAccess.data,
    // centerAccess.selectedCenters,
    noCenters,
  ]);

  const handleSearchChange = useCallback((value) => {
    setFilters((previous) => ({ ...previous, search: value }));
  }, []);

  const handleStatusTabChange = useCallback((value) => {
    if (value === 'all') {
      setFilters((previous) => ({ ...previous, status: [] }));
      setAppliedFilters((previous) => ({ ...previous, status: [] }));
    } else {
      setFilters((previous) => ({ ...previous, status: [value] }));
      setAppliedFilters((previous) => ({ ...previous, status: [value] }));
    }
  }, []);

  const handleFiltersChange = useCallback((filtersArray, filters) => {
    setAppliedFilters(filters);

    // Keep status tabs in sync with dropdown status selection.
    // Tabs support a single status value; multi-select falls back to "all".
    const selectedStatuses = Array.isArray(filters?.status)
      ? filters.status
          .map((s) => STATUS_TAB_LOOKUP[String(s).toLowerCase()] || String(s))
          .filter(Boolean)
      : [];

    setFilters((previous) => ({
      ...previous,
      status: selectedStatuses.length === 1 ? [selectedStatuses[0]] : [],
    }));
  }, []);

  const handleCreateCenterDrawerChange = useCallback(
    (open) => {
      dispatch(setCreateCenterDrawer(open));
    },
    [dispatch],
  );

  const handleViewCenterDrawerChange = useCallback(
    (open) => {
      dispatch(setViewCenterDrawer(open));

      if (centerAccess.status !== 'succeeded') {
        return;
      }

      dispatch(
        getCenterListThunk({
          keyword: currentFilters.search || '',
          filters: filtersArray,
          or_filters_with_navbar: orFiltersWithNavbar,
          // navbar_filter: navbarFilter,
          page: 1,
          pageSize: 20,
          append: false,
        }),
      );
    },
    [dispatchCenterList, currentFilters.search, filtersArray, orFiltersWithNavbar],
  );

  const handleColumnsClick = useCallback(() => {
    // Column manager is now handled in the toolbar
  }, []);

  const handleRefresh = useCallback(() => {
    if (centerAccess.status !== 'succeeded') {
      return;
    }

    dispatch(
      getCenterListThunk({
        keyword: currentFilters.search || '',
        filters: filtersArray,
        or_filters_with_navbar: orFiltersWithNavbar,
        // navbar_filter: navbarFilter,
        page: 1,
        pageSize: 20,
        append: false,
      }),
    );
  }, [dispatch, currentFilters.search, orFiltersWithNavbar, filtersArray]);

  const handleRowSelect = useCallback(
    (row) => {
      // Navigate to center detail page instead of opening drawer
      if (row?.name) {
        navigate(`/centers/${row.name}`);
      }
    },
    [navigate],
  );

  const handleSortingChange = useCallback((newSorting) => {
    setSorting(newSorting);
  }, []);

  const handleCreateCenter = useCallback(() => {
    dispatch(setCreateCenterDrawer(true));
  }, [dispatch]);

  const handleCenterSelectionChange = useCallback(
    (selectedCenters) => {
      dispatch(setSelectedCenters(selectedCenters));
      // Optionally filter centers based on selection
      // You can add filtering logic here if needed
    },
    [dispatch],
  );

  const handleFieldUpdate = useCallback(
    async (centerId, field, value) => {
      try {
        await dispatch(
          updateCenterThunk({ center_id: centerId, payload: { [field]: value } }),
        ).unwrap();
        showSuccessToast('Saved');
      } catch (error) {
        showErrorToast(error || 'Failed to update center');
      }
    },
    [dispatch],
  );

  // Get permissions from user role
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const permissions = useMemo(() => {
    return {
      canEdit: hasModulePermission(userSideBarPerm, 'Center', 'write'),
      canDelete: hasModulePermission(userSideBarPerm, 'Center', 'delete'),
      canView: hasModulePermission(userSideBarPerm, 'Center', 'read'),
    };
  }, [userSideBarPerm]);

  return (
    <PageLayout
      contentAreaClassName='overflow-hidden'
      pageTitle='Centers'
      pageIcon={<RiBuildingLine size={24} />}
      pageDescription='Manage all your center locations.'
      headerActions={
        <CenterAccessDropdown
          centers={centerAccess.data}
          selectedCenters={centerAccess.selectedCenters}
          onChange={handleCenterSelectionChange}
          isLoading={centerAccess.status === 'loading'}
        />
      }
    >
      <div className='flex flex-col gap-6 px-8 pb-6 flex-1 min-h-0'>
        <CentersStatusTabs
          value={activeStatusTab}
          totalCount={totalCountExcludingStatus ?? totalCount}
          counts={statusCounts}
          onValueChange={handleStatusTabChange}
        />

        <CentersToolbar
          filters={currentFilters}
          onSearchChange={handleSearchChange}
          onCreateCenter={handleCreateCenter}
          onColumnsClick={handleColumnsClick}
          onExport={() => setIsExportModalOpen(true)}
          tableRef={centersTableRef}
          tableVariant={tableVariant}
          onTableVariantToggle={toggleTableVariant}
          onFiltersChange={handleFiltersChange}
          appliedFilters={appliedFilters}
        />

        <div className='flex-1 min-h-0 flex flex-col w-full'>
          <CentersTable
            ref={centersTableRef}
            rows={filteredCenters}
            isLoading={(isLoading || isPendingFetch) && filteredCenters.length === 0}
            error={error}
            context={context}
            onRetry={handleRefresh}
            onRowSelect={handleRowSelect}
            onSortingChange={handleSortingChange}
            sorting={sorting}
            permissions={permissions}
            tableId='centers-management-table'
            variant={tableVariant}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            enableScrollPagination={true}
            onFieldUpdate={permissions.canEdit ? handleFieldUpdate : undefined}
          />
        </div>

        <CreateCenterDrawer
          open={isCreateCenterDrawerOpen}
          onOpenChange={handleCreateCenterDrawerChange}
          side='right'
        />

        <CenterViewDrawer
          open={isViewCenterDrawerOpen}
          onOpenChange={handleViewCenterDrawerChange}
          center={selectedCenter}
          side='right'
        />

        <CenterExportModal
          open={isExportModalOpen}
          onOpenChange={setIsExportModalOpen}
          isExporting={isExporting}
          onExport={async (filters) => {
            try {
              setIsExporting(true);
              const result = await dispatch(fetchCenterExportData(filters)).unwrap();
              await generateSpacePDF(result, filters);
              showSuccessToast('PDF exported successfully.');
              setIsExportModalOpen(false);
            } catch (error) {
              showErrorToast(error, { defaultMessage: 'Failed to export PDF. Please try again.' });
            } finally {
              setIsExporting(false);
            }
          }}
        />
      </div>
    </PageLayout>
  );
};

export default Centers;
