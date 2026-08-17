import { useCallback, useState } from 'react';

function cloneAnnotations(list) {
  return list.map((a) => ({ ...a }));
}

const DEFAULT_LABEL = (type, index) => {
  const labels = { polygon: 'Space', polyline: 'Path', rectangle: 'Area', point: 'Mark' };
  return `${labels[type] || 'Item'} ${index + 1}`;
};

/**
 * Undo/redo history for annotation list + draft drawing state is kept outside history
 * (cancel draft on undo is acceptable for v1).
 */
export function useLayoutAnnotationState() {
  const [history, setHistory] = useState({
    past: [],
    present: [],
    future: [],
  });

  const annotations = history.present;

  const setAnnotations = useCallback((updater) => {
    setHistory((h) => {
      const base = h.present;
      const next = typeof updater === 'function' ? updater(base) : updater;
      return {
        past: [...h.past, cloneAnnotations(base)],
        present: cloneAnnotations(next),
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const previous = h.past.at(-1);
      const newPast = h.past.slice(0, -1);
      return {
        past: newPast,
        present: cloneAnnotations(previous),
        future: [cloneAnnotations(h.present), ...h.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const [next, ...restFuture] = h.future;
      return {
        past: [...h.past, cloneAnnotations(h.present)],
        present: cloneAnnotations(next),
        future: restFuture,
      };
    });
  }, []);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const addAnnotation = useCallback(
    (item) => {
      setAnnotations((prev) => {
        const label =
          item.label || DEFAULT_LABEL(item.type, prev.filter((a) => a.type === item.type).length);
        return [...prev, { ...item, id: item.id || crypto.randomUUID(), label, visible: true }];
      });
    },
    [setAnnotations],
  );

  const updateAnnotation = useCallback(
    (id, patch) => {
      setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
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

  const replaceAll = useCallback((list) => {
    setHistory((h) => ({
      past: [...h.past, cloneAnnotations(h.present)],
      present: cloneAnnotations(list),
      future: [],
    }));
  }, []);

  /** Replace list without recording undo history (e.g. hydrate from localStorage on mount). */
  const replacePresentWithoutHistory = useCallback((list) => {
    setHistory({
      past: [],
      present: cloneAnnotations(list),
      future: [],
    });
  }, []);

  return {
    annotations,
    setAnnotations,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    toggleVisibility,
    replaceAll,
    replacePresentWithoutHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
