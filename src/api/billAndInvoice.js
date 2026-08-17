import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

const API_BASE = '/method/devx.payment_planning.api.bill_and_invoice';

const LIST_PATH = `${API_BASE}.get_bill_and_invoice_listview`;
const UPLOAD_PATH = `${API_BASE}.upload_bill_and_invoice`;
const CLEAR_PATH = `${API_BASE}.clear_bill_and_invoice`;
const APPROVE_PATH = `${API_BASE}.approve_bill_and_invoice`;

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

export async function fetchBillAndInvoiceList({ keyword = '', status = 'all' } = {}) {
  const response = await apiClient.post(LIST_PATH, {
    keyword: keyword || undefined,
    status: status && status !== 'all' ? status : undefined,
  });
  const payload = unwrapMessage(response) ?? {};
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return {
    rows,
    total: Number(payload?.total ?? rows.length),
  };
}

export async function uploadBillAndInvoice({ itemId, invoiceNo, invoiceAmount, file }) {
  const formData = new FormData();
  formData.append('item_id', itemId);
  if (invoiceNo) formData.append('invoice_no', invoiceNo);
  if (invoiceAmount != null && invoiceAmount !== '') {
    formData.append('invoice_amount', String(invoiceAmount));
  }
  if (file) formData.append('bill', file);

  const response = await apiClient.post(UPLOAD_PATH, formData);
  return unwrapMessage(response) ?? {};
}

export async function clearBillAndInvoice(itemId) {
  const response = await apiClient.post(CLEAR_PATH, { item_id: itemId });
  return unwrapMessage(response) ?? {};
}

export async function approveBillAndInvoice(itemId) {
  const response = await apiClient.post(APPROVE_PATH, { item_id: itemId });
  return unwrapMessage(response) ?? {};
}
