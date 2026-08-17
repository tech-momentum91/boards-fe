import apiClient from '@/api/axios';
import {
  getProductCategoryDisplayLabel,
  parseProductCategoryPath,
} from '@/components/products/product-category-utils';
import {
  appendProjectTaskFilesToFormData,
  appendProjectTaskMarkerCoordinatesToFormData,
  buildProjectTaskUpdateFormData,
  denormalizeProjectTaskPriority,
  denormalizeProjectTaskStatus,
  mapProjectTaskDetailToRow,
  mapProjectTaskListItemToRow,
  normalizeProjectTaskStatus,
  patchProjectTaskRow,
  projectTaskFieldValuesEqual,
} from '@/components/projects/tasks/project-task-helpers';
import { formatDateToYYYYMMDD, parseToDate } from '@/utils/date-utils';
import { normalizeAssignees } from '@/utils/task-utils';

/** @deprecated Interior Product Category is no longer used for snags. */
export async function fetchInteriorProductCategories() {
  return [];
}

export const PROJECT_SNAG_GROUP_BY_API_MAP = {
  snag_source: 'custom_snag_source',
  category: 'custom_category',
  sub_category: 'custom_sub_category',
  status: 'status',
  priority: 'priority',
};

export const PROJECT_SNAG_SOURCE_OPTIONS = [
  { value: 'Internal', label: 'Internal' },
  { value: 'Client', label: 'Client' },
  { value: 'PMC', label: 'PMC' },
  { value: 'External', label: 'External' },
];

export const PUBLIC_SNAG_SOURCE_OPTIONS = [
  { value: 'Internal', label: 'Internal' },
  { value: 'Client', label: 'Client' },
  { value: 'PMC', label: 'PMC' },
  { value: 'External', label: 'External' },
];

export function mapSnagInternalUserOptions(users = []) {
  return (users ?? [])
    .map((user) => ({
      label: user.label || user.full_name || user.name || user.email || 'User',
      value: user.value || user.name || user.email,
      email: user.email,
      name: user.name || user.value,
      full_name: user.full_name || user.label,
      image: user.user_image || user.image,
      avatar: user.user_image || user.image,
    }))
    .filter((user) => user.value)
    .sort((left, right) => left.label.localeCompare(right.label));
}

/** Prefer `users`, then `project_users`, then `internal_users` from public snag context. */
export function mapSnagRaisedByUserOptions(context) {
  const list =
    (Array.isArray(context?.users) && context.users.length > 0 && context.users) ||
    (Array.isArray(context?.project_users) &&
      context.project_users.length > 0 &&
      context.project_users) ||
    context?.internal_users ||
    [];
  return mapSnagInternalUserOptions(list);
}

/**
 * Normalize public snag form context floors + floor_layouts into the shape used by
 * layout preview helpers (`[{ floor, layout_image, areas, ... }]`).
 *
 * API shape:
 * - `floors`: string[] (e.g. ["A-1", "A-2"])
 * - `floor_layouts`: [{ floor, layout_id, layout_image, areas, ... }]
 */
export function normalizePublicSnagFloorLayouts(context) {
  const floorLayouts = Array.isArray(context?.floor_layouts) ? context.floor_layouts : [];
  if (floorLayouts.length > 0) {
    return floorLayouts.filter((row) => row && typeof row === 'object');
  }

  // Fallback: older contexts that embedded layout records under `floors`
  const floors = Array.isArray(context?.floors) ? context.floors : [];
  return floors.filter((row) => row && typeof row === 'object' && row.layout_image);
}

/**
 * Floor dropdown options from public snag context.
 * Prefer string `floors`, else derive from `floor_layouts`.
 */
