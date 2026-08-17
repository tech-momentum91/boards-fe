import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import { RiAddLine, RiLayoutColumnLine, RiSearchLine } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import {
  linkCenterTeamMemberThunk,
  unlinkCenterTeamMemberThunk,
  getCenterDetailsThunk,
} from '@/redux/centerSlice';
import {
  fetchCoreTeamData,
  fetchSupportTeamData,
  fetchRolesWithType,
  getCoreTeamColumnPreferencesThunk,
  saveCoreTeamColumnPreferencesThunk,
} from '@/redux/teamManagementSlice';
import TeamFilterDropdown from '@/components/team-management/team-filter-dropdown';
import {
  buildTeamListviewFilters,
  CENTER_DETAIL_TEAM_FILTER_DEFAULTS,
  CENTER_DETAIL_TEAM_VIEW_FILTERS_KEY,
  CENTER_VIEW_CORE_TEAM_DEFAULT_COLUMNS,
  CENTER_VIEW_CORE_TEAM_TABLE_ID,
  CENTER_VIEW_SUPPORT_TEAM_DEFAULT_COLUMNS,
  CENTER_VIEW_SUPPORT_TEAM_TABLE_ID,
  DEFAULT_TEAM_APPLIED_FILTERS,
  compactCenterDetailTeamTabFiltersForStorage,
  mergeStoredCenterDetailTeamTabFilters,
  parseTeamColumnPrefResponse,
} from '@/components/team-management/constants';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import RemoveCenterTeamMemberModal from './remove-center-team-member-modal';
import CenterLinkTeamModal from './center-link-team-modal';
import AddEditCenterTeamMemberModal from './add-edit-center-team-member-modal';
import MaxTeamLimitModal from './max-team-limit-modal';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { buildRoleNameToTypeMap } from '@/utils/user-utils';
import { fetchCenterTeamsConfigApi } from '@/api/centerConfiguration';
import {
  saveCenterTeamsConfig,
  getRoleMaxLimit,
  getRoleCurrentCount,
} from '@/utils/center-configuration-storage';
import CenterViewTeamTable from './center-view-team-table';

