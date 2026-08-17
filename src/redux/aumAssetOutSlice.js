import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  fetchAssetOutDetail as fetchAssetOutDetailApi,
  fetchAssetOutList as fetchAssetOutListApi,
  fetchAvailableAssetsForOut as fetchAvailableAssetsForOutApi,
  mapApiRowToTransaction,
  saveAssetOutDraft as saveAssetOutDraftApi,
  sendAssetOutInTransit as sendAssetOutInTransitApi,
  updateAssetOutStatus as updateAssetOutStatusApi,
} from '@/api/assetOut';
import {
  applyAumListFulfilled,
  applyAumListRejected,
  createAumListState,
  setAumListPending,
} from '@/components/aum/aum-list-pagination';

const asyncInitial = { status: 'idle', error: null };
const listInitial = createAumListState();
const detailInitial = { ...asyncInitial, record: null };
const availableAssetsInitial = { ...asyncInitial, items: [], locationKey: '' };

const DEFAULT_PRODUCT_TYPE = 'Other';

function mapAvailableAssets(assets = []) {
  return assets.map((asset) => ({
    assetId: asset.assetId,
    assetCode: asset.assetCode,
    barcode: asset.barcode,
    product: asset.product,
    productType: asset.productType || DEFAULT_PRODUCT_TYPE,
    image: asset.image || '',
    unitValue: asset.unitValue,
    label: asset.label || `${asset.assetCode} — ${asset.product}`,
  }));
}

function locationKey({ centerSlug, floorLabel, areaLabel, space }) {
  return [centerSlug, floorLabel, areaLabel, space].join('::');
}

const initialState = {
  list: { ...listInitial },
  detail: { ...detailInitial },
  availableAssets: { ...availableAssetsInitial },
  mutations: {
    saveStatus: 'idle',
    statusUpdateStatus: 'idle',
    inTransitStatus: 'idle',
    error: null,
  },
};

