import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  CALL_RECORDING_LIST_DEFAULT_PAGE_SIZE,
  createKnowledgeCenterCallRecording as createKnowledgeCenterCallRecordingApi,
  deleteKnowledgeCenterCallRecording as deleteKnowledgeCenterCallRecordingApi,
  fetchKnowledgeCenterCallRecordingCategoryCounts as fetchKnowledgeCenterCallRecordingCategoryCountsApi,
  fetchKnowledgeCenterCallRecordingDetail as fetchKnowledgeCenterCallRecordingDetailApi,
  fetchKnowledgeCenterCallRecordingDetailedView as fetchKnowledgeCenterCallRecordingDetailedViewApi,
  fetchKnowledgeCenterCallRecordingList as fetchKnowledgeCenterCallRecordingListApi,
  updateKnowledgeCenterCallRecording as updateKnowledgeCenterCallRecordingApi,
} from '@/api/knowledgeCenterCallRecording';
import { extractErrorMessage } from '@/utils/error-utils';

const listInitial = {
  status: 'idle',
  data: [],
  total: 0,
  page: 1,
  pageSize: CALL_RECORDING_LIST_DEFAULT_PAGE_SIZE,
  totalPages: 1,
  error: null,
};

const categoryCountsInitial = {
  status: 'idle',
  total: 0,
  byCompany: {},
  error: null,
};

const detailInitial = {
  status: 'idle',
  data: null,
  error: null,
  currentName: null,
};

const initialState = {
  list: listInitial,
  categoryCounts: categoryCountsInitial,
  detail: detailInitial,
  mutationStatus: 'idle',
  mutationError: null,
};

export const fetchKnowledgeCenterCallRecordingCategoryCounts = createAsyncThunk(
  'knowledgeCenterCallRecording/fetchCategoryCounts',
  async (payload, { rejectWithValue }) => {
    try {
      return await fetchKnowledgeCenterCallRecordingCategoryCountsApi(payload ?? {});
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Could not load call recording counts. Please try again.'),
      );
    }
  },
);

export const fetchKnowledgeCenterCallRecordingList = createAsyncThunk(
  'knowledgeCenterCallRecording/fetchList',
  async (payload, { rejectWithValue }) => {
    try {
      return await fetchKnowledgeCenterCallRecordingListApi(payload ?? {});
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Could not load call recordings. Please try again.'),
      );
    }
  },
);

export const fetchKnowledgeCenterCallRecordingDetail = createAsyncThunk(
  'knowledgeCenterCallRecording/fetchDetail',
  async (name, { rejectWithValue }) => {
    try {
      return await fetchKnowledgeCenterCallRecordingDetailApi(name);
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Could not load call recording. Please try again.'),
      );
    }
  },
);

export const fetchKnowledgeCenterCallRecordingDetailedView = createAsyncThunk(
  'knowledgeCenterCallRecording/fetchDetailedView',
  async (name, { rejectWithValue }) => {
    try {
      return await fetchKnowledgeCenterCallRecordingDetailedViewApi(name);
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Could not load call recording. Please try again.'),
      );
    }
  },
);

export const createKnowledgeCenterCallRecording = createAsyncThunk(
  'knowledgeCenterCallRecording/create',
  async (payload, { rejectWithValue }) => {
    try {
      return await createKnowledgeCenterCallRecordingApi(payload);
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Could not create call recording. Please try again.'),
      );
    }
  },
);

export const updateKnowledgeCenterCallRecording = createAsyncThunk(
  'knowledgeCenterCallRecording/update',
  async ({ name, payload }, { rejectWithValue }) => {
    try {
      return await updateKnowledgeCenterCallRecordingApi(name, payload);
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Could not update call recording. Please try again.'),
      );
    }
  },
);

export const deleteKnowledgeCenterCallRecording = createAsyncThunk(
  'knowledgeCenterCallRecording/delete',
  async (name, { rejectWithValue }) => {
    try {
      await deleteKnowledgeCenterCallRecordingApi(name);
      return name;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Could not delete call recording. Please try again.'),
      );
    }
  },
);

