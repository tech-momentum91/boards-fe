import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

import { useAumListLoadMore } from '@/components/aum/aum-list-pagination';
import AumAssetInTable from '@/components/aum/asset-in/asset-in-table';
import AumAssetInToolbar from '@/components/aum/asset-in/asset-in-toolbar';
import AddAssetInModal from '@/components/aum/asset-in/add-asset-in-modal';
import AumGroupedListView from '@/components/aum/shared/aum-grouped-list-view';
import { buildAumGroupedSections } from '@/components/aum/shared/aum-list-group-by';
import { AUM_FILTER_VALUE_ALL, AUM_TAB_IDS } from '@/components/aum/constants';
import { useAumAssetInListColumnConfig } from '@/components/aum/use-aum-column-config';
import { useAumSearch } from '@/components/aum/use-aum-search';
import {
  exportAssetInBarcodes,
  fetchAssetInList,
  saveAssetInDraft,
  selectAssetInList,
  selectAssetInMutations,
} from '@/redux/aumAssetInSlice';
import { fetchAumOptions, selectAumOptions } from '@/redux/aumOptionsSlice';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const AumAssetInPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const listState = useSelector(selectAssetInList);
  const { items: transactions, status: listStatus } = listState;
  const { centers: centerOptions, status: optionsStatus } = useSelector(selectAumOptions);
  const { exportBarcodesStatus } = useSelector(selectAssetInMutations);

  const { searchValue, setSearchValue, debouncedSearch } = useAumSearch();
  const [centerFilter, setCenterFilter] = useState(AUM_FILTER_VALUE_ALL);
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const isExportingBarcodes = exportBarcodesStatus === 'loading';

  const isLoading = listStatus === 'loading';

  const listFetchParams = useMemo(
    () => ({
      search: debouncedSearch,
      center: centerFilter === AUM_FILTER_VALUE_ALL ? '' : centerFilter,
    }),
    [debouncedSearch, centerFilter],
  );

  useEffect(() => {
    const controller = dispatch(fetchAssetInList(listFetchParams));
    return () => {
      controller.abort?.();
    };
  }, [dispatch, listFetchParams]);

  const { renderLoadMoreFooter } = useAumListLoadMore({
    dispatch,
    fetchThunk: fetchAssetInList,
    listState,
    fetchParams: listFetchParams,
  });

  useEffect(() => {
    dispatch(fetchAumOptions());
  }, [dispatch]);

  useEffect(() => {
    if (listStatus === 'failed') {
      showErrorToast('Could not load asset in transactions.');
    }
  }, [listStatus]);

  const columnConfigHook = useAumAssetInListColumnConfig();

  const groupedSections = useMemo(
    () => buildAumGroupedSections(transactions, groupBy, groupOrder),
    [transactions, groupBy, groupOrder],
  );

  const handleGroupOrderChange = useCallback((next) => {
    setGroupOrder((previous) => {
      const resolved = typeof next === 'function' ? next(previous) : next;
      return resolved === 'desc' ? 'desc' : 'asc';
    });
  }, []);

  const handleExport = useCallback(async () => {
    const completedAssetIns = transactions
      .filter((row) => row.status === 'Completed')
      .map((row) => row.id || row.serialNumber)
      .filter(Boolean);

    if (completedAssetIns.length === 0) {
      showErrorToast('No completed Asset In entries to export barcodes for.');
      return;
    }

    try {
      const filename = await dispatch(exportAssetInBarcodes(completedAssetIns)).unwrap();
      showSuccessToast(`Downloaded ${filename}`);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to export barcode labels.' });
    }
  }, [dispatch, transactions]);

  const handleAdd = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  const handleRowClick = useCallback(
    (row) => {
      navigate(`/aum/in/${row.id}`);
    },
    [navigate],
  );

  const handleSaveDraft = useCallback(
    async (data) => {
      setIsSavingDraft(true);
      try {
        const result = await dispatch(
          saveAssetInDraft({
            center: data.center,
            space: data.area,
            floor: data.floorLabel || data.floor,
          }),
        ).unwrap();

        setIsAddModalOpen(false);
        showSuccessToast('Asset In draft created');
        navigate(`/aum/in/${result.name}`);
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Could not create Asset In draft.' });
      } finally {
        setIsSavingDraft(false);
      }
    },
    [dispatch, navigate],
  );

  return (
    <TabMenuHorizontal.Content value={AUM_TAB_IDS.IN} className='min-h-0 flex-1 outline-none'>
      <div className='flex min-h-0 flex-1 flex-col gap-5 px-8 pb-10 pt-6'>
        <AumAssetInToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          centerFilter={centerFilter}
          onCenterFilterChange={setCenterFilter}
          centerOptions={optionsStatus === 'succeeded' ? centerOptions : []}
          onExport={handleExport}
          isExporting={isExportingBarcodes}
          onAdd={handleAdd}
          columnConfig={columnConfigHook}
          pinnedColumnId={columnConfigHook.pinnedColumnId}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          groupOrder={groupOrder}
          onGroupOrderChange={handleGroupOrderChange}
        />

        {isLoading ? (
          <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-10 text-center text-label-sm text-text-sub-500'>
            Loading asset in transactions...
          </div>
        ) : groupBy ? (
          <>
            <AumGroupedListView
              sections={groupedSections}
              TableComponent={AumAssetInTable}
              columnConfig={columnConfigHook.columns}
              onRowClick={handleRowClick}
              emptyTable={
                <AumAssetInTable
                  rows={[]}
                  columnConfig={columnConfigHook.columns}
                  onRowClick={handleRowClick}
                />
              }
            />
            {renderLoadMoreFooter()}
          </>
        ) : (
          <>
            <AumAssetInTable
              rows={transactions}
              columnConfig={columnConfigHook.columns}
              onRowClick={handleRowClick}
            />
            {renderLoadMoreFooter()}
          </>
        )}
      </div>

      <AddAssetInModal
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSave={handleSaveDraft}
        isSaving={isSavingDraft}
      />
    </TabMenuHorizontal.Content>
  );
};

export default AumAssetInPage;
