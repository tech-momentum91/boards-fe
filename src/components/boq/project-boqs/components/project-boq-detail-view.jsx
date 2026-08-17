import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  deleteProjectBoqProduct,
  fetchProjectBoqProducts,
  fetchProjectBoqFloors,
  fetchProjectBoqAreas,
  createProjectBoqProduct,
  updateProjectBoqProduct,
  fetchProjectBoqVersions,
  updateProjectBoqVersionStatus,
  createProjectBoqVersion,
} from '@/api/projectBoqs';
import { addBoqProductsFromMaster, addBoqProductsFromPreviousProjects } from '@/api/boqProducts';

import BoqTemplateAddPreviousProjectsModal from '@/components/boq/boq-templates/components/boq-template-add-previous-projects-modal';
import BoqTemplateAddProductMasterModal from '@/components/boq/boq-templates/components/boq-template-add-product-master-modal';
import BoqTemplateProductsListing, {
  BOQ_PRODUCT_LISTING_VIEW_MODES,
  BoqTemplateProductsListingSkeleton,
} from '@/components/boq/boq-templates/components/boq-template-products-listing';
import { useBoqTemplateProductsColumnConfig } from '@/components/boq/boq-templates/components/boq-template-products-column-config';
import {
  buildBoqTemplateProductApiPayload,
  extractBoqTemplateProductMutationResult,
} from '@/api/boqProductPayload';
import {
  buildProjectBoqAreaLocationOptions,
  buildBoqExistingItemCodeSet,
  deriveBoqProductFloorsLabel,
} from '@/components/boq/boq-templates/components/boq-template-products-utils';
import {
  cloneBoqTemplateProductFilters,
  flattenBoqProductsResponse,
  formatProjectBoqDetailSubtitle,
  getProjectBoqDetailTitle,
  getProjectBoqTypeLabel,
  buildProjectBoqFamilyBadgeMembers,
  filterBoqTemplateProducts,
} from '@/components/boq/boq-helper';
import {
  BOQ_PRODUCT_TARGET,
  BOQ_TEMPLATE_NEW_PRODUCT_OPTION_IDS,
  DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS,
  PROJECT_BOQ_DETAIL_SECTION_TAB_IDS,
  PROJECT_BOQ_NEW_PRODUCT_OPTIONS,
  PROJECT_BOQ_PRICE_VIEW,
  PROJECT_BOQ_TYPES,
  PROJECT_BOQ_VERSION_STATUS,
} from '@/components/boq/constants';
import BoqConvertToProductModal from '@/components/boq/boq-convert-to-product-modal';
import ProjectBoqDetailHeader from '@/components/boq/project-boqs/components/project-boq-detail-header';
import ProjectBoqDetailSectionTabs from '@/components/boq/project-boqs/components/project-boq-detail-section-tabs';
import CreateProjectBoqVersionModal from '@/components/boq/project-boqs/components/create-project-boq-version-modal';
import ProjectBoqFamilyBadges from '@/components/boq/project-boqs/components/project-boq-family-badges';
import ProjectBoqFullscreenFamilyDock from '@/components/boq/project-boqs/components/project-boq-fullscreen-family-dock';
import ProjectBoqOverviewTab from '@/components/boq/project-boqs/components/project-boq-overview-tab';
import ProjectBoqProductsToolbar from '@/components/boq/project-boqs/components/project-boq-products-toolbar';
import BoqListEmptyState from '@/components/boq/shared/boq-list-empty-state';
import {
  areAllBoqErStatusesCompleted,
  BOQ_ER_PROCUREMENT_BLOCKED_TOOLTIP,
} from '@/components/boq/shared/boq-er-utils';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const PROJECT_BOQ_FINANCIAL_SUMMARY_BY_PRICE_VIEW = {
  [PROJECT_BOQ_PRICE_VIEW.COMPARISON]: 'full',
  [PROJECT_BOQ_PRICE_VIEW.INTERNAL]: 'buy-only',
  [PROJECT_BOQ_PRICE_VIEW.CLIENT]: 'sell-only',
};

const ProjectBoqSectionPlaceholder = ({ label }) => (
  <div className='flex flex-1 items-center justify-center p-10'>
    <p className='text-paragraph-sm text-text-soft-400'>{label} coming soon.</p>
  </div>
);