export const fetchAssetOutList = createAsyncThunk(
  'aumAssetOut/fetchList',
  async (params, { rejectWithValue }) => {
    try {
      const result = await fetchAssetOutListApi(params ?? {});
      return {
        items: (result.rows ?? []).map(mapApiRowToTransaction),
        totalCount: result.totalCount ?? 0,
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

export const fetchAssetOutDetail = createAsyncThunk(
  'aumAssetOut/fetchDetail',
  async (id, { rejectWithValue }) => {
    try {
      const detail = await fetchAssetOutDetailApi(id);
      return { id, record: mapApiRowToTransaction(detail) };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchAvailableAssetsForOut = createAsyncThunk(
  'aumAssetOut/fetchAvailableAssets',
  async (params, { rejectWithValue }) => {
    try {
      const assets = await fetchAvailableAssetsForOutApi(params ?? {});
      return {
        locationKey: locationKey(params ?? {}),
        items: mapAvailableAssets(assets),
      };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const createAssetOutDraft = createAsyncThunk(
  'aumAssetOut/createDraft',
  async ({ payload, status = 'Draft' }, { rejectWithValue }) => {
    try {
      const saved = await saveAssetOutDraftApi({
        centerSlug: payload.centerSlug,
        center: payload.centerSlug,
        centerName: payload.centerName,
        floor: payload.floorLabel || payload.floor,
        floor_ref: payload.floor,
        floorLabel: payload.floorLabel,
        areaLabel: payload.areaLabel,
        space: payload.space,
        outType: payload.outType,
        reason: payload.reasonLabel || payload.outType,
        reasonSlug: payload.reasonSlug || 'transfer',
        destinationCenterSlug: payload.destinationCenterSlug,
        destination_center: payload.destinationCenterSlug,
        destinationCenterName: payload.destinationCenterName,
        destinationFloor: payload.destinationFloorLabel || payload.destinationFloor,
        destination_floor_ref: payload.destinationFloor,
        destinationArea: payload.destinationAreaLabel,
        destinationSpace: payload.destinationSpace,
        lineItems: payload.lineItems,
        sourceMaintenanceTaskId: payload.sourceMaintenanceTaskId,
        action: status === 'Draft' ? 'save_draft' : 'submit_for_review',
      });
      return mapApiRowToTransaction(saved);
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const upsertAssetOutTransaction = createAsyncThunk(
  'aumAssetOut/upsert',
  async (transaction, { rejectWithValue }) => {
    try {
      const saved = await saveAssetOutDraftApi({
        name: transaction.id,
        id: transaction.id,
        centerSlug: transaction.centerSlug,
        center: transaction.centerSlug,
        floorLabel: transaction.floor,
        floor: transaction.floor,
        areaLabel: transaction.area,
        space: transaction.space,
        outType: transaction.outType,
        reason: transaction.reason,
        reasonSlug: transaction.reasonSlug,
        outDate: transaction.outDate,
        destinationCenterSlug: transaction.destinationCenterSlug,
        destination_center: transaction.destinationCenterSlug,
        destinationFloor: transaction.destinationFloor,
        destinationArea: transaction.destinationArea,
        destinationSpace: transaction.destinationSpace,
        destinationFloorRef: transaction.destinationFloorRef,
        lineItems: transaction.lineItems,
      });
      return mapApiRowToTransaction(saved);
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const updateAssetOutStatus = createAsyncThunk(
  'aumAssetOut/updateStatus',
  async ({ id, action }, { rejectWithValue }) => {
    try {
      const result = await updateAssetOutStatusApi(id, action);
      return mapApiRowToTransaction(result);
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const sendAssetOutInTransit = createAsyncThunk(
  'aumAssetOut/sendInTransit',
  async (id, { rejectWithValue }) => {
    try {
      const result = await sendAssetOutInTransitApi(id);
      return mapApiRowToTransaction(result);
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

const aumAssetOutSlice = createSlice({
  name: 'aumAssetOut',
  initialState,
  reducers: {
    resetAssetOutList: (state) => {
      state.list = { ...listInitial };
    },
    clearAssetOutDetail: (state) => {
      state.detail = { ...detailInitial };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssetOutList.pending, (state, action) => {
        setAumListPending(state.list, action);
      })
      .addCase(fetchAssetOutList.fulfilled, (state, action) => {
        applyAumListFulfilled(state.list, action, { dataKey: 'items' });
      })
      .addCase(fetchAssetOutList.rejected, (state, action) => {
        applyAumListRejected(state.list, action, { dataKey: 'items' });
      })
      .addCase(fetchAssetOutDetail.pending, (state, action) => {
        state.detail.error = null;
        const id = action.meta.arg;
        if (state.detail.record?.id === id) return;
        state.detail.status = 'loading';
      })
      .addCase(fetchAssetOutDetail.fulfilled, (state, action) => {
        state.detail.status = 'succeeded';
        state.detail.error = null;
        state.detail.record = action.payload?.record ?? null;
      })
      .addCase(fetchAssetOutDetail.rejected, (state, action) => {
        state.detail.status = 'failed';
        state.detail.record = null;
        state.detail.error = action.payload ?? 'Unknown error';
      })
      .addCase(fetchAvailableAssetsForOut.pending, (state) => {
        state.availableAssets.status = 'loading';
        state.availableAssets.error = null;
      })
      .addCase(fetchAvailableAssetsForOut.fulfilled, (state, action) => {
        state.availableAssets.status = 'succeeded';
        state.availableAssets.error = null;
        state.availableAssets.items = action.payload?.items ?? [];
        state.availableAssets.locationKey = action.payload?.locationKey ?? '';
      })
      .addCase(fetchAvailableAssetsForOut.rejected, (state, action) => {
        state.availableAssets.status = 'failed';
        state.availableAssets.error = action.payload ?? 'Unknown error';
        state.availableAssets.items = [];
      })
      .addCase(createAssetOutDraft.pending, (state) => {
        state.mutations.saveStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(createAssetOutDraft.fulfilled, (state) => {
        state.mutations.saveStatus = 'succeeded';
        state.mutations.error = null;
      })
      .addCase(createAssetOutDraft.rejected, (state, action) => {
        state.mutations.saveStatus = 'failed';
        state.mutations.error = action.payload ?? 'Unknown error';
      })
      .addCase(upsertAssetOutTransaction.pending, (state) => {
        state.mutations.saveStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(upsertAssetOutTransaction.fulfilled, (state, action) => {
        state.mutations.saveStatus = 'succeeded';
        state.mutations.error = null;
        state.detail.record = action.payload ?? state.detail.record;
      })
      .addCase(upsertAssetOutTransaction.rejected, (state, action) => {
        state.mutations.saveStatus = 'failed';
        state.mutations.error = action.payload ?? 'Unknown error';
      })
      .addCase(updateAssetOutStatus.pending, (state) => {
        state.mutations.statusUpdateStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(updateAssetOutStatus.fulfilled, (state, action) => {
        state.mutations.statusUpdateStatus = 'succeeded';
        state.mutations.error = null;
        state.detail.record = action.payload ?? state.detail.record;
      })
      .addCase(updateAssetOutStatus.rejected, (state, action) => {
        state.mutations.statusUpdateStatus = 'failed';
        state.mutations.error = action.payload ?? 'Unknown error';
      })
      .addCase(sendAssetOutInTransit.pending, (state) => {
        state.mutations.inTransitStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(sendAssetOutInTransit.fulfilled, (state, action) => {
        state.mutations.inTransitStatus = 'succeeded';
        state.mutations.error = null;
        state.detail.record = action.payload ?? state.detail.record;
      })
      .addCase(sendAssetOutInTransit.rejected, (state, action) => {
        state.mutations.inTransitStatus = 'failed';
        state.mutations.error = action.payload ?? 'Unknown error';
      });
  },
});

export const { resetAssetOutList, clearAssetOutDetail } = aumAssetOutSlice.actions;

export const selectAssetOutList = (state) => state.aumAssetOut?.list ?? listInitial;
export const selectAssetOutDetail = (state) => state.aumAssetOut?.detail ?? detailInitial;
export const selectAssetOutAvailableAssets = (state) =>
  state.aumAssetOut?.availableAssets ?? availableAssetsInitial;
export const selectAssetOutMutations = (state) =>
  state.aumAssetOut?.mutations ?? {
    saveStatus: 'idle',
    statusUpdateStatus: 'idle',
    inTransitStatus: 'idle',
    error: null,
  };

export default aumAssetOutSlice.reducer;
