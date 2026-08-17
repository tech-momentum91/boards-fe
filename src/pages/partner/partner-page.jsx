import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RiLayoutGridLine, RiUserSharedLine } from 'react-icons/ri';

import PageLayout from '@/components/page-layout';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import {
  PartnerStats,
  PartnerStageTabs,
  PartnerToolbar,
  PartnerTable,
  PartnerCardGrid,
  PartnerCreateDrawer,
  VIEW_LIST,
  VIEW_CARD,
  buildPartnerStageTabOptionsFromDynamic,
} from '@/components/partner';
import { getStatusOptions } from '@/api/dynamic-status';
import { toEventStatusSelectOptions } from '@/components/event-management/event-dynamic-status-helpers';

import { selectCenterAccess, setSelectedCenters } from '@/redux/centerSlice';
import {
  getPartnerListViewThunk,
  createPartnerThunk,
  fetchPartnerMasterAssigneesByRoles,
  PARTNER_MASTER_ASSIGNEE_ROLES,
  selectPartnerMasterAssignees,
} from '@/redux/partnerSlice';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';
import {
  NO_CENTERS_EMPTY_STATE,
  adaptGlobalCenterIntent,
  deriveGlobalCenterIntent,
  isExplicitlyEmptyIntent,
  isLoadingIntent,
} from '@/utils/global-center-filter';

const PARTNER_STAGE_TABS_FALLBACK = [{ value: 'all', label: 'All', icon: RiLayoutGridLine }];

import { PARTNER_LIST_PAGE_SIZE, buildPartnerListOrderBy } from '@/components/partner/constants';

const PARTNER_FILTER_SESSION_KEY = 'partner-filters-v1';

const PARTNER_FILTER_DEFAULTS = {
  primaryCategory: [],
  secondaryCategory: [],
  industry: [],
  baseCity: [],
  companySize: [],
  revenueModel: [],
  engagementFrequency: [],
  onboardingStage: [],
  owner: [],
};

const PartnerPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const listFetchIdRef = useRef(0);

  const [isAddPartnerOpen, setIsAddPartnerOpen] = useState(false);

  //   Center Access
  const centerAccess = useSelector(selectCenterAccess);
  const handleCenterSelectionChange = useCallback(
    (newSelected) => {
      dispatch(setSelectedCenters(newSelected));
    },
    [dispatch],
  );

  // Shared global-centre filter intent (same contract every other module uses).
  // Partner has no centre Link field so subset/all both collapse to "no
  // restriction" server-side; only the explicit-empty leg short-circuits to
  // 0 results. The page mirrors the standard "No centers selected" empty
  // state in either the table or the card grid.
  const globalCenterIntent = useMemo(() => deriveGlobalCenterIntent(centerAccess), [centerAccess]);
  const noCenters = isExplicitlyEmptyIntent(globalCenterIntent);
  const centerAccessLoading = isLoadingIntent(globalCenterIntent);
  /** Centres payload for `getPartnerListViewThunk`. */
  const partnerCentersParam = useMemo(
    () => adaptGlobalCenterIntent.partner(globalCenterIntent),
    [globalCenterIntent],
  );

  // Search and Filters (session via usePersistedFilters; written shape keeps `appliedFilters` for compatibility)
  const [appliedFilters, setAppliedFilters] = usePersistedFilters({
    storageKey: PARTNER_FILTER_SESSION_KEY,
    defaultFilters: PARTNER_FILTER_DEFAULTS,
    persistIncludeKeys: Object.keys(PARTNER_FILTER_DEFAULTS),
    persistTrimStringArrays: true,
    compactFilters: (f) => {
      const inner = compactFiltersForSessionStorage(f, PARTNER_FILTER_DEFAULTS, {
        includeKeys: Object.keys(PARTNER_FILTER_DEFAULTS),
        trimStringArrayElements: true,
      });
      return inner && Object.keys(inner).length > 0 ? { appliedFilters: inner } : null;
    },
  });
  const [searchTerm, setSearchTerm] = useState('');

  const debouncedSearch = useDebounce(searchTerm, 500);
  const [sorting, setSorting] = useState([]);

  const { partnerListView, stageSummary } = useSelector((state) => state.partner);
  const partnerMasterAssignees = useSelector(selectPartnerMasterAssignees);
  const [onboardingStageDynamicTabs, setOnboardingStageDynamicTabs] = useState(null);
  const [onboardingStageFilterOptions, setOnboardingStageFilterOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getStatusOptions({ doctype: 'Partner', field: 'onboarding_stage' })
      .then((rows) => {
        if (cancelled) return;
        const selectOpts = toEventStatusSelectOptions(rows);
        setOnboardingStageFilterOptions(selectOpts);
        setOnboardingStageDynamicTabs(buildPartnerStageTabOptionsFromDynamic(rows));
      })
      .catch(() => {
        if (!cancelled) {
          setOnboardingStageFilterOptions([]);
          setOnboardingStageDynamicTabs(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stageTabsForUi = onboardingStageDynamicTabs?.length
    ? onboardingStageDynamicTabs
    : PARTNER_STAGE_TABS_FALLBACK;

  const stageTabValue = useMemo(() => {
    const st = appliedFilters.onboardingStage;
    if (!Array.isArray(st) || st.length === 0) return 'all';
    if (st.length !== 1) return 'all';
    const v = st[0];
    const inTabs = stageTabsForUi.some((t) => t.value === v);
    const inOptions = onboardingStageFilterOptions.some((o) => o.value === v);
    return inTabs || inOptions ? v : 'all';
  }, [appliedFilters.onboardingStage, stageTabsForUi, onboardingStageFilterOptions]);

  const handleStageTabChange = useCallback(
    (value) => {
      setAppliedFilters((previous) => ({
        ...previous,
        onboardingStage: value === 'all' ? [] : [value],
      }));
    },
    [setAppliedFilters],
  );

  const apiFilters = useMemo(
    () => ({
      primaryCategory: appliedFilters.primaryCategory,
      secondaryCategory: appliedFilters.secondaryCategory,
      industry: appliedFilters.industry,
      baseCity: appliedFilters.baseCity,
      companySize: appliedFilters.companySize,
      revenueModel: appliedFilters.revenueModel,
      engagementFrequency: appliedFilters.engagementFrequency,
      onboardingStage: appliedFilters.onboardingStage,
      owner: appliedFilters.owner,
    }),
    [appliedFilters],
  );

  const orderBy = useMemo(() => buildPartnerListOrderBy(sorting), [sorting]);

  const fetchPartnerListFirstPage = useCallback(() => {
    if (centerAccessLoading) return; // wait for centerAccess to resolve
    listFetchIdRef.current += 1;
    dispatch(
      getPartnerListViewThunk({
        keyword: debouncedSearch.trim(),
        page: 1,
        page_size: PARTNER_LIST_PAGE_SIZE,
        filters: apiFilters,
        order_by: orderBy,
        append: false,
        list_fetch_id: listFetchIdRef.current,
        centers: partnerCentersParam,
      }),
    );
  }, [dispatch, debouncedSearch, apiFilters, orderBy, centerAccessLoading, partnerCentersParam]);

  useEffect(() => {
    fetchPartnerListFirstPage();
  }, [fetchPartnerListFirstPage]);

  useEffect(() => {
    dispatch(
      fetchPartnerMasterAssigneesByRoles({
        roles: PARTNER_MASTER_ASSIGNEE_ROLES,
      }),
    );
  }, [dispatch]);

  const handleClearFilters = useCallback(() => {
    setAppliedFilters({ ...PARTNER_FILTER_DEFAULTS });
  }, [setAppliedFilters]);

  const handleFiltersChange = useCallback(
    (newFilters) => {
      setAppliedFilters((previous) => ({
        ...previous,
        ...newFilters,
        onboardingStage:
          newFilters && Object.prototype.hasOwnProperty.call(newFilters, 'onboardingStage')
            ? newFilters.onboardingStage
            : previous.onboardingStage,
      }));
    },
    [setAppliedFilters],
  );

  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const tableRef = useRef(null);
  const [view, setView] = useState(VIEW_LIST);

  const rows = useMemo(() => {
    const data = partnerListView?.data ?? [];
    return data.map((r) => ({
      id: r.name ?? r.id,
      partner_name: r.partner_name ?? r.partnerName,
      primary: r.primary_category ?? r.primary,
      secondary: r.secondary_category ?? r.secondary,
      industry: r.industry_type ?? r.industry,
      city: r.partner_base_city ?? r.city,
      size: r.company_size ?? r.size,
      revenue_model: (() => {
        const rm = r.revenue_model;
        if (
          Array.isArray(rm) &&
          rm.length > 0 &&
          typeof rm[0] === 'object' &&
          rm[0]?.revenue_model
        ) {
          return rm[0].revenue_model;
        }
        if (Array.isArray(rm) && typeof rm[0] === 'string') return rm[0];
        return r.preferred_revenue_models?.[0] ?? (typeof rm === 'string' ? rm : undefined);
      })(),
      frequency: r.estimated_engagement_frequency ?? r.frequency,
      stage: r.onboarding_stage ?? r.stage,
      onboarding_stage: r.onboarding_stage,
      onboarding_stage_color: r.onboarding_stage_color,
      primary_contact:
        r.primary_contact ??
        r.contact?.[0]?.contact_name ??
        r.contacts?.[0]?.name ??
        r.contacts?.[0]?.contact_name,
    }));
  }, [partnerListView?.data]);

  const stageOptionsForCounts = useMemo(() => {
    if (onboardingStageFilterOptions.length > 0) return onboardingStageFilterOptions;
    return stageTabsForUi
      .filter((t) => t.value !== 'all')
      .map((t) => ({ value: t.value, label: t.label }));
  }, [onboardingStageFilterOptions, stageTabsForUi]);

  const stageTabCounts = useMemo(() => {
    const sourceRows = Array.isArray(partnerListView?.data) ? partnerListView.data : [];
    const byStage = Object.fromEntries(stageOptionsForCounts.map((opt) => [opt.value, 0]));
    sourceRows.forEach((row) => {
      const stage = String(row?.onboarding_stage ?? row?.stage ?? '').trim();
      if (stage && Object.prototype.hasOwnProperty.call(byStage, stage)) {
        byStage[stage] += 1;
      }
    });
    return { all: sourceRows.length, ...byStage };
  }, [partnerListView?.data, stageOptionsForCounts]);

  const stats = {
    total_partners: String(rows.length),
    active: String(rows.filter((r) => r.stage === 'Active').length),
    contacts: String(rows.length * 2),
    cities: String(new Set(rows.map((r) => r.city).filter(Boolean)).size),
  };

  const ownerOptions = useMemo(() => {
    const users = partnerMasterAssignees?.users;

    if (!Array.isArray(users)) return [];

    return users
      .map((u) => ({
        value: u?.value ?? u?.user_id ?? u?.email ?? u?.name ?? '',
        label: u?.label ?? u?.full_name ?? u?.name ?? u?.email ?? '',
      }))
      .filter((opt) => opt.value && opt.label);
  }, [partnerMasterAssignees]);

  const handlePartnerCreated = useCallback(() => {
    fetchPartnerListFirstPage();
  }, [fetchPartnerListFirstPage]);

  const listPage = Number(partnerListView?.page) || 1;
  const listPageSize = Number(partnerListView?.page_size) || PARTNER_LIST_PAGE_SIZE;
  const hasMorePartners = Boolean(partnerListView?.has_more);
  const rawDataLength = partnerListView?.data?.length ?? 0;
  const isPartnerListInitialLoading = partnerListView?.loading && rawDataLength === 0;
  const isPartnerListLoadingMore = partnerListView?.loading && rawDataLength > 0;

  const handlePartnerLoadMore = useCallback(() => {
    if (partnerListView?.loading || !hasMorePartners || centerAccessLoading) return;
    dispatch(
      getPartnerListViewThunk({
        keyword: debouncedSearch.trim(),
        page: listPage + 1,
        page_size: listPageSize,
        filters: apiFilters,
        order_by: orderBy,
        append: true,
        list_fetch_id: listFetchIdRef.current,
        centers: partnerCentersParam,
      }),
    );
  }, [
    dispatch,
    debouncedSearch,
    apiFilters,
    orderBy,
    partnerListView?.loading,
    hasMorePartners,
    listPage,
    listPageSize,
    centerAccessLoading,
    partnerCentersParam,
  ]);

  const handleCreatePartner = useCallback(
    async (payload) => {
      await dispatch(createPartnerThunk(payload)).unwrap();
      handlePartnerCreated();
    },
    [dispatch, handlePartnerCreated],
  );

  return (
    <PageLayout
      pageTitle='Partners'
      pageIcon={<RiUserSharedLine size={24} />}
      pageDescription='Manage ecosystem and business partners.'
      contentAreaClassName='overflow-hidden'
      headerActions={
        <CenterAccessDropdown
          centers={centerAccess.data}
          selectedCenters={centerAccess.selectedCenters}
          onChange={handleCenterSelectionChange}
          isLoading={centerAccess.status === 'loading'}
        />
      }
    >
      <div className='flex flex-col gap-6 px-4 sm:px-6 lg:px-8 pb-10 flex-1 min-h-0'>
        {/* Stats Section */}
        <PartnerStats stats={stats} />

        <PartnerStageTabs
          value={stageTabValue}
          counts={stageTabCounts}
          isLoading={isPartnerListInitialLoading}
          onValueChange={handleStageTabChange}
          tabs={stageTabsForUi}
        />

        {/* Toolbar Section */}
        <PartnerToolbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          onClearFilters={handleClearFilters}
          appliedFilters={appliedFilters}
          onFiltersChange={handleFiltersChange}
          onboardingStageFilterOptions={onboardingStageFilterOptions}
          tableRef={tableRef}
          isColumnManagerOpen={isColumnManagerOpen}
          onOpenColumnManagerChange={setIsColumnManagerOpen}
          onExport={() => {}}
          onAddPartner={() => setIsAddPartnerOpen(true)}
          view={view}
          onViewChange={setView}
          ownerOptions={ownerOptions}
        />

        {/* Content Section - List or Card view */}
        {view === VIEW_LIST ? (
          <PartnerTable
            ref={tableRef}
            rows={partnerListView?.data}
            onboardingStageOptions={onboardingStageFilterOptions}
            sorting={sorting}
            onSortingChange={setSorting}
            isLoading={isPartnerListInitialLoading}
            isLoadingMore={isPartnerListLoadingMore}
            hasMore={hasMorePartners}
            onLoadMore={handlePartnerLoadMore}
            enableScrollPagination
            tableId='partner-table'
            columns={partnerListView?.columns}
            onColumnsSynced={fetchPartnerListFirstPage}
            onRowClick={(row) =>
              navigate(`/partner/${row.name}`, { state: { initialPartner: row } })
            }
            emptyTitle={noCenters ? NO_CENTERS_EMPTY_STATE.title : undefined}
            emptyDescription={noCenters ? NO_CENTERS_EMPTY_STATE.description : undefined}
          />
        ) : (
          <PartnerCardGrid
            rows={rows}
            isLoading={isPartnerListInitialLoading}
            isLoadingMore={isPartnerListLoadingMore}
            hasMore={hasMorePartners}
            onLoadMore={handlePartnerLoadMore}
            totalCount={partnerListView?.total_count}
            loadedCount={rawDataLength}
            onViewDetails={(row) =>
              navigate(`/partner/${row.id}`, { state: { initialPartner: row } })
            }
            emptyTitle={noCenters ? NO_CENTERS_EMPTY_STATE.title : undefined}
            emptyDescription={noCenters ? NO_CENTERS_EMPTY_STATE.description : undefined}
          />
        )}
      </div>

      <PartnerCreateDrawer
        open={isAddPartnerOpen}
        onOpenChange={setIsAddPartnerOpen}
        onCreatePartner={handleCreatePartner}
        onboardingStageOptions={onboardingStageFilterOptions}
      />
    </PageLayout>
  );
};

export default PartnerPage;
