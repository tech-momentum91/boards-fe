import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiAlertFill,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiPencilLine,
  RiDeleteBinLine,
} from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import * as Avatar from '@/components/ui/avatar';
import * as CompactButton from '@/components/ui/compact-button';
import * as Tooltip from '@/components/ui/tooltip';
import { TeamToolbar, TeamTable } from '@/components/team-management';
import { useDebounce } from '@/hooks/use-debounce';
import { mergeNavbarIntoLocalFilters } from '@/utils/combined-scope-filter';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import {
  fetchCoreTeamData,
  fetchRolesWithType,
  getCoreTeamColumnPreferencesThunk,
  saveCoreTeamColumnPreferencesThunk,
} from '@/redux/teamManagementSlice';
import { showErrorToast } from '@/utils/error-utils';
import {
  CORE_TEAM_GROUP_BY_OPTIONS,
  getCoreTeamRoleBadgeColor,
  getZonesFromMember,
  PAGE_SIZE,
  DEFAULT_TEAM_DROPDOWN_FILTERS,
  mergeStoredTeamDropdownFilters,
  buildTeamListApiFiltersFromApplied,
  mapRolesMessageToFilterOptions,
} from '@/components/team-management/constants';

import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';

const TEAM_CORE_FILTER_STORAGE_KEY = 'team-management-core-team-filter-dropdown';

const DEFAULT_AVATAR =
  'https://www.clipartmax.com/png/middle/258-2582267_circled-user-male-skin-type-1-2-icon-male-user-icon.png';

const GroupedViewCenterCell = ({ member }) => {
  const centers = Array.isArray(member?.centers) ? member.centers.filter(Boolean) : [];

  if (centers.length === 0) {
    const fallback =
      typeof member?.center_name === 'string' && member.center_name.trim()
        ? member.center_name.trim()
        : '--';
    return (
      <span
        className='text-paragraph-sm text-text-sub-600 whitespace-nowrap truncate'
        title={fallback}
      >
        {fallback}
      </span>
    );
  }

  const firstCenter = centers[0];
  const additionalCenters = centers.slice(1);
  const additionalCount = additionalCenters.length;
  const firstLabel =
    typeof firstCenter === 'string' ? firstCenter : firstCenter?.name || firstCenter?.center_name;

  return (
    <div className='flex items-center gap-2 whitespace-nowrap min-w-0'>
      <Badge.Root variant='lighter' color='gray' size='medium'>
        <span className='text-paragraph-sm font-medium text-text-strong-950 truncate max-w-[140px]'>
          {firstLabel}
        </span>
      </Badge.Root>

      {additionalCount > 0 && (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Badge.Root
              variant='lighter'
              color='gray'
              size='medium'
              className='cursor-pointer shrink-0'
            >
              <span className='text-label-xs font-semibold text-text-strong-950'>
                +{additionalCount}
              </span>
            </Badge.Root>
          </Tooltip.Trigger>
          <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
            <div className='flex flex-col gap-1'>
              <span className='text-paragraph-sm font-medium text-text-strong-950 mb-1'>
                Additional centers ({additionalCount})
              </span>
              <div className='flex flex-col gap-1'>
                {additionalCenters.map((center, idx) => (
                  <div key={center?.id ?? idx} className='text-paragraph-sm text-text-sub-600'>
                    {typeof center === 'string' ? center : center?.name || center?.center_name}
                  </div>
                ))}
              </div>
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      )}
    </div>
  );
};

const GroupedViewZoneCell = ({ member }) => {
  const zones = getZonesFromMember(member);

  if (zones.length === 0) {
    return (
      <span className='text-paragraph-sm text-text-sub-600 whitespace-nowrap truncate'>--</span>
    );
  }

  const firstZone = zones[0];
  const additionalZones = zones.slice(1);
  const additionalCount = additionalZones.length;

  return (
    <div className='flex items-center gap-2 whitespace-nowrap min-w-0'>
      <Badge.Root variant='lighter' color='gray' size='medium'>
        <span className='text-paragraph-sm font-medium text-text-strong-950 truncate max-w-[140px]'>
          {firstZone}
        </span>
      </Badge.Root>

      {additionalCount > 0 && (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Badge.Root
              variant='lighter'
              color='gray'
              size='medium'
              className='cursor-pointer shrink-0'
            >
              <span className='text-label-xs font-semibold text-text-strong-950'>
                +{additionalCount}
              </span>
            </Badge.Root>
          </Tooltip.Trigger>
          <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
            <div className='flex flex-col gap-1'>
              <span className='text-paragraph-sm font-medium text-text-strong-950 mb-1'>
                Additional zones ({additionalCount})
              </span>
              <div className='flex flex-col gap-1'>
                {additionalZones.map((zone) => (
                  <div key={zone} className='text-paragraph-sm text-text-sub-600'>
                    {zone}
                  </div>
                ))}
              </div>
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      )}
    </div>
  );
};

