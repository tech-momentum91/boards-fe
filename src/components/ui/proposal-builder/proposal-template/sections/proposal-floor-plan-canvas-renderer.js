import { circleToPolygonPairs } from '@/utils/layout-coordinate-payload';
import { loadCanvasSafeImage } from '@/utils/canvas-safe-image';
import { computeAnnotationBBox } from '@/components/floor-plan-editor/core/annotation-bounds';
import {
  resolveProposalFloorPlanMergedAnnotationStyle,
  PROPOSAL_PAGE6_FRAME,
} from '@/components/ui/proposal-builder/proposal-template/sections/proposal-page-6-floor-plan-utils';

export { PROPOSAL_PAGE6_FRAME };

/**
 * @param {number} natW
 * @param {number} natH
 * @param {number} viewW
 * @param {number} viewH
 * @param {number} [padding]
 */
export function computeImageFitTransform(natW, natH, viewW, viewH, padding = 24) {
  const innerW = Math.max(viewW - padding * 2, 1);
  const innerH = Math.max(viewH - padding * 2, 1);
  const scale = Math.min(innerW / natW, innerH / natH);
  const drawW = natW * scale;
  const drawH = natH * scale;
  const offsetX = padding + (innerW - drawW) / 2;
  const offsetY = padding + (innerH - drawH) / 2;
  return { scale, offsetX, offsetY, drawW, drawH, natW, natH };
}

/**
 * Union bbox of all annotations in image pixel space.
 *
 * @param {object[]} annotations
 * @param {number} imageW
 * @param {number} imageH
 */
export function computeAnnotationsCombinedBBox(annotations, imageW, imageH) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const ann of annotations) {
    const bbox = computeAnnotationBBox(ann, imageW, imageH);
    if (!bbox || bbox.w <= 0 || bbox.h <= 0) continue;
    minX = Math.min(minX, bbox.x);
    minY = Math.min(minY, bbox.y);
    maxX = Math.max(maxX, bbox.x + bbox.w);
    maxY = Math.max(maxY, bbox.y + bbox.h);
  }

  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * Map a normalized viewport rect (0–1 image space) into the page-6 draw transform.
 *
 * @param {number} natW
 * @param {number} natH
 * @param {number} viewW
 * @param {number} viewH
 * @param {{ x: number, y: number, w: number, h: number }} viewport
 * @param {number} [padding]
 */
export function computeViewportRectTransform(natW, natH, viewW, viewH, viewport, padding = 24) {
  const x = Number(viewport?.x);
  const y = Number(viewport?.y);
  const w = Number(viewport?.w);
  const h = Number(viewport?.h);
  if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) {
    return computeImageFitTransform(natW, natH, viewW, viewH, padding);
  }

  const regionX = x * natW;
  const regionY = y * natH;
  const regionW = w * natW;
  const regionH = h * natH;

  const innerW = Math.max(viewW - padding * 2, 1);
  const innerH = Math.max(viewH - padding * 2, 1);
  const scale = Math.min(innerW / regionW, innerH / regionH);

  const drawW = natW * scale;
  const drawH = natH * scale;
  const regionCx = regionX + regionW / 2;
  const regionCy = regionY + regionH / 2;
  const offsetX = viewW / 2 - regionCx * scale;
  const offsetY = viewH / 2 - regionCy * scale;

  return { scale, offsetX, offsetY, drawW, drawH, natW, natH };
}

/**
 * Zoom/pan transform that fits highlighted annotation regions into the viewport.
 *
 * @param {number} natW
 * @param {number} natH
 * @param {number} viewW
 * @param {number} viewH
 * @param {object[]} annotations
 * @param {number} [padding]
 */
