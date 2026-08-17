import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import { normalizePartnerDocument } from '@/utils/partner-document';
import { serializeError } from '@/utils/error-utils';
import { parseTags } from '@/utils/task-utils';

/**
 * List view sometimes omits `tags` after row updates. Preserve prior tags per row
 * when the new payload has no tag field (same behaviour as partner master list).
 */
function mergePartnerCrmTaskListPreserveTags(prevData, nextData) {
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

function normalizePartnerCrmTaskListPayload(apiResponse) {
  const raw = apiResponse?.message ?? apiResponse?.data ?? apiResponse;
  if (Array.isArray(raw)) {
    return { results: raw, columns: [] };
  }
  if (raw && typeof raw === 'object') {
    return {
      ...raw,
      results: raw.results || raw.data || [],
      columns: raw.columns || [],
    };
  }
  return { results: [], columns: [] };
}

const PARTNER_DOCTYPE = 'Partner';

/** Build filters array from applied filters for partner listview API */
const buildPartnerApiFilters = (applied) => {
  const filters = [];
  const src = applied || {};

  if (Array.isArray(src.primaryCategory) && src.primaryCategory.length > 0) {
    filters.push(
      src.primaryCategory.length === 1
        ? ['primary_category', '=', src.primaryCategory[0]]
        : ['primary_category', 'in', src.primaryCategory],
    );
  }
  if (Array.isArray(src.secondaryCategory) && src.secondaryCategory.length > 0) {
    filters.push(
      src.secondaryCategory.length === 1
        ? ['secondary_category', '=', src.secondaryCategory[0]]
        : ['secondary_category', 'in', src.secondaryCategory],
    );
  }
  if (Array.isArray(src.industry) && src.industry.length > 0) {
    filters.push(
      src.industry.length === 1
        ? ['industry_type', '=', src.industry[0]]
        : ['industry_type', 'in', src.industry],
    );
  }
  if (Array.isArray(src.baseCity) && src.baseCity.length > 0) {
    filters.push(
      src.baseCity.length === 1
        ? ['partner_base_city', '=', src.baseCity[0]]
        : ['partner_base_city', 'in', src.baseCity],
    );
  }
  if (Array.isArray(src.companySize) && src.companySize.length > 0) {
    filters.push(
      src.companySize.length === 1
        ? ['company_size', '=', src.companySize[0]]
        : ['company_size', 'in', src.companySize],
    );
  }
  if (Array.isArray(src.revenueModel) && src.revenueModel.length > 0) {
    filters.push(
      src.revenueModel.length === 1
        ? ['revenue_model', 'in', `${src.revenueModel[0]}`]
        : ['revenue_model', 'in', src.revenueModel],
    );
  }
  if (Array.isArray(src.engagementFrequency) && src.engagementFrequency.length > 0) {
    filters.push(
      src.engagementFrequency.length === 1
        ? ['estimated_engagement_frequency', '=', src.engagementFrequency[0]]
        : ['estimated_engagement_frequency', 'in', src.engagementFrequency],
    );
  }
  if (Array.isArray(src.onboardingStage) && src.onboardingStage.length > 0) {
    filters.push(
      src.onboardingStage.length === 1
        ? ['onboarding_stage', '=', src.onboardingStage[0]]
        : ['onboarding_stage', 'in', src.onboardingStage],
    );
  }
  if (Array.isArray(src.owner) && src.owner.length > 0) {
    filters.push(
      src.owner.length === 1
        ? ['partner_owner', '=', src.owner[0]]
        : ['partner_owner', 'in', src.owner],
    );
  }
  return filters;
};

/**
 * Parse `onboarding_stage_counts` from listview `message` into `stageSummary` shape.
 * Returns null if the API did not send counts (older backends).
 * Uses `onboarding_stage_order` from API when present (Status Configuration order).
 */
export function normalizeOnboardingStageCountsFromListPayload(payload) {
  const raw = payload?.onboarding_stage_counts;
  if (!raw || typeof raw !== 'object') return null;

  const all = Number(
    raw.All ?? raw.all ?? payload.total_partners ?? payload.total_count ?? payload.count ?? 0,
  );

  const order =
    Array.isArray(payload?.onboarding_stage_order) && payload.onboarding_stage_order.length > 0
      ? payload.onboarding_stage_order
      : Object.keys(raw)
          .filter((k) => k !== 'All' && k !== 'all')
          .sort();

  const byStage = {};
  order.forEach((stageKey) => {
    const val = raw[stageKey];
    byStage[stageKey] = Number.isFinite(Number(val)) ? Number(val) : 0;
  });
  Object.keys(raw).forEach((k) => {
    if (k === 'All' || k === 'all') return;
    if (byStage[k] === undefined) {
      byStage[k] = Number.isFinite(Number(raw[k])) ? Number(raw[k]) : 0;
    }
  });

  return {
    all: Number.isFinite(all) ? all : 0,
    byStage,
  };
}

/**
 * Fetch partner listview – similar to agreements listview.
 * NOTE: Backend endpoint may not exist yet.
 */
export const getPartnerListViewThunk = createAsyncThunk(
  'partner/getPartnerListView',
  async (
    {
      keyword = '',
      page = 1,
      page_size = 20,
      filters = {},
      order_by = 'creation desc',
      append = false,
      centers,
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const filtersArray = buildPartnerApiFilters(filters);
      // Global-centre header (shared contract):
      //   - undefined / null -> omit (no restriction)
      //   - []               -> send "[]" so backend short-circuits to 0 rows
      //   - [...]            -> send the JSON list
      const centersParam = (() => {
        if (centers == null) return undefined;
        if (Array.isArray(centers)) return JSON.stringify(centers);
        return centers;
      })();
      const response = await apiClient.get(
        '/method/devx.partner.api.partner.get_partner_list_view',
        {
          params: {
            keyword,
            page,
            page_size,
            order_by,
            ...(filtersArray.length > 0 ? { filters: JSON.stringify(filtersArray) } : {}),
            ...(centersParam !== undefined ? { centers: centersParam } : {}),
          },
        },
      );
      return response?.data?.message ?? response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/**
 * Partner detail → Activities tab (`get_partner_activities`).
 */
export const fetchPartnerActivitiesThunk = createAsyncThunk(
  'partner/fetchPartnerActivities',
  async ({ partner, activityFilter = 'all', timeFrame = 'all' } = {}, { rejectWithValue }) => {
    if (!partner) {
      return { groups: [], activity_filter_options: [], time_frame_options: [] };
    }
    try {
      const response = await apiClient.get(
        '/method/devx.partner.api.partner.get_partner_activities',
        {
          params: {
            partner,
            activity_filter: activityFilter,
            time_frame: timeFrame,
          },
        },
      );
      const result = response?.data?.message ?? response?.data;
      return result ?? { groups: [], activity_filter_options: [], time_frame_options: [] };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/**
 * Create partner – POST to Partner resource (`/api/resource/Partner`).
 * Payload keys must match the Partner DocType (see partner create drawer).
 */
export const createPartnerThunk = createAsyncThunk(
  'partner/createPartner',
  async (partnerData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/resource/Partner', partnerData);
      return response?.data?.data ?? response?.data ?? partnerData;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/**
 * Load one Partner document by name (`name` / route id).
 */
export const fetchPartnerThunk = createAsyncThunk(
  'partner/fetchPartner',
  async (partnerName, { rejectWithValue }) => {
    if (!partnerName) {
      return rejectWithValue({ message: 'Partner name is required' });
    }
    try {
      const response = await apiClient.get(
        `/resource/Partner/${encodeURIComponent(String(partnerName))}`,
        { params: { expand_links: true } },
      );
      const raw = response?.data?.data ?? response?.data ?? null;
      return normalizePartnerDocument(raw);
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/**
 * Update Partner fields via Frappe resource PUT (same field names as create).
 * Pass only the fields you are changing, or a full document body.
 */
export const updatePartnerThunk = createAsyncThunk(
  'partner/updatePartner',
  async ({ partnerName, fields }, { rejectWithValue }) => {
    if (!partnerName || !fields || typeof fields !== 'object') {
      return rejectWithValue({ message: 'Partner name and fields are required' });
    }
    try {
      const response = await apiClient.put(
        `/resource/Partner/${encodeURIComponent(String(partnerName))}`,
        fields,
      );
      return response?.data?.data ?? response?.data ?? null;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/**
 * Partner contacts – add / update / delete.
 * These are custom backend methods (not resource PUT).
 */
export const addPartnerContactThunk = createAsyncThunk(
  'partner/addPartnerContact',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.partner.api.partner.add_partner_contact',
        payload,
      );
      return response?.data?.message ?? response?.data ?? null;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const deletePartnerContactThunk = createAsyncThunk(
  'partner/deletePartnerContact',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.partner.api.partner.delete_partner_contact',
        payload,
      );
      return response?.data?.message ?? response?.data ?? null;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const updatePartnerContactThunk = createAsyncThunk(
  'partner/updatePartnerContact',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.partner.api.partner.update_partner_contact',
        payload,
      );
      return response?.data?.message ?? response?.data ?? null;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/** Add attachment(s) to a partner using multipart form-data. */
export const uploadPartnerAttachmentThunk = createAsyncThunk(
  'partner/uploadPartnerAttachment',
  async ({ partner, files }, { rejectWithValue }) => {
    if (!partner) return rejectWithValue('partner required');
    const fileList = Array.isArray(files) ? files.filter(Boolean) : [];
    if (fileList.length === 0) return rejectWithValue('files required');

    try {
      const formData = new FormData();
      formData.append('partner', String(partner));
      fileList.forEach((file) => {
        if (file instanceof File) {
          formData.append('attachment', file);
        }
      });

      const response = await apiClient.post(
        '/method/devx.partner.api.partner.add_partner_attachment',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      return response?.data?.message ?? response?.data ?? null;
    } catch (error) {
      return rejectWithValue(serializeError(error));
    }
  },
);

export const deletePartnerAttachmentThunk = createAsyncThunk(
  'partner/deletePartnerAttachment',
  async ({ partner, attachment_id, childDoctype } = {}, { rejectWithValue }) => {
    if (!partner) return rejectWithValue('partner required');
    if (!attachment_id) return rejectWithValue('attachment_id required');
    try {
      const response = await apiClient.post(
        '/method/devx.partner.api.partner.delete_partner_attachment',
        {
          partner,
          attachment_id,
          ...(childDoctype ? { childDoctype } : {}),
        },
      );
      return response?.data?.message ?? response?.data ?? null;
    } catch (error) {
      return rejectWithValue(serializeError(error));
    }
  },
);
/**
 * Fetch partner list column preferences from API.
 * NOTE: Backend endpoint may not exist yet. When it fails, useColumnConfig falls back to defaults.
 */
export const fetchPartnerColumnList = createAsyncThunk(
  'partner/fetchPartnerColumnList',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: {
          doctype: PARTNER_DOCTYPE,
        },
      });
      const message = response?.data?.message;
      // console.log('fetchPartnerColumnList', message);
      return message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

/**
 * Save partner list column preferences to API.
 * NOTE: Backend endpoint may not exist yet. When it fails, changes remain in local state.
 */
export const updatePartnerColumnList = createAsyncThunk(
  'partner/updatePartnerColumnList',
  async (columns, thunkAPI) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: PARTNER_DOCTYPE,
        columns,
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

/** CRM tasks scoped to a Partner document (Partner Onboarding) */
export const fetchPartnerCrmTaskList = createAsyncThunk(
  'partner/fetchPartnerCrmTaskList',
  async (
    { partnerDocName, keyword = '', order_by = null, page = 1, page_size = 20, append = false },
    { rejectWithValue },
  ) => {
    if (!partnerDocName) {
      return rejectWithValue('Partner reference is required');
    }
    try {
      const body = {
        task_type: 'Partner Onboarding',
        custom_ref_doctype: 'Partner',
        custom_ref_docname: partnerDocName,
        order_by: 'creation desc',
        page,
        page_size,
      };
      const kw = keyword != null ? String(keyword).trim() : '';
      if (kw) {
        body.search = kw;
      }
      if (order_by) {
        body.order_by = order_by;
      }
      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.get_task_list_view',
        body,
      );
      const normalized = normalizePartnerCrmTaskListPayload(response.data);
      const apiPage = Number(normalized?.page ?? page) || page;
      const apiPageSize = Number(normalized?.page_size ?? page_size) || page_size;
      const totalPages = Number(normalized?.total_pages ?? 0) || 0;
      const totalCount = Number(normalized?.total_count ?? 0) || 0;
      const hasMore =
        normalized?.has_more != null
          ? Boolean(normalized.has_more)
          : totalPages > 0
            ? apiPage < totalPages
            : totalCount > 0
              ? apiPage * apiPageSize < totalCount
              : Array.isArray(normalized?.results)
                ? normalized.results.length >= apiPageSize
                : false;
      return {
        ...normalized,
        append,
        page: apiPage,
        page_size: apiPageSize,
        total_pages: totalPages,
        total_count: totalCount,
        has_more: hasMore,
      };
    } catch (error) {
      return rejectWithValue(serializeError(error));
    }
  },
);

export const createPartnerCrmTask = createAsyncThunk(
  'partner/createPartnerCrmTask',
  async (formData, { rejectWithValue }) => {
    try {
      // Ensure required scoping fields are present for backend and
      // DO NOT send legacy reference_* fields.
      let payload = formData;
      if (formData instanceof FormData) {
        const next = new FormData();
        // Copy all fields except reference_doctype/reference_doc_name
        for (const [key, value] of formData.entries()) {
          if (key === 'reference_doctype' || key === 'reference_doc_name') continue;
          next.append(key, value);
        }

        if (!next.has('custom_ref_doctype') && formData.has('reference_doctype')) {
          next.append('custom_ref_doctype', formData.get('reference_doctype'));
        }
        if (!next.has('custom_ref_docname') && formData.has('reference_doc_name')) {
          next.append('custom_ref_docname', formData.get('reference_doc_name'));
        }
        payload = next;
      }
      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.create_ref_doc_task',
        payload,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(serializeError(error));
    }
  },
);

export const updatePartnerCrmTask = createAsyncThunk(
  'partner/updatePartnerCrmTask',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.update_ref_doc_task',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(serializeError(error));
    }
  },
);

// --- Task assignment (assignee add/remove) ---
// Use the same APIs as ticket management for assignee changes.
export const assignPartnerTask = createAsyncThunk(
  'partner/assignPartnerTask',
  async ({ name, assign_to }, { rejectWithValue }) => {
    if (!name) return rejectWithValue('Task name is required');
    try {
      const assignees = Array.isArray(assign_to) ? assign_to : [assign_to].filter(Boolean);
      if (assignees.length === 0) return rejectWithValue('At least one assignee is required');
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
      return rejectWithValue(serializeError(error));
    }
  },
);

export const removePartnerTaskAssignments = createAsyncThunk(
  'partner/removePartnerTaskAssignments',
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
      return rejectWithValue(serializeError(error));
    }
  },
);

/**
 * Single-field task update — same contract as `updateVendorTaskField` (document_task.update_ref_doc_task
 * plus Frappe assign_to / helpdesk remove for assignees).
 */
export const updatePartnerTaskField = createAsyncThunk(
  'partner/updatePartnerTaskField',
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
          await dispatch(assignPartnerTask({ name: taskName, assign_to: toAdd })).unwrap();
        }
        if (toRemove.length > 0) {
          await dispatch(
            removePartnerTaskAssignments({ name: taskName, assignees: toRemove }),
          ).unwrap();
        }

        return { message: 'Assignees updated successfully' };
      }

      const payload = { task_id: taskName, [fieldName]: value };
      if (fieldName === 'tags') {
        payload.tags = Array.isArray(value) ? value : value ? [value] : [];
      }

      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.update_ref_doc_task',
        payload,
      );
      return response.data?.message || response.data;
    } catch (error) {
      return rejectWithValue(serializeError(error));
    }
  },
);

export const getPartnerCrmTaskDetail = createAsyncThunk(
  'partner/getPartnerCrmTaskDetail',
  async (
    { task_id, task_type, subject, type = 'Partner Onboarding', partner },
    { rejectWithValue },
  ) => {
    const resolvedTaskId = task_id ?? subject;
    const resolvedTaskType = task_type ?? type;
    if (!resolvedTaskId) return rejectWithValue('task_id is required');
    try {
      const body = { task_id: resolvedTaskId, task_type: resolvedTaskType };
      if (partner) {
        body.partner = partner;
      }
      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.get_task_detailed_view',
        body,
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
      return rejectWithValue(serializeError(error));
    }
  },
);

/** Roles used to populate Partner Master task assignee pickers (sales team) */
export const PARTNER_MASTER_ASSIGNEE_ROLES = ['Inside Sales', 'Sales', 'CRM (Account Manager)'];

/**
 * Users with given roles for Partner Master assignee fields (table + drawers).
 */
export const fetchPartnerMasterAssigneesByRoles = createAsyncThunk(
  'partner/fetchPartnerMasterAssigneesByRoles',
  async ({ roles = PARTNER_MASTER_ASSIGNEE_ROLES } = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/method/devx.api.user.get_users_by_roles', {
        params: { roles: JSON.stringify(roles) },
      });

      const groups = response?.data?.message?.groups || [];
      const seen = new Set();
      const users = [];

      groups.forEach((group) => {
        const roleUsers = group?.users || [];
        roleUsers.forEach((u) => {
          const id = u.user_id || u.name || u.email;
          if (!id || seen.has(id)) return;
          seen.add(id);
          const displayName = u.name || id;
          users.push({
            label: displayName,
            value: id,
            email: id,
            name: id,
            full_name: displayName,
            image: null,
            user_role: group?.role || null,
            roles: group?.role ? [group.role] : [],
          });
        });
      });

      return { users };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchPartnerEvents = createAsyncThunk(
  'partner/fetchPartnerEvents',
  async ({ partner, keyword = '', page = 1, page_size = 20 } = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/method/devx.partner.api.partner.get_events_by_partner',
        {
          params: {
            partner,
            keyword,
            page,
            page_size,
          },
        },
      );
      return response?.data?.message ?? response?.data ?? null;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const updateTaskAttachment = createAsyncThunk(
  'partner/updateTaskAttachment',
  async ({ task_id, attachment_file, attachment_files, attachments }, { rejectWithValue }) => {
    try {
      const formData = new FormData();

      formData.append('task_id', String(task_id));
      const files = Array.isArray(attachments)
        ? attachments
        : Array.isArray(attachment_files)
          ? attachment_files
          : attachment_file
            ? [attachment_file]
            : [];
      if (files.length === 0) return rejectWithValue('attachment_file required');

      // Backend expects multiple parts with the SAME key.
      files.forEach((file) => {
        if (file) formData.append('attachment_file', file);
      });

      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.upload_task_attachment',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      return response?.data?.message ?? response?.data;
    } catch (error) {
      return rejectWithValue(serializeError(error));
    }
  },
);

const initialState = {
  partnerListView: {
    data: [],
    keyword: '',
    page: 1,
    columns: [],
    page_size: 20,
    count: 0,
    total_count: 0,
    total_pages: 0,
    has_more: false,
    loading: false,
    error: null,
    list_fetch_id: 0,
  },
  stageSummary: {
    all: 0,
    byStage: {},
    loading: false,
    error: null,
  },
  columnPreferences: {
    data: null,
    isLoading: false,
    error: null,
  },
  partnerCrmTasks: {
    getList: {
      data: null,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      status: null,
      page: 1,
      page_size: 20,
      total_pages: 0,
      total_count: 0,
      has_more: false,
    },
    createTask: {
      isLoading: false,
      error: null,
      status: null,
    },
  },
  partnerMasterAssignees: {
    users: [],
    status: 'idle',
    error: null,
  },
  partnerActivities: {
    data: null,
    loading: false,
    error: null,
  },
  partnerEvents: {
    data: [],
    meta: null,
    loading: false,
    error: null,
  },
};

const partnerSlice = createSlice({
  name: 'partner',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getPartnerListViewThunk.pending, (state, action) => {
        state.partnerListView.loading = true;
        state.partnerListView.error = null;
        const isAppend = Boolean(action.meta?.arg?.append);
        const arg = action.meta?.arg && typeof action.meta.arg === 'object' ? action.meta.arg : {};
        if (!isAppend) {
          state.partnerListView.data = [];
          state.partnerListView.has_more = false;
          state.partnerListView.page = 1;
          state.stageSummary.loading = true;
          const nextId = Number(arg.list_fetch_id);
          if (Number.isFinite(nextId) && nextId > 0) {
            state.partnerListView.list_fetch_id = nextId;
          }
        }
      })
      .addCase(getPartnerListViewThunk.fulfilled, (state, action) => {
        const isAppend = Boolean(action.meta?.arg?.append);
        const req = action.meta?.arg && typeof action.meta.arg === 'object' ? action.meta.arg : {};
        const payload = action.payload || {};

        const argFetchId = Number(req.list_fetch_id) || 0;
        const curFetchId = Number(state.partnerListView.list_fetch_id) || 0;
        if (isAppend && argFetchId > 0 && curFetchId > 0 && argFetchId !== curFetchId) {
          state.partnerListView.loading = false;
          return;
        }

        const incoming = Array.isArray(payload.results)
          ? payload.results
          : Array.isArray(payload.data)
            ? payload.data
            : [];

        const existing = Array.isArray(state.partnerListView.data)
          ? state.partnerListView.data
          : [];
        const merged = isAppend ? [...existing, ...incoming] : incoming;

        let apiPage = 1;
        if (payload.page != null) {
          apiPage = Number(payload.page);
        } else if (req.page != null) {
          apiPage = Number(req.page);
        } else if (isAppend) {
          apiPage = Number(state.partnerListView.page) || 1;
        }

        let apiPageSize = Number(state.partnerListView.page_size) || 20;
        if (payload.page_size != null) {
          apiPageSize = Number(payload.page_size);
        } else if (req.page_size != null) {
          apiPageSize = Number(req.page_size);
        }

        let totalCount = Number(state.partnerListView.total_count) || 0;
        const tcRaw =
          payload.total_count ?? payload.total ?? payload.count ?? payload.total_partners;
        if (tcRaw != null && tcRaw !== '' && Number.isFinite(Number(tcRaw))) {
          totalCount = Number(tcRaw);
        }

        let totalPages = 0;
        if (payload.total_pages != null && Number.isFinite(Number(payload.total_pages))) {
          totalPages = Number(payload.total_pages);
        } else if (totalCount > 0 && apiPageSize > 0) {
          totalPages = Math.max(1, Math.ceil(totalCount / apiPageSize));
        }

        let hasMore = false;
        if (payload.has_more != null) {
          hasMore = Boolean(payload.has_more);
        } else if (totalPages > 0) {
          hasMore = apiPage < totalPages;
        } else if (totalCount > 0) {
          hasMore = merged.length < totalCount;
        } else {
          hasMore = incoming.length >= apiPageSize;
        }

        if (isAppend && incoming.length === 0) {
          hasMore = false;
        }

        const incomingCols = Array.isArray(payload.columns) ? payload.columns : [];
        state.partnerListView.data = merged;
        if (incomingCols.length > 0 || !isAppend) {
          state.partnerListView.columns =
            incomingCols.length > 0 ? incomingCols : state.partnerListView.columns;
        }
        state.partnerListView.page = apiPage;
        state.partnerListView.page_size = apiPageSize;
        state.partnerListView.total_count = totalCount;
        state.partnerListView.total_pages = totalPages;
        state.partnerListView.has_more = hasMore;
        state.partnerListView.loading = false;
        state.partnerListView.error = null;

        state.stageSummary.loading = false;

        const stageCounts = normalizeOnboardingStageCountsFromListPayload(payload);
        if (stageCounts) {
          state.stageSummary.all = stageCounts.all;
          state.stageSummary.byStage = stageCounts.byStage;
          state.stageSummary.error = null;
        }
      })
      .addCase(getPartnerListViewThunk.rejected, (state, action) => {
        const wasAppend = Boolean(action.meta?.arg?.append);
        state.partnerListView.loading = false;
        state.partnerListView.error =
          action.error?.message ?? action.payload?.message ?? 'Failed to load partners list';
        if (!wasAppend) {
          state.partnerListView.data = [];
          state.partnerListView.has_more = false;
          state.stageSummary.loading = false;
        }
      })
      .addCase(fetchPartnerActivitiesThunk.pending, (state) => {
        state.partnerActivities.loading = true;
        state.partnerActivities.error = null;
      })
      .addCase(fetchPartnerActivitiesThunk.fulfilled, (state, action) => {
        state.partnerActivities.loading = false;
        state.partnerActivities.data = action.payload;
        state.partnerActivities.error = null;
      })
      .addCase(fetchPartnerActivitiesThunk.rejected, (state, action) => {
        state.partnerActivities.loading = false;
        state.partnerActivities.error =
          action.payload?.message ?? action.error?.message ?? 'Failed to load partner activities';
        state.partnerActivities.data = null;
      })
      .addCase(createPartnerThunk.fulfilled, (state, action) => {
        if (action.payload?.name && Array.isArray(state.partnerListView.data)) {
          state.partnerListView.data = [action.payload, ...state.partnerListView.data];
        }
      })
      .addCase(fetchPartnerColumnList.pending, (state) => {
        state.columnPreferences.isLoading = true;
        state.columnPreferences.error = null;
      })
      .addCase(fetchPartnerColumnList.fulfilled, (state, action) => {
        state.columnPreferences.isLoading = false;
        state.columnPreferences.data = action.payload;
      })
      .addCase(fetchPartnerColumnList.rejected, (state, action) => {
        state.columnPreferences.isLoading = false;
        state.columnPreferences.error = action.payload || action.error?.message;
      })
      .addCase(updatePartnerColumnList.pending, (state) => {
        state.columnPreferences.isLoading = true;
        state.columnPreferences.error = null;
      })
      .addCase(updatePartnerColumnList.fulfilled, (state) => {
        state.columnPreferences.isLoading = false;
      })
      .addCase(updatePartnerColumnList.rejected, (state, action) => {
        state.columnPreferences.isLoading = false;
        state.columnPreferences.error = action.payload || action.error?.message;
      })
      .addCase(fetchPartnerCrmTaskList.pending, (state, action) => {
        const append = Boolean(action.meta?.arg?.append);
        if (append) state.partnerCrmTasks.getList.isLoadingMore = true;
        else state.partnerCrmTasks.getList.isLoading = true;
        state.partnerCrmTasks.getList.error = null;
        state.partnerCrmTasks.getList.status = null;
      })
      .addCase(fetchPartnerCrmTaskList.fulfilled, (state, action) => {
        state.partnerCrmTasks.getList.isLoading = false;
        state.partnerCrmTasks.getList.isLoadingMore = false;
        const responseData = action.payload;
        const prevData = state.partnerCrmTasks.getList.data;
        const append = Boolean(responseData?.append);

        let nextData = responseData;
        if (append) {
          const prevResults = Array.isArray(prevData?.results) ? prevData.results : [];
          const incoming = Array.isArray(responseData?.results) ? responseData.results : [];
          nextData = { ...responseData, results: [...prevResults, ...incoming] };
        }

        const merged =
          prevData && typeof prevData === 'object' && nextData && typeof nextData === 'object'
            ? mergePartnerCrmTaskListPreserveTags(prevData, nextData)
            : nextData;

        state.partnerCrmTasks.getList.data = merged;
        state.partnerCrmTasks.getList.status = 200;
        state.partnerCrmTasks.getList.error = null;
        state.partnerCrmTasks.getList.page = Number(responseData?.page ?? 1) || 1;
        state.partnerCrmTasks.getList.page_size = Number(responseData?.page_size ?? 20) || 20;
        state.partnerCrmTasks.getList.total_pages = Number(responseData?.total_pages ?? 0) || 0;
        state.partnerCrmTasks.getList.total_count = Number(responseData?.total_count ?? 0) || 0;
        state.partnerCrmTasks.getList.has_more = Boolean(responseData?.has_more);
      })
      .addCase(fetchPartnerCrmTaskList.rejected, (state, action) => {
        state.partnerCrmTasks.getList.isLoading = false;
        state.partnerCrmTasks.getList.isLoadingMore = false;
        state.partnerCrmTasks.getList.error = action.payload;
        state.partnerCrmTasks.getList.status = action.payload?.status || 500;
      })
      .addCase(createPartnerCrmTask.pending, (state) => {
        state.partnerCrmTasks.createTask.isLoading = true;
        state.partnerCrmTasks.createTask.error = null;
        state.partnerCrmTasks.createTask.status = null;
      })
      .addCase(createPartnerCrmTask.fulfilled, (state, action) => {
        state.partnerCrmTasks.createTask.isLoading = false;
        state.partnerCrmTasks.createTask.status = action.payload?.status || 200;
        state.partnerCrmTasks.createTask.error = null;
      })
      .addCase(createPartnerCrmTask.rejected, (state, action) => {
        state.partnerCrmTasks.createTask.isLoading = false;
        state.partnerCrmTasks.createTask.error = action.payload;
        state.partnerCrmTasks.createTask.status = action.payload?.status || 500;
      })
      .addCase(updatePartnerCrmTask.pending, (state) => {
        state.partnerCrmTasks.createTask.isLoading = true;
        state.partnerCrmTasks.createTask.error = null;
      })
      .addCase(updatePartnerCrmTask.fulfilled, (state, action) => {
        state.partnerCrmTasks.createTask.isLoading = false;
        state.partnerCrmTasks.createTask.status = action.payload?.status || 200;
        state.partnerCrmTasks.createTask.error = null;
      })
      .addCase(updatePartnerCrmTask.rejected, (state, action) => {
        state.partnerCrmTasks.createTask.isLoading = false;
        state.partnerCrmTasks.createTask.error = action.payload;
        state.partnerCrmTasks.createTask.status = action.payload?.status || 500;
      })
      .addCase(updatePartnerTaskField.pending, (state) => {
        state.partnerCrmTasks.createTask.isLoading = true;
        state.partnerCrmTasks.createTask.error = null;
      })
      .addCase(updatePartnerTaskField.fulfilled, (state, action) => {
        state.partnerCrmTasks.createTask.isLoading = false;
        state.partnerCrmTasks.createTask.status = action.payload?.status || 200;
        state.partnerCrmTasks.createTask.error = null;
      })
      .addCase(updatePartnerTaskField.rejected, (state, action) => {
        state.partnerCrmTasks.createTask.isLoading = false;
        state.partnerCrmTasks.createTask.error = action.payload;
        state.partnerCrmTasks.createTask.status = action.payload?.status || 500;
      })
      .addCase(fetchPartnerMasterAssigneesByRoles.pending, (state) => {
        state.partnerMasterAssignees.status = 'loading';
        state.partnerMasterAssignees.error = null;
      })
      .addCase(fetchPartnerMasterAssigneesByRoles.fulfilled, (state, action) => {
        state.partnerMasterAssignees.status = 'succeeded';
        state.partnerMasterAssignees.users = action.payload?.users || [];
        state.partnerMasterAssignees.error = null;
      })
      .addCase(fetchPartnerMasterAssigneesByRoles.rejected, (state, action) => {
        state.partnerMasterAssignees.status = 'failed';
        state.partnerMasterAssignees.users = [];
        state.partnerMasterAssignees.error =
          action.payload?.message ?? action.error?.message ?? 'Failed to load assignees';
      })

      .addCase(fetchPartnerEvents.pending, (state) => {
        state.partnerEvents.loading = true;
        state.partnerEvents.error = null;
      })
      .addCase(fetchPartnerEvents.fulfilled, (state, action) => {
        state.partnerEvents.loading = false;
        state.partnerEvents.data = action.payload?.results ?? [];
        state.partnerEvents.meta = action.payload ?? null;
        state.partnerEvents.error = null;
      })
      .addCase(fetchPartnerEvents.rejected, (state, action) => {
        state.partnerEvents.loading = false;
        state.partnerEvents.error =
          action.payload?.message ?? action.error?.message ?? 'Failed to load events';
        state.partnerEvents.data = [];
        state.partnerEvents.meta = null;
      });
  },
});

export const selectPartnerMasterAssignees = (state) => state.partner.partnerMasterAssignees;

export default partnerSlice.reducer;
