import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RiUserAddLine, RiErrorWarningFill, RiUserSettingsLine, RiMailLine } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import * as Label from '@/components/ui/label';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Hint from '@/components/ui/hint';
import { PhoneInputController } from '@/components/ui/phone-input';
import { useDispatch, useSelector } from 'react-redux';
import { createAssociatedTeamMemberThunk, fetchTeamForCenterThunk } from '@/redux/centerSlice';
import {
  fetchRolesWithType,
  updateTeamMemberThunk,
  fetchCoreTeamData,
  fetchSupportTeamData,
} from '@/redux/teamManagementSlice';
import { getListOfUserEmails } from '@/redux/profileSlice';
import {
  STATUS_OPTIONS,
  getZonesFromMember,
  buildTeamListviewFilters,
  DEFAULT_TEAM_APPLIED_FILTERS,
} from '@/components/team-management/constants';
import { ZONE_OPTIONS } from '@/constants/users-constants';
import { showErrorToast, showSuccessToast, extractErrorMessage } from '@/utils/error-utils';
import { isSyntheticDevxStaffEmail } from '@/utils/synthetic-staff-email';
import {
  filterGroupedRolesOnlyCenterReqField,
  normalizeRoleEntry,
  flattenRolesFromGrouped,
} from '@/utils/user-utils';
import {
  isRoleMaxLimitReached,
  getRoleMaxLimit,
  getRoleCurrentCount,
} from '@/utils/center-configuration-storage';

const createCenterTeamMemberSchema = (scope, getRoleReqField) => {
  const base = {
    firstName: z
      .string()
      .min(1, 'First Name is required')
      .min(2, 'First Name must be at least 2 characters'),
    lastName: z
      .string()
      .min(1, 'Last Name is required')
      .min(2, 'Last Name must be at least 2 characters'),
    role: z.string().min(1, 'Role is required'),
    status: z.string().optional(),
    email: z
      .string()
      .optional()
      .transform((v) => (v === '' ? undefined : v))
      .refine((val) => !val || /\S+@\S+\.\S+/.test(val), {
        message: 'Please enter a valid email address',
      }),
    zone: z.string().optional(),
  };

  if (scope === 'support_team') {
    return z.object({
      ...base,
      mobile_number: z.string().optional(),
      aadhar: z.string().min(1, 'Aadhar is required'),
    });
  }

  return z
    .object({
      ...base,
      email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
      mobile_number: z.string().optional(),
    })
    .superRefine((data, context) => {
      const reqField = typeof getRoleReqField === 'function' ? getRoleReqField(data.role) : null;
      if (reqField?.toLowerCase?.() !== 'zone') return;
      if (!data.zone || String(data.zone).trim().length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Zone is required',
          path: ['zone'],
        });
      }
    });
};

const getStatusBadgeColor = (status) => {
  if (!status) return 'gray';
  return status === 'Active' ? 'green' : 'red';
};

