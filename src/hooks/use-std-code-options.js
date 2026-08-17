import { useEffect, useState } from 'react';
import { buildAllStdCodeOptions, buildStdCodeOptionsForLocation } from '@/utils/std-code-lookup';

/** Single shared promise so concurrent callers await the same load (no stale reassignment). */
let stdRecordsPromise = null;

function loadStdRecords() {
  if (!stdRecordsPromise) {
    stdRecordsPromise = import('@/constants/std-codes.json').then(
      (module) => module.default?.records || [],
    );
  }
  return stdRecordsPromise;
}

export function useStdCodeOptions(centerDetails, useFullStdList) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    loadStdRecords()
      .then((records) => {
        if (cancelled) return;
        const next = useFullStdList
          ? buildAllStdCodeOptions(records)
          : buildStdCodeOptionsForLocation(records, centerDetails?.state, centerDetails?.city)
              .options;
        setOptions(next);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [centerDetails?.state, centerDetails?.city, useFullStdList]);

  return { options, loading };
}
