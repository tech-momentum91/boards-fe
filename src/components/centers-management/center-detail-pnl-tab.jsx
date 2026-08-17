import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useDebounce } from '@/hooks/use-debounce';
import { useTableVariant } from '@/hooks/use-table-variant';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { PnlStats, PnlToolbar, PnlTable } from '@/components/pnl';
import { generatePnLPDF } from '@/utils/pnl-pdf-export';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  fetchPnLList,
  selectPnLList,
  setPnLFilters,
  replacePnLFilters,
  setPnLSorting,
} from '@/redux/pnlSlice';
import {
  DEFAULT_PNL_FILTERS,
  CENTER_DETAIL_PNL_FILTER_PERSIST_OPTS,
} from '@/components/pnl/constants';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';

const PNL_TABLE_ID = 'center-detail-pnl-table';

const CenterDetailPnLTab = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const { data: centerDetails } = useSelector((state) => state.center.centerDetails);
  const centerId = centerDetails?.name || id || '';
  const centerName = centerDetails?.center_name || 'Center';
  const { variant: tableVariant } = useTableVariant(PNL_TABLE_ID, 'compact');
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const lastApiCallRef = useRef('');
  const tableRef = useRef(null);

  const list = useSelector(selectPnLList);
  const currentFilters = list.filters || { ...DEFAULT_PNL_FILTERS };
  const currentSorting = Array.isArray(list.sorting) ? list.sorting : [];

  const [searchTerm, setSearchTerm] = useState(currentFilters.search || '');
  const [isExporting, setIsExporting] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 400);

  useEffect(() => {
    if (debouncedSearch !== (currentFilters.search || '')) {
      dispatch(setPnLFilters({ search: debouncedSearch }));
    }
  }, [debouncedSearch, currentFilters.search, dispatch]);

  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: `center-detail-pnl-view-filter-dropdown-${centerId}`,
    defaultFilters: DEFAULT_PNL_FILTERS,
    persistIncludeKeys: CENTER_DETAIL_PNL_FILTER_PERSIST_OPTS.includeKeys,
    persistIgnoreStringValuesByKey: CENTER_DETAIL_PNL_FILTER_PERSIST_OPTS.ignoreStringValuesByKey,
  });

  // 1. Initialize from persistence (Runs only once when persistedFilters are loaded)
  useEffect(() => {
    if (!centerId || filtersInitialized) return;

    dispatch(
      replacePnLFilters({
        ...DEFAULT_PNL_FILTERS,
        ...persistedFilters,
        center: centerId,
        search: '',
      }),
    );
    setSearchTerm('');
    setFiltersInitialized(true);
  }, [centerId, persistedFilters, dispatch, filtersInitialized]);

  // 2. Persist to storage (Runs when filters change, but only after initialization)
  useEffect(() => {
    if (!centerId || !filtersInitialized) return;

    // Check if the current center matches the filters before persisting
    const hasCorrectCenter = String(currentFilters.center || '') === String(centerId);
    if (!hasCorrectCenter) return;

    const compacted = compactFiltersForSessionStorage(
      currentFilters,
      DEFAULT_PNL_FILTERS,
      CENTER_DETAIL_PNL_FILTER_PERSIST_OPTS,
    );
    const currentCompacted = compactFiltersForSessionStorage(
      persistedFilters,
      DEFAULT_PNL_FILTERS,
      CENTER_DETAIL_PNL_FILTER_PERSIST_OPTS,
    );

    if (JSON.stringify(compacted) !== JSON.stringify(currentCompacted)) {
      setPersistedFilters(currentFilters);
    }
  }, [centerId, currentFilters, filtersInitialized, setPersistedFilters, persistedFilters]);

  // Fetch list whenever filters are ready
  useEffect(() => {
    if (!centerId || !filtersInitialized) return;
    const hasCorrectCenter = String(currentFilters.center || '') === String(centerId);
    if (!hasCorrectCenter) return;

    let orderBy = 'period desc';
    if (Array.isArray(list.sorting) && list.sorting.length > 0) {
      const { id: sortId, desc } = list.sorting[0];
      orderBy = `${sortId} ${desc ? 'desc' : 'asc'}`;
    }

    const callKey = `${JSON.stringify(currentFilters)}-${list.pageSize || 20}-${orderBy}`;
    if (lastApiCallRef.current === callKey) return;
    lastApiCallRef.current = callKey;

    dispatch(
      fetchPnLList({
        filters: currentFilters,
        page: 1,
        pageSize: list.pageSize || 20,
        orderBy,
        append: false,
      }),
    );
  }, [dispatch, centerId, currentFilters, list.pageSize, currentSorting]);

  const handleFilterChange = useCallback(
    (next) => {
      dispatch(
        setPnLFilters({
          ...next,
          center: centerId || '',
        }),
      );
    },
    [dispatch, centerId],
  );

  const handleClearFilters = useCallback(() => {
    dispatch(
      replacePnLFilters({
        ...DEFAULT_PNL_FILTERS,
        center: centerId || '',
        search: currentFilters.search || '',
      }),
    );
  }, [dispatch, centerId, currentFilters.search]);

  const rows = list.rows || [];
  const statusCounts = list.statusCounts || null;

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      const visibleColumns = tableRef?.current?.columnConfigHook?.columns
        ?.filter((c) => c.visible !== false)
        ?.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        ?.map((c) => c.id);

      await generatePnLPDF({
        rows,
        centerName,
        centerId,
        period: currentFilters.period || 'monthly',
        month:
          currentFilters.month === 'last_3'
            ? 'Last 3 months'
            : currentFilters.month === 'last_6'
              ? 'Last 6 months'
              : currentFilters.month === 'last_9'
                ? 'Last 9 months'
                : currentFilters.month === 'last_12'
                  ? 'Last 12 months'
                  : 'All',
        visibleColumns,
      });
      showSuccessToast('PDF exported successfully.');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to export PDF. Please try again.' });
    } finally {
      setIsExporting(false);
    }
  }, [rows, centerName, centerId, currentFilters.period, currentFilters.month]);

  return (
    <div className='flex flex-col gap-4 h-full'>
      <PnlStats rows={rows} statusCounts={statusCounts} />

      <div className='flex items-start gap-2'>
        <div className='flex-1 min-w-0'>
          <PnlToolbar
            period={currentFilters.period || 'monthly'}
            onPeriodChange={(value) => dispatch(setPnLFilters({ period: value }))}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            isExporting={isExporting}
            onExport={handleExport}
            tableRef={tableRef}
            filters={currentFilters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
          />
        </div>
      </div>

      <PnlTable
        ref={tableRef}
        rows={rows}
        isLoading={list.status === 'loading'}
        variant={tableVariant}
        tableId={PNL_TABLE_ID}
        sorting={currentSorting}
        onSortingChange={(next) => dispatch(setPnLSorting(next))}
      />
    </div>
  );
};

export default CenterDetailPnLTab;
