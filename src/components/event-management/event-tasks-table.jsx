import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiBuildingLine,
  RiLayoutColumnLine,
  RiSearchLine,
} from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import ClientsFilterDropdown from '@/components/clients-management/clients-filter-dropdown';
import { FILTER_TABS, TASK_PRIORITY_OPTIONS } from '@/components/clients-management/constants';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig } from '@/lib/column-utils';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import EventTaskCreateDrawer from '@/components/event-management/event-task-create-drawer-common';
import EventTaskViewDrawer from '@/components/event-management/event-task-view-drawer';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchEventTaskAssigneesByRolesThunk,
  getEventTaskListThunk,
  getEventTaskMasterListThunk,
  selectEventTaskAssignees,
  selectEventTaskGroups,
  selectEventTasks,
  selectEventTasksError,
  selectEventTasksLoading,
  setSelectedEventTask,
  updateEventTaskThunk,
  EVENT_TASK_ASSIGNEE_ROLE_OPTIONS,
} from '@/redux/eventsSlice';
import TasksTableCommon from '@/components/client-onboarding/tasks-table-common';
import { useTaskFieldUpdaters } from '@/hooks/use-task-field-updaters';
import {
  EVENT_TASK_STATUS_OPTIONS,
  EVENT_TASKS_APPLIED_FILTER_DEFAULTS,
  EVENT_TASKS_FILTER_PERSIST_KEYS,
  mergeStoredEventTasksFilters,
  eventTasksFilterStorageKey,
} from '@/components/event-management/constant';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { SCROLL_LOAD_THRESHOLD } from '@/components/team-management/constants';
import { TASK_STATUS_OPTIONS as TASK_MASTER_STATUS_OPTIONS } from '@/components/client-onboarding/constants';
import { useScopedTaskStatusOptions } from '@/hooks/use-status-options';
import { useDebounce } from '@/hooks/use-debounce';
import {
  centerOptionsFromLabelMap,
  collectCenterIdsFromTask,
  resolveCenterGroupKey,
  resolveCenterGroupLabel,
  resolveEventCenterDisplayLabels,
} from '@/components/client-onboarding/task-view-drawer-utils';
import {
  filterAssigneeIdsByCenters,
  filterUsersByCenters,
  normalizeAssigneeIds,
} from '@/components/event-management/event-task-assignee-utils';
import { syncEventTaskAssignees } from '@/components/event-management/event-task-assignee-sync';

/** Client-side center filter: document tasks use `custom_center`; task master uses `centers` / `custom_center`. */
function rowMatchesEventCenterFilter(row, isTaskMaster, selectedCenterIds) {
  if (!selectedCenterIds?.length) return true;
  const allowed = new Set(selectedCenterIds.map((s) => String(s).trim()).filter(Boolean));
  if (isTaskMaster) {
    const raw = row?.raw || row;
    const all = collectCenterIdsFromTask(raw);
    return all.some((id) => allowed.has(id));
  }
  const cid = String(row?.custom_center ?? '').trim();
  return Boolean(cid) && allowed.has(cid);
}

function rowMatchesTaskStatusFilter(row, selectedStatusValues) {
  if (!selectedStatusValues?.length) return true;
  const rowStatus = String(row?.status ?? '')
    .trim()
    .toLowerCase();
  if (!rowStatus) return false;
  const allowed = new Set(
    selectedStatusValues.map((s) => String(s).trim().toLowerCase()).filter(Boolean),
  );
  return allowed.has(rowStatus);
}

function rowMatchesTaskPriorityFilter(row, selectedPriorityValues) {
  if (!selectedPriorityValues?.length) return true;
  const rowPri = String(row?.priority ?? '')
    .trim()
    .toLowerCase();
  if (!rowPri) return false;
  const allowed = new Set(
    selectedPriorityValues.map((s) => String(s).trim().toLowerCase()).filter(Boolean),
  );
  return allowed.has(rowPri);
}

/** Center doc ids for assignee scoping (group key may be an id or a display name). */
function resolveCenterIdsForAssigneeScope(centerValue, eventCenterLabelById, rows = []) {
  const key = resolveCenterGroupKey(centerValue);
  if (!key) return [];

  const ids = new Set();
  const labelById = eventCenterLabelById;

  // Prefer exact id match so a display-name collision cannot widen scope.
  if (labelById?.has?.(key)) {
    return [key];
  }

  labelById?.forEach?.((label, id) => {
    const idStr = String(id ?? '').trim();
    if (!idStr) return;
    if (idStr === key) ids.add(idStr);
  });
  if (ids.size > 0) return [...ids];

  const keyLower = key.toLowerCase();
  labelById?.forEach?.((label, id) => {
    const idStr = String(id ?? '').trim();
    const labelStr = String(label ?? '').trim();
    if (!idStr || !labelStr) return;
    if (labelStr.toLowerCase() === keyLower) ids.add(idStr);
  });
  if (ids.size > 0) return [...ids];

  // Map miss (legacy name-keyed groups): keep the key and row center ids so scoping still works.
  ids.add(key);
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const cid = String(row?.custom_center ?? '').trim();
    if (cid) ids.add(cid);
  });
  return [...ids].filter(Boolean);
}

