import React, { useEffect, useMemo, useState } from 'react';
import { RiArrowDownSLine } from 'react-icons/ri';

import BoqTemplateProductsTable from '@/components/boq/boq-templates/components/boq-template-products-table';
import { BOQ_PRODUCT_COLUMN_CONFIG_SOURCES } from '@/components/boq/boq-templates/components/boq-template-products-column-config';
import { groupBoqTemplateProductsByCategory } from '@/components/boq/boq-templates/components/boq-template-products-utils';
import BoqCategorySheetTabs from '@/components/boq/shared/boq-category-sheet-tabs';
import BoqFinancialSummaryChips from '@/components/boq/shared/boq-financial-summary-chips';
import BoqListEmptyState from '@/components/boq/shared/boq-list-empty-state';
import { cn } from '@/utils/cn';

export const BOQ_PRODUCT_LISTING_VIEW_MODES = {
  SINGLE: 'single',
  MULTI: 'multi',
};

const BOQ_LISTING_BLEED_CLASS = '-mx-6';
const BOQ_LISTING_INSET_CLASS = 'px-8';

const DottedDivider = () => (
  <div
    role='presentation'
    aria-hidden
    className='h-px min-w-0 flex-1 self-center'
    style={{
      backgroundImage:
        'repeating-linear-gradient(to right, var(--color-stroke-soft-200) 0, var(--color-stroke-soft-200) 3px, transparent 3px, transparent 6px)',
    }}
  />
);

const SkeletonBar = ({ className }) => (
  <div className={cn('animate-pulse rounded-md bg-bg-weak-50', className)} />
);

