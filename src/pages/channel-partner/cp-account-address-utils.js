/**
 * Helpers for CP Account address rows returned by get_cp_account_details (`addresses` array).
 */

function rowIsPrimary(a) {
  return Boolean(
    a?.isPrimary || a?.is_primary || String(a?.addressType ?? '').toLowerCase() === 'office',
  );
}

function rowIsBilling(a) {
  return Boolean(
    a?.isBilling || a?.is_billing || String(a?.addressType ?? '').toLowerCase() === 'billing',
  );
}

export function pickCpPrimaryAddressRow(addresses) {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return null;
  }
  // A primary address exists only when a row is explicitly flagged as primary,
  // so a billing-only account is not mistaken for having a primary address.
  return addresses.find((a) => rowIsPrimary(a)) ?? null;
}

/**
 * @param {Array} addresses - rows from get_cp_account_details
 */
export function pickCpBillingAddressRow(addresses) {
  if (!Array.isArray(addresses)) {
    return null;
  }
  // A billing address exists only when a row is explicitly flagged as billing.
  // (Mirrors CRM Account behaviour.) A primary-only account has no billing row,
  // so the detail view can offer an "Add Billing Address" action.
  return addresses.find((a) => rowIsBilling(a)) ?? null;
}

/** Shape expected by CpAccountEditAddressModal (same as client edit modal). */
export function mapCpAddressRowToModalShape(row) {
  const rowName = row?.id ?? row?.name;
  if (!row || !rowName) {
    return null;
  }
  return {
    name: rowName,
    address_line_1: row.addressLine1 ?? row.address_line_1 ?? '',
    address_line_2: row.addressLine2 ?? row.address_line_2 ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    pincode: row.pincode ?? '',
    country: row.country ?? '',
    is_primary: rowIsPrimary(row) ? 1 : 0,
    is_billing: rowIsBilling(row) ? 1 : 0,
  };
}
