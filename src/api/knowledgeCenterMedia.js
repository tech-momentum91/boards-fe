import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

const LIST_PATH =
  '/method/devx.knowledge_center.api.knowledge_center_media.list_knowledge_center_media';
const COUNTS_PATH =
  '/method/devx.knowledge_center.api.knowledge_center_media.get_knowledge_center_media_category_counts';
const CREATE_PATH =
  '/method/devx.knowledge_center.api.knowledge_center_media.create_knowledge_center_media';
const GET_PATH =
  '/method/devx.knowledge_center.api.knowledge_center_media.get_knowledge_center_media';
const UPDATE_PATH =
  '/method/devx.knowledge_center.api.knowledge_center_media.update_knowledge_center_media';
const DELETE_PATH =
  '/method/devx.knowledge_center.api.knowledge_center_media.delete_knowledge_center_media';
const LIST_FLOORS_WITHOUT_LAYOUT_IMAGE_PATH =
  '/method/devx.knowledge_center.api.knowledge_center_media.list_floors_without_layout_image';

const DOCTYPE = 'Knowledge Center Media';

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

function normalizeMediaDetailRecord(record) {
  if (!record || typeof record !== 'object') return {};
  return {
    ...record,
    tags: normalizeTags(record.tags),
  };
}

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
export async function fetchKnowledgeCenterMediaList(payload = {}) {
  const response = await apiClient.post(LIST_PATH, payload);
  const msg = unwrapMessage(response);
  return {
    data: Array.isArray(msg?.data) ? msg.data : [],
    total: Number(msg?.total ?? 0),
  };
}

/**
 * Sidebar counts — respects center/client filters only (not keyword or media_type tab).
 * @param {{ filters?: unknown[] }} payload
 */
export async function fetchKnowledgeCenterMediaCategoryCounts(payload = {}) {
  const response = await apiClient.post(COUNTS_PATH, payload);
  const msg = unwrapMessage(response);
  const byMediaType = msg?.by_media_type;
  return {
    total: Number(msg?.total ?? 0),
    byMediaType: byMediaType && typeof byMediaType === 'object' ? byMediaType : {},
  };
}

/**
 * Build multipart body for create/update knowledge center media (layout upload).
 * @param {{
 *   media_name: string,
 *   description?: string,
 *   center?: string,
 *   floor?: string,
 *   space?: string,
 *   client?: string,
 *   matterport_url?: string,
 *   presentation_url?: string,
 *   tags?: string[],
 *   is_active?: number,
 *   media_type?: string,
 *   layoutFile?: File | null,
 * }} fields
 */
export function buildKnowledgeCenterMediaFormData(fields) {
  const fd = new FormData();
  fd.append('media_name', String(fields.media_name ?? '').trim());
  fd.append('description', String(fields.description ?? '').trim());
  fd.append('center', String(fields.center ?? ''));
  fd.append('floor', String(fields.floor ?? ''));
  fd.append('space', String(fields.space ?? ''));
  fd.append('client', String(fields.client ?? ''));
  fd.append('matterport_url', String(fields.matterport_url ?? ''));
  fd.append('presentation_url', String(fields.presentation_url ?? ''));
  fd.append('tags', JSON.stringify(Array.isArray(fields.tags) ? fields.tags : []));
  fd.append('is_active', String(fields.is_active ?? 1));
  if (fields.media_type) {
    fd.append('media_type', String(fields.media_type).trim());
  }
  if (fields.layoutFile instanceof File) {
    fd.append('layout_file', fields.layoutFile);
  }
  return fd;
}

/**
 * @param {FormData | Record<string, unknown>} payload
 */
export async function createKnowledgeCenterMedia(payload) {
  const response = await apiClient.post(CREATE_PATH, payload);
  const msg = unwrapMessage(response);
  return msg && typeof msg === 'object' ? msg : {};
}

/** @param {string} name */
export async function fetchKnowledgeCenterMediaDetail(name) {
  const response = await apiClient.post(GET_PATH, { name: String(name) });
  const msg = unwrapMessage(response);
  return normalizeMediaDetailRecord(msg);
}

/**
 * @param {string} name
 * @param {FormData | Record<string, unknown>} payload
 */
export async function updateKnowledgeCenterMedia(name, payload) {
  let body = payload;
  if (payload instanceof FormData) {
    if (!payload.has('name')) {
      payload.append('name', String(name));
    }
  } else {
    body = { name: String(name), ...payload };
  }
  const response = await apiClient.post(UPDATE_PATH, body);
  const msg = unwrapMessage(response);
  return normalizeMediaDetailRecord(msg);
}

