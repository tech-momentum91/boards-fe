import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import {
  acknowledgeFloorLayoutVersion,
  acknowledgeFloorVersionForTask,
  createProjectLayout,
  createProjectLayoutAreas,
  deleteProjectLayoutArea,
  editProjectLayoutArea,
  getLayoutAreas,
  getProjectLayout,
  lockFloorLayout,
  updateProjectLayout,
} from '@/api/projectLayout';
import {
  flattenLayoutAreasFromFloors,
  getLayoutAreasForFloor,
} from '@/components/projects/shared/project-layout-areas-helpers';
import { getProjectArea, getProjectAreasList } from '@/api/projectAreas';
import {
  buildProjectAreasCacheKey,
  mapProjectAreaRecord,
} from '@/components/projects/project-area-helpers';
import { buildProjectFloorsUpdatePayload, projectHasFloor } from '@/components/projects/shared';
import {
  normalizeProjectColumnConfigResponse,
  resolveProjectColumnTableConfig,
} from '@/components/projects/column-config';
import {
  buildPublicSnagFormCacheKey,
  buildPublicSnagSubmitFormData,
  resolvePublicSnagFormUrl,
} from '@/components/projects/snags/project-snag-helpers';

const PROJECT_SNAG_SHARE_LINK_API =
  '/method/devx.devx_project.api.tasks.get_project_snag_share_link';
const PUBLIC_SNAG_FORM_CONTEXT_API =
  '/method/devx.devx_project.api.tasks.get_public_snag_form_context';
const PUBLIC_SNAG_SUBMIT_API = '/method/devx.devx_project.api.tasks.submit_public_snag';

const initialState = {
  listview: {
    data: null,
    isLoading: false,
    error: null,
  },
  create: {
    isLoading: false,
    error: null,
  },
  membersUpdate: {
    isLoading: false,
    error: null,
    latestRequestId: null,
  },
  accounts: {
    data: [],
    isLoading: false,
    error: null,
  },
  customers: {
    data: [],
    isLoading: false,
    error: null,
  },
  tasksListview: {
    data: null,
    isLoading: false,
    error: null,
  },
  layoutsListview: {
    data: null,
    isLoading: false,
    error: null,
  },
  gfcListview: {
    data: null,
    isLoading: false,
    error: null,
  },
  threeDListview: {
    data: null,
    isLoading: false,
    error: null,
  },
  threeDGalleryListview: {
    data: null,
    isLoading: false,
    error: null,
  },
  graphicsListview: {
    data: null,
    isLoading: false,
    error: null,
  },
  graphicsGalleryListview: {
    data: null,
    isLoading: false,
    error: null,
  },
  documentsListview: {
    data: null,
    isLoading: false,
    error: null,
  },
  snagsListview: {
    data: null,
    isLoading: false,
    error: null,
  },
  areasListview: {
    data: null,
    isLoading: false,
    error: null,
  },
  areaDetail: {
    data: null,
    isLoading: false,
    error: null,
  },
  taskDetail: {
    data: null,
    isLoading: false,
    error: null,
  },
  layoutDetail: {
    data: null,
    isLoading: false,
    error: null,
  },
  layoutComments: {
    data: null,
    isLoading: false,
    error: null,
  },
  layoutCreate: {
    isLoading: false,
    error: null,
  },
  layoutAreaMutation: {
    isLoading: false,
    error: null,
  },
  taskUpdate: {
    isLoading: false,
    error: null,
  },
  taskCreate: {
    isLoading: false,
    error: null,
  },
  projectDetail: {
    data: null,
    isLoading: false,
    error: null,
  },
  projectAreas: {
    byKey: {},
  },
  snagShareLink: {
    data: null,
    isLoading: false,
    error: null,
  },
  publicSnagForm: {
    context: null,
    cacheKey: null,
    isLoading: false,
    error: null,
  },
  publicSnagSubmit: {
    isLoading: false,
    error: null,
  },
  projectSelection: {
    data: null,
    isLoading: false,
    error: null,
  },
  selectionComments: {
    data: { comments: [], history: [] },
    status: 'idle',
    error: null,
  },
  collectionComments: {
    data: null,
    isLoading: false,
    error: null,
  },
};

/**
 * Project list — `devx.devx_project.api.projects.get_project_listview`
 * Supports: keyword, order_by, filters (JSON array), page, limit_page_length
 */
export const fetchProjectListview = createAsyncThunk(
  'project/fetchProjectListview',
  async (
    {
      keyword = '',
      order_by = 'creation desc',
      filters = [],
      page = 1,
      limit_page_length = 20,
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const formData = new FormData();
      formData.append('page', String(page));
      formData.append('limit_page_length', String(limit_page_length));
      formData.append('order_by', order_by);

      const trimmedKeyword = String(keyword ?? '').trim();
      if (trimmedKeyword) {
        formData.append('keyword', trimmedKeyword);
      }

      if (Array.isArray(filters) && filters.length > 0) {
        formData.append('filters', JSON.stringify(filters));
      }

      const response = await apiClient.post(
        '/method/devx.devx_project.api.projects.get_project_listview',
        formData,
      );

      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to load projects',
      );
    }
  },
);

/** Active CRM accounts for project create / account dropdown and list filters */
export const fetchProjectAccounts = createAsyncThunk(
  'project/fetchProjectAccounts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/method/devx.devx_crm.api.crm_account.get_crm_account_options',
      );

      const rawAccounts = response?.data?.message ?? response?.data ?? [];
      if (!Array.isArray(rawAccounts)) {
        return [];
      }

      const seen = new Set();

      return rawAccounts
        .filter((account) => String(account?.value ?? account?.name ?? '').trim())
        .map((account) => ({
          value: String(account.value ?? account.name).trim(),
          label: String(
            account.label ?? account.customer_name ?? account.value ?? account.name,
          ).trim(),
        }))
        .filter((account) => {
          if (!account.value || seen.has(account.value)) return false;
          seen.add(account.value);
          return true;
        })
        .sort((left, right) => left.label.localeCompare(right.label));
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to load accounts',
      );
    }
  },
);

export const fetchProjectColumnConfig = createAsyncThunk(
  'project/fetchProjectColumnConfig',
  async ({ tableId }, { rejectWithValue }) => {
    try {
      const tableConfig = resolveProjectColumnTableConfig(tableId);
      if (!tableConfig) {
        return rejectWithValue(`Unknown project column table: ${tableId}`);
      }

      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: {
          doctype: tableConfig.doctype,
          react_table_id: tableConfig.react_table_id,
        },
      });

      return normalizeProjectColumnConfigResponse(response?.data);
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load column config',
      );
    }
  },
);

export const saveProjectColumnConfig = createAsyncThunk(
  'project/saveProjectColumnConfig',
  async ({ tableId, columns }, { rejectWithValue }) => {
    try {
      const tableConfig = resolveProjectColumnTableConfig(tableId);
      if (!tableConfig) {
        return rejectWithValue(`Unknown project column table: ${tableId}`);
      }

      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: tableConfig.doctype,
        react_table_id: tableConfig.react_table_id,
        columns,
      });

      return response?.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to save column config',
      );
    }
  },
);

/** Active customers for project create customer dropdown */
export const fetchProjectCustomers = createAsyncThunk(
  'project/fetchProjectCustomers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/resource/Customer', {
        params: {
          fields: JSON.stringify(['name', 'customer_name']),
          filters: JSON.stringify([['disabled', '=', 0]]),
          order_by: 'customer_name asc',
          limit_page_length: 999,
        },
      });

      const rawCustomers = response?.data?.data ?? [];
      if (!Array.isArray(rawCustomers)) {
        return [];
      }

      const seen = new Set();

      return rawCustomers
        .map((customer) => {
          const value = String(customer?.name ?? '').trim();
          if (!value) return null;
          return {
            value,
            label: String(customer?.customer_name || value).trim(),
          };
        })
        .filter((customer) => {
          if (!customer?.value || seen.has(customer.value)) return false;
          seen.add(customer.value);
          return true;
        })
        .sort((left, right) => left.label.localeCompare(right.label));
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to load customers',
      );
    }
  },
);

/**
 * Project tasks grouped listview — `devx.devx_project.api.tasks.get_project_tasks_listview`
 */
export const fetchProjectTasksListview = createAsyncThunk(
  'project/fetchProjectTasksListview',
  async (
    {
      project,
      keyword = '',
      group_by = '',
      order_by = 'creation desc',
      filters = [],
      task_type = 'Project Tasks',
      page = 1,
      limit_page_length = 999,
    } = {},
    { rejectWithValue },
  ) => {
    const projectId = String(project ?? '').trim();
    if (!projectId) {
      return rejectWithValue('project is required');
    }

    try {
      const formData = new FormData();
      formData.append('project', projectId);
      formData.append('task_type', task_type);
      formData.append('page', String(page));
      formData.append('limit_page_length', String(limit_page_length));
      formData.append('order_by', order_by);

      const trimmedKeyword = String(keyword ?? '').trim();
      if (trimmedKeyword) {
        formData.append('keyword', trimmedKeyword);
      }

      const trimmedGroupBy = String(group_by ?? '').trim();
      if (trimmedGroupBy) {
        formData.append('group_by', trimmedGroupBy);
      }

      if (Array.isArray(filters) && filters.length > 0) {
        formData.append('filters', JSON.stringify(filters));
      }

      const response = await apiClient.post(
        '/method/devx.devx_project.api.tasks.get_project_tasks_listview',
        formData,
      );

      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load project tasks',
      );
    }
  },
);

