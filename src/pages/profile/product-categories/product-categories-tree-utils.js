import {
  PRODUCT_CATEGORY_FIELD_KEYS,
  PRODUCT_CATEGORY_OPPOSITE_FLAG,
  PRODUCT_CATEGORY_TAB_IDS,
} from '@/pages/profile/product-categories/constants';

/** Tree depth → name column padding-left (px), per Figma. */
export function getProductCategoryTreeIndent(depth) {
  if (depth <= 0) return 12;
  return 12 + 27 + (depth - 1) * 39;
}

/** Tab id of the next level when adding a child node (4 levels total). */
export const PRODUCT_CATEGORY_CHILD_TAB = {
  [PRODUCT_CATEGORY_TAB_IDS.CATEGORY_GROUP]: PRODUCT_CATEGORY_TAB_IDS.PARENT_CATEGORY,
  [PRODUCT_CATEGORY_TAB_IDS.PARENT_CATEGORY]: PRODUCT_CATEGORY_TAB_IDS.CATEGORY,
  [PRODUCT_CATEGORY_TAB_IDS.CATEGORY]: PRODUCT_CATEGORY_TAB_IDS.PRODUCT_GROUP,
};

const TREE_LINKS = [
  {
    tabId: PRODUCT_CATEGORY_TAB_IDS.CATEGORY_GROUP,
    getSavedChildren: (rowsByTab) =>
      getSavedRows(rowsByTab, PRODUCT_CATEGORY_TAB_IDS.CATEGORY_GROUP),
    getDraftChildren: (rowsByTab) =>
      getDraftRows(rowsByTab, PRODUCT_CATEGORY_TAB_IDS.CATEGORY_GROUP, null),
  },
  {
    tabId: PRODUCT_CATEGORY_TAB_IDS.PARENT_CATEGORY,
    getSavedChildren: (rowsByTab, parent) =>
      getSavedRows(rowsByTab, PRODUCT_CATEGORY_TAB_IDS.PARENT_CATEGORY).filter(
        (row) => row.categoryGroupId === parent.id,
      ),
    getDraftChildren: (rowsByTab, parent) =>
      getDraftRows(rowsByTab, PRODUCT_CATEGORY_TAB_IDS.PARENT_CATEGORY, parent),
  },
  {
    tabId: PRODUCT_CATEGORY_TAB_IDS.CATEGORY,
    getSavedChildren: (rowsByTab, parent) =>
      getSavedRows(rowsByTab, PRODUCT_CATEGORY_TAB_IDS.CATEGORY).filter(
        (row) =>
          row.parentCategoryId === parent.id && row.categoryGroupId === parent.categoryGroupId,
      ),
    getDraftChildren: (rowsByTab, parent) =>
      getDraftRows(rowsByTab, PRODUCT_CATEGORY_TAB_IDS.CATEGORY, parent),
  },
  {
    tabId: PRODUCT_CATEGORY_TAB_IDS.PRODUCT_GROUP,
    getSavedChildren: (rowsByTab, parent) =>
      getSavedRows(rowsByTab, PRODUCT_CATEGORY_TAB_IDS.PRODUCT_GROUP).filter(
        (row) =>
          row.categoryId === parent.id &&
          row.parentCategoryId === parent.parentCategoryId &&
          row.categoryGroupId === parent.categoryGroupId,
      ),
    getDraftChildren: (rowsByTab, parent) =>
      getDraftRows(rowsByTab, PRODUCT_CATEGORY_TAB_IDS.PRODUCT_GROUP, parent),
  },
];

function getSavedRows(rowsByTab, tabId) {
  return (rowsByTab?.[tabId] ?? []).filter((row) => !row.isDraft && row.name);
}

function getDraftRows(rowsByTab, tabId, parentRow) {
  const drafts = (rowsByTab?.[tabId] ?? []).filter((row) => row.isDraft);

  if (tabId === PRODUCT_CATEGORY_TAB_IDS.CATEGORY_GROUP) {
    return drafts;
  }

  if (!parentRow) return [];

  if (tabId === PRODUCT_CATEGORY_TAB_IDS.PARENT_CATEGORY) {
    return drafts.filter((row) => row.categoryGroupId === parentRow.id);
  }

  if (tabId === PRODUCT_CATEGORY_TAB_IDS.CATEGORY) {
    return drafts.filter(
      (row) =>
        row.parentCategoryId === parentRow.id && row.categoryGroupId === parentRow.categoryGroupId,
    );
  }

  if (tabId === PRODUCT_CATEGORY_TAB_IDS.PRODUCT_GROUP) {
    return drafts.filter(
      (row) =>
        row.categoryId === parentRow.id &&
        row.parentCategoryId === parentRow.parentCategoryId &&
        row.categoryGroupId === parentRow.categoryGroupId,
    );
  }

  return [];
}

/** Show + on levels 1–3 only; level 4 (product-group) has no children. */
export function canAddChildToParent(parentTabId) {
  return Boolean(PRODUCT_CATEGORY_CHILD_TAB[parentTabId]);
}

