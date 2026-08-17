import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

const GET_ACTIVE_VENDORS_PATH = '/method/devx.api.vendor.get_suppliers_list_by_center';

const assertNoExc = (result) => {
  if (result?.exc_type) {
    throw new Error(extractErrorMessage({ payload: result }, 'Failed to load vendors.'));
  }
};

const unwrapMessage = (response) => {
  const result = response?.data;
  assertNoExc(result);
  return result?.message ?? result;
};

/** Map a Supplier row (`{ name, supplier_name }`) to a `{ value, label }` select option. */
export function normalizeVendorOption(row = {}) {
  const value = String(row.name ?? '').trim();
  const label = String(row.supplier_name ?? row.name ?? '').trim() || value;
  return { value, label };
}

/**
 * Fetch active vendors (Suppliers with `disabled = 0`).
 *
 * @param {{ center?: string }} [params] Optionally restrict to a center.
 * @returns {Promise<Array<{ value: string, label: string }>>}
 */
export async function fetchActiveVendors({ center } = {}) {
  const response = await apiClient.post(GET_ACTIVE_VENDORS_PATH, {
    center: center || undefined,
  });
  const payload = unwrapMessage(response);
  const rows = Array.isArray(payload) ? payload : [];
  return rows.map(normalizeVendorOption).filter((option) => option.value);
}
