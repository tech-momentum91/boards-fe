import apiClient from '@/api/axios';

const BASE = '/method/devx.work_order.api.billing_qc';

function unwrap(response) {
  const payload = response?.data ?? response;
  if (payload?.message && typeof payload.message === 'object' && !Array.isArray(payload.message)) {
    return payload.message;
  }
  return payload?.message ?? payload;
}

export async function getProjectBillingQcVendors(project) {
  const { data } = await apiClient.get(`${BASE}.get_project_billing_qc_vendors`, {
    params: { project },
  });
  return unwrap(data);
}

export async function getBillingQcJmrDetail(workOrderId) {
  const { data } = await apiClient.get(`${BASE}.get_billing_qc_jmr_detail`, {
    params: { work_order_id: workOrderId },
  });
  return unwrap(data);
}

export async function getBillingQcMrDetail(workOrderId) {
  const { data } = await apiClient.get(`${BASE}.get_billing_qc_mr_detail`, {
    params: { work_order_id: workOrderId },
  });
  return unwrap(data);
}

export async function markJmrCategoryComplete(workOrderId, categoryId, completed = true) {
  const { data } = await apiClient.post(`${BASE}.mark_jmr_category_complete`, {
    work_order_id: workOrderId,
    category_id: categoryId,
    completed: completed ? 1 : 0,
  });
  return unwrap(data);
}

export async function markJmrAreaComplete(workOrderId, areaId, completed = true) {
  const { data } = await apiClient.post(`${BASE}.mark_jmr_area_complete`, {
    work_order_id: workOrderId,
    area_id: areaId,
    completed: completed ? 1 : 0,
  });
  return unwrap(data);
}

export async function certifyGmr(workOrderId, payload = {}) {
  const { data } = await apiClient.post(`${BASE}.certify_gmr`, {
    work_order_id: workOrderId,
    payload: JSON.stringify(payload),
  });
  return unwrap(data);
}

export async function updateJmrItem(workOrderId, jmrItemId, payload = {}) {
  const { data } = await apiClient.post(`${BASE}.update_jmr_item`, {
    work_order_id: workOrderId,
    jmr_item_id: jmrItemId,
    payload: JSON.stringify(payload),
  });
  return unwrap(data);
}

export async function createSnagFromJmrItem(workOrderId, jmrItemId) {
  const { data } = await apiClient.post(`${BASE}.create_snag_from_jmr_item`, {
    work_order_id: workOrderId,
    jmr_item_id: jmrItemId,
  });
  return unwrap(data);
}

export async function recordSnagOnJmrItem(workOrderId, jmrItemId, taskId) {
  const { data } = await apiClient.post(`${BASE}.record_snag_on_jmr_item`, {
    work_order_id: workOrderId,
    jmr_item_id: jmrItemId,
    task_id: taskId ?? '',
  });
  return unwrap(data);
}
