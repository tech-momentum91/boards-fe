import { buildManagedOfficeAssignSpacePayload } from '../layout-managed-office-assign-payload';

describe('layout-managed-office-assign-payload', () => {
  test('builds managed office assign space payload', () => {
    const payload = buildManagedOfficeAssignSpacePayload({
      customerId: 'C218',
      spaceId: 'CTR-406-SPC-2078',
      centerId: 'CTR-406',
      startDate: '2026-07-01',
      endDate: '2027-06-30',
      expectedPerSeatRate: 5000,
      creditPerSeat: 10,
      totalRate: 60000,
      notes: 'Lease note',
    });

    expect(payload).toEqual({
      customer_id: 'C218',
      client_id: 'C218',
      space_id: 'CTR-406-SPC-2078',
      center_id: 'CTR-406',
      start_date: '2026-07-01',
      end_date: '2027-06-30',
      expected_per_seat_rate: 5000,
      credit_per_seat: 10,
      total_rate: 60000,
      notes: 'Lease note',
    });
  });
});
