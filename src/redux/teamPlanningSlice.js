import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import { DEFAULT_TEAM_PLANNING_FILTERS } from '@/components/team-planning/constants';

const serializeError = (error) => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  return error?.message || 'Something went wrong';
};

const isCurrentRequest = (requestId, action) => requestId === action.meta.requestId;

const initialState = {
  filters: { ...DEFAULT_TEAM_PLANNING_FILTERS },
  grid: {
    data: null,
    isLoading: false,
    error: null,
    status: 'idle',
    requestId: null,
  },
  availableBench: {
    data: null,
    isLoading: false,
    error: null,
    requestId: null,
    department: 'all',
  },
  allocationModal: {
    isOpen: false,
    isLoading: false,
    isSaving: false,
    error: null,
    context: null,
    data: null,
    centerClients: [],
    clientsLoading: false,
    clientsError: null,
    requestId: null,
    requestCenter: null,
    clientsRequestId: null,
  },
  projectTeamModal: {
    isOpen: false,
    isLoading: false,
    isSaving: false,
    error: null,
    context: null,
    data: null,
    requestId: null,
  },
  benchMemberModal: {
    isOpen: false,
    isSaving: false,
    error: null,
    context: null,
  },
  weeklyPriority: {
    data: null,
    isLoading: false,
    error: null,
    requestId: null,
  },
  weeklyPriorityModal: {
    isOpen: false,
    isLoading: false,
    isSaving: false,
    error: null,
    context: null,
    data: null,
    requestId: null,
  },
};

export const fetchTeamPlanningGrid = createAsyncThunk(
  'teamPlanning/fetchTeamPlanningGrid',
  async (
    {
      keyword,
      planning_month,
      planning_year,
      planning_week_start,
      view_mode,
      filters,
      group_by,
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const endpoint =
        view_mode === 'bench'
          ? '/method/devx.team_management.api.team_planning.get_bench_grid'
          : '/method/devx.team_management.api.team_planning.get_team_planning_grid';

      const departmentFilter = filters?.department;
      const hasDepartmentFilter = Array.isArray(departmentFilter)
        ? departmentFilter.length > 0
        : Boolean(departmentFilter && departmentFilter !== 'all');

      const response = await apiClient.post(endpoint, {
        keyword: keyword || '',
        planning_month,
        planning_year,
        planning_week_start,
        view_mode,
        department: hasDepartmentFilter
          ? Array.isArray(departmentFilter)
            ? JSON.stringify(departmentFilter)
            : departmentFilter
          : undefined,
        filters:
          filters && typeof filters === 'object' ? JSON.stringify(filters) : filters || undefined,
        group_by: group_by || 'departments',
      });
      return response?.data?.message ?? response?.data ?? {};
    } catch (error) {
      return rejectWithValue(serializeError(error));
    }
  },
);

export const fetchAvailableBench = createAsyncThunk(
  'teamPlanning/fetchAvailableBench',
  async ({ planning_year, department, filters } = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/method/devx.team_management.api.team_planning.get_available_bench',
        {
          params: {
            planning_year,
            department: department && department !== 'all' ? department : undefined,
            filters:
              filters && typeof filters === 'object'
                ? JSON.stringify(filters)
                : filters || undefined,
          },
        },
      );
      return response?.data?.message ?? response?.data ?? {};
    } catch (error) {
      return rejectWithValue(serializeError(error));
    }
  },
);

export const createBenchTeamMember = createAsyncThunk(
  'teamPlanning/createBenchTeamMember',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.team_management.api.team_planning.create_bench_team_member',
        {
          first_name: payload.first_name,
          last_name: payload.last_name,
          role: payload.role,
          email: payload.email,
          date_of_joining: payload.date_of_joining,
          status: payload.status,
          center: payload.center,
          centers: payload.centers ? JSON.stringify(payload.centers) : undefined,
        },
      );
      return response?.data?.message ?? response?.data ?? {};
    } catch (error) {
      return rejectWithValue(serializeError(error));
    }
  },
);

