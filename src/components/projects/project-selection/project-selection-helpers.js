import { format, parseISO, isValid } from 'date-fns';
import { formatDateToYYYYMMDD, parseToDate } from '@/utils/date-utils';
import {
  buildFieldValuesForItem,
  getPersistableItems,
} from '@/pages/profile/project-master/project-selection-category-helpers';
import {
  PROJECT_DETAIL_DELIVERY_STATUS_OPTIONS,
  PROJECT_DETAIL_PO_STATUS_OPTIONS,
  PROJECT_DETAIL_SELECTION_PRIORITY_OPTIONS,
  PROJECT_DETAIL_SELECTION_STATUS_OPTIONS,
  PROJECT_SELECTION_AVATAR_COLORS,
  PROJECT_SELECTION_CATEGORY_DATE_FIELDS,
  PROJECT_SELECTION_ITEM_DATE_FIELDS,
} from '@/components/projects/constants';
import { rowMatchesAssigneeFilter } from '@/components/projects/shared/project-quick-filter-toolbar';

function initialsFromAssignee(assignee) {
  const value = String(assignee ?? '').trim();
  if (!value) return 'NA';
  if (value.includes('@')) {
    const local = value.split('@')[0] ?? '';
    const parts = local.split(/[._-]+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
    return local.slice(0, 2).toUpperCase();
  }
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  return value.slice(0, 2).toUpperCase();
}

export function assigneeToAvatars(assignee, assigneeType = 'User') {
  if (!assignee) return [];
  return [
    {
      id: assignee,
      value: assignee,
      email: assignee,
      initials: initialsFromAssignee(assignee),
      color:
        PROJECT_SELECTION_AVATAR_COLORS[
          Math.abs(String(assignee).length) % PROJECT_SELECTION_AVATAR_COLORS.length
        ],
      assignee,
      assignee_type: assigneeType,
      label: assignee,
      full_name: assignee,
      name: assignee,
    },
  ];
}

export function assigneesListToAvatars(assignees = [], fallbackAssignee, fallbackType = 'User') {
  const list = Array.isArray(assignees) ? assignees.filter(Boolean) : [];
  if (list.length > 0) {
    return list.map((entry, index) => {
      if (typeof entry === 'string') {
        return assigneeToAvatars(entry, 'User')[0];
      }
      const email = entry.assignee || entry.email || entry.value || entry.id || entry.name;
      const type = entry.assignee_type || 'User';
      const label = entry.full_name || entry.label || email;
      return {
        id: email || entry.id || `${type}:${email}`,
        value: email,
        email,
        name: email,
        initials: initialsFromAssignee(label || email),
        color:
          PROJECT_SELECTION_AVATAR_COLORS[
            Math.abs(String(email || index).length) % PROJECT_SELECTION_AVATAR_COLORS.length
          ],
        assignee: email,
        assignee_type: type,
        label,
        full_name: label,
        user_image: entry.user_image || entry.image,
      };
    });
  }
  return assigneeToAvatars(fallbackAssignee, fallbackType);
}

export function assigneesToApiPayload(assignees = []) {
  if (!Array.isArray(assignees)) return [];
  const out = [];
  const seen = new Set();
  for (const entry of assignees) {
    let email = null;
    let assigneeType = 'User';
    if (typeof entry === 'string') {
      email = entry.trim();
    } else if (entry && typeof entry === 'object') {
      assigneeType = entry.assignee_type || 'User';
      email = String(
        entry.assignee || entry.email || entry.value || entry.id || entry.name || '',
      ).trim();
    }
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push({ assignee_type: assigneeType || 'User', assignee: email });
  }
  return out;
}

const CATEGORY_DATE_FIELDS = new Set(PROJECT_SELECTION_CATEGORY_DATE_FIELDS);
const ITEM_DATE_FIELDS = new Set(PROJECT_SELECTION_ITEM_DATE_FIELDS);

export function normalizeSelectionPriority(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw === 'select') return null;
  const mapping = { low: 'Low', medium: 'Medium', high: 'High' };
  return mapping[raw.toLowerCase()] ?? raw;
}

export function denormalizeSelectionPriority(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return 'select';
  return raw.toLowerCase();
}

