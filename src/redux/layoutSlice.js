import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import apiClient from '@/api/axios';
import {
  postClearLayoutCoordinate,
  postCreateSubSpace,
  postGetLayoutDetail,
  postSaveLayoutCoordinates,
  postSaveSubSpaceLayoutCoordinate,
  postBatchSaveDesksCoworkerCoordinates,
  postClearDeskCoworkerCoordinate,
  postDeleteSubSpace,
} from '@/api/layoutCoordinates';
import { extractErrorMessage } from '@/utils/error-utils';

const initialState = {
  saveLayout: {
    isLoading: false,
    error: null,
    data: null,
  },
  layoutList: {
    data: [],
    isLoading: false,
    error: null,
  },
  layoutDetail: {
    data: null,
    isLoading: false,
    error: null,
    filtersKey: null,
    activeRequestId: 0,
  },
  saveLayoutCoordinates: {
    isLoading: false,
    error: null,
    data: null,
  },
  clearLayoutCoordinate: {
    isLoading: false,
    error: null,
    data: null,
  },
  saveSubSpaceLayoutCoordinate: {
    isLoading: false,
    error: null,
    data: null,
  },
  createSubSpace: {
    isLoading: false,
    error: null,
    data: null,
  },
  deleteSubSpace: {
    isLoading: false,
    error: null,
    data: null,
  },
};

export const saveLayoutWithFiles = createAsyncThunk(
  'layout/saveLayoutWithFiles',
  async ({ center, floor, file }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('center', center);
      formData.append('floor', floor);
      formData.append('files', file);
      formData.append('files', file);

      const response = await apiClient.post(
        '/method/devx.layouts.api.api_layout.save_layout_with_files',
        formData,
      );
      return response?.data?.message || response?.data;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to save layout'),
      );
    }
  },
);

export const fetchLayoutsByCenter = createAsyncThunk(
  'layout/fetchLayoutsByCenter',
  async ({ center }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/resource/Layout', {
        params: {
          fields: JSON.stringify(['name', 'image', 'thumbnail', 'center', 'floor']),
          filters: JSON.stringify(center ? [['center', '=', center]] : []),
          order_by: 'modified desc',
        },
      });
      return response?.data?.data || [];
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch layouts'),
      );
    }
  },
);

/**
 * Normalize get_layout_detail payload (message shape varies by backend version).
 * @param {unknown} raw
 * @returns {object | null}
 */
function normalizeLayoutDetailPayload(raw) {
  if (raw == null) return null;
  let payload = raw;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      return null;
    }
  }
  if (typeof payload !== 'object') return null;
  // Nested envelope: { message: { floor_detail, layout_shapes } }
  if (
    payload.message &&
    typeof payload.message === 'object' &&
    (Array.isArray(payload.message.layout_shapes) || payload.message.floor_detail)
  ) {
    return payload.message;
  }
  // Some APIs nest under `data`
  if (
    payload.data &&
    typeof payload.data === 'object' &&
    !payload.layout &&
    !payload.layout_shapes
  ) {
    return payload.data;
  }
  return payload;
}

export const fetchLayoutDetail = createAsyncThunk(
  'layout/fetchLayoutDetail',
  async ({ floorRef, filters }, { rejectWithValue }) => {
    try {
      const message = await postGetLayoutDetail({ floorRef, filters });
      return normalizeLayoutDetailPayload(message);
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch layout detail'),
      );
    }
  },
);

/**
 * @param {{ floorRef: string, items: Array<{ space_id: string, layout_coordinate: { points: number[][] } | null }> }} param0
 */
export const saveLayoutCoordinates = createAsyncThunk(
  'layout/saveLayoutCoordinates',
  async ({ floorRef, items }, { rejectWithValue }) => {
    try {
      return await postSaveLayoutCoordinates({
        floor_ref: floorRef,
        items,
      });
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to save layout coordinates'),
      );
    }
  },
);

/**
 * @param {{ spaceId: string, floorRef?: string }} param0
 */
export const clearLayoutCoordinate = createAsyncThunk(
  'layout/clearLayoutCoordinate',
  async ({ spaceId, floorRef }, { rejectWithValue }) => {
    try {
      return await postClearLayoutCoordinate({
        space_id: String(spaceId ?? '').trim(),
        floor_ref: String(floorRef ?? '').trim(),
      });
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to clear layout coordinate'),
      );
    }
  },
);

