const MATCH_BADGE_THRESHOLDS = { high: 60, medium: 40 };

/** Maps match % to AlignUI Badge color (green / orange / red). */
export function getMatchBadge(percentage) {
  const pct = Number(percentage) || 0;
  if (pct >= MATCH_BADGE_THRESHOLDS.high) {
    return { label: `${pct}%`, color: 'green' };
  }
  if (pct >= MATCH_BADGE_THRESHOLDS.medium) {
    return { label: `${pct}%`, color: 'orange' };
  }
  return { label: `${pct}%`, color: 'red' };
}

export function formatSeatDiff(diff) {
  if (diff === null || diff === undefined || Number.isNaN(Number(diff))) {
    return { text: '—', className: 'text-paragraph-sm text-text-sub-500' };
  }
  const n = Number(diff);
  if (n > 0) {
    return { text: `+${n}`, className: 'text-paragraph-sm text-[#079455]' };
  }
  if (n < 0) {
    return { text: String(n), className: 'text-paragraph-sm text-[#DF1C41]' };
  }
  return { text: '0', className: 'text-paragraph-sm text-text-sub-500' };
}

export function formatRateInr(value) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return `₹${num.toLocaleString('en-IN')}`;
}

export function formatLeadReqSeats(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export function filterInventoryRows(rows, keyword) {
  const q = String(keyword || '')
    .trim()
    .toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const hay = [row.center_name, row.city_code, row.space_name, row.space_type, row.floor]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

export function exportInventoryCsv(rows, visibleColumnIds) {
  const cols = [
    { id: 'center', header: 'Center', get: (r) => `${r.center_name} (${r.city_code || ''})` },
    { id: 'space_type', header: 'Space Type', get: (r) => r.space_type },
    { id: 'space_name', header: 'Space Name', get: (r) => r.space_name },
    { id: 'match', header: 'Match %', get: (r) => r.match_percentage },
    { id: 'floor', header: 'Floor', get: (r) => r.floor },
    { id: 'status', header: 'Status', get: (r) => r.status },
    { id: 'lead_req', header: 'Lead Req.', get: (r) => formatLeadReqSeats(r.lead_req_seats) },
    { id: 'avail_seats', header: 'Avail. Seats', get: (r) => r.avail_seats },
    { id: 'seat_diff', header: 'Seat Diff', get: (r) => formatSeatDiff(r.seat_diff).text },
    { id: 'rate_per_seat', header: 'Rate/Seat', get: (r) => formatRateInr(r.rate_per_seat) },
    { id: 'est_monthly', header: 'Est. Monthly', get: (r) => formatRateInr(r.est_monthly_cost) },
  ];
  const active = cols.filter((c) => visibleColumnIds.includes(c.id));
  const header = active.map((c) => c.header).join(',');
  const lines = rows.map((row) =>
    active
      .map((c) => {
        const val = String(c.get(row) ?? '').replaceAll('"', '""');
        return `"${val}"`;
      })
      .join(','),
  );
  return [header, ...lines].join('\n');
}

export function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function normalizeInventoryRow(row, manualId) {
  return {
    ...row,
    id: row.space_id || manualId,
    space_id: row.space_id,
  };
}

export function isSelectableInventoryRow(row) {
  if (!row?.id) return false;
  if (row._isManual && !row.space_id) return false;
  return true;
}

export function getSelectableRowIds(rows) {
  return rows.filter(isSelectableInventoryRow).map((row) => row.id);
}

export function isRowSelected(selectedIds, rowId) {
  return selectedIds.includes(rowId);
}

export function toggleRowSelection(selectedIds, rowId, checked) {
  if (checked) return [...new Set([...selectedIds, rowId])];
  return selectedIds.filter((id) => id !== rowId);
}

/** Radix checkbox state for the header "select all" control. */
export function getSelectAllCheckedState(selectedIds, selectableIds) {
  if (selectableIds.length === 0) return false;
  const selectedCount = selectableIds.filter((id) => selectedIds.includes(id)).length;
  if (selectedCount === 0) return false;
  if (selectedCount === selectableIds.length) return true;
  return 'indeterminate';
}

export function toggleSelectAll(selectedIds, selectableIds, checked) {
  if (selectableIds.length === 0) return selectedIds;
  if (checked) {
    return [...new Set([...selectedIds, ...selectableIds])];
  }
  const selectableSet = new Set(selectableIds);
  return selectedIds.filter((id) => !selectableSet.has(id));
}
