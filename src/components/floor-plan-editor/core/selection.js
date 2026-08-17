/**
 * Selection helpers (multi-select with shift).
 */

import { boundingBoxNormalized, normalizedRectsIntersect } from './geometry.js';

/**
 * @param {string[]} ids
 * @param {string} id
 * @param {boolean} shiftKey
 * @returns {string[]}
 */
export function toggleSelection(ids, id, shiftKey) {
  if (!shiftKey) return [id];
  const set = new Set(ids);
  if (set.has(id)) {
    set.delete(id);
  } else {
    set.add(id);
  }
  return [...set];
}

/**
 * Marquee in normalized coords (axis-aligned).
 * @param {{ annotations: object[], rect: { minX: number, minY: number, maxX: number, maxY: number}, additive: boolean, prevSelection: string[] }}
 */
export function selectByMarqueeNormalized({ annotations, rect, additive, prevSelection }) {
  const picked = [];
  for (const ann of annotations) {
    if (ann.locked || ann.visible === false) continue;
    const box = boundingBoxNormalized(ann);
    if (!box) continue;
    if (normalizedRectsIntersect(rect, box)) {
      picked.push(ann.id);
    }
  }
  if (additive) {
    return [...new Set([...prevSelection, ...picked])];
  }
  return picked;
}