const knowledgeCenterCallRecordingSlice = createSlice({
  name: 'knowledgeCenterCallRecording',
  initialState,
  reducers: {
    clearKnowledgeCenterCallRecordingDetail: (state) => {
      state.detail = { ...detailInitial };
    },
    clearKnowledgeCenterCallRecordingListError: (state) => {
      state.list.error = null;
    },
    clearKnowledgeCenterCallRecordingMutationError: (state) => {
      state.mutationStatus = 'idle';
      state.mutationError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchKnowledgeCenterCallRecordingCategoryCounts.pending, (state) => {
        state.categoryCounts.status = 'loading';
        state.categoryCounts.error = null;
      })
      .addCase(fetchKnowledgeCenterCallRecordingCategoryCounts.fulfilled, (state, action) => {
        state.categoryCounts.status = 'succeeded';
        state.categoryCounts.error = null;
        state.categoryCounts.total = action.payload?.total ?? 0;
        state.categoryCounts.byCompany = action.payload?.byCompany ?? {};
      })
      .addCase(fetchKnowledgeCenterCallRecordingCategoryCounts.rejected, (state, action) => {
        state.categoryCounts.status = 'failed';
        state.categoryCounts.error = action.payload ?? 'Unknown error';
      })
      .addCase(fetchKnowledgeCenterCallRecordingList.pending, (state) => {
        state.list.status = 'loading';
        state.list.error = null;
      })
      .addCase(fetchKnowledgeCenterCallRecordingList.fulfilled, (state, action) => {
        state.list.status = 'succeeded';
        state.list.error = null;
        state.list.data = action.payload?.data ?? [];
        state.list.total = action.payload?.total ?? 0;
        state.list.page = action.payload?.page ?? 1;
        state.list.pageSize = action.payload?.pageSize ?? CALL_RECORDING_LIST_DEFAULT_PAGE_SIZE;
        state.list.totalPages = action.payload?.totalPages ?? 1;
      })
      .addCase(fetchKnowledgeCenterCallRecordingList.rejected, (state, action) => {
        state.list.status = 'failed';
        state.list.error = action.payload ?? 'Unknown error';
      })
      .addCase(fetchKnowledgeCenterCallRecordingDetail.pending, (state, action) => {
        const name = action.meta.arg;
        if (state.detail.currentName !== name) {
          state.detail.data = null;
        }
        state.detail.status = 'loading';
        state.detail.error = null;
        state.detail.currentName = name;
      })
      .addCase(fetchKnowledgeCenterCallRecordingDetail.fulfilled, (state, action) => {
        state.detail.status = 'succeeded';
        state.detail.error = null;
        state.detail.data = action.payload ?? null;
      })
      .addCase(fetchKnowledgeCenterCallRecordingDetail.rejected, (state, action) => {
        state.detail.status = 'failed';
        state.detail.error = action.payload ?? 'Unknown error';
      })
      .addCase(fetchKnowledgeCenterCallRecordingDetailedView.pending, (state, action) => {
        const name = action.meta.arg;
        if (state.detail.currentName !== name) {
          state.detail.data = null;
        }
        state.detail.status = 'loading';
        state.detail.error = null;
        state.detail.currentName = name;
      })
      .addCase(fetchKnowledgeCenterCallRecordingDetailedView.fulfilled, (state, action) => {
        state.detail.status = 'succeeded';
        state.detail.error = null;
        state.detail.data = action.payload ?? null;
      })
      .addCase(fetchKnowledgeCenterCallRecordingDetailedView.rejected, (state, action) => {
        state.detail.status = 'failed';
        state.detail.error = action.payload ?? 'Unknown error';
      })
      .addCase(createKnowledgeCenterCallRecording.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(createKnowledgeCenterCallRecording.fulfilled, (state) => {
        state.mutationStatus = 'succeeded';
        state.mutationError = null;
      })
      .addCase(createKnowledgeCenterCallRecording.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload ?? 'Unknown error';
      })
      .addCase(updateKnowledgeCenterCallRecording.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(updateKnowledgeCenterCallRecording.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.mutationError = null;
        state.detail.data = action.payload ?? state.detail.data;
      })
      .addCase(updateKnowledgeCenterCallRecording.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload ?? 'Unknown error';
      })
      .addCase(deleteKnowledgeCenterCallRecording.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(deleteKnowledgeCenterCallRecording.fulfilled, (state) => {
        state.mutationStatus = 'succeeded';
        state.mutationError = null;
        state.detail = { ...detailInitial };
      })
      .addCase(deleteKnowledgeCenterCallRecording.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload ?? 'Unknown error';
      });
  },
});

export const {
  clearKnowledgeCenterCallRecordingDetail,
  clearKnowledgeCenterCallRecordingListError,
  clearKnowledgeCenterCallRecordingMutationError,
} = knowledgeCenterCallRecordingSlice.actions;

export const selectKnowledgeCenterCallRecordingList = (state) =>
  state.knowledgeCenterCallRecording?.list ?? listInitial;

export const selectKnowledgeCenterCallRecordingCategoryCounts = (state) =>
  state.knowledgeCenterCallRecording?.categoryCounts ?? categoryCountsInitial;

export const selectKnowledgeCenterCallRecordingDetail = (state) =>
  state.knowledgeCenterCallRecording?.detail ?? detailInitial;

export const selectKnowledgeCenterCallRecordingMutation = (state) => ({
  status: state.knowledgeCenterCallRecording?.mutationStatus ?? 'idle',
  error: state.knowledgeCenterCallRecording?.mutationError ?? null,
});

export default knowledgeCenterCallRecordingSlice.reducer;
