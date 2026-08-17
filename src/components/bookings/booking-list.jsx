/**
 * Booking List Container
 * Business logic container for the table/list view of bookings
 * Handles Redux state, data fetching, and booking-specific logic
 */

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import BookingToolbar from '@/components/bookings/booking-toolbar';
import BookingTable from '@/components/bookings/booking-table';
import BookingEventDetailDrawer from '@/components/bookings/booking-event-detail-drawer';
import BookingCreateDrawer from '@/components/bookings/booking-create-drawer';
import {
  fetchBookings,
  fetchListViewResources,
  fetchClients,
  fetchCenters,
  openBookingDetail,
  openBookingForm,
  setListFilters,
  resetBookingList,
} from '@/redux/bookingSlice';
import { useTableVariant } from '@/hooks/use-table-variant';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';
// 1. Import the hook
import { useDebounce } from '@/hooks/use-debounce';

const BOOKING_LIST_VIEW_FILTERS_KEY = 'bookings-listview-filter-dropdown';

const DEFAULT_BOOKING_LIST_DROPDOWN_FILTERS = {
  center: null,
  resourceTypes: [],
  clients: [],
};

const BOOKING_LIST_DROPDOWN_PERSIST_INCLUDE_KEYS = ['center', 'resourceTypes', 'clients'];
const BOOKING_LIST_DROPDOWN_PERSIST_TRUTHY_OBJECT_KEYS = ['center'];

const BOOKING_LIST_DROPDOWN_FILTER_STORAGE_OPTS = {
  includeKeys: BOOKING_LIST_DROPDOWN_PERSIST_INCLUDE_KEYS,
  truthyObjectKeys: BOOKING_LIST_DROPDOWN_PERSIST_TRUTHY_OBJECT_KEYS,
};

function mergeStoredBookingListDropdownFilters(stored) {
  return {
    ...DEFAULT_BOOKING_LIST_DROPDOWN_FILTERS,
    ...(stored && typeof stored === 'object' ? stored : {}),
    center: stored?.center ?? null,
    resourceTypes: Array.isArray(stored?.resourceTypes) ? stored.resourceTypes : [],
    clients: Array.isArray(stored?.clients) ? stored.clients : [],
  };
}

