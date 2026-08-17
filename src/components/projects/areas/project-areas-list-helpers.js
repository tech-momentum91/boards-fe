import {
  buildLayoutPreviewLayoutFromFloor,
  findLayoutAreasFloorRecord,
} from '@/components/projects/shared/project-layout-areas-helpers';

export function mapProjectAreaListItemToRow(area) {
  const areaId = String(area?.area_id ?? area?.name ?? '').trim();
  if (!areaId) return null;

  return {
    id: areaId,
    area_id: areaId,
    area_label: String(area?.area_label ?? '').trim(),
    title: String(area?.area_label ?? '').trim(),
    area_type: String(area?.area_type ?? '').trim(),
    carpet_area: String(area?.carpet_area ?? '').trim(),
    description: String(area?.description ?? '').trim(),
    status: String(area?.status ?? area?.area_status ?? '').trim(),
    floor: String(area?.floor ?? '').trim(),
    on_layout: Boolean(area?.on_layout),
    color: String(area?.color ?? '').trim(),
  };
}

export function mapCreatedAreaResponseToRow(area, floor = '') {
  const row = mapProjectAreaListItemToRow({ ...area, floor });
  return row ? { ...row, floor: row.floor || String(floor ?? '').trim() } : null;
}

export function buildManualAreaCreatePayload(projectId, values = {}) {
  return {
    project: String(projectId ?? '').trim(),
    floor: String(values.floor ?? '').trim(),
    area_label: String(values.area_label ?? '').trim(),
    area_type: String(values.area_type ?? '').trim(),
    carpet_area: String(values.carpet_area ?? '').trim(),
    description: values.description ?? '',
    color: String(values.color ?? '').trim(),
    on_layout: 0,
  };
}

const AREA_UPDATE_FIELD_MAP = {
  area_label: 'area_label',
  title: 'area_label',
  area_type: 'area_type',
  carpet_area: 'carpet_area',
  description: 'description',
  color: 'color',
};

export function buildAreaUpdatePayload(areaId, fieldName, value, area = null) {
  const apiField = AREA_UPDATE_FIELD_MAP[fieldName];
  if (!apiField || !areaId) return null;

  const payload = {
    area_id: String(areaId).trim(),
    area_label: area?.area_label ?? area?.title ?? '',
    area_type: area?.area_type ?? '',
    carpet_area: area?.carpet_area ?? '',
    description: area?.description ?? '',
    color: area?.color ?? '',
  };

  payload[apiField] = value;
  return payload;
}

export function getProjectAreaRowFieldValue(row, fieldName) {
  if (fieldName === 'title') return row?.area_label ?? row?.title ?? '';
  return row?.[fieldName] ?? '';
}

export function projectAreaFieldValuesEqual(fieldName, left, right) {
  return String(left ?? '').trim() === String(right ?? '').trim();
}

export function patchProjectAreaRow(row, fieldName, value) {
  if (!row) return row;
  if (fieldName === 'title' || fieldName === 'area_label') {
    const label = String(value ?? '').trim();
    return { ...row, area_label: label, title: label };
  }
  return { ...row, [fieldName]: value };
}

export function mapEditedAreaResponseToRow(area, listRowFallback = null) {
  const mapped = mapProjectAreaListItemToRow(area);
  if (!mapped) return listRowFallback;

  return {
    ...listRowFallback,
    ...mapped,
    floor: mapped.floor || listRowFallback?.floor || '',
  };
}

export function mapProjectAreaDetailToRow(data, listRowFallback = null) {
  if (!data) return listRowFallback;

  const mapped = mapProjectAreaListItemToRow(data);
  if (!mapped) return listRowFallback;

  return {
    ...listRowFallback,
    ...mapped,
    description: data.description ?? listRowFallback?.description ?? '',
    layout: data.layout ?? null,
    layout_id: data.layout_id ?? data.layout?.layout_id ?? listRowFallback?.layout_id ?? '',
    change_type: data.change_type ?? '',
    project: data.project ?? listRowFallback?.project ?? '',
    groupId: listRowFallback?.groupId,
  };
}

