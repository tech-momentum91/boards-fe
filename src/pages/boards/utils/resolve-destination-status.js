import { getStatusTemplateForList } from '@/services/status-template-service';
import {
  buildBoardStatusOptionGroups,
  findMatchingDestinationStatus,
  flattenBoardStatusOptions,
} from '@/pages/boards/utils/task-statuses-utils';

/**
 * Load destination statuses and try to auto-match a source status by name + category.
 * @returns {{ matched: true, status: string } | { matched: false } | { error: string }}
 */
export async function resolveDestinationStatusMatch({
  listId,
  sourceStatusId,
  sourceStatusGroups = [],
  fallbackSourceGroups = [],
} = {}) {
  if (!listId) {
    return { error: 'Destination list is required.' };
  }

  const result = await getStatusTemplateForList(listId);
  if (result.error) {
    return { error: result.error };
  }

  const destinationGroups = buildBoardStatusOptionGroups(result.data);
  if (flattenBoardStatusOptions(destinationGroups).length === 0) {
    return { error: 'This list has no enabled statuses. Add a status before continuing.' };
  }

  const matchedStatus = findMatchingDestinationStatus(
    sourceStatusId,
    sourceStatusGroups,
    destinationGroups,
    fallbackSourceGroups,
  );

  if (matchedStatus) {
    return { matched: true, status: matchedStatus };
  }

  return { matched: false };
}

/**
 * Try to match every selected task onto the destination template.
 * @returns {{ matched: true, statusByTaskId: Record<string, string> } | { matched: false } | { error: string }}
 */
export async function resolveBulkDestinationStatusMatches({
  listId,
  tasks = [],
  sourceStatusGroups = [],
  fallbackSourceGroups = [],
} = {}) {
  if (!listId) {
    return { error: 'Destination list is required.' };
  }

  const result = await getStatusTemplateForList(listId);
  if (result.error) {
    return { error: result.error };
  }

  const destinationGroups = buildBoardStatusOptionGroups(result.data);
  if (flattenBoardStatusOptions(destinationGroups).length === 0) {
    return { error: 'This list has no enabled statuses. Add a status before continuing.' };
  }

  const statusByTaskId = {};
  for (const task of tasks) {
    if (!task?.id) {
      continue;
    }

    const matchedStatus = findMatchingDestinationStatus(
      task.status,
      sourceStatusGroups,
      destinationGroups,
      fallbackSourceGroups,
    );

    if (!matchedStatus) {
      return { matched: false };
    }

    statusByTaskId[task.id] = matchedStatus;
  }

  if (Object.keys(statusByTaskId).length === 0) {
    return { matched: false };
  }

  return { matched: true, statusByTaskId };
}
