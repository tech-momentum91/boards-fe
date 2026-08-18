import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import { parseTags } from '@/utils/task-utils';

/**
 * List view sometimes omits `tags` (null/undefined) after unrelated row updates.
 * Preserve prior tags per row when the new payload has no tag field so inline edits
 * don't blank the Tags column. Empty array from API is treated as intentional clear.
 */
function mergePartnerMasterListPreserveTags(prevData, nextData) {
  if (!nextData || !prevData) return nextData;
  const prevResults = prevData.results;
  const nextResults = nextData.results;
  if (!Array.isArray(prevResults) || !Array.isArray(nextResults)) return nextData;

  const prevByKey = new Map();
  prevResults.forEach((row) => {
    const k = row?.name || row?.task_id || row?.id;
    if (k != null && k !== '') prevByKey.set(String(k), row);
  });

  const mergedResults = nextResults.map((row) => {
    const k = row?.name || row?.task_id || row?.id;
    if (k == null || k === '') return row;
    const oldRow = prevByKey.get(String(k));
    if (!oldRow) return row;

    const newTags = row.tags;
    if (newTags !== undefined && newTags !== null) return row;
    if (oldRow.tags === undefined || oldRow.tags === null) return row;
    if (parseTags(oldRow.tags).length === 0) return row;

    return { ...row, tags: oldRow.tags };
  });

  return { ...nextData, results: mergedResults };
}

/**
 * Same tags-preservation logic for Center Master list.
 * Backend list view may omit `tags` after unrelated edits.
 */
function mergeCenterMasterListPreserveTags(prevData, nextData) {
  if (!nextData || !prevData) return nextData;
  const prevResults = prevData.results;
  const nextResults = nextData.results;
  if (!Array.isArray(prevResults) || !Array.isArray(nextResults)) return nextData;

  const prevByKey = new Map();
  prevResults.forEach((row) => {
    const k = row?.name || row?.task_id || row?.id;
    if (k != null && k !== '') prevByKey.set(String(k), row);
  });

  const mergedResults = nextResults.map((row) => {
    const k = row?.name || row?.task_id || row?.id;
    if (k == null || k === '') return row;
    const oldRow = prevByKey.get(String(k));
    if (!oldRow) return row;

    const newTags = row.tags;
    if (newTags !== undefined && newTags !== null) return row;
    if (oldRow.tags === undefined || oldRow.tags === null) return row;
    if (parseTags(oldRow.tags).length === 0) return row;

    return { ...row, tags: oldRow.tags };
  });

  return { ...nextData, results: mergedResults };
}

const TAG_DOCNAME_FETCH_LIMIT = 100;

async function fetchScopedTaskDocNamesForTags({
  doctype,
  taskType,
  customRefDoctype,
  customRefDocname,
}) {
  if (doctype === 'Task Master') {
    if (!taskType) return [];

    const response = await apiClient.post(
      '/method/devx.api.task_master.get_task_master_list_view',
      {
        task_type: taskType,
        limit_page_length: TAG_DOCNAME_FETCH_LIMIT,
      },
    );

    const message = response?.data?.message ?? response?.data ?? {};
    if (message?.status_code === 404) return [];

    const results = message?.results ?? message?.data ?? [];
    return (Array.isArray(results) ? results : []).map((row) => row?.name).filter(Boolean);
  }

  if (doctype === 'Task') {
    if (!taskType) return [];

    const payload = {
      task_type: taskType,
      page: 1,
      page_length: TAG_DOCNAME_FETCH_LIMIT,
      page_size: TAG_DOCNAME_FETCH_LIMIT,
    };
    if (customRefDoctype) payload.custom_ref_doctype = customRefDoctype;
    if (customRefDocname) payload.custom_ref_docname = customRefDocname;

    const response = await apiClient.post(
      '/method/devx.dev_x.api.document_task.get_task_list_view',
      payload,
    );

    const message = response?.data?.message ?? response?.data ?? {};
    const results = message?.results ?? message?.data ?? [];
    return (Array.isArray(results) ? results : []).map((row) => row?.name).filter(Boolean);
  }

  return [];
}

function uniqueTagsFromGetTagsResponse(tagMap) {
  const unique = new Set();
  if (!tagMap || typeof tagMap !== 'object') return [];

  Object.values(tagMap).forEach((tags) => {
    if (!Array.isArray(tags)) return;
    tags.forEach((tag) => {
      const normalized = String(tag || '').trim();
      if (normalized) unique.add(normalized);
    });
  });

  return [...unique].sort((a, b) => a.localeCompare(b));
}

const initialState = {
  clientOnboarding: {
    getList: {
      data: [],
      isLoading: false,
      error: null,
      status: null,
    },
    createTask: {
      isLoading: false,
      error: null,
      status: null,
    },
    getTaskDetail: {
      data: null,
      isLoading: false,
      error: null,
      status: null,
    },

    columnPreferences: {
      data: [],
      isLoading: false,
      error: null,
    },
  },
  clientExit: {
    getList: {
      data: [],
      isLoading: false,
      error: null,
      status: null,
    },
    createTask: {
      isLoading: false,
      error: null,
      status: null,
    },
    getTaskDetail: {
      data: null,
      isLoading: false,
      error: null,
      status: null,
    },
    columnPreferences: {
      data: [],
      isLoading: false,
      error: null,
    },
  },
  clientEngagement: {
    getList: {
      data: [],
      isLoading: false,
      error: null,
      status: null,
    },
    createTask: {
      isLoading: false,
      error: null,
      status: null,
    },
    getTaskDetail: {
      data: null,
      isLoading: false,
      error: null,
      status: null,
    },
    columnPreferences: {
      data: [],
      isLoading: false,
      error: null,
    },
  },

  partnerMaster: {
    getList: {
      data: [],
      isLoading: false,
      error: null,
      status: null,
    },
    createTask: {
      isLoading: false,
      error: null,
      status: null,
    },
    getTaskDetail: {
      data: null,
      isLoading: false,
      error: null,
      status: null,
    },
    columnPreferences: {
      data: [],
      isLoading: false,
      error: null,
    },
  },

  centerMaster: {
    getList: {
      data: [],
      isLoading: false,
      error: null,
      status: null,
    },
    createTask: {
      isLoading: false,
      error: null,
      status: null,
    },
    getTaskDetail: {
      data: null,
      isLoading: false,
      error: null,
      status: null,
    },
    columnPreferences: {
      data: [],
      isLoading: false,
      error: null,
    },
  },

  crmTaskMaster: {
    columnPreferences: {
      data: [],
      isLoading: false,
      error: null,
    },
    taskDetail: {
      data: null,
      isLoading: false,
      error: null,
    },
  },

  crmAccounts: {
    columnPreferences: {
      data: [],
      isLoading: false,
      error: null,
    },
  },

  crmContacts: {
    columnPreferences: {
      data: [],
      isLoading: false,
      error: null,
    },
  },

  crmLeads: {
    columnPreferences: {
      data: [],
      isLoading: false,
      error: null,
    },
  },

  aclTask: {
    columnPreferences: {
      data: [],
      isLoading: false,
      error: null,
    },
  },

  // CRM Task column preferences — separate per entity (Contact, Account, Lead)
  crmContactTaskColumnPrefs: {
    data: [],
    isLoading: false,
    error: null,
  },
  crmAccountTaskColumnPrefs: {
    data: [],
    isLoading: false,
    error: null,
  },
  crmLeadTaskColumnPrefs: {
    data: [],
    isLoading: false,
    error: null,
  },

  clientTaskTags: {
    data: [],
    isLoading: false,
  },

  rolesWithDescription: {
    data: [],
    isLoading: false,
    status: null,
    error: null,
  },
  vendorOnboarding: {
    getList: { data: [], isLoading: false, error: null, status: null },
    createTask: { isLoading: false, error: null, status: null },
    getTaskDetail: { data: null, isLoading: false, error: null, status: null },
    columnPreferences: { data: [], isLoading: false, error: null },
  },
};

export const createClientOnboardingTask = createAsyncThunk(
  'setting/createClientOnboardingTask',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.task_master.create_task_master',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.serialized ?? error?.response?.data ?? error?.message);
    }
  },
);

export const updateClientOnboardingTask = createAsyncThunk(
  'setting/updateClientOnboardingTask',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.task_master.update_task_master',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to update task',
      );
    }
  },
);

export const getClientOnboardingTaskList = createAsyncThunk(
  'setting/getClientOnboardingTaskList',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.task_master.get_task_master_list_view',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.serialized ?? error?.response?.data ?? error?.message);
    }
  },
);

export const getClientExitTaskList = createAsyncThunk(
  'setting/getClientExitTaskList',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.task_master.get_task_master_list_view',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.serialized ?? error?.response?.data ?? error?.message);
    }
  },
);

export const getClientEngagementTaskList = createAsyncThunk(
  'setting/getClientEngagementTaskList',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.task_master.get_task_master_list_view',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.serialized ?? error?.response?.data ?? error?.message);
    }
  },
);

export const createPartnerMasterTask = createAsyncThunk(
  'setting/createPartnerMasterTask',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.task_master.create_task_master',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to create task',
      );
    }
  },
);

export const createCenterMasterTask = createAsyncThunk(
  'setting/createCenterMasterTask',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.task_master.create_task_master',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to create task',
      );
    }
  },
);

