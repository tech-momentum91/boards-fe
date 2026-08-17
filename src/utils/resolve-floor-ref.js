import { fetchFloorDetailsList } from '@/api/floorDetail';
import { getLayoutImagePathFromRecord } from '@/utils/layout-image-path';

/** Cache list_floor_details per center for the session (proposal scroll re-renders hit this often). */
const floorDetailsListCache = new Map();
const floorDetailsListInflight = new Map();

/**
 * @param {string} centerId
 * @returns {Promise<object[]>}
 */
export async function getCachedFloorDetailsListForCenter(centerId) {
  const center = String(centerId || '').trim();
  if (!center) return [];

  if (floorDetailsListCache.has(center)) {
    return floorDetailsListCache.get(center);
  }

  if (floorDetailsListInflight.has(center)) {
    return floorDetailsListInflight.get(center);
  }

  const request = fetchFloorDetailsList(center)
    .then(({ floors }) => {
      const rows = Array.isArray(floors) ? floors : [];
      floorDetailsListCache.set(center, rows);
      floorDetailsListInflight.delete(center);
      return rows;
    })
    .catch((error) => {
      floorDetailsListInflight.delete(center);
      throw error;
    });

  floorDetailsListInflight.set(center, request);
  return request;
}

function matchFloorRow(rows, floor) {
  return (Array.isArray(rows) ? rows : []).find((row) => {
    const rowId = String(row?.name ?? '').trim();
    const blockFloorId = String(row?.block_floor_id ?? '').trim();
    const composed =
      row?.block != null && row?.floor != null
        ? `${String(row.block).trim()} - ${String(row.floor).trim()}`
        : '';
    return rowId === floor || blockFloorId === floor || composed === floor;
  });
}

/**
 * Resolve floor ref + floor-detail row (includes layout_image when present).
 *
 * @param {{ centerId: string, floorValue: string }} params
 * @returns {Promise<{ floorRef: string, floorRow: object | null, layoutImagePath: string }>}
 */
export async function resolveFloorLayoutSource({ centerId, floorValue }) {
  const center = String(centerId || '').trim();
  const floor = String(floorValue || '').trim();
  if (!center || !floor) {
    return { floorRef: '', floorRow: null, layoutImagePath: '' };
  }

  try {
    const rows = await getCachedFloorDetailsListForCenter(center);
    const match = matchFloorRow(rows, floor);
    if (match?.name) {
      return {
        floorRef: String(match.name),
        floorRow: match,
        layoutImagePath: getLayoutImagePathFromRecord(match),
      };
    }
  } catch {
    // Fall through — caller may still use raw floor value.
  }

  return { floorRef: floor, floorRow: null, layoutImagePath: '' };
}

/**
 * Resolve a Space `floor` field value to a Floor Detail row id (`floor_ref`).
 * Accepts either the child row `name` or a display label like `Block - Floor`.
 *
 * @param {{ centerId: string, floorValue: string }} params
 * @returns {Promise<string>}
 */
export async function resolveFloorRefForCenter({ centerId, floorValue }) {
  const { floorRef } = await resolveFloorLayoutSource({ centerId, floorValue });
  return floorRef;
}