/** Build floor layout preview for the area detail drawer right panel. */
export function buildProjectAreaLayoutPreview(area) {
  const layout = area?.layout;
  if (!layout || typeof layout !== 'object') return null;

  const layoutImage = String(layout.layout_image ?? '').trim();
  if (!layoutImage) return null;

  const areaId = String(area?.area_id ?? area?.id ?? '').trim();
  const layoutId = String(layout.layout_id ?? area?.layout_id ?? '').trim();
  const floor = String(layout.floor ?? area?.floor ?? '').trim();
  const coordinates = layout.coordinates ?? null;

  const areas = coordinates
    ? [
        {
          area_id: areaId,
          name: areaId,
          area_label: area?.area_label ?? area?.title ?? '',
          area_type: area?.area_type ?? '',
          carpet_area: area?.carpet_area ?? '',
          color: layout.color ?? area?.color ?? '',
          coordinates,
        },
      ]
    : Array.isArray(layout.areas)
      ? layout.areas
      : [];

  return {
    name: layoutId || floor,
    id: layoutId || floor,
    layout_id: layoutId,
    layout_image: layoutImage,
    floor,
    subject: layout.subject ?? '',
    areas,
  };
}

/**
 * Build layout preview from `get_layout_areas` floors[] for the area's floor.
 * Uses all areas on that floor (not the flat `areas` list).
 */
export function buildProjectAreaLayoutPreviewFromFloors(area, floors = []) {
  if (!area) return null;

  const floorRecord = findLayoutAreasFloorRecord(floors, area.floor);
  return buildLayoutPreviewLayoutFromFloor(floorRecord);
}

export function mapProjectAreasListviewToGroups(data) {
  if (!data) return [];

  const groupBy = String(data.group_by ?? 'floor').trim();

  if (groupBy === 'floor' && Array.isArray(data.floors)) {
    return data.floors.map((group) => ({
      id: String(group.floor ?? 'Unassigned'),
      rows: (group.areas ?? []).map(mapProjectAreaListItemToRow).filter(Boolean),
    }));
  }

  if (groupBy === 'area_type' && Array.isArray(data.area_types)) {
    return data.area_types.map((group) => ({
      id: String(group.area_type ?? 'Unassigned'),
      rows: (group.areas ?? []).map(mapProjectAreaListItemToRow).filter(Boolean),
    }));
  }

  const flatAreas = Array.isArray(data.areas) ? data.areas : [];
  if (flatAreas.length > 0) {
    return [
      {
        id: 'All',
        rows: flatAreas.map(mapProjectAreaListItemToRow).filter(Boolean),
      },
    ];
  }

  return [];
}

export function buildProjectAreasGroupByParam(groupBy) {
  const normalized = String(groupBy ?? '').trim();
  if (normalized === 'floor' || normalized === 'area_type') {
    return normalized;
  }
  return 'floor';
}

export function buildProjectAreasListParams({
  projectId,
  keyword = '',
  groupBy = 'floor',
  selectedFilters = {},
  page = 1,
  limitPageLength = 20,
  orderBy = 'area_label asc',
} = {}) {
  const params = {
    project: projectId,
    group_by: buildProjectAreasGroupByParam(groupBy),
    page,
    limit_page_length: limitPageLength,
    order_by: orderBy,
  };

  const trimmedKeyword = String(keyword ?? '').trim();
  if (trimmedKeyword) {
    params.keyword = trimmedKeyword;
  }

  const floorFilters = selectedFilters.floor ?? [];
  if (floorFilters.length === 1) {
    params.floor = floorFilters[0];
  }

  const areaTypeFilters = selectedFilters.area_type ?? [];
  if (areaTypeFilters.length === 1) {
    params.area_type = areaTypeFilters[0];
  }

  const statusFilters = selectedFilters.status ?? [];
  if (statusFilters.length === 1) {
    params.status = statusFilters[0];
  }

  return params;
}

export function projectAreasGroupBadgeColor(groupId) {
  const normalized = String(groupId ?? '').trim();
  if (!normalized || normalized === 'Unassigned') return 'gray';
  return 'blue';
}

export function collectProjectAreasFilterOptions(data, projectFloors = []) {
  const areaTypes = new Set();
  const groups = mapProjectAreasListviewToGroups(data);

  groups.forEach((group) => {
    group.rows.forEach((row) => {
      if (row.area_type) areaTypes.add(row.area_type);
    });
  });

  const floorOptions = (projectFloors ?? [])
    .map((floor) => {
      const value = String(floor?.value ?? floor?.label ?? floor ?? '').trim();
      if (!value) return null;
      return { value, label: String(floor?.label ?? value).trim() };
    })
    .filter(Boolean);

  const statusOptions = Array.isArray(data?.status_options)
    ? data.status_options.map((status) => ({
        value: String(status).trim(),
        label: String(status).trim(),
      }))
    : [
        { value: 'Active', label: 'Active' },
        { value: 'Inactive', label: 'Inactive' },
      ];

  return {
    floor: floorOptions,
    area_type: [...areaTypes]
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({ value, label: value })),
    status: statusOptions,
  };
}
