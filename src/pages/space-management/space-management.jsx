import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RiBox3Line } from 'react-icons/ri';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';

import PageLayout from '@/components/page-layout';
import ErrorBoundary from '@/components/ui/error-boundary';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import { useTableVariant } from '@/hooks/use-table-variant';
import { useWidgetVisibility } from '@/hooks/use-widget-visibility';
import { fetchCenterAccess, selectCenterAccess, setSelectedCenters } from '@/redux/centerSlice';
import {
  fetchSpaceListData,
  selectSpaceListData,
  resetSpaceList,
  deleteSpaceThunk,
  fetchSpaceExportData,
  fetchClientListForSpaceDetailThunk,
  selectSpaceDetailClientList,
  updateSpaceField,
} from '@/redux/spaceSlice';
import AllocatedSpaceModal from '@/components/space-management/allocate-space-modal';
import { hasModulePermission } from '@/utils/user-role-utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';
import { generateSpacePDF } from '@/utils/space-pdf-export';
import {
  CreateNewSpaceModal,
  DEFAULT_SPACE_FILTERS,
  SpaceStats,
  SpaceStatusTabs,
  SpaceTable,
  SpaceToolbar,
  DeleteSpaceModal,
  SPACE_LIST_APPLIED_FILTER_DEFAULTS,
  buildSpaceListApiFiltersFromApplied,
  buildSpaceListviewFiltersPayload,
  mergeStoredSpaceListFilters,
  hasSpaceListAppliedFilters,
  SPACE_INVENTORY_TYPE_TAB_VALUES,
} from '@/components/space-management';
import { FIELD_MAP } from '@/components/space-management/constants';
import { SPACE_TYPE } from '@/schemas/space-schema';
import WidgetVisibilityDropdown from '@/components/ui/widget-visibility-dropdown';
import SpaceExportModal from '@/components/space-management/space-export-modal';
import SpaceLayoutView from '@/components/space-management/space-layout-view';
import { resolveLayoutCenterFilter } from '@/utils/space-layout-list-utils';
import { exportSpaceLayoutImages } from '@/utils/space-layout-export';

// Helper to build order_by string from sorting array
const buildOrderBy = (sorting) => {
  if (!Array.isArray(sorting) || sorting.length === 0) {
    return 'creation desc';
  }
  const sortField = sorting[0].id;
  const sortOrder = sorting[0].desc ? 'desc' : 'asc';
  const backendField = FIELD_MAP[sortField] || sortField;
  return `${backendField} ${sortOrder}`;
};

const inventoryTypeFilterIncludes = (filters, value) =>
  filters.some(
    (f) =>
      f[0] === 'inventory_type' &&
      ((f[1] === '=' && f[2] === value) ||
        (f[1] === 'in' && Array.isArray(f[2]) && f[2].includes(value))),
  );

const getEffectiveInventoryTypeView = (inventoryTypeTab, appliedSpaceTypes) => {
  const tab = String(inventoryTypeTab || '').trim();
  if (SPACE_INVENTORY_TYPE_TAB_VALUES.includes(tab)) return tab;

  if (Array.isArray(appliedSpaceTypes) && appliedSpaceTypes.length === 1) {
    const only = String(appliedSpaceTypes[0] || '').trim();
    if (SPACE_INVENTORY_TYPE_TAB_VALUES.includes(only)) return only;
  }

  return '';
};

const buildFiltersFromTabParam = (tab) => {
  if (!tab || tab === 'all') return DEFAULT_SPACE_FILTERS;
  if (SPACE_INVENTORY_TYPE_TAB_VALUES.includes(tab)) {
    return { ...DEFAULT_SPACE_FILTERS, status: '', inventory_type: tab };
  }
  return { ...DEFAULT_SPACE_FILTERS, status: tab, inventory_type: '' };
};

// Helper to combine API filters with status filter
const combineFilters = (apiFilters, status, inventory_type) => {
  const combined = [...apiFilters];
  if (inventory_type) {
    combined.push(['inventory_type', '=', inventory_type]);
    if (inventory_type === 'Resource' && !combined.some((f) => f[0] === 'bookable')) {
      combined.push(['bookable', '=', 'Yes']);
    }
  } else {
    // When not on an inventory-type tab, exclude Parking / Common Area from All & status tabs.
    for (const inv of ['Parking', 'Common Area']) {
      const hasExclude = combined.some(
        (f) => f[0] === 'inventory_type' && f[1] === '!=' && f[2] === inv,
      );
      const hasInclude = inventoryTypeFilterIncludes(combined, inv);
      if (!hasExclude && !hasInclude) {
        combined.push(['inventory_type', '!=', inv]);
      }
    }

    if (status && status !== 'all') {
      const hasStatusFilter = combined.some((f) => f[0] === 'status');
      if (!hasStatusFilter) {
        combined.push(['status', '=', status === 'On Notice' ? 'Notice' : status]);
      }
    }

    // All / Occupied / Available: exclude bookable spaces
    if (
      (!status || status === 'all' || status === 'Occupied' || status === 'Available') &&
      !combined.some((f) => f[0] === 'bookable')
    ) {
      combined.push(['bookable', '!=', 'Yes']);
    }
  }

  return combined;
};

