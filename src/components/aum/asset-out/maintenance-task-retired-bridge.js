import { store } from '@/redux/store';
import { updateMaintenanceTask } from '@/redux/aumMaintenanceSlice';

/**
 * Mark maintenance task Needs Retirement via API — creates a draft Asset Out entry.
 * @returns {Promise<{assetOutId: string, outNumber?: string}>}
 */
export async function createAssetOutFromNeedsRetirementTask(taskRow = {}) {
  const amlName = taskRow.sourcePreventiveCheckId || taskRow.aml_name || taskRow.id;
  const result = await store
    .dispatch(
      updateMaintenanceTask({
        amlName,
        patch: { condition: 'Needs Retirement' },
      }),
    )
    .unwrap();

  const assetOutId = result?.updated?.assetOutId;
  if (!assetOutId) {
    throw new Error('Draft Asset Out was not created for this task.');
  }

  return {
    id: assetOutId,
    outNumber: assetOutId,
    assetOutId,
  };
}

/** @deprecated Use createAssetOutFromNeedsRetirementTask */
export async function createAssetOutFromRetiredMaintenanceTask(taskRow = {}) {
  return createAssetOutFromNeedsRetirementTask(taskRow);
}
