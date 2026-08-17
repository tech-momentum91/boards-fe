import apiClient from '@/api/axios';
import { extractErrorMessage, getFrappeResponseError } from '@/utils/error-utils';

const SIDEBAR_TREE_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.space.get_sidebar_tree';

function parseIsPrivate(value) {
  if (value === true || value === 1 || value === '1') {
    return true;
  }

  return false;
}

function parseSidebarFlag(value) {
  if (value === true || value === 1 || value === '1' || value === 'true') {
    return true;
  }

  return false;
}

function readSidebarFavoriteFlag(node) {
  return parseSidebarFlag(
    node.is_favorite ?? node.is_favourited ?? node.isFavorite ?? node.isFavourite,
  );
}

function normalizeSidebarNode(node, parentSpaceId = null, parentFolderId = null) {
  const nodeId = node.name ?? node.space_id;

  // Trust the API's type directly; only fall back if it's missing.
  const type =
    node.type ?? (Array.isArray(node.children) && node.children.length > 0 ? 'group' : 'folder');
  const showActions = type === 'space' || type === 'board' || type === 'group' || type === 'folder';
  const hasSidebarMeta =
    type === 'space' ||
    type === 'board' ||
    type === 'group' ||
    type === 'folder' ||
    type === 'list';
  const spaceId = type === 'space' ? nodeId : parentSpaceId;
  const childParentFolderId = type === 'folder' ? nodeId : parentFolderId;

  const children = Array.isArray(node.children)
    ? node.children.map((child) => normalizeSidebarNode(child, spaceId, childParentFolderId))
    : [];

  return {
    id: nodeId,
    label: node.title ?? node.label,
    description: node.description ?? '',
    isPrivate: parseIsPrivate(node.is_private),
    ownedBy: node.owned_by ?? null,
    isOwner: Boolean(node.is_owner),
    canManageSharing: Boolean(node.can_manage_sharing),
    myPermission: node.my_permission ?? null,
    permissions: node.permissions ?? null,
    type, // 'space' | 'folder' | 'list' | whatever the API sends
    spaceId,
    parentFolderId: type === 'space' ? null : parentFolderId,
    showActions,
    color: node.color,
    icon: node.icon,
    ...(hasSidebarMeta
      ? {
          isFavorite: readSidebarFavoriteFlag(node),
          isArchived: parseSidebarFlag(node.is_archived),
          isHidden: parseSidebarFlag(node.is_hidden),
        }
      : {}),
    sortOrder: node.sort_order,
    children,
  };
}

export function normalizeSidebarTree(spaces = []) {
  return spaces.map((space) => normalizeSidebarNode({ ...space, type: space.type ?? 'space' }));
}

export function collectExpandableIds(items = [], ids = []) {
  items.forEach((item) => {
    if (item.children?.length) {
      ids.push(item.id);
      collectExpandableIds(item.children, ids);
    }
  });

  return ids;
}

export function compareByLabel(a, b) {
  return (a?.label ?? '').localeCompare(b?.label ?? '', undefined, {
    sensitivity: 'base',
  });
}

export function compareBySortOrderOnly(a, b) {
  const orderA = Number(a?.sortOrder ?? 0);
  const orderB = Number(b?.sortOrder ?? 0);
  return orderA - orderB;
}

function sortWithStableOrder(items, compareFn) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const result = compareFn(a.item, b.item);
      if (result !== 0) {
        return result;
      }

      return a.index - b.index;
    })
    .map(({ item }) => item);
}

export function sortItemsByLabel(items = []) {
  return sortWithStableOrder(items, compareByLabel);
}

function sortNodeTree(node, alphabeticalSortIds) {
  const sortChildrenAlphabetically = alphabeticalSortIds.has(node.id);

  const sortedChildren = node.children?.length
    ? sortWithStableOrder(
        node.children.map((child) => sortNodeTree(child, alphabeticalSortIds)),
        sortChildrenAlphabetically ? compareByLabel : compareBySortOrderOnly,
      )
    : node.children;

  return {
    ...node,
    children: sortedChildren,
  };
}

export function applySidebarTreeSorting(items = [], alphabeticalSortIds = new Set()) {
  if (items.length === 0) {
    return items;
  }

  return sortWithStableOrder(
    items.map((space) => sortNodeTree(space, alphabeticalSortIds)),
    compareBySortOrderOnly,
  );
}

