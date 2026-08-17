import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { normalizeBoqTemplateProductRow } from '@/api/boqProductPayload';
import {
  fetchProjectBoq,
  fetchProjectBoqFamilyByProject,
  fetchProjectBoqProducts,
} from '@/api/projectBoqs';
import BoqTemplateProductsListing, {
  BOQ_PRODUCT_LISTING_VIEW_MODES,
  BoqTemplateProductsListingSkeleton,
} from '@/components/boq/boq-templates/components/boq-template-products-listing';
import { BOQ_PRODUCT_COLUMN_CONFIG_SOURCES } from '@/components/boq/boq-templates/components/boq-template-products-column-config';
import {
  buildProjectBoqFamilyBadgeMembers,
  cloneBoqTemplateProductFilters,
  filterBoqTemplateProducts,
  flattenBoqProductsResponse,
  getDefaultProjectBoqFamilyCode,
  normalizeProjectBoqRow,
} from '@/components/boq/boq-helper';
import {
  DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS,
  PROJECT_BOQ_PRICE_VIEW,
} from '@/components/boq/constants';
import ProjectBoqFamilyBadges from '@/components/boq/project-boqs/components/project-boq-family-badges';
import ProjectBoqProductsToolbar from '@/components/boq/project-boqs/components/project-boq-products-toolbar';
import BoqListEmptyState from '@/components/boq/shared/boq-list-empty-state';
import { useProjectProcurementInternalBoqColumnConfig } from '@/components/procurements/project-procurement-internal-boq-column-config';
import { showErrorToast } from '@/utils/error-utils';

