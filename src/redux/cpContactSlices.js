import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { DEFAULT_CP_CONTACTS_FILTERS } from '@/pages/channel-partner/constants-cp-contacts';
import {
  getCpContactById,
  getCpContactDetailFilterOptions,
  getCpContactFilterOptions,
  getLeadsByCpContactId,
  getCpContactsList,
  deleteCpContact as deleteCpContactService,
  createCpContact as createCpContactService,
} from '@/services/cp-contacts-service';
import {
  getCpContactTasks,
  updateCpContactTask as updateCpContactTaskService,
} from '@/services/cp-contact-tasks-service';

// -----------------------------
// cpContactDetailFilters slice
// -----------------------------
const cpContactDetailFiltersInitialFilters = {
  cpAccount: [],
  salesOwner: [],
  designation: [],
  department: [],
  city: [],
  lifecycleStage: [],
};

const cpContactDetailFiltersInitialState = {
  appliedFilters: cpContactDetailFiltersInitialFilters,
  filterOptions: null,
  optionsLoading: false,
  optionsError: null,
};

export const fetchCpContactDetailFilterOptions = createAsyncThunk(
  'cpContactDetailFilters/fetchOptions',
  async (contactId, { rejectWithValue }) => {
    const result = await getCpContactDetailFilterOptions(contactId);
    if (result.error) {
      return rejectWithValue(result.error);
    }
    return result.data ?? null;
  },
);

const cpContactDetailFiltersSlice = createSlice({
  name: 'cpContactDetailFilters',
  initialState: cpContactDetailFiltersInitialState,
  reducers: {
    setCpContactDetailAppliedFilters: (state, action) => {
      state.appliedFilters = { ...cpContactDetailFiltersInitialFilters, ...action.payload };
    },
    clearCpContactDetailFilters: (state) => {
      state.appliedFilters = cpContactDetailFiltersInitialFilters;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCpContactDetailFilterOptions.pending, (state) => {
        state.optionsLoading = true;
        state.optionsError = null;
      })
      .addCase(fetchCpContactDetailFilterOptions.fulfilled, (state, action) => {
        state.filterOptions = action.payload;
        state.optionsLoading = false;
        state.optionsError = null;
      })
      .addCase(fetchCpContactDetailFilterOptions.rejected, (state, action) => {
        state.filterOptions = null;
        state.optionsLoading = false;
        state.optionsError = action.payload ?? 'Failed to load filter options.';
      });
  },
});

export const { setCpContactDetailAppliedFilters, clearCpContactDetailFilters } =
  cpContactDetailFiltersSlice.actions;

export const selectCpContactDetailAppliedFilters = (state) =>
  state?.cpContactDetailFilters?.appliedFilters ?? cpContactDetailFiltersInitialFilters;
export const selectCpContactDetailFilterOptions = (state) =>
  state?.cpContactDetailFilters?.filterOptions ?? null;
export const selectCpContactDetailFilterOptionsLoading = (state) =>
  state?.cpContactDetailFilters?.optionsLoading ?? false;
export const selectCpContactDetailFilterOptionsError = (state) =>
  state?.cpContactDetailFilters?.optionsError ?? null;
export const selectCpContactDetailFilterCount = (state) => {
  const f = state?.cpContactDetailFilters?.appliedFilters ?? cpContactDetailFiltersInitialFilters;
  return (
    (f.cpAccount?.length ?? 0) +
    (f.salesOwner?.length ?? 0) +
    (f.designation?.length ?? 0) +
    (f.department?.length ?? 0) +
    (f.city?.length ?? 0) +
    (f.lifecycleStage?.length ?? 0)
  );
};

export const cpContactDetailFiltersReducer = cpContactDetailFiltersSlice.reducer;

// -----------------------------
// cpContactDetail slice
// -----------------------------
const cpContactDetailInitialState = {
  data: null,
  isLoading: false,
  error: null,
  status: 'idle',
};

export const fetchCpContactDetail = createAsyncThunk(
  'cpContactDetail/fetch',
  async (id, { rejectWithValue }) => {
    const result = await getCpContactById(id);
    if (result.error) {
      return rejectWithValue(result.error);
    }
    return result.data ?? null;
  },
);

const cpContactDetailSlice = createSlice({
  name: 'cpContactDetail',
  initialState: cpContactDetailInitialState,
  reducers: {
    setCpContactDetail: (state, action) => {
      state.data = action.payload;
      state.error = null;
      state.status = action.payload ? 'succeeded' : 'idle';
    },
    clearCpContactDetail: () => cpContactDetailInitialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCpContactDetail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.status = 'loading';
      })
      .addCase(fetchCpContactDetail.fulfilled, (state, action) => {
        state.data = action.payload;
        state.isLoading = false;
        state.error = null;
        state.status = 'succeeded';
      })
      .addCase(fetchCpContactDetail.rejected, (state, action) => {
        state.data = null;
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load CP contact details.';
        state.status = 'failed';
      });
  },
});

