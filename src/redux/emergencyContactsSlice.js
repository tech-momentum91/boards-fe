import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';

function normalizeEmergencyDoc(doc) {
  const payload = doc?.data || doc || {};
  return {
    id: payload.name,
    contact_name: payload.contact_name || '',
    contact_number: payload.contact_number || '',
    category: payload.category || '',
    is_common: Number(payload.is_common || 0) ? 1 : 0,
    raw: payload,
  };
}

function normalizeEmergencyListItem(row) {
  return {
    id: row?.id || row?.name,
    contact_name: row?.contact_name || '',
    contact_number: row?.contact_number || '',
    category: row?.category || '',
    is_common: Number(row?.is_common || 0) ? 1 : 0,
    raw: row || {},
  };
}

export const fetchEmergencyContactCategoriesThunk = createAsyncThunk(
  'emergencyContacts/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/resource/Emergency Contact Category', {
        params: {
          fields: JSON.stringify(['name']),
          order_by: 'name asc',
          limit_page_length: 1000,
        },
      });
      const data = Array.isArray(response?.data?.data) ? response.data.data : [];
      return data.map((d) => d?.name).filter(Boolean);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const fetchEmergencyContactsThunk = createAsyncThunk(
  'emergencyContacts/fetchList',
  async (
    { centerId = null, forSettings = false, keyword = '', page = 1, limit_page_length = 200 } = {},
    { rejectWithValue },
  ) => {
    try {
      const baseParams = {
        keyword: keyword || undefined,
        page,
        limit_page_length,
      };

      const params = forSettings
        ? { ...baseParams, for_settings: 1 }
        : { ...baseParams, center: centerId || undefined };

      const response = await apiClient.get(
        '/method/devx.center_management.api.emergency_contact_listview.get_emergency_contacts_listview',
        { params },
      );
      const message = response?.data?.message || {};

      if (forSettings) {
        const results = Array.isArray(message.results) ? message.results : [];
        return {
          mode: 'settings',
          items: results.map((row) => normalizeEmergencyListItem(row)),
          pagination: {
            page: message.page ?? page,
            page_size: message.page_size ?? limit_page_length,
            total_pages: message.total_pages ?? 1,
            count: message.count ?? results.length,
            total_count: message.total_count ?? results.length,
          },
        };
      }

      const commonRows = Array.isArray(message?.common_contacts)
        ? message.common_contacts
        : Array.isArray(message?.results)
          ? message.results.filter((x) => Number(x?.is_common || 0) === 1)
          : [];
      const normalRows = Array.isArray(message?.contacts)
        ? message.contacts
        : Array.isArray(message?.results)
          ? message.results.filter((x) => Number(x?.is_common || 0) !== 1)
          : [];
      const commonContacts = commonRows.map((row) => normalizeEmergencyListItem(row));
      const contacts = normalRows.map((row) => normalizeEmergencyListItem(row));
      return {
        mode: 'center',
        commonContacts,
        contacts,
        data: [...commonContacts, ...contacts],
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const createEmergencyContactThunk = createAsyncThunk(
  'emergencyContacts/create',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/resource/Emergency Contacts', payload);
      return normalizeEmergencyDoc(response?.data);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const updateEmergencyContactThunk = createAsyncThunk(
  'emergencyContacts/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(
        `/resource/Emergency Contacts/${encodeURIComponent(String(id))}`,
        payload,
      );
      return normalizeEmergencyDoc(response?.data);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const deleteEmergencyContactThunk = createAsyncThunk(
  'emergencyContacts/delete',
  async ({ id }, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/resource/Emergency Contacts/${encodeURIComponent(String(id))}`);
      return { id };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

const initialState = {
  categories: {
    data: [],
    isLoading: false,
    error: null,
  },
  list: {
    data: [],
    commonContacts: [],
    contacts: [],
    isLoading: false,
    error: null,
  },
  settingsList: {
    items: [],
    pagination: {
      page: 1,
      page_size: 20,
      total_pages: 1,
      count: 0,
      total_count: 0,
    },
    isLoading: false,
    error: null,
  },
  mutation: {
    isLoading: false,
    error: null,
  },
};

const emergencyContactsSlice = createSlice({
  name: 'emergencyContacts',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmergencyContactCategoriesThunk.pending, (state) => {
        state.categories.isLoading = true;
        state.categories.error = null;
      })
      .addCase(fetchEmergencyContactCategoriesThunk.fulfilled, (state, action) => {
        state.categories.isLoading = false;
        state.categories.data = action.payload || [];
      })
      .addCase(fetchEmergencyContactCategoriesThunk.rejected, (state, action) => {
        state.categories.isLoading = false;
        state.categories.error = action.payload;
      });

    builder
      .addCase(fetchEmergencyContactsThunk.pending, (state, action) => {
        const forSettings = Boolean(action.meta?.arg?.forSettings);
        if (forSettings) {
          state.settingsList.isLoading = true;
          state.settingsList.error = null;
        } else {
          state.list.isLoading = true;
          state.list.error = null;
        }
      })
      .addCase(fetchEmergencyContactsThunk.fulfilled, (state, action) => {
        const payload = action.payload || {};
        if (payload.mode === 'settings') {
          state.settingsList.isLoading = false;
          state.settingsList.items = payload.items || [];
          state.settingsList.pagination = payload.pagination || state.settingsList.pagination;
          state.settingsList.error = null;
          return;
        }
        state.list.isLoading = false;
        state.list.data = payload.data || [];
        state.list.commonContacts = payload.commonContacts || [];
        state.list.contacts = payload.contacts || [];
      })
      .addCase(fetchEmergencyContactsThunk.rejected, (state, action) => {
        const forSettings = Boolean(action.meta?.arg?.forSettings);
        if (forSettings) {
          state.settingsList.isLoading = false;
          state.settingsList.error = action.payload;
          state.settingsList.items = [];
        } else {
          state.list.isLoading = false;
          state.list.error = action.payload;
          state.list.data = [];
          state.list.commonContacts = [];
          state.list.contacts = [];
        }
      });

    const onMutationPending = (state) => {
      state.mutation.isLoading = true;
      state.mutation.error = null;
    };
    const onMutationRejected = (state, action) => {
      state.mutation.isLoading = false;
      state.mutation.error = action.payload;
    };
    const onMutationFulfilled = (state) => {
      state.mutation.isLoading = false;
      state.mutation.error = null;
    };

    builder
      .addCase(createEmergencyContactThunk.pending, onMutationPending)
      .addCase(createEmergencyContactThunk.fulfilled, onMutationFulfilled)
      .addCase(createEmergencyContactThunk.rejected, onMutationRejected)
      .addCase(updateEmergencyContactThunk.pending, onMutationPending)
      .addCase(updateEmergencyContactThunk.fulfilled, onMutationFulfilled)
      .addCase(updateEmergencyContactThunk.rejected, onMutationRejected)
      .addCase(deleteEmergencyContactThunk.pending, onMutationPending)
      .addCase(deleteEmergencyContactThunk.fulfilled, onMutationFulfilled)
      .addCase(deleteEmergencyContactThunk.rejected, onMutationRejected);
  },
});

export const selectEmergencyContactCategories = (state) => state.emergencyContacts.categories;
export const selectEmergencyContactsList = (state) => state.emergencyContacts.list;
export const selectEmergencyContactsSettingsList = (state) => state.emergencyContacts.settingsList;
export const selectEmergencyContactsMutation = (state) => state.emergencyContacts.mutation;

export default emergencyContactsSlice.reducer;
