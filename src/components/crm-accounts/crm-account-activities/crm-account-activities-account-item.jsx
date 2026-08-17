import React from 'react';
import * as Tooltip from '@/components/ui/tooltip';
import { CrmAccountAvatar } from '../crm-account-avatar';
import { ActivityActionDisplay } from './activity-action-display';
import { activityUserDisplayName } from '@/utils/activity-user-display-name';

import AttachmentList from '@/components/ui/attachment-list';

// ── Render action (uses shared ActivityActionDisplay) ───────────────────────────
function ActionContent({ activity }) {
  return (
    <ActivityActionDisplay
      action={activity.action ?? ''}
      field={activity.field ?? ''}
      className='text-paragraph-sm text-text-sub-500'
    />
  );
}

// ── Legacy ChangeRow (changes array without action — build action from field/from/to) ─────────
const ChangeRow = ({ change }) => {
  const rawField = change.field ?? '';
  const fieldName = rawField.replace(/\s+changed\s+to\s*$/i, '').trim() || rawField;
  const action =
    change.action ??
    (change.from != null && change.to != null
      ? `${fieldName} changes to \`${change.from}\` → \`${change.to}\``
      : rawField);
  return <ActionContent activity={{ action, field: fieldName }} />;
};

// ── User chip (avatar + name) with optional tooltip (name only) ───────────────
const UserChip = ({ user, showTooltip }) => {
  const userName = activityUserDisplayName(user, '');

  const chip = (
    <div className='inline-flex shrink-0 items-center gap-1.5'>
      <CrmAccountAvatar
        name={userName}
        image={user?.image ?? user?.user_image}
        size={24}
        className='shrink-0'
      />
      <span className='text-paragraph-sm text-text-sub-500'>{userName}</span>
    </div>
  );

  if (showTooltip && (user?.name || user?.email)) {
    return (
      <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <div className='-mx-1 -my-0.5 w-fit cursor-default rounded px-1 py-0.5 transition-colors hover:bg-bg-weak-100'>
              {chip}
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content size='small' variant='light' side='top'>
            <span className='font-medium text-text-strong-500'>{userName}</span>
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  return chip;
};

// ── Main component ──────────────────────────────────────────────────────────────
const CrmAccountActivitiesAccountItem = ({ activity, showUserDetails = false }) => {
  const hasApiFormat = activity.action != null;

  const timestamp =
    activity.timestamp ??
    (activity.creation
      ? new Date(activity.creation).toLocaleString(undefined, {
          day: 'numeric',
          month: 'short',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '');

  if (hasApiFormat) {
    const user = activity.user ?? {};
    const hasUser = user.name || user.email;
    const userName = activityUserDisplayName(user, '');
    const attachments = Array.isArray(activity.attachments) ? activity.attachments : [];

    const actionContent = (
      <div className='flex flex-col gap-1 min-w-0'>
        <ActionContent activity={activity} />

        {attachments.length > 0 && (
          <div className='mt-2 w-full max-w-[560px]'>
            <AttachmentList attachments={attachments} />
          </div>
        )}
      </div>
    );

    const rowContent = (
      <div className='flex items-start justify-between gap-4 py-1'>
        <div className='flex items-center gap-2 min-w-0 flex-wrap'>
          {showUserDetails && hasUser ? (
            <>
              <UserChip user={user} showTooltip />
              {actionContent}
            </>
          ) : (
            actionContent
          )}
        </div>
        {timestamp && (
          <span className='text-paragraph-xs text-text-soft-400 shrink-0 pt-0.5'>{timestamp}</span>
        )}
      </div>
    );

    if (hasUser && !showUserDetails) {
      return (
        <Tooltip.Provider delayDuration={300}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div className='cursor-default rounded px-0.5 -mx-0.5 py-0.5 -my-0.5 hover:bg-bg-weak-100 transition-colors'>
                {rowContent}
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content size='small' variant='light' side='top'>
              <div className='flex items-center gap-2'>
                <CrmAccountAvatar
                  name={userName}
                  image={user?.image ?? user?.user_image}
                  size={24}
                  className='shrink-0'
                />
                <span>Changed by {userName}</span>
              </div>
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      );
    }

    return rowContent;
  }

  const changes = activity.changes ?? [];
  const change = changes[0];
  if (!change) return null;

  return (
    <div className='flex items-start justify-between gap-4 py-1'>
      <div className='flex flex-col gap-1 min-w-0'>
        <ChangeRow change={change} />
      </div>
      {timestamp && (
        <span className='text-paragraph-xs text-text-soft-400 shrink-0 pt-0.5'>{timestamp}</span>
      )}
    </div>
  );
};

export default CrmAccountActivitiesAccountItem;
