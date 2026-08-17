import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { RiAddLine, RiArrowDownSLine, RiCloseLine } from 'react-icons/ri';

import { normalizeBoqTemplateProductRow } from '@/api/boqProductPayload';
import {
  createRfqForPackage,
  fetchProjectProcurementPackageDetail,
} from '@/api/projectProcurements';
import { BOQ_PRODUCT_COLUMN_CONFIG_SOURCES } from '@/components/boq/boq-templates/components/boq-template-products-column-config';
import BoqTemplateProductsListing, {
  BOQ_PRODUCT_LISTING_VIEW_MODES,
} from '@/components/boq/boq-templates/components/boq-template-products-listing';
import {
  cloneBoqTemplateProductFilters,
  filterBoqTemplateProducts,
} from '@/components/boq/boq-helper';
import {
  DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS,
  PROJECT_BOQ_PRICE_VIEW,
} from '@/components/boq/constants';
import ProjectBoqProductsToolbar from '@/components/boq/project-boqs/components/project-boq-products-toolbar';
import BoqListEmptyState from '@/components/boq/shared/boq-list-empty-state';
import { PROJECT_PROCUREMENT_PACKAGE_STATUS_META } from '@/components/procurements/constants';
import { useProjectProcurementPackageItemsColumnConfig } from '@/components/procurements/project-procurement-package-items-column-config';
import ProjectProcurementPackageItemsSelectionBar from '@/components/procurements/project-procurement-package-items-selection-bar';
import ProjectProcurementRaisePoDrawer from '@/components/procurements/project-procurement-raise-po-drawer';
import ProjectProcurementSendRfqModal from '@/components/procurements/project-procurement-send-rfq-modal';
import ProjectProcurementVendorComparisonPanel from '@/components/procurements/project-procurement-vendor-comparison-panel';
import ProjectProcurementVendorQuotesPanel from '@/components/procurements/project-procurement-vendor-quotes-panel';
import { getPurchaseBoqSelectedCategoryKeys } from '@/components/procurements/project-procurement-purchase-boq-selection-utils';
import { formatProcurementAmount } from '@/components/procurements/project-procurements-utils';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const areSelectedIdSetsEqual = (left, right) => {
  if (left.size !== right.size) return false;
  for (const id of left) {
    if (!right.has(id)) return false;
  }
  return true;
};

export const PROJECT_PROCUREMENT_PACKAGE_DETAIL_TAB_IDS = {
  ITEMS: 'items',
  VENDOR_QUOTES: 'vendor-quotes',
  VENDOR_COMPARISON: 'vendor-comparison',
  DOCUMENTS: 'documents',
  ACTIVITY: 'activity',
};

const PACKAGE_DETAIL_TABS = [
  { id: PROJECT_PROCUREMENT_PACKAGE_DETAIL_TAB_IDS.ITEMS, label: 'Items' },
  { id: PROJECT_PROCUREMENT_PACKAGE_DETAIL_TAB_IDS.VENDOR_QUOTES, label: 'Vendor Quotes' },
  {
    id: PROJECT_PROCUREMENT_PACKAGE_DETAIL_TAB_IDS.VENDOR_COMPARISON,
    label: 'Vendor Comparison',
  },
  { id: PROJECT_PROCUREMENT_PACKAGE_DETAIL_TAB_IDS.DOCUMENTS, label: 'Documents' },
  { id: PROJECT_PROCUREMENT_PACKAGE_DETAIL_TAB_IDS.ACTIVITY, label: 'Activity' },
];

