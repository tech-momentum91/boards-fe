/** Maps React table ids to backend User Listview Preference keys. */
export const PROJECT_COLUMN_TABLE_IDS = {
  LIST: 'projects-list',
  TASK: 'project-detail-task',
  LAYOUT: 'project-detail-layout',
  AREAS: 'project-detail-areas',
  GFC: 'project-detail-gfc',
  THREE_D: 'project-detail-three-d',
  GRAPHICS: 'project-detail-graphics',
  DOCUMENT: 'project-detail-document',
  SNAG: 'project-detail-snag',
};

export const PROJECT_COLUMN_TABLE_REGISTRY = {
  [PROJECT_COLUMN_TABLE_IDS.LIST]: {
    doctype: 'Project',
    react_table_id: PROJECT_COLUMN_TABLE_IDS.LIST,
  },
  [PROJECT_COLUMN_TABLE_IDS.TASK]: {
    doctype: 'Task',
    react_table_id: PROJECT_COLUMN_TABLE_IDS.TASK,
  },
  [PROJECT_COLUMN_TABLE_IDS.LAYOUT]: {
    doctype: 'Project Layout',
    react_table_id: PROJECT_COLUMN_TABLE_IDS.LAYOUT,
  },
  [PROJECT_COLUMN_TABLE_IDS.AREAS]: {
    doctype: 'Project Layout Area',
    react_table_id: PROJECT_COLUMN_TABLE_IDS.AREAS,
  },
  [PROJECT_COLUMN_TABLE_IDS.GFC]: { doctype: 'Task', react_table_id: PROJECT_COLUMN_TABLE_IDS.GFC },
  [PROJECT_COLUMN_TABLE_IDS.THREE_D]: {
    doctype: 'Task',
    react_table_id: PROJECT_COLUMN_TABLE_IDS.THREE_D,
  },
  [PROJECT_COLUMN_TABLE_IDS.GRAPHICS]: {
    doctype: 'Task',
    react_table_id: PROJECT_COLUMN_TABLE_IDS.GRAPHICS,
  },
  [PROJECT_COLUMN_TABLE_IDS.DOCUMENT]: {
    doctype: 'Task',
    react_table_id: PROJECT_COLUMN_TABLE_IDS.DOCUMENT,
  },
  [PROJECT_COLUMN_TABLE_IDS.SNAG]: {
    doctype: 'Task',
    react_table_id: PROJECT_COLUMN_TABLE_IDS.SNAG,
  },
};

export function resolveProjectColumnTableConfig(tableId) {
  const key = String(tableId ?? '').trim();
  return PROJECT_COLUMN_TABLE_REGISTRY[key] ?? null;
}

export function normalizeProjectColumnConfigResponse(data) {
  const raw = data?.message ?? data?.columns ?? data;
  const list = Array.isArray(raw) ? raw : [];
  return list.map((col, index) => ({
    ...col,
    order: col.order ?? index,
  }));
}
