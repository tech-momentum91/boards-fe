import apiClient from '@/api/axios';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

export const FLOOR_SYNC_STATUS_METHOD =
  'devx.center_management.floor_sync.get_floor_rename_sync_status';

export const DEFAULT_FLOOR_SYNC_POLL_MS = 2000;
export const MAX_FLOOR_SYNC_POLL_ATTEMPTS = 90;

export function unwrapFrappeMessage(data) {
  if (!data) return {};
  if (data.message && typeof data.message === 'object' && !Array.isArray(data.message)) {
    return data.message;
  }
  return data;
}

export function normalizeFloorEditResponse(response) {
  return unwrapFrappeMessage(response);
}

export async function pollFloorRenameSync(
  jobId,
  { intervalMs = DEFAULT_FLOOR_SYNC_POLL_MS, maxAttempts = MAX_FLOOR_SYNC_POLL_ATTEMPTS } = {},
) {
  if (!jobId) {
    throw new Error('Missing floor sync job id.');
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    const { data } = await apiClient.get(`/method/${FLOOR_SYNC_STATUS_METHOD}`, {
      params: { job_id: jobId },
    });
    const status = unwrapFrappeMessage(data);

    if (!status?.status || status.status === 'unknown') {
      continue;
    }

    if (
      status.status === 'queued' ||
      status.status === 'running' ||
      status.floor_sync_in_progress
    ) {
      continue;
    }

    if (status.status === 'success' || status.status === 'failed') {
      return status;
    }
  }

  throw new Error('Floor update is taking longer than expected. Please refresh and check again.');
}

/**
 * After edit_floor_with_files: poll when block/floor label sync is queued.
 * Returns { immediate, finalStatus, payload }.
 */
export async function waitForFloorLabelSync(editResponse, { onProgress } = {}) {
  const payload = normalizeFloorEditResponse(editResponse);
  const syncJob = payload.sync_job || null;
  const jobId = syncJob?.job_id || payload.poll_job_id || null;

  if (!jobId) {
    return { immediate: true, payload, finalStatus: null };
  }

  const progressMessage =
    payload.user_message ||
    syncJob?.message ||
    payload.message ||
    'Floor update is in progress. Related records are syncing — please wait.';

  onProgress?.(progressMessage);

  const finalStatus = await pollFloorRenameSync(jobId);
  return { immediate: false, payload, finalStatus };
}

export function notifyFloorSyncResult(finalStatus, { onRefresh } = {}) {
  if (!finalStatus) return;

  if (finalStatus.show_success_toast || finalStatus.status === 'success') {
    showSuccessToast(finalStatus.message || 'Floor updated successfully.');
    onRefresh?.();
    return;
  }

  if (finalStatus.show_error_toast || finalStatus.status === 'failed') {
    showErrorToast(
      finalStatus.error || finalStatus.message || 'Floor update failed. No changes were saved.',
    );
    onRefresh?.();
  }
}
