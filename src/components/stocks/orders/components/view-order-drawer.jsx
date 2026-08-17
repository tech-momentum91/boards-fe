import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiAddLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarLine,
  RiCloseLine,
  RiHistoryLine,
  RiListCheck2,
  RiPriceTag3Line,
  RiStickyNoteLine,
  RiTeamLine,
} from 'react-icons/ri';

import {
  STOCKS_ORDER_DETAIL_LINE_ITEMS_GRID_TEMPLATE,
  STOCKS_ORDER_STATUS,
  computeOrderLineAmount,
  orderLineInventoryDisplay,
  orderLineRates,
} from '@/components/stocks/constants';
import {
  formatVendorRcDateDisplay,
  InlineFieldInput,
  vendorRcDateToIso,
  vendorRcIsoToDate,
} from '@/components/stocks/stocks-helper';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';
import { Datepicker } from '@/components/ui/datepicker';
import * as Drawer from '@/components/ui/drawer';
import FieldRow from '@/components/ui/field-row';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import * as Textarea from '@/components/ui/textarea';
import StocksActivityPanel from '@/components/stocks/shared/stocks-activity-panel';
import { showErrorToast } from '@/utils/error-utils';
import {
  buildPurchaseOrderUpdatePayload,
  clearPurchaseOrderDetail,
  clearStocksDocumentActivity,
  fetchPurchaseOrderDetail,
  fetchStocksDocumentActivity,
  mapOrderRowToEditForm,
  parsePoRateNumber,
  resolvePurchaseOrderCanUpdate,
  resolvePurchaseOrderHasStockIn,
  selectPurchaseOrderDetailState,
  selectStocksDocumentActivity,
} from '@/redux/stocksSlice';

const TAB_PRODUCTS = 'products';
const TAB_ACTIVITY = 'activity';

const statusBadgeColor = (status) => {
  if (status === STOCKS_ORDER_STATUS.DRAFT) return 'gray';
  if (status === STOCKS_ORDER_STATUS.ORDERED) return 'blue';
  if (status === STOCKS_ORDER_STATUS.PARTIAL) return 'orange';
  if (status === STOCKS_ORDER_STATUS.FULLY_RECEIVED) return 'green';
  if (status === STOCKS_ORDER_STATUS.CANCELLED) return 'red';
  return 'gray';
};

function splitCenterTitle(center) {
  const s = String(center ?? '').trim();
  const m = /^(.+?)\s*(\([^)]+\))\s*$/.exec(s);
  if (m) return { primary: m[1].trim(), secondary: m[2].trim() };
  return { primary: s || '—', secondary: null };
}

function parseRupeeNumber(value) {
  return parsePoRateNumber(value) ?? 0;
}

