import React, { useState, useMemo, useEffect } from 'react';
import { RiBox3Line, RiBuildingLine, RiArrowDownSLine, RiArrowRightSLine } from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import * as LinkButton from '@/components/ui/link-button';
import {
  CLIENT_DETAIL_EMPTY_STATES,
  SPACE_TYPE,
  COWORKING_SPACE_TYPE,
} from '@/components/clients-management/constants';
import { getSpaceTypeBadge, getSpaceStatusBadge } from '@/components/space-management/constants';
import { hasStatusBadgeColor, StatusColorPill } from '@/components/ui/status-color-pill';
import { formatDateWithOrdinal } from '@/utils/date-utils';

const AllocatedSpaceList = ({ spaces, variant = 'compact' }) => {
  const [expandedSpaces, setExpandedSpaces] = useState(new Set());

  // Spaces are already grouped by center from the API
  // Each item in spaces array has: { center_name, assigned_spaces: [...] }
  const groupedSpaces = useMemo(() => {
    const groups = {};
    const spaceList = spaces || [];

    spaceList.forEach((centerGroup) => {
      const centerName = centerGroup.center_name || 'Unknown Hub';
      const hubKey = `${centerName}`;

      // Use assigned_spaces directly from the API response
      groups[hubKey] = {
        name: centerName,
        spaces: centerGroup.assigned_spaces || [],
      };
    });
    return groups;
  }, [spaces]);

  const [collapsedHubs, setCollapsedHubs] = useState(new Set());

  // Compute expanded hubs: all hubs by default, minus any collapsed ones
  const expandedHubs = useMemo(() => {
    const allHubs = new Set(Object.keys(groupedSpaces));
    // Remove collapsed hubs from the set
    collapsedHubs.forEach((collapsedKey) => {
      allHubs.delete(collapsedKey);
    });
    return allHubs;
  }, [groupedSpaces, collapsedHubs]);

  // Initialize all spaces as expanded by default when spaces data changes
  useEffect(() => {
    if (spaces && spaces.length > 0) {
      const allSpaceIds = new Set();
      spaces.forEach((centerGroup) => {
        const assignedSpaces = centerGroup.assigned_spaces || [];
        assignedSpaces.forEach((space) => {
          if (space.assign_space_id) {
            allSpaceIds.add(space.assign_space_id);
          }
        });
      });
      setExpandedSpaces(allSpaceIds);
    }
  }, [spaces]);

  const toggleHub = (hubKey) => {
    setCollapsedHubs((previous) => {
      const next = new Set(previous);
      if (next.has(hubKey)) {
        // User wants to expand it again (remove from collapsed set)
        next.delete(hubKey);
      } else {
        // User wants to collapse it (add to collapsed set)
        next.add(hubKey);
      }
      return next;
    });
  };

  const toggleSpace = (spaceId) => {
    setExpandedSpaces((previous) => {
      const next = new Set(previous);
      if (next.has(spaceId)) {
        next.delete(spaceId);
      } else {
        next.add(spaceId);
      }
      return next;
    });
  };

  const renderTableView = () => {
    const rows = [];

    Object.values(groupedSpaces).forEach((hub) => {
      hub.spaces.forEach((space) => {
        rows.push({
          hub: hub.name,
          name: space.space_name || space.assign_space_id,
          type: space.space_type,
          floor: space.floor,
          seats: space.assigned_seats,
          status: space.status,
          start_date: space.start_date,
          end_date: space.end_date,
          total_rate: space.total_rate,
          total_credits: space.total_credits,
          credit_per_seat: space.credit_per_seat,
          rate_per_seat: space.rate_per_seat,
          coworking_space_type: space.coworking_space_type,
          total_carpet_area: space.total_carpet_area ?? space.total_carpet_sft,
          total_carpet_rate:
            space.total_carpet_rate ?? space.expected_carpet_rate ?? space.total_rate,
        });
      });
    });

    return (
      <div className='border border-stroke-soft-200 rounded-xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead className='sticky top-0 z-10 bg-bg-weak-100 border-b border-stroke-soft-200'>
            <tr>
              <th className='px-4 py-3 text-left'>Hub</th>
              <th className='px-4 py-3 text-left'>Space Name</th>
              <th className='px-4 py-3 text-left'>Type</th>
              <th className='px-4 py-3 text-left'>Floor</th>
              <th className='px-4 py-3 text-left'>Status</th>
              <th className='px-4 py-3 text-left'>Start Date</th>
              <th className='px-4 py-3 text-left'>End Date</th>
              <th className='px-4 py-3 text-left'>Seats</th>
              <th className='px-4 py-3 text-left'>Total Credits</th>
              <th className='px-4 py-3 text-left'>Expected Per Seat Rate (₹)</th>
              <th className='px-4 py-3 text-left'>Total Rate (₹)</th>
              <th className='px-4 py-3 text-left'>Co-Working Space Type</th>
              <th className='px-4 py-3 text-left'>Agreement Carpet Area</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) =>
              (() => {
                const isPureRental = row.type === SPACE_TYPE.PURE_RENTAL;
                const carpetArea =
                  row.total_carpet_area !== undefined && row.total_carpet_area !== null
                    ? row.total_carpet_area
                    : '--';
                const carpetRate =
                  row.total_carpet_rate !== undefined && row.total_carpet_rate !== null
                    ? row.total_carpet_rate
                    : '--';

                return (
                  <tr
                    key={index}
                    className='border-b border-stroke-soft-200 last:border-0 hover:bg-bg-weak-50'
                  >
                    <td className='px-4 py-3'>{row.hub}</td>
                    <td className='px-4 py-3'>{row.name}</td>
                    <td className='px-4 py-3'>{getSpaceTypeBadge(row.type)?.label || '--'}</td>
                    <td className='px-4 py-3'>{row.floor || '--'}</td>
                    <td className='px-4 py-3'>{row.status || '--'}</td>
                    <td className='px-4 py-3'>{row.start_date || '--'}</td>
                    <td className='px-4 py-3'>{row.end_date || '--'}</td>
                    <td className='px-4 py-3'>{isPureRental ? '--' : row.seats || '--'}</td>
                    <td className='px-4 py-3'>{isPureRental ? '--' : row.total_credits || '--'}</td>
                    <td className='px-4 py-3'>{isPureRental ? '--' : row.rate_per_seat || '--'}</td>
                    <td className='px-4 py-3'>
                      {isPureRental
                        ? row.total_carpet_rate || row.total_rate || '--'
                        : row.total_rate || '--'}
                    </td>
                    <td className='px-4 py-3'>
                      {isPureRental ? '--' : row.coworking_space_type || '--'}
                    </td>
                    <td className='px-4 py-3'>{isPureRental ? carpetArea : '--'}</td>
                  </tr>
                );
              })(),
            )}
          </tbody>
        </table>
      </div>
    );
  };

  if (!spaces || spaces.length === 0) {
    const emptyState = CLIENT_DETAIL_EMPTY_STATES.allocatedSpaces;
    return (
      <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
        <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{emptyState.title}</h3>
        <p className='max-w-md text-sm text-text-sub-600'>{emptyState.description}</p>
      </div>
    );
  }

  if (variant === 'expanded') {
    return renderTableView();
  }

  return (
    <div className='flex flex-col gap-5'>
      {Object.entries(groupedSpaces).map(([hubKey, hubData]) => {
        const isHubExpanded = expandedHubs.has(hubKey);
        return (
          <div key={hubKey} className='flex flex-col gap-2'>
            {/* Hub Header */}
            <div
              className='flex items-center gap-1 px-0 py-1.5 cursor-pointer'
              onClick={() => toggleHub(hubKey)}
            >
              <div className='flex items-center gap-2'>
                <RiBuildingLine className='text-text-sub-500' size={20} />
                <span className='text-label-sm text-text-sub-500'>
                  {hubData.name}
                  {/* <span className='text-text-soft-400'>({hubData.code})</span> */}
                </span>
              </div>
              <div
                className={`transform transition-transform ${isHubExpanded ? 'rotate-180' : ''}`}
              >
                <RiArrowDownSLine className='text-text-soft-400' size={20} />
              </div>
            </div>

            {/* Spaces in Hub */}
            {isHubExpanded && (
              <div className='flex flex-col gap-3'>
                {hubData.spaces.map((space) => {
                  const spaceId = space.assign_space_id;
                  const isSpaceExpanded = expandedSpaces.has(spaceId);
                  // Get inventory type - use space_type from API
                  const inventoryType = space.space_type || null;
                  const isPureRental = inventoryType === SPACE_TYPE.PURE_RENTAL;
                  const typeBadge = getSpaceTypeBadge(space.space_type);
                  // Get space name - use space_name from API
                  const spaceName = space.space_name || space.assign_space_id || 'Unknown Space';
                  const hasSeats = space.assigned_seats && space.assigned_seats > 0;

                  return (
                    <div
                      key={spaceId}
                      className='bg-bg-weak-100 border border-stroke-soft-200 rounded-xl shadow-regular-sm overflow-hidden'
                    >
                      {/* Space Header */}
                      <div
                        className='bg-bg-weak-100 flex items-center justify-between pl-4 pr-3 py-3 cursor-pointer'
                        onClick={() => toggleSpace(spaceId)}
                      >
                        <div className='flex items-center gap-3 flex-1'>
                          <div className='relative flex items-center justify-center p-1.5 rounded-full shrink-0'>
                            <div className='absolute inset-0 rounded-full bg-white ring-1 ring-stroke-soft-200 w-8 h-8' />
                            <RiBox3Line className='relative text-text-sub-500' size={20} />
                          </div>
                          <div className='flex flex-col gap-1 min-w-0'>
                            <div className='text-label-sm text-text-main-900'>{spaceName}</div>
                            <div className='flex items-center gap-2'>
                              {typeBadge ? (
                                <>
                                  <Badge.Root variant='light' color={typeBadge.color} size='small'>
                                    {typeBadge.label}
                                  </Badge.Root>
                                  <span className='w-1 h-1 rounded-full bg-text-soft-400 shrink-0' />
                                </>
                              ) : (
                                <span className='paragraph-small text-text-sub-500'>--</span>
                              )}
                              <span className='paragraph-small text-text-sub-500'>
                                Floor {space.floor || '--'}
                              </span>
                              {space.status &&
                                (() => {
                                  const statusColorRaw = space.status_color || space.statusColor;
                                  if (hasStatusBadgeColor(statusColorRaw)) {
                                    return (
                                      <StatusColorPill
                                        value={space.status}
                                        color={statusColorRaw}
                                        className='max-w-[120px]'
                                      />
                                    );
                                  }
                                  const statusBadge = getSpaceStatusBadge(space.status);
                                  return (
                                    <Badge.Root
                                      variant='light'
                                      color={statusBadge.color}
                                      size='small'
                                    >
                                      {statusBadge.label}
                                    </Badge.Root>
                                  );
                                })()}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`flex items-center justify-center shrink-0 transform transition-transform ${
                            isSpaceExpanded ? 'rotate-180' : ''
                          }`}
                        >
                          <RiArrowDownSLine className='text-text-sub-500' size={20} />
                        </div>
                      </div>

                      {/* Space Details */}
                      {isSpaceExpanded && (
                        <div className='bg-white border-t border-stroke-soft-200 px-6 py-5'>
                          <div className='flex flex-col gap-4'>
                            {/* First Row */}
                            <div className='grid grid-cols-4 gap-4'>
                              <div className='flex flex-col gap-1 h-[42px]'>
                                <span className='text-paragraph-xs text-text-sub-500 opacity-72'>
                                  Lease Start Date
                                </span>
                                <span className='text-label-sm text-text-main-900'>
                                  {space.start_date
                                    ? formatDateWithOrdinal(space.start_date)
                                    : '--'}
                                </span>
                              </div>

                              <div className='flex flex-col gap-1'>
                                <span className='text-paragraph-xs text-text-sub-500 opacity-72'>
                                  Lease End Date
                                </span>
                                <span className='text-label-sm text-text-main-900'>
                                  {space.end_date ? formatDateWithOrdinal(space.end_date) : '--'}
                                </span>
                              </div>
                              {isPureRental ? (
                                <>
                                  <div className='flex flex-col gap-1 h-[42px]'>
                                    <span className='text-paragraph-xs text-text-sub-500 opacity-72'>
                                      Agreement Carpet Area
                                    </span>
                                    <span className='text-label-sm text-text-main-900'>
                                      {space.total_carpet_area !== undefined &&
                                      space.total_carpet_area !== null
                                        ? `${space.total_carpet_area} sq.ft.`
                                        : '--'}
                                    </span>
                                  </div>
                                  <div className='flex flex-col gap-1'>
                                    <span className='text-paragraph-xs text-text-sub-500 opacity-72'>
                                      Total Carpet Rate
                                    </span>
                                    <span className='text-label-sm text-text-main-900'>
                                      {space.total_carpet_rate !== undefined &&
                                      space.total_carpet_rate !== null
                                        ? `₹ ${space.total_carpet_rate}`
                                        : space.total_rate !== undefined &&
                                            space.total_rate !== null
                                          ? `₹ ${space.total_rate}`
                                          : space.expected_carpet_rate !== undefined &&
                                              space.expected_carpet_rate !== null
                                            ? `₹ ${space.expected_carpet_rate}`
                                            : '--'}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className='flex flex-col gap-1 h-[42px]'>
                                    <span className='text-paragraph-xs text-text-sub-500 opacity-72'>
                                      Seats
                                    </span>
                                    <div className='flex items-center gap-2'>
                                      <span className='text-label-sm text-text-main-900'>
                                        {space.assigned_seats || '--'}
                                      </span>
                                      {space.coworking_space_type ===
                                        COWORKING_SPACE_TYPE.DEDICATED_DESK &&
                                        hasSeats && (
                                          <LinkButton.Root
                                            variant='primary'
                                            size='small'
                                            underline
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // TODO: Implement view seats mapping
                                            }}
                                          >
                                            View Seats Mapping
                                            <LinkButton.Icon as={RiArrowRightSLine} />
                                          </LinkButton.Root>
                                        )}
                                    </div>
                                  </div>
                                  <div className='flex flex-col gap-1'>
                                    <span className='text-paragraph-xs text-text-sub-500 opacity-72'>
                                      Total Credits
                                    </span>
                                    {space.total_credits ? (
                                      <div>
                                        <span className='text-label-sm xt-text-main-900'>
                                          {space.total_credits}{' '}
                                        </span>
                                        <span className='text-paragraph-xs text-text-soft-400'>
                                          ({space.credit_per_seat} per seat)
                                        </span>
                                      </div>
                                    ) : (
                                      <span className='text-label-sm text-text-main-900'>--</span>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Second Row */}
                            {!isPureRental && (
                              <div className='grid grid-cols-4 gap-4'>
                                <div className='flex flex-col gap-1'>
                                  <span className='text-paragraph-xs text-text-sub-500 opacity-72'>
                                    {inventoryType === SPACE_TYPE.MANAGED_OFFICE ||
                                    inventoryType === 'managed_office'
                                      ? 'Rate Per Seat (₹)'
                                      : 'Expected Per Seat Rate (₹)'}
                                  </span>
                                  <span className='text-label-sm text-text-main-900'>
                                    {space.rate_per_seat || '--'}
                                  </span>
                                </div>
                                <div className='flex flex-col gap-1'>
                                  <span className='text-paragraph-xs text-text-sub-500 opacity-72'>
                                    Total Rate (₹)
                                  </span>
                                  <span className='text-label-sm text-text-main-900'>
                                    {space.total_rate || '--'}
                                  </span>
                                </div>
                                <div className='flex flex-col gap-1'>
                                  <span className='text-paragraph-xs text-text-sub-500 opacity-72'>
                                    {inventoryType === SPACE_TYPE.MANAGED_OFFICE ||
                                    inventoryType === 'managed_office'
                                      ? 'Managed Office Type'
                                      : 'Co-Working Space Type'}
                                  </span>
                                  <span className='text-label-sm text-text-main-900'>
                                    {space.coworking_space_type ||
                                      space.managed_office_type ||
                                      space.inventory_type ||
                                      '--'}
                                  </span>
                                </div>
                                <div />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AllocatedSpaceList;
