import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarLine,
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiIndeterminateCircleLine,
  RiAlertLine,
  RiInformationLine,
  RiPlaneLine,
  RiPlayFill,
  RiPlayLine,
  RiSearchLine,
  RiTimeLine,
  RiStackLine,
  RiCloseLine,
  RiArrowUpLine,
  RiArrowDownLine,
} from 'react-icons/ri';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDate,
  setDate,
  startOfMonth,
  subMonths,
  subDays,
  parseISO,
  parse,
  isValid,
} from 'date-fns';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import PageLayout from '@/components/page-layout';
import * as Input from '@/components/ui/input';
import * as Dropdown from '@/components/ui/dropdown';
import * as Filter from '@/components/ui/filter';
import * as TabMenuVertical from '@/components/ui/tab-menu-vertical';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Popover from '@/components/ui/popover';
import * as Table from '@/components/ui/table';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import * as Tooltip from '@/components/ui/tooltip';
import * as Select from '@/components/ui/select';
import * as LinkButton from '@/components/ui/link-button';
import TicketStatusDropdown from '@/components/ticket-management/ticket-status-dropdown';
import SupervisorAssigneeMultiSelect from '@/components/ui/supervisor-assignee-multi-select';
import CircularProgress from '@/components/ui/circular-progress';
import AgreementsMonthYearPicker from '@/components/agreements/agreements-month-year-picker';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import {
  DEFAULT_FACILITY_TRACKER_FILTERS,
  FACILITY_FILTER_PERSISTED_KEYS,
  getFacilityTrackerFiltersStorageKey,
  mergeStoredFacilityTrackerFilters,
} from './facility-constants';
import { cn } from '@/utils/cn';
import { formatDateToISO, extractYear } from '@/utils/date-utils';
import { centerTrackerTaskHasVisibleChecklists } from '@/utils/center-tracker-task-payload';
import {
  clearFacilityMyTaskList,
  clearSubmitMyTaskChecklistState,
  clearFacilityTrackerTaskDetail,
  clearFacilityTrackerTaskList,
  clearFacilityTaskComments,
  fetchFacilityMyTaskListviewThunk,
  fetchFacilityFloorsThunk,
  fetchFacilitySupervisorsThunk,
  fetchFacilityTrackerCentersThunk,
  fetchFacilityTrackerTabsThunk,
  fetchFacilityTrackerTaskDetailThunk,
  fetchFacilityTrackerTaskListviewThunk,
  fetchFacilityTaskCommentsThunk,
  addFacilityTaskCommentThunk,
  submitFacilityMyTaskChecklistThunk,
  updateFacilityTrackerTaskScheduleThunk,
  selectFacilityTaskComments,
} from '@/redux/facility-tracker-check-slice';
import FacilityTrackerViewDrawer from './facility-tracker-view-drawer';
import UserAbsentSvg from '@/components/ui/user-absent-svg';
import {
  FacilityListWeekToolbar,
  normalizeFacilityWeekStart,
} from '@/components/facility/facility-week-picker';
import { FacilityListYearToolbar } from '@/components/facility/facility-year-picker';
import { toast } from '@/components/ui/toast';
import * as AlertToast from '@/components/ui/toast-alert';
import { TOAST_POSITION } from '@/constants/constants';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';

/** Ensures validation toasts render (same pattern as `showErrorToast` / sonner `custom`). */
const showFacilityTrackerDragError = (message) => {
  toast.custom(
    (t) =>
      React.createElement(AlertToast.Root, {
        t,
        status: 'error',
        variant: 'lighter',
        message,
      }),
    { position: TOAST_POSITION },
  );
};

const WEEK_RANGE_DAYS = 7;
const CHECK_STATES = ['empty', 'present', 'absent'];

const FACILITY_GROUP_BY_OPTIONS = [
  { label: 'Task Status', value: 'status' },
  { label: 'Floor', value: 'floor' },
  { label: 'Assignee', value: 'assignee' },
];

const normalizeFacilityViewTypeKey = (v) =>
  String(v ?? '')
    .trim()
    .toLowerCase()
    .replaceAll(/[\s_-]+/g, '');

const MONTH_NAME_TO_INDEX = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

/** Backend `update_task_schedule.move_to` expects dates as DD-MM-YYYY for weekly view. */
const formatWeeklyMoveToDateForApi = (value) => {
  const s = String(value ?? '').trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  try {
    const d = parseISO(`${s}T12:00:00`);
    if (Number.isNaN(d.getTime())) return '';
    return format(d, 'dd-MM-yyyy');
  } catch {
    return '';
  }
};

const getMoveToValueForFacilityDrop = ({ viewTypeRaw, targetCol }) => {
  const viewType = normalizeFacilityViewTypeKey(viewTypeRaw);
  const key = String(targetCol?.key ?? '').trim();
  const label = String(targetCol?.label ?? '').trim();
  const start = String(targetCol?.start ?? '').trim();

  if (viewType === 'weekly') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return formatWeeklyMoveToDateForApi(key);
    if (/^\d{4}-\d{2}-\d{2}$/.test(start)) return formatWeeklyMoveToDateForApi(start);
    if (/^\d{2}-\d{2}-\d{4}$/.test(key)) return key;
    if (/^\d{2}-\d{2}-\d{4}$/.test(start)) return start;
    return '';
  }

  if (viewType === 'monthly') {
    const source = key || label;
    const match = source.match(/(\d+)/);
    if (!match) return '';
    return String(Number(match[1]));
  }

  if (viewType === 'annually' || viewType === 'annual') {
    if (/^\d+$/.test(key)) {
      const monthNo = Number(key);
      if (monthNo >= 1 && monthNo <= 12) return String(monthNo);
    }

    const lower = (key || label).toLowerCase();
    const token = lower.slice(0, 3);
    const monthFromName = MONTH_NAME_TO_INDEX[lower] ?? MONTH_NAME_TO_INDEX[token];
    if (monthFromName) return String(monthFromName);

    if (/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      const monthFromDate = Number(start.slice(5, 7));
      if (monthFromDate >= 1 && monthFromDate <= 12) return String(monthFromDate);
    }
    return '';
  }

  return '';
};

/** Column header label from listview `periods` + `view_type` (Daily/Weekly → day number; Monthly/Annually → API `key`). */
const formatFacilityPeriodColumnLabel = (period, viewTypeRaw) => {
  const vt = normalizeFacilityViewTypeKey(viewTypeRaw);
  const key = period?.key ?? period?.start;
  const keyString = String(key ?? '');

  if ((vt === 'daily' || vt === 'weekly') && /^\d{4}-\d{2}-\d{2}$/.test(keyString)) {
    try {
      const d = parseISO(`${keyString}T12:00:00`);
      if (!Number.isNaN(d.getTime())) return format(d, 'do');
    } catch {
      /* fall through */
    }
  }

  if (vt === 'monthly' || vt === 'annually' || vt === 'annual') {
    return keyString;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(keyString)) {
    try {
      const d = parseISO(`${keyString}T12:00:00`);
      if (!Number.isNaN(d.getTime())) return format(d, 'do');
    } catch {
      /* ignore */
    }
  }
  return keyString;
};

/** Floor label from listview row (`floor` or common alternate keys / nested floor doc). */
const resolveFacilityTaskFloorLabel = (task) => {
  if (!task || typeof task !== 'object') return '';
  const raw = task.floor ?? task.floor_name;
  if (raw == null || raw === '') return '';
  if (typeof raw === 'object') {
    return String(raw.name ?? raw.floor ?? raw.label ?? '').trim();
  }
  return String(raw).trim();
};

/** Normalize cell status the same way as `FacilityTrackerApiCellIcon` (API may send `complete` vs `completed`, etc.). */
const normalizeFacilityCellStatus = (status) =>
  String(status ?? '')
    .trim()
    .toLowerCase()
    .replaceAll('-', '_')
    .replaceAll(' ', '_');

/** Cells that should open the tracker detail drawer and call the detail API (has meaningful schedule refs). */
const shouldFetchFacilityTaskDetail = (status) => {
  const s = normalizeFacilityCellStatus(status);
  if (s === 'completed' || s === 'complete') return true;
  if (s === 'missed' || s === 'absent') return true;
  if (s === 'partially_completed' || s === 'partial') return true;
  return false;
};

/**
 * List API may expose `task_schedule_ref` on the cell or only inside `schedules[]` (per-slot rows).
 */
const getFacilityCellTaskRefs = (cell) => {
  if (!cell || typeof cell !== 'object') {
    return { taskRef: '', scheduleRef: '' };
  }
  const taskRef = String(cell.task_ref ?? '').trim();
  let scheduleRef = String(cell.task_schedule_ref ?? '').trim();
  if (scheduleRef || !Array.isArray(cell.schedules) || cell.schedules.length === 0) {
    return { taskRef, scheduleRef };
  }
  const cellStatus = normalizeFacilityCellStatus(cell.status);
  const match = cell.schedules.find((row) => {
    const ref = String(row?.task_schedule_ref ?? '').trim();
    if (!ref) return false;
    const rowStatus = normalizeFacilityCellStatus(row?.status);
    return rowStatus === cellStatus;
  });
  const picked = match ?? cell.schedules.find((row) => String(row?.task_schedule_ref ?? '').trim());
  scheduleRef = picked ? String(picked.task_schedule_ref).trim() : '';
  return { taskRef, scheduleRef };
};

/**
 * Stable unique id per tracker table row. Multiple rows often share the same task name or
 * `facility_task_ref`; duplicate `row.id` made drag-over highlight every matching row in a column.
 */
const getStableFacilityTrackerRowId = (task, rowIndex) => {
  let scheduleRef = String(task.task_schedule_ref ?? task.schedule_ref ?? '').trim();

  if (!scheduleRef && task.cells && typeof task.cells === 'object') {
    for (const cell of Object.values(task.cells)) {
      const { scheduleRef: sr } = getFacilityCellTaskRefs(cell);
      if (String(sr).trim()) {
        scheduleRef = String(sr).trim();
        break;
      }
    }
  }

  if (scheduleRef) return scheduleRef;

  const facilityRef = String(task.facility_task_ref ?? task.center_tracker_task_ref ?? '').trim();
  const title = String(task.task_name ?? task.name ?? '').trim();
  const base = facilityRef || title || 'facility-row';
  return `${base}__idx_${rowIndex}`;
};

const MY_TASK_STATUS_OPTIONS = [
  { label: 'Pending', value: 'Pending', color: 'blue', percentage: 50 },
  { label: 'Missed', value: 'Missed', color: 'red', percentage: 100 },
  { label: 'Partially completed', value: 'Partially completed', color: 'orange', percentage: 60 },
  { label: 'Completed', value: 'Completed', color: 'green', percentage: 100 },
];

const MY_TASK_STATUS_PROGRESS = {
  Pending: { percentage: 50, color: 'blue' },
  Missed: { percentage: 100, color: 'red' },
  'Partially completed': { percentage: 60, color: 'orange' },
  Completed: { percentage: 100, color: 'green' },
};

const mapMyTaskStateToUiLabel = (state) => {
  const key = normalizeFacilityViewTypeKey(state);
  if (key === 'missed') return 'Missed';
  if (key === 'completed') return 'Completed';
  if (key === 'partiallycompleted') return 'Partially completed';
  if (key === 'pending') return 'Pending';
  if (key === 'overdue') return 'Missed';
  const raw = String(state ?? '').trim();
  return raw ? raw.replaceAll('_', ' ') : 'Pending';
};

const isMyTaskDetailAllowed = (state) => {
  const key = normalizeFacilityViewTypeKey(state);
  return (
    key === 'completed' || key === 'partiallycompleted' || key === 'missed' || key === 'pending'
  );
};

const isMyTaskExecutable = (taskOrState) => {
  if (taskOrState && typeof taskOrState === 'object') {
    return Boolean(taskOrState.executable);
  }
  const key = normalizeFacilityViewTypeKey(taskOrState);
  return key === 'pending';
};

const formatSafeDateLabel = (value) => {
  if (value == null || value === '') return '—';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : format(d, 'dd MMM yyyy');
};

const formatSafeDateShort = (value) => {
  if (value == null || value === '') return '—';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : format(d, 'dd MMM');
};

/** Parse API time (`9:00:00`, `14:00:00`, ISO datetime) to `h:mm a`. */
const formatFacilityTimeAmPm = (value) => {
  if (value == null || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return format(value, 'h:mm a');
  }
  const raw = String(value).trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw) || (raw.includes('T') && raw.length >= 10)) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return format(d, 'h:mm a');
  }
  const ref = new Date(2000, 0, 1);
  const flexSec = parse(raw, 'H:mm:ss', ref);
  if (isValid(flexSec)) return format(flexSec, 'h:mm a');
  const flexHm = parse(raw, 'H:mm', ref);
  if (isValid(flexHm)) return format(flexHm, 'h:mm a');
  const withSeconds = parse(raw, 'HH:mm:ss', ref);
  if (isValid(withSeconds)) return format(withSeconds, 'h:mm a');
  const slice5 = raw.length >= 5 ? raw.slice(0, 5) : raw;
  const hm = parse(slice5, 'HH:mm', ref);
  if (isValid(hm)) return format(hm, 'h:mm a');
  return '';
};

const getMyTaskAvailabilityNote = (task) => {
  const apiNote = String(task?.availability_note ?? '').trim();
  if (apiNote) return apiNote;
  const startTime = formatFacilityTimeAmPm(task?.start_time);
  const startDateLabel = formatSafeDateLabel(task?.start_date);
  if (startDateLabel !== '—' && startTime) {
    return `This task can be performed on ${startDateLabel} at ${startTime}.`;
  }
  if (startDateLabel !== '—') {
    return `This task can be performed on ${startDateLabel}.`;
  }
  return 'This task can be performed at its scheduled start time.';
};

