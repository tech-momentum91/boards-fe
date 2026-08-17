import { useCallback, useEffect, useRef, useState } from 'react';

function cloneAnnotations(list) {
  return list.map((a) => ({ ...a }));
}

const DEFAULT_LABEL = (type, index) => {
  const labels = { polygon: 'Space', polyline: 'Path', rectangle: 'Area', point: 'Mark' };
  return `${labels[type] || 'Item'} ${index + 1}`;
};

/**
 * Annotations + undo/redo. Supports controlled (`annotations` + `onChange`) and
 * uncontrolled (`defaultAnnotations`). Use `resetKey` to clear history when loading a new layout.
 *
 * @param {object} options
 * @param {object[] | undefined} options.annotations
 * @param {object[]} [options.defaultAnnotations]
 * @param {(next: object[], meta?: object) => boolean | void} [options.onChange]
 *   Return `false` to reject the change and roll back the history entry (controlled mode).
 * @param {(next: object[], meta?: object) => boolean | void} [options.onAnnotationsChange]
 * @param {string | number} [options.resetKey]
 * @param {number} [options.maxHistory]
 */
export function useFloorPlanAnnotations({
  annotations: value,
  defaultAnnotations = [],
  onChange,
  onAnnotationsChange,
  resetKey,
  maxHistory = 100,
}) {
  const callback = onChange ?? onAnnotationsChange;
  const isControlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = useState(() =>
    cloneAnnotations(Array.isArray(defaultAnnotations) ? defaultAnnotations : []),
  );

  const present = isControlled ? value : uncontrolled;
  const presentRef = useRef(present);
  presentRef.current = present;

  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const capPast = useCallback(
    (arr) => {
      const max = Math.max(0, maxHistory);
      if (arr.length <= max) return arr;
      return arr.slice(-max);
    },
    [maxHistory],
  );

  useEffect(() => {
    setPast([]);
    setFuture([]);
  }, [resetKey]);

  const commitPresent = useCallback(
    (nextList) => {
      const next = cloneAnnotations(nextList);
      const previous = cloneAnnotations(presentRef.current);
      const accepted = callback?.(next, { source: 'floor-plan-editor' });
      if (accepted === false) {
        return;
      }
      setPast((p) => capPast([...p, previous]));
      setFuture([]);
      if (!isControlled) {
        setUncontrolled(next);
      }
    },
    [callback, capPast, isControlled],
  );

  const setAnnotations = useCallback(
    (updater) => {
      const base = presentRef.current;
      const next = typeof updater === 'function' ? updater(base) : updater;
      commitPresent(next);
    },
    [commitPresent],
  );

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const previous = p.at(-1);
      const newPast = p.slice(0, -1);
      setFuture((f) => capPast([cloneAnnotations(presentRef.current), ...f]));
      if (!isControlled) {
        setUncontrolled(cloneAnnotations(previous));
      }
      callback?.(cloneAnnotations(previous), { kind: 'undo' });
      return newPast;
    });
  }, [callback, capPast, isControlled]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const [next, ...rest] = f;
      setPast((p) => capPast([...p, cloneAnnotations(presentRef.current)]));
      if (!isControlled) {
        setUncontrolled(cloneAnnotations(next));
      }
      callback?.(cloneAnnotations(next), { kind: 'redo' });
      return rest;
    });
  }, [callback, capPast, isControlled]);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const addAnnotation = useCallback(
    (item) => {
      setAnnotations((prev) => {
        const label =
          item.label || DEFAULT_LABEL(item.type, prev.filter((a) => a.type === item.type).length);
        const row = {
          ...item,
          id: item.id || crypto.randomUUID(),
          label,
          visible: item.visible !== false,
          locked: Boolean(item.locked),
        };
        return [...prev, row];
      });
    },
    [setAnnotations],
  );

  const updateAnnotation = useCallback(
    (id, patch) => {
      setAnnotations((prev) => {
        const target = prev.find((a) => a.id === id);
        if (!target) return prev;
        const merged = { ...target, ...patch };
        const unchanged =
          Object.keys(patch).every((key) => {
            const nextVal = merged[key];
            const prevVal = target[key];
            return JSON.stringify(nextVal) === JSON.stringify(prevVal);
          }) && Object.keys(patch).length > 0;
        if (unchanged) return prev;
        return prev.map((a) => (a.id === id ? merged : a));
      });
    },
    [setAnnotations],
  );

  const removeAnnotation = useCallback(
    (id) => {
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
    },
    [setAnnotations],
  );

  const toggleVisibility = useCallback(
    (id) => {
      setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, visible: !a.visible } : a)));
    },
    [setAnnotations],
  );

  const toggleLock = useCallback(
    (id) => {
      setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, locked: !a.locked } : a)));
    },
    [setAnnotations],
  );

  const reorderAnnotations = useCallback(
    (orderedIds) => {
      setAnnotations((prev) => {
        const map = new Map(prev.map((a) => [a.id, a]));
        return orderedIds.map((id) => map.get(id)).filter(Boolean);
      });
    },
    [setAnnotations],
  );

  const toggleGroupVisibility = useCallback(
    (ids, nextVisible) => {
      const set = new Set(ids);
      setAnnotations((prev) =>
        prev.map((a) => (set.has(a.id) ? { ...a, visible: nextVisible } : a)),
      );
    },
    [setAnnotations],
  );

  const replacePresentWithoutHistory = useCallback(
    (list) => {
      const next = cloneAnnotations(Array.isArray(list) ? list : []);
      setPast([]);
      setFuture([]);
      if (!isControlled) {
        setUncontrolled(next);
      }
      callback?.(next, { source: 'replace' });
    },
    [callback, isControlled],
  );

  return {
    annotations: present,
    setAnnotations,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    toggleVisibility,
    toggleLock,
    toggleGroupVisibility,
    reorderAnnotations,
    replacePresentWithoutHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
