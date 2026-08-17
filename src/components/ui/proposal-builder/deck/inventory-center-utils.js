const CENTER_CITY_FIELDS = ['city', 'city_name'];
const CENTER_NAME_FIELDS = ['center_name', 'centerName'];
const CENTER_ABBR_FIELDS = ['center_abbr', 'city_code'];

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function pickFirstString(source, fields) {
  if (!isPlainObject(source)) return '';
  for (const field of fields) {
    const value = String(source[field] ?? '').trim();
    if (value) return value;
  }
  return '';
}

export function normalizeRegistryKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll('&', 'and')
    .replaceAll(/[^\da-z]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
}

/**
 * Resolve center fields from a CRM Proposal inventory row.
 * City must come from the linked center (inventory → center → city).
 * @param {Object} inventoryRow
 */
export function resolveInventoryCenter(inventoryRow = {}) {
  const nestedCenter = inventoryRow.center;

  if (isPlainObject(nestedCenter)) {
    return {
      // Prefer semantic `id`; keep `name` fallback because Frappe docs use `name` as document ID.
      id:
        pickFirstString(nestedCenter, ['id', 'name']) ||
        pickFirstString(inventoryRow, ['center_id', 'center']),
      center_name:
        pickFirstString(nestedCenter, CENTER_NAME_FIELDS) ||
        pickFirstString(inventoryRow, CENTER_NAME_FIELDS),
      center_abbr:
        pickFirstString(nestedCenter, CENTER_ABBR_FIELDS) ||
        pickFirstString(inventoryRow, CENTER_ABBR_FIELDS),
      city: pickFirstString(nestedCenter, CENTER_CITY_FIELDS),
    };
  }

  const centerId = pickFirstString(inventoryRow, ['center_id', 'center']);

  return {
    id: centerId,
    center_name: pickFirstString(inventoryRow, CENTER_NAME_FIELDS),
    center_abbr: pickFirstString(inventoryRow, CENTER_ABBR_FIELDS),
    // Row.city is denormalized from Center on save/load; only use it when a center link exists.
    city: centerId ? pickFirstString(inventoryRow, CENTER_CITY_FIELDS) : '',
  };
}

export function resolveCityKey(center, fallback = 'unknown-city') {
  const cityRaw = String(center?.city || '').trim();
  return normalizeRegistryKey(cityRaw) || fallback;
}

export function resolveCenterId(row, center, fallback = 'unknown-center') {
  const resolvedCenter = center ?? resolveInventoryCenter(row);
  const preferredId =
    pickFirstString(resolvedCenter, ['id', 'name']) ||
    pickFirstString(row, ['center_id', 'center']);
  return (
    String(preferredId || '').trim() ||
    normalizeRegistryKey(resolvedCenter?.center_name || row?.center_name || fallback)
  );
}

export function resolveInventoryId(row, index) {
  const name = String(row?.name || '').trim();
  if (name) return name;
  const spaceRef = String(row?.space || row?.space_id || '').trim();
  if (spaceRef) return `${spaceRef}-${index + 1}`;
  return `unknown-${index + 1}`;
}
