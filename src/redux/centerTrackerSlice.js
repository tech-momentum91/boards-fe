import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api';

/** Normalize rows from get_associated_team_members_by_role (shape may vary). */
export const normalizeAssociatedTeamMembers = (rawList, roleLabel) => {
  const list = Array.isArray(rawList) ? rawList : [];
  const fallbackRole = String(roleLabel ?? '').trim();
  return list
    .map((m) => {
      const value = String(
        m?.employee_id ?? m?.team_member_id ?? m?.email ?? m?.user ?? m?.name ?? '',
      ).trim();
      const label = String(
        m?.employee_name ?? m?.full_name ?? m?.name ?? m?.employee_id ?? m?.team_member_id ?? value,
      ).trim();
      const fromMember = String(m?.role ?? m?.user_role ?? '').trim();
      const user_role = fromMember || fallbackRole || 'Team member';
      const email = m?.email != null ? String(m.email).trim() : undefined;
      const assignee_type =
        String(m?.assignee_type ?? '').trim() ||
        (String(m?.team_type ?? '').trim() === 'Employee' ? 'Employee' : 'User');
      const apiName = String(m?.name ?? '').trim();
      return {
        value,
        label,
        email,
        user_role,
        assignee_type,
        team_type: m?.team_type,
        ...(apiName ? { name: apiName } : {}),
      };
    })
    .filter((o) => o.value);
};

/**
 * Tracker Task Master list for a tracker (settings listview API).
 * GET /method/devx.tracker.api.listview.get_task_listview?tracker_id=...
 */
