import React, { useState } from 'react';
import {
  RiCalendarLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCheckLine,
  RiCloseLine,
} from 'react-icons/ri';
import * as LinkButton from '@/components/ui/link-button';
import CrmAccountActivitiesAccountItem from '@/components/crm-accounts/crm-account-activities/crm-account-activities-account-item';
import CrmActivitiesTaskItem from '@/components/crm-tasks/crm-activities-task-item';
import CrmAccountActivitiesEmailItem from '@/components/crm-accounts/crm-account-activities/crm-account-activities-email-item';
import CrmActivitiesCallItem from '@/components/crm-activities/crm-activities-call-item';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';

/** Normalize TruePulse / Info Call Status for timeline icons. */
const getCallStatusKind = (activity) => {
  const raw = String(
    activity?.call?.call_status || activity?.info_call_status || activity?.call_status || '',
  )
    .trim()
    .toLowerCase();
  if (['answered', 'connected', 'completed'].includes(raw)) return 'answered';
  if (['missed', 'no answer', 'not answered', 'busy', 'voicemail'].includes(raw)) return 'missed';
  return 'unknown';
};

const INITIAL_VISIBLE = 2;

const renderCrmAccountAvatar = ({ displayName, user }) => (
  <CrmAccountAvatar
    name={displayName}
    image={user?.image ?? user?.user_image}
    size={24}
    className='shrink-0'
  />
);

/** API returns activity_type "entity"; map to entityType (account/contact/lead). */
const getActivityType = (activity, entityType) => {
  const t = activity.type ?? activity.activity_type;
  if (t === 'entity') return entityType;
  return t ?? '';
};

const normalizeTaskActivity = (activity) => {
  const history = activity.history ?? [];
  const comments = activity.comments ?? [];
  const allTimes = [...history.map((h) => h.creation), ...comments.map((c) => c.creation)].filter(
    Boolean,
  );
  const latestCreation = allTimes.length > 0 ? [...allTimes].sort().pop() : activity.creation;
  const timestamp = latestCreation
    ? new Date(latestCreation).toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const changes = history.map((h, i) => {
    const field = h.field ?? '';
    let changeType = 'text';
    if (/status/i.test(field)) changeType = 'status';
    else if (/priority/i.test(field)) changeType = 'priority';
    return {
      id: h.name ?? `hist-${i}`,
      changeType,
      field: field ? `${field} changed to` : 'Updated',
      from: h.from,
      to: h.to,
      action: h.action,
      user: h.user,
      creation: h.creation ?? null,
      timestamp: h.creation
        ? new Date(h.creation).toLocaleString(undefined, {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })
        : null,
    };
  });

  return {
    ...activity,
    type: 'task',
    id: activity.task_name ?? activity.id,
    title: activity.subject ?? activity.title,
    status: activity.status,
    timestamp,
    changes,
    comments,
    defaultExpanded: activity.defaultExpanded ?? false,
  };
};

const ActivityItem = ({ activity, entityType, renderAvatar, showUserDetails }) => {
  const type = getActivityType(activity, entityType);
  if (type === entityType) {
    return (
      <CrmAccountActivitiesAccountItem
        activity={{ ...activity, type }}
        showUserDetails={showUserDetails}
      />
    );
  }
  if (type === 'task') {
    const normalized = normalizeTaskActivity(activity);
    return (
      <CrmActivitiesTaskItem
        activity={normalized}
        renderAvatar={renderAvatar}
        showUserDetails={showUserDetails}
      />
    );
  }
  if (type === 'email') {
    return <CrmAccountActivitiesEmailItem activity={{ ...activity, type }} />;
  }
  if (type === 'call') {
    return <CrmActivitiesCallItem activity={activity} />;
  }
  return null;
};

