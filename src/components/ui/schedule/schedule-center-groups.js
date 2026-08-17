/**
 * Group calendar resources by center for column-band headers (resources-x-time-y layout).
 */

export function buildCenterColumnGroups(resources) {
  if (!resources?.length) {
    return { resourcesOrdered: [], centerGroups: [] };
  }

  const resourcesOrdered = [...resources].sort((a, b) => {
    const ca = String(a.centerName ?? a.centerId ?? '').localeCompare(
      String(b.centerName ?? b.centerId ?? ''),
      undefined,
      { sensitivity: 'base' },
    );
    if (ca !== 0) return ca;
    return String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, {
      sensitivity: 'base',
    });
  });

  const centerGroups = [];
  for (const r of resourcesOrdered) {
    const centerId = r.centerId ?? r.center ?? '';
    const centerName = r.centerName || centerId || 'Center';
    const prev = centerGroups[centerGroups.length - 1];
    if (!prev || prev.centerId !== centerId) {
      centerGroups.push({ centerId, centerName, count: 1 });
    } else {
      prev.count += 1;
    }
  }

  return { resourcesOrdered, centerGroups };
}
