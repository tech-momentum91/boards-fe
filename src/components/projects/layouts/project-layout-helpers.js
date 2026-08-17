import { PROJECT_DETAIL_LAYOUT_TYPE_OPTIONS } from '@/components/projects/constants';
import {
  appendProjectTaskFilesToFormData,
  denormalizeProjectTaskPriority,
  denormalizeProjectSectionStatus,
  formatProjectTaskVersionLabel,
  getProjectTaskRowFieldValue,
  mapProjectTaskDetailToRow,
  mapProjectTaskListItemToRow,
  normalizeProjectSectionStatus,
  patchProjectTaskRow,
  projectTaskFieldValuesEqual,
} from '@/components/projects/tasks/project-task-helpers';
import { formatDateToYYYYMMDD, parseToDate } from '@/utils/date-utils';
import { normalizeAssignees } from '@/utils/task-utils';

export const PROJECT_LAYOUTS_GROUP_BY_API_MAP = {
  layout_type: 'custom_layout_type',
  status: 'status',
  priority: 'priority',
};

export function mapProjectLayoutListItemToRow(item, { groupId, isHistoryVersion = false } = {}) {
  const normalizedItem = {
    ...item,
    name: item?.name ?? item?.layout_id ?? item?.id,
  };
  const floorLockedVersion = Number(normalizedItem.floor_locked_version ?? 0);
  const row = mapProjectTaskListItemToRow(normalizedItem, { groupId });
  const versions = Array.isArray(item.versions)
    ? item.versions.map((version) => ({
        ...mapProjectLayoutListItemToRow(
          {
            ...version,
            layout_type:
              version.layout_type ??
              version.custom_layout_type ??
              item.layout_type ??
              item.custom_layout_type,
            custom_layout_type:
              version.custom_layout_type ??
              version.layout_type ??
              item.custom_layout_type ??
              item.layout_type,
            floor_locked_version: version.floor_locked_version ?? floorLockedVersion,
          },
          { groupId, isHistoryVersion: true },
        ),
        versions: [],
      }))
    : [];

  const listVersionLabel = formatLayoutVersionFromFields({
    ...normalizedItem,
    display_version:
      normalizedItem.list_display_version ??
      normalizedItem.display_version ??
      formatProjectTaskVersionLabel(normalizedItem),
  });
  // History / accordion rows use the detail label (v0.1), not the list milestone (V0).
  const detailVersionLabel = formatLayoutVersionFromFields({
    ...normalizedItem,
    display_version:
      normalizedItem.display_version ??
      listVersionLabel ??
      formatProjectTaskVersionLabel(normalizedItem),
  });
  // Main list row milestone: keep list_display_version when present (V0 / V1).
  const mainListLabel = isHistoryVersion
    ? detailVersionLabel
    : String(normalizedItem.list_display_version ?? '').trim() || detailVersionLabel;

  return {
    ...row,
    status: normalizeProjectSectionStatus(item.status ?? row.status),
    layout_type: item.custom_layout_type ?? '',
    custom_layout_type: item.custom_layout_type ?? '',
    version: isHistoryVersion ? detailVersionLabel : listVersionLabel,
    display_version: detailVersionLabel,
    list_display_version: isHistoryVersion ? detailVersionLabel : mainListLabel,
    locked_version: item.locked_version ?? 0,
    period_version: item.period_version ?? 0,
    floor_sync: item.floor_sync ?? 0,
    sub_version: item.sub_version ?? 0,
    floor_locked_version: floorLockedVersion,
    can_acknowledge: item.can_acknowledge ?? false,
    floor_version_options: Array.isArray(item.floor_version_options)
      ? item.floor_version_options
      : [],
    warning_reason: item.warning_reason ?? '',
    parent_version: item.parent_version ?? null,
    layout_image: item.layout_image ?? '',
    version_kind: resolveLayoutVersionKind({
      ...normalizedItem,
      display_version: detailVersionLabel,
      floor_locked_version: floorLockedVersion,
      version_kind: item.version_kind,
    }),
    versions,
  };
}

