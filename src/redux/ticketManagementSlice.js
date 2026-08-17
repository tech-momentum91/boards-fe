import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import {
  DEFAULT_FILTERS,
  getTicketFieldValue,
  TICKET_MARKER_COORDINATE_API_FIELD,
  TICKET_MARKER_COORDINATE_FIELD,
  TICKET_FIELD_MAPPING,
} from '@/components/ticket-management/constants';
import { updateCenterThunk } from '@/redux/centerSlice';
import {
  getCenterLabelSyncFromUpdateAction,
  mapCenterOptionsWithLabelSync,
} from '@/utils/center-label-sync';

const TICKET_DOCTYPE = 'HD Ticket';
const COMMENT_DOCTYPE = 'HD Ticket Comment';
const COMMUNICATION_DOCTYPE = 'Communication';

/** Default per-page size for ticket list views (Ticket Management module). */
export const DEFAULT_TICKET_LIST_PAGE_SIZE = 15;

const resolveThunkErrorMessage = (payload, fallback = 'Request failed') => {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload;
  if (typeof payload?.message === 'string') return payload.message;
  return fallback;
};

const buildFilters = (filters = {}) => {
  const frappeFilters = {};

  if (filters.status) {
    if (Array.isArray(filters.status) && filters.status.length > 0) {
      frappeFilters.status = ['in', filters.status];
    } else if (typeof filters.status === 'string' && filters.status.trim()) {
      frappeFilters.status = ['=', filters.status];
    }
  }

  if (filters.priority) {
    if (Array.isArray(filters.priority) && filters.priority.length > 0) {
      frappeFilters.custom_priority = ['in', filters.priority];
    } else if (typeof filters.priority === 'string' && filters.priority.trim()) {
      frappeFilters.custom_priority = ['=', filters.priority];
    }
  }

  if (filters.center) {
    if (Array.isArray(filters.center) && filters.center.length > 0) {
      frappeFilters.custom_center = ['in', filters.center];
    } else if (typeof filters.center === 'string' && filters.center.trim()) {
      frappeFilters.custom_center = ['=', filters.center];
    }
  }

  if (filters.zone) {
    if (Array.isArray(filters.zone) && filters.zone.length > 0) {
      frappeFilters.zone = ['in', filters.zone];
    } else if (typeof filters.zone === 'string' && filters.zone.trim()) {
      frappeFilters.zone = ['=', filters.zone];
    }
  }

  // Global centre header signal: user explicitly deselected every centre.
  // Pages set this flag via `adaptGlobalCenterIntent.ticket()` in
  // `@/utils/global-center-filter`; the matching backend short-circuit lives
  // in `devx.api.global_center_filter.is_explicit_empty_center_filter`. The
  // empty `IN` list survives the request and the backend returns 0 rows —
  // without this the empty array above would be dropped silently and the API
  // would return every centre's tickets.
  if (filters.centerExplicitlyEmpty === true) {
    frappeFilters.custom_center = ['in', []];
  }

  if (filters.raised_by) {
    if (Array.isArray(filters.raised_by) && filters.raised_by.length > 0) {
      frappeFilters.raised_by = ['in', filters.raised_by];
    } else if (typeof filters.raised_by === 'string' && filters.raised_by.trim()) {
      frappeFilters.raised_by = ['=', filters.raised_by];
    }
  }

  if (filters.client) {
    if (Array.isArray(filters.client) && filters.client.length > 0) {
      frappeFilters.customer = ['in', filters.client];
    } else if (typeof filters.client === 'string' && filters.client.trim()) {
      frappeFilters.customer = ['=', filters.client];
    }
  }

  if (filters.custom_ticket_type) {
    if (Array.isArray(filters.custom_ticket_type) && filters.custom_ticket_type.length > 0) {
      frappeFilters.custom_ticket_type = ['in', filters.custom_ticket_type];
    } else if (
      typeof filters.custom_ticket_type === 'string' &&
      filters.custom_ticket_type.trim()
    ) {
      frappeFilters.custom_ticket_type = ['=', filters.custom_ticket_type];
    }
  }

  const requiresRm = filters.custom_requires_rm;
  if (requiresRm === true || requiresRm === 1 || requiresRm === '1') {
    frappeFilters.custom_requires_rm = 1;
  }

  // Handle assignee filter - map to _assign field (JSON field containing assignee array)
  // The API will handle JSON_SEARCH to properly filter by assignee emails
  if (filters.assignee) {
    const assigneeValue = filters.assignee;
    // Only create filter if we have actual values (not empty array or empty string)
    const hasValue = Array.isArray(assigneeValue)
      ? assigneeValue.length > 0
      : typeof assigneeValue === 'string' && assigneeValue.trim().length > 0;

    if (hasValue) {
      // Send assignee filter - API will convert this to JSON_SEARCH query
      if (Array.isArray(assigneeValue)) {
        // For multiple assignees, send all of them - API will handle OR logic
        frappeFilters._assign = ['in', assigneeValue];
      } else {
        frappeFilters._assign = ['=', assigneeValue.trim()];
      }
    }
  }

  if (filters.category) {
    if (Array.isArray(filters.category) && filters.category.length > 0) {
      frappeFilters.custom_l1 = ['in', filters.category];
    } else if (typeof filters.category === 'string' && filters.category.trim()) {
      frappeFilters.custom_l1 = ['=', filters.category];
    }
  }

  if (filters.sub_category) {
    if (Array.isArray(filters.sub_category) && filters.sub_category.length > 0) {
      frappeFilters.ticket_type = ['in', filters.sub_category];
    } else if (typeof filters.sub_category === 'string' && filters.sub_category.trim()) {
      frappeFilters.ticket_type = ['=', filters.sub_category];
    }
  }

  if (filters.sub_sub_category) {
    if (Array.isArray(filters.sub_sub_category) && filters.sub_sub_category.length > 0) {
      frappeFilters.ticket_type = ['in', filters.sub_sub_category];
    } else if (typeof filters.sub_sub_category === 'string' && filters.sub_sub_category.trim()) {
      frappeFilters.ticket_type = ['=', filters.sub_sub_category];
    }
  }

  if (filters.severity) {
    if (Array.isArray(filters.severity) && filters.severity.length > 0) {
      frappeFilters.priority = ['in', filters.severity];
    } else if (typeof filters.severity === 'string' && filters.severity.trim()) {
      frappeFilters.priority = ['=', filters.severity];
    }
  }

  if (filters.resolution_time) {
    if (Array.isArray(filters.resolution_time) && filters.resolution_time.length > 0) {
      frappeFilters.resolution_time = ['in', filters.resolution_time];
    } else if (typeof filters.resolution_time === 'string' && filters.resolution_time.trim()) {
      frappeFilters.resolution_time = ['=', filters.resolution_time];
    }
  }

  // Add search as OR filters across multiple fields: ticket ID, title, center (both link and name), and client (both link and name)
  const frappeOrFilters = [];
  if (filters.search && filters.search.trim().length > 0) {
    const searchTerm = filters.search.trim();
    frappeOrFilters.push(
      ['name', 'LIKE', `%${searchTerm}%`], // Ticket ID
      ['subject', 'LIKE', `%${searchTerm}%`], // Ticket title
      ['custom_center', 'LIKE', `%${searchTerm}%`], // Center link field (code/ID)
      ['custom_center_name', 'LIKE', `%${searchTerm}%`], // Center name
      ['customer', 'LIKE', `%${searchTerm}%`], // Client link field (code/ID)
      ['custom_customer_name', 'LIKE', `%${searchTerm}%`], // Client name
    );
  }

  return {
    filters: frappeFilters,
    or_filters: frappeOrFilters.length > 0 ? frappeOrFilters : undefined,
  };
};

const TABLE_FIELDS = [
  'name',
  'subject',
  'description', // HD Ticket field for description
  'status',
  'priority',
  'custom_priority',
  'raised_by',
  '_assign', // For multiple assignees
  'customer',
  'creation',
  'modified',
  'custom_ticket_type',
  'custom_center',
  'custom_ticket_type',
  'ticket_type',
  'custom_l2',
  'custom_visible_to_client',
  'custom_due_date',
  'custom_l1',
  'custom_floor',
  'first_responded_on',
  'response_by',
  'agreement_status',
  'custom_center_name',
  'custom_space',
  'custom_space_name',
  'custom_center_spoc',
  'custom_client_spoc',
];

