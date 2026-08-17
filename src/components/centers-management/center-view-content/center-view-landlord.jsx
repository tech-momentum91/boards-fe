import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { hasModulePermission } from '@/utils/user-role-utils';
import CenterViewCommonLayout from '@/components/centers-management/center-view-content/center-view-common-layout';
import CreateLandlordModal from '@/components/landlords-management/create-landlord-modal';
import EditLandlordModal from '@/components/landlords-management/edit-landlord-modal';
import RemoveLandlordModal from '@/components/landlords-management/remove-landlord-modal';
import emptyState from '@/assets/images/empty-state.png';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import * as Hint from '@/components/ui/hint';
import * as Table from '@/components/ui/table';
import * as Input from '@/components/ui/input';
import * as Badge from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import * as Popover from '@/components/ui/popover';
import * as Filter from '@/components/ui/filter';
import CenterViewLandlordFilterDropdown, {
  DEFAULT_LANDLORD_VIEW_FILTERS,
  compactLandlordViewFiltersForStorage,
  mergeStoredLandlordViewFilters,
  landlordRowMatchesFilters,
} from '@/components/centers-management/center-view-landlord-filter-dropdown';
import { useTableVariant } from '@/hooks/use-table-variant';
import { useColumnConfig } from '@/hooks/use-column-config';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import ColumnManagerDropdown from '@/components/ui/column-manager-dropdown';
import {
  RiAddLine,
  RiUserLine,
  RiErrorWarningFill,
  RiPencilLine,
  RiDeleteBinLine,
  RiUser2Line,
  RiLayoutColumnLine,
} from 'react-icons/ri';
import { getCenterDetailsThunk, setAddLandlordModal, updateCenterThunk } from '@/redux/centerSlice';
import {
  getLandlordListThunk,
  setCreateLandlordDrawer,
  setEditLandlordDrawer,
  setRemoveLandlordDrawer,
  createLandlordThunk,
} from '@/redux/landlordSlice';
import { showErrorToast, extractErrorMessage } from '@/utils/error-utils';

const CENTER_VIEW_LANDLORD_TABLE_ID = 'center-view-landlord-table';

const persistLandlordViewColumns = async (tableId, payload) => {
  try {
    localStorage.setItem(`column-config-${tableId}`, JSON.stringify(payload));
  } catch {
    // ignore
  }
  return payload;
};

