import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Badge from '@/components/ui/badge';
import * as Modal from '@/components/ui/modal';
import { ComingSoonMessage, PageLayout } from '@/components';
import FieldRow from '@/components/ui/field-row';
import { PhoneInputController } from '@/components/ui/phone-input';
import { StatusColorPill, hasStatusBadgeColor } from '@/components/ui/status-color-pill';
import {
  RiArrowLeftSLine,
  RiContactsBook2Line,
  RiMailLine,
  RiMicLine,
  RiPencilLine,
  RiPhoneLine,
  RiPriceTag3Line,
} from 'react-icons/ri';
import {
  BasicDetailsByModule,
  isAllCentersTruth,
  isCurrentUserEventOwner,
  normalizeCentreValues,
  resolveClientOptionsForEventCenters,
} from '@/components/event-management/basic-details.jsx';
import { useAuth } from '@/contexts/auth-context';
import { apiEventDatetimeToIso } from '@/components/event-management/event-datetime-utils';
import { EventDetailsByModule } from '@/components/event-management/event-details.jsx';
import EventActivity from '@/components/event-management/event-activity';
import EventTasksTable from '@/components/event-management/event-tasks-table';
import EventParticipantsTable from '@/components/event-management/event-participants-table';
import {
  EVENT_CENTER_CLIENT_FIELD_NAMES,
  EVENT_TAB_OPTIONS,
  EVENT_TYPE_API_VALUE,
  getEventDetailTabReadModuleMap,
  getEventStatusBadgeColor,
  normalizeEventRevenueModeValue,
} from '@/components/event-management/constant';
import {
  usePermittedTabDefs,
  useSyncDetailTabSearchParams,
  tabDefId,
} from '@/hooks/use-detail-tab-permissions';
import { useDispatch, useSelector } from 'react-redux';
import {
  deleteEventAttachmentThunk,
  fetchCenterLabelsByIdsThunk,
  getEventCentersThunk,
  getEventClientsThunk,
  getPartnersResourceThunk,
  selectEventCenters,
  selectEventClients,
  selectPartnersResource,
  selectPartnersResourceHasFetched,
  selectPartnersResourceLoading,
  updateEventThunk,
  uploadEventAttachmentThunk,
  getEventDetailThunk,
} from '@/redux/eventsSlice';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { formatDateToYYYYMMDD, formatEventDatetimeForApi } from '@/utils/date-utils';
import { isAdminRole } from '@/utils/user-role-utils';
import { getStatusOptions } from '@/api/dynamic-status';
import {
  eventsStatusFieldForModule,
  toEventStatusSelectOptions,
} from '@/components/event-management/event-dynamic-status-helpers';

const EVENT_DATE_FIELD_NAMES = new Set(['registration_deadline']);

/** `get_event_details` may return `{ data: doc }` or the doc directly depending on path. */
function unwrapEventDetailPayload(payload) {
  if (payload == null || typeof payload !== 'object') return payload;
  return payload.data ?? payload;
}

function renderEventHeaderStatusBadge(statusLabel, apiColor, className) {
  const label = statusLabel != null && statusLabel !== '' ? String(statusLabel).trim() : '--';
  const raw = apiColor != null && String(apiColor).trim() !== '' ? String(apiColor).trim() : null;
  if (raw && hasStatusBadgeColor(raw)) {
    return <StatusColorPill value={label} color={raw} className={className} />;
  }
  return (
    <Badge.Root
      size='small'
      variant='light'
      color={getEventStatusBadgeColor(label)}
      className={className}
    >
      {label}
    </Badge.Root>
  );
}

function normalizeEventDateFormValue(fieldName, value) {
  if (!EVENT_DATE_FIELD_NAMES.has(fieldName)) return value;
  if (value === '' || value == null) return '';
  return formatDateToYYYYMMDD(value) || '';
}

function getEventDatetimeField(doc, fieldName) {
  const raw = doc?.[fieldName] ?? doc?.data?.[fieldName] ?? doc?.event?.[fieldName];
  return raw == null ? '' : raw;
}

const isFrappeFileUrl = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return false;
  try {
    const path = /^https?:\/\//i.test(raw) ? new URL(raw).pathname : raw;
    return /\/(?:private\/)?files\//i.test(path);
  } catch {
    return /\/(?:private\/)?files\//i.test(raw);
  }
};

const mapEventAttachmentRow = (att, idx = 0) => {
  const fileUrl =
    att?.file_url || att?.attachment_url || att?.attachment || att?.url || att?.file || '';
  const fileNameFromUrl =
    typeof fileUrl === 'string' && fileUrl ? fileUrl.split('?')[0].split('/').pop() : '';
  const displayName =
    att?.attachment_name ||
    att?.attachmentName ||
    att?.file_name ||
    att?.fileName ||
    (isFrappeFileUrl(fileUrl) ? fileNameFromUrl : '') ||
    '--';
  return {
    id: att?.name || att?.id || `${att?.file_name || fileUrl || 'att'}-${idx}`,
    fileName: displayName,
    attachmentName: att?.attachment_name || att?.attachmentName || displayName,
    type: att?.attachment_type || att?.type || 'Other',
    uploadedBy: att?.uploaded_by || att?.owner || att?.uploadedBy || '--',
    date: att?.creation || att?.date || '--',
    fileUrl,
    childRowId: att?.name || att?.child_row_id || att?.id || '',
    childDoctype: att?.child_doctype || 'Event Attachment',
    raw: att,
  };
};

const normalizeEventAttachments = (doc) => {
  const rows =
    doc?.event_attachments ||
    doc?.event_attachment ||
    doc?.attachments ||
    doc?.attachments_info ||
    doc?.files ||
    [];

  return (Array.isArray(rows) ? rows : []).map((att, idx) => mapEventAttachmentRow(att, idx));
};

