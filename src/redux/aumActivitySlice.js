import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { fetchAumActivity as fetchAumActivityApi } from '@/api/aumActivity';

const asyncInitial = { status: 'idle', error: null };

const initialState = {
  entityDoctype: null,
  entityId: null,
  ...asyncInitial,
  items: [],
};

export const fetchAumActivity = createAsyncThunk(
  'aumActivity/fetch',
  async ({ entityDoctype, entityId }, { rejectWithValue }) => {
    try {
      const items = await fetchAumActivityApi(entityDoctype, entityId);
      return { entityDoctype, entityId, items };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

const aumActivitySlice = createSlice({
  name: 'aumActivity',
  initialState,
  reducers: {
    clearAumActivity: () => ({ ...initialState }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAumActivity.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.entityDoctype = action.meta.arg?.entityDoctype ?? null;
        state.entityId = action.meta.arg?.entityId ?? null;
      })
      .addCase(fetchAumActivity.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
        state.entityDoctype = action.payload?.entityDoctype ?? null;
        state.entityId = action.payload?.entityId ?? null;
        state.items = action.payload?.items ?? [];
      })
      .addCase(fetchAumActivity.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Unknown error';
        state.items = [];
      });
  },
});

export const { clearAumActivity } = aumActivitySlice.actions;
export default aumActivitySlice.reducer;

export const selectAumActivity = (state) => state.aumActivity ?? initialState;
