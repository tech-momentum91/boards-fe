import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';
import { RiContactsBookLine } from 'react-icons/ri';

const PAGE_SIZE = 20;
const rejectWithToast = (error, rejectWithValue, defaultMessage = 'Something went wrong') => {
  showErrorToast(error, { defaultMessage });
  return rejectWithValue(error.response?.data || error.message || error);
};

const makeListviewState = () => ({
  data: [],
  columns: [],
  rawColumns: [],
  columnPref: [],
  stats: [],
  tab_counts: {},
  page: 1,
  pageSize: PAGE_SIZE,
  hasMore: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  // Grouped view state (when group_by is used)
  groups: [],
  groupPage: 1,
  groupSize: 10,
  totalGroups: 0,
  hasMoreGroups: false,
  isLoadingMoreGroups: false,
});

const initialState = {
  // Used by invite drawer
  inviteState: {
    isLoading: false,
    error: null,
    status: null,
  },

  visitorDetail: {
    data: [],
    isLoading: false,
    error: null,
    status: null,
  },

  clientList: {
    data: [],
    isLoading: false,
    error: null,
    status: null,
  },
  visitorComments: {
    data: {
      comments: [],
      history: [],
      communications: [],
      views: [],
      calls: [],
    },
    status: 'idle',
    error: null,
  },

  vendorList: {
    data: [],
    isLoading: false,
    error: null,
  },

  salesPersonList: {
    data: [],
    isLoading: false,
    error: null,
  },
  supervisorList: {
    data: [],
    isLoading: false,
    error: null,
  },
  vendorTypeList: {
    data: [],
    isLoading: false,
    error: null,
  },

  sourceList: {
    data: [],
    isLoading: false,
    error: null,
  },

  purposeOfVisitList: {
    data: [],
    isLoading: false,
    error: null,
  },

  allListview: makeListviewState(),
  visitorsListview: makeListviewState(),
  spaceListview: makeListviewState(),
  vendorsListview: makeListviewState(),
};

// ─── Invite ──────────────────────────────────────────────────────────────────

export const fetchPurposeOfVisitListThunk = createAsyncThunk(
  'vms/fetchPurposeOfVisitList',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/resource/Visiting Purpose');
      return response.data;
    } catch (error) {
      return rejectWithToast(error, rejectWithValue, 'Failed to fetch purpose of visit list');
    }
  },
);

export const fetchSupervisorListThunk = createAsyncThunk(
  'vms/supervisorList',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/method/devx.api.listview.list_with_search_filters?doctype=Employee&filters=[["custom_role", "=", "Supervisor"]]',
      );
      return response.data;
    } catch (error) {
      return rejectWithToast(error, rejectWithValue, 'Failed to fetch supervisor list');
    }
  },
);

export const fetchSourceListThunk = createAsyncThunk(
  'vms/sourceList',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/resource/Lead Source', {
        params: {
          limit_page_length: 500,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithToast(error, rejectWithValue, 'Failed to fetch lead sources');
    }
  },
);

export const fetchVendorTypeListThunk = createAsyncThunk(
  'vms/vendorTypeList',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/resource/OPEX Category', {
        params: {
          filters: JSON.stringify([['is_group', '=', 1]]),
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithToast(error, rejectWithValue, 'Failed to fetch vendor type list');
    }
  },
);

export const salesPersonListThunk = createAsyncThunk(
  'vms/salesPersonList',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/method/devx.api.listview.list_with_search_filters?doctype=User&filters=[["user_role", "in", ["Sales", "Inside Sales", "Purchase Manager"]]]',
      );
      return response.data;
    } catch (error) {
      return rejectWithToast(error, rejectWithValue, 'Failed to fetch sales person list');
    }
  },
);

