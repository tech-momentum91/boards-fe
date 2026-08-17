import apiClient from './axios';

/**
 * Project 3D gallery list — latest version per task with cover image.
 * @param {{
 *   project: string,
 *   keyword?: string,
 *   filters?: object[],
 *   page?: number,
 *   limit_page_length?: number,
 *   order_by?: string,
 * }} params
 */
export async function fetchProjectThreeDGalleryListview({
  project,
  keyword = '',
  filters = [],
  page = 1,
  limit_page_length = 20,
  order_by = 'creation desc',
} = {}) {
  const projectId = String(project ?? '').trim();
  if (!projectId) {
    throw new Error('project is required');
  }

  const formData = new FormData();
  formData.append('project', projectId);
  formData.append('task_type', '3D Tasks');
  formData.append('gallery_view', '1');
  formData.append('page', String(page));
  formData.append('limit_page_length', String(limit_page_length));
  formData.append('order_by', order_by);

  const trimmedKeyword = String(keyword ?? '').trim();
  if (trimmedKeyword) {
    formData.append('keyword', trimmedKeyword);
  }

  if (Array.isArray(filters) && filters.length > 0) {
    formData.append('filters', JSON.stringify(filters));
  }

  const response = await apiClient.post(
    '/method/devx.devx_project.api.tasks.get_project_tasks_listview',
    formData,
  );

  return response.data?.message ?? response.data;
}

/**
 * All versions + image attachments for a 3D task gallery preview.
 * @param {string} taskId
 */
export async function fetchProjectThreeDVersionedImages(taskId) {
  const id = String(taskId ?? '').trim();
  if (!id) {
    throw new Error('task_id is required');
  }

  const formData = new FormData();
  formData.append('task_id', id);

  const response = await apiClient.post(
    '/method/devx.devx_project.api.tasks.get_versioned_task_images',
    formData,
  );

  return response.data?.message ?? response.data;
}

/**
 * Delete a project task by document name / task id.
 * @param {string} taskId
 */
export async function deleteProjectTask(taskId) {
  const normalizedTaskId = String(taskId ?? '').trim();
  if (!normalizedTaskId) {
    throw new Error('Task ID is required');
  }

  const response = await apiClient.post('/method/devx.devx_project.api.tasks.delete_project_task', {
    task_id: normalizedTaskId,
  });

  return response.data?.message ?? response.data;
}
