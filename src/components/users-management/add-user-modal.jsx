import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { RiUserLine, RiErrorWarningFill, RiMailLine, RiSearchLine } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Input from '@/components/ui/input';
import * as Dropdown from '@/components/ui/dropdown';
import * as Checkbox from '@/components/ui/checkbox';
import * as Hint from '@/components/ui/hint';
import * as Tag from '@/components/ui/tag';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import { capitalizeEachWordFirstLetter } from '@/lib/utils';
import { z } from 'zod';
import { getCenterListThunk } from '@/redux/centerSlice';
import { getVendorListThunk } from '@/redux/vendorSlice';
import { getClientList, getListOfUserEmails } from '@/redux/profileSlice';
import { fetchRolesWithType } from '@/redux/teamManagementSlice';
import { showErrorToast } from '@/utils/error-utils';
import { getRole } from '@/utils/user-role-utils';
import {
  rolesPayloadForUsersSegment,
  filterGroupedRolesExcludeClientReqField,
  flattenRolesFromGrouped,
  splitFullNameIntoFirstAndLast,
} from '@/utils/user-utils';
import {
  isClientAdmin,
  isClient,
  ROLE_KEYS_SETTINGS,
  ZONE_OPTIONS,
  roleRequiresPipelines,
} from '@/constants/users-constants';
import { useUserPipelineOptions } from '@/hooks/use-user-pipeline-options';
import UserPipelinesField from './user-pipelines-field';
import UserSettingsRoleDropdown from './user-settings-role-dropdown';

