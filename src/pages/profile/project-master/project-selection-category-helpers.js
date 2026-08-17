export function makeSelectionColumnId(columnLabel) {
  return String(columnLabel ?? '')
    .trim()
    .replaceAll(' ', '_')
    .replaceAll('-', '_')
    .toLowerCase();
}

export function buildFieldValuesForItem(item, customColumns = []) {
  const existing = item?.field_values ?? [];
  return customColumns.map((col) => {
    const match = existing.find((fv) => fv.column_label === col.column_label);
    return {
      column_label: col.column_label,
      column_type: col.column_type,
      field_value: match?.field_value ?? '',
      attachment: match?.attachment ?? '',
    };
  });
}

export function getPersistableItems(items = []) {
  return items.filter((item) => String(item?.item ?? '').trim());
}

export function buildSelectionCategoryPayload(detail) {
  return {
    name: detail.name,
    selection_category_name: detail.selection_category_name,
    product_category: detail.product_category,
    order_category: detail.order_category,
    assignee_type: detail.assignee_type || 'Role',
    assignee: detail.assignee,
    custom_columns: JSON.stringify(detail.custom_columns ?? []),
    items: JSON.stringify(
      getPersistableItems(detail.items).map((item) => ({
        item: item.item,
        product_type: item.product_type,
        assignee_type: item.assignee_type || detail.assignee_type || 'Role',
        assignee: item.assignee || detail.assignee,
        long_lead: item.long_lead ? 1 : 0,
        field_values: buildFieldValuesForItem(item, detail.custom_columns),
      })),
    ),
  };
}

export function createEmptyItem(categoryDetail) {
  return {
    item: '',
    item_name: '',
    product_type: '',
    assignee_type: categoryDetail.assignee_type || 'Role',
    assignee: categoryDetail.assignee || '',
    long_lead: false,
    field_values: buildFieldValuesForItem({}, categoryDetail.custom_columns),
  };
}
