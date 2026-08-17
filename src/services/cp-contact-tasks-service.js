import apiClient from '@/api/axios';
import { mapAclTaskDocToCpTasksListRowPatch } from '@/utils/acl-task-list-row-patch';

/**
 * CP Contact Tasks service.
 * Uses ACL Task APIs for list/update/activity.
 */

function unwrapMessage(response) {
  return response?.data?.message ?? response?.data ?? response;
}

/**
 * Fetch tasks for a CP contact.
 * @param {string} cpContactId - CP Contact document id
 * @returns {Promise<{ data: Array } | { error: string }>}
 */
export async function getCpContactTasks(cpContactId, query = {}) {
  if (!cpContactId) {
    return { data: [] };
  }
  const { keyword = '', filters } = query;
  try {
    const params = {
      type: 'cp_contact',
      entity_id: cpContactId,
      keyword: keyword || '',
      page: 1,
      page_size: 20,
      order_by: 'creation',
      order_dir: 'desc',
    };
    if (filters && typeof filters === 'object' && Object.keys(filters).length > 0) {
      params.filters = JSON.stringify(filters);
    }
    const response = await apiClient.get('/method/devx.devx_crm.api.acl_task.get_acl_task_list', {
      params,
    });
    const result = response.data;
    const err = handleExcType(result);
    if (err) return err;

    const payload = result?.message ?? result?.data ?? result ?? {};
    const tasks = payload?.results ?? payload?.tasks ?? payload?.data ?? [];
    return { data: Array.isArray(tasks) ? tasks : [] };
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch tasks.';
    return { error: message };
  }
}

/**
 * Update a single CP contact task (ACL Task).
 *
 * Accepts either:
 * - { name, doc } where doc is already a JSON string, or
 * - a CP-style payload { task_row_id|taskId|id|name, status?, due_date?, subject?, assignees?, description?, tags?, priority?, type? }
 *   which will be converted to the ACL Task doc format.
 */
export async function updateCpContactTask(payload) {
  const name =
    payload?.name ?? payload?.task_row_id ?? payload?.taskId ?? payload?.id ?? payload?.name;
  let doc = payload?.doc;
  if (!doc) {
    const docObj = {};
    if (payload?.status != null) docObj.status = payload.status;
    if (payload?.due_date != null) docObj.exp_end_date = payload.due_date;
    if (payload?.subject != null) docObj.subject = payload.subject;
    if (payload?.description != null) docObj.description = payload.description;
    if (payload?.assignees != null) docObj.assignees = payload.assignees;
    if (payload?.tags != null) docObj.tags = payload.tags;
    if (payload?.priority != null) docObj.priority = payload.priority;
    if (payload?.type != null) docObj.type = payload.type;
    doc = JSON.stringify(docObj);
  }
  const doRequest = () =>
    apiClient.post('/method/devx.devx_crm.api.acl_task.update_acl_task', { name, doc });

  const parseResult = (result) => {
    if (result?.exc_type) {
      const msg = result._server_messages
        ? (() => {
            try {
              const arr = JSON.parse(result._server_messages);
              return Array.isArray(arr) ? arr.pop() : result.message;
            } catch {
              return result.message;
            }
          })()
        : result.message;
      return { error: msg || 'Failed to update task.' };
    }
    const raw = result?.message ?? result?.data ?? result ?? {};
    const doc = typeof raw === 'object' && raw !== null ? raw : {};
    return { data: mapAclTaskDocToCpTasksListRowPatch(doc) };
  };

  try {
    let response = await doRequest();
    let result = response.data;
    let out = parseResult(result);
    if (out.error && (response.status === 500 || result?.exc_type)) {
      await new Promise((r) => setTimeout(r, 400));
      try {
        response = await doRequest();
        result = response.data;
        out = parseResult(result);
      } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to update task.';
        return { error: message };
      }
    }
    return out;
  } catch (error) {
    if (error.response?.status === 500) {
      await new Promise((r) => setTimeout(r, 400));
      try {
        const response = await doRequest();
        return parseResult(response.data);
      } catch {
        // fall through
      }
    }
    const message = error.response?.data?.message || error.message || 'Failed to update task.';
    return { error: message };
  }
}

function handleExcType(result) {
  if (result?.exc_type) {
    const msg = result._server_messages
      ? (() => {
          try {
            const arr = JSON.parse(result._server_messages);
            return Array.isArray(arr) ? arr.pop() : result.message;
          } catch {
            return result.message;
          }
        })()
      : result.message;
    return { error: msg || 'Request failed.' };
  }
  return null;
}
