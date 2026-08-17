import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiTaskLine } from 'react-icons/ri';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { startOfMonth, endOfMonth, format } from 'date-fns';

import PageLayout from '@/components/page-layout';
import { fetchCenterAccess, selectCenterAccess } from '@/redux/centerSlice';
import {
  fetchMyTasks,
  fetchMyTasksCalendar,
  fetchMyTaskFilterOptions,
  fetchMyTaskTabCounts,
  setActiveTab,
  selectMyTaskItems,
  selectMyTaskLoading,
  selectMyTaskLoadingMore,
  selectMyTaskHasMore,
  selectMyTaskPage,
  selectMyTaskPerSource,
  selectMyTaskActiveTab,
  selectMyTaskCalendarItems,
  selectMyTaskCalendarLoading,
  selectMyTaskCalendarError,
} from '@/redux/myTaskSlice';

import MyTaskToolbar from '@/components/my-tasks/my-task-toolbar';
import MyTaskTable from '@/components/my-tasks/my-task-table';
import MyTaskInboxTab from '@/components/my-tasks/my-task-inbox-tab';
import MyTaskDetailDrawers from '@/components/my-tasks/my-task-detail-drawers';
import MyTaskViewTabs from '@/components/my-tasks/my-task-view-tabs';
import MyTaskCalendar from '@/components/my-tasks/my-task-calendar';
import MyTaskCalendarToolbar from '@/components/my-tasks/my-task-calendar-toolbar';
import MyTaskAnalytics from '@/components/my-tasks/my-task-analytics';
import {
  MY_TASK_URL_TAB,
  MY_TASK_SUB_TAB_VALUES,
  MY_TASK_FILTERS_STORAGE_KEY,
  compactMyTaskFiltersByTabForStorage,
  createDefaultMyTaskFiltersByTab,
  isValidMyTaskSubTab,
  getMyTaskDrawerKind,
  mergeStoredMyTaskFiltersByTab,
} from '@/components/my-tasks/my-task-constants';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import {
  INBOX_FILTER_SESSION_KEY,
  INBOX_APPLIED_FILTER_DEFAULTS,
  mergeStoredInboxFilters,
} from '@/components/inbox/inbox-constants';
import { showErrorToast } from '@/utils/error-utils';
import {
  GLOBAL_CENTER_STATUS,
  NO_CENTERS_EMPTY_STATE,
  deriveGlobalCenterIntent,
  isExplicitlyEmptyIntent,
  isLoadingIntent,
} from '@/utils/global-center-filter';

/**
 * Default per-sub-tab filter shape (canonical empty buckets for every tab).
 * Filter persistence helpers live in `my-task-constants.js`; we expose the
 * default factory there so the same shape is used by readers and writers.
 */
const DEFAULT_MY_TASK_FILTERS_BY_TAB = createDefaultMyTaskFiltersByTab();

function createDefaultSearchByTab() {
  const initial = {};
  MY_TASK_SUB_TAB_VALUES.forEach((key) => {
    initial[key] = '';
  });
  return initial;
}

