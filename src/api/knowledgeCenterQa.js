import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

const LIST_PATH = '/method/devx.knowledge_center.api.knowledge_center_qa.list_knowledge_center_qa';
const GET_PATH = '/method/devx.knowledge_center.api.knowledge_center_qa.get_knowledge_center_qa';
const CREATE_PATH =
  '/method/devx.knowledge_center.api.knowledge_center_qa.create_knowledge_center_qa';
const UPDATE_PATH =
  '/method/devx.knowledge_center.api.knowledge_center_qa.update_knowledge_center_qa';
const TRANSCRIBE_PATH =
  '/method/devx_ai.knowledge_center_insights.stt_api.transcribe_knowledge_center_audio';

export const KNOWLEDGE_CENTER_QA_DOCTYPE = 'Knowledge Center QA';

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
 *   limit_start?: number,
 *   limit_page_length?: number,
 *   order_by?: string,
 * }} payload
 */
export async function fetchKnowledgeCenterQaList(payload = {}) {
  const response = await apiClient.post(LIST_PATH, payload);
  const msg = unwrapMessage(response);
  return {
    data: Array.isArray(msg?.data) ? msg.data : [],
    total: Number(msg?.total ?? 0),
  };
}

export async function fetchKnowledgeCenterQaDetail(name) {
  const response = await apiClient.post(GET_PATH, { name });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

/**
 * @param {{
 *   question_type?: string,
 *   question?: string,
 *   answer?: string,
 *   client?: string,
 *   center?: string,
 *   is_active?: number,
 * }} payload
 */
export async function createKnowledgeCenterQa(payload) {
  const response = await apiClient.post(CREATE_PATH, payload);
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

/**
 * @param {string} name
 * @param {{
 *   question_type?: string,
 *   question?: string,
 *   answer?: string,
 *   client?: string,
 *   center?: string,
 *   is_active?: number,
 * }} payload
 */
export async function updateKnowledgeCenterQa(name, payload) {
  const response = await apiClient.post(UPDATE_PATH, { name, ...payload });
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

export async function deleteKnowledgeCenterQa(name) {
  const response = await apiClient.post('/method/frappe.client.delete', {
    doctype: KNOWLEDGE_CENTER_QA_DOCTYPE,
    name: String(name),
  });
  assertNoExc(response?.data);
  return { ok: true };
}

/**
 * Sarvam saaras:v3 STT (server uses `voice_cp_portal.providers.sarvam.transcribe`).
 * @param {Blob} audioBlob
 * @param {string} [filename='audio.webm']
 * @returns {Promise<string>}
 */
export async function transcribeKnowledgeCenterAudio(audioBlob, filename = 'audio.webm') {
  const formData = new FormData();
  formData.append('audio', audioBlob, filename);
  const response = await apiClient.post(TRANSCRIBE_PATH, formData);
  const msg = unwrapMessage(response);
  const t = msg && typeof msg === 'object' ? msg.transcript : '';
  return typeof t === 'string' ? t : '';
}
