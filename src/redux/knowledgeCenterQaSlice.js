import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  createKnowledgeCenterQa as createKnowledgeCenterQaApi,
  deleteKnowledgeCenterQa as deleteKnowledgeCenterQaApi,
  fetchKnowledgeCenterQaDetail as fetchKnowledgeCenterQaDetailApi,
  fetchKnowledgeCenterQaList as fetchKnowledgeCenterQaListApi,
  updateKnowledgeCenterQa as updateKnowledgeCenterQaApi,
} from '@/api/knowledgeCenterQa';
import { extractErrorMessage } from '@/utils/error-utils';

const listInitial = {
  status: 'idle',
  data: [],
  total: 0,
  error: null,
};

const detailInitial = {
  status: 'idle',
  record: null,
  error: null,
};

const initialState = {
  list: listInitial,
  detail: detailInitial,
  mutationStatus: 'idle',
  mutationError: null,
};

export const fetchKnowledgeCenterQaList = createAsyncThunk(
  'knowledgeCenterQa/fetchList',
  async (payload, { rejectWithValue }) => {
    try {
      return await fetchKnowledgeCenterQaListApi(payload ?? {});
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Could not load Q&A list. Please try again.'),
      );
    }
  },
);

export const fetchKnowledgeCenterQaDetail = createAsyncThunk(
  'knowledgeCenterQa/fetchDetail',
  async (name, { rejectWithValue }) => {
    try {
      const record = await fetchKnowledgeCenterQaDetailApi(name);
      return { name, record };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Could not load Q&A. Please try again.'));
    }
  },
);

export const createKnowledgeCenterQa = createAsyncThunk(
  'knowledgeCenterQa/create',
  async (payload, { rejectWithValue }) => {
    try {
      const record = await createKnowledgeCenterQaApi(payload);
      return record;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Could not create Q&A. Please try again.'));
    }
  },
);

export const updateKnowledgeCenterQa = createAsyncThunk(
  'knowledgeCenterQa/update',
  async ({ name, ...fields }, { rejectWithValue }) => {
    try {
      const record = await updateKnowledgeCenterQaApi(name, fields);
      return record;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Could not update Q&A. Please try again.'));
    }
  },
);

export const deleteKnowledgeCenterQa = createAsyncThunk(
  'knowledgeCenterQa/delete',
  async (name, { rejectWithValue }) => {
    try {
      await deleteKnowledgeCenterQaApi(name);
      return name;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Could not delete Q&A. Please try again.'));
    }
  },
);

const knowledgeCenterQaSlice = createSlice({
  name: 'knowledgeCenterQa',
  initialState,
  reducers: {
    clearKnowledgeCenterQaDetail: (state) => {
      state.detail = { ...detailInitial };
    },
    clearKnowledgeCenterQaMutationError: (state) => {
      state.mutationError = null;
      state.mutationStatus = 'idle';
    },
    clearKnowledgeCenterQaListError: (state) => {
      state.list.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchKnowledgeCenterQaList.pending, (state) => {
        state.list.status = 'loading';
        state.list.error = null;
      })
      .addCase(fetchKnowledgeCenterQaList.fulfilled, (state, action) => {
        state.list.status = 'succeeded';
        state.list.error = null;
        state.list.data = action.payload?.data ?? [];
        state.list.total = action.payload?.total ?? 0;
      })
      .addCase(fetchKnowledgeCenterQaList.rejected, (state, action) => {
        state.list.status = 'failed';
        state.list.error = action.payload ?? 'Unknown error';
      })
      .addCase(fetchKnowledgeCenterQaDetail.pending, (state, action) => {
        state.detail.error = null;
        const name = action.meta.arg;
        // Background refetch (polling, post-save): same doc — keep succeeded so UI does not flash skeleton.
        if (state.detail.record?.name === name) {
          return;
        }
        state.detail.status = 'loading';
      })
      .addCase(fetchKnowledgeCenterQaDetail.fulfilled, (state, action) => {
        state.detail.status = 'succeeded';
        state.detail.error = null;
        state.detail.record = action.payload?.record ?? null;
      })
      .addCase(fetchKnowledgeCenterQaDetail.rejected, (state, action) => {
        state.detail.status = 'failed';
        state.detail.record = null;
        state.detail.error = action.payload ?? 'Unknown error';
      })
      .addCase(createKnowledgeCenterQa.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(createKnowledgeCenterQa.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.mutationError = null;
        state.detail.record = action.payload ?? null;
      })
      .addCase(createKnowledgeCenterQa.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload ?? 'Unknown error';
      })
      .addCase(updateKnowledgeCenterQa.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(updateKnowledgeCenterQa.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.mutationError = null;
        state.detail.record = action.payload ?? state.detail.record;
      })
      .addCase(updateKnowledgeCenterQa.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload ?? 'Unknown error';
      })
      .addCase(deleteKnowledgeCenterQa.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(deleteKnowledgeCenterQa.fulfilled, (state) => {
        state.mutationStatus = 'succeeded';
        state.mutationError = null;
        state.detail.record = null;
      })
      .addCase(deleteKnowledgeCenterQa.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload ?? 'Unknown error';
      });
  },
});

export const {
  clearKnowledgeCenterQaDetail,
  clearKnowledgeCenterQaMutationError,
  clearKnowledgeCenterQaListError,
} = knowledgeCenterQaSlice.actions;

/** @param {import('@reduxjs/toolkit').RootState | { knowledgeCenterQa?: object }} state */
export const selectKnowledgeCenterQaList = (state) => state.knowledgeCenterQa?.list ?? listInitial;

/** @param {import('@reduxjs/toolkit').RootState | { knowledgeCenterQa?: object }} state */
export const selectKnowledgeCenterQaDetail = (state) =>
  state.knowledgeCenterQa?.detail ?? detailInitial;

export default knowledgeCenterQaSlice.reducer;
