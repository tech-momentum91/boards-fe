import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiBuildingLine,
  RiCalendarLine,
  RiCloseLine,
  RiHistoryLine,
  RiListCheck2,
  RiPriceTag3Line,
  RiStickyNoteLine,
  RiUser3Line,
} from 'react-icons/ri';

import { formatStockOutCurrentStockLabel } from '@/components/stocks/stock-out/api';
import { stockOutStatusBadgeColor } from '@/components/stocks/stock-out/constants';
import StocksActivityPanel from '@/components/stocks/shared/stocks-activity-panel';
import StockImagesDisplay from '@/components/stocks/shared/stock-images-display';
import StocksCategoryBadges from '@/components/stocks/shared/stocks-category-badges';
import { formatVendorRcDateDisplay } from '@/components/stocks/stocks-helper';
import {
  clearStocksDocumentActivity,
  fetchStocksDocumentActivity,
  selectStocksDocumentActivity,
} from '@/redux/stocksSlice';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Drawer from '@/components/ui/drawer';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const TAB_LINE = 'line-items';
const TAB_ACTIVITY = 'activity';

const LINE_GRID =
  'grid min-h-10 items-center gap-1 border-b border-stroke-soft-200 last:border-b-0 [grid-template-columns:minmax(160px,1.35fr)_minmax(92px,0.55fr)_minmax(100px,0.55fr)_minmax(132px,0.7fr)_minmax(112px,0.75fr)]';

function cloneDetail(detail) {
  if (!detail) return null;
  return {
    ...detail,
    lineItems: Array.isArray(detail.lineItems) ? detail.lineItems.map((row) => ({ ...row })) : [],
    stockImages: Array.isArray(detail.stockImages) ? [...detail.stockImages] : [],
  };
}

function statusBadgeColor(status) {
  return stockOutStatusBadgeColor(status);
}

function splitCenterTitle(value) {
  const text = String(value ?? '').trim();
  const match = text.match(/^(.*?)(\s*\([^)]+\))$/);
  if (!match) return { name: text || '—', suffix: '' };
  return { name: match[1].trim(), suffix: match[2].trim() };
}

