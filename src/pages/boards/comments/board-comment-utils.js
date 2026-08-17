import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { findNodeById } from '@/services/boards-service';
import { buildBoardsNavigationPath } from '@/pages/boards/utils/boards-navigation';
import { buildBoardTaskSearchPath } from '@/pages/boards/utils/boards-global-search-utils';
import { getBoardTask, getListTasks, searchBoardTasks } from '@/services/tasks-service';

// Configure marked once: safe defaults, no GFM table extensions that break plain HTML.
marked.setOptions({ async: false, breaks: true, gfm: true });

export const BOARD_NO_ACCESS_PATH = '/boards/no-access';
export const BOARD_ENTITY_TAG_CLASS = 'board-entity-tag';
export const ENTITY_TAG_RECENTS_KEY = 'devx-boards-entity-tag-recents';
export const MAX_ENTITY_TAG_RECENTS = 6;

export const ENTITY_TYPES = {
  SPACE: 'space',
  FOLDER: 'folder',
  LIST: 'list',
  TASK: 'task',
};

/** Inline SVG snippets for HTML-rendered comments (no React). */
export function getEntityTagIconSvg(entityType) {
  if (entityType === ENTITY_TYPES.FOLDER) {
    return '<svg class="board-entity-tag__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>';
  }
  if (entityType === ENTITY_TYPES.LIST) {
    return '<svg class="board-entity-tag__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2z"/></svg>';
  }
  if (entityType === ENTITY_TYPES.TASK) {
    return '<svg class="board-entity-tag__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="7"/></svg>';
  }
  return '<svg class="board-entity-tag__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg>';
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * Returns safe, display-ready HTML for a comment's body.
 *
 * Content can arrive in two forms:
 *   - HTML  (from Tiptap): starts with a block-level tag, e.g. "<p>…"
 *   - Markdown (from bots / AI / old entries): plain text with #, **, -, etc.
 *
 * Markdown is converted to HTML via `marked` before sanitisation.
 * In both cases, <script> tags and javascript: URLs are stripped.
 */
export function sanitizeBoardCommentHtml(htmlContent) {
  let raw = htmlContent == null ? '' : String(htmlContent);

  // Detect HTML: content that begins (ignoring leading whitespace) with a tag.
  const isHtml = /^\s*<[a-z]/i.test(raw);
  if (!isHtml) {
    // Parse markdown → HTML synchronously.
    raw = /** @type {string} */ (marked.parse(raw));
  }

  // DOMPurify is used here because comments are rendered via `dangerouslySetInnerHTML`.
  // We keep a tight HTML allowlist and explicitly preserve our entity/mention data-attrs.
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    // Keep the output compatible with our render-time regex transforms.
    ADD_ATTR: ['data-mention', 'data-id', 'data-entity-type', 'data-entity-id', 'data-label'],
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      'code',
      'pre',
      'blockquote',
      'ul',
      'ol',
      'li',
      'hr',
      'a',
      'span',
      'img',
      'h1',
      'h2',
      'h3',
      'h4',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'del',
      'sup',
      'sub',
    ],
    ALLOWED_ATTR: [
      'href',
      'src',
      'alt',
      'title',
      'target',
      'rel',
      'class',
      'data-mention',
      'data-id',
      'data-entity-type',
      'data-entity-id',
      'data-label',
    ],
  });
}

export function buildEntityPath(entity) {
  if (!entity?.type || !entity?.id) {
    return '/boards';
  }

  if (entity.type === ENTITY_TYPES.TASK) {
    return buildBoardTaskSearchPath(
      {
        id: entity.id,
        listId: entity.listId,
        spaceId: entity.spaceId,
        folderId: entity.folderId,
        list: entity.listId,
        space: entity.spaceId,
        folder: entity.folderId,
      },
      entity.sidebarTree ?? [],
    );
  }

  return buildBoardsNavigationPath({
    id: entity.id,
    type: entity.type,
    spaceId: entity.spaceId,
    parentFolderId: entity.parentFolderId ?? entity.folderId,
  });
}

export function normalizeEntityTagSelection(item, sidebarTree = []) {
  if (!item?.id || !item?.type) {
    return null;
  }

  const label = item.label || item.title || 'Untitled';

  if (item.type === ENTITY_TYPES.TASK) {
    const listId = item.listId ?? item.list ?? '';
    const listNode = listId ? findNodeById(sidebarTree, listId) : null;
    return {
      type: ENTITY_TYPES.TASK,
      id: item.id,
      label,
      listId,
      spaceId: item.spaceId ?? item.space ?? listNode?.spaceId ?? '',
      folderId: item.folderId ?? item.folder ?? listNode?.parentFolderId ?? '',
      breadcrumb: buildEntityBreadcrumb({
        type: ENTITY_TYPES.TASK,
        spaceTitle: item.spaceTitle || listNode?.spaceTitle,
        folderTitle: item.folderTitle || listNode?.folderTitle,
        listTitle: item.listTitle || listNode?.label,
      }),
      href: buildEntityPath({
        type: ENTITY_TYPES.TASK,
        id: item.id,
        listId,
        spaceId: item.spaceId ?? item.space ?? listNode?.spaceId,
        folderId: item.folderId ?? item.folder ?? listNode?.parentFolderId,
        sidebarTree,
      }),
    };
  }

  return {
    type: item.type,
    id: item.id,
    label,
    spaceId: item.spaceId ?? (item.type === ENTITY_TYPES.SPACE ? item.id : ''),
    parentFolderId: item.parentFolderId ?? '',
    folderId: item.parentFolderId ?? '',
    breadcrumb: buildEntityBreadcrumbFromTree(item, sidebarTree),
    href: buildEntityPath({
      type: item.type,
      id: item.id,
      spaceId: item.spaceId ?? (item.type === ENTITY_TYPES.SPACE ? item.id : undefined),
      parentFolderId: item.parentFolderId,
    }),
  };
}

