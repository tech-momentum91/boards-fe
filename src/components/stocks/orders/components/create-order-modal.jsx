import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiCloseLine,
  RiDeleteBin6Line,
  RiInformationLine,
  RiListCheck2,
  RiShoppingCartLine,
  RiStickyNoteLine,
} from 'react-icons/ri';

import {
  STOCKS_ORDER_CREATE_LINE_ITEMS_GRID_TEMPLATE,
  computeOrderLineAmount,
  createDefaultOrderFormState,
  orderLineRates,
} from '@/components/stocks/constants';
import { buildOrderFormFromReorderPayload } from '@/components/stocks/current-stock/api/current-stock-api';
import StocksFormSearchableSelect, {
  renderStocksRichOptionLabel,
  renderStocksRichTrigger,
} from '@/components/stocks/shared/stocks-form-searchable-select';
import StocksSearchableCategorySelect from '@/components/stocks/shared/stocks-searchable-category-select';
import {
  formatVendorRcDateDisplay,
  getTodayIsoDate,
  InlineFieldInput,
  selectOptionsIncludingValue,
  valueInSelectOptions,
  vendorRcDateToIso,
  vendorRcIsoToDate,
} from '@/components/stocks/stocks-helper';
import * as Button from '@/components/ui/button';
import { Datepicker } from '@/components/ui/datepicker';
import * as Modal from '@/components/ui/modal';
import * as Textarea from '@/components/ui/textarea';
import {
  clearPurchaseOrderCreateState,
  fetchPoLineItems,
  fetchPurchaseOrderOptions,
  fetchStockCategories,
  fetchStockReorder,
  fetchVendorRcCenters,
  mergePoLineItemsWithDraft,
  selectPurchaseOrderLineItemsState,
  selectPurchaseOrderOptionsState,
  selectPurchaseOrderSaveState,
  selectStockCategoriesState,
  selectVendorRcCentersState,
} from '@/redux/stocksSlice';
import { showErrorToast } from '@/utils/error-utils';

const FieldLabel = ({ children, required }) => (
  <span className='flex items-center gap-px text-label-sm font-medium text-text-main-900'>
    {children}
    {required ? <span className='text-text-soft-400'>*</span> : null}
  </span>
);

function cloneFormState(source) {
  if (!source) return createDefaultOrderFormState();
  const orderDate = String(source.orderDate ?? '').trim();
  return {
    name: source.name ?? '',
    center: source.center ?? '',
    centerLabel: source.centerLabel ?? '',
    vendor: source.vendor ?? '',
    vendorLabel: source.vendorLabel ?? '',
    category: source.category ?? '',
    categoryLabel: source.categoryLabel ?? '',
    orderDate: orderDate || getTodayIsoDate(),
    expectedDelivery: source.expectedDelivery ?? '',
    notes: source.notes ?? '',
    vendorRc: source.vendorRc ?? '',
    warehouse: source.warehouse ?? '',
    lineItems: Array.isArray(source.lineItems) ? source.lineItems.map((row) => ({ ...row })) : [],
    lockedFromReorder: Boolean(source.lockedFromReorder),
    reorderItemCode: source.reorderItemCode ?? '',
  };
}

async function fetchReorderPayloadResolved(dispatch, params) {
  const basePayload = await dispatch(fetchStockReorder(params)).unwrap();
  const autoVendorRc =
    basePayload.requiresVendorRc &&
    !basePayload.vendorRc &&
    basePayload.vendorRcOptions.length === 1
      ? basePayload.vendorRcOptions[0].value
      : '';
  if (!autoVendorRc) return basePayload;
  return dispatch(fetchStockReorder({ ...params, vendorRc: autoVendorRc })).unwrap();
}

function optionsIncludingCurrentLabel(value, label, options) {
  const id = String(value ?? '').trim();
  const list = selectOptionsIncludingValue(id, options);
  if (!id || !label || list.some((option) => option.value === id && option.label === label)) {
    return list;
  }
  return list.map((option) => (option.value === id ? { ...option, label } : option));
}

