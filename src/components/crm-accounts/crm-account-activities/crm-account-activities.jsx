import React, { useState, useMemo } from 'react';
import CrmAccountActivitiesToolbar from './crm-account-activities-toolbar';
import CrmAccountActivitiesGroup from './crm-account-activities-group';

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

const CrmAccountActivities = ({
  activityGroups,
  activityFilterOptions,
  timeFrameOptions,
  /** Full API response from get_crm_entity_activities */
  data,
}) => {
  const api = data ?? { groups: [], ...DEFAULT_OPTIONS };
  const groups = activityGroups ?? api.groups;
  const filterOpts = activityFilterOptions ?? api.activity_filter_options;
  const timeOpts = timeFrameOptions ?? api.time_frame_options;

  const [filterBy, setFilterBy] = useState('all');
  const [timePeriod, setTimePeriod] = useState('all');
  const [showUserDetails, setShowUserDetails] = useState(false);

  // Filter logic — API group ids: today, yesterday, last7, thisMonth, older
  const filteredGroups = useMemo(() => {
    let result = groups;

    // Filter by time period
    if (timePeriod !== 'all') {
      result = result.filter((g) => g.id === timePeriod);
    }

    // Filter by activity type (entity -> account)
    if (filterBy !== 'all') {
      result = result
        .map((group) => ({
          ...group,
          activities: group.activities.filter((a) => getActivityType(a) === filterBy),
        }))
        .filter((group) => (group.activities?.length ?? 0) > 0);
    }

    // Hide time frames that have no activities
    return result.filter((group) => (group.activities?.length ?? 0) > 0);
  }, [groups, filterBy, timePeriod]);

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <CrmAccountActivitiesToolbar
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
        {filteredGroups.length > 0 ? (
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

export default CrmAccountActivities;
