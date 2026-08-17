import {
  format,
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  getHours,
  getMinutes,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { resolveBadgeColor } from '@/components/ui/circular-progress';
import { findBoardStatusOption } from '@/pages/boards/utils/task-statuses-utils';
import { parseToDate } from '@/utils/date-utils';
import {
  boardTaskDateIncludesTime,
  serializeBoardTaskDate,
} from '../../utils/board-task-date-utils';

export const BOARD_CALENDAR_WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const BOARD_CALENDAR_WEEKDAY_LABELS_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
export const BOARD_CALENDAR_MAX_VISIBLE = 5;
export const BOARD_CALENDAR_LABEL_MAX_LENGTH = 22;

export const BOARD_CALENDAR_LAYOUT_MODES = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
};

export const BOARD_CALENDAR_LAYOUT_OPTIONS = [
  { value: BOARD_CALENDAR_LAYOUT_MODES.DAY, label: 'Day' },
  { value: BOARD_CALENDAR_LAYOUT_MODES.WEEK, label: 'Week' },
  { value: BOARD_CALENDAR_LAYOUT_MODES.MONTH, label: 'Month' },
];

export const DEFAULT_BOARD_CALENDAR_LAYOUT_MODE = BOARD_CALENDAR_LAYOUT_MODES.MONTH;

export const BOARD_CALENDAR_TIME_GRID = {
  START_HOUR: 0,
  END_HOUR: 23,
  HOUR_HEIGHT: 48,
  TIME_LABEL_WIDTH: 72,
  DAY_COLUMN_MIN_WIDTH: 128,
  ALL_DAY_MIN_HEIGHT: 44,
  DAY_HEADER_HEIGHT: 44,
  ALL_DAY_MAX_HEIGHT: 120,
  TASK_BLOCK_HEIGHT: 24,
};

export const BOARD_CALENDAR_DATE_FIELDS = {
  CREATION: 'creation',
  START_DATE: 'startDate',
  DUE_DATE: 'dueDate',
};

export const BOARD_CALENDAR_DATE_FIELD_OPTIONS = [
  { value: BOARD_CALENDAR_DATE_FIELDS.CREATION, label: 'Created date' },
  { value: BOARD_CALENDAR_DATE_FIELDS.START_DATE, label: 'Start date' },
  { value: BOARD_CALENDAR_DATE_FIELDS.DUE_DATE, label: 'Due date' },
];

export const DEFAULT_BOARD_CALENDAR_DATE_FIELD = BOARD_CALENDAR_DATE_FIELDS.CREATION;

export function normalizeBoardCalendarDateField(value) {
  const normalized = String(value ?? '').trim();

  if (
    normalized === BOARD_CALENDAR_DATE_FIELDS.START_DATE ||
    normalized === BOARD_CALENDAR_DATE_FIELDS.DUE_DATE
  ) {
    return normalized;
  }

  return BOARD_CALENDAR_DATE_FIELDS.CREATION;
}

function normalizeCalendarDateKey(raw) {
  if (!raw) {
    return null;
  }

  if (typeof raw === 'string') {
    return raw.slice(0, 10);
  }

  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : format(date, 'yyyy-MM-dd');
}

export function getBoardTaskCalendarRawValue(
  task = {},
  dateField = DEFAULT_BOARD_CALENDAR_DATE_FIELD,
) {
  const resolvedField = normalizeBoardCalendarDateField(dateField);

  if (resolvedField === BOARD_CALENDAR_DATE_FIELDS.START_DATE) {
    return task.startDate ?? task.start_date ?? '';
  }

  if (resolvedField === BOARD_CALENDAR_DATE_FIELDS.DUE_DATE) {
    return task.dueDate ?? task.due_date ?? '';
  }

  return task.creation ?? task.createdAt ?? task.created_at ?? '';
}

export function getBoardTaskCalendarDateKey(
  task = {},
  dateField = DEFAULT_BOARD_CALENDAR_DATE_FIELD,
) {
  return normalizeCalendarDateKey(getBoardTaskCalendarRawValue(task, dateField));
}