export const { setCpContactDetail, clearCpContactDetail } = cpContactDetailSlice.actions;

export const selectCpContactDetail = (state) => state?.cpContactDetail?.data ?? null;
export const selectCpContactDetailLoading = (state) => state?.cpContactDetail?.isLoading ?? false;
export const selectCpContactDetailError = (state) => state?.cpContactDetail?.error ?? null;
export const selectCpContactDetailStatus = (state) => state?.cpContactDetail?.status ?? 'idle';

export const cpContactDetailReducer = cpContactDetailSlice.reducer;

// -----------------------------
// cpContactFilterOptions slice
// -----------------------------
const cpContactFilterOptionsInitialOptions = {
  cpAccount: [],
  salesOwner: [],
  designation: [],
  department: [],
  city: [],
  lifecycleStage: [],
  status: [],
};

const cpContactFilterOptionsInitialState = {
  options: cpContactFilterOptionsInitialOptions,
  isLoading: false,
  error: null,
  status: 'idle',
};

/**
 * Fetch CP contact filter options (cpAccount, salesOwner, designation, department, city, lifecycleStage, status).
 */
export const fetchCpContactFilterOptions = createAsyncThunk(
  'cpContactFilterOptions/fetch',
  async (params, { rejectWithValue }) => {
    const result = await getCpContactFilterOptions(params);
    if (result.error) {
      return rejectWithValue(result.error);
    }
    return result.data ?? cpContactFilterOptionsInitialOptions;
  },
);

const cpContactFilterOptionsSlice = createSlice({
  name: 'cpContactFilterOptions',
  initialState: cpContactFilterOptionsInitialState,
  reducers: {
    clearCpContactFilterOptions: () => cpContactFilterOptionsInitialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCpContactFilterOptions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.status = 'loading';
      })
      .addCase(fetchCpContactFilterOptions.fulfilled, (state, action) => {
        state.options = action.payload ?? cpContactFilterOptionsInitialOptions;
        state.isLoading = false;
        state.error = null;
        state.status = 'succeeded';
      })
      .addCase(fetchCpContactFilterOptions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load filter options.';
        state.status = 'failed';
      });
  },
});

export const { clearCpContactFilterOptions } = cpContactFilterOptionsSlice.actions;

export const selectCpContactFilterOptions = (state) =>
  state?.cpContactFilterOptions?.options ?? cpContactFilterOptionsInitialOptions;
export const selectCpContactFilterOptionsLoading = (state) =>
  state?.cpContactFilterOptions?.isLoading ?? false;
export const selectCpContactFilterOptionsError = (state) =>
  state?.cpContactFilterOptions?.error ?? null;
export const selectCpContactFilterOptionsStatus = (state) =>
  state?.cpContactFilterOptions?.status ?? 'idle';

export const cpContactFilterOptionsReducer = cpContactFilterOptionsSlice.reducer;

// -----------------------------
// cpContactLeads slice
// -----------------------------
const cpContactLeadsInitialState = {
  listData: {
    data: [],
    totalCount: 0,
    isLoading: false,
    error: null,
    status: 'idle',
  },
  searchTerm: '',
  cpContactId: null,
};

export const fetchCpContactLeads = createAsyncThunk(
  'cpContactLeads/fetchList',
  async (arg, { rejectWithValue }) => {
    const cpContactId = typeof arg === 'string' ? arg : arg?.cpContactId;
    const keyword = typeof arg === 'object' && arg != null ? (arg.keyword ?? '') : '';
    const filters = typeof arg === 'object' && arg != null ? arg.filters : undefined;
    const result = await getLeadsByCpContactId(cpContactId, { keyword, filters });
    if (result.error) {
      return rejectWithValue(result.error);
    }
    return {
      data: result.data ?? [],
      totalCount: result.totalCount ?? 0,
    };
  },
);

