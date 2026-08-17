import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { STOCKS_FILTER_VALUE_ALL, STOCKS_TAB_IDS } from '@/components/stocks/constants';
import CreateProductBulkUploadModal from '@/components/stocks/product-master/components/create-product-bulk-upload-modal';
import ProductMasterExportModal from '@/components/stocks/product-master/components/product-master-export-modal';
import ProductDetailDrawer from '@/components/products/product-detail-drawer';
import ProductsAddItemDrawer from '@/components/products/products-add-item-drawer';
import ProductMasterTable, {
  useStocksProductMasterColumnConfig,
} from '@/components/stocks/product-master/components/product-master-table';
import ProductMasterToolbar from '@/components/stocks/product-master/components/product-master-toolbar';
import {
  downloadProductMasterExport,
  downloadProductMasterImportSample,
  importProductMasterFile,
} from '@/components/stocks/product-master/api/product-master-export-import';
import {
  buildStocksCategoryOptions,
  buildStocksOrderBy,
  EMPTY_STOCKS_SORTING,
  resolveStocksEmptyContext,
} from '@/components/stocks/stocks-helper';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import {
  buildProductMasterUpdatePayload,
  createStockUom,
  fetchProductMasterList,
  fetchProductMasterCategories,
  fetchStockUoms,
  selectProductMasterListState,
  selectProductMasterCategoryGroupsState,
  selectStockUomsState,
  updateProductMasterFields,
} from '@/redux/stocksSlice';
import { createProduct } from '@/api/products';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { RiArrowDownSLine } from 'react-icons/ri';

const SEARCH_DEBOUNCE_MS = 400;
const PRODUCT_MASTER_SORT_FIELD_MAP = {
  product: 'item_name',
  category: 'item_group',
  unit: 'stock_uom',
  type: 'custom_type',
  brand: 'brand',
  price: 'price',
  status: 'disabled',
  createBy: 'owner',
  createAt: 'creation',
  lastModifiedAt: 'modified',
};

