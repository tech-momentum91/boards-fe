/** Legacy API label — normalized to Hot Desk in the UI. */
export const LEGACY_FLEXI_DESK_COWORKING_TYPE = 'Flexi Desk';

const COWORKING_DESK_MARKER_INVENTORY_TYPES = new Set([
  'Hot Desk',
  'Dedicated Desk',
  LEGACY_FLEXI_DESK_COWORKING_TYPE,
]);

/**
 * Normalize API/display coworking sub-type (Flexi Desk → Hot Desk after rename).
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeCoworkingInventoryType(value) {
  const v = String(value ?? '').trim();
  if (v === LEGACY_FLEXI_DESK_COWORKING_TYPE) return 'Hot Desk';
  return v;
}

/**
 * Value sent to Space create/update APIs.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function resolveCoworkingInventoryTypeForApi(value) {
  return normalizeCoworkingInventoryType(value);
}

/**
 * Co-working types that use per-desk seat selection during client allocation.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isCoworkingDeskSeatSelectionType(value) {
  const normalized = normalizeCoworkingInventoryType(value);
  return normalized === 'Dedicated Desk' || normalized === 'Hot Desk';
}

/**
 * `coworking_inventory_type` filter values when listing spaces (includes legacy Flexi Desk).
 *
 * @param {unknown} displayType
 * @returns {string[]}
 */
export function coworkingInventoryTypesForApiFilter(displayType) {
  const normalized = normalizeCoworkingInventoryType(displayType);
  if (!normalized) return [];
  if (normalized === 'Hot Desk') {
    return ['Hot Desk', LEGACY_FLEXI_DESK_COWORKING_TYPE];
  }
  return [normalized];
}

/**
 * Co-working inventory types that use the Mark CoWorkers / desk-marker layout workflow.
 *
 * @param {unknown} coworkingInventoryType
 * @returns {boolean}
 */
export function isLayoutCoworkingDeskMarkerType(coworkingInventoryType) {
  const normalized = normalizeCoworkingInventoryType(coworkingInventoryType);
  return COWORKING_DESK_MARKER_INVENTORY_TYPES.has(normalized);
}
