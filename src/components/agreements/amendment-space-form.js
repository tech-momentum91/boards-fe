import { membershipPlanValues } from '@/components/agreements/constants';
import { formatToDDMMYYYY } from '@/utils/date-utils';

/** Frappe `space` child: assign-space id (same idea as `resolveSpaceRowKey`). */
export function assignSpaceIdFromRow(row) {
  if (row == null) return '';
  const raw = row?.space;
  const fromLink = typeof raw === 'object' && raw != null ? (raw.space ?? raw.name) : raw;
  const sid = fromLink ?? row?.assign_space_id ?? row?.space_id;
  return sid != null && sid !== '' ? String(sid) : '';
}

function childRows(ag) {
  if (Array.isArray(ag?.space) && ag.space.length > 0) return ag.space;
  if (Array.isArray(ag?.space_details) && ag.space_details.length > 0) return ag.space_details;
  if (typeof ag?.space === 'string' && ag.space.trim() !== '') {
    return [{ space: ag.space.trim() }];
  }
  return [];
}

function rowByAssignId(agreement) {
  const m = new Map();
  const c = childRows(agreement);
  for (const r of c) {
    const k = assignSpaceIdFromRow(r);
    if (k) m.set(k, r);
  }
  return m;
}

function monthLike(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const m = String(v).match(/\d+(?:\.\d{0,2})?/);
  if (!m) return '';
  const n = Number(m[0]);
  return Number.isNaN(n) ? '' : Math.round(n * 100) / 100;
}

function mapRowToSpaceDetail(r, ag) {
  // Per-space only: never fall back to agreement.membership_plan — with multiple spaces that
  // value is aggregate / wrong and gets copied onto every row (duplicate badges in amendment).
  const fromRow = membershipPlanValues(
    r.membership_plan ?? r.membership_plans ?? r.plans ?? r.space_types,
  );
  const membership = fromRow;

  const endRaw =
    r.agreement_end_date ||
    r.agreement_end ||
    r.contract_end_date ||
    ag?.agreement_end_date ||
    ag?.agreement_end;

  const rowLockIn = monthLike(r.lock_in_period);
  const agreementLockIn = monthLike(ag?.lock_in_period);

  return {
    membership_plan: membership,
    no_of_seats: r.no_of_seats ?? ag?.no_of_seats ?? '',
    area: r.area ?? ag?.area ?? '',
    price_per_seat: r.price_per_seat ?? ag?.price_per_seat ?? '',
    monthly_revenue: r.monthly_revenue ?? ag?.monthly_revenue ?? '',
    rent_start_date:
      formatToDDMMYYYY(r.rent_start_date) ||
      formatToDDMMYYYY(r.lease_start_date) ||
      (ag ? formatToDDMMYYYY(ag.rent_start_date) : '') ||
      '',
    agreement_end_date: formatToDDMMYYYY(endRaw) || '',
    lock_in_period: rowLockIn === '' ? agreementLockIn : rowLockIn,
    lock_in_end_date:
      formatToDDMMYYYY(r.lock_in_end_date) ||
      (ag ? formatToDDMMYYYY(ag.lock_in_end_date) : '') ||
      '',
    increment_date: (() => {
      const inc =
        r.increment_date != null && r.increment_date !== '' ? r.increment_date : ag?.increment_date;
      return inc && inc !== '-' ? formatToDDMMYYYY(inc) : '';
    })(),
    security_deposit_amount:
      r.security_deposit_amount ??
      r.sec_deposit_amt ??
      ag?.sec_deposit_amt ??
      ag?.sec_deposit_amount ??
      '',
  };
}

export function isSeatReductionHint(hint) {
  return String(hint || '').includes('reduced');
}

export function getSeatChangeHint(oldSeats, newSeats) {
  const old = Number(oldSeats);
  const next = Number(newSeats);
  if (!Number.isFinite(old) || !Number.isFinite(next) || old === next) return '';
  if (old > next) return `Seats reduced from ${old} to ${next}`;
  if (old < next) return `Seats increased from ${old} to ${next}`;
  return '';
}

const UPDATED_LATEST_FIELDS = ['no_of_seats', 'area', 'price_per_seat', 'monthly_revenue'];

/** Amendment + Updated assign space: keep latest assign-space API values for seat/area/revenue fields. */
export function mergeAmendmentSpaceDetailFromAgreement(apiRow, agreementRow, isUpdatedSpace) {
  if (!agreementRow) return apiRow;
  if (!isUpdatedSpace) return { ...apiRow, ...agreementRow };

  const latest = Object.fromEntries(
    UPDATED_LATEST_FIELDS.map((k) => [k, apiRow?.[k]]).filter(([, v]) => v !== undefined),
  );
  const { no_of_seats: oldSeats, ...agreementRest } = agreementRow;
  return {
    ...apiRow,
    ...agreementRest,
    ...latest,
    seat_change_hint: getSeatChangeHint(oldSeats, apiRow?.no_of_seats),
  };
}

/**
 * Sparse `spaceDetailsById` overlay for the create drawer: only ids that have a
 * child table row on `agreement` appear. Omitted ids keep assign-space API
 * defaults only (no empty overwrite).
 */
export function buildAmendmentSpaceDetailsById(spaceIds, agreement) {
  if (!agreement || !Array.isArray(spaceIds) || spaceIds.length === 0) return;
  const byId = rowByAssignId(agreement);
  const out = {};
  for (const id of spaceIds) {
    const s = String(id);
    const row = byId.get(s);
    if (row) out[s] = mapRowToSpaceDetail(row, agreement);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
