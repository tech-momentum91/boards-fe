import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { STOCKS_FILTER_VALUE_ALL, STOCKS_TAB_IDS } from '@/components/stocks/constants';
import CreateStockRuleModal from '@/components/stocks/stock-rules/components/create-stock-rule-modal';
import ViewStockRuleDrawer from '@/components/stocks/stock-rules/components/view-stock-rule-drawer';
import StockRulesTable from '@/components/stocks/stock-rules/components/stock-rules-table';
import StockRulesToolbar from '@/components/stocks/stock-rules/components/stock-rules-toolbar';
import {
  buildStocksCategoryOptions,
  buildStocksOrderBy,
  EMPTY_STOCKS_SORTING,
  resolveStocksEmptyContext,
} from '@/components/stocks/stocks-helper';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import {
  fetchStockCategories,
  fetchStockRulesList,
  saveStockRules,
  selectStockCategoriesState,
  selectStockRulesListState,
  updateStockRule,
} from '@/redux/stocksSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { RiArrowDownSLine } from 'react-icons/ri';

const SEARCH_DEBOUNCE_MS = 400;
const DEFAULT_STOCK_RULE_COLUMNS = [
  { id: 'center', label: 'Center', visible: true, enableHiding: true },
  { id: 'category', label: 'Category', visible: true, enableHiding: true },
  { id: 'product', label: 'Product', visible: true, enableHiding: true },
  { id: 'unit', label: 'Unit', visible: true, enableHiding: true },
  { id: 'min', label: 'Min', visible: true, enableHiding: true },
  { id: 'trigger', label: 'Trigger', visible: true, enableHiding: true },
  { id: 'target', label: 'Target', visible: true, enableHiding: true },
  { id: 'consumption', label: 'Consumption', visible: true, enableHiding: true },
  { id: 'frequency', label: 'Frequency', visible: true, enableHiding: true },
  { id: 'fifo', label: 'FIFO', visible: true, enableHiding: true },
  { id: 'critical', label: 'Critical', visible: true, enableHiding: true },
];
const STOCK_RULES_SORT_FIELD_MAP = {
  center: 'center_name',
  category: 'item_group',
  product: 'item_name',
  unit: 'stock_uom',
  min: 'custom_min_level',
  trigger: 'warehouse_reorder_level',
  target: 'custom_max_value',
  consumption: 'custom_consumption',
  frequency: 'custom_frequency',
  fifo: 'custom_fifo',
  critical: 'custom_critical',
};

