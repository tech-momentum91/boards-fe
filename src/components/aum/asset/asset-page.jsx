import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

import { useAumListLoadMore } from '@/components/aum/aum-list-pagination';
import { normalizeGroupRules } from '@/components/aum/asset/aum-multi-group-by-dropdown';
import AumAssetHierarchyView from '@/components/aum/asset/asset-hierarchy-view';
import AumAssetListTable from '@/components/aum/asset/asset-list-table';
import { buildAumAssetHierarchy } from '@/components/aum/asset/asset-helper';
import { fetchAumAssetFilterOptions } from '@/api/aumAsset';
import { buildAumListFetchParams } from '@/components/aum/shared/aum-list-filter-params';
import AumAssetToolbar from '@/components/aum/asset/asset-toolbar';
import AumStatCards from '@/components/aum/aum-stat-cards';
import {
  AUM_DEFAULT_APPLIED_FILTERS,
  AUM_DEFAULT_GROUP_BY_RULES,
  AUM_STAT_CARDS_CONFIG,
  AUM_TAB_IDS,
} from '@/components/aum/constants';
import { useAumAssetListColumnConfig } from '@/components/aum/use-aum-column-config';
import { useAumSearch } from '@/components/aum/use-aum-search';
import {
  exportAumAssetBarcodes,
  fetchAumAssetList,
  selectAumAssetList,
  selectAumAssetMutations,
} from '@/redux/aumAssetSlice';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const createEmptyAumSummary = () =>
  Object.fromEntries(AUM_STAT_CARDS_CONFIG.map(({ valueKey }) => [valueKey, '—']));

const AumAssetPage = () => {
  const dispatch = useDispatch();
  const listState = useSelector(selectAumAssetList);
  const { items: assetRows, summary: apiSummary, status } = listState;
  const { exportBarcodesStatus } = useSelector(selectAumAssetMutations);

  const { searchValue, setSearchValue, debouncedSearch } = useAumSearch();
  const [appliedFilters, setAppliedFilters] = useState(AUM_DEFAULT_APPLIED_FILTERS);
  const [groupByRules, setGroupByRules] = useState(AUM_DEFAULT_GROUP_BY_RULES);
  const isExportingBarcodes = exportBarcodesStatus === 'loading';
  const [groupsExpanded, setGroupsExpanded] = useState(true);
  const [filterOptions, setFilterOptions] = useState(() =>
    Object.fromEntries(Object.keys(AUM_DEFAULT_APPLIED_FILTERS).map((key) => [key, []])),
  );

  const summary = useMemo(() => {
    const base = createEmptyAumSummary();
    return apiSummary ? { ...base, ...apiSummary } : base;
  }, [apiSummary]);

  const isLoading = status === 'loading';

  const listFetchParams = useMemo(
    () =>
      buildAumListFetchParams({
        search: debouncedSearch,
        appliedFilters,
      }),
    [debouncedSearch, appliedFilters],
  );

  useEffect(() => {
    let cancelled = false;
    fetchAumAssetFilterOptions()
      .then((options) => {
        if (!cancelled && options) {
          setFilterOptions(options);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const controller = dispatch(fetchAumAssetList(listFetchParams));
    return () => {
      controller.abort?.();
    };
  }, [dispatch, listFetchParams]);

  const { renderLoadMoreFooter } = useAumListLoadMore({
    dispatch,
    fetchThunk: fetchAumAssetList,
    listState,
    fetchParams: listFetchParams,
  });

  useEffect(() => {
    if (status === 'failed') {
      showErrorToast('Could not load assets.');
    }
  }, [status]);

  const columnConfigHook = useAumAssetListColumnConfig();

  const filteredRows = assetRows;

  const activeGroupRules = useMemo(() => normalizeGroupRules(groupByRules), [groupByRules]);

  const hierarchy = useMemo(
    () => buildAumAssetHierarchy(filteredRows, activeGroupRules),
    [filteredRows, activeGroupRules],
  );

  const isGroupedView = activeGroupRules.length > 0;

  useEffect(() => {
    setGroupsExpanded(true);
  }, [activeGroupRules]);

  const handleToggleGroupsExpanded = useCallback(() => {
    setGroupsExpanded((current) => !current);
  }, []);

  const handleExport = useCallback(async () => {
    const assetNames = filteredRows.filter((row) => row.id && row.barcode).map((row) => row.id);

    if (assetNames.length === 0) {
      showErrorToast('No barcoded assets in the current list to export.');
      return;
    }

    try {
      const filename = await dispatch(exportAumAssetBarcodes(assetNames)).unwrap();
      showSuccessToast(`Downloaded ${filename}`);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to export barcode labels.' });
    }
  }, [dispatch, filteredRows]);

  return (
    <TabMenuHorizontal.Content value={AUM_TAB_IDS.ASSET} className='min-h-0 flex-1 outline-none'>
      <div className='flex min-h-0 flex-1 flex-col gap-5 px-8 pb-10 pt-6'>
        <AumStatCards {...summary} />

        <AumAssetToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          filterOptions={filterOptions}
          appliedFilters={appliedFilters}
          onFiltersChange={setAppliedFilters}
          onClearFilters={() => setAppliedFilters(AUM_DEFAULT_APPLIED_FILTERS)}
          groupByRules={groupByRules}
          onGroupByRulesChange={setGroupByRules}
          columnConfig={columnConfigHook}
          pinnedColumnId={columnConfigHook.pinnedColumnId}
          onExport={handleExport}
          isExporting={isExportingBarcodes}
          isGroupedView={isGroupedView}
          groupsExpanded={groupsExpanded}
          onToggleGroupsExpanded={handleToggleGroupsExpanded}
        />

        <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto'>
          {isLoading ? (
            <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-10 text-center text-label-sm text-text-sub-500'>
              Loading assets...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-10 text-center text-label-sm text-text-sub-500'>
              No assets match these filters.
            </div>
          ) : isGroupedView ? (
            <AumAssetHierarchyView
              key={groupsExpanded ? 'expanded' : 'collapsed'}
              hierarchy={hierarchy}
              columnConfig={columnConfigHook.columns}
              defaultExpanded={groupsExpanded}
            />
          ) : (
            <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
              <AumAssetListTable
                rows={filteredRows}
                columnConfig={columnConfigHook.columns}
                indentedName={false}
              />
            </div>
          )}
          {renderLoadMoreFooter()}
        </div>
      </div>
    </TabMenuHorizontal.Content>
  );
};

export default AumAssetPage;
