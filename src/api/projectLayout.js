import apiClient from './axios';

/**
 * Fetch a single project layout by document name (`layout_id`).
 * @param {string} layoutId
 */
export async function getProjectLayout(layoutId) {
  const id = String(layoutId ?? '').trim();
  if (!id) {
    throw new Error('Layout ID is required');
  }

  const response = await apiClient.post('/method/devx.devx_project.api.layout.get_project_layout', {
    layout_id: id,
  });

  const message = response.data?.message ?? response.data;
  return message?.data ?? message;
}

/**
 * List selectable layout areas for a project (used in task forms to pick an area).
 * Each area's `area_id` is the value to store in the task `custom_area` field.
 * @param {{ project?: string, floor?: string, layout_type?: string, layout_id?: string }} params
 * @returns {Promise<{ project: string, total: number, areas: object[] }>}
 */
export async function getLayoutAreas(params = {}) {
  const payload = {};
  ['project', 'floor', 'layout_type', 'layout_id'].forEach((key) => {
    const value = String(params?.[key] ?? '').trim();
    if (value) payload[key] = value;
  });

  const response = await apiClient.post(
    '/method/devx.devx_project.api.layout.get_layout_areas',
    payload,
  );
  const message = response.data?.message ?? response.data;
  return message ?? { project: payload.project ?? '', total: 0, areas: [] };
}

/**
 * Build select options ({ value, label }) for an area dropdown from getLayoutAreas().
 * @param {object[]} areas
 */
export function buildLayoutAreaOptions(areas = []) {
  return (Array.isArray(areas) ? areas : [])
    .map((area) => ({
      value: String(area?.area_id ?? '').trim(),
      label: String(area?.area_label ?? area?.area_id ?? '').trim(),
    }))
    .filter((option) => option.value && option.label);
}

/**
 * Layout area type options from Area Type + Resource Type (backend seeds defaults).
 */
export async function getProjectLayoutAreaTypeOptions() {
  const response = await apiClient.post(
    '/method/devx.devx_project.api.layout.get_layout_area_type_options',
  );
  const message = response.data?.message ?? response.data;
  const apiOptions = Array.isArray(message?.options) ? message.options : [];
  return apiOptions
    .map((option) => ({
      value: String(option?.value ?? option?.label ?? '').trim(),
      label: String(option?.label ?? option?.value ?? '').trim(),
    }))
    .filter((option) => option.value && option.label);
}

/**
 * Create a new Area Type (idempotent). Used by area type "Create new" UI.
 * @param {string} areaTypeName
 * @returns {Promise<{ value: string, label: string, name?: string }>}
 */
export async function createProjectLayoutAreaType(areaTypeName) {
  const name = String(areaTypeName ?? '').trim();
  if (!name) throw new Error('Area type name is required');

  const response = await apiClient.post(
    '/method/devx.devx_project.api.layout.create_layout_area_type',
    { area_type_name: name },
  );
  const message = response.data?.message ?? response.data;
  const value = String(message?.value ?? message?.label ?? message?.name ?? name).trim();
  return { value, label: value, name: value };
}

/**
 * @param {{ layout_id: string, areas: object[] }} payload
 */
export async function createProjectLayoutAreas(payload) {
  const response = await apiClient.post(
    '/method/devx.devx_project.api.layout.create_layout_areas',
    payload,
  );
  return response.data?.message ?? response.data;
}

/**
 * @param {object} payload
 */
export async function editProjectLayoutArea(payload) {
  const response = await apiClient.post(
    '/method/devx.devx_project.api.layout.edit_layout_area',
    payload,
  );
  return response.data?.message ?? response.data;
}

/**
 * @param {string} areaId
 */
export async function deleteProjectLayoutArea(areaId) {
  const id = String(areaId ?? '').trim();
  if (!id) throw new Error('Area ID is required');

  const response = await apiClient.post('/method/devx.devx_project.api.layout.delete_layout_area', {
    area_id: id,
  });
  return response.data?.message ?? response.data;
}

/**
 * Create a Project Layout shell (V0) via layout API — not Task doctype.
 * @param {object} payload
 * @param {File[] | { file: File }[]} [attachments]
 */
export async function createProjectLayout(payload = {}, attachments = []) {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'assignees' || key === 'tags') {
      formData.append(key, JSON.stringify(value));
      return;
    }
    formData.append(key, value);
  });

  (attachments ?? []).forEach((entry) => {
    const file = entry?.file instanceof File ? entry.file : entry;
    if (file instanceof File) formData.append('files', file);
  });

  const response = await apiClient.post(
    '/method/devx.devx_project.api.layout.create_project_layout',
    formData,
  );
  return response.data?.message ?? response.data;
}

/**
 * Update a Project Layout via layout API.
 * @param {string} layoutId
 * @param {object} payload
 * @param {File[] | { file: File }[]} [attachments]
 */
export async function updateProjectLayout(layoutId, payload = {}, attachments = []) {
  const id = String(layoutId ?? '').trim();
  if (!id) throw new Error('Layout ID is required');

  const hasFiles = (attachments ?? []).some(
    (entry) => (entry?.file instanceof File ? entry.file : entry) instanceof File,
  );

  if (hasFiles) {
    const formData = new FormData();
    formData.append('layout_id', id);
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null || key === 'layout_id') return;
      if (key === 'assignees' || key === 'tags') {
        formData.append(key, JSON.stringify(value));
        return;
      }
      formData.append(key, value);
    });
    (attachments ?? []).forEach((entry) => {
      const file = entry?.file instanceof File ? entry.file : entry;
      if (file instanceof File) formData.append('files', file);
    });
    const response = await apiClient.post(
      '/method/devx.devx_project.api.layout.update_project_layout',
      formData,
    );
    return response.data?.message ?? response.data;
  }

  const response = await apiClient.post(
    '/method/devx.devx_project.api.layout.update_project_layout',
    { layout_id: id, ...payload },
  );
  return response.data?.message ?? response.data;
}

