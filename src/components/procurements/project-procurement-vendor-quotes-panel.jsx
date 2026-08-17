import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { RiArrowDownSLine, RiArrowUpSLine, RiLoader4Line } from 'react-icons/ri';

import { getPackageVendorQuotes } from '@/api/projectProcurements';
import { useProjectProcurementVendorQuotesColumnConfig } from '@/components/procurements/project-procurement-vendor-quotes-column-config';
import ProjectProcurementVendorQuotesDocuments from '@/components/procurements/project-procurement-vendor-quotes-documents';
import ProjectProcurementVendorQuotesTable from '@/components/procurements/project-procurement-vendor-quotes-table';
import ProjectProcurementVendorQuotesToolbar from '@/components/procurements/project-procurement-vendor-quotes-toolbar';
import { formatProcurementAmount } from '@/components/procurements/project-procurements-utils';
import BoqListEmptyState from '@/components/boq/shared/boq-list-empty-state';
import { cn } from '@/utils/cn';

const VendorVersionBadge = memo(({ label, amount }) => (
  <span className='inline-flex shrink-0 items-center gap-1 rounded border border-stroke-soft-200 bg-bg-weak-100 px-[7px] py-[5px]'>
    <span className='text-[9px] font-bold uppercase leading-none tracking-[0.72px] text-text-soft-400'>
      {label}
    </span>
    <span className='text-[12px] font-bold leading-none text-text-sub-500'>
      {formatProcurementAmount(amount)}
    </span>
  </span>
));

VendorVersionBadge.displayName = 'VendorVersionBadge';

const VendorQuotesAccordionItem = memo(
  ({ vendor, isExpanded, onToggle, columnConfig, searchValue, onSearchChange }) => (
    <div className='border-b border-stroke-soft-200'>
      <button
        type='button'
        onClick={onToggle}
        aria-expanded={isExpanded}
        className={cn(
          'flex w-full items-center gap-2.5 px-8 py-2.5 text-left transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-base',
          'bg-[rgba(226,228,233,0.1)] hover:bg-bg-weak-50',
        )}
      >
        <span className='truncate text-[12px] font-semibold uppercase leading-normal tracking-[0.56px] text-text-sub-500'>
          {vendor.name}
        </span>
        {isExpanded ? (
          <RiArrowUpSLine className='size-5 shrink-0 text-text-sub-500' aria-hidden />
        ) : (
          <RiArrowDownSLine className='size-5 shrink-0 text-text-sub-500' aria-hidden />
        )}
        <span className='ml-auto flex shrink-0 items-center gap-1.5'>
          {vendor.versions.map((version) => (
            <VendorVersionBadge
              key={version.id}
              label={version.label}
              amount={version.totalAmount}
            />
          ))}
        </span>
      </button>

      {isExpanded ? (
        <div className='bg-bg-white-0'>
          <div className='px-8 pb-5 pt-4'>
            <ProjectProcurementVendorQuotesToolbar
              searchValue={searchValue}
              onSearchChange={onSearchChange}
              columnConfig={columnConfig}
            />
            <div className='pt-4'>
              <ProjectProcurementVendorQuotesTable
                searchQuery={searchValue}
                columnConfig={columnConfig}
                versions={vendor.versions}
                categories={vendor.categories}
              />
            </div>
          </div>
          <ProjectProcurementVendorQuotesDocuments documents={vendor.documents} />
        </div>
      ) : null}
    </div>
  ),
);

VendorQuotesAccordionItem.displayName = 'VendorQuotesAccordionItem';

const VendorQuotesLoadingState = memo(() => (
  <div className='flex min-h-[240px] flex-1 flex-col items-center justify-center gap-2 text-text-soft-400'>
    <RiLoader4Line className='size-6 animate-spin' aria-hidden />
    <span className='text-paragraph-sm'>Loading vendor quotes…</span>
  </div>
));

VendorQuotesLoadingState.displayName = 'VendorQuotesLoadingState';

const VendorQuotesErrorState = memo(({ message, onRetry }) => (
  <div className='flex min-h-[240px] flex-1 flex-col items-center justify-center gap-3 text-center'>
    <span className='text-paragraph-sm text-error-base'>
      {message || 'Failed to load vendor quotes.'}
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

VendorQuotesErrorState.displayName = 'VendorQuotesErrorState';

const ProjectProcurementVendorQuotesPanel = memo(({ packageRow }) => {
  const columnConfigHook = useProjectProcurementVendorQuotesColumnConfig();
  const packageName = packageRow?.name;

  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(packageName));
  const [loadError, setLoadError] = useState(null);
  const [expandedVendorIds, setExpandedVendorIds] = useState(() => new Set());
  const [searchByVendor, setSearchByVendor] = useState({});

  // Monotonic request id so a slow response can never overwrite a newer one.
  const requestIdRef = useRef(0);

  const loadVendors = useCallback(async () => {
    if (!packageName) {
      setVendors([]);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setLoadError(null);

    try {
      const data = await getPackageVendorQuotes(packageName);
      if (requestIdRef.current !== requestId) return;
      const nextVendors = data.vendors;
      setVendors(nextVendors);
      // Expand the first vendor by default so its breakdown is visible.
      setExpandedVendorIds(new Set([nextVendors[0]?.id].filter(Boolean)));
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setLoadError(error);
      setVendors([]);
    } finally {
      if (requestIdRef.current === requestId) setIsLoading(false);
    }
  }, [packageName]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const handleToggleVendor = useCallback((vendorId) => {
    setExpandedVendorIds((previous) => {
      const next = new Set(previous);
      if (next.has(vendorId)) next.delete(vendorId);
      else next.add(vendorId);
      return next;
    });
  }, []);

  const handleSearchChange = useCallback((vendorId, value) => {
    setSearchByVendor((previous) => ({ ...previous, [vendorId]: value }));
  }, []);

  if (isLoading) {
    return <VendorQuotesLoadingState />;
  }

  if (loadError) {
    return <VendorQuotesErrorState message={loadError?.message} onRetry={loadVendors} />;
  }

  if (vendors.length === 0) {
    return (
      <BoqListEmptyState
        embedded
        title='No vendor quotes yet'
        description='Vendors that submit a quotation for this package will appear here.'
      />
    );
  }

  return (
    <div className='-mx-8 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain border-t border-stroke-soft-200'>
      {vendors.map((vendor) => (
        <VendorQuotesAccordionItem
          key={vendor.id}
          vendor={vendor}
          isExpanded={expandedVendorIds.has(vendor.id)}
          onToggle={() => handleToggleVendor(vendor.id)}
          columnConfig={columnConfigHook}
          searchValue={searchByVendor[vendor.id] ?? ''}
          onSearchChange={(value) => handleSearchChange(vendor.id, value)}
        />
      ))}
    </div>
  );
});

ProjectProcurementVendorQuotesPanel.displayName = 'ProjectProcurementVendorQuotesPanel';

export default ProjectProcurementVendorQuotesPanel;
