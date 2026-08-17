import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  createProductCategory,
  deleteProductCategory,
  fetchProductCategories,
  updateProductCategory,
} from '@/api/productCategories';
import {
  createProductCategoryDraftRow,
  PRODUCT_CATEGORY_DEFAULT_TAB,
} from '@/pages/profile/product-categories/constants';
import { extractErrorMessage } from '@/utils/error-utils';

const initialState = {
  rowsByTab: {},
  status: 'idle',
  error: null,
  mutationStatus: 'idle',
  mutationError: null,
};

function ensureTrailingDraft(rows = []) {
  return rows.some((row) => row.isDraft) ? rows : [...rows, createProductCategoryDraftRow()];
}

function buildRowsByTabWithDrafts(savedRowsByTab = {}) {
  const rowsByTab = {};

  Object.entries(savedRowsByTab).forEach(([tabId, savedRows]) => {
    // Only the top-level category group tab keeps an inline draft row for new groups.
    rowsByTab[tabId] =
      tabId === PRODUCT_CATEGORY_DEFAULT_TAB ? ensureTrailingDraft([...savedRows]) : [...savedRows];
  });

  return rowsByTab;
}

export const loadProductCategories = createAsyncThunk(
  'productCategories/load',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchProductCategories();
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to load product categories.'));
    }
  },
);

export const removeProductCategoryRow = createAsyncThunk(
  'productCategories/removeRow',
  async ({ tabId, rowId }, { getState, rejectWithValue }) => {
    try {
      const currentRows = getState().productCategories.rowsByTab[tabId] ?? [];
      const targetRow = currentRows.find((row) => row.id === rowId);

      if (targetRow?.isDraft) {
        const nextRows = currentRows.filter((row) => row.id !== rowId);
        return {
          tabId,
          rows:
            nextRows.length > 0 ? ensureTrailingDraft(nextRows) : [createProductCategoryDraftRow()],
        };
      }

      const persistedRows = await deleteProductCategory(tabId, rowId);
      const draftRows = currentRows.filter((row) => row.isDraft);

      return {
        tabId,
        rows: ensureTrailingDraft([...persistedRows, ...draftRows]),
      };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to delete product category.'));
    }
  },
);

export const saveProductCategoryRow = createAsyncThunk(
  'productCategories/saveRow',
  async ({ tabId, row }, { rejectWithValue }) => {
    try {
      const isExisting = row?.id && !row.isDraft && !String(row.id).startsWith('draft-');

      const savedRow = isExisting
        ? await updateProductCategory(tabId, row.id, row)
        : await createProductCategory(tabId, row);

      if (savedRow?.rowsByTab) {
        return {
          tabId,
          row: savedRow.row ?? row,
          rowsByTab: savedRow.rowsByTab,
          isExisting,
          renamed: Boolean(savedRow.renamed),
        };
      }

      return { tabId, row: savedRow, isExisting, renamed: Boolean(savedRow.renamed) };
    } catch (error) {
      return rejectWithValue(
        error?.serialized || extractErrorMessage(error, 'Failed to save product category.'),
      );
    }
  },
);

const productCategoriesSlice = createSlice({
  name: 'productCategories',
  initialState,
  reducers: {
    setProductCategoryTabRows: (state, action) => {
      const { tabId, rows } = action.payload;
      state.rowsByTab[tabId] = rows;
    },
    patchProductCategoryRow: (state, action) => {
      const { tabId, rowId, patch } = action.payload;
      const rows = state.rowsByTab[tabId] ?? [];
      state.rowsByTab[tabId] = rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row));
    },
    addProductCategoryDraftRow: (state, action) => {
      const { tabId } = action.payload;
      const currentRows = state.rowsByTab[tabId] ?? [createProductCategoryDraftRow()];
      state.rowsByTab[tabId] = [...currentRows, createProductCategoryDraftRow()];
    },
    ensureProductCategoryTabInitialized: (state, action) => {
      const { tabId } = action.payload;
      if (state.rowsByTab[tabId]) return;
      state.rowsByTab[tabId] = [createProductCategoryDraftRow()];
    },
    clearProductCategoriesMutationError: (state) => {
      state.mutationError = null;
      state.mutationStatus = 'idle';
    },
    resetProductCategoriesState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProductCategories.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadProductCategories.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
        state.rowsByTab = buildRowsByTabWithDrafts(action.payload);
      })
      .addCase(loadProductCategories.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Failed to load product categories.';
      })
      .addCase(removeProductCategoryRow.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(removeProductCategoryRow.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.mutationError = null;
        const { tabId, rows } = action.payload;
        state.rowsByTab[tabId] = rows;
      })
      .addCase(removeProductCategoryRow.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload ?? 'Failed to delete category.';
      })
      .addCase(saveProductCategoryRow.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(saveProductCategoryRow.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.mutationError = null;

        if (action.payload?.rowsByTab) {
          state.rowsByTab = buildRowsByTabWithDrafts(action.payload.rowsByTab);
          return;
        }

        const { tabId, row } = action.payload;
        const sourceRowId = action.meta?.arg?.row?.id;
        const currentRows = state.rowsByTab[tabId] ?? [];

        const withoutSourceDraft = currentRows.filter(
          (item) => !(item.isDraft && item.id === sourceRowId),
        );
        const existingIndex = withoutSourceDraft.findIndex((item) => item.id === row.id);

        if (existingIndex >= 0) {
          withoutSourceDraft[existingIndex] = row;
          state.rowsByTab[tabId] = withoutSourceDraft;
          return;
        }

        state.rowsByTab[tabId] = [...withoutSourceDraft, row];
      })
      .addCase(saveProductCategoryRow.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload ?? 'Failed to save category.';
      });
  },
});

export const {
  setProductCategoryTabRows,
  patchProductCategoryRow,
  addProductCategoryDraftRow,
  ensureProductCategoryTabInitialized,
  clearProductCategoriesMutationError,
  resetProductCategoriesState,
} = productCategoriesSlice.actions;

/** @param {import('@reduxjs/toolkit').RootState} state */
export const selectProductCategoriesRowsByTab = (state) => state.productCategories?.rowsByTab ?? {};

/** @param {import('@reduxjs/toolkit').RootState} state */
export const selectProductCategoriesStatus = (state) => state.productCategories?.status ?? 'idle';

/** @param {import('@reduxjs/toolkit').RootState} state */
export const selectProductCategoriesError = (state) => state.productCategories?.error ?? null;

/** @param {import('@reduxjs/toolkit').RootState} state */
export const selectProductCategoriesMutationStatus = (state) =>
  state.productCategories?.mutationStatus ?? 'idle';

/** @param {import('@reduxjs/toolkit').RootState} state */
export const selectProductCategoriesMutationError = (state) =>
  state.productCategories?.mutationError ?? null;

/** @param {import('@reduxjs/toolkit').RootState} state */
export const selectProductCategoryTabRows = (tabId) => (state) => {
  const rows = state.productCategories?.rowsByTab?.[tabId];
  if (rows) return rows;
  return tabId === PRODUCT_CATEGORY_DEFAULT_TAB ? [] : [createProductCategoryDraftRow()];
};

export default productCategoriesSlice.reducer;
