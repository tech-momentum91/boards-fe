import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

import { fetchAumOptions, selectAumOptions } from '@/redux/aumOptionsSlice';
import {
  fetchMaintenanceTasks,
  selectMaintenanceTasksList,
  updateMaintenanceTask,
} from '@/redux/aumMaintenanceSlice';
import { createAssetOutFromNeedsRetirementTask } from '@/components/aum/asset-out/maintenance-task-retired-bridge';
import { useAumListLoadMore } from '@/components/aum/aum-list-pagination';
import { buildAumAssetHierarchy } from '@/components/aum/asset/asset-helper';
import { normalizeGroupRules } from '@/components/aum/asset/aum-multi-group-by-dropdown';
import MaintenanceTaskDetailDrawer from '@/components/aum/maintenance-task/maintenance-task-detail-drawer';
import MwqPageToolbar from '@/components/aum/maintenance-work-queue/mwq-page-toolbar';
import MaintenanceWorkQueueHierarchyView from '@/components/aum/maintenance-work-queue/maintenance-work-queue-hierarchy-view';
import MaintenanceWorkQueueTable from '@/components/aum/maintenance-work-queue/maintenance-work-queue-table';
import { buildPreventiveMonthParam } from '@/components/aum/maintenance-work-queue/maintenance-work-queue-api-mapper';
import {
  MWQ_DEFAULT_APPLIED_FILTERS,
  MWQ_DEFAULT_GROUP_BY_RULES,
} from '@/components/aum/maintenance-work-queue/maintenance-work-queue-constants';
import { buildMwqListFetchParams } from '@/components/aum/shared/aum-list-filter-params';
import { fetchMwqFilterOptions } from '@/api/preventiveChecks';
import {
  buildMwqToolbarCenterOptions,
  resolveMwqCenterFilterValue,
} from '@/components/aum/maintenance-work-queue/maintenance-work-queue-helper';
import { AUM_FILTER_VALUE_ALL, AUM_TAB_IDS } from '@/components/aum/constants';
import { useAumMaintenanceTaskColumnConfig } from '@/components/aum/use-aum-column-config';
import { useAumSearch } from '@/components/aum/use-aum-search';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const MaintenanceTaskPage = () => {
  const dispatch = useDispatch();
  const { section } = useParams();
  const isTabActive = section === AUM_TAB_IDS.MAINTENANCE_TASK;
  const listState = useSelector(selectMaintenanceTasksList);
  const { rows: storeRows, status: listStatus } = listState;
  const { centers: centerOptions } = useSelector(selectAumOptions);

  const { searchValue, setSearchValue, debouncedSearch } = useAumSearch();
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedCenter, setSelectedCenter] = useState(AUM_FILTER_VALUE_ALL);
  const [appliedFilters, setAppliedFilters] = useState(MWQ_DEFAULT_APPLIED_FILTERS);
  const [completedQuickFilterActive, setCompletedQuickFilterActive] = useState(false);
  const [groupByRules, setGroupByRules] = useState(MWQ_DEFAULT_GROUP_BY_RULES);
  const [selectedRowIds, setSelectedRowIds] = useState(() => new Set());
  const [rows, setRows] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [groupsExpanded, setGroupsExpanded] = useState(true);
  const [filterOptions, setFilterOptions] = useState(() =>
    Object.fromEntries(Object.keys(MWQ_DEFAULT_APPLIED_FILTERS).map((key) => [key, []])),
  );

  const isLoading = listStatus === 'loading';

  useEffect(() => {
    setRows(storeRows);
  }, [storeRows]);

  const columnConfigHook = useAumMaintenanceTaskColumnConfig();

  useEffect(() => {
    dispatch(fetchAumOptions());
  }, [dispatch]);

  const toolbarCenterOptions = useMemo(
    () => buildMwqToolbarCenterOptions(centerOptions),
    [centerOptions],
  );

  const listFetchParams = useMemo(
    () =>
      buildMwqListFetchParams({
        search: debouncedSearch,
        toolbarCenter: selectedCenter,
        month: buildPreventiveMonthParam(selectedMonth),
        appliedFilters,
        completedQuickFilter: completedQuickFilterActive,
      }),
    [debouncedSearch, selectedCenter, selectedMonth, appliedFilters, completedQuickFilterActive],
  );

  useEffect(() => {
    let cancelled = false;
    fetchMwqFilterOptions({
      variant: 'task',
      center: resolveMwqCenterFilterValue(selectedCenter),
    })
      .then((options) => {
        if (!cancelled && options) {
          setFilterOptions(options);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedCenter]);

  useEffect(() => {
    if (!isTabActive) return undefined;

    const controller = dispatch(fetchMaintenanceTasks(listFetchParams));
    return () => {
      controller.abort?.();
    };
  }, [dispatch, isTabActive, listFetchParams]);

  const { renderLoadMoreFooter } = useAumListLoadMore({
    dispatch,
    fetchThunk: fetchMaintenanceTasks,
    listState,
    fetchParams: listFetchParams,
  });

  useEffect(() => {
    if (listStatus === 'failed') {
      showErrorToast('Could not load maintenance tasks.');
    }
  }, [listStatus]);

  const filteredRows = rows;

  const handleCompletedQuickFilterToggle = useCallback(() => {
    setCompletedQuickFilterActive((current) => !current);
  }, []);

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

  const patchTaskRow = useCallback(
    async (rowId, patch) => {
      try {
        const result = await dispatch(updateMaintenanceTask({ amlName: rowId, patch })).unwrap();
        return result.updated;
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Could not update maintenance task.' });
        return null;
      }
    },
    [dispatch],
  );

  const applyNeedsRetirementCondition = useCallback(
    async (row) => {
      if (!row) return null;

      try {
        const outEntry = await createAssetOutFromNeedsRetirementTask(row);
        setRows((previous) => previous.filter((item) => item.id !== row.id));

        if (selectedRow?.id === row.id) {
          setIsDetailDrawerOpen(false);
          setSelectedRow(null);
        }

        showSuccessToast(
          `Draft Asset Out ${outEntry.outNumber} created. Confirm it to retire the asset.`,
        );
        return outEntry;
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Could not create draft Asset Out for retirement.',
        });
        return null;
      }
    },
    [selectedRow],
  );

  const handleConditionChange = useCallback(
    async (rowId, nextCondition) => {
      const currentRow = rows.find((row) => row.id === rowId);
      if (!currentRow || currentRow.condition === nextCondition) return;

      if (nextCondition === 'Needs Retirement') {
        applyNeedsRetirementCondition(currentRow);
        return;
      }

      const updated = await patchTaskRow(rowId, { condition: nextCondition });
      if (updated && selectedRow?.id === rowId) {
        setSelectedRow(updated);
      }
    },
    [applyNeedsRetirementCondition, patchTaskRow, rows, selectedRow],
  );

  const handleStatusChange = useCallback(
    async (rowId, nextStatus) => {
      await patchTaskRow(rowId, { status: nextStatus });
    },
    [patchTaskRow],
  );

  const handlePriorityChange = useCallback(
    async (rowId, nextPriority) => {
      await patchTaskRow(rowId, { priority: nextPriority });
    },
    [patchTaskRow],
  );

  const handleExport = useCallback(() => {}, []);

  const handleRowClick = useCallback((row) => {
    setSelectedRow(row);
    setIsDetailDrawerOpen(true);
  }, []);

  const handleDetailDrawerOpenChange = useCallback((open) => {
    setIsDetailDrawerOpen(open);
    if (!open) {
      setSelectedRow(null);
    }
  }, []);

  const handleDrawerStatusChange = useCallback(
    async (nextStatus) => {
      if (!selectedRow) return;
      const updated = await patchTaskRow(selectedRow.id, { status: nextStatus });
      if (!updated) return;

      setSelectedRow(updated);
    },
    [patchTaskRow, selectedRow],
  );

  const handleDrawerConditionChange = useCallback(
    async (nextCondition) => {
      if (!selectedRow) return;
      await handleConditionChange(selectedRow.id, nextCondition);
    },
    [handleConditionChange, selectedRow],
  );

  const activeSelectedRow = useMemo(() => {
    if (!selectedRow) return null;
    return rows.find((row) => row.id === selectedRow.id) || selectedRow;
  }, [rows, selectedRow]);

  return (
    <TabMenuHorizontal.Content
      value={AUM_TAB_IDS.MAINTENANCE_TASK}
      className='min-h-0 flex-1 outline-none'
    >
      <div className='flex min-h-0 flex-1 flex-col gap-5 px-8 pb-10 pt-6'>
        <MwqPageToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          showMonthSelect
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          selectedCenter={selectedCenter}
          onCenterChange={setSelectedCenter}
          centerOptions={toolbarCenterOptions}
          filterOptions={filterOptions}
          appliedFilters={appliedFilters}
          onFiltersChange={setAppliedFilters}
          groupByRules={groupByRules}
          onGroupByRulesChange={setGroupByRules}
          columnConfig={columnConfigHook}
          pinnedColumnId={columnConfigHook.pinnedColumnId}
          onExport={handleExport}
          isGroupedView={isGroupedView}
          groupsExpanded={groupsExpanded}
          onToggleGroupsExpanded={handleToggleGroupsExpanded}
          enableCompletedQuickFilter
          completedQuickFilterActive={completedQuickFilterActive}
          onCompletedQuickFilterToggle={handleCompletedQuickFilterToggle}
        />

        <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto'>
          {isLoading ? (
            <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-10 text-center text-label-sm text-text-sub-500'>
              Loading maintenance tasks...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-10 text-center text-label-sm text-text-sub-500'>
              No maintenance tasks match these filters.
            </div>
          ) : isGroupedView ? (
            <MaintenanceWorkQueueHierarchyView
              key={groupsExpanded ? 'expanded' : 'collapsed'}
              hierarchy={hierarchy}
              columnConfig={columnConfigHook.columns}
              mode='task'
              showCheckboxes
              selectedRowIds={selectedRowIds}
              onSelectedRowIdsChange={setSelectedRowIds}
              onStatusChange={handleStatusChange}
              onConditionChange={handleConditionChange}
              onPriorityChange={handlePriorityChange}
              onRowClick={handleRowClick}
              defaultExpanded={groupsExpanded}
            />
          ) : (
            <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
              <MaintenanceWorkQueueTable
                flatRows={filteredRows}
                columnConfig={columnConfigHook.columns}
                mode='task'
                showCheckboxes
                selectedRowIds={selectedRowIds}
                onSelectedRowIdsChange={setSelectedRowIds}
                onStatusChange={handleStatusChange}
                onConditionChange={handleConditionChange}
                onPriorityChange={handlePriorityChange}
                onRowClick={handleRowClick}
              />
            </div>
          )}
          {renderLoadMoreFooter()}
        </div>

        <MaintenanceTaskDetailDrawer
          open={isDetailDrawerOpen}
          onOpenChange={handleDetailDrawerOpenChange}
          row={activeSelectedRow}
          rows={filteredRows}
          onStatusChange={handleDrawerStatusChange}
          onConditionChange={handleDrawerConditionChange}
        />
      </div>
    </TabMenuHorizontal.Content>
  );
};

export default MaintenanceTaskPage;