function serializeFieldValue(fieldName, value) {
  if (CATEGORY_DATE_FIELDS.has(fieldName) || ITEM_DATE_FIELDS.has(fieldName)) {
    const parsed = parseToDate(value);
    return parsed ? formatDateToYYYYMMDD(parsed) : '';
  }
  if (fieldName === 'priority') return normalizeSelectionPriority(value) ?? '';
  if (fieldName === 'assignees') return JSON.stringify(assigneesToApiPayload(value));
  if (fieldName === 'tags')
    return JSON.stringify(Array.isArray(value) ? value.filter(Boolean) : []);
  if (fieldName === 'field_values') return JSON.stringify(value ?? []);
  if (fieldName === 'long_lead') return value ? '1' : '0';
  if (fieldName === 'delivery_photo' || fieldName === 'delivery_challan') {
    if (value instanceof File) return value;
    if (value && typeof value === 'object') return value.url || '';
    return value || '';
  }
  return value ?? '';
}

function getSelectionEntityFieldValue(entity, fieldName) {
  if (!entity) return undefined;
  if (fieldName === 'title' || fieldName === 'selection_category_name') {
    return entity.selection_category_name ?? entity.title ?? '';
  }
  if (fieldName === 'assignees') {
    return entity.assignees?.length ? entity.assignees : entity.assignee ? [entity.assignee] : [];
  }
  if (fieldName === 'delivery_photo') {
    return entity.delivery_photo_url || entity.delivery_photo || '';
  }
  if (fieldName === 'delivery_challan') {
    return entity.delivery_challan || '';
  }
  return entity[fieldName];
}

/**
 * True when the incoming blur/change value matches what is already stored —
 * used to skip no-op update API calls from detail-view focus loss.
 */
export function isSelectionFieldUnchanged(entity, fieldName, nextValue) {
  if (!entity || !fieldName) return false;
  if (fieldName === 'custom_image') return false;
  if (nextValue instanceof File) return false;
  if (nextValue && typeof nextValue === 'object' && nextValue.file instanceof File) {
    return false;
  }

  const apiFieldName = fieldName === 'title' ? 'selection_category_name' : fieldName;
  const current = getSelectionEntityFieldValue(entity, apiFieldName);
  const currentSerialized = serializeFieldValue(apiFieldName, current);
  const nextSerialized = serializeFieldValue(apiFieldName, nextValue);

  if (currentSerialized instanceof File || nextSerialized instanceof File) return false;
  return String(currentSerialized ?? '') === String(nextSerialized ?? '');
}

export function buildSelectionCategoryUpdateFormData(projectId, categoryName, fieldName, value) {
  const apiFieldName = fieldName === 'title' ? 'selection_category_name' : fieldName;
  const formData = new FormData();
  formData.append('project', String(projectId ?? '').trim());
  formData.append('category_name', String(categoryName ?? '').trim());

  const serialized = serializeFieldValue(apiFieldName, value);
  if (serialized instanceof File) {
    formData.append(apiFieldName, serialized, serialized.name);
  } else {
    formData.append(apiFieldName, serialized);
  }
  return formData;
}

export function buildSelectionItemUpdateFormData(
  projectId,
  categoryName,
  itemName,
  fieldName,
  value,
) {
  const formData = new FormData();
  formData.append('project', String(projectId ?? '').trim());
  formData.append('category_name', String(categoryName ?? '').trim());
  formData.append('item_name', String(itemName ?? '').trim());

  if (
    fieldName === 'custom_image' &&
    value &&
    typeof value === 'object' &&
    value.file instanceof File
  ) {
    formData.append('column_label', value.column_label || '');
    formData.append('attachment', value.file, value.file.name);
    return formData;
  }

  formData.append(fieldName, serializeFieldValue(fieldName, value));
  return formData;
}

export function resolveItemSelectionStatus(item, categoryRow) {
  if (item?.selection_status) return item.selection_status;
  return categoryRow?.selection_status || 'Pending';
}

export function resolveItemExpSelectionDate(item, categoryRow) {
  if (item?.exp_selection_date) return item.exp_selection_date;
  return categoryRow?.exp_selection_date || '';
}

