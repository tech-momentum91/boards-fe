import {
  RiBrushLine,
  RiBugFill,
  RiBugLine,
  RiCameraFill,
  RiFileList2Fill,
  RiFileList3Line,
  RiHammerLine,
  RiLayout6Line,
  RiLayoutGridLine,
  RiMapPinFill,
  RiPaletteFill,
  RiPaletteLine,
  RiStackFill,
  RiStackLine,
  RiTaskFill,
  RiTaskLine,
  RiToolsLine,
} from 'react-icons/ri';

/**
 * Task-type marker icons for the project global layout viewer.
 * Update this list to match your project's task types and preferred icons/colors.
 */
export const PROJECT_GLOBAL_LAYOUT_TASK_ICON_OPTIONS = [
  {
    taskType: 'Snag Tasks',
    label: 'Snag Tasks',
    icon: RiBugFill,
    color: '#DF1C41',
  },
  {
    taskType: 'Project Tasks',
    label: 'Project Tasks',
    icon: RiTaskFill,
    color: '#2563eb',
  },
  {
    taskType: 'GFC Tasks',
    label: 'GFC Tasks',
    icon: RiFileList2Fill,
    color: '#16a34a',
  },
  // {
  //   taskType: 'Layout Tasks',
  //   label: 'Layout Tasks',
  //   icon: RiLayout6Line,
  //   color: '#0891b2',
  // },
  {
    taskType: '3D Tasks',
    label: '3D Tasks',
    icon: RiStackFill,
    color: '#7c3aed',
  },
  {
    taskType: 'Graphics Tasks',
    label: 'Graphics Tasks',
    icon: RiPaletteFill,
    color: '#ea580c',
  },
  {
    taskType: 'Site Image Tasks',
    label: 'Site Image',
    icon: RiCameraFill,
    color: '#0ea5e9',
  },
  // {
  //   taskType: 'Design Tasks',
  //   label: 'Design Tasks',
  //   icon: RiBrushLine,
  //   color: '#c026d3',
  // },
  // {
  //   taskType: 'MEPF Tasks',
  //   label: 'MEPF Tasks',
  //   icon: RiToolsLine,
  //   color: '#64748b',
  // },
  // {
  //   taskType: 'Construction Tasks',
  //   label: 'Construction Tasks',
  //   icon: RiHammerLine,
  //   color: '#b45309',
  // },
];

export const PROJECT_GLOBAL_LAYOUT_ALL_TASKS_FILTER = {
  taskType: '',
  label: 'All Tasks',
  icon: RiMapPinFill,
  color: '#64748b',
};

/** Tab filters for the global layout page (replaces the task-type dropdown). */
export const PROJECT_GLOBAL_LAYOUT_TABS = [
  {
    id: 'all',
    label: 'All',
    taskType: '',
    showAreas: true,
    icon: RiLayoutGridLine,
  },
  {
    id: 'tasks',
    label: 'Tasks',
    taskType: 'Project Tasks',
    showAreas: false,
    icon: RiTaskLine,
  },
  {
    id: 'gfc',
    label: 'GFC',
    taskType: 'GFC Tasks',
    showAreas: false,
    icon: RiFileList3Line,
  },
  {
    id: 'graphics',
    label: 'Graphics',
    taskType: 'Graphics Tasks',
    showAreas: false,
    icon: RiPaletteLine,
  },
  {
    id: '3d',
    label: '3D',
    taskType: '3D Tasks',
    showAreas: false,
    icon: RiStackLine,
  },
  {
    id: 'snags',
    label: 'Snags',
    taskType: 'Snag Tasks',
    showAreas: false,
    icon: RiBugLine,
  },
  {
    id: 'site-image',
    label: 'Site Image',
    taskType: 'Site Image Tasks',
    showAreas: false,
    icon: RiCameraFill,
  },
];

/**
 * @param {string} tabId
 */
export function getProjectGlobalLayoutTabConfig(tabId) {
  const normalized = String(tabId ?? '').trim() || 'all';
  return (
    PROJECT_GLOBAL_LAYOUT_TABS.find((tab) => tab.id === normalized) ?? PROJECT_GLOBAL_LAYOUT_TABS[0]
  );
}

/**
 * @param {string} taskType
 */
export function getProjectGlobalLayoutTabIdForTaskType(taskType = '') {
  const normalized = String(taskType ?? '').trim();
  const match = PROJECT_GLOBAL_LAYOUT_TABS.find((tab) => tab.taskType === normalized);
  return match?.id ?? 'all';
}

/**
 * @param {string | null | undefined} taskType
 */
export function getProjectGlobalLayoutTaskIconConfig(taskType) {
  const normalized = String(taskType ?? '').trim();
  if (!normalized) return PROJECT_GLOBAL_LAYOUT_ALL_TASKS_FILTER;

  return (
    PROJECT_GLOBAL_LAYOUT_TASK_ICON_OPTIONS.find((option) => option.taskType === normalized) ?? {
      taskType: normalized,
      label: normalized,
      icon: RiMapPinFill,
      color: '#64748b',
    }
  );
}

/**
 * @param {string[]} discoveredTypes
 * @returns {typeof PROJECT_GLOBAL_LAYOUT_TASK_ICON_OPTIONS}
 */
export function buildProjectGlobalLayoutTaskFilterOptions(discoveredTypes = []) {
  const seen = new Set();
  const options = [];

  for (const option of PROJECT_GLOBAL_LAYOUT_TASK_ICON_OPTIONS) {
    options.push(option);
    seen.add(option.taskType);
  }

  for (const taskType of discoveredTypes) {
    const normalized = String(taskType ?? '').trim();
    if (!normalized || seen.has(normalized)) continue;
    options.push(getProjectGlobalLayoutTaskIconConfig(normalized));
    seen.add(normalized);
  }

  return options;
}
