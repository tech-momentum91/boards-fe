import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  STOCKS_FILTER_VALUE_ALL,
  STOCKS_ORDERS_DEFAULT_VENDOR_FILTER_OPTIONS,
  STOCKS_ORDER_STATUS,
  STOCKS_ORDER_STATUS_FILTER_OPTIONS,
  STOCKS_TAB_IDS,
} from '@/components/stocks/constants';
import CreateOrderModal from '@/components/stocks/orders/components/create-order-modal';
import OrderStatCards from '@/components/stocks/orders/components/order-stat-cards';
import OrdersTable, {
  useStocksOrdersColumnConfig,
} from '@/components/stocks/orders/components/orders-table';
import OrdersToolbar from '@/components/stocks/orders/components/orders-toolbar';
import ViewOrderDrawer from '@/components/stocks/orders/components/view-order-drawer';
import { applyPurchaseOrderFormToListItem } from '@/components/stocks/orders/api/orders-api';
import {
  buildStocksCategoryOptions,
  buildStocksOrderBy,
  EMPTY_STOCKS_SORTING,
  mergeToolbarFilterOptions,
  resolveStocksEmptyContext,
} from '@/components/stocks/stocks-helper';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { RiArrowDownSLine } from 'react-icons/ri';
import {
  cancelPurchaseOrder,
  fetchPurchaseOrderDetail,
  fetchPurchaseOrderList,
  fetchStockCategories,
  savePurchaseOrder,
  updatePurchaseOrderItems,
  selectPurchaseOrderCancelState,
  selectPurchaseOrderListState,
  selectStockCategoriesState,
} from '@/redux/stocksSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const SEARCH_DEBOUNCE_MS = 400;
const ORDER_SORT_FIELD_MAP = {
  orderNo: 'name',
  poCenter: 'set_warehouse',
  vendor: 'supplier_name',
  requestDate: 'transaction_date',
  expectedDelivery: 'schedule_date',
  orderValue: 'grand_total',
  status: 'docstatus',
};

const DEFAULT_CREATE_MODAL_COPY = {
  title: 'Create Purchase Order',
  description: 'Enter below details to create new purchase order.',
};

function cloneFormForDraftBundle(form) {
  if (!form || typeof form !== 'object') {
    return {
      name: '',
      center: '',
      vendor: '',
      category: '',
      orderDate: '',
      expectedDelivery: '',
      notes: '',
      vendorRc: '',
      warehouse: '',
      lineItems: [],
    };
  }
  return {
    name: form.name ?? '',
    center: form.center ?? '',
    vendor: form.vendor ?? '',
    category: form.category ?? '',
    orderDate: form.orderDate ?? '',
    expectedDelivery: form.expectedDelivery ?? '',
    notes: form.notes ?? '',
    vendorRc: form.vendorRc ?? '',
    warehouse: form.warehouse ?? '',
    lineItems: Array.isArray(form.lineItems) ? form.lineItems.map((row) => ({ ...row })) : [],
  };
}

