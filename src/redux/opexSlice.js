import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import { OPEX_DOCTYPE } from '@/components/opex/constants';
import { extractErrorMessage } from '@/utils/error-utils';
import { mapNormalizedVendorsToSelectOptions } from '@/utils/opex-vendor-utils';

const CLIENT_OPEX_CATEGORY_DOCTYPE = 'OPEX Category';

const resolveOpexListHasMore = ({ responseData, apiPage, apiPageSize, apiCount }) => {
  if (responseData.has_more != null) {
    return Boolean(responseData.has_more);
  }

  if (responseData.total_pages != null) {
    return apiPage < Number(responseData.total_pages);
  }

  if (responseData.total_count != null) {
    return apiPage * apiPageSize < Number(responseData.total_count);
  }

  return apiCount >= apiPageSize;
};

// Default filters for OPEX list
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const getDefaultExpenseYear = () => String(new Date().getFullYear());
const getDefaultExpenseMonth = () => MONTH_NAMES[new Date().getMonth()];

export const DEFAULT_OPEX_FILTERS = {
  search: '',
  center: [],
  tab: 'all',
  month: getDefaultExpenseMonth(),
  year: getDefaultExpenseYear(),
};

export const OPEX_TAB_VALUES = ['all', 'facility', 'zone_head', 'purchase', 'zoho'];

export const fetchOpexFilterOptions = createAsyncThunk(
  'opex/fetchOpexFilterOptions',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.post('/method/devx.opex.api.opex.get_opex_filter_options');
      return response?.data?.message || {};
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch OPEX filter options'),
      );
    }
  },
);

export const fetchOpexCenterOptions = createAsyncThunk(
  'opex/fetchOpexCenterOptions',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.post(
        '/method/devx.opex.api.opex.get_opex_sub_category_matrix',
        {
          keyword: '',
          center: [],
          page: 1,
          limit_page_length: 999,
        },
      );

      const rows = response?.data?.message?.rows || [];
      const uniqueCenters = new Map();

      rows.forEach((row) => {
        const value = row?.center;
        if (!value) return;
        if (!uniqueCenters.has(value)) {
          uniqueCenters.set(value, {
            value,
            label: row?.center_name || value,
          });
        }
      });

      return [...uniqueCenters.values()];
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch center options'),
      );
    }
  },
);

const SUPPLIER_DOCTYPE = 'Supplier';

/** Supplier list for OPEX toolbar filter only (list_with_search_filters). */
export const fetchOpexFilterSupplierOptions = createAsyncThunk(
  'opex/fetchOpexFilterSupplierOptions',
  async (_, thunkAPI) => {
    try {
      const payload = {
        doctype: SUPPLIER_DOCTYPE,
        keyword: '',
        filters: [['disabled', '=', 0]],
        limit_page_length: 999,
        page: 1,
        order_by: 'supplier_name asc',
      };

      const response = await apiClient.post(
        '/method/devx.api.listview.list_with_search_filters',
        payload,
      );

      const message = response?.data?.message ?? response?.data ?? {};
      const raw = Array.isArray(message.results)
        ? message.results
        : Array.isArray(message.data)
          ? message.data
          : Array.isArray(message)
            ? message
            : [];

      const options = raw
        .map((row) => ({
          value: row?.name != null ? String(row.name) : '',
          label: String(row?.supplier_name ?? row?.name ?? '').trim() || String(row?.name ?? ''),
        }))
        .filter((opt) => opt.value);

      return options;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load suppliers'),
      );
    }
  },
);

export const buildOpexFilters = (filters = {}) => {
  const listFilters = [];

  if (filters.center && Array.isArray(filters.center) && filters.center.length > 0) {
    listFilters.push(['center', 'in', filters.center]);
  } else if (filters.center && typeof filters.center === 'string' && filters.center.trim()) {
    listFilters.push(['center', '=', filters.center.trim()]);
  }

  const multiFilters = [
    'category',
    'subcategory',
    'vendor',
    'bill_uploaded',
    'zone_head_check',
    'purchase_check',
    'zoho_uploaded',
  ];
  multiFilters.forEach((key) => {
    const values = filters[key];
    if (Array.isArray(values) && values.length > 0) {
      listFilters.push([key, 'in', values]);
    }
  });

  // Expense Month/Year -> period_month & period_year (toolbar; year-only when month is All)
  const rawMonth = (filters.month || '').trim();
  const hasMonthFilter = Boolean(rawMonth);
  const hasYearFilter = Boolean(filters.year);

  let periodYear;
  let periodMonthNumber;

  if (hasMonthFilter || hasYearFilter) {
    const defaultYear = getDefaultExpenseYear();
    const parsedYear = Number.parseInt(String(filters.year || defaultYear), 10);
    periodYear = Number.isNaN(parsedYear) ? Number(defaultYear) : parsedYear;

    if (hasMonthFilter && rawMonth !== 'All') {
      const monthIndex = MONTH_NAMES.indexOf(rawMonth);
      if (monthIndex >= 0) {
        periodMonthNumber = monthIndex + 1;
      }
    }
  }

  if (periodYear && !Number.isNaN(periodYear)) {
    listFilters.push(['period_year', '=', periodYear]);
    if (periodMonthNumber && periodMonthNumber >= 1 && periodMonthNumber <= 12) {
      listFilters.push(['period_month', '=', periodMonthNumber]);
    }
  }

  // Trigger Month/Year -> triggered_month & triggered_year (INSIDE filter popover; optional)
  const rawTriggeredMonth = (filters.triggered_month || '').trim();
  const hasTriggeredMonthFilter = Boolean(rawTriggeredMonth);
  const hasTriggeredYearFilter = Boolean(filters.triggered_year);

  let triggeredYear;
  let triggeredMonthNumber;

  if (hasTriggeredMonthFilter || hasTriggeredYearFilter) {
    const parsedTriggeredYear = hasTriggeredYearFilter
      ? Number.parseInt(filters.triggered_year, 10)
      : undefined;
    if (hasTriggeredYearFilter && !Number.isNaN(parsedTriggeredYear)) {
      triggeredYear = parsedTriggeredYear;
    }

    if (hasTriggeredMonthFilter && rawTriggeredMonth !== 'All') {
      const monthIndex = MONTH_NAMES.indexOf(rawTriggeredMonth);
      if (monthIndex >= 0) {
        triggeredMonthNumber = monthIndex + 1;
      }
    }
  }

  if (triggeredYear && !Number.isNaN(triggeredYear)) {
    listFilters.push(['triggered_year', '=', triggeredYear]);
    if (triggeredMonthNumber && triggeredMonthNumber >= 1 && triggeredMonthNumber <= 12) {
      listFilters.push(['triggered_month', '=', triggeredMonthNumber]);
    }
  }

  return listFilters;
};

