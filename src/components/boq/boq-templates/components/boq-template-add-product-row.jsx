import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PRODUCT_FORM_FIELDS } from '@/api/productFormOptions';
import BoqTemplateProductNameDropdown from '@/components/boq/boq-templates/components/boq-template-product-name-dropdown';
import BoqTemplateAreaLocationDropdown from '@/components/boq/boq-templates/components/boq-template-area-location-dropdown';
import { applyBoqMasterProductToForm } from '@/api/boqProductPayload';
import BoqTemplateQuantityDropdown from '@/components/boq/boq-templates/components/boq-template-quantity-dropdown';
import {
  formatBoqRupeeAmount,
  isBoqRateOutOfRange,
  resolveBoqPurchasePriceBounds,
  resolveBoqSellingPriceBounds,
} from '@/components/boq/boq-templates/components/boq-template-product-master-utils';
import {
  BOQ_TEMPLATE_EDIT_FIELD_ATTR,
  findBoqTemplateAdjacentEditableColumn,
  focusBoqTemplateEditField,
  getBoqTemplateEditableColumnIds,
  resolveBoqTemplateEditFieldColumnId,
  resolveBoqTemplateInitialFocusColumnId,
} from '@/components/boq/boq-templates/components/boq-template-product-edit-utils';
import {
  computeBoqProductLineAmount,
  mergeProjectFloorsWithQuantity,
  formatProjectBoqAreaLocations,
  parseProjectBoqAreaLocations,
} from '@/components/boq/boq-templates/components/boq-template-products-utils';
import {
  BOQ_PRODUCT_COLUMN_CONFIG_SOURCES,
  PROJECT_BOQ_FLOOR_QUANTITY_COLUMN_PREFIX,
} from '@/components/boq/boq-templates/components/boq-template-products-column-config';
import {
  BOQ_ADD_LINE_MODES,
  BOQ_PRODUCT_SOURCE,
  PROJECT_BOQ_DEFAULT_AREA_LOCATION,
  PROJECT_BOQ_PRICE_VIEW,
  PROJECT_BOQ_TYPES,
} from '@/components/boq/constants';
import ProductFormSearchableSelect from '@/components/products/product-form-searchable-select';
import {
  formatProductCategoryPath,
  parseProductCategoryPath,
} from '@/components/products/product-category-utils';
import { showErrorToast } from '@/utils/error-utils';
import * as Badge from '@/components/ui/badge';
import * as Input from '@/components/ui/input';
import * as Textarea from '@/components/ui/textarea';
import {
  PurchaseBoqCategorySelect,
  PurchaseBoqCategoryTag,
  PurchaseBoqJourneyTracker,
  PurchaseBoqPackageCell,
  PurchaseBoqPackageCornerIcon,
  PurchaseBoqProductNameCell,
  PurchaseBoqRateCell,
  PurchaseBoqSplitCornerIcon,
  PurchaseBoqStatusBadge,
  PurchaseBoqTruncatedText,
  PurchaseBoqValueCell,
  PurchaseBoqVendorTags,
} from '@/components/procurements/project-procurement-purchase-boq-table-cells';
import { hasPurchaseBoqPackages } from '@/components/procurements/project-procurement-purchase-boq-package-utils';
import { cn } from '@/utils/cn';

const ProductPlaceholderImage = ({ imageUrl }) =>
  imageUrl ? (
    <img src={imageUrl} alt='' className='size-8 shrink-0 rounded object-cover' />
  ) : (
    <div className='size-8 shrink-0 rounded bg-bg-weak-100' aria-hidden />
  );

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

const getColumnCellClassName = (isLast, useProjectBoqColumns = false, columnId = '') =>
  cn(
    'flex min-w-0 self-stretch',
    useProjectBoqColumns ? 'min-h-12 py-3 pl-3 pr-5' : 'px-3 py-3',
    columnId === 'description' ? 'items-start' : 'items-center',
    !isLast &&
      (useProjectBoqColumns ? 'border-r border-stroke-soft-200' : 'border-r border-black/[0.07]'),
  );

const formatFloorQuantityDisplay = (value) => {
  if (value === '' || value == null) return '0';
  const numeric = Number.parseFloat(String(value).replaceAll(',', ''));
  if (Number.isNaN(numeric)) return String(value);
  return Number.isInteger(numeric) ? String(numeric) : String(numeric);
};