export const updatePartnerMasterTask = createAsyncThunk(
  'setting/updatePartnerMasterTask',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.task_master.update_task_master',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to update task',
      );
    }
  },
);

export const updateCenterMasterTask = createAsyncThunk(
  'setting/updateCenterMasterTask',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.task_master.update_task_master',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to update task',
      );
    }
  },
);

export const getPartnerMasterTaskList = createAsyncThunk(
  'setting/getPartnerMasterTaskList',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/method/devx.api.task_master.get_task_master_list_view',
        {
          params: payload,
        },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to load tasks',
      );
    }
  },
);

export const getCenterMasterTaskList = createAsyncThunk(
  'setting/getCenterMasterTaskList',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/method/devx.api.task_master.get_task_master_list_view',
        {
          params: payload,
        },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to load tasks',
      );
    }
  },
);

export const getParticularTaskDetail = createAsyncThunk(
  'setting/getParticularTaskDetail',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.task_master.get_task_master_detailed_view',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.serialized ?? error?.response?.data ?? error?.message);
    }
  },
);

export const getClientOnboardingColumnPreferences = createAsyncThunk(
  'setting/getClientOnboardingColumnPreferences',
  async ({ react_table_id } = {}, { rejectWithValue }) => {
    try {
      const params = {
        doctype: 'Task Master',
      };
      if (react_table_id) {
        params.react_table_id = react_table_id;
      }
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.serialized ?? error?.response?.data ?? error?.message);
    }
  },
);

export const saveClientOnboardingColumnPreferences = createAsyncThunk(
  'setting/saveClientOnboardingColumnPreferences',
  async ({ columns, react_table_id }, { rejectWithValue }) => {
    try {
      const payload = {
        doctype: 'Task Master',
        columns,
      };
      if (react_table_id) {
        payload.react_table_id = react_table_id;
      }

      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', payload);
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception || error.message;

      return rejectWithValue(errorMessage);
    }
  },
);

export const getCrmTaskMasterColumnPreferences = createAsyncThunk(
  'setting/getCrmTaskMasterColumnPreferences',
  async ({ react_table_id } = {}, { rejectWithValue }) => {
    try {
      const params = { doctype: 'Lead CRM Task Master' };
      if (react_table_id) {
        params.react_table_id = react_table_id;
      }
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data ?? error);
    }
  },
);

export const saveCrmTaskMasterColumnPreferences = createAsyncThunk(
  'setting/saveCrmTaskMasterColumnPreferences',
  async ({ columns, react_table_id }, { rejectWithValue }) => {
    try {
      const payload = {
        doctype: 'Lead CRM Task Master',
        columns,
      };
      if (react_table_id) {
        payload.react_table_id = react_table_id;
      }
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', payload);
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception) ||
        error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

const ACL_TASK_DOCTYPE = 'ACL Task';

export const getAclTaskColumnPreferences = createAsyncThunk(
  'setting/getAclTaskColumnPreferences',
  async ({ react_table_id } = {}, { rejectWithValue }) => {
    try {
      const params = { doctype: ACL_TASK_DOCTYPE };
      if (react_table_id) {
        params.react_table_id = react_table_id;
      }
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data ?? error);
    }
  },
);

export const saveAclTaskColumnPreferences = createAsyncThunk(
  'setting/saveAclTaskColumnPreferences',
  async ({ columns, react_table_id }, { rejectWithValue }) => {
    try {
      const payload = { doctype: ACL_TASK_DOCTYPE, columns };
      if (react_table_id) {
        payload.react_table_id = react_table_id;
      }
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', payload);
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception) ||
        error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

// ── CRM Task column preferences (separate per entity) ─────────────────────────
const CRM_CONTACT_TASKS_TABLE_ID = 'crm-contact-tasks';
const CRM_ACCOUNT_TASKS_TABLE_ID = 'crm-account-tasks';
const CRM_LEAD_TASKS_TABLE_ID = 'crm-lead-tasks';

const CRM_CP_ACCOUNT_TASKS_TABLE_ID = 'crm-cp-account-tasks';
const CRM_CP_CONTACT_TASKS_TABLE_ID = 'crm-cp-contact-tasks';

export const getCrmContactTaskColumnPreferences = createAsyncThunk(
  'setting/getCrmContactTaskColumnPreferences',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: { doctype: ACL_TASK_DOCTYPE, react_table_id: CRM_CONTACT_TASKS_TABLE_ID },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data ?? error);
    }
  },
);

export const getCrmCpAccountTaskColumnPreferences = createAsyncThunk(
  'setting/getCrmCpAccountTaskColumnPreferences',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: { doctype: ACL_TASK_DOCTYPE, react_table_id: CRM_CP_ACCOUNT_TASKS_TABLE_ID },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data ?? error);
    }
  },
);

export const getCrmCpContactTaskColumnPreferences = createAsyncThunk(
  'setting/getCrmCpContactTaskColumnPreferences',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: { doctype: ACL_TASK_DOCTYPE, react_table_id: CRM_CP_CONTACT_TASKS_TABLE_ID },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data ?? error);
    }
  },
);

export const saveCrmContactTaskColumnPreferences = createAsyncThunk(
  'setting/saveCrmContactTaskColumnPreferences',
  async ({ columns }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: ACL_TASK_DOCTYPE,
        react_table_id: CRM_CONTACT_TASKS_TABLE_ID,
        columns,
      });
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception) ||
        error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

export const getCrmAccountTaskColumnPreferences = createAsyncThunk(
  'setting/getCrmAccountTaskColumnPreferences',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: { doctype: ACL_TASK_DOCTYPE, react_table_id: CRM_ACCOUNT_TASKS_TABLE_ID },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data ?? error);
    }
  },
);

export const saveCrmCpAccountTaskColumnPreferences = createAsyncThunk(
  'setting/saveCrmCpAccountTaskColumnPreferences',
  async ({ columns }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: ACL_TASK_DOCTYPE,
        react_table_id: CRM_CP_ACCOUNT_TASKS_TABLE_ID,
        columns,
      });
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception) ||
        error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

export const saveCrmCpContactTaskColumnPreferences = createAsyncThunk(
  'setting/saveCrmCpContactTaskColumnPreferences',
  async ({ columns }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: ACL_TASK_DOCTYPE,
        react_table_id: CRM_CP_CONTACT_TASKS_TABLE_ID,
        columns,
      });
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception) ||
        error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

export const saveCrmAccountTaskColumnPreferences = createAsyncThunk(
  'setting/saveCrmAccountTaskColumnPreferences',
  async ({ columns }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: ACL_TASK_DOCTYPE,
        react_table_id: CRM_ACCOUNT_TASKS_TABLE_ID,
        columns,
      });
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception) ||
        error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

export const getCrmLeadTaskColumnPreferences = createAsyncThunk(
  'setting/getCrmLeadTaskColumnPreferences',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: { doctype: ACL_TASK_DOCTYPE, react_table_id: CRM_LEAD_TASKS_TABLE_ID },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data ?? error);
    }
  },
);

export const saveCrmLeadTaskColumnPreferences = createAsyncThunk(
  'setting/saveCrmLeadTaskColumnPreferences',
  async ({ columns }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: ACL_TASK_DOCTYPE,
        react_table_id: CRM_LEAD_TASKS_TABLE_ID,
        columns,
      });
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception) ||
        error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

// ── ACL Task List API (Account / Contact / Lead) ─────────────────────────────────
const ACL_TASK_LIST_API = '/method/devx.devx_crm.api.acl_task.get_acl_task_list';

