import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCheckLine,
  RiInbox2Line,
  RiMailLine,
  RiMenuUnfoldLine,
  RiNotificationOffLine,
  RiSmartphoneLine,
  RiVolumeUpLine,
  RiWindowLine,
} from 'react-icons/ri';
import type { IconType } from 'react-icons';
import * as CompactButton from '@/components/ui/compact-button';
import * as Dropdown from '@/components/ui/dropdown';
import * as Switch from '@/components/ui/switch';
import Sidebar from '@/pages/boards/sidebar/Sidebar';
import BoardsSidebarShell from '@/pages/boards/layout/BoardsSidebarShell';
import useBoardsSidebarCollapsed from '@/pages/boards/hooks/useBoardsSidebarCollapsed';
import { buildBoardsNavigationPath } from '@/pages/boards/utils/boards-navigation';
import {
  getNotificationSettings,
  saveNotificationSettings,
} from '@/services/notification-settings-service';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';
import { setCachedBrowserPlaySound } from '@/utils/notification-delivery-prefs';
import {
  AUTO_FOLLOW_OPTIONS,
  NOTIFICATION_CHANNELS,
  RICH_CHANNEL_PRESET_OPTIONS,
  createDefaultNotificationSettings,
  getAutoFollowSubtitle,
  getRichChannelSubtitle,
  getRichPresetTriggerLabel,
  groupNotificationTypes,
  normalizeNotificationSettings,
  type AutoFollowTriggerId,
  type NotificationChannelId,
  type NotificationPreset,
  type NotificationSettings,
  type NotificationTypeOption,
} from './notification-settings-constants';

const CHANNEL_ICONS: Record<NotificationChannelId, IconType> = {
  inbox: RiInbox2Line,
  email: RiMailLine,
  browser: RiWindowLine,
  mobile: RiSmartphoneLine,
};

const cardClassName =
  'rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-4 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]';

const autoFollowCardClassName =
  'overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]';

const presetSelectTriggerClassName =
  'h-9 w-[200px] shrink-0 gap-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 py-2 text-paragraph-sm text-text-soft-400 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] ring-0 hover:bg-bg-white-0 hover:ring-0 focus:shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] focus:ring-1 focus:ring-stroke-soft-200 data-[state=open]:shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] data-[state=open]:before:ring-0 data-[state=open]:ring-1 data-[state=open]:ring-stroke-soft-200';

function recordsEqual(
  left?: Record<string, boolean>,
  right?: Record<string, boolean>,
): boolean {
  if (left === right) return true;
  if (!left || !right) return !left && !right;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => left[key] === right[key]);
}

function ChannelIcon({ icon: Icon }: { icon: IconType }) {
  return (
    <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(243,244,246,0.6)] text-icon-sub-500'>
      <Icon size={24} />
    </span>
  );
}

function AutoFollowOptionRow({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className='flex items-center gap-2'>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className='shrink-0'
      />
      <p className='text-label-sm font-medium tracking-[-0.084px] text-text-main-900'>{label}</p>
    </div>
  );
}

