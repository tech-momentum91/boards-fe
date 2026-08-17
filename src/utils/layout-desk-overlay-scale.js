/** Default marker size in CSS px before counter-scale is applied. */
export const DESK_OVERLAY_BASE_PX = 28;

/** Minimum on-screen size for desk markers / logos (px). */
export const DESK_OVERLAY_MIN_SCREEN_PX = 24;

/**
 * Counter-scale for desk overlays inside a zoomed canvas so icons stay readable.
 * Applies a floor so markers do not shrink below `minScreenPx` when zooming in.
 *
 * @param {number} canvasScale - Current viewport scale (1 = 100%).
 * @param {number} [basePx]
 * @param {number} [minScreenPx]
 * @returns {number}
 */
export function computeDeskOverlayCounterScale(
  canvasScale,
  basePx = DESK_OVERLAY_BASE_PX,
  minScreenPx = DESK_OVERLAY_MIN_SCREEN_PX,
) {
  const safeScale =
    typeof canvasScale === 'number' && Number.isFinite(canvasScale) && canvasScale > 0
      ? canvasScale
      : 1;
  const counterScaleForConstantSize = 1 / safeScale;
  const minCounterScale = minScreenPx / basePx;
  return Math.max(counterScaleForConstantSize, minCounterScale);
}