const ProductMaster = ({ isActive = false }) => {
  const dispatch = useDispatch();
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState([STOCKS_FILTER_VALUE_ALL]);
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [sorting, setSorting] = useState(EMPTY_STOCKS_SORTING);
  const [isAddProductDrawerOpen, setIsAddProductDrawerOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingSample, setIsDownloadingSample] = useState(false);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const [productDetailId, setProductDetailId] = useState(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const columnConfigHook = useStocksProductMasterColumnConfig();
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const list = useSelector(selectProductMasterListState);
  const productMasterCategoryGroupsState = useSelector(selectProductMasterCategoryGroupsState);
  const stockUomsState = useSelector(selectStockUomsState);
  const orderBy = useMemo(
    () => buildStocksOrderBy(sorting, PRODUCT_MASTER_SORT_FIELD_MAP, 'modified desc'),
    [sorting],
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchValue]);

  const listFetchArgs = useMemo(
    () => ({
      keyword: debouncedSearch,
      categoryFilter,
      groupBy,
      groupOrder,
      orderBy,
    }),
    [debouncedSearch, categoryFilter, groupBy, groupOrder, orderBy],
  );

  const refetchList = useCallback(() => {
    return dispatch(fetchProductMasterList({ ...listFetchArgs, reset: true }));
  }, [dispatch, listFetchArgs]);

  useEffect(() => {
    if (!isActive) return;
    refetchList();
  }, [isActive, refetchList]);

  const listReady = list.status === 'succeeded' && !list.isLoading && !list.isLoadingMore;

  const handleLoadMore = useCallback(() => {
    if (!isActive || !listReady || !list.hasMore) return;
    dispatch(fetchProductMasterList({ ...listFetchArgs, reset: false }));
  }, [dispatch, isActive, listReady, list.hasMore, listFetchArgs]);

  const { renderSentinel } = useScrollPagination({
    onLoadMore: handleLoadMore,
    hasMore: Boolean(list.hasMore),
    isLoading: Boolean(list.isLoading || list.isLoadingMore),
    threshold: 200,
    scrollContainer: null,
    enabled: Boolean(isActive && list.hasMore && listReady),
  });

  useEffect(() => {
    if (isActive && productMasterCategoryGroupsState.status === 'idle') {
      dispatch(fetchProductMasterCategories());
    }
  }, [dispatch, isActive, productMasterCategoryGroupsState.status]);

  useEffect(() => {
    if (isActive && stockUomsState.status === 'idle') {
      dispatch(fetchStockUoms());
    }
  }, [dispatch, isActive, stockUomsState.status]);

  const ensureStockUomsLoaded = useCallback(() => {
    if (stockUomsState.status === 'idle') {
      dispatch(fetchStockUoms());
    }
  }, [dispatch, stockUomsState.status]);

  const ensureProductMasterCategoriesLoaded = useCallback(() => {
    if (
      productMasterCategoryGroupsState.status === 'idle' ||
      productMasterCategoryGroupsState.status === 'failed'
    ) {
      dispatch(fetchProductMasterCategories());
    }
  }, [dispatch, productMasterCategoryGroupsState.status]);

  const handleOpenAddProductDrawer = useCallback(() => {
    setIsAddProductDrawerOpen(true);
  }, []);

  const handleBulkUploadClick = useCallback(() => {
    ensureStockUomsLoaded();
    ensureProductMasterCategoriesLoaded();
    setIsBulkUploadModalOpen(true);
  }, [ensureProductMasterCategoriesLoaded, ensureStockUomsLoaded]);

  const handleDownloadClick = useCallback(() => {
    setIsExportModalOpen(true);
  }, []);

  const handleExportConfirm = useCallback(
    async ({ columns }) => {
      setIsExporting(true);
      try {
        await downloadProductMasterExport({
          columns,
          keyword: debouncedSearch,
          categoryFilter,
          orderBy,
        });
        showSuccessToast('Product master exported.');
        setIsExportModalOpen(false);
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to export products.' });
      } finally {
        setIsExporting(false);
      }
    },
    [debouncedSearch, categoryFilter, orderBy],
  );

  const handleDownloadImportSample = useCallback(async () => {
    setIsDownloadingSample(true);
    try {
      await downloadProductMasterImportSample();
      showSuccessToast('Sample template downloaded.');
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to download sample template.' });
    } finally {
      setIsDownloadingSample(false);
    }
  }, []);

  const productNavigationItems = useMemo(
    () => list.items.map((row) => ({ id: row.id, detailId: row.id })),
    [list.items],
  );

  const handleOpenProductDetails = useCallback((product) => {
    if (!product?.id) return;
    setProductDetailId(product.id);
    setIsProductDetailOpen(true);
  }, []);

  const handleProductDetailOpenChange = useCallback((open) => {
    setIsProductDetailOpen(open);
    if (!open) {
      setProductDetailId(null);
    }
  }, []);

  const handleListRefresh = useCallback(() => {
    setListRefreshKey((current) => current + 1);
    refetchList();
  }, [refetchList]);

  const ensureStockUom = useCallback(
    async (unit) => {
      const value = String(unit ?? '').trim();
      if (!value) return value;

      const exists = (stockUomsState.items ?? []).some((option) => {
        const optionValue = String(option?.value ?? '').trim();
        return optionValue.toLowerCase() === value.toLowerCase();
      });

      if (!exists) {
        await dispatch(createStockUom(value)).unwrap();
      }

      return value;
    },
    [dispatch, stockUomsState.items],
  );

  const handleCreateProduct = useCallback(
    async (formValues) => {
      setIsSubmittingProduct(true);
      try {
        await ensureStockUom(formValues?.unitOfMeasure);
        const result = await createProduct(formValues);
        const itemCode = result?.name || result?.product?.id;

        // Stock-only fields (Bulk/Tagged, OEM, Standard price lists) via stock API.
        if (itemCode) {
          const stockPrice = formValues.maxPurchasePrice || formValues.minPurchasePrice;
          const stockPatch = buildProductMasterUpdatePayload(itemCode, {
            type: formValues.customType,
            oemCompany: formValues.make,
            price: stockPrice,
          });
          if (stockPatch) {
            await dispatch(updateProductMasterFields(stockPatch)).unwrap();
          }
        }

        await refetchList();
        showSuccessToast('Product added successfully.');
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to create product.' });
        throw error;
      } finally {
        setIsSubmittingProduct(false);
      }
    },
    [dispatch, ensureStockUom, refetchList],
  );

  const handleBulkUploadConfirm = useCallback(
    async (file) => {
      setIsImporting(true);
      try {
        const result = await importProductMasterFile(file);
        const createdCount = Number(result?.created_count) || 0;
        const errorCount = Number(result?.error_count) || 0;

        await dispatch(
          fetchProductMasterList({
            keyword: debouncedSearch,
            categoryFilter,
            orderBy,
            reset: true,
          }),
        ).unwrap();

        if (createdCount > 0 && errorCount === 0) {
          showSuccessToast(result?.message || `${createdCount} products imported successfully.`);
        } else if (createdCount > 0) {
          showSuccessToast(
            result?.message || `Imported ${createdCount} with ${errorCount} error(s).`,
          );
        } else if (errorCount > 0) {
          showErrorToast(result?.message || 'No products were imported. Check row errors.');
        } else {
          showErrorToast('No valid product rows found in the file.');
        }

        return result;
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to import products.' });
        return null;
      } finally {
        setIsImporting(false);
      }
    },
    [dispatch, debouncedSearch, categoryFilter, orderBy],
  );

  const groupedSections = useMemo(() => {
    if (!(list.isGrouped && list.groups)) return [];
    return list.groups;
  }, [list.isGrouped, list.groups]);

  const categoryFilterOptions = useMemo(
    () =>
      buildStocksCategoryOptions(
        (productMasterCategoryGroupsState.groups ?? []).map((group) => ({
          value: group.parent,
          label: group.label ?? group.parent,
        })),
        { includeAll: true },
      ),
    [productMasterCategoryGroupsState.groups],
  );

  const tableIsInitialLoading =
    list.isLoading && (groupBy ? groupedSections.length === 0 : list.items.length === 0);
  const tableError =
    list.error && (groupBy ? groupedSections.length === 0 : list.items.length === 0)
      ? list.error
      : null;
  const emptyContext = useMemo(
    () =>
      resolveStocksEmptyContext({
        search: debouncedSearch,
        filters: { category: categoryFilter },
      }),
    [debouncedSearch, categoryFilter],
  );

  return (
    <>
      <TabMenuHorizontal.Content
        value={STOCKS_TAB_IDS.PRODUCT_MASTER}
        className='min-h-0  flex-1 outline-none'
      >
        <div className='flex min-h-0 flex-1 flex-col gap-5 px-8 pb-10 pt-6'>
          <ProductMasterToolbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            category={categoryFilter}
            onCategoryChange={setCategoryFilter}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            groupOrder={groupOrder}
            onGroupOrderChange={setGroupOrder}
            columnConfig={columnConfigHook}
            onManualEntry={handleOpenAddProductDrawer}
            onBulkUpload={handleBulkUploadClick}
            onDownload={handleDownloadClick}
            categoryOptions={categoryFilterOptions}
          />

          {list.error && list.items.length > 0 ? (
            <p className='paragraph-small text-error-base'>{list.error}</p>
          ) : null}

          <div className='flex min-h-0  flex-1 flex-col overflow-y-auto'>
            {groupBy ? (
              <div className='flex flex-col gap-4'>
                {groupedSections.length === 0 ? (
                  <ProductMasterTable
                    rows={[]}
                    columnConfig={columnConfigHook.columns}
                    onRowClick={handleOpenProductDetails}
                    isLoading={tableIsInitialLoading}
                    error={tableError}
                    context={emptyContext}
                    onRetry={refetchList}
                    sorting={sorting}
                    onSortingChange={setSorting}
                  />
                ) : null}
                {groupedSections.map((section) => (
                  <section
                    key={section.id}
                    className='flex w-full flex-col overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'
                  >
                    <div className='flex flex-wrap items-center justify-between gap-3 border-b border-stroke-soft-200 px-3 py-1.5 sm:px-3'>
                      <div className='flex min-w-0 flex-1 flex-wrap items-center gap-1.5'>
                        <h3 className='truncate text-label-sm font-medium text-text-main-900'>
                          {section.groupName}
                        </h3>
                        <Badge.Root
                          size='small'
                          variant='lighter'
                          className='border border-stroke-soft-200'
                          color='gray'
                        >
                          {`${section.count} items`}
                        </Badge.Root>
                      </div>
                      <Button.Root
                        variant='borderless'
                        size='small'
                        className='gap-2 px-1.5 text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-main-900 focus-visible:ring-2 focus-visible:ring-primary-base/30'
                      >
                        <Button.Icon as={RiArrowDownSLine} className='text-text-sub-600' />
                      </Button.Root>
                    </div>
                    <ProductMasterTable
                      rows={section.rows}
                      columnConfig={columnConfigHook.columns}
                      onRowClick={handleOpenProductDetails}
                      isLoading={false}
                      error={null}
                      sorting={sorting}
                      onSortingChange={setSorting}
                    />
                  </section>
                ))}
              </div>
            ) : (
              <ProductMasterTable
                rows={list.items}
                columnConfig={columnConfigHook.columns}
                onRowClick={handleOpenProductDetails}
                isLoading={tableIsInitialLoading}
                error={tableError}
                context={emptyContext}
                onRetry={refetchList}
                sorting={sorting}
                onSortingChange={setSorting}
              />
            )}

            {renderSentinel()}
          </div>
        </div>
      </TabMenuHorizontal.Content>

      <ProductsAddItemDrawer
        open={isAddProductDrawerOpen}
        onOpenChange={setIsAddProductDrawerOpen}
        onSubmit={handleCreateProduct}
        isSubmitting={isSubmittingProduct}
        mode='stock'
      />
      <CreateProductBulkUploadModal
        open={isBulkUploadModalOpen}
        onOpenChange={setIsBulkUploadModalOpen}
        onConfirmUpload={handleBulkUploadConfirm}
        onDownloadSample={handleDownloadImportSample}
        isUploading={isImporting}
        isDownloadingSample={isDownloadingSample}
      />
      <ProductMasterExportModal
        open={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        onExport={handleExportConfirm}
        isExporting={isExporting}
        totalCount={list.totalCount}
      />
      <ProductDetailDrawer
        open={isProductDetailOpen}
        onOpenChange={handleProductDetailOpenChange}
        productId={productDetailId}
        onProductIdChange={setProductDetailId}
        navigationItems={productNavigationItems}
        listRefreshKey={listRefreshKey}
        onListRefresh={handleListRefresh}
        viewMode='stock'
      />
    </>
  );
};

export default ProductMaster;
