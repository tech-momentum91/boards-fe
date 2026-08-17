import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import {
  DOCUMENT_CATEGORY_DOCTYPE,
  TASK_MASTER_DOCTYPE,
} from '@/pages/profile/project-master/project-master.constants';

const initialState = {
  tasks: {
    list: { data: null, isLoading: false, error: null },
    detail: { data: null, isLoading: false, error: null },
    create: { data: null, isLoading: false, error: null },
    update: { data: null, isLoading: false, error: null },
  },
  layouts: {
    list: { data: null, isLoading: false, error: null },
    detail: { data: null, isLoading: false, error: null },
    create: { data: null, isLoading: false, error: null },
    update: { data: null, isLoading: false, error: null },
  },
  documents: {
    list: { data: null, isLoading: false, error: null },
    detail: { data: null, isLoading: false, error: null },
    create: { data: null, isLoading: false, error: null },
    update: { data: null, isLoading: false, error: null },
  },
  documentCategories: {
    list: { data: null, isLoading: false, error: null },
    create: { isLoading: false, error: null },
    update: { isLoading: false, error: null },
  },
  orderCategories: {
    list: { data: null, isLoading: false, error: null },
    create: { isLoading: false, error: null },
    update: { isLoading: false, error: null },
  },
  selectionCategories: {
    list: { data: null, isLoading: false, error: null },
    detail: { data: null, isLoading: false, error: null },
    create: { isLoading: false, error: null },
    update: { isLoading: false, error: null },
  },
  delete: { isLoading: false, error: null },
};

export const fetchProjectTaskMasterList = createAsyncThunk(
  'projectMaster/fetchProjectTaskMasterList',
  async (
    { keyword = '', order_by = '', filters = [], page = 1, limit_page_length = 20 } = {},
    { rejectWithValue },
  ) => {
    try {
      const formData = new FormData();
      formData.append('task_type', 'Project Tasks');
      formData.append('page', String(page));
      formData.append('limit_page_length', String(limit_page_length));

      const trimmedKeyword = String(keyword ?? '').trim();
      if (trimmedKeyword) {
        formData.append('keyword', trimmedKeyword);
      }

      if (order_by) {
        formData.append('order_by', order_by);
      }

      if (Array.isArray(filters) && filters.length > 0) {
        formData.append('filters', JSON.stringify(filters));
      }

      const response = await apiClient.post(
        '/method/devx.devx_project.api.tasks.get_task_master_listview',
        formData,
      );

      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load project task masters',
      );
    }
  },
);

export const fetchProjectLayoutMasterList = createAsyncThunk(
  'projectMaster/fetchProjectLayoutMasterList',
  async (
    { keyword = '', order_by = '', filters = [], page = 1, limit_page_length = 20 } = {},
    { rejectWithValue },
  ) => {
    try {
      const formData = new FormData();
      formData.append('task_type', 'Layout Tasks');
      formData.append('page', String(page));
      formData.append('limit_page_length', String(limit_page_length));

      const trimmedKeyword = String(keyword ?? '').trim();
      if (trimmedKeyword) {
        formData.append('keyword', trimmedKeyword);
      }

      if (order_by) {
        formData.append('order_by', order_by);
      }

      if (Array.isArray(filters) && filters.length > 0) {
        formData.append('filters', JSON.stringify(filters));
      }

      const response = await apiClient.post(
        '/method/devx.devx_project.api.tasks.get_task_master_listview',
        formData,
      );

      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load project layout masters',
      );
    }
  },
);

export const fetchProjectTaskMasterDetail = createAsyncThunk(
  'projectMaster/fetchProjectTaskMasterDetail',
  async (taskId, { rejectWithValue }) => {
    const id = String(taskId ?? '').trim();
    if (!id) return rejectWithValue('Task ID is required');

    try {
      const response = await apiClient.get(
        `/resource/${encodeURIComponent('Task Master')}/${encodeURIComponent(id)}`,
      );
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load project task master details',
      );
    }
  },
);