/**
 * @param {{
 *   space_id: string,
 *   sub_space_row_id?: string,
 *   sub_space_coordinate?:
 *     | { x: number, y: number, width: number, height: number }
 *     | { points: number[][] },
 *   sub_space_id?: string,
 *   layout_coordinate?:
 *     | { x: number, y: number, width: number, height: number }
 *     | { points: number[][] },
 * }} param0
 */
export const saveSubSpaceLayoutCoordinate = createAsyncThunk(
  'layout/saveSubSpaceLayoutCoordinate',
  async (payload, { rejectWithValue }) => {
    try {
      return await postSaveSubSpaceLayoutCoordinate(payload);
    } catch (error) {
      return rejectWithValue(
        error.serialized ||
          extractErrorMessage(error, 'Failed to save sub-space layout coordinate'),
      );
    }
  },
);

/**
 * @param {{
 *   space_id: string,
 *   sub_space_name: string,
 *   sub_space_type: string,
 *   sub_space_coordinate: { x: number, y: number, width: number, height: number },
 *   desk_count?: number,
 *   sub_space_area_type?: string | null,
 * }} param0
 */
export const createSubSpace = createAsyncThunk(
  'layout/createSubSpace',
  async (payload, { rejectWithValue }) => {
    try {
      return await postCreateSubSpace(payload);
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to create sub-space'),
      );
    }
  },
);

/**
 * @param {{ space_id: string, sub_space_id: string }} param0
 */
export const deleteSubSpace = createAsyncThunk(
  'layout/deleteSubSpace',
  async ({ space_id, sub_space_id }, { rejectWithValue }) => {
    try {
      return await postDeleteSubSpace({
        space_id: String(space_id ?? '').trim(),
        sub_space_id: String(sub_space_id ?? '').trim(),
      });
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to delete sub-space'),
      );
    }
  },
);

/**
 * @param {{
 *   items: Array<{
 *     space_id: string,
 *     sub_space_id: string,
 *     desk_coordinates: Array<{ desk_id: string, desk_coordinate: { x: number, y: number } }>,
 *   }>,
 * }} param0
 */
export const batchSaveDesksCoworkerCoordinates = createAsyncThunk(
  'layout/batchSaveDesksCoworkerCoordinates',
  async (payload, { rejectWithValue }) => {
    try {
      return await postBatchSaveDesksCoworkerCoordinates(payload);
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to save desk positions'),
      );
    }
  },
);

/**
 * @param {{ space_id: string, sub_space_id: string, desk_id: string }} param0
 */
export const clearDeskCoworkerCoordinate = createAsyncThunk(
  'layout/clearDeskCoworkerCoordinate',
  async (payload, { rejectWithValue }) => {
    try {
      return await postClearDeskCoworkerCoordinate(payload);
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to clear desk position'),
      );
    }
  },
);

