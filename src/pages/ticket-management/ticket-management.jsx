import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { RiSettings2Line } from 'react-icons/ri';
import { useDebounce } from '@/hooks/use-debounce';
import { useTableVariant } from '@/hooks/use-table-variant';
import { useWidgetVisibility } from '@/hooks/use-widget-visibility';
import { useSocket } from '@/hooks/use-socket';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { isClient, isFacilityManager } from '@/constants/users-constants';

import PageLayout from '@/components/page-layout';
import CenterAccessDropdown from '@/components/center-access-dropdown';
import {
  TicketStats,
  TicketToolbar,
  TicketStatusFilters,
  TicketTable,
  TICKET_QUICK_STATUS_FILTER_OPTIONS,
  TicketCreateDrawer,
  TicketViewDrawer,
  TicketStatusTabs,
  DeleteTicketModal,
  VoiceModal,
  STATUS_TAB_OPTIONS,
  DEFAULT_FILTERS,
  TICKET_VIEW_FILTERS_STORAGE_COMPACT_OPTS,
  mergeStoredTicketViewFilters,
} from '@/components/ticket-management';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';
import WidgetVisibilityDropdown from '@/components/ui/widget-visibility-dropdown';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import { getModulePermissions } from '@/utils/user-role-utils';
import WithModulePermission from '@/route-protection/with-module-permission';
import { showErrorToast, showSuccessToast, extractErrorMessage } from '@/utils/error-utils';
import {
  addTicketComment,
  sendTicketEmail,
  createTicket,
  fetchTicketComments,
  fetchTicketDetail,
  fetchTickets,
  fetchTicketDropdownData,
  fetchTicketStats,
  fetchTicketStatusCounts,
  selectTicketList,
  selectTicketMutations,
  selectTicketDropdownData,
  selectTicketStats,
  selectTicketStatusCounts,
  exportTickets,
  setTicketFilters,
  setTicketPage,
  setTicketPageSize,
  setTicketSorting,
  resetTicketList,
  updateTicketField,
  updateTicketFromSocket,
  refreshTicketDetailFromSocket,
  deleteTicket,
  DEFAULT_TICKET_LIST_PAGE_SIZE,
} from '@/redux/ticketManagementSlice';
import { selectCenterAccess, setSelectedCenters } from '@/redux/centerSlice';
import {
  GLOBAL_CENTER_STATUS,
  adaptGlobalCenterIntent,
  deriveGlobalCenterIntent,
  isExplicitlyEmptyIntent,
  isLoadingIntent,
} from '@/utils/global-center-filter';

