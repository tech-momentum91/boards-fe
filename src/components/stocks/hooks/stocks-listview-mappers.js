export function mapProductMasterGroupByToApi(groupBy) {
  const key = String(groupBy ?? '').trim();
  if (!key) return '';
  if (key === 'category') return 'item_group';
  if (key === 'type') return 'custom_type';
  if (key === 'status') return 'disabled';
  return key;
}

export function mapStockRulesGroupByToApi(groupBy) {
  const key = String(groupBy ?? '').trim();
  if (!key) return '';
  if (key === 'category') return 'item_group';
  if (key === 'pattern') return 'custom_consumption';
  if (key === 'frequency') return 'custom_frequency';
  return key;
}
