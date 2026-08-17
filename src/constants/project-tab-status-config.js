/** Task.status scopes and completed quick-filter values per project detail tab. */
export const PROJECT_TAB_STATUS = {
  task: { context: 'Project Tasks', completed: 'Completed' },
  snag: { context: 'Snag Tasks', completed: 'Completed' },
  gfc: { context: 'GFC Tasks', completed: 'Completed' },
  document: { context: 'Document Tasks', completed: 'Completed' },
  threeD: { context: '3D Tasks', completed: 'Completed' },
  graphics: { context: 'Graphics Tasks', completed: 'Completed' },
  // Layout Tasks = Task.type scope (global-layout markers). Project Layout doctype uses PROJECT_LAYOUT_STATUS_CONFIG.
  layout: { context: 'Layout Tasks', completed: 'Completed' },
};

export const PROJECT_TASK_STATUS_SCOPE = {
  doctype: 'Task',
  field: 'status',
};