export function patchSelectionCategoryRow(row, fieldName, value) {
  if (!row) return row;
  const next = { ...row };

  if (fieldName === 'assignees') {
    next.assignees = value;
    const payload = assigneesToApiPayload(value);
    next.assignee = payload[0]?.assignee ?? '';
    next.assignee_type = payload[0]?.assignee_type ?? 'User';
    return next;
  }

  if (fieldName === 'title' || fieldName === 'selection_category_name') {
    next.title = value;
    next.selection_category_name = value;
    return next;
  }

  if (fieldName === 'priority') {
    next.priority = denormalizeSelectionPriority(value);
    return next;
  }

  if (CATEGORY_DATE_FIELDS.has(fieldName) && value) {
    const parsed = parseToDate(value);
    next[fieldName] = parsed ? format(parsed, 'do MMM yyyy') : value;
    if (fieldName === 'exp_selection_date' && row.items?.length) {
      const previousDate = row.exp_selection_date || '';
      next.items = row.items.map((item) => {
        if (!item.exp_selection_date || item.exp_selection_date === previousDate) {
          return { ...item, exp_selection_date: null };
        }
        return item;
      });
    }
    return next;
  }

  if (fieldName === 'selection_status') {
    const previousStatus = row.selection_status || 'Pending';
    next.selection_status = value;
    if (row.items?.length) {
      next.items = row.items.map((item) => {
        if (!item.selection_status || item.selection_status === previousStatus) {
          return { ...item, selection_status: null };
        }
        return item;
      });
    }
    return next;
  }

  if (fieldName === 'delivery_photo') {
    if (value instanceof File) {
      next.delivery_photo = value;
      next.delivery_photo_url = value;
      return next;
    }
    next.delivery_photo = value || '';
    next.delivery_photo_url = value || '';
    return next;
  }

  if (fieldName === 'delivery_challan') {
    if (!value) {
      next.delivery_challan = null;
      return next;
    }
    if (value instanceof File) {
      next.delivery_challan = {
        name: value.name,
        url: URL.createObjectURL(value),
        file: value,
        sizeBytes: value.size,
      };
      return next;
    }
    if (typeof value === 'string') {
      next.delivery_challan = {
        name: value.split('/').pop() || 'File',
        url: value,
        size: '',
      };
      return next;
    }
    next.delivery_challan = value;
    return next;
  }

  next[fieldName] = value;
  return next;
}

export function patchSelectionItemRow(row, fieldName, value) {
  if (!row) return row;
  const next = { ...row };

  if (fieldName === 'assignees') {
    next.assignees = value;
    const payload = assigneesToApiPayload(value);
    next.assignee = payload[0]?.assignee ?? '';
    next.assignee_type = payload[0]?.assignee_type ?? 'User';
    return next;
  }

  if (fieldName === 'exp_selection_date' && value) {
    const parsed = parseToDate(value);
    next.exp_selection_date = parsed ? format(parsed, 'do MMM yyyy') : value;
    return next;
  }

  if (fieldName === 'selection_status') {
    next.selection_status = value;
    return next;
  }

  if (fieldName === 'qty') {
    next.qty = String(value ?? '');
    return next;
  }

  if (fieldName === 'field_values') {
    next.field_values = value;
    return next;
  }

  next[fieldName] = value;
  return next;
}

export function findSelectionCategoryInGroups(groups, categoryId) {
  for (const group of groups ?? []) {
    const row = (group.rows ?? []).find((entry) => entry.id === categoryId);
    if (row) return { group, row };
  }
  return null;
}

export function findSelectionItemInGroups(groups, categoryId, itemId) {
  const found = findSelectionCategoryInGroups(groups, categoryId);
  if (!found) return null;
  const item = (found.row.items ?? []).find((entry) => entry.id === itemId);
  if (!item) return null;
  return { ...found, item };
}

export function flattenSelectionCategoryRows(groups = []) {
  return (groups ?? []).flatMap((group) =>
    (group.rows ?? []).map((row) => ({
      ...row,
      order_category:
        row.order_category || (group.id !== 'ungrouped' && group.id !== 'all' ? group.id : ''),
      order_category_label:
        row.order_category_label ||
        row.order_category ||
        (group.id !== 'ungrouped' && group.id !== 'all' ? group.label : 'Uncategorized'),
    })),
  );
}

export function selectionRowMatchesSearch(row, searchQuery = '') {
  const query = String(searchQuery ?? '')
    .trim()
    .toLowerCase();
  if (!query) return true;
  return [row.title, row.product_category, ...(row.items ?? []).map((item) => item.title)]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}

