import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';
import { DEFAULT_PNL_FILTERS } from '@/components/pnl/constants';

export const fetchPnLList = createAsyncThunk('pnl/fetchPnLList', async (params = {}, thunkAPI) => {
  const {
    filters = DEFAULT_PNL_FILTERS,
    page = 1,
    pageSize = 20,
    orderBy = 'period desc',
    append = false,
  } = params;

  try {
    const keyword = (filters.search || '').trim();
    const center = (filters.center || '').trim();
    const uiMonth = filters.month || '';
    // Backward compatible: treat "All"/"Last 12 months" as last_12
    const apiMonth = !uiMonth
      ? ''
      : uiMonth === 'All' || uiMonth === 'Last 12 months'
        ? 'last_12'
        : uiMonth;
    const monthRangeApplied = Boolean(apiMonth);

    const response = await apiClient.post(
      '/method/devx.center_management.api.profit_loss.get_profit_loss_list_view',
      {
        center: center || undefined,
        keyword: keyword || undefined,
        // Mutually exclusive payload:
        // - If a month range is applied, send `month` and omit `period`
        // - Otherwise, send `period` and omit `month`
        ...(monthRangeApplied ? { month: apiMonth } : { period: filters.period || 'monthly' }),
        order_by: orderBy || 'period desc',
        page,
        page_size: pageSize,
      },
    );

    const responseData = response?.data?.message || response?.data || {};
    const rawRows = responseData.results || responseData.data || responseData.rows || [];
    const columns = responseData.columns || [];
    const statusCounts = responseData.status_counts || {};
    const totalCount = responseData.total_count ?? responseData.count ?? rawRows.length;
    const apiPage = responseData.page ?? page;
    const apiPageSize = responseData.page_size ?? pageSize;
    const hasMore = apiPage * apiPageSize < totalCount;

    return {
      rows: Array.isArray(rawRows) ? rawRows : [],
      columns: Array.isArray(columns) ? columns : [],
      statusCounts,
      page: apiPage,
      pageSize: apiPageSize,
      filters,
      totalCount,
      hasMore,
      orderBy,
      append,
    };
  } catch (error) {
    return thunkAPI.rejectWithValue(
      error.serialized || extractErrorMessage(error, 'Failed to fetch P&L list'),
    );
  }
});

const initialState = {
  list: {
    rows: [],
    columns: [],
    statusCounts: null,
    status: 'idle',
    error: null,
    filters: { ...DEFAULT_PNL_FILTERS },
    page: 1,
    pageSize: 20,
    totalCount: 0,
    sorting: [],
    hasMore: true,
    isLoadingMore: false,
  },
};

const pnlSlice = createSlice({
  name: 'pnl',
  initialState,
  reducers: {
    setPnLFilters(state, action) {
      state.list.filters = {
        ...state.list.filters,
        ...action.payload,
      };
      state.list.page = 1;
      state.list.rows = [];
      state.list.hasMore = true;
      state.list.isLoadingMore = false;
    },
    replacePnLFilters(state, action) {
      state.list.filters = { ...action.payload };
      state.list.page = 1;
      state.list.rows = [];
      state.list.hasMore = true;
      state.list.isLoadingMore = false;
    },
    setPnLSorting(state, action) {
      state.list.sorting = action.payload || [];
      state.list.page = 1;
      // Keep rows; we refetch sorted data but UI can sort immediately.
      state.list.isLoadingMore = false;
    },
    resetPnLList(state) {
      state.list.rows = [];
      state.list.page = 1;
      state.list.hasMore = true;
      state.list.isLoadingMore = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPnLList.pending, (state, action) => {
        const isAppend = Boolean(action.meta?.arg?.append);
        state.list.error = null;
        if (isAppend) {
          state.list.isLoadingMore = true;
        } else {
          state.list.status = 'loading';
        }
      })
      .addCase(fetchPnLList.fulfilled, (state, action) => {
        const { rows, columns, statusCounts, page, pageSize, totalCount, hasMore, append } =
          action.payload;

        state.list.status = 'succeeded';
        state.list.isLoadingMore = false;
        state.list.error = null;
        state.list.totalCount = totalCount ?? 0;
        state.list.hasMore = Boolean(hasMore);
        state.list.columns = Array.isArray(columns) ? columns : state.list.columns;
        state.list.statusCounts = statusCounts || null;
        state.list.page = page;
        state.list.pageSize = pageSize;

        if (append && Array.isArray(state.list.rows)) {
          state.list.rows = [...state.list.rows, ...(rows || [])];
        } else {
          state.list.rows = rows || [];
        }
      })
      .addCase(fetchPnLList.rejected, (state, action) => {
        state.list.status = 'failed';
        state.list.isLoadingMore = false;
        state.list.error =
          extractErrorMessage(action.payload, 'Failed to fetch P&L list') ||
          action.error?.message ||
          'Failed to fetch P&L list';
      });
  },
});

export const { setPnLFilters, replacePnLFilters, setPnLSorting, resetPnLList } = pnlSlice.actions;

export const selectPnLList = (state) => state.pnl.list;

export default pnlSlice.reducer;
