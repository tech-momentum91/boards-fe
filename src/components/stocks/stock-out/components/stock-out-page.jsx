import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  STOCKS_FILTER_VALUE_ALL,
  STOCKS_STOCK_OUT_STATUS,
  STOCKS_STOCK_OUT_STATUS_FILTER_OPTIONS,
  STOCKS_TAB_IDS,
} from '@/components/stocks/constants';
import { STOCK_OUT_TRANSFER_STATUS } from '@/components/stocks/stock-out/constants';
import CreateStockOutModal from '@/components/stocks/stock-out/components/create-stock-out-modal';
import StockOutTable from '@/components/stocks/stock-out/components/stock-out-table';
import StockOutToolbar from '@/components/stocks/stock-out/components/stock-out-toolbar';
import ViewStockOutDrawer from '@/components/stocks/stock-out/components/view-stock-out-drawer';
import {
  buildStocksOrderBy,
  buildToolbarCenterOptions,
  EMPTY_STOCKS_SORTING,
  mergeToolbarFilterOptions,
  resolveStocksEmptyContext,
} from '@/components/stocks/stocks-helper';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import {
  fetchStockOutDetail,
  fetchStockOutList,
  fetchVendorRcCenters,
  saveStockOut,
  selectStockOutListState,
  selectVendorRcCentersState,
} from '@/redux/stocksSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { RiArrowDownSLine } from 'react-icons/ri';

const SEARCH_DEBOUNCE_MS = 400;
const STOCK_OUT_SORT_FIELD_MAP = {
  center: 'from_warehouse',
  date: 'posting_date',
  status: 'docstatus',
};

const STOCK_OUT_DEPARTMENT_FILTER_OPTIONS = [
  { value: STOCKS_FILTER_VALUE_ALL, label: 'All Departments' },
];

const DEFAULT_STOCK_OUT_COLUMNS = [
  { id: 'center', label: 'Center', visible: true, enableHiding: false },
  { id: 'department', label: 'Department', visible: true, enableHiding: true },
  { id: 'date', label: 'Date', visible: true, enableHiding: true },
  { id: 'category', label: 'Category', visible: true, enableHiding: true },
  { id: 'items', label: 'Items', visible: true, enableHiding: true },
  { id: 'issuedQty', label: 'Issued qty', visible: true, enableHiding: true },
  { id: 'status', label: 'Status', visible: true, enableHiding: true },
];

function cloneStockOutFormState(form) {
  if (!form || typeof form !== 'object') return null;
  return {
    ...form,
    lineItems: Array.isArray(form.lineItems) ? form.lineItems.map((row) => ({ ...row })) : [],
  };
}