const ProjectBoqDetailView = ({
  boqRow,
  allRows = [],
  onActiveChildChange,
  onAddBoqType,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const navigate = useNavigate();
  const [activeSectionTab, setActiveSectionTab] = useState(
    PROJECT_BOQ_DETAIL_SECTION_TAB_IDS.COMPARISON_BOQ,
  );
  const [productSearch, setProductSearch] = useState('');
  const [productViewMode, setProductViewMode] = useState('single');
  const [boqVersions, setBoqVersions] = useState([]);
  const [currentVersionId, setCurrentVersionId] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [versionStatus, setVersionStatus] = useState(PROJECT_BOQ_VERSION_STATUS.DRAFT);
  const [isVersionLocked, setIsVersionLocked] = useState(false);
  const [isVersionGroupProcurementLocked, setIsVersionGroupProcurementLocked] = useState(false);
  const [isBoqSubmitted, setIsBoqSubmitted] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isVersionsLoading, setIsVersionsLoading] = useState(false);
  const [isUpdatingVersionStatus, setIsUpdatingVersionStatus] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [isCreateVersionModalOpen, setIsCreateVersionModalOpen] = useState(false);
  const columnConfigHook = useBoqTemplateProductsColumnConfig();
  const [appliedProductFilters, setAppliedProductFilters] = useState(() =>
    cloneBoqTemplateProductFilters(DEFAULT_BOQ_TEMPLATE_PRODUCT_FILTERS),
  );
  const [allDescriptionsExpanded, setAllDescriptionsExpanded] = useState(false);
  const [boqProducts, setBoqProducts] = useState([]);
  const [loadedProductsBoqCode, setLoadedProductsBoqCode] = useState('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsLoadError, setProductsLoadError] = useState(null);
  const [addProductMasterModalOpen, setAddProductMasterModalOpen] = useState(false);
  const [isAddingProductsFromMaster, setIsAddingProductsFromMaster] = useState(false);
  const [addPreviousProjectsModalOpen, setAddPreviousProjectsModalOpen] = useState(false);
  const [isAddingProductsFromPreviousProjects, setIsAddingProductsFromPreviousProjects] =
    useState(false);
  const [isConvertToProductOpen, setIsConvertToProductOpen] = useState(false);
  const [convertLineItems, setConvertLineItems] = useState([]);
  const [projectFloors, setProjectFloors] = useState([]);
  const [projectAreas, setProjectAreas] = useState([]);

  const boqCode = boqRow?.code || boqRow?.id || '';
  const projectId = boqRow?.projectId || boqRow?.project || '';
  const productsRequestIdRef = useRef(0);
  const versionStatusUpdateInFlightRef = useRef(false);

  useEffect(() => {
    setBoqVersions([]);
    setCurrentVersionId('');
    setSelectedVersionId(boqCode);
    setVersionStatus(PROJECT_BOQ_VERSION_STATUS.DRAFT);
    setIsVersionLocked(false);
    setIsVersionGroupProcurementLocked(false);
    setIsBoqSubmitted(Boolean(boqRow?.isSubmitted || boqRow?.docstatus === 1));
    setIsSubmitted(Boolean(boqRow?.isSubmitted));
    setProductsLoadError(null);
    setProjectFloors([]);
    setProjectAreas([]);
  }, [boqCode, boqRow?.docstatus, boqRow?.isSubmitted]);

  const applyVersionsPayload = useCallback((payload = {}, preferredVersionId = '') => {
    const versions = Array.isArray(payload.versions) ? payload.versions : [];
    const nextCurrentVersionId =
      payload.currentVersionId || versions.find((v) => v.isCurrent)?.id || '';
    const preferred = (preferredVersionId || '').trim();
    const versionIds = new Set(versions.map((versionRow) => versionRow.id));
    const nextSelectedVersionId =
      preferred && versionIds.has(preferred) ? preferred : nextCurrentVersionId;

    setBoqVersions(versions);
    setCurrentVersionId(nextCurrentVersionId);
    setSelectedVersionId(nextSelectedVersionId);
    const selectedVersion = versions.find((versionRow) => versionRow.id === nextSelectedVersionId);
    setVersionStatus(
      selectedVersion?.status || payload.currentVersionStatus || PROJECT_BOQ_VERSION_STATUS.DRAFT,
    );
    setIsVersionLocked(Boolean(payload.isVersionGroupLocked ?? payload.isLocked));
    setIsVersionGroupProcurementLocked(Boolean(payload.isProcurementLocked));
    setIsBoqSubmitted(Boolean(selectedVersion?.isSubmitted || payload.isSubmitted));
  }, []);

  const reloadProjectAreas = useCallback(async () => {
    if (!projectId && !boqCode) {
      setProjectAreas([]);
      return;
    }

    try {
      const areasData = await fetchProjectBoqAreas(boqCode, { projectId });
      setProjectAreas(Array.isArray(areasData?.areas) ? areasData.areas : []);
    } catch {
      setProjectAreas([]);
    }
  }, [boqCode, projectId]);

  useEffect(() => {
    if (!boqCode) {
      setBoqProducts([]);
      setLoadedProductsBoqCode('');
      return undefined;
    }

    const requestId = productsRequestIdRef.current + 1;
    productsRequestIdRef.current = requestId;
    setIsLoadingProducts(true);
    setIsVersionsLoading(true);
    setProductsLoadError(null);

    Promise.allSettled([fetchProjectBoqVersions(boqCode), fetchProjectBoqProducts(boqCode)])
      .then(([versionsResult, productsResult]) => {
        if (productsRequestIdRef.current !== requestId) return;

        if (versionsResult.status === 'fulfilled') {
          applyVersionsPayload(versionsResult.value, boqCode);
        } else {
          setBoqVersions([]);
          showErrorToast(versionsResult.reason, {
            defaultMessage: 'Failed to load BOQ versions.',
          });
        }

        if (productsResult.status === 'fulfilled') {
          setBoqProducts(flattenBoqProductsResponse(productsResult.value));
          setLoadedProductsBoqCode(boqCode);
        } else {
          setBoqProducts([]);
          setLoadedProductsBoqCode(boqCode);
          setProductsLoadError(productsResult.reason?.message || 'Failed to load BOQ products.');
          showErrorToast(productsResult.reason, {
            defaultMessage: 'Failed to load BOQ products.',
          });
        }
      })
      .finally(() => {
        if (productsRequestIdRef.current !== requestId) return;
        setIsLoadingProducts(false);
        setIsVersionsLoading(false);
      });

    return () => {
      if (productsRequestIdRef.current === requestId) {
        productsRequestIdRef.current += 1;
      }
    };
  }, [applyVersionsPayload, boqCode]);

  useEffect(() => {
    if (!projectId && !boqCode) {
      setProjectFloors([]);
      setProjectAreas([]);
      return undefined;
    }

    let cancelled = false;

    Promise.all([
      fetchProjectBoqFloors(boqCode, { projectId }),
      fetchProjectBoqAreas(boqCode, { projectId }),
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
  }, [boqCode, projectId]);

  const familyMembers = useMemo(() => buildProjectBoqFamilyBadgeMembers(allRows), [allRows]);

  const handleClose = useCallback(() => {
    navigate('/boq/project-boqs');
  }, [navigate]);

  const handleFamilySelect = useCallback(
    (member) => {
      const nextCode = member?.code || member?.id;
      if (!nextCode || nextCode === boqRow?.code || nextCode === boqRow?.id) return;
      setIsLoadingProducts(true);
      setProductsLoadError(null);
      onActiveChildChange?.(nextCode);
    },
    [boqRow?.code, boqRow?.id, onActiveChildChange],
  );

  const handleAddBoqType = useCallback(
    (typeId) => {
      onAddBoqType?.(typeId);
    },
    [onAddBoqType],
  );

  const handleVersionChange = useCallback(
    async (nextVersionId) => {
      if (!nextVersionId || nextVersionId === selectedVersionId) return;

      const requestId = productsRequestIdRef.current + 1;
      productsRequestIdRef.current = requestId;
      const selectedVersion = boqVersions.find((version) => version.id === nextVersionId);

      setSelectedVersionId(nextVersionId);
      setVersionStatus(selectedVersion?.status ?? PROJECT_BOQ_VERSION_STATUS.DRAFT);
      setIsBoqSubmitted(Boolean(selectedVersion?.isSubmitted));
      setIsLoadingProducts(true);
      setProductsLoadError(null);

      try {
        const data = await fetchProjectBoqProducts(boqCode, { versionId: nextVersionId });
        if (productsRequestIdRef.current !== requestId) return;
        setBoqProducts(flattenBoqProductsResponse(data));
        setLoadedProductsBoqCode(boqCode);
      } catch (error) {
        if (productsRequestIdRef.current !== requestId) return;
        setBoqProducts([]);
        setLoadedProductsBoqCode(boqCode);
        setProductsLoadError(error?.message || 'Failed to load BOQ products.');
        showErrorToast(error, { defaultMessage: 'Failed to load BOQ products.' });
      } finally {
        if (productsRequestIdRef.current === requestId) {
          setIsLoadingProducts(false);
        }
      }
    },
    [boqCode, boqVersions, selectedVersionId],
  );

  const handleVersionStatusChange = useCallback(
    async (nextStatus) => {
      if (
        !boqCode ||
        !nextStatus ||
        nextStatus === versionStatus ||
        versionStatusUpdateInFlightRef.current
      ) {
        return;
      }

      versionStatusUpdateInFlightRef.current = true;
      setIsUpdatingVersionStatus(true);
      try {
        const data = await updateProjectBoqVersionStatus(selectedVersionId || boqCode, nextStatus);
        applyVersionsPayload(data, selectedVersionId || boqCode);
        if (nextStatus === PROJECT_BOQ_VERSION_STATUS.INITIATE_TO_PROCUREMENT) {
          showSuccessToast(
            `${getProjectBoqTypeLabel(boqRow?.boqType)} BOQ submitted and locked for procurement.`,
          );
        } else if (nextStatus === PROJECT_BOQ_VERSION_STATUS.LOCKED) {
          showSuccessToast('BOQ version locked.');
        } else if (versionStatus === PROJECT_BOQ_VERSION_STATUS.LOCKED) {
          showSuccessToast('BOQ version unlocked.');
        }
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update version status.' });
      } finally {
        // eslint-disable-next-line require-atomic-updates -- synchronous ref release after await
        versionStatusUpdateInFlightRef.current = false;
        setIsUpdatingVersionStatus(false);
      }
    },
    [applyVersionsPayload, boqCode, boqRow?.boqType, selectedVersionId, versionStatus],
  );

  const handleOpenCreateVersionModal = useCallback(() => {
    if (
      versionStatus === PROJECT_BOQ_VERSION_STATUS.INITIATE_TO_PROCUREMENT ||
      isVersionLocked ||
      isBoqSubmitted
    ) {
      return;
    }
    setIsCreateVersionModalOpen(true);
  }, [isBoqSubmitted, isVersionLocked, versionStatus]);

  const handleConfirmCreateVersion = useCallback(
    async ({ copyFromVersionCode } = {}) => {
      if (!boqCode) return;

      setIsCreatingVersion(true);
      try {
        const data = await createProjectBoqVersion(boqCode, { copyFromVersionCode });
        const newCode = data.newVersionCode || data.currentVersionId || '';
        setIsCreateVersionModalOpen(false);
        if (newCode) {
          onActiveChildChange?.(newCode);
        }
        showSuccessToast('New version created successfully.');
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to create new version.' });
      } finally {
        setIsCreatingVersion(false);
      }
    },
    [boqCode, onActiveChildChange],
  );

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

  const handleConvertToProduct = useCallback((lineItems = []) => {
    if (!Array.isArray(lineItems) || lineItems.length === 0) return;
    setConvertLineItems(lineItems);
    setIsConvertToProductOpen(true);
  }, []);

  const handleConvertedLineItem = useCallback((updatedLine) => {
    if (!updatedLine?.id) return;
    setBoqProducts((previous) =>
      previous.map((product) =>
        String(product.id) === String(updatedLine.id) ? { ...product, ...updatedLine } : product,
      ),
    );
    setConvertLineItems((previous) =>
      previous.filter((line) => String(line.id) !== String(updatedLine.id)),
    );
  }, []);

  const handleAddProductsFromMaster = useCallback(
    async (selectedProducts) => {
      if (!boqCode || !Array.isArray(selectedProducts) || selectedProducts.length === 0) return;

      setIsAddingProductsFromMaster(true);
      try {
        const result = await addBoqProductsFromMaster({
          target: BOQ_PRODUCT_TARGET.PROJECT,
          code: boqCode,
          selectedProducts,
        });

        const rows = flattenBoqProductsResponse(result);
        if (rows.length > 0) {
          setBoqProducts(rows);
        } else {
          const data = await fetchProjectBoqProducts(boqCode);
          setBoqProducts(flattenBoqProductsResponse(data));
        }

        const addedCount = Number(result?.added_count ?? result?.added?.length ?? 0);
        const skippedCount = Number(result?.skipped_count ?? result?.skipped?.length ?? 0);

        if (addedCount > 0) {
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
        showErrorToast(error, { defaultMessage: 'Failed to add products from product master.' });
        throw error;
      } finally {
        setIsAddingProductsFromMaster(false);
      }
    },
    [boqCode],
  );

  const handleAddProductsFromPreviousProjects = useCallback(
    async (selectedProducts) => {
      if (!boqCode || !Array.isArray(selectedProducts) || selectedProducts.length === 0) return;

      setIsAddingProductsFromPreviousProjects(true);
      try {
        const result = await addBoqProductsFromPreviousProjects({
          target: BOQ_PRODUCT_TARGET.PROJECT,
          code: boqCode,
          selectedProducts,
        });

        const rows = flattenBoqProductsResponse(result);
        if (rows.length > 0) {
          setBoqProducts(rows);
        } else {
          const data = await fetchProjectBoqProducts(boqCode);
          setBoqProducts(flattenBoqProductsResponse(data));
        }

        const addedCount = Number(result?.added_count ?? result?.added?.length ?? 0);
        const skippedCount = Number(result?.skipped_count ?? result?.skipped?.length ?? 0);

        if (addedCount > 0) {
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
    [boqCode],
  );

  const filteredProducts = useMemo(
    () =>
      filterBoqTemplateProducts(boqProducts, {
        searchQuery: productSearch,
        filters: appliedProductFilters,
      }),
    [appliedProductFilters, boqProducts, productSearch],
  );

  const existingBoqItemCodes = useMemo(
    () => buildBoqExistingItemCodeSet(boqProducts),
    [boqProducts],
  );

  const areaFilterOptions = useMemo(
    () => buildProjectBoqAreaLocationOptions(projectAreas),
    [projectAreas],
  );

  const handleAddProduct = useCallback(
    async (product, section) => {
      if (!boqCode) return;

      try {
        const apiPayload = buildBoqTemplateProductApiPayload(product, { section });
        const result = await createProjectBoqProduct(boqCode, apiPayload);
        const { product: savedProduct } = extractBoqTemplateProductMutationResult(result);

        setBoqProducts((previous) => [...previous, savedProduct]);

        const lumpsumSync = Array.isArray(result?.lumpsumSync) ? result.lumpsumSync : [];
        if (lumpsumSync.length > 0) {
          const floorLabels = lumpsumSync
            .map((entry) => entry.floor)
            .filter(Boolean)
            .join(', ');
          showSuccessToast(
            floorLabels
              ? `Product added. Lumpsum updated for ${floorLabels}.`
              : 'Product added. Lumpsum area updated for quantity.',
          );
          await reloadProjectAreas();
        } else {
          showSuccessToast('Product added successfully.');
        }
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to add product.' });
        throw error;
      }
    },
    [boqCode, reloadProjectAreas],
  );

  const handleDeleteProduct = useCallback(
    async (product) => {
      if (!product?.id || !boqCode) return;

      try {
        await deleteProjectBoqProduct(boqCode, product.id);
        setBoqProducts((previous) => previous.filter((item) => item.id !== product.id));
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to delete product.' });
        throw error;
      }
    },
    [boqCode],
  );

  const handleDeleteProducts = useCallback(
    async (productsToDelete = []) => {
      if (!boqCode || !Array.isArray(productsToDelete) || productsToDelete.length === 0) return;

      try {
        for (const product of productsToDelete) {
          if (!product?.id) continue;
          await deleteProjectBoqProduct(boqCode, product.id);
        }

        const deletedIds = new Set(productsToDelete.map((product) => product.id).filter(Boolean));
        setBoqProducts((previous) => previous.filter((item) => !deletedIds.has(item.id)));
        showSuccessToast(
          productsToDelete.length === 1
            ? 'Product deleted successfully.'
            : `${productsToDelete.length} products deleted successfully.`,
        );
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to delete products.' });
        throw error;
      }
    },
    [boqCode],
  );

  const handleUpdateProduct = useCallback(
    async (updatedProduct) => {
      if (!updatedProduct?.id || !boqCode) return;

      try {
        const apiPayload = buildBoqTemplateProductApiPayload(updatedProduct, {
          section: updatedProduct.section,
        });
        const result = await updateProjectBoqProduct(boqCode, updatedProduct.id, apiPayload);
        const { product: savedProduct } = extractBoqTemplateProductMutationResult(result);
        setBoqProducts((previous) =>
          previous.map((item) => (item.id === savedProduct.id ? savedProduct : item)),
        );

        const lumpsumSync = Array.isArray(result?.lumpsumSync) ? result.lumpsumSync : [];
        if (lumpsumSync.length > 0) {
          const floorLabels = lumpsumSync
            .map((entry) => entry.floor)
            .filter(Boolean)
            .join(', ');
          showSuccessToast(
            floorLabels
              ? `Lumpsum updated for ${floorLabels}.`
              : 'Lumpsum area updated for quantity change.',
          );
          await reloadProjectAreas();
        }
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to update product.' });
      }
    },
    [boqCode, reloadProjectAreas],
  );

  const handleErQuantitiesCommit = useCallback(({ productId, quantityByFloor, quantity }) => {
    if (!productId) return;
    setBoqProducts((previous) =>
      previous.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantityByFloor: Array.isArray(quantityByFloor)
                ? quantityByFloor
                : item.quantityByFloor,
              quantity: quantity || item.quantity,
            }
          : item,
      ),
    );
  }, []);

  const handleErStatusCommit = useCallback(({ productId, erStatus }) => {
    if (!productId || !erStatus) return;
    setBoqProducts((previous) =>
      previous.map((item) => (item.id === productId ? { ...item, erStatus } : item)),
    );
  }, []);

  const handleAllDescriptionsExpandedChange = useCallback((next) => {
    setAllDescriptionsExpanded(Boolean(next));
  }, []);

  const isOverviewTab = activeSectionTab === PROJECT_BOQ_DETAIL_SECTION_TAB_IDS.OVERVIEW;
  const showProductsToolbar =
    !isOverviewTab &&
    activeSectionTab !== PROJECT_BOQ_DETAIL_SECTION_TAB_IDS.PACKAGE_STRATEGY &&
    activeSectionTab !== PROJECT_BOQ_DETAIL_SECTION_TAB_IDS.PROCUREMENT_PACKAGES;

  const isViewingCurrentVersion = selectedVersionId === currentVersionId;
  const isProcurementStatusBlocked = useMemo(
    () => !areAllBoqErStatusesCompleted(boqProducts),
    [boqProducts],
  );
  const isProcurementLocked =
    versionStatus === PROJECT_BOQ_VERSION_STATUS.INITIATE_TO_PROCUREMENT ||
    isVersionLocked ||
    isBoqSubmitted;
  const isProductsEditable =
    (isFullscreen || activeSectionTab === PROJECT_BOQ_DETAIL_SECTION_TAB_IDS.COMPARISON_BOQ) &&
    !isProcurementLocked;
  const shouldShowProductsToolbar = isFullscreen || showProductsToolbar;
  const isCurrentBoqProductsLoading = isLoadingProducts || loadedProductsBoqCode !== boqCode;

  const renderProductsListing = useCallback(
    (priceView) => {
      const financialSummaryVariant =
        PROJECT_BOQ_FINANCIAL_SUMMARY_BY_PRICE_VIEW[priceView] ?? 'full';
      const readOnly = priceView !== PROJECT_BOQ_PRICE_VIEW.COMPARISON || !isProductsEditable;

      if (isCurrentBoqProductsLoading) {
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

      return (
        <BoqTemplateProductsListing
          products={filteredProducts}
          onAddProduct={readOnly ? undefined : handleAddProduct}
          onDeleteProduct={readOnly ? undefined : handleDeleteProduct}
          onDeleteProducts={readOnly ? undefined : handleDeleteProducts}
          onUpdateProduct={readOnly ? undefined : handleUpdateProduct}
          columnConfig={columnConfigHook.columns}
          allDescriptionsExpanded={allDescriptionsExpanded}
          onAllDescriptionsExpandedChange={handleAllDescriptionsExpandedChange}
          financialSummaryVariant={financialSummaryVariant}
          priceView={priceView}
          readOnly={readOnly}
          viewMode={productViewMode}
          projectFloors={projectFloors}
          projectAreas={projectAreas}
          useProjectBoqColumns
          boqCode={boqCode}
          projectId={projectId}
          onErQuantitiesCommit={handleErQuantitiesCommit}
          onErStatusCommit={handleErStatusCommit}
          onConvertToProduct={readOnly ? undefined : handleConvertToProduct}
        />
      );
    },
    [
      allDescriptionsExpanded,
      boqProducts.length,
      columnConfigHook.columns,
      filteredProducts,
      handleAllDescriptionsExpandedChange,
      handleDeleteProduct,
      handleDeleteProducts,
      handleAddProduct,
      handleUpdateProduct,
      handleErQuantitiesCommit,
      handleErStatusCommit,
      handleConvertToProduct,
      isCurrentBoqProductsLoading,
      isProductsEditable,
      productViewMode,
      productsLoadError,
      projectFloors,
      projectAreas,
      boqCode,
      projectId,
    ],
  );

  const productsPanelClassName =
    productViewMode === BOQ_PRODUCT_LISTING_VIEW_MODES.MULTI
      ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
      : 'min-h-0 flex-1 overflow-auto px-8 pb-10';

  if (!boqRow) return null;

  const pageTitle = getProjectBoqDetailTitle(boqRow);
  const hasCurrentBoqProducts = loadedProductsBoqCode === boqCode;
  const subtitle = formatProjectBoqDetailSubtitle(boqRow, {
    productCount: hasCurrentBoqProducts ? boqProducts.length : 0,
    floorsLabel: hasCurrentBoqProducts ? deriveBoqProductFloorsLabel(boqProducts) : '',
  });

  return (
    <div className='flex min-h-0 flex-1 flex-col bg-bg-white-0'>
      <BoqTemplateAddProductMasterModal
        open={addProductMasterModalOpen}
        onOpenChange={setAddProductMasterModalOpen}
        onAddProducts={handleAddProductsFromMaster}
        isSubmitting={isAddingProductsFromMaster}
        existingItemCodes={existingBoqItemCodes}
      />

      <BoqTemplateAddPreviousProjectsModal
        open={addPreviousProjectsModalOpen}
        onOpenChange={setAddPreviousProjectsModalOpen}
        onAddProducts={handleAddProductsFromPreviousProjects}
        isSubmitting={isAddingProductsFromPreviousProjects}
        excludeProjectId={boqRow?.projectId || boqRow?.project}
      />

      <BoqConvertToProductModal
        open={isConvertToProductOpen}
        onOpenChange={setIsConvertToProductOpen}
        lineItems={convertLineItems}
        boqContext={{ type: 'project', boqCode }}
        onConverted={handleConvertedLineItem}
      />

      <CreateProjectBoqVersionModal
        open={isCreateVersionModalOpen}
        onOpenChange={setIsCreateVersionModalOpen}
        onSubmit={handleConfirmCreateVersion}
        isSubmitting={isCreatingVersion}
        versions={boqVersions}
      />

      <TabMenuHorizontal.Root
        value={activeSectionTab}
        onValueChange={setActiveSectionTab}
        className='project-boq-detail-section-tabs flex min-h-0 flex-1 flex-col [&_.group\\/tab-list>div:last-child]:!bg-[#16a34a]'
      >
        <ProjectBoqDetailHeader
          title={pageTitle}
          subtitle={subtitle}
          onClose={handleClose}
          onAddBoqType={handleAddBoqType}
          isFullscreen={isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />

        {!isFullscreen ? <ProjectBoqDetailSectionTabs /> : null}

        {!isFullscreen && !isOverviewTab ? (
          <ProjectBoqFamilyBadges
            members={familyMembers}
            activeId={boqRow.code || boqRow.id}
            onSelect={handleFamilySelect}
            onAddAdditional={() => handleAddBoqType(PROJECT_BOQ_TYPES.ADDITIONAL)}
          />
        ) : null}

        {shouldShowProductsToolbar ? (
          <div className='shrink-0 px-8 pb-5 pt-6'>
            <ProjectBoqProductsToolbar
              searchValue={productSearch}
              onSearchChange={setProductSearch}
              appliedFilters={appliedProductFilters}
              onFiltersChange={handleProductFiltersChange}
              areaOptions={areaFilterOptions}
              onNewProductSelect={handleNewProductSelect}
              newProductOptions={PROJECT_BOQ_NEW_PRODUCT_OPTIONS}
              showNewProduct={isProductsEditable}
              columnConfig={columnConfigHook}
              allDescriptionsExpanded={allDescriptionsExpanded}
              onAllDescriptionsExpandedChange={handleAllDescriptionsExpandedChange}
              versions={boqVersions}
              version={selectedVersionId}
              onVersionChange={handleVersionChange}
              versionStatus={versionStatus}
              onVersionStatusChange={handleVersionStatusChange}
              isVersionLocked={isProcurementLocked}
              isStatusLocked={isVersionGroupProcurementLocked}
              isStatusChangeDisabled={isVersionsLoading || isUpdatingVersionStatus}
              isProcurementStatusBlocked={isProcurementStatusBlocked}
              isViewingCurrentVersion={isViewingCurrentVersion}
              onCreateVersion={handleOpenCreateVersionModal}
              isCreatingVersion={isCreatingVersion}
              viewMode={productViewMode}
              onViewModeChange={setProductViewMode}
            />
          </div>
        ) : null}

        {isFullscreen ? (
          <div className='relative min-h-0 flex-1 overflow-y-auto overscroll-contain'>
            <div
              className={
                productViewMode === BOQ_PRODUCT_LISTING_VIEW_MODES.MULTI
                  ? 'flex min-h-0 flex-col pb-4'
                  : 'px-8 pb-24'
              }
            >
              {renderProductsListing(PROJECT_BOQ_PRICE_VIEW.COMPARISON)}
              <ProjectBoqFullscreenFamilyDock
                members={familyMembers}
                activeId={boqRow.code || boqRow.id}
                onSelect={handleFamilySelect}
              />
            </div>
          </div>
        ) : (
          <>
            <TabMenuHorizontal.Content
              value={PROJECT_BOQ_DETAIL_SECTION_TAB_IDS.OVERVIEW}
              className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none'
            >
              <ProjectBoqOverviewTab
                familyMembers={familyMembers}
                familyCode={boqRow?.familyId || boqCode}
                activeBoqCode={boqCode}
              />
            </TabMenuHorizontal.Content>

            <TabMenuHorizontal.Content
              value={PROJECT_BOQ_DETAIL_SECTION_TAB_IDS.COMPARISON_BOQ}
              className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none'
            >
              <div className={productsPanelClassName}>
                {renderProductsListing(PROJECT_BOQ_PRICE_VIEW.COMPARISON)}
              </div>
            </TabMenuHorizontal.Content>

            <TabMenuHorizontal.Content
              value={PROJECT_BOQ_DETAIL_SECTION_TAB_IDS.INTERNAL_BOQ}
              className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none'
            >
              <div className={productsPanelClassName}>
                {renderProductsListing(PROJECT_BOQ_PRICE_VIEW.INTERNAL)}
              </div>
            </TabMenuHorizontal.Content>

            <TabMenuHorizontal.Content
              value={PROJECT_BOQ_DETAIL_SECTION_TAB_IDS.CLIENT_BOQ}
              className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none'
            >
              <div className={productsPanelClassName}>
                {renderProductsListing(PROJECT_BOQ_PRICE_VIEW.CLIENT)}
              </div>
            </TabMenuHorizontal.Content>

            <TabMenuHorizontal.Content
              value={PROJECT_BOQ_DETAIL_SECTION_TAB_IDS.PACKAGE_STRATEGY}
              className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none'
            >
              <ProjectBoqSectionPlaceholder label='Package strategy' />
            </TabMenuHorizontal.Content>

            <TabMenuHorizontal.Content
              value={PROJECT_BOQ_DETAIL_SECTION_TAB_IDS.PROCUREMENT_PACKAGES}
              className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none'
            >
              <ProjectBoqSectionPlaceholder label='Procurement packages' />
            </TabMenuHorizontal.Content>
          </>
        )}
      </TabMenuHorizontal.Root>
    </div>
  );
};

export default ProjectBoqDetailView;