export const fetchAclTasks = createAsyncThunk(
  'setting/fetchAclTasks',
  async (
    {
      type,
      entityId,
      keyword = '',
      page = 1,
      pageSize = 20,
      orderBy = 'creation',
      orderDirection = 'desc',
      filters,
      groupBy,
      groupOrder,
    },
    { rejectWithValue },
  ) => {
    try {
      const params = {
        type,
        entity_id: entityId,
        keyword: keyword || '',
        page,
        page_size: pageSize,
        order_by: orderBy,
        order_dir: orderDirection,
      };
      if (filters && typeof filters === 'object' && Object.keys(filters).length > 0) {
        params.filters = JSON.stringify(filters);
      }
      if (groupBy) params.group_by = groupBy;
      if (groupOrder) params.group_order = groupOrder;

      const response = await apiClient.get(ACL_TASK_LIST_API, { params });
      const data = response?.data?.message ?? response?.data;
      return data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception) ||
        error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

// ── ACL Task Detail (GET / UPDATE / Delete Attachment) ─────────────────────────
const ACL_TASK_DETAIL_API = '/method/devx.devx_crm.api.acl_task.get_acl_task_detail';
const ACL_TASK_UPDATE_API = '/method/devx.devx_crm.api.acl_task.update_acl_task';
const DELETE_FILE_BY_URL_API = '/method/devx.api.core.delete_file_by_url';
const ACL_TASK_ACTIVITIES_API =
  '/method/devx.devx_crm.doctype.acl_task_activity.acl_task_activity.get_acl_task_activities';
const ADD_ACL_TASK_COMMENT_API =
  '/method/devx.devx_crm.doctype.acl_task_comment.acl_task_comment.add_acl_task_comment_with_files';

export const fetchAclTaskDetail = createAsyncThunk(
  'setting/fetchAclTaskDetail',
  async (taskId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(ACL_TASK_DETAIL_API, {
        params: { name: taskId },
      });
      return response?.data?.message ?? response?.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception) ||
        error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

export const updateAclTask = createAsyncThunk(
  'setting/updateAclTask',
  async ({ taskId, doc }, { rejectWithValue }) => {
    const payload = {
      name: taskId,
      doc: typeof doc === 'string' ? doc : JSON.stringify(doc),
    };
    const doRequest = () => apiClient.post(ACL_TASK_UPDATE_API, payload);
    try {
      const response = await doRequest();
      return response?.data?.message ?? response?.data;
    } catch (error) {
      if (error.response?.status === 500) {
        await new Promise((r) => setTimeout(r, 400));
        try {
          const retryResponse = await doRequest();
          return retryResponse?.data?.message ?? retryResponse?.data;
        } catch (retryError) {
          // fall through to reject with retry error
          const errorMessage =
            retryError.response?.data?.message ||
            retryError.response?.data?.exc ||
            (typeof retryError.response?.data === 'string'
              ? retryError.response.data
              : retryError.response?.data?.exception) ||
            retryError.message;
          return rejectWithValue(errorMessage);
        }
      }
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception) ||
        error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

export const deleteAclTaskAttachment = createAsyncThunk(
  'setting/deleteAclTaskAttachment',
  async (fileUrl, { rejectWithValue }) => {
    if (!fileUrl || typeof fileUrl !== 'string') {
      return rejectWithValue('File URL is required');
    }
    try {
      const response = await apiClient.post(DELETE_FILE_BY_URL_API, {
        file_url: fileUrl.trim(),
      });
      return response?.data?.message;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception) ||
        error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

export const fetchAclTaskActivities = createAsyncThunk(
  'setting/fetchAclTaskActivities',
  async (aclTaskId, { rejectWithValue }) => {
    if (!aclTaskId) return rejectWithValue('acl_task is required');
    try {
      const response = await apiClient.get(ACL_TASK_ACTIVITIES_API, {
        params: { acl_task: aclTaskId },
      });
      return response?.data?.message ?? response?.data ?? { comments: [], history: [] };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception) ||
        error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

export const addAclTaskComment = createAsyncThunk(
  'setting/addAclTaskComment',
  async (
    { aclTaskId, content, attachments = [], visibleToClient = true, parentCommentId = null },
    { rejectWithValue },
  ) => {
    if (!aclTaskId || (typeof content !== 'string' && (!attachments || attachments.length === 0))) {
      return rejectWithValue('Task ID and content or attachments are required');
    }
    try {
      const formData = new FormData();
      formData.append('acl_task', String(aclTaskId));
      formData.append('content', content || '');
      formData.append('visible_to_client', visibleToClient ? '1' : '0');
      if (parentCommentId) {
        formData.append('parent_comment', parentCommentId);
      }
      if (attachments && attachments.length > 0) {
        attachments.forEach((attachment) => {
          if (attachment?.file) {
            formData.append('files[]', attachment.file);
          }
        });
      }
      const response = await apiClient.post(ADD_ACL_TASK_COMMENT_API, formData);
      return response?.data?.message ?? response?.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception) ||
        error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

// ── Create ACL Task (Account / Contact / Lead) ─────────────────────────────────
const CREATE_ACL_TASK_API = '/method/devx.devx_crm.api.acl_task.create_acl_task_with_files';

export const createAclTask = createAsyncThunk(
  'setting/createAclTask',
  async (payload, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('doc', JSON.stringify(payload.doc));

      if (payload.attachments?.length) {
        payload.attachments.forEach((att) => {
          if (att?.file && att.file instanceof File) {
            formData.append('files[]', att.file);
          }
        });
      }

      const response = await apiClient.post(CREATE_ACL_TASK_API, formData);
      return response?.data?.message ?? response?.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception) ||
        error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

export const getCrmAccountsColumnPreferences = createAsyncThunk(
  'setting/getCrmAccountsColumnPreferences',
  async ({ react_table_id } = {}, { rejectWithValue }) => {
    try {
      const params = { doctype: 'CRM Account' };
      if (react_table_id) {
        params.react_table_id = react_table_id;
      }
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data ?? error);
    }
  },
);

export const saveCrmAccountsColumnPreferences = createAsyncThunk(
  'setting/saveCrmAccountsColumnPreferences',
  async ({ columns, react_table_id }, { rejectWithValue }) => {
    try {
      const payload = { doctype: 'CRM Account', columns };
      if (react_table_id) {
        payload.react_table_id = react_table_id;
      }
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', payload);
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception) ||
        error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

export const getCrmContactsColumnPreferences = createAsyncThunk(
  'setting/getCrmContactsColumnPreferences',
  async ({ react_table_id } = {}, { rejectWithValue }) => {
    try {
      const params = { doctype: 'CRM Contact' };
      if (react_table_id) {
        params.react_table_id = react_table_id;
      }
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data ?? error);
    }
  },
);

export const saveCrmContactsColumnPreferences = createAsyncThunk(
  'setting/saveCrmContactsColumnPreferences',
  async ({ columns, react_table_id }, { rejectWithValue }) => {
    try {
      const payload = { doctype: 'CRM Contact', columns };
      if (react_table_id) {
        payload.react_table_id = react_table_id;
      }
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', payload);
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception) ||
        error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

export const getCrmLeadsColumnPreferences = createAsyncThunk(
  'setting/getCrmLeadsColumnPreferences',
  async ({ react_table_id } = {}, { rejectWithValue }) => {
    try {
      const params = { doctype: 'CRM Lead' };
      if (react_table_id) {
        params.react_table_id = react_table_id;
      }
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data ?? error);
    }
  },
);

export const saveCrmLeadsColumnPreferences = createAsyncThunk(
  'setting/saveCrmLeadsColumnPreferences',
  async ({ columns, react_table_id }, { rejectWithValue }) => {
    try {
      const payload = { doctype: 'CRM Lead', columns };
      if (react_table_id) {
        payload.react_table_id = react_table_id;
      }
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', payload);
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception) ||
        error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

export const getCrmProposalsColumnPreferences = createAsyncThunk(
  'setting/getCrmProposalsColumnPreferences',
  async ({ react_table_id } = {}, { rejectWithValue }) => {
    try {
      const params = { doctype: 'CRM Proposal' };
      if (react_table_id) {
        params.react_table_id = react_table_id;
      }
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data ?? error);
    }
  },
);

export const saveCrmProposalsColumnPreferences = createAsyncThunk(
  'setting/saveCrmProposalsColumnPreferences',
  async ({ columns, react_table_id }, { rejectWithValue }) => {
    try {
      const payload = { doctype: 'CRM Proposal', columns };
      if (react_table_id) {
        payload.react_table_id = react_table_id;
      }
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', payload);
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception) ||
        error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

export const getLeadCrmTaskDetail = createAsyncThunk(
  'setting/getLeadCrmTaskDetail',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.devx_crm.doctype.lead_crm_task_master.lead_crm_task_master.get_lead_crm_task_detail',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data ?? error);
    }
  },
);

export const updateLeadCrmTaskMaster = createAsyncThunk(
  'setting/updateLeadCrmTaskMaster',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.devx_crm.doctype.lead_crm_task_master.lead_crm_task_master.update_lead_crm_task_master',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data ?? error);
    }
  },
);

export const getClientExitColumnPreferences = createAsyncThunk(
  'setting/getClientExitColumnPreferences',
  async ({ react_table_id } = {}, { rejectWithValue }) => {
    try {
      const params = {
        doctype: 'Task Master',
      };
      if (react_table_id) {
        params.react_table_id = react_table_id;
      }
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.serialized ?? error?.response?.data ?? error?.message);
    }
  },
);

export const saveClientExitColumnPreferences = createAsyncThunk(
  'setting/saveClientExitColumnPreferences',
  async ({ columns, react_table_id }, { rejectWithValue }) => {
    try {
      const payload = {
        doctype: 'Task Master',
        columns,
      };
      if (react_table_id) {
        payload.react_table_id = react_table_id;
      }

      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', payload);
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception || error.message;

      return rejectWithValue(errorMessage);
    }
  },
);

export const getClientEngagementColumnPreferences = createAsyncThunk(
  'setting/getClientEngagementColumnPreferences',
  async ({ react_table_id } = {}, { rejectWithValue }) => {
    try {
      const params = {
        doctype: 'Task Master',
      };
      if (react_table_id) {
        params.react_table_id = react_table_id;
      }
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.serialized ?? error?.response?.data ?? error?.message);
    }
  },
);

export const getPartnerMasterColumnPreferences = createAsyncThunk(
  'setting/getPartnerMasterColumnPreferences',
  async ({ react_table_id } = {}, { rejectWithValue }) => {
    try {
      const params = {
        doctype: 'Task Master',
      };
      if (react_table_id) {
        params.react_table_id = react_table_id;
      }
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.serialized ?? error?.response?.data ?? error?.message ?? error);
    }
  },
);

export const getCenterMasterColumnPreferences = createAsyncThunk(
  'setting/getCenterMasterColumnPreferences',
  async ({ react_table_id } = {}, { rejectWithValue }) => {
    try {
      const params = { doctype: 'Task Master' };
      if (react_table_id) {
        params.react_table_id = react_table_id;
      }
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.serialized ?? error?.response?.data ?? error?.message ?? error);
    }
  },
);

export const savePartnerMasterColumnPreferences = createAsyncThunk(
  'setting/savePartnerMasterColumnPreferences',
  async ({ columns, react_table_id }, { rejectWithValue }) => {
    try {
      const payload = {
        doctype: 'Task Master',
        columns,
      };
      if (react_table_id) {
        payload.react_table_id = react_table_id;
      }
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', payload);
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception) ||
        error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

export const saveClientEngagementColumnPreferences = createAsyncThunk(
  'setting/saveClientEngagementColumnPreferences',
  async ({ columns, react_table_id }, { rejectWithValue }) => {
    try {
      const payload = {
        doctype: 'Task Master',
        columns,
      };
      if (react_table_id) {
        payload.react_table_id = react_table_id;
      }

      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', payload);
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception || error.message;

      return rejectWithValue(errorMessage);
    }
  },
);

export const createClientTaskTags = createAsyncThunk(
  'setting/createClientTaskTags',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.task_master.add_tag_to_task_master',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.serialized ?? error?.response?.data ?? error?.message);
    }
  },
);

export const fetchScopedTaskTags = createAsyncThunk(
  'setting/fetchScopedTaskTags',
  async ({ doctype, taskType, customRefDoctype, customRefDocname }, { rejectWithValue }) => {
    try {
      const docnames = await fetchScopedTaskDocNamesForTags({
        doctype,
        taskType,
        customRefDoctype,
        customRefDocname,
      });
      if (docnames.length === 0 || !doctype) return [];

      const response = await apiClient.post('/method/devx.api.core.get_tags', {
        doctype,
        docnames,
      });

      const tagMap = response?.data?.message ?? response?.data ?? {};
      return uniqueTagsFromGetTagsResponse(tagMap);
    } catch (error) {
      return rejectWithValue(error?.serialized ?? error?.response?.data ?? error?.message);
    }
  },
);

export const fetchClientTaskTags = createAsyncThunk(
  'setting/fetchClientTaskTags',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.core.get_tags_list', {
        doctype: payload?.doctype || 'Task',
      });
      return response.data.message || response.data;
    } catch (error) {
      return rejectWithValue(error?.serialized ?? error?.response?.data ?? error?.message);
    }
  },
);

export const addCrmTaskAttachment = createAsyncThunk(
  'setting/addCrmTaskAttachment',
  async (payload, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('task_id', payload.task_id);
      const files = Array.isArray(payload.attachments)
        ? payload.attachments
        : Array.isArray(payload.attachment_files)
          ? payload.attachment_files
          : payload.attachment_file
            ? [payload.attachment_file]
            : [];
      if (files.length === 0) return rejectWithValue('attachments required');
      files.forEach((file) => {
        if (file) formData.append('attachments', file);
      });

      const response = await apiClient.post(
        '/method/devx.api.task_master.add_task_master_attachment',
        formData,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to add attachment',
      );
    }
  },
);

export const addLeadCrmTaskAttachment = createAsyncThunk(
  'setting/addLeadCrmTaskAttachment',
  async (payload, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('task_id', payload.task_id);
      const files = Array.isArray(payload.attachments)
        ? payload.attachments
        : Array.isArray(payload.attachment_files)
          ? payload.attachment_files
          : payload.attachment_file
            ? [payload.attachment_file]
            : [];
      if (files.length === 0) return rejectWithValue('attachments required');
      files.forEach((file) => {
        if (file) formData.append('attachments', file);
      });

      const response = await apiClient.post(
        '/method/devx.devx_crm.doctype.lead_crm_task_master.lead_crm_task_master.add_lead_crm_task_attachment',
        formData,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to add attachment',
      );
    }
  },
);

export const removeCrmTaskAttachment = createAsyncThunk(
  'setting/removeCrmTaskAttachment',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.core.delete_attachment', {
        child_row_id: payload.child_row_id,
        child_doctype: payload.child_doctype,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to remove attachment',
      );
    }
  },
);

