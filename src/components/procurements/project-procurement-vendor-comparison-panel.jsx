import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCloseLine,
  RiLoader4Line,
} from 'react-icons/ri';

import {
  createRfqForPackage,
  getPackageVendorComparison,
  rejectPackageVendorQuotation,
  requestPackageVendorResubmission,
} from '@/api/projectProcurements';
import { withVendorComparisonLowestFlag } from '@/components/procurements/constants';
import { useProjectProcurementVendorComparisonColumnConfig } from '@/components/procurements/project-procurement-vendor-comparison-column-config';
import ProjectProcurementRaisePoDrawer from '@/components/procurements/project-procurement-raise-po-drawer';
import ProjectProcurementSendRfqModal from '@/components/procurements/project-procurement-send-rfq-modal';
import ProjectProcurementVendorComparisonSelectionBar from '@/components/procurements/project-procurement-vendor-comparison-selection-bar';
import {
  areVendorComparisonSelectedIdSetsEqual,
  areAllVendorComparisonItemsPoRaised,
  buildVendorComparisonItemCategoryMap,
  canRaisePoForVendorComparisonSelection,
  hasPendingVendorComparisonItems,
} from '@/components/procurements/project-procurement-vendor-comparison-selection-utils';
import ProjectProcurementVendorComparisonTable from '@/components/procurements/project-procurement-vendor-comparison-table';
import ProjectProcurementVendorComparisonToolbar from '@/components/procurements/project-procurement-vendor-comparison-toolbar';
import { VENDOR_COMPARISON_ACTIONS } from '@/components/procurements/project-procurement-vendor-comparison-vendor-actions-menu';
import { formatProcurementAmount } from '@/components/procurements/project-procurements-utils';
import * as CompactButton from '@/components/ui/compact-button';
import { cn } from '@/utils/cn';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const VendorComparisonVarianceBadge = memo(({ direction, percent }) => {
  const isFavorable = direction === 'down';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full py-0.5 pl-2 pr-1',
        isFavorable ? 'bg-[#cbf5e5] text-[#176448]' : 'bg-[#f8c9d2] text-[#710e21]',
      )}
    >
      <span className='text-[11px] font-medium uppercase leading-3 tracking-[0.22px]'>
        {percent}%
      </span>
      {isFavorable ? (
        <RiArrowDownSLine className='size-3 shrink-0' aria-hidden />
      ) : (
        <RiArrowUpSLine className='size-3 shrink-0' aria-hidden />
      )}
    </span>
  );
});

VendorComparisonVarianceBadge.displayName = 'VendorComparisonVarianceBadge';

const VendorComparisonQuotePendingBadge = memo(() => (
  <span className='inline-flex w-fit items-center rounded-full bg-[#fbdfb1] px-2 py-0.5 text-[11px] font-medium uppercase leading-3 tracking-[0.22px] text-[#693d11]'>
    Quote Pending
  </span>
));

VendorComparisonQuotePendingBadge.displayName = 'VendorComparisonQuotePendingBadge';

