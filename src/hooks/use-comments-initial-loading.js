import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Show comments loading only on the first fetch for the current entity.
 * Background refetches keep the timeline visible — matches center task drawer UX.
 */
export function useCommentsInitialLoading({
  enabled = true,
  entityId,
  isLoading,
  hasData = false,
}) {
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const previousEntityIdRef = useRef(null);

  useEffect(() => {
    if (!enabled || !entityId) {
      setHasLoadedInitial(false);
      previousEntityIdRef.current = null;
      return;
    }
    if (previousEntityIdRef.current !== entityId) {
      setHasLoadedInitial(false);
      previousEntityIdRef.current = entityId;
    }
  }, [enabled, entityId]);

  useEffect(() => {
    if (!enabled || !entityId) return;
    if (!isLoading && hasData) {
      setHasLoadedInitial(true);
    }
  }, [enabled, entityId, isLoading, hasData]);

  return useMemo(() => {
    if (!enabled || !entityId) return false;
    if (!hasLoadedInitial) return Boolean(isLoading);
    return false;
  }, [enabled, entityId, isLoading, hasLoadedInitial]);
}
