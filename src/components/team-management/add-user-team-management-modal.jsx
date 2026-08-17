import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { z } from 'zod';
import { PhoneInputController } from '@/components/ui/phone-input';
import {
  RiUserAddLine,
  RiErrorWarningFill,
  RiPencilLine,
  RiUserSettingsLine,
  RiContactsBookLine,
  RiSearchLine,
  RiCheckLine,
  RiMailLine,
} from 'react-icons/ri';

import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import * as Label from '@/components/ui/label';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Dropdown from '@/components/ui/dropdown';
import * as Checkbox from '@/components/ui/checkbox';
import * as Hint from '@/components/ui/hint';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/utils/cn';
import { getCenterListThunk } from '@/redux/centerSlice';
import { getListOfUserEmails } from '@/redux/profileSlice';
import {
  setAddTeamMemberModal,
  selectAddTeamMemberModal,
  fetchRolesWithType,
  createTeamMemberThunk,
  updateTeamMemberThunk,
  fetchTeamManagementData,
  fetchCoreTeamData,
  fetchSupportTeamData,
} from '@/redux/teamManagementSlice';
import { STATUS_OPTIONS, getZonesFromMember } from '@/components/team-management/constants';
import { ZONE_OPTIONS } from '@/constants/users-constants';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { isSyntheticDevxStaffEmail } from '@/utils/synthetic-staff-email';
import {
  normalizeRoleEntry,
  filterGroupedRolesOnlyCenterReqField,
  flattenRolesFromGrouped,
} from '@/utils/user-utils';

const createTeamMemberSchema = (modalSource, isEditMode, getRoleReqField) => {
  const isSupport = modalSource === 'support';

  const base = {
    firstName: z
      .string()
      .min(1, 'First Name is required')
      .min(2, 'First Name must be at least 2 characters'),

    lastName: isSupport
      ? z.string().min(1, 'Last Name is required').min(2, 'Last Name must be at least 2 characters')
      : z.string().optional(),

    role: z.string().min(1, 'Role is required'),

    status: isEditMode ? z.string().min(1, 'Status is required') : z.string().optional(),

    center: z.array(z.string()).optional(),
    zone: z.string().optional(),
  };

  const objectSchema = z.object(
    isSupport
      ? {
          ...base,
          mobile_number: z.string().min(1, 'Mobile Number is required'),
          aadhaar_number: z.string().min(1, 'Aadhar is required'),
          email: z.string().optional(),
        }
      : {
          ...base,
          email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
          mobile_number: z.string().optional(),
        },
  );

  return objectSchema.superRefine((data, context) => {
    if (isSupport) {
      if (!Array.isArray(data.center) || data.center.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one center is required',
          path: ['center'],
        });
      }
      return;
    }

    const reqField = typeof getRoleReqField === 'function' ? getRoleReqField(data.role) : null;
    const reqFieldNormalized = reqField ? reqField.toLowerCase() : null;

    if (reqFieldNormalized === 'zone') {
      if (!data.zone || String(data.zone).trim().length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Zone is required',
          path: ['zone'],
        });
      }
      return;
    }

    if (!Array.isArray(data.center) || data.center.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one center is required',
        path: ['center'],
      });
    }
  });
};

const getStatusBadgeColor = (status) => {
  if (!status) return 'gray';
  return status === 'Active' ? 'green' : 'gray';
};

/** Same value as center dropdown uses for each list row (`item.name || item.center_code`). */
const listRowFormValue = (c) => (c?.name || c?.center_code || '').trim();

const getInitialCenterSelectionFromEdit = (edit) => {
  if (!edit) return [];
  if (Array.isArray(edit.centers) && edit.centers.length > 0) {
    return edit.centers
      .map((ce) => {
        if (typeof ce === 'string') return ce.trim();
        return (ce?.name || ce?.center_code || ce?.center_name || ce?.id || '').trim();
      })
      .filter(Boolean);
  }
  const centerValue = edit.center_id ?? edit.center;
  if (Array.isArray(centerValue)) {
    return centerValue.map((v) => String(v).trim()).filter(Boolean);
  }
  if (centerValue != null && String(centerValue).trim() !== '') {
    return [String(centerValue).trim()];
  }
  return [];
};