export const SAMPLE_ROWS = [
  { id: 'r1', name: 'Reception & Lobby', assignees: ['Ankit', 'Rahul', 'Aditi'] },
  { id: 'r2', name: 'Waiting Lounge', assignees: ['Priya', 'Nikhil', 'Neha', 'Vikram'] },
  { id: 'r3', name: 'Cabin Area', assignees: ['Kunal', 'Rhea'] },
  { id: 'r4', name: 'Pantry', assignees: ['Aman'] },
  { id: 'r5', name: 'Breakout Area', assignees: ['Ankit', 'Aditi', 'Nikhil'] },

  { id: 'r6', name: 'Conference Room A', assignees: ['Rahul', 'Neha'] },
  { id: 'r7', name: 'Conference Room B', assignees: ['Priya', 'Aman', 'Kunal'] },
  { id: 'r8', name: 'Workstation Zone 1', assignees: ['Ankit', 'Rhea', 'Vikram'] },
  { id: 'r9', name: 'Workstation Zone 2', assignees: ['Nikhil', 'Aditi'] },
  { id: 'r10', name: 'HR Cabin', assignees: ['Priya'] },

  { id: 'r11', name: 'Finance Department', assignees: ['Rahul', 'Kunal'] },
  { id: 'r12', name: 'IT Support Room', assignees: ['Aman', 'Vikram'] },
  { id: 'r13', name: 'Server Room', assignees: ['Nikhil'] },
  { id: 'r14', name: 'Storage Area', assignees: ['Rhea', 'Aditi'] },
  { id: 'r15', name: 'Parking Basement', assignees: ['Ankit', 'Rahul'] },

  { id: 'r16', name: 'Terrace', assignees: ['Vikram', 'Neha'] },
  { id: 'r17', name: 'Washroom - Ground Floor', assignees: ['Aman'] },
  { id: 'r18', name: 'Washroom - First Floor', assignees: ['Priya', 'Rhea'] },
  { id: 'r19', name: 'Lift Area', assignees: ['Kunal', 'Nikhil'] },
  { id: 'r20', name: 'Staircase', assignees: ['Ankit', 'Aditi'] },
];

const TASK_TAB_OPTIONS = [
  { label: 'All Task', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Missed', value: 'missed' },
  { label: 'Completed', value: 'completed' },
  { label: 'Partially completed', value: 'partially_completed' },
];

/** Start column display: prefer explicit time keys, fallback to short date keys, else em dash. */
const resolveFacilityTaskStartDisplay = (task) => {
  if (!task || typeof task !== 'object') return '—';

  const scheduleList = Array.isArray(task.schedule) ? task.schedule : [];
  const firstScheduleWithStart = scheduleList.find((row) =>
    String(row?.start_time ?? row?.start ?? '').trim(),
  );

  const timeCandidates = [
    task.start,
    task.start_time,
    task.startTime,
    task.time,
    firstScheduleWithStart?.start_time,
    firstScheduleWithStart?.start,
  ];
  for (const candidate of timeCandidates) {
    const formatted = formatFacilityTimeAmPm(candidate);
    if (formatted) return formatted;
  }

  const dateCandidates = [task.start_date, task.startDate, task.start];
  for (const candidate of dateCandidates) {
    const formatted = formatSafeDateShort(candidate);
    if (formatted && formatted !== '—') return formatted;
  }

  return '—';
};

/**
 * Map facility listview assignees to display labels.
 * Supports: string ids; legacy `{ assignee, assignee_type }`; new `{ id, name, type }`.
 */
const resolveAssigneeLabelsFromApi = (assignees, idToName) => {
  const map = idToName && typeof idToName === 'object' ? idToName : {};
  if (!Array.isArray(assignees)) return [];
  return assignees
    .map((entry) => {
      if (typeof entry === 'string') {
        const id = entry.trim();
        return id ? (map[id] ?? id) : null;
      }
      if (entry && typeof entry === 'object') {
        const displayName = String(entry?.name ?? '').trim();
        if (displayName) return displayName;
        const id = String(entry?.id ?? entry?.assignee ?? '').trim();
        if (!id) return null;
        return map[id] ?? id;
      }
      return null;
    })
    .filter(Boolean);
};

/** Employee / assignee ids for `SupervisorAssigneeMultiSelect` (aligned with center tracker configuration). */
const resolveAssigneeIdsFromApi = (assignees) => {
  if (!Array.isArray(assignees)) return [];
  return assignees
    .map((entry) => {
      if (typeof entry === 'string') {
        const id = entry.trim();
        return id || null;
      }
      if (entry && typeof entry === 'object') {
        const id = String(entry?.id ?? entry?.assignee ?? '').trim();
        return id || null;
      }
      return null;
    })
    .filter(Boolean);
};

/**
 * Merges listview / my-task `assignees` (id + name from API) into supervisor options so avatars
 * and tooltips use display names, not raw ids when the id is missing from the center list.
 */
const mergeSupervisorOptionsWithRowAssignees = (baseOptions, assigneeEntries) => {
  const list = Array.isArray(baseOptions) ? baseOptions : [];
  const map = new Map(list.map((o) => [String(o.value), { ...o }]));
  if (!Array.isArray(assigneeEntries)) return list;
  assigneeEntries.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const id = String(entry.id ?? entry.assignee ?? '').trim();
    if (!id) return;
    const apiName = String(entry.name ?? '').trim();
    const prev = map.get(id) ?? {};
    const label = apiName || String(prev.label ?? prev.name ?? '').trim() || id;
    const isRole = String(entry.type ?? '').toLowerCase() === 'role';
    map.set(id, {
      ...prev,
      value: id,
      label,
      name: label,
      user_role: isRole ? apiName || 'Role' : prev.user_role || 'Supervisor',
    });
  });
  return [...map.values()];
};

const FacilityAssigneeCell = ({ assigneeIds = [], assigneeOptions = [], assigneeEntries }) => {
  const mergedOptions = useMemo(
    () => mergeSupervisorOptionsWithRowAssignees(assigneeOptions, assigneeEntries),
    [assigneeOptions, assigneeEntries],
  );
  return (
    <div onClick={(e) => e.stopPropagation()} className='flex min-w-0 justify-center'>
      <SupervisorAssigneeMultiSelect
        options={mergedOptions}
        value={assigneeIds}
        readonly
        variant='borderless'
        size='xsmall'
        maxVisibleAvatars={4}
        placeholder='--'
        triggerClassName='w-auto min-h-0 p-0 h-auto hover:bg-transparent'
      />
    </div>
  );
};

/** Renders cell status from facility listview API (`cells[dateKey].status`), aligned with support-team date cells. */
const FacilityTrackerApiCellIcon = ({ status, viewType }) => {
  const raw = String(status ?? '').trim();
  const s = raw.toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
  const isDailyView =
    String(viewType ?? '')
      .trim()
      .toLowerCase()
      .replaceAll(' ', '_') === 'daily';

  if (!raw) {
    return (
      <span className='inline-flex' title='No data'>
        <RiIndeterminateCircleLine size={20} className='text-text-disabled-300' />
      </span>
    );
  }

  if (isDailyView && s === 'pending') {
    return (
      <span className='inline-flex' title='No data'>
        <RiIndeterminateCircleLine size={20} />
      </span>
    );
  }

  if (s === 'completed') {
    return (
      <span className='inline-flex' title='Completed'>
        <RiCheckboxCircleFill size={20} className='text-green-600' />
      </span>
    );
  }
  if (s === 'missed' || s === 'absent') {
    return (
      <span className='inline-flex' title='Missed'>
        <RiCloseCircleFill size={20} className='text-red-500' />
      </span>
    );
  }
  if (s === 'partially_completed') {
    return (
      <span className='inline-flex' title='Partially completed'>
        <RiCheckboxCircleFill size={20} color='orange' />
      </span>
    );
  }
  if (s === 'pending') {
    return (
      <Badge.Root variant='light' color='blue'>
        <Badge.Icon as={RiTimeLine} />
        Planned
      </Badge.Root>
    );
  }

  return (
    <span className='inline-flex cursor-default' title={raw}>
      <RiIndeterminateCircleLine size={20} />
    </span>
  );
};

const getTrackerMode = (tab, trackerTabs = []) => {
  const tabName = String(tab ?? '').trim();
  const activeTrackerTab = Array.isArray(trackerTabs)
    ? trackerTabs.find((t) => String(t?.name ?? '').trim() === tabName)
    : null;

  const rawViewType =
    activeTrackerTab?.view_type ??
    activeTrackerTab?.viewType ??
    activeTrackerTab?.tracker_view_type ??
    activeTrackerTab?.type ??
    '';
  const fromViewType = normalizeFacilityViewTypeKey(rawViewType);
  if (fromViewType.includes('weekly') || fromViewType.includes('week')) return 'weekly';
  if (fromViewType.includes('monthly') || fromViewType.includes('month')) return 'monthly';
  if (fromViewType.includes('annual') || fromViewType.includes('year')) return 'annually';
  if (fromViewType.includes('daily') || fromViewType.includes('day')) return 'daily';

  // Fallback for legacy/custom tab names when view_type is absent.
  const value = normalizeFacilityViewTypeKey(tabName);
  if (value.includes('weekly') || value.includes('week')) return 'weekly';
  if (value.includes('monthly') || value.includes('month')) return 'monthly';
  if (value.includes('annual') || value.includes('year')) return 'annually';
  return 'daily';
};

// const CalendarControl = ({ mode, monthDate, weekRange, onMonthDateChange, onWeekRangeChange }) => {
//   const [open, setOpen] = useState(false);
//   const [displayMonth, setDisplayMonth] = useState(monthDate || new Date());
//   const effectiveRange = weekRange?.from && weekRange?.to ? weekRange : getDefaultWeekRange();

//   const label = useMemo(() => {
//     if (mode === 'weekly') {
//       return `${format(effectiveRange.from, 'LLL dd, y')} - ${format(effectiveRange.to, 'LLL dd, y')}`;
//     }
//     if (mode === 'annually') return format(monthDate, 'yyyy');
//     return format(monthDate, 'LLL yyyy');
//   }, [mode, monthDate, effectiveRange]);

//   const handleWeekMonthChange = (newDisplayMonth) => {
//     setDisplayMonth(newDisplayMonth);
//     const fromDay = getDate(effectiveRange.from);
//     const toDay = getDate(effectiveRange.to);
//     const maxDay = getDaysInMonth(newDisplayMonth);
//     const newFrom = setDate(newDisplayMonth, Math.min(fromDay, maxDay));
//     const newTo = setDate(newDisplayMonth, Math.min(toDay, maxDay));
//     onWeekRangeChange?.({ from: newFrom, to: newTo > newFrom ? newTo : newFrom });
//   };

//   const handleWeekChange = (selectedRange) => {
//     onWeekRangeChange?.(selectedRange);
//     if (selectedRange?.from) setDisplayMonth(selectedRange.from);
//     if (selectedRange?.from && selectedRange?.to) setOpen(false);
//   };

//   const handlePreviousWeek = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     onWeekRangeChange?.({
//       from: subDays(effectiveRange.from, WEEK_RANGE_DAYS),
//       to: subDays(effectiveRange.to, WEEK_RANGE_DAYS),
//     });
//   };

//   const handleNextWeek = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     onWeekRangeChange?.({
//       from: addDays(effectiveRange.from, WEEK_RANGE_DAYS),
//       to: addDays(effectiveRange.to, WEEK_RANGE_DAYS),
//     });
//   };

//   return (
//     <Popover.Root open={open} onOpenChange={setOpen}>
//       <Popover.Trigger asChild>
//         {mode === 'weekly' ? (
//           <ButtonGroup.Root>
//             <ButtonGroup.Item>{label}</ButtonGroup.Item>
//             <ButtonGroup.Item onClick={handlePreviousWeek} aria-label='Previous week'>
//               <ButtonGroup.Icon as={RiArrowLeftSLine} />
//             </ButtonGroup.Item>
//             <ButtonGroup.Item onClick={handleNextWeek} aria-label='Next week'>
//               <ButtonGroup.Icon as={RiArrowRightSLine} />
//             </ButtonGroup.Item>
//           </ButtonGroup.Root>
//         ) : (
//           <Button.Root type='button' size='small' variant='neutral' mode='stroke' className='gap-2'>
//             <Button.Icon as={RiCalendarLine} />
//             {label}
//           </Button.Root>
//         )}
//       </Popover.Trigger>
//       <Popover.Content className='p-0' showArrow={false}>
//         {mode === 'weekly' ? (
//           <DatepickerPrimivites.Calendar
//             mode='range'
//             selected={effectiveRange}
//             onSelect={handleWeekChange}
//             month={displayMonth}
//             onMonthChange={handleWeekMonthChange}
//           />
//         ) : (
//           <DatepickerPrimivites.Calendar
//             mode='single'
//             selected={monthDate}
//             onSelect={(date) => {
//               if (date) onMonthDateChange?.(date);
//               setOpen(false);
//             }}
//             month={monthDate}
//             onMonthChange={onMonthDateChange}
//           />
//         )}
//       </Popover.Content>
//     </Popover.Root>
//   );
// };