export function getBoardTaskCalendarUpdateFieldKey(dateField = DEFAULT_BOARD_CALENDAR_DATE_FIELD) {
  const resolvedField = normalizeBoardCalendarDateField(dateField);

  if (resolvedField === BOARD_CALENDAR_DATE_FIELDS.DUE_DATE) {
    return 'dueDate';
  }

  if (resolvedField === BOARD_CALENDAR_DATE_FIELDS.CREATION) {
    return 'dueDate';
  }

  return 'startDate';
}

export function formatBoardCalendarHourLabel(hour) {
  if (hour === 0) {
    return '12am';
  }

  if (hour < 12) {
    return `${hour}am`;
  }

  if (hour === 12) {
    return '12pm';
  }

  return `${hour - 12}pm`;
}

export function getBoardCalendarHourLabels(
  startHour = BOARD_CALENDAR_TIME_GRID.START_HOUR,
  endHour = BOARD_CALENDAR_TIME_GRID.END_HOUR,
) {
  const labels = [];

  for (let hour = startHour; hour <= endHour; hour += 1) {
    labels.push({ hour, label: formatBoardCalendarHourLabel(hour) });
  }

  return labels;
}

export function getBoardTaskTimedPlacement(
  task = {},
  dateField = DEFAULT_BOARD_CALENDAR_DATE_FIELD,
) {
  const resolvedField = normalizeBoardCalendarDateField(dateField);

  if (resolvedField === BOARD_CALENDAR_DATE_FIELDS.CREATION) {
    return null;
  }

  const raw = getBoardTaskCalendarRawValue(task, dateField);

  if (!boardTaskDateIncludesTime(raw)) {
    return null;
  }

  const date = parseToDate(raw);

  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    date,
    dateKey: format(date, 'yyyy-MM-dd'),
    source: resolvedField === BOARD_CALENDAR_DATE_FIELDS.DUE_DATE ? 'due' : 'start',
  };
}

export function getBoardTaskTimeGridTop(
  date,
  {
    startHour = BOARD_CALENDAR_TIME_GRID.START_HOUR,
    endHour = BOARD_CALENDAR_TIME_GRID.END_HOUR,
    hourHeight = BOARD_CALENDAR_TIME_GRID.HOUR_HEIGHT,
  } = {},
) {
  if (!date) {
    return null;
  }

  const hours = getHours(date);
  const minutes = getMinutes(date);

  if (hours < startHour || hours > endHour) {
    return null;
  }

  return (((hours - startHour) * 60 + minutes) / 60) * hourHeight;
}

export function layoutOverlappingTimedTasks(entries = []) {
  const groups = new Map();

  entries.forEach((entry) => {
    const key = entry.top;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(entry);
  });

  const laidOut = [];

  groups.forEach((group, top) => {
    const columnCount = group.length;

    group.forEach((entry, columnIndex) => {
      laidOut.push({
        ...entry,
        top,
        columnIndex,
        columnCount,
      });
    });
  });

  return laidOut.sort(
    (left, right) => left.top - right.top || left.columnIndex - right.columnIndex,
  );
}

export function splitBoardTasksForTimeGrid(
  tasks = [],
  dateField = DEFAULT_BOARD_CALENDAR_DATE_FIELD,
) {
  const allDayByDate = new Map();
  const timedByDate = new Map();

  for (const task of tasks || []) {
    const timedPlacement = getBoardTaskTimedPlacement(task, dateField);

    if (timedPlacement) {
      const top = getBoardTaskTimeGridTop(timedPlacement.date);
      const { dateKey } = timedPlacement;

      if (top == null) {
        if (!allDayByDate.has(dateKey)) {
          allDayByDate.set(dateKey, []);
        }

        allDayByDate.get(dateKey).push(task);
        continue;
      }

      if (!timedByDate.has(dateKey)) {
        timedByDate.set(dateKey, []);
      }

      timedByDate.get(dateKey).push({ task, top });
      continue;
    }

    const dateKey = getBoardTaskCalendarDateKey(task, dateField);

    if (!dateKey) {
      continue;
    }

    if (!allDayByDate.has(dateKey)) {
      allDayByDate.set(dateKey, []);
    }

    allDayByDate.get(dateKey).push(task);
  }

  for (const entries of timedByDate.values()) {
    entries.sort((left, right) => left.top - right.top);
  }

  return {
    allDayByDate,
    timedByDate,
  };
}