export function buildPublicSnagFloorOptions(context) {
  const floors = Array.isArray(context?.floors) ? context.floors : [];
  const fromStrings = floors
    .map((floor) => (typeof floor === 'string' ? floor.trim() : String(floor?.floor ?? '').trim()))
    .filter(Boolean)
    .map((value) => ({ value, label: value }));

  if (fromStrings.length > 0) {
    // Keep unique floor labels in order
    const seen = new Set();
    return fromStrings.filter((option) => {
      if (seen.has(option.value)) return false;
      seen.add(option.value);
      return true;
    });
  }

  return normalizePublicSnagFloorLayouts(context)
    .map((row) => {
      const value = String(row?.floor ?? '').trim();
      if (!value) return null;
      return { value, label: value };
    })
    .filter(Boolean);
}

export function buildSnagCategoryOptions(categories = [], currentValue = '') {
  const options = [];
  const seen = new Set();

  const pushValue = (raw) => {
    const value = String(raw ?? '').trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    options.push({
      value,
      label: getProductCategoryDisplayLabel(value) || value,
    });
  };

  pushValue(currentValue);
  (categories ?? []).forEach((row) => {
    if (typeof row === 'string') {
      pushValue(row);
      return;
    }
    pushValue(row?.value ?? row?.name ?? row?.category ?? '');
  });

  return options.sort((left, right) => left.label.localeCompare(right.label));
}

export function buildAllSnagSubcategoryFilterOptions() {
  return [];
}

export function collectSnagAssigneeFilterOptions(rows = []) {
  const seen = new Map();

  (rows ?? []).forEach((row) => {
    (row.assignees ?? []).forEach((assignee) => {
      const value = String(
        assignee.id ?? assignee.value ?? assignee.email ?? assignee.user ?? '',
      ).trim();
      if (!value || seen.has(value)) return;
      seen.set(value, {
        value,
        label: assignee.label ?? assignee.full_name ?? assignee.name ?? value,
      });
    });
  });

  return [...seen.values()].sort((left, right) => left.label.localeCompare(right.label));
}

export function collectSnagCategoryFilterOptions(rows = []) {
  const seen = new Map();
  (rows ?? []).forEach((row) => {
    const value = String(row?.category ?? row?.custom_category ?? '').trim();
    if (!value || seen.has(value)) return;
    seen.set(value, {
      value,
      label: getProductCategoryDisplayLabel(value) || value,
    });
  });
  return [...seen.values()].sort((left, right) => left.label.localeCompare(right.label));
}

export function buildSnagSubcategoryOptions() {
  return [];
}

export function snagCategoryLabel(categoryValue) {
  const normalized = String(categoryValue ?? '').trim();
  if (!normalized) return '—';
  return getProductCategoryDisplayLabel(normalized) || normalized;
}

export function snagSubcategoryLabel(subCategoryValue) {
  const normalized = String(subCategoryValue ?? '').trim();
  if (!normalized) return '—';
  return getProductCategoryDisplayLabel(normalized) || normalized;
}

export function isSnagCategoryMasterPath(value) {
  const parsed = parseProductCategoryPath(value);
  return Boolean(String(parsed.productType ?? '').trim());
}

export function snagSourceLabel(sourceValue) {
  const normalized = String(sourceValue ?? '').trim();
  if (!normalized) return '—';
  return normalized;
}

export function mapProjectSnagListItemToRow(item, { groupId } = {}) {
  const row = mapProjectTaskListItemToRow(item, { groupId });
  const raisedBy = item.raised_by_name ?? item.raised_by ?? item.custom_raised_by ?? '';

  return {
    ...row,
    status: normalizeProjectTaskStatus(item.status ?? row.status),
    category: item.custom_category ?? '',
    sub_category: item.custom_sub_category ?? '',
    custom_category: item.custom_category ?? '',
    custom_sub_category: item.custom_sub_category ?? '',
    snag_source: item.custom_snag_source ?? item.snag_source ?? '',
    custom_snag_source: item.custom_snag_source ?? item.snag_source ?? '',
    source: item.custom_snag_source ?? item.snag_source ?? '',
    raised_by: raisedBy,
    raised_by_name: raisedBy,
    custom_raised_by: item.custom_raised_by ?? raisedBy,
  };
}

