import {
  RiBuildingLine,
  RiBox3Line,
  RiCalendarLine,
  RiFlagLine,
  RiHashtag,
  RiPriceTag3Line,
  RiTeamLine,
  RiTicketLine,
  RiText,
  RiUser2Line,
  RiUserLine,
} from 'react-icons/ri';
import { ERP_MODULES } from '../constants/list-custom-fields-constants';

export const ERP_COLUMN_PREFIX = 'erp:';

const MODULE_ICON_BY_ID = Object.fromEntries(ERP_MODULES.map((module) => [module.id, module.icon]));

const FIELD_ICON_HINTS = [
  { match: /date|due|created|updated|closed|done/, icon: RiCalendarLine },
  { match: /status|stage|label|tag/, icon: RiPriceTag3Line },
  { match: /assignee|owner|people|user|created-by/, icon: RiUserLine },
  { match: /priority|flag/, icon: RiFlagLine },
  { match: /capacity|number|count|pax|workstation/, icon: RiHashtag },
  { match: /ticket/, icon: RiTicketLine },
  { match: /center|location|city|state|zone/, icon: RiBuildingLine },
  { match: /space|inventory/, icon: RiBox3Line },
  { match: /vendor|partner|team/, icon: RiTeamLine },
  { match: /client|customer/, icon: RiUser2Line },
];

export function getErpColumnKey(moduleId, fieldId) {
  return `${ERP_COLUMN_PREFIX}${moduleId}:${fieldId}`;
}

export function isErpColumn(column = {}) {
  return Boolean(column?.erp) || String(column?.key ?? '').startsWith(ERP_COLUMN_PREFIX);
}

export function parseErpColumnKey(key = '') {
  const normalized = String(key ?? '');
  if (!normalized.startsWith(ERP_COLUMN_PREFIX)) {
    return null;
  }

  const remainder = normalized.slice(ERP_COLUMN_PREFIX.length);
  const separatorIndex = remainder.indexOf(':');
  if (separatorIndex <= 0) {
    return null;
  }

  return {
    moduleId: remainder.slice(0, separatorIndex),
    fieldId: remainder.slice(separatorIndex + 1),
  };
}

export function getErpFieldIcon(moduleId, fieldId = '', label = '') {
  const haystack = `${fieldId} ${label}`.toLowerCase();
  const matched = FIELD_ICON_HINTS.find((entry) => entry.match.test(haystack));
  if (matched) {
    return matched.icon;
  }

  return MODULE_ICON_BY_ID[moduleId] ?? RiText;
}

export function createErpColumn({ moduleId, moduleLabel, fieldId, label }) {
  return {
    key: getErpColumnKey(moduleId, fieldId),
    fieldId,
    label,
    fieldType: 'text',
    moduleId,
    moduleLabel,
    erp: true,
    custom: true,
    visible: true,
  };
}

export function getErpLinkCacheKey(link) {
  if (!link?.doctype || !link?.docname) {
    return '';
  }

  return `${link.doctype}::${link.docname}`;
}

export function getTaskErpFieldValue(task, column, erpValuesByLink = {}) {
  if (!isErpColumn(column)) {
    return '';
  }

  const customFields = task?.customFields ?? task?.custom_fields;
  const link = customFields?._systemLink;
  if (!link || typeof link !== 'object') {
    return '';
  }

  if (column.moduleId && link.moduleId && column.moduleId !== link.moduleId) {
    return '';
  }

  // Fast path: primary column snapshot already stored on the link.
  if (column.fieldId && link.primaryColumn === column.fieldId && link.primaryValue) {
    return String(link.primaryValue);
  }

  const cacheKey = getErpLinkCacheKey(link);
  const values =
    (task?._erpFieldValues && typeof task._erpFieldValues === 'object'
      ? task._erpFieldValues
      : null) ?? erpValuesByLink?.[cacheKey];

  if (!values || typeof values !== 'object') {
    return '';
  }

  const fieldId = column.fieldId ?? parseErpColumnKey(column.key)?.fieldId;
  const value = values[fieldId];
  return value == null || value === '' ? '' : String(value);
}

export function enrichTasksWithErpValues(tasks = [], erpValuesByLink = {}) {
  if (tasks.length === 0 || !erpValuesByLink || Object.keys(erpValuesByLink).length === 0) {
    return tasks;
  }

  return tasks.map((task) => {
    const customFields = task?.customFields ?? task?.custom_fields;
    const link = customFields?._systemLink;
    if (!link || typeof link !== 'object') {
      return task;
    }

    const cacheKey = getErpLinkCacheKey(link);
    const values = erpValuesByLink[cacheKey];
    if (!values) {
      return task;
    }

    return { ...task, _erpFieldValues: values };
  });
}

export function collectErpLinksFromTasks(tasks = []) {
  const links = [];
  const seen = new Set();

  tasks.forEach((task) => {
    const customFields = task?.customFields ?? task?.custom_fields;
    const link = customFields?._systemLink;
    if (!link || typeof link !== 'object') {
      return;
    }

    const doctype = String(link.doctype ?? '').trim();
    const docname = String(link.docname ?? '').trim();
    const moduleId = String(link.moduleId ?? '').trim();
    if (!doctype || !docname || !moduleId) {
      return;
    }

    const key = `${doctype}::${docname}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    links.push({
      doctype,
      docname,
      moduleId,
    });
  });

  return links;
}

export function collectVisibleErpColumns(columns = []) {
  return (Array.isArray(columns) ? columns : [])
    .filter((column) => isErpColumn(column) && column.visible !== false)
    .map((column) => ({
      moduleId: column.moduleId,
      fieldId: column.fieldId ?? parseErpColumnKey(column.key)?.fieldId,
    }))
    .filter((column) => column.moduleId && column.fieldId);
}
