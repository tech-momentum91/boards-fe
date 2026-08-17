import {
  deskHasAssignedCoworker,
  desksToCoworkerSlotAnnotations,
  getDeskCoworkerDetails,
  isDeskBooked,
  resolveDeskCoworkerForDesk,
  resolveSubSpaceClientDepartment,
  subSpacesToHighlightAnnotations,
} from '../client-floor-layout-annotations.js';
import { CLIENT_SUBSPACE_SLOT_SOURCE } from '@/constants/layout/annotation-sources';

describe('deskHasAssignedCoworker', () => {
  it('returns true when desk has client_coworker_ref', () => {
    expect(deskHasAssignedCoworker({ client_coworker_ref: 'cw-1' })).toBe(true);
  });

  it('returns true when desk has coworker_details', () => {
    expect(deskHasAssignedCoworker({ coworker_details: { first_name: 'A' } })).toBe(true);
  });

  it('returns false when desk is empty', () => {
    expect(deskHasAssignedCoworker({})).toBe(false);
  });

  it('does not treat Frappe desk name as a coworker assignment', () => {
    const spaces = [
      {
        space_id: 'SPC-1',
        sub_spaces: [
          {
            sub_space_id: 'SS-1',
            desks: [
              {
                name: 'dq3gb39d62',
                desk_id: 'D-01',
                desk_row_id: 'row-1',
                desk_coordinate: { x: 0.1, y: 0.2 },
                desk_status: 'Available',
              },
              {
                name: 'dabc123xyz',
                desk_id: 'D-02',
                desk_row_id: 'row-2',
                desk_coordinate: { x: 0.1, y: 0.3 },
                desk_status: 'Available',
              },
            ],
          },
        ],
      },
    ];

    const pins = desksToCoworkerSlotAnnotations(spaces);
    expect(pins).toHaveLength(2);
    expect(pins.every((pin) => pin.hasDeskAssignment === false)).toBe(true);
    expect(pins.every((pin) => !pin.client_coworker_ref)).toBe(true);
    expect(deskHasAssignedCoworker(spaces[0].sub_spaces[0].desks[0])).toBe(false);
  });

  it('does not copy sub-space coworker_details onto desk pins', () => {
    const spaces = [
      {
        space_id: 'SPC-1',
        sub_spaces: [
          {
            sub_space_id: 'SS-1',
            client_coworker_ref: 'cw-sub',
            coworker_details: { first_name: 'Sub', last_name: 'Only' },
            desks: [
              {
                desk_id: 'D-01',
                desk_row_id: 'row-1',
                desk_coordinate: { x: 0.1, y: 0.2 },
              },
            ],
          },
        ],
      },
    ];

    const [pin] = desksToCoworkerSlotAnnotations(spaces);
    expect(pin.hasDeskAssignment).toBe(false);
    expect(pin.coworker_details).toBeNull();
  });

  it('assigns sub-space coworker only to the desk matching assigned_desk_id', () => {
    const spaces = [
      {
        space_id: 'SPC-1',
        sub_spaces: [
          {
            sub_space_id: 'SS-1',
            assigned_desk_id: 'D-02',
            client_coworker_ref: 'cw-sub',
            coworker_details: { first_name: 'Nitin', last_name: 'Dave', department: 'Management' },
            desks: [
              {
                desk_id: 'D-01',
                desk_row_id: 'row-1',
                desk_coordinate: { x: 0.1, y: 0.2 },
              },
              {
                desk_id: 'D-02',
                desk_row_id: 'row-2',
                desk_coordinate: { x: 0.2, y: 0.2 },
              },
            ],
          },
        ],
      },
    ];

    const pins = desksToCoworkerSlotAnnotations(spaces);
    const pin1 = pins.find((p) => p.desk_id === 'D-01');
    const pin2 = pins.find((p) => p.desk_id === 'D-02');
    expect(pin1.hasDeskAssignment).toBe(false);
    expect(pin2.hasDeskAssignment).toBe(true);
    expect(pin2.coworker_details?.first_name).toBe('Nitin');
  });
});

