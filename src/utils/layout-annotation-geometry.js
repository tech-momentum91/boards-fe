/**
 * Geometry helpers for layout annotations. Coordinates are normalized 0–1 relative to the image bounds.
 */

/**
 * @param {{ x: number; y: number }[]} vertices - Pixel-space vertices (closed polygon).
 * @returns {number} Area in square pixels.
 */
export function polygonAreaShoelace(vertices) {
  const n = vertices.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    sum += vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
  }
  return Math.abs(sum / 2);
}

/**
 * Polygon area in pixel² from flat normalized points [x0,y0,...] and natural image dimensions.
 * @param {number[]} flatNormalized
 * @param {number} naturalWidth
 * @param {number} naturalHeight
 */
export function polygonAreaFromNormalized(flatNormalized, naturalWidth, naturalHeight) {
  if (!flatNormalized || flatNormalized.length < 6) return 0;
  const vertices = [];
  for (let i = 0; i < flatNormalized.length; i += 2) {
    vertices.push({
      x: flatNormalized[i] * naturalWidth,
      y: flatNormalized[i + 1] * naturalHeight,
    });
  }
  return polygonAreaShoelace(vertices);
}

/**
 * Rectangle area in pixel² from normalized x,y,w,h and natural dimensions.
 */
export function rectangleAreaFromNormalized(_x, _y, width, height, naturalWidth, naturalHeight) {
  return width * naturalWidth * height * naturalHeight;
}

/**
 * Polyline length in pixels (open path).
 * @param {number[]} flatNormalized
 * @param {number} naturalWidth
 * @param {number} naturalHeight
 */
export function polylineLengthFromNormalized(flatNormalized, naturalWidth, naturalHeight) {
  if (!flatNormalized || flatNormalized.length < 4) return 0;
  let len = 0;
  for (let i = 0; i < flatNormalized.length - 2; i += 2) {
    const x0 = flatNormalized[i] * naturalWidth;
    const y0 = flatNormalized[i + 1] * naturalHeight;
    const x1 = flatNormalized[i + 2] * naturalWidth;
    const y1 = flatNormalized[i + 3] * naturalHeight;
    len += Math.hypot(x1 - x0, y1 - y0);
  }
  return len;
}

/** Average of vertices (normalized), useful as label anchor / summary. */
export function polygonCentroidNormalized(flatNormalized) {
  if (!flatNormalized || flatNormalized.length < 2) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  const n = flatNormalized.length / 2;
  for (let i = 0; i < flatNormalized.length; i += 2) {
    sx += flatNormalized[i];
    sy += flatNormalized[i + 1];
  }
  return { x: sx / n, y: sy / n };
}

export function rectangleCenterNormalized(x, y, width, height) {
  return { x: x + width / 2, y: y + height / 2 };
}

/** Middle vertex along polyline (normalized). */
export function polylineMidAnchorNormalized(flatNormalized) {
  if (!flatNormalized || flatNormalized.length < 2) return { x: 0, y: 0 };
  const nVerts = flatNormalized.length / 2;
  const vi = Math.max(0, Math.min(nVerts - 1, Math.floor(nVerts / 2)));
  const i = vi * 2;
  return { x: flatNormalized[i], y: flatNormalized[i + 1] };
}