export function getBoardCalendarDayHeaderLabel(date, { compact = false } = {}) {
  return compact ? format(date, 'EEE d MMM') : format(date, 'EEEE d MMM');
}

export function getBoardCalendarCreateStartDate(date, hour = null) {
  if (hour == null || !date) {
    return '';
  }

  const next = new Date(date);
  next.setHours(hour, 0, 0, 0);
  return serializeBoardTaskDate(next, true);
}

export function isBoardCalendarWeekendDay(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function normalizeBoardCalendarLayoutMode(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (
    normalized === BOARD_CALENDAR_LAYOUT_MODES.DAY ||
    normalized === BOARD_CALENDAR_LAYOUT_MODES.WEEK
  ) {
    return normalized;
  }

  return BOARD_CALENDAR_LAYOUT_MODES.MONTH;
}

export function getBoardCalendarPeriodLabel(
  anchorDate,
  layoutMode = DEFAULT_BOARD_CALENDAR_LAYOUT_MODE,
) {
  const date = anchorDate instanceof Date ? anchorDate : new Date(anchorDate);
  const mode = normalizeBoardCalendarLayoutMode(layoutMode);

  if (mode === BOARD_CALENDAR_LAYOUT_MODES.DAY) {
    return format(date, 'EEEE, MMMM d');
  }

  if (mode === BOARD_CALENDAR_LAYOUT_MODES.WEEK) {
    return format(date, 'MMMM yyyy');
  }

  return format(startOfMonth(date), 'MMMM yyyy');
}

export function navigateBoardCalendarAnchor(anchorDate, layoutMode, delta) {
  const date = startOfDay(anchorDate instanceof Date ? anchorDate : new Date(anchorDate));
  const mode = normalizeBoardCalendarLayoutMode(layoutMode);

  if (mode === BOARD_CALENDAR_LAYOUT_MODES.DAY) {
    return startOfDay(addDays(date, delta));
  }

  if (mode === BOARD_CALENDAR_LAYOUT_MODES.WEEK) {
    return startOfDay(addWeeks(date, delta));
  }

  return startOfMonth(addMonths(startOfMonth(date), delta));
}

export function getBoardTaskCreationDateKey(task = {}) {
  return getBoardTaskCalendarDateKey(task, BOARD_CALENDAR_DATE_FIELDS.CREATION);
}

export function groupBoardTasksByCalendarDate(
  tasks = [],
  dateField = DEFAULT_BOARD_CALENDAR_DATE_FIELD,
) {
  const map = new Map();

  for (const task of tasks || []) {
    const key = getBoardTaskCalendarDateKey(task, dateField);

    if (!key) {
      continue;
    }

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key).push(task);
  }

  return map;
}

export function groupBoardTasksByCreationDate(tasks = []) {
  return groupBoardTasksByCalendarDate(tasks, BOARD_CALENDAR_DATE_FIELDS.CREATION);
}

export function truncateBoardCalendarLabel(title = '') {
  if (!title) {
    return '';
  }

  return title.length > BOARD_CALENDAR_LABEL_MAX_LENGTH
    ? `${title.slice(0, BOARD_CALENDAR_LABEL_MAX_LENGTH - 3)}...`
    : title;
}

export function getBoardCalendarTaskChipStyle(task, statusGroups = [], allStatusGroups = []) {
  const option =
    findBoardStatusOption(statusGroups, task?.status) ??
    findBoardStatusOption(allStatusGroups, task?.status);
  const accentColor = resolveBadgeColor(option?.color) || option?.color || '#525866';

  return {
    background: `linear-gradient(180deg, ${accentColor}26 0%, ${accentColor}12 100%)`,
    textColor: 'var(--color-text-sub-600)',
    accentColor,
  };
}
