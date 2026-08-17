import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuExpand } from 'react-icons/lu';
import {
  RiAddCircleLine,
  RiDeleteBinLine,
  RiExpandDiagonalLine,
  RiExpandUpDownFill,
  RiInformationFill,
} from 'react-icons/ri';

import {
  formatBoqPriceRangeTooltip,
  formatBoqRupeeAmount,
  isBoqRateOutOfRange,
  resolveBoqPurchasePriceBounds,
  resolveBoqSellingPriceBounds,
} from '@/components/boq/boq-templates/components/boq-template-product-master-utils';
import {
  BOQ_PRODUCT_COLUMN_CONFIG_SOURCES,
  BOQ_TEMPLATE_PRODUCTS_GRID_CLASS,
  BOQ_TEMPLATE_PRODUCTS_EDIT_GRID_CLASS,
  buildBoqTemplateProductsGridStyle,
  getVisibleProductColumnsForSource,
  PROJECT_BOQ_FLOOR_QUANTITY_COLUMN_PREFIX,
} from '@/components/boq/boq-templates/components/boq-template-products-column-config';
import BoqTemplateAddProductRow from '@/components/boq/boq-templates/components/boq-template-add-product-row';
import BoqTemplateAreaLocationDropdown from '@/components/boq/boq-templates/components/boq-template-area-location-dropdown';
import BoqTemplateProductRowHoverActions from '@/components/boq/boq-templates/components/boq-template-product-row-hover-actions';
import BoqTemplateQuantityDropdown from '@/components/boq/boq-templates/components/boq-template-quantity-dropdown';
import { resolveBoqTemplateInitialFocusColumnId } from '@/components/boq/boq-templates/components/boq-template-product-edit-utils';
import {
  computeBoqProductLineAmount,
  mergeProjectFloorsWithQuantity,
  formatProjectBoqAreaLocations,
  parseProjectBoqAreaLocations,
} from '@/components/boq/boq-templates/components/boq-template-products-utils';
import ExpandableClampText from '@/components/boq/shared/expandable-clamp-text';
import {
  BoqProductCategoryPathCell,
  PurchaseBoqCategoryTag,
  PurchaseBoqCategorySelect,
  PurchaseBoqJourneyTracker,
  PurchaseBoqPackageCell,
  PurchaseBoqPackageCornerIcon,
  PurchaseBoqPackageItemNameCell,
  PurchaseBoqSplitCornerIcon,
  PurchaseBoqProductNameCell,
  PurchaseBoqQuantityPill,
  PurchaseBoqRateCell,
  PurchaseBoqStatusBadge,
  PurchaseBoqTruncatedText,
  PurchaseBoqValueCell,
  PurchaseBoqVendorTags,
} from '@/components/procurements/project-procurement-purchase-boq-table-cells';
import { hasPurchaseBoqPackages } from '@/components/procurements/project-procurement-purchase-boq-package-utils';
import BoqErEstimationModal from '@/components/boq/shared/boq-er-estimation-modal';
import BoqErStatusDropdown from '@/components/boq/shared/boq-er-status-dropdown';
import { BOQ_ER_STATUS, resolveBoqErStatus } from '@/components/boq/shared/boq-er-utils';
import { initBoqEstimationDraft } from '@/api/projectBoqs';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import * as CompactButton from '@/components/ui/compact-button';
import * as Tooltip from '@/components/ui/tooltip';
import {
  BOQ_ADD_LINE_MODES,
  PROJECT_BOQ_PRICE_VIEW,
  PROJECT_BOQ_TYPES,
} from '@/components/boq/constants';
import {
  getNonProductLinesFromSelection,
  isBoqLineNonProduct,
} from '@/components/boq/boq-line-product-utils';
import BoqNonProductTag from '@/components/boq/shared/boq-non-product-tag';
import { cn } from '@/utils/cn';
import { showErrorToast } from '@/utils/error-utils';

const TOOLTIP_CONTENT_CLASS = 'z-[70] max-w-[320px] text-center';
const PO_SENT_SELECTION_DISABLED_STATUSES = new Set(['po-released', 'delivered']);
const PO_SELECTION_COLUMN_SOURCES = new Set([
  BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.PURCHASE_BOQ,
  BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.PACKAGE_ITEMS,
]);

const isProductSelectionDisabled = (row, columnConfigSource) =>
  PO_SELECTION_COLUMN_SOURCES.has(columnConfigSource) &&
  PO_SENT_SELECTION_DISABLED_STATUSES.has(
    String(row?.procurementStatus ?? row?.procurement_status ?? '').toLowerCase(),
  );