export function computeAnnotationsFocusTransform(
  natW,
  natH,
  viewW,
  viewH,
  annotations,
  padding = 24,
) {
  const bbox = computeAnnotationsCombinedBBox(annotations, natW, natH);
  if (!bbox) {
    return computeImageFitTransform(natW, natH, viewW, viewH, padding);
  }

  const marginRatio = 0.14;
  const marginPxX = Math.max(bbox.w * marginRatio, natW * 0.025);
  const marginPxY = Math.max(bbox.h * marginRatio, natH * 0.025);

  const regionX = Math.max(0, bbox.x - marginPxX);
  const regionY = Math.max(0, bbox.y - marginPxY);
  const regionRight = Math.min(natW, bbox.x + bbox.w + marginPxX);
  const regionBottom = Math.min(natH, bbox.y + bbox.h + marginPxY);
  const regionW = Math.max(regionRight - regionX, 1);
  const regionH = Math.max(regionBottom - regionY, 1);

  const innerW = Math.max(viewW - padding * 2, 1);
  const innerH = Math.max(viewH - padding * 2, 1);
  const scale = Math.min(innerW / regionW, innerH / regionH);

  const drawW = natW * scale;
  const drawH = natH * scale;
  const regionCx = regionX + regionW / 2;
  const regionCy = regionY + regionH / 2;
  const offsetX = viewW / 2 - regionCx * scale;
  const offsetY = viewH / 2 - regionCy * scale;

  return { scale, offsetX, offsetY, drawW, drawH, natW, natH };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x normalized 0–1
 * @param {number} y normalized 0–1
 */
function moveToImagePixel(ctx, x, y, transform) {
  ctx.moveTo(transform.offsetX + x * transform.drawW, transform.offsetY + y * transform.drawH);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 */
function lineToImagePixel(ctx, x, y, transform) {
  ctx.lineTo(transform.offsetX + x * transform.drawW, transform.offsetY + y * transform.drawH);
}

/**
 * Append a hole path in viewport coordinates (even-odd mask).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} ann
 * @param {{ offsetX: number, offsetY: number, drawW: number, drawH: number }} transform
 */
export function appendAnnotationHolePath(ctx, ann, transform) {
  if (!ann || typeof ann !== 'object') return;

  if (ann.type === 'rectangle') {
    const x = Number(ann.x);
    const y = Number(ann.y);
    const w = Number(ann.width);
    const h = Number(ann.height);
    if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return;
    ctx.moveTo(transform.offsetX + x * transform.drawW, transform.offsetY + y * transform.drawH);
    ctx.lineTo(
      transform.offsetX + (x + w) * transform.drawW,
      transform.offsetY + y * transform.drawH,
    );
    ctx.lineTo(
      transform.offsetX + (x + w) * transform.drawW,
      transform.offsetY + (y + h) * transform.drawH,
    );
    ctx.lineTo(
      transform.offsetX + x * transform.drawW,
      transform.offsetY + (y + h) * transform.drawH,
    );
    ctx.closePath();
    return;
  }

  if (ann.type === 'circle') {
    const cx = Number(ann.x);
    const cy = Number(ann.y);
    const rx = Number(ann.radiusX);
    const ry = Number(ann.radiusY);
    if (![cx, cy, rx, ry].every(Number.isFinite) || rx <= 0 || ry <= 0) return;
    const pairs = circleToPolygonPairs(cx, cy, rx, ry, 48);
    if (pairs.length === 0) return;
    ctx.moveTo(
      transform.offsetX + pairs[0][0] * transform.drawW,
      transform.offsetY + pairs[0][1] * transform.drawH,
    );
    for (let i = 1; i < pairs.length; i += 1) {
      lineToImagePixel(ctx, pairs[i][0], pairs[i][1], transform);
    }
    ctx.closePath();
    return;
  }

  const flatPoints = getAnnotationNormalizedFlatPoints(ann);
  if (flatPoints.length < 4) return;

  ctx.moveTo(
    transform.offsetX + flatPoints[0] * transform.drawW,
    transform.offsetY + flatPoints[1] * transform.drawH,
  );
  for (let i = 2; i < flatPoints.length; i += 2) {
    lineToImagePixel(ctx, flatPoints[i], flatPoints[i + 1], transform);
  }
  ctx.closePath();
}

/**
 * @param {object} ann
 * @returns {number[]}
 */
export function getAnnotationNormalizedFlatPoints(ann) {
  if (!ann || typeof ann !== 'object') return [];

  if (Array.isArray(ann.bezierPoints) && ann.bezierPoints.length > 0) {
    return ann.bezierPoints.flatMap((p) => [Number(p.x), Number(p.y)]).filter(Number.isFinite);
  }

  if (Array.isArray(ann.points) && ann.points.length >= 2) {
    return ann.points.map(Number).filter(Number.isFinite);
  }

  return [];
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} ann
 * @param {{ fill?: string, stroke?: string, strokeWidth?: number }} style
 * @param {{ offsetX: number, offsetY: number, drawW: number, drawH: number }} transform
 */
export function drawAnnotationHighlight(ctx, ann, style, transform) {
  if (!ann || !style) return;

  ctx.save();
  ctx.beginPath();

  if (ann.type === 'rectangle') {
    const x = Number(ann.x);
    const y = Number(ann.y);
    const w = Number(ann.width);
    const h = Number(ann.height);
    if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) {
      ctx.restore();
      return;
    }
    ctx.rect(
      transform.offsetX + x * transform.drawW,
      transform.offsetY + y * transform.drawH,
      w * transform.drawW,
      h * transform.drawH,
    );
  } else if (ann.type === 'circle') {
    const cx = Number(ann.x);
    const cy = Number(ann.y);
    const rx = Number(ann.radiusX);
    const ry = Number(ann.radiusY);
    if (![cx, cy, rx, ry].every(Number.isFinite) || rx <= 0 || ry <= 0) {
      ctx.restore();
      return;
    }
    ctx.ellipse(
      transform.offsetX + cx * transform.drawW,
      transform.offsetY + cy * transform.drawH,
      rx * transform.drawW,
      ry * transform.drawH,
      0,
      0,
      Math.PI * 2,
    );
  } else {
    appendAnnotationHolePath(ctx, ann, transform);
  }

  if (style.fill) {
    ctx.fillStyle = style.fill;
    ctx.fill();
  }
  if (style.stroke) {
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.strokeWidth ?? 2;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * White fade with holes cut for highlighted regions (even-odd fill).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} viewW
 * @param {number} viewH
 * @param {object[]} annotations
 * @param {{ offsetX: number, offsetY: number, drawW: number, drawH: number }} transform
 * @param {number} [opacity]
 */
export function drawWhiteSpotlightMask(ctx, viewW, viewH, annotations, transform, opacity = 0.88) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, viewW, viewH);
  for (const ann of annotations) {
    appendAnnotationHolePath(ctx, ann, transform);
  }
  ctx.fillStyle = `rgba(255,255,255,${opacity})`;
  ctx.fill('evenodd');
  ctx.restore();
}