const cpContactLeadsSlice = createSlice({
  name: 'cpContactLeads',
  initialState: cpContactLeadsInitialState,
  reducers: {
    setCpContactLeadsSearchTerm: (state, action) => {
      state.searchTerm = action.payload ?? '';
    },
    clearCpContactLeads: () => cpContactLeadsInitialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCpContactLeads.pending, (state, action) => {
        state.listData.isLoading = true;
        state.listData.error = null;
        state.listData.status = 'loading';
        state.cpContactId = action.meta.arg?.cpContactId ?? state.cpContactId;
      })
      .addCase(fetchCpContactLeads.fulfilled, (state, action) => {
        state.listData.data = action.payload?.data ?? [];
        state.listData.totalCount = action.payload?.totalCount ?? 0;
        state.listData.isLoading = false;
        state.listData.error = null;
        state.listData.status = 'succeeded';
      })
      .addCase(fetchCpContactLeads.rejected, (state, action) => {
        state.listData.data = [];
        state.listData.totalCount = 0;
        state.listData.isLoading = false;
        state.listData.error = action.payload ?? 'Failed to load leads.';
        state.listData.status = 'failed';
      });
  },
});

export const { setCpContactLeadsSearchTerm, clearCpContactLeads } = cpContactLeadsSlice.actions;

export const selectCpContactLeadsListData = (state) =>
  state?.cpContactLeads?.listData ?? cpContactLeadsInitialState.listData;
export const selectCpContactLeadsSearchTerm = (state) => state?.cpContactLeads?.searchTerm ?? '';
export const selectCpContactLeadsCpContactId = (state) =>
  state?.cpContactLeads?.cpContactId ?? null;

export const cpContactLeadsReducer = cpContactLeadsSlice.reducer;

// -----------------------------
// cpContacts slice
// -----------------------------
const cpContactsInitialState = {
  listData: {
    data: [],
    isLoading: false,
    error: null,
    status: 'idle',
  },
  filters: {
    activeTab: 'all',
    searchTerm: '',
  },
  sorting: [],
  groupBy: '',
  groupOrder: 'asc',
  appliedFilters: { ...DEFAULT_CP_CONTACTS_FILTERS },
};

export const fetchCpContacts = createAsyncThunk(
  'cpContacts/fetchList',
  async (params, { rejectWithValue }) => {
    const result = await getCpContactsList(params);
    if (result.error) {
      return rejectWithValue(result.error);
    }
    return result.data ?? [];
  },
);

export const deleteCpContactThunk = createAsyncThunk(
  'cpContacts/delete',
  async (id, { rejectWithValue }) => {
    const result = await deleteCpContactService(id);
    if (result.error) {
      return rejectWithValue(result.error);
    }
    return id;
  },
);

export const createCpContactThunk = createAsyncThunk(
  'cpContacts/create',
  async (payload, { rejectWithValue }) => {
    const result = await createCpContactService(payload);
    if (result.error) {
      return rejectWithValue(result.error);
    }
    return result.data ?? result;
  },
);

const cpContactsSlice = createSlice({
  name: 'cpContacts',
  initialState: cpContactsInitialState,
  reducers: {
    setActiveTab: (state, action) => {
      state.filters.activeTab = action.payload;
    },
    setSearchTerm: (state, action) => {
      state.filters.searchTerm = action.payload;
    },
    setSorting: (state, action) => {
      state.sorting = action.payload;
    },
    setGroupBy: (state, action) => {
      state.groupBy = action.payload ?? '';
    },
    setGroupOrder: (state, action) => {
      state.groupOrder = action.payload ?? 'asc';
    },
    setAppliedFilters: (state, action) => {
      state.appliedFilters = action.payload ?? cpContactsInitialState.appliedFilters;
    },
    resetCpContactsFilters: (state) => {
      state.filters.activeTab = cpContactsInitialState.filters.activeTab;
      state.filters.searchTerm = cpContactsInitialState.filters.searchTerm;
      state.sorting = cpContactsInitialState.sorting;
      state.groupBy = cpContactsInitialState.groupBy;
      state.groupOrder = cpContactsInitialState.groupOrder;
      state.appliedFilters = { ...DEFAULT_CP_CONTACTS_FILTERS };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCpContacts.pending, (state) => {
        state.listData.isLoading = true;
        state.listData.error = null;
        state.listData.status = 'loading';
      })
      .addCase(fetchCpContacts.fulfilled, (state, action) => {
        state.listData.data = Array.isArray(action.payload) ? action.payload : [];
        state.listData.isLoading = false;
        state.listData.error = null;
        state.listData.status = 'succeeded';
      })
      .addCase(fetchCpContacts.rejected, (state, action) => {
        state.listData.isLoading = false;
        state.listData.error = action.payload ?? 'Failed to load CP contacts.';
        state.listData.status = 'failed';
      })
      .addCase(deleteCpContactThunk.fulfilled, (state, action) => {
        state.listData.data = state.listData.data.filter(
          (item) => String(item.id) !== String(action.payload),
        );
      })
      .addCase(createCpContactThunk.fulfilled, (state, action) => {
        const payload = action.payload;
        if (!payload || !state.listData.data) return;
        const d = payload.data || payload;
        const listItem = {
          id: payload.name || d.name,
          name: [d.first_name, d.last_name].filter(Boolean).join(' ') || d.name,
          email: d.email_id || d.email,
          cpAccount: d.cp_account,
          createdAt: d.creation,
          salesOwnerName: d.sales_owner,
          ...d,
        };
        state.listData.data = [listItem, ...state.listData.data];
      });
  },
});