function scopeDisplayRowsToCenterAssignees(displayRows, users, centerIds) {
  if (centerIds.length === 0 || !users?.length) return displayRows;
  return displayRows.map((row) => {
    const scoped = filterAssigneeIdsByCenters(
      row?.assignees || row?.assigned_to,
      users,
      centerIds,
      { keepUnknown: true },
    );
    return { ...row, assignees: scoped, assigned_to: scoped };
  });
}

function groupMatchesEventCenterFilter(groupCenterValue, selectedCenterIds, eventCenterLabelById) {
  if (!selectedCenterIds?.length) return true;
  const groupRaw = resolveCenterGroupKey(groupCenterValue);
  if (!groupRaw) return false;
  const selectedIds = selectedCenterIds.map((id) => String(id).trim()).filter(Boolean);
  const selectedById = new Set(selectedIds);
  if (selectedById.has(groupRaw)) return true;

  const selectedLabels = new Set(
    selectedIds
      .map((id) =>
        String(eventCenterLabelById.get(id) || '')
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean),
  );
  return selectedLabels.has(groupRaw.toLowerCase());
}

function buildEventTaskDisplayRow(t, _isMaster, eventCenterLabelById) {
  const raw = t?.raw || t;
  const taskId = raw?.name || raw?.task_id || raw?.id || t?.id || t?.task || t?.task_name;
  const normalizedAssignees = normalizeAssigneeIds(raw?.assignees || raw?.assigned_to);
  const centers_display = resolveEventCenterDisplayLabels(
    raw,
    centerOptionsFromLabelMap(eventCenterLabelById),
  );
  return {
    ...raw,
    name: raw?.name || taskId,
    task_id: raw?.task_id || taskId,
    id: raw?.id || taskId,
    task_name: raw?.task_name || raw?.subject || t?.task || t?.task_name || t?.task,
    subject: raw?.subject || raw?.task_name || t?.task || t?.task_name || t?.task,
    priority: raw?.priority || t?.priority || '',
    status: raw?.status || t?.status || '',
    due_date: raw?.due_date || raw?.exp_end_date || t?.dueDate || '',
    exp_end_date: raw?.exp_end_date || raw?.due_date || t?.dueDate || '',
    assignees: normalizedAssignees,
    assigned_to: normalizedAssignees,
    tags: raw?.tags || [],
    duration: raw?.duration != null && raw?.duration !== '' ? String(raw.duration) : '',
    centers_display,
  };
}

