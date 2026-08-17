import { findAssociatedSpaceRegionAt } from './space-region-hit.js';

/**
 * Returns true if (nx, ny) lies inside any polygon, rectangle, or closed pen annotation
 * that is associated with a space (`space_ref`).
 *
 * @param {number} nx - normalized x (0–1)
 * @param {number} ny - normalized y (0–1)
 * @param {object[] | null | undefined} annotations
 * @returns {boolean}
 */
export function isPointInAllocatedRegions(nx, ny, annotations) {
  return findAssociatedSpaceRegionAt(nx, ny, annotations) != null;
}
