import { parse } from 'date-fns';
import { buildDueDateUpdatePayload, buildStartDateUpdatePayload } from '@/services/tasks-service';
import { serializeBoardTaskDate } from '../../utils/board-task-date-utils';
import { getBoardTaskCalendarUpdateFieldKey } from './board-calendar-utils';
import type {
  BoardTask,
  CalendarDateField,
  CalendarDropTarget,
} from '../shared/types';

export const BOARD_CALENDAR_DND_PREFIX = 'board-calendar';

export function getBoardCalendarTaskDragId(taskId: string | number | null | undefined): string {
  return `${BOARD_CALENDAR_DND_PREFIX}:task:${taskId}`;
}

export function parseBoardCalendarTaskDragId(id: unknown): string | null {
  if (typeof id !== 'string' || !id.startsWith(`${BOARD_CALENDAR_DND_PREFIX}:task:`)) {
    return null;
  }

  return id.slice(`${BOARD_CALENDAR_DND_PREFIX}:task:`.length);
}

export function getBoardCalendarDropId(
  zone: CalendarDropTarget['zone'],
  dateKey: string,
  hour: number | null = null,
): string {
  if (zone === 'time' && hour != null) {
    return `${BOARD_CALENDAR_DND_PREFIX}:time:${dateKey}:${hour}`;
  }

  if (zone === 'allday') {
    return `${BOARD_CALENDAR_DND_PREFIX}:allday:${dateKey}`;
  }

  return `${BOARD_CALENDAR_DND_PREFIX}:month:${dateKey}`;
}

export function parseBoardCalendarDropId(id: unknown): CalendarDropTarget | null {
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

export function canDragCalendarTask(task: BoardTask | null | undefined): boolean {
  return Boolean(task?.id ?? task?.name);
}

export function resolveCalendarTaskDropUpdate({
  task,
  dropTarget,
  dateField,
}: {
  task: BoardTask | null | undefined;
  dropTarget: CalendarDropTarget | null | undefined;
  dateField: CalendarDateField;
}): {
  fieldKey: 'dueDate' | 'startDate';
  value: string;
  payload: unknown;
} | null {
  if (!task || !dropTarget?.dateKey) {
    return null;
  }

  const targetDate = parse(dropTarget.dateKey, 'yyyy-MM-dd', new Date());
  const fieldKey = getBoardTaskCalendarUpdateFieldKey(dateField);

  const existingRaw =
    fieldKey === 'dueDate'
      ? (task.dueDate ?? task.due_date ?? '')
      : (task.startDate ?? task.start_date ?? '');

  let nextValue: string;

  if (dropTarget.zone === 'time' && dropTarget.hour != null) {
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
