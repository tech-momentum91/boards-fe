import {
  addDays,
  addHours,
  addMinutes,
  format,
  nextMonday,
  setHours,
  setMinutes,
  setSeconds,
  startOfDay,
} from 'date-fns';

export const INBOX_FILTERS = [
  { id: 'assigned', label: 'Assigned' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'watching', label: 'Watching' },
  { id: 'unread', label: 'Unread' },
  { id: 'reminder', label: 'Reminder' },
  { id: 'cleared', label: 'Cleared' },
];

/** Cleared is exclusive — selecting it drops every other filter. */
export function toggleInboxFilter(currentFilters, filterId) {
  const active = new Set(currentFilters);

  if (filterId === 'cleared') {
    return active.has('cleared') ? [] : ['cleared'];
  }

  active.delete('cleared');
  if (active.has(filterId)) {
    active.delete(filterId);
  } else {
    active.add(filterId);
  }
  return Array.from(active);
}

function atEightAm(date) {
  return setSeconds(setMinutes(setHours(startOfDay(date), 8), 0), 0);
}

export function getInboxSnoozePresets(now = new Date()) {
  const tomorrow = atEightAm(addDays(now, 1));
  const inTwoDays = atEightAm(addDays(now, 2));
  const nextWeek = atEightAm(nextMonday(now));

  return [
    {
      id: '20m',
      label: 'In 20 minutes',
      at: addMinutes(now, 20),
    },
    {
      id: '2h',
      label: 'In 2 hours',
      at: addHours(now, 2),
    },
    {
      id: 'tomorrow',
      label: 'Tomorrow',
      at: tomorrow,
    },
    {
      id: '2d',
      label: 'In 2 days',
      at: inTwoDays,
    },
    {
      id: 'next_week',
      label: 'Next week',
      at: nextWeek,
    },
  ];
}

export function formatSnoozePresetSide(date, now = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const sameDay = startOfDay(date).getTime() === startOfDay(now).getTime();
  if (sameDay) return format(date, 'h:mm a');
  return format(date, 'EEE, h:mm a');
}

/** Calendar date pick → 8:00 AM local that day. */
export function snoozeDateToDateTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return atEightAm(date);
}

export function formatSnoozeForApi(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return format(date, 'yyyy-MM-dd HH:mm:ss');
}

export function getNotificationActionLabel(type) {
  switch (type) {
    case 'mention':
      return 'mentioned you';
    case 'comment_added':
      return 'commented';
    case 'comment_reaction':
      return 'reacted';
    case 'task_assigned':
      return 'assigned this task to you';
    case 'task_unassigned':
      return 'unassigned you';
    case 'status_changed':
      return 'changed status';
    case 'priority_changed':
      return 'changed priority';
    case 'due_date_changed':
      return 'changed due date';
    case 'start_date_changed':
      return 'changed start date';
    case 'title_changed':
      return 'renamed this task';
    case 'description_changed':
      return 'updated the description';
    case 'tags_changed':
      return 'updated tags';
    case 'custom_field_changed':
      return 'updated a custom field';
    case 'people_field_assigned':
      return 'added you to a people field';
    case 'task_moved':
      return 'moved this task';
    case 'task_copied':
      return 'added this task';
    case 'task_archived':
      return 'archived this task';
    case 'attachment_added':
      return 'added an attachment';
    case 'access_invited':
      return 'invited you';
    case 'access_via_role':
      return 'gave you access via role';
    case 'access_changed':
      return 'changed your access';
    case 'invite_accepted':
      return 'accepted your invite';
    case 'invite_declined':
      return 'declined your invite';
    case 'reminder':
      return 'reminder';
    case 'due_soon':
      return 'due soon';
    case 'overdue':
      return 'overdue';
    default:
      return type || 'updated';
  }
}