const MyTask = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const tableRef = useRef(null);
  const inboxTabRef = useRef(null);
  /** Live column manager API for toolbar (ref alone does not re-render parent). */
  const [columnConfigHook, setColumnConfigHook] = useState(null);
  const [searchByTab, setSearchByTab] = useState(createDefaultSearchByTab);
  const [debouncedSearchByTab, setDebouncedSearchByTab] = useState(createDefaultSearchByTab);
  /**
   * Status / priority / dueDate filters are stored per module tab
   * (All, Ticket, Client, Center, CRM, CP, Agreement) and persisted to
   * sessionStorage via `usePersistedFilters` under a single slot. Reads go
   * through `mergeStoredMyTaskFiltersByTab` so every consumer sees the
   * canonical `{ statuses, priorities, dueDate(Date|null) }` shape and
   * `dueDate` is rehydrated to a Date instance after a refresh.
   */
  const [persistedFiltersByTab, setFiltersByTab] = usePersistedFilters({
    storageKey: MY_TASK_FILTERS_STORAGE_KEY,
    defaultFilters: DEFAULT_MY_TASK_FILTERS_BY_TAB,
    compactFilters: compactMyTaskFiltersByTabForStorage,
  });
  const filtersByTab = useMemo(
    () => mergeStoredMyTaskFiltersByTab(persistedFiltersByTab),
    [persistedFiltersByTab],
  );
  const [inboxClearMeta, setInboxClearMeta] = useState({
    hasItems: false,
    isLoading: false,
  });
  const [persistedInboxFilters, setPersistedInboxFilters] = usePersistedFilters({
    storageKey: INBOX_FILTER_SESSION_KEY,
    defaultFilters: INBOX_APPLIED_FILTER_DEFAULTS,
    persistIncludeKeys: ['filters'],
    persistTrimStringArrays: true,
  });
  const inboxAppliedFilters = useMemo(
    () => mergeStoredInboxFilters(persistedInboxFilters),
    [persistedInboxFilters],
  );
  const setInboxAppliedFilters = useCallback(
    (next) => {
      setPersistedInboxFilters((previous) => {
        const current = mergeStoredInboxFilters(previous);
        const resolved = typeof next === 'function' ? next(current) : next;
        const arr = Array.isArray(resolved) ? resolved : [];
        return { ...INBOX_APPLIED_FILTER_DEFAULTS, filters: arr };
      });
    },
    [setPersistedInboxFilters],
  );
  const [selectedTaskRow, setSelectedTaskRow] = useState(null);
  const [activeView, setActiveView] = useState('list');
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [calendarDateFields, setCalendarDateFields] = useState(['due_date']);

  // Center access
  const centerAccess = useSelector(selectCenterAccess);
  const allCenterData = useSelector(
    (state) => state.center?.centerAccess?.data ?? [],
    shallowEqual,
  );
  const selectedCenters = useSelector(
    (state) => state.center?.centerAccess?.selectedCenters ?? [],
    shallowEqual,
  );
  // True when the backend confirmed the user can see every center in the system.
  const isAllCenter = useSelector((state) => state.center?.centerAccess?.isAllCenter ?? true);

  // Centre header — uses the shared `adaptGlobalCenterIntent.myTask` contract
  // so empty selection now flows as "match nothing" (backend short-circuits
  // to 0 rows), matching every other module migrated under
  // `@/utils/global-center-filter`.
  //
  // Subtle preserved behaviour: when the user has access to a *subset* of all
  // system centres and selects every centre they can see, we still send the
  // explicit ID list (rather than the legacy `'All'` sentinel) so the backend
  // does NOT widen the result set to centreless modules / centres outside
  // their access.
  const globalCenterIntent = useMemo(() => deriveGlobalCenterIntent(centerAccess), [centerAccess]);
  const noCenters = isExplicitlyEmptyIntent(globalCenterIntent);
  const centerAccessLoading = isLoadingIntent(globalCenterIntent);
  const allSelected = allCenterData.length > 0 && selectedCenters.length >= allCenterData.length;
  const centersForApi = useMemo(() => {
    if (centerAccessLoading) return undefined;
    // Empty -> [] (explicit empty; backend returns 0 rows).
    if (globalCenterIntent.status === GLOBAL_CENTER_STATUS.Empty) return [];
    // True "All centres in the system" (only when the user truly has global
    // access). Send the legacy 'All' sentinel so centreless sources
    // (CRM/CP/Client) are included by the backend.
    if (allSelected && isAllCenter) return 'All';
    // Subset, OR "all selected but user only has subset access": pass the
    // explicit ID list so the backend does NOT widen the result set.
    return selectedCenters;
  }, [centerAccessLoading, allSelected, isAllCenter, globalCenterIntent.status, selectedCenters]);

  // My Task state
  const items = useSelector(selectMyTaskItems);
  const loading = useSelector(selectMyTaskLoading);
  const loadingMore = useSelector(selectMyTaskLoadingMore);
  const hasMore = useSelector(selectMyTaskHasMore);
  const page = useSelector(selectMyTaskPage);
  const perSource = useSelector(selectMyTaskPerSource);
  const activeTab = useSelector(selectMyTaskActiveTab);
  const calendarItems = useSelector(selectMyTaskCalendarItems);
  const calendarLoading = useSelector(selectMyTaskCalendarLoading);
  const calendarError = useSelector(selectMyTaskCalendarError);

  const { filterStatuses, filterPriorities } = useMemo(() => {
    const bucket = filtersByTab[activeTab] ?? { statuses: [], priorities: [], dueDate: null };
    return {
      filterStatuses: Array.isArray(bucket.statuses) ? bucket.statuses : [],
      filterPriorities: Array.isArray(bucket.priorities) ? bucket.priorities : [],
    };
  }, [filtersByTab, activeTab]);
  const dueDateRange = useMemo(() => {
    const bucket = filtersByTab[activeTab] ?? { dueDate: null };
    return bucket.dueDate ?? null;
  }, [filtersByTab, activeTab]);
  const searchQuery = searchByTab[activeTab] ?? '';
  const debouncedSearch = debouncedSearchByTab[activeTab] ?? '';
  const filtersByTabKey = useMemo(() => JSON.stringify(filtersByTab), [filtersByTab]);
  const debouncedSearchByTabKey = useMemo(
    () => JSON.stringify(debouncedSearchByTab),
    [debouncedSearchByTab],
  );

  const tabParameter = searchParams.get('tab');
  const activeSubTab =
    tabParameter === MY_TASK_URL_TAB.TASK_INBOX
      ? 'inbox'
      : tabParameter === MY_TASK_URL_TAB.TASK_ANALYTICS
        ? 'analytics'
        : 'tasks';

  useEffect(() => {
    if (activeSubTab !== 'tasks') {
      setColumnConfigHook(null);
      setActiveView('list');
    }
  }, [activeSubTab]);

  const handleColumnConfigBridge = useCallback((hook) => {
    setColumnConfigHook(hook);
  }, []);

  const handleFiltersApply = useCallback(
    (next) => {
      const s = Array.isArray(next?.statuses) ? next.statuses : [];
      const p = Array.isArray(next?.priorities) ? next.priorities : [];
      setFiltersByTab((prev) => {
        const merged = mergeStoredMyTaskFiltersByTab(prev);
        const cur = merged[activeTab];
        const sameS = cur.statuses.length === s.length && cur.statuses.every((v, i) => v === s[i]);
        const sameP =
          cur.priorities.length === p.length && cur.priorities.every((v, i) => v === p[i]);
        if (sameS && sameP) return prev;
        return {
          ...merged,
          [activeTab]: {
            statuses: s,
            priorities: p,
            dueDate: cur.dueDate ?? null,
          },
        };
      });
    },
    [activeTab, setFiltersByTab],
  );

  const handleFilterClear = useCallback(() => {
    setFiltersByTab((prev) => {
      const merged = mergeStoredMyTaskFiltersByTab(prev);
      return {
        ...merged,
        [activeTab]: {
          statuses: [],
          priorities: [],
          dueDate: merged[activeTab]?.dueDate ?? null,
        },
      };
    });
  }, [activeTab, setFiltersByTab]);

  const formatDateParam = useCallback((value) => {
    if (!value) return undefined;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const dueDateFrom = formatDateParam(dueDateRange?.from);
  const dueDateTo = formatDateParam(dueDateRange?.to ?? dueDateRange?.from);

  // URL: ?tab=task&subTab=All|Ticket|CRM|…  OR  ?tab=taskInbox  OR  ?tab=taskAnalytics
  useEffect(() => {
    const tab = searchParams.get('tab');
    const subTab = searchParams.get('subTab') ?? searchParams.get('subTask');

    if (!tab) {
      setSearchParams({ tab: MY_TASK_URL_TAB.TASK, subTab: 'All' }, { replace: true });
      return;
    }

    if (tab === MY_TASK_URL_TAB.TASK_INBOX || tab === MY_TASK_URL_TAB.TASK_ANALYTICS) {
      return;
    }

    if (tab === MY_TASK_URL_TAB.TASK) {
      const sub = isValidMyTaskSubTab(subTab) ? subTab : 'All';
      if (sub !== activeTab) {
        dispatch(setActiveTab(sub));
      }
    }
  }, [searchParams, setSearchParams, dispatch, activeTab]);

  useEffect(() => {
    const next = (searchQuery || '').trim();
    const id = setTimeout(() => {
      setDebouncedSearchByTab((prev) => {
        if ((prev[activeTab] ?? '') === next) return prev;
        return { ...prev, [activeTab]: next };
      });
    }, 400);
    return () => clearTimeout(id);
  }, [searchQuery, activeTab]);

  // Load center access only if not already fetched (ProtectedRoute may have already done it)
  useEffect(() => {
    if (centerAccess.status === 'idle') {
      dispatch(fetchCenterAccess());
    }
  }, [dispatch, centerAccess.status]);

  // Distinct status / priority values for filter UI (multi-select)
  useEffect(() => {
    if (activeSubTab !== 'tasks') return;
    dispatch(fetchMyTaskFilterOptions());
  }, [dispatch, activeSubTab]);

  const calendarDueDateFrom = format(startOfMonth(calendarMonth), 'yyyy-MM-dd');
  const calendarDueDateTo = format(endOfMonth(calendarMonth), 'yyyy-MM-dd');

  // Fetch tasks (search + status + pagination reset) when Tasks sub-tab or filters change
  useEffect(() => {
    if (activeSubTab !== 'tasks') return;
    if (activeView !== 'list') return;
    if (centersForApi === undefined) return; // wait for centerAccess to resolve
    dispatch(
      fetchMyTasks({
        tab: activeTab,
        centers: centersForApi,
        page: 1,
        per_source: perSource,
        append: false,
        search: debouncedSearch || undefined,
        statuses: filterStatuses.length > 0 ? filterStatuses : undefined,
        priorities: filterPriorities.length > 0 ? filterPriorities : undefined,
        due_date_from: dueDateFrom,
        due_date_to: dueDateTo,
      }),
    );
  }, [
    dispatch,
    activeTab,
    centersForApi,
    perSource,
    debouncedSearch,
    filterStatuses,
    filterPriorities,
    dueDateFrom,
    dueDateTo,
    activeSubTab,
    activeView,
  ]);

  // Fetch month-scoped tasks for calendar view (grouped by due_date)
  useEffect(() => {
    if (activeSubTab !== 'tasks') return;
    if (activeView !== 'calendar') return;
    if (centersForApi === undefined) return;
    dispatch(
      fetchMyTasksCalendar({
        tab: activeTab,
        centers: centersForApi,
        search: debouncedSearch || undefined,
        statuses: filterStatuses.length > 0 ? filterStatuses : undefined,
        priorities: filterPriorities.length > 0 ? filterPriorities : undefined,
        due_date_from: calendarDueDateFrom,
        due_date_to: calendarDueDateTo,
      }),
    );
  }, [
    dispatch,
    activeSubTab,
    activeView,
    activeTab,
    centersForApi,
    debouncedSearch,
    filterStatuses,
    filterPriorities,
    calendarDueDateFrom,
    calendarDueDateTo,
  ]);

  // Task totals for toolbar badges (normal get_my_tasks_counts API call).
  useEffect(() => {
    if (activeSubTab !== 'tasks') return;
    if (centersForApi === undefined) return;
    dispatch(
      fetchMyTaskTabCounts({
        centers: centersForApi,
        search: debouncedSearch || undefined,
        searchByTab: debouncedSearchByTab,
        filtersByTab,
      }),
    );
  }, [
    dispatch,
    activeSubTab,
    centersForApi,
    debouncedSearch,
    debouncedSearchByTabKey,
    filtersByTabKey,
  ]);

  const handleTabChange = useCallback(
    (tab) => {
      setSearchParams({ tab: MY_TASK_URL_TAB.TASK, subTab: tab }, { replace: true });
    },
    [setSearchParams],
  );

  const handleSubTabChange = useCallback(
    (sub) => {
      if (sub === 'inbox') {
        setSearchParams({ tab: MY_TASK_URL_TAB.TASK_INBOX }, { replace: true });
      } else if (sub === 'analytics') {
        setSearchParams({ tab: MY_TASK_URL_TAB.TASK_ANALYTICS }, { replace: true });
      } else {
        setSearchParams({ tab: MY_TASK_URL_TAB.TASK, subTab: activeTab }, { replace: true });
      }
    },
    [activeTab, setSearchParams],
  );

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    dispatch(
      fetchMyTasks({
        tab: activeTab,
        centers: centersForApi,
        page: page + 1,
        per_source: perSource,
        append: true,
        search: debouncedSearch || undefined,
        statuses: filterStatuses.length > 0 ? filterStatuses : undefined,
        priorities: filterPriorities.length > 0 ? filterPriorities : undefined,
        due_date_from: dueDateFrom,
        due_date_to: dueDateTo,
      }),
    );
  }, [
    dispatch,
    hasMore,
    loadingMore,
    activeTab,
    centersForApi,
    page,
    perSource,
    debouncedSearch,
    filterStatuses,
    filterPriorities,
    dueDateFrom,
    dueDateTo,
  ]);

  const refreshMyTasks = useCallback(() => {
    if (activeSubTab !== 'tasks') return;
    if (activeView === 'calendar') {
      dispatch(
        fetchMyTasksCalendar({
          tab: activeTab,
          centers: centersForApi,
          search: debouncedSearch || undefined,
          statuses: filterStatuses.length > 0 ? filterStatuses : undefined,
          priorities: filterPriorities.length > 0 ? filterPriorities : undefined,
          due_date_from: calendarDueDateFrom,
          due_date_to: calendarDueDateTo,
        }),
      );
    } else {
      dispatch(
        fetchMyTasks({
          tab: activeTab,
          centers: centersForApi,
          page: 1,
          per_source: perSource,
          append: false,
          search: debouncedSearch || undefined,
          statuses: filterStatuses.length > 0 ? filterStatuses : undefined,
          priorities: filterPriorities.length > 0 ? filterPriorities : undefined,
          due_date_from: dueDateFrom,
          due_date_to: dueDateTo,
        }),
      );
    }
    dispatch(
      fetchMyTaskTabCounts({
        centers: centersForApi,
        search: debouncedSearch || undefined,
        searchByTab: debouncedSearchByTab,
        filtersByTab,
      }),
    );
  }, [
    dispatch,
    activeSubTab,
    activeView,
    activeTab,
    centersForApi,
    perSource,
    debouncedSearch,
    debouncedSearchByTabKey,
    filterStatuses,
    filterPriorities,
    dueDateFrom,
    dueDateTo,
    calendarDueDateFrom,
    calendarDueDateTo,
    filtersByTabKey,
  ]);

  const handleCalendarRetry = useCallback(() => {
    if (centersForApi === undefined) return;
    dispatch(
      fetchMyTasksCalendar({
        tab: activeTab,
        centers: centersForApi,
        search: debouncedSearch || undefined,
        statuses: filterStatuses.length > 0 ? filterStatuses : undefined,
        priorities: filterPriorities.length > 0 ? filterPriorities : undefined,
        due_date_from: calendarDueDateFrom,
        due_date_to: calendarDueDateTo,
      }),
    );
  }, [
    dispatch,
    activeTab,
    centersForApi,
    debouncedSearch,
    filterStatuses,
    filterPriorities,
    calendarDueDateFrom,
    calendarDueDateTo,
  ]);

  const handleTaskRowClick = useCallback((row) => {
    const kind = getMyTaskDrawerKind(row);
    if (!kind) {
      showErrorToast('This task cannot be opened from My Tasks.');
      return;
    }
    setSelectedTaskRow(row);
  }, []);

  const handleCloseTaskDetail = useCallback(() => {
    setSelectedTaskRow(null);
  }, []);

  return (
    <PageLayout
      contentAreaClassName='overflow-hidden'
      pageTitle='My Tasks'
      pageIcon={<RiTaskLine size={24} />}
      pageDescription='Manage all your tasks.'
      headerActions={
        activeSubTab === 'tasks' ? (
          <MyTaskViewTabs value={activeView} onValueChange={setActiveView} />
        ) : null
      }
      showHeaderActions={true}
    >
      <div className='flex min-h-0 flex-1 flex-col gap-6 px-8 pb-8'>
        <div className='shrink-0'>
          <MyTaskToolbar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            activeSubTab={activeSubTab}
            onSubTabChange={handleSubTabChange}
            searchQuery={searchQuery}
            onSearchChange={(value) => setSearchByTab((prev) => ({ ...prev, [activeTab]: value }))}
            dueDateRange={dueDateRange}
            onDueDateRangeChange={(range) =>
              setFiltersByTab((prev) => {
                const merged = mergeStoredMyTaskFiltersByTab(prev);
                return {
                  ...merged,
                  [activeTab]: {
                    ...merged[activeTab],
                    dueDate: range ?? null,
                  },
                };
              })
            }
            filterStatuses={filterStatuses}
            filterPriorities={filterPriorities}
            onFiltersApply={handleFiltersApply}
            onFilterClear={handleFilterClear}
            columnConfigHook={columnConfigHook}
            onClearAll={() => inboxTabRef.current?.clearAll()}
            clearAllDisabled={!inboxClearMeta.hasItems || inboxClearMeta.isLoading}
            inboxAppliedFilters={inboxAppliedFilters}
            onInboxFiltersChange={setInboxAppliedFilters}
          />
        </div>

        {activeSubTab === 'inbox' ? (
          <MyTaskInboxTab
            ref={inboxTabRef}
            onClearMetaChange={setInboxClearMeta}
            appliedFilters={inboxAppliedFilters}
          />
        ) : activeSubTab === 'analytics' ? (
          <MyTaskAnalytics />
        ) : activeView === 'calendar' ? (
          <div className='flex flex-col gap-4'>
            <MyTaskCalendarToolbar
              value={calendarMonth}
              onMonthChange={setCalendarMonth}
              dateFields={calendarDateFields}
              onDateFieldsChange={setCalendarDateFields}
            />
            <MyTaskCalendar
              month={calendarMonth}
              tasks={calendarItems}
              dateFields={calendarDateFields}
              isLoading={calendarLoading}
              error={calendarError}
              onRetry={handleCalendarRetry}
              onTaskClick={handleTaskRowClick}
            />
          </div>
        ) : (
          <div className='flex min-h-0 min-w-0 flex-1 flex-col'>
            <MyTaskTable
              ref={tableRef}
              onColumnConfigBridge={handleColumnConfigBridge}
              items={items}
              loading={loading}
              loadingMore={loadingMore}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
              onRowClick={handleTaskRowClick}
              emptyTitle={noCenters ? NO_CENTERS_EMPTY_STATE.title : undefined}
              emptyDescription={noCenters ? NO_CENTERS_EMPTY_STATE.description : undefined}
            />
          </div>
        )}

        {selectedTaskRow && (
          <MyTaskDetailDrawers
            selectedRow={selectedTaskRow}
            onClose={handleCloseTaskDetail}
            onTasksRefresh={refreshMyTasks}
          />
        )}
      </div>
    </PageLayout>
  );
};

export default MyTask;
