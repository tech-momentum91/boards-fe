import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import { getZonesFromMember } from '@/components/team-management/constants';

const serializeError = (error) => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  return error?.message || 'Something went wrong while fetching team members';
};

/** Build FormData for create/update when payload contains a File (image). JSON cannot send File. */
const buildTeamMemberFormData = (payload) => {
  const form = new FormData();
  if (payload.first_name != null) form.append('first_name', payload.first_name);
  if (payload.last_name != null) form.append('last_name', payload.last_name);
  if (payload.email != null) form.append('email', payload.email);
  if (payload.role != null) form.append('role', payload.role);
  if (payload.status != null) form.append('status', payload.status);
  if (payload.centers != null) {
    form.append(
      'centers',
      Array.isArray(payload.centers) ? JSON.stringify(payload.centers) : payload.centers,
    );
  }
  if (payload.center_zone != null) form.append('center_zone', payload.center_zone);
  if (payload.image instanceof File) {
    form.append('image', payload.image);
  }
  if (payload.team_type != null) form.append('team_type', payload.team_type);
  if (payload.team_member_id != null) form.append('team_member_id', payload.team_member_id);
  if (payload.name != null) form.append('name', payload.name);
  if (payload.cell_number != null) form.append('cell_number', payload.cell_number);
  if (payload.aadhaar_number != null) form.append('aadhaar_number', payload.aadhaar_number);
  return form;
};

const initialState = {
  addTeamMemberModal: {
    isOpen: false,
    isLoading: false,
    error: null,
    status: null,
    source: null, // 'centers' | 'core' | 'support' – where the modal was opened from
  },

  editTeamMemberModal: {
    isOpen: false,
    isLoading: false,
    error: null,
    status: null,
  },

  deleteTeamMemberModal: {
    isOpen: false,
    isLoading: false,
    error: null,
    status: null,
  },

  rolesWithType: {
    data: [],
    status: null,
    isLoading: false,
    error: null,
  },

  teamUserDetailModal: {
    isOpen: false,
    isLoading: false,
    error: null,
    status: null,
  },

  teamManagementData: {
    data: [],
    isLoading: false,
    isLoadingMore: false,
    status: null,
    error: null,
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
    hasMore: false,
  },

  coreTeamData: {
    data: [],
    isLoading: false,
    isLoadingMore: false,
    status: null,
    error: null,
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
    hasMore: false,
  },

  supportTeamData: {
    data: [],
    isLoading: false,
    isLoadingMore: false,
    status: null,
    error: null,
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
    hasMore: false,
  },

  /** Last params used for fetchSupportTeamData (filters include from_date, to_date). Used when refetching after add/edit. */
  supportTeamLastParams: {
    filters: [],
    month: null,
    year: null,
    from_date: null,
    to_date: null,
    // navbar_filter: null,
  },

  teamManagementTabCounts: {
    data: [],
  },

  roleStats: {
    data: [],
  },

  teamMemberDetail: {
    data: [],
    isLoading: false,
    error: null,
    status: null,
  },

  coreTeamColumnPreferences: {
    data: [],
    isLoading: false,
    error: null,
  },
};