export const fetchTrackerTaskMasterListThunk = createAsyncThunk(
  'centerTracker/fetchTrackerTaskMasterList',
  async (
    { tracker_id, keyword = '', page = 1, limit_page_length = 200 } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await apiClient.get('/method/devx.tracker.api.listview.get_task_listview', {
        params: {
          tracker_id,
          keyword,
          page,
          limit_page_length,
          order_by: 'creation desc',
        },
      });
      const message = response?.data?.message ?? response?.data ?? {};
      const results = message.results ?? [];
      return { results, raw: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

/** GET /resource/Tracker Task Master/<name> */
export const fetchTrackerTaskMasterDetailThunk = createAsyncThunk(
  'centerTracker/fetchTrackerTaskMasterDetail',
  async (taskName, { rejectWithValue }) => {
    try {
      const enc = encodeURIComponent(String(taskName ?? '').trim());
      if (!enc) {
        return rejectWithValue('Task name is required');
      }
      const response = await apiClient.get(`/resource/Tracker Task Master/${enc}`);
      const doc = response?.data?.data ?? response?.data ?? null;
      return doc;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

/**
 * Team members at a center from get_associated_team_members_by_role.
 * - `roles: []` → GET with `center` only → stored on state.teamMembersByRole.allMembers
 * - `roles: ['A','B']` → one request per role (`center` + `role`) → merged into byRole
 */
export const fetchAssociatedTeamMembersForRolesThunk = createAsyncThunk(
  'centerTracker/fetchAssociatedTeamMembersForRoles',
  async ({ center, roles }, { rejectWithValue }) => {
    const centerStr = String(center ?? '').trim();
    if (!centerStr) {
      return { center: centerStr, allMembers: [], byRole: {} };
    }
    const unique = [...new Set((roles || []).map((r) => String(r ?? '').trim()).filter(Boolean))];
    try {
      if (unique.length === 0) {
        const response = await apiClient.get(
          '/method/devx.tracker.api.api_center_tracker_task.get_associated_team_members_by_role',
          { params: { center: centerStr } },
        );
        const msg = response?.data?.message ?? response?.data ?? {};
        const raw =
          msg.team_members ??
          msg.members ??
          msg.employees ??
          msg.results ??
          (Array.isArray(msg) ? msg : []);
        const list = Array.isArray(raw) ? raw : [];
        return {
          center: centerStr,
          allMembers: normalizeAssociatedTeamMembers(list),
          byRole: {},
        };
      }

      const byRole = {};
      await Promise.all(
        unique.map(async (role) => {
          try {
            const response = await apiClient.get(
              '/method/devx.tracker.api.api_center_tracker_task.get_associated_team_members_by_role',
              { params: { center: centerStr, role } },
            );
            const msg = response?.data?.message ?? response?.data ?? {};
            const raw =
              msg.team_members ??
              msg.members ??
              msg.employees ??
              msg.results ??
              (Array.isArray(msg) ? msg : []);
            const list = Array.isArray(raw) ? raw : [];
            byRole[role] = normalizeAssociatedTeamMembers(list, role);
          } catch {
            byRole[role] = [];
          }
        }),
      );
      return { center: centerStr, byRole };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const fetchCenterTrackerTabsThunk = createAsyncThunk(
  'centerTracker/fetchCenterTrackerTabs',
  async (centerId, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        `/method/devx.tracker.api.api_center_tracker_task.get_trackers_by_center?center_id=${centerId}`,
      );
      const data = response.data ?? {};
      const results = Array.isArray(data?.message?.results) ? data.message.results : [];
      const activeResults = results.filter((tracker) => {
        const statusOk = String(tracker?.status ?? '').toLowerCase() === 'active';
        const enabledOk =
          tracker?.enabled_for_center == null ||
          tracker?.enabled_for_center === 1 ||
          tracker?.enabled_for_center === true;
        return statusOk && enabledOk;
      });
      return {
        ...data,
        message: {
          ...data.message,
          count: activeResults.length,
          results: activeResults,
        },
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const fetchFloorByCenterThunk = createAsyncThunk(
  'centerTracker/fetchFloorByCenter',
  async (centerId, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        `/method/devx.tracker.api.api_center_tracker_task.get_center_floors?center=${centerId}`,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

/**
 * List tasks for a tracker at a center (paginated).
 * POST /method/devx.tracker.api.api_center_tracker_task.get_center_tracker_task_listview
 */
export const fetchCenterTrackerTaskListThunk = createAsyncThunk(
  'centerTracker/fetchCenterTrackerTaskList',
  async (
    {
      center,
      tracker,
      keyword = '',
      filters = [],
      page = 1,
      limit_page_length = 20,
      append = false,
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const filterRows = Array.isArray(filters) ? filters : [];
      const response = await apiClient.post(
        '/method/devx.tracker.api.api_center_tracker_task.get_center_tracker_task_listview',
        {
          center,
          tracker,
          keyword,
          filters: filterRows,
          page,
          limit_page_length,
          order_by: 'creation desc',
        },
      );

      const message = response?.data?.message ?? response?.data ?? {};
      const results = message.results ?? [];
      const currentPage = Number(message.page ?? page) || 1;
      const pageSize =
        Number(message.page_size ?? message.limit_page_length ?? limit_page_length) || 20;
      const totalCount = Number(message.total_count ?? message.count ?? results.length) || 0;
      const hasMoreFlag = message.has_more;
      const hasMore =
        hasMoreFlag === true ||
        hasMoreFlag === 1 ||
        (hasMoreFlag !== false && hasMoreFlag !== 0 && currentPage * pageSize < totalCount);

      return {
        raw: response.data,
        results,
        totalCount,
        page: currentPage,
        pageSize,
        hasMore: Boolean(hasMore),
        append,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

const initialState = {
  centerTrackerTabs: {
    data: [],
    isLoading: false,
    error: null,
  },
  floorByCenter: {
    data: [],
    isLoading: false,
    error: null,
  },
  centerTrackerTaskList: {
    data: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    page: 1,
    pageSize: 20,
    totalCount: 0,
    hasMore: false,
  },
  trackerTaskMasterList: {
    results: [],
    isLoading: false,
    error: null,
  },
  trackerTaskMasterDetail: {
    data: null,
    isLoading: false,
    error: null,
  },
  teamMembersByRole: {
    /** Everyone at the center when API is called with only `center` (no `role`). */
    allMembers: [],
    byRole: {},
    isLoading: false,
    error: null,
    lastCenter: null,
  },
};

const centerTrackerSlice = createSlice({
  name: 'centerTracker',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchCenterTrackerTabsThunk.fulfilled, (state, action) => {
      state.centerTrackerTabs.data = action.payload;
      state.centerTrackerTabs.isLoading = false;
      state.centerTrackerTabs.error = null;
    });
    builder.addCase(fetchCenterTrackerTabsThunk.pending, (state) => {
      state.centerTrackerTabs.isLoading = true;
      state.centerTrackerTabs.error = null;
    });
    builder.addCase(fetchCenterTrackerTabsThunk.rejected, (state, action) => {
      state.centerTrackerTabs.isLoading = false;
      state.centerTrackerTabs.error = action.error;
    });

    builder.addCase(fetchFloorByCenterThunk.fulfilled, (state, action) => {
      state.floorByCenter.data = action.payload?.message?.results || action.payload?.message;
      state.floorByCenter.isLoading = false;
      state.floorByCenter.error = null;
    });
    builder.addCase(fetchFloorByCenterThunk.pending, (state) => {
      state.floorByCenter.isLoading = true;
      state.floorByCenter.error = null;
    });
    builder.addCase(fetchFloorByCenterThunk.rejected, (state, action) => {
      state.floorByCenter.isLoading = false;
      state.floorByCenter.error = action.error;
    });

    builder.addCase(fetchCenterTrackerTaskListThunk.pending, (state, action) => {
      if (action.meta.arg?.append) {
        state.centerTrackerTaskList.isLoadingMore = true;
      } else {
        state.centerTrackerTaskList.isLoading = true;
        state.centerTrackerTaskList.data = [];
      }
      state.centerTrackerTaskList.error = null;
    });
    builder.addCase(fetchCenterTrackerTaskListThunk.fulfilled, (state, action) => {
      state.centerTrackerTaskList.isLoading = false;
      state.centerTrackerTaskList.isLoadingMore = false;
      state.centerTrackerTaskList.error = null;
      state.centerTrackerTaskList.page = action.payload?.page ?? 1;
      state.centerTrackerTaskList.pageSize = action.payload?.pageSize ?? 20;
      state.centerTrackerTaskList.totalCount = action.payload?.totalCount ?? 0;
      state.centerTrackerTaskList.hasMore = Boolean(action.payload?.hasMore);
      if (action.payload?.append) {
        state.centerTrackerTaskList.data = [
          ...(state.centerTrackerTaskList.data || []),
          ...(action.payload?.results || []),
        ];
      } else {
        state.centerTrackerTaskList.data = action.payload?.results || [];
      }
    });
    builder.addCase(fetchCenterTrackerTaskListThunk.rejected, (state, action) => {
      state.centerTrackerTaskList.isLoading = false;
      state.centerTrackerTaskList.isLoadingMore = false;
      state.centerTrackerTaskList.error = action.payload;
    });

    builder.addCase(fetchTrackerTaskMasterListThunk.pending, (state) => {
      state.trackerTaskMasterList.isLoading = true;
      state.trackerTaskMasterList.error = null;
    });
    builder.addCase(fetchTrackerTaskMasterListThunk.fulfilled, (state, action) => {
      state.trackerTaskMasterList.isLoading = false;
      state.trackerTaskMasterList.results = action.payload?.results ?? [];
      state.trackerTaskMasterList.error = null;
    });
    builder.addCase(fetchTrackerTaskMasterListThunk.rejected, (state, action) => {
      state.trackerTaskMasterList.isLoading = false;
      state.trackerTaskMasterList.error = action.payload;
      state.trackerTaskMasterList.results = [];
    });

    builder.addCase(fetchTrackerTaskMasterDetailThunk.pending, (state) => {
      state.trackerTaskMasterDetail.isLoading = true;
      state.trackerTaskMasterDetail.error = null;
      state.trackerTaskMasterDetail.data = null;
    });
    builder.addCase(fetchTrackerTaskMasterDetailThunk.fulfilled, (state, action) => {
      state.trackerTaskMasterDetail.isLoading = false;
      state.trackerTaskMasterDetail.data = action.payload;
      state.trackerTaskMasterDetail.error = null;
    });
    builder.addCase(fetchTrackerTaskMasterDetailThunk.rejected, (state, action) => {
      state.trackerTaskMasterDetail.isLoading = false;
      state.trackerTaskMasterDetail.error = action.payload;
      state.trackerTaskMasterDetail.data = null;
    });

    builder.addCase(fetchAssociatedTeamMembersForRolesThunk.pending, (state) => {
      state.teamMembersByRole.isLoading = true;
      state.teamMembersByRole.error = null;
    });
    builder.addCase(fetchAssociatedTeamMembersForRolesThunk.fulfilled, (state, action) => {
      state.teamMembersByRole.isLoading = false;
      state.teamMembersByRole.error = null;
      state.teamMembersByRole.lastCenter = action.payload?.center ?? null;
      const p = action.payload ?? {};
      if (Array.isArray(p.allMembers)) {
        state.teamMembersByRole.allMembers = p.allMembers;
      }
      const incoming = p.byRole ?? {};
      if (incoming && typeof incoming === 'object' && Object.keys(incoming).length > 0) {
        state.teamMembersByRole.byRole = {
          ...state.teamMembersByRole.byRole,
          ...incoming,
        };
      }
    });
    builder.addCase(fetchAssociatedTeamMembersForRolesThunk.rejected, (state, action) => {
      state.teamMembersByRole.isLoading = false;
      state.teamMembersByRole.error = action.payload;
    });
  },
});

export default centerTrackerSlice.reducer;