// Helper to calculate stats from status counts
// totalCountOverride comes from API `total_count` and is used for the "All" value
const SPACES_FILTER_SESSION_KEY = 'spaces-management-view-filter-dropdown';
const SPACE_VIEW_MODE_STORAGE_KEY = 'space-management-view-mode';
const calculateStatsFromCounts = (statusCounts = {}, totalCountOverride) => {
  // const totalFromCounts = Number(statusCounts.All || statusCounts.all || 0);

  const occupied = Number(statusCounts.Occupied || 0);
  const available = Number(statusCounts.Available || 0);
  const onNotice = Number(statusCounts.Notice || statusCounts['On Notice'] || 0);
  const resource = Number(statusCounts.Resource || 0);
  const parking = Number(statusCounts.Parking || 0);
  const commonArea = Number(statusCounts['Common Area'] || 0);
  const total = occupied + available;
  const occupancyRate = total > 0 ? `${Math.round((occupied / total) * 100)}%` : '0%';

  return {
    counts: {
      all: total,
      Occupied: occupied,
      Available: available,
      'On Notice': onNotice,
      Resource: resource,
      Parking: parking,
      'Common Area': commonArea,
    },
    stats: [
      {
        key: 'occupancyRate',
        label: 'Occupancy Rate',
        value: occupancyRate,
        trend: { direction: 'up', value: '+20%' },
      },
      {
        key: 'occupied',
        label: 'Occupied Space',
        value: occupied,
        trend: { direction: 'up', value: '+10%' },
      },
      {
        key: 'available',
        label: 'Available Spaces',
        value: available,
        trend: { direction: 'down', value: '+40%' },
      },
      {
        key: 'resource',
        label: 'Resources',
        value: resource,
        trend: { direction: 'up', value: '+40%' },
      },
    ],
  };
};

const formatSpaceListInr = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  return `₹${Number(value).toLocaleString('en-IN')}`;
};

const formatSpaceIntDisplay = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  return Number(value).toLocaleString('en-IN');
};

const buildStatsFromListAggregate = (listStats) => [
  {
    key: 'aggOpportunityLoss',
    label: 'Opportunity loss',
    value: formatSpaceListInr(listStats.opportunity_loss),
  },
  {
    key: 'aggAvailableSpaces',
    label: 'Available spaces',
    value: formatSpaceIntDisplay(listStats.available_spaces),
  },
  {
    key: 'aggTotalAvailableSeats',
    label: 'Total available seats',
    value: formatSpaceIntDisplay(listStats.total_available_seats),
  },
  {
    key: 'aggTotalRevenue',
    label: 'Total revenue',
    value: formatSpaceListInr(listStats.total_revenue),
  },
];

