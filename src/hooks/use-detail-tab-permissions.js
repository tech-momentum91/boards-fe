import { useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { hasModulePermission } from '@/utils/user-role-utils';

/** Tab option objects may use `value` (partner/events) or `key` (clients). */
export function tabDefId(def) {
  return def?.value ?? def?.key ?? '';
}

/** Tab visible if mapped module has `read` or `write` (either is enough). */
export function useCanReadDetailTab(tabReadModuleMap) {
  const userSideBarPerm = useSelector((s) => s.auth?.userSideBarPerm);
  return useCallback(
    (tabValue) => {
      if (!userSideBarPerm?.data?.message?.role) return true;
      const moduleName = tabReadModuleMap[tabValue];
      if (moduleName == null) return true;
      return (
        hasModulePermission(userSideBarPerm, moduleName, 'read') ||
        hasModulePermission(userSideBarPerm, moduleName, 'write')
      );
    },
    [userSideBarPerm, tabReadModuleMap],
  );
}

export function usePermittedTabDefs(allDefs, tabReadModuleMap) {
  const canRead = useCanReadDetailTab(tabReadModuleMap);
  return useMemo(
    () => (Array.isArray(allDefs) ? allDefs.filter((t) => canRead(tabDefId(t))) : []),
    [allDefs, canRead],
  );
}

/** When tabs are not driven by URL (no `?tab=` sync). */
export function useClampActiveTabToPermitted(activeTab, setActiveTab, permittedIds) {
  useEffect(() => {
    if (permittedIds.length === 0) return;
    if (!permittedIds.includes(activeTab)) {
      setActiveTab(permittedIds[0]);
    }
  }, [activeTab, permittedIds, setActiveTab]);
}

/**
 * Single effect: align `activeTab` + search param (default `tab`) with permission-filtered tab ids.
 * Same pattern as `center-detail-page.jsx` (URL is source of truth on load/back/forward).
 * @param {string} [searchParamKey] Query key, e.g. `tabs` for CP account/contact detail.
 */
export function useSyncDetailTabSearchParams({
  validTabs,
  defaultTabKey,
  permittedIds,
  searchParams,
  setSearchParams,
  setActiveTab,
  searchParamKey = 'tab',
}) {
  const location = useLocation();

  useEffect(() => {
    if (permittedIds.length === 0) return;

    const raw = searchParams.get(searchParamKey);
    const urlTab = raw || defaultTabKey;
    if (!validTabs.includes(urlTab)) return;

    const resolved = permittedIds.includes(urlTab) ? urlTab : permittedIds[0];

    setActiveTab((current) => (current === resolved ? current : resolved));

    const urlMatches =
      (resolved === defaultTabKey && raw == null) ||
      (resolved !== defaultTabKey && raw === resolved);
    if (urlMatches) return;

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (resolved === defaultTabKey) next.delete(searchParamKey);
        else next.set(searchParamKey, resolved);
        return next;
      },
      { replace: true, state: location.state },
    );
  }, [
    searchParams,
    permittedIds,
    validTabs,
    defaultTabKey,
    setSearchParams,
    setActiveTab,
    searchParamKey,
    location.state,
  ]);
}
