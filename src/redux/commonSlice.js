import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

const RESOURCE_TYPE_DOCTYPE = 'Resource Type';
const RESOURCE_TYPE_NAME_FIELD = 'resource_type_name';
const RESOURCE_TYPE_DISABLE_FIELD = 'disable';
const COMMON_AREA_DOCTYPE = 'Space Common Area';

const initialState = {
  resourceTypes: {
    data: [], // [{ value, label }]
    isLoading: false,
    error: null,
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  },
  commonAreaTypes: {
    data: [],
    isLoading: false,
    error: null,
    status: 'idle',
  },
  /** Resource types that have bookable Resource spaces in the selected center (booking drawers) */
  resourceTypesForCenter: {
    data: [],
    isLoading: false,
    error: null,
    status: 'idle',
    forCenterId: null,
    lastRequestedCenter: null,
  },
};

export const fetchResourceTypes = createAsyncThunk(
  'common/fetchResourceTypes',
  async (_, { rejectWithValue }) => {
    try {
      const payload = {
        doctype: RESOURCE_TYPE_DOCTYPE,
        keyword: '',
        filters: [[RESOURCE_TYPE_DISABLE_FIELD, '!=', 1]],
        limit_page_length: 500,
        page: 1,
        order_by: `${RESOURCE_TYPE_NAME_FIELD} asc`,
      };

      const response = await apiClient.post(
        '/method/devx.api.listview.list_with_search_filters',
        payload,
      );

      const message = response?.data?.message || {};
      const rawData = Array.isArray(message.results)
        ? message.results
        : Array.isArray(message.data)
          ? message.data
          : Array.isArray(message)
            ? message
            : [];

      const options = rawData
        .map((row) => ({
          value: row.name ?? '',
          label: row[RESOURCE_TYPE_NAME_FIELD] ?? row.name ?? '',
        }))
        .filter((opt) => opt.value && opt.label);

      return options;
    } catch (error) {
      return rejectWithValue(error?.response?.data || error?.message || error);
    }
  },
);

export const fetchCommonAreaTypes = createAsyncThunk(
  'common/fetchCommonAreaTypes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.list_with_search_filters', {
        doctype: COMMON_AREA_DOCTYPE,
        limit_page_length: 500,
        page: 1,
      });
      const results = response?.data?.message?.results ?? [];
      return results
        .map((row) => ({ value: row.name ?? '', label: row.name ?? '' }))
        .filter((opt) => opt.value);
    } catch (error) {
      return rejectWithValue(error?.response?.data || error?.message || error);
    }
  },
);

const normCenterKey = (x) => (x == null || x === '' ? null : x);

export const fetchResourceTypesForCenter = createAsyncThunk(
  'common/fetchResourceTypesForCenter',
  async (centerId, { rejectWithValue }) => {
    const cid = typeof centerId === 'string' ? centerId.trim() : centerId || '';
    if (!cid) {
      return { centerId: null, options: [] };
    }
    try {
      const response = await apiClient.get(
        '/method/devx.seat_inventory.doctype.space.space.get_bookable_resource_types_for_center',
        { params: { center: cid } },
      );
      const message = response?.data?.message ?? response?.data;
      const raw = Array.isArray(message) ? message : [];
      const options = raw
        .map((row) => ({
          value: row.value ?? row.name ?? '',
          label: row.label ?? row.resource_type_name ?? row.value ?? '',
        }))
        .filter((o) => o.value);
      return { centerId: cid, options };
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? extractErrorMessage(error, 'Failed to load resource types'),
      );
    }
  },
);

const commonSlice = createSlice({
  name: 'common',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchResourceTypes.pending, (state) => {
        state.resourceTypes.status = 'loading';
        state.resourceTypes.isLoading = true;
        state.resourceTypes.error = null;
      })
      .addCase(fetchResourceTypes.fulfilled, (state, action) => {
        state.resourceTypes.status = 'succeeded';
        state.resourceTypes.isLoading = false;
        state.resourceTypes.data = action.payload ?? [];
        state.resourceTypes.error = null;
      })
      .addCase(fetchResourceTypes.rejected, (state, action) => {
        state.resourceTypes.status = 'failed';
        state.resourceTypes.isLoading = false;
        state.resourceTypes.error =
          action.payload ?? action.error?.message ?? 'Failed to load resource types';
        state.resourceTypes.data = [];
      })
      .addCase(fetchCommonAreaTypes.pending, (state) => {
        state.commonAreaTypes.status = 'loading';
        state.commonAreaTypes.isLoading = true;
        state.commonAreaTypes.error = null;
      })
      .addCase(fetchCommonAreaTypes.fulfilled, (state, action) => {
        state.commonAreaTypes.status = 'succeeded';
        state.commonAreaTypes.isLoading = false;
        state.commonAreaTypes.data = action.payload ?? [];
        state.commonAreaTypes.error = null;
      })
      .addCase(fetchCommonAreaTypes.rejected, (state, action) => {
        state.commonAreaTypes.status = 'failed';
        state.commonAreaTypes.isLoading = false;
        state.commonAreaTypes.error =
          action.payload ?? action.error?.message ?? 'Failed to load common area types';
        state.commonAreaTypes.data = [];
      })
      .addCase(fetchResourceTypesForCenter.pending, (state, action) => {
        const raw = action.meta.arg;
        const cid = typeof raw === 'string' ? raw.trim() : raw || '';
        state.resourceTypesForCenter.lastRequestedCenter = cid || null;
        state.resourceTypesForCenter.status = 'loading';
        state.resourceTypesForCenter.isLoading = true;
        state.resourceTypesForCenter.error = null;
        state.resourceTypesForCenter.data = [];
        state.resourceTypesForCenter.forCenterId = null;
      })
      .addCase(fetchResourceTypesForCenter.fulfilled, (state, action) => {
        const payloadCid = action.payload.centerId;
        const expected = state.resourceTypesForCenter.lastRequestedCenter;
        if (normCenterKey(payloadCid) !== normCenterKey(expected)) {
          return;
        }
        state.resourceTypesForCenter.status = 'succeeded';
        state.resourceTypesForCenter.isLoading = false;
        state.resourceTypesForCenter.data = action.payload.options ?? [];
        state.resourceTypesForCenter.forCenterId = payloadCid;
        state.resourceTypesForCenter.error = null;
      })
      .addCase(fetchResourceTypesForCenter.rejected, (state, action) => {
        const raw = action.meta.arg;
        const failedFor = typeof raw === 'string' ? raw.trim() : raw || '';
        if (
          normCenterKey(failedFor) !==
          normCenterKey(state.resourceTypesForCenter.lastRequestedCenter)
        ) {
          return;
        }
        state.resourceTypesForCenter.status = 'failed';
        state.resourceTypesForCenter.isLoading = false;
        state.resourceTypesForCenter.error =
          action.payload ?? action.error?.message ?? 'Failed to load resource types';
        state.resourceTypesForCenter.data = [];
        state.resourceTypesForCenter.forCenterId = null;
      });
  },
});

export const selectResourceTypes = (state) => state.common.resourceTypes;
export const selectResourceTypesData = (state) => state.common.resourceTypes.data;
export const selectResourceTypesLoading = (state) => state.common.resourceTypes.isLoading;

export const selectCommonAreaTypes = (state) => state.common.commonAreaTypes;
export const selectCommonAreaTypesData = (state) => state.common.commonAreaTypes.data;

export const selectResourceTypesForCenter = (state) => state.common.resourceTypesForCenter;

export default commonSlice.reducer;