export function selectionRowMatchesFilters(row, selectedFilters = {}) {
  const statusFilters = selectedFilters.status ?? [];
  const poStatusFilters = selectedFilters.po_status ?? [];
  const deliveryStatusFilters = selectedFilters.delivery_status ?? [];
  const priorityFilters = selectedFilters.priority ?? [];
  const orderCategoryFilters = selectedFilters.order_category ?? [];
  const productCategoryFilters = selectedFilters.product_category ?? [];
  const assigneeFilters = selectedFilters.assignee ?? [];

  if (statusFilters.length > 0 && !statusFilters.includes(row.selection_status)) return false;
  if (poStatusFilters.length > 0 && !poStatusFilters.includes(row.po_status)) return false;
  if (deliveryStatusFilters.length > 0 && !deliveryStatusFilters.includes(row.delivery_status)) {
    return false;
  }
  if (priorityFilters.length > 0 && !priorityFilters.includes(row.priority)) return false;
  if (orderCategoryFilters.length > 0) {
    const key = row.order_category || 'ungrouped';
    if (!orderCategoryFilters.includes(key)) return false;
  }
  if (productCategoryFilters.length > 0 && !productCategoryFilters.includes(row.product_category)) {
    return false;
  }
  if (!rowMatchesAssigneeFilter(row, assigneeFilters)) return false;
  return true;
}

function getSelectionGroupKey(row, groupBy) {
  switch (groupBy) {
    case 'selection_status':
      return row.selection_status || 'Pending';
    case 'priority':
      return row.priority && row.priority !== 'select' ? row.priority : 'select';
    case 'product_category':
      return row.product_category || 'ungrouped';
    case 'order_category':
      return row.order_category || 'ungrouped';
    default:
      return 'all';
  }
}

function getSelectionGroupLabel(row, groupBy, key) {
  switch (groupBy) {
    case 'selection_status':
    case 'priority':
      return String(key).toUpperCase();
    case 'product_category':
      return key === 'ungrouped' ? 'UNCATEGORIZED' : String(key).toUpperCase();
    case 'order_category':
      if (key === 'ungrouped') return 'UNCATEGORIZED';
      return String(row.order_category_label || key).toUpperCase();
    default:
      return 'ALL';
  }
}

export function buildVisibleSelectionGroups({
  groups = [],
  searchQuery = '',
  selectedFilters = {},
  groupBy = 'order_category',
  groupOrder = 'asc',
} = {}) {
  const matches = (row) =>
    selectionRowMatchesSearch(row, searchQuery) && selectionRowMatchesFilters(row, selectedFilters);

  // Keep API group + row order when grouping by Order Type (only filter).
  if (groupBy === 'order_category') {
    const filtered = (groups ?? [])
      .map((group) => ({
        ...group,
        rows: (group.rows ?? []).filter(matches),
      }))
      .filter((group) => group.rows.length > 0);

    return [...filtered].sort((left, right) => {
      const comparison = String(left.label).localeCompare(String(right.label));
      return groupOrder === 'desc' ? -comparison : comparison;
    });
  }

  const rows = flattenSelectionCategoryRows(groups).filter(matches);

  if (!groupBy) {
    return rows.length > 0 ? [{ id: 'all', label: 'ALL', rows }] : [];
  }

  const grouped = new Map();
  rows.forEach((row) => {
    const key = getSelectionGroupKey(row, groupBy);
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        label: getSelectionGroupLabel(row, groupBy, key),
        rows: [],
      });
    }
    grouped.get(key).rows.push(row);
  });

  return [...grouped.values()].sort((left, right) => {
    const comparison = String(left.label).localeCompare(String(right.label));
    return groupOrder === 'desc' ? -comparison : comparison;
  });
}

