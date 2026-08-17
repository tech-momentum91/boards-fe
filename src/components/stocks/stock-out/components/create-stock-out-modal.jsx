import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiArrowRightUpLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiInformationLine,
  RiListCheck2,
  RiStickyNoteLine,
} from 'react-icons/ri';

import {
  STOCKS_STOCK_OUT_STATUS,
  createDefaultStockOutFormState,
  createEmptyStockOutLineItem,
} from '@/components/stocks/constants';
import { STOCK_OUT_CREATE_ISSUE_MODE_OPTIONS } from '@/components/stocks/stock-out/constants';
import {
  formatStockOutCurrentStockLabel,
  formatStockOutRemainingBalance,
  stockOutIsTransferMode,
} from '@/components/stocks/stock-out/api';
import { useStockOutFormCascade } from '@/components/stocks/stock-out/hooks/use-stock-out-form-cascade';
import StocksImageUploadSection from '@/components/stocks/shared/stocks-image-upload-section';
import StocksFormSearchableSelect from '@/components/stocks/shared/stocks-form-searchable-select';
import StocksSearchableCategorySelect from '@/components/stocks/shared/stocks-searchable-category-select';
import {
  InlineFieldInput,
  InlineFieldSelect,
  selectOptionsIncludingValue,
} from '@/components/stocks/stocks-helper';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import * as Textarea from '@/components/ui/textarea';
import {
  clearStockOutCreateState,
  fetchStockCategories,
  fetchVendorRcCenters,
  selectStockCategoriesState,
  selectStockOutLineItemsState,
  selectStockOutOptionsState,
  selectStockOutSaveState,
  selectVendorRcCentersState,
} from '@/redux/stocksSlice';

const FieldLabel = ({ children, required }) => (
  <span className='flex items-center gap-px text-label-sm font-medium text-text-main-900'>
    {children}
    {required ? <span className='text-text-soft-400'>*</span> : null}
  </span>
);

const LINE_GRID =
  'pl-2 grid min-h-11 items-center gap-2 border-b border-stroke-soft-200 last:border-b-0 [grid-template-columns:minmax(180px,1.65fr)_minmax(88px,0.45fr)_minmax(96px,0.5fr)_minmax(120px,0.55fr)_minmax(120px,1fr)_40px]';

function cloneFormState(source) {
  if (!source) {
    const defaults = createDefaultStockOutFormState();
    return {
      ...defaults,
      name: '',
      issueMode: STOCK_OUT_CREATE_ISSUE_MODE_OPTIONS[0].value,
      lineItems: [],
    };
  }
  return {
    name: source.name ?? '',
    center: source.center ?? '',
    destinationCenter: source.destinationCenter ?? '',
    department: source.department ?? '',
    category: source.category ?? '',
    issuedBy: source.issuedBy ?? '',
    issueMode: source.issueMode ?? STOCK_OUT_CREATE_ISSUE_MODE_OPTIONS[0].value,
    entryDate: source.entryDate ?? '',
    notes: source.notes ?? '',
    status: source.status ?? STOCKS_STOCK_OUT_STATUS.DRAFT,
    lineItems:
      Array.isArray(source.lineItems) && source.lineItems.length > 0
        ? source.lineItems.map((row) => ({
            ...row,
            id: row.id || createEmptyStockOutLineItem().id,
          }))
        : [],
    stockImages: Array.isArray(source.stockImages) ? [...source.stockImages] : [],
    files: Array.isArray(source.files) ? [...source.files] : [],
  };
}

