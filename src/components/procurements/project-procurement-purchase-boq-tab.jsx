import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  buildBoqTemplateProductApiPayload,
  extractBoqTemplateProductMutationResult,
  normalizeBoqTemplateProductRow,
} from '@/api/boqProductPayload';
import { fetchProjectBoqAreas, fetchProjectBoqFloors } from '@/api/projectBoqs';
import {
  addPurchaseBoqItemsToPackage,
  createPurchaseBoqProduct,
  fetchPurchaseBoqPackages,
  fetchPurchaseBoqProducts,
  splitPurchaseBoqSelectedItems,
  updatePurchaseBoqProduct,
} from '@/api/purchaseBoq';
import { BOQ_PRODUCT_COLUMN_CONFIG_SOURCES } from '@/components/boq/boq-templates/components/boq-template-products-column-config';
import { groupBoqTemplateProductsByCategory } from '@/components/boq/boq-templates/components/boq-template-products-utils';
import BoqTemplateProductsListing, {
  BOQ_PRODUCT_LISTING_VIEW_MODES,
  BoqTemplateProductsListingSkeleton,
} from '@/components/boq/boq-templates/components/boq-template-products-listing';
import {
  cloneBoqTemplateProductFilters,
  filterBoqTemplateProducts,
  flattenBoqProductsResponse,
} from '@/components/boq/boq-helper';
import {
  DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS,
  ENABLE_PURCHASE_BOQ_CONVERT_TO_PRODUCT,
  PROJECT_BOQ_PRICE_VIEW,
  PROJECT_BOQ_TYPES,
} from '@/components/boq/constants';
import BoqConvertToProductModal from '@/components/boq/boq-convert-to-product-modal';
import ProjectBoqProductsToolbar from '@/components/boq/project-boqs/components/project-boq-products-toolbar';
import BoqListEmptyState from '@/components/boq/shared/boq-list-empty-state';
import BoqCategorySheetTabs from '@/components/boq/shared/boq-category-sheet-tabs';
import {
  PROJECT_PROCUREMENT_PURCHASE_BOQ_STATUS_FILTERS,
  PROJECT_PROCUREMENT_PURCHASE_BOQ_VIEW_MODES,
} from '@/components/procurements/constants';
import ProjectProcurementPurchaseBoqAddToPackageDrawer from '@/components/procurements/project-procurement-purchase-boq-add-to-package-drawer';
import ProjectProcurementRaisePoDrawer from '@/components/procurements/project-procurement-raise-po-drawer';
import { useProjectProcurementPurchaseBoqColumnConfig } from '@/components/procurements/project-procurement-purchase-boq-column-config';
import ProjectProcurementPurchaseBoqSelectionBar from '@/components/procurements/project-procurement-purchase-boq-selection-bar';
import {
  buildDirectPoPackageDataFromSelection,
  canAddPurchaseBoqSelectionToPackage,
  canRaiseDirectPoForPurchaseBoqSelection,
  mapPurchaseBoqProductsToRaisePoLineItems,
} from '@/components/procurements/project-procurement-purchase-boq-selection-utils';
import ProjectProcurementPurchaseBoqStatusFilters from '@/components/procurements/project-procurement-purchase-boq-status-filters';
import { cn } from '@/utils/cn';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const LAYOUT_VIEW_OPTIONS = [
  {
    value: PROJECT_PROCUREMENT_PURCHASE_BOQ_VIEW_MODES.CARD,
    label: 'Card',
  },
  {
    value: PROJECT_PROCUREMENT_PURCHASE_BOQ_VIEW_MODES.LIST,
    label: 'List',
  },
];

const BOQ_TYPE_FILTER_OPTIONS = [
  { value: PROJECT_BOQ_TYPES.MAIN, label: 'Main' },
  { value: PROJECT_BOQ_TYPES.DESIGN, label: 'Design' },
  { value: PROJECT_BOQ_TYPES.ADDITIONAL, label: 'Additional' },
];

