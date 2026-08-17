import {
  formatAssignedTillDateRange,
  formatAssignedTillTimeRange,
  formatAssignmentShortDate,
  formatCoworkerWorkModeBadge,
  getAssignedTillDescriptor,
  getAssignmentWeekdayName,
  getCoworkerAssignmentOverflowCount,
  getDeskCoworkerAssignmentList,
  isHalfDayAssignment,
  isRecurringAssignmentType,
  normalizeDeskAssignmentRow,
  pickPrimaryCoworkerAssignment,
  resolveDeskAssignmentSchedule,
} from '../client-desk-assignment-utils.js';

describe('client-desk-assignment-utils', () => {
  describe('formatAssignedTillDateRange', () => {
    it('formats a single date when start and end match', () => {
      expect(formatAssignedTillDateRange('2026-05-23', '2026-05-23')).toBe('23rd May 2026');
    });

    it('formats a date range when start and end differ', () => {
      expect(formatAssignedTillDateRange('2026-05-05', '2026-05-25')).toBe(
        '5th May 2026 - 25th May 2026',
      );
    });
  });

  describe('formatAssignedTillTimeRange', () => {
    it('formats time range without half day prefix', () => {
      expect(formatAssignedTillTimeRange('10:00:00', '20:00:00', 0)).toBe('10:00 AM - 8:00 PM');
    });

    it('prefixes half day when half_day is 1', () => {
      expect(formatAssignedTillTimeRange('08:00:00', '12:00:00', 1)).toBe(
        '(Half day) 8:00 AM - 12:00 PM',
      );
    });
  });

  describe('isHalfDayAssignment', () => {
    it('returns true for 1 and true', () => {
      expect(isHalfDayAssignment(1)).toBe(true);
      expect(isHalfDayAssignment(true)).toBe(true);
    });

    it('returns false for 0 and null', () => {
      expect(isHalfDayAssignment(0)).toBe(false);
      expect(isHalfDayAssignment(null)).toBe(false);
    });
  });

  describe('formatCoworkerWorkModeBadge', () => {
    it('maps work mode labels', () => {
      expect(formatCoworkerWorkModeBadge('Hybrid')).toBe('Hybrid');
      expect(formatCoworkerWorkModeBadge('Work From Home')).toBe('WFH');
      expect(formatCoworkerWorkModeBadge('')).toBe('WFO');
    });
  });

  describe('resolveDeskAssignmentSchedule', () => {
    it('prefers assignments_for_date row with coworker', () => {
      const desk = {
        start_date: '2026-05-01',
        assignments_for_date: [
          {
            client_coworker_ref: 'cw-1',
            start_date: '2026-05-23',
            end_date: '2026-05-23',
            start_time: '10:00:00',
            end_time: '20:00:00',
            half_day: 0,
            assignment_type: 'recurring',
          },
        ],
      };

      expect(resolveDeskAssignmentSchedule(desk)).toEqual({
        assignment_type: 'recurring',
        start_date: '2026-05-23',
        end_date: '2026-05-23',
        start_time: '10:00:00',
        end_time: '20:00:00',
        half_day: 0,
        recurring_desk_ref: null,
        assign_desk: null,
        client_coworker_ref: 'cw-1',
        coworker_name: null,
        email: null,
        image: null,
        is_active_now: false,
        assign_space: null,
      });
    });
  });

  describe('normalizeDeskAssignmentRow', () => {
    it('returns null for empty row', () => {
      expect(normalizeDeskAssignmentRow(null)).toBeNull();
      expect(normalizeDeskAssignmentRow({})).toBeNull();
    });
  });

  describe('formatAssignmentShortDate', () => {
    it('formats yyyy-MM-dd as EEE dd/MM/yy', () => {
      expect(formatAssignmentShortDate('2026-05-05')).toBe('Tue 05/05/26');
    });

    it('returns empty string for invalid input', () => {
      expect(formatAssignmentShortDate('')).toBe('');
      expect(formatAssignmentShortDate(null)).toBe('');
    });
  });

  describe('getAssignmentWeekdayName', () => {
    it('returns full weekday name', () => {
      expect(getAssignmentWeekdayName('2026-05-05')).toBe('Tuesday');
    });
  });

  describe('isRecurringAssignmentType', () => {
    it('returns true for "Recurring" (any case)', () => {
      expect(isRecurringAssignmentType('Recurring')).toBe(true);
      expect(isRecurringAssignmentType('recurring')).toBe(true);
    });

    it('returns false for other values', () => {
      expect(isRecurringAssignmentType('One-time')).toBe(false);
      expect(isRecurringAssignmentType('')).toBe(false);
      expect(isRecurringAssignmentType(null)).toBe(false);
    });
  });

  describe('getAssignedTillDescriptor', () => {
    it('builds a recurring descriptor with weekday derived from start_date', () => {
      const out = getAssignedTillDescriptor({
        assignment_type: 'Recurring',
        start_date: '2026-05-05',
        end_date: '2026-10-27',
        start_time: '08:00:00',
        end_time: '12:30:00',
        half_day: 1,
      });
      expect(out).toEqual({
        recurring: true,
        typeLabel: 'Recurring',
        date: { effective: 'Tue 05/05/26', end: 'Tue 27/10/26' },
        time: { halfDay: true, weekday: 'Tuesday', start: '8:00 AM', end: '12:30 PM' },
      });
    });

    it('builds a one-time descriptor without weekday and collapses same-day range', () => {
      const out = getAssignedTillDescriptor({
        assignment_type: 'One-time',
        start_date: '2026-05-23',
        end_date: '2026-05-23',
        start_time: '10:00:00',
        end_time: '20:00:00',
        half_day: 0,
      });
      expect(out).toEqual({
        recurring: false,
        typeLabel: 'One-time',
        date: { effective: 'Sat 23/05/26', end: '' },
        time: { halfDay: false, weekday: '', start: '10:00 AM', end: '8:00 PM' },
      });
    });

    it('returns null when there is neither date nor time', () => {
      expect(getAssignedTillDescriptor(null)).toBeNull();
      expect(getAssignedTillDescriptor({})).toBeNull();
    });
  });

  describe('coworker_assignments helpers', () => {
    it('prefers coworker_assignments over assignments_for_date', () => {
      const list = getDeskCoworkerAssignmentList({
        coworker_assignments: [{ client_coworker_ref: 'CCW-1', coworker_name: 'Riya' }],
        assignments_for_date: [{ client_coworker_ref: 'CCW-legacy' }],
      });
      expect(list).toHaveLength(1);
      expect(list[0].client_coworker_ref).toBe('CCW-1');
    });

    it('pickPrimaryCoworkerAssignment prefers is_active_now', () => {
      const primary = pickPrimaryCoworkerAssignment([
        { client_coworker_ref: 'A', is_active_now: false },
        { client_coworker_ref: 'B', is_active_now: true },
      ]);
      expect(primary.client_coworker_ref).toBe('B');
    });

    it('overflow count is length minus one', () => {
      expect(getCoworkerAssignmentOverflowCount([])).toBe(0);
      expect(getCoworkerAssignmentOverflowCount([{ id: 1 }])).toBe(0);
      expect(getCoworkerAssignmentOverflowCount([{ id: 1 }, { id: 2 }, { id: 3 }])).toBe(2);
    });

    it('resolveDeskAssignmentSchedule reads coworker_assignments', () => {
      const schedule = resolveDeskAssignmentSchedule({
        coworker_assignments: [
          {
            client_coworker_ref: 'CCW-1',
            start_date: '2026-08-04',
            end_date: '2026-08-04',
            start_time: '09:00:00',
            end_time: '13:00:00',
            is_active_now: true,
          },
        ],
      });
      expect(schedule?.start_time).toBe('09:00:00');
    });
  });
});