const isProjectBoqQuantityFloorColumn = (columnId) =>
  columnId.startsWith(PROJECT_BOQ_FLOOR_QUANTITY_COLUMN_PREFIX);

const syncTextareaHeight = (node) => {
  if (!node) return;
  node.style.height = 'auto';
  node.style.height = `${node.scrollHeight}px`;
};

const focusTextareaAtEnd = (node) => {
  if (!node) return;
  syncTextareaHeight(node);
  node.focus();
  const end = node.value.length;
  node.setSelectionRange(end, end);
  node.scrollTop = node.scrollHeight;
};

const DescriptionEditField = ({ value, onChange, autoFocus = false, editFieldId }) => {
  const textareaRef = useRef(null);

  const syncHeight = useCallback(() => {
    syncTextareaHeight(textareaRef.current);
  }, []);

  useEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  useEffect(() => {
    if (!autoFocus) return;
    const node = textareaRef.current;
    if (!node) return;

    focusTextareaAtEnd(node);
    requestAnimationFrame(() => focusTextareaAtEnd(node));
  }, [autoFocus]);

  const handleChange = useCallback(
    (event) => {
      onChange?.(event);
      syncTextareaHeight(event.target);
    },
    [onChange],
  );

  return (
    <Textarea.Root
      ref={textareaRef}
      simple
      size='xsmall'
      value={value}
      onChange={handleChange}
      rows={1}
      placeholder='Description'
      aria-label='Description'
      className='min-h-8 w-full min-w-0 flex-1 resize-none overflow-hidden !rounded-lg leading-5'
      {...(editFieldId ? { [BOQ_TEMPLATE_EDIT_FIELD_ATTR]: editFieldId } : {})}
    />
  );
};

const isPortaledEditOverlay = (target) => {
  if (!target || !(target instanceof Element)) return false;
  return Boolean(
    target.closest('[data-prevent-edit-save]') ||
    target.closest('[data-prevent-row-click]') ||
    target.closest('[data-radix-popover-content]') ||
    target.closest('[data-radix-popper-content-wrapper]'),
  );
};

