import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

const LIST_PATH = '/method/devx.product.api.product_categories.list_product_categories';
const COUNT_BY_CATEGORY_TYPE_PATH =
  '/method/devx.product.api.product_categories.count_products_by_category_type';
const CREATE_PATH = '/method/devx.product.api.product_categories.create_product_category';
const UPDATE_PATH = '/method/devx.product.api.product_categories.update_product_category';
const DELETE_PATH = '/method/devx.product.api.product_categories.delete_product_category';

const assertNoExc = (result) => {
  if (result?.exc_type || result?.exc) {
    throw new Error(extractErrorMessage(result, 'Request failed.'));
  }
};

const unwrapMessage = (response) => {
  const result = response?.data;
  assertNoExc(result);

  const message = result?.message ?? result;
  if (message && typeof message === 'object') {
    return message;
  }

  if (typeof message === 'string') {
    try {
      const parsed = JSON.parse(message);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch {
      // Fall through to raw string payloads.
    }
  }

  return message;
};

/**
 * @param {{ maxDepth?: number }} [params]
 * @returns {Promise<Record<string, object[]>>}
 */
export async function fetchProductCategories(params = {}) {
  const { maxDepth } = params;
  const response = await apiClient.post(LIST_PATH, {
    ...(maxDepth != null ? { max_depth: maxDepth, maxDepth } : {}),
  });
  const msg = unwrapMessage(response);
  return msg?.rows_by_tab && typeof msg.rows_by_tab === 'object' ? msg.rows_by_tab : {};
}

/**
 * Sidebar badge counts keyed by Parent Category id (and by display name).
 * @returns {Promise<{ counts: Record<string, number>, countsById: Record<string, number> }>}
 */
export async function fetchProductCountsByCategoryType() {
  const response = await apiClient.post(COUNT_BY_CATEGORY_TYPE_PATH, {});
  const msg = unwrapMessage(response);
  return {
    counts: msg?.counts && typeof msg.counts === 'object' ? msg.counts : {},
    countsById: msg?.counts_by_id && typeof msg.counts_by_id === 'object' ? msg.counts_by_id : {},
  };
}

/**
 * @param {string} tabId
 * @returns {Promise<object[]>}
 */
export async function fetchProductCategoriesByTab(tabId) {
  const rowsByTab = await fetchProductCategories();
  return rowsByTab[tabId] ?? [];
}

/**
 * @param {string} tabId
 * @param {Record<string, unknown>} payload
 * @returns {Promise<object>}
 */
export async function createProductCategory(tabId, payload) {
  const response = await apiClient.post(CREATE_PATH, {
    tab_id: tabId,
    ...payload,
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

/**
 * @param {string} tabId
 * @param {string} rowId
 * @param {Record<string, unknown>} payload
 * @returns {Promise<object>}
 */
export async function updateProductCategory(tabId, rowId, payload) {
  const response = await apiClient.post(UPDATE_PATH, {
    tab_id: tabId,
    row_id: rowId,
    ...payload,
  });
  const msg = unwrapMessage(response);
  if (msg?.rows_by_tab && typeof msg.rows_by_tab === 'object') {
    return {
      row: msg.row && typeof msg.row === 'object' ? msg.row : {},
      rowsByTab: msg.rows_by_tab,
      renamed: Boolean(msg.renamed),
    };
  }
  return msg && typeof msg === 'object' ? { ...msg, renamed: Boolean(msg.renamed) } : {};
}

/**
 * @param {string} tabId
 * @param {string} rowId
 * @returns {Promise<object[]>}
 */
export async function deleteProductCategory(tabId, rowId) {
  const response = await apiClient.post(DELETE_PATH, {
    tab_id: tabId,
    row_id: rowId,
  });
  const msg = unwrapMessage(response);
  return Array.isArray(msg?.data) ? msg.data : [];
}