export const updateClientTaskTags = createAsyncThunk(
  'setting/updateClientTaskTags',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.task_master.update_task_master_tags',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.serialized ?? error?.response?.data ?? error?.message);
    }
  },
);

export const getRolesWithDescription = createAsyncThunk(
  '/settings/getRolesWithDescription',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx_tasks.devx_tasks.apis.user_.get_roles', {});
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.serialized ?? error?.response?.data ?? error?.message);
    }
  },
);

export const createVendorOnboardingTask = createAsyncThunk(
  'setting/createVendorOnboardingTask',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.task_master.create_task_master',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.serialized ?? error?.response?.data ?? error?.message);
    }
  },
);

export const updateVendorOnboardingTask = createAsyncThunk(
  'setting/updateVendorOnboardingTask',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.task_master.update_task_master',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to update task',
      );
    }
  },
);

export const getVendorOnboardingTaskList = createAsyncThunk(
  'setting/getVendorOnboardingTaskList',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.task_master.get_task_master_list_view',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.serialized ?? error?.response?.data ?? error?.message);
    }
  },
);

export const getVendorOnboardingColumnPreferences = createAsyncThunk(
  'setting/getVendorOnboardingColumnPreferences',
  async ({ react_table_id } = {}, { rejectWithValue }) => {
    try {
      const params = {
        doctype: 'Task Master',
      };
      if (react_table_id) {
        params.react_table_id = react_table_id;
      }
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.serialized ?? error?.response?.data ?? error?.message);
    }
  },
);