export function mapProjectSnagDetailToRow(data, listRowFallback = null) {
  const row = mapProjectTaskDetailToRow(data, listRowFallback);

  return {
    ...row,
    status: normalizeProjectTaskStatus(data?.status ?? listRowFallback?.status ?? row.status),
    category: data?.custom_category ?? listRowFallback?.category ?? '',
    sub_category: data?.custom_sub_category ?? listRowFallback?.sub_category ?? '',
    custom_category: data?.custom_category ?? listRowFallback?.custom_category ?? '',
    custom_sub_category: data?.custom_sub_category ?? listRowFallback?.custom_sub_category ?? '',
    snag_source: data?.custom_snag_source ?? listRowFallback?.snag_source ?? '',
    custom_snag_source: data?.custom_snag_source ?? listRowFallback?.custom_snag_source ?? '',
    source: data?.custom_snag_source ?? listRowFallback?.source ?? '',
    raised_by:
      data?.custom_raised_by ??
      data?.raised_by ??
      data?.raised_by_name ??
      listRowFallback?.raised_by ??
      '',
    raised_by_name:
      data?.raised_by_name ??
      data?.custom_raised_by ??
      data?.raised_by ??
      listRowFallback?.raised_by_name ??
      '',
    custom_raised_by: data?.custom_raised_by ?? listRowFallback?.custom_raised_by ?? '',
    groupId: listRowFallback?.groupId ?? data?.custom_snag_source ?? row.groupId,
  };
}

export function buildPublicSnagFormPath(projectId, key) {
  return `/public/project-snags/${encodeURIComponent(projectId)}?key=${encodeURIComponent(key)}`;
}

export function buildPublicSnagFormCacheKey(projectId, key) {
  const normalizedProject = String(projectId ?? '').trim();
  const normalizedKey = String(key ?? '').trim();
  return `${normalizedProject}::${normalizedKey}`;
}

/** Public snag URLs must use the frontend origin, not the Frappe API host. */
export function resolvePublicSnagFormUrl(shareLinkData, origin) {
  if (!shareLinkData) return null;

  const frontendOrigin = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');

  if (frontendOrigin) {
    const normalizedOrigin = frontendOrigin.replace(/\/$/, '');
    if (shareLinkData.path) {
      const path = shareLinkData.path.startsWith('/')
        ? shareLinkData.path
        : `/${shareLinkData.path}`;
      return `${normalizedOrigin}${path}`;
    }
    if (shareLinkData.project && shareLinkData.key) {
      return `${normalizedOrigin}${buildPublicSnagFormPath(shareLinkData.project, shareLinkData.key)}`;
    }
  }

  return shareLinkData.url ?? null;
}

export function buildPublicSnagSubmitFormData(
  projectId,
  key,
  values,
  attachments = [],
  markerCoordinates = null,
) {
  const formData = new FormData();
  formData.append('project', projectId);
  formData.append('key', key);
  formData.append('subject', String(values.title ?? values.subject ?? '').trim());
  formData.append('description', values.description ?? '');
  formData.append('raised_by', values.raised_by ?? '');
  formData.append('custom_category', values.category ?? '');
  formData.append('custom_sub_category', values.sub_category ?? '');
  formData.append('custom_floor', values.floor ?? '');
  formData.append('custom_area', values.area ?? '');
  formData.append('status', denormalizeProjectTaskStatus(values.status ?? 'To Do'));
  formData.append('priority', 'Medium');
  formData.append('custom_snag_source', values.snag_source ?? 'Client');
  formData.append('custom_marker_coordinates', JSON.stringify(markerCoordinates));

  if (values.due_date) {
    const dueDate = parseToDate(values.due_date);
    if (dueDate) {
      formData.append('exp_end_date', formatDateToYYYYMMDD(dueDate));
    }
  }

  appendProjectTaskFilesToFormData(formData, attachments);
  appendProjectTaskMarkerCoordinatesToFormData(formData, markerCoordinates);

  return formData;
}

