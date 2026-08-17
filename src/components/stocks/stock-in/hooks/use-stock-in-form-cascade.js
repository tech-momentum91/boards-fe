import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  mergeStockInLineItemsWithDraft,
  stockInSourceIsPurchaseOrder,
  stockInSourceIsTransfer,
} from '@/components/stocks/stocks-api-helpers';
import { sanitizeStockInDraftVendors } from '@/components/stocks/stock-in/helpers/shared';
import {
  fetchStockInManualItems,
  fetchStockInOptions,
  fetchStockInPoItems,
  fetchStockInTransferItems,
  fetchVendorRcCenters,
  selectVendorRcCentersState,
} from '@/redux/stocksSlice';
import { showErrorToast } from '@/utils/error-utils';

/**
 * API cascade for the create/edit stock-in modal:
 * Manual: centers → options (vendors / categories) → line items.
 * PO: centers → purchase orders → line items.
 * Transfer: centers → pending transfers → transfer line items.
 */
export function useStockInFormCascade() {
  const dispatch = useDispatch();
  const centersState = useSelector(selectVendorRcCentersState);

  const loadOptionsForCenter = useCallback(
    async (centerId, sourceType, supplierId = '', categoryId = '') => {
      if (!centerId) return null;
      try {
        return await dispatch(
          fetchStockInOptions({
            center: centerId,
            sourceType,
            supplier: supplierId,
            category: categoryId,
          }),
        ).unwrap();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to load options for this center.' });
        return null;
      }
    },
    [dispatch],
  );

  const loadManualLineItems = useCallback(
    async (centerId, supplierId, categoryId, vendorRc = '') => {
      if (!centerId || !supplierId || !categoryId) return null;
      try {
        return await dispatch(
          fetchStockInManualItems({
            center: centerId,
            supplier: supplierId,
            category: categoryId,
            vendorRc: vendorRc || undefined,
          }),
        ).unwrap();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to load line items.' });
        return null;
      }
    },
    [dispatch],
  );

  const loadPoLineItems = useCallback(
    async (purchaseOrderId) => {
      if (!purchaseOrderId) return [];
      try {
        const payload = await dispatch(fetchStockInPoItems(purchaseOrderId)).unwrap();
        return payload.items?.length ? payload.items : [];
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to load purchase order lines.' });
        return [];
      }
    },
    [dispatch],
  );

  const loadTransferLineItems = useCallback(
    async (centerId, outgoingStockEntry) => {
      if (!centerId || !outgoingStockEntry) return null;
      try {
        return await dispatch(
          fetchStockInTransferItems({ center: centerId, outgoingStockEntry }),
        ).unwrap();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to load transfer line items.' });
        return null;
      }
    },
    [dispatch],
  );

  const applyTransferOptions = useCallback((draft, centerOpts) => {
    const pending = Array.isArray(centerOpts?.pendingTransfers) ? centerOpts.pendingTransfers : [];
    if (pending.length === 1) {
      return {
        ...draft,
        outgoingStockEntry: pending[0].value,
        sourceCenter: pending[0].sourceCenter ?? '',
        sourceCenterLabel: pending[0].sourceCenterName ?? pending[0].primaryLabel ?? '',
      };
    }
    return {
      ...draft,
      outgoingStockEntry: '',
      sourceCenter: '',
      sourceCenterLabel: '',
      lineItems: [],
    };
  }, []);

  const resolveTransferCenterSelection = useCallback(
    async (centerId, sourceType, draftBase = {}) => {
      if (!centerId || !stockInSourceIsTransfer(sourceType)) return null;
      const centerOpts = await loadOptionsForCenter(centerId, sourceType);
      if (!centerOpts) return null;
      const withTransfer = applyTransferOptions(
        { ...draftBase, center: centerId, sourceType, lineItems: [] },
        centerOpts,
      );
      if (!withTransfer.outgoingStockEntry) return withTransfer;
      const payload = await loadTransferLineItems(centerId, withTransfer.outgoingStockEntry);
      if (!payload) return withTransfer;
      return {
        ...withTransfer,
        sourceCenter: payload.sourceCenter ?? withTransfer.sourceCenter,
        sourceCenterLabel: payload.sourceCenterName ?? withTransfer.sourceCenterLabel,
        lineItems: payload.items ?? [],
      };
    },
    [loadOptionsForCenter, applyTransferOptions, loadTransferLineItems],
  );

  const loadDraftCascade = useCallback(
    async (draft) => {
      let next = { ...draft };
      if (centersState.status === 'idle') {
        await dispatch(fetchVendorRcCenters()).unwrap();
      }

      if (next.center && stockInSourceIsTransfer(next.sourceType)) {
        try {
          if (next.outgoingStockEntry) {
            const [payload] = await Promise.all([
              loadTransferLineItems(next.center, next.outgoingStockEntry),
              dispatch(
                fetchStockInOptions({ center: next.center, sourceType: next.sourceType }),
              ).unwrap(),
            ]);
            if (payload) {
              return {
                ...next,
                sourceCenter: payload.sourceCenter ?? next.sourceCenter,
                sourceCenterLabel: payload.sourceCenterName ?? next.sourceCenterLabel,
                lineItems: mergeStockInLineItemsWithDraft(payload.items, next.lineItems),
              };
            }
            return next;
          }
          const centerOpts = await dispatch(
            fetchStockInOptions({ center: next.center, sourceType: next.sourceType }),
          ).unwrap();
          next = applyTransferOptions(next, centerOpts);
          if (next.outgoingStockEntry) {
            const payload = await loadTransferLineItems(next.center, next.outgoingStockEntry);
            if (payload) {
              next = {
                ...next,
                sourceCenter: payload.sourceCenter ?? next.sourceCenter,
                sourceCenterLabel: payload.sourceCenterName ?? next.sourceCenterLabel,
                lineItems: mergeStockInLineItemsWithDraft(payload.items, next.lineItems),
              };
            }
          }
        } catch (error) {
          showErrorToast(error, {
            defaultMessage: 'Failed to load transfer options for this center.',
          });
        }
        return next;
      }

      if (next.center) {
        try {
          const centerOpts = await dispatch(
            fetchStockInOptions({
              center: next.center,
              sourceType: next.sourceType,
            }),
          ).unwrap();
          next = sanitizeStockInDraftVendors(next, centerOpts.suppliers);
        } catch (error) {
          showErrorToast(error, {
            defaultMessage: 'Failed to load options for this center.',
          });
          next = sanitizeStockInDraftVendors(next, []);
        }
      }
      if (next.center && next.vendor && !stockInSourceIsPurchaseOrder(next.sourceType)) {
        try {
          await dispatch(
            fetchStockInOptions({
              center: next.center,
              sourceType: next.sourceType,
              supplier: next.vendor,
            }),
          ).unwrap();
        } catch (error) {
          showErrorToast(error, {
            defaultMessage: 'Failed to load categories for this vendor.',
          });
          next = { ...next, category: '' };
        }
      }
      if (
        next.center &&
        next.vendor &&
        next.category &&
        !stockInSourceIsPurchaseOrder(next.sourceType)
      ) {
        try {
          const payload = await dispatch(
            fetchStockInManualItems({
              center: next.center,
              supplier: next.vendor,
              category: next.category,
              vendorRc: next.vendorRc || undefined,
            }),
          ).unwrap();
          let resolvedVendorRc = payload.vendorRc ?? next.vendorRc;
          let resolvedItems = payload.items;

          if (payload.requiresVendorRc && payload.vendorRcOptions.length > 0 && !resolvedVendorRc) {
            if (payload.vendorRcOptions.length === 1) {
              resolvedVendorRc = payload.vendorRcOptions[0].value;
              const withRc = await dispatch(
                fetchStockInManualItems({
                  center: next.center,
                  supplier: next.vendor,
                  category: next.category,
                  vendorRc: resolvedVendorRc,
                }),
              ).unwrap();
              resolvedItems = withRc.items;
              resolvedVendorRc = withRc.vendorRc ?? resolvedVendorRc;
            } else {
              resolvedItems = [];
            }
          }

          return {
            ...next,
            vendorRc: resolvedVendorRc ?? '',
            lineItems: mergeStockInLineItemsWithDraft(resolvedItems, next.lineItems),
          };
        } catch (error) {
          showErrorToast(error, { defaultMessage: 'Failed to load line items.' });
          return { ...next, lineItems: [] };
        }
      }
      if (next.center && next.poReference && stockInSourceIsPurchaseOrder(next.sourceType)) {
        try {
          const items = await loadPoLineItems(next.poReference);
          return {
            ...next,
            lineItems: mergeStockInLineItemsWithDraft(items, next.lineItems),
          };
        } catch (error) {
          showErrorToast(error, { defaultMessage: 'Failed to load purchase order lines.' });
          return { ...next, lineItems: [] };
        }
      }
      return next;
    },
    [dispatch, centersState.status, loadPoLineItems, loadTransferLineItems, applyTransferOptions],
  );

  return {
    loadOptionsForCenter,
    loadManualLineItems,
    loadPoLineItems,
    loadTransferLineItems,
    applyTransferOptions,
    resolveTransferCenterSelection,
    loadDraftCascade,
  };
}
