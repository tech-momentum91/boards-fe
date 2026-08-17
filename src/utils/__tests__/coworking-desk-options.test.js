import {
  buildAssignSubSpacesFromDeskSelection,
  countAvailableDeskOptions,
  flattenSubSpacesToDeskOptions,
  getDeskOptionStatus,
  isDeskOptionUnavailable,
} from '../coworking-desk-options.js';

describe('coworking-desk-options', () => {
  const apiSample = [
    {
      sub_space_id: 'CTR-05-SPC-1527-SS-0001',
      seq: 1,
      status: 'Available',
      sub_space_name: 'Sub space check - 2',
      desk_count: 10,
      desks: [
        { desk_id: 'CTR-05-SPC-1527-SS-0001-D-01', sequence: 1, desk_status: 'Available' },
        { desk_id: 'CTR-05-SPC-1527-SS-0001-D-02', sequence: 2, desk_status: 'Occupied' },
      ],
    },
  ];

  it('flattens nested desks instead of sub-space rows', () => {
    const options = flattenSubSpacesToDeskOptions(apiSample);
    expect(options).toHaveLength(2);
    expect(options[0].value).toBe('CTR-05-SPC-1527-SS-0001-D-01');
    expect(options[0].label).toBe('Desk 1');
    expect(options[0].subSpaceId).toBe('CTR-05-SPC-1527-SS-0001');
  });

  it('counts only available desks', () => {
    const options = flattenSubSpacesToDeskOptions(apiSample);
    expect(countAvailableDeskOptions(options)).toBe(1);
    expect(isDeskOptionUnavailable(options[1])).toBe(true);
  });

  it('getDeskOptionStatus ignores sub_space_status', () => {
    expect(getDeskOptionStatus({ sub_space_status: 'Occupied', desk_status: 'Available' })).toBe(
      'available',
    );
    expect(getDeskOptionStatus({ sub_space_status: 'Locked' })).toBe('');
  });

  it('keeps desk available when only parent sub_space_status is occupied', () => {
    const options = flattenSubSpacesToDeskOptions([
      {
        sub_space_id: 'SS-1',
        sub_space_status: 'Occupied',
        status: 'Occupied',
        desks: [{ desk_id: 'D-1', sequence: 1, desk_status: 'Available' }],
      },
    ]);
    expect(options[0].status).toBe('available');
    expect(isDeskOptionUnavailable(options[0])).toBe(false);
  });

  it('builds assign_sub_spaces payload with desk_id', () => {
    const options = flattenSubSpacesToDeskOptions(apiSample);
    const payload = buildAssignSubSpacesFromDeskSelection([options[0].value], options);
    expect(payload).toEqual([
      {
        sub_space_id: 'CTR-05-SPC-1527-SS-0001',
        desk_id: 'CTR-05-SPC-1527-SS-0001-D-01',
      },
    ]);
  });
});