const CenterViewTeamAssociated = ({ centerId }) => {
  const [activeTab, setActiveTab] = useState('core_team');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [addEditModalOpen, setAddEditModalOpen] = useState(false);
  const [maxLimitModalOpen, setMaxLimitModalOpen] = useState(false);
  const [pendingMaxCount, setPendingMaxCount] = useState(null);
  const [pendingConfirmAction, setPendingConfirmAction] = useState(null);
  const [memberToEdit, setMemberToEdit] = useState(null);
  const [defaultRoleForAddModal, setDefaultRoleForAddModal] = useState('');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [tabFilters, setTabFilters] = useState(() =>
    mergeStoredCenterDetailTeamTabFilters(CENTER_DETAIL_TEAM_FILTER_DEFAULTS),
  );
  const [filterCount, setFilterCount] = useState(0);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [roleOptions, setRoleOptions] = useState([]);
  const [rolesMessage, setRolesMessage] = useState({});
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [lockZoneToCenter, setLockZoneToCenter] = useState(false);
  const filterDropdownRef = useRef(null);
  const teamTableRef = useRef(null);
  const tabFiltersHydratedRef = useRef(false);

  const teamFiltersStorageKey = centerId
    ? `${CENTER_DETAIL_TEAM_VIEW_FILTERS_KEY}-${centerId}`
    : null;

  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: teamFiltersStorageKey,
    defaultFilters: CENTER_DETAIL_TEAM_FILTER_DEFAULTS,
    compactFilters: compactCenterDetailTeamTabFiltersForStorage,
  });

  const coreTeamData = useSelector((state) => state.teamManagement.coreTeamData);
  const supportTeamData = useSelector((state) => state.teamManagement.supportTeamData);
  const dispatch = useDispatch();
  const isCoreTeam = activeTab === 'core_team';

  // Hydrate center teams configuration dynamically from backend API on mount
  useEffect(() => {
    if (!centerId) return;
    fetchCenterTeamsConfigApi(centerId)
      .then((data) => {
        const rows = Array.isArray(data) ? data : [];
        saveCenterTeamsConfig(centerId, rows);
      })
      .catch(() => {});
  }, [centerId]);

  const appliedFilters = useMemo(
    () => tabFilters[activeTab] ?? DEFAULT_TEAM_APPLIED_FILTERS,
    [tabFilters, activeTab],
  );

  // Re-hydrate when navigating to a different center
  useEffect(() => {
    setFiltersInitialized(false);
    tabFiltersHydratedRef.current = false;
  }, [teamFiltersStorageKey]);

  // 1. Initialize from session persistence (per center, per tab)
  useEffect(() => {
    if (!teamFiltersStorageKey || filtersInitialized) return;
    setTabFilters(mergeStoredCenterDetailTeamTabFilters(persistedFilters));
    tabFiltersHydratedRef.current = true;
    setFiltersInitialized(true);
  }, [teamFiltersStorageKey, persistedFilters, filtersInitialized]);

  // 2. Persist tab filter changes (skip the echo right after hydrate)
  useEffect(() => {
    if (!teamFiltersStorageKey || !filtersInitialized) return;
    if (tabFiltersHydratedRef.current) {
      tabFiltersHydratedRef.current = false;
      return;
    }
    setPersistedFilters(compactCenterDetailTeamTabFiltersForStorage(tabFilters));
  }, [teamFiltersStorageKey, tabFilters, filtersInitialized, setPersistedFilters]);

  useEffect(() => {
    setIsFilterDropdownOpen(false);
  }, [activeTab]);

  useEffect(() => {
    const roleCount = appliedFilters.role?.length ?? 0;
    const statusCount = isCoreTeam ? (appliedFilters.status?.length ?? 0) : 0;
    setFilterCount(roleCount + statusCount);
  }, [appliedFilters, isCoreTeam]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const apiFilters = useMemo(
    () =>
      buildTeamListviewFilters(appliedFilters, {
        fixedCenter: centerId,
        includeStatus: isCoreTeam,
      }),
    [centerId, appliedFilters, isCoreTeam],
  );

  const roleTypeMap = useMemo(() => buildRoleNameToTypeMap(rolesMessage), [rolesMessage]);

  const refetchTeam = useCallback(async () => {
    if (!centerId || !filtersInitialized) return;
    try {
      const freshApiFilters = buildTeamListviewFilters(
        tabFilters[activeTab] ?? DEFAULT_TEAM_APPLIED_FILTERS,
        {
          fixedCenter: centerId,
          includeStatus: activeTab === 'core_team',
        },
      );
      const freshKeyword = searchKeyword.trim();

      let result = null;
      if (activeTab === 'core_team') {
        result = await dispatch(
          fetchCoreTeamData({
            keyword: freshKeyword,
            filters: freshApiFilters,
            page: 1,
            page_size: 500,
          }),
        ).unwrap();
      } else {
        result = await dispatch(
          fetchSupportTeamData({
            keyword: freshKeyword,
            filters: freshApiFilters,
            page: 1,
            page_size: 500,
          }),
        ).unwrap();
      }
      dispatch(getCenterDetailsThunk(centerId));
      return result;
    } catch (error) {
      showErrorToast(error);
    }
  }, [centerId, dispatch, filtersInitialized, tabFilters, activeTab, searchKeyword]);

  useEffect(() => {
    refetchTeam();
  }, [refetchTeam]);

  useEffect(() => {
    const group = isCoreTeam ? 'core' : 'support';
    dispatch(fetchRolesWithType({ group }))
      .unwrap()
      .then((res) => {
        const message = res?.message ?? {};
        setRolesMessage(message);
        const options = Object.values(message).flatMap((roles) =>
          Array.isArray(roles) ? roles : [],
        );
        setRoleOptions(options);
      })
      .catch(() => {
        setRolesMessage({});
        setRoleOptions([]);
      });
  }, [dispatch, isCoreTeam]);

  const listviewResults = isCoreTeam ? coreTeamData?.data : supportTeamData?.data;

  const sections = useMemo(() => {
    // Reuse the same grouping logic from CenterViewTeamTable
    const flattenListviewResults = (rawResults) => {
      if (Array.isArray(rawResults)) return rawResults;
      if (rawResults && typeof rawResults === 'object') {
        return Object.values(rawResults).flatMap((value) => (Array.isArray(value) ? value : []));
      }
      return [];
    };

    const normalizeListviewMember = (row, isCoreTeam) => ({
      ...row,
      team_member_id: row.team_member_id ?? row.employee_id ?? row.email,
      team_type: row.team_type || (isCoreTeam ? 'User' : 'Employee'),
      email: row.email ?? row.personal_email ?? row.company_email ?? row.prefered_email ?? '',
      mobile_no: row.mobile_no ?? row.cell_number ?? '',
      cell_number: row.cell_number ?? row.mobile_no ?? '',
    });

    const normalizeTeamSections = (data) => {
      const EMPTY_SECTIONS = Object.freeze({});
      if (!data) return EMPTY_SECTIONS;
      if (Array.isArray(data)) {
        return data.length > 0 ? { 'Team Members': data } : EMPTY_SECTIONS;
      }
      if (typeof data === 'object') {
        return Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, Array.isArray(value) ? value : []]),
        );
      }
      return EMPTY_SECTIONS;
    };

    const groupListviewResultsByRoleType = (rawResults, roleTypeMap = {}, isCoreTeam = true) => {
      const rows = flattenListviewResults(rawResults);
      const groups = {};
      const seen = new Set();

      for (const row of rows) {
        const member = normalizeListviewMember(row, isCoreTeam);
        const dedupeKey = `${member.team_member_id ?? ''}:${member.role ?? ''}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const sectionKey = roleTypeMap[member.role] || member.role || 'Team Members';
        if (!groups[sectionKey]) groups[sectionKey] = [];
        groups[sectionKey].push(member);
      }

      return normalizeTeamSections(groups);
    };

    return groupListviewResultsByRoleType(listviewResults, roleTypeMap, !isCoreTeam);
  }, [listviewResults, roleTypeMap, isCoreTeam]);
  const tableId = isCoreTeam ? CENTER_VIEW_CORE_TEAM_TABLE_ID : CENTER_VIEW_SUPPORT_TEAM_TABLE_ID;
  const defaultColumns = isCoreTeam
    ? CENTER_VIEW_CORE_TEAM_DEFAULT_COLUMNS
    : CENTER_VIEW_SUPPORT_TEAM_DEFAULT_COLUMNS;

  const fetchColumnConfig = useCallback(async () => {
    if (!isCoreTeam) return defaultColumns;
    const data = await dispatch(getCoreTeamColumnPreferencesThunk()).unwrap();
    const parsed = parseTeamColumnPrefResponse(data, { excludeIds: ['center'] });
    return parsed.length > 0 ? parsed : defaultColumns;
  }, [defaultColumns, dispatch, isCoreTeam]);

  const persistColumnConfig = useCallback(
    async (cols) => {
      if (!isCoreTeam) return cols;
      await dispatch(saveCoreTeamColumnPreferencesThunk(cols)).unwrap();
      const data = await dispatch(getCoreTeamColumnPreferencesThunk()).unwrap();
      const parsed = parseTeamColumnPrefResponse(data, { excludeIds: ['center'] });
      return parsed.length > 0 ? parsed : defaultColumns;
    },
    [defaultColumns, dispatch, isCoreTeam],
  );

  const handleFiltersChange = useCallback(
    (_filtersArray, localFilters) => {
      setTabFilters((previous) => ({
        ...previous,
        [activeTab]: {
          center: [],
          status: localFilters?.status ?? [],
          role: localFilters?.role ?? [],
        },
      }));
    },
    [activeTab],
  );

  const handleClearFilters = useCallback(
    (event) => {
      event.stopPropagation();
      setTabFilters((previous) => ({
        ...previous,
        [activeTab]: { ...DEFAULT_TEAM_APPLIED_FILTERS },
      }));
      setFilterCount(0);
      setIsFilterDropdownOpen(false);
    },
    [activeTab],
  );

  const handleRemoveClick = useCallback((item) => {
    setMemberToRemove(item);
    setRemoveModalOpen(true);
  }, []);

  const handleEditClick = useCallback((item) => {
    setMemberToEdit(item);
    setLockZoneToCenter(true);
    setAddEditModalOpen(true);
  }, []);

  const handleAddMemberClick = useCallback(() => {
    setMemberToEdit(null);
    setLockZoneToCenter(false);
    if (activeTab === 'support_team') {
      setLinkModalOpen(false);
      setDefaultRoleForAddModal('');
      setAddEditModalOpen(true);
    } else {
      setLinkModalOpen(true);
    }
  }, [activeTab]);

  const handleOpenAddNewMember = useCallback((selectedRole = '') => {
    setLinkModalOpen(false);
    setMemberToEdit(null);
    setDefaultRoleForAddModal(selectedRole || '');
    setLockZoneToCenter(true);
    setAddEditModalOpen(true);
  }, []);

  const handleLinkSubmit = useCallback(
    async ({ role, team_member_id }) => {
      if (!centerId) return;
      setLinkLoading(true);
      try {
        const team_type = activeTab === 'core_team' ? 'User' : 'Employee';
        await dispatch(
          linkCenterTeamMemberThunk({
            center: centerId,
            team_type,
            role,
            team_member_id,
          }),
        ).unwrap();
        showSuccessToast('Team member linked to center successfully.');
        setLinkModalOpen(false);
        await refetchTeam();

        if (activeTab === 'support_team') {
          const maxCount = getRoleMaxLimit(centerId, role);
          if (maxCount !== null && maxCount !== undefined) {
            const currentCount = getRoleCurrentCount(role, coreTeamData, supportTeamData);
            if (currentCount >= maxCount) {
              setPendingMaxCount(maxCount);
              setPendingConfirmAction(null);
              setMaxLimitModalOpen(true);
            }
          }
        }
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Failed to link team member to center. Please try again.',
        });
      } finally {
        setLinkLoading(false);
      }
    },
    [centerId, activeTab, dispatch, refetchTeam, coreTeamData, supportTeamData],
  );

  const handleMaxLimitReached = useCallback(
    (payload) => {
      if (payload?.showAfterAdd) {
        setPendingMaxCount(payload.maxCount);
        setPendingConfirmAction(null);
        setMaxLimitModalOpen(true);
      } else if (payload?.proceedSubmit) {
        setPendingMaxCount(payload.maxCount);
        setPendingConfirmAction(() => payload.proceedSubmit);
        setMaxLimitModalOpen(true);
      } else if (payload?.role && payload?.team_member_id) {
        setPendingMaxCount(payload.maxCount);
        setPendingConfirmAction(() => () => handleLinkSubmit(payload));
        setMaxLimitModalOpen(true);
      }
    },
    [handleLinkSubmit],
  );

  const handleConfirmMaxLimitWarning = useCallback(() => {
    if (typeof pendingConfirmAction === 'function') {
      pendingConfirmAction();
    }
    setPendingConfirmAction(null);
    setPendingMaxCount(null);
  }, [pendingConfirmAction]);

  const handleRemoveConfirm = useCallback(async () => {
    if (!memberToRemove || !centerId) return;
    setRemoveLoading(true);
    try {
      const team_type = isCoreTeam ? 'User' : 'Employee';
      const team_member_id =
        memberToRemove.team_member_id ??
        (isCoreTeam ? memberToRemove.email : memberToRemove.employee_id);
      await dispatch(
        unlinkCenterTeamMemberThunk({
          center: centerId,
          team_member_id,
          team_type,
        }),
      ).unwrap();
      showSuccessToast('Team member removed successfully.');
      setRemoveModalOpen(false);
      setMemberToRemove(null);
      refetchTeam();
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Failed to remove team member. Please try again.',
      });
    } finally {
      setRemoveLoading(false);
    }
  }, [memberToRemove, centerId, dispatch, isCoreTeam, refetchTeam]);

  return (
    <div className='w-full h-full flex gap-6 flex-col'>
      <div className='w-full flex items-center justify-between'>
        <div className='flex items-center'>
          <ButtonGroup.Root>
            <ButtonGroup.Item
              onClick={() => setActiveTab('core_team')}
              data-state={activeTab === 'core_team' ? 'on' : 'off'}
              className='data-[state=on]:bg-primary-lighter data-[state=on]:border-primary-base data-[state=on]:z-1 data-[state=on]:border-1'
            >
              Core Team
            </ButtonGroup.Item>
            <ButtonGroup.Item
              onClick={() => setActiveTab('support_team')}
              data-state={activeTab === 'support_team' ? 'on' : 'off'}
              className='data-[state=on]:bg-primary-lighter data-[state=on]:ring-1 data-[state=on]:z-1 data-[state=on]:ring-primary-base'
            >
              Support Team
            </ButtonGroup.Item>
          </ButtonGroup.Root>
        </div>

        <div className=' flex gap-2 items-center'>
          <Input.Root size='xsmall'>
            <Input.Wrapper>
              <Input.Icon>
                <RiSearchLine />
              </Input.Icon>
              <Input.Input
                placeholder='Search'
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </Input.Wrapper>
          </Input.Root>

          <Popover.Root
            open={isFilterDropdownOpen}
            onOpenChange={(open) => {
              const wasOpen = isFilterDropdownOpen;
              setIsFilterDropdownOpen(open);
              if (wasOpen && !open && filterDropdownRef.current) {
                filterDropdownRef.current.handleClose();
              }
            }}
          >
            <Filter.TriggerButton
              filterCount={filterCount}
              onClear={handleClearFilters}
              tooltipContent='Filter'
              ariaLabel='Filter team members'
            />
            <TeamFilterDropdown
              key={activeTab}
              ref={filterDropdownRef}
              open={isFilterDropdownOpen}
              setFilterCount={setFilterCount}
              onOpenChange={setIsFilterDropdownOpen}
              onFiltersChange={handleFiltersChange}
              appliedFilters={appliedFilters}
              showCenterTab={false}
              showStatusTab={isCoreTeam}
              roleOptions={roleOptions}
            />
          </Popover.Root>

          <ColumnManagerDropdown
            open={isColumnManagerOpen}
            onOpenChange={setIsColumnManagerOpen}
            config={teamTableRef.current?.columnConfigHook}
            tooltipContent={<p>Column Manager</p>}
            trigger={
              <Button.Root variant='neutral' mode='stroke' size='xsmall' aria-label='Columns'>
                <Button.Icon as={RiLayoutColumnLine} />
              </Button.Root>
            }
          />

          <Button.Root className='gap-2' size='xsmall' onClick={handleAddMemberClick}>
            <Button.Icon size={20} as={RiAddLine} />
            Add Member
          </Button.Root>
        </div>
      </div>

      <CenterViewTeamTable
        key={activeTab}
        ref={teamTableRef}
        centerId={centerId}
        listviewResults={listviewResults}
        roleTypeMap={roleTypeMap}
        teamScope={activeTab}
        tableId={tableId}
        defaultColumns={defaultColumns}
        fetchColumnConfig={isCoreTeam ? fetchColumnConfig : undefined}
        persistColumnConfig={isCoreTeam ? persistColumnConfig : undefined}
        onEditMember={handleEditClick}
        onRemoveMember={handleRemoveClick}
      />

      <RemoveCenterTeamMemberModal
        isOpen={removeModalOpen}
        onOpenChange={(open) => {
          setRemoveModalOpen(open);
          if (!open) setMemberToRemove(null);
        }}
        onConfirm={handleRemoveConfirm}
        isLoading={removeLoading}
      />

      <CenterLinkTeamModal
        centerId={centerId}
        isOpen={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        scope={activeTab}
        onSubmit={handleLinkSubmit}
        isLoading={linkLoading}
        onOpenAddNewMember={handleOpenAddNewMember}
        onMaxLimitReached={handleMaxLimitReached}
      />

      <AddEditCenterTeamMemberModal
        isOpen={addEditModalOpen}
        onOpenChange={(open) => {
          setAddEditModalOpen(open);
          if (!open) {
            setMemberToEdit(null);
            setDefaultRoleForAddModal('');
            setLockZoneToCenter(false);
          }
        }}
        centerId={centerId}
        scope={activeTab}
        editData={memberToEdit}
        defaultRole={defaultRoleForAddModal}
        lockZoneToCenter={lockZoneToCenter}
        onTeamUpdated={refetchTeam}
        onMaxLimitReached={handleMaxLimitReached}
      />

      <MaxTeamLimitModal
        isOpen={maxLimitModalOpen}
        onOpenChange={setMaxLimitModalOpen}
        maxCount={pendingMaxCount}
        centerId={centerId}
        onConfirm={handleConfirmMaxLimitWarning}
      />
    </div>
  );
};

export default CenterViewTeamAssociated;