export const fetchAllocationModalData = createAsyncThunk(
  'teamPlanning/fetchAllocationModalData',
  async (
    { member_id, team_type, center, planning_month, centers, view_mode, planning_week_start },
    { rejectWithValue },
  ) => {
    try {
      const response = await apiClient.get(
        '/method/devx.team_management.api.team_planning.get_user_center_allocations',
        {
          params: {
            member_id,
            team_type,
            center,
            planning_month,
            centers: centers ? JSON.stringify(centers) : undefined,
            view_mode: view_mode || 'monthly_capacity',
            planning_week_start: planning_week_start || undefined,
          },
        },
      );
      return response?.data?.message ?? response?.data ?? {};
    } catch (error) {
      return rejectWithValue(serializeError(error));
    }
  },
);

export const fetchCenterClients = createAsyncThunk(
  'teamPlanning/fetchCenterClients',
  async ({ center, centers, keyword, exclude }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/method/devx.team_management.api.team_planning.get_center_clients',
        {
          params: {
            center,
            centers: centers ? JSON.stringify(centers) : undefined,
            keyword: keyword || '',
            exclude: exclude ? JSON.stringify(exclude) : undefined,
          },
        },
      );
      return response?.data?.message ?? response?.data ?? [];
    } catch (error) {
      return rejectWithValue(serializeError(error));
    }
  },
);

export const saveUserCenterAllocations = createAsyncThunk(
  'teamPlanning/saveUserCenterAllocations',
  async (
    {
      member_id,
      team_type,
      center,
      centers,
      planning_month,
      allocations,
      view_mode,
      planning_week_start,
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await apiClient.post(
        '/method/devx.team_management.api.team_planning.save_user_center_allocations',
        {
          member_id,
          team_type,
          center,
          centers: centers ? JSON.stringify(centers) : undefined,
          planning_month,
          allocations: JSON.stringify(allocations),
          view_mode: view_mode || 'monthly_capacity',
          planning_week_start: planning_week_start || undefined,
        },
      );
      return response?.data?.message ?? response?.data ?? {};
    } catch (error) {
      return rejectWithValue(serializeError(error));
    }
  },
);

export const fetchProjectTeamAllocations = createAsyncThunk(
  'teamPlanning/fetchProjectTeamAllocations',
  async (
    { client, role_type_label, center, centers, planning_month, view_mode, planning_week_start },
    { rejectWithValue },
  ) => {
    try {
      const response = await apiClient.get(
        '/method/devx.team_management.api.team_planning.get_project_team_allocations',
        {
          params: {
            client,
            role_type_label,
            center,
            centers: centers ? JSON.stringify(centers) : undefined,
            planning_month,
            view_mode: view_mode || 'monthly_capacity',
            planning_week_start: planning_week_start || undefined,
          },
        },
      );
      return response?.data?.message ?? response?.data ?? {};
    } catch (error) {
      return rejectWithValue(serializeError(error));
    }
  },
);

export const saveProjectTeamAllocations = createAsyncThunk(
  'teamPlanning/saveProjectTeamAllocations',
  async (
    {
      client,
      role_type_label,
      center,
      planning_month,
      allocations,
      view_mode,
      planning_week_start,
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await apiClient.post(
        '/method/devx.team_management.api.team_planning.save_project_team_allocations',
        {
          client,
          role_type_label,
          center,
          planning_month,
          allocations: JSON.stringify(allocations),
          view_mode: view_mode || 'monthly_capacity',
          planning_week_start: planning_week_start || undefined,
        },
      );
      return response?.data?.message ?? response?.data ?? {};
    } catch (error) {
      return rejectWithValue(serializeError(error));
    }
  },
);

export const fetchWeeklyPriorities = createAsyncThunk(
  'teamPlanning/fetchWeeklyPriorities',
  async ({ planning_week_start, filters } = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/method/devx.team_management.api.team_planning.get_weekly_priorities',
        {
          params: {
            planning_week_start,
            filters:
              filters && typeof filters === 'object'
                ? JSON.stringify(filters)
                : filters || undefined,
          },
        },
      );
      return response?.data?.message ?? response?.data ?? {};
    } catch (error) {
      return rejectWithValue(serializeError(error));
    }
  },
);

