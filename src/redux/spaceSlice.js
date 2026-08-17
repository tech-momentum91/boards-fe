import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';
import { normalizeCoworkingInventoryType } from '@/utils/layout-coworking-inventory-type';

const SPACE_DOCTYPE = 'Space';

const initialState = {
  space: null,
  loading: false,
  error: null,
  spaceListData: {
    data: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    totalCount: 0,
    currentPage: 1,
    pageSize: 20,
    hasMore: false,
    sorting: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    /** Aggregates from `message.stats` on get_space_listview (Available / Occupied tabs). */
    listStats: null,
  },
  spaceInDetail: {
    data: null,
    isLoading: false,
    error: null,
  },
  columnPreferences: {
    data: null,
    isLoading: false,
    error: null,
  },
  assignSpace: {
    data: null,
    isLoading: false,
    error: null,
  },
  allocatedSpaceListview: {
    data: [],
    groupedData: {},
    isGrouped: false,
    count: 0,
    isLoading: false,
    isFetchingMore: false,
    hasMore: false,
    error: null,
    filterOptions: {
      client_name: [],
      column_max_limits: {
        total_credits: 0,
        price_per_seat: 0,
        total_price: 0,
      },
    },
  },
  assignedSpaceDetail: {
    data: null,
    isLoading: false,
    error: null,
  },
  statusCounts: {
    all: 0,
    Occupied: 0,
    Available: 0,
  },

  createSpaceDrawer: { isOpen: false, isLoading: false, error: null },
  spaceDetailClientList: {
    data: [],
    isLoading: false,
    error: null,
  },
};

