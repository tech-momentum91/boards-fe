import {
  buildPermanentAssignPayload,
  buildRecurringAssignPayload,
  formatAssignTimeForApi,
  formatWeekDaysForAssignApi,
} from '../assign-coworker-payload';

const base = {
  customerId: 'CUST-1',
  spaceId: 'SPACE-1',
  subSpaceId: 'ZONE-1',
  deskId: 'DESK-1',
  coworkerId: 'CCW-1',
  centerId: 'CENTER-1',
};

describe('assign-coworker-payload', () => {
  it('formats time with seconds', () => {
    expect(formatAssignTimeForApi('09:00')).toBe('09:00:00');
    expect(formatAssignTimeForApi('9:30')).toBe('09:30:00');
  });

  it('formats week days as numeric csv', () => {
    expect(formatWeekDaysForAssignApi(['mon', 'wed', 'fri'])).toBe('1,3,5');
  });

  it('builds permanent payload', () => {
    expect(buildPermanentAssignPayload({ ...base, startDate: '2026-05-22' })).toEqual({
      customer_id: 'CUST-1',
      space_id: 'SPACE-1',
      sub_space_id: 'ZONE-1',
      desk_id: 'DESK-1',
      coworker_id: 'CCW-1',
      center_id: 'CENTER-1',
      permanent: 1,
      recurring: 0,
      start_date: '2026-05-22',
    });
  });

  it('builds weekly recurring with occurrence', () => {
    const payload = buildRecurringAssignPayload({
      ...base,
      recurringPeriod: 'Weekly',
      startDate: '2026-05-22',
      startTime: '09:00',
      endTime: '18:00',
      selectedDayKeys: ['mon', 'wed', 'fri'],
      recurrenceEndType: 'After',
      recurrenceEndAfter: 7,
    });
    expect(payload.recurring_period).toBe('Weekly');
    expect(payload.week_days).toBe('1,3,5');
    expect(payload.occurrence).toBe(7);
    expect(payload.start_time).toBe('09:00:00');
  });

  it('builds monthly recurring with recurrence_end_date', () => {
    const payload = buildRecurringAssignPayload({
      ...base,
      recurringPeriod: 'Monthly',
      startDate: '2026-05-22',
      startTime: '09:00',
      endTime: '18:00',
      selectedMonthDays: [1, 15, 30],
      recurrenceEndType: 'On',
      recurrenceEndDate: '2026-12-31',
    });
    expect(payload.month_dates).toBe('1,15,30');
    expect(payload.recurrence_end_date).toBe('2026-12-31');
    expect(payload.occurrence).toBeUndefined();
  });
});
