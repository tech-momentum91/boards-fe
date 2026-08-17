import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

const GET_PO_SCOPE_TERMS_PATH =
  '/method/devx.devx_procurements.api.po_scope_terms.get_po_scope_terms';

const assertNoExc = (result) => {
  if (result?.exc_type) {
    throw new Error(
      extractErrorMessage({ payload: result }, 'Failed to load PO scope & commercial terms.'),
    );
  }
};

const unwrapMessage = (response) => {
  const result = response?.data;
  assertNoExc(result);
  return result?.message ?? result;
};

/**
 * @returns {Promise<{
 *   categories: Array<{
 *     id: string,
 *     label: string,
 *     description: string,
 *     is_payment_terms: boolean,
 *     templates: Array<{
 *       id: string,
 *       name: string,
 *       content: string,
 *       milestones: Array<{ name: string, percentage: number|string, remarks: string }>
 *     }>
 *   }>
 * }>}
 */
export async function fetchPoScopeTerms() {
  const response = await apiClient.post(GET_PO_SCOPE_TERMS_PATH);
  const payload = unwrapMessage(response);
  return {
    categories: Array.isArray(payload?.categories) ? payload.categories : [],
  };
}
