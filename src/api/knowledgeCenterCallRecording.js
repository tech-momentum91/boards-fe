import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

export const KNOWLEDGE_CENTER_CALL_RECORDING_DOCTYPE = 'Knowledge Center Call Recordings';

const RESOURCE_PATH = `/resource/${encodeURIComponent(KNOWLEDGE_CENTER_CALL_RECORDING_DOCTYPE)}`;

const LIST_VIEW_PATH =
  '/method/devx.knowledge_center.api.knowledge_center_call_recordings.get_knowledge_center_call_recordings_list_view';

const COMPANY_COUNTS_PATH =
  '/method/devx.knowledge_center.api.knowledge_center_call_recordings.get_knowledge_center_call_recordings_company_counts';

const DETAILED_VIEW_PATH =
  '/method/devx.knowledge_center.api.knowledge_center_call_recordings.get_knowledge_center_call_recordings_detailed_view';

const CREATE_PATH =
  '/method/devx.knowledge_center.api.knowledge_center_call_recordings.create_knowledge_center_call_recording';

const UPDATE_PATH =
  '/method/devx.knowledge_center.api.knowledge_center_call_recordings.update_knowledge_center_call_recording';

const DELETE_PATH =
  '/method/devx.knowledge_center.api.knowledge_center_call_recordings.delete_knowledge_center_call_recording';

export const CALL_RECORDING_LIST_DEFAULT_PAGE_SIZE = 20;

/** v1 list cap — matches Knowledge Center case studies (single fetch, client-side table sort). */
export const CALL_RECORDING_LIST_MAX_PAGE_SIZE = 200;

const assertNoExc = (result) => {
  if (result?.exc_type) {
    throw new Error(extractErrorMessage({ payload: result }, 'Request failed.'));
  }
};

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return tags.trim() ? [tags.trim()] : [];
    }
  }
  return [];
}

function normalizeCallRecordingRecord(record) {
  if (!record || typeof record !== 'object') return {};
  return {
    ...record,
    tags: normalizeTags(record.tags),
  };
}

/**
 * Converts Frappe tuple filters or a compact object into listview `list_filters` payload.
 * Shape matches {@link compactLandlordListFiltersForApi} — non-empty array values per key.
 *
 * @param {unknown[] | Record<string, string | string[]> | null | undefined} filters
 */
export function compactCallRecordingListFiltersForApi(filters) {
  if (!filters) return null;

  if (!Array.isArray(filters)) {
    if (typeof filters !== 'object') return null;
    const out = {};
    for (const [key, value] of Object.entries(filters)) {
      const normalized = Array.isArray(value) ? value : [value];
      const cleaned = normalized.map((item) => String(item ?? '').trim()).filter(Boolean);
      if (cleaned.length > 0) out[key] = cleaned;
    }
    return Object.keys(out).length > 0 ? out : null;
  }

  const out = {};
  for (const entry of filters) {
    if (!Array.isArray(entry) || entry.length < 3) continue;
    const [field, op, value] = entry;
    if (op !== '=' || value == null || value === '') continue;
    const key = String(field);
    if (!out[key]) out[key] = [];
    const next = String(value).trim();
    if (next && !out[key].includes(next)) out[key].push(next);
  }
  return Object.keys(out).length > 0 ? out : null;
}

function unwrapListViewMessage(response) {
  const body = response?.data;
  assertNoExc(body);
  return body?.message && typeof body.message === 'object' ? body.message : (body?.message ?? body);
}

function unwrapDetailedViewMessage(response) {
  const body = response?.data;
  assertNoExc(body);
  const message = body?.message ?? body;
  if (message && typeof message === 'object' && message.data && typeof message.data === 'object') {
    return message.data;
  }
  return message && typeof message === 'object' ? message : {};
}

/**
 * @param {{
 *   filters?: unknown[] | Record<string, string | string[]>,
 *   keyword?: string,
 *   page?: number,
 *   pageSize?: number,
 *   order_by?: string,
 * }} payload
 */
export async function fetchKnowledgeCenterCallRecordingList(payload = {}) {
  const {
    filters = [],
    keyword = '',
    page = 1,
    pageSize = CALL_RECORDING_LIST_DEFAULT_PAGE_SIZE,
    order_by = 'modified desc',
  } = payload;

  const params = {
    page,
    page_size: pageSize,
    keyword: String(keyword ?? '').trim(),
    order_by,
  };

  const compactFilters = compactCallRecordingListFiltersForApi(filters);
  if (compactFilters) {
    params.list_filters = JSON.stringify(compactFilters);
  }

  const response = await apiClient.get(LIST_VIEW_PATH, { params });
  const msg = unwrapListViewMessage(response);

  const rows = Array.isArray(msg?.results)
    ? msg.results.map(normalizeCallRecordingRecord)
    : Array.isArray(msg?.data)
      ? msg.data.map(normalizeCallRecordingRecord)
      : [];

  return {
    data: rows,
    total: Number(msg?.total_count ?? msg?.count ?? rows.length),
    page: Number(msg?.page ?? page),
    pageSize: Number(msg?.page_size ?? pageSize),
    totalPages: Number(msg?.total_pages ?? 1),
  };
}

