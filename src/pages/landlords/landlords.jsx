import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiUserLine } from 'react-icons/ri';
import { useTableVariant } from '@/hooks/use-table-variant';

import PageLayout from '@/components/page-layout';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import {
  LandlordsTable,
  LandlordsToolbar,
  LandlordsStatusTabs,
  CreateLandlordModal,
  DEFAULT_FILTERS,
} from '@/components/landlords-management';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { landlordRowMatchesGlobalCenters } from '@/components/landlords-management/landlord-utils';
import {
  DEFAULT_LANDLORD_VIEW_FILTERS,
  mergeStoredLandlordViewFilters,
} from '@/components/centers-management/center-view-landlord-filter-dropdown';
import EditLandlordModal from '@/components/landlords-management/edit-landlord-modal';
import RemoveLandlordModal from '@/components/landlords-management/remove-landlord-modal';
import { useDispatch, useSelector } from 'react-redux';
import {
  setCreateLandlordDrawer,
  setEditLandlordDrawer,
  setRemoveLandlordDrawer,
  getLandlordListThunk,
  resetLandlordList,
  compactLandlordListFiltersForApi,
  updateLandlordFieldThunk,
} from '@/redux/landlordSlice';
import { fetchCenterAccess, selectCenterAccess, setSelectedCenters } from '@/redux/centerSlice';
import { hasModulePermission } from '@/utils/user-role-utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { deriveGlobalCenterIntent, isExplicitlyEmptyIntent } from '@/utils/global-center-filter';

/**
 * Forward the current global-centre selection to `get_landlord_list_view`.
 *
 * Note: Landlords intentionally sends the explicit selection array on every
 * call (including the "all selected" case). This differs from
 * `adaptGlobalCenterIntent.landlord` (which optimises by omitting the param
 * when every accessible centre is selected). We keep the explicit-array
 * behaviour to preserve back-compat with downstream callers/permissions.
 *
 * - `Array` (incl. `[]` for explicit deselect) -> forward as `centers`. The
 *   backend's `parse_global_center_param` honours `[]` as "match nothing".
 * - non-Array -> `null` so the slice omits the param entirely.
 */
const centersQueryParam = (centers) => (Array.isArray(centers) ? centers : null);

const resolveLandlordCenterId = (row, centerOptions) => {
  const fromDetails = row?.center_details?.[0]?.center;
  if (fromDetails) return fromDetails;
  const label = row?.center;
  if (!label) return '';
  return centerOptions.find((o) => o.label === label || o.value === label)?.value || '';
};

const buildLandlordCenterDetailsPayload = (row, field, value, centerOptions) => {
  const existing = row?.center_details?.[0] || {};
  const centerId = field === 'center' ? value : resolveLandlordCenterId(row, centerOptions);
  const matchedCenter = centerOptions.find((o) => o.value === centerId);
  const shopFromRow = Array.isArray(row?.shop_number)
    ? row.shop_number.filter(Boolean).join(', ')
    : row?.shop_number;
  return [
    {
      name: existing.name || '',
      center: centerId,
      center_name: matchedCenter?.label || existing.center_name || row?.center || '',
      block_floor:
        field === 'block_floor' ? value : (existing.block_floor ?? row?.block_floor ?? ''),
      shop_number: field === 'shop_number' ? value : (existing.shop_number ?? shopFromRow ?? ''),
    },
  ];
};

