import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { fetchAumAssetList as fetchAumAssetListApi } from '@/api/aumAsset';
import { downloadBarcodesPdf } from '@/api/barcodeExport';
import {
  applyAumListFulfilled,
  applyAumListRejected,
  createAumListState,
  setAumListPending,
} from '@/components/aum/aum-list-pagination';

const listInitial = createAumListState({ summary: null });

const initialState = {
  list: { ...listInitial },
  mutations: {
    exportBarcodesStatus: 'idle',
    error: null,
  },
};

export const fetchAumAssetList = createAsyncThunk(
  'aumAsset/fetchList',
  async (params, { rejectWithValue }) => {
    try {
      const result = await fetchAumAssetListApi(params ?? {});
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

export const exportAumAssetBarcodes = createAsyncThunk(
  'aumAsset/exportBarcodes',
  async (assetNames, { rejectWithValue }) => {
    try {
      return await downloadBarcodesPdf({ assetNames });
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

const aumAssetSlice = createSlice({
  name: 'aumAsset',
  initialState,
  reducers: {
    resetAumAssetList: (state) => {
      state.list = { ...listInitial };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAumAssetList.pending, (state, action) => {
        setAumListPending(state.list, action);
      })
      .addCase(fetchAumAssetList.fulfilled, (state, action) => {
        applyAumListFulfilled(state.list, action, { dataKey: 'items' });
        if (action.payload?.summary) {
          state.list.summary = action.payload.summary;
        }
      })
      .addCase(fetchAumAssetList.rejected, (state, action) => {
        applyAumListRejected(state.list, action, { dataKey: 'items' });
      })
      .addCase(exportAumAssetBarcodes.pending, (state) => {
        state.mutations.exportBarcodesStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(exportAumAssetBarcodes.fulfilled, (state) => {
        state.mutations.exportBarcodesStatus = 'succeeded';
        state.mutations.error = null;
      })
      .addCase(exportAumAssetBarcodes.rejected, (state, action) => {
        state.mutations.exportBarcodesStatus = 'failed';
        state.mutations.error = action.payload ?? 'Unknown error';
      });
  },
});

export const { resetAumAssetList } = aumAssetSlice.actions;

export const selectAumAssetList = (state) => state.aumAsset?.list ?? listInitial;
export const selectAumAssetMutations = (state) =>
  state.aumAsset?.mutations ?? { exportBarcodesStatus: 'idle', error: null };

export default aumAssetSlice.reducer;
