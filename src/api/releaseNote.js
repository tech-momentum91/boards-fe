import { format } from 'date-fns';

import apiClient from '@/api/axios';

export const GET_RELEASE_NOTE_LISTVIEW_API =
  '/method/devx.user_support.api.api_release_notes.get_release_note_listview';
export const GET_RELEASE_NOTE_MODULE_FILTERS_API =
  '/method/devx.user_support.api.api_release_notes.get_release_note_module_filters';
export const UPLOAD_RELEASE_NOTE_EDITOR_IMAGE_API =
  '/method/devx.user_support.api.api_release_notes.upload_release_note_editor_image';
export const DELETE_RELEASE_NOTE_EDITOR_IMAGE_API =
  '/method/devx.user_support.api.api_release_notes.delete_release_note_editor_image';

const extractServerMessage = (result) => {
  if (!result?._server_messages) return result?.message;
  try {
    const parsed = JSON.parse(result._server_messages);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.at(-1);
    }
    return result?.message;
  } catch {
    return result?.message;
  }
};

const assertNoExc = (result) => {
  if (result?.exc_type) {
    throw new Error(extractServerMessage(result) || 'Request failed.');
  }
};

/**
 * Builds listview filters for {@link getReleaseNoteListview}.
 *
 * @param {{ published?: boolean, draft?: boolean, modules?: string[] }} applied
 * @returns {Array<[string, string, unknown]>}
 */
export function buildReleaseNoteListviewFilters(applied = {}) {
  const tuples = [];
  const modules = Array.isArray(applied.modules)
    ? applied.modules.map((m) => String(m ?? '').trim()).filter(Boolean)
    : [];

  if (modules.length > 0) {
    tuples.push(['module', 'in', [...modules]]);
  }

  const published = applied.published !== false;
  const draft = applied.draft !== false;

  if (published && draft) {
    /* show all statuses */
  } else if (published && !draft) {
    tuples.push(['is_published', '=', 1]);
  } else if (!published && draft) {
    tuples.push(['is_published', '=', 0]);
  } else {
    tuples.push(['name', '=', '__release_note_none__']);
  }

  return tuples;
}

/**
 * @param {{ keyword?: string, filters?: unknown[], month: string }} payload
 */
export async function getReleaseNoteListview({ keyword = '', filters = [], month }) {
  const response = await apiClient.post(GET_RELEASE_NOTE_LISTVIEW_API, {
    keyword,
    filters,
    month,
  });
  const result = response?.data;
  assertNoExc(result);

  const raw =
    result?.message && typeof result.message === 'object'
      ? result.message
      : (result?.message ?? result);

  return {
    month: raw?.month ?? month ?? '',
    keyword: raw?.keyword ?? keyword ?? '',
    count: Number(raw?.count ?? 0),
    results: Array.isArray(raw?.results) ? raw.results : [],
    quick_links: Array.isArray(raw?.quick_links) ? raw.quick_links : [],
  };
}

/**
 * @typedef {{ value: string, label: string }} ReleaseNoteModuleFilterOption
 */

/**
 * @param {unknown} raw
 * @returns {ReleaseNoteModuleFilterOption[]}
 */
