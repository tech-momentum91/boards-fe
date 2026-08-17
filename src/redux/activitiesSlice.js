import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getActivities } from '@/services/activities-service';

const initialState = {
  list: [],
  entityType: null,
  entityId: null,
  filters: {
    activityType: 'all',
    timePeriod: 'all',
  },
  isLoading: false,
  error: null,
  status: 'idle',
};

export const fetchActivities = createAsyncThunk(
  'activities/fetch',
  async ({ entityType, entityId, filters = {} }, { rejectWithValue }) => {
    const result = await getActivities(entityType, entityId, {
      activityType: filters.activityType === 'all' ? undefined : filters.activityType,
      timePeriod: filters.timePeriod === 'all' ? undefined : filters.timePeriod,
    });
    if (result.error) return rejectWithValue(result.error);
    return {
      entityType,
      entityId,
      filters: { ...initialState.filters, ...filters },
      list: result.data?.activities ?? [],
    };
  },
);

const activitiesSlice = createSlice({
  name: 'activities',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearActivities: (state) => {
      state.list = [];
      state.entityType = null;
      state.entityId = null;
      state.filters = initialState.filters;
      state.error = null;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActivities.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.status = 'loading';
      })
      .addCase(fetchActivities.fulfilled, (state, action) => {
        const { entityType, entityId, filters, list } = action.payload;
        state.list = list;
        state.entityType = entityType;
        state.entityId = entityId;
        state.filters = filters;
        state.isLoading = false;
        state.error = null;
        state.status = 'succeeded';
      })
      .addCase(fetchActivities.rejected, (state, action) => {
        state.list = [];
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load activities.';
        state.status = 'failed';
      });
  },
});

export const { setFilters, clearActivities } = activitiesSlice.actions;
export default activitiesSlice.reducer;
