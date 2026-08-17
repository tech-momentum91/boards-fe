import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiCalendarLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';

import PageLayout from '@/components/page-layout';
import EventStats from '@/components/event-management/event-stats';
import EventStatusTabs from '@/components/event-management/event-status-tabs';
import EventsToolbar from '@/components/event-management/events-toolbar';
import EventsTable from '@/components/event-management/events-table';
import CreateMicroEvent from '@/components/event-management/create-micro';
import CreateCommunityEvent from '@/components/event-management/create-community';
import CreateExternalEvent from '@/components/event-management/create-external';
import { useDispatch, useSelector } from 'react-redux';
import {
  getEventTypeListThunk,
  getEventStatusCountsThunk,
  getEventCentersThunk,
  getEventClientsThunk,
  getPartnersResourceThunk,
  selectEventsListView,
  selectEventsListViewLoading,
  selectEventStatusCounts,
  selectEventCenters,
  selectEventClients,
  selectPartnersResource,
  selectPartnersResourceLoading,
  selectPartnersResourceHasFetched,
} from '@/redux/eventsSlice';
import {
  EVENT_CATEGORY_OPTIONS,
  EVENT_ENGAGEMENT_MODE_OPTIONS,
  EVENT_MANAGEMENT_STATS,
  EVENT_REVENUE_MODE_OPTIONS,
  EVENT_TYPE_API_VALUE,
  EVENTS_LIST_PAGE_SIZE,
  EVENTS_PAGE_CONFIG,
  buildEventTypeListFiltersArray,
  buildEventsListOrderBy,
  PARTICIPATION_TYPE_OPTIONS,
} from '@/components/event-management/constant';
import { getStatusOptions } from '@/api/dynamic-status';
import {
  buildEventStatusTabsAndFilterMap,
  eventsStatusFieldForModule,
  toEventStatusSelectOptions,
} from '@/components/event-management/event-dynamic-status-helpers';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';

/** @typedef {'spotlight' | 'community' | 'hosted'} EventsModuleType */

// One-time migration: move any saved filter state from the pre-rename storage keys
// (events-view-filter-dropdown-micro / -external) to the new keys
// (events-view-filter-dropdown-spotlight / -hosted) so users don't silently
// lose their persisted filters after the Micro→Spotlight / External→Hosted rename.
(function migrateEventFilterStorageKeys() {
  const migrations = [
    ['events-view-filter-dropdown-micro', 'events-view-filter-dropdown-spotlight'],
    ['events-view-filter-dropdown-external', 'events-view-filter-dropdown-hosted'],
  ];
  migrations.forEach(([oldKey, newKey]) => {
    try {
      const saved = sessionStorage.getItem(oldKey);
      if (saved && !sessionStorage.getItem(newKey)) {
        sessionStorage.setItem(newKey, saved);
      }
      sessionStorage.removeItem(oldKey);
    } catch {
      // sessionStorage may be unavailable in some environments
    }
  });
})();

/**
 * Maps `get_event_status_counts` labels (e.g. "All", "Open For Registration") to
 * `EventStatusTabs` values (e.g. all, open_for_registration).
 */
const mapApiStatusCountsToTabValues = (raw = {}) => {
  const mapped = {};
  Object.entries(raw).forEach(([key, count]) => {
    const safe = Number(count);
    const n = Number.isFinite(safe) ? safe : 0;
    const trimmed = String(key ?? '').trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === 'all') {
      mapped.all = n;
      return;
    }
    const tabKey = trimmed.toLowerCase().replaceAll(' ', '_');
    mapped[tabKey] = n;
  });
  if (mapped.planned == null && mapped.planning_phase != null) {
    mapped.planned = mapped.planning_phase;
  }
  if (mapped.all == null) {
    mapped.all = 0;
  }
  return mapped;
};

const INITIAL_FILTERS = {
  search: '',
  center: [],
  partner: [],
  status: [],
  engagement_mode: [],
  revenue_mode: [],
  category: [],
  participation_type: [],
};

const EVENTS_VIEW_DEFAULTS = {
  ...INITIAL_FILTERS,
  statusFilter: 'all',
};

const EVENTS_VIEW_FILTER_PERSIST_KEYS = Object.keys(EVENTS_VIEW_DEFAULTS);

/**
 * Single events list page; pass `moduleType` from the route (same pattern as `Agreements` + `mode`).
 *
 * @param {{ moduleType?: EventsModuleType }} props
 */
