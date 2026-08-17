import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  fetchAssetInDetail as fetchAssetInDetailApi,
  fetchAssetInFloorLayout as fetchAssetInFloorLayoutApi,
  fetchAssetInList as fetchAssetInListApi,
  fetchAssetInProducts as fetchAssetInProductsApi,
  resolveAssetInItemGroupHierarchy as resolveAssetInItemGroupHierarchyApi,
  saveAssetIn as saveAssetInApi,
  saveAssetInDraft as saveAssetInDraftApi,
  submitAssetIn as submitAssetInApi,
} from '@/api/assetIn';
import { downloadBarcodesPdf } from '@/api/barcodeExport';
import {
  applyAumListFulfilled,
  applyAumListRejected,
  createAumListState,
  setAumListPending,
} from '@/components/aum/aum-list-pagination';
import { aumFloorKey } from '@/redux/aumOptionsSlice';

const asyncInitial = { status: 'idle', error: null };

const listInitial = createAumListState();
const detailInitial = { ...asyncInitial, record: null };
const productsInitial = { ...asyncInitial, items: [] };
const floorLayoutInitial = { ...asyncInitial, data: null };

const initialState = {
  list: { ...listInitial },
  detail: { ...detailInitial },
  floorLayout: { ...floorLayoutInitial },
  products: { ...productsInitial },
  mutations: {
    saveStatus: 'idle',
    submitStatus: 'idle',
    exportBarcodesStatus: 'idle',
    error: null,
  },
};

