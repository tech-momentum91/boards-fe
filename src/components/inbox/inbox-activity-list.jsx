import React, { useState } from 'react';
import {
  RiMailOpenLine,
  RiMailUnreadLine,
  RiCheckDoubleLine,
  RiRestartLine,
  RiCalendarLine,
} from 'react-icons/ri';
import { getNotificationIconConfig, getSubmoduleConfig } from '@/constants/notification-triggers';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import { ActivityActionDisplay } from '@/components/crm-accounts/crm-account-activities/activity-action-display';
import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';
import { SVG_MAP } from '@/components/ticket-management/status-dropdown';
import { formatInboxDateTime } from '@/utils/date-utils';
import { cn } from '@/utils/cn';
import { STATUS_PILL_STYLES, DEFAULT_PILL_STYLE } from './inbox-constants';
import InboxSnoozePopover from './inbox-snooze-popover';

/** Normalize status for pill lookup: uppercase and remove spaces (e.g. "In Progress" → "INPROGRESS") */
function getStatusPillKey(status) {
  if (status == null || typeof status !== 'string') return '';
  return status.toUpperCase().replaceAll(/\s+/g, '');
}

function StatusPill({ status }) {
  const styleKey = getStatusPillKey(status);
  const style = STATUS_PILL_STYLES[styleKey] ?? DEFAULT_PILL_STYLE;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-label-xs font-medium',
        style,
      )}
    >
      {status ?? ''}
    </span>
  );
}

/** Avoid repeating the actor name when avatar + name are shown separately. */
function stripLeadingActor(text, actor) {
  if (!text || !actor || typeof text !== 'string') return text;
  const prefix = `${actor} `;
  if (text.startsWith(prefix)) return text.slice(prefix.length);
  return text;
}

/** @deprecated Use getNotificationIconConfig(item) for trigger + status-wise icon */
const statusIconClass = {
  blue: { bg: 'bg-information-lighter', icon: 'text-information-base' },
  orange: { bg: 'bg-warning-lighter', icon: 'text-warning-base' },
  gray: { bg: 'bg-bg-weak-100', icon: 'text-text-soft-400' },
};

/**
 * Dynamic Today-style row: circular status icon (blue/orange), description, avatar+text, count, time.
 * On hover: Mark as read, Snooze, Clear action buttons.
 */
