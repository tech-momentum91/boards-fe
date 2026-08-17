import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import { scrapeAndStoreAccountData } from '@/services/scraper-service';
import { enrichWithScrapedProfile } from '@/utils/scraped-research';
import { postGetClientFloorLayoutCoordinates } from '@/api/clientFloorLayout';
import {
  resolveCenterGroupKey,
  resolveCenterGroupLabel,
} from '@/components/client-onboarding/task-view-drawer-utils';

const initialState = {
  activeTab: 'about',
  activeSidebarItem: 'basic',
  localChanges: {},
  editAddressModal: {
    isOpen: false,
    addressType: null, // 'primary' | 'billing'
  },
  editContactModal: {
    isOpen: false,
    contact: null,
  },
  addContactModal: {
    isOpen: false,
  },
  addBankModal: {
    isOpen: false,
    bank: null, // null for new, bank object for edit
  },
  onboardingTasks: {
    data: [],
    taskGroups: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    page: 1,
    page_size: 20,
    total_pages: 0,
    total_count: 0,
    total_tasks: 0,
    total_centers: 0,
    completed_tasks: 0,
    completed_percentage: 0,
    has_more: false,
  },
  engagementTasks: {
    data: [],
    taskGroups: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    page: 1,
    page_size: 20,
    total_pages: 0,
    total_count: 0,
    total_tasks: 0,
    total_centers: 0,
    completed_tasks: 0,
    completed_percentage: 0,
    has_more: false,
  },
  exitTasks: {
    data: [],
    taskGroups: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    page: 1,
    page_size: 20,
    total_pages: 0,
    total_count: 0,
    total_tasks: 0,
    total_centers: 0,
    completed_tasks: 0,
    completed_percentage: 0,
    has_more: false,
  },
  clientDetail: {
    data: null,
    isLoading: false,
    error: null,
  },
  taskDetail: {
    data: null,
    isLoading: false,
    error: null,
  },
  selectedTask: {
    taskId: null,
    taskType: null, // 'onboarding' | 'engagement' | 'exit'
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
  csiSurveys: {
    data: [],
    isLoading: false,
    error: null,
  },
  csiSurveyDetail: {
    data: null,
    isLoading: false,
    error: null,
  },
  selectedCsiSurvey: {
    surveyName: null,
  },
  csiBreakdown: {
    data: null,
    isLoading: false,
    error: null,
  },
  csiSummary: {
    data: null,
    isLoading: false,
    error: null,
  },
  taskColumnList: null,
  allocatedSpaces: {
    data: [],
    isLoading: false,
    error: null,
  },
  allocatedFloorLayouts: {
    data: [],
    isLoading: false,
    error: null,
  },
  clientFloorLayoutDetail: {
    data: null,
    isLoading: false,
    error: null,
  },
  allocateSpaceModal: {
    isOpen: false,
  },
  clientStatistics: {
    data: null,
    isLoading: false,
    error: null,
  },
};

// Fetch client details with enriched data (like scrapped content)
export const getClientDetailThunk = createAsyncThunk(
  'clientDetail/getClientDetail',
  async (clientId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/method/devx.overrides.client.get_client_details', {
        params: { client_id: clientId },
      });
      const customer = response.data?.message || response.data;
      return enrichWithScrapedProfile(customer, clientId, 'Customer');
    } catch (error) {
      // Use pre-serialized error from axios interceptor, or serialize if not from axios
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const saveClientVmsConfig = createAsyncThunk(
  'clientDetail/saveClientVmsConfig',
  async ({ clientId, payload }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/resource/Customer/${clientId}`, payload);
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Scrape and store client data (devx_ai scraper engine)
export const scrapeAndStoreClientDataThunk = createAsyncThunk(
  'clientDetail/scrapeAndStoreClientData',
  async ({ clientId }, { rejectWithValue }) => {
    try {
      return await scrapeAndStoreAccountData({
        entityId: clientId,
        entityDoctype: 'Customer',
      });
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const isCompletedTaskStatus = (status) => {
  const s = status ? String(status).toLowerCase().trim() : '';
  return s === 'completed' || s === 'closed';
};

export const shouldRefreshClientStatisticsOnStatusChange = (prevStatus, newStatus) =>
  isCompletedTaskStatus(prevStatus) !== isCompletedTaskStatus(newStatus);

const TASK_TYPES_REFRESHING_CLIENT_STATISTICS = new Set(['onboarding', 'engagement']);

// Fetch client statistics
export const getClientStatisticsThunk = createAsyncThunk(
  'clientDetail/getClientStatistics',
  async (clientId, { rejectWithValue }) => {
    if (!clientId) {
      return rejectWithValue('Client ID is required');
    }
    try {
      const response = await apiClient.post(
        '/method/devx.api.client_management.get_client_statistics',
        {
          client_id: clientId,
        },
      );
      return response.data?.message || response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/** Refetch page-level onboarding/engagement % when completion status toggles. */
export const refreshClientStatisticsIfCompletionChanged =
  (prevStatus, newStatus, taskType) => (dispatch, getState) => {
    if (!TASK_TYPES_REFRESHING_CLIENT_STATISTICS.has(taskType)) return;
    if (!shouldRefreshClientStatisticsOnStatusChange(prevStatus, newStatus)) return;
    const clientId = getState().clientDetail?.clientDetail?.data?.name;
    if (clientId) {
      dispatch(getClientStatisticsThunk(clientId));
    }
  };

// Update a single client field
export const updateClientField = createAsyncThunk(
  'clientDetail/updateClientField',
  async ({ clientId, fieldname, value }, { rejectWithValue }) => {
    if (!clientId || !fieldname) {
      return rejectWithValue('Client ID and field are required');
    }

    try {
      const payload = { [fieldname]: value };
      const response = await apiClient.put(`/resource/Customer/${clientId}`, payload);
      return response.data;
    } catch (error) {
      // Use pre-serialized error from axios interceptor, or serialize if not from axios
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Update client address
export const updateClientAddressThunk = createAsyncThunk(
  'clientDetail/updateClientAddress',
  async ({ addressName, fields }, { rejectWithValue }) => {
    if (!addressName) {
      return rejectWithValue('Address name is required');
    }

    try {
      // API expects fields as an array
      const fieldsArray = Array.isArray(fields) ? fields : [fields];

      const response = await apiClient.post('/method/devx.overrides.client.update_client_address', {
        address_name: addressName,
        fields: fieldsArray,
      });
      return response.data;
    } catch (error) {
      // Use pre-serialized error from axios interceptor, or serialize if not from axios
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Update client contact
export const updateClientContactThunk = createAsyncThunk(
  'clientDetail/updateClientContact',
  async ({ contactName, fields }, { rejectWithValue }) => {
    if (!contactName) {
      return rejectWithValue('Contact name is required');
    }

    try {
      // API expects fields as an object
      const fieldsObject =
        fields && typeof fields === 'object' && !Array.isArray(fields) ? fields : {};

      const response = await apiClient.post('/method/devx.overrides.client.update_client_contact', {
        contact_row: contactName,
        fields: fieldsObject,
      });
      return response.data;
    } catch (error) {
      // Use pre-serialized error from axios interceptor, or serialize if not from axios
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Add or update client bank details
export const addOrUpdateClientBankThunk = createAsyncThunk(
  'clientDetail/addOrUpdateClientBank',
  async ({ clientId, bankData, bankDetailsName }, { rejectWithValue }) => {
    if (!clientId) {
      return rejectWithValue('Client ID is required');
    }

    try {
      if (bankDetailsName) {
        // Update existing bank - transform bankData to match API format
        const transformBankData = (data) => {
          const { account_number, is_primary, ...rest } = data;

          return {
            ...rest,
            // Handle account_number -> bank_account_number conversion (only if bank_account_number not already present)
            ...(rest.bank_account_number === undefined &&
              account_number !== undefined && {
                bank_account_number: account_number,
              }),
            // Convert is_primary to 1 or 0
            ...(is_primary !== undefined && {
              is_primary: is_primary === true || is_primary === 1 ? 1 : 0,
            }),
          };
        };

        const fieldsArray = Array.isArray(bankData)
          ? bankData.map(transformBankData)
          : [transformBankData(bankData)];

        const response = await apiClient.post(
          '/method/devx.overrides.client.update_client_bank_details',
          {
            bank_details_name: bankDetailsName,
            fields: fieldsArray,
          },
        );
        return response.data;
      } else {
        // Add new bank using the new API endpoint
        const response = await apiClient.post(
          '/method/devx.overrides.client.add_client_bank_details',
          {
            customer: clientId,
            bank_name: bankData.bank_name,
            bank_account_number: bankData.account_number,
            account_type: bankData.account_type,
            ifsc_code: bankData.ifsc_code || '',
            micr_code: bankData.micr_code || '',
            swift_code: bankData.swift_code || '',
            is_primary: bankData.is_primary ? 1 : 0,
          },
        );
        return response.data;
      }
    } catch (error) {
      // Use pre-serialized error from axios interceptor, or serialize if not from axios
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Delete client bank details
export const deleteClientBankThunk = createAsyncThunk(
  'clientDetail/deleteClientBank',
  async ({ customer, bank_id }, { rejectWithValue }) => {
    if (!customer || !bank_id) {
      return rejectWithValue('Customer and bank_id are required');
    }

    try {
      const response = await apiClient.post(
        '/method/devx.overrides.client.delete_client_bank_detail',
        {
          customer,
          bank_id,
        },
      );
      return response.data;
    } catch (error) {
      // Use pre-serialized error from axios interceptor, or serialize if not from axios
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Add client contact
export const addClientContactThunk = createAsyncThunk(
  'clientDetail/addClientContact',
  async (
    {
      customer,
      first_name,
      last_name,
      contact_name,
      mobile_no,
      email,
      department,
      other_department,
      is_primary_contact,
    },
    { rejectWithValue },
  ) => {
    if (!customer || !first_name || !last_name) {
      return rejectWithValue('Customer, first name, and last name are required');
    }

    try {
      const computedContactName =
        contact_name || [first_name, last_name].filter(Boolean).join(' ').trim();
      const response = await apiClient.post('/method/devx.overrides.client.add_client_contact', {
        customer,
        first_name,
        last_name,
        contact_name: computedContactName,
        mobile_no: mobile_no || '',
        email: email || '',
        department: department || '',
        other_department: other_department || '',
        is_primary_contact: is_primary_contact ? 1 : 0,
      });
      return response.data;
    } catch (error) {
      // Use pre-serialized error from axios interceptor, or serialize if not from axios
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Delete client contact
export const deleteClientContactThunk = createAsyncThunk(
  'clientDetail/deleteClientContact',
  async ({ customer, contact }, { rejectWithValue }) => {
    if (!customer || !contact) {
      return rejectWithValue('Customer and contact are required');
    }

    try {
      const response = await apiClient.post('/method/devx.overrides.client.delete_client_contact', {
        customer,
        contact,
      });
      return response.data;
    } catch (error) {
      // Use pre-serialized error from axios interceptor, or serialize if not from axios
      return rejectWithValue(error.serialized || error);
    }
  },
);

/** Page size when loading center groups (`group: 1`), aligned with event tasks. */
export const CLIENT_TASK_GROUPED_PAGE_SIZE = 5;

function centerNameFromTaskList(tasks) {
  const first = Array.isArray(tasks) ? tasks[0] : null;
  if (!first) return '';
  const center = first.center;
  if (center && typeof center === 'object') {
    return String(center.center_name ?? center.centre_name ?? '').trim();
  }
  return String(first.center_name ?? '').trim();
}

function parseClientTaskGroupEntry(centerRaw, groupTasks, totals = {}) {
  const tasks = Array.isArray(groupTasks) ? groupTasks : [];
  const first = tasks[0];
  const centerKey =
    resolveCenterGroupKey(centerRaw) ||
    String(first?.custom_center ?? '').trim() ||
    resolveCenterGroupKey(first?.center);
  const centerName =
    resolveCenterGroupLabel(centerRaw) ||
    centerNameFromTaskList(tasks) ||
    (typeof centerRaw === 'string' ? centerRaw.trim() : '');

  return {
    center: centerKey,
    center_name: centerName,
    total_tasks: Number(totals.total_tasks ?? tasks.length) || 0,
    completed_tasks: Number(totals.completed_tasks ?? 0) || 0,
    pending_tasks: Number(totals.pending_tasks ?? 0) || 0,
    completed_percentage: Number(totals.completed_percentage ?? 0) || 0,
    tasks,
  };
}

function parseClientTaskGroupsFromMessage(msg) {
  const groupsRaw = msg?.groups;
  const taskGroups = [];

  if (Array.isArray(groupsRaw)) {
    groupsRaw.forEach((g) => {
      taskGroups.push(
        parseClientTaskGroupEntry(g?.center ?? g?.center_name, g?.tasks, {
          total_tasks: g?.total_tasks,
          completed_tasks: g?.completed_tasks,
          pending_tasks: g?.pending_tasks,
          completed_percentage: g?.completed_percentage,
        }),
      );
    });
  } else if (groupsRaw && typeof groupsRaw === 'object') {
    Object.entries(groupsRaw).forEach(([centerName, centerTasks]) => {
      const groupTasks = Array.isArray(centerTasks) ? centerTasks : [];
      const totalTasks = groupTasks.length;
      const completedTasks = groupTasks.filter(
        (taskRow) => String(taskRow?.status || '').toLowerCase() === 'completed',
      ).length;
      taskGroups.push(
        parseClientTaskGroupEntry(centerName, groupTasks, {
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          pending_tasks: Math.max(totalTasks - completedTasks, 0),
          completed_percentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        }),
      );
    });
  }

  return taskGroups;
}

function applyClientTasksListFulfilled(taskSlice, payload) {
  const append = Boolean(payload?.append);
  const grouped = Boolean(payload?.grouped);
  const incoming = Array.isArray(payload?.results) ? payload.results : [];
  const incomingGroups = Array.isArray(payload?.taskGroups) ? payload.taskGroups : [];

  taskSlice.data = append ? [...(taskSlice.data || []), ...incoming] : incoming;
  taskSlice.taskGroups = grouped
    ? append
      ? [...(taskSlice.taskGroups || []), ...incomingGroups]
      : incomingGroups
    : [];
  taskSlice.page = Number(payload?.page ?? 1) || 1;
  taskSlice.page_size = Number(payload?.page_size ?? 20) || 20;
  taskSlice.total_pages = Number(payload?.total_pages ?? 0) || 0;
  taskSlice.total_count = Number(payload?.total_count ?? 0) || 0;
  taskSlice.total_tasks = Number(payload?.total_tasks ?? 0) || 0;
  taskSlice.total_centers = Number(payload?.total_centers ?? 0) || 0;
  taskSlice.completed_tasks = Number(payload?.completed_tasks ?? 0) || 0;
  taskSlice.completed_percentage = Number(payload?.completed_percentage ?? 0) || 0;
  taskSlice.has_more = Boolean(payload?.has_more);
  taskSlice.error = null;
}

// Helper function to fetch client tasks (reusable logic)
const fetchClientTasksHelper = async (
  type,
  customer,
  keyword = '',
  order_by = 'creation asc',
  recurrence_period = 'all',
  page = 1,
  page_size = 20,
  filters = {},
  group = false,
  group_by = '',
  group_order = 'asc',
  prevGroupCount = 0,
) => {
  const payload = {
    task_type: type,
    custom_ref_doctype: 'Customer',
    custom_ref_docname: customer,
    page,
    page_size,
  };

  if (group) {
    payload.group = 1;
    const gb = String(group_by || 'center')
      .trim()
      .toLowerCase();
    if (gb) payload.group_by = gb;
    payload.group_order = group_order === 'desc' ? 'desc' : 'asc';
  }

  if (keyword && keyword.trim()) {
    payload.search = keyword.trim();
  }

  if (order_by) {
    payload.order_by = order_by;
  }

  if (recurrence_period && recurrence_period !== 'all') {
    payload.recurrence_period = recurrence_period;
  }

  if (filters && Object.keys(filters).length > 0) {
    payload.filters = JSON.stringify(filters);
  }

  const response = await apiClient.post(
    '/method/devx.dev_x.api.document_task.get_task_list_view',
    payload,
  );
  const msg = response?.data?.message ?? response?.data ?? {};

  const apiPage = Number(msg?.page ?? page) || page;
  const apiPageSize = Number(msg?.page_size ?? page_size) || page_size;
  const totalPages = Number(msg?.total_pages ?? 0) || 0;
  const totalCount = Number(msg?.total_count ?? 0) || 0;
  const totalTasks = Number(msg?.total_tasks ?? totalCount ?? 0) || 0;
  const completedTasks = Number(msg?.completed_tasks ?? 0) || 0;
  const completedPercentage = Number(msg?.completed_percentage ?? 0) || 0;

  if (group) {
    const taskGroups = parseClientTaskGroupsFromMessage(msg);
    const results = taskGroups.flatMap((g) => g.tasks);
    const totalCentersParsed = Number(msg?.total_centers ?? 0) || 0;
    const cumulativeCenters = prevGroupCount + taskGroups.length;
    const hasMore =
      msg?.has_more != null
        ? Boolean(msg.has_more)
        : totalPages > 0
          ? apiPage < totalPages
          : totalCentersParsed > 0
            ? cumulativeCenters < totalCentersParsed
            : taskGroups.length >= apiPageSize;

    return {
      results,
      taskGroups,
      grouped: true,
      page: apiPage,
      page_size: apiPageSize,
      total_pages: totalPages,
      total_count: totalCount,
      total_tasks: totalTasks,
      total_centers:
        totalCentersParsed ||
        (prevGroupCount > 0 ? cumulativeCenters : taskGroups.length > 0 ? taskGroups.length : 0),
      completed_tasks: completedTasks,
      completed_percentage: completedPercentage,
      has_more: hasMore,
    };
  }

  const resultsRaw = msg?.results || msg?.data || (Array.isArray(msg) ? msg : []);
  const results = Array.isArray(resultsRaw) ? resultsRaw : [];

  const hasMore =
    msg?.has_more != null
      ? Boolean(msg.has_more)
      : totalPages > 0
        ? apiPage < totalPages
        : totalTasks > 0
          ? apiPage * apiPageSize < totalTasks
          : results.length >= apiPageSize;

  return {
    results,
    taskGroups: [],
    grouped: false,
    page: apiPage,
    page_size: apiPageSize,
    total_pages: totalPages,
    total_count: totalCount,
    total_tasks: totalTasks,
    total_centers: 0,
    completed_tasks: completedTasks,
    completed_percentage: completedPercentage,
    has_more: hasMore,
  };
};

// Async thunk for fetching onboarding tasks
export const fetchOnboardingTasks = createAsyncThunk(
  'clientDetail/fetchOnboardingTasks',
  async (
    {
      customer,
      search = '',
      order_by = 'creation asc',
      page = 1,
      page_size = 20,
      append = false,
      filters = {},
      group = false,
      group_by = '',
      group_order = 'asc',
    },
    { rejectWithValue, getState },
  ) => {
    try {
      const prevGroupCount = append
        ? (getState()?.clientDetail?.onboardingTasks?.taskGroups?.length ?? 0)
        : 0;
      const res = await fetchClientTasksHelper(
        'Client Onboarding',
        customer,
        search,
        order_by,
        'all',
        page,
        page_size,
        filters,
        group,
        group_by,
        group_order,
        prevGroupCount,
      );
      return { ...res, append };
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Failed to fetch onboarding tasks';
      return rejectWithValue(errorMessage);
    }
  },
);

// Async thunk for fetching engagement tasks
export const fetchEngagementTasks = createAsyncThunk(
  'clientDetail/fetchEngagementTasks',
  async (
    {
      customer,
      keyword = '',
      order_by = 'creation desc',
      recurrence_period = 'all',
      page = 1,
      page_size = 20,
      append = false,
      filters = {},
      group = false,
      group_by = '',
      group_order = 'asc',
    },
    { rejectWithValue, getState },
  ) => {
    try {
      const prevGroupCount = append
        ? (getState()?.clientDetail?.engagementTasks?.taskGroups?.length ?? 0)
        : 0;
      const res = await fetchClientTasksHelper(
        'Client Engagement',
        customer,
        keyword,
        order_by,
        recurrence_period,
        page,
        page_size,
        filters,
        group,
        group_by,
        group_order,
        prevGroupCount,
      );
      return { ...res, append };
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Failed to fetch engagement tasks';
      return rejectWithValue(errorMessage);
    }
  },
);

// Async thunk for fetching exit tasks
export const fetchExitTasks = createAsyncThunk(
  'clientDetail/fetchExitTasks',
  async (
    {
      customer,
      search = '',
      order_by = 'creation asc',
      page = 1,
      page_size = 20,
      append = false,
      filters = {},
      group = false,
      group_by = '',
      group_order = 'asc',
    },
    { rejectWithValue, getState },
  ) => {
    try {
      const prevGroupCount = append
        ? (getState()?.clientDetail?.exitTasks?.taskGroups?.length ?? 0)
        : 0;
      const res = await fetchClientTasksHelper(
        'Client Exiting',
        customer,
        search,
        order_by,
        'all',
        page,
        page_size,
        filters,
        group,
        group_by,
        group_order,
        prevGroupCount,
      );
      return { ...res, append };
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Failed to fetch exit tasks';
      return rejectWithValue(errorMessage);
    }
  },
);

// Column config persistence for task tables
const TASK_DOCTYPE = 'Task';

export const updateTaskColumnList = createAsyncThunk(
  'clientDetail/updateTaskColumnList',
  async ({ react_table_id, columns }, thunkAPI) => {
    try {
      const payload = {
        doctype: TASK_DOCTYPE,
        columns,
      };
      if (react_table_id) {
        payload.react_table_id = react_table_id;
      }
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', payload);
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchTaskColumnList = createAsyncThunk(
  'clientDetail/fetchTaskColumnList',
  async ({ react_table_id }, thunkAPI) => {
    try {
      const params = {
        doctype: TASK_DOCTYPE,
      };
      if (react_table_id) {
        params.react_table_id = react_table_id;
      }
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params,
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

// Async thunk for creating client task
export const createClientTask = createAsyncThunk(
  'clientDetail/createClientTask',
  async ({ taskData, attachments = [] }, { rejectWithValue }) => {
    try {
      const formData = new FormData();

      // Add task fields to form data
      Object.keys(taskData).forEach((key) => {
        if (key === 'reference_doctype' || key === 'reference_doc_name') return;
        if (taskData[key] !== null && taskData[key] !== undefined) {
          if (Array.isArray(taskData[key])) {
            formData.append(key, JSON.stringify(taskData[key]));
          } else {
            formData.append(key, taskData[key]);
          }
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

      // Add attachments as custom_attachments
      attachments.forEach((file) => {
        if (file.file) {
          formData.append('attachments', file.file);
        }
      });

      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.create_ref_doc_task',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Helper function to get task type string for API
const getTaskTypeForAPI = (taskType) => {
  switch (taskType) {
    case 'onboarding':
      return 'Client Onboarding';
    case 'engagement':
      return 'Client Engagement';
    case 'exit':
      return 'Client Exiting';
    default:
      return taskType;
  }
};

// Async thunk for fetching task detail
export const fetchTaskDetail = createAsyncThunk(
  'clientDetail/fetchTaskDetail',
  async ({ task_id, task_type, subject, type }, { rejectWithValue }) => {
    const resolvedTaskId = task_id ?? subject;
    const resolvedTaskType = task_type ?? type;
    if (!resolvedTaskId || !resolvedTaskType) {
      return rejectWithValue('task_id and task_type are required');
    }

    try {
      const taskTypeForAPI = getTaskTypeForAPI(resolvedTaskType);
      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.get_task_detailed_view',
        {
          task_id: resolvedTaskId,
          task_type: taskTypeForAPI,
        },
      );

      // Handle different response formats
      if (response.data?.message === 'No Record Found') {
        return rejectWithValue('Task not found');
      }

      // API returns { message: {...task data...} } format
      if (
        response.data?.message &&
        typeof response.data.message === 'object' &&
        !Array.isArray(response.data.message)
      ) {
        return response.data.message;
      }

      // Fallback to direct response.data if message is not an object
      return response.data || response.data?.data;
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Failed to fetch task detail';
      return rejectWithValue(errorMessage);
    }
  },
);

// Async thunk for fetching task comments and activities
export const fetchTaskComments = createAsyncThunk(
  'clientDetail/fetchTaskComments',
  async ({ taskName }, { rejectWithValue }) => {
    if (!taskName) {
      return rejectWithValue('Task name is required');
    }

    try {
      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.get_task_activities_filtered',
        {
          task: taskName,
        },
      );

      const activities = response?.data?.message || {};

      // Map comment fields to match CommentItem component expectations
      const mappedComments = (activities.comments || []).map((comment) => ({
        ...comment,
        content: comment.comment || comment.content, // Map 'comment' to 'content'
        commented_by: comment.comment_by || comment.commented_by, // Map 'comment_by' to 'commented_by'
      }));

      // Return structured data with comments and history
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

// Async thunk for adding a task comment
export const addTaskComment = createAsyncThunk(
  'clientDetail/addTaskComment',
  async (
    { taskName, content, attachments = [], isVisibleToClient = false, parentCommentId = null },
    { rejectWithValue },
  ) => {
    const hasContent = content != null && String(content).trim().length > 0;
    const hasAttachments = attachments && attachments.length > 0;
    if (!taskName) {
      return rejectWithValue('Task name is required');
    }
    if (!hasContent && !hasAttachments) {
      return rejectWithValue('Comment text or at least one attachment is required');
    }

    try {
      const formData = new FormData();
      formData.append('task', taskName);
      formData.append('content', content ?? '');

      if (parentCommentId != null && String(parentCommentId).trim() !== '') {
        formData.append('parent_comment', String(parentCommentId).trim());
      }

      // Add attachments if any (CommentInput passes { file, name, size, type, id })
      if (hasAttachments) {
        attachments.forEach((att) => {
          const file = att?.file ?? att;
          if (file instanceof File) {
            formData.append('files[]', file);
          }
        });
      }

      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.add_task_comment_with_files',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      return response?.data?.message || { message: 'Comment added successfully' };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Async thunk for assigning task to users
export const assignTask = createAsyncThunk(
  'clientDetail/assignTask',
  async ({ name, assign_to }, { rejectWithValue, getState }) => {
    if (!name) {
      return rejectWithValue('Task name is required');
    }

    try {
      // Ensure assign_to is an array
      const assignees = Array.isArray(assign_to) ? assign_to : [assign_to].filter(Boolean);

      if (assignees.length === 0) {
        return rejectWithValue('At least one assignee is required');
      }

      // Normalize assignees to strings (user emails/names)
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

// Async thunk for removing task assignments
export const removeTaskAssignments = createAsyncThunk(
  'clientDetail/removeTaskAssignments',
  async ({ name, assignees }, { rejectWithValue, getState }) => {
    if (!name) {
      return rejectWithValue('Task name is required');
    }

    try {
      // Ensure assignees is an array
      const assigneesList = Array.isArray(assignees) ? assignees : [assignees].filter(Boolean);

      if (assigneesList.length === 0) {
        return rejectWithValue('At least one assignee is required');
      }

      // Normalize assignees to strings (user emails/names)
      const normalizedAssignees = assigneesList.map((a) =>
        typeof a === 'string' ? a : a.value || a.email || a.name || a,
      );

      // Use helpdesk API which works generically for any doctype
      const response = await apiClient.post('/method/helpdesk.api.doc.remove_assignments', {
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

// Async thunk for updating task field
export const updateTaskField = createAsyncThunk(
  'clientDetail/updateTaskField',
  async (
    { taskName, fieldName, value, currentAssignees: providedCurrentAssignees, taskType },
    { rejectWithValue, dispatch },
  ) => {
    if (!taskName || !fieldName) {
      return rejectWithValue('Task name and field name are required');
    }

    try {
      // Special case for assignees - use assignment APIs
      if (fieldName === 'assignees') {
        // Extract current assignees - use provided ones if available, otherwise fetch from task
        let currentAssignees = [];

        if (providedCurrentAssignees !== null && providedCurrentAssignees !== undefined) {
          // Use provided current assignees (from table row)
          currentAssignees = Array.isArray(providedCurrentAssignees)
            ? providedCurrentAssignees
            : providedCurrentAssignees
              ? [providedCurrentAssignees].filter(Boolean)
              : [];
        } else {
          // Fallback: Fetch task to get current assignees
          // Need subject and type to fetch - get from task document
          const taskDocument = await apiClient.get(`/resource/Task/${taskName}`);
          if (taskDocument.data?.data) {
            const taskData = taskDocument.data.data;
            const taskTypeToUse = taskType || taskData.type || 'onboarding';
            const taskResponse = await apiClient.get(
              '/method/devx.dev_x.api.document_task.get_task_detailed_view',
              { params: { subject: taskData.subject, type: taskTypeToUse } },
            );
            const currentTask = taskResponse?.data?.message;

            // Extract current assignees from task
            if (currentTask && currentTask.assignees && Array.isArray(currentTask.assignees)) {
              // Extract user identifiers from assignee objects
              currentAssignees = currentTask.assignees.map((a) =>
                typeof a === 'string' ? a : a.name || a.email || a.value || a,
              );
            }
          }
        }

        // Normalize new value to array of strings (user emails/names)
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

        // Normalize current assignees to strings for comparison
        const currentAssigneesNormalized = currentAssignees
          .map((a) => (typeof a === 'string' ? a : a.value || a.email || a.name || a))
          .filter(Boolean);

        // Find assignees to add and remove
        const assigneesToAdd = newAssignees.filter(
          (assignee) => !currentAssigneesNormalized.includes(assignee),
        );
        const assigneesToRemove = currentAssigneesNormalized.filter(
          (assignee) => !newAssignees.includes(assignee),
        );

        // Add new assignees
        if (assigneesToAdd.length > 0) {
          await dispatch(assignTask({ name: taskName, assign_to: assigneesToAdd }));
        }

        // Remove assignees that are no longer in the list
        if (assigneesToRemove.length > 0) {
          await dispatch(removeTaskAssignments({ name: taskName, assignees: assigneesToRemove }));
        }

        // Return success - component will handle refetching task detail
        return { message: 'Assignees updated successfully' };
      }

      // For other fields, use the new update_crm_task API that supports tags
      const payload = {
        task_id: taskName,
        [fieldName]: value,
      };
      const response = await apiClient.post(
        '/method/devx.overrides.client_task.update_crm_task',
        payload,
      );
      return response.data?.message || response.data;
    } catch (error) {
      // Use pre-serialized error from axios interceptor, or serialize if not from axios
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Async thunk for fetching CSI surveys via get_customer_csi_survey_list
export const fetchCsiSurveysThunk = createAsyncThunk(
  'clientDetail/fetchCsiSurveys',
  async (
    {
      clientName,
      grouped = true,
      keyword = null,
      quarter = null,
      year = null,
      center_name = null,
      page = 1,
      limit_page_length = 500,
      order_by = 'submission_date desc',
    } = {},
    { rejectWithValue },
  ) => {
    if (!clientName) {
      return rejectWithValue('Client name is required');
    }

    try {
      const params = new URLSearchParams();
      params.append('customer_id', clientName);
      params.append('grouped', grouped);
      if (keyword != null && keyword !== '') params.append('keyword', keyword);
      if (quarter != null && quarter !== '' && quarter !== 'all') {
        params.append('quarter', quarter);
      }
      if (year != null && year !== '' && year !== 'all') params.append('year', year);
      if (center_name != null && center_name !== '') params.append('center_name', center_name);
      params.append('page', String(page));
      params.append('limit_page_length', String(limit_page_length));
      params.append('order_by', order_by);

      const response = await apiClient.get(
        `/method/devx.dev_x.doctype.csi_survey.csi_survey.get_customer_csi_survey_list?${params.toString()}`,
      );

      // Frappe GET: payload can be in response.data.message or response.data
      const payload = response.data?.message ?? response.data ?? {};
      const rawResults =
        payload.results ?? payload.data ?? (Array.isArray(response.data) ? response.data : []);
      const results = Array.isArray(rawResults) ? rawResults : [];
      return results;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Async thunk for fetching CSI survey detail (authenticated/internal)
export const fetchCsiSurveyDetailThunk = createAsyncThunk(
  'clientDetail/fetchCsiSurveyDetail',
  async ({ surveyName }, { rejectWithValue }) => {
    if (!surveyName) {
      return rejectWithValue('Survey name is required');
    }

    try {
      const response = await apiClient.get(`/resource/CSI Survey/${surveyName}`);
      return response.data?.data || response.data;
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Failed to fetch CSI survey detail';
      return rejectWithValue(errorMessage);
    }
  },
);

// Async thunk for fetching CSI survey detail via public link (guest)
export const fetchPublicCsiSurveyThunk = createAsyncThunk(
  'clientDetail/fetchPublicCsiSurvey',
  async ({ surveyId, key }, { rejectWithValue }) => {
    if (!surveyId || !key) {
      return rejectWithValue('Survey ID and key are required');
    }

    try {
      const response = await apiClient.get(
        '/method/devx.dev_x.doctype.csi_survey.csi_survey.get_csi_survey_details',
        {
          params: {
            token: key,
            csi_id: surveyId,
          },
        },
      );

      const message = response.data?.message ?? response.data;
      const raw = message?.data || message;

      if (!raw || typeof raw !== 'object') {
        return rejectWithValue('Invalid response while fetching public CSI survey detail');
      }

      // Map backend fields to the shape expected by the CSI form component
      return raw;
    } catch (error) {
      return rejectWithValue(error.serialized || 'Error fetching CSI survey detail');
    }
  },
);

// Async thunk for submitting/updating a CSI survey (ratings + comments)
// Supports both internal (authenticated) and public (guest + key) submissions.
export const submitCsiSurveyThunk = createAsyncThunk(
  'clientDetail/submitCsiSurvey',
  async (
    { surveyName, serviceRatings, overallComment, submitBy, key, isPublic = false },
    { rejectWithValue },
  ) => {
    if (!surveyName) {
      return rejectWithValue('Survey name is required');
    }

    try {
      // Calculate overall CSI score as average of all service ratings
      const numericRatings = (serviceRatings || [])
        .map((item) => Number(item.rating))
        .filter((value) => Number.isFinite(value) && value >= 1 && value <= 10);

      const csiScore =
        numericRatings.length > 0
          ? Number(
              (
                numericRatings.reduce((sum, value) => sum + value, 0) / numericRatings.length
              ).toFixed(2),
            )
          : 0;

      const payload = {
        csi_score: csiScore,
        comment: overallComment || '',
        service_rating: (serviceRatings || []).map((item) => ({
          name: item.name,
          service: item.service,
          rating: item.rating,
          comment: item.comment || '',
        })),
      };

      if (isPublic) {
        const response = await apiClient.post(
          '/method/devx.dev_x.doctype.csi_survey.csi_survey.submit_csi_rating',
          {
            token: key,
            csi_id: surveyName,
            service_rating: (serviceRatings || []).map((item) => ({
              service: item.service,
              rating: item.rating,
              comment: item.comment || '',
            })),
            comment: overallComment || '',
            submitted_by: (submitBy && submitBy.trim()) || '',
          },
        );
        const message = response.data?.message ?? response.data;
        return message?.data || message;
      }

      const response = await apiClient.put(`/resource/CSI Survey/${surveyName}`, payload);
      return response.data?.data || response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || 'Error submitting CSI Survey');
    }
  },
);

// Async thunk for fetching CSI average breakdown
export const fetchCsiBreakdownThunk = createAsyncThunk(
  'clientDetail/fetchCsiBreakdown',
  async ({ clientName, centerName }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (clientName) {
        params.append('Client', clientName);
      }
      if (centerName) {
        params.append('Center', centerName);
      }

      const response = await apiClient.get(
        `/method/devx.dev_x.doctype.csi_survey.csi_survey.csi_average_breakdown?${params.toString()}`,
      );

      // Handle response format - Frappe methods return data in response.data.message
      const breakdownData = response.data?.message || response.data;
      return breakdownData;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Async thunk for fetching CSI summary (avg score, pending/completed counts, breakdown)
// Backend uses only Completed CSI for avg_csi_score and breakdown; respects month/year filters.
export const fetchCsiSummaryThunk = createAsyncThunk(
  'clientDetail/fetchCsiSummary',
  async ({ clientName, month = null, year = null }, { rejectWithValue }) => {
    if (!clientName) {
      return rejectWithValue('Client name is required');
    }
    try {
      const params = new URLSearchParams();
      params.append('customer_id', clientName);
      if (month != null && month !== '' && month !== 'all') params.append('month', month);
      if (year != null && year !== '' && year !== 'all') params.append('year', year);

      const response = await apiClient.get(
        `/method/devx.dev_x.doctype.csi_survey.csi_survey.get_customer_csi_summary?${params.toString()}`,
      );

      const data = response.data?.message ?? response.data ?? {};
      return data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Async thunk for fetching allocated spaces
export const fetchAllocatedSpacesThunk = createAsyncThunk(
  'clientDetail/fetchAllocatedSpaces',
  async ({ customer, filters = {} }, { rejectWithValue }) => {
    if (!customer) {
      return rejectWithValue('Customer is required');
    }

    try {
      const payload = { customer };

      // Only send filters to backend when at least one is active
      const hasFilters = Object.values(filters).some((v) => Array.isArray(v) && v.length > 0);
      if (hasFilters) {
        payload.filters = JSON.stringify(filters);
      }

      const response = await apiClient.post(
        '/method/devx.seat_inventory.doctype.assign_space.assign_space.get_customer_space_allocation_list',
        payload,
      );

      // Handle response format: { message: { customer, count, results: [...] } }
      // results is already grouped by center, each item has center_name and assigned_spaces
      const responseData = response.data?.message || response.data;
      const results = responseData?.results || [];

      // Return API data as-is without any field mapping
      return results;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchAllocatedFloorLayoutsThunk = createAsyncThunk(
  'clientDetail/fetchAllocatedFloorLayouts',
  async ({ customer }, { rejectWithValue }) => {
    if (!customer) {
      return rejectWithValue('Customer is required');
    }
    try {
      const response = await apiClient.post(
        '/method/devx.coworker.api.get_allocated_floor_layout_images',
        { customer },
      );
      const payload = response.data?.message ?? response.data ?? {};
      const results = payload?.results;
      // New API shape: `results` is an object keyed by center name → array of rows.
      // Old shape: `results` was a flat array. Flatten to a single array so all
      // existing consumers (editor lookup by center+block_floor_id) keep working,
      // while the listing page can re-group by `center_name`.
      if (Array.isArray(results)) return results;
      if (results && typeof results === 'object') {
        return Object.values(results).flatMap((rows) => (Array.isArray(rows) ? rows : []));
      }
      return [];
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchClientFloorLayoutCoordinatesThunk = createAsyncThunk(
  'clientDetail/fetchClientFloorLayoutCoordinates',
  async ({ center_id, customer_id, block_floor_id, filters }, { rejectWithValue }) => {
    if (!center_id || !customer_id || !block_floor_id) {
      return rejectWithValue('center_id, customer_id, and block_floor_id are required');
    }
    try {
      const body = { center_id, customer_id, block_floor_id };
      if (filters && typeof filters === 'object') {
        body.filters = filters;
      }
      return await postGetClientFloorLayoutCoordinates(body);
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Async thunk for creating space allocation
export const createSpaceAllocationThunk = createAsyncThunk(
  'clientDetail/createSpaceAllocation',
  async (allocationData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/resource/Assign Space', allocationData);
      return response.data?.data || response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

const clientDetailSlice = createSlice({
  name: 'clientDetail',
  initialState,
  reducers: {
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    setActiveSidebarItem: (state, action) => {
      state.activeSidebarItem = action.payload;
    },
    setLocalChange: (state, action) => {
      const { fieldName, value } = action.payload;
      if (value === null || value === undefined) {
        const { [fieldName]: _, ...rest } = state.localChanges;
        state.localChanges = rest;
      } else {
        state.localChanges[fieldName] = value;
      }
    },
    clearLocalChanges: (state) => {
      state.localChanges = {};
    },
    openEditAddressModal: (state, action) => {
      state.editAddressModal.isOpen = true;
      state.editAddressModal.addressType = action.payload; // 'primary' | 'billing'
    },
    closeEditAddressModal: (state) => {
      state.editAddressModal.isOpen = false;
      state.editAddressModal.addressType = null;
    },
    openEditContactModal: (state, action) => {
      state.editContactModal.isOpen = true;
      state.editContactModal.contact = action.payload;
    },
    closeEditContactModal: (state) => {
      state.editContactModal.isOpen = false;
      state.editContactModal.contact = null;
    },
    openAddContactModal: (state) => {
      state.addContactModal.isOpen = true;
    },
    closeAddContactModal: (state) => {
      state.addContactModal.isOpen = false;
    },
    openAddBankModal: (state, action) => {
      state.addBankModal.isOpen = true;
      state.addBankModal.bank = action.payload || null; // null for new, bank object for edit
    },
    closeAddBankModal: (state) => {
      state.addBankModal.isOpen = false;
      state.addBankModal.bank = null;
    },
    resetClientDetail: (state) => {
      return initialState;
    },
    setSelectedTask: (state, action) => {
      state.selectedTask = {
        taskId: action.payload.taskId,
        taskType: action.payload.taskType,
      };
    },
    clearSelectedTask: (state) => {
      state.selectedTask = {
        taskId: null,
        taskType: null,
      };
      state.taskDetail = {
        data: null,
        isLoading: false,
        error: null,
      };
    },
    clearTaskComments: (state) => {
      state.taskComments = {
        data: {
          comments: [],
          history: [],
          communications: [],
          views: [],
          calls: [],
        },
        isLoading: false,
        error: null,
      };
    },
    setSelectedCsiSurvey: (state, action) => {
      state.selectedCsiSurvey = {
        surveyName: action.payload,
      };
    },
    clearSelectedCsiSurvey: (state) => {
      state.selectedCsiSurvey = {
        surveyName: null,
      };
      state.csiSurveyDetail = {
        data: null,
        isLoading: false,
        error: null,
      };
    },
    openAllocateSpaceModal: (state) => {
      state.allocateSpaceModal.isOpen = true;
    },
    closeAllocateSpaceModal: (state) => {
      state.allocateSpaceModal.isOpen = false;
    },
    clearClientFloorLayoutDetail: (state) => {
      state.clientFloorLayoutDetail.data = null;
      state.clientFloorLayoutDetail.error = null;
      state.clientFloorLayoutDetail.isLoading = false;
    },
    // Update task in the respective task list after field update
    updateTaskInList: (state, action) => {
      const { taskData, taskType } = action.payload;
      if (!taskData || !taskData.name) return;

      // Determine which task list to update based on taskType
      let taskList = null;
      if (taskType === 'onboarding') {
        taskList = state.onboardingTasks;
      } else if (taskType === 'engagement') {
        taskList = state.engagementTasks;
      } else if (taskType === 'exit') {
        taskList = state.exitTasks;
      }

      if (!taskList || !Array.isArray(taskList.data)) return;

      // Find and update the task in the list
      const taskIndex = taskList.data.findIndex((task) => task.name === taskData.name);
      if (taskIndex !== -1) {
        const prevTask = taskList.data[taskIndex];
        const prevCompleted = isCompletedTaskStatus(prevTask?.status);
        const nextCompleted =
          Object.prototype.hasOwnProperty.call(taskData, 'status') && taskData?.status != null
            ? isCompletedTaskStatus(taskData.status)
            : prevCompleted;

        // Optimistically update aggregate completion counters so header badges update instantly.
        // Only adjust when we know the status changed between completed <-> not completed.
        if (prevCompleted !== nextCompleted) {
          const currentCompletedTasks = Number(taskList.completed_tasks ?? 0) || 0;
          const delta = nextCompleted ? 1 : -1;
          const newCompletedTasks = Math.max(0, currentCompletedTasks + delta);
          taskList.completed_tasks = newCompletedTasks;

          const totalTasks = Number(taskList.total_tasks ?? taskList.total_count ?? 0) || 0;
          taskList.completed_percentage =
            totalTasks > 0 ? Number(((newCompletedTasks / totalTasks) * 100).toFixed(2)) : 0;
        }

        taskList.data[taskIndex] = {
          ...taskList.data[taskIndex],
          ...taskData,
        };
      }
    },
  },
  extraReducers: (builder) => {
    // Handle getClientDetailThunk
    builder
      .addCase(getClientDetailThunk.pending, (state) => {
        state.clientDetail.isLoading = true;
        state.clientDetail.error = null;
      })
      .addCase(getClientDetailThunk.fulfilled, (state, { payload }) => {
        state.clientDetail.isLoading = false;
        state.clientDetail.error = null;
        // API returns { data: {...} } structure
        state.clientDetail.data = payload?.data || payload;
      })
      .addCase(getClientDetailThunk.rejected, (state, action) => {
        state.clientDetail.isLoading = false;
        state.clientDetail.error = action.payload;
        state.clientDetail.data = null;
      })
      .addCase(scrapeAndStoreClientDataThunk.fulfilled, (state, { payload }) => {
        const profile = payload?.data;
        if (
          state.clientDetail.data &&
          profile &&
          typeof profile === 'object' &&
          !Array.isArray(profile)
        ) {
          state.clientDetail.data.scrapped_content = profile;
        }
      })
      // Handle getClientStatisticsThunk
      .addCase(getClientStatisticsThunk.pending, (state) => {
        state.clientStatistics.isLoading = true;
        state.clientStatistics.error = null;
      })
      .addCase(getClientStatisticsThunk.fulfilled, (state, { payload }) => {
        state.clientStatistics.isLoading = false;
        state.clientStatistics.error = null;
        state.clientStatistics.data = payload;
      })
      .addCase(getClientStatisticsThunk.rejected, (state, action) => {
        state.clientStatistics.isLoading = false;
        state.clientStatistics.error = action.payload;
        state.clientStatistics.data = null;
      });

    // Handle updateClientField
    builder
      .addCase(updateClientField.pending, (state) => {
        state.clientDetail.isLoading = true;
        state.clientDetail.error = null;
      })
      .addCase(updateClientField.fulfilled, (state, { payload }) => {
        state.clientDetail.isLoading = false;
        state.clientDetail.error = null;
        // Update the client data with the response
        const updatedClient = payload?.data || payload;
        if (updatedClient && state.clientDetail.data) {
          state.clientDetail.data = {
            ...state.clientDetail.data,
            ...updatedClient,
          };
        }
      })
      .addCase(updateClientField.rejected, (state, action) => {
        state.clientDetail.isLoading = false;
        state.clientDetail.error = action.payload;
      });

    // Handle fetchOnboardingTasks
    builder
      .addCase(fetchOnboardingTasks.pending, (state, action) => {
        const append = Boolean(action.meta?.arg?.append);
        if (append) {
          state.onboardingTasks.isLoadingMore = true;
        } else {
          state.onboardingTasks.isLoading = true;
          state.onboardingTasks.data = [];
          state.onboardingTasks.taskGroups = [];
          state.onboardingTasks.page = 1;
          state.onboardingTasks.has_more = false;
        }
        state.onboardingTasks.error = null;
      })
      .addCase(fetchOnboardingTasks.fulfilled, (state, action) => {
        state.onboardingTasks.isLoading = false;
        state.onboardingTasks.isLoadingMore = false;
        applyClientTasksListFulfilled(state.onboardingTasks, {
          ...action.payload,
          append: action.payload?.append,
        });
      })
      .addCase(fetchOnboardingTasks.rejected, (state, action) => {
        state.onboardingTasks.isLoading = false;
        state.onboardingTasks.isLoadingMore = false;
        state.onboardingTasks.error = action.payload;
        const wasAppend = Boolean(action.meta?.arg?.append);
        if (!wasAppend) {
          state.onboardingTasks.data = [];
          state.onboardingTasks.taskGroups = [];
        }
      });

    // Handle fetchEngagementTasks
    builder
      .addCase(fetchEngagementTasks.pending, (state, action) => {
        const append = Boolean(action.meta?.arg?.append);
        if (append) {
          state.engagementTasks.isLoadingMore = true;
        } else {
          state.engagementTasks.isLoading = true;
          state.engagementTasks.data = [];
          state.engagementTasks.taskGroups = [];
          state.engagementTasks.page = 1;
          state.engagementTasks.has_more = false;
        }
        state.engagementTasks.error = null;
      })
      .addCase(fetchEngagementTasks.fulfilled, (state, action) => {
        state.engagementTasks.isLoading = false;
        state.engagementTasks.isLoadingMore = false;
        applyClientTasksListFulfilled(state.engagementTasks, {
          ...action.payload,
          append: action.payload?.append,
        });
      })
      .addCase(fetchEngagementTasks.rejected, (state, action) => {
        state.engagementTasks.isLoading = false;
        state.engagementTasks.isLoadingMore = false;
        state.engagementTasks.error = action.payload;
        const wasAppend = Boolean(action.meta?.arg?.append);
        if (!wasAppend) {
          state.engagementTasks.data = [];
          state.engagementTasks.taskGroups = [];
        }
      });

    // Handle fetchExitTasks
    builder
      .addCase(fetchExitTasks.pending, (state, action) => {
        const append = Boolean(action.meta?.arg?.append);
        if (append) {
          state.exitTasks.isLoadingMore = true;
        } else {
          state.exitTasks.isLoading = true;
          state.exitTasks.data = [];
          state.exitTasks.taskGroups = [];
          state.exitTasks.page = 1;
          state.exitTasks.has_more = false;
        }
        state.exitTasks.error = null;
      })
      .addCase(fetchExitTasks.fulfilled, (state, action) => {
        state.exitTasks.isLoading = false;
        state.exitTasks.isLoadingMore = false;
        applyClientTasksListFulfilled(state.exitTasks, {
          ...action.payload,
          append: action.payload?.append,
        });
      })
      .addCase(fetchExitTasks.rejected, (state, action) => {
        state.exitTasks.isLoading = false;
        state.exitTasks.isLoadingMore = false;
        state.exitTasks.error = action.payload;
        const wasAppend = Boolean(action.meta?.arg?.append);
        if (!wasAppend) {
          state.exitTasks.data = [];
          state.exitTasks.taskGroups = [];
        }
      });

    // Handle createClientTask
    builder
      .addCase(createClientTask.pending, (state) => {
        // You can add a creating state if needed
      })
      .addCase(createClientTask.fulfilled, (state, action) => {
        // Task created successfully - could refresh the task list here
      })
      .addCase(createClientTask.rejected, (state, action) => {
        // Error handled in component
      })
      .addCase(fetchTaskColumnList.pending, (state) => {
        state.taskColumnList = null;
      })
      .addCase(fetchTaskColumnList.fulfilled, (state, action) => {
        state.taskColumnList = action.payload;
      })
      .addCase(fetchTaskColumnList.rejected, (state, action) => {
        state.taskColumnList = null;
      })
      .addCase(updateTaskColumnList.fulfilled, (state, action) => {})
      .addCase(updateTaskColumnList.rejected, (state, action) => {
        state.taskColumnList = null;
      });

    // Handle fetchTaskDetail
    builder
      .addCase(fetchTaskDetail.pending, (state) => {
        state.taskDetail.isLoading = true;
        state.taskDetail.error = null;
      })
      .addCase(fetchTaskDetail.fulfilled, (state, action) => {
        state.taskDetail.isLoading = false;
        state.taskDetail.error = null;
        state.taskDetail.data = action.payload;
      })
      .addCase(fetchTaskDetail.rejected, (state, action) => {
        state.taskDetail.isLoading = false;
        state.taskDetail.error = action.payload;
        state.taskDetail.data = null;
      });

    // Handle assignTask
    builder
      .addCase(assignTask.pending, (state) => {
        // No state changes needed
      })
      .addCase(assignTask.fulfilled, (state) => {
        // Assignment successful
      })
      .addCase(assignTask.rejected, (state) => {
        // Error handled in component
      });

    // Handle removeTaskAssignments
    builder
      .addCase(removeTaskAssignments.pending, (state) => {
        // No state changes needed
      })
      .addCase(removeTaskAssignments.fulfilled, (state) => {
        // Removal successful
      })
      .addCase(removeTaskAssignments.rejected, (state) => {
        // Error handled in component
      });

    // Handle updateTaskField
    builder
      .addCase(updateTaskField.pending, (state) => {
        // Optimistic update - update local state immediately
      })
      .addCase(updateTaskField.fulfilled, (state, action) => {
        // Update task detail data with the response
        if (state.taskDetail.data && action.payload) {
          const updatedTask = action.payload?.data || action.payload;
          state.taskDetail.data = {
            ...state.taskDetail.data,
            ...updatedTask,
          };
        }
      })
      .addCase(updateTaskField.rejected, (state, action) => {
        // Error handled in component - could revert optimistic update here
      });

    // Handle fetchTaskComments
    builder
      .addCase(fetchTaskComments.pending, (state) => {
        state.taskComments.isLoading = true;
        state.taskComments.error = null;
      })
      .addCase(fetchTaskComments.fulfilled, (state, action) => {
        state.taskComments.isLoading = false;
        state.taskComments.error = null;
        state.taskComments.data = action.payload;
      })
      .addCase(fetchTaskComments.rejected, (state, action) => {
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

    // Handle addTaskComment
    builder
      .addCase(addTaskComment.pending, (state) => {
        // You can add a submitting state if needed
      })
      .addCase(addTaskComment.fulfilled, (state, action) => {
        // Comment added successfully - could refresh comments here
      })
      .addCase(addTaskComment.rejected, (state, action) => {
        // Error handled in component
      });

    // Handle fetchCsiSurveysThunk
    builder
      .addCase(fetchCsiSurveysThunk.pending, (state) => {
        state.csiSurveys.isLoading = true;
        state.csiSurveys.error = null;
      })
      .addCase(fetchCsiSurveysThunk.fulfilled, (state, action) => {
        state.csiSurveys.isLoading = false;
        state.csiSurveys.error = null;
        state.csiSurveys.data = action.payload;
      })
      .addCase(fetchCsiSurveysThunk.rejected, (state, action) => {
        state.csiSurveys.isLoading = false;
        state.csiSurveys.error = action.payload;
        state.csiSurveys.data = [];
      });

    // Handle fetchCsiSurveyDetailThunk and fetchPublicCsiSurveyThunk (share same detail state)
    builder
      .addCase(fetchCsiSurveyDetailThunk.pending, (state) => {
        state.csiSurveyDetail.isLoading = true;
        state.csiSurveyDetail.error = null;
      })
      .addCase(fetchCsiSurveyDetailThunk.fulfilled, (state, action) => {
        state.csiSurveyDetail.isLoading = false;
        state.csiSurveyDetail.error = null;
        state.csiSurveyDetail.data = action.payload;
      })
      .addCase(fetchCsiSurveyDetailThunk.rejected, (state, action) => {
        state.csiSurveyDetail.isLoading = false;
        state.csiSurveyDetail.error = action.payload;
        state.csiSurveyDetail.data = null;
      })
      .addCase(fetchPublicCsiSurveyThunk.pending, (state) => {
        state.csiSurveyDetail.isLoading = true;
        state.csiSurveyDetail.error = null;
      })
      .addCase(fetchPublicCsiSurveyThunk.fulfilled, (state, action) => {
        state.csiSurveyDetail.isLoading = false;
        state.csiSurveyDetail.error = null;
        state.csiSurveyDetail.data = action.payload;
      })
      .addCase(fetchPublicCsiSurveyThunk.rejected, (state, action) => {
        state.csiSurveyDetail.isLoading = false;
        state.csiSurveyDetail.error = action.payload;
        state.csiSurveyDetail.data = null;
      })
      .addCase(submitCsiSurveyThunk.pending, (state) => {
        state.csiSurveyDetail.isLoading = true;
        state.csiSurveyDetail.error = null;
      })
      .addCase(submitCsiSurveyThunk.fulfilled, (state, action) => {
        state.csiSurveyDetail.isLoading = false;
        state.csiSurveyDetail.error = null;
        state.csiSurveyDetail.data = action.payload;
      })
      .addCase(submitCsiSurveyThunk.rejected, (state, action) => {
        state.csiSurveyDetail.isLoading = false;
        state.csiSurveyDetail.error = action.payload;
      });

    // Handle fetchCsiBreakdownThunk
    builder
      .addCase(fetchCsiBreakdownThunk.pending, (state) => {
        state.csiBreakdown.isLoading = true;
        state.csiBreakdown.error = null;
      })
      .addCase(fetchCsiBreakdownThunk.fulfilled, (state, action) => {
        state.csiBreakdown.isLoading = false;
        state.csiBreakdown.error = null;
        state.csiBreakdown.data = action.payload;
      })
      .addCase(fetchCsiBreakdownThunk.rejected, (state, action) => {
        state.csiBreakdown.isLoading = false;
        state.csiBreakdown.error = action.payload;
        state.csiBreakdown.data = null;
      })

      // Handle fetchCsiSummaryThunk
      .addCase(fetchCsiSummaryThunk.pending, (state) => {
        state.csiSummary.isLoading = true;
        state.csiSummary.error = null;
      })
      .addCase(fetchCsiSummaryThunk.fulfilled, (state, action) => {
        state.csiSummary.isLoading = false;
        state.csiSummary.error = null;
        state.csiSummary.data = action.payload;
      })
      .addCase(fetchCsiSummaryThunk.rejected, (state, action) => {
        state.csiSummary.isLoading = false;
        state.csiSummary.error = action.payload;
        state.csiSummary.data = null;
      });

    // Handle fetchAllocatedSpacesThunk
    builder
      .addCase(fetchAllocatedSpacesThunk.pending, (state) => {
        state.allocatedSpaces.isLoading = true;
        state.allocatedSpaces.error = null;
      })
      .addCase(fetchAllocatedSpacesThunk.fulfilled, (state, action) => {
        state.allocatedSpaces.isLoading = false;
        state.allocatedSpaces.error = null;
        state.allocatedSpaces.data = action.payload;
      })
      .addCase(fetchAllocatedSpacesThunk.rejected, (state, action) => {
        state.allocatedSpaces.isLoading = false;
        state.allocatedSpaces.error = action.payload;
        state.allocatedSpaces.data = [];
      });

    builder
      .addCase(fetchAllocatedFloorLayoutsThunk.pending, (state) => {
        state.allocatedFloorLayouts.isLoading = true;
        state.allocatedFloorLayouts.error = null;
      })
      .addCase(fetchAllocatedFloorLayoutsThunk.fulfilled, (state, action) => {
        state.allocatedFloorLayouts.isLoading = false;
        state.allocatedFloorLayouts.error = null;
        state.allocatedFloorLayouts.data = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchAllocatedFloorLayoutsThunk.rejected, (state, action) => {
        state.allocatedFloorLayouts.isLoading = false;
        state.allocatedFloorLayouts.error = action.payload;
        state.allocatedFloorLayouts.data = [];
      });

    builder
      .addCase(fetchClientFloorLayoutCoordinatesThunk.pending, (state) => {
        state.clientFloorLayoutDetail.isLoading = true;
        state.clientFloorLayoutDetail.error = null;
        // Keep previous data during refresh so allocate layout page stays mounted (no zoom/layout flicker).
      })
      .addCase(fetchClientFloorLayoutCoordinatesThunk.fulfilled, (state, action) => {
        state.clientFloorLayoutDetail.isLoading = false;
        state.clientFloorLayoutDetail.error = null;
        state.clientFloorLayoutDetail.data = action.payload ?? null;
      })
      .addCase(fetchClientFloorLayoutCoordinatesThunk.rejected, (state, action) => {
        state.clientFloorLayoutDetail.isLoading = false;
        state.clientFloorLayoutDetail.error = action.payload;
        // Keep stale layout data on failed refresh so the user is not kicked to a blank state.
      });

    // Handle createSpaceAllocationThunk
    builder
      .addCase(createSpaceAllocationThunk.pending, (state) => {
        // You can add a creating state if needed
      })
      .addCase(createSpaceAllocationThunk.fulfilled, (state, action) => {
        // Allocation created successfully - could refresh the list here
        state.allocateSpaceModal.isOpen = false;
      })
      .addCase(createSpaceAllocationThunk.rejected, (state, action) => {
        // Error handled in component
      });
  },
});

export const {
  setActiveTab,
  setActiveSidebarItem,
  setLocalChange,
  clearLocalChanges,
  openEditAddressModal,
  closeEditAddressModal,
  openEditContactModal,
  closeEditContactModal,
  openAddContactModal,
  closeAddContactModal,
  openAddBankModal,
  closeAddBankModal,
  resetClientDetail,
  updateTaskInList,
  setSelectedTask,
  clearSelectedTask,
  clearTaskComments,
  setSelectedCsiSurvey,
  clearSelectedCsiSurvey,
  openAllocateSpaceModal,
  closeAllocateSpaceModal,
  clearClientFloorLayoutDetail,
} = clientDetailSlice.actions;

// Selectors
export const selectActiveTab = (state) => state.clientDetail.activeTab;
export const selectActiveSidebarItem = (state) => state.clientDetail.activeSidebarItem;
export const selectLocalChanges = (state) => state.clientDetail.localChanges;
export const selectEditAddressModal = (state) => state.clientDetail.editAddressModal;
export const selectEditContactModal = (state) => state.clientDetail.editContactModal;
export const selectAddContactModal = (state) => state.clientDetail.addContactModal;
export const selectAddBankModal = (state) => state.clientDetail.addBankModal;

// Helper function to get field value with local changes priority
export const getFieldValue = (client, localChanges, fieldName) => {
  const formatArray = (arr) => {
    if (!Array.isArray(arr)) return String(arr || '');
    return arr
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          // Special handling for KeyValue objects from scraper
          const hasKey = Object.prototype.hasOwnProperty.call(item, 'key');
          const hasValue = Object.prototype.hasOwnProperty.call(item, 'value');
          if (hasKey && hasValue) {
            return `${item.key}: ${item.value}`;
          }
          // Handling for News articles
          if (item.Title) return item.Title;
          // Fallback for other objects
          return JSON.stringify(item);
        }
        return String(item);
      })
      .join(', ');
  };

  // Priority 1: Check in local changes first (flat key as provided by fieldName)
  if (localChanges[fieldName] !== undefined && localChanges[fieldName] !== null) {
    return formatArray(localChanges[fieldName]);
  }

  // Priority 2: Check in client data (handle nested paths like 'Company_Identity.Legal_Name')
  if (client && fieldName) {
    const value = fieldName
      .split('.')
      .reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined), client);

    if (value !== undefined && value !== null && value !== '') {
      return formatArray(value);
    }

    // Priority 2.5: Check in scrapped_content if available
    if (client.scrapped_content) {
      const scrapedValue = fieldName
        .split('.')
        .reduce(
          (obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined),
          client.scrapped_content,
        );
      if (scrapedValue !== undefined && scrapedValue !== null && scrapedValue !== '') {
        return formatArray(scrapedValue);
      }
    }
  }
  return '';
};

// Selectors for client detail (memoized to prevent unnecessary rerenders)
export const selectClientDetail = createSelector(
  [
    (state) => state.clientDetail?.clientDetail?.data,
    (state) => state.clientDetail?.clientDetail?.isLoading,
    (state) => state.clientDetail?.clientDetail?.error,
  ],
  (data, isLoading, error) => ({
    data: data || null,
    status: isLoading ? 'loading' : error ? 'failed' : data ? 'succeeded' : 'idle',
    error: error || null,
  }),
);

// Selector for client statistics (memoized to prevent unnecessary rerenders)
export const selectClientStatistics = createSelector(
  [(state) => state.clientDetail?.clientStatistics],
  (clientStatistics) =>
    clientStatistics || {
      data: null,
      isLoading: false,
      error: null,
    },
);

// Computed selectors for metrics
export const selectMetrics = createSelector(
  [
    (state) => state.clientDetail?.clientDetail?.data,
    (state) => state.clientDetail?.clientStatistics?.data,
  ],
  (client, statistics) => {
    // Prioritize API statistics if available, otherwise fallback to client data
    if (statistics) {
      return {
        totalSeats:
          statistics.total_seats !== null && statistics.total_seats !== undefined
            ? statistics.total_seats
            : '--',
        openTickets:
          statistics.open_tickets !== null && statistics.open_tickets !== undefined
            ? statistics.open_tickets
            : '--',
        csiScore:
          statistics.avg_csi_score !== null && statistics.avg_csi_score !== undefined
            ? `${statistics.avg_csi_score}/10`
            : '--',
        engagement:
          statistics.engagement_percentage !== null &&
          statistics.engagement_percentage !== undefined
            ? `${statistics.engagement_percentage}%`
            : '--',
        onboarding:
          statistics.onboarding_percentage !== null &&
          statistics.onboarding_percentage !== undefined
            ? `${statistics.onboarding_percentage}%`
            : '--',
        totalCredits:
          statistics.total_credits !== null && statistics.total_credits !== undefined
            ? statistics.total_credits
            : '--',
      };
    }

    // Fallback to client data if statistics not available
    if (!client) {
      return {
        totalSeats: '--',
        openTickets: '--',
        csiScore: '--',
        engagement: '--',
        onboarding: '--',
        totalCredits: '--',
      };
    }
    return {
      totalSeats: client?.total_seats || client?.seats || '--',
      openTickets: client?.open_tickets || client?.total_open_tickets || '--',
      csiScore: client?.custom_avg_csi_score ? `${client.custom_avg_csi_score}/10` : '--',
      engagement:
        client?.engagement || client?.engagement_percentage
          ? `${client.engagement || client.engagement_percentage}%`
          : '--',
      onboarding:
        client?.onboarding || client?.onboarding_percentage
          ? `${client.onboarding || client.onboarding_percentage}%`
          : '--',
      totalCredits: client?.total_credits || client?.credits || '--',
    };
  },
);

// Selector for primary address object
export const selectPrimaryAddressObj = createSelector(
  [(state) => state.clientDetail?.clientDetail?.data],
  (client) => {
    if (!client?.custom_addresses || !Array.isArray(client.custom_addresses)) return null;
    return client.custom_addresses.find((addr) => addr.is_primary === 1) || null;
  },
);

// Selector for formatted primary address
export const selectPrimaryAddress = createSelector(
  [selectPrimaryAddressObj],
  (primaryAddressObject) => {
    if (!primaryAddressObject) return null;
    const parts = [
      primaryAddressObject.address_line_1,
      primaryAddressObject.address_line_2,
      primaryAddressObject.city,
      primaryAddressObject.state,
      primaryAddressObject.pincode,
      primaryAddressObject.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  },
);

// Selector for billing address object
export const selectBillingAddressObj = createSelector(
  [(state) => state.clientDetail?.clientDetail?.data],
  (client) => {
    if (!client?.custom_addresses || !Array.isArray(client.custom_addresses)) return null;
    return client.custom_addresses.find((addr) => addr.is_billing === 1) || null;
  },
);

// Selector for formatted billing address
export const selectBillingAddress = createSelector(
  [selectBillingAddressObj, selectPrimaryAddress],
  (billingAddressObject, primaryAddress) => {
    if (!billingAddressObject) return primaryAddress;
    const parts = [
      billingAddressObject.address_line_1,
      billingAddressObject.address_line_2,
      billingAddressObject.city,
      billingAddressObject.state,
      billingAddressObject.pincode,
      billingAddressObject.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  },
);

// Selector for contacts
export const selectContacts = createSelector(
  [(state) => state.clientDetail?.clientDetail?.data],
  (client) => {
    if (!client?.custom_contacts || !Array.isArray(client.custom_contacts)) return [];
    return client.custom_contacts.map((contact) => {
      const first = (contact.first_name || '').trim();
      const last = (contact.last_name || '').trim();
      const fallbackName = contact.contact_name || '';
      const name = [first, last].filter(Boolean).join(' ').trim() || fallbackName;

      // If we don't have first_name/last_name but have a contact_name, split it as fallback
      let firstName = first;
      let lastName = last;
      if (!firstName && fallbackName) {
        const parts = fallbackName.split(/\s+/);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
      }

      return {
        name,
        first_name: firstName,
        last_name: lastName,
        email: contact.email || '',
        phone: contact.mobile_no || '',
        phone_country: '+91', // Default, can be extended if API provides
        is_spoc: contact.is_primary_contact === 1,
        department: contact.department || '',
        originalContact: contact, // Store original for edit/delete
      };
    });
  },
);

// Selector for year of establishment
export const selectYearOfEstablishment = createSelector(
  [(state) => state.clientDetail?.clientDetail?.data],
  (client) => client?.custom_year_of_establishment || null,
);

// Selector for bank details
export const selectBankDetails = createSelector(
  [(state) => state.clientDetail?.clientDetail?.data],
  (client) => {
    if (!client?.custom_bank_details || !Array.isArray(client.custom_bank_details)) return [];
    return client.custom_bank_details.map((bank) => ({
      name: bank.name,
      bank_name: bank.bank_name || '',
      bank_account_number: bank.bank_account_number || '',
      account_type: bank.account_type || '',
      ifsc_code: bank.ifsc_code || '',
      micr_code: bank.micr_code || '',
      swift_code: bank.swift_code || '',
      is_primary: bank.is_primary === 1 || bank.is_primary === true,
      originalBank: bank,
    }));
  },
);

// Selectors for task detail
export const selectTaskDetail = (state) => state.clientDetail.taskDetail;
export const selectSelectedTask = (state) => state.clientDetail.selectedTask;
export const selectTaskComments = (state) => state.clientDetail.taskComments;

// Selectors for CSI surveys
export const selectCsiSurveys = (state) => state.clientDetail.csiSurveys;
export const selectCsiSurveyDetail = (state) => state.clientDetail.csiSurveyDetail;
export const selectCsiBreakdown = (state) => state.clientDetail.csiBreakdown;
export const selectCsiSummary = (state) => state.clientDetail.csiSummary;
export const selectSelectedCsiSurvey = (state) => state.clientDetail.selectedCsiSurvey;

// Selectors for allocated spaces
export const selectAllocatedSpaces = (state) => state.clientDetail.allocatedSpaces;
export const selectAllocatedFloorLayouts = (state) => state.clientDetail.allocatedFloorLayouts;
export const selectClientFloorLayoutDetail = (state) => state.clientDetail.clientFloorLayoutDetail;
export const selectAllocateSpaceModal = (state) => state.clientDetail.allocateSpaceModal;

// Helper function to get the raw (unformatted) field value
export const getRawFieldValue = (client, localChanges, fieldName) => {
  // Priority 1: Check in local changes first
  if (localChanges[fieldName] !== undefined && localChanges[fieldName] !== null) {
    return localChanges[fieldName];
  }

  // Priority 2: Check in client data
  if (client && fieldName) {
    const value = fieldName
      .split('.')
      .reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined), client);

    if (value !== undefined && value !== null && value !== '') {
      return value;
    }

    // Priority 2.5: Check in scrapped_content if available
    if (client.scrapped_content) {
      const scrapedValue = fieldName
        .split('.')
        .reduce(
          (obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined),
          client.scrapped_content,
        );
      if (scrapedValue !== undefined && scrapedValue !== null && scrapedValue !== '') {
        return scrapedValue;
      }
    }
  }
  return null;
};

export default clientDetailSlice.reducer;