/**
 * Project layouts grouped listview — same endpoint as tasks with `task_type: Layout Tasks`.
 */
export const fetchProjectLayoutsListview = createAsyncThunk(
  'project/fetchProjectLayoutsListview',
  async (
    {
      project,
      keyword = '',
      group_by = '',
      order_by = 'creation desc',
      filters = [],
      page = 1,
      limit_page_length = 999,
    } = {},
    { rejectWithValue },
  ) => {
    const projectId = String(project ?? '').trim();
    if (!projectId) {
      return rejectWithValue('project is required');
    }

    try {
      const formData = new FormData();
      formData.append('project', projectId);
      formData.append('task_type', 'Layout Tasks');
      formData.append('page', String(page));
      formData.append('limit_page_length', String(limit_page_length));
      formData.append('order_by', order_by);

      const trimmedKeyword = String(keyword ?? '').trim();
      if (trimmedKeyword) {
        formData.append('keyword', trimmedKeyword);
      }

      const trimmedGroupBy = String(group_by ?? '').trim();
      if (trimmedGroupBy) {
        formData.append('group_by', trimmedGroupBy);
      }

      if (Array.isArray(filters) && filters.length > 0) {
        formData.append('filters', JSON.stringify(filters));
      }

      const response = await apiClient.post(
        '/method/devx.devx_project.api.tasks.get_project_tasks_listview',
        formData,
      );

      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load project layouts',
      );
    }
  },
);

/**
 * Project GFC grouped listview — same endpoint with `task_type: GFC Tasks`.
 */
export const fetchProjectGfcListview = createAsyncThunk(
  'project/fetchProjectGfcListview',
  async (
    {
      project,
      keyword = '',
      group_by = '',
      order_by = 'creation desc',
      filters = [],
      page = 1,
      limit_page_length = 999,
    } = {},
    { rejectWithValue },
  ) => {
    const projectId = String(project ?? '').trim();
    if (!projectId) {
      return rejectWithValue('project is required');
    }

    try {
      const formData = new FormData();
      formData.append('project', projectId);
      formData.append('task_type', 'GFC Tasks');
      formData.append('page', String(page));
      formData.append('limit_page_length', String(limit_page_length));
      formData.append('order_by', order_by);

      const trimmedKeyword = String(keyword ?? '').trim();
      if (trimmedKeyword) {
        formData.append('keyword', trimmedKeyword);
      }

      const trimmedGroupBy = String(group_by ?? '').trim();
      if (trimmedGroupBy) {
        formData.append('group_by', trimmedGroupBy);
      }

      if (Array.isArray(filters) && filters.length > 0) {
        formData.append('filters', JSON.stringify(filters));
      }

      const response = await apiClient.post(
        '/method/devx.devx_project.api.tasks.get_project_tasks_listview',
        formData,
      );

      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load project GFC tasks',
      );
    }
  },
);

/**
 * Project areas grouped listview.
 */
export const fetchProjectAreasListview = createAsyncThunk(
  'project/fetchProjectAreasListview',
  async (params = {}, { rejectWithValue }) => {
    const projectId = String(params?.project ?? '').trim();
    if (!projectId) {
      return rejectWithValue('project is required');
    }

    try {
      return await getProjectAreasList(params);
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load project areas',
      );
    }
  },
);

/**
 * Project 3D grouped listview — same endpoint with `task_type: 3D Tasks`.
 */
export const fetchProjectThreeDListview = createAsyncThunk(
  'project/fetchProjectThreeDListview',
  async (
    {
      project,
      keyword = '',
      group_by = '',
      order_by = 'creation desc',
      filters = [],
      page = 1,
      limit_page_length = 999,
    } = {},
    { rejectWithValue },
  ) => {
    const projectId = String(project ?? '').trim();
    if (!projectId) {
      return rejectWithValue('project is required');
    }

    try {
      const formData = new FormData();
      formData.append('project', projectId);
      formData.append('task_type', '3D Tasks');
      formData.append('page', String(page));
      formData.append('limit_page_length', String(limit_page_length));
      formData.append('order_by', order_by);

      const trimmedKeyword = String(keyword ?? '').trim();
      if (trimmedKeyword) {
        formData.append('keyword', trimmedKeyword);
      }

      const trimmedGroupBy = String(group_by ?? '').trim();
      if (trimmedGroupBy) {
        formData.append('group_by', trimmedGroupBy);
      }

      if (Array.isArray(filters) && filters.length > 0) {
        formData.append('filters', JSON.stringify(filters));
      }

      const response = await apiClient.post(
        '/method/devx.devx_project.api.tasks.get_project_tasks_listview',
        formData,
      );

      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load project 3D tasks',
      );
    }
  },
);

/**
 * Project 3D gallery list — latest version per task with cover image.
 */
export const fetchProjectThreeDGalleryListview = createAsyncThunk(
  'project/fetchProjectThreeDGalleryListview',
  async (
    {
      project,
      keyword = '',
      order_by = 'creation desc',
      filters = [],
      page = 1,
      limit_page_length = 20,
    } = {},
    { rejectWithValue },
  ) => {
    const projectId = String(project ?? '').trim();
    if (!projectId) {
      return rejectWithValue('project is required');
    }

    try {
      const formData = new FormData();
      formData.append('project', projectId);
      formData.append('task_type', '3D Tasks');
      formData.append('gallery_view', '1');
      formData.append('page', String(page));
      formData.append('limit_page_length', String(limit_page_length));
      formData.append('order_by', order_by);

      const trimmedKeyword = String(keyword ?? '').trim();
      if (trimmedKeyword) {
        formData.append('keyword', trimmedKeyword);
      }

      if (Array.isArray(filters) && filters.length > 0) {
        formData.append('filters', JSON.stringify(filters));
      }

      const response = await apiClient.post(
        '/method/devx.devx_project.api.tasks.get_project_tasks_listview',
        formData,
      );

      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load project 3D gallery',
      );
    }
  },
);

/**
 * All versions + image attachments for a 3D task gallery preview.
 */
export const fetchProjectThreeDVersionedImages = createAsyncThunk(
  'project/fetchProjectThreeDVersionedImages',
  async (taskId, { rejectWithValue }) => {
    const id = String(taskId ?? '').trim();
    if (!id) {
      return rejectWithValue('task_id is required');
    }

    try {
      const formData = new FormData();
      formData.append('task_id', id);

      const response = await apiClient.post(
        '/method/devx.devx_project.api.tasks.get_versioned_task_images',
        formData,
      );

      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load 3D version images',
      );
    }
  },
);

/**
 * Project Graphics grouped listview — same endpoint with `task_type: Graphics Tasks`.
 */
export const fetchProjectGraphicsListview = createAsyncThunk(
  'project/fetchProjectGraphicsListview',
  async (
    {
      project,
      keyword = '',
      group_by = '',
      order_by = 'creation desc',
      filters = [],
      page = 1,
      limit_page_length = 999,
    } = {},
    { rejectWithValue },
  ) => {
    const projectId = String(project ?? '').trim();
    if (!projectId) {
      return rejectWithValue('project is required');
    }

    try {
      const formData = new FormData();
      formData.append('project', projectId);
      formData.append('task_type', 'Graphics Tasks');
      formData.append('page', String(page));
      formData.append('limit_page_length', String(limit_page_length));
      formData.append('order_by', order_by);

      const trimmedKeyword = String(keyword ?? '').trim();
      if (trimmedKeyword) {
        formData.append('keyword', trimmedKeyword);
      }

      const trimmedGroupBy = String(group_by ?? '').trim();
      if (trimmedGroupBy) {
        formData.append('group_by', trimmedGroupBy);
      }

      if (Array.isArray(filters) && filters.length > 0) {
        formData.append('filters', JSON.stringify(filters));
      }

      const response = await apiClient.post(
        '/method/devx.devx_project.api.tasks.get_project_tasks_listview',
        formData,
      );

      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load project graphics tasks',
      );
    }
  },
);

/**
 * Project Graphics gallery list — latest version per task with cover image.
 */
export const fetchProjectGraphicsGalleryListview = createAsyncThunk(
  'project/fetchProjectGraphicsGalleryListview',
  async (
    {
      project,
      keyword = '',
      order_by = 'creation desc',
      filters = [],
      page = 1,
      limit_page_length = 20,
    } = {},
    { rejectWithValue },
  ) => {
    const projectId = String(project ?? '').trim();
    if (!projectId) {
      return rejectWithValue('project is required');
    }

    try {
      const formData = new FormData();
      formData.append('project', projectId);
      formData.append('task_type', 'Graphics Tasks');
      formData.append('gallery_view', '1');
      formData.append('page', String(page));
      formData.append('limit_page_length', String(limit_page_length));
      formData.append('order_by', order_by);

      const trimmedKeyword = String(keyword ?? '').trim();
      if (trimmedKeyword) {
        formData.append('keyword', trimmedKeyword);
      }

      if (Array.isArray(filters) && filters.length > 0) {
        formData.append('filters', JSON.stringify(filters));
      }

      const response = await apiClient.post(
        '/method/devx.devx_project.api.tasks.get_project_tasks_listview',
        formData,
      );

      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load project graphics gallery',
      );
    }
  },
);

