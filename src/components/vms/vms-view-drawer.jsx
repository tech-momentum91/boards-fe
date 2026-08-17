import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RiCloseLine,
  RiCalendarLine,
  RiBuilding2Line,
  RiUserLine,
  RiMailLine,
  RiSmartphoneLine,
  RiCarLine,
  RiTimeLine,
  RiStickyNoteLine,
  RiChat2Line,
  RiFileTextLine,
  RiTeamLine,
  RiPriceTag3Line,
  RiBriefcaseLine,
  RiHammerLine,
  RiCalendarEventLine,
  RiBuildingLine,
  RiStackLine,
  RiUser2Line,
  RiArrowDownSLine,
  RiAttachment2,
} from 'react-icons/ri';
import ImagePreview from '@/components/ui/image-preview';
import * as Drawer from '@/components/ui/drawer';
import * as Badge from '@/components/ui/badge';
import { StatusColorPill } from '@/components/ui/status-color-pill';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import * as Input from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Datepicker } from '@/components/ui/datepicker';
import FieldRow from '@/components/ui/field-row';
import * as Textarea from '@/components/ui/textarea';
import { PhoneInputController } from '@/components/ui/phone-input';
import VmsComments from '@/components/vms/vms-comments';
import { useDispatch, useSelector } from 'react-redux';
import {
  cancelVisitThunk,
  fetchSourceListThunk,
  fetchPurposeOfVisitListThunk,
  fetchSupervisorListThunk,
  fetchVisitorComments,
  getClientListThunk,
  getVisitorDetailThunk,
  salesPersonListThunk,
  updateVisitorEntryThunk,
} from '@/redux/vmsSlice';
import { getCenterListThunk } from '@/redux/centerSlice';
import VmsRemoveModal from '@/components/vms/vms-remove-modal';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { BADGE_COLOUR } from '@/pages/vms/vms-constant';
import {
  TIME_OPTIONS,
  formatDurationDisplay,
  formatTimeToAPI,
  safeDisplayDateTime,
  visitDateTimeRawToDate,
  visitDateTimeRawToTimeOption,
} from '@/utils/date-utils';
import {
  DRAWER_STATUS_COLOR_MAP,
  VISITOR_WHOM_TO_MEET_INVITE_LABEL,
  VISITOR_WHOM_TO_MEET_OPTIONS,
} from '@/components/vms/constants';
import AttachmentList from '@/components/ui/attachment-list';
import { resolveFileUrl } from '@/lib/utils';
import { getVisitorDisplayName, resolveVisitorEntryId } from '@/utils/vms-visitor-entry';
import ErrorText from '@/components/ui/error-text';
import {
  clearValidationErrorsForSave,
  getFieldBlockingErrors,
  resolveWhomToMeet,
} from '@/components/vms/vms-entry-edit-validation';

/** Mirrors `Input.Wrapper` horizontal padding for `borderless` + `xsmall` so read-only text lines up with inputs. */
const FIELD_VALUE_READ_ONLY_WRAP = 'flex min-h-8 w-full items-center px-2';

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const EMPTY_VMS_FIELD_ERRORS = {
  first_name: '',
  last_name: '',
  mobile_number: '',
  email: '',
  center: '',
  no_of_visitors: '',
  host: '',
  host_company_name: '',
  purpose_of_visit: '',
  other_purpose: '',
  visit_date_time: '',
  type_of_space: '',
  seats: '',
  other_source: '',
  vendor: '',
  assigned_supervisor: '',
  material_desc: '',
  cp_type: '',
  cp_company_legal_name: '',
  ipc_name: '',
  client_first_name: '',
  client_last_name: '',
  client_mobile_number: '',
  client_email: '',
};

const createEmptyVmsFieldErrors = () => ({ ...EMPTY_VMS_FIELD_ERRORS });

const getStatusBadge = (status) => {
  const color = DRAWER_STATUS_COLOR_MAP[status] || 'gray';
  return { label: status || '--', color };
};

/** Normalize VMS record for display (visitor, space-inquiry, vendor, event-participant). */
function normalizeVmsRecord(record) {
  if (!record) return null;
  return { ...record };
}

const CHANNEL_PARTNER_TYPE_OPTIONS = ['IPC', 'DPC', 'Digital'];

const TYPE_OF_SPACE_OPTIONS = [
  'Managed Office',
  'Co-working',
  'Manager Cabin',
  'Meeting Room',
  'Confrence Room',
  'Event Space',
  'Day Pass',
  'Managed Space',
  'Coworking Space',
];
const normalizeCpType = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'ipc') return 'IPC';
  if (normalized === 'dpc') return 'DPC';
  if (normalized === 'digital') return 'Digital';
  return '';
};

