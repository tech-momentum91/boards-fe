import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { format } from 'date-fns';
import { defaultBookingFormState, RecurrenceType } from '@/components/bookings/constants';
import { extractErrorMessage } from '@/utils/error-utils';
import apiClient from '@/api/axios';
import { updateCenterThunk } from '@/redux/centerSlice';
import {
  getCenterLabelSyncFromUpdateAction,
  mapCenterOptionsWithLabelSync,
} from '@/utils/center-label-sync';

// DocType used for persisting bookings table column preferences
const BOOKING_DOCTYPE = 'Space Booking';

const GET_BOOKING_DRAWER_SPACES =
  '/method/devx.seat_inventory.doctype.space.space.get_booking_drawer_spaces';

function bookingDrawerSpacesQueryParams(filters = {}) {
  const params = {};
  const scope = filters.calendarScope;
  if (scope === 'all_centers') {
    params.calendar_scope = 'all_centers';
  }
  const ids = filters.centerIds;
  if (Array.isArray(ids) && ids.length > 1) {
    params.centers = JSON.stringify(ids);
  } else if (Array.isArray(ids) && ids.length === 1) {
    params.center = ids[0];
  } else if (filters.center) {
    const c = filters.center;
    if (Array.isArray(c)) {
      if (c.length > 1) params.centers = JSON.stringify(c);
      else if (c.length === 1) params.center = c[0];
    } else {
      params.center = c;
    }
  }
  if (filters.bookForAnyCenter) {
    params.book_for_any_center = 1;
  }
  if (filters.resourceTypes?.length > 1) {
    params.resource_types = JSON.stringify(filters.resourceTypes);
  } else if (filters.resourceTypes?.length === 1) {
    params.resource_type = filters.resourceTypes[0];
  }
  if (filters.resource_type) params.resource_type = filters.resource_type;
  return params;
}

async function fetchBookingDrawerSpaceRows(filters = {}) {
  const response = await apiClient.get(GET_BOOKING_DRAWER_SPACES, {
    params: bookingDrawerSpacesQueryParams(filters),
  });
  const message = response?.data?.message ?? response?.data;
  return Array.isArray(message) ? message : [];
}

const initialState = {
  // Shared state - used by multiple views
  shared: {
    centers: {
      data: [],
      isLoading: false,
      error: null,
      status: 'idle',
    },
    clients: {
      data: [],
      isLoading: false,
      error: null,
      status: 'idle',
    },
    selectedBooking: {
      data: null,
      isOpen: false,
      popoverOpen: false,
      editScope: null, // 'this_booking' | 'this_and_following' | 'all_bookings' when opened via Edit dropdown
    },
    bookingDetail: {
      data: null,
      status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
      error: null,
    },
    bookingComments: {
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
    bookingColumnList: null,
  },
  // List view specific state
  listView: {
    reloadKey: 0, // used to force a reload of the list data (e.g. after delete)
    bookings: {
      data: [],
      isLoading: false,
      isLoadingMore: false,
      error: null,
      status: 'idle',
      page: 1,
      pageSize: 20,
      hasMore: false,
      totalCount: 0,
      statusCounts: {},
    },
    resources: {
      data: [],
      isLoading: false,
      error: null,
      status: 'idle',
    },
    filters: {
      center: null,
      resourceTypes: [],
      clients: [],
    },
  },
  // Calendar view specific state
  calendarView: {
    bookings: {
      data: null,
      /** Set from last get_calendar_view response; use for UI (not only scope) */
      readOnlyCalendar: false,
      isLoading: false,
      error: null,
      status: 'idle',
    },
    resources: {
      data: [],
      isLoading: false,
      error: null,
      status: 'idle',
    },
    settings: {
      layout: 'resources-x-time-y',
      startHour: 0,
      endHour: 23,
      timeSlotInterval: 30,
      // Date-only string used by calendar APIs: `yyyy-MM-dd`
      selectedDate: format(new Date(), 'yyyy-MM-dd'),
      reloadKey: 0, // used to force a reload of the calendar data
      isSilentRefresh: false, // flag to indicate silent background refresh
    },
    filters: {
      centerIds: null,
      /** my_centers: assigned centers. all_centers: read-only occupancy across all active centers. */
      calendarScope: 'my_centers',
      resourceType: null,
      client: null,
    },
    /** Populated when calendarScope is all_centers (get_all_active_centers_booking) */
    allCentersForScope: {
      data: [],
      status: 'idle',
      error: null,
    },
    /** Calendar client filter: Assign Space clients only (matches booking create drawer). */
    toolbarClients: {
      data: [],
      status: 'idle',
      error: null,
    },
  },
  // Create/Edit drawer specific state
  createDrawer: {
    form: {
      ...defaultBookingFormState,
      isOpen: false,
      mode: 'create',
    },
    resources: {
      data: [],
      isLoading: false,
      error: null,
      status: 'idle',
    },
    conflictCheck: {
      isChecking: false,
      conflicts: [],
      statusCode: null,
      errorOn: null,
      message: '',
      latestRecurringRequestId: null,
      latestOneTimeRequestId: null,
      oneTime: {
        statusCode: null,
        errorOn: null,
        message: '',
        conflicts: [],
      },
      lastChecked: null,
    },
    /** Clients shown in create-booking drawer only (filtered by center assignment or all) */
    bookingFormClients: {
      data: [],
      status: 'idle',
      error: null,
    },
    /** Full active-center list when "Book for any center" is enabled */
    expandedCenters: {
      data: [],
      status: 'idle',
      error: null,
    },
  },
};

// Note: For list-view sorting, we now use backend field names
// directly in the table's `sorting.id` values (e.g. `booking_date`,
// `start_time`, `creation`), so no mapping layer is required here.

// Fetch comments + activity timeline for a booking
export const fetchBookingComments = createAsyncThunk(
  'booking/fetchBookingComments',
  async ({ bookingId }, { rejectWithValue }) => {
    if (!bookingId) {
      return rejectWithValue('Booking ID is required');
    }

    try {
      const response = await apiClient.post(
        '/method/devx.booking.doctype.booking_activity.booking_activity.get_booking_activities',
        {
          booking: String(bookingId),
        },
      );

      const activities = response?.data?.message || response?.data || {};

      return {
        comments: activities.comments || [],
        history: activities.history || [],
        communications: activities.communications || [],
        views: activities.views || [],
        calls: activities.calls || [],
      };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch booking comments'),
      );
    }
  },
);