const TimelineDot = ({ type, entityType, activity }) => {
  if (type === 'call') {
    const kind = getCallStatusKind(activity);
    if (kind === 'answered') {
      return (
        <div className='relative z-10 mt-2 flex h-4 w-4 items-center justify-center shrink-0 bg-bg-white-0'>
          <div className='flex h-4 w-4 items-center justify-center rounded-full bg-success-base text-white'>
            <RiCheckLine size={10} className='shrink-0' strokeWidth={2} />
          </div>
        </div>
      );
    }
    if (kind === 'missed') {
      return (
        <div className='relative z-10 mt-2 flex h-4 w-4 items-center justify-center shrink-0 bg-bg-white-0'>
          <div className='flex h-4 w-4 items-center justify-center rounded-full bg-error-base text-white'>
            <RiCloseLine size={10} className='shrink-0' strokeWidth={2} />
          </div>
        </div>
      );
    }
    return (
      <div className='relative z-10 mt-2 flex h-4 w-4 items-center justify-center shrink-0 bg-bg-white-0'>
        <div className='flex h-4 w-4 items-center justify-center rounded-full bg-warning-base text-white'>
          <span className='text-[10px] font-bold leading-none'>!</span>
        </div>
      </div>
    );
  }

  if (type === entityType) {
    return (
      <div className='relative z-10 mt-2 flex h-4 w-4 items-center justify-center shrink-0 bg-bg-white-0'>
        <div className='h-1.5 w-1.5 rounded-full bg-stroke-sub-300' />
      </div>
    );
  }
  return (
    <div className='relative z-10 mt-2 flex h-4 w-4 items-center justify-center shrink-0 bg-bg-white-0'>
      <div className='h-2 w-2 rounded-full border-2 border-stroke-sub-300 bg-white' />
    </div>
  );
};

const OlderActivitiesToggle = ({ count, expanded, onToggle }) => (
  <LinkButton.Root onClick={onToggle} size='small' variant='primary'>
    {expanded ? (
      <>
        Hide older activities <RiArrowUpSLine className='w-4 h-4' />
      </>
    ) : (
      <>
        Show {count} older {count === 1 ? 'activity' : 'activities'}{' '}
        <RiArrowDownSLine className='w-4 h-4' />
      </>
    )}
  </LinkButton.Root>
);

const CrmEntityActivitiesGroup = ({ group, entityType = 'account', showUserDetails = false }) => {
  const { label, activities } = group;
  const [showAll, setShowAll] = useState(false);
  const hasMore = activities.length > INITIAL_VISIBLE;
  const visibleActivities = hasMore && !showAll ? activities.slice(0, INITIAL_VISIBLE) : activities;
  const olderCount = activities.length - INITIAL_VISIBLE;

  return (
    <div className='flex flex-col gap-0'>
      <div className='flex items-center gap-2 py-3'>
        <RiCalendarLine size={16} className='text-text-soft-400 shrink-0' />
        <span className='text-label-sm font-semibold text-text-sub-500'>{label}</span>
      </div>

      <div className='relative flex flex-col'>
        <div
          className='absolute left-[7px] z-0 w-px bg-stroke-soft-200'
          style={{ top: '18px', bottom: '24px' }}
        />

        {visibleActivities.map((activity) => (
          <div
            key={
              activity.id ??
              activity.name ??
              activity.task_name ??
              `act-${activity.creation ?? Math.random()}`
            }
            className='relative z-10 flex gap-3 py-2 first:pt-0 last:pb-0'
          >
            <TimelineDot
              type={getActivityType(activity, entityType)}
              entityType={entityType}
              activity={activity}
            />
            <div className='flex-1 min-w-0'>
              <ActivityItem
                activity={activity}
                entityType={entityType}
                renderAvatar={renderCrmAccountAvatar}
                showUserDetails={showUserDetails}
              />
            </div>
          </div>
        ))}

        {hasMore && (
          <div className='flex gap-3 py-2 pl-7'>
            <OlderActivitiesToggle
              count={olderCount}
              expanded={showAll}
              onToggle={() => setShowAll((v) => !v)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CrmEntityActivitiesGroup;