export const InboxTodayRow = ({
  item,
  onClick,
  onMarkAsRead,
  onSnooze,
  onUnsnooze,
  onClear,
  isClearedTab,
  isLaterTab,
  onUnclear,
  openSnoozeId = null,
  onSnoozeOpenChange,
}) => {
  const {
    id,
    doctype,
    triggerType,
    statusType,
    submodule,
    primaryText,
    secondaryText,
    secondaryStatusFrom,
    secondaryStatusTo,
    assigneeAvatarUrl,
    assigneeInitials,
    count,
    time,
    createdAt,
    markAsRead,
    secondaryDisplay,
    secondaryIcon,
    displayTime,
    activityField = '',
    activityMessage = '',
    activityActorName = '',
  } = item;
  const hasStatusPills = secondaryStatusFrom != null && secondaryStatusTo != null;
  const isStatusActivity = secondaryIcon === 'status' || hasStatusPills;
  // When showing status pills, show secondary text only up to " from" so we don't repeat the from-status
  const secondaryTextForStatus =
    hasStatusPills && secondaryText && typeof secondaryText === 'string'
      ? (() => {
          const fromIdx = secondaryText.indexOf(' from ');
          return fromIdx >= 0 ? secondaryText.slice(0, fromIdx + ' from'.length) : secondaryText;
        })()
      : secondaryText;
  // Prefer "to" status for trigger icon so it reflects the current/new state
  const statusSvg =
    (secondaryStatusTo && SVG_MAP[secondaryStatusTo]) ||
    (secondaryStatusFrom && SVG_MAP[secondaryStatusFrom]) ||
    null;

  const iconCfg = getNotificationIconConfig(item);
  const cfg = { bg: iconCfg.iconBg, icon: iconCfg.iconColor };
  const TriggerIcon = iconCfg.Icon;
  const secondaryIconKey =
    !isStatusActivity && secondaryDisplay !== 'assignee' && (secondaryDisplay || submodule)
      ? secondaryDisplay || submodule
      : null;
  const secondaryIconCfg = secondaryIconKey ? getSubmoduleConfig(secondaryIconKey) : null;
  const SecondaryIcon = secondaryIconCfg?.Icon;

  const showAssigneeAvatar = Boolean(assigneeAvatarUrl || assigneeInitials);
  const statusLeadText = hasStatusPills
    ? stripLeadingActor(secondaryTextForStatus, activityActorName)
    : secondaryTextForStatus;
  const showTaggedActivity =
    !hasStatusPills && typeof activityMessage === 'string' && activityMessage.length > 0;
  const isSnoozed = item?.raw?.snoozed === 1 || item?.raw?.snoozed === true;
  const isSnoozeOpen = openSnoozeId === id;
  const handleRowMouseEnter = () => {
    if (openSnoozeId != null && openSnoozeId !== id) onSnoozeOpenChange?.(null);
  };
  // Format display time: if createdAt is present, use inbox formatter (e.g. "17th Feb 26"), otherwise fall back to provided displayTime/time
  const displayTimeText = createdAt
    ? formatInboxDateTime(createdAt)
    : displayTime
      ? formatInboxDateTime(displayTime)
      : time || '\u00A0';

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={() => onClick?.(id)}
      onMouseEnter={handleRowMouseEnter}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(id);
        }
      }}
      className={cn(
        'group flex cursor-pointer items-center gap-3 bg-bg-white-0 px-4 py-3 transition-colors hover:bg-bg-weak-50',
        'rounded-2xl shadow-regular-xs',
        markAsRead ? 'border-0' : 'border-[0.5px] border-stroke-soft-200/60',
      )}
      style={markAsRead ? { backgroundColor: '#f7f8fa' } : undefined}
    >
      <div className='flex shrink-0 items-center justify-center'>
        {isStatusActivity ? (
          statusSvg ? (
            <div className='flex items-center justify-center' aria-hidden>
              {statusSvg}
            </div>
          ) : (
            <TriggerIcon
              size={16}
              className={cfg.icon}
              aria-hidden
              {...(iconCfg.iconProps ?? {})}
            />
          )
        ) : (
          <TriggerIcon size={16} className={cfg.icon} aria-hidden {...(iconCfg.iconProps ?? {})} />
        )}
      </div>

      <span
        className={cn(
          'label-small w-[280px] min-w-0 shrink-0 truncate',
          markAsRead ? 'text-text-sub-500' : 'text-text-main-900',
        )}
      >
        {primaryText}
      </span>

      <div className='flex min-w-0 flex-1 items-center gap-2 overflow-hidden pl-40'>
        {SecondaryIcon ? (
          <div
            className='flex size-6 shrink-0 items-center justify-center rounded-full border-[0.75px] border-stroke-soft-200 shadow-regular-xs'
            aria-hidden
          >
            <SecondaryIcon size={16} className='text-text-sub-600' />
          </div>
        ) : null}
        {showAssigneeAvatar ? (
          <CrmAccountAvatar
            name={activityActorName || assigneeInitials || 'User'}
            image={assigneeAvatarUrl || null}
            size={24}
            className='shrink-0'
          />
        ) : null}
        {secondaryText || hasStatusPills || showTaggedActivity ? (
          <span
            className={cn(
              'paragraph-small flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-hidden',
              markAsRead ? 'text-text-sub-500' : 'text-text-main-900',
            )}
          >
            {hasStatusPills ? (
              <>
                {activityActorName ? (
                  <span
                    className={cn(
                      'shrink-0 font-medium',
                      markAsRead ? 'text-text-sub-500' : 'text-text-strong-950',
                    )}
                  >
                    {activityActorName}
                  </span>
                ) : null}
                {statusLeadText ? <span className='min-w-0 truncate'>{statusLeadText}</span> : null}
                <StatusPill status={secondaryStatusFrom} />
                <span className='shrink-0' aria-hidden>
                  →
                </span>
                <StatusPill status={secondaryStatusTo} />
              </>
            ) : showTaggedActivity ? (
              <>
                {activityActorName ? (
                  <span
                    className={cn(
                      'shrink-0 font-medium',
                      markAsRead ? 'text-text-sub-500' : 'text-text-strong-950',
                    )}
                  >
                    {activityActorName}
                  </span>
                ) : null}
                <ActivityActionDisplay
                  action={activityMessage}
                  field={activityField}
                  singleLine
                  className={cn(markAsRead ? 'text-text-sub-500' : 'text-text-main-900')}
                />
              </>
            ) : (
              <span className='min-w-0 truncate'>{secondaryText}</span>
            )}
          </span>
        ) : null}
      </div>

      <div className='relative flex shrink-0 items-center justify-end gap-2'>
        {/* Default: count column (fixed) + time column (fixed) for alignment */}
        <div className='flex items-center gap-3 opacity-100 transition-opacity group-hover:pointer-events-none group-hover:opacity-0'>
          <span className='flex w-8 shrink-0 justify-end'>
            {count != null && count !== 0 ? (
              <span className='inline-flex size-6 items-center justify-center rounded-full bg-bg-weak-100 paragraph-small text-text-sub-600'>
                {count}
              </span>
            ) : null}
          </span>
          <span className='paragraph-small w-24 shrink-0 text-right text-text-sub-500'>
            {displayTimeText}
          </span>
        </div>

        {/* Hover: action buttons */}
        <div className='pointer-events-none absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-2 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100'>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='xsmall'
                className='size-8 rounded-lg p-0'
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead?.(id);
                }}
              >
                {markAsRead ? (
                  <RiMailUnreadLine size={18} className='text-text-sub-600' />
                ) : (
                  <RiMailOpenLine size={18} className='text-text-sub-600' />
                )}
              </Button.Root>
            </Tooltip.Trigger>
            <Tooltip.Content size='small' variant='dark'>
              <p>{markAsRead ? 'Mark as unread' : 'Mark as read'}</p>
            </Tooltip.Content>
          </Tooltip.Root>
          {isClearedTab ? (
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='xsmall'
              className='gap-1.5 rounded-lg'
              onClick={(e) => {
                e.stopPropagation();
                onUnclear?.(id);
              }}
            >
              <Button.Icon>
                <RiRestartLine size={16} className='transform rotate-90' />
              </Button.Icon>
              Unclear
            </Button.Root>
          ) : (
            <>
              <InboxSnoozePopover
                onSnooze={(optionValue) => onSnooze?.(id, optionValue)}
                onUnsnooze={() => onUnsnooze?.(id)}
                isSnoozed={isSnoozed}
                open={isSnoozeOpen}
                onOpenChange={(open) => onSnoozeOpenChange?.(open ? id : null)}
                triggerClassName='size-8 rounded-lg p-0'
              />

              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='xsmall'
                className='gap-1.5 rounded-lg'
                onClick={(e) => {
                  e.stopPropagation();
                  onClear?.(id);
                }}
              >
                <Button.Icon>
                  <RiCheckDoubleLine size={16} />
                </Button.Icon>
                Clear
              </Button.Root>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/** Section label shown above the bordered list card (not inside the card). */
const InboxActivityHeader = ({ title, icon: Icon = RiCalendarLine }) => (
  <div className='flex items-center gap-2 px-0.5 pt-0.5'>
    <h2 className='text-label-sm font-medium leading-5 tracking-[-0.084px] text-text-strong-950'>
      {title}
    </h2>
  </div>
);

const InboxActivityList = ({
  title = 'Today',
  items = [],
  onItemClick,
  onMarkAsRead,
  onSnooze,
  onUnsnooze,
  onClear,
  onUnclear,
  isClearedTab = false,
  isLaterTab = false,
  emptyMessage,
  className,
  showHeader = true,
}) => {
  const [openSnoozeId, setOpenSnoozeId] = useState(null);
  const hasItems = items?.length > 0;
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {showHeader && <InboxActivityHeader title={title} />}
      <section className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-weak-100'>
        {hasItems ? (
          <div className='flex flex-col gap-[0.5px] p-1'>
            {items.map((item) => (
              <InboxTodayRow
                key={item.id}
                item={item}
                onClick={onItemClick}
                onMarkAsRead={onMarkAsRead}
                onSnooze={onSnooze}
                onUnsnooze={onUnsnooze}
                onClear={onClear}
                onUnclear={onUnclear}
                isClearedTab={isClearedTab}
                isLaterTab={isLaterTab}
                openSnoozeId={openSnoozeId}
                onSnoozeOpenChange={setOpenSnoozeId}
              />
            ))}
          </div>
        ) : (
          <div className='py-8 text-center paragraph-small text-text-sub-500'>
            {emptyMessage ?? 'No items'}
          </div>
        )}
      </section>
    </div>
  );
};

export default InboxActivityList;
