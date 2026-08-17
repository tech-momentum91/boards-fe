import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';
import {
  BILLING_DOCTYPE,
  CLIENT_BILLING_CATEGORY_DOCTYPE,
  DEFAULT_BILLING_FILTERS,
  BILLING_GROUP_BY_API_MAP,
} from '@/components/billing/constants';

export const BILLING_TAB_VALUES = ['all', 'operations', 'legal', 'accounts', 'invoice'];

const resolveBillingListHasMore = ({ isGrouped, responseData, apiPage, apiPageSize, apiCount }) => {
  if (isGrouped) return false;

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

const buildBillingFilters = (filters = {}) => {
  const listFilters = [];

  // Center filter
  if (filters.center && Array.isArray(filters.center) && filters.center.length > 0) {
    listFilters.push(['center', 'in', filters.center]);
  } else if (filters.center && typeof filters.center === 'string' && filters.center.trim()) {
    listFilters.push(['center', '=', filters.center.trim()]);
  }

  // Client filter
  if (filters.client && Array.isArray(filters.client) && filters.client.length > 0) {
    listFilters.push(['client', 'in', filters.client]);
  } else if (filters.client && typeof filters.client === 'string' && filters.client.trim()) {
    listFilters.push(['client', '=', filters.client.trim()]);
  }

  // Multi-select filters
  const multiFilters = [
    'billing_category',
    'payment_status',
    'operations_signoff',
    'legal_signoff',
    'accounts_signoff',
  ];
  multiFilters.forEach((key) => {
    const values = filters[key];
    if (Array.isArray(values) && values.length > 0) {
      listFilters.push([key, 'in', values]);
    }
  });

  const monthNames = [
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
  const now = new Date();

  // Billing Month/Year -> period_month & period_year (OUTSIDE toolbar; defaults on load)
  const rawBillingMonth = (filters.month || '').trim();
  const hasBillingMonthFilter = Boolean(rawBillingMonth);
  const hasBillingYearFilter = Boolean(filters.year);

  let periodYear;
  let periodMonthNumber;

  if (hasBillingMonthFilter || hasBillingYearFilter) {
    const parsedYear = hasBillingYearFilter
      ? Number.parseInt(String(filters.year), 10)
      : now.getFullYear();
    periodYear = Number.isNaN(parsedYear) ? now.getFullYear() : parsedYear;

    if (hasBillingMonthFilter && rawBillingMonth !== 'All') {
      const monthNumber = monthNames.indexOf(rawBillingMonth) + 1;
      if (monthNumber >= 1 && monthNumber <= 12) {
        periodMonthNumber = monthNumber;
      }
    }
  }

  if (periodYear && !Number.isNaN(periodYear)) {
    listFilters.push(['period_year', '=', periodYear]);
    if (periodMonthNumber && periodMonthNumber >= 1 && periodMonthNumber <= 12) {
      listFilters.push(['period_month', '=', periodMonthNumber]);
    }
  }

  // Trigger Month/Year (INSIDE filter popover; optional)
  const rawTriggerMonth = (filters.trigger_month || '').trim();
  const hasTriggerMonthFilter = Boolean(rawTriggerMonth);
  const hasTriggerYearFilter = Boolean(filters.trigger_year);

  let triggerYear;
  let triggerMonthNumber;

  if (hasTriggerMonthFilter || hasTriggerYearFilter) {
    const parsedTriggerYear = hasTriggerYearFilter
      ? Number.parseInt(String(filters.trigger_year), 10)
      : undefined;
    if (hasTriggerYearFilter && !Number.isNaN(parsedTriggerYear)) {
      triggerYear = parsedTriggerYear;
    }

    if (hasTriggerMonthFilter && rawTriggerMonth !== 'All') {
      const monthNumber = monthNames.indexOf(rawTriggerMonth) + 1;
      if (monthNumber >= 1 && monthNumber <= 12) {
        triggerMonthNumber = monthNumber;
      }
    }
  }

  if (triggerYear && !Number.isNaN(triggerYear)) {
    listFilters.push(['trigger_year', '=', triggerYear]);
    if (triggerMonthNumber && triggerMonthNumber >= 1 && triggerMonthNumber <= 12) {
      listFilters.push(['trigger_month', '=', triggerMonthNumber]);
    }
  }

  return listFilters;
};

const parseBillingGroupedResults = (results) => {
  if (!results || typeof results !== 'object' || Array.isArray(results)) {
    const rows = Array.isArray(results) ? results : [];
    return { groupKeys: [], groupsMap: {}, rows };
  }
  const groupKeys = Object.keys(results);
  const groupsMap = {};
  const rows = [];
  groupKeys.forEach((key) => {
    const items = Array.isArray(results[key]) ? results[key] : [];
    groupsMap[key] = items;
    rows.push(...items);
  });
  return { groupKeys, groupsMap, rows };
};

// -----------------------------
// Async thunks (API-integrated)
// -----------------------------

export const fetchBillingList = createAsyncThunk(
  'billing/fetchBillingList',
  async (params = {}, thunkAPI) => {
    const {
      filters = DEFAULT_BILLING_FILTERS,
      page = 1,
      pageSize = 20,
      orderBy = 'creation desc',
      append = false,
      replacePage = null,
      groupBy = '',
      groupOrder = 'desc',
    } = params;

    try {
      const listFilters = buildBillingFilters(filters);
      const keyword = (filters.search || '').trim();
      const uiGroupBy = groupBy ? String(groupBy).trim() : '';
      const apiGroupField = uiGroupBy ? BILLING_GROUP_BY_API_MAP[uiGroupBy] || uiGroupBy : '';
      const isGrouped = Boolean(apiGroupField);

      const [sortField, ...sortRest] = (orderBy || 'creation desc').trim().split(/\s+/);
      const sortDirection = sortRest.join(' ') || 'desc';
      const apiSortField =
        sortField === 'name'
          ? 'client'
          : sortField === 'billing_month'
            ? 'period'
            : sortField === 'triggered_month'
              ? 'trigger_date'
              : sortField;

      const payload = {
        keyword: keyword || undefined,
        filters: listFilters.length > 0 ? listFilters : undefined,
        status_tab: filters.tab || 'all',
        order_by: `${apiSortField} ${sortDirection}`,
      };

      if (isGrouped) {
        payload.group_by = `${apiGroupField} ${groupOrder || 'desc'}`;
      } else {
        payload.page = page;
        payload.limit_page_length = pageSize;
      }

      const response = await apiClient.post(
        '/method/devx.collection.api.collection.get_billing_list',
        payload,
      );

      const responseData = response?.data?.message || response?.data || {};
      const rawResults = responseData.results ?? responseData.data ?? [];
      const parsed = isGrouped
        ? parseBillingGroupedResults(rawResults)
        : {
            groupKeys: [],
            groupsMap: {},
            rows: Array.isArray(rawResults) ? rawResults : [],
          };

      const apiCount = parsed.rows.length;
      const apiPage = responseData.page ?? page;
      const apiPageSize = responseData.page_size ?? pageSize;
      const totalCountRaw = responseData.total_count ?? responseData.count;
      const hasMore = resolveBillingListHasMore({
        isGrouped,
        responseData,
        apiPage,
        apiPageSize,
        apiCount,
      });

      const totalCount = isGrouped ? parsed.groupKeys.length : (totalCountRaw ?? apiCount);

      return {
        rows: parsed.rows,
        groupKeys: parsed.groupKeys,
        groupsMap: parsed.groupsMap,
        isGrouped,
        page: apiPage,
        pageSize: apiPageSize,
        filters,
        totalCount,
        hasMore,
        orderBy,
        append,
        replacePage: replacePage ?? null,
        groupBy: uiGroupBy,
        groupOrder: groupOrder || 'desc',
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch billing list'),
      );
    }
  },
);

export const fetchBillingStats = createAsyncThunk(
  'billing/fetchBillingStats',
  async (params = {}, thunkAPI) => {
    const { filters = DEFAULT_BILLING_FILTERS } = params;

    try {
      const listFilters = buildBillingFilters(filters);
      const response = await apiClient.post(
        '/method/devx.collection.api.collection.get_billing_stats',
        {
          filters: listFilters.length > 0 ? listFilters : undefined,
        },
      );

      return {
        filters,
        ...response?.data?.message,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch billing stats'),
      );
    }
  },
);

export const fetchBillingDetail = createAsyncThunk(
  'billing/fetchBillingDetail',
  async (billingId, thunkAPI) => {
    if (!billingId) {
      return thunkAPI.rejectWithValue('Billing ID is required');
    }
    try {
      const name = String(billingId);
      const response = await apiClient.get(
        '/method/devx.collection.api.collection.get_billing_detail',
        {
          params: { name },
        },
      );
      const document_ = response?.data?.message ?? response?.data?.data ?? response?.data;
      if (!document_) {
        return thunkAPI.rejectWithValue('Billing record not found');
      }
      return document_;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch billing detail'),
      );
    }
  },
);

export const updateBillingField = createAsyncThunk(
  'billing/updateBillingField',
  async ({ name: billingId, fieldname, value }, thunkAPI) => {
    if (!billingId || !fieldname) {
      return thunkAPI.rejectWithValue('Billing name and field are required');
    }
    try {
      await apiClient.post('/method/frappe.client.set_value', {
        doctype: BILLING_DOCTYPE,
        name: String(billingId),
        fieldname,
        value,
      });
      await thunkAPI.dispatch(fetchBillingDetail(billingId)).unwrap();
      return { billingId, fieldname, value };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to update billing field'),
      );
    }
  },
);