const findListRowForApiCenter = (centerList, ce) => {
  if (!Array.isArray(centerList) || !ce) return null;
  if (typeof ce === 'string') {
    const s = ce.trim();
    return (
      centerList.find((c) => listRowFormValue(c) === s) ||
      centerList.find((c) => (c.center_name || '').trim() === s) ||
      null
    );
  }
  const id = ce.id ?? ce.center_id;
  const label = (ce.name ?? ce.center_name ?? '').toString().trim();
  return (
    centerList.find((c) => id != null && String(c.center_id ?? '') === String(id)) ||
    centerList.find((c) => id != null && String(c.center_code ?? '') === String(id)) ||
    (label &&
      (centerList.find((c) => (c.center_name || '').trim() === label) ||
        centerList.find((c) => (c.name || '').trim() === label) ||
        centerList.find((c) => listRowFormValue(c) === label))) ||
    null
  );
};

/** Map edit payload to form `center` string[] once `centerListData` is available. */
const resolveCenterFieldFromList = (editData, centerList) => {
  if (!editData || !Array.isArray(centerList) || centerList.length === 0) return null;
  const values = [];

  if (Array.isArray(editData.centers) && editData.centers.length > 0) {
    for (const ce of editData.centers) {
      const row = findListRowForApiCenter(centerList, ce);
      if (row) {
        const v = listRowFormValue(row);
        if (v) values.push(v);
      }
    }
    if (values.length > 0) return [...new Set(values)];
  }

  if (editData.center_id != null && String(editData.center_id).trim() !== '') {
    const id = editData.center_id;
    const row =
      centerList.find((c) => String(c.center_id ?? '') === String(id)) ||
      centerList.find((c) => String(c.center_code ?? '') === String(id)) ||
      centerList.find((c) => String(c.name ?? '') === String(id));
    if (row) {
      const v = listRowFormValue(row);
      if (v) return [v];
    }
  }

  if (editData.center_name) {
    const cn = (editData.center_name || '').trim();
    const row =
      centerList.find((c) => (c.center_name || '').trim() === cn) ||
      centerList.find((c) => (c.name || '').trim() === cn);
    if (row) {
      const v = listRowFormValue(row);
      if (v) return [v];
    }
  }

  return null;
};