const StockRules = ({ isActive = false }) => {
  const dispatch = useDispatch();
  const list = useSelector(selectStockRulesListState);
  const stockCategoriesState = useSelector(selectStockCategoriesState);

  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState([STOCKS_FILTER_VALUE_ALL]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [columns, setColumns] = useState(DEFAULT_STOCK_RULE_COLUMNS);
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [sorting, setSorting] = useState(EMPTY_STOCKS_SORTING);

  useEffect(() => {
    setColumns((previous) => {
      const existingIds = new Set(previous.map((column) => column.id));
      const missing = DEFAULT_STOCK_RULE_COLUMNS.filter((column) => !existingIds.has(column.id));
      if (missing.length === 0) return previous;
      return [...previous, ...missing];
    });
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchValue]);

  const orderBy = useMemo(
    () => buildStocksOrderBy(sorting, STOCK_RULES_SORT_FIELD_MAP, 'modified desc'),
    [sorting],
  );

  const listFetchArgs = useMemo(
    () => ({
      keyword: debouncedSearch,
      categoryFilter: category,
      groupBy,
      groupOrder,
      orderBy,
    }),
    [debouncedSearch, category, groupBy, groupOrder, orderBy],
  );

  const refetchList = useCallback(() => {
    return dispatch(fetchStockRulesList({ ...listFetchArgs, reset: true }));
  }, [dispatch, listFetchArgs]);

  useEffect(() => {
    if (!isActive) return;
    refetchList();
  }, [isActive, refetchList]);

  const listReady = list.status === 'succeeded' && !list.isLoading && !list.isLoadingMore;

  const handleLoadMore = useCallback(() => {
    if (!isActive || !listReady || !list.hasMore) return;
    dispatch(fetchStockRulesList({ ...listFetchArgs, reset: false }));
  }, [dispatch, isActive, listReady, list.hasMore, listFetchArgs]);

  const { renderSentinel } = useScrollPagination({
    onLoadMore: handleLoadMore,
    hasMore: Boolean(list.hasMore),
    isLoading: Boolean(list.isLoading || list.isLoadingMore),
    threshold: 200,
    scrollContainer: null,
    enabled: Boolean(isActive && list.hasMore && listReady),
  });

  useEffect(() => {
    if (isActive && stockCategoriesState.status === 'idle') {
      dispatch(fetchStockCategories());
    }
  }, [dispatch, isActive, stockCategoriesState.status]);

  const columnConfig = useMemo(
    () => ({
      columns,
      toggleColumnVisibility: (columnId) =>
        setColumns((previous) =>
          previous.map((column) =>
            column.id === columnId ? { ...column, visible: !column.visible } : column,
          ),
        ),
      reorderColumns: (oldIndex, newIndex) =>
        setColumns((previous) => {
          const next = [...previous];
          const [moved] = next.splice(oldIndex, 1);
          next.splice(newIndex, 0, moved);
          return next;
        }),
      showAllColumns: () =>
        setColumns((previous) => previous.map((column) => ({ ...column, visible: true }))),
      hideAllColumns: () =>
        setColumns((previous) =>
          previous.map((column) =>
            column.enableHiding === false ? column : { ...column, visible: false },
          ),
        ),
    }),
    [columns],
  );

  const groupedSections = useMemo(() => {
    if (!(list.isGrouped && list.groups)) return [];
    return list.groups;
  }, [list.isGrouped, list.groups]);

  const handleSaveStockRules = useCallback(
    async (payload) => {
      try {
        const result = await dispatch(saveStockRules(payload)).unwrap();
        const created = result?.created_rows ?? 0;
        const updated = result?.updated_rows ?? 0;
        const total = created + updated;
        showSuccessToast(
          total > 0
            ? `${total} stock rule row(s) saved successfully.`
            : 'Stock rules saved successfully.',
        );
        await refetchList();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to save stock rules.' });
        throw error;
      }
    },
    [dispatch, refetchList],
  );

  const handleOpenRuleDetails = (rule) => {
    setSelectedRule(rule);
    setIsDetailsDrawerOpen(true);
  };

  const handleUpdateRule = useCallback(
    async (ruleId, updates) => {
      try {
        await dispatch(updateStockRule({ rowId: ruleId, updates })).unwrap();
        const listResult = await refetchList().unwrap();
        const rows = listResult?.rows ?? [];
        const refreshed = rows.find(
          (row) => String(row.id) === String(ruleId) || String(row.row_id) === String(ruleId),
        );
        if (refreshed) {
          setSelectedRule(refreshed);
        }
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update stock rule.' });
        throw error;
      }
    },
    [dispatch, refetchList],
  );

  const tableIsInitialLoading =
    list.isLoading && (groupBy ? groupedSections.length === 0 : list.items.length === 0);
  const tableError =
    list.error && (groupBy ? groupedSections.length === 0 : list.items.length === 0)
      ? list.error
      : null;
  const emptyContext = useMemo(
    () =>
      resolveStocksEmptyContext({
        search: debouncedSearch,
        filters: { category },
      }),
    [debouncedSearch, category],
  );
  const categoryFilterOptions = useMemo(
    () => buildStocksCategoryOptions(stockCategoriesState.items, { includeAll: true }),
    [stockCategoriesState.items],
  );
  const categorySelectOptions = useMemo(
    () => buildStocksCategoryOptions(stockCategoriesState.items),
    [stockCategoriesState.items],
  );

  return (
    <>
      <TabMenuHorizontal.Content
        value={STOCKS_TAB_IDS.STOCK_RULES}
        className='min-h-0 flex-1 outline-none'
      >
        <div className='flex min-h-0 flex-1 flex-col gap-5 px-8 pb-10 pt-6'>
          <StockRulesToolbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            category={category}
            onCategoryChange={setCategory}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            groupOrder={groupOrder}
            onGroupOrderChange={setGroupOrder}
            onAddRule={() => setIsAddModalOpen(true)}
            columnConfig={columnConfig}
            categoryOptions={categoryFilterOptions}
          />

          {list.error && list.items.length > 0 ? (
            <p className='paragraph-small text-error-base'>{list.error}</p>
          ) : null}

          <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto'>
            {groupBy ? (
              <div className='flex flex-col gap-4'>
                {groupedSections.length === 0 ? (
                  <StockRulesTable
                    rows={[]}
                    onRowClick={handleOpenRuleDetails}
                    columnConfig={columns}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    isLoading={tableIsInitialLoading}
                    error={tableError}
                    context={emptyContext}
                    onRetry={refetchList}
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
                          {`${section.count} items`}
                        </Badge.Root>
                      </div>
                      <Button.Root
                        variant='borderless'
                        size='small'
                        type='button'
                        className='gap-2 px-1.5 text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-main-900 focus-visible:ring-2 focus-visible:ring-primary-base/30'
                      >
                        <Button.Icon as={RiArrowDownSLine} className='text-text-sub-600' />
                      </Button.Root>
                    </div>
                    <StockRulesTable
                      rows={section.rows}
                      onRowClick={handleOpenRuleDetails}
                      columnConfig={columns}
                      sorting={sorting}
                      onSortingChange={setSorting}
                      isLoading={list.isLoading}
                    />
                  </section>
                ))}
              </div>
            ) : (
              <StockRulesTable
                rows={list.items}
                onRowClick={handleOpenRuleDetails}
                columnConfig={columns}
                sorting={sorting}
                onSortingChange={setSorting}
                isLoading={tableIsInitialLoading}
                error={tableError}
                context={emptyContext}
                onRetry={refetchList}
              />
            )}
            {renderSentinel()}
          </div>
        </div>
      </TabMenuHorizontal.Content>

      <CreateStockRuleModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubmit={handleSaveStockRules}
        categoryOptions={categorySelectOptions}
      />
      <ViewStockRuleDrawer
        open={isDetailsDrawerOpen}
        onOpenChange={setIsDetailsDrawerOpen}
        rule={selectedRule}
        onUpdateRule={handleUpdateRule}
      />
    </>
  );
};

export default StockRules;
