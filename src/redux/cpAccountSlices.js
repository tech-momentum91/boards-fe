import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  getCpAccountsList,
  deleteCpAccount as deleteCpAccountService,
  createCpAccount as createCpAccountService,
  getCpAccountById,
  getCpAccountDetailFilterOptions,
  getCpAccountLeads,
  getCpAccountTasks,
  getCpAccountTypeOptions,
  updateCpAccountTask as updateCpAccountTaskService,
} from '@/services/cp-accounts-service';
import { DEFAULT_CP_ACCOUNTS_FILTERS } from '@/pages/channel-partner/constants';

// -----------------------------
// cpAccountDetailFilters slice
// -----------------------------
const cpAccountDetailFiltersInitialFilters = {
  types: [],
  industry: [],
  city: [],
  state: [],
  salesOwner: [],
};

const cpAccountDetailFiltersInitialState = {
  appliedFilters: cpAccountDetailFiltersInitialFilters,
  filterOptions: null,
  optionsLoading: false,
  optionsError: null,
};

export const fetchCpAccountDetailFilterOptions = createAsyncThunk(
  'cpAccountDetailFilters/fetchOptions',
  async (accountId, { rejectWithValue }) => {
    const result = await getCpAccountDetailFilterOptions(accountId);
    if (result.error) {
      return rejectWithValue(result.error);
    }
    return result.data ?? null;
  },
);

const cpAccountDetailFiltersSlice = createSlice({
  name: 'cpAccountDetailFilters',
  initialState: cpAccountDetailFiltersInitialState,
  reducers: {
    setCpAccountDetailAppliedFilters: (state, action) => {
      state.appliedFilters = { ...cpAccountDetailFiltersInitialFilters, ...action.payload };
    },
    clearCpAccountDetailFilters: (state) => {
      state.appliedFilters = cpAccountDetailFiltersInitialFilters;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCpAccountDetailFilterOptions.pending, (state) => {
        state.optionsLoading = true;
        state.optionsError = null;
      })
      .addCase(fetchCpAccountDetailFilterOptions.fulfilled, (state, action) => {
        state.filterOptions = action.payload;
        state.optionsLoading = false;
        state.optionsError = null;
      })
      .addCase(fetchCpAccountDetailFilterOptions.rejected, (state, action) => {
        state.filterOptions = null;
        state.optionsLoading = false;
        state.optionsError = action.payload ?? 'Failed to load filter options.';
      });
  },
});

export const { setCpAccountDetailAppliedFilters, clearCpAccountDetailFilters } =
  cpAccountDetailFiltersSlice.actions;

export const selectCpAccountDetailAppliedFilters = (state) =>
  state?.cpAccountDetailFilters?.appliedFilters ?? cpAccountDetailFiltersInitialFilters;
export const selectCpAccountDetailFilterOptions = (state) =>
  state?.cpAccountDetailFilters?.filterOptions ?? null;
export const selectCpAccountDetailFilterOptionsLoading = (state) =>
  state?.cpAccountDetailFilters?.optionsLoading ?? false;
export const selectCpAccountDetailFilterOptionsError = (state) =>
  state?.cpAccountDetailFilters?.optionsError ?? null;
export const selectCpAccountDetailFilterCount = (state) => {
  const f = state?.cpAccountDetailFilters?.appliedFilters ?? cpAccountDetailFiltersInitialFilters;
  return (
    (f.types?.length ?? 0) +
    (f.industry?.length ?? 0) +
    (f.city?.length ?? 0) +
    (f.state?.length ?? 0) +
    (f.salesOwner?.length ?? 0)
  );
};

export const cpAccountDetailFiltersReducer = cpAccountDetailFiltersSlice.reducer;

// -----------------------------
// cpAccountDetail slice
// -----------------------------
const cpAccountDetailInitialState = {
  data: null,
  isLoading: false,
  error: null,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
};

export const fetchCpAccountDetail = createAsyncThunk(
  'cpAccountDetail/fetch',
  async (id, { rejectWithValue }) => {
    const result = await getCpAccountById(id);
    if (result.error) {
      return rejectWithValue(result.error);
    }
    return result.data ?? null;
  },
);

