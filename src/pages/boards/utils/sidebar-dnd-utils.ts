const CONTAINER_TYPES = new Set(['space', 'folder']);

export function isContainerType(type) {
  return CONTAINER_TYPES.has(type);
}

export function canBeChildOf(activeType, containerType) {
  if (activeType === 'space') {
    return false;
  }

  if (containerType === 'space' || containerType === 'folder') {
    return activeType === 'folder' || activeType === 'list';
  }

  return false;
}

export function findNodeWithParent(items = [], nodeId, parent = null) {
  for (const item of items) {
    if (item.id === nodeId) {
      return { node: item, parent };
    }

    if (item.children?.length) {
      const match = findNodeWithParent(item.children, nodeId, item);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

export function collectDescendantIds(node, acc = new Set()) {
  if (!node?.children?.length) {
    return acc;
  }

  node.children.forEach((child) => {
    acc.add(child.id);
    collectDescendantIds(child, acc);
  });

  return acc;
}

/**
 * Flattens the visible tree (children of expanded nodes only) into an ordered
 * list of rows for the drag-and-drop renderer.
 */
export function flattenVisibleTree(items = [], expandedIds, depth = 0, parentId = null, acc = []) {
  items.forEach((item) => {
    acc.push({ id: item.id, node: item, depth, parentId });

    const isExpanded = expandedIds?.has?.(item.id);
    if (isExpanded && item.children?.length) {
      flattenVisibleTree(item.children, expandedIds, depth + 1, item.id, acc);
    }
  });

  return acc;
}

function resolveContainerMeta(containerNode) {
  if (containerNode.type === 'space') {
    return { parentType: 'space', parentId: containerNode.id, spaceId: containerNode.id };
  }

  // folder
  return {
    parentType: 'folder',
    parentId: containerNode.id,
    spaceId: containerNode.spaceId ?? null,
  };
}

function resolveParentMeta(parentNode) {
  if (!parentNode) {
    return { parentType: 'root', parentId: null, spaceId: null };
  }

  return resolveContainerMeta(parentNode);
}

function sameOrder(a = [], b = []) {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((id, index) => id === b[index]);
}

/**
 * Computes the resulting placement for a drop.
 *
 * @returns null when the drop is a no-op or not allowed, otherwise an object
 * describing the move (if the parent changed) and the new sibling ordering.
 */
export function computeDropPlacement({ tree = [], activeId, overId, intent, allowNoop = false }) {
  if (!activeId || !overId || activeId === overId) {
    return null;
  }

  const activeEntry = findNodeWithParent(tree, activeId);
  const overEntry = findNodeWithParent(tree, overId);

  if (!activeEntry || !overEntry) {
    return null;
  }

  const activeNode = activeEntry.node;
  const overNode = overEntry.node;
  const activeType = activeNode.type;

  let meta;
  let siblings;

  if (intent === 'inside') {
    if (!isContainerType(overNode.type) || !canBeChildOf(activeType, overNode.type)) {
      return null;
    }
    meta = resolveContainerMeta(overNode);
    siblings = overNode.children ?? [];
  } else {
    meta = resolveParentMeta(overEntry.parent);

    if (meta.parentType === 'root') {
      // Only spaces live at the root level.
      if (activeType !== 'space') {
        return null;
      }
      siblings = tree;
    } else {
      if (!canBeChildOf(activeType, meta.parentType)) {
        return null;
      }
      siblings = overEntry.parent.children ?? [];
    }
  }

  // Prevent dropping a folder into itself or one of its descendants.
  if (activeType === 'folder' && meta.parentId) {
    if (meta.parentId === activeId) {
      return null;
    }
    const descendants = collectDescendantIds(activeNode);
    if (descendants.has(meta.parentId)) {
      return null;
    }
  }

  const currentSiblingIds = siblings.map((item) => item.id);
  const filtered = siblings.filter((item) => item.id !== activeId);

  let newOrder;
  if (intent === 'inside') {
    newOrder = [...filtered, activeNode];
  } else {
    const overIndex = filtered.findIndex((item) => item.id === overId);
    const insertIndex =
      overIndex === -1 ? filtered.length : intent === 'after' ? overIndex + 1 : overIndex;
    newOrder = [...filtered];
    newOrder.splice(insertIndex, 0, activeNode);
  }

  const newOrderIds = newOrder.map((item) => item.id);

  // Determine the move call when the parent container changed.
  let move = null;
  let parentChanged = false;

  if (activeType === 'folder') {
    const currentParentFolder = activeNode.parentFolderId || null;
    const currentSpace = currentParentFolder ? null : activeNode.spaceId || null;
    const targetParentFolder = meta.parentType === 'folder' ? meta.parentId : null;
    const targetSpace = meta.parentType === 'space' ? meta.parentId : null;

    parentChanged = currentParentFolder !== targetParentFolder || currentSpace !== targetSpace;

    if (parentChanged) {
      move = {
        kind: 'folder',
        nodeId: activeId,
        payload: { space: targetSpace, parentFolder: targetParentFolder },
      };
    }
  } else if (activeType === 'list') {
    const currentFolder = activeNode.parentFolderId || null;
    const currentSpace = currentFolder ? null : activeNode.spaceId || null;
    const targetFolder = meta.parentType === 'folder' ? meta.parentId : null;
    const targetSpace = meta.parentType === 'space' ? meta.parentId : null;

    parentChanged = currentFolder !== targetFolder || currentSpace !== targetSpace;

    if (parentChanged) {
      move = {
        kind: 'list',
        nodeId: activeId,
        payload: { space: targetSpace, folder: targetFolder },
      };
    }
  }

  // Skip pure no-ops (same parent, identical ordering) unless the caller wants
  // them (e.g. to render a valid drop indicator while hovering).
  if (!allowNoop && !parentChanged && sameOrder(currentSiblingIds, newOrderIds)) {
    return null;
  }

  return {
    move,
    parentChanged,
    expandId: meta.parentType === 'root' ? null : meta.parentId,
    orderedSiblings: newOrder.map((item) => ({ type: item.type, id: item.id })),
  };
}