const humanDate = (value) => {
  if (!value) return '--';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch (error) {
    console.warn('Ticket date formatting failed', error);
    return value;
  }
};

const humanDateTime = (value) => {
  if (!value) return '--';
  try {
    const date = new Date(value);
    const dateString = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
    const timeString = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
    return `${dateString}, ${timeString}`;
  } catch (error) {
    console.warn('Ticket datetime formatting failed', error);
    return value;
  }
};

const TICKET_PEOPLE_FIELDS = new Set(['center_spoc', 'client_spoc']);

const preserveTicketPeopleDisplayFields = (target, source) => {
  if (!target || !source) return;
  target.raised_by_label = source.raised_by_label;
  target.raised_by_display = source.raised_by_display;
  target.raised_by_option = source.raised_by_option;
  target.issue_raised_by_label = source.issue_raised_by_label || source.raised_by_label;
  target.issue_raised_by_display = source.issue_raised_by_display || source.raised_by_display;
  target.issue_raised_by_option = source.issue_raised_by_option || source.raised_by_option;
  target.center_spoc_label = source.center_spoc_label;
  target.center_spoc_display = source.center_spoc_display;
  target.center_spoc_options = source.center_spoc_options;
  target.client_spoc_label = source.client_spoc_label;
  target.client_spoc_display = source.client_spoc_display;
  target.client_spoc_options = source.client_spoc_options;
};

const transformTicketRows = (rows = []) => {
  return rows.map((row) => {
    // Use unified field mapping from constants - single source of truth
    const transformed = {
      ...row,
      // Basic fields that don't need mapping
      name: row.name || '',
      status: row.status || '',
      raised_by: row.raised_by || '',
      raised_by_label: row.raised_by_display || row.issue_raised_by_display || '',
      raised_by_option: row.raised_by_option || row.issue_raised_by_option || null,
      _assign: row._assign || '',
      agent: row.agent || row.assigned_to || '',

      // Preserve assignees array from API if available (contains full_name and user_image)
      assignees: row.assignees || [],

      // All mapped fields use unified helper from constants
      ticket_title: getTicketFieldValue(row, 'ticket_title') || '',
      subject: getTicketFieldValue(row, 'ticket_title') || row.subject || '',
      description: getTicketFieldValue(row, 'description') || '',
      summary: getTicketFieldValue(row, 'description') || row.summary || '',
      custom_ticket_type: getTicketFieldValue(row, 'custom_ticket_type') || '',
      category: getTicketFieldValue(row, 'category') || '',
      sub_category: getTicketFieldValue(row, 'sub_category') || '',
      sub_sub_category: getTicketFieldValue(row, 'sub_sub_category') || '',
      severity: getTicketFieldValue(row, 'severity') || '',
      priority: getTicketFieldValue(row, 'priority') || '',
      center: getTicketFieldValue(row, 'center') || '',
      space: getTicketFieldValue(row, 'space') || '',
      space_name: getTicketFieldValue(row, 'space_name') || '',
      floor: getTicketFieldValue(row, 'floor') || '',
      assigned_to: getTicketFieldValue(row, 'assigned_to') || '',
      visible_to_client: getTicketFieldValue(row, 'visible_to_client') || false,
      due_date: getTicketFieldValue(row, 'due_date') || '',
      // Back-compat: older UI used issue_raised_by for the person picker
      issue_raised_by: row.raised_by || '',
      issue_raised_by_label: row.raised_by_display || row.issue_raised_by_display || '',
      issue_raised_by_option: row.raised_by_option || row.issue_raised_by_option || null,
      center_spoc: getTicketFieldValue(row, 'center_spoc') || '',
      center_spoc_label: row.center_spoc_display || '',
      center_spoc_options: row.center_spoc_options || [],
      client_spoc: getTicketFieldValue(row, 'client_spoc') || '',
      client_spoc_label: row.client_spoc_display || '',
      client_spoc_options: row.client_spoc_options || [],

      marker_coordinate: getTicketFieldValue(row, 'marker_coordinate') || '',

      // Timestamps
      created_datetime: humanDateTime(row.creation),
      updated_datetime: humanDateTime(row.modified),
    };
    return transformed;
  });
};

// Map frontend column IDs to backend field names for sorting
// Uses TICKET_FIELD_MAPPING as the single source of truth
const mapOrderByToBackend = (orderBy) => {
  if (!orderBy || typeof orderBy !== 'string') {
    return orderBy;
  }

  // Parse orderBy string (e.g., "severity asc" or "name desc")
  const parts = orderBy.trim().split(/\s+/);
  if (parts.length === 0) {
    return orderBy;
  }

  const frontendField = parts[0];
  const direction = parts.length > 1 ? parts.slice(1).join(' ') : 'desc'; // Default to 'desc' if not specified

  // Map frontend field to backend field using TICKET_FIELD_MAPPING
  // Same pattern used in createTicket and updateTicketField
  let backendField = frontendField;
  if (TICKET_FIELD_MAPPING[frontendField]) {
    // Use the first (primary) backend field from the mapping array
    backendField = TICKET_FIELD_MAPPING[frontendField][0];
  }

  // Reconstruct orderBy string with backend field name
  return `${backendField} ${direction}`;
};

// Mock data for development
// Mock data removed - using actual helpdesk API

