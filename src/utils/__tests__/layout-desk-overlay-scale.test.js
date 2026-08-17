import {
  computeDeskOverlayCounterScale,
  DESK_OVERLAY_BASE_PX,
  DESK_OVERLAY_MIN_SCREEN_PX,
} from '../layout-desk-overlay-scale';

describe('layout-desk-overlay-scale', () => {
  test('computeDeskOverlayCounterScale keeps constant size at 100% zoom', () => {
    expect(computeDeskOverlayCounterScale(1)).toBe(1);
  });

  test('computeDeskOverlayCounterScale enforces minimum screen size when zoomed in', () => {
    const at300 = computeDeskOverlayCounterScale(
      3,
      DESK_OVERLAY_BASE_PX,
      DESK_OVERLAY_MIN_SCREEN_PX,
    );
    expect(at300 * DESK_OVERLAY_BASE_PX * 3).toBeGreaterThanOrEqual(DESK_OVERLAY_MIN_SCREEN_PX);
    expect(at300).toBeGreaterThan(1 / 3);
  });

  test('computeDeskOverlayCounterScale handles invalid scale', () => {
    expect(computeDeskOverlayCounterScale(0)).toBe(1);
    expect(computeDeskOverlayCounterScale(Number.NaN)).toBe(1);
  });
});
