import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { RiGroupLine, RiTeamLine } from 'react-icons/ri';

import PageLayout from '@/components/page-layout';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import { useTableVariant } from '@/hooks/use-table-variant';
import { useWidgetVisibility } from '@/hooks/use-widget-visibility';
import { selectCenterAccess, setSelectedCenters, fetchCenterAccess } from '@/redux/centerSlice';
import {
  adaptGlobalCenterIntent,
  deriveGlobalCenterIntent,
  isExplicitlyEmptyIntent,
  isLoadingIntent,
} from '@/utils/global-center-filter';

import {
  TeamStats,
  TeamStatusTabs,
  TeamToolbar,
  TeamTable,
  DEFAULT_TEAM_FILTERS,
  TEAM_STATUS_TAB_OPTIONS,
} from '@/components/team-management';
import WidgetVisibilityDropdown from '@/components/ui/widget-visibility-dropdown';
import { MOCK_TEAM_DATA } from '@/constants/constants';
import {
  setAddTeamMemberModal,
  selectAddTeamMemberModal,
  deleteTeamMemberThunk,
  fetchCoreTeamData,
  fetchSupportTeamData,
} from '@/redux/teamManagementSlice';
import AddUserTeamManagementModal from '@/components/team-management/add-user-team-management-modal';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const getTabValueFromPath = (pathname) => {
  if (pathname.startsWith('/team-management/support_team')) return 'support';
  if (pathname.startsWith('/team-management/core_team')) return 'core';

  const tab = TEAM_STATUS_TAB_OPTIONS.find((t) => t.path === pathname);
  return tab ? tab.value : 'centers';
};

