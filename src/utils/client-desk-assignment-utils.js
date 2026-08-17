import { format, parse, parseISO } from 'date-fns';

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isHalfDayAssignment(value) {
  return value === 1 || value === true || value === '1';
}

/**
 * @param {unknown} raw - yyyy-MM-dd or ISO
 * @returns {Date | null}
 */
function parseAssignmentDate(raw) {
  const v = String(raw || '').trim();
  if (!v) return null;
  try {
    const d = v.includes('T') ? parseISO(v) : parse(v.slice(0, 10), 'yyyy-MM-dd', new Date());
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Short hover-card date string — `EEE dd/MM/yy` (e.g. `Tue 05/05/26`).
 *
 * @param {unknown} dateStr
 * @returns {string}
 */
export function formatAssignmentShortDate(dateStr) {
  const d = parseAssignmentDate(dateStr);
  return d ? format(d, 'EEE dd/MM/yy') : '';
}

/**
 * Full weekday name (e.g. `Tuesday`) derived from a yyyy-MM-dd date.
 *
 * @param {unknown} dateStr
 * @returns {string}
 */
export function getAssignmentWeekdayName(dateStr) {
  const d = parseAssignmentDate(dateStr);
  return d ? format(d, 'EEEE') : '';
}

/**
 * @param {unknown} assignmentType
 * @returns {boolean}
 */
export function isRecurringAssignmentType(assignmentType) {
  return (
    String(assignmentType || '')
      .trim()
      .toLowerCase() === 'recurring'
  );
}

/**
 * Structured descriptor used by the hover card to render mixed-styled rows
 * (grey connector words + dark values) per Figma spec.
 *
 * @param {{
 *   assignment_type?: string|null,
 *   start_date?: string|null,
 *   end_date?: string|null,
 *   start_time?: string|null,
 *   end_time?: string|null,
 *   half_day?: number|null,
 *   recurring_desk_ref?: string|null,
 * } | null | undefined} assignment
 * @returns {{
 *   recurring: boolean,
 *   typeLabel: string,
 *   date: { effective: string, end: string } | null,
 *   time: { halfDay: boolean, weekday: string, start: string, end: string } | null,
 * } | null}
 */
export function getAssignedTillDescriptor(assignment) {
  if (!assignment || typeof assignment !== 'object') return null;

  const recurring =
    isRecurringAssignmentType(assignment.assignment_type) ||
    Boolean(String(assignment.recurring_desk_ref ?? '').trim());

  const typeLabel = recurring ? 'Recurring' : 'One-time';

  const startShort = formatAssignmentShortDate(assignment.start_date);
  const endShort = formatAssignmentShortDate(assignment.end_date);
  const sameDay =
    startShort &&
    endShort &&
    String(assignment.start_date).slice(0, 10) === String(assignment.end_date).slice(0, 10);

  const date = startShort
    ? {
        effective: startShort,
        end: !endShort || sameDay ? '' : endShort,
      }
    : null;

  const start = formatLayoutAssignmentTime(assignment.start_time);
  const end = formatLayoutAssignmentTime(assignment.end_time);
  const time =
    start || end
      ? {
          halfDay: isHalfDayAssignment(assignment.half_day),
          weekday: recurring ? getAssignmentWeekdayName(assignment.start_date) : '',
          start,
          end,
        }
      : null;

  if (!date && !time) return null;
  return { recurring, typeLabel, date, time };
}

/**
 * @param {unknown} dateStr - yyyy-MM-dd
 * @returns {string}
 */
export function formatLayoutAssignmentDate(dateStr) {
  const raw = String(dateStr || '').trim();
  if (!raw) return '';
  try {
    const d = raw.includes('T') ? parseISO(raw) : parse(raw.slice(0, 10), 'yyyy-MM-dd', new Date());
    if (Number.isNaN(d.getTime())) return raw;
    return format(d, 'do MMMM yyyy');
  } catch {
    return raw;
  }
}

/**
 * @param {unknown} timeStr - HH:mm or HH:mm:ss
 * @returns {string}
 */
export function formatLayoutAssignmentTime(timeStr) {
  const raw = String(timeStr || '').trim();
  if (!raw) return '';
  const parts = raw.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return raw;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return format(d, 'h:mm a');
}

/**
 * @param {unknown} startDate
 * @param {unknown} endDate
 * @returns {string}
 */
export function formatAssignedTillDateRange(startDate, endDate) {
  const start = formatLayoutAssignmentDate(startDate);
  if (!start) return '';
  const endRaw = String(endDate || '').trim();
  const startRaw = String(startDate || '')
    .trim()
    .slice(0, 10);
  if (!endRaw || endRaw.slice(0, 10) === startRaw) return start;
  const end = formatLayoutAssignmentDate(endDate);
  return end ? `${start} - ${end}` : start;
}

/**
 * @param {unknown} startTime
 * @param {unknown} endTime
 * @param {unknown} halfDay
 * @returns {string}
 */
export function formatAssignedTillTimeRange(startTime, endTime, halfDay) {
  const start = formatLayoutAssignmentTime(startTime);
  const end = formatLayoutAssignmentTime(endTime);
  if (!start && !end) return '';
  const range = start && end ? `${start} - ${end}` : start || end;
  return isHalfDayAssignment(halfDay) ? `(Half day) ${range}` : range;
}

/**
 * Normalize desk / coworker assignment row into schedule fields.
 *
 * @param {unknown} row
 * @returns {{
 *   assignment_type: string | null,
 *   start_date: string | null,
 *   end_date: string | null,
 *   start_time: string | null,
 *   end_time: string | null,
 *   half_day: number | null,
 *   recurring_desk_ref: string | null,
 *   assign_desk: string | null,
 *   client_coworker_ref: string | null,
 *   coworker_name: string | null,
 *   email: string | null,
 *   image: unknown,
 *   is_active_now: boolean,
 *   assign_space: string | null,
 * } | null}
 */
export function normalizeDeskAssignmentRow(row) {
  if (!row || typeof row !== 'object') return null;
  const hasSchedule =
    row.start_date ||
    row.end_date ||
    row.start_time ||
    row.end_time ||
    row.client_coworker_ref ||
    row.coworker_id ||
    row.coworker_details ||
    row.coworker_name;
  if (!hasSchedule) return null;

  return {
    assignment_type: row.assignment_type != null ? String(row.assignment_type) : null,
    start_date: row.start_date != null ? String(row.start_date) : null,
    end_date: row.end_date != null ? String(row.end_date) : null,
    start_time: row.start_time != null ? String(row.start_time) : null,
    end_time: row.end_time != null ? String(row.end_time) : null,
    half_day: row.half_day != null ? Number(row.half_day) : null,
    recurring_desk_ref: row.recurring_desk_ref != null ? String(row.recurring_desk_ref) : null,
    assign_desk: row.assign_desk != null ? String(row.assign_desk) : null,
    client_coworker_ref: row.client_coworker_ref != null ? String(row.client_coworker_ref) : null,
    coworker_name: row.coworker_name != null ? String(row.coworker_name) : null,
    email: row.email != null ? String(row.email) : null,
    image: row.image ?? null,
    is_active_now: row.is_active_now === true || row.is_active_now === 1,
    assign_space: row.assign_space != null ? String(row.assign_space) : null,
  };
}

/**
 * Prefer layout `coworker_assignments`, fall back to legacy `assignments_for_date`.
 *
 * @param {unknown} desk
 * @returns {object[]}
 */
export function getDeskCoworkerAssignmentList(desk) {
  if (!desk || typeof desk !== 'object') return [];
  if (Array.isArray(desk.coworker_assignments) && desk.coworker_assignments.length > 0) {
    return desk.coworker_assignments.filter((row) => row && typeof row === 'object');
  }
  if (Array.isArray(desk.assignments_for_date) && desk.assignments_for_date.length > 0) {
    return desk.assignments_for_date.filter((row) => row && typeof row === 'object');
  }
  return [];
}

/**
 * @param {unknown[]} assignments
 * @returns {object | null}
 */
export function pickPrimaryCoworkerAssignment(assignments) {
  const list = Array.isArray(assignments) ? assignments.filter(Boolean) : [];
  if (list.length === 0) return null;
  const active = list.find((row) => row.is_active_now === true || row.is_active_now === 1);
  return active || list[0];
}

/**
 * @param {unknown[]} assignments
 * @returns {number}
 */
export function getCoworkerAssignmentOverflowCount(assignments) {
  const n = Array.isArray(assignments) ? assignments.length : 0;
  return n > 1 ? n - 1 : 0;
}

/**
 * Resolve assignment schedule for a desk (prefers `coworker_assignments`).
 *
 * @param {unknown} desk
 * @returns {ReturnType<typeof normalizeDeskAssignmentRow>}
 */
export function resolveDeskAssignmentSchedule(desk) {
  if (!desk || typeof desk !== 'object') return null;

  const list = getDeskCoworkerAssignmentList(desk);
  if (list.length > 0) {
    const primary = pickPrimaryCoworkerAssignment(list) || list[0];
    const fromList = normalizeDeskAssignmentRow(primary);
    if (fromList) return fromList;
  }

  return normalizeDeskAssignmentRow(desk);
}

/**
 * @param {unknown} workMode
 * @returns {string}
 */
export function formatCoworkerWorkModeBadge(workMode) {
  const raw = String(workMode || '').trim();
  if (!raw) return 'WFO';
  const upper = raw.toUpperCase();
  if (upper.includes('HOME') || upper === 'WFH') return 'WFH';
  if (upper.includes('HYBRID')) return 'Hybrid';
  if (upper.includes('OFFICE') || upper === 'WFO') return 'WFO';
  return raw;
}
