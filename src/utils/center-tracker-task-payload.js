import { findCenterTrackerLayoutBundleFloor } from '@/api/centerTrackerLayout';

/**
 * Shared payload builder for Center Tracker Task create/update (Frappe resource API).
 */

/** Tasks with no checklist (or only empty titles) are hidden in facility / lists; `null`/missing = legacy row, still shown. */
export const centerTrackerTaskHasVisibleChecklists = (checklists) => {
  if (checklists == null) return true;
  if (!Array.isArray(checklists)) return true;
  if (checklists.length === 0) return false;
  return checklists.some((row) => {
    if (typeof row === 'string') return String(row).trim().length > 0;
    const title = String(
      row?.checklist_title ?? row?.checklist ?? row?.checklist_name ?? row?.title ?? '',
    ).trim();
    return title.length > 0;
  });
};

const resolveSelectedCenterFloor = (data) => {
  const single = String(data?.floor ?? '').trim();
  if (single) return single;
  if (Array.isArray(data?.floors) && data.floors.length > 0) {
    return String(data.floors[data.floors.length - 1] ?? '').trim();
  }
  return '';
};

/**
 * Build `floor` child rows for Center Tracker Task create/update (with optional markers).
 *
 * @param {{
 *   selectedFloor?: string,
 *   markerCoordinatesByFloorKey?: Record<string, object>,
 *   layoutBundleFloors?: object[],
 *   floorRowMetaByFloorKey?: Record<string, object>,
 * }} params
 * @returns {object[]}
 */
export const buildCenterTrackerFloorPayload = ({
  selectedFloor = '',
  markerCoordinatesByFloorKey = {},
  layoutBundleFloors = [],
  floorRowMetaByFloorKey = {},
}) => {
  const floorKeys = new Set();
  const selected = String(selectedFloor ?? '').trim();
  if (selected) floorKeys.add(selected);

  Object.keys(markerCoordinatesByFloorKey ?? {}).forEach((key) => {
    const trimmed = String(key ?? '').trim();
    if (trimmed) floorKeys.add(trimmed);
  });

  Object.keys(floorRowMetaByFloorKey ?? {}).forEach((key) => {
    const trimmed = String(key ?? '').trim();
    if (trimmed) floorKeys.add(trimmed);
  });

  return [...floorKeys].map((floorKey) => {
    const bundleRow = findCenterTrackerLayoutBundleFloor(layoutBundleFloors, floorKey);
    const markerRaw = markerCoordinatesByFloorKey?.[floorKey];
    const meta = floorRowMetaByFloorKey?.[floorKey] ?? {};
    const floorRef = String(
      bundleRow?.floor_ref ?? markerRaw?.floor_ref ?? meta.floor_ref ?? '',
    ).trim();
    const rowName = String(meta.name ?? '').trim();

    const entry = {
      floor: floorKey,
      ...(rowName ? { name: rowName } : {}),
      ...(floorRef ? { floor_ref: floorRef } : {}),
    };

    const spaceId = String(markerRaw?.space_id ?? meta.space ?? '').trim();
    const subSpaceId = String(markerRaw?.sub_space_id ?? meta.sub_space_id ?? '').trim();
    if (spaceId) entry.space = spaceId;
    if (subSpaceId) entry.sub_space_id = subSpaceId;

    const points = Array.isArray(markerRaw?.points) ? markerRaw.points : [];
    if (points.length > 0) {
      entry.marker_coordinate = {
        points,
        ...(String(markerRaw?.floor_ref ?? floorRef).trim()
          ? { floor_ref: String(markerRaw?.floor_ref ?? floorRef).trim() }
          : {}),
        ...(spaceId ? { space_id: spaceId } : {}),
        ...(subSpaceId ? { sub_space_id: subSpaceId } : {}),
      };
    }

    return entry;
  });
};

export const toApiTime = (value) => {
  const s = String(value ?? '').trim();
  if (!s) return '';
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  return s;
};

/** Build assignee child rows for Center Tracker Task save. */
export const buildTrackerAssigneeRows = (assigneeIds, assigneeOptions = []) => {
  const optionByValue = new Map(
    (assigneeOptions || []).map((o) => [String(o.value ?? '').trim(), o]),
  );

  return (assigneeIds || [])
    .map((id) => String(id ?? '').trim())
    .filter(Boolean)
    .map((assignee) => {
      const opt = optionByValue.get(assignee);
      const assignee_type =
        String(opt?.assignee_type ?? '').trim() ||
        (String(opt?.team_type ?? '').trim() === 'Employee' ? 'Employee' : '') ||
        (assignee.startsWith('HR-EMP-') ? 'Employee' : 'User');
      return { assignee_type, assignee };
    });
};

