import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiArrowDownSLine, RiArrowRightSLine, RiUserLine } from 'react-icons/ri';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import CenterViewCommonLayout from '@/components/centers-management/center-view-content/center-view-common-layout';
import emptyState from '@/assets/images/empty-state.png';
import { showErrorToast } from '@/utils/error-utils';
import { getCenterAllocatedClientsThunk } from '@/redux/centerSlice';
import { getSpaceTypeBadge } from '@/components/space-management/constants';

const getStatusVariant = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('occupied')) return 'green';
  if (normalized.includes('pending')) return 'orange';
  return 'disabled';
};

const CenterDetailClientsTab = ({ centerId }) => {
  const dispatch = useDispatch();
  const {
    data: rows,
    isLoading,
    error,
  } = useSelector((state) => state.center.centerAllocatedClients);
  const [searchValue, setSearchValue] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    if (!centerId) return;
    dispatch(getCenterAllocatedClientsThunk(centerId));
  }, [centerId, dispatch]);

  useEffect(() => {
    if (!error) return;
    showErrorToast(error, { defaultMessage: 'Failed to load clients for this center.' });
  }, [error]);

  const filteredGroups = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();
    if (!keyword) return rows;
    return (rows || [])
      .map((group) => {
        const clientName = String(group.customer_name || '').toLowerCase();
        const clientId = String(group.customer || '').toLowerCase();
        const spaces = Array.isArray(group.assigned_spaces) ? group.assigned_spaces : [];
        const clientMatches = clientName.includes(keyword) || clientId.includes(keyword);

        if (clientMatches) {
          return { ...group, assigned_spaces: spaces };
        }

        const matchedSpaces = spaces.filter((space) => {
          const spaceId = String(space.space_id || '').toLowerCase();
          const spaceName = String(space.space_name || '').toLowerCase();
          const floor = String(space.floor || '').toLowerCase();
          const inventoryType = String(space.inventory_type || '').toLowerCase();
          const status = String(space.status || '').toLowerCase();
          return (
            spaceId.includes(keyword) ||
            spaceName.includes(keyword) ||
            floor.includes(keyword) ||
            inventoryType.includes(keyword) ||
            status.includes(keyword)
          );
        });

        if (matchedSpaces.length === 0) return null;
        return { ...group, assigned_spaces: matchedSpaces };
      })
      .filter(Boolean);
  }, [rows, searchValue]);

  const handleOpenClient = useCallback((clientId) => {
    if (!clientId) return;
    const targetPath = `/clients/${encodeURIComponent(clientId)}`;
    window.open(targetPath, '_blank', 'noopener,noreferrer');
  }, []);

  useEffect(() => {
    setExpandedGroups((previous) => {
      const next = { ...previous };
      (filteredGroups || []).forEach((group) => {
        if (next[group.customer] === undefined) {
          next[group.customer] = true;
        }
      });
      return next;
    });
  }, [filteredGroups]);

  const toggleGroup = useCallback((clientId) => {
    setExpandedGroups((previous) => ({
      ...previous,
      [clientId]: !previous[clientId],
    }));
  }, []);

  if (isLoading) {
    return (
      <div className='w-full h-full flex items-center justify-center p-10'>
        <div className='text-paragraph-md text-text-sub-500'>Loading clients...</div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className='w-full h-full flex flex-col items-center justify-center gap-5 py-10'>
        <img className='object-contain' src={emptyState} alt='no clients' />
        <span className='label-medium text-[var(--color-text-soft-400)]'>
          No clients allocated in this center yet.
        </span>
      </div>
    );
  }

  return (
    <CenterViewCommonLayout
      title='Clients'
      Icon={RiUserLine}
      showButton={false}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
    >
      {filteredGroups.length > 0 ? (
        <div className='w-full flex flex-col gap-4'>
          {filteredGroups.map((group) => {
            const spaces = Array.isArray(group.assigned_spaces) ? group.assigned_spaces : [];
            const isExpanded = expandedGroups[group.customer] !== false;

            return (
              <div key={group.customer} className='w-full rounded-lg  border-stroke-soft-200'>
                <button
                  type='button'
                  onClick={() => toggleGroup(group.customer)}
                  className='w-full px-4 py-3 rounded-lg bg-bg-weak-50 flex items-center justify-between gap-3 text-left'
                >
                  <div className='flex flex-wrap items-center gap-3 min-w-0'>
                    <span className='label-small text-text-main-900 truncate'>
                      {group.customer_name || '--'}
                    </span>
                    <span className='paragraph-small text-text-sub-500'>
                      ({group.customer || '--'})
                    </span>
                    <span className='paragraph-small text-text-sub-500'>
                      Spaces: {group.allocated_spaces_count ?? spaces.length ?? 0}
                    </span>
                    <span className='paragraph-small text-text-sub-500'>
                      Seats: {group.total_assigned_seats ?? 0}
                    </span>
                    {/* <Badge.Root
                      variant='light'
                      color={getStatusVariant(group.allocation_status)}
                      size='small'
                    >
                      {group.allocation_status || 'N/A'}
                    </Badge.Root> */}
                  </div>
                  <span className='shrink-0 text-text-soft-400'>
                    {isExpanded ? (
                      <RiArrowDownSLine className='size-5' />
                    ) : (
                      <RiArrowRightSLine className='size-5' />
                    )}
                  </span>
                </button>

                {isExpanded && (
                  <div className='p-2'>
                    <Table.Root variant='compact'>
                      <Table.Header>
                        <Table.Row className='bg-bg-weak-50'>
                          <Table.Head className='text-left label-small text-text-sub-600 font-medium'>
                            Space Name
                          </Table.Head>
                          <Table.Head className='text-left label-small text-text-sub-600 font-medium'>
                            Space ID
                          </Table.Head>
                          <Table.Head className='text-left label-small text-text-sub-600 font-medium'>
                            Floor
                          </Table.Head>
                          <Table.Head className='text-left label-small text-text-sub-600 font-medium'>
                            Space Type
                          </Table.Head>
                          <Table.Head className='text-left label-small text-text-sub-600 font-medium'>
                            Assigned Seats
                          </Table.Head>
                          <Table.Head className='text-left label-small text-text-sub-600 font-medium'>
                            Status
                          </Table.Head>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {spaces.map((space) => (
                          <Table.Row
                            key={space.assign_space_id || `${group.customer}-${space.space_id}`}
                            className='cursor-pointer hover:bg-bg-weak-50 transition-colors border-b border-stroke-soft-200'
                            onClick={() => handleOpenClient(group.customer)}
                          >
                            <Table.Cell className='paragraph-small text-text-sub-500'>
                              {space.space_name || '--'}
                            </Table.Cell>
                            <Table.Cell className='paragraph-small text-text-sub-500'>
                              {space.space_id || '--'}
                            </Table.Cell>
                            <Table.Cell className='paragraph-small text-text-sub-500'>
                              {space.floor || '--'}
                            </Table.Cell>
                            <Table.Cell className='paragraph-small text-text-sub-500'>
                              {space.inventory_type
                                ? (() => {
                                    const typeBadge = getSpaceTypeBadge(space.inventory_type);
                                    return (
                                      <Badge.Root
                                        variant='light'
                                        color={typeBadge.color}
                                        size='small'
                                      >
                                        {typeBadge.label}
                                      </Badge.Root>
                                    );
                                  })()
                                : '--'}
                            </Table.Cell>
                            <Table.Cell className='paragraph-small text-text-sub-500'>
                              {space.assigned_seats ?? 0}
                            </Table.Cell>
                            <Table.Cell className='paragraph-small text-text-sub-500'>
                              <Badge.Root
                                variant='light'
                                color={getStatusVariant(space.status)}
                                size='small'
                              >
                                {space.status || 'N/A'}
                              </Badge.Root>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className='w-full flex flex-col items-center justify-center gap-4 py-10'>
          <img className='object-contain' src={emptyState} alt='no results' />
          <span className='label-medium text-[var(--color-text-soft-400)]'>
            No clients found for your search.
          </span>
        </div>
      )}
    </CenterViewCommonLayout>
  );
};

export default CenterDetailClientsTab;