export async function getSidebarTree({ includeArchived = true, includeHidden = true } = {}) {
  try {
    const response = await apiClient.get(SIDEBAR_TREE_ENDPOINT, {
      params: {
        include_archived: includeArchived ? 1 : 0,
        include_hidden: includeHidden ? 1 : 0,
      },
    });
    const result = response.data;

    const responseError = getFrappeResponseError(result, 'Failed to load boards.');
    if (responseError) {
      return { error: responseError };
    }

    const spaces = Array.isArray(result?.message) ? result.message : [];
    return { data: normalizeSidebarTree(spaces) };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load boards.'),
    };
  }
}

export function getNextBoardSortOrder(items = []) {
  const maxOrder = items.reduce((max, board) => Math.max(max, Number(board.sortOrder ?? 0)), 0);

  return maxOrder + 1;
}

export function findNodeById(items = [], nodeId) {
  for (const item of items) {
    if (item.id === nodeId) {
      return item;
    }

    if (item.children?.length) {
      const match = findNodeById(item.children, nodeId);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

export function findDefaultListInContainer(container) {
  const lists = (container?.children ?? []).filter((child) => child.type === 'list');

  if (lists.length === 0) {
    return null;
  }

  const defaultList = lists.find((list) => list.label?.trim() === 'List');

  if (defaultList) {
    return defaultList;
  }

  return [...lists].sort(
    (left, right) =>
      (left.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.sortOrder ?? Number.MAX_SAFE_INTEGER),
  )[0];
}

export function findListTargetAfterCreate(tree = [], createdDoc) {
  const createdId = createdDoc?.name ?? createdDoc?.id;

  if (!createdId) {
    return null;
  }

  const createdNode = findNodeById(tree, createdId);

  if (createdNode?.type === 'list') {
    return createdNode;
  }

  if (createdNode?.type === 'folder' || createdNode?.type === 'space') {
    return findDefaultListInContainer(createdNode);
  }

  return null;
}

export function getNextFolderTitle(siblingFolders = []) {
  const folderNames = new Set(
    siblingFolders
      .filter((child) => child.type === 'folder')
      .map((child) => child.label?.trim())
      .filter(Boolean),
  );

  if (!folderNames.has('Folder')) {
    return 'Folder';
  }

  let index = 1;
  while (folderNames.has(`Folder ${index}`)) {
    index += 1;
  }

  return `Folder ${index}`;
}

export function getNextListTitle(siblingItems = []) {
  const listNames = new Set(
    siblingItems
      .filter((child) => child.type === 'list')
      .map((child) => child.label?.trim())
      .filter(Boolean),
  );

  if (!listNames.has('List')) {
    return 'List';
  }

  let index = 1;
  while (listNames.has(`List ${index}`)) {
    index += 1;
  }

  return `List ${index}`;
}

export function getFolderCreateContext(item, treeItems = []) {
  const spaceId = item.spaceId ?? (item.type === 'space' ? item.id : null);

  if (!spaceId) {
    return null;
  }

  if (item.type === 'folder') {
    const siblingFolders = item.children ?? [];
    return {
      spaceId,
      parentFolder: item.id,
      title: getNextFolderTitle(siblingFolders),
      expandIds: [item.id],
    };
  }

  if (item.type === 'list' && item.parentFolderId) {
    const parentFolder = findNodeById(treeItems, item.parentFolderId);
    const siblingFolders = parentFolder?.children ?? [];

    return {
      spaceId,
      parentFolder: item.parentFolderId,
      title: getNextFolderTitle(siblingFolders),
      expandIds: [item.parentFolderId],
    };
  }

  const siblingFolders = item.children ?? [];

  return {
    spaceId,
    parentFolder: null,
    title: getNextFolderTitle(siblingFolders),
    expandIds: [item.id],
  };
}

export function getListCreateContext(item, treeItems = []) {
  if (item.type === 'folder') {
    const siblings = item.children ?? [];

    return {
      title: getNextListTitle(siblings),
      folder: item.id,
      space: null,
      expandIds: [item.id],
      siblings,
    };
  }

  if (item.type === 'list') {
    if (item.parentFolderId) {
      const parentFolder = findNodeById(treeItems, item.parentFolderId);
      const siblings = parentFolder?.children ?? [];

      return {
        title: getNextListTitle(siblings),
        folder: item.parentFolderId,
        space: null,
        expandIds: [item.parentFolderId],
        siblings,
      };
    }

    const spaceId = item.spaceId;

    if (!spaceId) {
      return null;
    }

    const spaceNode = findNodeById(treeItems, spaceId);
    const siblings = spaceNode?.children ?? [];

    return {
      title: getNextListTitle(siblings),
      folder: null,
      space: spaceId,
      expandIds: [spaceId],
      siblings,
    };
  }

  const spaceId = item.spaceId ?? (item.type === 'space' ? item.id : null);

  if (!spaceId) {
    return null;
  }

  const siblings = item.children ?? [];

  return {
    title: getNextListTitle(siblings),
    folder: null,
    space: spaceId,
    expandIds: [item.id],
    siblings,
  };
}

const CREATE_SPACE_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.space.create';
const CREATE_FOLDER_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.folder.create';
const CREATE_LIST_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.list_.create';

const DEFAULT_FOLDER_COLOR = '#525866';
const DEFAULT_LIST_COLOR = '#525866';

export async function createFolder({
  title,
  space,
  parent_folder = null,
  color = DEFAULT_FOLDER_COLOR,
  icon = 'folder',
  status_template = null,
}) {
  try {
    const response = await apiClient.post(CREATE_FOLDER_ENDPOINT, {
      title,
      space,
      parent_folder,
      color,
      icon,
      status_template,
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to create folder.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? true };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to create folder.'),
    };
  }
}

export async function createList({
  title,
  folder = null,
  space = null,
  color = DEFAULT_LIST_COLOR,
  icon = 'list',
  status_template = null,
}) {
  try {
    const payload = {
      title,
      color,
      icon,
      status_template,
    };

    if (folder) {
      payload.folder = folder;
    } else if (space) {
      payload.space = space;
    }

    const response = await apiClient.post(CREATE_LIST_ENDPOINT, payload);

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to create list.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? true };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to create list.'),
    };
  }
}

export async function createBoard({
  title,
  description,
  is_private,
  sort_order,
  default_permission = 'full_access',
  shared_roles = [],
  invite_users = [],
}) {
  try {
    const response = await apiClient.post(CREATE_SPACE_ENDPOINT, {
      title,
      description,
      is_private,
      sort_order,
      default_permission,
      shared_roles: JSON.stringify(shared_roles),
      invite_users: JSON.stringify(invite_users),
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to create board.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? true };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to create board.'),
    };
  }
}

export async function updateBoard(spaceId, { title, description, is_private }) {
  try {
    const response = await apiClient.put('/method/devx_tasks.devx_tasks.apis.space.update', {
      space_id: spaceId,
      data: {
        title,
        description,
        is_private,
      },
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to update board.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? true };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to update board.'),
    };
  }
}

const TOGGLE_HIDE_SPACE_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.space.toggle_hidden';

const TOGGLE_ARCHIVE_SPACE_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.space.toggle_archive';

export const DELETE_SPACE_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.space.delete';

async function mutateSpace(endpoint, spaceId, method, defaultError) {
  try {
    const response = await apiClient[method](endpoint, {
      space_id: spaceId,
    });

    const result = response.data;

    const responseError = getFrappeResponseError(result, defaultError);
    if (responseError) {
      return { error: responseError };
    }

    return { data: result.message };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, defaultError),
    };
  }
}

