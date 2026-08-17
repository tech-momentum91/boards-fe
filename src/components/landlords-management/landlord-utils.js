/**
 * List/table helpers for landlord list views (grouping, center matching for global filter).
 * Used by `landlords-table.jsx` and `landlords.jsx`.
 */

export function getLandlordGroupKey(row, groupByField) {
  if (!groupByField || !row) return '';
  switch (groupByField) {
    case 'center': {
      const c = row.center;
      if (c == null || c === '') return '—';
      if (Array.isArray(c)) return String(c[0] || '—');
      if (typeof c === 'string') {
        const first = c.split(',')[0]?.trim();
        return first || '—';
      }
      return String(c);
    }
    case 'state':
      return row.state != null && row.state !== '' ? String(row.state) : '—';
    case 'city':
      return row.city != null && row.city !== '' ? String(row.city) : '—';
    case 'engagement_mode':
      return row.engagement_mode != null && row.engagement_mode !== ''
        ? String(row.engagement_mode)
        : '—';
    case 'status':
      return row.status != null && row.status !== '' ? String(row.status) : '—';
    default:
      return '—';
  }
}

/**
 * Values from a landlord list row that represent linked centers (display names, IDs, or mixed).
 */
export function getRowCenterValues(row) {
  if (!row) return [];
  const out = new Set();
  const push = (v) => {
    if (v == null || v === '') return;
    if (Array.isArray(v)) {
      v.forEach((x) => {
        if (x != null && x !== '') out.add(String(x).trim());
      });
    } else if (typeof v === 'string') {
      v.split(',').forEach((s) => {
        const t = s.trim();
        if (t) out.add(t);
      });
    } else {
      out.add(String(v).trim());
    }
  };
  push(row.center);
  push(row.centers);
  return [...out];
}

/**
 * When the global center filter has selections, keep only rows tied to at least one selected
 * center (match by center doc `name` e.g. CTR-353 or by `center_name` from access list).
 * Use with `centerAccess.data` from Redux so list rows that only have display names still match.
 */
export function landlordRowMatchesGlobalCenters(row, selectedCenterIds, centerAccessList) {
  if (!Array.isArray(selectedCenterIds) || selectedCenterIds.length === 0) {
    return true;
  }
  const allowed = new Set();
  for (const id of selectedCenterIds) {
    const idStr = String(id).trim();
    if (idStr) allowed.add(idStr);
    const doc = (centerAccessList || []).find((c) => String(c?.name) === idStr);
    if (doc) {
      if (doc.name) allowed.add(String(doc.name).trim());
      if (doc.center_name) allowed.add(String(doc.center_name).trim());
    }
  }
  const rowVals = getRowCenterValues(row);
  if (rowVals.length === 0) {
    return false;
  }
  for (const val of rowVals) {
    const v = val.trim();
    for (const a of allowed) {
      if (a && v.toLowerCase() === String(a).toLowerCase()) {
        return true;
      }
    }
  }
  return false;
}