// Add a new booking comment (with optional attachments)
export const addBookingComment = createAsyncThunk(
  'booking/addBookingComment',
  async (
    { bookingId, content, attachments = [], isVisibleToClient = false, parentCommentId = null },
    { rejectWithValue },
  ) => {
    const hasContent = content && content.trim();
    const hasAttachments = attachments && attachments.length > 0;

    if (!bookingId || (!hasContent && !hasAttachments)) {
      return rejectWithValue('Booking ID and either content or attachments are required');
    }

    try {
      const formData = new FormData();
      formData.append('booking', String(bookingId));
      formData.append('content', content || '');
      formData.append('visible_to_client', isVisibleToClient ? '1' : '0');
      formData.append('parent_comment', parentCommentId ? String(parentCommentId) : '');

      if (attachments && attachments.length > 0) {
        attachments.forEach((attachment) => {
          if (attachment.file) {
            formData.append('files[]', attachment.file);
          }
        });
      }

      const response = await apiClient.post(
        '/method/devx.booking.doctype.booking_comment.booking_comment.add_booking_comment_with_files',
        formData,
      );

      return response?.data?.message || response?.data || null;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to add booking comment'),
      );
    }
  },
);

// Fetch bookings for list view with search, filters, sorting & pagination
export const fetchBookings = createAsyncThunk(
  'booking/fetchBookings',
  async (
    {
      keyword = '',
      status = 'all',
      dateRange = null,
      filters = {},
      page = 1,
      pageSize = 20,
      append = false,
      sorting = [],
      order_by,
    } = {},
    { rejectWithValue },
  ) => {
    try {
      // ... [Keep your existing filter logic exactly as is] ...
      const filtersArray = [];
      const rawCenter = filters?.center;
      const centerIds = Array.isArray(rawCenter)
        ? rawCenter.filter(Boolean)
        : rawCenter != null && rawCenter !== ''
          ? [rawCenter]
          : [];
      if (centerIds.length > 0) {
        if (centerIds.length === 1) filtersArray.push(['center', '=', centerIds[0]]);
        else filtersArray.push(['center', 'in', centerIds]);
      }
      if (Array.isArray(filters.resourceTypes) && filters.resourceTypes.length > 0) {
        if (filters.resourceTypes.length === 1)
          filtersArray.push(['resource_type', '=', filters.resourceTypes[0]]);
        else filtersArray.push(['resource_type', 'in', filters.resourceTypes]);
      }
      if (Array.isArray(filters.clients) && filters.clients.length > 0) {
        if (filters.clients.length === 1) filtersArray.push(['client', '=', filters.clients[0]]);
        else filtersArray.push(['client', 'in', filters.clients]);
      }
      if (filters?.spaceId) {
        filtersArray.push(['space_id', 'in', filters.spaceId]);
      }
      if (status && status !== 'all') filtersArray.push(['status', '=', status]);
      if (dateRange?.from && dateRange?.to) {
        const from = format(new Date(dateRange.from), 'yyyy-MM-dd');
        const to = format(new Date(dateRange.to), 'yyyy-MM-dd');
        filtersArray.push(['booking_date', 'between', [from, to]]);
      }

      let orderBy = order_by || 'creation desc';
      if (!order_by && Array.isArray(sorting) && sorting.length > 0) {
        const rawOrderBy = sorting
          .filter((sort) => sort && sort.id)
          .map((sort) => `${sort.id} ${sort.desc ? 'desc' : 'asc'}`)
          .join(', ');

        if (rawOrderBy) {
          orderBy = rawOrderBy;
        }
      }

      const payload = {
        doctype: BOOKING_DOCTYPE,
        limit_page_length: pageSize,
        page,
        order_by: orderBy,
      };

      if (keyword && keyword.trim()) payload.keyword = keyword.trim();
      if (filtersArray.length > 0) payload.filters = JSON.stringify(filtersArray);

      const response = await apiClient.post(
        '/method/devx.booking.api.listview.space_booking_list_with_search_filters',
        payload,
      );

      const responseData = response?.data?.message || response?.data || {};
      const results = Array.isArray(responseData.results)
        ? responseData.results
        : Array.isArray(responseData.data)
          ? responseData.data
          : Array.isArray(responseData)
            ? responseData
            : [];

      const totalCount = responseData.total_count ?? results.length;

      // Calculate hasMore based on whether the page is full AND we haven't hit the total limit
      // 1. If results are less than pageSize, we know it's the last page.
      // 2. OR compare calculated offset to totalCount.
      const isPageFull = results.length >= pageSize;
      const itemsFetchedSoFar = page * pageSize;

      // hasMore is true ONLY if we got a full page AND we expect more items based on totalCount
      const hasMore = isPageFull && itemsFetchedSoFar < totalCount;

      return {
        results,
        page,
        pageSize,
        append,
        hasMore,
        totalCount,
        statusCounts: responseData.status_counts || {},
      };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        error.response?.data ||
        error.message ||
        'Failed to fetch bookings';
      return rejectWithValue(message);
    }
  },
);