const LAYOUT_VERSION_BADGE_COLORS = {
  locked: 'blue',
  draft: 'orange',
  sub: 'purple',
  synced: 'blue',
  shell: 'gray',
  archived: 'gray',
};

function parseFloorLockedVersion(layout) {
  const explicit = Number(layout?.floor_locked_version ?? 0);
  if (explicit > 0) return explicit;

  const fromList = String(layout?.list_display_version ?? '').match(/^V(\d+)$/);
  return fromList ? Number(fromList[1]) : 0;
}

export function resolveLayoutVersionKind(layout, { floorLockedVersion } = {}) {
  const locked = Number(layout?.locked_version ?? 0);
  const floorLocked =
    Number(floorLockedVersion ?? 0) ||
    Number(layout?.floor_locked_version ?? 0) ||
    parseFloorLockedVersion(layout);

  // Only the current floor lock milestone is "Locked"; older V1/V2… are archived history.
  if (locked > 0) {
    if (floorLocked > 0) {
      return locked === floorLocked ? 'locked' : 'archived';
    }
    return 'locked';
  }

  const floorSync = Number(layout?.floor_sync ?? 0);
  const sub = Number(layout?.sub_version ?? 0);
  // Legacy bad rows: sub_version without floor_sync must not show as Sub.
  if (sub > 0 && floorSync <= 0) return 'draft';

  const rawKind = String(layout?.version_kind ?? '').trim();
  if (rawKind === 'sub' && !(floorSync > 0 && sub > 0)) {
    return floorSync > 0 ? 'synced' : 'draft';
  }
  if (rawKind && rawKind !== 'locked') return rawKind;

  const label = layout?.display_version ?? layout?.version ?? '';
  return inferLayoutVersionKind(label, { ...layout, version_kind: '' });
}

export function inferLayoutVersionKind(label, layout = {}) {
  const kind = String(layout?.version_kind ?? '').trim();
  if (kind) return kind;

  const text = String(label ?? '').trim();
  if (!text) return 'shell';
  // Pre-lock drafts under V0 (v0.1, v0.2…) — Floor + Designer/MEPF
  if (/^v0\.\d+$/i.test(text)) return 'draft';
  // v1.2 under a floor lock
  if (/^v\d+\.\d+$/i.test(text)) return 'sub';
  // unlocked floor / designer drafts (legacy v1, v2…)
  if (/^v\d+$/i.test(text)) return 'draft';
  // V1 locked floor milestone or designer/mepf synced-to-floor
  if (/^V\d+$/.test(text)) {
    return Number(layout?.locked_version ?? 0) > 0 ? 'locked' : 'synced';
  }
  return 'shell';
}

/**
 * Client-side display label when API display_version is missing/stale.
 * Mirrors backend format_display_version for Floor + child layouts.
 */
export function formatLayoutVersionFromFields(layout = {}) {
  const display = String(layout?.display_version ?? '').trim();
  if (display) {
    // Rewrite legacy pre-lock Floor labels (v1, v2) → v0.1, v0.2
    const layoutType = String(layout?.layout_type ?? layout?.custom_layout_type ?? '').trim();
    const locked = Number(layout?.locked_version ?? 0);
    const period = Number(layout?.period_version ?? 0);
    const floorLocked = Number(layout?.floor_locked_version ?? 0);
    if (
      layoutType === 'Floor Layout' &&
      locked <= 0 &&
      period > 0 &&
      floorLocked <= 0 &&
      /^v\d+$/i.test(display) &&
      !/^v0\./i.test(display)
    ) {
      return `v0.${period}`;
    }
    return display;
  }

  const layoutType = String(layout?.layout_type ?? layout?.custom_layout_type ?? '').trim();
  const locked = Number(layout?.locked_version ?? 0);
  const period = Number(layout?.period_version ?? 0);
  const floorSync = Number(layout?.floor_sync ?? 0);
  const sub = Number(layout?.sub_version ?? 0);
  const floorLocked = Number(layout?.floor_locked_version ?? 0);
  const cycle = Number(layout?.draft_cycle_version ?? 0) || (floorLocked > 0 ? floorLocked : 0);

  if (layoutType === 'Floor Layout') {
    if (locked > 0) return `V${locked}`;
    if (period > 0) return cycle > 0 ? `v${cycle}.${period}` : `v0.${period}`;
    return 'V0';
  }

  if (sub > 0 && floorSync > 0) return `v${floorSync}.${sub}`;
  if (floorSync > 0) return `V${floorSync}`;
  if (sub > 0) return `v0.${sub}`;
  if (period > 0) return `v0.${period}`;
  return 'V0';
}

