import {
  buildLayoutCoworkingAssignSpacePayload,
  buildLayoutCoworkerSubSpaceAssignPayload,
} from '@/utils/layout-coworker-sub-space-assign-payload';

describe('buildLayoutCoworkingAssignSpacePayload', () => {
  it('builds assign-space payload for layout allocate modal', () => {
    const payload = buildLayoutCoworkingAssignSpacePayload({
      customerId: 'CUS-00042',
      spaceId: 'CTR-05-SPC-1348',
      subSpaceId: 'CTR-05-SPC-1348-SS-0001',
      centerId: 'CTR-05',
      floor: 'A - 4th',
      assignedSeats: 3,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      expectedPerSeatRate: 5000,
      creditPerSeat: 2,
      notes: 'Initial allocation',
    });

    expect(payload).toEqual({
      customer_id: 'CUS-00042',
      space_id: 'CTR-05-SPC-1348',
      sub_space_id: 'CTR-05-SPC-1348-SS-0001',
      center_id: 'CTR-05',
      floor: 'A - 4th',
      assigned_seats: 3,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      expected_per_seat_rate: 5000,
      credit_per_seat: 2,
      notes: 'Initial allocation',
    });
  });
});

describe('buildLayoutCoworkerSubSpaceAssignPayload', () => {
  it('passes normalized marker coordinates and lease dates when provided', () => {
    const payload = buildLayoutCoworkerSubSpaceAssignPayload({
      customerId: 'CUST-1',
      spaceId: 'SP-00123',
      subSpaceId: 'SP-00123-SS-0001',
      centerId: 'CTR-05',
      normalizedX: 0.5985783772648853,
      normalizedY: 0.3692076456226164,
      startDate: '2026-05-01',
      endDate: '2027-04-30',
    });

    expect(payload).toEqual({
      customer_id: 'CUST-1',
      space_id: 'SP-00123',
      sub_space_id: 'SP-00123-SS-0001',
      center_id: 'CTR-05',
      start_date: '2026-05-01',
      end_date: '2027-04-30',
      desk_coordinate: {
        x: 0.5985783772648853,
        y: 0.3692076456226164,
      },
    });
  });

  it('omits lease dates when not provided (existing floor assignment)', () => {
    const payload = buildLayoutCoworkerSubSpaceAssignPayload({
      customerId: 'CUST-1',
      spaceId: 'SP-00123',
      subSpaceId: 'SP-00123-SS-0001',
      centerId: 'CTR-05',
      normalizedX: 0.5,
      normalizedY: 0.4,
    });

    expect(payload).toEqual({
      customer_id: 'CUST-1',
      space_id: 'SP-00123',
      sub_space_id: 'SP-00123-SS-0001',
      center_id: 'CTR-05',
      desk_coordinate: { x: 0.5, y: 0.4 },
    });
    expect(payload).not.toHaveProperty('start_date');
    expect(payload).not.toHaveProperty('end_date');
  });
});
