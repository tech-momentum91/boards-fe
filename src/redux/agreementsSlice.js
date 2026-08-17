import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

const AGREEMENT_DOCTYPE = 'Agreement';

/** Page size used when fetching full client/landlord lists for dropdowns (agreements, etc.). */
const PAGE_SIZE_FETCH_ALL = 999;

const PENDING_ALLOCATIONS_DEFAULT_DATA = {
  keyword: '',
  page: 1,
  page_size: 20,
  count: 0,
  total_count: 0,
  total_pages: 0,
  results: [],
};

function numOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const initialState = {
  agreements: [],
  isLoading: false,
  agreementsListView: {
    results: [],
    columns: [],
    keyword: '',
    page: 1,
    page_size: 20,
    count: 0,
    total_count: 0,
    total_pages: 0,
    has_more: false,
    expand_for: '',
  },
  agreementsListViewLoading: false,
  agreementsListViewError: null,
  clientCentersList: {
    data: [],
    isLoading: false,
    error: null,
  },
  clientCentersSpaceList: {
    data: [],
    isLoading: false,
    error: null,
  },
  agreementsClientList: [],
  columnPreferences: {
    data: null,
    isLoading: false,
    error: null,
  },
  pendingColumnPreferences: {
    data: null,
    isLoading: false,
    error: null,
  },
  error: null,
  agreementDetail: null,
  agreementDetailLoading: false,
  agreementDetailError: null,
  /** Comments + activity timeline for Agreement view drawer. */
  agreementComments: {
    data: {
      comments: [],
      history: [],
      communications: [],
      views: [],
      calls: [],
    },
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  /** Calendar view: dedicated API data (used only when viewing calendar). */
  agreementCalendarView: {
    data: null, // { data_by_month, month, filter, ... } from get_agreement_calendar_view
    month: null, // "yyyy-MM" last requested
    filter: null, // last requested filter array
    isLoading: false,
    error: null,
  },
  /** Landlord info (used by landlord agreement drawer for autofill). */
  landlordInfo: {
    data: null,
    isLoading: false,
    error: null,
  },
  amenitiesTypes: {
    data: [], // [{ value, label }]
    isLoading: false,
    error: null,
    status: 'idle',
  },
  pendingSpaceAllocations: {
    data: { ...PENDING_ALLOCATIONS_DEFAULT_DATA },
    isLoading: false,
    error: null,
  },
};

export const getAgreementPendingSpaceAllocationListThunk = createAsyncThunk(
  'agreements/getAgreementPendingSpaceAllocationList',
  async (params = {}, { rejectWithValue }) => {
    const { keyword = '', page = 1, page_size = 20 } = params;
    try {
      const response = await apiClient.post(
        '/method/devx.agreement.api.listview.get_agreement_pending_space_allocation_list',
        { keyword, page, page_size },
      );
      return response?.data?.message?.message ?? response?.data?.message ?? response?.data ?? {};
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const getAgreementsClientListThunk = createAsyncThunk(
  'agreements/getAgreementsList',
  async () => {
    const response = await apiClient.get('/method/devx.overrides.client.client_list_view', {
      params: {
        page: 1,
        page_size: PAGE_SIZE_FETCH_ALL,
        limit_page_length: PAGE_SIZE_FETCH_ALL,
      },
    });
    return response?.data?.message?.results;
  },
);

/**
 * Fetch calendar view data for a month; used only for calendar view.
 * Body: month (yyyy-MM), filter (array of date field names).
 */
export const getAgreementCalendarViewThunk = createAsyncThunk(
  'agreements/getAgreementCalendarView',
  async ({ month, filter, agreement_type } = {}, { rejectWithValue }) => {
    if (!month || !Array.isArray(filter) || filter.length === 0) {
      return rejectWithValue('month and filter (array) are required');
    }
    try {
      // Global centre header for the calendar. Callers should pass the value
      // built by `adaptGlobalCenterIntent.agreement(intent)` from
      // `@/utils/global-center-filter`. `null`/`undefined` -> omit; the
      // backend treats `{center: []}` as "match nothing" via
      // `parse_global_center_param`.
      const response = await apiClient.post(
        '/method/devx.agreement.api.calendar_view.get_agreement_calendar_view',
        {
          month,
          filter,
          ...(agreement_type ? { agreement_type } : {}),
          // ...(navbar_filter != null ? { navbar_filter } : {}),
        },
      );
      return response?.data?.message ?? response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const getAgreementsListViewThunk = createAsyncThunk(
  'agreements/getAgreementsListView',
  async (
    {
      keyword = '',
      page = 1,
      page_size = 20,
      expand_for = '',
      filters = {},
      order_by = 'creation desc',
      agreement_type = 'Landlord',
      // navbar_filter,
      append = false, // used only in reducers via action.meta.arg.append
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const extraFilters = Array.isArray(filters) ? filters : [];
      const filtersArray = [...extraFilters, ['agreement_type', '=', agreement_type]];
      // Global centre header. Callers should pass the value built by
      // `adaptGlobalCenterIntent.agreement(intent)` from
      // `@/utils/global-center-filter`. `null`/`undefined` -> omit (full
      // permissioned list). `{center: []}` -> backend short-circuits to 0 rows.
      const response = await apiClient.get(
        '/method/devx.agreement.api.listview.get_agreement_listview',
        {
          params: {
            keyword,
            page,
            page_size,
            expand_for,
            ...(filtersArray.length > 0 ? { filters: JSON.stringify(filtersArray) } : {}),
            // ...(navbar_filter != null ? { navbar_filter: JSON.stringify(navbar_filter) } : {}),
            order_by,
          },
        },
      );
      return response?.data?.message ?? response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/** Grouped agreement list (POST). Body: group_by, order_by, item_order_by (+ keyword, filters). Full groups returned; UI paginates groups client-side. */
export const getAgreementEntriesGroupedThunk = createAsyncThunk(
  'agreements/getAgreementEntriesGrouped',
  async (
    {
      keyword = '',
      filters = {},
      order_by = 'modified desc',
      item_order_by = 'modified desc',
      agreement_type = 'Client',
      group_by = '',
      append = false,
    } = {},
    { rejectWithValue },
  ) => {
    if (!group_by) {
      return rejectWithValue('group_by is required');
    }
    try {
      const extraFilters = Array.isArray(filters) ? filters : [];
      const filtersArray = [...extraFilters, ['agreement_type', '=', agreement_type]];
      const payload = {
        keyword: (keyword ?? '').trim(),
        group_by,
        order_by,
        item_order_by: item_order_by ?? order_by,
      };
      if (filtersArray.length > 0) {
        payload.filters = JSON.stringify(filtersArray);
      }
      const response = await apiClient.post(
        '/method/devx.agreement.api.listview.get_agreement_entries_grouped',
        payload,
      );
      let data = response?.data?.message ?? response?.data;
      while (
        data &&
        typeof data === 'object' &&
        data.message != null &&
        typeof data.message === 'object'
      ) {
        const inner = data.message;
        const innerLooksLikePayload =
          inner.results != null ||
          inner.groups != null ||
          inner.is_grouped != null ||
          Array.isArray(inner) ||
          inner.columns != null ||
          inner.count != null ||
          inner.total_count != null ||
          inner.has_more != null;
        if (!innerLooksLikePayload) break;
        data = inner;
      }
      return data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/** Fetch a single agreement by name/id for the view drawer. */
export const getAgreementByIdThunk = createAsyncThunk(
  'agreements/getAgreementById',
  async (agreementId, { rejectWithValue }) => {
    if (!agreementId) return rejectWithValue('agreementId required');
    const response = await apiClient.get(
      '/method/devx.agreement.doctype.agreement.agreement.get_agreement_details',
      {
        params: {
          agreement_id: agreementId,
        },
      },
    );
    const data = response?.data?.message ?? response?.data;
    if (!data) return rejectWithValue('No agreement data');
    return data;
  },
);

/** Fetch comments + activity timeline for an agreement. */
export const fetchAgreementComments = createAsyncThunk(
  'agreements/fetchAgreementComments',
  async ({ agreementId }, { rejectWithValue }) => {
    if (!agreementId) {
      return rejectWithValue('agreementId required');
    }
    try {
      const response = await apiClient.get(
        '/method/devx.agreement.doctype.agreement_activity.agreement_activity.get_agreement_activities',
        {
          params: {
            agreement: String(agreementId),
          },
        },
      );
      const activities = response?.data?.message ?? response?.data ?? {};

      // Map comment fields to match CommentItem expectations (content, visibility, parent preview)
      const mappedComments = (activities.comments || []).map((comment) => ({
        ...comment,
        content: comment.comment || comment.content,
        commented_by: comment.comment_by || comment.commented_by,
        custom_visible_to_client:
          comment.custom_visible_to_client ??
          comment.visible_to_client ??
          comment.custom_is_visible_to_client,
        custom_parent_comment:
          comment.custom_parent_comment != null
            ? comment.custom_parent_comment
            : Boolean(comment.parent_comment),
      }));

      return {
        comments: mappedComments,
        history: activities.history || [],
        communications: activities.communications || [],
        views: activities.views || [],
        calls: activities.calls || [],
      };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch agreement comments'),
      );
    }
  },
);

/** Add a new agreement comment (with optional attachments/files). */
export const addAgreementComment = createAsyncThunk(
  'agreements/addAgreementComment',
  async (
    { agreementId, content, attachments = [], isVisibleToClient = false, parentCommentId = null },
    { rejectWithValue },
  ) => {
    const hasContent = content != null && String(content).trim().length > 0;
    const hasAttachments = attachments && attachments.length > 0;

    if (!agreementId) {
      return rejectWithValue('agreementId required');
    }
    if (!hasContent && !hasAttachments) {
      return rejectWithValue('Comment text or at least one attachment is required');
    }

    try {
      const formData = new FormData();
      formData.append('agreement', String(agreementId));
      formData.append('content', content ?? '');
      if (typeof isVisibleToClient === 'boolean') {
        formData.append('visible_to_client', isVisibleToClient ? 1 : 0);
      }
      if (parentCommentId) {
        formData.append('parent_comment', String(parentCommentId));
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
        '/method/devx.agreement.doctype.agreement_comment.agreement_comment.add_agreement_comment_with_files',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      return response?.data?.message || response?.data || null;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to add agreement comment'),
      );
    }
  },
);

/** Update an agreement by name (PUT). Payload should use API field names (snake_case). */
export const updateAgreementThunk = createAsyncThunk(
  'agreements/updateAgreement',
  async ({ name, payload }, { rejectWithValue }) => {
    if (!name) return rejectWithValue('Agreement name required');
    try {
      const response = await apiClient.put(
        `/resource/Agreement/${encodeURIComponent(name)}`,
        payload,
      );
      return response?.data?.data ?? response?.data ?? payload;
    } catch (error) {
      return rejectWithValue(error?.response?.data ?? error?.message ?? error);
    }
  },
);

export const getClientAssignedCentersListThunk = createAsyncThunk(
  'agreements/getClientCentersList',
  async ({ customerId }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.agreement.api.centers.get_customer_centers',
        {
          customer: customerId,
        },
        {
          params: {
            page_size: 999,
          },
        },
      );
      const data = response?.data?.message ?? response?.data;
      // if (!data) return rejectWithValue('No data');
      return data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const getClientCentersSpaceListThunk = createAsyncThunk(
  'agreements/getClientCentersSpaceList',
  async ({ centerId, customerId, status, assignSpaceIds }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.agreement.api.spaces.get_customer_spaces',
        {
          center: Array.isArray(centerId) ? centerId : [centerId],
          customer: customerId,
          ...(status != null && status !== '' ? { status } : {}),
          ...(Array.isArray(assignSpaceIds) && assignSpaceIds.length > 0
            ? { assign_space_id: assignSpaceIds }
            : {}),
        },
      );
      const data = response?.data?.message ?? response?.data;
      if (!data) return rejectWithValue('No data');
      return data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const createAgreementThunk = createAsyncThunk(
  'agreements/createAgreement',
  async (agreementData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/resource/Agreement', agreementData);
      const data = response?.data?.data ?? response?.data;
      return data ?? agreementData;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/** Add attachments to an agreement. Pass agreement_id (name) and files (File[]). */
export const addAgreementAttachmentThunk = createAsyncThunk(
  'agreements/addAgreementAttachment',
  async ({ agreement_id, files }, { rejectWithValue }) => {
    if (!agreement_id) return rejectWithValue('agreement_id required');
    if (!files?.length) return rejectWithValue('files required');
    try {
      const formData = new FormData();
      formData.append('agreement_id', agreement_id);
      const fileList = Array.isArray(files) ? files : [files];
      fileList.forEach((file) => {
        if (file instanceof File) formData.append('file', file);
      });
      const response = await apiClient.post(
        '/method/devx.agreement.doctype.agreements_attachment.agreements_attachment.add_agreement_attachment',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response?.data?.message ?? response?.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data ?? error?.message ?? error);
    }
  },
);

/** Delete a single agreement attachment by file_id. */
export const deleteAgreementAttachmentThunk = createAsyncThunk(
  'agreements/deleteAgreementAttachment',
  async ({ file_id }, { rejectWithValue }) => {
    if (!file_id) return rejectWithValue('file_id required');
    try {
      const response = await apiClient.post(
        '/method/devx.agreement.doctype.agreements_attachment.agreements_attachment.delete_agreement_attachment',
        {
          file_id,
        },
      );
      return response?.data?.message ?? response?.data ?? { file_id };
    } catch (error) {
      return rejectWithValue(error?.response?.data ?? error?.message ?? error);
    }
  },
);

export const getSpaceWiseDataThunk = createAsyncThunk(
  'agreements/getSpaceWiseData',
  async ({ assignSpaceIds }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.agreement.api.spaces.get_assign_space_data',
        {
          assign_space_ids: assignSpaceIds,
        },
      );
      const data = response?.data?.message ?? response?.data;
      return data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const getLandlordCenterListThunk = createAsyncThunk(
  'agreements/getLandlordCenterList',
  async ({ landlord }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/method/devx.agreement.api.landlord.get_landlord_info',
        {
          params: { landlord },
        },
      );
      const data = response?.data?.message ?? response?.data;
      return data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);
export const fetchAgreementColumnList = createAsyncThunk(
  'agreements/fetchAgreementColumnList',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: {
          doctype: AGREEMENT_DOCTYPE,
        },
      });
      const message = response?.data?.message;
      return message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const updateAgreementColumnList = createAsyncThunk(
  'agreements/updateAgreementColumnList',
  async (columns, thunkAPI) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: AGREEMENT_DOCTYPE,
        columns,
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchPendingAgreementColumnList = createAsyncThunk(
  'agreements/fetchPendingAgreementColumnList',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: {
          doctype: AGREEMENT_DOCTYPE,
          react_table_id: 'pending_agreement',
        },
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const updatePendingAgreementColumnList = createAsyncThunk(
  'agreements/updatePendingAgreementColumnList',
  async (columns, thunkAPI) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: AGREEMENT_DOCTYPE,
        react_table_id: 'pending_agreement',
        columns,
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchAmenitiesTypeThunk = createAsyncThunk(
  'agreements/fetchAmenitiesType',
  async (_, { rejectWithValue }) => {
    try {
      const payload = {
        doctype: 'Legal Amenities',
        filters: [['disable', '!=', '1']],
        limit_page_length: 500,
        page: 1,
        order_by: 'amenities asc',
      };

      const response = await apiClient.post(
        '/method/devx.api.listview.list_with_search_filters',
        payload,
      );

      const message = response?.data?.message || {};
      const rawData = Array.isArray(message.results)
        ? message.results
        : Array.isArray(message.data)
          ? message.data
          : Array.isArray(message)
            ? message
            : [];

      const options = rawData
        .map((row) => ({
          value: row.name ?? '',
          label: row.amenities ?? row.name ?? '',
        }))
        .filter((opt) => opt.value && opt.label);

      return options;
    } catch (error) {
      return rejectWithValue(error?.response?.data || error?.message || error);
    }
  },
);

/** Flatten listview payloads: flat `results[]`, grouped `results{ key: rows[] }` (with or without `is_grouped`), `groups[]`, or array-of-group objects. */
function normalizeAgreementsListviewResults(msg) {
  if (!msg || typeof msg !== 'object') return [];
  if (Array.isArray(msg)) return msg;

  const pushRecords = (flat, records) => {
    if (Array.isArray(records)) {
      flat.push(...records);
    } else if (records && typeof records === 'object') {
      flat.push(records);
    }
  };

  // Dict of group key -> row[] (backend may omit `is_grouped`)
  if (msg.results && typeof msg.results === 'object' && !Array.isArray(msg.results)) {
    const flat = [];
    for (const records of Object.values(msg.results)) {
      pushRecords(flat, records);
    }
    if (flat.length > 0) return flat;
  }

  if (Array.isArray(msg.groups) && msg.groups.length > 0) {
    const flat = [];
    for (const g of msg.groups) {
      if (!g || typeof g !== 'object') continue;
      const rows =
        g.items ??
        g.rows ??
        g.records ??
        g.entries ??
        g.agreements ??
        (Array.isArray(g.data) ? g.data : null) ??
        g.results;
      if (Array.isArray(rows)) {
        flat.push(...rows);
      } else if (rows && typeof rows === 'object' && !Array.isArray(rows)) {
        for (const records of Object.values(rows)) {
          pushRecords(flat, records);
        }
      }
    }
    if (flat.length > 0) return flat;
  }

  if (Array.isArray(msg.results) && msg.results.length > 0) {
    const first = msg.results[0];
    if (first && typeof first === 'object') {
      const nested =
        first.items ?? first.rows ?? first.records ?? first.entries ?? first.agreements;
      if (Array.isArray(nested)) {
        const flat = [];
        for (const g of msg.results) {
          if (!g || typeof g !== 'object') continue;
          const rows =
            g.items ??
            g.rows ??
            g.records ??
            g.entries ??
            g.agreements ??
            (Array.isArray(g.data) ? g.data : null);
          pushRecords(flat, rows);
        }
        if (flat.length > 0) return flat;
      }
    }
    return msg.results;
  }

  if (Array.isArray(msg.data)) return msg.data;
  if (Array.isArray(msg.entries)) return msg.entries;

  return [];
}

function applyAgreementsListViewFulfilledState(state, msg, isAppend) {
  const incomingResults = normalizeAgreementsListviewResults(msg);
  const incomingColumns = Array.isArray(msg.columns) ? msg.columns : [];

  const currentView = state.agreementsListView || initialState.agreementsListView;
  const existingResults = Array.isArray(currentView.results) ? currentView.results : [];

  const mergedResults = isAppend ? [...existingResults, ...incomingResults] : incomingResults;

  const nextView = {
    ...currentView,
    ...msg,
    results: mergedResults,
    columns: incomingColumns.length > 0 ? incomingColumns : currentView.columns,
  };

  if (msg.has_more != null) {
    nextView.has_more = Boolean(msg.has_more);
  } else if (msg.group_page != null && msg.total_group_pages != null) {
    nextView.has_more = Number(msg.group_page) < Number(msg.total_group_pages);
  } else if (msg.page != null && msg.total_pages != null) {
    nextView.has_more = Number(msg.page) < Number(msg.total_pages);
  }

  const fromGroup = Number.parseInt(msg.group_page, 10);
  const fromPage = Number.parseInt(msg.page, 10);
  const resolvedPage =
    Number.isFinite(fromGroup) && fromGroup > 0
      ? fromGroup
      : Number.isFinite(fromPage) && fromPage > 0
        ? fromPage
        : numOr(nextView.page, 1);
  nextView.page = resolvedPage;

  state.agreementsListView = nextView;
  state.agreementsListViewLoading = false;
  state.agreementsListViewError = null;
}

const agreementsSlice = createSlice({
  name: 'agreements',
  initialState,
  reducers: {
    resetLandlordInfo: (state) => {
      state.landlordInfo = {
        data: null,
        isLoading: false,
        error: null,
      };
    },
    resetClientCentersSpaceList: (state) => {
      state.clientCentersSpaceList = { data: [], isLoading: false, error: null };
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getAgreementsClientListThunk.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(getAgreementsClientListThunk.fulfilled, (state, action) => {
      state.agreementsClientList = action.payload;
      state.isLoading = false;
    });

    builder.addCase(getAgreementsClientListThunk.rejected, (state, action) => {
      state.agreementsClientList = [];
      state.error = action.error.message;
      state.isLoading = false;
    });

    builder.addCase(getAgreementsListViewThunk.pending, (state, action) => {
      state.agreementsListViewLoading = true;
      state.agreementsListViewError = null;
      const isAppend = Boolean(action.meta?.arg?.append);
      if (!isAppend) {
        state.agreementsListView.results = [];
        state.agreementsListView.has_more = false;
        state.agreementsListView.page = 1;
      }
    });
    builder.addCase(getAgreementsListViewThunk.fulfilled, (state, action) => {
      const isAppend = Boolean(action.meta?.arg?.append);
      applyAgreementsListViewFulfilledState(state, action.payload || {}, isAppend);
    });
    builder.addCase(getAgreementsListViewThunk.rejected, (state, action) => {
      const wasAppend = Boolean(action.meta?.arg?.append);
      state.agreementsListView = {
        ...state.agreementsListView,
        results: wasAppend ? state.agreementsListView.results : [],
        columns: wasAppend ? state.agreementsListView.columns : [],
        has_more: wasAppend ? state.agreementsListView.has_more : false,
      };
      state.agreementsListViewLoading = false;
      state.agreementsListViewError =
        action.error?.message ?? action.payload?.message ?? 'Failed to load agreements list';
    });

    builder.addCase(getAgreementEntriesGroupedThunk.pending, (state, action) => {
      state.agreementsListViewLoading = true;
      state.agreementsListViewError = null;
      const isAppend = Boolean(action.meta?.arg?.append);
      if (!isAppend) {
        state.agreementsListView.results = [];
        state.agreementsListView.has_more = false;
        state.agreementsListView.page = 1;
      }
    });
    builder.addCase(getAgreementEntriesGroupedThunk.fulfilled, (state, action) => {
      const isAppend = Boolean(action.meta?.arg?.append);
      applyAgreementsListViewFulfilledState(state, action.payload || {}, isAppend);
      state.agreementsListView.has_more = false;
    });
    builder.addCase(getAgreementEntriesGroupedThunk.rejected, (state, action) => {
      const wasAppend = Boolean(action.meta?.arg?.append);
      state.agreementsListView = {
        ...state.agreementsListView,
        results: wasAppend ? state.agreementsListView.results : [],
        columns: wasAppend ? state.agreementsListView.columns : [],
        has_more: wasAppend ? state.agreementsListView.has_more : false,
      };
      state.agreementsListViewLoading = false;
      state.agreementsListViewError =
        action.error?.message ?? action.payload?.message ?? 'Failed to load grouped agreements';
    });

    builder.addCase(getAgreementCalendarViewThunk.pending, (state, action) => {
      state.agreementCalendarView.isLoading = true;
      state.agreementCalendarView.error = null;
    });
    builder.addCase(getAgreementCalendarViewThunk.fulfilled, (state, action) => {
      state.agreementCalendarView.data = action.payload;
      state.agreementCalendarView.month =
        action.meta?.arg?.month ?? state.agreementCalendarView.month;
      state.agreementCalendarView.filter =
        action.meta?.arg?.filter ?? state.agreementCalendarView.filter;
      state.agreementCalendarView.isLoading = false;
      state.agreementCalendarView.error = null;
    });
    builder.addCase(getAgreementCalendarViewThunk.rejected, (state, action) => {
      state.agreementCalendarView.isLoading = false;
      state.agreementCalendarView.error =
        action.error?.message ?? action.payload?.message ?? 'Failed to load calendar data';
    });

    builder.addCase(getClientAssignedCentersListThunk.pending, (state) => {
      state.clientCentersList.isLoading = true;
      state.clientCentersList.error = null;
    });
    builder.addCase(getClientAssignedCentersListThunk.fulfilled, (state, action) => {
      state.clientCentersList.data = action.payload;
      state.clientCentersList.isLoading = false;
    });
    builder.addCase(getClientAssignedCentersListThunk.rejected, (state, action) => {
      state.clientCentersList.data = [];
      state.clientCentersList.error = action.error.message;
      state.clientCentersList.isLoading = false;
    });

    builder.addCase(getClientCentersSpaceListThunk.pending, (state) => {
      state.clientCentersSpaceList.isLoading = true;
      state.clientCentersSpaceList.error = null;
    });
    builder.addCase(getClientCentersSpaceListThunk.fulfilled, (state, action) => {
      state.clientCentersSpaceList.data = action.payload;
      state.clientCentersSpaceList.isLoading = false;
    });
    builder.addCase(getClientCentersSpaceListThunk.rejected, (state, action) => {
      state.clientCentersSpaceList.data = [];
      state.clientCentersSpaceList.error = action.error.message;
      state.clientCentersSpaceList.isLoading = false;
    });

    // Landlord info (used by landlord agreement drawer)
    builder.addCase(getLandlordCenterListThunk.pending, (state) => {
      state.landlordInfo.isLoading = true;
      state.landlordInfo.error = null;
    });
    builder.addCase(getLandlordCenterListThunk.fulfilled, (state, action) => {
      state.landlordInfo.data = action.payload;
      state.landlordInfo.isLoading = false;
      state.landlordInfo.error = null;
    });
    builder.addCase(getLandlordCenterListThunk.rejected, (state, action) => {
      state.landlordInfo.isLoading = false;
      state.landlordInfo.error =
        action.payload || action.error?.message || 'Failed to load landlord info';
    });

    builder.addCase(getAgreementByIdThunk.pending, (state) => {
      // Keep existing detail while refetching so open drawers don't flicker/reset.
      state.agreementDetailLoading = true;
      state.agreementDetailError = null;
    });
    builder.addCase(getAgreementByIdThunk.fulfilled, (state, action) => {
      state.agreementDetail = action.payload;
      state.agreementDetailLoading = false;
      state.agreementDetailError = null;
    });
    builder.addCase(getAgreementByIdThunk.rejected, (state, action) => {
      state.agreementDetail = null;
      state.agreementDetailError =
        action.error?.message ?? action.payload ?? 'Failed to load agreement';
      state.agreementDetailLoading = false;
    });

    // Agreement comments & activity timeline
    builder.addCase(fetchAgreementComments.pending, (state) => {
      state.agreementComments.status = 'loading';
      state.agreementComments.error = null;
    });
    builder.addCase(fetchAgreementComments.fulfilled, (state, action) => {
      state.agreementComments.status = 'succeeded';
      state.agreementComments.data = {
        comments: action.payload?.comments || [],
        history: action.payload?.history || [],
        communications: action.payload?.communications || [],
        views: action.payload?.views || [],
        calls: action.payload?.calls || [],
      };
      state.agreementComments.error = null;
    });
    builder.addCase(fetchAgreementComments.rejected, (state, action) => {
      state.agreementComments.status = 'failed';
      state.agreementComments.error = action.payload || action.error?.message;
      state.agreementComments.data = {
        comments: [],
        history: [],
        communications: [],
        views: [],
        calls: [],
      };
    });

    builder.addCase(addAgreementComment.fulfilled, (state, action) => {
      const newComment = action.payload;
      if (newComment && state.agreementComments?.data) {
        const current = state.agreementComments.data.comments || [];
        state.agreementComments.data.comments = [...current, newComment];
      }
    });

    builder.addCase(updateAgreementThunk.fulfilled, (state, action) => {
      if (action.payload && state.agreementDetail?.name === action.payload.name) {
        state.agreementDetail = { ...state.agreementDetail, ...action.payload };
      }
    });

    builder
      .addCase(fetchAgreementColumnList.pending, (state) => {
        state.columnPreferences.isLoading = true;
        state.columnPreferences.error = null;
      })
      .addCase(fetchAgreementColumnList.fulfilled, (state, action) => {
        state.columnPreferences.isLoading = false;
        state.columnPreferences.data = action.payload;
      })
      .addCase(fetchAgreementColumnList.rejected, (state, action) => {
        state.columnPreferences.isLoading = false;
        state.columnPreferences.error = action.payload || action.error?.message;
      })
      .addCase(updateAgreementColumnList.pending, (state) => {
        state.columnPreferences.isLoading = true;
        state.columnPreferences.error = null;
      })
      .addCase(updateAgreementColumnList.fulfilled, (state) => {
        state.columnPreferences.isLoading = false;
      })
      .addCase(updateAgreementColumnList.rejected, (state, action) => {
        state.columnPreferences.isLoading = false;
        state.columnPreferences.error = action.payload || action.error?.message;
      })
      .addCase(fetchPendingAgreementColumnList.pending, (state) => {
        state.pendingColumnPreferences.isLoading = true;
        state.pendingColumnPreferences.error = null;
      })
      .addCase(fetchPendingAgreementColumnList.fulfilled, (state, action) => {
        state.pendingColumnPreferences.isLoading = false;
        state.pendingColumnPreferences.data = action.payload;
      })
      .addCase(fetchPendingAgreementColumnList.rejected, (state, action) => {
        state.pendingColumnPreferences.isLoading = false;
        state.pendingColumnPreferences.error = action.payload || action.error?.message;
      })
      .addCase(updatePendingAgreementColumnList.pending, (state) => {
        state.pendingColumnPreferences.isLoading = true;
        state.pendingColumnPreferences.error = null;
      })
      .addCase(updatePendingAgreementColumnList.fulfilled, (state) => {
        state.pendingColumnPreferences.isLoading = false;
      })
      .addCase(updatePendingAgreementColumnList.rejected, (state, action) => {
        state.pendingColumnPreferences.isLoading = false;
        state.pendingColumnPreferences.error = action.payload || action.error?.message;
      })
      .addCase(fetchAmenitiesTypeThunk.pending, (state) => {
        state.amenitiesTypes.status = 'loading';
        state.amenitiesTypes.isLoading = true;
        state.amenitiesTypes.error = null;
      })
      .addCase(fetchAmenitiesTypeThunk.fulfilled, (state, action) => {
        state.amenitiesTypes.status = 'succeeded';
        state.amenitiesTypes.isLoading = false;
        state.amenitiesTypes.data = action.payload ?? [];
        state.amenitiesTypes.error = null;
      })
      .addCase(fetchAmenitiesTypeThunk.rejected, (state, action) => {
        state.amenitiesTypes.status = 'failed';
        state.amenitiesTypes.isLoading = false;
        state.amenitiesTypes.error =
          action.payload ?? action.error?.message ?? 'Failed to load amenities types';
        state.amenitiesTypes.data = [];
      })
      .addCase(getAgreementPendingSpaceAllocationListThunk.pending, (state, action) => {
        state.pendingSpaceAllocations.isLoading = true;
        state.pendingSpaceAllocations.error = null;
        const isAppend = Boolean(action.meta?.arg?.append);
        if (!isAppend) {
          state.pendingSpaceAllocations.data = {
            ...state.pendingSpaceAllocations.data,
            results: [],
          };
        }
      })
      .addCase(getAgreementPendingSpaceAllocationListThunk.fulfilled, (state, action) => {
        const isAppend = Boolean(action.meta?.arg?.append);
        const payload = action.payload || {};
        const incomingResults = Array.isArray(payload.results) ? payload.results : [];
        const previous = state.pendingSpaceAllocations.data || PENDING_ALLOCATIONS_DEFAULT_DATA;
        const existingResults = Array.isArray(previous.results) ? previous.results : [];
        const mergedResults = isAppend ? [...existingResults, ...incomingResults] : incomingResults;

        state.pendingSpaceAllocations.isLoading = false;
        state.pendingSpaceAllocations.data = {
          keyword: payload.keyword ?? '',
          page: numOr(payload.page, 1),
          page_size: numOr(payload.page_size, previous.page_size ?? 20),
          count: numOr(payload.count, incomingResults.length),
          total_count: numOr(payload.total_count, mergedResults.length),
          total_pages: numOr(payload.total_pages, 1),
          results: mergedResults,
        };
        state.pendingSpaceAllocations.error = null;
      })
      .addCase(getAgreementPendingSpaceAllocationListThunk.rejected, (state, action) => {
        const wasAppend = Boolean(action.meta?.arg?.append);
        state.pendingSpaceAllocations.isLoading = false;
        if (!wasAppend) {
          state.pendingSpaceAllocations.data = { ...PENDING_ALLOCATIONS_DEFAULT_DATA };
        }
        state.pendingSpaceAllocations.error =
          action.payload ?? action.error?.message ?? 'Failed to load pending allocations';
      });
  },
});

export const { resetClientCentersSpaceList } = agreementsSlice.actions;
export const selectAgreementComments = (state) =>
  state.agreements?.agreementComments || {
    data: {
      comments: [],
      history: [],
      communications: [],
      views: [],
      calls: [],
    },
    status: 'idle',
    error: null,
  };

export default agreementsSlice.reducer;
