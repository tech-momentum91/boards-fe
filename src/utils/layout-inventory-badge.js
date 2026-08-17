/**
 * Badge color for layout space inventory type labels (center + focus frame).
 *
 * @param {unknown} inventoryType
 * @returns {string}
 */
export function getLayoutInventoryTypeBadgeColor(inventoryType) {
  const v = String(inventoryType || '')
    .trim()
    .toLowerCase();
  if (v === 'managed office') return 'purple';
  if (v.includes('co-work') || v.includes('cowork')) return 'orange';
  if (v === 'pure rental') return 'teal';
  if (v === 'parking') return 'teal';
  if (v === 'resource') return 'pink';
  if (v.includes('common')) return 'sky';
  return 'blue';
}
