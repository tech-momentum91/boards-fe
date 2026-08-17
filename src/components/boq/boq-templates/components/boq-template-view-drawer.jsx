import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiCloseLine, RiExpandDiagonalLine, RiFullscreenExitLine } from 'react-icons/ri';

import {
  fetchBoqTemplate,
  fetchBoqTemplateProducts,
  createBoqTemplateProduct,
  updateBoqTemplate,
  updateBoqTemplateProduct,
  deleteBoqTemplateProduct,
  syncBoqTemplateProductsFromMaster,
} from '@/api/boqTemplates';
import { addBoqProductsFromPreviousProjects } from '@/api/boqProducts';
import {
  buildBoqTemplateProductApiPayload,
  extractBoqTemplateProductMutationResult,
} from '@/api/boqProductPayload';
import {
  cloneBoqTemplateProductFilters,
  filterBoqTemplateProducts,
  flattenBoqProductsResponse,
  formatBoqTemplateDrawerSubtitle,
} from '@/components/boq/boq-helper';
import { buildBoqExistingItemCodeSet } from '@/components/boq/boq-templates/components/boq-template-products-utils';
import {
  BOQ_PRODUCT_TARGET,
  BOQ_TEMPLATE_STATUS,
  BOQ_TEMPLATE_DRAWER_TAB_IDS,
  BOQ_TEMPLATE_DRAWER_TABS,
  BOQ_TEMPLATE_NEW_PRODUCT_OPTION_IDS,
  DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS,
} from '@/components/boq/constants';
import BoqTemplateAddPreviousProjectsModal from '@/components/boq/boq-templates/components/boq-template-add-previous-projects-modal';
import BoqTemplateAddProductMasterModal from '@/components/boq/boq-templates/components/boq-template-add-product-master-modal';
import BoqTemplateProductsListing, {
  BoqTemplateProductsListingSkeleton,
} from '@/components/boq/boq-templates/components/boq-template-products-listing';
import BoqTemplateProductsToolbar from '@/components/boq/boq-templates/components/boq-template-products-toolbar';
import { useBoqTemplateProductsColumnConfig } from '@/components/boq/boq-templates/components/boq-template-products-column-config';
import BoqListEmptyState from '@/components/boq/shared/boq-list-empty-state';
import * as Button from '@/components/ui/button';
import * as Drawer from '@/components/ui/drawer';
import { StatusDropdown } from '@/components/ui/status-dropdown';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';

function withLoadedProductCount(template, productCount) {
  if (!template) return template;
  const count = Number(productCount);
  if (!Number.isFinite(count) || count < 0) return template;
  return { ...template, products: count };
}

const BoqTemplateDrawerCloseButton = ({ onClick }) => (
  <Button.Root
    type='button'
    variant='neutral'
    mode='stroke'
    size='medium'
    className='size-8 shrink-0 rounded-lg p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
    aria-label='Close template drawer'
    onClick={onClick}
  >
    <Button.Icon as={RiCloseLine} className='size-5' />
  </Button.Root>
);

const BOQ_TEMPLATE_STATUS_OPTIONS = [
  { value: BOQ_TEMPLATE_STATUS.ACTIVE, label: 'Active', color: 'green' },
  { value: BOQ_TEMPLATE_STATUS.REVIEW, label: 'Review', color: 'orange' },
  { value: BOQ_TEMPLATE_STATUS.DRAFT, label: 'Draft', color: 'gray' },
  { value: BOQ_TEMPLATE_STATUS.INACTIVE, label: 'Inactive', color: 'gray' },
];

const BoqTemplateStatusSelect = ({ status, disabled, onChange }) => (
  <StatusDropdown.Root
    value={status}
    onValueChange={onChange}
    statusOptions={BOQ_TEMPLATE_STATUS_OPTIONS}
    disabled={disabled}
    size='small'
    variant='inline'
    indicator='dot'
  >
    <StatusDropdown.Trigger />
    <StatusDropdown.Content />
  </StatusDropdown.Root>
);

