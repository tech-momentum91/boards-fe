import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';
import { MY_TASK_SUB_TAB_VALUES } from '@/components/my-tasks/my-task-constants';

const MY_TASK_PREF_DOCTYPE = 'Task';
const MY_TASK_REACT_TABLE_ID = 'devx-my-task';

/** Fixed column definitions – labels used for get_list_pref custom_columns */
export const MY_TASK_COLUMNS_DEF = [
  { id: 'title', label: 'Title', visible: true },
  { id: 'module', label: 'Module', visible: true },
  { id: 'submodule', label: 'Submodule', visible: true },
  { id: 'assignees', label: 'Assignee', visible: true },
  { id: 'due_date', label: 'Due Date', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
];

// ─── Thunks ────────────────────────────────────────────────────────────────

export const fetchMyTaskFilterOptions = createAsyncThunk(
  'myTask/fetchMyTaskFilterOptions',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.get('/method/devx.api.my_task.get_my_task_filter_options');
      const message = response?.data?.message ?? {};
      return {
        statuses: Array.isArray(message.statuses) ? message.statuses : [],
        priorities: Array.isArray(message.priorities) ? message.priorities : [],
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error, 'Failed to load filter options'));
    }
  },
);

function buildMyTasksRequestParams({
  tab = 'All',
  centers = [],
  page = 1,
  per_source = 5,
  search,
  statuses,
  priorities,
  due_date_from,
  due_date_to,
} = {}) {
  const params = {
    tab,
    page,
    per_source,
  };
  // Centre header — aligned with the shared `adaptGlobalCenterIntent.myTask`
  // contract from `@/utils/global-center-filter`:
  //   - 'All' (string)         -> keep the legacy 'All' sentinel (no centre restriction)
  //   - [] (empty array)       -> explicit empty; backend short-circuits to 0 rows
  //   - [...]                  -> filter to those centres
  //   - undefined / null       -> omit param (callers should gate on intent loading)
  if (centers === 'All') {
    params.centers = 'All';
  } else if (Array.isArray(centers)) {
    params.centers = JSON.stringify(centers);
  }
  const q = typeof search === 'string' ? search.trim() : '';
  if (q) {
    params.search = q;
  }
  if (Array.isArray(statuses) && statuses.length > 0) {
    params.statuses = JSON.stringify(statuses);
  }
  if (Array.isArray(priorities) && priorities.length > 0) {
    params.priorities = JSON.stringify(priorities);
  }
  if (due_date_from) {
    params.due_date_from = due_date_from;
  }
  if (due_date_to) {
    params.due_date_to = due_date_to;
  }
  return params;
}

export const fetchMyTasks = createAsyncThunk(
  'myTask/fetchMyTasks',
  async (
    {
      tab = 'All',
      centers = [],
      page = 1,
      per_source = 5,
      append = false,
      search,
      statuses,
      priorities,
      due_date_from,
      due_date_to,
    } = {},
    thunkAPI,
  ) => {
    try {
      const params = buildMyTasksRequestParams({
        tab,
        centers,
        page,
        per_source,
        search,
        statuses,
        priorities,
        due_date_from,
        due_date_to,
      });
      const response = await apiClient.get('/method/devx.api.my_task.get_my_tasks', { params });
      const message = response?.data?.message ?? {};
      return {
        results: message.results ?? [],
        has_more: message.has_more ?? false,
        page: message.page ?? page,
        per_source: message.per_source ?? per_source,
        append,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error, 'Failed to fetch tasks'));
    }
  },
);

/** Month-scoped task fetch for calendar view (higher per_source, no pagination). */
export const fetchMyTasksCalendar = createAsyncThunk(
  'myTask/fetchMyTasksCalendar',
  async (
    { tab = 'All', centers = [], search, statuses, priorities, due_date_from, due_date_to } = {},
    thunkAPI,
  ) => {
    try {
      const params = buildMyTasksRequestParams({
        tab,
        centers,
        page: 1,
        per_source: 100,
        search,
        statuses,
        priorities,
        due_date_from,
        due_date_to,
      });
      const response = await apiClient.get('/method/devx.api.my_task.get_my_tasks', { params });
      const message = response?.data?.message ?? {};
      return {
        results: message.results ?? [],
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error, 'Failed to fetch calendar tasks'));
    }
  },
);

export const fetchMyTaskListPref = createAsyncThunk('myTask/fetchMyTaskListPref', async () => {
  try {
    const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
      params: {
        doctype: MY_TASK_PREF_DOCTYPE,
        react_table_id: MY_TASK_REACT_TABLE_ID,
      },
    });
    const message = response?.data?.message;
    // No saved record found — use the frontend-defined column sequence as the default
    if (!message || (Array.isArray(message) && message.length === 0)) {
      return MY_TASK_COLUMNS_DEF;
    }
    return message;
  } catch {
    // On any error also fall back to frontend defaults so the table is always usable
    return MY_TASK_COLUMNS_DEF;
  }
});