/** All versions + image attachments for a Graphics task gallery preview. */
export const fetchProjectGraphicsVersionedImages = createAsyncThunk(
  'project/fetchProjectGraphicsVersionedImages',
  async (taskId, { rejectWithValue }) => {
    const id = String(taskId ?? '').trim();
    if (!id) {
      return rejectWithValue('task_id is required');
    }

    try {
      const formData = new FormData();
      formData.append('task_id', id);

      const response = await apiClient.post(
        '/method/devx.devx_project.api.tasks.get_versioned_task_images',
        formData,
      );

      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load graphics version images',
      );
    }
  },
);

/**
 * Project snags grouped listview — same endpoint with `task_type: Snag Tasks`.
 */
export const fetchProjectSnagsListview = createAsyncThunk(
  'project/fetchProjectSnagsListview',
  async (
    {
      project,
      keyword = '',
      group_by = '',
      order_by = 'creation desc',
      filters = [],
      page = 1,
      limit_page_length = 999,
    } = {},
    { rejectWithValue },
  ) => {
    const projectId = String(project ?? '').trim();
    if (!projectId) {
      return rejectWithValue('project is required');
    }

    try {
      const formData = new FormData();
      formData.append('project', projectId);
      formData.append('task_type', 'Snag Tasks');
      formData.append('page', String(page));
      formData.append('limit_page_length', String(limit_page_length));
      formData.append('order_by', order_by);

      const trimmedKeyword = String(keyword ?? '').trim();
      if (trimmedKeyword) {
        formData.append('keyword', trimmedKeyword);
      }

      const trimmedGroupBy = String(group_by ?? '').trim();
      if (trimmedGroupBy) {
        formData.append('group_by', trimmedGroupBy);
      }

      if (Array.isArray(filters) && filters.length > 0) {
        formData.append('filters', JSON.stringify(filters));
      }

      const response = await apiClient.post(
        '/method/devx.devx_project.api.tasks.get_project_tasks_listview',
        formData,
      );

      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load project snags',
      );
    }
  },
);

/**
 * Project documents grouped listview — same endpoint with `task_type: Document Tasks`.
 */
export const fetchProjectDocumentsListview = createAsyncThunk(
  'project/fetchProjectDocumentsListview',
  async (
    {
      project,
      keyword = '',
      group_by = '',
      order_by = 'creation desc',
      filters = [],
      page = 1,
      limit_page_length = 999,
    } = {},
    { rejectWithValue },
  ) => {
    const projectId = String(project ?? '').trim();
    if (!projectId) {
      return rejectWithValue('project is required');
    }

    try {
      const formData = new FormData();
      formData.append('project', projectId);
      formData.append('task_type', 'Document Tasks');
      formData.append('page', String(page));
      formData.append('limit_page_length', String(limit_page_length));
      formData.append('order_by', order_by);

      const trimmedKeyword = String(keyword ?? '').trim();
      if (trimmedKeyword) {
        formData.append('keyword', trimmedKeyword);
      }

      const trimmedGroupBy = String(group_by ?? '').trim();
      if (trimmedGroupBy) {
        formData.append('group_by', trimmedGroupBy);
      }

      if (Array.isArray(filters) && filters.length > 0) {
        formData.append('filters', JSON.stringify(filters));
      }

      const response = await apiClient.post(
        '/method/devx.devx_project.api.tasks.get_project_tasks_listview',
        formData,
      );

      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load project documents',
      );
    }
  },
);

/**
 * Project area detail — layout preview and full area fields.
 */
export const fetchProjectAreaDetail = createAsyncThunk(
  'project/fetchProjectAreaDetail',
  async (areaId, { rejectWithValue }) => {
    const id = String(areaId ?? '').trim();
    if (!id) return rejectWithValue('Area ID is required');

    try {
      return await getProjectArea(id);
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load project area details',
      );
    }
  },
);

export const fetchProjectTaskDetail = createAsyncThunk(
  'project/fetchProjectTaskDetail',
  async (taskId, { rejectWithValue }) => {
    const id = String(taskId ?? '').trim();
    if (!id) return rejectWithValue('Task ID is required');

    try {
      const response = await apiClient.get('/method/devx.devx_project.api.tasks.get_project_task', {
        params: { task_id: id },
      });
      const payload = response.data?.message ?? response.data;
      return payload?.data ?? payload;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load project task details',
      );
    }
  },
);

export const fetchProjectLayoutDetail = createAsyncThunk(
  'project/fetchProjectLayoutDetail',
  async (layoutId, { rejectWithValue }) => {
    const id = String(layoutId ?? '').trim();
    if (!id) return rejectWithValue('Layout ID is required');

    try {
      return await getProjectLayout(id);
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load project layout details',
      );
    }
  },
);

export const fetchProjectLayoutComments = createAsyncThunk(
  'project/fetchProjectLayoutComments',
  async ({ layoutId }, { rejectWithValue }) => {
    const id = String(layoutId ?? '').trim();
    if (!id) return rejectWithValue('Layout ID is required');

    try {
      const response = await apiClient.get(
        '/method/devx.devx_project.api.project_comment_activity.get_project_activities',
        {
          params: {
            reference_doctype: 'Project Layout',
            reference_name: id,
          },
        },
      );
      const activities = response?.data?.message || {};
      const mappedComments = (activities.comments || []).map((comment) => ({
        ...comment,
        content: comment.content || comment.comment,
        commented_by: comment.commented_by || comment.comment_by,
        comment_doctype: comment.comment_doctype || comment.doctype || 'Project Comment',
      }));
      return {
        comments: mappedComments,
        history: activities.history || [],
      };
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load layout comments',
      );
    }
  },
);

export const addProjectLayoutComment = createAsyncThunk(
  'project/addProjectLayoutComment',
  async ({ layoutId, content, attachments = [], parentCommentId = null }, { rejectWithValue }) => {
    const id = String(layoutId ?? '').trim();
    const hasContent = content != null && String(content).trim().length > 0;
    const hasAttachments = attachments && attachments.length > 0;
    if (!id) return rejectWithValue('Layout ID is required');
    if (!hasContent && !hasAttachments) {
      return rejectWithValue('Comment text or at least one attachment is required');
    }

    try {
      const formData = new FormData();
      formData.append('reference_doctype', 'Project Layout');
      formData.append('reference_name', id);
      formData.append('content', content ?? '');
      if (parentCommentId != null && String(parentCommentId).trim() !== '') {
        formData.append('parent_comment', String(parentCommentId).trim());
      }
      if (hasAttachments) {
        attachments.forEach((att) => {
          const file = att?.file ?? att;
          if (file instanceof File) {
            formData.append('files[]', file);
          }
        });
      }

      const response = await apiClient.post(
        '/method/devx.devx_project.api.project_comment_activity.add_project_comment_with_files',
        formData,
      );
      return response?.data?.message ?? response?.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to add layout comment',
      );
    }
  },
);

export const updateProjectTask = createAsyncThunk(
  'project/updateProjectTask',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.devx_project.api.tasks.update_project_task',
        formData,
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to update project task',
      );
    }
  },
);

export const fetchProjectDetail = createAsyncThunk(
  'project/fetchProjectDetail',
  async (projectId, { rejectWithValue }) => {
    const id = String(projectId ?? '').trim();
    if (!id) return rejectWithValue('Project ID is required');

    try {
      const response = await apiClient.get(`/resource/Project/${encodeURIComponent(id)}`);
      const data = response.data?.data ?? response.data;

      if (data?.custom_crm_account && !data.crm_account_name) {
        try {
          const accountResponse = await apiClient.get(
            `/resource/CRM Account/${encodeURIComponent(data.custom_crm_account)}`,
          );
          const accountData = accountResponse.data?.data ?? accountResponse.data;
          if (accountData?.customer_name) {
            data.crm_account_name = accountData.customer_name;
          }
        } catch {
          // Account name is optional for the header; fall back to CRM account link.
        }
      }

      return data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load project details',
      );
    }
  },
);

export const addProjectFloor = createAsyncThunk(
  'project/addProjectFloor',
  async ({ projectId, floor, project }, { rejectWithValue }) => {
    const id = String(projectId ?? '').trim();
    const trimmedFloor = String(floor ?? '').trim();

    if (!id) return rejectWithValue('Project ID is required');
    if (!trimmedFloor) return rejectWithValue('Floor name is required');

    try {
      if (projectHasFloor(project, trimmedFloor)) {
        return rejectWithValue('This floor already exists');
      }

      const response = await apiClient.put(`/resource/Project/${encodeURIComponent(id)}`, {
        ...buildProjectFloorsUpdatePayload(project, trimmedFloor),
      });

      const data = response.data?.data ?? response.data;

      if (data?.custom_crm_account && !data.crm_account_name && project?.crm_account_name) {
        data.crm_account_name = project.crm_account_name;
      }

      return { floor: trimmedFloor, project: data };
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to add floor',
      );
    }
  },
);

export const createProjectTask = createAsyncThunk(
  'project/createProjectTask',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.devx_project.api.tasks.create_project_task',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to create project task',
      );
    }
  },
);

export const createProjectLayoutThunk = createAsyncThunk(
  'project/createProjectLayout',
  async ({ payload, attachments = [] }, { rejectWithValue }) => {
    try {
      return await createProjectLayout(payload, attachments);
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to create layout',
      );
    }
  },
);

export const updateProjectLayoutThunk = createAsyncThunk(
  'project/updateProjectLayout',
  async ({ layoutId, payload, attachments = [] }, { rejectWithValue }) => {
    try {
      return await updateProjectLayout(layoutId, payload, attachments);
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to update layout',
      );
    }
  },
);