function buildEntityBreadcrumb({ spaceTitle, folderTitle, listTitle } = {}) {
  return [spaceTitle, folderTitle, listTitle].filter(Boolean).join(' › ');
}

function buildEntityBreadcrumbFromTree(item, sidebarTree = []) {
  if (!item?.id) {
    return '';
  }

  const parts = [];
  let current = item;

  while (current) {
    parts.unshift(current.label);
    let parentId = null;
    if (current.type === ENTITY_TYPES.LIST) {
      parentId = current.parentFolderId || current.spaceId;
    } else if (current.type === ENTITY_TYPES.FOLDER) {
      parentId = current.spaceId;
    }
    if (!parentId || parentId === current.id) {
      break;
    }
    current = findNodeById(sidebarTree, parentId);
  }

  return parts.slice(0, -1).join(' › ');
}

export function getEntityTagRecents() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ENTITY_TAG_RECENTS_KEY));
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item?.type) : [];
  } catch {
    return [];
  }
}

export function addEntityTagRecent(entity) {
  if (!entity?.id || !entity?.type) {
    return;
  }

  const next = [
    {
      type: entity.type,
      id: entity.id,
      label: entity.label,
      href: entity.href,
      listId: entity.listId,
      spaceId: entity.spaceId,
      folderId: entity.folderId,
      parentFolderId: entity.parentFolderId,
      breadcrumb: entity.breadcrumb,
    },
    ...getEntityTagRecents().filter(
      (item) => !(item.id === entity.id && item.type === entity.type),
    ),
  ].slice(0, MAX_ENTITY_TAG_RECENTS);

  localStorage.setItem(ENTITY_TAG_RECENTS_KEY, JSON.stringify(next));
}

export function collectTreeItemsByType(items = [], types = [], results = []) {
  items.forEach((item) => {
    if (types.includes(item.type)) {
      results.push(item);
    }
    if (item.children?.length) {
      collectTreeItemsByType(item.children, types, results);
    }
  });
  return results;
}

export async function fetchListTasksForPicker(listId) {
  const result = await getListTasks(listId, { page: 1, pageSize: 50 });
  if (result.error) {
    return [];
  }

  return (result.data ?? []).map((task) => ({
    type: ENTITY_TYPES.TASK,
    id: task.id,
    label: task.title || 'Untitled',
    title: task.title || 'Untitled',
    listId: task.listId || listId,
    spaceId: task.spaceId,
    folderId: task.folderId,
    listTitle: task.listTitle,
    spaceTitle: task.spaceTitle,
    folderTitle: task.folderTitle,
  }));
}

export async function searchTasksForPicker(query, limit = 20) {
  const result = await searchBoardTasks(query, limit);
  if (result.error) {
    return [];
  }

  return (result.data ?? []).map((task) => ({
    type: ENTITY_TYPES.TASK,
    id: task.id,
    label: task.title || 'Untitled',
    title: task.title || 'Untitled',
    listId: task.listId,
    spaceId: task.spaceId,
    folderId: task.folderId,
    listTitle: task.listTitle,
    spaceTitle: task.spaceTitle,
    folderTitle: task.folderTitle,
  }));
}

/**
 * Resolve whether the current user can open a tagged entity.
 * Returns the navigation path (destination or no-access).
 */
export async function resolveBoardEntityNavigation({
  entityType,
  entityId,
  sidebarTree = [],
} = {}) {
  if (!entityType || !entityId) {
    return BOARD_NO_ACCESS_PATH;
  }

  if (entityType === ENTITY_TYPES.TASK) {
    const result = await getBoardTask(entityId);
    if (result.error || !result.data?.id) {
      return BOARD_NO_ACCESS_PATH;
    }

    const { listId } = result.data;
    if (listId && sidebarTree.length > 0 && !findNodeById(sidebarTree, listId)) {
      return BOARD_NO_ACCESS_PATH;
    }

    return buildBoardTaskSearchPath(result.data, sidebarTree) || BOARD_NO_ACCESS_PATH;
  }

  const node = findNodeById(sidebarTree, entityId);
  if (!node) {
    return BOARD_NO_ACCESS_PATH;
  }

  if (entityType && node.type !== entityType) {
    return BOARD_NO_ACCESS_PATH;
  }

  return buildBoardsNavigationPath(node) || BOARD_NO_ACCESS_PATH;
}

export function isBlankEditorHtml(html) {
  return (
    String(html ?? '')
      .replaceAll(/<[^>]*>/g, '')
      .replaceAll('&nbsp;', ' ')
      .replaceAll(/&\w+;|&#\d+;/g, ' ')
      .trim().length === 0
  );
}
