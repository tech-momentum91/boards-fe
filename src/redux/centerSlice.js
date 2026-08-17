import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import apiClient from '@/api/axios';
import {
  buildAddFloorFormData,
  buildEditFloorFormData,
  fetchFloorDetailsList,
  postAddFloorWithFiles,
  postDeleteFloorDetail,
  postEditFloorWithFiles,
  postRemoveFloorDetailAttachment,
  postRemoveFloorLayout,
} from '@/api/floorDetail';
import { extractErrorMessage } from '@/utils/error-utils';
import { countCompletedSurveys } from '@/utils/csi-utils';
import { getCenterLabelSyncFromUpdateAction } from '@/utils/center-label-sync';

const serializeError = (error) => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  return error?.message || 'Something went wrong while fetching centers';
};

const initialState = {
  centerListData: {
    data: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    page: 1,
    pageSize: 20,
    hasMore: false,
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    totalCount: 0,
    // Pre-status-filter count used by the "All" tab badge so it doesn't
    // collapse to the active tab's narrowed total. See
    // `devx.api.listview.list_with_search_filters` for the contract.
    totalCountExcludingStatus: 0,
    statusCounts: {}, // Store status_counts from API
  },

  centerDetails: {
    data: [],
    isLoading: false,
    error: null,
    status: null,
  },

  centerAllocatedClients: {
    data: [],
    isLoading: false,
    error: null,
  },

  columnPreferences: {
    data: [],
    isLoading: false,
    error: null,
  },

  centerAccess: {
    data: [],
    status: 'idle',
    error: null,
    selectedCenters: [],
    isAllCenter: true,
  },

  filterDrawer: { isOpen: false },

  createCenterDrawer: {
    isOpen: false,
    isLoading: false,
    error: null,
    status: null,
  },

  viewCenterDrawer: {
    isOpen: false,
    selectedCenter: null,
  },

  addLandlordModal: { isOpen: false },
  addTeamMemberModal: { isOpen: false },
  createTeamMemberModal: { isOpen: false },

  editTeamMemberModal: {
    isOpen: false,
    selectedTeamMember: null,
  },

  addComplianceDocumentModal: {
    isOpen: false,
  },

  editComplianceDocumentModal: {
    isOpen: false,
    selectedDocument: null,
  },

  removeComplianceDocumentModal: {
    isOpen: false,
    selectedDocument: null,
  },

  complianceDocument: {
    isLoading: false,
    error: null,
    status: null,
  },

  documentTypes: {
    data: [],
    isLoading: false,
    error: null,
  },

  /** Center > Documents tab — list from ``get_center_building_documents`` (server-filtered). */
  centerBuildingDocuments: {
    centerId: null,
    documents: [],
    total: 0,
    totalUnfiltered: 0,
    isLoading: false,
    error: null,
  },

  teamAssociated: {
    createAssociatedTeamMember: {
      isLoading: false,
      error: null,
    },
    roleList: {
      data: [],
      isLoading: false,
      error: null,
    },
    teamMemberList: {
      data: [],
      isLoading: false,
      error: null,
    },
  },
  viewCenterSpace: {
    spaces: {
      data: [],
      isLoading: true,
      error: null,
    },
  },

  centerTeamAssociated: {
    data: [],
    isLoading: false,
    error: null,
    status: null,
  },
  fetchRoleTeamMemberList: {
    data: [],
    isLoading: false,
    error: null,
  },

  parkingFloors: {
    data: [],
    centerId: null,
    isLoading: false,
    error: null,
  },

  centerBillingMonthlySummary: {
    rows: [],
    page: 1,
    limit: 12,
    hasMore: false,
    center: null,
    isLoading: false,
    isLoadingMore: false,
    error: null,
  },

  // ── Center Tasks (record-scoped) ─────────────────────────────────────────────
  preboardingTasks: {
    data: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    page: 1,
    page_size: 20,
    total_pages: 0,
    total_count: 0,
    total_tasks: 0,
    completed_tasks: 0,
    completed_percentage: 0,
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
};

/* --------------------------- THUNKS --------------------------- */

export const createCenterThunk = createAsyncThunk(
  'center/createCenter',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.center_management.doctype.center.center.create_center',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const getCenterDetailsThunk = createAsyncThunk(
  'center/getCenterDetails',
  async (center_id, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.center_management.doctype.center.center.get_center_details',
        {
          center_id,
        },
      );
      // New API returns data in response.data.message
      return response.data?.message || response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const getCenterAllocatedClientsThunk = createAsyncThunk(
  'center/getCenterAllocatedClients',
  async (center_id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/method/devx.center_management.doctype.center.center.get_center_allocated_clients',
        {
          params: { center_id },
        },
      );
      return response?.data?.message || {};
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

/** Server-filtered building / compliance documents for Center > Documents tab. */
export const fetchCenterBuildingDocumentsThunk = createAsyncThunk(
  'center/fetchCenterBuildingDocuments',
  async ({ center_id, keyword = '', filters = {} }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.center_management.doctype.center.center.get_center_building_documents',
        {
          center_id,
          keyword: keyword?.trim() || '',
          filters: JSON.stringify(filters && typeof filters === 'object' ? filters : {}),
        },
      );
      const message = response?.data?.message ?? response?.data ?? {};
      return {
        center_id,
        documents: Array.isArray(message.documents) ? message.documents : [],
        total: typeof message.total === 'number' ? message.total : (message.documents?.length ?? 0),
        total_unfiltered:
          typeof message.total_unfiltered === 'number'
            ? message.total_unfiltered
            : (message.documents?.length ?? 0),
      };
    } catch (error) {
      return rejectWithValue(serializeError(error));
    }
  },
);

export const getParkingFloorDetailsThunk = createAsyncThunk(
  'center/getParkingFloorDetails',
  async (center, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.center_management.doctype.center.center.get_parking_floor_details',
        { center },
      );
      const message = response?.data?.message ?? {};
      const rawFloors = Array.isArray(message.parking_floors) ? message.parking_floors : [];
      const rows = rawFloors.map((row, index) => {
        const spaceId = row.space_id || '';
        const block = row.block ?? '';
        const floor = row.floor ?? '';
        return {
          id: spaceId || `parking-floor-${index}-${floor || ''}`,
          space_id: spaceId,
          block,
          floor,
          vehicle_type: row.vehicle_type ?? '',
          type: row.parking_type ?? '',
          assigning_type: row.assigning_type ?? '',
          per_parking_rate:
            row.expected_per_seat_rate ?? row.expected_per_seat_cost ?? row.per_parking_rate ?? '',
          parking_numbers: Array.isArray(row.parking_no) ? row.parking_no : [],
        };
      });
      return {
        center: message.center ?? center,
        rows,
      };
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        extractErrorMessage(error) ||
        'Failed to load parking floors';
      return rejectWithValue(typeof msg === 'string' ? msg : String(msg));
    }
  },
);

