import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as Input from '@/components/ui/input';
import {
  RiAddLine,
  RiLayoutColumnLine,
  RiSearchLine,
  RiFilter3Line,
  RiCloseLine,
} from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';
import * as Popover from '@/components/ui/popover';
import { useTableVariant } from '@/hooks/use-table-variant';
import { useDebounce } from '@/hooks/use-debounce';
import { useDispatch, useSelector } from 'react-redux';
import {
  setModalOpen,
  setModalClose,
  setRemoveUserModalClose,
  setEditUserModalClose,
  addUser,
  updateUser,
  getUsersProfile,
  removeUserProfile,
  disableUserWithReassignTodos,
  fetchUsersForReassignPicker,
  getListOfUsersWithFilters,
  getListViewColumns,
  saveListViewColumns,
  resetUsersList,
} from '@/redux/profileSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import TableVariantToggle from '@/components/ui/table-variant-toggle';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import {
  RemoveUserModal,
  AddUserModal,
  EditUserModal,
  UsersTable,
  UsersFilterDropdown,
} from '@/components/users-management';
import { USER_SUB_TABS } from '@/constants/users-constants';
import {
  getUsersSubTabFromSearchParams,
  userListTypeForSubTab,
  mapUserListSegmentStatusToTabCounts,
} from '@/utils/user-utils';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';

// ---------------------------------------------------------------------------
// Settings > Users — filter dropdown persistence
// ---------------------------------------------------------------------------
//
// Single sessionStorage slot keyed by `SETTINGS_USERS_FILTERS_STORAGE_KEY`
// stores the `{ center, status, role }` selection so the badge + result set
// rehydrate after a refresh. Compactor drops empty buckets (so an "all clear"
// state evicts the slot) and the merge helper guarantees every bucket exists
// as an array on read regardless of what is found in storage.
const SETTINGS_USERS_FILTERS_STORAGE_KEY = 'settings-users-view-filter-dropdown';
const SETTINGS_USERS_FILTER_KEYS = ['center', 'status', 'role'];
const DEFAULT_SETTINGS_USERS_FILTERS = Object.freeze({
  center: [],
  status: [],
  role: [],
});

const trimSettingsUsersList = (values) =>
  Array.isArray(values) ? values.map((v) => String(v).trim()).filter(Boolean) : [];

const mergeStoredSettingsUsersFilters = (stored) => {
  const merged = { ...DEFAULT_SETTINGS_USERS_FILTERS };
  if (!stored || typeof stored !== 'object') return merged;
  for (const key of SETTINGS_USERS_FILTER_KEYS) {
    if (Array.isArray(stored[key])) merged[key] = trimSettingsUsersList(stored[key]);
  }
  return merged;
};

