import apiClient from '@/api/axios';
import { fetchBoqTemplateList } from '@/api/boqTemplates';
import {
  BOQ_TEMPLATE_STATUS,
  PROJECT_BOQS_COLUMN_CONFIG_TABLE_ID,
} from '@/components/boq/constants';
import { extractErrorMessage } from '@/utils/error-utils';

const FAMILY_API_BASE = '/method/devx.boq.api.api_project_boq_family';
const CHILD_API_BASE = '/method/devx.boq.api.api_project_boq';
const PRODUCTS_API_BASE = '/method/devx.boq.api.api_project_boq_products';
const VERSIONS_API_BASE = '/method/devx.boq.api.api_project_boq_versions';
const LIST_PREF_DOCTYPE = 'Project BOQ Family';

const LIST_PATH = `${FAMILY_API_BASE}.get_project_boq_family_listview`;
const GET_FAMILY_PATH = `${FAMILY_API_BASE}.get_project_boq_family`;
const CREATE_FAMILY_PATH = `${FAMILY_API_BASE}.create_project_boq_family`;
const GET_BY_PROJECT_PATH = `${FAMILY_API_BASE}.get_project_boq_family_by_project`;
const FILTER_OPTIONS_PATH = `${FAMILY_API_BASE}.get_project_boq_family_filter_options`;
const CLIENT_FILTER_OPTIONS_PATH = `${FAMILY_API_BASE}.get_project_boq_family_client_filter_options`;
const CLIENT_OPTIONS_PATH = `${FAMILY_API_BASE}.get_project_boq_client_options`;
const PROJECT_IDS_WITH_FAMILY_PATH = `${FAMILY_API_BASE}.get_project_ids_with_boq_family`;
const CREATE_CHILD_PATH = `${CHILD_API_BASE}.create_project_boq`;
const GET_CHILD_PATH = `${CHILD_API_BASE}.get_project_boq`;
const GET_PRODUCTS_PATH = `${PRODUCTS_API_BASE}.get_project_boq_products`;
const CREATE_PRODUCT_PATH = `${PRODUCTS_API_BASE}.create_project_boq_product`;
const UPDATE_PRODUCT_PATH = `${PRODUCTS_API_BASE}.update_project_boq_product`;
const DELETE_PRODUCT_PATH = `${PRODUCTS_API_BASE}.delete_project_boq_product`;
const PRODUCT_FILTER_OPTIONS_PATH = `${PRODUCTS_API_BASE}.get_project_boq_product_filter_options`;
const GET_VERSIONS_PATH = `${VERSIONS_API_BASE}.get_project_boq_versions`;
const CREATE_VERSION_PATH = `${VERSIONS_API_BASE}.create_project_boq_version`;
const UPDATE_VERSION_STATUS_PATH = `${VERSIONS_API_BASE}.update_project_boq_version_status`;
const ADD_PRODUCTS_PATH = `${PRODUCTS_API_BASE}.add_project_boq_products`;
const GET_FLOORS_PATH = `${PRODUCTS_API_BASE}.get_project_boq_floors`;
const GET_AREAS_PATH = `${PRODUCTS_API_BASE}.get_project_boq_areas`;
const OVERVIEW_API_BASE = '/method/devx.boq.api.api_project_boq_overview';
const GET_OVERVIEW_PATH = `${OVERVIEW_API_BASE}.get_project_boq_overview`;
const ESTIMATION_API_BASE = '/method/devx.boq.api.api_boq_estimation_record';
const INIT_ESTIMATION_DRAFT_PATH = `${ESTIMATION_API_BASE}.init_boq_estimation_draft`;
const GET_ESTIMATION_RECORDS_PATH = `${ESTIMATION_API_BASE}.get_boq_estimation_records`;
const ADD_ESTIMATION_RECORD_ITEM_PATH = `${ESTIMATION_API_BASE}.add_boq_estimation_record_item`;
const UPDATE_ESTIMATION_RECORD_ITEM_PATH = `${ESTIMATION_API_BASE}.update_boq_estimation_record_item`;
const DELETE_ESTIMATION_RECORD_ITEM_PATH = `${ESTIMATION_API_BASE}.delete_boq_estimation_record_item`;
const DUPLICATE_ESTIMATION_RECORD_ITEM_PATH = `${ESTIMATION_API_BASE}.duplicate_boq_estimation_record_item`;

