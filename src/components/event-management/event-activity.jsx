import React, { useMemo, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CrmEntityActivitiesToolbar from '@/components/crm-activities/crm-entity-activities-toolbar';
import CrmEntityActivitiesGroup from '@/components/crm-activities/crm-entity-activities-group';
import {
  EVENT_ACTIVITY_DEFAULT_FILTER_OPTIONS,
  EVENT_ACTIVITY_DEFAULT_TIME_FRAME_OPTIONS,
} from '@/components/event-management/constant';
import { getActivityType } from '@/components/event-management/event-helpers';
import { fetchEventActivitiesThunk, selectEventActivities } from '@/redux/eventsSlice';

const EventActivity = ({ eventId }) => {
  const dispatch = useDispatch();
  const eventActivitiesState = useSelector(selectEventActivities);
  const { data, isLoading: loading, error } = eventActivitiesState || {};
  const [filterBy, setFilterBy] = useState('all');
  const [timePeriod, setTimePeriod] = useState('all');
  const [showUserDetails, setShowUserDetails] = useState(false);

  const api = data ?? null;
  const groups = api?.groups ?? [];

  const filterOpts = api?.activity_filter_options?.length
    ? api.activity_filter_options
    : EVENT_ACTIVITY_DEFAULT_FILTER_OPTIONS;

  const timeOpts = api?.time_frame_options?.length
    ? api.time_frame_options
    : EVENT_ACTIVITY_DEFAULT_TIME_FRAME_OPTIONS;

  useEffect(() => {
    if (!eventId) return;
    dispatch(
      fetchEventActivitiesThunk({
        event: eventId,
        activityFilter: filterBy,
        timeFrame: timePeriod,
      }),
    );
  }, [dispatch, eventId, filterBy, timePeriod]);

  const filteredGroups = useMemo(() => {
    let result = groups;
    if (timePeriod !== 'all') {
      result = result.filter((g) => g.id === timePeriod);
    }
    if (filterBy !== 'all') {
      result = result
        .map((group) => ({
          ...group,
          activities: group.activities.filter((a) => getActivityType(a) === filterBy),
        }))
        .filter((group) => (group.activities?.length ?? 0) > 0);
    }
    return result.filter((group) => (group.activities?.length ?? 0) > 0);
  }, [groups, filterBy, timePeriod]);

  if (loading) {
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
                entityType='event'
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
    </div>
  );
};

export default EventActivity;
