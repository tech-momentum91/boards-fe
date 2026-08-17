import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  listProducts,
  groupProductListRowsClient,
  PRODUCTS_GROUP_ITEMS_LIMIT,
  PRODUCTS_GROUP_LIST_LIMIT,
} from '@/api/products';
import {
  createEmptyProductsFilters,
  createDefaultProductsViewState,
  getProductsAddButtonLabel,
  getProductsEmptyLabel,
  getProductsGroupByDefault,
  getProductsGroupByOptions,
  getProductsViewPersistFilterKeys,
  getProductsViewPersistSessionKey,
  PRODUCTS_TAB_IDS,
  productsTabSupportsGroupAndFilter,
  resolveProductsGroupBy,
  resolveProductsGroupOrder,
} from '@/components/products/constants';
import { buildProductsColumnDefsForTab } from '@/components/products/products-column-defs';
import { productsTabUsesVariantSubRows } from '@/components/products/products-catalog-list';
import { patchVariationImageInListRows } from '@/components/products/variation-media';
import ProductsGroupSection, {
  packageSubRows,
  variantSubRows,
} from '@/components/products/products-group-section';
import { buildSubRowConfigForTab } from '@/components/products/products-subrow-columns';
import { buildProductsListApiFilters } from '@/components/products/products-filters';
import ProductsTable from '@/components/products/products-table';
import ProductsToolbar from '@/components/products/products-toolbar';
import { useProductsColumnConfig } from '@/components/products/use-products-column-config';
import { useDebounce } from '@/hooks/use-debounce';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { showErrorToast } from '@/utils/error-utils';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';

const PRODUCTS_LIST_PAGE_SIZE = 200;

