import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import { normalizeVendorRatingDetail, normalizeVendorRatingGroups } from '@/utils/vendor-utils';

const VENDOR_DOCTYPE = 'Vendor';

function mergeGroupedVendorRatings(existing = [], incoming = []) {
  const map = new Map();

  for (const group of existing) {
    const key = group.center_name ?? 'Unknown Location';
    map.set(key, { ...group, surveys: [...(group.surveys ?? [])] });
  }

  for (const group of incoming) {
    const key = group.center_name ?? 'Unknown Location';
    const incomingSurveys = group.surveys ?? [];

    if (!map.has(key)) {
      map.set(key, { ...group, surveys: [...incomingSurveys] });
      continue;
    }

    const current = map.get(key);
    const existingNames = new Set(current.surveys.map((s) => s.name).filter(Boolean));
    for (const survey of incomingSurveys) {
      if (survey?.name && existingNames.has(survey.name)) continue;
      current.surveys.push(survey);
      if (survey?.name) existingNames.add(survey.name);
    }
  }

  return [...map.values()];
}

const initialState = {
  vendorListData: {
    data: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    totalCount: 0,
    currentPage: 1,
    pageSize: 20,
    hasMore: true,
    status: 'idle',
    statusCounts: {},
    vendorTypeCounts: {},
    isGrouped: false,
    groupedData: {},
  },
  createVendorDrawer: {
    isOpen: false,
    new_vendor: null,
    error: null,
    status: null,
    isLoading: false,
  },
  viewVendorDrawer: {
    isOpen: false,
    selectedVendor: null,
  },
  editVendorDrawer: {
    isOpen: false,
    selectedVendor: null,
  },
  removeVendorDrawer: {
    isOpen: false,
    selectedVendor: null,
    isLoading: false,
    error: null,
  },
  vendorDetail: {
    data: null,
    isLoading: false,
    error: null,
    status: 'idle',
    localChanges: {},
  },

  vendorDetails: {
    data: null,
    isLoading: false,
    error: null,
    status: null,
  },

  vendorBillsListview: {
    data: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    currentPage: 1,
    totalPages: 1,
    hasMore: false,
  },
  addVendorContact: {
    isLoading: false,
    message: null,
    error: null,
  },
  updateVendorContact: {
    isLoading: false,
    message: null,
    error: null,
  },
  vendorOpexCategories: {
    data: [],
    isLoading: false,
    error: null,
    status: 'idle',
  },
  onboardingTasks: {
    data: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    page: 1,
    page_size: 20,
    total_pages: 0,
    total_count: 0,
    has_more: false,
  },
  taskDetail: {
    data: null,
    isLoading: false,
    error: null,
  },
  selectedTask: {
    taskId: null,
    taskType: null,
  },
  taskComments: {
    data: {
      comments: [],
      history: [],
      communications: [],
      views: [],
      calls: [],
    },
    isLoading: false,
    error: null,
  },
  taskColumnList: null,

  addVendorDocumentModal: {
    isOpen: false,
  },
  editVendorDocumentModal: {
    isOpen: false,
    selectedDocument: null,
  },
  removeVendorDocumentModal: {
    isOpen: false,
    selectedDocument: null,
  },
  vendorDocument: {
    isLoading: false,
    error: null,
    status: null,
  },

  documentTypes: {
    data: [],
    isLoading: false,
    error: null,
  },

  vendorSurveyServices: {
    data: [],
    isLoading: false,
    error: null,
  },
  vendorRatings: {
    data: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    currentPage: 1,
    totalPages: 1,
    hasMore: false,
    pageSize: 20,
  },
  vendorRatingSummary: {
    data: null,
    isLoading: false,
    error: null,
  },
  vendorRatingDetail: {
    data: null,
    isLoading: false,
    error: null,
  },
  selectedVendorRating: {
    surveyName: null,
    rowData: null,
  },
};

export const getVendorDetailThunk = createAsyncThunk(
  'vendor/getVendorDetail',
  async (vendorId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/method/devx.api.vendor.get_vendor_detail', {
        params: { vendor: vendorId },
      });
      return response?.data?.message?.data ?? response?.data?.message ?? null;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);
export const updateVendorFieldThunk = createAsyncThunk(
  'vendor/updateVendorField',
  async ({ vendorId, fieldName, value, payload }, { rejectWithValue }) => {
    try {
      const body =
        payload != null && typeof payload === 'object' && !Array.isArray(payload)
          ? payload
          : { [fieldName]: value };
      const response = await apiClient.put(`/resource/Supplier/${vendorId}`, body);
      return response?.data ?? response;
    } catch (error) {
      return rejectWithValue(error.serialized || error.response?.data || error.message);
    }
  },
);

function transformVendorListResult(row) {
  const opexMappings = row.opex_mappings || [];

  const uniqueCategories = [...new Set(opexMappings.map((m) => m.category).filter(Boolean))];
  const uniqueSubCategories = [...new Set(opexMappings.map((m) => m.sub_category).filter(Boolean))];
  const uniqueCategoryTypes = [
    ...new Set(opexMappings.map((m) => m.category_type).filter(Boolean)),
  ];

  return {
    id: row.name,
    vendorName: row.vendor_name,
    center: row.center_names?.join(', ') ?? '--',
    category: uniqueCategories.length > 0 ? uniqueCategories.join(', ') : '--',
    subCategory: uniqueSubCategories.length > 0 ? uniqueSubCategories.join(', ') : '--',
    status: row.disabled ? 'Inactive' : 'Active',
    custom_status: row.custom_status ?? null,
    custom_status_color: row.custom_status_color ?? null,
    city: row.city ?? '--',
    primarySpoc: row.primary_spoc_name ?? '--',
    totalPaidAmount: row.total_paid_amount ?? null,
    contactNumber: row.primary_spoc_phone ?? '--',
    categoryType: uniqueCategoryTypes.length > 0 ? uniqueCategoryTypes.join(', ') : '--',
    lastUpdated: row.modified || row.creation || null,
  };
}

