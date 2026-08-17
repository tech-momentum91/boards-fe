import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  createKnowledgeCenterMedia as createKnowledgeCenterMediaApi,
  fetchKnowledgeCenterMediaCategoryCounts as fetchKnowledgeCenterMediaCategoryCountsApi,
  fetchKnowledgeCenterMediaDetail as fetchKnowledgeCenterMediaDetailApi,
  fetchKnowledgeCenterMediaList as fetchKnowledgeCenterMediaListApi,
  updateKnowledgeCenterMedia as updateKnowledgeCenterMediaApi,
} from '@/api/knowledgeCenterMedia';
import { extractErrorMessage } from '@/utils/error-utils';

const listInitial = {
  status: 'idle',
  data: [],
  total: 0,
  error: null,
};

const categoryCountsInitial = {
  status: 'idle',
  total: 0,
  byMediaType: {},
  error: null,
};

const initialState = {
  list: listInitial,
  categoryCounts: categoryCountsInitial,
  mutationStatus: 'idle',
  mutationError: null,
};

export const fetchKnowledgeCenterMediaCategoryCounts = createAsyncThunk(
  'knowledgeCenterMedia/fetchCategoryCounts',
  async (payload, { rejectWithValue }) => {
    try {
      return await fetchKnowledgeCenterMediaCategoryCountsApi(payload ?? {});
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Could not load media counts. Please try again.'),
      );
    }
  },
);

export const fetchKnowledgeCenterMediaList = createAsyncThunk(
  'knowledgeCenterMedia/fetchList',
  async (payload, { rejectWithValue }) => {
    try {
      return await fetchKnowledgeCenterMediaListApi(payload ?? {});
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Could not load media. Please try again.'));
    }
  },
);

export const createKnowledgeCenterMedia = createAsyncThunk(
  'knowledgeCenterMedia/create',
  async (payload, { rejectWithValue }) => {
    try {
      const record = await createKnowledgeCenterMediaApi(payload);
      return record;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Could not create media. Please try again.'),
      );
    }
  },
);

export const fetchKnowledgeCenterMediaDetail = createAsyncThunk(
  'knowledgeCenterMedia/fetchDetail',
  async (name, { rejectWithValue }) => {
    try {
      return await fetchKnowledgeCenterMediaDetailApi(name);
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Could not load media details. Please try again.'),
      );
    }
  },
);

export const updateKnowledgeCenterMedia = createAsyncThunk(
  'knowledgeCenterMedia/update',
  async ({ name, payload }, { rejectWithValue }) => {
    try {
      return await updateKnowledgeCenterMediaApi(name, payload);
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Could not update media. Please try again.'),
      );
    }
  },
);

const knowledgeCenterMediaSlice = createSlice({
  name: 'knowledgeCenterMedia',
  initialState,
  reducers: {
    clearKnowledgeCenterMediaMutationError: (state) => {
      state.mutationError = null;
      state.mutationStatus = 'idle';
    },
    clearKnowledgeCenterMediaListError: (state) => {
      state.list.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchKnowledgeCenterMediaList.pending, (state) => {
        state.list.status = 'loading';
        state.list.error = null;
      })
      .addCase(fetchKnowledgeCenterMediaList.fulfilled, (state, action) => {
        state.list.status = 'succeeded';
        state.list.error = null;
        state.list.data = action.payload?.data ?? [];
        state.list.total = action.payload?.total ?? 0;
      })
      .addCase(fetchKnowledgeCenterMediaList.rejected, (state, action) => {
        state.list.status = 'failed';
        state.list.error = action.payload ?? 'Unknown error';
      })
      .addCase(fetchKnowledgeCenterMediaCategoryCounts.pending, (state) => {
        state.categoryCounts.status = 'loading';
        state.categoryCounts.error = null;
      })
      .addCase(fetchKnowledgeCenterMediaCategoryCounts.fulfilled, (state, action) => {
        state.categoryCounts.status = 'succeeded';
        state.categoryCounts.error = null;
        state.categoryCounts.total = action.payload?.total ?? 0;
        state.categoryCounts.byMediaType = action.payload?.byMediaType ?? {};
      })
      .addCase(fetchKnowledgeCenterMediaCategoryCounts.rejected, (state, action) => {
        state.categoryCounts.status = 'failed';
        state.categoryCounts.error = action.payload ?? 'Unknown error';
      })
      .addCase(createKnowledgeCenterMedia.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(createKnowledgeCenterMedia.fulfilled, (state) => {
        state.mutationStatus = 'succeeded';
        state.mutationError = null;
      })
      .addCase(createKnowledgeCenterMedia.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload ?? 'Unknown error';
      })
      .addCase(updateKnowledgeCenterMedia.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(updateKnowledgeCenterMedia.fulfilled, (state) => {
        state.mutationStatus = 'succeeded';
        state.mutationError = null;
      })
      .addCase(updateKnowledgeCenterMedia.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload ?? 'Unknown error';
      });
  },
});

export const { clearKnowledgeCenterMediaMutationError, clearKnowledgeCenterMediaListError } =
  knowledgeCenterMediaSlice.actions;

export const selectKnowledgeCenterMediaList = (state) =>
  state.knowledgeCenterMedia?.list ?? listInitial;

export const selectKnowledgeCenterMediaCategoryCounts = (state) =>
  state.knowledgeCenterMedia?.categoryCounts ?? categoryCountsInitial;

export const selectKnowledgeCenterMediaMutation = (state) => ({
  status: state.knowledgeCenterMedia?.mutationStatus ?? 'idle',
  error: state.knowledgeCenterMedia?.mutationError ?? null,
});

export default knowledgeCenterMediaSlice.reducer;
