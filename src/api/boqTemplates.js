import apiClient from '@/api/axios';
import {
  BOQ_TEMPLATES_COLUMN_CONFIG_TABLE_ID,
  BOQ_TEMPLATE_PRODUCTS_COLUMN_CONFIG_TABLE_ID,
} from '@/components/boq/constants';
import { buildBoqMasterSelectionPayload } from '@/api/boqProductPayload';
import { extractErrorMessage } from '@/utils/error-utils';

const API_BASE = '/method/devx.boq.api.api_boq_template';
const LIST_PREF_DOCTYPE = 'BOQ Template';

const LIST_PATH = `${API_BASE}.get_boq_template_listview`;
const GET_PATH = `${API_BASE}.get_boq_template`;
const CREATE_PATH = `${API_BASE}.create_boq_template`;
const UPDATE_PATH = `${API_BASE}.update_boq_template`;
const DUPLICATE_PATH = `${API_BASE}.duplicate_boq_template`;
const DELETE_PATH = `${API_BASE}.delete_boq_template`;
const FILTER_OPTIONS_PATH = `${API_BASE}.get_boq_template_filter_options`;
const CATEGORIES_PATH = `${API_BASE}.get_boq_template_categories`;
const TYPES_PATH = `${API_BASE}.get_boq_template_types`;
const CREATE_TYPE_PATH = `${API_BASE}.create_boq_template_type`;
const PRODUCTS_API_BASE = '/method/devx.boq.api.api_boq_template_products';
const TEMPLATE_PRODUCTS_PATH = `${PRODUCTS_API_BASE}.get_boq_template_products`;
const TEMPLATE_PRODUCT_FILTER_OPTIONS_PATH = `${PRODUCTS_API_BASE}.get_boq_template_product_filter_options`;
const PRODUCT_MASTER_LIST_PATH = `${PRODUCTS_API_BASE}.get_boq_product_master_for_template`;
const DELETE_PRODUCT_PATH = `${PRODUCTS_API_BASE}.delete_boq_template_product`;
const CREATE_PRODUCT_PATH = `${PRODUCTS_API_BASE}.create_boq_template_product`;
const UPDATE_PRODUCT_PATH = `${PRODUCTS_API_BASE}.update_boq_template_product`;
const SYNC_MASTER_PRODUCTS_PATH = `${PRODUCTS_API_BASE}.sync_boq_template_products_from_master`;

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
 * @param {{
 *   keyword?: string,
 *   filters?: Record<string, string[]>,
 *   page?: number,
 *   pageSize?: number,
 *   orderBy?: string,
 *   orderDir?: 'asc' | 'desc',
 * }} params
 */