/**
 * @param {string} layoutId
 * @param {File} layoutImage
 */
export async function uploadProjectLayoutImage(layoutId, layoutImage) {
  const id = String(layoutId ?? '').trim();
  if (!id) throw new Error('Layout ID is required');
  if (!layoutImage) throw new Error('Layout image is required');

  const formData = new FormData();
  formData.append('layout_id', id);
  formData.append('layout_image', layoutImage);

  const response = await apiClient.post(
    '/method/devx.devx_project.api.layout.upload_layout_image',
    formData,
  );
  const message = response.data?.message ?? response.data;
  return message?.data ?? message;
}

/**
 * Upload a new layout version image (creates a new version record).
 * @param {string} layoutId
 * @param {File} layoutImage
 */
export async function uploadProjectLayoutNewVersion(layoutId, layoutImage) {
  const id = String(layoutId ?? '').trim();
  if (!id) throw new Error('Layout ID is required');
  if (!layoutImage) throw new Error('Layout image is required');

  const formData = new FormData();
  formData.append('layout_id', id);
  formData.append('layout_image', layoutImage);

  const response = await apiClient.post(
    '/method/devx.devx_project.api.layout.upload_layout_new_version',
    formData,
  );
  const message = response.data?.message ?? response.data;
  return message?.data ?? message;
}

/**
 * Lock the active floor layout draft as milestone V{n}.
 * @param {string} layoutId
 */
export async function lockFloorLayout(layoutId) {
  const id = String(layoutId ?? '').trim();
  if (!id) throw new Error('Layout ID is required');

  const response = await apiClient.post('/method/devx.devx_project.api.layout.lock_floor_layout', {
    layout_id: id,
  });
  return response.data?.message ?? response.data;
}

/**
 * Sync a Designer/MEPF layout to a locked floor version (no layout changes).
 * @param {string} layoutId
 * @param {number} [floorLockedVersion]
 */
export async function acknowledgeFloorLayoutVersion(layoutId, floorLockedVersion) {
  const id = String(layoutId ?? '').trim();
  if (!id) throw new Error('Layout ID is required');

  const payload = { layout_id: id };
  if (floorLockedVersion != null && floorLockedVersion !== '') {
    payload.floor_locked_version = Number(floorLockedVersion);
  }

  const response = await apiClient.post(
    '/method/devx.devx_project.api.layout.acknowledge_floor_layout_version',
    payload,
  );
  return response.data?.message ?? response.data;
}

/**
 * Floor locked-version dropdown options for warning UI.
 * @param {{ project: string, floor: string }} params
 */
export async function getFloorLayoutVersionOptions({ project, floor }) {
  const response = await apiClient.post(
    '/method/devx.devx_project.api.layout.get_floor_layout_version_options',
    {
      project: String(project ?? '').trim(),
      floor: String(floor ?? '').trim(),
    },
  );
  const message = response.data?.message ?? response.data;
  return message?.options ?? [];
}

/**
 * Sync a GFC/3D/Graphics task to a locked floor version.
 * @param {string} taskId
 * @param {number} [floorLockedVersion]
 */
export async function acknowledgeFloorVersionForTask(taskId, floorLockedVersion) {
  const id = String(taskId ?? '').trim();
  if (!id) throw new Error('Task ID is required');

  const payload = { task_id: id };
  if (floorLockedVersion != null && floorLockedVersion !== '') {
    payload.floor_locked_version = Number(floorLockedVersion);
  }

  const response = await apiClient.post(
    '/method/devx.devx_project.api.tasks.acknowledge_floor_version_for_task',
    payload,
  );
  return response.data?.message ?? response.data;
}

export function resolveUploadedProjectLayoutId(uploadResult, fallbackLayoutId = '') {
  const fallback = String(fallbackLayoutId ?? '').trim();
  if (!uploadResult || typeof uploadResult !== 'object') return fallback;

  const candidates = [
    uploadResult.layout_id,
    uploadResult.name,
    uploadResult.id,
    uploadResult.data?.layout_id,
    uploadResult.data?.name,
    uploadResult.data?.id,
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate ?? '').trim();
    if (normalized) return normalized;
  }

  return fallback;
}

/**
 * Paginated global layout bundle — one floor per page with areas and task markers.
 * @param {{
 *   project: string,
 *   page?: number,
 *   task_type?: string,
 *   status?: string,
 *   floor?: string,
 *   layout_id?: string,
 * }} params
 */
export async function getProjectFloorLayoutBundle(params = {}) {
  const project = String(params.project ?? '').trim();
  if (!project) throw new Error('Project ID is required');

  const payload = { project };
  const page = Number(params.page ?? 1);
  if (page > 0) payload.page = page;

  const taskType = String(params.task_type ?? params.taskType ?? '').trim();
  if (taskType) payload.task_type = taskType;

  const statuses = Array.isArray(params.statuses)
    ? params.statuses.map((status) => String(status ?? '').trim()).filter(Boolean)
    : [];
  if (statuses.length > 1) {
    payload.statuses = statuses;
  } else {
    const status = String(params.status ?? statuses[0] ?? '').trim();
    if (status) payload.status = status;
  }

  const floor = String(params.floor ?? '').trim();
  if (floor) payload.floor = floor;

  const layoutId = String(params.layout_id ?? params.layoutId ?? '').trim();
  if (layoutId) payload.layout_id = layoutId;

  const response = await apiClient.post(
    '/method/devx.devx_project.api.layout.get_project_floor_layout_bundle',
    payload,
  );

  return response.data?.message ?? response.data;
}