export const fetchBookingsForCalendar = createAsyncThunk(
  'booking/fetchBookingsForCalendar',
  async (
    { start_date, end_date, center_ids, resource_type, client, calendar_scope },
    { rejectWithValue },
  ) => {
    try {
      const params = {
        start_date,
        end_date,
        resource_type,
        calendar_scope: calendar_scope || 'my_centers',
      };
      if (Array.isArray(center_ids) && center_ids.length > 0) {
        params.centers = JSON.stringify(center_ids);
      }
      if (params.calendar_scope !== 'all_centers' && client) {
        params.client = client;
      }
      const response = await apiClient.get(
        '/method/devx.booking.doctype.space_booking.space_booking.get_calendar_view',
        { params },
      );
      return response.data?.message || {};
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch bookings for calendar'),
      );
    }
  },
);

/** Active centers for “All Centers” calendar tab (full tenant list; calendar stays read-only via API). */
export const fetchCalendarAllCentersForScope = createAsyncThunk(
  'booking/fetchCalendarAllCentersForScope',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/method/devx.center_management.doctype.center.center.get_all_active_centers_booking',
      );
      const message = response?.data?.message ?? response?.data;
      return Array.isArray(message) ? message : [];
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch centers'),
      );
    }
  },
);

// Separate thunk for booking drawer to avoid calendar interference
export const fetchDrawerResources = createAsyncThunk(
  'booking/fetchDrawerResources',
  async ({ filters = {} } = {}, { rejectWithValue }) => {
    try {
      const rawSpaces = await fetchBookingDrawerSpaceRows(filters);

      // Transform API response to match expected format
      const transformedSpaces = rawSpaces.map((space) => ({
        id: space.name, // for selects & lookups
        name: space.inventory_name || space.name,
        // Minimal shape needed by consumers; other fields are not fetched from API
        capacity: 0,
        floor: '',
        type: space.resource_type ?? '',
        resourceTypeId: space.resource_type ?? '',
        centerId: space.center,
        centerName: space.center_name || space.center,
        status: '',
      }));

      return transformedSpaces;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch spaces'),
      );
    }
  },
);

export const fetchListViewResources = createAsyncThunk(
  'booking/fetchListViewResources',
  async ({ filters = {} } = {}, { rejectWithValue }) => {
    try {
      const rawSpaces = await fetchBookingDrawerSpaceRows(filters);

      // Transform API response to match expected format
      const transformedSpaces = rawSpaces.map((space) => ({
        id: space.name,
        name: space.inventory_name || space.name,
        capacity: space.pax || 0,
        floor: space.floor ?? '',
        type: space.resource_type ?? '',
        resourceTypeId: space.resource_type ?? '',
        centerId: space.center,
        centerName: space.center_name || space.center,
        creditsPerHour: space.credit_per_hour || 0,
        status: space.status ?? '',
      }));

      return transformedSpaces;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch spaces'),
      );
    }
  },
);

export const fetchCalendarResources = createAsyncThunk(
  'booking/fetchCalendarResources',
  async ({ filters = {} } = {}, { rejectWithValue }) => {
    try {
      const rawSpaces = await fetchBookingDrawerSpaceRows(filters);

      // Transform API response to match expected format
      const transformedSpaces = rawSpaces.map((space) => ({
        id: space.name,
        name: space.inventory_name || space.name,
        capacity: space.pax || 0,
        floor: space.floor ?? '',
        type: space.resource_type ?? '',
        resourceTypeId: space.resource_type ?? '',
        centerId: space.center,
        centerName: space.center_name || space.center,
        creditsPerHour: space.credit_per_hour || 0,
        status: space.status ?? '',
      }));

      return transformedSpaces;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch spaces'),
      );
    }
  },
);

export const fetchCenters = createAsyncThunk(
  'booking/fetchCenters',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/method/devx.center_management.doctype.center.center.get_zones_and_centers',
        { params: { active_only: 1 } },
      );

      const message = response?.data?.message ?? {};
      // Backend returns { zones: [...], is_all_center: bool }; active_only=1 limits to Active centers
      const zones = Array.isArray(message.zones) ? message.zones : [];

      // Normalize to a flat list of centers while preserving zone info
      const centers = zones.flatMap((zoneGroup) => {
        const zoneName = zoneGroup?.zone || 'Unassigned';
        const groupCenters = Array.isArray(zoneGroup?.centers) ? zoneGroup.centers : [];

        return groupCenters.map((center) => ({
          ...center,
          label: center.center_name || center.name,
          value: center.name,
          // API nests by zone; center row has no zone field — set for CenterAccessDropdown grouping
          zone: center.zone || zoneName,
        }));
      });

      return centers;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch centers'),
      );
    }
  },
);

export const fetchClients = createAsyncThunk(
  'booking/fetchClients',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/resource/Customer', {
        params: {
          fields: JSON.stringify(['name', 'customer_name']),
          filters: JSON.stringify([['disabled', '=', 0]]), // Only get active customers
          limit_page_length: 999, // Get all clients for booking dropdown
        },
      });

      const rawClients = response?.data?.data || [];

      // Transform API response to match expected format
      const transformedClients = rawClients.map((client) => ({
        value: client.name, // Customer ID (e.g., CUST-2025-00001)
        label: client.customer_name || client.name, // Display name
      }));

      return transformedClients;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch clients'),
      );
    }
  },
);