const resolveFiniteRate = (rawValue, fallback) => {
  if (rawValue != null && rawValue !== '') {
    const parsed = Number(rawValue);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const resolvePurchaseRateDisplay = (row = {}) => {
  const { min, max } = resolveBoqPurchasePriceBounds(row);
  const value = resolveFiniteRate(row.purchaseRate, min);
  return { value, min, max, isOutOfRange: isBoqRateOutOfRange(value, min, max) };
};

const resolveSellingRateDisplay = (row = {}) => {
  const { min, max } = resolveBoqSellingPriceBounds(row);
  const value = resolveFiniteRate(row.sellingRate, max);
  return { value, min, max, isOutOfRange: isBoqRateOutOfRange(value, min, max) };
};

const HeaderLabel = ({ label }) => (
  <div className='flex items-center gap-0.5'>
    <span className='whitespace-nowrap text-label-sm font-medium text-text-soft-400'>{label}</span>
    <RiExpandUpDownFill className='size-5 shrink-0 text-text-soft-400' aria-hidden />
  </div>
);

const ProductPlaceholderImage = ({ imageUrl }) =>
  imageUrl ? (
    <img src={imageUrl} alt='' className='size-8 shrink-0 rounded object-cover' />
  ) : (
    <div className='size-8 shrink-0 rounded bg-bg-weak-100' aria-hidden />
  );

const UnitsPill = ({ units }) => {
  const displayUnits = String(units ?? '').trim() || '--';
  const hasUnits = displayUnits !== '--';

  const pill = (
    <span className='inline-flex h-8 max-w-full items-center justify-center rounded-lg bg-bg-weak-100 px-2.5 py-1.5 text-label-sm font-medium text-text-sub-500'>
      <span className='truncate'>{displayUnits}</span>
    </span>
  );

  if (!hasUnits) return pill;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span tabIndex={0} className='inline-flex max-w-full min-w-0 cursor-default'>
          {pill}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content size='xsmall' side='top' className={TOOLTIP_CONTENT_CLASS}>
        {displayUnits}
      </Tooltip.Content>
    </Tooltip.Root>
  );
};

const BOQ_TYPE_BADGE = {
  [PROJECT_BOQ_TYPES.MAIN]: { label: 'Main', color: 'blue' },
  [PROJECT_BOQ_TYPES.ADDITIONAL]: { label: 'Additional', color: 'orange' },
  [PROJECT_BOQ_TYPES.DESIGN]: { label: 'Design', color: 'purple' },
};

const BoqTypeBadge = ({ boqType }) => {
  const config = BOQ_TYPE_BADGE[boqType] ?? {
    label: String(boqType || '--'),
    color: 'gray',
  };

  return (
    <Badge.Root size='small' variant='light' color={config.color} title={config.label}>
      {config.label}
    </Badge.Root>
  );
};

const formatRowMarginPercent = (row = {}) => {
  if (row.marginPercent != null && row.marginPercent !== '') {
    const explicit = Number(row.marginPercent);
    if (Number.isFinite(explicit)) return `${Math.round(explicit)}%`;
  }

  const purchase = Number(row.purchaseRate) || 0;
  const selling = Number(row.sellingRate) || 0;
  if (selling <= 0) return '--';
  return `${Math.round(((selling - purchase) / selling) * 100)}%`;
};

const BrandValueWithTooltip = ({ brand }) => {
  const displayBrand = String(brand ?? '').trim() || '--';
  const hasBrand = displayBrand !== '--';

  if (!hasBrand) {
    return <span className='text-label-sm font-medium text-text-main-900'>--</span>;
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span
          tabIndex={0}
          className='block w-full min-w-0 cursor-default truncate text-label-sm font-medium text-text-main-900'
        >
          {displayBrand}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content size='xsmall' side='top' className={TOOLTIP_CONTENT_CLASS}>
        {displayBrand}
      </Tooltip.Content>
    </Tooltip.Root>
  );
};

const RateValueWithInfoTooltip = ({ value, min, max, label, className, isOutOfRange = false }) => {
  const [open, setOpen] = React.useState(false);
  const displayValue = formatBoqRupeeAmount(value);
  const tooltipText = formatBoqPriceRangeTooltip(min, max);

  const handleOpenChange = React.useCallback((next) => {
    if (!next) setOpen(false);
  }, []);

  const handleInfoClick = (event) => {
    event.stopPropagation();
    setOpen((previous) => !previous);
  };

  return (
    <div className={cn('flex items-center justify-end gap-0.5', className)}>
      <span
        className={cn(
          'whitespace-nowrap text-label-sm font-medium',
          isOutOfRange ? 'text-error-base' : 'text-text-main-900',
        )}
      >
        {displayValue}
      </span>
      <Tooltip.Root open={open} onOpenChange={handleOpenChange}>
        <Tooltip.Trigger asChild>
          <button
            type='button'
            tabIndex={-1}
            data-prevent-row-click
            className='inline-flex shrink-0 cursor-pointer text-text-soft-400 transition-colors hover:text-text-sub-500'
            aria-label={`${label}: ${displayValue}. ${tooltipText}`}
            aria-expanded={open}
            onClick={handleInfoClick}
          >
            <RiInformationFill className='size-5' aria-hidden />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content size='xsmall' side='top' className={TOOLTIP_CONTENT_CLASS}>
          {tooltipText}
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  );
};

const getColumnCellClassName = (isLast) =>
  cn('px-3 py-3', !isLast && 'border-r border-black/[0.07]');

const getProjectBoqCellClassName = (isLast) =>
  cn(
    'flex min-h-12 items-center bg-bg-white-0 py-3 pl-3 pr-5 text-text-sub-500',
    !isLast && 'border-r border-stroke-soft-200',
  );

const getProjectBoqHeaderClassName = (isLast) =>
  cn(
    'flex min-h-10 items-center bg-bg-weak-50 py-2 pl-3 pr-5',
    !isLast && 'border-r border-stroke-soft-200',
  );

const formatFloorQuantityDisplay = (value) => {
  if (value === '' || value == null) return '0';
  const numeric = Number.parseFloat(String(value).replaceAll(',', ''));
  if (Number.isNaN(numeric)) return String(value);
  return Number.isInteger(numeric) ? String(numeric) : String(numeric);
};

const isProjectBoqQuantityFloorColumn = (columnId) =>
  columnId.startsWith(PROJECT_BOQ_FLOOR_QUANTITY_COLUMN_PREFIX);

const getColumnHeaderClassName = (isLast) =>
  cn('flex items-center px-3 py-2', !isLast && 'border-r border-black/[0.08]');

const isInteractiveRowTarget = (target, rowElement) => {
  const interactive = target.closest(
    'button, a, input, textarea, select, [role="menuitem"], [data-prevent-row-click]',
  );
  if (!interactive || !rowElement) return Boolean(interactive);
  return interactive !== rowElement && rowElement.contains(interactive);
};

const areSelectedIdSetsEqual = (left, right) => {
  if (left.size !== right.size) return false;
  for (const id of left) {
    if (!right.has(id)) return false;
  }
  return true;
};

const BoqTemplateProductsTableRow = ({
  row,
  rowIndex,
  visibleColumns,
  descriptionExpanded,
  onDescriptionExpandedChange,
  onRowClick,
  onDelete,
  onQuantityChange,
  onAreaLocationChange,
  projectFloors = [],
  projectAreas = [],
  useProjectAreaDropdown = false,
  useProjectBoqColumns = false,
  priceView,
  skipTabStop = false,
  readOnly = false,
  disableEdit = false,
  isSelected = false,
  isSelectionDisabled = false,
  onToggleSelect,
  showSelection = false,
  columnConfigSource = BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.TEMPLATE,
  erStatus,
  onErStatusChange,
  onErOpen,
  quantityEditable = false,
}) => {
  const rowRef = React.useRef(null);
  const isAltRow = rowIndex % 2 === 1;
  const isPurchaseBoqTable =
    columnConfigSource === BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.PURCHASE_BOQ ||
    columnConfigSource === BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.PACKAGE_ITEMS ||
    columnConfigSource === BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.RAISE_PO_LINE_ITEMS;
  const isQuantityReadOnly = (readOnly || disableEdit) && !quantityEditable;

  const mergedFloorQuantities = useMemo(
    () => mergeProjectFloorsWithQuantity(projectFloors, row.quantityByFloor),
    [projectFloors, row.quantityByFloor],
  );

  const getCellClassName = (columnId, isLast) =>
    useProjectBoqColumns ? getProjectBoqCellClassName(isLast) : getColumnCellClassName(isLast);

  const renderCell = (columnId, isLast) => {
    switch (columnId) {
      case 'product': {
        const isPackaged = isPurchaseBoqTable && hasPurchaseBoqPackages(row);
        const isSplitLine = isPurchaseBoqTable && row.isSplitLine;
        const isNonProduct = isBoqLineNonProduct(row);
        const showCornerIcon = isPackaged || isSplitLine || isNonProduct;
        return (
          <div
            key={columnId}
            className={cn(
              getCellClassName(columnId, isLast),
              'relative flex items-center gap-3',
              showCornerIcon && 'pr-2',
            )}
          >
            {isSplitLine ? <PurchaseBoqSplitCornerIcon /> : null}
            {!isSplitLine && isPackaged ? (
              <PurchaseBoqPackageCornerIcon packages={row.packages} packageCode={row.packageCode} />
            ) : null}
            {!isSplitLine && !isPackaged && isNonProduct ? <BoqNonProductTag /> : null}
            {showSelection ? (
              <Checkbox.Root
                size='small'
                checked={isSelected}
                disabled={isSelectionDisabled}
                data-prevent-row-click
                aria-label={`Select ${row.product}`}
                onClick={(event) => event.stopPropagation()}
                onCheckedChange={() => onToggleSelect?.(row.id)}
              />
            ) : null}
            <ProductPlaceholderImage imageUrl={row.imageUrl} />
            {isPurchaseBoqTable ? (
              <PurchaseBoqProductNameCell
                product={row.product}
                isSplitLine={row.isSplitLine}
                isPackaged={hasPurchaseBoqPackages(row)}
              />
            ) : (
              <div className='flex min-w-0 flex-1 items-center'>
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate',
                    useProjectBoqColumns
                      ? 'text-paragraph-sm font-normal text-text-sub-500'
                      : 'text-label-sm font-medium text-[#16201b]',
                  )}
                >
                  {row.product}
                </span>
              </div>
            )}
          </div>
        );
      }
      case 'itemCode': {
        const boqId = isPurchaseBoqTable
          ? row.boqId || row.sourceProjectBoq || '--'
          : row.itemCode || row.item || '--';
        return (
          <div
            key={columnId}
            className={cn(getColumnCellClassName(isLast), 'flex min-w-0 items-center')}
          >
            <PurchaseBoqTruncatedText
              title={boqId}
              className='w-full text-label-sm font-medium text-text-main-900'
            >
              {boqId}
            </PurchaseBoqTruncatedText>
          </div>
        );
      }
      case 'boqType':
        return (
          <div key={columnId} className={cn(getColumnCellClassName(isLast), 'flex items-center')}>
            <BoqTypeBadge boqType={row.boqType} />
          </div>
        );
      case 'areaLocation': {
        const areaLabel = formatProjectBoqAreaLocations(
          parseProjectBoqAreaLocations(row.areaLocation),
        );
        return (
          <div
            key={columnId}
            className={cn(getCellClassName(columnId, isLast), 'flex w-full min-w-0 items-center')}
            onClick={(event) => event.stopPropagation()}
          >
            {useProjectAreaDropdown && !readOnly && !disableEdit ? (
              <BoqTemplateAreaLocationDropdown
                value={row.areaLocation}
                projectAreas={projectAreas}
                onValueChange={(nextValue) =>
                  onAreaLocationChange?.({
                    ...row,
                    areaLocation: nextValue,
                  })
                }
              />
            ) : (
              <PurchaseBoqTruncatedText
                title={areaLabel}
                className='text-label-sm font-medium text-text-main-900'
              >
                {areaLabel}
              </PurchaseBoqTruncatedText>
            )}
          </div>
        );
      }
      case 'description':
        return (
          <div
            key={columnId}
            className={cn(
              getCellClassName(columnId, isLast),
              !readOnly && !disableEdit && 'cursor-pointer',
            )}
            title={row.description || undefined}
            onClick={
              readOnly || disableEdit
                ? undefined
                : (event) => {
                    event.stopPropagation();
                    onRowClick?.(row, 'description');
                  }
            }
          >
            <ExpandableClampText
              as='div'
              disabled
              text={row.description}
              lines={3}
              expanded={descriptionExpanded}
              onExpandedChange={onDescriptionExpandedChange}
              textClassName={useProjectBoqColumns ? 'font-normal text-text-sub-500' : 'font-normal'}
            />
          </div>
        );
      case 'productCategory':
        return (
          <div
            key={columnId}
            className={cn(getCellClassName(columnId, isLast), 'flex min-w-0 items-center')}
          >
            <BoqProductCategoryPathCell row={row} />
          </div>
        );
      case 'brand':
        return (
          <div
            key={columnId}
            className={cn(
              getCellClassName(columnId, isLast),
              'flex min-w-0 items-center',
              !readOnly && !disableEdit && 'cursor-pointer',
            )}
            title={row.brand || undefined}
            onClick={
              readOnly || disableEdit
                ? undefined
                : (event) => {
                    event.stopPropagation();
                    onRowClick?.(row, 'brand');
                  }
            }
          >
            <BrandValueWithTooltip brand={row.brand} />
          </div>
        );
      case 'units':
        return (
          <div
            key={columnId}
            className={cn(
              getCellClassName(columnId, isLast),
              'flex min-w-0 items-center',
              !readOnly && !disableEdit && 'cursor-pointer',
            )}
            title={row.units || undefined}
            onClick={
              readOnly || disableEdit
                ? undefined
                : (event) => {
                    event.stopPropagation();
                    onRowClick?.(row, 'units');
                  }
            }
          >
            {useProjectBoqColumns ? (
              <span className='text-paragraph-sm'>{row.units || '--'}</span>
            ) : (
              <UnitsPill units={row.units} />
            )}
          </div>
        );
      case 'sqft':
        return (
          <div
            key={columnId}
            className={cn(
              getCellClassName(columnId, isLast),
              'flex items-center',
              !readOnly && !disableEdit && 'cursor-pointer',
            )}
            onClick={
              readOnly || disableEdit
                ? undefined
                : (event) => {
                    event.stopPropagation();
                    onRowClick?.(row, 'sqft');
                  }
            }
          >
            <span className='truncate text-label-sm font-medium text-text-main-900'>
              {row.sqft === '' || row.sqft == null ? '--' : row.sqft}
            </span>
          </div>
        );
      case 'quantity': {
        const showPoQuantity =
          isPurchaseBoqTable &&
          row.procurementStatus === 'po-released' &&
          (Number(row.poQuantity) > 0 || Boolean(row.poQuantityLabel));

        if (showPoQuantity) {
          return (
            <div
              key={columnId}
              className={cn(getCellClassName(columnId, isLast), 'flex min-w-0 items-center')}
              onClick={(event) => event.stopPropagation()}
              title={`PO quantity raised: ${row.poQuantityLabel || row.poQuantity}`}
            >
              <PurchaseBoqQuantityPill quantity={row.poQuantityLabel || row.poQuantity} />
            </div>
          );
        }

        return (
          <div
            key={columnId}
            className={cn(getCellClassName(columnId, isLast), 'flex min-w-0 items-center')}
            onClick={(event) => event.stopPropagation()}
          >
            <BoqTemplateQuantityDropdown
              quantity={row.quantity}
              quantityByFloor={row.quantityByFloor}
              floorOptions={projectFloors}
              units={row.units}
              readOnly={isQuantityReadOnly}
              onQuantityChange={
                isQuantityReadOnly
                  ? undefined
                  : (payload) =>
                      onQuantityChange?.({
                        ...row,
                        ...payload,
                      })
              }
            />
          </div>
        );
      }
      case 'purchaseRate': {
        if (isPurchaseBoqTable) {
          return (
            <div key={columnId} className={cn(getColumnCellClassName(isLast), 'flex items-center')}>
              <PurchaseBoqRateCell value={row.purchaseRate} />
            </div>
          );
        }

        const purchaseRates = resolvePurchaseRateDisplay(row);
        if (useProjectBoqColumns) {
          return (
            <div
              key={columnId}
              className={cn(getCellClassName(columnId, isLast), 'flex items-center')}
            >
              <span className='whitespace-nowrap text-paragraph-sm'>
                {formatBoqRupeeAmount(purchaseRates.value)}
              </span>
            </div>
          );
        }
        return (
          <div
            key={columnId}
            className={cn(getCellClassName(columnId, isLast), 'flex items-center')}
          >
            <RateValueWithInfoTooltip
              value={purchaseRates.value}
              min={purchaseRates.min}
              max={purchaseRates.max}
              label='Purchase price'
              isOutOfRange={purchaseRates.isOutOfRange}
              className='w-full'
            />
          </div>
        );
      }
      case 'sellingRate': {
        const sellingRates = resolveSellingRateDisplay(row);
        if (useProjectBoqColumns) {
          return (
            <div
              key={columnId}
              className={cn(getCellClassName(columnId, isLast), 'flex items-center')}
            >
              <span className='whitespace-nowrap text-paragraph-sm'>
                {formatBoqRupeeAmount(sellingRates.value)}
              </span>
            </div>
          );
        }
        return (
          <div
            key={columnId}
            className={cn(getCellClassName(columnId, isLast), 'flex items-center')}
          >
            <RateValueWithInfoTooltip
              value={sellingRates.value}
              min={sellingRates.min}
              max={sellingRates.max}
              label='Selling price'
              isOutOfRange={sellingRates.isOutOfRange}
              className='w-full'
            />
          </div>
        );
      }
      case 'marginPercent':
        return (
          <div key={columnId} className={cn(getColumnCellClassName(isLast), 'flex items-center')}>
            <div className='flex w-full items-center justify-end gap-0.5'>
              <span className='whitespace-nowrap text-label-sm font-medium text-[#079455]'>
                {formatRowMarginPercent(row)}
              </span>
              <RiInformationFill className='size-5 shrink-0 text-text-soft-400' aria-hidden />
            </div>
          </div>
        );
      case 'make':
        return (
          <div
            key={columnId}
            className={cn(getCellClassName(columnId, isLast), 'flex items-center')}
          >
            <PurchaseBoqTruncatedText
              title={row.make || '--'}
              className='text-label-sm font-medium text-text-main-900'
            >
              {row.make || '--'}
            </PurchaseBoqTruncatedText>
          </div>
        );
      case 'notes':
        return (
          <div
            key={columnId}
            className={cn(getCellClassName(columnId, isLast), 'flex items-center')}
          >
            <PurchaseBoqTruncatedText
              title={row.notes || '--'}
              className='text-label-sm font-medium text-text-main-900'
            >
              {row.notes || '--'}
            </PurchaseBoqTruncatedText>
          </div>
        );
      case 'boqCategory': {
        const label = row.boqCategory || row.section || '';
        return (
          <div key={columnId} className={cn(getColumnCellClassName(isLast), 'flex items-center')}>
            <PurchaseBoqCategoryTag label={label} />
          </div>
        );
      }
      case 'purchaseCategory': {
        const label = row.purchaseCategory || row.section || '';
        if (isPurchaseBoqTable && !readOnly && !disableEdit) {
          return (
            <div
              key={columnId}
              className={cn(getColumnCellClassName(isLast), 'flex min-w-0 items-center')}
              onClick={(event) => event.stopPropagation()}
            >
              <PurchaseBoqCategorySelect
                value={label}
                placeholder='Purchase Category'
                onValueChange={(nextValue) =>
                  onAreaLocationChange?.({
                    ...row,
                    purchaseCategory: nextValue,
                  })
                }
              />
            </div>
          );
        }
        return (
          <div key={columnId} className={cn(getColumnCellClassName(isLast), 'flex items-center')}>
            <PurchaseBoqCategoryTag label={label} />
          </div>
        );
      }
      case 'lineValue':
        return (
          <div key={columnId} className={cn(getColumnCellClassName(isLast), 'flex items-center')}>
            <PurchaseBoqValueCell
              value={
                isPurchaseBoqTable
                  ? computeBoqProductLineAmount(row.purchaseRate, row)
                  : row.lineValue
              }
            />
          </div>
        );
      case 'vendorRate':
        return (
          <div key={columnId} className={cn(getColumnCellClassName(isLast), 'flex items-center')}>
            <PurchaseBoqRateCell value={row.vendorRate ?? row.purchaseRate} />
          </div>
        );
      case 'discPercent':
        return (
          <div key={columnId} className={cn(getColumnCellClassName(isLast), 'flex items-center')}>
            <span className='text-label-sm font-medium tabular-nums text-text-main-900'>
              {row.discPercent !== undefined && row.discPercent !== null && row.discPercent !== ''
                ? row.discPercent
                : '--'}
            </span>
          </div>
        );
      case 'discValue':
        return (
          <div key={columnId} className={cn(getColumnCellClassName(isLast), 'flex items-center')}>
            <PurchaseBoqValueCell value={row.discValue} />
          </div>
        );
      case 'remarks':
        return (
          <div key={columnId} className={cn(getColumnCellClassName(isLast), 'flex items-center')}>
            <span className='truncate text-label-sm font-medium text-text-main-900'>
              {row.remarks || '--'}
            </span>
          </div>
        );
      case 'poRate':
        return (
          <div key={columnId} className={cn(getColumnCellClassName(isLast), 'flex items-center')}>
            <PurchaseBoqRateCell value={row.poRate ?? row.purchaseRate} />
          </div>
        );
      case 'poValue':
        return (
          <div key={columnId} className={cn(getColumnCellClassName(isLast), 'flex items-center')}>
            <PurchaseBoqValueCell value={row.poValue ?? row.lineValue} />
          </div>
        );
      case 'packageCode':
        return (
          <div key={columnId} className={cn(getColumnCellClassName(isLast), 'flex items-center')}>
            <PurchaseBoqPackageCell packages={row.packages} packageCode={row.packageCode} />
          </div>
        );
      case 'vendors':
        return (
          <div key={columnId} className={cn(getColumnCellClassName(isLast), 'flex items-center')}>
            <PurchaseBoqVendorTags vendors={row.vendors} />
          </div>
        );
      case 'journey':
        return (
          <div
            key={columnId}
            className={cn(getColumnCellClassName(isLast), 'flex items-center overflow-visible')}
          >
            <PurchaseBoqJourneyTracker
              activeStepIndex={row.journeyActiveStep}
              procurementStatus={row.procurementStatus}
            />
          </div>
        );
      case 'procurementStatus':
        return (
          <div
            key={columnId}
            className={cn(
              getColumnCellClassName(isLast),
              'flex min-w-0 items-center overflow-visible',
            )}
          >
            <PurchaseBoqStatusBadge status={row.procurementStatus} />
          </div>
        );
      case 'er':
        return (
          <div
            key={columnId}
            className={cn(getCellClassName(columnId, isLast), 'flex items-center')}
            onClick={(event) => event.stopPropagation()}
          >
            <BoqErStatusDropdown
              status={erStatus}
              onStatusChange={onErStatusChange}
              onOpenEr={onErOpen}
              disabled={!onErStatusChange}
            />
          </div>
        );
      case 'quantityTotal': {
        const useSellingRate = priceView === PROJECT_BOQ_PRICE_VIEW.CLIENT;
        const unitRate = useSellingRate
          ? resolveSellingRateDisplay(row).value
          : resolvePurchaseRateDisplay(row).value;
        const lineAmount = computeBoqProductLineAmount(unitRate, row);
        return (
          <div
            key={columnId}
            className={cn(getCellClassName(columnId, isLast), 'flex items-center')}
          >
            <span className='whitespace-nowrap text-paragraph-sm'>
              {formatBoqRupeeAmount(lineAmount)}
            </span>
          </div>
        );
      }
      default:
        if (isProjectBoqQuantityFloorColumn(columnId)) {
          const floorName = columnId.slice(PROJECT_BOQ_FLOOR_QUANTITY_COLUMN_PREFIX.length);
          const floorEntry = mergedFloorQuantities.find((entry) => entry.floor === floorName);
          return (
            <div
              key={columnId}
              className={cn(getCellClassName(columnId, isLast), 'flex items-center justify-center')}
            >
              <span className='text-paragraph-sm'>
                {formatFloorQuantityDisplay(floorEntry?.value)}
              </span>
            </div>
          );
        }
        return null;
    }
  };

  const handleRowClick = (event) => {
    if (readOnly || disableEdit) return;
    if (isInteractiveRowTarget(event.target, rowRef.current)) return;
    onRowClick?.(row);
  };

  return (
    <div
      ref={rowRef}
      tabIndex={readOnly || disableEdit || skipTabStop ? -1 : 0}
      onClick={readOnly || disableEdit ? undefined : handleRowClick}
      onKeyDown={
        readOnly || disableEdit
          ? undefined
          : (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                if (isInteractiveRowTarget(event.target, rowRef.current)) return;
                event.preventDefault();
                onRowClick?.(row);
              }
            }
      }
      className={cn(
        BOQ_TEMPLATE_PRODUCTS_GRID_CLASS,
        'group/row relative last:border-b-0',
        useProjectBoqColumns
          ? 'border-b border-stroke-soft-200 bg-bg-white-0'
          : cn(
              'border-b border-[#ededed]',
              row.isSplitLine || isAltRow ? 'bg-[#fbfbfb]' : 'bg-bg-white-0',
            ),
        !readOnly && !disableEdit && 'cursor-pointer transition-colors hover:bg-bg-weak-50',
        !readOnly && disableEdit && 'transition-colors hover:bg-bg-weak-50',
      )}
      style={buildBoqTemplateProductsGridStyle(visibleColumns)}
    >
      {visibleColumns.map((column, index) =>
        renderCell(column.id, index === visibleColumns.length - 1),
      )}
      {!readOnly ? (
        <BoqTemplateProductRowHoverActions
          skipTabStop={skipTabStop}
          onDelete={() => onDelete?.(row)}
        />
      ) : null}
    </div>
  );
};

