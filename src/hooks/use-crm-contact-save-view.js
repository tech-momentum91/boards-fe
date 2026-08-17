import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  CONTACT_VIEW_SAVE_SCOPES,
  areContactViewSettingsEqual,
  collectContactViewDirtySnapshot,
  createEmptyContactViewSettings,
  loadCrmContactViewSettings,
  persistCrmContactViewAutosave,
  persistCrmContactViewSettings,
  resetCrmContactViewSettings,
} from '@/pages/crm/contacts-view/contact-view-settings';

/**
 * CRM Contacts Save View — one saved view per viewKey (default or react_table_id).
 */
export function useCrmContactSaveView({
  appliedFilters,
  sorting,
  groupBy,
  groupOrder,
  searchTerm,
  viewKey = 'default',
  legacyReactTableId,
  columnsRef,
  onApplyViewSettings,
  enabled = true,
}) {
  const [viewHydrated, setViewHydrated] = useState(false);
  const [hasPersonalView, setHasPersonalView] = useState(false);
  const [canSaveViewForAll, setCanSaveViewForAll] = useState(false);
  const [isAutosaveEnabled, setIsAutosaveEnabled] = useState(false);
  const [isSavingView, setIsSavingView] = useState(false);
  const [savedBaseline, setSavedBaseline] = useState(null);
  const [savedColumns, setSavedColumns] = useState([]);
  /** Live column config for dirty detection (table reports via reportColumnsChange). */
  const [liveColumns, setLiveColumns] = useState([]);
  const [baselineReady, setBaselineReady] = useState(false);
  const [loadedScopeKey, setLoadedScopeKey] = useState('');

  const skipPersistRef = useRef(false);
  const autosaveTimerRef = useRef(null);
  const loadRequestIdRef = useRef(0);
  const saveRequestIdRef = useRef(0);
  const nonSilentSaveCountRef = useRef(0);
  const activeScopeKeyRef = useRef('');

  const scopeKey = enabled ? String(viewKey || 'default').trim() || 'default' : '';
  activeScopeKeyRef.current = scopeKey;
  const isActiveScopeLoaded = Boolean(scopeKey) && loadedScopeKey === scopeKey;

  const currentDirtySnapshot = useMemo(() => {
    if (!viewHydrated || !baselineReady || !isActiveScopeLoaded) return null;
    return collectContactViewDirtySnapshot({
      filters: appliedFilters,
      sorting,
      grouping: { groupBy, groupOrder },
      columns: liveColumns,
      settings: { search: searchTerm },
    });
  }, [
    appliedFilters,
    baselineReady,
    groupBy,
    groupOrder,
    isActiveScopeLoaded,
    liveColumns,
    searchTerm,
    sorting,
    viewHydrated,
  ]);

  const isViewDirty = useMemo(() => {
    if (
      !viewHydrated ||
      !baselineReady ||
      !isActiveScopeLoaded ||
      !savedBaseline ||
      !currentDirtySnapshot
    ) {
      return false;
    }
    return !areContactViewSettingsEqual(savedBaseline, currentDirtySnapshot);
  }, [baselineReady, currentDirtySnapshot, isActiveScopeLoaded, savedBaseline, viewHydrated]);

  const buildFullSettings = useCallback(() => {
    const columns = Array.isArray(columnsRef?.current)
      ? columnsRef.current
      : Array.isArray(savedColumns)
        ? savedColumns
        : [];

    return {
      filters: appliedFilters,
      sorting,
      grouping: { groupBy, groupOrder },
      columns,
      settings: {
        search: searchTerm,
      },
    };
  }, [appliedFilters, columnsRef, groupBy, groupOrder, savedColumns, searchTerm, sorting]);

  const commitBaselineFromSettings = useCallback(
    (settings) => {
      const snapshot = collectContactViewDirtySnapshot(settings);
      setSavedBaseline(snapshot);
      const nextColumns = Array.isArray(settings.columns) ? settings.columns : [];
      setSavedColumns(nextColumns);
      setLiveColumns(snapshot.columns);
      if (columnsRef) {
        columnsRef.current = nextColumns;
      }
    },
    [columnsRef],
  );

  const applyMetaFromResult = useCallback((data) => {
    setHasPersonalView(Boolean(data?.isPersonal));
    setCanSaveViewForAll(Boolean(data?.canSaveForAll));
    setIsAutosaveEnabled(Boolean(data?.autosaveEnabled));
  }, []);

  const handleSaveView = useCallback(
    async ({ silent = false, scope = CONTACT_VIEW_SAVE_SCOPES.ME } = {}) => {
      if (!scopeKey) return null;

      const normalizedScope =
        scope === CONTACT_VIEW_SAVE_SCOPES.ALL
          ? CONTACT_VIEW_SAVE_SCOPES.ALL
          : CONTACT_VIEW_SAVE_SCOPES.ME;

      if (normalizedScope === CONTACT_VIEW_SAVE_SCOPES.ALL && !canSaveViewForAll) {
        showErrorToast('Only Admin, Super Admin, or System Manager can save the view for everyone');
        return null;
      }

      const saveId = ++saveRequestIdRef.current;
      const saveScopeKey = scopeKey;

      if (!silent) {
        nonSilentSaveCountRef.current += 1;
        setIsSavingView(true);
      }
      try {
        const settings = buildFullSettings();
        const result = await persistCrmContactViewSettings(settings, {
          scope: normalizedScope,
          viewKey: scopeKey,
        });
        if (saveId !== saveRequestIdRef.current || saveScopeKey !== activeScopeKeyRef.current) {
          return null;
        }
        if (result.error) {
          if (!silent) showErrorToast(result.error);
          return null;
        }

        commitBaselineFromSettings(settings);
        setBaselineReady(true);
        applyMetaFromResult({
          ...result.data,
          isPersonal: normalizedScope === CONTACT_VIEW_SAVE_SCOPES.ME,
        });

        if (!silent) {
          showSuccessToast(
            normalizedScope === CONTACT_VIEW_SAVE_SCOPES.ALL
              ? 'View saved for everyone'
              : 'View saved for you',
          );
        }
        return result.data;
      } finally {
        if (!silent) {
          nonSilentSaveCountRef.current = Math.max(0, nonSilentSaveCountRef.current - 1);
          if (nonSilentSaveCountRef.current === 0) {
            setIsSavingView(false);
          }
        }
      }
    },
    [
      applyMetaFromResult,
      buildFullSettings,
      canSaveViewForAll,
      commitBaselineFromSettings,
      scopeKey,
    ],
  );

  const handleRevertView = useCallback(() => {
    if (!savedBaseline) return;
    skipPersistRef.current = true;
    const columns = Array.isArray(savedColumns) ? savedColumns : [];
    setLiveColumns(collectContactViewDirtySnapshot({ ...savedBaseline, columns }).columns);
    if (columnsRef) {
      columnsRef.current = columns;
    }
    onApplyViewSettings?.({
      ...savedBaseline,
      columns,
    });
  }, [columnsRef, onApplyViewSettings, savedBaseline, savedColumns]);

  const handleResetToDefault = useCallback(
    async ({ scope = CONTACT_VIEW_SAVE_SCOPES.ME } = {}) => {
      if (!scopeKey) return;

      const normalizedScope =
        scope === CONTACT_VIEW_SAVE_SCOPES.ALL
          ? CONTACT_VIEW_SAVE_SCOPES.ALL
          : CONTACT_VIEW_SAVE_SCOPES.ME;

      if (normalizedScope === CONTACT_VIEW_SAVE_SCOPES.ALL && !canSaveViewForAll) {
        showErrorToast(
          'Only Admin, Super Admin, or System Manager can reset the view for everyone',
        );
        return;
      }

      const saveId = ++saveRequestIdRef.current;
      const saveScopeKey = scopeKey;

      nonSilentSaveCountRef.current += 1;
      setIsSavingView(true);
      try {
        const result = await resetCrmContactViewSettings({
          scope: normalizedScope,
          viewKey: scopeKey,
        });
        if (saveId !== saveRequestIdRef.current || saveScopeKey !== activeScopeKeyRef.current) {
          return;
        }
        if (result.error) {
          showErrorToast(result.error);
          return;
        }

        const settings = result.data ?? createEmptyContactViewSettings();
        skipPersistRef.current = true;
        onApplyViewSettings?.(settings);
        commitBaselineFromSettings(settings);
        setBaselineReady(true);
        applyMetaFromResult(settings);

        showSuccessToast(
          normalizedScope === CONTACT_VIEW_SAVE_SCOPES.ALL
            ? 'Default view restored for everyone'
            : 'Default view restored',
        );
      } finally {
        nonSilentSaveCountRef.current = Math.max(0, nonSilentSaveCountRef.current - 1);
        if (nonSilentSaveCountRef.current === 0) {
          setIsSavingView(false);
        }
      }
    },
    [
      applyMetaFromResult,
      canSaveViewForAll,
      commitBaselineFromSettings,
      onApplyViewSettings,
      scopeKey,
    ],
  );

  const handleToggleAutosave = useCallback(async () => {
    if (!scopeKey) return;

    const next = !isAutosaveEnabled;
    const result = await persistCrmContactViewAutosave(next, { viewKey: scopeKey });
    if (result.error) {
      showErrorToast(result.error);
      return;
    }

    applyMetaFromResult({
      ...result.data,
      autosaveEnabled: Boolean(result.data?.autosaveEnabled ?? next),
    });

    if (next && isViewDirty) {
      await handleSaveView({ silent: true, scope: CONTACT_VIEW_SAVE_SCOPES.ME });
    }
  }, [applyMetaFromResult, handleSaveView, isAutosaveEnabled, isViewDirty, scopeKey]);

  /**
   * Column rearrange / show-hide report here for Save View dirty detection.
   * Does not write to the server — Save for me / Autosave / Save for all persist.
   */
  const reportColumnsChange = useCallback(
    (columns) => {
      if (!scopeKey || !viewHydrated || !baselineReady || skipPersistRef.current) return;

      const nextColumns = Array.isArray(columns) ? columns : [];
      if (columnsRef) {
        columnsRef.current = nextColumns;
      }
      setLiveColumns(
        collectContactViewDirtySnapshot({
          columns: nextColumns,
        }).columns,
      );
    },
    [baselineReady, columnsRef, scopeKey, viewHydrated],
  );

  const getSavedColumns = useCallback(() => savedColumns, [savedColumns]);

  useEffect(() => {
    if (!enabled) {
      setViewHydrated(true);
      setBaselineReady(true);
      return undefined;
    }

    if (!scopeKey) {
      setViewHydrated(false);
      setBaselineReady(false);
      setLoadedScopeKey('');
      return undefined;
    }

    let cancelled = false;
    const requestId = ++loadRequestIdRef.current;
    ++saveRequestIdRef.current;
    setBaselineReady(false);
    setViewHydrated(false);
    setLoadedScopeKey('');

    (async () => {
      const result = await loadCrmContactViewSettings({
        viewKey: scopeKey,
        legacyReactTableId: legacyReactTableId || scopeKey,
      });
      if (cancelled || requestId !== loadRequestIdRef.current) return;

      if (result.error) {
        showErrorToast(result.error);
        const empty = createEmptyContactViewSettings();
        skipPersistRef.current = true;
        onApplyViewSettings?.(empty);
        commitBaselineFromSettings(empty);
        setHasPersonalView(false);
        setIsAutosaveEnabled(false);
        setLoadedScopeKey(scopeKey);
        setViewHydrated(true);
        setBaselineReady(true);
        return;
      }

      const settings = result.data ?? createEmptyContactViewSettings();
      skipPersistRef.current = true;
      onApplyViewSettings?.(settings);
      commitBaselineFromSettings(settings);
      applyMetaFromResult(settings);
      setLoadedScopeKey(scopeKey);
      setViewHydrated(true);
      setBaselineReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // Reload only when the view identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, scopeKey, legacyReactTableId]);

  useEffect(() => {
    if (!skipPersistRef.current) return undefined;
    const timer = window.setTimeout(() => {
      skipPersistRef.current = false;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentDirtySnapshot, scopeKey]);

  useEffect(() => {
    if (
      !isActiveScopeLoaded ||
      !viewHydrated ||
      !baselineReady ||
      !isAutosaveEnabled ||
      !isViewDirty ||
      skipPersistRef.current
    ) {
      return undefined;
    }

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      handleSaveView({ silent: true, scope: CONTACT_VIEW_SAVE_SCOPES.ME });
    }, 400);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    baselineReady,
    handleSaveView,
    isActiveScopeLoaded,
    isAutosaveEnabled,
    isViewDirty,
    viewHydrated,
  ]);

  return {
    viewHydrated,
    isViewDirty,
    hasPersonalView,
    canSaveViewForAll,
    isAutosaveEnabled,
    isSavingView,
    savedColumns,
    getSavedColumns,
    handleSaveView,
    handleRevertView,
    handleResetToDefault,
    handleToggleAutosave,
    reportColumnsChange,
  };
}