export function getLayoutListVersionLabel(layout, { isChildRow = false } = {}) {
  if (isChildRow) {
    return formatLayoutVersionFromFields(layout);
  }
  // Main row always shows the current locked/synced milestone (Vn), never draft subversions.
  return layout?.list_display_version || formatLayoutVersionFromFields(layout);
}

export function getLayoutVersionBadgeColor(layout, { isChildRow = false } = {}) {
  if (!isChildRow) {
    return 'green';
  }
  const kind = resolveLayoutVersionKind(layout);
  return LAYOUT_VERSION_BADGE_COLORS[kind] ?? 'green';
}

export function getLayoutVersionIndentClass(layout, { isChildRow = false } = {}) {
  if (!isChildRow) return '';
  const kind = resolveLayoutVersionKind(layout);
  if (kind === 'sub') return 'border-l-2 border-l-purple-200 pl-10';
  if (kind === 'draft') return 'border-l-2 border-l-orange-200 pl-8';
  if (kind === 'locked') return 'border-l-2 border-l-blue-200 pl-6';
  if (kind === 'archived') return 'border-l-2 border-l-stroke-soft-200 pl-6';
  return 'border-l-2 border-l-stroke-soft-200 pl-5';
}

export function formatProjectLayoutVersion(versionOrItem) {
  if (versionOrItem != null && typeof versionOrItem === 'object') {
    return formatLayoutVersionFromFields(versionOrItem);
  }

  if (versionOrItem == null || versionOrItem === '') return 'V0';
  const normalized = String(versionOrItem).trim();
  if (!normalized) return 'V0';
  return normalized;
}

export function mapProjectLayoutDetailToRow(data, listRowFallback = null) {
  const attachmentSource = {
    ...data,
    attachments: data?.attachments ?? data?.attechments ?? [],
  };
  const row = mapProjectTaskDetailToRow(attachmentSource, listRowFallback);

  return {
    ...row,
    status: normalizeProjectSectionStatus(data?.status ?? listRowFallback?.status ?? row.status),
    layout_type:
      data?.custom_layout_type ?? data?.layout_type ?? listRowFallback?.layout_type ?? '',
    custom_layout_type:
      data?.custom_layout_type ?? data?.layout_type ?? listRowFallback?.custom_layout_type ?? '',
    version: formatProjectLayoutVersion(
      data?.display_version ? data : (data?.version ?? listRowFallback?.version),
    ),
    display_version:
      data?.display_version ??
      listRowFallback?.display_version ??
      formatProjectLayoutVersion(data?.version ?? listRowFallback?.version),
    list_display_version:
      data?.list_display_version ??
      listRowFallback?.list_display_version ??
      data?.display_version ??
      listRowFallback?.display_version ??
      formatProjectLayoutVersion(data?.version ?? listRowFallback?.version),
    locked_version: data?.locked_version ?? listRowFallback?.locked_version ?? 0,
    period_version: data?.period_version ?? listRowFallback?.period_version ?? 0,
    floor_sync: data?.floor_sync ?? listRowFallback?.floor_sync ?? 0,
    sub_version: data?.sub_version ?? listRowFallback?.sub_version ?? 0,
    can_acknowledge: data?.can_acknowledge ?? listRowFallback?.can_acknowledge ?? false,
    floor_version_options:
      data?.floor_version_options ?? listRowFallback?.floor_version_options ?? [],
    warning_reason: data?.warning_reason ?? listRowFallback?.warning_reason ?? '',
    parent_version: data?.parent_version ?? listRowFallback?.parent_version ?? null,
    layout_image: data?.layout_image ?? listRowFallback?.layout_image ?? '',
    floor_locked_version: data?.floor_locked_version ?? listRowFallback?.floor_locked_version ?? 0,
    areas: Array.isArray(data?.areas) ? data.areas : [],
    tasks: Array.isArray(data?.tasks) ? data.tasks : [],
    area_count: data?.area_count ?? 0,
    total_tasks: data?.total_tasks ?? 0,
    versions: Array.isArray(data?.versions) ? data.versions : [],
    version_history: Array.isArray(data?.version_history) ? data.version_history : [],
    total_versions: data?.total_versions ?? 0,
    parent_layout: data?.parent_layout ?? null,
    groupId: listRowFallback?.groupId ?? data?.custom_layout_type ?? row.groupId,
  };
}

