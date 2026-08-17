import apiClient from '@/api';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export const createSettingsTrackerThunk = createAsyncThunk(
  'settingsTracker/createSettingsTracker',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/resource/Tracker Master', payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const createSettingsTrackerTaskThunk = createAsyncThunk(
  'settingsTracker/createSettingsTrackerTask',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/resource/Tracker Task Master', payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const fetchTaskDetailThunk = createAsyncThunk(
  'settingsTracker/fetchTaskDetailThunk',
  async (task_name, { rejectWithValue }) => {
    try {
      const encoded = encodeURIComponent(String(task_name));
      const response = await apiClient.get(`/resource/Tracker Task Master/${encoded}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const deleteTrackerThunk = createAsyncThunk(
  'settingsTracker/deleteTrackerThunk',
  async (tracker_id, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/resource/Tracker Master/${tracker_id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const deleteTrackerTaskThunk = createAsyncThunk(
  'settingsTracker/deleteTrackerTaskThunk',
  async (task_name, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/resource/Tracker Task Master/${task_name}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const getSettingsTrackerListThunk = createAsyncThunk(
  'settingsTracker/getSettingsTrackerList',
  async (
    { keyword = '', page = 1, limit_page_length = 20, append = false } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await apiClient.get(
        '/method/devx.tracker.api.listview.get_tracker_listview',
        {
          params: {
            keyword,
            page,
            limit_page_length,
            order_by: 'creation desc',
          },
        },
      );
      const message = response?.data?.message ?? response?.data ?? {};
      const results = message.results ?? message.data ?? [];
      const totalCount = message.total_count ?? message.count ?? results.length;
      const pageSize = message.limit_page_length ?? message.page_size ?? limit_page_length;
      const currentPage = message.page ?? page;
      const hasMore = currentPage * pageSize < totalCount;

      return {
        raw: response.data,
        results,
        totalCount,
        page: currentPage,
        pageSize,
        hasMore,
        append,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const getSettingsTrackerTaskListThunk = createAsyncThunk(
  'settingsTracker/getSettingsTrackerTaskList',
  async (
    { tracker_id, keyword = '', page = 1, limit_page_length = 20, append = false } = {},
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
      const totalCount = message.total_count ?? message.count ?? results.length;
      const pageSize = message.limit_page_length ?? message.page_size ?? limit_page_length;
      const currentPage = message.page ?? page;
      const hasMore = currentPage * pageSize < totalCount;

      return {
        raw: response.data,
        results,
        totalCount,
        page: currentPage,
        pageSize,
        hasMore,
        append,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

const initialState = {
  createSettingsTracker: {
    isLoading: false,
    error: null,
    status: null,
  },
  createSettingsTrackerTask: {
    isLoading: false,
    error: null,
    status: null,
  },

  getSettingsTrackerList: {
    isLoading: false,
    isLoadingMore: false,
    error: null,
    status: null,
    data: [],
    page: 1,
    pageSize: 20,
    totalCount: 0,
    hasMore: false,
  },
  getSettingsTrackerTaskList: {
    isLoading: false,
    isLoadingMore: false,
    error: null,
    status: null,
    data: [],
    page: 1,
    pageSize: 20,
    totalCount: 0,
    hasMore: false,
  },

  taskDetail: {
    data: null,
    isLoading: false,
    error: null,
    status: null,
  },

  deleteTracker: {
    isLoading: false,
    error: null,
  },

  deleteTrackerTask: {
    isLoading: false,
    error: null,
  },
};

const settingsTrackerSlice = createSlice({
  name: 'settingsTracker',
  initialState,
  reducers: {
    clearTaskDetail(state) {
      state.taskDetail.data = null;
      state.taskDetail.isLoading = false;
      state.taskDetail.error = null;
      state.taskDetail.status = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(createSettingsTrackerThunk.pending, (state) => {
      state.createSettingsTracker.isLoading = true;
      state.createSettingsTracker.error = null;
      state.createSettingsTracker.status = null;
    });

    builder.addCase(createSettingsTrackerThunk.fulfilled, (state, action) => {
      state.createSettingsTracker.isLoading = false;
      state.createSettingsTracker.status = action.payload?.status || 200;
      state.createSettingsTracker.error = null;
    });

    builder.addCase(createSettingsTrackerThunk.rejected, (state, action) => {
      state.createSettingsTracker.isLoading = false;
      state.createSettingsTracker.error = action.payload;
      state.createSettingsTracker.status = action.payload?.status || 500;
    });

    builder.addCase(createSettingsTrackerTaskThunk.pending, (state) => {
      state.createSettingsTrackerTask.isLoading = true;
      state.createSettingsTrackerTask.error = null;
      state.createSettingsTrackerTask.status = null;
    });

    builder.addCase(createSettingsTrackerTaskThunk.fulfilled, (state, action) => {
      state.createSettingsTrackerTask.isLoading = false;
      state.createSettingsTrackerTask.status = action.payload?.status || 200;
      state.createSettingsTrackerTask.error = null;
    });

    builder.addCase(createSettingsTrackerTaskThunk.rejected, (state, action) => {
      state.createSettingsTrackerTask.isLoading = false;
      state.createSettingsTrackerTask.error = action.payload;
      state.createSettingsTrackerTask.status = action.payload?.status || 500;
    });

    builder.addCase(getSettingsTrackerListThunk.pending, (state, action) => {
      if (action.meta.arg?.append) {
        state.getSettingsTrackerList.isLoadingMore = true;
      } else {
        state.getSettingsTrackerList.isLoading = true;
      }
      state.getSettingsTrackerList.error = null;
      state.getSettingsTrackerList.status = null;
    });

    builder.addCase(getSettingsTrackerListThunk.fulfilled, (state, action) => {
      state.getSettingsTrackerList.isLoading = false;
      state.getSettingsTrackerList.isLoadingMore = false;
      state.getSettingsTrackerList.status = action.payload?.status || 200;
      state.getSettingsTrackerList.error = null;
      state.getSettingsTrackerList.page = action.payload?.page ?? 1;
      state.getSettingsTrackerList.pageSize = action.payload?.pageSize ?? 20;
      state.getSettingsTrackerList.totalCount = action.payload?.totalCount ?? 0;
      state.getSettingsTrackerList.hasMore = Boolean(action.payload?.hasMore);
      if (action.payload?.append) {
        state.getSettingsTrackerList.data = [
          ...(state.getSettingsTrackerList.data || []),
          ...(action.payload?.results || []),
        ];
      } else {
        state.getSettingsTrackerList.data = action.payload?.results || [];
      }
    });

    builder.addCase(getSettingsTrackerListThunk.rejected, (state, action) => {
      state.getSettingsTrackerList.isLoading = false;
      state.getSettingsTrackerList.isLoadingMore = false;
      state.getSettingsTrackerList.error = action.payload;
      state.getSettingsTrackerList.status = action.payload?.status || 500;
    });

    builder.addCase(getSettingsTrackerTaskListThunk.pending, (state, action) => {
      if (action.meta.arg?.append) {
        state.getSettingsTrackerTaskList.isLoadingMore = true;
      } else {
        state.getSettingsTrackerTaskList.isLoading = true;
      }
      state.getSettingsTrackerTaskList.error = null;
      state.getSettingsTrackerTaskList.status = null;
    });

    builder.addCase(getSettingsTrackerTaskListThunk.fulfilled, (state, action) => {
      state.getSettingsTrackerTaskList.isLoading = false;
      state.getSettingsTrackerTaskList.isLoadingMore = false;
      state.getSettingsTrackerTaskList.status = action.payload?.status || 200;
      state.getSettingsTrackerTaskList.error = null;
      state.getSettingsTrackerTaskList.page = action.payload?.page ?? 1;
      state.getSettingsTrackerTaskList.pageSize = action.payload?.pageSize ?? 20;
      state.getSettingsTrackerTaskList.totalCount = action.payload?.totalCount ?? 0;
      state.getSettingsTrackerTaskList.hasMore = Boolean(action.payload?.hasMore);

      if (action.payload?.append) {
        state.getSettingsTrackerTaskList.data = [
          ...(state.getSettingsTrackerTaskList.data || []),
          ...(action.payload?.results || []),
        ];
      } else {
        state.getSettingsTrackerTaskList.data = action.payload?.results || [];
      }
    });

    builder.addCase(getSettingsTrackerTaskListThunk.rejected, (state, action) => {
      state.getSettingsTrackerTaskList.isLoading = false;
      state.getSettingsTrackerTaskList.isLoadingMore = false;
      state.getSettingsTrackerTaskList.error = action.payload;
      state.getSettingsTrackerTaskList.status = action.payload?.status || 500;
    });

    builder.addCase(fetchTaskDetailThunk.pending, (state) => {
      state.taskDetail.isLoading = true;
      state.taskDetail.data = null;
      state.taskDetail.error = null;
      state.taskDetail.status = null;
    });

    builder.addCase(fetchTaskDetailThunk.fulfilled, (state, action) => {
      state.taskDetail.isLoading = false;
      state.taskDetail.data = action.payload?.data ?? null;
      state.taskDetail.status = action.payload?.status || 200;
      state.taskDetail.error = null;
    });

    builder.addCase(fetchTaskDetailThunk.rejected, (state, action) => {
      state.taskDetail.isLoading = false;
      state.taskDetail.error = action.payload;
      state.taskDetail.status = action.payload?.status || 500;
    });

    builder.addCase(deleteTrackerThunk.pending, (state) => {
      state.deleteTracker.isLoading = true;
      state.deleteTracker.error = null;
    });

    builder.addCase(deleteTrackerThunk.fulfilled, (state, action) => {
      state.deleteTracker.isLoading = false;
      state.deleteTracker.error = null;
    });

    builder.addCase(deleteTrackerThunk.rejected, (state, action) => {
      state.deleteTracker.isLoading = false;
      state.deleteTracker.error = action.payload;
    });

    builder.addCase(deleteTrackerTaskThunk.pending, (state) => {
      state.deleteTrackerTask.isLoading = true;
      state.deleteTrackerTask.error = null;
    });

    builder.addCase(deleteTrackerTaskThunk.fulfilled, (state, action) => {
      state.deleteTrackerTask.isLoading = false;
      state.deleteTrackerTask.error = null;
    });

    builder.addCase(deleteTrackerTaskThunk.rejected, (state, action) => {
      state.deleteTrackerTask.isLoading = false;
      state.deleteTrackerTask.error = action.payload;
    });
  },
});

export const { clearTaskDetail } = settingsTrackerSlice.actions;
export default settingsTrackerSlice.reducer;
