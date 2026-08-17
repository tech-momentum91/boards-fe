import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiCloseLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiBuilding2Line,
  RiUserLine,
  RiCalendarLine,
  RiMoneyDollarCircleLine,
  RiLink,
  RiFileLine,
  RiSendPlaneLine,
  RiPriceTag3Line,
  RiAttachment2,
  RiArrowDownSLine,
  RiUploadLine,
  RiUploadCloud2Line,
  RiStickyNoteLine,
  RiExternalLinkLine,
} from 'react-icons/ri';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import * as Select from '@/components/ui/select';
import * as Checkbox from '@/components/ui/checkbox';
import * as Input from '@/components/ui/input';
import { Datepicker } from '@/components/ui/datepicker';
import FieldRow from '@/components/ui/field-row';
import AttachmentList from '@/components/ui/attachment-list';
import * as Avatar from '@/components/ui/avatar';
import * as AvatarGroup from '@/components/ui/avatar-group';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  parseToDate,
  formatTimestampToYYYYMMDD,
  safeDisplayDateTime,
  formatMonthYear,
} from '@/utils/date-utils';
import { CURRENCY } from '@/constants/constants';
import {
  BILL_UPLOADED_OPTIONS,
  APPROVAL_OPTIONS,
  ZOHO_OPTIONS,
  OPEX_DOCTYPE,
  MAX_FILE_SIZE,
  IMAGE_EXTENSIONS,
  OPEX_STATUS_FIELD_CHAIN,
  canEditOpexStatusField,
  getOpexStageBlockedFieldMessage,
} from '@/components/opex/constants';
import OpexStatusDropdown from '@/components/opex/opex-status-dropdown';
import OpexViewDrawerSkeleton from '@/components/opex/opex-view-drawer-skeleton';
import { showErrorToast, showSuccessToast, extractErrorMessage } from '@/utils/error-utils';
import apiClient from '@/api/axios';
import OpexVendorSelect from './opex-vendor-select';
import { vendorSelectOptionsFromRow } from '@/utils/opex-vendor-utils';
import {
  fetchOpexDetail,
  fetchOpexComments,
  fetchVendorsForOpex,
  selectOpexDetail,
  selectOpexComments,
  clearOpexDetail,
  clearOpexComments,
  deleteOpexAttachment,
} from '@/redux/opexSlice';
import CircularProgress from '../ui/circular-progress';
import { getOpexProgress } from '@/utils/opex-utils';
import { useDragAndDrop } from '@/hooks/use-drag-and-drop';
import * as CompactButton from '@/components/ui/compact-button';
import { DocumentFollowersPopover } from '@/components/document-subscribe';
import {
  getSubscriptionStatus,
  listDocumentSubscribers,
} from '@/services/document-subscribe-service';
import { getStatusOptions } from '@/api/dynamic-status';
const OpexComments = React.lazy(() => import('@/components/opex/opex-comments'));

const OPEX_STATUS_FIELD_CONFIG = {
  bill_uploaded: { fallback: BILL_UPLOADED_OPTIONS },
  zone_head_check: { fallback: APPROVAL_OPTIONS },
  purchase_check: { fallback: APPROVAL_OPTIONS },
  zoho_uploaded: { fallback: ZOHO_OPTIONS },
};

const toOpexDropdownOptions = (dynamicOptions, fallbackOptions) => {
  if (Array.isArray(dynamicOptions) && dynamicOptions.length > 0) {
    return dynamicOptions.map((o) => ({
      value: o.value,
      label: o.label,
      color: o.color,
    }));
  }
  return (fallbackOptions || []).map((o) => ({
    value: o.value,
    label: o.label,
    color: o.color,
  }));
};

const getAttachmentExtension = (fileName) => {
  if (!fileName || typeof fileName !== 'string') return '';
  const segments = fileName.split('.');
  if (segments.length < 2) return '';
  return segments.at(-1).toUpperCase();
};

const getFieldValue = (detail, localChanges, fieldName) => {
  if (localChanges[fieldName] !== undefined && localChanges[fieldName] !== null) {
    return localChanges[fieldName];
  }
  if (
    detail?.[fieldName] !== undefined &&
    detail?.[fieldName] !== null &&
    detail?.[fieldName] !== ''
  ) {
    return detail[fieldName];
  }
  return detail?.[fieldName] ?? '';
};