/** Clients for booking form from Assign Space (center-specific or all permitted allocations). */
export const fetchBookingFormClients = createAsyncThunk(
  'booking/fetchBookingFormClients',
  async ({ centerId, unrestricted }, { rejectWithValue }) => {
    try {
      if (!unrestricted && !centerId) {
        return [];
      }

      const params = unrestricted ? { all_permitted_centers: 1 } : { center: centerId };
      return await fetchClientsForSpaceBookingParams(params);
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load clients for booking'),
      );
    }
  },
);

async function fetchClientsForSpaceBookingParams(params) {
  const response = await apiClient.get(
    '/method/devx.api.client_management.get_clients_for_space_booking',
    { params },
  );
  const message = response?.data?.message ?? response?.data;
  const rows = Array.isArray(message) ? message : [];
  return rows.map((c) => ({
    value: c.value,
    label: c.label || c.value,
  }));
}

/** Calendar toolbar client dropdown — same source as booking form (Assign Space). */
export const fetchCalendarToolbarClients = createAsyncThunk(
  'booking/fetchCalendarToolbarClients',
  async ({ centerIds, calendarScope }, { rejectWithValue }) => {
    if (calendarScope !== 'my_centers') {
      return [];
    }
    try {
      const ids = Array.isArray(centerIds) ? centerIds.filter(Boolean) : [];
      if (ids.length === 0) {
        return await fetchClientsForSpaceBookingParams({ all_permitted_centers: 1 });
      }
      if (ids.length === 1) {
        return await fetchClientsForSpaceBookingParams({ center: ids[0] });
      }
      const batches = await Promise.all(
        ids.map((center) => fetchClientsForSpaceBookingParams({ center }).catch(() => [])),
      );
      const merged = new Map();
      for (const batch of batches) {
        for (const row of batch) {
          merged.set(row.value, row);
        }
      }
      const combined = [...merged.values()].sort((a, b) =>
        (a.label || '').localeCompare(b.label || '', undefined, { sensitivity: 'base' }),
      );
      return combined;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load clients'),
      );
    }
  },
);

export const fetchBookingExpandedCenters = createAsyncThunk(
  'booking/fetchBookingExpandedCenters',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/method/devx.center_management.doctype.center.center.get_all_active_centers_booking',
      );
      const message = response?.data?.message ?? response?.data;
      return Array.isArray(message) ? message : [];
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch centers'),
      );
    }
  },
);

export const validateRecurringConflicts = createAsyncThunk(
  'booking/validateRecurringConflicts',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.booking.doctype.recurring_space_booking.recurring_space_booking.validate_recurring_conflicts',
        payload,
      );

      const data = response?.data?.message || response?.data || {};
      return data;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to validate booking conflicts'),
      );
    }
  },
);

export const checkSpaceAvailability = createAsyncThunk(
  'booking/checkSpaceAvailability',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.booking.doctype.space_booking.space_booking.check_space_availability',
        payload,
      );

      const data = response?.data?.message || response?.data || {};
      return data;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to check space availability'),
      );
    }
  },
);

export const saveBooking = createAsyncThunk(
  'booking/saveBooking',
  async ({ endpoint, payload, ignoreConflictedDates }, { rejectWithValue }) => {
    try {
      let finalPayload = payload;
      if (ignoreConflictedDates && /recurring/i.test(endpoint || '')) {
        finalPayload = { ...payload, ignore_conflicted_dates: 1 };
      }
      const response = await apiClient.post(endpoint, finalPayload);

      // Return raw API data; component decides how to use it
      return response.data?.data ?? response.data?.message ?? null;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to save booking'),
      );
    }
  },
);