/**
 * Render floor plan with highlights + spotlight mask onto a 2D context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{
 *   image: HTMLImageElement,
 *   annotations: object[],
 *   viewWidth: number,
 *   viewHeight: number,
 *   padding?: number,
 *   maskOpacity?: number,
 *   viewport?: { x: number, y: number, w: number, h: number } | null,
 *   resolveStyle?: (ann: object) => object | undefined,
 * }} options
 */
export function renderProposalFloorPlan(ctx, options) {
  const {
    image,
    annotations = [],
    viewWidth,
    viewHeight,
    padding = PROPOSAL_PAGE6_FRAME.padding,
    maskOpacity = PROPOSAL_PAGE6_FRAME.maskOpacity,
    viewport = null,
    resolveStyle = resolveProposalFloorPlanMergedAnnotationStyle,
  } = options;

  if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return false;

  const natW = image.naturalWidth;
  const natH = image.naturalHeight;
  const transform = viewport
    ? computeViewportRectTransform(natW, natH, viewWidth, viewHeight, viewport, padding)
    : annotations.length > 0
      ? computeAnnotationsFocusTransform(natW, natH, viewWidth, viewHeight, annotations, padding)
      : computeImageFitTransform(natW, natH, viewWidth, viewHeight, padding);

  ctx.clearRect(0, 0, viewWidth, viewHeight);
  ctx.drawImage(image, transform.offsetX, transform.offsetY, transform.drawW, transform.drawH);

  for (const ann of annotations) {
    const style = resolveStyle(ann);
    if (style) drawAnnotationHighlight(ctx, ann, style, transform);
  }

  if (annotations.length > 0) {
    drawWhiteSpotlightMask(ctx, viewWidth, viewHeight, annotations, transform, maskOpacity);
  }

  return true;
}

/**
 * Render to an offscreen canvas and return PNG data URL.
 *
 * @param {{
 *   image: HTMLImageElement,
 *   annotations: object[],
 *   frameWidth?: number,
 *   frameHeight?: number,
 *   pixelRatio?: number,
 *   viewport?: { x: number, y: number, w: number, h: number } | null,
 * }} options
 * @returns {string | null}
 */
export function renderProposalFloorPlanToDataUrl(options) {
  const {
    image,
    annotations = [],
    frameWidth = PROPOSAL_PAGE6_FRAME.width,
    frameHeight = PROPOSAL_PAGE6_FRAME.height,
    pixelRatio = 2,
    viewport = null,
  } = options;

  if (!image?.complete || !image.naturalWidth) return null;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(frameWidth * pixelRatio);
  canvas.height = Math.round(frameHeight * pixelRatio);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(pixelRatio, pixelRatio);
  const ok = renderProposalFloorPlan(ctx, {
    image,
    annotations,
    viewWidth: frameWidth,
    viewHeight: frameHeight,
    viewport,
  });
  if (!ok) return null;

  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

/**
 * Load an image URL and resolve when decode is complete.
 *
 * @param {string} src
 * @returns {Promise<HTMLImageElement | null>}
 */
export function loadProposalFloorPlanImage(src) {
  return loadCanvasSafeImage(src);
}
