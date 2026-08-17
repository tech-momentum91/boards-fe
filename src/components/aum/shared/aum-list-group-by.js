/** Display / sort key for grouping Asset In / Asset Out list rows. */
export function getAumTransactionGroupKey(row, groupBy) {
  if (!row || !groupBy) return 'Unknown';
  const raw = row[groupBy];
  return String(raw ?? '').trim() || 'Unknown';
}

export function buildAumGroupedSections(rows, groupBy, groupOrder = 'asc') {
  if (!groupBy || !Array.isArray(rows) || rows.length === 0) return [];

  const groups = rows.reduce((accumulator, row) => {
    const key = getAumTransactionGroupKey(row, groupBy);
    if (!accumulator[key]) accumulator[key] = [];
    accumulator[key].push(row);
    return accumulator;
  }, {});

  const sortedEntries = Object.entries(groups).sort(([firstKey], [secondKey]) => {
    const comparison = firstKey.localeCompare(secondKey, undefined, { sensitivity: 'base' });
    return groupOrder === 'desc' ? -comparison : comparison;
  });

  return sortedEntries.map(([groupName, groupedRows]) => ({
    id: `${groupBy}-${groupName.toLowerCase().replaceAll(/\s+/g, '-')}`,
    groupName,
    rows: groupedRows,
    count: groupedRows.length,
  }));
}
