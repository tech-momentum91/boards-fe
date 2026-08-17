import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { showErrorToast } from '@/utils/error-utils';

import { fetchAumOptions, selectAumOptions } from '@/redux/aumOptionsSlice';
import { useAumListLoadMore } from '@/components/aum/aum-list-pagination';
import {
  fetchPreventiveChecks,
  resetMaintenanceTasksList,
  selectPreventiveChecksList,
  updatePreventiveCheck,
} from '@/redux/aumMaintenanceSlice';
import { buildAumAssetHierarchy } from '@/components/aum/asset/asset-helper';
import { normalizeGroupRules } from '@/components/aum/asset/aum-multi-group-by-dropdown';
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
import PreventiveCheckDetailDrawer from '@/components/aum/preventive-checks/preventive-check-detail-drawer';
import MwqPageToolbar from '@/components/aum/maintenance-work-queue/mwq-page-toolbar';
import { AUM_FILTER_VALUE_ALL, AUM_TAB_IDS } from '@/components/aum/constants';
import { useAumPreventiveChecksColumnConfig } from '@/components/aum/use-aum-column-config';
import { useAumSearch } from '@/components/aum/use-aum-search';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const PreventiveChecksPage = () => {
  const dispatch = useDispatch();
  const listState = useSelector(selectPreventiveChecksList);
  const { rows, status: listStatus } = listState;
  const { centers: centerOptions } = useSelector(selectAumOptions);

  const { searchValue, setSearchValue, debouncedSearch } = useAumSearch();
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedCenter, setSelectedCenter] = useState(AUM_FILTER_VALUE_ALL);
  const [appliedFilters, setAppliedFilters] = useState(MWQ_DEFAULT_APPLIED_FILTERS);
  const [groupByRules, setGroupByRules] = useState(MWQ_DEFAULT_GROUP_BY_RULES);
  const [selectedRowIds, setSelectedRowIds] = useState(() => new Set());
  const [selectedRow, setSelectedRow] = useState(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [groupsExpanded, setGroupsExpanded] = useState(true);
  const [filterOptions, setFilterOptions] = useState(() =>
    Object.fromEntries(Object.keys(MWQ_DEFAULT_APPLIED_FILTERS).map((key) => [key, []])),
  );

  const isLoading = listStatus === 'loading';

  const columnConfigHook = useAumPreventiveChecksColumnConfig();

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
      }),
    [debouncedSearch, selectedCenter, selectedMonth, appliedFilters],
  );

  useEffect(() => {
    let cancelled = false;
    fetchMwqFilterOptions({
      variant: 'preventive',
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
    const controller = dispatch(fetchPreventiveChecks(listFetchParams));
    return () => {
      controller.abort?.();
    };
  }, [dispatch, listFetchParams]);

  const { renderLoadMoreFooter } = useAumListLoadMore({
    dispatch,
    fetchThunk: fetchPreventiveChecks,
    listState,
    fetchParams: listFetchParams,
  });

  useEffect(() => {
    if (listStatus === 'failed') {
      showErrorToast('Could not load preventive checks.');
    }
  }, [listStatus]);

  const filteredRows = rows;

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

  const patchPreventiveRow = useCallback(
    async (rowId, patch) => {
      try {
        const result = await dispatch(updatePreventiveCheck({ name: rowId, patch })).unwrap();
        return result.updated;
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Could not update preventive check.' });
        return null;
      }
    },
    [dispatch],
  );

  const handleConditionChange = useCallback(
    async (rowId, nextCondition) => {
      const updated = await patchPreventiveRow(rowId, { condition: nextCondition });
      if (updated) {
        dispatch(resetMaintenanceTasksList());
      }
    },
    [dispatch, patchPreventiveRow],
  );

  const handleStatusChange = useCallback(
    async (rowId, nextStatus) => {
      await patchPreventiveRow(rowId, { status: nextStatus });
    },
    [patchPreventiveRow],
  );

  const handlePriorityChange = useCallback(
    async (rowId, nextPriority) => {
      await patchPreventiveRow(rowId, { priority: nextPriority });
    },
    [patchPreventiveRow],
  );

  const handleAssigneeChange = useCallback(
    async (rowId, assigneeEmail) => {
      await patchPreventiveRow(rowId, { assignee: assigneeEmail });
    },
    [patchPreventiveRow],
  );

  const handleExport = useCallback(() => {
    if (filteredRows.length === 0) return;
    const headers = [
      'Name',
      'Product Code',
      'Center',
      'Status',
      'Condition',
      'Priority',
      'Due Date',
    ];
    const csvRows = filteredRows.map((row) =>
      [
        row.name,
        row.productCode,
        row.centerName,
        row.status,
        row.condition,
        row.priority,
        row.dueDate,
      ]
        .map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`)
        .join(','),
    );
    const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'preventive-checks.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredRows]);

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
      const updated = await patchPreventiveRow(selectedRow.id, { status: nextStatus });
      if (updated) {
        setSelectedRow(updated);
      }
    },
    [patchPreventiveRow, selectedRow],
  );

  const handleDrawerConditionChange = useCallback(
    async (nextCondition) => {
      if (!selectedRow) return;
      const updated = await patchPreventiveRow(selectedRow.id, { condition: nextCondition });
      if (updated) {
        dispatch(resetMaintenanceTasksList());
        setSelectedRow(updated);
      }
    },
    [dispatch, patchPreventiveRow, selectedRow],
  );

  const handleDrawerPriorityChange = useCallback(
    async (nextPriority) => {
      if (!selectedRow) return;
      const updated = await patchPreventiveRow(selectedRow.id, { priority: nextPriority });
      if (updated) {
        setSelectedRow(updated);
      }
    },
    [patchPreventiveRow, selectedRow],
  );

  const handleDrawerAssigneeChange = useCallback(
    async (assigneeEmail) => {
      if (!selectedRow) return;
      const updated = await patchPreventiveRow(selectedRow.id, { assignee: assigneeEmail });
      if (updated) {
        setSelectedRow(updated);
      }
    },
    [patchPreventiveRow, selectedRow],
  );

  const activeSelectedRow = useMemo(() => {
    if (!selectedRow) return null;
    return filteredRows.find((row) => row.id === selectedRow.id) || selectedRow;
  }, [filteredRows, selectedRow]);

  return (
    <TabMenuHorizontal.Content
      value={AUM_TAB_IDS.PREVENTIVE_CHECKS}
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
        />

        <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto'>
          {isLoading ? (
            <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-10 text-center text-label-sm text-text-sub-500'>
              Loading preventive checks...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-10 text-center text-label-sm text-text-sub-500'>
              No preventive checks match these filters.
            </div>
          ) : isGroupedView ? (
            <MaintenanceWorkQueueHierarchyView
              key={groupsExpanded ? 'expanded' : 'collapsed'}
              hierarchy={hierarchy}
              columnConfig={columnConfigHook.columns}
              mode='preventive'
              showCheckboxes
              selectedRowIds={selectedRowIds}
              onSelectedRowIdsChange={setSelectedRowIds}
              onConditionChange={handleConditionChange}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              onAssigneeChange={handleAssigneeChange}
              onRowClick={handleRowClick}
              defaultExpanded={groupsExpanded}
            />
          ) : (
            <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
              <MaintenanceWorkQueueTable
                flatRows={filteredRows}
                columnConfig={columnConfigHook.columns}
                mode='preventive'
                showCheckboxes
                selectedRowIds={selectedRowIds}
                onSelectedRowIdsChange={setSelectedRowIds}
                onConditionChange={handleConditionChange}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                onAssigneeChange={handleAssigneeChange}
                onRowClick={handleRowClick}
              />
            </div>
          )}
          {renderLoadMoreFooter()}
        </div>

        <PreventiveCheckDetailDrawer
          open={isDetailDrawerOpen}
          onOpenChange={handleDetailDrawerOpenChange}
          row={activeSelectedRow}
          rows={filteredRows}
          onStatusChange={handleDrawerStatusChange}
          onConditionChange={handleDrawerConditionChange}
          onPriorityChange={handleDrawerPriorityChange}
          onAssigneeChange={handleDrawerAssigneeChange}
        />
      </div>
    </TabMenuHorizontal.Content>
  );
};

export default PreventiveChecksPage;
