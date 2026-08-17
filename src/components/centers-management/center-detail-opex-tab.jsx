import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useDebounce } from '@/hooks/use-debounce';
import { useTableVariant } from '@/hooks/use-table-variant';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import * as Popover from '@/components/ui/popover';
import * as Button from '@/components/ui/button';
import {
  OpexStats,
  OpexToolbar,
  OpexTable,
  OpexViewDrawer,
  OpexCategoryPanel,
} from '@/components/opex';
import {
  ROLE_COLUMN_CONFIGS,
  getOpexTabOptionsForRoleType,
  CENTER_DETAIL_OPEX_POPOVER_FILTER_DEFAULTS,
  CENTER_DETAIL_OPEX_POPOVER_FILTER_PERSIST_OPTS,
  compactCenterDetailOpexPopoverFiltersForStorage,
  mergeStoredCenterDetailOpexPopoverFilters,
} from '@/components/opex/constants';
import {
  fetchOpexList,
  fetchOpexStats,
  fetchOpexFilterOptions,
  fetchOpexCategoriesTree,
  setOpexCategoryForCenter,
  fetchOpexComments,
  addOpexComment,
  updateOpexField,
  selectOpexList,
  selectOpexStats,
  selectOpexFilterOptions,
  selectOpexCategoryTree,
  setOpexFilters,
  replaceOpexFilters,
  setOpexSorting,
  DEFAULT_OPEX_FILTERS,
} from '@/redux/opexSlice';
import { normalizeOpexVendorRows } from '@/utils/opex-vendor-utils';
import { showErrorToast } from '@/utils/error-utils';
import { RiSettings2Line } from 'react-icons/ri';

const CENTER_DETAIL_OPEX_VIEW_FILTERS_KEY = 'center-detail-opex-view-filter-dropdown';

