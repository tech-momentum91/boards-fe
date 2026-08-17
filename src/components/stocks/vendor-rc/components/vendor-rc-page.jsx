import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiArrowDownSLine } from 'react-icons/ri';

import { STOCKS_FILTER_VALUE_ALL, STOCKS_TAB_IDS } from '@/components/stocks/constants';
import CreateVendorRcModal from '@/components/stocks/vendor-rc/components/create-vendor-rc-modal';
import ViewVendorRcDrawer from '@/components/stocks/vendor-rc/components/view-vendor-rc-drawer';
import VendorRcTable from '@/components/stocks/vendor-rc/components/vendor-rc-table';
import VendorRcToolbar from '@/components/stocks/vendor-rc/components/vendor-rc-toolbar';
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
  fetchVendorRcDetail,
  fetchVendorRcList,
  saveVendorRateContract,
  selectStockCategoriesState,
  selectVendorRcDetailState,
  selectVendorRcListState,
  selectVendorRcUpdateState,
  updateVendorRateContract,
} from '@/redux/stocksSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const SEARCH_DEBOUNCE_MS = 400;
const DEFAULT_VENDOR_RC_COLUMNS = [
  { id: 'vendor', label: 'Vendor', visible: true, enableHiding: true },
  { id: 'category', label: 'Category', visible: true, enableHiding: true },
  { id: 'center', label: 'Center', visible: true, enableHiding: true },
  { id: 'products', label: 'Products', visible: true, enableHiding: true },
  { id: 'startDate', label: 'Start Date', visible: true, enableHiding: true },
  { id: 'endDate', label: 'End Date', visible: true, enableHiding: true },
  { id: 'status', label: 'Status', visible: true, enableHiding: true },
];
const VENDOR_RC_SORT_FIELD_MAP = {
  vendor: 'supplier_name',
  category: 'custom_categories',
  startDate: 'from_date',
  endDate: 'to_date',
  status: 'docstatus',
};

const VendorRc = ({ isActive = false }) => {
  const dispatch = useDispatch();
  const list = useSelector(selectVendorRcListState);
  const detail = useSelector(selectVendorRcDetailState);
  const updateState = useSelector(selectVendorRcUpdateState);
  const stockCategoriesState = useSelector(selectStockCategoriesState);

  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState([STOCKS_FILTER_VALUE_ALL]);
  const [status, setStatus] = useState([STOCKS_FILTER_VALUE_ALL]);
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [sorting, setSorting] = useState(EMPTY_STOCKS_SORTING);
  const [columns, setColumns] = useState(DEFAULT_VENDOR_RC_COLUMNS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchValue]);

  const orderBy = useMemo(
    () => buildStocksOrderBy(sorting, VENDOR_RC_SORT_FIELD_MAP, 'modified desc'),
    [sorting],
  );

  const listFetchArgs = useMemo(
    () => ({
      keyword: debouncedSearch,
      categoryFilter: category,
      statusFilter: status,
      groupBy,
      groupOrder,
      orderBy,
    }),
    [debouncedSearch, category, status, groupBy, groupOrder, orderBy],
  );

  const refetchList = useCallback(() => {
    return dispatch(fetchVendorRcList({ ...listFetchArgs, reset: true }));
  }, [dispatch, listFetchArgs]);

  useEffect(() => {
    if (!isActive) return;
    refetchList();
  }, [isActive, refetchList]);

  const listReady = list.status === 'succeeded' && !list.isLoading && !list.isLoadingMore;

  const handleLoadMore = useCallback(() => {
    if (!isActive || !listReady || !list.hasMore) return;
    dispatch(fetchVendorRcList({ ...listFetchArgs, reset: false }));
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

  const handleSaveVendorRc = useCallback(
    async (formPayload) => {
      try {
        await dispatch(saveVendorRateContract(formPayload)).unwrap();
        showSuccessToast('Vendor rate contract added successfully.');
        await refetchList();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to save vendor rate contract.' });
        throw error;
      }
    },
    [dispatch, refetchList],
  );

  const handleOpenDetails = useCallback((row) => {
    setSelectedRow(row);
    setIsDetailsDrawerOpen(true);
  }, []);

  useEffect(() => {
    if (!isDetailsDrawerOpen || !selectedRow?.id) return;
    dispatch(fetchVendorRcDetail(selectedRow.id));
  }, [dispatch, isDetailsDrawerOpen, selectedRow?.id]);

  const handleUpdateVendor = useCallback(
    async (contractId, updates, files) => {
      try {
        await dispatch(updateVendorRateContract({ contractId, updates, files })).unwrap();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update vendor rate contract.' });
        throw error;
      }
    },
    [dispatch],
  );

  const handleDetailsDrawerOpenChange = useCallback(
    (nextOpen) => {
      setIsDetailsDrawerOpen(nextOpen);
      if (!nextOpen) {
        refetchList();
      }
    },
    [refetchList],
  );

  const handleUploadVendorRcContract = useCallback(
    async (files) => {
      const contractId = detail.row?.id;
      if (!contractId || !Array.isArray(files) || files.length === 0) return;
      try {
        await dispatch(updateVendorRateContract({ contractId, updates: {}, files })).unwrap();
        showSuccessToast('Contract document uploaded successfully.');
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to upload contract document.' });
        throw error;
      }
    },
    [dispatch, detail.row?.id],
  );

  const handleRemoveVendorRcContract = useCallback(async () => {
    const contractId = detail.row?.id;
    if (!contractId) return;
    try {
      await dispatch(
        updateVendorRateContract({ contractId, updates: { custom_document: null } }),
      ).unwrap();
      showSuccessToast('Contract document removed.');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to remove contract document.' });
      throw error;
    }
  }, [dispatch, detail.row?.id]);

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
        filters: { category, status },
      }),
    [debouncedSearch, category, status],
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
        value={STOCKS_TAB_IDS.VENDOR_RC}
        className='min-h-0 flex-1 outline-none'
      >
        <div className='flex min-h-0 flex-1 flex-col gap-5 px-8 pb-10 pt-6'>
          <VendorRcToolbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            category={category}
            onCategoryChange={setCategory}
            status={status}
            onStatusChange={setStatus}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            groupOrder={groupOrder}
            onGroupOrderChange={setGroupOrder}
            onAdd={() => setIsAddModalOpen(true)}
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
                  <VendorRcTable
                    rows={[]}
                    columnConfig={columns}
                    onRowClick={handleOpenDetails}
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
                    <VendorRcTable
                      rows={section.rows}
                      columnConfig={columns}
                      onRowClick={handleOpenDetails}
                      sorting={sorting}
                      onSortingChange={setSorting}
                      isLoading={list.isLoading}
                    />
                  </section>
                ))}
              </div>
            ) : (
              <VendorRcTable
                rows={list.items}
                columnConfig={columns}
                onRowClick={handleOpenDetails}
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

      <CreateVendorRcModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubmit={handleSaveVendorRc}
        categoryOptions={categorySelectOptions}
      />
      <ViewVendorRcDrawer
        open={isDetailsDrawerOpen}
        onOpenChange={handleDetailsDrawerOpenChange}
        row={detail.row ?? selectedRow}
        isLoading={detail.isLoading}
        error={detail.error}
        onUpdateVendor={handleUpdateVendor}
        onUploadContractDocument={handleUploadVendorRcContract}
        onRemoveContractDocument={handleRemoveVendorRcContract}
        isUploadingContractDocument={updateState.isLoading}
      />
    </>
  );
};

export default VendorRc;