const VmsViewDrawer = ({
  isOpen = false,
  onClose,
  visitorEntryId: visitorEntryIdProp = null,
  record = null,
  onAddComment,
  onRefreshComments,
  commentsData = {},
  commentsLoading = false,
  commentsFetchStatus = 'idle',
}) => {
  const dispatch = useDispatch();

  const visitorDetail = useSelector((state) => state.vms.visitorDetail);
  const salesPersonListData = useSelector(
    (state) => state.vms.salesPersonList?.data?.message?.results,
  );
  const sourceListData = useSelector((state) => state.vms.sourceList?.data?.data);
  const purposeOfVisitListData = useSelector((state) => state.vms.purposeOfVisitList?.data?.data);
  const supervisorListData = useSelector(
    (state) => state.vms.supervisorList?.data?.message?.results,
  );
  const clientListData = useSelector((state) => state.vms.clientList?.data?.data);
  const { data: centerListData } = useSelector((state) => state.center.centerListData);

  const vmsRecord = React.useMemo(() => (record ? normalizeVmsRecord(record) : null), [record]);

  const centerOptions = useMemo(() => {
    return (Array.isArray(centerListData) ? centerListData : []).map((center) => ({
      value: center.name,
      label: center.center_name || center.name || 'Unnamed Center',
    }));
  }, [centerListData]);

  const whomToMeetOptions = useMemo(() => {
    return VISITOR_WHOM_TO_MEET_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
    }));
  }, []);

  const hostCompanyOptions = useMemo(() => {
    return (Array.isArray(clientListData) ? clientListData : []).map((client) => ({
      value: client.name,
      label: client.customer_name || client.name,
    }));
  }, [clientListData]);

  const visitTimeOptions = useMemo(() => {
    return TIME_OPTIONS.map((time) => ({
      value: time,
      label: time,
    }));
  }, []);

  const purposeOfVisitOptions = useMemo(() => {
    const list = (purposeOfVisitListData || [])
      .filter((purpose) => (purpose?.name || '').trim().toLowerCase() !== 'other')
      .map((purpose) => ({
        value: purpose.name,
        label: purpose.name,
      }));
    list.push({ value: 'Other', label: 'Other' });
    return list;
  }, [purposeOfVisitListData]);

  const cpTypeOptions = useMemo(() => {
    return CHANNEL_PARTNER_TYPE_OPTIONS.map((opt) => ({
      value: opt,
      label: opt,
    }));
  }, []);

  const typeOfSpaceOptions = useMemo(() => {
    return TYPE_OF_SPACE_OPTIONS.map((opt) => ({
      value: opt,
      label: opt,
    }));
  }, []);

  const sourceCategoryOptions = useMemo(() => {
    return (sourceListData || []).map((source) => ({
      value: source.name,
      label: source.lead_source || source.name,
    }));
  }, [sourceListData]);

  const salesPersonOptions = useMemo(() => {
    return (salesPersonListData || []).map((salesPerson) => ({
      value: salesPerson.name,
      label: salesPerson.full_name,
    }));
  }, [salesPersonListData]);

  const supervisorOptions = useMemo(() => {
    return (Array.isArray(supervisorListData) ? supervisorListData : []).map((sup) => ({
      value: String(sup.name),
      label: sup.employee_name || sup.name,
    }));
  }, [supervisorListData]);

  const materialCarryingOptions = useMemo(
    () => [
      { value: '1', label: 'Yes' },
      { value: '0', label: 'No' },
    ],
    [],
  );

  const { data, isLoading, error, status } = visitorDetail;

  const finalVisitorDetail = data?.message;

  const visitorEntryId = useMemo(() => {
    const fromProp = String(visitorEntryIdProp ?? '').trim();
    if (fromProp) return fromProp;
    return resolveVisitorEntryId(vmsRecord, null);
  }, [visitorEntryIdProp, vmsRecord]);

  const visitorDetailMatches = useMemo(() => {
    if (!finalVisitorDetail || !visitorEntryId) return false;
    return String(finalVisitorDetail.name ?? '') === String(visitorEntryId);
  }, [finalVisitorDetail?.name, visitorEntryId]);

  const activeDetail = visitorDetailMatches ? finalVisitorDetail : null;

  const [localChanges, setLocalChanges] = useState({});
  const [fieldErrors, setFieldErrors] = useState(createEmptyVmsFieldErrors);
  const [isDrawerFullyOpen, setIsDrawerFullyOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [localVisitDate, setLocalVisitDate] = useState(null);
  const [localVisitTime, setLocalVisitTime] = useState('');

  const formatDateLocalYYYYMMDD = useCallback((d) => {
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const visitor = React.useMemo(() => (activeDetail ? { ...activeDetail } : null), [activeDetail]);

  const getApiVal = useCallback(
    (apiKey, fallback = '') => {
      if (hasOwn(localChanges, apiKey)) return localChanges[apiKey];
      const v = visitor && hasOwn(visitor, apiKey) ? visitor[apiKey] : undefined;
      return v ?? fallback;
    },
    [visitor, localChanges],
  );

  const handleCheckOut = async () => {
    if (!visitorEntryId) return;
    try {
      await dispatch(
        updateVisitorEntryThunk({
          name: visitorEntryId,
          payload: { status: 'Checked Out' },
        }),
      ).unwrap();
      await dispatch(fetchVisitorComments({ visitorEntry: visitorEntryId })).unwrap();
      await dispatch(getVisitorDetailThunk(visitorEntryId)).unwrap();
      showSuccessToast('Visitor checked out successfully');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to check out visitor.' });
      console.error(error);
    }
  };

  const handleCancelVisit = async () => {
    if (!visitorEntryId) return;
    try {
      await dispatch(cancelVisitThunk({ visitor_entry: visitorEntryId })).unwrap();
      await dispatch(fetchVisitorComments({ visitorEntry: visitorEntryId })).unwrap();
      await dispatch(getVisitorDetailThunk(visitorEntryId)).unwrap();
      setIsCancelModalOpen(false);

      showSuccessToast('Visit cancelled successfully');
    } catch (error) {
      console.error(error);
    }
  };

  const visitorEntryType = activeDetail?.type || vmsRecord?.type || 'Visitor';

  const entryValidationContext = useMemo(
    () => ({
      entryType: visitorEntryType,
      spaceInquiryType: visitor?.space_inquiry_type || vmsRecord?.space_inquiry_type,
      cpType: normalizeCpType(visitor?.cp_type || vmsRecord?.cp_type || ''),
    }),
    [visitorEntryType, visitor, vmsRecord],
  );

  const handleFieldChange = useCallback(
    async (apiKey, value) => {
      if (!visitorEntryId) return;

      setLocalChanges((prev) => ({ ...prev, [apiKey]: value }));

      try {
        await dispatch(
          updateVisitorEntryThunk({
            name: visitorEntryId,
            payload: { [apiKey]: value },
          }),
        ).unwrap();
        await dispatch(fetchVisitorComments({ visitorEntry: visitorEntryId })).unwrap();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update visitor entry.' });
        console.error(error);
      }
    },
    [dispatch, visitorEntryId],
  );

  const validateAndPersistField = useCallback(
    (apiKey, value) => {
      const blocking = getFieldBlockingErrors(
        apiKey,
        value,
        visitor,
        localChanges,
        entryValidationContext,
      );
      if (Object.keys(blocking).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...blocking }));
        return false;
      }
      setFieldErrors((prev) => clearValidationErrorsForSave(prev, apiKey));
      void handleFieldChange(apiKey, value);
      return true;
    },
    [visitor, localChanges, entryValidationContext, handleFieldChange],
  );
  const isPastVisit = useMemo(() => {
    const raw = getApiVal('visit_date_time', activeDetail?.visit_date_time);
    if (!raw) return false;
    const visitDate = visitDateTimeRawToDate(raw);
    if (!(visitDate instanceof Date) || Number.isNaN(visitDate.getTime())) return false;
    return visitDate.getTime() < Date.now();
  }, [getApiVal, activeDetail?.visit_date_time]);

  const clearFieldError = useCallback((apiKey) => {
    setFieldErrors((prev) => ({ ...prev, [apiKey]: '' }));
  }, []);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setIsDrawerFullyOpen(true), 300);
      return () => clearTimeout(t);
    }
    setIsDrawerFullyOpen(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setLocalChanges({});
      setFieldErrors(createEmptyVmsFieldErrors());
    }
  }, [isOpen]);

  useEffect(() => {
    setFieldErrors(createEmptyVmsFieldErrors());
  }, [visitorEntryId]);

  useEffect(() => {
    if (isOpen && visitorEntryId) {
      dispatch(getVisitorDetailThunk(visitorEntryId));
    }
  }, [isOpen, visitorEntryId, dispatch]);

  useEffect(() => {
    if (!isOpen) return;
    dispatch(getCenterListThunk({ keyword: '', filters: [], pageSize: 999 })).catch(() => {});
    dispatch(getClientListThunk()).catch(() => {});
    dispatch(salesPersonListThunk()).catch(() => {});
    dispatch(fetchSupervisorListThunk()).catch(() => {});
    dispatch(fetchSourceListThunk()).catch(() => {});
    dispatch(fetchPurposeOfVisitListThunk()).catch(() => {});
  }, [isOpen, dispatch]);

  const visitorPhotoUrl = React.useMemo(() => {
    const path = getApiVal('custom_visitor_photo', activeDetail?.custom_visitor_photo ?? '');
    return path ? resolveFileUrl(path) : '';
  }, [getApiVal, activeDetail?.custom_visitor_photo]);

  const [showVisitorPhoto, setShowVisitorPhoto] = useState(true);
  const [visitorPhotoLightboxOpen, setVisitorPhotoLightboxOpen] = useState(false);
  useEffect(() => {
    setShowVisitorPhoto(true);
  }, [visitorPhotoUrl]);

  const materialPhotoAttachments = React.useMemo(() => {
    const rows = visitor?.custom_material_photos;
    if (!Array.isArray(rows) || rows.length === 0) return [];
    return rows
      .filter((row) => row?.image)
      .map((row, index) => {
        const path = row.image;
        const fileName = String(path).split('/').pop() || `material-${index + 1}.jpg`;
        return {
          id: row.name || `material-${index}`,
          file_url: resolveFileUrl(path),
          fileName,
          isImage: true,
        };
      });
  }, [visitor?.custom_material_photos]);

  useEffect(() => {
    if (!visitor) {
      setLocalVisitDate(null);
      setLocalVisitTime('');
      return;
    }
    const raw = visitor.visit_date_time;
    if (!raw) {
      setLocalVisitDate(null);
      setLocalVisitTime('');
      return;
    }
    setLocalVisitDate(visitDateTimeRawToDate(raw));
    setLocalVisitTime(visitDateTimeRawToTimeOption(raw));
  }, [visitor]);

  if (!isOpen) return null;

  const getVal = (key, fallback = '') =>
    vmsRecord && hasOwn(vmsRecord, key) ? (vmsRecord[key] ?? fallback) : fallback;

  const recordId = visitorEntryId || '--';
  const recordTitle = getVisitorDisplayName(vmsRecord, activeDetail) || recordId || '--';
  const statusValue = getApiVal('status', activeDetail?.status || vmsRecord?.status || '');
  const statusBadge = getStatusBadge(statusValue);
  const cpTypeValue = normalizeCpType(
    getApiVal('cp_type', activeDetail?.cp_type || vmsRecord?.cp_type || ''),
  );
  const shouldShowIpcName = cpTypeValue === 'IPC' || cpTypeValue === 'DPC';
  const entryType = activeDetail?.type || vmsRecord?.type || 'Visitor';
  const showDrawerSkeleton =
    !isDrawerFullyOpen || !vmsRecord || (isLoading && !visitorDetailMatches);

  /** Space Channel Partner invite stores company/contact in `company_name` + `client_*`; listview uses `cp_*`. */
  const cpCompanyLegalInputValue =
    getApiVal('cp_company_legal_name') || getApiVal('company_name') || '';
  const cpContactNameInputValue =
    (getApiVal('cp_contact_name') || '').trim() ||
    [getApiVal('client_first_name'), getApiVal('client_last_name')]
      .filter(Boolean)
      .join(' ')
      .trim();
  const cpContactMobileInputValue =
    getApiVal('cp_contact_mobile') || getApiVal('client_mobile_number') || '';
  const cpContactEmailInputValue = getApiVal('cp_contact_email') || getApiVal('client_email') || '';
  const sourceCategoryValue = String(getApiVal('source_category') ?? '').trim();
  const isOtherSourceSelected = sourceCategoryValue === 'Other';
  const cpContactNameError =
    fieldErrors.client_first_name || fieldErrors.client_last_name || fieldErrors.cp_contact_name;
  const cpContactMobileError = fieldErrors.client_mobile_number || fieldErrors.cp_contact_mobile;
  const cpContactEmailError = fieldErrors.client_email || fieldErrors.cp_contact_email;
  const resolvedWhomToMeet = resolveWhomToMeet(visitor, localChanges);

  const handleDrawerOpenChange = (open) => {
    if (open === false && visitorPhotoLightboxOpen) return;
    if (open === false) onClose?.();
  };

  const preventDrawerDismissWhilePreviewOpen = (event) => {
    if (visitorPhotoLightboxOpen) {
      event.preventDefault();
    }
  };

  return (
    <>
      <ImagePreview
        images={
          visitorPhotoUrl
            ? [{ src: visitorPhotoUrl, alt: 'Visitor', caption: 'Visitor photo' }]
            : []
        }
        initialIndex={0}
        open={visitorPhotoLightboxOpen}
        onClose={() => setVisitorPhotoLightboxOpen(false)}
      />
      <Drawer.Root open={isOpen} onOpenChange={handleDrawerOpenChange}>
        <Drawer.Content
          className='max-w-[1200px]'
          onPointerDownOutside={preventDrawerDismissWhilePreviewOpen}
          onInteractOutside={preventDrawerDismissWhilePreviewOpen}
          onEscapeKeyDown={preventDrawerDismissWhilePreviewOpen}
        >
          <Drawer.Header
            className='px-6 py-3 border-b border-stroke-soft-200'
            showCloseButton={false}
          >
            <div className='flex items-center justify-end w-full'>
              {showDrawerSkeleton ? (
                <>
                  <div className='h-8 w-48 bg-bg-weak-100 rounded animate-pulse' />
                  <div className='flex items-center gap-2'>
                    <div className='h-8 w-28 bg-bg-weak-100 rounded animate-pulse' />
                    <div className='h-8 w-8 bg-bg-weak-100 rounded animate-pulse' />
                  </div>
                </>
              ) : (
                <>
                  <div className='flex items-center gap-3'>
                    {statusValue === 'Checked In' ? (
                      <Button.Root
                        variant='error'
                        mode='filled'
                        size='xsmall'
                        onClick={handleCheckOut}
                      >
                        Check Out
                      </Button.Root>
                    ) : statusValue === 'Invited' && !isPastVisit ? (
                      <Button.Root
                        variant='error'
                        mode='filled'
                        size='xsmall'
                        onClick={() => setIsCancelModalOpen(true)}
                      >
                        Cancel Invitation
                      </Button.Root>
                    ) : null}
                    <Button.Root variant='neutral' mode='stroke' size='xsmall' onClick={onClose}>
                      <Button.Icon as={RiCloseLine} />
                    </Button.Root>
                  </div>
                </>
              )}
            </div>
          </Drawer.Header>

          <Drawer.Body className='flex-1 p-0 overflow-hidden flex flex-col'>
            {!isDrawerFullyOpen ? (
              <div className='flex items-center justify-center flex-1 p-8'>
                <div className='h-8 w-8 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
              </div>
            ) : !vmsRecord ? (
              <div className='flex items-center justify-center flex-1 p-8'>
                <span className='text-paragraph-sm text-text-sub-600'>No record selected.</span>
              </div>
            ) : (
              <div className='flex flex-1 min-h-0'>
                {/* Left Panel - VMS Record Details */}
                <div className='w-[430px] border-r border-stroke-soft-200 overflow-y-auto shrink-0'>
                  <div className='px-6 pt-5 pb-6 flex flex-col gap-3'>
                    {/* Visitor details */}
                    <div className='flex flex-col gap-6'>
                      <div className='w-full flex flex-col gap-2 items-start'>
                        <div className='flex w-full flex-row items-start gap-4'>
                          {visitorPhotoUrl && showVisitorPhoto ? (
                            <div className='relative shrink-0 overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-weak-100'>
                              <button
                                type='button'
                                onClick={() => setVisitorPhotoLightboxOpen(true)}
                                className='size-20 cursor-zoom-in focus:outline-none'
                                aria-label='View full image'
                              >
                                <img
                                  src={visitorPhotoUrl}
                                  alt='Visitor'
                                  className='size-20 object-cover'
                                  loading='lazy'
                                  onError={() => setShowVisitorPhoto(false)}
                                />
                              </button>
                            </div>
                          ) : null}
                          <div className='flex min-w-0 flex-1 flex-col gap-2'>
                            <h2 className='title-h5 text-text-strong-950 w-full capitalize'>
                              {(() => {
                                const first = String(getApiVal('first_name') ?? '').trim();
                                const last = String(getApiVal('last_name') ?? '').trim();
                                const full = [first, last].filter(Boolean).join(' ').trim();
                                return full || '—';
                              })()}
                            </h2>

                            <div className='w-full flex flex-wrap items-center gap-2'>
                              {activeDetail?.space_inquiry_type && (
                                <Badge.Root variant='stroke' color='gray'>
                                  {activeDetail?.space_inquiry_type}
                                </Badge.Root>
                              )}

                              <Badge.Root
                                variant='light'
                                color={BADGE_COLOUR[activeDetail?.status]}
                              >
                                {activeDetail?.status}
                              </Badge.Root>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                        {/* <FieldRow icon={RiPriceTag3Line} label='Status' editable>
                        <Select.Root
                          variant='borderless'
                          value={statusValue || ''}
                          onValueChange={(v) => validateAndPersistField('status', v)}
                          size='xsmall'
                        >
                          <Select.Trigger className='w-full' showArrow={false}>
                            <Select.Value asChild>
                              <Badge.Root
                                variant='light'
                                color={BADGE_COLOUR[activeDetail?.status]}
                                className='text-nowrap'
                              >
                                {statusBadge.label}
                              </Badge.Root>
                            </Select.Value>
                          </Select.Trigger>
                          <Select.Content>
                            {VMS_STATUS_OPTIONS.map((opt) => (
                              <Select.Item key={opt.value} value={opt.value}>
                                <Badge.Root variant='light' color={getStatusBadge(opt.value).color}>
                                  {opt.label}
                                </Badge.Root>
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      </FieldRow> */}

                        <FieldRow icon={RiUserLine} label='First Name' editable required>
                          <Input.Root
                            variant='borderless'
                            size='xsmall'
                            className='min-h-0'
                            hasError={Boolean(fieldErrors.first_name)}
                          >
                            <Input.Wrapper>
                              <Input.Input
                                value={getApiVal('first_name') ?? ''}
                                onChange={(e) => {
                                  setLocalChanges((p) => ({
                                    ...p,
                                    first_name: e.target.value,
                                  }));
                                  if (fieldErrors.first_name) clearFieldError('first_name');
                                }}
                                onBlur={(e) =>
                                  validateAndPersistField('first_name', e.target.value.trim())
                                }
                                placeholder='-'
                              />
                            </Input.Wrapper>
                          </Input.Root>
                          {fieldErrors.first_name ? (
                            <ErrorText>{fieldErrors.first_name}</ErrorText>
                          ) : null}
                        </FieldRow>

                        <FieldRow icon={RiUserLine} label='Last Name' editable required>
                          <Input.Root
                            variant='borderless'
                            size='xsmall'
                            className='min-h-0'
                            hasError={Boolean(fieldErrors.last_name)}
                          >
                            <Input.Wrapper>
                              <Input.Input
                                value={getApiVal('last_name') ?? ''}
                                onChange={(e) => {
                                  setLocalChanges((p) => ({
                                    ...p,
                                    last_name: e.target.value,
                                  }));
                                  if (fieldErrors.last_name) clearFieldError('last_name');
                                }}
                                onBlur={(e) =>
                                  validateAndPersistField('last_name', e.target.value.trim())
                                }
                                placeholder='-'
                              />
                            </Input.Wrapper>
                          </Input.Root>
                          {fieldErrors.last_name ? (
                            <ErrorText>{fieldErrors.last_name}</ErrorText>
                          ) : null}
                        </FieldRow>

                        <FieldRow icon={RiSmartphoneLine} label='Mobile Number' editable required>
                          <PhoneInputController
                            value={getApiVal('mobile_number') ?? ''}
                            onChange={(formattedValue) => {
                              setLocalChanges((p) => ({
                                ...p,
                                mobile_number: formattedValue,
                              }));
                              if (fieldErrors.mobile_number) clearFieldError('mobile_number');
                            }}
                            size='xsmall'
                            variant='borderless'
                            placeholder='9876500011'
                            maxLength={10}
                            inputProps={{
                              onBlur: () => {
                                const v = getApiVal('mobile_number') ?? '';
                                validateAndPersistField('mobile_number', v);
                              },
                            }}
                          />
                          {fieldErrors.mobile_number ? (
                            <ErrorText>{fieldErrors.mobile_number}</ErrorText>
                          ) : null}
                        </FieldRow>

                        <FieldRow icon={RiMailLine} label='Email' editable required>
                          <Input.Root
                            variant='borderless'
                            size='xsmall'
                            className='min-h-0'
                            hasError={Boolean(fieldErrors.email)}
                          >
                            <Input.Wrapper>
                              <Input.Input
                                value={getApiVal('email') ?? ''}
                                onChange={(e) => {
                                  setLocalChanges((p) => ({
                                    ...p,
                                    email: e.target.value,
                                  }));
                                  if (fieldErrors.email) clearFieldError('email');
                                }}
                                onBlur={(e) =>
                                  validateAndPersistField('email', e.target.value.trim())
                                }
                                placeholder='-'
                              />
                            </Input.Wrapper>
                          </Input.Root>
                          {fieldErrors.email ? <ErrorText>{fieldErrors.email}</ErrorText> : null}
                        </FieldRow>

                        <FieldRow icon={RiBuilding2Line} label='Center' editable required>
                          <SearchableSelect
                            variant='borderless'
                            size='xsmall'
                            value={getApiVal('center') ?? activeDetail?.center ?? ''}
                            onValueChange={(v) => {
                              validateAndPersistField('center', v);
                            }}
                            hasError={Boolean(fieldErrors.center)}
                            options={centerOptions}
                            placeholder={activeDetail?.center_name || 'Select center'}
                            triggerClassName='w-full text-left'
                          />
                          {fieldErrors.center ? <ErrorText>{fieldErrors.center}</ErrorText> : null}
                        </FieldRow>

                        {entryType !== 'Vendor' && (
                          <FieldRow
                            icon={RiBriefcaseLine}
                            label={
                              entryType === 'Visitor' ? 'Visitor Company Name' : 'Company Name'
                            }
                            truncate
                          >
                            <Input.Root variant='borderless' size='xsmall' className='min-h-0'>
                              <Input.Wrapper>
                                <Input.Input
                                  value={getApiVal('company_name') ?? ''}
                                  onChange={(e) =>
                                    setLocalChanges((p) => ({
                                      ...p,
                                      company_name: e.target.value,
                                    }))
                                  }
                                  onBlur={(e) =>
                                    validateAndPersistField('company_name', e.target.value)
                                  }
                                  placeholder='-'
                                />
                              </Input.Wrapper>
                            </Input.Root>
                          </FieldRow>
                        )}

                        <FieldRow
                          icon={RiTeamLine}
                          label='No. of Visitors'
                          editable={entryType === 'Visitor'}
                          required={entryType === 'Visitor'}
                        >
                          <Input.Root
                            variant='borderless'
                            size='xsmall'
                            className='min-h-0'
                            hasError={Boolean(fieldErrors.no_of_visitors)}
                          >
                            <Input.Wrapper>
                              <Input.Input
                                type='number'
                                inputMode='numeric'
                                value={getApiVal('no_of_visitors') ?? ''}
                                onChange={(e) => {
                                  setLocalChanges((p) => ({
                                    ...p,
                                    no_of_visitors:
                                      e.target.value === '' ? '' : Number(e.target.value),
                                  }));
                                  if (fieldErrors.no_of_visitors) clearFieldError('no_of_visitors');
                                }}
                                onBlur={(e) => {
                                  const v = e.target.value === '' ? '' : Number(e.target.value);
                                  validateAndPersistField(
                                    'no_of_visitors',
                                    Number.isNaN(Number(v)) ? '' : v,
                                  );
                                }}
                                placeholder='-'
                              />
                            </Input.Wrapper>
                          </Input.Root>
                          {fieldErrors.no_of_visitors ? (
                            <ErrorText>{fieldErrors.no_of_visitors}</ErrorText>
                          ) : null}
                        </FieldRow>

                        {entryType === 'Visitor' && (
                          <>
                            <FieldRow
                              icon={RiUser2Line}
                              label={VISITOR_WHOM_TO_MEET_INVITE_LABEL}
                              editable
                              required
                            >
                              <div className='flex w-full flex-col gap-1'>
                                <SearchableSelect
                                  variant='borderless'
                                  size='xsmall'
                                  value={resolvedWhomToMeet}
                                  onValueChange={(nextWhomToMeet) => {
                                    if (nextWhomToMeet === 'devx') {
                                      setLocalChanges((p) => ({
                                        ...p,
                                        __whom_to_meet: 'devx',
                                        host_company_name: '',
                                      }));
                                      validateAndPersistField('host_company_name', '');
                                      return;
                                    }
                                    setLocalChanges((p) => ({ ...p, __whom_to_meet: 'client' }));
                                    if (!String(getApiVal('host_company_name') ?? '').trim()) {
                                      setFieldErrors((prev) => ({
                                        ...prev,
                                        host_company_name:
                                          'Host company is required when meeting a client',
                                      }));
                                    } else {
                                      setFieldErrors((prev) =>
                                        clearValidationErrorsForSave(prev, 'host_company_name'),
                                      );
                                    }
                                  }}
                                  options={whomToMeetOptions}
                                  placeholder='Select type'
                                  triggerClassName='w-full text-left'
                                />
                              </div>
                            </FieldRow>

                            {resolvedWhomToMeet === 'client' ? (
                              <FieldRow
                                icon={RiBuildingLine}
                                label='Host Company Name'
                                editable
                                required
                              >
                                <div className='flex w-full flex-col gap-1'>
                                  <SearchableSelect
                                    variant='borderless'
                                    size='xsmall'
                                    value={getApiVal('host_company_name') ?? ''}
                                    onValueChange={(v) => {
                                      validateAndPersistField('host_company_name', v);
                                    }}
                                    hasError={Boolean(fieldErrors.host_company_name)}
                                    options={hostCompanyOptions}
                                    placeholder='Select host company'
                                    triggerClassName='w-full text-left'
                                  />
                                  {fieldErrors.host_company_name ? (
                                    <ErrorText>{fieldErrors.host_company_name}</ErrorText>
                                  ) : null}
                                </div>
                              </FieldRow>
                            ) : null}

                            <FieldRow icon={RiUserLine} label='Host' editable required>
                              <div className='flex w-full flex-col gap-1'>
                                <Input.Root
                                  variant='borderless'
                                  size='xsmall'
                                  className='min-h-0'
                                  hasError={Boolean(fieldErrors.host)}
                                >
                                  <Input.Wrapper>
                                    <Input.Input
                                      value={
                                        hasOwn(localChanges, 'host')
                                          ? (localChanges.host ?? '')
                                          : visitor?.host_display_name || visitor?.host || ''
                                      }
                                      onChange={(e) => {
                                        setLocalChanges((p) => ({
                                          ...p,
                                          host: e.target.value,
                                        }));
                                        if (fieldErrors.host) clearFieldError('host');
                                      }}
                                      onBlur={(e) => {
                                        const v = e.target.value.trim();
                                        if (!v) {
                                          validateAndPersistField('host', '');
                                          return;
                                        }
                                        const canonical = visitor?.host || '';
                                        if (
                                          canonical &&
                                          (v === visitor.host_display_name || v === canonical)
                                        ) {
                                          validateAndPersistField('host', canonical);
                                          return;
                                        }
                                        validateAndPersistField('host', v);
                                      }}
                                      placeholder='-'
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                                {fieldErrors.host ? (
                                  <ErrorText>{fieldErrors.host}</ErrorText>
                                ) : null}
                              </div>
                            </FieldRow>
                          </>
                        )}

                        <FieldRow icon={RiCarLine} label='Vehicle No.' editable>
                          <Input.Root variant='borderless' size='xsmall' className='min-h-0'>
                            <Input.Wrapper>
                              <Input.Input
                                value={getApiVal('vehicle_number') ?? ''}
                                onChange={(e) =>
                                  setLocalChanges((p) => ({
                                    ...p,
                                    vehicle_number: e.target.value,
                                  }))
                                }
                                onBlur={(e) =>
                                  validateAndPersistField('vehicle_number', e.target.value)
                                }
                                placeholder='-'
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        </FieldRow>

                        <FieldRow icon={RiFileTextLine} label='Badge No.' editable>
                          <Input.Root variant='borderless' size='xsmall' className='min-h-0'>
                            <Input.Wrapper>
                              <Input.Input
                                value={getApiVal('badge_number') ?? ''}
                                onChange={(e) =>
                                  setLocalChanges((p) => ({
                                    ...p,
                                    badge_number: e.target.value,
                                  }))
                                }
                                onBlur={(e) =>
                                  validateAndPersistField('badge_number', e.target.value)
                                }
                                placeholder='-'
                              />
                            </Input.Wrapper>
                          </Input.Root>
                        </FieldRow>

                        <FieldRow icon={RiCalendarLine} label='Visit Date' editable>
                          <Datepicker
                            variant='borderless'
                            size='xsmall'
                            value={localVisitDate}
                            onChange={(date) => {
                              setLocalVisitDate(date || null);
                              const base = date ? formatDateLocalYYYYMMDD(date) : '';
                              const apiTime =
                                localVisitTime && TIME_OPTIONS.includes(localVisitTime)
                                  ? formatTimeToAPI(localVisitTime)
                                  : visitor?.visit_date_time
                                    ? formatTimeToAPI(
                                        visitDateTimeRawToTimeOption(visitor.visit_date_time),
                                      )
                                    : '00:00:00';
                              const next = base ? `${base} ${apiTime}` : '';
                              setLocalChanges((p) => ({
                                ...p,
                                visit_date_time: next,
                              }));
                              if (next) {
                                validateAndPersistField('visit_date_time', next);
                              } else {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  visit_date_time: 'Visit date and time are required',
                                }));
                              }
                            }}
                            placeholder='Select date'
                          />
                          {fieldErrors.visit_date_time ? (
                            <ErrorText>{fieldErrors.visit_date_time}</ErrorText>
                          ) : null}
                        </FieldRow>

                        <FieldRow icon={RiTimeLine} label='Visit Time' editable>
                          <SearchableSelect
                            variant='borderless'
                            size='xsmall'
                            value={localVisitTime || ''}
                            hasError={Boolean(fieldErrors.visit_date_time)}
                            onValueChange={(val) => {
                              setLocalVisitTime(val);
                              const baseDate =
                                localVisitDate && !Number.isNaN(localVisitDate.getTime())
                                  ? formatDateLocalYYYYMMDD(localVisitDate)
                                  : (() => {
                                      const d = visitDateTimeRawToDate(visitor?.visit_date_time);
                                      return d ? formatDateLocalYYYYMMDD(d) : '';
                                    })();

                              const apiTime = val ? formatTimeToAPI(val) : '00:00:00';
                              const next = baseDate ? `${baseDate} ${apiTime}` : '';
                              setLocalChanges((p) => ({
                                ...p,
                                visit_date_time: next,
                              }));
                              if (next) {
                                validateAndPersistField('visit_date_time', next);
                              } else {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  visit_date_time: 'Visit date and time are required',
                                }));
                              }
                            }}
                            options={visitTimeOptions}
                            placeholder='Select time'
                            triggerClassName='w-full text-left'
                          />
                        </FieldRow>

                        {entryType === 'Visitor' && (
                          <>
                            <FieldRow
                              icon={RiBriefcaseLine}
                              label='Purpose of Visit'
                              editable
                              required
                            >
                              <SearchableSelect
                                variant='borderless'
                                size='xsmall'
                                value={getApiVal('purpose_of_visit') ?? ''}
                                hasError={Boolean(
                                  fieldErrors.purpose_of_visit && !getApiVal('purpose_of_visit'),
                                )}
                                onValueChange={(v) => {
                                  const isOtherSelected =
                                    String(v || '')
                                      .trim()
                                      .toLowerCase() === 'other';
                                  setLocalChanges((p) => ({
                                    ...p,
                                    purpose_of_visit: v,
                                    other_purpose: isOtherSelected ? p.other_purpose : '',
                                  }));

                                  if (!isOtherSelected) {
                                    validateAndPersistField('purpose_of_visit', v);
                                    validateAndPersistField('other_purpose', '');
                                  }
                                }}
                                options={purposeOfVisitOptions}
                                placeholder='Select'
                                triggerClassName='w-full text-left'
                              />
                              {fieldErrors.purpose_of_visit && !getApiVal('purpose_of_visit') ? (
                                <ErrorText>{fieldErrors.purpose_of_visit}</ErrorText>
                              ) : null}
                            </FieldRow>

                            {String(getApiVal('purpose_of_visit') || '')
                              .trim()
                              .toLowerCase() === 'other' && (
                              <FieldRow
                                icon={RiBriefcaseLine}
                                label='Other Purpose'
                                editable
                                required
                              >
                                <div className='flex w-full flex-col gap-1'>
                                  <Input.Root
                                    variant='borderless'
                                    size='xsmall'
                                    className='min-h-0'
                                    hasError={Boolean(fieldErrors.other_purpose)}
                                  >
                                    <Input.Wrapper>
                                      <Input.Input
                                        value={getApiVal('other_purpose') ?? ''}
                                        onChange={(e) => {
                                          setLocalChanges((p) => ({
                                            ...p,
                                            other_purpose: e.target.value,
                                          }));
                                          if (fieldErrors.other_purpose)
                                            clearFieldError('other_purpose');
                                        }}
                                        onBlur={(e) => {
                                          const nextValue = e.target.value;
                                          if (
                                            String(getApiVal('purpose_of_visit') || '')
                                              .trim()
                                              .toLowerCase() === 'other'
                                          ) {
                                            validateAndPersistField('purpose_of_visit', 'Other');
                                          }
                                          validateAndPersistField('other_purpose', nextValue);
                                        }}
                                        placeholder='Type here'
                                      />
                                    </Input.Wrapper>
                                  </Input.Root>
                                  {fieldErrors.other_purpose ? (
                                    <ErrorText>{fieldErrors.other_purpose}</ErrorText>
                                  ) : null}
                                </div>
                              </FieldRow>
                            )}
                          </>
                        )}

                        <FieldRow icon={RiCalendarLine} label='Check In Date & Time'>
                          <div className={FIELD_VALUE_READ_ONLY_WRAP}>
                            <span className='min-w-0 truncate text-paragraph-sm text-text-strong-950'>
                              {safeDisplayDateTime(getApiVal('check_in_date_time'))}
                            </span>
                          </div>
                        </FieldRow>

                        <FieldRow icon={RiCalendarLine} label='Check Out Date & Time' truncate>
                          <div className={FIELD_VALUE_READ_ONLY_WRAP}>
                            <span className='min-w-0 truncate text-paragraph-sm text-text-strong-950'>
                              {safeDisplayDateTime(getApiVal('check_out_date_time'))}
                            </span>
                          </div>
                        </FieldRow>

                        <FieldRow icon={RiTimeLine} label='Duration'>
                          <div className={FIELD_VALUE_READ_ONLY_WRAP}>
                            <span className='min-w-0 truncate text-paragraph-sm text-text-strong-950'>
                              {formatDurationDisplay(getApiVal('duration'))}
                            </span>
                          </div>
                        </FieldRow>
                      </div>

                      {/* Channel Partner Details (for space inquiries with Channel Partner type) */}
                      {entryType === 'Space' &&
                        activeDetail?.space_inquiry_type === 'Channel Partner' && (
                          <div className='w-full flex flex-col gap-3'>
                            <div className='flex items-center gap-2 text-[var(--color-text-sub-500)] label-medium'>
                              <RiUserLine className='text-[var(--color-text-soft-400)]' size={20} />
                              Channel Partner Details
                            </div>
                            <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                              <FieldRow icon={RiPriceTag3Line} label='Type' editable required>
                                <SearchableSelect
                                  variant='borderless'
                                  size='xsmall'
                                  value={cpTypeValue}
                                  onValueChange={(v) => {
                                    const nextCpType = normalizeCpType(v);
                                    setLocalChanges((p) => ({
                                      ...p,
                                      cp_type: nextCpType,
                                      ...(nextCpType === 'Digital' ? { ipc_name: '' } : {}),
                                    }));
                                    validateAndPersistField('cp_type', nextCpType);
                                  }}
                                  hasError={Boolean(fieldErrors.cp_type && !cpTypeValue)}
                                  options={cpTypeOptions}
                                  placeholder='Select type'
                                  triggerClassName='w-full text-left'
                                />
                                {fieldErrors.cp_type && !cpTypeValue ? (
                                  <ErrorText>{fieldErrors.cp_type}</ErrorText>
                                ) : null}
                              </FieldRow>
                              {shouldShowIpcName && (
                                <FieldRow icon={RiUser2Line} label='IPC Name' editable required>
                                  <Input.Root
                                    variant='borderless'
                                    size='xsmall'
                                    className='min-h-0'
                                    hasError={Boolean(fieldErrors.ipc_name)}
                                  >
                                    <Input.Wrapper>
                                      <Input.Input
                                        value={getApiVal('ipc_name') ?? ''}
                                        onChange={(e) => {
                                          setLocalChanges((p) => ({
                                            ...p,
                                            ipc_name: e.target.value,
                                          }));
                                          if (fieldErrors.ipc_name) clearFieldError('ipc_name');
                                        }}
                                        onBlur={(e) =>
                                          validateAndPersistField('ipc_name', e.target.value.trim())
                                        }
                                        placeholder='-'
                                      />
                                    </Input.Wrapper>
                                  </Input.Root>
                                  {fieldErrors.ipc_name ? (
                                    <ErrorText>{fieldErrors.ipc_name}</ErrorText>
                                  ) : null}
                                </FieldRow>
                              )}
                              <FieldRow
                                icon={RiBuildingLine}
                                label='CP Company Legal Name'
                                editable
                                truncate
                                required
                              >
                                <Input.Root
                                  variant='borderless'
                                  size='xsmall'
                                  className='min-h-0'
                                  hasError={Boolean(fieldErrors.cp_company_legal_name)}
                                >
                                  <Input.Wrapper>
                                    <Input.Input
                                      value={cpCompanyLegalInputValue}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setLocalChanges((p) => ({
                                          ...p,
                                          cp_company_legal_name: v,
                                          company_name: v,
                                        }));
                                        if (fieldErrors.cp_company_legal_name) {
                                          clearFieldError('cp_company_legal_name');
                                        }
                                      }}
                                      onBlur={async (e) => {
                                        const v = e.target.value.trim();
                                        validateAndPersistField('cp_company_legal_name', v);
                                        validateAndPersistField('company_name', v);
                                      }}
                                      placeholder='-'
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                                {fieldErrors.cp_company_legal_name ? (
                                  <ErrorText>{fieldErrors.cp_company_legal_name}</ErrorText>
                                ) : null}
                              </FieldRow>
                              <FieldRow
                                icon={RiTeamLine}
                                label='Client Company Name'
                                truncate
                                editable
                              >
                                <Input.Root variant='borderless' size='xsmall' className='min-h-0'>
                                  <Input.Wrapper>
                                    <Input.Input
                                      value={getApiVal('client_company_name') ?? ''}
                                      onChange={(e) =>
                                        setLocalChanges((p) => ({
                                          ...p,
                                          client_company_name: e.target.value,
                                        }))
                                      }
                                      onBlur={(e) =>
                                        validateAndPersistField(
                                          'client_company_name',
                                          e.target.value,
                                        )
                                      }
                                      placeholder='-'
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                              </FieldRow>
                              <FieldRow
                                icon={RiUser2Line}
                                label='CP Contact Name'
                                truncate
                                editable
                                required
                              >
                                <Input.Root
                                  variant='borderless'
                                  size='xsmall'
                                  className='min-h-0'
                                  hasError={Boolean(cpContactNameError)}
                                >
                                  <Input.Wrapper>
                                    <Input.Input
                                      value={cpContactNameInputValue}
                                      onChange={(e) => {
                                        setLocalChanges((p) => ({
                                          ...p,
                                          cp_contact_name: e.target.value,
                                        }));
                                        if (cpContactNameError) {
                                          clearFieldError('client_first_name');
                                          clearFieldError('client_last_name');
                                          clearFieldError('cp_contact_name');
                                        }
                                      }}
                                      onBlur={async (e) => {
                                        const v = e.target.value.trim();
                                        const parts = v.split(/\s+/).filter(Boolean);
                                        validateAndPersistField('cp_contact_name', v);
                                        validateAndPersistField(
                                          'client_first_name',
                                          parts[0] || '',
                                        );
                                        validateAndPersistField(
                                          'client_last_name',
                                          parts.slice(1).join(' ') || '',
                                        );
                                      }}
                                      placeholder='-'
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                                {cpContactNameError ? (
                                  <ErrorText>{cpContactNameError}</ErrorText>
                                ) : null}
                              </FieldRow>
                              <FieldRow
                                icon={RiSmartphoneLine}
                                label='CP Contact Mobile No.'
                                editable
                                truncate
                                required
                              >
                                <div className='flex w-full flex-col gap-1'>
                                  <PhoneInputController
                                    value={cpContactMobileInputValue}
                                    onChange={(formattedValue) => {
                                      setLocalChanges((p) => ({
                                        ...p,
                                        cp_contact_mobile: formattedValue,
                                        client_mobile_number: formattedValue,
                                      }));
                                      if (cpContactMobileError) {
                                        clearFieldError('client_mobile_number');
                                        clearFieldError('cp_contact_mobile');
                                      }
                                    }}
                                    size='xsmall'
                                    variant='borderless'
                                    placeholder='9876500011'
                                    maxLength={10}
                                    hasError={Boolean(cpContactMobileError)}
                                    inputProps={{
                                      onBlur: async () => {
                                        const v =
                                          getApiVal('cp_contact_mobile') ||
                                          getApiVal('client_mobile_number') ||
                                          '';
                                        validateAndPersistField('cp_contact_mobile', v);
                                        validateAndPersistField('client_mobile_number', v);
                                      },
                                    }}
                                  />
                                  {cpContactMobileError ? (
                                    <ErrorText>{cpContactMobileError}</ErrorText>
                                  ) : null}
                                </div>
                              </FieldRow>
                              <FieldRow
                                icon={RiMailLine}
                                label='CP Contact Email'
                                editable
                                required
                              >
                                <Input.Root
                                  variant='borderless'
                                  size='xsmall'
                                  className='min-h-0'
                                  hasError={Boolean(cpContactEmailError)}
                                >
                                  <Input.Wrapper>
                                    <Input.Input
                                      value={cpContactEmailInputValue}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setLocalChanges((p) => ({
                                          ...p,
                                          cp_contact_email: v,
                                          client_email: v,
                                        }));
                                        if (cpContactEmailError) {
                                          clearFieldError('client_email');
                                          clearFieldError('cp_contact_email');
                                        }
                                      }}
                                      onBlur={async (e) => {
                                        const v = e.target.value.trim();
                                        validateAndPersistField('cp_contact_email', v);
                                        validateAndPersistField('client_email', v);
                                      }}
                                      placeholder='-'
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                                {cpContactEmailError ? (
                                  <ErrorText>{cpContactEmailError}</ErrorText>
                                ) : null}
                              </FieldRow>
                            </div>
                          </div>
                        )}

                      {/* Space Inquiry */}
                      {entryType === 'Space' && (
                        <div className='w-full flex flex-col gap-3'>
                          <div className='flex items-center justify-start gap-1'>
                            <span className=' flex items-center gap-2 text-[var(--color-text-sub-500)]'>
                              <RiBuildingLine /> Space Details
                            </span>
                            <CompactButton.Root size='medium' variant='stroke'>
                              <CompactButton.Icon as={RiArrowDownSLine} size={12} />
                            </CompactButton.Root>
                          </div>
                          <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                            <FieldRow icon={RiBuildingLine} label='Type of Space' editable required>
                              <SearchableSelect
                                variant='borderless'
                                size='xsmall'
                                value={getApiVal('type_of_space') ?? ''}
                                onValueChange={(v) => {
                                  setLocalChanges((p) => ({ ...p, type_of_space: v }));
                                  validateAndPersistField('type_of_space', v);
                                }}
                                hasError={Boolean(
                                  fieldErrors.type_of_space && !getApiVal('type_of_space'),
                                )}
                                options={typeOfSpaceOptions}
                                placeholder='Select'
                                triggerClassName='w-full text-left'
                              />
                              {fieldErrors.type_of_space && !getApiVal('type_of_space') ? (
                                <ErrorText>{fieldErrors.type_of_space}</ErrorText>
                              ) : null}
                            </FieldRow>

                            <FieldRow icon={RiStackLine} label='No. of Seats' editable required>
                              <Input.Root
                                variant='borderless'
                                size='xsmall'
                                className='min-h-0'
                                hasError={Boolean(fieldErrors.seats)}
                              >
                                <Input.Wrapper>
                                  <Input.Input
                                    type='number'
                                    inputMode='numeric'
                                    value={getApiVal('seats') ?? ''}
                                    onChange={(e) => {
                                      setLocalChanges((p) => ({
                                        ...p,
                                        seats: e.target.value === '' ? '' : Number(e.target.value),
                                      }));
                                      if (fieldErrors.seats) clearFieldError('seats');
                                    }}
                                    onBlur={(e) => {
                                      const v = e.target.value === '' ? '' : Number(e.target.value);
                                      validateAndPersistField(
                                        'seats',
                                        Number.isNaN(Number(v)) ? '' : v,
                                      );
                                    }}
                                    placeholder='-'
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                              {fieldErrors.seats ? (
                                <ErrorText>{fieldErrors.seats}</ErrorText>
                              ) : null}
                            </FieldRow>

                            <FieldRow icon={RiPriceTag3Line} label='Source' editable>
                              <SearchableSelect
                                variant='borderless'
                                size='xsmall'
                                value={getApiVal('source_category') ?? ''}
                                onValueChange={(v) => {
                                  setLocalChanges((p) => ({
                                    ...p,
                                    source_category: v,
                                    ...(v !== 'Other' ? { other_source: '' } : {}),
                                  }));
                                  if (v !== 'Other') clearFieldError('other_source');
                                  validateAndPersistField('source_category', v);
                                }}
                                options={sourceCategoryOptions}
                                placeholder='-'
                                triggerClassName='w-full text-left'
                              />
                            </FieldRow>

                            {isOtherSourceSelected && (
                              <FieldRow
                                icon={RiPriceTag3Line}
                                label='Other Source'
                                editable
                                required
                              >
                                <Input.Root
                                  variant='borderless'
                                  size='xsmall'
                                  className='min-h-0'
                                  hasError={Boolean(fieldErrors.other_source)}
                                >
                                  <Input.Wrapper>
                                    <Input.Input
                                      value={getApiVal('other_source') ?? ''}
                                      onChange={(e) => {
                                        setLocalChanges((p) => ({
                                          ...p,
                                          other_source: e.target.value,
                                        }));
                                        if (fieldErrors.other_source)
                                          clearFieldError('other_source');
                                      }}
                                      onBlur={(e) =>
                                        validateAndPersistField(
                                          'other_source',
                                          e.target.value.trim(),
                                        )
                                      }
                                      placeholder='Enter other source'
                                    />
                                  </Input.Wrapper>
                                </Input.Root>
                                {fieldErrors.other_source ? (
                                  <ErrorText>{fieldErrors.other_source}</ErrorText>
                                ) : null}
                              </FieldRow>
                            )}

                            <FieldRow
                              label='Sales Person in Touch'
                              icon={RiUser2Line}
                              truncate
                              editable
                            >
                              <SearchableSelect
                                variant='borderless'
                                size='xsmall'
                                value={getApiVal('sales_person_in_touch') ?? ''}
                                onValueChange={(v) => {
                                  setLocalChanges((p) => ({ ...p, sales_person_in_touch: v }));
                                  validateAndPersistField('sales_person_in_touch', v);
                                }}
                                options={salesPersonOptions}
                                placeholder='-'
                                triggerClassName='w-full text-left'
                              />
                            </FieldRow>
                          </div>
                        </div>
                      )}

                      {/* Vendor Details */}
                      {entryType === 'Vendor' && (
                        <div className='w-full flex flex-col gap-3'>
                          <div className='flex items-center justify-start gap-1'>
                            <span className=' flex items-center gap-2 text-[var(--color-text-sub-500)]'>
                              <RiHammerLine /> Vendor Details
                            </span>
                            <CompactButton.Root size='medium' variant='stroke'>
                              <CompactButton.Icon as={RiArrowDownSLine} size={12} />
                            </CompactButton.Root>
                          </div>
                          <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                            <FieldRow icon={RiBuildingLine} label='Company Name' editable required>
                              <Input.Root
                                variant='borderless'
                                size='xsmall'
                                className='min-h-0'
                                hasError={Boolean(fieldErrors.vendor)}
                              >
                                <Input.Wrapper>
                                  <Input.Input
                                    value={getApiVal('vendor') ?? ''}
                                    onChange={(e) => {
                                      setLocalChanges((p) => ({
                                        ...p,
                                        vendor: e.target.value,
                                      }));
                                      if (fieldErrors.vendor) clearFieldError('vendor');
                                    }}
                                    onBlur={(e) =>
                                      validateAndPersistField('vendor', e.target.value.trim())
                                    }
                                    placeholder='-'
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                              {fieldErrors.vendor ? (
                                <ErrorText>{fieldErrors.vendor}</ErrorText>
                              ) : null}
                            </FieldRow>

                            <FieldRow icon={RiFileTextLine} label='Type' editable>
                              <Input.Root variant='borderless' size='xsmall' className='min-h-0'>
                                <Input.Wrapper>
                                  <Input.Input
                                    value={getApiVal('vendor_type') ?? ''}
                                    onChange={(e) =>
                                      setLocalChanges((p) => ({
                                        ...p,
                                        vendor_type: e.target.value,
                                      }))
                                    }
                                    onBlur={(e) =>
                                      validateAndPersistField('vendor_type', e.target.value)
                                    }
                                    placeholder='-'
                                  />
                                </Input.Wrapper>
                              </Input.Root>
                            </FieldRow>

                            {/* <FieldRow icon={RiStackLine} label='Work Category' editable>
                            <Input.Root variant='borderless' size='xsmall' className='min-h-0'>
                              <Input.Wrapper>
                                <Input.Input
                                  value={getApiVal('work_category') ?? ''}
                                  onChange={(e) =>
                                    setLocalChanges((p) => ({
                                      ...p,
                                      work_category: e.target.value,
                                    }))
                                  }
                                  onBlur={(e) => validateAndPersistField('work_category', e.target.value)}
                                  placeholder='-'
                                />
                              </Input.Wrapper>
                            </Input.Root>
                          </FieldRow> */}

                            <FieldRow icon={RiUser2Line} label='Supervisor' editable required>
                              <SearchableSelect
                                variant='borderless'
                                size='xsmall'
                                value={String(
                                  getApiVal(
                                    'assigned_supervisor',
                                    activeDetail?.assigned_supervisor || '',
                                  ),
                                )}
                                onValueChange={(v) => {
                                  setLocalChanges((p) => ({ ...p, assigned_supervisor: v }));
                                  validateAndPersistField('assigned_supervisor', v);
                                }}
                                hasError={Boolean(
                                  fieldErrors.assigned_supervisor &&
                                  !getApiVal('assigned_supervisor'),
                                )}
                                options={supervisorOptions}
                                placeholder={
                                  getApiVal(
                                    'assigned_supervisor_name',
                                    activeDetail?.assigned_supervisor_name || 'Select supervisor',
                                  ) || 'Select supervisor'
                                }
                                triggerClassName='w-full text-left'
                              />
                              {fieldErrors.assigned_supervisor &&
                              !getApiVal('assigned_supervisor') ? (
                                <ErrorText>{fieldErrors.assigned_supervisor}</ErrorText>
                              ) : null}
                            </FieldRow>

                            <FieldRow icon={RiStackLine} label='Material Carrying' editable>
                              <SearchableSelect
                                variant='borderless'
                                value={
                                  getApiVal('material_carrying', activeDetail?.material_carrying) ==
                                  1
                                    ? '1'
                                    : '0'
                                }
                                onValueChange={(v) => {
                                  const carrying = v === '1' ? 1 : 0;
                                  setLocalChanges((p) => ({
                                    ...p,
                                    material_carrying: carrying,
                                    ...(carrying === 0 ? { material_desc: '' } : {}),
                                  }));
                                  validateAndPersistField('material_carrying', carrying);
                                  if (carrying === 0) {
                                    validateAndPersistField('material_desc', '');
                                  }
                                }}
                                size='xsmall'
                                options={materialCarryingOptions}
                                placeholder='No'
                                triggerClassName='w-full text-left'
                              />
                            </FieldRow>

                            {getApiVal('material_carrying', activeDetail?.material_carrying) ==
                              1 && (
                              <FieldRow
                                icon={RiStackLine}
                                label='Material Description'
                                editable
                                required
                              >
                                <Textarea.Root
                                  size='xsmall'
                                  variant='borderless'
                                  value={getApiVal('material_desc') ?? ''}
                                  hasError={Boolean(fieldErrors.material_desc)}
                                  onChange={(e) => {
                                    setLocalChanges((p) => ({
                                      ...p,
                                      material_desc: e.target.value,
                                    }));
                                    if (fieldErrors.material_desc) clearFieldError('material_desc');
                                  }}
                                  onBlur={(e) =>
                                    validateAndPersistField('material_desc', e.target.value.trim())
                                  }
                                  placeholder='Enter material details'
                                />
                                {fieldErrors.material_desc ? (
                                  <ErrorText>{fieldErrors.material_desc}</ErrorText>
                                ) : null}
                              </FieldRow>
                            )}
                          </div>
                        </div>
                      )}

                      {entryType === 'Event' && (
                        <div className='w-full flex flex-col gap-3'>
                          <div className='flex items-center justify-start gap-1'>
                            <span className=' flex items-center gap-2 text-[var(--color-text-sub-500)]'>
                              <RiCalendarEventLine /> Event Details
                            </span>
                          </div>
                          <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                            <FieldRow icon={RiCalendarEventLine} label='Event' truncate>
                              <div className={FIELD_VALUE_READ_ONLY_WRAP}>
                                <span className='min-w-0 truncate text-paragraph-sm text-text-strong-950'>
                                  {getApiVal('event_name') || getApiVal('event') || '-'}
                                </span>
                              </div>
                            </FieldRow>
                          </div>
                        </div>
                      )}

                      {/* Notes — same pattern as ticket drawer description */}
                      <div className='flex w-full flex-col gap-3'>
                        <div className='flex items-center gap-2'>
                          <RiStickyNoteLine size={20} className='text-neutral-400' />
                          <span className='label-small text-text-sub-500'>Notes</span>
                        </div>
                        <Textarea.Root
                          variant='borderless'
                          simple
                          value={getApiVal('notes') ?? ''}
                          onChange={(e) => {
                            const { value } = e.target;
                            setLocalChanges((previous) => ({
                              ...previous,
                              notes: value,
                            }));
                          }}
                          onBlur={(e) => {
                            const value = e.target.value.trim();
                            handleFieldChange('notes', value);
                          }}
                          className='w-full field-sizing-content'
                          placeholder='Add notes'
                        />
                      </div>

                      {materialPhotoAttachments.length > 0 && (
                        <div className='flex flex-col gap-2'>
                          <div className='flex items-center gap-2'>
                            <RiAttachment2 className='size-5 text-text-sub-500' />
                            <span className='label-small text-text-sub-500'>Material photos</span>
                          </div>
                          <AttachmentList attachments={materialPhotoAttachments} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Panel — comments & activity (same pattern as CRM task drawer) */}
                <div className='flex flex-1 flex-col min-w-0 h-full overflow-hidden bg-white border-l border-stroke-soft-200'>
                  <div className='px-6 py-4 flex items-center gap-2 border-b border-stroke-soft-200 shrink-0 bg-white'>
                    <RiChat2Line size={18} className='text-text-sub-500' />
                    <span className='label-small text-text-sub-600'>Comments</span>
                  </div>
                  <div className='flex-1 flex flex-col min-h-0 overflow-hidden'>
                    <VmsComments
                      visitorEntryId={visitorEntryId || undefined}
                      commentsData={commentsData}
                      onAddComment={onAddComment}
                      onRefreshData={onRefreshComments}
                      loading={commentsLoading}
                      fetchStatus={commentsFetchStatus}
                    />
                  </div>
                </div>
              </div>
            )}
          </Drawer.Body>
        </Drawer.Content>

        <VmsRemoveModal
          open={isCancelModalOpen}
          onOpenChange={setIsCancelModalOpen}
          title='Cancel this visit?'
          description='Are you sure you want to cancel this visit?'
          onConfirm={handleCancelVisit}
        />
      </Drawer.Root>
    </>
  );
};

export default VmsViewDrawer;