const cpAccountDetailSlice = createSlice({
  name: 'cpAccountDetail',
  initialState: cpAccountDetailInitialState,
  reducers: {
    setCpAccountDetail: (state, action) => {
      state.data = action.payload;
      state.error = null;
      state.status = action.payload ? 'succeeded' : 'idle';
    },
    clearCpAccountDetail: () => cpAccountDetailInitialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCpAccountDetail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.status = 'loading';
      })
      .addCase(fetchCpAccountDetail.fulfilled, (state, action) => {
        state.data = action.payload;
        state.isLoading = false;
        state.error = null;
        state.status = 'succeeded';
      })
      .addCase(fetchCpAccountDetail.rejected, (state, action) => {
        state.data = null;
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load CP account details.';
        state.status = 'failed';
      });
  },
});

export const { setCpAccountDetail, clearCpAccountDetail } = cpAccountDetailSlice.actions;

export const selectCpAccountDetail = (state) => state?.cpAccountDetail?.data ?? null;
export const selectCpAccountDetailLoading = (state) => state?.cpAccountDetail?.isLoading ?? false;
export const selectCpAccountDetailError = (state) => state?.cpAccountDetail?.error ?? null;
export const selectCpAccountDetailStatus = (state) => state?.cpAccountDetail?.status ?? 'idle';

export const cpAccountDetailReducer = cpAccountDetailSlice.reducer;

// -----------------------------
// cpAccountLeads slice
// -----------------------------
const cpAccountLeadsInitialState = {
  list: [],
  cpAccountId: null,
  isLoading: false,
  error: null,
  status: 'idle',
};

export const fetchCpAccountLeads = createAsyncThunk(
  'cpAccountLeads/fetch',
  async (arg, { rejectWithValue }) => {
    const cpAccountId = typeof arg === 'string' ? arg : arg?.cpAccountId;
    const filters = typeof arg === 'object' && arg != null ? arg.filters : undefined;
    const result = await getCpAccountLeads(cpAccountId, filters);
    if (result.error) {
      return rejectWithValue(result.error);
    }
    return { cpAccountId, list: result.data ?? [] };
  },
);

const cpAccountLeadsSlice = createSlice({
  name: 'cpAccountLeads',
  initialState: cpAccountLeadsInitialState,
  reducers: {
    clearCpAccountLeads: (state) => {
      state.list = [];
      state.cpAccountId = null;
      state.error = null;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCpAccountLeads.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.status = 'loading';
      })
      .addCase(fetchCpAccountLeads.fulfilled, (state, action) => {
        const { cpAccountId, list } = action.payload;
        state.list = list;
        state.cpAccountId = cpAccountId;
        state.isLoading = false;
        state.error = null;
        state.status = 'succeeded';
      })
      .addCase(fetchCpAccountLeads.rejected, (state, action) => {
        state.list = [];
        state.cpAccountId = null;
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load leads.';
        state.status = 'failed';
      });
  },
});

export const { clearCpAccountLeads } = cpAccountLeadsSlice.actions;

export const selectCpAccountLeadsList = (state) => state?.cpAccountLeads?.list ?? [];
export const selectCpAccountLeadsLoading = (state) => state?.cpAccountLeads?.isLoading ?? false;
export const selectCpAccountLeadsError = (state) => state?.cpAccountLeads?.error ?? null;
export const selectCpAccountLeadsStatus = (state) => state?.cpAccountLeads?.status ?? 'idle';
export const selectCpAccountLeadsAccountId = (state) => state?.cpAccountLeads?.cpAccountId ?? null;

export const cpAccountLeadsReducer = cpAccountLeadsSlice.reducer;

// -----------------------------
// cpAccounts slice
// -----------------------------
const cpAccountsInitialState = {
  listData: {
    data: [],
    isLoading: false,
    error: null,
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  },
  typeOptions: [],
  filters: {
    activeTab: 'all',
    searchTerm: '',
  },
  sorting: [],
  groupBy: '',
  groupOrder: 'asc',
  appliedFilters: { ...DEFAULT_CP_ACCOUNTS_FILTERS },
};

