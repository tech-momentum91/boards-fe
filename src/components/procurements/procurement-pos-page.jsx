import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowDownSLine } from 'react-icons/ri';

import { fetchProcurementPos, fetchProcurementPosFilterOptions } from '@/api/projectProcurements';
import {
  PROCUREMENT_POS_DEFAULT_STATUS_TAB,
  PROCUREMENT_POS_LIST_DEFAULT_SORTING,
} from '@/components/procurements/constants';
import { useProcurementPosColumnConfig } from '@/components/procurements/procurement-pos-list-column-config';
import ProcurementPosListTable from '@/components/procurements/procurement-pos-list-table';
import ProcurementPosListToolbar from '@/components/procurements/procurement-pos-list-toolbar';
import ProcurementPosStatusTabs from '@/components/procurements/procurement-pos-status-tabs';
import {
  buildProcurementPosGroupedSections,
  sortProcurementPosRows,
} from '@/components/procurements/project-procurements-utils';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { showErrorToast } from '@/utils/error-utils';

const EMPTY_FILTER_OPTIONS = {
  vendorOptions: [{ value: 'all', label: 'All Vendors' }],
  packageOptions: [{ value: 'all', label: 'All Packages' }],
  categoryOptions: [{ value: 'all', label: 'All Categories' }],
};

const EMPTY_STATUS_COUNTS = {
  all: 0,
  released: 0,
  draft: 0,
  'pending-approval': 0,
};

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 400;