/** Loading placeholder that mirrors category header + section + product rows. */
export function BoqTemplateProductsListingSkeleton({
  categoryCount = 2,
  sectionCount = 1,
  rowCount = 4,
}) {
  return (
    <div
      className='flex w-full min-w-max flex-col gap-0'
      aria-busy='true'
      aria-label='Loading products'
    >
      {Array.from({ length: categoryCount }).map((_, categoryIndex) => (
        <div key={`category-skeleton-${categoryIndex}`} className='flex flex-col'>
          <div
            className={cn(
              BOQ_LISTING_BLEED_CLASS,
              BOQ_LISTING_INSET_CLASS,
              'relative flex h-[30px] w-full min-w-full shrink-0 items-center gap-3 border-y border-stroke-soft-200 bg-stroke-soft-200/20',
            )}
          >
            <SkeletonBar className='size-[18.5px] shrink-0 rounded-[2px]' />
            <SkeletonBar className='h-3 w-24' />
            <DottedDivider />
            <div className='sticky right-0 z-10 ml-auto flex shrink-0 items-center gap-2 bg-stroke-soft-200/20 pl-3'>
              <SkeletonBar className='h-5 w-16 rounded-full' />
              <SkeletonBar className='h-5 w-16 rounded-full' />
              <SkeletonBar className='h-5 w-14 rounded-full' />
            </div>
          </div>

          {Array.from({ length: sectionCount }).map((_, sectionIndex) => (
            <div
              key={`section-skeleton-${categoryIndex}-${sectionIndex}`}
              className='mb-8 flex flex-col'
            >
              <div className='flex items-center gap-2.5 px-0 py-3'>
                <SkeletonBar className='h-4 w-28' />
                <div className='h-px min-w-0 flex-1 bg-stroke-soft-200' aria-hidden />
                <SkeletonBar className='h-5 w-14 rounded-full' />
              </div>

              <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
                <div className='flex items-center gap-3 border-b border-stroke-soft-200 bg-bg-weak-50 px-3 py-2'>
                  <SkeletonBar className='size-4 shrink-0 rounded' />
                  <SkeletonBar className='h-4 w-20' />
                  <SkeletonBar className='h-4 w-16' />
                  <SkeletonBar className='ml-auto h-4 w-14' />
                  <SkeletonBar className='h-4 w-14' />
                  <SkeletonBar className='h-4 w-14' />
                </div>
                {Array.from({ length: rowCount }).map((_, rowIndex) => (
                  <div
                    key={`row-skeleton-${categoryIndex}-${sectionIndex}-${rowIndex}`}
                    className='flex items-center gap-3 border-b border-[#ededed] px-3 py-3 last:border-b-0'
                  >
                    <SkeletonBar className='size-4 shrink-0 rounded' />
                    <SkeletonBar className='size-8 shrink-0 rounded' />
                    <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
                      <SkeletonBar className='h-4 w-2/3' />
                      <SkeletonBar className='h-3.5 w-1/2' />
                    </div>
                    <SkeletonBar className='h-4 w-12' />
                    <SkeletonBar className='h-4 w-16' />
                    <SkeletonBar className='h-4 w-16' />
                    <SkeletonBar className='h-4 w-14' />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const BoqTemplateCategoryHeader = ({
  letter,
  label,
  marginPercent,
  marginTotal,
  buyTotal,
  sellTotal,
  poCount = 0,
  poTotal = 0,
  pendingTotal,
  financialSummaryVariant = 'margin-only',
}) => {
  const summaryVariant =
    financialSummaryVariant === 'margin-only' ? 'margin-percent-only' : financialSummaryVariant;

  return (
    <div
      className={cn(
        BOQ_LISTING_BLEED_CLASS,
        BOQ_LISTING_INSET_CLASS,
        'relative flex h-[30px] w-full min-w-full shrink-0 items-center gap-3 border-y border-stroke-soft-200 bg-stroke-soft-200/20',
      )}
    >
      <div className='flex min-w-0 shrink-0 items-center gap-2'>
        <span className='flex size-[18.5px] shrink-0 items-center justify-center rounded-[2px] bg-bg-soft-200 text-[11px] font-bold uppercase leading-none text-text-soft-400'>
          {letter}
        </span>
        <span className='min-w-0 truncate text-[12px] font-semibold uppercase tracking-[0.56px] text-text-sub-500'>
          {label || 'Other'}
        </span>
      </div>

      <DottedDivider />

      <div className='sticky right-0 z-10 ml-auto flex shrink-0 items-center bg-stroke-soft-200/20 pl-3'>
        <BoqFinancialSummaryChips
          buyTotal={buyTotal}
          sellTotal={sellTotal}
          marginTotal={marginTotal}
          marginPercent={marginPercent}
          total={buyTotal}
          poTotal={poTotal}
          pendingTotal={pendingTotal ?? buyTotal}
          variant='light'
          summaryVariant={summaryVariant}
        />
      </div>
    </div>
  );
};

const BOQ_SECTION_SUMMARY_VARIANTS = new Set(['full', 'buy-only', 'sell-only', 'purchase-boq']);

const BoqTemplateProductSection = ({
  section,
  products,
  buyTotal = 0,
  sellTotal = 0,
  marginTotal = 0,
  marginPercent = 0,
  poCount = 0,
  poTotal = 0,
  pendingTotal,
  onAddProduct,
  onDeleteProduct,
  onDeleteProducts,
  onUpdateProduct,
  columnConfig,
  allDescriptionsExpanded,
  onAllDescriptionsExpandedChange,
  financialSummaryVariant,
  priceView,
  readOnly = false,
  disableEdit = false,
  quantityEditable = false,
  usePurchaseBoqSectionStyle = false,
  projectFloors = [],
  projectAreas = [],
  useProjectBoqColumns = false,
  columnConfigSource = BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.TEMPLATE,
  enableRowSelection = false,
  selectedProductIds,
  onSelectedProductIdsChange,
  hideSelectionBar = false,
  boqCode = '',
  projectId = '',
  onErQuantitiesCommit,
  onErStatusCommit,
  requestAddLineMode = null,
  onRequestAddLineModeConsumed,
  onConvertToProduct,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const showSectionSummary = BOQ_SECTION_SUMMARY_VARIANTS.has(financialSummaryVariant);
  const sectionSummaryVariant =
    financialSummaryVariant === 'margin-only' ? 'margin-percent-only' : financialSummaryVariant;

  return (
    <section className={cn('flex flex-col', isExpanded ? 'mb-8' : 'mb-0')}>
      <div
        className={cn(
          BOQ_LISTING_BLEED_CLASS,
          BOQ_LISTING_INSET_CLASS,
          'sticky top-0 z-[9] flex w-full min-w-full items-center gap-2 bg-bg-white-0 py-2',
        )}
      >
        <button
          type='button'
          className={cn(
            'inline-flex h-auto max-w-[min(100%,28rem)] shrink-0 items-center gap-0.5 text-left',
            usePurchaseBoqSectionStyle
              ? 'rounded-lg bg-primary-lighter p-1.5'
              : 'bg-transparent p-0',
          )}
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((previous) => !previous)}
        >
          <span
            className={cn(
              'truncate px-1 text-[12px] font-medium',
              usePurchaseBoqSectionStyle
                ? 'normal-case tracking-normal text-primary-base'
                : 'font-semibold uppercase tracking-[0.56px] text-text-sub-500',
            )}
          >
            {section}
          </span>
          <RiArrowDownSLine
            className={cn(
              'size-5 shrink-0 transition-transform duration-200',
              usePurchaseBoqSectionStyle ? 'text-primary-base' : 'text-text-soft-400',
              !isExpanded && '-rotate-90',
            )}
            aria-hidden
          />
        </button>
        <DottedDivider />
        {showSectionSummary ? (
          <div className='sticky right-0 z-10 ml-auto flex shrink-0 items-center bg-bg-white-0 pl-3'>
            <BoqFinancialSummaryChips
              buyTotal={buyTotal}
              sellTotal={sellTotal}
              marginTotal={marginTotal}
              marginPercent={marginPercent}
              total={buyTotal}
              poTotal={poTotal}
              pendingTotal={pendingTotal ?? buyTotal}
              variant='light'
              summaryVariant={sectionSummaryVariant}
            />
          </div>
        ) : null}
      </div>

      {isExpanded ? (
        <div className={cn(BOQ_LISTING_BLEED_CLASS, BOQ_LISTING_INSET_CLASS)}>
          <BoqTemplateProductsTable
            products={products}
            section={section}
            onAddProduct={readOnly ? undefined : onAddProduct}
            onDeleteProduct={readOnly ? undefined : onDeleteProduct}
            onDeleteProducts={readOnly ? undefined : onDeleteProducts}
            onUpdateProduct={readOnly && !quantityEditable ? undefined : onUpdateProduct}
            columnConfig={columnConfig}
            priceView={priceView}
            readOnly={readOnly}
            disableEdit={disableEdit}
            quantityEditable={quantityEditable}
            allDescriptionsExpanded={allDescriptionsExpanded}
            onAllDescriptionsExpandedChange={onAllDescriptionsExpandedChange}
            projectFloors={projectFloors}
            projectAreas={projectAreas}
            useProjectBoqColumns={useProjectBoqColumns}
            columnConfigSource={columnConfigSource}
            enableRowSelection={enableRowSelection}
            selectedProductIds={selectedProductIds}
            onSelectedProductIdsChange={onSelectedProductIdsChange}
            hideSelectionBar={hideSelectionBar}
            boqCode={boqCode}
            projectId={projectId}
            onErQuantitiesCommit={onErQuantitiesCommit}
            onErStatusCommit={onErStatusCommit}
            requestAddLineMode={requestAddLineMode}
            onRequestAddLineModeConsumed={onRequestAddLineModeConsumed}
            onConvertToProduct={onConvertToProduct}
          />
        </div>
      ) : null}
    </section>
  );
};

const BoqTemplateCategoryContent = ({
  category,
  onAddProduct,
  onDeleteProduct,
  onDeleteProducts,
  onUpdateProduct,
  columnConfig,
  allDescriptionsExpanded,
  onAllDescriptionsExpandedChange,
  financialSummaryVariant,
  priceView,
  readOnly = false,
  disableEdit = false,
  quantityEditable = false,
  showCategoryHeader = true,
  usePurchaseBoqSectionStyle = false,
  projectFloors = [],
  projectAreas = [],
  useProjectBoqColumns = false,
  columnConfigSource = BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.TEMPLATE,
  enableRowSelection = false,
  selectedProductIds,
  onSelectedProductIdsChange,
  hideSelectionBar = false,
  boqCode = '',
  projectId = '',
  onErQuantitiesCommit,
  onErStatusCommit,
  requestAddLineMode = null,
  onRequestAddLineModeConsumed,
  onConvertToProduct,
}) => (
  <div className='flex flex-col'>
    {showCategoryHeader ? (
      <BoqTemplateCategoryHeader
        letter={category.letter}
        label={category.label}
        marginPercent={category.marginPercent}
        marginTotal={category.marginTotal}
        buyTotal={category.buyTotal}
        sellTotal={category.sellTotal}
        poTotal={category.poTotal ?? 0}
        pendingTotal={category.pendingTotal ?? category.buyTotal}
        financialSummaryVariant={financialSummaryVariant}
      />
    ) : null}

    <div className='flex flex-col'>
      {category.sections.map((group) => (
        <BoqTemplateProductSection
          key={`${category.categoryId}-${group.section}`}
          section={group.section}
          products={group.products}
          buyTotal={group.buyTotal}
          sellTotal={group.sellTotal}
          marginTotal={group.marginTotal}
          marginPercent={group.marginPercent}
          poTotal={group.poTotal ?? 0}
          pendingTotal={group.pendingTotal ?? group.buyTotal}
          onAddProduct={onAddProduct}
          onDeleteProduct={onDeleteProduct}
          onDeleteProducts={onDeleteProducts}
          onUpdateProduct={onUpdateProduct}
          columnConfig={columnConfig}
          allDescriptionsExpanded={allDescriptionsExpanded}
          onAllDescriptionsExpandedChange={onAllDescriptionsExpandedChange}
          financialSummaryVariant={financialSummaryVariant}
          priceView={priceView}
          readOnly={readOnly}
          disableEdit={disableEdit}
          quantityEditable={quantityEditable}
          usePurchaseBoqSectionStyle={usePurchaseBoqSectionStyle}
          projectFloors={projectFloors}
          projectAreas={projectAreas}
          useProjectBoqColumns={useProjectBoqColumns}
          columnConfigSource={columnConfigSource}
          enableRowSelection={enableRowSelection}
          selectedProductIds={selectedProductIds}
          onSelectedProductIdsChange={onSelectedProductIdsChange}
          hideSelectionBar={hideSelectionBar}
          boqCode={boqCode}
          projectId={projectId}
          onErQuantitiesCommit={onErQuantitiesCommit}
          onErStatusCommit={onErStatusCommit}
          requestAddLineMode={requestAddLineMode}
          onRequestAddLineModeConsumed={onRequestAddLineModeConsumed}
          onConvertToProduct={onConvertToProduct}
        />
      ))}
    </div>
  </div>
);

const BoqTemplateProductsListing = ({
  products = [],
  onAddProduct,
  onDeleteProduct,
  onDeleteProducts,
  onUpdateProduct,
  columnConfig = [],
  allDescriptionsExpanded,
  onAllDescriptionsExpandedChange,
  financialSummaryVariant = 'margin-only',
  priceView,
  readOnly = false,
  disableEdit = false,
  quantityEditable = false,
  viewMode = BOQ_PRODUCT_LISTING_VIEW_MODES.SINGLE,
  showCategoryHeader,
  usePurchaseBoqSectionStyle = false,
  categoryTabsPlacement = 'bottom',
  categoryTabsClassName,
  hideCategoryTabs = false,
  activeCategoryId: controlledActiveCategoryId,
  onActiveCategoryIdChange,
  /** Field used for collapsible section headers (Purchase BOQ → purchaseCategory). */
  sectionGroupField = 'section',
  /** Flatten outer categoryType buckets into one list of sections. */
  groupBySectionOnly = false,
  projectFloors = [],
  projectAreas = [],
  useProjectBoqColumns = false,
  columnConfigSource = BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.TEMPLATE,
  enableRowSelection = false,
  selectedProductIds,
  onSelectedProductIdsChange,
  hideSelectionBar = false,
  boqCode = '',
  projectId = '',
  onErQuantitiesCommit,
  onErStatusCommit,
  requestAddLineMode = null,
  onRequestAddLineModeConsumed,
  onConvertToProduct,
}) => {
  const groupedCategories = useMemo(
    () =>
      groupBoqTemplateProductsByCategory(products, {
        sectionField: sectionGroupField,
        groupBySectionOnly,
        usePurchaseBoqTotals: usePurchaseBoqSectionStyle,
      }),
    [groupBySectionOnly, products, sectionGroupField, usePurchaseBoqSectionStyle],
  );
  const [internalActiveCategoryId, setInternalActiveCategoryId] = useState('');
  const isCategoryControlled =
    controlledActiveCategoryId !== undefined && typeof onActiveCategoryIdChange === 'function';
  const activeCategoryId = isCategoryControlled
    ? controlledActiveCategoryId
    : internalActiveCategoryId;
  const setActiveCategoryId = isCategoryControlled
    ? onActiveCategoryIdChange
    : setInternalActiveCategoryId;

  const isMultiView = viewMode === BOQ_PRODUCT_LISTING_VIEW_MODES.MULTI;
  const resolveShowCategoryHeader = showCategoryHeader ?? !usePurchaseBoqSectionStyle;

  useEffect(() => {
    if (!isMultiView) {
      if (!isCategoryControlled) {
        setInternalActiveCategoryId('');
      }
      return;
    }

    if (isCategoryControlled) {
      return;
    }

    const categoryIds = groupedCategories.map((category) => category.categoryId);
    if (categoryIds.length === 0) {
      setInternalActiveCategoryId('');
      return;
    }

    setInternalActiveCategoryId((previous) =>
      previous && categoryIds.includes(previous) ? previous : categoryIds[0],
    );
  }, [groupedCategories, isCategoryControlled, isMultiView]);

  if (groupedCategories.length === 0) {
    return (
      <BoqListEmptyState
        embedded
        title='No products in this template'
        description='To get started, add products from the product master or copy from previous templates.'
      />
    );
  }

  if (isMultiView) {
    const activeCategory =
      groupedCategories.find((category) => category.categoryId === activeCategoryId) ??
      groupedCategories[0];

    const categoryTabs = (
      <BoqCategorySheetTabs
        categories={groupedCategories}
        activeCategoryId={activeCategory?.categoryId ?? ''}
        onSelect={setActiveCategoryId}
        placement={categoryTabsPlacement}
        className={categoryTabsClassName}
      />
    );

    if (hideCategoryTabs) {
      return (
        <div className='flex min-w-max flex-col'>
          {activeCategory ? (
            <BoqTemplateCategoryContent
              category={activeCategory}
              onAddProduct={onAddProduct}
              onDeleteProduct={onDeleteProduct}
              onDeleteProducts={onDeleteProducts}
              onUpdateProduct={onUpdateProduct}
              columnConfig={columnConfig}
              allDescriptionsExpanded={allDescriptionsExpanded}
              onAllDescriptionsExpandedChange={onAllDescriptionsExpandedChange}
              financialSummaryVariant={financialSummaryVariant}
              priceView={priceView}
              readOnly={readOnly}
              disableEdit={disableEdit}
              quantityEditable={quantityEditable}
              showCategoryHeader={false}
              usePurchaseBoqSectionStyle={usePurchaseBoqSectionStyle}
              projectFloors={projectFloors}
              projectAreas={projectAreas}
              useProjectBoqColumns={useProjectBoqColumns}
              columnConfigSource={columnConfigSource}
              enableRowSelection={enableRowSelection}
              selectedProductIds={selectedProductIds}
              onSelectedProductIdsChange={onSelectedProductIdsChange}
              hideSelectionBar={hideSelectionBar}
              boqCode={boqCode}
              projectId={projectId}
              onErQuantitiesCommit={onErQuantitiesCommit}
              onErStatusCommit={onErStatusCommit}
              requestAddLineMode={requestAddLineMode}
              onRequestAddLineModeConsumed={onRequestAddLineModeConsumed}
              onConvertToProduct={onConvertToProduct}
            />
          ) : null}
        </div>
      );
    }

    return (
      <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden'>
        {categoryTabsPlacement === 'top' ? <div className='shrink-0'>{categoryTabs}</div> : null}
        <div
          className={cn(
            'min-h-0 flex-1 overflow-auto overscroll-contain',
            usePurchaseBoqSectionStyle ? 'pb-24' : 'pb-4',
          )}
        >
          <div className={cn('min-w-max', !usePurchaseBoqSectionStyle && 'px-8')}>
            {activeCategory ? (
              <BoqTemplateCategoryContent
                category={activeCategory}
                onAddProduct={onAddProduct}
                onDeleteProduct={onDeleteProduct}
                onDeleteProducts={onDeleteProducts}
                onUpdateProduct={onUpdateProduct}
                columnConfig={columnConfig}
                allDescriptionsExpanded={allDescriptionsExpanded}
                onAllDescriptionsExpandedChange={onAllDescriptionsExpandedChange}
                financialSummaryVariant={financialSummaryVariant}
                priceView={priceView}
                readOnly={readOnly}
                disableEdit={disableEdit}
                quantityEditable={quantityEditable}
                showCategoryHeader={false}
                usePurchaseBoqSectionStyle={usePurchaseBoqSectionStyle}
                projectFloors={projectFloors}
                projectAreas={projectAreas}
                useProjectBoqColumns={useProjectBoqColumns}
                columnConfigSource={columnConfigSource}
                enableRowSelection={enableRowSelection}
                selectedProductIds={selectedProductIds}
                onSelectedProductIdsChange={onSelectedProductIdsChange}
                hideSelectionBar={hideSelectionBar}
                boqCode={boqCode}
                projectId={projectId}
                onErQuantitiesCommit={onErQuantitiesCommit}
                onErStatusCommit={onErStatusCommit}
                requestAddLineMode={requestAddLineMode}
                onRequestAddLineModeConsumed={onRequestAddLineModeConsumed}
                onConvertToProduct={onConvertToProduct}
              />
            ) : null}
          </div>
        </div>
        {categoryTabsPlacement === 'bottom' ? <div className='shrink-0'>{categoryTabs}</div> : null}
      </div>
    );
  }

  return (
    <div className='flex min-w-max flex-col'>
      {groupedCategories.map((category) => (
        <BoqTemplateCategoryContent
          key={category.categoryId}
          category={category}
          onAddProduct={onAddProduct}
          onDeleteProduct={onDeleteProduct}
          onDeleteProducts={onDeleteProducts}
          onUpdateProduct={onUpdateProduct}
          columnConfig={columnConfig}
          allDescriptionsExpanded={allDescriptionsExpanded}
          onAllDescriptionsExpandedChange={onAllDescriptionsExpandedChange}
          financialSummaryVariant={financialSummaryVariant}
          priceView={priceView}
          readOnly={readOnly}
          disableEdit={disableEdit}
          quantityEditable={quantityEditable}
          showCategoryHeader={resolveShowCategoryHeader}
          usePurchaseBoqSectionStyle={usePurchaseBoqSectionStyle}
          projectFloors={projectFloors}
          projectAreas={projectAreas}
          useProjectBoqColumns={useProjectBoqColumns}
          columnConfigSource={columnConfigSource}
          enableRowSelection={enableRowSelection}
          selectedProductIds={selectedProductIds}
          onSelectedProductIdsChange={onSelectedProductIdsChange}
          hideSelectionBar={hideSelectionBar}
          boqCode={boqCode}
          projectId={projectId}
          onErQuantitiesCommit={onErQuantitiesCommit}
          onErStatusCommit={onErStatusCommit}
          requestAddLineMode={requestAddLineMode}
          onRequestAddLineModeConsumed={onRequestAddLineModeConsumed}
          onConvertToProduct={onConvertToProduct}
        />
      ))}
    </div>
  );
};

export default BoqTemplateProductsListing;
