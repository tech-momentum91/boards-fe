import { BOARD_ICON_COLORS } from '../components/board-color-utils';

export const TASK_STATUS_CATEGORY_KEYS = ['not_started', 'active', 'done', 'closed'];

export const TASK_STATUS_CATEGORY_LABELS = {
  not_started: 'Not started',
  active: 'Active',
  done: 'Done',
  closed: 'Closed',
};

/** Alias of BOARD_ICON_COLORS for status UIs that still import the older name. */
export const TASK_STATUS_COLOR_OPTIONS = BOARD_ICON_COLORS;

export const DEFAULT_STATUS_COLOR = BOARD_ICON_COLORS[BOARD_ICON_COLORS.length - 1];

export function createStatusItem({
  id = null,
  name1 = '',
  name = '',
  color = DEFAULT_STATUS_COLOR,
  isEnabled = true,
  isClosed = false,
  order = 0,
  category = null,
  isDraft = false,
} = {}) {
  return {
    id:
      id ??
      `status-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`,
    name1,
    name,
    color,
    isEnabled,
    isClosed,
    order,
    category,
    isDraft,
  };
}

export function createDefaultStatusTemplate() {
  return {
    templateId: null,
    templateName: null,
    spaceId: null,
    mode: 'custom',
    otherSourceId: null,
    categories: {
      not_started: [],
      active: [],
      done: [],
      closed: [],
    },
  };
}