// -----------------------------
// Async thunks (API-integrated)
// -----------------------------

export const fetchOpexList = createAsyncThunk(
  'opex/fetchOpexList',
  async (params = {}, thunkAPI) => {
    const {
      filters = DEFAULT_OPEX_FILTERS,
      page = 1,
      pageSize = 20,
      orderBy = 'creation desc',
      append = false,
      replacePage = null,
      groupBy = '',
      groupOrder = '',
    } = params;

    try {
      const listFilters = buildOpexFilters(filters);
      const keyword = (filters.search || '').trim();

      const response = await apiClient.post('/method/devx.opex.api.opex.get_opex_list', {
        keyword: keyword || undefined,
        filters: listFilters.length > 0 ? listFilters : undefined,
        status_tab: filters.tab || 'all',
        order_by: orderBy || 'creation desc',
        page,
        limit_page_length: pageSize,
        group_by: groupBy || undefined,
        group_order: groupOrder || undefined,
      });

      const responseData = response?.data?.message || response?.data || {};
      const rawRows = responseData.results || responseData.data || [];
      const columns = responseData.columns || [];
      const apiCount = rawRows.length;
      const totalCountRaw = responseData.total_count ?? responseData.count;
      const apiPage = responseData.page ?? page;
      const apiPageSize = responseData.page_size ?? pageSize;
      const hasMore = resolveOpexListHasMore({
        responseData,
        apiPage,
        apiPageSize,
        apiCount,
      });
      const totalCount = totalCountRaw ?? apiCount;

      return {
        rows: rawRows || [],
        columns: Array.isArray(columns) ? columns : [],
        page: apiPage,
        pageSize: apiPageSize,
        filters,
        totalCount,
        hasMore,
        orderBy,
        append,
        replacePage: replacePage ?? null,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch OPEX list'),
      );
    }
  },
);

export const fetchVendorsForOpex = createAsyncThunk(
  'opex/fetchVendorsForOpex',
  async ({ center, category }, thunkAPI) => {
    const c = center != null && String(center).trim() !== '' ? String(center).trim() : '';
    const cat = category != null && String(category).trim() !== '' ? String(category).trim() : '';
    if (!c || !cat) {
      return thunkAPI.rejectWithValue('Center and category are required to load vendors.');
    }
    try {
      const response = await apiClient.post('/method/devx.opex.api.opex.get_vendors_for_opex', {
        center: c,
        category: cat,
      });
      const message = response?.data?.message ?? response?.data ?? {};
      const raw =
        message.results ??
        message.data ??
        message.vendors ??
        (Array.isArray(message) ? message : []);
      const rows = Array.isArray(raw) ? raw : [];
      return mapNormalizedVendorsToSelectOptions(rows);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load vendors'),
      );
    }
  },
);

export const fetchOpexStats = createAsyncThunk(
  'opex/fetchOpexStats',
  async (params = {}, thunkAPI) => {
    const { filters = DEFAULT_OPEX_FILTERS } = params;

    try {
      const listFilters = buildOpexFilters(filters);
      const response = await apiClient.post('/method/devx.opex.api.opex.get_opex_stats', {
        filters: listFilters.length > 0 ? listFilters : undefined,
      });

      return {
        filters,
        ...response?.data?.message,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch OPEX stats'),
      );
    }
  },
);

export const fetchOpexDetail = createAsyncThunk(
  'opex/fetchOpexDetail',
  async (opexId, thunkAPI) => {
    if (!opexId) {
      return thunkAPI.rejectWithValue('OPEX ID is required');
    }
    try {
      const name = String(opexId);
      const response = await apiClient.get(
        '/method/devx.opex.api.opex.get_opex_detail_with_assignees',
        {
          params: { name },
        },
      );
      const document_ = response?.data?.message ?? response?.data?.data ?? response?.data;
      if (!document_) {
        return thunkAPI.rejectWithValue('OPEX not found');
      }
      return document_;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch OPEX detail'),
      );
    }
  },
);

export const fetchOpexComments = createAsyncThunk(
  'opex/fetchOpexComments',
  async (opexId, thunkAPI) => {
    if (!opexId) {
      return thunkAPI.rejectWithValue('OPEX ID is required');
    }
    try {
      const response = await apiClient.post('/method/devx.opex.api.opex.get_opex_activities', {
        opex: String(opexId),
      });
      const activities = response?.data?.message || {};
      return {
        comments: activities.comments || [],
        history: activities.history || [],
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch OPEX comments'),
      );
    }
  },
);

