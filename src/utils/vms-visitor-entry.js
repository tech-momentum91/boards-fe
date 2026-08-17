/**
 * Visitor Entry document name for VMS APIs (`visitor_entry`, comments, detail).
 * Listview rows use Frappe `name` (e.g. VIS-2026-00001). Some UI rows use `name` for display — prefer detail or explicit ids.
 */

function trimStr(value) {
  return String(value ?? '').trim();
}

/** True when value looks like a person label, not a Frappe document name. */
export function looksLikeVisitorDisplayName(value) {
  const s = trimStr(value);
  if (!s) return false;
  if (/\s/.test(s)) return true;
  return false;
}

/**
 * @param {Record<string, unknown> | null | undefined} record — list row / selectedRecord
 * @param {Record<string, unknown> | null | undefined} [detail] — `get_visitor_entry_detail` message
 * @returns {string} Visitor Entry `name` (document id) or ''
 */
export function resolveVisitorEntryId(record, detail = null) {
  const fromDetail = trimStr(detail?.name);
  if (fromDetail && !looksLikeVisitorDisplayName(fromDetail)) {
    return fromDetail;
  }

  if (!record || typeof record !== 'object') {
    return fromDetail || '';
  }

  const explicit =
    trimStr(record.visitor_entry_id) ||
    trimStr(record.visitor_entry) ||
    trimStr(record.entry_id) ||
    trimStr(record.id);

  if (explicit && !looksLikeVisitorDisplayName(explicit)) {
    return explicit;
  }

  const rowName = trimStr(record.name);
  if (rowName && !looksLikeVisitorDisplayName(rowName)) {
    return rowName;
  }

  if (explicit) {
    return explicit;
  }

  return fromDetail || '';
}

/** Display label for list/drawer header (not for APIs). */
export function getVisitorDisplayName(record, detail = null) {
  if (!record || typeof record !== 'object') {
    const d = detail && typeof detail === 'object' ? detail : null;
    if (!d) return '';
    const fromDetail = [d.first_name, d.last_name].filter(Boolean).join(' ').trim();
    return fromDetail || trimStr(d.name) || '';
  }

  const first = trimStr(record.first_name);
  const last = trimStr(record.last_name);
  const full = [first, last].filter(Boolean).join(' ').trim();
  if (full) return full;

  const rowName = trimStr(record.name);
  if (rowName && looksLikeVisitorDisplayName(rowName)) {
    return rowName;
  }

  if (detail && typeof detail === 'object') {
    const fromDetail = [detail.first_name, detail.last_name].filter(Boolean).join(' ').trim();
    if (fromDetail) return fromDetail;
  }

  return rowName || trimStr(record.id) || '';
}
