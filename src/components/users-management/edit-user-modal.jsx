import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RiUserLine, RiMailLine, RiErrorWarningFill, RiSearchLine } from 'react-icons/ri';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Dropdown from '@/components/ui/dropdown';
import * as Checkbox from '@/components/ui/checkbox';
import * as Hint from '@/components/ui/hint';
import * as Tag from '@/components/ui/tag';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import { capitalizeEachWordFirstLetter } from '@/lib/utils';
import { z } from 'zod';
import { useSelector, useDispatch } from 'react-redux';
import { getClientList, getListOfUserEmails } from '@/redux/profileSlice';
import { getCenterListThunk } from '@/redux/centerSlice';
import { getVendorListThunk } from '@/redux/vendorSlice';
import { fetchRolesWithType } from '@/redux/teamManagementSlice';
import { showErrorToast } from '@/utils/error-utils';
import { getRole } from '@/utils/user-role-utils';
import {
  rolesPayloadForUsersSegment,
  filterGroupedRolesExcludeClientReqField,
  flattenRolesFromGrouped,
  splitFullNameIntoFirstAndLast,
  isTruthyAllCentersFlag,
} from '@/utils/user-utils';
import UserSettingsRoleDropdown from './user-settings-role-dropdown';
import UserPipelinesField from './user-pipelines-field';
import { pipelinesFromUserRecord } from './user-pipelines-utils';
import { useUserPipelineOptions } from '@/hooks/use-user-pipeline-options';
import {
  isClientAdmin,
  isClient,
  ROLE_KEYS_SETTINGS,
  ZONE_OPTIONS,
  roleRequiresPipelines,
} from '@/constants/users-constants';

// Create schema with conditional validation
const createEditUserSchema = (currentRole, getRoleReqField) =>
  z
    .object({
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().optional().default(''),
      emailAddress: z
        .string()
        .min(1, 'Email Address is required')
        .email('Please enter a valid email address'),
      role: z.string().min(1, 'Role is required'),
      centers: z.array(z.string()).optional().default([]),
      clients: z.string().optional().default(''),
      zone: z.string().optional(),
      vendor: z.string().optional().default(''),
      pipelines: z.array(z.string()).optional().default([]),
    })
    .superRefine((data, context) => {
      // If current user is Client Admin, skip validation
      if (isClientAdmin(currentRole)) {
        return;
      }

      const reqField = typeof getRoleReqField === 'function' ? getRoleReqField(data.role) : null;
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
        if (!String(data.clients || '').trim()) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['clients'],
            message: 'Client is required',
          });
        }
        return;
      }

      if (
        reqFieldNormalized === 'center' &&
        (!Array.isArray(data.centers) || data.centers.length === 0)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['centers'],
          message: 'Center is required',
        });
      }

      if (reqFieldNormalized === 'supplier' && !String(data.vendor || '').trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['vendor'],
          message: 'Vendor is required',
        });
      }
    });

