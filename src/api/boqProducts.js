import apiClient from '@/api/axios';
import {
  buildBoqMasterSelectionPayload,
  buildBoqPreviousProjectSelectionPayload,
} from '@/api/boqProductPayload';
import { extractErrorMessage } from '@/utils/error-utils';

const ADD_PRODUCTS_PATH = '/method/devx.boq.api.api_boq_products.add_boq_products';

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
 * Add products to a BOQ template or Project BOQ via the unified backend API.
 * @param {{ target: 'template' | 'project', code: string, products: Array<Record<string, unknown>> }} params
 */
export async function addBoqProducts({ target, code, products = [] }) {
  const response = await apiClient.post(ADD_PRODUCTS_PATH, {
    target: String(target),
    code: String(code),
    products: JSON.stringify(products),
  });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

/**
 * Add products from product master (or any selection) to a BOQ template or Project BOQ.
 * @param {{ target: 'template' | 'project', code: string, selectedProducts: Array<Record<string, unknown>> }} params
 */
export async function addBoqProductsFromMaster({ target, code, selectedProducts }) {
  const products = buildBoqMasterSelectionPayload(selectedProducts);
  if (!code || products.length === 0) {
    return { categories: [], summary: {}, added: [], skipped: [] };
  }

  return addBoqProducts({ target, code, products });
}

/**
 * Add products copied from a previous project BOQ to a template or Project BOQ.
 * @param {{ target: 'template' | 'project', code: string, selectedProducts: Array<Record<string, unknown>> }} params
 */
export async function addBoqProductsFromPreviousProjects({ target, code, selectedProducts }) {
  const products = buildBoqPreviousProjectSelectionPayload(selectedProducts);
  if (!code || products.length === 0) {
    return { categories: [], summary: {}, added: [], skipped: [] };
  }

  return addBoqProducts({ target, code, products });
}
