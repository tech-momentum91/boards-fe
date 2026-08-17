import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import {
  buildCreateReleaseNotePayload,
  deleteReleaseNote as deleteReleaseNoteApi,
  buildUpdateReleaseNotePayload,
  getReleaseNoteListview,
  getReleaseNoteModuleFilters,
  postReleaseNote,
  putReleaseNote,
} from '@/api/releaseNote';
import { extractErrorMessage } from '@/utils/error-utils';

const listInitial = {
  status: 'idle',
  data: null,
  error: null,
};

const moduleFiltersInitial = {
  status: 'idle',
  data: [],
  error: null,
};

const initialState = {
  createStatus: 'idle',
  createError: null,
  lastCreated: null,
  list: listInitial,
  moduleFilters: moduleFiltersInitial,
};

export const fetchReleaseNoteListview = createAsyncThunk(
  'releaseNote/fetchListview',
  async (payload, { rejectWithValue }) => {
    try {
      return await getReleaseNoteListview(payload);
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Could not load release notes. Please try again.'),
      );
    }
  },
);

export const fetchReleaseNoteModuleFilters = createAsyncThunk(
  'releaseNote/fetchModuleFilters',
  async (_, { rejectWithValue }) => {
    try {
      return await getReleaseNoteModuleFilters();
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Could not load release note module filters.'),
      );
    }
  },
);

/**
 * Create a Release Note (draft: isPublished: false, publish: isPublished: true)
 * @param {{ releaseType: string[], title, description, modules, releaseDate, isPublished }} params
 */
export const createReleaseNote = createAsyncThunk(
  'releaseNote/create',
  async (
    { releaseType, title, description, modules, releaseDate, isPublished },
    { rejectWithValue },
  ) => {
    try {
      const payload = buildCreateReleaseNotePayload({
        releaseType,
        title,
        description,
        moduleNames: modules,
        isPublished,
        releaseDate,
      });
      const data = await postReleaseNote(payload);
      return { data, isPublished };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Could not create release note.'));
    }
  },
);

/**
 * Update an existing Release Note by document name (e.g. `RN-01`).
 */
export const updateReleaseNote = createAsyncThunk(
  'releaseNote/update',
  async (
    { name, releaseType, title, description, modules, releaseDate, isPublished },
    { rejectWithValue },
  ) => {
    try {
      const payload = buildUpdateReleaseNotePayload({
        releaseType,
        title,
        description,
        moduleNames: modules,
        isPublished,
        releaseDate,
      });
      const data = await putReleaseNote(name, payload);
      return { data, name };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Could not update release note.'));
    }
  },
);

/**
 * Delete an existing Release Note by document name (e.g. `RN-01`).
 */
export const deleteReleaseNote = createAsyncThunk(
  'releaseNote/delete',
  async ({ name }, { rejectWithValue }) => {
    try {
      const data = await deleteReleaseNoteApi(name);
      return { data, name };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Could not delete release note.'));
    }
  },
);

const releaseNoteSlice = createSlice({
  name: 'releaseNote',
  initialState,
  reducers: {
    clearCreateState: (state) => {
      state.createError = null;
      state.createStatus = 'idle';
    },
    clearReleaseNoteListError: (state) => {
      state.list.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReleaseNoteListview.pending, (state) => {
        state.list.status = 'loading';
        state.list.error = null;
      })
      .addCase(fetchReleaseNoteListview.fulfilled, (state, action) => {
        state.list.status = 'succeeded';
        state.list.error = null;
        state.list.data = action.payload;
      })
      .addCase(fetchReleaseNoteListview.rejected, (state, action) => {
        state.list.status = 'failed';
        state.list.error = action.payload ?? 'Unknown error';
      })
      .addCase(fetchReleaseNoteModuleFilters.pending, (state) => {
        state.moduleFilters.status = 'loading';
        state.moduleFilters.error = null;
      })
      .addCase(fetchReleaseNoteModuleFilters.fulfilled, (state, action) => {
        state.moduleFilters.status = 'succeeded';
        state.moduleFilters.error = null;
        state.moduleFilters.data = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchReleaseNoteModuleFilters.rejected, (state, action) => {
        state.moduleFilters.status = 'failed';
        state.moduleFilters.error = action.payload ?? 'Unknown error';
      })
      .addCase(createReleaseNote.pending, (state) => {
        state.createStatus = 'loading';
        state.createError = null;
      })
      .addCase(createReleaseNote.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        state.createError = null;
        state.lastCreated = action.payload?.data ?? null;
      })
      .addCase(createReleaseNote.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.createError = action.payload ?? 'Unknown error';
      })
      .addCase(updateReleaseNote.pending, (state) => {
        state.createStatus = 'loading';
        state.createError = null;
      })
      .addCase(updateReleaseNote.fulfilled, (state) => {
        state.createStatus = 'succeeded';
        state.createError = null;
      })
      .addCase(updateReleaseNote.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.createError = action.payload ?? 'Unknown error';
      })
      .addCase(deleteReleaseNote.pending, (state) => {
        state.createStatus = 'loading';
        state.createError = null;
      })
      .addCase(deleteReleaseNote.fulfilled, (state) => {
        state.createStatus = 'succeeded';
        state.createError = null;
      })
      .addCase(deleteReleaseNote.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.createError = action.payload ?? 'Unknown error';
      });
  },
});

export const { clearCreateState, clearReleaseNoteListError } = releaseNoteSlice.actions;

/** @param {import('@reduxjs/toolkit').RootState | { releaseNote?: object }} state */
export const selectReleaseNoteList = (state) => state.releaseNote?.list ?? listInitial;

/** @param {import('@reduxjs/toolkit').RootState | { releaseNote?: object }} state */
export const selectReleaseNoteModuleFilterOptions = (state) =>
  state.releaseNote?.moduleFilters?.data ?? [];

export default releaseNoteSlice.reducer;
