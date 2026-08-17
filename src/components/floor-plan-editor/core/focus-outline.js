import {
  LAYOUT_FOCUS_FRAME_RECT_RADIUS_PX,
  LAYOUT_FOCUS_FRAME_STROKE_PX,
} from '@/constants/layout/focus-constants';

import { sampleClosedBezierOutlineNormalized } from './space-region-hit.js';

/**
 * SVG outline for the sub-space focus border (tracks shape geometry for any space type).
 *
 * @param {object} ann
 * @param {number} imageW
 * @param {number} imageH
 * @param {number} [paddingPx=6]
 * @returns {{ kind: 'rect', x: number, y: number, width: number, height: number, rx: number } | { kind: 'polyline', points: string } | null}
 */
export function buildSubSpaceFocusOutline(ann, imageW, imageH, paddingPx = 6) {
  if (!ann || !imageW || !imageH) return null;
  const pad = Math.max(0, Number(paddingPx) || 0);

  if (ann.type === 'rectangle') {
    const x = ann.x * imageW - pad;
    const y = ann.y * imageH - pad;
    const width = ann.width * imageW + pad * 2;
    const height = ann.height * imageH + pad * 2;
    if (width <= 0 || height <= 0) return null;
    return {
      kind: 'rect',
      x,
      y,
      width,
      height,
      rx: LAYOUT_FOCUS_FRAME_RECT_RADIUS_PX,
      strokeWidth: LAYOUT_FOCUS_FRAME_STROKE_PX,
    };
  }

  if (ann.type === 'polygon' || ann.type === 'polyline') {
    const pts = ann.points;
    if (!Array.isArray(pts) || pts.length < 4) return null;
    const pairs = [];
    for (let i = 0; i < pts.length; i += 2) {
      pairs.push(`${pts[i] * imageW},${pts[i + 1] * imageH}`);
    }
    return {
      kind: ann.type === 'polygon' ? 'polygon' : 'polyline',
      points: pairs.join(' '),
      closed: ann.type === 'polygon',
      strokeWidth: LAYOUT_FOCUS_FRAME_STROKE_PX,
    };
  }

  if (ann.type === 'pen') {
    let flat = ann.points;
    if (ann.closed && Array.isArray(ann.bezierPoints) && ann.bezierPoints.length >= 2) {
      flat = sampleClosedBezierOutlineNormalized(ann.bezierPoints, 16);
    }
    if (!Array.isArray(flat) || flat.length < 4) return null;
    const pairs = [];
    for (let i = 0; i < flat.length; i += 2) {
      pairs.push(`${flat[i] * imageW},${flat[i + 1] * imageH}`);
    }
    return {
      kind: ann.closed ? 'polygon' : 'polyline',
      points: pairs.join(' '),
      closed: Boolean(ann.closed),
      strokeWidth: LAYOUT_FOCUS_FRAME_STROKE_PX,
    };
  }

  return null;
}
