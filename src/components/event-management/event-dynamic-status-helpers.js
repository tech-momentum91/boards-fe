/**
 * Helpers for Events list/create/detail UIs that read status options from
 * Status Configuration (`getStatusOptions` on doctype `Events`).
 */

/** Backend field used for the active events sub-module. */
export function eventsStatusFieldForModule(moduleType) {
  return moduleType === 'community' ? 'community_status' : 'status';
}

/**
 * Tab key for horizontal status tabs and `status_counts` lookup
 * (matches prior `key.toLowerCase().replaceAll(' ', '_')` behavior).
 */
export function eventStatusTabKeyFromLabel(label) {
  return String(label ?? '')
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, '_');
}

/**
 * @param {Array<{ value?: string, label?: string }>} dynamicOptions from `getStatusOptions`
 * @returns {{ tabs: Array<{ value: string, label: string }>, tabToFilterValues: Record<string, string[]> }}
 */
export function buildEventStatusTabsAndFilterMap(dynamicOptions) {
  const rows = Array.isArray(dynamicOptions) ? dynamicOptions : [];
  const tabs = [
    { value: 'all', label: 'All' },
    ...rows.map((o) => {
      const raw = String(o?.value ?? o?.label ?? '').trim();
      return {
        value: eventStatusTabKeyFromLabel(raw),
        label: String(o?.label ?? o?.value ?? '').trim() || raw,
      };
    }),
  ];
  const tabToFilterValues = { all: [] };
  for (const o of rows) {
    const val = String(o?.value ?? o?.label ?? '').trim();
    if (!val) continue;
    tabToFilterValues[eventStatusTabKeyFromLabel(val)] = [val];
  }
  return { tabs, tabToFilterValues };
}

/** Options shape for `Select` / `InlineEditableSelect` (`value`, `label`, optional `color` from API). */
export function toEventStatusSelectOptions(dynamicOptions) {
  return (Array.isArray(dynamicOptions) ? dynamicOptions : [])
    .map((o) => {
      const colorRaw = o?.color;
      const color =
        colorRaw != null && String(colorRaw).trim() !== '' ? String(colorRaw).trim() : null;
      return {
        value: String(o?.value ?? '').trim(),
        label: String(o?.label ?? o?.value ?? '').trim(),
        color,
      };
    })
    .filter((o) => o.value);
}