/** Normalize upload API payload to raw attachment row(s) for `mapEventAttachmentRow`. */
const extractAttachmentsFromUploadPayload = (payload) => {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;
  if (
    typeof payload === 'object' &&
    payload.message != null &&
    typeof payload.message === 'object'
  ) {
    const nested = extractAttachmentsFromUploadPayload(payload.message);
    if (nested.length > 0) return nested;
  }
  if (Array.isArray(payload.event_attachments)) return payload.event_attachments;
  if (Array.isArray(payload.attachments)) return payload.attachments;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  if (
    payload.file_name ||
    payload.file_url ||
    payload.attachment ||
    (payload.name && (payload.file || payload.attachment || payload.file_name))
  ) {
    return [payload];
  }
  return [];
};

/** Maps a single UI field change to the API `data` object for update_events. */
const eventFieldToApiPayload = (fieldName, value, ctx = {}) => {
  if (fieldName === 'community_status' && ctx.moduleType === 'community') {
    return { community_status: value ?? '' };
  }
  switch (fieldName) {
    case 'assignee': {
      // Backend expects: [{ user: "email" }, ...]
      const rows = Array.isArray(value) ? value : value ? [value] : [];
      const normalized = rows
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') return item.user || item.value || item.email || '';
          return '';
        })
        .map((v) => String(v).trim())
        .filter(Boolean)
        .map((user) => ({ user }));
      return { assignee: normalized };
    }
    case 'centre_name': {
      // Backend expects: [{ center: "CTR-01" }, ...]
      const raw = Array.isArray(value) ? value : value ? [value] : [];
      const centers = raw
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object')
            return item.center || item.centre || item.value || '';
          return '';
        })
        .map((v) => String(v).trim())
        .filter(Boolean);
      return { centre_name: centers.map((center) => ({ center })) };
    }
    case 'all_centers':
      return {
        all_centers: value ? 1 : 0,
        ...(value ? { centre_name: [] } : {}),
      };
    case 'all_clients':
      return {
        all_clients: value ? 1 : 0,
        ...(value ? { clients_applicable: [] } : {}),
      };
    case 'clients':
    case 'clients_applicable': {
      const rows = Array.isArray(value) ? value : [];
      const normalized = rows
        .map((item) => {
          if (typeof item === 'string') {
            const customer = String(item).trim();
            return customer ? { customer } : null;
          }
          if (item && typeof item === 'object') {
            const customer = String(
              item.customer || item.client || item.value || item.name || '',
            ).trim();
            return customer ? { customer } : null;
          }
          return null;
        })
        .filter(Boolean);
      return { clients_applicable: normalized };
    }
    case 'max_registrations':
    case 'max_seats': {
      if (value === '' || value == null) return { [fieldName]: null };
      const n = Number(value);
      return { [fieldName]: Number.isFinite(n) ? n : null };
    }
    case 'total_registered': {
      if (value === '' || value == null) return { total_registered: null };
      const n = Number(value);
      return { total_registered: Number.isFinite(n) ? n : null };
    }
    case 'event_details': {
      const text = value ?? '';
      return { event_details: text, description: text };
    }
    case 'facilities_needed': {
      const rows = Array.isArray(value) ? value : [];
      const normalized = rows
        .map((item) => {
          if (typeof item === 'string') {
            const facilities = String(item).trim();
            return facilities ? { facilities } : null;
          }
          if (item && typeof item === 'object') {
            const facilities = String(item.facilities ?? '').trim();
            if (!facilities) return null;
            return item.name ? { name: item.name, facilities } : { facilities };
          }
          return null;
        })
        .filter(Boolean);
      return { facilities_needed: normalized };
    }
    case 'registration_deadline': {
      if (value === '' || value == null) return { [fieldName]: null };
      const ymd = formatDateToYYYYMMDD(value);
      return { [fieldName]: ymd || null };
    }
    default:
      return { [fieldName]: value };
  }
};

const EVENT_MODULE_BY_EVENT_TYPE = {
  [EVENT_TYPE_API_VALUE.spotlight]: 'spotlight',
  [EVENT_TYPE_API_VALUE.community]: 'community',
  [EVENT_TYPE_API_VALUE.hosted]: 'hosted',
  // Legacy values: kept for backward-compat with records that predate the
  // rename_event_types_spotlight_hosted backend migration patch. Rows already
  // migrated by the patch resolve via the keys above; unmigrated envs fall here.
  'Micro Events': 'spotlight',
  'External Events': 'hosted',
};

const resolveEventModuleType = (eventType) => {
  const normalized = String(eventType || '').trim();
  return EVENT_MODULE_BY_EVENT_TYPE[normalized] || 'spotlight';
};

/** Matches basic-details / API: Yes, 1, true mean "all centers". */
function isAllCentersSelected(val) {
  return (
    val === true ||
    val === 1 ||
    val === '1' ||
    String(val || '')
      .trim()
      .toLowerCase() === 'yes'
  );
}

function isAllClientsSelected(val) {
  return (
    val === true ||
    val === 1 ||
    val === '1' ||
    String(val || '')
      .trim()
      .toLowerCase() === 'yes'
  );
}

function normalizeClientsApplicableValues(clients) {
  const clientRows = Array.isArray(clients) ? clients : [];
  return clientRows
    .map((row) => {
      if (typeof row === 'string') return String(row).trim();
      if (row && typeof row === 'object')
        return String(row.customer || row.client || row.value || row.name || '').trim();
      return '';
    })
    .filter(Boolean);
}

/** @returns {string[]} messages when user must not leave; empty if OK */
function getEventDetailLeaveValidationErrors(eventFields, moduleType) {
  const errors = [];

  if (!isAllCentersSelected(eventFields?.all_centers)) {
    const centers = normalizeCentreValues(eventFields?.centre_name);
    if (centers.length === 0) {
      errors.push('Select at least one center.');
    }
  }

  if (
    moduleType === 'community' &&
    !isAllClientsSelected(eventFields?.all_clients) &&
    normalizeClientsApplicableValues(eventFields?.clients).length === 0
  ) {
    errors.push('Select at least one client.');
  }

  return errors;
}

