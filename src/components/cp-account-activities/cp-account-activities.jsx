import React, { useState, useMemo, useEffect } from 'react';
import CpAccountActivitiesToolbar from './cp-account-activities-toolbar';
import CrmAccountActivitiesGroup from '@/components/crm-accounts/crm-account-activities/crm-account-activities-group';
import { getCpAccountActivities } from '@/services/activities-service';

const DEFAULT_OPTIONS = {
  activity_filter_options: [
    { value: 'all', label: 'All Activities' },
    { value: 'account', label: 'Account' },
    { value: 'task', label: 'Task' },
  ],
  time_frame_options: [
    { value: 'all', label: 'All Time Periods' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7', label: 'Last 7 Days' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'older', label: 'Older' },
  ],
};

/** Resolve activity type: API uses activity_type "entity", UI uses "account". */
const getActivityType = (a) => {
  const t = a.type ?? a.activity_type;
  return t === 'entity' ? 'account' : t;
};

const CpAccountActivities = ({ cpAccountId }) => {
  const [filterBy, setFilterBy] = useState('all');
  const [timePeriod, setTimePeriod] = useState('all');
  const [showUserDetails, setShowUserDetails] = useState(false);

  const [apiData, setApiData] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    if (!cpAccountId) {
      setApiData(null);
      setApiError(null);
      return;
    }

    setApiLoading(true);
    setApiError(null);

    const activityType = filterBy !== 'all' ? filterBy : undefined;
    const timeFrame = timePeriod !== 'all' ? timePeriod : undefined;

    getCpAccountActivities(cpAccountId, { activityType, timePeriod: timeFrame })
      .then((result) => {
        if (result.error) {
          setApiError(result.error);
          setApiData(null);
          return;
        }

        const groups = result.data?.activityGroups ?? [];
        const filterOptions =
          result.data?.activityFilterOptions ?? DEFAULT_OPTIONS.activity_filter_options;
        const timeFrameOptions =
          result.data?.timeFrameOptions ?? DEFAULT_OPTIONS.time_frame_options;

        setApiData({
          groups,
          activity_filter_options: filterOptions,
          time_frame_options: timeFrameOptions,
        });
        setApiError(null);
      })
      .catch((error) => {
        setApiError(error.message || 'Failed to load activities.');
        setApiData(null);
      })
      .finally(() => setApiLoading(false));
  }, [cpAccountId, filterBy, timePeriod]);

  const api = apiData ?? { groups: [], ...DEFAULT_OPTIONS };
  const groups = api.groups;
  const filterOpts = api.activity_filter_options;
  const timeOpts = api.time_frame_options;

  const filteredGroups = useMemo(() => {
    let result = groups;

    // Filter by time period (group ids: today, yesterday, last7, thisMonth, older)
    if (timePeriod !== 'all') {
      result = result.filter((g) => g.id === timePeriod);
    }

    // Filter by activity type (entity -> account)
    if (filterBy !== 'all') {
      result = result
        .map((group) => ({
          ...group,
          activities: (group.activities || []).filter((a) => getActivityType(a) === filterBy),
        }))
        .filter((group) => (group.activities?.length ?? 0) > 0);
    }

    // Hide time frames that have no activities
    return result.filter((group) => (group.activities?.length ?? 0) > 0);
  }, [groups, filterBy, timePeriod]);

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <CpAccountActivitiesToolbar
        filterBy={filterBy}
        onFilterByChange={setFilterBy}
        timePeriod={timePeriod}
        onTimePeriodChange={setTimePeriod}
        filterOptions={filterOpts}
        timeFrameOptions={timeOpts}
        showUserDetails={showUserDetails}
        onShowUserDetailsChange={setShowUserDetails}
      />

      <div className='flex-1 overflow-y-auto px-6 py-2'>
        {apiLoading ? (
          <div className='flex flex-col items-center justify-center py-20 text-center'>
            <p className='text-paragraph-sm text-text-sub-500'>Loading activities...</p>
          </div>
        ) : apiError ? (
          <div className='flex flex-col items-center justify-center py-20 text-center'>
            <p className='text-label-sm text-error-base'>{apiError}</p>
          </div>
        ) : filteredGroups.length > 0 ? (
          <div className='flex flex-col gap-6'>
            {filteredGroups.map((group) => (
              <CrmAccountActivitiesGroup
                key={group.id}
                group={group}
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

export default CpAccountActivities;
