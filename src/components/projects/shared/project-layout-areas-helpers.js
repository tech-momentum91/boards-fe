import { buildLayoutAreaOptions } from '@/api/projectLayout';

/**
 * Flatten all areas from the `floors` parent array (ignore top-level `areas`).
 * @param {unknown[]} floors
 */
export function flattenLayoutAreasFromFloors(floors = []) {
  return (Array.isArray(floors) ? floors : []).flatMap((floorRecord) =>
    Array.isArray(floorRecord?.areas) ? floorRecord.areas : [],
  );
}

/**
 * @param {unknown} message
 */
export function normalizeProjectLayoutAreasResponse(message) {
  const payload = message && typeof message === 'object' ? message : {};
  const floors = Array.isArray(payload.floors) ? payload.floors : [];
  const areasFromFloors = flattenLayoutAreasFromFloors(floors);

  const parsedTotal = Number(payload.total);
  const total =
    payload.total != null && Number.isFinite(parsedTotal) && parsedTotal > 0
      ? parsedTotal
      : areasFromFloors.length;

  return {
    project: String(payload.project ?? '').trim(),
    total,
    floors,
    layout: payload.layout ?? null,
  };
}

/**
 * @param {unknown[]} floors
 */
export function buildLayoutAreasFloorOptions(floors = []) {
  return (Array.isArray(floors) ? floors : [])
    .map((floorRecord) => {
      const value = String(floorRecord?.floor ?? '').trim();
      if (!value) return null;
      return { value, label: value };
    })
    .filter(Boolean);
}

/**
 * @param {unknown[]} areas
 */
export function buildLayoutAreasAreaOptions(areas = []) {
  return buildLayoutAreaOptions(areas);
}

/**
 * @param {unknown[]} floors
 * @param {string} floorKey
 */
export function findLayoutAreasFloorRecord(floors = [], floorKey = '') {
  const key = String(floorKey ?? '').trim();
  if (!key) return null;

  const normalizedKey = key.toLowerCase();
  return (
    (Array.isArray(floors) ? floors : []).find((floorRecord) => {
      const floorValue = String(floorRecord?.floor ?? '').trim();
      if (!floorValue) return false;
      return floorValue === key || floorValue.toLowerCase() === normalizedKey;
    }) ?? null
  );
}

/**
 * Areas for a single floor from the `floors` parent array.
 * @param {unknown[]} floors
 * @param {string} floorKey
 */
export function getLayoutAreasForFloor(floors = [], floorKey = '') {
  const floorRecord = findLayoutAreasFloorRecord(floors, floorKey);
  return Array.isArray(floorRecord?.areas) ? floorRecord.areas : [];
}

/**
 * Shape expected by {@link ProjectLayoutFloorEditor} / create layout panel.
 *
 * @param {object | null | undefined} floorRecord
 */
export function buildLayoutPreviewLayoutFromFloor(floorRecord) {
  if (!floorRecord || typeof floorRecord !== 'object') return null;

  const layoutId = String(floorRecord.layout_id ?? '').trim();
  const layoutImage = String(floorRecord.layout_image ?? '').trim();
  const floor = String(floorRecord.floor ?? '').trim();

  if (!layoutImage) return null;

  return {
    name: layoutId || floor,
    id: layoutId || floor,
    floor,
    layout_id: layoutId,
    layout_image: layoutImage,
    layout_type: floorRecord.layout_type ?? '',
    subject: floorRecord.subject ?? '',
    areas: Array.isArray(floorRecord.areas) ? floorRecord.areas : [],
  };
}

/**
 * Resolve a floor layout bundle from listview `layout_bundles` (keyed by floor).
 *
 * @param {Record<string, object> | null | undefined} layoutBundles
 * @param {string} floor
 */
export function resolveProjectFloorLayoutBundle(layoutBundles, floor = '') {
  if (!layoutBundles || typeof layoutBundles !== 'object') return null;

  const key = String(floor ?? '').trim();
  if (!key) return null;

  if (layoutBundles[key]) return layoutBundles[key];

  const normalizedKey = key.toLowerCase();
  const matchedKey = Object.keys(layoutBundles).find(
    (bundleKey) => String(bundleKey).trim().toLowerCase() === normalizedKey,
  );
  return matchedKey ? layoutBundles[matchedKey] : null;
}
