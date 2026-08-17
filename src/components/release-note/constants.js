import {
  RiBugLine,
  RiRobot2Line,
  RiLinksLine,
  RiPaletteLine,
  RiPriceTag3Line,
  RiRocketLine,
  RiStarLine,
} from 'react-icons/ri';

/** @typedef {'gray' | 'blue' | 'orange' | 'red' | 'green' | 'yellow' | 'purple' | 'sky' | 'pink' | 'teal'} BadgeColor */

export const RELEASE_TYPE_OPTIONS = [
  { value: 'Feature', label: 'Feature' },
  { value: 'Bug', label: 'Bug' },
  { value: 'Enhancement', label: 'Enhancement' },
  { value: 'UI/UX Fix', label: 'UI/UX Fix' },
  { value: 'Integration', label: 'Integration' },
  { value: 'AI', label: 'AI' },
];

export const RELEASE_TYPE_VALUES = RELEASE_TYPE_OPTIONS.map((o) => o.value);

/** Maps canonical type → badge color + icon (list cards only). */
export const RELEASE_TYPE_PRESENTATION =
  /** @type {Record<string, { color: BadgeColor, Icon: typeof RiStarLine }>} */ ({
    Feature: { color: 'blue', Icon: RiStarLine },
    Bug: { color: 'red', Icon: RiBugLine },
    Enhancement: { color: 'purple', Icon: RiRocketLine },
    'UI/UX Fix': { color: 'orange', Icon: RiPaletteLine },
    Integration: { color: 'teal', Icon: RiLinksLine },
    AI: { color: 'pink', Icon: RiRobot2Line },
  });

/** Default icon when type is unknown or non-canonical. */
export const RELEASE_TYPE_FALLBACK_ICON = RiPriceTag3Line;

export const RELEASE_NOTE_SUBMIT_MODE_MESSAGES = {
  publish: {
    createSuccess: 'Release note published successfully.',
    editSuccess: 'Release note updated and published.',
    createError: 'Could not publish release note.',
    editError: 'Could not update release note.',
  },
  draft: {
    createSuccess: 'Release note drafted successfully.',
    editSuccess: 'Release note saved as draft.',
    createError: 'Could not save draft.',
    editError: 'Could not update release note.',
  },
  unpublish: {
    createSuccess: 'Release note unpublished successfully.',
    editSuccess: 'Release note unpublished successfully.',
    createError: 'Could not unpublish release note.',
    editError: 'Could not unpublish release note.',
  },
  /** Edit flow only: save content while keeping a published note published. */
  savePublished: {
    editSuccess: 'Release note saved.',
    editError: 'Could not update release note.',
    createSuccess: '',
    createError: '',
  },
};

/** Release notes list — filter dropdown sessionStorage slot. */
export const RELEASE_NOTE_FILTER_SESSION_KEY = 'support-release-note-view-filter-dropdown';

/** Canonical applied filter shape (toolbar status + dropdown modules). */
export const RELEASE_NOTE_APPLIED_FILTER_DEFAULTS = {
  published: true,
  draft: false,
  modules: [],
};

export function mergeStoredReleaseNoteFilters(stored) {
  const base = { ...RELEASE_NOTE_APPLIED_FILTER_DEFAULTS };
  if (!stored || typeof stored !== 'object') return base;
  return {
    ...base,
    published: typeof stored.published === 'boolean' ? stored.published : base.published,
    draft: typeof stored.draft === 'boolean' ? stored.draft : base.draft,
    modules: Array.isArray(stored.modules) ? stored.modules : base.modules,
  };
}