export async function fetchBoqTemplateList({
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

/** @param {string} code */
export async function fetchBoqTemplate(code) {
  const response = await apiClient.post(GET_PATH, { code: String(code) });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

/**
 * @param {Record<string, unknown>} payload
 */
export async function createBoqTemplate(payload) {
  const response = await apiClient.post(CREATE_PATH, payload);
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

/**
 * @param {string} code
 * @param {Record<string, unknown>} payload
 */
export async function updateBoqTemplate(code, payload) {
  const response = await apiClient.post(UPDATE_PATH, { code: String(code), ...payload });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

/** @param {string} code */
export async function duplicateBoqTemplate(code) {
  const response = await apiClient.post(DUPLICATE_PATH, { code: String(code) });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

/** @param {string} code */
export async function deleteBoqTemplate(code) {
  const response = await apiClient.post(DELETE_PATH, { code: String(code) });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : { status: 'success' };
}

export async function fetchBoqTemplateFilterOptions() {
  const response = await apiClient.post(FILTER_OPTIONS_PATH, {});
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

export async function fetchBoqTemplateFilterTabOptions({
  tab,
  search = '',
  page = 1,
  limit = 20,
} = {}) {
  const response = await apiClient.post(FILTER_OPTIONS_PATH, {
    tab,
    search: search || undefined,
    page,
    limit,
  });
  const msg = unwrapMessage(response);
  if (Array.isArray(msg)) {
    return {
      rows: msg,
      page: 1,
      pageSize: limit,
      hasMore: false,
    };
  }

  const rows = Array.isArray(msg?.data) ? msg.data : [];
  return {
    rows,
    page: Number(msg?.page ?? page),
    pageSize: Number(msg?.page_size ?? limit),
    hasMore: Boolean(msg?.has_more),
  };
}

export async function fetchBoqTemplateCategories() {
  const response = await apiClient.post(CATEGORIES_PATH, {});
  const msg = unwrapMessage(response);
  return Array.isArray(msg) ? msg : [];
}

export async function fetchBoqTemplateTypes() {
  const response = await apiClient.post(TYPES_PATH, {});
  const msg = unwrapMessage(response);
  return Array.isArray(msg) ? msg : [];
}

export async function createBoqTemplateType(typeName) {
  const response = await apiClient.post(CREATE_TYPE_PATH, {
    type_name: String(typeName).trim(),
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : { value: typeName, label: typeName };
}

export async function fetchBoqTemplateListPref() {
  const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
    params: {
      doctype: LIST_PREF_DOCTYPE,
      react_table_id: BOQ_TEMPLATES_COLUMN_CONFIG_TABLE_ID,
    },
  });
  const message = response?.data?.message;
  if (!message || (Array.isArray(message) && message.length === 0)) {
    return null;
  }
  return message;
}

/** @param {Array<Record<string, unknown>>} columns */
export async function saveBoqTemplateListPref(columns) {
  const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
    doctype: LIST_PREF_DOCTYPE,
    react_table_id: BOQ_TEMPLATES_COLUMN_CONFIG_TABLE_ID,
    columns,
  });
  return response?.data?.message ?? { status: 'success' };
}

export async function fetchBoqTemplateProductsListPref() {
  const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
    params: {
      doctype: LIST_PREF_DOCTYPE,
      react_table_id: BOQ_TEMPLATE_PRODUCTS_COLUMN_CONFIG_TABLE_ID,
    },
  });
  const message = response?.data?.message;
  if (!message || (Array.isArray(message) && message.length === 0)) {
    return null;
  }
  return message;
}

/** @param {Array<Record<string, unknown>>} columns */
export async function saveBoqTemplateProductsListPref(columns) {
  const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
    doctype: LIST_PREF_DOCTYPE,
    react_table_id: BOQ_TEMPLATE_PRODUCTS_COLUMN_CONFIG_TABLE_ID,
    columns,
  });
  return response?.data?.message ?? { status: 'success' };
}

/**
 * @param {{
 *   categoryId?: string,
 *   keyword?: string,
 *   page?: number,
 *   pageSize?: number,
 * }} params
 */
export async function fetchBoqProductMasterForTemplate({
  categoryId,
  productGroup,
  keyword = '',
  page = 1,
  pageSize = 200,
} = {}) {
  const response = await apiClient.post(PRODUCT_MASTER_LIST_PATH, {
    category_id: categoryId || undefined,
    product_group: productGroup || undefined,
    section: productGroup || undefined,
    keyword: keyword || undefined,
    page,
    page_size: pageSize,
  });
  const msg = unwrapMessage(response);
  return {
    rows: Array.isArray(msg?.results) ? msg.results : [],
    totalCount: Number(msg?.total_count ?? 0),
    page: Number(msg?.page ?? page),
    pageSize: Number(msg?.page_size ?? pageSize),
    hasMore: Boolean(msg?.has_more),
  };
}

/** @param {string} code */
export async function fetchBoqTemplateProductFilterOptions(code) {
  const response = await apiClient.post(TEMPLATE_PRODUCT_FILTER_OPTIONS_PATH, {
    code: String(code),
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

export async function fetchBoqTemplateProducts(code, { keyword, filters } = {}) {
  const response = await apiClient.post(TEMPLATE_PRODUCTS_PATH, {
    code: String(code),
    keyword: keyword || undefined,
    filters: filters && Object.keys(filters).length > 0 ? JSON.stringify(filters) : undefined,
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : { categories: [], summary: {} };
}

/**
 * @param {string} code
 * @param {string} rowName - BOQ Template Item child row name
 */
export async function deleteBoqTemplateProduct(code, rowName) {
  const response = await apiClient.post(DELETE_PRODUCT_PATH, {
    code: String(code),
    row_name: String(rowName),
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : { status: 'success' };
}

export async function syncBoqTemplateProductsFromMaster({
  code,
  selectedProducts = [],
  removeRowNames = [],
} = {}) {
  const response = await apiClient.post(SYNC_MASTER_PRODUCTS_PATH, {
    code: String(code),
    products: JSON.stringify(buildBoqMasterSelectionPayload(selectedProducts)),
    remove_row_names: JSON.stringify(removeRowNames),
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

/**
 * @param {string} code
 * @param {Record<string, unknown>} payload
 */
export async function createBoqTemplateProduct(code, payload) {
  const response = await apiClient.post(CREATE_PRODUCT_PATH, {
    code: String(code),
    ...payload,
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

/**
 * @param {string} code
 * @param {string} rowName
 * @param {Record<string, unknown>} payload
 */
export async function updateBoqTemplateProduct(code, rowName, payload) {
  const response = await apiClient.post(UPDATE_PRODUCT_PATH, {
    code: String(code),
    row_name: String(rowName),
    ...payload,
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}