describe('resolveDeskCoworkerForDesk', () => {
  it('reads per-desk assignment rows on sub-space', () => {
    const result = resolveDeskCoworkerForDesk(
      { desk_id: 'D-02', desk_coordinate: { x: 0.2, y: 0.2 } },
      {
        desk_assignments: [
          {
            desk_id: 'D-02',
            client_coworker_ref: 'cw-2',
            coworker_details: { first_name: 'A', last_name: 'B' },
          },
        ],
      },
    );
    expect(result.isAssigned).toBe(true);
    expect(result.deskId).toBe('D-02');
    expect(result.coworkerDetails?.first_name).toBe('A');
  });

  it('reads assignments_for_date with schedule fields on desk pin', () => {
    const result = resolveDeskCoworkerForDesk({
      desk_id: 'D-01',
      assignments_for_date: [
        {
          client_coworker_ref: 'ftv0rs2bta',
          start_date: '2026-05-23',
          end_date: '2026-05-23',
          start_time: '10:00:00',
          end_time: '20:00:00',
          half_day: 0,
          assignment_type: 'recurring',
          coworker_details: {
            first_name: 'Hartik',
            last_name: 'Sharma',
            department: 'Sales',
            designation: 'Sales Executive',
            work_mode: 'Hybrid',
          },
        },
      ],
    });

    expect(result.isAssigned).toBe(true);
    expect(result.coworkerDetails?.first_name).toBe('Hartik');
    expect(result.deskAssignment).toEqual({
      assignment_type: 'recurring',
      start_date: '2026-05-23',
      end_date: '2026-05-23',
      start_time: '10:00:00',
      end_time: '20:00:00',
      half_day: 0,
      recurring_desk_ref: null,
      assign_desk: null,
      client_coworker_ref: 'ftv0rs2bta',
      coworker_name: null,
      email: null,
      image: null,
      is_active_now: false,
      assign_space: null,
    });
  });
});

describe('resolveSubSpaceClientDepartment', () => {
  it('reads client_department from sub-space payload', () => {
    const subSpace = {
      client_department: 'Engineering',
      coworker_details: { department: 'Operations' },
    };

    expect(resolveSubSpaceClientDepartment(subSpace)).toBe('Engineering');
  });

  it('returns empty string when client_department is null', () => {
    expect(resolveSubSpaceClientDepartment({ client_department: null })).toBe('');
  });

  it('does not use coworker_details.department', () => {
    const subSpace = {
      coworker_details: { department: 'Operations' },
    };

    expect(resolveSubSpaceClientDepartment(subSpace)).toBe('');
  });
});

describe('subSpacesToHighlightAnnotations', () => {
  it('includes client_department on highlight annotation from sub-space field', () => {
    const spaces = [
      {
        space_id: 'CTR-01-SPC-925',
        sub_spaces: [
          {
            sub_space_id: 'CTR-01-SPC-925-SS-0002',
            sub_space_name: 'Sub space - 2',
            sub_space_type: 'Production Area',
            sub_space_area_type: 'Private Cabin',
            client_department: 'Sales',
            assign_space: 'ASN-CTR-01-SPC-925-926',
            sub_space_coordinate: {
              points: [
                [0.1, 0.1],
                [0.2, 0.1],
                [0.2, 0.2],
                [0.1, 0.2],
              ],
            },
          },
        ],
      },
    ];

    const [ann] = subSpacesToHighlightAnnotations(spaces);
    expect(ann.client_department).toBe('Sales');
    expect(ann.space_id).toBe('CTR-01-SPC-925');
    expect(ann.sub_space_id).toBe('CTR-01-SPC-925-SS-0002');
  });
});