function formatOrderValueLabel(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return '—';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/** Server form + pending edits (same pattern as vendor RC drawer). */
function getFieldValue(row, localChanges, fieldName) {
  if (localChanges[fieldName] !== undefined && localChanges[fieldName] !== null) {
    return localChanges[fieldName];
  }
  if (row?.[fieldName] !== undefined && row?.[fieldName] !== null && row?.[fieldName] !== '') {
    return row[fieldName];
  }
  if (fieldName === 'lineItems') return [];
  return '';
}

function normalizeForCompare(fieldName, value) {
  if (fieldName === 'lineItems') {
    return JSON.stringify(value ?? []);
  }
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function mergeOrderForm(row, localChanges) {
  if (!row) return null;
  const merged = { ...row, lineItems: [...(row.lineItems ?? [])] };
  for (const [key, value] of Object.entries(localChanges ?? {})) {
    if (value === undefined || value === null) continue;
    if (key === 'lineItems' && Array.isArray(value)) {
      merged.lineItems = value.map((item) => ({ ...item }));
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

const ViewOrderDrawer = ({
  open,
  onOpenChange,
  order,
  onAddInEntry = () => {},
  onCancelOrder = () => {},
  onUpdateOrder,
  isCancelling = false,
}) => {
  const dispatch = useDispatch();
  const detailState = useSelector(selectPurchaseOrderDetailState);
  const activityState = useSelector(selectStocksDocumentActivity('purchaseOrder'));

  const [activeTab, setActiveTab] = useState(TAB_PRODUCTS);
  const [localChanges, setLocalChanges] = useState({});

  const updateQueueRef = useRef(Promise.resolve());
  const previousOrderIdRef = useRef(null);
  const notesDebounceRef = useRef(null);

  const orderName = order?.name ?? order?.orderNo ?? order?.id ?? '';
  // Keep showing the last loaded order while a same-order refresh is in flight.
  const displayRow = detailState.order;
  const viewRowForEdit = displayRow ?? order;
  const canUpdateOrder =
    viewRowForEdit?.canUpdate ??
    resolvePurchaseOrderCanUpdate(viewRowForEdit ?? {}, viewRowForEdit?.status);
  const row =
    displayRow?.form ??
    order?.draftForm ??
    (displayRow ? mapOrderRowToEditForm(displayRow) : null) ??
    (detailState.status === 'failed' && canUpdateOrder ? mapOrderRowToEditForm(order) : null);
  const isEditable = canUpdateOrder && Boolean(row);

  const getOriginalFieldValue = useCallback(
    (fieldName) => getFieldValue(row, {}, fieldName),
    [row],
  );

  const persistUpdate = useCallback(
    (nextLocalChanges) => {
      if (!orderName || !onUpdateOrder || !row) return Promise.resolve();
      const currentForm = mergeOrderForm(row, nextLocalChanges);
      let patch;
      try {
        patch = buildPurchaseOrderUpdatePayload(row, currentForm);
      } catch (error) {
        showErrorToast(error, {
          defaultMessage: 'One or more line items need a valid quantity and rate before saving.',
        });
        return Promise.resolve();
      }
      if (!patch) return Promise.resolve();
      return onUpdateOrder(orderName, { patch, form: currentForm });
    },
    [orderName, onUpdateOrder, row],
  );

  const handleFieldChange = useCallback(
    (fieldName, value) => {
      if (!orderName || !onUpdateOrder || !row || !canUpdateOrder) return;

      const currentValue = getOriginalFieldValue(fieldName);
      if (normalizeForCompare(fieldName, currentValue) === normalizeForCompare(fieldName, value)) {
        return;
      }

      setLocalChanges((previous) => {
        const next = { ...previous, [fieldName]: value };
        updateQueueRef.current = updateQueueRef.current
          .catch(() => {})
          .then(() => persistUpdate(next));
        return next;
      });
    },
    [orderName, onUpdateOrder, row, canUpdateOrder, getOriginalFieldValue, persistUpdate],
  );

  const handleNotesChange = useCallback(
    (value) => {
      if (!row) return;
      setLocalChanges((previous) => ({ ...previous, notes: value }));
      if (notesDebounceRef.current) window.clearTimeout(notesDebounceRef.current);
      notesDebounceRef.current = window.setTimeout(() => {
        const current = getOriginalFieldValue('notes');
        if (normalizeForCompare('notes', current) === normalizeForCompare('notes', value)) return;
        setLocalChanges((previous) => {
          const next = { ...previous, notes: value };
          updateQueueRef.current = updateQueueRef.current
            .catch(() => {})
            .then(() => persistUpdate(next));
          return next;
        });
      }, 500);
    },
    [row, getOriginalFieldValue, persistUpdate],
  );

  const updateLine = useCallback(
    (lineId, patch) => {
      if (!row || !canUpdateOrder) return;
      setLocalChanges((previous) => {
        const currentLines = getFieldValue(row, previous, 'lineItems');
        const lineItems = (Array.isArray(currentLines) ? currentLines : []).map((line) => {
          if (line.id !== lineId) return line;
          const merged = { ...line, ...patch };
          if (patch.quantity !== undefined || patch.orderRate !== undefined) {
            const orderRate = patch.orderRate !== undefined ? patch.orderRate : merged.orderRate;
            const quantity = patch.quantity !== undefined ? patch.quantity : merged.quantity;
            merged.orderRate = orderRate;
            merged.unitPrice = orderRate;
            merged.amount = computeOrderLineAmount(quantity, orderRate);
          }
          return merged;
        });
        if (
          normalizeForCompare('lineItems', getOriginalFieldValue('lineItems')) ===
          normalizeForCompare('lineItems', lineItems)
        ) {
          return previous;
        }
        return { ...previous, lineItems };
      });
    },
    [row, canUpdateOrder, getOriginalFieldValue],
  );

  const commitLineItems = useCallback(() => {
    if (!row || !canUpdateOrder || !onUpdateOrder) return;
    setLocalChanges((previous) => {
      const lineItems = getFieldValue(row, previous, 'lineItems');
      if (
        normalizeForCompare('lineItems', getOriginalFieldValue('lineItems')) ===
        normalizeForCompare('lineItems', lineItems)
      ) {
        return previous;
      }
      const next = { ...previous, lineItems };
      updateQueueRef.current = updateQueueRef.current
        .catch(() => {})
        .then(() => persistUpdate(next));
      return next;
    });
  }, [row, canUpdateOrder, onUpdateOrder, getOriginalFieldValue, persistUpdate]);

  const handleOrderDateChange = useCallback(
    (date) => handleFieldChange('orderDate', vendorRcDateToIso(date)),
    [handleFieldChange],
  );

  const handleExpectedDeliveryChange = useCallback(
    (date) => handleFieldChange('expectedDelivery', vendorRcDateToIso(date)),
    [handleFieldChange],
  );

  useEffect(() => {
    if (!open || !orderName) return;
    setActiveTab(TAB_PRODUCTS);
    dispatch(fetchPurchaseOrderDetail(orderName));
  }, [open, orderName, dispatch]);

  useEffect(() => {
    if (!open) {
      setLocalChanges({});
      updateQueueRef.current = Promise.resolve();
      previousOrderIdRef.current = null;
      if (notesDebounceRef.current) window.clearTimeout(notesDebounceRef.current);
      dispatch(clearPurchaseOrderDetail());
      dispatch(clearStocksDocumentActivity('purchaseOrder'));
      return;
    }

    if (previousOrderIdRef.current !== orderName) {
      previousOrderIdRef.current = orderName;
      setLocalChanges({});
      updateQueueRef.current = Promise.resolve();
      setActiveTab(TAB_PRODUCTS);
    }
  }, [open, orderName, dispatch]);

  useEffect(() => {
    if (!open || activeTab !== TAB_ACTIVITY || !orderName) return;
    dispatch(fetchStocksDocumentActivity({ scope: 'purchaseOrder', name: orderName }));
  }, [dispatch, open, activeTab, orderName]);

  const viewRow = displayRow ?? order;
  const orderDate = getFieldValue(row, localChanges, 'orderDate');
  const expectedDelivery = getFieldValue(row, localChanges, 'expectedDelivery');
  const notes = getFieldValue(row, localChanges, 'notes');
  const lines = isEditable
    ? getFieldValue(row, localChanges, 'lineItems')
    : Array.isArray(viewRow?.lineItems)
      ? viewRow.lineItems
      : [];

  const resolvedStatus = viewRow?.status ?? order?.status;
  const hasStockIn =
    viewRow?.hasStockIn ?? resolvePurchaseOrderHasStockIn(viewRow ?? {}, resolvedStatus);
  const updateBlockedByStockIn =
    !canUpdateOrder && hasStockIn && resolvedStatus !== STOCKS_ORDER_STATUS.CANCELLED;
  const canCancelOrder = resolvedStatus === STOCKS_ORDER_STATUS.ORDERED;
  const isDetailLoading = detailState.isLoading && !displayRow;
  const detailLoadFailed = detailState.status === 'failed' && !displayRow;
  const detailRefreshFailed = detailState.status === 'failed' && Boolean(displayRow);

  const lineItemSummary = useMemo(() => {
    const productCount =
      viewRow?.lineItemCount ?? lines.filter((line) => String(line.product ?? '').trim()).length;
    let totalQty = 0;
    let orderValue = 0;
    for (const line of lines) {
      const qty = Number.parseFloat(String(line.quantity ?? '').replaceAll(',', ''));
      if (Number.isNaN(qty) || qty <= 0) continue;
      totalQty += qty;
      const lineAmount = parseRupeeNumber(line.amount);
      if (lineAmount > 0) {
        orderValue += lineAmount;
        continue;
      }
      const rate = parseRupeeNumber(line.orderRate);
      if (rate > 0) orderValue += qty * rate;
    }

    const totalQtyDisplay =
      totalQty > 0 ? (Number.isInteger(totalQty) ? String(totalQty) : totalQty.toFixed(2)) : '—';
    const orderValueLabel =
      isEditable && Object.keys(localChanges).length > 0
        ? formatOrderValueLabel(orderValue)
        : viewRow?.totalAmountLabel || formatOrderValueLabel(orderValue);

    return { productCount, totalQtyDisplay, orderValueLabel };
  }, [lines, viewRow?.totalAmountLabel, viewRow?.lineItemCount, isEditable, localChanges]);

  const handleClose = () => onOpenChange(false);

  const titleParts = useMemo(
    () => splitCenterTitle(viewRow?.center ?? order?.center),
    [viewRow?.center, order?.center],
  );

  if (!order) return null;

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='max-w-[min(1200px,calc(100vw-16px))]'>
        <div className='flex h-full max-h-[100dvh] min-h-0 flex-col'>
          <Drawer.Header
            className='sticky top-0 z-10 flex h-14 shrink-0 items-center border-b border-stroke-soft-200 bg-bg-white-0 px-6 py-3'
            showCloseButton={false}
          >
            <div className='flex w-full items-center justify-between gap-4'>
              <div
                className='inline-flex overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0 shadow-[0px_1px_2px_0px_rgba(88,92,95,0.06)]'
                aria-label='Order navigation'
              >
                <button
                  type='button'
                  className='flex size-8 items-center justify-center border-r border-stroke-soft-200 text-text-sub-500 transition-colors hover:bg-bg-weak-50 hover:text-text-main-900'
                  onClick={handleClose}
                >
                  <RiArrowLeftSLine className='size-5' aria-hidden />
                </button>
                <button
                  type='button'
                  className='flex size-8 items-center justify-center text-text-disabled-300'
                  disabled
                  aria-disabled
                >
                  <RiArrowRightSLine className='size-5' aria-hidden />
                </button>
              </div>
              <div className='flex shrink-0 items-center gap-2.5'>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='small'
                  className='min-h-8 gap-0.5 px-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
                  onClick={onAddInEntry}
                >
                  <Button.Icon as={RiAddLine} className='size-5' />
                  <span className='text-label-sm font-medium text-text-sub-500'>Add In Entry</span>
                </Button.Root>
                {canCancelOrder ? (
                  <Button.Root
                    type='button'
                    variant='neutral'
                    mode='stroke'
                    size='small'
                    className='min-h-8 px-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
                    onClick={onCancelOrder}
                    disabled={isCancelling || isDetailLoading}
                  >
                    <span className='text-label-sm font-medium text-text-sub-500'>
                      {isCancelling ? 'Cancelling…' : 'Cancel Order'}
                    </span>
                  </Button.Root>
                ) : null}
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  className='size-8 min-w-8 p-0 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
                  onClick={handleClose}
                >
                  <Button.Icon as={RiCloseLine} />
                </Button.Root>
              </div>
            </div>
          </Drawer.Header>

          {isDetailLoading ? (
            <div className='flex flex-1 items-center justify-center p-8'>
              <span className='paragraph-small text-text-sub-600'>Loading order…</span>
            </div>
          ) : detailLoadFailed && !viewRow?.lineItems?.length ? (
            <div className='flex flex-1 items-center justify-center p-8'>
              <span className='paragraph-small text-red-600'>
                {detailState.error || 'Failed to load order.'}
              </span>
            </div>
          ) : (
            <div className='flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row'>
              <aside className='flex w-full shrink-0 flex-col gap-6 overflow-y-auto border-stroke-soft-200 px-6 pb-6 pt-5 lg:w-[422px] lg:max-w-[422px] lg:border-r lg:px-6'>
                <h1 className='text-[24px] font-medium leading-8 tracking-[-0.36px] text-text-main-900'>
                  <span>{titleParts.primary}</span>
                  {titleParts.secondary ? (
                    <span className='text-text-sub-500'> {titleParts.secondary}</span>
                  ) : null}
                </h1>

                {updateBlockedByStockIn ? (
                  <p className='rounded-lg border border-stroke-soft-200 bg-bg-weak-50 px-3 py-2 text-label-sm text-text-sub-600'>
                    Stock inward already created for this order. Editing is no longer available.
                  </p>
                ) : null}

                {detailRefreshFailed ? (
                  <div className='flex flex-col gap-2 rounded-lg border border-stroke-soft-200 bg-bg-weak-50 px-3 py-2'>
                    <p className='text-label-sm text-error-base'>
                      {detailState.error || 'Failed to refresh order details.'}
                    </p>
                    <Button.Root
                      type='button'
                      variant='neutral'
                      mode='stroke'
                      size='xsmall'
                      className='w-fit'
                      onClick={() => orderName && dispatch(fetchPurchaseOrderDetail(orderName))}
                    >
                      Retry
                    </Button.Root>
                  </div>
                ) : null}

                <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
                  <div className='divide-y divide-stroke-soft-200'>
                    <FieldRow icon={RiPriceTag3Line} label='Status' className='bg-[#F6F8FA]'>
                      <Badge.Root
                        size='small'
                        variant='light'
                        color={statusBadgeColor(resolvedStatus)}
                        className='uppercase tracking-wide'
                      >
                        {resolvedStatus}
                      </Badge.Root>
                    </FieldRow>
                    <FieldRow icon={RiTeamLine} label='Vendor' className='bg-[#F6F8FA]'>
                      <span className='text-paragraph-sm px-2 text-text-sub-500'>
                        {viewRow?.vendor || '—'}
                      </span>
                    </FieldRow>
                    <FieldRow icon={RiPriceTag3Line} label='Category' className='bg-[#F6F8FA]'>
                      <span className='text-paragraph-sm px-2 text-text-sub-500'>
                        {viewRow?.category || '—'}
                      </span>
                    </FieldRow>
                    <FieldRow
                      icon={RiCalendarLine}
                      label='PO Date'
                      required
                      className='bg-[#F6F8FA]'
                    >
                      {isEditable ? (
                        <Datepicker
                          value={vendorRcIsoToDate(orderDate)}
                          onChange={handleOrderDateChange}
                          placeholder='DD/MM/YY'
                          size='xsmall'
                          variant='borderless'
                          formatDate={(date) => formatVendorRcDateDisplay(vendorRcDateToIso(date))}
                        />
                      ) : (
                        <span className='text-paragraph-sm px-2 text-text-sub-500'>
                          {viewRow?.requestDate || '—'}
                        </span>
                      )}
                    </FieldRow>
                    <FieldRow
                      icon={RiCalendarLine}
                      label='Expected Delivery'
                      className='bg-[#F6F8FA]'
                    >
                      {isEditable ? (
                        <Datepicker
                          value={vendorRcIsoToDate(expectedDelivery)}
                          onChange={handleExpectedDeliveryChange}
                          placeholder='DD/MM/YY'
                          size='xsmall'
                          variant='borderless'
                          min={vendorRcIsoToDate(orderDate)}
                          formatDate={(date) => formatVendorRcDateDisplay(vendorRcDateToIso(date))}
                        />
                      ) : (
                        <span className='text-paragraph-sm px-2 text-text-sub-500'>
                          {viewRow?.expectedDelivery || '—'}
                        </span>
                      )}
                    </FieldRow>
                  </div>
                </div>

                <div className='flex flex-col gap-3'>
                  <div className='flex items-center gap-2 text-label-md font-medium text-text-sub-500'>
                    <RiStickyNoteLine className='size-5 shrink-0 text-text-sub-600' aria-hidden />
                    Notes
                  </div>
                  <Textarea.Root
                    value={notes}
                    onChange={(event) => handleNotesChange(event.target.value)}
                    placeholder='Add notes'
                    rows={3}
                    containerClassName='min-h-[88px]'
                  />
                </div>
              </aside>

              <div className='flex min-h-0 min-w-0 flex-1 flex-col bg-bg-white-0'>
                <TabMenuHorizontal.Root
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className='flex min-h-0 flex-1 flex-col'
                >
                  <TabMenuHorizontal.List className='h-12 shrink-0 gap-8 border-0 border-b border-stroke-soft-200 px-6 pt-1'>
                    <TabMenuHorizontal.Trigger value={TAB_PRODUCTS} className='gap-1.5 py-2'>
                      <RiListCheck2 className='size-4 shrink-0' aria-hidden />
                      Products
                    </TabMenuHorizontal.Trigger>
                    <TabMenuHorizontal.Trigger value={TAB_ACTIVITY} className='gap-1.5 py-2'>
                      <RiHistoryLine className='size-4 shrink-0' aria-hidden />
                      Activity
                    </TabMenuHorizontal.Trigger>
                  </TabMenuHorizontal.List>

                  <TabMenuHorizontal.Content
                    value={TAB_PRODUCTS}
                    className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none'
                  >
                    <div className='flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6 pt-5'>
                      <div className='min-w-0 flex-1'>
                        <div className='overflow-x-auto border border-stroke-soft-200'>
                          <div className='min-w-[720px]'>
                            <div
                              className='grid border-b border-stroke-soft-200 bg-bg-weak-50 text-label-sm font-medium text-text-sub-600'
                              style={{
                                gridTemplateColumns: STOCKS_ORDER_DETAIL_LINE_ITEMS_GRID_TEMPLATE,
                              }}
                            >
                              <div className='min-w-0 whitespace-nowrap px-3 py-2'>Product</div>
                              <div className='min-w-0 whitespace-nowrap px-3 py-2'>Cur. Stock</div>
                              <div className='min-w-0 whitespace-nowrap px-3 py-2'>Order Qty</div>
                              <div className='min-w-0 whitespace-nowrap px-3 py-2'>RC Rate (₹)</div>
                              <div className='min-w-0 whitespace-nowrap px-3 py-2'>
                                Order Rate (₹)
                              </div>
                              <div className='min-w-0 whitespace-nowrap px-3 py-2'>Remark</div>
                            </div>
                            {lines.length === 0 ? (
                              <div className='border-b border-stroke-soft-200 px-3 py-10 text-center text-paragraph-sm text-text-sub-500'>
                                No line items
                              </div>
                            ) : (
                              lines.map((line) => {
                                const inv = orderLineInventoryDisplay(viewRow, line);
                                const rates = orderLineRates(line);
                                return (
                                  <div
                                    key={line.id}
                                    className='grid border-b border-stroke-soft-200 last:border-b-0'
                                    style={{
                                      gridTemplateColumns:
                                        STOCKS_ORDER_DETAIL_LINE_ITEMS_GRID_TEMPLATE,
                                    }}
                                  >
                                    <div className='px-3 py-2.5 truncate text-paragraph-sm text-text-main-900'>
                                      <Tooltip.Root>
                                        <Tooltip.Trigger asChild>
                                          <span className='text-paragraph-sm text-text-main-900'>
                                            {line.product}
                                          </span>
                                        </Tooltip.Trigger>
                                        <Tooltip.Content>{line.product}</Tooltip.Content>
                                      </Tooltip.Root>
                                    </div>
                                    <div className='px-3 py-2.5 text-paragraph-sm text-text-sub-600'>
                                      {inv.curStock}
                                    </div>
                                    {isEditable ? (
                                      <>
                                        <div className='min-w-0 px-2 py-1'>
                                          <InlineFieldInput
                                            type='number'
                                            min={0}
                                            value={line.quantity}
                                            onChange={(event) =>
                                              updateLine(line.id, { quantity: event.target.value })
                                            }
                                            onBlur={commitLineItems}
                                            placeholder='0'
                                          />
                                        </div>
                                        <div className='px-3 py-2.5 text-paragraph-sm text-text-sub-600'>
                                          {rates.rcRate}
                                        </div>
                                        <div className='min-w-0 px-2 py-1'>
                                          <InlineFieldInput
                                            value={line.orderRate}
                                            onChange={(event) =>
                                              updateLine(line.id, { orderRate: event.target.value })
                                            }
                                            onBlur={commitLineItems}
                                            placeholder='₹0'
                                          />
                                        </div>
                                        <div className='min-w-0 px-2 py-1'>
                                          <InlineFieldInput
                                            value={line.remark}
                                            onChange={(event) =>
                                              updateLine(line.id, { remark: event.target.value })
                                            }
                                            onBlur={commitLineItems}
                                            placeholder='—'
                                          />
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className='px-3 py-2.5 text-paragraph-sm text-text-sub-600'>
                                          {line.quantity ?? '—'}
                                        </div>
                                        <div className='px-3 py-2.5 text-paragraph-sm text-text-sub-600'>
                                          {rates.rcRate}
                                        </div>
                                        <div className='min-w-0 px-3 py-2.5 text-paragraph-sm text-text-sub-600'>
                                          {rates.orderRate}
                                        </div>
                                        <div className='min-w-0 break-words px-3 py-2.5 text-paragraph-sm text-text-sub-600'>
                                          {line.remark ?? '—'}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                        <div className='grid h-10 grid-cols-3 divide-x divide-stroke-soft-200 rounded-b-lg border border-t-0 border-stroke-soft-200 bg-bg-weak-50'>
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
                      </div>
                    </div>
                  </TabMenuHorizontal.Content>

                  <TabMenuHorizontal.Content
                    value={TAB_ACTIVITY}
                    className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none'
                  >
                    <StocksActivityPanel
                      activity={activityState.items}
                      isLoading={activityState.isLoading}
                      error={activityState.error}
                      onRetry={() =>
                        orderName &&
                        dispatch(
                          fetchStocksDocumentActivity({
                            scope: 'purchaseOrder',
                            name: orderName,
                          }),
                        )
                      }
                      emptyMessage='No activity recorded yet.'
                    />
                  </TabMenuHorizontal.Content>
                </TabMenuHorizontal.Root>
              </div>
            </div>
          )}
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default ViewOrderDrawer;
