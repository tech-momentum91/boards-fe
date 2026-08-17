/**
 * Sub-space layout coordinates from Super Admin dot placement → API payload.
 * Uses normalized 0–1 coordinates consistent with the floor-plan editor.
 *
 * @param {number} nx
 * @param {number} ny
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function normalizedDotToApiLayoutCoordinate(nx, ny) {
  const w = 0.02;
  const h = 0.02;
  const x = Number(nx);
  const y = Number(ny);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { x: 0, y: 0, width: w, height: h };
  }
  return {
    x: Math.max(0, Math.min(1 - w, x - w / 2)),
    y: Math.max(0, Math.min(1 - h, y - h / 2)),
    width: w,
    height: h,
  };
}
