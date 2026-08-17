import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';

const CLIENT_DOCTYPE = 'Customer';

const initialState = {
  clientListData: {
    data: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    totalCount: 0,
    statusCounts: {}, // Store status_counts from API
    currentPage: 1,
    pageSize: 20,
    hasMore: true,
    sorting: [], // Array of { id: string, desc: boolean }
  },
  createClientModal: {
    isOpen: false,
    isLoading: false,
    error: null,
    status: null,
    newClient: null,
  },
  editClientModal: {
    isOpen: false,
    selectedClient: null,
  },
  removeClientModal: {
    isOpen: false,
    selectedClient: null,
    isLoading: false,
    error: null,
  },
  clientColumnList: null,
};

const mapCenterListEntryToSubRow = (center, parentRow) => {
  const { centers: _centers, center_list: _centerList, ...parentFields } = parentRow;

  return {
    ...parentFields,
    is_center_child: true,
    center_list: null,
    custom_center: center.center_name || center.center_id || '-',
    center_id: center.center_id,
    center_name: center.center_name,
    client_center_status: center.client_center_status ?? null,
    custom_status: center.client_center_status ?? '-',
    custom_avg_csi_score: center.average_csi == null ? '-' : center.average_csi,
    engagement: center.engagement ?? '-',
    floor: center.floor || '-',
  };
};

/** One sub-row per `center_list` entry. No expand when `center_list` is null on the parent. */
const buildClientCenterSubRows = (item, parentRow) => {
  if (item.center_list == null) return [];

  const centerList = Array.isArray(item.center_list)
    ? item.center_list.filter((center) => center?.center_name || center?.center_id)
    : [];

  return centerList.map((center) => mapCenterListEntryToSubRow(center, parentRow));
};

export const clientRowHasCenterList = (row) =>
  !row?.is_center_child &&
  row?.center_list != null &&
  Array.isArray(row.center_list) &&
  row.center_list.length > 0;

