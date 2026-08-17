import {
  RELEASE_TYPE_FALLBACK_ICON,
  RELEASE_TYPE_PRESENTATION,
  RELEASE_TYPE_VALUES,
} from '@/components/release-note/constants';

/** Stable DOM id for scrolling (quick links ↔ list cards). */
export function releaseNoteAnchorId(noteId) {
  return `release-note-${String(noteId).replaceAll(/[^\w-]/g, '_')}`;
}

const normalizeApplied = (applied) => ({
  published: applied?.published !== false,
  draft: applied?.draft !== false,
  modules: Array.isArray(applied?.modules) ? applied.modules : [],
});

/** Count active filters for the release note filter popover badge (modules only; status uses the toolbar). */
export const computeReleaseNoteFilterCount = (f) => {
  const next = normalizeApplied(f);
  return next.modules.length;
};

/**
 * Normalize API `modules` (comma string, array of strings, or child rows).
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeReleaseNoteModules(raw) {
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        return String(item.module ?? item.name ?? '').trim();
      }
      return '';
    })
    .filter(Boolean);
}

/**
 * Normalize API `type` (array), `release_type` (comma string), or legacy shapes.
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeReleaseNoteTypes(raw) {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t ?? '').trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Match API casing (e.g. FEATURE / feature) to our canonical labels.
 * @param {string} rawLabel
 * @returns {string | null}
 */
export function canonicalReleaseTypeLabel(rawLabel) {
  const trimmed = String(rawLabel ?? '').trim();
  if (!trimmed) return null;
  return RELEASE_TYPE_VALUES.find((v) => v.toLowerCase() === trimmed.toLowerCase()) ?? null;
}

/**
 * @param {string} typeLabel
 * @returns {{ label: string, color: import('@/components/release-note/constants').BadgeColor, Icon: typeof RELEASE_TYPE_FALLBACK_ICON }}
 */
export function resolveReleaseTypePresentation(typeLabel) {
  const trimmed = String(typeLabel ?? '').trim();
  const canonical = canonicalReleaseTypeLabel(trimmed);
  if (canonical && RELEASE_TYPE_PRESENTATION[canonical]) {
    const { color, Icon } = RELEASE_TYPE_PRESENTATION[canonical];
    return { label: canonical, color, Icon };
  }
  return { label: trimmed || 'Type', color: 'gray', Icon: RELEASE_TYPE_FALLBACK_ICON };
}
