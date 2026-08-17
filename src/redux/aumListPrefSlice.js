import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

export const fetchAumListPref = createAsyncThunk(
  'aumListPref/fetch',
  async ({ doctype, react_table_id }, thunkAPI) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: {
          doctype,
          react_table_id: react_table_id || undefined,
        },
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch list preference'),
      );
    }
  },
);

export const saveAumListPref = createAsyncThunk(
  'aumListPref/save',
  async ({ doctype, react_table_id, columns }, thunkAPI) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype,
        columns,
        react_table_id: react_table_id || undefined,
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to save list preference'),
      );
    }
  },
);

const aumListPrefSlice = createSlice({
  name: 'aumListPref',
  initialState: {},
  reducers: {},
});

export default aumListPrefSlice.reducer;
