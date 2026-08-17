import { flattenProjectLayoutAreasToAnnotations } from '@/components/projects/layouts/project-layout-annotation-helpers';

function pixelToNormalized(point, naturalWidth, naturalHeight) {
  const x = Number(point?.x ?? 0);
  const y = Number(point?.y ?? 0);

  if (naturalWidth > 0 && naturalHeight > 0) {
    return {
      x: x / naturalWidth,
      y: y / naturalHeight,
    };
  }

  return { x, y };
}

/**
 * @param {string} projectId
 * @param {{ page?: number, taskType?: string, floor?: string, layoutId?: string }} [params]
 */
export function buildProjectGlobalLayoutUrl(projectId, params = {}) {
  const project = String(projectId ?? '').trim();
  if (!project) return '';

  const search = new URLSearchParams();
  const page = Number(params.page ?? 1);
  if (page > 1) search.set('page', String(page));

  const taskType = String(params.taskType ?? '').trim();
  if (taskType) search.set('task_type', taskType);

  const floor = String(params.floor ?? '').trim();
  if (floor) search.set('floor', floor);

  const layoutId = String(params.layoutId ?? '').trim();
  if (layoutId) search.set('layout_id', layoutId);

  const query = search.toString();
  return `/projects/${encodeURIComponent(project)}/global-layout${query ? `?${query}` : ''}`;
}

/**
 * @param {unknown} message
 */
export function normalizeProjectFloorLayoutBundle(message) {
  const payload = message && typeof message === 'object' ? message : {};
  const floors = Array.isArray(payload.floors) ? payload.floors : [];
  const floor = floors[0] ?? null;

  return {
    project: String(payload.project ?? '').trim(),
    page: Number(payload.page ?? 1) || 1,
    totalPages: Number(payload.total_pages ?? payload.total_count ?? 1) || 1,
    totalCount: Number(payload.total_count ?? payload.total_pages ?? 1) || 1,
    hasMore: Boolean(payload.has_more),
    taskType: String(payload.task_type ?? '').trim(),
    status: payload.status == null ? '' : String(payload.status ?? '').trim(),
    floor,
  };
}

/**
 * @param {object} task
 * @param {number} naturalWidth
 * @param {number} naturalHeight
 */
export function taskMarkerToAnnotation(task, naturalWidth, naturalHeight) {
  if (!task || naturalWidth <= 0 || naturalHeight <= 0) return null;

  const coordinates = task.marker_coordinates ?? task.marker_coordinate ?? null;
  if (!coordinates || typeof coordinates !== 'object') return null;

  const { x, y } = pixelToNormalized(coordinates, naturalWidth, naturalHeight);
  const taskId = String(task.task_id ?? task.name ?? task.id ?? '').trim();
  if (!taskId) return null;

  return {
    id: `task-marker-${taskId}`,
    type: 'point',
    x,
    y,
    marker: true,
    locked: true,
    visible: true,
    saved: true,
    source: 'project-global-layout-task',
    suppressCanvasShape: true,
    task_id: taskId,
    task_type: String(task.type ?? task.task_type ?? '').trim(),
    task,
  };
}

/**
 * @param {object | null | undefined} floor
 * @param {{ imageWidth?: number, imageHeight?: number }} imageSize
 */
export function flattenGlobalLayoutFloorToAnnotations(floor, imageSize) {
  const { imageWidth = 0, imageHeight = 0 } = imageSize ?? {};
  if (!floor || imageWidth <= 0 || imageHeight <= 0) return [];

  const areaAnnotations = flattenProjectLayoutAreasToAnnotations(floor.areas ?? [], imageSize).map(
    (annotation) => ({
      ...annotation,
      locked: true,
      saved: true,
    }),
  );

  const taskAnnotations = (Array.isArray(floor.tasks) ? floor.tasks : [])
    .map((task) => taskMarkerToAnnotation(task, imageWidth, imageHeight))
    .filter(Boolean);

  return [...areaAnnotations, ...taskAnnotations];
}

/**
 * @param {string} taskType
 * @returns {string}
 */
export function getProjectDetailTabForTaskType(taskType = '') {
  const normalized = String(taskType ?? '').trim();
  const map = {
    'Project Tasks': 'tasks',
    'GFC Tasks': 'gfc',
    'Graphics Tasks': 'graphics',
    '3D Tasks': '3d',
    'Snag Tasks': 'snags',
    'Site Image Tasks': 'site-image',
  };
  return map[normalized] ?? 'tasks';
}

/**
 * @param {string} taskType
 * @returns {'task' | 'gfc' | 'graphics' | 'threeD' | 'snag' | 'site-image'}
 */
export function resolveGlobalLayoutTaskViewKind(taskType = '') {
  const tab = getProjectDetailTabForTaskType(taskType);
  if (tab === 'gfc') return 'gfc';
  if (tab === 'graphics') return 'graphics';
  if (tab === '3d') return 'threeD';
  if (tab === 'snags') return 'snag';
  if (tab === 'site-image') return 'site-image';
  return 'task';
}

/**
 * @param {object | null | undefined} task
 */
export function mapGlobalLayoutBundleTaskToListRow(task) {
  if (!task) return null;
  const taskId = String(task?.task_id ?? task?.name ?? '').trim();
  if (!taskId) return null;

  return {
    ...task,
    name: taskId,
    subject: task?.subject ?? '',
  };
}

/**
 * @param {object[]} tasks
 * @returns {string[]}
 */
export function collectTaskTypesFromTasks(tasks = []) {
  const types = new Set();
  for (const task of tasks) {
    const taskType = String(task?.type ?? task?.task_type ?? '').trim();
    if (taskType) types.add(taskType);
  }
  return [...types];
}
