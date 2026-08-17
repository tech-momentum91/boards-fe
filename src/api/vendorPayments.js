import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

const API_BASE = '/method/devx.payment_planning.api.vendor_payments';
const LIST_PATH = `${API_BASE}.get_vendor_payments_listview`;

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

export async function fetchVendorPaymentsList({
  keyword = '',
  vendor = 'all',
  project = 'all',
} = {}) {
  const response = await apiClient.post(LIST_PATH, {
    keyword: keyword || undefined,
    vendor: vendor && vendor !== 'all' ? vendor : undefined,
    project: project && project !== 'all' ? project : undefined,
  });
  const payload = unwrapMessage(response) ?? {};
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const vendors = Array.isArray(payload?.vendors) ? payload.vendors : [];
  const projects = Array.isArray(payload?.projects) ? payload.projects : [];
  return {
    rows,
    total: Number(payload?.total ?? rows.length),
    vendors,
    projects,
  };
}
