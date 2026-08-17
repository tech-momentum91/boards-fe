import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  STOCKS_FILTER_VALUE_ALL,
  STOCKS_STOCK_IN_DEFAULT_VENDOR_FILTER_OPTIONS,
  STOCKS_STOCK_IN_SOURCE,
  STOCKS_STOCK_IN_STATUS,
  STOCKS_STOCK_IN_STATUS_FILTER_OPTIONS,
  STOCKS_TAB_IDS,
} from '@/components/stocks/constants';
import { buildStockInPendingTransferOption } from '@/components/stocks/stocks-api-helpers';
import { resolveStockInReceivingCenterId } from '@/components/stocks/stock-in/helpers/list';
import CreateStockInModal from '@/components/stocks/stock-in/components/create-stock-in-modal';
import StockInTable, {
  useStocksStockInColumnConfig,
} from '@/components/stocks/stock-in/components/stock-in-table';
import StockInToolbar from '@/components/stocks/stock-in/components/stock-in-toolbar';
import ViewStockInDrawer from '@/components/stocks/stock-in/components/view-stock-in-drawer';
import { cloneStockInFormState } from '@/components/stocks/stock-in/helpers/shared';
import {
  buildStocksOrderBy,
  buildToolbarCenterOptions,
  EMPTY_STOCKS_SORTING,
  mergeToolbarFilterOptions,
  resolveStocksEmptyContext,
} from '@/components/stocks/stocks-helper';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import {
  fetchStockInDetail,
  fetchStockInList,
  fetchVendorRcCenters,
  saveStockIn,
  selectStockInListState,
  selectVendorRcCentersState,
} from '@/redux/stocksSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { RiArrowDownSLine } from 'react-icons/ri';

const SEARCH_DEBOUNCE_MS = 400;
const STOCK_IN_SORT_FIELD_MAP = {
  center: 'set_warehouse',
  vendor: 'supplier_name',
  date: 'posting_date',
  source: 'custom_source_type',
  totalValue: 'grand_total',
  status: 'docstatus',
};

const DEFAULT_CREATE_MODAL_COPY = {
  title: 'Add New In Entry',
  description: 'Enter below details to create new in entry.',
};

const DEFAULT_STOCK_IN_COLUMNS = [
  { id: 'center', label: 'Center', visible: true, enableHiding: false },
  { id: 'vendor', label: 'Vendor', visible: true, enableHiding: true },
  { id: 'date', label: 'Date', visible: true, enableHiding: true },
  { id: 'source', label: 'Source', visible: true, enableHiding: true },
  { id: 'items', label: 'Items', visible: true, enableHiding: true },
  { id: 'acceptedQty', label: 'Accepted Qty', visible: true, enableHiding: true },
  { id: 'totalValue', label: 'Total Value', visible: true, enableHiding: true },
  { id: 'status', label: 'Status', visible: true, enableHiding: true },
];