/**
 * Sidebar company counts — respects center/client/call_type filters only (not keyword or company tab).
 * @param {{ filters?: unknown[] | Record<string, string | string[]> }} payload
 */
export async function fetchKnowledgeCenterCallRecordingCategoryCounts(payload = {}) {
  const { filters = [] } = payload;
  const params = {};
  const compactFilters = compactCallRecordingListFiltersForApi(filters);
  if (compactFilters) {
    params.list_filters = JSON.stringify(compactFilters);
  }

  const response = await apiClient.get(COMPANY_COUNTS_PATH, { params });
  const msg = unwrapListViewMessage(response);
  const byCompany = msg?.by_company ?? msg?.company_counts;

  return {
    total: Number(msg?.total ?? msg?.total_count ?? 0),
    byCompany: byCompany && typeof byCompany === 'object' ? byCompany : {},
  };
}

/** @param {string} name */
export async function fetchKnowledgeCenterCallRecordingDetail(name) {
  const response = await apiClient.get(`${RESOURCE_PATH}/${encodeURIComponent(String(name))}`);
  const body = response?.data;
  assertNoExc(body);
  return normalizeCallRecordingRecord(body?.data ?? body);
}

/** @param {string} name */
export async function fetchKnowledgeCenterCallRecordingDetailedView(name) {
  const response = await apiClient.get(DETAILED_VIEW_PATH, {
    params: { name: String(name) },
  });
  return normalizeCallRecordingRecord(unwrapDetailedViewMessage(response));
}

/**
 * @param {Record<string, unknown>} payload
 */
export async function createKnowledgeCenterCallRecording(payload) {
  const response = await apiClient.post(CREATE_PATH, payload);
  const body = response?.data;
  assertNoExc(body);
  const record = body?.message ?? body?.data ?? body;
  return normalizeCallRecordingRecord(record);
}

/**
 * @param {string} name
 * @param {Record<string, unknown>} payload
 */
export async function updateKnowledgeCenterCallRecording(name, payload) {
  const response = await apiClient.post(UPDATE_PATH, {
    name: String(name),
    ...payload,
  });
  const body = response?.data;
  assertNoExc(body);
  const record = body?.message ?? body?.data ?? body;
  return normalizeCallRecordingRecord(record);
}

/** @param {string} name */
export async function deleteKnowledgeCenterCallRecording(name) {
  const response = await apiClient.post(DELETE_PATH, { name: String(name) });
  assertNoExc(response?.data);
  return { ok: true };
}

/**
 * @param {string} docname
 * @param {File[] | FileList} files
 */
export async function uploadKnowledgeCenterCallRecordingFiles(docname, files) {
  const fileArray = [...(files || [])];
  if (fileArray.length === 0) return;

  await Promise.all(
    fileArray.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('doctype', KNOWLEDGE_CENTER_CALL_RECORDING_DOCTYPE);
      formData.append('docname', docname);
      formData.append('is_private', 0);
      const response = await apiClient.post('/method/upload_file', formData);
      assertNoExc(response?.data);
    }),
  );
}

/** @param {string} fileUrl */
export async function deleteKnowledgeCenterCallRecordingAttachment(fileUrl) {
  const response = await apiClient.post('/method/devx.api.core.delete_file_by_url', {
    file_url: String(fileUrl).trim(),
  });
  assertNoExc(response?.data);
  return { ok: true };
}

/**
 * Maps API/list row attachments for AttachmentList.
 * @param {object} [record]
 */
export function mapKnowledgeCenterCallRecordingAttachments(record) {
  if (!record) return [];

  const fromApi = record.attachments;
  if (Array.isArray(fromApi) && fromApi.length > 0) {
    return fromApi
      .map((att, index) => {
        const fileUrl = att.file_url || att.fileUrl || att.file || att.url;
        if (!fileUrl) return null;
        const fileName =
          att.file_name || att.fileName || att.filename || fileUrl.split('/').pop() || 'Recording';
        return {
          id: att.name || fileUrl || `att-${index}`,
          fileName,
          fileUrl,
          size: att.file_size ?? att.size ?? 0,
          createdAt: att.creation ?? att.created_at,
          childRowId: att.name || fileUrl,
          isExisting: true,
        };
      })
      .filter(Boolean);
  }

  if (record.attachment) {
    const fileUrl = record.attachment;
    const fileName = decodeURIComponent(
      (String(fileUrl).split('/').pop() || 'recording.mp3').split(/[#?]/)[0],
    );
    return [
      {
        id: fileUrl,
        fileName,
        fileUrl,
        isExisting: true,
        childRowId: fileUrl,
      },
    ];
  }

  return [];
}