function resolvePurchaseBoqListingCategoryType(product = {}) {
  const existing = String(product.categoryType ?? product.categoryId ?? '').trim();
  if (existing) return existing;

  const categoryPath = String(
    product.boqCategory ?? product.purchaseCategory ?? product.section ?? '',
  ).trim();
  if (!categoryPath) return 'other';

  return categoryPath.includes(' > ') ? categoryPath.split(' > ')[0].trim() : categoryPath;
}

const areSelectedIdSetsEqual = (left, right) => {
  if (left.size !== right.size) return false;
  for (const id of left) {
    if (!right.has(id)) return false;
  }
  return true;
};

export default function ProjectProcurementPurchaseBoqTab({ project }) {
  const columnConfigHook = useProjectProcurementPurchaseBoqColumnConfig();
  const projectId = project?.id || project?.project || '';
  const purchaseBoqName = project?.purchase_boq || '';

  const [statusFilter, setStatusFilter] = useState('all');
  const [layoutViewMode, setLayoutViewMode] = useState(
    PROJECT_PROCUREMENT_PURCHASE_BOQ_VIEW_MODES.LIST,
  );
  const [productViewMode, setProductViewMode] = useState(BOQ_PRODUCT_LISTING_VIEW_MODES.SINGLE);
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [appliedProductFilters, setAppliedProductFilters] = useState(() =>
    cloneBoqTemplateProductFilters(DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS),
  );
  const [allDescriptionsExpanded, setAllDescriptionsExpanded] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState(() => new Set());
  const [purchaseBoqProducts, setPurchaseBoqProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsLoadError, setProductsLoadError] = useState(null);
  const [isMutating, setIsMutating] = useState(false);
  const [isAddToPackageOpen, setIsAddToPackageOpen] = useState(false);
  const [isRaisePoOpen, setIsRaisePoOpen] = useState(false);
  const [raisePoPackageData, setRaisePoPackageData] = useState(null);
  const [addToPackageProducts, setAddToPackageProducts] = useState([]);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [projectFloors, setProjectFloors] = useState([]);
  const [projectAreas, setProjectAreas] = useState([]);
  const [isConvertToProductOpen, setIsConvertToProductOpen] = useState(false);
  const [convertLineItems, setConvertLineItems] = useState([]);

  const loadProductsRequestIdRef = useRef(0);

  const loadProducts = useCallback(async () => {
    if (!projectId && !purchaseBoqName) {
      setPurchaseBoqProducts([]);
      return;
    }

    const requestId = ++loadProductsRequestIdRef.current;
    setIsLoadingProducts(true);
    setProductsLoadError(null);

    try {
      const data = await fetchPurchaseBoqProducts({
        project: projectId,
        purchaseBoq: purchaseBoqName,
        procurementStatus: statusFilter,
      });
      if (requestId !== loadProductsRequestIdRef.current) return;
      setPurchaseBoqProducts(flattenBoqProductsResponse(data).map(normalizeBoqTemplateProductRow));
    } catch (error) {
      if (requestId !== loadProductsRequestIdRef.current) return;
      setPurchaseBoqProducts([]);
      setProductsLoadError(error?.message || 'Failed to load purchase BOQ products.');
      showErrorToast(error, { defaultMessage: 'Failed to load purchase BOQ products.' });
    } finally {
      if (requestId === loadProductsRequestIdRef.current) {
        setIsLoadingProducts(false);
      }
    }
  }, [projectId, purchaseBoqName, statusFilter]);

  const loadPackages = useCallback(async () => {
    if (!purchaseBoqName) {
      setAvailablePackages([]);
      return;
    }

    try {
      const packages = await fetchPurchaseBoqPackages({
        project: projectId,
        purchaseBoq: purchaseBoqName,
      });
      setAvailablePackages(packages);
    } catch {
      setAvailablePackages([]);
    }
  }, [projectId, purchaseBoqName]);

  useEffect(() => {
    if (!projectId) {
      setProjectFloors([]);
      setProjectAreas([]);
      return undefined;
    }

    let cancelled = false;

    Promise.all([
      fetchProjectBoqFloors(undefined, { projectId }),
      fetchProjectBoqAreas(undefined, { projectId }),
    ])
      .then(([floorsData, areasData]) => {
        if (cancelled) return;
        setProjectFloors(Array.isArray(floorsData?.floors) ? floorsData.floors : []);
        setProjectAreas(Array.isArray(areasData?.areas) ? areasData.areas : []);
      })
      .catch(() => {
        if (!cancelled) {
          setProjectFloors([]);
          setProjectAreas([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await loadProducts();
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [loadProducts]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await loadPackages();
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [loadPackages]);

  const filteredProducts = useMemo(
    () =>
      filterBoqTemplateProducts(purchaseBoqProducts, {
        searchQuery: productSearch,
        filters: appliedProductFilters,
      }),
    [appliedProductFilters, productSearch, purchaseBoqProducts],
  );

  const handleProductFiltersChange = useCallback((nextFilters) => {
    setAppliedProductFilters(cloneBoqTemplateProductFilters(nextFilters));
  }, []);

  const handleConvertToProduct = useCallback((lineItems = []) => {
    if (!Array.isArray(lineItems) || lineItems.length === 0) return;
    setConvertLineItems(lineItems);
    setIsConvertToProductOpen(true);
  }, []);

  const handleConvertedLineItem = useCallback((updatedLine) => {
    if (!updatedLine?.id) return;
    setPurchaseBoqProducts((previous) =>
      previous.map((product) =>
        String(product.id) === String(updatedLine.id) ? { ...product, ...updatedLine } : product,
      ),
    );
    setConvertLineItems((previous) =>
      previous.filter((line) => String(line.id) !== String(updatedLine.id)),
    );
  }, []);

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

  const selectedProductsInView = useMemo(
    () =>
      purchaseBoqProducts.filter(
        (product) => selectedProductIds.has(product.id) && visibleProductIds.includes(product.id),
      ),
    [purchaseBoqProducts, selectedProductIds, visibleProductIds],
  );

  const canRaiseDirectPo = useMemo(
    () => canRaiseDirectPoForPurchaseBoqSelection(selectedProductsInView),
    [selectedProductsInView],
  );

  const canAddToPackage = useMemo(
    () => canAddPurchaseBoqSelectionToPackage(selectedProductsInView),
    [selectedProductsInView],
  );

  const raisePoLineItems = useMemo(
    () => mapPurchaseBoqProductsToRaisePoLineItems(selectedProductsInView),
    [selectedProductsInView],
  );

  const isMultiProductView = productViewMode === BOQ_PRODUCT_LISTING_VIEW_MODES.MULTI;

  const listingProducts = useMemo(() => {
    if (!isMultiProductView) return filteredProducts;

    return filteredProducts.map((product) => {
      const categoryType = resolvePurchaseBoqListingCategoryType(product);
      return categoryType === product.categoryType ? product : { ...product, categoryType };
    });
  }, [filteredProducts, isMultiProductView]);

  const groupedCategories = useMemo(
    () =>
      groupBoqTemplateProductsByCategory(listingProducts, {
        sectionField: 'purchaseCategory',
        groupBySectionOnly: !isMultiProductView,
        usePurchaseBoqTotals: true,
      }),
    [isMultiProductView, listingProducts],
  );

  useEffect(() => {
    if (!isMultiProductView) {
      setActiveCategoryId('');
      return;
    }

    const categoryIds = groupedCategories.map((category) => category.categoryId);
    if (categoryIds.length === 0) {
      setActiveCategoryId('');
      return;
    }

    setActiveCategoryId((previous) =>
      previous && categoryIds.includes(previous) ? previous : categoryIds[0],
    );
  }, [groupedCategories, isMultiProductView]);

  useEffect(() => {
    setSelectedProductIds((previous) => {
      const visibleSet = new Set(visibleProductIds);
      const next = new Set([...previous].filter((id) => visibleSet.has(id)));
      return areSelectedIdSetsEqual(previous, next) ? previous : next;
    });
  }, [visibleProductIds]);

  const handleSelectedProductIdsChange = useCallback((next) => {
    setSelectedProductIds((previous) => (areSelectedIdSetsEqual(previous, next) ? previous : next));
  }, []);

  const handleAddProduct = useCallback(
    async (product, section) => {
      if (!purchaseBoqName) return;

      try {
        const apiPayload = {
          ...buildBoqTemplateProductApiPayload(product, { section }),
          boqCategory: product.boqCategory ?? '',
          purchaseCategory: product.purchaseCategory ?? '',
        };
        const result = await createPurchaseBoqProduct({
          project: projectId,
          purchaseBoq: purchaseBoqName,
          payload: apiPayload,
        });
        const { product: savedProduct } = extractBoqTemplateProductMutationResult(result);
        const savedStatus = savedProduct.procurementStatus || 'pending-procurement';
        if (statusFilter === 'all' || savedStatus === statusFilter) {
          setPurchaseBoqProducts((previous) => [...previous, savedProduct]);
        }
        showSuccessToast('Product added successfully.');
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to add product.' });
        throw error;
      }
    },
    [projectId, purchaseBoqName, statusFilter],
  );

  const handleUpdateProduct = useCallback(
    async (updatedProduct) => {
      if (!updatedProduct?.id) return;

      try {
        const apiPayload = {
          ...buildBoqTemplateProductApiPayload(updatedProduct, {
            section: updatedProduct.section,
          }),
          boqCategory: updatedProduct.boqCategory ?? '',
          purchaseCategory: updatedProduct.purchaseCategory ?? '',
        };
        const result = await updatePurchaseBoqProduct({
          project: projectId,
          purchaseBoq: purchaseBoqName,
          rowName: updatedProduct.id,
          payload: apiPayload,
        });
        const { product: savedProduct } = extractBoqTemplateProductMutationResult(result);
        setPurchaseBoqProducts((previous) =>
          previous.map((product) => {
            if (String(product.id) !== String(savedProduct.id)) return product;

            const nextPurchaseCategory =
              savedProduct.purchaseCategory ??
              updatedProduct.purchaseCategory ??
              product.purchaseCategory ??
              '';
            const nextBoqCategory =
              savedProduct.boqCategory ?? updatedProduct.boqCategory ?? product.boqCategory ?? '';

            return {
              ...product,
              ...savedProduct,
              boqCategory: nextBoqCategory,
              purchaseCategory: nextPurchaseCategory,
            };
          }),
        );
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update product.' });
        throw error;
      }
    },
    [projectId, purchaseBoqName],
  );

  const handleClearSelection = useCallback(() => {
    setSelectedProductIds(new Set());
  }, []);

  const handleSplitSelected = useCallback(async () => {
    if (!purchaseBoqName || isMutating) return;

    const selectedInView = [...selectedProductIds].filter((id) => visibleProductIds.includes(id));
    if (selectedInView.length === 0) return;

    setIsMutating(true);
    try {
      const result = await splitPurchaseBoqSelectedItems({
        project: projectId,
        purchaseBoq: purchaseBoqName,
        itemRowNames: selectedInView,
      });
      setSelectedProductIds(new Set());
      await loadProducts();
      showSuccessToast(result?.message ?? 'Selected items split successfully.');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to split selected items.' });
    } finally {
      setIsMutating(false);
    }
  }, [isMutating, loadProducts, projectId, purchaseBoqName, selectedProductIds, visibleProductIds]);

  const handleAddToPackage = useCallback(() => {
    if (!canAddPurchaseBoqSelectionToPackage(selectedProductsInView)) return;

    setAddToPackageProducts(selectedProductsInView);
    setIsAddToPackageOpen(true);
  }, [selectedProductsInView]);

  const handleConfirmAddToPackage = useCallback(
    async ({ package: packageToAdd, productIds, expectedClosureDate }) => {
      if (!purchaseBoqName || !packageToAdd || productIds.length === 0 || isMutating) return false;

      const isExistingPackage =
        !packageToAdd.isNew && availablePackages.some((entry) => entry.id === packageToAdd.id);

      setIsMutating(true);
      try {
        const result = await addPurchaseBoqItemsToPackage({
          project: projectId,
          purchaseBoq: purchaseBoqName,
          itemRowNames: productIds,
          packageName: isExistingPackage ? undefined : packageToAdd.name,
          existingPackage: isExistingPackage ? packageToAdd.id : undefined,
          expectedClosureDate: expectedClosureDate || undefined,
        });
        setSelectedProductIds(new Set());
        setIsAddToPackageOpen(false);
        setAddToPackageProducts([]);
        await Promise.all([loadProducts(), loadPackages()]);
        showSuccessToast(result?.message ?? 'Items added to package successfully.');
        return true;
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to add items to package.' });
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [availablePackages, isMutating, loadPackages, loadProducts, projectId, purchaseBoqName],
  );

  const handleRaiseDirectPo = useCallback(() => {
    if (!canRaiseDirectPoForPurchaseBoqSelection(selectedProductsInView)) return;
    if (selectedProductsInView.length === 0) return;

    setRaisePoPackageData(buildDirectPoPackageDataFromSelection(selectedProductsInView, project));
    setIsRaisePoOpen(true);
  }, [project, selectedProductsInView]);

  const handleRaisePoOpenChange = useCallback((open) => {
    setIsRaisePoOpen(open);
    if (!open) {
      setRaisePoPackageData(null);
    }
  }, []);

  const handleRaisePoSaved = useCallback(async () => {
    setSelectedProductIds(new Set());
    await loadProducts();
  }, [loadProducts]);

  const renderProductsListing = () => {
    if (isLoadingProducts) {
      return (
        <div className='min-h-0 flex-1 overflow-auto px-8 pb-10 pt-2'>
          <BoqTemplateProductsListingSkeleton />
        </div>
      );
    }

    if (productsLoadError) {
      return (
        <BoqListEmptyState
          embedded
          title='Failed to load purchase BOQ'
          description={productsLoadError}
        />
      );
    }

    if (!purchaseBoqName) {
      return (
        <BoqListEmptyState
          embedded
          title='No purchase BOQ found'
          description='This project does not have a purchase BOQ yet. Move internal BOQ items to procurement to create one.'
        />
      );
    }

    if (layoutViewMode === PROJECT_PROCUREMENT_PURCHASE_BOQ_VIEW_MODES.CARD) {
      return (
        <BoqListEmptyState
          embedded
          title='Card view coming soon'
          description='Switch to List view to browse purchase BOQ products.'
        />
      );
    }

    if (filteredProducts.length === 0 && purchaseBoqProducts.length > 0) {
      return (
        <BoqListEmptyState
          embedded
          title='No products found'
          description='Try adjusting your search or filters.'
        />
      );
    }

    if (
      filteredProducts.length === 0 &&
      statusFilter !== 'all' &&
      purchaseBoqProducts.length === 0
    ) {
      const statusLabel =
        PROJECT_PROCUREMENT_PURCHASE_BOQ_STATUS_FILTERS.find((option) => option.id === statusFilter)
          ?.label ?? 'this status';
      return (
        <BoqListEmptyState
          embedded
          title={`No products in ${statusLabel}`}
          description='Items matching this procurement status will appear here.'
        />
      );
    }

    return (
      <BoqTemplateProductsListing
        products={listingProducts}
        columnConfig={columnConfigHook.columns}
        allDescriptionsExpanded={allDescriptionsExpanded}
        onAllDescriptionsExpandedChange={setAllDescriptionsExpanded}
        financialSummaryVariant='purchase-boq'
        priceView={PROJECT_BOQ_PRICE_VIEW.INTERNAL}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        viewMode={productViewMode}
        useProjectBoqColumns
        usePurchaseBoqSectionStyle
        sectionGroupField='purchaseCategory'
        groupBySectionOnly={!isMultiProductView}
        hideCategoryTabs={isMultiProductView}
        activeCategoryId={isMultiProductView ? activeCategoryId : undefined}
        onActiveCategoryIdChange={isMultiProductView ? setActiveCategoryId : undefined}
        columnConfigSource={BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.PURCHASE_BOQ}
        projectFloors={projectFloors}
        projectAreas={projectAreas}
        projectId={projectId}
        showCategoryHeader={false}
        enableRowSelection
        selectedProductIds={selectedProductIds}
        onSelectedProductIdsChange={handleSelectedProductIdsChange}
        hideSelectionBar
        onConvertToProduct={
          ENABLE_PURCHASE_BOQ_CONVERT_TO_PRODUCT ? handleConvertToProduct : undefined
        }
      />
    );
  };

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <ProjectProcurementPurchaseBoqStatusFilters
        value={statusFilter}
        onValueChange={setStatusFilter}
        className='-mx-8 shrink-0'
      />

      <div className='shrink-0 pb-5 pt-5'>
        <ProjectBoqProductsToolbar
          searchValue={productSearch}
          onSearchChange={setProductSearch}
          appliedFilters={appliedProductFilters}
          onFiltersChange={handleProductFiltersChange}
          boqTypeOptions={BOQ_TYPE_FILTER_OPTIONS}
          showNewProduct={false}
          showPreview={false}
          showVersionStatus={false}
          showViewMode
          viewMode={productViewMode}
          onViewModeChange={setProductViewMode}
          columnConfig={columnConfigHook}
          allDescriptionsExpanded={allDescriptionsExpanded}
          onAllDescriptionsExpandedChange={setAllDescriptionsExpanded}
          layoutViewMode={layoutViewMode}
          onLayoutViewModeChange={setLayoutViewMode}
          layoutViewOptions={LAYOUT_VIEW_OPTIONS}
        />
      </div>

      <div className='relative min-h-0 flex-1 overflow-y-auto overscroll-contain'>
        <div className={cn(isMultiProductView ? 'pb-4' : 'pb-24')}>
          {renderProductsListing()}

          {selectedCount > 0 ? (
            <div className='pointer-events-none sticky bottom-4 z-20 flex justify-center px-8'>
              <ProjectProcurementPurchaseBoqSelectionBar
                className='pointer-events-auto'
                selectedCount={selectedCount}
                selectedProducts={selectedProductsInView}
                disabled={isMutating}
                canRaiseDirectPo={canRaiseDirectPo}
                canAddToPackage={canAddToPackage}
                onClearSelection={handleClearSelection}
                onSplit={handleSplitSelected}
                onAddToPackage={handleAddToPackage}
                onRaiseDirectPo={handleRaiseDirectPo}
                onConvertToProduct={
                  ENABLE_PURCHASE_BOQ_CONVERT_TO_PRODUCT ? handleConvertToProduct : undefined
                }
              />
            </div>
          ) : null}
        </div>
      </div>

      {isMultiProductView && groupedCategories.length > 0 ? (
        <BoqCategorySheetTabs
          categories={groupedCategories}
          activeCategoryId={activeCategoryId}
          onSelect={setActiveCategoryId}
          placement='bottom'
          className='-mx-8 shrink-0'
          disableAutoScroll
        />
      ) : null}

      <ProjectProcurementPurchaseBoqAddToPackageDrawer
        open={isAddToPackageOpen}
        onOpenChange={setIsAddToPackageOpen}
        products={addToPackageProducts}
        packages={availablePackages}
        onConfirm={handleConfirmAddToPackage}
      />

      <ProjectProcurementRaisePoDrawer
        open={isRaisePoOpen}
        onOpenChange={handleRaisePoOpenChange}
        packageData={raisePoPackageData}
        selectedItems={raisePoLineItems}
        itemCount={selectedCount}
        projectName={project?.name}
        onDraftSaved={handleRaisePoSaved}
      />

      <BoqConvertToProductModal
        open={isConvertToProductOpen}
        onOpenChange={setIsConvertToProductOpen}
        lineItems={convertLineItems}
        boqContext={{
          type: 'purchase',
          projectId,
          purchaseBoqName,
        }}
        onConverted={handleConvertedLineItem}
      />
    </div>
  );
}
