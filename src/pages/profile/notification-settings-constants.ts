export const NOTIFICATION_CHANNELS = [
  {
    id: 'inbox',
    label: 'Inbox',
    icon: 'inbox',
  },
  {
    id: 'email',
    label: 'Email',
    icon: 'mail',
  },
  {
    id: 'browser',
    label: 'Browser',
    icon: 'window',
  },
  {
    id: 'mobile',
    label: 'Mobile',
    icon: 'smartphone',
  },
] as const;

export type NotificationChannelId = (typeof NOTIFICATION_CHANNELS)[number]['id'];

export const NOTIFICATION_PRESETS = [
  { value: 'default', label: 'Default' },
  { value: 'focused', label: 'Focused' },
  { value: 'all', label: 'All notifications' },
  { value: 'mentions', label: 'Mentions & assignments' },
  { value: 'nothing', label: 'Nothing' },
  { value: 'custom', label: 'Custom' },
] as const;

export type NotificationPreset = (typeof NOTIFICATION_PRESETS)[number]['value'];

export const RICH_CHANNEL_PRESET_OPTIONS: {
  value: NotificationPreset;
  label: string;
  description?: string;
  icon?: 'notification-off';
}[] = [
  {
    value: 'default',
    label: 'Default',
    description: 'Recommended settings',
  },
  {
    value: 'focused',
    label: 'Focused',
    description: 'Keep track of work without attention overload',
  },
  {
    value: 'mentions',
    label: 'Mentions Only',
    description: 'Only receive notifications for @mentions',
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Configure custom settings for this channel',
  },
  {
    value: 'nothing',
    label: 'Disable Notification',
    icon: 'notification-off',
  },
];

export function getPresetSubtitle(preset: NotificationPreset): string {
  switch (preset) {
    case 'default':
      return 'Default · Recommended settings';
    case 'focused':
      return 'Focused';
    case 'all':
      return 'All notifications';
    case 'mentions':
      return 'Mentions & assignments';
    case 'nothing':
      return 'Nothing';
    case 'custom':
      return 'Custom settings';
    default:
      return 'Default · Recommended settings';
  }
}

export function getRichChannelSubtitle(preset: NotificationPreset): string {
  switch (preset) {
    case 'default':
      return 'Default · Recommended settings';
    case 'focused':
      return 'Focused';
    case 'mentions':
      return 'Mentions Only';
    case 'custom':
      return 'Custom settings';
    case 'nothing':
      return 'Disabled';
    default:
      return 'Default · Recommended settings';
  }
}

export function getRichPresetTriggerLabel(preset: NotificationPreset): string {
  const option = RICH_CHANNEL_PRESET_OPTIONS.find((item) => item.value === preset);
  if (option?.value === 'nothing') {
    return 'Disabled';
  }
  return option?.label ?? 'Default';
}

export type NotificationTypeOption = {
  id: string;
  label: string;
};

export const NOTIFICATION_TYPE_CATEGORIES: {
  id: string;
  label: string;
  types: string[];
}[] = [
  {
    id: 'comments',
    label: 'Comments & mentions',
    types: ['mention', 'comment_added', 'comment_reaction'],
  },
  {
    id: 'task_activity',
    label: 'Task activity',
    types: [
      'task_assigned',
      'task_unassigned',
      'status_changed',
      'priority_changed',
      'due_date_changed',
      'start_date_changed',
      'title_changed',
      'description_changed',
      'tags_changed',
      'custom_field_changed',
      'people_field_assigned',
      'task_moved',
      'task_copied',
      'task_archived',
      'attachment_added',
    ],
  },
  {
    id: 'access',
    label: 'Access & invites',
    types: [
      'access_invited',
      'access_via_role',
      'access_changed',
      'invite_accepted',
      'invite_declined',
    ],
  },
  {
    id: 'deadlines',
    label: 'Deadlines & reminders',
    types: ['due_soon', 'overdue', 'reminder'],
  },
];

