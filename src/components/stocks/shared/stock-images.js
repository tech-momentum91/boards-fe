import { resolveFileUrl } from '@/lib/utils';

/** Map Goods Receipt Note (`custom_document` path or legacy attachment rows). */
export function mapStockGrnDocumentFromApi(value) {
  const path = typeof value === 'string' ? value.trim() : '';
  if (path) {
    const segment = path.split('/').pop() || 'Document';
    let fileName = segment;
    try {
      fileName = decodeURIComponent(segment);
    } catch {
      fileName = segment;
    }
    return [
      {
        id: 'custom_document',
        name: fileName,
        image: path,
        url: resolveFileUrl(path),
        idx: 1,
      },
    ];
  }
  return mapStockImagesFromApi(Array.isArray(value) ? value : []);
}

/** Map API image rows (`stock_images`, `attachments`, etc.) for display/upload UI. */
export function mapStockImagesFromApi(rows) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row, index) => {
      if (!row || typeof row !== 'object') return null;
      const imagePath = String(row.image ?? row.file_url ?? '').trim();
      const name = String(row.file_name ?? row.name ?? '').trim();
      if (!imagePath && !name) return null;

      return {
        id: name || `stock-image-${row.idx ?? index}`,
        name,
        image: imagePath,
        url: imagePath ? resolveFileUrl(imagePath) : '',
        idx: row.idx ?? index + 1,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(a.idx ?? 0) - Number(b.idx ?? 0));
}

function getStockImageLabel(row) {
  const url = row?.image ?? row?.url;
  if (typeof url === 'string' && url.trim()) {
    const path = url.split('?')[0];
    const segment = path.split('/').pop() || '';
    try {
      return decodeURIComponent(segment) || segment || 'File';
    } catch {
      return segment || 'File';
    }
  }
  return row?.name ? String(row.name) : 'File';
}

/** Shape for `AttachmentList`. */
export function stockImagesToAttachments(rows) {
  return mapStockImagesFromApi(rows).map((row) => ({
    id: row.id,
    fileName: getStockImageLabel(row),
    fileUrl: row.url,
    childRowId: row.name || undefined,
  }));
}
