/** Flat category names from `get_stock_category`. */
export function parseStockCategoriesFromApi(result) {
  const message = result?.message ?? result ?? {};
  const categories = Array.isArray(message.categories)
    ? message.categories
    : Array.isArray(message)
      ? message
      : Array.isArray(message.data)
        ? message.data
        : [];

  const byValue = new Map();
  for (const category of categories) {
    const value =
      typeof category === 'string'
        ? category.trim()
        : String(category?.value ?? category?.name ?? category?.category ?? '').trim();
    if (!value || byValue.has(value)) continue;
    byValue.set(value, { value, label: value });
  }

  return [...byValue.values()].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
  );
}

/**
 * Parent → child groups from `get_product_master_category` (`message.results`).
 * Parents are labels only; children are selectable options.
 */
export function parseProductMasterCategoryGroupsFromApi(result) {
  const message = result?.message ?? result ?? {};
  const results = message.results ?? message.data?.results ?? message.data ?? null;
  if (!results || typeof results !== 'object' || Array.isArray(results)) return [];

  const groups = [];
  for (const [parent, children] of Object.entries(results)) {
    const parentLabel = String(parent ?? '').trim();
    if (!parentLabel) continue;

    const childOptions = (Array.isArray(children) ? children : [])
      .map((child) => {
        const value = String(child ?? '').trim();
        return value ? { value, label: value } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

    if (childOptions.length > 0) {
      groups.push({
        parent: parentLabel,
        label: parentLabel,
        children: childOptions,
      });
    }
  }

  return groups.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

/** Flat selectable options (subcategories) for value inclusion / legacy helpers. */
export function flattenProductMasterCategoryOptions(groups) {
  const byValue = new Map();
  for (const group of Array.isArray(groups) ? groups : []) {
    for (const child of group?.children ?? []) {
      const value = String(child?.value ?? '').trim();
      if (!value || byValue.has(value)) continue;
      byValue.set(value, {
        value,
        label: String(child?.label ?? value).trim() || value,
      });
    }
  }
  return [...byValue.values()].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
  );
}