const DEFAULT_SPEAKER = { name: '', email: '', phone: '' };

const EventEditSpocModal = ({ open, onOpenChange, values, onSave }) => {
  const { control, handleSubmit, reset } = useForm({
    defaultValues: values,
  });

  React.useEffect(() => {
    if (open) {
      reset(values);
    }
  }, [open, reset, values]);

  const onSubmit = (formValues) => {
    onSave(formValues);
    onOpenChange(false);
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[560px]' showClose={true}>
        <Modal.Header
          icon={RiContactsBook2Line}
          title='Edit SPOC'
          description='Modify the details for this SPOC.'
        />
        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col'>
          <Modal.Body className='flex flex-col gap-6'>
            <div className='flex flex-col gap-3'>
              <h3 className='text-label-md text-neutral-500'>Contact Information</h3>
              <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                <FieldRow icon={RiPriceTag3Line} label='Contact Name' required>
                  <Controller
                    name='name'
                    control={control}
                    render={({ field }) => (
                      <Input.Root size='xsmall' variant='borderless'>
                        <Input.Wrapper>
                          <Input.Input {...field} placeholder='Type here...' />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                </FieldRow>

                <FieldRow icon={RiMailLine} label='Email' required>
                  <Controller
                    name='email'
                    control={control}
                    render={({ field }) => (
                      <Input.Root size='xsmall' variant='borderless'>
                        <Input.Wrapper>
                          <Input.Input {...field} type='email' placeholder='Type here...' />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                </FieldRow>

                <FieldRow icon={RiPhoneLine} label='Mobile' required>
                  <Controller
                    name='phone'
                    control={control}
                    render={({ field }) => (
                      <PhoneInputController
                        value={field.value}
                        onChange={field.onChange}
                        size='xsmall'
                        variant='borderless'
                        placeholder='9876500011'
                        maxLength={10}
                      />
                    )}
                  />
                </FieldRow>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div className='flex items-center justify-end gap-3 w-full'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='medium'
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button.Root>
              <Button.Root type='submit' size='medium'>
                Save
              </Button.Root>
            </div>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
};

const EventAddSpeakerModal = ({ open, onOpenChange, values, onSave, isEdit = false }) => {
  const { control, handleSubmit, reset } = useForm({
    defaultValues: DEFAULT_SPEAKER,
  });

  React.useEffect(() => {
    if (open) {
      reset(values || DEFAULT_SPEAKER);
    }
  }, [open, reset, values]);

  const onSubmit = (formValues) => {
    onSave(formValues);
    onOpenChange(false);
    reset(DEFAULT_SPEAKER);
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[560px]' showClose={true}>
        <Modal.Header
          icon={RiMicLine}
          title={isEdit ? 'Edit Speaker' : 'Add Speaker'}
          description={
            isEdit ? 'Modify the details for this speaker.' : 'Add details for this speaker.'
          }
        />
        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col'>
          <Modal.Body className='flex flex-col gap-6'>
            <div className='flex flex-col gap-3'>
              <h3 className='text-label-md text-neutral-500'>Speaker Information</h3>
              <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                <FieldRow icon={RiPriceTag3Line} label='Speaker Name' required>
                  <Controller
                    name='name'
                    control={control}
                    render={({ field }) => (
                      <Input.Root size='xsmall' variant='borderless'>
                        <Input.Wrapper>
                          <Input.Input {...field} placeholder='Type here...' />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                </FieldRow>

                <FieldRow icon={RiMailLine} label='Email' required>
                  <Controller
                    name='email'
                    control={control}
                    render={({ field }) => (
                      <Input.Root size='xsmall' variant='borderless'>
                        <Input.Wrapper>
                          <Input.Input {...field} type='email' placeholder='Type here...' />
                        </Input.Wrapper>
                      </Input.Root>
                    )}
                  />
                </FieldRow>

                <FieldRow icon={RiPhoneLine} label='Mobile' required>
                  <Controller
                    name='phone'
                    control={control}
                    render={({ field }) => (
                      <PhoneInputController
                        value={field.value}
                        onChange={field.onChange}
                        size='xsmall'
                        variant='borderless'
                        placeholder='9876500011'
                        maxLength={10}
                      />
                    )}
                  />
                </FieldRow>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div className='flex items-center justify-end gap-3 w-full'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='medium'
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button.Root>
              <Button.Root type='submit' size='medium'>
                {isEdit ? 'Save' : 'Add Speaker'}
              </Button.Root>
            </div>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
};

const EVENT_VALID_TAB_VALUES = EVENT_TAB_OPTIONS.map((t) => t.value);

const ViewEventPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { name } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const partnersRaw = useSelector(selectPartnersResource);
  const hasFetchedPartners = useSelector(selectPartnersResourceHasFetched);
  const isPartnersLoading = useSelector(selectPartnersResourceLoading);

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [moduleType, setModuleType] = useState('spotlight');

  const [eventName, setEventName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

  const [activeTab, setActiveTab] = useState('basic-details');
  /** Bumped when the user selects Event Tasks so remount refetches despite module-level dedupe in EventTasksTable. */
  const [eventTasksTabNonce, setEventTasksTabNonce] = useState(0);
  const userUncheckedAllCenters = useRef(false);
  const [eventFields, setEventFields] = useState({
    name: '',
    event_name: '',
    owner: '',
    created_by: '',
    brandcompany_name: '',
    centre_name: [],
    all_centers: false,
    assignee: [],
    event_type: '',
    event_category: '',
    partner_name: '',
    partner_owner: '',
    // sub_category: '',
    engagement_mode: '',
    revenue_mode: '',
    status: '',
    status_color: null,
    community_status_color: null,
    facilities_needed: [],
    event_details: '',

    participation_type: '',
    registration_deadline: '',
    max_registrations: '',
    community_status: '',
    all_clients: '',
    approval_required: '',
    clients_applicable: '',
    total_registered: '',

    // External-only (safe defaults for all)
    registration_mode: '',
    max_seats: '',

    // External-only (optional)
    agenda: [],

    start_datetime: '',
    end_datetime: '',
  });

  const eventScheduleBadgeLabel = useMemo(() => {
    try {
      const s = parseISO(String(eventFields.start_datetime || ''));
      const e = parseISO(String(eventFields.end_datetime || ''));
      if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
        return `${format(s, 'dd MMM yyyy • HH:mm')} – ${format(e, 'HH:mm')}`;
      }
    } catch {
      /* ignore */
    }
    return '--';
  }, [eventFields.start_datetime, eventFields.end_datetime]);

  useEffect(() => {
    if (!hasFetchedPartners && !isPartnersLoading) {
      dispatch(getPartnersResourceThunk());
    }
  }, [dispatch, hasFetchedPartners, isPartnersLoading]);

  const partnerOptions = useMemo(() => {
    const rows = partnersRaw || [];
    return (Array.isArray(rows) ? rows : [])
      .map((p) => ({
        label: p?.partner_name || p?.name || '--',
        value: p?.name || '',
        meta: p,
      }))
      .filter((opt) => opt.value);
  }, [partnersRaw]);

  const [isEditSpocOpen, setIsEditSpocOpen] = useState(false);
  const [spocDetails, setSpocDetails] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [isAddSpeakerOpen, setIsAddSpeakerOpen] = useState(false);
  const [editingSpeakerIndex, setEditingSpeakerIndex] = useState(null);
  const [speakers, setSpeakers] = useState([]);
  const [eventAttachments, setEventAttachments] = useState([]);
  const [statusSelectOptions, setStatusSelectOptions] = useState([]);

  const eventTabReadModuleMap = useMemo(
    () => getEventDetailTabReadModuleMap(moduleType),
    [moduleType],
  );

  const permittedEventTabs = usePermittedTabDefs(EVENT_TAB_OPTIONS, eventTabReadModuleMap);
  const permittedEventTabIds = useMemo(
    () => permittedEventTabs.map((t) => tabDefId(t)),
    [permittedEventTabs],
  );

  useSyncDetailTabSearchParams({
    validTabs: EVENT_VALID_TAB_VALUES,
    defaultTabKey: 'basic-details',
    permittedIds: permittedEventTabIds,
    searchParams,
    setSearchParams,
    setActiveTab,
  });

  const handleEventTabChange = useCallback(
    (tab) => {
      if (tab === 'event-tasks') {
        setEventTasksTabNonce((n) => n + 1);
      }
      setActiveTab(tab);
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (tab === 'basic-details') next.delete('tab');
          else next.set('tab', tab);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const centersRaw = useSelector(selectEventCenters);
  const clientsRaw = useSelector(selectEventClients);

  const centerOptions = React.useMemo(() => {
    const rows = centersRaw || [];
    return (Array.isArray(rows) ? rows : [])
      .map((c) => {
        const label = c?.center_name || c?.center || c?.name || '--';
        const value = c?.name || c?.center || c?.name || '';
        return { label, value };
      })
      .filter((opt) => opt.value);
  }, [centersRaw]);

  const [centerLabelById, setCenterLabelById] = useState({});

  useEffect(() => {
    setCenterLabelById({});
  }, [name]);

  useEffect(() => {
    const allCenters =
      eventFields.all_centers === true ||
      eventFields.all_centers === 1 ||
      eventFields.all_centers === '1';
    if (allCenters) return undefined;

    const selectedIds = normalizeCentreValues(eventFields.centre_name);
    if (selectedIds.length === 0) return undefined;

    const idsToResolve = selectedIds.filter((id) => {
      const opt = centerOptions.find((o) => String(o.value) === String(id));
      if (!opt) return true;
      const label = String(opt.label ?? '').trim();
      return !label || label === String(id);
    });
    if (idsToResolve.length === 0) return undefined;

    let cancelled = false;
    dispatch(fetchCenterLabelsByIdsThunk(idsToResolve))
      .unwrap()
      .then((map) => {
        if (!cancelled && map && typeof map === 'object') {
          setCenterLabelById((prev) => ({ ...prev, ...map }));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [dispatch, eventFields.centre_name, eventFields.all_centers, centerOptions]);

  /** Centers linked on this event only — Event Tasks drawer + Participants filter */
  const eventTaskCenterOptions = React.useMemo(() => {
    const allCenters =
      eventFields.all_centers === true ||
      eventFields.all_centers === 1 ||
      eventFields.all_centers === '1';
    if (allCenters) return centerOptions;
    const selectedIds = normalizeCentreValues(eventFields.centre_name);
    const selectedSet = new Set(selectedIds.map(String));
    return centerOptions.filter((o) => selectedSet.has(String(o.value)));
  }, [centerOptions, eventFields.centre_name, eventFields.all_centers]);

  /** Full center rows (with zone) for CenterAccessDropdown in Event Task create drawer */
  const eventTaskCenters = React.useMemo(() => {
    const rows = Array.isArray(centersRaw) ? centersRaw : [];
    const allCenters =
      eventFields.all_centers === true ||
      eventFields.all_centers === 1 ||
      eventFields.all_centers === '1';
    if (allCenters) return rows.filter((c) => c?.name);
    const selectedIds = normalizeCentreValues(eventFields.centre_name);
    const selectedSet = new Set(selectedIds.map(String));
    return rows.filter((c) => selectedSet.has(String(c?.name ?? c?.center ?? '')));
  }, [centersRaw, eventFields.centre_name, eventFields.all_centers]);

  const clientOptions = React.useMemo(() => {
    const rows = clientsRaw || [];
    return (Array.isArray(rows) ? rows : [])
      .map((c) => {
        const label = c?.customer_name || c?.custom_legal_name || c?.name || '--';
        const value = c?.name || label;
        const centerRefs = Array.isArray(c?.center_refs) ? c.center_refs : [];
        return { label, value, meta: { centerRefs } };
      })
      .filter((opt) => opt.value);
  }, [clientsRaw]);

  useEffect(() => {
    let cancelled = false;
    const field = eventsStatusFieldForModule(moduleType);
    getStatusOptions({ doctype: 'Events', field })
      .then((rows) => {
        if (!cancelled) setStatusSelectOptions(toEventStatusSelectOptions(rows));
      })
      .catch(() => {
        if (!cancelled) setStatusSelectOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [moduleType]);

  /** Participants filter: all clients of event centers, or explicit client list */
  const eventParticipantClientOptions = React.useMemo(() => {
    const clientsForCenters = resolveClientOptionsForEventCenters({
      clientOptions,
      centerOptions,
      allCenters: isAllCentersTruth(eventFields?.all_centers),
      selectedCentreIds: normalizeCentreValues(eventFields?.centre_name),
    });
    if (isAllClientsSelected(eventFields?.all_clients)) return clientsForCenters;
    const selectedIds = new Set(normalizeClientsApplicableValues(eventFields?.clients).map(String));
    return clientsForCenters.filter((o) => selectedIds.has(String(o.value)));
  }, [
    clientOptions,
    centerOptions,
    eventFields?.clients,
    eventFields?.all_clients,
    eventFields?.all_centers,
    eventFields?.centre_name,
  ]);

  const { user: currentUser } = useAuth();
  const userSideBarPerm = useSelector((state) => state.auth?.userSideBarPerm);
  const canSelectAllCentersAndClients = isAdminRole(userSideBarPerm);

  const isEventOwner = useMemo(
    () => isCurrentUserEventOwner(eventFields, currentUser?.email),
    [eventFields, currentUser?.email],
  );

  const scopeFieldsReadOnly = !isEventOwner;

  const blockScopeFieldEdit = useCallback(
    (fieldName) => {
      if (!scopeFieldsReadOnly || !EVENT_CENTER_CLIENT_FIELD_NAMES.has(fieldName)) return false;
      showErrorToast('Only the event owner can change centers and clients.', {
        defaultMessage: 'Permission denied',
      });
      return true;
    },
    [scopeFieldsReadOnly],
  );

  const persistEventField = useCallback(
    async (fieldName, value) => {
      const resolvedEventId = eventFields?.name || name;
      if (!resolvedEventId) return;
      if (blockScopeFieldEdit(fieldName)) return;
      const patch = eventFieldToApiPayload(fieldName, value, { moduleType });
      if (!patch || Object.keys(patch).length === 0) return;
      try {
        const resultAction = await dispatch(
          updateEventThunk({ eventId: resolvedEventId, ...patch }),
        ).unwrap();

        showSuccessToast('Updated successfully.');
      } catch (error) {
        // console.log('error', error);
        // const msg = extractErrorMessage(error, 'Failed to save changes');
        showErrorToast(error, { defaultMessage: 'Failed to save changes' });
      }
    },
    [dispatch, eventFields?.name, name, moduleType, blockScopeFieldEdit],
  );

  const handleScheduleCommit = useCallback(
    async (startIso, endIso) => {
      const resolvedEventId = eventFields?.name || name;
      if (!resolvedEventId) return;
      const startMs = parseISO(String(startIso || '')).getTime();
      const endMs = parseISO(String(endIso || '')).getTime();
      if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
        showErrorToast(new Error('End must be after start.'), {
          defaultMessage: 'Invalid schedule',
        });
        return;
      }
      const patch = {
        start_datetime: formatEventDatetimeForApi(startIso),
        end_datetime: formatEventDatetimeForApi(endIso),
      };
      setEventFields((prev) => ({
        ...prev,
        start_datetime: startIso,
        end_datetime: endIso,
      }));
      try {
        await dispatch(updateEventThunk({ eventId: resolvedEventId, ...patch })).unwrap();
        showSuccessToast('Updated successfully.');
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to save changes' });
      }
    },
    [dispatch, eventFields?.name, name],
  );

  const handleFieldChange = useCallback(
    (fieldName, value) => {
      if (blockScopeFieldEdit(fieldName)) return;
      const nextValue = normalizeEventDateFormValue(fieldName, value);
      const isEnableAllCenters = fieldName === 'all_centers' && Boolean(nextValue);
      setEventFields((prev) => {
        const next = { ...prev, [fieldName]: nextValue };
        if (fieldName === 'community_status' && moduleType === 'community') {
          next.status = nextValue;
        }
        const statusFieldKey = moduleType === 'community' ? 'community_status' : 'status';
        if (
          fieldName === statusFieldKey ||
          (fieldName === 'community_status' && moduleType === 'community')
        ) {
          const opt = statusSelectOptions.find((o) => String(o.value) === String(nextValue));
          const c = opt?.color;
          if (moduleType === 'community') {
            if (c != null && String(c).trim() !== '') next.community_status_color = c;
          } else if (c != null && String(c).trim() !== '') {
            next.status_color = c;
          }
        }
        if (isEnableAllCenters) {
          next.centre_name = [];
        }
        return next;
      });
      if (fieldName === 'event_name') setEventName(nextValue);
      if (isEnableAllCenters) {
        const resolvedEventId = eventFields?.name || name;
        if (resolvedEventId) {
          void (async () => {
            try {
              await dispatch(
                updateEventThunk({
                  eventId: resolvedEventId,
                  all_centers: 1,
                  centre_name: [],
                }),
              ).unwrap();
              showSuccessToast('Updated successfully.');
            } catch (error) {
              showErrorToast(error, { defaultMessage: 'Failed to save changes' });
            }
          })();
        }
        return;
      }
      // Don't persist all_centers=false until at least one center is selected
      if (fieldName === 'all_centers' && !nextValue) {
        userUncheckedAllCenters.current = true; // ← ADD THIS
        return;
      }

      // When a center is selected while all_centers is off, batch all_centers:0 with centre_name
      if (fieldName === 'centre_name' && userUncheckedAllCenters.current) {
        const resolvedEventId = eventFields?.name || name;
        if (resolvedEventId) {
          const centers = (Array.isArray(nextValue) ? nextValue : [nextValue])
            .map((v) => {
              if (typeof v === 'string') return v.trim();
              if (v && typeof v === 'object') return v.center || v.centre || v.value || '';
              return '';
            })
            .filter(Boolean)
            .map((center) => ({ center }));
          void (async () => {
            try {
              await dispatch(
                updateEventThunk({
                  eventId: resolvedEventId,
                  all_centers: 0,
                  centre_name: centers,
                }),
              ).unwrap();
              userUncheckedAllCenters.current = false;
              showSuccessToast('Updated successfully.');
            } catch (error) {
              showErrorToast(error, { defaultMessage: 'Failed to save changes' });
            }
          })();
        }
        return;
      }

      void persistEventField(fieldName, nextValue);
    },
    [
      persistEventField,
      moduleType,
      statusSelectOptions,
      dispatch,
      eventFields?.name,
      name,
      blockScopeFieldEdit,
    ],
  );

  const commitEventTitleFromHeader = useCallback(
    (raw) => {
      const trimmed = String(raw ?? '').trim();
      handleFieldChange('event_name', trimmed);
    },
    [handleFieldChange],
  );

  const handleSpocSave = useCallback(
    (next) => {
      setSpocDetails(next);
      const resolvedEventId = eventFields?.name || name;
      if (!resolvedEventId) return;
      void (async () => {
        try {
          const resultAction = await dispatch(
            updateEventThunk({
              eventId: resolvedEventId,
              spoc_name: next?.name || '',
              spoc_phone: next?.phone || '',
              spoc_email: next?.email || '',
            }),
          );
          if (!updateEventThunk.fulfilled.match(resultAction)) {
            throw new Error(
              typeof resultAction.payload === 'string'
                ? resultAction.payload
                : resultAction.payload?.message || 'Failed to save SPOC',
            );
          }
        } catch (error) {
          const msg = extractErrorMessage(error, 'Failed to save SPOC');
          showErrorToast(msg, { defaultMessage: 'Failed to save SPOC' });
        }
      })();
    },
    [dispatch, eventFields?.name, name],
  );

  const handleDeleteAttachment = useCallback(
    async (attachmentRow) => {
      const child_row_id = attachmentRow?.childRowId || attachmentRow?.child_row_id || '';
      const child_doctype =
        attachmentRow?.childDoctype || attachmentRow?.child_doctype || 'Event Attachment';
      if (!child_row_id) {
        showErrorToast('Attachment id not found.');
        return;
      }

      const resultAction = await dispatch(
        deleteEventAttachmentThunk({
          child_row_id,
          child_doctype,
        }),
      );

      if (!deleteEventAttachmentThunk.fulfilled.match(resultAction)) {
        throw new Error(
          typeof resultAction.payload === 'string'
            ? resultAction.payload
            : resultAction.payload?.message || 'Failed to delete attachment',
        );
      }

      setEventAttachments((prev) => prev.filter((att) => att.childRowId !== child_row_id));
    },
    [dispatch],
  );

  const handleUploadAttachments = useCallback(
    async ({ files, type, url, attachment_name } = {}) => {
      const resolvedEventId = eventFields?.name || name;
      if (!resolvedEventId) {
        throw new Error('Event not loaded');
      }
      const fileList = Array.isArray(files) ? files.filter(Boolean) : [];
      const trimmedUrl = String(url ?? '').trim();
      if (fileList.length === 0 && !trimmedUrl) {
        throw new Error('No files selected and no URL provided');
      }

      const resultAction = await dispatch(
        uploadEventAttachmentThunk({
          event: resolvedEventId,
          files: fileList,
          type: type || '',
          url: trimmedUrl || '',
          attachment_name: attachment_name || '',
        }),
      );

      if (!uploadEventAttachmentThunk.fulfilled.match(resultAction)) {
        const p = resultAction.payload;
        throw new Error(typeof p === 'string' ? p : p?.message || 'Failed to upload attachment');
      }

      const rawRows = extractAttachmentsFromUploadPayload(resultAction.payload);
      if (rawRows.length > 0) {
        return rawRows.map((att, idx) => mapEventAttachmentRow(att, idx));
      }

      //If no raw rows, refresh the event details to get the updated attachments
      const refreshAction = await dispatch(getEventDetailThunk({ eventId: resolvedEventId }));
      if (!getEventDetailThunk.fulfilled.match(refreshAction)) {
        const p = refreshAction.payload;
        throw new Error(typeof p === 'string' ? p : p?.message || 'Failed to refresh attachments');
      }
      const doc = unwrapEventDetailPayload(refreshAction.payload);
      setEventAttachments(normalizeEventAttachments(doc));
      return [];
    },
    [dispatch, eventFields?.name, name],
  );

  useEffect(() => {
    let cancelled = false;
    const fetchEvent = async () => {
      if (!name) return;
      setIsLoading(true);
      setLoadError(null);
      try {
        const resultAction = await dispatch(getEventDetailThunk({ eventId: name }));
        if (!getEventDetailThunk.fulfilled.match(resultAction)) {
          throw new Error(
            typeof resultAction.payload === 'string'
              ? resultAction.payload
              : resultAction.payload?.message || 'Failed to load event',
          );
        }
        const doc = unwrapEventDetailPayload(resultAction.payload);
        if (cancelled) return;

        const nextFields = {
          name: doc?.name || '',
          event_name: doc?.event_name || '',
          owner: doc?.owner || doc?.created_by || '',
          created_by: doc?.created_by || doc?.owner || '',
          brandcompany_name: doc?.brandcompany_name || '',
          centre_name: Array.isArray(doc?.centre_name) ? doc.centre_name : doc?.centre_name || '',
          all_centers:
            doc?.all_centers === 1 ||
            doc?.all_centers === true ||
            doc?.all_centers === '1' ||
            String(doc?.all_centers || '').toLowerCase() === 'yes',
          assignee: Array.isArray(doc?.assignee)
            ? doc.assignee
                .map((row) => {
                  if (typeof row === 'string') return row;
                  if (row && typeof row === 'object')
                    return row.user || row.value || row.email || '';
                  return '';
                })
                .map((v) => String(v).trim())
                .filter(Boolean)
            : doc?.assignee
              ? [String(doc.assignee).trim()].filter(Boolean)
              : [],
          event_type: doc?.event_type || '',
          event_category: doc?.event_category || '',
          partner_name: doc?.partner_name || '',
          partner_owner: doc?.partner_owner || '',
          // sub_category: doc?.sub_category || '',
          engagement_mode: doc?.engagement_mode || '',
          revenue_mode: normalizeEventRevenueModeValue(doc?.revenue_mode || ''),
          status: doc?.status || '',
          status_color: doc?.status_color ?? null,
          community_status_color: doc?.community_status_color ?? null,
          facilities_needed: Array.isArray(doc?.facilities_needed) ? doc.facilities_needed : [],
          event_details: doc?.event_details || '',

          participation_type: doc?.participation_type || '',
          registration_deadline: doc?.registration_deadline || '',
          max_registrations: doc?.max_registrations ?? '',
          community_status: doc?.community_status || doc?.status || '',
          all_clients: doc?.all_clients ?? '',
          approval_required: doc?.approval_required ?? '',
          clients: doc?.clients ?? doc?.clients_applicable_list ?? '',
          total_registered: doc?.total_registered ?? doc?.registrations_count ?? '',
          registration_mode: doc?.registration_mode ?? doc?.registration_form_mode ?? '',
          max_seats: doc?.max_seats ?? doc?.seat_capacity ?? '',
          minimum_team_members: doc?.minimum_team_members ?? '',
          maximum_team_members: doc?.maximum_team_members ?? '',
          agenda: Array.isArray(doc?.agenda)
            ? doc.agenda
            : Array.isArray(doc?.agenda_items)
              ? doc.agenda_items
              : [],
        };

        nextFields.start_datetime = apiEventDatetimeToIso(
          getEventDatetimeField(doc, 'start_datetime'),
        );
        nextFields.end_datetime = apiEventDatetimeToIso(getEventDatetimeField(doc, 'end_datetime'));

        setEventFields(nextFields);
        setEventName(nextFields.event_name);
        setModuleType(resolveEventModuleType(doc?.event_type));
        setSpocDetails({
          name: doc?.spoc_name || '',
          phone: doc?.spoc_phone || '',
          email: doc?.spoc_email || '',
        });
        setEventAttachments(normalizeEventAttachments(doc));
      } catch (error) {
        if (!cancelled) setLoadError(error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchEvent();
    return () => {
      cancelled = true;
    };
  }, [name]);

  useEffect(() => {
    dispatch(getEventCentersThunk({ page: 1, pageSize: 900 }));
    dispatch(getEventClientsThunk({ page: 1, pageSize: 900 }));
  }, [dispatch]);

  return (
    <PageLayout showDefaultHeader={false}>
      <div className='flex h-full w-full flex-col'>
        {/* Header */}
        <div className='pt-6 pb-[14px] pl-6 pr-8 w-full  border-stroke-soft-200 bg-bg-white-0'>
          <div className='flex items-center justify-between gap-3 w-full'>
            <div className='flex items-center gap-4 min-w-0'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                aria-label='Back'
                onClick={() => {
                  const loaded = Boolean(!isLoading && !loadError && eventFields?.name);
                  if (loaded) {
                    const errs = getEventDetailLeaveValidationErrors(eventFields, moduleType);
                    if (errs.length > 0) {
                      showErrorToast(errs.join(' '), { defaultMessage: errs[0] });
                      return;
                    }
                  }
                  navigate(-1);
                }}
              >
                <Button.Icon as={RiArrowLeftSLine} size={20} />
              </Button.Root>

              <div className='flex flex-col  gap-2'>
                <div className='flex flex-col items-center flex-row  gap-3 min-w-0'>
                  {!isEditingName ? (
                    <div
                      className='flex items-center gap-2 min-w-0 label-large text-text-strong-950'
                      onClick={() => setIsEditingName(true)}
                    >
                      <span className='truncate'>{eventName}</span>
                    </div>
                  ) : (
                    <Input.Root size='small' className='min-w-[250px] max-w-[400px]'>
                      <Input.Wrapper>
                        <Input.Input
                          type='text'
                          value={eventName}
                          autoFocus
                          onChange={(e) => setEventName(e.target.value)}
                          onBlur={() => {
                            commitEventTitleFromHeader(eventName);
                            setIsEditingName(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  )}
                  {renderEventHeaderStatusBadge(
                    moduleType === 'community'
                      ? eventFields.community_status || eventFields.status
                      : eventFields.status || eventFields.community_status,
                    moduleType === 'community'
                      ? (eventFields.community_status_color ?? eventFields.status_color)
                      : (eventFields.status_color ?? eventFields.community_status_color),
                    'whitespace-nowrap',
                  )}
                </div>
                <div className='flex   gap-2 text-paragraph-xs text-text-sub-500'>
                  <Badge.Root size='small' variant='light' color='blue'>
                    {eventScheduleBadgeLabel}
                  </Badge.Root>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className='flex-1 w-full overflow-hidden flex flex-col min-h-0'>
          <div className='flex-1 min-h-0'>
            <TabMenuHorizontal.Root
              value={activeTab}
              onValueChange={handleEventTabChange}
              className='flex flex-col h-full min-h-0'
            >
              <TabMenuHorizontal.List wrapperClassName='w-full shrink-0' className='px-4'>
                {permittedEventTabs.map((tab) => {
                  const IconComponent =
                    activeTab === tab.value ? tab.activeIcon || tab.icon : tab.icon;
                  return (
                    <TabMenuHorizontal.Trigger key={tab.value} value={tab.value}>
                      {IconComponent ? <TabMenuHorizontal.Icon as={IconComponent} /> : null}
                      {tab.label}
                    </TabMenuHorizontal.Trigger>
                  );
                })}
              </TabMenuHorizontal.List>

              {/* Basic Details Tab */}
              <TabMenuHorizontal.Content
                value='basic-details'
                className='flex-1 min-h-0  overflow-y-auto px-6'
              >
                <BasicDetailsByModule
                  moduleType={moduleType}
                  eventFields={eventFields}
                  onChange={handleFieldChange}
                  onScheduleCommit={handleScheduleCommit}
                  spocDetails={spocDetails}
                  onOpenSpocModal={() => setIsEditSpocOpen(true)}
                  clientOptions={clientOptions}
                  centerOptions={centerOptions}
                  centerLabelById={centerLabelById}
                  partnerOptions={partnerOptions}
                  statusSelectOptions={statusSelectOptions}
                  centersReadOnly={scopeFieldsReadOnly}
                  clientsReadOnly={scopeFieldsReadOnly}
                  showAllCentersOption={canSelectAllCentersAndClients}
                  showAllClientsOption={canSelectAllCentersAndClients}
                  eventAttachments={eventAttachments}
                  onUploadAttachments={handleUploadAttachments}
                  onDeleteAttachment={handleDeleteAttachment}
                />
              </TabMenuHorizontal.Content>

              {/* Event Details Tab */}
              <TabMenuHorizontal.Content
                value='event-details'
                className='flex-1 min-h-0  overflow-y-auto px-6 py-5'
              >
                <EventDetailsByModule
                  moduleType={moduleType}
                  eventFields={eventFields}
                  onChange={handleFieldChange}
                  speakers={speakers}
                  onAddSpeaker={() => setIsAddSpeakerOpen(true)}
                  onEditSpeaker={(index) => {
                    setEditingSpeakerIndex(index);
                    setIsAddSpeakerOpen(true);
                  }}
                />
              </TabMenuHorizontal.Content>

              <TabMenuHorizontal.Content
                value='participants'
                className='flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-5 sm:pb-8 sm:pt-6'
              >
                {moduleType === 'community' && activeTab === 'participants' ? (
                  <EventParticipantsTable
                    eventName={name}
                    centerFilterOptions={eventTaskCenterOptions}
                    clientFilterOptions={eventParticipantClientOptions}
                  />
                ) : (
                  <ComingSoonMessage message='This view is coming soon. For now, use the List or Calendar view to manage agreements.' />
                )}
              </TabMenuHorizontal.Content>

              <TabMenuHorizontal.Content
                value='event-tasks'
                className='flex-1 min-h-0 overflow-y-auto py-4 px-6'
              >
                {activeTab === 'event-tasks' ? (
                  <EventTasksTable
                    tabMountNonce={eventTasksTabNonce}
                    eventName={name}
                    moduleType={moduleType}
                    eventCenterOptions={eventTaskCenterOptions}
                    eventCenters={eventTaskCenters}
                    eventAllCenters={Boolean(
                      eventFields.all_centers === true ||
                      eventFields.all_centers === 1 ||
                      eventFields.all_centers === '1',
                    )}
                  />
                ) : null}
              </TabMenuHorizontal.Content>

              <TabMenuHorizontal.Content
                value='public-page-details'
                className='flex-1 min-h-0 overflow-y-auto py-4 px-6'
              >
                <ComingSoonMessage message='This view is coming soon. For now, use the List or Calendar view to manage agreements.' />
              </TabMenuHorizontal.Content>

              <TabMenuHorizontal.Content
                value='activities'
                className='flex-1 min-h-0 flex flex-col overflow-hidden'
              >
                <EventActivity eventId={name} />
              </TabMenuHorizontal.Content>
            </TabMenuHorizontal.Root>
          </div>
        </div>
      </div>
      <EventEditSpocModal
        open={isEditSpocOpen}
        onOpenChange={setIsEditSpocOpen}
        values={spocDetails}
        onSave={handleSpocSave}
      />
      <EventAddSpeakerModal
        open={isAddSpeakerOpen}
        onOpenChange={(open) => {
          setIsAddSpeakerOpen(open);
          if (!open) {
            setEditingSpeakerIndex(null);
          }
        }}
        values={editingSpeakerIndex !== null ? speakers[editingSpeakerIndex] : undefined}
        isEdit={editingSpeakerIndex !== null}
        onSave={(speaker) => {
          if (editingSpeakerIndex !== null) {
            setSpeakers((prev) =>
              prev.map((item, idx) => (idx === editingSpeakerIndex ? speaker : item)),
            );
            setEditingSpeakerIndex(null);
            return;
          }
          setSpeakers((prev) => [...prev, speaker]);
        }}
      />
    </PageLayout>
  );
};

export default ViewEventPage;
