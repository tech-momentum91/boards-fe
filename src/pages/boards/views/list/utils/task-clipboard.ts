const TASK_CLIPBOARD_KEY = 'devx-boards-task-clipboard';

export function setTaskClipboard(taskIds = [], sourceListId = null) {
  const ids = [...new Set((Array.isArray(taskIds) ? taskIds : []).filter(Boolean))];
  if (ids.length === 0) {
    return;
  }

  try {
    localStorage.setItem(
      TASK_CLIPBOARD_KEY,
      JSON.stringify({ taskIds: ids, sourceListId, copiedAt: Date.now() }),
    );
  } catch {
    // ignore storage errors
  }
}

export function getTaskClipboard() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TASK_CLIPBOARD_KEY));
    if (!parsed || !Array.isArray(parsed.taskIds) || parsed.taskIds.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearTaskClipboard() {
  try {
    localStorage.removeItem(TASK_CLIPBOARD_KEY);
  } catch {
    // ignore storage errors
  }
}
