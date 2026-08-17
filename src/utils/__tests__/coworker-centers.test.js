import {
  extractClientAssignedCenterOptions,
  normalizeClientCenterOption,
  withCurrentCenterOption,
} from '../coworker-centers.js';

describe('coworker-centers', () => {
  it('normalizes pre-formatted and raw center rows', () => {
    expect(normalizeClientCenterOption({ value: 'CTR-01', label: 'Midtown Hub' })).toEqual({
      value: 'CTR-01',
      label: 'Midtown Hub',
    });
    expect(normalizeClientCenterOption({ center: 'CTR-02', center_name: 'Skyline' })).toEqual({
      value: 'CTR-02',
      label: 'Skyline',
    });
  });

  it('extracts centers from client detail payload', () => {
    const options = extractClientAssignedCenterOptions({
      centers: [
        { value: 'CTR-01', label: 'Alpha Center' },
        { center: 'CTR-02', center_name: 'Beta Center' },
      ],
    });

    expect(options).toHaveLength(2);
    expect(options[0].label).toBe('Alpha Center');
    expect(options[1].value).toBe('CTR-02');
  });

  it('extracts centers from custom_center_assignment child table', () => {
    const options = extractClientAssignedCenterOptions({
      custom_center_assignment: [{ center: 'CTR-05' }, { center: 'CTR-02', center_name: 'Beta' }],
    });

    expect(options).toHaveLength(2);
    expect(options.map((opt) => opt.value).sort()).toEqual(['CTR-02', 'CTR-05']);
    expect(options.find((opt) => opt.value === 'CTR-02')?.label).toBe('Beta');
  });

  it('includes current value when missing from options', () => {
    const merged = withCurrentCenterOption([{ value: 'CTR-01', label: 'Alpha' }], 'CTR-99');
    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual({ value: 'CTR-99', label: 'CTR-99' });
  });
});
