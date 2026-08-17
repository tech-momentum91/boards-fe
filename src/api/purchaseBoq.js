import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

const API_BASE = '/method/devx.devx_procurements.api.api_purchase_boq_products';

const GET_PRODUCTS_PATH = `${API_BASE}.get_purchase_boq_products`;
const GET_FILTER_OPTIONS_PATH = `${API_BASE}.get_purchase_boq_product_filter_options`;
const GET_PACKAGES_PATH = `${API_BASE}.get_purchase_boq_packages`;
const SPLIT_ITEMS_PATH = `${API_BASE}.split_purchase_boq_selected_items`;
const ADD_TO_PACKAGE_PATH = `${API_BASE}.add_purchase_boq_items_to_package`;
const CREATE_PRODUCT_PATH = `${API_BASE}.create_purchase_boq_product`;
const UPDATE_PRODUCT_PATH = `${API_BASE}.update_purchase_boq_product`;
const UPDATE_PRODUCT_QUANTITY_PATH = `${API_BASE}.update_purchase_boq_product_quantity`;

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

const resolvePurchaseBoqPayload = ({ project, purchaseBoq } = {}) => ({
  project: project || undefined,
  purchase_boq: purchaseBoq || undefined,
});

export function normalizePurchaseBoqPackageRow(row = {}) {
  const code = (row.code || '').trim();
  const name = (row.package_name || row.name || code).trim();
  return {
    id: row.name || code,
    code,
    name,
  };
}

export async function fetchPurchaseBoqProducts({
  project,
  purchaseBoq,
  code,
  keyword,
  filters,
  procurementStatus,
} = {}) {
  const response = await apiClient.post(GET_PRODUCTS_PATH, {
    ...resolvePurchaseBoqPayload({ project, purchaseBoq }),
    code: code || undefined,
    keyword: keyword || undefined,
    procurement_status:
      procurementStatus && procurementStatus !== 'all' ? procurementStatus : undefined,
    filters: filters && Object.keys(filters).length > 0 ? JSON.stringify(filters) : undefined,
  });

  return unwrapMessage(response) ?? { categories: [], summary: {}, productCount: 0 };
}

export async function fetchPurchaseBoqProductFilterOptions({ project, purchaseBoq, code } = {}) {
  const response = await apiClient.post(GET_FILTER_OPTIONS_PATH, {
    ...resolvePurchaseBoqPayload({ project, purchaseBoq }),
    code: code || undefined,
  });

  return unwrapMessage(response) ?? { brand: [], units: [] };
}

export async function fetchPurchaseBoqPackages({ project, purchaseBoq } = {}) {
  const response = await apiClient.post(GET_PACKAGES_PATH, {
    ...resolvePurchaseBoqPayload({ project, purchaseBoq }),
  });

  const payload = unwrapMessage(response);
  return Array.isArray(payload) ? payload.map(normalizePurchaseBoqPackageRow) : [];
}

export async function splitPurchaseBoqSelectedItems({
  project,
  purchaseBoq,
  itemRowNames = [],
} = {}) {
  const response = await apiClient.post(SPLIT_ITEMS_PATH, {
    ...resolvePurchaseBoqPayload({ project, purchaseBoq }),
    item_row_names: JSON.stringify(itemRowNames),
  });

  return unwrapMessage(response);
}

export async function addPurchaseBoqItemsToPackage({
  project,
  purchaseBoq,
  itemRowNames = [],
  packageCode,
  packageName,
  existingPackage,
  expectedClosureDate,
} = {}) {
  const response = await apiClient.post(ADD_TO_PACKAGE_PATH, {
    ...resolvePurchaseBoqPayload({ project, purchaseBoq }),
    item_row_names: JSON.stringify(itemRowNames),
    package_code: packageCode || undefined,
    package_name: packageName || undefined,
    existing_package: existingPackage || undefined,
    expected_closure_date: expectedClosureDate || undefined,
  });

  return unwrapMessage(response);
}

/**
 * Create a direct Purchase BOQ line item.
 * @param {{ project?: string, purchaseBoq?: string, payload: object }}
 */
export async function createPurchaseBoqProduct({ project, purchaseBoq, payload } = {}) {
  const response = await apiClient.post(CREATE_PRODUCT_PATH, {
    ...resolvePurchaseBoqPayload({ project, purchaseBoq }),
    doc: JSON.stringify(payload ?? {}),
  });
  return unwrapMessage(response);
}

/**
 * Update a Purchase BOQ line item (same fields as Combined / Project BOQ).
 * @param {{ project?: string, purchaseBoq?: string, rowName: string, payload: object }}
 */
export async function updatePurchaseBoqProduct({ project, purchaseBoq, rowName, payload } = {}) {
  if (!rowName) {
    throw new Error('Purchase BOQ item id is required.');
  }

  const response = await apiClient.post(UPDATE_PRODUCT_PATH, {
    ...resolvePurchaseBoqPayload({ project, purchaseBoq }),
    row_name: rowName,
    doc: JSON.stringify(payload ?? {}),
  });

  return unwrapMessage(response);
}

/**
 * Update floor-wise quantity for a Purchase BOQ line item.
 * @param {{ project?: string, purchaseBoq?: string, rowName: string, quantityByFloor?: Array, quantity?: string }}
 */
export async function updatePurchaseBoqProductQuantity({
  project,
  purchaseBoq,
  rowName,
  quantityByFloor,
  quantity,
} = {}) {
  if (!rowName) {
    throw new Error('Purchase BOQ item id is required.');
  }

  const response = await apiClient.post(UPDATE_PRODUCT_QUANTITY_PATH, {
    ...resolvePurchaseBoqPayload({ project, purchaseBoq }),
    row_name: rowName,
    quantity_by_floor: Array.isArray(quantityByFloor) ? JSON.stringify(quantityByFloor) : undefined,
    quantity: quantity || undefined,
  });

  return unwrapMessage(response);
}
