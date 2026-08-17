import React, { useState, useMemo, useEffect } from 'react';
import CpContactActivitiesToolbar from './cp-contact-activities-toolbar';
import CrmAccountActivitiesGroup from '@/components/crm-accounts/crm-account-activities/crm-account-activities-group';
import { getCpContactActivities } from '@/services/activities-service';

const DEFAULT_OPTIONS = {
  activity_filter_options: [
    { value: 'all', label: 'All Activities' },
    { value: 'contact', label: 'Contact Changes' },
    { value: 'task', label: 'Tasks' },
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

const CpContactActivities = ({ cpContactId, activityGroups: propActivityGroups }) => {
  const [filterBy, setFilterBy] = useState('all');
  const [timePeriod, setTimePeriod] = useState('all');
  const [apiData, setApiData] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const activityGroups = propActivityGroups ?? (cpContactId ? null : []);

  useEffect(() => {
    if (!cpContactId) {
      setApiData(null);
      setApiError(null);
      return;
    }
    setApiLoading(true);
    setApiError(null);
    // API expects activity_filter: "all" | "cp_contact" | "task"
    const activityType =
      filterBy === 'all' ? undefined : filterBy === 'contact' ? 'cp_contact' : filterBy;
    const timePeriodParam = timePeriod !== 'all' ? timePeriod : undefined;
    getCpContactActivities(cpContactId, { activityType, timePeriod: timePeriodParam })
      .then((result) => {
        if (result.error) {
          setApiError(result.error);
          setApiData(null);
        } else {
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
        }
      })
      .catch((error) => {
        setApiError(error.message || 'Failed to load activities.');
        setApiData(null);
      })
      .finally(() => setApiLoading(false));
  }, [cpContactId, filterBy, timePeriod]);

  const api = apiData ?? { groups: [], ...DEFAULT_OPTIONS };
  const sourceGroups = cpContactId ? api.groups : activityGroups;
  const filterOpts = api.activity_filter_options;
  const timeOpts = api.time_frame_options;

  /** Normalize activity type for filtering (entity/cp_contact → contact). */
  const getActivityType = (a) => {
    const t = a.type ?? a.activity_type;
    return t === 'entity' || t === 'cp_contact' ? 'contact' : t;
  };

  /** API returns filter value "cp_contact"; we treat it as "contact" for display/filtering. */
  const filterTypeForComparison = filterBy === 'cp_contact' ? 'contact' : filterBy;

  const filteredGroups = useMemo(() => {
    let groups = sourceGroups || [];

    if (!cpContactId && timePeriod !== 'all') {
      const periodMap = {
        today: 'today',
        yesterday: 'yesterday',
        last7: 'last-7-days',
        thisMonth: 'this-month',
      };
      const targetId = periodMap[timePeriod];
      groups = groups.filter((g) => g.id === targetId);
    }
    if (cpContactId && timePeriod !== 'all') {
      groups = groups.filter((g) => g.id === timePeriod);
    }

    if (filterBy !== 'all') {
      groups = groups
        .map((group) => ({
          ...group,
          activities: (group.activities || []).filter(
            (a) => getActivityType(a) === filterTypeForComparison,
          ),
        }))
        .filter((group) => (group.activities?.length ?? 0) > 0);
    }

    return groups.filter((group) => (group.activities?.length ?? 0) > 0);
  }, [sourceGroups, cpContactId, filterBy, timePeriod, filterTypeForComparison]);

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <CpContactActivitiesToolbar
        filterBy={filterBy}
        onFilterByChange={setFilterBy}
        timePeriod={timePeriod}
        onTimePeriodChange={setTimePeriod}
        filterOptions={filterOpts}
        timeFrameOptions={timeOpts}
      />

      <div className='flex-1 overflow-y-auto px-6 py-2'>
        {apiLoading ? (
          <div className='flex flex-col items-center justify-center h-full py-20 text-center'>
            <p className='text-label-sm text-text-sub-500'>Loading activities...</p>
          </div>
        ) : apiError ? (
          <div className='flex flex-col items-center justify-center h-full py-20 text-center'>
            <p className='text-label-sm text-text-sub-500'>{apiError}</p>
          </div>
        ) : filteredGroups.length > 0 ? (
          <div className='flex flex-col gap-6'>
            {filteredGroups.map((group) => (
              <CrmAccountActivitiesGroup
                key={group.id}
                group={group}
                entityType='contact'
                showUserDetails={false}
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

export default CpContactActivities;