const ProductsTabPanel = ({
  tabId,
  isActive = false,
  onAddProduct,
  onOpenPackageDetail,
  onOpenProductDetail,
  listRefreshKey = 0,
  listVariationPatch = null,
  onListVariationPatchApplied,
}) => {
  const supportsGroupAndFilter = productsTabSupportsGroupAndFilter(tabId);
  const [searchValue, setSearchValue] = useState('');
  const [sourceRows, setSourceRows] = useState([]);
  const [groupedSections, setGroupedSections] = useState([]);
  const [hasMoreGroups, setHasMoreGroups] = useState(false);
  const [groupLimitStart, setGroupLimitStart] = useState(0);
  const [isLoadingMoreGroups, setIsLoadingMoreGroups] = useState(false);
  const [groupItemsLoading, setGroupItemsLoading] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const fetchRequestIdRef = useRef(0);
  const groupedSectionsRef = useRef([]);
  const groupItemsLoadingRef = useRef({});
  const productNavigationItemsRef = useRef([]);
  const packageNavigationItemsRef = useRef([]);
  const [scrollContainerEl, setScrollContainerEl] = useState(null);

  const defaultViewState = useMemo(() => createDefaultProductsViewState(tabId), [tabId]);
  const persistFilterKeys = useMemo(() => getProductsViewPersistFilterKeys(tabId), [tabId]);
  const groupByOptions = useMemo(() => getProductsGroupByOptions(tabId), [tabId]);
  const groupByDefault = useMemo(() => getProductsGroupByDefault(tabId), [tabId]);

  const [viewState, setViewState] = usePersistedFilters({
    storageKey: getProductsViewPersistSessionKey(tabId),
    defaultFilters: defaultViewState,
    persistIncludeKeys: ['groupBy', 'groupOrder', ...persistFilterKeys],
    persistScalarDiffKeys: ['groupBy', 'groupOrder'],
    persistTrimStringArrays: true,
  });

  const groupBy = resolveProductsGroupBy(viewState.groupBy, tabId);
  const groupOrder = resolveProductsGroupOrder(viewState.groupOrder);

  const appliedFilters = useMemo(() => {
    const filters = createEmptyProductsFilters(tabId);
    for (const key of persistFilterKeys) {
      if (Array.isArray(viewState[key])) {
        filters[key] = viewState[key];
      }
    }
    return filters;
  }, [persistFilterKeys, tabId, viewState]);

  const debouncedSearch = useDebounce(searchValue, 400);

  useEffect(() => {
    if (!listVariationPatch || !isActive) return;
    setSourceRows((rows) =>
      patchVariationImageInListRows(
        rows,
        listVariationPatch.templateId,
        listVariationPatch.variantId,
        listVariationPatch.imageUrl,
      ),
    );
  }, [isActive, listVariationPatch]);

  const columnConfigHook = useProductsColumnConfig(tabId);

  const isProductPackageTab = tabId === PRODUCTS_TAB_IDS.PRODUCT_PACKAGE;
  const groupSubRows = isProductPackageTab
    ? packageSubRows
    : productsTabUsesVariantSubRows(tabId)
      ? variantSubRows
      : undefined;

  const productNavigationItems = useMemo(() => {
    const rows =
      groupedSections.length > 0 ? groupedSections.flatMap((section) => section.rows) : sourceRows;
    return rows.map((row) => ({ id: row.id, detailId: row.detailId }));
  }, [groupedSections, sourceRows]);

  const packageNavigationItems = useMemo(() => {
    const rows =
      groupedSections.length > 0 ? groupedSections.flatMap((section) => section.rows) : sourceRows;
    return rows
      .filter((row) => row.products != null)
      .map((row) => ({ id: row.id, detailId: row.detailId }));
  }, [groupedSections, sourceRows]);

  groupedSectionsRef.current = groupedSections;
  productNavigationItemsRef.current = productNavigationItems;
  packageNavigationItemsRef.current = packageNavigationItems;

  // Keep detail openers stable so columnDefsById does not rebuild (and re-render every
  // group table) when scroll-pagination appends rows to one accordion.
  const openProductDetail = useCallback(
    (productId, navigationItems) => {
      onOpenProductDetail?.(productId, navigationItems ?? productNavigationItemsRef.current);
    },
    [onOpenProductDetail],
  );

  const openPackageDetail = useCallback(
    (packageId, navigationItems) => {
      onOpenPackageDetail?.(packageId, navigationItems ?? packageNavigationItemsRef.current);
    },
    [onOpenPackageDetail],
  );

  const columnDefsById = useMemo(
    () =>
      buildProductsColumnDefsForTab(tabId, {
        onPackageOpen: isProductPackageTab ? openPackageDetail : undefined,
        onProductOpen: openProductDetail,
        useRowClickNavigation: true,
      }),
    [isProductPackageTab, openPackageDetail, openProductDetail, tabId],
  );

  const subRowConfig = useMemo(
    () =>
      buildSubRowConfigForTab(tabId, {
        onProductOpen: openProductDetail,
        useRowClickNavigation: true,
      }),
    [openProductDetail, tabId],
  );

  const handleRowClick = useCallback(
    (row) => {
      const id = row?.id;
      if (!id) return;

      if (isProductPackageTab) {
        if (row.products != null) {
          openPackageDetail(id);
          return;
        }
        openProductDetail(id);
        return;
      }

      openProductDetail(id);
    },
    [isProductPackageTab, openPackageDetail, openProductDetail],
  );

  const apiFilters = useMemo(() => {
    if (!supportsGroupAndFilter) return undefined;
    return buildProductsListApiFilters(appliedFilters, tabId);
  }, [appliedFilters, supportsGroupAndFilter, tabId]);

  const buildGroupedListParams = useCallback(
    (overrides = {}) => ({
      devxProductType: tabId,
      keyword: debouncedSearch.trim() || undefined,
      filters: apiFilters,
      groupBy,
      groupOrder,
      groupLimit: PRODUCTS_GROUP_LIST_LIMIT,
      groupItems: PRODUCTS_GROUP_ITEMS_LIMIT,
      ...overrides,
    }),
    [apiFilters, debouncedSearch, groupBy, groupOrder, tabId],
  );

  useEffect(() => {
    if (!isActive) return undefined;

    const requestId = fetchRequestIdRef.current + 1;
    fetchRequestIdRef.current = requestId;
    setIsLoading(true);
    setLoadError(null);
    setHasMoreGroups(false);
    setGroupLimitStart(0);
    groupItemsLoadingRef.current = {};
    setGroupItemsLoading({});

    const request = supportsGroupAndFilter
      ? listProducts(buildGroupedListParams({ groupLimitStart: 0 }))
      : listProducts({
          devxProductType: tabId,
          keyword: debouncedSearch.trim() || undefined,
          limitPageLength: PRODUCTS_LIST_PAGE_SIZE,
          filters: apiFilters,
        });

    request
      .then((result) => {
        if (requestId !== fetchRequestIdRef.current) return;

        if (result.isGrouped) {
          setGroupedSections(result.groups ?? []);
          setHasMoreGroups(Boolean(result.hasMoreGroups));
          setGroupLimitStart(result.groupLimitStart ?? 0);
          setSourceRows([]);
        } else {
          const patchedRows = listVariationPatch
            ? patchVariationImageInListRows(
                result.rows ?? [],
                listVariationPatch.templateId,
                listVariationPatch.variantId,
                listVariationPatch.imageUrl,
              )
            : (result.rows ?? []);
          setSourceRows(patchedRows);
          // Develop/local list API may return flat `data` without `is_grouped`.
          // Still build accordion sections so group+filter tabs are not empty.
          setGroupedSections(
            supportsGroupAndFilter
              ? groupProductListRowsClient(patchedRows, groupBy, groupOrder)
              : [],
          );
          setHasMoreGroups(false);
        }

        if (listVariationPatch) onListVariationPatchApplied?.();
      })
      .catch((error) => {
        if (requestId !== fetchRequestIdRef.current) return;
        setSourceRows([]);
        setGroupedSections([]);
        setHasMoreGroups(false);
        setLoadError(error);
        showErrorToast(error, { defaultMessage: 'Failed to load products.' });
      })
      .finally(() => {
        if (requestId === fetchRequestIdRef.current) setIsLoading(false);
      });

    return () => {
      fetchRequestIdRef.current += 1;
    };
  }, [
    apiFilters,
    buildGroupedListParams,
    debouncedSearch,
    groupBy,
    groupOrder,
    isActive,
    listRefreshKey,
    listVariationPatch,
    onListVariationPatchApplied,
    supportsGroupAndFilter,
    tabId,
  ]);

  const handleLoadMoreGroups = useCallback(async () => {
    if (!supportsGroupAndFilter || !hasMoreGroups || isLoadingMoreGroups || isLoading) return;

    const nextGroupLimitStart = groupLimitStart + PRODUCTS_GROUP_LIST_LIMIT;
    setIsLoadingMoreGroups(true);

    try {
      const result = await listProducts(
        buildGroupedListParams({ groupLimitStart: nextGroupLimitStart }),
      );
      if (!result.isGrouped) return;

      startTransition(() => {
        setGroupedSections((previous) => {
          const existingIds = new Set(previous.map((section) => section.id));
          const nextSections = (result.groups ?? []).filter(
            (section) => !existingIds.has(section.id),
          );
          return [...previous, ...nextSections];
        });
        setHasMoreGroups(Boolean(result.hasMoreGroups));
        setGroupLimitStart(result.groupLimitStart ?? nextGroupLimitStart);
      });
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to load more groups.' });
    } finally {
      setIsLoadingMoreGroups(false);
    }
  }, [
    buildGroupedListParams,
    groupLimitStart,
    hasMoreGroups,
    isLoading,
    isLoadingMoreGroups,
    supportsGroupAndFilter,
  ]);

  const handleLoadMoreGroupItems = useCallback(
    async (sectionId) => {
      const section = groupedSectionsRef.current.find((entry) => entry.id === sectionId);
      if (!section?.hasMore || groupItemsLoadingRef.current[sectionId]) return;

      groupItemsLoadingRef.current = { ...groupItemsLoadingRef.current, [sectionId]: true };
      setGroupItemsLoading(groupItemsLoadingRef.current);

      const clearSectionLoading = () => {
        const nextLoading = { ...groupItemsLoadingRef.current };
        delete nextLoading[sectionId];
        groupItemsLoadingRef.current = nextLoading;
        setGroupItemsLoading(nextLoading);
      };

      try {
        const result = await listProducts(
          buildGroupedListParams({
            groupValue: section.groupName,
            groupItemStart: section.rows.length,
          }),
        );
        const updatedGroup = result.groups?.[0];
        if (!updatedGroup) {
          clearSectionLoading();
          return;
        }

        // Defer heavy table re-render so IntersectionObserver scroll stays smooth.
        // Clear loading in the same transition so the sentinel cannot re-fire with stale rows.
        startTransition(() => {
          setGroupedSections((previous) =>
            previous.map((current) =>
              current.id === sectionId
                ? {
                    ...current,
                    rows: [...current.rows, ...updatedGroup.rows],
                    hasMore: updatedGroup.hasMore,
                    loadedCount: updatedGroup.loadedCount,
                  }
                : current,
            ),
          );
          clearSectionLoading();
        });
      } catch (error) {
        clearSectionLoading();
        showErrorToast(error, { defaultMessage: 'Failed to load more products.' });
      }
    },
    [buildGroupedListParams],
  );

  const { renderSentinel: renderGroupsSentinel } = useScrollPagination({
    onLoadMore: handleLoadMoreGroups,
    hasMore: hasMoreGroups,
    isLoading: isLoadingMoreGroups || isLoading,
    scrollContainer: scrollContainerEl,
    enabled: supportsGroupAndFilter && groupedSections.length > 0,
  });

  const handleGroupByChange = useCallback(
    (next) => {
      setViewState((previous) => ({
        ...previous,
        groupBy: resolveProductsGroupBy(next, tabId),
      }));
    },
    [setViewState, tabId],
  );

  const handleGroupOrderChange = useCallback(
    (next) => {
      setViewState((previous) => ({
        ...previous,
        groupOrder: resolveProductsGroupOrder(next),
      }));
    },
    [setViewState],
  );

  const handleFiltersApply = useCallback(
    (nextFilters) => {
      if (nextFilters === null) {
        setViewState((previous) => ({
          ...previous,
          ...createEmptyProductsFilters(tabId),
        }));
        return;
      }
      setViewState((previous) => ({
        ...previous,
        ...createEmptyProductsFilters(tabId),
        ...nextFilters,
      }));
    },
    [setViewState, tabId],
  );

  const handleAddProduct = useCallback(() => {
    onAddProduct?.(tabId);
  }, [onAddProduct, tabId]);

  const emptyLabel = getProductsEmptyLabel(tabId);
  const errorLabel = 'Failed to load products. Please try again.';

  const tableContent = loadError ? (
    <div className='w-full overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-sm'>
      <div className='flex flex-col items-center justify-center py-12'>
        <p className='text-paragraph-sm font-medium text-red-600'>{errorLabel}</p>
      </div>
    </div>
  ) : supportsGroupAndFilter ? (
    groupedSections.length === 0 ? (
      <ProductsTable
        rows={sourceRows}
        columnConfig={columnConfigHook.columns}
        columnDefsById={columnDefsById}
        emptyLabel={emptyLabel}
        isLoading={isLoading}
        onRowClick={handleRowClick}
      />
    ) : (
      <div className='flex flex-col gap-4'>
        {groupedSections.map((section) => (
          <ProductsGroupSection
            key={section.id}
            section={section}
            columnConfig={columnConfigHook.columns}
            columnDefsById={columnDefsById}
            variant='card'
            getSubRows={groupSubRows}
            subRowColumns={subRowConfig?.columns}
            subRowColumnDefsById={subRowConfig?.columnDefsById}
            onRowClick={handleRowClick}
            onLoadMoreItems={handleLoadMoreGroupItems}
            hasMoreItems={section.hasMore}
            isLoadingMoreItems={Boolean(groupItemsLoading[section.id])}
          />
        ))}
        {renderGroupsSentinel()}
      </div>
    )
  ) : (
    <ProductsTable
      rows={sourceRows}
      columnConfig={columnConfigHook.columns}
      columnDefsById={columnDefsById}
      emptyLabel={emptyLabel}
      isLoading={isLoading}
      onRowClick={handleRowClick}
    />
  );

  return (
    <TabMenuHorizontal.Content
      value={tabId}
      className='flex min-h-0 flex-1 flex-col overflow-hidden outline-none data-[state=inactive]:hidden'
    >
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden py-6'>
        <div className='shrink-0 px-8 pb-4'>
          <ProductsToolbar
            tabId={tabId}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            columnConfig={columnConfigHook}
            addButtonLabel={getProductsAddButtonLabel(tabId)}
            onAddProduct={handleAddProduct}
            showGroupBy={supportsGroupAndFilter}
            groupBy={groupBy}
            onGroupByChange={handleGroupByChange}
            groupOrder={groupOrder}
            onGroupOrderChange={handleGroupOrderChange}
            groupByOptions={groupByOptions}
            groupByDefault={groupByDefault}
            showFilter={supportsGroupAndFilter}
            appliedFilters={appliedFilters}
            onFiltersApply={handleFiltersApply}
          />
        </div>

        {/* px on the scroller so left/right gutters are still wheel-scroll targets */}
        <div
          ref={setScrollContainerEl}
          className='flex min-h-0 flex-1 flex-col overflow-y-auto px-8'
        >
          {tableContent}
        </div>
      </div>
    </TabMenuHorizontal.Content>
  );
};

export default ProductsTabPanel;