function AutoFollowSettingsCard({
  settings,
  expanded,
  disabled,
  onToggleExpanded,
  onMasterChange,
  onOptionChange,
}: {
  settings: NotificationSettings;
  expanded: boolean;
  disabled?: boolean;
  onToggleExpanded: () => void;
  onMasterChange: (checked: boolean) => void;
  onOptionChange: (optionId: AutoFollowTriggerId, checked: boolean) => void;
}) {
  const ExpandIcon = expanded ? RiArrowUpSLine : RiArrowDownSLine;

  return (
    <div className={autoFollowCardClassName}>
      <div
        className={cn(
          'flex w-full items-center gap-2 p-4',
          expanded && 'border-b border-stroke-soft-200',
        )}
      >
        <Switch.Root
          checked={settings.auto_follow_tasks}
          onCheckedChange={onMasterChange}
          disabled={disabled}
          className='shrink-0'
        />
        <div className='min-w-0 flex-1'>
          <p className='text-label-sm font-semibold text-text-main-900'>
            Auto follow tasks I am involved in
          </p>
          <p className='mt-0.5 text-paragraph-xs text-text-sub-500'>
            {getAutoFollowSubtitle(settings)}
          </p>
        </div>
        <button
          type='button'
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} auto follow settings`}
          disabled={disabled}
          onClick={onToggleExpanded}
          className='flex size-4 shrink-0 items-center justify-center text-icon-sub-500 transition hover:text-text-main-900 disabled:pointer-events-none disabled:opacity-50'
        >
          <ExpandIcon size={16} />
        </button>
      </div>

      {expanded ? (
        <div className='flex flex-col gap-2 py-4 pl-[50px] pr-4'>
          {AUTO_FOLLOW_OPTIONS.map((option) => (
            <AutoFollowOptionRow
              key={option.id}
              label={option.label}
              checked={settings[option.id]}
              disabled={disabled}
              onCheckedChange={(checked) => onOptionChange(option.id, checked)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SettingsToggleRow({
  checked,
  disabled,
  title,
  description,
  onCheckedChange,
  className,
}: {
  checked: boolean;
  disabled?: boolean;
  title: string;
  description: string;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-4', className)}>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className='mt-0.5 shrink-0'
      />
      <div className='min-w-0 flex-1'>
        <p className='text-label-sm font-semibold text-text-main-900'>{title}</p>
        <p className='mt-1 text-paragraph-xs text-text-sub-500'>{description}</p>
      </div>
    </div>
  );
}

function NotificationTypeToggle({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className='flex items-center justify-between gap-3 rounded-lg px-1 py-1.5'>
      <span className='text-paragraph-sm text-text-sub-600'>{label}</span>
      <Switch.Root checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

function ChannelNotificationTypeGroups({
  channelId,
  notificationTypes,
  enabledMap,
  disabled,
  onTypeToggle,
}: {
  channelId: NotificationChannelId;
  notificationTypes: NotificationTypeOption[];
  enabledMap: Record<string, boolean>;
  disabled?: boolean;
  onTypeToggle: (channelId: NotificationChannelId, typeId: string, enabled: boolean) => void;
}) {
  const groups = useMemo(
    () => groupNotificationTypes(notificationTypes),
    [notificationTypes],
  );

  return (
    <div className='flex flex-col gap-5'>
      {groups.map((group) => (
        <div key={`${channelId}-${group.id}`} className='flex flex-col gap-2'>
          <p className='text-label-xs font-semibold uppercase tracking-[0.04em] text-text-soft-400'>
            {group.label}
          </p>
          <div className='grid gap-1 sm:grid-cols-2'>
            {group.types.map((notificationType) => (
              <NotificationTypeToggle
                key={`${channelId}-${notificationType.id}`}
                label={notificationType.label}
                checked={Boolean(enabledMap[notificationType.id])}
                disabled={disabled}
                onCheckedChange={(enabled) =>
                  onTypeToggle(channelId, notificationType.id, enabled)
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChannelPresetDropdown({
  value,
  disabled,
  onValueChange,
  playSound,
  onPlaySoundChange,
}: {
  value: NotificationPreset;
  disabled?: boolean;
  onValueChange: (preset: NotificationPreset) => void;
  playSound?: boolean;
  onPlaySoundChange?: (checked: boolean) => void;
}) {
  const showPlaySound = typeof playSound === 'boolean' && typeof onPlaySoundChange === 'function';

  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button
          type='button'
          disabled={disabled}
          className={cn(
            presetSelectTriggerClassName,
            'flex items-center disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          <span className='min-w-0 flex-1 truncate text-left'>{getRichPresetTriggerLabel(value)}</span>
          <RiArrowDownSLine size={20} className='shrink-0 text-text-soft-400' />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Content
        align='end'
        sideOffset={4}
        className='z-[100] w-[280px] gap-1 p-2 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
      >
        {RICH_CHANNEL_PRESET_OPTIONS.filter((option) => option.value !== 'nothing').map((option) => {
          const selected = option.value === value;

          return (
            <Dropdown.Item
              key={option.value}
              onSelect={() => onValueChange(option.value)}
              className={cn(
                'items-start gap-2 p-2',
                selected && 'bg-bg-weak-50 data-[highlighted]:bg-bg-weak-50',
              )}
            >
              <span className='flex min-w-0 flex-1 flex-col gap-1'>
                <span
                  className={cn(
                    'text-paragraph-sm tracking-[-0.084px] text-text-main-900',
                    selected ? 'font-medium' : 'font-normal',
                  )}
                >
                  {option.label}
                </span>
                {option.description ? (
                  <span className='whitespace-normal text-paragraph-xs text-text-soft-400'>
                    {option.description}
                  </span>
                ) : null}
              </span>
              {selected ? (
                <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
                  <RiCheckLine size={20} />
                </span>
              ) : null}
            </Dropdown.Item>
          );
        })}

        {showPlaySound ? (
          <Dropdown.Item
            onSelect={(event) => {
              event.preventDefault();
            }}
            className='items-center gap-2 p-2'
          >
            <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
              <RiVolumeUpLine size={20} />
            </span>
            <span className='min-w-0 flex-1 text-paragraph-sm tracking-[-0.084px] text-text-main-900'>
              Play Sound
            </span>
            <Switch.Root
              checked={playSound}
              onCheckedChange={onPlaySoundChange}
              disabled={disabled}
              className='shrink-0'
              onClick={(event) => event.stopPropagation()}
            />
          </Dropdown.Item>
        ) : null}

        {RICH_CHANNEL_PRESET_OPTIONS.filter((option) => option.value === 'nothing').map((option) => {
          const selected = option.value === value;

          return (
            <Dropdown.Item
              key={option.value}
              onSelect={() => onValueChange(option.value)}
              className={cn(
                'items-center gap-2 p-2',
                selected && 'bg-bg-weak-50 data-[highlighted]:bg-bg-weak-50',
              )}
            >
              <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
                <RiNotificationOffLine size={20} />
              </span>
              <span
                className={cn(
                  'min-w-0 flex-1 text-paragraph-sm tracking-[-0.084px] text-text-main-900',
                  selected ? 'font-medium' : 'font-normal',
                )}
              >
                {option.label}
              </span>
              {selected ? (
                <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
                  <RiCheckLine size={20} />
                </span>
              ) : null}
            </Dropdown.Item>
          );
        })}
      </Dropdown.Content>
    </Dropdown.Root>
  );
}

function NotificationChannelCard({
  channelId,
  label,
  icon,
  preset,
  subtitle,
  expanded,
  disabled,
  notificationTypes,
  enabledMap,
  playSound,
  footer,
  onToggleExpanded,
  onPresetChange,
  onTypeToggle,
  onPlaySoundChange,
}: {
  channelId: NotificationChannelId;
  label: string;
  icon: IconType;
  preset: NotificationPreset;
  subtitle: string;
  expanded: boolean;
  disabled?: boolean;
  notificationTypes: NotificationTypeOption[];
  enabledMap: Record<string, boolean>;
  playSound?: boolean;
  footer?: ReactNode;
  onToggleExpanded: (channelId: NotificationChannelId) => void;
  onPresetChange: (channelId: NotificationChannelId, preset: NotificationPreset) => void;
  onTypeToggle: (channelId: NotificationChannelId, typeId: string, enabled: boolean) => void;
  onPlaySoundChange?: (checked: boolean) => void;
}) {
  const ExpandIcon = expanded ? RiArrowUpSLine : RiArrowDownSLine;

  return (
    <div className={cn(cardClassName, 'flex flex-col gap-5')}>
      <div className='flex items-center justify-between gap-4'>
        <div className='flex min-w-0 flex-1 items-center gap-4'>
          <ChannelIcon icon={icon} />
          <div className='min-w-0'>
            <p className='text-label-sm font-semibold text-text-main-900'>{label}</p>
            <p className='mt-1 text-paragraph-xs text-text-sub-500'>{subtitle}</p>
          </div>
        </div>

        <div className='flex shrink-0 items-center gap-3'>
          <ChannelPresetDropdown
            value={preset}
            disabled={disabled}
            onValueChange={(nextPreset) => onPresetChange(channelId, nextPreset)}
            playSound={channelId === 'browser' ? playSound : undefined}
            onPlaySoundChange={channelId === 'browser' ? onPlaySoundChange : undefined}
          />

          <button
            type='button'
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${label} settings`}
            disabled={disabled}
            onClick={() => onToggleExpanded(channelId)}
            className='flex size-5 shrink-0 items-center justify-center rounded-md text-icon-sub-500 transition hover:bg-bg-weak-50 hover:text-text-main-900 disabled:pointer-events-none disabled:opacity-50'
          >
            <ExpandIcon size={20} />
          </button>
        </div>
      </div>

      {expanded ? (
        <div className='border-t border-stroke-soft-200 pt-4'>
          <ChannelNotificationTypeGroups
            channelId={channelId}
            notificationTypes={notificationTypes}
            enabledMap={enabledMap}
            disabled={disabled}
            onTypeToggle={onTypeToggle}
          />
        </div>
      ) : null}

      {footer}
    </div>
  );
}