export const getVendorListThunk = createAsyncThunk(
  'vendor/getVendorList',
  async (
    {
      keyword = '',
      filters = [],
      page = 1,
      pageSize = 20,
      append = false,
      order_by = 'creation desc',
      // navbarFilter = null,
      group_by = '',
      group_order = 'asc',
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const params = {
        filters: filters.length > 0 ? JSON.stringify(filters) : undefined,
        page,
        limit_page_length: pageSize,
        keyword: keyword?.trim() || '',
        order_by,
      };

      // if (navbarFilter && Array.isArray(navbarFilter) && navbarFilter.length > 0) {
      //   params.navbar_filter = JSON.stringify({ center: navbarFilter });
      // }

      const displayGroupBy = group_by ? String(group_by).trim() : '';
      params.group = displayGroupBy ? 1 : 0;

      if (displayGroupBy) {
        const groupByFieldMap = { center: 'center', category: 'category' };
        const key = displayGroupBy.toLowerCase();
        params.group_by = groupByFieldMap[key] ?? key;
        params.group_order = group_order || 'asc';
      }

      const response = await apiClient.get('/method/devx.api.vendor.get_vendor_listview', {
        params,
      });

      const apiResponse = response?.data?.message ?? response?.data ?? {};
      const rawResults = apiResponse.results ?? [];

      const isGrouped =
        Boolean(displayGroupBy) &&
        rawResults !== null &&
        !Array.isArray(rawResults) &&
        typeof rawResults === 'object';

      let results = [];
      let groupedResults = {};

      if (isGrouped) {
        groupedResults = Object.fromEntries(
          Object.entries(rawResults).map(([k, rows]) => [
            k,
            Array.isArray(rows) ? rows.map(transformVendorListResult) : [],
          ]),
        );
      } else {
        results = (Array.isArray(rawResults) ? rawResults : []).map(transformVendorListResult);
      }

      const apiPage = apiResponse.page ?? page;
      const totalPages = apiResponse.total_pages ?? 1;
      const hasMore = isGrouped ? false : apiPage < totalPages;

      return {
        results,
        groupedResults,
        isGrouped,
        append,
        page: apiPage,
        pageSize: apiResponse.page_size ?? pageSize,
        hasMore,
        totalCount: apiResponse.total_count ?? 0,
        statusCounts: apiResponse.status_counts ?? {},
        vendorTypeCounts: apiResponse.vendor_type_count ?? {},
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const fetchVendorColumnList = createAsyncThunk(
  'vendor/fetchVendorColumnList',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: { doctype: 'Supplier' },
      });
      return response?.data?.message;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const updateVendorColumnList = createAsyncThunk(
  'vendor/updateVendorColumnList',
  async (columns, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: 'Supplier',
        columns,
      });
      return response?.data?.message;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const getVendorOpexCategoriesThunk = createAsyncThunk(
  'vendor/getVendorOpexCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/method/devx.opex.api.opex.get_vendor_opex_categories');
      return response?.data?.message?.results ?? [];
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const createVendorThunk = createAsyncThunk(
  'vendor/createVendor',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/resource/Supplier', payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const updateVendorThunk = createAsyncThunk(
  'vendor/updateVendor',
  async ({ vendorId, payload }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/resource/Supplier/${vendorId}`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const deleteVendorThunk = createAsyncThunk(
  'vendor/deleteVendor',
  async ({ vendorId }, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/resource/Supplier/${vendorId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const addVendorContactThunk = createAsyncThunk(
  'vendor/addVendorContact',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.vendor.add_vendor_contact', payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const updateVendorContactThunk = createAsyncThunk(
  'vendor/updateVendorContact',
  async ({ vendor_id, contact_id, fields }, { rejectWithValue }) => {
    try {
      const payload = {
        vendor: vendor_id,
        contact: contact_id,
        fields: {
          ...fields,
          is_primary_contact: fields.is_primary_contact ? 1 : 0,
        },
      };
      const response = await apiClient.post(
        '/method/devx.api.vendor.update_vendor_contact',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const deleteVendorContactThunk = createAsyncThunk(
  'vendor/deleteVendorContact',
  async ({ vendorId, contactId }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.vendor.delete_vendor_contact', {
        vendor: vendorId,
        contact: contactId,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchVendorBillsThunk = createAsyncThunk(
  'vendor/fetchVendorBills',
  async ({ vendorId, page = 1, limit_page_length = 20, keyword = '' }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.vendor.get_vendor_bills', {
        vendor: vendorId,
        page,
        limit_page_length,
        keyword,
      });
      const message = response?.data?.message ?? {};
      return {
        data: message?.results ?? [],
        currentPage: Number(message?.page ?? 1),
        totalPages: Number(message?.total_pages ?? 1),
        hasMore: (message?.page ?? 1) < (message?.total_pages ?? 1),
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const fetchVendorBillColumnList = createAsyncThunk(
  'vendor/fetchVendorBillColumnList',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: { doctype: 'Purchase Invoice' },
      });
      return response?.data?.message;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const updateVendorBillColumnList = createAsyncThunk(
  'vendor/updateVendorBillColumnList',
  async (columns, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: 'Purchase Invoice',
        columns,
      });
      return response?.data?.message;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const fetchVendorSurveyServicesThunk = createAsyncThunk(
  'vendor/fetchVendorSurveyServices',
  async (_, { rejectWithValue }) => {
    try {
      const payload = {
        doctype: 'Vendor Survey Services',
        keyword: '',
        filters: [],
        limit_page_length: 500,
        page: 1,
        order_by: 'idx asc',
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

      return raw
        .map((row) =>
          String(
            row?.service_name ??
              row?.service ??
              row?.title ??
              row?.survey_service ??
              row?.name ??
              '',
          ).trim(),
        )
        .filter(Boolean);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const fetchVendorRatingsThunk = createAsyncThunk(
  'vendor/fetchVendorRatings',
  async (
    { vendorId, quarter = null, year = null, page = 1, pageSize = 20, append = false },
    { rejectWithValue },
  ) => {
    if (!vendorId) {
      return rejectWithValue('Vendor id is required');
    }

    try {
      const payload = {
        vendor: vendorId,
        group: 1,
        group_by: 'center',
        page,
        page_size: pageSize,
      };

      if (quarter != null && quarter !== '' && quarter !== 'all') {
        payload.quarter = quarter;
      }
      if (year != null && year !== '' && year !== 'all') {
        payload.year = year;
      }

      const response = await apiClient.post('/method/devx.api.vendor.get_vendor_rating', payload);
      const message = response?.data?.message ?? response?.data ?? {};
      const rawResults = message.results ?? message.data ?? [];

      const apiPage = Number(message.page ?? page);
      const totalPages = Number(message.total_pages ?? 1);

      return {
        grouped: normalizeVendorRatingGroups(rawResults),
        append,
        page: apiPage,
        pageSize: Number(message.page_size ?? pageSize),
        totalPages,
        hasMore: apiPage < totalPages,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const fetchVendorRatingSummaryThunk = createAsyncThunk(
  'vendor/fetchVendorRatingSummary',
  async ({ vendorId, quarter = null, year = null }, { rejectWithValue }) => {
    if (!vendorId) {
      return rejectWithValue('Vendor id is required');
    }

    try {
      const payload = { vendor: vendorId };

      if (quarter != null && quarter !== '' && quarter !== 'all') {
        payload.quarter = quarter;
      }
      if (year != null && year !== '' && year !== 'all') {
        payload.year = year;
      }

      const response = await apiClient.post(
        '/method/devx.api.vendor.get_vendor_rating_summary',
        payload,
      );

      const message = response.data?.message ?? response.data ?? {};

      return {
        avg_csi_score:
          message.avg_csi_score ?? message.avg_rating_score ?? message.avg_score ?? null,
        pending_count: message.pending_count ?? 0,
        completed_count: message.completed_count ?? 0,
        breakdown: message.breakdown ?? [],
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const fetchVendorRatingDetailThunk = createAsyncThunk(
  'vendor/fetchVendorRatingDetail',
  async ({ surveyName }, { rejectWithValue }) => {
    if (!surveyName) {
      return rejectWithValue('Rating name is required');
    }

    try {
      // List row `name` is the parent Vendor Survey doc (Vendor Survey Rating is a child table).
      const response = await apiClient.get(`/resource/Vendor Survey/${surveyName}`);
      const doc = response.data?.data || response.data;
      return normalizeVendorRatingDetail(doc);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Failed to fetch rating detail';
      return rejectWithValue(errorMessage);
    }
  },
);

export const submitVendorRatingThunk = createAsyncThunk(
  'vendor/submitVendorRating',
  async ({ ratingName, serviceRatings, overallComment, submitBy }, { rejectWithValue }) => {
    if (!ratingName) {
      return rejectWithValue('Rating name is required');
    }

    try {
      const numericRatings = (serviceRatings || [])
        .map((item) => Number(item.rating))
        .filter((value) => Number.isFinite(value) && value >= 1 && value <= 10);

      const ratingScore =
        numericRatings.length > 0
          ? Number(
              (
                numericRatings.reduce((sum, value) => sum + value, 0) / numericRatings.length
              ).toFixed(2),
            )
          : 0;

      const payload = {
        vendor_survey_id: ratingName,
        score: ratingScore,
        comment: overallComment || '',
        submitted_by: (submitBy && submitBy.trim()) || '',
        service_rating: (serviceRatings || []).map((item) => ({
          name: item.name,
          service: item.service,
          rating: item.rating,
          comment: item.comment || '',
        })),
      };

      const response = await apiClient.post(
        '/method/devx.vendors.doctype.vendor_survey.vendor_survey.submit_vendor_rating',
        payload,
      );
      const message = response.data?.message ?? response.data;
      return message?.data || message;
    } catch (error) {
      return rejectWithValue(error.serialized || error.response?.data || error.message);
    }
  },
);

export const fetchVendorOnboardingTasks = createAsyncThunk(
  'vendor/fetchVendorOnboardingTasks',
  async (
    {
      vendor,
      search = '',
      order_by = 'creation asc',
      page = 1,
      page_size = 20,
      append = false,
      filters = {},
    },
    { rejectWithValue },
  ) => {
    try {
      const payload = {
        task_type: 'Vendor Onboarding',
        custom_ref_doctype: 'Supplier',
        custom_ref_docname: vendor,
      };
      if (search?.trim()) payload.search = search.trim();
      if (order_by) payload.order_by = order_by;

      // Always use list_with_search_filters API
      if (filters && Object.keys(filters).length > 0) {
        payload.filters = JSON.stringify(filters);
      }
      payload.page = page;
      payload.page_size = page_size;
      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.get_task_list_view',
        payload,
      );
      const msg = response?.data?.message ?? response?.data ?? {};
      const results = msg?.results || msg?.data || (Array.isArray(msg) ? msg : []);
      const safeResults = Array.isArray(results) ? results : [];
      const apiPage = Number(msg?.page ?? page) || page;
      const apiPageSize = Number(msg?.page_size ?? page_size) || page_size;
      const totalPages = Number(msg?.total_pages ?? 0) || 0;
      const totalCount = Number(msg?.total_count ?? 0) || 0;
      const hasMore =
        msg?.has_more != null
          ? Boolean(msg.has_more)
          : totalPages > 0
            ? apiPage < totalPages
            : totalCount > 0
              ? apiPage * apiPageSize < totalCount
              : safeResults.length >= apiPageSize;

      return {
        results: safeResults,
        append,
        page: apiPage,
        page_size: apiPageSize,
        total_pages: totalPages,
        total_count: totalCount,
        has_more: hasMore,
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to fetch vendor onboarding tasks',
      );
    }
  },
);

export const createVendorTask = createAsyncThunk(
  'vendor/createVendorTask',
  async ({ taskData, attachments = [] }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      Object.keys(taskData).forEach((key) => {
        if (key === 'reference_doctype' || key === 'reference_doc_name') return;
        if (taskData[key] !== null && taskData[key] !== undefined) {
          formData.append(
            key,
            Array.isArray(taskData[key]) ? JSON.stringify(taskData[key]) : taskData[key],
          );
        }
      });

      // Always send custom reference fields if missing (backend requires these for scoping).
      // Prefer explicit custom_reference_*; fallback to reference_*.
      if (!formData.has('custom_ref_doctype')) {
        const refDoctype = taskData?.custom_ref_doctype || taskData?.reference_doctype;
        if (refDoctype) formData.append('custom_ref_doctype', refDoctype);
      }
      if (!formData.has('custom_ref_docname')) {
        const refName = taskData?.custom_ref_docname || taskData?.reference_doc_name;
        if (refName) formData.append('custom_ref_docname', refName);
      }

      attachments.forEach((file) => {
        if (file.file) formData.append('attachments', file.file);
      });
      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.create_ref_doc_task',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchVendorTaskDetail = createAsyncThunk(
  'vendor/fetchVendorTaskDetail',
  async ({ task_id, task_type, subject, type, vendor }, { rejectWithValue }) => {
    const resolvedTaskId = task_id ?? subject;
    const resolvedTaskType = task_type ?? type;
    if (!resolvedTaskId || !resolvedTaskType) {
      return rejectWithValue('task_id and task_type are required');
    }
    try {
      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.get_task_detailed_view',
        { task_id: resolvedTaskId, task_type: resolvedTaskType, vendor },
      );
      if (response.data?.message === 'No Record Found') return rejectWithValue('Task not found');
      if (
        response.data?.message &&
        typeof response.data.message === 'object' &&
        !Array.isArray(response.data.message)
      ) {
        return response.data.message;
      }
      return response.data || response.data?.data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Failed to fetch task detail',
      );
    }
  },
);

export const fetchVendorTaskComments = createAsyncThunk(
  'vendor/fetchVendorTaskComments',
  async ({ taskName }, { rejectWithValue }) => {
    if (!taskName) return rejectWithValue('Task name is required');
    try {
      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.get_task_activities_filtered',
        { task: taskName },
      );
      const activities = response?.data?.message || {};
      const mappedComments = (activities.comments || []).map((comment) => ({
        ...comment,
        content: comment.comment || comment.content,
        commented_by: comment.comment_by || comment.commented_by,
      }));
      return {
        comments: mappedComments,
        history: activities.history || [],
        communications: [],
        views: [],
        calls: [],
      };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const addVendorTaskComment = createAsyncThunk(
  'vendor/addVendorTaskComment',
  async ({ taskName, content, attachments = [] }, { rejectWithValue }) => {
    const hasContent = content != null && String(content).trim().length > 0;
    const hasAttachments = attachments && attachments.length > 0;
    if (!taskName) return rejectWithValue('Task name is required');
    if (!hasContent && !hasAttachments)
      return rejectWithValue('Comment text or at least one attachment is required');
    try {
      const formData = new FormData();
      formData.append('task', taskName);
      formData.append('content', content ?? '');
      if (hasAttachments) {
        attachments.forEach((att) => {
          const file = att?.file ?? att;
          if (file instanceof File) formData.append('files[]', file);
        });
      }
      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.add_task_comment_with_files',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response?.data?.message || { message: 'Comment added successfully' };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const assignVendorTask = createAsyncThunk(
  'vendor/assignVendorTask',
  async ({ name, assign_to }, { rejectWithValue }) => {
    try {
      const assignees = Array.isArray(assign_to) ? assign_to : [assign_to].filter(Boolean);
      const assigneesList = assignees.map((a) =>
        typeof a === 'string' ? a : a.value || a.email || a.name || a,
      );
      const response = await apiClient.post('/method/frappe.desk.form.assign_to.add', {
        doctype: 'Task',
        name,
        assign_to: assigneesList,
        ignore_permissions: true,
      });
      return response?.data?.message;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const removeVendorTaskAssignments = createAsyncThunk(
  'vendor/removeVendorTaskAssignments',
  async ({ name, assignees }, { rejectWithValue }) => {
    if (!name) return rejectWithValue('Task name is required');
    try {
      const assigneesList = Array.isArray(assignees) ? assignees : [assignees].filter(Boolean);
      if (assigneesList.length === 0) return rejectWithValue('At least one assignee is required');

      const normalizedAssignees = assigneesList.map((a) =>
        typeof a === 'string' ? a : a.value || a.email || a.name || a,
      );

      await apiClient.post('/method/helpdesk.api.doc.remove_assignments', {
        doctype: 'Task',
        name,
        assignees: normalizedAssignees,
        ignore_permissions: true,
      });

      return { message: 'Assignments removed successfully' };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const updateVendorTaskField = createAsyncThunk(
  'vendor/updateVendorTaskField',
  async (
    { taskName, fieldName, value, currentAssignees: providedCurrentAssignees },
    { rejectWithValue, dispatch },
  ) => {
    if (!taskName || !fieldName) return rejectWithValue('Task name and field name are required');
    try {
      if (fieldName === 'assignees') {
        const newAssignees = Array.isArray(value)
          ? value
              .map((v) => (typeof v === 'string' ? v : v.value || v.email || v.name || v))
              .filter(Boolean)
          : value
            ? [
                typeof value === 'string'
                  ? value
                  : value.value || value.email || value.name || value,
              ].filter(Boolean)
            : [];

        const currentAssignees = Array.isArray(providedCurrentAssignees)
          ? providedCurrentAssignees
          : providedCurrentAssignees
            ? [providedCurrentAssignees].filter(Boolean)
            : [];
        const currentNormalized = currentAssignees
          .map((a) => (typeof a === 'string' ? a : a.value || a.email || a.name || a))
          .filter(Boolean);

        const toAdd = newAssignees.filter((a) => !currentNormalized.includes(a));
        const toRemove = currentNormalized.filter((a) => !newAssignees.includes(a));

        if (toAdd.length > 0) {
          await dispatch(assignVendorTask({ name: taskName, assign_to: toAdd })).unwrap();
        }
        if (toRemove.length > 0) {
          await dispatch(
            removeVendorTaskAssignments({ name: taskName, assignees: toRemove }),
          ).unwrap();
        }

        return { message: 'Assignees updated successfully' };
      }
      const payload = { task_id: taskName, [fieldName]: value };
      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.update_ref_doc_task',
        payload,
      );
      return response.data?.message || response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchVendorTaskColumnList = createAsyncThunk(
  'vendor/fetchVendorTaskColumnList',
  async ({ react_table_id }, { rejectWithValue }) => {
    try {
      const params = { doctype: 'Task' };
      if (react_table_id) params.react_table_id = react_table_id;
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', { params });
      return response?.data?.message;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const updateVendorTaskColumnList = createAsyncThunk(
  'vendor/updateVendorTaskColumnList',
  async ({ react_table_id, columns }, { rejectWithValue }) => {
    try {
      const payload = { doctype: 'Task', columns };
      if (react_table_id) payload.react_table_id = react_table_id;
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', payload);
      return response?.data?.message;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Document tab thunks — mirrors center slice pattern
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch full vendor details including vendor_documents child table.
 * Mirrors getCenterDetailsThunk — result stored in state.vendor.vendorDetails.
 */
export const fetchVendorDocumentTypesThunk = createAsyncThunk(
  'vendor/fetchVendorDocumentTypes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/resource/Document Types', {
        params: {
          fields: JSON.stringify(['name', 'has_expiry']),
          limit_page_length: 999,
          filters: JSON.stringify([['ref_doctype', '=', 'Vendor']]),
        },
      });
      return Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const uploadVendorDocumentThunk = createAsyncThunk(
  'vendor/uploadVendorDocument',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.overrides.supplier.update_vendor_documents',
        formData,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const updateVendorDocumentThunk = createAsyncThunk(
  'vendor/updateVendorDocument',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.overrides.supplier.update_vendor_documents',
        formData,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const removeVendorDocumentThunk = createAsyncThunk(
  'vendor/removeVendorDocument',
  async ({ vendor_id, document_id }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.overrides.supplier.delete_vendor_document',
        {
          vendor_id,
          document_id,
        },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

const vendorSlice = createSlice({
  name: 'vendor',
  initialState,
  reducers: {
    setCreateVendorDrawer: (state, action) => {
      state.createVendorDrawer.isOpen =
        typeof action.payload === 'boolean' ? action.payload : !state.createVendorDrawer.isOpen;
    },
    setEditVendorDrawer: (state, action) => {
      if (typeof action.payload === 'boolean') {
        state.editVendorDrawer.isOpen = action.payload;
        if (!action.payload) state.editVendorDrawer.selectedVendor = null;
      } else if (action.payload?.vendor) {
        state.editVendorDrawer.isOpen = true;
        state.editVendorDrawer.selectedVendor = action.payload.vendor;
      }
    },
    setRemoveVendorDrawer: (state, action) => {
      if (typeof action.payload === 'boolean') {
        state.removeVendorDrawer.isOpen = action.payload;
        if (!action.payload) state.removeVendorDrawer.selectedVendor = null;
      } else if (action.payload?.vendor) {
        state.removeVendorDrawer.isOpen = true;
        state.removeVendorDrawer.selectedVendor = action.payload.vendor;
      }
    },
    resetVendorList: (state) => {
      state.vendorListData.data = [];
      state.vendorListData.groupedData = {};
      state.vendorListData.isGrouped = false;
      state.vendorListData.currentPage = 1;
      state.vendorListData.hasMore = true;
      state.vendorListData.isLoadingMore = false;
      state.vendorListData.error = null;
    },
    setVendorLocalChange: (state, action) => {
      const { fieldName, value } = action.payload;
      if (value === null || value === undefined) {
        delete state.vendorDetail.localChanges[fieldName];
      } else {
        state.vendorDetail.localChanges[fieldName] = value;
      }
    },
    resetVendorDetail: (state) => {
      state.vendorDetail = {
        data: null,
        isLoading: false,
        error: null,
        status: 'idle',
        localChanges: {},
      };
    },
    clearVendorLocalChanges: (state) => {
      state.vendorDetail.localChanges = {};
    },
    clearAddVendorContactModalFeedback: (state) => {
      state.addVendorContact = { isLoading: false, message: null, error: null };
    },
    clearUpdateVendorContactModalFeedback: (state) => {
      state.updateVendorContact = { isLoading: false, message: null, error: null };
    },
    setVendorSelectedTask: (state, action) => {
      state.selectedTask.taskId = action.payload?.taskId ?? null;
      state.selectedTask.taskType = action.payload?.taskType ?? null;
    },
    clearVendorSelectedTask: (state) => {
      state.selectedTask.taskId = null;
      state.selectedTask.taskType = null;
    },
    updateVendorTaskInList: (state, action) => {
      const { taskData } = action.payload || {};
      if (!taskData?.name) return;
      const idx = state.onboardingTasks.data.findIndex((t) => t.name === taskData.name);
      if (idx !== -1) {
        state.onboardingTasks.data[idx] = { ...state.onboardingTasks.data[idx], ...taskData };
      }
    },

    setAddVendorDocumentModal: (state, action) => {
      state.addVendorDocumentModal.isOpen =
        typeof action.payload === 'boolean' ? action.payload : !state.addVendorDocumentModal.isOpen;
    },
    setEditVendorDocumentModal: (state, action) => {
      if (typeof action.payload === 'boolean') {
        state.editVendorDocumentModal.isOpen = action.payload;
        if (!action.payload) state.editVendorDocumentModal.selectedDocument = null;
      } else if (action.payload?.document) {
        state.editVendorDocumentModal.isOpen = true;
        state.editVendorDocumentModal.selectedDocument = action.payload.document;
      } else {
        state.editVendorDocumentModal.isOpen = !state.editVendorDocumentModal.isOpen;
        if (!state.editVendorDocumentModal.isOpen) {
          state.editVendorDocumentModal.selectedDocument = null;
        }
      }
    },
    setRemoveVendorDocumentModal: (state, action) => {
      if (typeof action.payload === 'boolean') {
        state.removeVendorDocumentModal.isOpen = action.payload;
        if (!action.payload) state.removeVendorDocumentModal.selectedDocument = null;
      } else if (action.payload?.document) {
        state.removeVendorDocumentModal.isOpen = true;
        state.removeVendorDocumentModal.selectedDocument = action.payload.document;
      } else {
        state.removeVendorDocumentModal.isOpen = !state.removeVendorDocumentModal.isOpen;
        if (!state.removeVendorDocumentModal.isOpen) {
          state.removeVendorDocumentModal.selectedDocument = null;
        }
      }
    },
    setSelectedVendorRating: (state, action) => {
      const payload = action.payload;
      if (payload && typeof payload === 'object') {
        state.selectedVendorRating = {
          surveyName: payload.name ?? null,
          rowData: payload,
        };
        state.vendorRatingDetail.data = payload;
        return;
      }
      state.selectedVendorRating = {
        surveyName: payload ?? null,
        rowData: null,
      };
    },
    clearSelectedVendorRating: (state) => {
      state.selectedVendorRating = {
        surveyName: null,
        rowData: null,
      };
      state.vendorRatingDetail = {
        data: null,
        isLoading: false,
        error: null,
      };
    },
  },

  extraReducers: (builder) => {
    // LIST
    builder
      .addCase(getVendorListThunk.pending, (state, action) => {
        const isAppend = Boolean(action.meta?.arg?.append);
        state.vendorListData.error = null;
        if (isAppend) state.vendorListData.isLoadingMore = true;
        else {
          state.vendorListData.isLoading = true;
          state.vendorListData.status = 'loading';
        }
      })
      .addCase(getVendorListThunk.fulfilled, (state, { payload }) => {
        state.vendorListData.isLoading = false;
        state.vendorListData.isLoadingMore = false;
        state.vendorListData.status = 'succeeded';
        const {
          results,
          groupedResults = {},
          isGrouped = false,
          append,
          page,
          pageSize,
          hasMore,
          totalCount,
          statusCounts,
          vendorTypeCounts,
        } = payload;
        if (append && !isGrouped) {
          const existing = state.vendorListData.data || [];
          const existingIds = new Set(existing.map((v) => v.id));
          const newResults = results.filter((v) => !existingIds.has(v.id));
          state.vendorListData.data = [...existing, ...newResults];
          state.vendorListData.isGrouped = false;
          state.vendorListData.groupedData = {};
        } else if (!append) {
          if (isGrouped) {
            state.vendorListData.data = [];
            state.vendorListData.groupedData = groupedResults;
            state.vendorListData.isGrouped = true;
            state.vendorListData.statusCounts = statusCounts ?? {};
            state.vendorListData.vendorTypeCounts = vendorTypeCounts ?? {};
          } else {
            state.vendorListData.data = results;
            state.vendorListData.groupedData = {};
            state.vendorListData.isGrouped = false;
            state.vendorListData.statusCounts = statusCounts ?? {};
            state.vendorListData.vendorTypeCounts = vendorTypeCounts ?? {};
          }
        }
        state.vendorListData.currentPage = page;
        state.vendorListData.pageSize = pageSize;
        state.vendorListData.hasMore = hasMore;
        state.vendorListData.totalCount = totalCount;
      })
      .addCase(getVendorListThunk.rejected, (state, action) => {
        state.vendorListData.isLoading = false;
        state.vendorListData.isLoadingMore = false;
        state.vendorListData.status = 'failed';
        state.vendorListData.error = action.payload;
      });

    // CREATE
    builder
      .addCase(createVendorThunk.pending, (state) => {
        state.createVendorDrawer.isLoading = true;
      })
      .addCase(createVendorThunk.fulfilled, (state, { payload }) => {
        state.createVendorDrawer.isLoading = false;
        state.createVendorDrawer.new_vendor = payload;
        state.createVendorDrawer.status = payload?.status;
      })
      .addCase(createVendorThunk.rejected, (state, action) => {
        state.createVendorDrawer.isLoading = false;
        state.createVendorDrawer.error = action.payload;
      });

    // DELETE
    builder
      .addCase(deleteVendorThunk.pending, (state) => {
        state.removeVendorDrawer.isLoading = true;
      })
      .addCase(deleteVendorThunk.fulfilled, (state) => {
        state.removeVendorDrawer.isLoading = false;
      })
      .addCase(deleteVendorThunk.rejected, (state, action) => {
        state.removeVendorDrawer.isLoading = false;
        state.removeVendorDrawer.error = action.payload;
      });

    // DETAIL (vendorDetail — existing)
    builder
      .addCase(getVendorDetailThunk.pending, (state) => {
        state.vendorDetail.status = 'loading';
        state.vendorDetail.isLoading = !state.vendorDetail.data;
      })
      .addCase(getVendorDetailThunk.fulfilled, (state, { payload }) => {
        state.vendorDetail.status = 'succeeded';
        state.vendorDetail.isLoading = false;
        state.vendorDetail.data = payload;
      })
      .addCase(getVendorDetailThunk.rejected, (state, action) => {
        state.vendorDetail.status = 'failed';
        state.vendorDetail.isLoading = false;
        state.vendorDetail.error = action.payload;
      });

    builder.addCase(updateVendorFieldThunk.fulfilled, (state, { payload }) => {
      const updated = payload?.data || payload;
      if (updated && state.vendorDetail.data) {
        state.vendorDetail.data = { ...state.vendorDetail.data, ...updated };
      }
    });

    // BILLS
    builder
      .addCase(fetchVendorBillsThunk.pending, (state, action) => {
        const page = action.meta.arg?.page || 1;
        if (page > 1) {
          state.vendorBillsListview.isLoadingMore = true;
        } else {
          state.vendorBillsListview.isLoading = true;
          state.vendorBillsListview.data = [];
        }
        state.vendorBillsListview.error = null;
      })
      .addCase(fetchVendorBillsThunk.fulfilled, (state, action) => {
        const { data, currentPage, totalPages } = action.payload;
        const page = action.meta.arg?.page || 1;
        state.vendorBillsListview.currentPage = currentPage;
        state.vendorBillsListview.totalPages = totalPages;
        state.vendorBillsListview.hasMore = currentPage < totalPages;

        state.vendorBillsListview.data =
          page > 1 ? [...state.vendorBillsListview.data, ...data] : data;

        state.vendorBillsListview.isLoading = false;
        state.vendorBillsListview.isLoadingMore = false;
      })
      .addCase(fetchVendorBillsThunk.rejected, (state, action) => {
        state.vendorBillsListview.isLoading = false;
        state.vendorBillsListview.isLoadingMore = false;
        state.vendorBillsListview.error = action.payload;
      });

    // CONTACTS
    builder
      .addCase(addVendorContactThunk.pending, (state) => {
        state.addVendorContact.isLoading = true;
        state.addVendorContact.error = null;
        state.addVendorContact.message = null;
      })
      .addCase(addVendorContactThunk.fulfilled, (state) => {
        state.addVendorContact.isLoading = false;
        state.addVendorContact.message = 'Contact added successfully';
      })
      .addCase(addVendorContactThunk.rejected, (state, { payload }) => {
        state.addVendorContact.isLoading = false;
        state.addVendorContact.error = payload;
      });

    builder
      .addCase(updateVendorContactThunk.pending, (state) => {
        state.updateVendorContact.isLoading = true;
        state.updateVendorContact.error = null;
        state.updateVendorContact.message = null;
      })
      .addCase(updateVendorContactThunk.fulfilled, (state) => {
        state.updateVendorContact.isLoading = false;
        state.updateVendorContact.message = 'Contact updated successfully';
      })
      .addCase(updateVendorContactThunk.rejected, (state, { payload }) => {
        state.updateVendorContact.isLoading = false;
        state.updateVendorContact.error = payload;
      });

    // OPEX CATEGORIES
    builder
      .addCase(getVendorOpexCategoriesThunk.pending, (state) => {
        state.vendorOpexCategories.isLoading = true;
        state.vendorOpexCategories.error = null;
        state.vendorOpexCategories.status = 'loading';
      })
      .addCase(getVendorOpexCategoriesThunk.fulfilled, (state, action) => {
        state.vendorOpexCategories.isLoading = false;
        state.vendorOpexCategories.data = action.payload;
        state.vendorOpexCategories.status = 'succeeded';
      })
      .addCase(getVendorOpexCategoriesThunk.rejected, (state, action) => {
        state.vendorOpexCategories.isLoading = false;
        state.vendorOpexCategories.error = action.payload;
        state.vendorOpexCategories.status = 'failed';
      });

    // ONBOARDING TASKS
    builder
      .addCase(fetchVendorOnboardingTasks.pending, (state, action) => {
        const append = Boolean(action.meta?.arg?.append);
        if (append) {
          state.onboardingTasks.isLoadingMore = true;
        } else {
          state.onboardingTasks.isLoading = true;
          state.onboardingTasks.data = [];
          state.onboardingTasks.page = 1;
          state.onboardingTasks.has_more = false;
        }
        state.onboardingTasks.error = null;
      })
      .addCase(fetchVendorOnboardingTasks.fulfilled, (state, action) => {
        state.onboardingTasks.isLoading = false;
        state.onboardingTasks.isLoadingMore = false;
        state.onboardingTasks.error = null;

        const payload = action.payload;
        const append = Boolean(payload?.append);
        const incoming = Array.isArray(payload?.results)
          ? payload.results
          : Array.isArray(payload)
            ? payload
            : [];

        state.onboardingTasks.data = append
          ? [...(state.onboardingTasks.data || []), ...incoming]
          : incoming;
        state.onboardingTasks.page = Number(payload?.page ?? 1) || 1;
        state.onboardingTasks.page_size = Number(payload?.page_size ?? 20) || 20;
        state.onboardingTasks.total_pages = Number(payload?.total_pages ?? 0) || 0;
        state.onboardingTasks.total_count = Number(payload?.total_count ?? 0) || 0;
        state.onboardingTasks.has_more = Boolean(payload?.has_more);
      })
      .addCase(fetchVendorOnboardingTasks.rejected, (state, action) => {
        state.onboardingTasks.isLoading = false;
        state.onboardingTasks.isLoadingMore = false;
        state.onboardingTasks.error = action.payload;
        // Preserve existing rows on append failures
        const wasAppend = Boolean(action.meta?.arg?.append);
        if (!wasAppend) state.onboardingTasks.data = [];
      });

    // TASK DETAIL
    builder
      .addCase(fetchVendorTaskDetail.pending, (state) => {
        state.taskDetail.isLoading = true;
        state.taskDetail.error = null;
      })
      .addCase(fetchVendorTaskDetail.fulfilled, (state, action) => {
        state.taskDetail.isLoading = false;
        state.taskDetail.data = action.payload;
        state.taskDetail.error = null;
      })
      .addCase(fetchVendorTaskDetail.rejected, (state, action) => {
        state.taskDetail.isLoading = false;
        state.taskDetail.error = action.payload;
        state.taskDetail.data = null;
      });

    // TASK COMMENTS
    builder
      .addCase(fetchVendorTaskComments.pending, (state) => {
        state.taskComments.isLoading = true;
        state.taskComments.error = null;
      })
      .addCase(fetchVendorTaskComments.fulfilled, (state, action) => {
        state.taskComments.isLoading = false;
        state.taskComments.data = action.payload;
        state.taskComments.error = null;
      })
      .addCase(fetchVendorTaskComments.rejected, (state, action) => {
        state.taskComments.isLoading = false;
        state.taskComments.error = action.payload;
        state.taskComments.data = {
          comments: [],
          history: [],
          communications: [],
          views: [],
          calls: [],
        };
      });

    // TASK COLUMN LIST
    builder
      .addCase(fetchVendorTaskColumnList.pending, (state) => {
        state.taskColumnList = null;
      })
      .addCase(fetchVendorTaskColumnList.fulfilled, (state, action) => {
        state.taskColumnList = action.payload;
      })
      .addCase(fetchVendorTaskColumnList.rejected, (state) => {
        state.taskColumnList = null;
      });

    builder.addCase(updateVendorTaskColumnList.rejected, (state) => {
      state.taskColumnList = null;
    });

    builder.addCase(updateVendorTaskField.fulfilled, (state, action) => {
      if (state.taskDetail.data && action.payload) {
        const updatedTask = action.payload?.data || action.payload;
        state.taskDetail.data = { ...state.taskDetail.data, ...updatedTask };
      }
    });

    builder
      .addCase(createVendorTask.pending, () => {})
      .addCase(createVendorTask.fulfilled, () => {})
      .addCase(createVendorTask.rejected, () => {});

    // ── NEW: vendor document types ────────────────────────────────────────
    builder
      .addCase(fetchVendorDocumentTypesThunk.pending, (state) => {
        state.documentTypes.isLoading = true;
        state.documentTypes.error = null;
      })
      .addCase(fetchVendorDocumentTypesThunk.fulfilled, (state, action) => {
        state.documentTypes.isLoading = false;
        state.documentTypes.data = action.payload || [];
        state.documentTypes.error = null;
      })
      .addCase(fetchVendorDocumentTypesThunk.rejected, (state, action) => {
        state.documentTypes.isLoading = false;
        state.documentTypes.error = action.payload;
        state.documentTypes.data = [];
      });

    // ── NEW: upload / update / remove vendor document ─────────────────────
    builder
      .addCase(uploadVendorDocumentThunk.pending, (state) => {
        state.vendorDocument.isLoading = true;
        state.vendorDocument.error = null;
      })
      .addCase(uploadVendorDocumentThunk.fulfilled, (state, action) => {
        state.vendorDocument.isLoading = false;
        state.vendorDocument.status = action.payload?.status || 'success';
      })
      .addCase(uploadVendorDocumentThunk.rejected, (state, action) => {
        state.vendorDocument.isLoading = false;
        state.vendorDocument.error = action.payload;
      });

    builder
      .addCase(updateVendorDocumentThunk.pending, (state) => {
        state.vendorDocument.isLoading = true;
        state.vendorDocument.error = null;
      })
      .addCase(updateVendorDocumentThunk.fulfilled, (state, action) => {
        state.vendorDocument.isLoading = false;
        state.vendorDocument.status = action.payload?.status || 'success';
      })
      .addCase(updateVendorDocumentThunk.rejected, (state, action) => {
        state.vendorDocument.isLoading = false;
        state.vendorDocument.error = action.payload;
      });

    builder
      .addCase(removeVendorDocumentThunk.pending, (state) => {
        state.vendorDocument.isLoading = true;
        state.vendorDocument.error = null;
      })
      .addCase(removeVendorDocumentThunk.fulfilled, (state, action) => {
        state.vendorDocument.isLoading = false;
        state.vendorDocument.status = action.payload?.status || 'success';
      })
      .addCase(removeVendorDocumentThunk.rejected, (state, action) => {
        state.vendorDocument.isLoading = false;
        state.vendorDocument.error = action.payload;
      });

    builder
      .addCase(fetchVendorSurveyServicesThunk.pending, (state) => {
        state.vendorSurveyServices.isLoading = true;
        state.vendorSurveyServices.error = null;
      })
      .addCase(fetchVendorSurveyServicesThunk.fulfilled, (state, action) => {
        state.vendorSurveyServices.isLoading = false;
        state.vendorSurveyServices.error = null;
        state.vendorSurveyServices.data = action.payload ?? [];
      })
      .addCase(fetchVendorSurveyServicesThunk.rejected, (state, action) => {
        state.vendorSurveyServices.isLoading = false;
        state.vendorSurveyServices.error = action.payload;
        state.vendorSurveyServices.data = [];
      });

    builder
      .addCase(fetchVendorRatingsThunk.pending, (state, action) => {
        const page = action.meta.arg?.page || 1;
        if (page > 1) {
          state.vendorRatings.isLoadingMore = true;
        } else {
          state.vendorRatings.isLoading = true;
          state.vendorRatings.data = [];
        }
        state.vendorRatings.error = null;
      })
      .addCase(fetchVendorRatingsThunk.fulfilled, (state, action) => {
        const { grouped, append, page, pageSize, totalPages, hasMore } = action.payload;
        const incoming = grouped ?? [];

        state.vendorRatings.currentPage = page;
        state.vendorRatings.pageSize = pageSize;
        state.vendorRatings.totalPages = totalPages;
        state.vendorRatings.hasMore = hasMore;

        state.vendorRatings.data = append
          ? mergeGroupedVendorRatings(state.vendorRatings.data, incoming)
          : incoming;

        state.vendorRatings.isLoading = false;
        state.vendorRatings.isLoadingMore = false;
        state.vendorRatings.error = null;
      })
      .addCase(fetchVendorRatingsThunk.rejected, (state, action) => {
        state.vendorRatings.isLoading = false;
        state.vendorRatings.isLoadingMore = false;
        state.vendorRatings.error = action.payload;
        if ((action.meta.arg?.page || 1) === 1) {
          state.vendorRatings.data = [];
        }
      });

    builder
      .addCase(fetchVendorRatingSummaryThunk.pending, (state) => {
        state.vendorRatingSummary.isLoading = true;
        state.vendorRatingSummary.error = null;
      })
      .addCase(fetchVendorRatingSummaryThunk.fulfilled, (state, action) => {
        state.vendorRatingSummary.isLoading = false;
        state.vendorRatingSummary.error = null;
        state.vendorRatingSummary.data = action.payload;
      })
      .addCase(fetchVendorRatingSummaryThunk.rejected, (state, action) => {
        state.vendorRatingSummary.isLoading = false;
        state.vendorRatingSummary.error = action.payload;
        state.vendorRatingSummary.data = null;
      });

    builder
      .addCase(fetchVendorRatingDetailThunk.pending, (state) => {
        state.vendorRatingDetail.isLoading = true;
        state.vendorRatingDetail.error = null;
      })
      .addCase(fetchVendorRatingDetailThunk.fulfilled, (state, action) => {
        state.vendorRatingDetail.isLoading = false;
        state.vendorRatingDetail.error = null;
        state.vendorRatingDetail.data = action.payload;
      })
      .addCase(fetchVendorRatingDetailThunk.rejected, (state, action) => {
        state.vendorRatingDetail.isLoading = false;
        state.vendorRatingDetail.error = action.payload;
        if (!state.selectedVendorRating.rowData) {
          state.vendorRatingDetail.data = null;
        }
      });
  },
});

export const {
  setCreateVendorDrawer,
  setEditVendorDrawer,
  setRemoveVendorDrawer,
  resetVendorList,
  setVendorLocalChange,
  clearVendorLocalChanges,
  resetVendorDetail,
  clearAddVendorContactModalFeedback,
  clearUpdateVendorContactModalFeedback,
  setVendorSelectedTask,
  clearVendorSelectedTask,
  updateVendorTaskInList,
  // Document modal actions
  setAddVendorDocumentModal,
  setEditVendorDocumentModal,
  setRemoveVendorDocumentModal,
  setSelectedVendorRating,
  clearSelectedVendorRating,
} = vendorSlice.actions;

export const selectVendorDetail = (state) => state.vendor.vendorDetail;
export const selectVendorLocalChanges = (state) => state.vendor.vendorDetail.localChanges;
export const selectVendorBillsListview = (state) => state.vendor.vendorBillsListview;
export const selectVendorListData = (state) => state.vendor.vendorListData;
export const selectAddVendorContactModal = (state) => state.vendor.addVendorContact;
export const selectUpdateVendorContactModal = (state) => state.vendor.updateVendorContact;
export const getVendorFieldValue = (vendor, localChanges, fieldName) => {
  if (localChanges && fieldName in localChanges) return localChanges[fieldName];
  return vendor?.[fieldName] ?? '';
};
export const selectVendorOpexCategories = (state) => state.vendor.vendorOpexCategories;
export const selectVendorOnboardingTasks = (state) => state.vendor.onboardingTasks;
export const selectVendorTaskDetail = (state) => state.vendor.taskDetail;
export const selectVendorTaskComments = (state) => state.vendor.taskComments;
export const selectVendorSelectedTask = (state) => state.vendor.selectedTask;
export const selectVendorSurveyServices = (state) => state.vendor.vendorSurveyServices;
export const selectVendorRatings = (state) => state.vendor.vendorRatings;
export const selectVendorRatingSummary = (state) => state.vendor.vendorRatingSummary;
export const selectVendorRatingDetail = (state) => state.vendor.vendorRatingDetail;
export const selectSelectedVendorRating = (state) => state.vendor.selectedVendorRating;

export default vendorSlice.reducer;
