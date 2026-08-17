import React, { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import CrmLeadsToolbar from '@/components/crm-leads/crm-leads-toolbar';
import CrmPipelineTabBar from '@/components/crm-leads/crm-pipeline-tab-bar';
import CrmLeadsTab from '@/components/crm-leads/crm-leads-tab';
import CrmLeadsTable from '@/components/crm-leads/crm-leads-table';
import { useDebounce } from '@/hooks/use-debounce';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import { useOffsetPagination } from '@/hooks/use-offset-pagination';
import { DEFAULT_LIST_PAGE_SIZE, flattenGroupedListResults } from '@/utils/list-pagination-utils';
import {
  DEFAULT_LEAD_FILTERS,
  LEAD_COLUMN_STORAGE_KEY,
  LEAD_RESIZE_ENABLED_KEY,
} from '@/components/crm-leads/constants';
import { getCrmLeadsColumnPreferences, saveCrmLeadsColumnPreferences } from '@/redux/settingSlice';
import { buildCrmLeadApiFilters } from '@/utils/date-utils';
import { showSuccessToast, showErrorToast } from '@/utils/error-utils';
import {
  listCrmLeads,
  applyLeadListTabCounts,
  getCrmLeadOptions,
  getCrmStages,
  getSalesOwnerList,
  getInsideSalesList,
  updateCrmLead,
  buildLeadFieldPayload,
} from '@/api/crmLeads';
import { disableCrmLead } from '@/services/cp-accounts-service';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import {
  getCpAccountLeadsFiltersStorageKey,
  compactCpAccountLeadsFiltersForStorage,
  mergeStoredCpAccountLeadsFilters,
} from './constants';

const CrmLeadCreateDrawer = lazy(() => import('@/components/crm-leads/crm-lead-create-drawer'));

const REACT_TABLE_ID = 'crm-leads-table';
const SORT_FIELD_MAP = {
  name: 'lead_name',
  created_at: 'creation',
  account: 'account',
  lifecycle_stage: 'lifecycle_stage',
  status: 'status',
  sales_owner: 'sales_owner',
  inside_sales: 'inside_sales',
  monthly_value: 'est_monthly_value',
  lead_source: 'lead_source',
  city: 'city',
  lead_size: 'lead_size',
  external_id: 'external_id',
  service_id: 'service_id',
  last_modified_at: 'modified',
};

const GROUP_BY_FIELD_MAP = {
  account: 'account',
  lifecycle_stage: 'lifecycle_stage',
  status: 'status',
  sales_owner: 'sales_owner',
  source: 'source',
  city: 'city',
  product: 'product',
  lead_source: 'lead_source',
  lead_relevance: 'lead_relevance',
  need_urgency: 'need_urgency',
  info_call_status: 'info_call_status',
  lost_reason: 'lost_reason',
};

/** Same row shape as `crm-leads.jsx` → `CrmLeadsTable`. */
function normalizeLead(row) {
  const so = row.sales_owner || {};
  const insideSo = row.inside_sales || {};
  return {
    id: row.name,
    name: row.lead_name || row.name,
    contact: row.contact_name || row.contact || '-',
    contact_name: row.contact_name || row.contact || '-',
    account: row.account || '-',
    cp_account: row.cp_account || '',
    cp_account_id: row.cp_account_id || '',
    created_at: row.created_at ?? row.creation ?? '-',
    pipeline: row.pipeline ?? '',
    pipeline_label: row.pipeline_label ?? '',
    lifecycle_stage: row.lifecycle_stage || '-',
    lifecycle_stage_label: row.lifecycle_stage_label ?? '',
    lifecycle_stage_color: row.lifecycle_stage_color ?? '',
    life_cycle_stage_status: row.life_cycle_stage_status ?? '',
    life_cycle_stage_status_label: row.life_cycle_stage_status_label ?? '',
    life_cycle_stage_status_color: row.life_cycle_stage_status_color ?? '',
    pipeline_color: row.pipeline_color ?? '',
    status: row.status || '-',
    lead_temperature: row.lead_temperature ?? '',
    sales_owner: so.name || so.email || '-',
    inside_sales: insideSo.name || insideSo.email || '-',
    product: row.product || '-',
    seats: row.no_of_seats ?? row.lead_size ?? '-',
    monthly_value: row.est_monthly_value ?? '',
    est_lifetime_value: row.est_lifetime_value ?? '',
    source: row.source || '-',
    lead_source: row.lead_source || '',
    city: row.city || '-',
    lead_size: row.lead_size ?? '',
    no_of_seats: row.no_of_seats ?? '',
    lost_cause: row.lost_cause ?? row.lost_reason ?? '',
    need_urgency: row.need_urgency ?? '',
    lead_relevance: row.lead_relevance ?? '',
    info_call_status: row.info_call_status ?? '',
    campaign: row.campaign ?? '',
    medium: row.medium ?? '',
    term: row.term ?? '',
    content: row.content ?? '',
    gclid: row.gclid ?? '',
    ad_group: row.ad_group ?? '',
    landing_page_url: row.landing_page_url ?? '',
    contact_from_url: row.contact_from_url ?? '',
    contact_message: row.contact_message ?? '',
    contact_subject: row.contact_subject ?? '',
    delacon_info_date: row.delacon_info_date ?? row.info_date ?? '',
    delacon_info_termination_point:
      row.delacon_info_termination_point ?? row.info_termination_point ?? '',
    delacon_info_call_status: row.delacon_info_call_status ?? row.info_call_status ?? '',
    delacon_web_info_search_engine:
      row.delacon_web_info_search_engine ?? row.web_info_search_engine ?? '',
    delacon_web_info_search_type:
      row.delacon_web_info_search_type ?? row.web_info_search_type ?? '',
    delacon_location_city: row.delacon_location_city ?? row.city_from_delacon ?? '',
    delacon_adwords_info_conversions:
      row.delacon_adwords_info_conversions ?? row.adwords_info_conversions ?? '',
    delacon_adwords_info_cpc: row.delacon_adwords_info_cpc ?? row.adwords_info_cpc ?? '',
    delacon_adwords_info_cost: row.delacon_adwords_info_cost ?? row.adwords_info_cost ?? '',
    delacon_info_caller: row.delacon_info_caller ?? row.info_caller ?? '',
    delacon_adwords_info_clicks: row.delacon_adwords_info_clicks ?? row.adwords_info_clicks ?? '',
    delacon_call_recording: row.delacon_call_recording ?? row.call_recordings ?? '',
    delacon_landing_page: row.delacon_landing_page ?? row.landing_page_delacon ?? '',
    delacon_web_info_page_called_from:
      row.delacon_web_info_page_called_from ?? row.web_info_page_called_from ?? '',
    delacon_inside_sales_fr_tat: row.delacon_inside_sales_fr_tat ?? row.inside_sales_fr_tat ?? '',
    delacon_sales_fr_tat: row.delacon_sales_fr_tat ?? row.sales_fr_tat ?? '',
    external_id: row.external_id ?? '',
    service_id: row.service_id ?? '',
    service_name: row.service_name ?? '',
    agent_name: row.agent_name ?? '',
    agent_phone: row.agent_phone ?? '',
    call_start_time: row.call_start_time ?? '',
    call_end_time: row.call_end_time ?? '',
    ip_address: row.ip_address ?? '',
    tracking_number: row.tracking_number ?? '',
    true_pulse_data_bridge_id: row.true_pulse_data_bridge_id ?? '',
    call_type: row.call_type ?? '',
    call_duration: row.call_duration ?? '',
    page_called_from: row.page_called_from ?? '',
    referrer: row.referrer ?? '',
    device: row.device ?? '',
    browser: row.browser ?? '',
    call_flow: row.call_flow ?? '',
    utm_content: row.utm_content ?? '',
    last_modified_at: row.last_modified_at ?? row.modified ?? '',
    is_repeated: Boolean(row.is_repeated),
    call_count: Number(row.call_count) || 0,
  };
}

function loadWidthOverrides() {
  try {
    const raw = localStorage.getItem(LEAD_COLUMN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveWidthOverrides(overrides) {
  try {
    localStorage.setItem(LEAD_COLUMN_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore
  }
}

function loadResizeEnabled() {
  try {
    const raw = localStorage.getItem(LEAD_RESIZE_ENABLED_KEY);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

function saveResizeEnabled(enabled) {
  try {
    localStorage.setItem(LEAD_RESIZE_ENABLED_KEY, String(enabled));
  } catch {
    // ignore
  }
}

/** Tab-count filters scoped to CP Account — mirrors `crm-leads.jsx` + `cp_account`. */
function buildCpLeadTabCountFilters(
  appliedFilters,
  selectedPipelineId,
  cpAccountId,
  { omitLifecycle = false } = {},
) {
  return buildCrmLeadApiFilters(
    {
      ...appliedFilters,
      status: [],
      lifecycle_stage: omitLifecycle ? [] : appliedFilters.lifecycle_stage,
    },
    {
      ...(cpAccountId ? { cp_account: ['=', cpAccountId] } : {}),
      ...(selectedPipelineId ? { pipeline: ['=', selectedPipelineId] } : {}),
    },
  );
}

const CpAccountLeadsSection = ({ account }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const tableRef = useRef(null);
  const prevPipelineIdRef = useRef('');
  const cpAccountId = account?.id || '';

  const [leads, setLeads] = useState([]);
  const [leadOptions, setLeadOptions] = useState({
    pipelines: [],
    lead_relevance: [],
    need_urgency: [],
    info_call_status: [],
    lost_reason: [],
    lead_source: [],
    product: [],
    stages: [],
    stageStatusMap: {},
    allStatuses: [],
    sales_owner: [],
    inside_sales: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const { pagination, pageSize, applyPaginationMeta, paginationProps, fetchRef } =
    useOffsetPagination({ initialPageSize: DEFAULT_LIST_PAGE_SIZE, initialPage: 0 });
  const [stageTabCounts, setStageTabCounts] = useState({ all: 0 });
  const [pipelineTabCounts, setPipelineTabCounts] = useState({});

  const [searchTerm, setSearchTerm] = useState('');
  // Per-cpAccount sessionStorage slot for the Leads toolbar dropdown
  // selections. Each CP Account owns an independent slot so navigating between
  // profiles doesn't bleed filters.
  const leadsFiltersStorageKey = useMemo(
    () => getCpAccountLeadsFiltersStorageKey(cpAccountId),
    [cpAccountId],
  );
  const [persistedAppliedFilters, setAppliedFilters] = usePersistedFilters({
    storageKey: leadsFiltersStorageKey,
    defaultFilters: DEFAULT_LEAD_FILTERS,
    compactFilters: compactCpAccountLeadsFiltersForStorage,
  });
  // Public `appliedFilters` always points at the normalised shape so downstream
  // `.length` / `.from` reads can't trip over a partial persisted blob (e.g.
  // ISO strings still need Date hydration, missing keys must default to []).
  const appliedFilters = useMemo(
    () => mergeStoredCpAccountLeadsFilters(DEFAULT_LEAD_FILTERS, persistedAppliedFilters),
    [persistedAppliedFilters],
  );
  const [selectedPipelineId, setSelectedPipelineId] = useState('');
  const [selectedStageTab, setSelectedStageTab] = useState('all');
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [sorting, setSorting] = useState([]);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [columnWidthOverrides, setColumnWidthOverrides] = useState(() => loadWidthOverrides());
  const [resizeColumnsEnabled, setResizeColumnsEnabled] = useState(() => loadResizeEnabled());

  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const effectiveLifecycleStages = useMemo(() => {
    if (selectedStageTab && selectedStageTab !== 'all') {
      return [selectedStageTab];
    }
    if (appliedFilters.lifecycle_stage?.length > 0) {
      return appliedFilters.lifecycle_stage;
    }
    return [];
  }, [selectedStageTab, appliedFilters.lifecycle_stage]);

  const leadStageTabs = useMemo(
    () => [
      { value: 'all', label: 'All' },
      ...(Array.isArray(leadOptions.stages) ? leadOptions.stages : []),
    ],
    [leadOptions.stages],
  );

  useEffect(() => {
    Promise.all([getCrmLeadOptions(), getSalesOwnerList(), getInsideSalesList()])
      .then(([options, salesOwner, insideSales]) => {
        setLeadOptions((prev) => ({
          ...prev,
          ...(options && typeof options === 'object' ? options : {}),
          sales_owner: Array.isArray(salesOwner) ? salesOwner : [],
          inside_sales: Array.isArray(insideSales) ? insideSales : [],
        }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const pl = leadOptions.pipelines;
    if (!Array.isArray(pl) || pl.length === 0) return;
    setSelectedPipelineId((prev) => {
      if (prev && pl.some((p) => p.value === prev)) return prev;
      return pl[0].value;
    });
  }, [leadOptions.pipelines]);

  useEffect(() => {
    if (!selectedPipelineId) return;
    let cancelled = false;
    getCrmStages(selectedPipelineId)
      .then((stagesData) => {
        if (cancelled) return;
        setLeadOptions((prev) => ({ ...prev, ...stagesData }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedPipelineId]);

  useEffect(() => {
    if (!selectedPipelineId) return;
    if (prevPipelineIdRef.current && prevPipelineIdRef.current !== selectedPipelineId) {
      setAppliedFilters((prev) => ({
        ...prev,
        lifecycle_stage: [],
        status: [],
      }));
      setSelectedStageTab('all');
    }
    prevPipelineIdRef.current = selectedPipelineId;
  }, [selectedPipelineId]);

  useEffect(() => {
    if (selectedStageTab === 'all') return;
    const stages = leadOptions.stages || [];
    const exists = stages.some((s) => s.value === selectedStageTab);
    if (!exists) setSelectedStageTab('all');
  }, [leadOptions.stages, selectedStageTab]);

  // Sync the lifecycle-stage tab strip from the filter dropdown:
  // - exactly one selected stage that maps to a tab → activate that tab
  // - empty / multi-select / unknown stage → fall back to "All"
  // The reverse direction is intentionally NOT implemented; clicking a tab
  // already wins via `effectiveLifecycleStages` without polluting the filter.
  useEffect(() => {
    const stages = leadOptions.stages || [];
    if (stages.length === 0) return;
    const list = Array.isArray(appliedFilters.lifecycle_stage)
      ? appliedFilters.lifecycle_stage
      : [];
    if (list.length === 1 && stages.some((s) => s.value === list[0])) {
      const next = list[0];
      setSelectedStageTab((prev) => (prev === next ? prev : next));
    } else {
      setSelectedStageTab((prev) => (prev === 'all' ? prev : 'all'));
    }
  }, [appliedFilters.lifecycle_stage, leadOptions.stages]);

  const apiParams = useMemo(() => {
    const sortCol = sorting[0];
    const orderBy = sortCol ? SORT_FIELD_MAP[sortCol.id] || 'creation' : 'creation';
    const orderDirection = sortCol ? (sortCol.desc ? 'desc' : 'asc') : 'desc';

    const filters = buildCrmLeadApiFilters(
      { ...appliedFilters, lifecycle_stage: [] },
      {
        ...(cpAccountId && { cp_account: ['=', cpAccountId] }),
        ...(effectiveLifecycleStages.length > 0 && {
          lifecycle_stage: ['in', effectiveLifecycleStages],
        }),
        ...(selectedPipelineId && { pipeline: ['=', selectedPipelineId] }),
      },
    );

    const apiGroupBy = GROUP_BY_FIELD_MAP[groupBy] || null;
    return { orderBy, orderDirection, filters, apiGroupBy };
  }, [sorting, appliedFilters, groupBy, selectedPipelineId, effectiveLifecycleStages, cpAccountId]);

  const fetchLeads = useCallback(
    async (fetchPage, append = false, pageSizeParam = undefined) => {
      if (!cpAccountId) return;
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        const { orderBy, orderDirection, filters, apiGroupBy } = apiParams;
        const result = await listCrmLeads({
          keyword: debouncedSearchTerm || undefined,
          page: fetchPage,
          pageSize: pageSizeParam ?? pageSize,
          orderBy,
          orderDir: orderDirection,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
          groupBy: apiGroupBy || undefined,
          groupOrder: apiGroupBy ? groupOrder : undefined,
        });

        const flatRows = flattenGroupedListResults(result, normalizeLead);

        if (append) {
          setLeads((previous) => [...previous, ...flatRows]);
        } else {
          setLeads(flatRows);
        }
        applyPaginationMeta(result, fetchPage);
        if (
          !applyLeadListTabCounts(result, {
            setPipelineTabCounts,
            setStageTabCounts,
            droppedTabValue: null,
          })
        ) {
          showErrorToast('Lead tab counts unavailable');
        }
      } catch (error_) {
        setError(error_);
        showErrorToast('Failed to load leads');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [apiParams, debouncedSearchTerm, groupOrder, cpAccountId, pageSize, applyPaginationMeta],
  );

  fetchRef.current = fetchLeads;

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        k: debouncedSearchTerm,
        f: appliedFilters,
        s: sorting,
        g: groupBy,
        go: groupOrder,
        pl: selectedPipelineId,
        st: selectedStageTab,
        cp: cpAccountId,
      }),
    [
      debouncedSearchTerm,
      appliedFilters,
      sorting,
      groupBy,
      groupOrder,
      selectedPipelineId,
      selectedStageTab,
      cpAccountId,
    ],
  );

  const fetchLeadsRef = useRef(fetchLeads);
  fetchLeadsRef.current = fetchLeads;

  useEffect(() => {
    if (cpAccountId) {
      fetchLeadsRef.current(1, false);
    }
  }, [filterKey, cpAccountId]);

  const persistColumnConfig = useCallback(
    async (cols) => {
      await dispatch(
        saveCrmLeadsColumnPreferences({ columns: cols, react_table_id: REACT_TABLE_ID }),
      ).unwrap();
    },
    [dispatch],
  );

  const fetchColumnConfig = useCallback(async () => {
    const result = await dispatch(
      getCrmLeadsColumnPreferences({ react_table_id: REACT_TABLE_ID }),
    ).unwrap();
    return result?.message ?? result?.data ?? result ?? [];
  }, [dispatch]);

  const handleColumnResize = useCallback((columnId, width) => {
    setColumnWidthOverrides((previous) => {
      const next = { ...previous, [columnId]: width };
      saveWidthOverrides(next);
      return next;
    });
  }, []);

  const handleResizeEnabledChange = useCallback((enabled) => {
    setResizeColumnsEnabled(enabled);
    saveResizeEnabled(enabled);
  }, []);

  const handleResetColumnSizes = useCallback(() => {
    setColumnWidthOverrides({});
    saveWidthOverrides({});
  }, []);

  const columnWidths = useMemo(() => columnWidthOverrides, [columnWidthOverrides]);

  const handleSearchChange = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const handleFiltersChange = useCallback((newFilters) => {
    setAppliedFilters((previous) => ({ ...previous, ...newFilters }));
  }, []);

  const handleSortingChange = useCallback((newSorting) => {
    setSorting(newSorting);
  }, []);

  const handleGroupByChange = useCallback((value) => {
    setGroupBy(value);
  }, []);

  const handleGroupOrderChange = useCallback((value) => {
    setGroupOrder(value);
  }, []);

  const handleRetry = useCallback(() => {
    fetchLeads(1, false);
  }, [fetchLeads]);

  const handleRowClick = useCallback(
    (row) => {
      const id = row.id || row.name || '';
      navigate(`/crm/leads/${encodeURIComponent(id)}`);
    },
    [navigate],
  );

  const handleDisableLeadClick = useCallback(
    async (leadName) => {
      const result = await disableCrmLead(leadName);
      if (result.error) {
        showErrorToast(result.error, { defaultMessage: 'Failed to disable lead.' });
        throw new Error(result.error);
      }
      showSuccessToast('Lead disabled.');
      await fetchLeads(1, false);
    },
    [fetchLeads],
  );

  const handleFieldUpdate = useCallback(
    async (leadId, fieldKey, value) => {
      if (!leadId) return;
      const apiField = fieldKey === 'lost_cause' ? 'lost_reason' : fieldKey;
      try {
        await updateCrmLead(leadId, buildLeadFieldPayload(apiField, value));
        showSuccessToast('Lead updated.');
        await fetchLeads(pagination.page || 1, false);
      } catch {
        showErrorToast('Failed to update lead');
      }
    },
    [fetchLeads, pagination.page],
  );

  const handleCreateLeadSuccess = useCallback(async () => {
    setIsCreateDrawerOpen(false);
    await fetchLeads(1, false);
  }, [fetchLeads]);

  // ── Page pagination ──────────────────────────────────────────────────────
  const cpContactOptions = useMemo(() => {
    const contacts = Array.isArray(account?.contacts) ? account.contacts : [];
    return contacts.map((c) => ({
      value: c.id || c.name,
      label: c.name || c.email || c.id || '–',
    }));
  }, [account?.contacts]);

  const tableRows = useMemo(
    () =>
      leads.map((l) => ({
        ...l,
        _onDelete: () => handleDisableLeadClick(l.id || l.name),
      })),
    [leads, handleDisableLeadClick],
  );

  if (!cpAccountId) {
    return (
      <div className='flex flex-1 flex-col overflow-hidden bg-white p-6'>
        <p className='text-paragraph-sm text-text-sub-600'>No account selected.</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full min-h-0 overflow-hidden bg-white'>
      <div className='flex flex-1 flex-col gap-4 px-6 pt-4 pb-0 min-h-0'>
        <div className='w-full flex flex-col gap-1 shrink-0'>
          <CrmPipelineTabBar
            pipelines={leadOptions.pipelines || []}
            value={selectedPipelineId}
            counts={pipelineTabCounts}
            onValueChange={setSelectedPipelineId}
          />
          <CrmLeadsTab
            tabs={leadStageTabs}
            value={selectedStageTab}
            counts={stageTabCounts}
            onValueChange={setSelectedStageTab}
          />
        </div>

        <div className='shrink-0'>
          <CrmLeadsToolbar
            searchValue={searchTerm}
            onSearchChange={handleSearchChange}
            tableRef={tableRef}
            onAddLead={() => setIsCreateDrawerOpen(true)}
            onFiltersChange={handleFiltersChange}
            appliedFilters={appliedFilters}
            groupBy={groupBy}
            onGroupByChange={handleGroupByChange}
            groupOrder={groupOrder}
            onGroupOrderChange={handleGroupOrderChange}
            leadOptions={leadOptions}
            resizeColumnsEnabled={resizeColumnsEnabled}
            onResizeEnabledChange={handleResizeEnabledChange}
            onResetColumnSizes={handleResetColumnSizes}
            hideGroupBy
            hideTableVariant
            hideColumnManagerFooter
          />
        </div>

        <PaginatedTableLayout scrollable={false} grouped={Boolean(groupBy)} {...paginationProps}>
          <CrmLeadsTable
            ref={tableRef}
            rows={tableRows}
            isLoading={isLoading}
            error={error}
            onRetry={handleRetry}
            variant='compact'
            groupBy={groupBy}
            groupOrder={groupOrder}
            sorting={sorting}
            onSortingChange={handleSortingChange}
            columnWidths={columnWidths}
            onColumnResize={resizeColumnsEnabled ? handleColumnResize : null}
            persistColumnConfig={persistColumnConfig}
            fetchColumnConfig={fetchColumnConfig}
            columnConfigId={REACT_TABLE_ID}
            onRowClick={handleRowClick}
            leadOptions={leadOptions}
            onFieldUpdate={handleFieldUpdate}
            freezeColumns
          />
        </PaginatedTableLayout>
      </div>

      <Suspense fallback={null}>
        <CrmLeadCreateDrawer
          open={isCreateDrawerOpen}
          onOpenChange={setIsCreateDrawerOpen}
          onSuccess={handleCreateLeadSuccess}
          leadOptions={leadOptions}
          defaultCpAccountId={account?.id ?? ''}
          defaultCpAccountLabel={account?.legalName || account?.brandName || account?.id || ''}
          defaultPipelineId={selectedPipelineId}
          defaultLifecycleStageId={selectedStageTab === 'all' ? '' : selectedStageTab}
          lockCpAccount
          cpContactOptions={cpContactOptions}
        />
      </Suspense>
    </div>
  );
};

export default CpAccountLeadsSection;