function normalizeFloorSelectOptions(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      if (typeof row === 'string') {
        const value = row.trim();
        return value ? { value, label: value } : null;
      }
      if (!row || typeof row !== 'object') return null;
      const value = String(
        row.block_floor_id ?? row.value ?? row.name ?? row.floor_ref ?? row.floor ?? '',
      ).trim();
      if (!value) return null;
      const label = String(
        row.label ?? row.floor ?? row.block_floor_id ?? row.name ?? value,
      ).trim();
      return { value, label: label || value };
    })
    .filter(Boolean);
}

/**
 * Floors in a center that do not yet have a layout image (for KC layout uploads).
 * @param {string} center — Center doc name (e.g. CTR-05)
 */
export async function fetchFloorsWithoutLayoutImage(center) {
  const centerId = String(center ?? '').trim();
  if (!centerId) return [];

  const response = await apiClient.post(LIST_FLOORS_WITHOUT_LAYOUT_IMAGE_PATH, {
    center: centerId,
  });
  const msg = unwrapMessage(response);
  const rows = Array.isArray(msg)
    ? msg
    : Array.isArray(msg?.data)
      ? msg.data
      : Array.isArray(msg?.floors)
        ? msg.floors
        : [];
  return normalizeFloorSelectOptions(rows);
}

/**
 * Resolve remove_floor_layout payload from a Knowledge Center Layout media row.
 * @param {object} [row]
 */
export function resolveKnowledgeCenterLayoutRemovalParams(row) {
  if (!row || typeof row !== 'object') {
    return { center: '', block_floor_id: '', file_id: '' };
  }

  const center = String(row.center ?? '').trim();
  const blockFloorId = String(row.block_floor_id ?? row.floor ?? '').trim();

  let fileId = String(row.layout_file_id ?? row.file_id ?? '').trim();
  if (!fileId && Array.isArray(row.attachments)) {
    const byFlag = row.attachments.find(
      (att) => att && (att.is_layout_image === 1 || att.is_layout_image === true),
    );
    const att = byFlag ?? row.attachments[0];
    fileId = String(att?.name ?? att?.file_id ?? '').trim();
  }

  return {
    center,
    block_floor_id: blockFloorId,
    file_id: fileId,
  };
}

/** @param {string} name — Knowledge Center Media record id */
export async function deleteKnowledgeCenterMedia(name) {
  const response = await apiClient.post(DELETE_PATH, { name: String(name) });
  assertNoExc(response?.data);
  return unwrapMessage(response);
}

/** @param {string} fileUrl */
export async function deleteKnowledgeCenterMediaAttachment(fileUrl) {
  const response = await apiClient.post('/method/devx.api.core.delete_file_by_url', {
    file_url: String(fileUrl).trim(),
  });
  assertNoExc(response?.data);
  return { ok: true };
}

/**
 * Maps API/list row attachments for AttachmentList (ticket drawer shape).
 * @param {object} [record]
 */
export function mapKnowledgeCenterMediaAttachments(record) {
  if (!record) return [];

  const fromApi = record.attachments;
  if (Array.isArray(fromApi) && fromApi.length > 0) {
    return fromApi
      .map((att, index) => {
        const fileUrl = att.file_url || att.fileUrl || att.file || att.url;
        if (!fileUrl) return null;
        const fileName =
          att.file_name || att.fileName || att.filename || fileUrl.split('/').pop() || 'Attachment';
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

  const urls = Array.isArray(record.thumbnail_urls) ? record.thumbnail_urls : [];
  return urls.map((path, index) => {
    const fileName = decodeURIComponent(
      (path.split('/').pop() || `file-${index}`).split(/[#?]/)[0],
    );
    return {
      id: path,
      fileName,
      fileUrl: path,
      isExisting: true,
      childRowId: path,
    };
  });
}

/**
 * @param {string} docname
 * @param {File[] | FileList} files
 */
export async function uploadKnowledgeCenterMediaFiles(docname, files) {
  const fileArray = [...(files || [])];
  if (fileArray.length === 0) return;

  await Promise.all(
    fileArray.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('doctype', DOCTYPE);
      formData.append('docname', docname);
      formData.append('is_private', 0);
      const response = await apiClient.post('/method/upload_file', formData);
      assertNoExc(response?.data);
    }),
  );
}
