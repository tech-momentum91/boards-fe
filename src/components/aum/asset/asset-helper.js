const slugify = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll(/[^\da-z]+/g, '-')
    .replaceAll(/^-|-$/g, '');

export function buildAumAssetHierarchy(rows, groupRules = []) {
  const validRules = (Array.isArray(groupRules) ? groupRules : []).filter((rule) => rule?.field);
  if (validRules.length === 0) {
    return { type: 'leaf', rows };
  }

  function buildLevel(items, depth) {
    if (depth >= validRules.length) {
      return { type: 'leaf', rows: items };
    }

    const { field, order = 'asc' } = validRules[depth];
    const groups = new Map();

    for (const row of items) {
      const label = String(row[field] || '—').trim() || '—';
      if (!groups.has(label)) {
        groups.set(label, []);
      }
      groups.get(label).push(row);
    }

    const children = [...groups.entries()]
      .sort(([left], [right]) => {
        const comparison = left.localeCompare(right);
        return order === 'desc' ? -comparison : comparison;
      })
      .map(([label, childRows]) => ({
        type: 'group',
        id: `${depth}-${slugify(label)}`,
        name: label,
        depth,
        node: buildLevel(childRows, depth + 1),
      }));

    return { type: 'branch', children };
  }

  return buildLevel(rows, 0);
}