const layoutSlice = createSlice({
  name: 'layout',
  initialState,
  reducers: {
    clearLayoutDetail: (state) => {
      state.layoutDetail.data = null;
      state.layoutDetail.error = null;
      state.layoutDetail.isLoading = false;
      state.layoutDetail.filtersKey = null;
      state.layoutDetail.activeRequestId = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(saveLayoutWithFiles.pending, (state) => {
        state.saveLayout.isLoading = true;
        state.saveLayout.error = null;
      })
      .addCase(saveLayoutWithFiles.fulfilled, (state, action) => {
        state.saveLayout.isLoading = false;
        state.saveLayout.data = action.payload;
      })
      .addCase(saveLayoutWithFiles.rejected, (state, action) => {
        state.saveLayout.isLoading = false;
        state.saveLayout.error = action.payload || action.error?.message || 'Failed to save layout';
      })
      .addCase(fetchLayoutsByCenter.pending, (state) => {
        state.layoutList.isLoading = true;
        state.layoutList.error = null;
      })
      .addCase(fetchLayoutsByCenter.fulfilled, (state, action) => {
        state.layoutList.isLoading = false;
        state.layoutList.data = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchLayoutsByCenter.rejected, (state, action) => {
        state.layoutList.isLoading = false;
        state.layoutList.error =
          action.payload || action.error?.message || 'Failed to fetch layouts';
      })
      .addCase(fetchLayoutDetail.pending, (state, action) => {
        state.layoutDetail.error = null;
        state.layoutDetail.activeRequestId = action.meta.requestId;
        // Only block the UI on first load; filter refetches keep existing canvas mounted.
        if (!state.layoutDetail.data) {
          state.layoutDetail.isLoading = true;
        }
      })
      .addCase(fetchLayoutDetail.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.layoutDetail.activeRequestId) {
          return;
        }
        state.layoutDetail.isLoading = false;
        state.layoutDetail.data = action.payload;
        state.layoutDetail.filtersKey = JSON.stringify(action.meta.arg.filters ?? null);
      })
      .addCase(fetchLayoutDetail.rejected, (state, action) => {
        if (action.meta.requestId !== state.layoutDetail.activeRequestId) {
          return;
        }
        state.layoutDetail.isLoading = false;
        state.layoutDetail.error =
          action.payload || action.error?.message || 'Failed to fetch layout detail';
      })
      .addCase(saveLayoutCoordinates.pending, (state) => {
        state.saveLayoutCoordinates.isLoading = true;
        state.saveLayoutCoordinates.error = null;
      })
      .addCase(saveLayoutCoordinates.fulfilled, (state, action) => {
        state.saveLayoutCoordinates.isLoading = false;
        state.saveLayoutCoordinates.data = action.payload;
      })
      .addCase(saveLayoutCoordinates.rejected, (state, action) => {
        state.saveLayoutCoordinates.isLoading = false;
        state.saveLayoutCoordinates.error =
          action.payload || action.error?.message || 'Failed to save layout coordinates';
      })
      .addCase(clearLayoutCoordinate.pending, (state) => {
        state.clearLayoutCoordinate.isLoading = true;
        state.clearLayoutCoordinate.error = null;
      })
      .addCase(clearLayoutCoordinate.fulfilled, (state, action) => {
        state.clearLayoutCoordinate.isLoading = false;
        state.clearLayoutCoordinate.data = action.payload;
      })
      .addCase(clearLayoutCoordinate.rejected, (state, action) => {
        state.clearLayoutCoordinate.isLoading = false;
        state.clearLayoutCoordinate.error =
          action.payload || action.error?.message || 'Failed to clear layout coordinate';
      })
      .addCase(saveSubSpaceLayoutCoordinate.pending, (state) => {
        state.saveSubSpaceLayoutCoordinate.isLoading = true;
        state.saveSubSpaceLayoutCoordinate.error = null;
      })
      .addCase(saveSubSpaceLayoutCoordinate.fulfilled, (state, action) => {
        state.saveSubSpaceLayoutCoordinate.isLoading = false;
        state.saveSubSpaceLayoutCoordinate.data = action.payload;
      })
      .addCase(saveSubSpaceLayoutCoordinate.rejected, (state, action) => {
        state.saveSubSpaceLayoutCoordinate.isLoading = false;
        state.saveSubSpaceLayoutCoordinate.error =
          action.payload || action.error?.message || 'Failed to save sub-space layout coordinate';
      })
      .addCase(createSubSpace.pending, (state) => {
        state.createSubSpace.isLoading = true;
        state.createSubSpace.error = null;
      })
      .addCase(createSubSpace.fulfilled, (state, action) => {
        state.createSubSpace.isLoading = false;
        state.createSubSpace.data = action.payload;
      })
      .addCase(createSubSpace.rejected, (state, action) => {
        state.createSubSpace.isLoading = false;
        state.createSubSpace.error =
          action.payload || action.error?.message || 'Failed to create sub-space';
      })
      .addCase(deleteSubSpace.pending, (state) => {
        state.deleteSubSpace.isLoading = true;
        state.deleteSubSpace.error = null;
      })
      .addCase(deleteSubSpace.fulfilled, (state, action) => {
        state.deleteSubSpace.isLoading = false;
        state.deleteSubSpace.data = action.payload;
      })
      .addCase(deleteSubSpace.rejected, (state, action) => {
        state.deleteSubSpace.isLoading = false;
        state.deleteSubSpace.error =
          action.payload || action.error?.message || 'Failed to delete sub-space';
      });
  },
});

export const { clearLayoutDetail } = layoutSlice.actions;
export default layoutSlice.reducer;
