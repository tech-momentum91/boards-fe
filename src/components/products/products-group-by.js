/**
 * Groups product rows by a field for the Product tab list view.
 */
export function groupProductsRows(rows = [], groupByField, groupOrder = 'asc') {
  if (!groupByField) return [];

  const groups = rows.reduce((accumulator, row) => {
    const key = String(row[groupByField] ?? '').trim() || 'Uncategorized';
    if (!accumulator[key]) accumulator[key] = [];
    accumulator[key].push(row);
    return accumulator;
  }, {});

  const sortedEntries = Object.entries(groups).sort(([firstKey], [secondKey]) => {
    const comparison = firstKey.localeCompare(secondKey, undefined, { sensitivity: 'base' });
    return groupOrder === 'desc' ? -comparison : comparison;
  });

  return sortedEntries.map(([groupName, groupedRows]) => ({
    id: `${groupByField}-${groupName.toLowerCase().replaceAll(/\s+/g, '-')}`,
    groupName,
    rows: groupedRows,
    count: groupedRows.length,
  }));
}
