import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RiArrowDownSLine,
  RiAsterisk,
  RiCloseLine,
  RiExpandDiagonalLine,
  RiFullscreenExitLine,
  RiPantoneFill,
  RiSearchLine,
} from 'react-icons/ri';

import { BOQ_LABELS, BOQ_SEARCH_DEBOUNCE_MS } from '@/components/boq/constants';
import BoqTemplateProductMasterCategorySidebar from '@/components/boq/boq-templates/components/boq-template-product-master-category-sidebar';
import BoqTemplateProductMasterTable, {
  BoqTemplateProductMasterProductsSkeleton,
} from '@/components/boq/boq-templates/components/boq-template-product-master-table';
import {
  fetchBoqProductMasterCategories,
  fetchBoqProductMasterCategoryCounts,
  fetchBoqProductMasterProducts,
} from '@/api/boqProductMaster';
import {
  computeBoqProductMasterSelectionSummary,
  formatBoqRupeeAmount,
  groupBoqProductMasterProductsBySection,
} from '@/components/boq/boq-templates/components/boq-template-product-master-utils';
import { isBoqProductAlreadyAdded } from '@/components/boq/boq-templates/components/boq-template-products-utils';
import BoqListEmptyState from '@/components/boq/shared/boq-list-empty-state';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import * as Input from '@/components/ui/input';
import * as LinkButton from '@/components/ui/link-button';
import * as Modal from '@/components/ui/modal';
import { showErrorToast } from '@/utils/error-utils';

import { cn } from '@/utils/cn';

const ProductSection = ({
  section,
  products,
  selectedIds,
  existingItemCodes,
  onToggle,
  onToggleGroup,
  allowExistingSelection,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <section className='flex w-[1280px] max-w-none shrink-0 flex-col'>
      <div className='flex items-center gap-2.5 py-3'>
        <Button.Root
          type='button'
          variant='primary'
          mode='lighter'
          size='xxsmall'
          className='h-8 max-w-full shrink-0 gap-0.5 bg-primary-lighter p-1.5 text-label-xs font-medium text-primary-base hover:bg-primary-lighter hover:ring-transparent'
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((previous) => !previous)}
        >
          <span className='truncate px-1'>{section}</span>
          <Button.Icon
            as={RiArrowDownSLine}
            className={cn('size-5 transition-transform duration-200', !isExpanded && '-rotate-90')}
          />
        </Button.Root>
        <div
          role='presentation'
          aria-hidden
          className='h-px min-w-0 flex-1 self-center'
          style={{
            backgroundImage:
              'repeating-linear-gradient(to right, var(--color-stroke-soft-200) 0, var(--color-stroke-soft-200) 3px, transparent 3px, transparent 6px)',
          }}
        />
      </div>

      {isExpanded ? (
        <BoqTemplateProductMasterTable
          products={products}
          selectedIds={selectedIds}
          existingItemCodes={existingItemCodes}
          allowExistingSelection={allowExistingSelection}
          onToggle={onToggle}
          onToggleGroup={onToggleGroup}
        />
      ) : null}
    </section>
  );
};

const SummaryAsterisk = () => <RiAsterisk className='size-3 shrink-0 text-[#079455]' aria-hidden />;

const SummarySegment = ({ children, showLeadingAsterisk = false }) => (
  <div className='flex items-center gap-1'>
    {showLeadingAsterisk ? <SummaryAsterisk /> : null}
    <span className='whitespace-nowrap text-[10px] font-semibold leading-5 tracking-[-0.06px] text-[#079455]'>
      {children}
    </span>
    <SummaryAsterisk />
  </div>
);