export function collectSelectionFilterOptions(groups = []) {
  const rows = flattenSelectionCategoryRows(groups);
  const assignees = new Map();
  const orderCategories = new Map();
  const productCategories = new Map();

  rows.forEach((row) => {
    (row.assignees ?? []).forEach((assignee) => {
      const value = String(
        assignee.assignee ?? assignee.email ?? assignee.value ?? assignee.id ?? '',
      ).trim();
      if (!value || assignees.has(value)) return;
      assignees.set(value, {
        value,
        label: assignee.label ?? assignee.full_name ?? assignee.name ?? value,
      });
    });

    const orderKey = row.order_category || 'ungrouped';
    if (!orderCategories.has(orderKey)) {
      orderCategories.set(orderKey, {
        value: orderKey,
        label:
          orderKey === 'ungrouped'
            ? 'Uncategorized'
            : row.order_category_label || row.order_category || orderKey,
      });
    }

    const productKey = String(row.product_category ?? '').trim();
    if (productKey && !productCategories.has(productKey)) {
      productCategories.set(productKey, { value: productKey, label: productKey });
    }
  });

  const byLabel = (left, right) => left.label.localeCompare(right.label);

  return {
    status: PROJECT_DETAIL_SELECTION_STATUS_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
    })),
    po_status: PROJECT_DETAIL_PO_STATUS_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
    })),
    delivery_status: PROJECT_DETAIL_DELIVERY_STATUS_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
    })),
    priority: PROJECT_DETAIL_SELECTION_PRIORITY_OPTIONS.filter(
      (option) => option.value !== 'select',
    ).map((option) => ({
      value: option.value,
      label: option.label,
    })),
    assignee: [...assignees.values()].sort(byLabel),
    order_category: [...orderCategories.values()].sort(byLabel),
    product_category: [...productCategories.values()].sort(byLabel),
  };
}

export function patchSelectionGroups(groups, _groupId, categoryId, patch) {
  return (groups ?? []).map((group) => ({
    ...group,
    rows: (group.rows ?? []).map((row) => (row.id === categoryId ? { ...row, ...patch } : row)),
  }));
}

export function patchSelectionItemInGroups(groups, _groupId, categoryId, itemId, patch) {
  return (groups ?? []).map((group) => ({
    ...group,
    rows: (group.rows ?? []).map((row) =>
      row.id === categoryId
        ? {
            ...row,
            items: (row.items ?? []).map((item) =>
              item.id === itemId ? { ...item, ...patch } : item,
            ),
          }
        : row,
    ),
  }));
}

export function formatSelectionApiDate(value) {
  if (!value) return '';
  const parsed = typeof value === 'string' ? parseISO(value) : value;
  if (!isValid(parsed)) return String(value);
  return format(parsed, 'do MMM yyyy');
}

export function replaceCategoryInGroups(groups, groupId, categoryRow) {
  if (!categoryRow?.id) return groups ?? [];
  const targetGroupId = groupId || 'ungrouped';
  const list = groups ?? [];

  let sourceGroupId = null;
  let sourceIndex = -1;
  for (const group of list) {
    const index = (group.rows ?? []).findIndex((row) => row.id === categoryRow.id);
    if (index !== -1) {
      sourceGroupId = group.id;
      sourceIndex = index;
      break;
    }
  }

  // Same group: replace in place so updates don't shove the row to the bottom.
  if (sourceGroupId === targetGroupId && sourceIndex !== -1) {
    return list.map((group) => {
      if (group.id !== targetGroupId) return group;
      const nextRows = [...(group.rows ?? [])];
      nextRows[sourceIndex] = { ...nextRows[sourceIndex], ...categoryRow };
      return { ...group, rows: nextRows };
    });
  }

  // Moved to another order type (or new row): remove from old group, append to target.
  const withoutCategory = list.map((group) => ({
    ...group,
    rows: (group.rows ?? []).filter((row) => row.id !== categoryRow.id),
  }));
  return appendCategoryToGroups(withoutCategory, targetGroupId, categoryRow);
}

export function appendCategoryToGroups(groups, groupId, categoryRow) {
  const normalizedGroupId = groupId || 'ungrouped';
  const existing = (groups ?? []).find((group) => group.id === normalizedGroupId);
  if (!existing) {
    return [
      ...(groups ?? []),
      {
        id: normalizedGroupId,
        label:
          normalizedGroupId === 'ungrouped' ? 'UNCATEGORIZED' : normalizedGroupId.toUpperCase(),
        rows: [categoryRow],
      },
    ];
  }
  return (groups ?? []).map((group) =>
    group.id === normalizedGroupId
      ? { ...group, rows: [...(group.rows ?? []), categoryRow] }
      : group,
  );
}

