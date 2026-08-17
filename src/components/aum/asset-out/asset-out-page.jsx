import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

import AddAssetOutModal from '@/components/aum/asset-out/add-asset-out-modal';
import AssetOutTable from '@/components/aum/asset-out/asset-out-table';
import AssetOutToolbar from '@/components/aum/asset-out/asset-out-toolbar';
import AumGroupedListView from '@/components/aum/shared/aum-grouped-list-view';
import { buildAumGroupedSections } from '@/components/aum/shared/aum-list-group-by';
import { useAumListLoadMore } from '@/components/aum/aum-list-pagination';
import { AUM_FILTER_VALUE_ALL, AUM_TAB_IDS } from '@/components/aum/constants';
import { useAumAssetOutListColumnConfig } from '@/components/aum/use-aum-column-config';
import { useAumSearch } from '@/components/aum/use-aum-search';
import { fetchAumOptions, selectAumOptions } from '@/redux/aumOptionsSlice';
import {
  createAssetOutDraft,
  fetchAssetOutList,
  selectAssetOutList,
} from '@/redux/aumAssetOutSlice';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const AumAssetOutPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const listState = useSelector(selectAssetOutList);
  const { items: transactions, status: listStatus } = listState;
  const { centers: centerOptions } = useSelector(selectAumOptions);

  const { searchValue, setSearchValue, debouncedSearch } = useAumSearch();
  const [centerFilter, setCenterFilter] = useState(AUM_FILTER_VALUE_ALL);
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isLoading = listStatus === 'loading';

  const listFetchParams = useMemo(
    () => ({
      search: debouncedSearch,
      center: centerFilter === AUM_FILTER_VALUE_ALL ? '' : centerFilter,
    }),
    [debouncedSearch, centerFilter],
  );

  useEffect(() => {
    dispatch(fetchAumOptions());
  }, [dispatch]);

  useEffect(() => {
    const controller = dispatch(fetchAssetOutList(listFetchParams));
    return () => {
      controller.abort?.();
    };
  }, [dispatch, listFetchParams]);

  const { renderLoadMoreFooter } = useAumListLoadMore({
    dispatch,
    fetchThunk: fetchAssetOutList,
    listState,
    fetchParams: listFetchParams,
  });

  useEffect(() => {
    if (listStatus === 'failed') {
      showErrorToast('Could not load Asset Out list.');
    }
  }, [listStatus]);

  const columnConfigHook = useAumAssetOutListColumnConfig();

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

  const handleRowClick = useCallback(
    (row) => {
      navigate(`/aum/out/${row.id}`);
    },
    [navigate],
  );

  const handleSave = useCallback(
    async (data) => {
      setIsSaving(true);
      try {
        const transaction = await dispatch(
          createAssetOutDraft({ payload: data, status: 'Draft' }),
        ).unwrap();
        setIsAddModalOpen(false);
        showSuccessToast('Asset Out draft created');
        dispatch(fetchAssetOutList(listFetchParams));
        navigate(`/aum/out/${transaction.id}`);
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Could not create Asset Out draft.' });
      } finally {
        setIsSaving(false);
      }
    },
    [dispatch, listFetchParams, navigate],
  );

  return (
    <TabMenuHorizontal.Content value={AUM_TAB_IDS.OUT} className='min-h-0 flex-1 outline-none'>
      <div className='flex min-h-0 flex-1 flex-col gap-5 px-8 pb-10 pt-6'>
        <AssetOutToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          centerFilter={centerFilter}
          onCenterFilterChange={setCenterFilter}
          centerOptions={centerOptions}
          onAdd={() => setIsAddModalOpen(true)}
          columnConfig={columnConfigHook}
          pinnedColumnId={columnConfigHook.pinnedColumnId}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          groupOrder={groupOrder}
          onGroupOrderChange={handleGroupOrderChange}
        />

        {isLoading ? (
          <div className='flex flex-1 items-center justify-center py-16 text-label-sm text-text-sub-500'>
            Loading asset out transactions...
          </div>
        ) : groupBy ? (
          <>
            <AumGroupedListView
              sections={groupedSections}
              TableComponent={AssetOutTable}
              columnConfig={columnConfigHook.columns}
              onRowClick={handleRowClick}
              emptyTable={
                <AssetOutTable
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
            <AssetOutTable
              rows={transactions}
              columnConfig={columnConfigHook.columns}
              onRowClick={handleRowClick}
            />
            {renderLoadMoreFooter()}
          </>
        )}
      </div>

      <AddAssetOutModal
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </TabMenuHorizontal.Content>
  );
};

export default AumAssetOutPage;