const BoqTemplateDrawerHeader = ({
  title,
  subtitle,
  status,
  isUpdatingStatus,
  onStatusChange,
  onClose,
  isFullscreen = false,
  onToggleFullscreen,
  children,
}) => (
  <header className='relative shrink-0 border-b border-[#e5e7eb] bg-bg-white-0'>
    <div className='flex items-start justify-between gap-6 px-6 pb-6 pt-6'>
      <div className='flex min-w-0 flex-col gap-0.5'>
        <h2 className='truncate text-[18px] font-medium leading-7 tracking-[-0.45px] text-[#0a0a0a]'>
          {title}
        </h2>
        {subtitle ? <p className='text-[12px] leading-4 text-[#737373]'>{subtitle}</p> : null}
      </div>
      <div className='z-10 flex shrink-0 items-center gap-2'>
        <BoqTemplateStatusSelect
          status={status}
          disabled={isUpdatingStatus}
          onChange={onStatusChange}
        />
        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='medium'
          className='size-8 shrink-0 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
          aria-label={isFullscreen ? 'Exit full screen' : 'Expand to full screen'}
          aria-pressed={isFullscreen}
          onClick={onToggleFullscreen}
        >
          <Button.Icon
            as={isFullscreen ? RiFullscreenExitLine : RiExpandDiagonalLine}
            className='size-5 text-text-sub-500'
          />
        </Button.Root>
        <BoqTemplateDrawerCloseButton onClick={onClose} />
      </div>
    </div>
    {children}
  </header>
);

const BoqTemplateDrawerTabs = () => (
  <TabMenuHorizontal.List
    wrapperClassName='w-full'
    className='h-auto min-h-0 gap-6 border-0 border-y border-stroke-soft-200 px-8 py-3.5'
  >
    {BOQ_TEMPLATE_DRAWER_TABS.map((tab) => (
      <TabMenuHorizontal.Trigger
        key={tab.id}
        value={tab.id}
        className='h-auto gap-1.5 py-0 text-label-sm'
      >
        <TabMenuHorizontal.Icon as={tab.Icon} className='size-5' />
        {tab.label}
      </TabMenuHorizontal.Trigger>
    ))}
  </TabMenuHorizontal.List>
);

