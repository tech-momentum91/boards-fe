// use-column-config.js
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { FIRST_COLUMN_NAME } from '@/constants/constants';

/**
 * Resolve the single pinned (sticky first) column id for a table.
 * An explicit `explicitId` wins when present in the column set — this is needed
 * for tables that contain more than one `FIRST_COLUMN_NAME` candidate (e.g. CRM
 * Leads has both `product` and `name`, and the heuristic would otherwise pin the
 * wrong one and lock it visible). Falls back to the first `FIRST_COLUMN_NAME` match.
 */
const resolvePinnedColumnId = (columns, explicitId = null) => {
  if (!Array.isArray(columns)) return null;
  if (explicitId && columns.some((c) => c.id === explicitId)) return explicitId;
  for (const key of FIRST_COLUMN_NAME ?? []) {
    if (columns.some((c) => c.id === key)) return key;
  }
  return null;
};

/**
 * Simplified hook for managing table column configuration
 * Handles visibility, ordering, and localStorage persistence
 */
export const useColumnConfig = (
  tableId,
  defaultColumns,
  persistCall = function () {},
  getCall = () => {},
  options = {},
) => {
  const { autoSave = true, debounce = 500, pinnedColumnId: pinnedColumnIdOption = null } = options;

  // Normalize default columns: ensure visible is boolean (defaults to true)
  const normalizeColumn = (col) => ({
    ...col,
    visible: col.visible !== false, // Default to true unless explicitly false
  });

  // Helper: build the minimal payload we persist to the backend
  const buildPersistPayload = (cols) =>
    cols.map((col, index) => ({
      id: col.id,
      visible: col.visible,
      order: index,
      label: col.label,
      enableHiding: col.enableHiding,
    }));

  // Helper: shallow equality for persisted configs to avoid redundant saves
  const areConfigsEqual = (a, b) => {
    if (!a || !b || a.length !== b.length) return false;
    for (const [i, ca] of a.entries()) {
      const callback = b[i];
      if (
        ca.id !== callback.id ||
        ca.visible !== callback.visible ||
        ca.order !== callback.order ||
        ca.label !== callback.label ||
        ca.enableHiding !== callback.enableHiding
      ) {
        return false;
      }
    }
    return true;
  };

  // Apply saved config: order and visibility follow the API/saved array order exactly
  const applySavedConfig = useCallback(
    (columnsData, defaults) => {
      const defaultById = new Map(defaults.map((c) => [c.id, c]));
      const pinnedId = resolvePinnedColumnId(defaults, pinnedColumnIdOption);
      const merged = [];
      const used = new Set();
      columnsData.forEach((saved, index) => {
        const defCol = defaultById.get(saved.id);
        if (defCol) {
          used.add(saved.id);
          const isPinned = saved.id === pinnedId;
          merged.push({
            ...defCol,
            label: defCol.label,
            visible: isPinned ? true : (saved.visible ?? defCol.visible !== false),
            order: saved.order ?? index,
          });
        }
      });
      defaults.forEach((defCol, index) => {
        if (!used.has(defCol.id)) {
          const isPinned = defCol.id === pinnedId;
          merged.push({
            ...defCol,
            visible: isPinned ? true : defCol.visible !== false,
            order: merged.length,
          });
        }
      });
      return merged;
    },
    [pinnedColumnIdOption],
  );

  const [columns, setColumns] = useState(() => defaultColumns.map(normalizeColumn));
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);
  const lastSavedConfigRef = useRef(null);

  // Determine pinned column ID (first match from FIRST_COLUMN_NAME for this table)
  const pinnedColumnId = useRef(null);
  useEffect(() => {
    pinnedColumnId.current = resolvePinnedColumnId(columns, pinnedColumnIdOption);
  }, [columns, pinnedColumnIdOption]);

  // Load saved configuration
  useEffect(() => {
    let isMounted = true;

    const loadConfig = async () => {
      if (!tableId) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const saved = await getCall();

        if (!isMounted) return;

        let savedConfig = saved;

        // Parse if string (legacy or stringified response)
        if (typeof saved === 'string') {
          try {
            savedConfig = JSON.parse(saved);
          } catch (error) {
            console.error('Failed to parse saved column config:', error);
          }
        }

        // Handle response wrapping: { columns: [...] } or [...]
        const columnsData = Array.isArray(savedConfig) ? savedConfig : savedConfig?.columns || [];

        if (Array.isArray(columnsData) && columnsData.length > 0) {
          // Apply API order and visibility: build merged from columnsData order
          const merged = applySavedConfig(columnsData, defaultColumns);
          setColumns(merged);
          // Treat loaded config as already saved to avoid an immediate redundant persist
          lastSavedConfigRef.current = buildPersistPayload(merged);
        } else {
          // No saved config (or empty): use defaults and treat them as baseline,
          // so refresh/mount does NOT trigger an auto-save.
          const normalizedDefaults = defaultColumns.map(normalizeColumn);
          setColumns(normalizedDefaults);
          lastSavedConfigRef.current = buildPersistPayload(normalizedDefaults);
        }
      } catch (error) {
        console.error('Failed to load column config:', error);
        // Even if loading fails, set a baseline to avoid saving on mount.
        if (isMounted) {
          const normalizedDefaults = defaultColumns.map(normalizeColumn);
          setColumns(normalizedDefaults);
          lastSavedConfigRef.current = buildPersistPayload(normalizedDefaults);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          isInitialMount.current = false;
        }
      }
    };

    loadConfig();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, defaultColumns]); // Reload if tableId or defaults change

  // Save and optionally apply returned config so UI updates without refresh
  const save = useCallback(
    (cols) => {
      if (!tableId) return;

      const saveFunc = async () => {
        try {
          const toSave = buildPersistPayload(cols);
          const previousSaved = lastSavedConfigRef.current;

          // Skip persist if nothing actually changed
          if (areConfigsEqual(previousSaved, toSave)) {
            return undefined;
          }

          let nextSaved = toSave;
          const result = await persistCall(toSave);

          // If persist returns the latest config (e.g. get after save), apply it so UI updates
          if (result != null) {
            const raw = Array.isArray(result)
              ? result
              : result?.columns || result?.data || result?.message;
            const columnsData = Array.isArray(raw) ? raw : [];
            if (columnsData.length > 0) {
              const merged = applySavedConfig(columnsData, defaultColumns);
              setColumns(merged);
              nextSaved = buildPersistPayload(merged);
            }
          }

          return nextSaved;
        } catch (error) {
          console.error('Failed to save column config:', error);
          return undefined;
        }
      };

      const runSave = () => {
        saveFunc().then((value) => {
          if (value !== undefined) {
            lastSavedConfigRef.current = value;
          }
        });
      };

      if (debounce && autoSave) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(runSave, debounce);
      } else {
        runSave();
      }
    },
    [tableId, debounce, autoSave, persistCall, defaultColumns, applySavedConfig],
  );

  // Auto-save on changes
  useEffect(() => {
    if (!isInitialMount.current && autoSave) {
      save(columns);
    }
  }, [columns, autoSave, save]);

  // Actions
  const reorderColumns = useCallback((startIndex, endIndex) => {
    setColumns((previous) => {
      const result = [...previous];
      const [moved] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, moved);

      // After reordering, update the order field so that
      // applyColumnConfig (and persisted payload) reflects
      // the new visual order.
      return result.map((col, index) => ({
        ...col,
        order: index,
      }));
    });
  }, []);

  /**
   * Reorder by column ids (for header drag). Keeps pinned first and `actions` last.
   */
  const reorderColumnsByIds = useCallback(
    (activeId, overId, { fixedLastIds = ['actions'] } = {}) => {
      if (!activeId || !overId || activeId === overId) return;

      setColumns((previous) => {
        const pinnedId = resolvePinnedColumnId(previous, pinnedColumnIdOption);
        if (activeId === pinnedId || overId === pinnedId) return previous;
        if (fixedLastIds.includes(activeId) || fixedLastIds.includes(overId)) return previous;

        const oldIndex = previous.findIndex((col) => col.id === activeId);
        const newIndex = previous.findIndex((col) => col.id === overId);
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return previous;

        let next = arrayMove(previous, oldIndex, newIndex);

        if (pinnedId) {
          const pinnedIndex = next.findIndex((col) => col.id === pinnedId);
          if (pinnedIndex > 0) {
            const [pinned] = next.splice(pinnedIndex, 1);
            next = [pinned, ...next];
          }
        }

        for (const fixedId of fixedLastIds) {
          const fixedIndex = next.findIndex((col) => col.id === fixedId);
          if (fixedIndex >= 0 && fixedIndex !== next.length - 1) {
            const [fixed] = next.splice(fixedIndex, 1);
            next = [...next, fixed];
          }
        }

        return next.map((col, index) => ({
          ...col,
          order: index,
        }));
      });
    },
    [pinnedColumnIdOption],
  );

  const toggleColumnVisibility = useCallback(
    (columnId) => {
      setColumns((previous) => {
        const pinnedId = resolvePinnedColumnId(previous, pinnedColumnIdOption);
        if (pinnedId && columnId === pinnedId) return previous;

        return previous.map((col) =>
          col.id === columnId ? { ...col, visible: !col.visible } : col,
        );
      });
    },
    [pinnedColumnIdOption],
  );

  const showAllColumns = useCallback(() => {
    setColumns((previous) =>
      previous.map((col) => ({
        ...col,
        visible: col.enableHiding === false ? col.visible : true,
      })),
    );
  }, []);

  const hideAllColumns = useCallback(() => {
    setColumns((previous) => {
      const pinnedId = resolvePinnedColumnId(previous, pinnedColumnIdOption);
      return previous.map((col) => ({
        ...col,
        visible:
          col.enableHiding === false || (pinnedId != null && col.id === pinnedId)
            ? col.visible
            : false,
      }));
    });
  }, [pinnedColumnIdOption]);

  const resetToDefault = useCallback(() => {
    setColumns(defaultColumns.map(normalizeColumn));
    if (tableId) {
      localStorage.removeItem(`column-config-${tableId}`);
    }
  }, [defaultColumns, tableId]);

  const applyExternalConfig = useCallback(
    (columnsData) => {
      if (!Array.isArray(columnsData) || columnsData.length === 0) {
        const normalizedDefaults = defaultColumns.map(normalizeColumn);
        lastSavedConfigRef.current = buildPersistPayload(normalizedDefaults);
        setColumns(normalizedDefaults);
        return;
      }

      const merged = applySavedConfig(columnsData, defaultColumns);
      lastSavedConfigRef.current = buildPersistPayload(merged);
      setColumns(merged);
    },
    [applySavedConfig, defaultColumns],
  );

  // Ensure pinned column stays visible
  useEffect(() => {
    if (!pinnedColumnId.current) return;
    setColumns((previous) =>
      previous.map((col) => (col.id === pinnedColumnId.current ? { ...col, visible: true } : col)),
    );
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    columns,
    visibleColumns: columns.filter((col) => col.visible),
    isLoading,
    setColumns,
    applyExternalConfig,
    reorderColumns,
    reorderColumnsByIds,
    toggleColumnVisibility,
    showAllColumns,
    hideAllColumns,
    resetToDefault,
  };
};

/**
 * Stable `columnConfigHook` shape for StatusColumnPopover when column defs are built in
 * useMemo before `useColumnConfig` (satisfies eslint no-use-before-define). After
 * `useColumnConfig`, call `syncColumnConfigHookToPopover(realHook)` each render.
 */
export const useColumnConfigPopoverRef = () => {
  const ref = useRef(null);
  const statusPopoverColumnConfig = useMemo(
    () => ({
      toggleColumnVisibility: (columnId) => ref.current?.toggleColumnVisibility?.(columnId),
    }),
    [],
  );
  const syncColumnConfigHookToPopover = useCallback((hook) => {
    ref.current = hook;
  }, []);
  return { statusPopoverColumnConfig, syncColumnConfigHookToPopover };
};
