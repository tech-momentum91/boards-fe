/**
 * Map define-sub-space modal fields → API `sub_space_area_type`.
 *
 * @param {{
 *   subSpaceType?: string,
 *   productionAreaType?: string,
 *   resourceType?: string,
 *   commonAreaType?: string,
 * }} form
 * @returns {string | null}
 */
export function resolveSubSpaceAreaTypeFromDefineForm(form) {
  if (!form || typeof form !== 'object') return null;
  const topType = String(form.subSpaceType || '').trim();
  if (topType === 'Production Area') {
    const v = String(form.productionAreaType || '').trim();
    return v || null;
  }
  if (topType === 'Resource') {
    const v = String(form.resourceType || '').trim();
    return v || null;
  }
  if (topType === 'Common Area') {
    const v = String(form.commonAreaType || '').trim();
    return v || null;
  }
  return null;
}