export function groupNotificationTypes(
  notificationTypes: NotificationTypeOption[],
): { id: string; label: string; types: NotificationTypeOption[] }[] {
  const byId = new Map(notificationTypes.map((item) => [item.id, item]));
  const grouped = NOTIFICATION_TYPE_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    types: category.types
      .map((typeId) => byId.get(typeId))
      .filter((item): item is NotificationTypeOption => Boolean(item)),
  })).filter((category) => category.types.length > 0);

  const categorized = new Set(NOTIFICATION_TYPE_CATEGORIES.flatMap((category) => category.types));
  const leftover = notificationTypes.filter((item) => !categorized.has(item.id));
  if (leftover.length > 0) {
    grouped.push({
      id: 'other',
      label: 'Other',
      types: leftover,
    });
  }

  return grouped;
}

export type ChannelSettings = {
  preset: NotificationPreset;
  overrides: Record<string, boolean>;
  enabled?: Record<string, boolean>;
};

export type AutoFollowTriggerId =
  | 'auto_follow_on_create'
  | 'auto_follow_on_edit'
  | 'auto_follow_on_comment';

export const AUTO_FOLLOW_OPTIONS: {
  id: AutoFollowTriggerId;
  label: string;
  summary: string;
}[] = [
  { id: 'auto_follow_on_create', label: 'When I create a task', summary: 'create a task' },
  { id: 'auto_follow_on_edit', label: 'When I edit a task', summary: 'edit a task' },
  { id: 'auto_follow_on_comment', label: 'When I comment on a task', summary: 'comment on a task' },
];

export function getAutoFollowSubtitle(settings: {
  auto_follow_on_create: boolean;
  auto_follow_on_edit: boolean;
  auto_follow_on_comment: boolean;
}): string {
  const selected = AUTO_FOLLOW_OPTIONS.filter((option) => settings[option.id]);
  if (selected.length === 0) {
    return 'Off';
  }
  if (selected.length === 1) {
    return `When I ${selected[0].summary}`;
  }
  if (selected.length === 2) {
    return `When I ${selected[0].summary} or ${selected[1].summary}`;
  }
  return 'When I create, edit, or comment on a task';
}

export type NotificationSettings = {
  auto_follow_tasks: boolean;
  auto_follow_on_create: boolean;
  auto_follow_on_edit: boolean;
  auto_follow_on_comment: boolean;
  smart_notifications: boolean;
  browser_play_sound: boolean;
  channels: Record<NotificationChannelId, ChannelSettings>;
  notification_types: NotificationTypeOption[];
};

export function createDefaultNotificationSettings(): NotificationSettings {
  return {
    auto_follow_tasks: true,
    auto_follow_on_create: true,
    auto_follow_on_edit: true,
    auto_follow_on_comment: true,
    smart_notifications: true,
    browser_play_sound: false,
    channels: {
      inbox: { preset: 'default', overrides: {} },
      email: { preset: 'default', overrides: {} },
      browser: { preset: 'default', overrides: {} },
      mobile: { preset: 'default', overrides: {} },
    },
    notification_types: [],
  };
}

export function normalizeNotificationSettings(raw: Partial<NotificationSettings> | null | undefined) {
  const defaults = createDefaultNotificationSettings();
  if (!raw) {
    return defaults;
  }

  const channels = { ...defaults.channels };
  for (const channel of NOTIFICATION_CHANNELS) {
    const channelRaw = raw.channels?.[channel.id];
    if (!channelRaw) continue;
    channels[channel.id] = {
      preset: channelRaw.preset ?? defaults.channels[channel.id].preset,
      overrides: channelRaw.overrides ?? {},
      enabled: channelRaw.enabled,
    };
  }

  const master = raw.auto_follow_tasks ?? defaults.auto_follow_tasks;
  const onCreate = raw.auto_follow_on_create ?? master;
  const onEdit = raw.auto_follow_on_edit ?? master;
  const onComment = raw.auto_follow_on_comment ?? master;

  return {
    auto_follow_tasks: Boolean(master && (onCreate || onEdit || onComment)),
    auto_follow_on_create: Boolean(master && onCreate),
    auto_follow_on_edit: Boolean(master && onEdit),
    auto_follow_on_comment: Boolean(master && onComment),
    smart_notifications: raw.smart_notifications ?? defaults.smart_notifications,
    browser_play_sound: raw.browser_play_sound ?? defaults.browser_play_sound,
    channels,
    notification_types: Array.isArray(raw.notification_types)
      ? raw.notification_types
      : defaults.notification_types,
  };
}
