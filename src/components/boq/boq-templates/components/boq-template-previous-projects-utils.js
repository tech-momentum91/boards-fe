export function formatBoqPreviousProjectItemCount(count) {
  const value = Number(count);
  if (!Number.isFinite(value) || value < 0) return '0 items';
  return `${value.toLocaleString('en-IN')} items`;
}

export function filterBoqPreviousProjectProducts(
  products,
  { categoryId, categoryMeta, searchQuery } = {},
) {
  const query = String(searchQuery ?? '')
    .trim()
    .toLowerCase();

  return (products ?? []).filter((row) => {
    if (categoryId || categoryMeta) {
      const productKeys = [row.categoryId, row.categoryType, row.categoryGroup]
        .filter(Boolean)
        .map((value) => String(value));
      const metaKeys = [categoryMeta?.filterValue, categoryMeta?.label, categoryId]
        .filter(Boolean)
        .map((value) => String(value));
      if (metaKeys.length > 0 && !productKeys.some((key) => metaKeys.includes(key))) {
        return false;
      }
    }

    if (!query) return true;

    const haystack = [row.product, row.areaLocation, row.description, row.brand, row.section]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}
