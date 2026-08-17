import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api';
import { normalizeAssociatedTeamMembers } from '@/redux/centerTrackerSlice';
import { updateCenterThunk } from '@/redux/centerSlice';
import {
  getCenterLabelSyncFromUpdateAction,
  mapCenterOptionsWithLabelSync,
} from '@/utils/center-label-sync';

const DEFAULT_LIST_ORDER_BY = 'start_date asc';

/**
 * Centers for facility tracker (full list for dropdown).
 */
export const fetchFacilityTrackerCentersThunk = createAsyncThunk(
  'facilityTrackerCheck/fetchCenters',
  async (
    { keyword = '', page = 1, pageSize = 500, order_by = 'creation desc' } = {},
    { rejectWithValue },
  ) => {
    try {
      const formData = new FormData();
      formData.append('doctype', 'Center');
      formData.append('limit_page_length', String(pageSize));
      formData.append('page', String(page));
      formData.append('order_by', order_by);
      if (keyword.trim()) {
        formData.append('keyword', keyword.trim());
      }

      const response = await apiClient.post(
        '/method/devx.api.listview.list_with_search_filters',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      const responseData = response?.data?.message || response?.data || {};
      const results = responseData.results || responseData.data || responseData || [];
      const totalCount = responseData.total_count ?? responseData.count ?? results.length;
      const apiPage = responseData.page ?? page;
      const apiPageSize = responseData.page_size ?? pageSize;
      const apiCount = responseData.count ?? results.length;
      const itemsLoadedSoFar = (apiPage - 1) * apiPageSize + apiCount;
      const hasMoreFromAPI = responseData.has_more;
      let hasMore;
      if (hasMoreFromAPI !== undefined) {
        hasMore = hasMoreFromAPI;
      } else if (totalCount !== undefined && totalCount > 0) {
        hasMore = apiCount === apiPageSize && itemsLoadedSoFar < totalCount;
      } else {
        hasMore = apiCount === apiPageSize;
      }

      return {
        results,
        page: apiPage,
        pageSize: apiPageSize,
        totalCount,
        hasMore,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

/**
 * Active tracker tabs for a center (same endpoint as centerTrackerSlice).
 */
export const fetchFacilityTrackerTabsThunk = createAsyncThunk(
  'facilityTrackerCheck/fetchTrackerTabs',
  async (centerId, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        `/method/devx.tracker.api.api_center_tracker_task.get_trackers_by_center?center_id=${centerId}`,
      );
      const data = response.data ?? {};
      const results = Array.isArray(data?.message?.results) ? data.message.results : [];
      const activeResults = results.filter(
        (tracker) => String(tracker?.status ?? '').toLowerCase() === 'active',
      );
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

export const fetchFacilityFloorsThunk = createAsyncThunk(
  'facilityTrackerCheck/fetchFloors',
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

export const fetchFacilitySupervisorsThunk = createAsyncThunk(
  'facilityTrackerCheck/fetchSupervisors',
  async (arg, { rejectWithValue }) => {
    const params = typeof arg === 'string' || arg == null ? { centerId: arg, role: '' } : arg;
    const { centerId, role } = params || {};
    const center = String(centerId ?? '').trim();
    if (!center) return rejectWithValue('Center is required');
    const roleParam = role != null ? String(role).trim() : '';
    try {
      const queryParams = { center };
      if (roleParam) {
        queryParams.role = roleParam;
      }
      const response = await apiClient.get(
        '/method/devx.tracker.api.api_center_tracker_task.get_associated_team_members_by_role',
        { params: queryParams },
      );
      const msg = response?.data?.message ?? response?.data ?? {};
      const raw =
        msg.team_members ??
        msg.members ??
        msg.employees ??
        msg.results ??
        (Array.isArray(msg) ? msg : []);
      const list = Array.isArray(raw) ? raw : [];
      const normalized = normalizeAssociatedTeamMembers(list, roleParam || 'Team member');
      const supervisors = normalized.map((m) => ({
        employee_id: m.value,
        employee_name: m.label,
        user_role: m.user_role || m.role || 'Team member',
        email: m.email,
      }));
      return { centerId: center, supervisors };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

/**
 * Listview API accepts only optional `floor` and `assignee` inside `filters` (JSON string).
 */
function stringifyFacilityTrackerListviewFilters(filters) {
  if (Array.isArray(filters)) {
    return JSON.stringify(filters);
  }
  let obj = {};
  if (typeof filters === 'string') {
    try {
      const parsed = JSON.parse(filters.trim() || '{}');
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
      if (parsed && typeof parsed === 'object') obj = parsed;
    } catch {
      obj = {};
    }
  } else if (filters && typeof filters === 'object' && !Array.isArray(filters)) {
    obj = filters;
  }
  const out = {};
  const floorRaw = obj.floor;
  const assigneeRaw = obj.assignee;
  const floor = Array.isArray(floorRaw)
    ? floorRaw.map((f) => String(f ?? '').trim()).filter(Boolean)
    : String(floorRaw ?? '').trim();
  const assignee = Array.isArray(assigneeRaw)
    ? assigneeRaw.map((a) => String(a ?? '').trim()).filter(Boolean)
    : String(assigneeRaw ?? '').trim();
  if (Array.isArray(floor) ? floor.length > 0 : Boolean(floor)) out.floor = floor;
  if (Array.isArray(assignee) ? assignee.length > 0 : Boolean(assignee)) out.assignee = assignee;
  return JSON.stringify(out);
}

function stringifyFacilityMyTaskFilters(filters) {
  if (typeof filters === 'string') {
    const trimmed = filters.trim();
    if (!trimmed) return JSON.stringify([]);
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
      if (parsed && typeof parsed === 'object') {
        const tuples = [];
        const floor = String(parsed.floor ?? '').trim();
        const assignee = String(parsed.assignee ?? '').trim();
        if (floor) tuples.push(['floor', '=', floor]);
        if (assignee) tuples.push(['assignee', '=', assignee]);
        return JSON.stringify(tuples);
      }
      return JSON.stringify([]);
    } catch {
      return JSON.stringify([]);
    }
  }

  if (Array.isArray(filters)) {
    return JSON.stringify(filters);
  }

  if (filters && typeof filters === 'object') {
    const tuples = [];
    const floor = String(filters.floor ?? '').trim();
    const assignee = String(filters.assignee ?? '').trim();
    if (floor) tuples.push(['floor', '=', floor]);
    if (assignee) tuples.push(['assignee', '=', assignee]);
    return JSON.stringify(tuples);
  }

  return JSON.stringify([]);
}

/**
 * Facility tracker task list (listview).
 * POST /method/devx.tracker.api.api_facility_tracker_task.get_tracker_task_listview
 */
export const fetchFacilityTrackerTaskListviewThunk = createAsyncThunk(
  'facilityTrackerCheck/fetchTaskListview',
  async (
    {
      tracker_name,
      center,
      tab = 'all',
      page = 1,
      limit_page_length = 20,
      order_by = DEFAULT_LIST_ORDER_BY,
      keyword = '',
      filters = {},
      date = null,
      month = null,
      year = null,
      group_by = '',
      group_order = 'asc',
      append = false,
    } = {},
    { rejectWithValue },
  ) => {
    try {
      // Backend uses json.loads(kwargs.get("filters") or "{}") — expects a JSON string, not a dict.
      const filtersPayload = stringifyFacilityTrackerListviewFilters(filters);

      const payload = {
        tracker_name,
        center,
        tab,
        page,
        limit_page_length,
        order_by,
        keyword: keyword ?? '',
        filters: filtersPayload,
      };

      // Add optional parameters
      if (date) payload.date = date;
      if (month) payload.month = month;
      if (year) payload.year = year;
      if (group_by) payload.group_by = group_by;
      if (group_order) payload.group_order = group_order;

      const response = await apiClient.post(
        '/method/devx.tracker.api.api_facility_tracker_task.get_tracker_task_listview',
        payload,
      );

      const message = response?.data?.message ?? response?.data ?? {};
      const tasks = Array.isArray(message.tasks)
        ? message.tasks
        : Array.isArray(message.results)
          ? message.results
          : [];
      const periods = Array.isArray(message.periods) ? message.periods : [];
      const currentPage = Number(message.page ?? page) || page;
      const pageSize =
        Number(message.page_size ?? message.limit_page_length ?? limit_page_length) || 20;
      const totalCount = Number(message.total_count ?? message.count ?? tasks.length) || 0;
      const totalPages =
        Number(message.total_pages) || (pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1);
      const hasMore =
        message.has_more != null && message.has_more !== ''
          ? Boolean(message.has_more)
          : currentPage < totalPages;

      return {
        append: Boolean(append),
        raw: response.data,
        tasks,
        periods,
        viewType: message.view_type ?? null,
        totalCount,
        totalPages,
        page: currentPage,
        pageSize,
        hasMore,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

/**
 * My Task listview for facility tracker page.
 * POST /method/devx.tracker.api.api_facility_tracker_task.get_my_task_listview
 */
export const fetchFacilityMyTaskListviewThunk = createAsyncThunk(
  'facilityTrackerCheck/fetchMyTaskListview',
  async (
    {
      center,
      view_type = '',
      status = 'all',
      keyword = '',
      filters = {},
      page = 1,
      limit_page_length = 20,
      append = false,
      group_by = '',
      group_order = 'asc',
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const filtersPayload = stringifyFacilityMyTaskFilters(filters);
      const payload = {
        center,
        view_type,
        status,
        keyword: keyword ?? '',
        filters: filtersPayload,
        page,
        limit_page_length,
      };
      if (group_by) payload.group_by = group_by;
      if (group_order) payload.group_order = group_order;

      const response = await apiClient.post(
        '/method/devx.tracker.api.api_facility_tracker_task.get_my_task_listview',
        payload,
      );
      const message = response?.data?.message ?? response?.data ?? {};
      const results = Array.isArray(message.results) ? message.results : [];
      const currentPage = Number(message.page ?? page) || page;
      const pageSize =
        Number(message.page_size ?? message.limit_page_length ?? limit_page_length) || 20;
      const totalCount = Number(message.total_count ?? message.count ?? results.length) || 0;
      const totalPages =
        Number(message.total_pages) || (pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1);
      const hasMore = currentPage < totalPages;
      return {
        append: Boolean(append),
        results,
        page: currentPage,
        pageSize,
        totalCount,
        totalPages,
        hasMore,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

/**
 * Fetch comments + activity for a facility task.
 * GET /method/devx.tracker.api.api_facility_tracker_task.get_facility_task_comments
 */
export const fetchFacilityTaskCommentsThunk = createAsyncThunk(
  'facilityTrackerCheck/fetchTaskComments',
  async ({ task_ref, task_schedule_ref }, { rejectWithValue }) => {
    if (!task_ref) return rejectWithValue('task_ref required');
    try {
      const response = await apiClient.get(
        '/method/devx.tracker.api.api_facility_tracker_task.get_facility_task_comments',
        { params: { task_ref, task_schedule_ref } },
      );
      const data = response?.data?.message ?? response?.data ?? {};
      const comments = (data.comments || []).map((c) => ({
        ...c,
        content: c.comment || c.content,
        commented_by: c.comment_by || c.commented_by,
        custom_parent_comment: c.parent_comment != null,
      }));
      return { comments, history: data.history || [] };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

/**
 * Add a comment (with optional attachments) to a facility task.
 * POST /method/devx.tracker.api.api_facility_tracker_task.add_facility_task_comment_with_files
 */
export const addFacilityTaskCommentThunk = createAsyncThunk(
  'facilityTrackerCheck/addTaskComment',
  async (
    { task_ref, task_schedule_ref, content, attachments = [], parentCommentId = null },
    { rejectWithValue },
  ) => {
    if (!task_ref) return rejectWithValue('task_ref required');
    const hasContent = content != null && String(content).trim().length > 0;
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    if (!hasContent && !hasAttachments)
      return rejectWithValue('Comment text or attachment required');
    try {
      const formData = new FormData();
      formData.append('task_ref', String(task_ref));
      formData.append('task_schedule_ref', String(task_schedule_ref ?? ''));
      formData.append('content', content ?? '');
      if (parentCommentId) formData.append('parent_comment', String(parentCommentId));
      if (hasAttachments) {
        attachments.forEach((att) => {
          const file = att?.file ?? att;
          if (file instanceof File) formData.append('files[]', file);
        });
      }
      const response = await apiClient.post(
        '/method/devx.tracker.api.api_facility_tracker_task.add_facility_task_comment_with_files',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response?.data?.message || response?.data || null;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

/**
 * Task cell detail for facility tracker drawer.
 * GET /method/devx.tracker.api.api_facility_tracker_task.get_tracker_task_detail
 */
export const fetchFacilityTrackerTaskDetailThunk = createAsyncThunk(
  'facilityTrackerCheck/fetchTaskDetail',
  async ({ task_ref, task_schedule_ref }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/method/devx.tracker.api.api_facility_tracker_task.get_tracker_task_detail',
        {
          params: {
            task_ref,
            task_schedule_ref,
          },
        },
      );
      const message = response?.data?.message ?? response?.data ?? {};
      return message;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

/**
 * Move/reschedule a planned facility task cell.
 * POST /method/devx.tracker.api.api_facility_tracker_task.update_task_schedule
 */
export const updateFacilityTrackerTaskScheduleThunk = createAsyncThunk(
  'facilityTrackerCheck/updateTaskSchedule',
  async ({ task_ref, task_schedule_ref, move_to }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.tracker.api.api_facility_tracker_task.update_task_schedule',
        {
          task_ref,
          task_schedule_ref,
          move_to,
        },
      );
      return response?.data?.message ?? response?.data ?? {};
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

/**
 * Submit checklist + completion photos for pending/missed My Task execution.
 * POST /method/devx.tracker.api.api_facility_task.submit_facility_checklist
 */
export const submitFacilityMyTaskChecklistThunk = createAsyncThunk(
  'facilityTrackerCheck/submitMyTaskChecklist',
  async (
    { task_ref, task_schedule_ref, checklist_data = [], task_photos = [] },
    { rejectWithValue },
  ) => {
    try {
      let employeeId = '';
      try {
        const userResponse = await apiClient.get('/method/frappe.auth.get_logged_user');
        employeeId = String(userResponse?.data?.message ?? '').trim();
      } catch {
        employeeId = '';
      }

      const formData = new FormData();
      formData.append('task_ref', String(task_ref ?? '').trim());
      formData.append('task_schedule_ref', String(task_schedule_ref ?? '').trim());
      formData.append('user_id', employeeId);
      formData.append(
        'checklist_data',
        JSON.stringify(Array.isArray(checklist_data) ? checklist_data : []),
      );
      (Array.isArray(task_photos) ? task_photos : []).forEach((photoFile) => {
        formData.append('files', photoFile);
      });

      const response = await apiClient.post(
        '/method/devx.tracker.api.api_facility_task.submit_facility_checklist',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      return response?.data?.message ?? response?.data ?? {};
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

const initialState = {
  centers: {
    data: [],
    isLoading: false,
    error: null,
  },
  trackerTabs: {
    data: null,
    isLoading: false,
    error: null,
  },
  floors: {
    data: [],
    isLoading: false,
    error: null,
  },
  supervisors: {
    data: [],
    isLoading: false,
    error: null,
  },
  taskListview: {
    data: [],
    periods: [],
    viewType: null,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
    hasMore: false,
  },
  taskDetail: {
    data: null,
    isLoading: false,
    error: null,
  },
  myTaskListview: {
    data: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
    hasMore: false,
  },
  submitMyTaskChecklist: {
    isLoading: false,
    error: null,
  },
  taskComments: {
    data: { comments: [], history: [] },
    status: 'idle',
    error: null,
  },
};

const facilityTrackerCheckSlice = createSlice({
  name: 'facilityTrackerCheck',
  initialState,
  reducers: {
    clearFacilityTrackerTaskList: (state) => {
      state.taskListview.data = [];
      state.taskListview.periods = [];
      state.taskListview.viewType = null;
      state.taskListview.page = 1;
      state.taskListview.totalCount = 0;
      state.taskListview.hasMore = false;
      state.taskListview.error = null;
    },
    clearFacilityTrackerTaskDetail: (state) => {
      state.taskDetail.data = null;
      state.taskDetail.isLoading = false;
      state.taskDetail.error = null;
    },
    clearFacilityMyTaskList: (state) => {
      state.myTaskListview.data = [];
      state.myTaskListview.isLoading = false;
      state.myTaskListview.isLoadingMore = false;
      state.myTaskListview.error = null;
      state.myTaskListview.page = 1;
      state.myTaskListview.pageSize = 20;
      state.myTaskListview.totalCount = 0;
      state.myTaskListview.totalPages = 0;
      state.myTaskListview.hasMore = false;
    },
    clearSubmitMyTaskChecklistState: (state) => {
      state.submitMyTaskChecklist.isLoading = false;
      state.submitMyTaskChecklist.error = null;
    },
    clearFacilityTaskComments: (state) => {
      state.taskComments.data = { comments: [], history: [] };
      state.taskComments.status = 'idle';
      state.taskComments.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFacilityTrackerCentersThunk.pending, (state) => {
        state.centers.isLoading = true;
        state.centers.error = null;
      })
      .addCase(fetchFacilityTrackerCentersThunk.fulfilled, (state, action) => {
        state.centers.isLoading = false;
        state.centers.data = action.payload?.results ?? [];
        state.centers.error = null;
      })
      .addCase(fetchFacilityTrackerCentersThunk.rejected, (state, action) => {
        state.centers.isLoading = false;
        state.centers.error = action.payload ?? action.error;
      })
      // Sync facility tracker center dropdown labels when a center is renamed.
      .addCase(updateCenterThunk.fulfilled, (state, action) => {
        const centerLabelSync = getCenterLabelSyncFromUpdateAction(action);
        if (!centerLabelSync || centerLabelSync.updatedCenterName == null) return;
        if (!Array.isArray(state.centers.data)) return;

        state.centers.data = mapCenterOptionsWithLabelSync(state.centers.data, centerLabelSync, {
          setLabel: false,
        });
      });

    builder
      .addCase(fetchFacilityTrackerTabsThunk.pending, (state) => {
        state.trackerTabs.isLoading = true;
        state.trackerTabs.error = null;
      })
      .addCase(fetchFacilityTrackerTabsThunk.fulfilled, (state, action) => {
        state.trackerTabs.isLoading = false;
        state.trackerTabs.data = action.payload;
        state.trackerTabs.error = null;
      })
      .addCase(fetchFacilityTrackerTabsThunk.rejected, (state, action) => {
        state.trackerTabs.isLoading = false;
        state.trackerTabs.error = action.payload ?? action.error;
      });

    builder
      .addCase(fetchFacilityFloorsThunk.pending, (state) => {
        state.floors.isLoading = true;
        state.floors.error = null;
      })
      .addCase(fetchFacilityFloorsThunk.fulfilled, (state, action) => {
        state.floors.isLoading = false;
        const raw = action.payload?.message?.results ?? action.payload?.message;
        state.floors.data = Array.isArray(raw) ? raw : raw ? [raw] : [];
        state.floors.error = null;
      })
      .addCase(fetchFacilityFloorsThunk.rejected, (state, action) => {
        state.floors.isLoading = false;
        state.floors.error = action.payload ?? action.error;
      });

    builder
      .addCase(fetchFacilitySupervisorsThunk.pending, (state) => {
        state.supervisors.isLoading = true;
        state.supervisors.error = null;
      })
      .addCase(fetchFacilitySupervisorsThunk.fulfilled, (state, action) => {
        state.supervisors.isLoading = false;
        state.supervisors.data = action.payload?.supervisors ?? [];
        state.supervisors.error = null;
      })
      .addCase(fetchFacilitySupervisorsThunk.rejected, (state, action) => {
        state.supervisors.isLoading = false;
        state.supervisors.error = action.payload ?? action.error;
      });

    builder
      .addCase(fetchFacilityTrackerTaskListviewThunk.pending, (state, action) => {
        const append = Boolean(action.meta?.arg?.append);
        state.taskListview.error = null;
        state.taskListview.isLoading = !append;
        state.taskListview.isLoadingMore = append;
      })
      .addCase(fetchFacilityTrackerTaskListviewThunk.fulfilled, (state, action) => {
        const append = Boolean(action.payload?.append);
        state.taskListview.isLoading = false;
        state.taskListview.isLoadingMore = false;
        state.taskListview.error = null;
        state.taskListview.page = action.payload?.page ?? 1;
        state.taskListview.pageSize = action.payload?.pageSize ?? 20;
        state.taskListview.totalCount = action.payload?.totalCount ?? 0;
        state.taskListview.totalPages = action.payload?.totalPages ?? 0;
        state.taskListview.hasMore = Boolean(action.payload?.hasMore);
        const incoming = action.payload?.tasks ?? [];
        state.taskListview.data = append ? [...state.taskListview.data, ...incoming] : incoming;
        if (!append || (action.payload?.periods?.length ?? 0) > 0) {
          state.taskListview.periods = action.payload?.periods ?? [];
        }
        state.taskListview.viewType = action.payload?.viewType ?? null;
      })
      .addCase(fetchFacilityTrackerTaskListviewThunk.rejected, (state, action) => {
        const append = Boolean(action.meta?.arg?.append);
        state.taskListview.isLoading = false;
        state.taskListview.isLoadingMore = false;
        state.taskListview.error = action.payload ?? action.error;
        if (!append) {
          state.taskListview.data = [];
          state.taskListview.periods = [];
          state.taskListview.viewType = null;
          state.taskListview.page = 1;
          state.taskListview.totalCount = 0;
          state.taskListview.totalPages = 0;
          state.taskListview.hasMore = false;
        }
      });

    builder
      .addCase(fetchFacilityMyTaskListviewThunk.pending, (state, action) => {
        const append = Boolean(action.meta?.arg?.append);
        state.myTaskListview.error = null;
        state.myTaskListview.isLoading = !append;
        state.myTaskListview.isLoadingMore = append;
      })
      .addCase(fetchFacilityMyTaskListviewThunk.fulfilled, (state, action) => {
        const append = Boolean(action.payload?.append);
        state.myTaskListview.isLoading = false;
        state.myTaskListview.isLoadingMore = false;
        state.myTaskListview.error = null;
        state.myTaskListview.page = action.payload?.page ?? 1;
        state.myTaskListview.pageSize = action.payload?.pageSize ?? 20;
        state.myTaskListview.totalCount = action.payload?.totalCount ?? 0;
        state.myTaskListview.totalPages = action.payload?.totalPages ?? 0;
        state.myTaskListview.hasMore = Boolean(action.payload?.hasMore);
        const incoming = action.payload?.results ?? [];
        state.myTaskListview.data = append ? [...state.myTaskListview.data, ...incoming] : incoming;
      })
      .addCase(fetchFacilityMyTaskListviewThunk.rejected, (state, action) => {
        const append = Boolean(action.meta?.arg?.append);
        state.myTaskListview.isLoading = false;
        state.myTaskListview.isLoadingMore = false;
        state.myTaskListview.error = action.payload ?? action.error;
        if (!append) {
          state.myTaskListview.data = [];
          state.myTaskListview.page = 1;
          state.myTaskListview.totalCount = 0;
          state.myTaskListview.totalPages = 0;
          state.myTaskListview.hasMore = false;
        }
      });

    builder
      .addCase(submitFacilityMyTaskChecklistThunk.pending, (state) => {
        state.submitMyTaskChecklist.isLoading = true;
        state.submitMyTaskChecklist.error = null;
      })
      .addCase(submitFacilityMyTaskChecklistThunk.fulfilled, (state) => {
        state.submitMyTaskChecklist.isLoading = false;
        state.submitMyTaskChecklist.error = null;
      })
      .addCase(submitFacilityMyTaskChecklistThunk.rejected, (state, action) => {
        state.submitMyTaskChecklist.isLoading = false;
        state.submitMyTaskChecklist.error = action.payload ?? action.error;
      });

    builder
      .addCase(fetchFacilityTrackerTaskDetailThunk.pending, (state) => {
        state.taskDetail.isLoading = true;
        state.taskDetail.error = null;
      })
      .addCase(fetchFacilityTrackerTaskDetailThunk.fulfilled, (state, action) => {
        state.taskDetail.isLoading = false;
        state.taskDetail.data = action.payload;
        state.taskDetail.error = null;
      })
      .addCase(fetchFacilityTrackerTaskDetailThunk.rejected, (state, action) => {
        state.taskDetail.isLoading = false;
        state.taskDetail.error = action.payload ?? action.error;
        state.taskDetail.data = null;
      });

    builder
      .addCase(fetchFacilityTaskCommentsThunk.pending, (state) => {
        state.taskComments.status = 'loading';
        state.taskComments.error = null;
      })
      .addCase(fetchFacilityTaskCommentsThunk.fulfilled, (state, action) => {
        state.taskComments.status = 'succeeded';
        state.taskComments.data = action.payload;
        state.taskComments.error = null;
      })
      .addCase(fetchFacilityTaskCommentsThunk.rejected, (state, action) => {
        state.taskComments.status = 'failed';
        state.taskComments.error = action.payload ?? action.error?.message;
        state.taskComments.data = { comments: [], history: [] };
      });

    // Comments are re-fetched after add, so no optimistic append needed.
  },
});

export const {
  clearFacilityTrackerTaskList,
  clearFacilityTrackerTaskDetail,
  clearFacilityMyTaskList,
  clearSubmitMyTaskChecklistState,
  clearFacilityTaskComments,
} = facilityTrackerCheckSlice.actions;

export const selectFacilityTaskComments = (state) =>
  state.facilityTrackerCheck?.taskComments ?? {
    data: { comments: [], history: [] },
    status: 'idle',
    error: null,
  };

export default facilityTrackerCheckSlice.reducer;