export const createClientThunk = createAsyncThunk(
  'client/createClient',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/resource/Customer', payload, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      // Use pre-serialized error from axios interceptor, or serialize if not from axios
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const getClientListThunk = createAsyncThunk(
  'client/getClientList',
  async (
    {
      search = '',
      filters = [],
      page = 1,
      pageSize = 20,
      orderBy = 'creation desc',
      append = false,
      navbarFilter = null,
      // Kept for fulfilled payload so reducer/store knows what was requested
      status,
      center,
      state,
      city,
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const keyword = search && search.trim() ? search.trim() : '';
      const rawFilters =
        Array.isArray(filters) && filters.length > 0 ? JSON.stringify(filters) : '';

      // Prepare FormData as shown in the API example
      // Note: The example shows GET with FormData, but axios GET doesn't support body data
      // Using POST with FormData which is the standard approach
      const formData = new FormData();
      formData.append('page', String(page));
      formData.append('limit_page_length', String(pageSize));
      formData.append('order_by', orderBy || '');
      formData.append('filters', rawFilters);
      // Forward the global centre header to `client_list_view` as
      // `navbar_filter`. Callers should pass the value built by
      // `adaptGlobalCenterIntent.client(intent)` from
      // `@/utils/global-center-filter`, which returns:
      //   - `null` when every accessible centre is selected (omit the filter)
      //   - `{ center: string[] }` for a subset, or `{ center: [] }` when the
      //     user explicitly cleared the header (backend honours empty as
      //     "match nothing").
      // A bare array is still accepted for back-compat: it gets wrapped here.
      // if (navbarFilter != null) {
      //   const payload = Array.isArray(navbarFilter) ? { center: navbarFilter } : navbarFilter;
      //   formData.append('navbar_filter', JSON.stringify(payload));
      // }
      if (keyword) {
        formData.append('keyword', keyword);
      }

      // Use POST method with FormData (standard approach for FormData)
      // If the API specifically requires GET, we may need to adjust the backend or use a custom axios config
      // Note: axios interceptor automatically handles FormData headers
      const response = await apiClient.post(
        '/method/devx.overrides.client.client_list_view',
        formData,
      );

      const responseData = response?.data || {};
      const apiResponse = responseData.message || {};

      // Extract results from API response
      const rawResults = apiResponse.results || [];

      // Transform API response to match frontend expected format
      const transformedData = rawResults.map((item) => {
        const row = {
          name: item.customer_id || '',
          customer_name: item.client_name || '',
          custom_legal_name: item.custom_legal_name || item.client_name || '',
          custom_center:
            Array.isArray(item.center_names) && item.center_names.length > 0
              ? item.center_names
              : null,
          center_list: item.center_list ?? null,
          custom_avg_csi_score: item.average_csi == null ? '-' : item.average_csi,
          custom_spoc_name: item.spoc_name || '-',
          custom_spoc_contact_num: item.spoc_contact || '-',
          engagement: item.engagement || '-',
          custom_status: item.custom_status || '-',
          custom_customer_category: item.custom_customer_category ?? null,
          floor: item.floor || '-',
          owner: item.created_by || '-',
          creation: item.created_at || '-',
        };

        if (item.center_list != null) {
          const centers = buildClientCenterSubRows(item, row);
          if (centers.length > 0) {
            row.centers = centers;
          }
        }

        return row;
      });

      // Extract pagination info from API response
      const totalCount = apiResponse.total_count || 0;
      const currentPage = apiResponse.page || page;
      const responsePageSize = apiResponse.page_size || pageSize;
      const totalPages = apiResponse.total_pages || 1;
      const hasMore = currentPage < totalPages;
      const statusCounts = apiResponse.status_counts || {};

      return {
        data: transformedData,
        totalCount,
        statusCounts,
        currentPage,
        pageSize: responsePageSize,
        hasMore,
        append,
        filters: {
          search,
          status: status ?? '',
          center: center ?? '',
          state: state ?? '',
          city: city ?? '',
          // navbarFilter,
        },
      };
    } catch (error) {
      // console.log('error', error);
      // Use pre-serialized error from axios interceptor, or serialize if not from axios
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const updateClientThunk = createAsyncThunk(
  'client/updateClient',
  async ({ clientId, payload }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/resource/Customer/${clientId}`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const deleteClientThunk = createAsyncThunk(
  'client/deleteClient',
  async ({ clientId }, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/resource/Client/${clientId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const updateClientColumnList = createAsyncThunk(
  'client/updateClientColumnList',
  async (body, thunkAPI) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: CLIENT_DOCTYPE,
        columns: body,
      });
      // console.log('response', response?.data?.message);
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchClientColumnList = createAsyncThunk(
  'client/fetchClientColumnList',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: {
          doctype: CLIENT_DOCTYPE,
        },
      });
      return response?.data?.message;
    } catch (error) {
      // console.log('fetch error', error);
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

const clientSlice = createSlice({
  name: 'client',
  initialState,
  reducers: {
    resetClientList: (state) => {
      state.clientListData.data = [];
      state.clientListData.currentPage = 1;
      state.clientListData.totalCount = 0;
      state.clientListData.hasMore = true;
      state.clientListData.error = null;
    },
    setClientSorting: (state, action) => {
      state.clientListData.sorting = action.payload;
    },
    patchClientListRow: (state, action) => {
      const { clientId, patch } = action.payload || {};
      if (!clientId || !patch) return;
      const list = state.clientListData.data || [];
      const idx = list.findIndex((row) => (row.name || row.id) === clientId);
      if (idx < 0) return;
      const updated = { ...list[idx], ...patch };
      if (patch.center_list !== undefined) {
        const subRows = buildClientCenterSubRows({ center_list: patch.center_list }, updated);
        if (subRows.length > 0) updated.centers = subRows;
        else delete updated.centers;
      }
      state.clientListData.data[idx] = updated;
    },
    setCreateClientModal: (state, action) => {
      state.createClientModal.isOpen =
        typeof action.payload === 'boolean' ? action.payload : !state.createClientModal.isOpen;
      if (!state.createClientModal.isOpen) {
        state.createClientModal.newClient = null;
        state.createClientModal.error = null;
        state.createClientModal.status = null;
      }
    },
    setEditClientModal: (state, action) => {
      if (typeof action.payload === 'boolean') {
        state.editClientModal.isOpen = action.payload;
        if (!action.payload) {
          state.editClientModal.selectedClient = null;
        }
      } else if (action.payload?.client) {
        state.editClientModal.isOpen = true;
        state.editClientModal.selectedClient = action.payload.client;
      } else {
        state.editClientModal.isOpen = !state.editClientModal.isOpen;
        if (!state.editClientModal.isOpen) {
          state.editClientModal.selectedClient = null;
        }
      }
    },
    setRemoveClientModal: (state, action) => {
      if (typeof action.payload === 'boolean') {
        state.removeClientModal.isOpen = action.payload;
        if (!action.payload) {
          state.removeClientModal.selectedClient = null;
        }
      } else if (action.payload?.client) {
        state.removeClientModal.isOpen = true;
        state.removeClientModal.selectedClient = action.payload.client;
      } else {
        state.removeClientModal.isOpen = !state.removeClientModal.isOpen;
        if (!state.removeClientModal.isOpen) {
          state.removeClientModal.selectedClient = null;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getClientListThunk.pending, (state, action) => {
        const isAppend = Boolean(action.meta?.arg?.append);
        state.clientListData.error = null;
        if (isAppend) {
          state.clientListData.isLoadingMore = true;
        } else {
          state.clientListData.isLoading = true;
        }
      })
      .addCase(getClientListThunk.fulfilled, (state, { payload }) => {
        state.clientListData.isLoading = false;
        state.clientListData.isLoadingMore = false;
        state.clientListData.error = null;

        if (payload?.data) {
          // If append is true, append new data to existing data
          state.clientListData.data =
            payload.append && Array.isArray(state.clientListData.data)
              ? [...state.clientListData.data, ...payload.data]
              : payload.data;
          state.clientListData.totalCount = payload.totalCount || 0;
          state.clientListData.currentPage = payload.currentPage || 1;
          state.clientListData.pageSize = payload.pageSize || 20;
          state.clientListData.hasMore = payload.hasMore || false;
          // Only update statusCounts if it's provided (not on append operations)
          if (
            payload.statusCounts &&
            Object.keys(payload.statusCounts).length > 0 &&
            !payload.append
          ) {
            state.clientListData.statusCounts = payload.statusCounts;
          }
        } else {
          if (!payload?.append) {
            state.clientListData.data = [];
            state.clientListData.totalCount = 0;
          }
        }
      })
      .addCase(getClientListThunk.rejected, (state, action) => {
        state.clientListData.isLoading = false;
        state.clientListData.isLoadingMore = false;
        state.clientListData.error = action.payload;
      });

    builder
      .addCase(createClientThunk.pending, (state) => {
        state.createClientModal.isLoading = true;
        state.createClientModal.error = null;
        state.createClientModal.status = null;
      })
      .addCase(createClientThunk.fulfilled, (state, { payload }) => {
        state.createClientModal.isLoading = false;
        state.createClientModal.newClient = payload;
        state.createClientModal.status = payload?.status || 'success';
      })
      .addCase(createClientThunk.rejected, (state, action) => {
        state.createClientModal.isLoading = false;
        state.createClientModal.error = action.payload;
      });

    builder
      .addCase(updateClientThunk.fulfilled, (state, action) => {
        const { clientId, patch } = action.meta.arg || {};
        if (!clientId || !patch) return;
        const list = state.clientListData.data || [];
        const idx = list.findIndex((row) => (row.name || row.id) === clientId);
        if (idx < 0) return;
        const updated = { ...list[idx], ...patch };
        if (patch.center_list !== undefined) {
          const subRows = buildClientCenterSubRows({ center_list: patch.center_list }, updated);
          if (subRows.length > 0) updated.centers = subRows;
          else delete updated.centers;
        }
        state.clientListData.data[idx] = updated;
      })
      .addCase(updateClientThunk.rejected, (state, action) => {
        state.clientListData.error = action.payload;
      });

    builder
      .addCase(deleteClientThunk.pending, (state) => {
        state.removeClientModal.isLoading = true;
        state.removeClientModal.error = null;
      })
      .addCase(deleteClientThunk.fulfilled, (state) => {
        state.removeClientModal.isLoading = false;
        state.removeClientModal.error = null;
      })
      .addCase(deleteClientThunk.rejected, (state, action) => {
        state.removeClientModal.isLoading = false;
        state.removeClientModal.error = action.payload;
      })
      .addCase(fetchClientColumnList.pending, (state) => {
        state.clientColumnList = null;
      })
      .addCase(fetchClientColumnList.fulfilled, (state, action) => {
        state.clientColumnList = action.payload;
      })
      .addCase(fetchClientColumnList.rejected, (state, action) => {
        state.clientColumnList = null;
      })
      .addCase(updateClientColumnList.fulfilled, (state, action) => {})
      .addCase(updateClientColumnList.rejected, (state, action) => {
        state.clientColumnList = null;
      });
  },
});

export const {
  resetClientList,
  setClientSorting,
  patchClientListRow,
  setCreateClientModal,
  setEditClientModal,
  setRemoveClientModal,
} = clientSlice.actions;

// Selectors
export const selectClientListData = (state) =>
  state.client?.clientListData || initialState.clientListData;

export default clientSlice.reducer;
