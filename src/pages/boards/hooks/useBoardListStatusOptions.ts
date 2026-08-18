import { useEffect, useMemo, useState } from 'react';
import { getStatusTemplateForList } from '@/services/status-template-service';
import {
  buildBoardStatusOptionGroups,
  flattenBoardStatusOptions,
  getDefaultBoardStatusValue,
} from '../utils/task-statuses-utils';

export function useBoardListStatusOptions(listId, refreshKey = 0) {
  const [groups, setGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!listId) {
      setGroups([]);
      setAllGroups([]);
      setError(null);
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadStatuses = async () => {
      setIsLoading(true);
      setError(null);

      const result = await getStatusTemplateForList(listId);

      if (cancelled) {
        return;
      }

      if (result.error) {
        setGroups([]);
        setAllGroups([]);
        setError(result.error);
        setIsLoading(false);
        return;
      }

      setAllGroups(buildBoardStatusOptionGroups(result.data, { enabledOnly: false }));
      setGroups(buildBoardStatusOptionGroups(result.data, { enabledOnly: true }));
      setIsLoading(false);
    };

    loadStatuses();

    return () => {
      cancelled = true;
    };
  }, [listId, refreshKey]);

  const options = useMemo(() => flattenBoardStatusOptions(groups), [groups]);
  const defaultStatusId = useMemo(() => getDefaultBoardStatusValue(groups), [groups]);

  return {
    groups,
    allGroups,
    options,
    defaultStatusId,
    isLoading,
    error,
  };
}