const normalizeOpexAttachments = (detail) => {
  if (!detail) return [];
  const source =
    detail.attachments || detail._attachments || detail.attachments_info || detail.files || [];
  if (!Array.isArray(source)) return [];
  return source
    .map((att, index) => {
      const fileName = att?.file_name || att?.filename || att?.name;
      if (!fileName) return null;

      const extension = getAttachmentExtension(fileName);
      const fileUrl = att?.file_url || att?.url;
      const size = att?.file_size || att?.size;
      const createdAt = att?.creation || att?.created_at;

      return {
        id: att?.id || att?.name || `att-${index}`,
        fileName,
        fileUrl,
        size,
        createdAt,
        extension,
        isImage: IMAGE_EXTENSIONS.has(extension),
        childRowId: fileUrl,
      };
    })
    .filter(Boolean);
};

const OpexViewDrawer = ({
  isOpen = false,
  onClose,
  opexId = null,
  onNavigatePrevious,
  onNavigateNext,
  hasPrevious = false,
  hasNext = false,
  onFieldUpdate,
  onAddComment,
  onRefreshComments,
  centerFilterCenterId = null,
  permissions = { canEdit: true },
  vendors = [],
}) => {
  const dispatch = useDispatch();
  const detailState = useSelector(selectOpexDetail);
  const commentsState = useSelector(selectOpexComments);
  const detail = detailState.data;

  const canEditOpexField = (field) =>
    canEditOpexStatusField(field, permissions.canEdit, permissions.roleType);
  const commentsData = commentsState.data || {};

  const [localChanges, setLocalChanges] = useState({});
  const [isDrawerFullyOpen, setIsDrawerFullyOpen] = useState(false);
  const [showOtherFields, setShowOtherFields] = useState(true);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [hasLoadedCommentsInitial, setHasLoadedCommentsInitial] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [opexSubscribers, setOpexSubscribers] = useState([]);
  const [opexSubscribed, setOpexSubscribed] = useState(false);
  const [opexSubscribersLoading, setOpexSubscribersLoading] = useState(false);
  const [dynamicStatusOptionsByField, setDynamicStatusOptionsByField] = useState({});

  const fileInputRef = useRef(null);
  const leftPanelRef = useRef(null);
  const lastFetchedIdRef = useRef(null);
  const previousCommentsOpexIdRef = useRef(null);

  const detailMatches = useMemo(() => {
    if (!detail || !opexId) return false;
    return String(detail.name || detail.id || '') === String(opexId || '');
  }, [detail?.name, detail?.id, opexId]);

  const isDataReady = useMemo(
    () => detailState.status === 'succeeded' && detail && detailMatches,
    [detailState.status, detail, detailMatches],
  );

  const vendorRowLike = useMemo(() => {
    const fromDetail = detail?.vendor_list;
    const list =
      Array.isArray(fromDetail) && fromDetail.length > 0
        ? fromDetail
        : Array.isArray(vendors) && vendors.length > 0
          ? vendors
          : [];
    return {
      vendor_list: list,
      vendor: getFieldValue(detail, localChanges, 'vendor'),
      vendor_name: detail?.vendor_name,
      supplier_name: detail?.supplier_name,
      vendor_display_name: detail?.vendor_display_name,
    };
  }, [detail, localChanges, vendors]);

  const effectiveVendorOptions = useMemo(
    () => vendorSelectOptionsFromRow(vendorRowLike),
    [vendorRowLike],
  );

  const loadVendorOptionsOnOpen = useCallback(() => {
    const center =
      getFieldValue(detail, localChanges, 'center') ?? detail?.center ?? detail?.center_name;
    const category = getFieldValue(detail, localChanges, 'category') ?? detail?.category;
    return dispatch(fetchVendorsForOpex({ center, category })).unwrap();
  }, [dispatch, detail, localChanges]);

  const refreshOpexSubscribers = useCallback(async () => {
    if (!isOpen) return;
    const name = detail?.name ?? detail?.id ?? opexId;
    if (name == null || name === '') return;
    const ref = String(name);
    setOpexSubscribersLoading(true);
    try {
      const [status, list] = await Promise.all([
        getSubscriptionStatus(OPEX_DOCTYPE, ref),
        listDocumentSubscribers(OPEX_DOCTYPE, ref),
      ]);
      setOpexSubscribed(Boolean(status?.subscribed));
      setOpexSubscribers(Array.isArray(list) ? list : []);
    } catch {
      // keep existing list on failure
    } finally {
      setOpexSubscribersLoading(false);
    }
  }, [isOpen, detail?.name, detail?.id, opexId]);

  useEffect(() => {
    if (isDataReady) setHasLoadedInitialData(true);
  }, [isDataReady]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    const fetchAll = async () => {
      const entries = await Promise.all(
        Object.keys(OPEX_STATUS_FIELD_CONFIG).map(async (field) => {
          try {
            const opts = await getStatusOptions({ doctype: OPEX_DOCTYPE, field });
            return [field, opts];
          } catch {
            return [field, []];
          }
        }),
      );
      if (!cancelled) {
        setDynamicStatusOptionsByField(Object.fromEntries(entries));
      }
    };
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const getOpexStatusOptions = useCallback(
    (field) =>
      toOpexDropdownOptions(
        dynamicStatusOptionsByField[field],
        OPEX_STATUS_FIELD_CONFIG[field]?.fallback,
      ),
    [dynamicStatusOptionsByField],
  );

  useEffect(() => {
    if (!isOpen) {
      setHasLoadedInitialData(false);
      return;
    }
    if (lastFetchedIdRef.current !== opexId) {
      setHasLoadedInitialData(false);
    }
  }, [isOpen, opexId]);

  // Track first comments load per opex to avoid showing loading on refetch (same as client-task-view-drawer)
  useEffect(() => {
    if (commentsState.status !== 'loading' && commentsState.data) {
      setHasLoadedCommentsInitial(true);
    }
  }, [commentsState.status, commentsState.data]);

  useEffect(() => {
    if (!isOpen) {
      setHasLoadedCommentsInitial(false);
      previousCommentsOpexIdRef.current = null;
      return;
    }
    if (previousCommentsOpexIdRef.current !== opexId) {
      setHasLoadedCommentsInitial(false);
      previousCommentsOpexIdRef.current = opexId;
    }
  }, [isOpen, opexId]);

  const isLoading = useMemo(
    () => isOpen && opexId && !hasLoadedInitialData && !isDataReady,
    [isOpen, opexId, isDataReady, hasLoadedInitialData],
  );
  const selectedVendor = useMemo(() => {
    const currentVendor = getFieldValue(detail, localChanges, 'vendor');
    if (currentVendor == null || currentVendor === '') return null;
    const idStr = String(currentVendor);
    return effectiveVendorOptions.find((v) => String(v.id) === idStr) || null;
  }, [detail, localChanges, effectiveVendorOptions]);
  useEffect(() => {
    if (!isOpen || !opexId) {
      lastFetchedIdRef.current = null;
      return;
    }
    if (lastFetchedIdRef.current !== opexId) {
      const id = opexId;
      lastFetchedIdRef.current = id;
      dispatch(fetchOpexDetail(id));
      dispatch(fetchOpexComments(id));
    }
  }, [isOpen, opexId, dispatch]);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setIsDrawerFullyOpen(true), 300);
      return () => clearTimeout(t);
    }
    setIsDrawerFullyOpen(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !detail) return;
    refreshOpexSubscribers();
  }, [isOpen, detail, detail?.modified, commentsData, refreshOpexSubscribers]);

  useEffect(() => {
    if (!isOpen) {
      dispatch(clearOpexDetail());
      dispatch(clearOpexComments());
      setLocalChanges({});
      setUploadError('');
      return;
    }
    if (opexId && lastFetchedIdRef.current !== opexId) {
      setLocalChanges({});
      setUploadError('');
    }
  }, [isOpen, opexId, dispatch]);

  const handleFieldChange = useCallback(
    (fieldName, value) => {
      if (!detail && !opexId) return;
      const id = detail?.id || detail?.name || opexId;

      // Avoid updating if the value hasn't changed to prevent unnecessary logs
      const currentValue = detail?.[fieldName];

      let isSame = false;
      if (typeof value === 'boolean') {
        isSame = Boolean(currentValue) === value;
      } else {
        const normalizedCurrent =
          currentValue === null || currentValue === undefined ? '' : String(currentValue);
        const normalizedNew = value === null || value === undefined ? '' : String(value);
        isSame = normalizedCurrent === normalizedNew;
      }

      if (isSame) {
        // If the value is the same as the original, ensure we clear any local change for this field
        // so it doesn't stay in the "modified" state.
        setLocalChanges((prev) => {
          if (!(fieldName in prev)) return prev;
          const next = { ...prev };
          delete next[fieldName];
          return next;
        });
        return;
      }

      if (OPEX_STATUS_FIELD_CHAIN.includes(fieldName)) {
        const blockMessage = getOpexStageBlockedFieldMessage(fieldName, detail?.opex_stage);
        if (blockMessage) {
          showErrorToast(blockMessage);
          return;
        }
      }

      const updatedChanges = { ...localChanges, [fieldName]: value };

      if (fieldName === 'gst_amount' || fieldName === 'amount_without_gst') {
        const gst =
          Number.parseFloat(
            fieldName === 'gst_amount' ? value : getFieldValue(detail, localChanges, 'gst_amount'),
          ) || 0;

        const withoutGst =
          Number.parseFloat(
            fieldName === 'amount_without_gst'
              ? value
              : getFieldValue(detail, localChanges, 'amount_without_gst'),
          ) || 0;

        updatedChanges.total_amount = gst + withoutGst;
      }

      setLocalChanges(updatedChanges);
      onFieldUpdate?.(id, fieldName, value);
    },
    [detail, opexId, onFieldUpdate, localChanges],
  );

  const handleFileUpload = useCallback(
    async (files) => {
      if (!opexId || !permissions.canEdit) return;

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
        const currentOpexId = detail?.id || detail?.name || opexId;
        const uploadPromises = validFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('doctype', OPEX_DOCTYPE);
          formData.append('docname', currentOpexId);
          formData.append('is_private', 0);

          const response = await apiClient.post('/method/upload_file', formData);
          return response.data;
        });

        await Promise.all(uploadPromises);

        // Refresh detail and activities (like client-task-view-drawer)
        await dispatch(fetchOpexDetail(currentOpexId));
        await dispatch(fetchOpexComments(currentOpexId));

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        showSuccessToast('File(s) uploaded successfully');
      } catch (error) {
        console.error('Failed to upload attachment:', error);
        showErrorToast(error, {
          defaultMessage: 'Failed to upload file. Please try again.',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [opexId, detail, permissions.canEdit, dispatch],
  );

  const { dragActive, overlayHeight, messageTop, handleDrag, handleDrop } = useDragAndDrop({
    containerRef: leftPanelRef,
    onFilesDrop: handleFileUpload,
    triggerDependency: detail,
  });

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
        await dispatch(deleteOpexAttachment(childRowId)).unwrap();

        const currentOpexId = detail?.id || detail?.name || opexId;
        if (currentOpexId) {
          await dispatch(fetchOpexDetail(currentOpexId));
          await dispatch(fetchOpexComments(currentOpexId));
          showSuccessToast('Attachment removed successfully');
        }
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        showErrorToast(errorMessage || 'Failed to remove attachment');
      }
    },
    [dispatch, detail, opexId, permissions.canEdit],
  );

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

  const handleRequestClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const assigneeValue = useMemo(() => {
    const raw = getFieldValue(detail, localChanges, 'assignee');
    return Array.isArray(raw) ? raw : raw ? [raw] : [];
  }, [detail, localChanges]);

  const attachments = useMemo(() => normalizeOpexAttachments(detail), [detail]);

  // Show loading only on first load for comments; refetches after edit do not show loading (same as client-task-view-drawer)
  const commentsLoading = useMemo(() => {
    if (!isOpen || !opexId) return false;
    if (!hasLoadedCommentsInitial) return commentsState.status === 'loading';
    return false;
  }, [isOpen, opexId, commentsState.status, hasLoadedCommentsInitial]);

  if (!isOpen) return null;

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (open === false) handleRequestClose();
      }}
    >
      <Drawer.Content className='max-w-[1200px]'>
        <Drawer.Header
          className='px-6 py-3 border-b border-stroke-soft-200'
          showCloseButton={false}
        >
          <div className='flex items-center justify-between w-full'>
            {isLoading || !isDrawerFullyOpen || !detail ? (
              <>
                <div className='h-8 w-32 bg-bg-weak-100 rounded animate-pulse' />
                <div className='flex items-center gap-3'>
                  <div className='h-8 w-16 bg-bg-weak-100 rounded animate-pulse' />
                  <div className='h-8 w-8 bg-bg-weak-100 rounded animate-pulse' />
                </div>
              </>
            ) : (
              <>
                <div className='flex items-center gap-1'>
                  <ButtonGroup.Root size='xsmall'>
                    <ButtonGroup.Item onClick={onNavigatePrevious} disabled={!hasPrevious}>
                      <ButtonGroup.Icon as={RiArrowLeftSLine} />
                    </ButtonGroup.Item>
                    <ButtonGroup.Item onClick={onNavigateNext} disabled={!hasNext}>
                      <ButtonGroup.Icon as={RiArrowRightSLine} />
                    </ButtonGroup.Item>
                  </ButtonGroup.Root>
                  {/* <Button.Root
                    variant='neutral'
                    mode='ghost'
                    size='xsmall'
                    onClick={onNavigatePrevious}
                    disabled={!hasPrevious}
                    className='shrink-0'
                    aria-label='Previous'
                  >
                    <Button.Icon as={RiArrowLeftSLine} className='shrink-0' />
                  </Button.Root>
                  <Button.Root
                    variant='neutral'
                    mode='ghost'
                    size='xsmall'
                    onClick={onNavigateNext}
                    disabled={!hasNext}
                    className='shrink-0'
                    aria-label='Next'
                  >
                    <Button.Icon as={RiArrowRightSLine} className='shrink-0' />
                  </Button.Root> */}
                </div>
                <div className='flex items-center gap-3'>
                  {detail?.name || detail?.id || opexId ? (
                    <DocumentFollowersPopover
                      referenceDoctype={OPEX_DOCTYPE}
                      referenceName={String(detail?.name ?? detail?.id ?? opexId)}
                      followers={opexSubscribers}
                      subscribed={opexSubscribed}
                      subscribersLoading={opexSubscribersLoading}
                      onRefreshSubscribers={refreshOpexSubscribers}
                      canManageOthers={Boolean(permissions.canEdit)}
                      internalOnlySearch
                    />
                  ) : null}
                  <Button.Root
                    variant='neutral'
                    mode='stroke'
                    size='xsmall'
                    onClick={handleRequestClose}
                    className='shrink-0'
                    aria-label='Close'
                  >
                    <Button.Icon as={RiCloseLine} className='shrink-0' />
                  </Button.Root>
                </div>
              </>
            )}
          </div>
        </Drawer.Header>

        <Drawer.Body className='flex-1 p-0 overflow-y-auto'>
          {isLoading || !detail || !isDrawerFullyOpen ? (
            <OpexViewDrawerSkeleton />
          ) : (
            <div className='flex h-full'>
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
                    <div
                      className='absolute top-0 left-0 right-0 z-50 bg-information-lighter/80 backdrop-blur-sm border-2 border-dashed border-information-base pointer-events-none'
                      style={{
                        height: overlayHeight,
                        minHeight: '100%',
                      }}
                    />
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

                {/* Hidden File Input */}
                <input
                  type='file'
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  className='hidden'
                  multiple
                />
                <div className='px-6 pt-5 pb-0 flex flex-col gap-6'>
                  <div className='flex flex-col gap-1'>
                    <div className='flex items-center gap-2'>
                      {(() => {
                        const { percentage, color } = getOpexProgress(
                          getFieldValue(detail, localChanges, 'bill_uploaded'),
                          getFieldValue(detail, localChanges, 'zoho_uploaded'),
                        );
                        return <CircularProgress percentage={percentage} color={color} size={20} />;
                      })()}
                      <span className='field-sizing-content text-title-h5 text-text-main-900'>
                        {detail.subcategory || opexId}
                      </span>
                    </div>
                  </div>
                  <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                    <FieldRow icon={RiBuilding2Line} label='Center'>
                      <div className='h-8 flex items-center pl-2'>
                        <span className='text-paragraph-sm text-text-main-900'>
                          {getFieldValue(detail, localChanges, 'center_name') || '-'}
                        </span>
                      </div>
                    </FieldRow>
                    <FieldRow icon={RiUserLine} label='Assignee'>
                      <div className='h-8 flex items-center pl-2'>
                        {assigneeValue.length === 0 ? (
                          <span className='text-paragraph-sm text-text-sub-500'>-</span>
                        ) : (
                          <AvatarGroup.Root size={24}>
                            {assigneeValue.slice(0, 3).map((item, index) => {
                              const name =
                                typeof item === 'string'
                                  ? item
                                  : item?.full_name || item?.name || item?.email || 'User';
                              const img =
                                typeof item === 'object'
                                  ? item?.user_image || item?.image || item?.avatar
                                  : null;
                              return (
                                <Tooltip.Root size='xsmall' key={name || index}>
                                  <Tooltip.Trigger asChild>
                                    <Avatar.Root size={24} color='gray'>
                                      {img ? (
                                        <Avatar.Image src={img} alt={name} />
                                      ) : (
                                        <span className='text-label-sm'>
                                          {name.charAt(0).toUpperCase()}
                                        </span>
                                      )}
                                    </Avatar.Root>
                                  </Tooltip.Trigger>
                                  <Tooltip.Content size='xsmall' side='bottom'>
                                    {name}
                                  </Tooltip.Content>
                                </Tooltip.Root>
                              );
                            })}
                            {assigneeValue.length > 3 && (
                              <Tooltip.Root size='xsmall'>
                                <Tooltip.Trigger asChild>
                                  <AvatarGroup.Overflow size={24}>
                                    +{assigneeValue.length - 3}
                                  </AvatarGroup.Overflow>
                                </Tooltip.Trigger>

                                <Tooltip.Content size='xsmall' side='bottom'>
                                  <div className='flex flex-col'>
                                    {assigneeValue.slice(3).map((item, idx) => {
                                      const name =
                                        typeof item === 'string'
                                          ? item
                                          : item?.full_name || item?.name || item?.email || 'User';

                                      return (
                                        <span key={idx} className='text-paragraph-sm'>
                                          {name}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </Tooltip.Content>
                              </Tooltip.Root>
                            )}
                          </AvatarGroup.Root>
                        )}
                      </div>
                    </FieldRow>
                    <FieldRow icon={RiCalendarLine} label='Created Date'>
                      <div className='h-8 flex items-center pl-2'>
                        <span className='text-paragraph-sm text-text-main-900'>
                          {safeDisplayDateTime(getFieldValue(detail, localChanges, 'creation')) ||
                            '-'}
                        </span>
                      </div>
                    </FieldRow>
                    <FieldRow icon={RiCalendarLine} label='Expense Month'>
                      <div className='h-8 flex items-center pl-2'>
                        <span className='text-paragraph-sm text-text-main-900'>
                          {formatMonthYear(getFieldValue(detail, localChanges, 'period')) || '-'}
                        </span>
                      </div>
                    </FieldRow>
                    <FieldRow icon={RiCalendarLine} label='Triggered Month'>
                      <div className='h-8 flex items-center pl-2'>
                        <span className='text-paragraph-sm text-text-main-900'>
                          {formatMonthYear(getFieldValue(detail, localChanges, 'trigger_date')) ||
                            '-'}
                        </span>
                      </div>
                    </FieldRow>
                    <FieldRow
                      icon={RiMoneyDollarCircleLine}
                      label='Amt. Without GST'
                      editable={permissions.canEdit}
                    >
                      <Input.Root size='xsmall' variant='borderless' className='w-full'>
                        <Input.Wrapper>
                          <Input.Input
                            type='text'
                            value={getFieldValue(detail, localChanges, 'amount_without_gst') ?? ''}
                            onChange={(e) =>
                              setLocalChanges((p) => ({ ...p, amount_without_gst: e.target.value }))
                            }
                            onBlur={(e) => handleFieldChange('amount_without_gst', e.target.value)}
                            disabled={!permissions.canEdit}
                            placeholder='-'
                          />
                          <Input.InlineAffix>{CURRENCY}</Input.InlineAffix>
                        </Input.Wrapper>
                      </Input.Root>
                    </FieldRow>
                    <FieldRow
                      icon={RiMoneyDollarCircleLine}
                      label='GST Amount'
                      editable={permissions.canEdit}
                    >
                      <Input.Root size='xsmall' variant='borderless' className='w-full'>
                        <Input.Wrapper>
                          <Input.Input
                            type='text'
                            value={getFieldValue(detail, localChanges, 'gst_amount') ?? ''}
                            onChange={(e) =>
                              setLocalChanges((p) => ({ ...p, gst_amount: e.target.value }))
                            }
                            onBlur={(e) => handleFieldChange('gst_amount', e.target.value)}
                            disabled={!permissions.canEdit}
                            placeholder='-'
                          />
                          <Input.InlineAffix>{CURRENCY}</Input.InlineAffix>
                        </Input.Wrapper>
                      </Input.Root>
                    </FieldRow>
                    <FieldRow icon={RiMoneyDollarCircleLine} label='Total Amount' editable={false}>
                      <div className='h-8 flex items-center pl-2'>
                        <span className='text-paragraph-sm text-text-main-900'>
                          {`${CURRENCY}${getFieldValue(detail, localChanges, 'total_amount') || '0'}`}
                        </span>
                      </div>
                    </FieldRow>
                    <FieldRow
                      icon={RiBuilding2Line}
                      label='Vendor'
                      editable={canEditOpexField('vendor')}
                    >
                      <div className='w-full' onClick={(e) => e.stopPropagation()}>
                        <OpexVendorSelect
                          className='w-full'
                          triggerClassName='w-full justify-start'
                          plainTrigger
                          truncateAt={20}
                          value={selectedVendor}
                          vendorOptions={effectiveVendorOptions}
                          loadVendorOptionsOnOpen={
                            canEditOpexField('vendor') ? loadVendorOptionsOnOpen : undefined
                          }
                          disabled={!canEditOpexField('vendor')}
                          onChange={(vendor) => {
                            const value = vendor?.id || '';

                            setLocalChanges((p) => ({
                              ...p,
                              vendor: value,
                            }));

                            handleFieldChange('vendor', value);
                          }}
                        />
                      </div>
                    </FieldRow>
                    <FieldRow icon={RiLink} label='Bill URL'>
                      <div className='group relative w-full'>
                        <Input.Root size='xsmall' variant='borderless' className='w-full'>
                          <Input.Wrapper>
                            <Input.Input
                              type='text'
                              value={getFieldValue(detail, localChanges, 'bill_url') ?? ''}
                              onChange={(e) =>
                                setLocalChanges((p) => ({ ...p, bill_url: e.target.value }))
                              }
                              onBlur={(e) => handleFieldChange('bill_url', e.target.value)}
                              disabled={!permissions.canEdit}
                              placeholder='-'
                              className='pr-6'
                            />
                          </Input.Wrapper>
                        </Input.Root>

                        {getFieldValue(detail, localChanges, 'bill_url') && (
                          <CompactButton.Root
                            type='button'
                            variant='ghost'
                            size='small'
                            className='absolute right-1.5 inset-y-0 flex items-center opacity-0 transition-opacity group-hover:opacity-100'
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                getFieldValue(detail, localChanges, 'bill_url'),
                                '_blank',
                                'noopener,noreferrer',
                              );
                            }}
                            title='Open URL'
                          >
                            <CompactButton.Icon as={RiExternalLinkLine} />
                          </CompactButton.Root>
                        )}
                      </div>
                    </FieldRow>
                    <FieldRow
                      icon={RiCalendarLine}
                      label='Invoice Date'
                      editable={permissions.canEdit}
                    >
                      {permissions.canEdit ? (
                        <Datepicker
                          value={
                            parseToDate(getFieldValue(detail, localChanges, 'invoice_date')) ??
                            undefined
                          }
                          onChange={(date) => {
                            handleFieldChange(
                              'invoice_date',
                              date ? formatTimestampToYYYYMMDD(date.getTime()) : '',
                            );
                          }}
                          placeholder='-'
                          variant='borderless'
                          size='xsmall'
                          className='text-text-main-900'
                        />
                      ) : (
                        <span className='text-paragraph-sm text-text-main-900'>
                          {getFieldValue(detail, localChanges, 'invoice_date') || '-'}
                        </span>
                      )}
                    </FieldRow>
                    <FieldRow
                      icon={RiFileLine}
                      label='Bill Uploaded'
                      editable={canEditOpexField('bill_uploaded')}
                    >
                      <div className='h-8 flex items-center pl-2'>
                        <OpexStatusDropdown
                          value={getFieldValue(detail, localChanges, 'bill_uploaded')}
                          onValueChange={(v) => handleFieldChange('bill_uploaded', v)}
                          statusOptions={getOpexStatusOptions('bill_uploaded')}
                          disabled={!canEditOpexField('bill_uploaded')}
                          showArrow={canEditOpexField('bill_uploaded')}
                          size='xsmall'
                          placeholder='Not Uploaded'
                        />
                      </div>
                    </FieldRow>
                    <FieldRow
                      icon={RiSendPlaneLine}
                      label='Hard Copy Sent'
                      editable={permissions.canEdit}
                    >
                      <div className='h-8 flex items-center pl-1'>
                        <Checkbox.Root
                          checked={Boolean(getFieldValue(detail, localChanges, 'hard_copy_sent'))}
                          onCheckedChange={(v) => handleFieldChange('hard_copy_sent', Boolean(v))}
                          disabled={!permissions.canEdit}
                          size='xsmall'
                        />
                      </div>
                    </FieldRow>
                    <FieldRow
                      icon={RiUserLine}
                      label='Zone Head Check'
                      editable={canEditOpexField('zone_head_check')}
                    >
                      <div className='h-8 flex items-center pl-2'>
                        <OpexStatusDropdown
                          value={getFieldValue(detail, localChanges, 'zone_head_check')}
                          onValueChange={(v) => handleFieldChange('zone_head_check', v)}
                          statusOptions={getOpexStatusOptions('zone_head_check')}
                          disabled={!canEditOpexField('zone_head_check')}
                          showArrow={canEditOpexField('zone_head_check')}
                          size='xsmall'
                          placeholder='Not Checked'
                        />
                      </div>
                    </FieldRow>
                    <FieldRow
                      icon={RiMoneyDollarCircleLine}
                      label='Purchase Check'
                      editable={canEditOpexField('purchase_check')}
                    >
                      <div className='h-8 flex items-center pl-2'>
                        <OpexStatusDropdown
                          value={getFieldValue(detail, localChanges, 'purchase_check')}
                          onValueChange={(v) => handleFieldChange('purchase_check', v)}
                          statusOptions={getOpexStatusOptions('purchase_check')}
                          disabled={!canEditOpexField('purchase_check')}
                          showArrow={canEditOpexField('purchase_check')}
                          size='xsmall'
                          placeholder='Not Checked'
                        />
                      </div>
                    </FieldRow>
                    <FieldRow
                      icon={RiFileLine}
                      label='ZOHO Uploaded'
                      editable={canEditOpexField('zoho_uploaded')}
                    >
                      <div className='h-8 flex items-center pl-2'>
                        <OpexStatusDropdown
                          value={getFieldValue(detail, localChanges, 'zoho_uploaded')}
                          onValueChange={(v) => handleFieldChange('zoho_uploaded', v)}
                          statusOptions={getOpexStatusOptions('zoho_uploaded')}
                          disabled={!canEditOpexField('zoho_uploaded')}
                          showArrow={canEditOpexField('zoho_uploaded')}
                          size='xsmall'
                          placeholder='Not Uploaded'
                        />
                      </div>
                    </FieldRow>
                  </div>

                  <div className={cn('flex flex-col', showOtherFields ? 'gap-2' : '')}>
                    <button
                      type='button'
                      onClick={() => setShowOtherFields((p) => !p)}
                      className='flex gap-2 items-center cursor-pointer py-0'
                    >
                      <RiPriceTag3Line className='size-5 text-text-sub-500' />
                      <span className='label-small text-text-sub-500'>Other Fields</span>
                      <RiArrowDownSLine
                        className={cn(
                          'size-5 text-text-sub-500 transition-transform duration-200',
                          showOtherFields ? 'rotate-180' : 'rotate-0',
                        )}
                      />
                    </button>
                    <div
                      className={cn(
                        'overflow-hidden transition-[max-height] duration-200 ease-in-out',
                        showOtherFields ? 'max-h-[400px]' : 'max-h-0',
                      )}
                    >
                      <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                        <FieldRow label='Category'>
                          <div className='h-8 flex items-center pl-2'>
                            <span className='text-paragraph-sm text-text-main-900'>
                              {getFieldValue(detail, localChanges, 'category') || '-'}
                            </span>
                          </div>
                        </FieldRow>
                        <FieldRow label='Subcategory'>
                          <div className='h-8 flex items-center pl-2'>
                            <span className='text-paragraph-sm text-text-main-900'>
                              {getFieldValue(detail, localChanges, 'subcategory') || '-'}
                            </span>
                          </div>
                        </FieldRow>
                        <FieldRow truncate label='Zone Head Checked Dated' editable={false}>
                          <div className='h-8 flex items-center pl-2'>
                            <span className='text-paragraph-sm text-text-main-900'>
                              {getFieldValue(detail, localChanges, 'zone_head_checked_date') || '-'}
                            </span>
                          </div>
                        </FieldRow>
                        <FieldRow truncate label='Purchase Checked Date' editable={false}>
                          <div className='h-8 flex items-center pl-2'>
                            <span className='text-paragraph-sm text-text-main-900'>
                              {getFieldValue(detail, localChanges, 'purchase_checked_date') || '-'}
                            </span>
                          </div>
                        </FieldRow>
                      </div>
                    </div>
                  </div>

                  <div className='flex flex-col gap-2 pb-6'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <RiAttachment2 className='size-5 text-text-sub-500' />
                        <span className='label-small text-text-sub-500'>Attachments</span>
                      </div>
                      {permissions.canEdit && (
                        <Button.Root
                          type='button'
                          variant='neutral'
                          mode='stroke'
                          size='xsmall'
                          className='gap-1'
                          onClick={handleUploadButtonClick}
                          loading={isUploading}
                          disabled={isUploading}
                        >
                          <Button.Icon as={RiUploadLine} className='p-0.5' />
                          <span>{isUploading ? 'Uploading...' : 'Upload Files'}</span>
                        </Button.Root>
                      )}
                    </div>
                    {attachments.length > 0 && (
                      <AttachmentList
                        attachments={attachments}
                        onRemove={handleRemoveAttachment}
                        onDownload={(att) => {
                          if (att?.fileUrl) {
                            const a = document.createElement('a');
                            a.href = att.fileUrl;
                            a.download = att.fileName || 'attachment';
                            a.target = '_blank';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className='flex flex-1 flex-col h-full overflow-y-auto'>
                <div className='border-b border-stroke-soft-200 px-6 py-3.5'>
                  <div className='flex items-center gap-2'>
                    <RiStickyNoteLine size={20} className='text-text-sub-500' />
                    <span className='label-small text-text-sub-500'>Comments</span>
                  </div>
                </div>
                <React.Suspense
                  fallback={
                    <div className='flex items-center justify-center flex-1'>
                      <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                    </div>
                  }
                >
                  <OpexComments
                    opexId={detail?.id || detail?.name || opexId}
                    commentsData={commentsData}
                    onAddComment={onAddComment}
                    onRefreshData={onRefreshComments}
                    loading={commentsLoading}
                  />
                </React.Suspense>
              </div>
            </div>
          )}
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default OpexViewDrawer;
