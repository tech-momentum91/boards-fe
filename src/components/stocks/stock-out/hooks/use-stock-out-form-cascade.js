import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { stockOutIsTransferMode } from '@/components/stocks/stock-out/api';
import { fetchStockOutItems, fetchStockOutOptions } from '@/redux/stocksSlice';
import { showErrorToast } from '@/utils/error-utils';

/**
 * API cascade for the create stock-out modal:
 * Manual: centers → departments → issued-by → category → line items.
 * Transfer: centers → destination centers → line items (all stock at source).
 */
export function useStockOutFormCascade() {
  const dispatch = useDispatch();

  const loadInitialCenters = useCallback(async () => {
    try {
      const payload = await dispatch(fetchStockOutOptions({})).unwrap();
      return payload;
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to load centers.' });
      return null;
    }
  }, [dispatch]);

  const loadOptionsForCenter = useCallback(
    async (centerId, issueMode = '') => {
      if (!centerId) return null;
      try {
        return await dispatch(fetchStockOutOptions({ center: centerId, issueMode })).unwrap();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to load options for this center.' });
        return null;
      }
    },
    [dispatch],
  );

  const loadOptionsForDepartment = useCallback(
    async (centerId, department) => {
      if (!centerId || !department) return null;
      try {
        return await dispatch(fetchStockOutOptions({ center: centerId, department })).unwrap();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to load options for this department.' });
        return null;
      }
    },
    [dispatch],
  );

  const loadLineItems = useCallback(
    async (centerId, category, issueMode = '') => {
      if (!centerId) return [];
      const isTransfer = stockOutIsTransferMode(issueMode);
      if (!isTransfer && !category) return [];
      try {
        const payload = await dispatch(
          fetchStockOutItems({ center: centerId, category, issueMode }),
        ).unwrap();
        return payload.items?.length ? payload.items : [];
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to load line items.' });
        return [];
      }
    },
    [dispatch],
  );

  return {
    loadInitialCenters,
    loadOptionsForCenter,
    loadOptionsForDepartment,
    loadLineItems,
  };
}
