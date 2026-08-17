import { fetchTaskComments } from '@/redux/clientDetailSlice';
import { fetchProjectLayoutComments, fetchProjectSelectionComments } from '@/redux/projectSlice';

export function refreshOpenProjectTaskActivities(dispatch, taskId, openEntityId) {
  const id = String(taskId ?? '').trim();
  const openId = String(openEntityId ?? '').trim();
  if (!id || !openId || id !== openId) return;
  dispatch(fetchTaskComments({ taskName: id }));
}

export function refreshOpenProjectLayoutActivities(dispatch, layoutId, openEntityId) {
  const id = String(layoutId ?? '').trim();
  const openId = String(openEntityId ?? '').trim();
  if (!id || !openId || id !== openId) return;
  dispatch(fetchProjectLayoutComments({ layoutId: id }));
}

export function refreshOpenProjectSelectionActivities(dispatch, selectionId, openEntityId) {
  const id = String(selectionId ?? '').trim();
  const openId = String(openEntityId ?? '').trim();
  if (!id || !openId || id !== openId) return;
  dispatch(fetchProjectSelectionComments({ selectionId: id }));
}
