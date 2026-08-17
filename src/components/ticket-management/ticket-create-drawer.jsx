import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import _ from 'lodash';
import {
  RiUploadCloud2Line,
  RiCloseLine,
  RiTicketLine,
  RiDeleteBinLine,
  RiUserLine,
  RiCalendarLine,
  RiFlagLine,
  RiBuilding2Line,
  RiPriceTag3Line,
  RiStickyNoteLine,
  RiArrowDownSLine,
  RiAttachment2,
  RiPencilLine,
  RiToolsLine,
  RiLayoutGridLine,
  RiStackshareLine,
  RiStackLine,
  RiLayoutMasonryLine,
} from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Drawer from '@/components/ui/drawer';
import * as Textarea from '@/components/ui/textarea';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Switch from '@/components/ui/switch';
import ErrorText from '@/components/ui/error-text';
import FieldRow from '@/components/ui/field-row';
import { Datepicker } from '@/components/ui/datepicker';
import { DateTimePicker } from '@/components/ui/datetimepicker';
import {
  ticketCreateSchema,
  defaultTicketValues,
  ticketTypeOptions as fallbackTicketTypeOptions,
  priorityOptions as fallbackPriorityOptions,
  clientTicketCreateSchema,
  defaultClientTicketValues,
} from '@/schemas/ticket-schema';
import {
  createTicket,
  fetchTicketDropdownData,
  fetchCentersForClient,
  fetchFloors,
  fetchSpaces,
  fetchRelatedTickets,
  fetchTicketCoworkerList,
  fetchTicketClientSpocContacts,
  selectTicketDropdownData,
  selectTicketMutations,
  selectFloors,
  selectSpaces,
  selectRelatedTickets,
  selectTicketCoworkers,
  selectTicketClientSpocContacts,
  selectCreateDraftMarkerCoordinate,
  setCreateDraftMarkerCoordinate,
  clearCreateDraft,
} from '@/redux/ticketManagementSlice';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import TicketStatusDropdown from '@/components/ticket-management/ticket-status-dropdown';
import * as FileFormatIcon from '@/components/ui/file-format-icon';
import * as CompactButton from '@/components/ui/compact-button';
import DotBadge from '@/components/ui/dot-badge';
import * as Badge from '@/components/ui/badge';
import {
  PRIORITY_COLORS,
  TICKET_MARKER_COORDINATE_FIELD,
  TICKET_TYPE,
} from '@/components/ticket-management/constants';
import { format } from 'date-fns';
import { parseToDate } from '@/utils/date-utils';
import { isClient, isFacilityManager } from '@/constants/users-constants';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { formatFileSize, getFileExtension } from '@/utils/file-utils';
import TicketCategorySelect from '@/components/ticket-management/ticket-category-select';
import { searchTicketCategoryOptions } from '@/api/ticketCategoryOptions';
import { getStatusOptions } from '@/api/dynamic-status';
import TicketCreateLayoutPanel from '@/components/ticket-management/ticket-create-layout-panel';
import { clearLayoutDetail, fetchLayoutDetail } from '@/redux/layoutSlice';
import { cn } from '@/utils/cn';
import apiClient from '@/api/axios';

const flattenCenterTeamResults = (results) => {
  if (!results) return [];
  if (Array.isArray(results)) return results;
  if (typeof results === 'object') return Object.values(results).flat();
  return [];
};

const fetchCenterTeamMembers = async (payload) => {
  const response = await apiClient.post(
    '/method/devx.team_management.api.team_member.center_team_members',
    payload,
  );
  return response?.data?.message ?? response?.data;
};

const getCenterTeamMemberRole = (row) => String(row?.role || '').trim();

const formatPeopleOptionLabel = (name, role) => [name, role].filter(Boolean).join(' - ');

/** Raised By: store User email only. */
const mapCenterTeamMemberToRaisedByOption = (row) => {
  const name = row.name || String(row.team_member_id || '');
  const role = getCenterTeamMemberRole(row);
  const email = String(row.email || '').trim();
  if (!email) return null;

  return {
    label: formatPeopleOptionLabel(name, role) || name,
    value: email,
    email,
    name,
    full_name: name,
    image: row.image || null,
    avatar: row.image || null,
    user_role: role || null,
    roles: role ? [role] : [],
  };
};

/** Center SPOC: store team member id (User/Employee name). */
const mapCenterTeamMemberToAssigneeOption = (row) => {
  const name = row.name || String(row.team_member_id || '');
  const role = getCenterTeamMemberRole(row);

  return {
    label: formatPeopleOptionLabel(name, role) || name,
    value: row.team_member_id || row.email || row.name,
    email: row.email || '',
    name,
    full_name: name,
    image: row.image || null,
    avatar: row.image || null,
    user_role: role || null,
    roles: role ? [role] : [],
  };
};

const mapCoworkerToAssigneeOption = (row) => {
  const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
  const name = fullName || row.name || row.email || 'Co-worker';
  const role = String(row.access_type || '').trim();
  const email = String(row.email || '').trim();
  if (!email) return null;
  return {
    label: formatPeopleOptionLabel(name, role) || name,
    value: email,
    email,
    name,
    full_name: name,
    image: null,
    avatar: null,
    user_role: role || null,
    roles: role ? [role] : [],
  };
};

const INCIDENT_DEPARTMENT_OPTIONS = [
  'IT',
  'Operations',
  'Purchase',
  'Legal',
  'Design',
  'Execution',
  'Accounts',
  'Sales',
  'Marketing',
  'HR',
  'Corporate Governance',
];

const INCIDENT_SEVERITY_OPTIONS = ['s1', 's2', 's3'];

const INCIDENT_SENSITIVITY_OPTIONS = ['Emergency', 'High', 'Medium', 'Low'];

const YES_NO_OPTIONS = ['Yes', 'No'];

const INCIDENT_DATA_LOSS_OPTIONS = [
  'IT Infrastructure',
  'Legal Data',
  'Client Data',
  'Operations Data',
  'Design Data',
  'Facility & Infra',
];

