/**
 * Flatten `get_sub_spaces` rows into desk-level select options for co-working allocation.
 *
 * @param {unknown[]} subSpaces
 * @returns {Array<{
 *   value: string,
 *   label: string,
 *   deskId: string,
 *   subSpaceId: string,
 *   sequence: number,
 *   status: string,
 *   locked?: number,
 *   active?: number,
 *   occupied?: number,
 *   requested?: number,
 *   is_requested?: number,
 * }>}
 */
export function flattenSubSpacesToDeskOptions(subSpaces = []) {
  const options = [];

  (subSpaces || []).forEach((subSpace, idx) => {
    if (!subSpace || typeof subSpace !== 'object') return;
    const subSpaceId = String(subSpace.sub_space_id ?? subSpace.name ?? idx).trim();
    const desks = Array.isArray(subSpace.desks) ? subSpace.desks : [];

    if (desks.length > 0) {
      desks.forEach((desk, deskIdx) => {
        if (!desk || typeof desk !== 'object') return;
        const deskId = String(desk.desk_id ?? desk.name ?? '').trim();
        if (!deskId) return;
        const sequence = Number(desk.sequence ?? desk.seq ?? deskIdx + 1) || deskIdx + 1;
        options.push({
          value: deskId,
          label: `Desk ${sequence}`,
          deskId,
          subSpaceId,
          sequence,
          status: getDeskOptionStatus(desk),
          locked: desk.locked ?? subSpace.locked,
          active: desk.active ?? subSpace.active,
          occupied: desk.occupied ?? subSpace.occupied,
          requested: desk.requested ?? subSpace.requested,
          is_requested: desk.is_requested ?? subSpace.is_requested,
        });
      });
      return;
    }

    if (!subSpaceId) return;
    const sequence = Number(subSpace.seq ?? idx + 1) || idx + 1;
    options.push({
      value: subSpaceId,
      label: String(subSpace.sub_space_name || `Seat ${sequence}`).trim(),
      deskId: '',
      subSpaceId,
      sequence,
      status: getDeskOptionStatus(subSpace),
      locked: subSpace.locked,
      active: subSpace.active,
      occupied: subSpace.occupied,
      requested: subSpace.requested,
      is_requested: subSpace.is_requested,
    });
  });

  return options.sort((a, b) =>
    a.sequence === b.sequence ? a.label.localeCompare(b.label) : a.sequence - b.sequence,
  );
}

/**
 * @param {unknown} option
 * @returns {string}
 */
export function getDeskOptionStatus(option) {
  return String(option?.desk_status || option?.status || '').toLowerCase();
}

/**
 * @param {unknown} option
 * @returns {boolean}
 */
export function isDeskOptionUnavailable(option) {
  if (!option || typeof option !== 'object') return true;
  if (option.occupied === 1) return true;
  if (Number(option.locked) === 1) return true;
  if (option.active === 0) return true;
  if (option.requested === 1 || option.is_requested === 1) return true;
  const status = getDeskOptionStatus(option);
  if (status.includes('occupied')) return true;
  if (status.includes('locked')) return true;
  if (status.includes('updated')) return true;
  if (status.includes('request')) return true;
  return false;
}

/**
 * @param {unknown[]} options
 * @returns {number}
 */
export function countAvailableDeskOptions(options) {
  return (options || []).filter((opt) => !isDeskOptionUnavailable(opt)).length;
}

/**
 * @param {string[]} selectedValues
 * @param {Array<{ value: string, deskId?: string, subSpaceId?: string }>} options
 * @returns {Array<{ sub_space_id: string, desk_id?: string }>}
 */
/** Desk/sub-space values from an existing `assign_sub_spaces` assignment row. */
export function getAssignSubSpaceDeskValues(assignSubSpaces = []) {
  if (!Array.isArray(assignSubSpaces)) return [];
  return assignSubSpaces
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      const deskId = String(item?.desk_id ?? '').trim();
      if (deskId) return deskId;
      return String(item?.sub_space_id ?? '').trim();
    })
    .filter(Boolean);
}

export function buildAssignSubSpacesFromDeskSelection(selectedValues, options) {
  return (selectedValues || []).map((seatValue) => {
    const opt = (options || []).find((d) => d.value === seatValue);
    if (opt?.deskId && opt?.subSpaceId) {
      return { sub_space_id: opt.subSpaceId, desk_id: opt.deskId };
    }
    return { sub_space_id: String(seatValue || '').trim() };
  });
}
