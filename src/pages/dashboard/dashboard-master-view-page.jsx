import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RiArrowLeftLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import PageLayout from '@/components/page-layout';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';

import DashboardHeader from '@/components/dashboard-master/viewer/dashboard-header';
import TabsStrip from '@/components/dashboard-master/viewer/tabs-strip';
import FilterBar from '@/components/dashboard-master/viewer/filter-bar';
import ChartGrid from '@/components/dashboard-master/viewer/chart-grid';
import TabFormModal from '@/components/dashboard-master/viewer/tab-form-modal';
import { AddWidgetModal, ChartBuilderModal } from '@/components/dashboard-master/chart-builder';
import { emptyRootGroup } from '@/components/dashboard-master/custom-filter';

import {
  DEFAULT_ENABLED_FILTERS,
  deleteChart,
  deleteTab,
  duplicateTab,
  getDashboard,
  listCharts,
  saveDashboard,
  saveTab,
  updateChartPositions,
} from '@/services/dashboard-master-service';
import { applyGridPositionUpdates } from '@/components/dashboard-master/viewer/dashboard-grid-utils';
import { fetchClients } from '@/redux/billingSlice';
import { fetchCenterAccess, selectCenterAccess } from '@/redux/centerSlice';
import {
  buildDaysFilterPayload,
  buildTabFiltersForChart,
  restoreCustomDateRange,
  restoreDimensionFilterValues,
  serializeDimensionFilterValues,
} from '@/utils/dashboard-time-filter';
import { canWriteDashboardMaster } from '@/utils/user-role-utils';

// ── helpers ───────────────────────────────────────────────────────────────────

function restoreTabFilters(tab, defaultTimeRange, validCenterIds = null) {
  const daysFilter = tab?.days_filter ?? {};
  let centerFilter = restoreDimensionFilterValues(tab?.centers_filter, validCenterIds);

  if (
    Array.isArray(validCenterIds) &&
    validCenterIds.length === 1 &&
    centerFilter.length === 1 &&
    centerFilter[0] === validCenterIds[0]
  ) {
    centerFilter = [];
  }

  return {
    timeRange: daysFilter.time_range || defaultTimeRange || 'Last 30 Days',
    customDateRange: restoreCustomDateRange(daysFilter),
    centerFilter,
    clientFilter: restoreDimensionFilterValues(tab?.client_filter),
    extraFilter: tab?.extra_filter?.kind === 'group' ? tab.extra_filter : emptyRootGroup(),
  };
}

