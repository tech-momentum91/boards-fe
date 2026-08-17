import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiArrowLeftDownLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiFileTextLine,
  RiInformationLine,
  RiListCheck2,
  RiStickyNoteLine,
} from 'react-icons/ri';

import {
  STOCKS_STOCK_IN_SOURCE,
  STOCKS_STOCK_IN_SOURCE_TYPE_FORM_OPTIONS,
  createDefaultStockInFormState,
  createEmptyStockInLineItem,
} from '@/components/stocks/constants';
import {
  STOCK_IN_LINE_GRID,
  STOCK_IN_TRANSFER_LINE_GRID,
  cloneStockInFormState,
  stockInDigitsFromAmount,
  stockInFormatRupeeFromNumber,
} from '@/components/stocks/stock-in/helpers/shared';
import { useStockInFormCascade } from '@/components/stocks/stock-in/hooks/use-stock-in-form-cascade';
import StocksFormSearchableSelect, {
  renderStocksRichOptionLabel,
  renderStocksRichTrigger,
} from '@/components/stocks/shared/stocks-form-searchable-select';
import StocksSearchableCategorySelect from '@/components/stocks/shared/stocks-searchable-category-select';
import {
  InlineFieldInput,
  selectOptionsIncludingValue,
  valueInSelectOptions,
} from '@/components/stocks/stocks-helper';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Modal from '@/components/ui/modal';
import * as Textarea from '@/components/ui/textarea';
import StocksImageUploadSection from '@/components/stocks/shared/stocks-image-upload-section';
import {
  buildStockInPendingTransferOption,
  stockInSourceIsPurchaseOrder,
  stockInSourceIsTransfer,
} from '@/components/stocks/stocks-api-helpers';
import {
  clearStockInCreateState,
  fetchStockCategories,
  fetchStockInOptions,
  fetchVendorRcCenters,
  selectStockCategoriesState,
  selectStockInLineItemsState,
  selectStockInOptionsState,
  selectStockInSaveState,
  selectVendorRcCentersState,
} from '@/redux/stocksSlice';
import { showErrorToast } from '@/utils/error-utils';

const FieldLabel = ({ children, required }) => (
  <span className='flex items-center gap-px text-label-sm font-medium text-text-main-900'>
    {children}
    {required ? <span className='text-text-soft-400'>*</span> : null}
  </span>
);

