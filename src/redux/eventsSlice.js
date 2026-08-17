import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import { PARTICIPANTS_FLAT_GROUP_CONTEXT } from '@/components/event-management/constant';
import { participantRowKey } from '@/components/event-management/event-participants-utils';
import { resolveCenterGroupKey } from '@/components/client-onboarding/task-view-drawer-utils';
import {
  EVENT_TASK_ASSIGNEE_TEAM_SECTIONS,
  EVENT_TASK_ASSIGNEE_ROLE_OPTIONS,
  EVENT_TASK_ASSIGNEE_FETCH_LIMIT,
  EVENT_TASK_ASSIGNEE_USERS_ONLY_ROLES,
  resolveEventTaskTeamSections,
  parseUnknownRolesFromError,
  buildEventTaskAssigneePayload,
  normalizeAssigneeId,
} from '@/components/event-management/event-task-assignee-utils';
import { updateCenterThunk } from '@/redux/centerSlice';
import {
  getCenterLabelSyncFromUpdateAction,
  mapCenterOptionsWithLabelSync,
} from '@/utils/center-label-sync';

export {
  EVENT_TASK_ASSIGNEE_TEAM_SECTIONS,
  EVENT_TASK_ASSIGNEE_ROLE_OPTIONS,
  EVENT_TASK_ASSIGNEE_FETCH_LIMIT,
  EVENT_TASK_ASSIGNEE_USERS_ONLY_ROLES,
};

const EVENT_DOCTYPE = 'Events';

/**
 * Fetch partners for Event Partner dropdown (owner details included).
 * Backend: /method/devx.partner.api.partner.get_partners_with_owner_details
 * Returns rows like: { name, partner_name, partner_owner, owner_name }
 */
export const getPartnersResourceThunk = createAsyncThunk(
  'events/getPartnersResource',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/method/devx.partner.api.partner.get_partners_with_owner_details',
      );
      return response?.data?.message ?? [];
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/**
 * Users + team groups for Event Tasks assignee picker.
 * APIs: `get_roles_with_type` (core) + `get_users_by_roles`
 */
