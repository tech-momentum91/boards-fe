import {
  assignEventTask,
  removeEventTaskAssignments,
  setEventTaskAssignees,
} from '@/redux/eventsSlice';
import { normalizeAssigneeIds } from '@/components/event-management/event-task-assignee-utils';

const uniqueAssigneeIds = (ids) => {
  const seen = new Set();
  const out = [];
  (Array.isArray(ids) ? ids : []).forEach((id) => {
    const value = String(id ?? '').trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(value);
  });
  return out;
};

/** List API shape: [{ name, full_name, user_image }, ...] so avatars resolve without a refetch. */
export const toEventTaskAssigneeEntries = (ids, users) => {
  const list = Array.isArray(users) ? users : [];
  return uniqueAssigneeIds(normalizeAssigneeIds(ids)).map((id) => {
    const lower = String(id).toLowerCase();
    const user = list.find((u) => {
      const keys = [u?.value, u?.email, u?.name, u?.user]
        .filter(Boolean)
        .map((k) => String(k).trim());
      return keys.some((k) => k === id || k.toLowerCase() === lower);
    });
    if (!user) {
      return { name: id, full_name: id, user_image: null };
    }
    return {
      name: user.value || user.email || user.name || id,
      full_name: user.label || user.full_name || user.name || id,
      user_image: user.image || user.user_image || null,
    };
  });
};

/**
 * Optimistic assignee sync: add, then remove.
 * On failure, reconcile to what the server likely has (previous + successful adds),
 * never roll back successful adds after a later remove failure.
 */
export const syncEventTaskAssignees = async ({
  dispatch,
  taskId,
  nextAssignees,
  currentAssignees,
  users,
}) => {
  if (!taskId || !dispatch) {
    return { ok: false, changed: false, error: 'Task name is required', assignees: [] };
  }

  const nextIds = uniqueAssigneeIds(normalizeAssigneeIds(nextAssignees));
  const currentIds = uniqueAssigneeIds(normalizeAssigneeIds(currentAssignees));
  const currentKeys = new Set(currentIds.map((id) => id.toLowerCase()));
  const nextKeys = new Set(nextIds.map((id) => id.toLowerCase()));
  const toAdd = nextIds.filter((id) => !currentKeys.has(id.toLowerCase()));
  const toRemove = currentIds.filter((id) => !nextKeys.has(id.toLowerCase()));

  if (toAdd.length === 0 && toRemove.length === 0) {
    return { ok: true, changed: false, assignees: nextIds };
  }

  dispatch(
    setEventTaskAssignees({
      taskId,
      assignees: toEventTaskAssigneeEntries(nextIds, users),
    }),
  );

  const addedIds = [];
  try {
    if (toAdd.length > 0) {
      await dispatch(assignEventTask({ name: taskId, assign_to: toAdd })).unwrap();
      addedIds.push(...toAdd);
    }
    if (toRemove.length > 0) {
      await dispatch(removeEventTaskAssignments({ name: taskId, assignees: toRemove })).unwrap();
    }
    return { ok: true, changed: true, assignees: nextIds };
  } catch (error) {
    // Add ran before remove. If add succeeded, server still has previous + adds.
    const serverIds = uniqueAssigneeIds([...currentIds, ...addedIds]);
    dispatch(
      setEventTaskAssignees({
        taskId,
        assignees: toEventTaskAssigneeEntries(serverIds, users),
      }),
    );
    return { ok: false, changed: addedIds.length > 0, error, assignees: serverIds };
  }
};
