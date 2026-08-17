import { useCallback, useMemo, useState } from 'react';
import {
  buildOrderedProjectDetailTabs,
  getDefaultProjectDetailTabPreferences,
  loadProjectDetailTabPreferences,
  saveProjectDetailTabPreferences,
} from '@/components/projects/project-detail-tab-config';

export function useProjectDetailTabs() {
  const [preferences, setPreferences] = useState(() => loadProjectDetailTabPreferences());

  const orderedTabs = useMemo(() => buildOrderedProjectDetailTabs(preferences), [preferences]);

  const persist = useCallback((nextPreferences) => {
    setPreferences(nextPreferences);
    saveProjectDetailTabPreferences(nextPreferences);
  }, []);

  const reorderTabs = useCallback(
    (nextOrder) => {
      const lookup = new Set(getDefaultProjectDetailTabPreferences().order);
      const normalized = (nextOrder ?? []).filter((id) => lookup.has(id));
      getDefaultProjectDetailTabPreferences().order.forEach((id) => {
        if (!normalized.includes(id)) normalized.push(id);
      });
      persist({ ...preferences, order: normalized });
    },
    [persist, preferences],
  );

  const togglePinTab = useCallback(
    (tabId) => {
      const pinned = new Set(preferences.pinned ?? []);
      if (pinned.has(tabId)) pinned.delete(tabId);
      else pinned.add(tabId);
      persist({ ...preferences, pinned: [...pinned] });
    },
    [persist, preferences],
  );

  const resetTabs = useCallback(() => {
    persist(getDefaultProjectDetailTabPreferences());
  }, [persist]);

  return {
    orderedTabs,
    pinnedIds: preferences.pinned ?? [],
    reorderTabs,
    togglePinTab,
    resetTabs,
  };
}
