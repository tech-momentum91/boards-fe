import { fetchLayoutExportItemForFloor, postGetLayoutExportData } from '@/api/layoutExport';
import { drawAnnotationHighlight } from '@/components/ui/proposal-builder/proposal-template/sections/proposal-floor-plan-canvas-renderer';
import { loadCanvasSafeImage } from '@/utils/canvas-safe-image';
import {
  collectLayoutImageSrcCandidates,
  getLayoutExportImagePathFromRecord,
} from '@/utils/layout-image-path';
import { layoutCoordinatePointsToAnnotation } from '@/utils/layout-coordinate-payload';
import {
  buildLayoutAnnotationsFromSpaces,
  extractLayoutCoordinatePairs,
  getLayoutFloorLabel,
  resolveLayoutListAnnotationStyle,
} from '@/utils/space-layout-list-utils';

const DOWNLOAD_STAGGER_MS = 350;

function sanitizeFilenamePart(value) {
  return String(value || 'layout')
    .trim()
    .replaceAll(/[^\w.-]+/gu, '_')
    .replaceAll(/_+/gu, '_')
    .replaceAll(/^_|_$/gu, '');
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = String(dataUrl).split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = Object.assign(document.createElement('a'), {
    href: url,
    download: filename,
  });
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function resolveExportItemImagePath(record) {
  if (!record || typeof record !== 'object') return '';
  return (
    getLayoutExportImagePathFromRecord(record) ||
    getLayoutExportImagePathFromRecord(record.floor || {})
  );
}

async function loadExportLayoutImage({ imagePath = '', exportRecord = null } = {}) {
  const resolvedPath =
    resolveExportItemImagePath(exportRecord) ||
    getLayoutExportImagePathFromRecord({ layout_image: imagePath }) ||
    String(imagePath || '').trim();

  const candidates = collectLayoutImageSrcCandidates(resolvedPath);
  const uniqueCandidates = [...new Set(candidates.filter(Boolean))];

  for (const src of uniqueCandidates) {
    const image = await loadCanvasSafeImage(src);
    if (image?.naturalWidth) return image;
  }

  return null;
}

function buildExportFilename(item) {
  const centerName = sanitizeFilenamePart(item?.center_name || item?.center_id || 'center');
  const floorLabel = sanitizeFilenamePart(
    item?.floor_label || getLayoutFloorLabel(item?.floor || item),
  );
  return `${centerName}_${floorLabel}.png`;
}

function buildSpaceDetailExportFilename(spaceName) {
  const label = sanitizeFilenamePart(spaceName || 'space');
  return `${label}_layout.png`;
}

/**
 * Render a floor layout with marked space coordinates to a PNG data URL (full image resolution).
 *
 * @param {{
 *   image: HTMLImageElement,
 *   annotations: object[],
 *   resolveAnnotationStyle?: (ann: object) => { fill?: string, stroke?: string, strokeWidth?: number } | undefined,
 * }} params
 * @returns {string | null}
 */
export function renderSpaceLayoutFloorPlanToDataUrl({
  image,
  annotations = [],
  resolveAnnotationStyle = resolveLayoutListAnnotationStyle,
} = {}) {
  if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return null;

  const natW = image.naturalWidth;
  const natH = image.naturalHeight;
  const transform = { offsetX: 0, offsetY: 0, drawW: natW, drawH: natH };

  const canvas = document.createElement('canvas');
  canvas.width = natW;
  canvas.height = natH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(image, 0, 0, natW, natH);

  for (const ann of annotations) {
    const style = resolveAnnotationStyle?.(ann);
    if (style) drawAnnotationHighlight(ctx, ann, style, transform);
  }

  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

/**
 * Build a single-space annotation from raw layout coordinate data.
 *
 * @param {unknown} layoutCoordinate
 * @param {number} imageWidth
 * @param {number} imageHeight
 * @returns {object | null}
 */
export function buildSpaceDetailLayoutExportAnnotation(
  layoutCoordinate,
  imageWidth = 0,
  imageHeight = 0,
) {
  const pairs = extractLayoutCoordinatePairs(layoutCoordinate, imageWidth, imageHeight);
  if (pairs.length === 0) return null;
  return layoutCoordinatePointsToAnnotation('space-detail-export', 'space', pairs);
}

/**
 * Download the floor layout PNG with a single marked space region.
 *
 * @param {{
 *   layoutImagePath: string,
 *   layoutCoordinate: unknown,
 *   spaceName?: string,
 *   annotation?: object | null,
 *   style?: { fill?: string, stroke?: string, strokeWidth?: number },
 * }} params
 * @returns {Promise<void>}
 */
export async function downloadSpaceDetailLayoutImage({
  layoutImagePath,
  layoutExportRecord = null,
  layoutCoordinate,
  spaceName = '',
  annotation = null,
  style,
  centerId = '',
  floorRef = '',
  blockFloorId = '',
} = {}) {
  let exportRecord = layoutExportRecord;

  if (centerId && (floorRef || blockFloorId)) {
    try {
      const apiExportItem = await fetchLayoutExportItemForFloor({
        center: centerId,
        floor_ref: floorRef,
        block_floor_id: blockFloorId,
      });
      if (apiExportItem) {
        exportRecord = apiExportItem;
      }
    } catch {
      // Fall back to locally loaded floor payload when export API is unavailable.
    }
  }

  const imagePath =
    resolveExportItemImagePath(exportRecord) ||
    getLayoutExportImagePathFromRecord({ layout_image: layoutImagePath }) ||
    String(layoutImagePath || '').trim();

  if (!imagePath) {
    throw new Error('No layout image is available for this floor.');
  }

  const image = await loadExportLayoutImage({
    imagePath: layoutImagePath,
    exportRecord,
  });
  if (!image) {
    throw new Error('Failed to load layout image for download.');
  }

  const exportAnnotation =
    annotation ||
    buildSpaceDetailLayoutExportAnnotation(
      layoutCoordinate,
      image.naturalWidth,
      image.naturalHeight,
    );

  if (!exportAnnotation) {
    throw new Error('No layout coordinates are mapped for this space.');
  }

  const dataUrl = renderSpaceLayoutFloorPlanToDataUrl({
    image,
    annotations: [exportAnnotation],
    resolveAnnotationStyle: style ? () => style : undefined,
  });

  if (!dataUrl) {
    throw new Error('Failed to generate layout image.');
  }

  downloadBlob(dataUrlToBlob(dataUrl), buildSpaceDetailExportFilename(spaceName));
}

/**
 * @param {object} item
 * @returns {Promise<Blob | null>}
 */
export async function renderLayoutExportItemToBlob(item) {
  const imagePath = resolveExportItemImagePath(item);
  if (!imagePath) return null;

  const image = await loadExportLayoutImage({
    imagePath,
    exportRecord: item,
  });
  if (!image) return null;

  const spaces = Array.isArray(item?.spaces) ? item.spaces : [];
  const annotations = buildLayoutAnnotationsFromSpaces(
    spaces,
    image.naturalWidth,
    image.naturalHeight,
  );

  const dataUrl = renderSpaceLayoutFloorPlanToDataUrl({ image, annotations });
  if (!dataUrl) return null;
  return dataUrlToBlob(dataUrl);
}

async function downloadItemsClientSide(items, onProgress) {
  let downloaded = 0;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (index > 0) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, DOWNLOAD_STAGGER_MS);
      });
    }

    const blob = await renderLayoutExportItemToBlob(item);
    if (!blob) continue;

    downloadBlob(blob, buildExportFilename(item));
    downloaded += 1;
    onProgress?.({ completed: downloaded, total: items.length });
  }
  return downloaded;
}