export const addOpexComment = createAsyncThunk(
  'opex/addOpexComment',
  async (
    {
      opexId,
      content,
      attachments = [],
      visibleToClient: _visibleToClient = false,
      parentCommentId = null,
    },
    thunkAPI,
  ) => {
    const hasContent = content && String(content).trim();
    const hasAttachments = attachments && attachments.length > 0;
    if (!opexId || (!hasContent && !hasAttachments)) {
      return thunkAPI.rejectWithValue('OPEX ID and either content or attachments are required');
    }
    try {
      const formData = new FormData();
      formData.append('opex', String(opexId));
      formData.append('content', hasContent ? String(content).trim() : '');
      if (parentCommentId != null && String(parentCommentId).trim() !== '') {
        formData.append('parent_comment', String(parentCommentId).trim());
      }
      if (hasAttachments) {
        attachments.forEach((att) => {
          if (att?.file && att.file instanceof File) {
            formData.append('files[]', att.file);
          }
        });
      }
      const response = await apiClient.post(
        '/method/devx.opex.api.opex.add_opex_comment_with_files',
        formData,
      );
      const newComment = response?.data?.message;
      await thunkAPI.dispatch(fetchOpexComments(opexId)).unwrap();
      return { opexId, comment: newComment };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to add comment'),
      );
    }
  },
);

export const updateOpexField = createAsyncThunk(
  'opex/updateOpexField',
  async ({ name: opexId, fieldname, value }, thunkAPI) => {
    if (!opexId || !fieldname) {
      return thunkAPI.rejectWithValue('OPEX name and field are required');
    }
    try {
      await apiClient.post('/method/frappe.client.set_value', {
        doctype: OPEX_DOCTYPE,
        name: String(opexId),
        fieldname,
        value,
      });
      await thunkAPI.dispatch(fetchOpexDetail(opexId)).unwrap();
      await thunkAPI.dispatch(fetchOpexComments(opexId));
      return { opexId, fieldname, value };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to update OPEX field'),
      );
    }
  },
);

export const deleteOpexAttachment = createAsyncThunk(
  'opex/deleteOpexAttachment',
  async (fileUrl, thunkAPI) => {
    if (!fileUrl || typeof fileUrl !== 'string') {
      return thunkAPI.rejectWithValue('File URL is required');
    }
    try {
      const response = await apiClient.post('/method/devx.api.core.delete_file_by_url', {
        file_url: fileUrl.trim(),
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to remove attachment'),
      );
    }
  },
);

export const fetchOpexCategoriesTree = createAsyncThunk(
  'opex/fetchOpexCategoriesTree',
  async (center, thunkAPI) => {
    if (!center) {
      return thunkAPI.rejectWithValue('Center is required');
    }
    try {
      const response = await apiClient.post(
        '/method/devx.opex.api.opex.get_center_opex_categories',
        {
          center: String(center),
        },
      );
      const data = response?.data?.message || {};
      return { categories: data.categories ?? [] };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch categories'),
      );
    }
  },
);

export const setOpexCategoryForCenter = createAsyncThunk(
  'opex/setOpexCategoryForCenter',
  async ({ categoryNames, center, enabled }, thunkAPI) => {
    const namesArray = Array.isArray(categoryNames) ? categoryNames : [categoryNames];
    if (namesArray.length === 0 || !center) {
      return thunkAPI.rejectWithValue('categoryNames and center are required');
    }
    try {
      await apiClient.post('/method/devx.opex.api.opex.toggle_center_opex_categories', {
        category_names: namesArray,
        center: String(center),
        enabled: Boolean(enabled),
      });
      return { categoryNames: namesArray, center, enabled };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to update category'),
      );
    }
  },
);

