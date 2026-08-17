/**
 * Build payload for `save_client_coworking_assign_space` (layout allocate modal Save).
 *
 * @param {{
 *   customerId: string,
 *   spaceId: string,
 *   subSpaceId?: string,
 *   centerId?: string,
 *   floor?: string,
 *   assignedSeats: number,
 *   startDate: string,
 *   endDate: string,
 *   expectedPerSeatRate?: number,
 *   creditPerSeat?: number,
 *   totalRate?: number,
 *   notes?: string,
 * }} params
 * @returns {Record<string, unknown>}
 */
export function buildLayoutCoworkingAssignSpacePayload({
  customerId,
  spaceId,
  subSpaceId,
  centerId,
  floor,
  assignedSeats,
  startDate,
  endDate,
  expectedPerSeatRate,
  creditPerSeat,
  totalRate,
  notes,
}) {
  const seats = Number(assignedSeats);
  const payload = {
    customer_id: String(customerId || '').trim(),
    space_id: String(spaceId || '').trim(),
    assigned_seats: Number.isFinite(seats) ? seats : 0,
    start_date: String(startDate || '').trim(),
    end_date: String(endDate || '').trim(),
  };

  const ssid = String(subSpaceId || '').trim();
  const center = String(centerId || '').trim();
  const floorId = String(floor || '').trim();
  if (ssid) payload.sub_space_id = ssid;
  if (center) payload.center_id = center;
  if (floorId) payload.floor = floorId;

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

/**
 * Build payload for `save_client_coworking_layout_marker` (normalized point on layout).
 *
 * @param {{
 *   customerId: string,
 *   spaceId: string,
 *   subSpaceId: string,
 *   centerId: string,
 *   normalizedX: number,
 *   normalizedY: number,
 *   startDate?: string,
 *   endDate?: string,
 * }} params
 * @returns {Record<string, unknown>}
 */
export function buildLayoutCoworkerSubSpaceAssignPayload({
  customerId,
  spaceId,
  subSpaceId,
  centerId,
  normalizedX,
  normalizedY,
  startDate,
  endDate,
}) {
  const nx = Number(normalizedX);
  const ny = Number(normalizedY);
  const start = String(startDate || '').trim();
  const end = String(endDate || '').trim();

  const payload = {
    customer_id: String(customerId || '').trim(),
    space_id: String(spaceId || '').trim(),
    sub_space_id: String(subSpaceId || '').trim(),
    center_id: String(centerId || '').trim(),
    desk_coordinate: {
      x: nx,
      y: ny,
    },
  };

  if (start) payload.start_date = start;
  if (end) payload.end_date = end;

  return payload;
}
