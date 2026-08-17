import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  createKnowledgeCenterCaseStudy as createKnowledgeCenterCaseStudyApi,
  deleteKnowledgeCenterCaseStudy as deleteKnowledgeCenterCaseStudyApi,
  fetchKnowledgeCenterCaseStudyDetail as fetchKnowledgeCenterCaseStudyDetailApi,
  fetchKnowledgeCenterCaseStudyList as fetchKnowledgeCenterCaseStudyListApi,
  updateKnowledgeCenterCaseStudy as updateKnowledgeCenterCaseStudyApi,
} from '@/api/knowledgeCenterCaseStudy';
import { extractErrorMessage } from '@/utils/error-utils';

const listInitial = {
  status: 'idle',
  data: [],
  total: 0,
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
  detail: detailInitial,
  mutationStatus: 'idle',
  mutationError: null,
};

export const fetchKnowledgeCenterCaseStudyList = createAsyncThunk(
  'knowledgeCenterCaseStudy/fetchList',
  async (payload, { rejectWithValue }) => {
    try {
      return await fetchKnowledgeCenterCaseStudyListApi(payload ?? {});
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Could not load case studies. Please try again.'),
      );
    }
  },
);

export const fetchKnowledgeCenterCaseStudyDetail = createAsyncThunk(
  'knowledgeCenterCaseStudy/fetchDetail',
  async (name, { rejectWithValue }) => {
    try {
      return await fetchKnowledgeCenterCaseStudyDetailApi(name);
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Could not load case study. Please try again.'),
      );
    }
  },
);

export const createKnowledgeCenterCaseStudy = createAsyncThunk(
  'knowledgeCenterCaseStudy/create',
  async (payload, { rejectWithValue }) => {
    try {
      return await createKnowledgeCenterCaseStudyApi(payload);
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Could not create case study. Please try again.'),
      );
    }
  },
);

export const updateKnowledgeCenterCaseStudy = createAsyncThunk(
  'knowledgeCenterCaseStudy/update',
  async ({ name, payload }, { rejectWithValue }) => {
    try {
      return await updateKnowledgeCenterCaseStudyApi(name, payload);
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Could not update case study. Please try again.'),
      );
    }
  },
);

export const deleteKnowledgeCenterCaseStudy = createAsyncThunk(
  'knowledgeCenterCaseStudy/delete',
  async (name, { rejectWithValue }) => {
    try {
      await deleteKnowledgeCenterCaseStudyApi(name);
      return name;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Could not delete case study. Please try again.'),
      );
    }
  },
);

const knowledgeCenterCaseStudySlice = createSlice({
  name: 'knowledgeCenterCaseStudy',
  initialState,
  reducers: {
    clearKnowledgeCenterCaseStudyDetail: (state) => {
      state.detail = { ...detailInitial };
    },
    clearKnowledgeCenterCaseStudyListError: (state) => {
      state.list.error = null;
    },
    clearKnowledgeCenterCaseStudyMutationError: (state) => {
      state.mutationStatus = 'idle';
      state.mutationError = null;
    },
    setKnowledgeCenterCaseStudyDetailFromCache: (state, action) => {
      state.detail.data = action.payload;
      state.detail.status = 'succeeded';
      state.detail.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchKnowledgeCenterCaseStudyList.pending, (state) => {
        state.list.status = 'loading';
        state.list.error = null;
      })
      .addCase(fetchKnowledgeCenterCaseStudyList.fulfilled, (state, action) => {
        state.list.status = 'succeeded';
        state.list.error = null;
        state.list.data = action.payload?.data ?? [];
        state.list.total = action.payload?.total ?? 0;
      })
      .addCase(fetchKnowledgeCenterCaseStudyList.rejected, (state, action) => {
        state.list.status = 'failed';
        state.list.error = action.payload ?? 'Unknown error';
      })
      .addCase(fetchKnowledgeCenterCaseStudyDetail.pending, (state, action) => {
        const name = action.meta.arg;
        if (state.detail.currentName !== name) {
          state.detail.data = null;
        }
        state.detail.status = 'loading';
        state.detail.error = null;
        state.detail.currentName = name;
      })
      .addCase(fetchKnowledgeCenterCaseStudyDetail.fulfilled, (state, action) => {
        state.detail.status = 'succeeded';
        state.detail.error = null;
        state.detail.data = action.payload ?? null;
      })
      .addCase(fetchKnowledgeCenterCaseStudyDetail.rejected, (state, action) => {
        state.detail.status = 'failed';
        state.detail.error = action.payload ?? 'Unknown error';
      })
      .addCase(createKnowledgeCenterCaseStudy.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(createKnowledgeCenterCaseStudy.fulfilled, (state) => {
        state.mutationStatus = 'succeeded';
        state.mutationError = null;
      })
      .addCase(createKnowledgeCenterCaseStudy.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload ?? 'Unknown error';
      })
      .addCase(updateKnowledgeCenterCaseStudy.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(updateKnowledgeCenterCaseStudy.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.mutationError = null;
        state.detail.data = action.payload ?? state.detail.data;
      })
      .addCase(updateKnowledgeCenterCaseStudy.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload ?? 'Unknown error';
      })
      .addCase(deleteKnowledgeCenterCaseStudy.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(deleteKnowledgeCenterCaseStudy.fulfilled, (state) => {
        state.mutationStatus = 'succeeded';
        state.mutationError = null;
        state.detail = { ...detailInitial };
      })
      .addCase(deleteKnowledgeCenterCaseStudy.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload ?? 'Unknown error';
      });
  },
});

export const {
  clearKnowledgeCenterCaseStudyDetail,
  clearKnowledgeCenterCaseStudyListError,
  clearKnowledgeCenterCaseStudyMutationError,
  setKnowledgeCenterCaseStudyDetailFromCache,
} = knowledgeCenterCaseStudySlice.actions;

export const selectKnowledgeCenterCaseStudyList = (state) =>
  state.knowledgeCenterCaseStudy?.list ?? listInitial;

export const selectKnowledgeCenterCaseStudyDetail = (state) =>
  state.knowledgeCenterCaseStudy?.detail ?? detailInitial;

export const selectKnowledgeCenterCaseStudyMutation = (state) => ({
  status: state.knowledgeCenterCaseStudy?.mutationStatus ?? 'idle',
  error: state.knowledgeCenterCaseStudy?.mutationError ?? null,
});

export default knowledgeCenterCaseStudySlice.reducer;
