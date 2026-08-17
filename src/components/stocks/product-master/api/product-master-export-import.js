import apiClient from '@/api/axios';
import { STOCKS_FILTER_VALUE_ALL } from '@/components/stocks/shared/constants';

const PRODUCT_MASTER_EXPORT_ENDPOINT =
  '/method/devx.stock_management.api.api_product_master.export_product_master';
const PRODUCT_MASTER_SAMPLE_ENDPOINT =
  '/method/devx.stock_management.api.api_product_master.download_product_master_import_sample';
const PRODUCT_MASTER_IMPORT_ENDPOINT =
  '/method/devx.stock_management.api.api_product_master.import_product_master';

function triggerBrowserDownload(blob, filename) {
  const downloadBlob =
    blob instanceof Blob
      ? blob
      : new Blob([blob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
  const url = URL.createObjectURL(downloadBlob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function resolveFilename(response, fallback) {
  const disposition = response?.headers?.['content-disposition'] || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] || fallback;
}

export async function downloadProductMasterExport({
  columns = [],
  keyword = '',
  categoryFilter = [],
  orderBy = '',
  itemNames = [],
} = {}) {
  const body = {
    columns: JSON.stringify(columns),
    keyword: String(keyword || '').trim(),
  };
  if (orderBy) body.order_by = orderBy;
  if (Array.isArray(itemNames) && itemNames.length > 0) {
    body.item_names = JSON.stringify(itemNames);
  }

  const groups = (Array.isArray(categoryFilter) ? categoryFilter : []).filter(
    (value) => value && value !== STOCKS_FILTER_VALUE_ALL,
  );
  if (groups.length === 1) {
    body.item_group = groups[0];
  } else if (groups.length > 1) {
    body.filters = JSON.stringify([['item_group', 'in', groups]]);
  }

  const response = await apiClient.post(PRODUCT_MASTER_EXPORT_ENDPOINT, body, {
    responseType: 'blob',
  });
  const blob = response?.data;
  if (!blob) throw new Error('No export file was returned.');

  if (blob.type && blob.type.includes('application/json')) {
    const text = await blob.text();
    let message = 'Failed to export products.';
    try {
      const parsed = JSON.parse(text);
      message = parsed?.exception || parsed?.message || message;
    } catch {
      // keep default
    }
    throw new Error(message);
  }

  const filename = resolveFilename(response, `product_master_export_${Date.now()}.xlsx`);
  triggerBrowserDownload(blob, filename);
  return filename;
}

export async function downloadProductMasterImportSample() {
  const response = await apiClient.get(PRODUCT_MASTER_SAMPLE_ENDPOINT, {
    responseType: 'blob',
  });
  const blob = response?.data;
  if (!blob) throw new Error('No sample file was returned.');
  if (blob.type && blob.type.includes('application/json')) {
    const text = await blob.text();
    throw new Error(text || 'Failed to download sample.');
  }
  const filename = resolveFilename(response, 'product_master_import_sample.xlsx');
  triggerBrowserDownload(blob, filename);
  return filename;
}

export async function importProductMasterFile(file) {
  if (!(file instanceof File)) {
    throw new TypeError('Please choose an Excel file to import.');
  }
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post(PRODUCT_MASTER_IMPORT_ENDPOINT, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const result = response?.data;
  if (result?.exc_type) {
    throw new Error(
      result?.exception ||
        (typeof result?.message === 'string' ? result.message : null) ||
        'Failed to import products.',
    );
  }
  return result?.message ?? result ?? null;
}
