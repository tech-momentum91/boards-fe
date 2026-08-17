/**
 * Inventory-type grouping and availability for sidebar chips (matches deriveGroups / annotation rows).
 *
 * @param {object} ann
 */
export function annotationGroup(ann) {
  if (ann?.source === 'server-subspace-pin') return 'Sub-spaces';
  const s = ann.space;
  const fromSpace =
    s && typeof s === 'object' ? String(s.inventory_type || s.spaceType || '').trim() : '';
  if (fromSpace) return fromSpace;
  return ann.space_ref ? 'Associated' : 'Unassociated';
}

/**
 * Infer occupancy from embedded space detail (status text, client assignment).
 *
 * @returns {boolean | null} true = occupied, false = available, null = unknown / not linked with detail
 */
export function inferSpaceOccupied(ann) {
  const s = ann?.space;
  if (!s || typeof s !== 'object') {
    return ann?.space_ref ? null : false;
  }
  const raw = String(s.status ?? '')
    .trim()
    .toLowerCase();
  if (raw.includes('occup')) return true;
  if (raw.includes('avail')) return false;
  if (raw.includes('vacant') || raw.includes('free')) return false;
  if (s.client_name || s.client) return true;
  return false;
}

/**
 * @param {object} ann
 * @param {'available' | 'occupied'} mode
 */
export function annotationMatchesAvailabilityMode(ann, mode) {
  const occupied = inferSpaceOccupied(ann);
  if (occupied === null) {
    return mode === 'available';
  }
  return mode === 'occupied' ? occupied : !occupied;
}

/**
 * Independent Available / Occupied toggles per group. Both true = show all; both false = hide all.
 *
 * @param {object} ann
 * @param {{ available: boolean, occupied: boolean }} filter
 */
export function annotationMatchesAvailabilityFilters(ann, filter) {
  const showAvailable = filter.available;
  const showOccupied = filter.occupied;
  if (showAvailable && showOccupied) return true;
  if (!showAvailable && !showOccupied) return false;
  const occupied = inferSpaceOccupied(ann);
  if (occupied === null) {
    return showAvailable;
  }
  if (occupied) return showOccupied;
  return showAvailable;
}

/** @param {object[]} list */
export function deriveInventoryGroups(list) {
  const map = new Map();
  for (const ann of list) {
    const key = annotationGroup(ann);
    if (!map.has(key)) map.set(key, 0);
    map.set(key, map.get(key) + 1);
  }
  const tail = ['Sub-spaces', 'Associated', 'Unassociated'];
  return [...map.entries()]
    .sort(([a], [b]) => {
      const ai = tail.indexOf(a);
      const bi = tail.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return -1;
      if (bi === -1) return 1;
      return ai - bi;
    })
    .map(([key, count]) => ({ key, count }));
}