const Orders = ({ isActive = false }) => {
  const dispatch = useDispatch();
  const list = useSelector(selectPurchaseOrderListState);
  const cancelState = useSelector(selectPurchaseOrderCancelState);
  const stockCategoriesState = useSelector(selectStockCategoriesState);

  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState([STOCKS_FILTER_VALUE_ALL]);
  const [categoryFilter, setCategoryFilter] = useState([STOCKS_FILTER_VALUE_ALL]);
  const [statusFilter, setStatusFilter] = useState([STOCKS_FILTER_VALUE_ALL]);
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [sorting, setSorting] = useState(EMPTY_STOCKS_SORTING);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [savedDraftBundle, setSavedDraftBundle] = useState(null);
  const [createModalCopy, setCreateModalCopy] = useState(null);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [vendorOptions, setVendorOptions] = useState(STOCKS_ORDERS_DEFAULT_VENDOR_FILTER_OPTIONS);
  const orderColumnConfigHook = useStocksOrdersColumnConfig();

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchValue]);

  const orderBy = useMemo(
    () => buildStocksOrderBy(sorting, ORDER_SORT_FIELD_MAP, 'modified desc'),
    [sorting],
  );

  const listFetchArgs = useMemo(
    () => ({
      keyword: debouncedSearch,
      vendorFilter,
      categoryFilter,
      statusFilter,
      groupBy,
      groupOrder,
      orderBy,
    }),
    [debouncedSearch, vendorFilter, categoryFilter, statusFilter, groupBy, groupOrder, orderBy],
  );

  const refetchList = useCallback(() => {
    return dispatch(fetchPurchaseOrderList({ ...listFetchArgs, reset: true }));
  }, [dispatch, listFetchArgs]);

  useEffect(() => {
    if (!isActive) return;
    refetchList();
  }, [isActive, refetchList]);

  const listReady = list.status === 'succeeded' && !list.isLoading && !list.isLoadingMore;

  const handleLoadMore = useCallback(() => {
    if (!isActive || !listReady || !list.hasMore) return;
    dispatch(fetchPurchaseOrderList({ ...listFetchArgs, reset: false }));
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

  useEffect(() => {
    if (list.status === 'failed' && list.error) {
      showErrorToast(list.error, { defaultMessage: 'Failed to load purchase orders.' });
    }
  }, [list.status, list.error]);

  const statCounts = useMemo(() => {
    const summary = list.summary;
    if (summary) {
      return {
        total: summary.total ?? 0,
        draft: summary.draft ?? 0,
        partial: summary.partial ?? 0,
        fullyReceived: summary.fullyReceived ?? 0,
      };
    }
    const rows = list.items ?? [];
    return {
      total: rows.length,
      draft: rows.filter((row) => row.status === STOCKS_ORDER_STATUS.DRAFT).length,
      partial: rows.filter((row) => row.status === STOCKS_ORDER_STATUS.PARTIAL).length,
      fullyReceived: rows.filter((row) => row.status === STOCKS_ORDER_STATUS.FULLY_RECEIVED).length,
    };
  }, [list.summary, list.items]);

  useEffect(() => {
    setVendorOptions((previous) =>
      mergeToolbarFilterOptions(previous, list.items, 'vendor', 'All Vendors'),
    );
  }, [list.items]);

  const groupedSections = useMemo(() => {
    if (!(list.isGrouped && list.groups)) return [];
    return list.groups;
  }, [list.isGrouped, list.groups]);

  const createHeader = createModalCopy ?? DEFAULT_CREATE_MODAL_COPY;
  const categoryOptions = useMemo(
    () => buildStocksCategoryOptions(stockCategoriesState.items, { includeAll: true }),
    [stockCategoriesState.items],
  );

  const handleCreateOpenChange = useCallback((next) => {
    setCreateOpen(next);
    if (!next) setCreateModalCopy(null);
  }, []);

  const handleAdd = useCallback(() => {
    setSavedDraftBundle(null);
    setCreateModalCopy(null);
    setCreateOpen(true);
  }, []);

  const handleGroupOrderChange = useCallback((next) => {
    setGroupOrder((previous) => {
      const resolved = typeof next === 'function' ? next(previous) : next;
      return resolved === 'desc' ? 'desc' : 'asc';
    });
  }, []);

  const handleRowView = useCallback(
    async (row) => {
      if (row.status === STOCKS_ORDER_STATUS.DRAFT) {
        const orderName = row.name ?? row.orderNo ?? row.id;
        try {
          const detail = await dispatch(fetchPurchaseOrderDetail(orderName)).unwrap();
          const form = detail?.order?.form;
          if (!form) {
            showErrorToast(null, { defaultMessage: 'Failed to load draft order.' });
            return;
          }
          setSavedDraftBundle({
            form: cloneFormForDraftBundle(form),
            orderRowId: orderName,
            orderName,
          });
          setCreateModalCopy({
            title: 'Edit purchase order',
            description: `Draft ${orderName}. Update the form, then save as draft or submit.`,
          });
          setCreateOpen(true);
        } catch (error) {
          showErrorToast(error, { defaultMessage: 'Failed to load draft order.' });
        }
        return;
      }
      setSelectedRow(row);
      setDetailDrawerOpen(true);
    },
    [dispatch],
  );

  const handleSaveDraft = useCallback(
    async (form) => {
      const formPayload = {
        ...form,
        name: form.name || savedDraftBundle?.orderName || '',
      };
      try {
        const result = await dispatch(
          savePurchaseOrder({ form: formPayload, mode: 'draft' }),
        ).unwrap();
        const orderName = result?.name ?? result?.data?.id ?? formPayload.name ?? '';
        const nextForm = { ...formPayload, name: orderName };
        setSavedDraftBundle({
          form: cloneFormForDraftBundle(nextForm),
          orderRowId: orderName,
          orderName,
        });
        showSuccessToast('Order saved as draft.');
        handleCreateOpenChange(false);
        await refetchList();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to save draft.' });
        throw error;
      }
    },
    [dispatch, savedDraftBundle, handleCreateOpenChange, refetchList],
  );

  const handleUpdateOrder = useCallback(
    async (_orderNameArg, payload) => {
      const patch = payload?.patch;
      if (!patch) {
        showErrorToast(null, { defaultMessage: 'No changes to save.' });
        return;
      }
      try {
        const result = await dispatch(
          updatePurchaseOrderItems({ patch, form: payload?.form ?? null }),
        ).unwrap();
        // Detail + list row are patched in the slice; do not refetch the listview.
        const savedName = String(payload?.form?.name ?? patch.name ?? '').trim();
        setSelectedRow((previous) => {
          if (!previous || !payload?.form || !savedName) return previous;
          const previousName = String(
            previous.name ?? previous.orderNo ?? previous.id ?? '',
          ).trim();
          if (previousName !== savedName) return previous;
          return applyPurchaseOrderFormToListItem(previous, payload.form);
        });
        showSuccessToast('Order updated.');
        return result;
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update order.' });
        throw error;
      }
    },
    [dispatch],
  );

  const handleCancelOrderRequest = useCallback(() => {
    const orderName = selectedRow?.name ?? selectedRow?.orderNo ?? selectedRow?.id;
    if (!orderName) return;
    setOrderToCancel(orderName);
  }, [selectedRow]);

  const confirmCancelOrder = useCallback(
    async (orderName) => {
      const name = orderName ?? orderToCancel;
      if (!name) return;

      try {
        await dispatch(cancelPurchaseOrder(name)).unwrap();
        showSuccessToast('Order cancelled.');
        setOrderToCancel(null);
        setDetailDrawerOpen(false);
        setSelectedRow(null);
        await refetchList();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to cancel order.' });
      }
    },
    [dispatch, orderToCancel, refetchList],
  );

  const handleSubmitOrder = useCallback(
    async (form) => {
      const formPayload = {
        ...form,
        name: form.name || savedDraftBundle?.orderName || '',
      };
      try {
        await dispatch(savePurchaseOrder({ form: formPayload, mode: 'submit' })).unwrap();
        setSavedDraftBundle(null);
        showSuccessToast('Order submitted.');
        handleCreateOpenChange(false);
        await refetchList();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to submit order.' });
        throw error;
      }
    },
    [dispatch, savedDraftBundle, handleCreateOpenChange, refetchList],
  );

  const tableRows = groupBy ? [] : list.items;
  const tableIsInitialLoading = list.isLoading && list.items.length === 0;
  const tableError = list.error && list.items.length === 0 ? list.error : null;
  const emptyContext = useMemo(
    () =>
      resolveStocksEmptyContext({
        search: debouncedSearch,
        filters: {
          vendor: vendorFilter,
          category: categoryFilter,
          status: statusFilter,
        },
      }),
    [debouncedSearch, vendorFilter, categoryFilter, statusFilter],
  );

  return (
    <>
      <TabMenuHorizontal.Content
        value={STOCKS_TAB_IDS.ORDERS}
        className='flex min-h-0 flex-1 flex-col outline-none'
      >
        <div className='flex min-h-0 flex-1 flex-col gap-6 px-8 py-6'>
          <OrderStatCards
            total={statCounts.total}
            draft={statCounts.draft}
            partial={statCounts.partial}
            fullyReceived={statCounts.fullyReceived}
          />
          <OrdersToolbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            vendor={vendorFilter}
            onVendorChange={setVendorFilter}
            category={categoryFilter}
            onCategoryChange={setCategoryFilter}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            vendorOptions={vendorOptions}
            categoryOptions={categoryOptions}
            statusOptions={STOCKS_ORDER_STATUS_FILTER_OPTIONS}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            groupOrder={groupOrder}
            onGroupOrderChange={handleGroupOrderChange}
            onAdd={handleAdd}
            columnConfig={orderColumnConfigHook}
          />
          {list.error && list.items.length > 0 ? (
            <p className='paragraph-small text-error-base'>{list.error}</p>
          ) : null}

          <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto'>
            {groupBy ? (
              <div className='flex flex-col gap-4'>
                {groupedSections.length === 0 ? (
                  <OrdersTable
                    rows={[]}
                    onRowView={handleRowView}
                    columnConfig={orderColumnConfigHook.columns}
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
                    <OrdersTable
                      rows={section.rows}
                      onRowView={handleRowView}
                      embedded
                      columnConfig={orderColumnConfigHook.columns}
                      sorting={sorting}
                      onSortingChange={setSorting}
                      isLoading={list.isLoading}
                    />
                  </section>
                ))}
              </div>
            ) : (
              <OrdersTable
                rows={tableRows}
                onRowView={handleRowView}
                columnConfig={orderColumnConfigHook.columns}
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

      <CreateOrderModal
        open={createOpen}
        onOpenChange={handleCreateOpenChange}
        initialDraft={savedDraftBundle?.form}
        headerTitle={createHeader.title}
        headerDescription={createHeader.description}
        onSaveDraft={handleSaveDraft}
        onSubmitOrder={handleSubmitOrder}
      />

      {selectedRow ? (
        <ViewOrderDrawer
          open={detailDrawerOpen}
          onOpenChange={(next) => {
            setDetailDrawerOpen(next);
            if (!next) {
              setSelectedRow(null);
              setOrderToCancel(null);
            }
          }}
          order={selectedRow}
          onUpdateOrder={handleUpdateOrder}
          onCancelOrder={handleCancelOrderRequest}
          isCancelling={cancelState.isLoading}
        />
      ) : null}

      <DeleteConfirmModal
        isOpen={Boolean(orderToCancel)}
        onOpenChange={(open) => !open && setOrderToCancel(null)}
        title='Cancel order?'
        description='Are you sure you want to cancel this purchase order? This action cannot be undone.'
        item={orderToCancel}
        onConfirm={confirmCancelOrder}
        isLoading={cancelState.isLoading}
        confirmLabel='Cancel order'
        loadingLabel='Cancelling…'
      />
    </>
  );
};

export default Orders;
