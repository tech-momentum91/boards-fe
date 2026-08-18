const SYSTEM_LINK_KEY = '_systemLink';
const SYSTEM_LIST_SOURCE = 'system_list';
const MANUAL_SOURCE = 'manual';

export function getTaskSystemLink(task) {
  const customFields = task?.customFields ?? task?.custom_fields;
  if (!customFields || typeof customFields !== 'object') {
    return null;
  }

  const link = customFields[SYSTEM_LINK_KEY];
  if (!link || typeof link !== 'object') {
    return null;
  }

  const route = typeof link.route === 'string' ? link.route.trim() : '';
  const docname = typeof link.docname === 'string' ? link.docname.trim() : '';
  const moduleId = typeof link.moduleId === 'string' ? link.moduleId.trim() : '';

  // Route is only required for navigation; selection/display can work with module+docname.
  if (!docname || (!route && !moduleId)) {
    return null;
  }

  const source =
    link.source === SYSTEM_LIST_SOURCE || link.source === MANUAL_SOURCE ? link.source : null;

  return {
    moduleId: moduleId || String(link.moduleId ?? ''),
    moduleLabel: link.moduleLabel ?? 'Record',
    doctype: link.doctype ?? '',
    docname,
    primaryColumn: link.primaryColumn ?? '',
    primaryColumnLabel: link.primaryColumnLabel ?? '',
    primaryValue: link.primaryValue ?? '',
    route,
    source,
  };
}

/**
 * Title / drawer redirect should only appear for tasks that originated from
 * System List create. Manual ERP field picks also store `_systemLink` for value
 * resolution, but must not show the entity redirect icon.
 *
 * Legacy links without `source`: treat as system-list only when the task title
 * matches the linked primary value (bulk-created pattern).
 */
export function getTaskSystemListRedirectLink(task) {
  const link = getTaskSystemLink(task);
  if (!link?.route) {
    return null;
  }

  if (link.source === MANUAL_SOURCE) {
    return null;
  }

  if (link.source === SYSTEM_LIST_SOURCE) {
    return link;
  }

  const title = String(task?.title ?? '')
    .trim()
    .toLowerCase();
  const primaryValue = String(link.primaryValue ?? '')
    .trim()
    .toLowerCase();

  if (title && primaryValue && title === primaryValue) {
    return link;
  }

  return null;
}

export function getTaskSystemLinkLabel(link) {
  if (!link) {
    return '';
  }

  return link.primaryValue || link.moduleLabel || 'View record';
}

export function getTaskSystemLinkButtonLabel(link) {
  if (!link) {
    return 'Open record';
  }

  if (link.primaryValue) {
    return `Open ${link.primaryValue}`;
  }

  const moduleLabel = link.moduleLabel?.trim();
  if (moduleLabel) {
    return `Open ${moduleLabel}`;
  }

  return 'Open record';
}
