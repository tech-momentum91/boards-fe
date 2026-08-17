import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import { normalizeGlobalSearchResults } from '@/utils/global-search-utils';

const initialState = {
  results: [],
  status: 'idle',
  error: null,
  query: '',
};

export const fetchGlobalSearchResults = createAsyncThunk(
  'globalSearch/fetchResults',
  async ({ text, start = 0, limit = 20, doctype = '' } = {}, { rejectWithValue, signal }) => {
    try {
      const response = await apiClient.get('/method/frappe.utils.global_search.search', {
        params: {
          text,
          start,
          limit,
          doctype,
        },
        signal,
      });

      const rows = response?.data?.message || [];
      return {
        append: start > 0,
        query: String(text ?? ''),
        results: normalizeGlobalSearchResults(rows, text),
      };
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.name === 'AbortError') {
        throw error;
      }
      return rejectWithValue(error.serialized || error.response?.data || error.message);
    }
  },
);

const globalSearchSlice = createSlice({
  name: 'globalSearch',
  initialState,
  reducers: {
    clearGlobalSearchResults: (state) => {
      state.results = [];
      state.status = 'idle';
      state.error = null;
      state.query = '';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGlobalSearchResults.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.query = String(action.meta?.arg?.text ?? '');
      })
      .addCase(fetchGlobalSearchResults.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.query = action.payload.query;
        if (action.payload.append) {
          state.results = [...state.results, ...action.payload.results];
          return;
        }
        state.results = action.payload.results;
      })
      .addCase(fetchGlobalSearchResults.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error?.message || 'Failed to fetch global search';
      });
  },
});

export const { clearGlobalSearchResults } = globalSearchSlice.actions;
export const selectGlobalSearchState = (state) => state.globalSearch || initialState;
export const selectGlobalSearchResults = (state) => selectGlobalSearchState(state).results;
export const selectGlobalSearchStatus = (state) => selectGlobalSearchState(state).status;
export const selectGlobalSearchError = (state) => selectGlobalSearchState(state).error;

export default globalSearchSlice.reducer;
