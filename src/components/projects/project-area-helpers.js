import { normalizeProjectAreaValue } from '@/components/projects/shared';

export function buildProjectAreasCacheKey(projectId, floor) {
  const normalizedProject = String(projectId ?? '').trim();
  const normalizedFloor = String(floor ?? '').trim();
  return `${normalizedProject}::${normalizedFloor}`;
}

export function mapProjectAreaRecord(row) {
  const id = String(row?.name ?? '').trim();
  const areaName = String(row?.area ?? '').trim();
  if (!id || !areaName) return null;

  return {
    id,
    value: id,
    label: areaName,
    areaName,
    floor: String(row?.floor ?? '').trim(),
    project: row?.project ?? '',
  };
}

export function filterProjectAreaRecordsByFloor(records = [], floor) {
  const normalizedFloor = String(floor ?? '').trim();
  if (!normalizedFloor) return records ?? [];

  return (records ?? []).filter((record) => String(record?.floor ?? '').trim() === normalizedFloor);
}

/** Resolve Project Area doc id (or legacy area name) to display label. */
export function resolveProjectAreaLabel(areaRef, records = []) {
  const normalized = normalizeProjectAreaValue(areaRef);
  if (!normalized) return '—';

  const match = (records ?? []).find((record) => {
    const id = String(record?.id ?? record?.value ?? '').trim();
    const label = String(record?.label ?? record?.areaName ?? '').trim();
    return normalized === id || normalized === label;
  });

  return match?.label ?? match?.areaName ?? normalized;
}

export function mapProjectAreaRecordsToOptions(records = [], currentArea) {
  const seenKeys = new Set();
  const options = (records ?? [])
    .filter(Boolean)
    .map((entry) => ({
      value: entry.id ?? entry.value,
      label: entry.label ?? entry.areaName ?? entry.value,
      badge: entry.badge,
      floor: String(entry.floor ?? '').trim(),
    }))
    .sort((left, right) => left.label.localeCompare(right.label))
    .filter((option) => {
      const dedupeKey = `${option.floor.toLowerCase()}|${String(option.label ?? '')
        .trim()
        .toLowerCase()}`;
      if (seenKeys.has(dedupeKey)) return false;
      seenKeys.add(dedupeKey);
      return true;
    })
    .map(({ floor: _floor, ...option }) => option);

  const normalizedCurrent = normalizeProjectAreaValue(currentArea);
  if (!normalizedCurrent) return options;

  if (options.some((option) => option.value === normalizedCurrent)) {
    return options;
  }

  const byId = records.find(
    (record) => String(record?.id ?? record?.value ?? '').trim() === normalizedCurrent,
  );
  if (byId) {
    options.unshift({
      value: byId.id ?? byId.value,
      label: byId.label ?? byId.areaName,
    });
    return options;
  }

  const byName = records.find(
    (record) => String(record?.label ?? record?.areaName ?? '').trim() === normalizedCurrent,
  );
  if (byName) {
    options.unshift({
      value: byName.id ?? byName.value,
      label: byName.label ?? byName.areaName,
    });
    return options;
  }

  options.unshift({ value: normalizedCurrent, label: normalizedCurrent });
  return options;
}
