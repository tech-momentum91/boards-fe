import { useEffect, useMemo, useState } from 'react';
import { fetchStatusOptions } from '@/hooks/use-status-options';
import { PROJECT_GLOBAL_LAYOUT_STATUS_FILTER_GROUPS } from '@/components/projects/global-layout/project-global-layout-status-filter-config';
import {
  getGlobalLayoutStatusFilterScope,
  mapGlobalLayoutStatusFilterOptions,
} from '@/components/projects/global-layout/project-global-layout-status-filter-helpers';

/**
 * Load Status Master options for every global-layout filter group (by task type).
 */
export function useGlobalLayoutStatusFilterGroups(
  groupDefs = PROJECT_GLOBAL_LAYOUT_STATUS_FILTER_GROUPS,
) {
  const [optionsByTaskType, setOptionsByTaskType] = useState({});
  const [loading, setLoading] = useState(true);

  const groupKey = useMemo(
    () => (groupDefs ?? []).map((group) => `${group.id}:${group.taskType}`).join('|'),
    [groupDefs],
  );

  useEffect(() => {
    let cancelled = false;
    const defs = groupDefs ?? [];

    if (defs.length === 0) {
      setOptionsByTaskType({});
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    (async () => {
      try {
        const entries = await Promise.all(
          defs.map(async (group) => {
            const options = await fetchStatusOptions(
              getGlobalLayoutStatusFilterScope(group.taskType),
            );
            return [group.taskType, mapGlobalLayoutStatusFilterOptions(options)];
          }),
        );
        if (!cancelled) {
          setOptionsByTaskType(Object.fromEntries(entries));
        }
      } catch {
        if (!cancelled) {
          setOptionsByTaskType(
            Object.fromEntries(
              defs.map((group) => [group.taskType, mapGlobalLayoutStatusFilterOptions([])]),
            ),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [groupDefs, groupKey]);

  const groups = useMemo(
    () =>
      (groupDefs ?? []).map((group) => ({
        ...group,
        statuses: optionsByTaskType[group.taskType] ?? mapGlobalLayoutStatusFilterOptions([]),
      })),
    [groupDefs, optionsByTaskType],
  );

  return { groups, loading };
}