const SelectionSummaryBar = ({ summary, visible }) => {
  if (!visible || !summary) return null;

  const categoryLabel =
    summary.categoryCount === 1
      ? 'Across 1 Category'
      : `Across ${summary.categoryCount} Categories`;

  return (
    <div className='flex h-[33px] shrink-0 items-center bg-[#effaf6] px-[26.5px]'>
      <div className='flex items-center gap-[5px]'>
        <SummarySegment showLeadingAsterisk>{categoryLabel}</SummarySegment>
        <SummarySegment>{formatBoqRupeeAmount(summary.totalBuy)} of total buy</SummarySegment>
        <SummarySegment>{formatBoqRupeeAmount(summary.totalSell)} of total sell</SummarySegment>
        <SummarySegment>{summary.avgMargin}% Avg margin</SummarySegment>
      </div>
    </div>
  );
};

const BoqTemplateAddProductMasterModal = ({
  open,
  onOpenChange,
  onAddProducts,
  onSyncProducts,
  isSubmitting = false,
  existingItemCodes,
  existingProducts,
}) => {
  const categorySearchId = React.useId();
  const productSearchId = React.useId();

  const [categoryGroups, setCategoryGroups] = useState([]);
  const [categoryLookup, setCategoryLookup] = useState({});
  const [categoryCounts, setCategoryCounts] = useState({});
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('');

  const [products, setProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState(null);

  const [selectedById, setSelectedById] = useState(() => new Map());
  const [removedExistingItemCodes, setRemovedExistingItemCodes] = useState(() => new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);

  const resetState = useCallback(() => {
    setCategoryGroups([]);
    setCategoryLookup({});
    setCategoryCounts({});
    setIsCategoriesLoading(false);
    setCategoriesError(null);
    setSelectedCategory('');
    setCategorySearch('');
    setProductSearch('');
    setDebouncedProductSearch('');
    setProducts([]);
    setIsProductsLoading(false);
    setProductsError(null);
    setSelectedById(new Map());
    setRemovedExistingItemCodes(new Set());
    setIsFullscreen(false);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      if (!nextOpen) resetState();
      onOpenChange?.(nextOpen);
    },
    [onOpenChange, resetState],
  );

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    setIsCategoriesLoading(true);
    setCategoriesError(null);

    fetchBoqProductMasterCategories()
      .then(({ groups, lookup }) => {
        if (cancelled) return;
        setCategoryGroups(groups);
        setCategoryLookup(lookup);
        const firstCategory = groups[0]?.children?.[0]?.value ?? '';
        setSelectedCategory(firstCategory);

        if (groups.length > 0) {
          fetchBoqProductMasterCategoryCounts(groups)
            .then((counts) => {
              if (!cancelled) setCategoryCounts(counts);
            })
            .catch(() => {
              if (!cancelled) setCategoryCounts({});
            });
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setCategoryGroups([]);
        setCategoryLookup({});
        const message = error?.message || 'Failed to load product categories.';
        setCategoriesError(message);
        showErrorToast(error, { defaultMessage: 'Failed to load product categories.' });
      })
      .finally(() => {
        if (!cancelled) setIsCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(
      () => setDebouncedProductSearch(productSearch),
      BOQ_SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [open, productSearch]);

  useEffect(() => {
    if (!open || !selectedCategory) {
      setProducts([]);
      return undefined;
    }

    let cancelled = false;
    setIsProductsLoading(true);
    setProductsError(null);

    fetchBoqProductMasterProducts({
      selectedCategoryMeta: categoryLookup[selectedCategory],
      keyword: debouncedProductSearch,
    })
      .then(({ products: nextProducts, total }) => {
        if (cancelled) return;
        setProducts(nextProducts);
        if (selectedCategory) {
          setCategoryCounts((previous) => ({
            ...previous,
            [selectedCategory]: total ?? nextProducts.length,
          }));
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setProducts([]);
        const message = error?.message || 'Failed to load products.';
        setProductsError(message);
        showErrorToast(error, { defaultMessage: 'Failed to load products.' });
      })
      .finally(() => {
        if (!cancelled) setIsProductsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [categoryLookup, debouncedProductSearch, open, selectedCategory]);

  const groupedProducts = useMemo(
    () => groupBoqProductMasterProductsBySection(products),
    [products],
  );

  const selectedProducts = useMemo(() => [...selectedById.values()], [selectedById]);
  const syncMode = Array.isArray(existingProducts);
  const existingProductsByItemCode = useMemo(() => {
    const byItemCode = new Map();
    for (const product of syncMode ? existingProducts : []) {
      const itemCode = String(product?.itemCode ?? product?.item ?? '').trim();
      if (!itemCode) continue;
      const matchingProducts = byItemCode.get(itemCode) ?? [];
      matchingProducts.push(product);
      byItemCode.set(itemCode, matchingProducts);
    }
    return byItemCode;
  }, [existingProducts, syncMode]);

  const resolvedExistingItemCodes = useMemo(() => {
    if (syncMode) return new Set(existingProductsByItemCode.keys());
    if (existingItemCodes instanceof Set) return existingItemCodes;
    if (Array.isArray(existingItemCodes)) {
      return new Set(existingItemCodes.map((code) => String(code ?? '').trim()).filter(Boolean));
    }
    return new Set();
  }, [existingItemCodes, existingProductsByItemCode, syncMode]);

  const resolveExistingItemCode = useCallback(
    (productRow) => {
      for (const key of [productRow?.itemCode, productRow?.item, productRow?.id]) {
        const itemCode = String(key ?? '').trim();
        if (itemCode && existingProductsByItemCode.has(itemCode)) return itemCode;
      }
      return '';
    },
    [existingProductsByItemCode],
  );

  const selectedIds = useMemo(() => {
    const ids = new Set(selectedById.keys());
    if (syncMode) {
      for (const product of products) {
        const itemCode = resolveExistingItemCode(product);
        if (itemCode && !removedExistingItemCodes.has(itemCode)) ids.add(product.id);
      }
    }
    return ids;
  }, [products, removedExistingItemCodes, resolveExistingItemCode, selectedById, syncMode]);

  const selectionSummary = useMemo(
    () => computeBoqProductMasterSelectionSummary(selectedProducts),
    [selectedProducts],
  );

  const selectedCount = syncMode
    ? existingProductsByItemCode.size - removedExistingItemCodes.size + selectedById.size
    : selectedIds.size;
  const changeCount = syncMode ? removedExistingItemCodes.size + selectedById.size : selectedCount;

  const handleToggleProduct = useCallback(
    (productRow) => {
      if (!productRow?.id) return;
      const existingItemCode = syncMode ? resolveExistingItemCode(productRow) : '';
      if (existingItemCode) {
        setRemovedExistingItemCodes((previous) => {
          const next = new Set(previous);
          if (next.has(existingItemCode)) next.delete(existingItemCode);
          else next.add(existingItemCode);
          return next;
        });
        return;
      }
      if (!syncMode && isBoqProductAlreadyAdded(productRow, resolvedExistingItemCodes)) return;
      setSelectedById((previous) => {
        const next = new Map(previous);
        if (next.has(productRow.id)) next.delete(productRow.id);
        else next.set(productRow.id, productRow);
        return next;
      });
    },
    [resolveExistingItemCode, resolvedExistingItemCodes, syncMode],
  );

  const handleToggleGroup = useCallback(
    (groupIds) => {
      setSelectedById((previous) => {
        const next = new Map(previous);
        const rowsById = new Map(products.map((row) => [row.id, row]));
        const selectableIds = groupIds.filter((id) => {
          const row = rowsById.get(id);
          return row && (syncMode || !isBoqProductAlreadyAdded(row, resolvedExistingItemCodes));
        });
        if (selectableIds.length === 0) return next;

        const allSelected = selectableIds.every((id) => selectedIds.has(id));

        for (const id of selectableIds) {
          const row = rowsById.get(id);
          if (!resolveExistingItemCode(row)) {
            if (allSelected) next.delete(id);
            else if (row) next.set(id, row);
          }
        }
        return next;
      });
      if (syncMode) {
        setRemovedExistingItemCodes((previous) => {
          const next = new Set(previous);
          const rowsById = new Map(products.map((row) => [row.id, row]));
          const allSelected = groupIds.every((id) => selectedIds.has(id));
          for (const id of groupIds) {
            const itemCode = resolveExistingItemCode(rowsById.get(id));
            if (!itemCode) continue;
            if (allSelected) next.add(itemCode);
            else next.delete(itemCode);
          }
          return next;
        });
      }
    },
    [products, resolveExistingItemCode, resolvedExistingItemCodes, selectedIds, syncMode],
  );

  const handleClearSelection = useCallback(() => {
    setSelectedById(new Map());
    setRemovedExistingItemCodes(syncMode ? new Set(existingProductsByItemCode.keys()) : new Set());
  }, [existingProductsByItemCode, syncMode]);

  const handleAddProducts = useCallback(async () => {
    if (changeCount === 0 || isSubmitting) return;
    try {
      if (syncMode) {
        const removedProducts = [...removedExistingItemCodes].flatMap(
          (itemCode) => existingProductsByItemCode.get(itemCode) ?? [],
        );
        await onSyncProducts?.({ selectedProducts, removedProducts });
      } else {
        await onAddProducts?.(selectedProducts);
      }
      handleOpenChange(false);
    } catch {
      // Keep modal open when add fails.
    }
  }, [
    changeCount,
    existingProductsByItemCode,
    handleOpenChange,
    isSubmitting,
    onAddProducts,
    onSyncProducts,
    removedExistingItemCodes,
    selectedProducts,
    syncMode,
  ]);

  const showProductsEmpty =
    !isProductsLoading &&
    !productsError &&
    groupedProducts.length === 0 &&
    Boolean(selectedCategory);
  let submitLabel = syncMode ? 'Save changes' : 'Add selected items';
  if (isSubmitting) submitLabel = syncMode ? 'Saving…' : 'Adding…';

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Content
        className={cn(
          'flex w-full flex-col overflow-hidden p-0',
          isFullscreen
            ? 'h-[100dvh] max-h-[100dvh] max-w-[100vw] rounded-none'
            : 'h-[min(803px,calc(100dvh-32px))] max-h-[min(803px,calc(100dvh-32px))] max-w-[min(1180px,calc(100vw-32px))]',
        )}
        overlayClassName={cn('z-[60] overflow-y-hidden', isFullscreen && 'p-0')}
        showClose={false}
      >
        <div className='relative flex shrink-0 items-center gap-4 border-b border-stroke-soft-200 px-5 py-4'>
          <span className='flex shrink-0 items-center justify-center rounded-full bg-success-lighter p-2.5'>
            <RiPantoneFill className='size-6 text-success-base' aria-hidden />
          </span>
          <div className='flex min-w-0 flex-1 flex-col gap-1 pr-20'>
            <Modal.Title>Add from Product master</Modal.Title>
            <Modal.Description>Browse and select products to add to your BOQ</Modal.Description>
          </div>
          <div className='absolute right-4 top-4 flex items-center gap-1'>
            <CompactButton.Root
              type='button'
              variant='ghost'
              size='medium'
              aria-label={isFullscreen ? 'Exit full screen' : 'Expand to full screen'}
              aria-pressed={isFullscreen}
              onClick={() => setIsFullscreen((previous) => !previous)}
            >
              <CompactButton.Icon as={isFullscreen ? RiFullscreenExitLine : RiExpandDiagonalLine} />
            </CompactButton.Root>
            <Modal.Close asChild>
              <CompactButton.Root variant='ghost' size='medium' className='shrink-0'>
                <CompactButton.Icon as={RiCloseLine} />
              </CompactButton.Root>
            </Modal.Close>
          </div>
        </div>

        <div className='flex min-h-0 flex-1 overflow-hidden'>
          <aside className='flex min-h-0 w-[203px] shrink-0 flex-col border-r border-stroke-soft-200 bg-bg-white-0'>
            <div className='shrink-0 p-3'>
              <Input.Root size='small'>
                <Input.Wrapper>
                  <Input.Icon as={RiSearchLine} />
                  <Input.Input
                    id={categorySearchId}
                    value={categorySearch}
                    onChange={(event) => setCategorySearch(event.target.value)}
                    placeholder='search category'
                    autoComplete='off'
                    aria-label='Search category'
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>

            <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain'>
              {isCategoriesLoading ? (
                <p className='px-3 py-4 text-paragraph-xs text-text-sub-500'>Loading categories…</p>
              ) : categoriesError ? (
                <BoqListEmptyState embedded error={categoriesError} />
              ) : (
                <BoqTemplateProductMasterCategorySidebar
                  groups={categoryGroups}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  categorySearch={categorySearch}
                  categoryCounts={categoryCounts}
                />
              )}
            </div>
          </aside>

          <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
            <div className='shrink-0 p-3'>
              <Input.Root size='small'>
                <Input.Wrapper>
                  <Input.Icon as={RiSearchLine} />
                  <Input.Input
                    id={productSearchId}
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    placeholder={BOQ_LABELS.searchProductsPlaceholder}
                    autoComplete='off'
                    aria-label='Search products'
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>

            <div className='min-h-0 flex-1 overflow-auto overscroll-contain px-3 pb-3'>
              {isProductsLoading ? (
                <BoqTemplateProductMasterProductsSkeleton />
              ) : productsError ? (
                <BoqListEmptyState embedded error={productsError} />
              ) : !selectedCategory ? (
                <BoqListEmptyState
                  embedded
                  title='Select a category'
                  description='Choose a category from the sidebar to browse products.'
                />
              ) : showProductsEmpty ? (
                <BoqListEmptyState
                  embedded
                  title='No products found'
                  description='Try another category or adjust your search.'
                />
              ) : (
                <div className='flex w-max min-w-full flex-col gap-6'>
                  {groupedProducts.map((group) => (
                    <ProductSection
                      key={group.section}
                      section={group.section}
                      products={group.products}
                      selectedIds={selectedIds}
                      existingItemCodes={resolvedExistingItemCodes}
                      allowExistingSelection={syncMode}
                      onToggle={handleToggleProduct}
                      onToggleGroup={handleToggleGroup}
                    />
                  ))}
                </div>
              )}
            </div>

            <SelectionSummaryBar summary={selectionSummary} visible={selectedCount > 0} />
          </div>
        </div>

        <Modal.Footer className='shrink-0 items-center gap-3 border-t border-stroke-soft-200 px-5 py-4'>
          <div className='flex min-w-0 shrink-0 items-center gap-1'>
            <span className='whitespace-nowrap text-paragraph-sm text-text-sub-500'>
              {selectedCount === 0
                ? 'No products selected'
                : selectedCount === 1
                  ? '1 Product selected'
                  : `${selectedCount} Products selected`}
            </span>
            {selectedCount > 0 ? (
              <LinkButton.Root
                type='button'
                variant='gray'
                size='medium'
                className='whitespace-nowrap underline'
                onClick={handleClearSelection}
                disabled={isSubmitting}
              >
                Clear all
              </LinkButton.Root>
            ) : null}
          </div>

          <div className='flex min-w-0 flex-1 items-center justify-end gap-3'>
            <Modal.Close asChild>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
                className='min-w-[70px] shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
                disabled={isSubmitting}
              >
                Cancel
              </Button.Root>
            </Modal.Close>
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              size='small'
              className='min-w-[152px] bg-[#079455] shadow-[0px_1px_2px_0px_rgba(55,93,251,0.08)] hover:bg-[#067647]'
              disabled={changeCount === 0 || isSubmitting}
              onClick={handleAddProducts}
            >
              {submitLabel}
            </Button.Root>
          </div>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default BoqTemplateAddProductMasterModal;
