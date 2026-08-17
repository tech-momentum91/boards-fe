import { PROJECT_BOQ_FLOOR_QUANTITY_COLUMN_PREFIX } from '@/components/boq/boq-templates/components/boq-template-products-column-config';

export const BOQ_TEMPLATE_EDIT_FIELD_ATTR = 'data-boq-template-edit-field';

const BOQ_TEMPLATE_EDIT_LOCKED_COLUMN_IDS = ['product'];

const isProjectBoqQuantityFloorColumn = (columnId) =>
  columnId.startsWith(PROJECT_BOQ_FLOOR_QUANTITY_COLUMN_PREFIX);

/** Columns shown in edit row but not focusable / not editable inputs. */
const BOQ_TEMPLATE_EDIT_READ_ONLY_COLUMN_IDS = [
  'itemCode',
  'boqType',
  'boqCategory',
  'lineValue',
  'packageCode',
  'vendors',
  'journey',
  'procurementStatus',
  'er',
  'poValue',
];

export function getBoqTemplateEditableColumnIds(visibleColumnIds, isEditMode) {
  if (!isEditMode) return visibleColumnIds;

  const firstFloorColumnId = visibleColumnIds.find(isProjectBoqQuantityFloorColumn);

  return visibleColumnIds.filter((columnId) => {
    if (BOQ_TEMPLATE_EDIT_LOCKED_COLUMN_IDS.includes(columnId)) return false;
    if (BOQ_TEMPLATE_EDIT_READ_ONLY_COLUMN_IDS.includes(columnId)) return false;
    if (columnId === 'quantityTotal') return false;
    if (isProjectBoqQuantityFloorColumn(columnId) && columnId !== firstFloorColumnId) {
      return false;
    }
    return true;
  });
}

export function resolveBoqTemplateInitialFocusColumnId(
  visibleColumnIds,
  isEditMode,
  { initialFocusColumnId, autoFocusProductName = true } = {},
) {
  const editableColumnIds = getBoqTemplateEditableColumnIds(visibleColumnIds, isEditMode);

  if (initialFocusColumnId && editableColumnIds.includes(initialFocusColumnId)) {
    return initialFocusColumnId;
  }

  if (!isEditMode && autoFocusProductName && editableColumnIds.includes('product')) {
    return 'product';
  }

  return editableColumnIds[0] ?? null;
}

export function focusBoqTemplateEditField(row, columnId) {
  if (!row || !columnId) return false;

  const field = row.querySelector(`[${BOQ_TEMPLATE_EDIT_FIELD_ATTR}="${columnId}"]`);
  if (!field) return false;

  const inputLike =
    (field.matches('input,textarea') ? field : null) || field.querySelector('input,textarea');
  const focusable =
    inputLike ||
    (field.matches('button,select,[tabindex]:not([tabindex="-1"])') ? field : null) ||
    field.querySelector('button:not([tabindex="-1"]),select,[tabindex]:not([tabindex="-1"])');

  if (!focusable || focusable.disabled || focusable.tabIndex === -1) return false;

  focusable.focus();
  if (typeof focusable.select === 'function' && focusable.tagName !== 'BUTTON') {
    try {
      focusable.select();
    } catch {
      // Some inputs do not support select.
    }
  }
  return true;
}

export function buildBoqTemplateProductNavigationItems(groupedCategories = []) {
  const items = [];

  for (const category of groupedCategories) {
    for (const group of category.sections ?? []) {
      for (const product of group.products ?? []) {
        items.push({
          rowId: product.id,
          categoryId: category.categoryId,
          section: group.section,
          sectionKey: `${category.categoryId}::${group.section}`,
          product,
        });
      }
    }
  }

  return items;
}

export function resolveBoqTemplateProductNavigationTarget(
  navigationItems,
  currentRowId,
  direction,
) {
  const currentIndex = navigationItems.findIndex((item) => item.rowId === currentRowId);
  if (currentIndex === -1) return null;

  const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
  return navigationItems[nextIndex] ?? null;
}

export function buildBoqTemplateSectionKey(categoryId, section) {
  return `${categoryId}::${section}`;
}

export function resolveBoqTemplateEditFieldColumnId(activeElement, row) {
  if (!activeElement || !(activeElement instanceof Element)) return null;

  const field = activeElement.closest(`[${BOQ_TEMPLATE_EDIT_FIELD_ATTR}]`);
  if (!field) return null;

  if (row?.contains(field)) {
    return field.getAttribute(BOQ_TEMPLATE_EDIT_FIELD_ATTR);
  }

  if (activeElement.closest('[data-prevent-edit-save]')) {
    return field.getAttribute(BOQ_TEMPLATE_EDIT_FIELD_ATTR);
  }

  return null;
}

export function findBoqTemplateAdjacentEditableColumn(
  visibleColumnIds,
  currentColumnId,
  direction,
  focusColumn,
) {
  const reverse = direction === 'prev';
  const step = reverse ? -1 : 1;
  const currentIndex = visibleColumnIds.indexOf(currentColumnId);
  if (currentIndex === -1) return null;

  let nextIndex = currentIndex + step;
  while (nextIndex >= 0 && nextIndex < visibleColumnIds.length) {
    const nextColumnId = visibleColumnIds[nextIndex];
    if (focusColumn(nextColumnId)) return nextColumnId;
    nextIndex += step;
  }

  return null;
}
