import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

/** ERPNext doctype for DevX products (Item records with product category metadata). */
const PRODUCTS_LIST_PREF_DOCTYPE = 'Item';

export const saveProductsListPref = createAsyncThunk(
  'products/saveProductsListPref',
  async ({ react_table_id, columns }, thunkAPI) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: PRODUCTS_LIST_PREF_DOCTYPE,
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

export const fetchProductsListPref = createAsyncThunk(
  'products/fetchProductsListPref',
  async ({ react_table_id, custom_columns }, thunkAPI) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: {
          doctype: PRODUCTS_LIST_PREF_DOCTYPE,
          react_table_id: react_table_id || undefined,
          ...(Array.isArray(custom_columns) && custom_columns.length > 0
            ? { custom_columns: JSON.stringify(custom_columns) }
            : {}),
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

const productsSlice = createSlice({
  name: 'products',
  initialState: {},
  reducers: {},
});

export default productsSlice.reducer;