// Column list pref (same API as task tables)
export const saveOpexListPref = createAsyncThunk(
  'opex/saveOpexListPref',
  async ({ react_table_id, columns }, thunkAPI) => {
    try {
      // console.log('Saving OPEX list preference', react_table_id, columns);
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: OPEX_DOCTYPE,
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

export const fetchOpexListPref = createAsyncThunk(
  'opex/fetchOpexListPref',
  async ({ react_table_id }, thunkAPI) => {
    try {
      // console.log('Fetching OPEX list preference', react_table_id);
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: {
          doctype: OPEX_DOCTYPE,
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

// ─── Client OPEX Category Thunks ─────────────────────

export const fetchClientOpexCategories = createAsyncThunk(
  'opex/fetchClientOpexCategories',
  async (
    { keyword = '', filters = {}, page = 1, pageSize = 20, append = false } = {},
    thunkAPI,
  ) => {
    try {
      const formData = new FormData();
      formData.append('doctype', CLIENT_OPEX_CATEGORY_DOCTYPE);

      // Build filters array - always include is_group = 0 (subcategories)
      const filtersArray = [['is_group', '=', 0]];

      // Add category filter
      if (filters.category && Array.isArray(filters.category) && filters.category.length > 0) {
        if (filters.category.length === 1) {
          filtersArray.push(['parent_opex_category', '=', filters.category[0]]);
        } else {
          filtersArray.push(['parent_opex_category', 'in', filters.category]);
        }
      }

      // Add status filter
      if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
        if (filters.status.length === 1) {
          filtersArray.push(['status', '=', filters.status[0]]);
        } else {
          filtersArray.push(['status', 'in', filters.status]);
        }
      }

      formData.append('filters', JSON.stringify(filtersArray));
      formData.append('limit_page_length', String(pageSize));
      formData.append('page', String(page));
      formData.append('order_by', 'creation desc');

      if (keyword.trim()) {
        formData.append('keyword', keyword.trim());
      }

      const response = await apiClient.post(
        '/method/devx.api.listview.list_with_search_filters',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      const responseData = response?.data?.message || response?.data || {};
      const results = responseData.results || responseData.data || responseData || [];
      const totalCount = responseData.total_count ?? responseData.count ?? results.length;

      // Extract pagination info
      const apiPage = responseData.page ?? page;
      const apiPageSize = responseData.page_size ?? pageSize;
      const apiCount = responseData.count ?? results.length;
      const itemsLoadedSoFar = (apiPage - 1) * apiPageSize + apiCount;

      const currentCount = append
        ? (responseData.current_count ?? itemsLoadedSoFar)
        : itemsLoadedSoFar;

      // Calculate hasMore
      const hasMoreFromAPI = responseData.has_more;
      let hasMore;
      if (hasMoreFromAPI !== undefined) {
        hasMore = hasMoreFromAPI;
      } else if (totalCount !== undefined && totalCount > 0) {
        hasMore = apiCount === apiPageSize && itemsLoadedSoFar < totalCount;
      } else {
        hasMore = apiCount === apiPageSize;
      }

      return {
        results: Array.isArray(results) ? results : [],
        page,
        pageSize,
        append,
        hasMore,
        totalCount,
        current_count: currentCount,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch OPEX categories'),
      );
    }
  },
);

export const fetchClientOpexCategoryFilters = createAsyncThunk(
  'opex/fetchClientOpexCategoryFilters',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.list_with_search_filters', {
        params: {
          doctype: CLIENT_OPEX_CATEGORY_DOCTYPE,
          filters: JSON.stringify([['is_group', '=', 1]]),
          limit_page_length: 999,
        },
      });
      const results = response?.data?.message?.results;
      return Array.isArray(results) ? results : [];
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch OPEX category filters'),
      );
    }
  },
);

export const fetchClientOpexSubCategoryMatrix = createAsyncThunk(
  'opex/fetchClientOpexSubCategoryMatrix',
  async ({ keyword = '', center = [], page = 1, pageSize = 20, append = false } = {}, thunkAPI) => {
    try {
      const response = await apiClient.post(
        '/method/devx.opex.api.opex.get_opex_sub_category_matrix',
        {
          keyword: keyword?.trim() || '',
          center: Array.isArray(center) ? center : [],
          page,
          limit_page_length: pageSize,
        },
      );

      const data = response?.data?.message || {};
      const rows = data.rows || [];

      // prioritize sub_categories from response, fallback to categories, then derive from rows
      let subCategories = Array.isArray(data.sub_categories) ? data.sub_categories : [];

      if (subCategories.length === 0 && rows.length > 0 && rows[0]?.sub_categories) {
        subCategories = Object.keys(rows[0].sub_categories || {});
      }

      const totalCount = data.total_count ?? rows.length;
      const totalPages = data.total_pages ?? Math.max(1, Math.ceil(totalCount / pageSize));

      return {
        message: {
          rows,
          subcategories: subCategories,
          page,
          page_size: pageSize,
          total_count: totalCount,
          total_pages: totalPages,
        },
        append,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch OPEX sub category matrix'),
      );
    }
  },
);

// ─── Client OPEX Column Management Thunks ────────────

export const fetchClientOpexColumnList = createAsyncThunk(
  'opex/fetchClientOpexColumnList',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.get_list_pref', {
        doctype: CLIENT_OPEX_CATEGORY_DOCTYPE,
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch OPEX column list'),
      );
    }
  },
);

export const saveClientOpexColumnList = createAsyncThunk(
  'opex/saveClientOpexColumnList',
  async (columns, thunkAPI) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: CLIENT_OPEX_CATEGORY_DOCTYPE,
        columns,
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to save OPEX column list'),
      );
    }
  },
);

export const createClientOpexCategory = createAsyncThunk(
  'opex/createClientOpexCategory',
  async (
    { category, Name, status, type, apply_to_all_centers, centers, expense_month_basis },
    thunkAPI,
  ) => {
    try {
      const payload = {
        parent_opex_category: category,
        category: Name,
        status,
        type,
        apply_to_all_centers,
        expense_month_basis,
      };

      if (centers && Array.isArray(centers) && centers.length > 0) {
        payload.centers = centers;
      }
      const response = await apiClient.post(`/resource/${CLIENT_OPEX_CATEGORY_DOCTYPE}`, payload);
      thunkAPI.dispatch(fetchClientOpexCategoryFilters());
      return response?.data?.data || response?.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to create OPEX category'),
      );
    }
  },
);

export const createClientOpexParentCategory = createAsyncThunk(
  'opex/createClientOpexParentCategory',
  async ({ category }, thunkAPI) => {
    try {
      const response = await apiClient.post(`/resource/${CLIENT_OPEX_CATEGORY_DOCTYPE}`, {
        category,
        is_group: 1,
      });
      // Re-fetch the filter (parent category) list to stay in sync
      thunkAPI.dispatch(fetchClientOpexCategoryFilters());
      return response?.data?.data || response?.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to create parent OPEX category'),
      );
    }
  },
);

export const updateClientOpexCategory = createAsyncThunk(
  'opex/updateClientOpexCategory',
  async (
    {
      name,
      parent_opex_category,
      category,
      subcategory,
      status,
      type,
      apply_to_all_centers,
      centers,
      expense_month_basis,
    },
    thunkAPI,
  ) => {
    if (subcategory && name !== subcategory) {
      try {
        const response = await apiClient.put('/method/frappe.client.rename_doc', {
          doctype: CLIENT_OPEX_CATEGORY_DOCTYPE,
          old_name: name,
          new_name: subcategory,
          merge: false,
        });
        if (response?.data?.message) {
          name = subcategory;
        }
      } catch (error) {
        return thunkAPI.rejectWithValue(
          error.serialized || extractErrorMessage(error, 'Failed to rename OPEX category'),
        );
      }
    }
    if (!name) {
      return thunkAPI.rejectWithValue('Category name is required');
    }
    try {
      const payload = { status, type, expense_month_basis };

      if (parent_opex_category && category !== parent_opex_category) {
        payload.parent_opex_category = category;
      }

      if (apply_to_all_centers !== undefined) {
        payload.apply_to_all_centers = apply_to_all_centers;
      }

      if (centers) {
        payload.centers = centers;
      }
      const response = await apiClient.put(
        `/resource/${CLIENT_OPEX_CATEGORY_DOCTYPE}/${name}`,
        payload,
      );
      return response?.data?.data || response?.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to update OPEX category'),
      );
    }
  },
);

