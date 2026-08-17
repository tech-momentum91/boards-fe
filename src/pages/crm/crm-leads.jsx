import React, { useCallback, useMemo, useRef, useState, useEffect, lazy, Suspense } from 'react';
import { RiMoneyDollarCircleLine } from 'react-icons/ri';
import { useSearchParams } from 'react-router-dom';
import PageLayout from '@/components/page-layout';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import CrmLeadsToolbar from '@/components/crm-leads/crm-leads-toolbar';
import CrmLeadsSaveViewMenu from '@/components/crm-leads/crm-leads-save-view-menu';
import CrmPipelineTabBar from '@/components/crm-leads/crm-pipeline-tab-bar';
import CrmLeadsTab from '@/components/crm-leads/crm-leads-tab';
import CrmLeadsTable from '@/components/crm-leads/crm-leads-table';
import CrmLeadsBulkActionsBar from '@/components/crm-leads/crm-leads-bulk-actions-bar';
import { useDebounce } from '@/hooks/use-debounce';
import { useCrmLeadNavigation } from '@/hooks/use-crm-lead-navigation';
import { useCrmLeadSaveView } from '@/hooks/use-crm-lead-save-view';
import { useCrmLeadTabPreferences } from '@/hooks/use-crm-lead-tab-preferences';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import { useOffsetPagination } from '@/hooks/use-offset-pagination';
import { flattenGroupedListResults } from '@/utils/list-pagination-utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { buildCrmLeadApiFilters } from '@/utils/date-utils';
import { LEAD_VIEW_SAVE_SCOPES } from '@/pages/crm/leads-view/lead-view-settings';
import {
  buildDisplayTabs,
  canHideTab,
  getTabAfterHide,
} from '@/pages/crm/leads-view/crm-lead-tab-preferences';
import {
  DEFAULT_LEAD_FILTERS,
  LEAD_COLUMN_STORAGE_KEY,
  LEAD_RESIZE_ENABLED_KEY,
  SELECT_NONE_VALUE,
  resolveLinkFieldSelectValue,
  ALL_PIPELINE_TAB,
  ALL_PIPELINE_TAB_VALUE,
  DROPPED_LEADS_TAB,
  DROPPED_LEADS_TAB_VALUE,
} from '@/components/crm-leads/constants';
import {
  listCrmLeads,
  applyLeadListTabCounts,
  getCrmLeadStageTabCounts,
  getCrmLeadPipelineTabCounts,
  getCrmLeadOptions,
  getCrmStages,
  getSalesOwnerList,
  getInsideSalesList,
  getCrmContactList,
  updateCrmLead,
  buildLeadFieldPayload,
  deleteCrmLead,
  setCrmLeadPrimaryContact,
  addCrmLeadContact,
} from '@/api/crmLeads';
import { createCrmContact, updateCrmContact } from '@/api/crmContacts';
import { createCrmAccount } from '@/api/crmAccounts';

const CrmLeadCreateDrawer = lazy(() => import('@/components/crm-leads/crm-lead-create-drawer'));
const CrmLeadCreateContactModal = lazy(
  () => import('@/components/crm-leads/crm-lead-create-contact-modal'),
);

const REACT_TABLE_ID = 'crm-leads-table';
const CRM_LEADS_VIEW_SESSION_KEY = 'crm-leads-view-selection';

