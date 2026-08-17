import {
  formatSingleTimeSummary,
  formatTimeSummary,
  parsePickerTime,
  timeStringToMinutes,
  to24Hour,
} from '../booking-time-wheel-utils';

describe('booking-time-wheel-utils', () => {
  it('parses 24h to 12h parts', () => {
    expect(parsePickerTime('14:30')).toEqual({
      hour12: '02',
      minute: '30',
      meridiem: 'PM',
    });
  });

  it('formats 12h to 24h', () => {
    expect(to24Hour('02', '30', 'PM')).toBe('14:30');
    expect(to24Hour('12', '00', 'AM')).toBe('00:00');
  });

  it('builds summary when start and end are set', () => {
    const summary = formatTimeSummary('2026-05-20', '09:00', '17:30');
    expect(summary).toMatch(/9:00 AM/);
    expect(summary).toMatch(/5:30 PM/);
  });

  it('converts time string to minutes', () => {
    expect(timeStringToMinutes('01:15')).toBe(75);
  });

  it('formats a single time for display', () => {
    expect(formatSingleTimeSummary('09:30')).toMatch(/9:30 AM/);
  });
});