export const fetchClientOpexCategoryDetail = createAsyncThunk(
  'opex/fetchClientOpexCategoryDetail',
  async (name, thunkAPI) => {
    if (!name) {
      return thunkAPI.rejectWithValue('Category name is required');
    }
    try {
      const response = await apiClient.get(`/resource/${CLIENT_OPEX_CATEGORY_DOCTYPE}/${name}`);
      return response?.data?.data || response?.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch OPEX category detail'),
      );
    }
  },
);

// -----------------------------
// Initial state
// -----------------------------

const initialAsyncSection = {
  data: null,
  status: 'idle',
  error: null,
};

const initialState = {
  list: {
    rows: [],
    columns: [],
    status: 'idle',
    error: null,
    filters: { ...DEFAULT_OPEX_FILTERS },
    page: 1,
    pageSize: 20,
    totalCount: 0,
    sorting: [],
    hasMore: true,
    isLoadingMore: false,
    groupBy: '',
    groupOrder: '',
  },
  detail: {
    data: null,
    status: 'idle',
    error: null,
  },
  comments: {
    data: null,
    status: 'idle',
    error: null,
  },
  stats: {
    ...initialAsyncSection,
  },
  mutations: {
    createStatus: 'idle',
    updateStatus: 'idle',
    commentStatus: 'idle',
    exportStatus: 'idle',
    error: null,
  },
  filterOptions: {
    categories: [],
    subcategories: [],
    status: 'idle',
    error: null,
  },
  centerOptions: {
    rows: [],
    status: 'idle',
    error: null,
  },
  filterSupplierList: {
    options: [],
    status: 'idle',
    error: null,
  },
  categoryTree: {
    data: { categories: [] },
    status: 'idle',
    error: null,
  },

  // Client OPEX Category management
  clientCategories: {
    rows: [],
    filterOptions: [],
    columns: [],
    status: 'idle',
    filterStatus: 'idle',
    createStatus: 'idle',
    updateStatus: 'idle',
    createParentStatus: 'idle',
    isSavingColumns: false,
    isLoadingMore: false,
    page: 1,
    pageSize: 20,
    hasMore: false,
    totalCount: 0,
    error: null,
  },
  clientOpexMatrix: {
    rows: [],
    subcategories: [],
    status: 'idle',
    error: null,
    page: 1,
    pageSize: 20,
    totalCount: 0,
    hasMore: true,
    isLoadingMore: false,
  },
};

// -----------------------------
// Slice
// -----------------------------