const StockOut = ({ isActive = false }) => {
  const dispatch = useDispatch();
  const list = useSelector(selectStockOutListState);
  const centersState = useSelector(selectVendorRcCentersState);

  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [centerFilter, setCenterFilter] = useState([STOCKS_FILTER_VALUE_ALL]);
  const [departmentFilter, setDepartmentFilter] = useState([STOCKS_FILTER_VALUE_ALL]);
  const [statusFilter, setStatusFilter] = useState([STOCKS_FILTER_VALUE_ALL]);
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [sorting, setSorting] = useState(EMPTY_STOCKS_SORTING);
  const [columns, setColumns] = useState(DEFAULT_STOCK_OUT_COLUMNS);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [savedDraftBundle, setSavedDraftBundle] = useState(null);
  const [createModalCopy, setCreateModalCopy] = useState(null);
  const [departmentOptions, setDepartmentOptions] = useState(STOCK_OUT_DEPARTMENT_FILTER_OPTIONS);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchValue]);

  const orderBy = useMemo(
    () => buildStocksOrderBy(sorting, STOCK_OUT_SORT_FIELD_MAP, 'modified desc'),
    [sorting],
  );

  const listFetchArgs = useMemo(
    () => ({
      keyword: debouncedSearch,
      centerFilter,
      departmentFilter,
      statusFilter,
      groupBy,
      groupOrder,
      orderBy,
    }),
    [debouncedSearch, centerFilter, departmentFilter, statusFilter, groupBy, groupOrder, orderBy],
  );

  const refetchList = useCallback(() => {
    return dispatch(fetchStockOutList({ ...listFetchArgs, reset: true }));
  }, [dispatch, listFetchArgs]);

  useEffect(() => {
    if (!isActive) return;
    refetchList();
  }, [isActive, refetchList]);

  const listReady = list.status === 'succeeded' && !list.isLoading && !list.isLoadingMore;

  const handleLoadMore = useCallback(() => {
    if (!isActive || !listReady || !list.hasMore) return;
    dispatch(fetchStockOutList({ ...listFetchArgs, reset: false }));
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
      showErrorToast(list.error, { defaultMessage: 'Failed to load outward entries.' });
    }
  }, [list.status, list.error]);

  const centerOptions = useMemo(
    () => buildToolbarCenterOptions(centersState.items, 'All Centers'),
    [centersState.items],
  );

  useEffect(() => {
    setDepartmentOptions((previous) =>
      mergeToolbarFilterOptions(previous, list.items, 'department', 'All Departments'),
    );
  }, [list.items]);

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

  const handleModalOpenChange = useCallback((next) => {
    setModalOpen(next);
    if (!next) {
      setSavedDraftBundle(null);
      setCreateModalCopy(null);
    }
  }, []);

  const handleSaveDraftStockOut = useCallback(
    async (form) => {
      const formPayload = {
        ...form,
        name: form.name || savedDraftBundle?.entryName || '',
      };
      try {
        const result = await dispatch(saveStockOut({ form: formPayload, mode: 'draft' })).unwrap();
        const nextForm = {
          ...formPayload,
          ...result.detail,
          name: result.id || formPayload.name,
          status: result.status ?? STOCKS_STOCK_OUT_STATUS.DRAFT,
          files: [],
        };
        setSavedDraftBundle({
          form: cloneStockOutFormState(nextForm),
          entryName: result.id || nextForm.name,
        });
        showSuccessToast('Stock out saved as draft.');
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

  const handleSubmitStockOut = useCallback(
    async (form) => {
      const entryName = String(form.name || savedDraftBundle?.entryName || '').trim();
      const formPayload = {
        ...form,
        name: entryName,
      };
      const useSubmitOnly = Boolean(entryName);
      try {
        const result = useSubmitOnly
          ? await dispatch(
              saveStockOut({ form: { name: entryName }, mode: 'submit-only' }),
            ).unwrap()
          : await dispatch(saveStockOut({ form: formPayload, mode: 'submit' })).unwrap();
        setSavedDraftBundle(null);
        const statusLabel = result?.status ?? '';
        const successMessage =
          statusLabel === STOCK_OUT_TRANSFER_STATUS.IN_TRANSIT
            ? 'Transfer sent and stock is in transit.'
            : statusLabel === STOCK_OUT_TRANSFER_STATUS.TRANSFERRED
              ? 'Transfer fully received at destination.'
              : statusLabel === STOCKS_STOCK_OUT_STATUS.ISSUED
                ? 'Stock out issued successfully.'
                : 'Stock out submitted.';
        showSuccessToast(successMessage);
        handleModalOpenChange(false);
        await refetchList();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to submit stock out entry.' });
        throw error;
      }
    },
    [dispatch, savedDraftBundle, handleModalOpenChange, refetchList],
  );

  const openDraftInModal = useCallback((entryName, form) => {
    setSavedDraftBundle({
      form: cloneStockOutFormState({ ...form, status: STOCKS_STOCK_OUT_STATUS.DRAFT }),
      entryName: form.name || entryName,
    });
    setCreateModalCopy({
      title: 'Edit out entry',
      description: `Draft ${form.name || entryName}. Review the details, then save as draft or submit to issue.`,
    });
    setModalOpen(true);
  }, []);

  const handleRowView = useCallback(
    async (row) => {
      const entryName = row.name ?? row.id;
      if (row.status === STOCKS_STOCK_OUT_STATUS.DRAFT) {
        try {
          const { form } = await dispatch(fetchStockOutDetail(entryName)).unwrap();
          openDraftInModal(entryName, form);
        } catch (error) {
          showErrorToast(error, { defaultMessage: 'Failed to load draft outward entry.' });
        }
        return;
      }
      try {
        const { form } = await dispatch(fetchStockOutDetail(entryName)).unwrap();
        setSelectedRow({
          ...row,
          detail: cloneStockOutFormState({ ...form, status: row.status }),
        });
        setDetailOpen(true);
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to load outward entry.' });
      }
    },
    [dispatch, openDraftInModal],
  );

  const handleAddStockOut = useCallback(() => {
    setSavedDraftBundle(null);
    setCreateModalCopy(null);
    setModalOpen(true);
  }, []);

  const tableRows = groupBy ? [] : list.items;
  const tableIsInitialLoading = list.isLoading && list.items.length === 0;
  const tableError = list.error && list.items.length === 0 ? list.error : null;
  const emptyContext = useMemo(
    () =>
      resolveStocksEmptyContext({
        search: debouncedSearch,
        filters: {
          center: centerFilter,
          department: departmentFilter,
          status: statusFilter,
        },
      }),
    [debouncedSearch, centerFilter, departmentFilter, statusFilter],
  );

  return (
    <>
      <TabMenuHorizontal.Content
        value={STOCKS_TAB_IDS.STOCK_OUT}
        className='flex min-h-0 flex-1 flex-col outline-none'
      >
        <div className='flex min-h-0 flex-1 flex-col gap-6 px-8 py-6'>
          <StockOutToolbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            center={centerFilter}
            onCenterChange={setCenterFilter}
            department={departmentFilter}
            onDepartmentChange={setDepartmentFilter}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            centerOptions={centerOptions}
            departmentOptions={departmentOptions}
            statusOptions={STOCKS_STOCK_OUT_STATUS_FILTER_OPTIONS}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            groupOrder={groupOrder}
            onGroupOrderChange={handleGroupOrderChange}
            onAdd={handleAddStockOut}
            columnConfig={columnConfig}
          />

          {list.error && list.items.length > 0 ? (
            <p className='paragraph-small text-error-base'>{list.error}</p>
          ) : null}

          <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto'>
            {groupBy ? (
              <div className='flex flex-col gap-4'>
                {groupedSections.length === 0 ? (
                  <StockOutTable
                    rows={[]}
                    columnConfig={columns}
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
                    <StockOutTable
                      rows={section.rows}
                      embedded
                      columnConfig={columns}
                      onRowView={handleRowView}
                      sorting={sorting}
                      onSortingChange={setSorting}
                      isLoading={list.isLoading}
                    />
                  </section>
                ))}
              </div>
            ) : (
              <StockOutTable
                rows={tableRows}
                columnConfig={columns}
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

      <CreateStockOutModal
        open={modalOpen}
        onOpenChange={handleModalOpenChange}
        initialDraft={savedDraftBundle}
        onSubmit={handleSubmitStockOut}
        onSaveDraft={handleSaveDraftStockOut}
        headerTitle={createModalCopy?.title ?? 'Add New Out Entry'}
        headerDescription={
          createModalCopy?.description ?? 'Enter below details to create new out entry.'
        }
      />

      <ViewStockOutDrawer
        open={detailOpen}
        onOpenChange={setDetailOpen}
        row={selectedRow}
        onNotesUpdated={(entryName, notes) => {
          setSelectedRow((previous) => {
            if (!previous || String(previous.id ?? previous.name) !== String(entryName)) {
              return previous;
            }
            return {
              ...previous,
              detail: previous.detail ? { ...previous.detail, notes } : previous.detail,
            };
          });
        }}
      />
    </>
  );
};

export default StockOut;
