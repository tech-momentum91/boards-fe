// React
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

// Third-party
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiAttachment2,
  RiBuilding2Line,
  RiCalendarLine,
  RiCloseLine,
  RiFileLine,
  RiMoneyDollarCircleLine,
  RiPriceTag3Line,
  RiStickyNoteLine,
  RiUploadCloud2Line,
  RiUploadLine,
  RiUserLine,
} from 'react-icons/ri';

// UI Components
import AttachmentList from '@/components/ui/attachment-list';
import MediaPreview from '@/components/ui/media-preview';
import * as Button from '@/components/ui/button';
import * as ButtonGroup from '@/components/ui/button-group';
import { Datepicker } from '@/components/ui/datepicker';
import * as Drawer from '@/components/ui/drawer';
import FieldRow from '@/components/ui/field-row';
import * as Input from '@/components/ui/input';
import * as Badge from '@/components/ui/badge';
import {
  billingStatusColor,
  BILLING_DECIMAL_FIELDS,
  BILLING_FORMATTED_FIELDS,
  formatBillingDecimal,
  formatBillingPercentFromAmount,
  computeBillingAmountFromPercent,
  computeBillingInvoiceAmount,
  computeBillingTotalAmount,
  isValidBillingDecimalInput,
  MAX_DECIMAL_PLACES_ERROR,
  TDS_AMOUNT_EXCEEDS_BASIC_ERROR,
  DISCOUNT_EXCEEDS_INVOICE_ERROR,
  DISCOUNT_PLUS_TDS_EXCEEDS_INVOICE_ERROR,
} from '@/components/billing/constants.js';
import * as LinkButton from '@/components/ui/link-button';
import * as Tooltip from '@/components/ui/tooltip';
import InvoiceConfirmModal from '@/components/billing/invoice-confirm-modal';
import CrmComment from '@/components/crm-tasks/crm-comment';
// Billing Components
import BillingStatusDropdown from '@/components/billing/billing-status-dropdown';
import BillingViewDrawerSkeleton from '@/components/billing/billing-view-drawer-skeleton';
import { getStatusOptions } from '@/api/dynamic-status';

// Hooks
import { useDragAndDrop } from '@/hooks/use-drag-and-drop';
import { useCommentsInitialLoading } from '@/hooks/use-comments-initial-loading';

// Redux
import {
  clearBillingDetail,
  fetchBillingDetail,
  selectBillingDetail,
  addBillingComment,
  fetchBillingComments,
  selectBillingComments,
} from '@/redux/billingSlice';
import { deleteTicketAttachment } from '@/redux/ticketManagementSlice';

// Constants
import { CURRENCY } from '@/constants/constants';
import {
  BILLING_DOCTYPE,
  BILLING_SIGNOFF_OPTIONS,
  CHANGE_OPTIONS,
} from '@/components/billing/constants';

// Utils
import { formatMonthYear, formatTimestampToYYYYMMDD, parseToDate } from '@/utils/date-utils';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn, toAbsoluteAttachmentUrl, withPrefix } from '@/lib/utils';

// API
import apiClient from '@/api/axios';
import { DocumentFollowersPopover } from '@/components/document-subscribe';
import {
  getSubscriptionStatus,
  listDocumentSubscribers,
} from '@/services/document-subscribe-service';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const IMAGE_EXTENSIONS = new Set(['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG', 'BMP', 'ICO']);

const getAttachmentExtension = (fileName) => {
  if (!fileName || typeof fileName !== 'string') return '';
  const segments = fileName.split('.');
  if (segments.length < 2) return '';
  return segments.at(-1).toUpperCase();
};

const INVOICE_AMOUNT_FIELD_KEYS = [
  'basic_amount',
  'gst_amount',
  'discount_amount',
  'invoice_amount',
  'tds_percentage',
  'tds_amount',
  'total_amount',
  'collected_amount',
];

const getFieldValue = (detail, localChanges, fieldName) => {
  if (localChanges[fieldName] !== undefined && localChanges[fieldName] !== null) {
    return localChanges[fieldName];
  }
  if (
    detail?.[fieldName] !== undefined &&
    detail?.[fieldName] !== null &&
    detail?.[fieldName] !== ''
  ) {
    const value = detail[fieldName];
    return BILLING_FORMATTED_FIELDS.has(fieldName) ? formatBillingDecimal(value) : value;
  }
  const fallback = detail?.[fieldName] ?? '';
  return BILLING_FORMATTED_FIELDS.has(fieldName) ? formatBillingDecimal(fallback) : fallback;
};

const normalizeBillingAttachments = (detail) => {
  if (!detail) return [];
  const source =
    detail.attachments || detail._attachments || detail.attachments_info || detail.files || [];
  if (!Array.isArray(source)) return [];
  return source
    .map((att, index) => {
      const fileName = att?.file_name || att?.filename || att?.name;
      if (!fileName) return null;

      const extension = getAttachmentExtension(fileName);
      const fileUrl = att?.file_url || att?.url || att?.fileUrl;
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
        // Use file URL as the identifier for delete API (same as tickets)
        childRowId: fileUrl,
      };
    })
    .filter(Boolean);
};