const opexSlice = createSlice({
  name: 'opex',
  initialState,
  reducers: {
    setOpexFilters(state, action) {
      state.list.filters = {
        ...state.list.filters,
        ...action.payload,
      };
      state.list.page = 1;
      state.list.rows = [];
      state.list.hasMore = true;
      state.list.isLoadingMore = false;
    },
    resetOpexFilters(state) {
      const preservedMonth = state.list.filters?.month;
      const preservedYear = state.list.filters?.year;
      state.list.filters = {
        ...DEFAULT_OPEX_FILTERS,
        tab: state.list.filters.tab || 'all',
        search: state.list.filters.search || '',
        // Preserve outside toolbar expense month/year when clearing other filters
        month: preservedMonth || DEFAULT_OPEX_FILTERS.month,
        year: preservedYear || DEFAULT_OPEX_FILTERS.year,
      };
      state.list.page = 1;
      state.list.rows = [];
      state.list.hasMore = true;
      state.list.isLoadingMore = false;
    },
    replaceOpexFilters(state, action) {
      state.list.filters = { ...action.payload };
      state.list.page = 1;
      state.list.rows = [];
      state.list.hasMore = true;
      state.list.isLoadingMore = false;
    },
    setOpexPage(state, action) {
      state.list.page = action.payload || 1;
    },
    setOpexSorting(state, action) {
      state.list.sorting = action.payload || [];
      state.list.page = 1;
      state.list.rows = [];
      state.list.hasMore = true;
      state.list.isLoadingMore = false;
    },
    resetOpexList(state) {
      state.list.rows = [];
      state.list.page = 1;
      state.list.hasMore = true;
      state.list.isLoadingMore = false;
    },
    clearOpexDetail(state) {
      state.detail.data = null;
      state.detail.status = 'idle';
      state.detail.error = null;
    },
    setOpexGroupBy(state, action) {
      state.list.groupBy = action.payload || '';
      state.list.page = 1;
      state.list.rows = [];
      state.list.hasMore = true;
      state.list.isLoadingMore = false;
    },
    setOpexGroupOrder(state, action) {
      state.list.groupOrder = action.payload || '';
      state.list.page = 1;
      state.list.rows = [];
      state.list.hasMore = true;
      state.list.isLoadingMore = false;
    },
    clearOpexComments(state) {
      state.comments.data = null;
      state.comments.status = 'idle';
      state.comments.error = null;
    },
    clearClientCategoryMutationStatus(state) {
      state.clientCategories.createStatus = 'idle';
      state.clientCategories.updateStatus = 'idle';
      state.clientCategories.createParentStatus = 'idle';
      state.clientCategories.error = null;
    },
    resetClientCategories(state) {
      state.clientCategories.rows = [];
      state.clientCategories.page = 1;
      state.clientCategories.hasMore = false;
      state.clientCategories.isLoadingMore = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // List
      .addCase(fetchOpexList.pending, (state, action) => {
        const isAppend = Boolean(action.meta?.arg?.append);
        state.list.error = null;
        if (isAppend) {
          state.list.isLoadingMore = true;
        } else {
          state.list.status = 'loading';
        }
      })
      .addCase(fetchOpexList.fulfilled, (state, action) => {
        const { rows, columns, page, pageSize, totalCount, hasMore, append, replacePage } =
          action.payload;

        state.list.status = 'succeeded';
        state.list.isLoadingMore = false;
        state.list.error = null;
        state.list.totalCount = totalCount ?? 0;
        state.list.hasMore = Boolean(hasMore);
        if (!append) {
          state.list.columns = Array.isArray(columns) ? columns : [];
        }

        if (replacePage != null && Number.isInteger(replacePage) && replacePage >= 1) {
          const pageSizeValue = pageSize || state.list.pageSize;
          const startIndex = (replacePage - 1) * pageSizeValue;
          const newRows = rows || [];
          state.list.rows = [
            ...state.list.rows.slice(0, startIndex),
            ...newRows,
            ...state.list.rows.slice(startIndex + pageSizeValue),
          ];
          // Keep list.page and list.pageSize unchanged for scroll pagination
        } else {
          state.list.page = page;
          state.list.pageSize = pageSize;
          if (append && Array.isArray(state.list.rows)) {
            const existingIds = new Set(state.list.rows.map((r) => r.name));
            const newRows = (rows || []).filter((r) => !existingIds.has(r.name));
            state.list.rows = [...state.list.rows, ...newRows];
          } else {
            state.list.rows = rows || [];
          }

          if (append) {
            const loadedCount = state.list.rows.length;
            const pageSizeValue = pageSize || state.list.pageSize;
            const total = totalCount ?? 0;
            if (total > loadedCount) {
              state.list.hasMore = true;
            } else if ((rows || []).length >= pageSizeValue) {
              state.list.hasMore = true;
            }
          }
        }
      })
      .addCase(fetchOpexList.rejected, (state, action) => {
        state.list.status = 'failed';
        state.list.isLoadingMore = false;
        state.list.error =
          extractErrorMessage(action.payload, 'Failed to fetch OPEX list') ||
          action.error?.message ||
          'Failed to fetch OPEX list';
      })
      // Stats
      .addCase(fetchOpexStats.pending, (state) => {
        state.stats.status = 'loading';
        state.stats.error = null;
      })
      .addCase(fetchOpexStats.fulfilled, (state, action) => {
        state.stats.status = 'succeeded';
        state.stats.data = action.payload;
        state.stats.error = null;
      })
      .addCase(fetchOpexStats.rejected, (state, action) => {
        state.stats.status = 'failed';
        state.stats.error =
          extractErrorMessage(action.payload, 'Failed to fetch OPEX stats') ||
          action.error?.message ||
          'Failed to fetch OPEX stats';
      })

      // Detail
      .addCase(fetchOpexDetail.pending, (state) => {
        state.detail.status = 'loading';
        state.detail.error = null;
      })
      .addCase(fetchOpexDetail.fulfilled, (state, action) => {
        state.detail.status = 'succeeded';
        state.detail.data = action.payload;
        state.detail.error = null;
      })
      .addCase(fetchOpexDetail.rejected, (state, action) => {
        state.detail.status = 'failed';
        state.detail.error =
          extractErrorMessage(action.payload, 'Failed to fetch OPEX detail') ||
          action.error?.message ||
          'Failed to fetch OPEX detail';
      })
      // Comments
      .addCase(fetchOpexComments.pending, (state) => {
        state.comments.status = 'loading';
        state.comments.error = null;
      })
      .addCase(fetchOpexComments.fulfilled, (state, action) => {
        state.comments.status = 'succeeded';
        state.comments.data = action.payload;
        state.comments.error = null;
      })
      .addCase(fetchOpexComments.rejected, (state, action) => {
        state.comments.status = 'failed';
        state.comments.error =
          extractErrorMessage(action.payload, 'Failed to fetch OPEX comments') ||
          action.error?.message ||
          'Failed to fetch OPEX comments';
      })
      .addCase(updateOpexField.pending, (state) => {
        state.mutations.updateStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(updateOpexField.fulfilled, (state, action) => {
        state.mutations.updateStatus = 'succeeded';
        const { opexId } = action.payload || {};
        if (
          state.detail.data &&
          (state.detail.data.name === opexId || String(state.detail.data.name) === String(opexId))
        ) {
          const index = state.list.rows?.findIndex(
            (r) => r.name === opexId || String(r.name) === String(opexId),
          );
          if (index !== undefined && index >= 0) {
            state.list.rows[index] = { ...state.list.rows[index], ...state.detail.data };
          }
        }
      })
      .addCase(updateOpexField.rejected, (state, action) => {
        state.mutations.updateStatus = 'failed';
        state.mutations.error =
          extractErrorMessage(action.payload, 'Failed to update OPEX field') ||
          action.error?.message ||
          'Failed to update OPEX field';
      })
      .addCase(addOpexComment.pending, (state) => {
        state.mutations.commentStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(addOpexComment.fulfilled, (state) => {
        state.mutations.commentStatus = 'succeeded';
      })
      .addCase(addOpexComment.rejected, (state, action) => {
        state.mutations.commentStatus = 'failed';
        state.mutations.error =
          extractErrorMessage(action.payload, 'Failed to add comment') ||
          action.error?.message ||
          'Failed to add comment';
      })
      .addCase(fetchOpexFilterOptions.pending, (state) => {
        state.filterOptions.status = 'loading';
        state.filterOptions.error = null;
      })
      .addCase(fetchOpexFilterOptions.fulfilled, (state, action) => {
        state.filterOptions.status = 'succeeded';
        state.filterOptions.categories = action.payload.categories || [];
        state.filterOptions.subcategories = action.payload.subcategories || [];
        state.filterOptions.error = null;
      })
      .addCase(fetchOpexFilterOptions.rejected, (state, action) => {
        state.filterOptions.status = 'failed';
        state.filterOptions.error =
          extractErrorMessage(action.payload, 'Failed to fetch filter options') ||
          action.error?.message ||
          'Failed to fetch filter options';
      })
      .addCase(fetchOpexCenterOptions.pending, (state) => {
        state.centerOptions.status = 'loading';
        state.centerOptions.error = null;
      })
      .addCase(fetchOpexCenterOptions.fulfilled, (state, action) => {
        state.centerOptions.status = 'succeeded';
        state.centerOptions.rows = action.payload || [];
        state.centerOptions.error = null;
      })
      .addCase(fetchOpexCenterOptions.rejected, (state, action) => {
        state.centerOptions.status = 'failed';
        state.centerOptions.error =
          extractErrorMessage(action.payload, 'Failed to fetch center options') ||
          action.error?.message ||
          'Failed to fetch center options';
      })
      .addCase(fetchOpexFilterSupplierOptions.pending, (state) => {
        state.filterSupplierList.status = 'loading';
        state.filterSupplierList.error = null;
      })
      .addCase(fetchOpexFilterSupplierOptions.fulfilled, (state, action) => {
        state.filterSupplierList.status = 'succeeded';
        state.filterSupplierList.options = action.payload ?? [];
        state.filterSupplierList.error = null;
      })
      .addCase(fetchOpexFilterSupplierOptions.rejected, (state, action) => {
        state.filterSupplierList.status = 'failed';
        state.filterSupplierList.options = [];
        state.filterSupplierList.error =
          extractErrorMessage(action.payload, 'Failed to load suppliers') ||
          action.error?.message ||
          'Failed to load suppliers';
      })
      .addCase(fetchOpexCategoriesTree.pending, (state) => {
        state.categoryTree.status = 'loading';
        state.categoryTree.error = null;
      })
      .addCase(fetchOpexCategoriesTree.fulfilled, (state, action) => {
        state.categoryTree.status = 'succeeded';
        state.categoryTree.data = action.payload || { categories: [] };
        state.categoryTree.error = null;
      })
      .addCase(fetchOpexCategoriesTree.rejected, (state, action) => {
        state.categoryTree.status = 'failed';
        state.categoryTree.error =
          extractErrorMessage(action.payload, 'Failed to fetch categories') ||
          action.error?.message ||
          'Failed to fetch categories';
      })

      // ─── Client OPEX Categories ─────────────────────────
      .addCase(fetchClientOpexCategories.pending, (state, action) => {
        const isAppend = action.meta.arg?.append || false;
        state.clientCategories.error = null;
        if (isAppend) {
          state.clientCategories.isLoadingMore = true;
        } else {
          state.clientCategories.status = 'loading';
        }
      })
      .addCase(fetchClientOpexCategories.fulfilled, (state, action) => {
        state.clientCategories.status = 'succeeded';
        state.clientCategories.isLoadingMore = false;

        const { results, page, pageSize, append, hasMore, totalCount, current_count } =
          action.payload;

        if (append && Array.isArray(results)) {
          // Append to existing data, avoiding duplicates
          const existingData = state.clientCategories.rows || [];
          const existingIds = new Set(existingData.map((item) => item.name));
          const newResults = results.filter((item) => !existingIds.has(item.name));
          state.clientCategories.rows = [...existingData, ...newResults];

          if (current_count !== undefined && totalCount !== undefined) {
            state.clientCategories.hasMore = current_count < totalCount;
          } else if (hasMore === undefined) {
            state.clientCategories.hasMore = state.clientCategories.rows.length < totalCount;
          } else {
            state.clientCategories.hasMore = hasMore;
          }
        } else {
          // Replace data for new search/filter
          state.clientCategories.rows = results || [];
          if (hasMore === undefined) {
            const dataLength = Array.isArray(results) ? results.length : 0;
            state.clientCategories.hasMore = dataLength === pageSize && dataLength < totalCount;
          } else {
            state.clientCategories.hasMore = hasMore;
          }
        }
        state.clientCategories.page = page;
        state.clientCategories.pageSize = pageSize;
        state.clientCategories.totalCount = totalCount;
      })
      .addCase(fetchClientOpexCategories.rejected, (state, action) => {
        state.clientCategories.status = 'failed';
        state.clientCategories.isLoadingMore = false;
        state.clientCategories.error =
          extractErrorMessage(action.payload, 'Failed to fetch OPEX categories') ||
          action.error?.message ||
          'Failed to fetch OPEX categories';
      })

      // Update Client OPEX Category
      .addCase(updateClientOpexCategory.pending, (state) => {
        state.clientCategories.updateStatus = 'loading';
        state.clientCategories.error = null;
      })
      .addCase(updateClientOpexCategory.fulfilled, (state, action) => {
        state.clientCategories.updateStatus = 'succeeded';
        state.clientCategories.error = null;
        if (action.payload && state.clientCategories.rows) {
          const updatedItem = action.payload;
          const index = state.clientCategories.rows.findIndex((r) => r.name === updatedItem.name);
          if (index !== -1) {
            state.clientCategories.rows[index] = {
              ...state.clientCategories.rows[index],
              ...updatedItem,
            };
          }
        }
      })
      .addCase(updateClientOpexCategory.rejected, (state, action) => {
        state.clientCategories.updateStatus = 'failed';
        state.clientCategories.error =
          extractErrorMessage(action.payload, 'Failed to update OPEX category') ||
          action.error?.message ||
          'Failed to update OPEX category';
      })

      .addCase(fetchClientOpexCategoryFilters.pending, (state) => {
        state.clientCategories.filterStatus = 'loading';
      })
      .addCase(fetchClientOpexCategoryFilters.fulfilled, (state, action) => {
        state.clientCategories.filterStatus = 'succeeded';
        state.clientCategories.filterOptions = action.payload;
      })
      .addCase(fetchClientOpexCategoryFilters.rejected, (state, action) => {
        state.clientCategories.filterStatus = 'failed';
        state.clientCategories.error =
          extractErrorMessage(action.payload, 'Failed to fetch OPEX category filters') ||
          action.error?.message ||
          'Failed to fetch OPEX category filters';
      })

      // ─── Client OPEX Column Management ───────────────────
      .addCase(fetchClientOpexColumnList.pending, (state) => {
        state.clientCategories.error = null;
      })
      .addCase(fetchClientOpexColumnList.fulfilled, (state, action) => {
        state.clientCategories.columns = action.payload || [];
      })
      .addCase(fetchClientOpexColumnList.rejected, (state, action) => {
        state.clientCategories.error =
          extractErrorMessage(action.payload, 'Failed to fetch OPEX column list') ||
          action.error?.message ||
          'Failed to fetch OPEX column list';
      })

      .addCase(fetchClientOpexSubCategoryMatrix.pending, (state, action) => {
        const isAppend = Boolean(action.meta?.arg?.append);
        state.clientOpexMatrix.error = null;
        if (isAppend) {
          state.clientOpexMatrix.isLoadingMore = true;
        } else {
          state.clientOpexMatrix.status = 'loading';
          state.clientOpexMatrix.rows = [];
          state.clientOpexMatrix.subcategories = [];
          state.clientOpexMatrix.hasMore = false;
        }
      })
      .addCase(fetchClientOpexSubCategoryMatrix.fulfilled, (state, action) => {
        const { message, append } = action.payload;
        const rows = message?.rows || [];
        const page = message?.page || 1;
        const pageSize = message?.page_size || state.clientOpexMatrix.pageSize;
        const totalCount = message?.total_count ?? rows.length;
        const subcategories = message?.subcategories || [];

        state.clientOpexMatrix.status = 'succeeded';
        state.clientOpexMatrix.isLoadingMore = false;
        state.clientOpexMatrix.page = page;
        state.clientOpexMatrix.pageSize = pageSize;
        state.clientOpexMatrix.totalCount = totalCount;
        state.clientOpexMatrix.subcategories = subcategories.length > 0 ? subcategories : [];
        // if(subcategories.length > 0){
        //   state.clientOpexMatrix.subcategories = subcategories;
        // }
        // else{
        //   state.clientOpexMatrix.subcategories = [];
        // }
        state.clientOpexMatrix.hasMore =
          page < (message?.total_pages || Math.max(1, Math.ceil(totalCount / pageSize)));

        if (append) {
          const existingKeys = new Set(state.clientOpexMatrix.rows.map((r) => r.center));
          const newRows = rows.filter((r) => !existingKeys.has(r.center));
          state.clientOpexMatrix.rows = [...state.clientOpexMatrix.rows, ...newRows];
        } else {
          state.clientOpexMatrix.rows = rows;
        }
      })
      .addCase(fetchClientOpexSubCategoryMatrix.rejected, (state, action) => {
        state.clientOpexMatrix.status = 'failed';
        state.clientOpexMatrix.isLoadingMore = false;
        state.clientOpexMatrix.error =
          extractErrorMessage(action.payload, 'Failed to fetch OPEX sub category matrix') ||
          action.error?.message;
      })

      .addCase(saveClientOpexColumnList.pending, (state) => {
        state.clientCategories.isSavingColumns = true;
      })
      .addCase(saveClientOpexColumnList.fulfilled, (state) => {
        state.clientCategories.isSavingColumns = false;
      })
      .addCase(saveClientOpexColumnList.rejected, (state, action) => {
        state.clientCategories.isSavingColumns = false;
        state.clientCategories.error =
          extractErrorMessage(action.payload, 'Failed to save OPEX column list') ||
          action.error?.message ||
          'Failed to save OPEX column list';
      })

      .addCase(createClientOpexCategory.pending, (state) => {
        state.clientCategories.createStatus = 'loading';
        state.clientCategories.error = null;
      })
      .addCase(createClientOpexCategory.fulfilled, (state) => {
        state.clientCategories.createStatus = 'succeeded';
      })
      .addCase(createClientOpexCategory.rejected, (state, action) => {
        state.clientCategories.createStatus = 'failed';
        state.clientCategories.error =
          extractErrorMessage(action.payload, 'Failed to create OPEX category') ||
          action.error?.message ||
          'Failed to create OPEX category';
      })

      .addCase(createClientOpexParentCategory.pending, (state) => {
        state.clientCategories.createParentStatus = 'loading';
        state.clientCategories.error = null;
      })
      .addCase(createClientOpexParentCategory.fulfilled, (state) => {
        state.clientCategories.createParentStatus = 'succeeded';
      })
      .addCase(createClientOpexParentCategory.rejected, (state, action) => {
        state.clientCategories.createParentStatus = 'failed';
        state.clientCategories.error =
          extractErrorMessage(action.payload, 'Failed to create parent OPEX category') ||
          action.error?.message ||
          'Failed to create parent OPEX category';
      });
  },
});

export const {
  setOpexFilters,
  resetOpexFilters,
  replaceOpexFilters,
  setOpexPage,
  setOpexSorting,
  resetOpexList,
  clearOpexDetail,
  clearOpexComments,
  clearClientCategoryMutationStatus,
  resetClientCategories,
  setOpexGroupBy,
  setOpexGroupOrder,
} = opexSlice.actions;

// -----------------------------
// Selectors
// -----------------------------

export const selectOpexList = (state) => state.opex.list;
export const selectOpexDetail = (state) => state.opex.detail;
export const selectOpexComments = (state) => state.opex.comments;
export const selectOpexStats = (state) => state.opex.stats;
export const selectOpexFilterOptions = (state) => state.opex.filterOptions;
export const selectOpexFilterSupplierOptions = (state) => state.opex.filterSupplierList.options;
export const selectOpexFilterSupplierListStatus = (state) => state.opex.filterSupplierList.status;
export const selectOpexCategoryTree = (state) => state.opex.categoryTree;

export const selectOpexMutations = (state) => state.opex.mutations;

export const selectClientOpexCategories = (state) => state.opex.clientCategories;
export default opexSlice.reducer;