const StockIn = ({ isActive = false }) => {
  const dispatch = useDispatch();
  const list = useSelector(selectStockInListState);
  const centersState = useSelector(selectVendorRcCentersState);

  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [centerFilter, setCenterFilter] = useState([STOCKS_FILTER_VALUE_ALL]);
  const [vendorFilter, setVendorFilter] = useState([STOCKS_FILTER_VALUE_ALL]);
  const [statusFilter, setStatusFilter] = useState([STOCKS_FILTER_VALUE_ALL]);
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [sorting, setSorting] = useState(EMPTY_STOCKS_SORTING);
  const stockInColumnConfig = useStocksStockInColumnConfig();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [savedDraftBundle, setSavedDraftBundle] = useState(null);
  const [transferReceiveSeed, setTransferReceiveSeed] = useState(null);
  const [createModalCopy, setCreateModalCopy] = useState(null);
  const [vendorOptions, setVendorOptions] = useState(STOCKS_STOCK_IN_DEFAULT_VENDOR_FILTER_OPTIONS);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchValue]);

  const orderBy = useMemo(
    () => buildStocksOrderBy(sorting, STOCK_IN_SORT_FIELD_MAP, 'modified desc'),
    [sorting],
  );

  const listFetchArgs = useMemo(
    () => ({
      keyword: debouncedSearch,
      centerFilter,
      vendorFilter,
      statusFilter,
      groupBy,
      groupOrder,
      orderBy,
    }),
    [debouncedSearch, centerFilter, vendorFilter, statusFilter, groupBy, groupOrder, orderBy],
  );

  const refetchList = useCallback(() => {
    return dispatch(fetchStockInList({ ...listFetchArgs, reset: true }));
  }, [dispatch, listFetchArgs]);

  useEffect(() => {
    if (!isActive) return;
    refetchList();
  }, [isActive, refetchList]);

  const listReady = list.status === 'succeeded' && !list.isLoading && !list.isLoadingMore;

  const handleLoadMore = useCallback(() => {
    if (!isActive || !listReady || !list.hasMore) return;
    dispatch(fetchStockInList({ ...listFetchArgs, reset: false }));
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
    if (list.status === 'failed' && list.error) {
      showErrorToast(list.error, { defaultMessage: 'Failed to load inward entries.' });
    }
  }, [list.status, list.error]);

  const centerOptions = useMemo(
    () => buildToolbarCenterOptions(centersState.items, 'All Centers'),
    [centersState.items],
  );

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

  const handleModalOpenChange = useCallback((next) => {
    setModalOpen(next);
    if (!next) {
      setSavedDraftBundle(null);
      setTransferReceiveSeed(null);
      setCreateModalCopy(null);
    }
  }, []);

  const handleAddStockIn = useCallback(() => {
    setSavedDraftBundle(null);
    setTransferReceiveSeed(null);
    setCreateModalCopy(null);
    setModalOpen(true);
  }, []);

  const handleSaveDraftStockIn = useCallback(
    async (form) => {
      const formPayload = {
        ...form,
        name: form.name || savedDraftBundle?.entryName || '',
      };
      try {
        const result = await dispatch(saveStockIn({ form: formPayload, mode: 'draft' })).unwrap();
        const nextForm = {
          ...formPayload,
          ...result.detail,
          name: result.id || formPayload.name,
          files: [],
          documents: [],
        };
        setSavedDraftBundle({
          form: cloneStockInFormState(nextForm),
          entryName: result.id || nextForm.name,
        });
        showSuccessToast('Inward entry saved as draft.');
        handleModalOpenChange(false);
        await refetchList();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to save draft.' });
        throw error;
      }
    },
    [dispatch, savedDraftBundle, handleModalOpenChange, refetchList],
  );

  const handleGroupOrderChange = useCallback((next) => {
    setGroupOrder((previous) => {
      const resolved = typeof next === 'function' ? next(previous) : next;
      return resolved === 'desc' ? 'desc' : 'asc';
    });
  }, []);

  const handleSubmitStockIn = useCallback(
    async (form) => {
      const formPayload = {
        ...form,
        name: form.name || savedDraftBundle?.entryName || '',
      };
      try {
        const result = await dispatch(saveStockIn({ form: formPayload, mode: 'submit' })).unwrap();
        setSavedDraftBundle(null);
        const statusLabel = result?.status ?? '';
        showSuccessToast(
          statusLabel === STOCKS_STOCK_IN_STATUS.RECEIVED
            ? 'Transfer received successfully.'
            : statusLabel === STOCKS_STOCK_IN_STATUS.COMPLETED
              ? 'Inward entry completed.'
              : statusLabel === STOCKS_STOCK_IN_STATUS.PARTIALLY_RECEIVED
                ? 'Transfer partially received.'
                : statusLabel === STOCKS_STOCK_IN_STATUS.PARTIALLY_COMPLETED
                  ? 'Inward entry saved as partially completed.'
                  : 'Inward entry submitted.',
        );
        handleModalOpenChange(false);
        await refetchList();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to submit inward entry.' });
        throw error;
      }
    },
    [dispatch, savedDraftBundle, handleModalOpenChange, refetchList],
  );

  const openTransferReceiveModal = useCallback(
    (row) => {
      const receivingCenterId = resolveStockInReceivingCenterId(
        row,
        centerFilter,
        centersState.items,
      );
      if (!receivingCenterId) {
        showErrorToast(null, {
          defaultMessage: 'Select a single center filter to receive this transfer.',
        });
        return;
      }
      const sourceLabel = row.sourceCenterName || row.vendor || row.sourceCenter || '';
      const outgoingStockEntry = row.outgoingStockEntry || row.id;
      const pendingTransferOption = buildStockInPendingTransferOption({
        id: outgoingStockEntry,
        sourceCenterName: sourceLabel,
        sourceCenter: row.sourceCenter ?? '',
        date: row.dateIso || row.date,
        itemsCount: row.items,
        pendingQty: row.pendingQty,
      });
      setSavedDraftBundle(null);
      setTransferReceiveSeed(
        cloneStockInFormState({
          center: receivingCenterId,
          sourceType: STOCKS_STOCK_IN_SOURCE.TRANSFER_IN,
          outgoingStockEntry,
          sourceCenter: row.sourceCenter ?? '',
          sourceCenterLabel: sourceLabel,
          vendor: row.sourceCenter ?? '',
          vendorLabel: sourceLabel,
          pendingTransferOption,
          lineItems: [],
        }),
      );
      setCreateModalCopy({
        title: 'Receive transfer',
        description: sourceLabel
          ? `Incoming transfer from ${sourceLabel}. Enter accepted quantities and submit.`
          : 'Enter accepted quantities and submit to receive this transfer.',
      });
      setModalOpen(true);
    },
    [centerFilter, centersState.items],
  );

  const handleRowView = useCallback(
    async (row) => {
      if (row.canReceive || row.isTransferRequest) {
        openTransferReceiveModal(row);
        return;
      }
      if (row.status === STOCKS_STOCK_IN_STATUS.DRAFT) {
        const entryName = row.name ?? row.id;
        try {
          const { form } = await dispatch(fetchStockInDetail(entryName)).unwrap();
          setTransferReceiveSeed(null);
          setSavedDraftBundle({
            form: cloneStockInFormState({ ...form, status: row.status ?? '' }),
            entryName: form.name || entryName,
          });
          setCreateModalCopy({
            title: 'Edit inward entry',
            description: `Draft ${form.name || entryName}. Update the form, then save as draft or save to submit.`,
          });
          setModalOpen(true);
        } catch (error) {
          showErrorToast(error, { defaultMessage: 'Failed to load draft inward entry.' });
        }
        return;
      }
      if (row.status === STOCKS_STOCK_IN_STATUS.PARTIALLY_RECEIVED && row.outgoingStockEntry) {
        openTransferReceiveModal(row);
        return;
      }
      setSelectedRow(row);
      setDetailOpen(true);
    },
    [dispatch, openTransferReceiveModal],
  );

  const tableRows = groupBy ? [] : list.items;
  const tableIsInitialLoading = list.isLoading && list.items.length === 0;
  const tableError = list.error && list.items.length === 0 ? list.error : null;
  const emptyContext = useMemo(
    () =>
      resolveStocksEmptyContext({
        search: debouncedSearch,
        filters: {
          center: centerFilter,
          vendor: vendorFilter,
          status: statusFilter,
        },
      }),
    [debouncedSearch, centerFilter, vendorFilter, statusFilter],
  );

  return (
    <>
      <TabMenuHorizontal.Content
        value={STOCKS_TAB_IDS.STOCK_IN}
        className='flex min-h-0 flex-1 flex-col outline-none'
      >
        <div className='flex min-h-0 flex-1 flex-col gap-6 px-8 py-6'>
          <StockInToolbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            center={centerFilter}
            onCenterChange={setCenterFilter}
            vendor={vendorFilter}
            onVendorChange={setVendorFilter}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            centerOptions={centerOptions}
            vendorOptions={vendorOptions}
            statusOptions={STOCKS_STOCK_IN_STATUS_FILTER_OPTIONS}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            groupOrder={groupOrder}
            onGroupOrderChange={handleGroupOrderChange}
            onAdd={handleAddStockIn}
            columnConfig={stockInColumnConfig}
          />

          {list.error && list.items.length > 0 ? (
            <p className='paragraph-small text-error-base'>{list.error}</p>
          ) : null}

          <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto'>
            {groupBy ? (
              <div className='flex flex-col gap-4'>
                {groupedSections.length === 0 ? (
                  <StockInTable
                    rows={[]}
                    columnConfig={stockInColumnConfig.columns}
                    onRowView={handleRowView}
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
                    <StockInTable
                      rows={section.rows}
                      embedded
                      columnConfig={stockInColumnConfig.columns}
                      onRowView={handleRowView}
                      sorting={sorting}
                      onSortingChange={setSorting}
                      isLoading={list.isLoading}
                    />
                  </section>
                ))}
              </div>
            ) : (
              <StockInTable
                rows={tableRows}
                columnConfig={stockInColumnConfig.columns}
                onRowView={handleRowView}
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

      <CreateStockInModal
        open={modalOpen}
        onOpenChange={handleModalOpenChange}
        initialDraft={savedDraftBundle?.form ?? transferReceiveSeed}
        headerTitle={createHeader.title}
        headerDescription={createHeader.description}
        onSubmit={handleSubmitStockIn}
        onSaveDraft={handleSaveDraftStockIn}
      />

      {selectedRow &&
      selectedRow.status !== STOCKS_STOCK_IN_STATUS.DRAFT &&
      !selectedRow.isTransferRequest ? (
        <ViewStockInDrawer
          open={detailOpen}
          onOpenChange={(next) => {
            setDetailOpen(next);
            if (!next) setSelectedRow(null);
          }}
          row={selectedRow}
        />
      ) : null}
    </>
  );
};

export default StockIn;
