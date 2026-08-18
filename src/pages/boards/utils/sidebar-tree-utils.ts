export function isSidebarItemVisible(item, { showArchived = false, showAllBoards = false } = {}) {
  if (!item) {
    return false;
  }

  if (!showArchived && item.isArchived) {
    return false;
  }

  if (!showAllBoards && item.isHidden) {
    return false;
  }

  return true;
}

export function filterSidebarTreeByVisibility(items = [], visibilityOptions = {}) {
  return items
    .filter((item) => isSidebarItemVisible(item, visibilityOptions))
    .map((item) => ({
      ...item,
      children: item.children?.length
        ? filterSidebarTreeByVisibility(item.children, visibilityOptions)
        : item.children,
    }));
}

export function updateSidebarTreeNode(items = [], nodeId, updater) {
  return items.map((item) => {
    if (item.id === nodeId) {
      return typeof updater === 'function' ? updater(item) : { ...item, ...updater };
    }

    if (item.children?.length) {
      return {
        ...item,
        children: updateSidebarTreeNode(item.children, nodeId, updater),
      };
    }

    return item;
  });
}

export function isFavoriteFolderOrList(item) {
  return Boolean(item?.isFavorite) && (item.type === 'folder' || item.type === 'list');
}

export function collectFavoriteFoldersAndLists(items = [], visibilityOptions = {}, result = []) {
  items.forEach((item) => {
    if (isFavoriteFolderOrList(item) && isSidebarItemVisible(item, visibilityOptions)) {
      result.push(item);
      return;
    }

    if (item.children?.length) {
      collectFavoriteFoldersAndLists(item.children, visibilityOptions, result);
    }
  });

  return result;
}

export function pruneFavoriteFoldersAndListsFromTree(items = []) {
  return items
    .map((item) => ({
      ...item,
      children: item.children?.length
        ? pruneFavoriteFoldersAndListsFromTree(item.children)
        : item.children,
    }))
    .filter((item) => !isFavoriteFolderOrList(item));
}

export function prepareSidebarItemForFavoritesSection(item) {
  if (!item) {
    return item;
  }

  return {
    ...item,
    children: item.children?.length
      ? pruneFavoriteFoldersAndListsFromTree(item.children)
      : item.children,
  };
}

export function prepareBoardsSectionTree(items = []) {
  return items.map((item) => ({
    ...item,
    children: item.children?.length
      ? pruneFavoriteFoldersAndListsFromTree(item.children)
      : item.children,
  }));
}

export function dedupeSidebarItemsById(items = []) {
  const seen = new Set();

  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}
