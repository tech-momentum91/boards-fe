import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  STOCKS_FILTER_VALUE_ALL,
  STOCKS_GROUP_BY_DEFAULT,
  STOCKS_TAB_IDS,
  STOCKS_TOOLBAR_STATUS_OPTIONS,
} from '@/components/stocks/constants';
import CurrentStockCategorySection from '@/components/stocks/current-stock/components/current-stock-category-section';
import { useStocksInventoryColumnConfig } from '@/components/stocks/current-stock/components/current-stock-table';
import CurrentStockToolbar from '@/components/stocks/current-stock/components/current-stock-toolbar';
import CreateOrderModal from '@/components/stocks/orders/components/create-order-modal';
import {
  buildStocksCategoryOptions,
  buildStocksOrderBy,
  buildToolbarCenterOptions,
  EMPTY_STOCKS_SORTING,
  resolveStocksEmptyContext,
} from '@/components/stocks/stocks-helper';
import StocksListEmptyState from '@/components/stocks/shared/stocks-list-empty-state';
import StocksStatCards from '@/components/stocks/stocks-stat-cards';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import {
  fetchCurrentStockList,
  fetchStockCategories,
  fetchStockReorder,
  fetchVendorRcCenters,
  savePurchaseOrder,
  selectCurrentStockListState,
  selectStockCategoriesState,
  selectVendorRcCentersState,
} from '@/redux/stocksSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const SEARCH_DEBOUNCE_MS = 400;
const CURRENT_STOCK_SORT_FIELD_MAP = {
  product: 'product',
  center: 'center',
  unit: 'unit',
  qty: 'qty',
  min: 'min',
  trigger: 'trigger',
  target: 'target',
  reorderQty: 'reorder_qty',
  rate: 'rate',
  stockValue: 'stock_value',
  lastIn: 'last_in',
  lastOut: 'last_out',
  status: 'status',
};