const Landlords = () => {
  const navigate = useNavigate();
  const LANDLORDS_FILTER_SESSION_KEY = 'landlords-management-filters-v1';

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [landlordViewFilters, setLandlordViewFilters] = usePersistedFilters({
    storageKey: LANDLORDS_FILTER_SESSION_KEY,
    defaultFilters: DEFAULT_LANDLORD_VIEW_FILTERS,
    persistScalarDiffKeys: ['centerSource'],
  });
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [sorting, setSorting] = useState([]);
  // Table variant management with localStorage persistence
  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'landlords-management-table',
    'compact',
  );
  const landlordsTableRef = useRef(null);
  const sortingRef = useRef(sorting);
  const didMountSortingRef = useRef(false);
  const isScrollPaginationRef = useRef(false);
  const lastApiCallRef = useRef('');
  const filtersRef = useRef(DEFAULT_FILTERS);
  const landlordViewFiltersRef = useRef(landlordViewFilters);
  const groupByRef = useRef(groupBy);
  const groupOrderRef = useRef(groupOrder);
  const selectedCentersRef = useRef([]);

  const currentFilters = useMemo(() => {
    const baseFilters = filters || DEFAULT_FILTERS;
    // Ensure status is never empty string
    return {
      ...baseFilters,
      status: baseFilters.status && baseFilters.status !== '' ? baseFilters.status : 'all',
    };
  }, [filters]);

  const dispatch = useDispatch();
  const { isOpen: isCreateLandlordDrawerOpen } = useSelector(
    (state) => state.landlord.createLandlordDrawer,
  );
  const {
    data: landlords,
    isLoading,
    isLoadingMore,
    error,
    currentPage,
    pageSize,
    hasMore,
    status,
    totalCount,
    statusCounts,
  } = useSelector((state) => state.landlord.landlordListData);
  const centerAccess = useSelector(selectCenterAccess);

  const globalCentersKey = useMemo(
    () => JSON.stringify([...(centerAccess?.selectedCenters || [])].sort()),
    [centerAccess?.selectedCenters],
  );

  useEffect(() => {
    selectedCentersRef.current = centerAccess?.selectedCenters || [];
  }, [centerAccess?.selectedCenters]);

  // Fetch center access data on component mount
  useEffect(() => {
    if (centerAccess.status === 'idle') {
      dispatch(fetchCenterAccess());
    }
  }, [dispatch, centerAccess.status]);

  // Fetch landlords on component mount and when search/status changes (with debounce).
  //
  // The global centre filter is forwarded to `get_landlord_list_view` on every call. An
  // empty selection (`[]`) is sent through verbatim — the backend treats it as an explicit
  // "match nothing" filter and returns 0 records, which the table then renders via the
  // `no_centers` empty state. We only gate on `centerAccess.status === 'succeeded'` so the
  // initial fetch waits for the user's accessible centres to load (avoids a stale request
  // with `centers: []` before the auto-population runs).
  useEffect(() => {
    // Skip if this is a scroll-triggered pagination fetch
    if (isScrollPaginationRef.current && currentPage > 1) {
      isScrollPaginationRef.current = false;
      return;
    }

    if (centerAccess.status !== 'succeeded') return;

    const timer = setTimeout(() => {
      const currentSorting = sortingRef.current || [];

      // Build order_by from sorting
      let orderBy = 'creation desc';
      if (Array.isArray(currentSorting) && currentSorting.length > 0) {
        const sortField = currentSorting[0].id;
        const sortOrder = currentSorting[0].desc ? 'desc' : 'asc';
        const fieldMap = {
          name: 'landlord_name',
          contact_number: 'contact_number',
          email: 'email_address',
        };
        const backendField = fieldMap[sortField] || sortField;
        orderBy = `${backendField} ${sortOrder}`;
      }

      const filterSig = JSON.stringify(compactLandlordListFiltersForApi(landlordViewFilters) ?? {});

      // Track API call to prevent redundant fetches
      const currentApiCall = `${currentFilters.search || ''}-${currentFilters.status || 'all'}-${orderBy}-${filterSig}-${groupBy}-${groupOrder}-${globalCentersKey}`;
      if (lastApiCallRef.current !== currentApiCall) {
        lastApiCallRef.current = currentApiCall;
        dispatch(resetLandlordList());
      }

      dispatch(
        getLandlordListThunk({
          keyword: currentFilters.search || '',
          status: currentFilters.status || 'all',
          page: 1,
          pageSize: 10,
          append: false,
          order_by: orderBy,
          group_by: groupBy,
          group_order: groupOrder,
          state: currentFilters.state || '',
          // centers: centersQueryParam(selectedCentersRef.current),
          centers: null,
          landlordListFilters: landlordViewFilters,
        }),
      );
    }, 500);

    return () => clearTimeout(timer);
  }, [
    currentFilters.search,
    currentFilters.status,
    landlordViewFilters,
    groupBy,
    groupOrder,
    currentFilters.state,
    // globalCentersKey,
    centerAccess.status,
    // centerAccess.selectedCenters,
    dispatch,
    currentPage,
  ]);

  // Keep latest sorting and filters in refs (so effects can use them without triggering extra fetches)
  useEffect(() => {
    sortingRef.current = sorting;
  }, [sorting]);

  useEffect(() => {
    filtersRef.current = currentFilters;
  }, [currentFilters]);

  useEffect(() => {
    landlordViewFiltersRef.current = landlordViewFilters;
  }, [landlordViewFilters]);

  useEffect(() => {
    groupByRef.current = groupBy;
  }, [groupBy]);

  useEffect(() => {
    groupOrderRef.current = groupOrder;
  }, [groupOrder]);

  // Fetch immediately when sorting changes (backend sorting)
  useEffect(() => {
    if (!didMountSortingRef.current) {
      didMountSortingRef.current = true;
      return;
    }

    // Build order_by from sorting
    let orderBy = 'creation desc';
    if (Array.isArray(sorting) && sorting.length > 0) {
      const sortField = sorting[0].id;
      const sortOrder = sorting[0].desc ? 'desc' : 'asc';
      const fieldMap = {
        name: 'landlord_name',
        contact_number: 'contact_number',
        email: 'email_address',
      };
      const backendField = fieldMap[sortField] || sortField;
      orderBy = `${backendField} ${sortOrder}`;
    }

    // Use current filters from ref to avoid dependency issues
    const currentFiltersValue = filtersRef.current;
    const listFilters = landlordViewFiltersRef.current;

    dispatch(resetLandlordList());
    dispatch(
      getLandlordListThunk({
        keyword: currentFiltersValue.search || '',
        status: currentFiltersValue.status || 'all',
        page: 1,
        pageSize: 10,
        append: false,
        order_by: orderBy,
        group_by: groupByRef.current,
        group_order: groupOrderRef.current,
        landlordListFilters: listFilters,
        state: currentFiltersValue.state || '',
        // centers: centersQueryParam(selectedCentersRef.current),
        centers: null,
      }),
    );
  }, [sorting, dispatch]);

  const landlordListFilterContext = useMemo(() => ({ id: '', displayName: '' }), []);

  const filteredLandlords = useMemo(() => {
    return Array.isArray(landlords) ? landlords : [];
  }, [landlords]);

  // Determine context for empty states
  const hasActiveLandlordFilters = useMemo(() => {
    const f = landlordViewFilters;
    return (
      (Array.isArray(f.state) && f.state.length > 0) ||
      (Array.isArray(f.city) && f.city.length > 0) ||
      (Array.isArray(f.engagement_mode) && f.engagement_mode.length > 0) ||
      (Array.isArray(f.tags) && f.tags.length > 0) ||
      (Array.isArray(f.block_floor) && f.block_floor.length > 0) ||
      (Array.isArray(f.center) && f.center.length > 0)
    );
  }, [landlordViewFilters]);

  // const hasGlobalCenterFilter = useMemo(
  //   () => Array.isArray(centerAccess?.selectedCenters) && centerAccess.selectedCenters.length > 0,
  //   [centerAccess?.selectedCenters],
  // );

  const context = useMemo(() => {
    // Shared helper folds the "centerAccess loaded + zero selected" check into
    // a single predicate; any future tweaks to that contract land in one place.
    // if (isExplicitlyEmptyIntent(deriveGlobalCenterIntent(centerAccess))) {
    //   return 'no_centers';
    // }
    if (
      currentFilters.search ||
      (currentFilters.status && currentFilters.status !== 'all') ||
      hasActiveLandlordFilters
      // hasGlobalCenterFilter
    ) {
      return 'search';
    }
    return 'default';
  }, [currentFilters, hasActiveLandlordFilters, centerAccess]);

  const handleSearchChange = useCallback((value) => {
    setFilters((previous) => ({ ...previous, search: value }));
  }, []);

  const handleStatusChange = useCallback((value) => {
    setFilters((previous) => ({ ...previous, status: value || 'all' }));
  }, []);

  const handleCreateLandlordDrawerChange = useCallback(
    (open) => {
      dispatch(setCreateLandlordDrawer(open));
    },
    [dispatch],
  );

  const handleCreateLandlordSuccess = useCallback(async () => {
    const currentSorting = sortingRef.current || [];
    let orderBy = 'creation desc';
    if (Array.isArray(currentSorting) && currentSorting.length > 0) {
      const sortField = currentSorting[0].id;
      const sortOrder = currentSorting[0].desc ? 'desc' : 'asc';
      const fieldMap = {
        name: 'landlord_name',
        contact_number: 'contact_number',
        email: 'email_address',
      };
      const backendField = fieldMap[sortField] || sortField;
      orderBy = `${backendField} ${sortOrder}`;
    }
    await dispatch(
      getLandlordListThunk({
        keyword: currentFilters.search || '',
        status: currentFilters.status || 'all',
        page: 1,
        pageSize: 10,
        append: false,
        order_by: orderBy,
        group_by: groupBy,
        group_order: groupOrder,
        landlordListFilters: landlordViewFilters,
        state: currentFilters.state || '',
        // centers: centersQueryParam(selectedCentersRef.current),
        centers: null,
      }),
    );
  }, [
    dispatch,
    currentFilters.search,
    currentFilters.status,
    landlordViewFilters,
    groupBy,
    groupOrder,
    currentFilters.state,
  ]);

  const handleEditLandlordDrawerChange = useCallback(
    (open) => {
      dispatch(setEditLandlordDrawer(open));
    },
    [dispatch],
  );

  const handleEditLandlordSave = useCallback(async () => {
    const currentSorting = sortingRef.current || [];
    let orderBy = 'creation desc';
    if (Array.isArray(currentSorting) && currentSorting.length > 0) {
      const sortField = currentSorting[0].id;
      const sortOrder = currentSorting[0].desc ? 'desc' : 'asc';
      const fieldMap = {
        name: 'landlord_name',
        contact_number: 'contact_number',
        email: 'email_address',
      };
      const backendField = fieldMap[sortField] || sortField;
      orderBy = `${backendField} ${sortOrder}`;
    }
    await dispatch(
      getLandlordListThunk({
        keyword: currentFilters.search || '',
        status: currentFilters.status || 'all',
        page: 1,
        pageSize: 10,
        append: false,
        order_by: orderBy,
        group_by: groupBy,
        group_order: groupOrder,
        state: currentFilters.state || '',
        // centers: centersQueryParam(selectedCentersRef.current),
        centers: null,
        landlordListFilters: landlordViewFilters,
      }),
    );
    dispatch(setEditLandlordDrawer(false));
  }, [
    dispatch,
    currentFilters.search,
    currentFilters.status,
    landlordViewFilters,
    groupBy,
    groupOrder,
    currentFilters.state,
  ]);

  const handleRemoveLandlordDrawerChange = useCallback(
    (open) => {
      dispatch(setRemoveLandlordDrawer(open));
    },
    [dispatch],
  );

  const handleRemoveLandlord = useCallback(async () => {
    const currentSorting = sortingRef.current || [];
    let orderBy = 'creation desc';
    if (Array.isArray(currentSorting) && currentSorting.length > 0) {
      const sortField = currentSorting[0].id;
      const sortOrder = currentSorting[0].desc ? 'desc' : 'asc';
      const fieldMap = {
        name: 'landlord_name',
        contact_number: 'contact_number',
        email: 'email_address',
      };
      const backendField = fieldMap[sortField] || sortField;
      orderBy = `${backendField} ${sortOrder}`;
    }
    await dispatch(
      getLandlordListThunk({
        keyword: currentFilters.search || '',
        status: currentFilters.status || 'all',
        page: 1,
        pageSize: 10,
        append: false,
        order_by: orderBy,
        group_by: groupBy,
        group_order: groupOrder,
        landlordListFilters: landlordViewFilters,
        state: currentFilters.state || '',
        // centers: centersQueryParam(selectedCentersRef.current),
        centers: null,
      }),
    );
    dispatch(setRemoveLandlordDrawer(false));
  }, [
    dispatch,
    currentFilters.search,
    currentFilters.status,
    landlordViewFilters,
    groupBy,
    groupOrder,
    currentFilters.state,
  ]);

  const handleRefresh = useCallback(() => {
    const currentSorting = sortingRef.current || [];
    let orderBy = 'creation desc';
    if (Array.isArray(currentSorting) && currentSorting.length > 0) {
      const sortField = currentSorting[0].id;
      const sortOrder = currentSorting[0].desc ? 'desc' : 'asc';
      const fieldMap = {
        name: 'landlord_name',
        contact_number: 'contact_number',
        email: 'email_address',
      };
      const backendField = fieldMap[sortField] || sortField;
      orderBy = `${backendField} ${sortOrder}`;
    }
    dispatch(
      getLandlordListThunk({
        keyword: currentFilters.search || '',
        status: currentFilters.status || 'all',
        page: 1,
        pageSize: 10,
        append: false,
        order_by: orderBy,
        group_by: groupBy,
        group_order: groupOrder,
        landlordListFilters: landlordViewFilters,
        state: currentFilters.state || '',
        // centers: centersQueryParam(selectedCentersRef.current),
        centers: null,
      }),
    );
  }, [
    dispatch,
    currentFilters.search,
    currentFilters.status,
    landlordViewFilters,
    groupBy,
    groupOrder,
    currentFilters.state,
  ]);

  const handleRowSelect = useCallback(
    (row) => {
      const landlordId = row?.name || row?.id;
      if (landlordId) {
        navigate(`/landlords/${landlordId}`);
      }
    },
    [navigate],
  );

  const handleEdit = useCallback(
    (row) => {
      dispatch(setEditLandlordDrawer({ landlord: row }));
    },
    [dispatch],
  );

  const handleDelete = useCallback(
    (row) => {
      dispatch(setRemoveLandlordDrawer({ landlord: row }));
    },
    [dispatch],
  );

  // Handle load more for scroll pagination
  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) {
      return;
    }

    const currentSorting = sortingRef.current || [];
    let orderBy = 'creation desc';
    if (Array.isArray(currentSorting) && currentSorting.length > 0) {
      const sortField = currentSorting[0].id;
      const sortOrder = currentSorting[0].desc ? 'desc' : 'asc';
      const fieldMap = {
        name: 'landlord_name',
        contact_number: 'contact_number',
        email: 'email_address',
      };
      const backendField = fieldMap[sortField] || sortField;
      orderBy = `${backendField} ${sortOrder}`;
    }

    const nextPage = currentPage + 1;
    isScrollPaginationRef.current = true;

    dispatch(
      getLandlordListThunk({
        keyword: currentFilters.search || '',
        status: currentFilters.status || 'all',
        page: nextPage,
        pageSize: pageSize || 10,
        append: true,
        order_by: orderBy,
        group_by: groupBy,
        group_order: groupOrder,
        landlordListFilters: landlordViewFilters,
        state: currentFilters.state || '',
        // centers: centersQueryParam(selectedCentersRef.current),
        centers: null,
      }),
    );
  }, [
    dispatch,
    currentFilters.search,
    currentFilters.status,
    landlordViewFilters,
    groupBy,
    groupOrder,
    currentPage,
    pageSize,
    hasMore,
    isLoading,
    isLoadingMore,
    currentFilters.state,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      lastApiCallRef.current = '';
      isScrollPaginationRef.current = false;
      dispatch(resetLandlordList());
    };
  }, [dispatch]);

  const handleSortingChange = useCallback((newSorting) => {
    setSorting(newSorting);
  }, []);

  const handleCreateLandlord = useCallback(() => {
    dispatch(setCreateLandlordDrawer(true));
  }, [dispatch]);

  const handleCenterSelectionChange = useCallback(
    (selectedCenters) => {
      dispatch(setSelectedCenters(selectedCenters));
    },
    [dispatch],
  );

  const { userSideBarPerm } = useSelector((state) => state.auth);

  // Get permissions based on user role
  const permissions = useMemo(() => {
    const canWrite = hasModulePermission(userSideBarPerm, 'Landlord', 'write');
    return {
      canEdit: canWrite,
      canDelete: canWrite,
      canView: hasModulePermission(userSideBarPerm, 'Landlord', 'read'),
      canWrite,
    };
  }, [userSideBarPerm]);

  const centerOptions = useMemo(
    () =>
      (centerAccess.data || []).map((c) => ({
        value: c.name,
        label: c.center_name || c.name,
      })),
    [centerAccess.data],
  );

  const handleFieldUpdate = useCallback(
    async (landlordId, field, value, row) => {
      const isCenterField = ['center', 'block_floor', 'shop_number'].includes(field);
      try {
        await dispatch(
          updateLandlordFieldThunk(
            isCenterField
              ? {
                  landlordId,
                  fieldname: 'center_details',
                  value: buildLandlordCenterDetailsPayload(row, field, value, centerOptions),
                }
              : { landlordId, fieldname: field, value },
          ),
        ).unwrap();
        showSuccessToast('Saved');
      } catch (error) {
        showErrorToast(error || 'Failed to update landlord');
      }
    },
    [dispatch, centerOptions],
  );

  return (
    <PageLayout
      contentAreaClassName='overflow-hidden'
      pageTitle='Landlords'
      pageIcon={<RiUserLine size={24} />}
      pageDescription='Manage all your landlords.'
      headerActions={
        <CenterAccessDropdown
          centers={centerAccess.data}
          selectedCenters={centerAccess.selectedCenters}
          onChange={handleCenterSelectionChange}
          isLoading={centerAccess.status === 'loading'}
        />
      }
    >
      <div className='flex flex-col gap-6 px-8 pb-6 flex-1 min-h-0 mt-5'>
        <LandlordsStatusTabs
          value={currentFilters.status}
          totalCount={totalCount ?? 0}
          counts={statusCounts ?? {}}
          onValueChange={handleStatusChange}
        />

        <LandlordsToolbar
          filters={currentFilters}
          onSearchChange={handleSearchChange}
          onCreateLandlord={handleCreateLandlord}
          tableRef={landlordsTableRef}
          canWrite={permissions.canWrite}
          pageLandlords={landlords}
          appliedLandlordFilters={landlordViewFilters}
          onLandlordFiltersChange={setLandlordViewFilters}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          groupOrder={groupOrder}
          onGroupOrderChange={setGroupOrder}
        />

        <div className='flex-1 min-h-0 flex flex-col w-full'>
          <LandlordsTable
            ref={landlordsTableRef}
            rows={filteredLandlords}
            isLoading={isLoading && filteredLandlords.length === 0}
            error={error}
            context={context}
            onRetry={handleRefresh}
            onRowSelect={handleRowSelect}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSortingChange={handleSortingChange}
            sorting={sorting}
            permissions={permissions}
            tableId='landlords-management-table'
            variant={tableVariant}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            enableScrollPagination={true}
            groupBy={groupBy}
            groupOrder={groupOrder}
            onFieldUpdate={permissions.canWrite ? handleFieldUpdate : undefined}
            centerOptions={centerOptions}
          />
        </div>

        <CreateLandlordModal
          isOpen={isCreateLandlordDrawerOpen}
          handleOpenChange={handleCreateLandlordDrawerChange}
          onSuccess={handleCreateLandlordSuccess}
        />

        {/* <EditLandlordModal
          handleOpenChange={handleEditLandlordDrawerChange}
          handleSave={handleEditLandlordSave}
        /> */}

        <RemoveLandlordModal
          handleOpenChange={handleRemoveLandlordDrawerChange}
          handleRemove={handleRemoveLandlord}
          removalType='delete'
        />
      </div>
    </PageLayout>
  );
};

export default Landlords;
