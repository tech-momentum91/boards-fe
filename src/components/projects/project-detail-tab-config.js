import {
  PROJECT_DETAIL_TAB_PREFERENCES_STORAGE_KEY,
  getProjectDetailAllSectionTabs,
} from '@/components/projects/constants';

const TAB_LOOKUP = () =>
  Object.fromEntries(getProjectDetailAllSectionTabs().map((tab) => [tab.id, tab]));

export function getDefaultProjectDetailTabPreferences() {
  return {
    order: getProjectDetailAllSectionTabs().map((tab) => tab.id),
    pinned: [],
  };
}

export function loadProjectDetailTabPreferences() {
  const defaults = getDefaultProjectDetailTabPreferences();
  try {
    const raw = localStorage.getItem(PROJECT_DETAIL_TAB_PREFERENCES_STORAGE_KEY);
    if (!raw) return defaults;

    const parsed = JSON.parse(raw);
    const lookup = TAB_LOOKUP();
    const validOrder = (Array.isArray(parsed?.order) ? parsed.order : [])
      .map((id) => String(id ?? '').trim())
      .filter((id) => lookup[id]);

    const validPinned = (Array.isArray(parsed?.pinned) ? parsed.pinned : [])
      .map((id) => String(id ?? '').trim())
      .filter((id) => lookup[id]);

    const seen = new Set();
    const order = [];
    validOrder.forEach((id) => {
      if (seen.has(id)) return;
      seen.add(id);
      order.push(id);
    });

    Object.keys(lookup).forEach((id) => {
      if (!seen.has(id)) {
        seen.add(id);
        order.push(id);
      }
    });

    return {
      order,
      pinned: validPinned.filter((id) => order.includes(id)),
    };
  } catch {
    return defaults;
  }
}

export function saveProjectDetailTabPreferences(preferences) {
  try {
    localStorage.setItem(PROJECT_DETAIL_TAB_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // localStorage may be unavailable in private mode
  }
}

export function buildOrderedProjectDetailTabs(
  preferences = getDefaultProjectDetailTabPreferences(),
) {
  const lookup = TAB_LOOKUP();
  const pinnedSet = new Set(preferences.pinned ?? []);
  const orderedIds = preferences.order ?? [];

  const pinned = [];
  const unpinned = [];

  orderedIds.forEach((id) => {
    const tab = lookup[id];
    if (!tab) return;
    if (pinnedSet.has(id)) pinned.push(tab);
    else unpinned.push(tab);
  });

  return [...pinned, ...unpinned];
}