export const generateBillingRecordsForClient = createAsyncThunk(
  'billing/generateBillingRecordsForClient',
  async ({ client, period = null }, thunkAPI) => {
    if (!client) {
      return thunkAPI.rejectWithValue('Client is required');
    }
    try {
      const response = await apiClient.post(
        '/method/devx.collection.api.collection.generate_billing_records_for_client',
        {
          client: String(client),
          period,
        },
      );
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to generate billing records'),
      );
    }
  },
);

export const fetchBillingFilterOptions = createAsyncThunk(
  'billing/fetchBillingFilterOptions',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.post(
        '/method/devx.collection.api.collection.get_billing_category_filter_options',
      );
      return response?.data?.message || {};
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch billing filter options'),
      );
    }
  },
);

export const fetchClientBillingConfigurations = createAsyncThunk(
  'billing/fetchClientBillingConfigurations',
  async ({ center = null, client = null } = {}, thunkAPI) => {
    try {
      const response = await apiClient.post(
        '/method/devx.collection.api.collection.get_client_billing_configurations',
        { center, client },
      );
      const data = response?.data?.message || {};
      return { configurations: data.configurations ?? [] };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch billing configurations'),
      );
    }
  },
);

export const updateClientBillingCategories = createAsyncThunk(
  'billing/updateClientBillingCategories',
  async ({ center, client, categories }, thunkAPI) => {
    if (!center || !client) {
      return thunkAPI.rejectWithValue('Center and client are required');
    }
    try {
      await apiClient.post(
        '/method/devx.collection.api.collection.update_client_billing_categories',
        { center, client, categories: categories || [] },
      );
      return { center, client, categories };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to update billing categories'),
      );
    }
  },
);