export default function ProcurementPosPage() {
  const columnConfigHook = useProcurementPosColumnConfig();
  const [activeStatusTab, setActiveStatusTab] = useState(PROCUREMENT_POS_DEFAULT_STATUS_TAB);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [packageFilter, setPackageFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sorting, setSorting] = useState(PROCUREMENT_POS_LIST_DEFAULT_SORTING);
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [posRows, setPosRows] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [statusTabCounts, setStatusTabCounts] = useState(EMPTY_STATUS_COUNTS);
  const [filterOptions, setFilterOptions] = useState(EMPTY_FILTER_OPTIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const fetchRequestIdRef = useRef(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [searchValue]);

  useEffect(() => {
    let cancelled = false;

    fetchProcurementPosFilterOptions()
      .then((options) => {
        if (cancelled) return;
        setFilterOptions({
          vendorOptions: options.vendorOptions ?? EMPTY_FILTER_OPTIONS.vendorOptions,
          packageOptions: options.packageOptions ?? EMPTY_FILTER_OPTIONS.packageOptions,
          categoryOptions: options.categoryOptions ?? EMPTY_FILTER_OPTIONS.categoryOptions,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setFilterOptions(EMPTY_FILTER_OPTIONS);
        showErrorToast(error, { defaultMessage: 'Failed to load filter options.' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      vendorFilter !== 'all' &&
      !filterOptions.vendorOptions.some((option) => option.value === vendorFilter)
    ) {
      setVendorFilter('all');
    }
    if (
      packageFilter !== 'all' &&
      !filterOptions.packageOptions.some((option) => option.value === packageFilter)
    ) {
      setPackageFilter('all');
    }
    if (
      categoryFilter !== 'all' &&
      !filterOptions.categoryOptions.some((option) => option.value === categoryFilter)
    ) {
      setCategoryFilter('all');
    }
  }, [categoryFilter, filterOptions, packageFilter, vendorFilter]);

  const loadRows = useCallback(
    async ({ nextPage = 1, append = false } = {}) => {
      const requestId = fetchRequestIdRef.current + 1;
      fetchRequestIdRef.current = requestId;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setLoadError(null);
      }

      try {
        const result = await fetchProcurementPos({
          statusTab: activeStatusTab,
          page: nextPage,
          pageSize: PAGE_SIZE,
          keyword: debouncedSearch,
          vendor: vendorFilter,
          package: packageFilter,
          category: categoryFilter,
        });

        if (requestId !== fetchRequestIdRef.current) return;

        const nextRows = result.rows || [];
        setPosRows((previous) => (append ? [...previous, ...nextRows] : nextRows));
        setPage(result.page || nextPage);
        setHasMore(Boolean(result.hasMore));
        setStatusTabCounts(result.counts ?? EMPTY_STATUS_COUNTS);
      } catch (error) {
        if (requestId !== fetchRequestIdRef.current) return;
        if (!append) {
          setPosRows([]);
          setHasMore(false);
          setLoadError(error);
        }
        showErrorToast(error, { defaultMessage: 'Failed to load purchase orders.' });
      } finally {
        if (requestId === fetchRequestIdRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [activeStatusTab, categoryFilter, debouncedSearch, packageFilter, vendorFilter],
  );

  useEffect(() => {
    loadRows({ nextPage: 1, append: false });
  }, [loadRows]);

  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) return;
    loadRows({ nextPage: page + 1, append: true });
  }, [hasMore, isLoading, isLoadingMore, loadRows, page]);

  const handleGroupOrderChange = useCallback((next) => {
    setGroupOrder((previous) => {
      const resolved = typeof next === 'function' ? next(previous) : next;
      return resolved === 'desc' ? 'desc' : 'asc';
    });
  }, []);

  const filteredSortedRows = useMemo(
    () => sortProcurementPosRows(posRows, sorting),
    [posRows, sorting],
  );

  const groupedSections = useMemo(
    () => buildProcurementPosGroupedSections(filteredSortedRows, groupBy, groupOrder),
    [filteredSortedRows, groupBy, groupOrder],
  );

  const emptyDescription =
    posRows.length === 0
      ? 'No purchase orders found yet.'
      : 'Adjust your search or filters to see results.';

  return (
    <TabMenuHorizontal.Root
      value={activeStatusTab}
      onValueChange={setActiveStatusTab}
      className='flex min-h-0 flex-1 flex-col overflow-hidden'
    >
      <ProcurementPosStatusTabs activeTab={activeStatusTab} counts={statusTabCounts} />

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden pt-5'>
        <div className='shrink-0 pb-5'>
          <ProcurementPosListToolbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            vendorFilter={vendorFilter}
            onVendorFilterChange={setVendorFilter}
            packageFilter={packageFilter}
            onPackageFilterChange={setPackageFilter}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            vendorOptions={filterOptions.vendorOptions}
            packageOptions={filterOptions.packageOptions}
            categoryOptions={filterOptions.categoryOptions}
            columnConfig={columnConfigHook}
            groupBy={groupBy}
            groupOrder={groupOrder}
            onGroupByChange={setGroupBy}
            onGroupOrderChange={handleGroupOrderChange}
          />
        </div>

        {loadError && !isLoading && posRows.length === 0 ? (
          <div className='mx-8 flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 text-center'>
            <p className='text-label-md text-text-strong-950'>Failed to load purchase orders</p>
            <p className='mt-1 text-paragraph-sm text-text-sub-500'>
              Try refreshing the page or check your permissions.
            </p>
          </div>
        ) : groupBy ? (
          <div className='min-h-0 flex-1 overflow-x-auto overflow-y-auto px-8'>
            <div className='flex flex-col gap-4 pb-6'>
              {groupedSections.length === 0 ? (
                <ProcurementPosListTable
                  rows={[]}
                  columnConfig={columnConfigHook.columns}
                  sorting={sorting}
                  onSortingChange={setSorting}
                  isLoading={isLoading}
                  emptyDescription={emptyDescription}
                  embedded
                />
              ) : null}
              {groupedSections.map((section) => (
                <section
                  key={section.id}
                  className='flex w-full flex-col overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'
                >
                  <div className='flex flex-wrap items-center justify-between gap-3 border-b border-stroke-soft-200 px-3 py-1.5 sm:px-3'>
                    <div className='flex min-w-0 flex-1 flex-wrap items-center gap-1.5'>
                      <h3 className='truncate text-label-sm font-medium text-text-main-900'>
                        {section.groupName}
                      </h3>
                      <Badge.Root
                        size='small'
                        variant='lighter'
                        className='border border-stroke-soft-200'
                        color='gray'
                      >
                        {`${section.count} ${section.count === 1 ? 'item' : 'items'}`}
                      </Badge.Root>
                    </div>
                    <Button.Root
                      variant='borderless'
                      size='small'
                      type='button'
                      className='gap-2 px-1.5 text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-main-900 focus-visible:ring-2 focus-visible:ring-primary-base/30'
                      aria-label={`${section.groupName} group`}
                    >
                      <Button.Icon as={RiArrowDownSLine} className='text-text-sub-600' />
                    </Button.Root>
                  </div>
                  <ProcurementPosListTable
                    rows={section.rows}
                    columnConfig={columnConfigHook.columns}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    isLoading={isLoading}
                    embedded
                  />
                </section>
              ))}
              {hasMore ? (
                <div className='flex justify-center py-2'>
                  <Button.Root
                    type='button'
                    variant='neutral'
                    mode='stroke'
                    size='small'
                    disabled={isLoadingMore}
                    onClick={handleLoadMore}
                  >
                    {isLoadingMore ? 'Loading…' : 'Load more'}
                  </Button.Root>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <ProcurementPosListTable
            rows={filteredSortedRows}
            columnConfig={columnConfigHook.columns}
            sorting={sorting}
            onSortingChange={setSorting}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            enableScrollPagination
            emptyDescription={emptyDescription}
          />
        )}
      </div>
    </TabMenuHorizontal.Root>
  );
}
