import { parse } from 'date-fns';
import { buildDueDateUpdatePayload, buildStartDateUpdatePayload } from '@/services/tasks-service';
import { serializeBoardTaskDate } from '../../utils/board-task-date-utils';
import { getBoardTaskCalendarUpdateFieldKey } from './board-calendar-utils';

export const BOARD_CALENDAR_DND_PREFIX = 'board-calendar';

export function getBoardCalendarTaskDragId(taskId) {
  return `${BOARD_CALENDAR_DND_PREFIX}:task:${taskId}`;
}

export function parseBoardCalendarTaskDragId(id) {
  if (typeof id !== 'string' || !id.startsWith(`${BOARD_CALENDAR_DND_PREFIX}:task:`)) {
    return null;
  }

  return id.slice(`${BOARD_CALENDAR_DND_PREFIX}:task:`.length);
}

export function getBoardCalendarDropId(zone, dateKey, hour = null) {
  if (zone === 'time' && hour != null) {
    return `${BOARD_CALENDAR_DND_PREFIX}:time:${dateKey}:${hour}`;
  }

  if (zone === 'allday') {
    return `${BOARD_CALENDAR_DND_PREFIX}:allday:${dateKey}`;
  }

  return `${BOARD_CALENDAR_DND_PREFIX}:month:${dateKey}`;
}

export function parseBoardCalendarDropId(id) {
  if (typeof id !== 'string' || !id.startsWith(`${BOARD_CALENDAR_DND_PREFIX}:`)) {
    return null;
  }

  const parts = id.split(':');

  if (parts[1] === 'time' && parts.length >= 4) {
    const hour = Number(parts[3]);
    return {
      zone: 'time',
      dateKey: parts[2],
      hour: Number.isFinite(hour) ? hour : null,
    };
  }

  if (parts[1] === 'allday' && parts.length >= 3) {
    return { zone: 'allday', dateKey: parts[2], hour: null };
  }

  if (parts[1] === 'month' && parts.length >= 3) {
    return { zone: 'month', dateKey: parts[2], hour: null };
  }

  return null;
}

export function canDragCalendarTask(task) {
  return Boolean(task?.id ?? task?.name);
}

export function resolveCalendarTaskDropUpdate({ task, dropTarget, dateField }) {
  if (!task || !dropTarget?.dateKey) {
    return null;
  }

  const targetDate = parse(dropTarget.dateKey, 'yyyy-MM-dd', new Date());
  const isTimeDrop = dropTarget.zone === 'time' && dropTarget.hour != null;
  const fieldKey = getBoardTaskCalendarUpdateFieldKey(dateField);

  const existingRaw =
    fieldKey === 'dueDate'
      ? (task.dueDate ?? task.due_date ?? '')
      : (task.startDate ?? task.start_date ?? '');

  let nextValue;

  if (isTimeDrop) {
    const next = new Date(targetDate);
    next.setHours(dropTarget.hour, 0, 0, 0);
    nextValue = serializeBoardTaskDate(next, true);
  } else {
    nextValue = serializeBoardTaskDate(targetDate, false);
  }

  if (String(existingRaw ?? '').trim() === String(nextValue ?? '').trim()) {
    return null;
  }

  return {
    fieldKey,
    value: nextValue,
    payload:
      fieldKey === 'dueDate'
        ? buildDueDateUpdatePayload(nextValue)
        : buildStartDateUpdatePayload(nextValue),
  };
}