export const fetchAssetInList = createAsyncThunk(
  'aumAssetIn/fetchList',
  async (params, { rejectWithValue }) => {
    try {
      const result = await fetchAssetInListApi(params ?? {});
      return {
        ...result,
        page: result.page ?? params?.page ?? 1,
      };
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.name === 'AbortError') {
        throw error;
      }
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchAssetInDetail = createAsyncThunk(
  'aumAssetIn/fetchDetail',
  async (name, { rejectWithValue }) => {
    try {
      const record = await fetchAssetInDetailApi(name);
      return { name, record };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchAssetInProducts = createAsyncThunk(
  'aumAssetIn/fetchProducts',
  async (params, { rejectWithValue }) => {
    try {
      const items = await fetchAssetInProductsApi(params ?? {});
      return items;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchAssetInFloorLayout = createAsyncThunk(
  'aumAssetIn/fetchFloorLayout',
  async (params, { rejectWithValue }) => {
    try {
      const data = await fetchAssetInFloorLayoutApi(params);
      return { key: aumFloorKey(params.center, params.block_floor_id), data };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const resolveAssetInItemGroupHierarchy = createAsyncThunk(
  'aumAssetIn/resolveItemGroupHierarchy',
  async (itemGroup, { rejectWithValue }) => {
    try {
      return await resolveAssetInItemGroupHierarchyApi(itemGroup);
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const saveAssetIn = createAsyncThunk(
  'aumAssetIn/save',
  async (payload, { rejectWithValue }) => {
    try {
      return await saveAssetInApi(payload);
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const saveAssetInDraft = createAsyncThunk(
  'aumAssetIn/saveDraft',
  async (payload, { rejectWithValue }) => {
    try {
      return await saveAssetInDraftApi(payload);
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const submitAssetIn = createAsyncThunk(
  'aumAssetIn/submit',
  async ({ name, rows }, { rejectWithValue }) => {
    try {
      return await submitAssetInApi(name, rows);
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const exportAssetInBarcodes = createAsyncThunk(
  'aumAssetIn/exportBarcodes',
  async (assetInNames, { rejectWithValue }) => {
    try {
      return await downloadBarcodesPdf({ assetInNames });
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

const aumAssetInSlice = createSlice({
  name: 'aumAssetIn',
  initialState,
  reducers: {
    resetAssetInList: (state) => {
      state.list = { ...listInitial };
    },
    clearAssetInDetail: (state) => {
      state.detail = { ...detailInitial };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssetInList.pending, (state, action) => {
        setAumListPending(state.list, action);
      })
      .addCase(fetchAssetInList.fulfilled, (state, action) => {
        applyAumListFulfilled(state.list, action, { dataKey: 'items' });
      })
      .addCase(fetchAssetInList.rejected, (state, action) => {
        applyAumListRejected(state.list, action, { dataKey: 'items' });
      })
      .addCase(fetchAssetInDetail.pending, (state, action) => {
        state.detail.error = null;
        const name = action.meta.arg;
        if (state.detail.record?.name === name) return;
        state.detail.status = 'loading';
      })
      .addCase(fetchAssetInDetail.fulfilled, (state, action) => {
        state.detail.status = 'succeeded';
        state.detail.error = null;
        state.detail.record = action.payload?.record ?? null;
      })
      .addCase(fetchAssetInDetail.rejected, (state, action) => {
        state.detail.status = 'failed';
        state.detail.record = null;
        state.detail.error = action.payload ?? 'Unknown error';
      })
      .addCase(fetchAssetInProducts.pending, (state) => {
        state.products.status = 'loading';
        state.products.error = null;
      })
      .addCase(fetchAssetInProducts.fulfilled, (state, action) => {
        state.products.status = 'succeeded';
        state.products.error = null;
        state.products.items = action.payload ?? [];
      })
      .addCase(fetchAssetInProducts.rejected, (state, action) => {
        state.products.status = 'failed';
        state.products.error = action.payload ?? 'Unknown error';
        state.products.items = [];
      })
      .addCase(fetchAssetInFloorLayout.pending, (state) => {
        state.floorLayout.status = 'loading';
        state.floorLayout.error = null;
      })
      .addCase(fetchAssetInFloorLayout.fulfilled, (state, action) => {
        state.floorLayout.status = 'succeeded';
        state.floorLayout.error = null;
        state.floorLayout.data = action.payload;
      })
      .addCase(fetchAssetInFloorLayout.rejected, (state, action) => {
        state.floorLayout.status = 'failed';
        state.floorLayout.error = action.payload ?? 'Unknown error';
        state.floorLayout.data = null;
      })
      .addCase(saveAssetIn.pending, (state) => {
        state.mutations.saveStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(saveAssetIn.fulfilled, (state, action) => {
        state.mutations.saveStatus = 'succeeded';
        state.mutations.error = null;
        const saveAction = action.meta.arg?.action;
        if (saveAction && saveAction !== 'save_draft' && action.payload?.data) {
          state.detail.record = action.payload.data;
        }
      })
      .addCase(saveAssetIn.rejected, (state, action) => {
        state.mutations.saveStatus = 'failed';
        state.mutations.error = action.payload ?? 'Unknown error';
      })
      .addCase(saveAssetInDraft.pending, (state) => {
        state.mutations.saveStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(saveAssetInDraft.fulfilled, (state) => {
        state.mutations.saveStatus = 'succeeded';
        state.mutations.error = null;
      })
      .addCase(saveAssetInDraft.rejected, (state, action) => {
        state.mutations.saveStatus = 'failed';
        state.mutations.error = action.payload ?? 'Unknown error';
      })
      .addCase(submitAssetIn.pending, (state) => {
        state.mutations.submitStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(submitAssetIn.fulfilled, (state) => {
        state.mutations.submitStatus = 'succeeded';
        state.mutations.error = null;
      })
      .addCase(submitAssetIn.rejected, (state, action) => {
        state.mutations.submitStatus = 'failed';
        state.mutations.error = action.payload ?? 'Unknown error';
      })
      .addCase(exportAssetInBarcodes.pending, (state) => {
        state.mutations.exportBarcodesStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(exportAssetInBarcodes.fulfilled, (state) => {
        state.mutations.exportBarcodesStatus = 'succeeded';
        state.mutations.error = null;
      })
      .addCase(exportAssetInBarcodes.rejected, (state, action) => {
        state.mutations.exportBarcodesStatus = 'failed';
        state.mutations.error = action.payload ?? 'Unknown error';
      });
  },
});

export const { resetAssetInList, clearAssetInDetail } = aumAssetInSlice.actions;

export const selectAssetInList = (state) => state.aumAssetIn?.list ?? listInitial;
export const selectAssetInDetail = (state) => state.aumAssetIn?.detail ?? detailInitial;
export const selectAssetInProducts = (state) => state.aumAssetIn?.products ?? productsInitial;
export const selectAssetInFloorLayout = (state) =>
  state.aumAssetIn?.floorLayout ?? floorLayoutInitial;
export const selectAssetInMutations = (state) =>
  state.aumAssetIn?.mutations ?? {
    saveStatus: 'idle',
    submitStatus: 'idle',
    exportBarcodesStatus: 'idle',
    error: null,
  };

export default aumAssetInSlice.reducer;
