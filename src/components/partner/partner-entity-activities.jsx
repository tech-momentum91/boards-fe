import React, { useMemo, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CrmEntityActivitiesToolbar from '@/components/crm-activities/crm-entity-activities-toolbar';
import CrmEntityActivitiesGroup from '@/components/crm-activities/crm-entity-activities-group';
import {
  PARTNER_ACTIVITIES_DEFAULT_ACTIVITY_FILTER_OPTIONS,
  PARTNER_ACTIVITIES_DEFAULT_TIME_FRAME_OPTIONS,
} from '@/components/partner/constants';
import { fetchPartnerActivitiesThunk } from '@/redux/partnerSlice';

const PARTNER_ENTITY_TYPE = 'partner';

const getActivityKind = (a) => a.type ?? a.activity_type ?? '';

/**
 * Normalize filter option labels from API (e.g. lowercase "partner" → "Partner").
 */
function normalizeFilterOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((opt) => {
    if (opt.value === 'partner' && String(opt.label).toLowerCase() === 'partner') {
      return { ...opt, label: 'Partner' };
    }
    return opt;
  });
}

const PartnerEntityActivities = ({ partnerName }) => {
  const dispatch = useDispatch();
  const { data, loading, error } = useSelector((state) => state.partner.partnerActivities);
  const [filterBy, setFilterBy] = useState('all');
  const [timePeriod, setTimePeriod] = useState('all');
  const [showUserDetails, setShowUserDetails] = useState(false);

  const filterOptions = normalizeFilterOptions(
    data?.activity_filter_options?.length
      ? data.activity_filter_options
      : PARTNER_ACTIVITIES_DEFAULT_ACTIVITY_FILTER_OPTIONS,
  );
  const timeFrameOptionsResolved = data?.time_frame_options?.length
    ? data.time_frame_options
    : PARTNER_ACTIVITIES_DEFAULT_TIME_FRAME_OPTIONS;

  useEffect(() => {
    if (!partnerName) return;
    dispatch(
      fetchPartnerActivitiesThunk({
        partner: partnerName,
        activityFilter: filterBy,
        timeFrame: timePeriod,
      }),
    );
  }, [dispatch, partnerName, filterBy, timePeriod]);

  const displayGroups = useMemo(() => {
    let result = data?.groups ?? [];
    result = result.filter((g) => (g.activities?.length ?? 0) > 0);
    if (timePeriod !== 'all') {
      result = result.filter((g) => g.id === timePeriod);
    }
    if (filterBy !== 'all') {
      result = result
        .map((group) => ({
          ...group,
          activities: (group.activities ?? []).filter((a) => getActivityKind(a) === filterBy),
        }))
        .filter((group) => (group.activities?.length ?? 0) > 0);
    }
    return result;
  }, [data?.groups, timePeriod, filterBy]);

  if (!partnerName) {
    return (
      <div className='flex flex-1 flex-col px-6 py-6'>
        <p className='text-paragraph-sm text-text-sub-500'>Save the partner to load activities.</p>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className='flex flex-1 flex-col overflow-hidden'>
        <div className='flex flex-1 items-center justify-center py-20'>
          <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary-base border-t-transparent' />
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-1 flex-col overflow-hidden min-h-0'>
      <CrmEntityActivitiesToolbar
        filterBy={filterBy}
        onFilterByChange={setFilterBy}
        timePeriod={timePeriod}
        onTimePeriodChange={setTimePeriod}
        filterOptions={filterOptions}
        timeFrameOptions={timeFrameOptionsResolved}
        showUserDetails={showUserDetails}
        onShowUserDetailsChange={setShowUserDetails}
      />

      <div className='flex-1 min-h-0 overflow-y-auto px-6 py-2'>
        {error && (
          <p className='text-paragraph-sm text-red-600 py-2' role='alert'>
            {error}
          </p>
        )}
        {displayGroups.length > 0 ? (
          <div className='flex flex-col gap-6'>
            {displayGroups.map((group) => (
              <CrmEntityActivitiesGroup
                key={group.id}
                group={group}
                entityType={PARTNER_ENTITY_TYPE}
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

export default PartnerEntityActivities;