const CenterDetailOpexTab = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const { data: centerDetails } = useSelector((state) => state.center.centerDetails);
  const centerId = centerDetails?.name || id;

  const list = useSelector(selectOpexList);
  const stats = useSelector(selectOpexStats);
  const filterOptions = useSelector(selectOpexFilterOptions);
  const categoryTree = useSelector(selectOpexCategoryTree);
  const userRoleType = useSelector((state) => state.profile.profileData?.role_type);
  const tableRef = useRef(null);
  const centerFilterInitializedRef = useRef(null);

  const [selectedOpexId, setSelectedOpexId] = useState(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);

  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'center-detail-opex-table',
    'compact',
  );

  const baseFilters = useMemo(
    () => ({
      search: '',
      center: centerId ? [centerId] : [],
      tab: 'all',
    }),
    [centerId],
  );

  const currentFilters = list.filters || baseFilters;
  const apiFilters = useMemo(
    () => ({
      ...currentFilters,
      center: centerId ? [centerId] : [],
    }),
    [currentFilters, centerId],
  );

  const [searchTerm, setSearchTerm] = useState(currentFilters.search || '');
  const debouncedSearch = useDebounce(searchTerm, 500);

  const activeTab = currentFilters.tab || 'all';

  const drawerVendorRows = useMemo(() => {
    if (!selectedOpexId) return [];
    const row = list.rows?.find((r) => String(r.name ?? r.id) === String(selectedOpexId));
    return normalizeOpexVendorRows(row?.vendor_list);
  }, [list.rows, selectedOpexId]);
  const opexTabOptions = useMemo(() => getOpexTabOptionsForRoleType(userRoleType), [userRoleType]);

  useEffect(() => {
    if (opexTabOptions.some((t) => t.value === activeTab)) return;
    dispatch(setOpexFilters({ tab: 'all' }));
  }, [userRoleType, activeTab, opexTabOptions, dispatch]);

  useEffect(() => {
    if (debouncedSearch !== (currentFilters.search || '')) {
      dispatch(setOpexFilters({ ...apiFilters, search: debouncedSearch }));
    }
  }, [debouncedSearch, currentFilters.search, dispatch, apiFilters]);

  useEffect(() => {
    centerFilterInitializedRef.current = null;
  }, [centerId]);

  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: centerId ? `${CENTER_DETAIL_OPEX_VIEW_FILTERS_KEY}-${centerId}` : null,
    defaultFilters: CENTER_DETAIL_OPEX_POPOVER_FILTER_DEFAULTS,
    persistIncludeKeys: CENTER_DETAIL_OPEX_POPOVER_FILTER_PERSIST_OPTS.includeKeys,
    persistTrimStringArrays: CENTER_DETAIL_OPEX_POPOVER_FILTER_PERSIST_OPTS.trimStringArrayElements,
  });

  // 1. Initialize from persistence (popover only; expense month/year use DEFAULT_OPEX_FILTERS).
  useEffect(() => {
    if (!centerId || filtersInitialized) return;

    const popoverFilters = mergeStoredCenterDetailOpexPopoverFilters(persistedFilters);
    dispatch(
      replaceOpexFilters({
        ...DEFAULT_OPEX_FILTERS,
        ...popoverFilters,
        center: [centerId],
        search: '',
      }),
    );
    setSearchTerm('');
    setFiltersInitialized(true);
  }, [centerId, persistedFilters, dispatch, filtersInitialized]);

  // 2. Persist to storage
  useEffect(() => {
    if (!centerId || !filtersInitialized) return;

    const currentCenterFilter = list.filters?.center;
    const centerFilterArray = Array.isArray(currentCenterFilter) ? currentCenterFilter : [];
    const hasCorrectCenterFilter =
      centerFilterArray.length === 1 && centerFilterArray[0] === centerId;
    if (!hasCorrectCenterFilter || !list.filters) return;

    const compact = compactCenterDetailOpexPopoverFiltersForStorage(list.filters);
    const persistedCompact = compactCenterDetailOpexPopoverFiltersForStorage(
      mergeStoredCenterDetailOpexPopoverFilters(persistedFilters),
    );
    if (JSON.stringify(compact) !== JSON.stringify(persistedCompact)) {
      setPersistedFilters(compact);
    }
  }, [centerId, list.filters, persistedFilters, filtersInitialized, setPersistedFilters]);

  useEffect(() => {
    dispatch(fetchOpexFilterOptions());
  }, [dispatch]);

  useEffect(() => {
    if (centerId) dispatch(fetchOpexCategoriesTree(centerId));
  }, [centerId, dispatch]);

  // Fetch list when filters (with center) are set
  useEffect(() => {
    if (!centerId || !filtersInitialized) return;

    const currentCenterFilter = list.filters?.center;
    const centerFilterArray = Array.isArray(currentCenterFilter) ? currentCenterFilter : [];
    const hasCorrectCenterFilter =
      centerFilterArray.length === 1 && centerFilterArray[0] === centerId;

    if (!hasCorrectCenterFilter) return;

    dispatch(
      fetchOpexList({
        filters: apiFilters,
        page: list.page,
        pageSize: list.pageSize,
        orderBy: 'creation desc',
        append: false,
      }),
    );
  }, [dispatch, centerId, apiFilters, list.page, list.pageSize, list.sorting, filtersInitialized]);

  useEffect(() => {
    if (!centerId || !filtersInitialized) return;
    const currentCenterFilter = list.filters?.center;
    const centerFilterArray = Array.isArray(currentCenterFilter) ? currentCenterFilter : [];
    const hasCorrectCenterFilter =
      centerFilterArray.length === 1 && centerFilterArray[0] === centerId;
    if (!hasCorrectCenterFilter) return;
    dispatch(fetchOpexStats({ filters: apiFilters }));
  }, [dispatch, centerId, apiFilters, list.filters?.center, filtersInitialized]);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  const handleTabChange = useCallback(
    (nextTab = 'all') => {
      if (nextTab === activeTab) return;
      dispatch(setOpexFilters({ ...apiFilters, tab: nextTab }));
    },
    [dispatch, apiFilters, activeTab],
  );

  const handleFilterChange = useCallback(
    (newFilters) => {
      dispatch(
        setOpexFilters({
          ...newFilters,
          center: centerId ? [centerId] : [],
        }),
      );
    },
    [dispatch, centerId],
  );

  const handleClearFilters = useCallback(() => {
    dispatch(
      replaceOpexFilters({
        ...DEFAULT_OPEX_FILTERS,
        month: currentFilters.month || DEFAULT_OPEX_FILTERS.month,
        year: currentFilters.year || DEFAULT_OPEX_FILTERS.year,
        center: centerId ? [centerId] : [],
        tab: 'all',
        search: '',
      }),
    );
    setSearchTerm('');
  }, [dispatch, centerId, currentFilters.month, currentFilters.year]);

  const handleMonthChange = useCallback(
    (newMonth) => {
      dispatch(setOpexFilters({ ...apiFilters, month: newMonth }));
    },
    [dispatch, apiFilters],
  );

  const handleYearChange = useCallback(
    (newYear) => {
      dispatch(setOpexFilters({ ...apiFilters, year: newYear }));
    },
    [dispatch, apiFilters],
  );

  const handleSortingChange = useCallback(
    (newSorting) => {
      dispatch(setOpexSorting(newSorting));
    },
    [dispatch],
  );

  const handleGroupByClick = useCallback(() => {}, []);
  const handleAddOpex = useCallback(() => {}, []);

  const handleCategoryToggle = useCallback(
    async (categoryName, center, enabled) => {
      try {
        await dispatch(
          setOpexCategoryForCenter({ categoryNames: [categoryName], center, enabled }),
        ).unwrap();
        dispatch(fetchOpexCategoriesTree(center));
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Failed to toggle category. Please try again.',
        });
      }
    },
    [dispatch],
  );

  const handleCategoryToggleAll = useCallback(
    async (categoryNames, center, enabled) => {
      try {
        await dispatch(setOpexCategoryForCenter({ categoryNames, center, enabled })).unwrap();
        dispatch(fetchOpexCategoriesTree(center));
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Failed to toggle categories. Please try again.',
        });
      }
    },
    [dispatch],
  );

  const handleRowSelect = useCallback((row) => {
    setSelectedOpexId(row.name ?? row.id);
    setIsViewDrawerOpen(true);
  }, []);

  const handleViewDrawerClose = useCallback(() => {
    setIsViewDrawerOpen(false);
    setSelectedOpexId(null);
  }, []);

  const currentIndex = list.rows.findIndex(
    (row) => String(row.name ?? row.id) === String(selectedOpexId),
  );
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < list.rows.length - 1;

  const handleNavigatePrevious = useCallback(() => {
    if (currentIndex > 0) {
      const previous = list.rows[currentIndex - 1];
      setSelectedOpexId(previous?.name ?? previous?.id);
    }
  }, [list.rows, currentIndex]);

  const handleNavigateNext = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < list.rows.length - 1) {
      const next = list.rows[currentIndex + 1];
      setSelectedOpexId(next?.name ?? next?.id);
    }
  }, [list.rows, currentIndex]);

  const handleFieldUpdate = useCallback(
    async (opexId, fieldname, value) => {
      try {
        await dispatch(updateOpexField({ name: opexId, fieldname, value })).unwrap();
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Failed to update OPEX field. Please try again.',
        });
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
        if (centerId) {
          const pageSize = list.pageSize || 20;
          const pageOfRecord = Math.floor(rowIndex / pageSize) + 1;
          dispatch(
            fetchOpexList({
              filters: apiFilters,
              page: pageOfRecord,
              pageSize,
              orderBy: 'creation desc',
              append: false,
              replacePage: pageOfRecord,
            }),
          );
          dispatch(fetchOpexStats({ filters: apiFilters }));
        }
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Failed to update OPEX field. Please try again.',
        });
      }
    },
    [dispatch, centerId, apiFilters, list.pageSize],
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
        showErrorToast(error, {
          defaultMessage: 'Failed to add comment. Please try again.',
        });
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

  // Close view drawer if the selected record no longer appears in the list (e.g. moved to another tab after status update)
  useEffect(() => {
    if (!selectedOpexId || !isViewDrawerOpen) return;
    const stillInList = list.rows.some(
      (row) => String(row.name ?? row.id) === String(selectedOpexId),
    );
    if (!stillInList) {
      setIsViewDrawerOpen(false);
      setSelectedOpexId(null);
    }
  }, [list.rows, selectedOpexId, isViewDrawerOpen]);

  useEffect(() => {
    return () => {
      centerFilterInitializedRef.current = null;
    };
  }, []);

  return (
    <div className='flex min-h-0 flex-col gap-4 h-full'>
      <OpexStats stats={stats} />

      <div className='flex items-start gap-2'>
        <div className='flex-1 min-w-0'>
          <OpexToolbar
            searchValue={searchTerm}
            onSearchChange={handleSearchChange}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            opexTabOptions={opexTabOptions}
            tableRef={tableRef}
            tableVariant={tableVariant}
            onTableVariantToggle={toggleTableVariant}
            onGroupByClick={handleGroupByClick}
            onAddOpex={handleAddOpex}
            filters={currentFilters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            centerOptions={[]}
            hideCenterFilter={true}
            categoryOptions={filterOptions?.categories}
            subcategoryOptions={filterOptions?.subcategories}
            month={currentFilters.month || DEFAULT_OPEX_FILTERS.month}
            year={currentFilters.year || DEFAULT_OPEX_FILTERS.year}
            onMonthChange={handleMonthChange}
            onYearChange={handleYearChange}
          />
        </div>
        <Popover.Root open={isManageOpen} onOpenChange={setIsManageOpen}>
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
              Opex
            </Button.Root>
          </Popover.Trigger>
          <Popover.Content
            align='end'
            side='bottom'
            className='flex flex-col min-h-0 w-[380px] max-h-[min(70vh,300px)] overflow-hidden px-0 pt-0 pb-2 ring-outset ring-stroke-soft-200'
            showArrow={true}
          >
            <OpexCategoryPanel
              centerId={centerId}
              categories={categoryTree.data?.categories ?? []}
              isLoading={categoryTree.status === 'loading'}
              onToggle={handleCategoryToggle}
              onToggleAll={handleCategoryToggleAll}
              fillHeight
              className='flex-1 min-h-0 border-0 shadow-none rounded-none'
            />
          </Popover.Content>
        </Popover.Root>
      </div>

      <OpexTable
        key={activeTab}
        ref={tableRef}
        rows={list.rows}
        isLoading={list.status === 'loading'}
        variant={tableVariant}
        onSortingChange={handleSortingChange}
        sorting={list.sorting}
        tableId='center-detail-opex-table'
        defaultVisibleColumns={ROLE_COLUMN_CONFIGS[activeTab] || ROLE_COLUMN_CONFIGS.all}
        onRowSelect={handleRowSelect}
        onRowChange={handleRowChange}
        permissions={{ canEdit: true, roleType: userRoleType }}
      />

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
          permissions={{ canEdit: true, roleType: userRoleType }}
        />
      )}
    </div>
  );
};

export default CenterDetailOpexTab;
