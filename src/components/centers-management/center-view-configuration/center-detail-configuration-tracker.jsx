import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as Button from '@/components/ui/button';
import * as Popover from '@/components/ui/popover';
import * as Input from '@/components/ui/input';
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import * as Table from '@/components/ui/table';
import * as Checkbox from '@/components/ui/checkbox';
import * as CompactButton from '@/components/ui/compact-button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Select from '@/components/ui/select';
import SupervisorAssigneeMultiSelect from '@/components/ui/supervisor-assignee-multi-select';
import * as Switch from '@/components/ui/switch';
import * as Tag from '@/components/ui/tag';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TIME_OPTIONS } from '@/pages/tracker/constants';
import {
  buildCenterTrackerTaskPayload,
  buildTrackerAssigneeRows,
} from '@/utils/center-tracker-task-payload';

import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  RiAddLine,
  RiArrowRightSLine,
  RiArrowDownSLine,
  RiDeleteBinLine,
  RiDraggable,
  RiFileCopyLine,
  RiLayoutColumnLine,
  RiPencilLine,
  RiSearchLine,
  RiSettings3Line,
  RiUploadLine,
} from 'react-icons/ri';
import CreateTrackerTaskDrawer from '@/components/tracker/create-tracker-task-drawer';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAssociatedTeamMembersForRolesThunk,
  fetchCenterTrackerTabsThunk,
  fetchCenterTrackerTaskListThunk,
  fetchFloorByCenterThunk,
} from '@/redux/centerTrackerSlice';
import { useDebounce } from '@/hooks/use-debounce';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { findScrollableParent } from '@/components/event-management/event-participants-utils';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import * as Modal from '@/components/ui/modal';
import apiClient from '@/api';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const CENTER_TRACKER_LIST_PREF_DOCTYPE = 'Center Tracker Task';
const getCenterTrackerReactTableId = (centerId) =>
  `center-tracker-${String(centerId ?? '').trim()}`;
const getCenterTrackerActiveTabStorageKey = (centerId) =>
  `center-tracker-active-tab-${String(centerId ?? '').trim()}`;
const getTrackerPrefId = (trackerName) =>
  String(trackerName ?? '')
    .trim()
    .replaceAll(/\s+/g, '_');
const getTrackerDisplayLabel = (trackerName) => String(trackerName ?? '').trim();

/**
 * sessionStorage key for the Configuration tab's filter dropdown selections.
 * Mirrors the Landlords-tab pattern (`center-view-landlord-view-filter-dropdown-<id>`)
 * so each center owns its own scope. Per-tracker selections are nested
 * inside a single object, keyed by the tracker name (the active sub-tab).
 */
const getCenterTrackerFiltersStorageKey = (centerId) =>
  centerId ? `center-tracker-view-filter-dropdown-${String(centerId).trim()}` : null;

const DEFAULT_CENTER_TRACKER_FILTERS = Object.freeze({
  // Map of trackerName -> { floors: string[], assignees: string[] }.
  byTracker: {},
});

/**
 * Strip empty buckets so sessionStorage stays small when the user clears
 * everything. Returns the same nested shape as `DEFAULT_CENTER_TRACKER_FILTERS`.
 */
const compactCenterTrackerFiltersForStorage = (filters) => {
  if (!filters || typeof filters !== 'object') return {};
  const byTracker = filters.byTracker;
  if (!byTracker || typeof byTracker !== 'object') return {};
  const out = {};
  for (const [trackerName, bucket] of Object.entries(byTracker)) {
    if (!bucket || typeof bucket !== 'object') continue;
    const floors = Array.isArray(bucket.floors)
      ? bucket.floors.map((v) => String(v).trim()).filter(Boolean)
      : [];
    const assignees = Array.isArray(bucket.assignees)
      ? bucket.assignees.map((v) => String(v).trim()).filter(Boolean)
      : [];
    if (floors.length === 0 && assignees.length === 0) continue;
    out[trackerName] = {};
    if (floors.length > 0) out[trackerName].floors = floors;
    if (assignees.length > 0) out[trackerName].assignees = assignees;
  }
  return Object.keys(out).length > 0 ? { byTracker: out } : {};
};

/** Read a single tracker's saved filter bucket (always returns string arrays). */
const readTrackerBucket = (filters, trackerName) => {
  const bucket = filters?.byTracker?.[trackerName];
  return {
    floors: Array.isArray(bucket?.floors) ? bucket.floors.map((value) => String(value)) : [],
    assignees: Array.isArray(bucket?.assignees)
      ? bucket.assignees.map((value) => String(value))
      : [],
  };
};

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Weekday ids for API `schedule[].frequency` (1 = Monday … 7 = Sunday) */
const WEEKDAY_OPTIONS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '7', label: 'Sunday' },
];

const MONTH_WEEK_OPTIONS = Array.from({ length: 4 }, (_, index) => ({
  value: String(index + 1),
  label: `Week ${index + 1}`,
}));

const YEAR_MONTH_OPTIONS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const MONTH_END_DAY_NONE = '__monthly_end_none__';
const MONTH_DAY_NUMERIC_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7', label: '7' },
];
const START_TIME_SELECT_OPTIONS = TIME_OPTIONS.map((label) => ({
  value: `${label}:00`,
  label,
}));

const normalizeTimeForSelect = (t) => {
  const s = String(t ?? '').trim();
  if (!s) return '';
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  return s;
};

/** Align with create-tracker-task-drawer: short labels (e.g. 09:00) from TIME_OPTIONS */
const resolveTimeDisplayLabel = (raw) => {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '';
  const normalized = normalizeTimeForSelect(trimmed);
  const key = normalized || trimmed;
  const opt = START_TIME_SELECT_OPTIONS.find((o) => String(o.value) === String(key));
  if (opt) return opt.label;
  return normalized.replace(/:\d{2}$/, '') || trimmed;
};

/** Comparable seconds-since-midnight for HH:MM:SS */
const timeStringToComparable = (raw) => {
  const normalized = normalizeTimeForSelect(raw);
  if (!normalized || !/^\d{2}:\d{2}:\d{2}$/.test(normalized)) return null;
  const [h, m, s] = normalized.split(':').map(Number);
  return h * 3600 + m * 60 + s;
};

const formatTimeRange = (startTime, endTime) => {
  const startLabel = resolveTimeDisplayLabel(startTime);
  const endLabel = resolveTimeDisplayLabel(endTime);
  if (!startLabel && !endLabel) return '';
  if (startLabel && endLabel) return `${startLabel} – ${endLabel}`;
  return startLabel || endLabel;
};

const normalizeChecklistsFromApiList = (checklists) => {
  if (!Array.isArray(checklists) || checklists.length === 0) {
    return [];
  }
  return checklists.map((row) => ({
    name: row?.name,
    checklist_title: String(row?.checklist_title ?? row?.checklist ?? '').trim(),
    disabled: Number(row?.disabled) ? 1 : 0,
  }));
};

const resolveRowIsImageMandatory = (row) =>
  Number(row?.isImageMandatory ?? row?.is_image_mandatory ?? 1) === 1;

const centerTaskRowToFormData = (row) => {
  const checklists = row.checklists ?? [];
  const vt = String(row.viewType ?? '').toLowerCase();
  const taskTitle = row.taskName ?? '';
  const floors = row.floors ?? [];
  const assigneeRoleName = row.assigneeRoleName ?? '';
  const description = row.description ?? '';
  const isImageMandatory = resolveRowIsImageMandatory(row);
  const assigneeIds = Array.isArray(row.assigneeIds)
    ? row.assigneeIds.map((id) => String(id).trim()).filter(Boolean)
    : row.assignee
      ? [String(row.assignee).trim()].filter(Boolean)
      : [];
  const assignee = assigneeIds[0] ?? '';

  if (vt === 'daily') {
    const sorted = [...(row.schedule ?? [])].sort(
      (a, b) => (Number(a.frequency) || 0) - (Number(b.frequency) || 0),
    );
    const n = Math.min(
      100,
      Math.max(
        1,
        sorted.length > 0
          ? sorted.length
          : Number.parseInt(String(row.frequencyCount ?? '1'), 10) || 1,
      ),
    );
    const schedule = Array.from({ length: n }, (_, i) => {
      const existing = sorted.find((s) => Number(s.frequency) === i + 1);
      return {
        start_time: normalizeTimeForSelect(existing?.start_time),
        end_time: normalizeTimeForSelect(existing?.end_time),
      };
    });
    return {
      taskTitle,
      floors,
      assignee,
      assigneeIds,
      assigneeRoleName,
      description,
      isImageMandatory,
      frequencyCount: String(n),
      weekdayIds: [],
      monthWeekIds: [],
      yearMonthIds: [],
      frequency: '1',
      startTime: '',
      endTime: '',
      schedule,
      checklists,
    };
  }

  if (vt === 'weekly') {
    const sorted = [...(row.schedule ?? [])].sort(
      (a, b) => (Number(a.frequency) || 0) - (Number(b.frequency) || 0),
    );
    const weekdayIds = sorted.map((r) => String(r.frequency));
    const schedule = sorted.map((r) => ({
      start_time: normalizeTimeForSelect(r.start_time),
      end_time: normalizeTimeForSelect(r.end_time),
    }));
    return {
      taskTitle,
      floors,
      assignee,
      assigneeIds,
      assigneeRoleName,
      description,
      isImageMandatory,
      frequencyCount: '1',
      weekdayIds,
      monthWeekIds: [],
      yearMonthIds: [],
      frequency: '1',
      startTime: '',
      endTime: '',
      schedule,
      checklists,
    };
  }

  if (vt === 'monthly') {
    const sorted = [...(row.schedule ?? [])].sort(
      (a, b) => (Number(a.frequency) || 0) - (Number(b.frequency) || 0),
    );
    const monthWeekIds = sorted
      .map((r) => String(Number(r.frequency) || 1))
      .filter((id) => Number(id) >= 1 && Number(id) <= 4);
    const schedule = sorted.map((existing) => ({
      start_day: String(existing?.start_day ?? '').trim(),
      end_day:
        existing?.end_day != null && String(existing.end_day).trim() !== ''
          ? String(existing.end_day).trim()
          : '',
    }));
    return {
      taskTitle,
      floors,
      assignee,
      assigneeIds,
      assigneeRoleName,
      description,
      isImageMandatory,
      frequencyCount: '1',
      weekdayIds: [],
      monthWeekIds,
      yearMonthIds: [],
      frequency: '1',
      startTime: '',
      endTime: '',
      schedule,
      checklists,
    };
  }

  if (vt === 'annually') {
    const sorted = [...(row.schedule ?? [])].sort(
      (a, b) => (Number(a.frequency) || 0) - (Number(b.frequency) || 0),
    );
    const yearMonthIds =
      sorted.length > 0 ? sorted.map((r) => String(Number(r.frequency) || 1)) : [];
    const schedule = sorted.map((existing) => ({
      start_day: String(existing?.start_day ?? '').trim(),
      end_day:
        existing?.end_day != null && String(existing.end_day).trim() !== ''
          ? String(existing.end_day).trim()
          : '',
    }));
    return {
      taskTitle,
      floors,
      assignee,
      assigneeIds,
      assigneeRoleName,
      description,
      isImageMandatory,
      frequencyCount: '1',
      weekdayIds: [],
      monthWeekIds: [],
      yearMonthIds,
      frequency: '1',
      startTime: '',
      endTime: '',
      schedule,
      checklists,
    };
  }

  const s = row.schedule?.[0] ?? {};
  return {
    taskTitle,
    floors,
    assignee,
    assigneeIds,
    assigneeRoleName,
    description,
    isImageMandatory,
    frequencyCount: '1',
    weekdayIds: [],
    monthWeekIds: [],
    yearMonthIds: [],
    frequency: String(s.frequency ?? '1'),
    startTime: normalizeTimeForSelect(s.start_time),
    endTime: normalizeTimeForSelect(s.end_time),
    schedule: [
      {
        start_time: normalizeTimeForSelect(s.start_time),
        end_time: normalizeTimeForSelect(s.end_time),
      },
    ],
    checklists,
  };
};