export const saveMyTaskListPref = createAsyncThunk(
  'myTask/saveMyTaskListPref',
  async (columns, thunkAPI) => {
    try {
      await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: MY_TASK_PREF_DOCTYPE,
        react_table_id: MY_TASK_REACT_TABLE_ID,
        columns,
      });
      return columns;
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error, 'Failed to save column prefs'));
    }
  },
);

const DEFAULT_TASK_TAB_COUNTS = Object.fromEntries(MY_TASK_SUB_TAB_VALUES.map((k) => [k, 0]));

export const fetchMyTaskTabCounts = createAsyncThunk(
  'myTask/fetchMyTaskTabCounts',
  async ({ centers = [], search, searchByTab, filtersByTab } = {}, thunkAPI) => {
    try {
      const params = {};
      // Same centre-header contract as `fetchMyTasks` above (see comment).
      if (centers === 'All') {
        params.centers = 'All';
      } else if (Array.isArray(centers)) {
        params.centers = JSON.stringify(centers);
      }
      const q = typeof search === 'string' ? search.trim() : '';
      if (q) params.search = q;
      if (searchByTab && typeof searchByTab === 'object') {
        const payload = {};
        MY_TASK_SUB_TAB_VALUES.forEach((k) => {
          const text = typeof searchByTab[k] === 'string' ? searchByTab[k].trim() : '';
          payload[k] = text;
        });
        params.search_by_tab = JSON.stringify(payload);
      }
      if (filtersByTab && typeof filtersByTab === 'object') {
        const payload = {};
        MY_TASK_SUB_TAB_VALUES.forEach((k) => {
          const b = filtersByTab[k];
          const dueFrom = b?.dueDate?.from;
          const dueToRaw = b?.dueDate?.to ?? b?.dueDate?.from;
          const toYmd = (input) => {
            if (!input) return null;
            const d = input instanceof Date ? input : new Date(input);
            if (Number.isNaN(d.getTime())) return null;
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          };
          payload[k] = {
            statuses: Array.isArray(b?.statuses) ? b.statuses : [],
            priorities: Array.isArray(b?.priorities) ? b.priorities : [],
            due_date_from: toYmd(dueFrom),
            due_date_to: toYmd(dueToRaw),
          };
        });
        params.filters_by_tab = JSON.stringify(payload);
      }
      const response = await apiClient.get('/method/devx.api.my_task.get_my_tasks_counts', {
        params,
      });
      const message = response?.data?.message ?? {};
      const raw = message.counts && typeof message.counts === 'object' ? message.counts : {};
      const counts = { ...DEFAULT_TASK_TAB_COUNTS };
      MY_TASK_SUB_TAB_VALUES.forEach((k) => {
        const n = Number(raw[k]);
        counts[k] = Number.isFinite(n) && n >= 0 ? n : 0;
      });
      return { counts };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        extractErrorMessage(error, 'Failed to fetch task tab counts'),
      );
    }
  },
);

// ─── Slice ─────────────────────────────────────────────────────────────────

const initialState = {
  items: [],
  page: 1,
  per_source: 5,
  hasMore: false,
  loading: false,
  loadingMore: false,
  error: null,

  activeTab: 'All',

  columnPrefs: MY_TASK_COLUMNS_DEF,
  columnPrefsLoading: false,
  columnPrefsError: null,

  filterOptionStatuses: [],
  filterOptionPriorities: [],
  filterOptionsLoading: false,
  filterOptionsError: null,

  taskTabCounts: { ...DEFAULT_TASK_TAB_COUNTS },
  taskTabCountsLoading: false,
  taskTabCountsError: null,

  calendarItems: [],
  calendarLoading: false,
  calendarError: null,
};