export default function BoardsNotificationSettingsPage() {
  const navigate = useNavigate();
  const [, setSidebarTree] = useState([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const { isSidebarCollapsed, toggleSidebar } = useBoardsSidebarCollapsed();
  const [settings, setSettings] = useState<NotificationSettings>(() =>
    createDefaultNotificationSettings(),
  );
  const [expandedChannels, setExpandedChannels] = useState<Record<NotificationChannelId, boolean>>({
    inbox: false,
    email: false,
    browser: false,
    mobile: false,
  });
  const [expandedAutoFollow, setExpandedAutoFollow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const saveVersionRef = useRef(0);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<NotificationSettings | null>(null);
  const revertSettingsRef = useRef<NotificationSettings | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const result = await getNotificationSettings();
    if (result.error) {
      setLoadError(result.error);
      setLoading(false);
      return;
    }

    const normalized = normalizeNotificationSettings(result.data);
    setSettings(normalized);
    revertSettingsRef.current = normalized;
    setCachedBrowserPlaySound(normalized.browser_play_sound);
    setLoading(false);
  }, []);

  const persistSettings = useCallback(async (nextSettings: NotificationSettings) => {
    const requestVersion = saveVersionRef.current + 1;
    saveVersionRef.current = requestVersion;

    const payload = {
      auto_follow_tasks: nextSettings.auto_follow_tasks,
      auto_follow_on_create: nextSettings.auto_follow_on_create,
      auto_follow_on_edit: nextSettings.auto_follow_on_edit,
      auto_follow_on_comment: nextSettings.auto_follow_on_comment,
      smart_notifications: nextSettings.smart_notifications,
      browser_play_sound: nextSettings.browser_play_sound,
      channels: Object.fromEntries(
        NOTIFICATION_CHANNELS.map(({ id }) => [
          id,
          {
            preset: nextSettings.channels[id].preset,
            overrides: nextSettings.channels[id].overrides,
          },
        ]),
      ),
    };

    const result = await saveNotificationSettings(payload);
    if (saveVersionRef.current !== requestVersion) {
      return;
    }

    if (result.error) {
      if (revertSettingsRef.current) {
        setSettings(revertSettingsRef.current);
        setCachedBrowserPlaySound(revertSettingsRef.current.browser_play_sound);
      }
      showErrorToast(result.error);
      return;
    }

    const normalized = normalizeNotificationSettings(result.data);
    revertSettingsRef.current = normalized;
    setCachedBrowserPlaySound(normalized.browser_play_sound);

    // Keep optimistic UI; only fill in server-derived `enabled` maps when needed.
    // Avoid replacing settings (and re-rendering the whole page) after every save.
    setSettings((current) => {
      let didChange = false;
      const nextChannels = { ...current.channels };

      for (const { id } of NOTIFICATION_CHANNELS) {
        const local = current.channels[id];
        const remote = normalized.channels[id];
        if (!remote || local.preset !== remote.preset) {
          continue;
        }

        const nextEnabled = remote.enabled ?? local.enabled;
        const nextOverrides = remote.overrides ?? local.overrides;
        if (
          recordsEqual(nextEnabled, local.enabled) &&
          recordsEqual(nextOverrides, local.overrides)
        ) {
          continue;
        }

        nextChannels[id] = {
          ...local,
          enabled: nextEnabled,
          overrides: nextOverrides,
        };
        didChange = true;
      }

      if (!didChange) {
        return current;
      }

      return {
        ...current,
        channels: nextChannels,
        notification_types:
          normalized.notification_types.length > 0
            ? normalized.notification_types
            : current.notification_types,
      };
    });
  }, []);

  const queuePersist = useCallback(
    (nextSettings: NotificationSettings) => {
      pendingSaveRef.current = nextSettings;
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }

      saveDebounceRef.current = setTimeout(() => {
        const pending = pendingSaveRef.current;
        pendingSaveRef.current = null;
        if (pending) {
          void persistSettings(pending);
        }
      }, 350);
    },
    [persistSettings],
  );

  const applySettings = useCallback(
    (updater: (current: NotificationSettings) => NotificationSettings) => {
      const next = updater(settingsRef.current);
      settingsRef.current = next;
      setSettings(next);
      queuePersist(next);
    },
    [queuePersist],
  );

  useEffect(() => {
    void loadSettings();
    return () => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
    };
  }, [loadSettings]);

  const handleSelectItem = useCallback(
    (item: { id?: string; type?: string }) => {
      navigate(buildBoardsNavigationPath(item));
    },
    [navigate],
  );

  const updateSettings = applySettings;

  const handleAutoFollowChange = useCallback(
    (checked: boolean) => {
      updateSettings((current) => ({
        ...current,
        auto_follow_tasks: checked,
        auto_follow_on_create: checked,
        auto_follow_on_edit: checked,
        auto_follow_on_comment: checked,
      }));
    },
    [updateSettings],
  );

  const handleAutoFollowOptionChange = useCallback(
    (optionId: AutoFollowTriggerId, checked: boolean) => {
      updateSettings((current) => {
        const next = {
          ...current,
          [optionId]: checked,
        };
        next.auto_follow_tasks =
          next.auto_follow_on_create || next.auto_follow_on_edit || next.auto_follow_on_comment;
        return next;
      });
    },
    [updateSettings],
  );

  const handleSmartNotificationsChange = useCallback(
    (checked: boolean) => {
      updateSettings((current) => ({
        ...current,
        smart_notifications: checked,
      }));
    },
    [updateSettings],
  );

  const handleBrowserPlaySoundChange = useCallback(
    (checked: boolean) => {
      setCachedBrowserPlaySound(checked);
      updateSettings((current) => ({
        ...current,
        browser_play_sound: checked,
      }));
    },
    [updateSettings],
  );

  const handlePresetChange = useCallback(
    (channelId: NotificationChannelId, preset: NotificationPreset) => {
      updateSettings((current) => {
        const channel = current.channels[channelId];
        const enabled = channel.enabled ?? {};
        const overrides =
          preset === 'custom'
            ? Object.fromEntries(
                (current.notification_types.length
                  ? current.notification_types
                  : Object.keys(enabled).map((id) => ({ id }))
                ).map((type) => [type.id, Boolean(enabled[type.id])]),
              )
            : {};

        return {
          ...current,
          channels: {
            ...current.channels,
            [channelId]: {
              preset,
              overrides,
              enabled,
            },
          },
        };
      });
      if (preset === 'custom') {
        setExpandedChannels((current) => ({
          ...current,
          [channelId]: true,
        }));
      }
    },
    [updateSettings],
  );

  const handleTypeToggle = useCallback(
    (channelId: NotificationChannelId, typeId: string, enabled: boolean) => {
      updateSettings((current) => {
        const channel = current.channels[channelId];
        const types =
          current.notification_types.length > 0
            ? current.notification_types
            : Object.keys(channel.enabled ?? {}).map((id) => ({ id, label: id }));
        const nextEnabled: Record<string, boolean> = { ...(channel.enabled ?? {}) };
        for (const type of types) {
          if (nextEnabled[type.id] === undefined) {
            nextEnabled[type.id] = false;
          }
        }
        nextEnabled[typeId] = enabled;

        const overrides: Record<string, boolean> = {};
        for (const type of types) {
          overrides[type.id] = Boolean(nextEnabled[type.id]);
        }
        overrides[typeId] = enabled;

        return {
          ...current,
          channels: {
            ...current.channels,
            [channelId]: {
              preset: 'custom',
              overrides,
              enabled: nextEnabled,
            },
          },
        };
      });
    },
    [updateSettings],
  );

  const handleToggleExpanded = useCallback((channelId: NotificationChannelId) => {
    setExpandedChannels((current) => ({
      ...current,
      [channelId]: !current[channelId],
    }));
  }, []);

  const notificationTypes = useMemo(
    () =>
      settings.notification_types.length > 0
        ? settings.notification_types
        : createDefaultNotificationSettings().notification_types,
    [settings.notification_types],
  );

  const controlsDisabled = loading;

  return (
    <div className='flex h-dvh min-w-0 overflow-hidden'>
      <div className='flex h-full min-w-0 flex-1'>
        <BoardsSidebarShell collapsed={isSidebarCollapsed}>
          <Sidebar
            activeId={null}
            expandedIds={expandedIds}
            onExpandedIdsChange={setExpandedIds}
            onSelectItem={handleSelectItem}
            onTreeLoaded={setSidebarTree}
          />
        </BoardsSidebarShell>

        <main className='min-w-0 flex-1 overflow-y-auto bg-bg-weak-50'>
          <div className='mx-auto flex w-full max-w-[1024px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8 lg:py-10'>
            <header className='flex items-start gap-3'>
              {isSidebarCollapsed ? (
                <CompactButton.Root
                  variant='secondary'
                  size='medium'
                  type='button'
                  className='mt-0.5 shrink-0 rounded-full'
                  onClick={toggleSidebar}
                  aria-label='Expand sidebar'
                >
                  <CompactButton.Icon as={RiMenuUnfoldLine} />
                </CompactButton.Root>
              ) : null}
              <div>
                <h1 className='text-title-h5 text-text-strong-950'>Notification settings</h1>
                <p className='mt-1 text-paragraph-sm text-text-sub-500'>
                  Choose how and when you receive updates about tasks and activity.
                </p>
              </div>
            </header>

            {loadError ? (
              <div className='rounded-xl border border-error-base/20 bg-error-lighter px-4 py-3'>
                <p className='text-paragraph-sm text-error-base'>
                  {extractErrorMessage(loadError, 'Failed to load notification settings.')}
                </p>
                {loadError.includes('board_notification_settings') ? (
                  <p className='mt-2 text-paragraph-xs text-error-base/90'>
                    The backend doctype may not be installed yet. Ask your admin to run{' '}
                    <code className='rounded bg-error-base/10 px-1 py-0.5'>
                      bench --site boards.local migrate
                    </code>{' '}
                    and restart the server.
                  </p>
                ) : null}
                <button
                  type='button'
                  onClick={() => void loadSettings()}
                  className='mt-3 rounded-lg bg-bg-white-0 px-3 py-1.5 text-paragraph-sm font-medium text-error-base ring-1 ring-inset ring-error-base/20 transition hover:bg-error-base/5'
                >
                  Retry
                </button>
              </div>
            ) : null}

            <div className='flex flex-col gap-4'>
              <AutoFollowSettingsCard
                settings={settings}
                expanded={expandedAutoFollow}
                disabled={controlsDisabled}
                onToggleExpanded={() => setExpandedAutoFollow((current) => !current)}
                onMasterChange={handleAutoFollowChange}
                onOptionChange={handleAutoFollowOptionChange}
              />

              {NOTIFICATION_CHANNELS.map((channel) => {
                const channelSettings = settings.channels[channel.id];
                const preset = channelSettings?.preset ?? 'default';
                const Icon = CHANNEL_ICONS[channel.id];

                return (
                  <NotificationChannelCard
                    key={channel.id}
                    channelId={channel.id}
                    label={channel.label}
                    icon={Icon}
                    preset={preset}
                    subtitle={getRichChannelSubtitle(preset)}
                    expanded={expandedChannels[channel.id]}
                    disabled={controlsDisabled}
                    notificationTypes={notificationTypes}
                    enabledMap={channelSettings?.enabled ?? {}}
                    playSound={channel.id === 'browser' ? settings.browser_play_sound : undefined}
                    onToggleExpanded={handleToggleExpanded}
                    onPresetChange={handlePresetChange}
                    onTypeToggle={handleTypeToggle}
                    onPlaySoundChange={
                      channel.id === 'browser' ? handleBrowserPlaySoundChange : undefined
                    }
                    footer={
                      channel.id === 'mobile' ? (
                        <SettingsToggleRow
                          checked={settings.smart_notifications}
                          disabled={controlsDisabled}
                          title='Smart Notifications'
                          description="Don't send mobile notifications while I'm active on Desktop/browser"
                          onCheckedChange={handleSmartNotificationsChange}
                          className='border-t border-stroke-soft-200 pt-5'
                        />
                      ) : null
                    }
                  />
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