/** Month/year control for facility list filters (matches agreements calendar toolbar pattern). */
const FacilityListMonthToolbar = ({ value, onMonthChange, className }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const displayDate = value instanceof Date ? value : new Date(value);

  const handlePreviousMonth = () => {
    onMonthChange?.(startOfMonth(subMonths(displayDate, 1)));
  };
  const handleNextMonth = () => {
    onMonthChange?.(startOfMonth(addMonths(displayDate, 1)));
  };
  const handlePickerSelect = (date) => {
    onMonthChange?.(startOfMonth(date));
    setPickerOpen(false);
  };

  return (
    <div className={cn('flex items-center gap-0 shrink-0', className)}>
      <ButtonGroup.Root size='small' className='shrink-0'>
        <Popover.Root open={pickerOpen} onOpenChange={setPickerOpen}>
          <Popover.Trigger asChild>
            <ButtonGroup.Item
              type='button'
              className='min-w-[140px] justify-center gap-1 px-3'
              aria-label='Select month and year'
            >
              <RiCalendarLine className='size-5 shrink-0 text-[var(--color-text-sub-600)]' />
              <span className='text-label-sm text-[var(--color-text-strong-950)]'>
                {format(displayDate, 'MMM yy')}
              </span>
              <RiArrowDownSLine className='size-5 shrink-0 text-[var(--color-text-sub-600)]' />
            </ButtonGroup.Item>
          </Popover.Trigger>
          <Popover.Content className='p-4' align='start' side='bottom' sideOffset={8}>
            <AgreementsMonthYearPicker
              value={displayDate}
              onSelect={handlePickerSelect}
              onCancel={() => setPickerOpen(false)}
            />
          </Popover.Content>
        </Popover.Root>
        <ButtonGroup.Item type='button' onClick={handlePreviousMonth} aria-label='Previous month'>
          <ButtonGroup.Icon as={RiArrowLeftSLine} />
        </ButtonGroup.Item>
        <ButtonGroup.Item type='button' onClick={handleNextMonth} aria-label='Next month'>
          <ButtonGroup.Icon as={RiArrowRightSLine} />
        </ButtonGroup.Item>
      </ButtonGroup.Root>
    </div>
  );
};

const FacilityGroupTable = ({
  groupRows,
  columns,
  facilityTableLeftPinned,
  isMyTaskTab,
  facilityPeriodColMinClass,
  onRowClick,
}) => {
  const table = useReactTable({
    data: groupRows,
    columns,
    state: {
      columnPinning: {
        left: facilityTableLeftPinned,
      },
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table.Root variant='compact' tableInstance={table} className='overflow-visible'>
      <Table.Header>
        {table.getHeaderGroups().map((headerGroup) => (
          <Table.Row key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <Table.Head
                key={header.id}
                column={header.column}
                className={
                  isMyTaskTab
                    ? header.column.id === 'name'
                      ? 'min-w-[220px]'
                      : 'min-w-[140px]'
                    : header.column.id === 'name'
                      ? 'min-w-[150px]'
                      : header.column.id === 'assignee'
                        ? 'min-w-[150px]'
                        : header.column.id === 'floor'
                          ? 'min-w-[100px]'
                          : header.column.id === 'startDate'
                            ? 'min-w-[100px]'
                            : facilityPeriodColMinClass
                }
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </Table.Head>
            ))}
          </Table.Row>
        ))}
      </Table.Header>
      <Table.Body spacing={8}>
        {table.getRowModel().rows.map((row, rowIndex, rows) => (
          <React.Fragment key={row.id}>
            <Table.Row
              onClick={
                !isMyTaskTab
                  ? undefined
                  : (event) => {
                      event.stopPropagation();
                      onRowClick?.(row.original);
                    }
              }
              className={
                isMyTaskTab
                  ? 'hover:bg-bg-weak-50 transition-colors cursor-pointer'
                  : 'hover:bg-bg-weak-50/50 transition-colors'
              }
            >
              {row.getVisibleCells().map((cell) => (
                <Table.Cell
                  key={cell.id}
                  column={cell.column}
                  className={
                    isMyTaskTab
                      ? cell.column.id === 'name'
                        ? 'min-w-[220px]'
                        : 'min-w-[140px]'
                      : cell.column.id === 'name'
                        ? 'min-w-[150px]'
                        : cell.column.id === 'assignee'
                          ? 'min-w-[150px]'
                          : cell.column.id === 'floor'
                            ? 'min-w-[100px]'
                            : cell.column.id === 'startDate'
                              ? 'min-w-[100px]'
                              : facilityPeriodColMinClass
                  }
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Table.Cell>
              ))}
            </Table.Row>
            {rowIndex < rows.length - 1 && <Table.RowDivider />}
          </React.Fragment>
        ))}
      </Table.Body>
    </Table.Root>
  );
};