export const getCenterBillingMonthlySummaryThunk = createAsyncThunk(
  'center/getCenterBillingMonthlySummary',
  async ({ centerId, page = 1, limit = 12, append = false }, { rejectWithValue }) => {
    if (!centerId) return rejectWithValue('center_id_required');
    try {
      const response = await apiClient.post(
        '/method/devx.center_management.doctype.center.center.get_center_billing_monthly_summary',
        { center: centerId, page, limit },
      );
      return { ...(response.data?.message ?? response.data), append };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const deleteParkingSpaceThunk = createAsyncThunk(
  'center/deleteParkingSpace',
  async (space_id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        '/method/devx.seat_inventory.doctype.space.space.delete_parking_space',
        { params: { space_id } },
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        extractErrorMessage(error) ||
        'Failed to delete parking space';
      return rejectWithValue(typeof msg === 'string' ? msg : String(msg));
    }
  },
);

/** Payload: { space_id } plus optional floor, parking_type, status, inactive, parking_no (string | string[] | { sub_space_id }[]) */
export const updateParkingSpaceThunk = createAsyncThunk(
  'center/updateParkingSpace',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.seat_inventory.doctype.space.space.update_parking_space',
        payload,
      );
      return response.data?.message ?? response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.exc ||
        extractErrorMessage(error) ||
        'Failed to update parking space';
      return rejectWithValue(typeof msg === 'string' ? msg : String(msg));
    }
  },
);