export const updateBookingColumnList = createAsyncThunk(
  'booking/updateBookingColumnList',
  async (body, thunkAPI) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: BOOKING_DOCTYPE,
        columns: body,
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchBookingColumnList = createAsyncThunk(
  'booking/fetchBookingColumnList',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: { doctype: BOOKING_DOCTYPE },
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

// Fetch single booking detail by ID
export const fetchBookingDetail = createAsyncThunk(
  'booking/fetchBookingDetail',
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/resource/Space Booking/${bookingId}`);
      const booking = response?.data?.data || null;

      // If booking has recurring_booking_ref, fetch the recurring booking data
      if (booking?.recurring_booking_ref) {
        try {
          const recurringResponse = await apiClient.get(
            `/resource/Recurring Space Booking/${booking.recurring_booking_ref}`,
          );
          // Support both { data: { data: doc } } and { data: doc } response shapes
          const recurringBooking = recurringResponse?.data?.data ?? recurringResponse?.data ?? null;

          if (recurringBooking) {
            // Use backend recurrence data directly - transformation handled by utility function
            booking.recurrence = recurringBooking;
            booking.isRecurring =
              recurringBooking.recurrence &&
              recurringBooking.recurrence !== RecurrenceType.ONE_TIME;
          }
        } catch (recurringError) {
          // If we can't fetch recurring booking, just continue without it
          console.warn('Failed to fetch recurring booking:', recurringError);
        }
      }

      return booking;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to fetch booking details'),
      );
    }
  },
);

// Delete booking (supports "This Booking" or "This & Upcoming Bookings")
export const deleteBookingThunk = createAsyncThunk(
  'booking/deleteBooking',
  async ({ bookingId, deleteScope }, { rejectWithValue }) => {
    try {
      const payload = {
        booking_id: bookingId,
        scope: deleteScope || 'THIS_ONLY',
        updates: {
          status: 'Cancelled',
        },
      };

      const response = await apiClient.post(
        '/method/devx.booking.doctype.space_booking.space_booking.update_recurring_space_booking',
        payload,
      );

      const data = response?.data?.message || response?.data || {};
      return data;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to delete booking'),
      );
    }
  },
);

// Scoped Space Booking update API - supports single and recurring series updates
export const updateSpaceBookingScoped = createAsyncThunk(
  'booking/updateSpaceBookingScoped',
  async ({ bookingId, scope, updates }, { rejectWithValue }) => {
    try {
      const payload = {
        booking_id: bookingId,
        scope,
        updates: updates || {},
      };

      const response = await apiClient.post(
        '/method/devx.booking.doctype.space_booking.space_booking.update_recurring_space_booking',
        payload,
      );

      const data = response?.data?.message || response?.data || {};
      return data;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to update booking'),
      );
    }
  },
);

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    // Calendar view reducers
    toggleLayout: (state) => {
      state.calendarView.settings.layout =
        state.calendarView.settings.layout === 'resources-x-time-y'
          ? 'time-x-resources-y'
          : 'resources-x-time-y';
    },
    setSelectedDate: (state, action) => {
      state.calendarView.settings.selectedDate = action.payload;
    },
    setCenterFilter: (state, action) => {
      state.calendarView.filters.centerIds = action.payload;
    },
    setCalendarScope: (state, action) => {
      const next = action.payload;
      if (state.calendarView.filters.calendarScope === next) {
        return;
      }
      state.calendarView.filters.calendarScope = next;
      // Changing scope invalidates center multi-select (all-centers options may include centers outside "my centers")
      state.calendarView.filters.centerIds = null;
      if (next === 'all_centers') {
        state.calendarView.filters.client = null;
      }
    },
    setResourceTypeFilter: (state, action) => {
      state.calendarView.filters.resourceType = action.payload;
    },
    setClientFilter: (state, action) => {
      state.calendarView.filters.client = action.payload;
    },
    clearFilters: (state) => {
      state.calendarView.filters = {
        centerIds: null,
        calendarScope: 'my_centers',
        resourceType: null,
        client: null,
      };
      state.calendarView.toolbarClients = {
        data: [],
        status: 'idle',
        error: null,
      };
    },
    reloadCalendar: (state, action) => {
      const silent = action.payload?.silent || false;
      state.calendarView.settings.reloadKey = state.calendarView.settings.reloadKey + 1;
      state.calendarView.settings.isSilentRefresh = silent;
    },
    clearSilentRefresh: (state) => {
      state.calendarView.settings.isSilentRefresh = false;
    },
    // Shared reducers (selected booking)
    openBookingPopover: (state, action) => {
      state.shared.selectedBooking.data = action.payload;
      state.shared.selectedBooking.popoverOpen = true;
      state.shared.selectedBooking.isOpen = false;
      state.shared.selectedBooking.editScope = null;
    },
    closeBookingPopover: (state) => {
      state.shared.selectedBooking.popoverOpen = false;
      state.shared.selectedBooking.editScope = null;
    },
    openBookingDetail: (state, action) => {
      state.shared.selectedBooking.data = action.payload;
      state.shared.selectedBooking.isOpen = true;
      state.shared.selectedBooking.popoverOpen = false;
      state.shared.selectedBooking.editScope = null;
    },
    openBookingDetailWithScope: (state, action) => {
      const { booking, editScope } = action.payload || {};
      state.shared.selectedBooking.data = booking;
      state.shared.selectedBooking.isOpen = true;
      state.shared.selectedBooking.popoverOpen = false;
      state.shared.selectedBooking.editScope = editScope ?? null;
    },
    closeBookingDetail: (state) => {
      state.shared.selectedBooking.isOpen = false;
      state.shared.selectedBooking.editScope = null;
    },
    clearBookingDetail: (state) => {
      state.shared.selectedBooking.data = null;
      state.shared.selectedBooking.popoverOpen = false;
      state.shared.selectedBooking.editScope = null;
    },
    // Create drawer reducers
    openBookingForm: (state, action) => {
      const { mode = 'create', initialData = null } = action.payload || {};
      state.createDrawer.form.isOpen = true;
      state.createDrawer.form.mode = mode;

      if (mode === 'create') {
        state.createDrawer.form.data = initialData || defaultBookingFormState.data;
      } else if (mode === 'edit' && initialData) {
        state.createDrawer.form.data = { ...initialData };
      }

      state.createDrawer.form.validation = { errors: {}, touched: {}, isValid: false };
      state.createDrawer.form.isDirty = false;
      state.createDrawer.form.isSubmitting = false;
      state.createDrawer.form.submitError = null;
      // Clear any previous conflict information when opening the form
      state.createDrawer.conflictCheck = {
        isChecking: false,
        conflicts: [],
        statusCode: null,
        errorOn: null,
        message: '',
        latestRecurringRequestId: null,
        latestOneTimeRequestId: null,
        oneTime: {
          statusCode: null,
          errorOn: null,
          message: '',
          conflicts: [],
        },
        lastChecked: null,
      };
    },
    closeBookingForm: (state) => {
      state.createDrawer.form.isOpen = false;
      state.createDrawer.bookingFormClients = {
        data: [],
        status: 'idle',
        error: null,
      };
      state.createDrawer.expandedCenters = {
        data: [],
        status: 'idle',
        error: null,
      };
    },
    clearConflictCheck: (state) => {
      state.createDrawer.conflictCheck.conflicts = [];
      state.createDrawer.conflictCheck.statusCode = null;
      state.createDrawer.conflictCheck.errorOn = null;
      state.createDrawer.conflictCheck.message = '';
      state.createDrawer.conflictCheck.oneTime = {
        statusCode: null,
        errorOn: null,
        message: '',
        conflicts: [],
      };
    },
    // List view reducers
    setListFilters: (state, action) => {
      state.listView.filters = { ...state.listView.filters, ...action.payload };
    },
    clearListFilters: (state) => {
      state.listView.filters = { center: null, resourceTypes: [], clients: [] };
    },
    resetBookingList: (state) => {
      state.listView.bookings.data = [];
      state.listView.bookings.page = 1;
      state.listView.bookings.hasMore = false;
      state.listView.bookings.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      // List view async thunks
      .addCase(fetchBookings.pending, (state, action) => {
        const isAppend = Boolean(action.meta?.arg?.append);
        state.listView.bookings.status = 'loading';
        state.listView.bookings.error = null;
        if (isAppend) {
          state.listView.bookings.isLoadingMore = true;
        } else {
          state.listView.bookings.isLoading = true;
        }
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.listView.bookings.isLoading = false;
        state.listView.bookings.isLoadingMore = false;
        state.listView.bookings.status = 'succeeded';

        const { results, append, page, pageSize, hasMore, totalCount, statusCounts } =
          action.payload || {};

        state.listView.bookings.page = page || 1;
        state.listView.bookings.pageSize = pageSize || 20;
        state.listView.bookings.hasMore = Boolean(hasMore);
        state.listView.bookings.totalCount = totalCount || 0;
        state.listView.bookings.statusCounts = statusCounts || {};

        state.listView.bookings.data = append
          ? [...(state.listView.bookings.data || []), ...(results || [])]
          : results || [];
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.listView.bookings.isLoading = false;
        state.listView.bookings.isLoadingMore = false;
        state.listView.bookings.status = 'failed';
        state.listView.bookings.error = action.payload;
      })
      // Calendar view async thunks
      .addCase(fetchBookingsForCalendar.pending, (state) => {
        // Only set loading if it's not a silent refresh
        if (!state.calendarView.settings.isSilentRefresh) {
          state.calendarView.bookings.isLoading = true;
        }
        state.calendarView.bookings.status = 'loading';
        state.calendarView.bookings.readOnlyCalendar = false;
      })
      .addCase(fetchBookingsForCalendar.fulfilled, (state, action) => {
        state.calendarView.bookings.isLoading = false;
        state.calendarView.bookings.status = 'succeeded';
        state.calendarView.bookings.data = action.payload;
        state.calendarView.bookings.readOnlyCalendar = Boolean(action.payload?.read_only_calendar);
        // Clear silent refresh flag after successful fetch
        state.calendarView.settings.isSilentRefresh = false;
      })
      .addCase(fetchBookingsForCalendar.rejected, (state, action) => {
        state.calendarView.bookings.isLoading = false;
        state.calendarView.bookings.status = 'failed';
        state.calendarView.bookings.error = action.payload;
        state.calendarView.bookings.readOnlyCalendar = false;
        // Clear silent refresh flag even on error
        state.calendarView.settings.isSilentRefresh = false;
      })
      .addCase(fetchCalendarAllCentersForScope.pending, (state) => {
        state.calendarView.allCentersForScope.status = 'loading';
        state.calendarView.allCentersForScope.error = null;
      })
      .addCase(fetchCalendarAllCentersForScope.fulfilled, (state, action) => {
        state.calendarView.allCentersForScope.status = 'succeeded';
        state.calendarView.allCentersForScope.data = action.payload || [];
        state.calendarView.allCentersForScope.error = null;
      })
      .addCase(fetchCalendarAllCentersForScope.rejected, (state, action) => {
        state.calendarView.allCentersForScope.status = 'failed';
        state.calendarView.allCentersForScope.error = action.payload || action.error?.message;
      })
      .addCase(fetchCalendarToolbarClients.pending, (state) => {
        state.calendarView.toolbarClients.status = 'loading';
        state.calendarView.toolbarClients.error = null;
      })
      .addCase(fetchCalendarToolbarClients.fulfilled, (state, action) => {
        state.calendarView.toolbarClients.status = 'succeeded';
        state.calendarView.toolbarClients.data = action.payload || [];
        state.calendarView.toolbarClients.error = null;
      })
      .addCase(fetchCalendarToolbarClients.rejected, (state, action) => {
        state.calendarView.toolbarClients.status = 'failed';
        state.calendarView.toolbarClients.data = [];
        state.calendarView.toolbarClients.error = action.payload || action.error?.message;
      })
      .addCase(fetchCalendarResources.pending, (state) => {
        state.calendarView.resources.isLoading = true;
        state.calendarView.resources.status = 'loading';
        state.calendarView.resources.error = null;
      })
      .addCase(fetchCalendarResources.fulfilled, (state, action) => {
        state.calendarView.resources.isLoading = false;
        state.calendarView.resources.data = action.payload;
        state.calendarView.resources.status = 'succeeded';
        state.calendarView.resources.error = null;
      })
      .addCase(fetchCalendarResources.rejected, (state, action) => {
        state.calendarView.resources.isLoading = false;
        state.calendarView.resources.error = action.payload;
        state.calendarView.resources.status = 'failed';
      })
      // List view resources
      .addCase(fetchListViewResources.pending, (state) => {
        state.listView.resources.isLoading = true;
      })
      .addCase(fetchListViewResources.fulfilled, (state, action) => {
        state.listView.resources.isLoading = false;
        state.listView.resources.data = action.payload;
      })
      .addCase(fetchListViewResources.rejected, (state, action) => {
        state.listView.resources.isLoading = false;
        state.listView.resources.error = action.payload;
      })
      // Create drawer async thunks
      .addCase(fetchDrawerResources.pending, (state) => {
        state.createDrawer.resources.isLoading = true;
      })
      .addCase(fetchDrawerResources.fulfilled, (state, action) => {
        state.createDrawer.resources.isLoading = false;
        state.createDrawer.resources.data = action.payload;
      })
      .addCase(fetchDrawerResources.rejected, (state, action) => {
        state.createDrawer.resources.isLoading = false;
        state.createDrawer.resources.error = action.payload;
      })
      .addCase(saveBooking.pending, (state) => {
        state.createDrawer.form.isSubmitting = true;
      })
      .addCase(saveBooking.fulfilled, (state) => {
        state.createDrawer.form.isSubmitting = false;
        state.createDrawer.form.isOpen = false;
        state.createDrawer.form.isDirty = false;
        // Trigger silent refresh of calendar after successful booking creation
        state.calendarView.settings.isSilentRefresh = true;
        state.calendarView.settings.reloadKey = state.calendarView.settings.reloadKey + 1;
        // Refresh list view so new bookings appear immediately
        state.listView.reloadKey = (state.listView.reloadKey || 0) + 1;
      })
      .addCase(saveBooking.rejected, (state, action) => {
        state.createDrawer.form.isSubmitting = false;
        state.createDrawer.form.submitError = action.payload?.message || 'Failed to save';
      })
      .addCase(validateRecurringConflicts.pending, (state, action) => {
        state.createDrawer.conflictCheck.isChecking = true;
        state.createDrawer.conflictCheck.latestRecurringRequestId = action.meta.requestId;
      })
      .addCase(validateRecurringConflicts.fulfilled, (state, action) => {
        if (state.createDrawer.conflictCheck.latestRecurringRequestId !== action.meta.requestId) {
          return;
        }
        const { status_code: statusCode, error_on: errorOn, dates = [] } = action.payload || {};
        state.createDrawer.conflictCheck.isChecking = false;
        state.createDrawer.conflictCheck.conflicts = statusCode === 409 ? dates : [];
        state.createDrawer.conflictCheck.statusCode = statusCode || null;
        state.createDrawer.conflictCheck.errorOn = errorOn || null;
        state.createDrawer.conflictCheck.message =
          statusCode === 409 ? 'Some dates are unavailable for the selected slot.' : '';
        state.createDrawer.conflictCheck.lastChecked = new Date().toISOString();
        state.createDrawer.conflictCheck.latestRecurringRequestId = null;
      })
      .addCase(validateRecurringConflicts.rejected, (state, action) => {
        if (state.createDrawer.conflictCheck.latestRecurringRequestId !== action.meta.requestId) {
          return;
        }
        state.createDrawer.conflictCheck.isChecking = false;
        state.createDrawer.conflictCheck.conflicts = [];
        state.createDrawer.conflictCheck.statusCode = null;
        state.createDrawer.conflictCheck.errorOn = null;
        state.createDrawer.conflictCheck.message = '';
        state.createDrawer.conflictCheck.lastChecked = new Date().toISOString();
        state.createDrawer.conflictCheck.latestRecurringRequestId = null;
      })
      .addCase(checkSpaceAvailability.pending, (state, action) => {
        state.createDrawer.conflictCheck.isChecking = true;
        state.createDrawer.conflictCheck.latestOneTimeRequestId = action.meta.requestId;
      })
      .addCase(checkSpaceAvailability.fulfilled, (state, action) => {
        if (state.createDrawer.conflictCheck.latestOneTimeRequestId !== action.meta.requestId) {
          return;
        }
        const {
          status_code: statusCode,
          error_on: errorOn,
          message,
          conflicts = [],
        } = action.payload || {};
        state.createDrawer.conflictCheck.isChecking = false;
        state.createDrawer.conflictCheck.oneTime = {
          statusCode: statusCode || null,
          errorOn: errorOn || null,
          message: message || '',
          conflicts,
        };
        state.createDrawer.conflictCheck.lastChecked = new Date().toISOString();
        state.createDrawer.conflictCheck.latestOneTimeRequestId = null;
      })
      .addCase(checkSpaceAvailability.rejected, (state, action) => {
        if (state.createDrawer.conflictCheck.latestOneTimeRequestId !== action.meta.requestId) {
          return;
        }
        state.createDrawer.conflictCheck.isChecking = false;
        state.createDrawer.conflictCheck.oneTime = {
          statusCode: null,
          errorOn: null,
          message: '',
          conflicts: [],
        };
        state.createDrawer.conflictCheck.lastChecked = new Date().toISOString();
        state.createDrawer.conflictCheck.latestOneTimeRequestId = null;
      })
      // Shared async thunks
      .addCase(fetchCenters.fulfilled, (state, action) => {
        state.shared.centers.data = action.payload;
      })
      // Sync booking center option labels when a center is renamed.
      .addCase(updateCenterThunk.fulfilled, (state, action) => {
        const centerLabelSync = getCenterLabelSyncFromUpdateAction(action);
        if (!centerLabelSync) return;
        if (!Array.isArray(state.shared?.centers?.data)) return;

        state.shared.centers.data = mapCenterOptionsWithLabelSync(
          state.shared.centers.data,
          centerLabelSync,
          { setZone: true },
        );
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.shared.clients.data = action.payload;
      })
      .addCase(fetchBookingFormClients.pending, (state) => {
        state.createDrawer.bookingFormClients.status = 'loading';
        state.createDrawer.bookingFormClients.error = null;
      })
      .addCase(fetchBookingFormClients.fulfilled, (state, action) => {
        state.createDrawer.bookingFormClients.status = 'succeeded';
        state.createDrawer.bookingFormClients.data = action.payload;
        state.createDrawer.bookingFormClients.error = null;
      })
      .addCase(fetchBookingFormClients.rejected, (state, action) => {
        state.createDrawer.bookingFormClients.status = 'failed';
        state.createDrawer.bookingFormClients.data = [];
        state.createDrawer.bookingFormClients.error = action.payload;
      })
      .addCase(fetchBookingExpandedCenters.pending, (state) => {
        state.createDrawer.expandedCenters.status = 'loading';
        state.createDrawer.expandedCenters.error = null;
      })
      .addCase(fetchBookingExpandedCenters.fulfilled, (state, action) => {
        state.createDrawer.expandedCenters.status = 'succeeded';
        state.createDrawer.expandedCenters.data = action.payload;
        state.createDrawer.expandedCenters.error = null;
      })
      .addCase(fetchBookingExpandedCenters.rejected, (state, action) => {
        state.createDrawer.expandedCenters.status = 'failed';
        state.createDrawer.expandedCenters.data = [];
        state.createDrawer.expandedCenters.error = action.payload;
      })
      // Column config persistence
      .addCase(fetchBookingColumnList.pending, (state) => {
        state.shared.bookingColumnList = null;
      })
      .addCase(fetchBookingColumnList.fulfilled, (state, action) => {
        state.shared.bookingColumnList = action.payload;
      })
      .addCase(fetchBookingColumnList.rejected, (state, action) => {
        state.shared.bookingColumnList = null;
      })
      .addCase(updateBookingColumnList.fulfilled, (state, action) => {})
      .addCase(updateBookingColumnList.rejected, (state, action) => {
        state.shared.bookingColumnList = null;
      })
      // Booking detail
      .addCase(fetchBookingDetail.pending, (state) => {
        state.shared.bookingDetail.status = 'loading';
        state.shared.bookingDetail.error = null;
      })
      .addCase(fetchBookingDetail.fulfilled, (state, action) => {
        state.shared.bookingDetail.status = 'succeeded';
        state.shared.bookingDetail.data = action.payload;
        state.shared.bookingDetail.error = null;
        // Update selectedBooking data as well for consistency
        if (state.shared.selectedBooking.isOpen) {
          state.shared.selectedBooking.data = action.payload;
        }
      })
      .addCase(fetchBookingDetail.rejected, (state, action) => {
        state.shared.bookingDetail.status = 'failed';
        state.shared.bookingDetail.error = action.payload;
      })
      // After delete: refetch calendar and list so both views stay in sync
      .addCase(deleteBookingThunk.fulfilled, (state) => {
        state.calendarView.settings.isSilentRefresh = true;
        state.calendarView.settings.reloadKey = state.calendarView.settings.reloadKey + 1;
        state.listView.reloadKey = state.listView.reloadKey + 1;
      })
      // After scoped booking update (single or series): refresh current view (list + calendar)
      .addCase(updateSpaceBookingScoped.fulfilled, (state) => {
        state.calendarView.settings.isSilentRefresh = true;
        state.calendarView.settings.reloadKey = state.calendarView.settings.reloadKey + 1;
        state.listView.reloadKey = state.listView.reloadKey + 1;
      })
      // Booking comments & activity
      .addCase(fetchBookingComments.pending, (state) => {
        state.shared.bookingComments.status = 'loading';
        state.shared.bookingComments.error = null;
      })
      .addCase(fetchBookingComments.fulfilled, (state, action) => {
        state.shared.bookingComments.status = 'succeeded';
        state.shared.bookingComments.data = {
          comments: action.payload?.comments || [],
          history: action.payload?.history || [],
          communications: action.payload?.communications || [],
          views: action.payload?.views || [],
          calls: action.payload?.calls || [],
        };
        state.shared.bookingComments.error = null;
      })
      .addCase(fetchBookingComments.rejected, (state, action) => {
        state.shared.bookingComments.status = 'failed';
        state.shared.bookingComments.error = action.payload || action.error?.message;
      })
      .addCase(addBookingComment.fulfilled, (state, action) => {
        const newComment = action.payload;
        if (newComment && state.shared.bookingComments?.data) {
          const currentComments = state.shared.bookingComments.data.comments || [];
          state.shared.bookingComments.data.comments = [...currentComments, newComment];
        }
      });
  },
});

export const {
  // Calendar view actions
  toggleLayout,
  setSelectedDate,
  setCenterFilter,
  setCalendarScope,
  setResourceTypeFilter,
  setClientFilter,
  clearFilters,
  reloadCalendar,
  clearSilentRefresh,
  // Shared actions
  openBookingPopover,
  closeBookingPopover,
  openBookingDetail,
  openBookingDetailWithScope,
  closeBookingDetail,
  clearBookingDetail,
  // Create drawer actions
  openBookingForm,
  closeBookingForm,
  clearConflictCheck,
  // List view actions
  setListFilters,
  clearListFilters,
  resetBookingList,
} = bookingSlice.actions;

// Selectors
export const selectBookingDetail = (state) =>
  state.booking?.shared?.bookingDetail || {
    data: null,
    status: 'idle',
    error: null,
  };

export const selectBookingComments = (state) =>
  state.booking?.shared?.bookingComments || {
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

export default bookingSlice.reducer;