const EventsPage = ({ moduleType = 'spotlight' }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const eventsViewStorageKey = `events-view-filter-dropdown-${moduleType}`;
  const [eventsView, setEventsView] = usePersistedFilters({
    storageKey: eventsViewStorageKey,
    defaultFilters: EVENTS_VIEW_DEFAULTS,
    compactFilters: (view) =>
      compactFiltersForSessionStorage(view, EVENTS_VIEW_DEFAULTS, {
        includeKeys: EVENTS_VIEW_FILTER_PERSIST_KEYS,
        trimStringArrayElements: true,
        scalarDiffKeys: ['statusFilter'],
      }),
  });

  const filters = useMemo(
    () => ({
      search: eventsView.search ?? '',
      center: eventsView.center ?? [],
      partner: eventsView.partner ?? [],
      status: eventsView.status ?? [],
      engagement_mode: eventsView.engagement_mode ?? [],
      revenue_mode: eventsView.revenue_mode ?? [],
      category: eventsView.category ?? [],
      participation_type: eventsView.participation_type ?? [],
    }),
    [eventsView],
  );
  const statusFilter = eventsView.statusFilter ?? 'all';

  const setFilters = useCallback(
    (updater) => {
      setEventsView((prev) => {
        const prevFilters = {
          search: prev.search ?? '',
          center: prev.center ?? [],
          partner: prev.partner ?? [],
          status: prev.status ?? [],
          engagement_mode: prev.engagement_mode ?? [],
          revenue_mode: prev.revenue_mode ?? [],
          category: prev.category ?? [],
          participation_type: prev.participation_type ?? [],
        };
        const nextFilters = typeof updater === 'function' ? updater(prevFilters) : updater;
        return { ...prev, ...nextFilters };
      });
    },
    [setEventsView],
  );

  const setStatusFilter = useCallback(
    (value) => {
      setEventsView((prev) => ({ ...prev, statusFilter: value }));
    },
    [setEventsView],
  );

  const [sorting, setSorting] = useState([]);
  const tableRef = useRef(null);
  const listFetchIdRef = useRef(0);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [eventsStatusOptionsRaw, setEventsStatusOptionsRaw] = useState([]);
  const [fixedEventStatusSummary, setFixedEventStatusSummary] = useState(null);
  const partnersRaw = useSelector(selectPartnersResource);
  const isPartnersLoading = useSelector(selectPartnersResourceLoading);
  const hasFetchedPartners = useSelector(selectPartnersResourceHasFetched);

  const pageMeta = useMemo(
    () => EVENTS_PAGE_CONFIG[moduleType] || EVENTS_PAGE_CONFIG.spotlight,
    [moduleType],
  );

  const eventsListView = useSelector(selectEventsListView);
  const isEventsLoading = useSelector(selectEventsListViewLoading);
  const eventStatusSummary = useSelector(selectEventStatusCounts);
  const centersRaw = useSelector(selectEventCenters);
  const clientsRaw = useSelector(selectEventClients);
  const eventType = EVENT_TYPE_API_VALUE[moduleType] || EVENT_TYPE_API_VALUE.spotlight;
  const eventsRows = eventsListView.results || [];
  const listPage = Number(eventsListView.page) || 1;
  const listPageSize = Number(eventsListView.page_size) || EVENTS_LIST_PAGE_SIZE;
  const totalCountList = Number(eventsListView.total_count) || 0;
  const hasMoreEvents = Boolean(eventsListView.has_more);
  const isListInitialLoading = isEventsLoading && eventsRows.length === 0;
  const isListLoadingMore = isEventsLoading && eventsRows.length > 0;

  useEffect(() => {
    dispatch(getEventCentersThunk({ page: 1, pageSize: 900 }));
    dispatch(getEventClientsThunk({ page: 1, pageSize: 900 }));
  }, [dispatch]);

  useEffect(() => {
    let isMounted = true;
    setFixedEventStatusSummary(null);
    dispatch(getEventStatusCountsThunk({ event_type: eventType }))
      .unwrap()
      .then((payload) => {
        if (!isMounted) return;
        setFixedEventStatusSummary(payload || null);
      })
      .catch(() => {
        if (!isMounted) return;
        setFixedEventStatusSummary(null);
      });
    return () => {
      isMounted = false;
    };
  }, [dispatch, eventType]);

  useEffect(() => {
    if (!hasFetchedPartners && !isPartnersLoading) {
      dispatch(getPartnersResourceThunk());
    }
  }, [dispatch, hasFetchedPartners, isPartnersLoading]);

  const partnerOptions = useMemo(() => {
    const rows = partnersRaw || [];
    return (Array.isArray(rows) ? rows : [])
      .map((p) => ({
        label: p?.partner_name || p?.name || '--',
        value: p?.name || '',
        meta: p,
      }))
      .filter((opt) => opt.value);
  }, [partnersRaw]);

  useEffect(() => {
    setSorting([]);
  }, [moduleType]);

  useEffect(() => {
    let cancelled = false;
    const field = eventsStatusFieldForModule(moduleType);
    getStatusOptions({ doctype: 'Events', field })
      .then((rows) => {
        if (!cancelled) setEventsStatusOptionsRaw(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setEventsStatusOptionsRaw([]);
      });
    return () => {
      cancelled = true;
    };
  }, [moduleType]);

  /** Tabs + filter map from Status Configuration (`Events` + status / community_status). */
  const { tabs: statusTabs, tabToFilterValues } = useMemo(
    () => buildEventStatusTabsAndFilterMap(eventsStatusOptionsRaw),
    [eventsStatusOptionsRaw],
  );

  const toolbarStatusOptions = useMemo(
    () => toEventStatusSelectOptions(eventsStatusOptionsRaw),
    [eventsStatusOptionsRaw],
  );

  useEffect(() => {
    const tabMap = tabToFilterValues;
    const selectedStatuses = Array.isArray(filters.status) ? filters.status : [];
    if (selectedStatuses.length !== 1) return;
    const value = selectedStatuses[0];
    const matchedTab = Object.entries(tabMap).find(
      ([tab, statuses]) =>
        tab !== 'all' && Array.isArray(statuses) && statuses.length === 1 && statuses[0] === value,
    )?.[0];
    if (matchedTab && matchedTab !== statusFilter) setStatusFilter(matchedTab);
  }, [filters.status, statusFilter, tabToFilterValues, setStatusFilter]);

  const effectiveStatusFilters = useMemo(() => {
    const fromTabs = Array.isArray(tabToFilterValues[statusFilter])
      ? tabToFilterValues[statusFilter]
      : [];
    const fromFilters = Array.isArray(filters.status) ? filters.status.filter(Boolean) : [];
    return fromFilters.length > 0 ? fromFilters : fromTabs;
  }, [statusFilter, filters.status, tabToFilterValues]);

  const effectiveListFilters = useMemo(
    () => ({ ...filters, status: effectiveStatusFilters }),
    [filters, effectiveStatusFilters],
  );

  const listFiltersArray = useMemo(
    () => buildEventTypeListFiltersArray(effectiveListFilters, moduleType),
    [effectiveListFilters, moduleType],
  );
  const statusCountsFiltersArray = useMemo(
    () => buildEventTypeListFiltersArray({ ...filters, status: [] }, moduleType),
    [filters, moduleType],
  );

  useEffect(() => {
    dispatch(
      getEventStatusCountsThunk({
        event_type: eventType,
        filters: statusCountsFiltersArray,
      }),
    );
  }, [dispatch, eventType, statusCountsFiltersArray]);

  const orderBy = useMemo(() => buildEventsListOrderBy(moduleType, sorting), [moduleType, sorting]);

  useEffect(() => {
    listFetchIdRef.current += 1;
    const listFetchId = listFetchIdRef.current;
    dispatch(
      getEventTypeListThunk({
        event_type: eventType,
        keyword: filters.search || '',
        status: 'all',
        filters: listFiltersArray,
        page: 1,
        page_size: EVENTS_LIST_PAGE_SIZE,
        append: false,
        list_fetch_id: listFetchId,
        order_by: orderBy,
      }),
    );
  }, [dispatch, eventType, filters.search, listFiltersArray, statusFilter, orderBy]);

  const handleEventsLoadMore = useCallback(() => {
    if (isEventsLoading || !hasMoreEvents) return;
    const nextPage = listPage + 1;
    dispatch(
      getEventTypeListThunk({
        event_type: eventType,
        keyword: filters.search || '',
        status: 'all',
        filters: listFiltersArray,
        page: nextPage,
        page_size: listPageSize,
        append: true,
        list_fetch_id: listFetchIdRef.current,
        order_by: orderBy,
      }),
    );
  }, [
    dispatch,
    eventType,
    filters.search,
    listFiltersArray,
    hasMoreEvents,
    isEventsLoading,
    listPage,
    listPageSize,
    orderBy,
  ]);

  const statusCounts = useMemo(() => {
    const raw = eventStatusSummary.status_counts || {};
    const mapped = mapApiStatusCountsToTabValues(raw);
    const hasAllInPayload = Object.keys(raw).some((k) => String(k).trim().toLowerCase() === 'all');
    if (!hasAllInPayload && eventStatusSummary.total_events > 0) {
      mapped.all = eventStatusSummary.total_events;
    }
    return mapped;
  }, [eventStatusSummary.status_counts, eventStatusSummary.total_events]);

  const eventStats = useMemo(() => {
    const statsSummary = fixedEventStatusSummary || eventStatusSummary;
    const template = EVENT_MANAGEMENT_STATS[moduleType]?.stat || [];
    const sc = statsSummary.status_counts || {};
    const byTab = mapApiStatusCountsToTabValues(sc);
    const valueMap = {
      total_spotlight_events: statsSummary.total_events,
      total_events: statsSummary.total_events,
      upcoming_events: statsSummary.upcoming_events,
      upcoming_events_community: statsSummary.upcoming_events,
      completed_events:
        statsSummary.completed_events ?? byTab.completed ?? sc.Completed ?? sc['Completed'] ?? 0,
      executed_events: statsSummary.executed_events,
      approved_by_hod: byTab.approved_by_ho ?? statsSummary.approved_by_ho ?? 0,
      total_seat_capacity: statsSummary.total_seat_capacity,
      open_for_registration:
        byTab.open_for_registration ??
        sc['Open For Registration'] ??
        sc['Open for Registration'] ??
        0,
      total_registrations: statsSummary.total_registrations,
    };
    return template.map((stat) => ({
      ...stat,
      value: valueMap[stat.key] ?? 0,
    }));
  }, [moduleType, eventStatusSummary, fixedEventStatusSummary]);

  const centerOptions = useMemo(() => {
    const rows = centersRaw || [];
    return (Array.isArray(rows) ? rows : [])
      .map((c) => {
        const label = c?.center_name || c?.center || c?.name || '--';
        const value = c?.name || c?.center || c?.center_name || '';
        return { label, value };
      })
      .filter((opt) => opt.value);
  }, [centersRaw]);

  // console.log('centerOptions',centerOptions);

  const clientOptions = useMemo(() => {
    const rows = clientsRaw || [];
    return (Array.isArray(rows) ? rows : [])
      .map((c) => {
        const label = c?.customer_name || c?.custom_legal_name || c?.name || '--';
        const value = c?.name || label;
        const centerRefs = Array.isArray(c?.center_refs) ? c.center_refs : [];
        return { label, value, meta: { centerRefs } };
      })
      .filter((opt) => opt.value);
  }, [clientsRaw]);

  return (
    <PageLayout
      pageTitle={pageMeta.pageTitle}
      pageIcon={<RiCalendarLine size={24} />}
      pageDescription={pageMeta.pageDescription}
      contentAreaClassName='overflow-hidden'
    >
      <div className='flex flex-col gap-6 px-8 py-5 flex-1 min-h-0'>
        <EventStats moduleType={moduleType} stats={eventStats} />
        <EventStatusTabs
          value={statusFilter}
          onValueChange={(nextStatus) => {
            setEventsView((prev) => ({
              ...prev,
              statusFilter: nextStatus,
              status: tabToFilterValues[nextStatus] || [],
            }));
          }}
          counts={statusCounts}
          tabs={statusTabs}
        />
        <EventsToolbar
          key={moduleType}
          moduleType={moduleType}
          filters={filters}
          onSearchChange={(search) => setFilters((prev) => ({ ...prev, search }))}
          onFiltersChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
          appliedFilters={filters}
          tableRef={tableRef}
          onAddEvent={() => setIsCreateDrawerOpen(true)}
          centerOptions={centerOptions}
          partnerOptions={partnerOptions}
          statusOptions={toolbarStatusOptions}
          engagementModeOptions={EVENT_ENGAGEMENT_MODE_OPTIONS}
          revenueModeOptions={EVENT_REVENUE_MODE_OPTIONS}
          categoryOptions={EVENT_CATEGORY_OPTIONS}
          participationTypeOptions={PARTICIPATION_TYPE_OPTIONS}
        />
        <EventsTable
          ref={tableRef}
          moduleType={moduleType}
          rows={eventsRows}
          partnerOptions={partnerOptions}
          centerOptions={centerOptions}
          sorting={sorting}
          onSortingChange={setSorting}
          isLoading={isListInitialLoading}
          isLoadingMore={isListLoadingMore}
          enableScrollPagination
          hasMore={hasMoreEvents}
          onLoadMore={handleEventsLoadMore}
          loadedCount={eventsRows.length}
          totalCount={totalCountList}
          onRowClick={(row) => {
            const docName = row?.name;
            if (!docName) return;
            navigate(`/events/${encodeURIComponent(docName)}`);
          }}
        />
        {moduleType === 'spotlight' && (
          <CreateMicroEvent
            open={isCreateDrawerOpen}
            onOpenChange={setIsCreateDrawerOpen}
            centerOptions={centerOptions}
            clientOptions={clientOptions}
            partnerOptions={partnerOptions}
          />
        )}
        {moduleType === 'community' && (
          <CreateCommunityEvent
            open={isCreateDrawerOpen}
            onOpenChange={setIsCreateDrawerOpen}
            centerOptions={centerOptions}
            clientOptions={clientOptions}
          />
        )}
        {moduleType === 'hosted' && (
          <CreateExternalEvent
            open={isCreateDrawerOpen}
            onOpenChange={setIsCreateDrawerOpen}
            centerOptions={centerOptions}
            partnerOptions={partnerOptions}
          />
        )}
      </div>
    </PageLayout>
  );
};

export default EventsPage;