const CreateOrderModal = ({
  open,
  onOpenChange,
  initialDraft,
  onSaveDraft,
  onSubmitOrder,
  headerTitle = 'Create Purchase Order',
  headerDescription = 'Enter below details to create new purchase order.',
}) => {
  const dispatch = useDispatch();
  const optionsState = useSelector(selectPurchaseOrderOptionsState);
  const centersState = useSelector(selectVendorRcCentersState);
  const lineItemsState = useSelector(selectPurchaseOrderLineItemsState);
  const saveState = useSelector(selectPurchaseOrderSaveState);
  const stockCategoriesState = useSelector(selectStockCategoriesState);

  const [form, setForm] = useState(() => createDefaultOrderFormState());
  const lockedFromReorder = Boolean(form.lockedFromReorder);

  const centerOptions = useMemo(
    () => optionsIncludingCurrentLabel(form.center, form.centerLabel, centersState.items),
    [form.center, form.centerLabel, centersState.items],
  );
  const vendorOptions = useMemo(
    () => optionsIncludingCurrentLabel(form.vendor, form.vendorLabel, optionsState.suppliers),
    [form.vendor, form.vendorLabel, optionsState.suppliers],
  );
  const categoryOptions = useMemo(
    () =>
      optionsIncludingCurrentLabel(form.category, form.categoryLabel, stockCategoriesState.items),
    [form.category, form.categoryLabel, stockCategoriesState.items],
  );

  const centerSelectValue = useMemo(
    () => valueInSelectOptions(form.center, centerOptions),
    [form.center, centerOptions],
  );
  const categorySelectValue = useMemo(
    () => valueInSelectOptions(form.category, categoryOptions),
    [form.category, categoryOptions],
  );

  const vendorRcOptions = useMemo(
    () => (Array.isArray(lineItemsState.vendorRcOptions) ? lineItemsState.vendorRcOptions : []),
    [lineItemsState.vendorRcOptions],
  );
  const reorderSupplierOptions = useMemo(
    () => (Array.isArray(lineItemsState.supplierOptions) ? lineItemsState.supplierOptions : []),
    [lineItemsState.supplierOptions],
  );
  const vendorRcSelectValue = useMemo(
    () => valueInSelectOptions(form.vendorRc, vendorRcOptions),
    [form.vendorRc, vendorRcOptions],
  );
  const selectedVendorRcMeta = useMemo(
    () => vendorRcOptions.find((option) => option.value === form.vendorRc),
    [vendorRcOptions, form.vendorRc],
  );
  const showReorderSupplierPicker =
    lockedFromReorder &&
    lineItemsState.requiresSupplier &&
    !String(form.vendor ?? '').trim() &&
    reorderSupplierOptions.length > 1;
  const showReorderVendorRcPicker =
    lockedFromReorder &&
    lineItemsState.requiresVendorRc &&
    !String(form.vendorRc ?? '').trim() &&
    vendorRcOptions.length > 1;
  const showVendorRcSelect =
    showReorderVendorRcPicker ||
    (!lockedFromReorder && Boolean(form.category) && vendorRcOptions.length > 1);
  const showReorderVendorRcReadOnly =
    lockedFromReorder && String(form.vendorRc ?? '').trim() && !showReorderVendorRcPicker;
  const needsSupplierSelection = Boolean(
    lockedFromReorder && lineItemsState.requiresSupplier && !String(form.vendor ?? '').trim(),
  );
  const needsVendorRcSelection = lockedFromReorder
    ? Boolean(
        lineItemsState.requiresVendorRc &&
        !String(form.vendorRc ?? '').trim() &&
        form.lineItems.length === 0,
      )
    : Boolean(
        lineItemsState.requiresVendorRc &&
        vendorRcOptions.length > 1 &&
        !String(form.vendorRc ?? '').trim(),
      );

  const vendorSelectValue = useMemo(
    () =>
      valueInSelectOptions(
        form.vendor,
        showReorderSupplierPicker ? reorderSupplierOptions : vendorOptions,
      ),
    [form.vendor, showReorderSupplierPicker, reorderSupplierOptions, vendorOptions],
  );

  const noVendorsForCenter = useMemo(
    () =>
      Boolean(
        form.center &&
        !optionsState.isLoading &&
        optionsState.status === 'succeeded' &&
        vendorOptions.length === 0,
      ),
    [form.center, optionsState.isLoading, optionsState.status, vendorOptions.length],
  );

  const lineItemsReady = lockedFromReorder
    ? Boolean(
        form.center &&
        form.reorderItemCode &&
        !needsSupplierSelection &&
        !needsVendorRcSelection &&
        form.lineItems.length > 0,
      )
    : Boolean(form.center && form.vendor && form.category) && !needsVendorRcSelection;
  const lineItemsLoading = lineItemsState.isLoading;

  //method to fetch the data based on the options selected for whole flow of line items fetching
  const sanitizeDraftAfterVendorFetch = useCallback((draft, suppliers) => {
    const list = Array.isArray(suppliers) ? suppliers : [];
    if (list.length === 0) {
      return {
        ...draft,
        vendor: '',
        category: '',
        vendorRc: '',
        warehouse: '',
        lineItems: [],
      };
    }
    const vendorValid = list.some((option) => option.value === draft.vendor);
    if (!vendorValid) {
      return {
        ...draft,
        vendor: '',
        category: '',
        vendorRc: '',
        warehouse: '',
        lineItems: [],
      };
    }
    return draft;
  }, []);

  const loadDraftCascade = useCallback(
    async (draft) => {
      let next = { ...draft };
      if (centersState.status === 'idle') {
        await dispatch(fetchVendorRcCenters()).unwrap();
      }
      if (draft.lockedFromReorder && draft.reorderItemCode) {
        try {
          let supplier = draft.vendor || undefined;
          let vendorRc = draft.vendorRc || undefined;

          while (true) {
            const payload = await dispatch(
              fetchStockReorder({
                center: draft.center,
                itemCode: draft.reorderItemCode,
                supplier,
                vendorRc,
              }),
            ).unwrap();

            if (payload.requiresSupplier && !supplier) {
              if (payload.supplierOptions.length === 1) {
                supplier = payload.supplierOptions[0].value;
                continue;
              }
              return buildOrderFormFromReorderPayload(draft, {
                ...payload,
                supplier: '',
                supplierLabel: '',
                vendorRc: '',
                items: [],
              });
            }

            if (payload.requiresVendorRc && !payload.vendorRc && !vendorRc) {
              if (payload.vendorRcOptions.length === 1) {
                vendorRc = payload.vendorRcOptions[0].value;
                supplier = payload.supplier || supplier;
                continue;
              }
              return buildOrderFormFromReorderPayload(draft, {
                ...payload,
                supplier: payload.supplier || supplier || '',
                vendorRc: '',
                items: [],
              });
            }

            return buildOrderFormFromReorderPayload(draft, payload);
          }
        } catch (error) {
          showErrorToast(error, { defaultMessage: 'Failed to load reorder details.' });
          throw error;
        }
      }
      if (draft.lockedFromReorder) {
        return next;
      }
      if (draft.center) {
        try {
          const centerOpts = await dispatch(
            fetchPurchaseOrderOptions({ center: draft.center }),
          ).unwrap();
          next = sanitizeDraftAfterVendorFetch(next, centerOpts.suppliers);
        } catch (error) {
          showErrorToast(error, {
            defaultMessage: 'Failed to load vendors for this center.',
          });
          next = sanitizeDraftAfterVendorFetch(next, []);
        }
      }
      if (next.center && next.vendor) {
        try {
          await dispatch(
            fetchPurchaseOrderOptions({ center: next.center, supplier: next.vendor }),
          ).unwrap();
        } catch (error) {
          showErrorToast(error, {
            defaultMessage: 'Failed to load categories for this vendor.',
          });
          next = { ...next, category: '', lineItems: [] };
        }
      }
      if (next.center && next.vendor && next.category) {
        try {
          const payload = await dispatch(
            fetchPoLineItems({
              center: next.center,
              supplier: next.vendor,
              category: next.category,
              vendorRc: next.vendorRc || undefined,
            }),
          ).unwrap();
          let resolvedVendorRc = payload.vendorRc ?? next.vendorRc;
          let resolvedItems = payload.items;
          let resolvedWarehouse = payload.warehouse ?? next.warehouse;

          if (payload.requiresVendorRc && payload.vendorRcOptions.length > 0 && !resolvedVendorRc) {
            if (payload.vendorRcOptions.length === 1) {
              resolvedVendorRc = payload.vendorRcOptions[0].value;
              const withRc = await dispatch(
                fetchPoLineItems({
                  center: next.center,
                  supplier: next.vendor,
                  category: next.category,
                  vendorRc: resolvedVendorRc,
                }),
              ).unwrap();
              resolvedItems = withRc.items;
              resolvedWarehouse = withRc.warehouse ?? resolvedWarehouse;
              resolvedVendorRc = withRc.vendorRc ?? resolvedVendorRc;
            } else {
              resolvedItems = [];
            }
          }

          return {
            ...next,
            vendorRc: resolvedVendorRc ?? '',
            warehouse: resolvedWarehouse ?? '',
            lineItems: mergePoLineItemsWithDraft(resolvedItems, next.lineItems),
          };
        } catch (error) {
          showErrorToast(error, { defaultMessage: 'Failed to load purchase order line items.' });
          return { ...next, lineItems: [] };
        }
      }
      return { ...next, lineItems: [] };
    },
    [dispatch, centersState.status, sanitizeDraftAfterVendorFetch],
  );

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
      const draft = cloneFormState(initialDraft);
      try {
        const nextForm = await loadDraftCascade(draft);
        if (!cancelled) setForm(nextForm);
      } catch {
        if (cancelled) return;
        // A reorder draft that fails to load (e.g. the item has no active rate
        // contract at this center, common for stock received via transfer) has
        // nothing to show, so close the modal instead of leaving an empty form.
        if (draft.lockedFromReorder) {
          onOpenChange?.(false);
        } else {
          setForm(draft);
        }
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [open, initialDraft, loadDraftCascade, onOpenChange]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) return;
    dispatch(clearPurchaseOrderCreateState());
    setForm(createDefaultOrderFormState());
  }, [open, dispatch]);

  useEffect(() => {
    if (!open || !form.center || optionsState.isLoading) return;
    if (optionsState.status !== 'succeeded') return;
    if (lockedFromReorder) return;
    if (vendorOptions.length > 0) return;
    if (!form.vendor && !form.category) return;
    setForm((previous) => ({
      ...previous,
      vendor: '',
      category: '',
      vendorRc: '',
      warehouse: '',
      lineItems: [],
    }));
  }, [
    open,
    form.center,
    form.vendor,
    form.category,
    optionsState.isLoading,
    optionsState.status,
    vendorOptions.length,
    lockedFromReorder,
  ]);

  const updateLine = useCallback((lineId, patch) => {
    setForm((previous) => ({
      ...previous,
      lineItems: previous.lineItems.map((row) => {
        if (row.id !== lineId) return row;
        const merged = { ...row, ...patch };
        if (patch.quantity !== undefined || patch.orderRate !== undefined) {
          const orderRate = patch.orderRate !== undefined ? patch.orderRate : merged.orderRate;
          const quantity = patch.quantity !== undefined ? patch.quantity : merged.quantity;
          merged.orderRate = orderRate;
          merged.unitPrice = orderRate;
          merged.amount = computeOrderLineAmount(quantity, orderRate);
        }
        return merged;
      }),
    }));
  }, []);

  const removeLine = useCallback((lineId) => {
    setForm((previous) => ({
      ...previous,
      lineItems: previous.lineItems.filter((row) => row.id !== lineId),
    }));
  }, []);

  const handleCenterChange = useCallback(
    async (value) => {
      setForm((previous) => ({
        ...previous,
        center: value,
        vendor: '',
        category: '',
        vendorRc: '',
        warehouse: '',
        lineItems: [],
      }));
      try {
        const result = await dispatch(fetchPurchaseOrderOptions({ center: value })).unwrap();
        if (!result.suppliers?.length) {
          setForm((previous) => ({
            ...previous,
            center: value,
            vendor: '',
            category: '',
            vendorRc: '',
            warehouse: '',
            lineItems: [],
          }));
        }
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Failed to load vendors for this center.',
        });
        setForm((previous) => ({
          ...previous,
          center: value,
          vendor: '',
          category: '',
          vendorRc: '',
          warehouse: '',
          lineItems: [],
        }));
      }
    },
    [dispatch],
  );

  const handleReorderSupplierChange = useCallback(
    async (supplierId) => {
      const selected = reorderSupplierOptions.find((option) => option.value === supplierId);
      setForm((previous) => ({
        ...previous,
        vendor: supplierId,
        vendorLabel: selected?.primaryLabel || selected?.label || supplierId,
        category: '',
        categoryLabel: '',
        vendorRc: '',
        warehouse: '',
        lineItems: [],
      }));

      try {
        const payload = await fetchReorderPayloadResolved(dispatch, {
          center: form.center,
          itemCode: form.reorderItemCode,
          supplier: supplierId,
        });
        setForm((previous) => buildOrderFormFromReorderPayload(previous, payload));
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to load reorder details.' });
        setForm((previous) => ({
          ...previous,
          vendor: '',
          vendorLabel: '',
          category: '',
          categoryLabel: '',
          vendorRc: '',
          warehouse: '',
          lineItems: [],
        }));
      }
    },
    [dispatch, form.center, form.reorderItemCode, reorderSupplierOptions],
  );

  const handleVendorChange = useCallback(
    async (value) => {
      setForm((previous) => ({
        ...previous,
        vendor: value,
        category: '',
        vendorRc: '',
        warehouse: '',
        lineItems: [],
      }));
      try {
        await dispatch(
          fetchPurchaseOrderOptions({ center: form.center, supplier: value }),
        ).unwrap();
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'Failed to load categories for this vendor.',
        });
      }
    },
    [dispatch, form.center],
  );

  const handleCategoryChange = useCallback(
    async (value) => {
      setForm((previous) => ({
        ...previous,
        category: value,
        vendorRc: '',
        warehouse: '',
        lineItems: [],
      }));
      try {
        const payload = await dispatch(
          fetchPoLineItems({
            center: form.center,
            supplier: form.vendor,
            category: value,
          }),
        ).unwrap();

        if (payload.requiresVendorRc && payload.vendorRcOptions.length > 0 && !payload.vendorRc) {
          if (payload.vendorRcOptions.length === 1) {
            const onlyRc = payload.vendorRcOptions[0].value;
            const withRc = await dispatch(
              fetchPoLineItems({
                center: form.center,
                supplier: form.vendor,
                category: value,
                vendorRc: onlyRc,
              }),
            ).unwrap();
            setForm((previous) => ({
              ...previous,
              category: value,
              vendorRc: onlyRc,
              warehouse: withRc.warehouse ?? '',
              lineItems: withRc.items ?? [],
            }));
            return;
          }
          setForm((previous) => ({
            ...previous,
            category: value,
            vendorRc: '',
            warehouse: '',
            lineItems: [],
          }));
          return;
        }

        setForm((previous) => ({
          ...previous,
          category: value,
          vendorRc: payload.vendorRc ?? '',
          warehouse: payload.warehouse ?? '',
          lineItems: payload.items ?? [],
        }));
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to load purchase order line items.' });
        setForm((previous) => ({
          ...previous,
          category: '',
          vendorRc: '',
          warehouse: '',
          lineItems: [],
        }));
      }
    },
    [dispatch, form.center, form.vendor],
  );

  const handleVendorRcChange = useCallback(
    async (rcId) => {
      setForm((previous) => ({
        ...previous,
        vendorRc: rcId,
        warehouse: '',
        lineItems: [],
      }));
      try {
        if (lockedFromReorder && form.reorderItemCode) {
          const payload = await dispatch(
            fetchStockReorder({
              center: form.center,
              itemCode: form.reorderItemCode,
              supplier: form.vendor,
              vendorRc: rcId,
            }),
          ).unwrap();
          setForm((previous) => buildOrderFormFromReorderPayload(previous, payload));
          return;
        }

        const payload = await dispatch(
          fetchPoLineItems({
            center: form.center,
            supplier: form.vendor,
            category: form.category,
            vendorRc: rcId,
          }),
        ).unwrap();
        setForm((previous) => ({
          ...previous,
          vendorRc: rcId,
          warehouse: payload.warehouse ?? '',
          lineItems: payload.items ?? [],
        }));
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: lockedFromReorder
            ? 'Failed to load reorder details.'
            : 'Failed to load purchase order line items.',
        });
        setForm((previous) => ({
          ...previous,
          vendorRc: '',
          warehouse: '',
          lineItems: [],
        }));
      }
    },
    [dispatch, form.center, form.vendor, form.category, form.reorderItemCode, lockedFromReorder],
  );

  const lineItemSummary = useMemo(() => {
    const lines = Array.isArray(form.lineItems) ? form.lineItems : [];
    const productCount = lines.filter((line) => String(line.product ?? '').trim()).length;

    let totalQty = 0;
    let orderValue = 0;
    for (const row of lines) {
      const qty = Number.parseFloat(String(row.quantity ?? '').replaceAll(',', ''));
      if (Number.isNaN(qty) || qty <= 0) continue;
      totalQty += qty;

      const amountLabel = row.amount || computeOrderLineAmount(row.quantity, row.orderRate);
      const amountDigits = String(amountLabel ?? '').replaceAll(/\D/g, '');
      if (amountDigits) {
        orderValue += Number.parseInt(amountDigits, 10);
      }
    }

    const totalQtyDisplay =
      totalQty > 0 ? (Number.isInteger(totalQty) ? String(totalQty) : totalQty.toFixed(2)) : '—';
    const orderValueLabel = orderValue > 0 ? `₹${orderValue.toLocaleString('en-IN')}` : '—';

    return { productCount, totalQtyDisplay, orderValueLabel };
  }, [form.lineItems]);

  const hasFilledLineQty = useMemo(
    () =>
      form.lineItems.some((row) => {
        const qty = Number.parseFloat(String(row.quantity ?? '').replaceAll(',', ''));
        return !Number.isNaN(qty) && qty > 0;
      }),
    [form.lineItems],
  );

  const canSaveDraft = useMemo(
    () =>
      Boolean(
        form.center &&
        form.vendor &&
        form.category &&
        !needsSupplierSelection &&
        !needsVendorRcSelection &&
        form.orderDate &&
        form.expectedDelivery &&
        hasFilledLineQty,
      ),
    [form, hasFilledLineQty, needsSupplierSelection, needsVendorRcSelection],
  );

  const canSubmit = canSaveDraft;

  const handleSaveDraft = useCallback(async () => {
    if (!canSaveDraft || saveState.isLoading) return;
    try {
      await onSaveDraft?.({ ...form });
    } catch {
      // Parent shows toast; avoid uncaught rejection in the modal.
    }
  }, [canSaveDraft, form, onSaveDraft, saveState.isLoading]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || saveState.isLoading) return;
    try {
      await onSubmitOrder?.({ ...form });
    } catch {
      // Parent shows toast; avoid uncaught rejection in the modal.
    }
  }, [canSubmit, form, onSubmitOrder, saveState.isLoading]);

  const stockDisplay = (value) => (value != null && String(value).trim() ? String(value) : '—');

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
                <RiShoppingCartLine className='size-6' />
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
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div className='flex flex-col gap-1'>
                <FieldLabel required>Center</FieldLabel>
                <StocksFormSearchableSelect
                  value={centerSelectValue}
                  onValueChange={handleCenterChange}
                  options={centerOptions}
                  disabled={lockedFromReorder || centersState.isLoading}
                />
              </div>
              <div className='flex flex-col gap-1'>
                <FieldLabel required>Vendor</FieldLabel>
                <StocksFormSearchableSelect
                  value={vendorSelectValue}
                  onValueChange={
                    showReorderSupplierPicker ? handleReorderSupplierChange : handleVendorChange
                  }
                  options={
                    showReorderSupplierPicker
                      ? reorderSupplierOptions
                      : vendorOptions.length === 0
                        ? []
                        : vendorOptions
                  }
                  placeholder={
                    showReorderSupplierPicker
                      ? 'Select vendor'
                      : !form.center
                        ? 'Select center first'
                        : optionsState.isLoading
                          ? 'Loading vendors…'
                          : noVendorsForCenter
                            ? 'No vendors available'
                            : 'Select'
                  }
                  emptyMessage='No vendors with an active rate contract'
                  disabled={
                    showReorderSupplierPicker
                      ? lineItemsState.isLoading
                      : lockedFromReorder ||
                        !form.center ||
                        optionsState.isLoading ||
                        noVendorsForCenter
                  }
                />
                {showReorderSupplierPicker ? (
                  <p className='text-label-xs text-text-sub-500'>
                    Multiple vendors supply this item. Select one to continue.
                  </p>
                ) : null}
                {!showReorderSupplierPicker && noVendorsForCenter ? (
                  <p className='text-label-xs text-text-sub-500'>
                    No vendor rate contract is linked to this center. Choose another center or add a
                    contract in Vendor RC.
                  </p>
                ) : null}
              </div>
              <div className='flex flex-col gap-1 md:col-span-1'>
                <FieldLabel required>Category</FieldLabel>
                <StocksSearchableCategorySelect
                  value={categorySelectValue}
                  onValueChange={handleCategoryChange}
                  options={categoryOptions}
                  placeholder={form.vendor ? 'Select category' : 'Select vendor first'}
                  size='medium'
                  variant='default'
                  disabled={lockedFromReorder || !form.vendor || optionsState.isLoading}
                  isLoading={stockCategoriesState.isLoading}
                  errorMessage={
                    stockCategoriesState.status === 'failed'
                      ? String(stockCategoriesState.error ?? '')
                      : ''
                  }
                />
              </div>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='flex flex-col gap-1'>
                  <FieldLabel required>PO Date</FieldLabel>
                  <Datepicker
                    value={vendorRcIsoToDate(form.orderDate)}
                    onChange={(date) =>
                      setForm((previous) => ({ ...previous, orderDate: vendorRcDateToIso(date) }))
                    }
                    placeholder='DD/MM/YY'
                    size='medium'
                    variant='default'
                    formatDate={(date) => formatVendorRcDateDisplay(vendorRcDateToIso(date))}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <FieldLabel required>Expected Delivery</FieldLabel>
                  <Datepicker
                    value={vendorRcIsoToDate(form.expectedDelivery)}
                    onChange={(date) =>
                      setForm((previous) => ({
                        ...previous,
                        expectedDelivery: vendorRcDateToIso(date),
                      }))
                    }
                    placeholder='DD/MM/YY'
                    size='medium'
                    variant='default'
                    min={vendorRcIsoToDate(form.orderDate)}
                    formatDate={(date) => formatVendorRcDateDisplay(vendorRcDateToIso(date))}
                  />
                </div>
              </div>
            </div>
            {showVendorRcSelect ? (
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
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
              </div>
            ) : null}
            {showReorderVendorRcReadOnly ? (
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div className='flex w-full min-w-0 flex-col gap-1'>
                  <FieldLabel>Vendor Rate Contract</FieldLabel>
                  <StocksFormSearchableSelect
                    value={vendorRcSelectValue}
                    options={vendorRcOptions}
                    placeholder='Vendor rate contract'
                    disabled
                    renderOptionLabel={renderStocksRichOptionLabel}
                    renderTrigger={({ selectedOption, placeholder }) =>
                      renderStocksRichTrigger({
                        selectedOption:
                          selectedOption ||
                          (form.vendorRc
                            ? {
                                triggerLabel:
                                  selectedVendorRcMeta?.summaryLabel ||
                                  selectedVendorRcMeta?.primaryLabel ||
                                  form.vendorRc,
                              }
                            : null),
                        placeholder,
                      })
                    }
                  />
                </div>
              </div>
            ) : null}
          </section>

          <section className='flex flex-col gap-3'>
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-2 text-label-md font-medium text-text-sub-500'>
                <RiListCheck2 className='size-5 shrink-0 text-text-sub-600' />
                Product Line Items
              </div>
            </div>
            {lineItemsReady ? (
              <div className='min-w-0 overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
                {lineItemsLoading ? (
                  <div className='px-4 py-10 text-center text-paragraph-sm text-text-sub-500'>
                    {lockedFromReorder ? 'Loading reorder details…' : 'Loading products…'}
                  </div>
                ) : needsSupplierSelection ? (
                  <div className='px-4 py-10 text-center text-paragraph-sm text-text-sub-500'>
                    Select a vendor above to load reorder details.
                  </div>
                ) : needsVendorRcSelection ? (
                  <div className='px-4 py-10 text-center text-paragraph-sm text-text-sub-500'>
                    Select a vendor rate contract above to load reorder quantity.
                  </div>
                ) : form.lineItems.length === 0 ? (
                  <div className='px-4 py-10 text-center text-paragraph-sm text-text-sub-500'>
                    No products found for this vendor rate contract.
                  </div>
                ) : (
                  <>
                    <div className='overflow-x-auto'>
                      <div className='min-w-[880px]'>
                        <div
                          className='grid border-b border-stroke-soft-200 bg-bg-weak-50 text-label-sm font-medium text-text-sub-600'
                          style={{
                            gridTemplateColumns: STOCKS_ORDER_CREATE_LINE_ITEMS_GRID_TEMPLATE,
                          }}
                        >
                          <div className='min-w-0 whitespace-nowrap px-3 py-2'>Product</div>
                          <div className='min-w-0 whitespace-nowrap px-3 py-2'>Cur. Stock</div>
                          <div className='min-w-0 whitespace-nowrap px-3 py-2'>Min</div>
                          <div className='min-w-0 whitespace-nowrap px-3 py-2'>Max</div>
                          <div className='min-w-0 whitespace-nowrap px-3 py-2'>Order Qty</div>
                          <div className='min-w-0 whitespace-nowrap px-3 py-2'>RC Rate (₹)</div>
                          <div className='min-w-0 whitespace-nowrap px-3 py-2'>Order Rate (₹)</div>
                          <div className='min-w-0 whitespace-nowrap px-3 py-2'>Remark</div>
                          <div className='px-1 py-2'>
                            <span className='sr-only'>Remove</span>
                          </div>
                        </div>
                        {form.lineItems.map((row) => {
                          const rates = orderLineRates(row);
                          return (
                            <div
                              key={row.id}
                              className='grid min-h-11 items-center border-b border-stroke-soft-200 last:border-b-0'
                              style={{
                                gridTemplateColumns: STOCKS_ORDER_CREATE_LINE_ITEMS_GRID_TEMPLATE,
                              }}
                            >
                              <div className='px-3 py-2.5 text-paragraph-sm text-text-main-900'>
                                {row.product || '—'}
                              </div>
                              <span className='px-3 py-2.5 text-paragraph-sm text-text-sub-500'>
                                {stockDisplay(row.currentStock)}
                              </span>
                              <span className='px-3 py-2.5 text-paragraph-sm text-text-sub-500'>
                                {stockDisplay(row.minStock)}
                              </span>
                              <span className='px-3 py-2.5 text-paragraph-sm text-text-sub-500'>
                                {stockDisplay(row.maxStock)}
                              </span>
                              <div className='min-w-0 px-2 py-1'>
                                <InlineFieldInput
                                  type='number'
                                  min={0}
                                  value={row.quantity}
                                  onChange={(event) =>
                                    updateLine(row.id, { quantity: event.target.value })
                                  }
                                  placeholder='0'
                                />
                              </div>
                              <span className='px-3 py-2.5 text-paragraph-sm text-text-sub-500'>
                                {rates.rcRate}
                              </span>
                              {lockedFromReorder ? (
                                <span className='px-3 py-2.5 text-paragraph-sm text-text-sub-500'>
                                  {rates.orderRate || rates.rcRate}
                                </span>
                              ) : (
                                <div className='min-w-0 px-2 py-1'>
                                  <InlineFieldInput
                                    value={row.orderRate}
                                    onChange={(event) =>
                                      updateLine(row.id, { orderRate: event.target.value })
                                    }
                                    placeholder='₹0'
                                  />
                                </div>
                              )}
                              <div className='min-w-0 px-2 py-1'>
                                <InlineFieldInput
                                  value={row.remark}
                                  onChange={(event) =>
                                    updateLine(row.id, { remark: event.target.value })
                                  }
                                  placeholder='—'
                                />
                              </div>
                              <div className='flex items-center justify-center px-1 py-1'>
                                <Button.Root
                                  type='button'
                                  variant='neutral'
                                  mode='ghost'
                                  size='xsmall'
                                  className='size-8 p-0 text-text-sub-600 hover:text-error-base'
                                  aria-label='Remove line item'
                                  onClick={() => removeLine(row.id)}
                                >
                                  <Button.Icon as={RiDeleteBin6Line} />
                                </Button.Root>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className='grid h-10 grid-cols-3 divide-x divide-stroke-soft-200 border-t border-stroke-soft-200 bg-bg-weak-50'>
                      <div className='flex items-center justify-center gap-2 px-2'>
                        <span className='text-label-xs font-medium uppercase tracking-wide text-text-sub-500'>
                          Products
                        </span>
                        <span className='text-[18px] font-medium leading-6 text-text-main-900'>
                          {lineItemSummary.productCount}
                        </span>
                      </div>
                      <div className='flex items-center justify-center gap-2 px-2'>
                        <span className='text-label-xs font-medium uppercase tracking-wide text-text-sub-500'>
                          Total Qty
                        </span>
                        <span className='text-[18px] font-medium leading-6 text-text-main-900'>
                          {lineItemSummary.totalQtyDisplay}
                        </span>
                      </div>
                      <div className='flex items-center justify-center gap-2 px-2'>
                        <span className='text-label-xs font-medium uppercase tracking-wide text-text-sub-500'>
                          Order Value
                        </span>
                        <span className='text-[18px] font-medium leading-6 text-text-main-900'>
                          {lineItemSummary.orderValueLabel}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center gap-1 rounded-xl bg-bg-weak-100 py-10 text-center'>
                <p className='text-label-md font-medium text-text-sub-500'>
                  {lockedFromReorder
                    ? lineItemsLoading
                      ? 'Loading reorder details…'
                      : needsSupplierSelection
                        ? 'Select a vendor above to continue.'
                        : needsVendorRcSelection
                          ? 'Select a vendor rate contract above to continue.'
                          : 'Unable to load reorder details.'
                    : 'No products yet.'}
                </p>
                {!lockedFromReorder ? (
                  <p className='text-label-xs font-medium text-text-soft-400'>
                    Choose a center, vendor, and category to load products from the vendor rate
                    contract.
                  </p>
                ) : null}
              </div>
            )}
          </section>

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
              {saveState.isLoading ? 'Submitting…' : 'Submit'}
            </Button.Root>
          </div>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default CreateOrderModal;
