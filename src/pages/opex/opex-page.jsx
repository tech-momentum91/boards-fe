import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiUserLine, RiArrowUpSLine, RiArrowDownSLine } from 'react-icons/ri';

import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import PageLayout from '@/components/page-layout';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import WithModulePermission from '@/route-protection/with-module-permission';
import { useTableVariant } from '@/hooks/use-table-variant';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { OpexStats, OpexToolbar, OpexTable, OpexViewDrawer } from '@/components/opex';
import {
  OPEX_DOCTYPE,
  ROLE_COLUMN_CONFIGS,
  getOpexTabOptionsForRoleType,
  OPEX_MODULE_VIEW_FILTER_DEFAULTS,
  compactOpexModuleViewFiltersForStorage,
  mergeStoredOpexModuleViewFilters,
} from '@/components/opex/constants';
import { formatMonthYear } from '@/utils/date-utils';
import { withPrefix } from '@/lib/utils';
import { CURRENCY } from '@/constants/constants';
import {
  fetchOpexList,
  fetchOpexStats,
  fetchOpexFilterOptions,
  fetchOpexComments,
  addOpexComment,
  updateOpexField,
  selectOpexList,
  selectOpexStats,
  selectOpexFilterOptions,
  setOpexFilters,
  resetOpexFilters,
  replaceOpexFilters,
  setOpexSorting,
  setOpexGroupBy,
  setOpexGroupOrder,
  DEFAULT_OPEX_FILTERS,
} from '@/redux/opexSlice';
import { normalizeOpexVendorRows } from '@/utils/opex-vendor-utils';
import {
  buildOpexExportFilename,
  exportOpexRowsToExcel,
  fetchAllOpexRowsForExport,
  flattenGroupedOpexRows,
} from '@/utils/opex-export';
import { selectCenterAccess, setSelectedCenters } from '@/redux/centerSlice';
import { getModulePermissions } from '@/utils/user-role-utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const OPEX_MODULE_VIEW_FILTERS_KEY = 'opex-module-filter-dropdown';

