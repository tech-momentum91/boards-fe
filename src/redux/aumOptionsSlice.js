import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  fetchAssetInOptions as fetchAssetInOptionsApi,
  fetchCenterFloors as fetchCenterFloorsApi,
  fetchSpacesForAssetInFloor as fetchSpacesForAssetInFloorApi,
} from '@/api/assetIn';
import { updateCenterThunk } from '@/redux/centerSlice';
import {
  getCenterLabelSyncFromUpdateAction,
  mapCenterOptionsWithLabelSync,
} from '@/utils/center-label-sync';

const asyncInitial = { status: 'idle', error: null };
const optionsInitial = { ...asyncInitial, centers: [], clients: [] };

const initialState = {
  options: { ...optionsInitial },
  floors: { ...asyncInitial, byCenter: {} },
  spaces: { ...asyncInitial, byFloorKey: {} },
};

export function aumFloorKey(center, blockFloorId) {
  return `${center}::${blockFloorId}`;
}

export const fetchAumOptions = createAsyncThunk(
  'aumOptions/fetchOptions',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchAssetInOptionsApi();
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchAumCenterFloors = createAsyncThunk(
  'aumOptions/fetchCenterFloors',
  async (center, { rejectWithValue }) => {
    try {
      const floors = await fetchCenterFloorsApi(center);
      return { center, floors };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchAumSpacesForFloor = createAsyncThunk(
  'aumOptions/fetchSpacesForFloor',
  async (params, { rejectWithValue }) => {
    try {
      const spaces = await fetchSpacesForAssetInFloorApi(params);
      const key = aumFloorKey(params.center, params.block_floor_id);
      return { key, spaces };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

const aumOptionsSlice = createSlice({
  name: 'aumOptions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAumOptions.pending, (state) => {
        state.options.status = 'loading';
        state.options.error = null;
      })
      .addCase(fetchAumOptions.fulfilled, (state, action) => {
        state.options.status = 'succeeded';
        state.options.error = null;
        state.options.centers = action.payload?.centers ?? [];
        state.options.clients = action.payload?.clients ?? [];
      })
      .addCase(fetchAumOptions.rejected, (state, action) => {
        state.options.status = 'failed';
        state.options.error = action.payload ?? 'Unknown error';
      })
      // Sync AUM center option labels when a center is renamed.
      .addCase(updateCenterThunk.fulfilled, (state, action) => {
        const centerLabelSync = getCenterLabelSyncFromUpdateAction(action);
        if (!centerLabelSync || centerLabelSync.updatedCenterName == null) return;
        if (!Array.isArray(state.options.centers)) return;

        state.options.centers = mapCenterOptionsWithLabelSync(
          state.options.centers,
          centerLabelSync,
        );
      })
      .addCase(fetchAumCenterFloors.pending, (state) => {
        state.floors.status = 'loading';
        state.floors.error = null;
      })
      .addCase(fetchAumCenterFloors.fulfilled, (state, action) => {
        state.floors.status = 'succeeded';
        state.floors.error = null;
        state.floors.byCenter[action.payload.center] = action.payload.floors ?? [];
      })
      .addCase(fetchAumCenterFloors.rejected, (state, action) => {
        state.floors.status = 'failed';
        state.floors.error = action.payload ?? 'Unknown error';
      })
      .addCase(fetchAumSpacesForFloor.pending, (state) => {
        state.spaces.status = 'loading';
        state.spaces.error = null;
      })
      .addCase(fetchAumSpacesForFloor.fulfilled, (state, action) => {
        state.spaces.status = 'succeeded';
        state.spaces.error = null;
        state.spaces.byFloorKey[action.payload.key] = action.payload.spaces ?? [];
      })
      .addCase(fetchAumSpacesForFloor.rejected, (state, action) => {
        state.spaces.status = 'failed';
        state.spaces.error = action.payload ?? 'Unknown error';
      });
  },
});

export const selectAumOptions = (state) => state.aumOptions?.options ?? optionsInitial;
export const selectAumFloors = (state) =>
  state.aumOptions?.floors ?? { ...asyncInitial, byCenter: {} };
export const selectAumSpaces = (state) =>
  state.aumOptions?.spaces ?? { ...asyncInitial, byFloorKey: {} };

export default aumOptionsSlice.reducer;
