/** Field keys in the unified `projects` Status Master module. */
export const PROJECTS_STATUS_MODULE_ID = 'projects';

export const PROJECT_MASTER_STATUS_FIELD_KEYS = {
  tasks: 'status::Project Tasks',
  layouts: 'status',
  documents: 'status::Document Tasks',
  gfc: 'status::GFC Tasks',
  threeD: 'status::3D Tasks',
  graphics: 'status::Graphics Tasks',
  snags: 'status::Snag Tasks',
  layoutTasks: 'status::Layout Tasks',
  stages: 'custom_project_stage',
};

export const PROJECT_MASTER_STATUS_LABELS = {
  tasks: {
    title: 'Task Statuses',
    subtitle: 'Create and manage project task statuses',
  },
  layouts: {
    title: 'Layout Statuses',
    subtitle: 'Create and manage layout workflow statuses',
  },
  documents: {
    title: 'Document Statuses',
    subtitle: 'Create and manage document task statuses',
  },
};
