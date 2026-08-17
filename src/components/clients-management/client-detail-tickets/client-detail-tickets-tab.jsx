import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useSearchParams } from 'react-router-dom';
import { useDebounce } from '@/hooks/use-debounce';
import { useTableVariant } from '@/hooks/use-table-variant';
import { useSocket } from '@/hooks/use-socket';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
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
  setTicketSorting,
  resetTicketList,
  updateTicketField,
  updateTicketFromSocket,
  refreshTicketDetailFromSocket,
  deleteTicket,
} from '@/redux/ticketManagementSlice';
import { selectClientDetail } from '@/redux/clientDetailSlice';

const CLIENT_DETAIL_TICKETS_VIEW_FILTERS_KEY = 'client-detail-tickets-view-filter-dropdown';
const ClientDetailTicketsTab = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const clientDetail = useSelector(selectClientDetail);
  const client = clientDetail.data;
  const clientId = client?.name || id;

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
    'client-detail-tickets-table',
    'compact',
  );

  // Create filters with client pre-filled
  const baseFilters = useMemo(() => {
    return {
      ...DEFAULT_FILTERS,
      client: clientId ? [clientId] : [],
    };
  }, [clientId]);

  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: clientId ? `${CLIENT_DETAIL_TICKETS_VIEW_FILTERS_KEY}-${clientId}` : null,
    defaultFilters: DEFAULT_FILTERS,
    persistExcludeKeys: TICKET_VIEW_FILTERS_STORAGE_COMPACT_OPTS.excludeKeys,
    persistTruthyObjectKeys: TICKET_VIEW_FILTERS_STORAGE_COMPACT_OPTS.truthyObjectKeys,
  });

  useEffect(() => {
    setFiltersInitialized(false);
  }, [clientId]);

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

  // Create filters for API calls - always include client filter
  const apiFilters = useMemo(() => {
    return {
      ...currentFilters,
      client: clientId ? [clientId] : [],
    };
  }, [currentFilters, clientId]);

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

  // 1. Initialize from persistence
  useEffect(() => {
    if (!clientId || filtersInitialized) return;

    const merged = mergeStoredTicketViewFilters(persistedFilters);
    dispatch(
      setTicketFilters({
        ...merged,
        client: [clientId],
        search: '',
      }),
    );
    setSearchTerm('');
    setFiltersInitialized(true);
  }, [clientId, persistedFilters, dispatch, filtersInitialized]);

  // 2. Persist to storage
  useEffect(() => {
    if (!clientId || !filtersInitialized) return;

    const f = list.filters;
    if (!f) return;
    const cf = f.client;
    const clientMatches =
      Array.isArray(cf) && cf.length === 1 && String(cf[0]) === String(clientId);
    if (!clientMatches) return;

    const compact = compactFiltersForSessionStorage(
      f,
      DEFAULT_FILTERS,
      TICKET_VIEW_FILTERS_STORAGE_COMPACT_OPTS,
    );
    if (JSON.stringify(compact) !== JSON.stringify(persistedFilters)) {
      setPersistedFilters(compact);
    }
  }, [clientId, list.filters, persistedFilters, filtersInitialized, setPersistedFilters]);

  // Fetch ticket list - only fetch if client filter is set in Redux
  useEffect(() => {
    if (ticketModulePermissions && ticketModulePermissions.read !== true) {
      return;
    }

    if (!clientId) {
      return;
    }

    // Don't fetch until client filter is actually set in Redux state
    const currentClientFilter = list.filters?.client;
    const clientFilterArray = Array.isArray(currentClientFilter) ? currentClientFilter : [];
    const hasCorrectClientFilter =
      clientFilterArray.length === 1 && clientFilterArray[0] === clientId;

    if (!hasCorrectClientFilter) {
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
    filtersString, // filtersString already depends on list.filters via apiFilters
    apiFilters,
    ticketModulePermissions,
    clientId,
  ]);

  // Cleanup on unmount - reset refs only; do not reset list so switching to center tab
  // doesn't trigger double reset / extra fetches (center tab init will set its own filters)
  useEffect(() => {
    return () => {
      lastApiCallRef.current = '';
      lastFiltersRef.current = '';
      lastSortingRef.current = '';
      isScrollPaginationRef.current = false;
    };
  }, []);

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

  const context = useMemo(() => {
    if (searchTerm || currentFilters.status?.length || currentFilters.priority?.length) {
      return 'search';
    }
    return 'default';
  }, [searchTerm, currentFilters]);

  // Handle filters change (from filter dropdown) — always pin this tab to the
  // current client; preserve toolbar fields (center, status, priority, …).
  const handleFiltersChange = useCallback(
    (newFilters) => {
      const filtersToApply = {
        ...newFilters,
        client: clientId ? [clientId] : [],
      };
      dispatch(setTicketFilters(filtersToApply));
      if (newFilters.search !== undefined) {
        setSearchTerm(newFilters.search ?? '');
      }
      dispatch(setTicketPage(1));
      dispatch(resetTicketList());
    },
    [dispatch, clientId],
  );

  const handleRefresh = useCallback(() => {
    lastApiCallRef.current = '';
    dispatch(resetTicketList());
  }, [dispatch]);

  const handleRowSelect = useCallback((row) => {
    setSelectedTicketId(row.name);
    setIsViewDrawerOpen(true);
  }, []);

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
  }, [dispatch, apiFilters, list.rows.length, list.sorting, mutations.exportStatus, isClientUser]);

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

      if (createdTicket?.name) {
        setSelectedTicketId(createdTicket.name);
        setIsViewDrawerOpen(true);
      }
    },
    [dispatch, apiFilters, list.sorting, list.pageSize],
  );

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
        showErrorToast(error, {
          defaultMessage: 'Failed to update ticket field. Please try again.',
        });
      }
    },
    [dispatch, selectedTicketId, isViewDrawerOpen, isFacilityManagerUser, handleViewDrawerClose],
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

  // Auto-open create drawer if create param is in URL
  useEffect(() => {
    const shouldCreate = searchParams.get('create') === 'true';
    if (shouldCreate && !isCreateDrawerOpen) {
      setIsCreateDrawerOpen(true);
      // Remove the create param from URL
      searchParams.delete('create');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, isCreateDrawerOpen, setSearchParams]);

  const handleTicketPriorityChange = useCallback(
    (ticketId, newPriority) => {
      handleTicketFieldUpdate(ticketId, 'priority', newPriority);
    },
    [handleTicketFieldUpdate],
  );

  const handleNavigatePrevious = useCallback(() => {
    const currentIndex = list.rows.findIndex((row) => row.name === selectedTicketId);
    if (currentIndex > 0) {
      const previousTicketId = list.rows[currentIndex - 1].name;
      setSelectedTicketId(previousTicketId);
    }
  }, [list.rows, selectedTicketId]);

  const handleNavigateNext = useCallback(() => {
    const currentIndex = list.rows.findIndex((row) => row.name === selectedTicketId);
    if (currentIndex < list.rows.length - 1) {
      const nextTicketId = list.rows[currentIndex + 1].name;
      setSelectedTicketId(nextTicketId);
    }
  }, [list.rows, selectedTicketId]);

  const currentTicketIndex = list.rows.findIndex((row) => row.name === selectedTicketId);
  const hasPrevious = currentTicketIndex > 0;
  const hasNext = currentTicketIndex < list.rows.length - 1;

  // Socket integration for real-time updates
  const { subscribe, isAuthenticated: socketAuthenticated } = useSocket();

  useEffect(() => {
    if (!socketAuthenticated) return;

    const unsubscribeUpdate = subscribe('HD Ticket', 'doc_update', (data) => {
      if (!data) return;

      const doctype = data.doctype || 'HD Ticket';
      if (doctype !== 'HD Ticket') return;

      const ticketData = data.doc || data;
      if (!ticketData || !ticketData.name) return;

      if (isViewDrawerOpen && selectedTicketId === ticketData.name) {
        dispatch(refreshTicketDetailFromSocket({ ticketName: ticketData.name }));
        dispatch(fetchTicketDetail(ticketData.name));
        dispatch(fetchTicketComments(ticketData.name));
      }
    });

    const unsubscribeInsert = subscribe('HD Ticket', 'doc_insert', (data) => {
      if (!data) return;

      const doctype = data.doctype || 'HD Ticket';
      if (doctype !== 'HD Ticket') return;

      const ticketData = data.doc || data;
      if (!ticketData || !ticketData.name) return;
    });

    return () => {
      if (typeof unsubscribeUpdate === 'function') unsubscribeUpdate();
      if (typeof unsubscribeInsert === 'function') unsubscribeInsert();
    };
  }, [subscribe, socketAuthenticated, dispatch, isViewDrawerOpen, selectedTicketId]);

  if (!clientId) {
    return (
      <div className='flex flex-1 overflow-hidden'>
        <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0 px-6 py-8'>
          <p className='text-label-sm text-text-sub-600'>Loading client information...</p>
        </div>
      </div>
    );
  }

  // Note: We don't clear the client filter on unmount here to avoid aborting in-flight requests
  // The ticket management page will clear it on mount as a safety measure

  return (
    <>
      <div className='flex flex-1 overflow-hidden'>
        <div className='flex flex-1 flex-col overflow-y-auto bg-white min-w-0 px-6 py-6'>
          <TicketToolbar
            filters={{ ...currentFilters, search: searchTerm }}
            permissions={permissions}
            isExporting={mutations.exportStatus === 'loading'}
            hasListData={list.totalCount > 0}
            onSearchChange={handleSearchChange}
            onCreateTicket={() => setIsCreateDrawerOpen(true)}
            onExport={handleExportCsv}
            onColumnsClick={() => {}}
            tableRef={ticketTableRef}
            tableVariant={tableVariant}
            onTableVariantToggle={toggleTableVariant}
            onFiltersChange={handleFiltersChange}
            appliedFilters={currentFilters}
            activeStatusTab='all'
            lockedFilters={clientId ? { client: [clientId] } : {}}
          />

          <div className='mt-6'>
            <TicketTable
              ref={ticketTableRef}
              rows={list.rows}
              isLoading={list.status === 'loading' && list.rows.length === 0}
              error={list.error}
              context={context}
              onRetry={handleRefresh}
              onRowSelect={handleRowSelect}
              onSortingChange={handleSortingChange}
              sorting={list.sorting}
              permissions={permissions}
              tableId='client-detail-tickets-table'
              onAssigneeUpdate={handleAssigneeUpdate}
              onStatusUpdate={handleStatusUpdate}
              statusOptions={dropdownData.data?.statuses || []}
              onPriorityUpdate={handleTicketPriorityChange}
              priorityOptions={dropdownData.data?.priorities || []}
              enableScrollPagination={true}
              onLoadMore={handleLoadMore}
              hasMore={list.hasMore}
              isLoadingMore={list.status === 'loading' && list.rows.length > 0}
              variant={tableVariant}
              onDelete={handleDeleteTicketClick}
            />
          </div>

          {list.error && (
            <p className='mt-4 rounded-xl border border-error-base/30 bg-error-lighter/30 p-3 text-label-sm text-error-darker'>
              {list.error}
            </p>
          )}
        </div>
      </div>

      <TicketCreateDrawer
        open={isCreateDrawerOpen}
        onOpenChange={setIsCreateDrawerOpen}
        onSuccess={handleCreateTicketSuccess}
        disabled={!permissions.canCreate}
        initialClientId={clientId}
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
          centerFilterClientId={clientId}
        />
      )}

      <DeleteTicketModal
        isOpen={Boolean(ticketToDelete)}
        onOpenChange={(open) => !open && setTicketToDelete(null)}
        ticket={ticketToDelete}
        onConfirm={handleDeleteTicketConfirm}
        isLoading={Boolean(ticketToDelete) && mutations.updateStatus === 'loading'}
      />
    </>
  );
};

export default ClientDetailTicketsTab;