// ── Field maps for server-side sort / group ───────────────────────────────────
const SORT_FIELD_MAP = {
  name: 'lead_name',
  created_at: 'creation',
  account: 'account',
  lead_of: 'lead_of',
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
  lead_of: 'lead_of',
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

// ── Normalize an API row to the shape the table expects ──────────────────────
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
    company_legal_name: row.company_legal_name || '',
    lead_of: row.lead_of || '',
    account_id: row.account_id || '',
    created_at: row.created_at ?? row.creation ?? '-',
    pipeline: row.pipeline ?? '',
    pipeline_label: row.pipeline_label ?? '',
    pipeline_color: row.pipeline_color ?? '',
    lifecycle_stage: row.lifecycle_stage || '-',
    lifecycle_stage_label: row.lifecycle_stage_label ?? '',
    lifecycle_stage_color: row.lifecycle_stage_color ?? '',
    life_cycle_stage_status: row.life_cycle_stage_status ?? '',
    life_cycle_stage_status_label: row.life_cycle_stage_status_label ?? '',
    life_cycle_stage_status_color: row.life_cycle_stage_status_color ?? '',
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
    // Spread all column fields from API (delacon_*, external_id, service_id, etc.)
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
    agent_name: row.agent_name ?? '',
    agent_phone: row.agent_phone ?? '',
    call_start_time: row.call_start_time ?? '',
    call_end_time: row.call_end_time ?? '',
    ip_address: row.ip_address ?? '',
    tracking_number: row.tracking_number ?? '',
    true_pulse_data_bridge_id: row.true_pulse_data_bridge_id ?? '',
    service_name: row.service_name ?? '',
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

// ── localStorage helpers for column widths ────────────────────────────────────
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

function loadStoredLeadView() {
  try {
    const raw = sessionStorage.getItem(CRM_LEADS_VIEW_SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const pipeline = typeof parsed.pipeline === 'string' ? parsed.pipeline.trim() : '';
    const stage = typeof parsed.stage === 'string' ? parsed.stage.trim() : '';
    return {
      ...(pipeline ? { pipeline } : {}),
      ...(stage ? { stage } : {}),
    };
  } catch {
    return {};
  }
}

function saveStoredLeadView(pipeline, stage) {
  try {
    sessionStorage.setItem(CRM_LEADS_VIEW_SESSION_KEY, JSON.stringify({ pipeline, stage }));
  } catch {
    // ignore
  }
}

/** Filters for get_crm_lead_status_counts / tab badges (aligned with list, excluding per-stage tab selection). */
function buildLeadTabCountFilters(
  appliedFilters,
  selectedPipelineId,
  { omitLifecycle = false, droppedOnly = false, assignedToMe = false } = {},
) {
  const appliedLostReasons = Array.isArray(appliedFilters?.lost_reason)
    ? appliedFilters.lost_reason
    : [];
  const hasAppliedLostReasons = appliedLostReasons.length > 0;

  return buildCrmLeadApiFilters(
    {
      ...appliedFilters,
      status: [],
      lifecycle_stage: omitLifecycle ? [] : appliedFilters.lifecycle_stage,
      // Preserve Lost Reason on the Dropped tab; ignore it for active (exclude-dropped) counts.
      lost_reason: droppedOnly && hasAppliedLostReasons ? appliedLostReasons : [],
    },
    {
      ...(selectedPipelineId ? { pipeline: ['=', selectedPipelineId] } : {}),
      ...(droppedOnly
        ? hasAppliedLostReasons
          ? {}
          : { lost_reason: ['!=', ''] }
        : // Active tabs: exclude dropped. Match both empty string and unset/NULL.
          { lost_reason: ['in', ['', null]] }),
    },
    { assignedToMe },
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
const CrmLeads = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const storedViewRef = useRef(loadStoredLeadView());
  const pipelineFromUrl = searchParams.get('pipeline') || storedViewRef.current.pipeline || '';
  const initialStage = searchParams.get('stage') || storedViewRef.current.stage || 'all';
  const pendingStageRestoreRef = useRef(initialStage);
  const { onLeadRowClick, onLeadContactClick } = useCrmLeadNavigation();
  const tableRef = useRef(null);
  const columnsForViewRef = useRef([]);

  // ── Data state ───────────────────────────────────────────────────────────
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
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [isBulkApplying, setIsBulkApplying] = useState(false);
  const [pipelineScopedOptions, setPipelineScopedOptions] = useState({
    product: [],
    lead_size: [],
    lead_relevance: [],
    lost_reason: [],
  });
  const bulkOpGenerationRef = useRef(0);
  const isBulkApplyingRef = useRef(false);
  const [contactOptions, setContactOptions] = useState([]);
  const [isDeletingLead, setIsDeletingLead] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const { pagination, pageSize, applyPaginationMeta, paginationProps, fetchRef } =
    useOffsetPagination({ initialPageSize: 50, initialPage: 0 });
  const [stageTabCounts, setStageTabCounts] = useState({ all: 0 });
  const [pipelineTabCounts, setPipelineTabCounts] = useState({});

  // ── UI state (filters/sort/group/search via Save View; pipeline/stage via URL) ─
  const [appliedFilters, setAppliedFilters] = useState(() => ({ ...DEFAULT_LEAD_FILTERS }));
  const [showAssignedToMeOnly, setShowAssignedToMeOnly] = useState(false);
  /** Owner multi-selects cleared when enabling Me mode; restored when Me is turned off. */
  const stashedOwnerFiltersRef = useRef({ sales_owner: [], inside_sales: [] });

  const handleFiltersChange = useCallback((newFilters) => {
    setAppliedFilters((prev) => {
      const merged = { ...prev, ...newFilters };
      if (JSON.stringify(merged) === JSON.stringify(prev)) return prev;
      return merged;
    });

    // Sales Owner / Inside Sales filters are mutually exclusive with Me mode.
    const nextSalesOwner = Array.isArray(newFilters?.sales_owner)
      ? newFilters.sales_owner
      : undefined;
    const nextInsideSales = Array.isArray(newFilters?.inside_sales)
      ? newFilters.inside_sales
      : undefined;
    const touchedOwnerFields =
      Object.prototype.hasOwnProperty.call(newFilters ?? {}, 'sales_owner') ||
      Object.prototype.hasOwnProperty.call(newFilters ?? {}, 'inside_sales');
    if (
      touchedOwnerFields &&
      ((nextSalesOwner && nextSalesOwner.length > 0) ||
        (nextInsideSales && nextInsideSales.length > 0))
    ) {
      setShowAssignedToMeOnly(false);
      stashedOwnerFiltersRef.current = { sales_owner: [], inside_sales: [] };
    }
  }, []);

  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [createContactModal, setCreateContactModal] = useState({
    open: false,
    lead: null,
    searchQuery: '',
    createdContactId: '',
  });
  const [isCreatingContact, setIsCreatingContact] = useState(false);
  const [pendingContactLink, setPendingContactLink] = useState(null);
  const [isRetryingContactLink, setIsRetryingContactLink] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPipelineId, setSelectedPipelineId] = useState(pipelineFromUrl);
  const [selectedStageTab, setSelectedStageTab] = useState(initialStage);
  const [stageRestoreComplete, setStageRestoreComplete] = useState(false);
  const prevPipelineIdRef = useRef('');
  const [stagesByPipeline, setStagesByPipeline] = useState({});
  const stagesByPipelineRef = useRef({});
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [sorting, setSorting] = useState([]);
  const [columnWidthOverrides, setColumnWidthOverrides] = useState(() => loadWidthOverrides());
  const [resizeColumnsEnabled, setResizeColumnsEnabled] = useState(() => loadResizeEnabled());

  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const handleApplyViewSettings = useCallback(
    (settings) => {
      const nextFilters = settings?.filters ?? DEFAULT_LEAD_FILTERS;
      const nextGrouping = settings?.grouping ?? { groupBy: '', groupOrder: 'asc' };
      const nextSettings = settings?.settings ?? {};
      const nextColumns = Array.isArray(settings?.columns) ? settings.columns : [];
      const nextAssignedToMe = Boolean(nextSettings.showAssignedToMeOnly);

      // Pipeline Save View can store lifecycle filters, but stage tabs own the
      // active lifecycle selection — only apply saved lifecycle on the All tab.
      const incomingLifecycle = Array.isArray(nextFilters.lifecycle_stage)
        ? nextFilters.lifecycle_stage
        : [];

      // Me mode is source of truth over Sales Owner / Inside Sales filters.
      const filtersForApply = nextAssignedToMe
        ? {
            ...DEFAULT_LEAD_FILTERS,
            ...nextFilters,
            lifecycle_stage: selectedStageTab === 'all' ? incomingLifecycle : [],
            sales_owner: [],
            inside_sales: [],
          }
        : {
            ...DEFAULT_LEAD_FILTERS,
            ...nextFilters,
            lifecycle_stage: selectedStageTab === 'all' ? incomingLifecycle : [],
          };

      setAppliedFilters(filtersForApply);
      setShowAssignedToMeOnly(nextAssignedToMe);
      stashedOwnerFiltersRef.current = { sales_owner: [], inside_sales: [] };
      setSorting(Array.isArray(settings?.sorting) ? settings.sorting : []);
      setGroupBy(typeof nextGrouping.groupBy === 'string' ? nextGrouping.groupBy : '');
      setGroupOrder(nextGrouping.groupOrder === 'desc' ? 'desc' : 'asc');
      setSearchTerm(typeof nextSettings.search === 'string' ? nextSettings.search : '');
      columnsForViewRef.current = nextColumns;
    },
    [selectedStageTab],
  );

  const handleShowAssignedToMeOnlyChange = useCallback((next) => {
    const enabled = Boolean(next);
    if (enabled) {
      setAppliedFilters((prev) => {
        const salesOwner = Array.isArray(prev.sales_owner) ? prev.sales_owner : [];
        const insideSales = Array.isArray(prev.inside_sales) ? prev.inside_sales : [];
        // Only stash when clearing non-empty owners (Strict Mode may re-run this updater).
        if (salesOwner.length > 0 || insideSales.length > 0) {
          stashedOwnerFiltersRef.current = {
            sales_owner: salesOwner,
            inside_sales: insideSales,
          };
          return {
            ...prev,
            sales_owner: [],
            inside_sales: [],
          };
        }
        return prev;
      });
      setShowAssignedToMeOnly(true);
      return;
    }

    const stash = stashedOwnerFiltersRef.current ?? {
      sales_owner: [],
      inside_sales: [],
    };
    stashedOwnerFiltersRef.current = { sales_owner: [], inside_sales: [] };
    setShowAssignedToMeOnly(false);
    setAppliedFilters((prev) => {
      const salesOwner = Array.isArray(prev.sales_owner) ? prev.sales_owner : [];
      const insideSales = Array.isArray(prev.inside_sales) ? prev.inside_sales : [];
      const hasStash =
        (Array.isArray(stash.sales_owner) && stash.sales_owner.length > 0) ||
        (Array.isArray(stash.inside_sales) && stash.inside_sales.length > 0);
      // Don't overwrite owner filters the user set after leaving Me via the filter UI.
      if (!hasStash || salesOwner.length > 0 || insideSales.length > 0) {
        return prev;
      }
      return {
        ...prev,
        sales_owner: Array.isArray(stash.sales_owner) ? stash.sales_owner : [],
        inside_sales: Array.isArray(stash.inside_sales) ? stash.inside_sales : [],
      };
    });
  }, []);

  const {
    viewHydrated,
    isViewDirty,
    hasPersonalView,
    canSaveViewForAll,
    isAutosaveEnabled,
    isSavingView,
    savedColumns,
    savedLifecycleStage,
    handleSaveView,
    handleRevertView,
    handleResetToDefault,
    handleToggleAutosave,
    reportColumnsChange,
  } = useCrmLeadSaveView({
    appliedFilters,
    sorting,
    groupBy,
    groupOrder,
    searchTerm,
    showAssignedToMeOnly,
    selectedPipelineId,
    selectedStageTab,
    columnsRef: columnsForViewRef,
    onApplyViewSettings: handleApplyViewSettings,
    viewReady: Boolean(selectedPipelineId) && stageRestoreComplete,
  });

  // Keep columns ref in sync with last saved columns until table reports live config
  useEffect(() => {
    if (Array.isArray(savedColumns) && savedColumns.length > 0) {
      columnsForViewRef.current = savedColumns;
    }
  }, [savedColumns]);

  const effectiveLifecycleStages = useMemo(() => {
    if (selectedStageTab === DROPPED_LEADS_TAB_VALUE) return [];
    if (selectedStageTab && selectedStageTab !== 'all') {
      return [selectedStageTab];
    }
    if (appliedFilters.lifecycle_stage?.length > 0) {
      return appliedFilters.lifecycle_stage;
    }
    return [];
  }, [selectedStageTab, appliedFilters.lifecycle_stage]);

  const isDroppedLeadsTab = selectedStageTab === DROPPED_LEADS_TAB_VALUE;
  const isAllPipelineSelected = selectedPipelineId === ALL_PIPELINE_TAB_VALUE;

  const pipelineTabsList = useMemo(
    () => [
      ALL_PIPELINE_TAB,
      ...(Array.isArray(leadOptions.pipelines) ? leadOptions.pipelines : []),
    ],
    [leadOptions.pipelines],
  );

  const leadStageTabs = useMemo(
    () => [
      { value: 'all', label: 'All' },
      ...(!isAllPipelineSelected && Array.isArray(leadOptions.stages) ? leadOptions.stages : []),
      DROPPED_LEADS_TAB,
    ],
    [isAllPipelineSelected, leadOptions.stages],
  );

  const {
    isLoaded: tabPrefsLoaded,
    isSaving: isSavingTabPrefs,
    pipelineTabs: pipelineTabPrefs,
    stageTabsByPipeline,
    syncPipelineAvailable,
    syncStageAvailable,
    reorderPipelineTabs,
    togglePinPipelineTab,
    hidePipelineTab,
    unhidePipelineTab,
    reorderStageTabs,
    togglePinStageTab,
    hideStageTab,
    unhideStageTab,
  } = useCrmLeadTabPreferences();

  const stageTabPrefs = useMemo(() => {
    const key = String(selectedPipelineId ?? '').trim();
    if (!key) return { order: [], pinned: [], hidden: [] };
    return stageTabsByPipeline[key] ?? { order: [], pinned: [], hidden: [] };
  }, [selectedPipelineId, stageTabsByPipeline]);

  // ── Build API params ──────────────────────────────────────────────────────
  const apiParams = useMemo(() => {
    const sortCol = sorting[0];
    const orderBy = sortCol ? SORT_FIELD_MAP[sortCol.id] || 'creation' : 'creation';
    const orderDirection = sortCol ? (sortCol.desc ? 'desc' : 'asc') : 'desc';

    const appliedLostReasons = Array.isArray(appliedFilters.lost_reason)
      ? appliedFilters.lost_reason
      : [];
    const hasAppliedLostReasons = appliedLostReasons.length > 0;

    const filters = buildCrmLeadApiFilters(
      {
        ...appliedFilters,
        lifecycle_stage: [],
        // Keep Lost Reason filters on the Dropped tab; clear them for active tabs.
        lost_reason: isDroppedLeadsTab && hasAppliedLostReasons ? appliedLostReasons : [],
      },
      {
        ...(effectiveLifecycleStages.length > 0 && {
          lifecycle_stage: ['in', effectiveLifecycleStages],
        }),
        ...(selectedPipelineId && { pipeline: ['=', selectedPipelineId] }),
        ...(isDroppedLeadsTab
          ? hasAppliedLostReasons
            ? {}
            : { lost_reason: ['!=', ''] }
          : // Exclude dropped: empty string and unset/NULL both mean "not dropped".
            { lost_reason: ['in', ['', null]] }),
      },
      { assignedToMe: showAssignedToMeOnly },
    );

    const apiGroupBy = GROUP_BY_FIELD_MAP[groupBy] || null;

    return { orderBy, orderDirection, filters, apiGroupBy };
  }, [
    sorting,
    appliedFilters,
    groupBy,
    selectedPipelineId,
    effectiveLifecycleStages,
    isDroppedLeadsTab,
    showAssignedToMeOnly,
  ]);

  // ── Fetch leads ────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(
    async (fetchPage, append = false, pageSizeParam = undefined) => {
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
        // Badges come from list response; backend must ignore tab-scoped filters for counts.
        // Missing payloads keep last-good badges (do not paint all zeros).
        if (
          !applyLeadListTabCounts(result, {
            setPipelineTabCounts,
            setStageTabCounts,
            droppedTabValue: DROPPED_LEADS_TAB_VALUE,
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
    [apiParams, debouncedSearchTerm, groupOrder, pageSize, applyPaginationMeta],
  );

  fetchRef.current = fetchLeads;

  // ── Refresh stage / pipeline tab badges (keep last-good when payload incomplete) ─
  const fetchLeadStageTabCounts = useCallback(async () => {
    try {
      const filters = buildLeadTabCountFilters(appliedFilters, selectedPipelineId, {
        omitLifecycle: false,
        assignedToMe: showAssignedToMeOnly,
      });
      const stages = await getCrmLeadStageTabCounts(
        Object.keys(filters).length > 0 ? filters : undefined,
        debouncedSearchTerm || undefined,
        DROPPED_LEADS_TAB_VALUE,
      );
      if (stages) setStageTabCounts(stages);
    } catch {
      // Keep last-good stage badges.
    }
  }, [appliedFilters, debouncedSearchTerm, selectedPipelineId, showAssignedToMeOnly]);

  const fetchPipelineTabCounts = useCallback(async () => {
    try {
      const baseFilters = {};
      if (showAssignedToMeOnly) {
        baseFilters.assigned_to_me = 1;
      }
      if (effectiveLifecycleStages.length > 0) {
        baseFilters.lifecycle_stage = ['in', effectiveLifecycleStages];
      }
      if (appliedFilters.status?.length > 0) {
        baseFilters.status = ['in', appliedFilters.status];
      }
      if (!showAssignedToMeOnly && appliedFilters.sales_owner?.length > 0) {
        baseFilters.sales_owner = ['in', appliedFilters.sales_owner];
      }
      if (!showAssignedToMeOnly && appliedFilters.inside_sales?.length > 0) {
        baseFilters.inside_sales = ['in', appliedFilters.inside_sales];
      }
      if (appliedFilters.city?.length > 0) {
        baseFilters.city = ['in', appliedFilters.city];
      }
      if (appliedFilters.product?.length > 0) {
        baseFilters.product = ['in', appliedFilters.product];
      }
      if (appliedFilters.lead_source?.length > 0) {
        baseFilters.lead_source = ['in', appliedFilters.lead_source];
      }
      if (appliedFilters.lead_relevance?.length > 0) {
        baseFilters.lead_relevance = ['in', appliedFilters.lead_relevance];
      }
      if (appliedFilters.need_urgency?.length > 0) {
        baseFilters.need_urgency = ['in', appliedFilters.need_urgency];
      }
      if (appliedFilters.info_call_status?.length > 0) {
        baseFilters.info_call_status = ['in', appliedFilters.info_call_status];
      }
      // Pipeline badges: honor Lost Reason filter when set; otherwise exclude dropped leads.
      if (appliedFilters.lost_reason?.length > 0) {
        baseFilters.lost_reason = ['in', appliedFilters.lost_reason];
      } else if (selectedStageTab !== DROPPED_LEADS_TAB_VALUE) {
        baseFilters.lost_reason = ['in', ['', null]];
      }
      if (appliedFilters.lead_of?.length > 0) {
        baseFilters.lead_of = ['in', appliedFilters.lead_of];
      }
      const raw = await getCrmLeadPipelineTabCounts(
        Object.keys(baseFilters).length > 0 ? baseFilters : undefined,
        debouncedSearchTerm || undefined,
      );
      if (raw) setPipelineTabCounts(raw);
    } catch {
      // Keep last-good pipeline badges.
    }
  }, [
    appliedFilters,
    debouncedSearchTerm,
    effectiveLifecycleStages,
    selectedStageTab,
    showAssignedToMeOnly,
  ]);

  const pipelineCountsKey = useMemo(
    () =>
      JSON.stringify({
        k: debouncedSearchTerm,
        f: appliedFilters,
        st: selectedStageTab,
        ls: effectiveLifecycleStages,
        me: showAssignedToMeOnly,
      }),
    [
      debouncedSearchTerm,
      appliedFilters,
      effectiveLifecycleStages,
      selectedStageTab,
      showAssignedToMeOnly,
    ],
  );

  // ── Re-fetch when filters / search / sort / groupBy change ───────────────────
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
        me: showAssignedToMeOnly,
      }),
    [
      debouncedSearchTerm,
      appliedFilters,
      sorting,
      groupBy,
      groupOrder,
      selectedPipelineId,
      selectedStageTab,
      showAssignedToMeOnly,
    ],
  );

  const fetchLeadsRef = useRef(fetchLeads);
  fetchLeadsRef.current = fetchLeads;

  useEffect(() => {
    Promise.all([getCrmLeadOptions(), getSalesOwnerList(), getInsideSalesList()])
      .then(([options, salesOwner, insideSales]) => {
        setLeadOptions((prev) => ({
          ...prev,
          ...options,
          sales_owner: Array.isArray(salesOwner) ? salesOwner : [],
          inside_sales: Array.isArray(insideSales) ? insideSales : [],
        }));
      })
      .catch(() => {});

    getCrmContactList()
      .then((contacts) => setContactOptions(Array.isArray(contacts) ? contacts : []))
      .catch(() => setContactOptions([]));
  }, []);

  useEffect(() => {
    const pl = leadOptions.pipelines;
    if (!Array.isArray(pl) || pl.length === 0) return;

    const tabs = [ALL_PIPELINE_TAB, ...pl];
    let candidates = tabs;
    if (tabPrefsLoaded) {
      const { visible } = buildDisplayTabs(tabs, pipelineTabPrefs, {
        lockedIds: [ALL_PIPELINE_TAB_VALUE],
      });
      if (visible.length > 0) candidates = visible;
    }

    setSelectedPipelineId((prev) => {
      if (prev && candidates.some((p) => p.value === prev)) return prev;
      if (pipelineFromUrl && candidates.some((p) => p.value === pipelineFromUrl)) {
        return pipelineFromUrl;
      }
      return candidates[0].value;
    });
  }, [leadOptions.pipelines, pipelineFromUrl, tabPrefsLoaded, pipelineTabPrefs]);

  useEffect(() => {
    if (!selectedPipelineId) return;

    // All pipeline: no per-pipeline stages — only All + Dropped leads stage tabs.
    if (selectedPipelineId === ALL_PIPELINE_TAB_VALUE) {
      const emptyStages = {
        stages: [],
        stageStatusMap: {},
        allStatuses: [],
        stageColorMap: {},
        statusColorMap: {},
      };
      stagesByPipelineRef.current[ALL_PIPELINE_TAB_VALUE] = emptyStages;
      setStagesByPipeline((prev) => ({ ...prev, [ALL_PIPELINE_TAB_VALUE]: emptyStages }));
      setLeadOptions((prev) => ({
        ...prev,
        ...emptyStages,
      }));
      return;
    }

    let cancelled = false;
    getCrmStages(selectedPipelineId)
      .then((stagesData) => {
        if (cancelled) return;
        stagesByPipelineRef.current[selectedPipelineId] = stagesData;
        setStagesByPipeline((prev) => ({ ...prev, [selectedPipelineId]: stagesData }));
        setLeadOptions((prev) => ({
          ...prev,
          ...stagesData,
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedPipelineId]);

  const ensureStagesForPipeline = useCallback(
    async (pipelineId, { updateState = true } = {}) => {
      const pl = String(pipelineId || '').trim();
      if (!pl || pl === ALL_PIPELINE_TAB_VALUE) return null;
      const cached = stagesByPipelineRef.current[pl];
      if (cached) {
        if (updateState) {
          setStagesByPipeline((prev) => (prev[pl] ? prev : { ...prev, [pl]: cached }));
        }
        return cached;
      }
      try {
        const stagesData = await getCrmStages(pl);
        const nextCache = { ...stagesByPipelineRef.current, [pl]: stagesData };
        stagesByPipelineRef.current = nextCache;
        // Avoid setState while a table popover is open — it remounts columns and closes the dropdown.
        if (updateState) {
          setStagesByPipeline(nextCache);
          if (pl === selectedPipelineId) {
            setLeadOptions((prev) => ({ ...prev, ...stagesData }));
          }
        }
        return stagesData;
      } catch {
        return null;
      }
    },
    [selectedPipelineId],
  );

  const selectedPipelineStages = stagesByPipeline[selectedPipelineId]?.stages;
  const isStageTabValue = useCallback(
    (tab) =>
      tab === 'all' ||
      tab === DROPPED_LEADS_TAB_VALUE ||
      (Array.isArray(selectedPipelineStages) &&
        selectedPipelineStages.some((stage) => stage.value === tab)),
    [selectedPipelineStages],
  );

  // Restore the URL/session stage once, after this pipeline's own stages load.
  // Fall back to "All" when the requested stage is missing or hidden.
  // Stage tabs own lifecycle selection — do not mirror the tab into filters.
  useEffect(() => {
    if (stageRestoreComplete || !Array.isArray(selectedPipelineStages)) return;

    const requestedStage = pendingStageRestoreRef.current;
    pendingStageRestoreRef.current = '';
    let restoredStage = isStageTabValue(requestedStage) ? requestedStage : 'all';

    if (tabPrefsLoaded && restoredStage !== 'all') {
      const hiddenSet = new Set(stageTabPrefs.hidden ?? []);
      if (hiddenSet.has(restoredStage)) {
        restoredStage = 'all';
      }
    }

    setSelectedStageTab(restoredStage);
    if (restoredStage !== 'all') {
      setAppliedFilters((prev) => {
        const current = Array.isArray(prev.lifecycle_stage) ? prev.lifecycle_stage : [];
        if (current.length === 0) return prev;
        return { ...prev, lifecycle_stage: [] };
      });
    }
    setStageRestoreComplete(true);
  }, [
    isStageTabValue,
    selectedPipelineStages,
    stageRestoreComplete,
    stageTabPrefs.hidden,
    tabPrefsLoaded,
  ]);

  // Clear stage filters when leaving All — stage tabs own lifecycle selection.
  // Restore pipeline-saved lifecycle filters when returning to All.
  useEffect(() => {
    if (!stageRestoreComplete) return;
    if (selectedStageTab === 'all') {
      setAppliedFilters((prev) => {
        const current = Array.isArray(prev.lifecycle_stage) ? prev.lifecycle_stage : [];
        const next = Array.isArray(savedLifecycleStage) ? savedLifecycleStage : [];
        if (
          current.length === next.length &&
          current.every((value, index) => value === next[index])
        ) {
          return prev;
        }
        return { ...prev, lifecycle_stage: next };
      });
      return;
    }
    setAppliedFilters((prev) => {
      const current = Array.isArray(prev.lifecycle_stage) ? prev.lifecycle_stage : [];
      if (current.length === 0) return prev;
      return { ...prev, lifecycle_stage: [] };
    });
  }, [selectedStageTab, stageRestoreComplete, savedLifecycleStage]);

  // Persist pipeline/stage for bookmarking and detail-page back navigation.
  useEffect(() => {
    if (!selectedPipelineId || !stageRestoreComplete) return;
    saveStoredLeadView(selectedPipelineId, selectedStageTab);
    if (
      searchParams.get('pipeline') === selectedPipelineId &&
      searchParams.get('stage') === selectedStageTab
    ) {
      return;
    }
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('pipeline', selectedPipelineId);
        next.set('stage', selectedStageTab);
        return next;
      },
      { replace: true },
    );
  }, [searchParams, selectedPipelineId, selectedStageTab, setSearchParams, stageRestoreComplete]);

  // Keep pipeline tab prefs in sync with available pipelines.
  useEffect(() => {
    if (!tabPrefsLoaded) return;
    const pipelines = Array.isArray(leadOptions.pipelines) ? leadOptions.pipelines : [];
    if (pipelines.length === 0) return;
    syncPipelineAvailable([ALL_PIPELINE_TAB_VALUE, ...pipelines.map((p) => p.value)], {
      lockedIds: [ALL_PIPELINE_TAB_VALUE],
    });
  }, [tabPrefsLoaded, leadOptions.pipelines, syncPipelineAvailable]);

  // Keep stage tab prefs in sync for the active pipeline; leave hidden selection.
  useEffect(() => {
    if (!tabPrefsLoaded || !selectedPipelineId) return;
    if (!Array.isArray(selectedPipelineStages)) return;

    const availableIds = leadStageTabs.map((tab) => tab.value);
    const normalized = syncStageAvailable(selectedPipelineId, availableIds, {
      lockedIds: ['all'],
    });
    const { visible } = buildDisplayTabs(leadStageTabs, normalized, { lockedIds: ['all'] });
    const visibleIds = new Set(visible.map((tab) => tab.value));

    setSelectedStageTab((prev) => {
      if (visibleIds.has(prev)) return prev;
      return 'all';
    });
  }, [
    tabPrefsLoaded,
    selectedPipelineId,
    selectedPipelineStages,
    leadStageTabs,
    syncStageAvailable,
  ]);

  const handlePipelineTabChange = useCallback((pipelineId) => {
    setSelectedPipelineId(pipelineId);
    setSelectedStageTab('all');
  }, []);

  const handleStageTabChange = useCallback(
    (tab) => {
      setSelectedStageTab(tab);
      // Keep other filters; clear lifecycle_stage — tabs own stage selection
      // except on All, where the filter dropdown may set it.
      setAppliedFilters((prev) => {
        const current = Array.isArray(prev.lifecycle_stage) ? prev.lifecycle_stage : [];
        if (tab === 'all') {
          // Returning to All keeps any prior All-tab stage filters only if
          // they were not cleared; stage tabs always clear them below.
          return prev;
        }
        if (current.length === 0) return prev;
        return { ...prev, lifecycle_stage: [] };
      });
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (selectedPipelineId) next.set('pipeline', selectedPipelineId);
          next.set('stage', tab);
          return next;
        },
        { replace: true },
      );
    },
    [selectedPipelineId, setSearchParams],
  );

  const handleReorderPipelineTabs = useCallback(
    (activeId, overId) => {
      reorderPipelineTabs(activeId, overId);
    },
    [reorderPipelineTabs],
  );

  const handleHidePipelineTab = useCallback(
    async (tabId) => {
      if (
        !canHideTab(tabId, {
          prefs: pipelineTabPrefs,
          lockedIds: [ALL_PIPELINE_TAB_VALUE],
          requireOneVisible: true,
        })
      ) {
        return;
      }

      const { visible } = buildDisplayTabs(pipelineTabsList, pipelineTabPrefs, {
        lockedIds: [ALL_PIPELINE_TAB_VALUE],
      });
      const visibleIds = visible.map((tab) => tab.value);
      const wasActive = selectedPipelineId === tabId;
      const neighbor = wasActive ? getTabAfterHide(visibleIds, tabId) : null;

      const result = await hidePipelineTab(tabId);
      if (result?.error) return;

      if (wasActive && neighbor && neighbor !== tabId) {
        handlePipelineTabChange(neighbor);
      }
    },
    [
      hidePipelineTab,
      handlePipelineTabChange,
      pipelineTabsList,
      pipelineTabPrefs,
      selectedPipelineId,
    ],
  );

  const handleUnhidePipelineTab = useCallback(
    (tabId) => {
      unhidePipelineTab(tabId);
      handlePipelineTabChange(tabId);
    },
    [handlePipelineTabChange, unhidePipelineTab],
  );

  const handleReorderStageTabs = useCallback(
    (activeId, overId) => {
      if (!selectedPipelineId) return;
      reorderStageTabs(selectedPipelineId, activeId, overId);
    },
    [reorderStageTabs, selectedPipelineId],
  );

  const handleTogglePinStageTab = useCallback(
    (tabId) => {
      if (!selectedPipelineId) return;
      togglePinStageTab(selectedPipelineId, tabId);
    },
    [selectedPipelineId, togglePinStageTab],
  );

  const handleHideStageTab = useCallback(
    async (tabId) => {
      if (!selectedPipelineId) return;
      if (
        !canHideTab(tabId, {
          prefs: stageTabPrefs,
          lockedIds: ['all'],
          requireOneVisible: false,
        })
      ) {
        return;
      }

      const { visible } = buildDisplayTabs(leadStageTabs, stageTabPrefs, {
        lockedIds: ['all'],
      });
      const visibleIds = visible.map((tab) => tab.value);
      const wasActive = selectedStageTab === tabId;
      const neighbor = wasActive ? getTabAfterHide(visibleIds, tabId) : null;

      const result = await hideStageTab(selectedPipelineId, tabId);
      if (result?.error) return;

      if (wasActive && neighbor && neighbor !== tabId) {
        handleStageTabChange(neighbor);
      }
    },
    [
      handleStageTabChange,
      hideStageTab,
      leadStageTabs,
      selectedPipelineId,
      selectedStageTab,
      stageTabPrefs,
    ],
  );

  const handleUnhideStageTab = useCallback(
    (tabId) => {
      if (!selectedPipelineId) return;
      unhideStageTab(selectedPipelineId, tabId);
      handleStageTabChange(tabId);
    },
    [handleStageTabChange, selectedPipelineId, unhideStageTab],
  );

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
    if (!viewHydrated || !stageRestoreComplete || !selectedPipelineId) return;
    fetchLeadsRef.current(1, false);
  }, [filterKey, viewHydrated, stageRestoreComplete, selectedPipelineId]);

  // ── Column preference callbacks (Save View replaces listview prefs) ─────────
  const persistColumnConfig = useCallback(
    async (cols) => {
      columnsForViewRef.current = Array.isArray(cols) ? cols : [];
      reportColumnsChange(cols);
    },
    [reportColumnsChange],
  );

  const fetchColumnConfig = useCallback(async () => {
    return Array.isArray(savedColumns) ? savedColumns : [];
  }, [savedColumns]);

  const applyColumnsToTable = useCallback((cols) => {
    tableRef.current?.columnConfigHook?.applyExternalConfig?.(Array.isArray(cols) ? cols : []);
  }, []);

  const syncColumnsFromTable = useCallback(() => {
    const liveColumns = tableRef.current?.columnConfigHook?.columns;
    if (Array.isArray(liveColumns) && liveColumns.length > 0) {
      columnsForViewRef.current = liveColumns.map((col, index) => ({
        id: col.id,
        visible: col.visible !== false,
        order: typeof col.order === 'number' ? col.order : index,
        label: typeof col.label === 'string' ? col.label : col.id,
        enableHiding: col.enableHiding !== false,
      }));
    }
  }, []);

  const handleSaveViewForMe = useCallback(() => {
    syncColumnsFromTable();
    return handleSaveView({ scope: LEAD_VIEW_SAVE_SCOPES.ME });
  }, [handleSaveView, syncColumnsFromTable]);

  const handleSaveViewForAll = useCallback(() => {
    syncColumnsFromTable();
    return handleSaveView({ scope: LEAD_VIEW_SAVE_SCOPES.ALL });
  }, [handleSaveView, syncColumnsFromTable]);

  const handleRevertChanges = useCallback(() => {
    handleRevertView();
    requestAnimationFrame(() => {
      applyColumnsToTable(columnsForViewRef.current);
    });
  }, [applyColumnsToTable, handleRevertView]);

  const handleResetViewToDefault = useCallback(
    async (args) => {
      await handleResetToDefault(args);
      requestAnimationFrame(() => {
        applyColumnsToTable(columnsForViewRef.current);
      });
    },
    [applyColumnsToTable, handleResetToDefault],
  );

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

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((term) => {
    setSearchTerm(term);
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

  const handleCreateLead = useCallback(async () => {
    showSuccessToast('Lead created successfully');
    await fetchLeads(1, false);
  }, [fetchLeads]);

  const handleRetry = useCallback(() => {
    fetchLeads(1, false);
  }, [fetchLeads]);

  useEffect(() => {
    setSelectedLeadIds([]);
  }, [filterKey, pagination.page]);

  useEffect(() => {
    if (!selectedPipelineId || selectedPipelineId === ALL_PIPELINE_TAB_VALUE) {
      setPipelineScopedOptions({
        product: [],
        lead_size: [],
        lead_relevance: [],
        lost_reason: [],
      });
      return;
    }
    let cancelled = false;
    getCrmLeadOptions(undefined, selectedPipelineId)
      .then((opts) => {
        if (cancelled) return;
        setPipelineScopedOptions({
          product: Array.isArray(opts.product) ? opts.product : [],
          lead_size: Array.isArray(opts.lead_size) ? opts.lead_size : [],
          lead_relevance: Array.isArray(opts.lead_relevance) ? opts.lead_relevance : [],
          lost_reason: Array.isArray(opts.lost_reason) ? opts.lost_reason : [],
        });
      })
      .catch(() => {
        if (cancelled) return;
        setPipelineScopedOptions({
          product: [],
          lead_size: [],
          lead_relevance: [],
          lost_reason: [],
        });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPipelineId]);

  const clearLeadSelection = useCallback(() => {
    setSelectedLeadIds([]);
  }, []);

  const handleToggleLeadSelection = useCallback((leadId) => {
    const id = String(leadId || '').trim();
    if (!id) return;
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, []);

  const handleToggleSelectAllLeads = useCallback(() => {
    const visibleIds = leads
      .map((lead) => String(lead?.id || lead?.name || '').trim())
      .filter(Boolean);
    setSelectedLeadIds((prev) => {
      const prevSet = new Set(prev);
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => prevSet.has(id));
      if (allSelected) {
        return prev.filter((id) => !visibleIds.includes(id));
      }
      const next = new Set(prev);
      visibleIds.forEach((id) => next.add(id));
      return [...next];
    });
  }, [leads]);

  const runBulkLeadUpdate = useCallback(
    async (buildPayload) => {
      const ids = [...selectedLeadIds];
      if (ids.length === 0 || isBulkApplyingRef.current) return;

      const generation = ++bulkOpGenerationRef.current;
      isBulkApplyingRef.current = true;
      setIsBulkApplying(true);
      const succeeded = new Set();
      let firstError = null;

      try {
        for (const leadId of ids) {
          if (generation !== bulkOpGenerationRef.current) return;
          try {
            const payload = buildPayload(leadId);
            if (!payload || Object.keys(payload).length === 0) continue;
            await updateCrmLead(leadId, payload);
            succeeded.add(leadId);
          } catch (error_) {
            firstError ??= error_;
          }
        }

        if (generation !== bulkOpGenerationRef.current) return;

        if (firstError) {
          showErrorToast(firstError, {
            defaultMessage:
              succeeded.size > 0
                ? `Updated ${succeeded.size} of ${ids.length} leads. Some updates failed.`
                : 'Failed to update leads',
          });
        } else if (succeeded.size > 0) {
          showSuccessToast(
            succeeded.size === 1
              ? 'Lead updated successfully'
              : `${succeeded.size} leads updated successfully`,
          );
        }

        if (succeeded.size > 0) {
          await fetchLeads(pagination.page, false);
          await fetchLeadStageTabCounts();
          await fetchPipelineTabCounts();
        }
      } finally {
        if (generation === bulkOpGenerationRef.current) {
          // Generation gate ensures only the active bulk op clears the lock.
          // eslint-disable-next-line require-atomic-updates -- intentional after sequential awaits
          isBulkApplyingRef.current = false;
          setIsBulkApplying(false);
        }
      }
    },
    [selectedLeadIds, fetchLeads, fetchLeadStageTabCounts, fetchPipelineTabCounts, pagination.page],
  );

  const handleBulkApplyField = useCallback(
    async (fieldKey, value) => {
      if (!fieldKey || isBulkApplying) return;
      await runBulkLeadUpdate(() => buildLeadFieldPayload(fieldKey, value));
    },
    [isBulkApplying, runBulkLeadUpdate],
  );

  const handleBulkApplyPipeline = useCallback(
    async (fields) => {
      if (!fields || typeof fields !== 'object' || isBulkApplying) return;
      const pipeline = String(fields.pipeline ?? '').trim();
      const stage = String(fields.lifecycle_stage ?? '').trim();
      const status = String(fields.life_cycle_stage_status ?? '').trim();
      if (!pipeline) {
        showErrorToast('Pipeline is required');
        return;
      }
      if (!stage) {
        showErrorToast('Life cycle stage is required');
        return;
      }
      if (!status) {
        showErrorToast('Lifecycle stage status is required');
        return;
      }

      const resolvedPipeline = resolveLinkFieldSelectValue(
        pipeline,
        pipeline,
        leadOptions.pipelines,
      );
      if (!resolvedPipeline) {
        showErrorToast('Invalid pipeline selection');
        return;
      }

      await runBulkLeadUpdate(() => {
        const payload = {
          ...buildLeadFieldPayload('pipeline', resolvedPipeline),
          ...buildLeadFieldPayload('lifecycle_stage', stage),
          ...buildLeadFieldPayload('life_cycle_stage_status', status),
        };
        if (Object.prototype.hasOwnProperty.call(fields, 'lost_reason')) {
          Object.assign(payload, buildLeadFieldPayload('lost_reason', fields.lost_reason));
        }
        return payload;
      });
    },
    [isBulkApplying, leadOptions.pipelines, runBulkLeadUpdate],
  );

  const selectedPipelineStageData = stagesByPipeline[selectedPipelineId] || {};
  const bulkStageOptions = Array.isArray(selectedPipelineStageData.stages)
    ? selectedPipelineStageData.stages
    : leadOptions.stages || [];
  const bulkStageStatusMap =
    selectedPipelineStageData.stageStatusMap || leadOptions.stageStatusMap || {};
  const bulkStageColorMap =
    selectedPipelineStageData.stageColorMap || leadOptions.stageColorMap || {};
  const bulkDefaultStageId = String(bulkStageOptions[0]?.value ?? '').trim();
  const bulkDefaultStatusOptions = bulkDefaultStageId
    ? bulkStageStatusMap[bulkDefaultStageId] || []
    : [];
  const bulkDefaultStatusId = String(bulkDefaultStatusOptions[0]?.value ?? '').trim();
  const bulkStatusOptions = bulkDefaultStageId
    ? bulkDefaultStatusOptions
    : Array.isArray(leadOptions.allStatuses)
      ? leadOptions.allStatuses
      : [];

  const handleDeleteLeadClick = useCallback((lead) => {
    setLeadToDelete(lead);
  }, []);

  const handleDeleteLeadConfirm = useCallback(
    async (lead) => {
      if (!lead) return;
      const docId = lead.id ?? lead.name;
      if (!docId) {
        showErrorToast('Cannot delete: lead id not found');
        return;
      }
      setIsDeletingLead(true);
      try {
        await deleteCrmLead(docId);
        setLeadToDelete(null);
        setSelectedLeadIds((prev) => prev.filter((id) => id !== String(docId)));
        showSuccessToast('Lead deleted successfully');
        await fetchLeads(pagination.page, false);
      } catch {
        showErrorToast('Failed to delete lead');
      } finally {
        setIsDeletingLead(false);
      }
    },
    [fetchLeads, pagination.page],
  );

  const handleFieldUpdate = useCallback(
    async (leadId, fieldKey, value) => {
      if (!leadId) return false;
      let saveValue = value;
      if (fieldKey === 'pipeline') {
        const trimmed = String(value ?? '').trim();
        if (!trimmed || trimmed === SELECT_NONE_VALUE) {
          showErrorToast('Pipeline is required');
          return false;
        }
        const resolved = resolveLinkFieldSelectValue(trimmed, trimmed, leadOptions.pipelines);
        if (!resolved) {
          showErrorToast('Invalid pipeline selection');
          return false;
        }
        saveValue = resolved;
      }
      try {
        if (fieldKey === 'contact') {
          const contactId = String(saveValue ?? '').trim();
          await setCrmLeadPrimaryContact(leadId, contactId === '-' ? '' : contactId);
        } else {
          const payload = buildLeadFieldPayload(fieldKey, saveValue);
          if (!payload || Object.keys(payload).length === 0) return false;
          await updateCrmLead(leadId, payload);
        }
        await fetchLeads(pagination.page, false);
        return true;
      } catch {
        showErrorToast('Failed to update lead');
        return false;
      }
    },
    [fetchLeads, pagination.page, leadOptions.pipelines],
  );

  const handleBatchFieldUpdate = useCallback(
    async (leadId, fields) => {
      if (!leadId || !fields || typeof fields !== 'object') return;
      try {
        const { contact, ...rest } = fields;
        const payload = Object.entries(rest).reduce((acc, [key, val]) => {
          if (key === 'contacts') {
            acc.contacts = val;
            return acc;
          }
          const part = buildLeadFieldPayload(key, val);
          return { ...acc, ...part };
        }, {});
        if (Object.keys(payload).length > 0) {
          await updateCrmLead(leadId, payload);
        }
        if (contact !== undefined) {
          const contactId = String(contact ?? '').trim();
          await setCrmLeadPrimaryContact(leadId, contactId === '-' ? '' : contactId);
        }
        await fetchLeads(pagination.page, false);
      } catch {
        showErrorToast('Failed to update lead');
      }
    },
    [fetchLeads, pagination.page],
  );

  const handleCreateContactForLead = useCallback((lead, searchQuery = '') => {
    const leadId = lead?.id || lead?.name;
    if (!leadId) return;
    const existingContact = String(lead?.contact || '').trim();
    if (existingContact && existingContact !== '-') return;

    setCreateContactModal({
      open: true,
      lead,
      searchQuery: String(searchQuery || ''),
      createdContactId: '',
    });
  }, []);

  const handleCloseCreateContactModal = useCallback(() => {
    if (isCreatingContact) return;
    setCreateContactModal({
      open: false,
      lead: null,
      searchQuery: '',
      createdContactId: '',
    });
  }, [isCreatingContact]);

  const linkCreatedContactToLead = useCallback(
    async (leadId, contactId, { isRetry = false, accountValue } = {}) => {
      if (!leadId || !contactId) return false;

      try {
        const account = String(accountValue ?? '').trim();
        if (account && account !== '-') {
          await addCrmLeadContact(leadId, contactId, { setAsPrimary: true });
        } else {
          await setCrmLeadPrimaryContact(leadId, contactId);
        }
        await fetchLeads(pagination.page, false);

        showSuccessToast(
          isRetry ? 'Contact linked successfully' : 'Contact created and linked successfully',
        );
        setPendingContactLink(null);
        setCreateContactModal({
          open: false,
          lead: null,
          searchQuery: '',
          createdContactId: '',
        });
        getCrmContactList()
          .then((contacts) => setContactOptions(Array.isArray(contacts) ? contacts : []))
          .catch(() => {});
        return true;
      } catch {
        showErrorToast('Failed to link contact to lead');
        return false;
      }
    },
    [fetchLeads, pagination.page],
  );

  const handleSubmitCreateContact = useCallback(
    async (formData) => {
      const lead = createContactModal.lead;
      const leadId = lead?.id || lead?.name;
      if (!leadId) return;

      const existingContact = String(lead?.contact || '').trim();
      if (existingContact && existingContact !== '-') {
        showErrorToast('This lead already has a contact linked');
        return;
      }

      const accountValue = String(lead?.account_id || lead?.account || '').trim();
      let contactId = '';
      try {
        setIsCreatingContact(true);
        const contact = await createCrmContact({
          first_name: formData.first_name,
          last_name: formData.last_name || '',
          email: formData.email || undefined,
          mobile_number: formData.mobile_number || undefined,
          associate_account: accountValue === '-' ? '' : accountValue,
        });
        contactId =
          typeof contact === 'string'
            ? contact
            : String(contact?.name || contact?.value || '').trim();
        if (!contactId) throw new Error('Contact ID was not returned');

        const linked = await linkCreatedContactToLead(leadId, contactId, { accountValue });
        if (!linked) {
          setPendingContactLink({ leadId, contactId, accountValue });
          setCreateContactModal((previous) => ({
            ...previous,
            open: true,
            createdContactId: contactId,
          }));
        }
      } catch (error_) {
        if (contactId) {
          setPendingContactLink({ leadId, contactId, accountValue });
          setCreateContactModal((previous) => ({
            ...previous,
            open: true,
            createdContactId: contactId,
          }));
          showErrorToast(error_, {
            defaultMessage: 'Contact created but not linked to the lead. Use Retry to link.',
          });
          return;
        }
        showErrorToast(error_, { defaultMessage: 'Failed to create contact' });
      } finally {
        setIsCreatingContact(false);
      }
    },
    [createContactModal.lead, linkCreatedContactToLead],
  );

  const handleRetryLinkCreatedContact = useCallback(
    async (contactId) => {
      const lead = createContactModal.lead;
      const leadId = lead?.id || lead?.name;
      const id = String(contactId || createContactModal.createdContactId || '').trim();
      if (!leadId || !id) return;

      const existingContact = String(lead?.contact || '').trim();
      if (existingContact && existingContact !== '-') {
        showErrorToast('This lead already has a contact linked');
        return;
      }

      const accountValue = String(lead?.account_id || lead?.account || '').trim();
      try {
        setIsCreatingContact(true);
        await linkCreatedContactToLead(leadId, id, { isRetry: true, accountValue });
      } finally {
        setIsCreatingContact(false);
      }
    },
    [createContactModal.lead, createContactModal.createdContactId, linkCreatedContactToLead],
  );

  const handleRetryPendingContactLink = useCallback(async () => {
    if (!pendingContactLink) return;
    const { leadId, contactId, accountValue } = pendingContactLink;
    setIsRetryingContactLink(true);
    try {
      const linked = await linkCreatedContactToLead(leadId, contactId, {
        isRetry: true,
        accountValue,
      });
      if (!linked) {
        showErrorToast('Failed to link contact. Try again.');
      }
    } finally {
      setIsRetryingContactLink(false);
    }
  }, [pendingContactLink, linkCreatedContactToLead]);

  const handleCreateAccountForLead = useCallback(
    async (lead, searchQuery = '') => {
      const leadId = lead?.id || lead?.name;
      const accountName = String(searchQuery || '').trim();
      if (!leadId || !accountName) return null;

      try {
        const account = await createCrmAccount({
          customer_name: accountName,
          custom_status: 'Active',
        });
        const accountId =
          typeof account === 'string'
            ? account
            : String(account?.name || account?.value || '').trim();
        if (!accountId) throw new Error('Account ID was not returned');

        const contactId = String(lead?.contact || '').trim();
        if (contactId && contactId !== '-') {
          await updateCrmContact(contactId, { associate_account: accountId });
        }

        const linked = await handleFieldUpdate(leadId, 'account', accountId);
        if (!linked) return null;
        showSuccessToast('Account created and linked successfully');
        return { value: accountId, label: accountName };
      } catch (error_) {
        showErrorToast(error_, { defaultMessage: 'Failed to create account' });
        return null;
      }
    },
    [handleFieldUpdate],
  );

  const tableRows = useMemo(
    () =>
      leads.map((l) => ({
        ...l,
        _onDelete: () => handleDeleteLeadClick(l),
      })),
    [leads, handleDeleteLeadClick],
  );

  // ── Page pagination ──────────────────────────────────────────────────────
  return (
    <PageLayout showDefaultHeader={false} borderDivClassName='hidden'>
      <div className='flex flex-col h-full'>
        <div className='w-full flex items-center justify-between px-7 py-5 gap-4'>
          <div className='flex items-center gap-[14px]'>
            <div className='p-3 text-text-sub-500 bg-bg-weak-100 rounded-full flex items-center justify-center shrink-0'>
              <RiMoneyDollarCircleLine size={20} />
            </div>
            <div className='flex flex-col'>
              <span className='label-large text-text-main-900'>Leads</span>
              <span className='paragraph-small text-text-sub-500'>
                Manage all your leads details from here.
              </span>
            </div>
          </div>
        </div>
        <div className='w-[calc(100%-64px)] h-px bg-stroke-soft-200 mx-8' />

        <div className='px-7 w-full flex flex-col gap-1'>
          <CrmPipelineTabBar
            pipelines={pipelineTabsList}
            value={selectedPipelineId}
            counts={pipelineTabCounts}
            prefs={pipelineTabPrefs}
            onValueChange={handlePipelineTabChange}
            onReorder={handleReorderPipelineTabs}
            onTogglePin={togglePinPipelineTab}
            onHide={handleHidePipelineTab}
            onUnhide={handleUnhidePipelineTab}
            isMutating={isSavingTabPrefs}
          />
          <CrmLeadsTab
            tabs={leadStageTabs}
            value={selectedStageTab}
            counts={stageTabCounts}
            prefs={stageTabPrefs}
            onValueChange={handleStageTabChange}
            onReorder={handleReorderStageTabs}
            onTogglePin={handleTogglePinStageTab}
            onHide={handleHideStageTab}
            onUnhide={handleUnhideStageTab}
            isMutating={isSavingTabPrefs}
          />
        </div>

        <div className='flex flex-1 min-h-0 overflow-hidden px-7 pt-6 pb-0 flex flex-col gap-4'>
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
            showLifecycleStageFilter={selectedStageTab === 'all'}
            showAssignedToMeOnly={showAssignedToMeOnly}
            onShowAssignedToMeOnlyChange={handleShowAssignedToMeOnlyChange}
            saveViewSlot={
              <CrmLeadsSaveViewMenu
                isDirty={isViewDirty}
                hasPersonalView={hasPersonalView}
                canSaveViewForAll={canSaveViewForAll}
                isAutosaveEnabled={isAutosaveEnabled}
                isSaving={isSavingView}
                onSaveForMe={handleSaveViewForMe}
                onSaveForAll={handleSaveViewForAll}
                onResetToDefault={handleResetViewToDefault}
                onToggleAutosave={handleToggleAutosave}
                onRevertChanges={handleRevertChanges}
              />
            }
          />

          <PaginatedTableLayout scrollable={false} grouped={Boolean(groupBy)} {...paginationProps}>
            <CrmLeadsTable
              ref={tableRef}
              rows={tableRows}
              isLoading={isLoading || !viewHydrated || !stageRestoreComplete}
              error={error}
              onRetry={handleRetry}
              variant='compact'
              groupBy={groupBy}
              groupOrder={groupOrder}
              onGroupByChange={handleGroupByChange}
              sorting={sorting}
              onSortingChange={handleSortingChange}
              columnWidths={columnWidths}
              onColumnResize={resizeColumnsEnabled ? handleColumnResize : null}
              persistColumnConfig={persistColumnConfig}
              fetchColumnConfig={fetchColumnConfig}
              columnConfigId={
                viewHydrated ? `${REACT_TABLE_ID}-${selectedPipelineId}` : `${REACT_TABLE_ID}-boot`
              }
              onRowClick={onLeadRowClick}
              showDropReasonColumn={isDroppedLeadsTab}
              onContactClick={onLeadContactClick}
              contactOptions={contactOptions}
              onCreateContact={handleCreateContactForLead}
              onCreateAccount={handleCreateAccountForLead}
              leadOptions={leadOptions}
              stagesByPipeline={stagesByPipeline}
              ensureStagesForPipeline={ensureStagesForPipeline}
              onFieldUpdate={handleFieldUpdate}
              onBatchFieldUpdate={handleBatchFieldUpdate}
              freezeColumns
              enableSelection
              selectedLeadIds={selectedLeadIds}
              onToggleLeadSelection={handleToggleLeadSelection}
              onToggleSelectAll={handleToggleSelectAllLeads}
            />
          </PaginatedTableLayout>
        </div>
      </div>

      <CrmLeadsBulkActionsBar
        selectedCount={selectedLeadIds.length}
        leadOptions={leadOptions}
        pipelineScopedOptions={pipelineScopedOptions}
        stageOptions={bulkStageOptions}
        statusOptions={bulkStatusOptions}
        stageStatusMap={bulkStageStatusMap}
        stageColorMap={bulkStageColorMap}
        defaultPipelineId={isAllPipelineSelected ? '' : selectedPipelineId || ''}
        defaultStageId={bulkDefaultStageId}
        defaultStatusId={bulkDefaultStatusId}
        ensureStagesForPipeline={ensureStagesForPipeline}
        onClear={clearLeadSelection}
        onApplyField={handleBulkApplyField}
        onApplyPipeline={handleBulkApplyPipeline}
        disabled={isBulkApplying}
      />

      <Suspense fallback={null}>
        <CrmLeadCreateDrawer
          open={isCreateDrawerOpen}
          onOpenChange={setIsCreateDrawerOpen}
          onSuccess={handleCreateLead}
          leadOptions={leadOptions}
          defaultPipelineId={isAllPipelineSelected ? '' : selectedPipelineId}
          defaultLifecycleStageId={
            selectedStageTab === 'all' || selectedStageTab === DROPPED_LEADS_TAB_VALUE
              ? ''
              : selectedStageTab
          }
        />
        <CrmLeadCreateContactModal
          open={createContactModal.open}
          onOpenChange={(open) => {
            if (!open) handleCloseCreateContactModal();
          }}
          searchQuery={createContactModal.searchQuery}
          createdContactId={createContactModal.createdContactId}
          onSubmit={handleSubmitCreateContact}
          onRetryLink={handleRetryLinkCreatedContact}
          isSubmitting={isCreatingContact}
        />
      </Suspense>

      <DeleteConfirmModal
        isOpen={Boolean(leadToDelete)}
        onOpenChange={(open) => !open && setLeadToDelete(null)}
        title='Delete Lead?'
        description='Are you sure you want to delete this lead? This action cannot be undone.'
        item={leadToDelete}
        onConfirm={handleDeleteLeadConfirm}
        isLoading={isDeletingLead}
      />

      <Modal.Root
        open={Boolean(pendingContactLink)}
        onOpenChange={(open) => {
          if (!open) setPendingContactLink(null);
        }}
      >
        <Modal.Content className='max-w-[440px]' showClose={true}>
          <Modal.Header>
            <Modal.Title>Contact created but not linked</Modal.Title>
          </Modal.Header>
          <Modal.Body className='px-6 py-4'>
            <p className='text-paragraph-sm text-text-sub-600'>
              The contact was created, but linking it to this lead failed. Retry linking without
              creating another contact.
            </p>
          </Modal.Body>
          <Modal.Footer className='px-6 py-4 gap-3 flex justify-end'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              disabled={isRetryingContactLink}
              onClick={() => setPendingContactLink(null)}
            >
              Dismiss
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              size='small'
              disabled={isRetryingContactLink}
              onClick={handleRetryPendingContactLink}
            >
              {isRetryingContactLink ? 'Linking...' : 'Retry link'}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </PageLayout>
  );
};

export default CrmLeads;
