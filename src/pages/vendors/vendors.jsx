import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GrGroup } from 'react-icons/gr';
import { useDispatch, useSelector } from 'react-redux';
import { hasModulePermission } from '@/utils/user-role-utils';
import { useTableVariant } from '@/hooks/use-table-variant';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';

import PageLayout from '@/components/page-layout';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import VendorTypeTab from '@/components/vendors-management/vendor-type-tab';
import VendorToolbar from '@/components/vendors-management/vendor-toolbar';
import VendorTable from '@/components/vendors-management/vendor-table';
import VendorGroupedView from '@/components/vendors-management/vendor-grouped-view';
import CreateVendorModal from '@/components/vendors-management/create-vendor-modal';
import EditVendorModal from '@/components/vendors-management/edit-vendor-modal';
import RemoveVendorModal from '@/components/vendors-management/remove-vendor-modal';
import {
  getVendorListThunk,
  resetVendorList,
  setCreateVendorDrawer,
  setEditVendorDrawer,
  setRemoveVendorDrawer,
} from '@/redux/vendorSlice';
import { DEFAULT_GROUP_BY_OPTIONS } from '@/components/vendors-management/constants';
import { fetchClientOpexCategoryFilters } from '@/redux/opexSlice';
import {
  fetchCenterAccess,
  getCenterListThunk,
  selectCenterAccess,
  setSelectedCenters,
} from '@/redux/centerSlice';

const resolveNavbarCenterFilter = (centerAccess) => {
  const totalCenters = centerAccess?.data?.length || 0;
  const selected = centerAccess?.selectedCenters;
  const isAllSelected =
    totalCenters > 0 && Array.isArray(selected) && selected.length === totalCenters;
  return isAllSelected ? null : selected || null;
};

const VENDORS_FILTER_SESSION_KEY = 'vendors-management-view-filter-dropdown';

const DEFAULT_VENDOR_LIST_DROPDOWN_FILTERS = {
  category: [],
  subCategory: [],
  center: [],
};

const VENDOR_TYPE_TAB_KEYS = ['Recurring', 'Maintenance', 'AMC'];

function getDisplayedVendorRows(vendors, isGrouped, groupedData) {
  if (isGrouped && groupedData && typeof groupedData === 'object') {
    return Object.values(groupedData).flatMap((rows) => (Array.isArray(rows) ? rows : []));
  }
  return Array.isArray(vendors) ? vendors : [];
}

function countVendorTabCountsFromRows(rows) {
  const typeVendorIds = Object.fromEntries(VENDOR_TYPE_TAB_KEYS.map((k) => [k, new Set()]));
  rows.forEach((row) => {
    const id = row?.id;
    if (!id) return;
    const types = String(row?.categoryType ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t && t !== '--');
    types.forEach((t) => {
      if (typeVendorIds[t]) typeVendorIds[t].add(id);
    });
  });
  return {
    all: rows.length,
    Recurring: typeVendorIds.Recurring.size,
    Maintenance: typeVendorIds.Maintenance.size,
    AMC: typeVendorIds.AMC.size,
  };
}

function countVendorStatusCountsFromRows(rows) {
  let active = 0;
  let inactive = 0;
  rows.forEach((row) => {
    const status = String(row?.status ?? '')
      .trim()
      .toLowerCase();
    if (status === 'active') active += 1;
    else if (status === 'inactive') inactive += 1;
  });
  return { active, inactive };
}