export const createTeamMemberThunk = createAsyncThunk(
  'teamManagement/createTeamMember',
  async (payload, { rejectWithValue }) => {
    try {
      const enrichedPayload = {
        ...payload,
        status: 'Active',
      };
      const body =
        enrichedPayload.image instanceof File
          ? buildTeamMemberFormData(enrichedPayload)
          : enrichedPayload;
      const response = await apiClient.post(
        '/method/devx.team_management.api.team_member.create_team_member',
        body,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchRolesWithType = createAsyncThunk(
  'teamManagement/fetchRolesWithType',
  async (payload, { rejectWithValue }) => {
    try {
      // Centers: no payload. Core/support team modals: { group: 'core' | 'support' }.
      // Settings → Users: All Users → no params; Core Team → core; Others tab → others.
      const params =
        payload &&
        (payload.group === 'core' ||
          payload.group === 'support' ||
          payload.group === 'external' ||
          payload.group === 'others')
          ? { group: payload.group }
          : {};
      const response = await apiClient.get('/method/devx.api.user.get_roles_with_type', {
        params,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

const fetchTeamListPayload = {
  order_by: 'creation desc',
};

const PAGE_SIZE = 20;

/** Values that are arrays — ignores non-array keys (counts, metadata) on grouped payloads. */
const pickGroupMapFromObject = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
};

const tryCoerceApiGroupedShape = (raw) => {
  const direct = pickGroupMapFromObject(raw);
  if (direct) return direct;

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  if (Array.isArray(raw.groups)) {
    const out = {};
    for (const g of raw.groups) {
      const label = g.group_label ?? g.group ?? g.center_name ?? g.label ?? g.name ?? '—';
      const items = g.items ?? g.members ?? g.results ?? g.rows ?? [];
      if (Array.isArray(items)) out[label] = items;
    }
    return Object.keys(out).length > 0 ? out : null;
  }

  if (raw.grouped && typeof raw.grouped === 'object' && !Array.isArray(raw.grouped)) {
    return tryCoerceApiGroupedShape(raw.grouped);
  }

  return null;
};

const getCenterLabelsFromMember = (member) => {
  if (Array.isArray(member?.centers) && member.centers.length > 0) {
    return member.centers
      .map((c) => (typeof c === 'string' ? c.trim() : (c?.name || c?.center_name || '').trim()))
      .filter(Boolean);
  }
  if (Array.isArray(member?.center_names)) {
    return member.center_names.map((n) => String(n).trim()).filter(Boolean);
  }
  if (typeof member?.center_name === 'string' && member.center_name.trim()) {
    return [member.center_name.trim()];
  }
  return [];
};

const groupFlatCoreTeamByCenter = (members) => {
  const out = {};
  for (const m of members) {
    const labels = getCenterLabelsFromMember(m);
    const targets = labels.length > 0 ? labels : ['No center'];
    for (const label of targets) {
      if (!out[label]) out[label] = [];
      out[label].push({ ...m, center_name: label });
    }
  }
  return out;
};

const groupFlatCoreTeamByZone = (members) => {
  const out = {};
  for (const m of members) {
    const labels = getZonesFromMember(m);
    const targets = labels.length > 0 ? labels : ['No zone'];
    for (const label of targets) {
      if (!out[label]) out[label] = [];
      out[label].push({ ...m, zone: label });
    }
  }
  return out;
};

const groupFlatCoreTeamByField = (members, field) => {
  const out = {};
  for (const m of members) {
    const raw = m?.[field];
    const key = raw != null && String(raw).trim() !== '' ? String(raw) : '—';
    if (!out[key]) out[key] = [];
    out[key].push(m);
  }
  return out;
};

/** Backend may bucket multi-center rows under a null-ish key when grouping by center_name. */
const PLACEHOLDER_CENTER_GROUP_KEYS = new Set(['null', 'undefined', 'none', '']);

const isPlaceholderCenterGroupKey = (k) => {
  const s = String(k).trim().toLowerCase();
  return PLACEHOLDER_CENTER_GROUP_KEYS.has(s);
};

const flattenGroupMapDeduped = (coerced) => {
  const members = Object.values(coerced).flat().filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const m of members) {
    const id = m?.team_member_id ?? m?.email;
    const dedupeKey = id != null ? String(id) : JSON.stringify(m);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push(m);
  }
  return out;
};

const shouldRegroupCenterPlaceholderMap = (coerced, groupByUi) => {
  if (String(groupByUi).toLowerCase() !== 'center') return false;
  const keys = Object.keys(coerced);
  if (keys.length === 0) return false;
  if (!keys.every((k) => isPlaceholderCenterGroupKey(k))) return false;
  return keys.some((k) => Array.isArray(coerced[k]) && coerced[k].length > 0);
};

/**
 * Core team listview: backend may return a flat list when members have multiple centers.
 * Normalize to either a flat array or a record of group key → rows for the grouped UI.
 */
const normalizeCoreTeamFetchResults = (rawResults, groupByUi) => {
  const wantsGroup = Boolean(groupByUi && String(groupByUi).trim());
  if (!wantsGroup) {
    return {
      results: Array.isArray(rawResults) ? rawResults : [],
      isGrouped: false,
    };
  }

  if (rawResults && typeof rawResults === 'object' && !Array.isArray(rawResults)) {
    const coerced = tryCoerceApiGroupedShape(rawResults);
    if (coerced) {
      if (shouldRegroupCenterPlaceholderMap(coerced, groupByUi)) {
        return {
          results: groupFlatCoreTeamByCenter(flattenGroupMapDeduped(coerced)),
          isGrouped: true,
        };
      }
      return { results: coerced, isGrouped: true };
    }
  }

  if (Array.isArray(rawResults)) {
    const mode = String(groupByUi).toLowerCase();
    if (mode === 'center') {
      return { results: groupFlatCoreTeamByCenter(rawResults), isGrouped: true };
    }
    if (mode === 'role') {
      return { results: groupFlatCoreTeamByField(rawResults, 'role'), isGrouped: true };
    }
    if (mode === 'status') {
      return { results: groupFlatCoreTeamByField(rawResults, 'status'), isGrouped: true };
    }
    if (mode === 'zone') {
      return { results: groupFlatCoreTeamByZone(rawResults), isGrouped: true };
    }
  }

  return { results: [], isGrouped: wantsGroup };
};

export const fetchTeamManagementData = createAsyncThunk(
  'teamManagement/fetchTeamManagementData',
  async (
    {
      keyword = '',
      page = 1,
      page_size = PAGE_SIZE,
      append = false,
      order_by,
      // navbar_filter = null,
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const payload = {
        scope: 'CENTER',
        ...fetchTeamListPayload,
        keyword: keyword.trim(),
        page,
        limit_page_length: page_size,
      };

      const orderByToUse = order_by || fetchTeamListPayload.order_by;
      if (orderByToUse) {
        payload.order_by = orderByToUse;
      }
      // if (navbar_filter != null) {
      //   payload.navbar_filter =
      //     typeof navbar_filter === 'string' ? navbar_filter : JSON.stringify(navbar_filter);
      // }

      const response = await apiClient.post(
        '/method/devx.team_management.api.team_member.team_member_listview',
        payload,
      );
      const data = response?.data;
      const message = data?.message ?? data ?? {};
      const results = message.results ?? [];
      const totalCount = message.total_count ?? 0;
      const totalPages = message.total_pages ?? 1;
      const apiPage = message.page ?? page;
      const apiPageSize = message.page_size ?? page_size;
      const count = message.count ?? results.length;
      const hasMore =
        totalPages > apiPage ||
        (count === apiPageSize && apiPage * apiPageSize < totalCount) ||
        (totalCount === 0 && count === apiPageSize);

      return {
        results,
        page: apiPage,
        pageSize: apiPageSize,
        append,
        hasMore,
        totalCount,
        totalPages,
        summary: message.summary,
        role_type_stats: message.role_type_stats,
        message,
      };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchCoreTeamData = createAsyncThunk(
  'teamManagement/fetchCoreTeamData',
  async (
    {
      keyword = '',
      filters = [],
      page = 1,
      page_size = PAGE_SIZE,
      append = false,
      group_by = '',
      group_order = '',
      // navbar_filter = null,
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const body = {
        scope: 'CORE_TEAM',
        ...fetchTeamListPayload,
        keyword: (keyword ?? '').trim(),
        page,
        limit_page_length: page_size,
      };
      if (Array.isArray(filters) && filters.length > 0) {
        body.filters = filters;
      }
      // if (navbar_filter != null) {
      //   body.navbar_filter =
      //     typeof navbar_filter === 'string' ? navbar_filter : JSON.stringify(navbar_filter);
      // }
      if (group_by) {
        const groupByFieldMap = {
          center: 'center_name',
          role: 'role',
          status: 'status',
          zone: 'zone',
        };
        body.group_by = groupByFieldMap[group_by.toLowerCase()] ?? group_by.toLowerCase();
        body.group_order = group_order || 'asc';
      }
      const response = await apiClient.post(
        '/method/devx.team_management.api.team_member.team_member_listview',
        body,
      );
      const data = response?.data;
      const message = data?.message ?? data ?? {};
      const rawResults = message.results ?? message.data ?? [];
      const { results, isGrouped } = normalizeCoreTeamFetchResults(rawResults, group_by);
      const totalCount = message.total_count ?? 0;
      const totalPages = message.total_pages ?? 1;
      const apiPage = message.page ?? page;
      const apiPageSize = message.page_size ?? page_size;
      const count =
        message.count ??
        (isGrouped
          ? Object.values(results).reduce(
              (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
              0,
            )
          : Array.isArray(results)
            ? results.length
            : 0);

      const hasMore =
        totalPages > apiPage ||
        (count === apiPageSize && apiPage * apiPageSize < totalCount) ||
        (totalCount === 0 && count === apiPageSize);

      return {
        results,
        isGrouped,
        page: apiPage,
        pageSize: apiPageSize,
        append,
        hasMore,
        totalCount,
        totalPages,
        summary: message.summary,
        role_type_stats: message.role_type_stats,
        message,
      };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

const CORE_TEAM_LIST_PREF = {
  doctype: 'USER',
  react_table_id: 'CORE_TEAM',
};

export const getCoreTeamColumnPreferencesThunk = createAsyncThunk(
  'teamManagement/getCoreTeamColumnPreferences',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.get_list_pref', {
        ...CORE_TEAM_LIST_PREF,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error || 'Failed to fetch column preferences');
    }
  },
);

export const saveCoreTeamColumnPreferencesThunk = createAsyncThunk(
  'teamManagement/saveCoreTeamColumnPreferences',
  async (columns, { rejectWithValue }) => {
    try {
      const payload = {
        ...CORE_TEAM_LIST_PREF,
        columns: (columns || []).map((c) => ({
          id: c.id,
          visible: c.visible !== false,
        })),
      };
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error || 'Failed to save column preferences');
    }
  },
);

/** Default date range for support team (last 7 days) so status/from_date/to_date are always sent. */
const getSupportTeamDefaultDates = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  return {
    from_date: from.toISOString().slice(0, 10),
    to_date: to.toISOString().slice(0, 10),
  };
};

export const fetchSupportTeamData = createAsyncThunk(
  'teamManagement/fetchSupportTeamData',
  async (payload, { rejectWithValue }) => {
    try {
      const defaultDates = getSupportTeamDefaultDates();
      const from_date = payload?.from_date ?? defaultDates.from_date;
      const to_date = payload?.to_date ?? defaultDates.to_date;
      const status = payload?.status ?? 'Active';

      let filters = Array.isArray(payload?.filters) ? payload.filters : [];
      const hasRequiredFilters =
        filters.some((f) => f?.[0] === 'status') &&
        filters.some((f) => f?.[0] === 'from_date') &&
        filters.some((f) => f?.[0] === 'to_date');
      if (!hasRequiredFilters) {
        filters = [
          ['status', '=', status],
          ['from_date', '=', from_date],
          ['to_date', '=', to_date],
          ...filters.filter((f) => f?.[0] && !['status', 'from_date', 'to_date'].includes(f[0])),
        ];
      }

      const page = payload?.page ?? 1;
      const page_size = payload?.page_size ?? PAGE_SIZE;
      const append = Boolean(payload?.append);

      const group_by = payload?.group_by ?? '';
      const group_order = payload?.group_order ?? 'asc';

      const body = {
        scope: 'SUPPORT_TEAM',
        ...fetchTeamListPayload,
        filters,
        from_date,
        to_date,
        page,
        limit_page_length: page_size,
      };
      // if (payload?.navbar_filter != null) {
      //   body.navbar_filter =
      //     typeof payload.navbar_filter === 'string'
      //       ? payload.navbar_filter
      //       : JSON.stringify(payload.navbar_filter);
      // }
      if (payload?.keyword != null && String(payload.keyword).trim() !== '') {
        body.keyword = String(payload.keyword).trim();
      }
      if (payload?.month != null) body.month = payload.month;
      if (payload?.year != null) body.year = payload.year;
      if (group_by) {
        const groupByFieldMap = { center: 'center_name', role: 'role' };
        body.group_by = groupByFieldMap[group_by.toLowerCase()] ?? group_by.toLowerCase();
        body.group_order = group_order || 'asc';
      }
      const response = await apiClient.post(
        '/method/devx.team_management.api.team_member.team_member_listview',
        body,
      );
      const data = response?.data;
      const message = data?.message ?? data ?? {};
      const results = message.results ?? message.data ?? (Array.isArray(data) ? data : []);
      const isGrouped =
        Boolean(group_by) &&
        results !== null &&
        !Array.isArray(results) &&
        typeof results === 'object';
      const totalCount = message.total_count ?? 0;
      const totalPages = message.total_pages ?? 1;
      const apiPage = message.page ?? page;
      const apiPageSize = message.page_size ?? page_size;
      const count = message.count ?? (Array.isArray(results) ? results.length : 0);
      const hasMore =
        totalPages > apiPage || (count === apiPageSize && apiPage * apiPageSize < totalCount);

      return {
        results,
        isGrouped,
        data: isGrouped ? {} : Array.isArray(results) ? results : [],
        page: apiPage,
        pageSize: apiPageSize,
        append,
        hasMore,
        totalCount,
        totalPages,
        message,
        summary: message.summary,
        role_type_stats: message.role_type_stats,
      };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const updateTeamMemberThunk = createAsyncThunk(
  'teamManagement/updateTeamMember',
  async (payload, { rejectWithValue }) => {
    try {
      const body = payload.image instanceof File ? buildTeamMemberFormData(payload) : payload;
      const response = await apiClient.post(
        '/method/devx.team_management.api.team_member.update_team_member',
        body,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const deleteTeamMemberThunk = createAsyncThunk(
  'teamManagement/deleteTeamMember',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.team_management.api.team_member.delete_team_member',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchTeamMemberDetail = createAsyncThunk(
  'teamManagement/fetchTeamMemberDetail',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        `/method/devx.team_management.api.attendance.get_attendance_details?employee_id=${payload.employee_id}&month=${payload.month}&year=${payload.year}&selected_date=${payload.selected_date}`,
        {},
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

const HYGIENE_INSPECTION_DETAIL_DOCTYPE = 'Hygiene Inspection Detail';

/** Update who was correct for a manual vs AI mismatch (child row on Hygiene Inspection Detail). */
export const updateHygieneInspectionDetailAccurateBy = createAsyncThunk(
  'teamManagement/updateHygieneInspectionDetailAccurateBy',
  async ({ name, custom_accurate_by }, { rejectWithValue }) => {
    try {
      const docPath = `${encodeURIComponent(HYGIENE_INSPECTION_DETAIL_DOCTYPE)}/${encodeURIComponent(String(name))}`;
      const response = await apiClient.put(`/resource/${docPath}`, {
        custom_accurate_by,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || serializeError(error));
    }
  },
);

const teamManagementSlice = createSlice({
  name: 'teamManagement',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    resetFilters: (state) => {
      state.filters = initialState.filters;
    },

    setAddTeamMemberModal: (state, action) => {
      if (typeof action.payload === 'boolean') {
        state.addTeamMemberModal.isOpen = action.payload;
        if (!action.payload) {
          state.addTeamMemberModal.editData = null;
          state.addTeamMemberModal.error = null;
          state.addTeamMemberModal.status = null;
          state.addTeamMemberModal.source = null;
        }
      } else if (typeof action.payload === 'object' && action.payload !== null) {
        // Handle object payload with isOpen, editData, source
        state.addTeamMemberModal.isOpen = action.payload.isOpen ?? true;
        state.addTeamMemberModal.editData = action.payload.editData ?? null;
        state.addTeamMemberModal.source = action.payload.source ?? null;
        if (!action.payload.isOpen) {
          state.addTeamMemberModal.editData = null;
          state.addTeamMemberModal.error = null;
          state.addTeamMemberModal.status = null;
          state.addTeamMemberModal.source = null;
        }
      } else {
        state.addTeamMemberModal.isOpen = !state.addTeamMemberModal.isOpen;
        if (!state.addTeamMemberModal.isOpen) {
          state.addTeamMemberModal.editData = null;
          state.addTeamMemberModal.error = null;
          state.addTeamMemberModal.status = null;
          state.addTeamMemberModal.source = null;
        }
      }
    },

    setTeamUserDetailModal: (state, action) => {
      state.teamUserDetailModal.isOpen =
        typeof action.payload === 'boolean' ? action.payload : !state.teamUserDetailModal.isOpen;
      if (!state.teamUserDetailModal.isOpen) {
        state.teamUserDetailModal.error = null;
        state.teamUserDetailModal.status = null;
      }
    },
  },

  extraReducers: (builder) => {
    builder.addCase(createTeamMemberThunk.pending, (state) => {
      state.addTeamMemberModal.isLoading = true;
      state.addTeamMemberModal.error = null;
      state.addTeamMemberModal.status = null;
    });

    builder.addCase(createTeamMemberThunk.fulfilled, (state, action) => {
      // console.log('action in fulfilled of createTeamMemberThunk', action.payload);
      state.addTeamMemberModal.isLoading = false;
      state.addTeamMemberModal.error = null;
      state.addTeamMemberModal.status = action.payload?.response?.status;
    });

    builder.addCase(createTeamMemberThunk.rejected, (state, action) => {
      state.addTeamMemberModal.isLoading = false;
      state.addTeamMemberModal.error = action.payload;
      state.addTeamMemberModal.status = action.payload?.response?.status;
    });

    //fetch roles with type

    builder.addCase(fetchRolesWithType.pending, (state) => {
      state.rolesWithType.isLoading = true;
      state.rolesWithType.error = null;
      state.rolesWithType.status = null;
    });

    builder.addCase(fetchRolesWithType.fulfilled, (state, action) => {
      // console.log('action in fulfilled of fetchRolesWithType', action.payload);
      state.rolesWithType.isLoading = false;
      state.rolesWithType.data =
        action.payload?.message || action.payload?.data?.message || action.payload;
      state.rolesWithType.status = action.payload?.response?.status;
    });

    builder.addCase(fetchRolesWithType.rejected, (state, action) => {
      state.rolesWithType.isLoading = false;
      state.rolesWithType.error = action.payload;
      state.rolesWithType.status = action.payload?.response?.status;
    });

    // fetchTeamManagementData (CENTER)
    builder.addCase(fetchTeamManagementData.pending, (state, action) => {
      const isAppend = Boolean(action.meta?.arg?.append);
      state.teamManagementData.error = null;
      state.teamManagementData.status = null;
      if (isAppend) {
        state.teamManagementData.isLoadingMore = true;
      } else {
        state.teamManagementData.isLoading = true;
      }
    });
    builder.addCase(fetchTeamManagementData.fulfilled, (state, action) => {
      state.teamManagementData.isLoading = false;
      state.teamManagementData.isLoadingMore = false;
      state.teamManagementData.status = action.payload?.status ?? null;
      state.teamManagementData.error = action.payload?.error ?? action.payload?.message ?? null;

      const {
        results,
        page,
        pageSize,
        append,
        hasMore,
        totalCount,
        totalPages,
        summary,
        role_type_stats,
      } = action.payload ?? {};

      if (page !== undefined) state.teamManagementData.page = page;
      if (pageSize !== undefined) state.teamManagementData.pageSize = pageSize;
      if (totalCount !== undefined) state.teamManagementData.totalCount = totalCount;
      if (totalPages !== undefined) state.teamManagementData.totalPages = totalPages;
      if (hasMore !== undefined) state.teamManagementData.hasMore = hasMore;
      if (summary || role_type_stats) {
        state.teamManagementTabCounts.data = {
          ...state.teamManagementTabCounts.data,
          ...summary,
          ...(role_type_stats && { role_type_stats }),
        };
      }

      if (append && Array.isArray(results)) {
        const existingData = state.teamManagementData.data || [];
        const existingIds = new Set(existingData.map((item) => item.center_id ?? item.center_name));
        const newResults = results.filter(
          (item) => !existingIds.has(item.center_id ?? item.center_name),
        );
        state.teamManagementData.data = [...existingData, ...newResults];
      } else {
        state.teamManagementData.data = Array.isArray(results) ? results : [];
      }
    });
    builder.addCase(fetchTeamManagementData.rejected, (state, action) => {
      state.teamManagementData.isLoading = false;
      state.teamManagementData.isLoadingMore = false;
      state.teamManagementData.error = action.payload;
      state.teamManagementData.status = action.payload?.response?.status ?? null;
    });

    // fetchCoreTeamData
    builder.addCase(fetchCoreTeamData.pending, (state, action) => {
      const isAppend = Boolean(action.meta?.arg?.append);
      state.coreTeamData.error = null;
      state.coreTeamData.status = null;
      if (isAppend) {
        state.coreTeamData.isLoadingMore = true;
      } else {
        state.coreTeamData.isLoading = true;
      }
    });
    builder.addCase(fetchCoreTeamData.fulfilled, (state, action) => {
      state.coreTeamData.isLoading = false;
      state.coreTeamData.isLoadingMore = false;
      state.coreTeamData.status = action.payload?.response?.status ?? null;
      state.coreTeamData.error = action.payload?.error ?? null;

      const {
        results,
        isGrouped,
        page,
        pageSize,
        append,
        hasMore,
        totalCount,
        totalPages,
        summary,
        role_type_stats,
      } = action.payload ?? {};

      if (page !== undefined) state.coreTeamData.page = page;
      if (pageSize !== undefined) state.coreTeamData.pageSize = pageSize;
      if (totalCount !== undefined) state.coreTeamData.totalCount = totalCount;
      if (totalPages !== undefined) state.coreTeamData.totalPages = totalPages;
      if (hasMore !== undefined) state.coreTeamData.hasMore = hasMore;

      if (append) {
        if (isGrouped) {
          const existingData =
            state.coreTeamData.data &&
            typeof state.coreTeamData.data === 'object' &&
            !Array.isArray(state.coreTeamData.data)
              ? state.coreTeamData.data
              : {};
          const merged = { ...existingData };
          for (const [key, items] of Object.entries(results ?? {})) {
            if (!Array.isArray(items)) continue;
            if (!merged[key]) {
              merged[key] = items;
            } else {
              const existingItems = merged[key];
              const seen = new Set(
                existingItems.map(
                  (item) => `${item.team_member_id || item.email}-${item.center_name}`,
                ),
              );
              const newItems = items.filter(
                (item) => !seen.has(`${item.team_member_id || item.email}-${item.center_name}`),
              );
              merged[key] = [...existingItems, ...newItems];
            }
          }
          state.coreTeamData.data = merged;
        } else if (Array.isArray(results)) {
          const existingData = Array.isArray(state.coreTeamData.data)
            ? state.coreTeamData.data
            : [];
          const existingKeys = new Set(
            existingData.map((item) => `${item.team_member_id}-${item.center_name}`),
          );
          const newResults = results.filter(
            (item) => !existingKeys.has(`${item.team_member_id}-${item.center_name}`),
          );
          state.coreTeamData.data = [...existingData, ...newResults];
        } else {
          state.coreTeamData.data = isGrouped ? {} : [];
        }
      } else {
        state.coreTeamData.data = results ?? (isGrouped ? {} : []);
      }

      if (summary || role_type_stats) {
        state.teamManagementTabCounts.data = {
          ...state.teamManagementTabCounts.data,
          ...summary,
          ...(role_type_stats && { role_type_stats }),
        };
      }
    });
    builder.addCase(fetchCoreTeamData.rejected, (state, action) => {
      state.coreTeamData.isLoading = false;
      state.coreTeamData.isLoadingMore = false;
      state.coreTeamData.error = action.payload;
      state.coreTeamData.status = action.payload?.response?.status ?? null;
    });

    // fetchSupportTeamData
    builder.addCase(fetchSupportTeamData.pending, (state, action) => {
      const isAppend = Boolean(action.meta?.arg?.append);
      state.supportTeamData.error = null;
      state.supportTeamData.status = null;
      if (isAppend) {
        state.supportTeamData.isLoadingMore = true;
      } else {
        state.supportTeamData.isLoading = true;
      }
    });
    builder.addCase(fetchSupportTeamData.fulfilled, (state, action) => {
      state.supportTeamData.isLoading = false;
      state.supportTeamData.isLoadingMore = false;
      state.supportTeamData.status = action.payload?.response?.status ?? null;
      state.supportTeamData.error = action.payload?.error ?? null;

      const {
        results,
        isGrouped,
        data: payloadData,
        page,
        pageSize,
        append,
        hasMore,
        totalCount,
        totalPages,
        summary,
        role_type_stats,
      } = action.payload ?? {};

      if (page !== undefined) state.supportTeamData.page = page;
      if (pageSize !== undefined) state.supportTeamData.pageSize = pageSize;
      if (totalCount !== undefined) state.supportTeamData.totalCount = totalCount;
      if (totalPages !== undefined) state.supportTeamData.totalPages = totalPages;
      if (hasMore !== undefined) state.supportTeamData.hasMore = hasMore;

      if (isGrouped) {
        if (append) {
          const existingData =
            state.supportTeamData.data &&
            typeof state.supportTeamData.data === 'object' &&
            !Array.isArray(state.supportTeamData.data)
              ? state.supportTeamData.data
              : {};
          const merged = { ...existingData };
          for (const [key, items] of Object.entries(results ?? {})) {
            if (!Array.isArray(items)) continue;
            if (!merged[key]) {
              merged[key] = items;
            } else {
              const existingItems = merged[key];
              const seen = new Set(
                existingItems.map((item) => item.team_member_id || item.employee_id || item.email),
              );
              const newItems = items.filter(
                (item) => !seen.has(item.team_member_id || item.employee_id || item.email),
              );
              merged[key] = [...existingItems, ...newItems];
            }
          }
          state.supportTeamData.data = merged;
        } else {
          state.supportTeamData.data = results ?? {};
        }
      } else {
        const newResults = Array.isArray(results)
          ? results
          : Array.isArray(payloadData)
            ? payloadData
            : [];
        if (append && newResults.length > 0) {
          const existingData = Array.isArray(state.supportTeamData.data)
            ? state.supportTeamData.data
            : [];
          state.supportTeamData.data = [...existingData, ...newResults];
        } else {
          state.supportTeamData.data = newResults;
        }
      }

      const argument = action.meta?.arg;
      if (argument) {
        state.supportTeamLastParams = {
          filters: argument.filters ?? [],
          month: argument.month ?? null,
          year: argument.year ?? null,
          from_date: argument.from_date ?? null,
          to_date: argument.to_date ?? null,
          // navbar_filter: argument.navbar_filter ?? null,
        };
      }
      if (summary || role_type_stats) {
        state.teamManagementTabCounts.data = {
          ...state.teamManagementTabCounts.data,
          ...summary,
          ...(role_type_stats && { role_type_stats }),
        };
      }
    });
    builder.addCase(fetchSupportTeamData.rejected, (state, action) => {
      state.supportTeamData.isLoading = false;
      state.supportTeamData.isLoadingMore = false;
      state.supportTeamData.error = action.payload;
      state.supportTeamData.status = action.payload?.response?.status ?? null;
    });

    // updateTeamMemberThunk
    builder.addCase(updateTeamMemberThunk.pending, (state) => {
      state.editTeamMemberModal.isLoading = true;
      state.editTeamMemberModal.error = null;
      state.editTeamMemberModal.status = null;
    });
    builder.addCase(updateTeamMemberThunk.fulfilled, (state, action) => {
      state.editTeamMemberModal.isLoading = false;
      state.editTeamMemberModal.error = null;
      state.editTeamMemberModal.status = action.payload?.response?.status ?? null;
    });
    builder.addCase(updateTeamMemberThunk.rejected, (state, action) => {
      state.editTeamMemberModal.isLoading = false;
      state.editTeamMemberModal.error = action.payload;
      state.editTeamMemberModal.status = action.payload?.response?.status ?? null;
    });

    // fetchTeamMemberDetail
    builder.addCase(fetchTeamMemberDetail.pending, (state) => {
      state.teamMemberDetail.isLoading = true;
      state.teamMemberDetail.error = null;
      state.teamMemberDetail.status = null;
    });
    builder.addCase(fetchTeamMemberDetail.fulfilled, (state, action) => {
      // console.log('fulfilled detail team member', action.payload);
      state.teamMemberDetail.isLoading = false;
      state.teamMemberDetail.data =
        action.payload?.message ?? action.payload?.data ?? action.payload ?? [];
      state.teamMemberDetail.status = action.payload?.response?.status ?? null;
      state.teamMemberDetail.error = action.payload?.error ?? null;
    });
    builder.addCase(fetchTeamMemberDetail.rejected, (state, action) => {
      state.teamMemberDetail.isLoading = false;
      state.teamMemberDetail.error = action.payload;
      state.teamMemberDetail.status = action.payload?.response?.status ?? null;
    });

    // Core team column preferences
    builder.addCase(getCoreTeamColumnPreferencesThunk.pending, (state) => {
      state.coreTeamColumnPreferences.isLoading = true;
      state.coreTeamColumnPreferences.error = null;
    });
    builder.addCase(getCoreTeamColumnPreferencesThunk.fulfilled, (state, { payload }) => {
      state.coreTeamColumnPreferences.isLoading = false;
      state.coreTeamColumnPreferences.error = null;
      if (Array.isArray(payload)) {
        state.coreTeamColumnPreferences.data = payload;
      } else if (Array.isArray(payload?.message)) {
        state.coreTeamColumnPreferences.data = payload.message;
      } else if (Array.isArray(payload?.columns)) {
        state.coreTeamColumnPreferences.data = payload.columns;
      } else if (Array.isArray(payload?.data)) {
        state.coreTeamColumnPreferences.data = payload.data;
      } else {
        state.coreTeamColumnPreferences.data = [];
      }
    });
    builder.addCase(getCoreTeamColumnPreferencesThunk.rejected, (state, action) => {
      state.coreTeamColumnPreferences.isLoading = false;
      state.coreTeamColumnPreferences.error = action.payload;
    });
    builder.addCase(saveCoreTeamColumnPreferencesThunk.pending, (state) => {
      state.coreTeamColumnPreferences.error = null;
    });
    builder.addCase(saveCoreTeamColumnPreferencesThunk.fulfilled, (state) => {
      state.coreTeamColumnPreferences.error = null;
    });
    builder.addCase(saveCoreTeamColumnPreferencesThunk.rejected, (state, action) => {
      state.coreTeamColumnPreferences.error = action.payload;
    });
  },
});

export const {
  setFilters,
  resetFilters,
  setAddTeamMemberModal,
  setEditTeamMemberModal,
  setDeleteTeamMemberModal,
  setTeamUserDetailModal,
} = teamManagementSlice.actions;

export default teamManagementSlice.reducer;

/* --------------------------- SELECTORS --------------------------- */

export const selectAddTeamMemberModal = (state) =>
  state.teamManagement?.addTeamMemberModal || initialState.addTeamMemberModal;