const PackageDetailHeader = memo(({ packageData, onClose }) => {
  const statusMeta = PROJECT_PROCUREMENT_PACKAGE_STATUS_META[packageData?.status];
  const metaParts = [packageData?.code, formatProcurementAmount(packageData?.packageValue)].filter(
    Boolean,
  );

  return (
    <div className='flex shrink-0 items-start justify-between gap-4'>
      <div className='flex min-w-0 flex-col gap-1'>
        <div className='flex min-w-0 flex-wrap items-center gap-1.5'>
          <h2 className='truncate text-label-lg font-medium tracking-[-0.45px] text-[#0a0a0a]'>
            {packageData?.package_name}
          </h2>
          {statusMeta ? (
            <Badge.Root
              size='medium'
              variant='light'
              color={statusMeta.color}
              className='uppercase'
            >
              {statusMeta.label}
            </Badge.Root>
          ) : null}
        </div>
        <p className='text-[12px] font-medium leading-4 text-[#737373]'>{metaParts.join(' · ')}</p>
      </div>

      <div className='flex shrink-0 items-center gap-2'>
        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='xsmall'
          className='hidden h-8 gap-0.5 px-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)] opacity-0'
          aria-hidden
          tabIndex={-1}
        >
          <Button.Icon as={RiAddLine} />
          <span className='px-1'>Add BOQ</span>
          <Button.Icon as={RiArrowDownSLine} />
        </Button.Root>
        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='xsmall'
          className='size-8 shrink-0 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
          aria-label='Close package detail'
          onClick={onClose}
        >
          <Button.Icon as={RiCloseLine} />
        </Button.Root>
      </div>
    </div>
  );
});

PackageDetailHeader.displayName = 'PackageDetailHeader';