export const fetchProjectLayoutMasterDetail = createAsyncThunk(
  'projectMaster/fetchProjectLayoutMasterDetail',
  async (layoutId, { rejectWithValue }) => {
    const id = String(layoutId ?? '').trim();
    if (!id) return rejectWithValue('Layout ID is required');

    try {
      const response = await apiClient.get(
        `/resource/${encodeURIComponent('Task Master')}/${encodeURIComponent(id)}`,
      );
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load project layout master details',
      );
    }
  },
);

export const createProjectTaskMaster = createAsyncThunk(
  'projectMaster/createProjectTaskMaster',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.task_master.create_task_master',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to create project task master',
      );
    }
  },
);

export const createProjectLayoutMaster = createAsyncThunk(
  'projectMaster/createProjectLayoutMaster',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.task_master.create_task_master',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to create project layout master',
      );
    }
  },
);

export const fetchProjectDocumentMasterList = createAsyncThunk(
  'projectMaster/fetchProjectDocumentMasterList',
  async (
    { keyword = '', order_by = '', filters = [], page = 1, limit_page_length = 20 } = {},
    { rejectWithValue },
  ) => {
    try {
      const formData = new FormData();
      formData.append('task_type', 'Document Tasks');
      formData.append('page', String(page));
      formData.append('limit_page_length', String(limit_page_length));

      const trimmedKeyword = String(keyword ?? '').trim();
      if (trimmedKeyword) {
        formData.append('keyword', trimmedKeyword);
      }

      if (order_by) {
        formData.append('order_by', order_by);
      }

      if (Array.isArray(filters) && filters.length > 0) {
        formData.append('filters', JSON.stringify(filters));
      }

      const response = await apiClient.post(
        '/method/devx.devx_project.api.tasks.get_task_master_listview',
        formData,
      );

      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load project document masters',
      );
    }
  },
);

export const fetchProjectDocumentMasterDetail = createAsyncThunk(
  'projectMaster/fetchProjectDocumentMasterDetail',
  async (documentId, { rejectWithValue }) => {
    const id = String(documentId ?? '').trim();
    if (!id) return rejectWithValue('Document ID is required');

    try {
      const response = await apiClient.get(
        `/resource/${encodeURIComponent('Task Master')}/${encodeURIComponent(id)}`,
      );
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load project document master details',
      );
    }
  },
);

export const createProjectDocumentMaster = createAsyncThunk(
  'projectMaster/createProjectDocumentMaster',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.task_master.create_task_master',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to create project document master',
      );
    }
  },
);

export const updateProjectDocumentMasterField = createAsyncThunk(
  'projectMaster/updateProjectDocumentMasterField',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(
        '/method/devx.api.task_master.update_task_master',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to update project document master',
      );
    }
  },
);

export const fetchProjectDocumentCategoryList = createAsyncThunk(
  'projectMaster/fetchProjectDocumentCategoryList',
  async ({ keyword = '', page = 1, limit_page_length = 20 } = {}, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('doctype', DOCUMENT_CATEGORY_DOCTYPE);
      formData.append('page', String(page));
      formData.append('limit_page_length', String(limit_page_length));

      const trimmedKeyword = String(keyword ?? '').trim();
      if (trimmedKeyword) {
        formData.append('keyword', trimmedKeyword);
      }

      const response = await apiClient.post(
        '/method/devx.api.listview.list_with_search_filters',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load document categories',
      );
    }
  },
);