export const createProjectTaskNewVersion = createAsyncThunk(
  'project/createProjectTaskNewVersion',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.devx_project.api.tasks.create_new_version',
        formData,
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to create new version',
      );
    }
  },
);

export const lockProjectFloorLayout = createAsyncThunk(
  'project/lockProjectFloorLayout',
  async (layoutId, { rejectWithValue }) => {
    try {
      return await lockFloorLayout(layoutId);
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to lock floor layout',
      );
    }
  },
);

export const createProjectLayoutAreasThunk = createAsyncThunk(
  'project/createProjectLayoutAreas',
  async (payload, { rejectWithValue }) => {
    try {
      return await createProjectLayoutAreas(payload);
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to create layout areas',
      );
    }
  },
);

export const editProjectLayoutAreaThunk = createAsyncThunk(
  'project/editProjectLayoutArea',
  async (payload, { rejectWithValue }) => {
    try {
      return await editProjectLayoutArea(payload);
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to update layout area',
      );
    }
  },
);

export const deleteProjectLayoutAreaThunk = createAsyncThunk(
  'project/deleteProjectLayoutArea',
  async (areaId, { rejectWithValue }) => {
    try {
      return await deleteProjectLayoutArea(areaId);
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to delete layout area',
      );
    }
  },
);

export const acknowledgeProjectFloorLayoutVersion = createAsyncThunk(
  'project/acknowledgeProjectFloorLayoutVersion',
  async ({ layoutId, floorLockedVersion }, { rejectWithValue }) => {
    try {
      return await acknowledgeFloorLayoutVersion(layoutId, floorLockedVersion);
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to sync layout to floor version',
      );
    }
  },
);

export const acknowledgeProjectFloorVersionForTask = createAsyncThunk(
  'project/acknowledgeProjectFloorVersionForTask',
  async ({ taskId, floorLockedVersion }, { rejectWithValue }) => {
    try {
      return await acknowledgeFloorVersionForTask(taskId, floorLockedVersion);
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to sync task to floor version',
      );
    }
  },
);

export const createProject = createAsyncThunk(
  'project/createProject',
  async (payload, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      Object.entries(payload ?? {}).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      });

      const response = await apiClient.post(
        '/method/devx.devx_project.api.projects.create_project',
        formData,
      );

      const message = response.data?.message ?? response.data;
      return message?.data ?? message;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to create project',
      );
    }
  },
);

export const updateProjectMembers = createAsyncThunk(
  'project/updateProjectMembers',
  async ({ projectId, users }, { rejectWithValue }) => {
    const id = String(projectId ?? '').trim();
    if (!id) return rejectWithValue('Project ID is required');

    try {
      const formData = new FormData();
      formData.append('name', id);
      formData.append('users', JSON.stringify(Array.isArray(users) ? users : []));

      const response = await apiClient.post(
        '/method/devx.devx_project.api.projects.update_project',
        formData,
      );

      const message = response.data?.message ?? response.data;
      return message?.data ?? message;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to update project members',
      );
    }
  },
);

export const updateProject = createAsyncThunk(
  'project/updateProject',
  async ({ projectId, fields = {} }, { rejectWithValue }) => {
    const id = String(projectId ?? '').trim();
    if (!id) return rejectWithValue('Project ID is required');

    try {
      const formData = new FormData();
      formData.append('name', id);

      Object.entries(fields ?? {}).forEach(([key, value]) => {
        if (value === undefined) return;
        formData.append(
          key,
          value === null || typeof value === 'object' ? JSON.stringify(value) : String(value),
        );
      });

      const response = await apiClient.post(
        '/method/devx.devx_project.api.projects.update_project',
        formData,
      );

      const message = response.data?.message ?? response.data;
      return { projectId: id, data: message?.data ?? message, fields };
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to update project',
      );
    }
  },
);

/**
 * Layout area dropdown options — devx.devx_project.api.layout.get_layout_areas
 * Returns areas from a project's Active layouts (optionally scoped by floor).
 * Each area's `area_id` becomes the value stored in the task `custom_area` field.
 */
export const fetchProjectAreas = createAsyncThunk(
  'project/fetchProjectAreas',
  async ({ projectId, floor }, { rejectWithValue }) => {
    const key = buildProjectAreasCacheKey(projectId, floor);
    const normalizedProject = String(projectId ?? '').trim();

    if (!normalizedProject) {
      return { key, records: [] };
    }

    try {
      const normalizedFloor = String(floor ?? '').trim();
      const result = await getLayoutAreas({
        project: normalizedProject,
        ...(normalizedFloor ? { floor: normalizedFloor } : {}),
      });

      const floors = Array.isArray(result?.floors) ? result.floors : [];
      const areas = normalizedFloor
        ? getLayoutAreasForFloor(floors, normalizedFloor)
        : flattenLayoutAreasFromFloors(floors);

      const records = areas
        .map((area) =>
          mapProjectAreaRecord({
            name: area?.area_id,
            area: area?.area_label,
            floor: area?.floor,
            project: normalizedProject,
          }),
        )
        .filter(Boolean);

      return { key, records };
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to fetch layout area records',
      );
    }
  },
  {
    condition: ({ projectId, floor, force = false }, { getState }) => {
      if (force) return true;

      const key = buildProjectAreasCacheKey(projectId, floor);
      const entry = getState().project?.projectAreas?.byKey?.[key];
      if (!entry) return true;
      if (entry.isLoading) return false;
      return entry.records === undefined;
    },
  },
);

/**
 * External snag share link — GET get_project_snag_share_link
 */
export const fetchProjectSnagShareLink = createAsyncThunk(
  'project/fetchProjectSnagShareLink',
  async (projectId, { rejectWithValue }) => {
    const normalizedProject = String(projectId ?? '').trim();
    if (!normalizedProject) {
      return rejectWithValue('project is required');
    }

    try {
      const response = await apiClient.get(PROJECT_SNAG_SHARE_LINK_API, {
        params: { project: normalizedProject },
      });
      const data = response.data?.message ?? response.data;
      return {
        ...data,
        url: resolvePublicSnagFormUrl(data),
      };
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load snag share link',
      );
    }
  },
);

/**
 * Public snag form context — GET get_public_snag_form_context (guest)
 */
export const fetchPublicSnagFormContext = createAsyncThunk(
  'project/fetchPublicSnagFormContext',
  async ({ projectId, key }, { rejectWithValue }) => {
    const normalizedProject = String(projectId ?? '').trim();
    const normalizedKey = String(key ?? '').trim();
    const cacheKey = buildPublicSnagFormCacheKey(normalizedProject, normalizedKey);

    if (!normalizedProject || !normalizedKey) {
      return rejectWithValue('Invalid snag form link');
    }

    try {
      const response = await apiClient.get(PUBLIC_SNAG_FORM_CONTEXT_API, {
        params: { project: normalizedProject, key: normalizedKey },
      });
      const context = response.data?.message ?? response.data;
      return { cacheKey, context };
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load public snag form',
      );
    }
  },
  {
    condition: ({ projectId, key, force = false }, { getState }) => {
      if (force) return true;

      const cacheKey = buildPublicSnagFormCacheKey(projectId, key);
      const entry = getState().project?.publicSnagForm;
      if (!entry) return true;
      if (entry.isLoading) return false;
      return entry.cacheKey !== cacheKey || !entry.context;
    },
  },
);

/**
 * Public snag submission — POST submit_public_snag (guest)
 */
export const submitPublicSnag = createAsyncThunk(
  'project/submitPublicSnag',
  async (
    { projectId, key, values, attachments = [], markerCoordinates = null },
    { rejectWithValue },
  ) => {
    const normalizedProject = String(projectId ?? '').trim();
    const normalizedKey = String(key ?? '').trim();

    if (!normalizedProject || !normalizedKey) {
      return rejectWithValue('Invalid snag form link');
    }

    try {
      const formData = buildPublicSnagSubmitFormData(
        normalizedProject,
        normalizedKey,
        values,
        attachments,
        markerCoordinates,
      );
      const response = await apiClient.post(PUBLIC_SNAG_SUBMIT_API, formData);
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to submit snag',
      );
    }
  },
);

export const fetchProjectSelection = createAsyncThunk(
  'project/fetchProjectSelection',
  async ({ projectId } = {}, { rejectWithValue }) => {
    const normalizedProject = String(projectId ?? '').trim();
    if (!normalizedProject) {
      return rejectWithValue('Project is required');
    }

    try {
      const formData = new FormData();
      formData.append('project', normalizedProject);
      const response = await apiClient.post(
        '/method/devx.api.project_selection.get_project_selection',
        formData,
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to load selection',
      );
    }
  },
);

export const fetchProjectSelectionComments = createAsyncThunk(
  'project/fetchProjectSelectionComments',
  async ({ selectionId }, { rejectWithValue }) => {
    const id = String(selectionId ?? '').trim();
    if (!id) return rejectWithValue('Selection ID is required');

    try {
      // Same pattern as Agreement: GET with query params so form_dict is always populated.
      const response = await apiClient.get(
        '/method/devx.devx_project.api.project_comment_activity.get_project_activities',
        {
          params: {
            reference_doctype: 'Project Selection',
            reference_name: id,
          },
        },
      );
      const activities = response?.data?.message || {};
      const mappedComments = (activities.comments || []).map((comment) => ({
        ...comment,
        content: comment.content || comment.comment,
        commented_by: comment.commented_by || comment.comment_by,
        comment_doctype: comment.comment_doctype || comment.doctype || 'Project Comment',
      }));
      return {
        comments: mappedComments,
        history: activities.history || [],
      };
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load selection comments',
      );
    }
  },
);