export async function hideBoard(spaceId) {
  return mutateSpace(TOGGLE_HIDE_SPACE_ENDPOINT, spaceId, 'put', 'Failed to hide board.');
}

export async function unhideBoard(spaceId) {
  return mutateSpace(TOGGLE_HIDE_SPACE_ENDPOINT, spaceId, 'put', 'Failed to unhide board.');
}

export async function archiveBoard(spaceId) {
  return mutateSpace(TOGGLE_ARCHIVE_SPACE_ENDPOINT, spaceId, 'put', 'Failed to archive board.');
}

export async function unarchiveBoard(spaceId) {
  return mutateSpace(TOGGLE_ARCHIVE_SPACE_ENDPOINT, spaceId, 'put', 'Failed to unarchive board.');
}

export async function deleteBoard(spaceId) {
  try {
    const response = await apiClient.delete(DELETE_SPACE_ENDPOINT, {
      data: {
        space_id: spaceId,
      },
    });

    const result = response.data;

    const responseError = getFrappeResponseError(result, 'Failed to delete board.');
    if (responseError) {
      return { error: responseError };
    }

    return { data: result.message };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to delete board.'),
    };
  }
}

const DUPLICATE_SPACE_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.space.duplicate';
const DUPLICATE_FOLDER_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.folder.duplicate';
const DUPLICATE_LIST_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.list_.duplicate';

async function duplicateNode(endpoint, payload, errorMessage) {
  try {
    const response = await apiClient.post(endpoint, payload);
    const result = response.data;

    const responseError = getFrappeResponseError(result, errorMessage);
    if (responseError) {
      return { error: responseError };
    }

    return { data: result.message };
  } catch (error) {
    return { error: extractErrorMessage(error.serialized || error, errorMessage) };
  }
}