describe('desksToCoworkerSlotAnnotations', () => {
  it('marks desk assigned and includes desk_id when desk has coworker', () => {
    const spaces = [
      {
        space_id: 'CTR-01-SPC-94',
        space_name: 'Directors cabin',
        sub_spaces: [
          {
            sub_space_id: 'CTR-01-SPC-94-SS-0001',
            desks: [
              {
                desk_id: 'CTR-01-SPC-94-SS-0001-D-01',
                desk_row_id: '7advlin41t',
                sequence: 1,
                client_coworker_ref: 'dq3gb39d62',
                coworker_details: { first_name: 'Jinansh', last_name: 'Shah' },
                desk_coordinate: { x: 0.2, y: 0.21 },
              },
            ],
          },
        ],
      },
    ];

    const [pin] = desksToCoworkerSlotAnnotations(spaces);
    expect(pin.desk_id).toBe('CTR-01-SPC-94-SS-0001-D-01');
    expect(pin.hasDeskAssignment).toBe(true);
    expect(getDeskCoworkerDetails(spaces[0].sub_spaces[0].desks[0])).toEqual({
      first_name: 'Jinansh',
      last_name: 'Shah',
    });
  });

  it('falls back to space-level desks when coordinates exist only on the space root', () => {
    const spaces = [
      {
        space_id: 'CTR-05-SPC-1377',
        space_name: 'Hartik',
        sub_spaces: [],
        desks: [
          {
            desk_id: 'CTR-05-SPC-1377-SS-0001-D-01',
            desk_row_id: 'row-1',
            sub_space_id: 'CTR-05-SPC-1377-SS-0001',
            sequence: 1,
            desk_coordinate: { x: 0.59, y: 0.38 },
          },
        ],
      },
    ];

    const [pin] = desksToCoworkerSlotAnnotations(spaces);
    expect(pin.desk_id).toBe('CTR-05-SPC-1377-SS-0001-D-01');
    expect(pin.x).toBeCloseTo(0.59);
    expect(pin.y).toBeCloseTo(0.38);
  });

  it('deduplicates desks listed on both sub-space and space root', () => {
    const spaces = [
      {
        space_id: 'SPC-1',
        sub_spaces: [
          {
            sub_space_id: 'SS-1',
            desks: [
              {
                desk_id: 'D-01',
                desk_row_id: 'row-1',
                desk_coordinate: { x: 0.1, y: 0.2 },
              },
            ],
          },
        ],
        desks: [
          {
            desk_id: 'D-01',
            desk_row_id: 'row-1',
            desk_coordinate: { x: 0.1, y: 0.2 },
          },
        ],
      },
    ];

    const pins = desksToCoworkerSlotAnnotations(spaces);
    expect(pins).toHaveLength(1);
  });

  it('includes desk_assignment schedule from assignments_for_date', () => {
    const spaces = [
      {
        space_id: 'SPC-943',
        sub_spaces: [
          {
            sub_space_id: 'SS-0004',
            sub_space_area_type: 'Hot Desk',
            desks: [
              {
                desk_id: 'D-01',
                desk_row_id: 'row-1',
                sequence: 1,
                desk_coordinate: { x: 0.61, y: 0.36 },
                assignments_for_date: [
                  {
                    client_coworker_ref: 'cw-1',
                    start_date: '2026-05-23',
                    end_date: '2026-05-23',
                    start_time: '10:00:00',
                    end_time: '20:00:00',
                    half_day: 0,
                    coworker_details: { first_name: 'Hartik', last_name: 'Sharma' },
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const [pin] = desksToCoworkerSlotAnnotations(spaces);
    expect(pin.desk_assignment?.start_date).toBe('2026-05-23');
    expect(pin.desk_assignment?.start_time).toBe('10:00:00');
    expect(pin.coworker_details?.first_name).toBe('Hartik');
  });

  it('isDeskBooked treats coworker_assignments as booked', () => {
    expect(
      isDeskBooked({
        coworker_assignments: [{ client_coworker_ref: 'CCW-1', coworker_name: 'Riya' }],
      }),
    ).toBe(true);
  });

  it('includes coworker_assignments and prefers active primary on desk pin', () => {
    const spaces = [
      {
        space_id: 'SP-1',
        space_name: 'Space',
        sub_spaces: [
          {
            sub_space_id: 'SS-1',
            sub_space_name: 'Zone',
            desks: [
              {
                desk_id: 'D-1',
                sequence: 1,
                desk_coordinate: { x: 0.1, y: 0.2 },
                desk_status: 'Occupied',
                client_desk_status: 'Occupied',
                coworker_assignment_count: 3,
                coworker_assignments: [
                  { client_coworker_ref: 'A', coworker_name: 'Ada', is_active_now: false },
                  { client_coworker_ref: 'B', coworker_name: 'Bea', is_active_now: true },
                  { client_coworker_ref: 'C', coworker_name: 'Cara', is_active_now: false },
                ],
              },
            ],
          },
        ],
      },
    ];
    const pins = desksToCoworkerSlotAnnotations(spaces).filter(
      (a) => a.source === CLIENT_SUBSPACE_SLOT_SOURCE,
    );
    const pin = pins.find((p) => p.desk_id === 'D-1');
    expect(pin.coworker_assignment_count).toBe(3);
    expect(pin.coworker_assignments).toHaveLength(3);
    expect(pin.client_desk_status).toBe('Occupied');
    expect(pin.client_coworker_ref).toBe('B');
    expect(pin.hasDeskAssignment).toBe(true);
  });

  it('does not treat assigned_client alone as coworker assignment', () => {
    const spaces = [
      {
        space_id: 'SP-1',
        sub_spaces: [
          {
            sub_space_id: 'SS-1',
            desks: [
              {
                desk_id: 'D-client',
                desk_coordinate: { x: 0.2, y: 0.3 },
                assigned_client: {
                  customer_id: 'CL-1',
                  customer_name: 'Acme',
                  assign_space: 'AS-1',
                },
              },
            ],
          },
        ],
      },
    ];
    const [pin] = desksToCoworkerSlotAnnotations(spaces);
    expect(pin.hasAssignedClient).toBe(true);
    expect(pin.hasDeskAssignment).toBe(false);
    expect(pin.coworker_assignment_count).toBe(0);
  });
});