const TicketManagement = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { ticketId: ticketIdFromPath } = useParams();
  const [searchParams] = useSearchParams();
  const list = useSelector(selectTicketList);
  const mutations = useSelector(selectTicketMutations);
  const dropdownData = useSelector(selectTicketDropdownData);
  const statsState = useSelector(selectTicketStats);
  const statusCountsState = useSelector(selectTicketStatusCounts);
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const centerAccess = useSelector(selectCenterAccess);
  const { user: currentUser } = useAuth();
  const roleMap = userSideBarPerm?.data?.message?.role;
  const isClientUser = isClient(roleMap);
  const isFacilityManagerUser = isFacilityManager(roleMap);

  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [voiceTicketJson, setVoiceTicketJson] = useState(null);
  const [allCentersSelected, setAllCentersSelected] = useState(false);
  const ticketTableRef = useRef(null);
  const isApplyingFilterFromModalRef = useRef(false);
  const centerSyncFromSelectionRef = useRef(false);
  /**
   * Tracks whether the *user* explicitly cleared every centre via the popover. The
   * filter→selection sync below normally treats `filters.center === []` as a shorthand
   * for "all centres" and re-checks every box, which would silently revert the user's
   * intentional deselect on the next render. Setting this ref tells that effect to
   * leave the empty selection alone until the user picks at least one centre again.
   */
  const userExplicitDeselectAllRef = useRef(false);
  /** After session hydrate, skip N passes of centerAccess→ticket filter sync so global "All" does not overwrite persisted `center` and clear sessionStorage. Incremented each hydrate run (Strict Mode may run twice). */
  const skipCenterIntentTicketSyncPassesRef = useRef(0);

  // Table variant management with localStorage persistence
  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'ticket-management-table',
    'compact',
  );

  // Widget visibility management with localStorage persistence
  const { widgetVisibility, toggleWidget, hideAllWidgets, WIDGET_KEYS } = useWidgetVisibility(
    'ticket-management-widgets',
  );
  const [isWidgetVisibilityOpen, setIsWidgetVisibilityOpen] = useState(false);

  const currentFilters = list.filters || DEFAULT_FILTERS;

  // --- FIX START: Local Search State & Debounce ---

  // 1. Initialize local state with current Redux value to keep UI in sync on load
  const [searchTerm, setSearchTerm] = useState(currentFilters.search || '');

  // 2. Debounce the local state
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const isDebouncing = searchTerm !== debouncedSearchTerm;

  // 3. Sync local changes to Redux only after debounce
  useEffect(() => {
    // Check if the value actually changed to avoid infinite loops or unnecessary dispatches
    if (debouncedSearchTerm !== (currentFilters.search || '')) {
      dispatch(setTicketFilters({ search: debouncedSearchTerm }));
    }
  }, [debouncedSearchTerm, dispatch, currentFilters.search]);

  // 4. Update local state immediately on user input
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  // --- FIX END ---

  // Get API-based permissions for HD Ticket module
  const ticketModulePermissions = useMemo(() => {
    return getModulePermissions(userSideBarPerm, 'HD Ticket');
  }, [userSideBarPerm]);

  const defaultPermissions = useMemo(() => {
    return {
      scope: 'self',
      canAssign: false,
      canChangeStatus: false,
      canAddInternalComment: false,
      canAddClientComment: false,
      canUploadAttachment: false,
      canResolve: false,
      canClose: false,
      canViewAnalytics: false,
      canEscalate: false,
    };
  }, []);

  const permissions = useMemo(() => {
    if (!ticketModulePermissions) {
      return {
        ...defaultPermissions,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExport: false,
        canViewAll: false,
      };
    }

    return {
      ...defaultPermissions,
      canCreate: ticketModulePermissions.create === true,
      canEdit: ticketModulePermissions.write === true,
      canDelete: ticketModulePermissions.delete === true,
      canExport: ticketModulePermissions.export === true,
      canViewAll: ticketModulePermissions.read === true,
    };
  }, [ticketModulePermissions, defaultPermissions]);

  // Create filters for API calls
  // Note: We use currentFilters directly now because currentFilters is updated via the debounce effect
  const apiFilters = useMemo(() => {
    return {
      ...currentFilters,
    };
  }, [currentFilters]);

  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: `ticket-management-view-filter-dropdown`,
    defaultFilters: DEFAULT_FILTERS,
    persistExcludeKeys: ['search', 'client'],
    persistTruthyObjectKeys: ['dateRange'],
  });

  // Memoize filters string for dependency comparison
  const filtersString = useMemo(() => JSON.stringify(apiFilters), [apiFilters]);

  const lastApiCallRef = useRef('');
  const lastFiltersRef = useRef('');
  const lastSortingRef = useRef('');
  const isScrollPaginationRef = useRef(false);

  // Reset per-page to module default when opening Ticket Management (shared Redux list state).
  useEffect(() => {
    dispatch(setTicketPageSize(DEFAULT_TICKET_LIST_PAGE_SIZE));
  }, [dispatch]);

  // Reset list when filters or sorting change
  useEffect(() => {
    const currentFiltersString = filtersString;
    const currentSortingString = JSON.stringify(list.sorting || []);

    const filtersChanged =
      lastFiltersRef.current !== currentFiltersString && lastFiltersRef.current !== '';
    const sortingChanged =
      lastSortingRef.current !== currentSortingString && lastSortingRef.current !== '';

    if (filtersChanged || sortingChanged) {
      dispatch(resetTicketList());
      lastApiCallRef.current = '';
      isScrollPaginationRef.current = false;
    }

    lastFiltersRef.current = currentFiltersString;
    lastSortingRef.current = currentSortingString;
  }, [dispatch, filtersString, list.sorting]);

  // Fetch ticket list
  useEffect(() => {
    // Don't fetch until filters are initialized (prevents fetch during client filter clearing)
    if (!filtersInitialized) {
      return;
    }

    if (ticketModulePermissions && ticketModulePermissions.read !== true) {
      return;
    }

    if (isScrollPaginationRef.current && list.page > 1) {
      isScrollPaginationRef.current = false;
      return;
    }

    let orderBy = 'modified desc';
    if (list.sorting && list.sorting.length > 0) {
      const sortField = list.sorting[0].id;
      const sortOrder = list.sorting[0].desc ? 'desc' : 'asc';
      orderBy = `${sortField} ${sortOrder}`;
    }

    const callKey = `${filtersString}-${list.page}-${list.pageSize}-${orderBy}`;

    if (lastApiCallRef.current === callKey) {
      return;
    }
    lastApiCallRef.current = callKey;

    const controller = dispatch(
      fetchTickets({
        filters: apiFilters,
        page: list.page,
        pageSize: list.pageSize,
        orderBy,
        append: false,
      }),
    );

    return () => {
      controller.abort?.();
    };
  }, [
    dispatch,
    list.page,
    list.pageSize,
    list.sorting,
    list.filters, // Include filters to re-run when filters are set/cleared
    filtersString,
    apiFilters,
    ticketModulePermissions,
    filtersInitialized, // Add this as dependency so fetch runs when initialized
  ]);

  // Cleanup on unmount so pagination and cache don't bleed between visits
  useEffect(() => {
    return () => {
      lastApiCallRef.current = '';
      lastFiltersRef.current = '';
      lastSortingRef.current = '';
      isScrollPaginationRef.current = false;
      dispatch(setTicketPageSize(DEFAULT_TICKET_LIST_PAGE_SIZE));
      dispatch(resetTicketList());
    };
  }, [dispatch]);

  const handleLoadMore = useCallback(() => {
    if (ticketModulePermissions && ticketModulePermissions.read !== true) {
      return;
    }

    if (list.status === 'loading' || !list.hasMore) {
      return;
    }

    const nextPage = list.page + 1;

    let orderBy = 'modified desc';
    if (list.sorting && list.sorting.length > 0) {
      const sortField = list.sorting[0].id;
      const sortOrder = list.sorting[0].desc ? 'desc' : 'asc';
      orderBy = `${sortField} ${sortOrder}`;
    }

    isScrollPaginationRef.current = true;

    dispatch(
      fetchTickets({
        filters: apiFilters,
        page: nextPage,
        pageSize: list.pageSize,
        orderBy,
        append: true,
      }),
    );
  }, [
    dispatch,
    list.page,
    list.pageSize,
    list.status,
    list.hasMore,
    list.sorting,
    apiFilters,
    ticketModulePermissions,
  ]);

  useEffect(() => {
    const ticketIdFromQuery = searchParams.get('ticket');
    const ticketIdFromUrl = ticketIdFromPath || ticketIdFromQuery;

    if (ticketIdFromQuery && !ticketIdFromPath) {
      navigate(`/ticket-management/${encodeURIComponent(ticketIdFromQuery)}`, { replace: true });
      return;
    }

    if (ticketIdFromUrl) {
      setSelectedTicketId(ticketIdFromUrl);
      setIsViewDrawerOpen(true);
    } else {
      setSelectedTicketId(null);
      setIsViewDrawerOpen(false);
    }
  }, [navigate, searchParams, ticketIdFromPath]);

  const activeStatusTab = useMemo(() => {
    if (
      currentFilters.custom_requires_rm === true ||
      currentFilters.custom_requires_rm === 1 ||
      currentFilters.custom_requires_rm === '1'
    ) {
      return 'requires_rm';
    }
    const ctt = currentFilters.custom_ticket_type;
    if (typeof ctt === 'string' && ctt.trim() === 'Incident') {
      return 'Incident';
    }
    if (Array.isArray(ctt) && ctt.length === 1 && ctt[0] === 'Incident') {
      return 'Incident';
    }
    return 'all';
  }, [currentFilters.custom_requires_rm, currentFilters.custom_ticket_type]);

  const stats = useMemo(() => {
    const apiStats = statsState.data || {};
    const listTotalLoaded = list.status === 'succeeded';

    const statusCounts = {
      resolved: apiStats.resolved_tickets ?? 0,
      total: listTotalLoaded ? list.totalCount : (apiStats.total_tickets ?? 0),
      open: apiStats.open_tickets ?? 0,
    };

    return [
      {
        key: 'total',
        label: 'Total Tickets',
        value: statusCounts.total || 0,
        trend: null,
      },
      {
        key: 'open',
        label: 'Open Tickets',
        value: statusCounts.open || 0,
        trend: null,
      },
      {
        key: 'avgResponse',
        label: 'Avg. first response time',
        value: apiStats.avg_first_response_time_formatted || '0s',
      },
      {
        key: 'resolved',
        label: 'Resolved tickets',
        value: statusCounts.resolved || 0,
      },
    ];
  }, [list.status, list.totalCount, statsState.data]);

  // Tab counts: active tab uses paginated list total; others use status-counts API.
  const statusTabCounts = useMemo(() => {
    const { totalCount = 0, incidentCount = 0, requiresRmCount = 0 } = statusCountsState.data || {};
    const listTotalLoaded = list.status === 'succeeded';

    return STATUS_TAB_OPTIONS.reduce((accumulator, tab) => {
      if (tab.value === 'all') {
        accumulator[tab.value] = listTotalLoaded ? list.totalCount : totalCount;
      } else if (tab.value === 'Incident') {
        accumulator[tab.value] =
          listTotalLoaded && activeStatusTab === 'Incident' ? list.totalCount : incidentCount;
      } else if (tab.value === 'requires_rm') {
        accumulator[tab.value] =
          listTotalLoaded && activeStatusTab === 'requires_rm' ? list.totalCount : requiresRmCount;
      } else {
        accumulator[tab.value] = 0;
      }
      return accumulator;
    }, {});
  }, [statusCountsState.data, list.status, list.totalCount, activeStatusTab]);

  const context = useMemo(() => {
    // User explicitly cleared every centre in the global header — surface a
    // dedicated empty state so they understand why the listview is blank. We
    // check both the ticket filter flag (live during the same render in which
    // the user clicked away the last centre) and the centre slice intent
    // (canonical source once Redux has settled).
    if (
      currentFilters.centerExplicitlyEmpty === true ||
      isExplicitlyEmptyIntent(deriveGlobalCenterIntent(centerAccess))
    ) {
      return 'no_centers';
    }

    // Use searchTerm here to switch context immediately while typing
    if (
      searchTerm ||
      currentFilters.status?.length ||
      currentFilters.priority?.length ||
      currentFilters.custom_requires_rm === true ||
      currentFilters.custom_requires_rm === 1 ||
      (currentFilters.custom_ticket_type &&
        (typeof currentFilters.custom_ticket_type === 'string'
          ? currentFilters.custom_ticket_type.trim()
          : Array.isArray(currentFilters.custom_ticket_type) &&
            currentFilters.custom_ticket_type.length > 0))
    ) {
      return 'search';
    }
    return 'default';
  }, [searchTerm, currentFilters, centerAccess]);

  const handleStatusTabChange = useCallback(
    (value) => {
      if (value === 'all') {
        dispatch(setTicketFilters({ custom_ticket_type: '', custom_requires_rm: false }));
      } else if (value === 'Incident') {
        dispatch(setTicketFilters({ custom_ticket_type: 'Incident', custom_requires_rm: false }));
      } else if (value === 'requires_rm') {
        dispatch(setTicketFilters({ custom_ticket_type: '', custom_requires_rm: true }));
      }
    },
    [dispatch],
  );

  const activeQuickStatusFilter = useMemo(() => {
    const statuses = Array.isArray(currentFilters.status) ? currentFilters.status : [];
    if (statuses.length !== 1) return '';
    const only = statuses[0];
    return TICKET_QUICK_STATUS_FILTER_OPTIONS.some((option) => option.value === only) ? only : '';
  }, [currentFilters.status]);

  const handleQuickStatusFilterChange = useCallback(
    (statusValue) => {
      lastApiCallRef.current = '';
      dispatch(setTicketFilters({ status: statusValue ? [statusValue] : [] }));
    },
    [dispatch],
  );

  const handlePriorityChange = useCallback(
    (value) => {
      dispatch(setTicketFilters({ priority: value ? [value] : [] }));
    },
    [dispatch],
  );

  const normalizeCenters = useCallback((centers) => {
    if (!Array.isArray(centers)) return [];
    return centers.filter(Boolean);
  }, []);

  const areSameCenters = useCallback(
    (a, b) => {
      const left = [...normalizeCenters(a)].sort();
      const right = [...normalizeCenters(b)].sort();
      if (left.length !== right.length) return false;
      return left.every((value, index) => value === right[index]);
    },
    [normalizeCenters],
  );

  const handleFiltersChange = useCallback(
    (appliedFilters) => {
      // Normalize filters for comparison so we can avoid unnecessary API calls
      const normalizeFiltersForCompare = (filters) => {
        const result = {};
        const source = filters || {};
        Object.keys({
          ...currentFilters,
          ...source,
        }).forEach((key) => {
          const value = source[key] ?? currentFilters[key];
          if (Array.isArray(value)) {
            result[key] = value.filter(Boolean).map(String).sort();
          } else if (value === null || value === undefined || value === '') {
            result[key] = [];
          } else {
            result[key] = [String(value)];
          }
        });
        return result;
      };

      const nextNormalized = normalizeFiltersForCompare(appliedFilters);
      const currentNormalized = normalizeFiltersForCompare(currentFilters);
      const areEqual =
        JSON.stringify(
          Object.keys(nextNormalized)
            .sort()
            .reduce((accumulator, key) => {
              accumulator[key] = nextNormalized[key];
              return accumulator;
            }, {}),
        ) ===
        JSON.stringify(
          Object.keys(currentNormalized)
            .sort()
            .reduce((accumulator, key) => {
              accumulator[key] = currentNormalized[key];
              return accumulator;
            }, {}),
        );

      // If nothing actually changed, skip dispatching and API reset
      if (areEqual) {
        return;
      }

      // Set flag to prevent useEffect from overriding center filter
      isApplyingFilterFromModalRef.current = true;

      // Clear API call ref to ensure new fetch happens when filters change
      lastApiCallRef.current = '';

      // Filter modal expresses an intent to use a normal centre filter (or no
      // filter at all). Either way it overrides the global header's
      // "explicit empty" flag — drop it so the listview returns to its standard
      // behaviour. Folded into the same dispatch to avoid a double reset of
      // pagination/rows.
      const filtersToApply =
        appliedFilters.center !== undefined && currentFilters.centerExplicitlyEmpty === true
          ? { ...appliedFilters, centerExplicitlyEmpty: false }
          : appliedFilters;

      dispatch(setTicketFilters(filtersToApply));
      // If search was updated in modal, sync local state
      if (appliedFilters.search !== undefined) {
        setSearchTerm(appliedFilters.search);
      }
      // Sync center selection when center filter is applied from modal
      // Only update if center filter actually changed
      if (appliedFilters.center !== undefined) {
        const centerFilter = Array.isArray(appliedFilters.center) ? appliedFilters.center : [];
        const currentCenterFilter = Array.isArray(currentFilters.center)
          ? currentFilters.center
          : [];

        userExplicitDeselectAllRef.current = false;

        // Check if center filter actually changed using the same comparison logic
        if (!areSameCenters(centerFilter, currentCenterFilter)) {
          // If center filter is empty, select all centers (to match the behavior where empty = all)
          // Otherwise, sync selectedCenters with the filter
          if (centerFilter.length === 0) {
            // Select all centers when filter is empty
            const allCenters =
              centerAccess.data?.map((c) => c?.value ?? c?.name).filter(Boolean) || [];
            dispatch(setSelectedCenters(allCenters));
          } else {
            // Sync selectedCenters with the applied filter
            dispatch(setSelectedCenters(centerFilter));
          }
        }
      }

      // Reset flag after a short delay to allow Redux updates to complete
      setTimeout(() => {
        isApplyingFilterFromModalRef.current = false;
      }, 100);
    },
    [dispatch, centerAccess.data, currentFilters, areSameCenters],
  );

  const handleColumnsClick = useCallback(() => {}, []);

  const handleRefresh = useCallback(() => {
    lastApiCallRef.current = '';
    dispatch(resetTicketList());
  }, [dispatch]);

  const handleRowSelect = useCallback(
    (row) => {
      navigate(`/ticket-management/${encodeURIComponent(row.name)}`);
    },
    [navigate],
  );

  const handleSortingChange = useCallback(
    (newSorting) => {
      lastApiCallRef.current = '';
      dispatch(setTicketSorting(newSorting));
    },
    [dispatch],
  );

  const handleExportCsv = useCallback(() => {
    if (list.rows.length === 0 || mutations.exportStatus === 'loading') return;

    dispatch(
      exportTickets({
        filters: apiFilters,
        sorting: list.sorting,
        isClientUser,
      }),
    )
      .unwrap()
      .then((blob) => {
        if (!blob) return;

        const downloadBlob = blob instanceof Blob ? blob : new Blob([blob], { type: 'text/csv' });
        const url = URL.createObjectURL(downloadBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `devx-tickets-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      })
      .catch((error) => {
        showErrorToast(error, {
          defaultMessage: 'Failed to export tickets. Please try again.',
        });
      });
  }, [dispatch, apiFilters, list.rows.length, list.sorting, mutations.exportStatus]);

  const handleCreateTicketSuccess = useCallback(
    (createdTicket) => {
      lastApiCallRef.current = '';
      dispatch(resetTicketList());

      let orderBy = 'modified desc';
      if (list.sorting && list.sorting.length > 0) {
        const sortField = list.sorting[0].id;
        const sortOrder = list.sorting[0].desc ? 'desc' : 'asc';
        orderBy = `${sortField} ${sortOrder}`;
      }

      dispatch(
        fetchTickets({
          filters: apiFilters,
          page: 1,
          pageSize: list.pageSize,
          orderBy,
          append: false,
        }),
      );
      dispatch(fetchTicketStatusCounts({ filters: apiFilters }));
      dispatch(fetchTicketStats({ filters: apiFilters }));

      if (createdTicket?.name) {
        setSelectedTicketId(createdTicket.name);
      }
    },
    [dispatch, apiFilters, list.sorting, list.pageSize],
  );

  const handleViewDrawerClose = useCallback(() => {
    setIsViewDrawerOpen(false);
    setSelectedTicketId(null);
    navigate('/ticket-management');
  }, [navigate]);

  const handleAddTicketComment = useCallback(
    async (
      ticketId,
      content,
      attachments = [],
      isVisibleToClient = false,
      parentCommentId = null,
    ) => {
      try {
        await dispatch(
          addTicketComment({
            ticketId,
            content,
            attachments,
            visibleToClient: isVisibleToClient,
            parentCommentId,
          }),
        ).unwrap();
        await dispatch(fetchTicketComments(ticketId)).unwrap();
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Failed to add comment. Please try again.',
        });
      }
    },
    [dispatch],
  );

  const handleSendTicketEmail = useCallback(
    async (ticketId, emailData) => {
      try {
        await dispatch(
          sendTicketEmail({
            ticketId,
            to: emailData.to,
            cc: emailData.cc,
            bcc: emailData.bcc,
            subject: emailData.subject,
            message: emailData.content,
            attachments: emailData.attachments,
          }),
        );
        // Refresh comments to get updated email thread
        await dispatch(fetchTicketComments(ticketId));
      } catch (error) {
        console.error('Failed to send email:', error);
        throw error; // Re-throw to let EmailInput handle the error display
      }
    },
    [dispatch],
  );

  const handleRefreshComments = useCallback(
    async (ticketId) => {
      try {
        await dispatch(fetchTicketComments(ticketId));
      } catch (error) {
        console.error('Failed to refresh comments:', error);
      }
    },
    [dispatch],
  );

  const handleTicketFieldUpdate = useCallback(
    async (
      ticketId,
      fieldname,
      value,
      meta = { refreshActivities: true },
      currentAssignees = null,
    ) => {
      const ticketIdString = String(ticketId);
      try {
        const updateResult = await dispatch(
          updateTicketField({ name: ticketIdString, fieldname, value, currentAssignees }),
        );

        if (updateResult.type === 'ticketManagement/updateTicketField/rejected') {
          // Special handling: Facility Manager removing themselves from assignees
          // After successful unassignment, the follow-up ticket detail fetch can return 403/PermissionError.
          // In that case, close the drawer and show a clear message instead of a generic error.
          const { payload } = updateResult;
          const isPermissionErrorString =
            typeof payload === 'string' &&
            (payload.toLowerCase().includes('not permitted') ||
              payload.toLowerCase().includes('not allowed via controller permission check'));

          if (isFacilityManagerUser && fieldname === 'assigned_to' && isPermissionErrorString) {
            showErrorToast('You do not have access to view this ticket.', {
              defaultMessage: 'You do not have access to view this ticket.',
            });

            // Close the view drawer and clear the selected ticket
            handleViewDrawerClose();
            return;
          }

          showErrorToast(updateResult, {
            defaultMessage: 'Failed to update ticket field. Please try again.',
          });
          return;
        }

        // Always fetch ticket detail after successful update to refresh the table row
        // This ensures inline updates from the table are reflected with the latest data
        if (updateResult.type === 'ticketManagement/updateTicketField/fulfilled') {
          await dispatch(fetchTicketDetail(ticketIdString));

          // If drawer is open, also refresh activities/comments
          if (isViewDrawerOpen && selectedTicketId && meta?.refreshActivities) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            await dispatch(fetchTicketComments(ticketIdString));
          }

          // Refresh tab counts from dedicated API (no list refetch, no skeleton)
          dispatch(fetchTicketStatusCounts({ filters: apiFilters }));
          dispatch(fetchTicketStats({ filters: apiFilters }));
        }
      } catch (error) {
        console.error('Failed to update ticket field:', error);
        showErrorToast(error, {
          defaultMessage: 'Failed to update ticket field. Please try again.',
        });
      }
    },
    [
      dispatch,
      selectedTicketId,
      isViewDrawerOpen,
      isFacilityManagerUser,
      handleViewDrawerClose,
      apiFilters,
    ],
  );

  const handleAssigneeUpdate = useCallback(
    async (ticketId, assignees, currentAssignees = null) => {
      await handleTicketFieldUpdate(
        ticketId,
        'assigned_to',
        assignees,
        { refreshActivities: true },
        currentAssignees,
      );
    },
    [handleTicketFieldUpdate],
  );

  const handleStatusUpdate = useCallback(
    async (ticketId, status) => {
      await handleTicketFieldUpdate(ticketId, 'status', status);
    },
    [handleTicketFieldUpdate],
  );

  useEffect(() => {
    if (dropdownData.status === 'idle') {
      dispatch(fetchTicketDropdownData());
    }
  }, [dispatch, dropdownData.status]);

  useEffect(() => {
    if (!filtersInitialized || !ticketModulePermissions?.read) return;
    dispatch(fetchTicketStats({ filters: apiFilters }));
  }, [dispatch, filtersInitialized, ticketModulePermissions?.read, filtersString]);

  // Fetch status counts from dedicated API (on mount when filters ready, and when filters change)
  useEffect(() => {
    if (!filtersInitialized || !ticketModulePermissions?.read) return;
    dispatch(fetchTicketStatusCounts({ filters: apiFilters }));
  }, [dispatch, filtersInitialized, ticketModulePermissions?.read, filtersString]);

  const handleTicketPriorityChange = useCallback(
    (ticketId, newPriority) => {
      handleTicketFieldUpdate(ticketId, 'priority', newPriority);
    },
    [handleTicketFieldUpdate],
  );

  // 1. Initialize from persistence (Runs only once when persistedFilters are loaded)
  useEffect(() => {
    if (filtersInitialized) return;

    const merged = mergeStoredTicketViewFilters(persistedFilters);
    const hydrated = {
      ...merged,
      search: '',
      client: [],
    };

    skipCenterIntentTicketSyncPassesRef.current += 1;
    dispatch(resetTicketList());
    dispatch(setTicketFilters(hydrated));
    setSearchTerm('');
    setFiltersInitialized(true);
  }, [persistedFilters, dispatch, filtersInitialized]);

  // 2. Persist to storage (Runs when filters change, but only after initialization)
  useEffect(() => {
    if (!filtersInitialized) return;

    const compacted = compactFiltersForSessionStorage(
      currentFilters,
      DEFAULT_FILTERS,
      TICKET_VIEW_FILTERS_STORAGE_COMPACT_OPTS,
    );

    // Deep equality check to avoid unnecessary state updates in the persistence hook
    const currentCompacted = compactFiltersForSessionStorage(
      persistedFilters,
      DEFAULT_FILTERS,
      TICKET_VIEW_FILTERS_STORAGE_COMPACT_OPTS,
    );
    if (JSON.stringify(compacted) !== JSON.stringify(currentCompacted)) {
      setPersistedFilters(compacted);
    }
  }, [currentFilters, filtersInitialized, setPersistedFilters, persistedFilters]);

  const handleDeleteTicketClick = useCallback((ticket) => {
    setTicketToDelete(ticket);
  }, []);

  const handleDeleteTicketConfirm = useCallback(
    async (ticket) => {
      if (!ticket?.name) return;
      try {
        await dispatch(deleteTicket(ticket.name)).unwrap();
        showSuccessToast('Ticket deleted successfully.');
        setTicketToDelete(null);
        if (selectedTicketId === ticket.name || String(selectedTicketId) === String(ticket.name)) {
          handleViewDrawerClose();
        }
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage || 'Failed to delete ticket. Please try again.');
      }
    },
    [dispatch, selectedTicketId, handleViewDrawerClose],
  );

  /**
   * Apply the patch produced by `adaptGlobalCenterIntent.ticket(intent)` to the
   * Redux filter slice — but only when something actually changed. Avoids the
   * gratuitous setTicketFilters calls that would otherwise reset pagination on
   * every render where the centre selection happens to be a fresh array
   * reference.
   */
  const dispatchCenterFilterPatchIfChanged = useCallback(
    (patch) => {
      if (!patch) return;
      const nextCenters = Array.isArray(patch.center) ? patch.center : [];
      const centerChanged = !areSameCenters(nextCenters, currentFilters.center);
      const explicitChanged =
        (currentFilters.centerExplicitlyEmpty === true) !== (patch.centerExplicitlyEmpty === true);
      if (centerChanged || explicitChanged) {
        dispatch(setTicketFilters(patch));
      }
    },
    [areSameCenters, currentFilters.center, currentFilters.centerExplicitlyEmpty, dispatch],
  );

  const handleCenterSelectionChange = useCallback(
    (selectedCenters) => {
      // Push the user's selection into the centre slice first; the shared intent
      // helper reads from it via the bidirectional sync effect below.
      dispatch(setSelectedCenters(selectedCenters));

      // Derive the canonical intent from the *new* selection (centerAccess in
      // store hasn't ticked yet at this exact moment; use the live arg).
      const intent = deriveGlobalCenterIntent({
        ...centerAccess,
        selectedCenters,
      });

      // Mirror the intent onto the page-level "user explicitly deselected all"
      // ref so the bidirectional sync's "empty filter == all centres" fallback
      // doesn't undo a deliberate clear on the next render.
      userExplicitDeselectAllRef.current = isExplicitlyEmptyIntent(intent);
      setAllCentersSelected(intent.status === GLOBAL_CENTER_STATUS.All);

      dispatchCenterFilterPatchIfChanged(adaptGlobalCenterIntent.ticket(intent));
    },
    [centerAccess, dispatch, dispatchCenterFilterPatchIfChanged],
  );

  useEffect(() => {
    // Skip if we're applying filters from the modal to prevent override
    if (isApplyingFilterFromModalRef.current) {
      return;
    }

    if (!filtersInitialized) return;

    const intent = deriveGlobalCenterIntent(centerAccess);
    if (isLoadingIntent(intent)) return;

    setAllCentersSelected(intent.status === GLOBAL_CENTER_STATUS.All);

    if (skipCenterIntentTicketSyncPassesRef.current > 0) {
      skipCenterIntentTicketSyncPassesRef.current -= 1;
      return;
    }

    const patch = adaptGlobalCenterIntent.ticket(intent);
    if (patch) {
      const nextCenters = Array.isArray(patch.center) ? patch.center : [];
      const centerChanged = !areSameCenters(nextCenters, currentFilters.center);
      const explicitChanged =
        (currentFilters.centerExplicitlyEmpty === true) !== (patch.centerExplicitlyEmpty === true);
      if (centerChanged || explicitChanged) {
        centerSyncFromSelectionRef.current = true;
        dispatch(setTicketFilters(patch));
      }
    }
  }, [
    areSameCenters,
    centerAccess,
    currentFilters.center,
    currentFilters.centerExplicitlyEmpty,
    dispatch,
    filtersInitialized,
  ]);

  // Keep CenterAccessDropdown selection in sync with filters.center (bi-directional)
  // - When filters.center is empty => treat as "All centers" and select all in CenterAccessDropdown
  // - When filters.center has values => select those values in CenterAccessDropdown
  // Skip when the previous update came from selectedCenters→filters to prevent infinite loop.
  // Also skip the "empty filter == all centres" fallback when the user has just
  // intentionally cleared every centre in the popover — otherwise focus-out would
  // revert their explicit deselect right back to all-selected.
  useEffect(() => {
    if (centerSyncFromSelectionRef.current) {
      centerSyncFromSelectionRef.current = false;
      return;
    }

    const centersData = Array.isArray(centerAccess.data) ? centerAccess.data : [];
    if (centersData.length === 0) return;

    const filterCenters = normalizeCenters(currentFilters.center);

    if (filterCenters.length === 0 && userExplicitDeselectAllRef.current) {
      return;
    }

    const desiredSelection =
      filterCenters.length === 0
        ? centersData.map((c) => c?.value ?? c?.name).filter(Boolean)
        : filterCenters;

    const currentSelection = normalizeCenters(centerAccess.selectedCenters);
    if (!areSameCenters(desiredSelection, currentSelection)) {
      dispatch(setSelectedCenters(desiredSelection));
    }
  }, [
    areSameCenters,
    centerAccess.data,
    centerAccess.selectedCenters,
    currentFilters.center,
    dispatch,
    normalizeCenters,
  ]);

  const handleNavigatePrevious = useCallback(() => {
    const currentIndex = list.rows.findIndex((row) => row.name === selectedTicketId);
    if (currentIndex > 0) {
      const previousTicketId = list.rows[currentIndex - 1].name;
      setSelectedTicketId(previousTicketId);
      navigate(`/ticket-management/${encodeURIComponent(previousTicketId)}`);
    }
  }, [list.rows, navigate, selectedTicketId]);

  const handleNavigateNext = useCallback(() => {
    const currentIndex = list.rows.findIndex((row) => row.name === selectedTicketId);
    if (currentIndex < list.rows.length - 1) {
      const nextTicketId = list.rows[currentIndex + 1].name;
      setSelectedTicketId(nextTicketId);
      navigate(`/ticket-management/${encodeURIComponent(nextTicketId)}`);
    }
  }, [list.rows, navigate, selectedTicketId]);

  const currentTicketIndex = list.rows.findIndex((row) => row.name === selectedTicketId);
  const hasPrevious = currentTicketIndex > 0;
  const hasNext = currentTicketIndex < list.rows.length - 1;

  // Socket integration for real-time updates
  const { subscribe, isAuthenticated: socketAuthenticated } = useSocket();

  // Subscribe to HD Ticket updates
  useEffect(() => {
    if (!socketAuthenticated) return;

    // Handle document updates
    const unsubscribeUpdate = subscribe('HD Ticket', 'doc_update', (data) => {
      if (!data) return;

      // Handle different event payload structures
      // Frappe might send: { doctype, name, doc: {...} } or just the doc data
      const doctype = data.doctype || 'HD Ticket';
      if (doctype !== 'HD Ticket') return;

      const ticketData = data.doc || data;
      if (!ticketData || !ticketData.name) return;

      // Update ticket in list if it exists
      // dispatch(updateTicketFromSocket({ ticketData }));

      // If the detail drawer is open for this ticket, refresh it
      if (isViewDrawerOpen && selectedTicketId === ticketData.name) {
        dispatch(refreshTicketDetailFromSocket({ ticketName: ticketData.name }));
        // Refetch ticket detail and comments
        dispatch(fetchTicketDetail(ticketData.name));
        dispatch(fetchTicketComments(ticketData.name));
      }
    });

    // Handle new document inserts (optional - can refresh list if needed)
    const unsubscribeInsert = subscribe('HD Ticket', 'doc_insert', (data) => {
      if (!data) return;

      const doctype = data.doctype || 'HD Ticket';
      if (doctype !== 'HD Ticket') return;

      const ticketData = data.doc || data;
      if (!ticketData || !ticketData.name) return;

      // Optionally refresh the ticket list to show new tickets
      // For now, we'll just update if the ticket matches current filters
      // You can uncomment this if you want to auto-refresh on new ticket creation
      // dispatch(resetTicketList());
    });

    // Cleanup subscriptions on unmount
    return () => {
      if (typeof unsubscribeUpdate === 'function') unsubscribeUpdate();
      if (typeof unsubscribeInsert === 'function') unsubscribeInsert();
    };
  }, [subscribe, socketAuthenticated, dispatch, isViewDrawerOpen, selectedTicketId, list.filters]);

  return (
    <>
      <PageLayout
        contentAreaClassName='overflow-hidden'
        pageTitle='Tickets'
        pageIcon={<RiSettings2Line size={24} />}
        pageDescription='Manage, prioritize, and resolve support requests all in one place.'
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
              onChange={handleCenterSelectionChange}
              isLoading={centerAccess.status === 'loading'}
            />
          </div>
        }
      >
        <div className='flex flex-col flex-1 min-h-0 gap-6 px-4 sm:px-6 lg:px-8 pb-6 mt-5'>
          {widgetVisibility[WIDGET_KEYS.STATS] && <TicketStats stats={stats} />}

          <TicketStatusTabs
            value={activeStatusTab}
            counts={statusTabCounts}
            onValueChange={handleStatusTabChange}
            hideBorderTop={!widgetVisibility[WIDGET_KEYS.STATS]}
          />

          <TicketToolbar
            // --- FIX: Pass local search term here for immediate UI update ---
            filters={{ ...currentFilters, search: searchTerm }}
            permissions={permissions}
            isExporting={mutations.exportStatus === 'loading'}
            hasListData={list.totalCount > 0}
            activeStatusTab={activeStatusTab}
            onSearchChange={handleSearchChange}
            onCreateTicket={() => {
              setVoiceTicketJson(null);
              setIsCreateDrawerOpen(true);
            }}
            onExport={handleExportCsv}
            onColumnsClick={handleColumnsClick}
            onVoiceClick={() => setIsVoiceModalOpen(true)}
            tableRef={ticketTableRef}
            tableVariant={tableVariant}
            onTableVariantToggle={toggleTableVariant}
            onFiltersChange={handleFiltersChange}
            appliedFilters={currentFilters}
            currentUser={currentUser}
          />

          <TicketStatusFilters
            value={activeQuickStatusFilter}
            onValueChange={handleQuickStatusFilterChange}
            hideClosed={isFacilityManagerUser}
          />
          <PaginatedTableLayout
            className='flex-1 min-h-0'
            scrollable={false}
            currentPage={list.page}
            totalPages={Math.ceil(list.totalCount / list.pageSize)}
            totalCount={list.totalCount}
            pageSize={list.pageSize}
            onPageChange={(page) => {
              dispatch(setTicketPage(page));
            }}
            onPageSizeChange={(size) => {
              dispatch(setTicketPageSize(size));
            }}
          >
            <TicketTable
              ref={ticketTableRef}
              rows={list.rows}
              isLoading={(list.status === 'loading' || isDebouncing) && list.rows.length === 0}
              error={list.error}
              context={context}
              onRetry={handleRefresh}
              onRowSelect={handleRowSelect}
              onSortingChange={handleSortingChange}
              sorting={list.sorting}
              permissions={permissions}
              tableId='ticket-management-table'
              onAssigneeUpdate={handleAssigneeUpdate}
              onStatusUpdate={handleStatusUpdate}
              statusOptions={dropdownData.data?.statuses || []}
              onPriorityUpdate={handleTicketPriorityChange}
              priorityOptions={dropdownData.data?.priorities || []}
              onDelete={handleDeleteTicketClick}
              variant={tableVariant}
            />
          </PaginatedTableLayout>

          {list.error && (
            <p className='rounded-xl border border-error-base/30 bg-error-lighter/30 p-3 text-label-sm text-error-darker'>
              {list.error}
            </p>
          )}
        </div>
      </PageLayout>

      <TicketCreateDrawer
        open={isCreateDrawerOpen}
        onOpenChange={(open) => {
          setIsCreateDrawerOpen(open);
          if (!open) setVoiceTicketJson(null);
        }}
        onSuccess={handleCreateTicketSuccess}
        disabled={!permissions.canCreate}
        initialVoiceJson={voiceTicketJson}
      />

      {isViewDrawerOpen && (
        <TicketViewDrawer
          isOpen={isViewDrawerOpen}
          onClose={handleViewDrawerClose}
          ticketId={selectedTicketId}
          onPriorityChange={handleTicketPriorityChange}
          onFieldUpdate={handleTicketFieldUpdate}
          onNavigatePrevious={handleNavigatePrevious}
          onNavigateNext={handleNavigateNext}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          permissions={permissions}
          onAddComment={handleAddTicketComment}
          onRefreshComments={handleRefreshComments}
          onSendEmail={handleSendTicketEmail}
          onDelete={handleDeleteTicketClick}
        />
      )}

      <DeleteTicketModal
        isOpen={Boolean(ticketToDelete)}
        onOpenChange={(open) => !open && setTicketToDelete(null)}
        ticket={ticketToDelete}
        onConfirm={handleDeleteTicketConfirm}
        isLoading={Boolean(ticketToDelete) && mutations.updateStatus === 'loading'}
      />

      <VoiceModal
        open={isVoiceModalOpen}
        onOpenChange={setIsVoiceModalOpen}
        onDone={({ voiceJson } = {}) => {
          setVoiceTicketJson(voiceJson || null);
          setIsVoiceModalOpen(false);
          setIsCreateDrawerOpen(true);
        }}
      />
    </>
  );
};

export default WithModulePermission(TicketManagement, 'HD Ticket');
// export default TicketManagement;
