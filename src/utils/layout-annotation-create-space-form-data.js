import { resolveCoworkingInventoryTypeForApi } from '@/utils/layout-coworking-inventory-type';

/**
 * Build FormData for `create_space` from layout-annotation associate modal values.
 * Mirrors field names in `create-new-space.jsx` → `onCreate`.
 * Sends only center context, identity, layout, and type discriminator fields (no seat/credit defaults).
 *
 * @param {{
 *   centerId: string,
 *   centerName: string,
 *   blockFloorId: string,
 *   inventoryName: string,
 *   inventoryType: string,
 *   layoutCoordinate: { points: number[][] } | null,
 *   managedOfficeType?: string,
 *   managedOfficeTotalSeats?: string | number,
 *   creditPerSeat?: string | number,
 *   expectedPerSeatRate?: string | number,
 *   totalRateOfSpace?: string | number,
 *   coworkingSpaceType?: string,
 *   coworkingTotalSeats?: string | number,
 *   resourceType?: string,
 *   resourcePax?: string | number,
 *   commonAreaType?: string,
 * }} params
 * @returns {FormData}
 */
export function buildLayoutAnnotationCreateSpaceFormData({
  centerId,
  centerName,
  blockFloorId,
  inventoryName,
  inventoryType,
  layoutCoordinate,
  managedOfficeType = '',
  managedOfficeTotalSeats = '',
  creditPerSeat = '',
  expectedPerSeatRate = '',
  totalRateOfSpace = '',
  coworkingSpaceType = '',
  coworkingTotalSeats = '',
  resourceType = '',
  resourcePax = '',
  commonAreaType = '',
}) {
  const formData = new FormData();

  const appendNumber = (key, value) => {
    if (value === undefined || value === null || value === '') return;
    const numberValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isNaN(numberValue)) {
      formData.append(key, String(numberValue));
    }
  };

  const appendSpacePricingFields = () => {
    appendNumber('expected_per_seat_rate', expectedPerSeatRate);
    appendNumber('credit_per_seat', creditPerSeat);
    appendNumber('total_rate_of_space', totalRateOfSpace);
  };

  const cid = String(centerId ?? '').trim();
  if (cid) formData.append('center', cid);

  const cname = String(centerName ?? '').trim();
  if (cname) formData.append('center_name', cname);

  const floor = String(blockFloorId ?? '').trim();
  if (floor) formData.append('floor', floor);

  const invType = String(inventoryType ?? '').trim();
  if (invType) formData.append('inventory_type', invType);

  const invName = String(inventoryName ?? '').trim();
  if (invName) formData.append('inventory_name', invName);

  if (
    layoutCoordinate &&
    Array.isArray(layoutCoordinate.points) &&
    layoutCoordinate.points.length > 0
  ) {
    formData.append('layout_coordinate', JSON.stringify(layoutCoordinate));
  }

  if (invType === 'Managed Office') {
    const moType = String(managedOfficeType ?? '').trim();
    if (moType) formData.append('managed_office_type', moType);
    const moSeats = Number(managedOfficeTotalSeats);
    if (Number.isFinite(moSeats) && moSeats >= 1) {
      formData.append('total_seats', String(Math.floor(moSeats)));
      appendNumber('available_seats', moSeats);
    }
    appendSpacePricingFields();
  }

  if (invType === 'Co-working Space') {
    const cwType = resolveCoworkingInventoryTypeForApi(String(coworkingSpaceType ?? '').trim());
    if (cwType) formData.append('coworking_inventory_type', cwType);
    const seats = Number(coworkingTotalSeats);
    if (Number.isFinite(seats) && seats >= 1) {
      formData.append('total_seats', String(Math.floor(seats)));
      appendNumber('available_seats', seats);
    }
    appendSpacePricingFields();
  }

  if (invType === 'Resource') {
    const rt = String(resourceType ?? '').trim();
    if (rt) formData.append('resource_type', rt);
    const pax = Number(resourcePax);
    if (Number.isFinite(pax) && pax >= 1) {
      const paxValue = String(Math.floor(pax));
      formData.append('pax', paxValue);
      formData.append('total_seats', paxValue);
    }
  }

  if (invType === 'Common Area') {
    const cat = String(commonAreaType ?? '').trim();
    if (cat) formData.append('common_area_type', cat);
  }

  return formData;
}

/**
 * @param {unknown} result - unwrap payload from `createSpace` thunk (`response.data` from Frappe)
 * @returns {string} Space document name / id for layout `space_ref`
 */
export function extractCreatedSpaceNameFromCreateSpaceResult(result) {
  if (result == null) return '';

  const trim = (v) => String(v ?? '').trim();

  const fromDoc = (obj) => {
    if (!obj || typeof obj !== 'object') return '';
    return (
      trim(obj.name) ||
      trim(obj.space_id) ||
      trim(obj.space_name) ||
      trim(obj.docname) ||
      trim(obj.id)
    );
  };

  const msg = result?.message ?? result?.data?.message;

  if (typeof msg === 'string') return trim(msg);
  if (Array.isArray(msg) && msg.length > 0) {
    const first = msg[0];
    if (typeof first === 'string') return trim(first);
    const fromFirst = fromDoc(first);
    if (fromFirst) return fromFirst;
  }
  if (msg && typeof msg === 'object') {
    const fromMsg = fromDoc(msg);
    if (fromMsg) return fromMsg;
    const nested =
      fromDoc(msg.space) || fromDoc(msg.doc) || fromDoc(msg.data) || fromDoc(msg.space_doc);
    if (nested) return nested;
    if (typeof msg.space === 'string') return trim(msg.space);
  }

  const docs = result?.docs ?? result?.data?.docs ?? msg?.docs;
  if (Array.isArray(docs) && docs.length > 0) {
    const id = fromDoc(docs[0]);
    if (id) return id;
  }

  return fromDoc(result);
}