export const addProjectSelectionComment = createAsyncThunk(
  'project/addProjectSelectionComment',
  async (
    { selectionId, content, attachments = [], parentCommentId = null },
    { rejectWithValue },
  ) => {
    const id = String(selectionId ?? '').trim();
    const hasContent = content != null && String(content).trim().length > 0;
    const hasAttachments = attachments && attachments.length > 0;
    if (!id) return rejectWithValue('Selection ID is required');
    if (!hasContent && !hasAttachments) {
      return rejectWithValue('Comment text or at least one attachment is required');
    }

    try {
      const formData = new FormData();
      formData.append('reference_doctype', 'Project Selection');
      formData.append('reference_name', id);
      formData.append('content', content ?? '');
      if (parentCommentId != null && String(parentCommentId).trim() !== '') {
        formData.append('parent_comment', String(parentCommentId).trim());
      }
      if (hasAttachments) {
        attachments.forEach((att) => {
          const file = att?.file ?? att;
          if (file instanceof File) {
            formData.append('files[]', file);
          }
        });
      }

      const response = await apiClient.post(
        '/method/devx.devx_project.api.project_comment_activity.add_project_comment_with_files',
        formData,
      );
      return response?.data?.message ?? response?.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to add selection comment',
      );
    }
  },
);

export const fetchProjectCollectionComments = createAsyncThunk(
  'project/fetchProjectCollectionComments',
  async ({ collectionBoqId }, { rejectWithValue }) => {
    const id = String(collectionBoqId ?? '').trim();
    if (!id) return rejectWithValue('Collection BOQ ID is required');

    try {
      const response = await apiClient.get(
        '/method/devx.devx_project.api.project_comment_activity.get_project_activities',
        {
          params: {
            reference_doctype: 'Project Collection BOQ',
            reference_name: id,
          },
        },
      );
      const activities = response?.data?.message || {};
      const mappedComments = (activities.comments || []).map((comment) => ({
        ...comment,
        content: comment.content || comment.comment,
        commented_by: comment.commented_by || comment.comment_by,
        comment_doctype: comment.comment_doctype || comment.doctype || 'Project Comment',
      }));
      return {
        comments: mappedComments,
        history: activities.history || [],
      };
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to load collection comments',
      );
    }
  },
);

export const addProjectCollectionComment = createAsyncThunk(
  'project/addProjectCollectionComment',
  async (
    { collectionBoqId, content, attachments = [], parentCommentId = null },
    { rejectWithValue },
  ) => {
    const id = String(collectionBoqId ?? '').trim();
    const hasContent = content != null && String(content).trim().length > 0;
    const hasAttachments = attachments && attachments.length > 0;
    if (!id) return rejectWithValue('Collection BOQ ID is required');
    if (!hasContent && !hasAttachments) {
      return rejectWithValue('Comment text or at least one attachment is required');
    }

    try {
      const formData = new FormData();
      formData.append('reference_doctype', 'Project Collection BOQ');
      formData.append('reference_name', id);
      formData.append('content', content ?? '');
      if (parentCommentId != null && String(parentCommentId).trim() !== '') {
        formData.append('parent_comment', String(parentCommentId).trim());
      }
      if (hasAttachments) {
        attachments.forEach((att) => {
          const file = att?.file ?? att;
          if (file instanceof File) {
            formData.append('files[]', file);
          }
        });
      }

      const response = await apiClient.post(
        '/method/devx.devx_project.api.project_comment_activity.add_project_comment_with_files',
        formData,
      );
      return response?.data?.message ?? response?.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to add collection comment',
      );
    }
  },
);

export const syncProjectSelection = createAsyncThunk(
  'project/syncProjectSelection',
  async ({ projectId } = {}, { rejectWithValue }) => {
    const normalizedProject = String(projectId ?? '').trim();
    if (!normalizedProject) {
      return rejectWithValue('Project is required');
    }

    try {
      const formData = new FormData();
      formData.append('project', normalizedProject);
      const response = await apiClient.post(
        '/method/devx.api.project_selection.sync_project_selection',
        formData,
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ?? error?.response?.data ?? error?.message ?? 'Failed to sync selection',
      );
    }
  },
);

export const updateProjectSelectionCategory = createAsyncThunk(
  'project/updateProjectSelectionCategory',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.project_selection.update_project_selection_category',
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

export const updateProjectSelectionItem = createAsyncThunk(
  'project/updateProjectSelectionItem',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.project_selection.update_project_selection_item',
        formData,
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to update selection item',
      );
    }
  },
);

export const addProjectSelectionCategory = createAsyncThunk(
  'project/addProjectSelectionCategory',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.project_selection.add_project_selection_category',
        formData,
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to add selection category',
      );
    }
  },
);

export const addProjectSelectionItem = createAsyncThunk(
  'project/addProjectSelectionItem',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.project_selection.add_project_selection_item',
        formData,
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to add selection item',
      );
    }
  },
);

export const addProjectSelectionCustomColumn = createAsyncThunk(
  'project/addProjectSelectionCustomColumn',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.project_selection.add_project_selection_custom_column',
        formData,
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to add custom column',
      );
    }
  },
);

export const removeProjectSelectionCustomColumn = createAsyncThunk(
  'project/removeProjectSelectionCustomColumn',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.api.project_selection.remove_project_selection_custom_column',
        formData,
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error?.serialized ??
          error?.response?.data ??
          error?.message ??
          'Failed to remove custom column',
      );
    }
  },
);

