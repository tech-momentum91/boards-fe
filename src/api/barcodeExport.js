import apiClient from '@/api/axios';

const EXPORT_BARCODES_PDF_PATH =
  '/method/devx.asset_module.api.api_asset_barcode.export_barcodes_pdf';

function triggerBrowserDownload(blob, filename) {
  const downloadBlob = blob instanceof Blob ? blob : new Blob([blob], { type: 'application/pdf' });
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

/**
 * Download a printable PDF of Code128 barcode labels.
 * @param {{ assetNames?: string[], assetInNames?: string[] }} params
 */
export async function downloadBarcodesPdf({ assetNames = [], assetInNames = [] } = {}) {
  const names = Array.isArray(assetNames) ? assetNames.filter(Boolean) : [];
  const inNames = Array.isArray(assetInNames) ? assetInNames.filter(Boolean) : [];

  if (names.length === 0 && inNames.length === 0) {
    throw new Error('No assets selected for barcode export.');
  }

  const response = await apiClient.get(EXPORT_BARCODES_PDF_PATH, {
    params: {
      asset_names: JSON.stringify(names),
      asset_in_names: JSON.stringify(inNames),
    },
    responseType: 'blob',
  });

  const blob = response?.data;
  if (!blob) {
    throw new Error('No barcode PDF was returned.');
  }

  const filename = resolveFilename(response, `asset-barcodes-${Date.now()}.pdf`);
  triggerBrowserDownload(blob, filename);
  return filename;
}