const VendorComparisonRemoveButton = memo(({ vendorName, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    className={cn(
      'absolute right-1.5 top-1.5 inline-flex size-[18px] items-center justify-center rounded',
      'text-text-sub-500 transition-colors hover:bg-bg-weak-100 hover:text-text-main-900',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-offset-1',
    )}
    aria-label={`Remove ${vendorName} from comparison`}
  >
    <RiCloseLine className='size-[18px]' aria-hidden />
  </button>
));

VendorComparisonRemoveButton.displayName = 'VendorComparisonRemoveButton';

const VendorComparisonCard = memo(({ vendor, isHighlighted, onRemove }) => {
  const isQuotePending = vendor.quoteStatus === 'quote-pending';

  return (
    <div
      className={cn(
        'relative flex w-[200px] min-w-[200px] shrink-0 flex-col items-start justify-center rounded-lg border border-solid px-3 pb-1 pt-2',
        isHighlighted
          ? 'border-primary-light bg-primary-lighter shadow-[0px_1px_1px_rgba(228,229,231,0.24)]'
          : 'border-[rgba(226,228,233,0.8)] bg-[rgba(246,248,250,0.6)] shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]',
      )}
    >
      {isQuotePending ? (
        <VendorComparisonRemoveButton
          vendorName={vendor.name}
          onClick={() => onRemove?.(vendor.id)}
        />
      ) : null}
      <span
        className={cn(
          'truncate text-label-sm font-medium',
          isQuotePending ? 'pr-6 text-[#344054]' : 'text-[#525866]',
        )}
      >
        {vendor.name}
      </span>
      {isQuotePending ? (
        <span className='mt-0.5'>
          <VendorComparisonQuotePendingBadge />
        </span>
      ) : (
        <span className='mt-0 flex items-center gap-2'>
          <span className='text-[20px] font-semibold leading-[30px] tracking-normal text-[#344054]'>
            {formatProcurementAmount(vendor.quoteAmount)}
          </span>
          <VendorComparisonVarianceBadge
            direction={vendor.varianceDirection}
            percent={vendor.variancePercent}
          />
        </span>
      )}
    </div>
  );
});

VendorComparisonCard.displayName = 'VendorComparisonCard';

const VendorComparisonAddVendorCard = memo(({ onClick }) => (
  <button
    type='button'
    onClick={onClick}
    className={cn(
      'sticky right-0 z-10 flex w-[140px] min-w-[140px] shrink-0 items-center justify-center gap-[7px] self-stretch rounded-lg border border-dashed border-[#cdd0d5] bg-bg-white-0 px-3 py-1',
      'shadow-[-4px_0_8px_-4px_rgba(16,24,40,0.08),0px_1px_2px_0px_rgba(228,229,231,0.24)] transition-colors hover:bg-bg-weak-50',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-offset-1',
    )}
  >
    <CompactButton.Root variant='stroke' size='medium' className='pointer-events-none size-6 p-0.5'>
      <CompactButton.Icon as={RiAddLine} className='size-5' />
    </CompactButton.Root>
    <span className='text-label-sm font-semibold text-text-soft-400'>Add Vendor</span>
  </button>
));

VendorComparisonAddVendorCard.displayName = 'VendorComparisonAddVendorCard';

const EMPTY_COMPARISON = { vendors: [], categories: [], internalTotal: 0 };

const VendorComparisonLoadingState = memo(() => (
  <div className='flex min-h-[240px] flex-1 flex-col items-center justify-center gap-2 text-text-soft-400'>
    <RiLoader4Line className='size-6 animate-spin' aria-hidden />
    <span className='text-paragraph-sm'>Loading vendor comparison…</span>
  </div>
));

VendorComparisonLoadingState.displayName = 'VendorComparisonLoadingState';

const VendorComparisonErrorState = memo(({ message, onRetry }) => (
  <div className='flex min-h-[240px] flex-1 flex-col items-center justify-center gap-3 text-center'>
    <span className='text-paragraph-sm text-error-base'>
      {message || 'Failed to load the vendor comparison.'}
    </span>
    <button
      type='button'
      onClick={onRetry}
      className='rounded-lg border border-stroke-soft-200 px-3 py-1.5 text-label-sm font-medium text-text-sub-500 transition-colors hover:bg-bg-weak-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-offset-1'
    >
      Retry
    </button>
  </div>
));

VendorComparisonErrorState.displayName = 'VendorComparisonErrorState';

const ProjectProcurementVendorComparisonPanel = memo(({ packageRow, onAddVendor, onReload }) => {
  const columnConfigHook = useProjectProcurementVendorComparisonColumnConfig();
  const [productSearch, setProductSearch] = useState('');
  const [isSendRfqOpen, setIsSendRfqOpen] = useState(false);
  const [isSendingRfq, setIsSendingRfq] = useState(false);
  const [isRaisePoOpen, setIsRaisePoOpen] = useState(false);
  const [raisePoDefaultVendorId, setRaisePoDefaultVendorId] = useState('');
  const packageName = packageRow?.name;

  const [comparison, setComparison] = useState(EMPTY_COMPARISON);
  const [isLoading, setIsLoading] = useState(Boolean(packageName));
  const [loadError, setLoadError] = useState(null);
  const [hiddenVendorIds, setHiddenVendorIds] = useState(() => new Set());
  const [selectedItemIds, setSelectedItemIds] = useState(() => new Set());
  const [vendorActionsById, setVendorActionsById] = useState({});
  const [resubmittingVendorId, setResubmittingVendorId] = useState(null);
  const [rejectingVendorId, setRejectingVendorId] = useState(null);

  // Monotonic request id so a slow response can never overwrite a newer one.
  const requestIdRef = useRef(0);

  const loadComparison = useCallback(async () => {
    if (!packageName) {
      setComparison(EMPTY_COMPARISON);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setLoadError(null);

    try {
      const data = await getPackageVendorComparison(packageName);
      if (requestIdRef.current !== requestId) return;
      setComparison(data);
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setLoadError(error);
      setComparison(EMPTY_COMPARISON);
    } finally {
      if (requestIdRef.current === requestId) setIsLoading(false);
    }
  }, [packageName]);

  useEffect(() => {
    loadComparison();
  }, [loadComparison]);

  const categories = comparison.categories;
  const itemCategoryMap = useMemo(
    () => buildVendorComparisonItemCategoryMap(categories),
    [categories],
  );

  const activeVendors = useMemo(
    () =>
      withVendorComparisonLowestFlag(
        comparison.vendors.filter((vendor) => !hiddenVendorIds.has(vendor.id)),
      ),
    [comparison.vendors, hiddenVendorIds],
  );

  const selectedCount = selectedItemIds.size;
  const canRaisePo = useMemo(
    () => canRaisePoForVendorComparisonSelection(selectedItemIds, itemCategoryMap),
    [itemCategoryMap, selectedItemIds],
  );
  const hideRaisePo = useMemo(() => areAllVendorComparisonItemsPoRaised(categories), [categories]);
  const hideReject = useMemo(() => !hasPendingVendorComparisonItems(categories), [categories]);
  const hideResubmission = hideReject;

  const handleSelectedItemIdsChange = useCallback((next) => {
    setSelectedItemIds((previous) =>
      areVendorComparisonSelectedIdSetsEqual(previous, next) ? previous : next,
    );
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedItemIds(new Set());
  }, []);

  const handleRaisePo = useCallback(() => {
    if (!canRaisePo) return;
    setRaisePoDefaultVendorId('');
    setIsRaisePoOpen(true);
  }, [canRaisePo]);

  const handleRaisePoOpenChange = useCallback((open) => {
    setIsRaisePoOpen(open);
    if (!open) {
      setRaisePoDefaultVendorId('');
    }
  }, []);

  const handleRemoveVendor = useCallback((vendorId) => {
    setHiddenVendorIds((previous) => {
      const next = new Set(previous);
      next.add(vendorId);
      return next;
    });
  }, []);

  const handleVendorActionSelect = useCallback(
    async (vendorId, actionId) => {
      if (actionId === VENDOR_COMPARISON_ACTIONS.RAISE_PO) {
        if (hideRaisePo) return;
        const vendor =
          activeVendors.find((entry) => entry.id === vendorId) ??
          comparison.vendors.find((entry) => entry.id === vendorId);
        if (vendor?.quoteStatus === 'quote-rejected' || vendor?.quoteStatus === 'resubmission') {
          return;
        }
        setVendorActionsById((previous) => ({
          ...previous,
          [vendorId]: actionId,
        }));
        setRaisePoDefaultVendorId(vendorId);
        setIsRaisePoOpen(true);
        return;
      }

      if (actionId === VENDOR_COMPARISON_ACTIONS.REJECT) {
        if (hideReject) return;
        if (!packageName) {
          showErrorToast(new Error('No package selected to reject the quotation.'));
          return;
        }
        if (rejectingVendorId || resubmittingVendorId) return;

        setVendorActionsById((previous) => ({
          ...previous,
          [vendorId]: actionId,
        }));
        setRejectingVendorId(vendorId);
        try {
          await rejectPackageVendorQuotation({ packageName, vendorId });
          showSuccessToast('Vendor quotation rejected.');
          await loadComparison();
        } catch (error) {
          setVendorActionsById((previous) => {
            const next = { ...previous };
            delete next[vendorId];
            return next;
          });
          showErrorToast(error, { defaultMessage: 'Failed to reject vendor quotation.' });
        } finally {
          setRejectingVendorId(null);
        }
        return;
      }

      setVendorActionsById((previous) => ({
        ...previous,
        [vendorId]: actionId,
      }));

      if (actionId !== VENDOR_COMPARISON_ACTIONS.RE_SUBMISSION) {
        return;
      }

      if (hideResubmission) {
        return;
      }

      if (!packageName) {
        showErrorToast(new Error('No package selected to request resubmission.'));
        return;
      }

      if (resubmittingVendorId || rejectingVendorId) {
        return;
      }

      setResubmittingVendorId(vendorId);
      try {
        await requestPackageVendorResubmission({ packageName, vendorId });
        showSuccessToast('Resubmission requested. A new quotation revision has been created.');
        await loadComparison();
        setVendorActionsById((previous) => {
          const next = { ...previous };
          delete next[vendorId];
          return next;
        });
      } catch (error) {
        setVendorActionsById((previous) => {
          const next = { ...previous };
          delete next[vendorId];
          return next;
        });
        showErrorToast(error, { defaultMessage: 'Failed to request resubmission.' });
      } finally {
        setResubmittingVendorId(null);
      }
    },
    [
      activeVendors,
      comparison.vendors,
      hideRaisePo,
      hideReject,
      hideResubmission,
      loadComparison,
      packageName,
      rejectingVendorId,
      resubmittingVendorId,
    ],
  );

  const handleOpenAddVendor = useCallback(() => {
    setIsSendRfqOpen(true);
    onAddVendor?.();
  }, [onAddVendor]);

  const handleSendRfq = useCallback(
    async ({ vendors = [], submissionEndDate } = {}) => {
      const validVendors = vendors.filter((vendor) => vendor?.vendorId);
      if (validVendors.length === 0) {
        showErrorToast(new Error('Select at least one vendor to send the RFQ.'));
        throw new Error('Select at least one vendor to send the RFQ.');
      }
      if (!packageName) {
        showErrorToast(new Error('No package selected to send the RFQ.'));
        throw new Error('No package selected to send the RFQ.');
      }

      setIsSendingRfq(true);
      try {
        const result = await createRfqForPackage({
          packageName,
          vendorIds: validVendors.map((vendor) => vendor.vendorId),
          submissionEndDate,
        });

        // Un-hide any of these vendors that were previously removed from the view.
        setHiddenVendorIds((previous) => {
          if (previous.size === 0) return previous;
          const next = new Set(previous);
          for (const { vendorId } of validVendors) next.delete(vendorId);
          return next.size === previous.size ? previous : next;
        });

        showSuccessToast(result?.message || 'RFQ created successfully.');
        await loadComparison();
        await onReload?.();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to create RFQ.' });
        throw error;
      } finally {
        setIsSendingRfq(false);
      }
    },
    [loadComparison, onReload, packageName],
  );

  return (
    <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
      <div className='flex w-full min-w-0 shrink-0 items-stretch gap-3 overflow-x-auto overscroll-x-contain'>
        {activeVendors.map((vendor) => (
          <VendorComparisonCard
            key={vendor.id}
            vendor={vendor}
            isHighlighted={vendor.isLowest}
            onRemove={handleRemoveVendor}
          />
        ))}
        <VendorComparisonAddVendorCard onClick={handleOpenAddVendor} />
      </div>

      <div className='shrink-0 pt-5'>
        <ProjectProcurementVendorComparisonToolbar
          searchValue={productSearch}
          onSearchChange={setProductSearch}
          columnConfig={columnConfigHook}
        />
      </div>

      <div className='relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-5'>
        {isLoading ? (
          <VendorComparisonLoadingState />
        ) : loadError ? (
          <VendorComparisonErrorState message={loadError?.message} onRetry={loadComparison} />
        ) : (
          <>
            <ProjectProcurementVendorComparisonTable
              searchQuery={productSearch}
              columnConfig={columnConfigHook}
              vendors={activeVendors}
              categories={categories}
              selectedItemIds={selectedItemIds}
              onSelectedItemIdsChange={handleSelectedItemIdsChange}
              hasSelectionBar={selectedCount > 0}
              vendorActionsById={vendorActionsById}
              onVendorActionSelect={handleVendorActionSelect}
              hideRaisePo={hideRaisePo}
              hideReject={hideReject}
              hideResubmission={hideResubmission}
            />

            {selectedCount > 0 ? (
              <div className='pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center px-8'>
                <ProjectProcurementVendorComparisonSelectionBar
                  className='pointer-events-auto'
                  selectedCount={selectedCount}
                  canRaisePo={canRaisePo}
                  onClearSelection={handleClearSelection}
                  onRaisePo={handleRaisePo}
                />
              </div>
            ) : null}
          </>
        )}
      </div>

      <ProjectProcurementSendRfqModal
        open={isSendRfqOpen}
        onOpenChange={setIsSendRfqOpen}
        onSend={handleSendRfq}
        isSending={isSendingRfq}
      />

      <ProjectProcurementRaisePoDrawer
        open={isRaisePoOpen}
        onOpenChange={handleRaisePoOpenChange}
        packageData={packageRow}
        comparisonCategories={categories}
        comparisonSelectedItemIds={selectedItemIds}
        itemCount={selectedCount}
        projectName={packageRow?.projectName ?? packageRow?.project}
        defaultVendorId={raisePoDefaultVendorId}
      />
    </div>
  );
});

ProjectProcurementVendorComparisonPanel.displayName = 'ProjectProcurementVendorComparisonPanel';

export default ProjectProcurementVendorComparisonPanel;
