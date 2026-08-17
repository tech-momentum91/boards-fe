import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useDebounce } from '@/hooks/use-debounce';
import { useTableVariant } from '@/hooks/use-table-variant';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { useSocket } from '@/hooks/use-socket';
import { isClient, isFacilityManager } from '@/constants/users-constants';
import {
  TicketToolbar,
  TicketTable,
  TicketCreateDrawer,
  TicketViewDrawer,
  DeleteTicketModal,
  DEFAULT_FILTERS,
  TICKET_VIEW_FILTERS_STORAGE_COMPACT_OPTS,
  mergeStoredTicketViewFilters,
} from '@/components/ticket-management';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';
import { getModulePermissions } from '@/utils/user-role-utils';
import PaginatedTableLayout from '@/components/ui/paginated-table-layout';
import { showErrorToast, showSuccessToast, extractErrorMessage } from '@/utils/error-utils';
import {
  addTicketComment,
  sendTicketEmail,
  createTicket,
  fetchTicketComments,
  fetchTicketDetail,
  fetchTickets,
  fetchTicketDropdownData,
  selectTicketList,
  selectTicketMutations,
  selectTicketDropdownData,
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
import { getCenterDetailsThunk } from '@/redux/centerSlice';

const CENTER_DETAIL_TICKETS_VIEW_FILTERS_KEY = 'center-detail-tickets-view-filter-dropdown';

const CenterDetailTicketsTab = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const { data: centerDetails } = useSelector((state) => state.center.centerDetails);
  const centerId = centerDetails?.name || id;

  const list = useSelector(selectTicketList);
  const mutations = useSelector(selectTicketMutations);
  const dropdownData = useSelector(selectTicketDropdownData);
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const roleMap = userSideBarPerm?.data?.message?.role;
  const isClientUser = isClient(roleMap);
  const isFacilityManagerUser = isFacilityManager(roleMap);

  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const ticketTableRef = React.useRef(null);

  // Table variant management with localStorage persistence
  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'center-detail-tickets-table',
    'compact',
  );

  // Create filters with center pre-filled
  const baseFilters = useMemo(() => {
    return {
      ...DEFAULT_FILTERS,
      center: centerId ? [centerId] : [],
    };
  }, [centerId]);

  const currentFilters = list.filters || baseFilters;

  // --- Local Search State & Debounce ---
  const [searchTerm, setSearchTerm] = useState(currentFilters.search || '');

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearchTerm !== (currentFilters.search || '')) {
      dispatch(setTicketFilters({ search: debouncedSearchTerm }));
    }
  }, [debouncedSearchTerm, dispatch, currentFilters.search]);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

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

  // Create filters for API calls - always include center filter
  const apiFilters = useMemo(() => {
    return {
      ...currentFilters,
      center: centerId ? [centerId] : [],
    };
  }, [currentFilters, centerId]);

  // Memoize filters string for dependency comparison
  const filtersString = useMemo(() => JSON.stringify(apiFilters), [apiFilters]);

  const lastApiCallRef = useRef('');
  const lastFiltersRef = useRef('');
  const lastSortingRef = useRef('');
  const isScrollPaginationRef = useRef(false);

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

  // Fetch dropdown data on mount
  useEffect(() => {
    if (dropdownData.status === 'idle') {
      dispatch(fetchTicketDropdownData());
    }
  }, [dispatch, dropdownData.status]);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: centerId ? `${CENTER_DETAIL_TICKETS_VIEW_FILTERS_KEY}-${centerId}` : null,
    defaultFilters: DEFAULT_FILTERS,
    persistExcludeKeys: TICKET_VIEW_FILTERS_STORAGE_COMPACT_OPTS.excludeKeys,
    persistTruthyObjectKeys: TICKET_VIEW_FILTERS_STORAGE_COMPACT_OPTS.truthyObjectKeys,
  });

  // 1. Initialize from persistence
  useEffect(() => {
    if (!centerId || filtersInitialized) return;

    const merged = mergeStoredTicketViewFilters(persistedFilters);
    dispatch(
      setTicketFilters({
        ...merged,
        center: [centerId],
        client: [],
        search: '',
      }),
    );
    setSearchTerm('');
    setFiltersInitialized(true);
  }, [centerId, persistedFilters, dispatch, filtersInitialized]);

  // 2. Persist to storage
  useEffect(() => {
    if (!centerId || !filtersInitialized) return;

    const f = list.filters;
    if (!f) return;
    const cf = f.center;
    const centerMatches =
      Array.isArray(cf) && cf.length === 1 && String(cf[0]) === String(centerId);
    if (!centerMatches) return;

    const compact = compactFiltersForSessionStorage(
      f,
      DEFAULT_FILTERS,
      TICKET_VIEW_FILTERS_STORAGE_COMPACT_OPTS,
    );
    if (JSON.stringify(compact) !== JSON.stringify(persistedFilters)) {
      setPersistedFilters(compact);
    }
  }, [centerId, list.filters, persistedFilters, filtersInitialized, setPersistedFilters]);

  // Fetch ticket list - only fetch if center filter is set in Redux
  useEffect(() => {
    if (!filtersInitialized) return;

    if (ticketModulePermissions && ticketModulePermissions.read !== true) {
      return;
    }

    if (!centerId) {
      return;
    }

    // Don't fetch until center filter is actually set in Redux state
    const currentCenterFilter = list.filters?.center;
    const centerFilterArray = Array.isArray(currentCenterFilter) ? currentCenterFilter : [];
    const hasCorrectCenterFilter =
      centerFilterArray.length === 1 && centerFilterArray[0] === centerId;

    if (!hasCorrectCenterFilter) {
      return;
    }

    let orderBy = 'modified desc';
    if (list.sorting && list.sorting.length > 0) {
      const sortField = list.sorting[0].id;
      const sortOrder = list.sorting[0].desc ? 'desc' : 'asc';
      orderBy = `${sortField} ${sortOrder}`;
    }

    const callKey = `${filtersString}-${list.page}-${list.pageSize}-${orderBy}`;

    if (isScrollPaginationRef.current && list.page > 1) {
      isScrollPaginationRef.current = false;
      lastApiCallRef.current = callKey;
      return;
    }

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
    filtersString, // filtersString already depends on list.filters via apiFilters
    apiFilters,
    ticketModulePermissions,
    centerId,
    filtersInitialized,
  ]);

  // Cleanup on unmount — reset shared list page size so Ticket Management opens at its default.
  useEffect(() => {
    return () => {
      lastApiCallRef.current = '';
      lastFiltersRef.current = '';
      lastSortingRef.current = '';
      isScrollPaginationRef.current = false;
      dispatch(setTicketPageSize(DEFAULT_TICKET_LIST_PAGE_SIZE));
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
    list.status,
    list.hasMore,
    list.page,
    list.pageSize,
    list.sorting,
    apiFilters,
    ticketModulePermissions,
  ]);

  // Handle filters change (from filter dropdown) - keep center context, clear client
  const handleFiltersChange = useCallback(
    (newFilters) => {
      const filtersToApply = {
        ...newFilters,
        center: centerId ? [centerId] : [],
        client: [],
      };
      dispatch(setTicketFilters(filtersToApply));
      if (newFilters.search !== undefined) {
        setSearchTerm(newFilters.search ?? '');
      }
    },
    [dispatch, centerId],
  );

  // Handle sorting change
  const handleSortingChange = useCallback(
    (newSorting) => {
      lastApiCallRef.current = '';
      dispatch(setTicketSorting(newSorting));
    },
    [dispatch],
  );

  // Handle row select (open ticket view drawer)
  const handleRowSelect = useCallback(
    (ticket) => {
      if (ticket?.name) {
        setSelectedTicketId(ticket.name);
        setIsViewDrawerOpen(true);
        dispatch(fetchTicketDetail(ticket.name));
      }
    },
    [dispatch],
  );

  // Handle view drawer close
  const handleViewDrawerClose = useCallback(() => {
    setIsViewDrawerOpen(false);
    setSelectedTicketId(null);
  }, []);

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
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage || 'Failed to delete ticket. Please try again.');
      }
    },
    [dispatch, selectedTicketId, handleViewDrawerClose, apiFilters, list.sorting, list.pageSize],
  );

  // Handle ticket field update
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
          const { payload } = updateResult;
          const isPermissionErrorString =
            typeof payload === 'string' &&
            (payload.toLowerCase().includes('not permitted') ||
              payload.toLowerCase().includes('not allowed via controller permission check'));

          if (isFacilityManagerUser && fieldname === 'assigned_to' && isPermissionErrorString) {
            showErrorToast('You do not have access to view this ticket.', {
              defaultMessage: 'You do not have access to view this ticket.',
            });
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
        }
      } catch (error) {
        console.error('Failed to update ticket field:', error);
        showErrorToast(error, { defaultMessage: 'Failed to update ticket. Please try again.' });
      }
    },
    [dispatch, isFacilityManagerUser, isViewDrawerOpen, selectedTicketId, handleViewDrawerClose],
  );

  // Navigation handlers for ticket drawer
  const handleNavigatePrevious = useCallback(() => {
    const currentIndex = list.rows.findIndex((ticket) => ticket.name === selectedTicketId);
    if (currentIndex > 0) {
      const previousTicket = list.rows[currentIndex - 1];
      setSelectedTicketId(previousTicket.name);
      dispatch(fetchTicketDetail(previousTicket.name));
    }
  }, [list.rows, selectedTicketId, dispatch]);

  const handleNavigateNext = useCallback(() => {
    const currentIndex = list.rows.findIndex((ticket) => ticket.name === selectedTicketId);
    if (currentIndex < list.rows.length - 1) {
      const nextTicket = list.rows[currentIndex + 1];
      setSelectedTicketId(nextTicket.name);
      dispatch(fetchTicketDetail(nextTicket.name));
    }
  }, [list.rows, selectedTicketId, dispatch]);

  const hasPrevious = useMemo(() => {
    if (!selectedTicketId) return false;
    const currentIndex = list.rows.findIndex((ticket) => ticket.name === selectedTicketId);
    return currentIndex > 0;
  }, [list.rows, selectedTicketId]);

  const hasNext = useMemo(() => {
    if (!selectedTicketId) return false;
    const currentIndex = list.rows.findIndex((ticket) => ticket.name === selectedTicketId);
    return currentIndex < list.rows.length - 1;
  }, [list.rows, selectedTicketId]);

  // Handle add ticket comment
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
        );
        await dispatch(fetchTicketComments(ticketId));
      } catch (error) {
        console.error('Failed to add comment:', error);
      }
    },
    [dispatch],
  );

  // Handle send ticket email
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
        await dispatch(fetchTicketComments(ticketId));
      } catch (error) {
        console.error('Failed to send email:', error);
        throw error;
      }
    },
    [dispatch],
  );

  // Handle refresh comments
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

  // Handle ticket creation success
  const handleCreateTicketSuccess = useCallback(
    (createdTicket) => {
      if (centerId) {
        dispatch(getCenterDetailsThunk(centerId));
      }

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

      if (createdTicket?.name) {
        setSelectedTicketId(createdTicket.name);
        setIsViewDrawerOpen(true);
      }
    },
    [dispatch, centerId, apiFilters, list.sorting, list.pageSize],
  );

  // Handle export
  const handleExport = useCallback(async () => {
    try {
      await dispatch(exportTickets({ filters: apiFilters })).unwrap();
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to export tickets' });
    }
  }, [dispatch, apiFilters]);

  // Handle assignee update
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

  // Handle status update
  const handleStatusUpdate = useCallback(
    async (ticketId, status) => {
      await handleTicketFieldUpdate(ticketId, 'status', status);
    },
    [handleTicketFieldUpdate],
  );

  // Handle priority update
  const handleTicketPriorityChange = useCallback(
    (ticketId, newPriority) => {
      handleTicketFieldUpdate(ticketId, 'priority', newPriority);
    },
    [handleTicketFieldUpdate],
  );

  // Socket connection for real-time updates
  useSocket('ticket_updated', (data) => {
    if (data?.ticket) {
      dispatch(updateTicketFromSocket(data.ticket));
    }
  });

  useSocket('ticket_created', (data) => {
    if (data?.ticket && data.ticket.center === centerId) {
      // Only add if it matches current center filter
      const sorting = list.sorting || [];
      const orderBy =
        sorting.length > 0 ? `${sorting[0].id}:${sorting[0].desc ? 'desc' : 'asc'}` : '';
      dispatch(
        fetchTickets({
          filters: apiFilters,
          page: 1,
          pageSize: list.pageSize,
          orderBy,
          append: false,
        }),
      );
    }
  });

  // Context for ticket table
  const context = useMemo(() => {
    return {
      isClientUser,
      isFacilityManagerUser,
      permissions,
    };
  }, [isClientUser, isFacilityManagerUser, permissions]);

  // Hide center column by default (since we're already in center detail page)
  // Use a timeout to ensure the table and column config are fully initialized
  useEffect(() => {
    const timer = setTimeout(() => {
      const ref = ticketTableRef.current;
      const columnConfigHook = ref?.columnConfigHook;
      const columns = columnConfigHook?.columns ?? ref?.columnConfig;

      if (!columns || !Array.isArray(columns)) return;

      // Hide center column - always hide it since we're viewing tickets for a specific center
      const centerColumn = columns.find((col) => col.id === 'center');
      if (centerColumn?.visible && columnConfigHook?.toggleColumnVisibility) {
        columnConfigHook.toggleColumnVisibility('center');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [ticketTableRef.current]);

  return (
    <div className='flex h-full min-h-0 flex-col gap-4 overflow-hidden'>
      <TicketToolbar
        filters={{ ...currentFilters, search: searchTerm }}
        permissions={permissions}
        isExporting={mutations.exportStatus === 'loading'}
        hasListData={list.totalCount > 0}
        onSearchChange={handleSearchChange}
        onCreateTicket={() => setIsCreateDrawerOpen(true)}
        onExport={handleExport}
        onColumnsClick={() => {}}
        tableRef={ticketTableRef}
        tableVariant={tableVariant}
        onTableVariantToggle={toggleTableVariant}
        onFiltersChange={handleFiltersChange}
        appliedFilters={currentFilters}
        activeStatusTab='all'
        lockedFilters={centerId ? { center: [centerId] } : {}}
      />

      <PaginatedTableLayout
        className='flex-1 min-h-0'
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
          isLoading={list.status === 'loading' && list.rows.length === 0}
          error={list.error}
          context={context}
          onRetry={() => {
            const sorting = list.sorting || [];
            const orderBy =
              sorting.length > 0 ? `${sorting[0].id}:${sorting[0].desc ? 'desc' : 'asc'}` : '';
            dispatch(
              fetchTickets({
                filters: apiFilters,
                page: list.page,
                pageSize: list.pageSize,
                orderBy,
                append: false,
              }),
            );
          }}
          onRowSelect={handleRowSelect}
          onSortingChange={handleSortingChange}
          sorting={list.sorting}
          permissions={permissions}
          tableId='center-detail-tickets-table'
          onAssigneeUpdate={handleAssigneeUpdate}
          onStatusUpdate={handleStatusUpdate}
          statusOptions={dropdownData.data?.statuses || []}
          onPriorityUpdate={handleTicketPriorityChange}
          priorityOptions={dropdownData.data?.priorities || []}
          variant={tableVariant}
          onDelete={handleDeleteTicketClick}
        />
      </PaginatedTableLayout>

      <TicketCreateDrawer
        open={isCreateDrawerOpen}
        onOpenChange={setIsCreateDrawerOpen}
        onSuccess={handleCreateTicketSuccess}
        initialCenter={centerId}
        disabled={!permissions.canCreate}
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
    </div>
  );
};

export default CenterDetailTicketsTab;