const BoqTemplateProductsTable = ({
  products = [],
  categoryId = '',
  section = '',
  editingRowId = null,
  editingFocusColumnId = 'product',
  isAddingProduct = false,
  onAddProduct,
  onDeleteProduct,
  onDeleteProducts,
  onUpdateProduct,
  onEditRow,
  onCancelEdit,
  onNavigateEdit,
  onStartAddProduct,
  onCancelAddProduct,
  hasActiveEditSession = false,
  columnConfig = [],
  priceView,
  readOnly = false,
  disableEdit = false,
  quantityEditable = false,
  allDescriptionsExpanded = false,
  onAllDescriptionsExpandedChange,
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
  const [tableDescriptionsExpanded, setTableDescriptionsExpanded] = useState(false);
  const [rowDescriptionExpanded, setRowDescriptionExpanded] = useState({});
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [deleteTargets, setDeleteTargets] = useState([]);
  const [internalSelectedIds, setInternalSelectedIds] = useState(() => new Set());
  const [erStatusByRowId, setErStatusByRowId] = useState({});
  const [erModalProduct, setErModalProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [internalEditingRowId, setInternalEditingRowId] = useState(null);
  const [internalEditingFocusColumnId, setInternalEditingFocusColumnId] = useState('product');
  const [internalIsAddingProduct, setInternalIsAddingProduct] = useState(false);
  const [addLineMode, setAddLineMode] = useState(BOQ_ADD_LINE_MODES.MASTER);
  const saveRequestIdRef = useRef(0);

  const isEditControlled = onEditRow != null;
  const isAddControlled = onStartAddProduct != null;

  const activeEditingRowId = isEditControlled ? editingRowId : internalEditingRowId;
  const activeEditingFocusColumnId = isEditControlled
    ? editingFocusColumnId
    : internalEditingFocusColumnId;
  const activeIsAddingProduct = isAddControlled ? isAddingProduct : internalIsAddingProduct;
  const activeHasEditSession =
    hasActiveEditSession || Boolean(activeEditingRowId) || activeIsAddingProduct;

  const visibleColumns = useMemo(
    () =>
      getVisibleProductColumnsForSource(columnConfig, priceView, {
        useProjectBoqColumns,
        columnConfigSource,
      }),
    [columnConfig, columnConfigSource, priceView, useProjectBoqColumns],
  );

  const visibleColumnIds = useMemo(
    () => visibleColumns.map((column) => column.id),
    [visibleColumns],
  );

  const gridStyle = useMemo(
    () => buildBoqTemplateProductsGridStyle(visibleColumns),
    [visibleColumns],
  );

  const minTableWidth = useMemo(() => {
    const fixedWidthTotal = visibleColumns.reduce((total, column) => {
      const width = column.width ?? '120px';
      if (width.startsWith('minmax(')) return total + 280;
      const numeric = Number.parseInt(width, 10);
      return total + (Number.isNaN(numeric) ? 120 : numeric);
    }, 0);
    return Math.max(fixedWidthTotal, 320);
  }, [visibleColumns]);

  const isTableDescriptionsExpanded = allDescriptionsExpanded || tableDescriptionsExpanded;
  const showDescriptionExpandControl = visibleColumnIds.includes('description');

  const handleToggleTableDescriptions = useCallback(() => {
    if (allDescriptionsExpanded) {
      onAllDescriptionsExpandedChange?.(false);
      setTableDescriptionsExpanded(false);
      setRowDescriptionExpanded({});
      return;
    }

    setTableDescriptionsExpanded((previous) => {
      const next = !previous;
      if (!next) setRowDescriptionExpanded({});
      return next;
    });
  }, [allDescriptionsExpanded, onAllDescriptionsExpandedChange]);

  useEffect(() => {
    if (!allDescriptionsExpanded) {
      setTableDescriptionsExpanded(false);
      setRowDescriptionExpanded({});
    }
  }, [allDescriptionsExpanded]);

  const getRowDescriptionExpanded = useCallback(
    (rowId) => {
      if (isTableDescriptionsExpanded) return true;
      return Boolean(rowDescriptionExpanded[rowId]);
    },
    [isTableDescriptionsExpanded, rowDescriptionExpanded],
  );

  const handleRowDescriptionExpandedChange = useCallback(
    (rowId, next) => {
      setTableDescriptionsExpanded(false);
      onAllDescriptionsExpandedChange?.(false);
      setRowDescriptionExpanded((previous) => ({
        ...previous,
        [rowId]: next,
      }));
    },
    [onAllDescriptionsExpandedChange],
  );

  const isSelectionControlled =
    selectedProductIds != null && typeof onSelectedProductIdsChange === 'function';
  const activeSelectedIds = isSelectionControlled ? selectedProductIds : internalSelectedIds;

  const updateSelectedIds = useCallback(
    (updater) => {
      if (isSelectionControlled) {
        const previous = activeSelectedIds;
        const next = typeof updater === 'function' ? updater(new Set(previous)) : new Set(updater);
        if (!areSelectedIdSetsEqual(previous, next)) {
          onSelectedProductIdsChange(next);
        }
        return;
      }

      setInternalSelectedIds(updater);
    },
    [activeSelectedIds, isSelectionControlled, onSelectedProductIdsChange],
  );

  const hasProducts = products.length > 0;
  const selectableProductIds = useMemo(
    () =>
      products
        .filter((product) => !isProductSelectionDisabled(product, columnConfigSource))
        .map((product) => product.id),
    [columnConfigSource, products],
  );
  const selectableProductIdSet = useMemo(
    () => new Set(selectableProductIds),
    [selectableProductIds],
  );
  const disabledProductIdSet = useMemo(
    () =>
      new Set(
        products
          .filter((product) => isProductSelectionDisabled(product, columnConfigSource))
          .map((product) => product.id),
      ),
    [columnConfigSource, products],
  );
  const selectedCount = useMemo(
    () => selectableProductIds.filter((id) => activeSelectedIds.has(id)).length,
    [activeSelectedIds, selectableProductIds],
  );
  const selectedProducts = useMemo(
    () =>
      products.filter(
        (product) => selectableProductIdSet.has(product.id) && activeSelectedIds.has(product.id),
      ),
    [activeSelectedIds, products, selectableProductIdSet],
  );
  const selectedNonProductLines = useMemo(
    () => getNonProductLinesFromSelection(selectedProducts),
    [selectedProducts],
  );
  const showConvertToProductAction =
    Boolean(onConvertToProduct) && selectedNonProductLines.length > 0;
  const allSelected =
    selectableProductIds.length > 0 && selectedCount === selectableProductIds.length;
  const someSelected = selectedCount > 0 && !allSelected;
  const showSelection = enableRowSelection || (!readOnly && Boolean(onDeleteProduct));
  const showDefaultSelectionBar = showSelection && !hideSelectionBar && Boolean(onDeleteProduct);
  const showErColumn = useProjectBoqColumns && visibleColumnIds.includes('er');

  const resolveRowErStatus = useCallback(
    (row, rowIndex) => {
      const rowKey = row.id || `row-${rowIndex}`;
      if (erStatusByRowId[rowKey]) return erStatusByRowId[rowKey];
      return resolveBoqErStatus(row);
    },
    [erStatusByRowId],
  );

  const handleErStatusClick = useCallback((row) => {
    setErModalProduct(row);
  }, []);

  const erStatusChangeDisabled =
    readOnly || (Boolean(priceView) && priceView !== PROJECT_BOQ_PRICE_VIEW.COMPARISON);

  const handleErStatusChange = useCallback(
    async (row, nextStatus) => {
      if (!row?.id || !nextStatus || erStatusChangeDisabled) return;

      const rowKey = row.id;
      const previousStatus = resolveRowErStatus(
        row,
        products.findIndex((product) => product.id === rowKey),
      );

      setErStatusByRowId((current) => ({ ...current, [rowKey]: nextStatus }));
      onErStatusCommit?.({ productId: rowKey, erStatus: nextStatus });

      if (!boqCode) return;

      try {
        await initBoqEstimationDraft(boqCode, {
          rowName: rowKey,
          erStatus: nextStatus,
          floors: projectFloors,
        });
      } catch (error) {
        setErStatusByRowId((current) => {
          const next = { ...current };
          if (next[rowKey] === nextStatus) {
            delete next[rowKey];
          }
          return next;
        });
        onErStatusCommit?.({ productId: rowKey, erStatus: previousStatus });
        showErrorToast(error, { defaultMessage: 'Failed to update ER status.' });
      }
    },
    [
      boqCode,
      erStatusChangeDisabled,
      onErStatusCommit,
      products,
      projectFloors,
      resolveRowErStatus,
    ],
  );

  useEffect(() => {
    const removeDisabledIds = (previous) => {
      const next = new Set([...previous].filter((id) => !disabledProductIdSet.has(id)));
      return areSelectedIdSetsEqual(previous, next) ? previous : next;
    };

    if (isSelectionControlled) {
      const next = removeDisabledIds(activeSelectedIds);
      if (next !== activeSelectedIds) onSelectedProductIdsChange(next);
      return;
    }

    setInternalSelectedIds(removeDisabledIds);
  }, [activeSelectedIds, disabledProductIdSet, isSelectionControlled, onSelectedProductIdsChange]);

  const handleToggleSelect = useCallback(
    (rowId) => {
      if (!selectableProductIdSet.has(rowId)) return;
      updateSelectedIds((previous) => {
        const next = new Set(previous);
        if (next.has(rowId)) next.delete(rowId);
        else next.add(rowId);
        return next;
      });
    },
    [selectableProductIdSet, updateSelectedIds],
  );

  const handleToggleSelectAll = useCallback(() => {
    updateSelectedIds((previous) => {
      if (selectableProductIds.every((id) => previous.has(id))) {
        const next = new Set(previous);
        selectableProductIds.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...previous, ...selectableProductIds]);
    });
  }, [selectableProductIds, updateSelectedIds]);

  const handleClearSelection = useCallback(() => {
    updateSelectedIds(new Set());
  }, [updateSelectedIds]);

  const resolvedCategoryId =
    categoryId || products[0]?.categoryType || products[0]?.categoryId || '';
  const resolvedCategoryType = String(products[0]?.categoryType ?? '').trim();
  const resolvedCategoryGroup = String(products[0]?.categoryGroup ?? '').trim();

  const cancelEdit = useCallback(() => {
    if (isEditControlled) {
      onCancelEdit?.();
      return;
    }
    setInternalEditingRowId(null);
    setInternalEditingFocusColumnId('product');
  }, [isEditControlled, onCancelEdit]);

  const startEdit = useCallback(
    (rowId, focusColumnId) => {
      const resolvedFocus =
        focusColumnId ||
        resolveBoqTemplateInitialFocusColumnId(visibleColumnIds, true, {
          autoFocusProductName: false,
        });

      if (isEditControlled) {
        onEditRow?.(rowId, resolvedFocus);
        return;
      }

      setInternalIsAddingProduct(false);
      setInternalEditingRowId(rowId);
      setInternalEditingFocusColumnId(resolvedFocus);
    },
    [isEditControlled, onEditRow, visibleColumnIds],
  );

  const navigateEdit = useCallback(
    (currentRowId, direction, focusColumn) => {
      if (onNavigateEdit) {
        onNavigateEdit(currentRowId, direction, focusColumn);
        return;
      }

      const currentIndex = products.findIndex((product) => product.id === currentRowId);
      const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      const nextProduct = products[nextIndex];

      if (!nextProduct) {
        cancelEdit();
        return;
      }

      const resolvedFocus =
        focusColumn ||
        resolveBoqTemplateInitialFocusColumnId(visibleColumnIds, true, {
          autoFocusProductName: false,
        });

      setInternalEditingRowId(nextProduct.id);
      setInternalEditingFocusColumnId(resolvedFocus);
    },
    [cancelEdit, onNavigateEdit, products, visibleColumnIds],
  );

  const handleStartAddProduct = useCallback(
    (mode = BOQ_ADD_LINE_MODES.MASTER) => {
      setAddLineMode(mode);
      if (isAddControlled) {
        onStartAddProduct?.(mode);
        return;
      }
      cancelEdit();
      setInternalIsAddingProduct(true);
    },
    [cancelEdit, isAddControlled, onStartAddProduct],
  );

  useEffect(() => {
    if (!requestAddLineMode) return;
    handleStartAddProduct(requestAddLineMode);
    onRequestAddLineModeConsumed?.();
  }, [handleStartAddProduct, onRequestAddLineModeConsumed, requestAddLineMode]);

  const handleCancelAddProduct = useCallback(() => {
    setAddLineMode(BOQ_ADD_LINE_MODES.MASTER);
    if (isAddControlled) {
      onCancelAddProduct?.();
      return;
    }
    setInternalIsAddingProduct(false);
  }, [isAddControlled, onCancelAddProduct]);

  const handleRowClick = useCallback(
    (row, focusColumnId) => {
      if (readOnly) return;
      startEdit(row.id, focusColumnId);
    },
    [readOnly, startEdit],
  );

  const handleCancelEditProduct = useCallback(() => {
    cancelEdit();
  }, [cancelEdit]);

  const runProductMutation = useCallback(async (mutation) => {
    const requestId = saveRequestIdRef.current + 1;
    saveRequestIdRef.current = requestId;
    setIsSavingProduct(true);
    try {
      await mutation();
    } finally {
      if (saveRequestIdRef.current === requestId) {
        setIsSavingProduct(false);
      }
    }
  }, []);

  const handleSaveEditProduct = useCallback(
    async (updatedProduct, options = {}) => {
      try {
        await runProductMutation(async () => {
          await onUpdateProduct?.(updatedProduct);
          if (options.navigate === 'next' || options.navigate === 'prev') {
            navigateEdit(updatedProduct.id, options.navigate, options.focusColumn);
          } else {
            cancelEdit();
          }
        });
      } catch {
        // Error toast is shown by the parent handler.
      }
    },
    [cancelEdit, navigateEdit, onUpdateProduct, runProductMutation],
  );

  const handleQuantityChange = useCallback(
    async (updatedProduct) => {
      if (!updatedProduct?.id) return;
      try {
        await runProductMutation(() =>
          onUpdateProduct?.({
            ...updatedProduct,
            _lumpsumQuantitySync: true,
          }),
        );
      } catch {
        // Error toast is shown by the parent handler.
      }
    },
    [onUpdateProduct, runProductMutation],
  );

  const handleAreaLocationChange = useCallback(
    async (updatedProduct) => {
      if (!updatedProduct?.id) return;
      try {
        await runProductMutation(() => onUpdateProduct?.(updatedProduct));
      } catch {
        // Error toast is shown by the parent handler.
      }
    },
    [onUpdateProduct, runProductMutation],
  );

  const handleSaveAddProduct = useCallback(
    async (newProduct, options = {}) => {
      try {
        await runProductMutation(async () => {
          await onAddProduct?.(newProduct, section, options);
          if (!isAddControlled) {
            setInternalIsAddingProduct(false);
            setAddLineMode(BOQ_ADD_LINE_MODES.MASTER);
          }
        });
      } catch {
        // Error toast is shown by the parent handler.
      }
    },
    [isAddControlled, onAddProduct, runProductMutation, section],
  );

  const handleDeleteRequest = useCallback((row) => {
    setDeleteTargets([row]);
  }, []);

  const handleBulkDeleteRequest = useCallback(() => {
    const targets = products.filter((product) => activeSelectedIds.has(product.id));
    if (targets.length === 0) return;
    setDeleteTargets(targets);
  }, [products, activeSelectedIds]);

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteTargets.length === 0) return;

    setIsDeleting(true);
    try {
      if (onDeleteProducts) {
        await onDeleteProducts(deleteTargets);
      } else {
        for (const product of deleteTargets) {
          await onDeleteProduct?.(product);
        }
      }

      if (deleteTargets.some((product) => product.id === activeEditingRowId)) cancelEdit();
      updateSelectedIds((previous) => {
        const next = new Set(previous);
        deleteTargets.forEach((product) => next.delete(product.id));
        return next;
      });
      setDeleteTargets([]);
    } catch {
      // Error toast is shown by the parent handler.
    } finally {
      setIsDeleting(false);
    }
  }, [
    activeEditingRowId,
    cancelEdit,
    deleteTargets,
    onDeleteProduct,
    onDeleteProducts,
    updateSelectedIds,
  ]);

  const tableBody = useMemo(
    () =>
      products.map((row, index) => {
        if (activeEditingRowId === row.id) {
          return (
            <BoqTemplateAddProductRow
              key={row.id}
              categoryId={resolvedCategoryId}
              categoryType={resolvedCategoryType}
              categoryGroup={resolvedCategoryGroup}
              section={section}
              visibleColumnIds={visibleColumnIds}
              gridStyle={gridStyle}
              gridClassName={cn(
                BOQ_TEMPLATE_PRODUCTS_EDIT_GRID_CLASS,
                'border-b border-[#ededed] bg-bg-white-0 last:border-b-0',
                isSavingProduct && 'opacity-60',
              )}
              initialValues={row}
              isEditMode
              autoFocusProductName={false}
              initialFocusColumnId={activeEditingFocusColumnId}
              projectFloors={projectFloors}
              projectAreas={projectAreas}
              useProjectAreaDropdown={useProjectBoqColumns}
              useProjectBoqColumns={useProjectBoqColumns}
              priceView={priceView}
              columnConfigSource={columnConfigSource}
              onCancel={handleCancelEditProduct}
              onSave={handleSaveEditProduct}
            />
          );
        }

        return (
          <BoqTemplateProductsTableRow
            key={row.id}
            row={row}
            rowIndex={index}
            visibleColumns={visibleColumns}
            descriptionExpanded={getRowDescriptionExpanded(row.id)}
            onDescriptionExpandedChange={(next) => handleRowDescriptionExpandedChange(row.id, next)}
            onRowClick={readOnly ? undefined : handleRowClick}
            onDelete={readOnly ? undefined : handleDeleteRequest}
            onQuantityChange={readOnly && !quantityEditable ? undefined : handleQuantityChange}
            onAreaLocationChange={readOnly ? undefined : handleAreaLocationChange}
            projectFloors={projectFloors}
            projectAreas={projectAreas}
            useProjectAreaDropdown={useProjectBoqColumns}
            useProjectBoqColumns={useProjectBoqColumns}
            priceView={priceView}
            skipTabStop={activeHasEditSession}
            readOnly={readOnly}
            disableEdit={disableEdit}
            quantityEditable={quantityEditable}
            showSelection={showSelection}
            isSelected={activeSelectedIds.has(row.id)}
            isSelectionDisabled={isProductSelectionDisabled(row, columnConfigSource)}
            onToggleSelect={handleToggleSelect}
            columnConfigSource={columnConfigSource}
            erStatus={showErColumn ? resolveRowErStatus(row, index) : undefined}
            onErStatusChange={
              showErColumn && !erStatusChangeDisabled
                ? (nextStatus) => handleErStatusChange(row, nextStatus)
                : undefined
            }
            onErOpen={showErColumn ? () => handleErStatusClick(row) : undefined}
          />
        );
      }),
    [
      activeEditingFocusColumnId,
      activeEditingRowId,
      activeHasEditSession,
      getRowDescriptionExpanded,
      gridStyle,
      handleCancelEditProduct,
      handleDeleteRequest,
      handleAreaLocationChange,
      handleQuantityChange,
      handleRowClick,
      handleRowDescriptionExpandedChange,
      handleSaveEditProduct,
      handleToggleSelect,
      handleErStatusClick,
      handleErStatusChange,
      erStatusChangeDisabled,
      resolveRowErStatus,
      isSavingProduct,
      products,
      activeSelectedIds,
      showSelection,
      showErColumn,
      projectAreas,
      projectFloors,
      readOnly,
      disableEdit,
      useProjectBoqColumns,
      priceView,
      quantityEditable,
      resolvedCategoryId,
      section,
      visibleColumnIds,
      visibleColumns,
      columnConfigSource,
    ],
  );

  const renderHeaderCell = (column, index) => {
    const isLast = index === visibleColumns.length - 1;
    const label = column.columnLabel ?? column.label ?? column.id;
    const headerClassName = useProjectBoqColumns
      ? getProjectBoqHeaderClassName(isLast)
      : getColumnHeaderClassName(isLast);

    if (column.id === 'product' && showSelection) {
      return (
        <div key={column.id} className={cn(headerClassName, 'gap-3')}>
          <Checkbox.Root
            size='small'
            checked={allSelected ? true : someSelected ? 'indeterminate' : false}
            disabled={selectableProductIds.length === 0}
            aria-label='Select all products'
            onCheckedChange={handleToggleSelectAll}
          />
          <HeaderLabel label={label} />
        </div>
      );
    }

    if (column.id === 'description' && showDescriptionExpandControl) {
      return (
        <div key={column.id} className={cn(headerClassName, 'relative')}>
          <HeaderLabel label={label} />
          <CompactButton.Root
            type='button'
            variant='ghost'
            size='medium'
            tabIndex={activeHasEditSession ? -1 : 0}
            data-prevent-row-click
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2',
              activeHasEditSession && 'pointer-events-none',
            )}
            aria-label={
              isTableDescriptionsExpanded ? 'Collapse descriptions' : 'Expand descriptions'
            }
            aria-pressed={isTableDescriptionsExpanded}
            onClick={handleToggleTableDescriptions}
          >
            <CompactButton.Icon
              as={isTableDescriptionsExpanded ? RiExpandDiagonalLine : LuExpand}
              className='size-4 text-text-soft-400'
            />
          </CompactButton.Root>
        </div>
      );
    }

    return (
      <div key={column.id} className={headerClassName}>
        <HeaderLabel label={label} />
      </div>
    );
  };

  if (visibleColumns.length === 0) {
    return (
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-8 text-center text-paragraph-sm text-text-soft-400'>
        No columns selected. Use the column settings to show columns.
      </div>
    );
  }

  return (
    <>
      <Tooltip.Provider delayDuration={0}>
        <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
          {showDefaultSelectionBar && selectedCount > 0 ? (
            <div className='flex shrink-0 items-center justify-between gap-3 border-b border-stroke-soft-200 bg-bg-weak-50 px-3 py-2.5'>
              <span className='text-label-sm font-medium text-text-sub-500'>
                {selectedCount} selected
              </span>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  className='text-label-sm font-medium text-text-soft-400 transition-colors hover:text-text-sub-500 disabled:opacity-50'
                  onClick={handleClearSelection}
                  disabled={isDeleting}
                >
                  Clear
                </button>
                {showConvertToProductAction ? (
                  <Button.Root
                    type='button'
                    variant='primary'
                    mode='stroke'
                    size='xxsmall'
                    className='gap-2'
                    onClick={() => onConvertToProduct?.(selectedNonProductLines)}
                    disabled={isDeleting}
                  >
                    Convert to Product
                  </Button.Root>
                ) : null}
                <Button.Root
                  type='button'
                  variant='error'
                  mode='filled'
                  size='xxsmall'
                  className='gap-2'
                  onClick={handleBulkDeleteRequest}
                  disabled={isDeleting}
                >
                  <Button.Icon as={RiDeleteBinLine} />
                  Delete
                </Button.Root>
              </div>
            </div>
          ) : null}

          <div className='min-w-0'>
            <div style={{ minWidth: `${minTableWidth}px` }} data-boq-template-products-table>
              <div
                className={cn(
                  BOQ_TEMPLATE_PRODUCTS_GRID_CLASS,
                  'border-b border-stroke-soft-200 bg-bg-weak-50',
                )}
                style={gridStyle}
              >
                {visibleColumns.map(renderHeaderCell)}
              </div>

              {hasProducts ? tableBody : null}

              {!readOnly &&
                (activeIsAddingProduct ? (
                  <BoqTemplateAddProductRow
                    categoryId={resolvedCategoryId}
                    categoryType={resolvedCategoryType}
                    categoryGroup={resolvedCategoryGroup}
                    section={section}
                    visibleColumnIds={visibleColumnIds}
                    gridStyle={gridStyle}
                    gridClassName={cn(
                      BOQ_TEMPLATE_PRODUCTS_EDIT_GRID_CLASS,
                      'border-t border-[#ededed] bg-bg-white-0 last:border-b-0',
                      isSavingProduct && 'opacity-60',
                    )}
                    initialFocusColumnId={activeEditingFocusColumnId}
                    projectFloors={projectFloors}
                    projectAreas={projectAreas}
                    useProjectAreaDropdown={useProjectBoqColumns}
                    useProjectBoqColumns={useProjectBoqColumns}
                    priceView={priceView}
                    columnConfigSource={columnConfigSource}
                    addLineMode={addLineMode}
                    onCancel={handleCancelAddProduct}
                    onSave={handleSaveAddProduct}
                  />
                ) : (
                  <button
                    type='button'
                    tabIndex={activeHasEditSession && !activeIsAddingProduct ? -1 : 0}
                    onClick={() => handleStartAddProduct(BOQ_ADD_LINE_MODES.MASTER)}
                    disabled={isSavingProduct}
                    className='flex w-full items-center gap-2 border-t border-[#ededed] px-3 py-3 text-left transition-colors hover:bg-bg-weak-50'
                  >
                    <RiAddCircleLine
                      className='size-[18px] shrink-0 text-text-sub-500/70'
                      aria-hidden
                    />
                    <span className='text-[12px] font-medium leading-5 tracking-[-0.072px] text-text-sub-500/70'>
                      Add a product
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      </Tooltip.Provider>

      <BoqErEstimationModal
        open={Boolean(erModalProduct)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setErModalProduct(null);
        }}
        onErQuantitiesCommit={onErQuantitiesCommit}
        product={erModalProduct}
        boqCode={boqCode}
        projectId={projectId}
        erStatus={
          erModalProduct
            ? resolveRowErStatus(
                erModalProduct,
                products.findIndex((product) => product.id === erModalProduct.id),
              )
            : BOQ_ER_STATUS.START
        }
        onErStatusChange={(nextStatus) => {
          if (!erModalProduct?.id) return;
          setErStatusByRowId((current) => ({
            ...current,
            [erModalProduct.id]: nextStatus,
          }));
          onErStatusCommit?.({ productId: erModalProduct.id, erStatus: nextStatus });
        }}
        erStatusDisabled={Boolean(priceView) && priceView !== PROJECT_BOQ_PRICE_VIEW.COMPARISON}
        projectFloors={projectFloors}
        projectAreas={projectAreas}
      />

      <DeleteConfirmModal
        isOpen={deleteTargets.length > 0}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTargets([]);
        }}
        title={deleteTargets.length > 1 ? 'Delete products?' : 'Delete product?'}
        description={
          deleteTargets.length > 1
            ? `Are you sure you want to delete ${deleteTargets.length} products? This action cannot be undone.`
            : deleteTargets[0]
              ? `Are you sure you want to delete "${deleteTargets[0].product}"? This action cannot be undone.`
              : 'Are you sure you want to delete this product? This action cannot be undone.'
        }
        item={deleteTargets}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </>
  );
};

export default BoqTemplateProductsTable;