const assertNoExc = (result) => {
  if (result?.exc_type) {
    throw new Error(extractErrorMessage({ payload: result }, 'Request failed.'));
  }
};

const unwrapMessage = (response) => {
  const result = response?.data;
  assertNoExc(result);
  return result?.message ?? result;
};

/**
 * List page — returns one row per BOQ family (BOQ-001, BOQ-002, …).
 */
export async function fetchProjectBoqList({
  keyword = '',
  filters = {},
  page = 1,
  pageSize = 20,
  orderBy = 'modified',
  orderDir = 'desc',
} = {}) {
  const response = await apiClient.post(LIST_PATH, {
    keyword: keyword || undefined,
    filters: Object.keys(filters).length > 0 ? JSON.stringify(filters) : undefined,
    page,
    page_size: pageSize,
    order_by: orderBy,
    order_dir: orderDir,
  });

  const msg = unwrapMessage(response);
  return {
    rows: Array.isArray(msg?.data) ? msg.data : [],
    totalCount: Number(msg?.total_count ?? 0),
    page: Number(msg?.page ?? page),
    pageSize: Number(msg?.page_size ?? pageSize),
    hasMore: Boolean(msg?.has_more),
  };
}

/** Detail page — family header + children (Main, Design, Additional). */
export async function fetchProjectBoq(code) {
  const response = await apiClient.post(GET_FAMILY_PATH, { code: String(code) });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

/** Create new family + first BOQ from listing (Main or Design). */
export async function createProjectBoq(payload) {
  const response = await apiClient.post(CREATE_FAMILY_PATH, payload);
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

/** Create Design / Additional child inside an existing family. */
export async function createProjectBoqChild(payload) {
  const response = await apiClient.post(CREATE_CHILD_PATH, payload);
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

export async function fetchProjectBoqChild(code) {
  const response = await apiClient.post(GET_CHILD_PATH, { code: String(code) });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

export async function fetchProjectBoqFamilyByProject(projectId) {
  const response = await apiClient.post(GET_BY_PROJECT_PATH, {
    project_id: String(projectId),
  });
  const msg = unwrapMessage(response);
  if (!msg) return null;
  return msg;
}

export async function fetchProjectBoqFilterOptions() {
  const response = await apiClient.post(FILTER_OPTIONS_PATH, {});
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

export async function fetchProjectBoqClientFilterOptions({
  search = '',
  page = 1,
  limit = 8,
} = {}) {
  const response = await apiClient.post(CLIENT_FILTER_OPTIONS_PATH, {
    search: search || undefined,
    page,
    limit,
  });
  const msg = unwrapMessage(response);
  return {
    options: Array.isArray(msg?.options) ? msg.options : [],
    page: Number(msg?.page ?? page),
    hasMore: Boolean(msg?.hasMore),
  };
}

export async function fetchProjectBoqListPref() {
  const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
    params: {
      doctype: LIST_PREF_DOCTYPE,
      react_table_id: PROJECT_BOQS_COLUMN_CONFIG_TABLE_ID,
    },
  });
  const message = response?.data?.message;
  if (!message || (Array.isArray(message) && message.length === 0)) {
    return null;
  }
  return message;
}

export async function saveProjectBoqListPref(columns) {
  const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
    doctype: LIST_PREF_DOCTYPE,
    react_table_id: PROJECT_BOQS_COLUMN_CONFIG_TABLE_ID,
    columns,
  });
  return response?.data?.message ?? { status: 'success' };
}

export async function fetchProjectBoqClientOptions() {
  const response = await apiClient.post(CLIENT_OPTIONS_PATH, {});
  const rawClients = unwrapMessage(response);
  if (!Array.isArray(rawClients)) {
    return [];
  }

  const seen = new Set();
  return rawClients
    .map((client) => ({
      value: String(client?.value ?? client?.name ?? '').trim(),
      label: String(
        client?.label ?? client?.customer_name ?? client?.value ?? client?.name ?? '',
      ).trim(),
    }))
    .filter((client) => {
      if (!client.value || seen.has(client.value)) return false;
      seen.add(client.value);
      return true;
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

export async function fetchProjectIdsWithBoqFamily() {
  const response = await apiClient.post(PROJECT_IDS_WITH_FAMILY_PATH, {});
  const msg = unwrapMessage(response);
  const ids = Array.isArray(msg?.projectIds) ? msg.projectIds : [];
  return ids.map((id) => String(id).trim()).filter(Boolean);
}

export async function fetchProjectBoqProjectOptions({
  clientId,
  crmAccountId,
  pageSize = 500,
  excludeProjectsWithBoq = true,
} = {}) {
  const resolvedClientId = String(clientId ?? crmAccountId ?? '').trim();
  const filters = resolvedClientId
    ? JSON.stringify([['customer', '=', resolvedClientId]])
    : JSON.stringify([]);

  const [listResponse, projectIdsWithFamily] = await Promise.all([
    apiClient.post('/method/devx.devx_project.api.projects.get_project_listview', {
      page: 1,
      limit_page_length: pageSize,
      order_by: 'modified desc',
      filters,
    }),
    excludeProjectsWithBoq ? fetchProjectIdsWithBoqFamily().catch(() => []) : Promise.resolve([]),
  ]);

  const apiResponse = unwrapMessage(listResponse);
  const rawResults = Array.isArray(apiResponse?.results) ? apiResponse.results : [];
  const excludedIds = new Set(projectIdsWithFamily);

  return rawResults
    .map((item) => ({
      value: item.name,
      label: item.project_name || item.name,
      clientId: item.customer || item.client || '',
    }))
    .filter((option) => !excludedIds.has(String(option.value ?? '').trim()));
}

export async function fetchProjectBoqTemplateOptions({ pageSize = 200 } = {}) {
  const { rows } = await fetchBoqTemplateList({
    filters: { status: [BOQ_TEMPLATE_STATUS.ACTIVE] },
    pageSize,
    orderBy: 'modified',
    orderDir: 'desc',
  });
  return rows.map((row) => ({
    value: row.code || row.id,
    label: row.templateName || row.code || row.id,
  }));
}

/** Project BOQ detail — grouped products for the active child BOQ. */
export async function fetchProjectBoqProducts(code, { keyword, filters, versionId } = {}) {
  const response = await apiClient.post(GET_PRODUCTS_PATH, {
    code: String(code),
    keyword: keyword || undefined,
    filters: filters && Object.keys(filters).length > 0 ? JSON.stringify(filters) : undefined,
    version_id: versionId || undefined,
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : { categories: [], summary: {} };
}

export async function fetchProjectBoqVersions(code) {
  const response = await apiClient.post(GET_VERSIONS_PATH, { code: String(code) });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : { versions: [], isLocked: false };
}

export async function updateProjectBoqVersionStatus(code, versionStatus) {
  const response = await apiClient.post(UPDATE_VERSION_STATUS_PATH, {
    code: String(code),
    version_status: String(versionStatus),
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

export async function createProjectBoqVersion(code, { copyFromVersionCode } = {}) {
  const response = await apiClient.post(CREATE_VERSION_PATH, {
    code: String(code),
    copy_from_version: copyFromVersionCode ? String(copyFromVersionCode) : undefined,
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

export async function fetchProjectBoqProductFilterOptions(code) {
  const response = await apiClient.post(PRODUCT_FILTER_OPTIONS_PATH, { code: String(code) });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

export async function fetchProjectBoqFloors(code, { projectId } = {}) {
  const response = await apiClient.post(GET_FLOORS_PATH, {
    code: code ? String(code) : undefined,
    project_id: projectId ? String(projectId) : undefined,
  });
  const msg = unwrapMessage(response);
  return {
    projectId: msg?.projectId || projectId || '',
    floors: Array.isArray(msg?.floors) ? msg.floors : [],
  };
}

export async function fetchProjectBoqAreas(code, { projectId } = {}) {
  const response = await apiClient.post(GET_AREAS_PATH, {
    code: code ? String(code) : undefined,
    project_id: projectId ? String(projectId) : undefined,
  });
  const msg = unwrapMessage(response);
  return {
    projectId: msg?.projectId || projectId || '',
    areas: Array.isArray(msg?.areas) ? msg.areas : [],
  };
}

/** Overview tab — master / client / internal cost estimation aggregates. */
export async function fetchProjectBoqOverview(code, { filterBoqCode, filterVersionCode } = {}) {
  const response = await apiClient.post(GET_OVERVIEW_PATH, {
    code: String(code),
    filter_boq_code: filterBoqCode ? String(filterBoqCode) : undefined,
    filter_version_code: filterVersionCode ? String(filterVersionCode) : undefined,
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

export async function createProjectBoqProduct(code, payload) {
  const response = await apiClient.post(CREATE_PRODUCT_PATH, {
    code: String(code),
    doc: JSON.stringify(payload),
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

export async function updateProjectBoqProduct(code, rowName, payload) {
  const response = await apiClient.post(UPDATE_PRODUCT_PATH, {
    code: String(code),
    row_name: String(rowName),
    doc: JSON.stringify(payload),
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

export async function deleteProjectBoqProduct(code, rowName) {
  const response = await apiClient.post(DELETE_PRODUCT_PATH, {
    code: String(code),
    row_name: String(rowName),
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : { status: 'success' };
}

/** Add multiple products (e.g. from product master) to a Project BOQ. */
export async function addProjectBoqProducts(code, products = []) {
  const response = await apiClient.post(ADD_PRODUCTS_PATH, {
    code: String(code),
    products: JSON.stringify(products),
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

const normalizeEstimationFloors = (floors = []) =>
  floors
    .map((floor) => {
      if (typeof floor === 'string') return floor.trim();
      return String(floor?.label || floor?.name || floor?.floor || '').trim();
    })
    .filter(Boolean);

/** Ensure one BOQ Estimation Record exists per project floor for a product row. */
export async function initBoqEstimationDraft(code, { rowName, erStatus, floors = [] } = {}) {
  const normalizedFloors = normalizeEstimationFloors(floors);
  const response = await apiClient.post(INIT_ESTIMATION_DRAFT_PATH, {
    code: String(code),
    row_name: String(rowName),
    er_status: erStatus || undefined,
    floors: normalizedFloors.length > 0 ? JSON.stringify(normalizedFloors) : undefined,
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

export async function fetchBoqEstimationRecords(code, rowName) {
  const response = await apiClient.post(GET_ESTIMATION_RECORDS_PATH, {
    code: String(code),
    row_name: String(rowName),
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : { records: [] };
}

export async function addBoqEstimationRecordItem(
  code,
  { rowName, floor, areaLabel, areaType } = {},
) {
  const response = await apiClient.post(ADD_ESTIMATION_RECORD_ITEM_PATH, {
    code: String(code),
    row_name: String(rowName),
    floor: String(floor || ''),
    area_label: String(areaLabel || ''),
    area_type: areaType || undefined,
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

export async function updateBoqEstimationRecordItem(
  code,
  { recordName, itemName, length, breadth, height, qty, areaType } = {},
) {
  const payload = {
    code: String(code),
    record_name: String(recordName),
    item_name: String(itemName),
  };

  if (length !== undefined) payload.length = length;
  if (breadth !== undefined) payload.breadth = breadth;
  if (height !== undefined) payload.height = height;
  if (qty !== undefined) payload.qty = qty;
  if (areaType !== undefined) payload.area_type = areaType;

  const response = await apiClient.post(UPDATE_ESTIMATION_RECORD_ITEM_PATH, payload);
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

export async function deleteBoqEstimationRecordItem(code, { recordName, itemName } = {}) {
  const response = await apiClient.post(DELETE_ESTIMATION_RECORD_ITEM_PATH, {
    code: String(code),
    record_name: String(recordName),
    item_name: String(itemName),
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

export async function duplicateBoqEstimationRecordItem(code, { recordName, itemName } = {}) {
  const response = await apiClient.post(DUPLICATE_ESTIMATION_RECORD_ITEM_PATH, {
    code: String(code),
    record_name: String(recordName),
    item_name: String(itemName),
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}
