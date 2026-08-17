// React
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

// Third-party libraries
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { format, parse } from 'date-fns';
import { RiErrorWarningLine, RiUploadLine } from 'react-icons/ri';

// UI Components
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import { Datepicker } from '@/components/ui/datepicker';
import * as Input from '@/components/ui/input';
import * as LinkButton from '@/components/ui/link-button';
import MediaPreview from '@/components/ui/media-preview';
import * as Table from '@/components/ui/table';
import BillingStatusDropdown from '@/components/billing/billing-status-dropdown';
import InvoiceConfirmModal from '@/components/billing/invoice-confirm-modal';
import SetStatusesModal, {
  StatusColumnPopover,
} from '@/components/space-management/status-configuration';
import BillingGroupedView from '@/components/billing/billing-grouped-view';

// Hooks
import { useColumnConfig, useColumnConfigPopoverRef } from '@/hooks/use-column-config';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';

// Redux
import {
  fetchBillingList,
  fetchBillingListPref,
  saveBillingListPref,
  selectBillingList,
} from '@/redux/billingSlice';
import * as Tooltip from '@/components/ui/tooltip';

// Utils & Helpers
import { CURRENCY } from '@/constants/constants';
import { findScrollableParent } from '@/components/event-management/event-participants-utils';
import {
  BILLING_GROUP_BY_PAGE_SIZE,
  BILLING_DOCTYPE,
  BILLING_STATUS_FIELD_CONFIG,
  BILLING_DECIMAL_FIELDS,
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
  BILLING_COLUMN_CONFIG_DEFS,
} from '@/components/billing/constants';
import { formatMonthYear } from '@/utils/date-utils';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import { toAbsoluteAttachmentUrl, withPrefix } from '@/lib/utils';

// API
import apiClient from '@/api/axios';
import { getStatusOptions } from '@/api/dynamic-status';

const BILLING_TABLE_ID = 'billing-table';
const BILLING_COLUMN_PREF_CACHE = new Map();
const SCROLL_LOAD_THRESHOLD = 200;

const fmtAmt = (value) => withPrefix(CURRENCY, formatBillingDecimal(value) || '0');