/** ClickUp-style phrase shown after the actor name (colon added by the row when a value follows). */
export function getNotificationActionPhrase(notification) {
  const type = notification?.type;
  const payload = notification?.payload;
  const fieldName =
    payload && typeof payload === 'object' && payload.field_name
      ? String(payload.field_name).trim()
      : '';

  switch (type) {
    case 'custom_field_changed':
      return fieldName ? `set ${fieldName} to` : 'updated a custom field';
    case 'status_changed':
      return 'changed status';
    case 'priority_changed':
      return 'changed priority';
    case 'due_date_changed':
      return 'changed due date';
    case 'start_date_changed':
      return 'changed start date';
    case 'title_changed':
      return 'renamed task to';
    case 'tags_changed':
      return 'updated tags';
    case 'comment_added':
      return 'commented';
    case 'mention':
      return 'mentioned you';
    case 'comment_reaction':
      return 'reacted';
    case 'attachment_added':
      return 'added attachment';
    case 'task_assigned':
      return 'assigned this task to you';
    case 'task_unassigned':
      return 'unassigned you';
    case 'people_field_assigned':
      return fieldName ? `added you to ${fieldName}` : 'added you to a people field';
    case 'task_moved':
      return 'moved this task';
    case 'task_copied':
      return 'added this task';
    case 'task_archived':
      return 'archived this task';
    case 'description_changed':
      return 'updated the description';
    case 'access_invited':
      return 'invited you';
    case 'access_via_role':
      return 'gave you access via role';
    case 'access_changed':
      return 'changed your access';
    case 'invite_accepted':
      return 'accepted your invite';
    case 'invite_declined':
      return 'declined your invite';
    case 'reminder':
      return 'reminder';
    case 'due_soon':
      return 'due soon';
    case 'overdue':
      return 'overdue';
    default:
      return getNotificationActionLabel(type);
  }
}

export function getInviteKind(notification) {
  const payload = notification?.payload;
  if (payload && typeof payload === 'object' && payload.invite_kind) {
    return payload.invite_kind;
  }
  if (notification?.type === 'access_via_role') return 'role';
  if (notification?.type === 'access_invited') return 'manual';
  return null;
}

export function getInviteId(notification) {
  const payload = notification?.payload;
  if (payload && typeof payload === 'object' && payload.invite_id) {
    return payload.invite_id;
  }
  if (notification?.reference_doctype === 'Board Invite') {
    return notification.reference_name || null;
  }
  return null;
}

/**
 * Stable key for stacking related notifications into one ClickUp-style row.
 * Same task (or same invite/resource) collapses; otherwise each row stays alone.
 */
export function getInboxStackKey(notification) {
  if (!notification || typeof notification !== 'object') return 'solo:unknown';
  if (notification.task) return `task:${notification.task}`;
  const resourceType = notification.resource_type || notification.payload?.resource_type;
  const resourceId = notification.resource_id || notification.payload?.resource_id;
  if (resourceType && resourceId) return `${resourceType}:${resourceId}`;
  return `solo:${notification.name || 'unknown'}`;
}

function creationTime(notification) {
  const raw = notification?.creation;
  if (!raw) return 0;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * ClickUp default: group by date section, then stack by task within each section.
 * Each stack shows the latest notification as the row + a count badge.
 *
 * @param {Array} notifications
 * @param {{ getSection: (creation: string) => string, getSectionOrder: () => Array<{key:string,label:string}>, getSectionLabel: (key: string) => string }} helpers
 */
export function groupInboxByDate(notifications, helpers) {
  const list = Array.isArray(notifications) ? notifications : [];
  const { getSection, getSectionOrder, getSectionLabel } = helpers;
  const order = getSectionOrder();
  const buckets = new Map(order.map((section) => [section.key, []]));

  list.forEach((item) => {
    const key = getSection(item.creation);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  });

  const buildStacks = (items) => {
    const byKey = new Map();
    items.forEach((item) => {
      const stackKey = getInboxStackKey(item);
      if (!byKey.has(stackKey)) byKey.set(stackKey, []);
      byKey.get(stackKey).push(item);
    });

    return [...byKey.entries()]
      .map(([stackKey, stacked]) => {
        const sorted = [...stacked].sort((a, b) => creationTime(b) - creationTime(a));
        const primary = sorted[0];
        const unread = sorted.some((item) => !item.is_read);
        return {
          stackKey,
          primary: unread && primary?.is_read ? { ...primary, is_read: 0 } : primary,
          items: sorted,
          count: sorted.length,
          names: sorted.map((item) => item.name).filter(Boolean),
        };
      })
      .sort((a, b) => creationTime(b.primary) - creationTime(a.primary));
  };

  const knownKeys = new Set(order.map((section) => section.key));
  const sections = order
    .map((section) => ({
      key: section.key,
      label: section.label,
      stacks: buildStacks(buckets.get(section.key) || []),
    }))
    .filter((section) => section.stacks.length > 0);

  [...buckets.entries()]
    .filter(([key]) => !knownKeys.has(key))
    .forEach(([key, items]) => {
      const stacks = buildStacks(items);
      if (!stacks.length) return;
      sections.push({
        key,
        label: getSectionLabel(key),
        stacks,
      });
    });

  return sections;
}