const AddUserModal = ({
  isOpen,
  isLoading,
  handleOpenChange,
  handleSave,
  usersSegment = 'all',
}) => {
  const dispatch = useDispatch();
  const { data: centerListData } = useSelector((state) => state.center.centerListData);

  const fetchCenterDropDown = useCallback(async () => {
    try {
      await dispatch(getCenterListThunk({ keyword: '', filters: [], pageSize: 999 })).unwrap();
    } catch {
      // Handle error silently or show toast notification
    }
  }, [dispatch]);

  const fetchVendorDropDown = useCallback(async () => {
    try {
      await dispatch(getVendorListThunk({ keyword: '', filters: [], pageSize: 999 })).unwrap();
    } catch {
      // Handle error silently or show toast notification
    }
  }, [dispatch]);

  const { userSideBarPerm } = useSelector((state) => state.auth);
  const currentRole = getRole(userSideBarPerm);
  const { data: clientListData } = useSelector((state) => state.profile.clientList);
  const vendorListRows = useSelector((state) => state.vendor?.vendorListData?.data ?? []);

  const profileData = useSelector((state) => state.profile.profileData);

  const userEmails = useSelector((state) => state.profile.addUser.userEmails);

  const [centerDropdownOpen, setCenterDropdownOpen] = useState(false);
  const [centerDropdownSearchQuery, setCenterDropdownSearchQuery] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [clientDropdownSearchQuery, setClientDropdownSearchQuery] = useState('');
  const [zoneDropdownOpen, setZoneDropdownOpen] = useState(false);
  const [zoneDropdownSearchQuery, setZoneDropdownSearchQuery] = useState('');
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [vendorDropdownSearchQuery, setVendorDropdownSearchQuery] = useState('');
  const [groupedRolesFromApi, setGroupedRolesFromApi] = useState({});
  const [rolesFlatFromGrouped, setRolesFlatFromGrouped] = useState([]);
  const [rolesGroupedFetchLoading, setRolesGroupedFetchLoading] = useState(false);

  const {
    options: pipelineOptions,
    loading: pipelinesLoading,
    hasError: pipelinesLoadError,
    retry: retryPipelines,
  } = useUserPipelineOptions(isOpen);

  const hasGroupedRolesUi =
    Object.keys(groupedRolesFromApi).length > 0 && rolesFlatFromGrouped.length > 0;

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

  const adminExcludedRole = useCallback(
    (roleName) =>
      currentRole === ROLE_KEYS_SETTINGS.ADMIN &&
      (roleName === ROLE_KEYS_SETTINGS.SUPER_ADMIN || roleName === ROLE_KEYS_SETTINGS.ADMIN),
    [currentRole],
  );

  // Create schema with conditional centers validation
  const addUserSchema = z
    .object({
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().optional().default(''),
      emailAddress: z
        .string()
        .min(1, 'Email Address is required')
        .email('Please enter a valid email address'),
      role: z.string().min(1, 'Role is required'),
      centers: z.array(z.string()).optional(),
      zone: z.string().optional(),
      vendor: z.string().optional(),
      pipelines: z.array(z.string()).optional(),
    })
    .superRefine((data, context) => {
      // If current user is Client Admin, skip centers validation
      if (isClientAdmin(currentRole)) {
        return;
      }

      const reqField = getRoleReqField(data.role);
      const reqFieldNormalized = reqField ? reqField.toLowerCase() : null;

      if (roleRequiresPipelines(data.role)) {
        if (!Array.isArray(data.pipelines) || data.pipelines.length === 0) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Pipeline is required',
            path: ['pipelines'],
          });
        }
      }

      // If backend says Zone is required, enforce it
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

      // Client selection is required for client roles (fallback until backend provides req_field)
      if (reqFieldNormalized === 'client' || isClient(data.role)) {
        if (!Array.isArray(data.centers) || data.centers.length === 0) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Client is required',
            path: ['centers'],
          });
        }
        return;
      }

      // Center selection required only when backend says so
      if (
        reqFieldNormalized === 'center' &&
        (!Array.isArray(data.centers) || data.centers.length === 0)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Center is required',
          path: ['centers'],
        });
        return;
      }

      if (reqFieldNormalized === 'supplier' && !String(data.vendor || '').trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vendor is required',
          path: ['vendor'],
        });
      }
    });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    clearErrors,
  } = useForm({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      emailAddress: '',
      role: '',
      centers: [],
      zone: '',
      vendor: '',
      pipelines: [],
    },
  });

  const selectedRole = watch('role');
  const selectedCenters = watch('centers') ?? [];
  const selectedZone = watch('zone');
  const selectedVendor = watch('vendor') ?? '';
  const selectedPipelines = watch('pipelines') ?? [];

  const selectedRoleReqField = getRoleReqField(selectedRole);
  const requiresZone = selectedRoleReqField?.toLowerCase?.() === 'zone';
  const requiresCenter = selectedRoleReqField?.toLowerCase?.() === 'center';
  const requiresClient =
    selectedRoleReqField?.toLowerCase?.() === 'client' || isClient(selectedRole);
  const requiresSupplier = selectedRoleReqField?.toLowerCase?.() === 'supplier';
  const requiresPipelines = roleRequiresPipelines(selectedRole);

  const selectedCentersSummary = React.useMemo(() => {
    const codes = Array.isArray(selectedCenters) ? selectedCenters : [];
    const labelForCode = (code) => {
      if (!centerListData || !Array.isArray(centerListData)) return code;
      const found = centerListData.find((c) => (c.name || c.center_code) === code);
      return found?.center_name || found?.name || code;
    };
    const labels = codes.map(labelForCode).filter(Boolean);
    return {
      firstLabel: labels[0] ?? '',
      remainingLabels: labels.slice(1),
      count: labels.length,
    };
  }, [selectedCenters, centerListData]);

  const selectedClientDisplay = useMemo(() => {
    const v = selectedCenters[0];
    if (!v) return '';
    if (!clientListData || !Array.isArray(clientListData)) return v;
    const item = clientListData.find(
      (c) => (c.customer_name || c?.custom_display_name || c.name) === v || c.name === v,
    );
    return item?.custom_display_name || item?.customer_name || item?.name || v;
  }, [selectedCenters, clientListData]);

  const selectedZoneLabel = useMemo(() => {
    if (!selectedZone) return '';
    const found = ZONE_OPTIONS.find((o) => o.value === selectedZone);
    return found?.label ?? selectedZone;
  }, [selectedZone]);

  const filteredCentersForPicker = useMemo(() => {
    if (!centerListData || !Array.isArray(centerListData)) return [];
    const q = centerDropdownSearchQuery.trim().toLowerCase();
    if (!q) return centerListData;
    return centerListData.filter((item) => {
      const label = (item.center_name || item.name || '').toLowerCase();
      const code = (item.center_code || item.name || '').toLowerCase();
      return label.includes(q) || code.includes(q);
    });
  }, [centerListData, centerDropdownSearchQuery]);

  const filteredClientsForPicker = useMemo(() => {
    if (!clientListData || !Array.isArray(clientListData)) return [];
    const q = clientDropdownSearchQuery.trim().toLowerCase();
    if (!q) return clientListData;
    return clientListData.filter((item) => {
      const label = (
        item.custom_display_name ||
        item.customer_name ||
        item.name ||
        ''
      ).toLowerCase();
      return label.includes(q);
    });
  }, [clientListData, clientDropdownSearchQuery]);

  const filteredZonesForPicker = useMemo(() => {
    const q = zoneDropdownSearchQuery.trim().toLowerCase();
    if (!q) return ZONE_OPTIONS;
    return ZONE_OPTIONS.filter(
      (z) => z.label.toLowerCase().includes(q) || z.value.toLowerCase().includes(q),
    );
  }, [zoneDropdownSearchQuery]);

  const filteredVendorsForPicker = useMemo(() => {
    if (!Array.isArray(vendorListRows) || vendorListRows.length === 0) return [];
    const q = vendorDropdownSearchQuery.trim().toLowerCase();
    if (!q) return vendorListRows;
    return vendorListRows.filter((v) => {
      const name = String(v?.vendorName || '').toLowerCase();
      const id = String(v?.id || '').toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [vendorListRows, vendorDropdownSearchQuery]);

  const selectedVendorDisplay = useMemo(() => {
    const id = String(selectedVendor || '').trim();
    if (!id) return '';
    const item = vendorListRows.find((v) => String(v?.id) === id);
    return item?.vendorName || id;
  }, [selectedVendor, vendorListRows]);

  // Email autocomplete state
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [debouncedEmailQuery, setDebouncedEmailQuery] = useState('');
  const [isEmailDropdownOpen, setIsEmailDropdownOpen] = useState(false);
  const emailInputRef = useRef(null);
  const emailDropdownRef = useRef(null);

  // Debounce email search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEmailQuery(emailSearchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [emailSearchQuery]);

  // Fetch user emails when debounced query changes
  useEffect(() => {
    if (isOpen) {
      dispatch(getListOfUserEmails(debouncedEmailQuery))
        .unwrap()
        .catch(() => {});
    }
  }, [debouncedEmailQuery, isOpen, dispatch]);

  // Filter user emails based on search query
  const filteredUserEmails = React.useMemo(() => {
    if (!userEmails || !Array.isArray(userEmails)) return [];
    if (!emailSearchQuery.trim()) return [];

    const query = emailSearchQuery.toLowerCase();

    return userEmails.filter((item) => {
      const emailMatch = item.email && item.email.toLowerCase().includes(query);

      const nameMatch = item.display_name && item.display_name.toLowerCase().includes(query);

      return emailMatch || nameMatch;
    });
  }, [userEmails, emailSearchQuery]);

  // Update dropdown visibility based on filtered results
  useEffect(() => {
    if (emailSearchQuery.trim().length > 0 && filteredUserEmails.length > 0) {
      setIsEmailDropdownOpen(true);
    } else {
      setIsEmailDropdownOpen(false);
    }
  }, [emailSearchQuery, filteredUserEmails]);

  // Handle email input change
  const handleEmailInputChange = ({ target }) => {
    const { value } = target;
    setEmailSearchQuery(value);
    setValue('emailAddress', value, { shouldValidate: false });
    const matchedUser = userEmails?.find(
      (user) => user.email.toLowerCase() === value.toLowerCase(),
    );
    if (!matchedUser) {
      setValue('firstName', '', { shouldValidate: false });
      setValue('lastName', '', { shouldValidate: false });
    }
  };

  // Handle email selection from dropdown
  const handleEmailSelect = (email, display_name) => {
    setValue('emailAddress', email, { shouldValidate: true });
    const { firstName, lastName } = splitFullNameIntoFirstAndLast(display_name);
    setValue('firstName', firstName, { shouldValidate: false });
    setValue('lastName', lastName, { shouldValidate: false });
    setEmailSearchQuery(email);
    setIsEmailDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
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
  }, [isEmailDropdownOpen]);

  useEffect(() => {
    if (!isOpen) {
      reset();
      setEmailSearchQuery('');
      setDebouncedEmailQuery('');
      setIsEmailDropdownOpen(false);
      setGroupedRolesFromApi({});
      setRolesFlatFromGrouped([]);
      setRolesGroupedFetchLoading(false);
      setCenterDropdownSearchQuery('');
      setCenterDropdownOpen(false);
      setClientDropdownSearchQuery('');
      setClientDropdownOpen(false);
      setZoneDropdownSearchQuery('');
      setZoneDropdownOpen(false);
      setVendorDropdownSearchQuery('');
      setVendorDropdownOpen(false);
    }
    fetchCenterDropDown();
    fetchVendorDropDown();

    dispatch(getClientList())
      .unwrap()
      .catch((error) => {});

    if (isOpen) {
      dispatch(getListOfUserEmails(''))
        .unwrap()
        .catch(() => {});

      setRolesGroupedFetchLoading(true);
      dispatch(fetchRolesWithType(rolesPayloadForUsersSegment(usersSegment)))
        .unwrap()
        .then((response) => {
          const rawMsg = response?.message ?? response?.data?.message ?? {};
          const grouped = filterGroupedRolesExcludeClientReqField(rawMsg);
          const flat = flattenRolesFromGrouped(grouped);
          const hasGroups =
            typeof grouped === 'object' &&
            !Array.isArray(grouped) &&
            Object.keys(grouped).length > 0 &&
            flat.length > 0;

          if (hasGroups) {
            setGroupedRolesFromApi(grouped);
            setRolesFlatFromGrouped(flat);
          } else {
            setGroupedRolesFromApi({});
            setRolesFlatFromGrouped([]);
          }
        })
        .catch((error) => {
          setGroupedRolesFromApi({});
          setRolesFlatFromGrouped([]);
          showErrorToast(error, {
            defaultMessage: 'Failed to load roles. Please try again.',
          });
        })
        .finally(() => {
          setRolesGroupedFetchLoading(false);
        });
    }
  }, [isOpen, reset, fetchCenterDropDown, fetchVendorDropDown, dispatch, usersSegment]);

  useEffect(() => {
    if (isOpen && isClientAdmin(currentRole) && profileData?.org_id && clientListData) {
      // Find the matching client in clientListData
      const matchingClient = clientListData.find(
        (client) =>
          client.name === profileData.org_id ||
          client.customer_name === profileData.org_id ||
          client.custom_legal_name === profileData.org_id,
      );

      // Use the value format that matches the dropdown (customer_name || custom_legal_name || name)
      const clientValue = matchingClient
        ? matchingClient.customer_name || matchingClient.custom_legal_name || matchingClient.name
        : profileData.org_id; // Fallback to org_id if no match found

      setValue('role', ROLE_KEYS_SETTINGS.CLIENT_USER, { shouldValidate: false });
      setValue('centers', clientValue ? [clientValue] : [], { shouldValidate: false });
    }
  }, [isOpen, currentRole, profileData?.org_id, clientListData, setValue]);

  // Clear centers validation error only when current user is Client Admin
  // (For Super Admin/Admin creating Client User, client selection is required)
  useEffect(() => {
    if (isClientAdmin(currentRole)) {
      // Clear any centers validation errors when current user is Client Admin
      clearErrors('centers');
    }
  }, [currentRole, clearErrors]);

  // Clear centers/clients/zone / set pipeline defaults when role changes
  const prevSelectedRoleRef = useRef('');
  const pipelinesDefaultAppliedRef = useRef(false);
  useEffect(() => {
    if (!selectedRole) return;

    const roleChanged = prevSelectedRoleRef.current !== selectedRole;
    if (!roleChanged) return;

    const prevRole = prevSelectedRoleRef.current;
    prevSelectedRoleRef.current = selectedRole;

    clearErrors('centers');
    clearErrors('zone');
    clearErrors('vendor');
    clearErrors('pipelines');

    const reqField = getRoleReqField(selectedRole);
    const reqFieldNormalized = reqField ? reqField.toLowerCase() : null;

    if (reqFieldNormalized !== 'zone') setValue('zone', '');
    if (reqFieldNormalized !== 'supplier') setValue('vendor', '');
    // Clear centers when the required field isn't Center/Client
    if (
      reqFieldNormalized !== 'center' &&
      reqFieldNormalized !== 'client' &&
      reqFieldNormalized !== 'supplier' &&
      !isClient(selectedRole)
    ) {
      setValue('centers', []);
    }

    const enteringPipelineRole =
      roleRequiresPipelines(selectedRole) && !roleRequiresPipelines(prevRole);
    const leavingPipelineRole =
      !roleRequiresPipelines(selectedRole) && roleRequiresPipelines(prevRole);

    if (enteringPipelineRole) {
      pipelinesDefaultAppliedRef.current = false;
      if (pipelineOptions.length > 0) {
        pipelinesDefaultAppliedRef.current = true;
        setValue(
          'pipelines',
          pipelineOptions.map((p) => p.value),
          { shouldValidate: false },
        );
      } else {
        setValue('pipelines', [], { shouldValidate: false });
      }
    } else if (leavingPipelineRole) {
      pipelinesDefaultAppliedRef.current = false;
      setValue('pipelines', [], { shouldValidate: false });
    }
    // Switching Sales → Inside Sales / Marketing: keep current pipeline selection
  }, [selectedRole, clearErrors, setValue, getRoleReqField, pipelineOptions]);

  // Apply default "all pipelines" once when options load after entering a pipeline role.
  useEffect(() => {
    if (!isOpen || !requiresPipelines || pipelineOptions.length === 0) return;
    if (pipelinesDefaultAppliedRef.current) return;
    const current = Array.isArray(selectedPipelines) ? selectedPipelines : [];
    if (current.length > 0) {
      pipelinesDefaultAppliedRef.current = true;
      return;
    }
    pipelinesDefaultAppliedRef.current = true;
    setValue(
      'pipelines',
      pipelineOptions.map((p) => p.value),
      { shouldValidate: false },
    );
  }, [isOpen, requiresPipelines, pipelineOptions, selectedPipelines, setValue]);

  useEffect(() => {
    if (!isOpen) {
      prevSelectedRoleRef.current = '';
      pipelinesDefaultAppliedRef.current = false;
    }
  }, [isOpen]);

  const roleDropdownLoading = rolesGroupedFetchLoading;

  const onSubmit = (data) => {
    const finalRole = isClientAdmin(currentRole) ? ROLE_KEYS_SETTINGS.CLIENT_USER : data?.role;
    const shouldSkipCentersValidation = isClient(currentRole) || isClient(finalRole);
    const firstName = capitalizeEachWordFirstLetter((data?.firstName || '').trim());
    const lastName = capitalizeEachWordFirstLetter((data?.lastName || '').trim());

    const roleEntry =
      finalRole && rolesFlatFromGrouped.length > 0
        ? rolesFlatFromGrouped.find((r) => r.name === finalRole)
        : null;
    const rawReqField = roleEntry?.req_field;
    const reqFieldNormalized =
      rawReqField != null && String(rawReqField).trim() !== ''
        ? String(rawReqField).trim().toLowerCase()
        : null;

    const payload = {
      firstName,
      lastName,
      emailAddress: data?.emailAddress,
      role: finalRole,
    };

    // If backend requires Zone, include it
    if (reqFieldNormalized === 'zone' && data?.zone) {
      payload.zone = data?.zone;
    } else if (reqFieldNormalized === 'supplier' && String(data?.vendor || '').trim()) {
      payload.supplier = String(data.vendor).trim();
    }
    // If creating Client User or Client Admin, pass org_id instead of center / all_centers
    else if (isClient(finalRole)) {
      if (isClientAdmin(currentRole)) {
        // Use org_id from profile when current user is Client Admin
        payload.org_id = profileData?.org_id;
      } else if (Array.isArray(data?.centers) && data.centers.length > 0) {
        // Use first selected client value as org_id (customer_name from the Client dropdown)
        payload.org_id = data.centers[0];
      }
      // If centers is empty and currentRole is not Client Admin, org_id won't be set
      // This should be caught by validation, but we're skipping validation for Client User
    } else if (!shouldSkipCentersValidation && roleEntry) {
      if (reqFieldNormalized === 'center') {
        if (Array.isArray(data?.centers) && data.centers.length > 0) {
          payload.centers = data.centers;
        }
      } else if (reqFieldNormalized == null) {
        // Backend omits req_field when the role applies to all centers
        payload.all_centers = 1;
      }
    }

    if (roleRequiresPipelines(finalRole)) {
      payload.pipelines = Array.isArray(data?.pipelines) ? data.pipelines : [];
    }

    handleSave(payload);
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Content>
        <Modal.Header
          icon={RiUserLine}
          title='Add new user'
          description='Enter user details and assign roles.'
        />
        <Modal.Body>
          <form onSubmit={handleSubmit(onSubmit)} className='w-full flex flex-col gap-4'>
            <div className='w-full flex flex-col gap-2 relative' ref={emailInputRef}>
              <Label.Root>
                Email Address
                <Label.Asterisk />
              </Label.Root>
              <Input.Root size='medium' className='w-full' hasError={Boolean(errors.emailAddress)}>
                <Input.Wrapper>
                  <Input.Icon as={RiMailLine} />
                  <Input.Input
                    type='text'
                    placeholder='Enter or search email address'
                    value={emailSearchQuery}
                    onChange={handleEmailInputChange}
                    onFocus={() => {
                      if (emailSearchQuery.trim().length > 0 && filteredUserEmails.length > 0) {
                        setIsEmailDropdownOpen(true);
                      }
                    }}
                    disabled={isLoading}
                    autoComplete='off'
                  />
                </Input.Wrapper>
              </Input.Root>
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
              {errors.emailAddress && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.emailAddress.message}
                </Hint.Root>
              )}
            </div>

            <div className='w-full grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='w-full flex flex-col gap-2'>
                <Label.Root>
                  First name
                  <Label.Asterisk />
                </Label.Root>
                <Input.Root size='medium' className='w-full' hasError={Boolean(errors.firstName)}>
                  <Input.Wrapper>
                    <Input.Icon as={RiUserLine} />
                    <Input.Input
                      type='text'
                      placeholder='Enter first name'
                      {...register('firstName')}
                      disabled={isLoading}
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
                <Label.Root>Last name</Label.Root>
                <Input.Root size='medium' className='w-full' hasError={Boolean(errors.lastName)}>
                  <Input.Wrapper>
                    <Input.Icon as={RiUserLine} />
                    <Input.Input
                      type='text'
                      placeholder='Enter last name'
                      {...register('lastName')}
                      disabled={isLoading}
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

            {!isClientAdmin(currentRole) && (
              <div className='w-full flex flex-col gap-2'>
                <Label.Root>
                  Role
                  <Label.Asterisk />
                </Label.Root>
                <UserSettingsRoleDropdown
                  value={selectedRole}
                  onValueChange={(v) => setValue('role', v, { shouldValidate: true })}
                  groupedRolesFromApi={groupedRolesFromApi}
                  hasGroupedRolesUi={hasGroupedRolesUi}
                  loading={roleDropdownLoading}
                  disabled={isLoading || roleDropdownLoading}
                  hasError={Boolean(errors.role)}
                  adminExcludedRole={adminExcludedRole}
                />
                {errors.role && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.role.message}
                  </Hint.Root>
                )}
              </div>
            )}

            {requiresZone ? (
              <div className='w-full flex flex-col gap-2'>
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
                      size='medium'
                      type='button'
                      disabled={isLoading}
                      className={cn(
                        'w-full text-left justify-start',
                        Boolean(errors.zone) && 'ring-error-base',
                      )}
                      hasError={Boolean(errors.zone)}
                    >
                      {selectedZoneLabel || <span className='text-text-soft-400'>Select zone</span>}
                    </Button.Root>
                  </Dropdown.Trigger>
                  <Dropdown.Content
                    className='w-[max(var(--radix-dropdown-menu-trigger-width),220px)] p-0 gap-0 max-h-[320px]'
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
                            autoCorrect='off'
                            autoCapitalize='off'
                            spellCheck='false'
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    </div>
                    <div className='flex flex-col max-h-[260px] overflow-y-auto p-2'>
                      {filteredZonesForPicker.length === 0 ? (
                        <p className='px-2 py-3 text-paragraph-sm text-text-soft-400 text-center'>
                          No zones found
                        </p>
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
              </div>
            ) : requiresClient ? (
              <div className='w-full flex flex-col gap-2'>
                <Label.Root>
                  Client
                  <Label.Asterisk />
                </Label.Root>
                <Dropdown.Root
                  open={clientDropdownOpen}
                  onOpenChange={(open) => {
                    setClientDropdownOpen(open);
                    if (!open) setClientDropdownSearchQuery('');
                  }}
                >
                  <Dropdown.Trigger asChild>
                    <Button.Root
                      variant='neutral'
                      mode='stroke'
                      size='medium'
                      type='button'
                      disabled={isLoading}
                      className={cn(
                        'w-full text-left justify-start',
                        Boolean(errors.centers) && 'ring-error-base',
                      )}
                      hasError={Boolean(errors.centers)}
                    >
                      {selectedClientDisplay || (
                        <span className='text-text-soft-400'>Select client</span>
                      )}
                    </Button.Root>
                  </Dropdown.Trigger>
                  <Dropdown.Content
                    className='w-[max(var(--radix-dropdown-menu-trigger-width),220px)] p-0 gap-0 max-h-[320px]'
                    align='start'
                    sideOffset={4}
                  >
                    <div className='p-2 border-b border-stroke-soft-200'>
                      <Input.Root size='small'>
                        <Input.Wrapper>
                          <Input.Icon as={RiSearchLine} />
                          <Input.Input
                            placeholder='Search client...'
                            value={clientDropdownSearchQuery}
                            onChange={(e) => setClientDropdownSearchQuery(e.target.value)}
                            autoComplete='off'
                            autoCorrect='off'
                            autoCapitalize='off'
                            spellCheck='false'
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    </div>
                    <div className='flex flex-col max-h-[260px] overflow-y-auto p-2'>
                      {filteredClientsForPicker.length === 0 ? (
                        <p className='px-2 py-3 text-paragraph-sm text-text-soft-400 text-center'>
                          No clients found
                        </p>
                      ) : (
                        filteredClientsForPicker.map((item, i) => {
                          const value =
                            item.customer_name || item?.custom_display_name || item.name || '';
                          const label =
                            item?.custom_display_name || item.customer_name || item.name || value;
                          return (
                            <div
                              key={
                                item.customer_name || item?.custom_display_name || item.name || i
                              }
                              role='button'
                              tabIndex={0}
                              onClick={() => {
                                setValue('centers', value ? [value] : [], { shouldValidate: true });
                                setClientDropdownOpen(false);
                                setClientDropdownSearchQuery('');
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setValue('centers', value ? [value] : [], {
                                    shouldValidate: true,
                                  });
                                  setClientDropdownOpen(false);
                                  setClientDropdownSearchQuery('');
                                }
                              }}
                              className={cn(
                                'rounded-lg p-2 text-paragraph-sm text-text-strong-950 outline-none cursor-pointer select-none',
                                'hover:bg-bg-weak-50',
                                selectedCenters[0] === value && 'bg-bg-weak-50',
                              )}
                            >
                              {label}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </Dropdown.Content>
                </Dropdown.Root>
                {errors.centers && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.centers.message}
                  </Hint.Root>
                )}
              </div>
            ) : requiresSupplier ? (
              <div className='w-full flex flex-col gap-2'>
                <Label.Root>
                  Vendor
                  <Label.Asterisk />
                </Label.Root>
                <Dropdown.Root
                  open={vendorDropdownOpen}
                  onOpenChange={(open) => {
                    setVendorDropdownOpen(open);
                    if (!open) setVendorDropdownSearchQuery('');
                  }}
                >
                  <Dropdown.Trigger asChild>
                    <Button.Root
                      variant='neutral'
                      mode='stroke'
                      size='medium'
                      type='button'
                      disabled={isLoading}
                      className={cn(
                        'w-full text-left justify-start',
                        Boolean(errors.vendor) && 'ring-error-base',
                      )}
                      hasError={Boolean(errors.vendor)}
                    >
                      {selectedVendorDisplay || (
                        <span className='text-text-soft-400'>Select vendor</span>
                      )}
                    </Button.Root>
                  </Dropdown.Trigger>
                  <Dropdown.Content
                    className='w-[max(var(--radix-dropdown-menu-trigger-width),220px)] p-0 gap-0 max-h-[320px]'
                    align='start'
                    sideOffset={4}
                  >
                    <div className='p-2 border-b border-stroke-soft-200'>
                      <Input.Root size='small'>
                        <Input.Wrapper>
                          <Input.Icon as={RiSearchLine} />
                          <Input.Input
                            placeholder='Search vendor...'
                            value={vendorDropdownSearchQuery}
                            onChange={(e) => setVendorDropdownSearchQuery(e.target.value)}
                            autoComplete='off'
                            autoCorrect='off'
                            autoCapitalize='off'
                            spellCheck='false'
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    </div>
                    <div className='flex flex-col max-h-[260px] overflow-y-auto p-2'>
                      {filteredVendorsForPicker.length === 0 ? (
                        <p className='px-2 py-3 text-paragraph-sm text-text-soft-400 text-center'>
                          {vendorDropdownSearchQuery.trim()
                            ? 'No vendors found'
                            : 'No vendors available'}
                        </p>
                      ) : (
                        filteredVendorsForPicker.map((item) => {
                          const value = String(item?.id || '').trim();
                          const label = item?.vendorName || value;
                          if (!value) return null;
                          return (
                            <div
                              key={value}
                              role='button'
                              tabIndex={0}
                              onClick={() => {
                                setValue('vendor', value, { shouldValidate: true });
                                setVendorDropdownOpen(false);
                                setVendorDropdownSearchQuery('');
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setValue('vendor', value, { shouldValidate: true });
                                  setVendorDropdownOpen(false);
                                  setVendorDropdownSearchQuery('');
                                }
                              }}
                              className={cn(
                                'rounded-lg p-2 text-paragraph-sm text-text-strong-950 outline-none cursor-pointer select-none',
                                'hover:bg-bg-weak-50',
                                selectedVendor === value && 'bg-bg-weak-50',
                              )}
                            >
                              {label}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </Dropdown.Content>
                </Dropdown.Root>
                {errors.vendor && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.vendor.message}
                  </Hint.Root>
                )}
              </div>
            ) : (
              requiresCenter && (
                <div className='w-full flex flex-col gap-2'>
                  <Label.Root>
                    Centers
                    <Label.Asterisk />
                  </Label.Root>
                  <Dropdown.Root
                    open={centerDropdownOpen}
                    onOpenChange={(open) => {
                      setCenterDropdownOpen(open);
                      if (!open) setCenterDropdownSearchQuery('');
                    }}
                  >
                    <Dropdown.Trigger asChild>
                      <Button.Root
                        variant='neutral'
                        mode='stroke'
                        size='medium'
                        type='button'
                        disabled={isLoading}
                        className={cn(
                          'w-full text-left justify-start items-center min-h-[40px]',
                          Boolean(errors.centers) && 'ring-error-base',
                        )}
                        hasError={Boolean(errors.centers)}
                      >
                        <div className='flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden'>
                          {selectedCentersSummary.count === 0 ? (
                            <span className='text-text-soft-400'>Select centers</span>
                          ) : (
                            <>
                              <Tag.Root variant='gray' className='shrink-0 max-w-[150px]'>
                                <span className='truncate block'>
                                  {selectedCentersSummary.firstLabel}
                                </span>
                              </Tag.Root>
                              {selectedCentersSummary.count > 1 && (
                                <Tooltip.Root size='xsmall'>
                                  <Tooltip.Trigger asChild>
                                    <span className='text-paragraph-xs text-text-soft-400 shrink-0 whitespace-nowrap cursor-pointer'>
                                      +{selectedCentersSummary.count - 1}
                                    </span>
                                  </Tooltip.Trigger>
                                  <Tooltip.Content
                                    size='small'
                                    variant='light'
                                    side='top'
                                    className='max-w-xs'
                                  >
                                    <div className='flex flex-col gap-1'>
                                      <span className='text-paragraph-sm font-medium text-text-strong-950 mb-1'>
                                        Additional Centers ({selectedCentersSummary.count - 1})
                                      </span>
                                      <div className='flex flex-col gap-1'>
                                        {selectedCentersSummary.remainingLabels.map(
                                          (centerLabel, index) => (
                                            <div
                                              key={`${centerLabel}-${index}`}
                                              className='text-paragraph-sm text-text-sub-600'
                                            >
                                              {centerLabel}
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  </Tooltip.Content>
                                </Tooltip.Root>
                              )}
                            </>
                          )}
                        </div>
                      </Button.Root>
                    </Dropdown.Trigger>
                    <Dropdown.Content
                      className='w-[max(var(--radix-dropdown-menu-trigger-width),220px)] p-0 gap-0 max-h-[320px]'
                      align='start'
                      sideOffset={4}
                    >
                      <div className='p-2 border-b border-stroke-soft-200'>
                        <Input.Root size='small'>
                          <Input.Wrapper>
                            <Input.Icon as={RiSearchLine} />
                            <Input.Input
                              placeholder='Search centers...'
                              value={centerDropdownSearchQuery}
                              onChange={(e) => setCenterDropdownSearchQuery(e.target.value)}
                              autoComplete='off'
                              autoCorrect='off'
                              autoCapitalize='off'
                              spellCheck='false'
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      </div>
                      <div className='flex flex-col max-h-[260px] overflow-y-auto p-2'>
                        {filteredCentersForPicker.length === 0 ? (
                          <p className='px-2 py-3 text-paragraph-sm text-text-soft-400 text-center'>
                            {centerDropdownSearchQuery.trim()
                              ? 'No centers found'
                              : 'No centers available'}
                          </p>
                        ) : (
                          filteredCentersForPicker.map((item, i) => {
                            const value = item.name || item.center_code || '';
                            const isSelected = selectedCenters.includes(value);
                            const toggleCenter = () => {
                              if (isSelected) {
                                setValue(
                                  'centers',
                                  selectedCenters.filter((v) => v !== value),
                                );
                              } else {
                                setValue('centers', [...selectedCenters, value]);
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
                                    if (checked) setValue('centers', [...selectedCenters, value]);
                                    else
                                      setValue(
                                        'centers',
                                        selectedCenters.filter((v) => v !== value),
                                      );
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label={item.center_name || item.name || 'Unnamed Center'}
                                />
                                <span className='text-paragraph-sm text-text-main-900'>
                                  {item.center_name || item.name || 'Unnamed Center'}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </Dropdown.Content>
                  </Dropdown.Root>
                  {errors.centers && (
                    <Hint.Root hasError>
                      <Hint.Icon as={RiErrorWarningFill} />
                      {errors.centers.message}
                    </Hint.Root>
                  )}
                </div>
              )
            )}

            {requiresPipelines && (
              <UserPipelinesField
                options={pipelineOptions}
                value={selectedPipelines}
                onChange={(next) => setValue('pipelines', next, { shouldValidate: false })}
                onClearError={() => clearErrors('pipelines')}
                loading={pipelinesLoading}
                hasError={Boolean(errors.pipelines)}
                errorMessage={errors.pipelines?.message}
                loadError={pipelinesLoadError}
                onRetry={retryPipelines}
                disabled={isLoading}
              />
            )}
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close asChild>
            <Button.Root variant='neutral' className='w-full ' mode='stroke' size='small'>
              Cancel
            </Button.Root>
          </Modal.Close>

          <Button.Root
            onClick={handleSubmit(onSubmit)}
            variant='primary'
            className='w-full '
            mode='filled'
            size='small'
            disabled={isLoading}
            type='button'
          >
            {isLoading ? (
              <span className='flex items-center justify-center gap-2'>
                <span className='h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin' />
                Adding...
              </span>
            ) : (
              'Save'
            )}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default AddUserModal;