const AddEditCenterTeamMemberModal = ({
  isOpen,
  onOpenChange,
  centerId,
  scope = 'core_team',
  editData = null,
  lockZoneToCenter = false,
  defaultRole = '',
  onTeamUpdated = null,
  onMaxLimitReached = null,
}) => {
  const dispatch = useDispatch();
  const [roleList, setRoleList] = useState({});
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [editImageUrl, setEditImageUrl] = useState(null);
  const fileInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const emailDropdownRef = useRef(null);
  const isEditMode = Boolean(editData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const group = scope === 'core_team' ? 'core' : 'support';
  const isCoreTeam = scope === 'core_team';
  const isSupportTeam = scope === 'support_team';

  // Core team email autocomplete state (kept local to avoid cross-feature coupling)
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [debouncedEmailQuery, setDebouncedEmailQuery] = useState('');
  const [isEmailDropdownOpen, setIsEmailDropdownOpen] = useState(false);
  const [emailResults, setEmailResults] = useState([]);
  const [emailFetchLoading, setEmailFetchLoading] = useState(false);

  const centerZone = useSelector((state) => state.center?.centerDetails?.data?.zone ?? '');
  const fetchRoles = useCallback(async () => {
    try {
      const response = await dispatch(fetchRolesWithType({ group })).unwrap();
      setRoleList(filterGroupedRolesOnlyCenterReqField(response?.message ?? {}));
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Failed to fetch roles. Please try again.',
      });
    }
  }, [dispatch, group]);

  const rolesFlatFromGrouped = React.useMemo(() => flattenRolesFromGrouped(roleList), [roleList]);

  const getRoleReqField = useCallback(
    (roleName) => {
      if (!roleName || rolesFlatFromGrouped.length === 0) return null;
      const found = rolesFlatFromGrouped.find((r) => r.name === roleName);
      const req = found?.req_field;
      if (req == null || req === '') return null;
      const normalized = String(req).trim();
      return normalized.length > 0 ? normalized : null;
    },
    [rolesFlatFromGrouped],
  );

  const centerTeamMemberSchema = React.useMemo(
    () => createCenterTeamMemberSchema(scope, getRoleReqField),
    [scope, getRoleReqField],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    control,
    clearErrors,
  } = useForm({
    resolver: zodResolver(centerTeamMemberSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      mobile_number: '',
      aadhar: '',
      status: '',
      role: '',
      zone: '',
    },
  });

  const selectedStatus = watch('status');
  const selectedZone = watch('zone');
  const emailFieldValue = watch('email');
  const selectedRoleReqField = getRoleReqField(selectedRole);
  const requiresZone = isCoreTeam && selectedRoleReqField?.toLowerCase?.() === 'zone';

  // Debounce core team email search query
  useEffect(() => {
    if (!isCoreTeam) return;
    const timer = setTimeout(() => {
      setDebouncedEmailQuery(emailSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [emailSearchQuery, isCoreTeam]);

  // Fetch user emails when debounced query changes
  useEffect(() => {
    if (!isOpen || !isCoreTeam) return;
    let isActive = true;
    setEmailFetchLoading(true);
    dispatch(getListOfUserEmails(debouncedEmailQuery))
      .unwrap()
      .then((res) => {
        if (!isActive) return;
        setEmailResults(res?.message?.results ?? []);
      })
      .catch(() => {
        if (!isActive) return;
        setEmailResults([]);
      })
      .finally(() => {
        if (!isActive) return;
        setEmailFetchLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [debouncedEmailQuery, isOpen, isCoreTeam, dispatch]);

  // Filter user emails based on search query
  const filteredUserEmails = React.useMemo(() => {
    if (!isCoreTeam) return [];
    if (!emailResults || !Array.isArray(emailResults)) return [];
    if (!emailSearchQuery.trim()) return [];

    const query = emailSearchQuery.toLowerCase();
    return emailResults.filter((item) => {
      const emailMatch = item.email && item.email.toLowerCase().includes(query);
      const nameMatch = item.display_name && item.display_name.toLowerCase().includes(query);
      return emailMatch || nameMatch;
    });
  }, [emailResults, emailSearchQuery, isCoreTeam]);

  // Update dropdown visibility based on filtered results
  useEffect(() => {
    if (!isCoreTeam) return;
    if (emailSearchQuery.trim().length > 0 && filteredUserEmails.length > 0) {
      setIsEmailDropdownOpen(true);
    } else {
      setIsEmailDropdownOpen(false);
    }
  }, [emailSearchQuery, filteredUserEmails, isCoreTeam]);

  useEffect(() => {
    if (!isCoreTeam || !selectedRole) return;
    if (rolesFlatFromGrouped.length === 0) return;
    clearErrors('zone');
    if (
      getRoleReqField(selectedRole)?.toLowerCase?.() === 'zone' &&
      lockZoneToCenter &&
      centerZone
    ) {
      // Zone is pre-filled and locked — always clear any stale error
      setValue('zone', centerZone, { shouldValidate: false });
      clearErrors('zone');
    } else if (getRoleReqField(selectedRole)?.toLowerCase?.() !== 'zone') {
      setValue('zone', '');
    }
  }, [
    selectedRole,
    clearErrors,
    setValue,
    getRoleReqField,
    isCoreTeam,
    lockZoneToCenter,
    centerZone,
    rolesFlatFromGrouped,
  ]);

  // Re-clear zone error after roles load if zone is already pre-filled and locked
  useEffect(() => {
    if (!isCoreTeam || !lockZoneToCenter || !centerZone || !selectedRole) return;
    if (getRoleReqField(selectedRole)?.toLowerCase?.() === 'zone') {
      clearErrors('zone');
    }
  }, [
    rolesFlatFromGrouped,
    isCoreTeam,
    lockZoneToCenter,
    centerZone,
    selectedRole,
    getRoleReqField,
    clearErrors,
  ]);

  const handleEmailInputChange = useCallback(
    ({ target }) => {
      const { value } = target;
      setEmailSearchQuery(value);
      setValue('email', value, { shouldValidate: false });
    },
    [setValue],
  );

  const handleEmailSelect = useCallback(
    (email, display_name) => {
      setValue('email', email, { shouldValidate: true });
      setEmailSearchQuery(email);
      setIsEmailDropdownOpen(false);

      const nameParts = (display_name || '').trim().split(' ').filter(Boolean);
      if (nameParts.length > 0) {
        setValue('firstName', nameParts[0] || '', { shouldValidate: false });
        setValue('lastName', nameParts.slice(1).join(' ') || '', { shouldValidate: false });
      }
    },
    [setValue],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isCoreTeam) return;
    const handleClickOutside = (event) => {
      if (
        emailInputRef.current &&
        !emailInputRef.current.contains(event.target) &&
        emailDropdownRef.current &&
        !emailDropdownRef.current.contains(event.target)
      ) {
        setIsEmailDropdownOpen(false);
      }
    };

    if (isEmailDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEmailDropdownOpen, isCoreTeam]);

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen, fetchRoles]);

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
      setSelectedImage(null);
      setSelectedRole('');
      setEditImageUrl(null);
      setEmailSearchQuery('');
      setDebouncedEmailQuery('');
      setIsEmailDropdownOpen(false);
      setEmailResults([]);
      setEmailFetchLoading(false);
      reset();
      return;
    }
    if (editData) {
      const nameParts = (editData.name || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      setEditImageUrl(editData.image ?? null);
      setSelectedRole(editData.role || '');
      setEmailSearchQuery(editData.email ?? '');
      const mobileValue =
        editData.cell_number ??
        editData.cellNumber ??
        editData.mobile_no ??
        editData.mobile_number ??
        editData.mobile ??
        editData.phone ??
        editData.contact_number ??
        '';
      const aadharValue =
        editData.custom_aadhaar_number ?? editData.aadhar_number ?? editData.aadhar ?? '';
      reset({
        firstName,
        lastName,
        role: editData.role || '',
        email: editData.email ?? '',
        mobile_number: mobileValue,
        aadhar: aadharValue,
        status: editData.status || '',
        zone: lockZoneToCenter
          ? centerZone || ''
          : editData.center_zone?.trim() ||
            editData.zone?.trim() ||
            getZonesFromMember(editData)[0] ||
            '',
      });
    } else {
      const initialRole = defaultRole || '';
      setSelectedImage(null);
      setSelectedRole(initialRole);
      setEditImageUrl(null);
      setEmailSearchQuery('');
      const initialZone = lockZoneToCenter
        ? centerZone || ''
        : getRoleReqField(initialRole)?.toLowerCase?.() === 'zone'
          ? centerZone || ''
          : '';
      reset({
        firstName: '',
        lastName: '',
        email: '',
        mobile_number: '',
        aadhar: '',
        status: '',
        role: initialRole,
        zone: initialZone,
      });
      // Clear zone error after reset so the pre-filled zone doesn't
      // immediately show "Zone is required" before the user touches anything
      if (initialZone) {
        clearErrors('zone');
      }
    }
  }, [
    isOpen,
    editData,
    defaultRole,
    reset,
    isCoreTeam,
    lockZoneToCenter,
    centerZone,
    getRoleReqField,
  ]);

  useEffect(() => {
    if (!isOpen || editData || !lockZoneToCenter) return;
    if (getRoleReqField(selectedRole)?.toLowerCase?.() === 'zone' && centerZone && !selectedZone) {
      setValue('zone', centerZone, { shouldValidate: false });
    }
  }, [
    isOpen,
    editData,
    lockZoneToCenter,
    selectedRole,
    centerZone,
    selectedZone,
    getRoleReqField,
    setValue,
  ]);

  const coreTeamData = useSelector((state) => state.teamManagement?.coreTeamData?.data ?? []);
  const supportTeamData = useSelector((state) => state.teamManagement?.supportTeamData?.data ?? []);

  const onSubmit = async (data, bypassLimitCheck = false) => {
    if (!centerId) return;

    const isRoleChanged =
      isEditMode &&
      String(editData?.role || '')
        .trim()
        .toLowerCase() !==
        String(data.role || '')
          .trim()
          .toLowerCase();

    // Core Team pre-submit check (unchanged)
    if (
      !isSupportTeam &&
      !bypassLimitCheck &&
      (!isEditMode || isRoleChanged) &&
      isRoleMaxLimitReached(centerId, data.role, coreTeamData, supportTeamData)
    ) {
      const maxCount = getRoleMaxLimit(centerId, data.role);
      onMaxLimitReached?.({
        maxCount,
        proceedSubmit: () => onSubmit(data, true),
      });
      return;
    }

    let createPayload = null;
    setIsSubmitting(true);
    try {
      const statusForCreate = isEditMode
        ? data.status
        : String(data.status ?? '').trim() || 'Active';

      const scopePayload =
        isCoreTeam && getRoleReqField(data.role)?.toLowerCase?.() === 'zone' && data.zone?.trim()
          ? { center_zone: data.zone.trim() }
          : { centers: [centerId] };

      const basePayload = isSupportTeam
        ? {
            first_name: data.firstName,
            last_name: data.lastName,
            cell_number: data.mobile_number?.trim() ? data.mobile_number.trim() : null,
            custom_aadhaar_number: data.aadhar?.trim() ? data.aadhar.trim() : null,
            role: data.role,
            status: statusForCreate,
            centers: [centerId],
            image: selectedImage,
            email: data.email?.trim() ? data.email.trim() : null,
          }
        : {
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email?.trim() ? data.email.trim() : null,
            cell_number: data.mobile_number?.trim() ? data.mobile_number.trim() : null,
            role: data.role,
            status: statusForCreate,
            ...scopePayload,
            image: selectedImage,
          };

      if (isEditMode && editData) {
        const team_member_id = editData.team_member_id ?? editData.email ?? editData.employee_id;
        const payload = isSupportTeam
          ? {
              first_name: data.firstName,
              last_name: data.lastName,
              cell_number: data.mobile_number?.trim() ? data.mobile_number.trim() : null,
              custom_aadhaar_number: data.aadhar?.trim() ? data.aadhar.trim() : null,
              role: data.role,
              status: data.status,
              centers: [centerId],
              image: selectedImage,
              team_type: 'Employee',
              team_member_id,
              ...(editData.name && { name: editData.name }),
              email: data.email?.trim() ? data.email.trim() : null,
            }
          : {
              first_name: data.firstName,
              last_name: data.lastName,
              email: data.email?.trim() ? data.email.trim() : null,
              cell_number: data.mobile_number?.trim() ? data.mobile_number.trim() : null,
              role: data.role,
              status: data.status,
              ...scopePayload,
              image: selectedImage,
              team_type: 'User',
              team_member_id,
              ...(editData.name && { name: editData.name }),
            };
        await dispatch(updateTeamMemberThunk(payload)).unwrap();
        showSuccessToast('Team member updated successfully.');
      } else {
        createPayload = basePayload;
        if (selectedImage instanceof File) {
          const form = new FormData();
          form.append('first_name', basePayload.first_name);
          form.append('last_name', basePayload.last_name);
          if (isSupportTeam) {
            if (basePayload.cell_number) form.append('cell_number', basePayload.cell_number);
            if (basePayload.custom_aadhaar_number)
              form.append('custom_aadhaar_number', basePayload.custom_aadhaar_number);
          } else {
            if (basePayload.email) form.append('email', basePayload.email);
            if (basePayload.cell_number) form.append('cell_number', basePayload.cell_number);
          }
          form.append('role', basePayload.role);
          form.append('status', basePayload.status || 'Active');
          if (basePayload.center_zone) {
            form.append('center_zone', basePayload.center_zone);
          } else {
            form.append('centers', [centerId]);
          }
          form.append('image', selectedImage);
          createPayload = form;
        }
        await dispatch(createAssociatedTeamMemberThunk(createPayload)).unwrap();
        showSuccessToast('Team member added successfully.');
      }

      if (typeof onTeamUpdated === 'function') {
        await onTeamUpdated();
      } else {
        const freshApiFilters = buildTeamListviewFilters(DEFAULT_TEAM_APPLIED_FILTERS, {
          fixedCenter: centerId,
          includeStatus: scope === 'core_team',
        });
        if (scope === 'core_team') {
          await dispatch(
            fetchCoreTeamData({
              keyword: '',
              filters: freshApiFilters,
              page: 1,
              page_size: 500,
            }),
          ).unwrap();
        } else {
          await dispatch(
            fetchSupportTeamData({
              keyword: '',
              filters: freshApiFilters,
              page: 1,
              page_size: 500,
            }),
          ).unwrap();
        }
      }

      // Support Team post-addition check (popup after successful addition)
      if (isSupportTeam && (!isEditMode || isRoleChanged)) {
        const maxCount = getRoleMaxLimit(centerId, data.role);
        if (maxCount !== null && maxCount !== undefined) {
          const currentCount = getRoleCurrentCount(data.role, coreTeamData, supportTeamData);
          if (currentCount >= maxCount) {
            onMaxLimitReached?.({
              maxCount,
              showAfterAdd: true,
            });
          }
        }
      }

      onOpenChange(false);
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleDeleteImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageUpload = (e) => {
    const file = e?.target?.files?.[0];
    if (file) setSelectedImage(file);
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[450px]'>
        <Modal.Header
          icon={isEditMode ? RiUserSettingsLine : RiUserAddLine}
          title={isEditMode ? 'Edit Member' : 'Add New Member'}
          description={
            isEditMode
              ? 'Update the details below to edit team member.'
              : 'Fill out the details below to add a new member to this center team.'
          }
        />
        <Modal.Body>
          <form onSubmit={handleSubmit(onSubmit)} className='w-full flex flex-col gap-4'>
            <div className='w-full flex gap-5'>
              <div className='w-20 h-20 shrink-0 ring-1 ring-stroke-soft-200 rounded-full overflow-hidden'>
                <img
                  src={
                    selectedImage
                      ? URL.createObjectURL(selectedImage)
                      : editImageUrl ||
                        'https://png.pngtree.com/png-vector/20231019/ourmid/pngtree-user-profile-avatar-png-image_10211467.png'
                  }
                  className='w-full h-full object-cover'
                  alt=''
                />
              </div>
              <div className='w-full flex flex-col gap-3'>
                <div className='w-full flex flex-col gap-1'>
                  <span className='label-medium text-[var(--color-text-main-900)]'>
                    Upload Image
                  </span>
                  <span className='paragraph-small text-[var(--color-text-sub-500)]'>
                    Min 400x400px, PNG or JPEG
                  </span>
                </div>
                <div className='w-full flex items-center gap-3'>
                  {selectedImage ? (
                    <>
                      <Button.Root
                        onClick={() => fileInputRef?.current?.click()}
                        type='button'
                        variant='neutral'
                        mode='stroke'
                        size='xsmall'
                      >
                        <input
                          type='file'
                          ref={fileInputRef}
                          className='hidden'
                          onChange={handleImageUpload}
                        />
                        Edit
                      </Button.Root>
                      <Button.Root
                        onClick={handleDeleteImage}
                        type='button'
                        variant='error'
                        mode='stroke'
                        size='xsmall'
                      >
                        Delete
                      </Button.Root>
                    </>
                  ) : (
                    <Button.Root
                      type='button'
                      variant='neutral'
                      onClick={() => fileInputRef?.current?.click()}
                      mode='stroke'
                      size='xsmall'
                    >
                      <input
                        type='file'
                        ref={fileInputRef}
                        className='hidden'
                        onChange={handleImageUpload}
                      />
                      Upload
                    </Button.Root>
                  )}
                </div>
              </div>
            </div>
            {isCoreTeam && (
              <div className='w-full flex flex-col gap-2 relative' ref={emailInputRef}>
                <Label.Root>Email {isCoreTeam && <Label.Asterisk />}</Label.Root>
                <Controller
                  name='email'
                  control={control}
                  render={({ field }) => (
                    <Input.Root size='small' className='w-full' hasError={Boolean(errors.email)}>
                      <Input.Wrapper>
                        <Input.Icon as={RiMailLine} />
                        <Input.Input
                          type='text'
                          name={field.name}
                          ref={field.ref}
                          placeholder={
                            isCoreTeam ? 'Enter or search email address' : 'Enter email address'
                          }
                          value={emailSearchQuery || field.value || ''}
                          onChange={handleEmailInputChange}
                          onBlur={field.onBlur}
                          onFocus={() => {
                            if (
                              emailSearchQuery.trim().length > 0 &&
                              filteredUserEmails.length > 0
                            ) {
                              setIsEmailDropdownOpen(true);
                            }
                          }}
                          disabled={isSubmitting || (isCoreTeam && isEditMode)}
                          autoComplete='off'
                          className={
                            isCoreTeam && isEditMode
                              ? '!text-[var(--color-text-sub-500)] opacity-100'
                              : ''
                          }
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  )}
                />
                {isEmailDropdownOpen && filteredUserEmails.length > 0 && (
                  <div
                    ref={emailDropdownRef}
                    className='absolute top-full left-0 right-0 z-50 mt-1 bg-bg-white-0 rounded-2xl shadow-regular-md ring-1 ring-inset ring-stroke-soft-200 max-h-[200px] overflow-y-auto p-1'
                  >
                    {filteredUserEmails.map((item) => (
                      <div
                        key={item.email}
                        onClick={() => handleEmailSelect(item.email, item.display_name)}
                        className='cursor-pointer select-none rounded-lg p-2 text-paragraph-sm text-text-strong-950 hover:bg-bg-weak-50 transition-colors'
                        role='button'
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleEmailSelect(item.email, item.display_name);
                          }
                        }}
                      >
                        <span className='font-medium'>{item.display_name}</span>{' '}
                        <span className='text-xs text-text-sub-500'>({item.email})</span>
                      </div>
                    ))}
                  </div>
                )}
                {emailFetchLoading && emailSearchQuery.trim().length > 0 && (
                  <div className='text-xs text-text-sub-500'>Searching...</div>
                )}
                {errors.email && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.email.message}
                  </Hint.Root>
                )}
              </div>
            )}
            <div className='w-full grid grid-cols-2 gap-4'>
              <div className='w-full flex flex-col gap-2'>
                <Label.Root>
                  First Name
                  <Label.Asterisk />
                </Label.Root>
                <Input.Root size='small' className='w-full' hasError={Boolean(errors.firstName)}>
                  <Input.Wrapper>
                    <Input.Input
                      type='text'
                      placeholder='Enter first name'
                      {...register('firstName')}
                      disabled={isSubmitting}
                    />
                  </Input.Wrapper>
                </Input.Root>
                {errors.firstName && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.firstName.message}
                  </Hint.Root>
                )}
              </div>
              <div className='w-full flex flex-col gap-2'>
                <Label.Root>
                  Last Name
                  <Label.Asterisk />
                </Label.Root>
                <Input.Root size='small' className='w-full' hasError={Boolean(errors.lastName)}>
                  <Input.Wrapper>
                    <Input.Input
                      type='text'
                      placeholder='Enter last name'
                      {...register('lastName')}
                      disabled={isSubmitting}
                    />
                  </Input.Wrapper>
                </Input.Root>
                {errors.lastName && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.lastName.message}
                  </Hint.Root>
                )}
              </div>
            </div>
            {isSupportTeam ? (
              <div className='w-full grid grid-cols-2 gap-4'>
                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>
                    Role
                    <Label.Asterisk />
                  </Label.Root>
                  <Select.Root
                    value={selectedRole}
                    size='small'
                    onValueChange={(value) => {
                      setSelectedRole(value);
                      setValue('role', value, { shouldValidate: true });
                    }}
                    hasError={Boolean(errors.role)}
                    disabled={isSubmitting}
                  >
                    <Select.Trigger className='w-full'>
                      <Select.Value value={selectedRole} placeholder='Select role' />
                    </Select.Trigger>
                    <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                      {Object.entries(roleList).map(([team_type, role_name], index) => {
                        const rolesRaw = Array.isArray(role_name)
                          ? role_name
                          : role_name && typeof role_name === 'object'
                            ? Object.values(role_name).flatMap((v) => (Array.isArray(v) ? v : []))
                            : [];
                        const roles = rolesRaw
                          .map((item) => normalizeRoleEntry(item))
                          .filter((e) => e.name);
                        return (
                          <div key={team_type || String(index)}>
                            <span className='subheading-2xs px-1 pt-1 text-[var(--color-text-soft-400)]'>
                              {team_type}
                            </span>
                            {roles.map((entry, roleIdx) => (
                              <Select.Item
                                key={`${team_type}-${entry.name}-${roleIdx}`}
                                value={entry.name}
                                className='paragraph-small'
                              >
                                {entry.name}
                              </Select.Item>
                            ))}
                          </div>
                        );
                      })}
                    </Select.Content>
                  </Select.Root>
                  {errors.role && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningFill} />
                      {errors.role.message}
                    </Hint.Root>
                  )}
                </div>

                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>Mobile Number</Label.Root>
                  <Controller
                    name='mobile_number'
                    control={control}
                    render={({ field, fieldState }) => (
                      <PhoneInputController
                        value={field.value}
                        onChange={field.onChange}
                        error={fieldState.error}
                        size='small'
                        placeholder='Enter number'
                        maxLength={10}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                  {errors.mobile_number && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningFill} />
                      {errors.mobile_number.message}
                    </Hint.Root>
                  )}
                </div>
              </div>
            ) : (
              <div className='w-full grid grid-cols-2 gap-4'>
                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>
                    Role
                    <Label.Asterisk />
                  </Label.Root>
                  <Select.Root
                    value={selectedRole}
                    size='small'
                    onValueChange={(value) => {
                      setSelectedRole(value);
                      setValue('role', value, { shouldValidate: true });
                    }}
                    hasError={Boolean(errors.role)}
                    disabled={isSubmitting}
                  >
                    <Select.Trigger className='w-full'>
                      <Select.Value value={selectedRole} placeholder='Select role' />
                    </Select.Trigger>
                    <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                      {Object.entries(roleList).map(([team_type, role_name], index) => {
                        const rolesRaw = Array.isArray(role_name)
                          ? role_name
                          : role_name && typeof role_name === 'object'
                            ? Object.values(role_name).flatMap((v) => (Array.isArray(v) ? v : []))
                            : [];
                        const roles = rolesRaw
                          .map((item) => normalizeRoleEntry(item))
                          .filter((e) => e.name);
                        return (
                          <div key={team_type || String(index)}>
                            <span className='subheading-2xs px-1 pt-1 text-[var(--color-text-soft-400)]'>
                              {team_type}
                            </span>
                            {roles.map((entry, roleIdx) => (
                              <Select.Item
                                key={`${team_type}-${entry.name}-${roleIdx}`}
                                value={entry.name}
                                className='paragraph-small'
                              >
                                {entry.name}
                              </Select.Item>
                            ))}
                          </div>
                        );
                      })}
                    </Select.Content>
                  </Select.Root>
                  {errors.role && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningFill} />
                      {errors.role.message}
                    </Hint.Root>
                  )}
                </div>

                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>Mobile Number</Label.Root>
                  <Controller
                    name='mobile_number'
                    control={control}
                    render={({ field, fieldState }) => (
                      <PhoneInputController
                        value={field.value}
                        onChange={field.onChange}
                        error={fieldState.error}
                        size='small'
                        placeholder='Enter number'
                        maxLength={10}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                  {errors.mobile_number && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningFill} />
                      {errors.mobile_number.message}
                    </Hint.Root>
                  )}
                </div>
              </div>
            )}
            {requiresZone && (
              <div className='w-full flex flex-col gap-2'>
                <Label.Root>
                  Zone
                  <Label.Asterisk />
                </Label.Root>
                <Select.Root
                  value={selectedZone}
                  size='small'
                  onValueChange={(value) => setValue('zone', value, { shouldValidate: true })}
                  hasError={Boolean(errors.zone) && !lockZoneToCenter}
                  disabled={isSubmitting || lockZoneToCenter}
                >
                  <Select.Trigger
                    className={`w-full ${lockZoneToCenter ? 'disabled:text-text-strong-950 disabled:opacity-100' : ''}`}
                    style={lockZoneToCenter ? { opacity: 1 } : undefined}
                  >
                    <Select.Value
                      placeholder='Select zone'
                      className={lockZoneToCenter ? '!text-text-strong-950 !opacity-100' : ''}
                    />
                  </Select.Trigger>
                  <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                    {(lockZoneToCenter
                      ? ZONE_OPTIONS.filter((zone) => zone.value === centerZone)
                      : ZONE_OPTIONS
                    ).map((zone) => (
                      <Select.Item key={zone.value} value={zone.value} className='paragraph-small'>
                        {zone.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                {errors.zone && !lockZoneToCenter && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.zone.message}
                  </Hint.Root>
                )}
              </div>
            )}
            {isSupportTeam && (
              <div className='w-full flex flex-col gap-2'>
                <Label.Root>
                  Aadhar
                  <Label.Asterisk />
                </Label.Root>
                <Input.Root size='small' className='w-full' hasError={Boolean(errors.aadhar)}>
                  <Input.Wrapper>
                    <Input.Input
                      type='text'
                      placeholder='Enter Aadhar number'
                      {...register('aadhar')}
                      disabled={isSubmitting}
                    />
                  </Input.Wrapper>
                </Input.Root>
                {errors.aadhar && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.aadhar.message}
                  </Hint.Root>
                )}
              </div>
            )}
            {isSupportTeam && (
              <div className='w-full flex flex-col gap-2'>
                <Label.Root>Email</Label.Root>

                <Input.Root size='small' className='w-full' hasError={Boolean(errors.email)}>
                  <Input.Wrapper>
                    <Input.Icon as={RiMailLine} />
                    <Input.Input
                      type='text'
                      placeholder='Enter email address'
                      {...register('email')}
                      disabled={
                        isSubmitting || (isEditMode && isSyntheticDevxStaffEmail(emailFieldValue))
                      }
                    />
                  </Input.Wrapper>
                </Input.Root>

                {errors.email && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.email.message}
                  </Hint.Root>
                )}
              </div>
            )}
            {isEditMode && (
              <div className='w-1/2 flex flex-col gap-2'>
                <Label.Root>Status</Label.Root>
                <Select.Root
                  size='small'
                  value={selectedStatus}
                  onValueChange={(value) => setValue('status', value)}
                  hasError={Boolean(errors.status)}
                  disabled={isSubmitting}
                >
                  <Select.Trigger className='w-full'>
                    <Select.Value placeholder='Select status' asChild>
                      {selectedStatus ? (
                        <Badge.Root
                          variant='light'
                          color={getStatusBadgeColor(selectedStatus)}
                          size='small'
                          className='text-nowrap'
                        >
                          {selectedStatus}
                        </Badge.Root>
                      ) : (
                        <span>Select status</span>
                      )}
                    </Select.Value>
                  </Select.Trigger>
                  <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                    {STATUS_OPTIONS.map((status) => (
                      <Select.Item key={status.value} value={status.value}>
                        <Badge.Root
                          variant='light'
                          color={getStatusBadgeColor(status.value)}
                          size='small'
                          className='text-nowrap'
                        >
                          {status.label}
                        </Badge.Root>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
            )}
          </form>
        </Modal.Body>
        <Modal.Footer className='flex items-center justify-end gap-2'>
          <Button.Root
            size='xsmall'
            variant='neutral'
            mode='stroke'
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='submit'
            onClick={handleSubmit(onSubmit)}
            size='xsmall'
            variant='primary'
            mode='filled'
            disabled={isSubmitting}
          >
            {isSubmitting ? (isEditMode ? 'Saving...' : 'Adding...') : isEditMode ? 'Save' : 'Add'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default AddEditCenterTeamMemberModal;