export async function duplicateBoard(spaceId) {
  return duplicateNode(
    DUPLICATE_SPACE_ENDPOINT,
    { space_id: spaceId },
    'Failed to duplicate board.',
  );
}

export async function duplicateFolder(folderId) {
  return duplicateNode(
    DUPLICATE_FOLDER_ENDPOINT,
    { folder_id: folderId },
    'Failed to duplicate folder.',
  );
}

export async function duplicateList(listId) {
  return duplicateNode(DUPLICATE_LIST_ENDPOINT, { list_id: listId }, 'Failed to duplicate list.');
}

export const FAVORITE_SPACE_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.space.toggle_favorite';

export async function favoriteBoard(spaceId) {
  return mutateSpace(FAVORITE_SPACE_ENDPOINT, spaceId, 'put', 'Failed to favorite board.');
}

export async function unfavoriteBoard(spaceId) {
  return mutateSpace(FAVORITE_SPACE_ENDPOINT, spaceId, 'put', 'Failed to unfavorite board.');
}

export async function updateBoardAppearance(spaceId, color) {
  try {
    const response = await apiClient.put(
      '/method/devx_tasks.devx_tasks.apis.space.update_appearance',
      {
        space_id: spaceId,
        color,
      },
    );

    const result = response.data;

    const responseError = getFrappeResponseError(result, 'Failed to update board appearance.');
    if (responseError) {
      return { error: responseError };
    }

    return { data: result.message };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to update board appearance.'),
    };
  }
}

export async function toggleBoardFavorite(spaceId) {
  return favoriteBoard(spaceId);
}

const TOGGLE_HIDE_FOLDER_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.folder.toggle_hidden';

const TOGGLE_ARCHIVE_FOLDER_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.folder.toggle_archive';

export const DELETE_FOLDER_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.folder.delete';

export const FAVORITE_FOLDER_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.folder.toggle_favorite';

async function mutateFolder(endpoint, folderId, method, defaultError) {
  try {
    const response = await apiClient[method](endpoint, {
      folder_id: folderId,
    });

    const result = response.data;

    const responseError = getFrappeResponseError(result, defaultError);
    if (responseError) {
      return { error: responseError };
    }

    return { data: result.message };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, defaultError),
    };
  }
}

export async function hideFolder(folderId) {
  return mutateFolder(TOGGLE_HIDE_FOLDER_ENDPOINT, folderId, 'put', 'Failed to hide folder.');
}

export async function unhideFolder(folderId) {
  return mutateFolder(TOGGLE_HIDE_FOLDER_ENDPOINT, folderId, 'put', 'Failed to unhide folder.');
}

export async function archiveFolder(folderId) {
  return mutateFolder(TOGGLE_ARCHIVE_FOLDER_ENDPOINT, folderId, 'put', 'Failed to archive folder.');
}

export async function unarchiveFolder(folderId) {
  return mutateFolder(
    TOGGLE_ARCHIVE_FOLDER_ENDPOINT,
    folderId,
    'put',
    'Failed to unarchive folder.',
  );
}

export async function deleteFolder(folderId) {
  try {
    const response = await apiClient.delete(DELETE_FOLDER_ENDPOINT, {
      data: {
        folder_id: folderId,
      },
    });

    const result = response.data;

    const responseError = getFrappeResponseError(result, 'Failed to delete folder.');
    if (responseError) {
      return { error: responseError };
    }

    return { data: result.message };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to delete folder.'),
    };
  }
}

export async function favoriteFolder(folderId) {
  return mutateFolder(FAVORITE_FOLDER_ENDPOINT, folderId, 'put', 'Failed to favorite folder.');
}

export async function unfavoriteFolder(folderId) {
  return mutateFolder(FAVORITE_FOLDER_ENDPOINT, folderId, 'put', 'Failed to unfavorite folder.');
}

export async function updateFolder(folderId, { title, description = '' } = {}) {
  try {
    const response = await apiClient.put('/method/devx_tasks.devx_tasks.apis.folder.update', {
      folder_id: folderId,
      data: {
        title,
        description,
      },
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to update folder.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? true };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to update folder.'),
    };
  }
}

export async function updateFolderAppearance(folderId, color) {
  try {
    const response = await apiClient.put(
      '/method/devx_tasks.devx_tasks.apis.folder.update_appearance',
      {
        folder_id: folderId,
        color,
      },
    );

    const result = response.data;

    const responseError = getFrappeResponseError(result, 'Failed to update folder appearance.');
    if (responseError) {
      return { error: responseError };
    }

    return { data: result.message };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to update folder appearance.'),
    };
  }
}

const TOGGLE_HIDE_LIST_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.list_.toggle_hidden';

