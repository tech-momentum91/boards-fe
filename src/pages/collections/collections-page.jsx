import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiBarChart2Line, RiCheckboxCircleLine, RiFundsLine } from 'react-icons/ri';
import PageLayout from '@/components/page-layout';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import {
  CollectionsAnalyticsSection,
  CollectionsStats,
  CollectionsTable,
  CollectionsToolbar,
} from '@/components/collections';
import { getGlobalCollections, getGlobalCollectionsAnalytics } from '@/api/projectCollections';
import {
  COLLECTIONS_LIST_PAGE_SIZE,
  COLLECTIONS_PROJECT_FILTER_OPTIONS,
  COLLECTIONS_TABLE_COLUMNS,
  COLLECTIONS_TABS,
  GLOBAL_COLLECTIONS_STATS,
  getStoredCollectionsColumnConfig,
  saveStoredCollectionsColumnConfig,
} from '@/collections/constants';
import { COLLECTIONS_ANALYTICS_FY_OPTIONS } from '@/collections/analytics-constants';
import { useColumnConfig } from '@/hooks/use-column-config';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/utils/cn';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';
import * as Select from '@/components/ui/select';

export default function CollectionsPage() {
  const [scrollContainer, setScrollContainer] = useState(null);
  const [activeTab, setActiveTab] = useState('collections');
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [sorting, setSorting] = useState([]);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(COLLECTIONS_LIST_PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);

  const [listStats, setListStats] = useState(GLOBAL_COLLECTIONS_STATS);
  const [listRows, setListRows] = useState([]);
  const [listTotalCount, setListTotalCount] = useState(0);
  const [projectOptions, setProjectOptions] = useState(COLLECTIONS_PROJECT_FILTER_OPTIONS);

  const [analyticsFiscalYear, setAnalyticsFiscalYear] = useState(
    COLLECTIONS_ANALYTICS_FY_OPTIONS[0]?.value ?? 'fy-2026-27',
  );
  const [fiscalYearOptions, setFiscalYearOptions] = useState(COLLECTIONS_ANALYTICS_FY_OPTIONS);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [collectionPeriod, setCollectionPeriod] = useState('monthly');
  const [analyticsStats, setAnalyticsStats] = useState(null);
  const [projectOutstanding, setProjectOutstanding] = useState([]);
  const [dlpOutstanding, setDlpOutstanding] = useState([]);
  const [billingChart, setBillingChart] = useState(null);
  const [collectionChart, setCollectionChart] = useState(null);

  const debouncedSearch = useDebounce(searchTerm, 400);

  const columnConfig = useColumnConfig(
    'collections-global-table',
    COLLECTIONS_TABLE_COLUMNS,
    saveStoredCollectionsColumnConfig,
    getStoredCollectionsColumnConfig,
    { autoSave: true, debounce: 200, pinnedColumnId: 'name' },
  );

  const loadCollectionsList = useCallback(async () => {
    setIsListLoading(true);
    try {
      const data = await getGlobalCollections({
        search: debouncedSearch,
        project_filter: projectFilter,
        page: 1,
        page_size: 500,
      });
      setListStats(data?.stats ?? GLOBAL_COLLECTIONS_STATS);
      setListRows(Array.isArray(data?.results) ? data.results : []);
      setListTotalCount(Number(data?.total_count ?? 0));
      if (Array.isArray(data?.project_options) && data.project_options.length > 0) {
        setProjectOptions(data.project_options);
      }
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: extractErrorMessage(error) || 'Failed to load collections',
      });
      setListRows([]);
      setListTotalCount(0);
    } finally {
      setIsListLoading(false);
    }
  }, [debouncedSearch, projectFilter]);

  const loadAnalytics = useCallback(async () => {
    setIsAnalyticsLoading(true);
    try {
      const data = await getGlobalCollectionsAnalytics({
        project_filter: projectFilter,
        fiscal_year: analyticsFiscalYear,
        billing_period: billingPeriod,
        collection_period: collectionPeriod,
      });
      setAnalyticsStats(data?.stats ?? null);
      setProjectOutstanding(
        Array.isArray(data?.project_outstanding) ? data.project_outstanding : [],
      );
      setDlpOutstanding(Array.isArray(data?.dlp_outstanding) ? data.dlp_outstanding : []);
      setBillingChart(data?.billing_chart ?? null);
      setCollectionChart(data?.collection_chart ?? null);
      if (Array.isArray(data?.fiscal_year_options) && data.fiscal_year_options.length > 0) {
        setFiscalYearOptions(data.fiscal_year_options);
      }
      if (Array.isArray(data?.project_options) && data.project_options.length > 0) {
        setProjectOptions(data.project_options);
      }
      if (data?.fiscal_year && data.fiscal_year !== analyticsFiscalYear) {
        setAnalyticsFiscalYear(data.fiscal_year);
      }
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: extractErrorMessage(error) || 'Failed to load collections analytics',
      });
    } finally {
      setIsAnalyticsLoading(false);
    }
  }, [analyticsFiscalYear, billingPeriod, collectionPeriod, projectFilter]);

  useEffect(() => {
    if (activeTab !== 'collections') return;
    void loadCollectionsList();
  }, [activeTab, loadCollectionsList]);

  useEffect(() => {
    if (activeTab !== 'analytics') return;
    void loadAnalytics();
  }, [activeTab, loadAnalytics]);

  useEffect(() => {
    setVisibleCount(COLLECTIONS_LIST_PAGE_SIZE);
  }, [debouncedSearch, projectFilter]);

  const visibleRows = useMemo(() => listRows.slice(0, visibleCount), [listRows, visibleCount]);

  const hasMore = visibleCount < listRows.length;

  const handleLoadMore = useCallback(() => {
    if (!hasMore) return;
    setIsLoadingMore(true);
    setVisibleCount((previous) => Math.min(previous + COLLECTIONS_LIST_PAGE_SIZE, listRows.length));
    requestAnimationFrame(() => setIsLoadingMore(false));
  }, [hasMore, listRows.length]);

  const handleScrollContainerRef = useCallback((node) => {
    setScrollContainer(node);
  }, []);

  return (
    <PageLayout
      pageTitle='Collections'
      pageIcon={<RiFundsLine size={24} />}
      pageDescription='Manage collections and cash flow across projects.'
      contentAreaClassName={
        activeTab === 'collections' ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'
      }
    >
      <div
        className={cn(
          'flex min-w-0 max-w-full flex-col gap-5 overflow-x-hidden px-4 pb-8 pt-3 sm:px-6 lg:px-8',
          activeTab === 'collections' && 'min-h-0 flex-1',
        )}
      >
        <TabMenuHorizontal.Root value={activeTab} onValueChange={setActiveTab}>
          <div className='flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-stroke-soft-200'>
            <TabMenuHorizontal.List
              wrapperClassName='min-w-0 max-w-full flex-1 border-0'
              className='border-0'
            >
              {COLLECTIONS_TABS.map((tab) => (
                <TabMenuHorizontal.Trigger key={tab.id} value={tab.id} className='gap-2'>
                  {tab.id === 'collections' ? (
                    <RiCheckboxCircleLine className='size-4' />
                  ) : (
                    <RiBarChart2Line className='size-4' />
                  )}
                  {tab.label}
                </TabMenuHorizontal.Trigger>
              ))}
            </TabMenuHorizontal.List>

            {activeTab === 'analytics' ? (
              <div className='flex shrink-0 items-center gap-2 pb-2'>
                <Select.Root value={projectFilter} onValueChange={setProjectFilter} size='xsmall'>
                  <Select.Trigger className='w-[119px]'>
                    <Select.Value placeholder='All Projects' />
                  </Select.Trigger>
                  <Select.Content>
                    {projectOptions.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>

                <Select.Root
                  value={analyticsFiscalYear}
                  onValueChange={setAnalyticsFiscalYear}
                  size='xsmall'
                >
                  <Select.Trigger className='w-[118px]'>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {fiscalYearOptions.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
            ) : null}
          </div>
        </TabMenuHorizontal.Root>

        {activeTab === 'collections' ? (
          <>
            <CollectionsStats stats={listStats} />

            <CollectionsToolbar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              projectFilter={projectFilter}
              onProjectFilterChange={setProjectFilter}
              projectOptions={projectOptions}
              columnConfig={columnConfig}
              isColumnManagerOpen={isColumnManagerOpen}
              onColumnManagerOpenChange={setIsColumnManagerOpen}
            />

            <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
              <div
                ref={handleScrollContainerRef}
                className='min-h-0 flex-1 overflow-x-auto overflow-y-auto px-2 pb-4 pt-2'
              >
                {isListLoading && listRows.length === 0 ? (
                  <div className='flex min-h-[200px] items-center justify-center text-paragraph-sm text-text-sub-500'>
                    Loading collections…
                  </div>
                ) : (
                  <CollectionsTable
                    rows={visibleRows}
                    columnConfig={columnConfig.columns}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    hasMore={hasMore}
                    isLoadingMore={isLoadingMore}
                    onLoadMore={handleLoadMore}
                    scrollContainer={scrollContainer}
                  />
                )}
                {!isListLoading && listTotalCount === 0 ? (
                  <div className='flex min-h-[160px] items-center justify-center text-paragraph-sm text-text-sub-500'>
                    No collection projects found.
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <CollectionsAnalyticsSection
            billingPeriod={billingPeriod}
            onBillingPeriodChange={setBillingPeriod}
            collectionPeriod={collectionPeriod}
            onCollectionPeriodChange={setCollectionPeriod}
            fiscalYear={analyticsFiscalYear}
            onFiscalYearChange={setAnalyticsFiscalYear}
            fiscalYearOptions={fiscalYearOptions}
            stats={analyticsStats}
            projectOutstanding={projectOutstanding}
            dlpOutstanding={dlpOutstanding}
            billingChart={billingChart}
            collectionChart={collectionChart}
            isLoading={isAnalyticsLoading}
          />
        )}
      </div>
    </PageLayout>
  );
}