const readLandlordViewColumns = async (tableId) => {
  try {
    const raw = localStorage.getItem(`column-config-${tableId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const addLandlordSchema = z.object({
  landlord: z.string().min(1, 'Landlord is required'),
});

// Mock landlord data - replace with actual API call
const MOCK_LANDLORDS = [
  { value: 'LLD-001', label: 'ABC Properties Ltd.' },
  { value: 'LLD-002', label: 'XYZ Real Estate' },
  { value: 'LLD-003', label: 'Prime Developers' },
  { value: 'LLD-004', label: 'Metro Builders' },
  { value: 'LLD-005', label: 'Elite Properties' },
];

const CenterViewLandlordModal = ({
  landlordData,
  isOpen,
  onOpenChange,
  onOpenCreateLandlordModal,
  onLandlordSelect,
  centerDetails,
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(addLandlordSchema),
    defaultValues: {
      landlord: '',
    },
  });

  const dispatch = useDispatch();

  const [selectedLandlord, setSelectedLandlord] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      reset();
      setSelectedLandlord(null);
    }
  }, [isOpen, reset]);

  const existing = centerDetails?.landlord_details?.map((item) => item.landlord) || [];

  const onSubmit = async (_formData) => {
    try {
      if (!centerDetails?.name) {
        console.error('Center name not available');
        return;
      }

      // Get existing landlord IDs
      const existingLandlordIds = (centerDetails?.landlords || []).map((item) => item.name);

      // Find the selected landlord object to get its name (ID)
      const selectedLandlord = landlordData.find(
        (landlord) => landlord.name === _formData.landlord,
      );

      if (!selectedLandlord || !selectedLandlord.name) {
        console.error('Selected landlord not found or missing name property');
        return;
      }

      // Get selected landlord name (which is the ID)
      const selectedLandlordId = selectedLandlord.name;

      // Check if landlord is already added to avoid duplicates (compare as strings)
      const landlordIdString = String(selectedLandlordId);
      const isAlreadyAdded = existingLandlordIds.some((id) => String(id) === landlordIdString);

      if (isAlreadyAdded) {
        showErrorToast('This landlord is already added to the center.');
        return;
      }

      // Combine existing and newly selected landlord IDs into a single array
      const allLandlordIds = [...existingLandlordIds, selectedLandlordId];

      // Prepare payload with landlord_details as array of objects with landlord property
      const payload = {
        landlord_details: allLandlordIds.map((id) => ({ landlord: id })), // Array of objects with landlord property
      };

      // Call updateCenter API
      await dispatch(updateCenterThunk({ center_id: centerDetails.name, payload })).unwrap();

      // Refresh center details to see changes
      await dispatch(getCenterDetailsThunk(centerDetails.name)).unwrap();

      onOpenChange(false);
      reset();
    } catch (error) {
      console.error('Failed to update center with landlord:', error);

      // Check all possible error paths for ValidationError about landlord already being added
      // Redux thunk errors can be in error.response.data, error.payload, or error.serialized
      const responseData = error?.response?.data || {};
      const payloadData = error?.payload || {};
      const serializedData = error?.serialized?.response?.data || error?.serialized || {};

      const excType =
        error?.exc_type ||
        responseData?.exc_type ||
        payloadData?.exc_type ||
        serializedData?.exc_type;

      const exception =
        responseData?.exception ||
        payloadData?.exception ||
        serializedData?.exception ||
        error?.exception ||
        '';

      const serverMessages =
        responseData?._server_messages ||
        payloadData?._server_messages ||
        serializedData?._server_messages ||
        '';

      // Extract error message to check its content
      const errorMessage = extractErrorMessage(error);

      // Check if error is about landlord already being added
      // Check exc_type, exception field, server messages, and extracted message
      const exceptionString = String(exception).toLowerCase();
      const serverMessagesString = String(serverMessages).toLowerCase();
      const errorMessageString = String(errorMessage || '').toLowerCase();

      // Also stringify the entire error to search for the pattern as a fallback
      let errorString = '';
      try {
        errorString = JSON.stringify(error).toLowerCase();
      } catch {
        // If stringify fails (circular reference), use empty string
        errorString = '';
      }

      // Check if error is about landlord already being added
      // Primary check: ValidationError with "already added" text
      const isValidationErrorWithAlreadyAdded =
        excType === 'ValidationError' &&
        (exceptionString.includes('already added') ||
          exceptionString.includes('already associated') ||
          serverMessagesString.includes('already added') ||
          serverMessagesString.includes('already associated') ||
          errorMessageString.includes('already added') ||
          errorMessageString.includes('already associated') ||
          errorString.includes('already added'));

      // Fallback check: if message contains "landlord" and "already added" (even without ValidationError type)
      const hasLandlordAlreadyAddedPattern =
        (errorMessageString.includes('landlord') && errorMessageString.includes('already added')) ||
        (exceptionString.includes('landlord') && exceptionString.includes('already added')) ||
        (serverMessagesString.includes('landlord') &&
          serverMessagesString.includes('already added')) ||
        (errorString.includes('landlord') && errorString.includes('already added'));

      const isAlreadyAddedError =
        isValidationErrorWithAlreadyAdded || hasLandlordAlreadyAddedPattern;

      if (isAlreadyAddedError) {
        // Show only the custom message string, not the error object
        showErrorToast('Landlord is already associated with this center');
      } else {
        // Show error message from API response
        showErrorToast(error, {
          defaultMessage: 'Failed to add landlord to center. Please try again.',
        });
      }

      // Don't close modal on error so user can retry
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    reset();
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header
          icon={RiUserLine}
          title='Add Landlord'
          description='Select an existing landlord or create a new one'
        />
        <Modal.Body>
          <form onSubmit={handleSubmit(onSubmit)} className='w-full flex flex-col gap-4'>
            <div className='w-full flex flex-col gap-2'>
              <Label.Root>
                Landlord
                <Label.Asterisk />
              </Label.Root>
              <Controller
                name='landlord'
                control={control}
                render={({ field }) => (
                  <Select.Root
                    className=''
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Find and log the selected landlord details
                      const selectedLandlord = landlordData.find(
                        (landlord) => landlord.name === value,
                      );
                      const normalized =
                        selectedLandlord?.landlord_master || selectedLandlord || null;
                      setSelectedLandlord(normalized);
                    }}
                    hasError={Boolean(errors.landlord)}
                  >
                    <Select.Trigger className='w-full'>
                      <Select.Value placeholder='Select landlord' />
                    </Select.Trigger>
                    <Select.Content className='relative min-w-[var(--radix-select-trigger-width)] flex flex-col p-0'>
                      <div className='flex-1 overflow-y-auto'>
                        {landlordData.map((landlord, i) => (
                          <Select.Item key={i} value={landlord.name}>
                            {landlord.landlord_name}
                          </Select.Item>
                        ))}
                      </div>
                      <div className='border-t sticky absolute bottom-0 bg-white right-0  border-stroke-soft-200 p-2'>
                        <Button.Root
                          variant='neutral'
                          mode='stroke'
                          size='small'
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onOpenCreateLandlordModal();
                          }}
                          className='gap-2 w-full'
                        >
                          <Button.Icon as={RiAddLine} />
                          Create New Landlord
                        </Button.Root>
                      </div>
                    </Select.Content>
                  </Select.Root>
                )}
              />
              {errors.landlord && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.landlord.message}
                </Hint.Root>
              )}
            </div>

            {selectedLandlord && (
              <>
                <div>
                  <Label.Root>SPOC</Label.Root>
                  <Input.Root size='medium' className='w-full'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        value={
                          selectedLandlord?.spoc ||
                          [
                            selectedLandlord?.contact?.[0]?.first_name,
                            selectedLandlord?.contact?.[0]?.last_name,
                          ]
                            .filter(Boolean)
                            .join(' ') ||
                          ''
                        }
                        className='disabled:text-[var(--color-text-soft-400)]'
                        disabled
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
                <div>
                  <Label.Root>Contact Number</Label.Root>
                  <Input.Root size='medium' className='w-full'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        value={
                          selectedLandlord?.contact_number ||
                          selectedLandlord?.contact?.[0]?.mobile_number ||
                          ''
                        }
                        disabled
                        className='disabled:text-[var(--color-text-soft-400)]'
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
                <div>
                  <Label.Root>Email</Label.Root>
                  <Input.Root size='medium' className='w-full'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        value={
                          selectedLandlord?.email_address ||
                          selectedLandlord?.contact?.[0]?.contact_email ||
                          ''
                        }
                        className='disabled:text-[var(--color-text-soft-400)]'
                        disabled
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
              </>
            )}
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            onClick={handleCancel}
            className='w-full '
          >
            Cancel
          </Button.Root>
          <Button.Root type='button' onClick={handleSubmit(onSubmit)} className='w-full'>
            Add
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

const CenterViewLandlord = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const { isOpen: isAddLandlordModalOpen } = useSelector((state) => state.center.addLandlordModal);
  const { isOpen: isCreateLandlordModalOpen } = useSelector(
    (state) => state.landlord.createLandlordDrawer,
  );
  // EditLandlordModal now fetches data directly from Redux
  const { isOpen: isRemoveLandlordModalOpen, selectedLandlord: selectedRemoveLandlord } =
    useSelector((state) => state.landlord.removeLandlordDrawer);
  // Mock data - replace with actual API data

  const { data: centerDetails } = useSelector((state) => state.center.centerDetails);

  const canWrite = hasModulePermission(userSideBarPerm, 'Center', 'write');
  const canDelete = hasModulePermission(userSideBarPerm, 'Center', 'delete');

  // Table variant management with localStorage persistence
  const { variant: tableVariant, toggleVariant: toggleTableVariant } = useTableVariant(
    'center-view-landlord-table',
    'compact',
  );

  // Store center name for use in callbacks
  const centerName = centerDetails?.name;
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLandlordFilterOpen, setIsLandlordFilterOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const [appliedLandlordFilters, setAppliedLandlordFilters] = useState();
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: centerDetails?.name
      ? `center-view-landlord-view-filter-dropdown-${centerDetails.name}`
      : null,
    defaultFilters: DEFAULT_LANDLORD_VIEW_FILTERS,
    persistScalarDiffKeys: ['centerSource'],
  });

  // 1. Initialize from persistence
  useEffect(() => {
    if (!centerDetails?.name || filtersInitialized) return;

    const merged = mergeStoredLandlordViewFilters(persistedFilters);
    setAppliedLandlordFilters(merged);
    setFiltersInitialized(true);
  }, [centerDetails?.name, persistedFilters, filtersInitialized]);

  // 2. Persist to storage
  useEffect(() => {
    if (!centerDetails?.name || !filtersInitialized) return;

    const compact = compactLandlordViewFiltersForStorage(appliedLandlordFilters);
    if (JSON.stringify(compact) !== JSON.stringify(persistedFilters)) {
      setPersistedFilters(compact);
    }
  }, [
    centerDetails?.name,
    appliedLandlordFilters,
    persistedFilters,
    filtersInitialized,
    setPersistedFilters,
  ]);

  const landlordFilterRef = useRef(null);

  const landlordFilterContext = useMemo(
    () => ({
      id: centerDetails?.name || '',
      displayName: centerDetails?.center_name || centerDetails?.name || '',
    }),
    [centerDetails?.name, centerDetails?.center_name],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, 500);

    return () => clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => {
    if (centerDetails?.name) {
      dispatch(getCenterDetailsThunk(centerDetails.name)).unwrap();
    }
  }, [dispatch, centerDetails?.name]);

  useEffect(() => {
    if (!centerDetails?.name || !filtersInitialized) return;
    dispatch(
      getLandlordListThunk({
        keyword: debouncedSearch,
        status: 'Active',
        page: 1,
        pageSize: 100,
        landlordListFilters: appliedLandlordFilters,
      }),
    );
  }, [dispatch, debouncedSearch, appliedLandlordFilters]);

  const {
    data: landlords = [],
    isLoading,
    error,
  } = useSelector((state) => state.landlord.landlordListData) ?? {};

  const handleAddLandlord = () => {
    dispatch(setCreateLandlordDrawer(true));
  };

  const handleModalClose = (open) => {
    dispatch(setAddLandlordModal(open));
  };

  const handleOpenCreateLandlordModal = () => {
    dispatch(setCreateLandlordDrawer(true));
  };

  const handleCreateLandlordModalClose = (open) => {
    dispatch(setCreateLandlordDrawer(open));
  };

  const handleCreateLandlordSave = async (landlordData) => {
    try {
      // Call the createLandlordThunk API and get the result
      const newLandlord = await dispatch(createLandlordThunk(landlordData)).unwrap();

      if (centerName && newLandlord?.data?.name) {
        // Get existing landlord IDs
        const existingLandlordIds =
          centerDetails?.landlord_details?.map((item) => item.landlord) || [];

        // Get the new landlord's ID (name property)
        const newLandlordId = newLandlord.data.name;

        // Combine existing and newly created landlord IDs
        const allLandlordIds = [...existingLandlordIds, newLandlordId];

        // Prepare payload with landlord_details as array of objects with landlord property
        const payload = {
          landlord_details: allLandlordIds.map((id) => ({ landlord: id })),
        };

        // Update center with the new landlord
        await dispatch(updateCenterThunk({ center_id: centerName, payload })).unwrap();

        // Refresh center details to see changes
        await dispatch(getCenterDetailsThunk(centerName)).unwrap();
      } else {
        if (!centerName) {
          console.warn('Center name not available, cannot add landlord to center');
        }
        if (!newLandlord?.name) {
          console.warn('New landlord ID not available, newLandlord:', newLandlord);
        }
      }

      // Close both modals simultaneously for smooth transition
      dispatch(setCreateLandlordDrawer(false));
      dispatch(setAddLandlordModal(false));
    } catch (error) {
      console.error('Failed to create landlord:', error);
      // Error handling is done in the modal component
      throw error; // Re-throw so modal can handle it
    }
  };

  const handleEditLandlordModalClose = (open) => {
    dispatch(setEditLandlordDrawer(open));
  };

  const handleEditLandlordSave = async () => {
    // Refresh center details after landlord update
    if (centerName) {
      await dispatch(getCenterDetailsThunk(centerName)).unwrap();
    }
  };

  const handleEdit = useCallback(
    (landlord) => {
      dispatch(setEditLandlordDrawer({ landlord }));
    },
    [dispatch],
  );

  const handleRemoveLandlordModalClose = (open) => {
    dispatch(setRemoveLandlordDrawer(open));
  };

  const landlordStatusBadgeVariant = useCallback((status) => {
    if (!status) return 'disabled';
    const normalized = String(status).toLowerCase();
    return (
      {
        active: 'green',
        inactive: 'red',
      }[normalized] || 'disabled'
    );
  }, []);

  const handleRemoveLandlord = useCallback(
    (landlord) => {
      dispatch(setRemoveLandlordDrawer({ landlord }));
    },
    [dispatch],
  );

  const handleRemoveConfirm = async (_landlord) => {
    if (!centerName) {
      console.error('Center name not available');
      dispatch(setRemoveLandlordDrawer(false));
      return;
    }

    try {
      // Get the landlord ID to remove - check both 'landlord' and 'name' properties
      const landlordIdToRemove = String(_landlord?.landlord || _landlord?.name || '').trim();

      if (!landlordIdToRemove) {
        console.error('Landlord ID not found in _landlord:', _landlord);
        throw new Error('Landlord ID is required for removal');
      }

      // Filter out the landlord with matching ID (compare as strings to handle type mismatches)
      const updatedLandlordDetails = centerDetails?.landlord_details?.filter((item) => {
        const itemLandlordId = String(item?.landlord || '').trim();
        return itemLandlordId !== landlordIdToRemove;
      });

      const payload = {
        landlord_details: updatedLandlordDetails.map((item) => ({ landlord: item.landlord })),
      };

      // Call updateCenter API
      await dispatch(updateCenterThunk({ center_id: centerName, payload })).unwrap();

      // Refresh center details to see changes
      await dispatch(getCenterDetailsThunk(centerName)).unwrap();

      dispatch(setRemoveLandlordDrawer(false));
    } catch (error) {
      console.error('Failed to remove landlord from center:', error);
      // Don't close modal on error so user can retry
    }
  };

  // Handle landlord selection from dropdown
  const handleLandlordSelect = useCallback(
    async (landlordName) => {
      if (!centerName) {
        console.error('Center name not available');
        return;
      }

      try {
        // Prepare payload with landlord.name
        const payload = {
          center_name: centerDetails?.center_name || centerName,
          status: centerDetails?.status,
          carpet_area: centerDetails?.carpet_area,
          city: centerDetails?.city,
          state: centerDetails?.state,
          zone: centerDetails?.zone,
          micro_market: centerDetails?.micro_market,
          pin_code: centerDetails?.pin_code,
          address: centerDetails?.address,
          amenity_details: centerDetails?.amenity_details || [],
          floor_details: centerDetails?.floor_details || [],
          landlord: landlordName, // Add landlord name to payload
        };

        // Call updateCenter API
        await dispatch(updateCenterThunk({ center_id: centerName, payload })).unwrap();

        // Refresh center details to see changes
        await dispatch(getCenterDetailsThunk(centerName)).unwrap();
      } catch (error) {
        console.error('Failed to update center with landlord:', error);
        throw error;
      }
    },
    [dispatch, centerName, centerDetails],
  );

  const hasLandlordDetails = centerDetails?.landlords && centerDetails.landlords.length > 0;

  const sortedLandlordDetails = useMemo(() => {
    if (!centerDetails?.landlords || !Array.isArray(centerDetails.landlords)) return [];
    return centerDetails.landlords;
  }, [centerDetails?.landlords]);

  const filterAppliedLandlords = useMemo(() => {
    if (sortedLandlordDetails.length === 0) return [];
    return sortedLandlordDetails.filter((row) =>
      landlordRowMatchesFilters(row, appliedLandlordFilters, landlordFilterContext),
    );
  }, [sortedLandlordDetails, appliedLandlordFilters, landlordFilterContext]);

  const filteredLandlordDetails = useMemo(() => {
    if (!debouncedSearch) return filterAppliedLandlords;

    const searchLower = debouncedSearch.toLowerCase();

    const clientSideMatch = (landlord) => {
      const lm = landlord.landlord_master || landlord;
      const name = String(lm.landlord_name || landlord.landlord_name || '').toLowerCase();
      const spocFirstName = String(lm.contact?.first_name || '').toLowerCase();
      const spocLastName = String(lm.contact?.last_name || '').toLowerCase();
      const spocFullName = `${spocFirstName} ${spocLastName}`.trim();
      const spocContact = String(lm.contact?.mobile_number || '').toLowerCase();
      const spocEmail = String(lm.contact?.contact_email || '').toLowerCase();
      const status = String(lm.status || landlord.status || '').toLowerCase();
      const shopNumber = String(lm.shop_number || landlord.shop_number || '').toLowerCase();
      const blockFloor = String(lm.block_floor || landlord.block_floor || '').toLowerCase();
      const tags = String(
        lm._user_tags || lm.tags || landlord._user_tags || landlord.tags || '',
      ).toLowerCase();
      return (
        name.includes(searchLower) ||
        spocFirstName.includes(searchLower) ||
        spocLastName.includes(searchLower) ||
        spocFullName.includes(searchLower) ||
        spocContact.includes(searchLower) ||
        spocEmail.includes(searchLower) ||
        status.includes(searchLower) ||
        shopNumber.includes(searchLower) ||
        blockFloor.includes(searchLower) ||
        tags.includes(searchLower)
      );
    };

    if (isLoading) {
      return filterAppliedLandlords.filter(clientSideMatch);
    }

    const apiIds = new Set(
      (landlords || []).map((item) => String(item?.name || item?.id || '').trim()).filter(Boolean),
    );
    if (apiIds.size === 0) return [];

    return filterAppliedLandlords.filter((row) => {
      const id = String(row?.landlord_master?.name || row?.name || '').trim();
      return id && apiIds.has(id);
    });
  }, [filterAppliedLandlords, debouncedSearch, landlords, isLoading]);

  const persistLandlordColumnPrefs = useCallback(
    async (payload) => persistLandlordViewColumns(CENTER_VIEW_LANDLORD_TABLE_ID, payload),
    [],
  );

  const readLandlordColumnPrefs = useCallback(async () => {
    return readLandlordViewColumns(CENTER_VIEW_LANDLORD_TABLE_ID);
  }, []);

  const allLandlordColumnDefs = useMemo(
    () => [
      {
        id: 'name',
        label: 'Name',
        header: () => (
          <span className='text-left label-small text-text-sub-600 font-medium'>Name</span>
        ),
        cell: ({ row }) => {
          const landlordData = row.original.landlord_master || row.original;
          return (
            <span className='paragraph-small whitespace-nowrap text-text-sub-500'>
              {landlordData.landlord_name}
            </span>
          );
        },
      },
      {
        id: 'spoc',
        label: 'SPOC',
        header: () => (
          <span className='text-left label-small text-text-sub-600 font-medium'>SPOC</span>
        ),
        cell: ({ row }) => {
          const landlordData = row.original.landlord_master || row.original;
          const spoc = [landlordData?.contact?.first_name, landlordData?.contact?.last_name]
            .filter(Boolean)
            .join(' ');
          return (
            <span className='paragraph-small whitespace-nowrap text-text-sub-500'>{spoc}</span>
          );
        },
      },
      {
        id: 'spoc_contact',
        label: 'SPOC Contact no',
        header: () => (
          <span className='text-left label-small text-text-sub-600 font-medium'>
            SPOC Contact no
          </span>
        ),
        cell: ({ row }) => {
          const landlordData = row.original.landlord_master || row.original;
          return (
            <span className='paragraph-small whitespace-nowrap text-text-sub-500'>
              {landlordData.contact?.mobile_number}
            </span>
          );
        },
      },
      {
        id: 'email',
        label: 'Email',
        header: () => (
          <span className='text-left label-small text-text-sub-600 font-medium'>Email</span>
        ),
        cell: ({ row }) => {
          const landlordData = row.original.landlord_master || row.original;
          return (
            <span className='paragraph-small whitespace-nowrap text-text-sub-500'>
              {landlordData.contact?.contact_email}
            </span>
          );
        },
      },
      {
        id: 'state',
        label: 'State',
        header: () => (
          <span className='text-left label-small text-text-sub-600 font-medium'>State</span>
        ),
        cell: ({ row }) => {
          const landlordData = row.original.landlord_master || row.original;
          const state = landlordData?.address?.state || landlordData?.state;
          return (
            <span className='paragraph-small whitespace-nowrap text-text-sub-500'>
              {state || '--'}
            </span>
          );
        },
      },
      {
        id: 'city',
        label: 'City',
        header: () => (
          <span className='text-left label-small text-text-sub-600 font-medium'>City</span>
        ),
        cell: ({ row }) => {
          const landlordData = row.original.landlord_master || row.original;
          const city = landlordData?.address?.city || landlordData?.city;
          return (
            <span className='paragraph-small whitespace-nowrap text-text-sub-500'>
              {city || '--'}
            </span>
          );
        },
      },
      {
        id: 'engagement_mode',
        label: 'Engagement Mode',
        header: () => (
          <span className='text-left label-small text-text-sub-600 font-medium'>
            Engagement Mode
          </span>
        ),
        cell: ({ row }) => {
          const landlordData = row.original.landlord_master || row.original;
          return (
            <Badge.Root variant='stroke' color='gray' size='small' className='text-nowrap'>
              {landlordData?.engagement_mode || '--'}
            </Badge.Root>
          );
        },
      },
      {
        id: 'tags',
        label: 'Tags',
        header: () => (
          <span className='text-left label-small text-text-sub-600 font-medium'>Tags</span>
        ),
        cell: ({ row }) => {
          const landlordData = row.original.landlord_master || row.original;
          const tags = landlordData?.tags;
          const tagList =
            typeof tags === 'string'
              ? tags
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
              : Array.isArray(tags)
                ? tags.map((t) => (typeof t === 'string' ? t : String(t)))
                : [];
          if (tagList.length === 0) {
            return <span className='paragraph-small text-[var(--color-text-sub-600)]'>--</span>;
          }
          const maxVisible = 2;
          const visibleTags = tagList.slice(0, maxVisible);
          const remainingCount = tagList.length - maxVisible;
          return (
            <div className='flex flex-wrap items-center gap-1 max-w-[220px]'>
              {visibleTags.map((tag) => (
                <Badge.Root
                  key={tag}
                  variant='stroke'
                  color='gray'
                  size='small'
                  className='text-nowrap'
                >
                  {tag}
                </Badge.Root>
              ))}
              {remainingCount > 0 && (
                <Badge.Root
                  variant='stroke'
                  color='gray'
                  size='small'
                  className='text-nowrap'
                  title={tagList.slice(maxVisible).join(', ')}
                >
                  +{remainingCount}
                </Badge.Root>
              )}
            </div>
          );
        },
      },
      {
        id: 'block_floor',
        label: 'Block / Floor',
        header: () => (
          <span className='text-left label-small text-text-sub-600 font-medium'>Block / Floor</span>
        ),
        cell: ({ row }) => {
          return (
            <span className='paragraph-small whitespace-nowrap text-text-sub-500'>
              {row.original.block_floor || '--'}
            </span>
          );
        },
      },
      {
        id: 'status',
        label: 'Status',
        header: () => (
          <span className='text-left label-small text-text-sub-600 font-medium'>Status</span>
        ),
        cell: ({ row }) => {
          const landlordData = row.original.landlord_master || row.original;
          const status = landlordData.status || row.original.status || 'active';
          return (
            <Badge.Root variant='light' color={landlordStatusBadgeVariant(status)} size='small'>
              {status?.toUpperCase() || 'ACTIVE'}
            </Badge.Root>
          );
        },
      },
      {
        id: 'actions',
        label: 'Actions',
        enableHiding: false,
        header: () => (
          <span className='invisible w-[100px] text-left label-small' aria-hidden>
            Actions
          </span>
        ),
        cell: ({ row }) => {
          const landlordData = row.original.landlord_master || row.original;
          return (
            <div className='flex items-center justify-end'>
              {canWrite && (
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='ghost'
                  size='medium'
                  onClick={() => navigate(`/landlords/${landlordData.name}`)}
                  aria-label='Edit landlord'
                  className='inline-flex items-center justify-center rounded-full'
                >
                  <Button.Icon as={RiPencilLine} />
                </Button.Root>
              )}
            </div>
          );
        },
        meta: {
          headClassName:
            'w-[100px] min-w-[52px] sticky right-0 z-20 bg-bg-weak-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]',
          cellClassName:
            'border-stroke-soft-200 sticky right-0 z-20 bg-white min-w-[52px] shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)] group-hover/row:bg-bg-weak-50',
        },
      },
    ],
    [canWrite, navigate, landlordStatusBadgeVariant],
  );

  const defaultLandlordColumnConfig = useMemo(
    () => prepareColumnsForConfig(allLandlordColumnDefs),
    [allLandlordColumnDefs],
  );

  const landlordColumnConfigHook = useColumnConfig(
    CENTER_VIEW_LANDLORD_TABLE_ID,
    defaultLandlordColumnConfig,
    persistLandlordColumnPrefs,
    readLandlordColumnPrefs,
    { autoSave: true, debounce: 300 },
  );

  const visibleLandlordColumnDefs = useMemo(() => {
    const applied = applyColumnConfig(allLandlordColumnDefs, landlordColumnConfigHook.columns);
    const actionsCol = applied.find((c) => (c.id || c.accessorKey) === 'actions');
    const rest = applied.filter((c) => (c.id || c.accessorKey) !== 'actions');
    return actionsCol ? [...rest, actionsCol] : applied;
  }, [allLandlordColumnDefs, landlordColumnConfigHook.columns]);

  const landlordDataTable = useReactTable({
    data: filteredLandlordDetails,
    columns: visibleLandlordColumnDefs,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row, index) =>
      String(row?.landlord_master?.name || row?.name || row?.id || `landlord-row-${index}`),
  });

  const handleLandlordFiltersChange = useCallback((next) => {
    setAppliedLandlordFilters(next);
  }, []);

  const handleClearLandlordFilters = useCallback((e) => {
    e.stopPropagation();
    setAppliedLandlordFilters(DEFAULT_LANDLORD_VIEW_FILTERS);
    setFilterCount(0);
    setIsLandlordFilterOpen(false);
  }, []);

  return (
    <>
      <div className='w-full h-full  justify-center gap-[20px]'>
        {hasLandlordDetails ? (
          <CenterViewCommonLayout
            title='Search by landlord, SPOC, contact, email, tags, shop no'
            Icon={RiUser2Line}
            buttonName='Add New Landlord'
            onButtonClick={handleAddLandlord}
            showButton={hasLandlordDetails}
            headerActions={
              <div className='flex items-center gap-3'>
                <Popover.Root
                  open={isLandlordFilterOpen}
                  onOpenChange={(open) => {
                    const wasOpen = isLandlordFilterOpen;
                    setIsLandlordFilterOpen(open);
                    if (wasOpen && !open && landlordFilterRef.current) {
                      landlordFilterRef.current.handleClose();
                    }
                  }}
                >
                  <Filter.TriggerButton
                    filterCount={filterCount}
                    onClear={handleClearLandlordFilters}
                    tooltipContent='Filter landlords'
                    ariaLabel='Filter landlords'
                  />
                  <CenterViewLandlordFilterDropdown
                    ref={landlordFilterRef}
                    open={isLandlordFilterOpen}
                    setFilterCount={setFilterCount}
                    onFiltersChange={handleLandlordFiltersChange}
                    appliedFilters={appliedLandlordFilters}
                    pageLandlords={centerDetails?.landlords || []}
                  />
                </Popover.Root>
                <ColumnManagerDropdown
                  open={isColumnManagerOpen}
                  onOpenChange={setIsColumnManagerOpen}
                  config={landlordColumnConfigHook}
                  tooltipContent={<p>Column manager</p>}
                  trigger={
                    <Button.Root
                      variant='neutral'
                      mode='stroke'
                      size='small'
                      className='gap-1'
                      aria-label='Columns'
                    >
                      <Button.Icon>
                        <RiLayoutColumnLine size={20} />
                      </Button.Icon>
                    </Button.Root>
                  }
                />
              </div>
            }
            searchValue={searchValue}
            onSearchChange={setSearchValue}
          >
            {filteredLandlordDetails?.length > 0 ? (
              <div className='w-full border-stroke-soft-200 rounded-lg border'>
                <Table.Root variant={tableVariant}>
                  <Table.Header>
                    {landlordDataTable.getHeaderGroups().map((headerGroup) => (
                      <Table.Row key={headerGroup.id} className='bg-bg-weak-50'>
                        {headerGroup.headers.map((header) => (
                          <Table.Head
                            key={header.id}
                            className={header.column.columnDef.meta?.headClassName}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </Table.Head>
                        ))}
                      </Table.Row>
                    ))}
                  </Table.Header>
                  <Table.Body>
                    {landlordDataTable.getRowModel().rows.map((row, index) => {
                      const isLastRow = index === landlordDataTable.getRowModel().rows.length - 1;
                      return (
                        <Table.Row
                          key={row.id}
                          className={`cursor-pointer group/row ${isLastRow ? 'border-b-0' : 'border-b border-stroke-soft-200'} hover:bg-bg-weak-50 transition-colors`}
                          onClick={() => {
                            const landlordData = row.original.landlord_master || row.original;
                            if (landlordData?.name) {
                              navigate(`/landlords/${landlordData.name}`);
                            }
                          }}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <Table.Cell
                              key={cell.id}
                              className={cell.column.columnDef.meta?.cellClassName}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </Table.Cell>
                          ))}
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Root>
              </div>
            ) : (
              <div className='w-full flex flex-col items-center justify-center gap-4 py-10'>
                <img className='object-contain' src={emptyState} alt='no results' />
                <span className='label-medium text-[var(--color-text-soft-400)]'>
                  No results found for your search.
                </span>
              </div>
            )}
          </CenterViewCommonLayout>
        ) : (
          <div className='w-full h-full flex flex-col items-center justify-center gap-[20px]'>
            <img className='object-contain' src={emptyState} alt='no data' />
            <span className='label-medium text-[var(--color-text-soft-400)]'>
              No landlord found for this center. Start by adding one.
            </span>
            {canWrite && (
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                onClick={handleAddLandlord}
                className='gap-2'
              >
                <Button.Icon as={RiAddLine} />
                Add New Landlord
              </Button.Root>
            )}
          </div>
        )}
      </div>
      <CenterViewLandlordModal
        centerDetails={centerDetails}
        landlordData={landlords}
        isOpen={isAddLandlordModalOpen}
        onOpenChange={handleModalClose}
        onOpenCreateLandlordModal={handleOpenCreateLandlordModal}
        onLandlordSelect={handleLandlordSelect}
      />
      <CreateLandlordModal
        landlordData={landlords}
        isOpen={isCreateLandlordModalOpen}
        handleOpenChange={handleCreateLandlordModalClose}
        handleSave={handleCreateLandlordSave}
        defaultCenter={centerName}
      />
      {/* <EditLandlordModal
        handleOpenChange={handleEditLandlordModalClose}
        handleSave={handleEditLandlordSave}
      /> */}
      <RemoveLandlordModal
        isOpen={isRemoveLandlordModalOpen}
        handleOpenChange={handleRemoveLandlordModalClose}
        handleRemove={handleRemoveConfirm}
        selectedLandlord={selectedRemoveLandlord}
        centerDetails={centerDetails}
        removalType='update'
      />
    </>
  );
};

export default CenterViewLandlord;
