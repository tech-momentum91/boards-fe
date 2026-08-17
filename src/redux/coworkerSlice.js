import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import apiClient from '@/api/axios';
import { postGetUnassignedCoworkerList } from '@/api/coworkerUnassigned';

const DEFAULT_PAGE_SIZE = 20;

export const fetchClientCoworkersThunk = createAsyncThunk(
  'coworker/fetchClientCoworkers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/resource/Client CoWorker', {
        params: {
          fields: JSON.stringify(['first_name', 'last_name', 'name', 'department']),
        },
      });
      return Array.isArray(response?.data?.data) ? response.data.data : [];
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const getCoworkerListThunk = createAsyncThunk(
  'coworker/getCoworkerList',
  async (
    {
      keyword = '',
      filters = [],
      page = 1,
      limitPageLength = DEFAULT_PAGE_SIZE,
      orderBy = 'modified desc',
      append = false,
      /** Client / customer doc id — scopes results to that client when set */
      client_id = '',
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const formData = new FormData();
      formData.append('keyword', String(keyword || '').trim());
      formData.append('filters', Array.isArray(filters) ? JSON.stringify(filters) : '[]');
      formData.append('page', String(page));
      formData.append('limit_page_length', String(limitPageLength));
      formData.append('order_by', orderBy || 'modified desc');
      const clientIdTrim = String(client_id ?? '').trim();
      if (clientIdTrim) {
        formData.append('client_id', clientIdTrim);
      }

      const response = await apiClient.post(
        '/method/devx.coworker.api.get_coworker_list',
        formData,
      );
      const message = response?.data?.message || {};

      return {
        rows: Array.isArray(message?.results) ? message.results : [],
        keyword: message?.keyword ?? keyword,
        page: Number(message?.page || page) || 1,
        pageSize: Number(message?.page_size || limitPageLength) || limitPageLength,
        count: Number(message?.count || 0) || 0,
        totalCount: Number(message?.total_count || 0) || 0,
        totalPages: Number(message?.total_pages || 1) || 1,
        departmentCounts:
          message?.department_counts && typeof message.department_counts === 'object'
            ? message.department_counts
            : {},
        accessTypeCounts:
          message?.access_type_counts && typeof message.access_type_counts === 'object'
            ? message.access_type_counts
            : {},
        orderBy: orderBy || 'modified desc',
        filters,
        append,
      };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const getUnassignedCoworkerListThunk = createAsyncThunk(
  'coworker/getUnassignedCoworkerList',
  async (
    {
      keyword = '',
      client_id = '',
      department = 'All',
      page = 1,
      page_size = DEFAULT_PAGE_SIZE,
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const dept = String(department ?? 'All').trim() || 'All';
      const message = await postGetUnassignedCoworkerList({
        keyword,
        client_id,
        department: dept,
        page,
        page_size,
      });
      return {
        rows: Array.isArray(message?.results) ? message.results : [],
        keyword: message?.keyword ?? keyword,
        client_id: message?.client_id ?? client_id,
        department: message?.department ?? dept,
        page: Number(message?.page || page) || 1,
        pageSize: Number(message?.page_size || page_size) || page_size,
        count: Number(message?.count || 0) || 0,
        totalCount: Number(message?.total_count || 0) || 0,
        totalPages: Number(message?.total_pages || 1) || 1,
        assignedCoworkerCount: Number(message?.assigned_coworker_count ?? 0) || 0,
      };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const createCoworkerThunk = createAsyncThunk(
  'coworker/createCoworker',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.coworker.api.create_coworker', payload);
      const message = response?.data?.message || {};
      return message?.coworker || message || null;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const updateCoworkerThunk = createAsyncThunk(
  'coworker/updateCoworker',
  async ({ coworkerId, payload }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/resource/Client CoWorker/${coworkerId}`, payload);
      return response?.data?.data || response?.data || null;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const deleteCoworkerThunk = createAsyncThunk(
  'coworker/deleteCoworker',
  async ({ coworkerId }, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/resource/Client CoWorker/${coworkerId}`);
      return coworkerId;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const getCoworkerColumnPreferencesThunk = createAsyncThunk(
  'coworker/getCoworkerColumnPreferences',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.get_list_pref', {
        doctype: 'Client CoWorker',
      });
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception || error.message;

      return rejectWithValue(errorMessage);
    }
  },
);

export const saveCoworkerColumnPreferencesThunk = createAsyncThunk(
  'coworker/saveCoworkerColumnPreferences',
  async (columns, { rejectWithValue }) => {
    try {
      const payload = {
        doctype: 'Client CoWorker',
        columns: columns.map((c) => ({
          id: c.id,
          visible: c.visible !== false,
        })),
      };

      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', payload);
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception || error.message;

      return rejectWithValue(errorMessage);
    }
  },
);

const initialState = {
  addCoworkerModal: {
    isOpen: false,
    mode: 'create',
    coworker: null,
  },
  clientCoworkers: {
    data: [],
    isLoading: false,
    error: null,
    loaded: false,
  },
  coworkerList: {
    rows: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    initialized: false,
    keyword: '',
    filters: [],
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    count: 0,
    totalCount: 0,
    totalPages: 1,
    orderBy: 'modified desc',
    departmentCounts: {},
    accessTypeCounts: {},
  },
  unassignedCoworkerList: {
    rows: [],
    isLoading: false,
    error: null,
    keyword: '',
    client_id: '',
    department: 'All',
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    count: 0,
    totalCount: 0,
    totalPages: 1,
    assignedCoworkerCount: 0,
  },
  mutations: {
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    error: null,
  },
  columnPreferences: {
    data: [],
    isLoading: false,
    error: null,
  },
};

const coworkerSlice = createSlice({
  name: 'coworker',
  initialState,
  reducers: {
    openAddCoworkerModal: (state) => {
      state.addCoworkerModal.isOpen = true;
      state.addCoworkerModal.mode = 'create';
      state.addCoworkerModal.coworker = null;
    },
    openEditCoworkerModal: (state, action) => {
      state.addCoworkerModal.isOpen = true;
      state.addCoworkerModal.mode = 'edit';
      state.addCoworkerModal.coworker = action.payload ?? null;
    },
    openViewCoworkerModal: (state, action) => {
      state.addCoworkerModal.isOpen = true;
      state.addCoworkerModal.mode = 'view';
      state.addCoworkerModal.coworker = action.payload ?? null;
    },
    closeAddCoworkerModal: (state) => {
      state.addCoworkerModal.isOpen = false;
      state.addCoworkerModal.mode = 'create';
      state.addCoworkerModal.coworker = null;
    },
    clearClientCoworkersState: (state) => {
      state.clientCoworkers = {
        data: [],
        isLoading: false,
        error: null,
        loaded: false,
      };
    },
    clearCoworkerListState: (state) => {
      state.coworkerList = {
        ...initialState.coworkerList,
      };
    },
    clearUnassignedCoworkerListState: (state) => {
      state.unassignedCoworkerList = {
        ...initialState.unassignedCoworkerList,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClientCoworkersThunk.pending, (state) => {
        state.clientCoworkers.isLoading = true;
        state.clientCoworkers.error = null;
      })
      .addCase(fetchClientCoworkersThunk.fulfilled, (state, action) => {
        state.clientCoworkers.isLoading = false;
        state.clientCoworkers.error = null;
        state.clientCoworkers.data = action.payload;
        state.clientCoworkers.loaded = true;
      })
      .addCase(fetchClientCoworkersThunk.rejected, (state, action) => {
        state.clientCoworkers.isLoading = false;
        state.clientCoworkers.error = action.payload;
        state.clientCoworkers.data = [];
        state.clientCoworkers.loaded = true;
      })
      .addCase(getCoworkerListThunk.pending, (state, action) => {
        const isAppend = Boolean(action.meta?.arg?.append);
        if (isAppend) {
          state.coworkerList.isLoadingMore = true;
        } else {
          state.coworkerList.isLoading = true;
        }
        state.coworkerList.error = null;
      })
      .addCase(getCoworkerListThunk.fulfilled, (state, action) => {
        state.coworkerList.isLoading = false;
        state.coworkerList.isLoadingMore = false;
        state.coworkerList.error = null;
        state.coworkerList.initialized = true;
        if (action.payload.append) {
          const mergedRows = [...state.coworkerList.rows, ...action.payload.rows];
          state.coworkerList.rows = mergedRows.filter(
            (row, index, arr) =>
              index === arr.findIndex((candidate) => candidate?.name === row?.name),
          );
        } else {
          state.coworkerList.rows = action.payload.rows;
        }
        state.coworkerList.keyword = action.payload.keyword;
        state.coworkerList.filters = action.payload.filters;
        state.coworkerList.page = action.payload.page;
        state.coworkerList.pageSize = action.payload.pageSize;
        state.coworkerList.count = action.payload.count;
        state.coworkerList.totalCount = action.payload.totalCount;
        state.coworkerList.totalPages = action.payload.totalPages;
        state.coworkerList.orderBy = action.payload.orderBy;
        state.coworkerList.departmentCounts = action.payload.departmentCounts;
        state.coworkerList.accessTypeCounts = action.payload.accessTypeCounts;
      })
      .addCase(getCoworkerListThunk.rejected, (state, action) => {
        state.coworkerList.isLoading = false;
        state.coworkerList.isLoadingMore = false;
        state.coworkerList.error = action.payload;
        state.coworkerList.initialized = true;
      })
      .addCase(getUnassignedCoworkerListThunk.pending, (state) => {
        state.unassignedCoworkerList.isLoading = true;
        state.unassignedCoworkerList.error = null;
      })
      .addCase(getUnassignedCoworkerListThunk.fulfilled, (state, action) => {
        state.unassignedCoworkerList.isLoading = false;
        state.unassignedCoworkerList.error = null;
        state.unassignedCoworkerList.rows = action.payload.rows;
        state.unassignedCoworkerList.keyword = action.payload.keyword;
        state.unassignedCoworkerList.client_id = action.payload.client_id;
        state.unassignedCoworkerList.department = action.payload.department ?? 'All';
        state.unassignedCoworkerList.page = action.payload.page;
        state.unassignedCoworkerList.pageSize = action.payload.pageSize;
        state.unassignedCoworkerList.count = action.payload.count;
        state.unassignedCoworkerList.totalCount = action.payload.totalCount;
        state.unassignedCoworkerList.totalPages = action.payload.totalPages;
        state.unassignedCoworkerList.assignedCoworkerCount = action.payload.assignedCoworkerCount;
      })
      .addCase(getUnassignedCoworkerListThunk.rejected, (state, action) => {
        state.unassignedCoworkerList.isLoading = false;
        state.unassignedCoworkerList.error = action.payload;
      })
      .addCase(createCoworkerThunk.pending, (state) => {
        state.mutations.isCreating = true;
        state.mutations.error = null;
      })
      .addCase(createCoworkerThunk.fulfilled, (state) => {
        state.mutations.isCreating = false;
        state.mutations.error = null;
      })
      .addCase(createCoworkerThunk.rejected, (state, action) => {
        state.mutations.isCreating = false;
        state.mutations.error = action.payload;
      })
      .addCase(updateCoworkerThunk.pending, (state) => {
        state.mutations.isUpdating = true;
        state.mutations.error = null;
      })
      .addCase(updateCoworkerThunk.fulfilled, (state) => {
        state.mutations.isUpdating = false;
        state.mutations.error = null;
      })
      .addCase(updateCoworkerThunk.rejected, (state, action) => {
        state.mutations.isUpdating = false;
        state.mutations.error = action.payload;
      })
      .addCase(deleteCoworkerThunk.pending, (state) => {
        state.mutations.isDeleting = true;
        state.mutations.error = null;
      })
      .addCase(deleteCoworkerThunk.fulfilled, (state) => {
        state.mutations.isDeleting = false;
        state.mutations.error = null;
      })
      .addCase(deleteCoworkerThunk.rejected, (state, action) => {
        state.mutations.isDeleting = false;
        state.mutations.error = action.payload;
      })
      .addCase(getCoworkerColumnPreferencesThunk.pending, (state) => {
        state.columnPreferences.isLoading = true;
      })
      .addCase(getCoworkerColumnPreferencesThunk.fulfilled, (state, { payload }) => {
        state.columnPreferences.isLoading = false;
        if (Array.isArray(payload)) {
          state.columnPreferences.data = payload;
        } else if (Array.isArray(payload?.message)) {
          state.columnPreferences.data = payload.message;
        } else if (Array.isArray(payload?.data)) {
          state.columnPreferences.data = payload.data;
        } else {
          state.columnPreferences.data = [];
        }
      })
      .addCase(getCoworkerColumnPreferencesThunk.rejected, (state, action) => {
        state.columnPreferences.isLoading = false;
        state.columnPreferences.error = action.payload;
      });
  },
});

export const {
  openAddCoworkerModal,
  openEditCoworkerModal,
  openViewCoworkerModal,
  closeAddCoworkerModal,
  clearClientCoworkersState,
  clearCoworkerListState,
  clearUnassignedCoworkerListState,
} = coworkerSlice.actions;
export const selectAddCoworkerModal = (state) => state.coworker.addCoworkerModal;
export const selectClientCoworkersState = (state) => state.coworker.clientCoworkers;
export const selectClientCoworkers = (state) => state.coworker.clientCoworkers.data;
export const selectCoworkerListState = (state) => state.coworker.coworkerList;
export const selectUnassignedCoworkerListState = (state) => state.coworker.unassignedCoworkerList;
export const selectCoworkerMutationState = (state) => state.coworker.mutations;

export default coworkerSlice.reducer;