const CreateStockOutModal = ({
  open,
  onOpenChange,
  onSubmit,
  onSaveDraft,
  initialDraft = null,
  headerTitle = 'Add New Out Entry',
  headerDescription = 'Enter below details to create new out entry.',
}) => {
  // console.log('initialDraft', initialDraft);
  const dispatch = useDispatch();
  const options = useSelector(selectStockOutOptionsState);
  const lineItemsState = useSelector(selectStockOutLineItemsState);
  const saveState = useSelector(selectStockOutSaveState);
  const centersState = useSelector(selectVendorRcCentersState);
  const stockCategoriesState = useSelector(selectStockCategoriesState);
  const { loadOptionsForCenter, loadOptionsForDepartment, loadLineItems } =
    useStockOutFormCascade();

  const [form, setForm] = useState(() => cloneFormState(null));
  const isTransferMode = stockOutIsTransferMode(form.issueMode);

  useEffect(() => {
    if (!open) return;
    setForm(cloneFormState(initialDraft?.form ?? null));
    dispatch(clearStockOutCreateState());

    const draft = initialDraft?.form;
    if (!draft?.center) return;

    const draftIsTransfer = stockOutIsTransferMode(draft.issueMode);
    loadOptionsForCenter(draft.center, draft.issueMode).then(async () => {
      if (draftIsTransfer) {
        await loadLineItems(draft.center, '', draft.issueMode);
        return;
      }
      if (draft.department) {
        loadOptionsForDepartment(draft.center, draft.department);
      }
    });
  }, [open, initialDraft, dispatch, loadOptionsForCenter, loadOptionsForDepartment, loadLineItems]);

  useEffect(() => {
    if (!open) return;
    if (centersState.status === 'idle') {
      dispatch(fetchVendorRcCenters());
    }
    if (stockCategoriesState.status === 'idle') {
      dispatch(fetchStockCategories());
    }
  }, [open, dispatch, centersState.status, stockCategoriesState.status]);

  const centerOptions = useMemo(
    () => selectOptionsIncludingValue(form.center, centersState.items),
    [form.center, centersState.items],
  );
  const departmentOptions = options.departments;
  const destinationCenterOptions = useMemo(
    () => selectOptionsIncludingValue(form.destinationCenter, options.destinationCenters ?? []),
    [form.destinationCenter, options.destinationCenters],
  );
  const categoryOptions = useMemo(
    () => selectOptionsIncludingValue(form.category, stockCategoriesState.items),
    [form.category, stockCategoriesState.items],
  );
  const issuedByOptions = options.issuedBy;

  const catalogItems = useMemo(
    () => (Array.isArray(lineItemsState.items) ? lineItemsState.items : []),
    [lineItemsState.items],
  );
  const productOptions = useMemo(
    () =>
      catalogItems
        .filter((row) => String(row.itemCode ?? '').trim())
        .map((row) => ({
          value: row.itemCode,
          label: row.product || row.itemCode,
        })),
    [catalogItems],
  );

  const isEditingDraft = Boolean(initialDraft?.entryName || form.name);
  const transferDraftSubmitOnly = isEditingDraft && isTransferMode;

  const lineItemsReady = isTransferMode
    ? Boolean(
        form.center &&
        (catalogItems.length > 0 || transferDraftSubmitOnly || form.lineItems.length > 0),
      )
    : Boolean(form.center && form.department && form.category);
  const optionsLoading = options.isLoading;
  const lineItemsLoading = lineItemsState.isLoading;

  const summary = useMemo(() => {
    const lines = form.lineItems ?? [];
    const withProduct = lines.filter((row) => String(row.product ?? '').trim());
    let issued = 0;
    for (const row of withProduct) {
      const q = Number.parseFloat(String(row.issued ?? '').replaceAll(',', ''));
      if (!Number.isNaN(q)) issued += q;
    }
    return {
      productCount: withProduct.length,
      issuedLabel: issued > 0 ? String(Number.isInteger(issued) ? issued : issued.toFixed(2)) : '0',
    };
  }, [form.lineItems]);

  const canSaveDraft = useMemo(() => {
    const hasLines = form.lineItems.some(
      (row) => String(row.itemCode || row.product || '').trim() && String(row.issued || '').trim(),
    );
    if (isTransferMode) {
      return Boolean(form.center && form.destinationCenter && hasLines);
    }
    if (!form.center || !form.department || !form.category || !form.issuedBy) return false;
    return hasLines;
  }, [form, isTransferMode]);

  const canSubmit = useMemo(() => {
    if (transferDraftSubmitOnly) {
      return Boolean(String(form.name || initialDraft?.entryName || '').trim());
    }
    if (isTransferMode) {
      return Boolean(form.center && form.destinationCenter) && canSaveDraft;
    }
    if (isEditingDraft) {
      return Boolean(String(form.name || initialDraft?.entryName || '').trim());
    }
    return canSaveDraft;
  }, [
    transferDraftSubmitOnly,
    isTransferMode,
    isEditingDraft,
    form.name,
    form.center,
    form.destinationCenter,
    initialDraft?.entryName,
    canSaveDraft,
  ]);

  const updateLine = useCallback((lineId, patch) => {
    setForm((previous) => ({
      ...previous,
      lineItems: previous.lineItems.map((row) => (row.id === lineId ? { ...row, ...patch } : row)),
    }));
  }, []);

  const removeLine = useCallback((lineId) => {
    setForm((previous) => ({
      ...previous,
      lineItems: previous.lineItems.filter((row) => row.id !== lineId),
    }));
  }, []);

  const getProductOptionsForRow = useCallback(
    (line) => {
      const usedCodes = new Set(
        form.lineItems
          .filter((row) => row.id !== line.id && row.itemCode)
          .map((row) => row.itemCode),
      );
      return productOptions.filter(
        (option) => !usedCodes.has(option.value) || option.value === line.itemCode,
      );
    },
    [form.lineItems, productOptions],
  );

  const handleProductSelect = useCallback(
    (lineId, itemCode) => {
      const catalogItem = catalogItems.find((row) => row.itemCode === itemCode);
      if (!catalogItem) {
        updateLine(lineId, {
          itemCode: '',
          product: '',
          currentStock: null,
          issued: '',
          remarks: '',
        });
        return;
      }
      updateLine(lineId, {
        itemCode: catalogItem.itemCode,
        product: catalogItem.product,
        currentStock: catalogItem.currentStock,
        issued: '',
        remarks: '',
      });
    },
    [catalogItems, updateLine],
  );

  const handleAddLine = useCallback(() => {
    setForm((previous) => ({
      ...previous,
      lineItems: [...previous.lineItems, createEmptyStockOutLineItem()],
    }));
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleCenterChange = useCallback(
    async (value) => {
      setForm((previous) => ({
        ...previous,
        center: value,
        destinationCenter: '',
        department: '',
        category: '',
        issuedBy: '',
        lineItems: [],
      }));
      if (!value) return;
      await loadOptionsForCenter(value, form.issueMode);
      if (stockOutIsTransferMode(form.issueMode)) {
        await loadLineItems(value, '', form.issueMode);
      }
    },
    [loadOptionsForCenter, loadLineItems, form.issueMode],
  );

  const handleIssueModeChange = useCallback(
    async (value) => {
      const nextIsTransfer = stockOutIsTransferMode(value);
      setForm((previous) => ({
        ...previous,
        issueMode: value,
        destinationCenter: '',
        department: '',
        category: '',
        issuedBy: '',
        lineItems: [],
      }));
      if (!form.center) return;
      await loadOptionsForCenter(form.center, value);
      if (nextIsTransfer) {
        await loadLineItems(form.center, '', value);
      }
    },
    [form.center, loadOptionsForCenter, loadLineItems],
  );

  const handleDestinationCenterChange = useCallback((value) => {
    setForm((previous) => ({ ...previous, destinationCenter: value }));
  }, []);

  const handleDepartmentChange = useCallback(
    async (value) => {
      setForm((previous) => ({
        ...previous,
        department: value,
        category: '',
        issuedBy: '',
        lineItems: [],
      }));
      if (!form.center || !value) return;
      await loadOptionsForDepartment(form.center, value);
    },
    [form.center, loadOptionsForDepartment],
  );

  const handleCategoryChange = useCallback(
    async (value) => {
      setForm((previous) => ({
        ...previous,
        category: value,
        lineItems: [],
      }));
      if (!form.center || !value) return;
      const items = await loadLineItems(form.center, value);
      setForm((previous) => ({
        ...previous,
        category: value,
        lineItems: items.length > 0 ? items : [],
      }));
    },
    [form.center, loadLineItems],
  );

  const handleSaveDraft = useCallback(async () => {
    if (!canSaveDraft || saveState.isLoading) return;
    try {
      await onSaveDraft?.({
        ...form,
        name: form.name || initialDraft?.entryName || '',
      });
    } catch {
      /* parent shows toast */
    }
  }, [canSaveDraft, form, initialDraft?.entryName, onSaveDraft, saveState.isLoading]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || saveState.isLoading) return;
    try {
      await onSubmit?.({
        ...form,
        name: form.name || initialDraft?.entryName || '',
      });
    } catch {
      /* parent shows toast */
    }
  }, [canSubmit, form, initialDraft?.entryName, onSubmit, saveState.isLoading]);

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
                <RiArrowRightUpLine className='size-6' />
              </div>
              <div className='flex min-w-0 flex-col gap-1'>
                <Modal.Title className='text-label-lg font-medium text-text-main-900'>
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
              Basic information
            </div>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div className='flex flex-col gap-1'>
                <FieldLabel required>Center</FieldLabel>
                <StocksFormSearchableSelect
                  value={form.center}
                  onValueChange={handleCenterChange}
                  options={centerOptions}
                  placeholder={centersState.isLoading ? 'Loading…' : 'Select'}
                  disabled={centersState.isLoading && centerOptions.length === 0}
                />
              </div>
              <div className='flex flex-col gap-1 col-span-1'>
                <FieldLabel>Issue mode</FieldLabel>
                <StocksFormSearchableSelect
                  value={form.issueMode}
                  onValueChange={handleIssueModeChange}
                  options={STOCK_OUT_CREATE_ISSUE_MODE_OPTIONS}
                  disabled={transferDraftSubmitOnly}
                />
              </div>
              {isTransferMode ? (
                <div className='flex flex-col gap-1'>
                  <FieldLabel required>Destination center</FieldLabel>
                  <StocksFormSearchableSelect
                    value={form.destinationCenter}
                    onValueChange={handleDestinationCenterChange}
                    options={destinationCenterOptions}
                    placeholder='Select destination center'
                    disabled={!form.center || optionsLoading || transferDraftSubmitOnly}
                  />
                </div>
              ) : null}
              {!isTransferMode ? (
                <>
                  <div className='flex flex-col gap-1'>
                    <FieldLabel required>Department</FieldLabel>
                    <StocksFormSearchableSelect
                      value={form.department}
                      onValueChange={handleDepartmentChange}
                      options={departmentOptions}
                      disabled={!form.center || optionsLoading}
                    />
                  </div>
                  <div className='flex flex-col gap-1'>
                    <FieldLabel required>Issued by</FieldLabel>
                    <StocksFormSearchableSelect
                      value={form.issuedBy}
                      onValueChange={(value) =>
                        setForm((previous) => ({ ...previous, issuedBy: value }))
                      }
                      options={issuedByOptions}
                      disabled={!form.department || optionsLoading}
                    />
                  </div>
                  <div className='flex flex-col gap-1'>
                    <FieldLabel required>Category</FieldLabel>
                    <StocksSearchableCategorySelect
                      value={form.category}
                      onValueChange={handleCategoryChange}
                      options={categoryOptions}
                      size='medium'
                      variant='default'
                      disabled={!form.department || optionsLoading}
                      isLoading={stockCategoriesState.isLoading}
                      errorMessage={
                        stockCategoriesState.status === 'failed'
                          ? String(stockCategoriesState.error ?? '')
                          : ''
                      }
                    />
                  </div>
                </>
              ) : null}
            </div>
          </section>

          <section className='flex flex-col gap-3'>
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-2 text-label-md font-medium text-text-sub-500'>
                <RiListCheck2 className='size-5 shrink-0 text-text-sub-600' />
                Product line items
              </div>
              {lineItemsReady && !transferDraftSubmitOnly ? (
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='small'
                  onClick={handleAddLine}
                  disabled={
                    lineItemsLoading ||
                    productOptions.length === 0 ||
                    form.lineItems.length >= productOptions.length
                  }
                >
                  Add
                </Button.Root>
              ) : null}
            </div>

            {!lineItemsReady && !lineItemsLoading ? (
              <div className='flex flex-col items-center justify-center gap-1 rounded-xl bg-bg-weak-100 py-10 text-center'>
                <p className='text-label-md font-medium text-text-sub-500'>No products yet.</p>
                <p className='text-label-xs font-medium text-text-soft-400'>
                  {isTransferMode
                    ? 'Select center to load available products.'
                    : 'Select center, department, and category to load products.'}
                </p>
              </div>
            ) : lineItemsLoading && isTransferMode && form.center ? (
              <div className='flex flex-col items-center justify-center gap-1 rounded-xl bg-bg-weak-100 py-10 text-center'>
                <p className='text-label-md font-medium text-text-sub-500'>Loading products…</p>
              </div>
            ) : lineItemsLoading && !isTransferMode ? (
              <div className='flex flex-col items-center justify-center gap-1 rounded-xl bg-bg-weak-100 py-10 text-center'>
                <p className='text-label-md font-medium text-text-sub-500'>Loading line items…</p>
              </div>
            ) : form.lineItems.length === 0 &&
              !transferDraftSubmitOnly &&
              productOptions.length > 0 ? (
              <div className='flex flex-col items-center justify-center gap-1 rounded-xl bg-bg-weak-100 py-10 text-center'>
                <p className='text-label-md font-medium text-text-sub-500'>No products yet.</p>
                <p className='text-label-xs font-medium text-text-soft-400'>
                  Click Add to add products{isTransferMode ? ' for this transfer' : ''}.
                </p>
              </div>
            ) : form.lineItems.length === 0 ? (
              <div className='flex flex-col items-center justify-center gap-1 rounded-xl bg-bg-weak-100 py-10 text-center'>
                <p className='text-label-md font-medium text-text-sub-500'>
                  No products found for this center and category.
                </p>
              </div>
            ) : (
              <div className='flex flex-col overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
                {/* {lineItemsReady ? (
                <p className='border-b border-stroke-soft-200 bg-bg-weak-50 px-3 py-2 text-label-xs font-medium text-text-sub-600'>
                  Products for the selected center and category. Remove rows you do not want to
                  issue. Enter issued quantities and remarks as needed.
                </p>
              ) : null} */}
                <div className='overflow-x-auto'>
                  <div className='min-w-[760px]'>
                    <div className={`${LINE_GRID} bg-bg-weak-50 px-1 text-label-sm`}>
                      <span className='text-text-sub-600'>Product</span>
                      <span className='text-text-sub-600'>Cur. stock</span>
                      <span className='text-text-sub-600'>Issued qty</span>
                      <span className='text-text-sub-600'>Remaining balance</span>
                      <span className='text-text-sub-600'>Remarks</span>
                      <span className='sr-only'>Remove</span>
                    </div>
                    {lineItemsLoading && form.lineItems.length === 0 && !isTransferMode ? (
                      <div className='px-3 py-6 text-center text-label-sm text-text-sub-500'>
                        Loading line items…
                      </div>
                    ) : null}
                    {form.lineItems.map((line) => {
                      const curLabel = formatStockOutCurrentStockLabel(line.currentStock);
                      const remainingLabel = formatStockOutRemainingBalance(
                        line.currentStock,
                        line.issued,
                      );
                      const productOptionsForRow = getProductOptionsForRow(line);
                      const rowReady =
                        Boolean(line.itemCode || line.product) &&
                        (isTransferMode || lineItemsReady);
                      return (
                        <div key={line.id} className={`${LINE_GRID} px-1 py-1`}>
                          {!transferDraftSubmitOnly ? (
                            <div className='px-1 py-1'>
                              <InlineFieldSelect
                                value={line.itemCode || ''}
                                onValueChange={(value) => handleProductSelect(line.id, value)}
                                options={productOptionsForRow}
                                placeholder='Select product'
                                triggerClassName='text-text-main-900'
                              />
                            </div>
                          ) : (
                            <span
                              className='min-w-0 truncate px-1 text-label-sm font-medium text-text-main-900'
                              title={line.product}
                            >
                              {line.product || '—'}
                            </span>
                          )}
                          <span className='px-1 text-paragraph-sm text-text-sub-500'>
                            {curLabel}
                          </span>
                          <InlineFieldInput
                            type='number'
                            min={0}
                            value={line.issued}
                            onChange={(event) =>
                              updateLine(line.id, { issued: event.target.value })
                            }
                            placeholder='—'
                            readOnly={!rowReady || transferDraftSubmitOnly}
                          />
                          <span className='px-1 text-paragraph-sm text-text-sub-500'>
                            {remainingLabel}
                          </span>
                          <InlineFieldInput
                            value={line.remarks}
                            onChange={(event) =>
                              updateLine(line.id, { remarks: event.target.value })
                            }
                            placeholder='—'
                            readOnly={!rowReady || transferDraftSubmitOnly}
                          />
                          <div className='flex items-center justify-center'>
                            <Button.Root
                              type='button'
                              variant='neutral'
                              mode='ghost'
                              size='xsmall'
                              className='size-8 p-0 text-text-sub-600 hover:text-error-base'
                              aria-label='Remove line item'
                              onClick={() => removeLine(line.id)}
                              disabled={transferDraftSubmitOnly}
                            >
                              <Button.Icon as={RiDeleteBinLine} />
                            </Button.Root>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className='flex border-t border-stroke-soft-200 bg-bg-weak-50'>
                  <div className='flex flex-1 flex-row items-center justify-center gap-1 border-r border-stroke-soft-200 py-2.5'>
                    <span className='text-label-xs font-medium uppercase tracking-wide text-text-sub-600'>
                      Products
                    </span>
                    <span className='text-label-md font-medium text-text-main-900'>
                      {summary.productCount}
                    </span>
                  </div>
                  <div className='flex flex-1 flex-row items-center justify-center gap-1 py-2.5'>
                    <span className='text-label-xs font-medium uppercase tracking-wide text-text-sub-600'>
                      Issued qty
                    </span>
                    <span className='text-label-md font-medium text-text-main-900'>
                      {summary.issuedLabel}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>

          <StocksImageUploadSection
            existingImages={form.stockImages}
            pendingFiles={form.files}
            disabled={saveState.isLoading}
            onPendingFilesChange={(nextFiles) =>
              setForm((previous) => ({ ...previous, files: nextFiles }))
            }
          />

          <section className='flex flex-col gap-2'>
            <div className='flex items-center gap-2 text-label-sm font-medium text-text-sub-500'>
              <RiStickyNoteLine className='size-4 text-text-sub-600' />
              Notes
            </div>
            <Textarea.Root
              value={form.notes ?? ''}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, notes: event.target.value }))
              }
              placeholder='Add notes'
              rows={3}
              containerClassName='min-h-[88px]'
            />
          </section>
        </Modal.Body>

        <div className='flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-stroke-soft-200 bg-bg-white-0 px-8 py-4'>
          {!transferDraftSubmitOnly ? (
            <Button.Root
              type='button'
              variant='neutral'
              mode='ghost'
              size='small'
              className='px-0 text-label-sm font-medium text-text-sub-600 underline underline-offset-2 hover:bg-transparent hover:text-text-main-900'
              onClick={handleSaveDraft}
              disabled={!canSaveDraft || saveState.isLoading}
            >
              {saveState.isLoading ? 'Saving…' : 'Save as Draft'}
            </Button.Root>
          ) : (
            <span />
          )}
          <div className='flex flex-wrap items-center gap-2'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={handleClose}
              disabled={saveState.isLoading}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='small'
              disabled={!canSubmit || saveState.isLoading}
              onClick={handleSubmit}
            >
              {saveState.isLoading
                ? 'Saving…'
                : transferDraftSubmitOnly
                  ? 'Submit transfer'
                  : isTransferMode
                    ? 'Send transfer'
                    : 'Submit'}
            </Button.Root>
          </div>
        </div>
      </Modal.Content>
    </Modal.Root>
  );
};

export default CreateStockOutModal;
