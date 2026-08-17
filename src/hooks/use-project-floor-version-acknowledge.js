import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';

import { acknowledgeProjectFloorVersionForTask } from '@/redux/projectSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';

function resolveFloorLockedVersion(row, floorLockedVersion) {
  if (floorLockedVersion != null && floorLockedVersion !== '') {
    return Number(floorLockedVersion);
  }

  const options = Array.isArray(row?.floor_version_options) ? row.floor_version_options : [];
  const latestOption = options.find((option) => option?.is_latest) ?? options[options.length - 1];
  if (latestOption?.value != null) return Number(latestOption.value);
  if (row?.parent_version != null && row.parent_version !== '') {
    return Number(row.parent_version);
  }
  return undefined;
}

export function useProjectFloorVersionAcknowledge({ onAfterAcknowledge } = {}) {
  const dispatch = useDispatch();
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [acknowledgingTaskId, setAcknowledgingTaskId] = useState('');

  const acknowledgeTaskFloorVersion = useCallback(
    async (row, floorLockedVersion) => {
      const taskId = String(row?.id ?? '').trim();
      if (!taskId) return;

      setIsAcknowledging(true);
      setAcknowledgingTaskId(taskId);
      try {
        const result = await dispatch(
          acknowledgeProjectFloorVersionForTask({
            taskId,
            floorLockedVersion: resolveFloorLockedVersion(row, floorLockedVersion),
          }),
        ).unwrap();
        showSuccessToast(result?.message ?? 'Task synced to floor version');
        await onAfterAcknowledge?.(taskId, result);
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      } finally {
        setIsAcknowledging(false);
        setAcknowledgingTaskId('');
      }
    },
    [dispatch, onAfterAcknowledge],
  );

  return {
    isAcknowledging,
    acknowledgingTaskId,
    acknowledgeTaskFloorVersion,
  };
}
