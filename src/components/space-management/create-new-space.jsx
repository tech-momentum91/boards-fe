import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiCloseLine,
  RiDeleteBinLine,
  RiImage2Line,
  RiUploadCloud2Line,
  RiUploadLine,
  RiSearchLine,
  RiCheckLine,
} from 'react-icons/ri';

import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Dropdown from '@/components/ui/dropdown';
import * as Label from '@/components/ui/label';
import * as Switch from '@/components/ui/switch';
import ErrorText from '@/components/ui/error-text';
import { cn } from '@/utils/cn';

import ManageOfficeLayout from './layout/manage-officec';
import CoWorkingLayout from './layout/co-working';
import ResourceLayout from './layout/resource';
import PureRentalLayout from './layout/pure-rental';
import { SPACE_TYPE, defaultSpaceCreateValues, spaceCreateSchema } from '@/schemas/space-schema';
import { FALLBACK_CENTERS, FLOOR_OPTIONS, SPACE_TYPE_OPTIONS } from './constants';
import { formatFileSize } from '@/utils/file-utils';
import { resolveCoworkingInventoryTypeForApi } from '@/utils/layout-coworking-inventory-type';
import { createSpace } from '@/redux/spaceSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { getCenterListThunk } from '@/redux/centerSlice';
import { useDebounce } from '@/hooks/use-debounce';
import { fetchFloors } from '@/redux/ticketManagementSlice';
import { findMatchingPricing } from '@/utils/center-configuration-storage';

/** First-page fetch must include enough rows so deep-linked `initialCenterId` exists in options (API is paginated). */
const CREATE_SPACE_CENTER_LIST_PAGE_SIZE = 500;

