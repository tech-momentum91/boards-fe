import { findNodeById } from '@/services/boards-service';

export function collectAncestorIds(items = [], targetId, ancestors = []) {
  for (const item of items) {
    if (item.id === targetId) {
      return ancestors;
    }

    if (item.children?.length) {
      const result = collectAncestorIds(item.children, targetId, [...ancestors, item.id]);
      if (result) {
        return result;
      }
    }
  }

  return null;
}

export function buildBoardsNavigationPath(item) {
  if (!item?.id) {
    return '/boards';
  }

  if (item.type === 'list') {
    if (item.spaceId && item.parentFolderId) {
      return `/boards/space/${item.spaceId}/folder/${item.parentFolderId}/list/${item.id}`;
    }

    if (item.spaceId) {
      return `/boards/space/${item.spaceId}/list/${item.id}`;
    }

    return `/boards/list/${item.id}`;
  }

  if (item.type === 'folder' && item.spaceId) {
    return `/boards/space/${item.spaceId}/folder/${item.id}`;
  }

  if (item.type === 'space') {
    return `/boards/space/${item.id}`;
  }

  return '/boards';
}

export function resolveBoardsRoute(tree = [], { spaceId, folderId, listId } = {}) {
  if (listId) {
    const list = findNodeById(tree, listId);
    return list?.type === 'list' ? list : null;
  }

  if (folderId) {
    const folder = findNodeById(tree, folderId);

    if (folder?.type === 'folder' && (!spaceId || folder.spaceId === spaceId)) {
      return folder;
    }

    return null;
  }

  if (spaceId) {
    const space = findNodeById(tree, spaceId);

    if (space?.type === 'space') {
      return space;
    }

    return null;
  }

  return null;
}

export function getBoardsBreadcrumbs(tree = [], item) {
  if (!item) {
    return [];
  }

  const ancestorIds = collectAncestorIds(tree, item.id) ?? [];
  const ancestors = ancestorIds.map((id) => findNodeById(tree, id)).filter(Boolean);

  return [...ancestors, item].map((node) => ({
    id: node.id,
    label: node.label,
  }));
}

export const BOARDS_VIEW_QUERY_PARAM = 'view';

export function getBoardsViewIdFromSearch(search = '') {
  const normalized = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(normalized).get(BOARDS_VIEW_QUERY_PARAM);
}

export function setBoardsViewIdInSearchParams(searchParams, viewId) {
  const next = new URLSearchParams(searchParams);

  if (viewId) {
    next.set(BOARDS_VIEW_QUERY_PARAM, viewId);
  } else {
    next.delete(BOARDS_VIEW_QUERY_PARAM);
  }

  return next;
}

export function stripBoardsViewIdFromSearch(search = '') {
  const normalized = search.startsWith('?') ? search.slice(1) : search;
  const next = new URLSearchParams(normalized);
  next.delete(BOARDS_VIEW_QUERY_PARAM);
  const serialized = next.toString();
  return serialized ? `?${serialized}` : '';
}
