import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

import AssetInDetailPage from '@/components/aum/asset-in/asset-in-detail-page';
import {
  clearAssetInDetail,
  fetchAssetInDetail,
  selectAssetInDetail,
  selectAssetInMutations,
  submitAssetIn,
} from '@/redux/aumAssetInSlice';
import { clearAumActivity } from '@/redux/aumActivitySlice';

export default function AssetInDetailRouteWrapper() {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { record: transaction, status, error: detailError } = useSelector(selectAssetInDetail);
  const { submitStatus } = useSelector(selectAssetInMutations);

  const isLoading = status === 'loading';
  const isCompleting = submitStatus === 'loading';

  useEffect(() => {
    if (!transactionId) return undefined;

    dispatch(fetchAssetInDetail(transactionId));

    return () => {
      dispatch(clearAssetInDetail());
      dispatch(clearAumActivity());
    };
  }, [dispatch, transactionId]);

  useEffect(() => {
    if (status === 'failed') {
      showErrorToast(detailError, { defaultMessage: 'Could not load this asset entry.' });
    }
  }, [status, detailError]);

  const handleBack = () => {
    navigate('/aum/in');
  };

  const handleMarkAsCompleted = async (id, updatedAssets) => {
    try {
      await dispatch(submitAssetIn({ name: id, rows: updatedAssets })).unwrap();
      showSuccessToast('Asset entry marked as completed');
      navigate('/aum/in');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Could not complete this asset entry.' });
    }
  };

  if (isLoading) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16'>
        <p className='text-label-sm text-text-sub-500'>Loading asset entry...</p>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16'>
        <p className='text-label-sm text-text-sub-500'>Transaction not found.</p>
        <button
          onClick={handleBack}
          className='rounded-lg border border-stroke-soft-200 px-4 py-2 text-label-sm text-text-sub-600 hover:bg-bg-weak-50'
        >
          Back to list
        </button>
      </div>
    );
  }

  return (
    <AssetInDetailPage
      transaction={transaction}
      onBack={handleBack}
      onMarkAsCompleted={handleMarkAsCompleted}
      isCompleting={isCompleting}
    />
  );
}
