import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { useCrmLeadNavigation } from '@/hooks/use-crm-lead-navigation';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import { useOffsetPagination } from '@/hooks/use-offset-pagination';
import { DEFAULT_LIST_PAGE_SIZE, flattenGroupedListResults } from '@/utils/list-pagination-utils';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { getCrmLeadsColumnPreferences, saveCrmLeadsColumnPreferences } from '@/redux/settingSlice';
import CrmPipelineTabBar from '@/components/crm-leads/crm-pipeline-tab-bar';
import { buildCrmLeadApiFilters, normalizeDatetimeFilter } from '@/utils/date-utils';
import CrmLeadsTab from '@/components/crm-leads/crm-leads-tab';
import CrmLeadsToolbar from '@/components/crm-leads/crm-leads-toolbar';
import CrmLeadsTable from '@/components/crm-leads/crm-leads-table';
import CrmLeadCreateDrawer from '@/components/crm-leads/crm-lead-create-drawer';
import {
  DEFAULT_LEAD_FILTERS,
  REACT_TABLE_ID_CONTACT_LEADS,
  CONTACT_LEADS_COLUMN_STORAGE_KEY,
  CONTACT_LEADS_RESIZE_ENABLED_KEY,
} from '@/components/crm-leads/constants';
import {
  listCrmLeads,
  applyLeadListTabCounts,
  getCrmLeadOptions,
  getCrmStages,
  getSalesOwnerList,
  getInsideSalesList,
  updateCrmLead,
  buildLeadFieldPayload,
  removeCrmLeadContact,
} from '@/api/crmLeads';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';

const CRM_CONTACT_LEADS_FILTER_SESSION_KEY_PREFIX = 'crm-contact-detail-leads-view-filter-dropdown';
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

function mergeStoredCrmLeadDropdownFilters(stored, defaultFilters) {
  const merged = {
    ...defaultFilters,
    ...(stored && typeof stored === 'object' ? stored : {}),
    created_at: normalizeDatetimeFilter(stored?.created_at ?? defaultFilters.created_at),
    last_modified_at: normalizeDatetimeFilter(
      stored?.last_modified_at ?? defaultFilters.last_modified_at,
    ),
  };
  for (const key of [
    'lifecycle_stage',
    'status',
    'sales_owner',
    'product',
    'lead_source',
    'city',
    'lead_relevance',
    'need_urgency',
    'info_call_status',
    'lost_reason',
  ]) {
    merged[key] = Array.isArray(stored?.[key]) ? stored[key] : [];
  }
  return merged;
}