export const createProjectDocumentCategory = createAsyncThunk(
  'projectMaster/createProjectDocumentCategory',
  async ({ category, description = '' }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/resource/${DOCUMENT_CATEGORY_DOCTYPE}`, {
        category,
        description,
      });
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to create document category',
      );
    }
  },
);

export const updateProjectDocumentCategory = createAsyncThunk(
  'projectMaster/updateProjectDocumentCategory',
  async ({ name, category, description = '' }, { rejectWithValue }) => {
    const id = String(name ?? '').trim();
    if (!id) return rejectWithValue('Category ID is required');

    try {
      const response = await apiClient.put(
        `/resource/${encodeURIComponent(DOCUMENT_CATEGORY_DOCTYPE)}/${encodeURIComponent(id)}`,
        {
          category,
          description,
        },
      );
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to update document category',
      );
    }
  },
);

export const deleteProjectTaskMaster = createAsyncThunk(
  'projectMaster/deleteProjectTaskMaster',
  async (taskId, { rejectWithValue }) => {
    const id = String(taskId ?? '').trim();
    if (!id) return rejectWithValue('Task ID is required');

    try {
      const response = await apiClient.delete(
        `/resource/${encodeURIComponent(TASK_MASTER_DOCTYPE)}/${encodeURIComponent(id)}`,
      );
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to delete task master',
      );
    }
  },
);

export const deleteProjectDocumentCategory = createAsyncThunk(
  'projectMaster/deleteProjectDocumentCategory',
  async (categoryId, { rejectWithValue }) => {
    const id = String(categoryId ?? '').trim();
    if (!id) return rejectWithValue('Category ID is required');

    try {
      const response = await apiClient.delete(
        `/resource/${encodeURIComponent(DOCUMENT_CATEGORY_DOCTYPE)}/${encodeURIComponent(id)}`,
      );
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to delete document category',
      );
    }
  },
);

export const fetchOrderCategoryList = createAsyncThunk(
  'projectMaster/fetchOrderCategoryList',
  async ({ keyword = '', limit_page_length = 50, silent = false } = {}, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      if (keyword) formData.append('keyword', keyword);
      formData.append('limit_page_length', String(limit_page_length));
      const response = await apiClient.post(
        '/method/devx.api.vendor_selection.get_order_category_list',
        formData,
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load order categories',
      );
    }
  },
);

export const createOrderCategory = createAsyncThunk(
  'projectMaster/createOrderCategory',
  async ({ order_category, description = '' }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('order_category', order_category);
      if (description) formData.append('description', description);
      const response = await apiClient.post(
        '/method/devx.api.vendor_selection.create_order_category',
        formData,
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to create order category',
      );
    }
  },
);

export const updateOrderCategory = createAsyncThunk(
  'projectMaster/updateOrderCategory',
  async ({ name, order_category, description }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('name', name);
      if (order_category !== undefined) formData.append('order_category', order_category);
      if (description !== undefined) formData.append('description', description);
      const response = await apiClient.post(
        '/method/devx.api.vendor_selection.update_order_category',
        formData,
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to update order category',
      );
    }
  },
);

export const deleteOrderCategory = createAsyncThunk(
  'projectMaster/deleteOrderCategory',
  async (name, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('name', name);
      const response = await apiClient.post(
        '/method/devx.api.vendor_selection.delete_order_category',
        formData,
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to delete order category',
      );
    }
  },
);

export const fetchSelectionCategoryList = createAsyncThunk(
  'projectMaster/fetchSelectionCategoryList',
  async ({ keyword = '', limit_page_length = 50, silent = false } = {}, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      if (keyword) formData.append('keyword', keyword);
      formData.append('limit_page_length', String(limit_page_length));
      const response = await apiClient.post(
        '/method/devx.api.vendor_selection.get_selection_category_list',
        formData,
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load selection categories',
      );
    }
  },
);

export const createSelectionCategory = createAsyncThunk(
  'projectMaster/createSelectionCategory',
  async (payload, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
        }
      });
      const response = await apiClient.post(
        '/method/devx.api.vendor_selection.create_selection_category',
        formData,
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to create selection category',
      );
    }
  },
);

export const updateSelectionCategory = createAsyncThunk(
  'projectMaster/updateSelectionCategory',
  async (payload, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
        }
      });
      const response = await apiClient.post(
        '/method/devx.api.vendor_selection.update_selection_category',
        formData,
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to update selection category',
      );
    }
  },
);

export const deleteSelectionCategory = createAsyncThunk(
  'projectMaster/deleteSelectionCategory',
  async (name, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('name', name);
      const response = await apiClient.post(
        '/method/devx.api.vendor_selection.delete_selection_category',
        formData,
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to delete selection category',
      );
    }
  },
);

export const fetchSelectionCategoryDetail = createAsyncThunk(
  'projectMaster/fetchSelectionCategoryDetail',
  async (name, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('name', name);
      const response = await apiClient.post(
        '/method/devx.api.vendor_selection.get_selection_category',
        formData,
      );
      return response.data?.message?.data ?? response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load selection category',
      );
    }
  },
);

export const fetchProductCategoryOptions = createAsyncThunk(
  'projectMaster/fetchProductCategoryOptions',
  async ({ keyword = '' } = {}, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      if (keyword) formData.append('keyword', keyword);
      const response = await apiClient.post(
        '/method/devx.api.vendor_selection.get_product_category_options',
        formData,
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load product categories',
      );
    }
  },
);

export const fetchItemsForProductCategory = createAsyncThunk(
  'projectMaster/fetchItemsForProductCategory',
  async (
    { product_category = '', keyword = '', limit_page_length = 200 } = {},
    { rejectWithValue },
  ) => {
    try {
      const formData = new FormData();
      if (product_category) formData.append('product_category', product_category);
      if (keyword) formData.append('keyword', keyword);
      formData.append('limit_page_length', String(limit_page_length));
      const response = await apiClient.post(
        '/method/devx.api.vendor_selection.get_items_for_product_category',
        formData,
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to load items',
      );
    }
  },
);

export const updateProjectTaskMasterField = createAsyncThunk(
  'projectMaster/updateProjectTaskMasterField',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(
        '/method/devx.api.task_master.update_task_master',
        formData,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to update project task master',
      );
    }
  },
);

export const updateProjectLayoutMasterField = createAsyncThunk(
  'projectMaster/updateProjectLayoutMasterField',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(
        '/method/devx.api.task_master.update_task_master',
        formData,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to update project layout master',
      );
    }
  },
);

const projectMasterSlice = createSlice({
  name: 'projectMaster',
  initialState,
  reducers: {
    clearProjectTaskMasterDetail(state) {
      state.tasks.detail.data = null;
      state.tasks.detail.isLoading = false;
      state.tasks.detail.error = null;
    },
    clearProjectLayoutMasterDetail(state) {
      state.layouts.detail.data = null;
      state.layouts.detail.isLoading = false;
      state.layouts.detail.error = null;
    },
    clearProjectDocumentMasterDetail(state) {
      state.documents.detail.data = null;
      state.documents.detail.isLoading = false;
      state.documents.detail.error = null;
    },
    patchSelectionCategoryListItem(state, action) {
      const results = state.selectionCategories.list.data?.results;
      if (!Array.isArray(results)) return;

      const idx = results.findIndex((row) => row.name === action.payload?.name);
      if (idx < 0) return;

      results[idx] = { ...results[idx], ...action.payload };
    },
    patchOrderCategoryListItem(state, action) {
      const results = state.orderCategories.list.data?.results;
      if (!Array.isArray(results)) return;

      const idx = results.findIndex((row) => row.name === action.payload?.name);
      if (idx < 0) return;

      results[idx] = { ...results[idx], ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjectTaskMasterList.pending, (state) => {
        state.tasks.list.isLoading = true;
        state.tasks.list.error = null;
      })
      .addCase(fetchProjectTaskMasterList.fulfilled, (state, action) => {
        state.tasks.list.data = action.payload;
        state.tasks.list.isLoading = false;
      })
      .addCase(fetchProjectTaskMasterList.rejected, (state, action) => {
        state.tasks.list.data = null;
        state.tasks.list.isLoading = false;
        state.tasks.list.error = action.payload;
      })
      .addCase(fetchProjectTaskMasterDetail.pending, (state) => {
        state.tasks.detail.isLoading = true;
        state.tasks.detail.error = null;
      })
      .addCase(fetchProjectTaskMasterDetail.fulfilled, (state, action) => {
        state.tasks.detail.data = action.payload;
        state.tasks.detail.isLoading = false;
      })
      .addCase(fetchProjectTaskMasterDetail.rejected, (state, action) => {
        state.tasks.detail.data = null;
        state.tasks.detail.isLoading = false;
        state.tasks.detail.error = action.payload;
      })
      .addCase(createProjectTaskMaster.pending, (state) => {
        state.tasks.create.isLoading = true;
        state.tasks.create.error = null;
      })
      .addCase(createProjectTaskMaster.fulfilled, (state, action) => {
        state.tasks.create.data = action.payload;
        state.tasks.create.isLoading = false;
      })
      .addCase(createProjectTaskMaster.rejected, (state, action) => {
        state.tasks.create.isLoading = false;
        state.tasks.create.error = action.payload;
      })
      .addCase(fetchProjectLayoutMasterList.pending, (state) => {
        state.layouts.list.isLoading = true;
        state.layouts.list.error = null;
      })
      .addCase(fetchProjectLayoutMasterList.fulfilled, (state, action) => {
        state.layouts.list.data = action.payload;
        state.layouts.list.isLoading = false;
      })
      .addCase(fetchProjectLayoutMasterList.rejected, (state, action) => {
        state.layouts.list.data = null;
        state.layouts.list.isLoading = false;
        state.layouts.list.error = action.payload;
      })
      .addCase(fetchProjectLayoutMasterDetail.pending, (state) => {
        state.layouts.detail.isLoading = true;
        state.layouts.detail.error = null;
      })
      .addCase(fetchProjectLayoutMasterDetail.fulfilled, (state, action) => {
        state.layouts.detail.data = action.payload;
        state.layouts.detail.isLoading = false;
      })
      .addCase(fetchProjectLayoutMasterDetail.rejected, (state, action) => {
        state.layouts.detail.data = null;
        state.layouts.detail.isLoading = false;
        state.layouts.detail.error = action.payload;
      })
      .addCase(createProjectLayoutMaster.pending, (state) => {
        state.layouts.create.isLoading = true;
        state.layouts.create.error = null;
      })
      .addCase(createProjectLayoutMaster.fulfilled, (state, action) => {
        state.layouts.create.data = action.payload;
        state.layouts.create.isLoading = false;
      })
      .addCase(createProjectLayoutMaster.rejected, (state, action) => {
        state.layouts.create.isLoading = false;
        state.layouts.create.error = action.payload;
      })
      .addCase(updateProjectTaskMasterField.pending, (state) => {
        state.tasks.update.isLoading = true;
        state.tasks.update.error = null;
      })
      .addCase(updateProjectTaskMasterField.fulfilled, (state, action) => {
        state.tasks.update.data = action.payload;
        state.tasks.update.isLoading = false;
      })
      .addCase(updateProjectTaskMasterField.rejected, (state, action) => {
        state.tasks.update.isLoading = false;
        state.tasks.update.error = action.payload;
      })
      .addCase(updateProjectLayoutMasterField.pending, (state) => {
        state.layouts.update.isLoading = true;
        state.layouts.update.error = null;
      })
      .addCase(updateProjectLayoutMasterField.fulfilled, (state, action) => {
        state.layouts.update.data = action.payload;
        state.layouts.update.isLoading = false;
      })
      .addCase(updateProjectLayoutMasterField.rejected, (state, action) => {
        state.layouts.update.isLoading = false;
        state.layouts.update.error = action.payload;
      })
      .addCase(fetchProjectDocumentMasterList.pending, (state) => {
        state.documents.list.isLoading = true;
        state.documents.list.error = null;
      })
      .addCase(fetchProjectDocumentMasterList.fulfilled, (state, action) => {
        state.documents.list.data = action.payload;
        state.documents.list.isLoading = false;
      })
      .addCase(fetchProjectDocumentMasterList.rejected, (state, action) => {
        state.documents.list.data = null;
        state.documents.list.isLoading = false;
        state.documents.list.error = action.payload;
      })
      .addCase(fetchProjectDocumentMasterDetail.pending, (state) => {
        state.documents.detail.isLoading = true;
        state.documents.detail.error = null;
      })
      .addCase(fetchProjectDocumentMasterDetail.fulfilled, (state, action) => {
        state.documents.detail.data = action.payload;
        state.documents.detail.isLoading = false;
      })
      .addCase(fetchProjectDocumentMasterDetail.rejected, (state, action) => {
        state.documents.detail.data = null;
        state.documents.detail.isLoading = false;
        state.documents.detail.error = action.payload;
      })
      .addCase(createProjectDocumentMaster.pending, (state) => {
        state.documents.create.isLoading = true;
        state.documents.create.error = null;
      })
      .addCase(createProjectDocumentMaster.fulfilled, (state, action) => {
        state.documents.create.data = action.payload;
        state.documents.create.isLoading = false;
      })
      .addCase(createProjectDocumentMaster.rejected, (state, action) => {
        state.documents.create.isLoading = false;
        state.documents.create.error = action.payload;
      })
      .addCase(updateProjectDocumentMasterField.pending, (state) => {
        state.documents.update.isLoading = true;
        state.documents.update.error = null;
      })
      .addCase(updateProjectDocumentMasterField.fulfilled, (state, action) => {
        state.documents.update.data = action.payload;
        state.documents.update.isLoading = false;
      })
      .addCase(updateProjectDocumentMasterField.rejected, (state, action) => {
        state.documents.update.isLoading = false;
        state.documents.update.error = action.payload;
      })
      .addCase(fetchProjectDocumentCategoryList.pending, (state) => {
        state.documentCategories.list.isLoading = true;
        state.documentCategories.list.error = null;
      })
      .addCase(fetchProjectDocumentCategoryList.fulfilled, (state, action) => {
        state.documentCategories.list.data = action.payload;
        state.documentCategories.list.isLoading = false;
      })
      .addCase(fetchProjectDocumentCategoryList.rejected, (state, action) => {
        state.documentCategories.list.data = null;
        state.documentCategories.list.isLoading = false;
        state.documentCategories.list.error = action.payload;
      })
      .addCase(createProjectDocumentCategory.pending, (state) => {
        state.documentCategories.create.isLoading = true;
        state.documentCategories.create.error = null;
      })
      .addCase(createProjectDocumentCategory.fulfilled, (state) => {
        state.documentCategories.create.isLoading = false;
      })
      .addCase(createProjectDocumentCategory.rejected, (state, action) => {
        state.documentCategories.create.isLoading = false;
        state.documentCategories.create.error = action.payload;
      })
      .addCase(updateProjectDocumentCategory.pending, (state) => {
        state.documentCategories.update.isLoading = true;
        state.documentCategories.update.error = null;
      })
      .addCase(updateProjectDocumentCategory.fulfilled, (state) => {
        state.documentCategories.update.isLoading = false;
      })
      .addCase(updateProjectDocumentCategory.rejected, (state, action) => {
        state.documentCategories.update.isLoading = false;
        state.documentCategories.update.error = action.payload;
      })
      .addCase(deleteProjectTaskMaster.pending, (state) => {
        state.delete.isLoading = true;
        state.delete.error = null;
      })
      .addCase(deleteProjectTaskMaster.fulfilled, (state) => {
        state.delete.isLoading = false;
      })
      .addCase(deleteProjectTaskMaster.rejected, (state, action) => {
        state.delete.isLoading = false;
        state.delete.error = action.payload;
      })
      .addCase(deleteProjectDocumentCategory.pending, (state) => {
        state.delete.isLoading = true;
        state.delete.error = null;
      })
      .addCase(deleteProjectDocumentCategory.fulfilled, (state) => {
        state.delete.isLoading = false;
      })
      .addCase(deleteProjectDocumentCategory.rejected, (state, action) => {
        state.delete.isLoading = false;
        state.delete.error = action.payload;
      })
      .addCase(fetchOrderCategoryList.pending, (state, action) => {
        if (!action.meta.arg?.silent) {
          state.orderCategories.list.isLoading = true;
        }
        state.orderCategories.list.error = null;
      })
      .addCase(fetchOrderCategoryList.fulfilled, (state, action) => {
        state.orderCategories.list.data = action.payload;
        state.orderCategories.list.isLoading = false;
      })
      .addCase(fetchOrderCategoryList.rejected, (state, action) => {
        if (!action.meta.arg?.silent) {
          state.orderCategories.list.data = null;
        }
        state.orderCategories.list.isLoading = false;
        state.orderCategories.list.error = action.payload;
      })
      .addCase(createOrderCategory.pending, (state) => {
        state.orderCategories.create.isLoading = true;
        state.orderCategories.create.error = null;
      })
      .addCase(createOrderCategory.fulfilled, (state) => {
        state.orderCategories.create.isLoading = false;
      })
      .addCase(createOrderCategory.rejected, (state, action) => {
        state.orderCategories.create.isLoading = false;
        state.orderCategories.create.error = action.payload;
      })
      .addCase(updateOrderCategory.pending, (state) => {
        state.orderCategories.update.isLoading = true;
        state.orderCategories.update.error = null;
      })
      .addCase(updateOrderCategory.fulfilled, (state) => {
        state.orderCategories.update.isLoading = false;
      })
      .addCase(updateOrderCategory.rejected, (state, action) => {
        state.orderCategories.update.isLoading = false;
        state.orderCategories.update.error = action.payload;
      })
      .addCase(fetchSelectionCategoryList.pending, (state, action) => {
        if (!action.meta.arg?.silent) {
          state.selectionCategories.list.isLoading = true;
        }
        state.selectionCategories.list.error = null;
      })
      .addCase(fetchSelectionCategoryList.fulfilled, (state, action) => {
        state.selectionCategories.list.data = action.payload;
        state.selectionCategories.list.isLoading = false;
      })
      .addCase(fetchSelectionCategoryList.rejected, (state, action) => {
        if (!action.meta.arg?.silent) {
          state.selectionCategories.list.data = null;
        }
        state.selectionCategories.list.isLoading = false;
        state.selectionCategories.list.error = action.payload;
      })
      .addCase(createSelectionCategory.pending, (state) => {
        state.selectionCategories.create.isLoading = true;
        state.selectionCategories.create.error = null;
      })
      .addCase(createSelectionCategory.fulfilled, (state) => {
        state.selectionCategories.create.isLoading = false;
      })
      .addCase(createSelectionCategory.rejected, (state, action) => {
        state.selectionCategories.create.isLoading = false;
        state.selectionCategories.create.error = action.payload;
      })
      .addCase(updateSelectionCategory.pending, (state) => {
        state.selectionCategories.update.isLoading = true;
        state.selectionCategories.update.error = null;
      })
      .addCase(updateSelectionCategory.fulfilled, (state) => {
        state.selectionCategories.update.isLoading = false;
      })
      .addCase(updateSelectionCategory.rejected, (state, action) => {
        state.selectionCategories.update.isLoading = false;
        state.selectionCategories.update.error = action.payload;
      })
      .addCase(deleteOrderCategory.pending, (state) => {
        state.delete.isLoading = true;
        state.delete.error = null;
      })
      .addCase(deleteOrderCategory.fulfilled, (state) => {
        state.delete.isLoading = false;
      })
      .addCase(deleteOrderCategory.rejected, (state, action) => {
        state.delete.isLoading = false;
        state.delete.error = action.payload;
      })
      .addCase(deleteSelectionCategory.pending, (state) => {
        state.delete.isLoading = true;
        state.delete.error = null;
      })
      .addCase(deleteSelectionCategory.fulfilled, (state) => {
        state.delete.isLoading = false;
      })
      .addCase(deleteSelectionCategory.rejected, (state, action) => {
        state.delete.isLoading = false;
        state.delete.error = action.payload;
      })
      .addCase(fetchSelectionCategoryDetail.pending, (state) => {
        state.selectionCategories.detail.isLoading = true;
        state.selectionCategories.detail.error = null;
      })
      .addCase(fetchSelectionCategoryDetail.fulfilled, (state, action) => {
        state.selectionCategories.detail.data = action.payload;
        state.selectionCategories.detail.isLoading = false;
      })
      .addCase(fetchSelectionCategoryDetail.rejected, (state, action) => {
        state.selectionCategories.detail.data = null;
        state.selectionCategories.detail.isLoading = false;
        state.selectionCategories.detail.error = action.payload;
      });
  },
});

export const {
  clearProjectTaskMasterDetail,
  clearProjectLayoutMasterDetail,
  clearProjectDocumentMasterDetail,
  patchSelectionCategoryListItem,
  patchOrderCategoryListItem,
} = projectMasterSlice.actions;

export default projectMasterSlice.reducer;
