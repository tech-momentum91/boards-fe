import apiClient from '@/api/axios';

/** Normalize UI file entries (`{ file }`) or raw `File` instances for upload. */
export function filterStocksUploadFiles(files) {
  return (Array.isArray(files) ? files : [])
    .map((entry) => (entry?.file instanceof File ? entry.file : entry))
    .filter((file) => file instanceof File);
}

/** Append scalar / object payload fields as flat multipart form entries. */
export function appendStocksFormFields(formData, payload) {
  if (!payload || typeof payload !== 'object') return;

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'object') {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  }
}

/** Append stock photo files as `files[]`. */
export function appendStocksUploadFiles(formData, files) {
  for (const file of filterStocksUploadFiles(files)) {
    formData.append('files[]', file);
  }
}

/**
 * POST save with flat fields; optional `files[]` (photos) and `document` (GRN).
 */
export async function postStocksMultipartRequest(endpoint, payload, files, documents) {
  const imageFiles = filterStocksUploadFiles(files);
  const receiptFile = filterStocksUploadFiles(documents)[0];

  if (imageFiles.length === 0 && !receiptFile) {
    return apiClient.post(endpoint, payload);
  }

  const formData = new FormData();
  appendStocksFormFields(formData, payload);
  appendStocksUploadFiles(formData, imageFiles);

  if (receiptFile) {
    formData.append('document', receiptFile);
  }

  return apiClient.post(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