function buildNodes(rowsByTab, levelIndex, parentRow, depth, parentNodeId) {
  const level = TREE_LINKS[levelIndex];
  if (!level) return [];

  const savedRows =
    levelIndex === 0
      ? level.getSavedChildren(rowsByTab)
      : level.getSavedChildren(rowsByTab, parentRow);
  const draftRows =
    levelIndex === 0
      ? level.getDraftChildren(rowsByTab)
      : level.getDraftChildren(rowsByTab, parentRow);
  const sourceRows = [...savedRows, ...draftRows];

  return sourceRows.map((row) => {
    const nodeId = row.isDraft ? `draft:${level.tabId}:${row.id}` : `${level.tabId}:${row.id}`;
    const children = row.isDraft
      ? []
      : buildNodes(rowsByTab, levelIndex + 1, row, depth + 1, nodeId);

    return {
      id: nodeId,
      tabId: level.tabId,
      row,
      depth,
      parentNodeId,
      children,
      isDraft: Boolean(row.isDraft),
      hasChildren: children.length > 0,
      canAddChild: !row.isDraft && canAddChildToParent(level.tabId),
    };
  });
}

/** Whether another category group can be added at the root level (no limit). */
export function canAddRootCategoryGroup() {
  return true;
}

/** Build hierarchical nodes from flat per-tab rows. */
export function buildProductCategoryTree(rowsByTab) {
  return buildNodes(rowsByTab, 0, null, 0, null);
}

/** Whether a row belongs to the given parent at this tab level. */
export function rowBelongsToParent(row, tabId, parentRow) {
  if (!row || (!row.isDraft && !row.name)) return false;

  if (tabId === PRODUCT_CATEGORY_TAB_IDS.CATEGORY_GROUP) {
    return true;
  }

  if (!parentRow) return false;

  if (tabId === PRODUCT_CATEGORY_TAB_IDS.PARENT_CATEGORY) {
    return row.categoryGroupId === parentRow.id;
  }

  if (tabId === PRODUCT_CATEGORY_TAB_IDS.CATEGORY) {
    return (
      row.parentCategoryId === parentRow.id && row.categoryGroupId === parentRow.categoryGroupId
    );
  }

  if (tabId === PRODUCT_CATEGORY_TAB_IDS.PRODUCT_GROUP) {
    return (
      row.categoryId === parentRow.id &&
      row.parentCategoryId === parentRow.parentCategoryId &&
      row.categoryGroupId === parentRow.categoryGroupId
    );
  }

  return false;
}

/** Whether a draft row belongs to the given parent at this tab level. */
export function draftBelongsToParent(draft, tabId, parentRow) {
  if (!draft?.isDraft) return false;
  return rowBelongsToParent(draft, tabId, parentRow);
}

function nodeMatchesSearch(node, query) {
  const name = String(node.row.name ?? '').toLowerCase();
  const description = String(node.row.description ?? '').toLowerCase();
  return name.includes(query) || description.includes(query);
}

function filterTreeNodes(nodes, query) {
  if (!query) return nodes;

  return nodes.reduce((acc, node) => {
    const filteredChildren = filterTreeNodes(node.children, query);
    const selfMatches = nodeMatchesSearch(node, query);

    if (selfMatches || filteredChildren.length > 0 || node.isDraft) {
      acc.push({
        ...node,
        children: filteredChildren,
        hasChildren: filteredChildren.length > 0,
      });
    }

    return acc;
  }, []);
}

/** Flatten tree to visible rows respecting expand state. */
export function flattenProductCategoryTree(nodes, expandedById, { forceExpand = false } = {}) {
  const result = [];

  nodes.forEach((node) => {
    result.push(node);

    const isExpanded = forceExpand || expandedById[node.id] === true;
    if (isExpanded && node.children.length > 0) {
      result.push(...flattenProductCategoryTree(node.children, expandedById, { forceExpand }));
    }
  });

  return result;
}

export function getVisibleProductCategoryTreeRows(nodes, expandedById, searchQuery) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredNodes = filterTreeNodes(nodes, normalizedQuery);
  return flattenProductCategoryTree(filteredNodes, expandedById, {
    forceExpand: Boolean(normalizedQuery),
  });
}

/** Whether a row is a descendant of the given parent row in the category tree. */
export function isProductCategoryDescendantRow(row, parentRow, parentTabId) {
  if (!row || !parentRow || row.id === parentRow.id) return false;

  if (parentTabId === PRODUCT_CATEGORY_TAB_IDS.CATEGORY_GROUP) {
    return row.categoryGroupId === parentRow.id;
  }

  if (parentTabId === PRODUCT_CATEGORY_TAB_IDS.PARENT_CATEGORY) {
    return (
      row.categoryGroupId === parentRow.categoryGroupId && row.parentCategoryId === parentRow.id
    );
  }

  if (parentTabId === PRODUCT_CATEGORY_TAB_IDS.CATEGORY) {
    return (
      row.categoryGroupId === parentRow.categoryGroupId &&
      row.parentCategoryId === parentRow.parentCategoryId &&
      row.categoryId === parentRow.id
    );
  }

  return false;
}

/** When a parent flag is set true, apply true to all descendant rows and clear the opposite flag. */
export function cascadeProductCategoryFlag(rowsByTab, parentRow, parentTabId, field, value) {
  if (!value) return rowsByTab;

  const oppositeField = PRODUCT_CATEGORY_OPPOSITE_FLAG[field];
  const next = {};

  Object.entries(rowsByTab).forEach(([tabId, rows]) => {
    next[tabId] = rows.map((row) => {
      if (row.id === parentRow.id || isProductCategoryDescendantRow(row, parentRow, parentTabId)) {
        return { ...row, [field]: true, ...(oppositeField ? { [oppositeField]: false } : {}) };
      }
      return row;
    });
  });

  return next;
}

/** All tree nodes start collapsed until the user expands them. */
export function createInitialExpandedState() {
  return {};
}