function applySearchAndSortToRows(rows, searchValue, sorting) {
  const q = searchValue.trim().toLowerCase();
  const searched = !q
    ? rows
    : rows.filter((row) => {
        const centerParts = Array.isArray(row.centers_display) ? row.centers_display : [];
        const tagParts = Array.isArray(row.tags) ? row.tags : [];
        const haystack = [
          row.task_name,
          row.subject,
          row.status,
          row.priority,
          row.due_date,
          row.exp_end_date,
          row.duration,
          ...centerParts,
          ...tagParts,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });

  if (!sorting?.field) return searched;
  const dir = sorting.direction === 'desc' ? -1 : 1;
  const key = sorting.field;
  const getVal = (r) => {
    if (key === 'task') return r.task_name || r.subject || '';
    if (key === 'assigned_to') return (Array.isArray(r.assignees) ? r.assignees.length : 0) || 0;
    if (key === 'centers')
      return (Array.isArray(r.centers_display) ? r.centers_display : []).join(' ');
    if (key === 'due_date') return r.exp_end_date || r.due_date || '';
    if (key === 'duration') return r.duration || '';
    return r[key] ?? '';
  };
  return [...searched].sort((a, b) => {
    const av = getVal(a);
    const bv = getVal(b);
    if (av === bv) return 0;
    return av > bv ? dir : -dir;
  });
}

const EVENT_TASK_MASTER_TABLE_ID = 'event-task-master-tasks';

const EVENT_TASKS_FILTER_TAB_CONFIG = [
  { value: FILTER_TABS.CENTER, label: 'Center' },
  { value: FILTER_TABS.TASK_STATUS, label: 'Status' },
  { value: FILTER_TABS.TASK_PRIORITY, label: 'Priority' },
];

/** PageLayout scrolls an inner div, not `window` — match `team-management-support-team` `findScrollableParent`. */
function findScrollableParent(el) {
  let p = el?.parentElement;
  while (p) {
    const style = getComputedStyle(p);
    const oy = style.overflowY;
    if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') return p;
    p = p.parentElement;
  }
  return null;
}

/** In-component `useRef` resets on React Strict Mode remount; module state survives and blocks duplicate fetches. */
let lastEventTasksTableFetchKey = '';

function stableSortedFilterValues(values) {
  return [...(Array.isArray(values) ? values : [])]
    .map((v) => String(v).trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

const EventTasksTable = ({
  eventName,
  eventCenterOptions = [],
  eventCenters = [],
  eventAllCenters = false,
  tabMountNonce = 0,
  moduleType = 'spotlight',
}) => {
  const dispatch = useDispatch();
  const [searchValue, setSearchValue] = useState('');
  const [sorting, setSorting] = useState(null); // { field, direction } | null
  const [taskScope, setTaskScope] = useState('task'); // 'task' | 'task_master'
  const [statusOptionsKey, setStatusOptionsKey] = useState(0);
  const { options: eventTaskStatusOptions } = useScopedTaskStatusOptions({
    context: 'Event Tasks',
    fallback: EVENT_TASK_STATUS_OPTIONS,
    refreshKey: statusOptionsKey,
  });
  const debouncedSearch = useDebounce(searchValue, 500);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isTaskFilterOpen, setIsTaskFilterOpen] = useState(false);
  const [taskFilterCount, setTaskFilterCount] = useState(0);
  const taskFilterStorageKey = useMemo(
    () => eventTasksFilterStorageKey(eventName, moduleType),
    [eventName, moduleType],
  );
  const [appliedTaskFilters, setAppliedTaskFilters] = usePersistedFilters({
    storageKey: taskFilterStorageKey,
    defaultFilters: mergeStoredEventTasksFilters({}),
    persistIncludeKeys: EVENT_TASKS_FILTER_PERSIST_KEYS,
    persistTrimStringArrays: true,
  });
  const [isTaskMasterColumnManagerOpen, setIsTaskMasterColumnManagerOpen] = useState(false);
  const eventTaskAssigneesState = useSelector(selectEventTaskAssignees);
  const eventTaskAssignees = eventTaskAssigneesState?.users || [];
  const eventTaskAssigneeRoles = eventTaskAssigneesState?.roles || EVENT_TASK_ASSIGNEE_ROLE_OPTIONS;
  const eventTaskAssigneeGroups = eventTaskAssigneesState?.groups || [];
  const assigneesStatus = eventTaskAssigneesState?.status ?? 'idle';
  const eventTaskAssigneesLoading = assigneesStatus === 'loading' || assigneesStatus === 'idle';
  const tasksState = useSelector(selectEventTasks);
  const tasks = Array.isArray(tasksState?.results) ? tasksState.results : [];
  const taskGroups = useSelector(selectEventTaskGroups);
  const isLoading = useSelector(selectEventTasksLoading);
  const isLoadingMoreTasks = Boolean(tasksState?.isLoadingMore);
  const eventTasksHasMore = Boolean(tasksState?.has_more);
  const loadError = useSelector(selectEventTasksError);
  const [expandedCenters, setExpandedCenters] = useState({});

  useEffect(() => {
    if (isTaskFilterOpen) return;
    const c = Array.isArray(appliedTaskFilters?.center) ? appliedTaskFilters.center.length : 0;
    const s = Array.isArray(appliedTaskFilters?.task_status)
      ? appliedTaskFilters.task_status.length
      : 0;
    const p = Array.isArray(appliedTaskFilters?.task_priority)
      ? appliedTaskFilters.task_priority.length
      : 0;
    setTaskFilterCount(c + s + p);
  }, [appliedTaskFilters, isTaskFilterOpen]);

  const selectedCenterFilterIds = useMemo(() => {
    const c = appliedTaskFilters?.center;
    const arr = Array.isArray(c) ? c : c ? [c] : [];
    return arr.map(String).filter(Boolean);
  }, [appliedTaskFilters]);

  const selectedTaskStatusFilterValues = useMemo(() => {
    const s = appliedTaskFilters?.task_status;
    const arr = Array.isArray(s) ? s : s ? [s] : [];
    return arr.map(String).filter(Boolean);
  }, [appliedTaskFilters]);

  const selectedTaskPriorityFilterValues = useMemo(() => {
    const p = appliedTaskFilters?.task_priority;
    const arr = Array.isArray(p) ? p : p ? [p] : [];
    return arr.map(String).filter(Boolean);
  }, [appliedTaskFilters]);

  const eventTaskListFetchKey = useMemo(
    () =>
      JSON.stringify({
        event: eventName,
        tabMountNonce,
        scope: taskScope,
        search: debouncedSearch.trim(),
        center: stableSortedFilterValues(selectedCenterFilterIds),
        task_status: stableSortedFilterValues(selectedTaskStatusFilterValues),
        task_priority: stableSortedFilterValues(selectedTaskPriorityFilterValues),
      }),
    [
      eventName,
      tabMountNonce,
      taskScope,
      debouncedSearch,
      selectedCenterFilterIds,
      selectedTaskStatusFilterValues,
      selectedTaskPriorityFilterValues,
    ],
  );

  useEffect(() => {
    if (!eventName) return;
    if (lastEventTasksTableFetchKey === eventTaskListFetchKey) return;
    lastEventTasksTableFetchKey = eventTaskListFetchKey;

    const payload = {
      event: eventName,
      keyword: debouncedSearch.trim() || undefined,
      center: selectedCenterFilterIds,
      task_status: selectedTaskStatusFilterValues,
      task_priority: selectedTaskPriorityFilterValues,
    };

    if (taskScope === 'task') {
      dispatch(getEventTaskListThunk(payload));
    } else if (taskScope === 'task_master') {
      dispatch(getEventTaskMasterListThunk(payload));
    }
  }, [
    dispatch,
    eventName,
    taskScope,
    eventTaskListFetchKey,
    debouncedSearch,
    selectedCenterFilterIds,
    selectedTaskStatusFilterValues,
    selectedTaskPriorityFilterValues,
  ]);

  useEffect(() => {
    dispatch(fetchEventTaskAssigneesByRolesThunk());
  }, [dispatch]);

  useEffect(() => {
    if (loadError) showErrorToast(extractErrorMessage(loadError, 'Failed to load event tasks'));
  }, [loadError]);

  const eventCenterLabelById = useMemo(() => {
    const m = new Map();
    for (const o of eventCenterOptions || []) {
      if (o?.value != null) m.set(String(o.value), String(o.label ?? o.value));
    }
    return m;
  }, [eventCenterOptions]);

  const taskMasterDefaultColumnDefs = useMemo(
    () => [
      { id: 'task', label: 'Task', visible: true },
      { id: 'assigned_to', label: 'Assignee', visible: true },
      { id: 'centers', label: 'Center', visible: true },
      { id: 'duration', label: 'Duration', visible: true },
      { id: 'tags', label: 'Tags', visible: true },
      { id: 'priority', label: 'Priority', visible: true },
      { id: 'status', label: 'Status', visible: true },
    ],
    [],
  );

  const taskMasterDefaultColumnConfig = useMemo(
    () => prepareColumnsForConfig(taskMasterDefaultColumnDefs),
    [taskMasterDefaultColumnDefs],
  );

  const taskMasterColumnConfig = useColumnConfig(
    EVENT_TASK_MASTER_TABLE_ID,
    taskMasterDefaultColumnConfig,
    async (cols) => {
      try {
        localStorage.setItem(`column-config-${EVENT_TASK_MASTER_TABLE_ID}`, JSON.stringify(cols));
      } catch (error) {
        console.error('Failed to save event task master column preferences', error);
      }
    },
    async () => {
      try {
        const raw = localStorage.getItem(`column-config-${EVENT_TASK_MASTER_TABLE_ID}`);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : parsed?.columns || [];
      } catch {
        return [];
      }
    },
    { autoSave: true, debounce: 300 },
  );

  const taskMasterVisibleColumns = useMemo(
    () =>
      taskMasterColumnConfig.visibleColumns.map((col) => ({
        id: col.id,
        label: col.label || col.id,
      })),
    [taskMasterColumnConfig.visibleColumns],
  );

  const taskMasterColumnIds = useMemo(
    () => taskMasterVisibleColumns.map((c) => c.id),
    [taskMasterVisibleColumns],
  );

  const taskMasterColumnLabelsMap = useMemo(() => {
    const m = {};
    taskMasterVisibleColumns.forEach((c) => {
      m[c.id] = c.label;
    });
    return m;
  }, [taskMasterVisibleColumns]);

  const taskFilterStatusOptions = useMemo(
    () => (taskScope === 'task_master' ? TASK_MASTER_STATUS_OPTIONS : eventTaskStatusOptions),
    [eventTaskStatusOptions, taskScope],
  );

  const handleTaskFiltersChange = useCallback(
    (filtersObject) => {
      setAppliedTaskFilters(
        mergeStoredEventTasksFilters({
          center: Array.isArray(filtersObject?.center)
            ? filtersObject.center
            : filtersObject?.center
              ? [filtersObject.center]
              : [],
          task_status: Array.isArray(filtersObject?.task_status)
            ? filtersObject.task_status
            : filtersObject?.task_status
              ? [filtersObject.task_status]
              : [],
          task_priority: Array.isArray(filtersObject?.task_priority)
            ? filtersObject.task_priority
            : filtersObject?.task_priority
              ? [filtersObject.task_priority]
              : [],
        }),
      );
    },
    [setAppliedTaskFilters],
  );

  const handleClearAllTaskFilters = useCallback(
    (e) => {
      e.stopPropagation();
      setAppliedTaskFilters({ ...EVENT_TASKS_APPLIED_FILTER_DEFAULTS });
      setTaskFilterCount(0);
      setIsTaskFilterOpen(false);
    },
    [setAppliedTaskFilters],
  );

  const isTaskMasterScope = taskScope === 'task_master';
  const showGroupedByCenter =
    taskScope === 'task' && Array.isArray(taskGroups) && taskGroups.length > 0;

  const onLoadMoreGroupedEventTasks = useCallback(() => {
    if (!eventName || taskScope !== 'task' || !eventTasksHasMore || isLoadingMoreTasks) return;
    const currentPage = Number(tasksState?.page ?? 1) || 1;
    const ps = Number(tasksState?.page_size ?? 5) || 5;
    dispatch(
      getEventTaskListThunk({
        event: eventName,
        keyword: debouncedSearch.trim() || undefined,
        page: currentPage + 1,
        page_size: ps,
        append: true,
        center: selectedCenterFilterIds,
        task_status: selectedTaskStatusFilterValues,
        task_priority: selectedTaskPriorityFilterValues,
      }),
    );
  }, [
    dispatch,
    eventName,
    taskScope,
    debouncedSearch,
    eventTasksHasMore,
    tasksState?.page,
    tasksState?.page_size,
    selectedCenterFilterIds,
    selectedTaskStatusFilterValues,
    selectedTaskPriorityFilterValues,
    isLoadingMoreTasks,
  ]);

  const scrollContainerRef = useRef(null);

  /**
   * Grouped-by-center event tasks: infinite scroll like support team **flat** list
   * (`team-management-support-team` `handleScroll` + `findScrollableParent` on `scrollContainerRef`).
   * Scroll listener on the real overflow container — no viewport sentinel (avoids eager page-2).
   */
  const handleGroupedEventTasksScroll = useCallback(
    (scrollElement) => {
      if (!showGroupedByCenter || isLoadingMoreTasks || !eventTasksHasMore) return;
      if (!scrollElement) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      if (scrollTop + clientHeight >= scrollHeight - SCROLL_LOAD_THRESHOLD) {
        onLoadMoreGroupedEventTasks();
      }
    },
    [showGroupedByCenter, eventTasksHasMore, isLoadingMoreTasks, onLoadMoreGroupedEventTasks],
  );

  useEffect(() => {
    if (!showGroupedByCenter) return;
    const scrollEl = scrollContainerRef.current
      ? findScrollableParent(scrollContainerRef.current)
      : null;
    if (!scrollEl) return;
    const onScroll = () => handleGroupedEventTasksScroll(scrollEl);
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, [handleGroupedEventTasksScroll, showGroupedByCenter]);

  useEffect(() => {
    if (!showGroupedByCenter) return;
    setExpandedCenters((previous) => {
      const next = { ...previous };
      taskGroups.forEach((g) => {
        const key = resolveCenterGroupKey(g?.center);
        if (key && next[key] === undefined) next[key] = true;
      });
      return next;
    });
  }, [showGroupedByCenter, taskGroups]);

  const { tableTasks, groupedSections } = useMemo(() => {
    const isMaster = isTaskMasterScope;
    const base = (Array.isArray(tasks) ? tasks : []).map((t) =>
      buildEventTaskDisplayRow(t, isMaster, eventCenterLabelById),
    );
    let flatRows = applySearchAndSortToRows(base, searchValue, sorting);
    if (selectedCenterFilterIds.length > 0) {
      flatRows = flatRows.filter((row) =>
        rowMatchesEventCenterFilter(row, isMaster, selectedCenterFilterIds),
      );
    }
    if (selectedTaskStatusFilterValues.length > 0) {
      flatRows = flatRows.filter((row) =>
        rowMatchesTaskStatusFilter(row, selectedTaskStatusFilterValues),
      );
    }
    if (selectedTaskPriorityFilterValues.length > 0) {
      flatRows = flatRows.filter((row) =>
        rowMatchesTaskPriorityFilter(row, selectedTaskPriorityFilterValues),
      );
    }

    if (isMaster || !Array.isArray(taskGroups) || taskGroups.length === 0) {
      return { tableTasks: flatRows, groupedSections: null };
    }

    const groupsForView =
      selectedCenterFilterIds.length > 0
        ? taskGroups.filter((g) =>
            groupMatchesEventCenterFilter(g?.center, selectedCenterFilterIds, eventCenterLabelById),
          )
        : taskGroups;

    const sections = groupsForView
      .map((g) => {
        const rows = (Array.isArray(g.tasks) ? g.tasks : []).map((t) =>
          buildEventTaskDisplayRow(t, false, eventCenterLabelById),
        );
        let displayRows = applySearchAndSortToRows(rows, searchValue, sorting);
        if (selectedTaskStatusFilterValues.length > 0) {
          displayRows = displayRows.filter((row) =>
            rowMatchesTaskStatusFilter(row, selectedTaskStatusFilterValues),
          );
        }
        if (selectedTaskPriorityFilterValues.length > 0) {
          displayRows = displayRows.filter((row) =>
            rowMatchesTaskPriorityFilter(row, selectedTaskPriorityFilterValues),
          );
        }
        const centerIds = resolveCenterIdsForAssigneeScope(
          g?.center,
          eventCenterLabelById,
          displayRows,
        );
        const canScopeAssignees =
          !eventTaskAssigneesLoading && eventTaskAssignees.length > 0 && centerIds.length > 0;
        const assigneeOptions = canScopeAssignees
          ? filterUsersByCenters(eventTaskAssignees, centerIds)
          : eventTaskAssignees;
        if (canScopeAssignees) {
          displayRows = scopeDisplayRowsToCenterAssignees(
            displayRows,
            eventTaskAssignees,
            centerIds,
          );
        }
        return { ...g, displayRows, assigneeOptions };
      })
      .filter((s) => s.displayRows.length > 0);

    return { tableTasks: flatRows, groupedSections: sections };
  }, [
    tasks,
    taskGroups,
    searchValue,
    sorting,
    isTaskMasterScope,
    eventCenterLabelById,
    selectedCenterFilterIds,
    selectedTaskStatusFilterValues,
    selectedTaskPriorityFilterValues,
    eventTaskAssignees,
    eventTaskAssigneesLoading,
  ]);

  const toggleCenterExpanded = useCallback((centerKey) => {
    setExpandedCenters((previous) => {
      const isOpen = previous[centerKey] !== false;
      return { ...previous, [centerKey]: !isOpen };
    });
  }, []);

  const handleSortChange = useCallback((field) => {
    setSorting((current) => {
      if (current?.field === field) {
        if (current.direction === 'asc') return { field, direction: 'desc' };
        if (current.direction === 'desc') return null;
      }
      return { field, direction: 'asc' };
    });
  }, []);

  const handleTaskClick = useCallback(
    (taskRow) => {
      dispatch(setSelectedEventTask(taskRow));
      setIsViewOpen(true);
    },
    [dispatch],
  );

  const handleFieldUpdate = useCallback(
    async (taskId, fieldName, value) => {
      if (!taskId) return;
      const payload = { task_id: taskId };
      if (fieldName === 'due_date') payload.exp_end_date = value ?? '';
      else payload[fieldName] = value ?? '';
      try {
        await dispatch(updateEventTaskThunk(payload)).unwrap();
        showSuccessToast('Task updated');
      } catch (error) {
        showErrorToast(extractErrorMessage(error) || 'Failed to update task');
      }
    },
    [dispatch],
  );

  const handleAssigneeUpdate = useCallback(
    async (taskId, assignees, previousAssigneeIds) => {
      if (!taskId) return;
      const groupedRows = (groupedSections || []).flatMap((s) =>
        Array.isArray(s?.displayRows) ? s.displayRows : [],
      );
      const taskRow =
        groupedRows.find((t) => String(t?.task_id || t?.name || t?.id) === String(taskId)) ||
        tableTasks.find((t) => String(t?.task_id || t?.name || t?.id) === String(taskId));

      const result = await syncEventTaskAssignees({
        dispatch,
        taskId,
        nextAssignees: assignees,
        currentAssignees: previousAssigneeIds ?? taskRow?.assignees ?? taskRow?.assigned_to,
        users: eventTaskAssignees,
      });

      if (result.ok) {
        showSuccessToast('Task updated');
      } else {
        showErrorToast(extractErrorMessage(result.error) || 'Failed to update task');
      }
    },
    [dispatch, tableTasks, groupedSections, eventTaskAssignees],
  );

  const { handlePriorityUpdate, handleStatusUpdate, handleDueDateUpdate } =
    useTaskFieldUpdaters(handleFieldUpdate);

  const tableColumns = useMemo(
    () =>
      isTaskMasterScope
        ? taskMasterColumnIds
        : ['task', 'assigned_to', 'due_date', 'tags', 'priority', 'status'],
    [isTaskMasterScope, taskMasterColumnIds],
  );
  const tableVisibleColumnConfig = useMemo(
    () =>
      isTaskMasterScope
        ? taskMasterVisibleColumns
        : [
            { id: 'task', label: 'Task' },
            { id: 'assigned_to', label: 'Assignee' },
            { id: 'due_date', label: 'Due Date' },
            { id: 'tags', label: 'Tags' },
            { id: 'priority', label: 'Priority' },
            { id: 'status', label: 'Status' },
          ],
    [isTaskMasterScope, taskMasterVisibleColumns],
  );
  const tableColumnLabels = useMemo(
    () =>
      isTaskMasterScope
        ? taskMasterColumnLabelsMap
        : {
            task: 'Task',
            assigned_to: 'Assignee',
            due_date: 'Due Date',
            tags: 'Tags',
            priority: 'Priority',
            status: 'Status',
          },
    [isTaskMasterScope, taskMasterColumnLabelsMap],
  );

  return (
    <div ref={scrollContainerRef} className='flex flex-col gap-3'>
      <div className='w-full border-1 rounded-xl border-stroke-soft-200 bg-gray-50 p-[6px] flex items-center justify-between'>
        <div className='flex min-w-0 items-center'>
          <ButtonGroup.Root size='small'>
            <ButtonGroup.Item
              type='button'
              onClick={() => setTaskScope('task')}
              data-state={taskScope === 'task' ? 'on' : 'off'}
              className='data-[state=on]:bg-primary-lighter data-[state=on]:border-primary-base data-[state=on]:z-1 data-[state=on]:border'
            >
              Task
            </ButtonGroup.Item>
            <ButtonGroup.Item
              type='button'
              onClick={() => setTaskScope('task_master')}
              data-state={taskScope === 'task_master' ? 'on' : 'off'}
              className='data-[state=on]:bg-primary-lighter data-[state=on]:ring-1 data-[state=on]:z-1 data-[state=on]:ring-primary-base'
            >
              Task Master
            </ButtonGroup.Item>
          </ButtonGroup.Root>
        </div>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-3'>
        <Input.Root size='small' className='min-w-0 w-full max-w-[560px] flex-1'>
          <Input.Wrapper>
            <Input.Icon as={RiSearchLine} />
            <Input.Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder='Search tasks...'
            />
          </Input.Wrapper>
        </Input.Root>
        <div className='flex shrink-0 flex-wrap items-center justify-end gap-3'>
          {taskScope === 'task' || taskScope === 'task_master' ? (
            <Popover.Root open={isTaskFilterOpen} onOpenChange={setIsTaskFilterOpen}>
              <Filter.TriggerButton
                filterCount={taskFilterCount}
                onClear={handleClearAllTaskFilters}
                tooltipContent='Filter'
                ariaLabel='Filter by center, status, or priority'
              />
              <ClientsFilterDropdown
                open={isTaskFilterOpen}
                setFilterCount={setTaskFilterCount}
                onOpenChange={setIsTaskFilterOpen}
                onFiltersChange={handleTaskFiltersChange}
                appliedFilters={appliedTaskFilters}
                tabConfig={EVENT_TASKS_FILTER_TAB_CONFIG}
                multiSelectTabs={[
                  FILTER_TABS.CENTER,
                  FILTER_TABS.TASK_STATUS,
                  FILTER_TABS.TASK_PRIORITY,
                ]}
                centerOptionsOverride={eventCenterOptions}
                taskStatusFilterOptions={taskFilterStatusOptions}
                taskPriorityFilterOptions={TASK_PRIORITY_OPTIONS}
              />
            </Popover.Root>
          ) : null}
          {taskScope === 'task_master' ? (
            <ColumnManagerDropdown
              open={isTaskMasterColumnManagerOpen}
              onOpenChange={setIsTaskMasterColumnManagerOpen}
              config={taskMasterColumnConfig}
              tooltipContent={<p>Manage columns</p>}
              trigger={
                <Button.Root variant='neutral' mode='stroke' size='small' className='gap-1'>
                  <Button.Icon as={RiLayoutColumnLine} />
                </Button.Root>
              }
            />
          ) : null}
          <Button.Root
            size='small'
            className='shrink-0 gap-2'
            onClick={() => setIsCreateOpen(true)}
            disabled={!eventName}
          >
            <Button.Icon as={RiAddLine} />
            Add Task
          </Button.Root>
        </div>
      </div>

      <div className='w-full rounded-2xl bg-bg-white-0 shadow-regular-xs'>
        <div className='w-full overflow-x-auto'>
          <div className='min-w-[1000px]'>
            {isLoading ? (
              <div className='py-10 text-center text-paragraph-sm text-text-sub-500'>Loading…</div>
            ) : showGroupedByCenter && groupedSections ? (
              <div className='flex flex-col gap-6 p-4'>
                {groupedSections.length === 0 ? (
                  <div className='py-10 text-center text-paragraph-sm text-text-sub-500'>
                    {searchValue.trim()
                      ? 'No tasks found matching your search.'
                      : 'No tasks found.'}
                  </div>
                ) : (
                  groupedSections.map((section, sectionIndex) => {
                    const centerKey = resolveCenterGroupKey(section.center);
                    const centerLabel = resolveCenterGroupLabel(
                      section.center,
                      eventCenterLabelById,
                    );
                    const isExpanded = expandedCenters[centerKey] !== false;
                    return (
                      <div
                        key={centerKey || `center-group-${sectionIndex}`}
                        className='flex flex-col gap-1'
                      >
                        <button
                          type='button'
                          onClick={() => toggleCenterExpanded(centerKey)}
                          className='label-small flex w-full cursor-pointer items-center gap-2 text-left font-medium text-text-sub-500 transition-opacity hover:opacity-80'
                        >
                          <span className='flex min-w-0 items-center gap-2'>
                            <RiBuildingLine
                              className='shrink-0 text-text-sub-500'
                              size={20}
                              aria-hidden
                            />
                            <span className='truncate text-text-strong-950'>{centerLabel}</span>
                          </span>
                          {isExpanded ? (
                            <RiArrowUpSLine size={16} className='shrink-0 text-text-soft-400' />
                          ) : (
                            <RiArrowDownSLine size={16} className='shrink-0 text-text-soft-400' />
                          )}
                        </button>
                        {isExpanded ? (
                          <div className='w-full overflow-x-auto rounded-2xl border border-stroke-soft-200 bg-bg-white-0 pt-2'>
                            <TasksTableCommon
                              tasks={section.displayRows}
                              tableVariant='compact'
                              sorting={sorting}
                              onSortChange={handleSortChange}
                              onTaskClick={handleTaskClick}
                              searchTerm={searchValue}
                              columns={tableColumns}
                              visibleColumnConfig={tableVisibleColumnConfig}
                              columnLabels={tableColumnLabels}
                              onAssigneeUpdate={handleAssigneeUpdate}
                              onPriorityUpdate={handlePriorityUpdate}
                              onStatusUpdate={handleStatusUpdate}
                              onDueDateUpdate={handleDueDateUpdate}
                              taskStatusOptions={eventTaskStatusOptions}
                              statusConfigScope={
                                isTaskMasterScope
                                  ? null
                                  : {
                                      doctype: 'Task',
                                      field: 'status',
                                      context: 'Event Tasks',
                                      fieldLabel: 'Event Tasks',
                                    }
                              }
                              onStatusConfigSaved={() => setStatusOptionsKey((value) => value + 1)}
                              fixedAssigneeOptions={section.assigneeOptions ?? eventTaskAssignees}
                              fixedAssigneeOptionsLoading={eventTaskAssigneesLoading}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
                {showGroupedByCenter && isLoadingMoreTasks ? (
                  <div className='py-3 text-center text-paragraph-sm text-text-sub-500'>
                    Loading more…
                  </div>
                ) : null}
              </div>
            ) : tableTasks.length === 0 ? (
              <div className='py-10 text-center text-paragraph-sm text-text-sub-500'>
                {searchValue.trim() ? 'No tasks found matching your search.' : 'No tasks found.'}
              </div>
            ) : (
              <TasksTableCommon
                tasks={tableTasks}
                tableVariant='compact'
                sorting={sorting}
                onSortChange={handleSortChange}
                onTaskClick={handleTaskClick}
                searchTerm={searchValue}
                columns={tableColumns}
                visibleColumnConfig={tableVisibleColumnConfig}
                columnLabels={tableColumnLabels}
                onAssigneeUpdate={isTaskMasterScope ? undefined : handleAssigneeUpdate}
                onPriorityUpdate={isTaskMasterScope ? undefined : handlePriorityUpdate}
                onStatusUpdate={isTaskMasterScope ? undefined : handleStatusUpdate}
                onDueDateUpdate={isTaskMasterScope ? undefined : handleDueDateUpdate}
                taskStatusOptions={
                  isTaskMasterScope ? TASK_MASTER_STATUS_OPTIONS : eventTaskStatusOptions
                }
                statusConfigScope={
                  isTaskMasterScope
                    ? null
                    : {
                        doctype: 'Task',
                        field: 'status',
                        context: 'Event Tasks',
                        fieldLabel: 'Event Tasks',
                      }
                }
                onStatusConfigSaved={() => setStatusOptionsKey((value) => value + 1)}
                fixedAssigneeOptions={eventTaskAssignees}
                fixedAssigneeOptionsLoading={eventTaskAssigneesLoading}
              />
            )}
          </div>
        </div>
      </div>

      <EventTaskCreateDrawer
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        eventName={eventName}
        createMode={taskScope}
        eventCenterOptions={eventCenterOptions}
        eventCenters={eventCenters}
        eventAllCenters={eventAllCenters}
        assigneeSelectItems={eventTaskAssignees}
        assigneeSelectLoading={eventTaskAssigneesLoading}
        assigneeRoleOptions={eventTaskAssigneeRoles}
        assigneeRoleGroups={eventTaskAssigneeGroups}
        onCreated={async () => {
          if (!eventName) return;
          if (taskScope === 'task_master') {
            dispatch(
              getEventTaskMasterListThunk({
                event: eventName,
                keyword: debouncedSearch.trim() || undefined,
                center: selectedCenterFilterIds,
                task_status: selectedTaskStatusFilterValues,
                task_priority: selectedTaskPriorityFilterValues,
              }),
            );
          } else {
            dispatch(
              getEventTaskListThunk({
                event: eventName,
                keyword: debouncedSearch.trim() || undefined,
                center: selectedCenterFilterIds,
                task_status: selectedTaskStatusFilterValues,
                task_priority: selectedTaskPriorityFilterValues,
              }),
            );
          }
        }}
      />
      <EventTaskViewDrawer
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        eventName={eventName}
        eventCenterOptions={eventCenterOptions}
        eventCenters={eventCenters}
        assigneeSelectItems={eventTaskAssignees}
        assigneeSelectLoading={eventTaskAssigneesLoading}
      />
    </div>
  );
};

export default EventTasksTable;