export default function ProjectProcurementInternalBoqTab({ project }) {
  const columnConfigHook = useProjectProcurementInternalBoqColumnConfig();
  const projectId = project?.id || project?.project || '';
  const boqFamily = project?.boq_family || '';

  const [familyChildren, setFamilyChildren] = useState([]);
  const [activeFamilyId, setActiveFamilyId] = useState('');
  const [productViewMode, setProductViewMode] = useState(BOQ_PRODUCT_LISTING_VIEW_MODES.SINGLE);
  const [productSearch, setProductSearch] = useState('');
  const [appliedProductFilters, setAppliedProductFilters] = useState(() =>
    cloneBoqTemplateProductFilters(DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS),
  );
  const [allDescriptionsExpanded, setAllDescriptionsExpanded] = useState(false);
  const [boqProducts, setBoqProducts] = useState([]);
  const [isLoadingFamily, setIsLoadingFamily] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [familyLoadError, setFamilyLoadError] = useState(null);
  const [productsLoadError, setProductsLoadError] = useState(null);

  const isMultiProductView = productViewMode === BOQ_PRODUCT_LISTING_VIEW_MODES.MULTI;

  useEffect(() => {
    if (!projectId && !boqFamily) {
      setFamilyChildren([]);
      setActiveFamilyId('');
      return undefined;
    }

    let cancelled = false;
    setIsLoadingFamily(true);
    setFamilyLoadError(null);

    const loadFamily = async () => {
      if (projectId) {
        const byProject = await fetchProjectBoqFamilyByProject(projectId);
        if (byProject) return byProject;
      }
      if (boqFamily) {
        return fetchProjectBoq(boqFamily);
      }
      return null;
    };

    loadFamily()
      .then((family) => {
        if (cancelled) return;

        const children = (family?.familyMembers || family?.children || []).map(
          normalizeProjectBoqRow,
        );
        setFamilyChildren(children);

        const preferredCode =
          family?.activeBoq ||
          getDefaultProjectBoqFamilyCode(children) ||
          children[0]?.code ||
          children[0]?.id ||
          '';
        setActiveFamilyId(preferredCode);
      })
      .catch((error) => {
        if (cancelled) return;
        setFamilyChildren([]);
        setActiveFamilyId('');
        setFamilyLoadError(error?.message || 'Failed to load internal BOQ family.');
        showErrorToast(error, { defaultMessage: 'Failed to load internal BOQ family.' });
      })
      .finally(() => {
        if (!cancelled) setIsLoadingFamily(false);
      });

    return () => {
      cancelled = true;
    };
  }, [boqFamily, projectId]);

  useEffect(() => {
    if (!activeFamilyId) {
      setBoqProducts([]);
      return undefined;
    }

    let cancelled = false;
    setIsLoadingProducts(true);
    setProductsLoadError(null);

    fetchProjectBoqProducts(activeFamilyId)
      .then((data) => {
        if (cancelled) return;
        setBoqProducts(flattenBoqProductsResponse(data).map(normalizeBoqTemplateProductRow));
      })
      .catch((error) => {
        if (cancelled) return;
        setBoqProducts([]);
        setProductsLoadError(error?.message || 'Failed to load BOQ products.');
        showErrorToast(error, { defaultMessage: 'Failed to load BOQ products.' });
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProducts(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeFamilyId]);

  const familyMembers = useMemo(
    () => buildProjectBoqFamilyBadgeMembers(familyChildren),
    [familyChildren],
  );

  const filteredProducts = useMemo(
    () =>
      filterBoqTemplateProducts(boqProducts, {
        searchQuery: productSearch,
        filters: appliedProductFilters,
      }),
    [appliedProductFilters, boqProducts, productSearch],
  );

  const handleProductFiltersChange = useCallback((nextFilters) => {
    setAppliedProductFilters(cloneBoqTemplateProductFilters(nextFilters));
  }, []);

  const handleFamilySelect = useCallback((member) => {
    const nextId = member?.code || member?.id;
    if (nextId) setActiveFamilyId(nextId);
  }, []);

  const renderProductsListing = () => {
    if (isLoadingFamily || isLoadingProducts) {
      return (
        <div className='min-h-0 flex-1 overflow-auto px-8 pb-10 pt-2'>
          <BoqTemplateProductsListingSkeleton />
        </div>
      );
    }

    if (familyLoadError) {
      return (
        <BoqListEmptyState
          embedded
          title='Failed to load internal BOQ'
          description={familyLoadError}
        />
      );
    }

    if (familyMembers.length === 0) {
      return (
        <BoqListEmptyState
          embedded
          title='No internal BOQ found'
          description='This project does not have any Main, Design, or Additional BOQs yet.'
        />
      );
    }

    if (productsLoadError) {
      return (
        <BoqListEmptyState
          embedded
          title='Failed to load products'
          description={productsLoadError}
        />
      );
    }

    if (filteredProducts.length === 0 && boqProducts.length > 0) {
      return (
        <BoqListEmptyState
          embedded
          title='No products found'
          description='Try adjusting your search or filters.'
        />
      );
    }

    if (filteredProducts.length === 0) {
      return (
        <BoqListEmptyState
          embedded
          title='No products in this BOQ'
          description='Select another BOQ type or add products in Project BOQs.'
        />
      );
    }

    return (
      <BoqTemplateProductsListing
        products={filteredProducts}
        columnConfig={columnConfigHook.columns}
        allDescriptionsExpanded={allDescriptionsExpanded}
        onAllDescriptionsExpandedChange={setAllDescriptionsExpanded}
        financialSummaryVariant='buy-only'
        priceView={PROJECT_BOQ_PRICE_VIEW.INTERNAL}
        readOnly
        viewMode={productViewMode}
        useProjectBoqColumns
        columnConfigSource={BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.INTERNAL_BOQ}
      />
    );
  };

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <ProjectBoqFamilyBadges
        members={familyMembers}
        activeId={activeFamilyId}
        onSelect={handleFamilySelect}
      />

      <div className='shrink-0 pb-5 pt-6'>
        <ProjectBoqProductsToolbar
          searchValue={productSearch}
          onSearchChange={setProductSearch}
          appliedFilters={appliedProductFilters}
          onFiltersChange={handleProductFiltersChange}
          showNewProduct={false}
          showPreview={false}
          showVersionStatus={false}
          showViewMode
          viewMode={productViewMode}
          onViewModeChange={setProductViewMode}
          columnConfig={columnConfigHook}
          allDescriptionsExpanded={allDescriptionsExpanded}
          onAllDescriptionsExpandedChange={setAllDescriptionsExpanded}
        />
      </div>

      <div
        className={
          isMultiProductView
            ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
            : 'min-h-0 flex-1 overflow-y-auto overscroll-contain'
        }
      >
        {renderProductsListing()}
      </div>
    </div>
  );
}