const getCenterTrackerListPhotoUrl = (raw) => {
  if (!raw) return '';
  if (/^https?:\/\//i.test(String(raw))) return String(raw);
  const base = String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  const path = String(raw).startsWith('/') ? raw : `/${raw}`;
  return base ? `${base}${path}` : path;
};

const uploadCenterTrackerTaskPhotos = async (taskName, files) => {
  const fileList = [...(files ?? [])].filter((f) => f instanceof File);
  if (!taskName || fileList.length === 0) return;
  const formData = new FormData();
  formData.append('task_name', taskName);
  fileList.forEach((file) => formData.append('files', file));
  await apiClient.post(
    '/method/devx.tracker.api.api_center_tracker_task.add_center_tracker_task_photo',
    formData,
  );
};

const frequencyToSlotLabel = (viewType, frequency) => {
  const vt = String(viewType ?? '').toLowerCase();
  const n = Number(frequency);
  if (vt === 'weekly') {
    if (Number.isFinite(n) && n >= 1 && n <= 7) return WEEK_DAYS[n - 1];
    return String(frequency ?? '—');
  }
  if (vt === 'monthly') {
    if (Number.isFinite(n) && n >= 1 && n <= 5) return `Week ${n}`;
    return String(frequency ?? '—');
  }
  if (vt === 'annually') {
    const opt = YEAR_MONTH_OPTIONS.find((o) => o.value === String(n));
    if (opt) return opt.label;
    return String(frequency ?? '—');
  }
  if (Number.isFinite(n)) return String(n);
  return String(frequency ?? '—');
};

const EditableFloorCell = ({ floors = [], floorOptions = [], disabled, onCommit }) => {
  const selectedFloor = Array.isArray(floors) ? String(floors[0] ?? '').trim() : '';

  return (
    <div onClick={(e) => e.stopPropagation()} className='min-w-[140px]'>
      <Select.Root
        variant='borderless'
        size='small'
        value={selectedFloor || undefined}
        onValueChange={(value) => onCommit({ floors: value ? [value] : [] })}
        disabled={disabled}
      >
        <Select.Trigger className='w-full min-w-0'>
          <Select.Value placeholder='Select floor' />
        </Select.Trigger>
        <Select.Content>
          {floorOptions.map((opt) => (
            <Select.Item key={opt.value} value={opt.value}>
              {opt.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </div>
  );
};

const frequencySelectorOptions = (viewType) => {
  const vt = String(viewType ?? '').toLowerCase();
  if (vt === 'weekly') {
    const sundayFirstOrder = ['7', '1', '2', '3', '4', '5', '6'];
    const byValue = Object.fromEntries(WEEKDAY_OPTIONS.map((o) => [o.value, o]));
    return sundayFirstOrder
      .map((id) => byValue[id])
      .filter(Boolean)
      .map((o) => ({ ...o, shortLabel: o.label.charAt(0) }));
  }
  if (vt === 'monthly') {
    return MONTH_WEEK_OPTIONS.map((o) => ({ ...o, shortLabel: o.label }));
  }
  if (vt === 'annually') {
    return YEAR_MONTH_OPTIONS.map((o) => ({ ...o, shortLabel: o.label.slice(0, 3) }));
  }
  return [];
};

const normalizeScheduleRows = (rows) =>
  [...(rows ?? [])]
    .map((row, index) => ({
      frequency: Number(row?.frequency) || index + 1,
      start_time: normalizeTimeForSelect(row?.start_time),
      end_time: normalizeTimeForSelect(row?.end_time),
      start_day: String(row?.start_day ?? '').trim(),
      end_day:
        row?.end_day != null && String(row.end_day).trim() !== '' ? String(row.end_day).trim() : '',
    }))
    .sort((a, b) => a.frequency - b.frequency);

const scheduleFrequencyIds = (viewType, rows) => {
  const vt = String(viewType ?? '').toLowerCase();
  const list = normalizeScheduleRows(rows);
  if (vt === 'daily') {
    return Array.from({ length: list.length }, (_, index) => String(index + 1));
  }
  const max = vt === 'weekly' ? 7 : vt === 'monthly' ? 4 : vt === 'annually' ? 12 : 0;
  return list
    .map((slot) => String(slot.frequency))
    .filter((v) => Number(v) >= 1 && Number(v) <= max);
};

const buildScheduleFromFrequencyIds = (viewType, ids, previousRows) => {
  const vt = String(viewType ?? '').toLowerCase();
  const previous = Object.fromEntries(
    normalizeScheduleRows(previousRows).map((row) => [String(row.frequency), row]),
  );

  if (vt === 'daily') {
    const count = Math.min(100, Math.max(0, Number.parseInt(String(ids?.[0] ?? '0'), 10) || 0));
    return Array.from({ length: count }, (_, index) => {
      const key = String(index + 1);
      const current = previous[key];
      return {
        frequency: index + 1,
        start_time: current?.start_time || '',
        end_time: current?.end_time || '',
      };
    });
  }

  const max = vt === 'weekly' ? 7 : vt === 'monthly' ? 4 : vt === 'annually' ? 12 : 0;
  const selected = [...new Set(ids ?? [])]
    .map((id) => Number.parseInt(String(id), 10))
    .filter((n) => n >= 1 && n <= max)
    .sort((a, b) => a - b);
  return selected.map((frequency) => {
    const key = String(frequency);
    const current = previous[key];
    return {
      frequency,
      ...(vt === 'weekly'
        ? {
            start_time: current?.start_time || '',
            end_time: current?.end_time || '',
          }
        : {
            start_day: current?.start_day || '',
            end_day: current?.end_day || '',
          }),
    };
  });
};

const EditableFrequencyTimeCell = ({
  viewType,
  schedule = [],
  disabled,
  onCommit,
  summaryMode = 'time',
}) => {
  const vt = String(viewType ?? '').toLowerCase();
  const isDaily = vt === 'daily';
  const isSupported = ['daily', 'weekly', 'monthly', 'annually'].includes(vt);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [draftSchedule, setDraftSchedule] = useState(() => normalizeScheduleRows(schedule));

  useEffect(() => {
    if (isPopoverOpen) return;
    setDraftSchedule(normalizeScheduleRows(schedule));
  }, [schedule, isPopoverOpen]);

  const list = useMemo(() => normalizeScheduleRows(draftSchedule), [draftSchedule]);
  const frequencyChips = useMemo(
    () =>
      list.map((slot, index) => ({
        key: `freq-${slot.frequency}-${index}`,
        text: frequencyToSlotLabel(vt, slot.frequency),
      })),
    [list, vt],
  );
  const timeChips = useMemo(() => {
    return list
      .map((slot, index) => {
        // Annually is month-only — no day chips.
        if (vt === 'annually') return null;
        if (vt === 'monthly') {
          const startDay = String(slot.start_day ?? '').trim();
          const endDay = String(slot.end_day ?? '').trim();
          if (!startDay && !endDay) return null;
          const range = startDay && endDay ? `${startDay}-${endDay}` : startDay || endDay;
          return {
            key: `day-${slot.frequency}-${index}`,
            text: `${frequencyToSlotLabel(vt, slot.frequency)}: Day ${range}`,
          };
        }
        const range = formatTimeRange(slot.start_time, slot.end_time);
        if (!range) return null;
        if (vt === 'daily') return { key: `time-${slot.frequency}-${index}`, text: range };
        return {
          key: `time-${slot.frequency}-${index}`,
          text: `${frequencyToSlotLabel(vt, slot.frequency)}: ${range}`,
        };
      })
      .filter(Boolean);
  }, [list, vt]);

  const selectedFrequencyIds = useMemo(
    () => scheduleFrequencyIds(vt, draftSchedule),
    [vt, draftSchedule],
  );
  const frequencyOptions = useMemo(() => frequencySelectorOptions(vt), [vt]);

  const toggleFrequency = useCallback(
    (id) => {
      if (isDaily) return;
      const nextIds = selectedFrequencyIds.includes(id)
        ? selectedFrequencyIds.filter((x) => x !== id)
        : [...selectedFrequencyIds, id];
      setDraftSchedule(buildScheduleFromFrequencyIds(vt, nextIds, draftSchedule));
    },
    [isDaily, selectedFrequencyIds, vt, draftSchedule],
  );

  const updateDailyCount = useCallback(
    (countValue) => {
      setDraftSchedule(buildScheduleFromFrequencyIds(vt, [String(countValue)], draftSchedule));
    },
    [vt, draftSchedule],
  );

  const updateSlotTimes = useCallback(
    (index, patch) => {
      setDraftSchedule((previous) => {
        const rows = normalizeScheduleRows(previous);
        const current = rows[index];
        if (!current) return previous;
        const merged = { ...current, ...patch };
        if (vt === 'monthly' || vt === 'annually') {
          const startDay = Number.parseInt(String(merged.start_day ?? '').trim(), 10);
          const endDay = Number.parseInt(String(merged.end_day ?? '').trim(), 10);
          if (
            vt === 'monthly' &&
            Number.isFinite(startDay) &&
            Number.isFinite(endDay) &&
            endDay > 0 &&
            startDay > 0 &&
            endDay < startDay
          ) {
            showErrorToast(new Error('End day cannot be before start day.'));
            return previous;
          }
        } else {
          const startNorm = normalizeTimeForSelect(merged.start_time ?? '');
          const endNorm = normalizeTimeForSelect(merged.end_time ?? '');
          if (startNorm && endNorm) {
            const startSec = timeStringToComparable(startNorm);
            const endSec = timeStringToComparable(endNorm);
            if (startSec != null && endSec != null && endSec <= startSec) {
              showErrorToast(new Error('End time must be after start time.'));
              return previous;
            }
          }
        }
        return rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
      });
    },
    [vt],
  );

  const handleCancel = useCallback(() => {
    setDraftSchedule(normalizeScheduleRows(schedule));
    setIsPopoverOpen(false);
  }, [schedule]);

  const handleSave = useCallback(() => {
    if (isDaily) {
      const hasMissingTimes = normalizeScheduleRows(draftSchedule).some(
        (slot) =>
          !normalizeTimeForSelect(slot.start_time ?? '') ||
          !normalizeTimeForSelect(slot.end_time ?? ''),
      );
      if (hasMissingTimes) {
        showErrorToast(new Error('Start and end time are required for each frequency slot.'));
        return;
      }
    }

    const current = normalizeScheduleRows(schedule);
    const draft = normalizeScheduleRows(draftSchedule);
    if (JSON.stringify(current) !== JSON.stringify(draft)) {
      onCommit?.({
        schedule: draft.map((slot) => ({
          frequency: slot.frequency,
          ...(vt === 'monthly' || vt === 'annually'
            ? {
                start_day: String(slot.start_day ?? '').trim(),
                ...(String(slot.end_day ?? '').trim()
                  ? { end_day: String(slot.end_day).trim() }
                  : {}),
              }
            : {
                start_time: slot.start_time || '',
                ...(slot.end_time ? { end_time: slot.end_time } : {}),
              }),
        })),
        ...(isDaily ? { frequencyCount: String(draft.length) } : {}),
      });
    }
    setIsPopoverOpen(false);
  }, [schedule, draftSchedule, onCommit, isDaily, vt]);

  const chips = summaryMode === 'frequency' || vt === 'annually' ? frequencyChips : timeChips;
  const emptyText =
    summaryMode === 'frequency'
      ? isDaily
        ? 'Select frequency'
        : 'Select options'
      : vt === 'annually'
        ? 'Select months'
        : vt === 'monthly'
          ? 'Set frequency & day'
          : 'Set frequency & time';

  if (!isSupported) {
    return <span className='paragraph-small text-text-sub-400'>—</span>;
  }

  return (
    <div onClick={(e) => e.stopPropagation()} className='min-w-[160px]'>
      <Popover.Root open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <Popover.Trigger asChild>
          <button
            type='button'
            disabled={disabled}
            className={cn(
              'flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors',
              disabled
                ? 'cursor-not-allowed opacity-50'
                : 'border-stroke-soft-200 hover:bg-bg-weak-50',
            )}
          >
            {chips.length === 0 ? (
              <span className='label-small text-text-soft-400'>{emptyText}</span>
            ) : (
              <span className='flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden'>
                <Tag.Root className='min-w-0 truncate'>{chips[0].text}</Tag.Root>
                {chips.length > 1 ? (
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span
                        className='shrink-0'
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <Tag.Root className='shrink-0 cursor-default'>+{chips.length - 1}</Tag.Root>
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
                      <div className='flex flex-col gap-1'>
                        <span className='mb-1 text-paragraph-sm font-medium text-text-strong-950'>
                          Additional schedules ({chips.length - 1})
                        </span>
                        {chips.slice(1).map((chip) => (
                          <div key={chip.key} className='text-paragraph-sm text-text-sub-600'>
                            {chip.text}
                          </div>
                        ))}
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                ) : null}
              </span>
            )}
            <RiArrowDownSLine className='size-4 shrink-0 text-text-soft-400' />
          </button>
        </Popover.Trigger>
        <Popover.Content
          align='start'
          className='w-[min(calc(100vw-3rem),420px)] flex flex-col'
          side='bottom'
          sideOffset={8}
        >
          <div className='flex max-h-[min(60vh,480px)] flex-col gap-4 overflow-y-auto p-1 pr-1'>
            <div className='flex flex-col gap-2'>
              <span className='label-small text-text-main-900'>Frequency</span>
              {isDaily ? (
                <SearchableSelect
                  size='small'
                  value={String(Math.max(1, list.length || 1))}
                  onValueChange={updateDailyCount}
                  options={Array.from({ length: 48 }, (_, index) => ({
                    value: String(index + 1),
                    label: String(index + 1),
                  }))}
                  placeholder='Select frequency'
                  showArrow={true}
                  triggerClassName='w-full'
                />
              ) : (
                <div className='flex flex-wrap gap-2'>
                  {frequencyOptions.map((option) => {
                    const selected = selectedFrequencyIds.includes(option.value);
                    return (
                      <Button.Root
                        key={`freq-option-${option.value}`}
                        type='button'
                        size='small'
                        className={cn(
                          'rounded-full! px-0! py-0! size-9',
                          vt === 'monthly' ? 'h-9 min-w-[84px] px-2! rounded-lg!' : '',
                          vt === 'annually' ? 'min-w-[48px] px-2!' : '',
                        )}
                        variant={selected ? 'primary' : 'neutral'}
                        mode={selected ? 'filled' : 'stroke'}
                        onClick={() => toggleFrequency(option.value)}
                      >
                        {option.shortLabel}
                      </Button.Root>
                    );
                  })}
                </div>
              )}
            </div>

            {vt !== 'annually' ? (
              <div className='flex flex-col gap-3'>
                <span className='label-small text-text-main-900'>
                  {vt === 'monthly' ? 'Day' : 'Time'}
                </span>
                {list.length === 0 ? (
                  <span className='paragraph-small text-text-soft-400'>Select frequency first</span>
                ) : (
                  list.map((slot, index) => {
                    const startValue = normalizeTimeForSelect(slot.start_time) || '';
                    const endValue = normalizeTimeForSelect(slot.end_time) || '';
                    const startDay = String(slot.start_day ?? '').trim();
                    const endDay = String(slot.end_day ?? '').trim();
                    return (
                      <div key={`slot-${slot.frequency}-${index}`} className='flex flex-col gap-2'>
                        <span className='label-small text-text-main-900'>
                          {frequencyToSlotLabel(vt, slot.frequency)}:{' '}
                          {vt === 'monthly' ? 'Start - End Day' : 'Start - End Time'}
                        </span>
                        <div className='flex min-w-0 items-center gap-2'>
                          {vt === 'monthly' ? (
                            <SearchableSelect
                              size='small'
                              value={startDay || ''}
                              onValueChange={(value) =>
                                updateSlotTimes(index, { start_day: value })
                              }
                              options={MONTH_DAY_NUMERIC_OPTIONS}
                              placeholder='Start day'
                              showArrow={true}
                              triggerClassName='min-w-0 flex-1'
                            />
                          ) : (
                            <Select.Root
                              size='small'
                              value={startValue || undefined}
                              onValueChange={(value) =>
                                updateSlotTimes(index, { start_time: value })
                              }
                            >
                              <Select.Trigger className='min-w-0 flex-1'>
                                <Select.Value placeholder='Start' />
                              </Select.Trigger>
                              <Select.Content>
                                {START_TIME_SELECT_OPTIONS.map((opt) => (
                                  <Select.Item
                                    key={`combined-start-${index}-${opt.value}`}
                                    value={opt.value}
                                  >
                                    {opt.label}
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select.Root>
                          )}
                          <span className='shrink-0 paragraph-small text-text-soft-400' aria-hidden>
                            -
                          </span>
                          {vt === 'monthly' ? (
                            <SearchableSelect
                              size='small'
                              value={endDay || ''}
                              onValueChange={(value) =>
                                updateSlotTimes(index, {
                                  end_day: value,
                                })
                              }
                              valueSentinel={MONTH_END_DAY_NONE}
                              options={[
                                { value: MONTH_END_DAY_NONE, label: 'No end day' },
                                ...MONTH_DAY_NUMERIC_OPTIONS,
                              ]}
                              placeholder='End day'
                              showArrow={true}
                              triggerClassName='min-w-0 flex-1'
                            />
                          ) : (
                            <Select.Root
                              size='small'
                              value={endValue || undefined}
                              onValueChange={(value) => updateSlotTimes(index, { end_time: value })}
                            >
                              <Select.Trigger className='min-w-0 flex-1'>
                                <Select.Value placeholder='End' />
                              </Select.Trigger>
                              <Select.Content>
                                {START_TIME_SELECT_OPTIONS.map((opt) => (
                                  <Select.Item
                                    key={`combined-end-${index}-${opt.value}`}
                                    value={opt.value}
                                  >
                                    {opt.label}
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select.Root>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>
          <div className='flex items-center justify-end gap-2 p-4 pt-2 border-t border-stroke-soft-200'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={handleCancel}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='small'
              onClick={handleSave}
            >
              Save
            </Button.Root>
          </div>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
};

const SortableRow = ({
  row,
  onChange,
  onRequestDelete,
  onUploadFiles,
  onOpenEditDrawer,
  onOpenDuplicateDrawer,
  floorOptions = [],
  assigneeOptions = [],
  onPersistRow,
  isRowSaving = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });
  const fileInputId = `tracker-row-upload-${row.id}`;
  const [isTaskNameEditing, setIsTaskNameEditing] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <Table.Row ref={setNodeRef} style={style}>
      <Table.Cell className='w-[52px]'>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            className='text-text-soft-400 cursor-grab active:cursor-grabbing'
            aria-label='Drag row'
            {...attributes}
            {...listeners}
          >
            <RiDraggable className='size-4' />
          </button>
          <Checkbox.Root
            checked={Boolean(row.completed)}
            onCheckedChange={(checked) => {
              const nextCompleted = Boolean(checked);
              onChange(row.id, { completed: nextCompleted });
              onPersistRow?.(row.id, { completed: nextCompleted });
            }}
          />
        </div>
      </Table.Cell>

      <Table.Cell className='min-w-[240px]'>
        {isTaskNameEditing ? (
          <Input.Root size='xsmall' variant='borderless' noRing className='shadow-none'>
            <Input.Wrapper className='px-0'>
              <Input.Input
                autoFocus
                value={row.taskName}
                onBlur={() => setIsTaskNameEditing(false)}
                onChange={(e) => onChange(row.id, { taskName: e.target.value })}
                placeholder='Task name'
              />
            </Input.Wrapper>
          </Input.Root>
        ) : (
          <div className='flex w-full justify-start items-center gap-1 group/task-name'>
            <button
              type='button'
              className='flex-1 text-left label-small text-text-main-900 hover:text-primary-base truncate'
              onClick={() => onOpenEditDrawer?.(row.id)}
            >
              {row.taskName || 'Untitled task'}
            </button>
            <div className='flex items-center gap-1 opacity-0 pointer-events-none transition-opacity group-hover/task-name:opacity-100 group-focus-within/task-name:opacity-100 group-hover/task-name:pointer-events-auto group-focus-within/task-name:pointer-events-auto'>
              <CompactButton.Root
                type='button'
                size='xsmall'
                variant='neutral'
                mode='ghost'
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDuplicateDrawer?.(row.apiName ?? row.id);
                }}
              >
                <CompactButton.Icon as={RiFileCopyLine} />
              </CompactButton.Root>

              <CompactButton.Root
                type='button'
                size='xsmall'
                variant='neutral'
                mode='ghost'
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTaskNameEditing(true);
                }}
              >
                <CompactButton.Icon as={RiPencilLine} />
              </CompactButton.Root>
            </div>
          </div>
        )}
      </Table.Cell>

      <Table.Cell className='min-w-[160px]'>
        <EditableFloorCell
          floors={row.floors}
          floorOptions={floorOptions}
          disabled={isRowSaving}
          onCommit={(patch) => onPersistRow?.(row.id, patch)}
        />
      </Table.Cell>

      <Table.Cell className='min-w-[200px]'>
        <SupervisorAssigneeMultiSelect
          options={assigneeOptions}
          value={row.assigneeIds ?? (row.assignee ? [row.assignee] : [])}
          size='xsmall'
          variant='borderless'
          placeholder='Select assignees'
          maxVisibleAvatars={4}
          roleLabel={row.assigneeRoleName || 'Team member'}
          disabled={isRowSaving}
          syncParentOnEachSelection={false}
          onChange={(ids) => {
            const list = Array.isArray(ids) ? ids : [];
            onChange(row.id, {
              assigneeIds: list,
              assignee: list[0] ?? '',
            });
          }}
          onBlur={(ids) => {
            const list = Array.isArray(ids) ? ids : [];
            onPersistRow?.(row.id, { assigneeIds: list });
          }}
        />
      </Table.Cell>

      <Table.Cell className='min-w-[200px]'>
        <EditableFrequencyTimeCell
          viewType={row.viewType}
          schedule={row.schedule}
          disabled={isRowSaving}
          onCommit={(patch) => onPersistRow?.(row.id, patch)}
          summaryMode='time'
        />
      </Table.Cell>

      <Table.Cell className='min-w-[140px]'>
        <input
          id={fileInputId}
          type='file'
          className='hidden'
          accept='image/*'
          multiple
          onChange={(e) => {
            onUploadFiles?.(row.id, e.target.files);
            e.target.value = '';
          }}
        />

        {(row.photo?.length ?? 0) > 0 ? (
          <div className='mt-2 flex items-center gap-1'>
            {row.photo
              .filter(Boolean)
              .slice(0, 2)
              .map((image) => (
                <img
                  key={image.id ?? image.previewUrl}
                  src={image.previewUrl}
                  alt={image.file?.name ?? image.fileName ?? 'Photo'}
                  className='size-7 rounded-md object-cover border border-stroke-soft-200'
                />
              ))}
            {(row.photo?.length ?? 0) > 2 && (
              <span className='paragraph-xsmall text-text-sub-600'>+{row.photo.length - 2}</span>
            )}
          </div>
        ) : (
          <Button.Root
            type='button'
            size='xsmall'
            variant='neutral'
            mode='stroke'
            className='gap-2'
            onClick={() => document.querySelector(`#${fileInputId}`)?.click()}
          >
            <Button.Icon as={RiUploadLine} className='size-4' />
            Upload
          </Button.Root>
        )}
      </Table.Cell>

      <Table.Cell className='w-[56px] text-right'>
        <CompactButton.Root
          type='button'
          size='xsmall'
          variant='neutral'
          mode='ghost'
          onClick={() => onRequestDelete?.(row.id)}
        >
          <CompactButton.Icon as={RiDeleteBinLine} />
        </CompactButton.Root>
      </Table.Cell>
    </Table.Row>
  );
};

const ManageTrackerItem = ({ tracker, togglingTracker, onToggle }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tracker.name,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className='flex items-center gap-3 px-3 py-2.5 rounded-lg bg-bg-weak-50 hover:bg-bg-weak-100 transition-colors'
    >
      <button
        type='button'
        className='text-text-soft-400 cursor-grab active:cursor-grabbing'
        aria-label='Reorder tracker'
        {...attributes}
        {...listeners}
      >
        <RiDraggable className='size-4 shrink-0' />
      </button>
      <span className='flex-1 paragraph-small text-text-main-900 truncate'>{tracker.name}</span>
      <Switch.Root
        checked={tracker.visible !== false}
        disabled={togglingTracker === tracker.name}
        onCheckedChange={(checked) => onToggle(tracker.name, checked)}
      />
    </div>
  );
};

const mapApiTaskToRow = (item) => {
  const photos = Array.isArray(item.photos) ? item.photos : [];
  const photo = photos
    .map((p, index) => {
      const raw = typeof p === 'string' ? p : p?.photo_url || p?.photo || '';
      if (!raw) return null;
      const previewUrl = getCenterTrackerListPhotoUrl(raw);
      return {
        id: p?.name ?? `${previewUrl}-${index}`,
        previewUrl,
        file: null,
        fileName: String(raw).split('/').pop() || `photo-${index + 1}`,
      };
    })
    .filter(Boolean);

  const floors = Array.isArray(item.floor)
    ? item.floor.map((f) => (typeof f === 'object' && f !== null ? f.floor : f)).filter(Boolean)
    : [];

  const assignees = Array.isArray(item.assignees) ? item.assignees : [];
  const roleAssignee = assignees.find(
    (a) => String(a?.assignee_type ?? '').toLowerCase() === 'role',
  );
  const employeeIds = assignees
    .filter((a) => ['employee', 'user'].includes(String(a?.assignee_type ?? '').toLowerCase()))
    .map((a) => String(a?.assignee ?? '').trim())
    .filter(Boolean);
  const assigneeIds =
    employeeIds.length > 0
      ? employeeIds
      : (() => {
          const legacy = String(roleAssignee?.assignee ?? assignees[0]?.assignee ?? '').trim();
          return legacy ? [legacy] : [];
        })();
  const assignee = assigneeIds[0] ?? '';
  const assigneeRoleName = String(roleAssignee?.assignee ?? '').trim();

  const schedule = Array.isArray(item.schedule) ? item.schedule : [];
  const viewType = String(item.view_type ?? '').trim();
  const statusRaw = String(item.status ?? '')
    .trim()
    .toLowerCase();

  return {
    id: item.name,
    apiName: item.name,
    completed: statusRaw === 'active',
    taskName: item.center_task_name || item.name || 'Untitled task',
    floors,
    assignees,
    assigneeIds,
    assignee,
    assigneeRoleName,
    description: String(item.description ?? '').trim(),
    isImageMandatory: resolveRowIsImageMandatory(item),
    viewType,
    schedule,
    checklists: normalizeChecklistsFromApiList(item.checklists),
    tracker_name: item.tracker_name,
    center: item.center,
    photo,
    status: item.status,
  };
};

/** Merge local tracker-tab filters into the persisted `{ byTracker }` shape. */
function buildTrackerFiltersForActiveTab(previous, activeTab, floors, assignees) {
  const previousByTracker = { ...previous?.byTracker };
  const nextFloors = Array.isArray(floors)
    ? floors.map((value) => String(value).trim()).filter(Boolean)
    : [];
  const nextAssignees = Array.isArray(assignees)
    ? assignees.map((value) => String(value).trim()).filter(Boolean)
    : [];

  if (nextFloors.length === 0 && nextAssignees.length === 0) {
    const { [activeTab]: _removed, ...rest } = previousByTracker;
    return { byTracker: rest };
  }

  return {
    byTracker: {
      ...previousByTracker,
      [activeTab]: {
        floors: nextFloors,
        assignees: nextAssignees,
      },
    },
  };
}

const CenterDetailConfigurationTracker = ({ centerId }) => {
  const [activeTab, setActiveTab] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebounce(searchValue, 300);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [trackerFilterTab, setTrackerFilterTab] = useState('floor');
  const [trackerFilterSearch, setTrackerFilterSearch] = useState('');
  const [filterFloors, setFilterFloors] = useState([]);
  const [filterAssignees, setFilterAssignees] = useState([]);
  const [trackerFiltersInitialized, setTrackerFiltersInitialized] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [columns, setColumns] = useState([
    { id: 'taskName', label: 'Task Name', visible: true },
    { id: 'floor', label: 'Floor', visible: true },
    { id: 'assignee', label: 'Assignee', visible: true },
    { id: 'startTime', label: 'Frequency and Start Time', visible: true },
    { id: 'photo', label: 'Photo', visible: true },
  ]);

  const [rows, setRows] = useState([]);
  const rowsRef = useRef(rows);
  const tableWrapperRef = useRef(null);
  const [isTrackerDrawerOpen, setIsTrackerDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('create');
  const [editingRowId, setEditingRowId] = useState(null);
  /** Center task document `name` to load once and prefill create drawer (copy row). */
  const [duplicateFromTaskName, setDuplicateFromTaskName] = useState(null);
  const [deleteConfirmTaskName, setDeleteConfirmTaskName] = useState(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [savingRowId, setSavingRowId] = useState(null);

  const [isManageOpen, setIsManageOpen] = useState(false);
  const [manageTrackers, setManageTrackers] = useState([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [togglingTracker, setTogglingTracker] = useState(null);
  const [managePrefMap, setManagePrefMap] = useState({});
  const activeTabStorageKey = useMemo(
    () => getCenterTrackerActiveTabStorageKey(centerId),
    [centerId],
  );

  // Persist Configuration tab's filter dropdown selections in sessionStorage
  // (mirrors Center > Landlords). Selections are nested per-tracker so each
  // sub-tab keeps its own Floor/Assignee picks across reloads & navigations.
  const trackerFiltersStorageKey = useMemo(
    () => getCenterTrackerFiltersStorageKey(centerId),
    [centerId],
  );
  const [persistedTrackerFilters, setPersistedTrackerFilters] = usePersistedFilters({
    storageKey: trackerFiltersStorageKey,
    defaultFilters: DEFAULT_CENTER_TRACKER_FILTERS,
    compactFilters: compactCenterTrackerFiltersForStorage,
  });
  const persistedTrackerFiltersRef = useRef(persistedTrackerFilters);
  persistedTrackerFiltersRef.current = persistedTrackerFilters;

  const dispatch = useDispatch();

  const centerTrackerTabs = useSelector(
    (state) => state.centerTracker.centerTrackerTabs?.data?.message?.results,
  );

  const taskListState = useSelector((state) => state.centerTracker.centerTrackerTaskList);

  const floorByCenter = useSelector((state) => state.centerTracker.floorByCenter?.data);

  const floorOptions = useMemo(
    () =>
      (Array.isArray(floorByCenter) ? floorByCenter : []).map((opt) => ({
        value: opt.floor,
        label: opt.floor,
      })),
    [floorByCenter],
  );

  const teamMembersByRole = useSelector(
    (state) => state.centerTracker.teamMembersByRole?.byRole ?? {},
  );
  const allMembersAtCenter = useSelector(
    (state) => state.centerTracker.teamMembersByRole?.allMembers ?? [],
  );

  const distinctAssigneeRoles = useMemo(
    () =>
      [...new Set(rows.map((r) => String(r.assigneeRoleName ?? '').trim()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [rows],
  );

  const distinctAssigneeRolesKey = useMemo(
    () => JSON.stringify(distinctAssigneeRoles),
    [distinctAssigneeRoles],
  );

  useEffect(() => {
    if (!centerId) return;
    dispatch(
      fetchAssociatedTeamMembersForRolesThunk({
        center: centerId,
        roles: [],
      }),
    );
  }, [centerId, dispatch]);

  useEffect(() => {
    if (!centerId) return;
    let roles;
    try {
      roles = JSON.parse(distinctAssigneeRolesKey);
    } catch {
      roles = [];
    }
    if (!Array.isArray(roles) || roles.length === 0) return;
    dispatch(
      fetchAssociatedTeamMembersForRolesThunk({
        center: centerId,
        roles,
      }),
    );
  }, [centerId, distinctAssigneeRolesKey, dispatch]);

  const allAssigneePickerOptions = useMemo(() => {
    if (Array.isArray(allMembersAtCenter) && allMembersAtCenter.length > 0) {
      const map = new Map();
      allMembersAtCenter.forEach((o) => {
        if (o?.value) map.set(String(o.value), o);
      });
      return [...map.values()];
    }
    const map = new Map();
    Object.values(teamMembersByRole || {}).forEach((list) => {
      (Array.isArray(list) ? list : []).forEach((o) => {
        if (o?.value) map.set(String(o.value), o);
      });
    });
    return [...map.values()];
  }, [teamMembersByRole, allMembersAtCenter]);

  const getAssigneeOptionsForRow = useCallback(
    (row) => {
      const role = String(row.assigneeRoleName ?? '').trim();
      const fromRole = role && teamMembersByRole[role]?.length ? teamMembersByRole[role] : null;
      if (fromRole) return fromRole;
      return allAssigneePickerOptions;
    },
    [teamMembersByRole, allAssigneePickerOptions],
  );

  const trackerFilterOptions = useMemo(() => {
    const base = trackerFilterTab === 'floor' ? floorOptions : allAssigneePickerOptions;
    const query = trackerFilterSearch.trim().toLowerCase();
    if (!query) return base;
    return base.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        String(option.value).toLowerCase().includes(query),
    );
  }, [trackerFilterTab, floorOptions, allAssigneePickerOptions, trackerFilterSearch]);
  const trackerFilterSelectedValues = useMemo(
    () =>
      (trackerFilterTab === 'floor' ? filterFloors : filterAssignees).map((value) => String(value)),
    [trackerFilterTab, filterFloors, filterAssignees],
  );
  const trackerListFilters = useMemo(() => {
    const tuples = [];
    if (filterFloors.length === 1) {
      tuples.push(['floor', '=', filterFloors[0]]);
    } else if (filterFloors.length > 1) {
      tuples.push(['floor', 'in', filterFloors]);
    }
    if (filterAssignees.length > 0) {
      if (filterAssignees.length === 1) {
        tuples.push(['assignee', '=', filterAssignees[0]]);
      } else {
        tuples.push(['assignee', 'in', filterAssignees]);
      }
    }
    return tuples;
  }, [filterFloors, filterAssignees]);
  // Stable string so empty `[]` does not retrigger list fetch via new array identity.
  const trackerListFiltersKey = useMemo(
    () => JSON.stringify(trackerListFilters),
    [trackerListFilters],
  );
  const appliedTrackerFilterCount = useMemo(
    () => Number(filterFloors.length > 0) + Number(filterAssignees.length > 0),
    [filterFloors.length, filterAssignees.length],
  );
  const handleFilterFloorToggle = useCallback((value) => {
    const normalized = String(value ?? '').trim();
    if (!normalized) return;
    setFilterFloors((previous) =>
      previous.includes(normalized)
        ? previous.filter((item) => item !== normalized)
        : [...previous, normalized],
    );
  }, []);
  const handleFilterAssigneeToggle = useCallback((value) => {
    const normalized = String(value ?? '').trim();
    if (!normalized) return;
    setFilterAssignees((previous) =>
      previous.includes(normalized)
        ? previous.filter((item) => item !== normalized)
        : [...previous, normalized],
    );
  }, []);
  const handleTrackerFilterClear = useCallback(() => {
    setFilterFloors([]);
    setFilterAssignees([]);
    setTrackerFilterSearch('');
  }, []);
  const handleTrackerFilterToggle = useCallback(
    (value) => {
      if (trackerFilterTab === 'floor') {
        handleFilterFloorToggle(value);
      } else {
        handleFilterAssigneeToggle(value);
      }
    },
    [trackerFilterTab, handleFilterFloorToggle, handleFilterAssigneeToggle],
  );

  // Restore Floor / Assignee picks before the list-fetch effect (useLayoutEffect)
  // so we do not fire page-1 twice with the same payload on tab change.
  useLayoutEffect(() => {
    if (!activeTab || !trackerFiltersStorageKey) {
      setFilterFloors([]);
      setFilterAssignees([]);
      setTrackerFiltersInitialized(false);
      return;
    }

    const bucket = readTrackerBucket(persistedTrackerFiltersRef.current, activeTab);
    setFilterFloors(bucket.floors);
    setFilterAssignees(bucket.assignees);
    setTrackerFilterSearch('');
    setTrackerFiltersInitialized(true);
  }, [activeTab, trackerFiltersStorageKey]);

  // Mirror local filter state into sessionStorage (Landlords / Events Micro pattern).
  useEffect(() => {
    if (!activeTab || !trackerFiltersStorageKey || !trackerFiltersInitialized) return;

    const nextFilters = buildTrackerFiltersForActiveTab(
      persistedTrackerFilters,
      activeTab,
      filterFloors,
      filterAssignees,
    );
    const nextCompact = compactCenterTrackerFiltersForStorage(nextFilters);
    const currentCompact = compactCenterTrackerFiltersForStorage(persistedTrackerFilters);

    if (JSON.stringify(nextCompact) !== JSON.stringify(currentCompact)) {
      setPersistedTrackerFilters({
        ...DEFAULT_CENTER_TRACKER_FILTERS,
        ...(Object.keys(nextCompact).length > 0 ? nextCompact : {}),
      });
    }
  }, [
    activeTab,
    trackerFiltersStorageKey,
    trackerFiltersInitialized,
    filterFloors,
    filterAssignees,
    persistedTrackerFilters,
    setPersistedTrackerFilters,
  ]);

  useEffect(() => {
    setTrackerFilterSearch('');
  }, [trackerFilterTab]);

  const activeTrackerMeta = useMemo(
    () => centerTrackerTabs?.find((t) => t.name === activeTab),
    [centerTrackerTabs, activeTab],
  );
  const scheduleColumnLabel = 'Schedule';
  const trackerTabsForRender = useMemo(() => {
    // Redux already keeps Active + enabled_for_center only.
    // List prefs control order (and Manage order), not whether the tab exists.
    const baseTabs = Array.isArray(centerTrackerTabs) ? centerTrackerTabs : [];
    const withMeta = baseTabs.map((tracker, index) => {
      const pref = managePrefMap[getTrackerPrefId(tracker?.name)];
      return {
        ...tracker,
        _order: pref?.order ?? index + 1,
      };
    });
    return withMeta
      .sort((a, b) => {
        const ao = Number(a._order) || Number.MAX_SAFE_INTEGER;
        const bo = Number(b._order) || Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return String(a?.name ?? '').localeCompare(String(b?.name ?? ''));
      })
      .map(({ _order, ...tracker }) => tracker);
  }, [centerTrackerTabs, managePrefMap]);
  const maxVisibleTrackerTabs = 4;
  const { visibleTrackerTabs, overflowTrackerTabs } = useMemo(() => {
    const tabs = trackerTabsForRender;
    if (tabs.length <= maxVisibleTrackerTabs) {
      return { visibleTrackerTabs: tabs, overflowTrackerTabs: [] };
    }
    const activeIndex = tabs.findIndex((t) => t.name === activeTab);
    const visible = tabs.slice(0, maxVisibleTrackerTabs);
    if (activeIndex >= maxVisibleTrackerTabs) {
      visible[maxVisibleTrackerTabs - 1] = tabs[activeIndex];
    }
    const visibleSet = new Set(visible.map((t) => t.name));
    const overflow = tabs.filter((t) => !visibleSet.has(t.name));
    return { visibleTrackerTabs: visible, overflowTrackerTabs: overflow };
  }, [trackerTabsForRender, activeTab]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visibleColumns = columns.filter((c) => c.visible);

  const applyManagePrefs = useCallback((trackers, prefMap) => {
    const list = Array.isArray(trackers) ? trackers : [];
    const map = prefMap && typeof prefMap === 'object' ? prefMap : {};
    const withMeta = list.map((tracker, index) => {
      const pref = map[getTrackerPrefId(tracker?.name)];
      return {
        ...tracker,
        visible: pref ? Boolean(pref.visible) : true,
        _order: pref?.order ?? index + 1,
      };
    });
    return withMeta
      .sort((a, b) => {
        const ao = Number(a._order) || Number.MAX_SAFE_INTEGER;
        const bo = Number(b._order) || Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return String(a?.name ?? '').localeCompare(String(b?.name ?? ''));
      })
      .map(({ _order, ...tracker }) => tracker);
  }, []);

  const saveManageListPref = useCallback(
    async (trackers) => {
      if (!centerId) return;
      const allTrackers = Array.isArray(trackers) ? trackers : [];
      await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: CENTER_TRACKER_LIST_PREF_DOCTYPE,
        react_table_id: getCenterTrackerReactTableId(centerId),
        columns: allTrackers.map((tracker, index) => ({
          id: getTrackerPrefId(tracker?.name),
          visible: tracker?.visible !== false,
          order: index + 1,
          label: getTrackerDisplayLabel(tracker?.name),
        })),
      });
    },
    [centerId],
  );

  const fetchManagePrefMap = useCallback(async () => {
    if (!centerId) {
      setManagePrefMap({});
      return;
    }
    try {
      const response = await apiClient.post('/method/devx.api.listview.get_list_pref', {
        doctype: CENTER_TRACKER_LIST_PREF_DOCTYPE,
        react_table_id: getCenterTrackerReactTableId(centerId),
      });
      const prefRows = response?.data?.message;
      const prefMap = Array.isArray(prefRows)
        ? prefRows.reduce((acc, row) => {
            const id = String(row?.id ?? '').trim();
            if (id) acc[id] = row;
            return acc;
          }, {})
        : {};
      setManagePrefMap(prefMap);
    } catch {
      // Silent: tracker tabs can still render with backend defaults.
    }
  }, [centerId]);

  const fetchManageTrackers = useCallback(async () => {
    if (!centerId) return;
    setManageLoading(true);
    try {
      const [trackerResponse, prefResponse] = await Promise.all([
        apiClient.post(
          `/method/devx.tracker.api.api_center_tracker_task.get_trackers_by_center?center_id=${encodeURIComponent(
            centerId,
          )}&include_disabled=1`,
        ),
        apiClient.post('/method/devx.api.listview.get_list_pref', {
          doctype: CENTER_TRACKER_LIST_PREF_DOCTYPE,
          react_table_id: getCenterTrackerReactTableId(centerId),
        }),
      ]);
      const results = trackerResponse?.data?.message?.results;
      const prefRows = prefResponse?.data?.message;
      const prefMap = Array.isArray(prefRows)
        ? prefRows.reduce((acc, row) => {
            const id = String(row?.id ?? '').trim();
            if (id) acc[id] = row;
            return acc;
          }, {})
        : {};
      setManagePrefMap(prefMap);
      const withEnabled = (Array.isArray(results) ? results : []).map((tracker) => ({
        ...tracker,
        // Per-center enable flag drives the switch (not list-pref / global status).
        visible:
          tracker?.enabled_for_center == null ? true : Boolean(Number(tracker.enabled_for_center)),
      }));
      const ordered = applyManagePrefs(withEnabled, prefMap).map((tracker) => ({
        ...tracker,
        visible:
          tracker?.enabled_for_center == null
            ? tracker.visible !== false
            : Boolean(Number(tracker.enabled_for_center)),
      }));
      setManageTrackers(ordered);
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    } finally {
      setManageLoading(false);
    }
  }, [applyManagePrefs, centerId]);

  const handleManageOpenChange = (open) => {
    setIsManageOpen(open);
    if (open) fetchManageTrackers();
  };

  const handleTrackerToggle = async (trackerName, nextChecked) => {
    setTogglingTracker(trackerName);
    const previousTrackers = manageTrackers;
    const nextTrackers = previousTrackers.map((t) =>
      t.name === trackerName
        ? {
            ...t,
            visible: Boolean(nextChecked),
            enabled_for_center: nextChecked ? 1 : 0,
          }
        : t,
    );
    setManageTrackers(nextTrackers);
    try {
      // Per-center only — does not set Tracker Master Inactive globally.
      await apiClient.post(
        '/method/devx.tracker.api.api_center_tracker_task.set_tracker_enabled_for_center',
        {
          tracker_name: trackerName,
          center_id: centerId,
          enabled: nextChecked ? 1 : 0,
        },
      );
      await saveManageListPref(nextTrackers);
      setManagePrefMap((previous) => {
        const next = { ...previous };
        nextTrackers.forEach((tracker) => {
          const prefId = getTrackerPrefId(tracker?.name);
          const trackerIndex = nextTrackers.findIndex((item) => item.name === tracker.name);
          next[prefId] = {
            ...next[prefId],
            id: prefId,
            visible: tracker?.visible !== false,
            order: trackerIndex >= 0 ? trackerIndex + 1 : Number.MAX_SAFE_INTEGER,
            label: getTrackerDisplayLabel(tracker?.name),
          };
        });
        return next;
      });
      dispatch(fetchCenterTrackerTabsThunk(centerId));
    } catch (error) {
      setManageTrackers(previousTrackers);
      showErrorToast(extractErrorMessage(error));
    } finally {
      setTogglingTracker(null);
    }
  };

  useEffect(() => {
    dispatch(fetchCenterTrackerTabsThunk(centerId));
  }, [centerId, dispatch]);

  useEffect(() => {
    fetchManagePrefMap();
  }, [fetchManagePrefMap]);

  useEffect(() => {
    if (!centerId) return;
    dispatch(fetchFloorByCenterThunk(centerId));
  }, [centerId, dispatch]);

  useEffect(() => {
    if (!trackerTabsForRender?.length) return;
    setActiveTab((previous) => {
      let persistedTab = '';
      if (typeof window !== 'undefined' && activeTabStorageKey) {
        try {
          persistedTab = String(window.localStorage.getItem(activeTabStorageKey) ?? '').trim();
        } catch {
          persistedTab = '';
        }
      }
      if (persistedTab && trackerTabsForRender.some((t) => t.name === persistedTab)) {
        return persistedTab;
      }
      if (previous && trackerTabsForRender.some((t) => t.name === previous)) return previous;
      return trackerTabsForRender[0].name;
    });
  }, [trackerTabsForRender, activeTabStorageKey]);

  useEffect(() => {
    if (!activeTab || !activeTabStorageKey || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(activeTabStorageKey, activeTab);
    } catch {
      // Silent: inability to persist should not block tab switching.
    }
  }, [activeTab, activeTabStorageKey]);

  const listFetchKeyRef = useRef('');
  const [scrollContainerEl, setScrollContainerEl] = useState(null);

  useEffect(() => {
    if (!centerId || !activeTab || !trackerFiltersInitialized) return;

    const fetchKey = [
      centerId,
      activeTab,
      debouncedSearch.trim(),
      trackerListFiltersKey,
      'page:1',
    ].join('|');
    if (listFetchKeyRef.current === fetchKey) return;
    listFetchKeyRef.current = fetchKey;

    dispatch(
      fetchCenterTrackerTaskListThunk({
        center: centerId,
        tracker: activeTab,
        keyword: debouncedSearch.trim(),
        filters: trackerListFilters,
        page: 1,
        limit_page_length: 20,
        append: false,
      }),
    );
  }, [
    centerId,
    activeTab,
    debouncedSearch,
    trackerListFilters,
    trackerListFiltersKey,
    trackerFiltersInitialized,
    dispatch,
  ]);

  useEffect(() => {
    // Configuration must list every center task (including empty checklists).
    // Checklist visibility filtering belongs to facility execution views only.
    setRows((taskListState.data || []).map(mapApiTaskToRow));
  }, [taskListState.data]);

  const handleLoadMore = useCallback(() => {
    if (
      !centerId ||
      !activeTab ||
      !taskListState.hasMore ||
      taskListState.isLoadingMore ||
      taskListState.isLoading
    ) {
      return;
    }
    dispatch(
      fetchCenterTrackerTaskListThunk({
        center: centerId,
        tracker: activeTab,
        keyword: debouncedSearch.trim(),
        filters: trackerListFilters,
        page: (taskListState.page || 1) + 1,
        limit_page_length: taskListState.pageSize || 20,
        append: true,
      }),
    );
  }, [
    activeTab,
    centerId,
    debouncedSearch,
    dispatch,
    trackerListFilters,
    taskListState.hasMore,
    taskListState.isLoading,
    taskListState.isLoadingMore,
    taskListState.page,
    taskListState.pageSize,
  ]);

  // Same scroll-parent discovery as Center Space tab (drawer overflow container).
  useLayoutEffect(() => {
    const next = tableWrapperRef.current ? findScrollableParent(tableWrapperRef.current) : null;
    setScrollContainerEl(next || null);
  }, [rows.length, taskListState.isLoading, taskListState.isLoadingMore, activeTab]);

  const { sentinelRef } = useScrollPagination({
    onLoadMore: handleLoadMore,
    hasMore: taskListState.hasMore,
    isLoading: taskListState.isLoadingMore || taskListState.isLoading,
    threshold: 200,
    scrollContainer: scrollContainerEl,
    enabled: Boolean(centerId && activeTab && scrollContainerEl && taskListState.hasMore),
  });

  const handleRowChange = (id, patch) => {
    setRows((previous) => previous.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handlePersistRow = useCallback(
    async (rowId, patch) => {
      const previous = rowsRef.current.find((r) => r.id === rowId);
      if (!previous?.apiName || !centerId || !activeTab) return;

      setSavingRowId(rowId);
      try {
        const merged = { ...previous, ...patch };
        const patchKeys = Object.keys(patch ?? {});
        if (patch.assigneeIds !== undefined) {
          const ids = Array.isArray(patch.assigneeIds)
            ? patch.assigneeIds.map((id) => String(id).trim()).filter(Boolean)
            : [];
          merged.assigneeIds = ids;
          merged.assignee = ids[0] ?? '';
          merged.assignees = buildTrackerAssigneeRows(ids, allAssigneePickerOptions);
        }
        const assigneeOnlyPatch =
          patchKeys.length > 0 && patchKeys.every((k) => k === 'assigneeIds');
        const completedOnlyPatch =
          patchKeys.length > 0 && patchKeys.every((k) => k === 'completed');

        let payload;
        if (assigneeOnlyPatch) {
          const ids = Array.isArray(merged.assigneeIds)
            ? merged.assigneeIds.map((id) => String(id).trim()).filter(Boolean)
            : [];
          payload = {
            assignees: buildTrackerAssigneeRows(ids, allAssigneePickerOptions),
          };
        } else if (completedOnlyPatch) {
          payload = {
            status: patch.completed ? 'Active' : 'Inactive',
          };
        } else {
          const data = centerTaskRowToFormData(merged);
          const vtLower = String(merged.viewType ?? '').toLowerCase();
          payload = buildCenterTrackerTaskPayload({
            data,
            trackerName: activeTab,
            viewType: merged.viewType,
            centerId,
            isDaily: vtLower === 'daily',
            isWeekly: vtLower === 'weekly',
            isMonthly: vtLower === 'monthly',
            isAnnually: vtLower === 'annually',
            assigneeOptions: allAssigneePickerOptions,
          });
        }

        await apiClient.put(
          `/resource/Center Tracker Task/${encodeURIComponent(merged.apiName)}`,
          payload,
        );
        showSuccessToast('Task updated');
        await dispatch(
          fetchCenterTrackerTaskListThunk({
            center: centerId,
            tracker: activeTab,
            keyword: debouncedSearch.trim(),
            filters: trackerListFilters,
            page: 1,
            limit_page_length: 20,
            append: false,
          }),
        );
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      } finally {
        setSavingRowId(null);
      }
    },
    [activeTab, centerId, debouncedSearch, trackerListFilters, dispatch, allAssigneePickerOptions],
  );

  const handleRequestDeleteTask = (taskName) => {
    setDeleteConfirmTaskName(taskName);
  };

  const handleConfirmDeleteTask = async () => {
    if (!deleteConfirmTaskName) return;
    setIsDeletingTask(true);
    try {
      await apiClient.delete(
        `/resource/Center Tracker Task/${encodeURIComponent(deleteConfirmTaskName)}`,
      );
      showSuccessToast('Task removed');
      setDeleteConfirmTaskName(null);
      await dispatch(
        fetchCenterTrackerTaskListThunk({
          center: centerId,
          tracker: activeTab,
          keyword: debouncedSearch.trim(),
          filters: trackerListFilters,
          page: 1,
          limit_page_length: 20,
          append: false,
        }),
      );
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleUploadFiles = async (rowId, files) => {
    if (!files || files.length === 0) return;
    const row = rowsRef.current.find((r) => r.id === rowId);
    if (!row?.apiName) return;

    const nextImages = [...files].map((file) => ({
      id: createId(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setRows((previous) =>
      previous.map((r) =>
        r.id === rowId ? { ...r, photo: [...(r.photo ?? []), ...nextImages] } : r,
      ),
    );

    setSavingRowId(rowId);
    try {
      await uploadCenterTrackerTaskPhotos(row.apiName, files);
      showSuccessToast('Photos uploaded');
      await dispatch(
        fetchCenterTrackerTaskListThunk({
          center: centerId,
          tracker: activeTab,
          keyword: debouncedSearch.trim(),
          filters: trackerListFilters,
          page: 1,
          limit_page_length: 20,
          append: false,
        }),
      );
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
      setRows((previous) => previous.map((r) => (r.id === rowId ? row : r)));
    } finally {
      setSavingRowId(null);
    }
  };

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    return () => {
      rowsRef.current.forEach((row) => {
        (row.photo ?? []).forEach((image) => {
          if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
        });
      });
    };
  }, []);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setRows((previous) => {
      const oldIndex = previous.findIndex((r) => r.id === active.id);
      const newIndex = previous.findIndex((r) => r.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return previous;
      return arrayMove(previous, oldIndex, newIndex);
    });
  };

  const handleManageDragEnd = useCallback(
    async (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const previousTrackers = manageTrackers;
      const oldIndex = previousTrackers.findIndex((t) => t.name === active.id);
      const newIndex = previousTrackers.findIndex((t) => t.name === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(previousTrackers, oldIndex, newIndex);
      setManageTrackers(reordered);
      try {
        await saveManageListPref(reordered);
        setManagePrefMap((previous) => {
          const next = { ...previous };
          reordered.forEach((tracker) => {
            const prefId = getTrackerPrefId(tracker?.name);
            const trackerIndex = reordered.findIndex((item) => item.name === tracker.name);
            next[prefId] = {
              ...next[prefId],
              id: prefId,
              visible: tracker?.visible !== false,
              order: trackerIndex >= 0 ? trackerIndex + 1 : Number.MAX_SAFE_INTEGER,
              label: getTrackerDisplayLabel(tracker?.name),
            };
          });
          return next;
        });
      } catch (error) {
        setManageTrackers(previousTrackers);
        showErrorToast(extractErrorMessage(error));
      }
    },
    [manageTrackers, saveManageListPref],
  );

  const manageTrackersForRender = useMemo(
    () => applyManagePrefs(manageTrackers, managePrefMap),
    [applyManagePrefs, managePrefMap, manageTrackers],
  );

  const openCreateDrawer = () => {
    setDuplicateFromTaskName(null);
    setDrawerMode('create');
    setEditingRowId(null);
    setIsTrackerDrawerOpen(true);
  };

  const openEditDrawer = (rowId) => {
    setDuplicateFromTaskName(null);
    setDrawerMode('edit');
    setEditingRowId(rowId);
    setIsTrackerDrawerOpen(true);
  };

  const openDuplicateDrawer = (taskDocName) => {
    const name = String(taskDocName ?? '').trim();
    if (!name) return;
    setDuplicateFromTaskName(name);
    setDrawerMode('create');
    setEditingRowId(null);
    setIsTrackerDrawerOpen(true);
  };

  const tableColSpan = 2 + visibleColumns.length;

  return (
    <div className='flex w-full flex-col'>
      <div className='w-full flex items-center gap-2'>
        <div className='w-full bg-bg-weak-100 flex h-10 p-1 flex items-center justify-start border-1 border-stroke-soft-200 rounded-lg gap-1 min-w-0'>
          {visibleTrackerTabs.map((item) => (
            <button
              key={item.name}
              type='button'
              onClick={() => setActiveTab(item?.name)}
              className={`px-3 hover:cursor-pointer truncate ${activeTab == item?.name ? 'bg-white border border-stroke-soft-200 rounded-md text-[var(--color-text-main-900)]' : 'text-[var(--color-text-soft-400)]'} label-small py-1`}
            >
              {item?.tracker_name}
            </button>
          ))}
          {overflowTrackerTabs.length > 0 ? (
            <Popover.Root>
              <Popover.Trigger asChild>
                <button
                  type='button'
                  className='px-3 py-1 rounded-md label-small text-text-soft-400 hover:bg-white hover:border hover:border-stroke-soft-200'
                >
                  More
                </button>
              </Popover.Trigger>
              <Popover.Content align='start' sideOffset={8} className='w-[240px] p-2'>
                <div className='flex flex-col gap-1 max-h-[280px] overflow-y-auto'>
                  {overflowTrackerTabs.map((tracker) => (
                    <button
                      key={tracker.name}
                      type='button'
                      onClick={() => setActiveTab(tracker.name)}
                      className='w-full text-left px-2.5 py-2 rounded-lg paragraph-small text-text-main-900 hover:bg-bg-weak-50'
                    >
                      {tracker.tracker_name}
                    </button>
                  ))}
                </div>
              </Popover.Content>
            </Popover.Root>
          ) : null}
        </div>

        <Popover.Root open={isManageOpen} onOpenChange={handleManageOpenChange}>
          <Popover.Trigger asChild>
            <Button.Root size='medium' className='flex gap-2' variant='neutral' mode='stroke'>
              <Button.Icon as={RiSettings3Line} className='w-4 h-4' />
              Manage
            </Button.Root>
          </Popover.Trigger>
          <Popover.Content align='end' sideOffset={8} className='w-[300px] p-0'>
            <div className='px-4 py-3 border-b border-stroke-soft-200'>
              <p className='label-small font-medium text-text-main-900'>Manage Trackers</p>
            </div>
            <div className='flex flex-col gap-2 p-3 max-h-[360px] overflow-y-auto'>
              {manageLoading ? (
                <div className='py-6 text-center paragraph-small text-text-sub-600'>Loading…</div>
              ) : manageTrackersForRender.length === 0 ? (
                <div className='py-6 text-center paragraph-small text-text-sub-600'>
                  No trackers found.
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleManageDragEnd}
                >
                  <SortableContext
                    items={manageTrackersForRender.map((tracker) => tracker.name)}
                    strategy={verticalListSortingStrategy}
                  >
                    {manageTrackersForRender.map((tracker) => (
                      <ManageTrackerItem
                        key={tracker.name}
                        tracker={tracker}
                        togglingTracker={togglingTracker}
                        onToggle={handleTrackerToggle}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </Popover.Content>
        </Popover.Root>
      </div>

      <div className='w-full mt-6 flex flex-col gap-3'>
        <div className='w-full flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <Input.Root className='w-full lg:w-[340px]' size='small'>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} className='size-5' />
              <Input.Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder='Search tasks'
                aria-label='Search tasks'
              />
            </Input.Wrapper>
          </Input.Root>

          <div className='flex flex-wrap items-center gap-3'>
            <Popover.Root open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <Filter.TriggerButton
                filterCount={appliedTrackerFilterCount}
                tooltipContent='Filter'
                ariaLabel='Filter tasks'
                onClear={(event) => {
                  event?.stopPropagation?.();
                  handleTrackerFilterClear();
                  setIsFilterOpen(false);
                }}
              />
              {isFilterOpen ? (
                <Filter.Root
                  align='end'
                  side='bottom'
                  sideOffset={8}
                  className='w-auto max-w-[min(480px,calc(100vw-24px))]'
                  onInteractOutside={() => setIsFilterOpen(false)}
                  onEscapeKeyDown={() => setIsFilterOpen(false)}
                >
                  <Filter.Header title='FILTERS' onClear={handleTrackerFilterClear} />
                  <Filter.Body>
                    <Filter.Sidebar width='180px'>
                      <TabMenuVertical.Root
                        value={trackerFilterTab}
                        onValueChange={setTrackerFilterTab}
                      >
                        <TabMenuVertical.List className='p-2 border-r-0'>
                          <TabMenuVertical.Trigger
                            className='w-full flex items-center justify-between'
                            value='floor'
                          >
                            Floor
                            {filterFloors.length > 0 ? (
                              <Badge.Root
                                size='medium'
                                variant='filled'
                                className='shrink-0 rounded-full bg-black'
                              >
                                {filterFloors.length}
                              </Badge.Root>
                            ) : (
                              <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                            )}
                          </TabMenuVertical.Trigger>
                          <TabMenuVertical.Trigger
                            className='w-full flex items-center justify-between'
                            value='assignee'
                          >
                            Assignee
                            {filterAssignees.length > 0 ? (
                              <Badge.Root
                                size='medium'
                                variant='filled'
                                className='shrink-0 rounded-full bg-black'
                              >
                                {filterAssignees.length}
                              </Badge.Root>
                            ) : (
                              <TabMenuVertical.ArrowIcon as={RiArrowRightSLine} />
                            )}
                          </TabMenuVertical.Trigger>
                        </TabMenuVertical.List>
                      </TabMenuVertical.Root>
                    </Filter.Sidebar>
                    <Filter.Content width='300px'>
                      <Filter.List
                        options={trackerFilterOptions.map((option) => ({
                          ...option,
                          value: String(option.value ?? ''),
                          label: option.label ?? String(option.value ?? ''),
                        }))}
                        selectedValues={trackerFilterSelectedValues}
                        onToggle={handleTrackerFilterToggle}
                        searchValue={trackerFilterSearch}
                        onSearchChange={setTrackerFilterSearch}
                        virtualized={false}
                        emptyMessage={
                          trackerFilterTab === 'floor' ? 'No floors found' : 'No assignees found'
                        }
                      />
                    </Filter.Content>
                  </Filter.Body>
                </Filter.Root>
              ) : null}
            </Popover.Root>

            <ColumnManagerDropdown
              open={isColumnManagerOpen}
              onOpenChange={setIsColumnManagerOpen}
              columns={columns}
              onToggleVisibility={(columnId) => {
                setColumns((previous) =>
                  previous.map((c) => (c.id === columnId ? { ...c, visible: !c.visible } : c)),
                );
              }}
              onReorder={(oldIndex, newIndex) => {
                setColumns((previous) => {
                  const next = [...previous];
                  const [moved] = next.splice(oldIndex, 1);
                  next.splice(newIndex, 0, moved);
                  return next;
                });
              }}
              onShowAll={() =>
                setColumns((previous) => previous.map((c) => ({ ...c, visible: true })))
              }
              onHideAll={() =>
                setColumns((previous) => previous.map((c) => ({ ...c, visible: false })))
              }
              tooltipContent={<p>Dynamic Columns</p>}
              trigger={
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='small'
                  className='gap-1'
                >
                  <Button.Icon as={RiLayoutColumnLine} className='size-5 text-text-sub-600' />
                </Button.Root>
              }
            />

            <Button.Root onClick={openCreateDrawer} size='small' className='gap-1'>
              <Button.Icon as={RiAddLine} className='size-5' />
              Add Task
            </Button.Root>
          </div>
        </div>
      </div>

      <div className='w-full mt-4' ref={tableWrapperRef}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Table.Root variant='compact'>
            <Table.Header>
              <Table.Row>
                <Table.Head className='w-[52px]'>
                  <Checkbox.Root
                    checked={rows.length > 0 && rows.every((r) => r.completed)}
                    onCheckedChange={(checked) => {
                      const next = Boolean(checked);
                      setRows((previous) => previous.map((r) => ({ ...r, completed: next })));
                    }}
                  />
                </Table.Head>
                {visibleColumns.some((c) => c.id === 'taskName') && (
                  <Table.Head>Task Name</Table.Head>
                )}
                {visibleColumns.some((c) => c.id === 'floor') && <Table.Head>Floor</Table.Head>}
                {visibleColumns.some((c) => c.id === 'assignee') && (
                  <Table.Head>Assignee</Table.Head>
                )}
                {visibleColumns.some((c) => c.id === 'startTime') && (
                  <Table.Head>{scheduleColumnLabel}</Table.Head>
                )}
                {visibleColumns.some((c) => c.id === 'photo') && <Table.Head>Photo</Table.Head>}
                <Table.Head className='w-[56px] text-right' />
              </Table.Row>
            </Table.Header>

            <Table.Body spacing={8}>
              {taskListState.isLoading && rows.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={tableColSpan} className='py-10 text-center'>
                    <span className='paragraph-small text-text-sub-600'>Loading tasks…</span>
                  </Table.Cell>
                </Table.Row>
              ) : null}
              {!taskListState.isLoading && rows.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={tableColSpan} className='py-10 text-center'>
                    <span className='paragraph-small text-text-sub-600'>No tasks found</span>
                  </Table.Cell>
                </Table.Row>
              ) : null}
              {rows.length > 0 ? (
                <SortableContext
                  items={rows.map((r) => r.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {rows.map((row, index, array) => (
                    <React.Fragment key={row.id}>
                      <SortableRow
                        row={row}
                        onChange={handleRowChange}
                        onRequestDelete={handleRequestDeleteTask}
                        onUploadFiles={handleUploadFiles}
                        onOpenEditDrawer={openEditDrawer}
                        onOpenDuplicateDrawer={openDuplicateDrawer}
                        floorOptions={floorOptions}
                        assigneeOptions={getAssigneeOptionsForRow(row)}
                        onPersistRow={handlePersistRow}
                        isRowSaving={savingRowId === row.id}
                      />
                      {index < array.length - 1 && <Table.RowDivider />}
                    </React.Fragment>
                  ))}
                </SortableContext>
              ) : null}
              {taskListState.hasMore ? (
                <Table.Row ref={sentinelRef} data-scroll-sentinel>
                  <Table.Cell colSpan={tableColSpan} className='h-1 p-0' />
                </Table.Row>
              ) : null}
              {taskListState.isLoadingMore ? (
                <Table.Row>
                  <Table.Cell colSpan={tableColSpan} className='py-4 text-center'>
                    <span className='paragraph-small text-text-sub-600'>Loading more…</span>
                  </Table.Cell>
                </Table.Row>
              ) : null}
            </Table.Body>
          </Table.Root>
        </DndContext>

        <CreateTrackerTaskDrawer
          centerId={centerId}
          trackerName={activeTab}
          viewType={activeTrackerMeta?.view_type}
          open={isTrackerDrawerOpen}
          onClose={() => {
            setDuplicateFromTaskName(null);
            setIsTrackerDrawerOpen(false);
          }}
          mode={drawerMode}
          source='tracker-center'
          assigneeOptions={allAssigneePickerOptions}
          editingTaskName={drawerMode === 'edit' ? editingRowId : undefined}
          duplicateFromTaskName={duplicateFromTaskName || undefined}
          onSubmit={async () => {
            await dispatch(
              fetchCenterTrackerTaskListThunk({
                center: centerId,
                tracker: activeTab,
                keyword: debouncedSearch.trim(),
                filters: trackerListFilters,
                page: 1,
                limit_page_length: 20,
                append: false,
              }),
            );
          }}
        />

        <Modal.Root
          open={Boolean(deleteConfirmTaskName)}
          onOpenChange={(open) => {
            if (!open && !isDeletingTask) setDeleteConfirmTaskName(null);
          }}
        >
          <Modal.Content className='max-w-[440px]'>
            <Modal.Header
              title='Remove task?'
              description='This will permanently remove the task from this tracker.'
            />
            <Modal.Body>
              <div className='paragraph-small text-text-sub-600'>You can’t undo this action.</div>
            </Modal.Body>
            <Modal.Footer className='justify-end'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='xsmall'
                disabled={isDeletingTask}
                onClick={() => setDeleteConfirmTaskName(null)}
              >
                Cancel
              </Button.Root>
              <Button.Root
                type='button'
                size='xsmall'
                disabled={isDeletingTask}
                onClick={handleConfirmDeleteTask}
              >
                {isDeletingTask ? 'Removing…' : 'Remove'}
              </Button.Root>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      </div>
    </div>
  );
};

export default CenterDetailConfigurationTracker;
