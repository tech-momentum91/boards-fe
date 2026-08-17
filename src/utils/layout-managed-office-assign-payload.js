/**
 * Build payload for `save_client_managed_office_assign_space`.
 *
 * @param {{
 *   customerId: string,
 *   spaceId: string,
 *   startDate: string,
 *   endDate: string,
 *   centerId?: string,
 *   expectedPerSeatRate?: number,
 *   creditPerSeat?: number,
 *   totalRate?: number,
 *   notes?: string,
 * }} params
 * @returns {Record<string, unknown>}
 */
export function buildManagedOfficeAssignSpacePayload({
  customerId,
  spaceId,
  startDate,
  endDate,
  centerId,
  expectedPerSeatRate,
  creditPerSeat,
  totalRate,
  notes,
}) {
  const customer = String(customerId || '').trim();
  const payload = {
    customer_id: customer,
    client_id: customer,
    space_id: String(spaceId || '').trim(),
    start_date: String(startDate || '').trim(),
    end_date: String(endDate || '').trim(),
  };

  const center = String(centerId || '').trim();
  if (center) payload.center_id = center;

  const rate = Number(expectedPerSeatRate);
  const credit = Number(creditPerSeat);
  const total = Number(totalRate);
  if (Number.isFinite(rate)) payload.expected_per_seat_rate = rate;
  if (Number.isFinite(credit)) payload.credit_per_seat = credit;
  if (Number.isFinite(total)) payload.total_rate = total;

  const noteText = String(notes || '').trim();
  if (noteText) payload.notes = noteText;

  return payload;
}