const CurrentStock = ({ isActive = false }) => {
  const dispatch = useDispatch();
  const list = useSelector(selectCurrentStockListState);
  const centersState = useSelector(selectVendorRcCentersState);
  const stockCategoriesState = useSelector(selectStockCategoriesState);

  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState([STOCKS_FILTER_VALUE_ALL]);
  const [centerFilter, setCenterFilter] = useState([STOCKS_FILTER_VALUE_ALL]);
  const [statusFilter, setStatusFilter] = useState([STOCKS_FILTER_VALUE_ALL]);
  const [groupBy, setGroupBy] = useState(STOCKS_GROUP_BY_DEFAULT);
  const [groupOrder, setGroupOrder] = useState('asc');
  const [sorting, setSorting] = useState(EMPTY_STOCKS_SORTING);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [reorderDraft, setReorderDraft] = useState(null);
  const reorderCheckingRef = useRef(false);
  const columnConfigHook = useStocksInventoryColumnConfig();

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchValue]);

  const resolvedGroupBy = groupBy || STOCKS_GROUP_BY_DEFAULT;
  const orderBy = useMemo(
    () => buildStocksOrderBy(sorting, CURRENT_STOCK_SORT_FIELD_MAP, ''),
    [sorting],
  );

  const listFetchArgs = useMemo(
    () => ({
      keyword: debouncedSearch,
      categoryFilter,
      centerFilter,
      statusFilter,
      groupBy: resolvedGroupBy,
      groupOrder,
      orderBy,
    }),
    [
      debouncedSearch,
      categoryFilter,
      centerFilter,
      statusFilter,
      resolvedGroupBy,
      groupOrder,
      orderBy,
    ],
  );

  const refetchList = useCallback(() => {
    return dispatch(fetchCurrentStockList({ ...listFetchArgs, reset: true }));
  }, [dispatch, listFetchArgs]);

  useEffect(() => {
    if (!isActive) return;
    refetchList();
  }, [isActive, refetchList]);

  const listReady = list.status === 'succeeded' && !list.isLoading && !list.isLoadingMore;

  const handleLoadMore = useCallback(() => {
    if (!isActive || !listReady || !list.hasMore) return;
    dispatch(fetchCurrentStockList({ ...listFetchArgs, reset: false }));
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
    if (isActive && centersState.status === 'idle') {
      dispatch(fetchVendorRcCenters());
    }
  }, [dispatch, isActive, centersState.status]);

  useEffect(() => {
    if (isActive && stockCategoriesState.status === 'idle') {
      dispatch(fetchStockCategories());
    }
  }, [dispatch, isActive, stockCategoriesState.status]);

  useEffect(() => {
    if (list.status === 'failed' && list.error) {
      showErrorToast(list.error, { defaultMessage: 'Failed to load current stock.' });
    }
  }, [list.status, list.error]);

  const categoryOptions = useMemo(
    () => buildStocksCategoryOptions(stockCategoriesState.items, { includeAll: true }),
    [stockCategoriesState.items],
  );

  const centerOptions = useMemo(
    () => buildToolbarCenterOptions(centersState.items, 'All Centers'),
    [centersState.items],
  );

  const handleGroupOrderChange = useCallback((next) => {
    setGroupOrder((previous) => {
      const resolved = typeof next === 'function' ? next(previous) : next;
      return resolved === 'desc' ? 'desc' : 'asc';
    });
  }, []);

  const handleCreateOrderOpenChange = useCallback((next) => {
    setCreateOrderOpen(next);
    if (!next) {
      setReorderDraft(null);
    }
  }, []);

  const handleReorderStock = useCallback(
    (row) => {
      const center = row?.centerId ?? '';
      const itemCode = row?.itemCode ?? '';

      if (!center || !itemCode) {
        showErrorToast('Center and product are required to reorder stock.');
        return;
      }

      if (reorderCheckingRef.current) return;
      reorderCheckingRef.current = true;

      // Validate that the item is reorderable BEFORE opening the modal. This avoids
      // the modal opening and then immediately closing (a flicker) when the reorder
      // fetch fails, e.g. "No reorder rules for this item at this center".
      dispatch(fetchStockReorder({ center, itemCode }))
        .unwrap()
        .then(() => {
          setReorderDraft({
            lockedFromReorder: true,
            reorderItemCode: itemCode,
            center,
            centerLabel: row?.center ?? center,
            lineItems: [],
          });
          setCreateOrderOpen(true);
        })
        .catch((error) => {
          showErrorToast(error, {
            defaultMessage: 'No reorder rules for this item at this center.',
          });
        })
        .finally(() => {
          reorderCheckingRef.current = false;
        });
    },
    [dispatch],
  );

  const handleSaveDraft = useCallback(
    async (form) => {
      try {
        const result = await dispatch(savePurchaseOrder({ form, mode: 'draft' })).unwrap();
        const orderName = result?.name ?? result?.data?.id ?? form.name ?? '';
        setReorderDraft({ ...form, name: orderName });
        showSuccessToast('Order saved as draft.');
        handleCreateOrderOpenChange(false);
        await refetchList();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to save draft.' });
        throw error;
      }
    },
    [dispatch, handleCreateOrderOpenChange, refetchList],
  );

  const handleSubmitOrder = useCallback(
    async (form) => {
      try {
        await dispatch(savePurchaseOrder({ form, mode: 'submit' })).unwrap();
        showSuccessToast('Order submitted.');
        handleCreateOrderOpenChange(false);
        await refetchList();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to submit order.' });
        throw error;
      }
    },
    [dispatch, handleCreateOrderOpenChange, refetchList],
  );

  const displaySections = useMemo(() => list.groups ?? [], [list.groups]);

  const stats = list.stats ?? {
    totalSku: 0,
    totalStockValueLabel: '₹0',
    criticalCount: 0,
  };

  const isInitialLoading = list.isLoading && displaySections.length === 0;
  const tableError = list.error && displaySections.length === 0 ? list.error : null;
  const emptyContext = useMemo(
    () =>
      resolveStocksEmptyContext({
        search: debouncedSearch,
        filters: {
          category: categoryFilter,
          center: centerFilter,
          status: statusFilter,
        },
      }),
    [debouncedSearch, categoryFilter, centerFilter, statusFilter],
  );

  return (
    <>
      <TabMenuHorizontal.Content
        value={STOCKS_TAB_IDS.CURRENT_STOCK}
        className='min-h-0 flex-1 outline-none'
      >
        <div className='flex min-h-0 flex-1 flex-col gap-5 px-8 pb-10 pt-6'>
          <StocksStatCards
            totalSku={stats.totalSku}
            totalStockValueLabel={stats.totalStockValueLabel}
            criticalCount={stats.criticalCount}
          />
          <CurrentStockToolbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            category={categoryFilter}
            onCategoryChange={setCategoryFilter}
            center={centerFilter}
            onCenterChange={setCenterFilter}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            categoryOptions={categoryOptions}
            centerOptions={centerOptions}
            statusOptions={STOCKS_TOOLBAR_STATUS_OPTIONS}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            groupOrder={groupOrder}
            onGroupOrderChange={handleGroupOrderChange}
            columnConfig={columnConfigHook}
          />

          {list.error && displaySections.length > 0 ? (
            <p className='paragraph-small text-error-base'>{list.error}</p>
          ) : null}

          <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto'>
            {isInitialLoading ? (
              <CurrentStockCategorySection
                category={{
                  id: 'loading',
                  name: 'Current Stock',
                  itemCount: 0,
                  valueLabel: '',
                  criticalCount: 0,
                  rows: [],
                }}
                columnConfig={columnConfigHook.columns}
                isLoading
                onReorderStock={handleReorderStock}
                sorting={sorting}
                onSortingChange={setSorting}
              />
            ) : displaySections.length === 0 ? (
              <StocksListEmptyState
                context={emptyContext}
                error={tableError}
                onRetry={refetchList}
              />
            ) : (
              displaySections.map((category) => (
                <CurrentStockCategorySection
                  key={category.id}
                  category={category}
                  columnConfig={columnConfigHook.columns}
                  isLoading={list.isLoadingMore}
                  onReorderStock={handleReorderStock}
                  sorting={sorting}
                  onSortingChange={setSorting}
                />
              ))
            )}
            {renderSentinel()}
          </div>
        </div>
      </TabMenuHorizontal.Content>

      <CreateOrderModal
        open={createOrderOpen}
        onOpenChange={handleCreateOrderOpenChange}
        initialDraft={reorderDraft}
        headerTitle='Create Purchase Order'
        headerDescription='Review the suggested reorder quantity, then save as draft or submit.'
        onSaveDraft={handleSaveDraft}
        onSubmitOrder={handleSubmitOrder}
      />
    </>
  );
};

export default CurrentStock;