const TOGGLE_ARCHIVE_LIST_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.list_.toggle_archive';

export const DELETE_LIST_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.list_.delete';

export const FAVORITE_LIST_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.list_.toggle_favorite';

async function mutateList(endpoint, listId, method, defaultError) {
  try {
    const response = await apiClient[method](endpoint, {
      list_id: listId,
    });

    const result = response.data;

    const responseError = getFrappeResponseError(result, defaultError);
    if (responseError) {
      return { error: responseError };
    }

    return { data: result.message };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, defaultError),
    };
  }
}

export async function hideList(listId) {
  return mutateList(TOGGLE_HIDE_LIST_ENDPOINT, listId, 'put', 'Failed to hide list.');
}

export async function unhideList(listId) {
  return mutateList(TOGGLE_HIDE_LIST_ENDPOINT, listId, 'put', 'Failed to unhide list.');
}

export async function archiveList(listId) {
  return mutateList(TOGGLE_ARCHIVE_LIST_ENDPOINT, listId, 'put', 'Failed to archive list.');
}

export async function unarchiveList(listId) {
  return mutateList(TOGGLE_ARCHIVE_LIST_ENDPOINT, listId, 'put', 'Failed to unarchive list.');
}

export async function deleteList(listId) {
  try {
    const response = await apiClient.delete(DELETE_LIST_ENDPOINT, {
      data: {
        list_id: listId,
      },
    });

    const result = response.data;

    const responseError = getFrappeResponseError(result, 'Failed to delete list.');
    if (responseError) {
      return { error: responseError };
    }

    return { data: result.message };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to delete list.'),
    };
  }
}

export async function favoriteList(listId) {
  return mutateList(FAVORITE_LIST_ENDPOINT, listId, 'put', 'Failed to favorite list.');
}

export async function unfavoriteList(listId) {
  return mutateList(FAVORITE_LIST_ENDPOINT, listId, 'put', 'Failed to unfavorite list.');
}

export async function updateList(listId, { title, description = '' } = {}) {
  try {
    const response = await apiClient.put('/method/devx_tasks.devx_tasks.apis.list_.update', {
      list_id: listId,
      data: {
        title,
        description,
      },
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to update list.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? true };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to update list.'),
    };
  }
}

const GET_LIST_COLUMN_SETTINGS_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.list_.get_column_settings';
const SET_LIST_COLUMN_SETTINGS_ENDPOINT =
  '/method/devx_tasks.devx_tasks.apis.list_.set_column_settings';

export async function getListColumnSettings(listId) {
  if (!listId) {
    return { data: null };
  }

  try {
    const response = await apiClient.get(GET_LIST_COLUMN_SETTINGS_ENDPOINT, {
      params: { list_id: listId },
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to load column settings.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? null };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load column settings.'),
    };
  }
}

export async function saveListColumnSettings(listId, settings) {
  if (!listId) {
    return { data: null };
  }

  try {
    const response = await apiClient.put(SET_LIST_COLUMN_SETTINGS_ENDPOINT, {
      list_id: listId,
      settings: JSON.stringify(settings ?? {}),
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to save column settings.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? true };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to save column settings.'),
    };
  }
}

const MOVE_FOLDER_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.folder.move';
const MOVE_LIST_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.list_.move';
const REORDER_SIBLINGS_ENDPOINT = '/method/devx_tasks.devx_tasks.apis.space.reorder_siblings';

export async function moveFolder(folderId, { space = null, parentFolder = null } = {}) {
  try {
    const response = await apiClient.put(MOVE_FOLDER_ENDPOINT, {
      folder_id: folderId,
      space,
      parent_folder: parentFolder,
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to move folder.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? true };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to move folder.'),
    };
  }
}

export async function moveList(listId, { space = null, folder = null } = {}) {
  try {
    const response = await apiClient.put(MOVE_LIST_ENDPOINT, {
      list_id: listId,
      space,
      folder,
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to move list.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? true };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to move list.'),
    };
  }
}

export async function reorderSiblings(items = []) {
  try {
    const response = await apiClient.put(REORDER_SIBLINGS_ENDPOINT, {
      items: JSON.stringify(items),
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to reorder items.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? true };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to reorder items.'),
    };
  }
}

export async function updateListAppearance(listId, color) {
  try {
    const response = await apiClient.put(
      '/method/devx_tasks.devx_tasks.apis.list_.update_appearance',
      {
        list_id: listId,
        color,
      },
    );

    const result = response.data;

    const responseError = getFrappeResponseError(result, 'Failed to update list appearance.');
    if (responseError) {
      return { error: responseError };
    }

    return { data: result.message };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to update list appearance.'),
    };
  }
}
