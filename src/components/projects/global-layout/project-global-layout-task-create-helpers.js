import {
  appendProjectTaskMarkerCoordinatesToFormData,
  denormalizeProjectTaskStatus,
} from '@/components/projects/tasks/project-task-helpers';
import { formatDateToYYYYMMDD, parseToDate } from '@/utils/date-utils';
import { normalizeAssignees } from '@/utils/task-utils';

/**
 * Build multipart FormData for `create_project_task` from the global layout marker popover.
 *
 * @param {string} projectId
 * @param {{
 *   taskType: string,
 *   subject: string,
 *   areaId: string,
 *   floor: string,
 *   assignees?: string[],
 *   dueDate?: Date | string | null,
 * }} values
 * @param {{ x: number, y: number } | null | undefined} markerCoordinates
 */
export function buildProjectGlobalLayoutTaskCreateFormData(
  projectId,
  values,
  markerCoordinates = null,
) {
  const formData = new FormData();
  const project = String(projectId ?? '').trim();

  formData.append('project', project);
  formData.append('type', String(values.taskType ?? 'Project Tasks').trim());
  formData.append('subject', String(values.subject ?? '').trim());
  formData.append('description', '');
  formData.append('status', denormalizeProjectTaskStatus('Pending'));
  formData.append('priority', 'Medium');
  formData.append('custom_floor', String(values.floor ?? '').trim());
  formData.append('custom_area', String(values.areaId ?? '').trim());
  formData.append('tags', JSON.stringify([]));

  const dueDate = parseToDate(values.dueDate);
  formData.append('exp_end_date', dueDate ? formatDateToYYYYMMDD(dueDate) : '');

  formData.append('assignees', JSON.stringify(normalizeAssignees(values.assignees ?? [])));
  appendProjectTaskMarkerCoordinatesToFormData(formData, markerCoordinates);

  return formData;
}

/**
 * @param {object[]} areas
 * @returns {{ value: string, label: string, areaType: string }[]}
 */
export function buildGlobalLayoutAreaSelectOptions(areas = []) {
  return (Array.isArray(areas) ? areas : [])
    .map((area) => {
      const value = String(area?.area_id ?? area?.name ?? '').trim();
      const label = String(area?.area_label ?? area?.area_name ?? area?.area ?? value).trim();
      const areaType = String(area?.area_type ?? '').trim();
      if (!value) return null;
      return { value, label, areaType };
    })
    .filter(Boolean);
}

/**
 * @param {object[]} tasks
 * @param {string} filterTaskType
 */
export function filterGlobalLayoutTasks(tasks = [], filterTaskType = '') {
  let list = Array.isArray(tasks) ? tasks : [];

  const normalizedFilter = String(filterTaskType ?? '').trim();
  if (normalizedFilter) {
    list = list.filter(
      (task) => String(task?.type ?? task?.task_type ?? '').trim() === normalizedFilter,
    );
  }

  return list;
}

export const PROJECT_GLOBAL_LAYOUT_DRAFT_MARKER_SOURCE = 'project-global-layout-draft';

/**
 * @param {number} nx
 * @param {number} ny
 * @param {string} taskType
 * @param {string} areaId
 */
export const PROJECT_GLOBAL_LAYOUT_DRAFT_MARKER_ID = 'project-global-layout-draft-marker';

export function buildGlobalLayoutDraftMarkerAnnotation(nx, ny, taskType, areaId = '') {
  return {
    id: PROJECT_GLOBAL_LAYOUT_DRAFT_MARKER_ID,
    type: 'point',
    x: nx,
    y: ny,
    marker: true,
    locked: false,
    visible: true,
    suppressCanvasShape: true,
    hitRadius: 24,
    source: PROJECT_GLOBAL_LAYOUT_DRAFT_MARKER_SOURCE,
    task_type: String(taskType ?? '').trim(),
    area_ref: String(areaId ?? '').trim(),
  };
}