const TicketCreateDrawer = ({
  open,
  onOpenChange,
  onSuccess,
  disabled = false,
  initialClientId = null,
  initialCenter = null,
  initialVoiceJson = null,
}) => {
  const dispatch = useDispatch();
  const dropdownData = useSelector(selectTicketDropdownData);
  const mutations = useSelector(selectTicketMutations);
  const floors = useSelector(selectFloors);
  const spaces = useSelector(selectSpaces);
  const relatedTickets = useSelector(selectRelatedTickets);
  const ticketCoworkers = useSelector(selectTicketCoworkers);
  const ticketClientSpocContacts = useSelector(selectTicketClientSpocContacts);
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const currentUserId = useSelector(
    (state) =>
      state.auth?.userInfo?.name ||
      state.auth?.userInfo?.email ||
      state.auth?.userInfo?.full_name ||
      state.auth?.userInfo?.user ||
      '',
  );
  const roleMap = userSideBarPerm?.data?.message?.role;
  const isClientUser = isClient(roleMap);
  const isFacilityManagerUser = isFacilityManager(roleMap);

  const [attachments, setAttachments] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isIncidentCorrectiveOpen, setIsIncidentCorrectiveOpen] = useState(false);
  const [isIncidentRootCauseOpen, setIsIncidentRootCauseOpen] = useState(false);
  const [isIncidentPreventiveOpen, setIsIncidentPreventiveOpen] = useState(false);
  const [isIncidentClosureOpen, setIsIncidentClosureOpen] = useState(false);
  const [clientCenters, setClientCenters] = useState([]);
  const [clientCentersLoading, setClientCentersLoading] = useState(false);
  const [relatedTicketSearch, setRelatedTicketSearch] = useState('');
  const [isLayoutPanelOpen, setIsLayoutPanelOpen] = useState(false);
  const [coreTeamMembers, setCoreTeamMembers] = useState([]);
  const [coreTeamMembersLoading, setCoreTeamMembersLoading] = useState(false);
  const [centerSpocMembers, setCenterSpocMembers] = useState([]);
  const [centerSpocMembersLoading, setCenterSpocMembersLoading] = useState(false);
  const profileData = useSelector((state) => state.profile?.profileData);
  const layoutDetailState = useSelector((state) => state.layout?.layoutDetail);
  const markerCoordinate = useSelector(selectCreateDraftMarkerCoordinate);
  const orgId = profileData?.org_id;

  const voiceJsonAllowedKeys = useMemo(
    () => [
      'ticket_title',
      'custom_ticket_type',
      'status',
      'description',
      'category',
      'sub_category',
      'priority',
      'severity',
      'center',
      'floor_zone',
      'space',
      'due_date',
      'assign_to',
      'client_comments',
      'internal_comments',
      'attachments',
      'visible_to_client',
      'customer',
    ],
    [],
  );

  const mapVoiceApiToTicketFormValues = (voiceJson) => {
    if (!voiceJson || typeof voiceJson !== 'object') return null;

    // If we already received mapped values (fallback or older behavior), pass through.
    if (Object.prototype.hasOwnProperty.call(voiceJson, 'ticket_title')) {
      return voiceJson;
    }

    const ticket =
      voiceJson?.ticket && typeof voiceJson.ticket === 'object' ? voiceJson.ticket : voiceJson;
    const pickFirst = (...values) =>
      values.find((value) => value !== undefined && value !== null && value !== '');
    const transcript = voiceJson?.normalized_transcript || voiceJson?.transcript || '';
    const notes = pickFirst(ticket?.notes, transcript, '');
    const category = pickFirst(ticket?.custom_l1, ticket?.category, '');
    const subCategory = pickFirst(ticket?.ticket_type, ticket?.sub_category, ticket?.custom_l2, '');
    const center = pickFirst(ticket?.custom_center, ticket?.center, ticket?.custom_center_name, '');
    const floor = pickFirst(ticket?.custom_floor, ticket?.floor_zone, '');
    const dueDate = pickFirst(ticket?.custom_due_date, ticket?.due_date, '');
    const status = pickFirst(ticket?.status, '');
    const customTicketType = pickFirst(ticket?.custom_ticket_type, '');
    // Voice extraction may fail and return empty/undefined fields; keep schema-safe strings.
    const priority = pickFirst(ticket?.custom_priority, ticket?.priority, '') || '';
    const customer = pickFirst(ticket?.customer, '');

    const visibleToClientRaw = ticket?.custom_visible_to_client;
    const visible_to_client =
      visibleToClientRaw === 1 ||
      visibleToClientRaw === true ||
      visibleToClientRaw === '1' ||
      visibleToClientRaw === 'true';

    // Some pipelines may return assignee under `assign_to` or `agent`.
    const assignTo = ticket?.assign_to ?? ticket?.agent;
    const assign_to = Array.isArray(assignTo)
      ? assignTo.length > 0
        ? assignTo
        : ''
      : assignTo || '';

    const voiceAssignIsEmpty = !assign_to || (Array.isArray(assign_to) && assign_to.length === 0);
    const finalAssignTo = voiceAssignIsEmpty && currentUserId ? currentUserId : assign_to;

    return {
      ticket_title: pickFirst(ticket?.subject, ticket?.ticket_title, '').trim(),
      custom_ticket_type: customTicketType,
      status,
      description: notes,
      category,
      sub_category: subCategory,
      priority,
      severity: '',
      center,
      floor_zone: floor,
      due_date: dueDate,
      assign_to: finalAssignTo,
      client_comments: '',
      internal_comments: notes,
      attachments: [],
      visible_to_client,
      customer,
    };
  };

  const mappedVoiceFormValues = useMemo(
    () => mapVoiceApiToTicketFormValues(initialVoiceJson),
    [initialVoiceJson, currentUserId],
  );

  const sanitizedInitialVoiceJson = useMemo(() => {
    if (!mappedVoiceFormValues || typeof mappedVoiceFormValues !== 'object') return null;
    return _.pick(mappedVoiceFormValues, voiceJsonAllowedKeys);
  }, [mappedVoiceFormValues, voiceJsonAllowedKeys]);

  const prevInternalSpaceCenterRef = useRef(null);
  const descriptionTextareaRef = useRef(null);

  const shouldAutoPickCenterFromVoiceJson = useMemo(() => {
    if (!sanitizedInitialVoiceJson) return false;
    const center = sanitizedInitialVoiceJson.center;
    return center == null || center === '';
  }, [sanitizedInitialVoiceJson]);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    formState: { errors, isValid, isSubmitted },
  } = useForm({
    resolver: zodResolver(isClientUser ? clientTicketCreateSchema : ticketCreateSchema),
    defaultValues: isClientUser ? defaultClientTicketValues : defaultTicketValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const watchedCategory = watch('category');
  const watchedSubCategory = watch('sub_category');
  const watchedSeverity = watch('severity');
  const watchedCenter = watch('center');
  const watchedFloor = watch('floor_zone');
  const watchedSpace = watch('space');
  const watchedStatus = watch('status');
  const watchedTicketType = watch('custom_ticket_type');
  const watchedRelatedTicket = watch('related_ticket');
  const watchedCustomer = watch('customer');
  const watchedCenterSpoc = watch('center_spoc');
  const watchedClientSpoc = watch('client_spoc');
  const isSubmitting = mutations.createStatus === 'loading';
  const isIncidentTicket = watchedTicketType === 'Incident';
  const isInternalTicket = watchedTicketType === 'Internal ticket';
  const isClientTicket = isClientUser || watchedTicketType === 'Client ticket';
  const resolvedClientId = useMemo(() => {
    if (isClientUser) return String(orgId || '').trim();
    if (watchedTicketType === 'Client ticket') {
      return String(watchedCustomer || initialClientId || '').trim();
    }
    return '';
  }, [isClientUser, orgId, watchedTicketType, watchedCustomer, initialClientId]);
  const watchedIncidentCorrective = watch('incident_corrective_action');
  const watchedIncidentRootCause = watch('incident_root_cause_analysis');
  const watchedIncidentPreventive = watch('incident_preventive_action');
  const watchedIncidentClosure = watch('incident_closure_remarks');
  const watchedRequiresRm = watch('requires_rm');
  const titlePlaceholder = isIncidentTicket ? 'Incident Title' : 'Enter ticket title';
  const descriptionPlaceholder = isIncidentTicket ? 'Incident Brief' : 'Add description';

  // Set custom_visible_to_client based on ticket type and reset customer
  useEffect(() => {
    if (watchedTicketType === 'Internal ticket') {
      setValue('visible_to_client', false);
      setValue('customer', ''); // Clear customer for internal tickets
      setValue('client_spoc', '');
    } else if (watchedTicketType === 'Client ticket') {
      // Reset to default true for client tickets
      setValue('visible_to_client', true);
      setValue('issue_raised_by', '');
      setValue('center_spoc', '');
    } else {
      // Reset customer when ticket type is cleared
      setValue('customer', '');
      setValue('issue_raised_by', '');
      setValue('center_spoc', '');
      setValue('client_spoc', '');
    }
  }, [watchedTicketType, setValue]);

  useEffect(() => {
    if (!watchedRequiresRm) {
      setValue('rm_impact', '');
    }
  }, [watchedRequiresRm, setValue]);

  useEffect(() => {
    if (!isIncidentTicket) {
      setValue('financial_impact', false);
    }
  }, [isIncidentTicket, setValue]);

  const watchedDescription = watch('description');

  useEffect(() => {
    if (isSubmitted && errors.description) {
      setIsDescriptionOpen(true);
    }
  }, [isSubmitted, errors.description]);

  useEffect(() => {
    if (isDescriptionOpen) {
      window.requestAnimationFrame(() => descriptionTextareaRef.current?.focus());
    }
  }, [isDescriptionOpen]);

  // Fetch dropdown data when drawer opens
  useEffect(() => {
    if (open && dropdownData.status === 'idle') {
      dispatch(fetchTicketDropdownData());
    }
  }, [open, dispatch, dropdownData.status]);

  // Fetch centers allocated to client when creating from client detail page
  useEffect(() => {
    if (!open || !initialClientId) {
      setClientCenters([]);
      setClientCentersLoading(false);
      return;
    }
    setClientCentersLoading(true);
    dispatch(fetchCentersForClient(initialClientId))
      .unwrap()
      .then((centers) => {
        setClientCenters(Array.isArray(centers) ? centers : []);
      })
      .catch(() => {
        setClientCenters([]);
      })
      .finally(() => {
        setClientCentersLoading(false);
      });
  }, [open, initialClientId, dispatch]);

  useEffect(() => {
    if (open && relatedTickets.status === 'idle') {
      dispatch(fetchRelatedTickets());
    }
    if (!open) {
      setRelatedTicketSearch('');
    }
  }, [open, dispatch, relatedTickets.status]);

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      const defaultValues = isClientUser ? defaultClientTicketValues : defaultTicketValues;
      const prefillValues = sanitizedInitialVoiceJson || {};

      // Pre-fill client if initialClientId is provided - set values before reset
      if (initialClientId && !isClientUser) {
        // Merge default values with client-specific values
        const clientDefaultValues = {
          ...defaultValues,
          custom_ticket_type: 'Client ticket',
          customer: initialClientId,
          visible_to_client: true,
        };
        reset({ ...clientDefaultValues, ...prefillValues });
      } else if (isClientUser) {
        // For client users, auto-fill customer and visible_to_client behind the scenes
        const clientUserValues = {
          ...defaultValues,
          customer: orgId,
          visible_to_client: true,
          custom_ticket_type: 'Client ticket',
        };
        reset({ ...clientUserValues, ...prefillValues });
      } else {
        reset({ ...defaultValues, ...prefillValues });
      }

      setAttachments([]);
      setFileError(null);
      setIsDescriptionOpen(false);
      setIsIncidentCorrectiveOpen(false);
      setIsIncidentRootCauseOpen(false);
      setIsIncidentPreventiveOpen(false);
      setIsIncidentClosureOpen(false);
    }
  }, [open, reset, setValue, initialClientId, isClientUser, orgId, sanitizedInitialVoiceJson]);

  // Pre-fill center when initialCenter is provided and drawer opens or dropdown data loads
  useEffect(() => {
    if (open && initialCenter && dropdownData.data?.centers) {
      // Find the center option that matches initialCenter
      const centerOption = dropdownData.data.centers.find(
        (center) =>
          center.value === initialCenter ||
          center.label === initialCenter ||
          center.name === initialCenter,
      );
      if (centerOption) {
        const centerValue = centerOption?.value || centerOption?.label || centerOption?.name;
        if (centerValue) {
          setValue('center', centerValue, { shouldValidate: false });
        }
      }
    }
  }, [open, initialCenter, dropdownData.data?.centers, setValue]);

  // If voice JSON is present but center is empty, auto-pick the first available center.
  useEffect(() => {
    if (!open) return;
    if (!shouldAutoPickCenterFromVoiceJson) return;
    if (watchedCenter) return;
    const options = initialClientId ? clientCenters : dropdownData.data?.centers || [];
    if (options.length > 0) {
      const first = options[0];
      const value = first?.value || first?.label || first;
      if (value) setValue('center', value, { shouldValidate: false });
    }
  }, [
    open,
    shouldAutoPickCenterFromVoiceJson,
    watchedCenter,
    initialClientId,
    clientCenters,
    dropdownData.data?.centers,
    setValue,
  ]);

  const handleTicketCategoryChange = useCallback(
    ({ category, sub_category, severity }) => {
      setValue('category', category, { shouldValidate: isSubmitted });
      setValue('sub_category', sub_category, { shouldValidate: isSubmitted });
      if (severity) {
        setValue('severity', severity);
      } else {
        setValue('severity', '');
      }
    },
    [isSubmitted, setValue],
  );

  // Voice/duplicate prefill may set category + sub_category without severity.
  // Resolve severity once from the breadcrumb category API when still empty.
  useEffect(() => {
    if (!open) return undefined;
    const category = String(watchedCategory || '').trim();
    const subCategory = String(watchedSubCategory || '').trim();
    if (!category || !subCategory) return undefined;
    if (String(watchedSeverity || getValues('severity') || '').trim()) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const options = await searchTicketCategoryOptions({ search: subCategory });
        if (cancelled) return;
        const match =
          options.find(
            (opt) =>
              String(opt.sub_category || '').trim() === subCategory &&
              String(opt.category || '').trim() === category,
          ) || options.find((opt) => String(opt.sub_category || '').trim() === subCategory);
        const severity = String(match?.severity || '').trim();
        if (severity && !String(getValues('severity') || '').trim()) {
          setValue('severity', severity);
        }
      } catch {
        // Toast already shown by searchTicketCategoryOptions.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, watchedCategory, watchedSubCategory, watchedSeverity, getValues, setValue]);

  const currentSeverityOptions = useMemo(() => {
    return dropdownData.data?.severities || [];
  }, [dropdownData.data?.severities]);

  const currentPriorityOptions = useMemo(() => {
    return dropdownData.data?.priorities || fallbackPriorityOptions;
  }, [dropdownData.data?.priorities]);

  const [dynamicStatusOptions, setDynamicStatusOptions] = useState([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const opts = await getStatusOptions({ doctype: 'HD Ticket', field: 'status' });
        if (!cancelled) setDynamicStatusOptions(Array.isArray(opts) ? opts : []);
      } catch {
        if (!cancelled) setDynamicStatusOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const currentStatusOptions = useMemo(() => {
    const base =
      dynamicStatusOptions.length > 0 ? dynamicStatusOptions : dropdownData.data?.statuses || [];

    // Ensure "Breached" is always included as it's a special computed status
    const hasBreached = (base || []).some((opt) => (opt?.value ?? opt) === 'Breached');
    if (!hasBreached) {
      return [...(base || []), { label: 'Breached', value: 'Breached', color: 'red' }];
    }
    return base || [];
  }, [dynamicStatusOptions, dropdownData.data?.statuses]);

  const currentTicketTypeOptions = useMemo(() => {
    const options = dropdownData.data?.ticket_types || fallbackTicketTypeOptions;
    // Filter out "Internal ticket" when creating from client detail page
    if (initialClientId) {
      return options.filter((option) => {
        const value = option.value || option.label || option;
        return value !== 'Internal ticket';
      });
    }
    return options;
  }, [dropdownData.data?.ticket_types, initialClientId]);

  const currentCenterOptions = useMemo(() => {
    if (initialClientId) {
      return clientCenters;
    }
    return dropdownData.data?.centers || [];
  }, [initialClientId, clientCenters, dropdownData.data?.centers]);

  const currentFloorOptions = useMemo(() => {
    if (!watchedCenter) return [];
    return floors.data[watchedCenter] || [];
  }, [watchedCenter, floors.data]);

  const selectedFloorOption = useMemo(() => {
    if (!watchedFloor) return null;
    return (
      currentFloorOptions.find(
        (option) =>
          String(option?.value ?? '') === String(watchedFloor) ||
          String(option?.label ?? '') === String(watchedFloor),
      ) ?? null
    );
  }, [watchedFloor, currentFloorOptions]);

  const selectedFloorRef = useMemo(() => {
    if (!selectedFloorOption) return '';
    return String(selectedFloorOption.name || selectedFloorOption.value || '').trim();
  }, [selectedFloorOption]);

  const canOpenLayoutPanel = Boolean(watchedCenter && watchedFloor && selectedFloorRef);

  const currentSpaceOptions = useMemo(() => {
    if (!watchedCenter) return [];
    return spaces.data[watchedCenter] || [];
  }, [watchedCenter, spaces.data]);

  const currentClientOptions = useMemo(() => {
    return dropdownData.data?.clients || dropdownData.data?.customers || [];
  }, [dropdownData.data?.clients, dropdownData.data?.customers]);
  const relatedTicketOptions = useMemo(() => relatedTickets.data || [], [relatedTickets.data]);
  const relatedTicketOptionsLoading = relatedTickets.status === 'loading';
  const filteredRelatedTicketOptions = useMemo(() => {
    const query = relatedTicketSearch.trim().toLowerCase();
    if (!query) return relatedTicketOptions;
    return relatedTicketOptions.filter((option) =>
      String(option?.label || option?.value || '')
        .toLowerCase()
        .includes(query),
    );
  }, [relatedTicketOptions, relatedTicketSearch]);

  // Voice/API payloads may provide customer label/name while Select expects option.value.
  // Normalize to the actual option value once client options are loaded.
  useEffect(() => {
    if (!open || isClientUser) return;
    if (watchedTicketType !== 'Client ticket') return;

    const rawCustomer = watch('customer');
    if (!rawCustomer || currentClientOptions.length === 0) return;

    const rawValue = String(rawCustomer).trim();
    if (!rawValue) return;

    const hasExactValue = currentClientOptions.some((option) => option?.value === rawValue);
    if (hasExactValue) return;

    const normalizedTarget = rawValue.toLowerCase();
    const matchedOption = currentClientOptions.find((option) => {
      const optionValue = String(option?.value || '')
        .trim()
        .toLowerCase();
      const optionLabel = String(option?.label || '')
        .trim()
        .toLowerCase();
      const optionName = String(option?.name || '')
        .trim()
        .toLowerCase();
      return (
        optionLabel === normalizedTarget ||
        optionName === normalizedTarget ||
        optionValue === normalizedTarget
      );
    });

    if (matchedOption?.value) {
      setValue('customer', matchedOption.value, { shouldValidate: true });
    }
  }, [open, isClientUser, watchedTicketType, currentClientOptions, setValue, watch]);

  // Fetch floors when center changes
  useEffect(() => {
    if (watchedCenter) {
      setValue('floor_zone', '');
      dispatch(fetchFloors(watchedCenter));
    }
  }, [watchedCenter, setValue, dispatch]);

  useEffect(() => {
    if (!open) {
      setIsLayoutPanelOpen(false);
      dispatch(clearCreateDraft());
      dispatch(clearLayoutDetail());
    }
  }, [open, dispatch]);

  useEffect(() => {
    setIsLayoutPanelOpen(false);
    dispatch(clearCreateDraft());
  }, [dispatch, watchedCenter, watchedFloor]);

  const handleOpenLayoutPanel = useCallback(() => {
    if (!canOpenLayoutPanel) return;
    setIsLayoutPanelOpen(true);
    dispatch(clearLayoutDetail());
    dispatch(fetchLayoutDetail({ floorRef: selectedFloorRef }));
  }, [canOpenLayoutPanel, dispatch, selectedFloorRef]);

  const handleCloseLayoutPanel = useCallback(() => {
    setIsLayoutPanelOpen(false);
  }, []);

  const handleMarkerCoordinateChange = useCallback(
    (coordinate) => {
      dispatch(setCreateDraftMarkerCoordinate(coordinate));
    },
    [dispatch],
  );

  const handleMarkerSpaceResolved = useCallback(
    (spaceId) => {
      if (spaceId) {
        setValue('space', spaceId, { shouldValidate: true, shouldDirty: true });
      }
    },
    [setValue],
  );

  // Spaces (internal tickets only): list from /api/resource/Space, clear when center changes
  useEffect(() => {
    if (watchedTicketType !== 'Internal ticket') {
      setValue('space', '');
      prevInternalSpaceCenterRef.current = null;
      return;
    }
    if (!watchedCenter) return;
    const centerChanged = prevInternalSpaceCenterRef.current !== watchedCenter;
    if (centerChanged) {
      setValue('space', '');
      prevInternalSpaceCenterRef.current = watchedCenter;
    }
    const hasCache = Object.prototype.hasOwnProperty.call(spaces.data, watchedCenter);
    if (centerChanged || !hasCache) {
      dispatch(fetchSpaces(watchedCenter));
    }
  }, [watchedCenter, watchedTicketType, setValue, dispatch, spaces.data]);

  // Fetch core team members (Issue Raised by) and center SPOCs for internal tickets
  useEffect(() => {
    if (!open || !isInternalTicket || !watchedCenter) {
      setCoreTeamMembers([]);
      setCenterSpocMembers([]);
      setCoreTeamMembersLoading(false);
      setCenterSpocMembersLoading(false);
      return;
    }

    let cancelled = false;
    setCoreTeamMembers([]);
    setCenterSpocMembers([]);
    setCoreTeamMembersLoading(true);
    setCenterSpocMembersLoading(true);

    const loadCoreTeamMembers = fetchCenterTeamMembers({
      center: watchedCenter,
      scope: 'core_team',
      keyword: '',
      page: 1,
      limit_page_length: 500,
    })
      .then((message) => {
        if (cancelled) return;
        const rows = flattenCenterTeamResults(message?.results);
        setCoreTeamMembers(rows);
      })
      .catch(() => {
        if (!cancelled) setCoreTeamMembers([]);
      })
      .finally(() => {
        if (!cancelled) setCoreTeamMembersLoading(false);
      });

    const loadCenterSpocMembers = fetchCenterTeamMembers({
      center: watchedCenter,
      keyword: '',
      page: 1,
      limit_page_length: 500,
    })
      .then((message) => {
        if (cancelled) return;
        const rows = flattenCenterTeamResults(message?.results).filter(
          (row) => Number(row.spoc) === 1,
        );
        setCenterSpocMembers(rows);
      })
      .catch(() => {
        if (!cancelled) setCenterSpocMembers([]);
      })
      .finally(() => {
        if (!cancelled) setCenterSpocMembersLoading(false);
      });

    void Promise.allSettled([loadCoreTeamMembers, loadCenterSpocMembers]);

    return () => {
      cancelled = true;
    };
  }, [open, isInternalTicket, watchedCenter]);

  useEffect(() => {
    if (!isInternalTicket) return;
    setValue('issue_raised_by', '');
    setValue('center_spoc', '');
  }, [watchedCenter, isInternalTicket, setValue]);

  const issueRaisedByOptions = useMemo(
    () => coreTeamMembers.map(mapCenterTeamMemberToRaisedByOption).filter(Boolean),
    [coreTeamMembers],
  );

  const centerSpocOptions = useMemo(
    () =>
      centerSpocMembers
        .map((row) => ({
          value: row.team_member_id || row.email || row.name,
          label: row.name || String(row.team_member_id || ''),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [centerSpocMembers],
  );

  const centerSpocAssigneeOptions = useMemo(
    () => centerSpocMembers.map(mapCenterTeamMemberToAssigneeOption),
    [centerSpocMembers],
  );

  // Auto-select all center SPOCs when options load for the selected center
  useEffect(() => {
    if (!open || !isInternalTicket || !watchedCenter || centerSpocMembersLoading) return;

    if (centerSpocOptions.length === 0) {
      if (watchedCenterSpoc) {
        setValue('center_spoc', '', { shouldValidate: false });
      }
      return;
    }

    if (watchedCenterSpoc) return;

    const allValues = centerSpocOptions.map((option) => option.value).join(',');
    setValue('center_spoc', allValues, { shouldValidate: false });
  }, [
    open,
    isInternalTicket,
    watchedCenter,
    watchedCenterSpoc,
    centerSpocOptions,
    centerSpocMembersLoading,
    setValue,
  ]);

  // Fetch co-workers (Issue Raised by) for client tickets
  useEffect(() => {
    if (!open || !isClientTicket || !resolvedClientId) return;
    dispatch(fetchTicketCoworkerList(resolvedClientId));
  }, [open, isClientTicket, resolvedClientId, dispatch]);

  // Fetch client SPOC contacts for client tickets
  useEffect(() => {
    if (!open || !isClientTicket || !resolvedClientId) return;
    dispatch(fetchTicketClientSpocContacts(resolvedClientId));
  }, [open, isClientTicket, resolvedClientId, dispatch]);

  useEffect(() => {
    if (!isClientTicket) return;
    setValue('issue_raised_by', '');
    setValue('client_spoc', '');
  }, [resolvedClientId, isClientTicket, setValue]);

  const coworkerOptions = useMemo(
    () => ticketCoworkers.data[resolvedClientId] || [],
    [ticketCoworkers.data, resolvedClientId],
  );
  const coworkerOptionsLoading = ticketCoworkers.status === 'loading';

  const clientSpocContacts = useMemo(
    () => ticketClientSpocContacts.data[resolvedClientId] || [],
    [ticketClientSpocContacts.data, resolvedClientId],
  );
  const clientSpocContactsLoading = ticketClientSpocContacts.status === 'loading';

  const issueRaisedByCoworkerOptions = useMemo(
    () => coworkerOptions.map(mapCoworkerToAssigneeOption).filter(Boolean),
    [coworkerOptions],
  );

  const clientSpocAssigneeOptions = useMemo(
    () =>
      clientSpocContacts.map((contact) => {
        const name = contact.contact_name || contact.name;
        let role = String(contact.designation || contact.department || contact.role || '').trim();
        // If role/department is "other", use other_department instead
        if (role.toLowerCase() === 'other' && contact.other_department) {
          role = String(contact.other_department).trim();
        }
        return {
          label: formatPeopleOptionLabel(name, role) || name,
          value: contact.name,
          email: contact.email || '',
          name,
          full_name: name,
          image: null,
          avatar: null,
          user_role: role || null,
          roles: role ? [role] : [],
        };
      }),
    [clientSpocContacts],
  );

  // Auto-select all client SPOCs when options load
  useEffect(() => {
    if (!open || !isClientTicket || !resolvedClientId || clientSpocContactsLoading) return;

    if (clientSpocAssigneeOptions.length === 0) {
      if (watchedClientSpoc) {
        setValue('client_spoc', '', { shouldValidate: false });
      }
      return;
    }

    if (watchedClientSpoc) return;

    const allValues = clientSpocAssigneeOptions.map((option) => option.value).join(',');
    setValue('client_spoc', allValues, { shouldValidate: false });
  }, [
    open,
    isClientTicket,
    resolvedClientId,
    watchedClientSpoc,
    clientSpocAssigneeOptions,
    clientSpocContactsLoading,
    setValue,
  ]);

  // Default status to first option when available
  useEffect(() => {
    if (!watchedStatus && currentStatusOptions.length > 0) {
      const firstStatus = currentStatusOptions[0];
      const firstValue = firstStatus?.value || firstStatus?.label || firstStatus;
      if (firstValue) {
        setValue('status', firstValue);
      }
    }
  }, [watchedStatus, currentStatusOptions, setValue]);

  // Auto-select center if only one option is available (skip if initialCenter is provided)
  useEffect(() => {
    if (!initialCenter && !watchedCenter && currentCenterOptions.length === 1) {
      const centerOption = currentCenterOptions[0];
      const centerValue = centerOption?.value || centerOption?.label || centerOption;
      if (centerValue) {
        setValue('center', centerValue);
      }
    }
  }, [watchedCenter, currentCenterOptions, setValue, initialCenter]);

  // Auto-select floor if only one option is available
  useEffect(() => {
    if (
      watchedCenter &&
      !watchedFloor &&
      currentFloorOptions.length === 1 &&
      floors.status !== 'loading'
    ) {
      const floorOption = currentFloorOptions[0];
      const floorValue = floorOption?.value || floorOption?.label || floorOption;
      if (floorValue) {
        setValue('floor_zone', floorValue);
      }
    }
  }, [watchedCenter, watchedFloor, currentFloorOptions, floors.status, setValue]);

  // Auto-select space when only one option exists (internal tickets)
  useEffect(() => {
    if (
      watchedTicketType === 'Internal ticket' &&
      watchedCenter &&
      !watchedSpace &&
      currentSpaceOptions.length === 1 &&
      spaces.status !== 'loading'
    ) {
      setValue('space', currentSpaceOptions[0].value);
    }
  }, [
    watchedTicketType,
    watchedCenter,
    watchedSpace,
    currentSpaceOptions,
    spaces.status,
    setValue,
  ]);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes

  const handleFileUpload = (files) => {
    setFileError(null);
    const validFiles = [];
    const invalidFiles = [];

    [...files].forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push(file.name);
      } else {
        validFiles.push({
          id: Date.now() + Math.random(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
        });
      }
    });

    if (invalidFiles.length > 0) {
      setFileError(`The following file(s) exceed the 10 MB limit: ${invalidFiles.join(', ')}`);
    }

    if (validFiles.length > 0) {
      setAttachments((previous) => [...previous, ...validFiles]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      // Only set dragActive to false if we're leaving the drawer area
      // Check if we're leaving to a parent element (not a child)
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setDragActive(false);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const removeAttachment = (id) => {
    setAttachments((previous) => previous.filter((file) => file.id !== id));
  };

  const onSubmit = async (data) => {
    try {
      data.ticket_title = _.upperFirst(data.ticket_title.trim());
      // Validate customer is selected for Client tickets
      if (
        data.custom_ticket_type === 'Client ticket' &&
        (!data.customer || data.customer.trim() === '')
      ) {
        setValue('customer', '', { shouldValidate: true });
        return; // Form validation will show the error
      }

      console.log('data in ticket creat drawer', data);

      const ticketPayload = {
        ...data,
        raised_by: data.issue_raised_by || data.raised_by || '',
        financial_impact: data.financial_impact ? 1 : 0,
        requires_rm: data.requires_rm ? 1 : 0,
        rm_impact: (() => {
          const raw = String(data.rm_impact ?? '')
            .trim()
            .replaceAll(',', '');
          if (!data.requires_rm) return '';
          if (raw === '') return 0;
          const n = Number.parseFloat(raw);
          return Number.isFinite(n) ? n : 0;
        })(),
        // Include actual File objects for upload
        attachments: attachments.map((att) => ({
          file: att.file, // The actual File object
          name: att.name,
          size: att.size,
          type: att.type,
        })),
        // Map comment fields to match API expectations
        internal_comments: data.internal_comments || '',
        client_comments: data.client_comments || '',
        ...(markerCoordinate ? { [TICKET_MARKER_COORDINATE_FIELD]: markerCoordinate } : {}),
      };

      const createdTicket = await dispatch(createTicket(ticketPayload)).unwrap();
      showSuccessToast('Ticket created successfully.');
      onSuccess?.(createdTicket);
      onOpenChange?.(false);
    } catch (error) {
      console.error('Failed to create ticket:', error);
      showErrorToast(error, {
        defaultMessage: 'Failed to create ticket',
      });
    }
  };

  // Client ticket form submit handler (Figma design)
  const onClientSubmit = async (data) => {
    try {
      const ticketPayload = {
        ticket_title: _.upperFirst(data.ticket_title.trim()),
        description: data.description,
        center: data.center,
        floor_zone: data.floor_zone,
        client_comments: data.client_comments || '',
        custom_ticket_type: 'Client ticket',
        visible_to_client: true,
        customer: orgId,
        related_ticket: data.related_ticket || '',
        raised_by: data.issue_raised_by || data.raised_by || '',
        client_spoc: data.client_spoc || '',
        requires_rm: data.requires_rm ? 1 : 0,
        rm_impact: data.requires_rm ? (data.rm_impact || '').trim() : '',
        // Include actual File objects for upload
        attachments: attachments.map((att) => ({
          file: att.file,
          name: att.name,
          size: att.size,
          type: att.type,
        })),
        ...(markerCoordinate ? { [TICKET_MARKER_COORDINATE_FIELD]: markerCoordinate } : {}),
      };

      const createdTicket = await dispatch(createTicket(ticketPayload)).unwrap();
      showSuccessToast('Ticket created successfully.');
      onSuccess?.(createdTicket);
      onOpenChange?.(false);
    } catch (error) {
      console.error('Failed to create ticket:', error);
      showErrorToast(error, {
        defaultMessage: 'Failed to create ticket',
      });
    }
  };

  const closeDrawer = () => {
    if (!isSubmitting) {
      onOpenChange?.(false);
    }
  };

  const renderClientTicketPeopleFields = () => (
    <>
      <FieldRow icon={RiUserLine} label='Issue Raised by'>
        <Controller
          name='issue_raised_by'
          control={control}
          render={({ field }) => {
            const fieldValue = field.value
              ? Array.isArray(field.value)
                ? field.value
                : [field.value]
              : [];
            return (
              <AssigneeMultiSelect
                value={fieldValue}
                onChange={(values) => {
                  const ids = Array.isArray(values) ? values.filter(Boolean) : [];
                  field.onChange(ids[0] || '');
                }}
                disabled={disabled || isSubmitting || !resolvedClientId || coworkerOptionsLoading}
                placeholder='Select'
                size='xsmall'
                singleSelect
                hasError={isSubmitted && Boolean(errors.issue_raised_by)}
                fixedAssigneeOptions={issueRaisedByCoworkerOptions}
                fixedAssigneeOptionsLoading={coworkerOptionsLoading}
              />
            );
          }}
        />
        {isSubmitted && errors.issue_raised_by && (
          <ErrorText className='w-full'>{errors.issue_raised_by.message}</ErrorText>
        )}
      </FieldRow>

      <FieldRow icon={RiUserLine} label='Client SPOC'>
        <Controller
          name='client_spoc'
          control={control}
          render={({ field }) => {
            const fieldValue = field.value
              ? String(field.value)
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean)
              : [];
            return (
              <AssigneeMultiSelect
                value={fieldValue}
                onChange={(values) => {
                  const ids = Array.isArray(values) ? values.filter(Boolean) : [];
                  field.onChange(ids.length > 0 ? ids.join(',') : '');
                }}
                disabled={
                  disabled || isSubmitting || !resolvedClientId || clientSpocContactsLoading
                }
                placeholder='Select'
                size='xsmall'
                hasError={isSubmitted && Boolean(errors.client_spoc)}
                fixedAssigneeOptions={clientSpocAssigneeOptions}
                fixedAssigneeOptionsLoading={clientSpocContactsLoading}
              />
            );
          }}
        />
        {isSubmitted && errors.client_spoc && (
          <ErrorText className='w-full'>{errors.client_spoc.message}</ErrorText>
        )}
      </FieldRow>
    </>
  );

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content
        className={cn(
          'relative flex h-full flex-col !overflow-hidden',
          isLayoutPanelOpen ? '!max-w-[min(100vw,1200px)] w-[min(100vw,1200px)]' : 'max-w-[560px]',
        )}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {/* Drag and Drop Overlay */}
        {dragActive && (
          <div className='absolute inset-0 z-50 bg-information-lighter/80 backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-information-base rounded-lg pointer-events-none'>
            <div className='flex flex-col items-center gap-4'>
              <RiUploadCloud2Line className='size-16 text-information-base' />
              <div className='flex flex-col items-center gap-2'>
                <p className='label-large text-information-base font-semibold'>Drop files here</p>
                <p className='text-paragraph-sm text-text-sub-600'>
                  All file types, up to 10 MB per file
                </p>
              </div>
            </div>
          </div>
        )}

        <Drawer.Header className='sticky top-0 z-10 bg-white'>
          <div className='flex items-center justify-between gap-4 px-6 py-5'>
            <div className='rounded-full border border-stroke-soft-200 p-2.5'>
              <RiTicketLine size={24} />
            </div>
            <div className='flex flex-col gap-1'>
              <Drawer.Title className='label-medium text-text-main-900'>
                Create New Ticket
              </Drawer.Title>
              <p className='paragraph-small text-text-sub-500'>Enter ticket details</p>
            </div>
          </div>
        </Drawer.Header>

        <form
          onSubmit={handleSubmit(isClientUser ? onClientSubmit : onSubmit)}
          className='flex min-h-0 flex-1 flex-col overflow-hidden'
        >
          <div
            className={cn('flex min-h-0 flex-1 overflow-hidden', isLayoutPanelOpen && 'flex-row')}
          >
            <div
              className={cn(
                'min-h-0 overflow-y-auto px-6 pb-6 pt-4',
                isLayoutPanelOpen
                  ? 'w-[400px] shrink-0 grow-0 basis-[400px] border-r border-stroke-soft-200'
                  : 'flex-1',
              )}
            >
              <div className='flex flex-col gap-5'>
                {!isClientUser && (
                  <div className='flex items-center gap-2'>
                    <div className='w-[180px]'>
                      <Controller
                        name='custom_ticket_type'
                        control={control}
                        render={({ field }) => {
                          // Get option value - handle different option formats
                          const getOptionValue = (option) => {
                            return option.value || option.label || option;
                          };

                          return (
                            <Select.Root
                              hasError={isSubmitted && Boolean(errors.custom_ticket_type)}
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={
                                disabled || isSubmitting || dropdownData.status === 'loading'
                              }
                              size='xsmall'
                            >
                              <Select.Trigger id='custom_ticket_type' className='min-w-[140px]'>
                                <Select.Value placeholder='Ticket Type'>
                                  <div className='flex items-center gap-2'>
                                    <DotBadge color={TICKET_TYPE[field.value]?.color} size={16} />
                                    <span className='label-small text-text-main-900'>
                                      {field.value || 'Ticket Type'}
                                    </span>
                                  </div>
                                </Select.Value>
                              </Select.Trigger>
                              <Select.Content>
                                {currentTicketTypeOptions.map((option) => {
                                  const optionValue = getOptionValue(option);
                                  const optionLabel = option.label || option.value || option;
                                  return (
                                    <Select.Item key={optionValue} value={optionValue}>
                                      <div className='flex items-center gap-2'>
                                        <DotBadge
                                          color={TICKET_TYPE[optionValue]?.color}
                                          size={16}
                                        />
                                        <span className='label-small text-text-main-900'>
                                          {optionLabel}
                                        </span>
                                      </div>
                                    </Select.Item>
                                  );
                                })}
                              </Select.Content>
                            </Select.Root>
                          );
                        }}
                      />
                    </div>
                    <div className=''>
                      <TicketStatusDropdown
                        value={watchedStatus}
                        onValueChange={(value) => setValue('status', value)}
                        statusOptions={currentStatusOptions}
                        disabled={disabled || isSubmitting || dropdownData.status === 'loading'}
                        placeholder='Status'
                        hasError={isSubmitted && Boolean(errors.status)}
                        className='w-full'
                        variant='full'
                        size='xsmall'
                        isFacilityManager={isFacilityManagerUser}
                      />
                    </div>
                  </div>
                )}

                <div className='flex flex-col gap-4'>
                  <div className=''>
                    <Controller
                      name='ticket_title'
                      control={control}
                      render={({ field }) => (
                        <Textarea.Root
                          {...field}
                          id='ticket_title'
                          hasError={isSubmitted && Boolean(errors.ticket_title)}
                          placeholder={titlePlaceholder}
                          disabled={disabled || isSubmitting}
                          className='field-sizing-content text-lg'
                          simple
                          onBlur={(event) => {
                            const trimmed = event.target.value.trim();
                            if (trimmed !== field.value) {
                              field.onChange(trimmed);
                            }
                            field.onBlur();
                          }}
                        />
                      )}
                    />
                    {isSubmitted && errors.ticket_title && (
                      <ErrorText>{errors.ticket_title.message}</ErrorText>
                    )}
                  </div>

                  <div>
                    {isDescriptionOpen || String(watchedDescription ?? '').trim() !== '' ? (
                      <Controller
                        name='description'
                        control={control}
                        render={({ field }) => (
                          <Textarea.Root
                            {...field}
                            ref={(node) => {
                              field.ref(node);
                              descriptionTextareaRef.current = node;
                            }}
                            id='description'
                            rows={4}
                            hasError={isSubmitted && Boolean(errors.description)}
                            placeholder={descriptionPlaceholder}
                            disabled={disabled || isSubmitting}
                            maxLength={isIncidentTicket ? 200 : undefined}
                            className='min-h-[116px]'
                            onBlur={(event) => {
                              field.onBlur();
                              if (String(field.value ?? '').trim() === '') {
                                setIsDescriptionOpen(false);
                              }
                            }}
                          >
                            {isIncidentTicket ? (
                              <Textarea.CharCounter
                                current={field.value?.length || 0}
                                max={200}
                                className='text-text-sub-500'
                              />
                            ) : null}
                          </Textarea.Root>
                        )}
                      />
                    ) : (
                      <button
                        type='button'
                        onClick={() => setIsDescriptionOpen(true)}
                        className='flex gap-1 w-full items-center border border-transparent hover:border-stroke-sub-300 cursor-pointer px-2 py-1.5 rounded-10'
                      >
                        <RiStickyNoteLine className='size-5 text-text-soft-400' />
                        <span className='text-paragraph-md text-text-soft-400'>
                          Add description
                        </span>
                      </button>
                    )}
                    {isSubmitted && errors.description && (
                      <ErrorText className='w-full'>{errors.description.message}</ErrorText>
                    )}
                  </div>
                </div>

                <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                  {!isClientUser && (
                    <FieldRow icon={RiUserLine} label='Assignee' required>
                      <Controller
                        name='assign_to'
                        control={control}
                        render={({ field }) => {
                          const fieldValue = Array.isArray(field.value)
                            ? field.value
                            : field.value
                              ? [field.value]
                              : [];
                          return (
                            <AssigneeMultiSelect
                              value={fieldValue}
                              onChange={(values) => field.onChange(values.length > 0 ? values : '')}
                              disabled={disabled || isSubmitting}
                              placeholder='Select'
                              size='xsmall'
                              hasError={isSubmitted && Boolean(errors.assign_to)}
                              internalOnly={watchedTicketType === 'Internal ticket'}
                            />
                          );
                        }}
                      />
                      {isSubmitted && errors.assign_to && (
                        <ErrorText className='w-full'>{errors.assign_to.message}</ErrorText>
                      )}
                    </FieldRow>
                  )}

                  {!isClientUser && (
                    <FieldRow icon={RiCalendarLine} label='Due Date' required>
                      <Controller
                        name='due_date'
                        control={control}
                        render={({ field }) => {
                          // parseToDate handles strings (YYYY-MM-DD), timestamps, Date objects, etc.
                          const dateValue = field.value ? parseToDate(field.value) : undefined;

                          return (
                            <Datepicker
                              value={dateValue}
                              onChange={(date) => {
                                // Format date using date-fns - accepts Date objects directly
                                field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                              }}
                              disabled={disabled || isSubmitting}
                              placeholder='Select a date'
                              hasError={isSubmitted && Boolean(errors.due_date)}
                              size='xsmall'
                              // min={new Date()}
                            />
                          );
                        }}
                      />
                      {isSubmitted && errors.due_date && (
                        <ErrorText className='w-full'>{errors.due_date.message}</ErrorText>
                      )}
                    </FieldRow>
                  )}

                  {!isClientUser && (
                    <FieldRow icon={RiFlagLine} label='Priority' required>
                      <Controller
                        name='priority'
                        control={control}
                        render={({ field }) => (
                          <Select.Root
                            variant='borderless'
                            hasError={isSubmitted && Boolean(errors.priority)}
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={disabled || isSubmitting || dropdownData.status === 'loading'}
                            size='xsmall'
                          >
                            <Select.Trigger id='priority'>
                              <Select.Value placeholder='Select'>
                                <Badge.Root
                                  variant='light'
                                  color={
                                    PRIORITY_COLORS[String(field.value || '').toLowerCase()] ||
                                    'gray'
                                  }
                                  className='text-nowrap'
                                >
                                  {field.value}
                                </Badge.Root>
                              </Select.Value>
                            </Select.Trigger>
                            <Select.Content>
                              {currentPriorityOptions.map((option) => (
                                <Select.Item key={option.value} value={option.value}>
                                  <Badge.Root
                                    variant='light'
                                    color={
                                      PRIORITY_COLORS[String(option.value || '').toLowerCase()] ||
                                      'gray'
                                    }
                                    className='text-nowrap'
                                  >
                                    {option.value}
                                  </Badge.Root>
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        )}
                      />
                      {isSubmitted && errors.priority && (
                        <ErrorText className='w-full'>{errors.priority.message}</ErrorText>
                      )}
                    </FieldRow>
                  )}

                  <FieldRow icon={RiBuilding2Line} label='Center' required>
                    <Controller
                      name='center'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          id='center'
                          variant='borderless'
                          size='xsmall'
                          showArrow
                          matchTriggerWidth
                          isolateSearchKeyboard
                          contentClassName='z-[600]'
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          options={currentCenterOptions}
                          hasError={isSubmitted && Boolean(errors.center)}
                          disabled={
                            disabled ||
                            isSubmitting ||
                            dropdownData.status === 'loading' ||
                            (initialClientId && clientCentersLoading) ||
                            Boolean(initialCenter)
                          }
                          placeholder='Select'
                          searchPlaceholder='Search centers...'
                          emptyMessage={
                            dropdownData.status === 'loading' ||
                            (initialClientId && clientCentersLoading)
                              ? 'Loading...'
                              : 'No centers available'
                          }
                          noResultsMessage='No centers found'
                          triggerClassName='w-full min-w-0'
                        />
                      )}
                    />
                    {isSubmitted && errors.center && (
                      <ErrorText className='w-full'>{errors.center.message}</ErrorText>
                    )}
                  </FieldRow>

                  {isClientUser && isClientTicket && renderClientTicketPeopleFields()}

                  <FieldRow layout={true} icon={RiBuilding2Line} label='Floor'>
                    <div className='flex w-full min-w-0 items-center gap-1'>
                      <Controller
                        name='floor_zone'
                        control={control}
                        render={({ field }) => (
                          <div className='w-full flex items-center gap-1'>
                            <Select.Root
                              variant='borderless'
                              hasError={isSubmitted && Boolean(errors.floor_zone)}
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={
                                disabled ||
                                isSubmitting ||
                                !watchedCenter ||
                                floors.status === 'loading'
                              }
                              size='xsmall'
                              className='min-w-0 flex-1'
                            >
                              <Select.Trigger id='floor_zone'>
                                <Select.Value placeholder='Select' />
                              </Select.Trigger>
                              <Select.Content>
                                {currentFloorOptions.map((option) => (
                                  <Select.Item key={option.value} value={option.value}>
                                    {option.label}
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select.Root>
                          </div>
                        )}
                      />
                      <CompactButton.Root
                        type='button'
                        variant='stroke'
                        size='large'
                        aria-label='View floor layout'
                        title='View floor layout'
                        disabled={disabled || isSubmitting || !canOpenLayoutPanel}
                        onClick={handleOpenLayoutPanel}
                        className='shrink-0'
                      >
                        <CompactButton.Icon as={RiLayoutMasonryLine} />
                      </CompactButton.Root>
                    </div>
                    {isSubmitted && errors.floor_zone && (
                      <ErrorText className='w-full'>{errors.floor_zone.message}</ErrorText>
                    )}
                  </FieldRow>

                  {/* {watchedTicketType === 'Client ticket' && (
                        <FieldRow icon={RiPriceTag3Line} label='Client Comments' alignTop>
                          <Controller
                            name='client_comments'
                            control={control}
                            render={({ field }) => (
                              <Textarea.Root
                                {...field}
                                id='client_comments'
                                hasError={isSubmitted && Boolean(errors.client_comments)}
                                placeholder='Type here...'
                                disabled={disabled || isSubmitting}
                                maxLength={200}
                                variant='borderless'
                                simple
                                className='field-sizing-content'
                                size='xsmall'
                              >
                                {/* <Textarea.CharCounter
                                current={field.value?.length || 0}
                                max={200}
                                className=''
                              /> */}
                  {/* </Textarea.Root>
                            )}
                          />
                        </FieldRow>
                      )} */}

                  {/* <FieldRow icon={RiPriceTag3Line} label='Internal Comments' alignTop>
                        <Controller
                          name='internal_comments'
                          control={control}
                          render={({ field }) => (
                            <Textarea.Root
                              {...field}
                              id='internal_comments'
                              hasError={isSubmitted && Boolean(errors.internal_comments)}
                              placeholder='Type here...'
                              disabled={disabled || isSubmitting}
                              maxLength={200}
                              variant='borderless'
                              simple
                              className='field-sizing-content'
                              size='xsmall'
                            >
                              {/* <Textarea.CharCounter
                              current={field.value?.length || 0}
                              max={200}
                              className=''
                            /> */}
                  {/* </Textarea.Root>
                          )}
                        />
                      </FieldRow> */}

                  {!isClientUser && watchedTicketType === 'Internal ticket' && (
                    <FieldRow icon={RiLayoutGridLine} label='Space'>
                      <Controller
                        name='space'
                        control={control}
                        render={({ field }) => (
                          <Select.Root
                            variant='borderless'
                            hasError={isSubmitted && Boolean(errors.space)}
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={
                              disabled ||
                              isSubmitting ||
                              !watchedCenter ||
                              spaces.status === 'loading'
                            }
                            size='xsmall'
                          >
                            <Select.Trigger id='space'>
                              <Select.Value placeholder='Select' />
                            </Select.Trigger>
                            <Select.Content>
                              {currentSpaceOptions.length > 0 ? (
                                currentSpaceOptions.map((option) => (
                                  <Select.Item key={option.value} value={option.value}>
                                    {option.label}
                                  </Select.Item>
                                ))
                              ) : (
                                <div className='p-2 text-paragraph-sm text-text-sub-600 text-center'>
                                  {!watchedCenter ? 'Select center first' : 'No spaces available'}
                                </div>
                              )}
                            </Select.Content>
                          </Select.Root>
                        )}
                      />
                      {isSubmitted && errors.space && (
                        <ErrorText className='w-full'>{errors.space.message}</ErrorText>
                      )}
                    </FieldRow>
                  )}

                  {!isClientUser && isInternalTicket && (
                    <FieldRow icon={RiUserLine} label='Issue Raised by'>
                      <Controller
                        name='issue_raised_by'
                        control={control}
                        render={({ field }) => {
                          const fieldValue = field.value
                            ? Array.isArray(field.value)
                              ? field.value
                              : [field.value]
                            : [];
                          return (
                            <AssigneeMultiSelect
                              value={fieldValue}
                              onChange={(values) => {
                                const ids = Array.isArray(values) ? values.filter(Boolean) : [];
                                field.onChange(ids[0] || '');
                              }}
                              disabled={
                                disabled || isSubmitting || !watchedCenter || coreTeamMembersLoading
                              }
                              placeholder='Select'
                              size='xsmall'
                              singleSelect
                              hasError={isSubmitted && Boolean(errors.issue_raised_by)}
                              fixedAssigneeOptions={issueRaisedByOptions}
                              fixedAssigneeOptionsLoading={coreTeamMembersLoading}
                            />
                          );
                        }}
                      />
                      {isSubmitted && errors.issue_raised_by && (
                        <ErrorText className='w-full'>{errors.issue_raised_by.message}</ErrorText>
                      )}
                    </FieldRow>
                  )}

                  {!isClientUser && isInternalTicket && (
                    <FieldRow icon={RiUserLine} label='Center Spoc'>
                      <Controller
                        name='center_spoc'
                        control={control}
                        render={({ field }) => {
                          const fieldValue = field.value
                            ? String(field.value)
                                .split(',')
                                .map((value) => value.trim())
                                .filter(Boolean)
                            : [];
                          return (
                            <AssigneeMultiSelect
                              value={fieldValue}
                              onChange={(values) => {
                                const ids = Array.isArray(values) ? values.filter(Boolean) : [];
                                field.onChange(ids.length > 0 ? ids.join(',') : '');
                              }}
                              disabled={
                                disabled ||
                                isSubmitting ||
                                !watchedCenter ||
                                centerSpocMembersLoading
                              }
                              placeholder='Select'
                              size='xsmall'
                              hasError={isSubmitted && Boolean(errors.center_spoc)}
                              fixedAssigneeOptions={centerSpocAssigneeOptions}
                              fixedAssigneeOptionsLoading={centerSpocMembersLoading}
                            />
                          );
                        }}
                      />
                      {isSubmitted && errors.center_spoc && (
                        <ErrorText className='w-full'>{errors.center_spoc.message}</ErrorText>
                      )}
                    </FieldRow>
                  )}

                  {isClientUser && (
                    <>
                      <FieldRow icon={RiBuilding2Line} label='Floor'>
                        <div className='flex w-full min-w-0 items-center gap-1'>
                          <Controller
                            name='floor_zone'
                            control={control}
                            render={({ field }) => (
                              <Select.Root
                                variant='borderless'
                                hasError={isSubmitted && Boolean(errors.floor_zone)}
                                value={field.value}
                                onValueChange={field.onChange}
                                disabled={
                                  disabled ||
                                  isSubmitting ||
                                  !watchedCenter ||
                                  floors.status === 'loading'
                                }
                                size='xsmall'
                                className='min-w-0 flex-1'
                              >
                                <Select.Trigger id='floor_zone'>
                                  <Select.Value placeholder='Select' />
                                </Select.Trigger>
                                <Select.Content>
                                  {currentFloorOptions.map((option) => (
                                    <Select.Item key={option.value} value={option.value}>
                                      {option.label}
                                    </Select.Item>
                                  ))}
                                </Select.Content>
                              </Select.Root>
                            )}
                          />
                          <CompactButton.Root
                            type='button'
                            variant='stroke'
                            size='large'
                            aria-label='View floor layout'
                            title='View floor layout'
                            disabled={disabled || isSubmitting || !canOpenLayoutPanel}
                            onClick={handleOpenLayoutPanel}
                            className='shrink-0'
                          >
                            <CompactButton.Icon as={RiStackshareLine} />
                          </CompactButton.Root>
                        </div>
                        {isSubmitted && errors.floor_zone && (
                          <ErrorText className='w-full'>{errors.floor_zone.message}</ErrorText>
                        )}
                      </FieldRow>

                      {/* <FieldRow icon={RiPriceTag3Line} label='Comment' alignTop>
                      <Controller
                        name='client_comments'
                        control={control}
                        render={({ field }) => (
                          <Textarea.Root
                            {...field}
                            id='client_comments'
                            hasError={isSubmitted && Boolean(errors.client_comments)}
                            placeholder='Type here...'
                            disabled={disabled || isSubmitting}
                            maxLength={200}
                            variant='borderless'
                            simple
                            className='field-sizing-content'
                            size='xsmall'
                          >
                            {/* <Textarea.CharCounter
                                current={field.value?.length || 0}
                                max={200}
                                className=''
                              /> */}
                      {/* </Textarea.Root>
                        )}
                      />
                    </FieldRow> */}
                    </>
                  )}

                  {/* {!isClientUser && ( */}
                  <>
                    <FieldRow icon={RiPriceTag3Line} label='Related/Depended Ticket'>
                      <Controller
                        name='related_ticket'
                        control={control}
                        render={({ field }) => (
                          <Select.Root
                            variant='borderless'
                            value={field.value || ''}
                            onValueChange={field.onChange}
                            onOpenChange={(open_) => {
                              if (!open_) setRelatedTicketSearch('');
                            }}
                            disabled={disabled || isSubmitting || relatedTicketOptionsLoading}
                            size='xsmall'
                          >
                            <Select.Trigger id='related_ticket'>
                              <Select.Value placeholder='Select ticket'>
                                {field.value &&
                                  relatedTicketOptions.find(
                                    (option) => option.value === field.value,
                                  )?.label}
                              </Select.Value>
                            </Select.Trigger>
                            <Select.Content layout='searchable'>
                              <div className='pb-2'>
                                <Input.Root variant='default' size='xsmall'>
                                  <Input.Wrapper>
                                    <Input.Input
                                      placeholder='Search ticket title'
                                      value={relatedTicketSearch}
                                      onChange={(e) => setRelatedTicketSearch(e.target.value)}
                                      onKeyDown={(e) => e.stopPropagation()}
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                              </div>
                              <div className='max-h-64 overflow-y-auto'>
                                {filteredRelatedTicketOptions.length > 0 ? (
                                  filteredRelatedTicketOptions.map((option) => (
                                    <Select.Item key={option.value} value={option.value}>
                                      {option.label}
                                    </Select.Item>
                                  ))
                                ) : (
                                  <div className='px-2 py-1 text-paragraph-sm text-text-sub-600'>
                                    No tickets found
                                  </div>
                                )}
                              </div>
                            </Select.Content>
                          </Select.Root>
                        )}
                      />
                    </FieldRow>

                    <FieldRow icon={RiPriceTag3Line} label='Category' required>
                      <TicketCategorySelect
                        category={watchedCategory}
                        subCategory={watchedSubCategory}
                        onChange={handleTicketCategoryChange}
                        hasError={
                          isSubmitted && (Boolean(errors.category) || Boolean(errors.sub_category))
                        }
                        disabled={disabled || isSubmitting}
                      />
                      {isSubmitted && (errors.category || errors.sub_category) && (
                        <ErrorText className='w-full'>
                          {[errors.category?.message, errors.sub_category?.message]
                            .filter(Boolean)
                            .filter((message, index, all) => all.indexOf(message) === index)
                            .join(' · ')}
                        </ErrorText>
                      )}
                    </FieldRow>
                  </>
                  {/* )} */}
                  {(watchedTicketType === 'Client ticket' || initialClientId) && !isClientUser && (
                    <>
                      <FieldRow icon={RiPriceTag3Line} label='Client Name' required>
                        <Controller
                          name='customer'
                          control={control}
                          render={({ field }) => (
                            <Select.Root
                              variant='borderless'
                              hasError={isSubmitted && Boolean(errors.customer)}
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={
                                disabled ||
                                isSubmitting ||
                                dropdownData.status === 'loading' ||
                                initialClientId !== null
                              }
                              size='xsmall'
                            >
                              <Select.Trigger id='customer'>
                                <Select.Value placeholder='Select'>
                                  {field.value &&
                                    currentClientOptions.find((opt) => opt.value === field.value)
                                      ?.label}
                                </Select.Value>
                              </Select.Trigger>
                              <Select.Content
                                enableVirtualization
                                searchMode='internal'
                                searchPlaceholder='Search client'
                              >
                                {currentClientOptions.map((option) => (
                                  <Select.Item key={option.value} value={option.value}>
                                    {option.label}
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select.Root>
                          )}
                        />
                        {isSubmitted && errors.customer && (
                          <ErrorText className='w-full'>{errors.customer.message}</ErrorText>
                        )}
                      </FieldRow>

                      {!isClientUser && isClientTicket && renderClientTicketPeopleFields()}

                      <FieldRow icon={RiPriceTag3Line} label='Visible to Client'>
                        <div className='pl-1.5'>
                          <Controller
                            name='visible_to_client'
                            control={control}
                            render={({ field }) => (
                              <Switch.Root
                                id='visible_to_client'
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={disabled || isSubmitting}
                              />
                            )}
                          />
                        </div>
                      </FieldRow>
                    </>
                  )}
                  {isIncidentTicket && (
                    <>
                      <FieldRow icon={RiCalendarLine} label='Incident Date & Time'>
                        <Controller
                          name='incident_datetime'
                          control={control}
                          render={({ field }) => (
                            <DateTimePicker
                              value={field.value ? parseToDate(field.value) : undefined}
                              onChange={(date) =>
                                field.onChange(date ? format(date, 'yyyy-MM-dd HH:mm:ss') : '')
                              }
                              placeholder='Select incident date & time'
                              hasError={isSubmitted && Boolean(errors.incident_datetime)}
                              disabled={disabled || isSubmitting}
                              mode='date_time'
                              variant='borderless'
                              className='w-full'
                            />
                          )}
                        />
                        {isSubmitted && errors.incident_datetime && (
                          <ErrorText className='w-full'>
                            {errors.incident_datetime.message}
                          </ErrorText>
                        )}
                      </FieldRow>

                      <FieldRow icon={RiPriceTag3Line} label='Area of Incident'>
                        <Controller
                          name='incident_area'
                          control={control}
                          render={({ field }) => (
                            <Input.Root
                              className='w-full'
                              variant='borderless'
                              hasError={isSubmitted && Boolean(errors.incident_area)}
                            >
                              <Input.Wrapper>
                                <Input.Input
                                  placeholder='Enter area of incident'
                                  value={field.value || ''}
                                  onChange={field.onChange}
                                  disabled={disabled || isSubmitting}
                                />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                        {isSubmitted && errors.incident_area && (
                          <ErrorText className='w-full'>{errors.incident_area.message}</ErrorText>
                        )}
                      </FieldRow>

                      <FieldRow icon={RiPriceTag3Line} label='Department'>
                        <Controller
                          name='incident_department'
                          control={control}
                          render={({ field }) => (
                            <Select.Root
                              variant='borderless'
                              hasError={isSubmitted && Boolean(errors.incident_department)}
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              disabled={disabled || isSubmitting}
                              size='xsmall'
                            >
                              <Select.Trigger id='incident_department' className='w-full'>
                                <Select.Value placeholder='Select' />
                              </Select.Trigger>
                              <Select.Content>
                                {INCIDENT_DEPARTMENT_OPTIONS.map((option) => (
                                  <Select.Item key={option} value={option}>
                                    {option}
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select.Root>
                          )}
                        />
                        {isSubmitted && errors.incident_department && (
                          <ErrorText className='w-full'>
                            {errors.incident_department.message}
                          </ErrorText>
                        )}
                      </FieldRow>

                      <FieldRow icon={RiPriceTag3Line} label='Type of Incident'>
                        <Controller
                          name='incident_type'
                          control={control}
                          render={({ field }) => (
                            <Input.Root
                              className='w-full'
                              variant='borderless'
                              hasError={isSubmitted && Boolean(errors.incident_type)}
                            >
                              <Input.Wrapper>
                                <Input.Input
                                  placeholder='Enter type of incident'
                                  value={field.value || ''}
                                  onChange={field.onChange}
                                  disabled={disabled || isSubmitting}
                                />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                        {isSubmitted && errors.incident_type && (
                          <ErrorText className='w-full'>{errors.incident_type.message}</ErrorText>
                        )}
                      </FieldRow>

                      <FieldRow icon={RiFlagLine} label='Sensitivity Level'>
                        <Controller
                          name='incident_sensitivity'
                          control={control}
                          render={({ field }) => (
                            <Select.Root
                              variant='borderless'
                              hasError={isSubmitted && Boolean(errors.incident_sensitivity)}
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              disabled={disabled || isSubmitting}
                              size='xsmall'
                            >
                              <Select.Trigger id='incident_sensitivity' className='w-full'>
                                <Select.Value placeholder='Select' />
                              </Select.Trigger>
                              <Select.Content>
                                {INCIDENT_SENSITIVITY_OPTIONS.map((option) => (
                                  <Select.Item key={option} value={option}>
                                    {option}
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select.Root>
                          )}
                        />
                        {isSubmitted && errors.incident_sensitivity && (
                          <ErrorText className='w-full'>
                            {errors.incident_sensitivity.message}
                          </ErrorText>
                        )}
                      </FieldRow>

                      <FieldRow icon={RiPriceTag3Line} label='Incident Reported Via'>
                        <Controller
                          name='incident_reported_via'
                          control={control}
                          render={({ field }) => (
                            <Input.Root
                              variant='borderless'
                              className='w-full'
                              hasError={isSubmitted && Boolean(errors.incident_reported_via)}
                            >
                              <Input.Wrapper>
                                <Input.Input
                                  placeholder='Enter source'
                                  value={field.value || ''}
                                  onChange={field.onChange}
                                  disabled={disabled || isSubmitting}
                                />
                              </Input.Wrapper>
                            </Input.Root>
                          )}
                        />
                        {isSubmitted && errors.incident_reported_via && (
                          <ErrorText className='w-full'>
                            {errors.incident_reported_via.message}
                          </ErrorText>
                        )}
                      </FieldRow>

                      <FieldRow icon={RiPriceTag3Line} label='Management Informed'>
                        <Controller
                          name='management_informed'
                          control={control}
                          render={({ field }) => (
                            <Select.Root
                              variant='borderless'
                              hasError={isSubmitted && Boolean(errors.management_informed)}
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              disabled={disabled || isSubmitting}
                              size='xsmall'
                            >
                              <Select.Trigger id='management_informed' className='w-full'>
                                <Select.Value placeholder='Select' />
                              </Select.Trigger>
                              <Select.Content>
                                {YES_NO_OPTIONS.map((option) => (
                                  <Select.Item key={option} value={option}>
                                    {option}
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select.Root>
                          )}
                        />
                        {isSubmitted && errors.management_informed && (
                          <ErrorText className='w-full'>
                            {errors.management_informed.message}
                          </ErrorText>
                        )}
                      </FieldRow>

                      <FieldRow icon={RiPriceTag3Line} label='Financial Impact'>
                        <div className='pl-1.5'>
                          <Controller
                            name='financial_impact'
                            control={control}
                            render={({ field }) => (
                              <Switch.Root
                                id='financial_impact'
                                checked={Boolean(field.value)}
                                onCheckedChange={field.onChange}
                                disabled={disabled || isSubmitting}
                              />
                            )}
                          />
                        </div>
                        {isSubmitted && errors.financial_impact && (
                          <ErrorText className='w-full'>
                            {errors.financial_impact.message}
                          </ErrorText>
                        )}
                      </FieldRow>
                      <FieldRow icon={RiPriceTag3Line} label='Information Loss'>
                        <Controller
                          name='incident_data_loss'
                          control={control}
                          render={({ field }) => (
                            <Select.Root
                              variant='borderless'
                              hasError={isSubmitted && Boolean(errors.incident_data_loss)}
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              disabled={disabled || isSubmitting}
                              size='xsmall'
                            >
                              <Select.Trigger id='incident_data_loss' className='w-full'>
                                <Select.Value placeholder='Select' />
                              </Select.Trigger>
                              <Select.Content>
                                {INCIDENT_DATA_LOSS_OPTIONS.map((option) => (
                                  <Select.Item key={option} value={option}>
                                    {option}
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select.Root>
                          )}
                        />
                        {isSubmitted && errors.incident_data_loss && (
                          <ErrorText className='w-full'>
                            {errors.incident_data_loss.message}
                          </ErrorText>
                        )}
                      </FieldRow>
                      <FieldRow icon={RiStickyNoteLine} label='Damage Occurred'>
                        <Controller
                          name='incident_injuries_damage'
                          control={control}
                          render={({ field }) => (
                            <Textarea.Root
                              variant='borderless'
                              simple
                              rows={2}
                              className='w-full'
                              placeholder='Add description'
                              value={field.value || ''}
                              onChange={field.onChange}
                              disabled={disabled || isSubmitting}
                            />
                          )}
                        />
                      </FieldRow>
                    </>
                  )}
                  <FieldRow icon={RiToolsLine} label='Requires R&M'>
                    <div className='pl-1.5'>
                      <Controller
                        name='requires_rm'
                        control={control}
                        render={({ field }) => (
                          <Switch.Root
                            id='requires_rm'
                            checked={Boolean(field.value)}
                            onCheckedChange={field.onChange}
                            disabled={disabled || isSubmitting}
                          />
                        )}
                      />
                    </div>
                  </FieldRow>
                  {watchedRequiresRm && (
                    <FieldRow icon={RiToolsLine} label='R&M Impact' required>
                      <Controller
                        name='rm_impact'
                        control={control}
                        render={({ field }) => (
                          <Input.Root
                            className='w-full'
                            variant='borderless'
                            hasError={isSubmitted && Boolean(errors.rm_impact)}
                          >
                            <Input.Wrapper>
                              <Input.Input
                                id='rm_impact'
                                placeholder='Enter amount'
                                inputMode='decimal'
                                value={field.value ?? ''}
                                onChange={field.onChange}
                                disabled={disabled || isSubmitting}
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        )}
                      />
                      {isSubmitted && errors.rm_impact && (
                        <ErrorText className='w-full'>{errors.rm_impact.message}</ErrorText>
                      )}
                    </FieldRow>
                  )}
                </div>

                {isIncidentTicket && (
                  <div className='flex flex-col gap-4'>
                    <div>
                      {isIncidentCorrectiveOpen ||
                      String(watchedIncidentCorrective || '').trim() ? (
                        <Controller
                          name='incident_corrective_action'
                          control={control}
                          render={({ field }) => (
                            <Textarea.Root
                              {...field}
                              id='incident_corrective_action'
                              variant='borderless'
                              simple
                              rows={4}
                              className='min-h-[116px]'
                              placeholder='Corrective Action Token'
                              value={field.value || ''}
                              disabled={disabled || isSubmitting}
                            />
                          )}
                        />
                      ) : (
                        <button
                          type='button'
                          onClick={() => setIsIncidentCorrectiveOpen(true)}
                          className='flex gap-1 w-full items-center border border-transparent hover:border-stroke-sub-300 cursor-pointer px-2 py-1.5 rounded-10'
                        >
                          <RiStickyNoteLine className='size-5 text-text-soft-400' />
                          <span className='text-paragraph-md text-text-soft-400'>
                            Corrective Action Taken
                          </span>
                        </button>
                      )}
                    </div>
                    <div>
                      {isIncidentRootCauseOpen || String(watchedIncidentRootCause || '').trim() ? (
                        <Controller
                          name='incident_root_cause_analysis'
                          control={control}
                          render={({ field }) => (
                            <Textarea.Root
                              {...field}
                              id='incident_root_cause_analysis'
                              variant='borderless'
                              simple
                              rows={4}
                              className='min-h-[116px]'
                              placeholder='Root Cause Analysis Description'
                              value={field.value || ''}
                              disabled={disabled || isSubmitting}
                            />
                          )}
                        />
                      ) : (
                        <button
                          type='button'
                          onClick={() => setIsIncidentRootCauseOpen(true)}
                          className='flex gap-1 w-full items-center border border-transparent hover:border-stroke-sub-300 cursor-pointer px-2 py-1.5 rounded-10'
                        >
                          <RiStickyNoteLine className='size-5 text-text-soft-400' />
                          <span className='text-paragraph-md text-text-soft-400'>
                            Root Cause Analysis
                          </span>
                        </button>
                      )}
                    </div>
                    <div>
                      {isIncidentPreventiveOpen ||
                      String(watchedIncidentPreventive || '').trim() ? (
                        <Controller
                          name='incident_preventive_action'
                          control={control}
                          render={({ field }) => (
                            <Textarea.Root
                              {...field}
                              id='incident_preventive_action'
                              variant='borderless'
                              simple
                              rows={4}
                              className='min-h-[116px]'
                              placeholder='Preventive Action Proposed description'
                              value={field.value || ''}
                              disabled={disabled || isSubmitting}
                            />
                          )}
                        />
                      ) : (
                        <button
                          type='button'
                          onClick={() => setIsIncidentPreventiveOpen(true)}
                          className='flex gap-1 w-full items-center border border-transparent hover:border-stroke-sub-300 cursor-pointer px-2 py-1.5 rounded-10'
                        >
                          <RiStickyNoteLine className='size-5 text-text-soft-400' />
                          <span className='text-paragraph-md text-text-soft-400'>
                            Preventive Action Proposed
                          </span>
                        </button>
                      )}
                    </div>
                    <div>
                      {isIncidentClosureOpen || String(watchedIncidentClosure || '').trim() ? (
                        <Controller
                          name='incident_closure_remarks'
                          control={control}
                          render={({ field }) => (
                            <Textarea.Root
                              {...field}
                              id='incident_closure_remarks'
                              variant='borderless'
                              simple
                              rows={4}
                              className='min-h-[116px]'
                              placeholder='Closure Remarks description'
                              value={field.value || ''}
                              disabled={disabled || isSubmitting}
                            />
                          )}
                        />
                      ) : (
                        <button
                          type='button'
                          onClick={() => setIsIncidentClosureOpen(true)}
                          className='flex gap-1 w-full items-center border border-transparent hover:border-stroke-sub-300 cursor-pointer px-2 py-1.5 rounded-10'
                        >
                          <RiStickyNoteLine className='size-5 text-text-soft-400' />
                          <span className='text-paragraph-md text-text-soft-400'>
                            Closure Remarks
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                <div className='flex flex-col gap-2'>
                  <div className='flex items-center justify-between'>
                    <Label.Root className='flex items-center gap-2'>
                      <RiAttachment2 className='size-5 text-text-sub-500' />
                      <span className='text-label-sm text-text-sub-500'>Attachments</span>
                    </Label.Root>
                    {attachments.length > 0 && (
                      <Button.Root
                        type='button'
                        onClick={() => document.querySelector('#file-upload').click()}
                        disabled={disabled || isSubmitting}
                        variant='neutral'
                        mode='stroke'
                        size='xsmall'
                      >
                        Upload Files
                      </Button.Root>
                    )}
                  </div>

                  {attachments.length > 0 && (
                    <div className='space-y-4 mb-4'>
                      {attachments.map((file) => (
                        <div
                          key={file.id}
                          className='bg-bg-white-0 border border-stroke-soft-200 rounded-[12px]'
                        >
                          <div className='flex flex-col gap-4 px-[14px] pr-4 py-3'>
                            <div className='flex gap-3 items-center w-full'>
                              {/* File Icon with Format Badge */}
                              <FileFormatIcon.Root
                                format={getFileExtension(file.name) || 'FILE'}
                                size='small'
                                color='red'
                              />

                              {/* File Details */}
                              <div className='flex flex-col gap-[6px] grow items-start justify-center min-w-0'>
                                <p className='label-small text-text-main-900 truncate w-full'>
                                  {file.name}
                                </p>
                                <p className='text-paragraph-xs text-text-sub-500'>
                                  {formatFileSize(file.size)}
                                </p>
                              </div>

                              {/* Delete Button */}
                              <CompactButton.Root
                                variant='ghost'
                                size='large'
                                onClick={() => removeAttachment(file.id)}
                                disabled={disabled || isSubmitting}
                                aria-label={`Remove ${file.name}`}
                                className='shrink-0 cursor-pointer'
                              >
                                <CompactButton.Icon as={RiDeleteBinLine} />
                              </CompactButton.Root>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {attachments.length === 0 && (
                    <div className='flex items-start gap-3 rounded-xl border border-dashed border-stroke-sub-300 px-4 py-3'>
                      <RiUploadCloud2Line className='size-6 text-text-sub-500' />
                      <div className='flex flex-1 flex-col gap-1'>
                        <p className='label-small text-text-main-900'>
                          Choose a file or drag & drop.
                        </p>
                        <p className='text-paragraph-xs text-text-soft-400'>
                          All file types, up to 10 MB per file.
                        </p>
                      </div>
                      <Button.Root
                        type='button'
                        onClick={() => document.querySelector('#file-upload').click()}
                        disabled={disabled || isSubmitting}
                        variant='neutral'
                        mode='stroke'
                        size='xsmall'
                      >
                        Browse File
                      </Button.Root>
                    </div>
                  )}
                  <input
                    type='file'
                    multiple
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className='hidden'
                    id='file-upload'
                    disabled={disabled || isSubmitting}
                  />
                  {fileError && (
                    <div className='mt-2'>
                      <ErrorText className='w-full'>{fileError}</ErrorText>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isLayoutPanelOpen ? (
              <div className='flex min-h-0 min-w-0 flex-1 flex-col'>
                <TicketCreateLayoutPanel
                  layoutDetail={layoutDetailState?.data}
                  floorRef={selectedFloorRef}
                  isLoading={layoutDetailState?.isLoading}
                  error={layoutDetailState?.error}
                  onClose={handleCloseLayoutPanel}
                  initialMarkerCoordinate={markerCoordinate}
                  onMarkerCoordinateChange={handleMarkerCoordinateChange}
                  onMarkerSpaceResolved={handleMarkerSpaceResolved}
                  autoSaveMarker
                />
              </div>
            ) : null}
          </div>

          <Drawer.Footer className='sticky bottom-0 z-10 shrink-0 bg-white shadow-[0_-4px_16px_0_rgba(27,28,29,0.06)]'>
            <div className='flex flex-col gap-3 p-6 sm:flex-row sm:justify-end'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                className='w-full sm:w-auto'
                onClick={closeDrawer}
                disabled={isSubmitting}
              >
                Cancel
              </Button.Root>
              <Button.Root
                type='submit'
                className='w-full sm:w-auto'
                // disabled={!isValid || isSubmitting || disabled}
              >
                {isSubmitting ? 'Creating...' : 'Create'}
              </Button.Root>
            </div>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default TicketCreateDrawer;