export const getVendorListThunk = createAsyncThunk(
  'vms/getVendorList',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/resource/Supplier?fields=["name", "supplier_name"]&order_by=creation&filters=[["disabled","=",0]]',
      );
      return response.data;
    } catch (error) {
      return rejectWithToast(error, rejectWithValue, 'Failed to fetch vendor list');
    }
  },
);

export const cancelVisitThunk = createAsyncThunk(
  'vms/cancelVisit',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/resource/Visitor Entry/${payload.visitor_entry}`, {
        status: 'Cancelled',
      });
      return response.data;
    } catch (error) {
      return rejectWithToast(error, rejectWithValue, 'Failed to cancel visit');
    }
  },
);

export const getVisitorDetailThunk = createAsyncThunk(
  'vms/getVisitorDetail',
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        `/method/devx.vms.api.api.get_visitor_entry_detail?name=${id}`,
      );
      // console.log('response', response);
      return response.data;
    } catch (error) {
      return rejectWithToast(error, rejectWithValue, 'Failed to fetch visitor details');
    }
  },
);

export const getClientListThunk = createAsyncThunk(
  'vms/getClientList',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/resource/Customer?fields=["customer_name","name"]&order_by=creation&limit_page_length=999',
      );
      // console.log('response', response);
      return response.data;
    } catch (error) {
      return rejectWithToast(error, rejectWithValue, 'Failed to fetch client list');
    }
  },
);

/** Fetch comments + activity timeline for a visitor entry (VMS). */
export const fetchVisitorComments = createAsyncThunk(
  'vms/fetchVisitorComments',
  async ({ visitorEntry }, { rejectWithValue }) => {
    if (!visitorEntry) {
      return rejectWithValue('visitorEntry required');
    }
    try {
      const response = await apiClient.get(
        '/method/devx.vms.api.visitor_comments_and_activities.get_visitor_comments_and_activities',
        {
          params: {
            visitor_entry: String(visitorEntry),
          },
        },
      );
      const activities = response?.data?.message ?? response?.data ?? {};

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
      showErrorToast(error, { defaultMessage: 'Failed to fetch visitor comments and activities' });
      return rejectWithValue(
        error.serialized ||
          extractErrorMessage(error, 'Failed to fetch visitor comments and activities'),
      );
    }
  },
);

/** Add a new visitor comment (with optional attachments/files). */
export const addVisitorComment = createAsyncThunk(
  'vms/addVisitorComment',
  async (
    { visitorEntry, content, attachments = [], parentCommentId = null },
    { rejectWithValue },
  ) => {
    const hasContent = content != null && String(content).trim().length > 0;
    const hasAttachments = attachments && attachments.length > 0;

    if (!visitorEntry) {
      return rejectWithValue('visitorEntry required');
    }
    if (!hasContent && !hasAttachments) {
      return rejectWithValue('Comment text or at least one attachment is required');
    }

    try {
      const formData = new FormData();
      formData.append('visitor_entry', String(visitorEntry));
      formData.append('content', content ?? '');
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
        '/method/devx.vms.doctype.visitor_comment.visitor_comment.add_visitor_comment_with_files',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      return response?.data?.message || response?.data || null;
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to add visitor comment' });
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to add visitor comment'),
      );
    }
  },
);

/** Update a visitor entry (Visitor Entry doctype) by name. */
export const updateVisitorEntryThunk = createAsyncThunk(
  'vms/updateVisitorEntry',
  async ({ name, payload }, { rejectWithValue }) => {
    // console.log('name in api thunk', name);
    if (!name) return rejectWithValue('Visitor Entry name required');
    try {
      const response = await apiClient.put(
        `/resource/Visitor Entry/${encodeURIComponent(name)}`,
        payload,
      );
      const data = response?.data?.data ?? response?.data?.message ?? response?.data ?? payload;
      return data;
    } catch (error) {
      return rejectWithToast(error, rejectWithValue, 'Failed to update visitor entry');
    }
  },
);

export const inviteVisitorThunk = createAsyncThunk(
  'vms/inviteVisitor',
  async (payload, { rejectWithValue }) => {
    if (payload?.type === 'Space Inquiry') {
      payload.type = 'Space';
    }
    try {
      const response = await apiClient.post('/resource/Visitor Entry', payload);
      return response.data;
    } catch (error) {
      return rejectWithToast(error, rejectWithValue, 'Failed to invite visitor');
    }
  },
);

// ─── Listview ─────────────────────────────────────────────────────────────────

const getTodayDateString = () => new Date().toISOString().slice(0, 10);

const GROUP_PAGE_SIZE = 4;

export const fetchVmsGroupedListviewThunk = createAsyncThunk(
  'vms/fetchGroupedListview',
  async (
    {
      type = 'Visitor',
      keyword = '',
      filters,
      group_by = '',
      order_by = '',
      group_page = 1,
      group_size = GROUP_PAGE_SIZE,
      append = false,
      // navbar_filter,
    } = {},
    { rejectWithValue },
  ) => {
    if (!group_by) {
      return rejectWithValue('group_by is required for grouped listview');
    }
    try {
      const resolvedFilters =
        Array.isArray(filters) && filters.length > 0
          ? filters
          : [['visit_date_time', '=', getTodayDateString()]];

      const body = {
        keyword: (keyword ?? '').trim(),
        type,
        filters: resolvedFilters,
        group_by,
        group_page: group_page ?? 1,
        group_size: group_size ?? GROUP_PAGE_SIZE,
      };
      // if (
      //   navbar_filter &&
      //   typeof navbar_filter === 'object' &&
      //   Object.keys(navbar_filter).length > 0
      // ) {
      //   body.navbar_filter = navbar_filter;
      // }
      const shouldIncludeOrderBy = group_by !== 'vendor_type';
      if (order_by && shouldIncludeOrderBy) {
        body.order_by = order_by;
      }

      const response = await apiClient.post(
        '/method/devx.vms.api.listview.get_visitor_entries_grouped',
        body,
      );

      const message = response?.data?.message ?? {};
      const groups = message.groups ?? [];
      const stats = message.stats ?? [];
      const tabCounts = message.tab_counts ?? {};
      const apiGroupPage = message.group_page ?? group_page;
      const apiGroupSize = message.group_size ?? group_size;
      const totalGroups = message.total_groups ?? 0;
      const hasMore = Boolean(message.has_more);

      return {
        type,
        groups,
        stats,
        tabCounts,
        groupPage: apiGroupPage,
        groupSize: apiGroupSize,
        totalGroups,
        append,
        hasMoreGroups: hasMore,
      };
    } catch (error) {
      return rejectWithToast(error, rejectWithValue, 'Failed to fetch grouped listview');
    }
  },
);

export const fetchVmsListviewThunk = createAsyncThunk(
  'vms/fetchVmsListview',
  async (
    {
      type = 'Visitor',
      keyword = '',
      page = 1,
      filters,
      order_by = '',
      append = false,
      // navbar_filter,
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const resolvedFilters =
        Array.isArray(filters) && filters.length > 0
          ? filters
          : [['visit_date_time', '=', getTodayDateString()]];

      const body = {
        keyword: (keyword ?? '').trim(),
        page,
        type,
        filters: resolvedFilters,
      };
      if (order_by) {
        body.order_by = order_by;
      }
      // if (
      //   navbar_filter &&
      //   typeof navbar_filter === 'object' &&
      //   Object.keys(navbar_filter).length > 0
      // ) {
      //   body.navbar_filter = navbar_filter;
      // }

      const response = await apiClient.post(
        '/method/devx.vms.api.listview.get_visitor_entries_listview',
        body,
      );

      const message = response?.data?.message ?? {};

      // console.log('Message for test', message);
      const results = message.results ?? [];
      const columns = message.columns ?? [];
      const stats = message.stats ?? [];
      const totalCount = message.total_count ?? 0;
      const totalPages = message.total_pages ?? 1;
      const apiPage = message.page ?? page;
      const apiPageSize = message.page_size ?? PAGE_SIZE;
      const tabCounts = message.tab_counts ?? {};
      // console.log('Tab counts for test', tabCounts);
      const count = message.count ?? results.length;

      const hasMore =
        totalPages > apiPage || (count === apiPageSize && apiPage * apiPageSize < totalCount);

      return {
        type,
        results,
        columns,
        stats,
        page: apiPage,
        pageSize: apiPageSize,
        append,
        hasMore,
        totalCount,
        tabCounts,
      };
    } catch (error) {
      return rejectWithToast(error, rejectWithValue, 'Failed to fetch listview');
    }
  },
);

// ─── Column Preferences ───────────────────────────────────────────────────────

const VMS_DOCTYPE = 'Visitor Entry';

const VMS_TABLE_ID_MAP = {
  Visitor: 'VMS_VISITOR',
  Space: 'VMS_SPACE',
  Vendor: 'VMS_VENDOR',
};

export const saveVmsColumnPrefThunk = createAsyncThunk(
  'vms/saveColumnPref',
  async ({ type, columns }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: VMS_DOCTYPE,
        react_table_id: VMS_TABLE_ID_MAP[type] || 'VMS_VISITOR',
        columns: (columns || []).map((c) => ({
          id: c.id,
          visible: c.visible !== false,
          order: c.order,
          label: c.label,
        })),
      });
      return response.data;
    } catch (error) {
      return rejectWithToast(error, rejectWithValue, 'Failed to save column preferences');
    }
  },
);

export const fetchVmsColumnPrefThunk = createAsyncThunk(
  'vms/fetchColumnPref',
  async ({ type }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: {
          doctype: VMS_DOCTYPE,
          react_table_id: VMS_TABLE_ID_MAP[type] || 'VMS_VISITOR',
        },
      });
      return { type, message: response.data?.message };
    } catch (error) {
      return rejectWithToast(error, rejectWithValue, 'Failed to fetch column preferences');
    }
  },
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getKeyForType = (type) => {
  if (type === 'Space') return 'spaceListview';
  if (type === 'Vendor') return 'vendorsListview';
  if (type === 'All') return 'allListview';
  return 'visitorsListview';
};

const mergeColumnsWithPref = (rawColumns, pref) => {
  if (!pref || pref.length === 0) return rawColumns;
  const prefMap = new Map(pref.map((p) => [p.id, p]));
  const merged = rawColumns.map((col) => {
    const p = prefMap.get(col.id);
    return p ? { ...col, visible: p.visible, order: p.order ?? col.order } : col;
  });
  return merged.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const vmsSlice = createSlice({
  name: 'vms',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Invite
    builder
      .addCase(inviteVisitorThunk.pending, (state) => {
        state.inviteState.isLoading = true;
        state.inviteState.error = null;
        state.inviteState.status = 'pending';
      })
      .addCase(inviteVisitorThunk.fulfilled, (state) => {
        state.inviteState.isLoading = false;
        state.inviteState.status = 'success';
      })
      .addCase(inviteVisitorThunk.rejected, (state, action) => {
        state.inviteState.isLoading = false;
        state.inviteState.status = 'error';
        state.inviteState.error = action.payload || 'Failed to invite visitor';
      });

    // Listview fetch
    builder
      .addCase(fetchVmsListviewThunk.pending, (state, action) => {
        const key = getKeyForType(action.meta.arg?.type);
        // console.log('action.meta.arg', key);
        if (action.meta.arg?.append) {
          state[key].isLoadingMore = true;
        } else {
          state[key].isLoading = true;
          state[key].error = null;
        }
        // Reset grouped state when fetching regular listview
        state[key].groups = [];
      })
      .addCase(fetchVmsListviewThunk.fulfilled, (state, action) => {
        const { type, results, columns, stats, page, pageSize, append, hasMore, tabCounts } =
          action.payload;
        const key = getKeyForType(type);

        state[key].isLoading = false;
        state[key].isLoadingMore = false;
        state[key].error = null;
        state[key].page = page;
        state[key].pageSize = pageSize;
        state[key].hasMore = hasMore;
        state[key].stats = stats;
        state[key].tab_counts = tabCounts;

        if (Array.isArray(columns) && columns.length > 0) {
          state[key].rawColumns = columns;
          state[key].columns = mergeColumnsWithPref(columns, state[key].columnPref);
        }

        if (append) {
          state[key].data = [...(state[key].data || []), ...results];
        } else {
          state[key].data = results;
        }
      })
      .addCase(fetchVmsListviewThunk.rejected, (state, action) => {
        const key = getKeyForType(action.meta.arg?.type);
        state[key].isLoading = false;
        state[key].isLoadingMore = false;
        state[key].error =
          action.payload?.message || action.payload || 'Failed to fetch visitor entries';
      })
      // Grouped listview fetch
      .addCase(fetchVmsGroupedListviewThunk.pending, (state, action) => {
        const key = getKeyForType(action.meta.arg?.type);
        if (action.meta.arg?.append) {
          state[key].isLoadingMoreGroups = true;
        } else {
          state[key].isLoading = true;
          state[key].error = null;
        }
        if (!action.meta.arg?.append) {
          state[key].data = [];
        }
      })
      .addCase(fetchVmsGroupedListviewThunk.fulfilled, (state, action) => {
        const { type, groups, stats, groupPage, groupSize, totalGroups, append, hasMoreGroups } =
          action.payload;
        const key = getKeyForType(type);

        state[key].isLoading = false;
        state[key].isLoadingMoreGroups = false;
        state[key].error = null;
        state[key].groupPage = groupPage;
        state[key].groupSize = groupSize;
        state[key].totalGroups = totalGroups;
        state[key].hasMoreGroups = hasMoreGroups;
        state[key].stats = stats;

        if (append) {
          state[key].groups = [...(state[key].groups || []), ...groups];
        } else {
          state[key].groups = groups;
        }
      })
      .addCase(fetchVmsGroupedListviewThunk.rejected, (state, action) => {
        const key = getKeyForType(action.meta.arg?.type);
        state[key].isLoading = false;
        state[key].isLoadingMoreGroups = false;
        state[key].error =
          action.payload?.message || action.payload || 'Failed to fetch grouped visitor entries';
      })
      .addCase(fetchVmsColumnPrefThunk.fulfilled, (state, action) => {
        const { type, message } = action.payload || {};
        const key = getKeyForType(type);
        if (!key) return;
        const prefCols = Array.isArray(message) ? message : message?.columns;
        const hasPref = Array.isArray(prefCols) && prefCols.length > 0;
        state[key].columnPref = hasPref ? prefCols : [];
        if (hasPref) {
          state[key].columns =
            state[key].rawColumns.length > 0
              ? mergeColumnsWithPref(state[key].rawColumns, prefCols)
              : prefCols;
        }
      })
      .addCase(saveVmsColumnPrefThunk.fulfilled, (state, action) => {
        const { type, columns } = action.meta.arg || {};
        const key = getKeyForType(type);
        if (!key || !Array.isArray(columns)) return;
        const normalized = columns.map((c, i) => ({
          id: c.id,
          visible: c.visible !== false,
          order: c.order ?? i,
          label: c.label,
        }));
        state[key].columnPref = normalized;
        if (state[key].rawColumns?.length > 0) {
          state[key].columns = mergeColumnsWithPref(state[key].rawColumns, normalized);
        }
      });

    // Client list
    builder
      .addCase(getClientListThunk.pending, (state) => {
        state.clientList.isLoading = true;
        state.clientList.error = null;
        state.clientList.status = 'pending';
      })
      .addCase(getClientListThunk.fulfilled, (state, action) => {
        // console.log('action.payload', action.payload);
        state.clientList.isLoading = false;
        state.clientList.error = null;
        state.clientList.status = 'success';
        state.clientList.data = action.payload;
      })
      .addCase(getClientListThunk.rejected, (state, action) => {
        state.clientList.isLoading = false;
        state.clientList.error = action.payload;
        state.clientList.status = 'error';
      });

    // Visitor comments & activity timeline
    builder
      .addCase(fetchVisitorComments.pending, (state) => {
        state.visitorComments.status = 'loading';
        state.visitorComments.error = null;
      })
      .addCase(fetchVisitorComments.fulfilled, (state, action) => {
        state.visitorComments.status = 'succeeded';
        state.visitorComments.data = {
          comments: action.payload?.comments || [],
          history: action.payload?.history || [],
          communications: action.payload?.communications || [],
          views: action.payload?.views || [],
          calls: action.payload?.calls || [],
        };
        state.visitorComments.error = null;
      })
      .addCase(fetchVisitorComments.rejected, (state, action) => {
        state.visitorComments.status = 'failed';
        state.visitorComments.error = action.payload || action.error?.message;
        state.visitorComments.data = {
          comments: [],
          history: [],
          communications: [],
          views: [],
          calls: [],
        };
      })
      .addCase(addVisitorComment.fulfilled, (state, action) => {
        const newComment = action.payload;
        if (newComment && state.visitorComments?.data) {
          const current = state.visitorComments.data.comments || [];
          state.visitorComments.data.comments = [...current, newComment];
        }
      });

    // Visitor detail
    builder
      .addCase(getVisitorDetailThunk.pending, (state) => {
        state.visitorDetail.isLoading = true;
        state.visitorDetail.error = null;
        state.visitorDetail.status = 'pending';
      })
      .addCase(getVisitorDetailThunk.fulfilled, (state, action) => {
        state.visitorDetail.isLoading = false;
        state.visitorDetail.error = null;
        state.visitorDetail.status = action.status;
        state.visitorDetail.data = action.payload;
      })
      .addCase(getVisitorDetailThunk.rejected, (state, action) => {
        state.visitorDetail.isLoading = false;
        state.visitorDetail.error = action.payload;
        state.visitorDetail.status = 'error';
      });

    // Update visitor entry
    builder.addCase(updateVisitorEntryThunk.fulfilled, (state, action) => {
      const updated = action.payload;
      if (!updated) return;
      const currentMessage = state.visitorDetail.data?.message;
      if (currentMessage && (currentMessage.name === updated.name || !updated.name)) {
        state.visitorDetail.data = {
          ...state.visitorDetail.data,
          message: { ...currentMessage, ...updated },
        };
      }
    });

    // Cancel visit
    builder.addCase(cancelVisitThunk.pending, (state) => {
      state.visitorDetail.isLoading = true;
      state.visitorDetail.error = null;
      state.visitorDetail.status = 'pending';
    });

    builder.addCase(cancelVisitThunk.fulfilled, (state, action) => {
      state.visitorDetail.isLoading = false;
      state.visitorDetail.error = null;
      state.visitorDetail.status = 'success';
    });

    builder.addCase(cancelVisitThunk.rejected, (state, action) => {
      state.visitorDetail.isLoading = false;
      state.visitorDetail.error = action.payload;
      state.visitorDetail.status = 'error';
    });

    // Vendor list
    builder.addCase(getVendorListThunk.pending, (state) => {
      state.vendorList.isLoading = true;
      state.vendorList.error = null;
      state.vendorList.status = 'pending';
    });
    builder.addCase(getVendorListThunk.fulfilled, (state, action) => {
      state.vendorList.isLoading = false;
      state.vendorList.error = null;
      state.vendorList.status = 'success';
      state.vendorList.data = action.payload;
    });
    builder.addCase(getVendorListThunk.rejected, (state, action) => {
      state.vendorList.isLoading = false;
      state.vendorList.error = action.payload;
      state.vendorList.status = 'error';
    });

    // Sales person list
    builder.addCase(salesPersonListThunk.pending, (state) => {
      state.salesPersonList.isLoading = true;
      state.salesPersonList.error = null;
      state.salesPersonList.status = 'pending';
    });
    builder.addCase(salesPersonListThunk.fulfilled, (state, action) => {
      state.salesPersonList.isLoading = false;
      state.salesPersonList.error = null;
      state.salesPersonList.status = 'success';
      state.salesPersonList.data = action.payload;
    });
    builder.addCase(salesPersonListThunk.rejected, (state, action) => {
      state.salesPersonList.isLoading = false;
      state.salesPersonList.error = action.payload;
      state.salesPersonList.status = 'error';
    });

    // Supervisor list
    builder.addCase(fetchSupervisorListThunk.pending, (state) => {
      state.supervisorList.isLoading = true;
      state.supervisorList.error = null;
      state.supervisorList.status = 'pending';
    });
    builder.addCase(fetchSupervisorListThunk.fulfilled, (state, action) => {
      state.supervisorList.isLoading = false;
      state.supervisorList.error = null;
      state.supervisorList.status = 'success';
      state.supervisorList.data = action.payload;
    });
    builder.addCase(fetchSupervisorListThunk.rejected, (state, action) => {
      state.supervisorList.isLoading = false;
      state.supervisorList.error = action.payload;
      state.supervisorList.status = 'error';
    });

    // Source list
    builder.addCase(fetchSourceListThunk.pending, (state) => {
      state.sourceList.isLoading = true;
      state.sourceList.error = null;
      state.sourceList.status = 'pending';
    });
    builder.addCase(fetchSourceListThunk.fulfilled, (state, action) => {
      // console.log('action.payload', action.payload);
      state.sourceList.isLoading = false;
      state.sourceList.error = null;
      state.sourceList.status = 'success';
      state.sourceList.data = action.payload;
    });
    builder.addCase(fetchSourceListThunk.rejected, (state, action) => {
      state.sourceList.isLoading = false;
      state.sourceList.error = action.payload;
      state.sourceList.status = 'error';
    });

    // Vendor type list
    builder.addCase(fetchVendorTypeListThunk.pending, (state) => {
      state.vendorTypeList.isLoading = true;
      state.vendorTypeList.error = null;
      state.vendorTypeList.status = 'pending';
    });
    builder.addCase(fetchVendorTypeListThunk.fulfilled, (state, action) => {
      state.vendorTypeList.isLoading = false;
      state.vendorTypeList.error = null;
      state.vendorTypeList.status = 'success';
      state.vendorTypeList.data = action.payload;
    });
    builder.addCase(fetchVendorTypeListThunk.rejected, (state, action) => {
      state.vendorTypeList.isLoading = false;
      state.vendorTypeList.error = action.payload;
      state.vendorTypeList.status = 'error';
    });

    // Purpose of visit list
    builder.addCase(fetchPurposeOfVisitListThunk.pending, (state) => {
      state.purposeOfVisitList.isLoading = true;
      state.purposeOfVisitList.error = null;
      state.purposeOfVisitList.status = 'pending';
    });
    builder.addCase(fetchPurposeOfVisitListThunk.fulfilled, (state, action) => {
      state.purposeOfVisitList.isLoading = false;
      state.purposeOfVisitList.error = null;
      state.purposeOfVisitList.status = 'success';
      state.purposeOfVisitList.data = action.payload;
    });
    builder.addCase(fetchPurposeOfVisitListThunk.rejected, (state, action) => {
      state.purposeOfVisitList.isLoading = false;
      state.purposeOfVisitList.error = action.payload;
      state.purposeOfVisitList.status = 'error';
    });
  },
});

export default vmsSlice.reducer;