const CreateNewSpaceModal = ({
  open,
  centerDetails,
  disabledCenter = false,
  setOpen,
  centerOptions = [],
  onSuccess,
  /** Pre-select center when opening from deep link (e.g. bookings → spaces); user can still change */
  initialCenterId,
  /** Pre-select space type (e.g. Resource) from deep link */
  initialSpaceType,
  /** Floor row id (`value` from floor options), e.g. when opening create from center space filters */
  initialFloorId,
  /** Optional status label matching Space create form options */
  initialStatus,
}) => {
  const dispatch = useDispatch();
  const { data: centerListData } = useSelector((state) => state.center.centerListData);
  const floors = useSelector((state) => state.ticketManagement.floors);
  const photosInputRef = useRef(null);
  const planInputRef = useRef(null);
  const centerSearchInputRef = useRef(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    formState: { errors, isValid, isSubmitting },
  } = useForm({
    resolver: zodResolver(spaceCreateSchema),
    defaultValues: defaultSpaceCreateValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const watchCenter = watch('center');
  const watchFloor = watch('floor');
  const watchSpaceType = watch('space_type');
  const watchSpaceName = watch('space_name');
  // const watchStatus = watch('status');
  const watchPhotos = watch('photos');
  const watchPlanFile = watch('plan_file');

  const spaceType = useWatch({ control, name: 'space_type' });
  const photos = useWatch({ control, name: 'photos' }) || [];
  const planFiles = useWatch({ control, name: 'plan_file' }) || [];

  const [draftSaving, setDraftSaving] = useState(false);
  const [photoDragActive, setPhotoDragActive] = useState(false);
  const [planDragActive, setPlanDragActive] = useState(false);
  const [centerSearchQuery, setCenterSearchQuery] = useState('');
  const [centerDropdownOpen, setCenterDropdownOpen] = useState(false);
  const { isLoading: centerListLoading } = useSelector((state) => state.center.centerListData);

  const debouncedCenterSearch = useDebounce(centerSearchQuery, 300);

  const fetchCenterDropDown = useCallback(
    async (keyword = '', options = {}) => {
      const { pageSize, append, filters } = options;
      const kw = String(keyword ?? '').trim();
      // Empty keyword = full dropdown list; must match CREATE_SPACE_CENTER_LIST_PAGE_SIZE or open-load overwrites with thunk default (20).
      const effectivePageSize =
        pageSize ?? (kw === '' ? CREATE_SPACE_CENTER_LIST_PAGE_SIZE : undefined);
      try {
        await dispatch(
          getCenterListThunk({
            keyword,
            filters: filters ?? [],
            ...(effectivePageSize != null ? { pageSize: effectivePageSize } : {}),
            ...(append != null ? { append } : {}),
          }),
        ).unwrap();
      } catch {
        // Handle error silently or show toast notification
      }
    },
    [dispatch],
  );

  useEffect(() => {
    if (open) {
      reset(defaultSpaceCreateValues);
      setCenterSearchQuery('');
      void (async () => {
        try {
          const payload = await dispatch(
            getCenterListThunk({
              keyword: '',
              filters: [],
              pageSize: CREATE_SPACE_CENTER_LIST_PAGE_SIZE,
            }),
          ).unwrap();
          const rows = payload?.results ?? [];
          const hasDeepLinkCenter =
            initialCenterId &&
            rows.some((r) => String(r.name ?? r.id ?? '') === String(initialCenterId));

          if (initialCenterId && !disabledCenter && !hasDeepLinkCenter) {
            await dispatch(
              getCenterListThunk({
                keyword: '',
                filters: [['name', '=', initialCenterId]],
                pageSize: 1,
                append: true,
              }),
            ).unwrap();
          }
        } catch {
          /* silent */
        }
      })();

      // If center is disabled (opened from center's module), set the center value
      if (disabledCenter && centerDetails?.name) {
        setValue('center', centerDetails.name);
      } else if (initialCenterId) {
        setValue('center', initialCenterId);
      }
      if (initialSpaceType && Object.values(SPACE_TYPE).includes(initialSpaceType)) {
        setValue('space_type', initialSpaceType);
      }
      if (initialStatus && String(initialStatus).trim()) {
        setValue('status', initialStatus);
      }
    }
  }, [
    open,
    reset,
    dispatch,
    disabledCenter,
    centerDetails,
    initialCenterId,
    initialSpaceType,
    initialStatus,
    setValue,
  ]);

  // Apply floor after options load (open flow resets floor when center is set).
  useEffect(() => {
    if (!open || !initialFloorId) return;
    const centerToUse =
      watchCenter || (disabledCenter && centerDetails?.name ? centerDetails.name : null);
    if (!centerToUse) return;
    if (floors.status === 'loading') return;
    const opts = floors.data[centerToUse] || [];
    const id = String(initialFloorId).trim();
    const match = opts.find((o) => String(o.value ?? o.name ?? '') === id);
    if (!match) return;
    const next = String(match.value ?? match.name ?? id);
    const cur = getValues('floor');
    if (String(cur ?? '') === next) return;
    setValue('floor', next, { shouldValidate: true });
  }, [
    open,
    initialFloorId,
    floors.data,
    floors.status,
    watchCenter,
    disabledCenter,
    centerDetails?.name,
    setValue,
    getValues,
  ]);

  // Pre-select deep-linked center once list data actually contains that row (avoids racing loading flags).
  useEffect(() => {
    if (!open || disabledCenter || !initialCenterId) return;
    if (centerListLoading) return;
    const list = Array.isArray(centerListData) ? centerListData : [];
    const found = list.some((r) => String(r.name ?? r.id ?? '') === String(initialCenterId));
    if (!found) return;
    const cur = getValues('center');
    if (String(cur ?? '') === String(initialCenterId)) return;
    setValue('center', initialCenterId, { shouldValidate: true });
  }, [
    open,
    disabledCenter,
    initialCenterId,
    centerListData,
    centerListLoading,
    setValue,
    getValues,
  ]);

  // Search centers when debounced query is non-empty (initial empty list is loaded by open effect / fetchCenterDropDown('') uses large page).
  useEffect(() => {
    if (!open || debouncedCenterSearch.trim() === '') return;
    fetchCenterDropDown(debouncedCenterSearch);
  }, [debouncedCenterSearch, open, fetchCenterDropDown]);

  // Fetch floors when center changes
  useEffect(() => {
    if (!open) return;

    const centerToUse =
      watchCenter || (disabledCenter && centerDetails?.name ? centerDetails.name : null);
    if (centerToUse && centerToUse && open) {
      dispatch(fetchFloors(centerToUse));
    }
  }, [watchCenter, disabledCenter, centerDetails, dispatch, open, setValue]);

  useEffect(() => {
    if (watchCenter) {
      setValue('floor', '');
    }
  }, [watchCenter, setValue]);

  // Get floor options based on selected center
  const currentFloorOptions = useMemo(() => {
    const centerToUse =
      watchCenter || (disabledCenter && centerDetails?.name ? centerDetails.name : null);
    if (!centerToUse) return [];
    return floors.data[centerToUse] || [];
  }, [watchCenter, disabledCenter, centerDetails, floors.data]);

  // Reset managed office fields when switching away
  useEffect(() => {
    if (!spaceType || spaceType !== SPACE_TYPE.MANAGED_OFFICE) {
      setValue('managed_office', defaultSpaceCreateValues.managed_office, { shouldDirty: false });
    }
  }, [spaceType, setValue]);

  // Reset co-working fields when switching away
  useEffect(() => {
    if (!spaceType || spaceType !== SPACE_TYPE.CO_WORKING) {
      setValue('co_working', defaultSpaceCreateValues.co_working, { shouldDirty: false });
    }
  }, [spaceType, setValue]);

  // Reset resource fields when switching away
  useEffect(() => {
    if (!spaceType || spaceType !== SPACE_TYPE.RESOURCE) {
      setValue('resource', defaultSpaceCreateValues.resource, { shouldDirty: false });
    }
  }, [spaceType, setValue]);

  const watchManagedOfficeType = watch('managed_office.managed_office_type');
  const watchCoworkingType = watch('co_working.co_working_space_type');
  const watchResourceType = watch('resource.resource_type');
  const watchPureRentalType = watch('pure_rental.pure_rental_type');

  // Auto-populate pricing from Center Configuration when space type & subtype are selected
  useEffect(() => {
    const centerToUse =
      watchCenter || (disabledCenter && centerDetails?.name ? centerDetails.name : null);
    if (!centerToUse || !spaceType) return;

    let subType = '';
    if (spaceType === SPACE_TYPE.MANAGED_OFFICE) subType = watchManagedOfficeType || 'Fitted Out';
    else if (spaceType === SPACE_TYPE.CO_WORKING) subType = watchCoworkingType || 'Private Cabin';
    else if (spaceType === SPACE_TYPE.RESOURCE) subType = watchResourceType || 'Cabins';
    else if (spaceType === SPACE_TYPE.PURE_RENTAL) subType = watchPureRentalType || 'Furnished';

    if (!subType) return;

    const match = findMatchingPricing(centerToUse, spaceType, subType);
    if (match) {
      if (spaceType === SPACE_TYPE.MANAGED_OFFICE) {
        if (match.pricePerSeat !== undefined)
          setValue('managed_office.expected_per_seat_rate', String(match.pricePerSeat), {
            shouldDirty: true,
          });
        if (match.pricePerSqFt !== undefined)
          setValue('managed_office.expected_carpet_rate', String(match.pricePerSqFt), {
            shouldDirty: true,
          });
        if (match.creditPerSeat !== undefined)
          setValue('managed_office.credit_per_seat', String(match.creditPerSeat), {
            shouldDirty: true,
          });
      } else if (spaceType === SPACE_TYPE.CO_WORKING) {
        if (match.pricePerSeat !== undefined)
          setValue('co_working.expected_per_seat_rate', String(match.pricePerSeat), {
            shouldDirty: true,
          });
        if (match.pricePerSqFt !== undefined)
          setValue('co_working.expected_carpet_rate', String(match.pricePerSqFt), {
            shouldDirty: true,
          });
        if (match.creditPerSeat !== undefined)
          setValue('co_working.credit_per_seat', String(match.creditPerSeat), {
            shouldDirty: true,
          });
      } else if (spaceType === SPACE_TYPE.RESOURCE) {
        if (match.pricePerSeat !== undefined)
          setValue('resource.rate_per_hour', String(match.pricePerSeat), { shouldDirty: true });
        if (match.creditPerSeat !== undefined)
          setValue('resource.credit_per_hour', String(match.creditPerSeat), {
            shouldDirty: true,
          });
      } else if (spaceType === SPACE_TYPE.PURE_RENTAL) {
        if (match.pricePerSeat !== undefined)
          setValue('pure_rental.expected_per_seat_rate', String(match.pricePerSeat), {
            shouldDirty: true,
          });
        if (match.pricePerSqFt !== undefined)
          setValue('pure_rental.expected_carpet_rate', String(match.pricePerSqFt), {
            shouldDirty: true,
          });
        if (match.creditPerSeat !== undefined)
          setValue('pure_rental.credit_per_seat', String(match.creditPerSeat), {
            shouldDirty: true,
          });
      }
    }
  }, [
    spaceType,
    watchCenter,
    disabledCenter,
    centerDetails?.name,
    watchManagedOfficeType,
    watchCoworkingType,
    watchResourceType,
    watchPureRentalType,
    setValue,
  ]);

  // Reset pure rental fields when switching away
  useEffect(() => {
    if (!spaceType || spaceType !== SPACE_TYPE.PURE_RENTAL) {
      setValue('pure_rental', defaultSpaceCreateValues.pure_rental, { shouldDirty: false });
    }
  }, [spaceType, setValue]);

  const onClose = () => {
    if (!isSubmitting) setOpen(false);
  };

  const handlePhotosPicked = (fileList) => {
    const files = [...(fileList || [])];
    const onlyImages = files.filter((f) => f.type?.startsWith('image/'));
    const next = [...photos, ...onlyImages];
    setValue('photos', next, { shouldDirty: true, shouldValidate: false });
  };

  const removePhotoAt = (index) => {
    const next = photos.filter((_, i) => i !== index);
    setValue('photos', next, { shouldDirty: true, shouldValidate: false });
  };

  const handlePlanPicked = (fileList) => {
    const files = [...(fileList || [])];
    const next = [...planFiles, ...files];
    setValue('plan_file', next, { shouldDirty: true, shouldValidate: false });
  };

  const removePlanAt = (index) => {
    const next = planFiles.filter((_, i) => i !== index);
    setValue('plan_file', next, { shouldDirty: true, shouldValidate: false });
  };

  const submitPayload = async (data, mode) => {
    // For now: UI-only. Next step we’ll call createSpace API + redux.
    setOpen(false);
  };

  const onCreate = async (data) => {
    try {
      const formData = new FormData();

      // Common fields for all space types
      // Get center ID (like CTR-01) - use centerDetails.name if available, otherwise use data.center from dropdown
      const centerId = centerDetails?.name || data.center;

      // Helper function to append numeric fields as strings (ensures backend receives valid numbers as strings)
      const appendNumber = (key, value, backendKey = null) => {
        if (value !== undefined && value !== null && value !== '') {
          const numberValue = typeof value === 'number' ? value : Number(value);
          if (!Number.isNaN(numberValue)) {
            formData.append(backendKey || key, String(numberValue));
          }
        }
      };

      // Backend now uses total_seats for all space types
      if (spaceType === SPACE_TYPE.MANAGED_OFFICE) {
        const moAvailableSeats =
          data.managed_office.total_seats ?? data.managed_office.total_sellable_seats ?? 0;
        appendNumber('available_seats', moAvailableSeats);
      }
      if (spaceType === SPACE_TYPE.CO_WORKING) {
        const cwAvailableSeats = data.co_working.total_seats ?? data.co_working.no_of_seats ?? 0;
        appendNumber('available_seats', cwAvailableSeats);
      }
      if (centerId) {
        formData.append('center', centerId);
      }

      // Get center_name - use centerDetails.center_name if available, otherwise find from centerListData
      let centerName = centerDetails?.center_name;
      if (!centerName && data.center && centerListData) {
        const selectedCenter = centerListData.find((item) => item.name === data.center);
        centerName = selectedCenter?.center_name;
      }
      if (centerName) {
        formData.append('center_name', centerName);
      }
      if (data.floor) {
        formData.append('floor', data.floor);
      }
      if (data.space_type) {
        formData.append('inventory_type', data.space_type);
      }
      if (data.space_name) {
        formData.append('inventory_name', data.space_name);
      }
      // if (data.status) {
      //   formData.append('status', data.status);
      // }
      // Code field - optional, can be added if needed in the form
      if (data.code) {
        formData.append('code', data.code);
      }

      // Handle photos - append each file
      if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) {
        data.photos.forEach((photo) => {
          if (photo instanceof File) {
            formData.append('photos', photo);
          }
        });
      }

      // Handle plan file
      if (data.plan_file && Array.isArray(data.plan_file) && data.plan_file.length > 0) {
        data.plan_file.forEach((file) => {
          if (file instanceof File) {
            formData.append('plan_file', file);
          }
        });
      }

      // Managed Office specific fields
      if (data.space_type === SPACE_TYPE.MANAGED_OFFICE && data.managed_office) {
        const mo = data.managed_office;

        if (mo.managed_office_type) {
          formData.append('managed_office_type', mo.managed_office_type);
        }

        appendNumber('agreement_carpet_area', mo.total_carpet_area);
        appendNumber('actual_carpet_area', mo.actual_carpet_area);
        appendNumber('expected_carpet_rate', mo.expected_carpet_rate);
        // Backend now uses total_seats for all space types (replaced total_sellable_seats)
        const moTotalSeats = mo.total_seats ?? mo.total_sellable_seats;
        appendNumber('total_seats', moTotalSeats);
        appendNumber('expected_per_seat_rate', mo.expected_per_seat_rate);
        appendNumber('no_of_workstations', mo.no_of_workstations);
        appendNumber('director_cabin', mo.director_cabins); // Backend uses singular
        appendNumber('manager_cabins', mo.manager_cabins);
        appendNumber('meeting_rooms', mo.meeting_rooms);
        appendNumber('conference_rooms', mo.conference_rooms);
        appendNumber('phonebooths', mo.phonebooths);
        appendNumber('breakout_zones', mo.breakout_zones);
        appendNumber('credit_per_seat', mo.credit_per_seat);
        appendNumber('total_rate_of_space', mo.total_rate_of_space);
      }

      // Co-Working Space specific fields - matching the exact payload structure
      if (data.space_type === SPACE_TYPE.CO_WORKING && data.co_working) {
        const cw = data.co_working;

        if (cw.co_working_space_type) {
          formData.append(
            'coworking_inventory_type',
            resolveCoworkingInventoryTypeForApi(cw.co_working_space_type),
          );
        }
        appendNumber('agreement_carpet_area', cw.total_carpet_area);
        appendNumber('actual_carpet_area', cw.actual_carpet_area);
        appendNumber('expected_carpet_rate', cw.expected_carpet_rate);
        // Backend now uses total_seats for all space types (replaced no_of_seats)
        const cwTotalSeats = cw.total_seats ?? cw.no_of_seats;
        appendNumber('total_seats', cwTotalSeats);
        appendNumber('expected_per_seat_rate', cw.expected_per_seat_rate);
        appendNumber('credit_per_seat', cw.credit_per_seat);
        // Note: total_rate_of_space and total_credits are not in the example payload
        // but keeping them for backward compatibility
        appendNumber('total_rate_of_space', cw.total_rate_of_space);
        appendNumber('total_credits', cw.total_credits);
      }

      // Resource specific fields - matching the exact payload structure
      if (data.space_type === SPACE_TYPE.RESOURCE && data.resource) {
        const {
          resource_type,
          pax,
          credit_per_hour,
          bookable,
          agreement_carpet_area,
          actual_carpet_area,
          expected_carpet_rate,
          expected_per_seat_rate,
          credit_per_seat,
          total_rate_of_space,
        } = data.resource;
        const isBookable = bookable !== false && bookable !== 'No';

        if (resource_type) {
          formData.append('resource_type', resource_type);
        }

        appendNumber('pax', pax);
        formData.append('total_seats', pax);
        formData.append('bookable', isBookable ? 'Yes' : 'No');

        if (isBookable) {
          appendNumber('credit_per_hour', credit_per_hour);
        } else {
          appendNumber('agreement_carpet_area', agreement_carpet_area);
          appendNumber('actual_carpet_area', actual_carpet_area);
          appendNumber('expected_carpet_rate', expected_carpet_rate);
          appendNumber('expected_per_seat_rate', expected_per_seat_rate);
          appendNumber('credit_per_seat', credit_per_seat);
          appendNumber('total_rate_of_space', total_rate_of_space);
        }
      }

      // Pure Rental specific fields
      if (data.space_type === SPACE_TYPE.PURE_RENTAL && data.pure_rental) {
        const pr = data.pure_rental;

        if (pr.pure_rental_type) {
          formData.append('pure_rental_type', pr.pure_rental_type);
        }
        appendNumber('agreement_carpet_area', pr.total_carpet_sft);
        appendNumber('actual_carpet_area', pr.actual_carpet_area);
        appendNumber('expected_carpet_rate', pr.expected_carpet_rate);
      }

      // Dispatch the createSpace action with FormData
      const result = await dispatch(createSpace(formData)).unwrap();

      showSuccessToast('Space created successfully.');
      // handleClear();
      setOpen(false);

      // Call onSuccess callback if provided to refresh the list
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to create space. Please try again.' });
    }
  };

  const handleClear = () => {
    reset(defaultSpaceCreateValues);
    setPhotoDragActive(false);
    setPlanDragActive(false);
  };

  const onSaveDraft = async () => {
    try {
      setDraftSaving(true);
      const data = getValues();
      await submitPayload(data, 'draft');
    } finally {
      setDraftSaving(false);
    }
  };

  const showManagedOffice = spaceType === SPACE_TYPE.MANAGED_OFFICE;
  const showCoWorking = spaceType === SPACE_TYPE.CO_WORKING;
  const showResource = spaceType === SPACE_TYPE.RESOURCE;
  const showPureRental = spaceType === SPACE_TYPE.PURE_RENTAL;

  const headerTitle = 'Create New Space';
  const headerDescription = 'Enter below details to add new space.';

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Content side='right' className='max-w-[520px]'>
        <Drawer.Header
          className='px-6 py-4 border-b sticky top-0 z-10 bg-white border-stroke-soft-200'
          showCloseButton={false}
        >
          <div className='flex items-start justify-between w-full gap-4'>
            <div className='flex flex-col gap-1'>
              <div className='label-medium text-text-strong-950'>{headerTitle}</div>
              <div className='paragraph-small text-text-sub-600'>{headerDescription}</div>
            </div>
            <Button.Root variant='neutral' mode='stroke' size='xsmall' onClick={onClose}>
              <Button.Icon as={RiCloseLine} />
            </Button.Root>
          </div>
        </Drawer.Header>

        <Drawer.Body className='py-5 flex flex-col  overflow-y-auto '>
          <form className='flex size-full flex-col'>
            {/* Basic Information */}
            <div className='flex flex-col px-8 gap-4 pb-5 '>
              <div className='text-label-sm text-text-strong-950'>Basic Information</div>

              <div className='grid grid-cols-2 gap-y-4 gap-x-3'>
                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    Space Type <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='space_type'
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        options={SPACE_TYPE_OPTIONS}
                        placeholder='Select'
                        searchPlaceholder='Search space type...'
                        hasError={Boolean(errors.space_type)}
                        triggerClassName='w-full text-left'
                        showArrow
                        isolateSearchKeyboard
                      />
                    )}
                  />
                  {errors.space_type?.message ? (
                    <ErrorText>{errors.space_type.message}</ErrorText>
                  ) : null}
                </div>
                <div className='flex flex-col gap-1'>
                  <Label.Root>
                    Space Name <Label.Asterisk />
                  </Label.Root>
                  <Input.Root className='w-full' hasError={Boolean(errors.space_name)}>
                    <Input.Wrapper>
                      <Input.Input placeholder='Enter space name' {...register('space_name')} />
                    </Input.Wrapper>
                  </Input.Root>
                  {errors.space_name?.message ? (
                    <ErrorText>{errors.space_name.message}</ErrorText>
                  ) : null}
                </div>

                {/* <div className='flex flex-col gap-1 '>
                  <Label.Root>Status</Label.Root>
                  <Controller
                    name='status'
                    control={control}
                    render={({ field }) => (
                      <Select.Root value={field.value || ''} onValueChange={field.onChange}>
                        <Select.Trigger className='w-full'>
                          <Select.Value placeholder='Select' />
                        </Select.Trigger>
                        <Select.Content>
                          {STATUS_OPTIONS.map((opt) => (
                            <Select.Item key={opt.value} value={opt.value}>
                              {opt.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    )}
                  />
                </div> */}

                <div className='flex flex-col gap-1 w-full'>
                  <Label.Root>
                    Center <Label.Asterisk />
                  </Label.Root>
                  <Controller
                    name='center'
                    control={control}
                    render={({ field }) => {
                      const selectedCenter = centerListData?.find(
                        (item) => item.name === field.value,
                      );
                      const displayValue = selectedCenter?.center_name || '';

                      return (
                        <div className='w-full'>
                          <Dropdown.Root
                            open={centerDropdownOpen}
                            onOpenChange={(open) => {
                              setCenterDropdownOpen(open);
                              if (open) {
                                // Focus search input when dropdown opens
                                setTimeout(() => {
                                  centerSearchInputRef.current?.focus();
                                }, 100);
                              } else {
                                // Reset search when dropdown closes
                                setCenterSearchQuery('');
                                fetchCenterDropDown('');
                              }
                            }}
                          >
                            <Dropdown.Trigger asChild>
                              <Button.Root
                                variant='neutral'
                                mode='stroke'
                                size='medium'
                                type='button'
                                disabled={disabledCenter}
                                className={cn(
                                  'w-full text-left justify-start',
                                  Boolean(errors.center) && 'ring-error-base',
                                )}
                                hasError={Boolean(errors.center)}
                              >
                                {displayValue || (
                                  <span className='text-paragraph-sm text-text-soft-400'>
                                    {disabledCenter
                                      ? centerDetails?.center_name || 'Select Center'
                                      : 'Select Center'}
                                  </span>
                                )}
                              </Button.Root>
                            </Dropdown.Trigger>
                            <Dropdown.Content
                              className='max-w-[max(var(--radix-dropdown-menu-trigger-width),220px)] p-0 gap-0 min-h-[200px] max-h-[300px]'
                              align='start'
                              sideOffset={4}
                            >
                              <div className='p-2 border-b border-stroke-soft-200'>
                                <Input.Root size='small'>
                                  <Input.Wrapper>
                                    <Input.Icon as={RiSearchLine} />
                                    <Input.Input
                                      ref={centerSearchInputRef}
                                      placeholder='Search center...'
                                      value={centerSearchQuery}
                                      onChange={(e) => setCenterSearchQuery(e.target.value)}
                                      autoFocus
                                      autoComplete='off'
                                      autoCorrect='off'
                                      autoCapitalize='off'
                                      spellCheck='false'
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                              </div>
                              <div className='flex flex-col h-full flex-1 max-h-[300px] overflow-y-auto'>
                                {centerListLoading ? (
                                  <div className='flex-1  flex items-center justify-center px-4 py-8 text-center grow'>
                                    <p className='text-paragraph-sm text-text-soft-400'>
                                      {centerSearchQuery.trim().length > 0
                                        ? 'Searching...'
                                        : 'Loading centers...'}
                                    </p>
                                  </div>
                                ) : centerListData && centerListData.length > 0 ? (
                                  <div className='space-y-1 p-2'>
                                    {centerListData.map((item, i) => {
                                      const isSelected = field.value === item.name;
                                      return (
                                        <div
                                          key={item.name || i}
                                          onClick={() => {
                                            field.onChange(item.name);
                                            setCenterDropdownOpen(false);
                                          }}
                                          className={cn(
                                            'group/item relative cursor-pointer select-none rounded-lg p-2 text-paragraph-sm text-text-strong-950 outline-none',
                                            'flex items-center gap-2',
                                            'transition duration-200 ease-out',
                                            'focus:outline-none',
                                            isSelected && 'bg-bg-weak-50',
                                            'hover:bg-bg-weak-50',
                                          )}
                                          role='button'
                                          tabIndex={0}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault();
                                              field.onChange(item.name);
                                              setCenterDropdownOpen(false);
                                            }
                                          }}
                                        >
                                          <div className='flex flex-col flex-1'>
                                            <span className='text-paragraph-sm text-text-main-900'>
                                              {item.center_name}
                                            </span>
                                          </div>
                                          {isSelected && (
                                            <RiCheckLine className='size-4 text-text-main-900 shrink-0' />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className='flex-1 flex items-center justify-center px-4 py-8 text-center grow'>
                                    <p className='text-paragraph-sm text-text-soft-400'>
                                      {centerSearchQuery.trim().length > 0
                                        ? 'No centers found'
                                        : 'No centers available'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </Dropdown.Content>
                          </Dropdown.Root>
                        </div>
                      );
                    }}
                  />
                  {errors.center?.message ? <ErrorText>{errors.center.message}</ErrorText> : null}
                </div>

                <div className='flex flex-col gap-1'>
                  <Label.Root>Floor</Label.Root>
                  <Controller
                    name='floor'
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        disabled={(!watchCenter && !disabledCenter) || floors.status === 'loading'}
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        options={currentFloorOptions}
                        placeholder={
                          watchCenter || (disabledCenter && centerDetails?.name)
                            ? 'Select'
                            : 'Select center first'
                        }
                        emptyMessage={
                          floors.status === 'loading'
                            ? 'Loading floors...'
                            : watchCenter || (disabledCenter && centerDetails?.name)
                              ? 'No floors found'
                              : 'Select center first'
                        }
                        searchPlaceholder='Search floor...'
                        noResultsMessage='No floors found'
                        hasError={Boolean(errors.floor)}
                        triggerClassName='w-full text-left'
                        showArrow
                        isolateSearchKeyboard
                      />
                    )}
                  />
                  {errors.floor?.message ? <ErrorText>{errors.floor.message}</ErrorText> : null}
                </div>
              </div>
            </div>
            <div className='border-b border-stroke-soft-200  px-8' />

            {/* Managed Office Details (conditional) */}
            {showManagedOffice ? (
              <div className='flex flex-col py-5 px-8 gap-4'>
                <div className='text-label-sm text-text-strong-950'>Managed Office Details</div>
                <ManageOfficeLayout control={control} errors={errors} setValue={setValue} />
              </div>
            ) : null}

            {/* Co-working Space Details (conditional) */}
            {showCoWorking ? (
              <div className='flex flex-col py-5 px-8 gap-4'>
                <div className='text-label-sm text-text-strong-950'>Co-working Space Details</div>
                <CoWorkingLayout control={control} errors={errors} setValue={setValue} />
              </div>
            ) : null}

            {/* Resource Space Details (conditional) */}
            {showResource ? (
              <div className='flex flex-col py-5 px-8 gap-4'>
                <div className='flex items-center justify-between'>
                  <div className='text-label-sm text-text-strong-950'>Resource Space Details</div>
                  <Controller
                    name='resource.bookable'
                    control={control}
                    render={({ field }) => (
                      <div className='flex items-center gap-2'>
                        <Switch.Root
                          checked={field.value !== false && field.value !== 'No'}
                          onCheckedChange={field.onChange}
                        />
                        <span className='text-paragraph-sm text-text-strong-950'>Bookable</span>
                      </div>
                    )}
                  />
                </div>
                <ResourceLayout control={control} errors={errors} setValue={setValue} />
              </div>
            ) : null}

            {/* Pure Rental Space Details (conditional) */}
            {showPureRental ? (
              <div className='flex flex-col py-5 px-8 gap-4'>
                <div className='text-label-sm text-text-strong-950'>Pure Rental Space Details</div>
                <PureRentalLayout control={control} errors={errors} setValue={setValue} />
              </div>
            ) : null}

            <div className='border-b border-stroke-soft-200  px-8' />

            {/* Photos */}
            <div className='flex flex-col px-8 gap-2 py-5 '>
              <div className='flex items-center justify-between'>
                <div className='text-label-sm text-text-strong-950'>Photos</div>
                {photos.length > 0 ? (
                  <Button.Root
                    variant='neutral'
                    mode='stroke'
                    size='xsmall'
                    className='pl-2.5 pr-3 py-1.5 gap-0.5'
                    type='button'
                    onClick={() => photosInputRef.current?.click()}
                  >
                    <Button.Icon as={RiUploadLine} />
                    <div className='text-label-sm px-1 text-text-sub-600'>Upload Files</div>
                  </Button.Root>
                ) : null}
                <input
                  ref={photosInputRef}
                  type='file'
                  accept='image/*'
                  multiple
                  className='hidden'
                  onChange={(e) => handlePhotosPicked(e.target.files)}
                />
              </div>

              {photos.length === 0 ? (
                <div
                  className={cn(
                    'rounded-xl border border-dashed border-stroke-soft-200 bg-bg-white-0 px-5 py-[19px]',
                    photoDragActive ? 'bg-bg-weak-50' : '',
                  )}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPhotoDragActive(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPhotoDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPhotoDragActive(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPhotoDragActive(false);
                    handlePhotosPicked(e.dataTransfer.files);
                  }}
                >
                  <div className='flex items-center justify-between '>
                    <div className='flex items-center gap-3'>
                      <RiUploadCloud2Line className='size-6 text-text-sub-500' />
                      <div className='flex flex-col gap-1'>
                        <div className='text-paragraph-sm text-text-strong-950'>
                          Choose a file or drag & drop it here.
                        </div>
                        <div className='text-paragraph-xs text-text-sub-600'>
                          JPEG, PNG formats, up to 50 MB
                        </div>
                      </div>
                    </div>
                    <Button.Root
                      variant='neutral'
                      mode='stroke'
                      size='xsmall'
                      type='button'
                      onClick={() => photosInputRef.current?.click()}
                    >
                      Browse File
                    </Button.Root>
                  </div>
                </div>
              ) : (
                <div className='flex flex-row w-full h-[92px] overflow-x-auto gap-3'>
                  {Array.from({ length: photos.length }).map((_, index) => {
                    const file = photos.at(index);
                    const url = file ? URL.createObjectURL(file) : null;
                    return (
                      <div
                        key={file?.name ? `${file.name}-${index}` : index}
                        className='h-full w-[78px] gap-2 flex items-center '
                      >
                        <div className='relative h-[72px] w-[78px]  shrink-0  z-0   rounded-xl border border-stroke-soft-200 bg-bg-weak-50  items-center justify-center'>
                          {file ? (
                            <>
                              <img
                                src={url}
                                alt={file.name}
                                className='object-cover relative w-full h-full rounded-xl'
                              />
                              <button
                                type='button'
                                className='-top-2 -right-2 z-10 bg-white  rounded-lg p-1 shadow-regular-xs border border-stroke-soft-200 absolute'
                                onClick={() => removePhotoAt(index)}
                                aria-label='Remove photo'
                              >
                                <RiCloseLine className='size-3  text-text-sub-600' />
                              </button>
                            </>
                          ) : (
                            <RiImage2Line className='size-5 text-text-soft-400' />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className='border-b border-stroke-soft-200  px-8' />

            {/* Plan File */}
            <div className='flex flex-col px-8 py-5 gap-2'>
              <div className='flex items-center justify-between'>
                <div className='text-label-sm text-text-strong-950'>Plan File</div>
                {planFiles.length > 0 ? (
                  <Button.Root
                    variant='neutral'
                    mode='stroke'
                    size='xsmall'
                    className='pl-2.5 pr-3 py-1.5 gap-0.5'
                    type='button'
                    onClick={() => planInputRef.current?.click()}
                  >
                    <Button.Icon as={RiUploadLine} />
                    <div className='text-label-sm px-1 text-text-sub-600'>Upload Files</div>
                  </Button.Root>
                ) : null}
                <input
                  ref={planInputRef}
                  type='file'
                  accept='.pdf,.png,.jpg,.jpeg'
                  multiple
                  className='hidden'
                  onChange={(e) => handlePlanPicked(e.target.files)}
                />
              </div>

              {planFiles.length > 0 ? (
                <div className='flex flex-col gap-2'>
                  {planFiles.map((file, index) => (
                    <div
                      key={file?.name ? `${file.name}-${index}` : index}
                      className='flex items-center justify-between gap-3 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-3'
                    >
                      <div className='flex flex-col min-w-0'>
                        <div className='text-paragraph-sm text-text-strong-950 truncate'>
                          {file.name}
                        </div>
                        <div className='text-paragraph-xs text-text-sub-600'>
                          {formatFileSize(file.size)}
                        </div>
                      </div>
                      <Button.Root
                        variant='neutral'
                        mode='stroke'
                        size='xsmall'
                        type='button'
                        onClick={() => removePlanAt(index)}
                        aria-label='Remove plan file'
                      >
                        <Button.Icon as={RiDeleteBinLine} />
                      </Button.Root>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={cn(
                    'rounded-xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-4',
                    planDragActive ? 'bg-bg-weak-50' : '',
                  )}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPlanDragActive(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPlanDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPlanDragActive(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPlanDragActive(false);
                    handlePlanPicked(e.dataTransfer.files);
                  }}
                >
                  <div className='flex items-center justify-between gap-3'>
                    <div className='flex flex-col gap-1'>
                      <div className='text-paragraph-sm text-text-strong-950'>
                        Choose a file or drag & drop it here.
                      </div>
                      <div className='text-paragraph-xs text-text-sub-600'>
                        JPEG, PNG formats, up to 50 MB
                      </div>
                    </div>
                    <Button.Root
                      variant='neutral'
                      mode='stroke'
                      size='xsmall'
                      type='button'
                      onClick={() => planInputRef.current?.click()}
                    >
                      Browse File
                    </Button.Root>
                  </div>
                </div>
              )}
            </div>
          </form>
        </Drawer.Body>

        <Drawer.Footer className='sticky border-t border-stroke-soft-200 bottom-0 z-10 bg-white'>
          <div className=' px-8 py-4 bg-bg-white-0'>
            <div className='flex items-center justify-between gap-3'>
              <Button.Root variant='neutral' mode='stroke' type='button' onClick={onClose}>
                Cancel
              </Button.Root>

              <div className='flex items-center gap-2'>
                {/* <Button.Root
                    variant='neutral'
                    mode='stroke'
                    type='button'
                    onClick={onSaveDraft}
                    disabled={draftSaving || isSubmitting}
                  >
                    Save as Draft
                  </Button.Root> */}
                <Button.Root
                  type='button'
                  disabled={!isValid || isSubmitting}
                  onClick={handleSubmit(onCreate)}
                >
                  {isSubmitting ? 'Creating...' : 'Create'}
                </Button.Root>
              </div>
            </div>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CreateNewSpaceModal;