export const {
  setActiveTab,
  setSearchTerm,
  setSorting,
  setGroupBy,
  setGroupOrder,
  setAppliedFilters,
  resetCpContactsFilters,
} = cpContactsSlice.actions;

export const selectCpContactsListData = (state) => state.cpContacts.listData;
export const selectCpContactsFilters = (state) => state.cpContacts.filters;
export const selectCpContactsSorting = (state) => state.cpContacts.sorting;
export const selectCpContactsGroupBy = (state) => state.cpContacts.groupBy;
export const selectCpContactsGroupOrder = (state) => state.cpContacts.groupOrder;
export const selectCpContactsAppliedFilters = (state) => state.cpContacts.appliedFilters;

export const cpContactsReducer = cpContactsSlice.reducer;

// -----------------------------
// cpContactTasks slice
// -----------------------------
const cpContactTasksInitialState = {
  list: [],
  cpContactId: null,
  isLoading: false,
  error: null,
  status: 'idle',
};

export const fetchCpContactTasks = createAsyncThunk(
  'cpContactTasks/fetch',
  async (arg, { rejectWithValue }) => {
    let cpContactId;
    let keyword = '';
    let filters;
    if (arg == null) {
      return rejectWithValue('Missing contact id');
    }
    if (typeof arg === 'string') {
      cpContactId = arg;
    } else {
      cpContactId = arg.cpContactId ?? arg.id;
      keyword = arg.keyword ?? '';
      filters = arg.filters;
    }
    const result = await getCpContactTasks(cpContactId, { keyword, filters });
    if (result.error) {
      return rejectWithValue(result.error);
    }
    return { cpContactId, list: result.data ?? [] };
  },
);

export const updateCpContactTask = createAsyncThunk(
  'cpContactTasks/update',
  async (payload, { rejectWithValue }) => {
    const result = await updateCpContactTaskService(payload);
    if (result.error) return rejectWithValue(result.error);
    return result.data ?? null;
  },
);

const cpContactTasksSlice = createSlice({
  name: 'cpContactTasks',
  initialState: cpContactTasksInitialState,
  reducers: {
    clearCpContactTasks: (state) => {
      state.list = [];
      state.cpContactId = null;
      state.error = null;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCpContactTasks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.status = 'loading';
      })
      .addCase(fetchCpContactTasks.fulfilled, (state, action) => {
        const { cpContactId, list } = action.payload;
        state.list = list;
        state.cpContactId = cpContactId;
        state.isLoading = false;
        state.error = null;
        state.status = 'succeeded';
      })
      .addCase(fetchCpContactTasks.rejected, (state, action) => {
        state.list = [];
        state.cpContactId = null;
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load tasks.';
        state.status = 'failed';
      });

    builder
      .addCase(updateCpContactTask.pending, (state) => {
        state.error = null;
      })
      .addCase(updateCpContactTask.fulfilled, (state, action) => {
        const updated = action.payload;
        if (!updated) return;
        const idx = state.list.findIndex(
          (t) => String(t.id ?? t.name ?? '') === String(updated.id ?? updated.name ?? ''),
        );
        if (idx >= 0) {
          state.list[idx] = { ...state.list[idx], ...updated };
        }
      })
      .addCase(updateCpContactTask.rejected, (state, action) => {
        state.error = action.payload ?? 'Failed to update task.';
      });
  },
});

export const { clearCpContactTasks } = cpContactTasksSlice.actions;

export const selectCpContactTasksList = (state) => state?.cpContactTasks?.list ?? [];
export const selectCpContactTasksLoading = (state) => state?.cpContactTasks?.isLoading ?? false;
export const selectCpContactTasksError = (state) => state?.cpContactTasks?.error ?? null;
export const selectCpContactTasksStatus = (state) => state?.cpContactTasks?.status ?? 'idle';
export const selectCpContactTasksContactId = (state) => state?.cpContactTasks?.cpContactId ?? null;

export const cpContactTasksReducer = cpContactTasksSlice.reducer;