export const fetchCpAccounts = createAsyncThunk(
  'cpAccounts/fetchList',
  async (params, { rejectWithValue }) => {
    const result = await getCpAccountsList(params);
    if (result.error) {
      return rejectWithValue(result.error);
    }
    return result.data ?? [];
  },
);

export const fetchCpAccountTypeOptions = createAsyncThunk(
  'cpAccounts/fetchTypeOptions',
  async (_, { rejectWithValue }) => {
    const result = await getCpAccountTypeOptions();
    if (result.error) return rejectWithValue(result.error);
    return result.data ?? [];
  },
);

export const deleteCpAccountThunk = createAsyncThunk(
  'cpAccounts/delete',
  async (id, { rejectWithValue }) => {
    const result = await deleteCpAccountService(id);
    if (result.error) {
      return rejectWithValue(result.error);
    }
    return id;
  },
);

export const createCpAccountThunk = createAsyncThunk(
  'cpAccounts/create',
  async (payload, { rejectWithValue }) => {
    const result = await createCpAccountService(payload);
    if (result.error) {
      return rejectWithValue(result.error);
    }
    return result.data;
  },
);

const cpAccountsSlice = createSlice({
  name: 'cpAccounts',
  initialState: cpAccountsInitialState,
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
      state.appliedFilters = action.payload ?? cpAccountsInitialState.appliedFilters;
    },
    resetCpAccountsFilters: (state) => {
      state.filters.activeTab = cpAccountsInitialState.filters.activeTab;
      state.filters.searchTerm = cpAccountsInitialState.filters.searchTerm;
      state.sorting = cpAccountsInitialState.sorting;
      state.groupBy = cpAccountsInitialState.groupBy;
      state.groupOrder = cpAccountsInitialState.groupOrder;
      state.appliedFilters = cpAccountsInitialState.appliedFilters;
    },
    /** Patch one list row in place so inline edits do not reorder the list (API sorts by modified DESC). */
    patchCpAccountInList: (state, action) => {
      const { id, updates } = action.payload ?? {};
      if (!id || !updates || typeof updates !== 'object') return;
      const index = state.listData.data.findIndex((row) => String(row.id) === String(id));
      if (index === -1) return;
      state.listData.data[index] = { ...state.listData.data[index], ...updates };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCpAccounts.pending, (state) => {
        state.listData.isLoading = true;
        state.listData.error = null;
        state.listData.status = 'loading';
      })
      .addCase(fetchCpAccounts.fulfilled, (state, action) => {
        state.listData.data = Array.isArray(action.payload) ? action.payload : [];
        state.listData.isLoading = false;
        state.listData.error = null;
        state.listData.status = 'succeeded';
      })
      .addCase(fetchCpAccounts.rejected, (state, action) => {
        state.listData.isLoading = false;
        state.listData.error = action.payload ?? 'Failed to load CP accounts.';
        state.listData.status = 'failed';
      })
      .addCase(fetchCpAccountTypeOptions.fulfilled, (state, action) => {
        state.typeOptions = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(deleteCpAccountThunk.fulfilled, (state, action) => {
        state.listData.data = state.listData.data.filter(
          (item) => String(item.id) !== String(action.payload),
        );
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
  resetCpAccountsFilters,
  patchCpAccountInList,
} = cpAccountsSlice.actions;

/** Map API update field names to list row keys. */
export function cpAccountListRowPatch(field, value) {
  if (field === 'yearOfEst') {
    return { yearOfEstablishment: value ?? '' };
  }
  return { [field]: value ?? '' };
}

export const selectCpAccountsListData = (state) =>
  state?.cpAccounts?.listData ?? cpAccountsInitialState.listData;
export const selectCpAccountTypeOptions = (state) =>
  Array.isArray(state?.cpAccounts?.typeOptions) ? state.cpAccounts.typeOptions : [];
export const selectCpAccountsFilters = (state) =>
  state?.cpAccounts?.filters ?? cpAccountsInitialState.filters;
export const selectCpAccountsSorting = (state) =>
  state?.cpAccounts?.sorting ?? cpAccountsInitialState.sorting;
export const selectCpAccountsGroupBy = (state) =>
  state?.cpAccounts?.groupBy ?? cpAccountsInitialState.groupBy;
export const selectCpAccountsGroupOrder = (state) =>
  state?.cpAccounts?.groupOrder ?? cpAccountsInitialState.groupOrder;
export const selectCpAccountsAppliedFilters = (state) =>
  state?.cpAccounts?.appliedFilters ?? cpAccountsInitialState.appliedFilters;

export const cpAccountsReducer = cpAccountsSlice.reducer;

// -----------------------------
// cpAccountTasks slice
// -----------------------------
const cpAccountTasksInitialState = {
  list: [],
  cpAccountId: null,
  isLoading: false,
  error: null,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
};

export const fetchCpAccountTasks = createAsyncThunk(
  'cpAccountTasks/fetch',
  async (arg, { rejectWithValue }) => {
    let cpAccountId;
    let keyword = '';
    let filters;
    if (arg == null) {
      return rejectWithValue('Missing account id');
    }
    if (typeof arg === 'string') {
      cpAccountId = arg;
    } else {
      cpAccountId = arg.cpAccountId ?? arg.id;
      keyword = arg.keyword ?? '';
      filters = arg.filters;
    }
    const result = await getCpAccountTasks(cpAccountId, { keyword, filters });
    if (result.error) {
      return rejectWithValue(result.error);
    }
    return { cpAccountId, list: result.data ?? [] };
  },
);

export const updateCpAccountTask = createAsyncThunk(
  'cpAccountTasks/update',
  async (payload, { rejectWithValue }) => {
    const result = await updateCpAccountTaskService(payload);
    if (result.error) return rejectWithValue(result.error);
    // Service now returns the updated ACL Task document in data.
    return result.data ?? null;
  },
);

const cpAccountTasksSlice = createSlice({
  name: 'cpAccountTasks',
  initialState: cpAccountTasksInitialState,
  reducers: {
    clearCpAccountTasks: (state) => {
      state.list = [];
      state.cpAccountId = null;
      state.error = null;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCpAccountTasks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.status = 'loading';
      })
      .addCase(fetchCpAccountTasks.fulfilled, (state, action) => {
        const { cpAccountId, list } = action.payload;
        state.list = list;
        state.cpAccountId = cpAccountId;
        state.isLoading = false;
        state.error = null;
        state.status = 'succeeded';
      })
      .addCase(fetchCpAccountTasks.rejected, (state, action) => {
        state.list = [];
        state.cpAccountId = null;
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load tasks.';
        state.status = 'failed';
      });

    builder
      .addCase(updateCpAccountTask.pending, (state) => {
        state.error = null;
      })
      .addCase(updateCpAccountTask.fulfilled, (state, action) => {
        const updated = action.payload;
        if (!updated) return;
        const idx = state.list.findIndex(
          (t) => String(t.id ?? t.name ?? '') === String(updated.id ?? updated.name ?? ''),
        );
        if (idx >= 0) {
          state.list[idx] = { ...state.list[idx], ...updated };
        }
      })
      .addCase(updateCpAccountTask.rejected, (state, action) => {
        state.error = action.payload ?? 'Failed to update task.';
      });
  },
});

export const { clearCpAccountTasks } = cpAccountTasksSlice.actions;

export const selectCpAccountTasksList = (state) => state?.cpAccountTasks?.list ?? [];
export const selectCpAccountTasksLoading = (state) => state?.cpAccountTasks?.isLoading ?? false;
export const selectCpAccountTasksError = (state) => state?.cpAccountTasks?.error ?? null;
export const selectCpAccountTasksStatus = (state) => state?.cpAccountTasks?.status ?? 'idle';
export const selectCpAccountTasksAccountId = (state) => state?.cpAccountTasks?.cpAccountId ?? null;

export const cpAccountTasksReducer = cpAccountTasksSlice.reducer;