const SpaceManagement = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const centerAccess = useSelector(selectCenterAccess);
  const spaceListData = useSelector(selectSpaceListData);

  const canDelete = useMemo(
    () => hasModulePermission(userSideBarPerm, 'Space', 'delete'),
    [userSideBarPerm],
  );
  const canEdit = useMemo(
    () => hasModulePermission(userSideBarPerm, 'Space', 'write'),
    [userSideBarPerm],
  );

  const [filters, setFilters] = useState(() => buildFiltersFromTabParam(searchParams.get('tab')));
  const [appliedFilters, setAppliedFilters] = usePersistedFilters({
    storageKey: SPACES_FILTER_SESSION_KEY,
    defaultFilters: SPACE_LIST_APPLIED_FILTER_DEFAULTS,
    persistIncludeKeys: [
      'center',
      'client',
      'status',
      'spaceType',
      'zone',
      'availableSeats',
      'parkingType',
      'assigningType',
    ],
    persistTrimStringArrays: true,
    persistPositiveNumberStringKeys: ['availableSeats'],
  });

  const apiFilters = useMemo(
    () => buildSpaceListApiFiltersFromApplied(appliedFilters, centerAccess.data),
    [appliedFilters, centerAccess.data],
  );

  const hasAppliedDropdownFilters = useMemo(
    () => hasSpaceListAppliedFilters(appliedFilters),
    [appliedFilters],
  );

  const [sorting, setSorting] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  /** Pre-fill create-space form when opened via /spaces?createSpace=1&center=... */
  const [createModalInitialCenter, setCreateModalInitialCenter] = useState(null);
  const [createModalInitialSpaceType, setCreateModalInitialSpaceType] = useState(null);
  const handledBookingSpacesLinkRef = useRef(false);
  const [spaceToDelete, setSpaceToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLayoutExporting, setIsLayoutExporting] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === 'undefined') return 'list';
    const saved = window.sessionStorage.getItem(SPACE_VIEW_MODE_STORAGE_KEY);
    return saved === 'layout' ? 'layout' : 'list';
  });
  const [initialStatsReady, setInitialStatsReady] = useState(false);
  const [isPendingFetch, setIsPendingFetch] = useState(false);
  const [spaceToAllocate, setSpaceToAllocate] = useState(null);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const spaceDetailClientList = useSelector(selectSpaceDetailClientList);
  const clientsList = spaceDetailClientList?.data ?? [];

  useEffect(() => {
    if (isAllocateModalOpen) {
      dispatch(fetchClientListForSpaceDetailThunk());
    }
  }, [isAllocateModalOpen, dispatch]);

  const spaceTableRef = useRef(null);
  const sortingRef = useRef(sorting);
  const filtersRef = useRef(filters);
  const apiFiltersRef = useRef([]);
  const appliedFiltersRef = useRef(appliedFilters);
  const didMountSortingRef = useRef(false);
  const isScrollPaginationRef = useRef(false);
  const lastApiCallRef = useRef('');
  const initialStatsRef = useRef(null);
  const initialCountsRef = useRef(null);
  const initialStatusCountsRef = useRef(null);
  const initialTotalCountRef = useRef(null);
  const hasInitialDataLoadedRef = useRef(false);
  const initialFetchDispatchedRef = useRef(false);
  const hasSeenLoadingRef = useRef(false);

  const handleFieldUpdate = useCallback(
    async (spaceId, field, value) => {
      const fieldMap = {
        spaceName: 'inventory_name',
        floor: 'floor',
        carpetArea: 'agreement_carpet_area',
        actualCarpetArea: 'actual_carpet_area',
        expectedCarpetRate: 'expected_carpet_rate',
        expectedPerSeatRate: 'expected_per_seat_rate',
      };
      try {
        await dispatch(
          updateSpaceField({ spaceId, fieldname: fieldMap[field] || field, value }),
        ).unwrap();
        showSuccessToast('Saved');
        const f = filtersRef.current || DEFAULT_SPACE_FILTERS;
        const page = spaceListData.currentPage || 1;
        dispatch(
          fetchSpaceListData({
            keyword: f.search || '',
            filters: combineFilters(apiFiltersRef.current, f.status, f.inventory_type),
            order_by: buildOrderBy(sortingRef.current || []),
            page,
            pageSize: spaceListData.pageSize || 20,
            append: false,
            replacePage: page,
          }),
        );
      } catch (error) {
        showErrorToast(error || 'Failed to update space');
      }
    },
    [dispatch, spaceListData.currentPage, spaceListData.pageSize],
  );

  // Table variant management with localStorage persistence (same pattern as Ticket)
  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'space-management-table',
    'compact',
  );

  // Widget visibility management with localStorage persistence
  const { widgetVisibility, toggleWidget, hideAllWidgets, WIDGET_KEYS } = useWidgetVisibility(
    'space-management-widgets',
  );
  const [isWidgetVisibilityOpen, setIsWidgetVisibilityOpen] = useState(false);

  const currentFilters = useMemo(() => {
    const baseFilters = filters || DEFAULT_SPACE_FILTERS;
    return {
      ...baseFilters,
      status: baseFilters.status && baseFilters.status !== '' ? baseFilters.status : 'all',
      inventory_type:
        baseFilters.inventory_type && baseFilters.inventory_type !== ''
          ? baseFilters.inventory_type
          : '',
    };
  }, [filters]);

  // Fetch center access on mount
  useEffect(() => {
    if (centerAccess.status === 'idle') {
      dispatch(fetchCenterAccess());
    }
  }, [centerAccess.status, dispatch]);

  // Open create modal from bookings empty state: /spaces?createSpace=1&center=<id>
  // Pre-fill the create form only; do not change global center access (setSelectedCenters).
  useEffect(() => {
    const wantCreate = searchParams.get('createSpace') === '1';
    if (!wantCreate) {
      handledBookingSpacesLinkRef.current = false;
      return;
    }

    if (handledBookingSpacesLinkRef.current) return;

    if (centerAccess.status !== 'succeeded' && centerAccess.status !== 'failed') {
      return;
    }

    handledBookingSpacesLinkRef.current = true;

    const rawCenterId = searchParams.get('center');
    let resolvedInitialCenter = rawCenterId || null;
    if (resolvedInitialCenter && Array.isArray(centerAccess.data) && centerAccess.data.length > 0) {
      const allowed = centerAccess.data.some(
        (c) => (c?.name ?? c?.value) === resolvedInitialCenter,
      );
      if (!allowed) resolvedInitialCenter = null;
    }

    setCreateModalInitialCenter(resolvedInitialCenter);

    const spaceTypeParam = searchParams.get('spaceType');
    setCreateModalInitialSpaceType(
      spaceTypeParam && Object.values(SPACE_TYPE).includes(spaceTypeParam) ? spaceTypeParam : null,
    );

    setIsCreateModalOpen(true);

    const next = new URLSearchParams(searchParams);
    next.delete('createSpace');
    next.delete('center');
    next.delete('spaceType');
    setSearchParams(next, { replace: true });
  }, [searchParams, centerAccess.status, centerAccess.data, setSearchParams]);

  const handleCreateModalOpenChange = useCallback((open) => {
    setIsCreateModalOpen(open);
    if (!open) {
      setCreateModalInitialCenter(null);
      setCreateModalInitialSpaceType(null);
    }
  }, []);

  // Keep latest sorting and filters in refs (so effects can use them without triggering extra fetches)
  useEffect(() => {
    sortingRef.current = sorting;
  }, [sorting]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    apiFiltersRef.current = apiFilters;
  }, [apiFilters]);

  useEffect(() => {
    appliedFiltersRef.current = appliedFilters;
  }, [appliedFilters]);

  const buildFetchFilters = useCallback((tupleFilters) => {
    return buildSpaceListviewFiltersPayload(tupleFilters, appliedFiltersRef.current);
  }, []);

  // Fetch initial unfiltered data on mount to calculate fixed stats
  useEffect(() => {
    if (!hasInitialDataLoadedRef.current && !initialFetchDispatchedRef.current) {
      // Fetch ALL data without any filters to get complete stats
      initialFetchDispatchedRef.current = true;
      dispatch(
        fetchSpaceListData({
          keyword: '',
          filters: [],
          order_by: 'creation  desc',
          limit_page_length: 20,
        }),
      );
    }
  }, [dispatch]);

  // Track when loading starts to know a real fetch happened
  useEffect(() => {
    if (initialFetchDispatchedRef.current && spaceListData.isLoading === true) {
      hasSeenLoadingRef.current = true;
    }
  }, [spaceListData.isLoading]);

  // Store initial data and calculate stats when initial fetch completes
  useEffect(() => {
    // Only process if initial fetch was dispatched and stats haven't been calculated yet
    if (!initialFetchDispatchedRef.current || hasInitialDataLoadedRef.current) {
      return;
    }

    // Wait for initial fetch to complete:
    // 1. Loading is false (fetch completed)
    // 2. No error
    // 3. We have data array (even empty array is valid - means 0 spaces)
    // 4. We haven't stored initial data yet
    // Note: We check hasSeenLoadingRef to avoid calculating from initial Redux state
    // But if loading becomes false after dispatch, that's also a valid signal
    const fetchCompleted = spaceListData.isLoading === false && initialFetchDispatchedRef.current;
    const hasValidData = spaceListData.data && Array.isArray(spaceListData.data);

    if (
      fetchCompleted &&
      !spaceListData.error &&
      hasValidData &&
      (hasSeenLoadingRef.current || spaceListData.data.length > 0) // Either saw loading OR have actual data
    ) {
      // Store initial status_counts from API response (unfiltered)
      const statusCounts = spaceListData.statusCounts || {};
      initialStatusCountsRef.current = statusCounts;
      initialTotalCountRef.current = spaceListData.totalCount ?? 0;

      // Calculate and store stats from initial counts
      const { counts, stats } = calculateStatsFromCounts(
        statusCounts,
        initialTotalCountRef.current,
      );
      initialCountsRef.current = counts;
      initialStatsRef.current = stats;
      hasInitialDataLoadedRef.current = true;
      setInitialStatsReady(true);
    }
  }, [
    spaceListData.data,
    spaceListData.isLoading,
    spaceListData.error,
    spaceListData.statusCounts,
  ]);

  // Fetch spaces on component mount and when search/status/filters change (with debounce)
  // Skip initial fetch if no filters are active (to let initial stats fetch happen first)
  useEffect(() => {
    // Skip if this is a scroll-triggered pagination fetch
    if (isScrollPaginationRef.current && spaceListData.currentPage > 1) {
      isScrollPaginationRef.current = false;
      return;
    }

    // On initial load with no filters, skip this fetch to let the initial stats fetch happen first
    // But if initial stats are already loaded, proceed with normal fetch
    const isInitialLoad =
      !hasInitialDataLoadedRef.current &&
      (!currentFilters.search || currentFilters.search.trim() === '') &&
      (currentFilters.status === 'all' || !currentFilters.status) &&
      (currentFilters.inventory_type === '' || !currentFilters.inventory_type) &&
      (!apiFilters || apiFilters.length === 0) &&
      !hasAppliedDropdownFilters;

    if (isInitialLoad) {
      return;
    }

    // We know a new fetch will be scheduled; mark pending so the table shows loading
    setIsPendingFetch(true);

    const timer = setTimeout(() => {
      const keyword = currentFilters.search || '';
      const orderBy = buildOrderBy(sortingRef.current || 'creation desc');
      const combinedFilters = combineFilters(
        apiFilters,
        currentFilters.status,
        currentFilters.inventory_type,
      );
      const listviewFilters = buildFetchFilters(combinedFilters);

      // Track API call to prevent redundant fetches
      const currentApiCall = `${keyword}-${JSON.stringify(listviewFilters ?? [])}-${orderBy}`;
      if (lastApiCallRef.current !== currentApiCall) {
        lastApiCallRef.current = currentApiCall;
        dispatch(resetSpaceList());
      }

      dispatch(
        fetchSpaceListData({
          keyword,
          filters: listviewFilters,
          order_by: orderBy,
          page: 1,
          pageSize: 20,
          append: false,
        }),
      );
    }, 500);

    return () => {
      clearTimeout(timer);
      // If the timer is cancelled (filters changed again), clear pending flag
      setIsPendingFetch(false);
    };
  }, [
    dispatch,
    currentFilters.search,
    currentFilters.status,
    currentFilters.inventory_type,
    apiFilters,
    appliedFilters,
    buildFetchFilters,
    hasAppliedDropdownFilters,
    spaceListData.currentPage,
  ]);

  // Clear pending flag once Redux loading state settles
  useEffect(() => {
    if (spaceListData.status !== 'loading') {
      setIsPendingFetch(false);
    }
  }, [spaceListData.status]);

  // Fetch immediately when sorting changes (backend sorting)
  // Note: This should only trigger on sorting changes, not on search/status/filters
  // Those are handled by the debounced effect above
  useEffect(() => {
    if (!didMountSortingRef.current) {
      didMountSortingRef.current = true;
      return;
    }

    // Use current filter values from refs (don't trigger on filter changes)
    const currentFiltersFromRef = filtersRef.current || DEFAULT_SPACE_FILTERS;
    const currentApiFilters = apiFiltersRef.current || [];
    const keyword = currentFiltersFromRef.search || '';
    const status =
      currentFiltersFromRef.status && currentFiltersFromRef.status !== ''
        ? currentFiltersFromRef.status
        : 'all';
    const inventory_type =
      currentFiltersFromRef.inventory_type && currentFiltersFromRef.inventory_type !== ''
        ? currentFiltersFromRef.inventory_type
        : '';

    // Skip if this is the initial load (let the debounced effect handle it)
    const isInitialLoad =
      !hasInitialDataLoadedRef.current &&
      (!keyword || keyword.trim() === '') &&
      (status === 'all' || !status) &&
      (!inventory_type || inventory_type === '') &&
      (!currentApiFilters || currentApiFilters.length === 0) &&
      !hasSpaceListAppliedFilters(appliedFiltersRef.current);

    if (isInitialLoad) {
      return;
    }

    const orderBy = buildOrderBy(sorting);
    const combinedFilters = combineFilters(currentApiFilters, status, inventory_type);
    const listviewFilters = buildFetchFilters(combinedFilters);

    dispatch(resetSpaceList());
    dispatch(
      fetchSpaceListData({
        keyword,
        filters: listviewFilters,
        order_by: orderBy,
        page: 1,
        pageSize: 20,
        append: false,
      }),
    );
  }, [sorting, dispatch]); // Only trigger on sorting changes

  // Handle load more for scroll pagination (match bookings list behavior)
  const handleLoadMore = useCallback(() => {
    if (spaceListData.isLoading || spaceListData.isLoadingMore || !spaceListData.hasMore) {
      return;
    }

    const keyword = currentFilters.search || '';
    const orderBy = buildOrderBy(sortingRef.current || []);
    const combinedFilters = combineFilters(
      apiFilters,
      currentFilters.status,
      currentFilters.inventory_type,
    );
    const listviewFilters = buildFetchFilters(combinedFilters);
    const nextPage = spaceListData.currentPage + 1;

    isScrollPaginationRef.current = true;
    dispatch(
      fetchSpaceListData({
        keyword,
        filters: listviewFilters,
        order_by: orderBy,
        page: nextPage,
        pageSize: spaceListData.pageSize,
        append: true,
      }),
    );
  }, [
    dispatch,
    currentFilters.search,
    currentFilters.status,
    currentFilters.inventory_type,
    apiFilters,
    spaceListData.currentPage,
    spaceListData.pageSize,
    spaceListData.hasMore,
    spaceListData.status,
    buildFetchFilters,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      lastApiCallRef.current = '';
      isScrollPaginationRef.current = false;
      dispatch(resetSpaceList());
    };
  }, [dispatch]);

  const handleCenterSelectionChange = useCallback(
    (selectedCenters) => {
      dispatch(setSelectedCenters(selectedCenters));
    },
    [dispatch],
  );

  // Spaces list uses its own toolbar filters (appliedFilters → apiFilters), not the global
  // navbar center selection — that is shared across modules (e.g. Ticket Management) and
  // must not narrow this table client-side.
  const filteredSpaces = useMemo(() => {
    return spaceListData.data || [];
    // const allSpaces = spaceListData.data || [];
    // const selectedCenters = centerAccess.selectedCenters || [];
    // const enforceCenterFilter = Array.isArray(selectedCenters) && selectedCenters.length > 0;
    //
    // if (!enforceCenterFilter) {
    //   return allSpaces;
    // }
    //
    // return allSpaces.filter((space) =>
    //   selectedCenters.some((centerId) => String(space.centerId) === String(centerId)),
    // );
  }, [spaceListData.data]);

  // Use initial unfiltered status_counts for counts and stats (fixed, never recalculates)
  const { counts, stats } = useMemo(() => {
    // Always use initial counts/stats if available
    if (initialCountsRef.current && initialStatsRef.current) {
      return {
        counts: initialCountsRef.current,
        stats: initialStatsRef.current,
      };
    }

    // Fallback: Calculate from initial status_counts if available
    if (initialStatusCountsRef.current) {
      const { counts: calculatedCounts, stats: calculatedStats } = calculateStatsFromCounts(
        initialStatusCountsRef.current,
        initialTotalCountRef.current,
      );
      return {
        counts: calculatedCounts,
        stats: calculatedStats,
      };
    }

    // Fallback to current statusCounts if initial not available yet
    if (spaceListData.statusCounts) {
      const { counts: calculatedCounts, stats: calculatedStats } = calculateStatsFromCounts(
        spaceListData.statusCounts,
        spaceListData.totalCount,
      );
      return {
        counts: calculatedCounts,
        stats: calculatedStats,
      };
    }

    // Final fallback
    const defaultCounts = {
      all: 0,
      Occupied: 0,
      Available: 0,
      'On Notice': 0,
      Resource: 0,
      Parking: 0,
      'Common Area': 0,
    };
    const defaultStats = [
      {
        key: 'occupancyRate',
        label: 'Occupancy Rate',
        value: '0%',
        trend: { direction: 'up', value: '+20%' },
      },
      {
        key: 'occupied',
        label: 'Occupied Space',
        value: 0,
        trend: { direction: 'up', value: '+10%' },
      },
      {
        key: 'available',
        label: 'Available Spaces',
        value: 0,
        trend: { direction: 'down', value: '+40%' },
      },
      // {
      //   key: 'resource',
      //   label: 'Resources',
      //   value: 0,
      //   trend: { direction: 'up', value: '+40%' },
      // },
    ];
    return { counts: defaultCounts, stats: defaultStats };
  }, [initialStatsReady, spaceListData.statusCounts]);

  const statsForDisplay = useMemo(() => {
    const tabStatus =
      currentFilters.status && currentFilters.status !== '' ? currentFilters.status : null;
    const showAggregate = tabStatus === 'Available' || tabStatus === 'Occupied';
    if (showAggregate && spaceListData.listStats) {
      return buildStatsFromListAggregate(spaceListData.listStats);
    }
    return stats;
  }, [currentFilters.status, spaceListData.listStats, stats]);

  const layoutCenterScope = useMemo(
    () => resolveLayoutCenterFilter(appliedFilters, centerAccess.data),
    [appliedFilters, centerAccess.data],
  );

  const effectiveInventoryTypeView = useMemo(
    () => getEffectiveInventoryTypeView(filters.inventory_type, appliedFilters?.spaceType),
    [filters.inventory_type, appliedFilters?.spaceType],
  );

  const hideOpportunityLossColumn = useMemo(() => {
    if (effectiveInventoryTypeView === 'Resource' || effectiveInventoryTypeView === 'Common Area') {
      return true;
    }
    const tabInv = String(filters.inventory_type || '').trim();
    if (tabInv === 'Pure Rental') return true;
    const spaceTypesOnly = appliedFilters?.spaceType;
    if (Array.isArray(spaceTypesOnly) && spaceTypesOnly.length === 1) {
      const only = String(spaceTypesOnly[0] || '').trim();
      if (only === 'Pure Rental') return true;
    }
    return false;
  }, [effectiveInventoryTypeView, filters.inventory_type, appliedFilters.spaceType]);

  const isLayoutView = viewMode === 'layout';

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(SPACE_VIEW_MODE_STORAGE_KEY, mode);
    }
    if (mode === 'layout') {
      setIsExportModalOpen(false);
    }
  }, []);

  const handleOpenPdfExport = useCallback(() => {
    if (viewMode === 'layout') return;
    setIsExportModalOpen(true);
  }, [viewMode]);

  const handleLayoutDownload = useCallback(async (downloadParams) => {
    setIsLayoutExporting(true);
    try {
      return await exportSpaceLayoutImages(downloadParams);
    } finally {
      setIsLayoutExporting(false);
    }
  }, []);

  const handleStatusTabChange = useCallback(
    (value) => {
      if (SPACE_INVENTORY_TYPE_TAB_VALUES.includes(value)) {
        setFilters((previous) => ({ ...previous, status: '', inventory_type: value }));
      } else {
        setFilters((previous) => ({ ...previous, status: value, inventory_type: '' }));
      }

      if (value !== 'Parking') {
        setAppliedFilters((previous) => {
          const hasParkingFilters =
            (Array.isArray(previous.parkingType) && previous.parkingType.length > 0) ||
            (Array.isArray(previous.assigningType) && previous.assigningType.length > 0);
          if (!hasParkingFilters) return previous;
          return { ...previous, parkingType: [], assigningType: [] };
        });
      }

      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (value === 'all') next.delete('tab');
          else next.set('tab', value);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleSearchChange = useCallback((value) => {
    setFilters((previous) => ({ ...previous, search: value }));
  }, []);

  const handleRowSelect = useCallback(
    (row) => {
      navigate(`/spaces/${row.id}`);
    },
    [navigate],
  );

  const handleDeleteClick = useCallback((space) => {
    setSpaceToDelete(space);
    setIsDeleteModalOpen(true);
  }, []);

  const handleAllocateClick = useCallback((space) => {
    setSpaceToAllocate(space);
    setIsAllocateModalOpen(true);
  }, []);

  const handleSortingChange = useCallback((newSorting) => {
    setSorting(newSorting);
  }, []);

  const handleFiltersChange = useCallback((_filtersArray, filterValues) => {
    const nextAppliedFilters = filterValues || {};
    setAppliedFilters((previous) => {
      if (JSON.stringify(nextAppliedFilters) === JSON.stringify(previous)) return previous;
      return nextAppliedFilters;
    });
  }, []);

  // Determine context for empty states (match ticket-management logic)
  const context = useMemo(() => {
    const hasSearch = Boolean(currentFilters.search);
    const hasStatusTab = currentFilters.status && currentFilters.status !== 'all';

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
  }, [currentFilters, appliedFilters]);

  // Function to recalculate stats from fresh unfiltered data (called after create/delete)
  const recalculateStats = useCallback(() => {
    // Reset all flags and refs to allow recalculation
    hasInitialDataLoadedRef.current = false;
    initialStatusCountsRef.current = null;
    initialCountsRef.current = null;
    initialStatsRef.current = null;
    initialTotalCountRef.current = null;
    initialFetchDispatchedRef.current = true;
    hasSeenLoadingRef.current = false;
    setInitialStatsReady(false);

    // Fetch unfiltered data to recalculate stats
    dispatch(
      fetchSpaceListData({
        keyword: '',
        filters: [],
        order_by: 'creation desc',
        limit_page_length: 100,
      }),
    );
  }, [dispatch]);

  const handleConfirmDelete = useCallback(async () => {
    if (!spaceToDelete?.id) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteSpaceThunk(spaceToDelete.id)).unwrap();
      showSuccessToast('Space removed successfully.');
      setIsDeleteModalOpen(false);
      setSpaceToDelete(null);
      recalculateStats();
      const f = filtersRef.current || {};
      const status = f.status && f.status !== '' ? f.status : 'all';
      const inventory_type = f.inventory_type && f.inventory_type !== '' ? f.inventory_type : '';
      const keyword = f.search || '';
      const orderBy = buildOrderBy(sortingRef.current || []);
      const combinedFilters = combineFilters(apiFiltersRef.current || [], status, inventory_type);
      const listviewFilters = buildFetchFilters(combinedFilters);
      dispatch(resetSpaceList());
      dispatch(
        fetchSpaceListData({
          keyword,
          filters: listviewFilters,
          order_by: orderBy,
          page: 1,
          pageSize: 20,
          append: false,
        }),
      );
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Failed to remove space. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [dispatch, spaceToDelete, recalculateStats, buildFetchFilters]);

  return (
    <>
      <PageLayout
        contentAreaClassName={viewMode === 'list' ? 'overflow-hidden' : ''}
        pageTitle='Spaces'
        pageIcon={<RiBox3Line size={24} />}
        pageDescription='Manage and track all your spaces.'
        headerActions={
          <div className='flex items-center gap-3'>
            <WidgetVisibilityDropdown
              open={isWidgetVisibilityOpen}
              onOpenChange={setIsWidgetVisibilityOpen}
              widgetVisibility={widgetVisibility}
              onToggleWidget={toggleWidget}
              onHideAll={hideAllWidgets}
              tooltipContent={<p>Widget Visibility</p>}
            />
            <CenterAccessDropdown
              centers={centerAccess.data}
              selectedCenters={centerAccess.selectedCenters}
              onChange={handleCenterSelectionChange}
              isLoading={centerAccess.status === 'loading'}
            />
          </div>
        }
      >
        <ErrorBoundary
          onRetry={() => {
            dispatch(resetSpaceList());
            dispatch(
              fetchSpaceListData({
                keyword: currentFilters.search || '',
                filters: buildFetchFilters(
                  combineFilters(apiFilters, currentFilters.status, currentFilters.inventory_type),
                ),
                order_by: buildOrderBy(sortingRef.current || 'creation desc'),
                page: 1,
                pageSize: 20,
                append: false,
              }),
            );
          }}
        >
          <div
            className={cn(
              'mt-5 flex flex-col gap-6 px-8',
              viewMode === 'list' && 'min-h-0 flex-1 pb-6',
            )}
          >
            {widgetVisibility[WIDGET_KEYS.STATS] && <SpaceStats stats={statsForDisplay} />}

            <SpaceStatusTabs
              value={filters.status || filters.inventory_type}
              counts={counts}
              onValueChange={handleStatusTabChange}
              hideBorderTop={!widgetVisibility[WIDGET_KEYS.STATS]}
            />

            <SpaceToolbar
              filters={filters}
              isParkingView={effectiveInventoryTypeView === 'Parking'}
              isCommonAreaView={effectiveInventoryTypeView === 'Common Area'}
              isLayoutView={isLayoutView}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              onSearchChange={handleSearchChange}
              onCreateSpace={() => setIsCreateModalOpen(true)}
              onPdfExport={handleOpenPdfExport}
              onLayoutDownload={handleLayoutDownload}
              onFiltersChange={handleFiltersChange}
              appliedFilters={appliedFilters}
              tableRef={spaceTableRef}
              tableVariant={tableVariant}
              onTableVariantToggle={toggleTableVariant}
              layoutDownloadCenters={centerAccess.data || []}
              isExporting={isExporting}
              isLayoutExporting={isLayoutExporting}
            />

            {isLayoutView ? (
              <SpaceLayoutView
                center={layoutCenterScope.apiCenter}
                filterCenterIds={layoutCenterScope.filterCenterIds}
                search={currentFilters.search || ''}
                statusTab={currentFilters.inventory_type ? '' : currentFilters.status || 'all'}
                inventoryTypeTab={currentFilters.inventory_type || ''}
                filters={appliedFilters}
                enabled={viewMode === 'layout' && !layoutCenterScope.isEmpty}
                context={context}
              />
            ) : (
              <div className='flex-1 min-h-0 flex flex-col w-full'>
                <SpaceTable
                  ref={spaceTableRef}
                  rows={filteredSpaces}
                  isParkingView={effectiveInventoryTypeView === 'Parking'}
                  isResourceView={effectiveInventoryTypeView === 'Resource'}
                  hideOpportunityLossColumn={hideOpportunityLossColumn}
                  isLoading={
                    (spaceListData.status === 'loading' || isPendingFetch) &&
                    filteredSpaces.length === 0
                  }
                  error={spaceListData.error}
                  context={context}
                  onRetry={() => {
                    const keyword = currentFilters.search || '';
                    const orderBy = buildOrderBy(sortingRef.current || []);
                    const combinedFilters = combineFilters(
                      apiFilters,
                      currentFilters.status,
                      currentFilters.inventory_type,
                    );
                    dispatch(resetSpaceList());
                    dispatch(
                      fetchSpaceListData({
                        keyword,
                        filters: buildFetchFilters(combinedFilters),
                        order_by: orderBy,
                        page: 1,
                        pageSize: 20,
                        append: false,
                      }),
                    );
                  }}
                  onRowSelect={handleRowSelect}
                  sorting={sorting}
                  onSortingChange={handleSortingChange}
                  tableId='space-management-table'
                  variant={tableVariant}
                  onLoadMore={handleLoadMore}
                  hasMore={spaceListData.hasMore}
                  isLoadingMore={spaceListData.isLoadingMore}
                  enableScrollPagination={true}
                  onDelete={handleDeleteClick}
                  onAllocate={handleAllocateClick}
                  permissions={{ canDelete }}
                  onFieldUpdate={canEdit ? handleFieldUpdate : undefined}
                />
              </div>
            )}
          </div>
        </ErrorBoundary>
      </PageLayout>

      <DeleteSpaceModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      <CreateNewSpaceModal
        disabledCenter={false}
        open={isCreateModalOpen}
        setOpen={handleCreateModalOpenChange}
        initialCenterId={createModalInitialCenter || undefined}
        initialSpaceType={createModalInitialSpaceType || undefined}
        onSuccess={() => {
          // Recalculate stats from fresh unfiltered data after create
          recalculateStats();

          // Also refresh the space list with current filters to update the table
          // Small delay to ensure unfiltered fetch for stats completes first
          setTimeout(() => {
            const keyword = currentFilters.search || '';
            const orderBy = buildOrderBy(sortingRef.current || []);
            const combinedFilters = combineFilters(
              apiFilters,
              currentFilters.status,
              currentFilters.inventory_type,
            );
            dispatch(
              fetchSpaceListData({
                keyword,
                filters: buildFetchFilters(combinedFilters),
                order_by: orderBy,
                page: 1,
                pageSize: 20,
                append: false,
              }),
            );
          }, 200);
        }}
      />

      {viewMode === 'list' ? (
        <SpaceExportModal
          open={isExportModalOpen}
          onOpenChange={setIsExportModalOpen}
          isExporting={isExporting}
          onExport={async (filters) => {
            if (viewMode === 'layout') return;
            try {
              setIsExporting(true);
              const result = await dispatch(fetchSpaceExportData(filters)).unwrap();
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
      ) : null}

      {spaceToAllocate && (
        <AllocatedSpaceModal
          isOpen={isAllocateModalOpen}
          onOpenChange={setIsAllocateModalOpen}
          spaceData={spaceToAllocate}
          clientsList={clientsList}
          onAllocateSuccess={() => {
            recalculateStats();
            const keyword = currentFilters.search || '';
            const orderBy = buildOrderBy(sortingRef.current || []);
            const combinedFilters = combineFilters(
              apiFilters,
              currentFilters.status,
              currentFilters.inventory_type,
            );
            dispatch(resetSpaceList());
            dispatch(
              fetchSpaceListData({
                keyword,
                filters: combinedFilters,
                order_by: orderBy,
                page: 1,
                pageSize: 20,
                append: false,
              }),
            );
          }}
        />
      )}
    </>
  );
};

export default SpaceManagement;