export const createSpace = createAsyncThunk(
  'space/createSpace',
  async (spaceData, { rejectWithValue }) => {
    try {
      // Use custom method endpoint that handles files and document creation
      // Send FormData directly with all files included in the payload
      const response = await apiClient.post(
        '/method/devx.seat_inventory.doctype.space.space.create_space',
        spaceData,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const deleteSpaceThunk = createAsyncThunk(
  'space/deleteSpace',
  async (spaceId, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/resource/Space/${spaceId}`);
      return response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Export: fetch all space data grouped by center
export const fetchSpaceExportData = createAsyncThunk(
  'space/fetchExportData',
  async ({ centers, zones }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.seat_inventory.api.export-pdf.export_space_data',
        { centers, zones },
      );
      return response?.data?.message?.message || response?.data?.message || {};
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

const normalizePinnedSpaceName = (columns) => {
  if (!Array.isArray(columns)) return columns;

  // Force Space Name to be the first column and always visible.
  const pinnedId = 'spaceName';
  const pinned = columns.find((c) => c?.id === pinnedId) || { id: pinnedId, visible: true };
  const rest = columns.filter((c) => c?.id !== pinnedId);

  const normalized = [{ ...pinned, visible: true }, ...rest].map((c, index) => ({
    ...c,
    order: index,
  }));

  return normalized;
};

export const fetchSpaceColumnList = createAsyncThunk(
  'space/fetchSpaceColumnList',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: {
          doctype: SPACE_DOCTYPE,
        },
      });

      // Backend usually returns `message` as the saved columns array.
      const message = response?.data?.message;
      return normalizePinnedSpaceName(message);
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

export const updateSpaceColumnList = createAsyncThunk(
  'space/updateSpaceColumnList',
  async (columns, thunkAPI) => {
    try {
      const normalized = normalizePinnedSpaceName(columns);
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: SPACE_DOCTYPE,
        columns: normalized,
      });
      return response?.data?.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.serialized || error);
    }
  },
);

// Lightweight transform for list view (only essential fields for table display)
const transformSpaceListData = (backendData) => {
  if (!backendData || !Array.isArray(backendData)) {
    return [];
  }

  return backendData.map((item) => {
    const inventoryType = String(item.inventory_type || '').trim();

    // Only essential fields for list view - handle null/undefined/empty strings gracefully
    // The API now provides total_seats and available_seats directly
    // Use proper number conversion that preserves 0 values
    const getNumberValue = (value, fallback = 0) => {
      if (value === undefined || value === null || value === '') return fallback;
      const number_ = Number(value);
      return Number.isNaN(number_) ? fallback : number_;
    };

    // Determine total seats: backend now uses total_seats for all space types
    // (replaced total_sellable_seats for Managed Office and no_of_seats for Co-working)
    const totalSeats = getNumberValue(item.total_seats);

    // Use available_seats directly from API, or fallback to totalSeats if not provided
    let availableSeats = 0;
    if (item.available_seats !== undefined && item.available_seats !== null) {
      availableSeats = getNumberValue(item.available_seats);
    } else {
      availableSeats = totalSeats; // Fallback to totalSeats if not in API
    }

    // Normalize bookable field (allow null)
    const bookableVal = item.bookable;
    let bookable;
    if (
      bookableVal === true ||
      bookableVal === 'Yes' ||
      bookableVal === 'yes' ||
      bookableVal === 1 ||
      bookableVal === '1'
    ) {
      bookable = 'Yes';
    } else if (
      bookableVal === false ||
      bookableVal === 'No' ||
      bookableVal === 'no' ||
      bookableVal === 0 ||
      bookableVal === '0'
    ) {
      bookable = 'No';
    } else {
      bookable = null; // Handle null/undefined/other values
    }

    const transformed = {
      id: item.name ?? '-',
      spaceName: item.inventory_name ?? '-', // Can be null in API
      center: item.center_name ?? item.center ?? '-',
      centerId: item.center ?? '-',
      floor: item.floor ?? '-', // Can be null in API
      status: item.status || 'Available', // Can be empty string in API
      statusColor: item.status_color ?? null,
      spaceType: inventoryType || '-',
      createdBy: item.owner ?? '-',
      createdAt: item.creation ?? '-',
      lastUpdated: item.modified ?? '-',
      clients: item.clients ?? [],
      bookable, // Add bookable field
      // Use total_seats and available_seats from API
      totalSeats,
      availableSeats,
      pax: getNumberValue(item.pax, totalSeats),
    };

    // Add minimal type-specific fields for list display
    // Handle null/undefined/empty strings gracefully with proper fallbacks
    if (inventoryType === 'Managed Office') {
      transformed.subSpaceType = item.current_status || '-'; // Can be empty string
      transformed.seatRate = getNumberValue(item.expected_per_seat_rate, 0);
    } else if (inventoryType === 'Co-working Space') {
      transformed.subSpaceType =
        normalizeCoworkingInventoryType(item.coworking_inventory_type) || '-';
      transformed.seatRate = getNumberValue(
        item.expected_per_seat_rate,
        getNumberValue(item.expected_per_seat_cost, 0),
      );
    } else if (inventoryType === 'Resource') {
      transformed.subSpaceType = item.resource_type || '-';
      transformed.pax = getNumberValue(item.pax, totalSeats);
      transformed.seatRate = getNumberValue(item.credit_per_hour, 0);
      transformed.timesBooked = getNumberValue(item.times_booked, 0);
    } else if (inventoryType === 'Parking') {
      // transformed.seatRate = getNumberValue(item.expected_per_seat_rate, 0);
      transformed.noOfParking = getNumberValue(item.no_of_parking, 0);
      transformed.parkingType = item.type || item.parking_type || '-';
      transformed.vehicleType = item.vehicle_type ?? '';
      transformed.assigningType = item.assigning_type ?? '-';
      transformed.parkingNo = item.parking_no ?? item['parking no.'] ?? '';
      const parkingTotal = getNumberValue(item.total_seats ?? item.no_of_parking, totalSeats);
      transformed.totalSeats = parkingTotal;
      transformed.availableSeats = getNumberValue(item.available_seats, parkingTotal);
    } else if (inventoryType === 'Pure Rental') {
      transformed.subSpaceType = item.pure_rental_type || '-';
      transformed.seatRate = 0;
    }

    // Fallback for seatRate if not set above (Managed / Co-working / Resource only — not Pure Rental)
    if (inventoryType !== 'Pure Rental' && (!transformed.seatRate || transformed.seatRate === 0)) {
      transformed.seatRate =
        Number(
          item.expected_per_seat_rate || item.expected_per_seat_cost || item.credit_per_hour,
        ) || 0;
    }

    // Ensure availableSeats is always a valid number (should already be set above, but safety check)
    if (
      typeof transformed.availableSeats !== 'number' ||
      Number.isNaN(transformed.availableSeats)
    ) {
      transformed.availableSeats = transformed.totalSeats || 0;
    }

    // Price-related fields for list / space table (aligned with detail form)
    transformed.carpetArea = getNumberValue(item.agreement_carpet_area ?? item.total_carpet_sft);
    transformed.actualCarpetArea = getNumberValue(item.actual_carpet_area);
    transformed.creditPerSeat = getNumberValue(item.credit_per_seat);
    transformed.expectedCarpetRate = getNumberValue(item.expected_carpet_rate);

    if (inventoryType === 'Managed Office') {
      const perSeat = getNumberValue(item.expected_per_seat_rate);
      transformed.expectedPerSeatRate = perSeat;
      transformed.totalRateOfSpace = Math.round(totalSeats * perSeat);
    } else if (inventoryType === 'Co-working Space') {
      const perSeat = getNumberValue(
        item.expected_per_seat_rate,
        getNumberValue(item.expected_per_seat_cost),
      );
      transformed.expectedPerSeatRate = perSeat;
      transformed.totalRateOfSpace = Math.round(totalSeats * perSeat);
    } else if (inventoryType === 'Pure Rental') {
      transformed.expectedPerSeatRate = null;
      transformed.totalRateOfSpace = Math.round(
        getNumberValue(item.agreement_carpet_area ?? item.total_carpet_sft) *
          getNumberValue(item.expected_carpet_rate),
      );
    } else if (inventoryType === 'Resource') {
      transformed.expectedPerSeatRate = getNumberValue(item.expected_per_seat_rate);
      transformed.totalRateOfSpace = Math.round(
        getNumberValue(item.pax, totalSeats) * transformed.expectedPerSeatRate,
      );
    } else {
      transformed.expectedPerSeatRate = null;
      transformed.totalRateOfSpace = null;
    }

    transformed.opportunityLoss = getNumberValue(item.opportunity_loss, 0);
    transformed.timesBooked = getNumberValue(item.times_booked, 0);

    return transformed;
  });
};

// Full transform for detail view (all fields)
const transformSpaceDetailData = (item) => {
  if (!item) return null;

  // Determine space type from inventory_type
  const inventoryType = String(item.inventory_type || '').trim();
  const isManagedOffice = inventoryType === 'Managed Office';
  const isCoworking = inventoryType === 'Co-working Space';
  const isResource = inventoryType === 'Resource';
  const isParking = inventoryType === 'Parking';

  // Base fields common to all space types
  const transformed = {
    id: item.name || '-',
    spaceName: item.inventory_name || '-',
    center: item.center_name || item.center || '-',
    centerId: item.center || '-',
    floor: item.floor || '-',
    status: item.status || 'Available',
    statusColor: item.status_color ?? null,
    spaceType: inventoryType || '-',
    photos: item.photos,
    planFile: item.plan_file,
    createdBy: item.owner || '-',
    createdAt: item.creation || '-',
    modifiedAt: item.modified || '-',

    // Keep original data for reference
    _original: item,
  };

  // Add type-specific fields
  // Backend now uses total_seats for all space types (replaced total_sellable_seats and no_of_seats)
  if (isManagedOffice) {
    transformed.subSpaceType = item.managed_office_type || '-'; // Fitted Out, Bare Shell
    transformed.totalSeats = item.total_seats || 0;
    transformed.carpetArea = item.agreement_carpet_area ?? item.total_carpet_sft ?? 0;
    transformed.actualCarpetArea = item.actual_carpet_area ?? 0;
    transformed.carpetRate = item.expected_carpet_rate || 0;
    transformed.seatRate = item.expected_per_seat_rate || 0;
    transformed.directorCabins = item.director_cabin || 0;
    transformed.managerCabins = item.manager_cabins || 0;
    transformed.meetingRooms = item.meeting_rooms || 0;
    transformed.conferenceRooms = item.conference_rooms || 0;
    transformed.phoneBooths = item.phonebooths || 0;
    transformed.breakoutZones = item.breakout_zones || 0;
    transformed.workstations = item.no_of_workstations || 0;
    transformed.creditPerSeat = item.credit_per_seat || 0;
  } else if (isCoworking) {
    transformed.subSpaceType =
      normalizeCoworkingInventoryType(item.coworking_inventory_type) || '-';
    transformed.totalSeats = item.total_seats || 0;
    transformed.carpetArea = item.agreement_carpet_area ?? item.total_carpet_sft ?? 0;
    transformed.actualCarpetArea = item.actual_carpet_area ?? 0;
    transformed.carpetRate = item.expected_carpet_rate || 0;
    transformed.seatRate = item.expected_per_seat_rate || 0;
    transformed.creditPerSeat = item.credit_per_seat || 0;
    // For co-working, available seats come from backend
    transformed.availableSeats = item.available_seats || item.total_seats || 0;
  } else if (isResource) {
    transformed.subSpaceType = item.resource_type || '-'; // Meeting Room, Event Area, etc.
    transformed.bookable = item.bookable || 'No';
    transformed.pax = item.pax || 0;
    transformed.totalSeats = item.total_seats ?? item.pax ?? 0;
    transformed.creditPerHour = item.credit_per_hour || 0;
    transformed.creditPerSeat = item.credit_per_seat || 0;
    transformed.seatRate = item.expected_per_seat_rate || 0;
    transformed.carpetArea = item.agreement_carpet_area ?? item.total_carpet_sft ?? 0;
    transformed.actualCarpetArea = item.actual_carpet_area ?? 0;
    transformed.carpetRate = item.expected_carpet_rate || 0;
    // transformed.creditPerSeat = item.credit_per_seat || 0;
  } else if (isParking) {
    transformed.seatRate = item.expected_per_seat_rate || 0;
    transformed.assigningType = item.assigning_type || '';
  }

  return transformed;
};

// Fields required for list view only (optimized)
// Include all fields that transformSpaceListData uses to prevent blank fields
// Note: available_seats is not in the API response, it needs to be calculated
// Note: LIST_FIELDS is no longer used as we use list_with_search_filters API which returns all fields
// const LIST_FIELDS = [
//   'name',
//   'inventory_name',
//   'center',
//   'center_name',
//   'floor',
//   'status',
//   'inventory_type',
//   'coworking_inventory_type',
//   'resource_type',
//   'total_sellable_seats',
//   'no_of_seats',
//   'expected_per_seat_rate',
//   'expected_per_seat_cost',
//   'credit_per_hour',
//   'owner',
//   'creation',
//   'modified',
// ];

export const fetchSpaceListData = createAsyncThunk(
  'space/fetchSpaceList',
  async (
    {
      keyword = '',
      filters = [],
      order_by = 'creation desc',
      page = 1,
      pageSize = 20,
      append = false,
      replacePage = null,
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const formData = new FormData();
      formData.append('doctype', SPACE_DOCTYPE);

      if (keyword?.trim()) {
        formData.append('keyword', keyword.trim());
      }

      const hasTupleFilters = Array.isArray(filters) && filters.length > 0;
      const hasObjectFilters =
        filters &&
        typeof filters === 'object' &&
        !Array.isArray(filters) &&
        Object.keys(filters).length > 0;

      if (hasTupleFilters || hasObjectFilters) {
        formData.append('filters', JSON.stringify(filters));
      }

      formData.append('limit_page_length', String(pageSize));
      formData.append('page', String(page));
      formData.append('order_by', order_by);

      const response = await apiClient.post(
        '/method/devx.seat_inventory.doctype.space.space.get_space_listview',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      // Handle different response formats
      let rawData = [];
      const responseData = response?.data;
      const message = responseData?.message || {};

      // Priority 1: Check response.data.message.results
      if (Array.isArray(message.results)) {
        rawData = message.results;
      }
      // Priority 2: Check response.data.message.data
      else if (Array.isArray(message.data)) {
        rawData = message.data;
      }
      // Priority 3: Check if response.data.message is directly an array
      else if (Array.isArray(message)) {
        rawData = message;
      }
      // Priority 4: Check response.data.data
      else if (Array.isArray(responseData?.data)) {
        rawData = responseData.data;
      }
      // Priority 5: Check if response.data is directly an array
      else if (Array.isArray(responseData)) {
        rawData = responseData;
      }

      // Ensure we have valid data before transforming
      if (!Array.isArray(rawData)) {
        // eslint-disable-next-line no-console
        console.warn('fetchSpaceListData: Invalid response data format', {
          responseData,
          rawData,
          responseStructure: responseData ? Object.keys(responseData) : 'no responseData',
          messageKeys: responseData?.message ? Object.keys(responseData.message) : 'no message',
        });
        rawData = [];
      }

      const transformedData = transformSpaceListData(rawData);
      // IMPORTANT: total_count and current_count come from `message`, not top-level
      const totalCount = message.total_count ?? transformedData.length;

      // Extract pagination info from API response
      const apiPage = message.page ?? page;
      const apiPageSize = message.page_size ?? pageSize;
      const apiCount = message.count ?? transformedData.length; // Number of results in current page

      // Calculate currentCount: total items loaded so far
      // Formula: (page - 1) * page_size + count
      // This gives us the cumulative count of items loaded across all pages
      const itemsLoadedSoFar = (apiPage - 1) * apiPageSize + apiCount;

      // Calculate currentCount for append operations
      let currentCount;
      if (append) {
        // For append, use API's current_count if available, otherwise calculate from items loaded
        currentCount = message.current_count ?? itemsLoadedSoFar;
      } else {
        // For initial load, currentCount is the items loaded in this page
        currentCount = itemsLoadedSoFar;
      }

      // Calculate hasMore: there's more data if items loaded so far < total_count
      // Also check if API provides has_more directly (most reliable)
      const hasMoreFromAPI = message.has_more;
      let hasMore;

      const rawListStats = message.stats;
      const listStats =
        rawListStats && typeof rawListStats === 'object'
          ? {
              opportunity_loss: Number(rawListStats.opportunity_loss ?? 0),
              available_spaces: Number(rawListStats.available_spaces ?? 0),
              total_available_seats: Number(rawListStats.total_available_seats ?? 0),
              total_revenue: Number(rawListStats.total_revenue ?? 0),
            }
          : null;

      if (hasMoreFromAPI !== undefined) {
        // Use API's has_more if provided (most reliable)
        hasMore = hasMoreFromAPI;
      } else if (totalCount !== undefined && totalCount > 0) {
        // Calculate based on items loaded vs total count
        // If count < page_size, we're on the last page (no more data)
        // Otherwise, check if items loaded < total count
        hasMore = apiCount === apiPageSize && itemsLoadedSoFar < totalCount;
      } else {
        // Fallback: if we got a full page, assume there might be more
        hasMore = apiCount === apiPageSize;
      }

      return {
        data: transformedData,
        totalCount,
        current_count: currentCount, // Pass current_count to reducer for append calculations
        statusCounts: {
          ...message.status_counts,
          Resource: message.inventory_type_count?.Resource ?? 0,
          Parking: message.inventory_type_count?.Parking ?? 0,
          'Common Area': message.inventory_type_count?.['Common Area'] ?? 0,
        },
        listStats,
        page,
        pageSize,
        append,
        replacePage,
        hasMore,
      };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Map frontend column IDs to backend field names for sorting
const mapSpaceOrderByToBackend = (orderBy) => {
  if (!orderBy || typeof orderBy !== 'string') {
    return orderBy;
  }

  const parts = orderBy.trim().split(/\s+/);
  if (parts.length === 0) {
    return orderBy;
  }

  const frontendField = parts[0];
  const direction = parts.length > 1 ? parts.slice(1).join(' ') : 'desc';

  const fieldMap = {
    spaceName: 'inventory_name',
    totalSeats: 'total_seats', // Backend now uses total_seats for all space types
    availableSeats: 'available_seats',
    center: 'center_name',
    floor: 'floor',
    spaceType: 'inventory_type',
    status: 'status',
    opportunityLoss: 'opportunity_loss',
    timesBooked: 'times_booked',
    createdBy: 'owner',
    createdAt: 'creation',
    lastUpdated: 'modified',
  };

  const backendField = fieldMap[frontendField] || frontendField;
  return `${backendField} ${direction}`;
};

export const fetchSubSpaces = createAsyncThunk(
  'space/fetchSubSpaces',
  async (spaceId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/method/devx.seat_inventory.doctype.assign_space.assign_space.get_sub_spaces',
        { params: { space_id: spaceId } },
      );
      const subSpacesData = response.data?.message?.sub_spaces || [];
      // Sort by seq to maintain order
      const sortedSubSpaces = [...subSpacesData].sort((a, b) => (a.seq || 0) - (b.seq || 0));
      return {
        data: sortedSubSpaces,
        totalCount: sortedSubSpaces.length,
      };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const fetchSpaceListWithFilters = createAsyncThunk(
  'space/fetchSpaceListWithFilters',
  async (
    { filters = [], order_by = 'creation desc', fields = ['*'] } = {},
    { rejectWithValue },
  ) => {
    try {
      const formData = new FormData();

      // Add filters if provided
      if (Array.isArray(filters) && filters.length > 0) {
        formData.append('filters', JSON.stringify(filters));
      }

      // Add order_by
      if (order_by) {
        formData.append('order_by', order_by);
      }

      // Add fields
      if (Array.isArray(fields) && fields.length > 0) {
        formData.append('fields', JSON.stringify(fields));
      }

      const response = await apiClient.post(
        '/method/devx.seat_inventory.doctype.space.space.get_space_listview',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );

      // Handle different response formats robustly
      let rawData = [];
      const responseData = response?.data;
      const message = responseData?.message || {};

      // Priority 1: Check response.data.message.results
      if (Array.isArray(message.results)) {
        rawData = message.results;
      }
      // Priority 2: Check response.data.message.data
      else if (Array.isArray(message.data)) {
        rawData = message.data;
      }
      // Priority 3: Check if response.data.message is directly an array
      else if (Array.isArray(message)) {
        rawData = message;
      }
      // Priority 4: Check response.data.data
      else if (Array.isArray(responseData?.data)) {
        rawData = responseData.data;
      }
      // Priority 5: Check if response.data is directly an array
      else if (Array.isArray(responseData)) {
        rawData = responseData;
      }

      const transformedData = transformSpaceListData(rawData);

      return {
        data: transformedData,
        totalCount: message.total_count ?? transformedData.length,
      };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception || error.message);

      return rejectWithValue(errorMessage);
    }
  },
);

/**
 * Association dropdown source for layout annotation:
 * /resource/Space with floor + layout_coordinate is set.
 */
export const fetchSpacesWithLayoutCoordinates = createAsyncThunk(
  'space/fetchSpacesWithLayoutCoordinates',
  async ({ floor } = {}, { rejectWithValue }) => {
    try {
      const floorValue = String(floor ?? '').trim();
      if (!floorValue) {
        return { data: [], totalCount: 0 };
      }
      const response = await apiClient.get('/resource/Space', {
        params: {
          fields: JSON.stringify(['center_name', 'inventory_name', 'name']),
          filters: JSON.stringify([
            ['floor', '=', floorValue],
            ['layout_coordinate', 'is', 'not set'],
          ]),
          limit_page_length: 0,
        },
      });
      const rawData = Array.isArray(response?.data?.data) ? response.data.data : [];
      const transformedData = rawData.map((item) => ({
        id: item?.name ?? '',
        name: item?.name ?? '',
        spaceName: item?.inventory_name ?? item?.name ?? '',
        inventory_name: item?.inventory_name ?? item?.name ?? '',
        center_name: item?.center_name ?? '',
      }));
      return {
        data: transformedData,
        totalCount: transformedData.length,
      };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        (typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.exception || error.message);

      return rejectWithValue(errorMessage);
    }
  },
);

// Dedicated thunk for backend sorting (similar to landlords)
export const getSpaceListSortingThunk = createAsyncThunk(
  'space/getSpaceListSorting',
  async (
    { keyword = '', status = 'all', filters = [], sorting = [] } = {},
    { rejectWithValue },
  ) => {
    try {
      const formData = new FormData();
      formData.append('doctype', SPACE_DOCTYPE);

      // Build filters array
      let filtersArray = [];
      if (Array.isArray(filters) && filters.length > 0) {
        filtersArray = filters;
      } else if (status && status !== 'all') {
        filtersArray.push(['status', '=', status]);
      }

      if (keyword?.trim()) {
        formData.append('keyword', keyword.trim());
      }

      if (filtersArray.length > 0) {
        formData.append('filters', JSON.stringify(filtersArray));
      }

      // Convert TanStack sorting state to backend order_by
      let orderBy = 'creation desc';
      if (Array.isArray(sorting) && sorting.length > 0) {
        const sortField = sorting[0].id;
        const sortOrder = sorting[0].desc ? 'desc' : 'asc';
        orderBy = mapSpaceOrderByToBackend(`${sortField} ${sortOrder}`);
      }

      formData.append('limit_page_length', '100');
      formData.append('order_by', orderBy);
      // Note: The list_with_search_filters endpoint doesn't properly support fields parameter
      // When fields are specified, it returns only a limited default set:
      // (name, creation, owner, center, center_name, inventory_type, inventory_name, status)
      // To get all fields needed for the table, we must NOT send the fields parameter
      // This allows the API to return all fields, which we then transform on the frontend
      // This matches the landlords implementation pattern

      const response = await apiClient.post(
        '/method/devx.api.listview.list_with_search_filters',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      // Handle different response formats
      // Based on user's examples:
      // - Sorting API returns: { message: { results: [...] } }
      // - Regular API might return: { data: [...] } or { data: { data: [...] } }
      let rawData = [];
      const responseData = response?.data;

      // Priority 1: Check response.data.message.results (sorting API format: { message: { results: [...] } })
      if (Array.isArray(responseData?.message?.results)) {
        rawData = responseData.message.results;
      }
      // Priority 2: Check response.data.message.data
      else if (Array.isArray(responseData?.message?.data)) {
        rawData = responseData.message.data;
      }
      // Priority 3: Check if response.data.message is directly an array
      else if (Array.isArray(responseData?.message)) {
        rawData = responseData.message;
      }
      // Priority 4: Check response.data.data (format: { data: { data: [...] } })
      else if (Array.isArray(responseData?.data)) {
        rawData = responseData.data;
      }
      // Priority 5: Check if response.data is directly an array
      else if (Array.isArray(responseData)) {
        rawData = responseData;
      }

      // Ensure we have valid data before transforming
      if (!Array.isArray(rawData)) {
        // eslint-disable-next-line no-console
        console.warn('getSpaceListSortingThunk: Invalid response data format', {
          responseData,
          rawData,
          responseStructure: responseData ? Object.keys(responseData) : 'no responseData',
          messageKeys: responseData?.message ? Object.keys(responseData.message) : 'no message',
        });
        rawData = [];
      }

      const transformedData = transformSpaceListData(rawData);

      return {
        data: transformedData,
        totalCount: transformedData.length,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

// Fetch full space detail by ID
export const fetchSpaceDetail = createAsyncThunk(
  'space/fetchSpaceDetail',
  async (spaceId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/resource/Space/${spaceId}`);
      const transformedData = transformSpaceDetailData(response?.data?.data || response?.data);
      return transformedData;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const updateSpaceField = createAsyncThunk(
  'space/updateSpaceField',
  async ({ spaceId, fieldname, value, payload }, { rejectWithValue }) => {
    try {
      const updatePayload =
        payload && typeof payload === 'object'
          ? payload
          : { [fieldname]: value === undefined ? null : value };

      const response = await apiClient.put(`/resource/Space/${spaceId}`, updatePayload, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const assignSpace = createAsyncThunk(
  'space/assignSpace',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/resource/Assign Space', payload, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      return response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const createParkingFcfsAssignments = createAsyncThunk(
  'space/createParkingFcfsAssignments',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.seat_inventory.doctype.space.space.create_parking_fcfs_assignments',
        payload,
      );
      return response?.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Transform API response to match frontend expected format
// Note: API results use frontend-friendly names (total_credits, price_per_seat, total_price, client_name)
// but columns use backend names (credit_per_seat, expected_per_seat_rate, total_rate, customer_name)
const transformAllocatedSpaceData = (apiResults) => {
  if (!Array.isArray(apiResults)) return [];

  return apiResults.map((item) => ({
    assign_space_id: item.assign_space_id || item.name || '--',
    client_name: item.client_name || item.customer_name || '--',
    lease_duration: item.lease_duration || '--',
    start_date: item.start_date || null,
    end_date: item.end_date || null,
    status: item.status || null,
    status_color: item.status_color ?? null,
    total_credits: item.total_credits || item.credit_per_seat || 0,
    price_per_seat: item.price_per_seat || item.expected_per_seat_rate || 0,
    total_price: item.total_price || item.total_rate || 0,
    assigned_seats: item.assigned_seats || 0,
    // Pure Rental support: backend can return total_carpet_area
    total_carpet_area:
      item.total_carpet_area ?? item.agreement_carpet_area ?? item.total_carpet_sft ?? 0,
    assign_sub_spaces: item.assign_sub_spaces ?? [],
    inventory_type: item.inventory_type,
    // Keep original data for reference
    _original: item,
  }));
};

const normalizeOccupancyFilterOptions = (filterOptions) => ({
  client_name: Array.isArray(filterOptions?.client_name) ? filterOptions.client_name : [],
  column_max_limits: {
    total_credits: Number(filterOptions?.column_max_limits?.total_credits) || 0,
    price_per_seat: Number(filterOptions?.column_max_limits?.price_per_seat) || 0,
    total_price: Number(filterOptions?.column_max_limits?.total_price) || 0,
  },
});

const OCCUPANCY_GROUP_BY_FIELD_MAP = {
  client: 'client',
  status: 'status',
  center: 'center',
};

export const fetchAllocatedSpaceListview = createAsyncThunk(
  'space/fetchAllocatedSpaceListview',
  async (
    {
      space_id,
      keyword = '',
      filters = null,
      limit_page_length = 20,
      limit_start = 0,
      order_by = 'creation desc',
      group_by = '',
      group_order = 'asc',
    },
    { rejectWithValue },
  ) => {
    try {
      const displayGroupBy = group_by ? String(group_by).trim() : '';
      const payload = {
        space_id,
        keyword,
        filters: Array.isArray(filters) && filters.length > 0 ? JSON.stringify(filters) : '[]',
        limit_page_length,
        limit_start,
        order_by,
        group: displayGroupBy ? 1 : 0,
      };

      if (displayGroupBy) {
        const key = displayGroupBy.toLowerCase();
        payload.group_by = OCCUPANCY_GROUP_BY_FIELD_MAP[key] ?? key;
        payload.group_order = group_order || 'asc';
      }

      const response = await apiClient.post(
        '/method/devx.seat_inventory.doctype.assign_space.assign_space.get_allocated_space_listview',
        payload,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      );

      const message = response?.data?.message || {};
      const rawResults = message.results ?? [];
      const count = message.count || 0;

      const isGrouped =
        Boolean(displayGroupBy) &&
        rawResults !== null &&
        !Array.isArray(rawResults) &&
        typeof rawResults === 'object';

      let data = [];
      let groupedData = {};

      if (isGrouped) {
        groupedData = Object.fromEntries(
          Object.entries(rawResults).map(([groupKey, rows]) => [
            groupKey,
            Array.isArray(rows) ? transformAllocatedSpaceData(rows) : [],
          ]),
        );
        data = Object.values(groupedData).flat();
      } else {
        data = transformAllocatedSpaceData(Array.isArray(rawResults) ? rawResults : []);
      }

      return {
        data,
        groupedData,
        isGrouped,
        count,
        limit_start,
        limit_page_length,
        filterOptions: normalizeOccupancyFilterOptions(message.filter_options),
      };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Fetch detailed Assign Space information by assign_space_id
export const fetchAssignedSpaceDetail = createAsyncThunk(
  'space/fetchAssignedSpaceDetail',
  async (assignSpaceId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/resource/Assign Space/${assignSpaceId}`, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const data = response?.data?.data || response?.data || {};
      return data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Update Assign Space status
export const updateAssignedSpace = createAsyncThunk(
  'space/updateAssignedSpace',
  async ({ assignSpaceId, fields }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/resource/Assign Space/${assignSpaceId}`, fields, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const data = response?.data?.data || response?.data || {};
      return { assignSpaceId, data };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

// Client list for space detail (allocate modal, etc.). Same API as clientSlice getClientListThunk.
export const fetchClientListForSpaceDetailThunk = createAsyncThunk(
  'space/fetchClientListForSpaceDetail',
  async (
    {
      search = '',
      status = 'all',
      center = '',
      city = '',
      page = 1,
      pageSize = 999,
      orderBy = 'creation desc',
      // navbarFilter = null,
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const filterArray = [];
      if (status && status !== 'all') filterArray.push(['custom_status', '=', status]);
      if (center) filterArray.push(['center', '=', center]);
      if (city) filterArray.push(['city', '=', city]);

      const keyword = search && search.trim() ? search.trim() : '';
      const rawFilters = filterArray.length > 0 ? JSON.stringify(filterArray) : '';

      const formData = new FormData();
      formData.append('page', String(page));
      formData.append('limit_page_length', String(pageSize));
      formData.append('order_by', orderBy || '');
      formData.append('filters', rawFilters);
      // if (navbarFilter && Array.isArray(navbarFilter) && navbarFilter.length > 0) {
      //   formData.append('nav_filter', JSON.stringify({ name: navbarFilter }));
      // }
      if (keyword) formData.append('keyword', keyword);

      const response = await apiClient.post(
        '/method/devx.overrides.client.client_list_view',
        formData,
      );

      const responseData = response?.data || {};
      const apiResponse = responseData.message || {};
      const rawResults = apiResponse.results || [];

      const transformedData = rawResults.map((item) => ({
        name: item.customer_id || '',
        customer_name: item.client_name || '',
        custom_legal_name: item.client_name || '',
        custom_center:
          Array.isArray(item.center_names) && item.center_names.length > 0
            ? item.center_names
            : null,
        custom_avg_csi_score: item.average_csi == null ? '-' : item.average_csi,
        custom_spoc_name: item.spoc_name || '-',
        custom_spoc_contact_num: item.spoc_contact || '-',
        engagement: item.engagement || '-',
        custom_status: item.custom_status || '-',
        custom_status_color: item.custom_status_color ?? null,
        owner: '-',
        creation: '-',
      }));

      return { data: transformedData };
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

const spaceSlice = createSlice({
  name: 'space',
  initialState,
  reducers: {
    setSpaceSorting: (state, action) => {
      state.spaceListData.sorting = action.payload;
    },
    resetSpaceList: (state) => {
      state.spaceListData.data = [];
      state.spaceListData.currentPage = 1;
      state.spaceListData.hasMore = false;
      state.spaceListData.error = null;
      state.spaceListData.listStats = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createSpace.pending, (state) => {
        state.loading = true;
        state.createSpaceDrawer.isLoading = true;
        state.createSpaceDrawer.error = null;
      })
      .addCase(createSpace.fulfilled, (state, action) => {
        state.loading = false;
        state.space = action.payload;
        state.createSpaceDrawer.isLoading = false;
        state.createSpaceDrawer.error = null;
      })
      .addCase(createSpace.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
        state.createSpaceDrawer.isLoading = false;
        state.createSpaceDrawer.error = action.payload || action.error?.message;
      })
      .addCase(fetchSpaceListData.pending, (state, action) => {
        const isAppend = Boolean(action.meta?.arg?.append);
        state.spaceListData.status = 'loading';
        state.spaceListData.error = null;
        if (!isAppend) {
          state.spaceListData.listStats = null;
        }
        if (isAppend) {
          state.spaceListData.isLoadingMore = true;
        } else {
          state.spaceListData.isLoading = true;
        }
      })
      .addCase(fetchSpaceListData.fulfilled, (state, action) => {
        state.spaceListData.isLoading = false;
        state.spaceListData.isLoadingMore = false;

        state.spaceListData.status = 'succeeded';
        state.spaceListData.error = null;

        const {
          data,
          page,
          pageSize,
          append,
          hasMore,
          totalCount,
          current_count,
          statusCounts,
          listStats,
          replacePage,
        } = action.payload;

        state.spaceListData.totalCount = totalCount;
        state.spaceListData.statusCounts = statusCounts || { all: 0, Occupied: 0, Available: 0 };
        if (listStats !== undefined) {
          state.spaceListData.listStats = listStats;
        }

        if (replacePage != null && replacePage >= 1) {
          const psz = pageSize || state.spaceListData.pageSize;
          const start = (replacePage - 1) * psz;
          const prev = state.spaceListData.data || [];
          state.spaceListData.data = [
            ...prev.slice(0, start),
            ...(data || []),
            ...prev.slice(start + psz),
          ];
          return;
        }

        // Update pagination state
        state.spaceListData.currentPage = page;
        state.spaceListData.pageSize = pageSize;

        // Handle append logic for scroll pagination
        if (append && Array.isArray(data)) {
          // Append new results to existing results, avoiding duplicates
          const existingData = state.spaceListData.data || [];
          const existingIds = new Set(existingData.map((item) => item.id || item.name));
          const newData = data.filter((item) => !existingIds.has(item.id || item.name));
          state.spaceListData.data = [...existingData, ...newData];

          // Recalculate hasMore based on current_count from API response
          // This is the most accurate way as it uses the API's calculation
          if (current_count !== undefined && totalCount !== undefined) {
            // Use API's current_count if provided (calculated as: (page - 1) * page_size + count)
            state.spaceListData.hasMore = current_count < totalCount;
          } else if (hasMore === undefined) {
            // Final fallback: calculate from data length
            const calculatedCurrentCount = state.spaceListData.data.length;
            state.spaceListData.hasMore = calculatedCurrentCount < totalCount;
          } else {
            // Fallback to hasMore from payload if current_count not available
            state.spaceListData.hasMore = hasMore;
          }
        } else {
          // Replace data for new search/filter
          state.spaceListData.data = data || [];

          // For non-append operations, use hasMore from payload
          if (hasMore === undefined) {
            // Fallback: calculate hasMore if not provided
            const dataLength = Array.isArray(data) ? data.length : 0;
            state.spaceListData.hasMore = dataLength === pageSize && dataLength < totalCount;
          } else {
            state.spaceListData.hasMore = hasMore;
          }
        }
      })
      .addCase(fetchSpaceListData.rejected, (state, action) => {
        state.spaceListData.isLoading = false;
        state.spaceListData.isLoadingMore = false;
        state.spaceListData.status = 'failed';
        state.spaceListData.error = extractErrorMessage(
          action.payload ?? action.error,
          'Unable to load spaces. Please try again.',
        );
      })
      .addCase(fetchSpaceListWithFilters.pending, (state) => {
        state.spaceListData.isLoading = true;
        state.spaceListData.error = null;
      })
      .addCase(fetchSpaceListWithFilters.fulfilled, (state, action) => {
        state.spaceListData.isLoading = false;
        state.spaceListData.data = action.payload.data;
        state.spaceListData.totalCount = action.payload.totalCount;
        state.spaceListData.hasMore = false;
      })
      .addCase(fetchSpaceListWithFilters.rejected, (state, action) => {
        state.spaceListData.isLoading = false;
        state.spaceListData.error = action.payload || action.error?.message;
      })
      .addCase(fetchSpacesWithLayoutCoordinates.pending, (state) => {
        state.spaceListData.isLoading = true;
        state.spaceListData.error = null;
      })
      .addCase(fetchSpacesWithLayoutCoordinates.fulfilled, (state, action) => {
        state.spaceListData.isLoading = false;
        state.spaceListData.data = action.payload.data;
        state.spaceListData.totalCount = action.payload.totalCount;
        state.spaceListData.hasMore = false;
      })
      .addCase(fetchSpacesWithLayoutCoordinates.rejected, (state, action) => {
        state.spaceListData.isLoading = false;
        state.spaceListData.error = action.payload || action.error?.message;
      })
      .addCase(getSpaceListSortingThunk.pending, (state) => {
        state.spaceListData.isLoading = true;
        state.spaceListData.error = null;
      })
      .addCase(getSpaceListSortingThunk.fulfilled, (state, action) => {
        state.spaceListData.isLoading = false;
        state.spaceListData.data = action.payload.data;
        state.spaceListData.totalCount = action.payload.totalCount;
        state.spaceListData.hasMore = false;
      })
      .addCase(getSpaceListSortingThunk.rejected, (state, action) => {
        state.spaceListData.isLoading = false;
        state.spaceListData.error = action.payload || action.error?.message;
      })
      .addCase(fetchSpaceDetail.pending, (state) => {
        state.spaceInDetail.isLoading = true;
        state.spaceInDetail.error = null;
      })
      .addCase(fetchSpaceDetail.fulfilled, (state, action) => {
        state.spaceInDetail.isLoading = false;
        state.spaceInDetail.data = action.payload;
      })
      .addCase(fetchSpaceDetail.rejected, (state, action) => {
        state.spaceInDetail.isLoading = false;
        state.spaceInDetail.error = action.payload || action.error?.message;
      });

    builder
      .addCase(updateSpaceField.pending, (state) => {
        state.spaceInDetail.error = null;
      })
      .addCase(updateSpaceField.fulfilled, (state, action) => {
        state.spaceInDetail.error = null;
        const { spaceId, fieldname, value } = action.meta?.arg || {};
        const listFieldMap = {
          inventory_name: 'spaceName',
          floor: 'floor',
          agreement_carpet_area: 'carpetArea',
          actual_carpet_area: 'actualCarpetArea',
          total_carpet_sft: 'carpetArea',
          expected_carpet_rate: 'expectedCarpetRate',
          expected_per_seat_rate: 'expectedPerSeatRate',
          bookable: 'bookable',
        };
        const listField = listFieldMap[fieldname];
        if (!spaceId || !listField) return;
        const idx = state.spaceListData.data?.findIndex((s) => s.id === spaceId);
        if (idx >= 0) {
          let normalizedValue = value;
          if (fieldname === 'bookable') {
            if (
              value === true ||
              value === 'Yes' ||
              value === 'yes' ||
              value === 1 ||
              value === '1'
            ) {
              normalizedValue = 'Yes';
            } else if (
              value === false ||
              value === 'No' ||
              value === 'no' ||
              value === 0 ||
              value === '0'
            ) {
              normalizedValue = 'No';
            } else {
              normalizedValue = null;
            }
          }
          state.spaceListData.data[idx] = {
            ...state.spaceListData.data[idx],
            [listField]: normalizedValue,
          };
        }
      })
      .addCase(updateSpaceField.rejected, (state, action) => {
        state.spaceInDetail.error = action.payload || action.error?.message;
      });

    builder
      .addCase(assignSpace.pending, (state) => {
        state.assignSpace.isLoading = true;
        state.assignSpace.error = null;
      })
      .addCase(assignSpace.fulfilled, (state, action) => {
        state.assignSpace.isLoading = false;
        state.assignSpace.data = action.payload;
      })
      .addCase(assignSpace.rejected, (state, action) => {
        state.assignSpace.isLoading = false;
        state.assignSpace.error = action.payload || action.error?.message;
      });

    builder
      .addCase(createParkingFcfsAssignments.pending, (state) => {
        state.assignSpace.isLoading = true;
        state.assignSpace.error = null;
      })
      .addCase(createParkingFcfsAssignments.fulfilled, (state, action) => {
        state.assignSpace.isLoading = false;
        state.assignSpace.data = action.payload;
      })
      .addCase(createParkingFcfsAssignments.rejected, (state, action) => {
        state.assignSpace.isLoading = false;
        state.assignSpace.error = action.payload || action.error?.message;
      });

    builder
      .addCase(fetchSpaceColumnList.pending, (state) => {
        state.columnPreferences.isLoading = true;
        state.columnPreferences.error = null;
      })
      .addCase(fetchSpaceColumnList.fulfilled, (state, action) => {
        state.columnPreferences.isLoading = false;
        state.columnPreferences.data = action.payload;
      })
      .addCase(fetchSpaceColumnList.rejected, (state, action) => {
        state.columnPreferences.isLoading = false;
        state.columnPreferences.error = action.payload || action.error?.message;
      })
      .addCase(updateSpaceColumnList.pending, (state) => {
        state.columnPreferences.isLoading = true;
        state.columnPreferences.error = null;
      })
      .addCase(updateSpaceColumnList.fulfilled, (state, action) => {
        state.columnPreferences.isLoading = false;
        // Keep store in sync with latest saved preference order
        if (Array.isArray(action.payload)) {
          state.columnPreferences.data = action.payload;
        }
      })
      .addCase(updateSpaceColumnList.rejected, (state, action) => {
        state.columnPreferences.isLoading = false;
        state.columnPreferences.error = action.payload || action.error?.message;
      });

    builder
      .addCase(fetchAllocatedSpaceListview.pending, (state, action) => {
        const isLoadMore = (action.meta.arg?.limit_start ?? 0) > 0;
        if (isLoadMore) {
          state.allocatedSpaceListview.isFetchingMore = true;
        } else {
          state.allocatedSpaceListview.isLoading = true;
        }
        state.allocatedSpaceListview.error = null;
      })
      .addCase(fetchAllocatedSpaceListview.fulfilled, (state, action) => {
        const { data, groupedData, isGrouped, count, limit_start, filterOptions } = action.payload;
        state.allocatedSpaceListview.isLoading = false;
        state.allocatedSpaceListview.isFetchingMore = false;
        state.allocatedSpaceListview.isGrouped = Boolean(isGrouped);
        if (limit_start === 0) {
          state.allocatedSpaceListview.data = data;
          state.allocatedSpaceListview.groupedData = isGrouped ? groupedData || {} : {};
          if (filterOptions) {
            state.allocatedSpaceListview.filterOptions = filterOptions;
          }
        } else {
          state.allocatedSpaceListview.data = [...state.allocatedSpaceListview.data, ...data];
        }
        state.allocatedSpaceListview.count = count;
        state.allocatedSpaceListview.hasMore = isGrouped
          ? false
          : limit_start + data.length < count;
        state.allocatedSpaceListview.error = null;
      })
      .addCase(fetchAllocatedSpaceListview.rejected, (state, action) => {
        state.allocatedSpaceListview.isLoading = false;
        state.allocatedSpaceListview.isFetchingMore = false;
        state.allocatedSpaceListview.error = action.payload || action.error?.message;
      })
      .addCase(fetchAssignedSpaceDetail.pending, (state) => {
        state.assignedSpaceDetail.isLoading = true;
        state.assignedSpaceDetail.error = null;
      })
      .addCase(fetchAssignedSpaceDetail.fulfilled, (state, action) => {
        state.assignedSpaceDetail.isLoading = false;
        state.assignedSpaceDetail.data = action.payload;
        state.assignedSpaceDetail.error = null;
      })
      .addCase(fetchAssignedSpaceDetail.rejected, (state, action) => {
        state.assignedSpaceDetail.isLoading = false;
        state.assignedSpaceDetail.error = action.payload || action.error?.message;
      })
      .addCase(updateAssignedSpace.pending, (state) => {
        state.assignedSpaceDetail.isLoading = true;
        state.assignedSpaceDetail.error = null;
      })
      .addCase(updateAssignedSpace.fulfilled, (state, action) => {
        state.assignedSpaceDetail.isLoading = false;
        // Update the data with the new status
        if (state.assignedSpaceDetail.data?.name === action.payload.assignSpaceId) {
          state.assignedSpaceDetail.data = {
            ...state.assignedSpaceDetail.data,
            ...action.payload.data,
          };
        }
        state.assignedSpaceDetail.error = null;
      })
      .addCase(updateAssignedSpace.rejected, (state, action) => {
        state.assignedSpaceDetail.isLoading = false;
        state.assignedSpaceDetail.error = action.payload || action.error?.message;
      })
      .addCase(fetchClientListForSpaceDetailThunk.pending, (state) => {
        state.spaceDetailClientList.isLoading = true;
        state.spaceDetailClientList.error = null;
      })
      .addCase(fetchClientListForSpaceDetailThunk.fulfilled, (state, { payload }) => {
        state.spaceDetailClientList.isLoading = false;
        state.spaceDetailClientList.error = null;
        state.spaceDetailClientList.data = Array.isArray(payload?.data) ? payload.data : [];
      })
      .addCase(fetchClientListForSpaceDetailThunk.rejected, (state, action) => {
        state.spaceDetailClientList.isLoading = false;
        state.spaceDetailClientList.error = action.payload || action.error?.message;
        state.spaceDetailClientList.data = [];
      });
  },
});

export const { setSpaceSorting, resetSpaceList } = spaceSlice.actions;

// Selectors
export const selectSpaceListData = (state) => state.space.spaceListData;
export const selectSpaceInDetail = (state) => state.space.spaceInDetail;
export const selectAllocatedSpaceListview = (state) => state.space.allocatedSpaceListview;
export const selectAssignedSpaceDetail = (state) => state.space.assignedSpaceDetail;
export const selectSpaceDetailClientList = (state) =>
  state.space.spaceDetailClientList ?? { data: [], isLoading: false, error: null };

export default spaceSlice.reducer;
