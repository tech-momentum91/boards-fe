import {
  assigneeToAvatars,
  assigneesListToAvatars,
  formatSelectionApiDate,
  denormalizeSelectionPriority,
} from '@/components/projects/project-selection/project-selection-helpers';
import { mapDeliveryChallanFromUrl } from '@/components/projects/project-selection/project-selection-delivery-cells';

export { assigneeToAvatars, assigneesListToAvatars };

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.filter((tag) => typeof tag === 'string');
  if (tags && typeof tags === 'object') {
    return Object.values(tags)
      .flat()
      .filter((tag) => typeof tag === 'string');
  }
  return [];
}

function mapAttachments(attachments) {
  return (attachments ?? []).map((att) => ({
    id: att.name,
    name: att.file_name || att.name,
    fileName: att.file_name || att.name,
    fileNameFull: att.file_name || att.name,
    url: att.file_url,
    size: att.file_size,
    createdAt: att.creation,
  }));
}

function mapItem(item, categoryRow) {
  return {
    id: item.name,
    name: item.name,
    title: item.item_name || item.item || 'Item',
    item: item.item,
    item_name: item.item_name,
    product_sub_category: item.product_type || 'Select',
    product_type: item.product_type,
    assignees: assigneesListToAvatars(item.assignees, item.assignee, item.assignee_type),
    assignee_type: item.assignee_type,
    assignee: item.assignee,
    exp_selection_date: item.exp_selection_date
      ? formatSelectionApiDate(item.exp_selection_date)
      : '',
    selection_status: item.selection_status || null,
    long_lead: Boolean(item.long_lead),
    qty: String(item.qty ?? 1),
    task: item.task,
    tags: normalizeTags(item.tags),
    field_values: item.field_values ?? [],
    custom_columns: item.custom_columns ?? categoryRow.custom_columns ?? [],
    description: item.description || '',
    attachments: mapAttachments(item.attachments),
  };
}

function mapCategoryRow(row) {
  return {
    id: row.name,
    name: row.name,
    title: row.selection_category_name,
    selection_category_name: row.selection_category_name,
    selection_category: row.selection_category,
    product_category: row.product_category,
    order_category: row.order_category,
    order_category_label: row.order_category_label || row.order_category,
    assignees: assigneesListToAvatars(row.assignees, row.assignee, row.assignee_type),
    assignee_type: row.assignee_type,
    assignee: row.assignee,
    exp_selection_date: formatSelectionApiDate(row.exp_selection_date),
    selection_status: row.selection_status || 'Pending',
    exp_po_date: formatSelectionApiDate(row.exp_po_date),
    po_status: row.po_status || 'Pending',
    exp_delivery_date: formatSelectionApiDate(row.exp_delivery_date),
    delivery_status: row.delivery_status || 'Pending',
    custom_columns: row.custom_columns ?? [],
    priority: denormalizeSelectionPriority(row.priority),
    description: row.description || '',
    tags: normalizeTags(row.tags),
    attachments: mapAttachments(row.attachments),
    delivery_photo: row.delivery_photo || '',
    delivery_photo_url: row.delivery_photo || '',
    delivery_challan: mapDeliveryChallanFromUrl(row.delivery_challan),
    task: row.task,
    items: (row.items ?? []).map((item) => mapItem(item, row)),
  };
}

export function adaptApiCategoryRow(row) {
  return mapCategoryRow(row);
}

export function adaptApiItemRow(item, categoryRow = {}) {
  return mapItem(item, categoryRow);
}

export function adaptProjectSelectionResponse(payload) {
  const groups = payload?.groups ?? [];
  return groups.map((group) => ({
    id: group.id === '__ungrouped__' ? 'ungrouped' : group.id,
    label:
      group.id === '__ungrouped__' || group.id === 'ungrouped'
        ? 'UNCATEGORIZED'
        : (group.label || group.id || 'UNCATEGORIZED').toUpperCase(),
    rows: (group.rows ?? []).map(mapCategoryRow),
  }));
}
