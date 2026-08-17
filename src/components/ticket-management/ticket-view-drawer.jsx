import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  RiCloseLine,
  RiPencilLine,
  RiTimeLine,
  RiChat2Line,
  RiMailLine,
  RiUserLine,
  RiCalendarLine,
  RiFlagLine,
  RiBuilding2Line,
  RiMapPin2Line,
  RiPriceTag3Line,
  RiInformationLine,
  RiStickyNoteLine,
  RiAttachment2,
  RiArrowDownSLine,
  RiUploadCloud2Line,
  RiUploadLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiMagicLine,
  RiToolsLine,
  RiLayoutGridLine,
  RiArrowRightSLine,
  RiStackshareLine,
  RiLayoutMasonryFill,
  RiLayoutMasonryLine,
  RiStackLine,
} from 'react-icons/ri';
import * as CompactButton from '@/components/ui/compact-button';
import TicketCreateLayoutPanel from '@/components/ticket-management/ticket-create-layout-panel';
import { clearLayoutDetail, fetchLayoutDetail } from '@/redux/layoutSlice';
import {
  parseTicketMarkerCoordinate,
  readTicketMarkerCoordinateFromTicket,
  resolveFloorRefFromOptions,
  resolveTicketLayoutFloorRef,
  resolveTicketSpaceDisplayName,
  resolveTicketSpaceRef,
} from '@/utils/ticket-layout-marker-utils';

import * as Drawer from '@/components/ui/drawer';
import * as Dropdown from '@/components/ui/dropdown';
import * as Modal from '@/components/ui/modal';
import * as Badge from '@/components/ui/badge';
import * as Select from '@/components/ui/select';
import * as Textarea from '@/components/ui/textarea';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import DotBadge from '@/components/ui/dot-badge';
import * as Switch from '@/components/ui/switch';
import { Datepicker } from '@/components/ui/datepicker';
import { DateTimePicker } from '@/components/ui/datetimepicker';
import TicketComments from '@/components/ticket-management/ticket-comments';
// Lazy load heavy components to improve initial render performance
const EmailThread = React.lazy(() => import('@/components/ticket-management/email-thread'));
import TicketViewDrawerSkeleton from '@/components/ticket-management/ticket-view-drawer-skeleton';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import TicketStatusDropdown from '@/components/ticket-management/ticket-status-dropdown';
import ErrorText from '@/components/ui/error-text';
import { showErrorToast, showSuccessToast, extractErrorMessage } from '@/utils/error-utils';
import { getStatusOptions } from '@/api/dynamic-status';
import { cn } from '@/lib/utils';
import { ticketTypeOptions as fallbackTicketTypeOptions } from '@/schemas/ticket-schema';
import {
  TICKET_MARKER_COORDINATE_FIELD,
  TICKET_TYPE,
  getStatusVariant,
  getTicketFieldValue,
} from '@/components/ticket-management/constants';
import {
  fetchTicketDropdownData,
  fetchCentersForClient,
  fetchSubCategories,
  fetchFloors,
  fetchSpaces,
  fetchRelatedTickets,
  fetchTicketDetail,
  fetchTicketComments,
  selectTicketDropdownData,
  selectSubCategories,
  selectFloors,
  selectSpaces,
  selectTicketDetail,
  selectTicketComments,
  selectRelatedTickets,
  deleteTicketAttachment,
  updateTicketField,
  fetchTicketCoworkerList,
  fetchTicketClientSpocContacts,
  selectTicketCoworkers,
  selectTicketClientSpocContacts,
} from '@/redux/ticketManagementSlice';
import apiClient from '@/api/axios';
import { safeDisplayDateTime, parseToDate, getFirstResponseDuration } from '@/utils/date-utils';
import { differenceInSeconds, format } from 'date-fns';
import { isClient, isFacilityManager } from '@/constants/users-constants';
import { useSocket } from '@/hooks/use-socket';
import { useDragAndDrop } from '@/hooks/use-drag-and-drop';
import FieldRow from '@/components/ui/field-row';
import AttachmentList from '@/components/ui/attachment-list';
import { DocumentFollowersPopover } from '@/components/document-subscribe';
import {
  getSubscriptionStatus,
  listDocumentSubscribers,
} from '@/services/document-subscribe-service';

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

/** Raised By: store User/Coworker email only. */
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

// Fallback priority options (used when API doesn't return data)
const FALLBACK_PRIORITY_OPTIONS = [
  { label: 'Low', value: 'Low', color: 'green' },
  { label: 'Medium', value: 'Medium', color: 'purple' },
  { label: 'High', value: 'High', color: 'orange' },
  { label: 'Critical', value: 'Critical', color: 'red' },
];

const SLA_BREACH_REASONS = [
  { label: 'Stuck with Client', value: 'Stuck with Client' },
  { label: 'Stuck with Team', value: 'Stuck with Team' },
  { label: 'Stuck with Vendor', value: 'Stuck with Vendor' },
  { label: 'Stuck with Management', value: 'Stuck with Management' },
];

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

// Get priority color mapping - works with dynamic options
const getPriorityColor = (priority, priorityOptions = []) => {
  if (!priority) return 'gray';

  // Try to find in provided options first
  const option = priorityOptions.find(
    (opt) => opt.value?.toLowerCase() === priority?.toLowerCase(),
  );
  if (option?.color) {
    return option.color;
  }

  // Fallback to static mapping
  const normalized = priority.toLowerCase();
  return (
    {
      low: 'green',
      medium: 'purple',
      high: 'orange',
      critical: 'red',
    }[normalized] || 'gray'
  );
};