const GroupedOpexView = ({ groupedData = {}, isLoading, onRowSelect }) => {
  const [expandedKeys, setExpandedKeys] = useState({});

  useEffect(() => {
    const initial = {};
    Object.keys(groupedData).forEach((k) => {
      initial[k] = true;
    });
    setExpandedKeys(initial);
  }, []);

  const toggle = (key) => setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));

  if (isLoading && Object.keys(groupedData).length === 0) {
    return (
      <div className='flex items-center justify-center py-16 text-text-soft-400'>Loading...</div>
    );
  }

  const entries = Object.entries(groupedData || {});

  if (entries.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
        <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>No OPEX records found</h3>
        <p className='max-w-md text-sm text-text-sub-600'>Adjust your filters to see results.</p>
      </div>
    );
  }

  return (
    <div className='flex w-full flex-col gap-8'>
      {entries.map(([key, items]) => {
        const isExpanded = expandedKeys[key] !== false;
        return (
          <div key={key} className='flex w-full flex-col items-start gap-3'>
            <button
              type='button'
              onClick={() => toggle(key)}
              className='label-small flex items-center gap-1 font-medium text-text-sub-500 cursor-pointer hover:opacity-80 transition-opacity w-full text-left'
            >
              <span className='paragraph-small font-semibold text-text-soft-400 uppercase tracking-wider'>
                {key} ({items.length})
              </span>
              {isExpanded ? (
                <RiArrowUpSLine size={16} className='shrink-0' />
              ) : (
                <RiArrowDownSLine size={16} className='shrink-0' />
              )}
            </button>

            {isExpanded && (
              <div className='w-full overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-sm'>
                <Table.Root variant='compact' className='w-full'>
                  <Table.Header className='bg-bg-weak-50'>
                    <Table.Row>
                      <Table.Head className='w-[200px]'>Subcategory</Table.Head>
                      <Table.Head>Center</Table.Head>
                      <Table.Head>Month</Table.Head>
                      <Table.Head>Total Amount</Table.Head>
                      <Table.Head>Vendor</Table.Head>
                      <Table.Head>Status</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {items.map((item, idx) => (
                      <React.Fragment key={item.name || idx}>
                        <Table.Row
                          className='cursor-pointer hover:bg-bg-weak-50/50'
                          onClick={() => onRowSelect?.(item)}
                        >
                          <Table.Cell>
                            <span className='paragraph-small font-medium text-text-main-900'>
                              {item.subcategory || '--'}
                            </span>
                          </Table.Cell>
                          <Table.Cell className='paragraph-small text-text-sub-500'>
                            {item.center_name || '--'}
                          </Table.Cell>
                          <Table.Cell className='paragraph-small text-text-sub-500'>
                            {formatMonthYear(item.period, '--')}
                          </Table.Cell>
                          <Table.Cell className='paragraph-small text-text-sub-500'>
                            {withPrefix(CURRENCY, item.total_amount || '0')}
                          </Table.Cell>
                          <Table.Cell className='paragraph-small text-text-sub-500'>
                            {item.vendor || '--'}
                          </Table.Cell>
                          <Table.Cell>
                            <Badge.Root
                              variant='light'
                              color={item.bill_uploaded === 'Uploaded' ? 'green' : 'gray'}
                            >
                              {item.bill_uploaded || 'Pending'}
                            </Badge.Root>
                          </Table.Cell>
                        </Table.Row>
                        {idx < items.length - 1 && <Table.RowDivider />}
                      </React.Fragment>
                    ))}
                  </Table.Body>
                </Table.Root>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const OpexPage = () => {
  const dispatch = useDispatch();
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const userRoleType = useSelector((state) => state.profile.profileData?.role_type);

  const list = useSelector(selectOpexList);
  const stats = useSelector(selectOpexStats);
  const filterOptions = useSelector(selectOpexFilterOptions);
  const centerAccess = useSelector(selectCenterAccess);
  const opexPermissions = useMemo(
    () => getModulePermissions(userSideBarPerm, OPEX_DOCTYPE),
    [userSideBarPerm],
  );
  const canEdit = opexPermissions?.write === true;

  const tableRef = useRef(null);
  const lastApiCallRef = useRef('');
  const isScrollPaginationRef = useRef(false);
  const skipFilterPersistRef = useRef(false);
  const moduleFiltersHydratedRef = useRef(false);
  const [selectedOpexId, setSelectedOpexId] = useState(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: OPEX_MODULE_VIEW_FILTERS_KEY,
    defaultFilters: OPEX_MODULE_VIEW_FILTER_DEFAULTS,
    compactFilters: compactOpexModuleViewFiltersForStorage,
  });

  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'opex-table',
    'compact',
  );

  const currentFilters = list.filters || {};
  const filtersString = useMemo(() => JSON.stringify(currentFilters || {}), [currentFilters]);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  const activeTab = currentFilters.tab || 'all';

  const opexTabOptions = useMemo(() => getOpexTabOptionsForRoleType(userRoleType), [userRoleType]);

  useEffect(() => {
    if (opexTabOptions.some((t) => t.value === activeTab)) return;
    dispatch(setOpexFilters({ tab: 'all' }));
  }, [userRoleType, activeTab, opexTabOptions, dispatch]);

  // 1. Hydrate toolbar + filter-dropdown from session on load.
  useEffect(() => {
    const isRehydrate = moduleFiltersHydratedRef.current;
    const viewFilters = mergeStoredOpexModuleViewFilters(persistedFilters);

    skipFilterPersistRef.current = true;
    dispatch(
      replaceOpexFilters({
        ...DEFAULT_OPEX_FILTERS,
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

    const compact = compactOpexModuleViewFiltersForStorage(currentFilters);
    const persistedCompact = compactOpexModuleViewFiltersForStorage(
      mergeStoredOpexModuleViewFilters(persistedFilters),
    );
    if (JSON.stringify(compact) !== JSON.stringify(persistedCompact)) {
      setPersistedFilters(compact);
    }
  }, [currentFilters, persistedFilters, filtersInitialized, setPersistedFilters]);

  useEffect(() => {
    if (debouncedSearch !== (currentFilters.search || '')) {
      dispatch(setOpexFilters({ search: debouncedSearch }));
    }
  }, [debouncedSearch, currentFilters.search, dispatch]);

  // Fetch first page + stats on mount and when filters/sort change.
  useEffect(() => {
    if (!filtersInitialized) {
      return;
    }

    let orderBy = 'creation desc';
    if (list.sorting && list.sorting.length > 0) {
      const { id, desc } = list.sorting[0];
      orderBy = `${id} ${desc ? 'desc' : 'asc'}`;
    }

    const filters = list.filters || DEFAULT_OPEX_FILTERS;

    dispatch(
      fetchOpexList({
        filters,
        page: 1,
        pageSize: list.pageSize,
        orderBy,
        append: false,
        groupBy: list.groupBy,
        groupOrder: list.groupOrder,
      }),
    );
    dispatch(fetchOpexStats({ filters }));
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
      fetchOpexList({
        filters: currentFilters,
        page: 1,
        pageSize: list.pageSize,
        orderBy,
        append: false,
        groupBy: list.groupBy,
        groupOrder: list.groupOrder,
      }),
    );
    dispatch(fetchOpexStats({ filters: currentFilters }));
  }, [dispatch, currentFilters, list.pageSize, list.sorting, list.groupBy, list.groupOrder]);

  const handleLoadMore = useCallback(() => {
    if (list.status === 'loading' || !list.hasMore) return;

    let orderBy = 'creation desc';
    if (list.sorting && list.sorting.length > 0) {
      const { id, desc } = list.sorting[0];
      orderBy = `${id} ${desc ? 'desc' : 'asc'}`;
    }

    dispatch(
      fetchOpexList({
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
    list.hasMore,
    list.groupBy,
    list.groupOrder,
  ]);

  // Create a flattened array of rows for checks that require an array (e.g. navigation, drawer sync)
  const allRows = useMemo(() => {
    if (!list.rows) return [];
    if (Array.isArray(list.rows)) return list.rows;
    if (typeof list.rows === 'object') {
      return Object.values(list.rows).flat();
    }
    return [];
  }, [list.rows]);

  const drawerVendorRows = useMemo(() => {
    if (!selectedOpexId) return [];
    const row = allRows.find((r) => String(r.name ?? r.id) === String(selectedOpexId));
    return normalizeOpexVendorRows(row?.vendor_list);
  }, [allRows, selectedOpexId]);

  // Close view drawer if the selected record no longer appears in the list (e.g. moved to another tab after status update)
  useEffect(() => {
    if (!selectedOpexId || !isViewDrawerOpen) return;
    const stillInList = allRows.some(
      (row) => String(row.name ?? row.id) === String(selectedOpexId),
    );
    if (!stillInList) {
      setIsViewDrawerOpen(false);
      setSelectedOpexId(null);
    }
  }, [allRows, selectedOpexId, isViewDrawerOpen]);

  useEffect(() => {
    dispatch(fetchOpexFilterOptions());
  }, [dispatch]);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  const handleTabChange = useCallback(
    (nextTab = 'all') => {
      if (nextTab === activeTab) return;
      dispatch(setOpexFilters({ tab: nextTab }));
    },
    [dispatch, activeTab],
  );

  const handleSortingChange = useCallback(
    (newSorting) => {
      dispatch(setOpexSorting(newSorting));
    },
    [dispatch],
  );

  const handleCenterSelectionChange = useCallback(
    (selectedCenters) => {
      dispatch(setSelectedCenters(selectedCenters));

      const normalized =
        Array.isArray(selectedCenters) && selectedCenters.length > 0 ? selectedCenters : [];

      dispatch(setOpexFilters({ center: normalized }));
    },
    [dispatch],
  );

  const handleGroupByChange = useCallback(
    (value) => {
      dispatch(setOpexGroupBy(value));
    },
    [dispatch],
  );

  const handleGroupOrderChange = useCallback(
    (value) => {
      dispatch(setOpexGroupOrder(value));
    },
    [dispatch],
  );
  const handleMonthChange = useCallback(
    (newMonth) => {
      dispatch(setOpexFilters({ month: newMonth }));
    },
    [dispatch],
  );

  const handleYearChange = useCallback(
    (newYear) => {
      dispatch(setOpexFilters({ year: newYear }));
    },
    [dispatch],
  );
  const isGroupedView = Boolean(list.groupBy);

  const groupedData = useMemo(() => {
    if (!isGroupedView || !list.rows) return {};

    let groups = {};
    const isObjectResponse = !Array.isArray(list.rows) && typeof list.rows === 'object';

    if (isObjectResponse) {
      groups = list.rows;
    } else if (Array.isArray(list.rows)) {
      // Fallback: Client-side grouping
      list.rows.forEach((row) => {
        let key = 'Other';
        if (list.groupBy === 'Center') {
          key = row.center_name || row.center || 'Other';
        } else if (list.groupBy === 'Month') {
          key = formatMonthYear(row.period, 'Other');
        } else if (list.groupBy === 'Vendor') {
          key = row.vendor || 'Other';
        }

        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      });
    } else {
      return {};
    }

    // Always sort keys based on groupOrder
    const order = list.groupOrder === 'desc' ? -1 : 1;
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      // For Month grouping, try to sort chronologically using the period of the first item in each group
      if (list.groupBy === 'Month') {
        const itemA = groups[a]?.[0];
        const itemB = groups[b]?.[0];
        if (itemA?.period && itemB?.period) {
          const dateA = new Date(itemA.period);
          const dateB = new Date(itemB.period);
          return (dateA - dateB) * order;
        }
      }
      // Default to alphabetical sort
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }) * order;
    });

    const result = {};
    sortedKeys.forEach((key) => {
      result[key] = groups[key];
    });

    return result;
  }, [list.rows, list.groupBy, list.groupOrder, isGroupedView]);

  const handleAddOpex = useCallback(() => {
    // Placeholder for future implementation
  }, []);

  const handleRowSelect = useCallback((row) => {
    setSelectedOpexId(row.name ?? row.id);
    setIsViewDrawerOpen(true);
  }, []);

  const handleViewDrawerClose = useCallback(() => {
    setIsViewDrawerOpen(false);
    setSelectedOpexId(null);
  }, []);

  const currentIndex = allRows.findIndex(
    (row) => String(row.name ?? row.id) === String(selectedOpexId),
  );
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allRows.length - 1;

  const handleNavigatePrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prev = allRows[currentIndex - 1];
      setSelectedOpexId(prev?.name ?? prev?.id);
    }
  }, [allRows, currentIndex]);

  const handleNavigateNext = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < allRows.length - 1) {
      const next = allRows[currentIndex + 1];
      setSelectedOpexId(next?.name ?? next?.id);
    }
  }, [allRows, currentIndex]);

  const handleFieldUpdate = useCallback(
    async (opexId, fieldname, value) => {
      try {
        await dispatch(updateOpexField({ name: opexId, fieldname, value })).unwrap();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update OPEX field. Please try again.' });
      }
    },
    [dispatch],
  );

  const handleRowChange = useCallback(
    async (updatedRow, rowIndex, fieldName) => {
      const opexId = updatedRow?.name ?? updatedRow?.id;
      if (!opexId || !fieldName) return;
      const value = updatedRow[fieldName];
      try {
        await dispatch(updateOpexField({ name: opexId, fieldname: fieldName, value })).unwrap();
        // Refetch the page where this record lived so it disappears if it no longer matches the tab
        const pageSize = list.pageSize || 20;
        const pageOfRecord = Math.floor(rowIndex / pageSize) + 1;

        let orderBy = 'creation desc';
        if (list.sorting && list.sorting.length > 0) {
          const { id, desc } = list.sorting[0];
          orderBy = `${id} ${desc ? 'desc' : 'asc'}`;
        }

        dispatch(
          fetchOpexList({
            filters: currentFilters,
            page: pageOfRecord,
            pageSize,
            orderBy,
            append: false,
            replacePage: pageOfRecord,
            groupBy: list.groupBy,
            groupOrder: list.groupOrder,
          }),
        );
        dispatch(fetchOpexStats({ filters: currentFilters }));
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update OPEX field. Please try again.' });
      }
    },
    [dispatch, currentFilters, list.pageSize, list.sorting, list.groupBy, list.groupOrder],
  );

  const handleAddComment = useCallback(
    async (opexId, content, attachments = [], _visibleToClient = false, parentCommentId = null) => {
      try {
        await dispatch(
          addOpexComment({
            opexId,
            content,
            attachments,
            parentCommentId,
          }),
        ).unwrap();
        await dispatch(fetchOpexComments(opexId));
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to add comment. Please try again.' });
      }
    },
    [dispatch],
  );

  const handleRefreshComments = useCallback(
    (opexId) => {
      if (opexId) dispatch(fetchOpexComments(opexId));
    },
    [dispatch],
  );

  const hasListData = allRows.length > 0;

  const handleExport = useCallback(async () => {
    if (isExporting || !hasListData) return;

    setIsExporting(true);
    try {
      let orderBy = 'creation desc';
      if (list.sorting && list.sorting.length > 0) {
        const { id, desc } = list.sorting[0];
        orderBy = `${id} ${desc ? 'desc' : 'asc'}`;
      }

      const fetchedRows = await fetchAllOpexRowsForExport({
        filters: currentFilters,
        orderBy,
      });

      if (fetchedRows.length === 0) {
        showErrorToast(null, { defaultMessage: 'No OPEX records available to export.' });
        return;
      }

      let exportRows = fetchedRows;
      if (isGroupedView && list.groupBy) {
        const groups = {};
        fetchedRows.forEach((row) => {
          let key = 'Other';
          if (list.groupBy === 'Center') {
            key = row.center_name || row.center || 'Other';
          } else if (list.groupBy === 'Month') {
            key = formatMonthYear(row.period, 'Other');
          } else if (list.groupBy === 'Vendor') {
            key = row.vendor || 'Other';
          }
          if (!groups[key]) groups[key] = [];
          groups[key].push(row);
        });
        exportRows = flattenGroupedOpexRows(groups);
      }

      const filename = buildOpexExportFilename(currentFilters);
      await exportOpexRowsToExcel({
        rows: exportRows,
        filename,
        groupBy: isGroupedView ? list.groupBy : '',
      });
      showSuccessToast('OPEX data exported successfully.');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to export OPEX data. Please try again.' });
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, hasListData, list.sorting, list.groupBy, isGroupedView, currentFilters]);

  return (
    <PageLayout
      pageTitle='OPEX'
      pageIcon={<RiUserLine size={24} />}
      pageDescription='View and manage all your operational expense.'
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
        <OpexStats stats={stats} />

        <OpexToolbar
          searchValue={searchTerm}
          onSearchChange={handleSearchChange}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          opexTabOptions={opexTabOptions}
          tableRef={tableRef}
          tableVariant={tableVariant}
          onTableVariantToggle={toggleTableVariant}
          onGroupByChange={handleGroupByChange}
          groupBy={list.groupBy}
          isGroupedView={isGroupedView}
          onGroupOrderChange={handleGroupOrderChange}
          groupOrder={list.groupOrder}
          onAddOpex={handleAddOpex}
          filters={currentFilters}
          onFilterChange={(newFilters) => dispatch(setOpexFilters(newFilters))}
          onClearFilters={() => dispatch(resetOpexFilters())}
          centerOptions={centerAccess.data.map((center) => ({
            value: center.name || center.center_name,
            label: center.center_name || center.name,
          }))}
          categoryOptions={filterOptions?.categories}
          subcategoryOptions={filterOptions?.subcategories}
          month={currentFilters.month || DEFAULT_OPEX_FILTERS.month}
          year={currentFilters.year || DEFAULT_OPEX_FILTERS.year}
          onMonthChange={handleMonthChange}
          onYearChange={handleYearChange}
          onExport={handleExport}
          isExporting={isExporting}
          hasListData={hasListData}
        />

        {isGroupedView ? (
          <GroupedOpexView
            groupedData={groupedData}
            isLoading={list.status === 'loading'}
            onRowSelect={handleRowSelect}
          />
        ) : (
          <div className='flex min-h-0 min-w-0 flex-1 flex-col'>
            <OpexTable
              key={activeTab}
              ref={tableRef}
              rows={list.rows}
              apiColumns={list.columns}
              isLoading={list.status === 'loading'}
              error={list.error}
              onRetry={handleRetryList}
              variant={tableVariant}
              onSortingChange={handleSortingChange}
              sorting={list.sorting}
              tableId={`opex-table-${activeTab}`}
              defaultVisibleColumns={ROLE_COLUMN_CONFIGS[activeTab] || ROLE_COLUMN_CONFIGS.all}
              onRowSelect={handleRowSelect}
              onRowChange={canEdit ? handleRowChange : undefined}
              permissions={{ canEdit, roleType: userRoleType }}
              enableScrollPagination
              onLoadMore={handleLoadMore}
              hasMore={list.hasMore}
              isLoadingMore={list.isLoadingMore}
            />
          </div>
        )}

        {isViewDrawerOpen && (
          <OpexViewDrawer
            isOpen={isViewDrawerOpen}
            onClose={handleViewDrawerClose}
            opexId={selectedOpexId}
            onNavigatePrevious={handleNavigatePrevious}
            onNavigateNext={handleNavigateNext}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            onFieldUpdate={handleFieldUpdate}
            onAddComment={handleAddComment}
            onRefreshComments={handleRefreshComments}
            vendors={drawerVendorRows}
            permissions={{ canEdit, roleType: userRoleType }}
          />
        )}
      </div>
    </PageLayout>
  );
};

export default WithModulePermission(OpexPage, OPEX_DOCTYPE);