export const saveVendorOnboardingColumnPreferences = createAsyncThunk(
  'setting/saveVendorOnboardingColumnPreferences',
  async ({ columns, react_table_id }, { rejectWithValue }) => {
    try {
      const payload = {
        doctype: 'Task Master',
        columns,
      };
      if (react_table_id) {
        payload.react_table_id = react_table_id;
      }
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', payload);
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception || error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

export const saveCenterMasterColumnPreferences = createAsyncThunk(
  'setting/saveCenterMasterColumnPreferences',
  async ({ columns, react_table_id }, { rejectWithValue }) => {
    try {
      const payload = { doctype: 'Task Master', columns };
      if (react_table_id) {
        payload.react_table_id = react_table_id;
      }
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', payload);
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception) ||
        error.message;
      return rejectWithValue(errorMessage);
    }
  },
);

const settingSlice = createSlice({
  name: 'setting',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // createClientOnboardingTask reducers
    builder.addCase(createClientOnboardingTask.pending, (state) => {
      state.clientOnboarding.createTask.isLoading = true;
      state.clientOnboarding.createTask.error = null;
      state.clientOnboarding.createTask.status = null;
    });

    builder.addCase(createClientOnboardingTask.fulfilled, (state, action) => {
      state.clientOnboarding.createTask.isLoading = false;
      state.clientOnboarding.createTask.status = action.payload?.status || 200;
      state.clientOnboarding.createTask.error = null;
    });

    builder.addCase(createClientOnboardingTask.rejected, (state, action) => {
      state.clientOnboarding.createTask.isLoading = false;
      state.clientOnboarding.createTask.error = action.payload;
      state.clientOnboarding.createTask.status = action.payload?.status || 500;
    });

    // updateClientOnboardingTask reducers
    builder.addCase(updateClientOnboardingTask.pending, (state) => {
      state.clientOnboarding.createTask.isLoading = true;
      state.clientOnboarding.createTask.error = null;
      state.clientOnboarding.createTask.status = null;
    });

    builder.addCase(updateClientOnboardingTask.fulfilled, (state, action) => {
      state.clientOnboarding.createTask.isLoading = false;
      state.clientOnboarding.createTask.status = action.payload?.status || 200;
      state.clientOnboarding.createTask.error = null;
    });

    builder.addCase(updateClientOnboardingTask.rejected, (state, action) => {
      state.clientOnboarding.createTask.isLoading = false;
      state.clientOnboarding.createTask.error = action.payload;
      state.clientOnboarding.createTask.status = action.payload?.status || 500;
    });

    // getClientOnboardingTaskList reducers
    builder.addCase(getClientOnboardingTaskList.pending, (state) => {
      state.clientOnboarding.getList.isLoading = true;
      state.clientOnboarding.getList.error = null;
      state.clientOnboarding.getList.status = null;
    });

    builder.addCase(getClientOnboardingTaskList.fulfilled, (state, action) => {
      state.clientOnboarding.getList.isLoading = false;
      const responseData = action.payload?.message || action.payload?.data || action.payload;
      state.clientOnboarding.getList.data = responseData;
      state.clientOnboarding.getList.status = action.payload?.status || 200;
      state.clientOnboarding.getList.error = null;

      // Extract columns from response if available
      if (responseData?.columns && Array.isArray(responseData.columns)) {
        state.clientOnboarding.columnPreferences.data = responseData.columns;
        state.clientOnboarding.columnPreferences.error = null;
      }
    });

    builder.addCase(getClientOnboardingTaskList.rejected, (state, action) => {
      state.clientOnboarding.getList.isLoading = false;
      state.clientOnboarding.getList.error = action.payload;
      state.clientOnboarding.getList.status = action.payload?.status || 500;
    });

    // getParticularTaskDetail reducers
    builder.addCase(getParticularTaskDetail.pending, (state, action) => {
      const taskType = action.meta.arg?.type;
      if (taskType === 'Client Exiting') {
        state.clientExit.getTaskDetail.isLoading = true;
        state.clientExit.getTaskDetail.error = null;
        state.clientExit.getTaskDetail.status = null;
      } else if (taskType === 'Client Engagement') {
        state.clientEngagement.getTaskDetail.isLoading = true;
        state.clientEngagement.getTaskDetail.error = null;
        state.clientEngagement.getTaskDetail.status = null;
      } else if (taskType === 'Vendor Onboarding') {
        state.vendorOnboarding.getTaskDetail.isLoading = true;
        state.vendorOnboarding.getTaskDetail.error = null;
        state.vendorOnboarding.getTaskDetail.status = null;
      } else {
        state.clientOnboarding.getTaskDetail.isLoading = true;
        state.clientOnboarding.getTaskDetail.error = null;
        state.clientOnboarding.getTaskDetail.status = null;
      }
    });

    builder.addCase(getParticularTaskDetail.fulfilled, (state, action) => {
      const taskType = action.meta.arg?.type;
      const taskData = action.payload?.message?.data || action.payload?.data || action.payload;
      if (taskType === 'Client Exiting') {
        state.clientExit.getTaskDetail.isLoading = false;
        state.clientExit.getTaskDetail.data = taskData;
        state.clientExit.getTaskDetail.status = action.payload?.status || 200;
        state.clientExit.getTaskDetail.error = null;
      } else if (taskType === 'Client Engagement') {
        state.clientEngagement.getTaskDetail.isLoading = false;
        state.clientEngagement.getTaskDetail.data = taskData;
        state.clientEngagement.getTaskDetail.status = action.payload?.status || 200;
        state.clientEngagement.getTaskDetail.error = null;
      } else if (taskType === 'Vendor Onboarding') {
        state.vendorOnboarding.getTaskDetail.isLoading = false;
        state.vendorOnboarding.getTaskDetail.data = taskData;
        state.vendorOnboarding.getTaskDetail.status = action.payload?.status || 200;
        state.vendorOnboarding.getTaskDetail.error = null;
      } else {
        state.clientOnboarding.getTaskDetail.isLoading = false;
        state.clientOnboarding.getTaskDetail.data = taskData;
        state.clientOnboarding.getTaskDetail.status = action.payload?.status || 200;
        state.clientOnboarding.getTaskDetail.error = null;
      }
    });

    builder.addCase(getParticularTaskDetail.rejected, (state, action) => {
      const taskType = action.meta.arg?.type;
      if (taskType === 'Client Exiting') {
        state.clientExit.getTaskDetail.isLoading = false;
        state.clientExit.getTaskDetail.error = action.payload;
        state.clientExit.getTaskDetail.status = action.payload?.status || 500;
      } else if (taskType === 'Client Engagement') {
        state.clientEngagement.getTaskDetail.isLoading = false;
        state.clientEngagement.getTaskDetail.error = action.payload;
        state.clientEngagement.getTaskDetail.status = action.payload?.status || 500;
      } else if (taskType === 'Vendor Onboarding') {
        state.vendorOnboarding.getTaskDetail.isLoading = false;
        state.vendorOnboarding.getTaskDetail.error = action.payload;
        state.vendorOnboarding.getTaskDetail.status = action.payload?.status || 500;
      } else {
        state.clientOnboarding.getTaskDetail.isLoading = false;
        state.clientOnboarding.getTaskDetail.error = action.payload;
        state.clientOnboarding.getTaskDetail.status = action.payload?.status || 500;
      }
    });

    // getClientExitTaskList reducers
    builder.addCase(getClientExitTaskList.pending, (state) => {
      state.clientExit.getList.isLoading = true;
      state.clientExit.getList.error = null;
      state.clientExit.getList.status = null;
    });

    builder.addCase(getClientExitTaskList.fulfilled, (state, action) => {
      state.clientExit.getList.isLoading = false;
      const responseData = action.payload?.message || action.payload?.data || action.payload;
      state.clientExit.getList.data = responseData;
      state.clientExit.getList.status = action.payload?.status || 200;
      state.clientExit.getList.error = null;

      // Extract columns from response if available
      if (responseData?.columns && Array.isArray(responseData.columns)) {
        state.clientExit.columnPreferences.data = responseData.columns;
        state.clientExit.columnPreferences.error = null;
      }
    });

    builder.addCase(getClientExitTaskList.rejected, (state, action) => {
      state.clientExit.getList.isLoading = false;
      state.clientExit.getList.error = action.payload;
      state.clientExit.getList.status = action.payload?.status || 500;
    });

    // getClientEngagementTaskList reducers
    builder.addCase(getClientEngagementTaskList.pending, (state) => {
      state.clientEngagement.getList.isLoading = true;
      state.clientEngagement.getList.error = null;
      state.clientEngagement.getList.status = null;
    });

    builder.addCase(getClientEngagementTaskList.fulfilled, (state, action) => {
      state.clientEngagement.getList.isLoading = false;
      const responseData = action.payload?.message || action.payload?.data || action.payload;
      state.clientEngagement.getList.data = responseData;
      state.clientEngagement.getList.status = action.payload?.status || 200;
      state.clientEngagement.getList.error = null;

      // Extract columns from response if available
      if (responseData?.columns && Array.isArray(responseData.columns)) {
        state.clientEngagement.columnPreferences.data = responseData.columns;
        state.clientEngagement.columnPreferences.error = null;
      }
    });

    builder.addCase(getClientEngagementTaskList.rejected, (state, action) => {
      state.clientEngagement.getList.isLoading = false;
      state.clientEngagement.getList.error = action.payload;
      state.clientEngagement.getList.status = action.payload?.status || 500;
    });

    // Partner Master – create/update/list/detail
    builder.addCase(createPartnerMasterTask.pending, (state) => {
      state.partnerMaster.createTask.isLoading = true;
      state.partnerMaster.createTask.error = null;
      state.partnerMaster.createTask.status = null;
    });
    builder.addCase(createPartnerMasterTask.fulfilled, (state, action) => {
      state.partnerMaster.createTask.isLoading = false;
      state.partnerMaster.createTask.status = action.payload?.status || 200;
      state.partnerMaster.createTask.error = null;
    });
    builder.addCase(createPartnerMasterTask.rejected, (state, action) => {
      state.partnerMaster.createTask.isLoading = false;
      state.partnerMaster.createTask.error = action.payload;
      state.partnerMaster.createTask.status = action.payload?.status || 500;
    });

    builder.addCase(updatePartnerMasterTask.pending, (state) => {
      state.partnerMaster.createTask.isLoading = true;
      state.partnerMaster.createTask.error = null;
      state.partnerMaster.createTask.status = null;
    });
    builder.addCase(updatePartnerMasterTask.fulfilled, (state, action) => {
      state.partnerMaster.createTask.isLoading = false;
      state.partnerMaster.createTask.status = action.payload?.status || 200;
      state.partnerMaster.createTask.error = null;
    });
    builder.addCase(updatePartnerMasterTask.rejected, (state, action) => {
      state.partnerMaster.createTask.isLoading = false;
      state.partnerMaster.createTask.error = action.payload;
      state.partnerMaster.createTask.status = action.payload?.status || 500;
    });

    builder.addCase(getPartnerMasterTaskList.pending, (state) => {
      state.partnerMaster.getList.isLoading = true;
      state.partnerMaster.getList.error = null;
      state.partnerMaster.getList.status = null;
    });
    builder.addCase(getPartnerMasterTaskList.fulfilled, (state, action) => {
      state.partnerMaster.getList.isLoading = false;
      const responseData = action.payload?.message || action.payload?.data || action.payload;
      const prevData = state.partnerMaster.getList.data;
      const merged =
        prevData && typeof prevData === 'object' && responseData && typeof responseData === 'object'
          ? mergePartnerMasterListPreserveTags(prevData, responseData)
          : responseData;

      state.partnerMaster.getList.data = merged;
      state.partnerMaster.getList.status = action.payload?.status || 200;
      state.partnerMaster.getList.error = null;

      if (merged?.columns && Array.isArray(merged.columns)) {
        state.partnerMaster.columnPreferences.data = merged.columns;
        state.partnerMaster.columnPreferences.error = null;
      }
    });
    builder.addCase(getPartnerMasterTaskList.rejected, (state, action) => {
      state.partnerMaster.getList.isLoading = false;
      state.partnerMaster.getList.error = action.payload;
      state.partnerMaster.getList.status = action.payload?.status || 500;
    });

    // Center Master – create/update/list
    builder.addCase(createCenterMasterTask.pending, (state) => {
      state.centerMaster.createTask.isLoading = true;
      state.centerMaster.createTask.error = null;
      state.centerMaster.createTask.status = null;
    });
    builder.addCase(createCenterMasterTask.fulfilled, (state, action) => {
      state.centerMaster.createTask.isLoading = false;
      state.centerMaster.createTask.status = action.payload?.status || 200;
      state.centerMaster.createTask.error = null;
    });
    builder.addCase(createCenterMasterTask.rejected, (state, action) => {
      state.centerMaster.createTask.isLoading = false;
      state.centerMaster.createTask.error = action.payload;
      state.centerMaster.createTask.status = action.payload?.status || 500;
    });

    builder.addCase(updateCenterMasterTask.pending, (state) => {
      state.centerMaster.createTask.isLoading = true;
      state.centerMaster.createTask.error = null;
      state.centerMaster.createTask.status = null;
    });
    builder.addCase(updateCenterMasterTask.fulfilled, (state, action) => {
      state.centerMaster.createTask.isLoading = false;
      state.centerMaster.createTask.status = action.payload?.status || 200;
      state.centerMaster.createTask.error = null;
    });
    builder.addCase(updateCenterMasterTask.rejected, (state, action) => {
      state.centerMaster.createTask.isLoading = false;
      state.centerMaster.createTask.error = action.payload;
      state.centerMaster.createTask.status = action.payload?.status || 500;
    });

    builder.addCase(getCenterMasterTaskList.pending, (state) => {
      state.centerMaster.getList.isLoading = true;
      state.centerMaster.getList.error = null;
      state.centerMaster.getList.status = null;
    });
    builder.addCase(getCenterMasterTaskList.fulfilled, (state, action) => {
      state.centerMaster.getList.isLoading = false;
      const responseData = action.payload?.message || action.payload?.data || action.payload;
      const prevData = state.centerMaster.getList.data;
      const merged =
        prevData && typeof prevData === 'object' && responseData && typeof responseData === 'object'
          ? mergeCenterMasterListPreserveTags(prevData, responseData)
          : responseData;

      state.centerMaster.getList.data = merged;
      state.centerMaster.getList.status = action.payload?.status || 200;
      state.centerMaster.getList.error = null;

      if (merged?.columns && Array.isArray(merged.columns)) {
        state.centerMaster.columnPreferences.data = merged.columns;
        state.centerMaster.columnPreferences.error = null;
      }
    });
    builder.addCase(getCenterMasterTaskList.rejected, (state, action) => {
      state.centerMaster.getList.isLoading = false;
      state.centerMaster.getList.error = action.payload;
      state.centerMaster.getList.status = action.payload?.status || 500;
    });

    builder.addCase(getClientOnboardingColumnPreferences.pending, (state) => {
      state.clientOnboarding.columnPreferences.isLoading = true;
      state.clientOnboarding.columnPreferences.error = null;
      state.clientOnboarding.columnPreferences.status = null;
    });

    builder.addCase(getClientOnboardingColumnPreferences.fulfilled, (state, action) => {
      state.clientOnboarding.columnPreferences.isLoading = false;
      state.clientOnboarding.columnPreferences.data =
        action.payload?.message || action.payload?.data || action.payload;
      state.clientOnboarding.columnPreferences.status = action.payload?.status || 200;
      state.clientOnboarding.columnPreferences.error = null;
    });

    builder.addCase(getClientOnboardingColumnPreferences.rejected, (state, action) => {
      state.clientOnboarding.columnPreferences.isLoading = false;
      state.clientOnboarding.columnPreferences.error = action.payload;
      state.clientOnboarding.columnPreferences.status = action.payload?.status || 500;
    });

    builder.addCase(saveClientOnboardingColumnPreferences.pending, (state) => {
      state.clientOnboarding.columnPreferences.isLoading = true;
      state.clientOnboarding.columnPreferences.error = null;
    });

    builder.addCase(saveClientOnboardingColumnPreferences.fulfilled, (state) => {
      state.clientOnboarding.columnPreferences.isLoading = false;
      state.clientOnboarding.columnPreferences.error = null;
    });

    builder.addCase(saveClientOnboardingColumnPreferences.rejected, (state, action) => {
      state.clientOnboarding.columnPreferences.isLoading = false;
      state.clientOnboarding.columnPreferences.error = action.payload;
    });

    builder.addCase(getClientExitColumnPreferences.pending, (state) => {
      state.clientExit.columnPreferences.isLoading = true;
      state.clientExit.columnPreferences.error = null;
      state.clientExit.columnPreferences.status = null;
    });

    builder.addCase(getClientExitColumnPreferences.fulfilled, (state, action) => {
      state.clientExit.columnPreferences.isLoading = false;
      state.clientExit.columnPreferences.data =
        action.payload?.message || action.payload?.data || action.payload;
      state.clientExit.columnPreferences.status = action.payload?.status || 200;
      state.clientExit.columnPreferences.error = null;
    });

    builder.addCase(getClientExitColumnPreferences.rejected, (state, action) => {
      state.clientExit.columnPreferences.isLoading = false;
      state.clientExit.columnPreferences.error = action.payload;
      state.clientExit.columnPreferences.status = action.payload?.status || 500;
    });

    builder.addCase(saveClientExitColumnPreferences.pending, (state) => {
      state.clientExit.columnPreferences.isLoading = true;
      state.clientExit.columnPreferences.error = null;
    });

    builder.addCase(saveClientExitColumnPreferences.fulfilled, (state) => {
      state.clientExit.columnPreferences.isLoading = false;
      state.clientExit.columnPreferences.error = null;
    });

    builder.addCase(saveClientExitColumnPreferences.rejected, (state, action) => {
      state.clientExit.columnPreferences.isLoading = false;
      state.clientExit.columnPreferences.error = action.payload;
    });

    builder.addCase(getClientEngagementColumnPreferences.pending, (state) => {
      state.clientEngagement.columnPreferences.isLoading = true;
      state.clientEngagement.columnPreferences.error = null;
      state.clientEngagement.columnPreferences.status = null;
    });

    builder.addCase(getClientEngagementColumnPreferences.fulfilled, (state, action) => {
      state.clientEngagement.columnPreferences.isLoading = false;
      state.clientEngagement.columnPreferences.data =
        action.payload?.message || action.payload?.data || action.payload;
      state.clientEngagement.columnPreferences.status = action.payload?.status || 200;
      state.clientEngagement.columnPreferences.error = null;
    });

    builder.addCase(getClientEngagementColumnPreferences.rejected, (state, action) => {
      state.clientEngagement.columnPreferences.isLoading = false;
      state.clientEngagement.columnPreferences.error = action.payload;
      state.clientEngagement.columnPreferences.status = action.payload?.status || 500;
    });

    builder.addCase(saveClientEngagementColumnPreferences.pending, (state) => {
      state.clientEngagement.columnPreferences.isLoading = true;
      state.clientEngagement.columnPreferences.error = null;
    });

    builder.addCase(saveClientEngagementColumnPreferences.fulfilled, (state) => {
      state.clientEngagement.columnPreferences.isLoading = false;
      state.clientEngagement.columnPreferences.error = null;
    });

    builder.addCase(saveClientEngagementColumnPreferences.rejected, (state, action) => {
      state.clientEngagement.columnPreferences.isLoading = false;
      state.clientEngagement.columnPreferences.error = action.payload;
    });

    // Partner Master – column preferences
    builder.addCase(getPartnerMasterColumnPreferences.pending, (state) => {
      state.partnerMaster.columnPreferences.isLoading = true;
      state.partnerMaster.columnPreferences.error = null;
    });
    builder.addCase(getPartnerMasterColumnPreferences.fulfilled, (state, action) => {
      state.partnerMaster.columnPreferences.isLoading = false;
      state.partnerMaster.columnPreferences.data =
        action.payload?.message || action.payload?.data || action.payload;
      state.partnerMaster.columnPreferences.error = null;
    });
    builder.addCase(getPartnerMasterColumnPreferences.rejected, (state, action) => {
      state.partnerMaster.columnPreferences.isLoading = false;
      state.partnerMaster.columnPreferences.error = action.payload;
    });
    builder.addCase(savePartnerMasterColumnPreferences.pending, (state) => {
      state.partnerMaster.columnPreferences.isLoading = true;
      state.partnerMaster.columnPreferences.error = null;
    });
    builder.addCase(savePartnerMasterColumnPreferences.fulfilled, (state) => {
      state.partnerMaster.columnPreferences.isLoading = false;
      state.partnerMaster.columnPreferences.error = null;
    });
    builder.addCase(savePartnerMasterColumnPreferences.rejected, (state, action) => {
      state.partnerMaster.columnPreferences.isLoading = false;
      state.partnerMaster.columnPreferences.error = action.payload;
    });

    // Center Master – column preferences
    builder.addCase(getCenterMasterColumnPreferences.pending, (state) => {
      state.centerMaster.columnPreferences.isLoading = true;
      state.centerMaster.columnPreferences.error = null;
    });
    builder.addCase(getCenterMasterColumnPreferences.fulfilled, (state, action) => {
      state.centerMaster.columnPreferences.isLoading = false;
      state.centerMaster.columnPreferences.data =
        action.payload?.message || action.payload?.data || action.payload;
      state.centerMaster.columnPreferences.error = null;
    });
    builder.addCase(getCenterMasterColumnPreferences.rejected, (state, action) => {
      state.centerMaster.columnPreferences.isLoading = false;
      state.centerMaster.columnPreferences.error = action.payload;
    });
    builder.addCase(saveCenterMasterColumnPreferences.pending, (state) => {
      state.centerMaster.columnPreferences.isLoading = true;
      state.centerMaster.columnPreferences.error = null;
    });
    builder.addCase(saveCenterMasterColumnPreferences.fulfilled, (state) => {
      state.centerMaster.columnPreferences.isLoading = false;
      state.centerMaster.columnPreferences.error = null;
    });
    builder.addCase(saveCenterMasterColumnPreferences.rejected, (state, action) => {
      state.centerMaster.columnPreferences.isLoading = false;
      state.centerMaster.columnPreferences.error = action.payload;
    });

    builder.addCase(getCrmTaskMasterColumnPreferences.pending, (state) => {
      state.crmTaskMaster.columnPreferences.isLoading = true;
      state.crmTaskMaster.columnPreferences.error = null;
    });
    builder.addCase(getCrmTaskMasterColumnPreferences.fulfilled, (state, action) => {
      state.crmTaskMaster.columnPreferences.isLoading = false;
      state.crmTaskMaster.columnPreferences.data =
        action.payload?.message ?? action.payload?.data ?? action.payload;
      state.crmTaskMaster.columnPreferences.error = null;
    });
    builder.addCase(getCrmTaskMasterColumnPreferences.rejected, (state, action) => {
      state.crmTaskMaster.columnPreferences.isLoading = false;
      state.crmTaskMaster.columnPreferences.error = action.payload;
    });
    builder.addCase(saveCrmTaskMasterColumnPreferences.pending, (state) => {
      state.crmTaskMaster.columnPreferences.isLoading = true;
      state.crmTaskMaster.columnPreferences.error = null;
    });
    builder.addCase(saveCrmTaskMasterColumnPreferences.fulfilled, (state) => {
      state.crmTaskMaster.columnPreferences.isLoading = false;
      state.crmTaskMaster.columnPreferences.error = null;
    });
    builder.addCase(saveCrmTaskMasterColumnPreferences.rejected, (state, action) => {
      state.crmTaskMaster.columnPreferences.isLoading = false;
      state.crmTaskMaster.columnPreferences.error = action.payload;
    });

    builder.addCase(getCrmAccountsColumnPreferences.pending, (state) => {
      state.crmAccounts.columnPreferences.isLoading = true;
      state.crmAccounts.columnPreferences.error = null;
    });
    builder.addCase(getCrmAccountsColumnPreferences.fulfilled, (state, action) => {
      state.crmAccounts.columnPreferences.isLoading = false;
      state.crmAccounts.columnPreferences.data =
        action.payload?.message ?? action.payload?.data ?? action.payload;
      state.crmAccounts.columnPreferences.error = null;
    });
    builder.addCase(getCrmAccountsColumnPreferences.rejected, (state, action) => {
      state.crmAccounts.columnPreferences.isLoading = false;
      state.crmAccounts.columnPreferences.error = action.payload;
    });
    builder.addCase(saveCrmAccountsColumnPreferences.pending, (state) => {
      state.crmAccounts.columnPreferences.isLoading = true;
      state.crmAccounts.columnPreferences.error = null;
    });
    builder.addCase(saveCrmAccountsColumnPreferences.fulfilled, (state) => {
      state.crmAccounts.columnPreferences.isLoading = false;
      state.crmAccounts.columnPreferences.error = null;
    });
    builder.addCase(saveCrmAccountsColumnPreferences.rejected, (state, action) => {
      state.crmAccounts.columnPreferences.isLoading = false;
      state.crmAccounts.columnPreferences.error = action.payload;
    });

    builder.addCase(getCrmContactsColumnPreferences.pending, (state) => {
      state.crmContacts.columnPreferences.isLoading = true;
      state.crmContacts.columnPreferences.error = null;
    });
    builder.addCase(getCrmContactsColumnPreferences.fulfilled, (state, action) => {
      state.crmContacts.columnPreferences.isLoading = false;
      state.crmContacts.columnPreferences.data =
        action.payload?.message ?? action.payload?.data ?? action.payload;
      state.crmContacts.columnPreferences.error = null;
    });
    builder.addCase(getCrmContactsColumnPreferences.rejected, (state, action) => {
      state.crmContacts.columnPreferences.isLoading = false;
      state.crmContacts.columnPreferences.error = action.payload;
    });
    builder.addCase(saveCrmContactsColumnPreferences.pending, (state) => {
      state.crmContacts.columnPreferences.isLoading = true;
      state.crmContacts.columnPreferences.error = null;
    });
    builder.addCase(saveCrmContactsColumnPreferences.fulfilled, (state) => {
      state.crmContacts.columnPreferences.isLoading = false;
      state.crmContacts.columnPreferences.error = null;
    });
    builder.addCase(saveCrmContactsColumnPreferences.rejected, (state, action) => {
      state.crmContacts.columnPreferences.isLoading = false;
      state.crmContacts.columnPreferences.error = action.payload;
    });

    builder.addCase(getCrmLeadsColumnPreferences.pending, (state) => {
      state.crmLeads.columnPreferences.isLoading = true;
      state.crmLeads.columnPreferences.error = null;
    });
    builder.addCase(getCrmLeadsColumnPreferences.fulfilled, (state, action) => {
      state.crmLeads.columnPreferences.isLoading = false;
      state.crmLeads.columnPreferences.data =
        action.payload?.message ?? action.payload?.data ?? action.payload;
      state.crmLeads.columnPreferences.error = null;
    });
    builder.addCase(getCrmLeadsColumnPreferences.rejected, (state, action) => {
      state.crmLeads.columnPreferences.isLoading = false;
      state.crmLeads.columnPreferences.error = action.payload;
    });
    builder.addCase(saveCrmLeadsColumnPreferences.pending, (state) => {
      state.crmLeads.columnPreferences.isLoading = true;
      state.crmLeads.columnPreferences.error = null;
    });
    builder.addCase(saveCrmLeadsColumnPreferences.fulfilled, (state) => {
      state.crmLeads.columnPreferences.isLoading = false;
      state.crmLeads.columnPreferences.error = null;
    });
    builder.addCase(saveCrmLeadsColumnPreferences.rejected, (state, action) => {
      state.crmLeads.columnPreferences.isLoading = false;
      state.crmLeads.columnPreferences.error = action.payload;
    });

    builder.addCase(getAclTaskColumnPreferences.pending, (state) => {
      state.aclTask.columnPreferences.isLoading = true;
      state.aclTask.columnPreferences.error = null;
    });
    builder.addCase(getAclTaskColumnPreferences.fulfilled, (state, action) => {
      state.aclTask.columnPreferences.isLoading = false;
      state.aclTask.columnPreferences.data =
        action.payload?.message ?? action.payload?.data ?? action.payload;
      state.aclTask.columnPreferences.error = null;
    });
    builder.addCase(getAclTaskColumnPreferences.rejected, (state, action) => {
      state.aclTask.columnPreferences.isLoading = false;
      state.aclTask.columnPreferences.error = action.payload;
    });
    builder.addCase(saveAclTaskColumnPreferences.pending, (state) => {
      state.aclTask.columnPreferences.isLoading = true;
      state.aclTask.columnPreferences.error = null;
    });
    builder.addCase(saveAclTaskColumnPreferences.fulfilled, (state) => {
      state.aclTask.columnPreferences.isLoading = false;
      state.aclTask.columnPreferences.error = null;
    });
    builder.addCase(saveAclTaskColumnPreferences.rejected, (state, { payload }) => {
      state.aclTask.columnPreferences.isLoading = false;
      state.aclTask.columnPreferences.error = payload;
    });

    // CRM Contact Task column preferences
    builder.addCase(getCrmContactTaskColumnPreferences.pending, (state) => {
      state.crmContactTaskColumnPrefs.isLoading = true;
      state.crmContactTaskColumnPrefs.error = null;
    });
    builder.addCase(getCrmContactTaskColumnPreferences.fulfilled, (state, action) => {
      state.crmContactTaskColumnPrefs.isLoading = false;
      state.crmContactTaskColumnPrefs.data =
        action.payload?.message ?? action.payload?.data ?? action.payload;
      state.crmContactTaskColumnPrefs.error = null;
    });
    builder.addCase(getCrmContactTaskColumnPreferences.rejected, (state, action) => {
      state.crmContactTaskColumnPrefs.isLoading = false;
      state.crmContactTaskColumnPrefs.error = action.payload;
    });
    builder.addCase(saveCrmContactTaskColumnPreferences.pending, (state) => {
      state.crmContactTaskColumnPrefs.isLoading = true;
      state.crmContactTaskColumnPrefs.error = null;
    });
    builder.addCase(saveCrmContactTaskColumnPreferences.fulfilled, (state) => {
      state.crmContactTaskColumnPrefs.isLoading = false;
      state.crmContactTaskColumnPrefs.error = null;
    });
    builder.addCase(saveCrmContactTaskColumnPreferences.rejected, (state, { payload }) => {
      state.crmContactTaskColumnPrefs.isLoading = false;
      state.crmContactTaskColumnPrefs.error = payload;
    });

    // CRM Account Task column preferences
    builder.addCase(getCrmAccountTaskColumnPreferences.pending, (state) => {
      state.crmAccountTaskColumnPrefs.isLoading = true;
      state.crmAccountTaskColumnPrefs.error = null;
    });
    builder.addCase(getCrmAccountTaskColumnPreferences.fulfilled, (state, action) => {
      state.crmAccountTaskColumnPrefs.isLoading = false;
      state.crmAccountTaskColumnPrefs.data =
        action.payload?.message ?? action.payload?.data ?? action.payload;
      state.crmAccountTaskColumnPrefs.error = null;
    });
    builder.addCase(getCrmAccountTaskColumnPreferences.rejected, (state, action) => {
      state.crmAccountTaskColumnPrefs.isLoading = false;
      state.crmAccountTaskColumnPrefs.error = action.payload;
    });
    builder.addCase(saveCrmAccountTaskColumnPreferences.pending, (state) => {
      state.crmAccountTaskColumnPrefs.isLoading = true;
      state.crmAccountTaskColumnPrefs.error = null;
    });
    builder.addCase(saveCrmAccountTaskColumnPreferences.fulfilled, (state) => {
      state.crmAccountTaskColumnPrefs.isLoading = false;
      state.crmAccountTaskColumnPrefs.error = null;
    });
    builder.addCase(saveCrmAccountTaskColumnPreferences.rejected, (state, { payload }) => {
      state.crmAccountTaskColumnPrefs.isLoading = false;
      state.crmAccountTaskColumnPrefs.error = payload;
    });

    // CRM Lead Task column preferences
    builder.addCase(getCrmLeadTaskColumnPreferences.pending, (state) => {
      state.crmLeadTaskColumnPrefs.isLoading = true;
      state.crmLeadTaskColumnPrefs.error = null;
    });
    builder.addCase(getCrmLeadTaskColumnPreferences.fulfilled, (state, action) => {
      state.crmLeadTaskColumnPrefs.isLoading = false;
      state.crmLeadTaskColumnPrefs.data =
        action.payload?.message ?? action.payload?.data ?? action.payload;
      state.crmLeadTaskColumnPrefs.error = null;
    });
    builder.addCase(getCrmLeadTaskColumnPreferences.rejected, (state, action) => {
      state.crmLeadTaskColumnPrefs.isLoading = false;
      state.crmLeadTaskColumnPrefs.error = action.payload;
    });
    builder.addCase(saveCrmLeadTaskColumnPreferences.pending, (state) => {
      state.crmLeadTaskColumnPrefs.isLoading = true;
      state.crmLeadTaskColumnPrefs.error = null;
    });
    builder.addCase(saveCrmLeadTaskColumnPreferences.fulfilled, (state) => {
      state.crmLeadTaskColumnPrefs.isLoading = false;
      state.crmLeadTaskColumnPrefs.error = null;
    });
    builder.addCase(saveCrmLeadTaskColumnPreferences.rejected, (state, { payload }) => {
      state.crmLeadTaskColumnPrefs.isLoading = false;
      state.crmLeadTaskColumnPrefs.error = payload;
    });

    builder.addCase(getLeadCrmTaskDetail.pending, (state) => {
      state.crmTaskMaster.taskDetail.isLoading = true;
      state.crmTaskMaster.taskDetail.error = null;
    });
    builder.addCase(getLeadCrmTaskDetail.fulfilled, (state, action) => {
      state.crmTaskMaster.taskDetail.isLoading = false;
      state.crmTaskMaster.taskDetail.data =
        action.payload?.message?.data ?? action.payload?.data ?? action.payload;
      state.crmTaskMaster.taskDetail.error = null;
    });
    builder.addCase(getLeadCrmTaskDetail.rejected, (state, action) => {
      state.crmTaskMaster.taskDetail.isLoading = false;
      state.crmTaskMaster.taskDetail.error = action.payload;
    });

    builder.addCase(updateLeadCrmTaskMaster.pending, (state) => {
      state.crmTaskMaster.taskDetail.isLoading = true;
    });
    builder.addCase(updateLeadCrmTaskMaster.fulfilled, (state) => {
      state.crmTaskMaster.taskDetail.isLoading = false;
    });
    builder.addCase(updateLeadCrmTaskMaster.rejected, (state) => {
      state.crmTaskMaster.taskDetail.isLoading = false;
    });

    builder.addCase(fetchClientTaskTags.pending, (state) => {
      state.clientTaskTags.isLoading = true;
      state.clientTaskTags.error = null;
    });

    builder.addCase(fetchClientTaskTags.fulfilled, (state, action) => {
      state.clientTaskTags.isLoading = false;
      state.clientTaskTags.data = action.payload || action.payload?.message;
    });

    builder.addCase(fetchClientTaskTags.rejected, (state, action) => {
      state.clientTaskTags.isLoading = false;
      state.clientTaskTags.error = action.payload;
    });

    builder.addCase(getRolesWithDescription.pending, (state) => {
      state.rolesWithDescription.isLoading = true;
      state.rolesWithDescription.error = null;
      state.rolesWithDescription.status = null;
    });

    builder.addCase(getRolesWithDescription.fulfilled, (state, action) => {
      state.rolesWithDescription.isLoading = false;
      state.rolesWithDescription.data = action.payload || action.payload?.message;
      state.rolesWithDescription.status = action.payload?.status || 200;
      state.rolesWithDescription.error = null;
    });

    builder.addCase(getRolesWithDescription.rejected, (state, action) => {
      state.rolesWithDescription.isLoading = false;
      state.rolesWithDescription.error = action.payload;
    });
    // createVendorOnboardingTask
    builder.addCase(createVendorOnboardingTask.pending, (state) => {
      state.vendorOnboarding.createTask.isLoading = true;
      state.vendorOnboarding.createTask.error = null;
      state.vendorOnboarding.createTask.status = null;
    });
    builder.addCase(createVendorOnboardingTask.fulfilled, (state, action) => {
      state.vendorOnboarding.createTask.isLoading = false;
      state.vendorOnboarding.createTask.status = action.payload?.status || 200;
      state.vendorOnboarding.createTask.error = null;
    });
    builder.addCase(createVendorOnboardingTask.rejected, (state, action) => {
      state.vendorOnboarding.createTask.isLoading = false;
      state.vendorOnboarding.createTask.error = action.payload;
      state.vendorOnboarding.createTask.status = action.payload?.status || 500;
    });

    // updateVendorOnboardingTask
    builder.addCase(updateVendorOnboardingTask.pending, (state) => {
      state.vendorOnboarding.createTask.isLoading = true;
      state.vendorOnboarding.createTask.error = null;
      state.vendorOnboarding.createTask.status = null;
    });
    builder.addCase(updateVendorOnboardingTask.fulfilled, (state, action) => {
      state.vendorOnboarding.createTask.isLoading = false;
      state.vendorOnboarding.createTask.status = action.payload?.status || 200;
      state.vendorOnboarding.createTask.error = null;
    });
    builder.addCase(updateVendorOnboardingTask.rejected, (state, action) => {
      state.vendorOnboarding.createTask.isLoading = false;
      state.vendorOnboarding.createTask.error = action.payload;
      state.vendorOnboarding.createTask.status = action.payload?.status || 500;
    });

    // getVendorOnboardingTaskList
    builder.addCase(getVendorOnboardingTaskList.pending, (state) => {
      state.vendorOnboarding.getList.isLoading = true;
      state.vendorOnboarding.getList.error = null;
      state.vendorOnboarding.getList.status = null;
    });
    builder.addCase(getVendorOnboardingTaskList.fulfilled, (state, action) => {
      state.vendorOnboarding.getList.isLoading = false;
      const responseData = action.payload?.message || action.payload?.data || action.payload;
      state.vendorOnboarding.getList.data = responseData;
      state.vendorOnboarding.getList.status = action.payload?.status || 200;
      state.vendorOnboarding.getList.error = null;
      if (responseData?.columns && Array.isArray(responseData.columns)) {
        state.vendorOnboarding.columnPreferences.data = responseData.columns;
        state.vendorOnboarding.columnPreferences.error = null;
      }
    });
    builder.addCase(getVendorOnboardingTaskList.rejected, (state, action) => {
      state.vendorOnboarding.getList.isLoading = false;
      state.vendorOnboarding.getList.error = action.payload;
      state.vendorOnboarding.getList.status = action.payload?.status || 500;
    });

    // getVendorOnboardingColumnPreferences
    builder.addCase(getVendorOnboardingColumnPreferences.pending, (state) => {
      state.vendorOnboarding.columnPreferences.isLoading = true;
      state.vendorOnboarding.columnPreferences.error = null;
    });
    builder.addCase(getVendorOnboardingColumnPreferences.fulfilled, (state, action) => {
      state.vendorOnboarding.columnPreferences.isLoading = false;
      state.vendorOnboarding.columnPreferences.data =
        action.payload?.message || action.payload?.data || action.payload;
      state.vendorOnboarding.columnPreferences.status = action.payload?.status || 200;
      state.vendorOnboarding.columnPreferences.error = null;
    });
    builder.addCase(getVendorOnboardingColumnPreferences.rejected, (state, action) => {
      state.vendorOnboarding.columnPreferences.isLoading = false;
      state.vendorOnboarding.columnPreferences.error = action.payload;
      state.vendorOnboarding.columnPreferences.status = action.payload?.status || 500;
    });

    // saveVendorOnboardingColumnPreferences
    builder.addCase(saveVendorOnboardingColumnPreferences.pending, (state) => {
      state.vendorOnboarding.columnPreferences.isLoading = true;
      state.vendorOnboarding.columnPreferences.error = null;
    });
    builder.addCase(saveVendorOnboardingColumnPreferences.fulfilled, (state) => {
      state.vendorOnboarding.columnPreferences.isLoading = false;
      state.vendorOnboarding.columnPreferences.error = null;
    });
    builder.addCase(saveVendorOnboardingColumnPreferences.rejected, (state, action) => {
      state.vendorOnboarding.columnPreferences.isLoading = false;
      state.vendorOnboarding.columnPreferences.error = action.payload;
    });
  },
});

export default settingSlice.reducer;