/**
 * Export layout PNG(s) with space coordinates for pre-fetched floor items.
 *
 * @param {{
 *   items?: object[],
 *   onProgress?: (state: { completed: number, total: number }) => void,
 * }} params
 * @returns {Promise<{ downloaded: number, total: number }>}
 */
export async function downloadSpaceLayoutExportItems({ items = [], onProgress } = {}) {
  const exportItems = Array.isArray(items) ? items : [];
  if (exportItems.length === 0) {
    return { downloaded: 0, total: 0 };
  }

  const downloaded = await downloadItemsClientSide(exportItems, onProgress);
  return { downloaded, total: exportItems.length };
}

/**
 * Export layout PNG(s) with space coordinates for the selected scope.
 *
 * @param {{
 *   center?: string | string[] | null,
 *   floor_ref?: string | null,
 *   floor_refs?: string[] | null,
 *   block_floor_id?: string | null,
 *   all_centers?: boolean,
 *   keyword?: string,
 *   filters?: object,
 *   onProgress?: (state: { completed: number, total: number }) => void,
 * }} params
 * @returns {Promise<{ downloaded: number, total: number }>}
 */
export async function exportSpaceLayoutImages({
  center = null,
  floor_ref = null,
  floor_refs = null,
  block_floor_id = null,
  all_centers = false,
  keyword = '',
  filters = {},
  onProgress,
} = {}) {
  const floorRefList = (Array.isArray(floor_refs) ? floor_refs : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const { items: fetchedItems = [], floorCount = 0 } = await postGetLayoutExportData({
    center: center || undefined,
    floor_ref: floor_ref || undefined,
    floor_refs: floorRefList.length > 1 ? floorRefList : undefined,
    block_floor_id: block_floor_id || undefined,
    all_centers,
    keyword,
    filters,
  });
  let items = fetchedItems;

  if (floorRefList.length > 1) {
    const selectedFloorRefs = new Set(floorRefList);
    items = items.filter((item) => selectedFloorRefs.has(String(item?.floor_ref || '').trim()));
  }

  if (items.length === 0) {
    return { downloaded: 0, total: floorCount };
  }

  const downloaded = await downloadItemsClientSide(items, onProgress);
  return { downloaded, total: items.length };
}