// Client Billing Categories management

export const fetchClientBillingCategories = createAsyncThunk(
  'billing/fetchClientBillingCategories',
  async (
    { keyword = '', filters = {}, page = 1, pageSize = 20, append = false } = {},
    thunkAPI,
  ) => {
    try {
      const response = await apiClient.post(
        '/method/devx.collection.doctype.client_billing_category.client_billing_category.client_billing_category_list',
        {
          keyword: keyword?.trim() || '',
          page,
          page_size: pageSize,
          filters: {
            category: Array.isArray(filters.category) ? filters.category : [],
            status: Array.isArray(filters.status) ? filters.status : [],
          },
        },
      );

      const message = response?.data?.message || response?.data || {};
      const results = Array.isArray(message.results) ? message.results : [];
      const apiPage = message.page ?? page;
      const apiPageSize = message.page_size ?? pageSize;
      const apiCount = message.count ?? results.length;
      const totalCount = message.total_count ?? apiCount ?? results.length;
      const totalPages =
        message.total_pages ??
        (apiPageSize > 0 ? Math.max(1, Math.ceil(totalCount / apiPageSize)) : 1);

      const itemsLoadedSoFar = (apiPage - 1) * apiPageSize + apiCount;
      const currentCount = append ? itemsLoadedSoFar : apiCount;

      const hasMore = apiPage < totalPages;

      return {
        results,
        page: apiPage,
        pageSize: apiPageSize,
        append,
        hasMore,
        totalCount,
        current_count: currentCount,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch billing categories'),
      );
    }
  },
);

export const fetchClientBillingCategoryFilters = createAsyncThunk(
  'billing/fetchClientBillingCategoryFilters',
  async (_, thunkAPI) => {
    try {
      const formData = new FormData();
      formData.append('doctype', CLIENT_BILLING_CATEGORY_DOCTYPE);
      formData.append('filters', JSON.stringify([]));
      formData.append('limit_page_length', '999');
      formData.append('page', '1');
      formData.append('order_by', 'category asc');

      const response = await apiClient.post(
        '/method/devx.api.listview.list_with_search_filters',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      const responseData = response?.data?.message || response?.data || {};
      const results = responseData.results || responseData.data || responseData || [];
      const categories = [...new Set((results || []).map((r) => r.category).filter(Boolean))];
      return categories.map((c) => ({ category: c, name: c }));
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch billing category filters'),
      );
    }
  },
);

export const fetchClientBillingColumnList = createAsyncThunk(
  'billing/fetchClientBillingColumnList',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.get_list_pref', {
        doctype: CLIENT_BILLING_CATEGORY_DOCTYPE,
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch billing column list'),
      );
    }
  },
);

export const saveClientBillingColumnList = createAsyncThunk(
  'billing/saveClientBillingColumnList',
  async (columns, thunkAPI) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: CLIENT_BILLING_CATEGORY_DOCTYPE,
        columns,
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to save billing column list'),
      );
    }
  },
);

const CLIENT_BILLING_CONFIG_TABLE_ID = 'client-billing-config-table';

export const fetchClientBillingConfigColumnList = createAsyncThunk(
  'billing/fetchClientBillingConfigColumnList',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.get_list_pref', {
        doctype: CLIENT_BILLING_CATEGORY_DOCTYPE,
        react_table_id: CLIENT_BILLING_CONFIG_TABLE_ID,
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized ||
          extractErrorMessage(error, 'Failed to fetch billing config column list'),
      );
    }
  },
);

export const saveClientBillingConfigColumnList = createAsyncThunk(
  'billing/saveClientBillingConfigColumnList',
  async (columns, thunkAPI) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: CLIENT_BILLING_CATEGORY_DOCTYPE,
        columns,
        react_table_id: CLIENT_BILLING_CONFIG_TABLE_ID,
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to save billing config column list'),
      );
    }
  },
);

