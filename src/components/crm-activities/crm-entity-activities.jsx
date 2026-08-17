import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { addCrmEntityComment, getCrmEntityActivities } from '@/api/crmActivity';
import CrmEntityActivitiesToolbar from './crm-entity-activities-toolbar';
import CrmEntityActivitiesGroup from './crm-entity-activities-group';
import CommentInput from '@/components/ui/comment-input';
import { useMentionSearch } from '@/hooks/use-mention-search';

const DEFAULT_TIME_FRAME_OPTIONS = [
  { value: 'all', label: 'All Time Periods' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'thisMonth', label: 'Earlier This Month' },
  { value: 'older', label: 'Older' },
];

const normalizeTimeFrameOptions = (options) =>
  (Array.isArray(options) ? options : []).map((option) =>
    option?.value === 'thisMonth' ? { ...option, label: 'Earlier This Month' } : option,
  );

/** Resolve activity type: API uses activity_type "entity", UI uses entityType (account/contact/lead). */
const getActivityType = (a, entityType) => {
  const t = a.type ?? a.activity_type;
  if (t === 'entity') return entityType;
  return t ?? '';
};

const CrmEntityActivities = ({
  activityType,
  activityId,
  /** Override data (e.g. for testing); when set, skips API fetch */
  data: overrideData,
}) => {
  const [data, setData] = useState(overrideData ?? null);
  const [loading, setLoading] = useState(!overrideData && !!activityId);
  const [error, setError] = useState(null);
  const [filterBy, setFilterBy] = useState('all');
  const [timePeriod, setTimePeriod] = useState('all');
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { searchMentions } = useMentionSearch();

  const api = overrideData ?? data ?? null;
  const groups = api?.groups ?? [];
  const entityLabel = activityType
    ? activityType.charAt(0).toUpperCase() + activityType.slice(1)
    : 'Account';
  const defaultFilterOpts = [
    { value: 'all', label: 'All Activities' },
    { value: activityType ?? 'account', label: entityLabel },
    { value: 'task', label: 'Task' },
  ];
  const filterOpts = api?.activity_filter_options?.length
    ? api.activity_filter_options
    : defaultFilterOpts;
  const timeOpts = api?.time_frame_options?.length
    ? normalizeTimeFrameOptions(api.time_frame_options)
    : DEFAULT_TIME_FRAME_OPTIONS;

  const fetchActivities = useCallback(async () => {
    if (overrideData || !activityType || !activityId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getCrmEntityActivities({
        activityType,
        activityId,
        activityFilter: filterBy,
        timeFrame: timePeriod,
      });
      setData(res);
    } catch (error_) {
      setError(error_?.message ?? error_ ?? 'Failed to load activities');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [overrideData, activityType, activityId, filterBy, timePeriod]);

  useEffect(() => {
    fetchActivities().catch(() => {});
  }, [fetchActivities]);

  const handleAddComment = async (content, attachments = []) => {
    if (overrideData || activityType !== 'lead' || !activityId) return;
    setIsSubmitting(true);
    try {
      await addCrmEntityComment({ activityType, activityId, content, attachments });
      await fetchActivities();
    } finally {
      setIsSubmitting(false);
    }
  };

  const timePeriodGroupIds = useMemo(() => {
    // Each period includes itself and all finer-grained periods
    const hierarchy = ['today', 'yesterday', 'last7', 'thisMonth', 'older'];
    if (timePeriod === 'all') return null;
    const idx = hierarchy.indexOf(timePeriod);
    if (idx === -1) return new Set([timePeriod]);
    return new Set(hierarchy.slice(0, idx + 1));
  }, [timePeriod]);

  const filteredGroups = useMemo(() => {
    let result = groups;
    if (timePeriodGroupIds !== null) {
      result = result.filter((g) => timePeriodGroupIds.has(g.id));
    }
    if (filterBy !== 'all') {
      result = result
        .map((group) => ({
          ...group,
          activities: group.activities.filter((a) => getActivityType(a, activityType) === filterBy),
        }))
        .filter((group) => (group.activities?.length ?? 0) > 0);
    }
    return result.filter((group) => (group.activities?.length ?? 0) > 0);
  }, [groups, filterBy, timePeriodGroupIds, activityType]);

  if (loading && !overrideData) {
    return (
      <div className='flex flex-1 flex-col overflow-hidden'>
        <div className='flex flex-1 items-center justify-center py-20'>
          <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary-base border-t-transparent' />
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <CrmEntityActivitiesToolbar
        filterBy={filterBy}
        onFilterByChange={setFilterBy}
        timePeriod={timePeriod}
        onTimePeriodChange={setTimePeriod}
        filterOptions={filterOpts}
        timeFrameOptions={timeOpts}
        showUserDetails={showUserDetails}
        onShowUserDetailsChange={setShowUserDetails}
      />

      <div className='flex-1 min-h-0 overflow-y-auto px-6 py-2'>
        {error && (
          <p className='text-paragraph-sm text-red-600 py-2' role='alert'>
            {error}
          </p>
        )}
        {filteredGroups.length > 0 ? (
          <div className='flex flex-col gap-6'>
            {filteredGroups.map((group) => (
              <CrmEntityActivitiesGroup
                key={group.id}
                group={group}
                entityType={activityType}
                showUserDetails={showUserDetails}
              />
            ))}
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center h-full py-20 text-center'>
            <p className='text-label-sm text-text-sub-500'>No activities found.</p>
            <p className='text-paragraph-sm text-text-soft-400 mt-1'>Try adjusting your filters.</p>
          </div>
        )}
      </div>

      {!overrideData && activityType === 'lead' && activityId && (
        <div className='pb-6 px-6 relative z-10 bg-white shrink-0'>
          <div
            className='absolute -top-10 left-0 right-0 h-10 bg-linear-to-t from-white to-transparent pointer-events-none'
            aria-hidden
          />
          <div className='w-full h-1 bg-white' aria-hidden />
          <CommentInput
            onSubmit={handleAddComment}
            isSubmitting={isSubmitting}
            placeholder='Add a comment...'
            showVisibleToClient={false}
            enableMentions
            onSearchMentions={searchMentions}
          />
        </div>
      )}
    </div>
  );
};

export default CrmEntityActivities;
