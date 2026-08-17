import { CLIENT_MARKER_SOURCE } from '@/constants/layout/annotation-sources';
import { CLIENT_MARKER_STORAGE_KEY_PREFIX } from '@/constants/layout/client-floor-constants';

function storageKey(customerId, blockFloorId) {
  return `${CLIENT_MARKER_STORAGE_KEY_PREFIX}::${customerId}::${blockFloorId}`;
}

/**
 * @param {string} customerId
 * @param {string} blockFloorId
 * @returns {object[]}
 */
export function loadClientLayoutMarkersFromStorage(customerId, blockFloorId) {
  try {
    const raw = localStorage.getItem(storageKey(customerId, blockFloorId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * @param {string} customerId
 * @param {string} blockFloorId
 * @param {object[]} markers
 */
export function saveClientLayoutMarkersToStorage(customerId, blockFloorId, markers) {
  try {
    localStorage.setItem(storageKey(customerId, blockFloorId), JSON.stringify(markers));
  } catch {
    // storage unavailable
  }
}

/**
 * @param {object[]} markers
 * @returns {object[]}
 */
export function clientLayoutMarkersToAnnotations(markers) {
  return markers.map((m) => ({
    id: m.id,
    type: 'point',
    x: m.nx,
    y: m.ny,
    source: CLIENT_MARKER_SOURCE,
    locked: false,
    visible: true,
    ...(m.coworker_id ? { coworker_id: m.coworker_id, coworker_name: m.coworker_name } : {}),
  }));
}
