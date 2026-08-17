import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';

const LANDLORD_DOCTYPE = 'Landlord';

const initialState = {
  landlordListData: {
    data: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    totalCount: 0,
    currentPage: 1,
    pageSize: 10,
    hasMore: true,
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    statusCounts: {},
  },

  createLandlordDrawer: {
    isOpen: false,
    new_landlord: null,
    error: null,
    status: null,
  },

  viewLandlordDrawer: {
    isOpen: false,
    selectedLandlord: null,
  },

  editLandlordDrawer: {
    isOpen: false,
    selectedLandlord: null,
  },

  addLandlordContactModal: {
    isOpen: false,
    landlordId: null,
    isLoading: false,
    error: null,
    status: null,
    message: '',
  },

  updateLandlordContactModal: {
    isOpen: false,
    isLoading: false,
    error: null,
    status: null,
    message: '',
  },

  removeLandlordDrawer: {
    isOpen: false,
    selectedLandlord: null,
    isLoading: false,
    error: null,
  },

  landlordDetail: {
    data: null,
    isLoading: false,
    error: null,
    status: 'idle',
    localChanges: {},
  },
  departmentList: {
    data: [],
    isLoading: false,
    error: null,
  },
};

export const getLandlordDetailThunk = createAsyncThunk(
  'landlord/getLandlordDetail',
  async (landlordId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/method/devx.landlord.doctype.landlord.landlord.get_landlord_detail',
        {
          params: { landlord_name: landlordId },
        },
      );
      const payload = response?.data;
      return payload?.message ?? payload?.data ?? payload ?? null;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const updateLandlordFieldThunk = createAsyncThunk(
  'landlord/updateLandlordField',
  async ({ landlordId, fieldname, value }, { rejectWithValue }) => {
    if (!landlordId || !fieldname) {
      return rejectWithValue('Landlord ID and field are required');
    }
    try {
      const payload = { [fieldname]: value };
      const response = await apiClient.put(`/resource/Landlord/${landlordId}`, payload);
      return response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const createLandlordThunk = createAsyncThunk(
  'landlord/createLandlord',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/resource/Landlord', payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchDepartmentListThunk = createAsyncThunk(
  'landlord/fetchDepartmentList',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/resource/Department', {
        params: {
          fields: JSON.stringify(['name', 'department_name']),
          limit: 0,
        },
      });
      return response?.data?.data ?? response?.data ?? [];
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

// Transform raw API result: add spoc (first_name + last_name), map mobile_number/contact_email for table
function transformLandlordListResult(row) {
  const first = row.first_name || '';
  const last = row.last_name || '';
  const spoc = [first, last].filter(Boolean).join(' ').trim() || '';
  return {
    ...row,
    spoc,
    contact_number: row.mobile_number ?? row.contact_number,
    email_address: row.contact_email ?? row.email_address,
  };
}

// Column id -> display label (backend field -> header text)
const LANDLORD_COLUMN_LABELS = {
  mobile_number: 'SPOC Contact Number',
  contact_email: 'Email',
  engagement_mode: 'Eng Mode',
  status: 'Status',
  city: 'City',
  tags: 'Tags',
  shop_number: 'Shop No',
  created_by: 'Created By',
  created_at: 'Created At',
  last_updated: 'Last Updated',
};

// Transform API columns: replace first_name/last_name with SPOC; apply consistent labels
function transformLandlordListColumns(columns) {
  if (!Array.isArray(columns)) return columns;
  const withoutFirstLast = columns.filter(
    (c) => c && c.id !== 'first_name' && c.id !== 'last_name',
  );
  const hasSpoc = withoutFirstLast.some((c) => c.id === 'spoc');
  if (!hasSpoc) {
    const engagementIndex = withoutFirstLast.findIndex((c) => c.id === 'engagement_mode');
    const insertAt = engagementIndex >= 0 ? engagementIndex + 1 : withoutFirstLast.length;
    withoutFirstLast.splice(insertAt, 0, { id: 'spoc', visible: true, label: 'SPOC' });
  }
  return withoutFirstLast.map((c) => ({
    ...c,
    label: LANDLORD_COLUMN_LABELS[c.id] ?? c.label,
  }));
}

/** Shape matches center-view landlord filter dropdown (non-empty arrays only). */
export function compactLandlordListFiltersForApi(landlordListFilters) {
  if (!landlordListFilters || typeof landlordListFilters !== 'object') return null;
  const out = {};
  for (const key of ['state', 'city', 'engagement_mode', 'tags', 'block_floor', 'center']) {
    const v = landlordListFilters[key];
    if (Array.isArray(v) && v.length > 0) out[key] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export const getLandlordListThunk = createAsyncThunk(
  'landlord/getLandlordList',
  async (
    {
      keyword = '',
      status = 'Active',
      filters = [],
      type = '',
      page = 1,
      pageSize = 10,
      append = false,
      order_by = 'creation desc',
      group_by = '',
      group_order = 'asc',
      state = '',
      /** Global center access: array of center doc names (e.g. ['CTR-356', ...]) */
      centers = null,
      landlordListFilters = null,
    } = {},
    { rejectWithValue },
  ) => {
    try {
      // Special lightweight call used in a few legacy places (e.g. centerSpaces)
      if (type === 'centerSpaces') {
        const response = await apiClient.post(
          '/method/devx.api.listview.list_with_search_filters',
          {
            doctype: 'Landlord',
          },
        );
        return response.data;
      }
      // New list view API: GET with query params; default status = Active
      const statusParameter = !status || status === 'all' ? 'Active' : status;
      const params = {
        status: statusParameter,
        page,
        page_size: pageSize,
        keyword: keyword && keyword.trim ? keyword.trim() : '',
      };

      if (order_by) {
        params.order_by = order_by;
      }

      if (group_by) {
        params.group_by = group_by;
        params.group_order = group_order || 'asc';
      }

      if (state) {
        params.state = state;
      }
      const compactFilters = compactLandlordListFiltersForApi(landlordListFilters);
      if (compactFilters) {
        params.list_filters = JSON.stringify(compactFilters);
      }

      // Forward the centres array when one is provided — including the empty
      // case `[]`. Backend contract lives in
      // `devx.api.global_center_filter.parse_global_center_param`: it treats an
      // explicit empty selection as "match nothing" (returns 0 records). Only
      // `null`/`undefined` means "no centres filter at all".
      if (Array.isArray(centers)) {
        params.centers = JSON.stringify(centers);
      }

      const response = await apiClient.get(
        '/method/devx.landlord.doctype.landlord.landlord.get_landlord_list_view',
        { params },
      );

      const apiResponse = response?.data?.message || response?.data || {};
      const rawResults = apiResponse.results || apiResponse.data || [];
      const totalCount = apiResponse.total_count ?? apiResponse.count ?? 0;
      const totalPages = apiResponse.total_pages ?? 1;
      const apiPage = apiResponse.page ?? page;
      const responsePageSize = apiResponse.page_size ?? pageSize;
      const statusCounts = apiResponse.status_counts || {};

      const results = rawResults.map(transformLandlordListResult);
      const columns = transformLandlordListColumns(apiResponse.columns);

      // Scroll pagination: hasMore when current page < total pages (same as clientSlice)
      const hasMore = apiPage < totalPages;

      return {
        results,
        columns,
        page: apiPage,
        pageSize: responsePageSize,
        append,
        hasMore,
        totalCount,
        current_count: (apiPage - 1) * responsePageSize + (apiResponse.count ?? results.length),
        statusCounts,
        message: apiResponse,
        status: response?.data?.status ?? response?.status ?? 200,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

// Map frontend column IDs to backend field names for sorting
const mapLandlordOrderByToBackend = (orderBy) => {
  if (!orderBy || typeof orderBy !== 'string') {
    return orderBy;
  }

  const parts = orderBy.trim().split(/\s+/);
  if (parts.length === 0) {
    return orderBy;
  }

  const frontendField = parts[0];
  const direction = parts.length > 1 ? parts.slice(1).join(' ') : 'desc';

  const fieldMap = {
    name: 'landlord_name',
    // spoc: 'spoc', // NOTE: SPOC intentionally disabled for now (kept for future reuse).
    contact_number: 'contact_number',
    email: 'email_address',
  };

  const backendField = fieldMap[frontendField] || frontendField;
  return `${backendField} ${direction}`;
};

// Dedicated thunk for backend sorting (used by Landlords table only)
export const getLandlordListSortingThunk = createAsyncThunk(
  'landlord/getLandlordListSorting',
  async (
    {
      keyword = '',
      status = 'all',
      filters = [],
      sorting = [],
      page = 1,
      pageSize = 20,
      append = false,
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const formData = new FormData();
      formData.append('doctype', 'Landlord');

      // Build filters array - use provided filters or build from status
      let filtersArray = [];
      if (Array.isArray(filters) && filters.length > 0) {
        filtersArray = filters;
      } else if (status && status !== 'all' && (status === 'Active' || status === 'Inactive')) {
        filtersArray.push(['status', '=', status]);
      }

      if (keyword?.trim()) {
        formData.append('keyword', keyword.trim());
      }

      if (filtersArray.length > 0) {
        formData.append('filters', JSON.stringify(filtersArray));
      }

      formData.append('limit_page_length', String(pageSize));
      formData.append('page', String(page));

      // Convert TanStack sorting state to backend order_by
      let orderBy = 'creation desc';
      if (Array.isArray(sorting) && sorting.length > 0) {
        const sortField = sorting[0].id;
        const sortOrder = sorting[0].desc ? 'desc' : 'asc';
        orderBy = mapLandlordOrderByToBackend(`${sortField} ${sortOrder}`);
      }

      formData.append('order_by', orderBy);

      const response = await apiClient.post(
        '/method/devx.api.listview.list_with_search_filters',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      const responseData = response?.data?.message || response?.data || {};
      const results = responseData.results || responseData.data || responseData || [];
      const totalCount = responseData.total_count ?? results.length;
      const currentCount = append ? (responseData.current_count ?? results.length) : results.length;
      const hasMore = currentCount < totalCount || results.length === pageSize;

      return {
        results,
        page,
        pageSize,
        append,
        hasMore,
        totalCount,
        message: responseData,
        status: response?.data?.status || response?.status || 200,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const updateLandlordThunk = createAsyncThunk(
  'landlord/updateLandlord',
  async ({ landlord_id, payload }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/resource/Landlord/${landlord_id}`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const deleteLandlordThunk = createAsyncThunk(
  'landlord/deleteLandlord',
  async ({ landlord_id }, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/resource/Landlord/${landlord_id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const getLandlordListSeperateThunk = createAsyncThunk(
  'landlord/getLandlordListSeperate',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.listview.list_with_search_filters',
        formData,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const updateLandlordColumnList = createAsyncThunk(
  'landlord/updateLandlordColumnList',
  async (body, thunkAPI) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: LANDLORD_DOCTYPE,
        columns: body,
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchLandlordColumnList = createAsyncThunk(
  'landlord/fetchLandlordColumnList',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: {
          doctype: LANDLORD_DOCTYPE,
        },
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const addLandlordContactThunk = createAsyncThunk(
  'landlord/addLandlordContact',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.landlord.doctype.landlord.landlord.add_landlord_contact',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const updateLandlordContactThunk = createAsyncThunk(
  'landlord/updateLandlordContact',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(
        '/method/devx.landlord.doctype.landlord.landlord.update_landlord_contact',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const deleteLandlordContactThunk = createAsyncThunk(
  'landlord/deleteLandlordContact',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.landlord.doctype.landlord.landlord.delete_landlord_contact',
        payload,
      );
      return response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const addLandlordBankDetailsThunk = createAsyncThunk(
  'landlord/addLandlordBankDetails',
  async (payload, { rejectWithValue }) => {
    const { landlord, bank_name, account_number, account_type, ifsc_code, is_primary } = payload;
    if (!landlord) {
      return rejectWithValue('landlord is required');
    }
    try {
      const response = await apiClient.post(
        '/method/devx.landlord.doctype.landlord.landlord.add_landlord_bank_details',
        {
          landlord,
          bank_name: bank_name ?? '',
          account_number: account_number ?? '',
          account_type: account_type ?? '',
          ifsc_code: ifsc_code ?? '',
          is_primary: is_primary === true || is_primary === 1 ? 1 : 0,
        },
      );
      return response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const updateLandlordBankDetailsThunk = createAsyncThunk(
  'landlord/updateLandlordBankDetails',
  async (payload, { rejectWithValue }) => {
    const { bank_id, fields } = payload;
    if (!bank_id) {
      return rejectWithValue('bank_id is required');
    }
    try {
      const response = await apiClient.put(
        '/method/devx.landlord.doctype.landlord.landlord.update_landlord_bank_details',
        { bank_id, fields: fields ?? {} },
      );
      return response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const deleteLandlordBankDetailsThunk = createAsyncThunk(
  'landlord/deleteLandlordBankDetails',
  async (payload, { rejectWithValue }) => {
    const { landlord, bank_id } = payload;
    if (!landlord || !bank_id) {
      return rejectWithValue('landlord and bank_id are required');
    }
    try {
      const response = await apiClient.post(
        '/method/devx.landlord.doctype.landlord.landlord.delete_landlord_bank_details',
        { landlord, bank_id },
      );
      return response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const updateLandlordAddressThunk = createAsyncThunk(
  'landlord/updateLandlordAddress',
  async (payload, { rejectWithValue }) => {
    const { address_id, fields } = payload;
    if (!address_id) {
      return rejectWithValue('address_id is required');
    }
    try {
      const response = await apiClient.put(
        '/method/devx.landlord.doctype.landlord.landlord.update_landlord_address',
        { address_id, fields: fields ?? {} },
      );
      return response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const updateLandlordTagsThunk = createAsyncThunk(
  'landlord/updateLandlordTags',
  async (payload, { rejectWithValue }) => {
    const { landlord: landlordId, tags } = payload;
    if (!landlordId) {
      return rejectWithValue('landlord is required');
    }
    try {
      const response = await apiClient.put(
        '/method/devx.landlord.doctype.landlord.landlord.update_landlord_tags',
        { landlord: landlordId, tags: Array.isArray(tags) ? tags : [] },
      );
      return response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

const landlordSlice = createSlice({
  name: 'landlord',
  initialState,
  reducers: {
    setCreateLandlordDrawer: (state, action) => {
      state.createLandlordDrawer.isOpen =
        typeof action.payload === 'boolean' ? action.payload : !state.createLandlordDrawer.isOpen;
    },
    setViewLandlordDrawer: (state, action) => {
      if (typeof action.payload === 'boolean') {
        state.viewLandlordDrawer.isOpen = action.payload;
        if (!action.payload) {
          state.viewLandlordDrawer.selectedLandlord = null;
        }
      } else if (action.payload?.landlord) {
        state.viewLandlordDrawer.isOpen = true;
        state.viewLandlordDrawer.selectedLandlord = action.payload.landlord;
      } else {
        state.viewLandlordDrawer.isOpen = !state.viewLandlordDrawer.isOpen;
        if (!state.viewLandlordDrawer.isOpen) {
          state.viewLandlordDrawer.selectedLandlord = null;
        }
      }
    },
    setEditLandlordDrawer: (state, action) => {
      if (typeof action.payload === 'boolean') {
        state.editLandlordDrawer.isOpen = action.payload;
        if (!action.payload) {
          state.editLandlordDrawer.selectedLandlord = null;
        }
      } else if (action.payload?.landlord) {
        state.editLandlordDrawer.isOpen = true;
        state.editLandlordDrawer.selectedLandlord = action.payload.landlord;
      } else {
        state.editLandlordDrawer.isOpen = !state.editLandlordDrawer.isOpen;
        if (!state.editLandlordDrawer.isOpen) {
          state.editLandlordDrawer.selectedLandlord = null;
        }
      }
    },
    setRemoveLandlordDrawer: (state, action) => {
      if (typeof action.payload === 'boolean') {
        state.removeLandlordDrawer.isOpen = action.payload;
        if (!action.payload) {
          state.removeLandlordDrawer.selectedLandlord = null;
        }
      } else if (action.payload?.landlord) {
        state.removeLandlordDrawer.isOpen = true;
        state.removeLandlordDrawer.selectedLandlord = action.payload.landlord;
      } else {
        state.removeLandlordDrawer.isOpen = !state.removeLandlordDrawer.isOpen;
        if (!state.removeLandlordDrawer.isOpen) {
          state.removeLandlordDrawer.selectedLandlord = null;
        }
      }
    },
    setRemoveNewLandlord: (state, action) => {
      state.createLandlordDrawer.new_landlord = null;
    },
    resetLandlordList: (state) => {
      state.landlordListData.data = [];
      state.landlordListData.currentPage = 1;
      state.landlordListData.hasMore = true;
      state.landlordListData.isLoadingMore = false;
      state.landlordListData.error = null;
    },
    resetLandlordDetail: (state) => {
      state.landlordDetail.data = null;
      state.landlordDetail.isLoading = false;
      state.landlordDetail.error = null;
      state.landlordDetail.status = 'idle';
      state.landlordDetail.localChanges = {};
    },
    clearAddLandlordContactModalFeedback: (state) => {
      state.addLandlordContactModal.message = '';
      state.addLandlordContactModal.error = null;
    },
    clearUpdateLandlordContactModalFeedback: (state) => {
      state.updateLandlordContactModal.message = '';
      state.updateLandlordContactModal.error = null;
    },
    setLandlordLocalChange: (state, action) => {
      const { fieldName, value } = action.payload;
      if (value === null || value === undefined) {
        const { [fieldName]: _, ...rest } = state.landlordDetail.localChanges;
        state.landlordDetail.localChanges = rest;
      } else {
        state.landlordDetail.localChanges[fieldName] = value;
      }
    },
    clearLandlordLocalChanges: (state) => {
      state.landlordDetail.localChanges = {};
    },
  },
  extraReducers: (builder) => {
    /* Landlord List */
    builder
      .addCase(getLandlordListThunk.pending, (state, action) => {
        const isAppend = Boolean(action.meta?.arg?.append);
        state.landlordListData.error = null;
        if (isAppend) {
          state.landlordListData.isLoadingMore = true;
        } else {
          state.landlordListData.status = 'loading';
          state.landlordListData.isLoading = true;
        }
      })
      .addCase(getLandlordListThunk.fulfilled, (state, { payload }) => {
        state.landlordListData.status = 'succeeded';
        state.landlordListData.isLoading = false;
        state.landlordListData.isLoadingMore = false;
        state.landlordListData.error = null;

        // Handle pagination response
        if (payload?.results) {
          const { results } = payload;
          const { append, page, pageSize, hasMore, totalCount, current_count, statusCounts } =
            payload;

          if (statusCounts && Object.keys(statusCounts).length > 0 && !append) {
            state.landlordListData.statusCounts = statusCounts;
          }

          if (append) {
            // Append to existing data, avoiding duplicates
            const existingData = state.landlordListData.data || [];
            const existingIds = new Set(existingData.map((item) => item.name || item.id));
            const newResults = results.filter((item) => !existingIds.has(item.name || item.id));
            state.landlordListData.data = [...existingData, ...newResults];

            // Recalculate hasMore based on current_count from API response
            if (current_count !== undefined && totalCount !== undefined) {
              state.landlordListData.hasMore = current_count < totalCount;
            } else if (hasMore === undefined) {
              const calculatedCurrentCount = state.landlordListData.data.length;
              state.landlordListData.hasMore = calculatedCurrentCount < totalCount;
            } else {
              state.landlordListData.hasMore = hasMore;
            }
          } else {
            // Replace data for new search/filter
            state.landlordListData.data = results;

            // For non-append operations, use hasMore from payload
            if (hasMore === undefined) {
              const dataLength = Array.isArray(results) ? results.length : 0;
              state.landlordListData.hasMore = dataLength === pageSize && dataLength < totalCount;
            } else {
              state.landlordListData.hasMore = hasMore;
            }
          }
          state.landlordListData.currentPage = page;
          state.landlordListData.pageSize = pageSize;
          state.landlordListData.totalCount = totalCount;
        } else if (Array.isArray(payload)) {
          state.landlordListData.data = payload;
          state.landlordListData.currentPage = 1;
          state.landlordListData.hasMore = false;
        } else if (payload?.message?.results) {
          state.landlordListData.data = payload.message.results;
          state.landlordListData.currentPage = 1;
          state.landlordListData.hasMore = false;
        } else if (Array.isArray(payload?.message)) {
          state.landlordListData.data = payload.message;
          state.landlordListData.currentPage = 1;
          state.landlordListData.hasMore = false;
        } else if (Array.isArray(payload?.data)) {
          state.landlordListData.data = payload.data;
          state.landlordListData.currentPage = 1;
          state.landlordListData.hasMore = false;
        } else {
          state.landlordListData.data = [];
          state.landlordListData.currentPage = 1;
          state.landlordListData.hasMore = false;
        }
      })
      .addCase(getLandlordListThunk.rejected, (state, action) => {
        state.landlordListData.status = 'failed';
        state.landlordListData.isLoading = false;
        state.landlordListData.isLoadingMore = false;
        state.landlordListData.error = action.payload;
      });

    builder
      .addCase(getLandlordListSortingThunk.pending, (state) => {
        state.landlordListData.status = 'loading';
        state.landlordListData.isLoading = true;
        state.landlordListData.error = null;
      })
      .addCase(getLandlordListSortingThunk.fulfilled, (state, { payload }) => {
        state.landlordListData.status = 'succeeded';
        state.landlordListData.isLoading = false;
        state.landlordListData.error = null;

        // Handle pagination response
        if (payload?.results) {
          const { results } = payload;
          const { append, page, pageSize, hasMore, totalCount, current_count } = payload;

          if (append) {
            // Append to existing data, avoiding duplicates
            const existingData = state.landlordListData.data || [];
            const existingIds = new Set(existingData.map((item) => item.name || item.id));
            const newResults = results.filter((item) => !existingIds.has(item.name || item.id));
            state.landlordListData.data = [...existingData, ...newResults];

            // Recalculate hasMore based on current_count from API response
            // This is the most accurate way as it uses the API's calculation
            if (current_count !== undefined && totalCount !== undefined) {
              // Use API's current_count if provided (calculated as: (page - 1) * page_size + count)
              state.landlordListData.hasMore = current_count < totalCount;
            } else if (hasMore === undefined) {
              // Final fallback: calculate from data length
              const calculatedCurrentCount = state.landlordListData.data.length;
              state.landlordListData.hasMore = calculatedCurrentCount < totalCount;
            } else {
              // Fallback to hasMore from payload if current_count not available
              state.landlordListData.hasMore = hasMore;
            }
          } else {
            // Replace data for new search/filter
            state.landlordListData.data = results;

            // For non-append operations, use hasMore from payload
            if (hasMore === undefined) {
              // Fallback: calculate hasMore if not provided
              const dataLength = Array.isArray(results) ? results.length : 0;
              state.landlordListData.hasMore = dataLength === pageSize && dataLength < totalCount;
            } else {
              state.landlordListData.hasMore = hasMore;
            }
          }
          state.landlordListData.currentPage = page;
          state.landlordListData.pageSize = pageSize;
          state.landlordListData.totalCount = totalCount;
        } else if (Array.isArray(payload)) {
          state.landlordListData.data = payload;
          state.landlordListData.currentPage = 1;
          state.landlordListData.hasMore = false;
        } else if (payload?.message?.results) {
          state.landlordListData.data = payload.message.results;
          state.landlordListData.currentPage = 1;
          state.landlordListData.hasMore = false;
        } else if (Array.isArray(payload?.message)) {
          state.landlordListData.data = payload.message;
          state.landlordListData.currentPage = 1;
          state.landlordListData.hasMore = false;
        } else if (Array.isArray(payload?.data)) {
          state.landlordListData.data = payload.data;
          state.landlordListData.currentPage = 1;
          state.landlordListData.hasMore = false;
        } else {
          state.landlordListData.data = [];
          state.landlordListData.currentPage = 1;
          state.landlordListData.hasMore = false;
        }
      })
      .addCase(getLandlordListSortingThunk.rejected, (state, action) => {
        state.landlordListData.status = 'failed';
        state.landlordListData.isLoading = false;
        state.landlordListData.error = action.payload;
      });

    builder.addCase(createLandlordThunk.pending, (state) => {
      state.createLandlordDrawer.isLoading = true;
      state.createLandlordDrawer.error = null;
      state.createLandlordDrawer.status = null;
    });
    builder.addCase(createLandlordThunk.fulfilled, (state, { payload }) => {
      state.createLandlordDrawer.isLoading = false;
      state.createLandlordDrawer.new_landlord = payload;
      state.createLandlordDrawer.status = payload.status;
    });
    builder.addCase(createLandlordThunk.rejected, (state, action) => {
      state.createLandlordDrawer.isLoading = false;
      state.createLandlordDrawer.error = action.payload;
    });

    builder.addCase(updateLandlordThunk.pending, (state) => {
      state.landlordListData.isLoading = true;
      state.landlordListData.error = null;
    });
    builder.addCase(updateLandlordThunk.fulfilled, (state, action) => {
      state.landlordListData.data = action?.payload?.data;
      state.landlordListData.isLoading = false;
      state.landlordListData.error = null;
    });
    builder.addCase(updateLandlordThunk.rejected, (state, action) => {
      state.landlordListData.isLoading = false;
      state.landlordListData.error = action.payload;
    });
    builder.addCase(deleteLandlordThunk.pending, (state) => {
      state.removeLandlordDrawer.isLoading = true;
      state.removeLandlordDrawer.error = null;
    });
    builder.addCase(deleteLandlordThunk.fulfilled, (state) => {
      state.removeLandlordDrawer.isLoading = false;
      state.removeLandlordDrawer.error = null;
    });
    builder.addCase(deleteLandlordThunk.rejected, (state, action) => {
      state.removeLandlordDrawer.isLoading = false;
      state.removeLandlordDrawer.error = action.payload;
    });
    /* Landlord Detail */
    builder
      .addCase(getLandlordDetailThunk.pending, (state) => {
        state.landlordDetail.status = 'loading';
        // Only show initial loader when no data yet.
        state.landlordDetail.isLoading = !state.landlordDetail.data;
        state.landlordDetail.error = null;
      })
      .addCase(getLandlordDetailThunk.fulfilled, (state, { payload }) => {
        state.landlordDetail.status = 'succeeded';
        state.landlordDetail.isLoading = false;
        state.landlordDetail.error = null;
        state.landlordDetail.data = payload;
      })
      .addCase(getLandlordDetailThunk.rejected, (state, action) => {
        state.landlordDetail.status = 'failed';
        state.landlordDetail.isLoading = false;
        state.landlordDetail.error = action.payload;
        // Keep existing data if we already had it (prevents UI flashing empty on background refetch).
        if (!state.landlordDetail.data) {
          state.landlordDetail.data = null;
        }
      });

    builder
      .addCase(updateLandlordFieldThunk.fulfilled, (state, action) => {
        const updated = action.payload?.data || action.payload;
        if (updated && state.landlordDetail.data) {
          state.landlordDetail.data = {
            ...state.landlordDetail.data,
            ...updated,
          };
        }
        const { landlordId, fieldname, value } = action.meta?.arg || {};
        if (!landlordId) return;
        const idx = state.landlordListData.data?.findIndex((r) => (r.name || r.id) === landlordId);
        if (idx < 0) return;
        const row = state.landlordListData.data[idx];
        if (fieldname === 'landlord_name') row.landlord_name = value;
        else if (fieldname === 'mobile_number') {
          row.mobile_number = value;
          row.contact_number = value;
        } else if (fieldname === 'contact_email') {
          row.contact_email = value;
          row.email_address = value;
        } else if (fieldname === 'center_details' && Array.isArray(value) && value[0]) {
          const cd = value[0];
          row.center_details = value;
          if (cd.block_floor != null) row.block_floor = cd.block_floor;
          if (cd.shop_number != null) row.shop_number = cd.shop_number;
          if (cd.center) {
            row.center = cd.center_name || cd.center;
          }
        } else if (fieldname) {
          row[fieldname] = value;
        }
      })
      .addCase(updateLandlordFieldThunk.rejected, (state, action) => {
        // Don't touch landlordDetail.isLoading here to avoid triggering skeleton/loading state.
        state.landlordDetail.error = action.payload;
      });

    builder.addCase(addLandlordContactThunk.pending, (state) => {
      state.addLandlordContactModal.isLoading = true;
      state.addLandlordContactModal.error = null;
      state.addLandlordContactModal.status = null;
      state.addLandlordContactModal.message = '';
    });
    builder.addCase(addLandlordContactThunk.fulfilled, (state, { payload }) => {
      state.addLandlordContactModal.isLoading = false;
      state.addLandlordContactModal.error = null;
      state.addLandlordContactModal.status =
        typeof payload?.status === 'string' ? payload.status : payload?.status;
      const message = payload?.message;
      state.addLandlordContactModal.message =
        typeof message === 'string'
          ? message
          : message?.message && typeof message.message === 'string'
            ? message.message
            : 'Contact added successfully.';
      state.addLandlordContactModal.landlordId = payload?.landlord_id ?? payload?.landlord;
    });
    builder.addCase(addLandlordContactThunk.rejected, (state, action) => {
      state.addLandlordContactModal.isLoading = false;
      state.addLandlordContactModal.error = action.payload;
      state.addLandlordContactModal.message = '';
    });

    builder.addCase(updateLandlordContactThunk.pending, (state) => {
      state.updateLandlordContactModal.isLoading = true;
      state.updateLandlordContactModal.error = null;
      state.updateLandlordContactModal.status = null;
      state.updateLandlordContactModal.message = '';
    });
    builder.addCase(updateLandlordContactThunk.fulfilled, (state, { payload }) => {
      state.updateLandlordContactModal.isLoading = false;
      state.updateLandlordContactModal.error = null;
      state.updateLandlordContactModal.status =
        typeof payload?.status === 'string' ? payload.status : payload?.status;
      const message = payload?.message;
      state.updateLandlordContactModal.message =
        typeof message === 'string'
          ? message
          : message?.message && typeof message.message === 'string'
            ? message.message
            : 'Contact updated successfully.';
    });
    builder.addCase(updateLandlordContactThunk.rejected, (state, action) => {
      state.updateLandlordContactModal.isLoading = false;
      state.updateLandlordContactModal.error = action.payload;
      state.updateLandlordContactModal.message = '';
    });
    builder
      .addCase(fetchDepartmentListThunk.pending, (state) => {
        state.departmentList.isLoading = true;
        state.departmentList.error = null;
      })
      .addCase(fetchDepartmentListThunk.fulfilled, (state, { payload }) => {
        state.departmentList.isLoading = false;
        state.departmentList.data = Array.isArray(payload) ? payload : [];
      })
      .addCase(fetchDepartmentListThunk.rejected, (state, action) => {
        state.departmentList.isLoading = false;
        state.departmentList.error = action.payload;
      });
  },
});

export const {
  setCreateLandlordDrawer,
  setViewLandlordDrawer,
  setEditLandlordDrawer,
  setRemoveLandlordDrawer,
  resetLandlordList,
  resetLandlordDetail,
  clearAddLandlordContactModalFeedback,
  clearUpdateLandlordContactModalFeedback,
  setLandlordLocalChange,
  clearLandlordLocalChanges,
} = landlordSlice.actions;

export const selectLandlordDetail = (state) => state.landlord.landlordDetail;
export const selectAddLandlordContactModal = (state) =>
  state.landlord.addLandlordContactModal ?? {};
export const selectUpdateLandlordContactModal = (state) =>
  state.landlord.updateLandlordContactModal ?? {};
export const selectLandlordLocalChanges = (state) =>
  state.landlord.landlordDetail?.localChanges ?? {};

export const getLandlordFieldValue = (landlord, localChanges, fieldName) => {
  if (localChanges && localChanges[fieldName] !== undefined && localChanges[fieldName] !== null) {
    return String(localChanges[fieldName] ?? '');
  }
  if (!landlord) return '';
  if (fieldName === 'legal_name') {
    const v = landlord.legal_name ?? landlord.custom_legal_name;
    return v == null ? '' : String(v);
  }
  if (fieldName === 'landlord_name') {
    const v = landlord.landlord_name ?? landlord.name;
    return v == null ? '' : String(v);
  }
  if (landlord[fieldName] !== undefined && landlord[fieldName] !== null) {
    return String(landlord[fieldName] ?? '');
  }
  return '';
};

export const selectDepartmentList = (state) => state.landlord.departmentList;

export default landlordSlice.reducer;
