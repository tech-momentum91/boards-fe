import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { showErrorToast } from '@/utils/error-utils';

import AssetOutDetailPage from '@/components/aum/asset-out/asset-out-detail-page';
import {
  clearAssetOutDetail,
  fetchAssetOutDetail,
  selectAssetOutDetail,
  selectAssetOutMutations,
  upsertAssetOutTransaction,
} from '@/redux/aumAssetOutSlice';
import { clearAumActivity } from '@/redux/aumActivitySlice';

export default function AssetOutDetailRouteWrapper() {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { record: transaction, status, error: detailError } = useSelector(selectAssetOutDetail);
  const { saveStatus } = useSelector(selectAssetOutMutations);

  const isLoading = status === 'loading';
  const isSaving = saveStatus === 'loading';

  useEffect(() => {
    if (!transactionId) return undefined;

    dispatch(fetchAssetOutDetail(transactionId));

    return () => {
      dispatch(clearAssetOutDetail());
      dispatch(clearAumActivity());
    };
  }, [dispatch, transactionId]);

  useEffect(() => {
    if (status === 'failed') {
      showErrorToast(detailError, { defaultMessage: 'Could not load Asset Out detail.' });
    }
  }, [status, detailError]);

  const handleBack = () => {
    navigate('/aum/out');
  };

  const handleUpdateTransaction = async (nextTransaction) => {
    try {
      const saved = await dispatch(upsertAssetOutTransaction(nextTransaction)).unwrap();
      return saved;
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Could not save Asset Out.' });
      throw error;
    }
  };

  const handleReload = () => {
    if (transactionId) {
      dispatch(fetchAssetOutDetail(transactionId));
    }
  };

  if (isLoading) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16'>
        <p className='text-label-sm text-text-sub-500'>Loading asset out transaction...</p>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16'>
        <p className='text-label-sm text-text-sub-500'>Transaction not found.</p>
        <button
          type='button'
          onClick={handleBack}
          className='rounded-lg border border-stroke-soft-200 px-4 py-2 text-label-sm text-text-sub-600 hover:bg-bg-weak-50'
        >
          Back to list
        </button>
      </div>
    );
  }

  return (
    <AssetOutDetailPage
      transaction={transaction}
      onBack={handleBack}
      onUpdateTransaction={handleUpdateTransaction}
      onReload={handleReload}
      isSaving={isSaving}
    />
  );
}
