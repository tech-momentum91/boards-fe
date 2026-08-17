import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

const API_BASE = '/method/devx.payment_planning.api.project_payment_sheet';

const REGISTER_PATH = `${API_BASE}.get_project_payment_register`;
const LIST_PATH = `${API_BASE}.get_project_payment_sheets_listview`;
const CREATE_DATA_PATH = `${API_BASE}.get_create_payment_sheet_data`;
const CREATE_PATH = `${API_BASE}.create_project_payment_sheet`;
const UPDATE_PATH = `${API_BASE}.update_project_payment_sheet`;
const DETAIL_PATH = `${API_BASE}.get_project_payment_sheet_detail`;
const MASTER_OPTIONS_PATH = `${API_BASE}.get_master_payment_sheet_options`;

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

const unwrapListRows = (payload) => {
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export async function fetchProjectPaymentRegister({
  project,
  keyword = '',
  vendor = 'all',
  category = 'all',
  status = 'all',
  page = 1,
  pageSize = 200,
} = {}) {
  if (!project) {
    return { rows: [], page: 1, hasMore: false, total: 0 };
  }

  const response = await apiClient.post(REGISTER_PATH, {
    project,
    keyword: keyword || undefined,
    vendor: vendor && vendor !== 'all' ? vendor : undefined,
    category: category && category !== 'all' ? category : undefined,
    status: status && status !== 'all' ? status : undefined,
    page,
    page_size: pageSize,
  });

  const payload = unwrapMessage(response) ?? {};
  const rows = unwrapListRows(payload);
  return {
    rows,
    page: Number(payload?.page) || page,
    hasMore: Boolean(payload?.has_more),
    total: Number(payload?.total ?? rows.length),
  };
}

export async function fetchProjectPaymentSheetsList({
  project,
  keyword = '',
  status = 'all',
  page = 1,
  pageSize = 100,
  orderBy = 'sheet_name asc',
} = {}) {
  if (!project) {
    return { rows: [], page: 1, hasMore: false, total: 0 };
  }

  const response = await apiClient.post(LIST_PATH, {
    project,
    keyword: keyword || undefined,
    status: status && status !== 'all' ? status : undefined,
    page,
    page_size: pageSize,
    order_by: orderBy,
  });

  const payload = unwrapMessage(response) ?? {};
  const rows = unwrapListRows(payload);
  return {
    rows,
    page: Number(payload?.page) || page,
    hasMore: Boolean(payload?.has_more),
    total: Number(payload?.total ?? rows.length),
  };
}

export async function fetchCreatePaymentSheetData({
  project,
  keyword = '',
  vendor = 'all',
  category = 'all',
} = {}) {
  if (!project) return [];
  const response = await apiClient.post(CREATE_DATA_PATH, {
    project,
    keyword: keyword || undefined,
    vendor: vendor && vendor !== 'all' ? vendor : undefined,
    category: category && category !== 'all' ? category : undefined,
  });
  const payload = unwrapMessage(response) ?? {};
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function createProjectPaymentSheet(payload) {
  const response = await apiClient.post(CREATE_PATH, {
    payload: JSON.stringify(payload ?? {}),
  });
  return unwrapMessage(response) ?? {};
}

/** Update an existing Draft project payment sheet (header + items). */
export async function updateProjectPaymentSheet(name, payload) {
  if (!name) {
    throw new Error('Payment sheet name is required.');
  }
  const response = await apiClient.post(UPDATE_PATH, {
    name,
    payload: JSON.stringify(payload ?? {}),
  });
  return unwrapMessage(response) ?? {};
}

export async function fetchProjectPaymentSheetDetail(name) {
  const response = await apiClient.post(DETAIL_PATH, { name });
  const payload = unwrapMessage(response) ?? {};
  return payload?.data ?? payload ?? {};
}

export async function fetchMasterPaymentSheetOptions() {
  const response = await apiClient.post(MASTER_OPTIONS_PATH, {});
  const payload = unwrapMessage(response) ?? {};
  return Array.isArray(payload?.data) ? payload.data : [];
}
