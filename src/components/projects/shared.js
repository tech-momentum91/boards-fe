import { resolveProjectAreaLabel } from '@/components/projects/project-area-helpers';
import { formatDateDisplay, formatDateToYYYYMMDD } from '@/utils/date-utils';

/** API date field (yyyy-MM-dd) from form Datepicker / date input. */
export function formatProjectApiDate(date) {
  const formatted = formatDateToYYYYMMDD(date);
  return formatted || undefined;
}

/** Display date for project tables and detail views. */
export function formatProjectDateDisplay(value, fallback = '—') {
  return formatDateDisplay(value, fallback);
}

function normalizeProjectAreaEntry(entry) {
  if (entry == null) return null;

  if (typeof entry === 'string') {
    const value = entry.trim();
    if (!value) return null;
    return { value, label: value, floor: '' };
  }

  const value = String(entry?.value ?? entry?.area ?? entry?.name ?? entry?.area_name ?? '').trim();
  if (!value) return null;

  return {
    value,
    label: String(entry?.label ?? value).trim() || value,
    floor: String(entry?.floor ?? '').trim(),
    badge: entry?.badge,
  };
}

/** Areas marked on project layouts (`custom_areas` child table or equivalent). */
export function parseProjectAreas(project) {
  const rows = project?.custom_areas ?? project?.custom_marked_areas ?? [];
  if (!Array.isArray(rows)) return [];

  return rows.map(normalizeProjectAreaEntry).filter(Boolean);
}

/** Collect unique area values already used on project task rows. */
export function collectProjectAreasFromRows(rows = []) {
  const areas = new Map();

  (rows ?? []).forEach((row) => {
    const value = String(row?.area ?? row?.custom_area ?? '').trim();
    if (!value) return;

    const floor = String(row?.floor ?? row?.custom_floor ?? '').trim();
    const existing = areas.get(value);
    if (!existing || (!existing.floor && floor)) {
      areas.set(value, { value, label: value, floor });
    }
  });

  return [...areas.values()];
}

/** Merge area lists from project config and task rows without duplicates. */
export function mergeProjectAreas(...sources) {
  const areas = new Map();

  sources.flat().forEach((entry) => {
    const normalized = normalizeProjectAreaEntry(entry);
    if (!normalized) return;

    const existing = areas.get(normalized.value);
    if (!existing || (!existing.floor && normalized.floor)) {
      areas.set(normalized.value, normalized);
    }
  });

  return [...areas.values()].sort((left, right) => left.label.localeCompare(right.label));
}

/** Map API/custom_area to stored value (plain label/name string). */
export function normalizeProjectAreaValue(area) {
  return String(area ?? '').trim();
}

/** Build select options from project-specific marked areas. */
export function getProjectAreaSelectOptions(projectAreas = [], { currentArea, floor } = {}) {
  let options = mergeProjectAreas(Array.isArray(projectAreas) ? projectAreas : []);

  const normalizedFloor = String(floor ?? '').trim();
  if (normalizedFloor) {
    const floorScoped = options.filter(
      (option) => !option.floor || option.floor === normalizedFloor,
    );
    if (floorScoped.length > 0) {
      options = floorScoped;
    }
  }

  const selectOptions = options.map((option) => ({
    value: option.value,
    label: option.label ?? option.value,
    badge: option.badge,
  }));

  const normalizedCurrent = normalizeProjectAreaValue(currentArea);
  if (normalizedCurrent && !selectOptions.some((option) => option.value === normalizedCurrent)) {
    selectOptions.unshift({ value: normalizedCurrent, label: normalizedCurrent });
  }

  return selectOptions;
}

/** Filter sidebar options for area filters. */
export function getProjectAreaFilterOptions(projectAreas = []) {
  return getProjectAreaSelectOptions(projectAreas).map((option) => ({
    value: option.value,
    label: option.label,
  }));
}

/** Human-readable area label for tables and read-only views. */
export function projectAreaLabel(areaValue, projectAreas = []) {
  if (Array.isArray(projectAreas) && projectAreas.length > 0) {
    return resolveProjectAreaLabel(areaValue, projectAreas);
  }

  const normalized = normalizeProjectAreaValue(areaValue);
  if (!normalized) return '—';

  return normalized;
}

/** Floors configured on the project (`custom_floors` child table). */
export function parseProjectFloors(project) {
  const rows = project?.custom_floors ?? [];
  return [...new Set(rows.map((row) => String(row?.floor ?? row ?? '').trim()).filter(Boolean))];
}

/** Floor dropdown options limited to project floors; keeps the current value if legacy. */
export function getProjectFloorSelectOptions(projectFloors = [], currentFloor = '') {
  const floors = [
    ...new Set(
      (Array.isArray(projectFloors) ? projectFloors : [])
        .map((floor) => String(floor ?? '').trim())
        .filter(Boolean),
    ),
  ];

  const normalized = String(currentFloor ?? '').trim();
  if (normalized && !floors.includes(normalized)) {
    floors.unshift(normalized);
  }

  return floors.map((floor) => ({ value: floor, label: floor }));
}

export function buildProjectFloorsUpdatePayload(existingProject, newFloor) {
  const trimmed = String(newFloor ?? '').trim();
  const existingRows = existingProject?.custom_floors ?? [];

  const custom_floors = existingRows
    .map((row) => {
      const floor = String(row?.floor ?? '').trim();
      if (!floor) return null;

      const payload = {
        floor,
        doctype: 'Project Floor',
      };
      if (row?.name) payload.name = row.name;
      return payload;
    })
    .filter(Boolean);

  custom_floors.push({
    floor: trimmed,
    doctype: 'Project Floor',
  });

  return { custom_floors };
}

export function projectHasFloor(project, floorName) {
  const normalized = String(floorName ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  return parseProjectFloors(project).some((floor) => floor.toLowerCase() === normalized);
}

/** Floor filter tabs for project detail sections (All + configured project floors). */
export function getProjectFloorFilterOptions(projectFloors = []) {
  const floors = [
    ...new Set(
      (Array.isArray(projectFloors) ? projectFloors : [])
        .map((floor) => String(floor ?? '').trim())
        .filter(Boolean),
    ),
  ];

  return [{ id: 'all', label: 'All' }, ...floors.map((floor) => ({ id: floor, label: floor }))];
}

/** Human-readable floor label for tables and read-only views. */
export function projectFloorLabel(floorValue) {
  const trimmed = String(floorValue ?? '').trim();
  return trimmed || '—';
}

export function formatProjectCell(value) {
  if (value === null || value === undefined || value === '') return '—';
  return value;
}

export function colorForProjectStage(stage) {
  const normalized = String(stage ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) return 'gray';
  if (normalized.startsWith('s') || normalized.includes('design')) return 'blue';
  if (normalized.startsWith('e') || normalized.includes('execution')) return 'orange';
  if (
    normalized.startsWith('d') ||
    normalized.includes('handover') ||
    normalized.includes('deliver')
  ) {
    return 'green';
  }
  return 'gray';
}

export function colorForProjectTaskPriority(priority) {
  const normalized = String(priority ?? '').toLowerCase();
  if (normalized === 'high') return 'orange';
  if (normalized === 'medium') return 'yellow';
  return 'green';
}
