import React, { useState, useMemo } from 'react';
import { RiArrowDownSLine, RiArrowUpSLine, RiBuildingLine } from 'react-icons/ri';
import * as LinkButton from '@/components/ui/link-button';
import LocationTable from '@/components/clients-management/client-detail-csi/location-table';
import { CLIENT_DETAIL_EMPTY_STATES } from '@/components/clients-management/constants';

const ClientDetailCsiTable = ({ groupedSurveys = [], onRowClick }) => {
  const [expandedLocations, setExpandedLocations] = useState({});
  const [showAllByLocation, setShowAllByLocation] = useState({});

  // Backend returns [{ center_name, surveys }, ...]; convert to { [center_name]: surveys } for render
  const groupedSurveysByLocation = useMemo(() => {
    if (!Array.isArray(groupedSurveys) || groupedSurveys.length === 0) return {};
    return Object.fromEntries(
      groupedSurveys.map((g) => [g.center_name ?? 'Unknown Location', g.surveys ?? []]),
    );
  }, [groupedSurveys]);

  const toggleLocation = (location) => {
    setExpandedLocations((previous) => ({
      ...previous,
      [location]: !previous[location],
    }));
  };

  const toggleShowMore = (location) => {
    setShowAllByLocation((previous) => ({
      ...previous,
      [location]: !previous[location],
    }));
  };

  if (Object.keys(groupedSurveysByLocation).length === 0) {
    const emptyState = CLIENT_DETAIL_EMPTY_STATES.csi;
    return (
      <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center mx-6'>
        <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{emptyState.title}</h3>
        <p className='max-w-md text-sm text-text-sub-600'>{emptyState.description}</p>
      </div>
    );
  }

  return (
    <div className='px-6 pb-6'>
      {Object.entries(groupedSurveysByLocation).map(
        ([location, locationSurveys], locationIndex) => {
          const isExpanded = expandedLocations[location] !== false; // Default to expanded
          const locationDisplay = location;
          const DEFAULT_VISIBLE_ROWS = 5;
          const showAllRows = showAllByLocation[location] === true;
          const visibleSurveys = showAllRows
            ? locationSurveys
            : locationSurveys.slice(0, DEFAULT_VISIBLE_ROWS);
          const hasMore = locationSurveys.length > DEFAULT_VISIBLE_ROWS;

          return (
            <div key={location} className={locationIndex > 0 ? 'mt-6' : ''}>
              {/* Location Header - Collapsible - Toggle location */}
              <button
                onClick={() => toggleLocation(location)}
                className='flex items-center gap-1 w-full'
              >
                <div className='flex items-center gap-2'>
                  <RiBuildingLine size={20} className='text-text-sub-500' />
                  <span className='text-label-sm text-text-sub-500'>{locationDisplay}</span>
                </div>
                {isExpanded ? (
                  <RiArrowUpSLine className='size-5 text-text-soft-400' />
                ) : (
                  <RiArrowDownSLine className='size-5 text-text-soft-400' />
                )}
              </button>

              {/* Table Content */}
              {isExpanded && (
                <div className='mt-2'>
                  <LocationTable locationSurveys={visibleSurveys} onRowClick={onRowClick} />

                  {hasMore && (
                    <div className='mt-2'>
                      <LinkButton.Root
                        variant='primary'
                        size='small'
                        underline
                        onClick={() => toggleShowMore(location)}
                      >
                        {showAllRows
                          ? 'Hide'
                          : `Show ${locationSurveys.length - DEFAULT_VISIBLE_ROWS} more...`}
                        <LinkButton.Icon as={showAllRows ? RiArrowUpSLine : RiArrowDownSLine} />
                      </LinkButton.Root>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        },
      )}
    </div>
  );
};

export default ClientDetailCsiTable;