const Vendors = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const tableRef = useRef(null);
  const [statusTab, setStatusTab] = useState('active');
  const [vendorTypeTab, setVendorTypeTab] = useState('all');
  const [search, setSearch] = useState('');

  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [appliedFilters, setAppliedFilters] = usePersistedFilters({
    storageKey: VENDORS_FILTER_SESSION_KEY,
    defaultFilters: DEFAULT_VENDOR_LIST_DROPDOWN_FILTERS,
  });

  // 1. Initialize from persistence
  useEffect(() => {
    if (filtersInitialized) return;
    setFiltersInitialized(true);
  }, [appliedFilters, filtersInitialized]);

  // 2. Deep-equality sync
  const handleFiltersChange = useCallback(
    (newFilters) => {
      const merged = { ...appliedFilters, ...newFilters };
      if (JSON.stringify(merged) !== JSON.stringify(appliedFilters)) {
        setAppliedFilters(merged);
      }
    },
    [appliedFilters, setAppliedFilters],
  );
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [columnManagerApi, setColumnManagerApi] = useState(null);

  // Add these selectors at the top of the Vendors component
  const { filterOptions: categoryFilterOptions } = useSelector(
    (state) => state.opex.clientCategories,
  );
  const { data: centerListData, isLoading: centerListLoading } = useSelector(
    (state) => state.center.centerListData,
  );
  const centerAccess = useSelector(selectCenterAccess);

  // Fetch on mount
  useEffect(() => {
    dispatch(fetchClientOpexCategoryFilters());
    dispatch(getCenterListThunk({ keyword: '', filters: [], pageSize: 999 }));
  }, [dispatch]);

  useEffect(() => {
    if (centerAccess.status === 'idle') {
      dispatch(fetchCenterAccess());
    }
  }, [dispatch, centerAccess.status]);

  // Memoize the shaped options
  const categoryOptions = useMemo(
    () => (categoryFilterOptions || []).map((item) => ({ value: item.name, label: item.category })),
    [categoryFilterOptions],
  );

  const centerOptions = useMemo(
    () => (centerListData || []).map((c) => ({ value: c.name, label: c.center_name ?? c.name })),
    [centerListData],
  );

  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'vendors-management-table',
    'compact',
  );

  const {
    data: vendors = [],
    isLoading,
    isLoadingMore,
    error,
    currentPage,
    pageSize,
    hasMore,
    isGrouped,
    groupedData,
    vendorTypeCounts,
    statusCounts,
  } = useSelector((state) => state.vendor.vendorListData);

  const displayedVendorRows = useMemo(
    () => getDisplayedVendorRows(vendors, isGrouped, groupedData),
    [vendors, isGrouped, groupedData],
  );

  const vendorTabCounts = useMemo(() => {
    if (vendorTypeCounts && Object.keys(vendorTypeCounts).length > 0) {
      const recurring = vendorTypeCounts.Recurring ?? 0;
      const maintenance = vendorTypeCounts.Maintenance ?? 0;
      const amc = vendorTypeCounts.AMC ?? 0;
      return {
        all: recurring + maintenance + amc,
        Recurring: recurring,
        Maintenance: maintenance,
        AMC: amc,
      };
    }
    return countVendorTabCountsFromRows(displayedVendorRows);
  }, [displayedVendorRows, vendorTypeCounts]);

  const vendorStatusCounts = useMemo(() => {
    if (statusCounts && Object.keys(statusCounts).length > 0) {
      return statusCounts;
    }
    return countVendorStatusCountsFromRows(displayedVendorRows);
  }, [displayedVendorRows, statusCounts]);

  const buildFilters = () => {
    const f = [];
    if (statusTab === 'active') f.push(['disabled', '=', 0]);
    if (statusTab === 'inactive') f.push(['disabled', '=', 1]);
    if (vendorTypeTab !== 'all') f.push(['type', '=', vendorTypeTab]);

    if (appliedFilters.category?.length > 0) {
      f.push(['category', 'in', appliedFilters.category]);
    }
    if (appliedFilters.subCategory?.length > 0) {
      f.push(['sub_category', 'in', appliedFilters.subCategory]);
    }
    if (appliedFilters.center?.length > 0) {
      f.push(['center', 'in', appliedFilters.center]);
    }

    return f;
  };

  useEffect(() => {
    dispatch(resetVendorList());
    dispatch(
      getVendorListThunk({
        keyword: search,
        filters: buildFilters(),
        page: 1,
        pageSize: 20,
        navbarFilter: resolveNavbarCenterFilter(centerAccess),
        group_by: groupBy,
        group_order: groupOrder,
      }),
    );
  }, [
    dispatch,
    statusTab,
    vendorTypeTab,
    search,
    appliedFilters,
    centerAccess.selectedCenters,
    centerAccess.data?.length,
    groupBy,
    groupOrder,
  ]);

  const { isOpen: isCreateModalOpen } = useSelector((state) => state.vendor.createVendorDrawer);
  const { isOpen: isRemoveModalOpen, selectedVendor: selectedRemoveVendor } = useSelector(
    (state) => state.vendor.removeVendorDrawer,
  );

  const { userSideBarPerm } = useSelector((state) => state.auth);
  const permissions = useMemo(() => {
    // Fallback to true for Super Admin since Supplier DocType
    // permissions aren't returned by the API yet
    const roleName = Object.keys(userSideBarPerm?.role || {})[0];
    const isSuperAdmin = roleName === 'Super Admin';

    const canWrite = isSuperAdmin || hasModulePermission(userSideBarPerm, 'Supplier', 'write');
    const canRead = isSuperAdmin || hasModulePermission(userSideBarPerm, 'Supplier', 'read');

    const canCreate = isSuperAdmin || hasModulePermission(userSideBarPerm, 'Supplier', 'create');

    return {
      canEdit: canWrite,
      canDelete: canWrite,
      canView: canRead,
      canWrite,
      canCreate,
    };
  }, [userSideBarPerm]);

  useEffect(() => {
    return () => {
      dispatch(resetVendorList());
    };
  }, [dispatch]);

  const handleSearchChange = useCallback((value) => {
    setSearch(value);
  }, []);

  // const handleFiltersChange = useCallback((newFilters) => {
  //   setAppliedFilters(newFilters);
  // }, []);

  const handleGroupByChange = useCallback((value) => {
    setGroupBy(value || '');
    if (!value) setGroupOrder('asc');
  }, []);

  const handleGroupOrderChange = useCallback((value) => {
    setGroupOrder(value);
  }, []);

  const handleCenterSelectionChange = useCallback(
    (selectedCenters) => {
      dispatch(setSelectedCenters(selectedCenters));
    },
    [dispatch],
  );

  const handleRefresh = useCallback(() => {
    dispatch(resetVendorList());
    dispatch(
      getVendorListThunk({
        keyword: search,
        filters: buildFilters(),
        page: 1,
        pageSize: 20,
        navbarFilter: resolveNavbarCenterFilter(centerAccess),
        group_by: groupBy,
        group_order: groupOrder,
      }),
    );
  }, [
    dispatch,
    search,
    statusTab,
    vendorTypeTab,
    appliedFilters,
    centerAccess.selectedCenters,
    centerAccess.data?.length,
    groupBy,
    groupOrder,
  ]);

  const handleRowSelect = useCallback(
    (row) => {
      const vendorId = row?.id;
      if (vendorId) {
        navigate(`/vendors/${vendorId}`);
      }
    },
    [navigate],
  );

  const handleEdit = useCallback(
    (row) => {
      dispatch(setEditVendorDrawer({ vendor: row }));
    },
    [dispatch],
  );

  const handleDelete = useCallback(
    (row) => {
      dispatch(setRemoveVendorDrawer({ vendor: row }));
    },
    [dispatch],
  );

  const handleLoadMore = useCallback(() => {
    if (isGrouped || isLoading || isLoadingMore || !hasMore) return;
    dispatch(
      getVendorListThunk({
        keyword: search,
        filters: buildFilters(),
        page: currentPage + 1,
        pageSize,
        append: true,
        navbarFilter: resolveNavbarCenterFilter(centerAccess),
        group_by: groupBy,
        group_order: groupOrder,
      }),
    );
  }, [
    dispatch,
    search,
    statusTab,
    vendorTypeTab,
    appliedFilters,
    currentPage,
    pageSize,
    hasMore,
    isLoading,
    isLoadingMore,
    isGrouped,
    centerAccess.selectedCenters,
    centerAccess.data?.length,
    groupBy,
    groupOrder,
  ]);

  const handleEditSave = useCallback(async () => {
    await dispatch(
      getVendorListThunk({
        keyword: search,
        filters: buildFilters(),
        page: 1,
        pageSize: 20,
        navbarFilter: resolveNavbarCenterFilter(centerAccess),
        group_by: groupBy,
        group_order: groupOrder,
      }),
    );
    dispatch(setEditVendorDrawer(false));
  }, [
    dispatch,
    search,
    statusTab,
    vendorTypeTab,
    appliedFilters,
    centerAccess.selectedCenters,
    centerAccess.data?.length,
    groupBy,
    groupOrder,
  ]);

  const handleRemove = useCallback(async () => {
    await dispatch(
      getVendorListThunk({
        keyword: search,
        filters: buildFilters(),
        page: 1,
        pageSize: 20,
        navbarFilter: resolveNavbarCenterFilter(centerAccess),
        group_by: groupBy,
        group_order: groupOrder,
      }),
    );
    dispatch(setRemoveVendorDrawer(false));
  }, [
    dispatch,
    search,
    statusTab,
    vendorTypeTab,
    appliedFilters,
    centerAccess.selectedCenters,
    centerAccess.data?.length,
    groupBy,
    groupOrder,
  ]);

  return (
    <PageLayout
      contentAreaClassName='overflow-hidden'
      pageTitle='Vendors'
      pageIcon={<GrGroup size={24} />}
      pageDescription='Manage all your Vendors.'
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
        <VendorTypeTab
          value={vendorTypeTab}
          counts={vendorTabCounts}
          onValueChange={setVendorTypeTab}
        />
        <VendorToolbar
          filters={{ search }}
          onSearchChange={handleSearchChange}
          onAddVendor={() => dispatch(setCreateVendorDrawer(true))}
          onFiltersChange={handleFiltersChange}
          appliedFilters={appliedFilters}
          tableVariant={tableVariant}
          onTableVariantToggle={toggleTableVariant}
          onExport={() => {}}
          canCreate={permissions.canCreate}
          tableRef={tableRef}
          statusTab={statusTab}
          setStatusTab={setStatusTab}
          statusCounts={vendorStatusCounts}
          categoryOptions={categoryOptions}
          centerOptions={centerOptions}
          isLoadingOptions={centerListLoading}
          groupBy={groupBy}
          groupOrder={groupOrder}
          onGroupByChange={handleGroupByChange}
          onGroupOrderChange={handleGroupOrderChange}
          groupByOptions={DEFAULT_GROUP_BY_OPTIONS}
        />

        <div
          className={isGrouped ? 'hidden' : 'flex-1 min-h-0 flex flex-col w-full'}
          aria-hidden={isGrouped}
        >
          <VendorTable
            ref={tableRef}
            rows={vendors}
            isLoading={isLoading && vendors.length === 0}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            error={error}
            onRetry={handleRefresh}
            onRowSelect={handleRowSelect}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onLoadMore={handleLoadMore}
            permissions={permissions}
            tableVariant={tableVariant}
            enableScrollPagination={!isGrouped}
            onColumnManagerApiChange={setColumnManagerApi}
          />
        </div>

        {isGrouped &&
          (columnManagerApi ? (
            <VendorGroupedView
              columnManagerApi={columnManagerApi}
              groupedData={groupedData}
              isLoading={isLoading && Object.keys(groupedData || {}).length === 0}
              tableVariant={tableVariant}
              onRowSelect={handleRowSelect}
              onEdit={handleEdit}
              onDelete={handleDelete}
              permissions={permissions}
            />
          ) : (
            <div className='flex items-center justify-center py-16 text-text-soft-400'>
              Loading table preferences…
            </div>
          ))}

        <CreateVendorModal
          isOpen={isCreateModalOpen}
          forceMount
          handleOpenChange={(open) => dispatch(setCreateVendorDrawer(open))}
          onSuccess={() => {
            dispatch(setCreateVendorDrawer(false));
            handleRefresh();
          }}
        />

        <EditVendorModal
          handleOpenChange={(open) => dispatch(setEditVendorDrawer(open))}
          handleSave={handleEditSave}
        />

        <RemoveVendorModal
          handleOpenChange={(open) => dispatch(setRemoveVendorDrawer(open))}
          handleRemove={handleRemove}
          selectedVendor={selectedRemoveVendor}
          removalType='delete'
        />
      </div>
    </PageLayout>
  );
};

export default Vendors;
