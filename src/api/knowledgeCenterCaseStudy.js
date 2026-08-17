import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

const LIST_PATH =
  '/method/devx.knowledge_center.api.knowledge_center_case_study.list_knowledge_center_case_studies';
const GET_PATH =
  '/method/devx.knowledge_center.api.knowledge_center_case_study.get_knowledge_center_case_study';
const CREATE_PATH =
  '/method/devx.knowledge_center.api.knowledge_center_case_study.create_knowledge_center_case_study';
const UPDATE_PATH =
  '/method/devx.knowledge_center.api.knowledge_center_case_study.update_knowledge_center_case_study';

export const KNOWLEDGE_CENTER_CASE_STUDY_DOCTYPE = 'Knowledge Center Case Study';

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
 * @param {{
 *   filters?: unknown[],
 *   or_filters?: unknown[],
 *   keyword?: string,
 *   city?: string,
 *   limit_start?: number,
 *   limit_page_length?: number,
 *   order_by?: string,
 * }} payload
 */
export async function fetchKnowledgeCenterCaseStudyList(payload = {}) {
  const response = await apiClient.post(LIST_PATH, payload);
  const msg = unwrapMessage(response);
  return {
    data: Array.isArray(msg?.data) ? msg.data : [],
    total: Number(msg?.total ?? 0),
  };
}

/** @param {string} name */
export async function fetchKnowledgeCenterCaseStudyDetail(name) {
  const response = await apiClient.post(GET_PATH, { name: String(name) });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

/**
 * @param {Record<string, unknown>} payload
 */
export async function createKnowledgeCenterCaseStudy(payload) {
  const response = await apiClient.post(CREATE_PATH, payload);
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

/**
 * @param {string} name
 * @param {Record<string, unknown>} payload
 */
export async function updateKnowledgeCenterCaseStudy(name, payload) {
  const response = await apiClient.post(UPDATE_PATH, { name: String(name), ...payload });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

/** @param {string} name */
export async function deleteKnowledgeCenterCaseStudy(name) {
  const response = await apiClient.post('/method/frappe.client.delete', {
    doctype: KNOWLEDGE_CENTER_CASE_STUDY_DOCTYPE,
    name: String(name),
  });
  assertNoExc(response?.data);
  return { ok: true };
}

/**
 * @param {string} docname
 * @param {File[] | FileList} files
 */
export async function uploadKnowledgeCenterCaseStudyFiles(docname, files) {
  const fileArray = [...(files || [])];
  if (fileArray.length === 0) return;

  await Promise.all(
    fileArray.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('doctype', KNOWLEDGE_CENTER_CASE_STUDY_DOCTYPE);
      formData.append('docname', docname);
      formData.append('is_private', 0);
      const response = await apiClient.post('/method/upload_file', formData);
      assertNoExc(response?.data);
    }),
  );
}

/** @param {string} fileUrl */
export async function deleteKnowledgeCenterCaseStudyAttachment(fileUrl) {
  const response = await apiClient.post('/method/frappe.client.delete', {
    doctype: 'File',
    name: fileUrl,
  });
  assertNoExc(response?.data);
  return { ok: true };
}