const EditUserModal = ({
  isOpen,
  isLoading,
  userData,
  handleOpenChange,
  handleSave,
  usersSegment = 'all',
}) => {
  const dispatch = useDispatch();
  const { data: centerListData } = useSelector((state) => state.center.centerListData);
  const { data: clientListData } = useSelector((state) => state.profile.clientList);
  const vendorListRows = useSelector((state) => state.vendor?.vendorListData?.data ?? []);
  const userEmails = useSelector((state) => state.profile.addUser.userEmails);
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const currentRole = getRole(userSideBarPerm);
  const [isClientLocked, setIsClientLocked] = useState(false);
  const originalClientRef = useRef('');
  /** Tracks last role + req_field for clearing centers when switching into a center-scoped role. */
  const prevRoleForCenterSyncRef = useRef({ role: null, reqNorm: null });
  const prevRoleForPipelineSyncRef = useRef('');
  const pipelinesDefaultAppliedRef = useRef(false);
  const [groupedRolesFromApi, setGroupedRolesFromApi] = useState({});
  const [rolesFlatFromGrouped, setRolesFlatFromGrouped] = useState([]);
  const [rolesGroupedFetchLoading, setRolesGroupedFetchLoading] = useState(false);
  const [centerDropdownOpen, setCenterDropdownOpen] = useState(false);
  const [centerDropdownSearchQuery, setCenterDropdownSearchQuery] = useState('');
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [vendorDropdownSearchQuery, setVendorDropdownSearchQuery] = useState('');

  const hasGroupedRolesUi =
    Object.keys(groupedRolesFromApi).length > 0 && rolesFlatFromGrouped.length > 0;

  const getRoleReqField = useCallback(
    (roleName) => {
      if (!roleName || rolesFlatFromGrouped.length === 0) return null;
      const found = rolesFlatFromGrouped.find((r) => r.name === roleName);
      const req = found?.req_field;
      if (!req) return null;
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

  const roleDropdownLoading = rolesGroupedFetchLoading;

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

  const editUserSchema = useMemo(
    () => createEditUserSchema(currentRole, getRoleReqField),
    [currentRole, getRoleReqField],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    clearErrors,
  } = useForm({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      emailAddress: userData?.email,
      role: userData?.user_role,
      centers: [],
      clients: '',
      zone: '',
      vendor: '',
      pipelines: [],
    },
  });

  const selectedRole = watch('role');
  const selectedCentersRaw = watch('centers');
  const selectedCenters = Array.isArray(selectedCentersRaw) ? selectedCentersRaw : [];
  const selectedClients = watch('clients');
  const selectedZone = watch('zone');
  const selectedVendor = watch('vendor') ?? '';
  const selectedPipelinesRaw = watch('pipelines');
  const selectedPipelines = Array.isArray(selectedPipelinesRaw) ? selectedPipelinesRaw : [];

  const selectedRoleReqField = getRoleReqField(selectedRole);
  const requiresZone = selectedRoleReqField?.toLowerCase?.() === 'zone';
  const requiresCenter = selectedRoleReqField?.toLowerCase?.() === 'center';
  const requiresClient =
    selectedRoleReqField?.toLowerCase?.() === 'client' || isClient(selectedRole);
  const requiresSupplier = selectedRoleReqField?.toLowerCase?.() === 'supplier';
  const requiresPipelines = roleRequiresPipelines(selectedRole);

  const {
    options: pipelineOptions,
    loading: pipelinesLoading,
    hasError: pipelinesLoadError,
    retry: retryPipelines,
  } = useUserPipelineOptions(isOpen);

  const mapCenterToDropdownValue = useCallback(
    (rawCenter) => {
      const raw = String(rawCenter || '').trim();
      if (!raw) return '';
      if (!Array.isArray(centerListData) || centerListData.length === 0) return raw;

      const found = centerListData.find((c) => {
        const value = String(c?.name || c?.center_code || '').trim();
        const label = String(c?.center_name || c?.name || '').trim();
        return value === raw || label === raw;
      });

      return found?.name || found?.center_code || raw;
    },
    [centerListData],
  );

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

  const selectedCentersSummary = useMemo(() => {
    const labelForCode = (code) => {
      if (!centerListData || !Array.isArray(centerListData)) return code;
      const found = centerListData.find((c) => (c.name || c.center_code) === code);
      return found?.center_name || found?.name || code;
    };
    const labels = selectedCenters.map(labelForCode).filter(Boolean);
    return {
      firstLabel: labels[0] ?? '',
      remainingLabels: labels.slice(1),
      count: labels.length,
    };
  }, [selectedCenters, centerListData]);

  const mapClientToDropdownValue = useCallback(
    (rawClient) => {
      const raw = String(rawClient || '').trim();
      if (!raw) return '';
      if (!Array.isArray(clientListData) || clientListData.length === 0) return raw;

      const found = clientListData.find((c) => {
        const value = String(c?.customer_name || c?.custom_legal_name || c?.name || '').trim();
        const alt1 = String(c?.org_name || '').trim();
        const alt2 = String(c?.display_name || '').trim();
        return value === raw || alt1 === raw || alt2 === raw;
      });

      return found?.customer_name || found?.custom_legal_name || found?.name || raw;
    },
    [clientListData],
  );

  const mapZoneToDropdownValue = useCallback((rawZone) => {
    const raw = String(rawZone || '').trim();
    if (!raw) return '';

    // If it already matches one of the option values, keep it
    const direct = ZONE_OPTIONS.find((z) => z.value === raw)?.value;
    if (direct) return direct;

    // Normalize values like "zone1", "ZONE 1", "Zone-1", "1" -> "Zone 1"
    const match = raw.match(/(\d+)/);
    const num = match ? Number(match[1]) : Number.NaN;
    if (Number.isFinite(num) && num >= 1 && num <= 6) return `Zone ${num}`;

    const lower = raw
      .toLowerCase()
      .replaceAll(/[\s_-]+/g, ' ')
      .trim();
    const match2 = lower.match(/zone\s*(\d+)/);
    const num2 = match2 ? Number(match2[1]) : Number.NaN;
    if (Number.isFinite(num2) && num2 >= 1 && num2 <= 6) return `Zone ${num2}`;

    return raw;
  }, []);

  const mapVendorToDropdownValue = useCallback(
    (rawVendor) => {
      const raw = String(rawVendor || '').trim();
      if (!raw) return '';
      if (!Array.isArray(vendorListRows) || vendorListRows.length === 0) return raw;

      const byId = vendorListRows.find((v) => String(v?.id ?? '').trim() === raw);
      if (byId) return String(byId.id).trim();

      const byName = vendorListRows.find(
        (v) =>
          String(v?.vendorName || '')
            .trim()
            .toLowerCase() === raw.toLowerCase(),
      );
      if (byName?.id != null) return String(byName.id).trim();

      return raw;
    },
    [vendorListRows],
  );

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

  // When lists load after the modal opens, remap saved values to actual dropdown "value"
  useEffect(() => {
    if (!isOpen) return;

    if (requiresCenter && selectedCenters.length > 0) {
      const mappedArr = selectedCenters.map((c) => mapCenterToDropdownValue(c)).filter(Boolean);
      const changed =
        mappedArr.length !== selectedCenters.length ||
        mappedArr.some((m, i) => m !== selectedCenters[i]);
      if (changed && mappedArr.length > 0) {
        setValue('centers', mappedArr, { shouldValidate: false, shouldDirty: false });
      }
    }

    if (requiresClient) {
      const mapped = mapClientToDropdownValue(selectedClients);
      if (mapped && mapped !== selectedClients) {
        setValue('clients', mapped, { shouldValidate: false, shouldDirty: false });
      }
    }

    if (requiresZone) {
      const mapped = mapZoneToDropdownValue(selectedZone);
      if (mapped && mapped !== selectedZone) {
        setValue('zone', mapped, { shouldValidate: false, shouldDirty: false });
      }
    }

    if (requiresSupplier) {
      const mapped = mapVendorToDropdownValue(selectedVendor);
      if (mapped && mapped !== selectedVendor) {
        setValue('vendor', mapped, { shouldValidate: false, shouldDirty: false });
      }
    }
  }, [
    isOpen,
    requiresCenter,
    requiresClient,
    requiresZone,
    requiresSupplier,
    selectedCenters,
    selectedClients,
    selectedZone,
    selectedVendor,
    mapCenterToDropdownValue,
    mapClientToDropdownValue,
    mapZoneToDropdownValue,
    mapVendorToDropdownValue,
    setValue,
  ]);

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
        .catch(() => {
          // Handle error silently
        });
    }
  }, [debouncedEmailQuery, isOpen, dispatch]);

  // Filter user emails based on search query
  const filteredUserEmails = useMemo(() => {
    if (!userEmails || !Array.isArray(userEmails)) return [];
    if (!emailSearchQuery.trim()) return [];

    const query = emailSearchQuery.toLowerCase();
    return userEmails.filter((item) => item.email && item.email.toLowerCase().includes(query));
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
  };

  // Handle email selection from dropdown
  const handleEmailSelect = (email) => {
    setValue('emailAddress', email, { shouldValidate: true });
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

  // Closed: reset local UI only (do not fetch — avoids loops when center list updates remap deps).
  useEffect(() => {
    if (!isOpen) {
      reset();
      setEmailSearchQuery('');
      setDebouncedEmailQuery('');
      setIsEmailDropdownOpen(false);
      setGroupedRolesFromApi({});
      setRolesFlatFromGrouped([]);
      setRolesGroupedFetchLoading(false);
      setCenterDropdownOpen(false);
      setCenterDropdownSearchQuery('');
      setVendorDropdownOpen(false);
      setVendorDropdownSearchQuery('');
      prevRoleForCenterSyncRef.current = { role: null, reqNorm: null };
    }
  }, [isOpen, reset]);

  // Open: load centers, clients, roles once per open / segment (never tied to mapCenterToDropdownValue).
  useEffect(() => {
    if (!isOpen) return;

    fetchCenterDropDown();
    fetchVendorDropDown();

    dispatch(getClientList())
      .unwrap()
      .catch(() => {
        // Handle error silently
      });

    dispatch(getListOfUserEmails(''))
      .unwrap()
      .catch(() => {
        // Handle error silently
      });

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
  }, [isOpen, dispatch, fetchCenterDropDown, fetchVendorDropDown, usersSegment]);

  const editUserEmail = userData?.email ?? userData?.member?.email ?? userData?.emailAddress ?? '';

  // Prefill when opening for a user — depend on stable email, not `userData` row reference (table refresh creates new objects).
  useEffect(() => {
    if (!isOpen || !userData || !editUserEmail) return;

    setIsClientLocked(Boolean(userData?.org_name));
    originalClientRef.current = userData?.org_name || '';
    const firstFromApi = userData?.first_name != null ? String(userData.first_name).trim() : '';
    const lastFromApi = userData?.last_name != null ? String(userData.last_name).trim() : '';
    let firstName = firstFromApi;
    let lastName = lastFromApi;
    if (!firstName && !lastName) {
      const displayName =
        userData?.full_name || userData?.member?.name || userData?.fullName || userData?.name || '';
      const split = splitFullNameIntoFirstAndLast(displayName);
      firstName = split.firstName;
      lastName = split.lastName;
    }
    const emailAddress = userData?.email || userData?.member?.email || userData?.emailAddress || '';
    const role = userData?.user_role || userData?.role_profile_name || userData?.role || '';

    const isClientRole = isClient(role);

    const clientValue = isClientRole ? userData?.org_name || '' : userData?.org_name || '';
    const savedReqNorm = getRoleReqField(role)?.toLowerCase?.();
    const centerTokens =
      !isTruthyAllCentersFlag(userData.all_centers) &&
      savedReqNorm === 'center' &&
      Array.isArray(userData.center_names_list)
        ? userData.center_names_list.map((c) => String(c).trim()).filter(Boolean)
        : [];
    const centerValues = [
      ...new Set(centerTokens.map((t) => mapCenterToDropdownValue(t)).filter(Boolean)),
    ];
    const zoneValue = mapZoneToDropdownValue(userData?.center_zone || userData?.zone || '');
    const vendorRaw =
      userData?.supplier != null && String(userData.supplier).trim() !== ''
        ? String(userData.supplier).trim()
        : userData?.vendor != null && String(userData.vendor).trim() !== ''
          ? String(userData.vendor).trim()
          : '';
    const savedPipelines = roleRequiresPipelines(role) ? pipelinesFromUserRecord(userData) : [];

    reset({
      firstName,
      lastName,
      emailAddress,
      role,
      centers: centerValues,
      clients: clientValue,
      zone: zoneValue,
      vendor: vendorRaw,
      pipelines: savedPipelines,
    });

    setEmailSearchQuery(emailAddress);

    setValue('firstName', firstName);
    setValue('lastName', lastName);
    setValue('emailAddress', emailAddress);
    setValue('role', role);
    setValue('clients', clientValue);
    setValue('zone', zoneValue);
    setValue('centers', centerValues);
    setValue('vendor', vendorRaw);
    setValue('pipelines', savedPipelines, { shouldValidate: false });
    // Hydrated from user record — do not auto-select all over an empty saved list.
    pipelinesDefaultAppliedRef.current = true;
    prevRoleForPipelineSyncRef.current = role;
    // Center IDs remap when `centerListData` loads — see effect keyed off mapCenterToDropdownValue below.
    // Omit userData / mapCenterToDropdownValue here: new row refs after each list fetch would re-run reset(); center fetch must not re-trigger prefill.
  }, [isOpen, editUserEmail, reset, setValue]);

  // After grouped roles load, apply server `centers` only when the saved role is center-scoped and
  // the form role still matches (avoids dumping "all centers" list into the picker when editing draft role).
  useEffect(() => {
    if (!isOpen || !userData || !editUserEmail || rolesFlatFromGrouped.length === 0) return;

    const savedRole = userData?.user_role || userData?.role_profile_name || userData?.role || '';
    if (selectedRole !== savedRole) return;

    const savedReqNorm = getRoleReqField(savedRole)?.toLowerCase?.();
    if (isTruthyAllCentersFlag(userData.all_centers)) {
      setValue('centers', [], { shouldValidate: false, shouldDirty: false });
    } else if (savedReqNorm === 'center' && Array.isArray(userData.center_names_list)) {
      const centerTokens = userData.center_names_list.map((c) => String(c).trim()).filter(Boolean);
      const centerValues = [
        ...new Set(centerTokens.map((t) => mapCenterToDropdownValue(t)).filter(Boolean)),
      ];
      setValue('centers', centerValues, { shouldValidate: false, shouldDirty: false });
    } else {
      setValue('centers', [], { shouldValidate: false, shouldDirty: false });
    }
  }, [
    isOpen,
    editUserEmail,
    rolesFlatFromGrouped,
    userData,
    selectedRole,
    getRoleReqField,
    setValue,
    mapCenterToDropdownValue,
  ]);

  // Clear centers/clients/zone error when role changes
  useEffect(() => {
    if (!isOpen) return;

    if (selectedRole) {
      clearErrors('centers');
      clearErrors('clients');
      clearErrors('zone');
      clearErrors('vendor');
      clearErrors('pipelines');

      const prev = prevRoleForCenterSyncRef.current;
      const currReqNorm = selectedRoleReqField ? String(selectedRoleReqField).toLowerCase() : null;

      if (
        prev.role != null &&
        prev.role !== selectedRole &&
        requiresCenter &&
        prev.reqNorm !== 'center'
      ) {
        setValue('centers', []);
      }

      // If switching TO client role, restore original client value
      if (requiresClient) {
        setValue('clients', originalClientRef.current || '');
      }

      // Only clear based on req_field once we actually know req_field
      if (selectedRoleReqField) {
        // Clear zone value if switching away from zone-required role
        if (!requiresZone) {
          setValue('zone', '');
        }

        if (!requiresCenter) {
          setValue('centers', []);
        }

        if (!requiresSupplier) {
          setValue('vendor', '');
        }
      }

      const prevPipelineRole = prevRoleForPipelineSyncRef.current;
      if (prevPipelineRole && prevPipelineRole !== selectedRole) {
        const enteringPipelineRole =
          roleRequiresPipelines(selectedRole) && !roleRequiresPipelines(prevPipelineRole);
        const leavingPipelineRole =
          !roleRequiresPipelines(selectedRole) && roleRequiresPipelines(prevPipelineRole);

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
      }
      prevRoleForPipelineSyncRef.current = selectedRole;

      prevRoleForCenterSyncRef.current = {
        role: selectedRole,
        reqNorm: currReqNorm,
      };
    }
  }, [
    isOpen,
    selectedRole,
    clearErrors,
    setValue,
    requiresClient,
    requiresZone,
    requiresCenter,
    requiresSupplier,
    selectedRoleReqField,
    pipelineOptions,
  ]);

  // Default all pipelines once when options load for a pipeline role with empty selection
  // (e.g. user had none saved, or switched into a pipeline role before options arrived).
  useEffect(() => {
    if (!isOpen || !requiresPipelines || pipelineOptions.length === 0) return;
    if (pipelinesDefaultAppliedRef.current) return;
    if (selectedPipelines.length > 0) {
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
      prevRoleForPipelineSyncRef.current = '';
      pipelinesDefaultAppliedRef.current = false;
    }
  }, [isOpen]);

  const onSubmit = (data) => {
    const reqField = getRoleReqField(data?.role);
    const reqFieldNormalized = reqField ? reqField.toLowerCase() : null;
    const isClientRole = isClient(data?.role) || reqFieldNormalized === 'client';
    const firstName = capitalizeEachWordFirstLetter((data?.firstName || '').trim());
    const lastName = capitalizeEachWordFirstLetter((data?.lastName || '').trim());

    const toNullIfEmpty = (v) => {
      const str = typeof v === 'string' ? v.trim() : v;
      if (str === '' || str === undefined) return null;
      return str ?? null;
    };

    const payload = {
      ...data,
      firstName,
      lastName,
      centers: null,
      clients: null,
      zone: null,
      supplier: null,
      pipelines: roleRequiresPipelines(data?.role)
        ? Array.isArray(data?.pipelines)
          ? data.pipelines
          : []
        : [],
    };

    if (reqFieldNormalized === 'center') {
      const arr = Array.isArray(data?.centers)
        ? data.centers.map((c) => String(c).trim()).filter(Boolean)
        : [];
      payload.centers = arr.length > 0 ? arr : null;
    } else if (reqFieldNormalized === 'zone') {
      payload.zone = toNullIfEmpty(data?.zone);
    } else if (reqFieldNormalized === 'client' || isClientRole) {
      payload.clients = toNullIfEmpty(data?.clients);
    } else if (reqFieldNormalized === 'supplier') {
      payload.supplier = toNullIfEmpty(data?.vendor);
    } else {
      // req_field is null: all centers (same as add user / create_team_member)
      payload.all_centers = 1;
      payload.centers = null;
      payload.clients = null;
      payload.zone = null;
      payload.supplier = null;
    }

    handleSave(payload);
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Content>
        <Modal.Header
          icon={RiUserLine}
          title='Edit user'
          description='Update user details and roles.'
        />
        <Modal.Body>
          <form
            id='edit-user-form'
            onSubmit={handleSubmit(onSubmit)}
            className='w-full flex flex-col gap-4'
          >
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
                    placeholder='Email address'
                    value={emailSearchQuery}
                    disabled={true}
                    autoComplete='off'
                    className='disabled:text-gray-500'
                  />
                </Input.Wrapper>
              </Input.Root>
              {errors.emailAddress && (
                <Hint.Root hasError>
                  <Hint.Icon as={RiErrorWarningFill} />
                  {errors.emailAddress.message}
                </Hint.Root>
              )}
            </div>

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

            {requiresZone ? (
              <div className='w-full flex flex-col gap-2'>
                <Label.Root>
                  Zone
                  <Label.Asterisk />
                </Label.Root>
                <Select.Root
                  value={selectedZone}
                  onValueChange={(value) => setValue('zone', value)}
                  disabled={isLoading}
                  hasError={Boolean(errors.zone)}
                >
                  <Select.Trigger className='w-full'>
                    <Select.Value placeholder='Select' />
                  </Select.Trigger>
                  <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                    {ZONE_OPTIONS.map((zone) => (
                      <Select.Item key={zone.value} value={zone.value}>
                        {zone.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
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
                  Clients
                  <Label.Asterisk />
                </Label.Root>
                <Select.Root
                  value={selectedClients}
                  onValueChange={(value) => setValue('clients', value)}
                  disabled={isLoading || isClientLocked}
                  hasError={Boolean(errors.clients)}
                >
                  <Select.Trigger className='w-full disabled:text-gray-500'>
                    <Select.Value placeholder='Select' />
                  </Select.Trigger>
                  <Select.Content className='min-w-[var(--radix-select-trigger-width)]'>
                    {clientListData &&
                      clientListData.map((item, i) => (
                        <Select.Item
                          key={item?.customer_name || item?.custom_legal_name || item?.name}
                          value={item?.customer_name || item?.custom_legal_name || item?.name}
                        >
                          {item?.customer_name || item?.custom_legal_name || item?.name}
                        </Select.Item>
                      ))}
                  </Select.Content>
                </Select.Root>
                {errors.clients && (
                  <Hint.Root hasError>
                    <Hint.Icon as={RiErrorWarningFill} />
                    {errors.clients.message}
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
                                  { shouldValidate: true },
                                );
                              } else {
                                setValue('centers', [...selectedCenters, value], {
                                  shouldValidate: true,
                                });
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
                                    if (checked) {
                                      setValue('centers', [...selectedCenters, value], {
                                        shouldValidate: true,
                                      });
                                    } else {
                                      setValue(
                                        'centers',
                                        selectedCenters.filter((v) => v !== value),
                                        { shouldValidate: true },
                                      );
                                    }
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
            // onClick={handleSubmit(onSubmit)}
            variant='primary'
            className='w-full '
            mode='filled'
            size='small'
            disabled={isLoading}
            type='submit'
            form='edit-user-form'
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default EditUserModal;