const BoqTemplateViewDrawer = ({ open, onOpenChange, templateRow, onMutated }) => {
  const [activeTab, setActiveTab] = useState(BOQ_TEMPLATE_DRAWER_TAB_IDS.PRODUCTS);
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const columnConfigHook = useBoqTemplateProductsColumnConfig();
  const [appliedProductFilters, setAppliedProductFilters] = useState(() =>
    cloneBoqTemplateProductFilters(DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS),
  );
  const [addProductMasterModalOpen, setAddProductMasterModalOpen] = useState(false);
  const [isAddingProductsFromMaster, setIsAddingProductsFromMaster] = useState(false);
  const isSyncingMasterProductsRef = useRef(false);
  const [addPreviousProjectsModalOpen, setAddPreviousProjectsModalOpen] = useState(false);
  const [isAddingProductsFromPreviousProjects, setIsAddingProductsFromPreviousProjects] =
    useState(false);
  const [allDescriptionsExpanded, setAllDescriptionsExpanded] = useState(false);
  const [templateProducts, setTemplateProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [productsLoadError, setProductsLoadError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const updateRequestVersionsRef = useRef(new Map());

  const markMutated = useCallback(() => {
    onMutated?.();
  }, [onMutated]);

  const templateCode = templateRow?.code ?? templateRow?.id ?? '';

  const applyTemplateSummary = useCallback((summary, productCount) => {
    if (!summary) return;
    setDetail((previous) =>
      previous
        ? {
            ...previous,
            buyTotal: summary.buyTotal,
            sellTotal: summary.sellTotal,
            margins: summary.marginPercent,
            products:
              productCount != null ? Number(productCount) || 0 : Number(previous.products) || 0,
          }
        : previous,
    );
  }, []);

  const loadTemplateProducts = useCallback(async () => {
    if (!templateCode) return [];

    const data = await fetchBoqTemplateProducts(templateCode);
    const rows = flattenBoqProductsResponse(data);
    setTemplateProducts(rows);
    return rows;
  }, [templateCode]);

  useEffect(() => {
    if (!open || !templateRow) {
      setDetail(null);
      setLoadError(null);
      setActiveTab(BOQ_TEMPLATE_DRAWER_TAB_IDS.PRODUCTS);
      setProductSearch('');
      setAppliedProductFilters(
        cloneBoqTemplateProductFilters(DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS),
      );
      setAddProductMasterModalOpen(false);
      setIsAddingProductsFromMaster(false);
      setAddPreviousProjectsModalOpen(false);
      setIsAddingProductsFromPreviousProjects(false);
      setAllDescriptionsExpanded(false);
      setTemplateProducts([]);
      setIsProductsLoading(false);
      setProductsLoadError(null);
      setIsFullscreen(false);
      return;
    }

    if (!templateCode) return;

    let cancelled = false;
    setIsLoading(true);
    setIsProductsLoading(true);
    setLoadError(null);
    setProductsLoadError(null);

    Promise.all([fetchBoqTemplate(templateCode), fetchBoqTemplateProducts(templateCode)])
      .then(([templateData, productsData]) => {
        if (cancelled) return;
        const rows = flattenBoqProductsResponse(productsData);
        setTemplateProducts(rows);
        setDetail(withLoadedProductCount(templateData, rows.length));
      })
      .catch((error) => {
        if (cancelled) return;
        setDetail(null);
        setTemplateProducts([]);
        const message = error?.message || 'Failed to load BOQ template.';
        setLoadError(message);
        setProductsLoadError(message);
        showErrorToast(error, { defaultMessage: 'Failed to load BOQ template.' });
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
          setIsProductsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, templateCode, templateRow]);

  useEffect(() => {
    if (!open || isProductsLoading || productsLoadError) return;

    setDetail((previous) => {
      if (!previous) return previous;
      const nextCount = templateProducts.length;
      if (Number(previous.products) === nextCount) return previous;
      return { ...previous, products: nextCount };
    });
  }, [open, isProductsLoading, productsLoadError, templateProducts.length]);

  const handleClose = useCallback(() => onOpenChange?.(false), [onOpenChange]);

  const handleStatusChange = useCallback(
    async (nextStatus) => {
      if (!templateCode || !nextStatus || nextStatus === detail?.status || isUpdatingStatus) return;

      setIsUpdatingStatus(true);
      try {
        const updated = await updateBoqTemplate(templateCode, { status: nextStatus });
        setDetail((previous) =>
          previous ? { ...previous, ...updated, status: updated?.status ?? nextStatus } : previous,
        );
        markMutated();
        showSuccessToast('Template status updated successfully.');
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update template status.' });
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [detail?.status, isUpdatingStatus, markMutated, templateCode],
  );

  const handleDrawerOpenChange = useCallback(
    (nextOpen) => {
      if (!nextOpen) {
        setIsFullscreen(false);
      }
      onOpenChange?.(nextOpen);
    },
    [onOpenChange],
  );

  const reloadTemplate = useCallback(() => {
    if (!templateCode) return;

    setIsLoading(true);
    setIsProductsLoading(true);
    setLoadError(null);
    setProductsLoadError(null);

    Promise.all([fetchBoqTemplate(templateCode), fetchBoqTemplateProducts(templateCode)])
      .then(([templateData, productsData]) => {
        const rows = flattenBoqProductsResponse(productsData);
        setTemplateProducts(rows);
        setDetail(withLoadedProductCount(templateData, rows.length));
      })
      .catch((error) => {
        setDetail(null);
        setTemplateProducts([]);
        const message = error?.message || 'Failed to load BOQ template.';
        setLoadError(message);
        setProductsLoadError(message);
        showErrorToast(error, { defaultMessage: 'Failed to load BOQ template.' });
      })
      .finally(() => {
        setIsLoading(false);
        setIsProductsLoading(false);
      });
  }, [templateCode]);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((previous) => !previous);
  }, []);

  const handleProductFiltersChange = useCallback((nextFilters) => {
    setAppliedProductFilters(cloneBoqTemplateProductFilters(nextFilters));
  }, []);

  const handleNewProductSelect = useCallback((optionId) => {
    if (optionId === BOQ_TEMPLATE_NEW_PRODUCT_OPTION_IDS.PRODUCT_MASTER) {
      setAddProductMasterModalOpen(true);
      return;
    }
    if (optionId === BOQ_TEMPLATE_NEW_PRODUCT_OPTION_IDS.PREVIOUS_PROJECTS) {
      setAddPreviousProjectsModalOpen(true);
    }
  }, []);

  const handleSyncProductsFromMaster = useCallback(
    async ({ selectedProducts = [], removedProducts = [] } = {}) => {
      if (
        !templateCode ||
        isSyncingMasterProductsRef.current ||
        (selectedProducts.length === 0 && removedProducts.length === 0)
      )
        return;

      isSyncingMasterProductsRef.current = true;
      setIsAddingProductsFromMaster(true);
      try {
        const result = await syncBoqTemplateProductsFromMaster({
          code: templateCode,
          selectedProducts,
          removeRowNames: removedProducts.map((product) => product.id).filter(Boolean),
        });

        const rows = flattenBoqProductsResponse(result);
        const resolvedRows = rows.length > 0 ? rows : await loadTemplateProducts();
        setTemplateProducts(resolvedRows);

        if (result?.summary) {
          applyTemplateSummary(result.summary, resolvedRows.length);
        }

        const addedCount = Number(result?.added_count ?? result?.added?.length ?? 0);
        const removedCount = Number(result?.removed_count ?? result?.removed?.length ?? 0);

        if (addedCount > 0 || removedCount > 0) {
          markMutated();
          showSuccessToast(
            `${addedCount} product(s) added and ${removedCount} product(s) removed.`,
          );
        }
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update products from Product Master.' });
        throw error;
      } finally {
        // This request exclusively owns the same-component submission mutex.
        // eslint-disable-next-line require-atomic-updates
        isSyncingMasterProductsRef.current = false;
        setIsAddingProductsFromMaster(false);
      }
    },
    [applyTemplateSummary, loadTemplateProducts, markMutated, templateCode],
  );

  const handleAddProductsFromPreviousProjects = useCallback(
    async (selectedProducts) => {
      if (!templateCode || !Array.isArray(selectedProducts) || selectedProducts.length === 0)
        return;

      setIsAddingProductsFromPreviousProjects(true);
      try {
        const result = await addBoqProductsFromPreviousProjects({
          target: BOQ_PRODUCT_TARGET.TEMPLATE,
          code: templateCode,
          selectedProducts,
        });

        const rows = flattenBoqProductsResponse(result);
        const resolvedRows = rows.length > 0 ? rows : await loadTemplateProducts();
        setTemplateProducts(resolvedRows);

        if (result?.summary) {
          applyTemplateSummary(result.summary, resolvedRows.length);
        }

        const addedCount = Number(result?.added_count ?? result?.added?.length ?? 0);
        const skippedCount = Number(result?.skipped_count ?? result?.skipped?.length ?? 0);

        if (addedCount > 0) {
          markMutated();
          showSuccessToast(
            skippedCount > 0
              ? `${addedCount} product(s) added. ${skippedCount} skipped.`
              : `${addedCount} product(s) added successfully.`,
          );
        } else if (skippedCount > 0) {
          showErrorToast(null, {
            defaultMessage: 'No products were added. All selected items were skipped.',
          });
        }
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to add products from previous projects.' });
        throw error;
      } finally {
        setIsAddingProductsFromPreviousProjects(false);
      }
    },
    [applyTemplateSummary, loadTemplateProducts, markMutated, templateCode],
  );

  const resolvedTemplate = useMemo(() => {
    if (detail) return detail;
    return templateRow ?? null;
  }, [detail, templateRow]);

  const subtitle = useMemo(() => {
    const base = resolvedTemplate ?? templateRow;
    const productsLoaded = open && !isProductsLoading && !productsLoadError;
    return formatBoqTemplateDrawerSubtitle(
      productsLoaded ? withLoadedProductCount(base, templateProducts.length) : base,
    );
  }, [
    open,
    isProductsLoading,
    productsLoadError,
    resolvedTemplate,
    templateRow,
    templateProducts.length,
  ]);

  const resolvedTemplateProducts = useMemo(() => templateProducts, [templateProducts]);

  const filteredProducts = useMemo(
    () =>
      filterBoqTemplateProducts(resolvedTemplateProducts, {
        searchQuery: productSearch,
        filters: appliedProductFilters,
      }),
    [appliedProductFilters, productSearch, resolvedTemplateProducts],
  );

  const existingBoqItemCodes = useMemo(
    () => buildBoqExistingItemCodeSet(resolvedTemplateProducts),
    [resolvedTemplateProducts],
  );

  const handleAddProduct = useCallback(
    async (product, section) => {
      if (!templateCode) return;

      try {
        const apiPayload = buildBoqTemplateProductApiPayload(product, { section });
        const result = await createBoqTemplateProduct(templateCode, apiPayload);
        const {
          product: savedProduct,
          summary,
          productCount,
        } = extractBoqTemplateProductMutationResult(result);

        setTemplateProducts((previous) => [...previous, savedProduct]);
        applyTemplateSummary(summary, productCount);
        markMutated();
        showSuccessToast('Product added successfully.');
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to add product.' });
        throw error;
      }
    },
    [applyTemplateSummary, markMutated, templateCode],
  );

  const handleDeleteProduct = useCallback(
    async (product) => {
      if (!templateCode || !product?.id) return;

      try {
        const result = await deleteBoqTemplateProduct(templateCode, product.id);
        setTemplateProducts((previous) => previous.filter((item) => item.id !== product.id));

        if (result?.summary) {
          applyTemplateSummary(result.summary, result.productCount);
        }

        markMutated();
        showSuccessToast('Product deleted successfully.');
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to delete product.' });
        throw error;
      }
    },
    [applyTemplateSummary, markMutated, templateCode],
  );

  const handleDeleteProducts = useCallback(
    async (productsToDelete = []) => {
      if (!templateCode || !Array.isArray(productsToDelete) || productsToDelete.length === 0)
        return;

      const deletableProducts = productsToDelete.filter((product) => product?.id);
      if (deletableProducts.length === 0) return;

      const deletedIds = new Set();
      let latestResult = null;
      let lastError = null;
      let failedCount = 0;

      for (const product of deletableProducts) {
        try {
          latestResult = await deleteBoqTemplateProduct(templateCode, product.id);
          deletedIds.add(product.id);
        } catch (error) {
          failedCount += 1;
          lastError = error;
        }
      }

      if (deletedIds.size > 0) {
        setTemplateProducts((previous) => previous.filter((item) => !deletedIds.has(item.id)));

        if (latestResult?.summary) {
          applyTemplateSummary(latestResult.summary, latestResult.productCount);
        }
      }

      if (failedCount === 0) {
        markMutated();
        showSuccessToast(
          deletedIds.size === 1
            ? 'Product deleted successfully.'
            : `${deletedIds.size} products deleted successfully.`,
        );
        return;
      }

      if (deletedIds.size > 0) {
        markMutated();
        showErrorToast(lastError, {
          defaultMessage: `${deletedIds.size} of ${deletableProducts.length} products deleted. ${failedCount} failed.`,
        });
        return;
      }

      showErrorToast(lastError, { defaultMessage: 'Failed to delete products.' });
      throw lastError;
    },
    [applyTemplateSummary, markMutated, templateCode],
  );

  const handleUpdateProduct = useCallback(
    async (updatedProduct) => {
      if (!templateCode || !updatedProduct?.id) return;

      const requestVersion = (updateRequestVersionsRef.current.get(updatedProduct.id) ?? 0) + 1;
      updateRequestVersionsRef.current.set(updatedProduct.id, requestVersion);

      try {
        const apiPayload = buildBoqTemplateProductApiPayload(updatedProduct, {
          section: updatedProduct.section,
        });
        const result = await updateBoqTemplateProduct(templateCode, updatedProduct.id, apiPayload);

        if (updateRequestVersionsRef.current.get(updatedProduct.id) !== requestVersion) return;

        const {
          product: savedProduct,
          summary,
          productCount,
        } = extractBoqTemplateProductMutationResult(result);

        setTemplateProducts((previous) =>
          previous.map((item) => (item.id === savedProduct.id ? savedProduct : item)),
        );
        applyTemplateSummary(summary, productCount);
        markMutated();
        showSuccessToast('Product updated successfully.');
      } catch (error) {
        if (updateRequestVersionsRef.current.get(updatedProduct.id) === requestVersion) {
          showErrorToast(error, { defaultMessage: 'Failed to update product.' });
        }
        throw error;
      }
    },
    [applyTemplateSummary, markMutated, templateCode],
  );

  const handleAllDescriptionsExpandedChange = useCallback((next) => {
    setAllDescriptionsExpanded(Boolean(next));
  }, []);

  const isDrawerOpen = Boolean(open && templateRow);
  const showDetailLoading = isLoading && !detail;
  const drawerTitle =
    resolvedTemplate?.templateName || templateRow?.templateName || 'Untitled template';

  return (
    <>
      {templateRow ? (
        <>
          <BoqTemplateAddProductMasterModal
            open={addProductMasterModalOpen}
            onOpenChange={setAddProductMasterModalOpen}
            onSyncProducts={handleSyncProductsFromMaster}
            isSubmitting={isAddingProductsFromMaster}
            existingItemCodes={existingBoqItemCodes}
            existingProducts={resolvedTemplateProducts}
          />

          <BoqTemplateAddPreviousProjectsModal
            open={addPreviousProjectsModalOpen}
            onOpenChange={setAddPreviousProjectsModalOpen}
            onAddProducts={handleAddProductsFromPreviousProjects}
            isSubmitting={isAddingProductsFromPreviousProjects}
          />
        </>
      ) : null}

      <Drawer.Root open={isDrawerOpen} onOpenChange={handleDrawerOpenChange}>
        <Drawer.Content
          className={cn(
            'max-w-[min(947px,calc(100vw-16px))]',
            isFullscreen && 'w-[100vw] max-w-[100vw]',
          )}
        >
          <div className='flex h-full max-h-[100dvh] min-h-0 flex-col bg-bg-white-0'>
            {templateRow ? (
              <>
                {loadError && !resolvedTemplate ? (
                  <div className='flex min-h-0 flex-1 flex-col'>
                    <header className='relative flex shrink-0 items-center justify-end border-b border-[#e5e7eb] px-6 py-3 pr-24'>
                      <div className='absolute right-6 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2'>
                        <Button.Root
                          type='button'
                          variant='neutral'
                          mode='stroke'
                          size='medium'
                          className='size-8 shrink-0 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
                          aria-label={isFullscreen ? 'Exit full screen' : 'Expand to full screen'}
                          aria-pressed={isFullscreen}
                          onClick={handleToggleFullscreen}
                        >
                          <Button.Icon
                            as={isFullscreen ? RiFullscreenExitLine : RiExpandDiagonalLine}
                            className='size-5 text-text-sub-500'
                          />
                        </Button.Root>
                        <BoqTemplateDrawerCloseButton onClick={handleClose} />
                      </div>
                    </header>
                    <BoqListEmptyState embedded error={loadError} onRetry={reloadTemplate} />
                  </div>
                ) : (
                  <TabMenuHorizontal.Root
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className='flex min-h-0 flex-1 flex-col'
                  >
                    <BoqTemplateDrawerHeader
                      title={drawerTitle}
                      subtitle={subtitle}
                      status={resolvedTemplate?.status}
                      isUpdatingStatus={isUpdatingStatus}
                      onStatusChange={handleStatusChange}
                      onClose={handleClose}
                      isFullscreen={isFullscreen}
                      onToggleFullscreen={handleToggleFullscreen}
                    >
                      <BoqTemplateDrawerTabs />
                    </BoqTemplateDrawerHeader>

                    <Drawer.Body className='min-h-0 flex-1 overflow-hidden bg-bg-white-0 p-0'>
                      {showDetailLoading ? (
                        <div className='flex flex-1 items-center justify-center p-12'>
                          <p className='text-paragraph-sm text-text-sub-500'>Loading template…</p>
                        </div>
                      ) : (
                        <>
                          <TabMenuHorizontal.Content
                            value={BOQ_TEMPLATE_DRAWER_TAB_IDS.PRODUCTS}
                            className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none'
                          >
                            <div className='shrink-0 px-6 pb-5 pt-6'>
                              <BoqTemplateProductsToolbar
                                searchValue={productSearch}
                                onSearchChange={setProductSearch}
                                appliedFilters={appliedProductFilters}
                                onFiltersChange={handleProductFiltersChange}
                                onNewProductSelect={handleNewProductSelect}
                                columnConfig={columnConfigHook}
                                allDescriptionsExpanded={allDescriptionsExpanded}
                                onAllDescriptionsExpandedChange={
                                  handleAllDescriptionsExpandedChange
                                }
                              />
                            </div>

                            <div className='min-h-0 flex-1 overflow-y-auto px-6 pb-6'>
                              {isProductsLoading ? (
                                <BoqTemplateProductsListingSkeleton categoryCount={1} />
                              ) : productsLoadError ? (
                                <BoqListEmptyState
                                  embedded
                                  error={productsLoadError}
                                  onRetry={() => {
                                    setIsProductsLoading(true);
                                    setProductsLoadError(null);
                                    loadTemplateProducts()
                                      .catch((error) => {
                                        setProductsLoadError(
                                          error?.message || 'Failed to load template products.',
                                        );
                                        showErrorToast(error, {
                                          defaultMessage: 'Failed to load template products.',
                                        });
                                      })
                                      .finally(() => setIsProductsLoading(false));
                                  }}
                                />
                              ) : filteredProducts.length === 0 &&
                                resolvedTemplateProducts.length > 0 ? (
                                <BoqListEmptyState
                                  embedded
                                  title='No products found'
                                  description='Try adjusting your search or filters.'
                                />
                              ) : (
                                <BoqTemplateProductsListing
                                  products={filteredProducts}
                                  onAddProduct={handleAddProduct}
                                  onDeleteProduct={handleDeleteProduct}
                                  onDeleteProducts={handleDeleteProducts}
                                  onUpdateProduct={handleUpdateProduct}
                                  disableEdit
                                  columnConfig={columnConfigHook.columns}
                                  allDescriptionsExpanded={allDescriptionsExpanded}
                                  onAllDescriptionsExpandedChange={
                                    handleAllDescriptionsExpandedChange
                                  }
                                  financialSummaryVariant='full'
                                />
                              )}
                            </div>
                          </TabMenuHorizontal.Content>

                          <TabMenuHorizontal.Content
                            value={BOQ_TEMPLATE_DRAWER_TAB_IDS.ACTIVITY}
                            className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none'
                          >
                            <div className='flex flex-1 items-center justify-center p-10'>
                              <p className='text-paragraph-sm text-text-soft-400'>
                                No activity yet.
                              </p>
                            </div>
                          </TabMenuHorizontal.Content>
                        </>
                      )}
                    </Drawer.Body>
                  </TabMenuHorizontal.Root>
                )}
              </>
            ) : null}
          </div>
        </Drawer.Content>
      </Drawer.Root>
    </>
  );
};

export default BoqTemplateViewDrawer;
