import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarLine,
  RiCloseLine,
  RiFileListLine,
  RiFileTextLine,
  RiHistoryLine,
  RiInformationFill,
  RiInformationLine,
  RiLightbulbLine,
  RiListCheck2,
  RiPriceTag3Line,
  RiStickyNoteLine,
} from 'react-icons/ri';

import { STOCKS_STOCK_IN_SOURCE, STOCKS_STOCK_IN_STATUS } from '@/components/stocks/constants';
import {
  STOCK_IN_LINE_GRID_READONLY,
  STOCK_IN_TRANSFER_LINE_GRID_READONLY,
  stockInStatusBadgeColor,
} from '@/components/stocks/stock-in/helpers/shared';
import { formatVendorRcDateDisplay } from '@/components/stocks/stocks-helper';
import { splitStockInCenterTitle } from '@/components/stocks/stock-in/helpers/list';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import * as Drawer from '@/components/ui/drawer';
import FieldRow from '@/components/ui/field-row';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import StocksActivityPanel from '@/components/stocks/shared/stocks-activity-panel';
import StockImagesDisplay from '@/components/stocks/shared/stock-images-display';
import StocksCategoryBadges from '@/components/stocks/shared/stocks-category-badges';
import {
  clearStockInDetail,
  clearStocksDocumentActivity,
  fetchStockInDetail,
  fetchStocksDocumentActivity,
  selectStockInDetailState,
  selectStocksDocumentActivity,
} from '@/redux/stocksSlice';
import { showErrorToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';

const TAB_LINE = 'line-items';
const TAB_ACTIVITY = 'activity';

const PARTIAL_BANNER_MESSAGE =
  "You're updating a partially completed inward entry. Add the missing items to complete it.";

function parseLineQty(value) {
  const n = Number.parseFloat(String(value ?? '').replaceAll(',', ''));
  return Number.isNaN(n) ? 0 : n;
}

function stockInLineHasPartialQty(line) {
  const ordered = parseLineQty(line.ordered);
  const accepted = parseLineQty(line.accepted);
  const rejected = parseLineQty(line.rejected);
  return rejected > 0 || (ordered > 0 && accepted < ordered);
}

function displayTextCell(value) {
  const text = value != null && String(value).trim() ? String(value) : '—';
  return <span className='px-3 py-2.5 text-paragraph-sm text-text-sub-600'>{text}</span>;
}

function displayQtyCell(value, highlight, { emptyAsZero = false } = {}) {
  const trimmed = value != null ? String(value).trim() : '';
  const text = trimmed !== '' ? trimmed : emptyAsZero ? '0' : '—';
  if (!highlight) {
    return <span className='px-3 py-2.5 text-paragraph-sm text-text-sub-600'>{text}</span>;
  }
  return (
    <span
      className={cn(
        'mx-2 my-1.5 inline-flex min-h-7 min-w-[2rem] items-center justify-center rounded-md px-2 text-paragraph-sm font-medium',
        highlight === 'accepted' && 'bg-success-lighter text-text-main-900',
        highlight === 'rejected' && 'bg-error-lighter text-text-main-900',
      )}
    >
      {text}
    </span>
  );
}

function StockInPartialBanner({ onDismiss }) {
  return (
    <div
      role='status'
      aria-live='polite'
      className='flex shrink-0 items-center justify-between gap-4 rounded-lg bg-information-lighter p-2 text-information-dark'
    >
      <div className='flex min-w-0 items-center gap-2'>
        <RiInformationFill className='size-4 shrink-0 text-information-base' aria-hidden />
        <p className='text-paragraph-sm'>{PARTIAL_BANNER_MESSAGE}</p>
      </div>
    </div>
  );
}

const ViewStockInDrawer = ({ open, onOpenChange, row }) => {
  const dispatch = useDispatch();
  const detailState = useSelector(selectStockInDetailState);
  const activityState = useSelector(selectStocksDocumentActivity('stockIn'));
  const [activeTab, setActiveTab] = useState(TAB_LINE);
  const [partialBannerDismissed, setPartialBannerDismissed] = useState(false);

  const entryName = row?.name ?? row?.id ?? '';
  const detail = detailState.form;
  const resolvedStatus = detail?.status ?? row?.status ?? '';

  useEffect(() => {
    if (!open || !entryName) return;
    setActiveTab(TAB_LINE);
    setPartialBannerDismissed(false);
    dispatch(fetchStockInDetail(entryName));
  }, [open, entryName, dispatch]);

  useEffect(() => {
    if (!open) {
      dispatch(clearStockInDetail());
      dispatch(clearStocksDocumentActivity('stockIn'));
      return;
    }
    if (detailState.status === 'failed' && detailState.error) {
      showErrorToast(detailState.error, { defaultMessage: 'Failed to load inward entry.' });
    }
  }, [open, detailState.status, detailState.error, dispatch]);

  useEffect(() => {
    if (!open || activeTab !== TAB_ACTIVITY || !entryName) return;
    dispatch(fetchStocksDocumentActivity({ scope: 'stockIn', name: entryName }));
  }, [dispatch, open, activeTab, entryName]);

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  const isPurchaseOrder = detail?.sourceType === STOCKS_STOCK_IN_SOURCE.PURCHASE_ORDER;
  const isTransfer = detail?.sourceType === STOCKS_STOCK_IN_SOURCE.TRANSFER_IN;
  const isPartiallyCompleted = resolvedStatus === STOCKS_STOCK_IN_STATUS.PARTIALLY_COMPLETED;
  const showPartialBanner = isPartiallyCompleted && !partialBannerDismissed;

  const titleParts = useMemo(
    () => splitStockInCenterTitle(detail?.centerLabel ?? row?.center),
    [detail?.centerLabel, row?.center],
  );

  const purchaseOrderLabel = useMemo(() => {
    if (!isPurchaseOrder) return '';
    // const vendor = String(detail?.vendorLabel ?? '').trim();
    const po = String(detail?.poReference ?? '').trim();
    // if (vendor && po) return `${vendor} (${po})`;
    // return vendor || po || '—';
    return po || '—';
  }, [isPurchaseOrder, detail?.poReference]);

  const summary = useMemo(() => {
    const lines = detail?.lineItems ?? [];
    let totalQty = 0;
    for (const line of lines) {
      totalQty += parseLineQty(line.accepted);
    }
    return {
      productCount: lines.length,
      totalQtyLabel:
        totalQty > 0 ? String(Number.isInteger(totalQty) ? totalQty : totalQty.toFixed(2)) : '0',
      totalValueLabel: detail?.totalValueLabel ?? '₹0',
    };
  }, [detail?.lineItems, detail?.totalValueLabel]);

  const showContent = detailState.status === 'succeeded' && detail;
  const showLoading = detailState.isLoading;
  const showError = detailState.status === 'failed' && !detail;

  if (!row) return null;

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
                aria-label='Inward entry navigation'
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
          </Drawer.Header>

          {showLoading ? (
            <div className='flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center'>
              <p className='text-label-md font-medium text-text-sub-500'>Loading inward entry…</p>
            </div>
          ) : null}

          {showError ? (
            <div className='flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center'>
              <p className='text-label-md font-medium text-text-sub-500'>
                {detailState.error || 'Failed to load inward entry.'}
              </p>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                onClick={() => dispatch(fetchStockInDetail(entryName))}
              >
                Retry
              </Button.Root>
            </div>
          ) : null}

          {showContent ? (
            <div className='flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row'>
              <aside className='flex w-full shrink-0 flex-col gap-6 overflow-y-auto border-stroke-soft-200 px-6 pb-6 pt-5 lg:w-[422px] lg:max-w-[422px] lg:border-r lg:px-6'>
                {showPartialBanner && showContent ? (
                  <StockInPartialBanner onDismiss={() => setPartialBannerDismissed(true)} />
                ) : null}
                <h1 className='text-[24px] font-medium leading-8 tracking-[-0.36px] text-text-main-900'>
                  <span>{titleParts.primary}</span>
                  {titleParts.secondary ? (
                    <span className='text-text-sub-500'> {titleParts.secondary}</span>
                  ) : null}
                </h1>

                <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
                  <div className='divide-y divide-stroke-soft-200'>
                    <FieldRow icon={RiPriceTag3Line} label='Status' className='bg-[#F6F8FA]'>
                      <Badge.Root
                        size='small'
                        variant='light'
                        color={stockInStatusBadgeColor(detail.status)}
                        className='uppercase tracking-wide'
                      >
                        {detail.status}
                      </Badge.Root>
                    </FieldRow>

                    <FieldRow icon={RiInformationLine} label='Source type' className='bg-[#F6F8FA]'>
                      <span className='px-2 text-paragraph-sm text-text-sub-500'>
                        {detail.sourceLabel}
                      </span>
                    </FieldRow>

                    <FieldRow icon={RiCalendarLine} label='Date' className='bg-[#F6F8FA]'>
                      <span className='px-2 text-paragraph-sm text-text-sub-500'>
                        {formatVendorRcDateDisplay(detail.poDate)}
                      </span>
                    </FieldRow>

                    {isTransfer ? (
                      <FieldRow
                        icon={RiFileListLine}
                        label='Outgoing entry'
                        className='bg-[#F6F8FA]'
                      >
                        <span className='px-2 text-paragraph-sm text-text-sub-500'>
                          {detail.outgoingStockEntry || '—'}
                        </span>
                      </FieldRow>
                    ) : isPurchaseOrder ? (
                      <FieldRow
                        icon={RiFileListLine}
                        label='Purchase order'
                        truncate
                        className='bg-[#F6F8FA]'
                      >
                        <span className='truncate px-2 text-paragraph-sm font-medium text-information-base'>
                          {purchaseOrderLabel}
                        </span>
                      </FieldRow>
                    ) : (
                      <FieldRow
                        icon={RiFileListLine}
                        label='PO / Reference no.'
                        className='bg-[#F6F8FA]'
                      >
                        <span className='px-2 text-paragraph-sm text-text-sub-500'>
                          {detail.poReference || '—'}
                        </span>
                      </FieldRow>
                    )}

                    {isTransfer ? (
                      <FieldRow icon={RiPriceTag3Line} label='From center' className='bg-[#F6F8FA]'>
                        <span className='px-2 text-paragraph-sm text-text-sub-500'>
                          {detail.sourceCenterLabel || detail.sourceCenter || '—'}
                        </span>
                      </FieldRow>
                    ) : (
                      <FieldRow icon={RiPriceTag3Line} label='Vendor' className='bg-[#F6F8FA]'>
                        <span className='px-2 text-paragraph-sm text-text-sub-500'>
                          {detail.vendorLabel}
                        </span>
                      </FieldRow>
                    )}

                    <FieldRow icon={RiPriceTag3Line} label='Category' className='bg-[#F6F8FA]'>
                      <div className='px-2 py-1'>
                        <StocksCategoryBadges categories={detail.category} emptyFallback='—' />
                      </div>
                    </FieldRow>
                  </div>
                </div>

                <div className='flex flex-col gap-3'>
                  <div className='flex items-center gap-2 text-label-md font-medium text-text-sub-500'>
                    <RiStickyNoteLine className='size-5 shrink-0 text-text-sub-600' aria-hidden />
                    Notes
                  </div>
                  <p className='text-paragraph-sm leading-relaxed text-text-sub-600'>
                    {detail.notes?.trim() ? detail.notes : '—'}
                  </p>
                </div>

                <StockImagesDisplay stockImages={detail.stockImages} />

                <StockImagesDisplay
                  stockImages={(detail.attachments ?? []).slice(0, 1)}
                  title='Goods Receipt Note'
                  icon={RiFileTextLine}
                  emptyMessage='No goods receipt note attached.'
                />
              </aside>

              <main className='flex min-h-0 min-w-0 flex-1 flex-col bg-bg-white-0'>
                <TabMenuHorizontal.Root
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className='flex min-h-0 flex-1 flex-col'
                >
                  <TabMenuHorizontal.List className='h-12 shrink-0 gap-8 border-0 border-b border-stroke-soft-200 px-6 pt-1'>
                    <TabMenuHorizontal.Trigger value={TAB_LINE} className='gap-1.5 py-2'>
                      <RiListCheck2 className='size-4 shrink-0' aria-hidden />
                      Products
                      {summary.productCount > 0 ? (
                        <span className='text-label-sm text-text-sub-500'>
                          ({summary.productCount})
                        </span>
                      ) : null}
                    </TabMenuHorizontal.Trigger>
                    <TabMenuHorizontal.Trigger value={TAB_ACTIVITY} className='gap-1.5 py-2'>
                      <RiHistoryLine className='size-4 shrink-0' aria-hidden />
                      Activity
                    </TabMenuHorizontal.Trigger>
                  </TabMenuHorizontal.List>

                  <TabMenuHorizontal.Content
                    value={TAB_LINE}
                    className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none'
                  >
                    <div className='flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6 pt-5'>
                      {detail.lineItems.length > 0 ? (
                        <div className='min-w-0 flex-1'>
                          <div className='overflow-x-auto border border-stroke-soft-200'>
                            <div className={isTransfer ? 'w-max min-w-full' : 'min-w-[900px]'}>
                              {isTransfer ? (
                                <>
                                  <div
                                    className={`${STOCK_IN_TRANSFER_LINE_GRID_READONLY} bg-bg-weak-50 text-label-sm font-medium`}
                                  >
                                    <span className='whitespace-nowrap px-3 py-2 text-text-sub-600'>
                                      Product
                                    </span>
                                    <span className='whitespace-nowrap px-3 py-2 text-text-sub-600'>
                                      Sent
                                    </span>
                                    <span className='whitespace-nowrap px-3 py-2 text-text-sub-600'>
                                      Received
                                    </span>
                                    <span className='whitespace-nowrap px-3 py-2 text-text-sub-600'>
                                      Pending
                                    </span>
                                    <span className='whitespace-nowrap px-3 py-2 text-text-sub-600'>
                                      Accepted
                                    </span>
                                    <span className='whitespace-nowrap px-3 py-2 text-text-sub-600'>
                                      Remarks
                                    </span>
                                  </div>
                                  {detail.lineItems.map((line) => {
                                    const partialRow = stockInLineHasPartialQty(line);
                                    const acceptedHighlight =
                                      partialRow && parseLineQty(line.accepted) > 0
                                        ? 'accepted'
                                        : null;

                                    return (
                                      <div
                                        key={line.id}
                                        className={STOCK_IN_TRANSFER_LINE_GRID_READONLY}
                                      >
                                        <span className='truncate px-3 py-2.5 text-paragraph-sm text-text-main-900'>
                                          {line.product}
                                        </span>
                                        {displayQtyCell(line.ordered, null, { emptyAsZero: true })}
                                        {displayQtyCell(line.received, null, { emptyAsZero: true })}
                                        {displayQtyCell(line.pendingQty, null, {
                                          emptyAsZero: true,
                                        })}
                                        {displayQtyCell(line.accepted, acceptedHighlight, {
                                          emptyAsZero: true,
                                        })}
                                        {displayTextCell(line.remarks)}
                                      </div>
                                    );
                                  })}
                                </>
                              ) : (
                                <>
                                  <div
                                    className={`${STOCK_IN_LINE_GRID_READONLY} bg-bg-weak-50 text-label-sm font-medium`}
                                  >
                                    <span className='px-3 py-2 text-text-sub-600'>Product</span>
                                    <span className='px-3 py-2 text-text-sub-600'>Ordered</span>
                                    <span className='px-3 py-2 text-text-sub-600'>Received</span>
                                    <span className='px-3 py-2 text-text-sub-600'>Accepted</span>
                                    <span className='px-3 py-2 text-text-sub-600'>Rejected</span>
                                    <span className='px-3 py-2 text-text-sub-600'>Rate (₹)</span>
                                    <span className='px-3 py-2 text-text-sub-600'>Total (₹)</span>
                                    <span className='px-3 py-2 text-text-sub-600'>Remarks</span>
                                  </div>
                                  {detail.lineItems.map((line) => {
                                    const partialRow = stockInLineHasPartialQty(line);
                                    const acceptedHighlight =
                                      partialRow && parseLineQty(line.accepted) > 0
                                        ? 'accepted'
                                        : null;
                                    const rejectedHighlight =
                                      partialRow && parseLineQty(line.rejected) > 0
                                        ? 'rejected'
                                        : null;

                                    return (
                                      <div key={line.id} className={STOCK_IN_LINE_GRID_READONLY}>
                                        <span className='truncate px-3 py-2.5 text-paragraph-sm text-text-main-900'>
                                          {line.product}
                                        </span>
                                        {displayQtyCell(line.ordered)}
                                        {displayQtyCell(line.received)}
                                        {displayQtyCell(line.accepted, acceptedHighlight)}
                                        {displayQtyCell(line.rejected, rejectedHighlight)}
                                        {displayQtyCell(line.rate)}
                                        {displayQtyCell(line.total)}
                                        {displayTextCell(line.remarks)}
                                      </div>
                                    );
                                  })}
                                </>
                              )}
                            </div>
                          </div>
                          <div
                            className={cn(
                              'grid h-10 divide-x divide-stroke-soft-200 rounded-b-lg border border-t-0 border-stroke-soft-200 bg-bg-weak-50',
                              isTransfer ? 'grid-cols-2' : 'grid-cols-3',
                            )}
                          >
                            <div className='flex items-center justify-center gap-2 px-2'>
                              <span className='text-label-xs font-medium uppercase tracking-wide text-text-sub-500'>
                                Products
                              </span>
                              <span className='text-[18px] font-medium leading-6 text-text-main-900'>
                                {summary.productCount}
                              </span>
                            </div>
                            <div className='flex items-center justify-center gap-2 px-2'>
                              <span className='text-label-xs font-medium uppercase tracking-wide text-text-sub-500'>
                                Total Qty
                              </span>
                              <span className='text-[18px] font-medium leading-6 text-text-main-900'>
                                {summary.totalQtyLabel}
                              </span>
                            </div>
                            {!isTransfer ? (
                              <div className='flex items-center justify-center gap-2 px-2'>
                                <span className='text-label-xs font-medium uppercase tracking-wide text-text-sub-500'>
                                  Order Value
                                </span>
                                <span className='text-[18px] font-medium leading-6 text-text-main-900'>
                                  {summary.totalValueLabel}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className='flex flex-col items-center justify-center gap-1 rounded-xl bg-bg-weak-100 py-10 text-center'>
                          <p className='text-label-md font-medium text-text-sub-500'>
                            No line items on this entry.
                          </p>
                        </div>
                      )}
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
                        entryName &&
                        dispatch(fetchStocksDocumentActivity({ scope: 'stockIn', name: entryName }))
                      }
                      emptyMessage='No activity recorded.'
                    />
                  </TabMenuHorizontal.Content>
                </TabMenuHorizontal.Root>
              </main>
            </div>
          ) : null}
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default ViewStockInDrawer;