export const updateCenterThunk = createAsyncThunk(
  'center/updateCenter',
  async ({ center_id, payload }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/resource/Center/${center_id}`, payload);
      return response.data;
    } catch (error) {
      // const errorMessage =
      //   error.response?.data?.message ||
      //   error.response?.data?.exc ||
      //   (typeof error.response?.data === 'string'
      //     ? error.response.data
      //     : error.response?.data?.exception) ||
      //   error.message ||
      //   'Failed to update center';
      return rejectWithValue(
        error.serialized || extractErrorMessage(error) || 'Failed to update center',
      );
    }
  },
);

export const updateCenterFloorDetailsThunk = createAsyncThunk(
  'center/updateCenterFloorDetails',
  async ({ center_id, floor_details }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('floor_details', JSON.stringify(floor_details));
      const response = await apiClient.put(`/resource/Center/${center_id}`, formData);
      return response.data;
    } catch (error) {
      // const errorMessage =
      //   error.response?.data?.message ||
      //   error.response?.data?.exc ||
      //   (typeof error.response?.data === 'string'
      //     ? error.response.data
      //     : error.response?.data?.exception) ||
      //   error.message ||
      //   'Failed to update floor details';
      return rejectWithValue(
        error.serialized || extractErrorMessage(error) || 'Failed to update floor details',
      );
    }
  },
);

export const listFloorDetailsThunk = createAsyncThunk(
  'center/listFloorDetails',
  async (arg, { rejectWithValue }) => {
    try {
      if (typeof arg === 'string') {
        return await fetchFloorDetailsList(arg);
      }
      if (arg && typeof arg === 'object' && arg.center != null) {
        const { center, ...query } = arg;
        return await fetchFloorDetailsList(center, query);
      }
      return await fetchFloorDetailsList(arg);
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error) || 'Failed to load floor list',
      );
    }
  },
);

export const addFloorWithFilesThunk = createAsyncThunk(
  'center/addFloorWithFiles',
  async (
    { center, block, floor, carpet_area, floor_height, has_parking = false, file },
    { rejectWithValue },
  ) => {
    try {
      const formData = buildAddFloorFormData({
        center,
        block,
        floor,
        carpet_area,
        floor_height,
        has_parking,
        file,
      });
      return await postAddFloorWithFiles(formData);
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error) || 'Failed to add floor',
      );
    }
  },
);

export const editFloorWithFilesThunk = createAsyncThunk(
  'center/editFloorWithFiles',
  async (
    { floor_ref, block, floor, carpet_area, floor_height, has_parking, file, layout_action },
    { rejectWithValue },
  ) => {
    try {
      const formData = buildEditFloorFormData({
        floor_ref,
        block,
        floor,
        carpet_area,
        floor_height,
        has_parking,
        file,
        layout_action,
      });
      return await postEditFloorWithFiles(formData);
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error) || 'Failed to update floor',
      );
    }
  },
);

export const removeFloorDetailAttachmentThunk = createAsyncThunk(
  'center/removeFloorDetailAttachment',
  async (file_id, { rejectWithValue }) => {
    try {
      return await postRemoveFloorDetailAttachment(file_id);
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error) || 'Failed to remove attachment',
      );
    }
  },
);

export const removeFloorLayoutThunk = createAsyncThunk(
  'center/removeFloorLayout',
  async ({ center, block_floor_id, file_id }, { rejectWithValue }) => {
    try {
      return await postRemoveFloorLayout({ center, block_floor_id, file_id });
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error) || 'Failed to remove floor layout',
      );
    }
  },
);

export const deleteFloorDetailThunk = createAsyncThunk(
  'center/deleteFloorDetail',
  async (floor_ref, { rejectWithValue }) => {
    try {
      return await postDeleteFloorDetail(floor_ref);
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error) || 'Failed to delete floor',
      );
    }
  },
);

export const getCenterListThunk = createAsyncThunk(
  'center/getCenterList',
  async (
    {
      keyword = '',
      filters = [],
      // navbar_filter = null,
      // Local-toolbar filter clauses that should UNION with `navbar_filter`
      // instead of AND-ing. Built via
      // `partitionAppliedFiltersForUnion` in `@/utils/combined-scope-filter`;
      // backend contract lives in `devx.api.union_with_navbar`. When omitted
      // (or empty) the call behaves exactly like before.
      or_filters_with_navbar = null,
      page = 1,
      pageSize = 20,
      append = false,
      order_by = 'creation desc',
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const formData = new FormData();
      formData.append('doctype', 'Center');

      // Global centre header. Callers should pass the value built by
      // `adaptGlobalCenterIntent.center(intent)` from
      // `@/utils/global-center-filter`, which returns:
      //   - `null` when every accessible centre is selected (omit the filter)
      //   - `{ name: string[] }` for a subset, or `{ name: [] }` when the user
      //     explicitly cleared everything (backend honours empty as "match
      //     nothing" via `parse_global_center_param`).
      // A bare array is still accepted for back-compat: it gets wrapped here.
      // if (navbar_filter != null) {
      //   const payload = Array.isArray(navbar_filter) ? { name: navbar_filter } : navbar_filter;
      //   formData.append('navbar_filter', JSON.stringify(payload));
      // }

      formData.append('limit_page_length', String(pageSize));
      formData.append('page', String(page));
      formData.append('order_by', order_by);
      formData.append('search_fields', 'center_name,city');

      // Always use list_with_search_filters API
      if (filters?.length > 0) {
        formData.append('filters', JSON.stringify(filters));
      }
      if (Array.isArray(or_filters_with_navbar) && or_filters_with_navbar.length > 0) {
        formData.append('or_filters_with_navbar', JSON.stringify(or_filters_with_navbar));
      }
      if (keyword.trim()) {
        formData.append('keyword', keyword.trim());
      }

      const response = await apiClient.post(
        '/method/devx.center_management.api.listview.get_center_listview',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      const responseData = response?.data?.message || response?.data || {};
      const results = responseData.results || responseData.data || responseData || [];
      const totalCount = responseData.total_count ?? responseData.count ?? results.length;

      // Extract pagination info from API response
      const apiPage = responseData.page ?? page;
      const apiPageSize = responseData.page_size ?? pageSize;
      const apiCount = responseData.count ?? results.length; // Number of results in current page

      // Calculate currentCount: total items loaded so far
      // Formula: (page - 1) * page_size + count
      // This gives us the cumulative count of items loaded across all pages
      const itemsLoadedSoFar = (apiPage - 1) * apiPageSize + apiCount;

      // Calculate currentCount for append operations
      let currentCount;
      if (append) {
        // For append, use API's current_count if available, otherwise calculate from items loaded
        currentCount = responseData.current_count ?? itemsLoadedSoFar;
      } else {
        // For initial load, currentCount is the items loaded in this page
        currentCount = itemsLoadedSoFar;
      }

      // Calculate hasMore: there's more data if items loaded so far < total_count
      // Also check if API provides has_more directly (most reliable)
      const hasMoreFromAPI = responseData.has_more;
      let hasMore;

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

      const statusCounts = responseData.status_counts || {};
      // Backend computes this on the dataset *without* the active status
      // clause so the All tab badge stays stable when the user clicks
      // between status tabs. Falls back to `totalCount` for older backends
      // (or doctypes without a `status` field) so the All badge keeps
      // working there too. See `devx.api.listview.list_with_search_filters`.
      const totalCountExcludingStatus = responseData.total_count_excluding_status ?? totalCount;

      return {
        results,
        page,
        pageSize,
        append,
        hasMore,
        totalCount,
        totalCountExcludingStatus,
        current_count: currentCount, // Pass current_count to reducer for append calculations
        statusCounts,
        message: responseData, // Preserve original message for backward compatibility
        status: response?.data?.status || response?.status || 200,
      };
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

const WH_BASE = '/method/devx.center_management.api.working_hours';

/**
 * GET center working hours snapshot.
 * Payload: center id string, or { center: string, date?: 'YYYY-MM-DD' } to choose which ISO week block `week` covers (default: today).
 * Response: { center, working_hours, week: [{ date, weekday, label, kind }], today }
 */
export const getCenterWorkingHoursThunk = createAsyncThunk(
  'center/getCenterWorkingHours',
  async (payload, { rejectWithValue }) => {
    try {
      const center = typeof payload === 'string' ? payload : payload?.center;
      const date = typeof payload === 'object' && payload != null ? payload.date : undefined;
      if (!center) {
        return rejectWithValue('Center is required');
      }
      const body = { center };
      if (date != null && String(date).trim() !== '') {
        body.date = String(date).trim();
      }
      const response = await apiClient.post(`${WH_BASE}.get_center_working_hours`, body);
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error) || 'Failed to load working hours');
    }
  },
);

export const addCenterWorkingHoursThunk = createAsyncThunk(
  'center/addCenterWorkingHours',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`${WH_BASE}.add_center_working_hours`, payload);
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error) || 'Failed to add working hours');
    }
  },
);

export const updateCenterWorkingHoursThunk = createAsyncThunk(
  'center/updateCenterWorkingHours',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`${WH_BASE}.update_center_working_hours`, payload);
      return response.data?.message ?? response.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error) || 'Failed to update working hours');
    }
  },
);

export const getCenterColumnPreferencesThunk = createAsyncThunk(
  'center/getCenterColumnPreferences',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.get_list_pref', {
        doctype: 'Center',
      });
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

export const saveCenterColumnPreferencesThunk = createAsyncThunk(
  'center/saveCenterColumnPreferences',
  async (columns, { rejectWithValue }) => {
    try {
      const payload = {
        doctype: 'Center',
        columns: columns.map((c) => ({
          id: c.id,
          visible: c.visible !== false,
        })),
      };

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

export const fetchCenterAccess = createAsyncThunk(
  'center/fetchCenterAccess',
  async (_, thunkAPI) => {
    try {
      // New API: returns data grouped by zone
      // {
      //   "message": [
      //     {
      //       "zone": "Zone 1",
      //       "centers": [
      //         { "name": "CTR-01", "center_name": "The First" }
      //       ]
      //     }
      //   ]
      // }
      const response = await apiClient.get(
        '/method/devx.center_management.doctype.center.center.get_zones_and_centers',
      );

      const message = response?.data?.message ?? {};
      // Backend now returns { zones: [...], is_all_center: bool }
      const zonesData = Array.isArray(message.zones) ? message.zones : [];
      const isAllCenter = message.is_all_center ?? true;

      // Normalize to a flat list of centers while preserving zone info
      const centers = zonesData.flatMap((zoneGroup) => {
        const zoneName = zoneGroup?.zone || 'Unassigned';
        const groupCenters = Array.isArray(zoneGroup?.centers) ? zoneGroup.centers : [];

        return groupCenters.map((center) => ({
          ...center,
          zone: center.zone || zoneName,
        }));
      });

      return { centers, isAllCenter };
    } catch (error) {
      return thunkAPI.rejectWithValue(serializeError(error));
    }
  },
);

export const fetchCenterDocumentTypesThunk = createAsyncThunk(
  'center/fetchCenterDocumentTypes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/resource/Document Types', {
        params: {
          fields: JSON.stringify(['name', 'has_expiry', 'document_category']),
          limit_page_length: 999,
          filters: JSON.stringify([['ref_doctype', '=', 'Center']]),
        },
      });
      const types = Array.isArray(response.data?.data) ? response.data.data : [];
      return types;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const fetchCenterExportData = createAsyncThunk(
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

export const uploadBuildingDetailsThunk = createAsyncThunk(
  'center/uploadBuildingDetails',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.center_management.doctype.center.center.update_building_details',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const getTeamAssociatedRoleListThunk = createAsyncThunk(
  'center/getTeamAssociatedRoleList',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/method/devx.api.user.get_roles_without_desk_access');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const getAssociatedTeamMembersListThunk = createAsyncThunk(
  'center/getAssociatedTeamMembersList',
  async (payload, { rejectWithValue }) => {
    try {
      // console.log('payload in getAssociatedTeamMembersListThunk', payload);
      const response = await apiClient.post(
        '/method/devx.center_management.doctype.center.center.get_associate_team_member',
        {
          role: payload,
        },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const createAssociatedTeamMemberThunk = createAsyncThunk(
  'center/createAssociatedTeamMember',
  async (payload, { rejectWithValue }) => {
    try {
      // Check if payload is FormData
      // console.log('payload in createAssociatedTeamMemberThunk', payload);
      const isFormData = payload instanceof FormData;

      let body = payload;
      if (isFormData) {
        if (!payload.has('status')) {
          payload.append('status', 'Active');
        }
      } else {
        const status =
          payload?.status != null && String(payload.status).trim() !== ''
            ? String(payload.status).trim()
            : 'Active';
        body = {
          ...payload,
          status,
        };
      }

      const config = isFormData
        ? {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        : {};

      const response = await apiClient.post(
        '/method/devx.team_management.api.team_member.create_team_member',
        body,
        config,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const updateAssociateTeamMemberThunk = createAsyncThunk(
  'center/updateAssociateTeamMember',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.center_management.doctype.center.center.update_associate_team_role',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

// export const removeAssociateTeamMemberThunk = createAsyncThunk(
//   'center/removeAssociateTeamMember',
//   async (payload, { rejectWithValue }) => {
//     try {
//       const response = await apiClient.post(
//         '/method/devx.center_management.doctype.center.center.delete_associate_team_member',
//         payload,
//       );
//       return response.data;
//     } catch (error) {
//       return rejectWithValue(error.response?.data || error.message);
//     }
//   },
// );

export const removeBuildingDetailsDocumentThunk = createAsyncThunk(
  'center/removeBuildingDetailsDocument',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.center_management.doctype.center.center.delete_building_detail',
        payload,
      );
      // console.log('response.data', response.data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const getCenterSpaces = createAsyncThunk(
  'center/getCenterSpaces',
  async (centerId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/resource/Space', {
        params: {
          fields: JSON.stringify([
            'name',
            'floor',
            'inventory_type',
            'status',
            'no_of_seats',
            'expected_per_seat_cost',
            'center',
          ]),
          filters: JSON.stringify([['center', '=', centerId]]),
        },
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const deleteCenterSpaceThunk = createAsyncThunk(
  'center/deleteCenterSpace',
  async (space_id, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/resource/Space/${space_id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const updateCenterSpaceThunk = createAsyncThunk(
  'center/updateCenterSpace',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/resource/Space/${id}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

// export const getCenterSpaceDetails = createAsyncThunk(
//   'center/getCenterSpaceDetails',
//   async (spaces_ids, { rejectWithValue }) => {
//     try {
//       let data = [];
//       for (let i = 0; i < spaces_ids.length; i++) {
//         const response = await apiClient.get(`/resource/Space/${spaces_ids[i]}`);
//         data.push(response.data);
//       }
//       console.log('data', data);
//       return data;
//     } catch (error) {
//       return rejectWithValue(error.response?.data || error.message);
//     }
//   },
// )

export const fetchTeamForCenterThunk = createAsyncThunk(
  'center/fetchTeamForCenter',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.team_management.api.team_member.center_team_members',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.serialize || error);
    }
  },
);

export const unlinkCenterTeamMemberThunk = createAsyncThunk(
  'center/unlinkCenterTeamMember',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(
        '/method/devx.team_management.api.team_member.unlink_center_team_member',
        payload,
      );
      return response.data.message.members;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error?.message || error);
    }
  },
);

export const fetchRoleTeamMemberListThunk = createAsyncThunk(
  'center/fetchRoleTeamMemberList',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.team_management.api.team_member.get_team_members_by_role',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const linkCenterTeamMemberThunk = createAsyncThunk(
  'center/linkCenterTeamMember',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        '/method/devx.team_management.api.team_member.link_center_team_member',
        payload,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data || error.message);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Center Preboarding Tasks (record-scoped tasks for Center detail page)
// ─────────────────────────────────────────────────────────────────────────────

export const fetchCenterPreboardingTasks = createAsyncThunk(
  'center/fetchCenterPreboardingTasks',
  async (
    {
      center,
      search = '',
      order_by = 'creation desc',
      page = 1,
      page_size = 20,
      append = false,
      filters = {},
    },
    { rejectWithValue },
  ) => {
    if (!center) return rejectWithValue('Center is required');
    try {
      const payload = {
        task_type: 'Center Preboarding',
        custom_ref_doctype: 'Center',
        custom_ref_docname: center,
        page,
        page_size,
      };
      if (search?.trim()) payload.search = search.trim();
      if (order_by) payload.order_by = order_by;
      if (filters && Object.keys(filters).length > 0) {
        payload.filters = JSON.stringify(filters);
      }

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
      const totalTasks = Number(msg?.total_tasks ?? totalCount ?? 0) || 0;
      const completedTasks = Number(msg?.completed_tasks ?? 0) || 0;
      const completedPercentage = Number(msg?.completed_percentage ?? 0) || 0;
      const hasMore =
        msg?.has_more != null
          ? Boolean(msg.has_more)
          : totalPages > 0
            ? apiPage < totalPages
            : totalTasks > 0
              ? apiPage * apiPageSize < totalTasks
              : safeResults.length >= apiPageSize;

      return {
        results: safeResults,
        append,
        page: apiPage,
        page_size: apiPageSize,
        total_pages: totalPages,
        total_count: totalCount,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        completed_percentage: completedPercentage,
        has_more: hasMore,
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to fetch center preboarding tasks',
      );
    }
  },
);

export const createCenterTask = createAsyncThunk(
  'center/createCenterTask',
  async ({ taskData, attachments = [] }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      Object.keys(taskData || {}).forEach((key) => {
        if (key === 'reference_doctype' || key === 'reference_doc_name') return;
        const val = taskData[key];
        if (val !== null && val !== undefined) {
          formData.append(key, Array.isArray(val) ? JSON.stringify(val) : val);
        }
      });

      if (!formData.has('custom_ref_doctype')) {
        const refDoctype = taskData?.custom_ref_doctype || taskData?.reference_doctype;
        if (refDoctype) formData.append('custom_ref_doctype', refDoctype);
      }
      if (!formData.has('custom_ref_docname')) {
        const refName = taskData?.custom_ref_docname || taskData?.reference_doc_name;
        if (refName) formData.append('custom_ref_docname', refName);
      }

      attachments.forEach((file) => {
        if (file?.file) formData.append('attachments', file.file);
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

export const fetchCenterTaskDetail = createAsyncThunk(
  'center/fetchCenterTaskDetail',
  async ({ task_id, task_type, subject, type }, { rejectWithValue }) => {
    const resolvedTaskId = task_id ?? subject;
    const resolvedTaskType = task_type ?? type;
    if (!resolvedTaskId || !resolvedTaskType) {
      return rejectWithValue('task_id and task_type are required');
    }
    try {
      const response = await apiClient.post(
        '/method/devx.dev_x.api.document_task.get_task_detailed_view',
        { task_id: resolvedTaskId, task_type: resolvedTaskType },
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

export const fetchCenterTaskComments = createAsyncThunk(
  'center/fetchCenterTaskComments',
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

export const addCenterTaskComment = createAsyncThunk(
  'center/addCenterTaskComment',
  async ({ taskName, content, attachments = [], parentCommentId = null }, { rejectWithValue }) => {
    const hasContent = content != null && String(content).trim().length > 0;
    const hasAttachments = attachments && attachments.length > 0;
    if (!taskName) return rejectWithValue('Task name is required');
    if (!hasContent && !hasAttachments)
      return rejectWithValue('Comment text or at least one attachment is required');
    try {
      const formData = new FormData();
      formData.append('task', taskName);
      formData.append('content', content ?? '');
      if (parentCommentId != null && String(parentCommentId).trim() !== '') {
        formData.append('parent_comment', String(parentCommentId).trim());
      }
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

export const assignCenterTask = createAsyncThunk(
  'center/assignCenterTask',
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

export const removeCenterTaskAssignments = createAsyncThunk(
  'center/removeCenterTaskAssignments',
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

export const updateCenterTaskField = createAsyncThunk(
  'center/updateCenterTaskField',
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
          await dispatch(assignCenterTask({ name: taskName, assign_to: toAdd })).unwrap();
        }
        if (toRemove.length > 0) {
          await dispatch(
            removeCenterTaskAssignments({ name: taskName, assignees: toRemove }),
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

export const fetchCenterTaskColumnList = createAsyncThunk(
  'center/fetchCenterTaskColumnList',
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

export const updateCenterTaskColumnList = createAsyncThunk(
  'center/updateCenterTaskColumnList',
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

export const fetchCenterOccupancyColumnList = createAsyncThunk(
  'center/fetchCenterOccupancyColumnList',
  async ({ react_table_id = 'center occupancy history' } = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: { doctype: 'Center', react_table_id },
      });
      return response?.data?.message;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

export const updateCenterOccupancyColumnList = createAsyncThunk(
  'center/updateCenterOccupancyColumnList',
  async ({ react_table_id = 'center occupancy history', columns }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: 'Center',
        react_table_id,
        columns,
      });
      return response?.data?.message;
    } catch (error) {
      return rejectWithValue(error.serialized || error);
    }
  },
);

/* --------------------------- SLICE --------------------------- */

const centerSlice = createSlice({
  name: 'center',
  initialState,
  reducers: {
    setFilterDrawer: (state) => {
      state.filterDrawer.isOpen = !state.filterDrawer.isOpen;
    },

    setCreateCenterDrawer: (state, action) => {
      state.createCenterDrawer.isOpen =
        typeof action.payload === 'boolean' ? action.payload : !state.createCenterDrawer.isOpen;
    },

    setViewCenterDrawer: (state, action) => {
      if (typeof action.payload === 'boolean') {
        state.viewCenterDrawer.isOpen = action.payload;
        if (!action.payload) state.viewCenterDrawer.selectedCenter = null;
      } else if (action.payload?.center) {
        state.viewCenterDrawer.isOpen = true;
        state.viewCenterDrawer.selectedCenter = action.payload.center;
      } else {
        state.viewCenterDrawer.isOpen = !state.viewCenterDrawer.isOpen;
        if (!state.viewCenterDrawer.isOpen) state.viewCenterDrawer.selectedCenter = null;
      }
    },

    setAddLandlordModal: (state, action) => {
      state.addLandlordModal.isOpen =
        typeof action.payload === 'boolean' ? action.payload : !state.addLandlordModal.isOpen;
    },

    setAddTeamMemberModal: (state, action) => {
      state.addTeamMemberModal.isOpen =
        typeof action.payload === 'boolean' ? action.payload : !state.addTeamMemberModal.isOpen;
    },

    setCreateTeamMemberModal: (state, action) => {
      state.createTeamMemberModal.isOpen =
        typeof action.payload === 'boolean' ? action.payload : !state.createTeamMemberModal.isOpen;
    },

    setEditTeamMemberModal: (state, action) => {
      if (typeof action.payload === 'boolean') {
        state.editTeamMemberModal.isOpen = action.payload;
        if (!action.payload) state.editTeamMemberModal.selectedTeamMember = null;
      } else if (action.payload?.teamMember) {
        state.editTeamMemberModal.isOpen = true;
        state.editTeamMemberModal.selectedTeamMember = action.payload.teamMember;
      } else {
        state.editTeamMemberModal.isOpen = !state.editTeamMemberModal.isOpen;
        if (!state.editTeamMemberModal.isOpen) {
          state.editTeamMemberModal.selectedTeamMember = null;
        }
      }
    },

    setAddComplianceDocumentModal: (state, action) => {
      state.addComplianceDocumentModal.isOpen =
        typeof action.payload === 'boolean'
          ? action.payload
          : !state.addComplianceDocumentModal.isOpen;
    },

    setEditComplianceDocumentModal: (state, action) => {
      if (typeof action.payload === 'boolean') {
        state.editComplianceDocumentModal.isOpen = action.payload;
        if (!action.payload) state.editComplianceDocumentModal.selectedDocument = null;
      } else if (action.payload?.document) {
        state.editComplianceDocumentModal.isOpen = true;
        state.editComplianceDocumentModal.selectedDocument = action.payload.document;
      } else {
        state.editComplianceDocumentModal.isOpen = !state.editComplianceDocumentModal.isOpen;
        if (!state.editComplianceDocumentModal.isOpen)
          state.editComplianceDocumentModal.selectedDocument = null;
      }
    },

    setRemoveComplianceDocumentModal: (state, action) => {
      if (typeof action.payload === 'boolean') {
        state.removeComplianceDocumentModal.isOpen = action.payload;
        if (!action.payload) state.removeComplianceDocumentModal.selectedDocument = null;
      } else if (action.payload?.document) {
        state.removeComplianceDocumentModal.isOpen = true;
        state.removeComplianceDocumentModal.selectedDocument = action.payload.document;
      } else {
        state.removeComplianceDocumentModal.isOpen = !state.removeComplianceDocumentModal.isOpen;
        if (!state.removeComplianceDocumentModal.isOpen)
          state.removeComplianceDocumentModal.selectedDocument = null;
      }
    },

    /* merged from main branch */
    setSelectedCenters: (state, action) => {
      const selection = Array.isArray(action.payload) ? action.payload : [];
      state.centerAccess.selectedCenters = [...new Set(selection)];
    },

    // Center task helpers
    setCenterSelectedTask: (state, action) => {
      state.selectedTask.taskId = action.payload?.taskId ?? null;
      state.selectedTask.taskType = action.payload?.taskType ?? null;
    },
    clearCenterSelectedTask: (state) => {
      state.selectedTask.taskId = null;
      state.selectedTask.taskType = null;
      state.taskDetail = { data: null, isLoading: false, error: null };
    },
    updateCenterTaskInList: (state, action) => {
      const { taskData } = action.payload || {};
      if (!taskData?.name) return;
      const idx = state.preboardingTasks.data.findIndex((t) => t.name === taskData.name);
      if (idx !== -1) {
        const prevTask = state.preboardingTasks.data[idx] || {};
        const nextTask = { ...prevTask, ...taskData };

        const normalizeStatus = (s) => (s ? String(s).trim().toLowerCase() : '');
        const isCompletedStatus = (s) => {
          const status = normalizeStatus(s);
          return status === 'completed' || status === 'closed';
        };

        // If status toggles across completed/non-completed boundary, update summary counters
        if (Object.prototype.hasOwnProperty.call(taskData, 'status')) {
          const wasCompleted = isCompletedStatus(prevTask.status);
          const isCompleted = isCompletedStatus(nextTask.status);
          if (wasCompleted !== isCompleted) {
            const currentCompleted = Number(state.preboardingTasks.completed_tasks || 0) || 0;
            const total = Number(state.preboardingTasks.total_tasks || 0) || 0;
            const updatedCompleted = Math.max(0, currentCompleted + (isCompleted ? 1 : -1));
            state.preboardingTasks.completed_tasks = updatedCompleted;
            if (total > 0) {
              state.preboardingTasks.completed_percentage = Math.round(
                (updatedCompleted / total) * 100,
              );
            }
          }
        }

        state.preboardingTasks.data[idx] = nextTask;
      }
    },
  },

  extraReducers: (builder) => {
    /* createCenter */
    builder
      .addCase(createCenterThunk.pending, (state) => {
        state.createCenterDrawer.isLoading = true;
        state.createCenterDrawer.error = null;
        state.createCenterDrawer.status = null;
      })
      .addCase(createCenterThunk.fulfilled, (state, action) => {
        state.createCenterDrawer.isLoading = false;
        state.createCenterDrawer.status = action.payload?.status || 'success';
      })
      .addCase(createCenterThunk.rejected, (state, action) => {
        state.createCenterDrawer.isLoading = false;
        state.createCenterDrawer.error = action.payload;
      });

    /* updateCenter */
    builder.addCase(updateCenterThunk.fulfilled, (state, action) => {
      const centerId = action.meta?.arg?.center_id;
      const patch = action.payload?.data ?? action.meta?.arg?.payload;
      if (!centerId || !patch || typeof patch !== 'object') return;

      const centerListIndex = state.centerListData.data?.findIndex(
        (centerItem) => centerItem.name === centerId,
      );
      if (centerListIndex >= 0) {
        state.centerListData.data[centerListIndex] = {
          ...state.centerListData.data[centerListIndex],
          ...patch,
        };
      }

      // Keep list-view / navbar center labels in sync (Space, Agreements, VMS, etc.).
      const centerLabelSync = getCenterLabelSyncFromUpdateAction(action);
      if (!centerLabelSync) return;

      const centerAccessIndex = state.centerAccess.data?.findIndex(
        (centerItem) => centerItem.name === centerId,
      );
      if (centerAccessIndex < 0) return;

      if (
        centerLabelSync.updatedCenterName != null &&
        state.centerAccess.data[centerAccessIndex].center_name !== centerLabelSync.updatedCenterName
      ) {
        state.centerAccess.data[centerAccessIndex].center_name = centerLabelSync.updatedCenterName;
      }
      if (
        centerLabelSync.updatedZone != null &&
        state.centerAccess.data[centerAccessIndex].zone !== centerLabelSync.updatedZone
      ) {
        state.centerAccess.data[centerAccessIndex].zone = centerLabelSync.updatedZone;
      }
    });

    /* Center List */
    builder
      .addCase(getCenterListThunk.pending, (state, action) => {
        const isAppend = Boolean(action.meta?.arg?.append);
        state.centerListData.status = 'loading';
        state.centerListData.error = null;
        if (isAppend) {
          state.centerListData.isLoadingMore = true;
        } else {
          state.centerListData.isLoading = true;
        }
      })
      .addCase(getCenterListThunk.fulfilled, (state, { payload }) => {
        state.centerListData.isLoading = false;
        state.centerListData.isLoadingMore = false;
        state.centerListData.status = 'succeeded';
        state.centerListData.error = null;

        const {
          results,
          page,
          pageSize,
          append,
          hasMore,
          totalCount,
          totalCountExcludingStatus,
          current_count,
          statusCounts,
        } = payload;

        // Update pagination state
        if (page !== undefined) {
          state.centerListData.page = page;
        }
        if (pageSize !== undefined) {
          state.centerListData.pageSize = pageSize;
        }
        // Update hasMore - for non-append operations, use the hasMore from payload
        // For append operations, hasMore is recalculated above based on actual data
        if (!append && hasMore !== undefined) {
          state.centerListData.hasMore = hasMore;
        } else if (!append) {
          // Fallback: calculate hasMore if not provided
          const dataLength = Array.isArray(results) ? results.length : 0;
          state.centerListData.hasMore = dataLength === pageSize && dataLength < totalCount;
        }
        if (totalCount !== undefined) {
          state.centerListData.totalCount = totalCount;
        }
        // `totalCountExcludingStatus` powers the "All" tab badge so it stays
        // stable when switching between status tabs (the active tab's status
        // clause is stripped server-side before this count is computed).
        // Skip on append so a load-more inside a non-All tab doesn't clobber
        // the stable value with a pagination-scoped figure.
        if (!append && totalCountExcludingStatus !== undefined) {
          state.centerListData.totalCountExcludingStatus = totalCountExcludingStatus;
        }
        // Only update statusCounts if it's provided (not on append operations)
        if (statusCounts && Object.keys(statusCounts).length > 0 && !append) {
          state.centerListData.statusCounts = statusCounts;
        }

        // Handle append logic for scroll pagination
        if (append && Array.isArray(results)) {
          // Append new results to existing results, avoiding duplicates
          const existingData = state.centerListData.data || [];
          const existingIds = new Set(existingData.map((item) => item.name || item.id));
          const newResults = results.filter((item) => !existingIds.has(item.name || item.id));
          state.centerListData.data = [...existingData, ...newResults];

          // Recalculate hasMore based on current_count from API response
          // This is the most accurate way as it uses the API's calculation
          if (current_count !== undefined && totalCount !== undefined) {
            // Use API's current_count if provided (calculated as: (page - 1) * page_size + count)
            state.centerListData.hasMore = current_count < totalCount;
          } else if (hasMore === undefined) {
            // Final fallback: calculate from data length
            const calculatedCurrentCount = state.centerListData.data.length;
            state.centerListData.hasMore = calculatedCurrentCount < totalCount;
          } else {
            // Fallback to hasMore from payload if current_count not available
            state.centerListData.hasMore = hasMore;
          }
        } else {
          // Replace data for new search/filter
          if (Array.isArray(results)) {
            state.centerListData.data = results;
          } else if (Array.isArray(payload)) {
            state.centerListData.data = payload;
          } else if (payload?.message?.results) {
            state.centerListData.data = payload.message.results;
          } else if (Array.isArray(payload?.message)) {
            state.centerListData.data = payload.message;
          } else if (Array.isArray(payload?.data)) {
            state.centerListData.data = payload.data;
          } else {
            state.centerListData.data = [];
          }
        }
      })
      .addCase(getCenterListThunk.rejected, (state, action) => {
        state.centerListData.isLoading = false;
        state.centerListData.isLoadingMore = false;
        state.centerListData.status = 'failed';
        state.centerListData.error = action.payload;
      });

    /* Column Pref */
    builder
      .addCase(getCenterColumnPreferencesThunk.pending, (state) => {
        state.columnPreferences.isLoading = true;
      })
      .addCase(getCenterColumnPreferencesThunk.fulfilled, (state, { payload }) => {
        state.columnPreferences.isLoading = false;
        if (Array.isArray(payload)) {
          state.columnPreferences.data = payload;
        } else if (Array.isArray(payload?.message)) {
          state.columnPreferences.data = payload.message;
        } else if (Array.isArray(payload?.data)) {
          state.columnPreferences.data = payload.data;
        } else {
          state.columnPreferences.data = [];
        }
      })
      .addCase(getCenterColumnPreferencesThunk.rejected, (state, action) => {
        state.columnPreferences.isLoading = false;
        state.columnPreferences.error = action.payload;
      });

    /* Center Details */
    builder
      .addCase(getCenterDetailsThunk.pending, (state) => {
        state.centerDetails.isLoading = true;
      })
      .addCase(getCenterDetailsThunk.fulfilled, (state, action) => {
        state.centerDetails.isLoading = false;
        // New API returns center details directly in action.payload (which is response.data.message)
        state.centerDetails.data = action.payload;
      })
      .addCase(getCenterDetailsThunk.rejected, (state, action) => {
        state.centerDetails.isLoading = false;
        state.centerDetails.error = action.payload;
      });

    /* Center Allocated Clients */
    builder
      .addCase(getCenterAllocatedClientsThunk.pending, (state) => {
        state.centerAllocatedClients.isLoading = true;
        state.centerAllocatedClients.error = null;
      })
      .addCase(getCenterAllocatedClientsThunk.fulfilled, (state, action) => {
        state.centerAllocatedClients.isLoading = false;
        state.centerAllocatedClients.data = Array.isArray(action.payload?.results)
          ? action.payload.results
          : [];
      })
      .addCase(getCenterAllocatedClientsThunk.rejected, (state, action) => {
        state.centerAllocatedClients.isLoading = false;
        state.centerAllocatedClients.error = action.payload;
        state.centerAllocatedClients.data = [];
      });

    /* Center building documents (Documents tab list — server filters) */
    builder
      .addCase(fetchCenterBuildingDocumentsThunk.pending, (state, action) => {
        state.centerBuildingDocuments.isLoading = true;
        state.centerBuildingDocuments.error = null;
        const nextId = action.meta?.arg?.center_id;
        if (nextId && nextId !== state.centerBuildingDocuments.centerId) {
          state.centerBuildingDocuments.centerId = nextId;
          state.centerBuildingDocuments.documents = [];
          state.centerBuildingDocuments.total = 0;
          state.centerBuildingDocuments.totalUnfiltered = 0;
        }
      })
      .addCase(fetchCenterBuildingDocumentsThunk.fulfilled, (state, action) => {
        state.centerBuildingDocuments.isLoading = false;
        state.centerBuildingDocuments.error = null;
        state.centerBuildingDocuments.centerId = action.payload.center_id ?? null;
        state.centerBuildingDocuments.documents = action.payload.documents || [];
        state.centerBuildingDocuments.total =
          typeof action.payload.total === 'number'
            ? action.payload.total
            : (action.payload.documents?.length ?? 0);
        state.centerBuildingDocuments.totalUnfiltered =
          typeof action.payload.total_unfiltered === 'number'
            ? action.payload.total_unfiltered
            : (action.payload.documents?.length ?? 0);
      })
      .addCase(fetchCenterBuildingDocumentsThunk.rejected, (state, action) => {
        state.centerBuildingDocuments.isLoading = false;
        state.centerBuildingDocuments.error = action.payload;
        state.centerBuildingDocuments.documents = [];
      });

    /* Parking floors (center about tab) */
    builder
      .addCase(getParkingFloorDetailsThunk.pending, (state) => {
        state.parkingFloors.isLoading = true;
        state.parkingFloors.error = null;
      })
      .addCase(getParkingFloorDetailsThunk.fulfilled, (state, action) => {
        state.parkingFloors.isLoading = false;
        state.parkingFloors.centerId = action.payload.center;
        state.parkingFloors.data = action.payload.rows;
      })
      .addCase(getParkingFloorDetailsThunk.rejected, (state, action) => {
        state.parkingFloors.isLoading = false;
        state.parkingFloors.error = action.payload;
      });

    builder
      .addCase(getCenterBillingMonthlySummaryThunk.pending, (state, action) => {
        const append = Boolean(action.meta?.arg?.append);
        state.centerBillingMonthlySummary.error = null;
        if (append) state.centerBillingMonthlySummary.isLoadingMore = true;
        else state.centerBillingMonthlySummary.isLoading = true;
      })
      .addCase(getCenterBillingMonthlySummaryThunk.fulfilled, (state, action) => {
        const msg = action.payload || {};
        const append = Boolean(msg.append);
        state.centerBillingMonthlySummary.isLoading = false;
        state.centerBillingMonthlySummary.isLoadingMore = false;
        state.centerBillingMonthlySummary.center = msg.center ?? null;
        state.centerBillingMonthlySummary.page = Number(msg.page) || 1;
        state.centerBillingMonthlySummary.limit = Number(msg.limit) || 12;
        state.centerBillingMonthlySummary.hasMore = Boolean(msg.has_more);
        const rows = Array.isArray(msg.rows) ? msg.rows : [];
        state.centerBillingMonthlySummary.rows = append
          ? [...state.centerBillingMonthlySummary.rows, ...rows]
          : rows;
      })
      .addCase(getCenterBillingMonthlySummaryThunk.rejected, (state, action) => {
        state.centerBillingMonthlySummary.isLoading = false;
        state.centerBillingMonthlySummary.isLoadingMore = false;
        state.centerBillingMonthlySummary.error = action.payload;
      });

    /* Center Access */
    builder
      .addCase(fetchCenterAccess.pending, (state, action) => {
        const silent = action.meta?.arg?.silent || false;
        if (!silent) {
          state.centerAccess.status = 'loading';
        }
      })
      .addCase(fetchCenterAccess.fulfilled, (state, action) => {
        try {
          const silent = action.meta?.arg?.silent || false;
          const { centers, isAllCenter } = action.payload ?? {};
          if (!silent) {
            state.centerAccess.status = 'succeeded';
          }
          const allSelected =
            state.centerAccess.selectedCenters.length === state.centerAccess.data.length;
          state.centerAccess.data = centers || [];
          state.centerAccess.isAllCenter = isAllCenter ?? true;

          if (state.centerAccess.selectedCenters.length === 0 || allSelected) {
            const all = (centers || []).map((c) => c?.name).filter(Boolean);
            state.centerAccess.selectedCenters = [...new Set(all)];
          }
        } catch (error) {
          console.error(error);
        }
      })
      .addCase(fetchCenterAccess.rejected, (state, action) => {
        const silent = action.meta?.arg?.silent || false;
        if (!silent) {
          state.centerAccess.status = 'failed';
          state.centerAccess.error = action.payload;
        }
      });

    /* Document Types */
    builder
      .addCase(fetchCenterDocumentTypesThunk.pending, (state) => {
        state.documentTypes.isLoading = true;
        state.documentTypes.error = null;
      })
      .addCase(fetchCenterDocumentTypesThunk.fulfilled, (state, action) => {
        state.documentTypes.isLoading = false;
        state.documentTypes.data = action.payload || [];
        state.documentTypes.error = null;
      })
      .addCase(fetchCenterDocumentTypesThunk.rejected, (state, action) => {
        state.documentTypes.isLoading = false;
        state.documentTypes.error = action.payload;
        state.documentTypes.data = [];
      });

    /* Add Compliance Document */
    builder
      .addCase(uploadBuildingDetailsThunk.pending, (state) => {
        state.complianceDocument.isLoading = true;
      })
      .addCase(uploadBuildingDetailsThunk.fulfilled, (state, action) => {
        state.complianceDocument.isLoading = false;
        state.complianceDocument.status = action.payload?.status || 'success';
      })
      .addCase(uploadBuildingDetailsThunk.rejected, (state, action) => {
        state.complianceDocument.isLoading = false;
        state.complianceDocument.error = action.payload;
      });

    /* Team Associated */
    builder
      .addCase(getTeamAssociatedRoleListThunk.pending, (state) => {
        state.teamAssociated.roleList.isLoading = true;
      })
      .addCase(getTeamAssociatedRoleListThunk.fulfilled, (state, action) => {
        // console.log('action in fulfilled of getTeamAssociatedRoleListThunk', action.payload);
        state.teamAssociated.roleList.isLoading = false;
        state.teamAssociated.roleList.data = action.payload;
      })
      .addCase(getTeamAssociatedRoleListThunk.rejected, (state, action) => {
        state.teamAssociated.roleList.isLoading = false;
        state.teamAssociated.roleList.error = action.payload;
      });

    /* Associated Team Members */
    builder
      .addCase(getAssociatedTeamMembersListThunk.pending, (state) => {
        state.teamAssociated.teamMemberList.isLoading = true;
      })
      .addCase(getAssociatedTeamMembersListThunk.fulfilled, (state, action) => {
        // console.log('action in fulfilled of getAssociatedTeamMembersListThunk', action.payload);
        state.teamAssociated.teamMemberList.isLoading = false;
        state.teamAssociated.teamMemberList.data = action.payload?.message || action.payload;
      })
      .addCase(getAssociatedTeamMembersListThunk.rejected, (state, action) => {
        state.teamAssociated.teamMemberList.isLoading = false;
        state.teamAssociated.teamMemberList.error = action.payload;
      });

    /* Create Associated Team Member */
    builder
      .addCase(createAssociatedTeamMemberThunk.pending, (state) => {
        state.teamAssociated.createAssociatedTeamMember.isLoading = true;
      })
      .addCase(createAssociatedTeamMemberThunk.fulfilled, (state, action) => {
        // console.log('action in fulfilled of createAssociatedTeamMemberThunk', action.payload);
        state.teamAssociated.createAssociatedTeamMember.isLoading = false;
      })
      .addCase(createAssociatedTeamMemberThunk.rejected, (state, action) => {
        state.teamAssociated.createAssociatedTeamMember.isLoading = false;
        state.teamAssociated.createAssociatedTeamMember.error = action.payload;
      });

    builder
      .addCase(getCenterSpaces.pending, (state) => {
        state.viewCenterSpace.spaces.isLoading = true;
      })
      .addCase(getCenterSpaces.fulfilled, (state, action) => {
        state.viewCenterSpace.spaces.isLoading = false;
        state.viewCenterSpace.spaces.data = action.payload;
      })
      .addCase(getCenterSpaces.rejected, (state, action) => {
        state.viewCenterSpace.spaces.isLoading = false;
        state.viewCenterSpace.spaces.error = action.payload;
      });

    builder
      .addCase(fetchTeamForCenterThunk.pending, (state) => {
        state.centerTeamAssociated.isLoading = true;
      })
      .addCase(fetchTeamForCenterThunk.fulfilled, (state, action) => {
        // console.log('action in fulfilled of fetchTeamForCenterThunk', action.payload);
        state.centerTeamAssociated.isLoading = false;
        state.centerTeamAssociated.data = action.payload || action.payload?.message;
      })
      .addCase(fetchTeamForCenterThunk.rejected, (state, action) => {
        state.centerTeamAssociated.isLoading = false;
        state.centerTeamAssociated.error = action.payload;
      });

    // ── Center Preboarding Tasks ────────────────────────────────────────────
    builder
      .addCase(fetchCenterPreboardingTasks.pending, (state, action) => {
        const append = Boolean(action.meta?.arg?.append);
        if (append) {
          state.preboardingTasks.isLoadingMore = true;
        } else {
          state.preboardingTasks.isLoading = true;
          state.preboardingTasks.data = [];
          state.preboardingTasks.page = 1;
          state.preboardingTasks.has_more = false;
        }
        state.preboardingTasks.error = null;
      })
      .addCase(fetchCenterPreboardingTasks.fulfilled, (state, action) => {
        state.preboardingTasks.isLoading = false;
        state.preboardingTasks.isLoadingMore = false;
        state.preboardingTasks.error = null;

        const payload = action.payload;
        const append = Boolean(payload?.append);
        const incoming = Array.isArray(payload?.results)
          ? payload.results
          : Array.isArray(payload)
            ? payload
            : [];
        state.preboardingTasks.data = append
          ? [...(state.preboardingTasks.data || []), ...incoming]
          : incoming;
        state.preboardingTasks.page = Number(payload?.page ?? 1) || 1;
        state.preboardingTasks.page_size = Number(payload?.page_size ?? 20) || 20;
        state.preboardingTasks.total_pages = Number(payload?.total_pages ?? 0) || 0;
        state.preboardingTasks.total_count = Number(payload?.total_count ?? 0) || 0;
        state.preboardingTasks.total_tasks =
          Number(payload?.total_tasks ?? payload?.total_count ?? 0) || 0;
        state.preboardingTasks.completed_tasks = Number(payload?.completed_tasks ?? 0) || 0;
        state.preboardingTasks.completed_percentage =
          Number(payload?.completed_percentage ?? 0) || 0;
        state.preboardingTasks.has_more = Boolean(payload?.has_more);
      })
      .addCase(fetchCenterPreboardingTasks.rejected, (state, action) => {
        state.preboardingTasks.isLoading = false;
        state.preboardingTasks.isLoadingMore = false;
        state.preboardingTasks.error = action.payload;
        const wasAppend = Boolean(action.meta?.arg?.append);
        if (!wasAppend) state.preboardingTasks.data = [];
      });

    // ── Center Task Detail / Comments ───────────────────────────────────────
    builder
      .addCase(fetchCenterTaskDetail.pending, (state) => {
        state.taskDetail.isLoading = true;
        state.taskDetail.error = null;
      })
      .addCase(fetchCenterTaskDetail.fulfilled, (state, action) => {
        state.taskDetail.isLoading = false;
        state.taskDetail.data = action.payload;
        state.taskDetail.error = null;
      })
      .addCase(fetchCenterTaskDetail.rejected, (state, action) => {
        state.taskDetail.isLoading = false;
        state.taskDetail.error = action.payload;
        state.taskDetail.data = null;
      });

    builder
      .addCase(fetchCenterTaskComments.pending, (state) => {
        state.taskComments.isLoading = true;
        state.taskComments.error = null;
      })
      .addCase(fetchCenterTaskComments.fulfilled, (state, action) => {
        state.taskComments.isLoading = false;
        state.taskComments.data = action.payload;
        state.taskComments.error = null;
      })
      .addCase(fetchCenterTaskComments.rejected, (state, action) => {
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

    builder
      .addCase(fetchCenterTaskColumnList.pending, (state) => {
        state.taskColumnList = null;
      })
      .addCase(fetchCenterTaskColumnList.fulfilled, (state, action) => {
        state.taskColumnList = action.payload;
      })
      .addCase(fetchCenterTaskColumnList.rejected, (state) => {
        state.taskColumnList = null;
      });

    builder.addCase(updateCenterTaskColumnList.rejected, (state) => {
      state.taskColumnList = null;
    });

    builder.addCase(updateCenterTaskField.fulfilled, (state, action) => {
      if (state.taskDetail.data && action.payload) {
        const updatedTask = action.payload?.data || action.payload;
        state.taskDetail.data = { ...state.taskDetail.data, ...updatedTask };
      }
    });
  },
});

export const {
  setFilterDrawer,
  setCreateCenterDrawer,
  setViewCenterDrawer,
  setAddLandlordModal,
  setAddTeamMemberModal,
  setCreateTeamMemberModal,
  setEditTeamMemberModal,
  setAddComplianceDocumentModal,
  setEditComplianceDocumentModal,
  setRemoveComplianceDocumentModal,
  setSelectedCenters,
  setCenterSelectedTask,
  clearCenterSelectedTask,
  updateCenterTaskInList,
} = centerSlice.actions;

export default centerSlice.reducer;

export const selectCenterAccess = (state) =>
  state.center?.centerAccess || initialState.centerAccess;
