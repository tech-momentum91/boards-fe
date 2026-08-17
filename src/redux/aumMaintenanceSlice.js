import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  addMaintenanceLogComment as addMaintenanceLogCommentApi,
  fetchMaintenanceLogActivities as fetchMaintenanceLogActivitiesApi,
} from '@/api/maintenanceActivities';
import {
  fetchMaintenanceTasks as fetchMaintenanceTasksApi,
  updateMaintenanceTask as updateMaintenanceTaskApi,
} from '@/api/maintenanceTasks';
import {
  fetchCenterSchedule as fetchCenterScheduleApi,
  fetchMasterScheduleTree as fetchMasterScheduleTreeApi,
  saveCenterScheduleLine as saveCenterScheduleLineApi,
  saveMasterScheduleLine as saveMasterScheduleLineApi,
} from '@/api/maintenanceScheduler';
import {
  fetchPreventiveCheckAssigneeOptions as fetchPreventiveCheckAssigneeOptionsApi,
  fetchPreventiveChecks as fetchPreventiveChecksApi,
  updatePreventiveCheck as updatePreventiveCheckApi,
} from '@/api/preventiveChecks';
import { updateMwqRow } from '@/components/aum/maintenance-work-queue/maintenance-work-queue-helper';
import {
  applyAumListFulfilled,
  applyAumListRejected,
  createAumListState,
  setAumListPending,
} from '@/components/aum/aum-list-pagination';

const asyncInitial = { status: 'idle', error: null };
const listInitial = createAumListState({ rows: [] });

const initialState = {
  scheduler: {
    master: { ...asyncInitial, rows: [] },
    center: { ...asyncInitial, rows: [], centerId: '' },
    mutations: {
      saveMasterStatus: 'idle',
      saveCenterStatus: 'idle',
      error: null,
    },
  },
  preventiveChecks: {
    list: { ...listInitial },
    assigneeOptions: { ...asyncInitial, byRowId: {}, loadingRowIds: {} },
    mutations: { updateStatus: 'idle', error: null },
  },
  maintenanceTasks: {
    list: { ...listInitial },
    mutations: { updateStatus: 'idle', error: null },
  },
  activities: {
    byAmlId: {},
    mutationStatus: 'idle',
    mutationError: null,
  },
};

function activityInitial() {
  return { ...asyncInitial, comments: [], history: [] };
}