export const fetchWeeklyPriorityProjects = createAsyncThunk(
  'teamPlanning/fetchWeeklyPriorityProjects',
  async (
    { planning_week_start, task_category, keyword, location, status, filters } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await apiClient.get(
        '/method/devx.team_management.api.team_planning.get_weekly_priority_projects',
        {
          params: {
            planning_week_start,
            task_category,
            keyword: keyword || '',
            location: location && location !== 'all' ? location : undefined,
            status: status && status !== 'all' ? status : undefined,
            filters:
              filters && typeof filters === 'object'
                ? JSON.stringify(filters)
                : filters || undefined,
          },
        },
      );
      return response?.data?.message ?? response?.data ?? {};
    } catch (error) {
      return rejectWithValue(serializeError(error));
    }
  },
);

export const saveWeeklyPriorities = createAsyncThunk(
  'teamPlanning/saveWeeklyPriorities',
  async ({ planning_week_start, task_category, clients, filters } = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.team_management.api.team_planning.save_weekly_priorities',
        {
          planning_week_start,
          task_category,
          clients: JSON.stringify(clients || []),
          filters:
            filters && typeof filters === 'object' ? JSON.stringify(filters) : filters || undefined,
        },
      );
      return response?.data?.message ?? response?.data ?? {};
    } catch (error) {
      return rejectWithValue(serializeError(error));
    }
  },
);

export const removeWeeklyPriority = createAsyncThunk(
  'teamPlanning/removeWeeklyPriority',
  async (
    { name, client, task_category, planning_week_start, filters } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await apiClient.post(
        '/method/devx.team_management.api.team_planning.remove_weekly_priority',
        {
          name,
          client,
          task_category,
          planning_week_start,
          filters:
            filters && typeof filters === 'object' ? JSON.stringify(filters) : filters || undefined,
        },
      );
      return response?.data?.message ?? response?.data ?? {};
    } catch (error) {
      return rejectWithValue(serializeError(error));
    }
  },
);