export const fetchTickets = createAsyncThunk(
  'ticketManagement/fetchTickets',
  async (params = {}, thunkAPI) => {
    const {
      filters = DEFAULT_FILTERS,
      page = 1,
      pageSize = DEFAULT_TICKET_LIST_PAGE_SIZE,
      orderBy = 'modified desc',
      append = false, // New parameter to support scroll pagination
    } = params;

    try {
      // Build filters including search as OR filters across multiple fields
      const { filters: listFilters, or_filters: listOrFilters } = buildFilters(filters);

      // Map frontend column IDs to backend field names for sorting
      const backendOrderBy = mapOrderByToBackend(orderBy);

      // Use custom devx paginated API that properly handles pagination with start parameter
      const requestBody = {
        filters: listFilters,
        order_by: backendOrderBy,
        page,
        page_length: pageSize,
        rows: TABLE_FIELDS, // Array of field names
      };

      // Add or_filters if search is being used
      if (listOrFilters) {
        requestBody.or_filters = listOrFilters;
      }

      const response = await apiClient.post(
        '/method/devx.api.ticket.get_ticket_list_paginated',
        requestBody,
      );

      const responseData = response?.data?.message || {};
      const rawRows = responseData.data || [];
      const totalCount = responseData.total_count || 0;
      const hasMore = responseData.has_more ?? false;
      const statusCounts = responseData.status_counts || {};

      return {
        rows: transformTicketRows(rawRows),
        page,
        pageSize,
        filters,
        totalCount,
        statusCounts,
        append, // Pass append flag to reducer
        hasMore, // Check if there's more data
      };
    } catch (error) {
      console.error('Error fetching tickets:', error);
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchTicketStatusCounts = createAsyncThunk(
  'ticketManagement/fetchTicketStatusCounts',
  async (params = {}, thunkAPI) => {
    const { filters = DEFAULT_FILTERS } = params;

    try {
      const { filters: listFilters, or_filters: listOrFilters } = buildFilters(filters);
      const requestBody = { filters: listFilters };
      if (listOrFilters) {
        requestBody.or_filters = listOrFilters;
      }

      const response = await apiClient.post(
        '/method/devx.api.ticket.get_ticket_status_counts',
        requestBody,
      );

      const responseData = response?.data?.message || {};
      return {
        statusCounts: responseData.status_counts || {},
        totalCount: responseData.total_count ?? 0,
        incidentCount: responseData.incident_count ?? 0,
        requiresRmCount: responseData.requires_rm_count ?? 0,
      };
    } catch (error) {
      console.error('Error fetching ticket status counts:', error);
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const exportTickets = createAsyncThunk(
  'ticketManagement/exportTickets',
  async (params = {}, thunkAPI) => {
    const { filters = DEFAULT_FILTERS, sorting = [], isClientUser = false } = params;

    try {
      // Build filters including search as OR filters across multiple fields
      const { filters: listFilters, or_filters: listOrFilters } = buildFilters(filters);

      let orderBy = 'modified desc';
      if (Array.isArray(sorting) && sorting.length > 0) {
        const sortField = sorting[0].id;
        const sortOrder = sorting[0].desc ? 'desc' : 'asc';
        orderBy = mapOrderByToBackend(`${sortField} ${sortOrder}`);
      }

      const requestParams = {
        filters: JSON.stringify(listFilters),
        order_by: orderBy,
      };

      if (listOrFilters) {
        requestParams.or_filters = JSON.stringify(listOrFilters);
      }

      if (isClientUser) {
        requestParams.is_client_user = 1;
      }

      const response = await apiClient.get('/method/devx.api.ticket.export_tickets_csv', {
        params: requestParams,
        responseType: 'blob',
      });

      return response?.data;
    } catch (error) {
      console.error('Error exporting tickets:', error);
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchTicketDetail = createAsyncThunk(
  'ticketManagement/fetchTicketDetail',
  async (name, thunkAPI) => {
    if (!name) {
      return thunkAPI.rejectWithValue('Ticket ID is required');
    }

    try {
      const response = await apiClient.get(
        '/method/devx.api.ticket.get_ticket_detail_with_assignees',
        {
          params: {
            name,
          },
        },
      );

      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchTicketComments = createAsyncThunk(
  'ticketManagement/fetchTicketComments',
  async (ticketName, thunkAPI) => {
    if (!ticketName) {
      return thunkAPI.rejectWithValue('Ticket ID is required');
    }

    try {
      // Use helpdesk API to get ticket activities (includes comments, history, communications, etc.)
      // Convert ticket ID to string as API expects string type
      const response = await apiClient.post(
        '/method/devx.api.ticket.get_ticket_activities_filtered',
        {
          ticket: String(ticketName),
        },
      );

      const activities = response?.data?.message || {};

      // Return structured data with comments, history, communications, views, and calls
      return {
        comments: activities.comments || [],
        history: activities.history || [],
        communications: activities.communications || [],
        views: activities.views || [],
        calls: activities.calls || [],
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchTicketActivity = createAsyncThunk(
  'ticketManagement/fetchTicketActivity',
  async (ticketName, thunkAPI) => {
    if (!ticketName) {
      return thunkAPI.rejectWithValue('Ticket ID is required');
    }

    try {
      // Use helpdesk API to get ticket activities
      // Note: This is the same API as fetchTicketComments, but kept separate for flexibility
      // Convert ticket ID to string as API expects string type
      const response = await apiClient.post(
        '/method/devx.api.ticket.get_ticket_activities_filtered',
        {
          ticket: String(ticketName),
        },
      );

      const activities = response?.data?.message || {};

      // Return history and communications for activity timeline
      return {
        history: activities.history || [],
        communications: activities.communications || [],
        views: activities.views || [],
        calls: activities.calls || [],
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const createTicket = createAsyncThunk(
  'ticketManagement/createTicket',
  async (ticketPayload, thunkAPI) => {
    try {
      // Map frontend field names to backend field names using TICKET_FIELD_MAPPING
      const mappedPayload = {};

      console.log('Ticekt payload in slice', ticketPayload);

      // Fields to exclude from mapping (they're handled separately)
      const excludeFields = ['attachments', 'client_comments', 'internal_comments'];

      // Map all fields using TICKET_FIELD_MAPPING
      for (const [frontendField, value] of Object.entries(ticketPayload)) {
        // Skip excluded fields and null/undefined/empty string values
        if (
          excludeFields.includes(frontendField) ||
          value === null ||
          value === undefined ||
          value === ''
        ) {
          continue;
        }

        // Check if this field has a mapping
        if (TICKET_FIELD_MAPPING[frontendField]) {
          // Use the first (primary) backend field from the mapping array
          const backendField = TICKET_FIELD_MAPPING[frontendField][0];
          if (
            backendField === TICKET_MARKER_COORDINATE_API_FIELD &&
            value != null &&
            typeof value === 'object'
          ) {
            mappedPayload[backendField] = JSON.stringify(value);
          } else {
            mappedPayload[backendField] = value;
          }
        } else {
          // Keep field as-is if no mapping exists
          mappedPayload[frontendField] = value;
        }
      }

      // Handle assignees: normalize to email strings and include in doc
      const assigneeSource = ticketPayload.assigned_to || ticketPayload.assign_to;
      if (assigneeSource) {
        const assignees = Array.isArray(assigneeSource) ? assigneeSource : [assigneeSource];
        const normalized = assignees
          .map((a) => (typeof a === 'string' ? a : a.value || a.email || a.name || a))
          .filter(Boolean);

        if (normalized.length > 0) {
          mappedPayload.assign_to = normalized;
          // Set agent to first assignee
          mappedPayload.agent = normalized[0];
        }
      } else if (ticketPayload.agent) {
        mappedPayload.agent = ticketPayload.agent;
      }

      // Ensure subject is set (for ticket_title mapping)
      if (!mappedPayload.subject && ticketPayload.ticket_title) {
        mappedPayload.subject = ticketPayload.ticket_title;
      }

      // Set custom_visible_to_client based on ticket type

      const ticketType = mappedPayload.custom_ticket_type;
      if (ticketType === 'Internal ticket') {
        mappedPayload.custom_visible_to_client = 0;
      } else if (ticketPayload.visible_to_client !== undefined) {
        mappedPayload.custom_visible_to_client = ticketPayload.visible_to_client ? 1 : 0;
      }

      // Prepare FormData for the new API
      const formData = new FormData();

      // Add doc as JSON string (includes assign_to if provided)
      formData.append('doc', JSON.stringify(mappedPayload));

      // Add comments if provided (only if they have content)
      if (ticketPayload.internal_comments && ticketPayload.internal_comments.trim()) {
        formData.append('internal_comment', ticketPayload.internal_comments.trim());
      }
      if (ticketPayload.client_comments && ticketPayload.client_comments.trim()) {
        formData.append('client_comment', ticketPayload.client_comments.trim());
      }

      // Add files if provided
      if (ticketPayload.attachments && ticketPayload.attachments.length > 0) {
        ticketPayload.attachments.forEach((attachment) => {
          // If attachment has a file property (File object), append it
          if (attachment.file && attachment.file instanceof File) {
            formData.append('files[]', attachment.file);
          }
        });
      }

      // Call the new API endpoint
      const response = await apiClient.post(
        '/method/devx.api.ticket.create_ticket_with_comments_and_files',
        formData,
      );

      const newTicket = response?.data?.message;

      // Fetch the newly created ticket to get the full, updated document (including _assign)
      const fetchedTicket = await apiClient.get(
        '/method/devx.api.ticket.get_ticket_detail_with_assignees',
        { params: { name: newTicket.name } },
      );

      return fetchedTicket?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

// Assign ticket to users
export const assignTicket = createAsyncThunk(
  'ticketManagement/assignTicket',
  async ({ name, assign_to }, thunkAPI) => {
    if (!name) {
      return thunkAPI.rejectWithValue('Ticket name is required');
    }

    try {
      // Ensure assign_to is an array
      const assignees = Array.isArray(assign_to) ? assign_to : [assign_to].filter(Boolean);

      if (assignees.length === 0) {
        return thunkAPI.rejectWithValue('At least one assignee is required');
      }

      // Normalize assignees to strings (user emails/names) for API call
      const assigneesList = assignees.map((a) =>
        typeof a === 'string' ? a : a.value || a.email || a.name || a,
      );

      const response = await apiClient.post('/method/frappe.desk.form.assign_to.add', {
        doctype: TICKET_DOCTYPE,
        name,
        assign_to: assigneesList,
      });

      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

// Fetch ticket statistics
export const fetchTicketStats = createAsyncThunk(
  'ticketManagement/fetchTicketStats',
  async (params = {}, thunkAPI) => {
    const { filters = DEFAULT_FILTERS } = params;

    try {
      const { filters: listFilters, or_filters: listOrFilters } = buildFilters(filters);
      const requestBody = { filters: listFilters };
      if (listOrFilters) {
        requestBody.or_filters = listOrFilters;
      }

      const response = await apiClient.post(
        '/method/devx.api.ticket.get_ticket_stats',
        requestBody,
      );
      return response?.data?.message || {};
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

// Remove ticket assignments
export const removeTicketAssignments = createAsyncThunk(
  'ticketManagement/removeTicketAssignments',
  async ({ name, assignees }, thunkAPI) => {
    if (!name) {
      return thunkAPI.rejectWithValue('Ticket name is required');
    }

    try {
      // Ensure assignees is an array
      const assigneesList = Array.isArray(assignees) ? assignees : [assignees].filter(Boolean);

      if (assigneesList.length === 0) {
        return thunkAPI.rejectWithValue('At least one assignee is required');
      }

      // Normalize assignees to strings (user emails/names) for API call
      const normalizedAssignees = assigneesList.map((a) =>
        typeof a === 'string' ? a : a.value || a.email || a.name || a,
      );

      const response = await apiClient.post('/method/helpdesk.api.doc.remove_assignments', {
        doctype: TICKET_DOCTYPE,
        name,
        assignees: normalizedAssignees,
      });

      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

// Delete ticket attachment (File doc attached to HD Ticket)
export const deleteTicketAttachment = createAsyncThunk(
  'ticketManagement/deleteTicketAttachment',
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
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

// Delete ticket
export const deleteTicket = createAsyncThunk(
  'ticketManagement/deleteTicket',
  async (name, thunkAPI) => {
    if (!name) {
      return thunkAPI.rejectWithValue('Ticket name is required');
    }

    try {
      await apiClient.post('/method/frappe.client.delete', {
        doctype: TICKET_DOCTYPE,
        name: String(name),
      });
      return name;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const updateTicketField = createAsyncThunk(
  'ticketManagement/updateTicketField',
  async ({ name, fieldname, value, currentAssignees: providedCurrentAssignees }, thunkAPI) => {
    if (!name || !fieldname) {
      return thunkAPI.rejectWithValue('Ticket name and field are required');
    }

    try {
      // Special case for assigned_to - use assignment APIs
      if (fieldname === 'assigned_to') {
        // Extract current assignees - use provided ones if available, otherwise fetch from ticket
        let currentAssignees = [];

        if (providedCurrentAssignees !== null && providedCurrentAssignees !== undefined) {
          // Use provided current assignees (from table row)
          currentAssignees = Array.isArray(providedCurrentAssignees)
            ? providedCurrentAssignees
            : providedCurrentAssignees
              ? [providedCurrentAssignees].filter(Boolean)
              : [];
        } else {
          // Fallback: Get current ticket to find existing assignees (for backward compatibility)
          let currentTicket = thunkAPI.getState().ticketManagement.detail.data;

          // If ticket is not in state or doesn't match, fetch it
          if (
            !currentTicket ||
            (currentTicket.name !== name && String(currentTicket.name) !== String(name))
          ) {
            const ticketResponse = await apiClient.get(
              '/method/devx.api.ticket.get_ticket_detail_with_assignees',
              { params: { name } },
            );
            currentTicket = ticketResponse?.data?.message;
          }

          // Extract current assignees from ticket
          if (currentTicket) {
            // Try to get from _assign field first
            if (currentTicket._assign) {
              try {
                const parsed =
                  typeof currentTicket._assign === 'string'
                    ? JSON.parse(currentTicket._assign)
                    : currentTicket._assign;
                if (Array.isArray(parsed) && parsed.length > 0) {
                  currentAssignees = parsed;
                }
              } catch {
                // If parsing fails, try assigned_to field
                if (currentTicket.assigned_to) {
                  currentAssignees = Array.isArray(currentTicket.assigned_to)
                    ? currentTicket.assigned_to
                    : [currentTicket.assigned_to].filter(Boolean);
                }
              }
            } else if (currentTicket.assigned_to) {
              currentAssignees = Array.isArray(currentTicket.assigned_to)
                ? currentTicket.assigned_to
                : [currentTicket.assigned_to].filter(Boolean);
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
          await thunkAPI.dispatch(assignTicket({ name, assign_to: assigneesToAdd }));
        }

        // Remove assignees that are no longer in the list
        if (assigneesToRemove.length > 0) {
          await thunkAPI.dispatch(removeTicketAssignments({ name, assignees: assigneesToRemove }));
        }

        // Return null - the caller will refetch if needed
        return null;
      }

      // Map frontend field names to HD Ticket field names using TICKET_FIELD_MAPPING
      // Use the first (primary) backend field from the mapping array
      let mappedFieldname = fieldname;

      if (TICKET_FIELD_MAPPING[fieldname]) {
        // Get the first backend field from the mapping array (primary field)
        mappedFieldname = TICKET_FIELD_MAPPING[fieldname][0];
      }

      let apiValue = value;
      if (
        mappedFieldname === TICKET_MARKER_COORDINATE_API_FIELD ||
        fieldname === TICKET_MARKER_COORDINATE_FIELD
      ) {
        if (value != null && typeof value === 'object') {
          apiValue = JSON.stringify(value);
        } else if (typeof value === 'string') {
          apiValue = value;
        } else {
          apiValue = '';
        }
      }

      // People fields: client.set_value fails Link validation for mixed id types;
      // persist via server db.set_value and return enriched detail for list sync.
      if (TICKET_PEOPLE_FIELDS.has(fieldname)) {
        const response = await apiClient.post('/method/devx.api.ticket.set_ticket_people_field', {
          name,
          fieldname: mappedFieldname,
          value: value ?? '',
        });
        return response?.data?.message;
      }

      const response = await apiClient.post('/method/frappe.client.set_value', {
        doctype: TICKET_DOCTYPE,
        name,
        fieldname: mappedFieldname,
        value: apiValue,
      });

      const detailResponse = await apiClient.get(
        '/method/devx.api.ticket.get_ticket_detail_with_assignees',
        { params: { name } },
      );

      return detailResponse?.data?.message ?? response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const updateTicketDocument = createAsyncThunk(
  'ticketManagement/updateTicketDocument',
  async (document_, thunkAPI) => {
    if (!document_?.name) {
      return thunkAPI.rejectWithValue('Ticket document requires a name');
    }

    try {
      const response = await apiClient.post('/method/frappe.client.save', {
        doc: {
          doctype: TICKET_DOCTYPE,
          ...document_,
        },
      });

      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

// Removed old addTicketComment - using new helpdesk API version below

// Fetch dropdown data for ticket creation form
export const fetchTicketDropdownData = createAsyncThunk(
  'ticketManagement/fetchTicketDropdownData',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.get(
        '/method/devx.api.ticket_options.get_all_dropdown_options',
      );
      return response?.data?.message || {};
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

// Fetch sub-categories (L2) based on selected category (L1)
export const fetchSubCategories = createAsyncThunk(
  'ticketManagement/fetchSubCategories',
  async (parentCategory, thunkAPI) => {
    if (!parentCategory) {
      return { parentCategory: '', options: [] };
    }

    try {
      const response = await apiClient.get('/method/devx.api.ticket_options.get_categories', {
        params: {
          category_level: 'L2',
          parent_category: parentCategory,
        },
      });
      return {
        parentCategory,
        options: response?.data?.message || [],
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

// Fetch sub-sub-categories (L3) based on selected sub-category (L2)
export const fetchSubSubCategories = createAsyncThunk(
  'ticketManagement/fetchSubSubCategories',
  async (parentCategory, thunkAPI) => {
    if (!parentCategory) {
      return { parentCategory: '', options: [] };
    }

    try {
      const response = await apiClient.get('/method/devx.api.ticket_options.get_categories', {
        params: {
          category_level: 'L3',
          parent_category: parentCategory,
        },
      });
      return {
        parentCategory,
        options: response?.data?.message || [],
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

// Fetch floors based on selected center
export const fetchFloors = createAsyncThunk(
  'ticketManagement/fetchFloors',
  async (arg, thunkAPI) => {
    const center = typeof arg === 'string' ? arg : arg?.center;
    const has_parking = typeof arg === 'object' && arg != null ? arg.has_parking : undefined;

    if (!center) {
      return { center: '', options: [] };
    }

    try {
      const params = { center };
      if (has_parking !== undefined && has_parking !== null) {
        params.has_parking = has_parking;
      }
      const response = await apiClient.get('/method/devx.api.ticket_options.get_floors', {
        params,
      });
      return {
        center,
        options: response?.data?.message || [],
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

// Spaces for a center (HD Ticket custom_space links to Space)
export const fetchSpaces = createAsyncThunk(
  'ticketManagement/fetchSpaces',
  async (center, thunkAPI) => {
    if (!center) {
      return { center: '', options: [] };
    }

    try {
      const filters = JSON.stringify([['center', '=', center]]);
      const fields = JSON.stringify(['name', 'inventory_name']);
      const response = await apiClient.get('/resource/Space', {
        params: {
          filters,
          fields,
          limit_page_length: 500,
        },
      });
      const rows = response?.data?.data || [];
      const options = rows.map((row) => ({
        value: row.name,
        label: row.inventory_name || row.name,
      }));
      return { center, options };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

// Co-workers for client ticket "Issue Raised by"
export const fetchTicketCoworkerList = createAsyncThunk(
  'ticketManagement/fetchTicketCoworkerList',
  async (clientId, thunkAPI) => {
    const normalizedClientId = String(clientId || '').trim();
    if (!normalizedClientId) {
      return { clientId: '', rows: [] };
    }

    try {
      const formData = new FormData();
      formData.append('keyword', '');
      formData.append('filters', '[]');
      formData.append('page', '1');
      formData.append('limit_page_length', '500');
      formData.append('order_by', 'modified desc');
      formData.append('client_id', normalizedClientId);

      const response = await apiClient.post(
        '/method/devx.coworker.api.get_coworker_list',
        formData,
      );
      const message = response?.data?.message ?? response?.data;
      const rows = Array.isArray(message?.results) ? message.results : [];

      return { clientId: normalizedClientId, rows };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

// Client SPOC contacts for client ticket create drawer
export const fetchTicketClientSpocContacts = createAsyncThunk(
  'ticketManagement/fetchTicketClientSpocContacts',
  async (clientId, thunkAPI) => {
    const normalizedClientId = String(clientId || '').trim();
    if (!normalizedClientId) {
      return { clientId: '', contacts: [] };
    }

    try {
      const response = await apiClient.get('/method/devx.overrides.client.get_client_details', {
        params: { client_id: normalizedClientId },
      });
      const customer = response?.data?.message ?? response?.data;
      const allContacts = Array.isArray(customer?.custom_contacts) ? customer.custom_contacts : [];
      const contacts = allContacts.filter((contact) => Number(contact.is_primary_contact) === 1);

      return { clientId: normalizedClientId, contacts };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

// Fetch centers allocated to a client (for create/edit from client detail page)
export const fetchCentersForClient = createAsyncThunk(
  'ticketManagement/fetchCentersForClient',
  async (clientId, thunkAPI) => {
    try {
      const params = clientId ? { client: clientId } : undefined;
      const response = await apiClient.get('/method/devx.api.ticket_options.get_centers', {
        ...(params ? { params } : {}),
      });
      return response?.data?.message || [];
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

// Fetch ticket options for related/dependency selection
export const fetchRelatedTickets = createAsyncThunk(
  'ticketManagement/fetchRelatedTickets',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.get('/resource/HD Ticket', {
        params: {
          fields: JSON.stringify(['name', 'subject']),
          order_by: 'modified desc',
          limit_page_length: 500,
        },
      });
      const rows = response?.data?.data || [];
      return rows
        .filter((row) => row?.name)
        .map((row) => ({
          value: row.name,
          label: row.subject ? `${row.subject} (${row.name})` : row.name,
        }));
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const updateTicketColumnList = createAsyncThunk(
  'ticketManagement/updateTicketColumnList',
  async (body, thunkAPI) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: TICKET_DOCTYPE,
        columns: body,
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchTicketColumnList = createAsyncThunk(
  'ticketManagement/fetchTicketColumnList',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: {
          doctype: TICKET_DOCTYPE,
        },
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
  {
    condition: (_, { getState }) => getState()?.ticketManagement?.ticketColumnList == null,
  },
);

export const addTicketComment = createAsyncThunk(
  'ticketManagement/addTicketComment',
  async (
    { ticketId, content, attachments = [], visibleToClient = false, parentCommentId = null },
    thunkAPI,
  ) => {
    // Allow submission if either content or attachments are present
    const hasContent = content && content.trim();
    const hasAttachments = attachments && attachments.length > 0;

    if (!ticketId || (!hasContent && !hasAttachments)) {
      return thunkAPI.rejectWithValue('Ticket ID and either content or attachments are required');
    }

    try {
      // Convert ticket ID to string
      const ticketIdString = String(ticketId);

      // Use custom devx API that handles files directly and supports visible_to_client
      const formData = new FormData();
      formData.append('ticket', ticketIdString);
      formData.append('content', content || ''); // Allow empty content if attachments exist
      formData.append('visible_to_client', visibleToClient ? '1' : '0');
      if (parentCommentId) {
        formData.append('custom_parent_comment', parentCommentId);
      }

      // Add files directly to FormData
      if (attachments && attachments.length > 0) {
        attachments.forEach((attachment) => {
          if (attachment.file) {
            // Append file with key 'files[]' to support multiple files
            formData.append('files[]', attachment.file);
          }
        });
      }

      // Call custom devx API endpoint
      const response = await apiClient.post(
        '/method/devx.api.ticket.add_ticket_comment_with_files',
        formData,
      );

      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const sendTicketEmail = createAsyncThunk(
  'ticketManagement/sendTicketEmail',
  async (
    { ticketId, to, cc = [], bcc = [], subject = '', message, attachments = [] },
    thunkAPI,
  ) => {
    if (!ticketId || !to || to.length === 0 || !message) {
      return thunkAPI.rejectWithValue('Ticket ID, recipient, and message are required');
    }

    try {
      // Convert ticket ID to string
      const ticketIdString = String(ticketId);

      // First upload attachments if any
      const uploadedAttachmentNames = [];
      if (attachments && attachments.length > 0) {
        const uploadPromises = attachments.map(async (attachment) => {
          if (attachment.file) {
            const formData = new FormData();
            formData.append('file', attachment.file);
            formData.append('doctype', 'HD Ticket');
            formData.append('docname', ticketIdString);
            formData.append('is_private', 0);

            const response = await apiClient.post('/method/upload_file', formData);
            // Extract file name from response
            const fileName = response?.data?.message?.file_name || attachment.name;
            return fileName;
          }
          return attachment.name; // If already uploaded, just return the name
        });

        uploadedAttachmentNames.push(...(await Promise.all(uploadPromises)));
      }

      // Call reply_via_agent method on HD Ticket
      const response = await apiClient.post('/method/run_doc_method', {
        dt: 'HD Ticket',
        dn: ticketIdString,
        method: 'reply_via_agent',
        args: {
          message,
          to: Array.isArray(to) ? to.join(',') : to,
          cc: Array.isArray(cc) && cc.length > 0 ? cc.join(',') : undefined,
          bcc: Array.isArray(bcc) && bcc.length > 0 ? bcc.join(',') : undefined,
          attachments: uploadedAttachmentNames,
        },
      });

      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

const initialAsyncSection = {
  data: null,
  status: 'idle',
  error: null,
};

const initialDropdownSection = {
  data: {},
  status: 'idle',
  error: null,
};

const initialState = {
  list: {
    rows: [],
    status: 'idle',
    error: null,
    filters: { ...DEFAULT_FILTERS },
    page: 1,
    pageSize: DEFAULT_TICKET_LIST_PAGE_SIZE,
    totalCount: 0,
    statusCounts: {}, // Store status_counts from API
    sorting: [],
    hasMore: true, // Track if there's more data to load
  },
  detail: { ...initialAsyncSection },
  comments: { ...initialAsyncSection },
  activity: { ...initialAsyncSection },
  dropdownData: {
    data: null,
    status: 'idle',
    error: null,
  },
  subCategories: {
    data: {}, // { parentCategory: [options] }
    status: 'idle',
    error: null,
  },
  subSubCategories: {
    data: {}, // { parentCategory: [options] }
    status: 'idle',
    error: null,
  },
  floors: {
    data: {}, // { center: [options] }
    status: 'idle',
    error: null,
  },
  spaces: {
    data: {}, // { center: [options] }
    status: 'idle',
    error: null,
  },
  centers: {
    data: [],
    status: 'idle',
    error: null,
  },
  relatedTickets: {
    data: [],
    status: 'idle',
    error: null,
  },
  coworkers: {
    data: {}, // { clientId: [coworker rows] }
    status: 'idle',
    error: null,
  },
  clientSpocContacts: {
    data: {}, // { clientId: [contact rows] }
    status: 'idle',
    error: null,
  },
  stats: { ...initialAsyncSection },
  statusCounts: {
    data: { statusCounts: {}, totalCount: 0, incidentCount: 0, requiresRmCount: 0 },
    status: 'idle',
    error: null,
  },
  mutations: {
    createStatus: 'idle',
    updateStatus: 'idle',
    commentStatus: 'idle',
    exportStatus: 'idle',
    error: null,
  },
  createDraft: {
    markerCoordinate: null,
  },
  ticketColumnList: [],
};

const ticketManagementSlice = createSlice({
  name: 'ticketManagement',
  initialState,
  reducers: {
    setTicketFilters(state, action) {
      state.list.filters = {
        ...state.list.filters,
        ...action.payload,
      };
      state.list.page = 1;
      state.list.rows = []; // Reset rows when filters change
      state.list.hasMore = true; // Reset hasMore when filters change
    },
    setTicketPage(state, action) {
      state.list.page = action.payload || 1;
    },
    setTicketPageSize(state, action) {
      state.list.pageSize = action.payload || DEFAULT_TICKET_LIST_PAGE_SIZE;
      state.list.page = 1;
    },
    setTicketSorting(state, action) {
      state.list.sorting = action.payload || [];
      // Reset pagination when sorting changes
      state.list.page = 1;
      state.list.rows = [];
      state.list.hasMore = true;
    },
    resetTicketList(state) {
      state.list.rows = [];
      state.list.page = 1;
      state.list.hasMore = true;
      state.list.error = null;
    },
    // Socket update actions
    updateTicketFromSocket(state, action) {
      const { ticketData } = action.payload;
      if (!ticketData || !ticketData.name) return;

      // Transform the ticket data to match the list format
      const transformedTicket = transformTicketRows([ticketData])[0];

      // Update ticket in list if it exists
      const ticketIndex = state.list.rows.findIndex((row) => row.name === ticketData.name);
      if (ticketIndex === -1) {
        // If ticket is not in current list but matches filters, we could add it
        // For now, we'll just update if it exists
      } else {
        state.list.rows[ticketIndex] = transformedTicket;
      }
    },
    refreshTicketDetailFromSocket(state, action) {
      const { ticketName } = action.payload;
      if (!ticketName) return;

      // If the detail view is showing this ticket, mark it for refresh
      if (state.detail.data && state.detail.data.name === ticketName) {
        state.detail.status = 'idle'; // This will trigger a refetch in components
      }
    },
    setCreateDraftMarkerCoordinate(state, action) {
      state.createDraft.markerCoordinate = action.payload ?? null;
    },
    clearCreateDraft(state) {
      state.createDraft.markerCoordinate = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTickets.pending, (state) => {
        state.list.status = 'loading';
        state.list.error = null;
      })
      .addCase(fetchTickets.fulfilled, (state, action) => {
        state.list.status = 'succeeded';
        // If append is true, append new rows to existing ones (scroll pagination)
        // Otherwise, replace all rows (initial load or filter/sorting change)
        if (action.payload.append) {
          // Prevent duplicate rows by checking if they already exist
          const existingIds = new Set(state.list.rows.map((row) => row.name));
          const newRows = action.payload.rows.filter((row) => !existingIds.has(row.name));
          state.list.rows = [...state.list.rows, ...newRows];
        } else {
          state.list.rows = action.payload.rows;
        }
        state.list.page = action.payload.page;
        state.list.pageSize = action.payload.pageSize;
        state.list.filters = action.payload.filters;
        state.list.totalCount = action.payload.totalCount;
        // Only update statusCounts if it's provided (not on append operations)
        if (
          action.payload.statusCounts &&
          Object.keys(action.payload.statusCounts).length > 0 &&
          !action.payload.append
        ) {
          state.list.statusCounts = action.payload.statusCounts;
        }
        state.list.hasMore = action.payload.hasMore ?? true;
        state.list.error = null;
      })
      .addCase(fetchTickets.rejected, (state, action) => {
        // Filter/search changes abort the in-flight list request via effect
        // cleanup (`controller.abort()`). That is expected — do not surface it
        // as a user-visible error while a newer fetch is starting.
        if (action.meta?.aborted) {
          return;
        }
        const message = action.payload || action.error?.message;
        if (message === 'Aborted' || message === 'CanceledError') {
          return;
        }
        state.list.status = 'failed';
        state.list.error = resolveThunkErrorMessage(message, 'Failed to load tickets');
      })
      .addCase(fetchTicketStatusCounts.pending, (state) => {
        state.statusCounts.status = 'loading';
        state.statusCounts.error = null;
      })
      .addCase(fetchTicketStatusCounts.fulfilled, (state, action) => {
        state.statusCounts.status = 'succeeded';
        state.statusCounts.data.statusCounts = action.payload.statusCounts || {};
        state.statusCounts.data.totalCount = action.payload.totalCount ?? 0;
        state.statusCounts.data.incidentCount = action.payload.incidentCount ?? 0;
        state.statusCounts.data.requiresRmCount = action.payload.requiresRmCount ?? 0;
        state.statusCounts.error = null;
      })
      .addCase(fetchTicketStatusCounts.rejected, (state, action) => {
        state.statusCounts.status = 'failed';
        state.statusCounts.error = resolveThunkErrorMessage(
          action.payload || action.error?.message,
          'Failed to load status counts',
        );
      })
      .addCase(fetchCentersForClient.pending, (state) => {
        state.centers.status = 'loading';
        state.centers.error = null;
      })
      .addCase(fetchCentersForClient.fulfilled, (state, action) => {
        state.centers.status = 'succeeded';
        state.centers.data = action.payload || [];
      })
      .addCase(fetchCentersForClient.rejected, (state, action) => {
        state.centers.status = 'failed';
        state.centers.error = action.payload || action.error?.message || 'Failed to fetch centers';
        state.centers.data = [];
      })
      .addCase(fetchRelatedTickets.pending, (state) => {
        state.relatedTickets.status = 'loading';
        state.relatedTickets.error = null;
      })
      .addCase(fetchRelatedTickets.fulfilled, (state, action) => {
        state.relatedTickets.status = 'succeeded';
        state.relatedTickets.data = action.payload || [];
      })
      .addCase(fetchRelatedTickets.rejected, (state, action) => {
        state.relatedTickets.status = 'failed';
        state.relatedTickets.error =
          action.payload || action.error?.message || 'Failed to fetch related tickets';
        state.relatedTickets.data = [];
      })
      .addCase(fetchTicketDetail.pending, (state, action) => {
        state.detail.status = 'loading';
        state.detail.error = null;
        // Keep existing detail while refreshing so drawer fields stay populated.
        const requestedName = String(action.meta.arg ?? '').trim();
        const currentName = String(state.detail.data?.name ?? state.detail.data?.id ?? '').trim();
        if (!currentName || currentName !== requestedName) {
          state.detail.data = null;
        }
      })
      .addCase(fetchTicketDetail.fulfilled, (state, action) => {
        state.detail.status = 'succeeded';
        // Transform the detail data using the same logic as list data
        const transformed = transformTicketRows([action.payload]);
        const transformedTicket = transformed[0] || action.payload;

        // Preserve assignees array if it exists (contains full_name and user_image)
        // This ensures user names and images are preserved
        if (action.payload.assignees && Array.isArray(action.payload.assignees)) {
          transformedTicket.assignees = action.payload.assignees;
        }

        state.detail.data = transformedTicket;
        state.detail.error = null;

        // Also update the ticket in the list if it exists there
        // This ensures inline updates from the table are reflected immediately
        if (transformedTicket && transformedTicket.name && state.list.rows) {
          const ticketIndex = state.list.rows.findIndex(
            (row) =>
              row.name === transformedTicket.name ||
              String(row.name) === String(transformedTicket.name),
          );
          if (ticketIndex !== -1) {
            state.list.rows[ticketIndex] = transformedTicket;
          }
        }
      })
      .addCase(fetchTicketDetail.rejected, (state, action) => {
        state.detail.status = 'failed';
        state.detail.error = action.payload || action.error.message;
        state.detail.data = null;
      })
      .addCase(fetchTicketComments.pending, (state) => {
        state.comments.status = 'loading';
        state.comments.error = null;
      })
      .addCase(fetchTicketComments.fulfilled, (state, action) => {
        state.comments.status = 'succeeded';
        state.comments.data = action.payload;
        state.comments.error = null;
      })
      .addCase(fetchTicketComments.rejected, (state, action) => {
        state.comments.status = 'failed';
        state.comments.error = action.payload || action.error.message;
      })
      .addCase(fetchTicketActivity.pending, (state) => {
        state.activity.status = 'loading';
        state.activity.error = null;
      })
      .addCase(fetchTicketActivity.fulfilled, (state, action) => {
        state.activity.status = 'succeeded';
        state.activity.data = action.payload;
        state.activity.error = null;
      })
      .addCase(fetchTicketActivity.rejected, (state, action) => {
        state.activity.status = 'failed';
        state.activity.error = action.payload || action.error.message;
      })
      .addCase(createTicket.pending, (state) => {
        state.mutations.createStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(createTicket.fulfilled, (state, action) => {
        state.mutations.createStatus = 'succeeded';
        state.createDraft.markerCoordinate = null;
        if (action.payload) {
          const [formatted] = transformTicketRows([action.payload]);
          state.list.rows = formatted ? [formatted, ...state.list.rows] : state.list.rows;
        }
      })
      .addCase(createTicket.rejected, (state, action) => {
        state.mutations.createStatus = 'failed';
        state.mutations.error = action.payload || action.error.message;
      })
      .addCase(exportTickets.pending, (state) => {
        state.mutations.exportStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(exportTickets.fulfilled, (state) => {
        state.mutations.exportStatus = 'succeeded';
      })
      .addCase(exportTickets.rejected, (state, action) => {
        state.mutations.exportStatus = 'failed';
        state.mutations.error = action.payload || action.error.message;
      })
      .addCase(updateTicketField.pending, (state) => {
        state.mutations.updateStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(updateTicketField.fulfilled, (state, action) => {
        state.mutations.updateStatus = 'succeeded';
        const updatedTicket = action.payload; // Full ticket document from API response
        const { name, fieldname } = action.meta.arg || {};

        if (updatedTicket && name) {
          // Find existing ticket (from detail or list) so we can preserve assignee info
          let existingTicket = state.detail.data;
          if (
            !existingTicket ||
            (existingTicket.name !== name && String(existingTicket.name) !== String(name))
          ) {
            existingTicket =
              state.list.rows?.find((t) => t.name === name || String(t.name) === String(name)) ||
              null;
          }

          const existingAssignedTo = existingTicket?.assigned_to;
          const existingAssignees = existingTicket?.assignees;

          // Transform the updated ticket using the same logic as list data
          const transformed = transformTicketRows([updatedTicket]);
          const transformedTicket = transformed[0] || updatedTicket;

          // If the update was NOT for assigned_to, preserve existing assignee information.
          // This avoids wiping assignees when updating other fields like due_date or status.
          if (fieldname !== 'assigned_to') {
            if (existingAssignedTo !== undefined) {
              transformedTicket.assigned_to = existingAssignedTo;
            }
            if (Array.isArray(existingAssignees) && existingAssignees.length > 0) {
              transformedTicket.assignees = existingAssignees;
            }
          } else if (updatedTicket.assignees && Array.isArray(updatedTicket.assignees)) {
            // For actual assignee updates, prefer the assignees array from API response
            transformedTicket.assignees = updatedTicket.assignees;
          }

          if (existingTicket && fieldname && !TICKET_PEOPLE_FIELDS.has(fieldname)) {
            preserveTicketPeopleDisplayFields(transformedTicket, existingTicket);
          }

          // Update detail data if it's the same ticket
          if (
            state.detail.data?.name === name ||
            String(state.detail.data?.name) === String(name)
          ) {
            state.detail.data = transformedTicket;
            if (fieldname === TICKET_MARKER_COORDINATE_FIELD) {
              const markerValue =
                action.meta.arg?.value ??
                transformedTicket[TICKET_MARKER_COORDINATE_API_FIELD] ??
                transformedTicket[TICKET_MARKER_COORDINATE_FIELD];
              state.detail.data[TICKET_MARKER_COORDINATE_API_FIELD] = markerValue;
              state.detail.data[TICKET_MARKER_COORDINATE_FIELD] = markerValue;
            }
          }

          // Also update in list if ticket exists there
          if (state.list.rows) {
            const ticketIndex = state.list.rows.findIndex(
              (t) => t.name === name || String(t.name) === String(name),
            );
            if (ticketIndex !== -1) {
              state.list.rows[ticketIndex] = transformedTicket;
            }
          }
        }
      })
      .addCase(updateTicketField.rejected, (state, action) => {
        state.mutations.updateStatus = 'failed';
        state.mutations.error = action.payload || action.error.message;
      })
      .addCase(assignTicket.pending, (state) => {
        state.mutations.updateStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(assignTicket.fulfilled, (state, action) => {
        state.mutations.updateStatus = 'succeeded';
        // Refresh ticket data if needed
        if (state.detail.data) {
          state.detail.status = 'idle'; // Trigger refetch
        }
      })
      .addCase(assignTicket.rejected, (state, action) => {
        state.mutations.updateStatus = 'failed';
        state.mutations.error = action.payload || action.error.message;
      })
      .addCase(removeTicketAssignments.pending, (state) => {
        state.mutations.updateStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(removeTicketAssignments.fulfilled, (state, action) => {
        state.mutations.updateStatus = 'succeeded';
        // Refresh ticket data if needed
        if (state.detail.data) {
          state.detail.status = 'idle'; // Trigger refetch
        }
      })
      .addCase(removeTicketAssignments.rejected, (state, action) => {
        state.mutations.updateStatus = 'failed';
        state.mutations.error = action.payload || action.error.message;
      })
      .addCase(deleteTicket.pending, (state) => {
        state.mutations.updateStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(deleteTicket.fulfilled, (state, action) => {
        state.mutations.updateStatus = 'succeeded';
        const deletedName = action.payload;
        if (deletedName && state.list.rows) {
          state.list.rows = state.list.rows.filter(
            (row) => String(row.name) !== String(deletedName),
          );
          if (state.list.totalCount > 0) state.list.totalCount -= 1;
        }
        if (
          state.detail.data?.name === deletedName ||
          String(state.detail.data?.name) === String(deletedName)
        ) {
          state.detail.data = null;
          state.detail.status = 'idle';
        }
      })
      .addCase(deleteTicket.rejected, (state, action) => {
        state.mutations.updateStatus = 'failed';
        state.mutations.error = action.payload || action.error.message;
      })
      .addCase(updateTicketDocument.pending, (state) => {
        state.mutations.updateStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(updateTicketDocument.fulfilled, (state, action) => {
        state.mutations.updateStatus = 'succeeded';
        if (action.payload?.name && state.detail.data?.name === action.payload.name) {
          state.detail.data = action.payload;
        }
      })
      .addCase(updateTicketDocument.rejected, (state, action) => {
        state.mutations.updateStatus = 'failed';
        state.mutations.error = action.payload || action.error.message;
      })
      .addCase(addTicketComment.pending, (state) => {
        state.mutations.commentStatus = 'loading';
        state.mutations.error = null;
      })
      .addCase(addTicketComment.fulfilled, (state, action) => {
        state.mutations.commentStatus = 'succeeded';
        // After adding a comment, the payload contains the new comment
        // Add it to the comments array in the structured data
        if (action.payload && state.comments.data) {
          const currentComments = state.comments.data.comments || [];
          state.comments.data = {
            ...state.comments.data,
            comments: [action.payload, ...currentComments],
          };
        }
      })
      .addCase(addTicketComment.rejected, (state, action) => {
        state.mutations.commentStatus = 'failed';
        state.mutations.error = action.payload || action.error.message;
      })
      .addCase(fetchTicketDropdownData.pending, (state) => {
        state.dropdownData.status = 'loading';
        state.dropdownData.error = null;
      })
      .addCase(fetchTicketDropdownData.fulfilled, (state, action) => {
        state.dropdownData.status = 'succeeded';
        state.dropdownData.data = action.payload;
        state.dropdownData.error = null;
      })
      .addCase(fetchTicketDropdownData.rejected, (state, action) => {
        state.dropdownData.status = 'failed';
        state.dropdownData.error = action.payload || action.error.message;
      })
      // Sync ticket filter/create center labels when a center is renamed.
      .addCase(updateCenterThunk.fulfilled, (state, action) => {
        const centerLabelSync = getCenterLabelSyncFromUpdateAction(action);
        if (!centerLabelSync || centerLabelSync.updatedCenterName == null) return;

        if (Array.isArray(state.dropdownData.data?.centers)) {
          state.dropdownData.data.centers = mapCenterOptionsWithLabelSync(
            state.dropdownData.data.centers,
            centerLabelSync,
          );
        }
        if (Array.isArray(state.centers?.data)) {
          state.centers.data = mapCenterOptionsWithLabelSync(state.centers.data, centerLabelSync);
        }
      })
      .addCase(fetchSubCategories.pending, (state) => {
        state.subCategories.status = 'loading';
      })
      .addCase(fetchSubCategories.fulfilled, (state, action) => {
        state.subCategories.status = 'succeeded';
        const { parentCategory, options } = action.payload;
        state.subCategories.data[parentCategory] = options;
      })
      .addCase(fetchSubCategories.rejected, (state, action) => {
        state.subCategories.status = 'failed';
        state.subCategories.error = action.payload || action.error.message;
      })
      .addCase(fetchSubSubCategories.pending, (state) => {
        state.subSubCategories.status = 'loading';
      })
      .addCase(fetchSubSubCategories.fulfilled, (state, action) => {
        state.subSubCategories.status = 'succeeded';
        const { parentCategory, options } = action.payload;
        state.subSubCategories.data[parentCategory] = options;
      })
      .addCase(fetchSubSubCategories.rejected, (state, action) => {
        state.subSubCategories.status = 'failed';
        state.subSubCategories.error = action.payload || action.error.message;
      })
      .addCase(fetchFloors.pending, (state) => {
        state.floors.status = 'loading';
      })
      .addCase(fetchFloors.fulfilled, (state, action) => {
        state.floors.status = 'succeeded';
        const { center, options } = action.payload;
        state.floors.data[center] = options;
      })
      .addCase(fetchFloors.rejected, (state, action) => {
        state.floors.status = 'failed';
        state.floors.error = action.payload || action.error.message;
      })
      .addCase(fetchSpaces.pending, (state) => {
        state.spaces.status = 'loading';
      })
      .addCase(fetchSpaces.fulfilled, (state, action) => {
        state.spaces.status = 'succeeded';
        const { center, options } = action.payload;
        state.spaces.data[center] = options;
      })
      .addCase(fetchSpaces.rejected, (state, action) => {
        state.spaces.status = 'failed';
        state.spaces.error = action.payload || action.error.message;
      })
      .addCase(fetchTicketCoworkerList.pending, (state) => {
        state.coworkers.status = 'loading';
        state.coworkers.error = null;
      })
      .addCase(fetchTicketCoworkerList.fulfilled, (state, action) => {
        state.coworkers.status = 'succeeded';
        const { clientId, rows } = action.payload;
        if (clientId) {
          state.coworkers.data[clientId] = rows;
        }
      })
      .addCase(fetchTicketCoworkerList.rejected, (state, action) => {
        state.coworkers.status = 'failed';
        state.coworkers.error = action.payload || action.error.message;
      })
      .addCase(fetchTicketClientSpocContacts.pending, (state) => {
        state.clientSpocContacts.status = 'loading';
        state.clientSpocContacts.error = null;
      })
      .addCase(fetchTicketClientSpocContacts.fulfilled, (state, action) => {
        state.clientSpocContacts.status = 'succeeded';
        const { clientId, contacts } = action.payload;
        if (clientId) {
          state.clientSpocContacts.data[clientId] = contacts;
        }
      })
      .addCase(fetchTicketClientSpocContacts.rejected, (state, action) => {
        state.clientSpocContacts.status = 'failed';
        state.clientSpocContacts.error = action.payload || action.error.message;
      })
      .addCase(fetchTicketStats.pending, (state) => {
        state.stats.status = 'loading';
        state.stats.error = null;
      })
      .addCase(fetchTicketStats.fulfilled, (state, action) => {
        state.stats.status = 'succeeded';
        state.stats.data = action.payload;
        state.stats.error = null;
      })
      .addCase(fetchTicketStats.rejected, (state, action) => {
        state.stats.status = 'failed';
        state.stats.error = resolveThunkErrorMessage(
          action.payload || action.error?.message,
          'Failed to load ticket stats',
        );
      })
      .addCase(fetchTicketColumnList.pending, (state) => {
        // state.ticketColumnList.status = 'loading';
      })
      .addCase(fetchTicketColumnList.fulfilled, (state, action) => {
        state.ticketColumnList = action.payload;
      })
      .addCase(fetchTicketColumnList.rejected, (state, action) => {
        state.ticketColumnList = null;
        // state.ticketList.error = action.payload || action.error.message;
      })
      .addCase(updateTicketColumnList.fulfilled, (state, action) => {})
      .addCase(updateTicketColumnList.rejected, (state, action) => {
        state.ticketColumnList = null;
        // state.ticketList.error = action.payload || action.error.message;
      });
  },
});

export const {
  setTicketFilters,
  setTicketPage,
  setTicketPageSize,
  setTicketSorting,
  resetTicketList,
  updateTicketFromSocket,
  refreshTicketDetailFromSocket,
  setCreateDraftMarkerCoordinate,
  clearCreateDraft,
} = ticketManagementSlice.actions;

export const selectTicketList = (state) => state.ticketManagement.list;
export const selectTicketDetail = (state) => state.ticketManagement.detail;
export const selectTicketComments = (state) => state.ticketManagement.comments;
export const selectTicketActivity = (state) => state.ticketManagement.activity;
export const selectTicketDropdownData = (state) => state.ticketManagement.dropdownData;
export const selectTicketMutations = (state) => state.ticketManagement.mutations;
export const selectCreateDraftMarkerCoordinate = (state) =>
  state.ticketManagement.createDraft.markerCoordinate;
export const selectTicketStats = (state) => state.ticketManagement.stats;
export const selectTicketStatusCounts = (state) => state.ticketManagement.statusCounts;
export const selectSubCategories = (state) => state.ticketManagement.subCategories;
export const selectSubSubCategories = (state) => state.ticketManagement.subSubCategories;
export const selectFloors = (state) => state.ticketManagement.floors;
export const selectSpaces = (state) => state.ticketManagement.spaces;
export const selectRelatedTickets = (state) => state.ticketManagement.relatedTickets;
export const selectTicketCoworkers = (state) => state.ticketManagement.coworkers;
export const selectTicketClientSpocContacts = (state) => state.ticketManagement.clientSpocContacts;
export const selectCategories = (state) =>
  state.ticketManagement.dropdownData.data?.categories || [];

export default ticketManagementSlice.reducer;