const CreateStockInModal = ({
  open,
  onOpenChange,
  initialDraft,
  onSubmit,
  onSaveDraft,
  headerTitle = 'Add New In Entry',
  headerDescription = 'Enter below details to create new in entry.',
}) => {
  const dispatch = useDispatch();
  const centersState = useSelector(selectVendorRcCentersState);
  const stockCategoriesState = useSelector(selectStockCategoriesState);
  const optionsState = useSelector(selectStockInOptionsState);
  const lineItemsState = useSelector(selectStockInLineItemsState);
  const saveState = useSelector(selectStockInSaveState);
  const {
    loadOptionsForCenter,
    loadManualLineItems,
    loadPoLineItems,
    loadDraftCascade,
    loadTransferLineItems,
    resolveTransferCenterSelection,
  } = useStockInFormCascade();

  const [form, setForm] = useState(() => createDefaultStockInFormState());
  const isPurchaseOrderSource = stockInSourceIsPurchaseOrder(form.sourceType);
  const isTransferSource = stockInSourceIsTransfer(form.sourceType);

  const centerOptions = useMemo(
    () => (Array.isArray(centersState.items) ? centersState.items : []),
    [centersState.items],
  );
  const vendorOptions = useMemo(
    () => (Array.isArray(optionsState.suppliers) ? optionsState.suppliers : []),
    [optionsState.suppliers],
  );
  const categoryOptions = useMemo(
    () => (Array.isArray(stockCategoriesState.items) ? stockCategoriesState.items : []),
    [stockCategoriesState.items],
  );
  const vendorOptionsEffective = useMemo(
    () => selectOptionsIncludingValue(form.vendor, vendorOptions),
    [form.vendor, vendorOptions],
  );
  const categoryOptionsEffective = useMemo(
    () => selectOptionsIncludingValue(form.category, categoryOptions),
    [form.category, categoryOptions],
  );
  const purchaseOrderOptions = useMemo(
    () => (Array.isArray(optionsState.purchaseOrders) ? optionsState.purchaseOrders : []),
    [optionsState.purchaseOrders],
  );
  const pendingTransferOptionsEffective = useMemo(() => {
    const base = Array.isArray(optionsState.pendingTransfers) ? optionsState.pendingTransfers : [];
    const value = String(form.outgoingStockEntry ?? '').trim();
    if (!value || base.some((option) => option.value === value)) return base;
    const seeded =
      form.pendingTransferOption ??
      buildStockInPendingTransferOption({
        id: value,
        sourceCenterName: form.sourceCenterLabel || form.sourceCenter,
        sourceCenter: form.sourceCenter,
      });
    return seeded ? [seeded, ...base] : base;
  }, [
    optionsState.pendingTransfers,
    form.outgoingStockEntry,
    form.pendingTransferOption,
    form.sourceCenterLabel,
    form.sourceCenter,
  ]);
  const pendingTransferSelectValue = useMemo(
    () => valueInSelectOptions(form.outgoingStockEntry, pendingTransferOptionsEffective),
    [form.outgoingStockEntry, pendingTransferOptionsEffective],
  );

  const centerSelectValue = useMemo(
    () => valueInSelectOptions(form.center, centerOptions),
    [form.center, centerOptions],
  );
  const vendorSelectValue = useMemo(
    () => valueInSelectOptions(form.vendor, vendorOptionsEffective),
    [form.vendor, vendorOptionsEffective],
  );
  const categorySelectValue = useMemo(
    () => valueInSelectOptions(form.category, categoryOptionsEffective),
    [form.category, categoryOptionsEffective],
  );

  const selectedPoMeta = useMemo(
    () => purchaseOrderOptions.find((option) => option.value === form.poReference),
    [purchaseOrderOptions, form.poReference],
  );
  const vendorDisplayLabel = useMemo(() => {
    if (!form.vendor) return '';
    const match = vendorOptionsEffective.find((option) => option.value === form.vendor);
    return match?.label ?? selectedPoMeta?.supplierName ?? form.vendor;
  }, [form.vendor, vendorOptionsEffective, selectedPoMeta]);
  const categoryDisplayLabel = useMemo(() => {
    if (!form.category) return '';
    const match = categoryOptionsEffective.find((option) => option.value === form.category);
    return match?.label ?? selectedPoMeta?.category ?? form.category;
  }, [form.category, categoryOptionsEffective, selectedPoMeta]);
  const poSelectValue = useMemo(
    () => valueInSelectOptions(form.poReference, purchaseOrderOptions),
    [form.poReference, purchaseOrderOptions],
  );
  const poReferenceDisplayLabel = useMemo(() => {
    if (!form.poReference) return '';
    if (selectedPoMeta?.triggerLabel) return selectedPoMeta.triggerLabel;
    if (selectedPoMeta?.label) return selectedPoMeta.label;
    return form.poReference;
  }, [form.poReference, selectedPoMeta]);

  const vendorRcOptions = useMemo(
    () => (Array.isArray(lineItemsState.vendorRcOptions) ? lineItemsState.vendorRcOptions : []),
    [lineItemsState.vendorRcOptions],
  );
  const vendorRcSelectValue = useMemo(
    () => valueInSelectOptions(form.vendorRc, vendorRcOptions),
    [form.vendorRc, vendorRcOptions],
  );
  const showVendorRcSelect =
    !isPurchaseOrderSource && Boolean(form.category) && vendorRcOptions.length > 1;
  const needsVendorRcSelection =
    !isPurchaseOrderSource &&
    lineItemsState.requiresVendorRc &&
    vendorRcOptions.length > 1 &&
    !String(form.vendorRc ?? '').trim();

  const noVendorsForCenter = useMemo(
    () =>
      Boolean(
        form.center &&
        !isPurchaseOrderSource &&
        !isTransferSource &&
        !optionsState.isLoading &&
        optionsState.status === 'succeeded' &&
        vendorOptions.length === 0,
      ),
    [
      form.center,
      isPurchaseOrderSource,
      isTransferSource,
      optionsState.isLoading,
      optionsState.status,
      vendorOptions.length,
    ],
  );

  const lineItemsReady = isTransferSource
    ? Boolean(form.center && form.outgoingStockEntry && form.lineItems.length > 0)
    : isPurchaseOrderSource
      ? Boolean(form.center && form.poReference && form.lineItems.length > 0)
      : Boolean(form.center && form.vendor && form.category && !needsVendorRcSelection);

  const lineItemsLoading = lineItemsState.isLoading;
  const manualLinesFromApi = !isPurchaseOrderSource && form.lineItems.some((row) => row.itemCode);
  const isEditingDraft = Boolean(initialDraft?.name?.trim());

  useEffect(() => {
    if (!open) return;
    if (centersState.status === 'idle') {
      dispatch(fetchVendorRcCenters());
    }
    if (stockCategoriesState.status === 'idle') {
      dispatch(fetchStockCategories());
    }
  }, [open, dispatch, centersState.status, stockCategoriesState.status]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const init = async () => {
      if (initialDraft) {
        const draft = cloneStockInFormState(initialDraft);
        try {
          const nextForm = await loadDraftCascade(draft);
          if (!cancelled) setForm(nextForm);
        } catch {
          if (!cancelled) setForm(draft);
        }
        return;
      }
      setForm(cloneStockInFormState(null));
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [open, initialDraft, loadDraftCascade]);

  useEffect(() => {
    if (open) return;
    dispatch(clearStockInCreateState());
    setForm(createDefaultStockInFormState());
  }, [open, dispatch]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSourceTypeChange = useCallback(
    async (value) => {
      const center = form.center;
      setForm((previous) => ({
        ...previous,
        sourceType: value,
        vendor: '',
        category: '',
        poReference: '',
        vendorRc: '',
        outgoingStockEntry: '',
        sourceCenter: '',
        sourceCenterLabel: '',
        pendingTransferOption: null,
        lineItems: [],
      }));

      if (!center) return;

      if (stockInSourceIsTransfer(value)) {
        const resolved = await resolveTransferCenterSelection(center, value, {
          ...form,
          center,
          sourceType: value,
        });
        if (resolved) setForm((previous) => ({ ...previous, ...resolved }));
        return;
      }

      await loadOptionsForCenter(center, value);
    },
    [form, resolveTransferCenterSelection, loadOptionsForCenter],
  );

  const handlePendingTransferChange = useCallback(
    async (outgoingStockEntry) => {
      const meta = pendingTransferOptionsEffective.find(
        (option) => option.value === outgoingStockEntry,
      );
      if (!form.center || !outgoingStockEntry) {
        setForm((previous) => ({
          ...previous,
          outgoingStockEntry,
          sourceCenter: meta?.sourceCenter ?? '',
          sourceCenterLabel: meta?.sourceCenterName ?? meta?.primaryLabel ?? '',
          lineItems: [],
        }));
        return;
      }
      const payload = await loadTransferLineItems(form.center, outgoingStockEntry);
      setForm((previous) => ({
        ...previous,
        outgoingStockEntry,
        sourceCenter: payload?.sourceCenter ?? meta?.sourceCenter ?? previous.sourceCenter,
        sourceCenterLabel:
          payload?.sourceCenterName ??
          meta?.sourceCenterName ??
          meta?.primaryLabel ??
          previous.sourceCenterLabel,
        lineItems: payload?.items ?? [],
      }));
    },
    [form.center, pendingTransferOptionsEffective, loadTransferLineItems],
  );

  const handleVendorChange = useCallback(
    (value) => {
      setForm((previous) => {
        const next = { ...previous, vendor: value, category: '', vendorRc: '', lineItems: [] };
        if (previous.center && value && !stockInSourceIsPurchaseOrder(previous.sourceType)) {
          loadOptionsForCenter(previous.center, previous.sourceType, value);
        }
        return next;
      });
    },
    [loadOptionsForCenter],
  );

  const handleCategoryChange = useCallback(
    async (value) => {
      setForm((previous) => ({ ...previous, category: value, vendorRc: '', lineItems: [] }));
      if (!form.center || !form.vendor || !value) return;

      const payload = await loadManualLineItems(form.center, form.vendor, value);
      if (!payload) {
        setForm((previous) => ({
          ...previous,
          category: '',
          vendorRc: '',
          lineItems: [],
        }));
        return;
      }

      if (payload.requiresVendorRc && payload.vendorRcOptions.length > 0 && !payload.vendorRc) {
        if (payload.vendorRcOptions.length === 1) {
          const onlyRc = payload.vendorRcOptions[0].value;
          const withRc = await loadManualLineItems(form.center, form.vendor, value, onlyRc);
          if (!withRc) {
            setForm((previous) => ({
              ...previous,
              category: '',
              vendorRc: '',
              lineItems: [],
            }));
            return;
          }
          setForm((previous) => ({
            ...previous,
            category: value,
            vendorRc: onlyRc,
            lineItems: withRc.items ?? [],
          }));
          return;
        }
        setForm((previous) => ({
          ...previous,
          category: value,
          vendorRc: '',
          lineItems: [],
        }));
        return;
      }

      setForm((previous) => ({
        ...previous,
        category: value,
        vendorRc: payload.vendorRc ?? '',
        lineItems: payload.items ?? [],
      }));
    },
    [form.center, form.vendor, loadManualLineItems],
  );

  const handleVendorRcChange = useCallback(
    async (rcId) => {
      setForm((previous) => ({ ...previous, vendorRc: rcId, lineItems: [] }));
      if (!form.center || !form.vendor || !form.category) return;

      const payload = await loadManualLineItems(form.center, form.vendor, form.category, rcId);
      if (!payload) {
        setForm((previous) => ({
          ...previous,
          vendorRc: '',
          lineItems: [],
        }));
        return;
      }
      setForm((previous) => ({
        ...previous,
        vendorRc: rcId,
        lineItems: payload.items ?? [],
      }));
    },
    [form.center, form.vendor, form.category, loadManualLineItems],
  );

  const applyPurchaseOrder = useCallback(
    async (orderId) => {
      const meta = purchaseOrderOptions.find((option) => option.value === orderId);
      const supplier = meta?.supplier ?? '';
      const category = meta?.category ?? '';

      setForm((previous) => ({
        ...previous,
        poReference: orderId,
        vendor: supplier || previous.vendor,
        category: category || previous.category,
        lineItems: [],
      }));

      if (orderId && form.center && supplier) {
        try {
          await dispatch(
            fetchStockInOptions({
              center: form.center,
              supplier,
              sourceType: STOCKS_STOCK_IN_SOURCE.PURCHASE_ORDER,
            }),
          ).unwrap();
        } catch (error) {
          showErrorToast(error, {
            defaultMessage: 'Failed to refresh options for this purchase order.',
          });
        }
      }

      if (orderId) {
        const items = await loadPoLineItems(orderId);
        setForm((previous) => ({ ...previous, lineItems: items }));
      }
    },
    [purchaseOrderOptions, loadPoLineItems, form.center, dispatch],
  );

  const updateLine = useCallback((lineId, patch) => {
    setForm((previous) => ({
      ...previous,
      lineItems: previous.lineItems.map((row) => {
        if (row.id !== lineId) return row;
        const merged = { ...row, ...patch };
        const acceptedN = Number.parseFloat(String(merged.accepted ?? '').replaceAll(',', ''));
        const rateAmount = stockInDigitsFromAmount(merged.rate);
        if (!Number.isNaN(acceptedN) && acceptedN > 0 && rateAmount > 0) {
          merged.total = stockInFormatRupeeFromNumber(Math.round(acceptedN * rateAmount));
        } else if (patch.accepted !== undefined || patch.rate !== undefined) {
          merged.total = '';
        }
        return merged;
      }),
    }));
  }, []);

  const removeLine = useCallback((lineId) => {
    setForm((previous) => {
      const target = previous.lineItems.find((row) => row.id === lineId);
      if (target?.fromPurchaseOrder) return previous;
      const next = previous.lineItems.filter((row) => row.id !== lineId);
      return { ...previous, lineItems: next };
    });
  }, []);

  const summary = useMemo(() => {
    const filled = (form.lineItems ?? []).filter((row) => String(row.product ?? '').trim());
    let accepted = 0;
    let total = 0;
    for (const row of filled) {
      const a = Number.parseFloat(String(row.accepted ?? '').replaceAll(',', ''));
      if (!Number.isNaN(a)) accepted += a;
      total += stockInDigitsFromAmount(row.total);
    }
    return {
      productCount: filled.length,
      acceptedLabel:
        accepted > 0 ? String(Number.isInteger(accepted) ? accepted : accepted.toFixed(2)) : '0',
      totalLabel: total > 0 ? stockInFormatRupeeFromNumber(total) : '₹0',
    };
  }, [form.lineItems]);

  const hasStockInLineItems = useMemo(
    () => form.lineItems.some((row) => String(row.itemCode ?? '').trim()),
    [form.lineItems],
  );

  const canSaveDraft = useMemo(() => {
    if (!form.center || !hasStockInLineItems) return false;
    if (isTransferSource) return Boolean(form.outgoingStockEntry);
    if (isPurchaseOrderSource) return Boolean(form.poReference);
    return Boolean(form.vendor && form.category);
  }, [form, isTransferSource, isPurchaseOrderSource, hasStockInLineItems]);

  const canSubmit = useMemo(() => {
    if (!canSaveDraft) return false;
    return form.lineItems.some((row) => {
      if (!String(row.itemCode ?? '').trim()) return false;
      const accepted = Number.parseFloat(String(row.accepted ?? '').replaceAll(',', ''));
      const rejected = Number.parseFloat(String(row.rejected ?? '').replaceAll(',', ''));
      const hasQty =
        (!Number.isNaN(accepted) && accepted > 0) || (!Number.isNaN(rejected) && rejected > 0);
      if (!hasQty) return false;
      if (isTransferSource || isPurchaseOrderSource) return true;
      const rateDigits = String(row.rate ?? '').replaceAll(/\D/g, '');
      return rateDigits.length > 0;
    });
  }, [form, canSaveDraft, isTransferSource, isPurchaseOrderSource]);

  const handleSaveDraft = useCallback(async () => {
    if (!canSaveDraft || saveState.isLoading) return;
    try {
      await onSaveDraft?.({
        ...form,
        name: form.name || initialDraft?.name || '',
      });
      handleClose();
    } catch {
      /* parent shows toast */
    }
  }, [canSaveDraft, form, initialDraft?.name, onSaveDraft, saveState.isLoading, handleClose]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || saveState.isLoading) return;
    try {
      await onSubmit?.({
        ...form,
        name: form.name || initialDraft?.name || '',
      });
      handleClose();
    } catch {
      /* parent shows toast */
    }
  }, [canSubmit, form, initialDraft?.name, onSubmit, saveState.isLoading, handleClose]);

  const stockDisplay = (value) => (value != null && String(value).trim() ? String(value) : '—');
  const transferQtyDisplay = (value) => {
    const text = value != null ? String(value).trim() : '';
    return text !== '' ? text : '0';
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content
        showClose={false}
        className='flex max-h-[min(90vh,calc(100vh-32px))] max-w-[min(1024px,calc(100vw-16px))] flex-col overflow-hidden p-0 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
      >
        <div className='sticky top-0 z-10 flex shrink-0 flex-col items-stretch border-b border-stroke-soft-200 bg-bg-white-0 px-8 py-5'>
          <div className='flex w-full items-start justify-between gap-4'>
            <div className='flex min-w-0 flex-1 items-start gap-4'>
              <div className='mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 text-text-sub-600'>
                <RiArrowLeftDownLine className='size-6' />
              </div>
              <div className='flex min-w-0 flex-col gap-1'>
                <Modal.Title className='text-[18px] font-medium leading-6 tracking-tight text-text-main-900'>
                  {headerTitle}
                </Modal.Title>
                <Modal.Description className='paragraph-small text-text-sub-600'>
                  {headerDescription}
                </Modal.Description>
              </div>
            </div>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='xsmall'
              onClick={handleClose}
              disabled={saveState.isLoading}
            >
              <Button.Icon as={RiCloseLine} />
            </Button.Root>
          </div>
        </div>

        <Modal.Body className='min-h-0 flex-1 space-y-5 overflow-y-auto px-8 py-6'>
          <section className='flex flex-col gap-3'>
            <div className='flex items-center gap-2 text-label-md font-medium text-text-sub-500'>
              <RiInformationLine className='size-5 shrink-0 text-text-sub-600' />
              Basic Information
            </div>
            <div className='flex flex-col gap-4'>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div className='flex flex-col gap-1'>
                  <FieldLabel required>Center</FieldLabel>
                  <StocksFormSearchableSelect
                    value={centerSelectValue}
                    onValueChange={async (value) => {
                      setForm((previous) => ({
                        ...previous,
                        center: value,
                        vendor: '',
                        category: '',
                        poReference: '',
                        outgoingStockEntry: '',
                        sourceCenter: '',
                        sourceCenterLabel: '',
                        pendingTransferOption: null,
                        lineItems: [],
                      }));
                      if (!value) return;
                      if (isTransferSource) {
                        const resolved = await resolveTransferCenterSelection(
                          value,
                          form.sourceType,
                          {
                            ...form,
                            center: value,
                          },
                        );
                        if (resolved) setForm((previous) => ({ ...previous, ...resolved }));
                        return;
                      }
                      await loadOptionsForCenter(value, form.sourceType);
                    }}
                    options={centerOptions}
                    placeholder='Select center'
                    disabled={centersState.isLoading}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <FieldLabel required>Source Type</FieldLabel>
                  <StocksFormSearchableSelect
                    value={form.sourceType}
                    onValueChange={handleSourceTypeChange}
                    options={STOCKS_STOCK_IN_SOURCE_TYPE_FORM_OPTIONS}
                  />
                </div>
              </div>

              {isTransferSource ? (
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div className='flex flex-col gap-1'>
                    <FieldLabel required>Pending transfer</FieldLabel>
                    <StocksFormSearchableSelect
                      value={pendingTransferSelectValue}
                      onValueChange={handlePendingTransferChange}
                      options={pendingTransferOptionsEffective}
                      placeholder='Select pending transfer'
                      emptyMessage='No pending transfers for this center'
                      disabled={!form.center || optionsState.isLoading}
                      renderOptionLabel={renderStocksRichOptionLabel}
                      renderTrigger={renderStocksRichTrigger}
                    />
                  </div>
                  {form.sourceCenterLabel ? (
                    <div className='flex flex-col gap-1'>
                      <FieldLabel>From center</FieldLabel>
                      <Input.Root size='medium' variant='default'>
                        <Input.Wrapper>
                          <Input.Input
                            type='text'
                            value={form.sourceCenterLabel}
                            readOnly
                            aria-readonly
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {!isTransferSource ? (
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  {isPurchaseOrderSource ? (
                    <div className='flex flex-col gap-1'>
                      <FieldLabel required>Purchase Order</FieldLabel>
                      <StocksFormSearchableSelect
                        value={poSelectValue}
                        onValueChange={applyPurchaseOrder}
                        options={purchaseOrderOptions}
                        placeholder='Select purchase order'
                        emptyMessage='No purchase orders available'
                        disabled={!form.center || optionsState.isLoading}
                        renderOptionLabel={renderStocksRichOptionLabel}
                        renderTrigger={renderStocksRichTrigger}
                      />
                    </div>
                  ) : null}

                  <div className='flex flex-col gap-1'>
                    <FieldLabel required>Vendor</FieldLabel>
                    {isPurchaseOrderSource && form.poReference ? (
                      <Input.Root size='medium' variant='default'>
                        <Input.Wrapper>
                          <Input.Input
                            type='text'
                            value={vendorDisplayLabel}
                            readOnly
                            aria-readonly
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    ) : (
                      <StocksFormSearchableSelect
                        value={vendorSelectValue}
                        onValueChange={handleVendorChange}
                        options={vendorOptionsEffective}
                        placeholder='Select vendor'
                        disabled={!form.center || optionsState.isLoading}
                      />
                    )}
                    {noVendorsForCenter ? (
                      <p className='text-label-xs text-text-soft-400'>
                        No vendors with an active rate contract for this center.
                      </p>
                    ) : null}
                  </div>

                  <div className='flex flex-col gap-1'>
                    <FieldLabel required={!isPurchaseOrderSource}>Category</FieldLabel>
                    {isPurchaseOrderSource && form.poReference ? (
                      <Input.Root size='medium' variant='default'>
                        <Input.Wrapper>
                          <Input.Input
                            type='text'
                            value={categoryDisplayLabel}
                            readOnly
                            aria-readonly
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    ) : (
                      <StocksSearchableCategorySelect
                        value={categorySelectValue}
                        onValueChange={handleCategoryChange}
                        options={categoryOptionsEffective}
                        size='medium'
                        variant='default'
                        disabled={!form.center || !form.vendor || optionsState.isLoading}
                        isLoading={stockCategoriesState.isLoading}
                        errorMessage={
                          stockCategoriesState.status === 'failed'
                            ? String(stockCategoriesState.error ?? '')
                            : ''
                        }
                      />
                    )}
                  </div>

                  {showVendorRcSelect ? (
                    <div className='flex w-full min-w-0 flex-col gap-1'>
                      <FieldLabel required>Vendor Rate Contract</FieldLabel>
                      <StocksFormSearchableSelect
                        value={vendorRcSelectValue}
                        onValueChange={handleVendorRcChange}
                        options={vendorRcOptions}
                        placeholder='Select vendor rate contract'
                        disabled={lineItemsState.isLoading}
                        renderOptionLabel={renderStocksRichOptionLabel}
                        renderTrigger={renderStocksRichTrigger}
                      />
                      <p className='text-label-xs text-text-sub-500'>
                        This vendor has multiple rate contracts, please select one.
                      </p>
                    </div>
                  ) : null}

                  <div className='flex flex-col gap-1'>
                    <FieldLabel>
                      {isPurchaseOrderSource ? 'Selected purchase order' : 'PO / Reference No.'}
                    </FieldLabel>
                    <Input.Root size='medium' variant='default'>
                      <Input.Wrapper>
                        <Input.Input
                          type='text'
                          value={isPurchaseOrderSource ? poReferenceDisplayLabel : form.poReference}
                          onChange={(event) =>
                            setForm((previous) => ({
                              ...previous,
                              poReference: event.target.value,
                            }))
                          }
                          placeholder={
                            isPurchaseOrderSource
                              ? 'Select a purchase order above'
                              : 'Enter PO / reference number'
                          }
                          autoComplete='off'
                          readOnly={isPurchaseOrderSource}
                          aria-readonly={isPurchaseOrderSource}
                        />
                      </Input.Wrapper>
                    </Input.Root>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className='flex flex-col gap-3'>
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-2 text-label-md font-medium text-text-sub-500'>
                <RiListCheck2 className='size-5 shrink-0 text-text-sub-600' />
                Product Line Items
              </div>
            </div>

            {!lineItemsReady ? (
              <div className='flex flex-col items-center justify-center gap-1 rounded-xl bg-bg-weak-100 py-10 text-center'>
                <p className='text-label-md font-medium text-text-sub-500'>No products yet.</p>
                <p className='text-label-xs font-medium text-text-soft-400'>
                  {isTransferSource
                    ? 'Select center and pending transfer to load line items.'
                    : isPurchaseOrderSource
                      ? 'Select center and purchase order to load line items.'
                      : needsVendorRcSelection
                        ? 'Select a vendor rate contract above to load line items.'
                        : 'Select center, vendor, and category to load line items.'}
                </p>
              </div>
            ) : lineItemsLoading ? (
              <div className='flex flex-col items-center justify-center gap-1 rounded-xl bg-bg-weak-100 py-10 text-center'>
                <p className='text-label-md font-medium text-text-sub-500'>Loading line items…</p>
              </div>
            ) : form.lineItems.length === 0 ? (
              <div className='flex flex-col items-center justify-center gap-1 rounded-xl bg-bg-weak-100 py-10 text-center'>
                <p className='text-label-md font-medium text-text-sub-500'>No line items found.</p>
              </div>
            ) : (
              <div className='flex flex-col gap-0 overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
                <div className='overflow-x-auto'>
                  <div className={isTransferSource ? 'min-w-[760px]' : 'min-w-[880px]'}>
                    {isTransferSource ? (
                      <>
                        <div
                          className={`${STOCK_IN_TRANSFER_LINE_GRID} bg-bg-weak-50 text-label-sm`}
                        >
                          <span className='text-text-sub-600'>Product</span>
                          <span className='text-text-sub-600'>Sent</span>
                          <span className='text-text-sub-600'>Received</span>
                          <span className='text-text-sub-600'>Pending</span>
                          <span className='text-text-sub-600'>Accepted</span>
                          <span className='text-text-sub-600'>Remarks</span>
                        </div>
                        {form.lineItems.map((row) => (
                          <div key={row.id} className={`${STOCK_IN_TRANSFER_LINE_GRID} px-1 py-1`}>
                            <span className='px-1 text-paragraph-sm text-text-main-900'>
                              {row.product}
                            </span>
                            <span className='px-1 text-paragraph-sm text-text-sub-500'>
                              {transferQtyDisplay(row.ordered)}
                            </span>
                            <span className='px-1 text-paragraph-sm text-text-sub-500'>
                              {transferQtyDisplay(row.received)}
                            </span>
                            <span className='px-1 text-paragraph-sm text-text-sub-500'>
                              {transferQtyDisplay(row.pendingQty)}
                            </span>
                            <InlineFieldInput
                              type='number'
                              min={0}
                              value={row.accepted}
                              onChange={(event) =>
                                updateLine(row.id, { accepted: event.target.value })
                              }
                              placeholder='0'
                            />
                            <InlineFieldInput
                              value={row.remarks}
                              onChange={(event) =>
                                updateLine(row.id, { remarks: event.target.value })
                              }
                              placeholder='—'
                            />
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        <div className={`${STOCK_IN_LINE_GRID} bg-bg-weak-50 text-label-sm`}>
                          <span className='text-text-sub-600'>Product</span>
                          <span className='text-text-sub-600'>Ordered</span>
                          <span className='text-text-sub-600'>Received</span>
                          <span className='text-text-sub-600'>Accepted</span>
                          <span className='text-text-sub-600'>Rejected</span>
                          <span className='text-text-sub-600'>Rate (₹)</span>
                          <span className='text-text-sub-600'>Total (₹)</span>
                          <span className='text-text-sub-600'>Remarks</span>
                          <span />
                        </div>
                        {form.lineItems.map((row) => (
                          <div key={row.id} className={`${STOCK_IN_LINE_GRID} px-1 py-1`}>
                            <span className='px-1 text-paragraph-sm text-text-main-900'>
                              {row.product}
                            </span>
                            {row.fromPurchaseOrder ? (
                              <span className='px-1 text-paragraph-sm text-text-sub-500'>
                                {stockDisplay(row.ordered)}
                              </span>
                            ) : (
                              <InlineFieldInput
                                type='number'
                                min={0}
                                value={row.ordered}
                                onChange={(event) =>
                                  updateLine(row.id, { ordered: event.target.value })
                                }
                                placeholder='0'
                              />
                            )}
                            <InlineFieldInput
                              type='number'
                              min={0}
                              value={row.received}
                              onChange={(event) =>
                                updateLine(row.id, { received: event.target.value })
                              }
                              placeholder='0'
                            />
                            <InlineFieldInput
                              type='number'
                              min={0}
                              value={row.accepted}
                              onChange={(event) =>
                                updateLine(row.id, { accepted: event.target.value })
                              }
                              placeholder='0'
                            />
                            <InlineFieldInput
                              type='number'
                              min={0}
                              value={row.rejected}
                              onChange={(event) =>
                                updateLine(row.id, { rejected: event.target.value })
                              }
                              placeholder='0'
                            />
                            <InlineFieldInput
                              value={row.rate}
                              onChange={(event) => updateLine(row.id, { rate: event.target.value })}
                              placeholder='₹0'
                              readOnly={row.fromPurchaseOrder || row.rateFromContract}
                            />
                            <span className='px-1 text-paragraph-sm text-text-sub-500'>
                              {row.total || '—'}
                            </span>
                            <InlineFieldInput
                              value={row.remarks}
                              onChange={(event) =>
                                updateLine(row.id, { remarks: event.target.value })
                              }
                              placeholder='—'
                            />
                            <div className='flex justify-center'>
                              {row.fromPurchaseOrder ? (
                                <span className='size-8' aria-hidden='true' />
                              ) : manualLinesFromApi ? (
                                <span className='size-8' aria-hidden='true' />
                              ) : (
                                <Button.Root
                                  type='button'
                                  variant='neutral'
                                  mode='ghost'
                                  size='xsmall'
                                  className='text-text-sub-600 hover:text-red-600'
                                  onClick={() => removeLine(row.id)}
                                  aria-label='Remove line'
                                >
                                  <Button.Icon as={RiDeleteBin6Line} />
                                </Button.Root>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
                <div className='flex border-t border-stroke-soft-200 bg-bg-weak-50'>
                  <div className='flex flex-1 flex-row items-center justify-center gap-1 border-r border-stroke-soft-200 py-2.5'>
                    <span className='text-label-xs font-medium text-text-sub-600'>Products</span>
                    <span className='text-label-md font-medium text-text-main-900'>
                      {summary.productCount}
                    </span>
                  </div>
                  <div
                    className={`flex flex-1 flex-row items-center justify-center gap-1 py-2.5 ${isTransferSource ? '' : 'border-r border-stroke-soft-200'}`}
                  >
                    <span className='text-label-xs font-medium text-text-sub-600'>
                      Accepted Qty
                    </span>
                    <span className='text-label-md font-medium text-text-main-900'>
                      {summary.acceptedLabel}
                    </span>
                  </div>
                  {!isTransferSource ? (
                    <div className='flex flex-1 flex-row items-center justify-center gap-1 py-2.5'>
                      <span className='text-label-xs font-medium text-text-sub-600'>
                        Total Value
                      </span>
                      <span className='text-label-md font-medium text-text-main-900'>
                        {summary.totalLabel}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </section>

          <StocksImageUploadSection
            title='Stock photos'
            existingImages={form.stockImages}
            pendingFiles={form.files}
            disabled={saveState.isLoading}
            onPendingFilesChange={(nextFiles) =>
              setForm((previous) => ({ ...previous, files: nextFiles }))
            }
          />

          {!isTransferSource ? (
            <StocksImageUploadSection
              title='Goods Receipt Note'
              icon={RiFileTextLine}
              multiple={false}
              description='One PDF or image file for the goods receipt note.'
              chooseLabel='Choose a file or drag & drop.'
              browseLabel='Browse file'
              pendingFileLabel='Document'
              accept='application/pdf,.pdf,image/*,.png,.jpg,.jpeg,.webp'
              existingImages={form.attachments}
              pendingFiles={form.documents}
              disabled={saveState.isLoading}
              onPendingFilesChange={(nextDocuments) =>
                setForm((previous) => ({ ...previous, documents: nextDocuments }))
              }
            />
          ) : null}

          <section className='flex flex-col gap-2'>
            <div className='flex items-center gap-2 text-label-sm font-medium text-text-sub-500'>
              <RiStickyNoteLine className='size-5 shrink-0 text-text-sub-600' />
              Notes
            </div>
            <Textarea.Root
              value={form.notes}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, notes: event.target.value }))
              }
              placeholder='Add notes'
              rows={3}
              containerClassName='min-h-[88px]'
            />
          </section>
        </Modal.Body>

        <Modal.Footer className='mt-auto shrink-0 flex-wrap items-center justify-between gap-3 border-t border-stroke-soft-200 bg-bg-white-0 px-8 py-5'>
          <button
            type='button'
            className='text-label-sm font-medium text-text-sub-500 underline decoration-solid underline-offset-2 transition-colors hover:text-text-main-900 disabled:cursor-not-allowed disabled:opacity-50'
            onClick={handleSaveDraft}
            disabled={!canSaveDraft || saveState.isLoading}
          >
            {saveState.isLoading ? 'Saving…' : 'Save as Draft'}
          </button>
          <div className='flex flex-wrap items-center justify-end gap-3'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              onClick={handleClose}
              disabled={saveState.isLoading}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              onClick={handleSubmit}
              disabled={!canSubmit || saveState.isLoading}
            >
              {saveState.isLoading ? 'Saving…' : isEditingDraft ? 'Save' : 'Save'}
            </Button.Root>
          </div>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default CreateStockInModal;