export function mapProjectSnagsListviewToGroups(data) {
  if (!data) return [];

  if (Array.isArray(data.groups)) {
    return data.groups.map((group) => ({
      id: String(group.group_value ?? 'Unassigned'),
      rows: (group.items ?? []).map((item) =>
        mapProjectSnagListItemToRow(item, { groupId: group.group_value ?? 'Unassigned' }),
      ),
    }));
  }

  if (Array.isArray(data.results)) {
    return [
      {
        id: 'All',
        rows: data.results.map((item) => mapProjectSnagListItemToRow(item, { groupId: 'All' })),
      },
    ];
  }

  return [];
}

export function buildProjectSnagGroupByParam(groupBy, groupOrder = 'asc') {
  const field = PROJECT_SNAG_GROUP_BY_API_MAP[groupBy];
  if (!field) return '';
  const direction = groupOrder === 'desc' ? 'desc' : 'asc';
  return `${field} ${direction}`;
}

export function buildProjectSnagListviewFilters(selectedFilters = {}) {
  const filters = [];

  if (selectedFilters.category?.length) {
    filters.push(['custom_category', 'in', selectedFilters.category]);
  }

  if (selectedFilters.sub_category?.length) {
    filters.push(['custom_sub_category', 'in', selectedFilters.sub_category]);
  }

  if (selectedFilters.snag_source?.length) {
    filters.push(['custom_snag_source', 'in', selectedFilters.snag_source]);
  }

  if (selectedFilters.status?.length) {
    filters.push([
      'status',
      'in',
      selectedFilters.status.map((value) => denormalizeProjectTaskStatus(value)),
    ]);
  }

  if (selectedFilters.priority?.length) {
    filters.push([
      'priority',
      'in',
      selectedFilters.priority.map((value) => denormalizeProjectTaskPriority(value)),
    ]);
  }

  if (selectedFilters.assignee?.length) {
    filters.push(['assignee', 'in', selectedFilters.assignee]);
  }

  return filters;
}

export function getProjectSnagRowFieldValue(row, fieldName) {
  if (fieldName === 'title') {
    return row?.title ?? row?.subject ?? '';
  }
  if (fieldName === 'category' || fieldName === 'custom_category') {
    return row?.category ?? row?.custom_category ?? '';
  }
  if (fieldName === 'sub_category' || fieldName === 'custom_sub_category') {
    return row?.sub_category ?? row?.custom_sub_category ?? '';
  }
  if (fieldName === 'snag_source' || fieldName === 'custom_snag_source') {
    return row?.snag_source ?? row?.custom_snag_source ?? '';
  }
  if (fieldName === 'floor' || fieldName === 'custom_floor') {
    return row?.floor ?? row?.custom_floor ?? '';
  }
  if (fieldName === 'area' || fieldName === 'custom_area') {
    return row?.area ?? row?.custom_area ?? '';
  }
  if (fieldName === 'status') {
    return row?.status ?? '';
  }
  if (fieldName === 'priority') {
    return row?.priority ?? '';
  }
  if (fieldName === 'due_date' || fieldName === 'exp_end_date') {
    return row?.exp_end_date ?? row?.due_date ?? '';
  }
  if (fieldName === 'assignees' || fieldName === 'assigned_to') {
    return row?.assignees ?? [];
  }
  if (fieldName === 'tags') {
    return row?.tags ?? [];
  }
  if (fieldName === 'description') {
    return row?.description ?? '';
  }
  return row?.[fieldName] ?? '';
}

export function projectSnagFieldValuesEqual(fieldName, left, right) {
  if (fieldName === 'assignees' || fieldName === 'assigned_to') {
    return projectTaskFieldValuesEqual('assignees', left, right);
  }
  if (fieldName === 'tags') {
    return projectTaskFieldValuesEqual('tags', left, right);
  }
  if (fieldName === 'due_date' || fieldName === 'exp_end_date') {
    return projectTaskFieldValuesEqual('exp_end_date', left, right);
  }
  return String(left ?? '') === String(right ?? '');
}