const TeamManagement = () => {
  const location = useLocation();
  const centerAccess = useSelector(selectCenterAccess);
  const addTeamMemberModal = useSelector(selectAddTeamMemberModal);
  const dispatch = useDispatch();
  const tabFromUrl = getTabValueFromPath(location.pathname);
  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_TEAM_FILTERS,
    status: getTabValueFromPath(window.location.pathname),
  }));
  const [sorting, setSorting] = useState([]);
  const [groupBy, setGroupBy] = useState('');
  const [apiFilters, setApiFilters] = useState([]);
  const [appliedFilters, setAppliedFilters] = useState({
    center: [],
    status: [],
    role: [],
  });

  const tabCounts = useSelector((state) => state.teamManagement.teamManagementTabCounts.data);
  const supportTeamLastParams = useSelector((state) => state.teamManagement.supportTeamLastParams);
  // console.log('tabCounts', tabCounts);

  const globalCenterIntent = useMemo(() => deriveGlobalCenterIntent(centerAccess), [centerAccess]);
  const headerScope = useMemo(
    () => adaptGlobalCenterIntent.teamMember(globalCenterIntent),
    [globalCenterIntent],
  );
  // Team Management tabs use their own toolbar filters — not the global navbar
  // centre header (shared with Ticket Management, Spaces, etc.).
  // const noCenters = useMemo(
  //   () => isExplicitlyEmptyIntent(globalCenterIntent),
  //   [globalCenterIntent],
  // );
  const noCenters = false;
  const centerAccessLoading = useMemo(
    () => isLoadingIntent(globalCenterIntent),
    [globalCenterIntent],
  );

  const teamTableRef = useRef(null);

  useEffect(() => {
    if (centerAccess.status === 'idle') {
      dispatch(fetchCenterAccess());
    }
  }, [dispatch, centerAccess.status]);

  const handleGlobalCenterChange = useCallback(
    (selectedCenters) => {
      dispatch(setSelectedCenters(selectedCenters));
    },
    [dispatch],
  );

  // Keep active tab in sync with URL (e.g. /team-management/core_team → core)
  useEffect(() => {
    setFilters((previous) =>
      previous.status === tabFromUrl ? previous : { ...previous, status: tabFromUrl },
    );
  }, [tabFromUrl]);

  // APIs are now called only by the active tab component (Centers, Core Team, or Support Team)
  // when that tab is visible, to avoid fetching all three on every load.

  // Table variant management with localStorage persistence
  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'team-management-table',
    'compact',
  );

  // Widget visibility management with localStorage persistence
  const { widgetVisibility, toggleWidget, hideAllWidgets, WIDGET_KEYS } =
    useWidgetVisibility('team-management-widgets');
  const [isWidgetVisibilityOpen, setIsWidgetVisibilityOpen] = useState(false);

  // Stats from API response based on active tab
  const stats = useMemo(() => {
    const roleTypeStats = tabCounts?.role_type_stats ?? {};
    const getCount = (key) => roleTypeStats[key]?.count ?? 0;
    const getDetails = (key) => roleTypeStats[key]?.details ?? null;

    if (filters.status === 'core') {
      // Core team stats
      return [
        { key: 'crm', label: 'CRM', value: getCount('CRM Team') },
        { key: 'fm', label: 'FM', value: getCount('Facility Team') },
        { key: 'sales', label: 'Sales', value: getCount('Sales') },
        { key: 'mst', label: 'MST', value: getCount('MST') },
        {
          key: 'others',
          label: 'Others',
          value: getCount('Others'),
          details: getDetails('Others'),
        },
      ];
    } else if (filters.status === 'support') {
      // Support team stats
      return [
        { key: 'on_time', label: 'On time', value: getCount('On time') },
        { key: 'not_on_time', label: 'Not on time', value: getCount('Not on time') },
        { key: 'out_of_office', label: 'Out of office', value: getCount('Out of office') },
        {
          key: 'not_checked_in_yet',
          label: 'Not checked in yet',
          value: getCount('Not checked in yet'),
        },
      ];
    }
    // Center tab: original stats
    return [
      { key: 'crm', label: 'CRM', value: getCount('CRM Team') },
      { key: 'fm', label: 'FM', value: getCount('Facility Team') },
      { key: 'hk', label: 'HK', value: getCount('Housekeeping') },
      { key: 'security', label: 'Security', value: getCount('Security') },
      { key: 'mst', label: 'MST', value: getCount('MST') },
    ];
  }, [tabCounts?.role_type_stats, filters.status]);

  // Calculate counts for tabs
  // const counts = useMemo(() => {
  //   return tabCounts;
  // }, []);

  // Filter data based on current filters
  const filteredTeamMembers = useMemo(() => {
    let filtered = [...MOCK_TEAM_DATA];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (member) =>
          member.name.toLowerCase().includes(searchLower) ||
          member.email.toLowerCase().includes(searchLower) ||
          member.center.toLowerCase().includes(searchLower) ||
          member.role.toLowerCase().includes(searchLower),
      );
    }

    // Apply status tab filter
    if (filters.status && filters.status !== 'all') {
      // For demo purposes, just return filtered list
      // In real app, you would filter by status
    }

    // Apply API filters (center, status, role)
    if (appliedFilters.center && appliedFilters.center.length > 0) {
      filtered = filtered.filter((member) => appliedFilters.center.includes(member.center));
    }

    if (appliedFilters.status && appliedFilters.status.length > 0) {
      filtered = filtered.filter((member) => appliedFilters.status.includes(member.status));
    }

    if (appliedFilters.role && appliedFilters.role.length > 0) {
      filtered = filtered.filter((member) => appliedFilters.role.includes(member.role));
    }

    return filtered;
  }, [filters, appliedFilters]);

  const handleStatusTabChange = useCallback((value) => {
    setFilters((previous) => ({ ...previous, status: value }));
  }, []);

  const handleSearchChange = useCallback((value) => {
    setFilters((previous) => ({ ...previous, search: value }));
  }, []);

  const handleRowSelect = useCallback((row) => {
    // Navigate to member detail or open drawer
  }, []);

  const handleSortingChange = useCallback((newSorting) => {
    setSorting(newSorting);
  }, []);

  const handleAddMember = useCallback(() => {
    dispatch(setAddTeamMemberModal({ isOpen: true, editData: null, source: filters.status }));
  }, [dispatch, filters.status]);

  const handleCloseAddMemberModal = useCallback(() => {
    dispatch(setAddTeamMemberModal(false));
  }, [dispatch]);

  const handleEditCoreTeam = useCallback(
    (member) => {
      dispatch(
        setAddTeamMemberModal({
          isOpen: true,
          editData: { ...member, team_type: 'User' },
          source: 'core',
        }),
      );
    },
    [dispatch],
  );

  const handleEditSupportTeam = useCallback(
    (member) => {
      dispatch(
        setAddTeamMemberModal({
          isOpen: true,
          editData: { ...member, team_type: 'Employee' },
          source: 'support',
        }),
      );
    },
    [dispatch],
  );

  const handleDeleteCoreTeam = useCallback(
    async (member) => {
      if (!member?.email) return;
      try {
        await dispatch(
          deleteTeamMemberThunk({
            team_member_id: member.email,
            team_type: 'User',
          }),
        ).unwrap();
        showSuccessToast('Team member removed successfully.');
        await dispatch(fetchCoreTeamData()).unwrap();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to remove team member.' });
      }
    },
    [dispatch],
  );

  const handleDeleteSupportTeam = useCallback(
    async (member, refetchWithFilters) => {
      const id = member?.team_member_id ?? member?.employee_id;
      if (!id) return;
      try {
        await dispatch(
          deleteTeamMemberThunk({
            team_member_id: id,
            team_type: 'Employee',
          }),
        ).unwrap();
        showSuccessToast('Team member removed successfully.');
        await (typeof refetchWithFilters === 'function'
          ? refetchWithFilters()
          : dispatch(
              fetchSupportTeamData({
                filters: supportTeamLastParams?.filters ?? [],
                month: supportTeamLastParams?.month ?? undefined,
                year: supportTeamLastParams?.year ?? undefined,
                from_date: supportTeamLastParams?.from_date ?? undefined,
                to_date: supportTeamLastParams?.to_date ?? undefined,
                // ...(supportTeamLastParams?.navbar_filter != null
                //   ? { navbar_filter: supportTeamLastParams.navbar_filter }
                //   : {}),
              }),
            ).unwrap());
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to remove team member.' });
      }
    },
    [dispatch],
  );

  const handleExport = useCallback(() => {
    // Export to CSV or Excel
  }, []);

  const handleGroupByChange = useCallback((value) => {
    setGroupBy(value);
    // Handle group by logic here
  }, []);

  const handleFiltersChange = useCallback((filtersArray, filterValues) => {
    const nextApiFilters = filtersArray || [];
    const nextAppliedFilters = filterValues || {};

    setApiFilters(nextApiFilters);
    setAppliedFilters(nextAppliedFilters);
  }, []);

  // Determine context for empty states
  const context = useMemo(() => {
    const hasSearch = Boolean(filters.search);
    const hasStatusTab = filters.status && filters.status !== 'all';

    if (hasSearch || hasStatusTab) {
      return 'search';
    }

    return 'default';
  }, [filters]);

  return (
    <>
      <PageLayout
        contentAreaClassName='overflow-hidden'
        pageTitle='Team Management'
        pageIcon={<RiGroupLine size={24} />}
        pageDescription='Manage team members across the centers.'
        headerActions={
          <div className='flex items-center gap-3'>
            <WidgetVisibilityDropdown
              open={isWidgetVisibilityOpen}
              onOpenChange={setIsWidgetVisibilityOpen}
              widgetVisibility={widgetVisibility}
              onToggleWidget={toggleWidget}
              onHideAll={hideAllWidgets}
              tooltipContent={<p>Widget Visibility</p>}
            />
            <CenterAccessDropdown
              centers={centerAccess.data}
              selectedCenters={centerAccess.selectedCenters}
              onChange={handleGlobalCenterChange}
              isLoading={centerAccess.status === 'loading'}
            />
          </div>
        }
      >
        <div className='flex flex-col gap-6 px-8 pb-6 flex-1 min-h-0 mt-5'>
          {widgetVisibility[WIDGET_KEYS.STATS] && <TeamStats stats={stats} />}

          <TeamStatusTabs
            value={filters.status}
            counts={tabCounts}
            onValueChange={handleStatusTabChange}
            hideBorderTop={!widgetVisibility[WIDGET_KEYS.STATS]}
            teamMembers={MOCK_TEAM_DATA}
            isLoading={false}
            error={null}
            onRetry={() => {}}
            onRowSelect={handleRowSelect}
            onEditCoreTeam={handleEditCoreTeam}
            onEditSupportTeam={handleEditSupportTeam}
            onDeleteCoreTeam={handleDeleteCoreTeam}
            onDeleteSupportTeam={handleDeleteSupportTeam}
            onAddMember={handleAddMember}
            onExport={handleExport}
            tableVariant={tableVariant}
            onTableVariantToggle={toggleTableVariant}
            widgetVisibility={widgetVisibility}
            WIDGET_KEYS={WIDGET_KEYS}
            noCenters={noCenters}
            headerScope={headerScope}
            centerAccessLoading={centerAccessLoading}
          />
        </div>
      </PageLayout>

      <AddUserTeamManagementModal
        isOpen={addTeamMemberModal.isOpen}
        onOpenChange={handleCloseAddMemberModal}
      />
    </>
  );
};

export default TeamManagement;