const teamPlanningSlice = createSlice({
  name: 'teamPlanning',
  initialState,
  reducers: {
    setTeamPlanningFilters(state, action) {
      const prevMode = state.filters.view_mode;
      state.filters = { ...state.filters, ...action.payload };
      // Switching Monthly ↔ Weekly must not briefly show the other mode's cells.
      if (action.payload?.view_mode && action.payload.view_mode !== prevMode) {
        state.grid.data = null;
        state.grid.error = null;
        state.grid.status = 'idle';
      }
    },
    openAllocationModal(state, action) {
      state.allocationModal.isOpen = true;
      state.allocationModal.context = action.payload;
      state.allocationModal.error = null;
      state.allocationModal.clientsError = null;
      state.allocationModal.data = null;
      state.allocationModal.requestId = null;
      state.allocationModal.requestCenter = null;
      state.allocationModal.clientsRequestId = null;
    },
    closeAllocationModal(state) {
      state.allocationModal = {
        ...initialState.allocationModal,
      };
    },
    openProjectTeamModal(state, action) {
      state.projectTeamModal.isOpen = true;
      state.projectTeamModal.context = action.payload;
      state.projectTeamModal.error = null;
      state.projectTeamModal.data = null;
      state.projectTeamModal.requestId = null;
    },
    closeProjectTeamModal(state) {
      state.projectTeamModal = {
        ...initialState.projectTeamModal,
      };
    },
    openBenchMemberModal(state, action) {
      state.benchMemberModal.isOpen = true;
      state.benchMemberModal.context = action.payload || null;
      state.benchMemberModal.error = null;
    },
    closeBenchMemberModal(state) {
      state.benchMemberModal = {
        ...initialState.benchMemberModal,
      };
    },
    setAvailableBenchDepartment(state, action) {
      state.availableBench.department = action.payload || 'all';
    },
    openWeeklyPriorityModal(state, action) {
      state.weeklyPriorityModal.isOpen = true;
      state.weeklyPriorityModal.context = action.payload;
      state.weeklyPriorityModal.error = null;
      state.weeklyPriorityModal.data = null;
      state.weeklyPriorityModal.requestId = null;
    },
    closeWeeklyPriorityModal(state) {
      state.weeklyPriorityModal = {
        ...initialState.weeklyPriorityModal,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeamPlanningGrid.pending, (state, action) => {
        state.grid.isLoading = true;
        state.grid.status = 'loading';
        state.grid.error = null;
        state.grid.requestId = action.meta.requestId;
      })
      .addCase(fetchTeamPlanningGrid.fulfilled, (state, action) => {
        if (!isCurrentRequest(state.grid.requestId, action)) return;

        state.grid.isLoading = false;
        state.grid.status = 'succeeded';
        state.grid.data = action.payload;

        // Only adopt server defaults when the client did not send an explicit period.
        const args = action.meta.arg || {};
        if (args.planning_month == null && action.payload?.planning_month) {
          state.filters.planning_month = action.payload.planning_month;
        }
        if (args.planning_year == null && action.payload?.planning_year != null) {
          state.filters.planning_year = action.payload.planning_year;
        }
        if (args.planning_week_start == null && action.payload?.planning_week_start !== undefined) {
          state.filters.planning_week_start = action.payload.planning_week_start;
        }
      })
      .addCase(fetchTeamPlanningGrid.rejected, (state, action) => {
        if (!isCurrentRequest(state.grid.requestId, action)) return;

        state.grid.isLoading = false;
        state.grid.status = 'failed';
        state.grid.error = action.payload;
        state.grid.data = null;
      })
      .addCase(fetchAllocationModalData.pending, (state, action) => {
        state.allocationModal.isLoading = true;
        state.allocationModal.error = null;
        state.allocationModal.requestId = action.meta.requestId;
        state.allocationModal.requestCenter = action.meta.arg?.center ?? null;
      })
      .addCase(fetchAllocationModalData.fulfilled, (state, action) => {
        if (!isCurrentRequest(state.allocationModal.requestId, action)) return;
        if (
          state.allocationModal.requestCenter &&
          action.meta.arg?.center &&
          state.allocationModal.requestCenter !== action.meta.arg.center
        ) {
          return;
        }

        state.allocationModal.isLoading = false;
        state.allocationModal.data = action.payload;
      })
      .addCase(fetchAllocationModalData.rejected, (state, action) => {
        if (!isCurrentRequest(state.allocationModal.requestId, action)) return;

        state.allocationModal.isLoading = false;
        state.allocationModal.error = action.payload;
      })
      .addCase(fetchCenterClients.pending, (state, action) => {
        state.allocationModal.clientsLoading = true;
        state.allocationModal.clientsError = null;
        state.allocationModal.clientsRequestId = action.meta.requestId;
      })
      .addCase(fetchCenterClients.fulfilled, (state, action) => {
        if (!isCurrentRequest(state.allocationModal.clientsRequestId, action)) return;

        state.allocationModal.clientsLoading = false;
        state.allocationModal.centerClients = Array.isArray(action.payload) ? action.payload : [];
        state.allocationModal.clientsError = null;
      })
      .addCase(fetchCenterClients.rejected, (state, action) => {
        if (!isCurrentRequest(state.allocationModal.clientsRequestId, action)) return;

        state.allocationModal.clientsLoading = false;
        state.allocationModal.centerClients = [];
        state.allocationModal.clientsError = action.payload || 'Failed to load projects';
      })
      .addCase(saveUserCenterAllocations.pending, (state) => {
        state.allocationModal.isSaving = true;
        state.allocationModal.error = null;
      })
      .addCase(saveUserCenterAllocations.fulfilled, (state, action) => {
        state.allocationModal.isSaving = false;
        state.allocationModal.data = action.payload;
      })
      .addCase(saveUserCenterAllocations.rejected, (state, action) => {
        state.allocationModal.isSaving = false;
        state.allocationModal.error = action.payload;
      })
      .addCase(fetchProjectTeamAllocations.pending, (state, action) => {
        state.projectTeamModal.isLoading = true;
        state.projectTeamModal.error = null;
        state.projectTeamModal.requestId = action.meta.requestId;
      })
      .addCase(fetchProjectTeamAllocations.fulfilled, (state, action) => {
        if (!isCurrentRequest(state.projectTeamModal.requestId, action)) return;
        if (action.meta.aborted) return;
        state.projectTeamModal.isLoading = false;
        state.projectTeamModal.data = action.payload;
      })
      .addCase(fetchProjectTeamAllocations.rejected, (state, action) => {
        if (!isCurrentRequest(state.projectTeamModal.requestId, action)) return;
        if (action.meta.aborted) return;
        state.projectTeamModal.isLoading = false;
        state.projectTeamModal.error = action.payload;
      })
      .addCase(saveProjectTeamAllocations.pending, (state) => {
        state.projectTeamModal.isSaving = true;
        state.projectTeamModal.error = null;
      })
      .addCase(saveProjectTeamAllocations.fulfilled, (state, action) => {
        state.projectTeamModal.isSaving = false;
        state.projectTeamModal.data = action.payload;
      })
      .addCase(saveProjectTeamAllocations.rejected, (state, action) => {
        state.projectTeamModal.isSaving = false;
        state.projectTeamModal.error = action.payload;
      })
      .addCase(fetchAvailableBench.pending, (state, action) => {
        state.availableBench.isLoading = true;
        state.availableBench.error = null;
        state.availableBench.requestId = action.meta.requestId;
      })
      .addCase(fetchAvailableBench.fulfilled, (state, action) => {
        if (!isCurrentRequest(state.availableBench.requestId, action)) return;
        state.availableBench.isLoading = false;
        state.availableBench.data = action.payload;
      })
      .addCase(fetchAvailableBench.rejected, (state, action) => {
        if (!isCurrentRequest(state.availableBench.requestId, action)) return;
        state.availableBench.isLoading = false;
        state.availableBench.error = action.payload;
        state.availableBench.data = null;
      })
      .addCase(createBenchTeamMember.pending, (state) => {
        state.benchMemberModal.isSaving = true;
        state.benchMemberModal.error = null;
      })
      .addCase(createBenchTeamMember.fulfilled, (state) => {
        state.benchMemberModal.isSaving = false;
      })
      .addCase(createBenchTeamMember.rejected, (state, action) => {
        state.benchMemberModal.isSaving = false;
        state.benchMemberModal.error = action.payload;
      })
      .addCase(fetchWeeklyPriorities.pending, (state, action) => {
        state.weeklyPriority.isLoading = true;
        state.weeklyPriority.error = null;
        state.weeklyPriority.requestId = action.meta.requestId;
      })
      .addCase(fetchWeeklyPriorities.fulfilled, (state, action) => {
        if (!isCurrentRequest(state.weeklyPriority.requestId, action)) return;
        state.weeklyPriority.isLoading = false;
        state.weeklyPriority.data = action.payload;
      })
      .addCase(fetchWeeklyPriorities.rejected, (state, action) => {
        if (!isCurrentRequest(state.weeklyPriority.requestId, action)) return;
        state.weeklyPriority.isLoading = false;
        state.weeklyPriority.error = action.payload;
        state.weeklyPriority.data = null;
      })
      .addCase(fetchWeeklyPriorityProjects.pending, (state, action) => {
        state.weeklyPriorityModal.isLoading = true;
        state.weeklyPriorityModal.error = null;
        state.weeklyPriorityModal.requestId = action.meta.requestId;
      })
      .addCase(fetchWeeklyPriorityProjects.fulfilled, (state, action) => {
        if (!isCurrentRequest(state.weeklyPriorityModal.requestId, action)) return;
        state.weeklyPriorityModal.isLoading = false;
        state.weeklyPriorityModal.data = action.payload;
      })
      .addCase(fetchWeeklyPriorityProjects.rejected, (state, action) => {
        if (!isCurrentRequest(state.weeklyPriorityModal.requestId, action)) return;
        state.weeklyPriorityModal.isLoading = false;
        state.weeklyPriorityModal.error = action.payload;
      })
      .addCase(saveWeeklyPriorities.pending, (state) => {
        state.weeklyPriorityModal.isSaving = true;
        state.weeklyPriorityModal.error = null;
      })
      .addCase(saveWeeklyPriorities.fulfilled, (state, action) => {
        state.weeklyPriorityModal.isSaving = false;
        state.weeklyPriority.data = action.payload;
      })
      .addCase(saveWeeklyPriorities.rejected, (state, action) => {
        state.weeklyPriorityModal.isSaving = false;
        state.weeklyPriorityModal.error = action.payload;
      });
  },
});

export const {
  setTeamPlanningFilters,
  openAllocationModal,
  closeAllocationModal,
  openProjectTeamModal,
  closeProjectTeamModal,
  openBenchMemberModal,
  closeBenchMemberModal,
  setAvailableBenchDepartment,
  openWeeklyPriorityModal,
  closeWeeklyPriorityModal,
} = teamPlanningSlice.actions;

export default teamPlanningSlice.reducer;
