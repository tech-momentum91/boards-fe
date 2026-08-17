import apiClient from '@/api/axios';

const GET_CENTER_TRACKER_LAYOUT_BUNDLE_PATH =
  '/method/devx.tracker.api.api_center_tracker_task.get_center_tracker_layout_bundle';

/**
 * Floor-wise layout bundle for a center (all floors with layout_detail per floor).
 *
 * @param {string} center — Center document name (e.g. CTR-05)
 * @returns {Promise<{ floors: object[] }>}
 */
export async function fetchCenterTrackerLayoutBundle(center) {
  const centerId = String(center ?? '').trim();
  if (!centerId) {
    return { floors: [] };
  }

  const response = await apiClient.post(GET_CENTER_TRACKER_LAYOUT_BUNDLE_PATH, {
    center: centerId,
  });

  const message = response?.data?.message ?? response?.data ?? {};
  const floors = Array.isArray(message.floors) ? message.floors : [];

  return {
    ...message,
    floors,
  };
}

/**
 * Match a form floor value (block_floor_id label) to a bundle floor row.
 *
 * @param {object[]} bundleFloors
 * @param {string} floorKey
 * @returns {object | null}
 */
export function findCenterTrackerLayoutBundleFloor(bundleFloors, floorKey) {
  const key = String(floorKey ?? '').trim();
  if (!key || !Array.isArray(bundleFloors)) return null;

  return (
    bundleFloors.find((row) => {
      if (!row || typeof row !== 'object') return false;
      const blockFloorId = String(row.block_floor_id ?? '').trim();
      const floorRef = String(row.floor_ref ?? '').trim();
      const floorDetailId = String(row.layout_detail?.floor_detail?.name ?? '').trim();
      return key === blockFloorId || key === floorRef || key === floorDetailId;
    }) ?? null
  );
}

/**
 * Pick the layout bundle floor for the current form selection (first matching selected floor).
 *
 * @param {object[]} bundleFloors
 * @param {string[]} selectedFloors
 */
export function resolveCenterTrackerLayoutFloorForSelection(bundleFloors, selectedFloors) {
  const selected = Array.isArray(selectedFloors)
    ? selectedFloors.map((f) => String(f ?? '').trim()).filter(Boolean)
    : String(selectedFloors ?? '').trim()
      ? [String(selectedFloors).trim()]
      : [];

  if (selected.length === 0) return null;

  for (const floorKey of selected) {
    const match = findCenterTrackerLayoutBundleFloor(bundleFloors, floorKey);
    if (match) return match;
  }

  return null;
}