const BillingViewDrawer = ({
  isOpen = false,
  onClose,
  billingId = null,
  onNavigatePrevious,
  onNavigateNext,
  hasPrevious = false,
  hasNext = false,
  onFieldUpdate,
  permissions = { canEdit: true },
}) => {
  const dispatch = useDispatch();
  const detailState = useSelector(selectBillingDetail);
  const {
    data: billingComments,
    loading: billingCommentsLoading,
    status: billingCommentsStatus,
  } = useSelector(selectBillingComments);
  const commentsLoading = useCommentsInitialLoading({
    enabled: Boolean(isOpen && billingId),
    entityId: billingId,
    isLoading: billingCommentsLoading,
    hasData: billingCommentsStatus === 'succeeded' || billingCommentsStatus === 'failed',
  });
  const detail = detailState.data;

  const [localChanges, setLocalChanges] = useState({});
  const localChangesRef = useRef(localChanges);
  localChangesRef.current = localChanges;
  const [isDrawerFullyOpen, setIsDrawerFullyOpen] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [invoiceConfirmOpen, setInvoiceConfirmOpen] = useState(false);
  const [invoiceConfirmValues, setInvoiceConfirmValues] = useState({
    basic_amount: '',
    gst_amount: '',
    discount_amount: '',
    tds_amount: '',
    total_amount: '',
    collected_amount: '',
  });
  const [invoiceUploadMeta, setInvoiceUploadMeta] = useState({
    file_url: '',
    file_name: '',
    is_loading: false,
  });
  const [dynamicStatusOptions, setDynamicStatusOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const opts = await getStatusOptions({
          doctype: 'Client Billing',
          field: 'payment_status',
        });
        if (!cancelled) setDynamicStatusOptions(Array.isArray(opts) ? opts : []);
      } catch {
        if (!cancelled) setDynamicStatusOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [billingSubscribers, setBillingSubscribers] = useState([]);
  const [billingSubscribed, setBillingSubscribed] = useState(false);
  const [billingSubscribersLoading, setBillingSubscribersLoading] = useState(false);
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);
  const [invoicePreviewItems, setInvoicePreviewItems] = useState([]);

  const fileInputRef = useRef(null);
  const invoiceFileInputRef = useRef(null);
  const leftPanelRef = useRef(null);
  const lastFetchedIdRef = useRef(null);
  const lastDetailModifiedRef = useRef(null);

  const detailMatches = useMemo(() => {
    if (!detail || !billingId) return false;
    return String(detail.name || detail.id || '') === String(billingId || '');
  }, [detail?.name, detail?.id, billingId]);

  const isDataReady = useMemo(
    () => detailState.status === 'succeeded' && detail && detailMatches,
    [detailState.status, detail, detailMatches],
  );

  const billingCommentsData = useMemo(() => {
    const d = billingComments;
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      return { comments: d.comments ?? [], history: d.history ?? [] };
    }
    return { comments: [], history: [] };
  }, [billingComments]);

  const refreshBillingSubscribers = useCallback(async () => {
    if (!isOpen) return;
    const name = detail?.name ?? detail?.id ?? billingId;
    if (name == null || name === '') return;
    const ref = String(name);
    setBillingSubscribersLoading(true);
    try {
      const [status, list] = await Promise.all([
        getSubscriptionStatus(BILLING_DOCTYPE, ref),
        listDocumentSubscribers(BILLING_DOCTYPE, ref),
      ]);
      setBillingSubscribed(Boolean(status?.subscribed));
      setBillingSubscribers(Array.isArray(list) ? list : []);
    } catch {
      // keep existing list on failure
    } finally {
      setBillingSubscribersLoading(false);
    }
  }, [isOpen, detail?.name, detail?.id, billingId]);

  // CrmComment default addCommentVariant is "acl": onAddComment(id, content, att, parentCommentId, visibleToClient)
  const handleBillingAddComment = useCallback(
    async (id, content, attachments, parentCommentId, visibleToClient) => {
      const parent =
        parentCommentId != null && String(parentCommentId).trim() !== ''
          ? String(parentCommentId).trim()
          : '';
      await dispatch(
        addBillingComment({
          client_billing: id,
          content,
          visible_to_client: visibleToClient ? 1 : 0,
          files: attachments,
          parent_comment: parent,
        }),
      ).unwrap();
      await dispatch(fetchBillingComments(id));
    },
    [dispatch],
  );

  useEffect(() => {
    if (isDataReady) setHasLoadedInitialData(true);
  }, [isDataReady]);
  useEffect(() => {
    if (billingId) {
      dispatch(fetchBillingComments(billingId));
    }
  }, [billingId]);
  useEffect(() => {
    if (!isOpen) {
      setHasLoadedInitialData(false);
      return;
    }
    if (lastFetchedIdRef.current !== billingId) {
      setHasLoadedInitialData(false);
    }
  }, [isOpen, billingId]);

  const isLoading = useMemo(
    () => isOpen && billingId && !hasLoadedInitialData && !isDataReady,
    [isOpen, billingId, isDataReady, hasLoadedInitialData],
  );

  useEffect(() => {
    if (!isOpen || !billingId) {
      lastFetchedIdRef.current = null;
      return;
    }
    if (lastFetchedIdRef.current !== billingId) {
      const id = billingId;
      lastFetchedIdRef.current = id;
      dispatch(fetchBillingDetail(id))
        .unwrap()
        .catch((error) => {
          showErrorToast(extractErrorMessage(error, 'Failed to fetch billing detail'));
        });
    }
  }, [isOpen, billingId, dispatch]);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setIsDrawerFullyOpen(true), 300);
      return () => clearTimeout(t);
    }
    setIsDrawerFullyOpen(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !detail) return;
    refreshBillingSubscribers();
  }, [isOpen, detail, detail?.modified, billingCommentsData, refreshBillingSubscribers]);

  useEffect(() => {
    if (!isOpen) {
      dispatch(clearBillingDetail());
      setLocalChanges({});
      setUploadError('');
      return;
    }
    if (billingId && lastFetchedIdRef.current !== billingId) {
      lastDetailModifiedRef.current = null;
      setLocalChanges({});
      setUploadError('');
    }
  }, [isOpen, billingId, dispatch]);

  // Drop stale amount overrides when server detail refreshes (e.g. after save).
  useEffect(() => {
    if (!detailMatches || !detail?.modified) return;
    if (lastDetailModifiedRef.current === detail.modified) return;
    lastDetailModifiedRef.current = detail.modified;
    setLocalChanges((prev) => {
      if (!INVOICE_AMOUNT_FIELD_KEYS.some((key) => prev[key] !== undefined)) return prev;
      const next = { ...prev };
      INVOICE_AMOUNT_FIELD_KEYS.forEach((key) => {
        delete next[key];
      });
      return next;
    });
  }, [detailMatches, detail?.modified]);

  const handleFieldChange = useCallback(
    async (fieldName, value) => {
      if (!detail && !billingId) return;

      const id = detail?.id || detail?.name || billingId;

      if (
        BILLING_DECIMAL_FIELDS.includes(fieldName) &&
        !isValidBillingDecimalInput(String(value ?? ''))
      ) {
        showErrorToast(MAX_DECIMAL_PLACES_ERROR);
        setLocalChanges((previous) => {
          const next = { ...previous };
          delete next[fieldName];
          return next;
        });
        return;
      }

      if (fieldName === 'tds_percentage') {
        const pctRaw = String(value ?? '').trim();
        const pct = pctRaw === '' ? 0 : Number.parseFloat(pctRaw);

        if (Number.isNaN(pct) || pct < 0) {
          showErrorToast('TDS % cannot be negative.');
          setLocalChanges((previous) => {
            const next = { ...previous };
            delete next[fieldName];
            return next;
          });
          return;
        }

        const basicAmount =
          Number.parseFloat(getFieldValue(detail, localChangesRef.current, 'basic_amount')) || 0;
        const gstAmount =
          Number.parseFloat(getFieldValue(detail, localChangesRef.current, 'gst_amount')) || 0;
        const discountAmount =
          Number.parseFloat(getFieldValue(detail, localChangesRef.current, 'discount_amount')) || 0;
        const roundedPct = Math.round(pct * 100) / 100;
        const tdsAmount = Math.round(((basicAmount * roundedPct) / 100) * 100) / 100;

        if (tdsAmount > basicAmount) {
          showErrorToast(TDS_AMOUNT_EXCEEDS_BASIC_ERROR);
          setLocalChanges((previous) => {
            const next = { ...previous };
            delete next[fieldName];
            return next;
          });
          return;
        }
        if (discountAmount + tdsAmount > basicAmount + gstAmount) {
          showErrorToast(DISCOUNT_PLUS_TDS_EXCEEDS_INVOICE_ERROR);
          setLocalChanges((previous) => {
            const next = { ...previous };
            delete next[fieldName];
            return next;
          });
          return;
        }

        const invoiceAmount = computeBillingInvoiceAmount(basicAmount, gstAmount);
        const totalAmount = computeBillingTotalAmount(
          invoiceAmount,
          tdsAmount,
          discountAmount,
        );
        const pctValue = formatBillingDecimal(roundedPct);
        setLocalChanges((prev) => ({
          ...prev,
          tds_percentage: pctValue,
          tds_amount: formatBillingDecimal(tdsAmount),
          invoice_amount: formatBillingDecimal(invoiceAmount),
          total_amount: formatBillingDecimal(totalAmount),
        }));

        await onFieldUpdate?.(id, fieldName, pctValue);
        dispatch(fetchBillingComments(id));
        return;
      }

      // Discount % is UI-only: convert to amount, then save discount_amount.
      if (fieldName === 'discount_percentage') {
        const pctRaw = String(value ?? '').trim();
        const pct = pctRaw === '' ? 0 : Number.parseFloat(pctRaw);

        if (Number.isNaN(pct) || pct < 0) {
          showErrorToast('Discount % cannot be negative.');
          setLocalChanges((previous) => {
            const next = { ...previous };
            delete next[fieldName];
            return next;
          });
          return;
        }

        const basicAmount =
          Number.parseFloat(getFieldValue(detail, localChangesRef.current, 'basic_amount')) || 0;
        const gstAmount =
          Number.parseFloat(getFieldValue(detail, localChangesRef.current, 'gst_amount')) || 0;
        const tdsAmount =
          Number.parseFloat(getFieldValue(detail, localChangesRef.current, 'tds_amount')) || 0;
        const roundedPct = Math.round(pct * 100) / 100;
        const discountAmount = computeBillingAmountFromPercent(basicAmount, roundedPct);

        if (discountAmount > basicAmount + gstAmount) {
          showErrorToast(DISCOUNT_EXCEEDS_INVOICE_ERROR);
          setLocalChanges((previous) => {
            const next = { ...previous };
            delete next[fieldName];
            return next;
          });
          return;
        }
        if (discountAmount + tdsAmount > basicAmount + gstAmount) {
          showErrorToast(DISCOUNT_PLUS_TDS_EXCEEDS_INVOICE_ERROR);
          setLocalChanges((previous) => {
            const next = { ...previous };
            delete next[fieldName];
            return next;
          });
          return;
        }

        const amountValue = formatBillingDecimal(discountAmount);
        const invoiceAmount = computeBillingInvoiceAmount(basicAmount, gstAmount);
        const totalAmount = computeBillingTotalAmount(
          invoiceAmount,
          tdsAmount,
          discountAmount,
        );
        setLocalChanges((prev) => ({
          ...prev,
          discount_percentage: formatBillingDecimal(roundedPct),
          discount_amount: amountValue,
          invoice_amount: formatBillingDecimal(invoiceAmount),
          total_amount: formatBillingDecimal(totalAmount),
        }));
        await onFieldUpdate?.(id, 'discount_amount', amountValue);
        dispatch(fetchBillingComments(id));
        return;
      }

      const saveValue =
        BILLING_DECIMAL_FIELDS.includes(fieldName) && String(value ?? '').trim() !== ''
          ? formatBillingDecimal(value)
          : value;

      // Validation: amounts cannot be negative; collected cannot exceed total
      if (
        [
          'basic_amount',
          'gst_amount',
          'discount_amount',
          'tds_amount',
          'total_amount',
          'collected_amount',
        ].includes(fieldName)
      ) {
        const numberValue = Number.parseFloat(saveValue) || 0;
        const basicAmount =
          Number.parseFloat(getFieldValue(detail, localChangesRef.current, 'basic_amount')) || 0;
        const gstAmount =
          Number.parseFloat(getFieldValue(detail, localChangesRef.current, 'gst_amount')) || 0;
        const discountAmount =
          fieldName === 'discount_amount'
            ? numberValue
            : Number.parseFloat(getFieldValue(detail, localChangesRef.current, 'discount_amount')) ||
              0;
        const tdsAmount =
          fieldName === 'tds_amount'
            ? numberValue
            : Number.parseFloat(getFieldValue(detail, localChangesRef.current, 'tds_amount')) || 0;
        const effectiveBasic = fieldName === 'basic_amount' ? numberValue : basicAmount;
        const effectiveGst = fieldName === 'gst_amount' ? numberValue : gstAmount;

        if (numberValue < 0) {
          showErrorToast(
            `${fieldName
              .replaceAll('_', ' ')
              .replaceAll(/\b\w/g, (c) => c.toUpperCase())} cannot be negative.`,
          );
          setLocalChanges((previous) => {
            const next = { ...previous };
            delete next[fieldName];
            return next;
          });
          return;
        }
        if (fieldName === 'discount_amount' && numberValue > basicAmount + gstAmount) {
          showErrorToast(DISCOUNT_EXCEEDS_INVOICE_ERROR);
          setLocalChanges((previous) => {
            const next = { ...previous };
            delete next[fieldName];
            return next;
          });
          return;
        }
        if (fieldName === 'tds_amount' && numberValue > basicAmount) {
          showErrorToast(TDS_AMOUNT_EXCEEDS_BASIC_ERROR);
          setLocalChanges((previous) => {
            const next = { ...previous };
            delete next[fieldName];
            return next;
          });
          return;
        }
        if (fieldName === 'basic_amount') {
          if (tdsAmount > numberValue) {
            showErrorToast(TDS_AMOUNT_EXCEEDS_BASIC_ERROR);
            setLocalChanges((previous) => {
              const next = { ...previous };
              delete next[fieldName];
              return next;
            });
            return;
          }
        }
        if (
          ['basic_amount', 'gst_amount', 'discount_amount', 'tds_amount'].includes(fieldName) &&
          discountAmount + tdsAmount > effectiveBasic + effectiveGst
        ) {
          showErrorToast(DISCOUNT_PLUS_TDS_EXCEEDS_INVOICE_ERROR);
          setLocalChanges((previous) => {
            const next = { ...previous };
            delete next[fieldName];
            return next;
          });
          return;
        }
        if (fieldName === 'collected_amount') {
          const totalAmount =
            Number.parseFloat(getFieldValue(detail, localChangesRef.current, 'total_amount')) || 0;
          if (numberValue > totalAmount) {
            showErrorToast('Collected amount cannot be greater than total amount.');
            setLocalChanges((previous) => {
              const next = { ...previous };
              delete next[fieldName];
              return next;
            });
            return;
          }
        }
      }

      if (['basic_amount', 'gst_amount', 'discount_amount', 'tds_amount'].includes(fieldName)) {
        const basicAmount =
          fieldName === 'basic_amount'
            ? Number.parseFloat(saveValue) || 0
            : Number.parseFloat(getFieldValue(detail, localChangesRef.current, 'basic_amount')) || 0;
        const gstAmount =
          fieldName === 'gst_amount'
            ? Number.parseFloat(saveValue) || 0
            : Number.parseFloat(getFieldValue(detail, localChangesRef.current, 'gst_amount')) || 0;
        const discountAmount =
          fieldName === 'discount_amount'
            ? Number.parseFloat(saveValue) || 0
            : Number.parseFloat(getFieldValue(detail, localChangesRef.current, 'discount_amount')) ||
              0;
        const tdsAmount =
          fieldName === 'tds_amount'
            ? Number.parseFloat(saveValue) || 0
            : Number.parseFloat(getFieldValue(detail, localChangesRef.current, 'tds_amount')) || 0;
        const invoiceAmount = computeBillingInvoiceAmount(basicAmount, gstAmount);
        const totalAmount = computeBillingTotalAmount(
          invoiceAmount,
          tdsAmount,
          discountAmount,
        );

        setLocalChanges((prev) => {
          const next = {
            ...prev,
            [fieldName]: saveValue,
            invoice_amount: formatBillingDecimal(invoiceAmount),
            total_amount: formatBillingDecimal(totalAmount),
          };
          if (fieldName === 'discount_amount') delete next.discount_percentage;
          return next;
        });

        await onFieldUpdate?.(id, fieldName, saveValue);
        dispatch(fetchBillingComments(id));
        return;
      }

      setLocalChanges((prev) => {
        const next = { ...prev, [fieldName]: saveValue };
        if (fieldName === 'discount_amount') delete next.discount_percentage;
        return next;
      });

      await onFieldUpdate?.(id, fieldName, saveValue);
      dispatch(fetchBillingComments(id));
    },
    [detail, billingId, onFieldUpdate, dispatch],
  );

  const operationsSignoff = getFieldValue(detail, localChanges, 'operations_signoff');
  const legalSignoff = getFieldValue(detail, localChanges, 'legal_signoff');
  const accountsSignoff = getFieldValue(detail, localChanges, 'accounts_signoff');
  const isInvoiceUploadAllowed = Boolean(operationsSignoff && legalSignoff && accountsSignoff);

  const handleInvoiceUploadClick = useCallback(() => {
    if (!isInvoiceUploadAllowed) return;
    invoiceFileInputRef.current?.click();
  }, [isInvoiceUploadAllowed]);

  const handleInvoicePreviewClick = useCallback((fileUrl, fileName) => {
    if (!fileUrl) return;
    setInvoicePreviewItems([
      {
        type: 'pdf',
        src: toAbsoluteAttachmentUrl(fileUrl),
        alt: fileName || 'Invoice PDF',
      },
    ]);
    setInvoicePreviewOpen(true);
  }, []);

  const handleInvoiceFileChange = useCallback(
    async (event) => {
      if (!billingId || !permissions.canEdit) return;
      if (!isInvoiceUploadAllowed) return;

      const file = event?.target?.files?.[0];
      if (!file) return;

      if (
        !String(file.name || '')
          .toLowerCase()
          .endsWith('.pdf')
      ) {
        showErrorToast('Only PDF files are allowed.');
        event.target.value = '';
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        showErrorToast('Invoice PDF exceeds the 10 MB limit.');
        event.target.value = '';
        return;
      }

      setInvoiceUploadMeta({ file_url: '', file_name: '', is_loading: true });

      try {
        const currentBillingId = detail?.id || detail?.name || billingId;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', currentBillingId);

        const response = await apiClient.post(
          '/method/devx.collection.api.collection.upload_invoice_pdf_and_extract',
          formData,
        );
        const payload = response?.data?.message || response?.data || {};
        const extracted = payload?.extracted || {};

        setInvoiceUploadMeta({
          file_url: payload?.file_url || '',
          file_name: payload?.file_name || file.name || '',
          is_loading: false,
        });

        setInvoiceConfirmValues({
          basic_amount: extracted?.basic_amount ?? '',
          gst_amount: extracted?.gst_amount ?? '',
          discount_amount: extracted?.discount_amount ?? detail?.discount_amount ?? '',
          tds_amount: extracted?.tds_amount ?? '',
          total_amount: extracted?.total_amount ?? '',
          collected_amount: detail?.collected_amount ?? extracted?.collected_amount ?? '',
        });
        setInvoiceConfirmOpen(true);
      } catch (error) {
        setInvoiceUploadMeta({ file_url: '', file_name: '', is_loading: false });
        showErrorToast(extractErrorMessage(error, 'Failed to upload invoice PDF'));
      } finally {
        if (invoiceFileInputRef.current) invoiceFileInputRef.current.value = '';
      }
    },
    [billingId, permissions.canEdit, isInvoiceUploadAllowed, detail, dispatch],
  );

  const handleCancelInvoiceConfirm = useCallback(() => {
    setInvoiceConfirmOpen(false);
    setInvoiceUploadMeta({ file_url: '', file_name: '', is_loading: false });
  }, []);

  const handleConfirmInvoiceAmounts = useCallback(
    async (payload) => {
      if (!billingId || !permissions.canEdit || !payload) return;

      const currentBillingId = detail?.id || detail?.name || billingId;
      try {
        await apiClient.post('/method/devx.collection.api.collection.confirm_invoice_amounts', {
          name: currentBillingId,
          basic_amount: payload.basic_amount,
          gst_amount: payload.gst_amount,
          discount_amount: payload.discount_amount ?? 0,
          tds_amount: payload.tds_amount ?? 0,
          tds_percentage: payload.tds_percentage ?? 0,
        });
        setInvoiceConfirmOpen(false);
        await dispatch(fetchBillingDetail(currentBillingId));
        setLocalChanges((prev) => {
          const next = { ...prev };
          for (const key of INVOICE_AMOUNT_FIELD_KEYS) {
            delete next[key];
          }
          return next;
        });
        showSuccessToast('Invoice amounts saved successfully');
      } catch (error) {
        showErrorToast(extractErrorMessage(error, 'Failed to save invoice amounts'));
      }
    },
    [billingId, permissions.canEdit, detail, dispatch],
  );

  const handleFileUpload = useCallback(
    async (files) => {
      if (!billingId || !permissions.canEdit) return;

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
        const currentBillingId = detail?.id || detail?.name || billingId;
        const uploadPromises = validFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('doctype', BILLING_DOCTYPE);
          formData.append('docname', currentBillingId);
          formData.append('is_private', 0);

          const response = await apiClient.post('/method/upload_file', formData);
          return response.data;
        });

        await Promise.all(uploadPromises);

        // Refresh detail
        await dispatch(fetchBillingDetail(currentBillingId));

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
    [billingId, detail, permissions.canEdit, dispatch],
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
        // Use the same delete API as ticket attachments (delete by file URL)
        await dispatch(deleteTicketAttachment(childRowId)).unwrap();

        const currentBillingId = detail?.id || detail?.name || billingId;
        if (currentBillingId) {
          try {
            await dispatch(fetchBillingDetail(currentBillingId)).unwrap();
            showSuccessToast('Attachment removed successfully');
          } catch (error) {
            console.error('Failed to refresh billing detail:', error);
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
    [dispatch, detail, billingId, permissions.canEdit],
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
    // If there is a pending uploaded invoice (not yet confirmed), cancel it first
    handleCancelInvoiceConfirm();
    onClose?.();
  }, [handleCancelInvoiceConfirm, onClose]);

  const attachments = useMemo(() => normalizeBillingAttachments(detail), [detail]);

  if (!isOpen) return null;

  return (
    <>
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
                  </div>
                  <div className='flex items-center gap-3'>
                    {detail?.name || detail?.id || billingId ? (
                      <DocumentFollowersPopover
                        referenceDoctype={BILLING_DOCTYPE}
                        referenceName={String(detail?.name ?? detail?.id ?? billingId)}
                        followers={billingSubscribers}
                        subscribed={billingSubscribed}
                        subscribersLoading={billingSubscribersLoading}
                        onRefreshSubscribers={refreshBillingSubscribers}
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
              <BillingViewDrawerSkeleton />
            ) : (
              <div className='flex h-full'>
                <div
                  ref={leftPanelRef}
                  className={cn(
                    'w-[480px] border-r border-stroke-soft-200 overflow-y-auto relative',
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

                  {/* Hidden Invoice PDF Input */}
                  <input
                    type='file'
                    ref={invoiceFileInputRef}
                    onChange={handleInvoiceFileChange}
                    className='hidden'
                    accept='application/pdf,.pdf'
                  />

                  <div className='px-6 pt-5 pb-0 flex flex-col gap-6'>
                    {/* Title */}
                    <div className='flex flex-col gap-1'>
                      <span className='field-sizing-content text-title-h5 text-text-main-900'>
                        {detail.client_name || detail.client || billingId}
                      </span>
                      {detail.billing_category_name && (
                        <span className='text-paragraph-sm text-text-sub-500'>
                          {detail.billing_category_name}
                        </span>
                      )}
                    </div>

                    {/* Primary Fields */}
                    <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
                      <FieldRow icon={RiUserLine} label='Client'>
                        <div className='h-8 flex items-center pl-2'>
                          <span className='text-paragraph-sm text-text-main-900'>
                            {getFieldValue(detail, localChanges, 'client_name') ||
                              getFieldValue(detail, localChanges, 'client') ||
                              '-'}
                          </span>
                        </div>
                      </FieldRow>
                      <FieldRow icon={RiBuilding2Line} label='Center'>
                        <div className='h-8 flex items-center pl-2'>
                          <span className='text-paragraph-sm text-text-main-900'>
                            {getFieldValue(detail, localChanges, 'center_name') ||
                              getFieldValue(detail, localChanges, 'center') ||
                              '-'}
                          </span>
                        </div>
                      </FieldRow>
                      <FieldRow icon={RiPriceTag3Line} label='Category'>
                        <div className='h-8 flex items-center pl-2'>
                          <span className='text-paragraph-sm text-text-main-900'>
                            {getFieldValue(detail, localChanges, 'billing_category_name') ||
                              getFieldValue(detail, localChanges, 'billing_category') ||
                              '-'}
                          </span>
                        </div>
                      </FieldRow>
                      <FieldRow icon={RiCalendarLine} label='Billing Month'>
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
                        icon={RiCalendarLine}
                        label='Due Date'
                        editable={permissions.canEdit}
                      >
                        {permissions.canEdit ? (
                          <Datepicker
                            value={
                              parseToDate(
                                getFieldValue(detail, localChanges, 'payment_due_date'),
                              ) ?? undefined
                            }
                            onChange={(date) => {
                              handleFieldChange(
                                'payment_due_date',
                                date ? formatTimestampToYYYYMMDD(date.getTime()) : '',
                              );
                            }}
                            placeholder='-'
                            variant='borderless'
                            size='xsmall'
                            className='text-text-main-900'
                          />
                        ) : (
                          <div className='h-8 flex items-center pl-2'>
                            <span className='text-paragraph-sm text-text-main-900'>
                              {getFieldValue(detail, localChanges, 'payment_due_date') || '-'}
                            </span>
                          </div>
                        )}
                      </FieldRow>
                      <FieldRow
                        icon={RiCalendarLine}
                        label='Committed Date'
                        editable={permissions.canEdit}
                      >
                        {permissions.canEdit ? (
                          <Datepicker
                            value={
                              parseToDate(getFieldValue(detail, localChanges, 'committed_date')) ??
                              undefined
                            }
                            onChange={(date) => {
                              handleFieldChange(
                                'committed_date',
                                date ? formatTimestampToYYYYMMDD(date.getTime()) : '',
                              );
                            }}
                            placeholder='-'
                            variant='borderless'
                            size='xsmall'
                            className='text-text-main-900'
                          />
                        ) : (
                          <div className='h-8 flex items-center pl-2'>
                            <span className='text-paragraph-sm text-text-main-900'>
                              {getFieldValue(detail, localChanges, 'committed_date') || '-'}
                            </span>
                          </div>
                        )}
                      </FieldRow>
                      <FieldRow
                        icon={RiPriceTag3Line}
                        label='Changes'
                        editable={permissions.canEdit}
                      >
                        <div className='h-8 flex w-full items-center pl-2'>
                          <BillingStatusDropdown
                            value={getFieldValue(detail, localChanges, 'changes')}
                            onValueChange={(v) => handleFieldChange('changes', v)}
                            statusOptions={CHANGE_OPTIONS}
                            disabled={!permissions.canEdit}
                            size='xsmall'
                            placeholder='-'
                          />
                        </div>
                      </FieldRow>
                      <FieldRow
                        icon={RiPriceTag3Line}
                        label='Operations Sign-off'
                        editable={permissions.canEdit}
                      >
                        <div className='h-8 flex w-full items-center pl-2'>
                          <BillingStatusDropdown
                            value={getFieldValue(detail, localChanges, 'operations_signoff')}
                            onValueChange={(v) => handleFieldChange('operations_signoff', v)}
                            statusOptions={BILLING_SIGNOFF_OPTIONS}
                            disabled={!permissions.canEdit}
                            size='xsmall'
                            placeholder='No change'
                          />
                        </div>
                      </FieldRow>
                      <FieldRow
                        icon={RiPriceTag3Line}
                        label='Legal Sign-off'
                        editable={permissions.canEdit}
                      >
                        <div className='h-8 flex w-full items-center pl-2'>
                          <BillingStatusDropdown
                            value={getFieldValue(detail, localChanges, 'legal_signoff')}
                            onValueChange={(v) => handleFieldChange('legal_signoff', v)}
                            statusOptions={BILLING_SIGNOFF_OPTIONS}
                            disabled={!permissions.canEdit}
                            size='xsmall'
                            placeholder='No change'
                          />
                        </div>
                      </FieldRow>
                      <FieldRow
                        icon={RiPriceTag3Line}
                        label='Accounts Sign-off'
                        editable={permissions.canEdit}
                      >
                        <div className='h-8 flex w-full items-center pl-2'>
                          <BillingStatusDropdown
                            value={getFieldValue(detail, localChanges, 'accounts_signoff')}
                            onValueChange={(v) => handleFieldChange('accounts_signoff', v)}
                            statusOptions={BILLING_SIGNOFF_OPTIONS}
                            disabled={!permissions.canEdit}
                            size='xsmall'
                            placeholder='No change'
                          />
                        </div>
                      </FieldRow>
                      <FieldRow
                        icon={RiPriceTag3Line}
                        label='Basic Amount'
                        editable={permissions.canEdit}
                      >
                        <Input.Root size='xsmall' variant='borderless' className='w-full'>
                          <Input.Wrapper>
                            <Input.Input
                              type='text'
                              value={getFieldValue(detail, localChanges, 'basic_amount') ?? ''}
                              onChange={(e) => {
                                const value_ = e.target.value;
                                if (isValidBillingDecimalInput(value_)) {
                                  setLocalChanges((p) => ({ ...p, basic_amount: value_ }));
                                }
                              }}
                              onBlur={(e) => handleFieldChange('basic_amount', e.target.value)}
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
                              onChange={(e) => {
                                const value_ = e.target.value;
                                if (isValidBillingDecimalInput(value_)) {
                                  setLocalChanges((p) => ({ ...p, gst_amount: value_ }));
                                }
                              }}
                              onBlur={(e) => handleFieldChange('gst_amount', e.target.value)}
                              disabled={!permissions.canEdit}
                              placeholder='-'
                            />
                            <Input.InlineAffix>{CURRENCY}</Input.InlineAffix>
                          </Input.Wrapper>
                        </Input.Root>
                      </FieldRow>
                      <FieldRow
                        icon={RiMoneyDollarCircleLine}
                        label='Discount %'
                        editable={permissions.canEdit}
                      >
                        <Input.Root size='xsmall' variant='borderless' className='w-full'>
                          <Input.Wrapper>
                            <Input.Input
                              type='text'
                              value={
                                localChanges.discount_percentage !== undefined &&
                                localChanges.discount_percentage !== null
                                  ? localChanges.discount_percentage
                                  : formatBillingPercentFromAmount(
                                      getFieldValue(detail, localChanges, 'basic_amount'),
                                      getFieldValue(detail, localChanges, 'discount_amount'),
                                    )
                              }
                              onChange={(e) => {
                                const value_ = e.target.value;
                                if (isValidBillingDecimalInput(value_)) {
                                  setLocalChanges((p) => ({ ...p, discount_percentage: value_ }));
                                }
                              }}
                              onBlur={(e) =>
                                handleFieldChange('discount_percentage', e.target.value)
                              }
                              disabled={!permissions.canEdit}
                              placeholder='-'
                            />
                            <Input.InlineAffix>%</Input.InlineAffix>
                          </Input.Wrapper>
                        </Input.Root>
                      </FieldRow>
                      <FieldRow
                        icon={RiMoneyDollarCircleLine}
                        label='Discount'
                        editable={permissions.canEdit}
                      >
                        <Input.Root size='xsmall' variant='borderless' className='w-full'>
                          <Input.Wrapper>
                            <Input.Input
                              type='text'
                              value={getFieldValue(detail, localChanges, 'discount_amount') ?? ''}
                              onChange={(e) => {
                                const value_ = e.target.value;
                                if (isValidBillingDecimalInput(value_)) {
                                  setLocalChanges((p) => {
                                    const next = { ...p, discount_amount: value_ };
                                    delete next.discount_percentage;
                                    return next;
                                  });
                                }
                              }}
                              onBlur={(e) => handleFieldChange('discount_amount', e.target.value)}
                              disabled={!permissions.canEdit}
                              placeholder='-'
                            />
                            <Input.InlineAffix>{CURRENCY}</Input.InlineAffix>
                          </Input.Wrapper>
                        </Input.Root>
                      </FieldRow>
                      <FieldRow
                        icon={RiMoneyDollarCircleLine}
                        label='Invoice Amount'
                        editable={false}
                      >
                        <Input.Root size='xsmall' variant='borderless' className='w-full'>
                          <Input.Wrapper>
                            <Input.Input
                              type='text'
                              value={getFieldValue(detail, localChanges, 'invoice_amount') ?? ''}
                              readOnly
                              placeholder='-'
                            />
                            <Input.InlineAffix>{CURRENCY}</Input.InlineAffix>
                          </Input.Wrapper>
                        </Input.Root>
                      </FieldRow>
                      <FieldRow
                        icon={RiMoneyDollarCircleLine}
                        label='TDS %'
                        editable={permissions.canEdit}
                      >
                        <Input.Root size='xsmall' variant='borderless' className='w-full'>
                          <Input.Wrapper>
                            <Input.Input
                              type='text'
                              value={getFieldValue(detail, localChanges, 'tds_percentage') ?? ''}
                              onChange={(e) => {
                                const value_ = e.target.value;
                                if (isValidBillingDecimalInput(value_)) {
                                  setLocalChanges((p) => ({ ...p, tds_percentage: value_ }));
                                }
                              }}
                              onBlur={(e) => handleFieldChange('tds_percentage', e.target.value)}
                              disabled={!permissions.canEdit}
                              placeholder='-'
                            />
                            <Input.InlineAffix>%</Input.InlineAffix>
                          </Input.Wrapper>
                        </Input.Root>
                      </FieldRow>
                      <FieldRow
                        icon={RiMoneyDollarCircleLine}
                        label='TDS Amount'
                        editable={permissions.canEdit}
                      >
                        <Input.Root size='xsmall' variant='borderless' className='w-full'>
                          <Input.Wrapper>
                            <Input.Input
                              type='text'
                              value={getFieldValue(detail, localChanges, 'tds_amount') ?? ''}
                              onChange={(e) => {
                                const value_ = e.target.value;
                                if (isValidBillingDecimalInput(value_)) {
                                  setLocalChanges((p) => ({ ...p, tds_amount: value_ }));
                                }
                              }}
                              onBlur={(e) => handleFieldChange('tds_amount', e.target.value)}
                              disabled={!permissions.canEdit}
                              placeholder='-'
                            />
                            <Input.InlineAffix>{CURRENCY}</Input.InlineAffix>
                          </Input.Wrapper>
                        </Input.Root>
                      </FieldRow>
                      <FieldRow
                        icon={RiMoneyDollarCircleLine}
                        label='Total Amount'
                        editable={false}
                      >
                        <Input.Root size='xsmall' variant='borderless' className='w-full'>
                          <Input.Wrapper>
                            <Input.Input
                              type='text'
                              value={getFieldValue(detail, localChanges, 'total_amount') ?? ''}
                              readOnly
                              placeholder='-'
                            />
                            <Input.InlineAffix>{CURRENCY}</Input.InlineAffix>
                          </Input.Wrapper>
                        </Input.Root>
                      </FieldRow>
                      <FieldRow
                        icon={RiMoneyDollarCircleLine}
                        label='Collected Amount'
                        editable={permissions.canEdit}
                      >
                        <Input.Root size='xsmall' variant='borderless' className='w-full'>
                          <Input.Wrapper>
                            <Input.Input
                              type='text'
                              value={getFieldValue(detail, localChanges, 'collected_amount') ?? ''}
                              onChange={(e) => {
                                const value_ = e.target.value;
                                if (isValidBillingDecimalInput(value_)) {
                                  setLocalChanges((p) => ({
                                    ...p,
                                    collected_amount: value_,
                                  }));
                                }
                              }}
                              onBlur={(e) => handleFieldChange('collected_amount', e.target.value)}
                              disabled={!permissions.canEdit}
                              placeholder='-'
                            />
                            <Input.InlineAffix>{CURRENCY}</Input.InlineAffix>
                          </Input.Wrapper>
                        </Input.Root>
                      </FieldRow>
                      <FieldRow
                        icon={RiMoneyDollarCircleLine}
                        label='Outstanding Amount'
                        editable={false}
                      >
                        <Input.Root size='xsmall' variant='borderless' className='w-full'>
                          <Input.Wrapper>
                            <Input.Input
                              type='text'
                              // value={(getFieldValue(detail, localChanges, 'total_amount') - getFieldValue(detail, localChanges, 'collected_amount')) ?? ''}
                              value={formatBillingDecimal(
                                Number(getFieldValue(detail, localChanges, 'total_amount') || 0) -
                                  Number(
                                    getFieldValue(detail, localChanges, 'collected_amount') || 0,
                                  ),
                              )}
                              readOnly
                              placeholder='-'
                            />
                            <Input.InlineAffix>{CURRENCY}</Input.InlineAffix>
                          </Input.Wrapper>
                        </Input.Root>
                      </FieldRow>
                      <FieldRow
                        icon={RiFileLine}
                        label='Payment Status'
                        editable={permissions.canEdit}
                      >
                        <div className='h-8 flex items-center pl-2'>
                          <BillingStatusDropdown
                            value={getFieldValue(detail, localChanges, 'payment_status')}
                            onValueChange={(v) => handleFieldChange('payment_status', v)}
                            statusOptions={dynamicStatusOptions}
                            disabled={!permissions.canEdit}
                            size='xsmall'
                            placeholder='Select Status'
                          />
                        </div>
                      </FieldRow>
                      {isInvoiceUploadAllowed && (
                        <FieldRow icon={RiFileLine} label='Invoice PDF' alignTop>
                          <div className='flex w-full min-w-0 flex-col items-start gap-2 py-2 pl-2'>
                            {detail.invoice_upload && (
                              <Tooltip.Root delayDuration={200}>
                                <Tooltip.Trigger asChild>
                                  <LinkButton.Root
                                    type='button'
                                    variant='primary'
                                    className='max-w-full min-w-0'
                                    onClick={() =>
                                      handleInvoicePreviewClick(
                                        detail.invoice_upload,
                                        detail.invoice_name || 'Invoice PDF uploaded',
                                      )
                                    }
                                  >
                                    <span className='truncate'>
                                      {detail.invoice_name || 'Invoice PDF uploaded'}
                                    </span>
                                  </LinkButton.Root>
                                </Tooltip.Trigger>
                                <Tooltip.Content side='top' size='xsmall'>
                                  {detail.invoice_name || 'Invoice PDF uploaded'}
                                </Tooltip.Content>
                              </Tooltip.Root>
                            )}
                            {permissions.canEdit && (
                              <Button.Root
                                type='button'
                                variant='neutral'
                                mode='stroke'
                                size='xsmall'
                                className='gap-1'
                                onClick={handleInvoiceUploadClick}
                                loading={invoiceUploadMeta.is_loading}
                                disabled={invoiceUploadMeta.is_loading}
                              >
                                <Button.Icon as={RiUploadLine} className='p-0.5' />
                                <span>
                                  {invoiceUploadMeta.is_loading
                                    ? 'Uploading...'
                                    : 'Upload Invoice PDF'}
                                </span>
                              </Button.Root>
                            )}
                          </div>
                        </FieldRow>
                      )}
                    </div>

                    {/* Attachments Section */}
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

                {/* Right Panel - Activity / Notes placeholder */}
                <div className='flex flex-1 flex-col h-full overflow-hidden'>
                  <div className='border-b border-stroke-soft-200 px-6 py-3.5'>
                    <div className='flex items-center gap-2'>
                      <RiStickyNoteLine size={20} className='text-text-sub-500' />
                      <span className='label-small text-text-sub-500'>Activity</span>
                    </div>
                  </div>

                  <CrmComment
                    taskId={billingId}
                    commentsData={billingCommentsData}
                    loading={commentsLoading}
                    onAddComment={handleBillingAddComment}
                    commentDoctype='Client Billing Comment'
                    onCommentsMutated={() => dispatch(fetchBillingComments(billingId))}
                  />
                </div>
              </div>
            )}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>

      <InvoiceConfirmModal
        open={invoiceConfirmOpen}
        values={invoiceConfirmValues}
        onCancel={handleCancelInvoiceConfirm}
        onConfirm={handleConfirmInvoiceAmounts}
        onOpenChange={(open) => {
          if (!open) handleCancelInvoiceConfirm();
        }}
      />
      <MediaPreview
        items={invoicePreviewItems}
        initialIndex={0}
        open={invoicePreviewOpen}
        onClose={() => setInvoicePreviewOpen(false)}
      />
    </>
  );
};

export default BillingViewDrawer;