function normalizeLead(row) {
  const so = row.sales_owner || {};
  const insideSo = row.inside_sales || {};
  return {
    id: row.name,
    name: row.lead_name || row.name,
    contact: row.contact || '',
    contact_name: row.contact_name || row.contact || '',
    contacts: Array.isArray(row.contacts)
      ? row.contacts
          .map((c) => ({
            id: String(c?.id || c?.contact || '').trim(),
            name: String(c?.name || c?.contact_name || c?.id || c?.contact || '').trim(),
            is_primary: Number(c?.is_primary) === 1 ? 1 : 0,
          }))
          .filter((c) => c.id || c.name)
      : [],
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
    const raw = localStorage.getItem(CONTACT_LEADS_COLUMN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveWidthOverrides(overrides) {
  try {
    localStorage.setItem(CONTACT_LEADS_COLUMN_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore
  }
}

function loadResizeEnabled() {
  try {
    const raw = localStorage.getItem(CONTACT_LEADS_RESIZE_ENABLED_KEY);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

function saveResizeEnabled(enabled) {
  try {
    localStorage.setItem(CONTACT_LEADS_RESIZE_ENABLED_KEY, String(enabled));
  } catch {
    // ignore
  }
}

/**
 * Lead list + create drawer for a single CRM Contact (Leads tab inside contact detail).
 * - Default filter: contact = [contact.name]
 * - Create drawer: contact field hidden (fixedContact), account pre-filled from contact's account
 * - Remove action: unlinks lead from contact (sets contact to empty, is_primary to 0)
 */
const CrmContactLeadsTab = ({ contact }) => {
  const dispatch = useDispatch();
  const { onLeadRowClick, onLeadContactClick } = useCrmLeadNavigation();
  const tableRef = useRef(null);
  const prevPipelineIdRef = useRef('');

  const contactId = contact?.name || '';
  const accountId = contact?.associate_account || contact?.account || '';

  const defaultFilters = useMemo(
    () => ({
      ...DEFAULT_LEAD_FILTERS,
      contact: contactId ? [contactId] : [],
    }),
    [contactId],
  );

  const [leads, setLeads] = useState([]);
  const [leadToRemove, setLeadToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { pagination, pageSize, applyPaginationMeta, paginationProps, fetchRef } =
    useOffsetPagination({ initialPageSize: DEFAULT_LIST_PAGE_SIZE, initialPage: 0 });
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
  const LEADS_FILTER_SESSION_KEY = `${CRM_CONTACT_LEADS_FILTER_SESSION_KEY_PREFIX}-${contactId}`;
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPipelineId, setSelectedPipelineId] = useState('');
  const [selectedStageTab, setSelectedStageTab] = useState('all');
  const [stageTabCounts, setStageTabCounts] = useState({ all: 0 });
  const [pipelineTabCounts, setPipelineTabCounts] = useState({});
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [sorting, setSorting] = useState([]);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [columnWidthOverrides, setColumnWidthOverrides] = useState(() => loadWidthOverrides());
  const [resizeColumnsEnabled, setResizeColumnsEnabled] = useState(() => loadResizeEnabled());

  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: LEADS_FILTER_SESSION_KEY,
    defaultFilters,
    persistObjectSubkeysTruthyKeys: {
      created_at: ['preset', 'date', 'from', 'to'],
      last_modified_at: ['preset', 'date', 'from', 'to'],
    },
  });

  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);

  // 1. Initialize from persistence
  useEffect(() => {
    if (filtersInitialized) return;
    if (persistedFilters) {
      setAppliedFilters(mergeStoredCrmLeadDropdownFilters(persistedFilters, defaultFilters));
    }
    setFiltersInitialized(true);
  }, [persistedFilters, filtersInitialized, defaultFilters]);

  // 2. Persist to storage
  useEffect(() => {
    if (!filtersInitialized) return;

    const compact = compactFiltersForSessionStorage(appliedFilters, defaultFilters, {
      objectSubkeysTruthyKeys: {
        created_at: ['preset', 'date', 'from', 'to'],
        last_modified_at: ['preset', 'date', 'from', 'to'],
      },
    });
    if (JSON.stringify(compact) !== JSON.stringify(persistedFilters)) {
      setPersistedFilters(compact);
    }
  }, [appliedFilters, persistedFilters, filtersInitialized, setPersistedFilters, defaultFilters]);

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

  // Keep appliedFilters.contact in sync with defaultFilters when contact changes
  useEffect(() => {
    if (!filtersInitialized) return;
    setAppliedFilters((prev) => ({
      ...prev,
      contact: defaultFilters.contact,
    }));
  }, [defaultFilters.contact, filtersInitialized, setAppliedFilters]);

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

  const apiParams = useMemo(() => {
    const sortCol = sorting[0];
    const orderBy = sortCol ? SORT_FIELD_MAP[sortCol.id] || 'creation' : 'creation';
    const orderDirection = sortCol ? (sortCol.desc ? 'desc' : 'asc') : 'desc';

    const filters = buildCrmLeadApiFilters(
      { ...appliedFilters, lifecycle_stage: [] },
      {
        ...(appliedFilters.contact?.length > 0 && {
          contact: ['in', appliedFilters.contact],
        }),
        ...(effectiveLifecycleStages.length > 0 && {
          lifecycle_stage: ['in', effectiveLifecycleStages],
        }),
        ...(selectedPipelineId && { pipeline: ['=', selectedPipelineId] }),
      },
    );

    const apiGroupBy = GROUP_BY_FIELD_MAP[groupBy] || null;
    return { orderBy, orderDirection, filters, apiGroupBy };
  }, [sorting, appliedFilters, groupBy, selectedPipelineId, effectiveLifecycleStages]);

  const fetchLeads = useCallback(
    async (fetchPage, _append = false, pageSizeParam = undefined) => {
      if (!contactId) return;
      setIsLoading(true);
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

        setLeads(flatRows);
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
      }
    },
    [apiParams, debouncedSearchTerm, groupOrder, contactId, pageSize, applyPaginationMeta],
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
      }),
    [
      debouncedSearchTerm,
      appliedFilters,
      sorting,
      groupBy,
      groupOrder,
      selectedPipelineId,
      selectedStageTab,
    ],
  );

  const fetchLeadsRef = useRef(fetchLeads);
  fetchLeadsRef.current = fetchLeads;

  useEffect(() => {
    if (contactId && filtersInitialized) {
      fetchLeadsRef.current(1, false);
    }
  }, [filterKey, contactId, filtersInitialized]);

  const columnWidths = useMemo(() => columnWidthOverrides, [columnWidthOverrides]);

  const handleColumnResize = useCallback((columnId, width) => {
    setColumnWidthOverrides((prev) => {
      const next = { ...prev, [columnId]: width };
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

  const persistColumnConfig = useCallback(
    async (cols) => {
      await dispatch(
        saveCrmLeadsColumnPreferences({
          columns: cols,
          react_table_id: REACT_TABLE_ID_CONTACT_LEADS,
        }),
      ).unwrap();
    },
    [dispatch],
  );

  const fetchColumnConfig = useCallback(async () => {
    const result = await dispatch(
      getCrmLeadsColumnPreferences({ react_table_id: REACT_TABLE_ID_CONTACT_LEADS }),
    ).unwrap();
    return result?.message ?? result?.data ?? result ?? [];
  }, [dispatch]);

  const handleFiltersChange = useCallback(
    (newFilters) => {
      setAppliedFilters((prev) => ({
        ...prev,
        ...newFilters,
        contact: contactId ? [contactId] : newFilters.contact || [],
      }));

      if (Array.isArray(newFilters.lifecycle_stage)) {
        setSelectedStageTab(
          newFilters.lifecycle_stage.length === 1 ? newFilters.lifecycle_stage[0] : 'all',
        );
      }
    },
    [contactId],
  );

  const handleRemoveLeadClick = useCallback((lead) => {
    setLeadToRemove(lead);
  }, []);

  const handleRemoveLeadConfirm = useCallback(
    async (lead) => {
      if (!lead) return;
      const docId = lead.id ?? lead.name;
      if (!docId) {
        showErrorToast('Lead id not found');
        return;
      }
      setLeadToRemove(null);
      setIsRemoving(true);
      try {
        await removeCrmLeadContact(docId, contactId);
        showSuccessToast('Lead unlinked from contact.');
        await fetchLeads(1, false);
      } catch (error_) {
        const msg =
          error_?.response?.data?.message ||
          error_?.response?.data?.exception ||
          'Failed to unlink lead from contact';
        showErrorToast(msg);
      } finally {
        setIsRemoving(false);
      }
    },
    [contactId, fetchLeads],
  );

  const handleSortingChange = useCallback((newSorting) => setSorting(newSorting), []);
  const handleFieldUpdate = useCallback(
    async (leadId, fieldKey, value) => {
      if (!leadId) return;
      const apiField = fieldKey === 'lost_cause' ? 'lost_reason' : fieldKey;
      try {
        await updateCrmLead(leadId, buildLeadFieldPayload(apiField, value));
        showSuccessToast('Lead updated.');
        await fetchLeads(pagination.page, false);
      } catch {
        showErrorToast('Failed to update lead');
      }
    },
    [fetchLeads, pagination.page],
  );

  const handleCreateLead = useCallback(async () => {
    await fetchLeads(1, false);
  }, [fetchLeads]);

  const tableRows = useMemo(
    () =>
      leads.map((l) => ({
        ...l,
        _onDelete: () => handleRemoveLeadClick(l),
      })),
    [leads, handleRemoveLeadClick],
  );

  // ── Page pagination ──────────────────────────────────────────────────────
  if (!contactId) {
    return (
      <div className='flex flex-1 flex-col overflow-hidden bg-white p-6'>
        <p className='text-paragraph-sm text-text-sub-600'>No contact selected.</p>
      </div>
    );
  }

  return (
    <div className='flex flex-1 flex-col overflow-hidden bg-white'>
      <div className='flex flex-1 flex-col gap-4 px-6 pt-6 pb-0 min-h-0'>
        <div className='w-full flex flex-col gap-1'>
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
            onValueChange={(tab) => {
              setSelectedStageTab(tab);
              setAppliedFilters((prev) => ({
                ...prev,
                lifecycle_stage: tab === 'all' ? [] : [tab],
              }));
            }}
          />
        </div>

        <CrmLeadsToolbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          tableRef={tableRef}
          onAddLead={() => setIsCreateDrawerOpen(true)}
          onFiltersChange={handleFiltersChange}
          appliedFilters={appliedFilters}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          groupOrder={groupOrder}
          onGroupOrderChange={setGroupOrder}
          leadOptions={leadOptions}
          resizeColumnsEnabled={resizeColumnsEnabled}
          onResizeEnabledChange={handleResizeEnabledChange}
          onResetColumnSizes={handleResetColumnSizes}
        />

        <PaginatedTableLayout scrollable={false} grouped={Boolean(groupBy)} {...paginationProps}>
          <CrmLeadsTable
            ref={tableRef}
            rows={tableRows}
            isLoading={isLoading}
            error={error}
            onRetry={() => fetchLeads(1, false)}
            variant='compact'
            groupBy={groupBy}
            groupOrder={groupOrder}
            sorting={sorting}
            onSortingChange={handleSortingChange}
            columnWidths={columnWidths}
            onColumnResize={resizeColumnsEnabled ? handleColumnResize : null}
            persistColumnConfig={persistColumnConfig}
            fetchColumnConfig={fetchColumnConfig}
            columnConfigId={REACT_TABLE_ID_CONTACT_LEADS}
            onRowClick={onLeadRowClick}
            onContactClick={onLeadContactClick}
            leadOptions={leadOptions}
            onFieldUpdate={handleFieldUpdate}
            removeFromAccountMode
            freezeColumns
          />
        </PaginatedTableLayout>
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(leadToRemove)}
        onOpenChange={(open) => !open && setLeadToRemove(null)}
        title='Remove lead?'
        description='Are you sure you want to unlink this lead from the contact? The lead will remain but will no longer be associated with this contact.'
        item={leadToRemove}
        onConfirm={handleRemoveLeadConfirm}
        isLoading={isRemoving}
      />

      <CrmLeadCreateDrawer
        open={isCreateDrawerOpen}
        onOpenChange={setIsCreateDrawerOpen}
        onSuccess={handleCreateLead}
        leadOptions={leadOptions}
        defaultPipelineId={selectedPipelineId}
        defaultLifecycleStageId={selectedStageTab === 'all' ? '' : selectedStageTab}
        fixedContact={contactId}
        fixedAccount={accountId || undefined}
      />
    </div>
  );
};

export default CrmContactLeadsTab;
