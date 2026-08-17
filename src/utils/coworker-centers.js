/**
 * Normalize a center row from client detail or get_client_centers into select options.
 *
 * @param {unknown} row
 * @returns {{ value: string, label: string } | null}
 */
export function normalizeClientCenterOption(row) {
  if (row == null) return null;

  if (typeof row === 'string') {
    const text = row.trim();
    return text ? { value: text, label: text } : null;
  }

  if (typeof row !== 'object') return null;

  const value = String(row.value ?? row.center ?? row.center_id ?? row.name ?? row.id ?? '').trim();
  const label = String(row.label ?? row.center_name ?? row.centerName ?? row.title ?? value).trim();

  if (!value && !label) return null;
  return { value: value || label, label: label || value };
}

/**
 * Extract assigned center options from `get_client_details` payload.
 * Supports pre-formatted `{ value, label }` lists and common child-table shapes.
 *
 * @param {object | null | undefined} clientDetailData
 * @returns {Array<{ value: string, label: string }>}
 */
export function extractClientAssignedCenterOptions(clientDetailData) {
  if (!clientDetailData || typeof clientDetailData !== 'object') return [];

  const candidates = [
    clientDetailData.custom_center_assignment,
    clientDetailData.centers,
    clientDetailData.assigned_centers,
    clientDetailData.client_centers,
    clientDetailData.center,
    clientDetailData.assigned_center,
  ];

  const byValue = new Map();

  for (const list of candidates) {
    if (!Array.isArray(list)) continue;
    for (const row of list) {
      const opt = normalizeClientCenterOption(row);
      if (!opt) continue;
      byValue.set(opt.value, opt);
    }
  }

  return [...byValue.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * @param {Array<{ value: string, label: string }>} options
 * @param {string} currentValue
 * @returns {Array<{ value: string, label: string }>}
 */
export function withCurrentCenterOption(options, currentValue) {
  const current = String(currentValue ?? '').trim();
  if (!current) return options;
  if (options.some((opt) => opt.value === current)) return options;
  return [{ value: current, label: current }, ...options];
}

/**
 * Merge multiple center option lists, preferring richer labels when values collide.
 *
 * @param {...Array<{ value: string, label: string }>} optionLists
 * @returns {Array<{ value: string, label: string }>}
 */
export function mergeCenterOptions(...optionLists) {
  const byValue = new Map();

  for (const list of optionLists) {
    if (!Array.isArray(list)) continue;
    for (const opt of list) {
      if (!opt?.value) continue;
      const existing = byValue.get(opt.value);
      const hasRichLabel = opt.label && opt.label !== opt.value;
      const existingHasRichLabel = existing?.label && existing.label !== existing.value;
      if (!existing || (!existingHasRichLabel && hasRichLabel)) {
        byValue.set(opt.value, opt);
      }
    }
  }

  return [...byValue.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * @param {string} centerValue
 * @param {Array<{ value: string, label: string }>} options
 * @returns {string}
 */
export function resolveCenterDisplayLabel(centerValue, options = []) {
  const value = String(centerValue ?? '').trim();
  if (!value) return '-';
  const match = options.find((opt) => opt.value === value);
  return match?.label || value;
}