export const fetchAvailableSelectionCategories = createAsyncThunk(
  'project/fetchAvailableSelectionCategories',
  async ({ projectId } = {}, { rejectWithValue }) => {
    try {
      const params = {};
      if (projectId) params.project = String(projectId).trim();
      const response = await apiClient.get(
        '/method/devx.api.project_selection.get_available_selection_categories',
        { params },
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

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    clearProjectTaskDetail(state) {
      state.taskDetail.data = null;
      state.taskDetail.error = null;
    },
    clearProjectAreaDetail(state) {
      state.areaDetail.data = null;
      state.areaDetail.error = null;
    },
    clearProjectLayoutDetail(state) {
      state.layoutDetail.data = null;
      state.layoutDetail.error = null;
      state.layoutComments.data = null;
      state.layoutComments.error = null;
    },
    clearProjectCollectionComments(state) {
      state.collectionComments.data = null;
      state.collectionComments.error = null;
    },
    patchProjectAreaDetailField(state, action) {
      const { fieldName, value } = action.payload ?? {};
      if (!state.areaDetail.data || !fieldName) return;

      if (fieldName === 'description') {
        state.areaDetail.data.description = value ?? '';
      } else if (fieldName === 'area_label' || fieldName === 'title') {
        state.areaDetail.data.area_label = value ?? '';
      } else if (fieldName in state.areaDetail.data) {
        state.areaDetail.data[fieldName] = value;
      }
    },
    patchProjectTaskDetailField(state, action) {
      const { fieldName, value } = action.payload ?? {};
      if (!state.taskDetail.data || !fieldName) return;

      const data = state.taskDetail.data;
      switch (fieldName) {
        case 'description':
          data.description = value ?? '';
          break;
        case 'title':
        case 'subject':
          data.subject = value ?? '';
          break;
        case 'status':
          data.status = value ?? '';
          break;
        case 'priority':
          data.priority = value ?? '';
          break;
        case 'floor':
        case 'custom_floor':
          data.custom_floor = value ?? '';
          break;
        case 'area':
        case 'custom_area':
          data.custom_area = value ?? '';
          break;
        case 'custom_stage':
          data.custom_stage = value ?? '';
          break;
        case 'due_date':
        case 'exp_end_date':
          data.exp_end_date = value ?? '';
          break;
        case 'assigned_to':
        case 'assignees':
          data._assign = Array.isArray(value) ? JSON.stringify(value) : (value ?? '');
          break;
        case 'tags':
          data.tags = Array.isArray(value) ? value.filter(Boolean) : [];
          break;
        default:
          if (fieldName in data) data[fieldName] = value;
      }
    },
    patchProjectLayoutDetailField(state, action) {
      const { fieldName, value } = action.payload ?? {};
      if (!state.layoutDetail.data || !fieldName) return;

      const data = state.layoutDetail.data;
      switch (fieldName) {
        case 'description':
          data.description = value ?? '';
          break;
        case 'status':
          data.status = value ?? '';
          break;
        case 'title':
        case 'subject':
          data.subject = value ?? '';
          break;
        case 'priority':
          data.priority = value ?? '';
          break;
        case 'floor':
        case 'custom_floor':
          data.floor = value ?? '';
          break;
        case 'layout_type':
        case 'custom_layout_type':
          data.layout_type = value ?? '';
          break;
        case 'due_date':
        case 'exp_end_date':
          data.due_date = value ?? '';
          break;
        case 'assigned_to':
        case 'assignees':
          data._assign = Array.isArray(value) ? JSON.stringify(value) : (value ?? '');
          data.assignee = Array.isArray(value) ? value : [];
          break;
        case 'tags':
          data.tags = Array.isArray(value) ? value : [];
          break;
        default:
          data[fieldName] = value;
      }
    },
    clearProjectAreasCache(state) {
      state.projectAreas.byKey = {};
    },
    patchProjectListviewField(state, action) {
      const { projectId, fieldName, value } = action.payload ?? {};
      const id = String(projectId ?? '').trim();
      const field = String(fieldName ?? '').trim();
      if (!id || !field || !Array.isArray(state.listview.data?.results)) return;

      state.listview.data = {
        ...state.listview.data,
        results: state.listview.data.results.map((row) =>
          String(row?.name ?? '').trim() === id ? { ...row, [field]: value } : row,
        ),
      };
    },
    clearPublicSnagForm(state) {
      state.publicSnagForm.context = null;
      state.publicSnagForm.cacheKey = null;
      state.publicSnagForm.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchProjectListview.pending, (state) => {
      state.listview.isLoading = true;
      state.listview.error = null;
    });

    builder.addCase(fetchProjectListview.fulfilled, (state, action) => {
      const payload = action.payload;
      const append = Boolean(action.meta?.arg?.append);

      if (append && Array.isArray(state.listview.data?.results)) {
        state.listview.data = {
          ...payload,
          results: [...state.listview.data.results, ...(payload?.results ?? [])],
        };
      } else {
        state.listview.data = payload;
      }

      state.listview.isLoading = false;
      state.listview.error = null;
    });

    builder.addCase(fetchProjectListview.rejected, (state, action) => {
      state.listview.data = null;
      state.listview.isLoading = false;
      state.listview.error = action.payload;
    });

    builder.addCase(createProject.pending, (state) => {
      state.create.isLoading = true;
      state.create.error = null;
    });

    builder.addCase(createProject.fulfilled, (state) => {
      state.create.isLoading = false;
      state.create.error = null;
    });

    builder.addCase(createProject.rejected, (state, action) => {
      state.create.isLoading = false;
      state.create.error = action.payload;
    });

    builder.addCase(updateProjectMembers.pending, (state, action) => {
      state.membersUpdate.isLoading = true;
      state.membersUpdate.error = null;
      state.membersUpdate.latestRequestId = action.meta.requestId;
    });

    builder.addCase(updateProjectMembers.fulfilled, (state, action) => {
      // Ignore superseded responses so an older slower save cannot overwrite a newer one.
      if (action.meta.requestId !== state.membersUpdate.latestRequestId) return;
      state.membersUpdate.isLoading = false;
      state.membersUpdate.error = null;
      const data = action.payload;
      if (data?.name && state.projectDetail?.data?.name === data.name) {
        state.projectDetail.data = {
          ...state.projectDetail.data,
          users: Array.isArray(data.users) ? data.users : state.projectDetail.data.users,
        };
      }
    });

    builder.addCase(updateProjectMembers.rejected, (state, action) => {
      if (action.meta.requestId !== state.membersUpdate.latestRequestId) return;
      state.membersUpdate.isLoading = false;
      state.membersUpdate.error = action.payload;
    });

    builder.addCase(fetchProjectAccounts.pending, (state) => {
      state.accounts.isLoading = true;
      state.accounts.error = null;
    });

    builder.addCase(fetchProjectAccounts.fulfilled, (state, action) => {
      state.accounts.data = action.payload;
      state.accounts.isLoading = false;
      state.accounts.error = null;
    });

    builder.addCase(fetchProjectAccounts.rejected, (state, action) => {
      state.accounts.data = [];
      state.accounts.isLoading = false;
      state.accounts.error = action.payload;
    });

    builder.addCase(fetchProjectCustomers.pending, (state) => {
      state.customers.isLoading = true;
      state.customers.error = null;
    });

    builder.addCase(fetchProjectCustomers.fulfilled, (state, action) => {
      state.customers.data = action.payload;
      state.customers.isLoading = false;
      state.customers.error = null;
    });

    builder.addCase(fetchProjectCustomers.rejected, (state, action) => {
      state.customers.data = [];
      state.customers.isLoading = false;
      state.customers.error = action.payload;
    });

    builder.addCase(fetchProjectTasksListview.pending, (state) => {
      state.tasksListview.isLoading = true;
      state.tasksListview.error = null;
    });

    builder.addCase(fetchProjectTasksListview.fulfilled, (state, action) => {
      state.tasksListview.data = action.payload;
      state.tasksListview.isLoading = false;
      state.tasksListview.error = null;
    });

    builder.addCase(fetchProjectTasksListview.rejected, (state, action) => {
      state.tasksListview.data = null;
      state.tasksListview.isLoading = false;
      state.tasksListview.error = action.payload;
    });

    builder.addCase(fetchProjectLayoutsListview.pending, (state) => {
      state.layoutsListview.isLoading = true;
      state.layoutsListview.error = null;
    });

    builder.addCase(fetchProjectLayoutsListview.fulfilled, (state, action) => {
      state.layoutsListview.data = action.payload;
      state.layoutsListview.isLoading = false;
      state.layoutsListview.error = null;
    });

    builder.addCase(fetchProjectLayoutsListview.rejected, (state, action) => {
      state.layoutsListview.data = null;
      state.layoutsListview.isLoading = false;
      state.layoutsListview.error = action.payload;
    });

    builder.addCase(fetchProjectGfcListview.pending, (state) => {
      state.gfcListview.isLoading = true;
      state.gfcListview.error = null;
    });

    builder.addCase(fetchProjectGfcListview.fulfilled, (state, action) => {
      state.gfcListview.data = action.payload;
      state.gfcListview.isLoading = false;
      state.gfcListview.error = null;
    });

    builder.addCase(fetchProjectGfcListview.rejected, (state, action) => {
      state.gfcListview.data = null;
      state.gfcListview.isLoading = false;
      state.gfcListview.error = action.payload;
    });

    builder.addCase(fetchProjectThreeDListview.pending, (state) => {
      state.threeDListview.isLoading = true;
      state.threeDListview.error = null;
    });

    builder.addCase(fetchProjectThreeDListview.fulfilled, (state, action) => {
      state.threeDListview.data = action.payload;
      state.threeDListview.isLoading = false;
      state.threeDListview.error = null;
    });

    builder.addCase(fetchProjectThreeDListview.rejected, (state, action) => {
      state.threeDListview.data = null;
      state.threeDListview.isLoading = false;
      state.threeDListview.error = action.payload;
    });

    builder.addCase(fetchProjectThreeDGalleryListview.pending, (state) => {
      state.threeDGalleryListview.isLoading = true;
      state.threeDGalleryListview.error = null;
    });

    builder.addCase(fetchProjectThreeDGalleryListview.fulfilled, (state, action) => {
      const payload = action.payload;
      const append = Boolean(action.meta?.arg?.append);

      if (append && Array.isArray(state.threeDGalleryListview.data?.results)) {
        state.threeDGalleryListview.data = {
          ...payload,
          results: [...state.threeDGalleryListview.data.results, ...(payload?.results ?? [])],
        };
      } else {
        state.threeDGalleryListview.data = payload;
      }

      state.threeDGalleryListview.isLoading = false;
      state.threeDGalleryListview.error = null;
    });

    builder.addCase(fetchProjectThreeDGalleryListview.rejected, (state, action) => {
      state.threeDGalleryListview.data = null;
      state.threeDGalleryListview.isLoading = false;
      state.threeDGalleryListview.error = action.payload;
    });

    builder.addCase(fetchProjectGraphicsListview.pending, (state) => {
      state.graphicsListview.isLoading = true;
      state.graphicsListview.error = null;
    });

    builder.addCase(fetchProjectGraphicsListview.fulfilled, (state, action) => {
      state.graphicsListview.data = action.payload;
      state.graphicsListview.isLoading = false;
      state.graphicsListview.error = null;
    });

    builder.addCase(fetchProjectGraphicsListview.rejected, (state, action) => {
      state.graphicsListview.data = null;
      state.graphicsListview.isLoading = false;
      state.graphicsListview.error = action.payload;
    });

    builder.addCase(fetchProjectGraphicsGalleryListview.pending, (state) => {
      state.graphicsGalleryListview.isLoading = true;
      state.graphicsGalleryListview.error = null;
    });

    builder.addCase(fetchProjectGraphicsGalleryListview.fulfilled, (state, action) => {
      const payload = action.payload;
      const append = Boolean(action.meta?.arg?.append);

      if (append && Array.isArray(state.graphicsGalleryListview.data?.results)) {
        state.graphicsGalleryListview.data = {
          ...payload,
          results: [...state.graphicsGalleryListview.data.results, ...(payload?.results ?? [])],
        };
      } else {
        state.graphicsGalleryListview.data = payload;
      }

      state.graphicsGalleryListview.isLoading = false;
      state.graphicsGalleryListview.error = null;
    });

    builder.addCase(fetchProjectGraphicsGalleryListview.rejected, (state, action) => {
      state.graphicsGalleryListview.data = null;
      state.graphicsGalleryListview.isLoading = false;
      state.graphicsGalleryListview.error = action.payload;
    });

    builder.addCase(fetchProjectSnagsListview.pending, (state) => {
      state.snagsListview.isLoading = true;
      state.snagsListview.error = null;
    });

    builder.addCase(fetchProjectSnagsListview.fulfilled, (state, action) => {
      state.snagsListview.data = action.payload;
      state.snagsListview.isLoading = false;
      state.snagsListview.error = null;
    });

    builder.addCase(fetchProjectSnagsListview.rejected, (state, action) => {
      state.snagsListview.data = null;
      state.snagsListview.isLoading = false;
      state.snagsListview.error = action.payload;
    });

    builder.addCase(fetchProjectAreasListview.pending, (state) => {
      state.areasListview.isLoading = true;
      state.areasListview.error = null;
    });

    builder.addCase(fetchProjectAreasListview.fulfilled, (state, action) => {
      state.areasListview.data = action.payload;
      state.areasListview.isLoading = false;
      state.areasListview.error = null;
    });

    builder.addCase(fetchProjectAreasListview.rejected, (state, action) => {
      state.areasListview.data = null;
      state.areasListview.isLoading = false;
      state.areasListview.error = action.payload;
    });

    builder.addCase(fetchProjectAreaDetail.pending, (state) => {
      state.areaDetail.isLoading = true;
      state.areaDetail.error = null;
    });

    builder.addCase(fetchProjectAreaDetail.fulfilled, (state, action) => {
      state.areaDetail.data = action.payload;
      state.areaDetail.isLoading = false;
      state.areaDetail.error = null;
    });

    builder.addCase(fetchProjectAreaDetail.rejected, (state, action) => {
      state.areaDetail.data = null;
      state.areaDetail.isLoading = false;
      state.areaDetail.error = action.payload;
    });

    builder.addCase(fetchProjectDocumentsListview.pending, (state) => {
      state.documentsListview.isLoading = true;
      state.documentsListview.error = null;
    });

    builder.addCase(fetchProjectDocumentsListview.fulfilled, (state, action) => {
      state.documentsListview.data = action.payload;
      state.documentsListview.isLoading = false;
      state.documentsListview.error = null;
    });

    builder.addCase(fetchProjectDocumentsListview.rejected, (state, action) => {
      state.documentsListview.data = null;
      state.documentsListview.isLoading = false;
      state.documentsListview.error = action.payload;
    });

    builder.addCase(fetchProjectTaskDetail.pending, (state) => {
      state.taskDetail.isLoading = true;
      state.taskDetail.error = null;
    });

    builder.addCase(fetchProjectTaskDetail.fulfilled, (state, action) => {
      state.taskDetail.data = action.payload;
      state.taskDetail.isLoading = false;
      state.taskDetail.error = null;
    });

    builder.addCase(fetchProjectTaskDetail.rejected, (state, action) => {
      state.taskDetail.data = null;
      state.taskDetail.isLoading = false;
      state.taskDetail.error = action.payload;
    });

    builder.addCase(fetchProjectLayoutDetail.pending, (state) => {
      state.layoutDetail.isLoading = true;
      state.layoutDetail.error = null;
    });

    builder.addCase(fetchProjectLayoutDetail.fulfilled, (state, action) => {
      state.layoutDetail.data = action.payload;
      state.layoutDetail.isLoading = false;
      state.layoutDetail.error = null;
    });

    builder.addCase(fetchProjectLayoutDetail.rejected, (state, action) => {
      state.layoutDetail.data = null;
      state.layoutDetail.isLoading = false;
      state.layoutDetail.error = action.payload;
    });

    builder.addCase(fetchProjectLayoutComments.pending, (state) => {
      state.layoutComments.isLoading = true;
      state.layoutComments.error = null;
    });

    builder.addCase(fetchProjectLayoutComments.fulfilled, (state, action) => {
      state.layoutComments.data = action.payload;
      state.layoutComments.isLoading = false;
      state.layoutComments.error = null;
    });

    builder.addCase(fetchProjectLayoutComments.rejected, (state, action) => {
      state.layoutComments.data = { comments: [], history: [] };
      state.layoutComments.isLoading = false;
      state.layoutComments.error = action.payload;
    });

    builder.addCase(updateProjectTask.pending, (state) => {
      state.taskUpdate.isLoading = true;
      state.taskUpdate.error = null;
    });

    builder.addCase(updateProjectTask.fulfilled, (state) => {
      state.taskUpdate.isLoading = false;
      state.taskUpdate.error = null;
    });

    builder.addCase(updateProjectTask.rejected, (state, action) => {
      state.taskUpdate.isLoading = false;
      state.taskUpdate.error = action.payload;
    });

    builder.addCase(createProjectTask.pending, (state) => {
      state.taskCreate.isLoading = true;
      state.taskCreate.error = null;
    });

    builder.addCase(createProjectTask.fulfilled, (state) => {
      state.taskCreate.isLoading = false;
      state.taskCreate.error = null;
    });

    builder.addCase(createProjectTask.rejected, (state, action) => {
      state.taskCreate.isLoading = false;
      state.taskCreate.error = action.payload;
    });

    builder.addCase(createProjectLayoutThunk.pending, (state) => {
      state.layoutCreate.isLoading = true;
      state.layoutCreate.error = null;
    });

    builder.addCase(createProjectLayoutThunk.fulfilled, (state) => {
      state.layoutCreate.isLoading = false;
      state.layoutCreate.error = null;
    });

    builder.addCase(createProjectLayoutThunk.rejected, (state, action) => {
      state.layoutCreate.isLoading = false;
      state.layoutCreate.error = action.payload;
    });

    builder.addCase(createProjectLayoutAreasThunk.pending, (state) => {
      state.layoutAreaMutation.isLoading = true;
      state.layoutAreaMutation.error = null;
    });

    builder.addCase(createProjectLayoutAreasThunk.fulfilled, (state) => {
      state.layoutAreaMutation.isLoading = false;
      state.layoutAreaMutation.error = null;
    });

    builder.addCase(createProjectLayoutAreasThunk.rejected, (state, action) => {
      state.layoutAreaMutation.isLoading = false;
      state.layoutAreaMutation.error = action.payload;
    });

    builder.addCase(editProjectLayoutAreaThunk.pending, (state) => {
      state.layoutAreaMutation.isLoading = true;
      state.layoutAreaMutation.error = null;
    });

    builder.addCase(editProjectLayoutAreaThunk.fulfilled, (state) => {
      state.layoutAreaMutation.isLoading = false;
      state.layoutAreaMutation.error = null;
    });

    builder.addCase(editProjectLayoutAreaThunk.rejected, (state, action) => {
      state.layoutAreaMutation.isLoading = false;
      state.layoutAreaMutation.error = action.payload;
    });

    builder.addCase(deleteProjectLayoutAreaThunk.pending, (state) => {
      state.layoutAreaMutation.isLoading = true;
      state.layoutAreaMutation.error = null;
    });

    builder.addCase(deleteProjectLayoutAreaThunk.fulfilled, (state) => {
      state.layoutAreaMutation.isLoading = false;
      state.layoutAreaMutation.error = null;
    });

    builder.addCase(deleteProjectLayoutAreaThunk.rejected, (state, action) => {
      state.layoutAreaMutation.isLoading = false;
      state.layoutAreaMutation.error = action.payload;
    });

    builder.addCase(updateProjectLayoutThunk.pending, (state) => {
      state.taskUpdate.isLoading = true;
      state.taskUpdate.error = null;
    });

    builder.addCase(updateProjectLayoutThunk.fulfilled, (state) => {
      state.taskUpdate.isLoading = false;
      state.taskUpdate.error = null;
    });

    builder.addCase(updateProjectLayoutThunk.rejected, (state, action) => {
      state.taskUpdate.isLoading = false;
      state.taskUpdate.error = action.payload;
    });

    builder.addCase(fetchProjectDetail.pending, (state) => {
      state.projectDetail.isLoading = true;
      state.projectDetail.error = null;
    });

    builder.addCase(fetchProjectDetail.fulfilled, (state, action) => {
      state.projectDetail.data = action.payload;
      state.projectDetail.isLoading = false;
      state.projectDetail.error = null;
    });

    builder.addCase(fetchProjectDetail.rejected, (state, action) => {
      state.projectDetail.data = null;
      state.projectDetail.isLoading = false;
      state.projectDetail.error = action.payload;
    });

    builder.addCase(addProjectFloor.fulfilled, (state, action) => {
      if (action.payload?.project) {
        state.projectDetail.data = action.payload.project;
      }
      state.projectDetail.isLoading = false;
      state.projectDetail.error = null;
    });

    builder.addCase(fetchProjectAreas.pending, (state, action) => {
      const key = buildProjectAreasCacheKey(action.meta.arg?.projectId, action.meta.arg?.floor);
      if (!state.projectAreas.byKey[key]) {
        state.projectAreas.byKey[key] = { records: undefined, isLoading: false, error: null };
      }
      state.projectAreas.byKey[key].isLoading = true;
      state.projectAreas.byKey[key].error = null;
    });

    builder.addCase(fetchProjectAreas.fulfilled, (state, action) => {
      const { key, records } = action.payload ?? {};
      if (!key) return;
      state.projectAreas.byKey[key] = {
        records: records ?? [],
        isLoading: false,
        error: null,
      };
    });

    builder.addCase(fetchProjectAreas.rejected, (state, action) => {
      const key = buildProjectAreasCacheKey(action.meta.arg?.projectId, action.meta.arg?.floor);
      if (!key) return;
      state.projectAreas.byKey[key] = {
        records: [],
        isLoading: false,
        error: action.payload,
      };
    });

    builder.addCase(fetchProjectSnagShareLink.pending, (state) => {
      state.snagShareLink.isLoading = true;
      state.snagShareLink.error = null;
    });

    builder.addCase(fetchProjectSnagShareLink.fulfilled, (state, action) => {
      state.snagShareLink.data = action.payload;
      state.snagShareLink.isLoading = false;
      state.snagShareLink.error = null;
    });

    builder.addCase(fetchProjectSnagShareLink.rejected, (state, action) => {
      state.snagShareLink.isLoading = false;
      state.snagShareLink.error = action.payload;
    });

    builder.addCase(fetchPublicSnagFormContext.pending, (state) => {
      state.publicSnagForm.isLoading = true;
      state.publicSnagForm.error = null;
    });

    builder.addCase(fetchPublicSnagFormContext.fulfilled, (state, action) => {
      state.publicSnagForm.context = action.payload?.context ?? null;
      state.publicSnagForm.cacheKey = action.payload?.cacheKey ?? null;
      state.publicSnagForm.isLoading = false;
      state.publicSnagForm.error = null;
    });

    builder.addCase(fetchPublicSnagFormContext.rejected, (state, action) => {
      state.publicSnagForm.context = null;
      state.publicSnagForm.isLoading = false;
      state.publicSnagForm.error = action.payload;
    });

    builder.addCase(submitPublicSnag.pending, (state) => {
      state.publicSnagSubmit.isLoading = true;
      state.publicSnagSubmit.error = null;
    });

    builder.addCase(submitPublicSnag.fulfilled, (state) => {
      state.publicSnagSubmit.isLoading = false;
      state.publicSnagSubmit.error = null;
    });

    builder.addCase(submitPublicSnag.rejected, (state, action) => {
      state.publicSnagSubmit.isLoading = false;
      state.publicSnagSubmit.error = action.payload;
    });

    builder.addCase(fetchProjectSelection.pending, (state) => {
      state.projectSelection.isLoading = true;
      state.projectSelection.error = null;
    });

    builder.addCase(fetchProjectSelection.fulfilled, (state, action) => {
      state.projectSelection.data = action.payload;
      state.projectSelection.isLoading = false;
      state.projectSelection.error = null;
    });

    builder.addCase(fetchProjectSelection.rejected, (state, action) => {
      state.projectSelection.data = null;
      state.projectSelection.isLoading = false;
      state.projectSelection.error = action.payload;
    });

    builder.addCase(fetchProjectSelectionComments.pending, (state) => {
      state.selectionComments.status = 'loading';
      state.selectionComments.error = null;
    });

    builder.addCase(fetchProjectSelectionComments.fulfilled, (state, action) => {
      state.selectionComments.status = 'succeeded';
      state.selectionComments.data = {
        comments: action.payload?.comments || [],
        history: action.payload?.history || [],
      };
      state.selectionComments.error = null;
    });

    builder.addCase(fetchProjectSelectionComments.rejected, (state, action) => {
      state.selectionComments.status = 'failed';
      state.selectionComments.data = { comments: [], history: [] };
      state.selectionComments.error = action.payload;
    });

    builder.addCase(fetchProjectCollectionComments.pending, (state) => {
      state.collectionComments.isLoading = true;
      state.collectionComments.error = null;
    });

    builder.addCase(fetchProjectCollectionComments.fulfilled, (state, action) => {
      state.collectionComments.data = {
        comments: action.payload?.comments || [],
        history: action.payload?.history || [],
      };
      state.collectionComments.isLoading = false;
      state.collectionComments.error = null;
    });

    builder.addCase(fetchProjectCollectionComments.rejected, (state, action) => {
      state.collectionComments.data = { comments: [], history: [] };
      state.collectionComments.isLoading = false;
      state.collectionComments.error = action.payload;
    });
  },
});

export const {
  clearProjectTaskDetail,
  clearProjectLayoutDetail,
  clearProjectAreaDetail,
  clearProjectCollectionComments,
  patchProjectTaskDetailField,
  patchProjectLayoutDetailField,
  patchProjectAreaDetailField,
  patchProjectListviewField,
  clearProjectAreasCache,
  clearPublicSnagForm,
} = projectSlice.actions;

export const selectProjectListview = (state) => state.project?.listview?.data;

export const selectProjectListviewLoading = (state) => Boolean(state.project?.listview?.isLoading);

export const selectProjectCreateLoading = (state) => Boolean(state.project?.create?.isLoading);

export const selectProjectMembersUpdateLoading = (state) =>
  Boolean(state.project?.membersUpdate?.isLoading);

export const selectProjectAccounts = (state) => state.project?.accounts?.data ?? [];

export const selectProjectAccountsLoading = (state) => Boolean(state.project?.accounts?.isLoading);

export const selectProjectCustomers = (state) => state.project?.customers?.data ?? [];

export const selectProjectCustomersLoading = (state) =>
  Boolean(state.project?.customers?.isLoading);

export const selectProjectTasksListview = (state) => state.project?.tasksListview?.data;

export const selectProjectTasksListviewLoading = (state) =>
  Boolean(state.project?.tasksListview?.isLoading);

export const selectProjectLayoutsListview = (state) => state.project?.layoutsListview?.data;

export const selectProjectLayoutsListviewLoading = (state) =>
  Boolean(state.project?.layoutsListview?.isLoading);

export const selectProjectGfcListview = (state) => state.project?.gfcListview?.data;

export const selectProjectGfcListviewLoading = (state) =>
  Boolean(state.project?.gfcListview?.isLoading);

export const selectProjectThreeDListview = (state) => state.project?.threeDListview?.data;

export const selectProjectThreeDListviewLoading = (state) =>
  Boolean(state.project?.threeDListview?.isLoading);

export const selectProjectThreeDGalleryListview = (state) =>
  state.project?.threeDGalleryListview?.data;

export const selectProjectThreeDGalleryListviewLoading = (state) =>
  Boolean(state.project?.threeDGalleryListview?.isLoading);

export const selectProjectGraphicsListview = (state) => state.project?.graphicsListview?.data;

export const selectProjectGraphicsListviewLoading = (state) =>
  Boolean(state.project?.graphicsListview?.isLoading);

export const selectProjectGraphicsGalleryListview = (state) =>
  state.project?.graphicsGalleryListview?.data;

export const selectProjectGraphicsGalleryListviewLoading = (state) =>
  Boolean(state.project?.graphicsGalleryListview?.isLoading);

export const selectProjectDocumentsListview = (state) => state.project?.documentsListview?.data;

export const selectProjectDocumentsListviewLoading = (state) =>
  Boolean(state.project?.documentsListview?.isLoading);

export const selectProjectSnagsListview = (state) => state.project?.snagsListview?.data;

export const selectProjectSnagsListviewLoading = (state) =>
  Boolean(state.project?.snagsListview?.isLoading);

export const selectProjectSelection = (state) => state.project?.projectSelection?.data;

export const selectProjectSelectionLoading = (state) =>
  Boolean(state.project?.projectSelection?.isLoading);

export const selectProjectSelectionComments = (state) =>
  state.project?.selectionComments || {
    data: { comments: [], history: [] },
    status: 'idle',
    error: null,
  };

export const selectProjectCollectionComments = (state) => state.project?.collectionComments;

export const selectProjectAreasListview = (state) => state.project?.areasListview?.data;

export const selectProjectAreasListviewLoading = (state) =>
  Boolean(state.project?.areasListview?.isLoading);

export const selectProjectAreaDetail = (state) => state.project?.areaDetail?.data;

export const selectProjectAreaDetailLoading = (state) =>
  Boolean(state.project?.areaDetail?.isLoading);

export const selectProjectTaskDetail = (state) => state.project?.taskDetail?.data;

export const selectProjectTaskDetailLoading = (state) =>
  Boolean(state.project?.taskDetail?.isLoading);

export const selectProjectTaskUpdateLoading = (state) =>
  Boolean(state.project?.taskUpdate?.isLoading);

export const selectProjectTaskCreateLoading = (state) =>
  Boolean(state.project?.taskCreate?.isLoading);

export const selectProjectLayoutDetail = (state) => state.project?.layoutDetail?.data;

export const selectProjectLayoutDetailLoading = (state) =>
  Boolean(state.project?.layoutDetail?.isLoading);

export const selectProjectLayoutDetailError = (state) => state.project?.layoutDetail?.error;

export const selectProjectLayoutComments = (state) => state.project?.layoutComments;

export const selectProjectLayoutCreateLoading = (state) =>
  Boolean(state.project?.layoutCreate?.isLoading);

export const selectProjectLayoutAreaMutationLoading = (state) =>
  Boolean(state.project?.layoutAreaMutation?.isLoading);

export const selectProjectDetail = (state) => state.project?.projectDetail?.data;

export const selectProjectDetailLoading = (state) =>
  Boolean(state.project?.projectDetail?.isLoading);

export const selectProjectDetailError = (state) => state.project?.projectDetail?.error;

export const selectProjectAreasEntry = (state, projectId, floor) => {
  const key = buildProjectAreasCacheKey(projectId, floor);
  return state.project?.projectAreas?.byKey?.[key];
};

const EMPTY_PROJECT_AREA_RECORDS = [];

export const selectProjectAreasRecords = (state, projectId, floor) =>
  selectProjectAreasEntry(state, projectId, floor)?.records ?? EMPTY_PROJECT_AREA_RECORDS;

export const selectProjectAreasLoading = (state, projectId, floor) =>
  Boolean(selectProjectAreasEntry(state, projectId, floor)?.isLoading);

export const selectProjectSnagShareLink = (state) => state.project?.snagShareLink?.data;

export const selectProjectSnagShareLinkLoading = (state) =>
  Boolean(state.project?.snagShareLink?.isLoading);

export const selectPublicSnagFormContext = (state) => state.project?.publicSnagForm?.context;

export const selectPublicSnagFormLoading = (state) =>
  Boolean(state.project?.publicSnagForm?.isLoading);

export const selectPublicSnagFormError = (state) => state.project?.publicSnagForm?.error;

export const selectPublicSnagSubmitLoading = (state) =>
  Boolean(state.project?.publicSnagSubmit?.isLoading);

export default projectSlice.reducer;
