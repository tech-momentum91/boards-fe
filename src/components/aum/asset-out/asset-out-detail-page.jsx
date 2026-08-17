import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  RiArrowLeftLine,
  RiBox3Line,
  RiHistoryLine,
  RiTruckLine,
  RiCheckLine,
} from 'react-icons/ri';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

import { computeTotalsFromLineItems } from '@/components/aum/asset-out/asset-out-line-items';
import {
  fetchAvailableAssetsForOut,
  selectAssetOutAvailableAssets,
  sendAssetOutInTransit,
  updateAssetOutStatus,
} from '@/redux/aumAssetOutSlice';
import { fetchAumActivity, selectAumActivity } from '@/redux/aumActivitySlice';
import { getAssetOutStatusBadgeColor } from '@/components/aum/asset-out/asset-out-helper';
import AssetOutAssetPicker from '@/components/aum/asset-out/asset-out-asset-picker';
import AssetOutActivityPanel from '@/components/aum/asset-out/asset-out-activity-panel';
import { AUM_OUT_TYPES } from '@/components/aum/constants';
import { formatAumDetailDateDisplay } from '@/components/aum/asset/asset-detail-helper';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const DETAIL_TABS = [
  { id: 'assets', label: 'Assets', icon: RiBox3Line },
  { id: 'activity', label: 'Activity', icon: RiHistoryLine },
];