const IMAGE_EXTENSIONS = new Set(['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'SVG', 'BMP']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes

const getAttachmentExtension = (fileName) => {
  if (!fileName || typeof fileName !== 'string') return '';
  const segments = fileName.split('.');
  if (segments.length < 2) return '';
  return segments.at(-1).toUpperCase();
};

const normalizeTicketAttachments = (ticket) => {
  if (!ticket) return [];

  const attachmentsSource =
    ticket.attachments ||
    ticket._attachments ||
    ticket.attachments_info ||
    ticket.files ||
    ticket.file_attachments ||
    [];

  if (!Array.isArray(attachmentsSource)) return [];

  return attachmentsSource
    .map((attachment, index) => {
      const fileName =
        attachment?.file_name ||
        attachment?.filename ||
        attachment?.file ||
        attachment?.title ||
        attachment?.name;
      if (!fileName) return null;

      const extension = getAttachmentExtension(fileName);
      const fileUrl =
        attachment?.file_url || attachment?.url || attachment?.file || attachment?.fileUrl;
      const size =
        attachment?.file_size ||
        attachment?.size ||
        attachment?.file_size_bytes ||
        attachment?.content_length ||
        attachment?.bytes;
      const createdAt =
        attachment?.creation ||
        attachment?.created_at ||
        attachment?.modified ||
        attachment?.timestamp;

      return {
        id: attachment?.name || attachment?.id || `${fileName}-${index}`,
        fileName,
        fileUrl,
        size,
        createdAt,
        extension,
        isImage: IMAGE_EXTENSIONS.has(extension),
        childRowId: attachment?.name || attachment?.id, // For delete functionality
      };
    })
    .filter(Boolean);
};

// Helper function to format seconds to HH:MM:SS
const formatSecondsToTime = (totalSeconds) => {
  if (totalSeconds < 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// SLA Timer component
const SLATimer = React.memo(({ responseBy, firstRespondedOn, creation, statusCategory }) => {
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [isBreached, setIsBreached] = useState(false);
  const [fulfilledText, setFulfilledText] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    // If status_category is "Resolved", stop timer
    if (statusCategory === 'Resolved') {
      setCurrentSeconds(0);
      setIsBreached(false);
      setFulfilledText(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // If first_responded_on exists, calculate fulfilled time
    if (firstRespondedOn) {
      const firstRespondedDate = parseToDate(firstRespondedOn);
      const creationDate = parseToDate(creation);

      if (firstRespondedDate) {
        const durationLabel = getFirstResponseDuration(firstRespondedOn, creation);
        const formattedLabel = durationLabel
          ? durationLabel.replace(/^resolved/i, 'Fulfilled').replace(/mins?/i, 'm')
          : 'Fulfilled';
        setFulfilledText(formattedLabel);

        // Check if breached: first_responded_on after response_by
        if (responseBy) {
          const responseDate = parseToDate(responseBy);
          if (responseDate && firstRespondedDate > responseDate) {
            setIsBreached(true);
          } else {
            setIsBreached(false);
          }
        } else {
          setIsBreached(false);
        }

        setCurrentSeconds(0);

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }
    }

    // If no first_responded_on, show countdown timer
    if (!responseBy) {
      setCurrentSeconds(0);
      setIsBreached(false);
      setFulfilledText(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const calculateTimeRemaining = () => {
      const responseDate = parseToDate(responseBy);
      if (!responseDate) {
        setCurrentSeconds(0);
        setIsBreached(false);
        setFulfilledText(null);
        return;
      }

      const now = new Date();
      const secondsRemaining = differenceInSeconds(responseDate, now);

      if (secondsRemaining <= 0) {
        setIsBreached(true);
        setCurrentSeconds(0);
        setFulfilledText(null);
      } else {
        setIsBreached(false);
        setCurrentSeconds(secondsRemaining);
        setFulfilledText(null);
      }
    };

    // Calculate initial time
    calculateTimeRemaining();

    // If status_category is "Paused", don't start the interval (timer is paused)
    if (statusCategory === 'Paused') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // If status_category is "Open" or undefined, continue timer
    // Update every second
    intervalRef.current = setInterval(() => {
      calculateTimeRemaining();
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [responseBy, firstRespondedOn, creation, statusCategory]);

  if (!responseBy) return null;

  // If status_category is "Resolved", don't show timer
  if (statusCategory === 'Resolved') {
    return null;
  }

  // Show fulfilled status if first_responded_on exists
  if (fulfilledText) {
    return (
      <Badge.Root variant='filled' color='green' size='medium'>
        <Badge.Icon as={RiTimeLine} />
        <span>{fulfilledText}</span>
      </Badge.Root>
    );
  }

  if (isBreached) {
    return (
      <Badge.Root variant='filled' color='red' size='medium'>
        <Badge.Icon as={RiTimeLine} />
        <span>Breached</span>
      </Badge.Root>
    );
  }

  // normal case gray
  // timer with in 1 hours yellow
  // timer with in 30 min red
  const calculatePillColor = (currentSeconds) => {
    if (currentSeconds <= 1800) {
      return 'red';
    }
    if (currentSeconds <= 3600) {
      return 'yellow';
    }
    return 'gray';
  };

  const pillColor = calculatePillColor(currentSeconds);
  const isPaused = statusCategory === 'Paused';

  return (
    <Badge.Root
      variant='light'
      color={pillColor}
      size='medium'
      className='flex items-center rounded-md overflow-hidden p-0'
      style={{
        height: 'auto',
      }}
    >
      <div className='flex items-center gap-1 pl-1 pr-2'>
        <RiTimeLine size={16} />
        <span className='text-paragraph-sm '>{isPaused ? 'SLA Timer (Paused)' : 'SLA Timer'}</span>
      </div>
      <div className='flex items-center justify-center px-2 py-0.5 border-l border-current/20'>
        <span className='text-paragraph-sm tabular-nums'>
          {formatSecondsToTime(currentSeconds)}
        </span>
      </div>
    </Badge.Root>
  );
});

SLATimer.displayName = 'SLATimer';

// Helper to get field value with fallback
const PEOPLE_ID_FIELDS = new Set(['center_spoc', 'client_spoc']);

const mergeTicketPeopleOptions = (baseOptions = [], savedOptions = []) => {
  const merged = [...baseOptions];
  const seen = new Set(merged.map((option) => String(option?.value ?? '').trim()).filter(Boolean));

  savedOptions.forEach((option) => {
    const value = String(option?.value ?? '').trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    merged.push(option);
  });

  return merged;
};

const getFieldValue = (ticket, localChanges, fieldName) => {
  // Zone special case must be handled before generic localChanges precedence.
  if (fieldName === 'zone') {
    if (localChanges.zone !== undefined && localChanges.zone !== null) {
      return localChanges.zone;
    }
    return (
      ticket?.zone ||
      ticket?.zone_name ||
      ticket?.custom_zone ||
      getTicketFieldValue(ticket, 'zone') ||
      ''
    );
  }

  // Priority: local changes > transformed ticket data > raw ticket data via helper
  if (localChanges[fieldName] !== undefined && localChanges[fieldName] !== null) {
    return localChanges[fieldName];
  }

  // People fields always resolve stored ids from custom_* columns, not display labels.
  if (PEOPLE_ID_FIELDS.has(fieldName)) {
    return getTicketFieldValue(ticket, fieldName) || '';
  }

  // Space select uses link id (`custom_space`), not display name (`custom_space_name`)
  if (fieldName === 'space') {
    const spaceId = resolveTicketSpaceRef(ticket);
    if (spaceId) return spaceId;
    return '';
  }

  if (fieldName === 'floor_zone' || fieldName === 'floor') {
    if (localChanges.floor_zone !== undefined && localChanges.floor_zone !== null) {
      return localChanges.floor_zone;
    }
    if (localChanges.floor !== undefined && localChanges.floor !== null) {
      return localChanges.floor;
    }
    return getTicketFieldValue(ticket, 'floor_zone') || '';
  }

  if (fieldName === TICKET_MARKER_COORDINATE_FIELD) {
    if (
      localChanges[TICKET_MARKER_COORDINATE_FIELD] !== undefined &&
      localChanges[TICKET_MARKER_COORDINATE_FIELD] !== null
    ) {
      return localChanges[TICKET_MARKER_COORDINATE_FIELD];
    }
    return readTicketMarkerCoordinateFromTicket(ticket);
  }

  // Special handling for assigned_to: prioritize assignees array from API
  if (fieldName === 'assigned_to') {
    // Check if assignees array exists (from new API)
    if (ticket?.assignees && Array.isArray(ticket.assignees) && ticket.assignees.length > 0) {
      return ticket.assignees;
    }
    // Fall back to getTicketFieldValue which handles _assign and agent fields
    return getTicketFieldValue(ticket, fieldName) || '';
  }

  if (
    ticket?.[fieldName] !== undefined &&
    ticket?.[fieldName] !== null &&
    ticket?.[fieldName] !== ''
  ) {
    return ticket[fieldName];
  }
  return getTicketFieldValue(ticket, fieldName) || '';
};

// Main ticket view drawer component
const TicketViewDrawer = ({
  isOpen = false,
  onClose,
  ticketId = null,
  onPriorityChange,
  onFieldUpdate,
  onNavigatePrevious,
  onNavigateNext,
  hasPrevious = false,
  hasNext = false,
  permissions = {},
  onAddComment,
  onRefreshComments,
  onSendEmail,
  centerFilterClientId = null,
  onDelete,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const dropdownData = useSelector(selectTicketDropdownData);
  const subCategories = useSelector(selectSubCategories);
  const floors = useSelector(selectFloors);
  const spaces = useSelector(selectSpaces);
  const relatedTickets = useSelector(selectRelatedTickets);
  const detail = useSelector(selectTicketDetail);
  const comments = useSelector(selectTicketComments);
  const ticketCoworkers = useSelector(selectTicketCoworkers);
  const ticketClientSpocContacts = useSelector(selectTicketClientSpocContacts);
  const profileData = useSelector((state) => state.profile?.profileData);
  const orgId = profileData?.org_id;
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const roleMap = userSideBarPerm?.data?.message?.role;
  const isClientUser = isClient(roleMap);
  const isFacilityManagerUser = isFacilityManager(roleMap);

  // Get ticket and comments data from Redux
  const ticket = detail.data;
  const commentsData = comments.data || {};

  /** Bumps whenever ticket doc, assignees, attachments, or activity comments change — drives subscriber list refresh */
  const ticketSubscriberSyncKey = useMemo(() => {
    if (!ticket) return '';
    const att = normalizeTicketAttachments(ticket);
    const attIds = att
      .map((x) => String(x.id || x.childRowId || ''))
      .filter(Boolean)
      .sort()
      .join('|');
    const arr = comments.data?.comments;
    const commentsPart =
      !Array.isArray(arr) || arr.length === 0
        ? '0'
        : `${arr.length}:${arr.map((x) => String(x?.name || x?.id || '')).join('|')}`;
    const assignPart =
      Array.isArray(ticket.assignees) && ticket.assignees.length > 0
        ? ticket.assignees
            .map((a) => (typeof a === 'string' ? a : a?.email || a?.name || a?.value || ''))
            .filter(Boolean)
            .sort()
            .join(',')
        : String(getTicketFieldValue(ticket, 'assigned_to') ?? ticket?.assigned_to ?? '');
    return [String(ticket.modified ?? ''), attIds, commentsPart, assignPart].join('::');
  }, [ticket, comments.data]);

  // Memoize ticket matching check to avoid recalculating on every render
  const ticketMatches = useMemo(() => {
    if (!ticket || !ticketId) return false;
    return String(ticket.name || ticket.id || '') === String(ticketId || '');
  }, [ticket?.name, ticket?.id, ticketId]);

  // Determine if we should show loading skeleton
  // Hide skeleton only when: status is 'succeeded' AND ticket exists AND ticket matches ticketId
  const isDataReady = useMemo(() => {
    return detail.status === 'succeeded' && ticket && ticketMatches;
  }, [detail.status, ticket, ticketMatches]);

  const [activeTab, setActiveTab] = useState('comments');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [localChanges, setLocalChanges] = useState({});
  const [isDrawerFullyOpen, setIsDrawerFullyOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [hasLoadedCommentsInitial, setHasLoadedCommentsInitial] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    sub_category: '',
    customer: '',
    floor_zone: '',
  });

  useEffect(() => {
    if (!isDataReady || !ticket) return;
    const floorValue = getTicketFieldValue(ticket, 'floor_zone');
    setFieldErrors((previous) => ({
      ...previous,
      floor_zone: String(floorValue || '').trim() ? '' : 'Floor is required',
    }));
  }, [isDataReady, ticket?.name, ticket?.custom_floor, ticket?.floor_zone, ticket?.floor]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [ticketSubscribers, setTicketSubscribers] = useState([]);
  const [ticketSubscribed, setTicketSubscribed] = useState(false);
  const [ticketSubscribersLoading, setTicketSubscribersLoading] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [clientCenters, setClientCenters] = useState([]);
  const [clientCentersLoading, setClientCentersLoading] = useState(false);
  const [coreTeamMembers, setCoreTeamMembers] = useState([]);
  const [coreTeamMembersLoading, setCoreTeamMembersLoading] = useState(false);
  const [centerSpocMembers, setCenterSpocMembers] = useState([]);
  const [centerSpocMembersLoading, setCenterSpocMembersLoading] = useState(false);
  const [relatedTicketSearch, setRelatedTicketSearch] = useState('');
  const slaBreachReasons = SLA_BREACH_REASONS;
  // Derive breach status from ticket data
  const isSlaBreached = useMemo(() => {
    if (!ticket) return false;
    if (ticket.status_category === 'Resolved') return false;
    if (!ticket.response_by) return false;
    // Breached if: no first response yet AND response_by is in the past
    if (!ticket.first_responded_on) {
      const responseDate = parseToDate(ticket.response_by);
      return responseDate ? new Date() > responseDate : false;
    }
    // Or first response came after deadline
    const responseDate = parseToDate(ticket.response_by);
    const firstRespondedDate = parseToDate(ticket.first_responded_on);
    return responseDate && firstRespondedDate ? firstRespondedDate > responseDate : false;
  }, [ticket]);

  const slaBreachReasonSelected = useMemo(
    () => Boolean(getFieldValue(ticket, localChanges, 'custom_sla_breach_reason')),
    [ticket, localChanges],
  );

  const fileInputRef = useRef(null);
  const leftPanelRef = useRef(null);
  const onFilesDropRef = useRef(null);
  const { dragActive, setDragActive, overlayHeight, messageTop, handleDrag, handleDrop } =
    useDragAndDrop({
      containerRef: leftPanelRef,
      onFilesDrop: (files) => onFilesDropRef.current?.(files),
      triggerDependency: ticket,
    });
  const pendingCategoryRef = useRef({
    mode: null, // 'parent' | null
    category: '',
    sub_category: '',
  });
  const updateQueueRef = useRef(Promise.resolve());
  const latestUpdateIdRef = useRef(0);

  // Refs to track what has been fetched to prevent duplicate calls
  const fetchedSubCategoriesRef = useRef(new Set());
  const fetchedFloorsRef = useRef(new Set());
  const fetchedSpacesRef = useRef(new Set());
  const lastFetchedTicketIdRef = useRef(null);
  const previousTicketIdRef = useRef(null);
  const previousCommentsTicketIdRef = useRef(null);
  const fetchPromiseRef = useRef(null);
  const previousTabRef = useRef(null);

  const refreshTicketSubscribers = useCallback(async () => {
    if (!isOpen) return;
    const name = ticket?.name ?? ticket?.id ?? ticketId;
    if (name == null || name === '') return;
    const ref = String(name);
    setTicketSubscribersLoading(true);
    try {
      const [status, list] = await Promise.all([
        getSubscriptionStatus('HD Ticket', ref),
        listDocumentSubscribers('HD Ticket', ref),
      ]);
      setTicketSubscribed(Boolean(status?.subscribed));
      setTicketSubscribers(Array.isArray(list) ? list : []);
    } catch {
      // keep existing list on failure
    } finally {
      setTicketSubscribersLoading(false);
    }
  }, [isOpen, ticket?.name, ticket?.id, ticketId]);

  useEffect(() => {
    setTicketSubscribers([]);
    setTicketSubscribed(false);
  }, [ticketId]);

  useEffect(() => {
    if (!isOpen || !isDataReady) return;
    refreshTicketSubscribers();
  }, [isOpen, isDataReady, ticketSubscriberSyncKey, refreshTicketSubscribers]);

  // Track first successful load per ticket to avoid skeleton during background refetches
  useEffect(() => {
    if (isDataReady) {
      setHasLoadedInitialData(true);
    }
  }, [isDataReady]);

  // Reset initial-load flag when switching tickets or closing the drawer
  useEffect(() => {
    if (!isOpen) {
      setHasLoadedInitialData(false);
      previousTicketIdRef.current = null;
      return;
    }

    if (previousTicketIdRef.current !== ticketId) {
      setHasLoadedInitialData(false);
      previousTicketIdRef.current = ticketId;
    }
  }, [isOpen, ticketId]);

  // Show loading skeleton only on the first load for a ticket (stop on error — avoids infinite skeleton on 403/500)
  const showInitialLoading = useMemo(() => {
    if (!isOpen || !ticketId) return false;
    if (detail.status === 'failed') return false;
    if (hasLoadedInitialData) return false;
    return !isDataReady || !isDrawerFullyOpen;
  }, [isOpen, ticketId, isDataReady, hasLoadedInitialData, detail.status, isDrawerFullyOpen]);

  // Track first comments load per ticket to avoid showing loading on refetch
  useEffect(() => {
    if (comments.status === 'succeeded') {
      setHasLoadedCommentsInitial(true);
    }
  }, [comments.status]);

  // Reset comments initial-load flag when switching tickets or closing the drawer
  useEffect(() => {
    if (!isOpen) {
      setHasLoadedCommentsInitial(false);
      previousCommentsTicketIdRef.current = null;
      return;
    }

    if (previousCommentsTicketIdRef.current !== ticketId) {
      setHasLoadedCommentsInitial(false);
      previousCommentsTicketIdRef.current = ticketId;
    }
  }, [isOpen, ticketId]);

  const commentsLoading = useMemo(() => {
    if (!isOpen || !ticketId) return false;
    if (!hasLoadedCommentsInitial) return comments.status === 'loading';
    return false;
  }, [isOpen, ticketId, comments.status, hasLoadedCommentsInitial]);

  // When ticket detail fails to load, toast + close so the drawer is not stuck on skeleton (any role)
  useEffect(() => {
    if (!isOpen || !ticketId) return;
    if (detail.status !== 'failed') return;

    const msg = extractErrorMessage(detail.error, '');
    const lower = String(msg).toLowerCase();
    const looksPermission =
      lower.includes('not permitted') ||
      lower.includes('not allowed') ||
      lower.includes('permission') ||
      lower.includes('403');

    showErrorToast(detail.error, {
      defaultMessage: looksPermission
        ? 'You do not have access to view this ticket.'
        : 'Failed to load ticket.',
    });
    onClose?.();
  }, [isOpen, ticketId, detail.status, detail.error, onClose]);

  // Fetch ticket details and comments when drawer opens or ticketId changes
  useEffect(() => {
    // Early return if drawer is closed or no ticketId
    if (!isOpen || !ticketId) {
      lastFetchedTicketIdRef.current = null;
      fetchPromiseRef.current = null;
      return;
    }

    // Only fetch if ticket ID changed and we don't have an in-flight request
    if (lastFetchedTicketIdRef.current !== ticketId && !fetchPromiseRef.current) {
      // Set refs IMMEDIATELY (synchronous) before any async operations
      const currentTicketId = ticketId;
      lastFetchedTicketIdRef.current = currentTicketId;

      // Create a promise that tracks both fetches
      const detailPromise = dispatch(fetchTicketDetail(currentTicketId));
      const commentsPromise = dispatch(fetchTicketComments(currentTicketId));

      // Track the combined promise
      fetchPromiseRef.current = Promise.all([detailPromise, commentsPromise]);

      // Clear the promise ref when both complete
      fetchPromiseRef.current.finally(() => {
        // Only clear if this is still the current ticket (prevent race conditions)
        if (lastFetchedTicketIdRef.current === currentTicketId) {
          fetchPromiseRef.current = null;
        }
      });
    }

    // Cleanup: clear promise ref if component unmounts or ticketId changes
    return () => {
      if (lastFetchedTicketIdRef.current !== ticketId) {
        fetchPromiseRef.current = null;
      }
    };
  }, [isOpen, ticketId, dispatch]);

  // Defer heavy rendering until drawer animation completes for smoother animation
  useEffect(() => {
    if (isOpen) {
      // Small delay to let drawer animation start smoothly
      const timeoutId = setTimeout(() => {
        setIsDrawerFullyOpen(true);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setIsDrawerFullyOpen(false);
    }
  }, [isOpen]);

  // Reset refs and local changes when drawer opens or ticket changes
  useEffect(() => {
    if (!isOpen) {
      // Reset when drawer closes
      fetchedSubCategoriesRef.current.clear();
      fetchedFloorsRef.current.clear();
      fetchedSpacesRef.current.clear();
      // Don't reset lastFetchedTicketIdRef here - let the fetch effect handle it
      setLocalChanges({});
      setUploadError('');
      setDragActive(false);
      setFieldErrors({
        sub_category: '',
        sub_sub_category: '',
        customer: '',
        floor_zone: '',
      });
      return;
    }

    // Reset category/floor refs when ticket changes (but not lastFetchedTicketIdRef)
    if (ticketId && lastFetchedTicketIdRef.current !== ticketId) {
      fetchedSubCategoriesRef.current.clear();
      fetchedFloorsRef.current.clear();
      fetchedSpacesRef.current.clear();
      setLocalChanges({});
      setUploadError('');
      setDragActive(false);
      setFieldErrors({
        sub_category: '',
        sub_sub_category: '',
        customer: '',
        floor_zone: '',
      });
    }
  }, [isOpen, ticketId]);

  // Fetch dropdown data when drawer opens - defer slightly to prioritize ticket data
  useEffect(() => {
    if (isOpen && dropdownData.status === 'idle') {
      // Defer dropdown data fetch to next tick to prioritize ticket detail/comments
      const timeoutId = setTimeout(() => {
        dispatch(fetchTicketDropdownData());
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, dispatch, dropdownData.status]);

  // Fetch centers allocated to client when editing from client detail page
  useEffect(() => {
    if (!isOpen || !centerFilterClientId) {
      setClientCenters([]);
      setClientCentersLoading(false);
      return;
    }
    setClientCentersLoading(true);
    dispatch(fetchCentersForClient(centerFilterClientId))
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
  }, [isOpen, centerFilterClientId, dispatch]);

  useEffect(() => {
    if (isOpen && relatedTickets.status === 'idle') {
      dispatch(fetchRelatedTickets());
    }
    if (!isOpen) {
      setRelatedTicketSearch('');
    }
  }, [isOpen, dispatch, relatedTickets.status]);

  // Refetch ticket activities when switching between comments and emails tabs
  useEffect(() => {
    if (!isOpen || !ticketId) {
      previousTabRef.current = activeTab;
      return;
    }

    // Only refetch if tab actually changed (not on initial mount)
    if (previousTabRef.current !== null && previousTabRef.current !== activeTab) {
      const currentTicketId = ticket?.id || ticket?.name || ticketId;
      if (currentTicketId) {
        // Refetch ticket activities (comments and emails) when tab changes
        dispatch(fetchTicketComments(currentTicketId));
      }
    }

    previousTabRef.current = activeTab;
  }, [activeTab, isOpen, ticketId, ticket, dispatch]);

  // Socket integration for real-time updates on specific ticket
  const { subscribe, isAuthenticated: socketAuthenticated } = useSocket();

  // Subscribe to specific ticket document updates when drawer is open
  useEffect(() => {
    if (!isOpen || !ticketId || !socketAuthenticated) return;

    const currentTicketId = ticket?.id || ticket?.name || ticketId;
    if (!currentTicketId) return;

    // Subscribe to updates for this specific ticket
    const unsubscribeUpdate = subscribe(
      'HD Ticket',
      'doc_update',
      (data) => {
        if (!data || !data.doctype || data.doctype !== 'HD Ticket') return;

        const ticketData = data.doc || data;
        if (!ticketData || !ticketData.name) return;

        // Only handle updates for the current ticket
        if (String(ticketData.name) !== String(currentTicketId)) return;

        // Refresh ticket detail and comments when update is received
        dispatch(fetchTicketDetail(currentTicketId));
        dispatch(fetchTicketComments(currentTicketId));
      },
      currentTicketId,
    );

    // Cleanup subscription when drawer closes or ticket changes
    return () => {
      if (typeof unsubscribeUpdate === 'function') {
        unsubscribeUpdate();
      }
    };
  }, [isOpen, ticketId, ticket, socketAuthenticated, subscribe, dispatch]);

  const getOriginalFieldValue = useCallback(
    (fieldName) => {
      if (!ticket && !ticketId) return '';

      if (fieldName === 'assigned_to') {
        if (ticket?.assignees && Array.isArray(ticket.assignees) && ticket.assignees.length > 0) {
          return ticket.assignees;
        }
        return getTicketFieldValue(ticket, fieldName) || '';
      }

      if (fieldName === TICKET_MARKER_COORDINATE_FIELD) {
        return readTicketMarkerCoordinateFromTicket(ticket);
      }

      if (PEOPLE_ID_FIELDS.has(fieldName)) {
        return getTicketFieldValue(ticket, fieldName) || '';
      }

      if (
        ticket?.[fieldName] !== undefined &&
        ticket?.[fieldName] !== null &&
        ticket?.[fieldName] !== ''
      ) {
        return ticket[fieldName];
      }

      return getTicketFieldValue(ticket, fieldName) || '';
    },
    [ticket, ticketId],
  );

  // Handle field change with optimistic update
  const handleFieldChange = useCallback(
    (fieldName, value, meta = { refreshActivities: true }) => {
      if (!ticket && !ticketId) return;

      const currentTicketId = ticket?.id || ticket?.name || ticketId;
      const updateId = latestUpdateIdRef.current + 1;
      latestUpdateIdRef.current = updateId;

      // Compare against original ticket value, not local edits, so clearing works
      const currentValue = getOriginalFieldValue(fieldName);

      // Normalize values for comparison - extract identifiers from both
      const normalizeForCompare = (value_) => {
        if (!value_ || (Array.isArray(value_) && value_.length === 0)) return '';
        if (Array.isArray(value_)) {
          // Extract identifiers (strings) from array
          const ids = value_
            .map((v) => {
              if (typeof v === 'string') return v;
              if (v && typeof v === 'object') return v.value || v.email || v.name || v;
              return String(v);
            })
            .filter(Boolean)
            .sort();
          return ids.join(',');
        }
        if (typeof value_ === 'object' && value_ !== null) {
          return value_.value || value_.email || value_.name || String(value_);
        }
        return String(value_ || '');
      };

      const currentNormalized = normalizeForCompare(currentValue);
      const newNormalized = normalizeForCompare(value);

      // Only update if value actually changed
      // For assigned_to field, always allow update (comparison might fail due to format differences)
      if (fieldName === TICKET_MARKER_COORDINATE_FIELD) {
        const markerSignature = (raw) =>
          JSON.stringify(parseTicketMarkerCoordinate(raw) ?? raw ?? '');
        if (markerSignature(currentValue) === markerSignature(value)) {
          return;
        }
      } else if (fieldName !== 'assigned_to' && currentNormalized === newNormalized) {
        return; // No change, don't trigger API
      }

      // Update local state immediately for smooth UX
      setLocalChanges((previous) => ({
        ...previous,
        [fieldName]: value,
      }));

      // Queue API update to prevent concurrent saves / deadlocks
      updateQueueRef.current = updateQueueRef.current
        .catch(() => {}) // keep chain alive
        .then(() =>
          onFieldUpdate?.(currentTicketId, fieldName, value, {
            ...meta,
            refreshActivities: meta.refreshActivities && updateId === latestUpdateIdRef.current,
          }),
        );
    },
    [onFieldUpdate, ticket, ticketId, getOriginalFieldValue],
  );

  const commitBatchFields = useCallback(
    (fields) => {
      if (!ticket && !ticketId) return;
      const currentTicketId = ticket?.id || ticket?.name || ticketId;

      setLocalChanges((previous) => {
        const next = { ...previous };
        fields.forEach(({ name, value }) => {
          next[name] = value;
        });
        return next;
      });

      fields.forEach(({ name, value }, index) => {
        const isLast = index === fields.length - 1;
        const updateId = latestUpdateIdRef.current + 1;
        latestUpdateIdRef.current = updateId;
        updateQueueRef.current = updateQueueRef.current
          .catch(() => {}) // swallow previous errors to keep chain alive
          .then(() =>
            onFieldUpdate?.(currentTicketId, name, value, {
              refreshActivities: isLast && updateId === latestUpdateIdRef.current,
            }),
          );
      });
    },
    [onFieldUpdate, ticket, ticketId],
  );

  // Memoized computed values
  const ticketTitle = useMemo(() => {
    const titleValue = getFieldValue(ticket, localChanges, 'ticket_title');
    if (titleValue !== null && titleValue !== undefined) {
      return titleValue;
    }
    return getFieldValue(ticket, localChanges, 'subject');
  }, [ticket, localChanges]);

  useEffect(() => {
    // Reset title error when ticket changes
    setTitleError('');
  }, [ticketTitle]);

  const priority = useMemo(
    () => getFieldValue(ticket, localChanges, 'priority'),
    [ticket, localChanges],
  );

  // Get dynamic options from Redux state (defined early so it can be used in other useMemos)
  const currentPriorityOptions = useMemo(() => {
    return dropdownData.data?.priorities || FALLBACK_PRIORITY_OPTIONS;
  }, [dropdownData.data?.priorities]);

  const priorityColor = useMemo(
    () => getPriorityColor(priority, currentPriorityOptions),
    [priority, currentPriorityOptions],
  );

  const currentCategory = useMemo(
    () => getFieldValue(ticket, localChanges, 'category'),
    [ticket, localChanges],
  );

  const currentCenter = useMemo(
    () => getFieldValue(ticket, localChanges, 'center'),
    [ticket, localChanges],
  );
  const currentTicketTypeLabel = useMemo(
    () => getFieldValue(ticket, localChanges, 'custom_ticket_type'),
    [ticket, localChanges],
  );
  const relatedTicketValue = useMemo(
    () => getFieldValue(ticket, localChanges, 'related_ticket'),
    [ticket, localChanges],
  );
  const relatedTicketOptions = useMemo(() => relatedTickets.data || [], [relatedTickets.data]);
  const relatedTicketOptionsLoading = relatedTickets.status === 'loading';
  const openRelatedTicket = useCallback(() => {
    const relatedId = String(relatedTicketValue || '').trim();
    if (!relatedId) return;
    navigate(`/ticket-management/${encodeURIComponent(relatedId)}`);
  }, [navigate, relatedTicketValue]);
  const getRelatedTicketLabel = useCallback(
    (ticketId) => {
      if (!ticketId) return '';
      return relatedTicketOptions.find((option) => option.value === ticketId)?.label || ticketId;
    },
    [relatedTicketOptions],
  );
  const filteredRelatedTicketOptions = useMemo(() => {
    const query = relatedTicketSearch.trim().toLowerCase();
    if (!query) return relatedTicketOptions;
    return relatedTicketOptions.filter((option) =>
      String(option?.label || option?.value || '')
        .toLowerCase()
        .includes(query),
    );
  }, [relatedTicketOptions, relatedTicketSearch]);
  const requiresRmChecked = useMemo(() => {
    const v = getFieldValue(ticket, localChanges, 'requires_rm');
    return v === true || v === 1 || v === '1';
  }, [ticket, localChanges]);

  const isIncidentTicket = useMemo(
    () => getFieldValue(ticket, localChanges, 'custom_ticket_type') === 'Incident',
    [ticket, localChanges],
  );

  const isInternalTicket = useMemo(
    () => currentTicketTypeLabel === 'Internal ticket',
    [currentTicketTypeLabel],
  );

  const currentCustomer = useMemo(
    () => getFieldValue(ticket, localChanges, 'customer'),
    [ticket, localChanges],
  );

  const isClientTicket = isClientUser || currentTicketTypeLabel === 'Client ticket';

  const resolvedClientId = useMemo(() => {
    if (isClientUser) return String(orgId || centerFilterClientId || '').trim();
    if (currentTicketTypeLabel === 'Client ticket') {
      return String(currentCustomer || centerFilterClientId || '').trim();
    }
    return '';
  }, [isClientUser, orgId, centerFilterClientId, currentTicketTypeLabel, currentCustomer]);

  const issueRaisedByOptions = useMemo(
    () =>
      mergeTicketPeopleOptions(
        coreTeamMembers.map(mapCenterTeamMemberToRaisedByOption).filter(Boolean),
        ticket?.raised_by_option || ticket?.issue_raised_by_option
          ? [ticket.raised_by_option || ticket.issue_raised_by_option]
          : [],
      ),
    [coreTeamMembers, ticket?.raised_by_option, ticket?.issue_raised_by_option],
  );

  const centerSpocAssigneeOptions = useMemo(
    () =>
      mergeTicketPeopleOptions(
        centerSpocMembers.map(mapCenterTeamMemberToAssigneeOption),
        ticket?.center_spoc_options || [],
      ),
    [centerSpocMembers, ticket?.center_spoc_options],
  );

  const attachments = useMemo(() => normalizeTicketAttachments(ticket), [ticket]);

  const handleAttachmentDownload = useCallback((attachment) => {
    if (!attachment?.fileUrl) return;
    const link = document.createElement('a');
    link.href = attachment.fileUrl;
    link.download = attachment.fileName || 'attachment';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Remove attachment
  const handleRemoveAttachment = useCallback(
    async (attachmentId, childRowId) => {
      if (!childRowId) {
        showErrorToast('Attachment ID not available');
        return;
      }

      if (!permissions.canEdit) {
        showErrorToast('You do not have permission to delete attachments');
        return;
      }

      try {
        // Call the ticket delete attachment API (file_id = File doc name)
        await dispatch(deleteTicketAttachment(childRowId)).unwrap();

        // Refresh ticket detail to get updated attachments
        const currentTicketId = ticket?.id || ticket?.name || ticketId;
        if (currentTicketId) {
          try {
            await dispatch(fetchTicketDetail(currentTicketId)).unwrap();
            showSuccessToast('Attachment removed successfully');
          } catch (error) {
            console.error('Failed to refresh ticket detail:', error);
            // Still show success since the removal was successful
            showSuccessToast('Attachment removed successfully');
          }
        } else {
          showSuccessToast('Attachment removed successfully');
        }
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage || 'Failed to remove attachment');
      }
    },
    [dispatch, ticket, ticketId, permissions.canEdit],
  );

  const handleFileUpload = useCallback(
    async (files) => {
      if (!ticketId || !permissions.canEdit) return;

      const fileArray = [...files];
      if (fileArray.length === 0) return;

      setIsUploading(true);
      setUploadError('');

      // Validate file sizes
      const validFiles = [];
      const invalidFiles = [];

      fileArray.forEach((file) => {
        if (file.size > MAX_FILE_SIZE) {
          invalidFiles.push(file.name);
        } else {
          validFiles.push(file);
        }
      });

      if (invalidFiles.length > 0) {
        const errorMessage = `The following file(s) exceed the 10 MB limit: ${invalidFiles.join(', ')}`;
        setUploadError(errorMessage);
        showErrorToast(errorMessage);
        setIsUploading(false);
        return;
      }

      if (validFiles.length === 0) {
        setIsUploading(false);
        return;
      }

      try {
        const currentTicketId = ticket?.id || ticket?.name || ticketId;
        const uploadPromises = validFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('doctype', 'HD Ticket');
          formData.append('docname', currentTicketId);
          formData.append('is_private', 0);

          const response = await apiClient.post('/method/upload_file', formData);
          return response.data;
        });

        await Promise.all(uploadPromises);

        // Refresh ticket detail to get updated attachments
        await dispatch(fetchTicketDetail(currentTicketId));

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Failed to upload attachment:', error);
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?._server_messages ||
          error.message ||
          'Failed to upload file. Please try again.';
        setUploadError(errorMessage);
        showErrorToast(error, {
          defaultMessage: 'Failed to upload file. Please try again.',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [ticketId, ticket, permissions.canEdit, dispatch],
  );

  useEffect(() => {
    onFilesDropRef.current = handleFileUpload;
    return () => {
      onFilesDropRef.current = null;
    };
  }, [handleFileUpload]);

  const handleUploadButtonClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileInputChange = useCallback(
    (event) => {
      const { files } = event.target;
      if (files && files.length > 0) {
        handleFileUpload(files);
      }
    },
    [handleFileUpload],
  );

  // Fetch sub-categories when ticket loads or category changes
  // Only fetch if drawer is open, category exists, and not already fetched/cached
  // Defer to avoid blocking initial render
  useEffect(() => {
    if (!isOpen || !currentCategory) return;

    // Check if already fetched in this session
    if (fetchedSubCategoriesRef.current.has(currentCategory)) return;

    // Check if already cached in Redux
    if (subCategories.data[currentCategory]) {
      fetchedSubCategoriesRef.current.add(currentCategory);
      return;
    }

    // Defer fetch slightly to prioritize ticket data loading
    const timeoutId = setTimeout(() => {
      fetchedSubCategoriesRef.current.add(currentCategory);
      dispatch(fetchSubCategories(currentCategory));
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isOpen, currentCategory, dispatch, subCategories.data]);

  // Fetch floors when ticket loads or center changes
  // Only fetch if drawer is open, center exists, and not already fetched/cached
  // Defer to avoid blocking initial render
  useEffect(() => {
    if (!isOpen || !currentCenter) return;

    // Check if already fetched in this session
    if (fetchedFloorsRef.current.has(currentCenter)) return;

    // Check if already cached in Redux
    if (floors.data[currentCenter]) {
      fetchedFloorsRef.current.add(currentCenter);
      return;
    }

    // Defer fetch slightly to prioritize ticket data loading
    const timeoutId = setTimeout(() => {
      fetchedFloorsRef.current.add(currentCenter);
      dispatch(fetchFloors(currentCenter));
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isOpen, currentCenter, dispatch, floors.data]);

  // Fetch spaces for internal tickets (same center filter as create form)
  useEffect(() => {
    if (!isOpen || !currentCenter) return;
    if (currentTicketTypeLabel !== 'Internal ticket') return;

    if (fetchedSpacesRef.current.has(currentCenter)) return;

    if (Object.prototype.hasOwnProperty.call(spaces.data, currentCenter)) {
      fetchedSpacesRef.current.add(currentCenter);
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchedSpacesRef.current.add(currentCenter);
      dispatch(fetchSpaces(currentCenter));
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isOpen, currentCenter, currentTicketTypeLabel, dispatch, spaces.data]);

  // Fetch core team members (Issue Raised by) and center SPOCs for internal tickets
  useEffect(() => {
    if (!isOpen || !isInternalTicket || !currentCenter) {
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
      center: currentCenter,
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
      center: currentCenter,
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
  }, [isOpen, isInternalTicket, currentCenter]);

  // Fetch co-workers (Issue Raised by) for client tickets
  useEffect(() => {
    if (!isOpen || !isClientTicket || !resolvedClientId) return;
    dispatch(fetchTicketCoworkerList(resolvedClientId));
  }, [isOpen, isClientTicket, resolvedClientId, dispatch]);

  // Fetch client SPOC contacts for client tickets
  useEffect(() => {
    if (!isOpen || !isClientTicket || !resolvedClientId) return;
    dispatch(fetchTicketClientSpocContacts(resolvedClientId));
  }, [isOpen, isClientTicket, resolvedClientId, dispatch]);

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
    () =>
      mergeTicketPeopleOptions(
        coworkerOptions.map(mapCoworkerToAssigneeOption).filter(Boolean),
        ticket?.raised_by_option || ticket?.issue_raised_by_option
          ? [ticket.raised_by_option || ticket.issue_raised_by_option]
          : [],
      ),
    [coworkerOptions, ticket?.raised_by_option, ticket?.issue_raised_by_option],
  );

  const clientSpocAssigneeOptions = useMemo(
    () =>
      mergeTicketPeopleOptions(
        clientSpocContacts.map((contact) => {
          const name = contact.contact_name || contact.name;
          let role = String(
            contact.access_type || contact.designation || contact.department || contact.role || '',
          ).trim();
          // If role/department is "other", use other_department instead
          if (role.toLowerCase() === 'other' && contact?.other_department) {
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
        ticket?.client_spoc_options || [],
      ),
    [clientSpocContacts, ticket?.client_spoc_options],
  );

  // Get dynamic options from Redux state
  const currentCategoryOptions = useMemo(() => {
    const categories = dropdownData.data?.categories || [];
    return categories.filter((option) => {
      const value = option.value || option.label || option;
      const label = option.label || option.value || option;
      return value !== 'Unspecified' && label !== 'Unspecified';
    });
  }, [dropdownData.data?.categories]);

  const currentSubCategoryOptions = useMemo(() => {
    if (!currentCategory) return [];
    return subCategories.data[currentCategory] || [];
  }, [currentCategory, subCategories.data]);

  const currentSeverityOptions = useMemo(() => {
    return dropdownData.data?.severities || [];
  }, [dropdownData.data?.severities]);

  const currentClientOptions = useMemo(() => {
    return dropdownData.data?.clients || dropdownData.data?.customers || [];
  }, [dropdownData.data?.clients, dropdownData.data?.customers]);

  const currentTicketTypeOptions = useMemo(() => {
    return dropdownData.data?.ticket_types || fallbackTicketTypeOptions;
  }, [dropdownData.data?.ticket_types]);

  const currentCenterOptions = useMemo(() => {
    if (centerFilterClientId) {
      return clientCenters;
    }
    return dropdownData.data?.centers || [];
  }, [centerFilterClientId, clientCenters, dropdownData.data?.centers]);

  const currentFloorOptions = useMemo(() => {
    if (!currentCenter) return [];
    return floors.data[currentCenter] || [];
  }, [currentCenter, floors.data]);

  const [dynamicStatusOptions, setDynamicStatusOptions] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen]);

  const currentFloorZone = useMemo(
    () => getFieldValue(ticket, localChanges, 'floor_zone'),
    [ticket, localChanges],
  );

  const selectedFloorRef = useMemo(
    () => resolveFloorRefFromOptions(currentFloorOptions, currentFloorZone),
    [currentFloorOptions, currentFloorZone],
  );

  const ticketMarkerCoordinate = useMemo(
    () =>
      parseTicketMarkerCoordinate(
        getFieldValue(ticket, localChanges, TICKET_MARKER_COORDINATE_FIELD),
      ),
    [ticket, localChanges],
  );

  const ticketMarkerFloorRef = useMemo(
    () => String(ticketMarkerCoordinate?.floor_ref ?? '').trim(),
    [ticketMarkerCoordinate],
  );

  const canOpenLayoutPanel = Boolean(currentCenter && (selectedFloorRef || ticketMarkerFloorRef));

  const currentSpaceOptions = useMemo(() => {
    if (!currentCenter) return [];
    return spaces.data[currentCenter] || [];
  }, [currentCenter, spaces.data]);

  const ticketSpaceSelectValue = useMemo(() => {
    if (localChanges.space !== undefined && localChanges.space !== null) {
      return String(localChanges.space);
    }
    return resolveTicketSpaceRef(ticket);
  }, [ticket, localChanges.space]);

  const ticketSpaceDisplayName = useMemo(() => resolveTicketSpaceDisplayName(ticket), [ticket]);

  const spaceOptionsForSelect = useMemo(() => {
    const value = ticketSpaceSelectValue;
    const label = ticketSpaceDisplayName;
    if (!value) return currentSpaceOptions;
    if (currentSpaceOptions.some((option) => String(option.value) === value)) {
      return currentSpaceOptions;
    }
    if (!label) return currentSpaceOptions;
    return [{ value, label }, ...currentSpaceOptions];
  }, [currentSpaceOptions, ticketSpaceSelectValue, ticketSpaceDisplayName]);

  const layoutDetailState = useSelector((state) => state.layout?.layoutDetail);

  const ticketLayoutFloorRef = useMemo(() => {
    if (ticketMarkerFloorRef) return ticketMarkerFloorRef;
    if (selectedFloorRef) return selectedFloorRef;
    return resolveTicketLayoutFloorRef(ticket, currentFloorOptions);
  }, [ticketMarkerFloorRef, selectedFloorRef, ticket, currentFloorOptions]);

  useEffect(() => {
    if (!isOpen || !ticketLayoutFloorRef) return;
    if (activeTab !== 'layout') return;
    dispatch(fetchLayoutDetail({ floorRef: ticketLayoutFloorRef }));
  }, [isOpen, activeTab, ticketLayoutFloorRef, dispatch]);

  useEffect(() => {
    if (!isOpen) {
      dispatch(clearLayoutDetail());
    }
  }, [isOpen, dispatch]);

  const handleFloorChange = useCallback(
    (value) => {
      const floorValue = String(value ?? '').trim();
      setFieldErrors((previous) => ({
        ...previous,
        floor_zone: floorValue ? '' : 'Floor is required',
      }));

      handleFieldChange('floor_zone', floorValue, { refreshActivities: false });

      const floorRef = resolveFloorRefFromOptions(currentFloorOptions, floorValue);
      dispatch(clearLayoutDetail());
      if (floorValue && floorRef) {
        dispatch(fetchLayoutDetail({ floorRef }));
      }

      const existingMarker = parseTicketMarkerCoordinate(
        getFieldValue(ticket, localChanges, TICKET_MARKER_COORDINATE_FIELD),
      );
      if (existingMarker && floorRef) {
        handleFieldChange(
          TICKET_MARKER_COORDINATE_FIELD,
          { ...existingMarker, floor_ref: floorRef },
          { refreshActivities: false },
        );
      }
    },
    [handleFieldChange, currentFloorOptions, dispatch, ticket, localChanges],
  );

  const handleOpenLayoutTab = useCallback(() => {
    if (!canOpenLayoutPanel) return;
    setActiveTab('layout');
    if (ticketLayoutFloorRef) {
      dispatch(clearLayoutDetail());
      dispatch(fetchLayoutDetail({ floorRef: ticketLayoutFloorRef }));
    }
  }, [canOpenLayoutPanel, dispatch, ticketLayoutFloorRef]);

  const handleSaveMarkerCoordinate = useCallback(
    async (payload, spaceId) => {
      const currentTicketId = String(ticket?.name || ticket?.id || ticketId || '').trim();
      if (!currentTicketId) return;

      try {
        await dispatch(
          updateTicketField({
            name: currentTicketId,
            fieldname: TICKET_MARKER_COORDINATE_FIELD,
            value: payload,
          }),
        ).unwrap();

        const previousSpaceId = resolveTicketSpaceRef(ticket, ticketMarkerCoordinate);
        if (spaceId && spaceId !== previousSpaceId) {
          await dispatch(
            updateTicketField({
              name: currentTicketId,
              fieldname: 'custom_space',
              value: spaceId,
            }),
          ).unwrap();
        }

        setLocalChanges((previous) => ({
          ...previous,
          [TICKET_MARKER_COORDINATE_FIELD]: payload,
          ...(spaceId ? { space: spaceId } : {}),
        }));

        showSuccessToast('Marker location updated.');
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update marker location.' });
        throw error;
      }
    },
    [dispatch, ticket, ticketId, ticketMarkerCoordinate],
  );
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

  // For client users: when status is 'Resolved', show only 'Open' and 'Closed'
  // Otherwise, show all status options but non-editable
  const clientStatusOptions = useMemo(() => {
    const currentStatus = getFieldValue(ticket, localChanges, 'status');
    if (currentStatus === 'Resolved') {
      return currentStatusOptions.filter(
        (option) => option.value === 'Open' || option.value === 'Closed',
      );
    }
    return currentStatusOptions;
  }, [currentStatusOptions, ticket, localChanges]);

  const handlePriorityChange = useCallback(
    (newPriority) => {
      if (onPriorityChange) {
        const currentTicketId = ticket?.id || ticket?.name || ticketId;
        if (currentTicketId) {
          onPriorityChange(currentTicketId, newPriority);
        }
      }
      handleFieldChange('priority', newPriority);
    },
    [handleFieldChange, onPriorityChange, ticket, ticketId],
  );

  // Wrapper for onAddComment to refetch ticket details when client comment sets first_responded_on
  const handleAddComment = useCallback(
    async (
      ticketId,
      content,
      attachments = [],
      isVisibleToClient = false,
      parentCommentId = null,
    ) => {
      if (isSlaBreached && !slaBreachReasonSelected) {
        showErrorToast('Please select an SLA breach reason before commenting.');
        return;
      }

      if (!onAddComment) return;

      // Check if we need to refetch ticket details after comment
      const shouldRefetchTicketDetails =
        !isClientUser && isVisibleToClient && !ticket?.first_responded_on;

      await onAddComment(ticketId, content, attachments, isVisibleToClient, parentCommentId);

      // Refetch ticket details if this was a client comment that should set first_responded_on
      if (shouldRefetchTicketDetails) {
        const currentTicketId = ticket?.id || ticket?.name || ticketId;
        if (currentTicketId) {
          await dispatch(fetchTicketDetail(currentTicketId));
        }
      }
    },
    [
      onAddComment,
      isClientUser,
      ticket,
      ticketId,
      dispatch,
      isSlaBreached,
      slaBreachReasonSelected,
    ],
  );

  // Handle category (L1) change — defer save until sub-category (L2) is selected
  const handleCategoryChange = useCallback(
    async (newCategory) => {
      pendingCategoryRef.current = {
        mode: newCategory ? 'parent' : null,
        category: newCategory,
        sub_category: '',
      };

      setLocalChanges((previous) => ({
        ...previous,
        category: newCategory,
        sub_category: '',
      }));

      setFieldErrors((previous) => ({
        ...previous,
        sub_category: newCategory ? 'Please select sub category' : '',
      }));

      if (newCategory && !subCategories.data[newCategory]) {
        await dispatch(fetchSubCategories(newCategory));
      }
    },
    [dispatch, subCategories.data],
  );

  const handleSubCategoryChange = useCallback(
    (newSubCategory) => {
      const parentMode = pendingCategoryRef.current.mode === 'parent';
      const categoryValue = parentMode
        ? pendingCategoryRef.current.category
        : getFieldValue(ticket, localChanges, 'category');

      const subCategoryOptions = categoryValue ? subCategories.data[categoryValue] || [] : [];
      const selectedOption = subCategoryOptions.find((option) => option.value === newSubCategory);
      const severityValue = selectedOption?.severity || '';

      setLocalChanges((previous) => ({
        ...previous,
        sub_category: newSubCategory,
        ...(severityValue ? { severity: severityValue } : {}),
      }));

      setFieldErrors((previous) => ({
        ...previous,
        sub_category: '',
      }));

      if (parentMode) {
        const fields = [
          { name: 'category', value: pendingCategoryRef.current.category },
          { name: 'sub_category', value: newSubCategory },
        ];
        if (severityValue) {
          fields.push({ name: 'severity', value: severityValue });
        }
        commitBatchFields(fields);
      } else {
        handleFieldChange('sub_category', newSubCategory, { refreshActivities: true });
        if (severityValue) {
          handleFieldChange('severity', severityValue, { refreshActivities: false });
        }
      }

      pendingCategoryRef.current = { mode: null, category: '', sub_category: '' };
    },
    [commitBatchFields, handleFieldChange, getFieldValue, localChanges, subCategories.data, ticket],
  );

  // Handle ticket type change - clear customer field and set visible_to_client to false when switching to Internal ticket
  const handleTicketTypeChange = useCallback(
    (newTicketType) => {
      const currentTicketType = getFieldValue(ticket, localChanges, 'custom_ticket_type');

      // Update ticket type
      handleFieldChange('custom_ticket_type', newTicketType);

      // If changing to Internal ticket, clear customer field and set visible_to_client to false
      if (newTicketType === 'Internal ticket') {
        if (currentTicketType === 'Client ticket') {
          handleFieldChange('customer', '');
        }
        handleFieldChange('visible_to_client', false);
        handleFieldChange('client_spoc', '');
        setFieldErrors((previous) => ({ ...previous, customer: '' }));
      } else if (newTicketType === 'Client ticket') {
        // When switching to Client ticket, show error if Client Name is empty
        const customer = getFieldValue(ticket, localChanges, 'customer');
        if (customer) {
          setFieldErrors((previous) => ({ ...previous, customer: '' }));
        } else {
          setFieldErrors((previous) => ({
            ...previous,
            customer: 'Client Name is required when Ticket Type is Client.',
          }));
        }
      }
      if (newTicketType !== 'Internal ticket') {
        handleFieldChange('space', '');
        handleFieldChange('raised_by', '');
        handleFieldChange('center_spoc', '');
        handleFieldChange('client_spoc', '');
      }
    },
    [handleFieldChange, ticket, localChanges],
  );

  // Validate before close: block close when Ticket Type is Client and Client Name is empty
  const handleRequestClose = useCallback(() => {
    if (!ticket) {
      onClose?.();
      return;
    }
    const ticketType = getFieldValue(ticket, localChanges, 'custom_ticket_type');
    const customer = getFieldValue(ticket, localChanges, 'customer');
    if (ticketType === 'Client ticket' && !customer) {
      setFieldErrors((previous) => ({
        ...previous,
        customer: 'Client Name is required when Ticket Type is Client.',
      }));
      showErrorToast('Please select a Client Name before closing.');
      return;
    }
    setFieldErrors((previous) => ({ ...previous, customer: '' }));
    onClose?.();
  }, [ticket, localChanges, onClose]);

  // Handle center change - fetch floors and set first option; internal tickets also refresh Space list
  const handleCenterChange = useCallback(
    async (newCenter) => {
      const ticketType = getFieldValue(ticket, localChanges, 'custom_ticket_type');
      const selectedCenterOption = currentCenterOptions.find(
        (option) => String(option?.value ?? option?.name ?? '').trim() === String(newCenter).trim(),
      );

      // Prefer zone on the selected option, but fall back to other dropdown sources
      let nextZone =
        selectedCenterOption?.zone ||
        selectedCenterOption?.zone_name ||
        selectedCenterOption?.custom_zone ||
        '';

      if (!nextZone) {
        const ddCenters = dropdownData.data?.centers || [];
        const found = ddCenters.find(
          (c) => String(c?.value ?? c?.name ?? c?.label ?? '').trim() === String(newCenter).trim(),
        );
        if (found) nextZone = found.zone || found.zone_name || found.custom_zone || '';
      }

      if (!nextZone && Array.isArray(clientCenters) && clientCenters.length > 0) {
        const foundClient = clientCenters.find(
          (c) => String(c?.value ?? c?.name ?? c?.label ?? '').trim() === String(newCenter).trim(),
        );
        if (foundClient)
          nextZone = foundClient.zone || foundClient.zone_name || foundClient.custom_zone || '';
      }

      setLocalChanges((previous) => {
        const next = { ...previous };
        if (nextZone) {
          // Zone was resolved from the center option — show it immediately
          next.zone = nextZone;
        } else {
          // No zone data on the option; remove any stale local override so the field
          // falls through to the fresh ticket data returned by fetchTicketDetail
          delete next.zone;
        }
        return next;
      });

      handleFieldChange('center', newCenter);

      // Check if already cached before fetching
      let floorOptions = [];
      if (floors.data[newCenter]) {
        floorOptions = floors.data[newCenter];
      } else {
        const result = await dispatch(fetchFloors(newCenter));
        if (fetchFloors.fulfilled.match(result)) {
          floorOptions = result.payload?.options || [];
        }
      }

      if (floorOptions.length > 0) {
        const firstFloor = floorOptions[0].value;
        handleFieldChange('floor_zone', firstFloor);
        setFieldErrors((previous) => ({ ...previous, floor_zone: '' }));
        const floorRef = resolveFloorRefFromOptions(floorOptions, firstFloor);
        if (floorRef) {
          dispatch(fetchLayoutDetail({ floorRef }));
        }
      } else {
        handleFieldChange('floor_zone', '');
        setFieldErrors((previous) => ({
          ...previous,
          floor_zone: 'Floor is required',
        }));
        dispatch(clearLayoutDetail());
      }

      if (ticketType === 'Internal ticket') {
        handleFieldChange('space', '');
        handleFieldChange('raised_by', '');
        handleFieldChange('center_spoc', '');
        fetchedSpacesRef.current.delete(newCenter);
        await dispatch(fetchSpaces(newCenter));
        fetchedSpacesRef.current.add(newCenter);
      } else {
        handleFieldChange('space', '');
      }
    },
    [
      handleFieldChange,
      dispatch,
      floors.data,
      ticket,
      localChanges,
      currentCenterOptions,
      dropdownData.data?.centers,
      clientCenters,
    ],
  );

  const handleMarkAsClosed = useCallback(() => {
    handleFieldChange('status', 'Closed');
  }, [handleFieldChange]);

  const handleSummarize = useCallback(async () => {
    if (!ticket) return;

    setIsSummaryModalOpen(true);
    setIsSummarizing(true);
    setSummaryText('');

    try {
      const payloadContext = { ticket, localChanges, comments: commentsData };
      const response = await apiClient.post('/method/devx_ai.summary.api.summarize_records', {
        records_json: JSON.stringify(payloadContext),
      });

      const result = response.data?.message || response.data;

      if (result?.success && result.data) {
        setSummaryText(result.data);
      } else {
        throw new Error(result?.error || 'Failed to generate summary');
      }
    } catch (error) {
      console.error('Summarize error:', error);
      setSummaryText(`Error generating summary: ${error.message}`);
    } finally {
      setIsSummarizing(false);
    }
  }, [ticket, localChanges, commentsData]);

  // Don't render if not open (conditional mounting)
  if (!isOpen) return null;

  const variant = getStatusVariant(getFieldValue(ticket, localChanges, 'status'));

  const rmMaintenanceFieldRows = (
    <>
      <FieldRow icon={RiToolsLine} label='Requires R&M' editable={true}>
        <div className='pl-1.5'>
          {permissions.canEdit ? (
            <Switch.Root
              checked={requiresRmChecked}
              onCheckedChange={(next) => {
                const n = next ? 1 : 0;
                handleFieldChange('requires_rm', n);
                if (!next) {
                  handleFieldChange('rm_impact', '');
                }
              }}
              disabled={!permissions.canEdit}
              size='xsmall'
            />
          ) : (
            <span className='text-paragraph-sm text-text-main-900'>
              {requiresRmChecked ? 'Yes' : 'No'}
            </span>
          )}
        </div>
      </FieldRow>
      {requiresRmChecked && (
        <FieldRow icon={RiToolsLine} label='R&M Impact' editable={true}>
          {permissions.canEdit ? (
            <Textarea.Root
              variant='borderless'
              simple
              rows={2}
              className='w-full'
              value={getFieldValue(ticket, localChanges, 'rm_impact') || ''}
              onChange={(e) => {
                const { value } = e.target;
                setLocalChanges((previous) => ({
                  ...previous,
                  rm_impact: value,
                }));
              }}
              onBlur={(e) => {
                const value = e.target.value.trim();
                handleFieldChange('rm_impact', value);
              }}
              disabled={!permissions.canEdit}
              placeholder='Describe R&M impact'
            />
          ) : (
            <span className='text-paragraph-sm text-text-main-900'>
              {getFieldValue(ticket, localChanges, 'rm_impact') || 'No R&M impact provided'}
            </span>
          )}
        </FieldRow>
      )}
    </>
  );

  const internalTicketPeopleFieldRows =
    !isClientUser && isInternalTicket ? (
      <>
        <FieldRow icon={RiUserLine} label='Issue Raised by' editable={true}>
          <AssigneeMultiSelect
            value={(() => {
              const raw =
                getFieldValue(ticket, localChanges, 'raised_by') ||
                getFieldValue(ticket, localChanges, 'issue_raised_by');
              if (!raw) return [];
              if (Array.isArray(raw)) return raw;
              return [raw];
            })()}
            onChange={(values) => {
              const ids = Array.isArray(values) ? values.filter(Boolean) : [];
              setLocalChanges((previous) => ({
                ...previous,
                raised_by: ids[0] || '',
                issue_raised_by: ids[0] || '',
              }));
            }}
            onBlur={(values) => {
              const ids = Array.isArray(values) ? values.filter(Boolean) : [];
              handleFieldChange('raised_by', ids[0] || '');
            }}
            disabled={!permissions.canEdit || !currentCenter || coreTeamMembersLoading}
            placeholder='Select'
            size='xsmall'
            singleSelect
            fixedAssigneeOptions={issueRaisedByOptions}
            fixedAssigneeOptionsLoading={coreTeamMembersLoading}
          />
        </FieldRow>
        <FieldRow icon={RiUserLine} label='Center Spoc' editable={true}>
          <AssigneeMultiSelect
            value={(() => {
              const raw = getFieldValue(ticket, localChanges, 'center_spoc');
              if (!raw) return [];
              return String(raw)
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean);
            })()}
            onChange={(values) => {
              const ids = Array.isArray(values) ? values.filter(Boolean) : [];
              setLocalChanges((previous) => ({
                ...previous,
                center_spoc: ids.length > 0 ? ids.join(',') : '',
              }));
            }}
            onBlur={(values) => {
              const ids = Array.isArray(values) ? values.filter(Boolean) : [];
              handleFieldChange('center_spoc', ids.length > 0 ? ids.join(',') : '');
            }}
            disabled={!permissions.canEdit || !currentCenter || centerSpocMembersLoading}
            placeholder='Select'
            size='xsmall'
            fixedAssigneeOptions={centerSpocAssigneeOptions}
            fixedAssigneeOptionsLoading={centerSpocMembersLoading}
          />
        </FieldRow>
      </>
    ) : null;

  const clientTicketPeopleFieldRows = isClientTicket ? (
    <>
      <FieldRow icon={RiUserLine} label='Issue Raised by' editable={true}>
        <AssigneeMultiSelect
          value={(() => {
            const raw =
              getFieldValue(ticket, localChanges, 'raised_by') ||
              getFieldValue(ticket, localChanges, 'issue_raised_by');
            if (!raw) return [];
            if (Array.isArray(raw)) return raw;
            return [raw];
          })()}
          onChange={(values) => {
            const ids = Array.isArray(values) ? values.filter(Boolean) : [];
            setLocalChanges((previous) => ({
              ...previous,
              raised_by: ids[0] || '',
              issue_raised_by: ids[0] || '',
            }));
          }}
          onBlur={(values) => {
            const ids = Array.isArray(values) ? values.filter(Boolean) : [];
            handleFieldChange('raised_by', ids[0] || '');
          }}
          disabled={!permissions.canEdit || !resolvedClientId || coworkerOptionsLoading}
          placeholder='Select'
          size='xsmall'
          singleSelect
          fixedAssigneeOptions={issueRaisedByCoworkerOptions}
          fixedAssigneeOptionsLoading={coworkerOptionsLoading}
        />
      </FieldRow>
      <FieldRow icon={RiUserLine} label='Client SPOC' editable={true}>
        <AssigneeMultiSelect
          value={(() => {
            const raw = getFieldValue(ticket, localChanges, 'client_spoc');
            if (!raw) return [];
            return String(raw)
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean);
          })()}
          onChange={(values) => {
            const ids = Array.isArray(values) ? values.filter(Boolean) : [];
            setLocalChanges((previous) => ({
              ...previous,
              client_spoc: ids.length > 0 ? ids.join(',') : '',
            }));
          }}
          onBlur={(values) => {
            const ids = Array.isArray(values) ? values.filter(Boolean) : [];
            handleFieldChange('client_spoc', ids.length > 0 ? ids.join(',') : '');
          }}
          disabled={!permissions.canEdit || !resolvedClientId || clientSpocContactsLoading}
          placeholder='Select'
          size='xsmall'
          fixedAssigneeOptions={clientSpocAssigneeOptions}
          fixedAssigneeOptionsLoading={clientSpocContactsLoading}
        />
      </FieldRow>
    </>
  ) : null;

  return (
    <>
      <Drawer.Root
        open={isOpen}
        onOpenChange={(open) => {
          if (open === false) handleRequestClose();
        }}
      >
        <Drawer.Content className='max-w-[1200px]'>
          {/* Header */}
          <Drawer.Header
            className='px-6 py-3 border-b border-stroke-soft-200'
            showCloseButton={false}
          >
            <div className='flex items-center justify-between w-full'>
              {showInitialLoading ? (
                <>
                  <div className='h-8 w-32 bg-bg-weak-100 rounded animate-pulse' />
                  <div className='flex items-center gap-3'>
                    <div className='h-8 w-16 bg-bg-weak-100 rounded animate-pulse' />
                    <div className='h-8 w-8 bg-bg-weak-100 rounded animate-pulse' />
                  </div>
                </>
              ) : (
                <>
                  {isClientUser ? (
                    <div />
                  ) : (
                    <div>
                      <div className='flex items-center'>
                        <SLATimer
                          responseBy={ticket.response_by}
                          firstRespondedOn={ticket.first_responded_on}
                          creation={ticket.creation}
                          statusCategory={ticket.status_category}
                        />
                      </div>
                    </div>
                  )}
                  <div className='flex items-center gap-3'>
                    {ticket?.name ? (
                      <DocumentFollowersPopover
                        referenceDoctype='HD Ticket'
                        referenceName={String(ticket.name)}
                        followers={ticketSubscribers}
                        subscribed={ticketSubscribed}
                        subscribersLoading={ticketSubscribersLoading}
                        onRefreshSubscribers={refreshTicketSubscribers}
                        canManageOthers={Boolean(permissions.canEdit)}
                        internalOnlySearch
                      />
                    ) : null}
                    {isClientUser && ticket.status === 'Resolved' && (
                      <Button.Root
                        variant='neutral'
                        mode='stroke'
                        size='xsmall'
                        onClick={() => handleMarkAsClosed()}
                        className='shrink-0'
                      >
                        <Button.Icon as={RiCheckLine} className='shrink-0 mr-0.5' />
                        Mark as Closed
                      </Button.Root>
                    )}

                    {permissions.canDelete && onDelete && (
                      <Button.Root
                        variant='neutral'
                        mode='stroke'
                        size='xsmall'
                        onClick={() => onDelete(ticket)}
                        className='shrink-0 flex items-center justify-center gap-1.5'
                      >
                        <Button.Icon as={RiDeleteBinLine} />
                        <span>Delete</span>
                      </Button.Root>
                    )}

                    <Button.Root
                      variant='neutral'
                      mode='stroke'
                      size='xsmall'
                      onClick={handleRequestClose}
                      className='shrink-0'
                    >
                      <Button.Icon as={RiCloseLine} className='shrink-0' />
                    </Button.Root>
                  </div>
                </>
              )}
            </div>
          </Drawer.Header>

          {/* Body */}
          <Drawer.Body className='flex-1 p-0 overflow-y-auto'>
            {showInitialLoading ? (
              <TicketViewDrawerSkeleton />
            ) : (
              <div className='flex h-full'>
                {/* Left Panel - Ticket Details */}
                <div
                  ref={leftPanelRef}
                  className={cn(
                    'w-[420px] border-r border-stroke-soft-200 overflow-y-auto relative',
                    dragActive && 'overflow-y-hidden',
                  )}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                >
                  {/* Drag and Drop Overlay */}
                  {dragActive && (
                    <>
                      {/* Full height overlay background */}
                      <div
                        className='absolute top-0 left-0 right-0 z-50 bg-information-lighter/80 backdrop-blur-sm border-2 border-dashed border-information-base pointer-events-none'
                        style={{
                          height: overlayHeight,
                          minHeight: '100%',
                        }}
                      />
                      {/* Message positioned in viewport center */}
                      <div
                        className='absolute left-0 right-0 z-50 flex items-center justify-center pointer-events-none'
                        style={{
                          top: messageTop,
                          transform: 'translateY(-50%)',
                        }}
                      >
                        <div className='flex flex-col items-center gap-4'>
                          <RiUploadCloud2Line className='size-16 text-information-base' />
                          <div className='flex flex-col items-center gap-2'>
                            <p className='label-large text-information-base font-semibold'>
                              Drop files here
                            </p>
                            <p className='text-paragraph-sm text-text-sub-600'>
                              All file types, up to 10 MB per file
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  <div className='px-6 pt-5 pb-0 flex flex-col gap-6'>
                    {/* Header Section */}
                    <div className='flex  flex-col gap-4'>
                      {!isClientUser && (
                        <div className='flex items-center justify-between'>
                          <div className='flex gap-2 items-center'>
                            <div className='w-[180px]'>
                              <Select.Root
                                value={getFieldValue(ticket, localChanges, 'custom_ticket_type')}
                                onValueChange={handleTicketTypeChange}
                                disabled={!permissions.canEdit || dropdownData.status === 'loading'}
                                size='xsmall'
                              >
                                <Select.Trigger className='min-w-[140px]' showArrow={true}>
                                  <Select.Value>
                                    <div className='flex items-center gap-2'>
                                      <DotBadge
                                        color={
                                          TICKET_TYPE[
                                            getFieldValue(
                                              ticket,
                                              localChanges,
                                              'custom_ticket_type',
                                            )
                                          ]?.color
                                        }
                                        size={16}
                                      />
                                      <span className='text-subheading-xs text-text-sub-500 uppercase'>
                                        {currentTicketTypeOptions.find(
                                          (opt) =>
                                            opt.value ===
                                            getFieldValue(
                                              ticket,
                                              localChanges,
                                              'custom_ticket_type',
                                            ),
                                        )?.label ||
                                          getFieldValue(
                                            ticket,
                                            localChanges,
                                            'custom_ticket_type',
                                          ) ||
                                          'Ticket Type'}
                                      </span>
                                    </div>
                                  </Select.Value>
                                </Select.Trigger>
                                <Select.Content>
                                  {currentTicketTypeOptions.map((option) => (
                                    <Select.Item key={option.value} value={option.value}>
                                      <div className='flex items-center gap-2 capitalize'>
                                        <DotBadge
                                          color={TICKET_TYPE[option.value]?.color}
                                          size={16}
                                        />
                                        <span className='label-small text-text-main-900'>
                                          {option.label}
                                        </span>
                                      </div>
                                    </Select.Item>
                                  ))}
                                </Select.Content>
                              </Select.Root>
                            </div>
                            <TicketStatusDropdown
                              value={getFieldValue(ticket, localChanges, 'status')}
                              onValueChange={(value) => handleFieldChange('status', value)}
                              statusOptions={currentStatusOptions}
                              disabled={
                                !permissions.canEdit ||
                                dropdownData.status === 'loading' ||
                                (isSlaBreached && !slaBreachReasonSelected)
                              }
                              variant='full'
                              size='xsmall'
                              isFacilityManager={isFacilityManagerUser}
                            />
                          </div>
                          <Dropdown.Root>
                            <Dropdown.Trigger asChild>
                              <Button.Root
                                variant='neutral'
                                mode='stroke'
                                size='xsmall'
                                className='shrink-0'
                              >
                                <Button.Icon as={RiMagicLine} className='mr-1.5' /> AI Actions
                              </Button.Root>
                            </Dropdown.Trigger>
                            <Dropdown.Content align='end' className='w-48 z-[60]'>
                              <Dropdown.Item
                                onClick={() => {
                                  handleSummarize();
                                }}
                                className={cn(
                                  'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 paragraph-small text-text-strong-950',
                                  'hover:bg-bg-weak-50 focus:bg-bg-weak-50 focus:outline-none',
                                )}
                              >
                                <RiMagicLine className='size-4 text-text-sub-500' />
                                <span>Summarise text</span>
                              </Dropdown.Item>
                            </Dropdown.Content>
                          </Dropdown.Root>
                        </div>
                      )}
                      {isClientUser && (
                        <div className='flex items-center justify-between'>
                          <div className='flex gap-2 items-center'>
                            <TicketStatusDropdown
                              value={getFieldValue(ticket, localChanges, 'status')}
                              onValueChange={(value) => handleFieldChange('status', value)}
                              statusOptions={clientStatusOptions}
                              disabled={
                                !permissions.canEdit ||
                                dropdownData.status === 'loading' ||
                                (isSlaBreached && !slaBreachReasonSelected)
                              }
                              variant='full'
                              size='xsmall'
                              isFacilityManager={isFacilityManagerUser}
                            />
                          </div>
                          <Dropdown.Root>
                            <Dropdown.Trigger asChild>
                              <Button.Root
                                variant='neutral'
                                mode='stroke'
                                size='xsmall'
                                className='shrink-0'
                              >
                                <Button.Icon as={RiMagicLine} className='mr-1.5' /> AI Actions
                              </Button.Root>
                            </Dropdown.Trigger>
                            <Dropdown.Content align='end' className='w-48 z-[60]'>
                              <Dropdown.Item
                                onClick={() => {
                                  handleSummarize();
                                }}
                                className={cn(
                                  'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 paragraph-small text-text-strong-950',
                                  'hover:bg-bg-weak-50 focus:bg-bg-weak-50 focus:outline-none',
                                )}
                              >
                                <RiMagicLine className='size-4 text-text-sub-500' />
                                <span>Summarise text</span>
                              </Dropdown.Item>
                            </Dropdown.Content>
                          </Dropdown.Root>
                        </div>
                      )}
                      <div className='flex flex-col gap-1'>
                        <Textarea.Root
                          key={`${ticket?.id || ticketId || 'title'}-${ticketTitle || ''}`}
                          variant='borderless'
                          simple
                          defaultValue={ticketTitle || ''}
                          onChange={() => {
                            if (titleError) setTitleError('');
                          }}
                          onBlur={(e) => {
                            const value = e.target.value.trim();
                            if (!value) {
                              setTitleError('Title is required');
                              return;
                            }
                            setTitleError('');
                            handleFieldChange('ticket_title', value);
                          }}
                          disabled={!permissions.canEdit}
                          rows={1}
                          hasError={Boolean(titleError)}
                          placeholder='Enter ticket title'
                          aria-invalid={Boolean(titleError)}
                          className='field-sizing-content text-title-h5 text-text-main-900 p-1'
                        />
                        {titleError && (
                          <span className='text-paragraph-xs text-error-base'>{titleError}</span>
                        )}
                      </div>
                      {/* Details Section - Two-Column Grid */}
                      <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                        {isClientUser ? (
                          <>
                            <FieldRow icon={RiBuilding2Line} label='Center' editable={true}>
                              <Select.Root
                                variant='borderless'
                                value={getFieldValue(ticket, localChanges, 'center')}
                                onValueChange={handleCenterChange}
                                disabled={
                                  !permissions.canEdit ||
                                  dropdownData.status === 'loading' ||
                                  (centerFilterClientId && clientCentersLoading)
                                }
                                size='xsmall'
                              >
                                <Select.Trigger className='w-full' showArrow={false}>
                                  <Select.Value placeholder='Select' />
                                </Select.Trigger>
                                <Select.Content>
                                  {currentCenterOptions.map((option) => (
                                    <Select.Item key={option.value} value={option.value}>
                                      {option.label}
                                    </Select.Item>
                                  ))}
                                </Select.Content>
                              </Select.Root>
                            </FieldRow>
                            {clientTicketPeopleFieldRows}
                            <FieldRow icon={RiMapPin2Line} label='Zone'>
                              <span className='text-paragraph-sm text-text-sub-600'>
                                {getFieldValue(ticket, localChanges, 'zone') || '--'}
                              </span>
                            </FieldRow>
                            <FieldRow icon={RiStackLine} label='Floor' editable={true} required>
                              <div className='flex border w-full min-w-0 items-center gap-2'>
                                <Select.Root
                                  variant='borderless'
                                  value={currentFloorZone}
                                  onValueChange={handleFloorChange}
                                  disabled={
                                    !permissions.canEdit ||
                                    !currentCenter ||
                                    floors.status === 'loading'
                                  }
                                  size='xsmall'
                                  className='min-w-0   flex-1'
                                  hasError={
                                    Boolean(fieldErrors.floor_zone) &&
                                    !String(currentFloorZone || '').trim()
                                  }
                                >
                                  <Select.Trigger className='w-full' showArrow={false}>
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
                                <CompactButton.Root
                                  type='button'
                                  variant='stroke'
                                  size='large'
                                  aria-label='View floor layout'
                                  title='View floor layout'
                                  disabled={!permissions.canEdit || !canOpenLayoutPanel}
                                  onClick={handleOpenLayoutTab}
                                  className='shrink-0'
                                >
                                  <CompactButton.Icon
                                    as={
                                      activeTab === 'layout'
                                        ? RiLayoutMasonryFill
                                        : RiLayoutMasonryLine
                                    }
                                  />
                                </CompactButton.Root>
                              </div>
                              {fieldErrors.floor_zone && !String(currentFloorZone || '').trim() ? (
                                <ErrorText>{fieldErrors.floor_zone}</ErrorText>
                              ) : null}
                            </FieldRow>
                            <FieldRow icon={RiPriceTag3Line} label='Related/Depended Ticket'>
                              <div className='flex w-full min-w-0 items-center gap-2'>
                                <Select.Root
                                  variant='borderless'
                                  value={relatedTicketValue || ''}
                                  onValueChange={(value) =>
                                    handleFieldChange('related_ticket', value)
                                  }
                                  onOpenChange={(open_) => {
                                    if (!open_) setRelatedTicketSearch('');
                                  }}
                                  disabled={!permissions.canEdit || relatedTicketOptionsLoading}
                                  size='xsmall'
                                >
                                  <Select.Trigger className='w-full min-w-0' showArrow={false}>
                                    <Select.Value placeholder='Select ticket'>
                                      {relatedTicketValue
                                        ? getRelatedTicketLabel(relatedTicketValue)
                                        : null}
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
                                {relatedTicketValue && (
                                  <Button.Root
                                    type='button'
                                    variant='neutral'
                                    mode='stroke'
                                    size='xsmall'
                                    className='shrink-0'
                                    onClick={openRelatedTicket}
                                  >
                                    <Button.Icon as={RiArrowRightSLine} />
                                  </Button.Root>
                                )}
                              </div>
                            </FieldRow>
                            <FieldRow icon={RiUserLine} label='Assignee' editable={true}>
                              <AssigneeMultiSelect
                                value={(() => {
                                  const value = getFieldValue(ticket, localChanges, 'assigned_to');
                                  return Array.isArray(value) ? value : value ? [value] : [];
                                })()}
                                onChange={(values) => {
                                  setLocalChanges((previous) => ({
                                    ...previous,
                                    assigned_to: values.length > 0 ? values : '',
                                  }));
                                }}
                                onBlur={(values) => {
                                  const assigneeValue =
                                    Array.isArray(values) && values.length > 0 ? values : '';
                                  handleFieldChange('assigned_to', assigneeValue);
                                }}
                                placeholder='-'
                                // disabled={true}
                                readonly={true}
                                size='xsmall'
                                internalOnly={
                                  getFieldValue(ticket, localChanges, 'custom_ticket_type') ===
                                  'Internal ticket'
                                }
                              />
                            </FieldRow>
                            {rmMaintenanceFieldRows}
                            {/* <FieldRow icon={RiCalendarLine} label='Due Date'>
                            {(() => {
                              const dueDate = getFieldValue(ticket, localChanges, 'due_date');
                              if (!permissions.canEdit) {
                                return (
                                  <span className='text-paragraph-sm text-text-main-900'>
                                    {dueDate ? safeDisplayDateTime(dueDate) : '--'}
                                  </span>
                                );
                              }
                              const dateValue = dueDate
                                ? (() => {
                                    const [year, month, day] = dueDate.split('-').map(Number);
                                    return new Date(year, month - 1, day);
                                  })()
                                : undefined;
                              return (
                                <Datepicker
                                  value={dateValue}
                                  onChange={(date) => {
                                    if (date) {
                                      const year = date.getFullYear();
                                      const month = String(date.getMonth() + 1).padStart(2, '0');
                                      const day = String(date.getDate()).padStart(2, '0');
                                      handleFieldChange('due_date', `${year}-${month}-${day}`);
                                    } else {
                                      handleFieldChange('due_date', '');
                                    }
                                  }}
                                  disabled={true}
                                  placeholder='-'
                                  variant='borderless'
                                  size='xsmall'
                                  min={new Date()}
                                />
                              );
                            })()}
                          </FieldRow> */}
                          </>
                        ) : (
                          <>
                            <FieldRow icon={RiUserLine} label='Assignee' editable={true}>
                              <AssigneeMultiSelect
                                value={(() => {
                                  const value = getFieldValue(ticket, localChanges, 'assigned_to');
                                  return Array.isArray(value) ? value : value ? [value] : [];
                                })()}
                                onChange={(values) => {
                                  setLocalChanges((previous) => ({
                                    ...previous,
                                    assigned_to: values.length > 0 ? values : '',
                                  }));
                                }}
                                onBlur={(values) => {
                                  const assigneeValue =
                                    Array.isArray(values) && values.length > 0 ? values : '';
                                  handleFieldChange('assigned_to', assigneeValue);
                                }}
                                disabled={!permissions.canEdit}
                                placeholder='Select assignees'
                                size='xsmall'
                                internalOnly={
                                  getFieldValue(ticket, localChanges, 'custom_ticket_type') ===
                                  'Internal ticket'
                                }
                              />
                            </FieldRow>

                            <FieldRow icon={RiCalendarLine} label='Due Date' editable={true}>
                              {(() => {
                                const dueDate = getFieldValue(ticket, localChanges, 'due_date');
                                if (!permissions.canEdit) {
                                  return (
                                    <span className='text-paragraph-sm text-text-main-900'>
                                      {dueDate ? safeDisplayDateTime(dueDate) : '--'}
                                    </span>
                                  );
                                }
                                const dateValue = dueDate
                                  ? (() => {
                                      const [year, month, day] = dueDate.split('-').map(Number);
                                      return new Date(year, month - 1, day);
                                    })()
                                  : undefined;
                                return (
                                  <Datepicker
                                    value={dateValue}
                                    onChange={(date) => {
                                      if (date) {
                                        const year = date.getFullYear();
                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                        const day = String(date.getDate()).padStart(2, '0');
                                        handleFieldChange('due_date', `${year}-${month}-${day}`);
                                      } else {
                                        handleFieldChange('due_date', '');
                                      }
                                    }}
                                    disabled={!permissions.canEdit}
                                    placeholder='Select a date'
                                    variant='borderless'
                                    size='xsmall'
                                  />
                                );
                              })()}
                            </FieldRow>

                            <FieldRow icon={RiFlagLine} label='Priority' editable={true}>
                              <Select.Root
                                variant='borderless'
                                value={priority}
                                onValueChange={(value) => handleFieldChange('priority', value)}
                                disabled={!permissions.canEdit || dropdownData.status === 'loading'}
                                size='xsmall'
                              >
                                <Select.Trigger className='w-full' showArrow={false}>
                                  <Select.Value asChild>
                                    <Badge.Root
                                      variant='light'
                                      color={priorityColor}
                                      className='text-nowrap'
                                    >
                                      {priority || 'Not Set'}
                                    </Badge.Root>
                                  </Select.Value>
                                </Select.Trigger>
                                <Select.Content>
                                  {currentPriorityOptions.map((option) => (
                                    <Select.Item key={option.value} value={option.value}>
                                      <Badge.Root
                                        variant='light'
                                        color={getPriorityColor(
                                          option.value,
                                          currentPriorityOptions,
                                        )}
                                        className='text-nowrap'
                                      >
                                        {option.value}
                                      </Badge.Root>
                                    </Select.Item>
                                  ))}
                                </Select.Content>
                              </Select.Root>
                            </FieldRow>

                            <FieldRow icon={RiBuilding2Line} label='Center' editable={true}>
                              <Select.Root
                                variant='borderless'
                                value={getFieldValue(ticket, localChanges, 'center')}
                                onValueChange={handleCenterChange}
                                disabled={
                                  !permissions.canEdit ||
                                  dropdownData.status === 'loading' ||
                                  (centerFilterClientId && clientCentersLoading)
                                }
                                size='xsmall'
                              >
                                <Select.Trigger className='' showArrow={false}>
                                  <Select.Value placeholder='Select' />
                                </Select.Trigger>
                                <Select.Content>
                                  {currentCenterOptions.map((option) => (
                                    <Select.Item key={option.value} value={option.value}>
                                      {option.label}
                                    </Select.Item>
                                  ))}
                                </Select.Content>
                              </Select.Root>
                            </FieldRow>

                            <FieldRow icon={RiMapPin2Line} label='Zone'>
                              <span className='text-paragraph-sm text-text-sub-600 p-2'>
                                {getFieldValue(ticket, localChanges, 'zone') || '--'}
                              </span>
                            </FieldRow>

                            <FieldRow icon={RiBuilding2Line} label='Floor' required>
                              <div className='flex w-full border min-w-0 items-center gap-1'>
                                <Select.Root
                                  variant='borderless'
                                  value={currentFloorZone}
                                  onValueChange={handleFloorChange}
                                  disabled={
                                    !permissions.canEdit ||
                                    !currentCenter ||
                                    floors.status === 'loading'
                                  }
                                  size='xsmall'
                                  className='min-w-0 flex-1'
                                  hasError={
                                    Boolean(fieldErrors.floor_zone) &&
                                    !String(currentFloorZone || '').trim()
                                  }
                                >
                                  <Select.Trigger className='w-[80%]' showArrow={false}>
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
                                <CompactButton.Root
                                  type='button'
                                  variant='ghost'
                                  size='large'
                                  aria-label='View floor layout'
                                  title='View floor layout'
                                  disabled={!permissions.canEdit || !canOpenLayoutPanel}
                                  onClick={handleOpenLayoutTab}
                                  className='shrink-0 w-[20%]'
                                >
                                  <CompactButton.Icon
                                    as={
                                      activeTab === 'layout'
                                        ? RiLayoutMasonryFill
                                        : RiLayoutMasonryLine
                                    }
                                  />
                                </CompactButton.Root>
                              </div>
                              {fieldErrors.floor_zone && !String(currentFloorZone || '').trim() ? (
                                <ErrorText>{fieldErrors.floor_zone}</ErrorText>
                              ) : null}
                            </FieldRow>

                            <FieldRow
                              icon={RiPriceTag3Line}
                              className='w-full'
                              truncate
                              label='Related/Depended Ticket'
                            >
                              <div className='flex w-full items-center'>
                                <Select.Root
                                  variant='borderless'
                                  value={relatedTicketValue || ''}
                                  onValueChange={(value) =>
                                    handleFieldChange('related_ticket', value)
                                  }
                                  onOpenChange={(open_) => {
                                    if (!open_) setRelatedTicketSearch('');
                                  }}
                                  disabled={!permissions.canEdit || relatedTicketOptionsLoading}
                                  size='xsmall'
                                >
                                  <Select.Trigger className='w-[85%] ' showArrow={false}>
                                    <Select.Value placeholder='Select ticket'>
                                      {relatedTicketValue
                                        ? getRelatedTicketLabel(relatedTicketValue)
                                        : null}
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
                                {relatedTicketValue ? (
                                  <Button.Root
                                    type='button'
                                    variant='borderless'
                                    // mode='stroke'
                                    size='xsmall'
                                    onClick={openRelatedTicket}
                                  >
                                    <Button.Icon as={RiArrowRightSLine} />
                                  </Button.Root>
                                ) : null}
                              </div>
                            </FieldRow>

                            {getFieldValue(ticket, localChanges, 'custom_ticket_type') ===
                              'Internal ticket' && (
                              <FieldRow icon={RiLayoutGridLine} label='Space' editable={true}>
                                {ticketSpaceSelectValue ? (
                                  <Select.Root
                                    variant='borderless'
                                    value={ticketSpaceSelectValue}
                                    onValueChange={(value) => handleFieldChange('space', value)}
                                    disabled={
                                      !permissions.canEdit ||
                                      !currentCenter ||
                                      spaces.status === 'loading'
                                    }
                                    size='xsmall'
                                  >
                                    <Select.Trigger className='w-full' showArrow={false}>
                                      <Select.Value placeholder='Select' />
                                    </Select.Trigger>
                                    <Select.Content>
                                      {spaceOptionsForSelect.map((option) => (
                                        <Select.Item key={option.value} value={option.value}>
                                          {option.label}
                                        </Select.Item>
                                      ))}
                                    </Select.Content>
                                  </Select.Root>
                                ) : ticketSpaceDisplayName ? (
                                  <span className='text-paragraph-sm text-text-strong-950'>
                                    {ticketSpaceDisplayName}
                                  </span>
                                ) : (
                                  <span className='text-paragraph-sm text-text-sub-600'>—</span>
                                )}
                              </FieldRow>
                            )}

                            {internalTicketPeopleFieldRows}

                            {getFieldValue(ticket, localChanges, 'custom_ticket_type') ===
                              'Client ticket' && (
                              <FieldRow
                                icon={RiUserLine}
                                label='Client Name'
                                editable={true}
                                required
                              >
                                <Select.Root
                                  variant='borderless'
                                  value={getFieldValue(ticket, localChanges, 'customer')}
                                  onValueChange={(value) => {
                                    handleFieldChange('customer', value);
                                    handleFieldChange('raised_by', '');
                                    handleFieldChange('client_spoc', '');
                                    setFieldErrors((previous) => ({ ...previous, customer: '' }));
                                  }}
                                  disabled={
                                    !permissions.canEdit || dropdownData.status === 'loading'
                                  }
                                  required={true}
                                  size='xsmall'
                                  matchTriggerWidth={false}
                                  hasError={Boolean(fieldErrors.customer)}
                                >
                                  <Select.Trigger className='w-full' showArrow={false}>
                                    <Select.Value placeholder='Select' />
                                  </Select.Trigger>
                                  <Select.Content>
                                    {currentClientOptions.map((option) => (
                                      <Select.Item key={option.value} value={option.value}>
                                        {option.label}
                                      </Select.Item>
                                    ))}
                                  </Select.Content>
                                </Select.Root>
                                {fieldErrors.customer && (
                                  <ErrorText>{fieldErrors.customer}</ErrorText>
                                )}
                              </FieldRow>
                            )}

                            {clientTicketPeopleFieldRows}

                            <FieldRow icon={RiPriceTag3Line} label='Category' editable={true}>
                              <Select.Root
                                variant='borderless'
                                value={getFieldValue(ticket, localChanges, 'category')}
                                onValueChange={handleCategoryChange}
                                disabled={!permissions.canEdit || dropdownData.status === 'loading'}
                                size='xsmall'
                                matchTriggerWidth={false}
                              >
                                <Select.Trigger className='w-full' showArrow={false}>
                                  <Select.Value placeholder='Select' />
                                </Select.Trigger>
                                <Select.Content>
                                  {currentCategoryOptions.map((option) => (
                                    <Select.Item key={option.value} value={option.value}>
                                      {option.label}
                                    </Select.Item>
                                  ))}
                                </Select.Content>
                              </Select.Root>
                            </FieldRow>

                            <FieldRow icon={RiPriceTag3Line} label='Sub Category' editable={true}>
                              <Select.Root
                                variant='borderless'
                                value={getFieldValue(ticket, localChanges, 'sub_category')}
                                onValueChange={handleSubCategoryChange}
                                disabled={
                                  !permissions.canEdit ||
                                  !currentCategory ||
                                  subCategories.status === 'loading'
                                }
                                size='xsmall'
                                hasError={Boolean(
                                  fieldErrors.sub_category &&
                                  !getFieldValue(ticket, localChanges, 'sub_category'),
                                )}
                                matchTriggerWidth={false}
                              >
                                <Select.Trigger className='w-full' showArrow={false}>
                                  <Select.Value placeholder='Select' />
                                </Select.Trigger>
                                <Select.Content>
                                  {currentSubCategoryOptions.map((option) => (
                                    <Select.Item key={option.value} value={option.value}>
                                      {option.label}
                                    </Select.Item>
                                  ))}
                                </Select.Content>
                              </Select.Root>
                              {fieldErrors.sub_category &&
                                !getFieldValue(ticket, localChanges, 'sub_category') && (
                                  <ErrorText>{fieldErrors.sub_category}</ErrorText>
                                )}
                            </FieldRow>

                            <FieldRow icon={RiInformationLine} label='Severity' editable={true}>
                              <Select.Root
                                variant='borderless'
                                value={getFieldValue(ticket, localChanges, 'severity')}
                                onValueChange={(value) => handleFieldChange('severity', value)}
                                disabled={!permissions.canEdit || dropdownData.status === 'loading'}
                                size='xsmall'
                              >
                                <Select.Trigger className='w-full' showArrow={false}>
                                  <Select.Value placeholder='Select' />
                                </Select.Trigger>
                                <Select.Content>
                                  {currentSeverityOptions.map((option) => (
                                    <Select.Item key={option.value} value={option.value}>
                                      {option.label}
                                    </Select.Item>
                                  ))}
                                </Select.Content>
                              </Select.Root>
                            </FieldRow>
                            {isIncidentTicket && (
                              <>
                                <FieldRow
                                  icon={RiCalendarLine}
                                  label='Incident Date & Time'
                                  editable={true}
                                >
                                  <DateTimePicker
                                    value={(() => {
                                      const value = getFieldValue(
                                        ticket,
                                        localChanges,
                                        'incident_datetime',
                                      );
                                      return value ? parseToDate(value) : undefined;
                                    })()}
                                    onChange={(date) =>
                                      handleFieldChange(
                                        'incident_datetime',
                                        date ? format(date, 'yyyy-MM-dd HH:mm:ss') : '',
                                      )
                                    }
                                    mode='date_time'
                                    placeholder='Select incident date & time'
                                    variant='borderless'
                                    className='w-full'
                                    disabled={!permissions.canEdit}
                                  />
                                </FieldRow>
                                <FieldRow
                                  icon={RiPriceTag3Line}
                                  label='Area of Incident'
                                  editable={true}
                                >
                                  <Input.Root className='w-full' variant='borderless'>
                                    <Input.Wrapper>
                                      <Input.Input
                                        placeholder='Enter area of incident'
                                        value={
                                          getFieldValue(ticket, localChanges, 'incident_area') || ''
                                        }
                                        onChange={(e) => {
                                          const { value } = e.target;
                                          setLocalChanges((previous) => ({
                                            ...previous,
                                            incident_area: value,
                                          }));
                                        }}
                                        onBlur={(e) =>
                                          handleFieldChange('incident_area', e.target.value.trim())
                                        }
                                        disabled={!permissions.canEdit}
                                      />
                                    </Input.Wrapper>
                                  </Input.Root>
                                </FieldRow>
                                <FieldRow icon={RiPriceTag3Line} label='Department' editable={true}>
                                  <Select.Root
                                    variant='borderless'
                                    value={getFieldValue(
                                      ticket,
                                      localChanges,
                                      'incident_department',
                                    )}
                                    onValueChange={(value) =>
                                      handleFieldChange('incident_department', value)
                                    }
                                    disabled={!permissions.canEdit}
                                    size='xsmall'
                                  >
                                    <Select.Trigger className='w-full' showArrow={false}>
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
                                </FieldRow>
                                <FieldRow
                                  icon={RiPriceTag3Line}
                                  label='Type of Incident'
                                  editable={true}
                                >
                                  <Input.Root className='w-full' variant='borderless'>
                                    <Input.Wrapper>
                                      <Input.Input
                                        placeholder='Enter type of incident'
                                        value={
                                          getFieldValue(ticket, localChanges, 'incident_type') || ''
                                        }
                                        onChange={(e) => {
                                          const { value } = e.target;
                                          setLocalChanges((previous) => ({
                                            ...previous,
                                            incident_type: value,
                                          }));
                                        }}
                                        onBlur={(e) =>
                                          handleFieldChange('incident_type', e.target.value.trim())
                                        }
                                        disabled={!permissions.canEdit}
                                      />
                                    </Input.Wrapper>
                                  </Input.Root>
                                </FieldRow>
                                <FieldRow
                                  icon={RiFlagLine}
                                  label='Sensitivity Level'
                                  editable={true}
                                >
                                  <Select.Root
                                    variant='borderless'
                                    value={getFieldValue(
                                      ticket,
                                      localChanges,
                                      'incident_sensitivity',
                                    )}
                                    onValueChange={(value) =>
                                      handleFieldChange('incident_sensitivity', value)
                                    }
                                    disabled={!permissions.canEdit}
                                    size='xsmall'
                                  >
                                    <Select.Trigger className='w-full' showArrow={false}>
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
                                </FieldRow>
                                <FieldRow
                                  icon={RiPriceTag3Line}
                                  label='Incident Reported Via'
                                  editable={true}
                                >
                                  <Input.Root className='w-full' variant='borderless'>
                                    <Input.Wrapper>
                                      <Input.Input
                                        placeholder='Enter source'
                                        value={
                                          getFieldValue(
                                            ticket,
                                            localChanges,
                                            'incident_reported_via',
                                          ) || ''
                                        }
                                        onChange={(e) => {
                                          const { value } = e.target;
                                          setLocalChanges((previous) => ({
                                            ...previous,
                                            incident_reported_via: value,
                                          }));
                                        }}
                                        onBlur={(e) =>
                                          handleFieldChange(
                                            'incident_reported_via',
                                            e.target.value.trim(),
                                          )
                                        }
                                        disabled={!permissions.canEdit}
                                      />
                                    </Input.Wrapper>
                                  </Input.Root>
                                </FieldRow>
                                <FieldRow
                                  icon={RiPriceTag3Line}
                                  label='Management Informed'
                                  editable={true}
                                >
                                  <Select.Root
                                    variant='borderless'
                                    value={getFieldValue(
                                      ticket,
                                      localChanges,
                                      'management_informed',
                                    )}
                                    onValueChange={(value) =>
                                      handleFieldChange('management_informed', value)
                                    }
                                    disabled={!permissions.canEdit}
                                    size='xsmall'
                                  >
                                    <Select.Trigger className='w-full' showArrow={false}>
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
                                </FieldRow>
                                <FieldRow
                                  icon={RiPriceTag3Line}
                                  label='Financial Impact'
                                  editable={true}
                                >
                                  <Input.Root className='w-full' variant='borderless'>
                                    <Input.Wrapper>
                                      <Input.Input
                                        inputMode='decimal'
                                        placeholder='Enter amount'
                                        value={
                                          getFieldValue(ticket, localChanges, 'financial_impact') ||
                                          ''
                                        }
                                        onChange={(e) => {
                                          const { value } = e.target;
                                          setLocalChanges((previous) => ({
                                            ...previous,
                                            financial_impact: value,
                                          }));
                                        }}
                                        onBlur={(e) =>
                                          handleFieldChange(
                                            'financial_impact',
                                            e.target.value.trim(),
                                          )
                                        }
                                        disabled={!permissions.canEdit}
                                      />
                                    </Input.Wrapper>
                                  </Input.Root>
                                </FieldRow>
                                <FieldRow
                                  icon={RiPriceTag3Line}
                                  label='Information Loss'
                                  editable={true}
                                >
                                  <Select.Root
                                    variant='borderless'
                                    value={getFieldValue(
                                      ticket,
                                      localChanges,
                                      'incident_data_loss',
                                    )}
                                    onValueChange={(value) =>
                                      handleFieldChange('incident_data_loss', value)
                                    }
                                    disabled={!permissions.canEdit}
                                    size='xsmall'
                                  >
                                    <Select.Trigger className='w-full' showArrow={false}>
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
                                </FieldRow>
                                <FieldRow
                                  icon={RiStickyNoteLine}
                                  label='Damage Occurred'
                                  editable={true}
                                >
                                  <Textarea.Root
                                    variant='borderless'
                                    simple
                                    rows={2}
                                    className='w-full'
                                    placeholder='Add description'
                                    value={
                                      getFieldValue(
                                        ticket,
                                        localChanges,
                                        'incident_injuries_damage',
                                      ) || ''
                                    }
                                    onChange={(e) => {
                                      const { value } = e.target;
                                      setLocalChanges((previous) => ({
                                        ...previous,
                                        incident_injuries_damage: value,
                                      }));
                                    }}
                                    onBlur={(e) =>
                                      handleFieldChange(
                                        'incident_injuries_damage',
                                        e.target.value.trim(),
                                      )
                                    }
                                    disabled={!permissions.canEdit}
                                  />
                                </FieldRow>
                              </>
                            )}
                            {rmMaintenanceFieldRows}
                            {isSlaBreached && (
                              <FieldRow
                                icon={RiTimeLine}
                                label='SLA Breach Reason'
                                editable={true}
                                required
                              >
                                <Select.Root
                                  variant='borderless'
                                  value={getFieldValue(
                                    ticket,
                                    localChanges,
                                    'custom_sla_breach_reason',
                                  )}
                                  onValueChange={(value) =>
                                    handleFieldChange('custom_sla_breach_reason', value)
                                  }
                                  disabled={!permissions.canEdit}
                                  size='xsmall'
                                  hasError={!slaBreachReasonSelected}
                                  matchTriggerWidth={false}
                                >
                                  <Select.Trigger className='w-full' showArrow={false}>
                                    <Select.Value
                                      placeholder='Select breach reason'
                                      className='truncate block'
                                    />
                                  </Select.Trigger>
                                  <Select.Content>
                                    {slaBreachReasons.map((option) => (
                                      <Select.Item key={option.value} value={option.value}>
                                        {option.label}
                                      </Select.Item>
                                    ))}
                                  </Select.Content>
                                </Select.Root>
                              </FieldRow>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {isIncidentTicket && (
                      <>
                        <div className='flex flex-col gap-3'>
                          <div className='flex items-center gap-2'>
                            <RiStickyNoteLine size={20} className='text-neutral-400' />
                            <span className='label-small text-text-sub-500'>
                              Corrective Action Taken
                            </span>
                          </div>
                          {permissions.canEdit ? (
                            <Textarea.Root
                              variant='borderless'
                              simple
                              value={
                                getFieldValue(ticket, localChanges, 'incident_corrective_action') ||
                                ''
                              }
                              onChange={(e) => {
                                const { value } = e.target;
                                setLocalChanges((previous) => ({
                                  ...previous,
                                  incident_corrective_action: value,
                                }));
                              }}
                              onBlur={(e) => {
                                const value = e.target.value.trim();
                                handleFieldChange('incident_corrective_action', value);
                              }}
                              disabled={!permissions.canEdit}
                              className='w-full field-sizing-content'
                              placeholder='Enter description'
                            />
                          ) : (
                            <p className='text-paragraph-sm text-text-main-900'>
                              {getFieldValue(ticket, localChanges, 'incident_corrective_action') ||
                                'No corrective action provided'}
                            </p>
                          )}
                        </div>
                        <div className='flex flex-col gap-3'>
                          <div className='flex items-center gap-2'>
                            <RiStickyNoteLine size={20} className='text-neutral-400' />
                            <span className='label-small text-text-sub-500'>
                              Root Cause Analysis
                            </span>
                          </div>
                          {permissions.canEdit ? (
                            <Textarea.Root
                              variant='borderless'
                              simple
                              value={
                                getFieldValue(
                                  ticket,
                                  localChanges,
                                  'incident_root_cause_analysis',
                                ) || ''
                              }
                              onChange={(e) => {
                                const { value } = e.target;
                                setLocalChanges((previous) => ({
                                  ...previous,
                                  incident_root_cause_analysis: value,
                                }));
                              }}
                              onBlur={(e) => {
                                const value = e.target.value.trim();
                                handleFieldChange('incident_root_cause_analysis', value);
                              }}
                              disabled={!permissions.canEdit}
                              className='w-full field-sizing-content'
                              placeholder='Enter description'
                            />
                          ) : (
                            <p className='text-paragraph-sm text-text-main-900'>
                              {getFieldValue(
                                ticket,
                                localChanges,
                                'incident_root_cause_analysis',
                              ) || 'No root cause analysis provided'}
                            </p>
                          )}
                        </div>
                        <div className='flex flex-col gap-3'>
                          <div className='flex items-center gap-2'>
                            <RiStickyNoteLine size={20} className='text-neutral-400' />
                            <span className='label-small text-text-sub-500'>
                              Preventive Action Proposed
                            </span>
                          </div>
                          {permissions.canEdit ? (
                            <Textarea.Root
                              variant='borderless'
                              simple
                              value={
                                getFieldValue(ticket, localChanges, 'incident_preventive_action') ||
                                ''
                              }
                              onChange={(e) => {
                                const { value } = e.target;
                                setLocalChanges((previous) => ({
                                  ...previous,
                                  incident_preventive_action: value,
                                }));
                              }}
                              onBlur={(e) => {
                                const value = e.target.value.trim();
                                handleFieldChange('incident_preventive_action', value);
                              }}
                              disabled={!permissions.canEdit}
                              className='w-full field-sizing-content'
                              placeholder='Enter description'
                            />
                          ) : (
                            <p className='text-paragraph-sm text-text-main-900'>
                              {getFieldValue(ticket, localChanges, 'incident_preventive_action') ||
                                'No preventive action provided'}
                            </p>
                          )}
                        </div>
                        <div className='flex flex-col gap-3'>
                          <div className='flex items-center gap-2'>
                            <RiStickyNoteLine size={20} className='text-neutral-400' />
                            <span className='label-small text-text-sub-500'>Closure Remarks</span>
                          </div>
                          {permissions.canEdit ? (
                            <Textarea.Root
                              variant='borderless'
                              simple
                              value={
                                getFieldValue(ticket, localChanges, 'incident_closure_remarks') ||
                                ''
                              }
                              onChange={(e) => {
                                const { value } = e.target;
                                setLocalChanges((previous) => ({
                                  ...previous,
                                  incident_closure_remarks: value,
                                }));
                              }}
                              onBlur={(e) => {
                                const value = e.target.value.trim();
                                handleFieldChange('incident_closure_remarks', value);
                              }}
                              disabled={!permissions.canEdit}
                              className='w-full field-sizing-content'
                              placeholder='Enter description'
                            />
                          ) : (
                            <p className='text-paragraph-sm text-text-main-900'>
                              {getFieldValue(ticket, localChanges, 'incident_closure_remarks') ||
                                'No closure remarks provided'}
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {isSlaBreached && !slaBreachReasonSelected && !isClientUser && (
                      <span className='text-paragraph-sm text-red-700'>
                        Select an SLA breach reason to comment or change status
                      </span>
                    )}

                    {/* Description Section */}
                    <div className='flex flex-col gap-3'>
                      <div className='flex items-center gap-2'>
                        <RiStickyNoteLine size={20} className='text-neutral-400' />
                        <span className='label-small text-text-sub-500'>Description</span>
                      </div>
                      {permissions.canEdit ? (
                        <Textarea.Root
                          variant='borderless'
                          simple
                          value={getFieldValue(ticket, localChanges, 'description') || ''}
                          onChange={(e) => {
                            const { value } = e.target;
                            setLocalChanges((previous) => ({
                              ...previous,
                              description: value,
                            }));
                          }}
                          onBlur={(e) => {
                            const value = e.target.value.trim();
                            handleFieldChange('description', value);
                          }}
                          disabled={!permissions.canEdit}
                          className='w-full field-sizing-content'
                          placeholder='Enter description'
                        />
                      ) : (
                        <p className='text-paragraph-sm text-text-main-900'>
                          {getFieldValue(ticket, localChanges, 'description') ||
                            'No description provided'}
                        </p>
                      )}
                    </div>

                    {/* Advanced Fields Section */}
                    {!isClientUser && (
                      <div className={`flex flex-col ${showAdvanced ? 'gap-2' : ''}`}>
                        <button
                          type='button'
                          onClick={() => setShowAdvanced((previous) => !previous)}
                          className='flex gap-2 items-center cursor-pointer py-0'
                        >
                          <RiPriceTag3Line className='size-5 text-text-sub-500' />
                          <span className='label-small text-text-sub-500'>Advance fields</span>
                          <RiArrowDownSLine
                            className={`size-5 text-text-sub-500 transition-transform duration-200 ${
                              showAdvanced ? 'rotate-180' : 'rotate-0'
                            }`}
                          />
                        </button>
                        <div
                          className={`overflow-hidden transition-[max-height] duration-200 ease-in-out ${
                            showAdvanced ? 'max-h-[600px]' : 'max-h-0'
                          }`}
                        >
                          <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                            {/* Visible to Client */}
                            {ticket?.custom_ticket_type &&
                              ticket?.custom_ticket_type === 'Client ticket' && (
                                <FieldRow label='Visible to Client'>
                                  <Switch.Root
                                    checked={getFieldValue(
                                      ticket,
                                      localChanges,
                                      'visible_to_client',
                                    )}
                                    onCheckedChange={(value) =>
                                      handleFieldChange('visible_to_client', value)
                                    }
                                    disabled={!permissions.canEdit}
                                    size='xsmall'
                                  />
                                </FieldRow>
                              )}
                            {/* Created At */}
                            <FieldRow label='Created At'>
                              <span className='text-paragraph-sm text-text-main-900'>
                                {getFieldValue(ticket, localChanges, 'creation')
                                  ? safeDisplayDateTime(
                                      getFieldValue(ticket, localChanges, 'creation'),
                                    )
                                  : '--'}
                              </span>
                            </FieldRow>

                            {/* Updated At */}
                            <FieldRow label='Updated At'>
                              <span className='text-paragraph-sm text-text-main-900'>
                                {getFieldValue(ticket, localChanges, 'modified')
                                  ? safeDisplayDateTime(
                                      getFieldValue(ticket, localChanges, 'modified'),
                                    )
                                  : '--'}
                              </span>
                            </FieldRow>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Attachments Section */}
                    <div className='flex flex-col gap-2 pb-6'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <RiAttachment2 className='size-5 text-text-sub-500' />
                          <span className='label-small text-text-sub-500'>Attachments</span>
                        </div>
                        {permissions.canEdit && (
                          <>
                            <input
                              ref={fileInputRef}
                              type='file'
                              multiple
                              className='hidden'
                              onChange={handleFileInputChange}
                              accept='*/*'
                              disabled={isUploading}
                            />
                            <Button.Root
                              type='button'
                              variant='neutral'
                              mode='stroke'
                              size='xsmall'
                              className='gap-1'
                              onClick={handleUploadButtonClick}
                              disabled={isUploading}
                            >
                              <Button.Icon
                                as={isUploading ? RiUploadCloud2Line : RiUploadLine}
                                className={isUploading ? 'animate-pulse p-0.5' : 'p-0.5'}
                              />
                              <span>{isUploading ? 'Uploading...' : 'Upload Files'}</span>
                            </Button.Root>
                          </>
                        )}
                      </div>
                      {uploadError && (
                        <div className='rounded-lg border border-error-base bg-error-50 px-3 py-2'>
                          <span className='text-paragraph-xs text-error-base'>{uploadError}</span>
                        </div>
                      )}
                      {attachments.length > 0 && (
                        <AttachmentList
                          attachments={attachments}
                          onDownload={handleAttachmentDownload}
                          onRemove={
                            permissions.canEdit
                              ? (attachmentId, childRowId) => {
                                  if (childRowId) {
                                    handleRemoveAttachment(attachmentId, childRowId);
                                  } else {
                                    const attachment = attachments.find(
                                      (att) =>
                                        att.id === attachmentId || att.childRowId === attachmentId,
                                    );
                                    const foundChildRowId =
                                      attachment?.childRowId || attachment?.name || attachmentId;
                                    handleRemoveAttachment(attachmentId, foundChildRowId);
                                  }
                                }
                              : undefined
                          }
                          disabled={isUploading}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Panel - Comments & Emails */}
                <div className='flex flex-1 flex-col h-full overflow-y-auto'>
                  <TabMenuHorizontal.Root
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className='flex flex-col flex-1 h-full'
                  >
                    <TabMenuHorizontal.List className='gap-4 h-auto border-t-0 px-6'>
                      <TabMenuHorizontal.Trigger
                        className='gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
                        value='comments'
                      >
                        <TabMenuHorizontal.Icon as={RiChat2Line} />
                        Comments
                      </TabMenuHorizontal.Trigger>
                      <TabMenuHorizontal.Trigger
                        className='gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
                        value='emails'
                      >
                        <TabMenuHorizontal.Icon as={RiMailLine} />
                        Emails
                      </TabMenuHorizontal.Trigger>

                      <TabMenuHorizontal.Trigger
                        className='gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950'
                        value='layout'
                      >
                        <TabMenuHorizontal.Icon
                          as={activeTab === 'layout' ? RiLayoutMasonryFill : RiLayoutMasonryLine}
                        />
                        Layout
                      </TabMenuHorizontal.Trigger>
                    </TabMenuHorizontal.List>

                    <TabMenuHorizontal.Content
                      value='comments'
                      className='flex-1 flex flex-col h-full overflow-y-auto'
                    >
                      <React.Suspense
                        fallback={
                          <div className='flex items-center justify-center h-full'>
                            <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                          </div>
                        }
                      >
                        <TicketComments
                          ticketId={ticket?.id || ticket?.name || ticketId}
                          commentsData={commentsData}
                          onAddComment={handleAddComment}
                          onRefreshData={onRefreshComments}
                          loading={commentsLoading}
                          slaBreachBlocked={isSlaBreached && !slaBreachReasonSelected}
                          slaBreachMessage='Please select an SLA breach reason before commenting.'
                        />
                      </React.Suspense>
                    </TabMenuHorizontal.Content>

                    <TabMenuHorizontal.Content
                      value='emails'
                      className='flex-1 flex flex-col h-full overflow-y-auto'
                    >
                      <React.Suspense
                        fallback={
                          <div className='flex items-center justify-center h-full'>
                            <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                          </div>
                        }
                      >
                        <EmailThread
                          ticketId={ticket?.id || ticket?.name || ticketId}
                          commentsData={commentsData}
                          loading={commentsLoading}
                          onSendEmail={async (emailData) => {
                            if (!onSendEmail) return;
                            setIsSubmittingEmail(true);
                            try {
                              const currentTicketId = ticket?.id || ticket?.name || ticketId;
                              await onSendEmail(currentTicketId, emailData);
                              // Refresh comments to get updated email thread
                              await dispatch(fetchTicketComments(currentTicketId));
                            } catch (error) {
                              console.error('Failed to send email:', error);
                              throw error; // Re-throw to let EmailInput handle the error display
                            } finally {
                              setIsSubmittingEmail(false);
                            }
                          }}
                          isSubmittingEmail={isSubmittingEmail}
                        />
                      </React.Suspense>
                    </TabMenuHorizontal.Content>

                    <TabMenuHorizontal.Content
                      value='layout'
                      className='flex min-h-[420px] flex-1 flex-col overflow-hidden'
                    >
                      <TicketCreateLayoutPanel
                        layoutDetail={layoutDetailState?.data}
                        floorRef={ticketLayoutFloorRef}
                        isLoading={layoutDetailState?.isLoading}
                        error={layoutDetailState?.error}
                        initialMarkerCoordinate={ticketMarkerCoordinate}
                        ticketSpaceRef={ticketSpaceSelectValue}
                        ticketSpaceDisplayName={ticketSpaceDisplayName}
                        canMark={Boolean(permissions.canEdit)}
                        autoSaveMarker={Boolean(permissions.canEdit)}
                        onMarkerSave={permissions.canEdit ? handleSaveMarkerCoordinate : undefined}
                        showCloseButton={false}
                      />
                    </TabMenuHorizontal.Content>
                  </TabMenuHorizontal.Root>
                </div>
              </div>
            )}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>

      <Modal.Root open={isSummaryModalOpen} onOpenChange={setIsSummaryModalOpen}>
        <Modal.Content className='max-w-[600px] w-full z-[100]'>
          <Modal.Header title='Ticket Summary' />
          <Modal.Body className='max-h-[60vh] overflow-y-auto'>
            {isSummarizing ? (
              <div className='flex flex-col items-center justify-center p-8 gap-4'>
                <div className='h-6 w-6 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                <span className='text-paragraph-base text-text-sub-600 animate-pulse'>
                  Generating summary with AI...
                </span>
              </div>
            ) : (
              <div className='text-paragraph-base text-text-main-900 whitespace-pre-wrap flex flex-col gap-4'>
                {summaryText || 'No summary generated.'}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button.Root
              variant='primary'
              size='medium'
              onClick={() => setIsSummaryModalOpen(false)}
            >
              Close
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </>
  );
};

export default TicketViewDrawer;