const BookingList = () => {
  const dispatch = useDispatch();
  const { listView, shared } = useSelector((state) => state.booking);
  const { filters } = listView;
  const { bookings } = listView;
  const listReloadKey = listView.reloadKey ?? 0;
  const { resources } = listView;
  const tableRef = useRef(null);
  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'bookings-table',
    'compact',
  );

  // List view specific filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // 2. Create the debounced value (500ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const isDebouncing = searchQuery !== debouncedSearchQuery;

  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: BOOKING_LIST_VIEW_FILTERS_KEY,
    defaultFilters: DEFAULT_BOOKING_LIST_DROPDOWN_FILTERS,
    persistIncludeKeys: BOOKING_LIST_DROPDOWN_PERSIST_INCLUDE_KEYS,
    persistTruthyObjectKeys: BOOKING_LIST_DROPDOWN_PERSIST_TRUTHY_OBJECT_KEYS,
  });

  // 1. Initialize from persistence (Runs only once when persistedFilters are loaded)
  useEffect(() => {
    if (filtersInitialized) return;

    dispatch(resetBookingList());
    dispatch(setListFilters(mergeStoredBookingListDropdownFilters(persistedFilters)));
    setFiltersInitialized(true);
  }, [persistedFilters, dispatch, filtersInitialized]);

  // 2. Persist to storage (Runs when filters change, but only after initialization)
  useEffect(() => {
    if (!filtersInitialized) return;

    const compacted = compactFiltersForSessionStorage(
      filters,
      DEFAULT_BOOKING_LIST_DROPDOWN_FILTERS,
      BOOKING_LIST_DROPDOWN_FILTER_STORAGE_OPTS,
    );
    const currentCompacted = compactFiltersForSessionStorage(
      persistedFilters,
      DEFAULT_BOOKING_LIST_DROPDOWN_FILTERS,
      BOOKING_LIST_DROPDOWN_FILTER_STORAGE_OPTS,
    );

    if (JSON.stringify(compacted) !== JSON.stringify(currentCompacted)) {
      setPersistedFilters(filters);
    }
  }, [filters, filtersInitialized, setPersistedFilters, persistedFilters]);

  const [dateRange, setDateRange] = useState(() => ({
    from: null,
    to: null,
  }));
  const [statusFilter, setStatusFilter] = useState('all');
  const [sorting, setSorting] = useState([]);
  const [filterCount, setFilterCount] = useState(0);
  const [groupByField, setGroupByField] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');

  // Fetch initial data (centers and clients) - only once on mount
  useEffect(() => {
    dispatch(fetchCenters());
    dispatch(fetchClients());
  }, [dispatch]);

  // Fetch list view resources (spaces) based on shared filters
  useEffect(() => {
    dispatch(fetchListViewResources({ filters }));
  }, [dispatch, filters]);

  // Fetch bookings for list view from backend based on search, filters, date range & sorting
  // listReloadKey triggers refetch after delete (or other invalidation)
  useEffect(() => {
    if (!filtersInitialized) return;

    dispatch(
      fetchBookings({
        // 3. Use debouncedSearchQuery for the API call
        keyword: debouncedSearchQuery,
        status: statusFilter,
        dateRange,
        filters,
        page: 1,
        pageSize: bookings.pageSize || 20,
        append: false,
        sorting,
      }),
    );
    // 4. Update dependency array to watch debouncedSearchQuery and listReloadKey
  }, [
    dispatch,
    filters,
    debouncedSearchQuery,
    dateRange,
    statusFilter,
    sorting,
    listReloadKey,
    filtersInitialized,
  ]);

  // Keep filter badge count in sync with the Filters dropdown: total selected items
  // (clients + centers + resource types). Same formula as BookingFilterDropdown.
  // Search, status, and date range are separate controls.
  useEffect(() => {
    const centersLen = Array.isArray(filters.center)
      ? filters.center.length
      : filters.center
        ? 1
        : 0;
    const clientsLen = Array.isArray(filters.clients) ? filters.clients.length : 0;
    const resourceTypesLen = Array.isArray(filters.resourceTypes)
      ? filters.resourceTypes.length
      : 0;
    setFilterCount(centersLen + clientsLen + resourceTypesLen);
  }, [filters]);

  // Loading and error states
  const isLoading = bookings.isLoading || resources.isLoading;
  const hasError = bookings.error || resources.error;
  const error = bookings.error || resources.error;

  // Determine if any search or filters are applied for empty state messaging
  // Note: We use raw 'searchQuery' here so UI context switches immediately
  const hasActiveFilters = useMemo(() => {
    const hasSearch = Boolean(searchQuery.trim());
    const hasStatusFilter = statusFilter && statusFilter !== 'all';
    const hasDateRange = Boolean(dateRange.from && dateRange.to);
    const hasToolbarFilters =
      (Array.isArray(filters.center) ? filters.center.length > 0 : Boolean(filters.center)) ||
      (Array.isArray(filters.resourceTypes) && filters.resourceTypes.length > 0) ||
      (Array.isArray(filters.clients) && filters.clients.length > 0);

    return hasSearch || hasStatusFilter || hasDateRange || hasToolbarFilters;
  }, [searchQuery, statusFilter, dateRange, filters]);

  // Event handlers
  const handleRowSelect = useCallback(
    (booking) => {
      dispatch(openBookingDetail(booking));
    },
    [dispatch],
  );

  const handleRetry = useCallback(() => {
    dispatch(fetchListViewResources({ filters }));
    dispatch(
      fetchBookings({
        // Use debounced value for retry to match current list state
        keyword: debouncedSearchQuery,
        status: statusFilter,
        dateRange,
        filters,
        page: 1,
        pageSize: bookings.pageSize || 20,
        append: false,
        sorting,
      }),
    );
  }, [
    dispatch,
    filters,
    debouncedSearchQuery,
    statusFilter,
    dateRange,
    bookings.pageSize,
    sorting,
  ]);

  // Pass raw backend data directly to table (no transformation)
  const tableData = useMemo(() => {
    return bookings.data || [];
  }, [bookings.data]);

  const handleLoadMore = useCallback(() => {
    if (!bookings.hasMore || bookings.isLoading || bookings.isLoadingMore) return;

    dispatch(
      fetchBookings({
        // Use debounced value for pagination to ensure consistency with current list
        keyword: debouncedSearchQuery,
        status: statusFilter,
        dateRange,
        filters,
        page: (bookings.page || 1) + 1,
        pageSize: bookings.pageSize || 20,
        append: true,
        sorting,
      }),
    );
  }, [
    bookings.hasMore,
    bookings.isLoading,
    bookings.isLoadingMore,
    bookings.page,
    bookings.pageSize,
    dispatch,
    debouncedSearchQuery, // Dependency updated
    statusFilter,
    dateRange,
    filters,
    sorting,
  ]);

  return (
    <>
      <div className='flex flex-col h-full'>
        {/* Toolbar */}
        <div className='border-b border-stroke-soft-200 bg-bg-white-0 px-4 py-3'>
          <BookingToolbar
            viewType='list'
            // Pass raw searchQuery for immediate input feedback
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            filterCount={filterCount}
            onFilterCountChange={setFilterCount}
            tableVariant={tableVariant}
            onTableVariantToggle={toggleTableVariant}
            tableRef={tableRef}
            groupByField={groupByField}
            onGroupByFieldChange={setGroupByField}
            groupOrder={groupOrder}
            onGroupOrderChange={setGroupOrder}
          />
        </div>

        {/* Table */}
        <div className={groupByField ? 'flex-1 overflow-auto' : 'flex-1 min-h-0 flex flex-col'}>
          <BookingTable
            ref={tableRef}
            data={tableData}
            isLoading={(isLoading || isDebouncing) && tableData.length === 0}
            isLoadingMore={bookings.isLoadingMore}
            hasMore={bookings.hasMore}
            enableScrollPagination
            onLoadMore={handleLoadMore}
            error={error}
            onRetry={handleRetry}
            onRowSelect={handleRowSelect}
            sorting={sorting}
            onSortingChange={setSorting}
            variant={tableVariant}
            context={hasActiveFilters ? 'search' : 'default'}
            groupByField={groupByField}
            groupOrder={groupOrder}
          />
        </div>
      </div>

      {/* Modals and Drawers */}
      {shared.selectedBooking.isOpen && <BookingEventDetailDrawer />}
      <BookingCreateDrawer />
    </>
  );
};

export default BookingList;