const sortGroupedEntries = (rawEntries, order) => {
  const mult = order === 'desc' ? -1 : 1;
  return [...rawEntries].sort(
    ([a], [b]) =>
      String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }) * mult,
  );
};

const GroupedTeamView = ({ groupedData = {}, isLoading, onEdit, onDelete, groupOrder = 'asc' }) => {
  const [expandedKeys, setExpandedKeys] = useState(() =>
    Object.fromEntries(Object.keys(groupedData).map((k) => [k, true])),
  );

  useEffect(() => {
    setExpandedKeys((previous) => {
      const next = { ...previous };
      Object.keys(groupedData).forEach((k) => {
        if (next[k] === undefined) next[k] = true;
      });
      return next;
    });
  }, [groupedData]);

  const toggle = (key) => setExpandedKeys((previous) => ({ ...previous, [key]: !previous[key] }));

  const entries = useMemo(
    () => sortGroupedEntries(Object.entries(groupedData || {}), groupOrder),
    [groupedData, groupOrder],
  );

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-16 text-text-soft-400'>Loading...</div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className='flex items-center justify-center py-16 text-text-soft-400'>
        No results found.
      </div>
    );
  }

  return (
    <div className='w-full flex flex-col gap-10'>
      {entries.map(([key, members]) => {
        const isExpanded = expandedKeys[key] !== false;
        return (
          <div key={key} className='flex w-full flex-col items-start gap-1'>
            <button
              type='button'
              onClick={() => toggle(key)}
              className='label-small flex items-center gap-1 font-medium text-[var(--color-text-sub-500)] cursor-pointer hover:opacity-80 transition-opacity w-full text-left'
            >
              {key}
              {isExpanded ? (
                <RiArrowUpSLine size={16} className='shrink-0' />
              ) : (
                <RiArrowDownSLine size={16} className='shrink-0' />
              )}
            </button>

            {isExpanded && (
              <div className='w-full pt-2 [&_table]:table-fixed'>
                <Table.Root variant='compact' className='w-full'>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head className='w-[22%] min-w-0'>Name</Table.Head>
                      <Table.Head className='w-[25%] min-w-0'>Email</Table.Head>
                      <Table.Head className='w-[15%] min-w-0'>Center</Table.Head>
                      <Table.Head className='w-[12%] min-w-0'>Zone</Table.Head>
                      <Table.Head className='w-[15%] min-w-0'>Role</Table.Head>
                      <Table.Head className='w-[12%] min-w-0'>Status</Table.Head>
                      <Table.Head className='w-[5%] min-w-0' />
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {(members || []).map((item, index) => (
                      <Table.Row
                        className='paragraph-small border-b-1 border-stroke-soft-200'
                        key={item?.team_member_id ?? index}
                      >
                        <Table.Cell className='min-w-0 align-middle'>
                          <div className='flex items-center gap-2 min-w-[220px] max-w-[220px]'>
                            <Avatar.Root size={32} color='gray' className='shrink-0'>
                              <Avatar.Image src={item?.image || DEFAULT_AVATAR} alt={item?.name} />
                            </Avatar.Root>
                            <Tooltip.Root size='xsmall'>
                              <Tooltip.Trigger asChild>
                                <span className='truncate min-w-[220px] max-w-[220px]'>
                                  {item?.name}
                                </span>
                              </Tooltip.Trigger>
                              {item?.name && (
                                <Tooltip.Content size='xsmall'>{item.name}</Tooltip.Content>
                              )}
                            </Tooltip.Root>
                          </div>
                        </Table.Cell>
                        <Table.Cell className='min-w-0 truncate align-middle' title={item?.email}>
                          {item?.email}
                        </Table.Cell>
                        <Table.Cell className='min-w-0 align-middle'>
                          <GroupedViewCenterCell member={item} />
                        </Table.Cell>
                        <Table.Cell className='min-w-0 align-middle'>
                          <GroupedViewZoneCell member={item} />
                        </Table.Cell>
                        <Table.Cell className='min-w-0 truncate align-middle' title={item?.role}>
                          <Badge.Root variant='light' color={getCoreTeamRoleBadgeColor(item?.role)}>
                            {item?.role}
                          </Badge.Root>
                        </Table.Cell>
                        <Table.Cell className='min-w-0 align-middle'>
                          <Badge.Root
                            variant='light'
                            color={item?.status === 'Active' ? 'green' : 'gray'}
                          >
                            {item?.status}
                          </Badge.Root>
                        </Table.Cell>
                        <Table.Cell className='min-w-0 gap-2 flex items-center justify-end'>
                          <CompactButton.Root
                            size='medium'
                            variant='ghost'
                            color='gray'
                            onClick={() => onEdit?.(item)}
                          >
                            <CompactButton.Icon as={RiPencilLine} />
                          </CompactButton.Root>
                          <CompactButton.Root
                            size='medium'
                            variant='ghost'
                            color='gray'
                            onClick={() => onDelete?.(item)}
                          >
                            <CompactButton.Icon as={RiDeleteBinLine} />
                          </CompactButton.Root>
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
  );
};

const RemoveMemberModal = ({ isOpen, onOpenChange, onConfirm }) => {
  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[450px]'>
        <Modal.Header
          variant='center'
          icon={
            <span className='p-2 bg-warning-base/10 rounded-lg'>
              <RiAlertFill size={24} className='text-warning-base' />
            </span>
          }
          title='Remove Member?'
          description='Are you sure you want to remove this member?'
        />
        <Modal.Footer>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={() => onOpenChange(false)}
            className='w-full'
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='button'
            variant='primary'
            mode='filled'
            size='small'
            onClick={onConfirm}
            className='w-full'
          >
            Confirm
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

const TeamManagementCoreTeam = ({
  onRetry: _onRetry,
  onRowSelect,
  onEdit,
  onDelete,
  onAddMember,
  onExport,
  tableVariant,
  onTableVariantToggle,
  widgetVisibility: _widgetVisibility,
  WIDGET_KEYS: _WIDGET_KEYS,
  activeTab,
  noCenters = false,
  headerScope,
  centerAccessLoading = false,
}) => {
  const dispatch = useDispatch();
  const coreScopeData = useSelector((state) => state.teamManagement.coreTeamData);
  const isActiveTab = activeTab === 'core';

  const [filters, setFilters] = useState({ search: '' });
  const debouncedKeyword = useDebounce(filters.search, 300);

  const [sorting, setSorting] = useState([]);
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [appliedFilters, setAppliedFilters] = useState(() => ({
    ...DEFAULT_TEAM_DROPDOWN_FILTERS,
  }));
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: TEAM_CORE_FILTER_STORAGE_KEY,
    defaultFilters: DEFAULT_TEAM_DROPDOWN_FILTERS,
  });
  const [roleOptions, setRoleOptions] = useState([]);
  const teamTableRef = useRef(null);

  useEffect(() => {
    dispatch(fetchRolesWithType({ group: 'core' }))
      .unwrap()
      .then((res) => {
        setRoleOptions(mapRolesMessageToFilterOptions(res?.message ?? {}));
      })
      .catch(() => setRoleOptions([]));
  }, [dispatch]);

  useEffect(() => {
    if (filtersInitialized) return;
    setAppliedFilters(mergeStoredTeamDropdownFilters(persistedFilters));
    setFiltersInitialized(true);
  }, [persistedFilters, filtersInitialized]);

  useEffect(() => {
    if (!filtersInitialized) return;
    const compact = compactFiltersForSessionStorage(
      appliedFilters,
      DEFAULT_TEAM_DROPDOWN_FILTERS,
      {},
    );
    if (JSON.stringify(compact) !== JSON.stringify(persistedFilters)) {
      setPersistedFilters(compact);
    }
  }, [appliedFilters, filtersInitialized, persistedFilters, setPersistedFilters]);

  const effectiveFilters = useMemo(
    () =>
      mergeNavbarIntoLocalFilters({
        localFilters: appliedFilters,
        navbarFilter: headerScope,
        unionFields: ['center'],
      }),
    [appliedFilters, headerScope],
  );

  const apiFilters = useMemo(
    () => buildTeamListApiFiltersFromApplied(effectiveFilters),
    [effectiveFilters],
  );

  const handleFetchData = useCallback(
    async (options = {}) => {
      if (!isActiveTab || !filtersInitialized) return;
      if (centerAccessLoading || headerScope === undefined) return;
      try {
        await dispatch(
          fetchCoreTeamData({
            keyword: options.keyword ?? debouncedKeyword,
            filters: options.filters ?? apiFilters,
            page: options.page ?? 1,
            page_size: options.page_size ?? PAGE_SIZE,
            append: options.append ?? false,
            group_by: options.group_by ?? '',
            group_order: options.group_order ?? 'asc',
            // ...(navbarFilter != null ? { navbar_filter: navbarFilter } : {}),
          }),
        ).unwrap();
      } catch (error) {
        showErrorToast(error);
      }
    },
    [
      dispatch,
      debouncedKeyword,
      apiFilters,
      isActiveTab,
      filtersInitialized,
      headerScope,
      centerAccessLoading,
    ],
  );

  useEffect(() => {
    if (!isActiveTab || !filtersInitialized) return;
    if (centerAccessLoading || headerScope === undefined) return;
    handleFetchData({
      keyword: debouncedKeyword,
      filters: apiFilters,
      page: 1,
      append: false,
      group_by: groupBy,
      group_order: groupOrder,
    });
  }, [
    debouncedKeyword,
    apiFilters,
    isActiveTab,
    groupBy,
    groupOrder,
    filtersInitialized,
    handleFetchData,
    headerScope,
    centerAccessLoading,
  ]);

  const handleLoadMore = useCallback(() => {
    if (!filtersInitialized || !coreScopeData.hasMore || coreScopeData.isLoadingMore) return;
    if (centerAccessLoading || headerScope === undefined) return;
    handleFetchData({
      keyword: debouncedKeyword,
      filters: apiFilters,
      page: (coreScopeData.page ?? 1) + 1,
      page_size: coreScopeData.pageSize ?? PAGE_SIZE,
      append: true,
      group_by: groupBy,
      group_order: groupOrder,
    });
  }, [
    coreScopeData.hasMore,
    coreScopeData.isLoadingMore,
    coreScopeData.page,
    coreScopeData.pageSize,
    debouncedKeyword,
    apiFilters,
    handleFetchData,
    groupBy,
    groupOrder,
    filtersInitialized,
    headerScope,
    centerAccessLoading,
  ]);

  // Switch view as soon as groupBy is selected — don't wait for API response type check
  const isGroupedView = Boolean(groupBy);

  const { sentinelRef } = useScrollPagination({
    onLoadMore: handleLoadMore,
    hasMore: coreScopeData.hasMore,
    isLoading: coreScopeData.isLoadingMore || coreScopeData.isLoading,
    threshold: 200,
    scrollContainer: '.core-team-grouped-scroll-container',
    enabled: isGroupedView,
  });

  // Table data: flat array for normal view
  const tableData = useMemo(() => {
    if (isGroupedView) return [];
    const rawData = coreScopeData?.data;
    if (Array.isArray(rawData)) return rawData;
    if (rawData?.results) return rawData.results;
    return [];
  }, [coreScopeData?.data, isGroupedView]);

  // Grouped data: object keyed by group name, only valid after API responds with grouped results
  const groupedData = useMemo(() => {
    if (!isGroupedView) return {};
    const rawData = coreScopeData?.data;
    if (rawData && !Array.isArray(rawData) && typeof rawData === 'object') return rawData;
    return {};
  }, [coreScopeData?.data, isGroupedView]);

  // Client-side filter for applied filters (center, status, role) when API doesn't support them
  // const filteredTeamMembers = useMemo(() => {
  //   let filtered = [...tableData];
  //   if (appliedFilters.center?.length > 0) {
  //     filtered = filtered.filter((member) => appliedFilters.center.includes(member.center));
  //   }
  //   if (appliedFilters.status?.length > 0) {
  //     filtered = filtered.filter((member) => appliedFilters.status.includes(member.status));
  //   }
  //   if (appliedFilters.role?.length > 0) {
  //     filtered = filtered.filter((member) => appliedFilters.role.includes(member.role));
  //   }
  //   return filtered;
  // }, [tableData, appliedFilters]);

  const handleSearchChange = useCallback((value) => {
    setFilters((previous) => ({ ...previous, search: value }));
  }, []);

  const handleSortingChange = useCallback((newSorting) => {
    setSorting(newSorting);
  }, []);

  const handleGroupByChange = useCallback((value) => {
    setGroupBy(value);
    if (!value) setGroupOrder('asc');
  }, []);

  const handleGroupOrderChange = useCallback((value) => {
    setGroupOrder(value);
  }, []);

  const fetchColumnConfig = useCallback(async () => {
    const data = await dispatch(getCoreTeamColumnPreferencesThunk()).unwrap();
    const raw = data?.columns ?? data?.message ?? data?.data ?? [];
    const list = Array.isArray(raw) ? raw : [];
    // Assign order from API array index so column order and visibility match the response
    return list.map((col, i) => ({ ...col, order: col.order ?? i }));
  }, [dispatch]);

  const persistColumnConfig = useCallback(
    async (cols) => {
      await dispatch(saveCoreTeamColumnPreferencesThunk(cols)).unwrap();
      const data = await dispatch(getCoreTeamColumnPreferencesThunk()).unwrap();
      const raw = data?.columns ?? data?.message ?? data?.data ?? [];
      const list = Array.isArray(raw) ? raw : [];
      return list.map((col, i) => ({ ...col, order: col.order ?? i }));
    },
    [dispatch],
  );

  const handleFiltersChange = useCallback((filtersArray, filterValues) => {
    const nextAppliedFilters = filterValues || {};
    setAppliedFilters(nextAppliedFilters);
  }, []);

  const [isRemoveMemberModalOpen, setIsRemoveMemberModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  const handleDeleteClick = useCallback((member) => {
    setMemberToRemove(member);
    setIsRemoveMemberModalOpen(true);
  }, []);

  const handleRemoveConfirm = useCallback(async () => {
    if (memberToRemove && onDelete) {
      await onDelete(memberToRemove);
    }
    setIsRemoveMemberModalOpen(false);
    setMemberToRemove(null);
  }, [memberToRemove, onDelete]);

  // Determine context for empty states
  const context = useMemo(() => {
    // if (noCenters) return 'no_centers';
    const hasSearch = Boolean(filters.search);
    const hasFilters =
      appliedFilters.center?.length > 0 ||
      appliedFilters.status?.length > 0 ||
      appliedFilters.role?.length > 0;

    if (hasSearch || hasFilters) {
      return 'search';
    }

    return 'default';
  }, [filters, appliedFilters, noCenters]);

  return (
    <div className='flex py-5 flex-col gap-6 flex-1 min-h-0'>
      <TeamToolbar
        filters={filters}
        onSearchChange={handleSearchChange}
        onAddMember={onAddMember}
        onExport={onExport}
        tableRef={teamTableRef}
        tableVariant={tableVariant}
        onTableVariantToggle={onTableVariantToggle}
        groupBy={groupBy}
        onGroupByChange={handleGroupByChange}
        groupOrder={groupOrder}
        onGroupOrderChange={handleGroupOrderChange}
        onFiltersChange={handleFiltersChange}
        appliedFilters={appliedFilters}
        roleOptions={roleOptions}
        groupByOptions={CORE_TEAM_GROUP_BY_OPTIONS}
        showColumnManager={!isGroupedView}
      />

      {/* Global navbar empty state disabled — scope comes from this tab's toolbar filters only. */}
      {isGroupedView ? (
        <div className='flex-1 min-h-0 overflow-auto pr-2 core-team-grouped-scroll-container'>
          <GroupedTeamView
            groupedData={groupedData}
            groupOrder={groupOrder}
            isLoading={coreScopeData?.isLoading ?? false}
            onEdit={onEdit}
            onDelete={handleDeleteClick}
          />
          {/* Scroll pagination sentinel and loading indicator */}
          <div ref={sentinelRef} style={{ height: '1px', width: '100%' }} />
          {coreScopeData.isLoadingMore && (
            <div className='text-center py-4'>
              <span className='text-paragraph-sm text-text-sub-600'>Loading more members...</span>
            </div>
          )}
        </div>
      ) : (
        <div className='flex-1 min-h-0 flex flex-col w-full'>
          <TeamTable
            ref={teamTableRef}
            rows={tableData}
            isLoading={coreScopeData?.isLoading ?? false}
            error={coreScopeData?.error ?? null}
            context={context}
            onRetry={handleFetchData}
            onRowSelect={onRowSelect}
            onEdit={onEdit}
            onDelete={handleDeleteClick}
            sorting={sorting}
            onSortingChange={handleSortingChange}
            tableId='team-management-core-team-table'
            variant={tableVariant}
            hasMore={coreScopeData?.hasMore ?? false}
            isLoadingMore={coreScopeData?.isLoadingMore ?? false}
            enableScrollPagination={true}
            onLoadMore={handleLoadMore}
            getRoleBadgeColor={getCoreTeamRoleBadgeColor}
            fetchColumnConfig={fetchColumnConfig}
            persistColumnConfig={persistColumnConfig}
          />
        </div>
      )}

      <RemoveMemberModal
        isOpen={isRemoveMemberModalOpen}
        onOpenChange={setIsRemoveMemberModalOpen}
        onConfirm={handleRemoveConfirm}
      />
    </div>
  );
};

export default TeamManagementCoreTeam;
