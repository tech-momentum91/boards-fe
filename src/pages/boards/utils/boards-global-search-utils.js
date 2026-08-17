import { findNodeById } from '@/services/boards-service';
import { buildBoardsNavigationPath } from '@/pages/boards/utils/boards-navigation';
import { getCategoryProgressPercentage } from '@/pages/boards/utils/task-statuses-utils';
import { resolveBadgeColor } from '@/components/ui/circular-progress';

export function formatBoardSearchRelativeTime(date) {
  if (!date) {
    return '';
  }

  const timestamp = new Date(date).getTime();
  if (Number.isNaN(timestamp)) {
    return '';
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (diffSeconds < 60) {
    return 'just now';
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) {
    return `${diffWeeks}w ago`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths}mo ago`;
  }

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y ago`;
}

export function buildBoardTaskSearchPath(task = {}, sidebarTree = []) {
  const taskId = task.id ?? task.name;
  const listId = task.listId ?? task.list;

  if (!taskId || !listId) {
    return '/boards';
  }

  const listNode = findNodeById(sidebarTree, listId);
  const basePath = listNode
    ? buildBoardsNavigationPath(listNode)
    : buildBoardTaskSearchFallbackPath(task);

  return `${basePath}?task=${encodeURIComponent(taskId)}`;
}

function buildBoardTaskSearchFallbackPath(task = {}) {
  const listId = task.listId ?? task.list;
  const spaceId = task.spaceId ?? task.space;
  const folderId = task.folderId ?? task.folder;

  if (spaceId && folderId && listId) {
    return `/boards/space/${spaceId}/folder/${folderId}/list/${listId}`;
  }

  if (spaceId && listId) {
    return `/boards/space/${spaceId}/list/${listId}`;
  }

  if (listId) {
    return `/boards/list/${listId}`;
  }

  return '/boards';
}

export function getBoardSearchLocationLabel(task = {}) {
  const listTitle = task.listTitle ?? task.list_title ?? '';
  if (listTitle) {
    return listTitle;
  }

  const parts = [task.spaceTitle, task.folderTitle].filter(Boolean);
  return parts.join(' / ') || 'Boards';
}

export function getBoardSearchStatusProgress(task = {}) {
  if (task.isClosed) {
    return 100;
  }

  if (task.statusCategory) {
    return getCategoryProgressPercentage(task.statusCategory);
  }

  return 0;
}

export function getBoardSearchStatusColor(task = {}) {
  if (task.statusColor) {
    return resolveBadgeColor(task.statusColor);
  }

  if (task.isClosed) {
    return '#1DAF61';
  }

  const status = String(task.statusTitle ?? task.status ?? '')
    .trim()
    .toLowerCase();
  const palette = {
    'to do': '#375DFB',
    todo: '#375DFB',
    open: '#375DFB',
    'in progress': '#7D52F4',
    working: '#7D52F4',
    completed: '#1DAF61',
    done: '#1DAF61',
    closed: '#1DAF61',
    cancelled: '#868C98',
    canceled: '#868C98',
  };

  return palette[status] ?? '#868C98';
}
