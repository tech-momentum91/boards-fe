import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchProjectProcurementPackages } from '@/api/projectProcurements';
import ProjectProcurementPackageDetailView from '@/components/procurements/project-procurement-package-detail-view';
import {
  buildPackageCategoryFilterKey,
  getPackageCategoryFilterKeys,
} from '@/components/procurements/project-procurement-package-category-utils';
import { useProjectProcurementPackagesColumnConfig } from '@/components/procurements/project-procurement-packages-column-config';
import ProjectProcurementPackagesTable from '@/components/procurements/project-procurement-packages-table';
import ProjectProcurementPackagesToolbar from '@/components/procurements/project-procurement-packages-toolbar';
import ProjectProcurementSendRfqModal from '@/components/procurements/project-procurement-send-rfq-modal';
import { applyMainCategorySelection } from '@/components/products/product-category-utils';
import { showErrorToast } from '@/utils/error-utils';

export default function ProjectProcurementPackagesTab({
  project,
  selectedPackage = null,
  onSelectPackage,
}) {
  const columnConfig = useProjectProcurementPackagesColumnConfig();
  const [searchValue, setSearchValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categoryFilterOptionId, setCategoryFilterOptionId] = useState('all');
  const [categoryFilterLabel, setCategoryFilterLabel] = useState('All Category');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isSendRfqOpen, setIsSendRfqOpen] = useState(false);
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!project?.id) {
      setPackages([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    fetchProjectProcurementPackages(project.id)
      .then((data) => {
        if (cancelled) return;
        setPackages(data);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [project?.id]);

  const handleCategoryFilterChange = useCallback((optionId, option) => {
    if (optionId === 'all') {
      setCategoryFilter('all');
      setCategoryFilterOptionId('all');
      setCategoryFilterLabel('All Category');
      return;
    }

    const { values, anchorLevel } = applyMainCategorySelection(option);
    const filterKey = buildPackageCategoryFilterKey(values, anchorLevel);
    if (!filterKey) return;
    setCategoryFilter(filterKey);
    setCategoryFilterOptionId(optionId);
    setCategoryFilterLabel(String(option?.title ?? option?.value ?? 'All Category'));
  }, []);

  const filteredPackages = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return packages.filter((pkg) => {
      if (categoryFilter !== 'all' && !getPackageCategoryFilterKeys(pkg).has(categoryFilter)) {
        return false;
      }

      if (statusFilter !== 'all' && pkg.status !== statusFilter) {
        return false;
      }

      if (!query) return true;

      const haystack = [pkg.name, pkg.code, ...(pkg.categories ?? []), pkg.lastUpdated]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [categoryFilter, searchValue, statusFilter, packages]);

  const handleCloseDetail = useCallback(() => {
    onSelectPackage?.(null);
  }, [onSelectPackage]);

  const handleOpenSendRfq = useCallback(() => {
    setIsSendRfqOpen(true);
  }, []);

  // RFQs are created per-package from the package detail view (Items /
  // Vendor Comparison). The list-level toolbar has no package context, so this
  // guards against being invoked without a selected package.
  const handleSendRfq = useCallback(async () => {
    showErrorToast(new Error('Open a package to send an RFQ.'));
    throw new Error('Open a package to send an RFQ.');
  }, []);

  if (selectedPackage) {
    return (
      <ProjectProcurementPackageDetailView
        packageRow={selectedPackage}
        onClose={handleCloseDetail}
      />
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-5 overflow-hidden'>
      <div className='shrink-0'>
        <ProjectProcurementPackagesToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          categoryFilter={categoryFilterOptionId}
          categoryFilterLabel={categoryFilterLabel}
          onCategoryFilterChange={handleCategoryFilterChange}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          columnConfig={columnConfig}
          onSendRfq={handleOpenSendRfq}
        />
      </div>

      <ProjectProcurementPackagesTable
        rows={filteredPackages}
        columnConfig={columnConfig}
        onRowClick={onSelectPackage}
      />

      <ProjectProcurementSendRfqModal
        open={isSendRfqOpen}
        onOpenChange={setIsSendRfqOpen}
        onSend={handleSendRfq}
      />
    </div>
  );
}