const myTaskSlice = createSlice({
  name: 'myTask',
  initialState,
  reducers: {
    setActiveTab(state, action) {
      state.activeTab = action.payload;
      // Reset list on tab change
      state.items = [];
      state.page = 1;
      state.hasMore = false;
    },
    resetMyTasks(state) {
      state.items = [];
      state.page = 1;
      state.hasMore = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ── fetchMyTasks ──
    builder.addCase(fetchMyTasks.pending, (state, action) => {
      if (action.meta.arg?.append) {
        state.loadingMore = true;
      } else {
        state.loading = true;
        state.items = [];
      }
      state.error = null;
    });
    builder.addCase(fetchMyTasks.fulfilled, (state, action) => {
      state.loading = false;
      state.loadingMore = false;
      state.items = action.payload.append
        ? [...state.items, ...action.payload.results]
        : action.payload.results;
      state.page = action.payload.page;
      state.per_source = action.payload.per_source;
      state.hasMore = action.payload.has_more;
    });
    builder.addCase(fetchMyTasks.rejected, (state, action) => {
      state.loading = false;
      state.loadingMore = false;
      state.error = action.payload ?? 'Failed to fetch tasks';
    });

    // ── fetchMyTaskListPref ──
    builder.addCase(fetchMyTaskListPref.pending, (state) => {
      state.columnPrefsLoading = true;
      state.columnPrefsError = null;
    });
    builder.addCase(fetchMyTaskListPref.fulfilled, (state, action) => {
      state.columnPrefsLoading = false;
      state.columnPrefs =
        Array.isArray(action.payload) && action.payload.length > 0
          ? action.payload
          : MY_TASK_COLUMNS_DEF;
    });
    builder.addCase(fetchMyTaskListPref.rejected, (state, action) => {
      state.columnPrefsLoading = false;
      state.columnPrefsError = action.payload ?? 'Failed to fetch column prefs';
    });

    // ── saveMyTaskListPref ──
    builder.addCase(saveMyTaskListPref.fulfilled, (state, action) => {
      if (Array.isArray(action.payload)) {
        state.columnPrefs = action.payload;
      }
    });

    builder.addCase(fetchMyTaskFilterOptions.pending, (state) => {
      state.filterOptionsLoading = true;
      state.filterOptionsError = null;
    });
    builder.addCase(fetchMyTaskFilterOptions.fulfilled, (state, action) => {
      state.filterOptionsLoading = false;
      state.filterOptionStatuses = action.payload.statuses ?? [];
      state.filterOptionPriorities = action.payload.priorities ?? [];
    });
    builder.addCase(fetchMyTaskFilterOptions.rejected, (state, action) => {
      state.filterOptionsLoading = false;
      state.filterOptionsError = action.payload ?? 'Failed to load filters';
    });

    builder.addCase(fetchMyTaskTabCounts.pending, (state) => {
      state.taskTabCountsLoading = true;
      state.taskTabCountsError = null;
    });
    builder.addCase(fetchMyTaskTabCounts.fulfilled, (state, action) => {
      state.taskTabCountsLoading = false;
      state.taskTabCounts = action.payload.counts ?? { ...DEFAULT_TASK_TAB_COUNTS };
    });
    builder.addCase(fetchMyTaskTabCounts.rejected, (state, action) => {
      state.taskTabCountsLoading = false;
      state.taskTabCountsError = action.payload ?? 'Failed to load counts';
    });

    builder.addCase(fetchMyTasksCalendar.pending, (state) => {
      state.calendarLoading = true;
      state.calendarError = null;
      state.calendarItems = [];
    });
    builder.addCase(fetchMyTasksCalendar.fulfilled, (state, action) => {
      state.calendarLoading = false;
      state.calendarItems = action.payload.results ?? [];
    });
    builder.addCase(fetchMyTasksCalendar.rejected, (state, action) => {
      state.calendarLoading = false;
      state.calendarError = action.payload ?? 'Failed to fetch calendar tasks';
    });
  },
});

export const { setActiveTab, resetMyTasks } = myTaskSlice.actions;

// ─── Selectors ─────────────────────────────────────────────────────────────

export const selectMyTaskItems = (state) => state.myTask?.items ?? [];
export const selectMyTaskLoading = (state) => state.myTask?.loading ?? false;
export const selectMyTaskLoadingMore = (state) => state.myTask?.loadingMore ?? false;
export const selectMyTaskHasMore = (state) => state.myTask?.hasMore ?? false;
export const selectMyTaskPage = (state) => state.myTask?.page ?? 1;
export const selectMyTaskPerSource = (state) => state.myTask?.per_source ?? 5;
export const selectMyTaskActiveTab = (state) => state.myTask?.activeTab ?? 'All';
export const selectMyTaskColumnPrefs = (state) => state.myTask?.columnPrefs ?? [];
export const selectMyTaskError = (state) => state.myTask?.error ?? null;
export const selectMyTaskFilterOptionStatuses = (state) => state.myTask?.filterOptionStatuses ?? [];
export const selectMyTaskFilterOptionPriorities = (state) =>
  state.myTask?.filterOptionPriorities ?? [];
export const selectMyTaskFilterOptionsLoading = (state) =>
  state.myTask?.filterOptionsLoading ?? false;

export const selectMyTaskTabCounts = (state) =>
  state.myTask?.taskTabCounts ?? DEFAULT_TASK_TAB_COUNTS;
export const selectMyTaskTabCountsLoading = (state) => state.myTask?.taskTabCountsLoading ?? false;

export const selectMyTaskCalendarItems = (state) => state.myTask?.calendarItems ?? [];
export const selectMyTaskCalendarLoading = (state) => state.myTask?.calendarLoading ?? false;
export const selectMyTaskCalendarError = (state) => state.myTask?.calendarError ?? null;

export default myTaskSlice.reducer;