function formatPlainQty(value) {
  if (value == null || value === '') return '—';
  const num = Number.parseFloat(String(value).replaceAll(',', ''));
  if (!Number.isFinite(num)) return String(value);
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

function getRemainingBalanceLabel(line) {
  if (line?.remainingBalance != null) return formatPlainQty(line.remainingBalance);
  const current = Number.parseFloat(String(line?.currentStock ?? '').replaceAll(',', ''));
  const issued = Number.parseFloat(String(line?.issued ?? '').replaceAll(',', ''));
  if (!Number.isFinite(current) || !Number.isFinite(issued)) return '—';
  return formatPlainQty(Math.max(0, current - issued));
}

const ReadOnlyInfoRow = ({ icon: Icon, label, children }) => (
  <div className='grid min-h-10 grid-cols-[134px_minmax(0,1fr)] border-b border-stroke-soft-200 last:border-b-0'>
    <div className='flex items-center gap-1.5 border-r border-stroke-soft-200 bg-bg-weak-50/70 px-3'>
      {Icon ? <Icon className='size-5 shrink-0 text-text-sub-500' /> : null}
      <span className='text-label-sm font-medium text-text-main-900'>{label}</span>
    </div>
    <div className='flex min-w-0 items-center px-3 py-2 text-paragraph-sm text-text-main-900'>
      {children || <span className='text-text-soft-400'>—</span>}
    </div>
  </div>
);

const ViewStockOutDrawer = ({ open, onOpenChange, row }) => {
  const dispatch = useDispatch();
  const activityState = useSelector(selectStocksDocumentActivity('stockOut'));
  const [form, setForm] = useState(null);
  const [activeTab, setActiveTab] = useState(TAB_LINE);

  const entryName = row?.name ?? row?.id ?? '';

  useEffect(() => {
    if (open && row?.detail) {
      setForm(cloneDetail(row.detail));
      setActiveTab(TAB_LINE);
    }
  }, [open, row?.id, row?.detail]);

  useEffect(() => {
    if (!open) {
      dispatch(clearStocksDocumentActivity('stockOut'));
      return;
    }
    if (activeTab !== TAB_ACTIVITY || !entryName) return;
    dispatch(fetchStocksDocumentActivity({ scope: 'stockOut', name: entryName }));
  }, [dispatch, open, activeTab, entryName]);

  const centerTitle = splitCenterTitle(form?.centerLabel || row?.center || form?.center);
  const lineItems = Array.isArray(form?.lineItems) ? form.lineItems : [];
  const hasLineItems = lineItems.length > 0;

  const summary = useMemo(() => {
    const filled = (form?.lineItems ?? []).filter((r) => String(r.product ?? '').trim());
    let issued = 0;
    for (const line of filled) {
      const q = Number.parseFloat(String(line.issued ?? '').replaceAll(',', ''));
      if (!Number.isNaN(q)) issued += q;
    }
    return {
      productCount: filled.length,
      issuedLabel: issued > 0 ? String(Number.isInteger(issued) ? issued : issued.toFixed(2)) : '0',
    };
  }, [form?.lineItems]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  if (!row || !form) return null;

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='max-w-[min(1200px,calc(100vw-16px))] shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'>
        <div className='flex h-full max-h-[100dvh] min-h-0 flex-col'>
          <Drawer.Header
            className='sticky top-0 z-10 h-14 shrink-0 border-b border-stroke-soft-200 bg-bg-white-0 px-6 py-3'
            showCloseButton={false}
          >
            <div className='flex w-full flex-wrap items-center justify-between gap-3'>
              <div className='flex min-w-0 flex-1 items-center'>
                <div className='flex overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'>
                  <Button.Root
                    type='button'
                    variant='neutral'
                    mode='ghost'
                    size='xsmall'
                    className='rounded-none border-r border-stroke-soft-200'
                    onClick={handleClose}
                  >
                    <Button.Icon as={RiArrowLeftSLine} />
                  </Button.Root>
                  <Button.Root
                    type='button'
                    variant='neutral'
                    mode='ghost'
                    size='xsmall'
                    className='rounded-none text-text-soft-400'
                    disabled
                  >
                    <Button.Icon as={RiArrowRightSLine} />
                  </Button.Root>
                </div>
              </div>
              <div className='flex shrink-0 flex-wrap items-center gap-2'>
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
          </Drawer.Header>

          <div className='flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row'>
            <aside className='flex w-full shrink-0 flex-col overflow-y-auto border-stroke-soft-200 px-6 py-5 lg:w-[422px] lg:border-r'>
              <h2 className='text-title-h6 font-medium text-text-main-900'>
                {centerTitle.name}
                {centerTitle.suffix ? (
                  <span className='text-text-soft-400'> {centerTitle.suffix}</span>
                ) : null}
              </h2>

              <div className='mt-4 overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
                <ReadOnlyInfoRow icon={RiPriceTag3Line} label='Status'>
                  <Badge.Root size='small' variant='light' color={statusBadgeColor(row.status)}>
                    {row.status}
                  </Badge.Root>
                </ReadOnlyInfoRow>
                <ReadOnlyInfoRow icon={RiBuildingLine} label='Department'>
                  {form.department || row.department || '—'}
                </ReadOnlyInfoRow>
                {form.destinationCenterLabel || form.destinationCenter ? (
                  <ReadOnlyInfoRow icon={RiBuildingLine} label='Destination'>
                    {form.destinationCenterLabel || form.destinationCenter}
                  </ReadOnlyInfoRow>
                ) : null}
                <ReadOnlyInfoRow icon={RiCalendarLine} label='Date'>
                  {formatVendorRcDateDisplay(form.entryDate || row.dateIso)}
                </ReadOnlyInfoRow>
                <ReadOnlyInfoRow icon={RiUser3Line} label='Issued By'>
                  {form.issuedByLabel || form.issuedBy}
                </ReadOnlyInfoRow>
                <ReadOnlyInfoRow icon={RiPriceTag3Line} label='Category'>
                  <StocksCategoryBadges categories={form.category ?? row.category} />
                </ReadOnlyInfoRow>
                <ReadOnlyInfoRow icon={RiPriceTag3Line} label='Issue Mode'>
                  {form.issueMode}
                </ReadOnlyInfoRow>
              </div>

              <div className='mt-6 flex flex-col gap-3'>
                <div className='flex items-center gap-2 text-label-sm font-medium text-text-sub-500'>
                  <RiStickyNoteLine className='size-4 text-text-sub-500' />
                  Notes
                </div>
                <p className='text-paragraph-sm text-text-main-900'>
                  {String(form.notes ?? '').trim() || 'No notes added.'}
                </p>
              </div>

              <div className='mt-6'>
                <StockImagesDisplay stockImages={form.stockImages} />
              </div>
            </aside>

            <main className='flex min-h-0 min-w-0 flex-1 flex-col'>
              <TabMenuHorizontal.Root
                value={activeTab}
                onValueChange={setActiveTab}
                className='flex min-h-0 flex-1 flex-col'
              >
                <TabMenuHorizontal.List
                  wrapperClassName='w-full shrink-0'
                  className='h-auto min-h-12 gap-6 border-b border-stroke-soft-200 px-6 py-3'
                >
                  <TabMenuHorizontal.Trigger
                    value={TAB_LINE}
                    className='h-auto gap-1.5 py-0 data-[state=active]:text-text-strong-950'
                  >
                    <TabMenuHorizontal.Icon as={RiListCheck2} />
                    Products
                  </TabMenuHorizontal.Trigger>
                  <TabMenuHorizontal.Trigger
                    value={TAB_ACTIVITY}
                    className='h-auto gap-1.5 py-0 data-[state=active]:text-text-strong-950'
                  >
                    <TabMenuHorizontal.Icon as={RiHistoryLine} />
                    Activity
                  </TabMenuHorizontal.Trigger>
                </TabMenuHorizontal.List>

                <TabMenuHorizontal.Content
                  value={TAB_LINE}
                  className='flex min-h-0 flex-1 flex-col overflow-hidden'
                >
                  <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6'>
                    {hasLineItems ? (
                      <div className='flex flex-col overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
                        <div className='overflow-x-auto'>
                          <div className='min-w-[730px]'>
                            <div className={`${LINE_GRID} bg-bg-weak-50 px-2 text-label-sm`}>
                              <span className='text-text-sub-600'>Product</span>
                              <span className='text-text-sub-600'>Cur. Stock</span>
                              <span className='text-text-sub-600'>Issued Qty</span>
                              <span className='text-text-sub-600'>Remaining Balance</span>
                              <span className='text-text-sub-600'>Remarks</span>
                            </div>
                            {lineItems.map((line) => {
                              const curLabel = formatStockOutCurrentStockLabel(line.currentStock);
                              const remainingLabel = getRemainingBalanceLabel(line);
                              return (
                                <div key={line.id} className={`${LINE_GRID} px-2 py-1`}>
                                  <span
                                    className='min-w-0 truncate text-label-sm font-medium text-text-main-900'
                                    title={line.product || '—'}
                                  >
                                    {line.product || '—'}
                                  </span>
                                  <span className='text-paragraph-sm text-text-sub-500'>
                                    {curLabel}
                                  </span>
                                  <span className='text-paragraph-sm text-text-sub-500'>
                                    {formatPlainQty(line.issued)}
                                  </span>
                                  <span className='text-paragraph-sm text-text-sub-500'>
                                    {remainingLabel}
                                  </span>
                                  <span className='min-w-0 truncate text-paragraph-sm text-text-sub-500'>
                                    {line.remarks || '-'}
                                  </span>
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
                    ) : (
                      <div className='flex flex-col items-center justify-center gap-1 rounded-xl bg-bg-weak-100 py-10 text-center'>
                        <p className='text-label-md font-medium text-text-sub-500'>
                          No products found.
                        </p>
                        <p className='text-label-xs font-medium text-text-soft-400'>
                          This outward entry does not have any line items.
                        </p>
                      </div>
                    )}
                  </div>
                </TabMenuHorizontal.Content>

                <TabMenuHorizontal.Content
                  value={TAB_ACTIVITY}
                  className='flex min-h-0 flex-1 flex-col overflow-hidden'
                >
                  <StocksActivityPanel
                    activity={activityState.items}
                    isLoading={activityState.isLoading}
                    error={activityState.error}
                    onRetry={() =>
                      entryName &&
                      dispatch(fetchStocksDocumentActivity({ scope: 'stockOut', name: entryName }))
                    }
                    emptyMessage='No activity available.'
                  />
                </TabMenuHorizontal.Content>
              </TabMenuHorizontal.Root>
            </main>
          </div>
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default ViewStockOutDrawer;