export const fetchMasterScheduleTree = createAsyncThunk(
  'aumMaintenance/fetchMasterScheduleTree',
  async (_, { rejectWithValue }) => {
    try {
      const rows = await fetchMasterScheduleTreeApi();
      return rows;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchCenterSchedule = createAsyncThunk(
  'aumMaintenance/fetchCenterSchedule',
  async (center, { rejectWithValue }) => {
    try {
      const rows = await fetchCenterScheduleApi(center);
      return { center, rows };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const saveMasterScheduleLine = createAsyncThunk(
  'aumMaintenance/saveMasterScheduleLine',
  async (row, { rejectWithValue }) => {
    try {
      const result = await saveMasterScheduleLineApi(row);
      return { result, rowId: row.id };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const saveCenterScheduleLine = createAsyncThunk(
  'aumMaintenance/saveCenterScheduleLine',
  async ({ center, row }, { rejectWithValue }) => {
    try {
      const result = await saveCenterScheduleLineApi(center, row);
      return { result, center, rowId: row.id };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchPreventiveChecks = createAsyncThunk(
  'aumMaintenance/fetchPreventiveChecks',
  async (params, { rejectWithValue }) => {
    try {
      const result = await fetchPreventiveChecksApi(params ?? {});
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

export const updatePreventiveCheck = createAsyncThunk(
  'aumMaintenance/updatePreventiveCheck',
  async ({ name, patch }, { rejectWithValue }) => {
    try {
      const updated = await updatePreventiveCheckApi(name, patch);
      return { name, updated };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchPreventiveCheckAssigneeOptions = createAsyncThunk(
  'aumMaintenance/fetchPreventiveCheckAssigneeOptions',
  async (name, { rejectWithValue }) => {
    try {
      const result = await fetchPreventiveCheckAssigneeOptionsApi(name);
      return { name, ...result };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchMaintenanceTasks = createAsyncThunk(
  'aumMaintenance/fetchMaintenanceTasks',
  async (params, { rejectWithValue }) => {
    try {
      const result = await fetchMaintenanceTasksApi(params ?? {});
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

export const updateMaintenanceTask = createAsyncThunk(
  'aumMaintenance/updateMaintenanceTask',
  async ({ amlName, patch }, { rejectWithValue }) => {
    try {
      const updated = await updateMaintenanceTaskApi(amlName, patch);
      return { amlName, updated };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchMaintenanceLogActivities = createAsyncThunk(
  'aumMaintenance/fetchMaintenanceLogActivities',
  async (amlId, { rejectWithValue }) => {
    try {
      const data = await fetchMaintenanceLogActivitiesApi(amlId);
      return { amlId, ...data };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const addMaintenanceLogComment = createAsyncThunk(
  'aumMaintenance/addMaintenanceLogComment',
  async ({ amlId, payload }, { rejectWithValue }) => {
    try {
      await addMaintenanceLogCommentApi(amlId, payload);
      return amlId;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

const aumMaintenanceSlice = createSlice({
  name: 'aumMaintenance',
  initialState,
  reducers: {
    resetPreventiveChecksList: (state) => {
      state.preventiveChecks.list = { ...listInitial };
    },
    resetMaintenanceTasksList: (state) => {
      state.maintenanceTasks.list = { ...listInitial };
    },
    resetSchedulerState: (state) => {
      state.scheduler.master = { ...asyncInitial, rows: [] };
      state.scheduler.center = { ...asyncInitial, rows: [], centerId: '' };
    },
    clearMaintenanceActivities: (state, action) => {
      const amlId = action.payload;
      if (amlId) {
        delete state.activities.byAmlId[amlId];
      } else {
        state.activities.byAmlId = {};
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMasterScheduleTree.pending, (state) => {
        state.scheduler.master.status = 'loading';
        state.scheduler.master.error = null;
      })
      .addCase(fetchMasterScheduleTree.fulfilled, (state, action) => {
        state.scheduler.master.status = 'succeeded';
        state.scheduler.master.error = null;
        state.scheduler.master.rows = action.payload ?? [];
      })
      .addCase(fetchMasterScheduleTree.rejected, (state, action) => {
        state.scheduler.master.status = 'failed';
        state.scheduler.master.error = action.payload ?? 'Unknown error';
        state.scheduler.master.rows = [];
      })
      .addCase(fetchCenterSchedule.pending, (state) => {
        state.scheduler.center.status = 'loading';
        state.scheduler.center.error = null;
      })
      .addCase(fetchCenterSchedule.fulfilled, (state, action) => {
        state.scheduler.center.status = 'succeeded';
        state.scheduler.center.error = null;
        state.scheduler.center.rows = action.payload?.rows ?? [];
        state.scheduler.center.centerId = action.payload?.center ?? '';
      })
      .addCase(fetchCenterSchedule.rejected, (state, action) => {
        state.scheduler.center.status = 'failed';
        state.scheduler.center.error = action.payload ?? 'Unknown error';
        state.scheduler.center.rows = [];
      })
      .addCase(saveMasterScheduleLine.pending, (state) => {
        state.scheduler.mutations.saveMasterStatus = 'loading';
        state.scheduler.mutations.error = null;
      })
      .addCase(saveMasterScheduleLine.fulfilled, (state) => {
        state.scheduler.mutations.saveMasterStatus = 'succeeded';
        state.scheduler.mutations.error = null;
      })
      .addCase(saveMasterScheduleLine.rejected, (state, action) => {
        state.scheduler.mutations.saveMasterStatus = 'failed';
        state.scheduler.mutations.error = action.payload ?? 'Unknown error';
      })
      .addCase(saveCenterScheduleLine.pending, (state) => {
        state.scheduler.mutations.saveCenterStatus = 'loading';
        state.scheduler.mutations.error = null;
      })
      .addCase(saveCenterScheduleLine.fulfilled, (state) => {
        state.scheduler.mutations.saveCenterStatus = 'succeeded';
        state.scheduler.mutations.error = null;
      })
      .addCase(saveCenterScheduleLine.rejected, (state, action) => {
        state.scheduler.mutations.saveCenterStatus = 'failed';
        state.scheduler.mutations.error = action.payload ?? 'Unknown error';
      })
      .addCase(fetchPreventiveChecks.pending, (state, action) => {
        setAumListPending(state.preventiveChecks.list, action);
      })
      .addCase(fetchPreventiveChecks.fulfilled, (state, action) => {
        applyAumListFulfilled(state.preventiveChecks.list, action, { dataKey: 'rows' });
      })
      .addCase(fetchPreventiveChecks.rejected, (state, action) => {
        applyAumListRejected(state.preventiveChecks.list, action, { dataKey: 'rows' });
      })
      .addCase(updatePreventiveCheck.pending, (state) => {
        state.preventiveChecks.mutations.updateStatus = 'loading';
        state.preventiveChecks.mutations.error = null;
      })
      .addCase(updatePreventiveCheck.fulfilled, (state, action) => {
        state.preventiveChecks.mutations.updateStatus = 'succeeded';
        state.preventiveChecks.mutations.error = null;
        const { name, updated } = action.payload;
        state.preventiveChecks.list.rows = updateMwqRow(
          state.preventiveChecks.list.rows,
          name,
          updated,
        );
      })
      .addCase(updatePreventiveCheck.rejected, (state, action) => {
        state.preventiveChecks.mutations.updateStatus = 'failed';
        state.preventiveChecks.mutations.error = action.payload ?? 'Unknown error';
      })
      .addCase(fetchPreventiveCheckAssigneeOptions.pending, (state, action) => {
        const name = action.meta.arg;
        if (name) {
          state.preventiveChecks.assigneeOptions.loadingRowIds[name] = true;
        }
      })
      .addCase(fetchPreventiveCheckAssigneeOptions.fulfilled, (state, action) => {
        const { name, options, primaryAssigneeEmail } = action.payload;
        state.preventiveChecks.assigneeOptions.byRowId[name] = options ?? [];
        delete state.preventiveChecks.assigneeOptions.loadingRowIds[name];
        state.preventiveChecks.list.rows = state.preventiveChecks.list.rows.map((row) => {
          if (row.id !== name) return row;
          return {
            ...row,
            assignees: options ?? [],
            ...(primaryAssigneeEmail ? { primaryAssigneeEmail } : {}),
          };
        });
      })
      .addCase(fetchPreventiveCheckAssigneeOptions.rejected, (state, action) => {
        const name = action.meta.arg;
        if (name) {
          delete state.preventiveChecks.assigneeOptions.loadingRowIds[name];
        }
      })
      .addCase(fetchMaintenanceTasks.pending, (state, action) => {
        setAumListPending(state.maintenanceTasks.list, action);
      })
      .addCase(fetchMaintenanceTasks.fulfilled, (state, action) => {
        applyAumListFulfilled(state.maintenanceTasks.list, action, { dataKey: 'rows' });
      })
      .addCase(fetchMaintenanceTasks.rejected, (state, action) => {
        applyAumListRejected(state.maintenanceTasks.list, action, { dataKey: 'rows' });
      })
      .addCase(updateMaintenanceTask.pending, (state) => {
        state.maintenanceTasks.mutations.updateStatus = 'loading';
        state.maintenanceTasks.mutations.error = null;
      })
      .addCase(updateMaintenanceTask.fulfilled, (state, action) => {
        state.maintenanceTasks.mutations.updateStatus = 'succeeded';
        state.maintenanceTasks.mutations.error = null;
        const { amlName, updated } = action.payload;
        state.maintenanceTasks.list.rows = updateMwqRow(
          state.maintenanceTasks.list.rows,
          amlName,
          updated,
        );
      })
      .addCase(updateMaintenanceTask.rejected, (state, action) => {
        state.maintenanceTasks.mutations.updateStatus = 'failed';
        state.maintenanceTasks.mutations.error = action.payload ?? 'Unknown error';
      })
      .addCase(fetchMaintenanceLogActivities.pending, (state, action) => {
        const amlId = action.meta.arg;
        state.activities.byAmlId[amlId] = {
          ...(state.activities.byAmlId[amlId] ?? activityInitial()),
          status: 'loading',
          error: null,
        };
      })
      .addCase(fetchMaintenanceLogActivities.fulfilled, (state, action) => {
        const { amlId, comments, history } = action.payload;
        state.activities.byAmlId[amlId] = {
          status: 'succeeded',
          error: null,
          comments: comments ?? [],
          history: history ?? [],
        };
      })
      .addCase(fetchMaintenanceLogActivities.rejected, (state, action) => {
        const amlId = action.meta.arg;
        state.activities.byAmlId[amlId] = {
          ...(state.activities.byAmlId[amlId] ?? activityInitial()),
          status: 'failed',
          error: action.payload ?? 'Unknown error',
        };
      })
      .addCase(addMaintenanceLogComment.pending, (state) => {
        state.activities.mutationStatus = 'loading';
        state.activities.mutationError = null;
      })
      .addCase(addMaintenanceLogComment.fulfilled, (state) => {
        state.activities.mutationStatus = 'succeeded';
        state.activities.mutationError = null;
      })
      .addCase(addMaintenanceLogComment.rejected, (state, action) => {
        state.activities.mutationStatus = 'failed';
        state.activities.mutationError = action.payload ?? 'Unknown error';
      });
  },
});

export const {
  resetPreventiveChecksList,
  resetMaintenanceTasksList,
  resetSchedulerState,
  clearMaintenanceActivities,
} = aumMaintenanceSlice.actions;

export const selectMasterSchedule = (state) =>
  state.aumMaintenance?.scheduler?.master ?? { ...asyncInitial, rows: [] };
export const selectCenterSchedule = (state) =>
  state.aumMaintenance?.scheduler?.center ?? { ...asyncInitial, rows: [], centerId: '' };
export const selectPreventiveChecksList = (state) =>
  state.aumMaintenance?.preventiveChecks?.list ?? listInitial;
export const selectPreventiveCheckAssigneeOptions = (state) =>
  state.aumMaintenance?.preventiveChecks?.assigneeOptions ?? {
    ...asyncInitial,
    byRowId: {},
    loadingRowIds: {},
  };
export const selectMaintenanceTasksList = (state) =>
  state.aumMaintenance?.maintenanceTasks?.list ?? listInitial;
export const selectMaintenanceActivities = (state, amlId) =>
  state.aumMaintenance?.activities?.byAmlId?.[amlId] ?? activityInitial();
export const selectMaintenanceActivitiesMutation = (state) => ({
  status: state.aumMaintenance?.activities?.mutationStatus ?? 'idle',
  error: state.aumMaintenance?.activities?.mutationError ?? null,
});

export default aumMaintenanceSlice.reducer;