const PackageDetailSubTabs = memo(({ value, onValueChange }) => (
  <div className='relative -mx-8 shrink-0 border-y border-stroke-soft-200'>
    <div className='absolute inset-0 bg-[#e8e9ed] opacity-30' aria-hidden />
    <div
      className='relative flex min-w-0 flex-wrap items-center gap-1.5 px-8 py-3.5'
      role='tablist'
      aria-label='Package detail sections'
    >
      {PACKAGE_DETAIL_TABS.map((tab) => {
        const isActive = value === tab.id;
        return (
          <button
            key={tab.id}
            type='button'
            role='tab'
            aria-selected={isActive}
            onClick={() => onValueChange?.(tab.id)}
            className={cn(
              'inline-flex h-7 shrink-0 items-center rounded-md border border-solid px-3 py-1 text-label-sm font-medium text-[#344054] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-offset-1',
              isActive
                ? 'border-[rgba(71,84,103,0.5)] bg-bg-white-0'
                : 'border-[#eaecf0] bg-bg-white-0 hover:bg-bg-weak-50',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  </div>
));

PackageDetailSubTabs.displayName = 'PackageDetailSubTabs';

function PackageDetailPlaceholder({ label }) {
  return (
    <div className='flex min-h-[280px] flex-1 items-center justify-center rounded-xl border border-dashed border-stroke-soft-200'>
      <p className='text-paragraph-sm text-text-soft-400'>{label} coming soon.</p>
    </div>
  );
}

function PackageDetailItemsPanel({ packageData, isLoading, onReload }) {
  const columnConfigHook = useProjectProcurementPackageItemsColumnConfig();
  const [productSearch, setProductSearch] = useState('');
  const [appliedProductFilters, setAppliedProductFilters] = useState(() =>
    cloneBoqTemplateProductFilters(DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS),
  );
  const [allDescriptionsExpanded, setAllDescriptionsExpanded] = useState(false);
  const [packageProducts, setPackageProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState(() => new Set());
  const [isSendRfqOpen, setIsSendRfqOpen] = useState(false);
  const [isSendingRfq, setIsSendingRfq] = useState(false);
  const [isRaisePoOpen, setIsRaisePoOpen] = useState(false);
  const packageName = packageData?.name;

  // Update items when package data changes
  useEffect(() => {
    if (Array.isArray(packageData?.items)) {
      setPackageProducts(packageData.items.map((item) => normalizeBoqTemplateProductRow(item)));
    } else {
      setPackageProducts([]);
    }
    setSelectedProductIds(new Set());
    setIsSendRfqOpen(false);
    setIsRaisePoOpen(false);
  }, [packageData]);

  const filteredProducts = useMemo(
    () =>
      filterBoqTemplateProducts(packageProducts, {
        searchQuery: productSearch,
        filters: appliedProductFilters,
      }),
    [appliedProductFilters, packageProducts, productSearch],
  );

  const visibleProductIds = useMemo(
    () => filteredProducts.map((product) => product.id),
    [filteredProducts],
  );

  const selectedCount = useMemo(() => {
    let count = 0;
    for (const id of selectedProductIds) {
      if (visibleProductIds.includes(id)) count += 1;
    }
    return count;
  }, [selectedProductIds, visibleProductIds]);

  useEffect(() => {
    setSelectedProductIds((previous) => {
      const visibleSet = new Set(visibleProductIds);
      const next = new Set([...previous].filter((id) => visibleSet.has(id)));
      return areSelectedIdSetsEqual(previous, next) ? previous : next;
    });
  }, [visibleProductIds]);

  const handleProductFiltersChange = useCallback((nextFilters) => {
    setAppliedProductFilters(cloneBoqTemplateProductFilters(nextFilters));
  }, []);

  const handleSelectedProductIdsChange = useCallback((next) => {
    setSelectedProductIds((previous) => (areSelectedIdSetsEqual(previous, next) ? previous : next));
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedProductIds(new Set());
  }, []);

  const handleOpenSendRfq = useCallback(() => {
    setIsSendRfqOpen(true);
  }, []);

  const handleSendRfq = useCallback(
    async ({ vendors = [], submissionEndDate } = {}) => {
      if (!packageName) {
        showErrorToast(new Error('No package selected to send the RFQ.'));
        throw new Error('No package selected to send the RFQ.');
      }
      const vendorIds = vendors.map((vendor) => vendor?.vendorId).filter(Boolean);
      if (vendorIds.length === 0) {
        showErrorToast(new Error('Select at least one vendor to send the RFQ.'));
        throw new Error('Select at least one vendor to send the RFQ.');
      }

      setIsSendingRfq(true);
      try {
        const result = await createRfqForPackage({
          packageName,
          vendorIds,
          submissionEndDate,
          itemIds: selectedProductIds.size > 0 ? [...selectedProductIds] : undefined,
        });
        showSuccessToast(result?.message || 'RFQ created successfully.');
        await onReload?.();
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to create RFQ.' });
        throw error;
      } finally {
        setIsSendingRfq(false);
      }
    },
    [onReload, packageName, selectedProductIds],
  );

  const selectedItems = useMemo(() => {
    const visibleSet = new Set(visibleProductIds);
    return filteredProducts.filter(
      (product) => selectedProductIds.has(product.id) && visibleSet.has(product.id),
    );
  }, [filteredProducts, selectedProductIds, visibleProductIds]);

  const handleRaisePo = useCallback(() => {
    const categoryKeys = getPurchaseBoqSelectedCategoryKeys(selectedItems);
    if (categoryKeys.size !== 1 || categoryKeys.has('__uncategorized__')) {
      showErrorToast(null, {
        defaultMessage:
          'Select items from the same third-level purchase category to raise a Purchase Order.',
      });
      return;
    }
    setIsRaisePoOpen(true);
  }, [selectedItems]);

  const handleRemove = useCallback(() => {
    const selectedInView = new Set(
      [...selectedProductIds].filter((id) => visibleProductIds.includes(id)),
    );
    if (selectedInView.size === 0) return;

    setPackageProducts((previous) => previous.filter((product) => !selectedInView.has(product.id)));
    setSelectedProductIds(new Set());
  }, [selectedProductIds, visibleProductIds]);

  if (isLoading) {
    return (
      <div className='flex min-h-[280px] flex-1 items-center justify-center'>
        <p className='text-paragraph-sm text-text-soft-400'>Loading package items…</p>
      </div>
    );
  }

  return (
    <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
      <div className='shrink-0 pb-5'>
        <ProjectBoqProductsToolbar
          searchValue={productSearch}
          onSearchChange={setProductSearch}
          appliedFilters={appliedProductFilters}
          onFiltersChange={handleProductFiltersChange}
          showNewProduct={false}
          showPreview={false}
          showVersionStatus={false}
          showViewMode={false}
          columnConfig={columnConfigHook}
          allDescriptionsExpanded={allDescriptionsExpanded}
          onAllDescriptionsExpandedChange={setAllDescriptionsExpanded}
          showSendRfq
          onSendRfq={handleOpenSendRfq}
        />
      </div>

      <div className='relative min-h-0 flex-1 overflow-hidden'>
        <div className='min-h-0 h-full overflow-y-auto overscroll-contain pb-24'>
          {filteredProducts.length === 0 ? (
            <BoqListEmptyState
              embedded
              title='No items in this package'
              description='Items linked to this package will appear here.'
            />
          ) : (
            <BoqTemplateProductsListing
              products={filteredProducts}
              columnConfig={columnConfigHook.columns}
              allDescriptionsExpanded={allDescriptionsExpanded}
              onAllDescriptionsExpandedChange={setAllDescriptionsExpanded}
              financialSummaryVariant='purchase-boq'
              priceView={PROJECT_BOQ_PRICE_VIEW.INTERNAL}
              readOnly
              viewMode={BOQ_PRODUCT_LISTING_VIEW_MODES.SINGLE}
              useProjectBoqColumns
              usePurchaseBoqSectionStyle
              columnConfigSource={BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.PACKAGE_ITEMS}
              showCategoryHeader={false}
              enableRowSelection
              selectedProductIds={selectedProductIds}
              onSelectedProductIdsChange={handleSelectedProductIdsChange}
              hideSelectionBar
            />
          )}
        </div>

        {selectedCount > 0 ? (
          <div className='pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center px-8'>
            <ProjectProcurementPackageItemsSelectionBar
              className='pointer-events-auto'
              selectedCount={selectedCount}
              onClearSelection={handleClearSelection}
              onSendRfq={handleOpenSendRfq}
              onRaisePo={handleRaisePo}
              onRemove={handleRemove}
            />
          </div>
        ) : null}
      </div>

      <ProjectProcurementSendRfqModal
        open={isSendRfqOpen}
        onOpenChange={setIsSendRfqOpen}
        onSend={handleSendRfq}
        isSending={isSendingRfq}
      />

      <ProjectProcurementRaisePoDrawer
        open={isRaisePoOpen}
        onOpenChange={setIsRaisePoOpen}
        packageData={packageData}
        selectedItems={selectedItems}
        projectName={packageData?.projectName ?? packageData?.project}
        onDraftSaved={onReload}
      />
    </div>
  );
}

function PackageDetailVendorComparisonPanel({ packageRow, onReload }) {
  return <ProjectProcurementVendorComparisonPanel packageRow={packageRow} onReload={onReload} />;
}

export default function ProjectProcurementPackageDetailView({ packageRow, onClose }) {
  const [activeSubTab, setActiveSubTab] = useState(
    PROJECT_PROCUREMENT_PACKAGE_DETAIL_TAB_IDS.ITEMS,
  );
  const [packageData, setPackageData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const packageCode = packageRow?.code;

  const loadPackageDetail = useCallback(
    (signal) => {
      if (!packageCode) {
        setPackageData(null);
        return Promise.resolve();
      }
      setIsLoading(true);
      return fetchProjectProcurementPackageDetail(packageCode)
        .then((data) => {
          if (signal?.cancelled) return;
          setPackageData(data);
        })
        .catch((error) => {
          if (signal?.cancelled) return;
          console.error('Error fetching package detail:', error);
        })
        .finally(() => {
          if (signal?.cancelled) return;
          setIsLoading(false);
        });
    },
    [packageCode],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    loadPackageDetail(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [loadPackageDetail]);

  const handlePackageReload = useCallback(() => loadPackageDetail(), [loadPackageDetail]);

  if (!packageRow) return null;

  return (
    <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
      <div className='shrink-0'>
        <PackageDetailHeader packageData={packageData || packageRow} onClose={onClose} />
      </div>

      <div className='shrink-0 pt-4'>
        <PackageDetailSubTabs value={activeSubTab} onValueChange={setActiveSubTab} />
      </div>

      <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-5'>
        {activeSubTab === PROJECT_PROCUREMENT_PACKAGE_DETAIL_TAB_IDS.ITEMS ? (
          <PackageDetailItemsPanel
            packageData={packageData}
            isLoading={isLoading}
            onReload={handlePackageReload}
          />
        ) : activeSubTab === PROJECT_PROCUREMENT_PACKAGE_DETAIL_TAB_IDS.VENDOR_QUOTES ? (
          <ProjectProcurementVendorQuotesPanel packageRow={packageData || packageRow} />
        ) : activeSubTab === PROJECT_PROCUREMENT_PACKAGE_DETAIL_TAB_IDS.VENDOR_COMPARISON ? (
          <PackageDetailVendorComparisonPanel
            packageRow={packageData || packageRow}
            onReload={handlePackageReload}
          />
        ) : (
          <PackageDetailPlaceholder
            label={PACKAGE_DETAIL_TABS.find((tab) => tab.id === activeSubTab)?.label ?? 'Section'}
          />
        )}
      </div>
    </div>
  );
}
