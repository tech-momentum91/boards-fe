import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

const API_BASE = '/method/devx.payment_planning.api.master_payment_sheet';

const LIST_PATH = `${API_BASE}.get_master_payment_sheets_listview`;
const DETAIL_PATH = `${API_BASE}.get_master_payment_sheet_detail`;
const CREATE_PATH = `${API_BASE}.create_master_payment_sheet`;
const UPDATE_ALLOCATIONS_PATH = `${API_BASE}.update_master_payment_sheet_allocations`;
const SET_STATUS_PATH = `${API_BASE}.set_master_payment_sheet_status`;

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

const toTitleCaseMonth = (month) => {
  if (!month) return undefined;
  const value = String(month).trim();
  if (!value) return undefined;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

export async function fetchMasterPaymentSheetsList({
  keyword = '',
  status = 'all',
  page = 1,
  pageSize = 100,
  orderBy = 'sheet_name asc',
} = {}) {
  const response = await apiClient.post(LIST_PATH, {
    keyword: keyword || undefined,
    status: status && status !== 'all' ? status : undefined,
    page,
    page_size: pageSize,
    order_by: orderBy,
  });

  const payload = unwrapMessage(response) ?? {};
  let rows = [];
  if (Array.isArray(payload?.results)) {
    rows = payload.results;
  } else if (Array.isArray(payload?.data)) {
    rows = payload.data;
  }

  return {
    rows,
    page: Number(payload?.page) || page,
    hasMore: Boolean(payload?.has_more),
    total: Number(payload?.total ?? rows.length),
  };
}

export async function fetchMasterPaymentSheetDetail(name) {
  const response = await apiClient.post(DETAIL_PATH, { name });
  const payload = unwrapMessage(response) ?? {};
  return payload?.data ?? payload ?? {};
}

export async function createMasterPaymentSheet({ sheetName, month, year, budget, remarks } = {}) {
  const response = await apiClient.post(CREATE_PATH, {
    payload: JSON.stringify({
      sheet_name: sheetName,
      month: toTitleCaseMonth(month),
      year: year || undefined,
      budget: budget === '' || budget == null ? undefined : Number(budget),
      remarks: remarks || undefined,
    }),
  });
  return unwrapMessage(response) ?? {};
}

export async function updateMasterPaymentSheetAllocations(name, items) {
  const response = await apiClient.post(UPDATE_ALLOCATIONS_PATH, {
    name,
    items: JSON.stringify(Array.isArray(items) ? items : []),
  });
  return unwrapMessage(response) ?? {};
}

export async function setMasterPaymentSheetStatus(name, status) {
  const response = await apiClient.post(SET_STATUS_PATH, { name, status });
  return unwrapMessage(response) ?? {};
}