export default function AssetOutDetailPage({
  transaction,
  onBack,
  onUpdateTransaction,
  onReload,
  isSaving = false,
}) {
  const dispatch = useDispatch();
  const {
    items: availableAssets,
    status: assetsStatus,
    error: assetsError,
  } = useSelector(selectAssetOutAvailableAssets);
  const { items: activityHistory, status: activityStatus } = useSelector(selectAumActivity);

  const [activeTab, setActiveTab] = useState('assets');
  const [activityError, setActivityError] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const isLoadingAssets = assetsStatus === 'loading';
  const assetsLoadError = assetsError || '';
  const isLoadingActivity = activityStatus === 'loading';

  const isDraft = transaction.status === 'Draft';
  const isPending = transaction.status === 'Pending';
  const isValidated = transaction.status === 'Validated';
  const isInTransit = transaction.status === 'In Transit';
  const isCompleted = transaction.status === 'Completed';
  const isTransfer = transaction.outType === AUM_OUT_TYPES.TRANSFER;
  const isScrap = transaction.outType === AUM_OUT_TYPES.SCRAP;
  const isRetirementLinked = Boolean(String(transaction.sourceMaintenanceTaskId || '').trim());
  const canConfirmRetirement =
    isScrap && isRetirementLinked && (isDraft || isValidated) && !isCompleted;
  const canEditAssets = isDraft || isPending || isValidated;
  const lineItems = Array.isArray(transaction.lineItems) ? transaction.lineItems : [];

  useEffect(() => {
    dispatch(
      fetchAvailableAssetsForOut({
        centerSlug: transaction.centerSlug,
        floorLabel: transaction.floor,
        areaLabel: transaction.area,
        space: transaction.space,
      }),
    );
  }, [dispatch, transaction.centerSlug, transaction.floor, transaction.area, transaction.space]);

  const loadActivity = useCallback(() => {
    if (!transaction.id) {
      return Promise.resolve();
    }

    setActivityError(null);
    return dispatch(
      fetchAumActivity({
        entityDoctype: 'Asset Out',
        entityId: transaction.id,
      }),
    );
  }, [dispatch, transaction.id]);

  useEffect(() => {
    if (activityStatus === 'failed') {
      setActivityError('Could not load activity.');
    }
  }, [activityStatus]);

  useEffect(() => {
    if (activeTab !== 'activity') return undefined;
    loadActivity();
    return undefined;
  }, [activeTab, loadActivity, transaction.status]);

  const hasOutAssets = lineItems.some(
    (row) => row.assetId && String(row.issued ?? '').trim() === '1',
  );

  const handleLineItemsChange = async (nextLineItems) => {
    const previousStatus = transaction.status;
    const totals = computeTotalsFromLineItems(nextLineItems);
    const saved = await onUpdateTransaction?.({
      ...transaction,
      lineItems: nextLineItems,
      qty: totals.qty,
      value: totals.value,
    });
    if (saved?.status && saved.status !== previousStatus) {
      showSuccessToast(`Assets saved. Status updated to ${saved.status}.`);
    }
  };

  const STATUS_ACTION_MAP = {
    Pending: 'submit_for_review',
    Validated: 'mark_validated',
    'In Transit': 'send_in_transit',
  };

  const handleStatusAction = async (nextStatus) => {
    setIsActionLoading(true);
    try {
      let updated = transaction;
      if (nextStatus === 'In Transit') {
        updated = await dispatch(sendAssetOutInTransit(transaction.id)).unwrap();
      } else if (nextStatus === 'Completed') {
        updated = await dispatch(
          updateAssetOutStatus({ id: transaction.id, action: 'confirm_retirement' }),
        ).unwrap();
      } else {
        const action = STATUS_ACTION_MAP[nextStatus];
        if (!action) return;
        updated = await dispatch(updateAssetOutStatus({ id: transaction.id, action })).unwrap();
      }
      if (onReload) {
        await onReload();
        await loadActivity();
      } else {
        await onUpdateTransaction?.(updated);
      }
      showSuccessToast(`Transaction marked as ${nextStatus}.`);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Could not update transaction status.' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const actionDisabled = !hasOutAssets || isSaving || isActionLoading;

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-5 px-8 pb-10 pt-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='flex min-w-0 items-start gap-3'>
          <Button.Root type='button' variant='neutral' mode='stroke' size='small' onClick={onBack}>
            <Button.Icon as={RiArrowLeftLine} />
          </Button.Root>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='text-title-h6 font-semibold text-text-strong-950'>
                {transaction.outNumber}
              </h1>
              <Badge.Root
                size='small'
                variant='filled'
                color={getAssetOutStatusBadgeColor(transaction.status)}
              >
                {transaction.status}
              </Badge.Root>
            </div>
            <p className='mt-1 text-label-sm text-text-sub-500'>
              {transaction.outType} · {formatAumDetailDateDisplay(transaction.outDate)} ·{' '}
              {transaction.createdBy}
            </p>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          {isDraft ? (
            <Button.Root
              type='button'
              variant='primary'
              size='small'
              disabled={actionDisabled}
              onClick={() => handleStatusAction('Pending')}
            >
              Submit for review
            </Button.Root>
          ) : null}
          {isPending ? (
            <Button.Root
              type='button'
              variant='primary'
              size='small'
              disabled={actionDisabled}
              onClick={() => handleStatusAction('Validated')}
            >
              Mark validated
            </Button.Root>
          ) : null}
          {isValidated && isTransfer ? (
            <Button.Root
              type='button'
              variant='primary'
              size='small'
              disabled={actionDisabled}
              onClick={() => handleStatusAction('In Transit')}
            >
              Send
            </Button.Root>
          ) : null}
          {canConfirmRetirement ? (
            <Button.Root
              type='button'
              variant='primary'
              size='small'
              disabled={actionDisabled}
              onClick={() => handleStatusAction('Completed')}
            >
              Confirm retirement
            </Button.Root>
          ) : null}
          {isInTransit && isTransfer && transaction.destinationAssetInId ? (
            <Button.Root asChild type='button' variant='primary' size='small'>
              <Link to={`/aum/in/${transaction.destinationAssetInId}`}>
                Complete transfer at Asset In
              </Link>
            </Button.Root>
          ) : null}
        </div>
      </div>

      {isInTransit && isTransfer ? (
        <div className='flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3'>
          <RiTruckLine className='mt-0.5 size-5 shrink-0 text-purple-600' />
          <div>
            <p className='text-label-sm font-medium text-purple-900'>Assets are in transit</p>
            <p className='text-label-sm text-purple-800'>
              Moving from {transaction.centerName} ({transaction.floor}, {transaction.area}) to{' '}
              {transaction.destinationCenter} ({transaction.destinationFloor},{' '}
              {transaction.destinationArea}).
            </p>
            {transaction.destinationAssetInId ? (
              <p className='mt-2 text-label-sm text-purple-800'>
                Complete the receive at destination via{' '}
                <Link
                  to={`/aum/in/${transaction.destinationAssetInId}`}
                  className='font-medium text-purple-900 underline'
                >
                  Asset In {transaction.destinationAssetInId}
                </Link>
                .
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {isCompleted && isTransfer ? (
        <div className='flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3'>
          <RiCheckLine className='mt-0.5 size-5 shrink-0 text-green-600' />
          <p className='text-label-sm text-green-800'>
            Transfer completed. Assets have been received at {transaction.destinationCenter}.
          </p>
        </div>
      ) : null}

      {isCompleted && isScrap && isRetirementLinked ? (
        <div className='flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3'>
          <RiCheckLine className='mt-0.5 size-5 shrink-0 text-green-600' />
          <p className='text-label-sm text-green-800'>
            Retirement confirmed. The linked maintenance task has been marked Retired.
          </p>
        </div>
      ) : null}

      <TabMenuHorizontal.Root value={activeTab} onValueChange={setActiveTab}>
        <TabMenuHorizontal.List>
          {DETAIL_TABS.map((tab) => (
            <TabMenuHorizontal.Trigger key={tab.id} value={tab.id} className='gap-1.5'>
              <tab.icon className='size-4' />
              {tab.label}
            </TabMenuHorizontal.Trigger>
          ))}
        </TabMenuHorizontal.List>

        <TabMenuHorizontal.Content value='assets' className='pt-4'>
          {assetsLoadError ? (
            <div className='mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-label-sm text-red-700'>
              {assetsLoadError}
            </div>
          ) : null}
          {isLoadingAssets ? (
            <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-10 text-center text-label-sm text-text-sub-500'>
              Loading available assets...
            </div>
          ) : (
            <AssetOutAssetPicker
              availableAssets={availableAssets}
              lineItems={lineItems}
              locationLabel={`${transaction.centerName} · ${transaction.floor} · ${transaction.area}`}
              isEditable={canEditAssets}
              isSaving={isSaving}
              onLineItemsChange={handleLineItemsChange}
            />
          )}
        </TabMenuHorizontal.Content>

        <TabMenuHorizontal.Content
          value='activity'
          className='flex min-h-0 flex-1 flex-col overflow-hidden pt-4'
        >
          <AssetOutActivityPanel
            history={activityHistory}
            isLoading={isLoadingActivity}
            error={activityError}
            onRetry={loadActivity}
          />
        </TabMenuHorizontal.Content>
      </TabMenuHorizontal.Root>
    </div>
  );
}