export const fetchEventTaskAssigneesByRolesThunk = createAsyncThunk(
  'events/fetchEventTaskAssigneesByRoles',
  async (
    { limit = EVENT_TASK_ASSIGNEE_FETCH_LIMIT, include_disabled = false } = {},
    { rejectWithValue },
  ) => {
    try {
      let rolesWithTypePayload = null;
      try {
        const rolesRes = await apiClient.get('/method/devx.api.user.get_roles_with_type', {
          params: { group: 'core' },
        });
        rolesWithTypePayload = rolesRes?.data?.message ?? rolesRes?.data ?? null;
      } catch {
        rolesWithTypePayload = null;
      }

      const teamSections = resolveEventTaskTeamSections(rolesWithTypePayload);
      let roleNames = [
        ...new Set(
          [
            ...teamSections.flatMap((t) => t.roles || []),
            ...EVENT_TASK_ASSIGNEE_USERS_ONLY_ROLES,
          ].filter(Boolean),
        ),
      ];
      if (roleNames.length === 0) {
        return { users: [], groups: [], roles: EVENT_TASK_ASSIGNEE_ROLE_OPTIONS };
      }

      const params = { roles: JSON.stringify(roleNames), limit };
      if (include_disabled) params.include_disabled = 1;

      let apiGroups = [];
      try {
        const response = await apiClient.get('/method/devx.api.user.get_users_by_roles', {
          params,
        });
        apiGroups = response?.data?.message?.groups || [];
      } catch (usersError) {
        const unknown = parseUnknownRolesFromError(usersError);
        if (!unknown?.length) throw usersError;
        const unknownSet = new Set(unknown.map((r) => r.toLowerCase()));
        roleNames = roleNames.filter((r) => !unknownSet.has(String(r).toLowerCase()));
        if (roleNames.length === 0) throw usersError;
        teamSections.forEach((team) => {
          team.roles = (team.roles || []).filter((r) => !unknownSet.has(String(r).toLowerCase()));
        });
        const retry = await apiClient.get('/method/devx.api.user.get_users_by_roles', {
          params: { ...params, roles: JSON.stringify(roleNames) },
        });
        apiGroups = retry?.data?.message?.groups || [];
      }

      // Center access is enriched on each user by `get_users_by_roles`
      // (User Permission + Center Team Associated). No separate UP resource call.
      return buildEventTaskAssigneePayload(
        teamSections,
        apiGroups,
        EVENT_TASK_ASSIGNEE_USERS_ONLY_ROLES,
      );
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

const initialState = {
  partner: {
    data: [],
    isLoading: false,
    isError: false,
    hasFetched: false,
  },
  eventsListView: {
    results: [],
    columns: [],
    summary: null,
    keyword: '',
    page: 1,
    page_size: 20,
    count: 0,
    total_count: 0,
    total_pages: 0,
    has_more: false,
    expand_for: '',
    /** Bumps on each non-append fetch so stale append responses are ignored */
    list_fetch_id: 0,
  },
  eventsListViewLoading: false,
  eventsListViewError: null,
  columnPreferences: {
    data: null,
    isLoading: false,
    error: null,
  },

  eventTasks: {
    /** Which list API populated `results`: document tasks vs task master */
    listKind: 'document_task',
    eventName: '',
    results: [],
    /** From `get_task_list_view` with `group=1` — document tasks only */
    taskGroups: [],
    taskListSummary: null,
    isLoading: false,
    error: null,
    isLoadingMore: false,
    page: 1,
    page_size: 5,
    total_pages: 0,
    total_count: 0,
    has_more: false,
    detail: {
      isLoading: false,
      error: null,
    },
    update: {
      isLoading: false,
      error: null,
    },
    create: {
      isLoading: false,
      error: null,
    },
    createMaster: {
      isLoading: false,
      error: null,
    },
    selectedTask: null,
  },
  communityEventParticipants: {
    eventName: '',
    results: [],
    groups: [],
    summary: null,
    /** Normalized from API `message.stats`; null if absent. */
    participantStats: null,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    page: 1,
    page_size: 20,
    total_pages: 0,
    total_count: 0,
    has_more: false,
  },

  eventMeta: {
    centers: {
      results: [],
      isLoading: false,
      error: null,
    },
    clients: {
      results: [],
      isLoading: false,
      error: null,
    },
  },

  eventDetail: {
    isUpdating: false,
    error: null,
  },

  eventActivities: {
    data: null,
    isLoading: false,
    error: null,
    lastRequest: {
      event: '',
      activityFilter: 'all',
      timeFrame: 'all',
    },
  },

  /** Tab badges + stat cards; from `get_event_status_counts`, not the list view API */
  eventStatusCounts: {
    event_type: '',
    status_counts: {},
    total_events: 0,
    upcoming_events: 0,
    executed_events: 0,
    completed_events: 0,
    total_seat_capacity: 0,
    total_registrations: 0,
    approved_by_ho: 0,
    isLoading: false,
    error: null,
  },

  /** Event task assignees from `get_roles_with_type` + `get_users_by_roles` */
  eventTaskAssignees: {
    users: [],
    groups: [],
    roles: EVENT_TASK_ASSIGNEE_ROLE_OPTIONS,
    status: 'idle',
    error: null,
  },
};

/**
 * Fetch Event activities (event changes + linked task activities).
 */
export const fetchEventActivitiesThunk = createAsyncThunk(
  'events/fetchEventActivities',
  async ({ event, activityFilter = 'all', timeFrame = 'all' } = {}, { rejectWithValue }) => {
    if (!event) {
      return { groups: [], activity_filter_options: [], time_frame_options: [] };
    }
    try {
      const { data } = await apiClient.get(
        '/method/devx.event_management.api.events.get_event_activities',
        {
          params: {
            event,
            activity_filter: activityFilter,
            time_frame: timeFrame,
          },
        },
      );
      const result = data?.message ?? data;
      return result ?? { groups: [], activity_filter_options: [], time_frame_options: [] };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/** List API returns assignees as [{ name, full_name, user_image }, ...] or legacy string ids. */
const formatEventTaskAssigneeLabel = (row) => {
  const single = row?.assignee;
  if (typeof single === 'string' && single.trim()) return single.trim();
  const list = row?.assignees ?? row?.assigned_to;
  if (!Array.isArray(list) || list.length === 0) return '';
  return list
    .map((entry) => {
      if (entry == null) return '';
      if (typeof entry === 'string') return entry;
      return entry.full_name || entry.user || entry.email || entry.name || '';
    })
    .filter(Boolean)
    .join(', ');
};

const normalizeEventTaskRow = (row) => {
  const subject = row?.subject || row?.task_name || row?.task || row?.title || row?.name || '';
  const assignee = formatEventTaskAssigneeLabel(row);

  return {
    id: row?.name || row?.id || subject,
    task: subject,
    assignee,
    status: row?.status || '',
    dueDate: row?.exp_end_date || row?.due_date || row?.dueDate || '',
    priority: row?.priority || '',
    raw: row,
  };
};

const normalizeListFilter = (value) => {
  const list = Array.isArray(value) ? value : value != null && value !== '' ? [value] : [];
  return list.map((item) => String(item).trim()).filter(Boolean);
};

/** Frappe-style tuples for `get_event_participants` body.filters (multi-value uses `"in"` + array). */
const buildCommunityEventParticipantsFiltersPayload = (centers, clients) => {
  const tuples = [];
  const centerVals = normalizeListFilter(centers);
  const clientVals = normalizeListFilter(clients);
  if (centerVals.length > 1) tuples.push(['center', 'in', centerVals]);
  else if (centerVals.length === 1) tuples.push(['center', '=', centerVals[0]]);
  if (clientVals.length > 1) tuples.push(['customer_id', 'in', clientVals]);
  else if (clientVals.length === 1) tuples.push(['customer_id', '=', clientVals[0]]);
  return tuples;
};

const normalizeParticipantSeatNumber = (value) => {
  if (value === '' || value == null) return '';
  const n = Number(value);
  return Number.isFinite(n) ? n : '';
};

const normalizeCommunityParticipantRow = (row, idx = 0) => {
  const clientName =
    row?.client_name ||
    row?.participant_name ||
    row?.full_name ||
    row?.name ||
    row?.member_name ||
    row?.user_name ||
    row?.customer_name ||
    '';
  const participantName = clientName;
  const centerNameRaw =
    row?.center_name ||
    row?.center ||
    row?.centre_name ||
    row?.custom_center ||
    row?.center_id ||
    '';
  const center = centerNameRaw;
  const email = row?.email || row?.email_id || row?.participant_email || '';
  const customerId = row?.customer_id != null ? String(row.customer_id).trim() : '';

  const noOfSeatsRaw =
    row?.assigned_seats ??
    row?.no_of_seats ??
    row?.number_of_seats ??
    row?.no_of_seat ??
    row?.seats ??
    row?.seats_allocated ??
    '';
  const assignedSeatsNorm = normalizeParticipantSeatNumber(noOfSeatsRaw);
  const expected_seats_norm = normalizeParticipantSeatNumber(row?.expected_seats);
  const rawExpectedSeatsUserSet = row?.expected_seats_user_set ?? row?.expected_seat_user_set;
  const hasExpectedSeatsUserSetFlag =
    rawExpectedSeatsUserSet !== null &&
    rawExpectedSeatsUserSet !== undefined &&
    rawExpectedSeatsUserSet !== '';
  const remarksRaw = row?.remarks ?? row?.remark ?? '';

  let participantsPctValue = null;
  const rawPct = row?.participants_percentage;
  if (rawPct !== null && rawPct !== undefined && rawPct !== '') {
    const pn = Number(rawPct);
    if (Number.isFinite(pn)) participantsPctValue = pn;
  }

  const id =
    row?.name ||
    row?.customer_id ||
    row?.id ||
    row?.participant ||
    row?.participant_id ||
    row?.email ||
    row?.mobile ||
    `${participantName || 'participant'}-${idx}`;

  return {
    id,
    customer_id: customerId,
    center_id:
      row?.center_id != null
        ? String(row.center_id).trim()
        : row?.center != null
          ? String(row.center).trim()
          : row?.centre != null
            ? String(row.centre).trim()
            : '',
    client_name: clientName ? String(clientName) : '',
    center_name: centerNameRaw ? String(centerNameRaw) : '',
    participant_name: participantName || '--',
    email: email ? email : '--',
    center: center || '--',
    no_of_seats: assignedSeatsNorm,
    expected_seats: expected_seats_norm,
    expected_seats_user_set: hasExpectedSeatsUserSetFlag ? Number(rawExpectedSeatsUserSet) : null,
    participants_pct_value: participantsPctValue,
    remarks: remarksRaw === '' || remarksRaw == null ? '' : String(remarksRaw),
    raw: row,
  };
};

const normalizeCommunityParticipantGroup = (group, idx = 0, groupByField = '') => {
  const groupName =
    group?.group_name ||
    group?.center ||
    group?.center_name ||
    group?.centre_name ||
    group?.client ||
    group?.customer_name ||
    group?.customer ||
    group?.name ||
    '--';
  const gb = String(groupByField || '')
    .trim()
    .toLowerCase();
  const rowsRaw = group?.participants || group?.results || group?.rows || group?.items || [];
  const rows = (Array.isArray(rowsRaw) ? rowsRaw : []).map((row, rowIndex) => {
    const spread = { ...row };
    if (gb === 'center') {
      spread.center_name = row?.center_name || row?.center || row?.centre_name || groupName;
      spread.center = row?.center || row?.center_name || row?.centre_name || groupName;
      spread.center_id = row?.center_id || row?.center || row?.centre || '';
      spread.client_name = row?.client_name || row?.participant_name || row?.customer_name;
    } else if (gb === 'client') {
      spread.client_name =
        row?.client_name || row?.participant_name || row?.customer_name || groupName;
      spread.center_name = row?.center_name || row?.center || row?.centre_name;
      spread.center = row?.center || row?.center_name || spread.center_name;
      spread.center_id = row?.center_id || row?.center || row?.centre || '';
    } else {
      spread.center_name = row?.center_name || row?.center || row?.centre_name || groupName;
      spread.center = row?.center || row?.center_name || row?.centre_name || groupName;
      spread.center_id = row?.center_id || row?.center || row?.centre || '';
      spread.client_name = row?.client_name || row?.participant_name || row?.customer_name;
    }
    return normalizeCommunityParticipantRow(spread, rowIndex);
  });
  return {
    id: group?.id || group?.group_name || group?.name || `${groupName}-${idx}`,
    center: String(groupName),
    group_name: String(groupName),
    total_participants:
      Number(group?.total_participants ?? rows.length) || (rows.length > 0 ? rows.length : 0),
    participants: rows,
  };
};

const mergeCommunityParticipantGroupsByCenter = (existing, incoming) => {
  const map = new Map();
  const keyOf = (c) =>
    String(c ?? '')
      .trim()
      .toLowerCase();
  for (const g of existing || []) {
    const k = keyOf(g?.center);
    if (!k) continue;
    map.set(k, {
      ...g,
      participants: Array.isArray(g?.participants) ? [...g.participants] : [],
    });
  }
  for (const g of incoming || []) {
    const k = keyOf(g?.center);
    if (!k) continue;
    const incomingRows = Array.isArray(g?.participants) ? g.participants : [];
    if (!map.has(k)) {
      map.set(k, { ...g, participants: [...incomingRows] });
    } else {
      const prev = map.get(k);
      prev.participants = [...(prev.participants || []), ...incomingRows];
      prev.total_participants = prev.participants.length;
    }
  }
  return [...map.values()];
};

/** `message.stats` from get_event_participants — totals for the participants stats strip. */
function parseCommunityEventParticipantStatsFromApi(statsRaw) {
  if (!Array.isArray(statsRaw) || statsRaw.length === 0) return null;
  const normLabel = (s) =>
    String(s ?? '')
      .trim()
      .toLowerCase()
      .replaceAll('.', '')
      .replaceAll(/\s+/g, ' ');

  const map = new Map();
  for (const item of statsRaw) {
    const label = normLabel(item?.label);
    if (label) map.set(label, item?.value);
  }
  const pick = (candidates) => {
    for (const c of candidates) {
      const v = map.get(c);
      if (v !== undefined) return v;
    }
    return undefined;
  };

  const noOfClients = pick(['no of clients', 'number of clients']);
  const totalParticipants = pick(['total participants']);
  const totalExpected = pick(['total expected']);
  const participantsPct = pick(['participants %', 'total participants %']);

  const hasAny = [noOfClients, totalParticipants, totalExpected, participantsPct].some(
    (v) => v !== undefined,
  );
  if (!hasAny) return null;

  const toNum = (v, fallback = 0) => {
    if (v === undefined || v === null || v === '') return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  let pctNum = null;
  if (participantsPct !== undefined && participantsPct !== null && participantsPct !== '') {
    const n = Number(participantsPct);
    if (Number.isFinite(n)) pctNum = n;
  }

  return {
    noOfClients: toNum(noOfClients),
    totalParticipants: toNum(totalParticipants),
    totalExpected: toNum(totalExpected),
    participantsPct: pctNum,
  };
}

async function fetchCommunityEventParticipantsPayload(
  {
    event,
    event_type = 'Community Events',
    keyword,
    page = 1,
    page_size = 20,
    /** 1 = grouped response, 0 = flat list (`results`). */
    group = 0,
    /** When `group` is 1: `center` \| `client` (API `group_by`). */
    group_by,
    /** When grouped: `asc` \| `desc` (API `group_order`). */
    group_order,
    centers,
    clients,
    append = false,
  } = {},
  { getState } = {},
) {
  const grouped = Boolean(group);
  const body = { event, event_type, page, page_size, group: grouped ? 1 : 0 };
  const kw = keyword != null ? String(keyword).trim() : '';
  if (kw) body.keyword = kw;

  const gb = group_by != null ? String(group_by).trim().toLowerCase() : '';
  if (grouped && gb) {
    body.group_by = gb;
    const go = group_order != null ? String(group_order).trim().toLowerCase() : '';
    if (go === 'asc' || go === 'desc') body.group_order = go;
  }

  const filterTuples = buildCommunityEventParticipantsFiltersPayload(centers, clients);
  if (filterTuples.length > 0) body.filters = filterTuples;

  const response = await apiClient.post(
    '/method/devx.event_management.api.events.get_event_participants',
    body,
  );
  const msg = response?.data?.message ?? response?.data ?? {};

  let groups = [];
  let results = [];

  if (!grouped) {
    const rowsRaw =
      msg?.results || msg?.participants || msg?.data || (Array.isArray(msg) ? msg : []) || [];
    results = (Array.isArray(rowsRaw) ? rowsRaw : []).map((row, idx) =>
      normalizeCommunityParticipantRow(row, idx),
    );
    groups = [];
  } else {
    const groupsRaw = msg?.groups;
    const hadGroupsArray = Array.isArray(groupsRaw) && groupsRaw.length > 0;
    const hadGroupsObject =
      groupsRaw &&
      typeof groupsRaw === 'object' &&
      !Array.isArray(groupsRaw) &&
      Object.keys(groupsRaw).length > 0;
    const hadGroupsFromApi = hadGroupsArray || hadGroupsObject;
    if (Array.isArray(groupsRaw)) {
      groups = groupsRaw.map((groupRow, idx) =>
        normalizeCommunityParticipantGroup(groupRow, idx, gb),
      );
    } else if (groupsRaw && typeof groupsRaw === 'object') {
      groups = Object.entries(groupsRaw).map(([center, rows], idx) =>
        normalizeCommunityParticipantGroup({ center, participants: rows }, idx, gb),
      );
    }

    results = groups.flatMap((groupRow) => groupRow.participants);
    /** Legacy: flat rows without `groups` when grouped mode requested. */
    if (!hadGroupsFromApi && results.length === 0) {
      const rowsRaw =
        msg?.results || msg?.participants || msg?.data || (Array.isArray(msg) ? msg : []) || [];
      const normalizedRows = (Array.isArray(rowsRaw) ? rowsRaw : []).map((row, idx) =>
        normalizeCommunityParticipantRow(row, idx),
      );
      results = normalizedRows;
      const groupedByCenter = new Map();
      normalizedRows.forEach((row) => {
        const key = String(row?.center || '--').trim() || '--';
        if (!groupedByCenter.has(key)) groupedByCenter.set(key, []);
        groupedByCenter.get(key).push(row);
      });
      groups = [...groupedByCenter.entries()].map(([center, rows], idx) =>
        normalizeCommunityParticipantGroup({ center, participants: rows }, idx, gb || 'center'),
      );
    }
  }

  if (append) {
    const stateSlice = getState()?.events?.communityEventParticipants;
    if (grouped) {
      const prevGroups = stateSlice?.groups ?? [];
      groups = mergeCommunityParticipantGroupsByCenter(prevGroups, groups);
      results = groups.flatMap((groupRow) => groupRow.participants);
    } else {
      const prevResults = Array.isArray(stateSlice?.results) ? stateSlice.results : [];
      results = [...prevResults, ...results];
    }
  }

  const apiPage = Number(msg?.page ?? page) || 1;
  const apiPageSize = Number(msg?.page_size ?? page_size) || page_size;
  const totalPages = Number(msg?.total_pages ?? 0) || 0;
  const totalCount = Number(msg?.total_count ?? 0) || 0;
  const hasMore =
    msg?.has_more != null
      ? Boolean(msg.has_more)
      : totalPages > 0
        ? apiPage < totalPages
        : grouped
          ? groups.length >= apiPageSize
          : results.length >= apiPageSize;

  const participantStats = parseCommunityEventParticipantStatsFromApi(msg?.stats);

  return {
    eventName: event,
    results,
    groups,
    summary: {
      total_participants:
        Number(msg?.total_participants ?? totalCount ?? results.length) ||
        (results.length > 0 ? results.length : 0),
      total_groups:
        Number(msg?.total_groups ?? groups.length) || (groups.length > 0 ? groups.length : 0),
    },
    append,
    page: apiPage,
    page_size: apiPageSize,
    total_pages: totalPages,
    total_count: totalCount,
    has_more: hasMore,
    ...(participantStats != null ? { participantStats } : {}),
  };
}

export const getCommunityEventParticipantsThunk = createAsyncThunk(
  'events/getCommunityEventParticipants',
  async (args = {}, { rejectWithValue, getState }) => {
    if (!args.event) return rejectWithValue('event required');
    try {
      return await fetchCommunityEventParticipantsPayload(args, { getState });
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/**
 * Post–inline-edit sync (ticket `fetchTicketDetail` pattern): refresh stats and row
 * percentages without toggling participants list loading or replacing table data.
 */
export const syncCommunityEventParticipantsAfterInlineEdit = createAsyncThunk(
  'events/syncCommunityEventParticipantsAfterInlineEdit',
  async (args = {}, { rejectWithValue, getState }) => {
    if (!args.event) return rejectWithValue('event required');
    try {
      return await fetchCommunityEventParticipantsPayload({ ...args, append: false }, { getState });
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/** Frappe-style tuples for task list views: [["status","in",[...]],["center","in",[...]], ...] */
const buildEventTaskListFiltersPayload = (center, task_status, task_priority) => {
  const tuples = [];
  const centers = normalizeListFilter(center);
  const statuses = normalizeListFilter(task_status);
  const priorities = normalizeListFilter(task_priority);
  if (statuses.length > 0) tuples.push(['status', 'in', statuses]);
  if (centers.length > 0) tuples.push(['center', 'in', centers]);
  if (priorities.length > 0) tuples.push(['priority', 'in', priorities]);
  return tuples;
};

const applyEventTaskUpdateToNormalizedRow = (row, patch = {}) => {
  if (!row) return row;
  const raw = row.raw || {};
  const mergedRaw = { ...raw, ...patch };
  return normalizeEventTaskRow(mergedRaw);
};

const eventTaskRowMatchesId = (row, taskId) => {
  const idStr = String(taskId ?? '').trim();
  if (!idStr) return false;
  const raw = row?.raw && typeof row.raw === 'object' ? row.raw : {};
  const candidates = [raw.name, raw.task_id, raw.id, row?.name, row?.task_id, row?.id];
  return candidates.some((c) => c != null && String(c).trim() === idStr);
};

const findEventTaskRow = (state, taskId) => {
  const results = Array.isArray(state.eventTasks.results) ? state.eventTasks.results : [];
  const fromResults = results.find((r) => eventTaskRowMatchesId(r, taskId));
  if (fromResults) return fromResults;
  const groups = Array.isArray(state.eventTasks.taskGroups) ? state.eventTasks.taskGroups : [];
  for (const g of groups) {
    const tasks = g?.tasks;
    if (!Array.isArray(tasks)) continue;
    const found = tasks.find((r) => eventTaskRowMatchesId(r, taskId));
    if (found) return found;
  }
  return null;
};

const selectedEventTaskMatchesId = (selectedTask, taskId) => {
  if (!selectedTask || typeof selectedTask !== 'object') return false;
  const idStr = String(taskId ?? '').trim();
  if (!idStr) return false;
  const candidates = [
    selectedTask.name,
    selectedTask.task_id,
    selectedTask.id,
    selectedTask.raw?.name,
    selectedTask.raw?.task_id,
    selectedTask.raw?.id,
  ];
  return candidates.some((c) => c != null && String(c).trim() === idStr);
};

/** Keep flat `results` and nested `taskGroups[].tasks` in sync after inline updates. */
const patchEventTaskRowEverywhere = (state, taskId, patch) => {
  if (!taskId) return;
  const results = state.eventTasks.results;
  if (Array.isArray(results)) {
    const idx = results.findIndex((r) => eventTaskRowMatchesId(r, taskId));
    if (idx >= 0) {
      state.eventTasks.results[idx] = applyEventTaskUpdateToNormalizedRow(results[idx], patch);
    }
  }
  const groups = state.eventTasks.taskGroups;
  if (Array.isArray(groups)) {
    for (let gi = 0; gi < groups.length; gi++) {
      const tasks = groups[gi]?.tasks;
      if (!Array.isArray(tasks)) continue;
      const ti = tasks.findIndex((r) => eventTaskRowMatchesId(r, taskId));
      if (ti >= 0) {
        state.eventTasks.taskGroups[gi].tasks[ti] = applyEventTaskUpdateToNormalizedRow(
          tasks[ti],
          patch,
        );
      }
    }
  }
};

const replaceEventTaskAssigneesInState = (state, taskId, nextAssignees) => {
  if (!taskId) return;
  const next = Array.isArray(nextAssignees) ? nextAssignees : [];
  patchEventTaskRowEverywhere(state, taskId, {
    assignees: next,
    assigned_to: next,
  });
  if (selectedEventTaskMatchesId(state.eventTasks.selectedTask, taskId)) {
    state.eventTasks.selectedTask = {
      ...state.eventTasks.selectedTask,
      assignees: next,
      assigned_to: next,
    };
  }
};

export const getEventTypeListThunk = createAsyncThunk(
  'events/getEventTypeList',
  async (
    {
      event_type,
      keyword = '',
      status = 'all',
      page = 1,
      page_size = 20,
      expand_for = '',
      filters = [],
      order_by = 'creation desc',
    } = {},
    { rejectWithValue },
  ) => {
    if (!event_type) {
      return rejectWithValue('event_type required');
    }
    try {
      const body = {
        event_type,
        keyword,
        page,
        page_size,
        order_by,
        ...(status && status !== 'all' ? { status } : {}),
        ...(expand_for ? { expand_for } : {}),
      };
      if (Array.isArray(filters) && filters.length > 0) {
        body.filters = filters;
      }
      const response = await apiClient.post(
        '/method/devx.event_management.api.events.get_event_type_list',
        body,
      );
      return response?.data?.message ?? response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/**
 * Status tab counts + summary metrics for the events list page.
 * Backend: devx.event_management.api.events.get_event_status_counts
 */
export const getEventStatusCountsThunk = createAsyncThunk(
  'events/getEventStatusCounts',
  async ({ event_type, filters = [] } = {}, { rejectWithValue }) => {
    if (!event_type) {
      return rejectWithValue('event_type required');
    }
    try {
      const body = { event_type };
      if (Array.isArray(filters) && filters.length > 0) {
        body.filters = filters;
      }
      const response = await apiClient.post(
        '/method/devx.event_management.api.events.get_event_status_counts',
        body,
      );
      return response?.data?.message ?? response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const getEventTaskListThunk = createAsyncThunk(
  'events/getEventTaskList',
  async (
    {
      event,
      keyword,
      page = 1,
      page_size = 5,
      append = false,
      center = [],
      task_status = [],
      task_priority = [],
    } = {},
    { rejectWithValue, getState },
  ) => {
    if (!event) return rejectWithValue('event required');
    try {
      const body = {
        custom_ref_doctype: 'Events',
        custom_ref_docname: event,
        task_type: 'Event Tasks',
        group: 1,
        page,
        page_size,
      };
      if (keyword != null && String(keyword).trim() !== '') {
        body.keyword = String(keyword).trim();
      }
      const filterTuples = buildEventTaskListFiltersPayload(center, task_status, task_priority);
      if (filterTuples.length > 0) body.filters = filterTuples;

      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.get_task_list_view',
        body,
      );
      const msg = response?.data?.message ?? response?.data ?? {};
      const groupsRaw = msg?.groups;
      const taskGroups = [];

      if (Array.isArray(groupsRaw)) {
        groupsRaw.forEach((g) => {
          const groupTasks = (Array.isArray(g?.tasks) ? g.tasks : []).map(normalizeEventTaskRow);
          taskGroups.push({
            center: resolveCenterGroupKey(g?.center) || resolveCenterGroupKey(g?.center_name) || '',
            total_tasks: Number(g?.total_tasks ?? groupTasks.length) || 0,
            completed_tasks: Number(g?.completed_tasks ?? 0) || 0,
            pending_tasks: Number(g?.pending_tasks ?? 0) || 0,
            completed_percentage: Number(g?.completed_percentage ?? 0) || 0,
            tasks: groupTasks,
          });
        });
      } else if (groupsRaw && typeof groupsRaw === 'object') {
        Object.entries(groupsRaw).forEach(([centerName, centerTasks]) => {
          const groupTasks = (Array.isArray(centerTasks) ? centerTasks : []).map(
            normalizeEventTaskRow,
          );
          const totalTasks = groupTasks.length;
          const completedTasks = groupTasks.filter(
            (taskRow) => String(taskRow?.raw?.status || '').toLowerCase() === 'completed',
          ).length;
          taskGroups.push({
            center: centerName ?? '',
            total_tasks: totalTasks,
            completed_tasks: completedTasks,
            pending_tasks: Math.max(totalTasks - completedTasks, 0),
            completed_percentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
            tasks: groupTasks,
          });
        });
      }
      const normalized = taskGroups.flatMap((g) => g.tasks);

      const totalTasksParsed = Number(msg?.total_tasks ?? normalized.length);
      const totalCount = totalTasksParsed || (normalized.length > 0 ? normalized.length : 0);

      const totalCentersParsed = Number(msg?.total_centers ?? 0) || 0;
      const apiPage = Number(msg?.page ?? page) || 1;
      const apiPageSize = Number(msg?.page_size ?? page_size) || page_size;
      const totalPages = Number(msg?.total_pages ?? 0) || 0;
      const prevGroupCount = append ? (getState()?.events?.eventTasks?.taskGroups?.length ?? 0) : 0;
      const cumulativeCenters = prevGroupCount + taskGroups.length;
      const hasMore =
        msg?.has_more != null
          ? Boolean(msg.has_more)
          : totalPages > 0
            ? apiPage < totalPages
            : totalCentersParsed > 0
              ? cumulativeCenters < totalCentersParsed
              : taskGroups.length >= apiPageSize;

      return {
        eventName: event,
        results: normalized,
        taskGroups,
        taskListSummary: {
          total_tasks: Number(msg?.total_tasks ?? 0) || 0,
          completed_tasks: Number(msg?.completed_tasks ?? 0) || 0,
          completed_percentage: Number(msg?.completed_percentage ?? 0) || 0,
          total_centers:
            totalCentersParsed ||
            (append ? cumulativeCenters : taskGroups.length > 0 ? taskGroups.length : 0),
        },
        raw: msg,
        append,
        page: apiPage,
        page_size: apiPageSize,
        total_pages: totalPages,
        total_count: totalCount,
        has_more: hasMore,
        listKind: 'document_task',
      };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/**
 * Event Task Master list — `devx.api.task_master.get_task_master_list_view`,
 * scoped with `ref_doctype` / `ref_docname` (Events + event id).
 */
export const getEventTaskMasterListThunk = createAsyncThunk(
  'events/getEventTaskMasterList',
  async (
    {
      event,
      keyword,
      page = 1,
      page_size = 20,
      append = false,
      order_by,
      center = [],
      task_status = [],
      task_priority = [],
    } = {},
    { rejectWithValue },
  ) => {
    if (!event) return rejectWithValue('event required');
    try {
      const body = {
        task_type: 'Event Tasks',
        ref_doctype: 'Events',
        ref_docname: event,
        page,
        page_size,
      };
      const kw = keyword != null ? String(keyword).trim() : '';
      if (kw) body.keyword = kw;
      if (order_by) body.order_by = order_by;
      const filterTuples = buildEventTaskListFiltersPayload(center, task_status, task_priority);
      if (filterTuples.length > 0) body.filters = filterTuples;

      const response = await apiClient.post(
        '/method/devx.api.task_master.get_task_master_list_view',
        body,
      );

      const data = response?.data;
      const msg = data?.message ?? data ?? {};
      const rowsRaw = msg?.results || msg?.data || msg?.tasks || (Array.isArray(msg) ? msg : []);
      const rows = Array.isArray(rowsRaw) ? rowsRaw : [];
      const normalized = rows.map(normalizeEventTaskRow);

      const apiPage = Number(msg?.page ?? page) || page;
      const apiPageSize = Number(msg?.page_size ?? page_size) || page_size;
      const totalPages = Number(msg?.total_pages ?? 0) || 0;
      const totalCount = Number(msg?.total_count ?? 0) || 0;
      const hasMore =
        msg?.has_more != null
          ? Boolean(msg.has_more)
          : totalPages > 0
            ? apiPage < totalPages
            : totalCount > 0
              ? apiPage * apiPageSize < totalCount
              : rows.length >= apiPageSize;

      return {
        eventName: event,
        results: normalized,
        raw: msg,
        append,
        page: apiPage,
        page_size: apiPageSize,
        total_pages: totalPages,
        total_count: totalCount,
        has_more: hasMore,
        listKind: 'task_master',
      };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const createEventTaskThunk = createAsyncThunk(
  'events/createEventTask',
  async ({ eventName, taskData } = {}, { rejectWithValue }) => {
    if (!eventName) return rejectWithValue('eventName required');
    try {
      const base = taskData && typeof taskData === 'object' ? { ...taskData } : {};
      delete base.event_id;

      // Backend expects multipart payload for attachments (same as Partner CRM tasks).
      const formData = new FormData();
      const type = base.type || 'Event Tasks';
      const subject = base.subject || base.task_name || base.taskTitle || base.title || '';

      formData.append('subject', subject);
      formData.append('description', base.description || '');
      formData.append('status', base.status || '');
      const priority = String(base.priority ?? '').trim();
      if (priority) formData.append('priority', priority);
      formData.append('type', type);

      // Due date for CRM task
      if (base.exp_end_date) formData.append('exp_end_date', String(base.exp_end_date));

      const customNextUpdate = String(base.custom_next_update_date ?? '').trim();
      if (customNextUpdate) {
        formData.append('custom_next_update_date', customNextUpdate);
      }

      formData.append('custom_ref_doctype', 'Events');
      formData.append('custom_ref_docname', eventName);

      // Assignees: normalize to array and JSON.stringify
      const assigneeValue = base.assignees ?? base.assigned_to ?? base.assignedTo ?? base.assignee;
      const assigneeList = Array.isArray(assigneeValue)
        ? assigneeValue
        : assigneeValue
          ? [assigneeValue]
          : [];
      const cleanedAssignees = assigneeList.filter(Boolean);
      if (cleanedAssignees.length > 0) {
        formData.append('assignees', JSON.stringify(cleanedAssignees));
      }

      // Attachments from create-task-drawer-common are [{ file, ... }, ...]
      const attachments = Array.isArray(base.attachment) ? base.attachment : [];
      attachments.forEach((item) => {
        if (item?.file) formData.append('attachments', item.file);
      });

      // Tags: array of strings
      const tags = Array.isArray(base.tags)
        ? base.tags
        : Array.isArray(base.tagArr)
          ? base.tagArr
          : [];
      if (tags.length > 0) {
        formData.append('tags', JSON.stringify(tags));
      }

      const centerIds = Array.isArray(base.centers) ? base.centers.map(String).filter(Boolean) : [];
      if (centerIds.length > 0) {
        formData.append('centers', JSON.stringify(centerIds));
      }

      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.create_ref_doc_task',
        formData,
      );
      return response?.data?.message ?? response?.data?.data ?? response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/**
 * Event Task Master — same API as settings client/center task master (`create_task_master`),
 * scoped to the event via ref fields where supported by the backend.
 */
export const createEventTaskMasterThunk = createAsyncThunk(
  'events/createEventTaskMaster',
  async ({ eventName, taskData } = {}, { rejectWithValue }) => {
    if (!eventName) return rejectWithValue('eventName required');
    try {
      const base = taskData && typeof taskData === 'object' ? { ...taskData } : {};
      const formData = new FormData();

      formData.append('subject', base.subject || base.taskTitle || base.task_name || '');
      formData.append('description', base.description || '');
      formData.append('status', base.status || '');
      const priority = String(base.priority ?? '').trim();
      if (priority) formData.append('priority', priority);
      formData.append('type', base.type || 'Event Tasks');
      formData.append('duration', String(base.duration ?? '').trim() || '0');
      const nextUp = base.next_update ?? base.next_update_date;
      if (nextUp != null && String(nextUp).trim() !== '') {
        formData.append('next_update', String(nextUp).trim());
      }

      formData.append('ref_doctype', 'Events');
      formData.append('ref_docname', eventName);

      const assigneeValue = base.assignees ?? base.assigned_to ?? base.assignedTo ?? base.assignee;
      const assigneeList = Array.isArray(assigneeValue)
        ? assigneeValue
        : assigneeValue
          ? [assigneeValue]
          : [];
      const cleanedAssignees = assigneeList.filter(Boolean);
      if (cleanedAssignees.length > 0) {
        formData.append('assignees', JSON.stringify(cleanedAssignees));
      }

      const attachments = Array.isArray(base.attachment) ? base.attachment : [];
      attachments.forEach((item) => {
        if (item?.file) formData.append('attachment', item.file);
      });

      const tags = Array.isArray(base.tags)
        ? base.tags
        : Array.isArray(base.tagArr)
          ? base.tagArr
          : [];
      if (tags.length > 0) {
        formData.append('tags', JSON.stringify(tags));
      }

      const useAllCenters =
        base.all_centers === 1 ||
        base.all_centers === true ||
        base.all_centers === '1' ||
        String(base.all_centers || '').toLowerCase() === 'yes';
      if (useAllCenters) {
        formData.append('all_centers', '1');
      } else {
        const centerIds = Array.isArray(base.centers)
          ? base.centers.map(String).filter(Boolean)
          : [];
        if (centerIds.length > 0) {
          formData.append('centers', JSON.stringify(centerIds));
        }
      }

      const response = await apiClient.post(
        '/method/devx.api.task_master.create_task_master',
        formData,
      );
      return response?.data?.message ?? response?.data?.data ?? response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const getEventTaskDetailedViewThunk = createAsyncThunk(
  'events/getEventTaskDetailedView',
  async ({ task_id, task_type, subject, type = 'Event Tasks' } = {}, { rejectWithValue }) => {
    const resolvedTaskId = task_id ?? subject;
    const resolvedTaskType = task_type ?? type;
    if (!resolvedTaskId) return rejectWithValue('task_id required');
    try {
      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.get_task_detailed_view',
        { task_id: resolvedTaskId, task_type: resolvedTaskType },
      );
      const payload = response?.data?.message ?? response?.data?.data ?? response?.data;
      const row =
        (payload &&
        typeof payload === 'object' &&
        payload.message &&
        typeof payload.message === 'object'
          ? payload.message
          : payload) || {};
      return row;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const updateEventTaskThunk = createAsyncThunk(
  'events/updateEventTask',
  async (payload = {}, { rejectWithValue }) => {
    const task_id = payload?.task_id || payload?.name || payload?.id;
    if (!task_id) return rejectWithValue('task_id required');
    try {
      // IMPORTANT: don't mutate `payload` (we rely on meta.arg elsewhere)
      const params = { ...payload, task_id };
      if (Array.isArray(payload.assignees)) {
        params.assignees = JSON.stringify(payload.assignees);
      }
      if (Array.isArray(payload.centers)) {
        params.centers = JSON.stringify(payload.centers);
      }

      const response = await apiClient.put(
        '/method/devx.dev_x.api.document_task.update_ref_doc_task',
        params,
      );
      return response?.data?.message ?? response?.data?.data ?? response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

// --- Task assignment (assignee add/remove) ---
// Use the same APIs as ticket management for assignee changes.
export const assignEventTask = createAsyncThunk(
  'events/assignEventTask',
  async ({ name, assign_to }, { rejectWithValue }) => {
    if (!name) return rejectWithValue('Task name is required');
    try {
      const assignees = Array.isArray(assign_to) ? assign_to : [assign_to].filter(Boolean);
      if (assignees.length === 0) return rejectWithValue('At least one assignee is required');
      const assigneesList = assignees.map((a) =>
        typeof a === 'string' ? a : a.value || a.email || a.name || a,
      );
      const response = await apiClient.post('/method/frappe.desk.form.assign_to.add', {
        doctype: 'Task',
        name,
        assign_to: assigneesList,
        ignore_permissions: true,
      });
      return response?.data?.message;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const removeEventTaskAssignments = createAsyncThunk(
  'events/removeEventTaskAssignments',
  async ({ name, assignees }, { rejectWithValue }) => {
    if (!name) return rejectWithValue('Task name is required');
    try {
      const assigneesList = Array.isArray(assignees) ? assignees : [assignees].filter(Boolean);
      if (assigneesList.length === 0) return rejectWithValue('At least one assignee is required');
      const normalizedAssignees = assigneesList.map((a) =>
        typeof a === 'string' ? a : a.value || a.email || a.name || a,
      );
      await apiClient.post('/method/helpdesk.api.doc.remove_assignments', {
        doctype: 'Task',
        name,
        assignees: normalizedAssignees,
        ignore_permissions: true,
      });
      return { message: 'Assignments removed successfully' };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const deleteEventAttachmentThunk = createAsyncThunk(
  'events/deleteEventAttachment',
  async ({ child_row_id, child_doctype = 'Event Attachment' } = {}, { rejectWithValue }) => {
    if (!child_row_id) return rejectWithValue('child_row_id required');
    try {
      const response = await apiClient.post(
        '/method/devx.event_management.api.events.delete_event_attachment',
        { child_row_id, child_doctype },
      );
      return response?.data?.message ?? response?.data?.data ?? response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const uploadEventAttachmentThunk = createAsyncThunk(
  'events/uploadEventAttachment',
  async (
    { event, files = [], type = '', url = '', attachment_name = '' } = {},
    { rejectWithValue },
  ) => {
    if (!event) return rejectWithValue('event required');
    const fileList = Array.isArray(files) ? files.filter(Boolean) : [];
    const trimmedUrl = String(url ?? '').trim();
    const trimmedName = String(attachment_name ?? '').trim();
    if (fileList.length === 0 && !trimmedUrl) return rejectWithValue('files or url required');

    try {
      const formData = new FormData();
      fileList.forEach((file) => formData.append('attachment_file', file));
      formData.append('event', String(event));
      if (type) formData.append('type', String(type));
      if (trimmedUrl) formData.append('attachment_url', trimmedUrl);
      if (trimmedName) formData.append('attachment_name', trimmedName);

      const response = await apiClient.post(
        '/method/devx.event_management.api.events.upload_event_attachment',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response?.data?.message ?? response?.data?.data ?? response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/**
 * Upload attachment for a CRM Task linked to an Event (Task Drawer).
 * Backend: devx.dev_x.api.document_task.upload_task_attachment
 */
export const uploadEventTaskAttachmentThunk = createAsyncThunk(
  'events/uploadEventTaskAttachment',
  async ({ task_id, attachment_file, attachment_files, attachments }, { rejectWithValue }) => {
    if (!task_id) return rejectWithValue('task_id required');
    try {
      const formData = new FormData();
      formData.append('task_id', String(task_id));
      const files = Array.isArray(attachments)
        ? attachments
        : Array.isArray(attachment_files)
          ? attachment_files
          : attachment_file
            ? [attachment_file]
            : [];
      if (files.length === 0) return rejectWithValue('attachment_file required');

      files.forEach((file) => {
        if (file) formData.append('attachment_file', file);
      });

      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.upload_task_attachment',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      return response?.data?.message ?? response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

function mapCenterRowsToLabelById(rows) {
  const map = {};
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const key = String(row?.name ?? '').trim();
    const label = String(row?.center_name ?? '').trim();
    if (key && label) map[key] = label;
  });
  return map;
}

/**
 * Resolve Center display names for event `centre_name[].center` values (e.g. CTR-378).
 * `get_event_details` child rows only include the Link value in `center`, not `center_name`.
 */
export const fetchCenterLabelsByIdsThunk = createAsyncThunk(
  'events/fetchCenterLabelsByIds',
  async (centerIds = [], { rejectWithValue }) => {
    const ids = [
      ...new Set(
        (Array.isArray(centerIds) ? centerIds : []).map((id) => String(id).trim()).filter(Boolean),
      ),
    ];
    if (ids.length === 0) return {};

    const map = {};

    const mergeRows = (rows) => {
      Object.assign(map, mapCenterRowsToLabelById(rows));
    };

    const unresolved = () => ids.filter((id) => !map[id]);

    try {
      const formData = new FormData();
      formData.append('doctype', 'Center');
      formData.append('limit_page_length', String(Math.max(ids.length, 1)));
      formData.append('page', '1');
      formData.append('filters', JSON.stringify([['name', 'in', ids]]));

      const listResponse = await apiClient.post(
        '/method/devx.api.listview.list_with_search_filters',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      const listMsg = listResponse?.data?.message || listResponse?.data || {};
      const listRows = listMsg?.results || listMsg?.data || [];
      mergeRows(listRows);
    } catch {
      /* try fallbacks */
    }

    let missing = unresolved();
    if (missing.length > 0) {
      try {
        const resourceResponse = await apiClient.get('/resource/Center', {
          params: {
            fields: JSON.stringify(['name', 'center_name']),
            filters: JSON.stringify([['name', 'in', missing]]),
            limit_page_length: missing.length,
          },
        });
        mergeRows(resourceResponse?.data?.data || []);
      } catch {
        /* try per-center details */
      }
    }

    missing = unresolved();
    if (missing.length > 0) {
      await Promise.allSettled(
        missing.map(async (centerId) => {
          try {
            const detailResponse = await apiClient.post(
              '/method/devx.center_management.doctype.center.center.get_center_details',
              { center_id: centerId },
            );
            const data = detailResponse?.data?.message || detailResponse?.data || {};
            const key = String(data?.name ?? centerId).trim();
            const label = String(data?.center_name ?? '').trim();
            if (key && label) map[key] = label;
          } catch {
            /* skip */
          }
        }),
      );
    }

    return map;
  },
);

export const getEventCentersThunk = createAsyncThunk(
  'events/getEventCenters',
  async ({ page = 1, pageSize = 900 } = {}, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('doctype', 'Center');
      formData.append('limit_page_length', String(pageSize));
      formData.append('page', String(page));
      formData.append('order_by', 'creation desc');

      const response = await apiClient.post(
        '/method/devx.api.listview.list_with_search_filters',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      const msg = response?.data?.message || response?.data || {};
      const results = msg?.results || msg?.data || msg || [];
      return Array.isArray(results) ? results : [];
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const getEventClientsThunk = createAsyncThunk(
  'events/getEventClients',
  async ({ page = 1, pageSize = 900 } = {}, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('page', String(page));
      formData.append('limit_page_length', String(pageSize));
      formData.append('order_by', 'creation desc');
      formData.append('filters', '');

      const response = await apiClient.post(
        '/method/devx.overrides.client.client_list_view',
        formData,
      );

      const apiResponse = response?.data?.message || {};
      const rawResults = apiResponse?.results || [];

      const transformed = (Array.isArray(rawResults) ? rawResults : []).map((item) => ({
        name: item.customer_id || '',
        customer_name: item.client_name || '',
        custom_legal_name: item.client_name || '',
        // Same source as client list elsewhere (`center_names`); used to filter clients by selected centers in community events.
        center_refs: Array.isArray(item.center_names)
          ? item.center_names.map((x) => String(x).trim()).filter(Boolean)
          : item.center
            ? [String(item.center).trim()].filter(Boolean)
            : [],
      }));

      return transformed.filter((c) => c.name || c.customer_name);
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchEventColumnList = createAsyncThunk(
  'events/fetchEventColumnList',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: {
          doctype: EVENT_DOCTYPE,
        },
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const updateEventColumnList = createAsyncThunk(
  'events/updateEventColumnList',
  async (columns, thunkAPI) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: EVENT_DOCTYPE,
        columns,
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const createEventThunk = createAsyncThunk(
  'events/createEvent',
  async (eventData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.event_management.api.events.create_events',
        eventData,
      );
      const data = response?.data?.data ?? response?.data;
      return data ?? eventData;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/**
 * Persist partial updates for an Events document.
 * Backend: devx.event_management.api.events.update_events
 * Expected JSON body: { event_id: <Events doc name>, ...field patches }
 */
export const updateEventThunk = createAsyncThunk(
  'events/updateEvent',
  async ({ eventId, eventName, ...patch } = {}, { rejectWithValue }) => {
    const resolvedEventId = eventId || eventName;
    if (!resolvedEventId) return rejectWithValue('eventId required');
    if (!patch || typeof patch !== 'object' || Object.keys(patch).length === 0) {
      return rejectWithValue('patch required');
    }
    try {
      const response = await apiClient.put(
        `/resource/Events/${encodeURIComponent(resolvedEventId)}`,
        { event_id: resolvedEventId, ...patch },
      );
      return response?.data?.message ?? response?.data?.data ?? response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const getEventDetailThunk = createAsyncThunk(
  'events/getEventDetail',
  async ({ eventId } = {}, { rejectWithValue }) => {
    if (!eventId) return rejectWithValue('eventId required');
    try {
      const response = await apiClient.post(
        '/method/devx.event_management.api.events.get_event_details',
        { event: eventId },
      );
      const detailPayload =
        response?.data?.message?.data ??
        response?.data?.message ??
        response?.data?.data ??
        response?.data;
      return detailPayload;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

const mergeParticipantPctFromIncoming = (existingRow, incomingRow) => {
  if (!incomingRow) return existingRow;
  const next = {
    ...existingRow,
    participants_pct_value: incomingRow.participants_pct_value,
  };
  const incomingPctRaw = incomingRow?.raw?.participants_percentage;
  if (existingRow?.raw && typeof existingRow.raw === 'object') {
    next.raw = {
      ...existingRow.raw,
      ...(incomingPctRaw !== undefined && incomingPctRaw !== null
        ? { participants_percentage: incomingPctRaw }
        : {}),
    };
  }
  return next;
};

const buildIncomingParticipantsLookup = (payload) => {
  const map = new Map();
  const addRow = (row, groupCenter) => {
    map.set(participantRowKey(row, groupCenter), row);
  };
  const groups = Array.isArray(payload?.groups) ? payload.groups : [];
  groups.forEach((group) => {
    const groupCenter = String(group?.center ?? group?.id ?? '--');
    const participants = Array.isArray(group?.participants) ? group.participants : [];
    participants.forEach((row) => addRow(row, groupCenter));
  });
  const results = Array.isArray(payload?.results) ? payload.results : [];
  results.forEach((row) => addRow(row, PARTICIPANTS_FLAT_GROUP_CONTEXT));
  return map;
};

const mergeCommunityEventParticipantsSyncPayload = (state, payload) => {
  if (payload?.participantStats != null) {
    state.communityEventParticipants.participantStats = payload.participantStats;
  }
  const lookup = buildIncomingParticipantsLookup(payload);
  if (lookup.size === 0) return;

  const { communityEventParticipants } = state;
  if (Array.isArray(communityEventParticipants.results)) {
    communityEventParticipants.results = communityEventParticipants.results.map((row) =>
      mergeParticipantPctFromIncoming(
        row,
        lookup.get(participantRowKey(row, PARTICIPANTS_FLAT_GROUP_CONTEXT)),
      ),
    );
  }
  if (Array.isArray(communityEventParticipants.groups)) {
    communityEventParticipants.groups = communityEventParticipants.groups.map((group) => {
      const groupCenter = String(group?.center ?? group?.id ?? '--');
      const participants = Array.isArray(group?.participants) ? group.participants : [];
      return {
        ...group,
        participants: participants.map((row) =>
          mergeParticipantPctFromIncoming(row, lookup.get(participantRowKey(row, groupCenter))),
        ),
      };
    });
  }
};

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    setSelectedEventTask: (state, action) => {
      state.eventTasks.selectedTask = action.payload ?? null;
    },
    clearSelectedEventTask: (state) => {
      state.eventTasks.selectedTask = null;
    },
    clearEventTasksError: (state) => {
      state.eventTasks.error = null;
    },
    /** Replace assignees on a list/group row immediately (inline picker, no refetch). */
    setEventTaskAssignees: (state, action) => {
      const { taskId, assignees } = action.payload ?? {};
      if (!taskId) return;
      replaceEventTaskAssigneesInState(state, taskId, assignees);
    },
    /** Inline participant edits — patch list state without refetching (ticket table pattern). */
    patchCommunityEventParticipantFields: (state, action) => {
      const { participantKey, expected_seats, remarks } = action.payload ?? {};
      if (!participantKey) return;

      const patchOne = (row, groupCenter) => {
        if (participantRowKey(row, groupCenter) !== participantKey) return row;
        const expectedNorm = normalizeParticipantSeatNumber(
          expected_seats == null ? '' : expected_seats,
        );
        const next = {
          ...row,
          expected_seats: expectedNorm,
          expected_seats_user_set: expected_seats == null ? 0 : 1,
          remarks: remarks ?? '',
        };
        if (row?.raw && typeof row.raw === 'object') {
          next.raw = {
            ...row.raw,
            expected_seats: expected_seats == null ? null : expected_seats,
            expected_seats_user_set: expected_seats == null ? 0 : 1,
            remarks: remarks ?? '',
          };
        }
        return next;
      };

      const { communityEventParticipants } = state;
      if (Array.isArray(communityEventParticipants.results)) {
        communityEventParticipants.results = communityEventParticipants.results.map((row) =>
          patchOne(row, PARTICIPANTS_FLAT_GROUP_CONTEXT),
        );
      }
      if (Array.isArray(communityEventParticipants.groups)) {
        communityEventParticipants.groups = communityEventParticipants.groups.map((group) => {
          const groupCenter = String(group?.center ?? group?.id ?? '--');
          const participants = Array.isArray(group?.participants) ? group.participants : [];
          return {
            ...group,
            participants: participants.map((row) => patchOne(row, groupCenter)),
          };
        });
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getPartnersResourceThunk.pending, (state) => {
        state.partner.isLoading = true;
        state.partner.isError = false;
      })
      .addCase(getPartnersResourceThunk.fulfilled, (state, action) => {
        state.partner.isLoading = false;
        state.partner.isError = false;
        state.partner.hasFetched = true;
        state.partner.data = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(getPartnersResourceThunk.rejected, (state) => {
        state.partner.isLoading = false;
        state.partner.isError = true;
        state.partner.hasFetched = true;
        state.partner.data = [];
      });

    builder
      .addCase(getEventTypeListThunk.pending, (state, action) => {
        state.eventsListViewLoading = true;
        state.eventsListViewError = null;
        const isAppend = Boolean(action.meta?.arg?.append);
        const arg = action.meta?.arg && typeof action.meta.arg === 'object' ? action.meta.arg : {};
        if (!isAppend) {
          state.eventsListView.results = [];
          state.eventsListView.has_more = false;
          state.eventsListView.page = 1;
          const nextId = Number(arg.list_fetch_id);
          if (Number.isFinite(nextId) && nextId > 0) {
            state.eventsListView.list_fetch_id = nextId;
          }
        }
      })
      .addCase(getEventTypeListThunk.fulfilled, (state, action) => {
        const isAppend = Boolean(action.meta?.arg?.append);
        const req = action.meta?.arg && typeof action.meta.arg === 'object' ? action.meta.arg : {};
        const msg = action.payload;
        const argFetchId = Number(req.list_fetch_id) || 0;
        const currentFetchId = Number(state.eventsListView.list_fetch_id) || 0;
        if (isAppend && argFetchId > 0 && currentFetchId > 0 && argFetchId !== currentFetchId) {
          state.eventsListViewLoading = false;
          return;
        }
        let incomingResults = [];
        if (msg && typeof msg === 'object' && Array.isArray(msg.data)) {
          incomingResults = msg.data;
        } else if (msg && typeof msg === 'object' && Array.isArray(msg.results)) {
          incomingResults = msg.results;
        } else if (Array.isArray(msg)) {
          incomingResults = msg;
        }
        const incomingColumns =
          msg && typeof msg === 'object' && Array.isArray(msg.columns) ? msg.columns : [];

        const currentView = state.eventsListView || initialState.eventsListView;
        const existingResults = Array.isArray(currentView.results) ? currentView.results : [];

        const mergedResults = isAppend ? [...existingResults, ...incomingResults] : incomingResults;

        let apiPage = 1;
        if (msg && typeof msg === 'object' && msg.page != null) {
          apiPage = Number(msg.page);
        } else if (req.page != null) {
          apiPage = Number(req.page);
        } else if (isAppend) {
          apiPage = Number(currentView.page) || 1;
        }

        let apiPageSize = Number(currentView.page_size) || 20;
        if (msg && typeof msg === 'object' && msg.page_size != null) {
          apiPageSize = Number(msg.page_size);
        } else if (req.page_size != null) {
          apiPageSize = Number(req.page_size);
        }

        let totalCount = Number(currentView.total_count) || 0;
        if (msg && typeof msg === 'object' && msg.total_count != null) {
          totalCount = Number(msg.total_count);
        }

        let totalPages = Number(currentView.total_pages) || 0;
        if (msg && typeof msg === 'object' && msg.total_pages != null) {
          totalPages = Number(msg.total_pages);
        }
        const countThisPage =
          msg && typeof msg === 'object' && msg.count != null
            ? Number(msg.count)
            : incomingResults.length;

        let hasMore = false;
        if (msg && typeof msg === 'object' && msg.has_more != null) {
          hasMore = Boolean(msg.has_more);
        } else if (totalPages > 0) {
          hasMore = apiPage < totalPages;
        } else if (totalCount > 0) {
          hasMore = mergedResults.length < totalCount;
        } else {
          hasMore = incomingResults.length >= apiPageSize;
        }

        state.eventsListView = {
          ...currentView,
          results: mergedResults,
          summary:
            msg && typeof msg === 'object' && msg.summary != null
              ? msg.summary
              : currentView.summary,
          columns: incomingColumns.length > 0 ? incomingColumns : currentView.columns,
          keyword:
            msg && typeof msg === 'object' && msg.keyword != null
              ? msg.keyword
              : currentView.keyword,
          page: apiPage,
          page_size: apiPageSize,
          count: countThisPage,
          total_count: totalCount,
          total_pages: totalPages,
          has_more: hasMore,
        };
        // Stats / tab counts come from `getEventStatusCountsThunk` only — strip legacy list payload fields
        delete state.eventsListView.status_counts;
        delete state.eventsListView.total_events;
        delete state.eventsListView.upcoming_events;
        delete state.eventsListView.completed_events;
        delete state.eventsListView.executed_events;
        delete state.eventsListView.approved_by_ho;
        delete state.eventsListView.total_seat_capacity;
        delete state.eventsListView.total_registrations;
        state.eventsListViewLoading = false;
        state.eventsListViewError = null;
      })
      .addCase(getEventTypeListThunk.rejected, (state, action) => {
        const wasAppend = Boolean(action.meta?.arg?.append);
        state.eventsListView = {
          ...state.eventsListView,
          results: wasAppend ? state.eventsListView.results : [],
          columns: wasAppend ? state.eventsListView.columns : [],
          has_more: wasAppend ? state.eventsListView.has_more : false,
        };
        state.eventsListViewLoading = false;
        state.eventsListViewError =
          action.error?.message ?? action.payload?.message ?? 'Failed to load events list';
      });

    builder
      .addCase(fetchEventColumnList.pending, (state) => {
        state.columnPreferences.isLoading = true;
        state.columnPreferences.error = null;
      })
      .addCase(fetchEventColumnList.fulfilled, (state, action) => {
        state.columnPreferences.isLoading = false;
        state.columnPreferences.data = action.payload;
      })
      .addCase(fetchEventColumnList.rejected, (state, action) => {
        state.columnPreferences.isLoading = false;
        state.columnPreferences.error = action.payload || action.error?.message;
      })
      .addCase(updateEventColumnList.pending, (state) => {
        state.columnPreferences.isLoading = true;
        state.columnPreferences.error = null;
      })
      .addCase(updateEventColumnList.fulfilled, (state) => {
        state.columnPreferences.isLoading = false;
      })
      .addCase(updateEventColumnList.rejected, (state, action) => {
        state.columnPreferences.isLoading = false;
        state.columnPreferences.error = action.payload || action.error?.message;
      });

    builder
      .addCase(getEventTaskListThunk.pending, (state, action) => {
        const append = Boolean(action.meta?.arg?.append);
        if (append) state.eventTasks.isLoadingMore = true;
        else state.eventTasks.isLoading = true;
        state.eventTasks.error = null;
        state.eventTasks.eventName = action.meta?.arg?.event || state.eventTasks.eventName || '';
      })
      .addCase(getEventTaskListThunk.fulfilled, (state, action) => {
        state.eventTasks.isLoading = false;
        state.eventTasks.isLoadingMore = false;
        state.eventTasks.error = null;
        state.eventTasks.listKind =
          action.payload?.listKind || state.eventTasks.listKind || 'document_task';
        state.eventTasks.eventName = action.payload?.eventName || state.eventTasks.eventName || '';
        const append = Boolean(action.payload?.append);
        const incoming = Array.isArray(action.payload?.results) ? action.payload.results : [];
        state.eventTasks.results = append ? [...state.eventTasks.results, ...incoming] : incoming;
        const incomingGroups = Array.isArray(action.payload?.taskGroups)
          ? action.payload.taskGroups
          : [];
        state.eventTasks.taskGroups = append
          ? [...state.eventTasks.taskGroups, ...incomingGroups]
          : incomingGroups;
        state.eventTasks.taskListSummary =
          action.payload?.taskListSummary && typeof action.payload.taskListSummary === 'object'
            ? action.payload.taskListSummary
            : null;
        state.eventTasks.page = Number(action.payload?.page ?? 1) || 1;
        state.eventTasks.page_size = Number(action.payload?.page_size ?? 5) || 5;
        state.eventTasks.total_pages = Number(action.payload?.total_pages ?? 0) || 0;
        state.eventTasks.total_count = Number(action.payload?.total_count ?? 0) || 0;
        state.eventTasks.has_more = Boolean(action.payload?.has_more);
      })
      .addCase(getEventTaskListThunk.rejected, (state, action) => {
        state.eventTasks.isLoading = false;
        state.eventTasks.isLoadingMore = false;
        state.eventTasks.error =
          action.error?.message ?? action.payload?.message ?? 'Failed to load event tasks';
        const wasAppend = Boolean(action.meta?.arg?.append);
        state.eventTasks.results = wasAppend ? state.eventTasks.results : [];
        if (!wasAppend) {
          state.eventTasks.taskGroups = [];
          state.eventTasks.taskListSummary = null;
        }
      });

    builder
      .addCase(getEventTaskMasterListThunk.pending, (state, action) => {
        const append = Boolean(action.meta?.arg?.append);
        if (append) state.eventTasks.isLoadingMore = true;
        else state.eventTasks.isLoading = true;
        state.eventTasks.error = null;
        state.eventTasks.eventName = action.meta?.arg?.event || state.eventTasks.eventName || '';
      })
      .addCase(getEventTaskMasterListThunk.fulfilled, (state, action) => {
        state.eventTasks.isLoading = false;
        state.eventTasks.isLoadingMore = false;
        state.eventTasks.error = null;
        state.eventTasks.listKind =
          action.payload?.listKind || state.eventTasks.listKind || 'task_master';
        state.eventTasks.eventName = action.payload?.eventName || state.eventTasks.eventName || '';
        const append = Boolean(action.payload?.append);
        const incoming = Array.isArray(action.payload?.results) ? action.payload.results : [];
        state.eventTasks.results = append ? [...state.eventTasks.results, ...incoming] : incoming;
        state.eventTasks.taskGroups = [];
        state.eventTasks.taskListSummary = null;
        state.eventTasks.page = Number(action.payload?.page ?? 1) || 1;
        state.eventTasks.page_size = Number(action.payload?.page_size ?? 20) || 20;
        state.eventTasks.total_pages = Number(action.payload?.total_pages ?? 0) || 0;
        state.eventTasks.total_count = Number(action.payload?.total_count ?? 0) || 0;
        state.eventTasks.has_more = Boolean(action.payload?.has_more);
      })
      .addCase(getEventTaskMasterListThunk.rejected, (state, action) => {
        state.eventTasks.isLoading = false;
        state.eventTasks.isLoadingMore = false;
        state.eventTasks.error =
          action.error?.message ?? action.payload?.message ?? 'Failed to load event task masters';
        const wasAppend = Boolean(action.meta?.arg?.append);
        state.eventTasks.results = wasAppend ? state.eventTasks.results : [];
      });

    builder
      .addCase(syncCommunityEventParticipantsAfterInlineEdit.fulfilled, (state, action) => {
        mergeCommunityEventParticipantsSyncPayload(state, action.payload);
      })
      .addCase(getCommunityEventParticipantsThunk.pending, (state, action) => {
        const append = Boolean(action.meta?.arg?.append);
        if (append) {
          state.communityEventParticipants.isLoadingMore = true;
        } else {
          state.communityEventParticipants.isLoading = true;
        }
        state.communityEventParticipants.error = null;
        state.communityEventParticipants.eventName =
          action.meta?.arg?.event || state.communityEventParticipants.eventName || '';
      })
      .addCase(getCommunityEventParticipantsThunk.fulfilled, (state, action) => {
        state.communityEventParticipants.isLoading = false;
        state.communityEventParticipants.isLoadingMore = false;
        state.communityEventParticipants.error = null;
        state.communityEventParticipants.eventName =
          action.payload?.eventName || state.communityEventParticipants.eventName || '';
        state.communityEventParticipants.results = Array.isArray(action.payload?.results)
          ? action.payload.results
          : [];
        state.communityEventParticipants.groups = Array.isArray(action.payload?.groups)
          ? action.payload.groups
          : [];
        state.communityEventParticipants.summary =
          action.payload?.summary && typeof action.payload.summary === 'object'
            ? action.payload.summary
            : null;
        if (action.payload?.participantStats != null) {
          state.communityEventParticipants.participantStats = action.payload.participantStats;
        } else if (!action.payload?.append) {
          state.communityEventParticipants.participantStats = null;
        }
        state.communityEventParticipants.page = Number(action.payload?.page ?? 1) || 1;
        state.communityEventParticipants.page_size = Number(action.payload?.page_size ?? 20) || 20;
        state.communityEventParticipants.total_pages =
          Number(action.payload?.total_pages ?? 0) || 0;
        state.communityEventParticipants.total_count =
          Number(action.payload?.total_count ?? 0) || 0;
        state.communityEventParticipants.has_more = Boolean(action.payload?.has_more);
      })
      .addCase(getCommunityEventParticipantsThunk.rejected, (state, action) => {
        const wasAppend = Boolean(action.meta?.arg?.append);
        state.communityEventParticipants.isLoading = false;
        state.communityEventParticipants.isLoadingMore = false;
        state.communityEventParticipants.error =
          action.error?.message ?? action.payload?.message ?? 'Failed to load participants';
        if (!wasAppend) {
          state.communityEventParticipants.results = [];
          state.communityEventParticipants.groups = [];
          state.communityEventParticipants.summary = null;
          state.communityEventParticipants.participantStats = null;
          state.communityEventParticipants.page = 1;
          state.communityEventParticipants.total_pages = 0;
          state.communityEventParticipants.total_count = 0;
          state.communityEventParticipants.has_more = false;
        }
      });

    builder
      .addCase(createEventTaskThunk.pending, (state) => {
        state.eventTasks.create.isLoading = true;
        state.eventTasks.create.error = null;
      })
      .addCase(createEventTaskThunk.fulfilled, (state) => {
        state.eventTasks.create.isLoading = false;
        state.eventTasks.create.error = null;
      })
      .addCase(createEventTaskThunk.rejected, (state, action) => {
        state.eventTasks.create.isLoading = false;
        state.eventTasks.create.error =
          action.error?.message ?? action.payload?.message ?? 'Failed to create event task';
      });

    builder
      .addCase(createEventTaskMasterThunk.pending, (state) => {
        state.eventTasks.createMaster.isLoading = true;
        state.eventTasks.createMaster.error = null;
      })
      .addCase(createEventTaskMasterThunk.fulfilled, (state) => {
        state.eventTasks.createMaster.isLoading = false;
        state.eventTasks.createMaster.error = null;
      })
      .addCase(createEventTaskMasterThunk.rejected, (state, action) => {
        state.eventTasks.createMaster.isLoading = false;
        state.eventTasks.createMaster.error =
          action.error?.message ?? action.payload?.message ?? 'Failed to create task master';
      });

    builder
      .addCase(getEventTaskDetailedViewThunk.pending, (state) => {
        state.eventTasks.detail.isLoading = true;
        state.eventTasks.detail.error = null;
      })
      .addCase(getEventTaskDetailedViewThunk.fulfilled, (state, action) => {
        state.eventTasks.detail.isLoading = false;
        state.eventTasks.detail.error = null;
        state.eventTasks.selectedTask = action.payload ?? state.eventTasks.selectedTask;
      })
      .addCase(getEventTaskDetailedViewThunk.rejected, (state, action) => {
        state.eventTasks.detail.isLoading = false;
        state.eventTasks.detail.error =
          action.error?.message ?? action.payload?.message ?? 'Failed to load task detail';
      });

    builder
      .addCase(updateEventTaskThunk.pending, (state) => {
        state.eventTasks.update.isLoading = true;
        state.eventTasks.update.error = null;
      })
      .addCase(updateEventTaskThunk.fulfilled, (state, action) => {
        state.eventTasks.update.isLoading = false;
        state.eventTasks.update.error = null;
        // Do not merge API response — update_ref_doc_task returns { status: 200, message } envelopes.
        const patchFromRequest =
          action.meta?.arg && typeof action.meta.arg === 'object' ? action.meta.arg : {};
        const taskId =
          patchFromRequest.task_id || patchFromRequest.name || patchFromRequest.id || null;
        const { task_id: _tid, name: _name, id: _id, ...taskPatch } = patchFromRequest;

        if (taskId && Object.keys(taskPatch).length > 0) {
          patchEventTaskRowEverywhere(state, taskId, taskPatch);
        }
      })
      .addCase(updateEventTaskThunk.rejected, (state, action) => {
        state.eventTasks.update.isLoading = false;
        state.eventTasks.update.error =
          action.error?.message ?? action.payload?.message ?? 'Failed to update event task';
      });

    // --- Assignee add/remove (assignment APIs) ---
    const updateEventTaskAssigneesInState = (state, taskId, updater) => {
      if (!taskId) return;

      const row = findEventTaskRow(state, taskId);
      const selected = selectedEventTaskMatchesId(state.eventTasks.selectedTask, taskId)
        ? state.eventTasks.selectedTask
        : null;
      if (!row && !selected) return;

      const rawRow = row?.raw || row || {};
      const current = Array.isArray(rawRow?.assignees)
        ? rawRow.assignees
        : Array.isArray(rawRow?.assigned_to)
          ? rawRow.assigned_to
          : Array.isArray(selected?.assignees)
            ? selected.assignees
            : Array.isArray(selected?.assigned_to)
              ? selected.assigned_to
              : [];
      const next = updater(current);
      replaceEventTaskAssigneesInState(state, taskId, next);
    };

    builder
      .addCase(assignEventTask.fulfilled, (state, action) => {
        const arg = action.meta?.arg && typeof action.meta.arg === 'object' ? action.meta.arg : {};
        const taskId = arg.name || null;
        const addListRaw = Array.isArray(arg.assign_to)
          ? arg.assign_to
          : [arg.assign_to].filter(Boolean);
        const addList = addListRaw.map((a) => normalizeAssigneeId(a)).filter(Boolean);

        updateEventTaskAssigneesInState(state, taskId, (current) => {
          const seen = new Set(
            (Array.isArray(current) ? current : [])
              .map((entry) => normalizeAssigneeId(entry).toLowerCase())
              .filter(Boolean),
          );
          const merged = [...(Array.isArray(current) ? current : [])];
          addList.forEach((a) => {
            const key = String(a).toLowerCase();
            if (!key || seen.has(key)) return;
            seen.add(key);
            merged.push(a);
          });
          return merged;
        });
      })
      .addCase(removeEventTaskAssignments.fulfilled, (state, action) => {
        const arg = action.meta?.arg && typeof action.meta.arg === 'object' ? action.meta.arg : {};
        const taskId = arg.name || null;
        const removeRaw = Array.isArray(arg.assignees)
          ? arg.assignees
          : [arg.assignees].filter(Boolean);
        const removeSet = new Set(
          removeRaw.map((a) => normalizeAssigneeId(a).toLowerCase()).filter(Boolean),
        );

        updateEventTaskAssigneesInState(state, taskId, (current) =>
          (Array.isArray(current) ? current : []).filter(
            (a) => !removeSet.has(normalizeAssigneeId(a).toLowerCase()),
          ),
        );
      });

    builder
      .addCase(getEventCentersThunk.pending, (state) => {
        state.eventMeta.centers.isLoading = true;
        state.eventMeta.centers.error = null;
      })
      .addCase(getEventCentersThunk.fulfilled, (state, action) => {
        state.eventMeta.centers.isLoading = false;
        state.eventMeta.centers.error = null;
        state.eventMeta.centers.results = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(getEventCentersThunk.rejected, (state, action) => {
        state.eventMeta.centers.isLoading = false;
        state.eventMeta.centers.error =
          action.error?.message ?? action.payload?.message ?? 'Failed to load centers';
        state.eventMeta.centers.results = [];
      })
      // Sync event center option labels when a center is renamed.
      .addCase(updateCenterThunk.fulfilled, (state, action) => {
        const centerLabelSync = getCenterLabelSyncFromUpdateAction(action);
        if (!centerLabelSync || centerLabelSync.updatedCenterName == null) return;
        if (!Array.isArray(state.eventMeta?.centers?.results)) return;

        state.eventMeta.centers.results = mapCenterOptionsWithLabelSync(
          state.eventMeta.centers.results,
          centerLabelSync,
          { setLabel: false },
        );
      });

    builder
      .addCase(getEventClientsThunk.pending, (state) => {
        state.eventMeta.clients.isLoading = true;
        state.eventMeta.clients.error = null;
      })
      .addCase(getEventClientsThunk.fulfilled, (state, action) => {
        state.eventMeta.clients.isLoading = false;
        state.eventMeta.clients.error = null;
        state.eventMeta.clients.results = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(getEventClientsThunk.rejected, (state, action) => {
        state.eventMeta.clients.isLoading = false;
        state.eventMeta.clients.error =
          action.error?.message ?? action.payload?.message ?? 'Failed to load clients';
        state.eventMeta.clients.results = [];
      });

    builder
      .addCase(updateEventThunk.pending, (state) => {
        state.eventDetail.isUpdating = true;
        state.eventDetail.error = null;
      })
      .addCase(updateEventThunk.fulfilled, (state) => {
        state.eventDetail.isUpdating = false;
        state.eventDetail.error = null;
      })
      .addCase(updateEventThunk.rejected, (state, action) => {
        state.eventDetail.isUpdating = false;
        state.eventDetail.error =
          action.error?.message ?? action.payload?.message ?? 'Failed to update event';
      });

    builder
      .addCase(fetchEventActivitiesThunk.pending, (state, action) => {
        state.eventActivities.isLoading = true;
        state.eventActivities.error = null;
        state.eventActivities.lastRequest = {
          event: action.meta?.arg?.event || '',
          activityFilter: action.meta?.arg?.activityFilter || 'all',
          timeFrame: action.meta?.arg?.timeFrame || 'all',
        };
      })
      .addCase(fetchEventActivitiesThunk.fulfilled, (state, action) => {
        state.eventActivities.isLoading = false;
        state.eventActivities.error = null;
        state.eventActivities.data = action.payload ?? null;
      })
      .addCase(fetchEventActivitiesThunk.rejected, (state, action) => {
        state.eventActivities.isLoading = false;
        state.eventActivities.error =
          action.error?.message ?? action.payload?.message ?? 'Failed to load activities';
        state.eventActivities.data = null;
      });

    builder
      .addCase(getEventStatusCountsThunk.pending, (state) => {
        state.eventStatusCounts.isLoading = true;
        state.eventStatusCounts.error = null;
      })
      .addCase(getEventStatusCountsThunk.fulfilled, (state, action) => {
        const message = action.payload && typeof action.payload === 'object' ? action.payload : {};
        const argType = action.meta?.arg?.event_type ?? '';
        const sc =
          message.status_counts && typeof message.status_counts === 'object'
            ? message.status_counts
            : {};
        const toCount = (value) => {
          if (value == null || value === '') return 0;
          const n = Number(value);
          return Number.isFinite(n) ? n : 0;
        };
        let approvedByHo = toCount(message.approved_by_ho);
        if (approvedByHo === 0 && message.approved_by_hod != null) {
          approvedByHo = toCount(message.approved_by_hod);
        }
        state.eventStatusCounts = {
          event_type: argType,
          status_counts: sc,
          total_events: toCount(message.total_events),
          upcoming_events: toCount(message.upcoming_events),
          executed_events: toCount(message.executed_events),
          completed_events: toCount(message.completed_events),
          total_seat_capacity: toCount(message.total_seat_capacity),
          total_registrations: toCount(message.total_registrations),
          approved_by_ho: approvedByHo,
          isLoading: false,
          error: null,
        };
      })
      .addCase(getEventStatusCountsThunk.rejected, (state, action) => {
        state.eventStatusCounts.isLoading = false;
        state.eventStatusCounts.error =
          action.error?.message ?? action.payload?.message ?? 'Failed to load event status counts';
      });

    builder
      .addCase(fetchEventTaskAssigneesByRolesThunk.pending, (state) => {
        state.eventTaskAssignees.status = 'loading';
        state.eventTaskAssignees.error = null;
      })
      .addCase(fetchEventTaskAssigneesByRolesThunk.fulfilled, (state, action) => {
        state.eventTaskAssignees.status = 'succeeded';
        state.eventTaskAssignees.users = action.payload?.users || [];
        state.eventTaskAssignees.groups = action.payload?.groups || [];
        state.eventTaskAssignees.roles = action.payload?.roles || EVENT_TASK_ASSIGNEE_ROLE_OPTIONS;
        state.eventTaskAssignees.error = null;
      })
      .addCase(fetchEventTaskAssigneesByRolesThunk.rejected, (state, action) => {
        state.eventTaskAssignees.status = 'failed';
        state.eventTaskAssignees.users = [];
        state.eventTaskAssignees.groups = [];
        state.eventTaskAssignees.roles = EVENT_TASK_ASSIGNEE_ROLE_OPTIONS;
        state.eventTaskAssignees.error =
          action.payload?.message ?? action.error?.message ?? 'Failed to load assignees';
      });
  },
});

export const {
  setSelectedEventTask,
  setEventTaskAssignees,
  clearSelectedEventTask,
  clearEventTasksError,
  patchCommunityEventParticipantFields,
} = eventsSlice.actions;

export const selectEventsListView = (state) =>
  state.events?.eventsListView ?? initialState.eventsListView;

export const selectEventsListViewLoading = (state) => Boolean(state.events?.eventsListViewLoading);

export const selectEventsListViewError = (state) => state.events?.eventsListViewError ?? null;

export const selectPartnersResource = (state) => state.events?.partner?.data ?? [];
export const selectPartnersResourceLoading = (state) => Boolean(state.events?.partner?.isLoading);
export const selectPartnersResourceIsError = (state) => Boolean(state.events?.partner?.isError);
export const selectPartnersResourceHasFetched = (state) =>
  Boolean(state.events?.partner?.hasFetched);

export const selectEventTasks = (state) => state.events?.eventTasks ?? initialState.eventTasks;
export const selectEventTasksLoading = (state) => Boolean(state.events?.eventTasks?.isLoading);
export const selectEventTasksError = (state) => state.events?.eventTasks?.error ?? null;
export const selectEventTasksListKind = (state) =>
  state.events?.eventTasks?.listKind ?? initialState.eventTasks.listKind;
export const selectEventTaskGroups = (state) =>
  state.events?.eventTasks?.taskGroups ?? initialState.eventTasks.taskGroups;
export const selectEventTaskListSummary = (state) =>
  state.events?.eventTasks?.taskListSummary ?? null;
export const selectEventTaskMasterCreateLoading = (state) =>
  Boolean(state.events?.eventTasks?.createMaster?.isLoading);
export const selectSelectedEventTask = (state) => state.events?.eventTasks?.selectedTask ?? null;

export const selectEventCenters = (state) =>
  state.events?.eventMeta?.centers?.results ?? initialState.eventMeta.centers.results;
export const selectEventClients = (state) =>
  state.events?.eventMeta?.clients?.results ?? initialState.eventMeta.clients.results;

export const selectEventDetailUpdating = (state) => Boolean(state.events?.eventDetail?.isUpdating);
export const selectEventDetailError = (state) => state.events?.eventDetail?.error ?? null;

export const selectEventActivities = (state) =>
  state.events?.eventActivities ?? initialState.eventActivities;

export const selectEventStatusCounts = (state) =>
  state.events?.eventStatusCounts ?? initialState.eventStatusCounts;

export const selectEventStatusCountsLoading = (state) =>
  Boolean(state.events?.eventStatusCounts?.isLoading);

export const selectEventTaskAssignees = (state) =>
  state.events?.eventTaskAssignees ?? initialState.eventTaskAssignees;

export const selectCommunityEventParticipants = (state) =>
  state.events?.communityEventParticipants ?? initialState.communityEventParticipants;
export const selectCommunityEventParticipantsLoading = (state) =>
  Boolean(state.events?.communityEventParticipants?.isLoading);
export const selectCommunityEventParticipantsLoadingMore = (state) =>
  Boolean(state.events?.communityEventParticipants?.isLoadingMore);
export const selectCommunityEventParticipantsError = (state) =>
  state.events?.communityEventParticipants?.error ?? null;
export const selectCommunityEventParticipantsHasMore = (state) =>
  Boolean(state.events?.communityEventParticipants?.has_more);

export default eventsSlice.reducer;
