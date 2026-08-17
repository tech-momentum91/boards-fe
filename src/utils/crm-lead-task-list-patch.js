/**
 * Patch Lead CRM Task Master list rows after a successful update without refetching
 * (avoids loading flash / table layout jump).
 */

function lifecycleColorForStage(stageId, lifecycleStages) {
  if (!stageId || !Array.isArray(lifecycleStages)) return '';
  const st = lifecycleStages.find((s) => s.name === stageId);
  return st?.color ?? '';
}

function normalizeDepartment(dept) {
  if (!Array.isArray(dept)) return undefined;
  return dept
    .map((d) => {
      if (typeof d === 'string') return { assignee_type: 'Role', assignee: d };
      if (d && typeof d === 'object' && d.assignee != null) {
        return { assignee_type: d.assignee_type || 'Role', assignee: d.assignee };
      }
      return null;
    })
    .filter(Boolean);
}

function setTriggerOff(value) {
  if (value === false || value === 0 || value === '0') return true;
  if (typeof value === 'string' && value.trim().toLowerCase() === 'false') return true;
  return false;
}

/**
 * @param {Array<object>} tasks
 * @param {string} taskId
 * @param {object} updates — only include fields that changed
 * @param {Array<object>} [lifecycleStages]
 */
export function mergeLeadCrmTaskListRow(tasks, taskId, updates, lifecycleStages = []) {
  if (!taskId || !updates || typeof updates !== 'object') return tasks;
  return tasks.map((row) => {
    if (row.name !== taskId) return row;
    const next = { ...row, ...updates };

    if (updates.lifecycle_stage !== undefined) {
      next.lifecycle_stage_color = updates.lifecycle_stage
        ? lifecycleColorForStage(updates.lifecycle_stage, lifecycleStages)
        : '';
    }

    if (updates.set_trigger !== undefined && setTriggerOff(updates.set_trigger)) {
      next.lifecycle_stage = null;
      next.lifecycle_stage_status = null;
      next.lifecycle_stage_color = '';
      next.pipeline = null;
      next.pipeline_label = '';
    }

    if (updates.department !== undefined) {
      const normalized = normalizeDepartment(updates.department);
      if (normalized !== undefined) next.department = normalized;
    }

    return next;
  });
}

/**
 * Map drawer / full-document update payload to list row field updates.
 * @param {object} payload — same shape as updateLeadCrmTaskMaster POST body
 */
export function listRowUpdatesFromLeadCrmPayload(payload) {
  if (!payload?.task_id) return {};
  const u = {};
  const set = (k, v) => {
    if (v !== undefined) u[k] = v;
  };
  set('task_name', payload.task_name);
  set('description', payload.description);
  set('status', payload.status);
  set('priority', payload.priority);
  set('type', payload.type);
  set('duration', payload.duration);
  set('set_trigger', payload.set_trigger);
  set('pipeline', payload.pipeline);
  set('pipeline_label', payload.pipeline_label);
  set('lifecycle_stage', payload.lifecycle_stage);
  set('lifecycle_stage_status', payload.lifecycle_stage_status);
  set('tags', payload.tags);
  if (payload.department !== undefined) {
    u.department = normalizeDepartment(
      Array.isArray(payload.department) ? payload.department : [payload.department],
    );
  }
  if (payload.drop_reason !== undefined) {
    u.drop_reason = Array.isArray(payload.drop_reason)
      ? payload.drop_reason
      : payload.drop_reason
        ? [payload.drop_reason]
        : [];
  }
  if (payload.trigger_type !== undefined) {
    u.trigger_type = payload.trigger_type;
  }
  if (payload.set_trigger !== undefined && setTriggerOff(payload.set_trigger)) {
    u.lifecycle_stage = null;
    u.lifecycle_stage_status = null;
    u.pipeline = null;
    u.pipeline_label = '';
  }
  return u;
}