export function mapProjectLayoutsListviewToGroups(data) {
  if (!data) return [];

  if (Array.isArray(data.groups)) {
    return data.groups.map((group) => ({
      id: String(group.group_value ?? 'Unassigned'),
      rows: (group.items ?? []).map((item) =>
        mapProjectLayoutListItemToRow(item, { groupId: group.group_value ?? 'Unassigned' }),
      ),
    }));
  }

  if (Array.isArray(data.results)) {
    return [
      {
        id: 'All',
        rows: data.results.map((item) => mapProjectLayoutListItemToRow(item, { groupId: 'All' })),
      },
    ];
  }

  return [];
}

export function buildProjectLayoutsGroupByParam(groupBy, groupOrder = 'asc') {
  const field = PROJECT_LAYOUTS_GROUP_BY_API_MAP[groupBy];
  if (!field) return '';
  const direction = groupOrder === 'desc' ? 'desc' : 'asc';
  return `${field} ${direction}`;
}

export function buildProjectLayoutsListviewFilters(selectedFilters = {}, floorFilter = 'all') {
  const filters = [];

  if (selectedFilters.layout_type?.length) {
    filters.push(['custom_layout_type', 'in', selectedFilters.layout_type]);
  }

  if (selectedFilters.status?.length) {
    filters.push([
      'status',
      'in',
      selectedFilters.status.map((value) => denormalizeProjectSectionStatus(value)),
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

  if (floorFilter && floorFilter !== 'all') {
    filters.push(['custom_floor', '=', floorFilter]);
  }

  return filters;
}

export function getProjectLayoutRowFieldValue(row, fieldName) {
  if (fieldName === 'title') {
    return row?.title ?? row?.subject ?? '';
  }
  return getProjectTaskRowFieldValue(row, fieldName);
}

export function projectLayoutFieldValuesEqual(fieldName, left, right) {
  return projectTaskFieldValuesEqual(fieldName, left, right);
}

export function buildProjectLayoutUpdatePayload(layoutId, fieldName, value) {
  const id = String(layoutId ?? '').trim();
  const payload = { layout_id: id };

  switch (fieldName) {
    case 'title':
    case 'subject':
      payload.subject = String(value ?? '').trim();
      break;
    case 'description':
      payload.description = value ?? '';
      break;
    case 'status':
      payload.status = denormalizeProjectSectionStatus(value);
      break;
    case 'priority':
      payload.priority = denormalizeProjectTaskPriority(value);
      break;
    case 'floor':
    case 'custom_floor':
      payload.floor = value ?? '';
      break;
    case 'layout_type':
    case 'custom_layout_type':
      payload.layout_type = value ?? '';
      break;
    case 'due_date':
    case 'exp_end_date': {
      const date = parseToDate(value);
      payload.due_date = date ? formatDateToYYYYMMDD(date) : '';
      break;
    }
    case 'assignees':
      payload.assignees = normalizeAssignees(value);
      break;
    case 'tags':
      payload.tags = Array.isArray(value) ? value.filter(Boolean) : [];
      break;
    default:
      payload[fieldName] = value ?? '';
  }

  return payload;
}

/** @deprecated Use buildProjectLayoutUpdatePayload */
export function buildProjectLayoutUpdateFormData(layoutId, fieldName, value) {
  return buildProjectLayoutUpdatePayload(layoutId, fieldName, value);
}

/** Payload for `create_project_layout` API. */
export function buildProjectLayoutCreatePayload(projectId, values) {
  const dueDate = parseToDate(values.due_date);

  return {
    project: String(projectId ?? '').trim(),
    floor: values.floor ?? '',
    subject: String(values.title ?? values.subject ?? '').trim(),
    layout_type: values.layout_type ?? 'Floor Layout',
    status: String(values.status ?? '').trim()
      ? denormalizeProjectSectionStatus(values.status)
      : '',
    priority: denormalizeProjectTaskPriority(values.priority ?? 'Low'),
    due_date: dueDate ? formatDateToYYYYMMDD(dueDate) : '',
    description: values.description ?? '',
    assignees: normalizeAssignees(values.assignees),
    tags: Array.isArray(values.tags) ? values.tags.filter(Boolean) : [],
  };
}

/** Build multipart FormData for `create_project_task` API (Layout Tasks). */
export function buildProjectLayoutCreateFormData(projectId, values, attachments = []) {
  const formData = new FormData();
  const project = String(projectId ?? '').trim();

  formData.append('project', project);
  formData.append('type', 'Layout Tasks');
  formData.append('subject', String(values.title ?? values.subject ?? '').trim());
  formData.append('description', values.description ?? '');
  formData.append(
    'status',
    String(values.status ?? '').trim() ? denormalizeProjectSectionStatus(values.status) : '',
  );
  formData.append('priority', denormalizeProjectTaskPriority(values.priority ?? 'Low'));
  formData.append('custom_floor', values.floor ?? '');
  formData.append('custom_layout_type', values.layout_type ?? '');

  const dueDate = parseToDate(values.due_date);
  formData.append('exp_end_date', dueDate ? formatDateToYYYYMMDD(dueDate) : '');

  formData.append('assignees', JSON.stringify(normalizeAssignees(values.assignees)));
  formData.append(
    'tags',
    JSON.stringify(Array.isArray(values.tags) ? values.tags.filter(Boolean) : []),
  );

  appendProjectTaskFilesToFormData(formData, attachments);

  return formData;
}

export function patchProjectLayoutRow(row, fieldName, value) {
  return patchProjectTaskRow(row, fieldName, value);
}

export function getProjectLayoutTypeSelectOptions(layoutType) {
  const normalized = String(layoutType ?? '').trim();
  if (!normalized) return PROJECT_DETAIL_LAYOUT_TYPE_OPTIONS;

  const exists = PROJECT_DETAIL_LAYOUT_TYPE_OPTIONS.some((option) => option.value === normalized);
  if (exists) return PROJECT_DETAIL_LAYOUT_TYPE_OPTIONS;

  return [{ value: normalized, label: normalized }, ...PROJECT_DETAIL_LAYOUT_TYPE_OPTIONS];
}

export function layoutGroupBadgeColor(groupId) {
  const normalized = String(groupId ?? '').toLowerCase();
  if (normalized.includes('floor')) return 'blue';
  if (normalized.includes('gfc')) return 'green';
  if (normalized.includes('concept')) return 'purple';
  if (normalized.includes('furniture')) return 'orange';
  return 'gray';
}
