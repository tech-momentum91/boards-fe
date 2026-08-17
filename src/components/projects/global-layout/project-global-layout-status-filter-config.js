import { PROJECT_TASK_STATUS_SCOPE } from '@/constants/project-tab-status-config';

/**
 * Global layout status filter groups (task-type shells).
 * Status options are loaded from Status Master per `taskType`.
 */
export const PROJECT_GLOBAL_LAYOUT_STATUS_FILTER_GROUPS = [
  {
    id: 'tasks',
    label: 'TASKS',
    taskType: 'Project Tasks',
  },
  {
    id: 'gfc',
    label: 'GFC',
    taskType: 'GFC Tasks',
  },
  {
    id: 'graphics',
    label: 'GRAPHICS',
    taskType: 'Graphics Tasks',
  },
  {
    id: '3d',
    label: "3D'S",
    taskType: '3D Tasks',
  },
  {
    id: 'snags',
    label: 'SNAGS',
    taskType: 'Snag Tasks',
  },
  {
    id: 'site-image',
    label: 'SITE IMAGE',
    taskType: 'Site Image Tasks',
  },
];

/** Used only when Status Master returns no options for a task type. */
export const PROJECT_GLOBAL_LAYOUT_STATUS_FILTER_FALLBACK = [
  { value: 'Pending', label: 'Pending', color: 'blue' },
  { value: 'Working', label: 'Working', color: 'orange' },
  { value: 'Completed', label: 'Completed', color: 'green' },
];

export const PROJECT_GLOBAL_LAYOUT_STATUS_FILTER_SCOPE = PROJECT_TASK_STATUS_SCOPE;

export const PROJECT_GLOBAL_LAYOUT_STATUS_FILTER_GROUP_BY_TASK_TYPE =
  PROJECT_GLOBAL_LAYOUT_STATUS_FILTER_GROUPS.reduce((accumulator, group) => {
    accumulator[group.taskType] = group;
    return accumulator;
  }, {});