export const buildCenterTrackerTaskPayload = ({
  data,
  trackerName,
  viewType,
  centerId,
  isDaily,
  isWeekly,
  isMonthly,
  isAnnually,
  markerCoordinatesByFloorKey,
  layoutBundleFloors,
  floorRowMetaByFloorKey,
  assigneeOptions,
}) => {
  const normalizedChecklists = (data.checklists ?? [])
    .map((c) => {
      const checklist = String(c?.checklist_title ?? '').trim();
      const entry = { checklist };
      if (c?.name) entry.name = c.name;
      if (c?.disabled !== undefined) entry.disabled = Number(c?.disabled) ? 1 : 0;
      return entry;
    })
    .filter((c) => c.checklist.length > 0 || c.name);

  if (normalizedChecklists.length === 0) {
    throw new Error('At least one checklist item with a title is required.');
  }

  let schedule;
  if (isDaily) {
    schedule = (data.schedule ?? []).map((row, index) => ({
      frequency: index + 1,
      start_time: toApiTime(row.start_time),
      end_time: toApiTime(row.end_time),
    }));
  } else if (isWeekly) {
    const ids = [...(data.weekdayIds ?? [])]
      .map((x) => Number.parseInt(String(x), 10))
      .filter((n) => n >= 1 && n <= 7)
      .sort((a, b) => a - b);
    schedule = ids.map((frequency, index) => {
      const row = (data.schedule ?? [])[index] ?? {};
      return {
        frequency,
        start_time: toApiTime(row.start_time),
        end_time: toApiTime(row.end_time),
      };
    });
  } else if (isMonthly) {
    const ids = [...(data.monthWeekIds ?? [])]
      .map((x) => Number.parseInt(String(x), 10))
      .filter((n) => n >= 1 && n <= 4)
      .sort((a, b) => a - b);
    schedule = ids.map((frequency, index) => {
      const row = (data.schedule ?? [])[index] ?? {};
      return {
        frequency,
        start_day: String(row.start_day ?? '').trim(),
        end_day: String(row.end_day ?? '').trim(),
      };
    });
  } else if (isAnnually) {
    const ids = [...(data.yearMonthIds ?? [])]
      .map((x) => Number.parseInt(String(x), 10))
      .filter((n) => n >= 1 && n <= 12)
      .sort((a, b) => a - b);
    schedule = ids.map((frequency, index) => {
      const row = (data.schedule ?? [])[index] ?? {};
      return {
        frequency,
        start_day: String(row.start_day ?? '').trim(),
        end_day: String(row.end_day ?? '').trim(),
      };
    });
  } else {
    schedule = [
      {
        frequency: 1,
        start_time: toApiTime(data.startTime),
        end_time: toApiTime(data.endTime),
      },
    ];
  }

  const hasMarkerContext =
    markerCoordinatesByFloorKey &&
    typeof markerCoordinatesByFloorKey === 'object' &&
    Object.keys(markerCoordinatesByFloorKey).length > 0;
  const hasLayoutBundle = Array.isArray(layoutBundleFloors) && layoutBundleFloors.length > 0;
  const hasFloorMeta =
    floorRowMetaByFloorKey &&
    typeof floorRowMetaByFloorKey === 'object' &&
    Object.keys(floorRowMetaByFloorKey).length > 0;
  const selectedFloor = resolveSelectedCenterFloor(data);

  const floorPayload =
    hasMarkerContext || hasFloorMeta || (hasLayoutBundle && selectedFloor)
      ? buildCenterTrackerFloorPayload({
          selectedFloor,
          markerCoordinatesByFloorKey: markerCoordinatesByFloorKey ?? {},
          layoutBundleFloors: layoutBundleFloors ?? [],
          floorRowMetaByFloorKey: floorRowMetaByFloorKey ?? {},
        })
      : (() => {
          const floorValues = Array.isArray(data.floors)
            ? data.floors
            : selectedFloor
              ? [selectedFloor]
              : [];
          return floorValues
            .map((f) => String(f ?? '').trim())
            .filter(Boolean)
            .map((floor) => ({ floor }));
        })();

  const payload = {
    tracker_name: trackerName,
    center_task_name: data.taskTitle,
    center: centerId,
    status: 'Active',
    view_type: viewType,
    floor: floorPayload,
    checklists: normalizedChecklists,
    schedule,
  };

  const templateDoc = String(data.trackerTaskMasterTemplate ?? '').trim();
  const templateDisplayName = String(data.masterTaskName ?? data.master_task_name ?? '').trim();
  if (templateDoc) {
    payload.tracker_task_master = templateDoc;
  }
  if (templateDisplayName || templateDoc) {
    payload.master_task_name = templateDisplayName || templateDoc;
  }

  const desc = String(data.description ?? '').trim();
  if (desc) payload.description = desc;

  payload.is_image_mandatory = data.isImageMandatory === false ? 0 : 1;

  const idsFromForm = Array.isArray(data.assigneeIds)
    ? data.assigneeIds
    : data.assignee
      ? [data.assignee]
      : [];
  const assigneeIds = idsFromForm.map((id) => String(id ?? '').trim()).filter(Boolean);
  if (assigneeIds.length > 0) {
    payload.assignees = buildTrackerAssigneeRows(assigneeIds, assigneeOptions);
  }

  return payload;
};
