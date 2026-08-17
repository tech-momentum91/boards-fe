/** Shared Status Master lifecycle categories (serializer + UI). */
export const STATUS_LIFECYCLE_CATEGORIES = ['Not Started', 'Active', 'Done', 'Closed'];

/** Semantic Status Option.color defaults by lifecycle category (matches backend). */
export const STATUS_CATEGORY_DEFAULT_COLORS = {
  'Not Started': 'orange',
  Active: 'blue',
  Done: 'green',
  Closed: 'gray',
};

/**
 * Circular-progress percentages by lifecycle category.
 * Stable across reorder — unlike index-based 20 + n * 20.
 */
export const STATUS_CATEGORY_PROGRESS_PERCENTAGES = {
  'Not Started': 25,
  Active: 60,
  Done: 100,
  Closed: 100,
};

export function getDefaultColorForStatusCategory(category) {
  const key = STATUS_LIFECYCLE_CATEGORIES.includes(category) ? category : 'Active';
  return STATUS_CATEGORY_DEFAULT_COLORS[key] || STATUS_CATEGORY_DEFAULT_COLORS.Active;
}

/**
 * @param {unknown} value
 * @param {{ fallback?: string | null }} [options]
 * @returns {string | null}
 */
export function normalizeStatusLifecycleCategory(value, { fallback = null } = {}) {
  const raw = String(value || '').trim();
  if (STATUS_LIFECYCLE_CATEGORIES.includes(raw)) return raw;
  return fallback;
}

/**
 * Progress % for circular indicators. Prefers Status Master category; falls back to
 * index-based estimate only when category is missing.
 */
export function getProgressPercentageForStatusCategory(category, fallbackIndex = 0) {
  const key = normalizeStatusLifecycleCategory(category);
  if (key && STATUS_CATEGORY_PROGRESS_PERCENTAGES[key] != null) {
    return STATUS_CATEGORY_PROGRESS_PERCENTAGES[key];
  }
  return Math.min(100, Math.max(10, 20 + Number(fallbackIndex || 0) * 20));
}