function sortTabs(tabs) {
  return [...tabs].sort((a, b) => {
    if (Boolean(a.is_pinned) !== Boolean(b.is_pinned)) {
      return a.is_pinned ? -1 : 1;
    }
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
}

// ── component ─────────────────────────────────────────────────────────────────

export default function DashboardMasterViewPage({ mode = 'view', embedded = false }) {
  const { dashboardId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const centerAccess = useSelector(selectCenterAccess);
  const clientList = useSelector((state) => state.billing?.clientList);
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const isSetupMode = mode === 'setup';
  const canWriteFromPerm = canWriteDashboardMaster(userSideBarPerm);
  const [dashboardPermissions, setDashboardPermissions] = useState(null);
  const canWrite = dashboardPermissions?.can_write ?? canWriteFromPerm;
  const canManageTabs = isSetupMode && canWrite;

  // ── Data ───────────────────────────────────────────────────────────
  const [dashboard, setDashboard] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [charts, setCharts] = useState([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);
  const [chartsError, setChartsError] = useState(null);

  // ── Filter bar state ───────────────────────────────────────────────
  const [timeRange, setTimeRange] = useState('Last 30 Days');
  const [customDateRange, setCustomDateRange] = useState(null);
  const [centerFilter, setCenterFilter] = useState([]);
  const [clientFilter, setClientFilter] = useState([]);
  const [extraFilter, setExtraFilter] = useState(emptyRootGroup);
  const [search, setSearch] = useState('');

  const filterDirty = useRef(false);

  // ── Modals ─────────────────────────────────────────────────────────
  const [tabModalOpen, setTabModalOpen] = useState(false);
  const [editingTab, setEditingTab] = useState(null);
  const [deletingTab, setDeletingTab] = useState(null);
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);
  const [chartBuilderState, setChartBuilderState] = useState({
    open: false,
    chartType: null,
    editId: null,
    drillDownFilter: null,
    initialSidePanelTab: 'config',
  });
  const [deletingChart, setDeletingChart] = useState(null);
  const chartsRequestRef = useRef(0);
  const dashboardRequestRef = useRef(0);
  const filterSaveRequestRef = useRef(0);
  const clientsFetchInitiated = useRef(false);

  const clientOptions = useMemo(() => {
    const rows = clientList?.data?.data ?? clientList?.data ?? [];
    return rows.map((client) => ({
      value: client.name,
      label: client.customer_name || client.name,
    }));
  }, [clientList?.data]);

  const allCenterIds = useMemo(
    () => (centerAccess?.data ?? []).map((center) => center.name),
    [centerAccess?.data],
  );

  const allClientIds = useMemo(() => clientOptions.map((client) => client.value), [clientOptions]);

  const enabledFilters = useMemo(
    () => ({
      ...DEFAULT_ENABLED_FILTERS,
      ...dashboard?.enabled_filters,
    }),
    [dashboard?.enabled_filters],
  );

  useEffect(() => {
    if (!enabledFilters.centers) return;
    if (centerAccess.status !== 'idle') return;
    dispatch(fetchCenterAccess());
  }, [dispatch, enabledFilters.centers, centerAccess.status]);

  useEffect(() => {
    if (!enabledFilters.clients) return;
    if (clientsFetchInitiated.current) return;
    if (clientList.isLoading) return;
    if (clientList.error) return;
    clientsFetchInitiated.current = true;
    dispatch(fetchClients());
  }, [dispatch, enabledFilters.clients, clientList.isLoading, clientList.error]);

  const sortedTabs = useMemo(() => sortTabs(tabs), [tabs]);

  const backToList = useCallback(() => {
    navigate(isSetupMode ? '/settings/dashboards' : '/dashboard');
  }, [navigate, isSetupMode]);

  useEffect(() => {
    if (!isSetupMode || canWriteFromPerm) return;
    if (!dashboardId) {
      navigate('/dashboard', { replace: true });
      return;
    }
    navigate(`/dashboards/${encodeURIComponent(dashboardId)}`, { replace: true });
  }, [isSetupMode, canWriteFromPerm, dashboardId, navigate]);

  // ── Load dashboard + tabs ──────────────────────────────────────────
  const reloadDashboard = useCallback(async () => {
    if (!dashboardId) return;
    const requestId = ++dashboardRequestRef.current;
    setLoadingDashboard(true);
    setDashboardError(null);
    try {
      const payload = await getDashboard(dashboardId);
      if (requestId !== dashboardRequestRef.current) return;
      const nextDashboard = payload?.dashboard ?? null;
      const nextTabs = payload?.tabs ?? [];
      setDashboardPermissions(payload?.permissions ?? null);
      setDashboard(nextDashboard);
      setTabs(nextTabs);
      setActiveTabId((prev) => {
        if (prev && nextTabs.some((t) => t.tab_id === prev)) return prev;
        const defaultTab = nextTabs.find((t) => t.is_default);
        return defaultTab?.tab_id ?? nextTabs[0]?.tab_id ?? null;
      });
    } catch (error) {
      if (requestId !== dashboardRequestRef.current) return;
      const message = error?.message || 'Failed to load dashboard';
      setDashboardError(message);
      toast.error(message);
    } finally {
      if (requestId === dashboardRequestRef.current) {
        setLoadingDashboard(false);
      }
    }
  }, [dashboardId]);

  useEffect(() => {
    reloadDashboard();
  }, [reloadDashboard]);

  const handleTabSelect = useCallback(
    (tabId) => {
      const tab = tabs.find((t) => t.tab_id === tabId);
      if (tab) {
        const defaultTimeRange = dashboard?.default_time_range || 'Last 30 Days';
        const restored = restoreTabFilters(tab, defaultTimeRange, allCenterIds);
        filterDirty.current = false;
        setTimeRange(restored.timeRange);
        setCustomDateRange(restored.customDateRange);
        setCenterFilter(restored.centerFilter);
        setClientFilter(restored.clientFilter);
        setExtraFilter(restored.extraFilter);
      }
      setActiveTabId(tabId);
    },
    [tabs, dashboard?.default_time_range, allCenterIds],
  );

  useEffect(() => {
    if (!activeTabId) return;
    const tab = tabs.find((t) => t.tab_id === activeTabId);
    if (!tab) return;

    const defaultTimeRange = dashboard?.default_time_range || 'Last 30 Days';
    const restored = restoreTabFilters(tab, defaultTimeRange, allCenterIds);
    filterDirty.current = false;
    setTimeRange(restored.timeRange);
    setCustomDateRange(restored.customDateRange);
    setCenterFilter(restored.centerFilter);
    setClientFilter(restored.clientFilter);
    setExtraFilter(restored.extraFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, allCenterIds]);

  useEffect(() => {
    if (allCenterIds.length === 0) return;
    setCenterFilter((prev) => {
      let next = prev.filter((id) => allCenterIds.includes(id));

      // Selecting the only accessible centre is equivalent to "All Centres".
      if (next.length === 1 && allCenterIds.length === 1 && next[0] === allCenterIds[0]) {
        next = [];
      }

      if (next.length === prev.length && next.every((id, index) => id === prev[index])) {
        return prev;
      }
      return next;
    });
  }, [allCenterIds]);

  useEffect(() => {
    if (!activeTabId || !filterDirty.current || !canWrite) return undefined;

    const tab = tabs.find((t) => t.tab_id === activeTabId);
    if (!tab) return undefined;

    const daysFilter = buildDaysFilterPayload({ timeRange, customDateRange });
    if (timeRange === 'Custom' && (!daysFilter.from_date || !daysFilter.to_date)) {
      return undefined;
    }

    const timer = setTimeout(async () => {
      const saveId = ++filterSaveRequestRef.current;
      try {
        const saved = await saveTab({
          tabId: activeTabId,
          dashboard: dashboardId,
          displayName: tab.display_name,
          tabName: tab.tab_name,
          sortOrder: tab.sort_order,
          daysFilter,
          centersFilter: { value: serializeDimensionFilterValues(centerFilter) },
          clientFilter: { value: serializeDimensionFilterValues(clientFilter) },
          extraFilter,
        });
        if (saveId !== filterSaveRequestRef.current) return;
        if (saved) {
          setTabs((prev) => prev.map((t) => (t.tab_id === activeTabId ? { ...t, ...saved } : t)));
        }
      } catch (error) {
        if (saveId !== filterSaveRequestRef.current) return;
        toast.error(error?.message || 'Failed to save tab filters');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [timeRange, customDateRange, centerFilter, clientFilter, extraFilter, activeTabId]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabFilters = useMemo(
    () => buildTabFiltersForChart({ timeRange, customDateRange, centerFilter, clientFilter }),
    [timeRange, customDateRange, centerFilter, clientFilter],
  );

  const handleTimeRangeChange = (v) => {
    filterDirty.current = true;
    setTimeRange(v);
    if (v !== 'Custom') {
      setCustomDateRange(null);
    }
  };
  const handleCustomDateRangeChange = (range) => {
    filterDirty.current = true;
    setCustomDateRange(range);
  };
  const normalizeSelection = useCallback((nextSelected, allIds) => {
    if (!Array.isArray(nextSelected) || nextSelected.length === 0) return [];
    if (
      allIds.length > 0 &&
      nextSelected.length === allIds.length &&
      allIds.every((id) => nextSelected.includes(id))
    ) {
      return [];
    }
    return nextSelected;
  }, []);

  const handleCenterFilterChange = (nextSelected) => {
    filterDirty.current = true;
    setCenterFilter(normalizeSelection(nextSelected, allCenterIds));
  };
  const handleClientFilterChange = (nextSelected) => {
    filterDirty.current = true;
    setClientFilter(normalizeSelection(nextSelected, allClientIds));
  };

  const handleEnabledFiltersChange = useCallback(
    async (nextEnabledFilters) => {
      if (!dashboard) return;
      try {
        const saved = await saveDashboard({
          dashboardId: dashboard.dashboard_id,
          dashboardName: dashboard.dashboard_name,
          icon: dashboard.icon,
          description: dashboard.description,
          dashboardType: dashboard.dashboard_type,
          module: dashboard.module,
          embedInModule: dashboard.embed_in_module,
          defaultTimeRange: dashboard.default_time_range,
          enabledFilters: nextEnabledFilters,
          visibility: dashboard.visibility ?? { roles: [], users: [] },
        });
        if (saved) {
          setDashboard((prev) => (prev ? { ...prev, ...saved } : saved));
        }
      } catch (error) {
        toast.error(error?.message || 'Failed to update filters');
      }
    },
    [dashboard],
  );

  const reloadCharts = useCallback(async () => {
    if (!activeTabId) {
      setCharts([]);
      setChartsError(null);
      setLoadingCharts(false);
      return;
    }
    const requestId = ++chartsRequestRef.current;
    setLoadingCharts(true);
    setChartsError(null);
    try {
      const nextCharts = await listCharts(activeTabId);
      if (requestId !== chartsRequestRef.current) return;
      setCharts(nextCharts);
    } catch (error) {
      if (requestId !== chartsRequestRef.current) return;
      const message = error?.message || 'Failed to load charts';
      setChartsError(message);
      toast.error(message);
    } finally {
      if (requestId === chartsRequestRef.current) {
        setLoadingCharts(false);
      }
    }
  }, [activeTabId]);

  useEffect(() => {
    reloadCharts();
  }, [reloadCharts]);

  const filteredCharts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return charts;
    const matched = charts.filter((c) =>
      [c.title, c.summary].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
    // Strip persisted positions so ChartGrid repacks the visible subset tightly
    // with no gaps — clearing search restores original positions from `charts`.
    return matched.map((c) => ({ ...c, grid_x: null, grid_y: null }));
  }, [charts, search]);

  const handleAddTab = () => {
    setEditingTab(null);
    setTabModalOpen(true);
  };

  const handleRenameTab = (tab) => {
    setEditingTab(tab);
    setTabModalOpen(true);
  };

  const handleTogglePin = async (tab, checked) => {
    try {
      const saved = await saveTab({
        tabId: tab.tab_id,
        dashboard: dashboardId,
        displayName: tab.display_name,
        tabName: tab.tab_name,
        sortOrder: tab.sort_order,
        isPinned: checked,
      });
      if (saved) {
        setTabs((prev) => prev.map((t) => (t.tab_id === tab.tab_id ? { ...t, ...saved } : t)));
      }
      toast.success(checked ? 'Tab pinned' : 'Tab unpinned');
    } catch (error) {
      toast.error(error?.message || 'Failed to update tab');
    }
  };

  const handleToggleDefault = async (tab, checked) => {
    try {
      const saved = await saveTab({
        tabId: tab.tab_id,
        dashboard: dashboardId,
        displayName: tab.display_name,
        tabName: tab.tab_name,
        sortOrder: tab.sort_order,
        isDefault: checked,
      });
      if (saved) {
        setTabs((prev) =>
          prev.map((t) => {
            if (t.tab_id === tab.tab_id) return { ...t, ...saved };
            if (checked) return { ...t, is_default: false };
            return t;
          }),
        );
      }
      toast.success(checked ? 'Default tab updated' : 'Default tab cleared');
    } catch (error) {
      toast.error(error?.message || 'Failed to update default tab');
    }
  };

  const handleDuplicateTab = async (tab) => {
    try {
      const duplicated = await duplicateTab(tab.tab_id);
      toast.success('Tab duplicated');
      await reloadDashboard();
      if (duplicated?.tab_id) setActiveTabId(duplicated.tab_id);
    } catch (error) {
      toast.error(error?.message || 'Failed to duplicate tab');
    }
  };

  const confirmDeleteTab = async () => {
    if (!deletingTab) return;
    try {
      await deleteTab(deletingTab.tab_id);
      toast.success('Tab deleted');
      setDeletingTab(null);
      reloadDashboard();
    } catch (error) {
      toast.error(error?.message || 'Failed to delete tab');
    }
  };

  const confirmDeleteChart = async () => {
    if (!deletingChart) return;
    try {
      await deleteChart(deletingChart.chart_id);
      toast.success('Chart deleted');
      setDeletingChart(null);
      reloadCharts();
    } catch (error) {
      toast.error(error?.message || 'Failed to delete chart');
    }
  };

  const handleWidgetTypeSelected = (chartType) => {
    setChartBuilderState({
      open: true,
      chartType,
      editId: null,
      drillDownFilter: null,
      initialSidePanelTab: 'config',
    });
  };

  const handleEditChart = (chart) => {
    setChartBuilderState({
      open: true,
      chartType: chart.chart_type,
      editId: chart.chart_id,
      drillDownFilter: null,
      initialSidePanelTab: 'config',
    });
  };

  const handleChartDrillDown = useCallback((chart, filter) => {
    setChartBuilderState({
      open: true,
      chartType: chart.chart_type,
      editId: chart.chart_id,
      drillDownFilter: filter,
      initialSidePanelTab: 'data',
    });
  }, []);

  const handleChartBuilderOpenChange = useCallback((open) => {
    setChartBuilderState((prev) => ({
      ...prev,
      open,
      ...(open
        ? {}
        : {
            drillDownFilter: null,
            initialSidePanelTab: 'config',
          }),
    }));
  }, []);

  const handleChartPositionChange = useCallback(
    async (updates) => {
      if (!activeTabId || !updates?.length) return;

      setCharts((prev) => applyGridPositionUpdates(prev, updates));

      try {
        await updateChartPositions(activeTabId, updates);
      } catch (error) {
        toast.error(error?.message || 'Failed to update chart layout');
        reloadCharts();
      }
    },
    [activeTabId, reloadCharts],
  );

  const content = (() => {
    if (loadingDashboard && !dashboard) {
      return (
        <div className='flex flex-1 items-center justify-center py-24 text-text-sub-500'>
          Loading dashboard…
        </div>
      );
    }

    if (dashboardError && !dashboard) {
      return (
        <div className='flex flex-1 flex-col items-center justify-center gap-3 py-24'>
          <div className='text-text-sub-500'>{dashboardError}</div>
          <Button.Root variant='neutral' mode='stroke' onClick={reloadDashboard}>
            Retry
          </Button.Root>
          <Button.Root variant='neutral' mode='ghost' onClick={backToList}>
            <Button.Icon as={RiArrowLeftLine} />
            Back to Dashboards
          </Button.Root>
        </div>
      );
    }

    if (!dashboard) {
      return (
        <div className='flex flex-1 flex-col items-center justify-center gap-3 py-24'>
          <div className='text-text-sub-500'>Dashboard not found or you do not have access.</div>
          <Button.Root variant='neutral' mode='stroke' onClick={backToList}>
            <Button.Icon as={RiArrowLeftLine} />
            Back to Dashboards
          </Button.Root>
        </div>
      );
    }

    return (
      <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-bg-white-0'>
        <DashboardHeader dashboard={dashboard} onBack={backToList} embedded={embedded} />

        <TabsStrip
          tabs={sortedTabs}
          activeTabId={activeTabId}
          onSelect={handleTabSelect}
          manageTabs={canManageTabs}
          onAdd={canManageTabs ? handleAddTab : undefined}
          onRename={canManageTabs ? handleRenameTab : undefined}
          onTogglePin={canManageTabs ? handleTogglePin : undefined}
          onToggleDefault={canManageTabs ? handleToggleDefault : undefined}
          onDuplicate={canManageTabs ? handleDuplicateTab : undefined}
          onDelete={canManageTabs ? setDeletingTab : undefined}
        />

        {activeTabId ? (
          <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden'>
            <FilterBar
              search={search}
              onSearchChange={setSearch}
              timeRange={timeRange}
              onTimeRangeChange={handleTimeRangeChange}
              customDateRange={customDateRange}
              onCustomDateRangeChange={handleCustomDateRangeChange}
              centerFilter={centerFilter}
              onCenterFilterChange={handleCenterFilterChange}
              clientFilter={clientFilter}
              onClientFilterChange={handleClientFilterChange}
              centers={centerAccess?.data ?? []}
              centersLoading={centerAccess?.status === 'loading'}
              clientOptions={clientOptions}
              enabledFilters={enabledFilters}
              isSetupMode={canManageTabs}
              onEnabledFiltersChange={canWrite ? handleEnabledFiltersChange : undefined}
              onAddWidget={canWrite ? () => setAddWidgetOpen(true) : undefined}
              addWidgetDisabled={!activeTabId}
              showAddWidget={canWrite && Boolean(activeTabId)}
            />

            {chartsError && (
              <div className='mx-8 mb-2 flex items-center justify-between gap-3 rounded-lg border border-error-light bg-error-lighter px-4 py-2 text-error-base'>
                <span className='paragraph-small'>{chartsError}</span>
                <Button.Root variant='error' mode='stroke' size='xsmall' onClick={reloadCharts}>
                  Retry
                </Button.Root>
              </div>
            )}

            <ChartGrid
              key={activeTabId}
              charts={filteredCharts}
              loading={loadingCharts}
              tabFilters={tabFilters}
              onEdit={canWrite ? handleEditChart : undefined}
              onDelete={canWrite ? setDeletingChart : undefined}
              onDrillDown={handleChartDrillDown}
              activeDrillDownChartId={chartBuilderState.open ? chartBuilderState.editId : null}
              drillDownFilter={chartBuilderState.drillDownFilter}
              isSetupMode={canManageTabs}
              canManage={canWrite}
              onPositionChange={canWrite ? handleChartPositionChange : undefined}
            />
          </div>
        ) : canManageTabs ? (
          <div className='flex flex-1 flex-col items-center justify-center py-24'>
            <p className='paragraph-small text-text-soft-400'>
              No tabs yet. Use Add above to get started.
            </p>
          </div>
        ) : (
          <div className='flex flex-1 flex-col items-center justify-center gap-3 py-24'>
            <p className='paragraph-small text-text-soft-400'>
              This dashboard has no tabs configured yet.
            </p>
            <Button.Root variant='neutral' mode='stroke' onClick={backToList}>
              Back to Dashboards
            </Button.Root>
          </div>
        )}
      </div>
    );
  })();

  const modals = (
    <>
      <TabFormModal
        open={canManageTabs && tabModalOpen}
        onOpenChange={setTabModalOpen}
        dashboardId={dashboardId}
        initialValue={editingTab}
        onSaved={reloadDashboard}
      />

      <AddWidgetModal
        open={canWrite && addWidgetOpen}
        onOpenChange={setAddWidgetOpen}
        onSelect={handleWidgetTypeSelected}
      />

      {chartBuilderState.open && (
        <ChartBuilderModal
          open={chartBuilderState.open}
          onOpenChange={handleChartBuilderOpenChange}
          dashboardTabId={activeTabId}
          chartTypeSeed={chartBuilderState.chartType}
          editChartId={chartBuilderState.editId}
          initialDrillDownFilter={chartBuilderState.drillDownFilter}
          initialSidePanelTab={chartBuilderState.initialSidePanelTab}
          readOnly={!canWrite}
          onSaved={reloadCharts}
        />
      )}

      {canManageTabs && deletingTab && (
        <DeleteConfirmModal
          isOpen={Boolean(deletingTab)}
          onOpenChange={(v) => (v ? null : setDeletingTab(null))}
          title='Delete tab?'
          description={`This will delete "${deletingTab.display_name}" and all its charts.`}
          onConfirm={confirmDeleteTab}
        />
      )}

      {canWrite && deletingChart && (
        <DeleteConfirmModal
          isOpen={Boolean(deletingChart)}
          onOpenChange={(v) => (v ? null : setDeletingChart(null))}
          title='Delete chart?'
          description={`Remove "${deletingChart.title}" from this dashboard?`}
          onConfirm={confirmDeleteChart}
        />
      )}
    </>
  );

  if (embedded) {
    return (
      <>
        <div className='flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden'>{content}</div>
        {modals}
      </>
    );
  }

  return (
    <PageLayout showDefaultHeader={false} contentAreaClassName='overflow-hidden'>
      <div className='flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden'>{content}</div>
      {modals}
    </PageLayout>
  );
}