const UsersProfile = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParameter = searchParams.get('tab');
  const [activeUsersTab, setActiveUsersTab] = useState(() =>
    getUsersSubTabFromSearchParams(searchParams),
  );

  useEffect(() => {
    setActiveUsersTab(getUsersSubTabFromSearchParams(searchParams));
  }, [tabParameter, searchParams]);

  const handleUsersTabChange = useCallback(
    (value) => {
      setActiveUsersTab(value);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', value);
        return next;
      });
    },
    [setSearchParams],
  );

  const dispatch = useDispatch();
  const usersTableRef = useRef(null);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const filterDropdownRef = useRef(null);
  const [persistedAppliedFilters, setAppliedFilters] = usePersistedFilters({
    storageKey: SETTINGS_USERS_FILTERS_STORAGE_KEY,
    defaultFilters: DEFAULT_SETTINGS_USERS_FILTERS,
    persistTrimStringArrays: true,
  });
  const appliedFilters = useMemo(
    () => mergeStoredSettingsUsersFilters(persistedAppliedFilters),
    [persistedAppliedFilters],
  );

  // Sync the parent badge count with applied filters whenever they change
  // (covers initial hydration from storage and the X-button clear path).
  useEffect(() => {
    setFilterCount(
      appliedFilters.center.length + appliedFilters.status.length + appliedFilters.role.length,
    );
  }, [appliedFilters]);
  // Table variant management with localStorage persistence
  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'users-management-table',
    'compact',
  );

  // Get Redux state
  const {
    isLoading: isLoadingData,
    isLoadingMore,
    isSavingColumns,
    data: usersListData,
    columns,
    page,
    pageSize,
    hasMore,
  } = useSelector((state) => state.profile.listOfUsersWithFilters);

  const usersData = usersListData?.results || [];

  const userSegmentTabCounts = useMemo(
    () => mapUserListSegmentStatusToTabCounts(usersListData?.status),
    [usersListData?.status],
  );

  const isAddUserLoading = useSelector((state) => state.profile.addUser.isLoading);
  const isEditUserLoading = useSelector((state) => state.profile.editUser.isLoading);

  const { isOpen: isAddModalOpen } = useSelector((state) => state.profile.usersProfile.modal);
  const { isOpen: isEditModalOpen, data: editUserData } = useSelector(
    (state) => state.profile.editUser.modal,
  );
  const { isOpen: isRemoveModalOpen, data: removeUserData } = useSelector(
    (state) => state.profile.removeUser.modal,
  );

  const isDisableUserLoading = useSelector(
    (state) => state.profile.disableUserWithReassign?.isLoading ?? false,
  );

  // Track column config loading separately to avoid showing skeleton
  const [isLoadingColumnConfig, setIsLoadingColumnConfig] = useState(false);

  // --- Search State Management (similar to ticket-management) ---
  // 1. Initialize local search state
  const [searchTerm, setSearchTerm] = useState('');

  // 2. Debounce the local state
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Track previous search term to clear data when search changes
  const lastApiCallRef = useRef('');

  const userListType = useMemo(() => userListTypeForSubTab(activeUsersTab), [activeUsersTab]);

  // 3. Sync debounced search to API and clear data when search changes
  useEffect(() => {
    // Clear existing data when search term or filters change (to show skeleton during new search)
    const listSegmentKey = userListType ?? 'all';
    const currentApiCall = `${debouncedSearchTerm}-${JSON.stringify(appliedFilters)}-${listSegmentKey}`;
    if (lastApiCallRef.current !== currentApiCall) {
      dispatch(resetUsersList());
      lastApiCallRef.current = currentApiCall;
    }

    dispatch(
      getListOfUsersWithFilters({
        keyword: debouncedSearchTerm,
        filters: appliedFilters,
        page: 1,
        pageSize: 20,
        append: false,
        ...(userListType ? { type: userListType } : {}),
      }),
    );
  }, [debouncedSearchTerm, dispatch, appliedFilters, userListType]);

  // 4. Update local state immediately on user input
  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

  const handleUsersFiltersChange = useCallback((_filtersArray, filters) => {
    setAppliedFilters(filters);
  }, []);

  // Determine context for empty state (search vs default)
  const context = useMemo(() => {
    return debouncedSearchTerm ? 'search' : 'default';
  }, [debouncedSearchTerm]);

  const usersHeading = useMemo(() => {
    switch (activeUsersTab) {
      case 'core_team':
        return {
          title: 'Core Team Users',
          subtitle: 'Manage all your Core Team Users',
        };
      case 'others':
        return {
          title: 'Others',
          subtitle: 'Manage other users',
        };
      case 'all':
      default:
        return {
          title: 'Users',
          subtitle: 'Manage all your users',
        };
    }
  }, [activeUsersTab]);

  // Simple loading logic: show skeleton when loading and no data exists
  // Exclude column operations (saving columns or loading column config)
  const isLoading =
    isLoadingData && usersData.length === 0 && !isSavingColumns && !isLoadingColumnConfig;

  // Filter out 'user_image' column from API response - it should not be displayed
  // Memoize to prevent unnecessary re-renders of ColumnManagerDropdown
  const apiColumns = useMemo(
    () => (columns || []).filter((col) => col.id !== 'user_image'),
    [columns],
  );

  // Handle load more for scroll pagination (match centers-page behavior)
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    const nextPage = page + 1;

    dispatch(
      getListOfUsersWithFilters({
        keyword: debouncedSearchTerm,
        filters: appliedFilters,
        page: nextPage,
        pageSize,
        append: true,
        ...(userListType ? { type: userListType } : {}),
      }),
    );
  }, [
    dispatch,
    debouncedSearchTerm,
    appliedFilters,
    page,
    pageSize,
    hasMore,
    isLoadingMore,
    userListType,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      lastApiCallRef.current = '';
      dispatch(resetUsersList());
    };
  }, [dispatch]);

  // Fetch columns configuration on mount
  useEffect(() => {
    const fetchColumns = async () => {
      setIsLoadingColumnConfig(true);
      try {
        await dispatch(getListViewColumns('User')).unwrap();
      } catch (error) {
        console.error('Error fetching columns:', error);
      } finally {
        setIsLoadingColumnConfig(false);
      }
    };
    fetchColumns();
  }, [dispatch]);

  const handleSave = async (data) => {
    try {
      await dispatch(addUser(data)).unwrap();
      dispatch(
        getListOfUsersWithFilters({
          keyword: debouncedSearchTerm,
          filters: appliedFilters,
          page: 1,
          pageSize: 20,
          append: false,
          ...(userListType ? { type: userListType } : {}),
        }),
      );

      showSuccessToast('User added successfully.');
      dispatch(getUsersProfile()); // Refresh all user data to include new user's full fields
      dispatch(setModalClose());
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Failed to add user. Please try again.',
      });
    }
  };

  useEffect(() => {
    dispatch(getUsersProfile()).catch(() => {
      // Error handled by Redux
    });
  }, [dispatch]);

  const handleEditSave = async (data) => {
    try {
      // Transform form data to API format
      const updateData = {
        firstName: data.firstName,
        lastName: data.lastName,
        center: data.centers,
        user_role: data.role,
        emailAddress: data.emailAddress,
        org_id: data.clients,
        center_zone: data.zone,
        all_centers: data.all_centers,
        supplier: data.supplier,
        pipelines: Array.isArray(data.pipelines) ? data.pipelines : undefined,
      };

      await dispatch(updateUser(updateData)).unwrap();
      await dispatch(
        getListOfUsersWithFilters({
          keyword: debouncedSearchTerm,
          filters: appliedFilters,
          page: 1,
          pageSize: 20,
          append: false,
          ...(userListType ? { type: userListType } : {}),
        }),
      );

      showSuccessToast('User updated successfully.');
      dispatch(getUsersProfile()); // Refresh all user data to get full fields like center_zone
      dispatch(setEditUserModalClose());
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Unable to update user.',
      });
    }
  };

  const handleOpenChange = (open) => {
    if (!open) {
      dispatch(setModalClose());
    }
  };

  const handleEditOpenChange = (open) => {
    if (!open) {
      dispatch(setEditUserModalClose());
    }
  };

  const handleRemoveModalOpenChange = (open) => {
    if (!open) {
      dispatch(setRemoveUserModalClose());
    }
  };

  useEffect(() => {
    if (isRemoveModalOpen) {
      dispatch(fetchUsersForReassignPicker());
    }
  }, [isRemoveModalOpen, dispatch]);

  // Track pending column changes for debouncing
  const [pendingColumnChange, setPendingColumnChange] = useState(null);
  const isSavingColumnsRef = useRef(false);

  // Debounce column changes to prevent rapid API calls
  const debouncedColumnChange = useDebounce(pendingColumnChange, 500);

  // Handle column change with debouncing and refetch after save
  const handleColumnChange = useCallback((columns) => {
    // Set pending change (will be debounced)
    setPendingColumnChange(columns);
  }, []);

  // Save columns after debounce
  useEffect(() => {
    if (!debouncedColumnChange || isSavingColumnsRef.current) {
      return;
    }

    // Set ref immediately to prevent race condition - this makes the check and set atomic
    isSavingColumnsRef.current = true;

    const saveColumns = async () => {
      setIsLoadingColumnConfig(true);

      try {
        // Save column preferences
        await dispatch(
          saveListViewColumns({
            doctype: 'User',
            columns: debouncedColumnChange,
          }),
        ).unwrap();

        // Refetch columns after successful save to get latest state
        // This prevents deadlock errors by ensuring we have the latest data
        await dispatch(getListViewColumns('User')).unwrap();
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Failed to save column preferences.',
        });
      } finally {
        isSavingColumnsRef.current = false;
        setIsLoadingColumnConfig(false);
        setPendingColumnChange(null);
      }
    };

    saveColumns();
  }, [debouncedColumnChange, dispatch]);

  const handleRemoveUser = async (userToRemove, _replacementUserEmail) => {
    try {
      // Always delete the user selected from table action, not from dropdown
      // _replacementUserEmail is for reassigning role if needed by API in future
      await dispatch(removeUserProfile(userToRemove.email)).unwrap();
      await dispatch(getUsersProfile());
      await dispatch(
        getListOfUsersWithFilters({
          keyword: debouncedSearchTerm,
          filters: appliedFilters,
          page: 1,
          pageSize: 20,
          append: false,
          ...(userListType ? { type: userListType } : {}),
        }),
      );

      showSuccessToast('User removed successfully.');
      dispatch(setRemoveUserModalClose());
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Error removing user',
      });
      dispatch(setRemoveUserModalClose());
    }
  };

  const handleDeleteUser = async (userToDelete, replacementUserEmail) => {
    try {
      await dispatch(
        disableUserWithReassignTodos({
          user_email: userToDelete?.email,
          replacement_user_email: replacementUserEmail,
        }),
      ).unwrap();
      await dispatch(getUsersProfile());
      await dispatch(
        getListOfUsersWithFilters({
          keyword: debouncedSearchTerm,
          filters: appliedFilters,
          page: 1,
          pageSize: 20,
          append: false,
          ...(userListType ? { type: userListType } : {}),
        }),
      );
      showSuccessToast('User disabled successfully.');
      dispatch(setRemoveUserModalClose());
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Failed to disable user.',
      });
      dispatch(setRemoveUserModalClose());
    }
  };

  return (
    <div className='w-full flex flex-col gap-6 items-center justify-center'>
      <div className='w-full'>
        <TabMenuHorizontal.Root value={activeUsersTab} onValueChange={handleUsersTabChange}>
          <TabMenuHorizontal.List
            wrapperClassName='border-b border-stroke-soft-200'
            className='border-none h-12 gap-6'
          >
            {USER_SUB_TABS.map((tab) => {
              const tabCount = userSegmentTabCounts?.[tab.id];
              const showBadge = typeof tabCount === 'number' && tabCount > 0;
              return (
                <TabMenuHorizontal.Trigger
                  key={tab.id}
                  value={tab.id}
                  className='group h-12 gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
                >
                  <span>{tab.label}</span>
                  {showBadge && (
                    <span className='inline-flex items-center justify-center rounded-full bg-bg-weak-100 px-2 py-0.5 text-[12px] text-text-sub-600 group-data-[state=active]:bg-green-500 group-data-[state=active]:text-white group-data-[state=active]:font-semibold'>
                      {tabCount}
                    </span>
                  )}
                </TabMenuHorizontal.Trigger>
              );
            })}
          </TabMenuHorizontal.List>
        </TabMenuHorizontal.Root>
      </div>

      <div className='w-full flex flex-col gap-10 items-center justify-center'>
        <div className='w-full flex items-center justify-between gap-[16px]'>
          <div className='w-1/2 flex flex-col items-start justify-start gap-1'>
            <span className='text-text-main-900 text-label-sm'>{usersHeading.title}</span>
            <span className='text-text-sub-500 text-paragraph-xs'>{usersHeading.subtitle}</span>
          </div>

          <div className='w-1/2 flex items-center justify-end gap-[16px]'>
            <div className='w-full'>
              <Input.Root size='medium' className=''>
                <Input.Wrapper>
                  <Input.Icon as={RiSearchLine} />
                  <Input.Input
                    value={searchTerm}
                    onChange={handleSearchChange}
                    type='text'
                    placeholder='Search name'
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
            <div className='flex  items-center gap-3'>
              <Popover.Root
                open={isFilterDropdownOpen}
                onOpenChange={(open) => {
                  const wasOpen = isFilterDropdownOpen;
                  setIsFilterDropdownOpen(open);
                  // When popover closes (was open, now closed), trigger filter change
                  if (wasOpen && !open && filterDropdownRef.current) {
                    filterDropdownRef.current.handleClose();
                  }
                }}
              >
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Popover.Trigger asChild>
                      <Button.Root
                        variant={filterCount > 0 ? 'primary' : 'neutral'}
                        mode={filterCount > 0 ? 'lighter' : 'stroke'}
                        size='small'
                        className='gap-2'
                        aria-label='Filter users'
                      >
                        <Button.Icon>
                          <RiFilter3Line size={20} />
                        </Button.Icon>
                        {filterCount > 0 ? `Filter ${filterCount}` : ''}
                        {filterCount > 0 && (
                          <Button.Icon
                            className='text-primary-dark bg-primary-light rounded-sm'
                            as={RiCloseLine}
                            size={20}
                            onClick={(e) => {
                              e.stopPropagation();
                              const clearedFilters = { ...DEFAULT_SETTINGS_USERS_FILTERS };
                              setAppliedFilters(clearedFilters);
                              setFilterCount(0);
                              setIsFilterDropdownOpen(false);
                              dispatch(
                                getListOfUsersWithFilters({
                                  keyword: debouncedSearchTerm,
                                  filters: clearedFilters,
                                  page: 1,
                                  pageSize: 20,
                                  append: false,
                                }),
                              );
                            }}
                          />
                        )}
                      </Button.Root>
                    </Popover.Trigger>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p>Filter</p>
                  </Tooltip.Content>
                </Tooltip.Root>
                <UsersFilterDropdown
                  ref={filterDropdownRef}
                  open={isFilterDropdownOpen}
                  setFilterCount={setFilterCount}
                  onOpenChange={setIsFilterDropdownOpen}
                  onFiltersChange={(filtersArray, filters) => {
                    setAppliedFilters(filters);
                    dispatch(
                      getListOfUsersWithFilters({
                        keyword: debouncedSearchTerm,
                        filters,
                        page: 1,
                        pageSize: 20,
                        append: false,
                      }),
                    );
                  }}
                  appliedFilters={appliedFilters}
                />
              </Popover.Root>
              {/* <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <TableVariantToggle variant={tableVariant} onToggle={toggleTableVariant} />
              </Tooltip.Trigger>
              <Tooltip.Content>
                {tableVariant === 'compact' ? 'Switch to default view' : 'Switch to compact view'}
              </Tooltip.Content>
            </Tooltip.Root> */}
              <ColumnManagerDropdown
                open={isColumnManagerOpen}
                tooltipContent={<p>Manage columns</p>}
                onOpenChange={setIsColumnManagerOpen}
                columns={usersTableRef?.current?.columnConfig || []}
                onReorder={useCallback(
                  (start, end) => usersTableRef?.current?.reorderColumns?.(start, end),
                  [],
                )}
                onToggleVisibility={useCallback(
                  (id) => usersTableRef?.current?.toggleColumnVisibility?.(id),
                  [],
                )}
                onShowAll={useCallback(() => usersTableRef?.current?.showAllColumns?.(), [])}
                onHideAll={useCallback(() => usersTableRef?.current?.hideAllColumns?.(), [])}
                trigger={
                  <Button.Root variant='neutral' mode='stroke' size='small' className=''>
                    <Button.Icon as={RiLayoutColumnLine} />
                  </Button.Root>
                }
              />
              <Button.Root
                variant='primary'
                mode='filled'
                size='medium'
                type='button'
                onClick={() => dispatch(setModalOpen(true))}
                className='px-4 gap-[8px]'
              >
                <Button.Icon as={RiAddLine} />
                Add User
              </Button.Root>
            </div>
          </div>
        </div>

        <UsersTable
          ref={usersTableRef}
          data={usersData}
          apiColumns={apiColumns}
          onColumnChange={handleColumnChange}
          variant={tableVariant}
          isLoading={isLoading}
          context={context}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          enableScrollPagination={true}
        />
      </div>

      <AddUserModal
        isOpen={isAddModalOpen}
        isLoading={isAddUserLoading}
        handleOpenChange={handleOpenChange}
        handleSave={handleSave}
        usersSegment={activeUsersTab}
      />
      <EditUserModal
        isOpen={isEditModalOpen}
        isLoading={isEditUserLoading}
        userData={usersData.find((user) => user.email === editUserData?.email)}
        handleOpenChange={handleEditOpenChange}
        handleSave={handleEditSave}
        usersSegment={activeUsersTab}
      />
      <RemoveUserModal
        isOpen={isRemoveModalOpen}
        selectedUser={removeUserData}
        handleOpenChange={handleRemoveModalOpenChange}
        onDeleteUser={handleDeleteUser}
        isDeleting={isDisableUserLoading}
      />
    </div>
  );
};

export default UsersProfile;