const BoqTemplateAddProductRow = ({
  categoryId = '',
  categoryType = '',
  categoryGroup = '',
  section,
  visibleColumnIds = [],
  gridClassName,
  gridStyle,
  autoFocusProductName = true,
  initialValues,
  isEditMode = false,
  initialFocusColumnId,
  projectFloors = [],
  projectAreas = [],
  useProjectAreaDropdown = false,
  useProjectBoqColumns = false,
  priceView,
  columnConfigSource = BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.TEMPLATE,
  addLineMode = BOQ_ADD_LINE_MODES.MASTER,
  onCancel,
  onSave,
}) => {
  const isPurchaseBoqRow = columnConfigSource === BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.PURCHASE_BOQ;
  const isTemplateRow = columnConfigSource === BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.TEMPLATE;
  const allowCustomLine = useProjectBoqColumns && !isEditMode;
  const [isCustomLineEntry, setIsCustomLineEntry] = useState(
    () => !isEditMode && addLineMode === BOQ_ADD_LINE_MODES.CUSTOM,
  );
  const isCustomAddLine =
    !isEditMode && (addLineMode === BOQ_ADD_LINE_MODES.CUSTOM || isCustomLineEntry);
  const rowRef = useRef(null);
  const skipOutsideSaveRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const openedAtRef = useRef(Date.now());
  const lastEditColumnRef = useRef(null);
  const [productMeta, setProductMeta] = useState(() =>
    applyBoqMasterProductToForm(initialValues ?? {}),
  );
  const [productName, setProductName] = useState(initialValues?.product ?? '');
  const [imageUrl, setImageUrl] = useState(
    String(initialValues?.imageUrl ?? initialValues?.image ?? '').trim(),
  );
  const [areaLocation, setAreaLocation] = useState(
    formatProjectBoqAreaLocations(parseProjectBoqAreaLocations(initialValues?.areaLocation)),
  );
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [brand, setBrand] = useState(initialValues?.brand ?? '');
  const [units, setUnits] = useState(initialValues?.units ?? '');
  const brandRef = useRef(initialValues?.brand ?? '');
  const unitsRef = useRef(initialValues?.units ?? '');
  const [purchaseRate, setPurchaseRate] = useState(
    initialValues?.purchaseRate == null ? '' : String(initialValues.purchaseRate),
  );
  const [sellingRate, setSellingRate] = useState(
    initialValues?.sellingRate == null ? '' : String(initialValues.sellingRate),
  );
  const [make, setMake] = useState(initialValues?.make ?? '');
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [quantity, setQuantity] = useState(initialValues?.quantity ?? '');
  const [quantityByFloor, setQuantityByFloor] = useState(
    Array.isArray(initialValues?.quantityByFloor) ? initialValues.quantityByFloor : [],
  );
  const [boqCategory, setBoqCategory] = useState(
    initialValues?.boqCategory || initialValues?.section || '',
  );
  const [purchaseCategory, setPurchaseCategory] = useState(
    initialValues?.purchaseCategory || initialValues?.section || '',
  );

  const editableColumnIds = useMemo(
    () => getBoqTemplateEditableColumnIds(visibleColumnIds, isEditMode),
    [isEditMode, visibleColumnIds],
  );

  const purchasePriceBounds = useMemo(
    () => resolveBoqPurchasePriceBounds(productMeta),
    [productMeta],
  );
  const sellingPriceBounds = useMemo(
    () => resolveBoqSellingPriceBounds(productMeta),
    [productMeta],
  );
  const isPurchaseRateOutOfRange = isBoqRateOutOfRange(
    purchaseRate,
    purchasePriceBounds.min,
    purchasePriceBounds.max,
  );
  const isSellingRateOutOfRange = isBoqRateOutOfRange(
    sellingRate,
    sellingPriceBounds.min,
    sellingPriceBounds.max,
  );

  const resolveCategoryPath = useMemo(() => {
    return (
      formatProductCategoryPath({
        categoryGroup: productMeta.categoryGroup || categoryGroup,
        categoryType: productMeta.categoryType || categoryType,
        productGroup: productMeta.productGroup || section,
        productType: productMeta.productCategory,
      }) ||
      String(purchaseCategory ?? '').trim() ||
      String(boqCategory ?? '').trim()
    );
  }, [
    boqCategory,
    categoryGroup,
    categoryType,
    productMeta.categoryGroup,
    productMeta.categoryType,
    productMeta.productCategory,
    productMeta.productGroup,
    purchaseCategory,
    section,
  ]);

  const handleProductCategoryChange = useCallback(
    (path) => {
      const values = parseProductCategoryPath(path);
      setProductMeta((prev) => ({
        ...prev,
        categoryGroup: values.categoryGroup || prev.categoryGroup,
        categoryType: values.categoryType || prev.categoryType,
        productGroup: values.productGroup || prev.productGroup || section || '',
        productCategory: values.productType,
      }));
      if (isPurchaseBoqRow) {
        setPurchaseCategory(path);
        if (!isEditMode) setBoqCategory(path);
      }
    },
    [isEditMode, isPurchaseBoqRow, section],
  );

  const buildPayload = useCallback(() => {
    const trimmedName = productName.trim();
    const resolvedItemCode = isCustomAddLine
      ? trimmedName
      : (initialValues?.item || productMeta.item || productMeta.itemCode || '').trim();

    const categoryPath =
      formatProductCategoryPath({
        categoryGroup: productMeta.categoryGroup || categoryGroup,
        categoryType: productMeta.categoryType || categoryType,
        productGroup: productMeta.productGroup || section,
        productType: productMeta.productCategory,
      }) || '';

    const resolvedBoqCategory = String(boqCategory ?? '').trim() || categoryPath || section || '';
    const resolvedPurchaseCategory =
      String(purchaseCategory ?? '').trim() || categoryPath || section || '';

    return {
      ...initialValues,
      ...productMeta,
      product: trimmedName,
      item: resolvedItemCode,
      itemCode: resolvedItemCode,
      productSource: isCustomAddLine
        ? BOQ_PRODUCT_SOURCE.CUSTOM
        : productMeta.productSource || BOQ_PRODUCT_SOURCE.PRODUCT,
      isLinkedToProduct: isCustomAddLine ? false : undefined,
      imageUrl: isCustomAddLine ? '' : imageUrl,
      areaLocation: formatProjectBoqAreaLocations(parseProjectBoqAreaLocations(areaLocation)),
      description: description.trim(),
      brand: String(brandRef.current ?? brand).trim(),
      units: String(unitsRef.current ?? units).trim(),
      purchaseRate: Number.parseFloat(purchaseRate) || 0,
      sellingRate: Number.parseFloat(sellingRate) || 0,
      quantity,
      quantityByFloor,
      make: make.trim(),
      notes: notes.trim(),
      boqCategory: resolvedBoqCategory,
      purchaseCategory: resolvedPurchaseCategory,
      productGroup: productMeta.productGroup || section || initialValues?.productGroup || '',
      section: productMeta.productGroup || section || initialValues?.section || '',
    };
  }, [
    areaLocation,
    brand,
    boqCategory,
    categoryGroup,
    categoryType,
    description,
    imageUrl,
    initialValues,
    make,
    notes,
    productMeta,
    productName,
    purchaseCategory,
    purchaseRate,
    quantity,
    quantityByFloor,
    section,
    sellingRate,
    units,
    isCustomAddLine,
  ]);

  const handleCustomLineSelect = useCallback((option) => {
    const name = String(option?.product ?? '').trim();
    if (!name) return;

    setIsCustomLineEntry(true);
    setProductName(name);
    setProductMeta(
      applyBoqMasterProductToForm({
        ...option,
        product: name,
        item: name,
        itemCode: '',
        productSource: BOQ_PRODUCT_SOURCE.CUSTOM,
      }),
    );
    setImageUrl('');
  }, []);

  const handleProductSelect = useCallback(
    (product) => {
      setIsCustomLineEntry(false);
      const mapped = applyBoqMasterProductToForm(product);
      setProductMeta(mapped);
      setProductName(mapped.product ?? '');
      setImageUrl(mapped.imageUrl ?? '');
      setAreaLocation(
        formatProjectBoqAreaLocations(parseProjectBoqAreaLocations(mapped.areaLocation)),
      );
      setDescription(mapped.description ?? '');
      const nextBrand = mapped.brand ?? '';
      const nextUnits = mapped.units ?? '';
      brandRef.current = nextBrand;
      unitsRef.current = nextUnits;
      setBrand(nextBrand);
      setUnits(nextUnits);
      setPurchaseRate(mapped.purchaseRate ?? '');
      setSellingRate(mapped.sellingRate ?? '');
      setMake(mapped.make ?? '');
      setNotes(mapped.notes ?? '');

      if (isPurchaseBoqRow) {
        const categoryPath =
          formatProductCategoryPath({
            categoryGroup: mapped.categoryGroup,
            categoryType: mapped.categoryType,
            productGroup: mapped.productGroup,
            productType: mapped.productCategory,
          }) ||
          mapped.productGroup ||
          section ||
          '';
        if (categoryPath) {
          if (!isEditMode) setBoqCategory(categoryPath);
          setPurchaseCategory(categoryPath);
        }
      }
    },
    [isEditMode, isPurchaseBoqRow, section],
  );

  const isAddRowReadyToSave = useCallback(() => {
    const trimmedName = productName.trim();
    const trimmedUnits = String(unitsRef.current ?? units).trim();
    const categoryValues = parseProductCategoryPath(resolveCategoryPath);
    return Boolean(trimmedName && trimmedUnits && categoryValues.productType);
  }, [productName, resolveCategoryPath, units]);

  const handleSave = useCallback(
    (options = {}) => {
      const trimmedName = productName.trim();
      const trimmedUnits = String(unitsRef.current ?? units).trim();
      const categoryValues = parseProductCategoryPath(resolveCategoryPath);

      if (!trimmedName) {
        showErrorToast(null, { defaultMessage: 'Product name is required.' });
        return undefined;
      }
      if (!trimmedUnits) {
        showErrorToast(null, { defaultMessage: 'Units are required.' });
        return undefined;
      }
      if (!categoryValues.productType) {
        showErrorToast(null, { defaultMessage: 'Product category is required.' });
        return undefined;
      }

      return onSave?.(buildPayload(), options);
    },
    [buildPayload, onSave, productName, resolveCategoryPath, units],
  );

  const focusColumn = useCallback((columnId) => {
    return focusBoqTemplateEditField(rowRef.current, columnId);
  }, []);

  const getInitialFocusColumnId = useCallback(() => {
    return resolveBoqTemplateInitialFocusColumnId(visibleColumnIds, isEditMode, {
      initialFocusColumnId,
      autoFocusProductName,
    });
  }, [autoFocusProductName, initialFocusColumnId, isEditMode, visibleColumnIds]);

  const navigateEditTab = useCallback(
    (direction, fromColumnId) => {
      const nextColumnId = findBoqTemplateAdjacentEditableColumn(
        editableColumnIds,
        fromColumnId,
        direction,
        focusColumn,
      );

      if (nextColumnId) {
        lastEditColumnRef.current = nextColumnId;
        return true;
      }

      const currentIndex = editableColumnIds.indexOf(fromColumnId);
      if (currentIndex === -1) return false;

      if (direction === 'prev' && currentIndex === 0) {
        if (isEditMode) {
          Promise.resolve(handleSave({ navigate: 'prev', focusColumn: fromColumnId }));
        } else {
          onCancel?.();
        }
        return true;
      }

      if (direction === 'next' && currentIndex === editableColumnIds.length - 1) {
        Promise.resolve(handleSave({ navigate: 'next', focusColumn: fromColumnId }));
        return true;
      }

      return false;
    },
    [editableColumnIds, focusColumn, handleSave, isEditMode, onCancel],
  );

  const handleRowKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel?.();
        return;
      }

      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleSave();
        return;
      }

      if (event.key !== 'Tab') return;

      const currentColumnId = resolveBoqTemplateEditFieldColumnId(event.target, rowRef.current);
      if (!currentColumnId) return;

      event.preventDefault();
      lastEditColumnRef.current = currentColumnId;
      navigateEditTab(event.shiftKey ? 'prev' : 'next', currentColumnId);
    },
    [handleSave, navigateEditTab, onCancel],
  );

  const commitRow = useCallback(() => {
    if (skipOutsideSaveRef.current || pendingSaveRef.current) return;

    if (!isEditMode && !isAddRowReadyToSave()) {
      onCancel?.();
      return;
    }

    pendingSaveRef.current = true;
    Promise.resolve(handleSave()).finally(() => {
      pendingSaveRef.current = false;
    });
  }, [handleSave, isAddRowReadyToSave, isEditMode, onCancel]);

  useEffect(() => {
    openedAtRef.current = Date.now();
    const columnId = getInitialFocusColumnId();
    if (!columnId) return undefined;

    lastEditColumnRef.current = columnId;
    const frame = window.requestAnimationFrame(() => {
      focusColumn(columnId);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusColumn, getInitialFocusColumnId]);

  useEffect(() => {
    if (!onSave) return undefined;

    const handleTrackEditFocus = (event) => {
      const row = rowRef.current;
      const columnId = resolveBoqTemplateEditFieldColumnId(event.target, row);
      if (columnId) lastEditColumnRef.current = columnId;
    };

    const handleDocumentTab = (event) => {
      if (event.key !== 'Tab') return;

      const row = rowRef.current;
      if (!row) return;

      const active = document.activeElement;
      if (!active || !row.contains(active)) return;

      const currentColumnId = resolveBoqTemplateEditFieldColumnId(active, row);
      if (currentColumnId) return;

      if (active.closest('[data-prevent-edit-save]')) return;

      event.preventDefault();
      event.stopPropagation();

      const fromColumnId =
        lastEditColumnRef.current && editableColumnIds.includes(lastEditColumnRef.current)
          ? lastEditColumnRef.current
          : getInitialFocusColumnId();

      if (!fromColumnId) return;

      navigateEditTab(event.shiftKey ? 'prev' : 'next', fromColumnId);
    };

    const handlePointerDown = (event) => {
      if (skipOutsideSaveRef.current) return;
      if (Date.now() - openedAtRef.current < 200) return;

      const row = rowRef.current;
      if (!row || row.contains(event.target)) return;
      if (isPortaledEditOverlay(event.target)) return;
      if (event.target.closest(`[${BOQ_TEMPLATE_EDIT_FIELD_ATTR}]`)) return;

      commitRow();
    };

    document.addEventListener('keydown', handleDocumentTab, true);
    document.addEventListener('focusin', handleTrackEditFocus, true);
    document.addEventListener('mousedown', handlePointerDown, true);
    return () => {
      document.removeEventListener('keydown', handleDocumentTab, true);
      document.removeEventListener('focusin', handleTrackEditFocus, true);
      document.removeEventListener('mousedown', handlePointerDown, true);
    };
  }, [commitRow, editableColumnIds, getInitialFocusColumnId, navigateEditTab, onSave]);

  const resolvedCategoryGroup =
    productMeta.categoryGroup || categoryGroup || initialValues?.categoryGroup || '';
  const resolvedCategoryType =
    productMeta.categoryType || categoryType || categoryId || initialValues?.categoryType || '';
  const productGroup = productMeta.productGroup || section || initialValues?.productGroup || '';
  const firstFloorColumnId = visibleColumnIds.find(isProjectBoqQuantityFloorColumn);
  const mergedFloorQuantities = useMemo(
    () => mergeProjectFloorsWithQuantity(projectFloors, quantityByFloor),
    [projectFloors, quantityByFloor],
  );

  const getCellClass = (columnId, isLast) =>
    getColumnCellClassName(isLast, useProjectBoqColumns, columnId);

  const renderFormSelect = (
    columnId,
    isLast,
    { field, value, onValueChange, placeholder, ariaLabel },
  ) => (
    <div
      key={columnId}
      className={cn(getCellClass(columnId, isLast), 'w-full')}
      aria-label={ariaLabel}
      onMouseDown={(event) => event.stopPropagation()}
      {...{ [BOQ_TEMPLATE_EDIT_FIELD_ATTR]: columnId }}
    >
      <ProductFormSearchableSelect
        field={field}
        value={value}
        onValueChange={(nextValue) => onValueChange?.(nextValue)}
        categoryGroup={resolvedCategoryGroup}
        categoryType={resolvedCategoryType}
        productGroup={productGroup}
        size='xsmall'
        placeholder={placeholder}
        allowCreate={false}
        contentClassName='min-w-[max(var(--radix-popover-trigger-width),160px)]'
        renderTriggerValue={({ placeholder: fallback }) => (
          <span className='block min-w-0 max-w-full truncate'>{value || fallback}</span>
        )}
      />
    </div>
  );
  const renderTextInput = (columnId, isLast, { value, onChange, placeholder, ariaLabel }) => (
    <div key={columnId} className={cn(getCellClass(columnId, isLast), 'w-full')}>
      <Input.Root size='xsmall' className='w-full'>
        <Input.Wrapper>
          <Input.Input
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            autoComplete='off'
            aria-label={ariaLabel}
            {...{ [BOQ_TEMPLATE_EDIT_FIELD_ATTR]: columnId }}
          />
        </Input.Wrapper>
      </Input.Root>
    </div>
  );

  const renderCell = (columnId, isLast) => {
    const row = initialValues || {};
    const isPackaged = hasPurchaseBoqPackages(row);
    const isSplitLine = Boolean(row.isSplitLine);

    switch (columnId) {
      case 'product': {
        if (isEditMode) {
          const showCornerIcon = isPackaged || isSplitLine;
          return (
            <div
              key={columnId}
              className={cn(
                getColumnCellClassName(isLast),
                'relative gap-3',
                showCornerIcon && 'pr-2',
              )}
            >
              {isSplitLine ? <PurchaseBoqSplitCornerIcon /> : null}
              {!isSplitLine && isPackaged ? (
                <PurchaseBoqPackageCornerIcon
                  packages={row.packages}
                  packageCode={row.packageCode}
                />
              ) : null}
              <ProductPlaceholderImage imageUrl={imageUrl || row.imageUrl} />
              <PurchaseBoqProductNameCell
                product={productName || row.product}
                isSplitLine={isSplitLine}
                isPackaged={isPackaged}
              />
            </div>
          );
        }

        return (
          <div
            key={columnId}
            className={cn(getCellClass(columnId, isLast), 'gap-3')}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <ProductPlaceholderImage imageUrl={imageUrl || row.imageUrl} />
            {isCustomAddLine ? (
              <Input.Root size='xsmall' className='min-w-0 flex-1'>
                <Input.Wrapper>
                  <Input.Input
                    value={productName}
                    onChange={(event) => setProductName(event.target.value)}
                    placeholder='Custom line item name'
                    autoComplete='off'
                    aria-label='Custom line item name'
                    autoFocus={autoFocusProductName}
                    {...{ [BOQ_TEMPLATE_EDIT_FIELD_ATTR]: 'product' }}
                  />
                </Input.Wrapper>
              </Input.Root>
            ) : (
              <BoqTemplateProductNameDropdown
                categoryId={categoryId}
                categoryType={resolvedCategoryType}
                categoryGroup={resolvedCategoryGroup}
                section={section}
                value={productName}
                selectedItemCode={
                  isCustomLineEntry ? '' : productMeta.itemCode || productMeta.item || ''
                }
                onValueChange={setProductName}
                onProductSelect={handleProductSelect}
                onCustomLineSelect={handleCustomLineSelect}
                allowCustomLine={allowCustomLine}
                editFieldId='product'
              />
            )}
          </div>
        );
      }
      case 'areaLocation':
        if (useProjectAreaDropdown) {
          return (
            <div key={columnId} className={cn(getCellClass(columnId, isLast), 'w-full')}>
              <BoqTemplateAreaLocationDropdown
                value={areaLocation}
                projectAreas={projectAreas}
                editFieldId='areaLocation'
                onValueChange={setAreaLocation}
              />
            </div>
          );
        }
        return renderTextInput(columnId, isLast, {
          value: areaLocation,
          onChange: (event) => setAreaLocation(event.target.value),
          placeholder: PROJECT_BOQ_DEFAULT_AREA_LOCATION,
          ariaLabel: 'Area or location',
        });
      case 'description':
        return (
          <div key={columnId} className={cn(getCellClass(columnId, isLast), 'w-full')}>
            {isEditMode ? (
              <DescriptionEditField
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                editFieldId='description'
              />
            ) : (
              <Input.Root size='xsmall' className='w-full min-w-0 flex-1'>
                <Input.Wrapper>
                  <Input.Input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder='Description'
                    autoComplete='off'
                    aria-label='Description'
                    {...{ [BOQ_TEMPLATE_EDIT_FIELD_ATTR]: 'description' }}
                  />
                </Input.Wrapper>
              </Input.Root>
            )}
          </div>
        );
      case 'productCategory':
        return (
          <div key={columnId} className={cn(getCellClass(columnId, isLast), 'w-full min-w-0')}>
            <PurchaseBoqCategorySelect
              value={resolveCategoryPath}
              placeholder='Select category'
              onValueChange={handleProductCategoryChange}
            />
          </div>
        );
      case 'brand':
        return renderFormSelect(columnId, isLast, {
          field: PRODUCT_FORM_FIELDS.BRAND,
          value: brand,
          onValueChange: (next = '') => {
            brandRef.current = next;
            setBrand(next);
          },
          placeholder: 'Brand',
          ariaLabel: 'Brand',
        });
      case 'units':
        return renderFormSelect(columnId, isLast, {
          field: PRODUCT_FORM_FIELDS.UOM,
          value: units,
          onValueChange: (next = '') => {
            unitsRef.current = next;
            setUnits(next);
          },
          placeholder: 'Units',
          ariaLabel: 'Units',
        });
      case 'quantity':
        return (
          <div key={columnId} className={cn(getCellClass(columnId, isLast), 'w-full')}>
            <BoqTemplateQuantityDropdown
              quantity={quantity}
              quantityByFloor={quantityByFloor}
              floorOptions={projectFloors}
              units={units}
              editFieldId='quantity'
              onQuantityChange={({ quantity: nextQuantity, quantityByFloor: nextByFloor }) => {
                setQuantity(nextQuantity ?? '');
                setQuantityByFloor(Array.isArray(nextByFloor) ? nextByFloor : []);
              }}
            />
          </div>
        );
      case 'quantityTotal': {
        const useSellingRate = priceView === PROJECT_BOQ_PRICE_VIEW.CLIENT;
        const unitRate = useSellingRate
          ? Number.parseFloat(sellingRate) || 0
          : Number.parseFloat(purchaseRate) || 0;
        const lineAmount = computeBoqProductLineAmount(unitRate, {
          quantity,
          quantityByFloor,
        });
        return (
          <div key={columnId} className={cn(getCellClass(columnId, isLast), 'w-full')}>
            <span className='whitespace-nowrap text-paragraph-sm'>
              {formatBoqRupeeAmount(lineAmount)}
            </span>
          </div>
        );
      }
      case 'purchaseRate':
        return (
          <div key={columnId} className={getCellClass(columnId, isLast)}>
            <Input.Root size='xsmall' className='w-full'>
              <Input.Wrapper>
                <Input.Input
                  value={purchaseRate}
                  onChange={(event) => setPurchaseRate(event.target.value)}
                  inputMode='decimal'
                  placeholder='Purchase'
                  autoComplete='off'
                  aria-label='Purchase rate'
                  aria-invalid={isPurchaseRateOutOfRange || undefined}
                  className={cn(isPurchaseRateOutOfRange && 'text-error-base')}
                  {...{ [BOQ_TEMPLATE_EDIT_FIELD_ATTR]: 'purchaseRate' }}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>
        );
      case 'sellingRate':
        return (
          <div key={columnId} className={getCellClass(columnId, isLast)}>
            <Input.Root size='xsmall' className='w-full'>
              <Input.Wrapper>
                <Input.Input
                  value={sellingRate}
                  onChange={(event) => setSellingRate(event.target.value)}
                  inputMode='decimal'
                  placeholder='Selling'
                  autoComplete='off'
                  aria-label='Selling rate'
                  aria-invalid={isSellingRateOutOfRange || undefined}
                  className={cn(isSellingRateOutOfRange && 'text-error-base')}
                  {...{ [BOQ_TEMPLATE_EDIT_FIELD_ATTR]: 'sellingRate' }}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>
        );
      case 'make':
        return renderTextInput(columnId, isLast, {
          value: make,
          onChange: (event) => setMake(event.target.value),
          placeholder: 'Make',
          ariaLabel: 'Make',
        });
      case 'notes':
        return renderTextInput(columnId, isLast, {
          value: notes,
          onChange: (event) => setNotes(event.target.value),
          placeholder: 'Notes',
          ariaLabel: 'Notes',
        });
      case 'itemCode': {
        const boqId = row.boqId || row.sourceProjectBoq || row.itemCode || row.item || '--';
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
      case 'boqCategory':
        return (
          <div key={columnId} className={cn(getColumnCellClassName(isLast), 'flex items-center')}>
            <PurchaseBoqCategoryTag label={boqCategory || row.boqCategory || row.section || ''} />
          </div>
        );
      case 'purchaseCategory':
        return (
          <div
            key={columnId}
            className={cn(getColumnCellClassName(isLast), 'flex min-w-0 items-center')}
          >
            <PurchaseBoqCategorySelect
              value={purchaseCategory}
              placeholder='Purchase Category'
              onValueChange={setPurchaseCategory}
            />
          </div>
        );
      case 'lineValue':
        return (
          <div key={columnId} className={cn(getColumnCellClassName(isLast), 'flex items-center')}>
            <PurchaseBoqValueCell
              value={computeBoqProductLineAmount(Number.parseFloat(purchaseRate) || 0, {
                ...row,
                quantity,
                quantityByFloor,
                purchaseRate: Number.parseFloat(purchaseRate) || 0,
              })}
            />
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
      case 'poValue':
        return (
          <div key={columnId} className={cn(getColumnCellClassName(isLast), 'flex items-center')}>
            <PurchaseBoqValueCell value={row.poValue ?? row.lineValue} />
          </div>
        );
      case 'vendorRate':
        return (
          <div key={columnId} className={cn(getColumnCellClassName(isLast), 'flex items-center')}>
            <PurchaseBoqRateCell value={row.vendorRate ?? row.purchaseRate} />
          </div>
        );
      default:
        if (isProjectBoqQuantityFloorColumn(columnId)) {
          if (columnId === firstFloorColumnId) {
            return (
              <div key={columnId} className={cn(getCellClass(columnId, isLast), 'w-full')}>
                <BoqTemplateQuantityDropdown
                  quantity={quantity}
                  quantityByFloor={quantityByFloor}
                  floorOptions={projectFloors}
                  units={units}
                  editFieldId='quantity'
                  onQuantityChange={({ quantity: nextQuantity, quantityByFloor: nextByFloor }) => {
                    setQuantity(nextQuantity ?? '');
                    setQuantityByFloor(Array.isArray(nextByFloor) ? nextByFloor : []);
                  }}
                />
              </div>
            );
          }

          const floorName = columnId.slice(PROJECT_BOQ_FLOOR_QUANTITY_COLUMN_PREFIX.length);
          const floorEntry = mergedFloorQuantities.find((entry) => entry.floor === floorName);
          return (
            <div
              key={columnId}
              className={cn(getCellClass(columnId, isLast), 'justify-center')}
              aria-hidden
            >
              <span className='text-paragraph-sm'>
                {formatFloorQuantityDisplay(floorEntry?.value)}
              </span>
            </div>
          );
        }

        return <div key={columnId} className={getCellClass(columnId, isLast)} aria-hidden />;
    }
  };

  return (
    <div ref={rowRef} data-boq-template-edit-row>
      <div className={gridClassName} style={gridStyle} onKeyDown={handleRowKeyDown}>
        {visibleColumnIds.map((columnId, index) =>
          renderCell(columnId, index === visibleColumnIds.length - 1),
        )}
      </div>
    </div>
  );
};

export default BoqTemplateAddProductRow;