const toBillingDropdownOptions = (dynamicOptions, fallbackOptions) => {
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

const stripHtmlToText = (html) => {
  if (html == null || html === '') return '';
  return String(html)
    .replaceAll(/<[^>]*>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
};

const LATEST_COMMENT_MAX_LENGTH = 15;

const truncateLatestComment = (text) => {
  if (!text) return '';
  if (text.length <= LATEST_COMMENT_MAX_LENGTH) return text;
  return `${text.slice(0, LATEST_COMMENT_MAX_LENGTH)}…`;
};

const BillingTable = React.forwardRef(
  (
    {
      rows = [],
      isLoading = false,
      error = null,
      onRetry,
      variant = 'compact',
      onRowChange,
      sorting,
      onSortingChange,
      onRowSelect = () => {},
      tableId = BILLING_TABLE_ID,
      defaultVisibleColumns = [],
      canEdit = true,
      // Scroll pagination
      onLoadMore,
      hasMore = false,
      isLoadingMore = false,
      enableScrollPagination = false,
      isGrouped = false,
      groupKeys = [],
      groupsMap = {},
    },
    ref,
  ) => {
    const dispatch = useDispatch();
    const billingList = useSelector(selectBillingList);
    const [localRows, setLocalRows] = useState(rows);
    const [localSorting, setLocalSorting] = useState(() => (Array.isArray(sorting) ? sorting : []));
    const [editingCell, setEditingCell] = useState(null);
    const [activeStatusField, setActiveStatusField] = useState(null);
    const [statusOptionsRefreshKey, setStatusOptionsRefreshKey] = useState(0);
    const { statusPopoverColumnConfig, syncColumnConfigHookToPopover } =
      useColumnConfigPopoverRef();
    const [dynamicStatusOptionsByField, setDynamicStatusOptionsByField] = useState({});

    useEffect(() => {
      let cancelled = false;
      const fetchAll = async () => {
        const entries = await Promise.all(
          Object.keys(BILLING_STATUS_FIELD_CONFIG).map(async (field) => {
            try {
              const opts = await getStatusOptions({ doctype: BILLING_DOCTYPE, field });
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
    }, [activeStatusField, statusOptionsRefreshKey]);

    const getBillingStatusOptions = useCallback(
      (field) =>
        toBillingDropdownOptions(
          dynamicStatusOptionsByField[field],
          BILLING_STATUS_FIELD_CONFIG[field]?.fallback,
        ),
      [dynamicStatusOptionsByField],
    );

    const renderBillingStatusHeader = useCallback(
      (column, label, fieldKey, className = 'w-[180px]') => (
        <div className='flex items-center gap-0.5'>
          <Table.SortableHeader column={column} label={label} className={className} sortable />
          <StatusColumnPopover
            columnId={fieldKey}
            columnConfigHook={statusPopoverColumnConfig}
            onOpenStatuses={() => setActiveStatusField(fieldKey)}
          />
        </div>
      ),
      [statusPopoverColumnConfig],
    );
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
      billingId: '',
      rowIndex: -1,
      file_url: '',
      file_name: '',
      is_loading: false,
    });
    const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);
    const [invoicePreviewItems, setInvoicePreviewItems] = useState([]);
    const localRowsRef = useRef(localRows);
    localRowsRef.current = localRows;
    const getRowKey = (row) => String(row?.original?.name ?? row?.original?.id ?? '');
    const getRowIndex = (row) =>
      localRowsRef.current.findIndex((r) => String(r?.name ?? r?.id) === getRowKey(row));
    const [visibleGroupCount, setVisibleGroupCount] = useState(BILLING_GROUP_BY_PAGE_SIZE);
    const invoiceFileInputRef = useRef(null);
    const billingTableRootRef = useRef(null);
    const [scrollContainerEl, setScrollContainerEl] = useState(null);

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    useEffect(() => {
      const root = billingTableRootRef.current;
      if (!root) {
        setScrollContainerEl(null);
        return;
      }

      const tableScroller = root.firstElementChild;
      if (tableScroller instanceof HTMLElement) {
        const { overflowY } = getComputedStyle(tableScroller);
        if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
          setScrollContainerEl(tableScroller);
          return;
        }
      }

      setScrollContainerEl(findScrollableParent(root));
    }, [localRows.length, isGrouped, isLoading, isLoadingMore, groupKeys.length]);

    useEffect(() => {
      setLocalRows(rows);
    }, [rows]);

    useEffect(() => {
      if (!Array.isArray(sorting)) return;
      setLocalSorting(sorting);
    }, [sorting]);

    const setLocalRowField = useCallback((rowIndex, field, value) => {
      setLocalRows((previous) => {
        const next = [...previous];
        const existing = next[rowIndex] || {};
        next[rowIndex] = { ...existing, [field]: value };
        return next;
      });
    }, []);

    const isRowInvoiceUploadAllowed = useCallback((row) => {
      const ops = row?.operations_signoff;
      const legal = row?.legal_signoff;
      const accounts = row?.accounts_signoff;
      return Boolean(ops && legal && accounts);
    }, []);

    const handleInvoiceUploadClick = useCallback(
      (rowIndex) => {
        const row = localRowsRef.current?.[rowIndex];
        const billingId = row?.name ?? row?.id;
        if (!billingId) return;
        if (!canEdit) return;
        if (!isRowInvoiceUploadAllowed(row)) return;

        setInvoiceUploadMeta((p) => ({
          ...p,
          billingId: String(billingId),
          rowIndex,
        }));
        invoiceFileInputRef.current?.click?.();
      },
      [canEdit, isRowInvoiceUploadAllowed],
    );

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
        const file = event?.target?.files?.[0];
        if (!file) return;

        const { billingId } = invoiceUploadMeta;
        const { rowIndex } = invoiceUploadMeta;
        if (!billingId || rowIndex < 0) return;

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

        setInvoiceUploadMeta((p) => ({
          ...p,
          is_loading: true,
          file_url: '',
          file_name: '',
        }));

        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('name', billingId);

          const response = await apiClient.post(
            '/method/devx.collection.api.collection.upload_invoice_pdf_and_extract',
            formData,
          );
          const payload = response?.data?.message || response?.data || {};
          const extracted = payload?.extracted || {};

          const fileUrl = payload?.file_url || '';
          const fileName = payload?.file_name || file.name || '';

          setInvoiceUploadMeta((p) => ({
            ...p,
            is_loading: false,
            file_url: fileUrl,
            file_name: fileName,
          }));

          const rowAfterUpload = localRowsRef.current?.[rowIndex];
          setInvoiceConfirmValues({
            basic_amount: extracted?.basic_amount ?? '',
            gst_amount: extracted?.gst_amount ?? '',
            discount_amount: extracted?.discount_amount ?? rowAfterUpload?.discount_amount ?? '',
            tds_amount: extracted?.tds_amount ?? '',
            total_amount: extracted?.total_amount ?? '',
            collected_amount: rowAfterUpload?.collected_amount ?? extracted?.collected_amount ?? '',
          });
          setInvoiceConfirmOpen(true);
        } catch (error) {
          setInvoiceUploadMeta((p) => ({ ...p, is_loading: false }));
          showErrorToast(extractErrorMessage(error, 'Failed to upload invoice PDF'));
        } finally {
          if (invoiceFileInputRef.current) invoiceFileInputRef.current.value = '';
        }
      },
      [invoiceUploadMeta.billingId, invoiceUploadMeta.rowIndex, MAX_FILE_SIZE, setLocalRowField],
    );

    const handleCancelInvoiceConfirm = useCallback(() => {
      const { rowIndex } = invoiceUploadMeta;
      if (rowIndex >= 0) {
        const prev = rows?.[rowIndex];
        setLocalRowField(rowIndex, 'invoice_upload', prev?.invoice_upload ?? '');
        setLocalRowField(rowIndex, 'invoice_name', prev?.invoice_name ?? '');
      }
      setInvoiceConfirmOpen(false);
      setInvoiceUploadMeta((p) => ({ ...p, file_url: '', file_name: '' }));
    }, [invoiceUploadMeta.rowIndex, rows, setLocalRowField]);

    const handleConfirmInvoiceAmounts = useCallback(
      async (payload) => {
        const { billingId } = invoiceUploadMeta;
        const { rowIndex } = invoiceUploadMeta;
        if (!billingId || rowIndex < 0 || !payload) return;

        try {
          await apiClient.post('/method/devx.collection.api.collection.confirm_invoice_amounts', {
            name: billingId,
            basic_amount: payload.basic_amount,
            gst_amount: payload.gst_amount,
            discount_amount: payload.discount_amount ?? 0,
            tds_amount: payload.tds_amount ?? 0,
            tds_percentage: payload.tds_percentage ?? 0,
          });

          const invoiceAmount = computeBillingInvoiceAmount(
            payload.basic_amount,
            payload.gst_amount,
          );
          const totalAmount = computeBillingTotalAmount(
            invoiceAmount,
            payload.tds_amount,
            payload.discount_amount,
          );

          setLocalRowField(rowIndex, 'basic_amount', payload.basic_amount);
          setLocalRowField(rowIndex, 'gst_amount', payload.gst_amount);
          setLocalRowField(rowIndex, 'discount_amount', payload.discount_amount ?? 0);
          setLocalRowField(rowIndex, 'tds_percentage', payload.tds_percentage ?? 0);
          setLocalRowField(rowIndex, 'tds_amount', payload.tds_amount ?? 0);
          setLocalRowField(rowIndex, 'invoice_amount', formatBillingDecimal(invoiceAmount));
          setLocalRowField(rowIndex, 'total_amount', formatBillingDecimal(totalAmount));
          if (payload.collected_amount !== undefined) {
            setLocalRowField(rowIndex, 'collected_amount', payload.collected_amount);
          }

          setInvoiceConfirmOpen(false);
          showSuccessToast('Invoice amounts saved successfully');

          const { sorting, filters, pageSize } = billingList;
          let orderBy = 'creation desc';
          if (sorting?.length > 0) {
            const { id, desc } = sorting[0];
            orderBy = `${id} ${desc ? 'desc' : 'asc'}`;
          }
          dispatch(fetchBillingList({ filters, page: 1, pageSize, orderBy, append: false }));
        } catch (error) {
          showErrorToast(extractErrorMessage(error, 'Failed to save invoice amounts'));
        }
      },
      [invoiceUploadMeta, setLocalRowField, billingList, dispatch],
    );

    const updateRowField = useCallback(
      (rowIndex, field, value) => {
        const originalValue = rows?.[rowIndex]?.[field];

        // Check if value actually changed
        let isChanged = false;
        isChanged = [
          'basic_amount',
          'gst_amount',
          'discount_amount',
          'tds_percentage',
          'tds_amount',
          'total_amount',
          'collected_amount',
        ].includes(field)
          ? (Number.parseFloat(originalValue) || 0) !== (Number.parseFloat(value) || 0)
          : String(originalValue ?? '') !== String(value ?? '');

        if (!isChanged) return;

        setLocalRows((previous) => {
          const next = [...previous];
          const existing = next[rowIndex] || {};
          const updated = { ...existing, [field]: value };
          next[rowIndex] = updated;
          onRowChange?.(updated, rowIndex, field);
          return next;
        });
      },
      [onRowChange, rows],
    );

    const handleInputBlur = useCallback(
      (billingId, fieldName) => {
        setEditingCell(null);
        const rowIndex = localRowsRef.current.findIndex(
          (r) => String(r?.name ?? r?.id) === String(billingId),
        );
        if (rowIndex < 0) return;
        const updated = localRowsRef.current?.[rowIndex];
        const original = rows?.[rowIndex];
        if (!updated || !original) return;

        const currentValue = updated[fieldName];
        const originalValue = original[fieldName];

        // Discount % is UI-only: convert to discount_amount, then save that field.
        if (fieldName === 'discount_percentage') {
          if (!isValidBillingDecimalInput(String(currentValue ?? ''))) {
            showErrorToast(MAX_DECIMAL_PLACES_ERROR);
            setLocalRowField(
              rowIndex,
              'discount_percentage',
              formatBillingPercentFromAmount(original.basic_amount, original.discount_amount),
            );
            return;
          }

          const basicAmount = Number.parseFloat(updated.basic_amount) || 0;
          const gstAmount = Number.parseFloat(updated.gst_amount) || 0;
          const pctRaw = String(currentValue ?? '').trim();
          const pct = pctRaw === '' ? 0 : Number.parseFloat(pctRaw);

          if (Number.isNaN(pct) || pct < 0) {
            showErrorToast('Discount % cannot be negative.');
            setLocalRowField(
              rowIndex,
              'discount_percentage',
              formatBillingPercentFromAmount(original.basic_amount, original.discount_amount),
            );
            return;
          }

          const roundedPct = Math.round(pct * 100) / 100;
          const discountAmount = computeBillingAmountFromPercent(basicAmount, roundedPct);
          const tdsAmount = Number.parseFloat(updated.tds_amount) || 0;

          if (discountAmount > basicAmount + gstAmount) {
            showErrorToast(DISCOUNT_EXCEEDS_INVOICE_ERROR);
            setLocalRowField(
              rowIndex,
              'discount_percentage',
              formatBillingPercentFromAmount(original.basic_amount, original.discount_amount),
            );
            return;
          }
          if (discountAmount + tdsAmount > basicAmount + gstAmount) {
            showErrorToast(DISCOUNT_PLUS_TDS_EXCEEDS_INVOICE_ERROR);
            setLocalRowField(
              rowIndex,
              'discount_percentage',
              formatBillingPercentFromAmount(original.basic_amount, original.discount_amount),
            );
            return;
          }

          const originalDiscount = Number.parseFloat(original.discount_amount) || 0;
          const nextPctDisplay = formatBillingDecimal(roundedPct) || '0';
          const nextAmountDisplay = formatBillingDecimal(discountAmount) || '0';

          if (originalDiscount === discountAmount) {
            setLocalRowField(rowIndex, 'discount_percentage', nextPctDisplay);
            setLocalRowField(rowIndex, 'discount_amount', nextAmountDisplay);
            return;
          }

          const invoiceAmount = computeBillingInvoiceAmount(basicAmount, gstAmount);
          const totalAmount = computeBillingTotalAmount(
            invoiceAmount,
            tdsAmount,
            discountAmount,
          );
          const merged = {
            ...updated,
            discount_percentage: nextPctDisplay,
            discount_amount: nextAmountDisplay,
            invoice_amount: formatBillingDecimal(invoiceAmount),
            total_amount: formatBillingDecimal(totalAmount),
          };

          setLocalRows((previous) => {
            const next = [...previous];
            next[rowIndex] = merged;
            return next;
          });

          // Persist as discount_amount (not discount_percentage).
          onRowChange?.(merged, rowIndex, 'discount_amount');
          return;
        }

        // Check if value actually changed
        let isChanged = false;
        isChanged = [
          'basic_amount',
          'gst_amount',
          'discount_amount',
          'tds_percentage',
          'tds_amount',
          'total_amount',
          'collected_amount',
        ].includes(fieldName)
          ? (Number.parseFloat(originalValue) || 0) !== (Number.parseFloat(currentValue) || 0)
          : String(originalValue ?? '') !== String(currentValue ?? '');

        if (!isChanged) return;

        if (
          BILLING_DECIMAL_FIELDS.includes(fieldName) &&
          !isValidBillingDecimalInput(String(currentValue ?? ''))
        ) {
          showErrorToast(MAX_DECIMAL_PLACES_ERROR);
          if (originalValue !== undefined) {
            setLocalRowField(rowIndex, fieldName, originalValue);
          }
          return;
        }

        // Validation: amounts cannot be negative
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
          const basicAmount = Number.parseFloat(updated.basic_amount) || 0;
          const gstAmount = Number.parseFloat(updated.gst_amount) || 0;
          const discountAmount = Number.parseFloat(updated.discount_amount) || 0;
          const tdsAmount = Number.parseFloat(updated.tds_amount) || 0;
          const totalAmount = Number.parseFloat(updated.total_amount) || 0;
          const collectedAmount = Number.parseFloat(updated.collected_amount) || 0;

          let error = null;
          if (basicAmount < 0) error = 'Basic amount cannot be negative.';
          else if (gstAmount < 0) error = 'GST amount cannot be negative.';
          else if (discountAmount < 0) error = 'Discount cannot be negative.';
          else if (discountAmount > basicAmount + gstAmount) error = DISCOUNT_EXCEEDS_INVOICE_ERROR;
          else if (tdsAmount < 0) error = 'TDS amount cannot be negative.';
          else if (tdsAmount > basicAmount) error = TDS_AMOUNT_EXCEEDS_BASIC_ERROR;
          else if (discountAmount + tdsAmount > basicAmount + gstAmount) {
            error = DISCOUNT_PLUS_TDS_EXCEEDS_INVOICE_ERROR;
          } else if (totalAmount < 0) error = 'Total amount cannot be negative.';
          else if (collectedAmount < 0) error = 'Collected amount cannot be negative.';
          else if (collectedAmount > totalAmount) {
            error = 'Collected amount cannot be greater than total amount.';
          }

          if (error) {
            showErrorToast(error);
            // Revert local field to original value from props
            if (originalValue !== undefined) {
              setLocalRowField(rowIndex, fieldName, originalValue);
            }
            return;
          }
        }

        if (fieldName === 'tds_percentage') {
          const basicAmount = Number.parseFloat(updated.basic_amount) || 0;
          const pctRaw = String(currentValue ?? '').trim();
          const pct = pctRaw === '' ? 0 : Number.parseFloat(pctRaw);

          if (Number.isNaN(pct) || pct < 0) {
            showErrorToast('TDS % cannot be negative.');
            if (originalValue !== undefined) {
              setLocalRowField(rowIndex, fieldName, originalValue);
            }
            return;
          }

          const roundedPct = Math.round(pct * 100) / 100;
          const tdsAmount = Math.round(((basicAmount * roundedPct) / 100) * 100) / 100;

          if (tdsAmount > basicAmount) {
            showErrorToast(TDS_AMOUNT_EXCEEDS_BASIC_ERROR);
            if (originalValue !== undefined) {
              setLocalRowField(rowIndex, fieldName, originalValue);
            }
            return;
          }

          const gstAmount = Number.parseFloat(updated.gst_amount) || 0;
          const discountAmount = Number.parseFloat(updated.discount_amount) || 0;
          if (discountAmount + tdsAmount > basicAmount + gstAmount) {
            showErrorToast(DISCOUNT_PLUS_TDS_EXCEEDS_INVOICE_ERROR);
            if (originalValue !== undefined) {
              setLocalRowField(rowIndex, fieldName, originalValue);
            }
            return;
          }

          const invoiceAmount = computeBillingInvoiceAmount(basicAmount, gstAmount);
          const totalAmount = computeBillingTotalAmount(
            invoiceAmount,
            tdsAmount,
            discountAmount,
          );
          const merged = {
            ...updated,
            tds_percentage: formatBillingDecimal(roundedPct),
            tds_amount: formatBillingDecimal(tdsAmount),
            invoice_amount: formatBillingDecimal(invoiceAmount),
            total_amount: formatBillingDecimal(totalAmount),
          };

          setLocalRows((previous) => {
            const next = [...previous];
            next[rowIndex] = merged;
            return next;
          });

          if (onRowChange) {
            onRowChange(merged, rowIndex, fieldName);
          }
          return;
        }

        // Keep local invoice/total in sync when amount fields that affect them change.
        if (
          ['basic_amount', 'gst_amount', 'discount_amount', 'tds_amount'].includes(fieldName)
        ) {
          let nextUpdated = updated;
          if (
            BILLING_DECIMAL_FIELDS.includes(fieldName) &&
            String(currentValue ?? '').trim() !== ''
          ) {
            const normalized = formatBillingDecimal(currentValue);
            if (normalized !== String(currentValue ?? '')) {
              nextUpdated = { ...updated, [fieldName]: normalized };
            }
          }

          const basicAmount = Number.parseFloat(nextUpdated.basic_amount) || 0;
          const gstAmount = Number.parseFloat(nextUpdated.gst_amount) || 0;
          const discountAmount = Number.parseFloat(nextUpdated.discount_amount) || 0;
          const tdsAmount = Number.parseFloat(nextUpdated.tds_amount) || 0;
          const invoiceAmount = computeBillingInvoiceAmount(basicAmount, gstAmount);
          const totalAmount = computeBillingTotalAmount(
            invoiceAmount,
            tdsAmount,
            discountAmount,
          );
          const merged = {
            ...nextUpdated,
            invoice_amount: formatBillingDecimal(invoiceAmount),
            total_amount: formatBillingDecimal(totalAmount),
          };

          setLocalRows((previous) => {
            const next = [...previous];
            next[rowIndex] = merged;
            return next;
          });

          if (onRowChange) {
            onRowChange(merged, rowIndex, fieldName);
          }
          return;
        }

        let payload = updated;
        if (
          BILLING_DECIMAL_FIELDS.includes(fieldName) &&
          String(currentValue ?? '').trim() !== ''
        ) {
          const normalized = formatBillingDecimal(currentValue);
          if (normalized !== String(currentValue ?? '')) {
            setLocalRowField(rowIndex, fieldName, normalized);
            payload = { ...updated, [fieldName]: normalized };
          }
        }

        if (onRowChange) {
          onRowChange(payload, rowIndex, fieldName);
        }
      },
      [onRowChange, rows, setLocalRowField],
    );

    const handleSortingChange = useCallback(
      (updaterOrValue) => {
        setLocalSorting((previous) => {
          const next =
            typeof updaterOrValue === 'function' ? updaterOrValue(previous) : updaterOrValue;
          onSortingChange?.(next);
          return next;
        });
      },
      [onSortingChange],
    );

    const allColumnDefs = useMemo(
      () => [
        {
          id: 'name',
          accessorKey: 'name',
          columnLabel: 'Client',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Client' sortable className='w-[180px]' />
          ),
          cell: ({ row }) => (
            <Tooltip.Root size='xsmall'>
              <Tooltip.Trigger asChild>
                <span className='paragraph-small text-text-sub-500 whitespace-nowrap max-w-[150px] truncate block'>
                  {row.original.client_name || row.original.client || '--'}
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content side='bottom'>
                {row.original.client_name || row.original.client || '--'}
              </Tooltip.Content>
            </Tooltip.Root>
          ),
          enableSorting: true,
        },
        {
          id: 'center',
          accessorKey: 'center',
          columnLabel: 'Center',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Center' sortable className='w-[150px]' />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500 whitespace-nowrap max-w-[120px] truncate block'>
              {row.original.center_name || row.original.center || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'billing_category',
          accessorKey: 'billing_category',
          columnLabel: 'Category',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Category' sortable className='w-[120px]' />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500 whitespace-nowrap max-w-[120px] truncate block'>
              {row.original.billing_category || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'billing_month',
          accessorKey: 'billing_month',
          columnLabel: 'Billing Month',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Billing Month' sortable />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500 whitespace-nowrap'>
              {row.original.billing_month || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'triggered_month',
          accessorKey: 'triggered_month',
          columnLabel: 'Triggered Month',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Triggered Month' sortable />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500 whitespace-nowrap'>
              {row.original.triggered_month || '--'}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'payment_due_date',
          accessorKey: 'payment_due_date',
          columnLabel: 'Due Date',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Due Date' sortable />
          ),
          cell: ({ row }) => {
            const value = row.original.payment_due_date || '';
            const dateObject = value
              ? (() => {
                  try {
                    const d = parse(value, 'yyyy-MM-dd', new Date());
                    return Number.isNaN(d.getTime()) ? null : d;
                  } catch {
                    return null;
                  }
                })()
              : null;
            if (!canEdit) {
              return (
                <span className='paragraph-small text-text-sub-500 whitespace-nowrap'>
                  {dateObject ? format(dateObject, 'LLL dd, y') : '--'}
                </span>
              );
            }
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <Datepicker
                  value={dateObject ?? undefined}
                  onChange={(date) =>
                    updateRowField(
                      getRowIndex(row),
                      'payment_due_date',
                      date ? format(date, 'yyyy-MM-dd') : '',
                    )
                  }
                  placeholder='-'
                  size='xsmall'
                  variant='borderless'
                  formatDate={(d) => format(d, 'LLL dd, y')}
                  className='p-0'
                />
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'changes',
          accessorKey: 'changes',
          columnLabel: 'Changes',
          header: ({ column }) =>
            renderBillingStatusHeader(column, 'Changes', 'changes', 'w-[200px]'),
          cell: ({ row }) => (
            <div onClick={(e) => e.stopPropagation()}>
              <BillingStatusDropdown
                value={row.original.changes || ''}
                onValueChange={(value) => updateRowField(getRowIndex(row), 'changes', value)}
                statusOptions={getBillingStatusOptions('changes')}
                disabled={!canEdit}
                showArrow={canEdit}
                placeholder='-'
              />
            </div>
          ),
          enableSorting: true,
        },
        {
          id: 'operations_signoff',
          accessorKey: 'operations_signoff',
          columnLabel: 'Operations Sign-off',
          header: ({ column }) =>
            renderBillingStatusHeader(column, 'Operations Sign-off', 'operations_signoff'),
          cell: ({ row }) => (
            <BillingStatusDropdown
              value={row.original.operations_signoff}
              onValueChange={(value) =>
                updateRowField(getRowIndex(row), 'operations_signoff', value)
              }
              statusOptions={getBillingStatusOptions('operations_signoff')}
              disabled={!canEdit}
              showArrow={canEdit}
              placeholder='-'
            />
          ),
          enableSorting: true,
        },
        {
          id: 'legal_signoff',
          accessorKey: 'legal_signoff',
          columnLabel: 'Legal Sign-off',
          header: ({ column }) =>
            renderBillingStatusHeader(column, 'Legal Sign-off', 'legal_signoff'),
          cell: ({ row }) => (
            <BillingStatusDropdown
              value={row.original.legal_signoff}
              onValueChange={(value) => updateRowField(getRowIndex(row), 'legal_signoff', value)}
              statusOptions={getBillingStatusOptions('legal_signoff')}
              disabled={!canEdit}
              showArrow={canEdit}
              placeholder='-'
            />
          ),
          enableSorting: true,
        },
        {
          id: 'accounts_signoff',
          accessorKey: 'accounts_signoff',
          columnLabel: 'Accounts Sign-off',
          header: ({ column }) =>
            renderBillingStatusHeader(column, 'Accounts Sign-off', 'accounts_signoff'),
          cell: ({ row }) => (
            <BillingStatusDropdown
              value={row.original.accounts_signoff}
              onValueChange={(value) => updateRowField(getRowIndex(row), 'accounts_signoff', value)}
              statusOptions={getBillingStatusOptions('accounts_signoff')}
              disabled={!canEdit}
              showArrow={canEdit}
              placeholder='-'
            />
          ),
          enableSorting: true,
        },
        {
          id: 'basic_amount',
          accessorKey: 'basic_amount',
          columnLabel: 'Basic Amount',
          header: ({ column }) => (
            <Table.SortableHeader
              column={column}
              label='Basic Amount'
              className='w-[120px]'
              sortable
            />
          ),
          cell: ({ row }) => {
            const isEditing =
              canEdit &&
              editingCell?.rowIndex === getRowIndex(row) &&
              editingCell?.columnId === 'basic_amount';
            const value = row.original.basic_amount || '';

            if (isEditing) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        value={value}
                        onChange={(e) => {
                          const value_ = e.target.value;
                          // allow only numbers and a single decimal point
                          if (isValidBillingDecimalInput(value_)) {
                            setLocalRowField(getRowIndex(row), 'basic_amount', value_);
                          }
                        }}
                        onBlur={() => handleInputBlur(getRowKey(row), 'basic_amount')}
                        placeholder='0'
                        autoFocus
                      />
                      <Input.InlineAffix>₹</Input.InlineAffix>
                    </Input.Wrapper>
                  </Input.Root>
                </div>
              );
            }
            return (
              <div
                className='paragraph-small text-text-sub-500'
                onClick={(e) => {
                  e.stopPropagation();
                  if (canEdit)
                    setEditingCell({ rowIndex: getRowIndex(row), columnId: 'basic_amount' });
                }}
              >
                {fmtAmt(value)}
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'gst_amount',
          accessorKey: 'gst_amount',
          columnLabel: 'GST Amount',
          header: ({ column }) => (
            <Table.SortableHeader
              column={column}
              label='GST Amount'
              className='w-[120px]'
              sortable
            />
          ),
          cell: ({ row }) => {
            const isEditing =
              canEdit &&
              editingCell?.rowIndex === getRowIndex(row) &&
              editingCell?.columnId === 'gst_amount';
            const value = row.original.gst_amount || '';

            if (isEditing) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        value={value}
                        onChange={(e) => {
                          const value_ = e.target.value;
                          // allow only numbers and a single decimal point
                          if (isValidBillingDecimalInput(value_)) {
                            setLocalRowField(getRowIndex(row), 'gst_amount', value_);
                          }
                        }}
                        onBlur={() => handleInputBlur(getRowKey(row), 'gst_amount')}
                        placeholder='0'
                        autoFocus
                      />
                      <Input.InlineAffix>₹</Input.InlineAffix>
                    </Input.Wrapper>
                  </Input.Root>
                </div>
              );
            }
            return (
              <div
                className='paragraph-small text-text-sub-500'
                onClick={(e) => {
                  e.stopPropagation();
                  if (canEdit)
                    setEditingCell({ rowIndex: getRowIndex(row), columnId: 'gst_amount' });
                }}
              >
                {fmtAmt(value)}
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'discount_percentage',
          accessorFn: (row) =>
            formatBillingPercentFromAmount(row?.basic_amount, row?.discount_amount),
          columnLabel: 'Discount %',
          header: ({ column }) => (
            <Table.SortableHeader
              column={column}
              label='Discount %'
              className='w-[140px]'
              sortable
            />
          ),
          cell: ({ row }) => {
            const isEditing =
              canEdit &&
              editingCell?.rowIndex === getRowIndex(row) &&
              editingCell?.columnId === 'discount_percentage';
            const derived = formatBillingPercentFromAmount(
              row.original.basic_amount,
              row.original.discount_amount,
            );
            const raw = row.original.discount_percentage;
            // While editing, allow empty string so the user can clear the field.
            const value = isEditing
              ? raw !== undefined && raw !== null
                ? String(raw)
                : (derived ?? '')
              : derived;

            if (isEditing) {
              return (
                <div onClick={(e) => e.stopPropagation()} className='min-w-[120px]'>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        value={value}
                        onChange={(e) => {
                          const value_ = e.target.value;
                          if (isValidBillingDecimalInput(value_)) {
                            setLocalRowField(getRowIndex(row), 'discount_percentage', value_);
                          }
                        }}
                        onBlur={() => handleInputBlur(getRowKey(row), 'discount_percentage')}
                        placeholder='0'
                        autoFocus
                      />
                      <Input.InlineAffix>%</Input.InlineAffix>
                    </Input.Wrapper>
                  </Input.Root>
                </div>
              );
            }

            const display = formatBillingDecimal(value !== '' && value != null ? value : '0');
            return (
              <div
                className='paragraph-small text-text-sub-500 min-w-[120px]'
                onClick={(e) => {
                  e.stopPropagation();
                  if (canEdit) {
                    const idx = getRowIndex(row);
                    setLocalRowField(idx, 'discount_percentage', derived || '');
                    setEditingCell({ rowIndex: idx, columnId: 'discount_percentage' });
                  }
                }}
              >
                {display}%
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'discount_amount',
          accessorKey: 'discount_amount',
          columnLabel: 'Discount',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Discount' className='w-[120px]' sortable />
          ),
          cell: ({ row }) => {
            const isEditing =
              canEdit &&
              editingCell?.rowIndex === getRowIndex(row) &&
              editingCell?.columnId === 'discount_amount';
            const value = row.original.discount_amount ?? '';

            if (isEditing) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        value={value}
                        onChange={(e) => {
                          const value_ = e.target.value;
                          if (isValidBillingDecimalInput(value_)) {
                            setLocalRowField(getRowIndex(row), 'discount_amount', value_);
                          }
                        }}
                        onBlur={() => handleInputBlur(getRowKey(row), 'discount_amount')}
                        placeholder='0'
                        autoFocus
                      />
                      <Input.InlineAffix>₹</Input.InlineAffix>
                    </Input.Wrapper>
                  </Input.Root>
                </div>
              );
            }
            return (
              <div
                className='paragraph-small text-text-sub-500'
                onClick={(e) => {
                  e.stopPropagation();
                  if (canEdit)
                    setEditingCell({ rowIndex: getRowIndex(row), columnId: 'discount_amount' });
                }}
              >
                {fmtAmt(value)}
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'invoice_amount',
          accessorKey: 'invoice_amount',
          columnLabel: 'Invoice Amount',
          header: ({ column }) => (
            <Table.SortableHeader
              column={column}
              label='Invoice Amount'
              className='w-[120px]'
              sortable
            />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500'>
              {fmtAmt(row.original.invoice_amount)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'tds_percentage',
          accessorKey: 'tds_percentage',
          columnLabel: 'TDS %',
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='TDS %' className='w-[100px]' sortable />
          ),
          cell: ({ row }) => {
            const isEditing =
              canEdit &&
              editingCell?.rowIndex === getRowIndex(row) &&
              editingCell?.columnId === 'tds_percentage';
            const raw = row.original.tds_percentage;
            const value = raw !== '' && raw !== undefined && raw !== null ? String(raw) : '';

            if (isEditing) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        value={value}
                        onChange={(e) => {
                          const value_ = e.target.value;
                          if (isValidBillingDecimalInput(value_)) {
                            setLocalRowField(getRowIndex(row), 'tds_percentage', value_);
                          }
                        }}
                        onBlur={() => handleInputBlur(getRowKey(row), 'tds_percentage')}
                        placeholder='0'
                        autoFocus
                      />
                      <Input.InlineAffix>%</Input.InlineAffix>
                    </Input.Wrapper>
                  </Input.Root>
                </div>
              );
            }

            const display = formatBillingDecimal(value !== '' ? value : '0');
            return (
              <div
                className='paragraph-small text-text-sub-500'
                onClick={(e) => {
                  e.stopPropagation();
                  if (canEdit) {
                    setEditingCell({ rowIndex: getRowIndex(row), columnId: 'tds_percentage' });
                  }
                }}
              >
                {display}%
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'tds_amount',
          accessorKey: 'tds_amount',
          columnLabel: 'TDS Amount',
          header: ({ column }) => (
            <Table.SortableHeader
              column={column}
              label='TDS Amount'
              className='w-[120px]'
              sortable
            />
          ),
          cell: ({ row }) => {
            const isEditing =
              canEdit &&
              editingCell?.rowIndex === getRowIndex(row) &&
              editingCell?.columnId === 'tds_amount';
            const value = row.original.tds_amount || '';

            if (isEditing) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        value={value}
                        onChange={(e) => {
                          const value_ = e.target.value;
                          if (isValidBillingDecimalInput(value_)) {
                            setLocalRowField(getRowIndex(row), 'tds_amount', value_);
                          }
                        }}
                        onBlur={() => handleInputBlur(getRowKey(row), 'tds_amount')}
                        placeholder='0'
                        autoFocus
                      />
                      <Input.InlineAffix>₹</Input.InlineAffix>
                    </Input.Wrapper>
                  </Input.Root>
                </div>
              );
            }

            return (
              <div
                className='paragraph-small text-text-sub-500'
                onClick={(e) => {
                  e.stopPropagation();
                  if (canEdit)
                    setEditingCell({ rowIndex: getRowIndex(row), columnId: 'tds_amount' });
                }}
              >
                {fmtAmt(value)}
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'total_amount',
          accessorKey: 'total_amount',
          columnLabel: 'Total Amount',
          header: ({ column }) => (
            <Table.SortableHeader
              column={column}
              label='Total Amount'
              className='w-[120px]'
              sortable
            />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500'>
              {fmtAmt(row.original.total_amount)}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'collected_amount',
          accessorKey: 'collected_amount',
          columnLabel: 'Collected Amount',
          header: ({ column }) => (
            <Table.SortableHeader
              column={column}
              label='Collected Amount'
              className='w-[120px]'
              sortable
            />
          ),
          cell: ({ row }) => {
            const isEditing =
              canEdit &&
              editingCell?.rowIndex === getRowIndex(row) &&
              editingCell?.columnId === 'collected_amount';
            const value = row.original.collected_amount || '';

            if (isEditing) {
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Input.Root size='xsmall'>
                    <Input.Wrapper>
                      <Input.Input
                        type='text'
                        value={value}
                        onChange={(e) => {
                          const value_ = e.target.value;
                          if (isValidBillingDecimalInput(value_)) {
                            setLocalRowField(getRowIndex(row), 'collected_amount', value_);
                          }
                        }}
                        onBlur={() => handleInputBlur(getRowKey(row), 'collected_amount')}
                        placeholder='0'
                        autoFocus
                      />
                      <Input.InlineAffix>₹</Input.InlineAffix>
                    </Input.Wrapper>
                  </Input.Root>
                </div>
              );
            }
            return (
              <div
                className='paragraph-small text-text-sub-500'
                onClick={(e) => {
                  e.stopPropagation();
                  if (canEdit)
                    setEditingCell({ rowIndex: getRowIndex(row), columnId: 'collected_amount' });
                }}
              >
                {fmtAmt(value)}
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'outstanding_amount',
          accessorFn: (row) =>
            (Number.parseFloat(row?.total_amount) || 0) -
            (Number.parseFloat(row?.collected_amount) || 0),
          columnLabel: 'Outstanding Amount',
          header: ({ column }) => (
            <Table.SortableHeader
              column={column}
              label='Outstanding Amount'
              className='w-[140px]'
              sortable
            />
          ),
          cell: ({ row }) => (
            <span className='paragraph-small text-text-sub-500'>
              {fmtAmt(row.getValue('outstanding_amount'))}
            </span>
          ),
          enableSorting: true,
        },
        {
          id: 'payment_status',
          accessorKey: 'payment_status',
          columnLabel: 'Payment Status',
          header: ({ column }) =>
            renderBillingStatusHeader(column, 'Payment Status', 'payment_status', 'w-[140px]'),
          cell: ({ row }) => {
            const options = getBillingStatusOptions('payment_status');
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <BillingStatusDropdown
                  value={row.original.payment_status}
                  onValueChange={(value) => updateRowField(row.index, 'payment_status', value)}
                  statusOptions={options}
                  disabled={!canEdit}
                  showArrow={canEdit}
                />
              </div>
            );
          },
          enableSorting: true,
        },
        {
          id: 'invoice_upload',
          accessorKey: 'invoice_upload',
          columnLabel: 'Invoice PDF',
          enableHiding: false,
          header: ({ column }) => (
            <Table.SortableHeader
              column={column}
              label='Invoice PDF'
              className='w-[200px]'
              sortable={false}
            />
          ),
          cell: ({ row }) => {
            const original = row.original || {};
            const allowed = canEdit && isRowInvoiceUploadAllowed(original);
            const fileUrl = rows?.[getRowIndex(row)]?.invoice_upload;
            const hasFile = Boolean(fileUrl);

            return (
              <div className='flex items-center gap-2' onClick={(e) => e.stopPropagation()}>
                {hasFile ? (
                  <LinkButton.Root
                    type='button'
                    variant='primary'
                    onClick={() =>
                      handleInvoicePreviewClick(
                        fileUrl,
                        rows?.[getRowIndex(row)]?.invoice_name || 'Invoice PDF uploaded',
                      )
                    }
                  >
                    {rows?.[getRowIndex(row)]?.invoice_name || 'Invoice PDF uploaded'}
                  </LinkButton.Root>
                ) : (
                  !allowed && <span className='text-paragraph-xs text-text-sub-500'>-</span>
                )}

                {allowed && (
                  <Button.Root
                    type='button'
                    variant='neutral'
                    mode='stroke'
                    size='xsmall'
                    className='gap-1'
                    onClick={() => handleInvoiceUploadClick(getRowIndex(row))}
                    loading={
                      invoiceUploadMeta.is_loading &&
                      invoiceUploadMeta.rowIndex === getRowIndex(row)
                    }
                    disabled={
                      invoiceUploadMeta.is_loading &&
                      invoiceUploadMeta.rowIndex === getRowIndex(row)
                    }
                  >
                    <Button.Icon as={RiUploadLine} className='p-0.5' />
                    <span>{hasFile ? 'Replace' : 'Upload'}</span>
                  </Button.Root>
                )}
              </div>
            );
          },
          enableSorting: false,
        },
        {
          id: 'latest_comment',
          accessorKey: 'latest_comment',
          columnLabel: 'Latest Comment',
          header: () => (
            <span className='paragraph-small text-text-sub-500 whitespace-nowrap'>
              Latest Comment
            </span>
          ),
          cell: ({ row }) => {
            const full = stripHtmlToText(row.original.latest_comment);
            if (!full) {
              return <span className='paragraph-small text-text-sub-500'>--</span>;
            }
            const display = truncateLatestComment(full);
            const isTruncated = full.length > LATEST_COMMENT_MAX_LENGTH;
            return (
              <Tooltip.Root size='xsmall'>
                <Tooltip.Trigger asChild>
                  <span className='paragraph-small text-text-sub-500 block min-w-0 max-w-[120px] cursor-default truncate whitespace-nowrap'>
                    {display}
                  </span>
                </Tooltip.Trigger>
                {isTruncated ? (
                  <Tooltip.Content side='bottom' className='max-w-md break-words'>
                    {full}
                  </Tooltip.Content>
                ) : null}
              </Tooltip.Root>
            );
          },
          enableSorting: false,
        },
        {
          id: 'committed_date',
          accessorKey: 'committed_date',
          columnLabel: 'Committed Date',
          enableHiding: false,
          header: ({ column }) => (
            <Table.SortableHeader column={column} label='Committed Date' sortable />
          ),
          cell: ({ row }) => {
            const value = row.original.committed_date || '';
            const dateObject = value
              ? (() => {
                  try {
                    const d = parse(value, 'yyyy-MM-dd', new Date());
                    return Number.isNaN(d.getTime()) ? null : d;
                  } catch {
                    return null;
                  }
                })()
              : null;
            if (!canEdit) {
              return (
                <span className='paragraph-small text-text-sub-500 whitespace-nowrap'>
                  {dateObject ? format(dateObject, 'LLL dd, y') : '--'}
                </span>
              );
            }
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <Datepicker
                  value={dateObject ?? undefined}
                  onChange={(date) =>
                    updateRowField(
                      getRowIndex(row),
                      'committed_date',
                      date ? format(date, 'yyyy-MM-dd') : '',
                    )
                  }
                  placeholder='-'
                  size='xsmall'
                  variant='borderless'
                  formatDate={(d) => format(d, 'LLL dd, y')}
                  className='p-0'
                />
              </div>
            );
          },
          enableSorting: true,
        },
      ],
      [
        setLocalRowField,
        updateRowField,
        handleInputBlur,
        editingCell,
        canEdit,
        onRowSelect,
        handleInvoiceUploadClick,
        handleInvoicePreviewClick,
        invoiceUploadMeta.is_loading,
        invoiceUploadMeta.rowIndex,
        isRowInvoiceUploadAllowed,
        getBillingStatusOptions,
        renderBillingStatusHeader,
        rows,
      ],
    );

    const defaultColumnConfig = useMemo(() => {
      const config = prepareColumnsForConfig(BILLING_COLUMN_CONFIG_DEFS);
      if (defaultVisibleColumns?.length > 0) {
        return config.map((col) => ({
          ...col,
          visible: defaultVisibleColumns.includes(col.id),
        }));
      }
      return config;
    }, [defaultVisibleColumns]);

    const handlePersistBillingColumnConfig = useCallback(
      async (data) => {
        const result = await dispatch(
          saveBillingListPref({ react_table_id: tableId, columns: data }),
        ).unwrap();
        BILLING_COLUMN_PREF_CACHE.set(tableId, result || { columns: data });
        return result;
      },
      [dispatch, tableId],
    );

    const handleFetchBillingColumnConfig = useCallback(async () => {
      if (!tableId) return null;

      const cached = BILLING_COLUMN_PREF_CACHE.get(tableId);
      if (cached) {
        return cached;
      }

      const promise = dispatch(fetchBillingListPref({ react_table_id: tableId }))
        .unwrap()
        .then((res) => {
          BILLING_COLUMN_PREF_CACHE.set(tableId, res);
          return res;
        })
        .catch((error) => {
          BILLING_COLUMN_PREF_CACHE.delete(tableId);
          throw error;
        });

      BILLING_COLUMN_PREF_CACHE.set(tableId, promise);
      return promise;
    }, [dispatch, tableId]);

    const columnConfigHook = useColumnConfig(
      tableId,
      defaultColumnConfig,
      handlePersistBillingColumnConfig,
      handleFetchBillingColumnConfig,
      { autoSave: true, debounce: 500 },
    );
    syncColumnConfigHookToPopover(columnConfigHook);

    const { columns: columnConfig, visibleColumns: visibleColumnConfig } = columnConfigHook;

    // When sentinel mounts after localRows is populated (sync from props is async), the hook's
    // effect must re-run to observe it. Pass a callback that depends on localRows.length so
    // the effect re-runs when we transition from empty to having rows (billing uses local state for rows).
    const groupedKeysSignature = useMemo(
      () => (isGrouped && groupKeys?.length ? groupKeys.join('\u001D') : ''),
      [isGrouped, groupKeys],
    );

    React.useEffect(() => {
      if (!isGrouped) return;
      setVisibleGroupCount(BILLING_GROUP_BY_PAGE_SIZE);
    }, [isGrouped, groupedKeysSignature, groupKeys]);

    const pagedGroupKeys = useMemo(() => {
      if (!isGrouped || !groupKeys?.length) return [];
      return groupKeys.slice(0, visibleGroupCount);
    }, [isGrouped, groupKeys, visibleGroupCount]);

    const onLoadMoreForPagination = useCallback(() => {
      if (isGrouped && visibleGroupCount < groupKeys.length) {
        setVisibleGroupCount((n) => Math.min(n + BILLING_GROUP_BY_PAGE_SIZE, groupKeys.length));
        return;
      }
      onLoadMore?.();
    }, [onLoadMore, isGrouped, visibleGroupCount, groupKeys.length]);

    const paginationHasMore = isGrouped
      ? visibleGroupCount < groupKeys.length
      : hasMore && enableScrollPagination;

    const handleTableScroll = useCallback(() => {
      if (
        !enableScrollPagination ||
        !paginationHasMore ||
        isLoadingMore ||
        isLoading ||
        !scrollContainerEl
      ) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = scrollContainerEl;
      if (scrollTop + clientHeight >= scrollHeight - SCROLL_LOAD_THRESHOLD) {
        onLoadMoreForPagination();
      }
    }, [
      enableScrollPagination,
      paginationHasMore,
      isLoadingMore,
      isLoading,
      scrollContainerEl,
      onLoadMoreForPagination,
    ]);

    useEffect(() => {
      if (!enableScrollPagination || !scrollContainerEl) return undefined;

      const onScroll = () => handleTableScroll();
      scrollContainerEl.addEventListener('scroll', onScroll, { passive: true });
      return () => scrollContainerEl.removeEventListener('scroll', onScroll);
    }, [enableScrollPagination, scrollContainerEl, handleTableScroll]);

    useEffect(() => {
      if (isLoadingMore || isLoading || !paginationHasMore) return undefined;

      const timer = setTimeout(handleTableScroll, 100);
      return () => clearTimeout(timer);
    }, [
      isLoadingMore,
      isLoading,
      paginationHasMore,
      localRows.length,
      visibleGroupCount,
      handleTableScroll,
    ]);

    const columns = useMemo(
      () => applyColumnConfig(allColumnDefs, columnConfig),
      [allColumnDefs, columnConfig],
    );

    const table = useReactTable({
      data: localRows,
      columns,
      state: {
        sorting: localSorting,
        columnPinning: {
          left: ['name'],
        },
      },
      onSortingChange: handleSortingChange,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      manualSorting: true,
      enableSortingRemoval: true,
    });

    React.useImperativeHandle(ref, () => ({
      columnConfigHook,
    }));

    if (error) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
          <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
            <RiErrorWarningLine className='size-6 text-error-base' />
          </div>
          <h3 className='mb-2 text-lg font-semibold text-error-darker'>Unable to Load Billing</h3>
          <p className='mb-4 text-sm text-error-darker/80'>
            {typeof error === 'string'
              ? error
              : extractErrorMessage(error, 'Unable to load billing')}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className='rounded-lg bg-error-base px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error-darker'
            >
              Try Again
            </button>
          )}
        </div>
      );
    }

    if (!isLoading && localRows.length === 0 && (!isGrouped || !groupKeys?.length)) {
      return (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
          <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>
            No billing records found
          </h3>
          <p className='max-w-md text-sm text-text-sub-600'>
            Adjust your filters or try again later to see billing records.
          </p>
        </div>
      );
    }

    if (isGrouped && pagedGroupKeys.length > 0) {
      return (
        <>
          {activeStatusField ? (
            <SetStatusesModal
              open={Boolean(activeStatusField)}
              onOpenChange={(open) => {
                if (!open) setActiveStatusField(null);
              }}
              doctype={BILLING_DOCTYPE}
              field={activeStatusField}
              fieldLabel={BILLING_STATUS_FIELD_CONFIG[activeStatusField]?.label}
              showImport={false}
              onSaved={() => setStatusOptionsRefreshKey((value) => value + 1)}
            />
          ) : null}
          <div className='w-full' ref={billingTableRootRef}>
            <input
              type='file'
              ref={invoiceFileInputRef}
              onChange={handleInvoiceFileChange}
              className='hidden'
              accept='application/pdf,.pdf'
            />
            <div className='w-full rounded-2xl bg-bg-white-0 shadow-regular-xs'>
              <BillingGroupedView
                sortedKeys={pagedGroupKeys}
                groupsMap={groupsMap}
                columns={columns}
                variant={variant}
                onRowSelect={onRowSelect}
                sorting={localSorting}
                onSortingChange={handleSortingChange}
              />
              {enableScrollPagination && visibleGroupCount < groupKeys.length && isLoadingMore && (
                <div className='flex items-center justify-center gap-2 px-4 py-4'>
                  <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                  <span className='paragraph-small text-text-sub-600'>Loading more groups...</span>
                </div>
              )}
            </div>
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
          </div>
        </>
      );
    }

    const renderSkeleton = () => (
      <Table.Body>
        {Array.from({ length: 6 }).map((_, index, array) => (
          <React.Fragment key={`skeleton-${index}`}>
            <Table.Row>
              {columns.map((col) => (
                <Table.Cell key={col.id}>
                  <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                </Table.Cell>
              ))}
            </Table.Row>
            {index < array.length - 1 && <Table.RowDivider />}
          </React.Fragment>
        ))}
      </Table.Body>
    );

    return (
      <>
        {activeStatusField ? (
          <SetStatusesModal
            open={Boolean(activeStatusField)}
            onOpenChange={(open) => {
              if (!open) setActiveStatusField(null);
            }}
            doctype={BILLING_DOCTYPE}
            field={activeStatusField}
            fieldLabel={BILLING_STATUS_FIELD_CONFIG[activeStatusField]?.label}
            showImport={false}
            onSaved={() => setStatusOptionsRefreshKey((value) => value + 1)}
          />
        ) : null}
        <input
          type='file'
          ref={invoiceFileInputRef}
          onChange={handleInvoiceFileChange}
          className='hidden'
          accept='application/pdf,.pdf'
        />

        <div className='flex min-h-0 w-full flex-1 flex-col' ref={billingTableRootRef}>
          <Table.Root
            variant={variant}
            tableInstance={table}
            className='min-h-0 flex-1 overflow-auto'
          >
            <Table.Header className='sticky top-0 z-30 bg-bg-weak-50'>
              {table.getHeaderGroups().map((headerGroup) => (
                <Table.Row key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <Table.Head key={header.id} column={header.column}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </Table.Head>
                  ))}
                </Table.Row>
              ))}
            </Table.Header>

            {isLoading && localRows.length === 0 ? (
              renderSkeleton()
            ) : (
              <Table.Body>
                {table.getRowModel().rows.map((row, i, rows) => (
                  <React.Fragment key={row.id}>
                    <Table.Row
                      data-state={row.getIsSelected() && 'selected'}
                      className='cursor-pointer'
                      onClick={() => onRowSelect?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <Table.Cell
                          key={cell.id}
                          column={cell.column}
                          onClick={(e) => {
                            if (cell.column.id === 'actions') {
                              e.stopPropagation();
                            }
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Table.Cell>
                      ))}
                    </Table.Row>

                    {i < rows.length - 1 && <Table.RowDivider />}
                  </React.Fragment>
                ))}
                {/* Scroll pagination sentinel and loading indicator */}
                {enableScrollPagination && isLoadingMore && (
                  <Table.Row key='loading-more'>
                    <Table.Cell colSpan={columns.length} className='py-8 text-center'>
                      <div className='flex items-center justify-center gap-2'>
                        <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
                        <span className='paragraph-small text-text-sub-600'>Loading more...</span>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            )}
          </Table.Root>

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
        </div>
      </>
    );
  },
);

BillingTable.displayName = 'BillingTable';

export default BillingTable;