export function buildProjectSnagUpdateFormData(taskId, fieldName, value) {
  switch (fieldName) {
    case 'category':
    case 'custom_category':
    case 'sub_category':
    case 'custom_sub_category':
    case 'snag_source':
    case 'custom_snag_source':
      break;
    default:
      return buildProjectTaskUpdateFormData(taskId, fieldName, value);
  }

  const form = new FormData();
  form.append('task_id', taskId);

  switch (fieldName) {
    case 'category':
    case 'custom_category':
      form.append('custom_category', value ?? '');
      break;
    case 'sub_category':
    case 'custom_sub_category':
      form.append('custom_sub_category', value ?? '');
      break;
    case 'snag_source':
    case 'custom_snag_source':
      form.append('custom_snag_source', value ?? '');
      break;
    default:
      break;
  }

  return form;
}

export function buildProjectSnagCreateFormData(
  projectId,
  values,
  attachments = [],
  markerCoordinates = null,
) {
  const formData = new FormData();
  const project = String(projectId ?? '').trim();

  formData.append('project', project);
  formData.append('type', 'Snag Tasks');
  formData.append('subject', String(values.title ?? values.subject ?? '').trim());
  formData.append('description', values.description ?? '');
  formData.append('status', denormalizeProjectTaskStatus(values.status ?? 'To Do'));
  formData.append('priority', denormalizeProjectTaskPriority(values.priority ?? 'Low'));
  formData.append('custom_category', values.category ?? '');
  formData.append('custom_sub_category', values.sub_category ?? '');
  formData.append('custom_floor', values.floor ?? '');
  formData.append('custom_area', values.area ?? '');
  formData.append('custom_snag_source', values.snag_source ?? '');

  const dueDate = parseToDate(values.due_date);
  formData.append('exp_end_date', dueDate ? formatDateToYYYYMMDD(dueDate) : '');

  formData.append('assignees', JSON.stringify(normalizeAssignees(values.assignees)));
  formData.append(
    'tags',
    JSON.stringify(Array.isArray(values.tags) ? values.tags.filter(Boolean) : []),
  );

  appendProjectTaskFilesToFormData(formData, attachments);
  appendProjectTaskMarkerCoordinatesToFormData(formData, markerCoordinates);

  return formData;
}

export function patchProjectSnagRow(row, fieldName, value) {
  const next = patchProjectTaskRow(row, fieldName, value);

  switch (fieldName) {
    case 'category':
    case 'custom_category':
      next.category = value ?? '';
      next.custom_category = value ?? '';
      break;
    case 'sub_category':
    case 'custom_sub_category':
      next.sub_category = value ?? '';
      next.custom_sub_category = value ?? '';
      break;
    case 'snag_source':
    case 'custom_snag_source':
      next.snag_source = value ?? '';
      next.custom_snag_source = value ?? '';
      break;
    default:
      break;
  }

  return next;
}

export function snagGroupBadgeColor(groupId) {
  const normalized = String(groupId ?? '')
    .trim()
    .toLowerCase();
  if (!normalized || normalized === 'unassigned') return 'gray';
  if (normalized === 'internal') return 'blue';
  if (normalized === 'client') return 'orange';
  if (normalized === 'pmc') return 'purple';
  if (normalized === 'external') return 'orange';
  return 'gray';
}

export function buildBillingQcJmrSnagInitialValues({ item, area, category }) {
  const title = String(item?.po_item ?? item?.subarea ?? '').trim();
  const floor = String(area?.floor_badge ?? area?.floor ?? '').trim();
  const areaId = String(
    item?.projectLayoutArea ?? area?.projectLayoutArea ?? area?.area_id ?? area?.id ?? '',
  ).trim();
  const categoryLabel = String(category?.name ?? category ?? '').trim();

  return {
    title,
    description: String(item?.description ?? '').trim(),
    status: 'To Do',
    assignees: [],
    category: categoryLabel,
    sub_category: '',
    snag_source: 'Internal',
    floor,
    area: areaId,
    due_date: undefined,
    priority: 'Low',
    tags: [],
  };
}