export function normalizeReleaseNoteModuleFilterOptions(raw) {
  let items = [];
  if (typeof raw === 'string') {
    items = raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  } else if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.modules)) items = raw.modules;
    else if (Array.isArray(raw.results)) items = raw.results;
  }

  return items
    .map((item) => {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        return trimmed ? { value: trimmed, label: trimmed } : null;
      }
      if (item && typeof item === 'object') {
        const value = String(item.value ?? item.module ?? item.name ?? item.label ?? '').trim();
        const label = String(item.label ?? item.module ?? item.name ?? item.value ?? '').trim();
        return value ? { value, label: label || value } : null;
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * Fetches distinct module values for the release note filter popover.
 * @returns {Promise<ReleaseNoteModuleFilterOption[]>}
 */
export async function getReleaseNoteModuleFilters() {
  const response = await apiClient.post(GET_RELEASE_NOTE_MODULE_FILTERS_API);
  const result = response?.data;
  assertNoExc(result);

  const raw =
    result?.message && typeof result.message === 'object'
      ? result.message
      : (result?.message ?? result);

  return normalizeReleaseNoteModuleFilterOptions(raw);
}

/** Frappe doctype / resource name (path segment is URL-encoded when calling the API) */
export const RELEASE_NOTE_DOCTYPE = 'Release Note';

/**
 * Builds the POST body for `Release Note` create, including full HTML in `description`
 * (e.g. embedded `<img src="...">` from the rich text editor).
 *
 * @param {Object} p
 * @param {string[]} p.releaseType
 * @param {string} p.title
 * @param {string} p.description – HTML as produced by the editor
 * @param {string[]} p.moduleNames – module tag values
 * @param {boolean} p.isPublished
 * @param {Date} p.releaseDate
 */
function normalizeReleaseNoteModuleNames(moduleNames = []) {
  return (Array.isArray(moduleNames) ? moduleNames : [])
    .map((m) => String(m ?? '').trim())
    .filter(Boolean);
}

export function buildCreateReleaseNotePayload({
  releaseType,
  title,
  description,
  moduleNames = [],
  isPublished,
  releaseDate,
}) {
  const modules = normalizeReleaseNoteModuleNames(moduleNames).join(',');
  const releaseTypeValue = (Array.isArray(releaseType) ? releaseType : [])
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .join(',');

  return {
    release_type: releaseTypeValue,
    title: title ?? '',
    description: description ?? '',
    modules,
    is_published: isPublished ? 1 : 0,
    release_date: format(releaseDate, 'yyyy-MM-dd'),
  };
}

/**
 * POST /api/resource/Release%20Note
 * @param {ReturnType<typeof buildCreateReleaseNotePayload>} payload
 */
export async function postReleaseNote(payload) {
  const path = `/resource/${encodeURIComponent(RELEASE_NOTE_DOCTYPE)}`;
  const { data: body } = await apiClient.post(path, payload);
  if (body?.data != null) return body.data;
  if (body?.message != null) return body.message;
  return body;
}

/**
 * PUT body for updating an existing Release Note (document name e.g. `RN-01`).
 *
 * @param {Object} p
 * @param {string[]} p.releaseType
 * @param {string} p.title
 * @param {string} p.description
 * @param {string[]} p.moduleNames
 * @param {boolean} p.isPublished
 * @param {Date} p.releaseDate
 */
export function buildUpdateReleaseNotePayload({
  releaseType,
  title,
  description,
  moduleNames = [],
  isPublished,
  releaseDate,
}) {
  const modules = normalizeReleaseNoteModuleNames(moduleNames).join(',');
  const releaseTypeValue = (Array.isArray(releaseType) ? releaseType : [])
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .join(',');

  return {
    release_type: releaseTypeValue,
    title: title ?? '',
    description: description ?? '',
    modules,
    is_published: isPublished ? 1 : 0,
    release_date: format(releaseDate, 'yyyy-MM-dd'),
  };
}

/**
 * Upload a release-note editor image and return its URL/path.
 *
 * @param {File} file
 * @param {{ onProgress?: (event: { progress: number }) => void, signal?: AbortSignal }} [opts]
 * @returns {Promise<string>}
 */
export async function uploadReleaseNoteEditorImage(file, opts = {}) {
  if (!(file instanceof File)) {
    throw new TypeError('Valid image file is required.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post(UPLOAD_RELEASE_NOTE_EDITOR_IMAGE_API, formData, {
    signal: opts.signal,
    onUploadProgress: (event) => {
      const total = Number(event?.total ?? 0);
      const loaded = Number(event?.loaded ?? 0);
      const progress = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
      opts.onProgress?.({ progress });
    },
  });

  const result = response?.data;
  assertNoExc(result);

  const message = result?.message;
  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }
  const urlCandidate =
    message?.file_url ??
    message?.url ??
    message?.image_url ??
    message?.file ??
    result?.file_url ??
    result?.url;
  if (typeof urlCandidate === 'string' && urlCandidate.trim()) {
    return urlCandidate.trim();
  }
  throw new Error('Image upload succeeded but no file URL returned.');
}

/**
 * Delete a previously uploaded release-note editor image by file URL/path.
 *
 * @param {string} fileUrl
 * @returns {Promise<unknown>}
 */
export async function deleteReleaseNoteEditorImage(fileUrl) {
  const normalized = String(fileUrl ?? '').trim();
  if (!normalized) {
    throw new Error('Image URL is required to delete image.');
  }

  const response = await apiClient.post(DELETE_RELEASE_NOTE_EDITOR_IMAGE_API, {
    file_url: normalized,
  });
  const result = response?.data;
  assertNoExc(result);
  return result?.message ?? result;
}

/**
 * PUT /api/resource/Release%20Note/{name}
 * @param {string} name – document id / version name (e.g. `RN-01`)
 * @param {ReturnType<typeof buildUpdateReleaseNotePayload>} payload
 */
export async function putReleaseNote(name, payload) {
  const doc = encodeURIComponent(RELEASE_NOTE_DOCTYPE);
  const docName = encodeURIComponent(String(name ?? '').trim());
  const path = `/resource/${doc}/${docName}`;
  const { data: body } = await apiClient.put(path, payload);
  if (body?.data != null) return body.data;
  if (body?.message != null) return body.message;
  return body;
}

/**
 * DELETE /api/resource/Release%20Note/{name}
 * @param {string} name – document id / version name (e.g. `RN-01`)
 */
export async function deleteReleaseNote(name) {
  const doc = encodeURIComponent(RELEASE_NOTE_DOCTYPE);
  const docName = encodeURIComponent(String(name ?? '').trim());
  const path = `/resource/${doc}/${docName}`;
  const { data: body } = await apiClient.delete(path);
  if (body?.data != null) return body.data;
  if (body?.message != null) return body.message;
  return body;
}