const AddUserTeamManagementModal = ({ isOpen, onOpenChange }) => {
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roleList, setRoleList] = useState({});
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const { data: centerListData } = useSelector((state) => state.center.centerListData);
  const addTeamMemberModal = useSelector(selectAddTeamMemberModal);
  const editData = addTeamMemberModal?.editData;
  const modalSource = addTeamMemberModal?.source; // 'centers' | 'core' | 'support'
  const isEditMode = Boolean(editData);
  const supportTeamLastParams = useSelector((state) => state.teamManagement.supportTeamLastParams);

  const fileInputRef = useRef(null);
  const centerSearchInputRef = useRef(null);
  const hasResolvedCenterFromNameRef = useRef(false);
  const hasNormalizedPrefilledCentersRef = useRef(false);
  const emailInputRef = useRef(null);
  const emailDropdownRef = useRef(null);
  const selectedEmailRef = useRef('');

  const [centerSearchQuery, setCenterSearchQuery] = useState('');
  const [centerDropdownOpen, setCenterDropdownOpen] = useState(false);
  const [zoneDropdownOpen, setZoneDropdownOpen] = useState(false);
  const [zoneDropdownSearchQuery, setZoneDropdownSearchQuery] = useState('');
  const [editImageUrl, setEditImageUrl] = useState(null);
  const debouncedCenterSearch = useDebounce(centerSearchQuery, 300);

  const { isLoading: centerListLoading } = useSelector((state) => state.center.centerListData);

  const fetchCenterDropDown = useCallback(
    async (keyword = '') => {
      try {
        await dispatch(getCenterListThunk({ keyword, filters: [], pageSize: 999 })).unwrap();
      } catch {
        // Handle error silently or show toast notification
      }
    },
    [dispatch],
  );

  const handleFetchRolesWithType = useCallback(async () => {
    try {
      // From centers: no payload. From core/support: pass { group: 'core' | 'support' }
      const isSupport =
        modalSource === 'support' || (Boolean(editData) && editData?.team_type === 'Employee');
      const rolesPayload = isSupport
        ? { group: 'support' }
        : modalSource === 'core'
          ? { group: 'core' }
          : undefined;
      const response = await dispatch(fetchRolesWithType(rolesPayload)).unwrap();
      setRoleList(filterGroupedRolesOnlyCenterReqField(response?.message ?? {}));
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Failed to fetch roles with type. Please try again.',
      });
    }
  }, [dispatch, modalSource, editData]);

  const isSupportTeam =
    modalSource === 'support' || (isEditMode && editData?.team_type === 'Employee');

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

  const teamMemberSchema = React.useMemo(
    () =>
      createTeamMemberSchema(isSupportTeam ? 'support' : modalSource, isEditMode, getRoleReqField),
    [isSupportTeam, modalSource, isEditMode, getRoleReqField],
  );

  // Core team email autocomplete state (kept local to avoid cross-feature coupling)
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [isEmailDropdownOpen, setIsEmailDropdownOpen] = useState(false);
  const [emailResults, setEmailResults] = useState([]);
  const [emailFetchLoading, setEmailFetchLoading] = useState(false);
  const debouncedEmailQuery = useDebounce(emailSearchQuery, 300);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    getValues,
    watch,
    control,
    clearErrors,
  } = useForm({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      mobile_number: '',
      aadhaar_number: '',
      status: '',
      role: '',
      center: [],
      zone: '',
    },
  });

  const selectedCenters = watch('center') ?? [];
  const selectedZone = watch('zone');
  const selectedStatus = watch('status');
  const emailFieldValue = watch('email');
  const selectedRoleReqField = getRoleReqField(selectedRole);
  const requiresZone = selectedRoleReqField?.toLowerCase?.() === 'zone';

  // Fetch user emails when debounced query changes (core only)
  useEffect(() => {
    if (!isOpen || isSupportTeam) return;
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
  }, [debouncedEmailQuery, isOpen, isSupportTeam, dispatch]);

  const filteredUserEmails = React.useMemo(() => {
    if (isSupportTeam) return [];
    if (!emailResults || !Array.isArray(emailResults)) return [];
    if (!emailSearchQuery.trim()) return [];

    const query = emailSearchQuery.toLowerCase();
    return emailResults.filter((item) => {
      const emailMatch = item.email && item.email.toLowerCase().includes(query);
      const nameMatch = item.display_name && item.display_name.toLowerCase().includes(query);
      return emailMatch || nameMatch;
    });
  }, [emailResults, emailSearchQuery, isSupportTeam]);

  useEffect(() => {
    if (isSupportTeam || isEditMode) return;

    if (emailSearchQuery.trim().length > 0 && filteredUserEmails.length > 0) {
      setIsEmailDropdownOpen(true);
    } else {
      setIsEmailDropdownOpen(false);
    }
  }, [emailSearchQuery, filteredUserEmails, isSupportTeam, isEditMode]);

  const handleEmailInputChange = useCallback(
    ({ target }) => {
      const { value } = target;

      setEmailSearchQuery(value);
      setValue('email', value, { shouldValidate: false });

      if (
        !isSupportTeam && // Clear names if email is erased OR changed from selected email
        (!value.trim() || value !== selectedEmailRef.current)
      ) {
        setValue('firstName', '');
        setValue('lastName', '');
      }
    },
    [setValue, isSupportTeam],
  );

  const handleEmailSelect = useCallback(
    (item) => {
      const email = item.email;
      const displayName = item.display_name || '';

      const nameParts = displayName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      selectedEmailRef.current = email;

      setValue('email', email, { shouldValidate: true });
      setEmailSearchQuery(email);
      setIsEmailDropdownOpen(false);

      if (!isSupportTeam) {
        setValue('firstName', firstName);
        setValue('lastName', lastName);
      }
    },
    [setValue, isSupportTeam],
  );

  useEffect(() => {
    if (isSupportTeam) return;
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
  }, [isEmailDropdownOpen, isSupportTeam]);

  // Fetch centers and roles when modal opens (roles payload depends on modalSource)
  useEffect(() => {
    if (isOpen) {
      setCenterSearchQuery('');
      fetchCenterDropDown('');
      handleFetchRolesWithType();
    }
  }, [isOpen, fetchCenterDropDown, handleFetchRolesWithType]);

  // Search centers via API when debounced search changes
  useEffect(() => {
    if (isOpen) {
      fetchCenterDropDown(debouncedCenterSearch);
    }
  }, [debouncedCenterSearch, isOpen, fetchCenterDropDown]);

  // Focus search input when center dropdown opens
  useEffect(() => {
    if (centerDropdownOpen) {
      const timer = setTimeout(() => centerSearchInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [centerDropdownOpen]);

  useEffect(() => {
    if (!selectedRole) return;
    clearErrors('center');
    clearErrors('zone');
    const reqField = getRoleReqField(selectedRole)?.toLowerCase?.();
    if (reqField !== 'zone') setValue('zone', '');
    if (reqField === 'zone') setValue('center', []);
  }, [selectedRole, clearErrors, setValue, getRoleReqField]);

  // Populate form when editData is available; reset when modal closes or when opening for add (no editData)
  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
      setSelectedImage(null);
      setSelectedRole('');
      setEditImageUrl(null);
      hasResolvedCenterFromNameRef.current = false;
      hasNormalizedPrefilledCentersRef.current = false;
      setEmailSearchQuery('');
      setIsEmailDropdownOpen(false);
      setEmailResults([]);
      setEmailFetchLoading(false);
      reset();
      return;
    }
    if (editData) {
      hasResolvedCenterFromNameRef.current = false;
      hasNormalizedPrefilledCentersRef.current = false;
      const nameParts = (editData.name || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const centerArray = getInitialCenterSelectionFromEdit(editData);
      setEditImageUrl(editData.image ?? null);
      setSelectedRole(editData.role || '');
      if (!isSupportTeam) setEmailSearchQuery(editData.email ?? '');
      reset({
        firstName,
        lastName,
        role: editData.role || '',
        email: editData.personal_email ?? editData.email ?? '',
        mobile_number:
          editData.cell_number ??
          editData.mobile_number ??
          editData.phone ??
          editData.contact_number ??
          '',
        aadhaar_number: editData.aadhaar_number ?? editData.aadhaar_number ?? '',
        status: editData.status || '',
        center: centerArray,
        zone:
          editData.center_zone?.trim() ||
          editData.zone?.trim() ||
          getZonesFromMember(editData)[0] ||
          '',
      });
    } else {
      // Opening for add: clear any previous edit state
      setSelectedImage(null);
      setSelectedRole('');
      setEditImageUrl(null);
      setEmailSearchQuery('');
      setIsEmailDropdownOpen(false);
      setEmailResults([]);
      setEmailFetchLoading(false);
      hasNormalizedPrefilledCentersRef.current = false;
      reset({
        firstName: '',
        lastName: '',
        email: '',
        mobile_number: '',
        aadhaar_number: '',
        status: '',
        role: '',
        center: [],
        zone: '',
      });
    }
  }, [isOpen, editData, reset, isSupportTeam]);

  // When editing, map API centers / center_id / center_name to dropdown values once list loads
  useEffect(() => {
    if (
      !isOpen ||
      !editData ||
      hasResolvedCenterFromNameRef.current ||
      !Array.isArray(centerListData) ||
      centerListData.length === 0
    ) {
      return;
    }
    const resolved = resolveCenterFieldFromList(editData, centerListData);
    if (resolved?.length) {
      setValue('center', resolved);
      hasResolvedCenterFromNameRef.current = true;
      return;
    }
    const current = getValues('center') ?? [];
    const listValues = new Set(centerListData.map((c) => listRowFormValue(c)).filter(Boolean));
    if (current.length > 0 && current.every((v) => listValues.has(v))) {
      hasResolvedCenterFromNameRef.current = true;
    }
  }, [isOpen, editData, centerListData, setValue, getValues]);

  const onSubmit = async (_data) => {
    setIsSubmitting(true);
    try {
      const statusValue = isEditMode ? _data.status : null;
      const coreScopeFields =
        getRoleReqField(_data.role)?.toLowerCase?.() === 'zone' && _data.zone?.trim()
          ? { center_zone: _data.zone.trim() }
          : { centers: _data.center ?? [] };

      const basePayload = isSupportTeam
        ? {
            first_name: _data.firstName,
            last_name: _data.lastName,
            cell_number: _data.mobile_number?.trim() ? _data.mobile_number.trim() : null,
            custom_aadhaar_number: _data.aadhaar_number?.trim()
              ? _data.aadhaar_number.trim()
              : null,
            email: _data.email?.trim() ? _data.email.trim() : null,
            role: _data.role,
            status: statusValue,
            centers: _data.center,
            image: selectedImage,
          }
        : {
            first_name: _data.firstName,
            last_name: _data.lastName,
            email: _data.email?.trim() ? _data.email.trim() : null,
            cell_number: _data.mobile_number?.trim() ? _data.mobile_number.trim() : null,
            role: _data.role,
            status: statusValue,
            ...coreScopeFields,
            image: selectedImage,
          };

      if (isEditMode && editData) {
        const isCoreTeam = editData.team_type === 'User';
        const payload = isSupportTeam
          ? {
              ...basePayload,
              team_type: 'Employee',
              team_member_id: editData.team_member_id ?? editData.employee_id ?? '',
              ...(editData.name && { name: editData.name }),
            }
          : {
              ...basePayload,
              team_type: editData.team_type ?? 'User',
              team_member_id: isCoreTeam
                ? (editData.email ?? _data.email?.trim() ?? '')
                : (editData.team_member_id ?? editData.employee_id ?? ''),
              ...(editData.name && { name: editData.name }),
            };
        await dispatch(updateTeamMemberThunk(payload)).unwrap();
        showSuccessToast('Team member updated successfully.');
        // Refetch only the list that was edited
        await (isCoreTeam
          ? Promise.all([
              dispatch(fetchTeamManagementData()).unwrap(),
              dispatch(fetchCoreTeamData()).unwrap(),
            ])
          : Promise.all([
              dispatch(fetchTeamManagementData()).unwrap(),
              dispatch(
                fetchSupportTeamData({
                  filters: supportTeamLastParams?.filters ?? [],
                  month: supportTeamLastParams?.month ?? undefined,
                  year: supportTeamLastParams?.year ?? undefined,
                  from_date: supportTeamLastParams?.from_date ?? undefined,
                  to_date: supportTeamLastParams?.to_date ?? undefined,
                }),
              ).unwrap(),
            ]));
      } else {
        await dispatch(createTeamMemberThunk(basePayload)).unwrap();
        showSuccessToast('Team member created successfully.');
        await Promise.all([
          dispatch(fetchTeamManagementData()).unwrap(),
          dispatch(fetchCoreTeamData()).unwrap(),
          dispatch(
            fetchSupportTeamData({
              filters: supportTeamLastParams?.filters ?? [],
              month: supportTeamLastParams?.month ?? undefined,
              year: supportTeamLastParams?.year ?? undefined,
              from_date: supportTeamLastParams?.from_date ?? undefined,
              to_date: supportTeamLastParams?.to_date ?? undefined,
            }),
          ).unwrap(),
        ]);
      }
      dispatch(setAddTeamMemberModal(false));
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: isEditMode
          ? 'Failed to update team member. Please try again.'
          : 'Failed to create team member. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    dispatch(setAddTeamMemberModal(false));
  };

  const handleDeleteImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageUpload = (e) => {
    fileInputRef?.current?.click();
    const file = e?.target?.files?.[0];
    if (file) {
      setSelectedImage(file);
      // console.log('file in handleImageUpload', file);
    }
  };

  const selectedZoneLabel = React.useMemo(() => {
    if (!selectedZone) return '';
    const found = ZONE_OPTIONS.find((o) => o.value === selectedZone);
    return found?.label ?? selectedZone;
  }, [selectedZone]);

  const filteredZonesForPicker = React.useMemo(() => {
    const q = zoneDropdownSearchQuery.trim().toLowerCase();
    if (!q) return ZONE_OPTIONS;
    return ZONE_OPTIONS.filter(
      (z) => z.label.toLowerCase().includes(q) || z.value.toLowerCase().includes(q),
    );
  }, [zoneDropdownSearchQuery]);

  const selectedCenterDisplay = React.useMemo(() => {
    if (!Array.isArray(selectedCenters) || selectedCenters.length === 0) return '';
    // When editing, we may have selected center ids before the center list loads.
    // Still show a meaningful count/label immediately.
    if (!Array.isArray(centerListData) || centerListData.length === 0) {
      return selectedCenters.length === 1
        ? selectedCenters[0]
        : `${selectedCenters.length} centers selected`;
    }
    if (selectedCenters.length === 1) {
      const found = centerListData.find((c) => (c.name || c.center_code) === selectedCenters[0]);
      return found?.center_name || found?.name || selectedCenters[0];
    }
    return `${selectedCenters.length} centers selected`;
  }, [selectedCenters, centerListData]);

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[450px]'>
        <Modal.Header
          icon={isEditMode ? RiUserSettingsLine : RiUserAddLine}
          title={isEditMode ? 'Edit Member' : 'Add New Member'}
          description={
            isEditMode
              ? 'Update the details below to edit team member.'
              : 'Fill out below details to add new team member.'
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
                  className='w-full h-full object-cover '
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
                        onClick={handleImageUpload}
                        type='button'
                        variant='neutral'
                        mode='stroke'
                        size='xsmall'
                      >
                        <input
                          type='file'
                          ref={fileInputRef}
                          className='hidden'
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setSelectedImage(file);
                            }
                          }}
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
                    <>
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
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setSelectedImage(file);
                            }
                          }}
                        />
                        Upload
                      </Button.Root>
                    </>
                  )}
                </div>
              </div>
            </div>

            {isSupportTeam && (
              <div className='w-full grid grid-cols-2 gap-4'>
                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>
                    First Name
                    <Label.Asterisk />
                  </Label.Root>

                  <Input.Root size='small' hasError={Boolean(errors.firstName)}>
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

                  <Input.Root size='small' hasError={Boolean(errors.lastName)}>
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
            )}
            {!isSupportTeam && (
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
                      {Object.entries(roleList || {}).map(([team_type, role_name], index) => {
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
                  {requiresZone ? (
                    <>
                      <Label.Root>
                        Zone
                        <Label.Asterisk />
                      </Label.Root>
                      <Dropdown.Root
                        open={zoneDropdownOpen}
                        onOpenChange={(open) => {
                          setZoneDropdownOpen(open);
                          if (!open) setZoneDropdownSearchQuery('');
                        }}
                      >
                        <Dropdown.Trigger asChild>
                          <Button.Root
                            variant='neutral'
                            mode='stroke'
                            size='small'
                            type='button'
                            disabled={isSubmitting}
                            className={cn(
                              'w-full text-left justify-start min-w-0 overflow-hidden',
                              Boolean(errors.zone) && 'ring-error-base',
                            )}
                            hasError={Boolean(errors.zone)}
                          >
                            {selectedZoneLabel ? (
                              <span className='truncate text-paragraph-sm text-text-strong-950 w-full text-left'>
                                {selectedZoneLabel}
                              </span>
                            ) : (
                              <span className='text-paragraph-sm text-text-soft-400'>
                                Select zone
                              </span>
                            )}
                          </Button.Root>
                        </Dropdown.Trigger>
                        <Dropdown.Content
                          className='max-w-[max(var(--radix-dropdown-menu-trigger-width),220px)] p-0 gap-0 max-h-[200px]'
                          align='start'
                          sideOffset={4}
                        >
                          <div className='p-2 border-b border-stroke-soft-200'>
                            <Input.Root size='small'>
                              <Input.Wrapper>
                                <Input.Icon as={RiSearchLine} />
                                <Input.Input
                                  placeholder='Search zone...'
                                  value={zoneDropdownSearchQuery}
                                  onChange={(e) => setZoneDropdownSearchQuery(e.target.value)}
                                  autoComplete='off'
                                />
                              </Input.Wrapper>
                            </Input.Root>
                          </div>
                          <div className='flex flex-col max-h-[300px] overflow-y-auto p-2'>
                            {filteredZonesForPicker.length === 0 ? (
                              <div className='flex items-center justify-center px-4 py-8 text-center'>
                                <p className='text-paragraph-sm text-text-soft-400'>
                                  No zones found
                                </p>
                              </div>
                            ) : (
                              filteredZonesForPicker.map((zone) => (
                                <div
                                  key={zone.value}
                                  role='button'
                                  tabIndex={0}
                                  onClick={() => {
                                    setValue('zone', zone.value, { shouldValidate: true });
                                    setZoneDropdownOpen(false);
                                    setZoneDropdownSearchQuery('');
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setValue('zone', zone.value, { shouldValidate: true });
                                      setZoneDropdownOpen(false);
                                      setZoneDropdownSearchQuery('');
                                    }
                                  }}
                                  className={cn(
                                    'rounded-lg p-2 text-paragraph-sm text-text-strong-950 outline-none cursor-pointer select-none',
                                    'hover:bg-bg-weak-50',
                                    selectedZone === zone.value && 'bg-bg-weak-50',
                                  )}
                                >
                                  {zone.label}
                                </div>
                              ))
                            )}
                          </div>
                        </Dropdown.Content>
                      </Dropdown.Root>
                      {errors.zone && (
                        <Hint.Root hasError>
                          <Hint.Icon as={RiErrorWarningFill} />
                          {errors.zone.message}
                        </Hint.Root>
                      )}
                    </>
                  ) : (
                    <>
                      <Label.Root>
                        Center
                        <Label.Asterisk />
                      </Label.Root>
                      <Dropdown.Root
                        open={centerDropdownOpen}
                        onOpenChange={(open) => {
                          setCenterDropdownOpen(open);
                          if (!open) {
                            setCenterSearchQuery('');
                            fetchCenterDropDown('');
                          }
                        }}
                      >
                        <Dropdown.Trigger asChild>
                          <Button.Root
                            variant='neutral'
                            mode='stroke'
                            size='small'
                            type='button'
                            disabled={isSubmitting}
                            className={cn(
                              'w-full text-left justify-start min-w-0 overflow-hidden',
                              Boolean(errors.center) && 'ring-error-base',
                            )}
                            hasError={Boolean(errors.center)}
                          >
                            {selectedCenterDisplay ? (
                              <span className='truncate text-paragraph-sm text-text-strong-950 w-full text-left'>
                                {selectedCenterDisplay}
                              </span>
                            ) : (
                              <span className='text-paragraph-sm text-text-soft-400'>
                                Select center
                              </span>
                            )}
                          </Button.Root>
                        </Dropdown.Trigger>
                        <Dropdown.Content
                          className='max-w-[max(var(--radix-dropdown-menu-trigger-width),220px)] p-0 gap-0  max-h-[200px]'
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
                              <div className='flex-1 flex items-center justify-center px-4 py-8 text-center grow'>
                                <p className='text-paragraph-sm text-text-soft-400'>
                                  {centerSearchQuery.trim().length > 0
                                    ? 'Searching...'
                                    : 'Loading centers...'}
                                </p>
                              </div>
                            ) : Array.isArray(centerListData) && centerListData.length > 0 ? (
                              <div className='space-y-1 p-2'>
                                {centerListData.map((item, i) => {
                                  const value = item.name || item.center_code || '';
                                  const isSelected = selectedCenters.includes(value);
                                  const toggleCenter = () => {
                                    if (isSelected) {
                                      setValue(
                                        'center',
                                        selectedCenters.filter((v) => v !== value),
                                      );
                                    } else {
                                      setValue('center', [...selectedCenters, value]);
                                    }
                                  };
                                  return (
                                    <div
                                      key={item.name || i}
                                      onClick={toggleCenter}
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
                                          toggleCenter();
                                        }
                                      }}
                                    >
                                      <Checkbox.Root
                                        checked={isSelected}
                                        onCheckedChange={(checked) => {
                                          if (checked)
                                            setValue('center', [...selectedCenters, value]);
                                          else
                                            setValue(
                                              'center',
                                              selectedCenters.filter((v) => v !== value),
                                            );
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        aria-label={
                                          item.center_name || item.name || 'Unnamed Center'
                                        }
                                      />
                                      <div className='flex flex-col flex-1'>
                                        <span className='text-paragraph-sm text-text-main-900'>
                                          {item.center_name || item.name || 'Unnamed Center'}
                                        </span>
                                      </div>
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
                      {errors.center && (
                        <Hint.Root hasError>
                          <Hint.Icon as={RiErrorWarningFill} />
                          {errors.center.message}
                        </Hint.Root>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
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
                      {Object.entries(roleList || {}).map(([team_type, role_name], index) => {
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
                  <Label.Root>
                    Mobile Number
                    <Label.Asterisk />
                  </Label.Root>
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
              <>
                <div className='w-full grid grid-cols-2 gap-4'>
                  <div className='w-full flex flex-col gap-2 relative' ref={emailInputRef}>
                    <Label.Root>
                      Email
                      <Label.Asterisk />
                    </Label.Root>
                    <Controller
                      name='email'
                      control={control}
                      render={({ field }) => (
                        <Input.Root
                          size='small'
                          className='w-full'
                          hasError={Boolean(errors.email)}
                        >
                          <Input.Wrapper>
                            <Input.Icon as={RiMailLine} />
                            <Input.Input
                              type='text'
                              name={field.name}
                              ref={field.ref}
                              placeholder='Enter or search email address'
                              value={emailSearchQuery}
                              onChange={handleEmailInputChange}
                              onBlur={field.onBlur}
                              onFocus={() => {
                                if (
                                  !isEditMode &&
                                  emailSearchQuery.trim().length > 0 &&
                                  filteredUserEmails.length > 0
                                ) {
                                  setIsEmailDropdownOpen(true);
                                }
                              }}
                              disabled={isSubmitting || isEditMode}
                              autoComplete='off'
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
                            onClick={() => handleEmailSelect(item)}
                            className='cursor-pointer select-none rounded-lg p-2 text-paragraph-sm text-text-strong-950 hover:bg-bg-weak-50 transition-colors'
                            role='button'
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleEmailSelect(item);
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

                {!isSupportTeam && (
                  <div className='w-full grid grid-cols-2 gap-4'>
                    <div className='w-full flex flex-col gap-2'>
                      <Label.Root>
                        First Name
                        <Label.Asterisk />
                      </Label.Root>
                      <Input.Root
                        size='small'
                        className='w-full'
                        hasError={Boolean(errors.firstName)}
                      >
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
                      <Label.Root>Last Name</Label.Root>
                      <Input.Root
                        size='small'
                        className='w-full'
                        hasError={Boolean(errors.lastName)}
                      >
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
                )}
              </>
            )}

            {isSupportTeam && (
              <div className='w-full flex flex-col gap-2'>
                <Label.Root>
                  Aadhar
                  <Label.Asterisk />
                </Label.Root>
                <Input.Root
                  size='small'
                  className='w-full'
                  hasError={Boolean(errors.aadhaar_number)}
                >
                  <Input.Wrapper>
                    <Input.Input
                      type='text'
                      placeholder='Enter Aadhar number'
                      {...register('aadhaar_number')}
                      disabled={isSubmitting}
                    />
                  </Input.Wrapper>
                </Input.Root>
                {errors.aadhaar_number && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.aadhaar_number.message}
                  </Hint.Root>
                )}
              </div>
            )}
            {isSupportTeam && (
              <div className='w-full flex flex-col gap-2'>
                <Label.Root>Email</Label.Root>

                <Input.Root size='small' className='w-full' hasError={Boolean(errors.email)}>
                  <Input.Wrapper>
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

            {isSupportTeam ? (
              <div className={cn('w-full grid gap-4', isEditMode ? 'grid-cols-2' : 'grid-cols-1')}>
                {isEditMode && (
                  <div className='w-full flex flex-col gap-2'>
                    <Label.Root>
                      Status
                      <Label.Asterisk />
                    </Label.Root>
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
                    {errors.status && (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiErrorWarningFill} />
                        {errors.status.message}
                      </Hint.Root>
                    )}
                  </div>
                )}

                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>
                    Center
                    <Label.Asterisk />
                  </Label.Root>
                  <Dropdown.Root
                    open={centerDropdownOpen}
                    onOpenChange={(open) => {
                      setCenterDropdownOpen(open);
                      if (!open) {
                        setCenterSearchQuery('');
                        fetchCenterDropDown('');
                      }
                    }}
                  >
                    <Dropdown.Trigger asChild>
                      <Button.Root
                        variant='neutral'
                        mode='stroke'
                        size='small'
                        type='button'
                        disabled={isSubmitting}
                        className={cn(
                          'w-full text-left justify-start min-w-0 overflow-hidden',
                          Boolean(errors.center) && 'ring-error-base',
                        )}
                        hasError={Boolean(errors.center)}
                      >
                        {selectedCenterDisplay ? (
                          <span className='truncate text-paragraph-sm text-text-strong-950 w-full text-left'>
                            {selectedCenterDisplay}
                          </span>
                        ) : (
                          <span className='text-paragraph-sm text-text-soft-400'>
                            Select center
                          </span>
                        )}
                      </Button.Root>
                    </Dropdown.Trigger>
                    <Dropdown.Content
                      className='max-w-[max(var(--radix-dropdown-menu-trigger-width),220px)] p-0 gap-0  max-h-[200px]'
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
                          <div className='flex-1 flex items-center justify-center px-4 py-8 text-center grow'>
                            <p className='text-paragraph-sm text-text-soft-400'>
                              {centerSearchQuery.trim().length > 0
                                ? 'Searching...'
                                : 'Loading centers...'}
                            </p>
                          </div>
                        ) : Array.isArray(centerListData) && centerListData.length > 0 ? (
                          <div className='space-y-1 p-2'>
                            {centerListData.map((item, i) => {
                              const value = item.name || item.center_code || '';
                              const isSelected = selectedCenters.includes(value);
                              const toggleCenter = () => {
                                if (isSelected) {
                                  setValue(
                                    'center',
                                    selectedCenters.filter((v) => v !== value),
                                  );
                                } else {
                                  setValue('center', [...selectedCenters, value]);
                                }
                              };
                              return (
                                <div
                                  key={item.name || i}
                                  onClick={toggleCenter}
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
                                      toggleCenter();
                                    }
                                  }}
                                >
                                  <Checkbox.Root
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      if (checked) setValue('center', [...selectedCenters, value]);
                                      else
                                        setValue(
                                          'center',
                                          selectedCenters.filter((v) => v !== value),
                                        );
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label={item.center_name || item.name || 'Unnamed Center'}
                                  />
                                  <div className='flex flex-col flex-1'>
                                    <span className='text-paragraph-sm text-text-main-900'>
                                      {item.center_name || item.name || 'Unnamed Center'}
                                    </span>
                                  </div>
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
                  {errors.center && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningFill} />
                      {errors.center.message}
                    </Hint.Root>
                  )}
                </div>
              </div>
            ) : (
              isEditMode && (
                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>
                    Status
                    <Label.Asterisk />
                  </Label.Root>
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
                  {errors.status && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningFill} />
                      {errors.status.message}
                    </Hint.Root>
                  )}
                </div>
              )
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

export default AddUserTeamManagementModal;