const FacilityGroupedView = ({
  sortedKeys,
  groups,
  columns,
  facilityTableLeftPinned,
  isMyTaskTab,
  facilityPeriodColMinClass,
  onRowClick,
  facilityTaskListLoading,
  myTaskListLoading,
}) => {
  const [expandedKeys, setExpandedKeys] = useState(() =>
    Object.fromEntries(sortedKeys.map((k) => [k, true])),
  );

  useEffect(() => {
    setExpandedKeys((previous) => {
      const next = { ...previous };
      sortedKeys.forEach((k) => {
        if (next[k] === undefined) next[k] = true;
      });
      return next;
    });
  }, [sortedKeys]);

  const toggle = (key) => setExpandedKeys((previous) => ({ ...previous, [key]: !previous[key] }));

  return (
    <div className='w-full flex flex-col gap-8'>
      {sortedKeys.map((key) => {
        const groupRows = groups[key] || [];
        const isExpanded = expandedKeys[key] !== false;
        return (
          <div key={key} className='flex w-full flex-col items-start gap-2'>
            <button
              type='button'
              onClick={() => toggle(key)}
              className='label-small flex items-center gap-1 font-medium text-[var(--color-text-sub-500)] cursor-pointer hover:opacity-80 transition-opacity w-full text-left'
            >
              <span className='capitalize'>{key}</span>
              <span className='text-text-soft-400 font-normal ml-1'>({groupRows.length})</span>
              {isExpanded ? (
                <RiArrowUpSLine size={16} className='shrink-0' />
              ) : (
                <RiArrowDownSLine size={16} className='shrink-0' />
              )}
            </button>
            {isExpanded && (
              <div className='w-full rounded-xl border border-stroke-soft-200 bg-bg-white- overflow-hidden'>
                <div className='w-full overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]'>
                  <FacilityGroupTable
                    groupRows={groupRows}
                    columns={columns}
                    facilityTableLeftPinned={facilityTableLeftPinned}
                    isMyTaskTab={isMyTaskTab}
                    facilityPeriodColMinClass={facilityPeriodColMinClass}
                    onRowClick={onRowClick}
                    facilityTaskListLoading={facilityTaskListLoading}
                    myTaskListLoading={myTaskListLoading}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const StatusIcon = ({ state }) => {
  if (state === 'planned') {
    return (
      <Badge.Root variant='light' color='blue' size='small'>
        <Badge.Icon as={RiTimeLine} />
        Planned
      </Badge.Root>
    );
  }
  if (state === 'present') {
    return <RiCheckboxCircleFill size={18} color='green' />;
  }
  if (state === 'absent') {
    return <RiCloseCircleFill size={18} color='red' />;
  }
  return <RiIndeterminateCircleLine size={18} color='gray' />;
};

const FacilityTrackerPage = () => {
  const dispatch = useDispatch();
  const centersFromApi = useSelector((state) => state.facilityTrackerCheck.centers.data);
  const centersLoading = useSelector((state) => state.facilityTrackerCheck.centers.isLoading);
  const trackerTabsPayload = useSelector((state) => state.facilityTrackerCheck.trackerTabs.data);
  const floorsFromApi = useSelector((state) => state.facilityTrackerCheck.floors.data);
  const floorsLoading = useSelector((state) => state.facilityTrackerCheck.floors.isLoading);
  const supervisorsFromApi = useSelector((state) => state.facilityTrackerCheck.supervisors.data);
  const supervisorsLoading = useSelector(
    (state) => state.facilityTrackerCheck.supervisors.isLoading,
  );
  const facilityTasks = useSelector((state) => state.facilityTrackerCheck.taskListview.data);

  // console.log('facilityTasks', facilityTasks);

  const facilityPeriodsFromApi = useSelector(
    (state) => state.facilityTrackerCheck.taskListview.periods,
  );
  const facilityListViewType = useSelector(
    (state) => state.facilityTrackerCheck.taskListview.viewType,
  );
  const facilityTaskDetail = useSelector((state) => state.facilityTrackerCheck.taskDetail.data);
  const facilityTaskDetailLoading = useSelector(
    (state) => state.facilityTrackerCheck.taskDetail.isLoading,
  );
  const facilityTaskDetailError = useSelector(
    (state) => state.facilityTrackerCheck.taskDetail.error,
  );
  const facilityTaskCommentsState = useSelector(selectFacilityTaskComments);
  const facilityTaskCommentsData = facilityTaskCommentsState.data;
  const facilityTaskCommentsLoading = facilityTaskCommentsState.status === 'loading';
  const facilityTaskListLoading = useSelector(
    (state) => state.facilityTrackerCheck.taskListview.isLoading,
  );
  const facilityTaskListLoadingMore = useSelector(
    (state) => state.facilityTrackerCheck.taskListview.isLoadingMore,
  );
  const facilityTaskListHasMore = useSelector(
    (state) => state.facilityTrackerCheck.taskListview.hasMore,
  );
  const facilityTaskListPage = useSelector((state) => state.facilityTrackerCheck.taskListview.page);
  const facilityTaskListPageSize = useSelector(
    (state) => state.facilityTrackerCheck.taskListview.pageSize,
  );
  const myTaskList = useSelector((state) => state.facilityTrackerCheck.myTaskListview.data);
  const myTaskListLoading = useSelector(
    (state) => state.facilityTrackerCheck.myTaskListview.isLoading,
  );
  const myTaskListLoadingMore = useSelector(
    (state) => state.facilityTrackerCheck.myTaskListview.isLoadingMore,
  );
  const myTaskListHasMore = useSelector(
    (state) => state.facilityTrackerCheck.myTaskListview.hasMore,
  );
  const myTaskListPage = useSelector((state) => state.facilityTrackerCheck.myTaskListview.page);
  const myTaskListPageSize = useSelector(
    (state) => state.facilityTrackerCheck.myTaskListview.pageSize,
  );
  const submitMyTaskChecklistLoading = useSelector(
    (state) => state.facilityTrackerCheck.submitMyTaskChecklist.isLoading,
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('My Task');
  const [selectedCenterId, setSelectedCenterId] = useState(null);
  const [taskTabFilter, setTaskTabFilter] = useState('all');
  const [listFilterMonthDate, setListFilterMonthDate] = useState(() => startOfMonth(new Date()));
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const facilityFiltersStorageKey = getFacilityTrackerFiltersStorageKey(selectedCenterId);
  const [persistedFacilityFilters, setPersistedFacilityFilters] = usePersistedFilters({
    storageKey: facilityFiltersStorageKey,
    defaultFilters: DEFAULT_FACILITY_TRACKER_FILTERS,
    persistIncludeKeys: FACILITY_FILTER_PERSISTED_KEYS,
    persistTrimStringArrays: true,
  });
  const normalizedFacilityFilters = useMemo(
    () => mergeStoredFacilityTrackerFilters(persistedFacilityFilters),
    [persistedFacilityFilters],
  );
  const filterFloor = normalizedFacilityFilters.floor;
  const filterAssignee = normalizedFacilityFilters.assignee;
  const setFilterFloor = useCallback(
    (updater) =>
      setPersistedFacilityFilters((prev) => {
        const merged = mergeStoredFacilityTrackerFilters(prev);
        const next = typeof updater === 'function' ? updater(merged.floor) : updater;
        return { ...merged, floor: Array.isArray(next) ? next : [] };
      }),
    [setPersistedFacilityFilters],
  );
  const setFilterAssignee = useCallback(
    (updater) =>
      setPersistedFacilityFilters((prev) => {
        const merged = mergeStoredFacilityTrackerFilters(prev);
        const next = typeof updater === 'function' ? updater(merged.assignee) : updater;
        return { ...merged, assignee: Array.isArray(next) ? next : [] };
      }),
    [setPersistedFacilityFilters],
  );
  const previousCenterRef = useRef(undefined);

  const [centerSearch, setCenterSearch] = useState('');
  const [centerDropdownOpen, setCenterDropdownOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [facilityFilterTab, setFacilityFilterTab] = useState('floor');
  const [facilityFilterSearch, setFacilityFilterSearch] = useState('');
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [weekDate, setWeekDate] = useState(() => normalizeFacilityWeekStart(new Date()));
  const [yearDate, setYearDate] = useState(() =>
    formatDateToISO(new Date(new Date().getFullYear(), 0, 1)),
  );
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerMode, setDrawerMode] = useState('facility');
  const [taskTypeFilter, setTaskTypeFilter] = useState('all');
  const [statusByPeriodOverrides, setStatusByPeriodOverrides] = useState({});
  const [draggedPlannedSource, setDraggedPlannedSource] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);
  const [dragPreview, setDragPreview] = useState({ visible: false, x: 0, y: 0 });
  /** Fixed facility grid columns (column manager removed). */
  const visibleColumns = useMemo(() => ['name', 'assignee', 'floor', 'startDate'], []);
  const tableScrollRef = useRef(null);
  const [tableScrollElement, setTableScrollElement] = useState(null);

  const trackerTabResults = useMemo(
    () =>
      Array.isArray(trackerTabsPayload?.message?.results) ? trackerTabsPayload.message.results : [],
    [trackerTabsPayload],
  );
  const trackerMode = useMemo(
    () => getTrackerMode(activeTab, trackerTabResults),
    [activeTab, trackerTabResults],
  );
  const isMyTaskTab = activeTab === 'My Task';

  const debouncedKeyword = useDebounce(searchTerm, 400);

  const facilityMainTabs = useMemo(() => {
    const names = trackerTabResults.map((t) => t?.name).filter(Boolean);
    return ['My Task', ...names];
  }, [trackerTabResults]);

  const floorOptions = useMemo(() => {
    const raw = Array.isArray(floorsFromApi) ? floorsFromApi : [];
    return raw
      .map((f) => {
        if (typeof f === 'string') return { value: f, label: f };
        const fl = String(
          f?.floor ?? f?.label ?? f?.value ?? f?.block_floor_id ?? f?.name ?? '',
        ).trim();
        if (!fl) return null;
        return { value: fl, label: fl };
      })
      .filter(Boolean);
  }, [floorsFromApi]);

  /** Same shape as center configuration tracker (`center-detail-configuration-tracker`). */
  const supervisorAssigneeOptions = useMemo(
    () =>
      (Array.isArray(supervisorsFromApi) ? supervisorsFromApi : [])
        .map((s) => {
          const value = String(
            s?.employee_id ?? s?.team_member_id ?? s?.email ?? s?.value ?? s?.name ?? '',
          ).trim();
          const label =
            String(s?.employee_name ?? s?.name ?? s?.label ?? s?.employee_id ?? value).trim() ||
            value;
          const user_role = String(s?.user_role ?? s?.role ?? 'Team member').trim();
          return { value, label, user_role };
        })
        .filter((o) => o.value && o.label),
    [supervisorsFromApi],
  );

  const assigneeFilterOptions = useMemo(
    () => supervisorAssigneeOptions.map(({ value, label }) => ({ value, label })),
    [supervisorAssigneeOptions],
  );

  const assigneeIdToName = useMemo(() => {
    const map = {};
    supervisorAssigneeOptions.forEach((o) => {
      if (o.value) map[o.value] = o.label;
    });
    return map;
  }, [supervisorAssigneeOptions]);

  /** Drawer assignee avatars / tooltips use API names from the opened row when ids are not in the center list. */
  const facilityDrawerAssigneeOptions = useMemo(
    () =>
      mergeSupervisorOptionsWithRowAssignees(
        supervisorAssigneeOptions,
        selectedTask?.assigneeEntries,
      ),
    [supervisorAssigneeOptions, selectedTask?.assigneeEntries],
  );

  const selectedCenterLabel = useMemo(() => {
    if (!selectedCenterId) return 'Select center';
    const row = centersFromApi.find((c) => c.name === selectedCenterId);
    return row?.center_name || row?.name || selectedCenterId;
  }, [centersFromApi, selectedCenterId]);

  const filteredCenters = useMemo(() => {
    const q = centerSearch.trim().toLowerCase();
    if (!q) return centersFromApi ?? [];
    return (centersFromApi ?? []).filter((c) =>
      (c.center_name || c.name || '').toLowerCase().includes(q),
    );
  }, [centersFromApi, centerSearch]);

  const taskTabFilterLabel = useMemo(
    () => TASK_TAB_OPTIONS.find((o) => o.value === taskTabFilter)?.label ?? 'All Task',
    [taskTabFilter],
  );

  useEffect(() => {
    setFacilityFilterSearch('');
  }, [facilityFilterTab]);

  const filteredFacilityFilterOptions = useMemo(() => {
    const base = facilityFilterTab === 'floor' ? floorOptions : assigneeFilterOptions;
    const q = facilityFilterSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (o) => o.label.toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q),
    );
  }, [facilityFilterTab, floorOptions, assigneeFilterOptions, facilityFilterSearch]);

  const handleFloorFilterToggle = useCallback((value) => {
    const normalized = String(value ?? '').trim();
    if (!normalized) return;
    setFilterFloor((prev) =>
      prev.includes(normalized)
        ? prev.filter((item) => item !== normalized)
        : [...prev, normalized],
    );
  }, []);

  const handleAssigneeFilterToggle = useCallback((value) => {
    const normalized = String(value ?? '').trim();
    if (!normalized) return;
    setFilterAssignee((prev) =>
      prev.includes(normalized)
        ? prev.filter((item) => item !== normalized)
        : [...prev, normalized],
    );
  }, []);

  const handleFacilityFilterClear = useCallback(() => {
    setFilterFloor([]);
    setFilterAssignee([]);
    setFacilityFilterSearch('');
  }, []);

  const facilityFilterSelectedValues = useMemo(() => {
    if (facilityFilterTab === 'floor') {
      return filterFloor;
    }
    return filterAssignee;
  }, [facilityFilterTab, filterFloor, filterAssignee]);

  const facilityTupleFilters = useMemo(() => {
    const tuples = [];
    if (filterFloor.length === 1) {
      tuples.push(['floor', '=', filterFloor[0]]);
    } else if (filterFloor.length > 1) {
      tuples.push(['floor', 'in', filterFloor]);
    }
    if (filterAssignee.length === 1) {
      tuples.push(['assignee', '=', filterAssignee[0]]);
    } else if (filterAssignee.length > 1) {
      tuples.push(['assignee', 'in', filterAssignee]);
    }
    return tuples;
  }, [filterFloor, filterAssignee]);
  const appliedFacilityFilterCount = useMemo(
    () => Number(filterFloor.length > 0) + Number(filterAssignee.length > 0),
    [filterFloor.length, filterAssignee.length],
  );

  const facilityFilterListIsLoading = useMemo(
    () => (facilityFilterTab === 'floor' ? floorsLoading : supervisorsLoading),
    [facilityFilterTab, floorsLoading, supervisorsLoading],
  );

  const facilityFilterListEmptyMessage = useMemo(
    () => (facilityFilterTab === 'floor' ? 'No floors found' : 'No assignees found'),
    [facilityFilterTab],
  );

  const facilityFilterOnToggle = useCallback(
    (value) => {
      if (facilityFilterTab === 'floor') {
        handleFloorFilterToggle(value);
      } else {
        handleAssigneeFilterToggle(value);
      }
    },
    [facilityFilterTab, handleFloorFilterToggle, handleAssigneeFilterToggle],
  );

  useEffect(() => {
    dispatch(fetchFacilityTrackerCentersThunk({ pageSize: 500 }));
  }, [dispatch]);

  useEffect(() => {
    if (!centersFromApi?.length || selectedCenterId) return;
    setSelectedCenterId(centersFromApi[0].name);
  }, [centersFromApi, selectedCenterId]);

  useEffect(() => {
    if (previousCenterRef.current !== undefined && previousCenterRef.current !== selectedCenterId) {
      setActiveTab('My Task');
      setTaskTabFilter('all');
    }
    previousCenterRef.current = selectedCenterId;
  }, [selectedCenterId]);

  useEffect(() => {
    if (!selectedCenterId) return;
    dispatch(fetchFacilityTrackerTabsThunk(selectedCenterId));
    dispatch(fetchFacilityFloorsThunk(selectedCenterId));
    dispatch(fetchFacilitySupervisorsThunk({ centerId: selectedCenterId }));
    dispatch(clearFacilityTrackerTaskList());
    dispatch(clearFacilityMyTaskList());
  }, [dispatch, selectedCenterId]);

  useEffect(() => {
    if (facilityMainTabs.length === 0) return;
    if (!facilityMainTabs.includes(activeTab)) {
      setActiveTab(facilityMainTabs[0]);
    }
  }, [facilityMainTabs, activeTab]);

  useEffect(() => {
    if (isMyTaskTab) {
      dispatch(clearFacilityTrackerTaskList());
      return;
    }
    if (!selectedCenterId) return;

    const monthYm = format(listFilterMonthDate, 'yyyy-MM');
    const weeklyAnchor =
      normalizeFacilityWeekStart(weekDate) || normalizeFacilityWeekStart(new Date());
    const annualYear = extractYear(yearDate);

    const payload = {
      tracker_name: activeTab,
      center: selectedCenterId,
      tab: taskTabFilter,
      page: 1,
      limit_page_length: 20,
      order_by: 'start_date asc',
      keyword: debouncedKeyword.trim(),
      filters: facilityTupleFilters,
      group_by: groupBy,
      group_order: groupOrder,
    };

    // Daily & monthly → `month` as yyyy-MM; weekly → `date` = selected week start; annually → viewed `year`
    if (trackerMode === 'weekly' && weeklyAnchor) {
      payload.date = weeklyAnchor;
    } else if (trackerMode === 'annually' && annualYear) {
      payload.year = annualYear;
    } else if ((trackerMode === 'daily' || trackerMode === 'monthly') && monthYm) {
      payload.month = monthYm;
    }

    dispatch(fetchFacilityTrackerTaskListviewThunk(payload));
  }, [
    dispatch,
    isMyTaskTab,
    selectedCenterId,
    activeTab,
    taskTabFilter,
    debouncedKeyword,
    listFilterMonthDate,
    facilityTupleFilters,
    trackerMode,
    weekDate,
    yearDate,
    groupBy,
    groupOrder,
  ]);

  useEffect(() => {
    if (!isMyTaskTab) {
      dispatch(clearFacilityMyTaskList());
      return;
    }
    if (!selectedCenterId) return;
    const viewTypeMap = {
      all: '',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      annually: 'Annually',
    };
    const myTaskStatusMap = {
      all: 'all',
      pending: 'pending',
      missed: 'missed',
      completed: 'completed',
      partially_completed: 'partially_completed',
    };
    dispatch(
      fetchFacilityMyTaskListviewThunk({
        center: selectedCenterId,
        view_type: viewTypeMap[taskTypeFilter] ?? '',
        status: myTaskStatusMap[taskTabFilter] ?? 'all',
        keyword: debouncedKeyword.trim(),
        filters: facilityTupleFilters,
        group_by: groupBy,
        group_order: groupOrder,
        page: 1,
        limit_page_length: 20,
        append: false,
      }),
    );
  }, [
    dispatch,
    isMyTaskTab,
    selectedCenterId,
    taskTypeFilter,
    taskTabFilter,
    debouncedKeyword,
    facilityTupleFilters,
    groupBy,
    groupOrder,
  ]);

  const periodColumns = useMemo(() => {
    if (trackerMode === 'daily') {
      return eachDayOfInterval({
        start: startOfMonth(monthDate),
        end: endOfMonth(monthDate),
      }).map((d) => ({
        key: format(d, 'yyyy-MM-dd'),
        label: format(d, 'EEE, dd'),
      }));
    }

    if (trackerMode === 'weekly') {
      const normalizedWeekDate = normalizeFacilityWeekStart(weekDate);
      let anchor = parseISO(`${formatDateToISO(new Date())}T12:00:00`);
      if (normalizedWeekDate) {
        const parsed = parseISO(`${normalizedWeekDate}T12:00:00`);
        if (!Number.isNaN(parsed.getTime())) anchor = parsed;
      }
      const from = anchor;
      const to = anchor.getDate() === 22 ? endOfMonth(anchor) : addDays(anchor, 6);
      return eachDayOfInterval({ start: from, end: to }).map((d) => ({
        key: format(d, 'yyyy-MM-dd'),
        label: format(d, 'EEE, dd'),
      }));
    }

    if (trackerMode === 'monthly') {
      return [
        { key: 'week-1', label: 'Week 1 (1-7)' },
        { key: 'week-2', label: 'Week 2 (8-14)' },
        { key: 'week-3', label: 'Week 3 (15-21)' },
        { key: 'week-4', label: 'Week 4 (22-31)' },
      ];
    }

    return [
      { key: 'jan', label: 'Jan' },
      { key: 'feb', label: 'Feb' },
      { key: 'mar', label: 'Mar' },
      { key: 'apr', label: 'Apr' },
      { key: 'may', label: 'May' },
      { key: 'jun', label: 'Jun' },
      { key: 'jul', label: 'Jul' },
      { key: 'aug', label: 'Aug' },
      { key: 'sep', label: 'Sep' },
      { key: 'oct', label: 'Oct' },
      { key: 'nov', label: 'Nov' },
      { key: 'dec', label: 'Dec' },
    ];
  }, [trackerMode, monthDate, weekDate]);

  /** Period columns for facility tracker grid: API `periods` when present, else derived from calendar. */
  const facilityGridPeriodColumns = useMemo(() => {
    if (Array.isArray(facilityPeriodsFromApi) && facilityPeriodsFromApi.length > 0) {
      return facilityPeriodsFromApi.map((p) => {
        const key = p.key ?? p.start;
        const label = formatFacilityPeriodColumnLabel(p, facilityListViewType);
        return { key, label, start: p.start, end: p.end };
      });
    }
    return periodColumns;
  }, [facilityPeriodsFromApi, periodColumns, facilityListViewType]);

  const facilityPeriodColMinClass =
    !isMyTaskTab && facilityGridPeriodColumns.length > 16
      ? 'min-w-[64px] max-w-[72px] px-0.5 text-center'
      : !isMyTaskTab && facilityGridPeriodColumns.length > 8
        ? 'min-w-[72px] text-center'
        : 'min-w-[100px] text-center';

  const movePlannedStatus = (sourceRowId, sourceColKey, targetRowId, targetColKey) => {
    if (!sourceRowId || !sourceColKey || !targetRowId || !targetColKey) return;
    if (sourceRowId === targetRowId && sourceColKey === targetColKey) return;

    setStatusByPeriodOverrides((previous) => ({
      ...previous,
      [targetRowId]: {
        ...previous[targetRowId],
        [targetColKey]: 'planned',
      },
    }));
  };

  const reloadFacilityTaskList = useCallback(() => {
    if (isMyTaskTab || !selectedCenterId) return;
    const monthYm = format(listFilterMonthDate, 'yyyy-MM');
    const weeklyAnchor =
      normalizeFacilityWeekStart(weekDate) || normalizeFacilityWeekStart(new Date());
    const annualYear = extractYear(yearDate);

    const payload = {
      tracker_name: activeTab,
      center: selectedCenterId,
      tab: taskTabFilter,
      page: 1,
      limit_page_length: 20,
      order_by: 'start_date asc',
      keyword: debouncedKeyword.trim(),
      filters: facilityTupleFilters,
      group_by: groupBy,
      group_order: groupOrder,
    };

    if (trackerMode === 'weekly' && weeklyAnchor) {
      payload.date = weeklyAnchor;
    } else if (trackerMode === 'annually' && annualYear) {
      payload.year = annualYear;
    } else if ((trackerMode === 'daily' || trackerMode === 'monthly') && monthYm) {
      payload.month = monthYm;
    }

    dispatch(fetchFacilityTrackerTaskListviewThunk(payload));
  }, [
    activeTab,
    debouncedKeyword,
    dispatch,
    facilityTupleFilters,
    isMyTaskTab,
    listFilterMonthDate,
    selectedCenterId,
    taskTabFilter,
    trackerMode,
    weekDate,
    yearDate,
    groupBy,
    groupOrder,
  ]);

  const reloadMyTaskList = useCallback(() => {
    if (!isMyTaskTab || !selectedCenterId) return;
    const viewTypeMap = {
      all: '',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      annually: 'Annually',
    };
    const myTaskStatusMap = {
      all: 'all',
      pending: 'pending',
      missed: 'missed',
      completed: 'completed',
      partially_completed: 'partially_completed',
    };
    dispatch(
      fetchFacilityMyTaskListviewThunk({
        center: selectedCenterId,
        view_type: viewTypeMap[taskTypeFilter] ?? '',
        status: myTaskStatusMap[taskTabFilter] ?? 'all',
        keyword: debouncedKeyword.trim(),
        filters: facilityTupleFilters,
        group_by: groupBy,
        group_order: groupOrder,
        page: 1,
        limit_page_length: 20,
        append: false,
      }),
    );
  }, [
    isMyTaskTab,
    selectedCenterId,
    facilityTupleFilters,
    dispatch,
    taskTypeFilter,
    taskTabFilter,
    debouncedKeyword,
    groupBy,
    groupOrder,
  ]);

  const handleOpenFacilityCell = useCallback(
    (event, original, colKey) => {
      event.preventDefault();
      event.stopPropagation();
      const cell = original.facilityCells?.[colKey];
      if (!cell) return;
      const { taskRef, scheduleRef } = getFacilityCellTaskRefs(cell);
      if (!taskRef || !scheduleRef) return;
      if (!shouldFetchFacilityTaskDetail(cell.status)) return;
      setSelectedTask({
        task_ref: taskRef,
        task_schedule_ref: scheduleRef,
        assigneeEntries: original.assigneeEntries,
      });
      dispatch(
        fetchFacilityTrackerTaskDetailThunk({
          task_ref: taskRef,
          task_schedule_ref: scheduleRef,
        }),
      );
      setIsViewDrawerOpen(true);
    },
    [dispatch],
  );

  const handleRowClick = useCallback(
    (rowData) => {
      if (!isMyTaskTab) return;
      if (!isMyTaskDetailAllowed(rowData?.state)) return;
      const taskRef = String(rowData?.facility_task ?? '').trim();
      const scheduleRef = String(rowData?.task_schedule_ref ?? '').trim();
      if (!taskRef || !scheduleRef) return;
      setSelectedTask({ task_ref: taskRef, task_schedule_ref: scheduleRef, ...rowData });
      setDrawerMode('facility');
      dispatch(clearFacilityTrackerTaskDetail());
      dispatch(
        fetchFacilityTrackerTaskDetailThunk({
          task_ref: taskRef,
          task_schedule_ref: scheduleRef,
        }),
      );
      setIsViewDrawerOpen(true);
    },
    [dispatch, isMyTaskTab],
  );

  const tableData = useMemo(() => {
    if (!isMyTaskTab) {
      const tasks = (facilityTasks ?? []).filter((task) =>
        centerTrackerTaskHasVisibleChecklists(task.checklists),
      );
      return tasks.map((task, rowIndex) => {
        const id = getStableFacilityTrackerRowId(task, rowIndex);
        const assignees = resolveAssigneeLabelsFromApi(task.assignees, assigneeIdToName);
        const assigneeIds = resolveAssigneeIdsFromApi(task.assignees);
        const statusByPeriod = {};
        const gridCols = facilityGridPeriodColumns;
        const hasCells = task.cells && typeof task.cells === 'object';

        gridCols.forEach((col, colIndex) => {
          const isDateColumn = /^\d{4}-\d{2}-\d{2}$/.test(col.key);
          if (hasCells) {
            statusByPeriod[col.key] = 'empty';
            return;
          }
          statusByPeriod[col.key] = isDateColumn
            ? 'empty'
            : CHECK_STATES[(rowIndex + colIndex) % CHECK_STATES.length];
        });

        const rowOverrides = statusByPeriodOverrides[id];
        if (rowOverrides && !hasCells) {
          Object.entries(rowOverrides).forEach(([periodKey, nextState]) => {
            statusByPeriod[periodKey] = nextState;
          });
        }

        return {
          ...task,
          id,
          name: task.task_name ?? task.name ?? '—',
          assigneeEntries: Array.isArray(task.assignees) ? task.assignees : [],
          assignees,
          assigneeIds,
          facilityCells: task.cells,
          facilityListViewType: task.view_type ?? facilityListViewType,
          type: task.view_type ?? 'Daily',
          status: 'Pending',
          floor: resolveFacilityTaskFloorLabel(task) || '—',
          startDate: resolveFacilityTaskStartDisplay(task),
          dueDate: formatSafeDateLabel(task.due_date ?? task.dueDate),
          startTime: formatFacilityTimeAmPm(task.start_time) || '—',
          statusByPeriod,
        };
      });
    }

    const tasks = (myTaskList ?? []).filter((task) =>
      centerTrackerTaskHasVisibleChecklists(task.checklists),
    );
    return tasks.map((task, rowIndex) => {
      const id = String(
        task.task_schedule_ref ??
          task.facility_task ??
          task.center_tracker_task ??
          `my-${rowIndex}`,
      );
      const statusLabel = mapMyTaskStateToUiLabel(task.state);
      return {
        ...task,
        id,
        name: task.task_name ?? '—',
        assigneeEntries: Array.isArray(task.assignees) ? task.assignees : [],
        assignees: resolveAssigneeLabelsFromApi(task.assignees, assigneeIdToName),
        assigneeIds: resolveAssigneeIdsFromApi(task.assignees),
        type: task.view_type ?? '—',
        status: statusLabel,
        floor: resolveFacilityTaskFloorLabel(task) || '—',
        startDate: formatSafeDateLabel(task.start_date),
        dueDate: formatSafeDateLabel(task.end_date),
        startTime: formatFacilityTimeAmPm(task.start_time) || '—',
        endTime: formatFacilityTimeAmPm(task.end_time) || '—',
      };
    });
  }, [
    isMyTaskTab,
    facilityTasks,
    myTaskList,
    facilityGridPeriodColumns,
    assigneeIdToName,
    facilityListViewType,
    statusByPeriodOverrides,
  ]);

  const groupedData = useMemo(() => {
    if (!groupBy) return null;
    const groups = {};
    for (const row of tableData) {
      let key = '—';
      if (groupBy === 'status') {
        key = row.status || '—';
      } else if (groupBy === 'floor') {
        key = row.floor || '—';
      } else if (groupBy === 'assignee') {
        key = row.assignees?.join(', ') || '—';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    }
    const sortedKeys = Object.keys(groups).sort((a, b) =>
      groupOrder === 'desc' ? b.localeCompare(a) : a.localeCompare(b),
    );
    return { sortedKeys, groups };
  }, [groupBy, groupOrder, tableData]);

  const columns = useMemo(() => {
    if (isMyTaskTab) {
      return [
        {
          id: 'name',
          accessorKey: 'name',
          header: 'Task Name',
          cell: ({ row }) => {
            const canOpenDetail = isMyTaskDetailAllowed(row.original.state);
            return (
              <div className='flex items-center gap-2 min-w-0'>
                <CircularProgress
                  percentage={MY_TASK_STATUS_PROGRESS[row.original.status]?.percentage || 0}
                  color={MY_TASK_STATUS_PROGRESS[row.original.status]?.color || 'gray'}
                  size={16}
                />
                {canOpenDetail ? (
                  <button
                    type='button'
                    className='paragraph-small text-text-main-900 truncate text-left hover:text-primary-base'
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRowClick(row.original);
                    }}
                  >
                    {row.original.name}
                  </button>
                ) : (
                  <span className='paragraph-small text-text-main-900 truncate'>
                    {row.original.name}
                  </span>
                )}
              </div>
            );
          },
        },
        {
          id: 'assignee',
          accessorKey: 'assignee',
          header: 'Assignee',
          cell: ({ row }) => (
            <FacilityAssigneeCell
              assigneeIds={row.original.assigneeIds}
              assigneeOptions={supervisorAssigneeOptions}
              assigneeEntries={row.original.assigneeEntries}
            />
          ),
        },
        {
          id: 'floor',
          accessorKey: 'floor',
          header: 'Floor',
          cell: ({ row }) => (
            <span className='paragraph-small min-w-0 text-text-main-900'>{row.original.floor}</span>
          ),
        },
        {
          id: 'type',
          accessorKey: 'type',
          header: 'Type',
          cell: ({ row }) => (
            <Badge.Root variant='stroke' color='gray'>
              {row.original.type}
            </Badge.Root>
          ),
        },
        {
          id: 'status',
          accessorKey: 'status',
          header: 'Status',
          cell: ({ row }) => (
            <div
              className='pointer-events-none select-none'
              onClick={(event) => event.stopPropagation()}
              aria-readonly='true'
              title={row.original.status}
            >
              <TicketStatusDropdown
                value={row.original.status}
                onValueChange={() => {}}
                statusOptions={MY_TASK_STATUS_OPTIONS}
                indicator='progress'
                size='small'
                className='w-full'
                showArrow={false}
              />
            </div>
          ),
        },
        {
          id: 'startDate',
          accessorKey: 'startDate',
          header: 'Start Date',
          cell: ({ row }) => (
            <span className='paragraph-small min-w-0 text-text-main-900'>
              {row.original.startDate}
            </span>
          ),
        },
        {
          id: 'dueDate',
          accessorKey: 'dueDate',
          header: 'Due Date',
          cell: ({ row }) => (
            <span className='paragraph-small min-w-0 text-text-main-900'>
              {row.original.dueDate}
            </span>
          ),
        },
        {
          id: 'startTime',
          accessorKey: 'startTime',
          header: 'Start Time',
          cell: ({ row }) => (
            <span className='paragraph-small text-text-main-900'>{row.original.startTime}</span>
          ),
        },
        {
          id: 'endTime',
          accessorKey: 'endTime',
          header: 'End Time',
          cell: ({ row }) => (
            <span className='paragraph-small text-text-main-900'>{row.original.endTime}</span>
          ),
        },
        {
          id: 'action',
          accessorKey: 'action',
          header: 'Action',
          cell: ({ row }) => {
            const isPending = normalizeFacilityViewTypeKey(row.original.state) === 'pending';
            if (!isPending) return null;
            const executable = isMyTaskExecutable(row.original);
            const availabilityNote = getMyTaskAvailabilityNote(row.original);
            return (
              <div className='flex items-center gap-1'>
                <Button.Root
                  type='button'
                  size='xsmall'
                  className='gap-1'
                  disabled={!executable}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!executable) return;
                    const taskRef = String(row.original?.facility_task ?? '').trim();
                    const scheduleRef = String(row.original?.task_schedule_ref ?? '').trim();
                    if (!taskRef || !scheduleRef) return;
                    setDrawerMode('execute');
                    setSelectedTask(row.original);
                    dispatch(clearFacilityTrackerTaskDetail());
                    dispatch(
                      fetchFacilityTrackerTaskDetailThunk({
                        task_ref: taskRef,
                        task_schedule_ref: scheduleRef,
                      }),
                    );
                    setIsViewDrawerOpen(true);
                  }}
                >
                  <Button.Icon as={RiPlayLine} />
                  Execute
                </Button.Root>
                {!executable ? (
                  <Popover.Root>
                    <Popover.Trigger asChild>
                      <Button.Root
                        type='button'
                        variant='neutral'
                        mode='ghost'
                        size='xsmall'
                        className='size-7 shrink-0 p-0 text-warning-base hover:bg-warning-light'
                        aria-label='Task availability info'
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button.Icon as={RiInformationLine} />
                      </Button.Root>
                    </Popover.Trigger>
                    <Popover.Content
                      className='max-w-[280px] p-3'
                      align='end'
                      side='top'
                      sideOffset={6}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className='flex items-start gap-2 text-warning-base'>
                        <RiAlertLine className='mt-0.5 size-4 shrink-0' />
                        <p className='paragraph-small'>{availabilityNote}</p>
                      </div>
                    </Popover.Content>
                  </Popover.Root>
                ) : null}
              </div>
            );
          },
        },
      ];
    }

    const defs = [];

    if (visibleColumns.includes('name')) {
      defs.push({
        id: 'name',
        accessorKey: 'name',
        header: 'Task Name',
        size: 150,
        minSize: 150,
        cell: ({ row }) => (
          <div className='w-full flex items-center justify-center'>
            <span className='paragraph-small text-text-main-900'>{row.original.name}</span>
          </div>
        ),
      });
    }

    if (visibleColumns.includes('assignee')) {
      defs.push({
        id: 'assignee',
        accessorKey: 'assignee',
        header: 'Assignee',
        size: 150,
        minSize: 150,
        cell: ({ row }) => (
          <FacilityAssigneeCell
            assigneeIds={row.original.assigneeIds}
            assigneeOptions={supervisorAssigneeOptions}
            assigneeEntries={row.original.assigneeEntries}
          />
        ),
      });
    }

    if (visibleColumns.includes('floor')) {
      defs.push({
        id: 'floor',
        accessorKey: 'floor',
        header: 'Floor',
        size: 100,
        minSize: 100,
        cell: ({ row }) => (
          <span className='paragraph-small text-text-main-900'>{row.original.floor}</span>
        ),
      });
    }

    if (visibleColumns.includes('startDate')) {
      defs.push({
        id: 'startDate',
        accessorKey: 'startDate',
        header: 'Start',
        size: 100,
        minSize: 100,
        cell: ({ row }) => (
          <span className='paragraph-small text-text-main-900'>{row.original.startDate}</span>
        ),
      });
    }

    const facilityPeriodColSize =
      facilityGridPeriodColumns.length > 16 ? 64 : facilityGridPeriodColumns.length > 8 ? 72 : 100;

    facilityGridPeriodColumns.forEach((col) => {
      defs.push({
        id: col.key,
        accessorKey: col.key,
        size: facilityPeriodColSize,
        minSize: facilityPeriodColSize,
        header: () => (
          <div className='flex justify-center items-center gap-0.5 min-w-0'>
            <span
              className='label-small whitespace-nowrap text-text-soft-400'
              title={typeof col.label === 'string' ? col.label : col.key}
            >
              {col.label}
            </span>
          </div>
        ),
        cell: ({ row }) => {
          const { original } = row;
          const rowId = original.id;
          const { facilityCells } = original;
          if (facilityCells && typeof facilityCells === 'object') {
            const st = facilityCells[col.key]?.status;
            const cellMeta = facilityCells[col.key];
            const viewType = original.facilityListViewType ?? facilityListViewType;
            const normalizedViewType = normalizeFacilityViewTypeKey(viewType);
            const isDailyView = normalizedViewType === 'daily';
            const normalizedStatus = normalizeFacilityCellStatus(st);
            const isPlannedCell = normalizedStatus === 'pending';
            const isDropTarget = !isDailyView;
            const isDraggablePlanned = isPlannedCell && !isDailyView;
            const isDragOverTarget =
              dragOverTarget?.rowId === rowId && dragOverTarget?.colKey === col.key;
            const refs = cellMeta
              ? getFacilityCellTaskRefs(cellMeta)
              : { taskRef: '', scheduleRef: '' };
            const openable =
              cellMeta &&
              shouldFetchFacilityTaskDetail(cellMeta.status) &&
              Boolean(refs.taskRef) &&
              Boolean(refs.scheduleRef);

            const dropFromSource = async (source) => {
              const taskRef = String(source?.taskRef ?? '').trim();
              const taskScheduleRef = String(source?.taskScheduleRef ?? '').trim();
              const sourceState = String(source?.state ?? '').trim();
              const sourceViewType = normalizeFacilityViewTypeKey(source?.viewType);

              if (sourceState !== 'pending' || !taskRef || !taskScheduleRef) {
                setDragOverTarget(null);
                return;
              }
              if (sourceViewType !== normalizedViewType || sourceViewType === 'daily') {
                setDragOverTarget(null);
                return;
              }
              if (String(source?.rowId) !== String(rowId)) {
                showFacilityTrackerDragError(
                  'You can only reschedule a planned task within the same row.',
                );
                setDraggedPlannedSource(null);
                setDragOverTarget(null);
                setDragPreview({ visible: false, x: 0, y: 0 });
                return;
              }
              if (source?.rowId === rowId && source?.colKey === col.key) {
                setDragOverTarget(null);
                return;
              }

              const moveTo = getMoveToValueForFacilityDrop({
                viewTypeRaw: viewType,
                targetCol: col,
              });
              if (!moveTo) {
                setDragOverTarget(null);
                return;
              }

              try {
                await dispatch(
                  updateFacilityTrackerTaskScheduleThunk({
                    task_ref: taskRef,
                    task_schedule_ref: taskScheduleRef,
                    move_to: moveTo,
                  }),
                ).unwrap();
                reloadFacilityTaskList();
              } catch (error) {
                showErrorToast(extractErrorMessage(error));
              } finally {
                setDraggedPlannedSource(null);
                setDragOverTarget(null);
                setDragPreview({ visible: false, x: 0, y: 0 });
              }
            };

            const handleDragStart = (event) => {
              if (!isDraggablePlanned) return;
              const payload = JSON.stringify({
                rowId,
                colKey: col.key,
                taskRef: refs.taskRef,
                taskScheduleRef: refs.scheduleRef,
                state: normalizedStatus,
                viewType: normalizedViewType,
              });
              event.stopPropagation();
              event.dataTransfer.setData('application/json', payload);
              event.dataTransfer.setData('text/plain', payload);
              event.dataTransfer.effectAllowed = 'move';
              setDraggedPlannedSource({
                rowId,
                colKey: col.key,
                taskRef: refs.taskRef,
                taskScheduleRef: refs.scheduleRef,
                state: normalizedStatus,
                viewType: normalizedViewType,
              });
              setDragPreview({ visible: true, x: event.clientX, y: event.clientY });
            };

            const handleDragEnd = (event) => {
              event.stopPropagation();
              setDraggedPlannedSource(null);
              setDragOverTarget(null);
              setDragPreview({ visible: false, x: 0, y: 0 });
            };

            const handleDragOver = (event) => {
              if (!isDropTarget || isDailyView) return;
              event.preventDefault();
              event.stopPropagation();
              if (draggedPlannedSource && String(draggedPlannedSource.rowId) !== String(rowId)) {
                try {
                  event.dataTransfer.dropEffect = 'none';
                } catch {
                  /* ignore */
                }
                return;
              }
              try {
                event.dataTransfer.dropEffect = 'move';
              } catch {
                /* ignore */
              }
              setDragOverTarget({ rowId, colKey: col.key });
            };

            const handleDrop = async (event) => {
              if (!isDropTarget || isDailyView) return;
              event.preventDefault();
              event.stopPropagation();

              let payload = null;
              try {
                const rawPayload =
                  event.dataTransfer.getData('application/json') ||
                  event.dataTransfer.getData('text/plain');
                if (rawPayload) payload = JSON.parse(rawPayload);
              } catch {
                payload = null;
              }

              await dropFromSource(payload ?? draggedPlannedSource);
            };

            const handleMouseDown = (event) => {
              if (!isDraggablePlanned) return;
              event.preventDefault();
              event.stopPropagation();
              setDraggedPlannedSource({
                rowId,
                colKey: col.key,
                taskRef: refs.taskRef,
                taskScheduleRef: refs.scheduleRef,
                state: normalizedStatus,
                viewType: normalizedViewType,
              });
              setDragPreview({ visible: true, x: event.clientX, y: event.clientY });
            };

            const handleMouseEnter = (event) => {
              if (!draggedPlannedSource) return;
              event.stopPropagation();
              if (String(draggedPlannedSource.rowId) !== String(rowId)) {
                return;
              }
              if (!isDropTarget || isDailyView) {
                if (isDragOverTarget) setDragOverTarget(null);
                return;
              }
              if (draggedPlannedSource.rowId === rowId && draggedPlannedSource.colKey === col.key) {
                return;
              }
              setDragOverTarget({ rowId, colKey: col.key });
            };

            const handleMouseUp = async (event) => {
              if (!draggedPlannedSource) return;
              event.preventDefault();
              event.stopPropagation();
              if (!isDropTarget || isDailyView) return;
              await dropFromSource(draggedPlannedSource);
            };

            return (
              <div
                className={cn(
                  'flex w-full min-h-[32px] items-center justify-center rounded',
                  openable && 'cursor-pointer hover:bg-bg-weak-50',
                  isDraggablePlanned && 'cursor-grab active:cursor-grabbing',
                  isDragOverTarget && 'ring-1 ring-primary-base bg-primary-lighter/30',
                )}
                onClick={(event) => {
                  if (openable) handleOpenFacilityCell(event, original, col.key);
                  else event.stopPropagation();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (openable) handleOpenFacilityCell(event, original, col.key);
                  } else {
                    event.stopPropagation();
                  }
                }}
                role={openable ? 'button' : 'presentation'}
                tabIndex={openable ? 0 : undefined}
                draggable={isDraggablePlanned}
                onDragStart={handleDragStart}
                onDrag={(event) => {
                  if (!draggedPlannedSource) return;
                  if (event.clientX === 0 && event.clientY === 0) return;
                  setDragPreview({ visible: true, x: event.clientX, y: event.clientY });
                }}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={(event) => {
                  event.stopPropagation();
                  const { relatedTarget, currentTarget } = event;
                  if (relatedTarget instanceof Node && currentTarget.contains(relatedTarget)) {
                    return;
                  }
                  if (isDragOverTarget) setDragOverTarget(null);
                }}
                onDrop={handleDrop}
                onMouseDown={handleMouseDown}
                onMouseEnter={handleMouseEnter}
                onMouseUp={handleMouseUp}
              >
                <span className='pointer-events-none flex size-full items-center justify-center'>
                  <FacilityTrackerApiCellIcon
                    status={st}
                    viewType={original.facilityListViewType}
                  />
                </span>
              </div>
            );
          }

          const cellState = original.statusByPeriod[col.key];
          const isDraggablePlanned = cellState === 'planned';
          const isDropTarget = cellState === 'empty';
          const isDragOverTarget =
            dragOverTarget?.rowId === rowId && dragOverTarget?.colKey === col.key;

          const handleDragStart = (event) => {
            if (!isDraggablePlanned) return;
            event.stopPropagation();
            const payload = JSON.stringify({ rowId, colKey: col.key, state: cellState });
            event.dataTransfer.setData('application/json', payload);
            event.dataTransfer.setData('text/plain', payload);
            event.dataTransfer.effectAllowed = 'move';
            setDraggedPlannedSource({ rowId, colKey: col.key });
            setDragPreview({ visible: true, x: event.clientX, y: event.clientY });
          };

          const handleDragEnd = (event) => {
            event.stopPropagation();
            setDraggedPlannedSource(null);
            setDragOverTarget(null);
            setDragPreview({ visible: false, x: 0, y: 0 });
          };

          const handleDrag = (event) => {
            if (!draggedPlannedSource) return;
            if (event.clientX === 0 && event.clientY === 0) return;
            setDragPreview({ visible: true, x: event.clientX, y: event.clientY });
          };

          const handleDragOver = (event) => {
            if (!isDropTarget) return;
            event.preventDefault();
            event.stopPropagation();
            if (draggedPlannedSource && String(draggedPlannedSource.rowId) !== String(rowId)) {
              try {
                event.dataTransfer.dropEffect = 'none';
              } catch {
                /* ignore */
              }
              return;
            }
            try {
              event.dataTransfer.dropEffect = 'move';
            } catch {
              /* ignore */
            }
            setDragOverTarget({ rowId, colKey: col.key });
          };

          const handleDragLeave = (event) => {
            event.stopPropagation();
            const { relatedTarget, currentTarget } = event;
            if (relatedTarget instanceof Node && currentTarget.contains(relatedTarget)) {
              return;
            }
            if (isDragOverTarget) setDragOverTarget(null);
          };

          const handleDrop = (event) => {
            if (!isDropTarget) return;
            event.preventDefault();
            event.stopPropagation();

            let payload;
            try {
              const rawPayload =
                event.dataTransfer.getData('application/json') ||
                event.dataTransfer.getData('text/plain');
              payload = JSON.parse(rawPayload);
            } catch {
              setDragOverTarget(null);
              return;
            }

            if (!payload || payload.state !== 'planned') {
              setDragOverTarget(null);
              return;
            }

            const sourceRowId = payload.rowId;
            const sourceColKey = payload.colKey;

            if (!sourceRowId || !sourceColKey) {
              setDragOverTarget(null);
              return;
            }

            if (sourceRowId === rowId && sourceColKey === col.key) {
              setDragOverTarget(null);
              return;
            }

            if (String(sourceRowId) !== String(rowId)) {
              showFacilityTrackerDragError(
                'You can only reschedule a planned task within the same row.',
              );
              setDraggedPlannedSource(null);
              setDragOverTarget(null);
              setDragPreview({ visible: false, x: 0, y: 0 });
              return;
            }

            movePlannedStatus(sourceRowId, sourceColKey, rowId, col.key);
            setDraggedPlannedSource(null);
            setDragOverTarget(null);
            setDragPreview({ visible: false, x: 0, y: 0 });
          };

          const movePlannedToTarget = (sourceRowId, sourceColKey) => {
            if (!isDropTarget) return;
            if (!sourceRowId || !sourceColKey) return;
            if (sourceRowId === rowId && sourceColKey === col.key) return;
            if (String(sourceRowId) !== String(rowId)) {
              showFacilityTrackerDragError(
                'You can only reschedule a planned task within the same row.',
              );
              setDraggedPlannedSource(null);
              setDragOverTarget(null);
              setDragPreview({ visible: false, x: 0, y: 0 });
              return;
            }

            movePlannedStatus(sourceRowId, sourceColKey, rowId, col.key);
            setDraggedPlannedSource(null);
            setDragOverTarget(null);
            setDragPreview({ visible: false, x: 0, y: 0 });
          };

          const handleMouseDown = (event) => {
            if (!isDraggablePlanned) return;
            event.preventDefault();
            event.stopPropagation();
            setDraggedPlannedSource({ rowId, colKey: col.key });
            setDragPreview({ visible: true, x: event.clientX, y: event.clientY });
          };

          const handleMouseEnter = (event) => {
            if (!draggedPlannedSource) return;
            event.stopPropagation();
            if (String(draggedPlannedSource.rowId) !== String(rowId)) {
              return;
            }
            if (!isDropTarget) {
              if (isDragOverTarget) setDragOverTarget(null);
              return;
            }
            if (draggedPlannedSource.rowId === rowId && draggedPlannedSource.colKey === col.key) {
              return;
            }
            setDragOverTarget({ rowId, colKey: col.key });
          };

          const handleMouseUp = (event) => {
            if (!draggedPlannedSource) return;
            event.preventDefault();
            event.stopPropagation();
            movePlannedToTarget(draggedPlannedSource.rowId, draggedPlannedSource.colKey);
          };

          return (
            <div
              className={`w-full flex items-center justify-center rounded ${
                isDragOverTarget ? 'ring-1 ring-primary-base bg-primary-lighter/30' : ''
              } ${isDraggablePlanned ? 'cursor-grab active:cursor-grabbing' : ''}`}
              draggable={isDraggablePlanned}
              onDragStart={handleDragStart}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onMouseDown={handleMouseDown}
              onMouseEnter={handleMouseEnter}
              onMouseUp={handleMouseUp}
              onClick={(event) => event.stopPropagation()}
              aria-label={`status-${rowId}-${col.key}`}
            >
              <span className='pointer-events-none flex size-full items-center justify-center'>
                <StatusIcon state={cellState} />
              </span>
            </div>
          );
        },
      });
    });

    return defs;
  }, [
    isMyTaskTab,
    visibleColumns,
    facilityGridPeriodColumns,
    dragOverTarget,
    draggedPlannedSource,
    dispatch,
    facilityListViewType,
    handleOpenFacilityCell,
    handleRowClick,
    reloadFacilityTaskList,
    listFilterMonthDate,
    yearDate,
    supervisorAssigneeOptions,
  ]);

  /** Tracker only: pin identity columns left so period (check) columns scroll. My Task: no pinning. */
  const facilityTableLeftPinned = useMemo(() => {
    if (isMyTaskTab) return [];
    const pinned = ['name', 'assignee'];
    if (visibleColumns.includes('floor')) pinned.push('floor');
    if (visibleColumns.includes('startDate')) pinned.push('startDate');
    return pinned;
  }, [isMyTaskTab, visibleColumns]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      columnPinning: {
        left: facilityTableLeftPinned,
      },
    },
    getCoreRowModel: getCoreRowModel(),
  });

  useEffect(() => {
    if (!draggedPlannedSource) return undefined;

    const handleGlobalMouseMove = (event) => {
      setDragPreview({ visible: true, x: event.clientX, y: event.clientY });
    };

    const handleGlobalMouseUp = () => {
      setDraggedPlannedSource(null);
      setDragOverTarget(null);
      setDragPreview({ visible: false, x: 0, y: 0 });
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggedPlannedSource]);

  const handleExecuteSubmit = useCallback(
    async ({ checklist_data, task_photos }) => {
      if (!selectedTask) return;
      const taskRef = String(selectedTask?.facility_task ?? '').trim();
      const scheduleRef = String(selectedTask?.task_schedule_ref ?? '').trim();
      if (!taskRef || !scheduleRef) return;
      try {
        await dispatch(
          submitFacilityMyTaskChecklistThunk({
            task_ref: taskRef,
            task_schedule_ref: scheduleRef,
            checklist_data,
            task_photos,
          }),
        ).unwrap();
        showSuccessToast('Task submitted successfully');
        setIsViewDrawerOpen(false);
        setSelectedTask(null);
        dispatch(clearFacilityTrackerTaskDetail());
        dispatch(clearSubmitMyTaskChecklistState());
        reloadMyTaskList();
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      }
    },
    [dispatch, reloadMyTaskList, selectedTask],
  );

  useEffect(() => {
    if (!isViewDrawerOpen || drawerMode === 'execute' || !selectedTask) {
      dispatch(clearFacilityTaskComments());
      return;
    }
    const taskRef = String(
      selectedTask?.task_ref ?? selectedTask?.facility_task ?? selectedTask?.name ?? '',
    ).trim();
    const scheduleRef = String(selectedTask?.task_schedule_ref ?? '').trim();
    if (!taskRef) return;
    dispatch(fetchFacilityTaskCommentsThunk({ task_ref: taskRef, task_schedule_ref: scheduleRef }));
  }, [dispatch, isViewDrawerOpen, selectedTask, drawerMode]);

  const handleAddFacilityComment = useCallback(
    async (taskRef, content, attachments, _visibleToClient, parentCommentId) => {
      const scheduleRef = String(selectedTask?.task_schedule_ref ?? '').trim();
      try {
        await dispatch(
          addFacilityTaskCommentThunk({
            task_ref: taskRef,
            task_schedule_ref: scheduleRef,
            content,
            attachments,
            parentCommentId,
          }),
        ).unwrap();
        dispatch(
          fetchFacilityTaskCommentsThunk({ task_ref: taskRef, task_schedule_ref: scheduleRef }),
        );
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
        throw error;
      }
    },
    [dispatch, selectedTask],
  );

  const handleRefreshFacilityComments = useCallback(() => {
    const taskRef = String(
      selectedTask?.task_ref ?? selectedTask?.facility_task ?? selectedTask?.name ?? '',
    ).trim();
    const scheduleRef = String(selectedTask?.task_schedule_ref ?? '').trim();
    if (!taskRef) return;
    dispatch(fetchFacilityTaskCommentsThunk({ task_ref: taskRef, task_schedule_ref: scheduleRef }));
  }, [dispatch, selectedTask]);

  const handleLoadMoreTrackerTasks = useCallback(() => {
    if (
      isMyTaskTab ||
      !selectedCenterId ||
      !facilityTaskListHasMore ||
      facilityTaskListLoadingMore
    ) {
      return;
    }

    const monthYm = format(listFilterMonthDate, 'yyyy-MM');
    const weeklyAnchor =
      normalizeFacilityWeekStart(weekDate) || normalizeFacilityWeekStart(new Date());
    const annualYear = extractYear(yearDate);

    const payload = {
      tracker_name: activeTab,
      center: selectedCenterId,
      tab: taskTabFilter,
      page: (facilityTaskListPage || 1) + 1,
      limit_page_length: facilityTaskListPageSize || 20,
      order_by: 'start_date asc',
      keyword: debouncedKeyword.trim(),
      filters: facilityTupleFilters,
      group_by: groupBy,
      group_order: groupOrder,
      append: true,
    };

    if (trackerMode === 'weekly' && weeklyAnchor) {
      payload.date = weeklyAnchor;
    } else if (trackerMode === 'annually' && annualYear) {
      payload.year = annualYear;
    } else if ((trackerMode === 'daily' || trackerMode === 'monthly') && monthYm) {
      payload.month = monthYm;
    }

    dispatch(fetchFacilityTrackerTaskListviewThunk(payload));
  }, [
    activeTab,
    debouncedKeyword,
    dispatch,
    facilityTaskListHasMore,
    facilityTaskListLoadingMore,
    facilityTaskListPage,
    facilityTaskListPageSize,
    facilityTupleFilters,
    groupBy,
    groupOrder,
    isMyTaskTab,
    listFilterMonthDate,
    selectedCenterId,
    taskTabFilter,
    trackerMode,
    weekDate,
    yearDate,
  ]);

  const handleLoadMoreMyTasks = useCallback(() => {
    if (!isMyTaskTab || !selectedCenterId || !myTaskListHasMore || myTaskListLoadingMore) return;
    const viewTypeMap = {
      all: '',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      annually: 'Annually',
    };
    const myTaskStatusMap = {
      all: 'all',
      pending: 'pending',
      missed: 'missed',
      completed: 'completed',
      partially_completed: 'partially_completed',
    };
    dispatch(
      fetchFacilityMyTaskListviewThunk({
        center: selectedCenterId,
        view_type: viewTypeMap[taskTypeFilter] ?? '',
        status: myTaskStatusMap[taskTabFilter] ?? 'all',
        keyword: debouncedKeyword.trim(),
        filters: facilityTupleFilters,
        group_by: groupBy,
        group_order: groupOrder,
        page: (myTaskListPage || 1) + 1,
        limit_page_length: myTaskListPageSize || 20,
        append: true,
      }),
    );
  }, [
    isMyTaskTab,
    selectedCenterId,
    myTaskListHasMore,
    myTaskListLoadingMore,
    taskTypeFilter,
    taskTabFilter,
    facilityTupleFilters,
    dispatch,
    debouncedKeyword,
    myTaskListPage,
    myTaskListPageSize,
    groupBy,
    groupOrder,
  ]);

  const listHasMore = isMyTaskTab ? myTaskListHasMore : facilityTaskListHasMore;
  const listLoadingMore = isMyTaskTab ? myTaskListLoadingMore : facilityTaskListLoadingMore;
  const listLoading = isMyTaskTab ? myTaskListLoading : facilityTaskListLoading;

  const handleLoadMore = useCallback(() => {
    if (isMyTaskTab) {
      handleLoadMoreMyTasks();
    } else {
      handleLoadMoreTrackerTasks();
    }
  }, [handleLoadMoreMyTasks, handleLoadMoreTrackerTasks, isMyTaskTab]);

  const { sentinelRef } = useScrollPagination({
    onLoadMore: handleLoadMore,
    hasMore: listHasMore,
    isLoading: listLoadingMore || listLoading,
    threshold: 200,
    scrollContainer: tableScrollElement,
    enabled: Boolean(selectedCenterId && listHasMore && !groupBy),
  });

  return (
    <PageLayout
      pageTitle='Tracker'
      pageIcon={<RiCalendarLine size={24} />}
      pageDescription='Manage all your facility trackers.'
    >
      <div className='w-full h-full px-6 pb-6 flex flex-col gap-5'>
        <TabMenuHorizontal.Root value={activeTab} onValueChange={setActiveTab}>
          <TabMenuHorizontal.List
            className='gap-6 border-y-0 border-b-1 '
            wrapperClassName='w-full'
          >
            {facilityMainTabs.map((tab) => (
              <TabMenuHorizontal.Trigger key={tab} value={tab}>
                {tab}
              </TabMenuHorizontal.Trigger>
            ))}
          </TabMenuHorizontal.List>
        </TabMenuHorizontal.Root>

        <div className='w-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          {isMyTaskTab && (
            <ButtonGroup.Root>
              <ButtonGroup.Item
                className='data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
                onClick={() => setTaskTypeFilter('all')}
                data-state={taskTypeFilter === 'all' ? 'on' : 'off'}
              >
                All
              </ButtonGroup.Item>
              <ButtonGroup.Item
                className='data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
                onClick={() => setTaskTypeFilter('daily')}
                data-state={taskTypeFilter === 'daily' ? 'on' : 'off'}
              >
                Daily
              </ButtonGroup.Item>
              <ButtonGroup.Item
                className='data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
                onClick={() => setTaskTypeFilter('weekly')}
                data-state={taskTypeFilter === 'weekly' ? 'on' : 'off'}
              >
                Weekly
              </ButtonGroup.Item>
              <ButtonGroup.Item
                className='data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
                onClick={() => setTaskTypeFilter('monthly')}
                data-state={taskTypeFilter === 'monthly' ? 'on' : 'off'}
              >
                Monthly
              </ButtonGroup.Item>
              <ButtonGroup.Item
                className='data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
                onClick={() => setTaskTypeFilter('annually')}
                data-state={taskTypeFilter === 'annually' ? 'on' : 'off'}
              >
                Annually
              </ButtonGroup.Item>
            </ButtonGroup.Root>
          )}

          {!isMyTaskTab && (
            <Input.Root size='xsmall' className='w-full sm:w-[340px]'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  placeholder='Search tasks'
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </Input.Wrapper>
            </Input.Root>
          )}

          <div className='flex items-center gap-2'>
            {isMyTaskTab && (
              <Input.Root size='xsmall' className='w-full'>
                <Input.Wrapper>
                  <Input.Icon as={RiSearchLine} />
                  <Input.Input
                    placeholder='Search facility'
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </Input.Wrapper>
              </Input.Root>
            )}

            {!isMyTaskTab && trackerMode === 'weekly' && (
              <FacilityListWeekToolbar
                value={weekDate}
                onWeekChange={(value) => setWeekDate(normalizeFacilityWeekStart(value))}
              />
            )}

            {!isMyTaskTab && trackerMode === 'annually' && (
              <FacilityListYearToolbar value={yearDate} onYearChange={setYearDate} />
            )}

            {!isMyTaskTab && trackerMode !== 'weekly' && trackerMode !== 'annually' && (
              <FacilityListMonthToolbar
                value={listFilterMonthDate}
                onMonthChange={setListFilterMonthDate}
              />
            )}

            <Dropdown.Root
              open={centerDropdownOpen}
              onOpenChange={(open) => {
                setCenterDropdownOpen(open);
                if (!open) setCenterSearch('');
              }}
            >
              <Dropdown.Trigger asChild>
                <Button.Root
                  type='button'
                  size='small'
                  variant='neutral'
                  mode='stroke'
                  className='gap-2 min-w-[120px] justify-between'
                  disabled={centersLoading || !centersFromApi?.length}
                >
                  <span className='truncate'>{selectedCenterLabel}</span>
                  <Button.Icon as={RiArrowDownSLine} />
                </Button.Root>
              </Dropdown.Trigger>

              <Dropdown.Content className='min-w-[220px]'>
                <div className='p-2 border-b border-stroke-soft-200'>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Icon as={RiSearchLine} />
                      <Input.Input
                        placeholder='Search centers…'
                        value={centerSearch}
                        onChange={(e) => setCenterSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
                <div className='max-h-[240px] overflow-y-auto'>
                  {filteredCenters.length === 0 ? (
                    <div className='px-3 py-2 text-paragraph-sm text-text-sub-500'>
                      No centers found
                    </div>
                  ) : (
                    filteredCenters.map((c) => (
                      <Dropdown.Item
                        key={c.name}
                        onSelect={() => {
                          setSelectedCenterId(c.name);
                          setCenterSearch('');
                        }}
                        className={selectedCenterId === c.name ? 'bg-bg-weak-50' : ''}
                      >
                        {c.center_name || c.name}
                      </Dropdown.Item>
                    ))
                  )}
                </div>
              </Dropdown.Content>
            </Dropdown.Root>

            <Dropdown.Root>
              <Dropdown.Trigger asChild>
                <Button.Root
                  type='button'
                  size='small'
                  variant='neutral'
                  mode='stroke'
                  className='gap-2 min-w-[140px] justify-between'
                >
                  <span className='truncate'>{taskTabFilterLabel}</span>
                  <Button.Icon as={RiArrowDownSLine} />
                </Button.Root>
              </Dropdown.Trigger>

              <Dropdown.Content className='w-[200px]'>
                {TASK_TAB_OPTIONS.map((opt) => (
                  <Dropdown.Item key={opt.value} onSelect={() => setTaskTabFilter(opt.value)}>
                    {opt.label}
                  </Dropdown.Item>
                ))}
              </Dropdown.Content>
            </Dropdown.Root>

            <Popover.Root open={isGroupByOpen} onOpenChange={setIsGroupByOpen}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <Popover.Trigger asChild>
                    <Button.Root
                      variant={groupBy ? 'primary' : 'neutral'}
                      mode={groupBy ? 'lighter' : 'stroke'}
                      size='small'
                      className={`gap-2 flex items-center justify-center ${groupBy ? 'ring-1 ring-primary-base' : ''}`}
                      aria-label='Group By'
                    >
                      <Button.Icon as={RiStackLine} />
                      {groupBy && (
                        <span className='label-small'>
                          {FACILITY_GROUP_BY_OPTIONS.find((o) => o.value === groupBy)?.label}
                        </span>
                      )}
                      {groupBy ? (
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <span
                              className='cursor-pointer flex items-center justify-center'
                              onClick={(e) => {
                                e.stopPropagation();
                                setGroupOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                              }}
                            >
                              {groupOrder === 'asc' ? (
                                <RiArrowUpLine size={20} />
                              ) : (
                                <RiArrowDownLine size={20} />
                              )}
                            </span>
                          </Tooltip.Trigger>
                          <Tooltip.Content>
                            <span className='paragraph-xsmall'>
                              {groupOrder === 'asc' ? 'Asc' : 'Desc'}
                            </span>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      ) : null}
                      {groupBy && (
                        <RiCloseLine
                          onClick={(e) => {
                            e.stopPropagation();
                            setGroupBy('');
                          }}
                          size={18}
                          className='text-primary-dark bg-primary-light rounded-sm'
                        />
                      )}
                    </Button.Root>
                  </Popover.Trigger>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <span className='paragraph-xsmall'>Group-By</span>
                </Tooltip.Content>
              </Tooltip.Root>

              <Popover.Content align='end' className='w-[300px] p-3'>
                <div className='flex w-full flex-col gap-2'>
                  <div className='w-full flex items-center justify-between'>
                    <span className='text-subheading-2xs text-text-soft-400'>GROUP BY</span>
                    <LinkButton.Root
                      variant='primary'
                      size='small'
                      disabled={!groupBy}
                      onClick={() => {
                        setGroupOrder('asc');
                        setGroupBy('');
                        setIsGroupByOpen(false);
                      }}
                    >
                      Clear
                    </LinkButton.Root>
                  </div>

                  <Select.Root
                    value={groupBy || ''}
                    onValueChange={(value) => {
                      setGroupBy(value);
                      setIsGroupByOpen(false);
                    }}
                    size='small'
                  >
                    <Select.Trigger className='w-full'>
                      <Select.Value placeholder='Select field' />
                    </Select.Trigger>
                    <Select.Content>
                      {FACILITY_GROUP_BY_OPTIONS.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value}>
                          {opt.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>

                  <ButtonGroup.Root>
                    <ButtonGroup.Item
                      data-state={groupOrder === 'asc' ? 'on' : 'off'}
                      onClick={() => setGroupOrder('asc')}
                      className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
                    >
                      <ButtonGroup.Icon
                        data-state={groupOrder === 'asc' ? 'on' : 'off'}
                        className='data-[state=on]:text-primary-base'
                        as={RiArrowUpLine}
                      />
                      Ascending
                    </ButtonGroup.Item>
                    <ButtonGroup.Item
                      data-state={groupOrder === 'desc' ? 'on' : 'off'}
                      onClick={() => setGroupOrder('desc')}
                      className='w-full data-[state=on]:ring-1 data-[state=on]:bg-primary-lighter data-[state=on]:z-1 data-[state=on]:ring-primary-base'
                    >
                      <ButtonGroup.Icon
                        data-state={groupOrder === 'desc' ? 'on' : 'off'}
                        className='data-[state=on]:text-primary-base'
                        as={RiArrowDownLine}
                      />
                      Descending
                    </ButtonGroup.Item>
                  </ButtonGroup.Root>
                </div>
              </Popover.Content>
            </Popover.Root>

            <Popover.Root open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <Filter.TriggerButton
                filterCount={appliedFacilityFilterCount}
                tooltipContent='Filter'
                ariaLabel='Filter tasks'
                disabled={!selectedCenterId}
                onClear={(event) => {
                  event?.stopPropagation?.();
                  handleFacilityFilterClear();
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
                  <Filter.Header title='FILTERS' onClear={handleFacilityFilterClear} />
                  <Filter.Body>
                    <Filter.Sidebar width='180px'>
                      <TabMenuVertical.Root
                        value={facilityFilterTab}
                        onValueChange={setFacilityFilterTab}
                      >
                        <TabMenuVertical.List className='p-2 border-r-0'>
                          <TabMenuVertical.Trigger
                            className='w-full flex items-center justify-between'
                            value='floor'
                          >
                            Floor
                            {filterFloor.length > 0 ? (
                              <Badge.Root
                                size='medium'
                                variant='filled'
                                className='shrink-0 rounded-full bg-black'
                              >
                                {filterFloor.length}
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
                            {filterAssignee.length > 0 ? (
                              <Badge.Root
                                size='medium'
                                variant='filled'
                                className='shrink-0 rounded-full bg-black'
                              >
                                {filterAssignee.length}
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
                        options={filteredFacilityFilterOptions}
                        selectedValues={facilityFilterSelectedValues}
                        onToggle={facilityFilterOnToggle}
                        searchValue={facilityFilterSearch}
                        onSearchChange={setFacilityFilterSearch}
                        virtualized={false}
                        isLoading={facilityFilterListIsLoading}
                        emptyMessage={facilityFilterListEmptyMessage}
                      />
                    </Filter.Content>
                  </Filter.Body>
                </Filter.Root>
              ) : null}
            </Popover.Root>
          </div>
        </div>

        {!isMyTaskTab && !facilityTaskListLoading && (facilityTasks ?? []).length === 0 ? (
          <div className='w-full h-full flex-col flex items-center justify-center py-16'>
            <UserAbsentSvg className='w-40 h-40' />
            <span className='text-[var(--color-text-sub-500)] paragraph-small'>
              No Tasks found for this tracker
            </span>
          </div>
        ) : groupBy ? (
          <FacilityGroupedView
            sortedKeys={groupedData.sortedKeys}
            groups={groupedData.groups}
            columns={columns}
            facilityTableLeftPinned={facilityTableLeftPinned}
            isMyTaskTab={isMyTaskTab}
            facilityPeriodColMinClass={facilityPeriodColMinClass}
            onRowClick={handleRowClick}
            facilityTaskListLoading={facilityTaskListLoading}
            myTaskListLoading={myTaskListLoading}
          />
        ) : (
          <div className='w-full rounded-xl border border-stroke-soft-200 bg-bg-white- overflow-hidden'>
            <div
              ref={(element) => {
                tableScrollRef.current = element;
                setTableScrollElement(element);
              }}
              className='w-full overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]'
            >
              <Table.Root variant='compact' tableInstance={table} className='overflow-visible'>
                <Table.Header>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <Table.Row key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <Table.Head
                          key={header.id}
                          column={header.column}
                          className={
                            isMyTaskTab
                              ? header.column.id === 'name'
                                ? 'min-w-[220px]'
                                : 'min-w-[140px]'
                              : header.column.id === 'name'
                                ? 'min-w-[150px]'
                                : header.column.id === 'assignee'
                                  ? 'min-w-[150px]'
                                  : header.column.id === 'floor'
                                    ? 'min-w-[100px]'
                                    : header.column.id === 'startDate'
                                      ? 'min-w-[100px]'
                                      : facilityPeriodColMinClass
                          }
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </Table.Head>
                      ))}
                    </Table.Row>
                  ))}
                </Table.Header>
                <Table.Body spacing={8}>
                  {isMyTaskTab && myTaskListLoading && tableData.length === 0 ? (
                    <Table.Row>
                      <Table.Cell
                        colSpan={columns.length}
                        className='paragraph-small text-text-sub-600 py-8 text-center'
                      >
                        Loading tasks…
                      </Table.Cell>
                    </Table.Row>
                  ) : null}
                  {!isMyTaskTab && facilityTaskListLoading && tableData.length === 0 ? (
                    <Table.Row>
                      <Table.Cell
                        colSpan={columns.length}
                        className='paragraph-small text-text-sub-600 py-8 text-center'
                      >
                        Loading tasks…
                      </Table.Cell>
                    </Table.Row>
                  ) : null}
                  {isMyTaskTab && !myTaskListLoading && tableData.length === 0 ? (
                    <Table.Row>
                      <Table.Cell
                        colSpan={columns.length}
                        className='paragraph-small text-text-sub-600 py-8 text-center'
                      >
                        No tasks found
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    table.getRowModel().rows.map((row, rowIndex, rows) => (
                      <React.Fragment key={row.id}>
                        <Table.Row
                          onClick={!isMyTaskTab ? undefined : (event) => event.stopPropagation()}
                          className={
                            isMyTaskTab
                              ? 'hover:bg-bg-weak-50 transition-colors'
                              : 'hover:bg-bg-weak-50/50 transition-colors'
                          }
                        >
                          {row.getVisibleCells().map((cell) => (
                            <Table.Cell
                              key={cell.id}
                              column={cell.column}
                              className={
                                isMyTaskTab
                                  ? cell.column.id === 'name'
                                    ? 'min-w-[220px]'
                                    : 'min-w-[140px]'
                                  : cell.column.id === 'name'
                                    ? 'min-w-[150px]'
                                    : cell.column.id === 'assignee'
                                      ? 'min-w-[150px]'
                                      : cell.column.id === 'floor'
                                        ? 'min-w-[100px]'
                                        : cell.column.id === 'startDate'
                                          ? 'min-w-[100px]'
                                          : facilityPeriodColMinClass
                              }
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </Table.Cell>
                          ))}
                        </Table.Row>
                        {rowIndex < rows.length - 1 && <Table.RowDivider />}
                      </React.Fragment>
                    ))
                  )}
                  {listHasMore ? (
                    <Table.Row>
                      <Table.Cell colSpan={columns.length} className='h-1 p-0'>
                        <div ref={sentinelRef} data-scroll-sentinel className='h-px w-full' />
                      </Table.Cell>
                    </Table.Row>
                  ) : null}
                  {listLoadingMore ? (
                    <Table.Row>
                      <Table.Cell
                        colSpan={columns.length}
                        className='paragraph-small text-text-sub-600 py-4 text-center'
                      >
                        Loading more…
                      </Table.Cell>
                    </Table.Row>
                  ) : null}
                </Table.Body>
              </Table.Root>
            </div>
          </div>
        )}
      </div>
      <FacilityTrackerViewDrawer
        isOpen={isViewDrawerOpen}
        onClose={() => {
          setIsViewDrawerOpen(false);
          setDrawerMode('facility');
          setSelectedTask(null);
          dispatch(clearFacilityTrackerTaskDetail());
          dispatch(clearSubmitMyTaskChecklistState());
          dispatch(clearFacilityTaskComments());
        }}
        drawerMode={drawerMode}
        task={selectedTask}
        facilityDetail={facilityTaskDetail}
        facilityDetailLoading={facilityTaskDetailLoading}
        facilityDetailError={facilityTaskDetailError}
        isExecuteSubmitting={submitMyTaskChecklistLoading}
        onExecuteSubmit={handleExecuteSubmit}
        assigneeOptions={facilityDrawerAssigneeOptions}
        centerLabel={selectedCenterLabel}
        commentsData={facilityTaskCommentsData}
        commentsLoading={facilityTaskCommentsLoading}
        commentsFetchStatus={facilityTaskCommentsState.status}
        onAddComment={handleAddFacilityComment}
        onRefreshComments={handleRefreshFacilityComments}
      />

      {dragPreview.visible && draggedPlannedSource && (
        <div
          className='fixed pointer-events-none z-50'
          style={{ left: dragPreview.x + 12, top: dragPreview.y + 12 }}
        >
          <Badge.Root variant='light' color='blue' size='small'>
            <Badge.Icon as={RiTimeLine} />
            Planned
          </Badge.Root>
        </div>
      )}
    </PageLayout>
  );
};

export default FacilityTrackerPage;