export const createClientBillingCategory = createAsyncThunk(
  'billing/createClientBillingCategory',
  async (payload, thunkAPI) => {
    try {
      const response = await apiClient.post(
        `/resource/${CLIENT_BILLING_CATEGORY_DOCTYPE}`,
        payload,
      );
      return response?.data?.data || response?.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to create billing category'),
      );
    }
  },
);

export const updateClientBillingCategory = createAsyncThunk(
  'billing/updateClientBillingCategory',
  async (payload, thunkAPI) => {
    const { name, ...rest } = payload || {};
    if (!name) {
      return thunkAPI.rejectWithValue('Category name is required');
    }
    try {
      const response = await apiClient.put(
        `/resource/${CLIENT_BILLING_CATEGORY_DOCTYPE}/${name}`,
        rest,
      );
      return response?.data?.data || response?.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to update billing category'),
      );
    }
  },
);

// Column list preferences (similar to OPEX)
export const saveBillingListPref = createAsyncThunk(
  'billing/saveBillingListPref',
  async ({ react_table_id, columns }, thunkAPI) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: BILLING_DOCTYPE,
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

export const fetchBillingListPref = createAsyncThunk(
  'billing/fetchBillingListPref',
  async ({ react_table_id }, thunkAPI) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: {
          doctype: BILLING_DOCTYPE,
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

export const fetchClients = createAsyncThunk('billing/fetchClients', async (_, thunkAPI) => {
  try {
    const response = await apiClient.get(
      '/resource/Customer?fields=["customer_name","name"]&order_by=creation&limit_page_length=999',
    );
    return response?.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(
      error.serialized || extractErrorMessage(error, 'Failed to fetch clients'),
    );
  }
});

export const fetchCenterWiseClientsThunk = createAsyncThunk(
  'billing/fetchCenterWiseClientsThunk',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.get(
        '/method/devx.api.client_management.get_centers_with_client_groups?center=&active_only=&',
      );
      return response?.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const fetchListingMatrix = createAsyncThunk(
  'billing/fetchListingMatrix',
  async (
    { keyword = '', filters = {}, page = 1, pageSize = 20, append = false } = {},
    thunkAPI,
  ) => {
    try {
      const listFilters = [];

      if (filters?.center?.length) {
        listFilters.push(['center', 'in', filters.center]);
      }

      if (filters?.client?.length) {
        listFilters.push(['client', 'in', filters.client]);
      }

      const response = await apiClient.post(
        '/method/devx.collection.api.collection.get_client_billing_category_matrix',
        {
          keyword: keyword?.trim() || '',
          filters: listFilters,
          center: filters?.center || [],
          client: filters?.client || [],
          page,
          limit_page_length: pageSize,
          order_by: 'creation desc',
        },
      );

      const data = response?.data?.message || {};
      const rows = data.rows || [];

      const totalCount = data.total_count ?? rows.length;
      const totalPages = data.total_pages ?? Math.max(1, Math.ceil(totalCount / pageSize));

      const hasMore = page < totalPages;

      return {
        message: {
          rows,
          categories: data.categories || [],
          page,
          page_size: pageSize,
          total_count: totalCount,
          total_pages: totalPages,
        },
        append,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error.message);
    }
  },
);

export const addBillingComment = createAsyncThunk(
  'billing/addBillingComment',
  async (
    { client_billing, content, visible_to_client = 0, files = [], parent_comment = '' },
    thunkAPI,
  ) => {
    if (!client_billing || (!content && files.length === 0)) {
      return thunkAPI.rejectWithValue('Billing ID and content are required');
    }

    try {
      const formData = new FormData();

      formData.append('client_billing', String(client_billing));
      formData.append('content', content);
      formData.append('visible_to_client', visible_to_client);
      formData.append('parent_comment', parent_comment);

      files.forEach((f) => {
        formData.append('files[]', f.file || f);
      });

      const response = await apiClient.post(
        '/method/devx.collection.doctype.client_billing_comment.client_billing_comment.add_client_billing_comment_with_files',
        formData,
      );

      const message = response?.data?.message || response?.data;

      await thunkAPI.dispatch(fetchBillingDetail(client_billing)).unwrap();

      return message;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to add billing comment'),
      );
    }
  },
);

export const fetchBillingComments = createAsyncThunk(
  'billing/fetchBillingComments',
  async (billingId, thunkAPI) => {
    if (!billingId) {
      return thunkAPI.rejectWithValue('Billing ID is required');
    }

    try {
      const response = await apiClient.get(
        '/method/devx.collection.api.collection.get_client_billing_activities',
        {
          params: {
            client_billing: billingId,
          },
        },
      );

      return response?.data?.message || response?.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch billing comments'),
      );
    }
  },
);

export const fetchCenterWiseCategory = createAsyncThunk(
  'billing/fetchCenterWiseCategory',
  async ({ client }, thunkAPI) => {
    try {
      const response = await apiClient.get(
        '/method/devx.collection.api.collection.get_billing_category_flags_for_client',
        { params: { client } },
      );

      const centers = response?.data?.message?.centers || [];

      return centers;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch categories'),
      );
    }
  },
);

export const addClientBilling = createAsyncThunk(
  'billing/addClientBilling',
  async (params = {}, thunkAPI) => {
    const {
      client,
      center,
      billing_category,
      period_month,
      period_year,
      payment_due_date,
      files = [],
    } = params;

    if (!client || !center || !billing_category) {
      return thunkAPI.rejectWithValue('Client, center, and category are required');
    }

    try {
      const formData = new FormData();
      formData.append('client', String(client));
      formData.append('center', String(center));
      formData.append('billing_category', String(billing_category));

      if (period_month != null && period_month !== '') {
        formData.append('period_month', String(period_month));
      }
      if (period_year != null && period_year !== '') {
        formData.append('period_year', String(period_year));
      }
      if (payment_due_date) {
        formData.append('payment_due_date', String(payment_due_date));
      }

      files.forEach((file) => {
        if (file instanceof File) {
          formData.append('files[]', file);
        }
      });

      const response = await apiClient.post(
        '/method/devx.collection.api.collection.add_client_billing',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      return response?.data?.message || response?.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to add billing'),
      );
    }
  },
);

export const toggleClientBillingCategory = createAsyncThunk(
  'billing/toggleClientBillingCategory',
  async ({ client, center, category, categories, enabled }, thunkAPI) => {
    try {
      const payload = {
        client,
        center,
        enabled,
      };

      if (category) payload.category = category;
      if (categories) payload.category = categories;

      const response = await apiClient.post(
        '/method/devx.collection.api.collection.toggle_client_billing_category_for_client',
        payload,
      );

      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message);
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
    status: 'idle',
    error: null,
    filters: { ...DEFAULT_BILLING_FILTERS },
    page: 1,
    pageSize: 20,
    totalCount: 0,
    sorting: [],
    hasMore: true,
    isLoadingMore: false,
    groupBy: '',
    groupOrder: 'desc',
    groupKeys: [],
    groupsMap: {},
    isGrouped: false,
  },
  detail: {
    data: null,
    status: 'idle',
    error: null,
  },
  stats: {
    ...initialAsyncSection,
  },
  mutations: {
    updateStatus: 'idle',
    generateStatus: 'idle',
    commentStatus: 'idle',
    addBillingStatus: 'idle',
    error: null,
  },
  filterOptions: {
    categories: [],
    status: 'idle',
    error: null,
  },
  billingConfigurations: {
    data: { configurations: [] },
    status: 'idle',
    error: null,
  },
  // Client billing category management
  clientCategories: {
    rows: [],
    filterOptions: [],
    status: 'idle',
    createStatus: 'idle',
    updateStatus: 'idle',
    isLoadingMore: false,
    page: 1,
    pageSize: 20,
    hasMore: false,
    totalCount: 0,
    error: null,
  },

  clientList: {
    data: [],
    isLoading: false,
    error: null,
  },

  centerWiseClients: {
    data: [],
    isLoading: false,
    error: null,
    status: null,
  },

  listingMatrix: {
    rows: [],
    error: null,

    page: 1,
    pageSize: 20,
    totalCount: 0,

    hasMore: true,
    isLoadingMore: false,
  },
  comments: {
    data: [],
    loading: false,
    status: 'idle',
  },
  centerWiseCategories: {
    data: [],
    status: 'idle',
    error: null,
  },
};

// -----------------------------
// Slice
// -----------------------------

const billingSlice = createSlice({
  name: 'billing',
  initialState,
  reducers: {
    setBillingFilters(state, action) {
      state.list.filters = {
        ...state.list.filters,
        ...action.payload,
      };
      state.list.page = 1;
      state.list.rows = [];
      state.list.groupKeys = [];
      state.list.groupsMap = {};
      state.list.hasMore = true;
      state.list.isLoadingMore = false;
    },
    resetBillingFilters(state) {
      const preservedMonth = state.list.filters?.month;
      const preservedYear = state.list.filters?.year;
      state.list.filters = {
        ...DEFAULT_BILLING_FILTERS,
        tab: state.list.filters.tab || 'all',
        search: state.list.filters.search || '',
        // Preserve outside toolbar billing month/year when clearing other filters
        month: preservedMonth || DEFAULT_BILLING_FILTERS.month,
        year: preservedYear || DEFAULT_BILLING_FILTERS.year,
      };
      state.list.page = 1;
      state.list.rows = [];
      state.list.hasMore = true;
      state.list.isLoadingMore = false;
    },
    replaceBillingFilters(state, action) {
      state.list.filters = { ...action.payload };
      state.list.page = 1;
      state.list.rows = [];
      state.list.hasMore = true;
      state.list.isLoadingMore = false;
    },
    setBillingPage(state, action) {
      state.list.page = action.payload || 1;
    },
    setBillingSorting(state, action) {
      state.list.sorting = action.payload || [];
      state.list.page = 1;
      state.list.rows = [];
      state.list.hasMore = true;
      state.list.isLoadingMore = false;
    },
    setBillingGroupBy(state, action) {
      const { groupBy = '', groupOrder = 'desc' } = action.payload || {};
      state.list.groupBy = groupBy;
      state.list.groupOrder = groupOrder;
      state.list.page = 1;
      state.list.rows = [];
      state.list.groupKeys = [];
      state.list.groupsMap = {};
      state.list.isGrouped = Boolean(groupBy);
      state.list.hasMore = true;
      state.list.isLoadingMore = false;
    },
    resetBillingList(state) {
      state.list.rows = [];
      state.list.page = 1;
      state.list.hasMore = true;
      state.list.isLoadingMore = false;
    },
    clearBillingDetail(state) {
      state.detail.data = null;
      state.detail.status = 'idle';
      state.detail.error = null;
    },
    clearClientCategoryMutationStatus(state) {
      state.clientCategories.createStatus = 'idle';
      state.clientCategories.updateStatus = 'idle';
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
      .addCase(fetchBillingList.pending, (state, action) => {
        const isAppend = Boolean(action.meta?.arg?.append);
        state.list.error = null;
        if (isAppend) {
          state.list.isLoadingMore = true;
        } else {
          state.list.status = 'loading';
        }
      })
      .addCase(fetchBillingList.fulfilled, (state, action) => {
        const {
          rows,
          page,
          pageSize,
          totalCount,
          hasMore,
          append,
          replacePage,
          groupKeys,
          groupsMap,
          isGrouped,
          groupBy,
          groupOrder,
        } = action.payload;

        state.list.status = 'succeeded';
        state.list.isLoadingMore = false;
        state.list.error = null;
        state.list.totalCount = totalCount ?? 0;
        state.list.hasMore = Boolean(hasMore);
        state.list.isGrouped = Boolean(isGrouped);
        state.list.groupBy = groupBy || '';
        state.list.groupOrder = groupOrder || 'desc';
        state.list.groupKeys = isGrouped ? groupKeys || [] : [];
        state.list.groupsMap = isGrouped ? groupsMap || {} : {};

        if (replacePage != null && Number.isInteger(replacePage) && replacePage >= 1) {
          const pageSizeValue = pageSize || state.list.pageSize;
          const startIndex = (replacePage - 1) * pageSizeValue;
          const newRows = rows || [];
          state.list.rows = [
            ...state.list.rows.slice(0, startIndex),
            ...newRows,
            ...state.list.rows.slice(startIndex + pageSizeValue),
          ];
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

          if (!state.list.isGrouped && append) {
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
      .addCase(fetchBillingList.rejected, (state, action) => {
        state.list.status = 'failed';
        state.list.isLoadingMore = false;
        state.list.error =
          extractErrorMessage(action.payload, 'Failed to fetch billing list') ||
          action.error?.message ||
          'Failed to fetch billing list';
      })

      // Stats
      .addCase(fetchBillingStats.pending, (state) => {
        state.stats.status = 'loading';
        state.stats.error = null;
      })
      .addCase(fetchBillingStats.fulfilled, (state, action) => {
        state.stats.status = 'succeeded';
        state.stats.data = action.payload;
        state.stats.error = null;
      })
      .addCase(fetchBillingStats.rejected, (state, action) => {
        state.stats.status = 'failed';
        state.stats.error =
          extractErrorMessage(action.payload, 'Failed to fetch billing stats') ||
          action.error?.message ||
          'Failed to fetch billing stats';
      })

      // Detail
      .addCase(fetchBillingDetail.pending, (state) => {
        state.detail.status = 'loading';
        state.detail.error = null;
      })
      .addCase(fetchBillingDetail.fulfilled, (state, action) => {
        state.detail.status = 'succeeded';
        state.detail.data = action.payload;
        state.detail.error = null;
      })
      .addCase(fetchBillingDetail.rejected, (state, action) => {
        state.detail.status = 'failed';
        state.detail.error =
          extractErrorMessage(action.payload, 'Failed to fetch billing detail') ||
          action.error?.message ||
          'Failed to fetch billing detail';
      })

      // Update field
      .addCase(updateBillingField.pending, (state) => {
        state.mutations.updateStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(updateBillingField.fulfilled, (state, action) => {
        state.mutations.updateStatus = 'succeeded';
        const { billingId } = action.payload || {};
        if (
          state.detail.data &&
          (state.detail.data.name === billingId ||
            String(state.detail.data.name) === String(billingId))
        ) {
          const index = state.list.rows?.findIndex(
            (r) => r.name === billingId || String(r.name) === String(billingId),
          );
          if (index !== undefined && index >= 0) {
            state.list.rows[index] = { ...state.list.rows[index], ...state.detail.data };
          }
        }
      })
      .addCase(updateBillingField.rejected, (state, action) => {
        state.mutations.updateStatus = 'failed';
        state.mutations.error =
          extractErrorMessage(action.payload, 'Failed to update billing field') ||
          action.error?.message ||
          'Failed to update billing field';
      })

      // Generate records
      .addCase(generateBillingRecordsForClient.pending, (state) => {
        state.mutations.generateStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(generateBillingRecordsForClient.fulfilled, (state) => {
        state.mutations.generateStatus = 'succeeded';
      })
      .addCase(generateBillingRecordsForClient.rejected, (state, action) => {
        state.mutations.generateStatus = 'failed';
        state.mutations.error =
          extractErrorMessage(action.payload, 'Failed to generate billing records') ||
          action.error?.message ||
          'Failed to generate billing records';
      })

      // Filter options
      .addCase(fetchBillingFilterOptions.pending, (state) => {
        state.filterOptions.status = 'loading';
        state.filterOptions.error = null;
      })
      .addCase(fetchBillingFilterOptions.fulfilled, (state, action) => {
        state.filterOptions.status = 'succeeded';
        state.filterOptions.categories = action.payload.categories || [];
        state.filterOptions.error = null;
      })
      .addCase(fetchBillingFilterOptions.rejected, (state, action) => {
        state.filterOptions.status = 'failed';
        state.filterOptions.error =
          extractErrorMessage(action.payload, 'Failed to fetch filter options') ||
          action.error?.message ||
          'Failed to fetch filter options';
      })

      // Billing configurations (table view)
      .addCase(fetchClientBillingConfigurations.pending, (state) => {
        state.billingConfigurations.status = 'loading';
        state.billingConfigurations.error = null;
      })
      .addCase(fetchClientBillingConfigurations.fulfilled, (state, action) => {
        state.billingConfigurations.status = 'succeeded';
        state.billingConfigurations.data = action.payload || { configurations: [] };
        state.billingConfigurations.error = null;
      })
      .addCase(fetchClientBillingConfigurations.rejected, (state, action) => {
        state.billingConfigurations.status = 'failed';
        state.billingConfigurations.error =
          extractErrorMessage(action.payload, 'Failed to fetch billing configurations') ||
          action.error?.message ||
          'Failed to fetch billing configurations';
      })

      // Client billing category filters
      .addCase(fetchClientBillingCategoryFilters.fulfilled, (state, action) => {
        state.clientCategories.filterOptions = action.payload || [];
      })

      // Client billing column list
      .addCase(fetchClientBillingColumnList.fulfilled, (state, action) => {
        state.clientCategories.columns = action.payload || [];
      })

      // Client billing categories
      .addCase(fetchClientBillingCategories.pending, (state, action) => {
        const isAppend = action.meta.arg?.append || false;
        state.clientCategories.error = null;
        if (isAppend) {
          state.clientCategories.isLoadingMore = true;
        } else {
          state.clientCategories.status = 'loading';
        }
      })
      .addCase(fetchClientBillingCategories.fulfilled, (state, action) => {
        state.clientCategories.status = 'succeeded';
        state.clientCategories.isLoadingMore = false;

        const { results, page, pageSize, append, hasMore, totalCount, current_count } =
          action.payload;

        if (append && Array.isArray(results)) {
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
      .addCase(fetchClientBillingCategories.rejected, (state, action) => {
        state.clientCategories.status = 'failed';
        state.clientCategories.isLoadingMore = false;
        state.clientCategories.error =
          extractErrorMessage(action.payload, 'Failed to fetch billing categories') ||
          action.error?.message ||
          'Failed to fetch billing categories';
      })

      // Create category
      .addCase(createClientBillingCategory.pending, (state) => {
        state.clientCategories.createStatus = 'loading';
        state.clientCategories.error = null;
      })
      .addCase(createClientBillingCategory.fulfilled, (state) => {
        state.clientCategories.createStatus = 'succeeded';
      })
      .addCase(createClientBillingCategory.rejected, (state, action) => {
        state.clientCategories.createStatus = 'failed';
        state.clientCategories.error =
          extractErrorMessage(action.payload, 'Failed to create billing category') ||
          action.error?.message ||
          'Failed to create billing category';
      })

      // Update category
      .addCase(updateClientBillingCategory.pending, (state) => {
        state.clientCategories.updateStatus = 'loading';
        state.clientCategories.error = null;
      })
      .addCase(updateClientBillingCategory.fulfilled, (state, action) => {
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
      .addCase(updateClientBillingCategory.rejected, (state, action) => {
        state.clientCategories.updateStatus = 'failed';
        state.clientCategories.error =
          extractErrorMessage(action.payload, 'Failed to update billing category') ||
          action.error?.message ||
          'Failed to update billing category';
      })

      .addCase(fetchClients.pending, (state) => {
        state.clientList.isLoading = true;
        state.clientList.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.clientList.isLoading = false;
        state.clientList.data = action.payload || action.payload?.message || [];
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.clientList.isLoading = false;
        state.clientList.error = action.payload;
      })

      .addCase(fetchCenterWiseClientsThunk.pending, (state) => {
        state.centerWiseClients.isLoading = true;
        state.centerWiseClients.error = null;
      })
      .addCase(fetchCenterWiseClientsThunk.fulfilled, (state, action) => {
        state.centerWiseClients.isLoading = false;
        state.centerWiseClients.data = action.payload || action.payload?.message || [];
      })
      .addCase(fetchCenterWiseClientsThunk.rejected, (state, action) => {
        state.centerWiseClients.isLoading = false;
        state.centerWiseClients.error = action.payload;
      })
      .addCase(fetchListingMatrix.pending, (state, action) => {
        const isAppend = action.meta?.arg?.append;

        if (isAppend) {
          state.listingMatrix.isLoadingMore = true;
        } else {
          state.listingMatrix.status = 'loading';
        }

        state.listingMatrix.error = null;
      })

      .addCase(fetchListingMatrix.fulfilled, (state, action) => {
        const { message, append } = action.payload;

        const rows = message?.rows || [];
        const page = message?.page || 1;
        const pageSize = message?.page_size || 20;
        const totalCount = message?.total_count || 0;
        const categories = message?.categories || [];

        state.listingMatrix.status = 'succeeded';
        state.listingMatrix.isLoadingMore = false;

        state.listingMatrix.page = page;
        state.listingMatrix.pageSize = pageSize;
        state.listingMatrix.totalCount = totalCount;
        state.listingMatrix.hasMore = page < message.total_pages;
        state.listingMatrix.categories = categories;

        if (append) {
          const existingIds = new Set(
            state.listingMatrix.rows.map((r) => `${r.center}-${r.client}`),
          );

          const newRows = rows.filter((r) => !existingIds.has(`${r.center}-${r.client}`));

          state.listingMatrix.rows = [...state.listingMatrix.rows, ...newRows];
        } else {
          state.listingMatrix.rows = rows;
        }
      })

      .addCase(fetchListingMatrix.rejected, (state, action) => {
        state.listingMatrix.status = 'failed';
        state.listingMatrix.isLoadingMore = false;

        state.listingMatrix.error =
          extractErrorMessage(action.payload, 'Failed to fetch listing matrix') ||
          action.error?.message;
      })
      .addCase(addClientBilling.pending, (state) => {
        state.mutations.addBillingStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(addClientBilling.fulfilled, (state) => {
        state.mutations.addBillingStatus = 'succeeded';
      })
      .addCase(addClientBilling.rejected, (state, action) => {
        state.mutations.addBillingStatus = 'failed';
        state.mutations.error =
          extractErrorMessage(action.payload, 'Failed to add billing') || action.error?.message;
      })
      .addCase(addBillingComment.pending, (state) => {
        state.mutations.commentStatus = 'loading';
      })
      .addCase(addBillingComment.fulfilled, (state) => {
        state.mutations.commentStatus = 'succeeded';
      })
      .addCase(addBillingComment.rejected, (state, action) => {
        state.mutations.commentStatus = 'failed';
        state.mutations.error =
          extractErrorMessage(action.payload, 'Failed to add billing comment') ||
          action.error?.message;
      })
      .addCase(fetchBillingComments.pending, (state) => {
        state.comments.loading = true;
        state.comments.status = 'loading';
      })

      .addCase(fetchBillingComments.fulfilled, (state, action) => {
        state.comments.loading = false;
        state.comments.status = 'succeeded';
        state.comments.data = action.payload;
      })

      .addCase(fetchBillingComments.rejected, (state) => {
        state.comments.loading = false;
        state.comments.status = 'failed';
      })
      .addCase(fetchCenterWiseCategory.pending, (state) => {
        state.centerWiseCategories.status = 'loading';
      })

      .addCase(fetchCenterWiseCategory.fulfilled, (state, action) => {
        state.centerWiseCategories.status = 'succeeded';
        state.centerWiseCategories.data = action.payload || [];
      })

      .addCase(fetchCenterWiseCategory.rejected, (state, action) => {
        state.centerWiseCategories.status = 'failed';
        state.centerWiseCategories.error = action.payload;
      })
      .addCase(toggleClientBillingCategory.fulfilled, (state, action) => {
        const { center, category, enabled } = action.payload;

        const centerObj = state.centerWiseCategories.data.find((c) => c.center === center);

        if (!centerObj) return;

        const cat = centerObj.categories?.find((c) => c.category === category);

        if (cat) {
          cat.value = enabled ? 1 : 0;
        }
      });
  },
});

export const {
  setBillingFilters,
  resetBillingFilters,
  replaceBillingFilters,
  setBillingPage,
  setBillingSorting,
  setBillingGroupBy,
  resetBillingList,
  clearBillingDetail,
  clearClientCategoryMutationStatus,
  resetClientCategories,
} = billingSlice.actions;

// -----------------------------
// Selectors
// -----------------------------

export const selectBillingList = (state) => state.billing.list;
export const selectBillingDetail = (state) => state.billing.detail;
export const selectBillingStats = (state) => state.billing.stats;
export const selectBillingFilterOptions = (state) => state.billing.filterOptions;
export const selectBillingConfigurations = (state) => state.billing.billingConfigurations;
export const selectBillingMutations = (state) => state.billing.mutations;
export const selectClientBillingCategories = (state) => state.billing.clientCategories;
export const selectBillingComments = (state) => state.billing.comments;
export const selectCenterWiseCategories = (state) => state.billing.centerWiseCategories;
export default billingSlice.reducer;