export function rowToSelectionCategoryDetail(row) {
  if (!row) return null;
  return {
    name: row.id,
    selection_category_name: row.title,
    product_category: row.product_category,
    order_category: row.order_category,
    assignee_type: row.assignee_type || 'Role',
    assignee: row.assignee,
    selection_status: row.selection_status,
    exp_selection_date: row.exp_selection_date,
    custom_columns: row.custom_columns ?? [],
    items: (row.items ?? []).map((item) => ({
      name: item.id,
      item: item.item,
      item_name: item.item_name || item.title,
      product_type: item.product_type || item.product_sub_category,
      assignee_type: item.assignee_type || row.assignee_type || 'Role',
      assignee: item.assignee || row.assignee,
      assignees: item.assignees,
      exp_selection_date: item.exp_selection_date || null,
      selection_status: item.selection_status || null,
      long_lead: Boolean(item.long_lead),
      qty: item.qty ?? 1,
      field_values: item.field_values ?? [],
    })),
  };
}

export function buildProjectSelectionCategoryDetailFormData(projectId, detail) {
  const formData = new FormData();
  formData.append('project', String(projectId ?? '').trim());
  formData.append('category_name', String(detail?.name ?? '').trim());
  formData.append('selection_category_name', detail?.selection_category_name ?? '');
  formData.append('product_category', detail?.product_category ?? '');
  formData.append('order_category', detail?.order_category ?? '');
  formData.append('assignee_type', detail?.assignee_type || 'Role');
  formData.append('assignee', detail?.assignee ?? '');
  formData.append('custom_columns', JSON.stringify(detail?.custom_columns ?? []));
  formData.append(
    'items',
    JSON.stringify(
      getPersistableItems(detail?.items).map((item) => ({
        item: item.item,
        product_type: item.product_type,
        assignee_type: item.assignee_type || detail?.assignee_type || 'Role',
        assignee: item.assignee || detail?.assignee,
        exp_selection_date: item.exp_selection_date,
        selection_status: item.selection_status,
        long_lead: item.long_lead ? 1 : 0,
        qty: item.qty || 1,
        field_values: buildFieldValuesForItem(item, detail?.custom_columns),
      })),
    ),
  );
  return formData;
}

export function buildAddProjectSelectionCustomColumnFormData(
  projectId,
  categoryName,
  { label, columnType },
) {
  const formData = new FormData();
  formData.append('project', String(projectId ?? '').trim());
  formData.append('category_name', String(categoryName ?? '').trim());
  formData.append('column_label', String(label ?? '').trim());
  formData.append('column_type', String(columnType ?? 'Text').trim() || 'Text');
  return formData;
}

export function buildRemoveProjectSelectionCustomColumnFormData(
  projectId,
  categoryName,
  columnLabel,
) {
  const formData = new FormData();
  formData.append('project', String(projectId ?? '').trim());
  formData.append('category_name', String(categoryName ?? '').trim());
  formData.append('column_label', String(columnLabel ?? '').trim());
  return formData;
}

export function buildAddProjectSelectionCategoryFormData(projectId, groupId, payload = {}) {
  const formData = new FormData();
  const name = String(payload?.name ?? '').trim();
  formData.append('project', String(projectId ?? '').trim());
  formData.append('selection_category_name', name);
  if (payload.product_category) formData.append('product_category', payload.product_category);
  const orderCategory =
    payload.order_category ||
    (groupId && groupId !== 'ungrouped' && groupId !== 'all' ? groupId : '');
  if (orderCategory) formData.append('order_category', orderCategory);
  const assigneesPayload = assigneesToApiPayload(payload.assignees ?? []);
  if (assigneesPayload.length > 0) {
    formData.append('assignees', JSON.stringify(assigneesPayload));
    formData.append('assignee', assigneesPayload[0].assignee);
    formData.append('assignee_type', 'User');
  }
  return formData;
}

export function buildAddProjectSelectionItemFormData(
  projectId,
  categoryId,
  itemCode,
  selected = null,
) {
  const formData = new FormData();
  formData.append('project', String(projectId ?? '').trim());
  formData.append('category_name', String(categoryId ?? '').trim());
  formData.append('item', String(itemCode ?? '').trim());
  if (selected?.product_type) formData.append('product_type', selected.product_type);
  return formData;
}

export function resolveSelectionGroupId(orderCategory) {
  if (!orderCategory || orderCategory === '__ungrouped__') return 'ungrouped';
  return orderCategory;
}
