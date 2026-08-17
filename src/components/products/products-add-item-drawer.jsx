import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  RiAddLine,
  RiArrowRightSLine,
  RiBox3Line,
  RiCloseLine,
  RiFileLine,
  RiInformationLine,
  RiMoneyDollarCircleLine,
  RiTaskLine,
  RiPantoneLine,
  RiStickyNoteLine,
} from 'react-icons/ri';

import { PRODUCT_FORM_FIELDS, PRODUCT_FORM_CREATE_LABELS } from '@/api/productFormOptions';
import { PRODUCTS_TAB_IDS } from '@/components/products/constants';
import { STOCKS_ADD_PRODUCT_TYPE_OPTIONS } from '@/components/stocks/constants';
import ProductCategoryCascade from '@/components/products/product-category-cascade';
import ProductFormMultiSearchableSelect from '@/components/products/product-form-multi-searchable-select';
import ProductFormSearchableSelect from '@/components/products/product-form-searchable-select';
import {
  BrochureUploadField,
  PhotosVideoField,
} from '@/components/products/products-basic-upload-fields';
import {
  JobPricingFields,
  PriceRangeField,
  SinglePriceField,
  VariationsListContent,
} from '@/components/products/products-pricing-variations';
import {
  getSpecificationSectionTitle,
  isJobProductType,
  syncJobPurchasePrices,
} from '@/components/products/products-job-pricing';
import ProductsInlineTagsField from '@/components/products/products-inline-tags-field';
import { EMPTY_PRODUCT_CATEGORY } from '@/components/products/product-category-utils';
import { DocumentsSection } from '@/components/products/products-documents-section';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import * as Drawer from '@/components/ui/drawer';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import * as Tag from '@/components/ui/tag';
import * as Textarea from '@/components/ui/textarea';
import ErrorText from '@/components/ui/error-text';
import {
  productAddItemSchema,
  defaultProductAddItemValues,
  getPricingValidationError,
} from '@/schemas/product-schema';
import { applyParentPricesToVariation } from '@/components/products/products-price-utils';
import { showErrorToast } from '@/utils/error-utils';
import { cn } from '@/utils/cn';

const ADD_ITEM_SECTIONS = [
  { id: 'basic', label: 'Basic Information', icon: RiInformationLine },
  { id: 'specification', label: 'Product Specification', icon: RiTaskLine },
  { id: 'pricing', label: 'Pricing', icon: RiMoneyDollarCircleLine },
  { id: 'variations', label: 'Variations', icon: RiPantoneLine },
  { id: 'media', label: 'Documents', icon: RiFileLine },
];

function buildAddItemSections(isJob) {
  const specificationLabel = getSpecificationSectionTitle(isJob ? PRODUCTS_TAB_IDS.JOB : 'product');
  return ADD_ITEM_SECTIONS.map((section) =>
    section.id === 'specification' ? { ...section, label: specificationLabel } : section,
  );
}

function ProductFormSearchableField({
  field,
  label,
  required = false,
  value,
  onChange,
  error,
  categoryGroup,
  categoryType,
  productGroup,
  assetType,
  allowCreate = true,
}) {
  return (
    <FormField label={label} required={required} error={error}>
      <ProductFormSearchableSelect
        field={field}
        value={value || ''}
        onValueChange={onChange}
        categoryGroup={categoryGroup}
        categoryType={categoryType}
        productGroup={productGroup}
        assetType={assetType}
        hasError={Boolean(error)}
        allowCreate={allowCreate}
        createNewLabel={PRODUCT_FORM_CREATE_LABELS[field] || 'Create new'}
        renderTriggerValue={({ placeholder }) => (
          <span className='block min-w-0 max-w-full truncate'>{value || placeholder}</span>
        )}
      />
    </FormField>
  );
}

function ProductFormMultiSearchableField({
  field,
  label,
  required = false,
  value,
  onChange,
  error,
  categoryGroup,
  categoryType,
  productGroup,
  assetType,
  allowCreate = true,
}) {
  return (
    <FormField label={label} required={required} error={error}>
      <ProductFormMultiSearchableSelect
        field={field}
        value={value}
        onValueChange={onChange}
        categoryGroup={categoryGroup}
        categoryType={categoryType}
        productGroup={productGroup}
        assetType={assetType}
        hasError={Boolean(error)}
        allowCreate={allowCreate}
        createNewLabel={PRODUCT_FORM_CREATE_LABELS[field] || 'Create new'}
      />
    </FormField>
  );
}

// ── Small presentational helpers ────────────────────────────────────────────

function FormSectionTitle({ icon: Icon, children }) {
  return (
    <div className='flex items-center gap-1.5'>
      {Icon ? <Icon className='size-5 shrink-0 text-text-soft-400' aria-hidden /> : null}
      <h3 className='label-medium text-text-sub-500'>{children}</h3>
    </div>
  );
}

function HsnOptionLabel({ title, description }) {
  return (
    <span className='flex min-w-0 w-full flex-col gap-0.5 py-0.5'>
      <span className='truncate text-paragraph-sm font-medium text-text-main-900'>{title}</span>
      {description ? (
        <span className='line-clamp-2 text-paragraph-xs text-text-sub-500'>{description}</span>
      ) : null}
    </span>
  );
}

function FormField({ label, required = false, className, children, error }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Label.Root>
        {label}
        {required ? <Label.Asterisk /> : null}
      </Label.Root>
      {children}
      {error && <ErrorText className='w-full'>{error}</ErrorText>}
    </div>
  );
}

function SelectField({
  label,
  required,
  value,
  onChange,
  placeholder = 'Select',
  options = [],
  className,
  error,
}) {
  return (
    <FormField label={label} required={required} className={className} error={error}>
      <Select.Root value={value || undefined} onValueChange={onChange} hasError={Boolean(error)}>
        <Select.Trigger>
          <Select.Value placeholder={placeholder} />
        </Select.Trigger>
        <Select.Content>
          {options.map((option) => (
            <Select.Item key={option} value={option}>
              {option}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </FormField>
  );
}

function TextField({ label, required, value, onChange, placeholder, className, suffix, error }) {
  return (
    <FormField label={label} required={required} className={className} error={error}>
      <Input.Root size='medium' hasError={Boolean(error)}>
        <Input.Wrapper>
          <Input.Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
          />
          {suffix ? <Input.InlineAffix>{suffix}</Input.InlineAffix> : null}
        </Input.Wrapper>
      </Input.Root>
    </FormField>
  );
}

function createEmptyVariation(option, idx, parentPrices = {}, isJob = false) {
  const base = {
    id: `var-${option}-${idx}`,
    optionKey: option,
    name: option,
    description: '',
    minPurchasePrice: '',
    maxPurchasePrice: '',
    minSellingPrice: '',
    maxSellingPrice: '',
    materialBasicRate: '',
    labourBaseRate: '',
    files: [],
  };
  const withParent = applyParentPricesToVariation(base, parentPrices);
  return isJob ? syncJobPurchasePrices(withParent) : withParent;
}

function buildVariationsFromOptions(
  options,
  previousVariations = [],
  parentPrices = {},
  isJob = false,
) {
  return options.map((option, idx) => {
    const existing = previousVariations.find((v) => v.optionKey === option);
    if (existing) {
      const withParent = applyParentPricesToVariation(
        { ...existing, optionKey: option },
        parentPrices,
      );
      return isJob ? syncJobPurchasePrices(withParent) : withParent;
    }
    return createEmptyVariation(option, idx, parentPrices, isJob);
  });
}

const ProductsAddItemDrawer = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  defaultDevxProductType = 'product',
  mode = 'product',
}) => {
  const isStockMode = mode === 'stock';
  const categoryAssetType = isStockMode ? 'maintain_stock' : undefined;
  const isJob = !isStockMode && isJobProductType(defaultDevxProductType);
  const [activeSection, setActiveSection] = useState(ADD_ITEM_SECTIONS[0].id);
  const [tagInput, setTagInput] = useState('');
  const [tagArray, setTagArray] = useState([]);
  const [variationOptionInput, setVariationOptionInput] = useState('');
  const [variationOptionsArray, setVariationOptionsArray] = useState([]);
  const [hasVariations, setHasVariations] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [categoryFiles, setCategoryFiles] = useState({
    productImages: [],
    brochures: [],
  });
  const [variationsList, setVariationsList] = useState([]);

  // Product category selection (categoryGroup, categoryType, productGroup, productType)
  const [categoryValues, setCategoryValues] = useState(EMPTY_PRODUCT_CATEGORY);

  const scrollContainerRef = useRef(null);
  const sectionRefs = useRef({});
  const prevApplyPriceRef = useRef(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productAddItemSchema),
    defaultValues: defaultProductAddItemValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const watchedDescription = watch('description');
  const watchedMinPurchasePrice = watch('minPurchasePrice');
  const watchedMaxPurchasePrice = watch('maxPurchasePrice');
  const watchedMaterialBasicRate = watch('materialBasicRate');
  const watchedLabourBaseRate = watch('labourBaseRate');
  const watchedMinSellingPrice = watch('minSellingPrice');
  const watchedMaxSellingPrice = watch('maxSellingPrice');
  const applyPriceToAllVariations = watch('applyPriceToAllVariations');

  const handleJobMaterialRateChange = useCallback(
    (value) => setValue('materialBasicRate', value, { shouldValidate: false }),
    [setValue],
  );
  const handleJobLabourRateChange = useCallback(
    (value) => setValue('labourBaseRate', value, { shouldValidate: false }),
    [setValue],
  );
  const handleJobTotalRateChange = useCallback(
    (value) => {
      setValue('minPurchasePrice', value, { shouldValidate: false });
      setValue('maxPurchasePrice', value, { shouldValidate: false });
    },
    [setValue],
  );
  const handleJobSellingMinChange = useCallback(
    (value) => setValue('minSellingPrice', value, { shouldValidate: false }),
    [setValue],
  );
  const handleJobSellingMaxChange = useCallback(
    (value) => setValue('maxSellingPrice', value, { shouldValidate: false }),
    [setValue],
  );
  const handleStockPriceChange = useCallback(
    (value) => {
      setValue('minPurchasePrice', value, { shouldValidate: false });
      setValue('maxPurchasePrice', value, { shouldValidate: false });
    },
    [setValue],
  );

  const parentPriceContext = useMemo(() => {
    const context = {
      applyPriceToAllVariations,
      minPurchasePrice: watchedMinPurchasePrice,
      maxPurchasePrice: watchedMaxPurchasePrice,
      minSellingPrice: watchedMinSellingPrice,
      maxSellingPrice: watchedMaxSellingPrice,
      materialBasicRate: watchedMaterialBasicRate,
      labourBaseRate: watchedLabourBaseRate,
    };
    return isJob ? syncJobPurchasePrices(context) : context;
  }, [
    applyPriceToAllVariations,
    isJob,
    watchedLabourBaseRate,
    watchedMaterialBasicRate,
    watchedMaxPurchasePrice,
    watchedMaxSellingPrice,
    watchedMinPurchasePrice,
    watchedMinSellingPrice,
  ]);

  useEffect(() => {
    if (applyPriceToAllVariations && !prevApplyPriceRef.current && hasVariations) {
      setVariationsList((prev) =>
        prev.map((item) => applyParentPricesToVariation(item, parentPriceContext)),
      );
    }
    prevApplyPriceRef.current = applyPriceToAllVariations;
  }, [applyPriceToAllVariations, hasVariations, parentPriceContext]);

  useEffect(() => {
    setValue('categoryGroup', categoryValues.categoryGroup, { shouldValidate: false });
    setValue('categoryType', categoryValues.categoryType, { shouldValidate: false });
    setValue('productGroup', categoryValues.productGroup, { shouldValidate: false });
    setValue('productType', categoryValues.productType, { shouldValidate: false });
    if (categoryValues.productType && categoryValues.hsnCode) {
      setValue('hsnCode', categoryValues.hsnCode, { shouldValidate: true });
    }
  }, [categoryValues, setValue]);

  // Dynamic nav sections — Variations only shown when hasVariations is checked
  const sections = useMemo(() => {
    const baseSections = buildAddItemSections(isJob).filter(
      (section) => section.id !== 'variations' || hasVariations,
    );
    if (!isStockMode) return baseSections;
    return baseSections.filter((section) => ['basic', 'pricing'].includes(section.id));
  }, [hasVariations, isJob, isStockMode]);

  const handleAddFiles = useCallback((categoryKey, fileList) => {
    const newFiles = [...(fileList || [])].map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      fileName: file.name,
      fileUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      file,
      size: file.size,
    }));
    setCategoryFiles((prev) => ({
      ...prev,
      [categoryKey]: [...(prev[categoryKey] || []), ...newFiles],
    }));
  }, []);

  const handleRemoveFile = useCallback((categoryKey, fileId) => {
    setCategoryFiles((prev) => {
      const updatedList = prev[categoryKey].filter((f) => f.id !== fileId);
      const removedFile = prev[categoryKey].find((f) => f.id === fileId);
      if (removedFile?.fileUrl?.startsWith('blob:')) URL.revokeObjectURL(removedFile.fileUrl);
      return { ...prev, [categoryKey]: updatedList };
    });
  }, []);

  const handleAddVariationFiles = useCallback((varId, fileList) => {
    const newFiles = [...(fileList || [])].map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      fileName: file.name,
      fileUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      file,
      size: file.size,
    }));
    setVariationsList((prev) =>
      prev.map((item) =>
        item.id === varId ? { ...item, files: [...item.files, ...newFiles] } : item,
      ),
    );
  }, []);

  const handleRemoveVariationFile = useCallback((varId, fileId) => {
    setVariationsList((prev) =>
      prev.map((item) => {
        if (item.id !== varId) return item;
        const removedFile = item.files.find((f) => f.id === fileId);
        if (removedFile?.fileUrl?.startsWith('blob:')) URL.revokeObjectURL(removedFile.fileUrl);
        return { ...item, files: item.files.filter((f) => f.id !== fileId) };
      }),
    );
  }, []);

  const handleTagInput = useCallback(
    (e) => {
      if (e.key === 'Enter' && tagInput.trim()) {
        e.preventDefault();
        const newTag = tagInput.trim();
        if (!tagArray.includes(newTag)) {
          setTagArray((prev) => [...prev, newTag]);
        }
        setTagInput('');
      }
    },
    [tagInput, tagArray],
  );

  const removeTag = useCallback((tag) => {
    setTagArray((prev) => prev.filter((t) => t !== tag));
  }, []);

  const addVariationOption = useCallback(
    (option) => {
      setVariationOptionsArray((prev) => {
        if (prev.includes(option)) return prev;
        const next = [...prev, option];
        setVariationsList((current) =>
          buildVariationsFromOptions(next, current, parentPriceContext, isJob),
        );
        return next;
      });
    },
    [isJob, parentPriceContext],
  );

  const removeVariationOption = useCallback((option) => {
    setVariationOptionsArray((prev) => prev.filter((item) => item !== option));
    setVariationsList((prev) => prev.filter((item) => item.optionKey !== option));
  }, []);

  const handleVariationOptionInput = useCallback(
    (e) => {
      if (e.key === 'Enter' && variationOptionInput.trim()) {
        e.preventDefault();
        addVariationOption(variationOptionInput.trim());
        setVariationOptionInput('');
      }
    },
    [variationOptionInput, addVariationOption],
  );

  const handleAddManualVariation = useCallback(() => {
    const id = `var-manual-${Date.now()}`;
    const base = {
      id,
      optionKey: '',
      name: '',
      description: '',
      minPurchasePrice: '',
      maxPurchasePrice: '',
      minSellingPrice: '',
      maxSellingPrice: '',
      materialBasicRate: '',
      labourBaseRate: '',
      files: [],
    };
    const withParent = applyParentPricesToVariation(base, parentPriceContext);
    setVariationsList((prev) => [...prev, isJob ? syncJobPurchasePrices(withParent) : withParent]);
  }, [isJob, parentPriceContext]);

  const updateVariation = useCallback((varId, patch) => {
    setVariationsList((prev) =>
      prev.map((item) => (item.id === varId ? { ...item, ...patch } : item)),
    );
  }, []);

  const handleRemoveVariation = useCallback(
    (variant) => {
      if (variant.optionKey) {
        removeVariationOption(variant.optionKey);
        return;
      }
      setVariationsList((prev) => prev.filter((item) => item.id !== variant.id));
    },
    [removeVariationOption],
  );

  const scrollToSection = useCallback((sectionId) => {
    const sectionElement = sectionRefs.current[sectionId];
    const container = scrollContainerRef.current;
    if (!sectionElement || !container) return;
    const containerTop = container.getBoundingClientRect().top;
    const sectionTop = sectionElement.getBoundingClientRect().top;
    const offset = sectionTop - containerTop + container.scrollTop - 8;
    container.scrollTo({ top: offset, behavior: 'smooth' });
    setActiveSection(sectionId);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const container = scrollContainerRef.current;
    if (!container) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio);
        if (visible[0]?.target?.id) setActiveSection(visible[0].target.id);
      },
      {
        root: container,
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    sections.forEach(({ id }) => {
      const element = sectionRefs.current[id];
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [open, sections]);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      if (!nextOpen) {
        reset(defaultProductAddItemValues);
        setCategoryFiles({
          productImages: [],
          brochures: [],
        });
        setVariationsList([]);
        setIsDescriptionOpen(false);
        setHasVariations(false);
        setTagInput('');
        setTagArray([]);
        setVariationOptionInput('');
        setVariationOptionsArray([]);
        prevApplyPriceRef.current = false;
        setActiveSection(ADD_ITEM_SECTIONS[0].id);
        setCategoryValues(EMPTY_PRODUCT_CATEGORY);
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
      }
      onOpenChange?.(nextOpen);
    },
    [onOpenChange, reset],
  );

  const onSubmitForm = useCallback(
    async (values) => {
      if (isStockMode && !String(values.customType ?? '').trim()) {
        showErrorToast('Stock type is required.');
        scrollToSection('basic');
        return;
      }

      const pricingError = getPricingValidationError({
        stockMode: isStockMode,
        devxProductType: defaultDevxProductType || 'product',
        applyPriceToAllVariations: values.applyPriceToAllVariations,
        hasVariations,
        minPurchasePrice: values.minPurchasePrice,
        maxPurchasePrice: values.maxPurchasePrice,
        materialBasicRate: values.materialBasicRate,
        labourBaseRate: values.labourBaseRate,
        minSellingPrice: values.minSellingPrice,
        maxSellingPrice: values.maxSellingPrice,
        variations: variationsList,
      });

      if (pricingError) {
        showErrorToast(pricingError);
        const scrollTarget =
          hasVariations && !values.applyPriceToAllVariations ? 'variations' : 'pricing';
        scrollToSection(scrollTarget);
        return;
      }

      try {
        const parentContext = isJob
          ? syncJobPurchasePrices({
              applyPriceToAllVariations: values.applyPriceToAllVariations,
              minPurchasePrice: values.minPurchasePrice,
              maxPurchasePrice: values.maxPurchasePrice,
              minSellingPrice: values.minSellingPrice,
              maxSellingPrice: values.maxSellingPrice,
              materialBasicRate: values.materialBasicRate,
              labourBaseRate: values.labourBaseRate,
            })
          : {
              applyPriceToAllVariations: values.applyPriceToAllVariations,
              minPurchasePrice: values.minPurchasePrice,
              maxPurchasePrice: values.maxPurchasePrice,
              minSellingPrice: values.minSellingPrice,
              maxSellingPrice: values.maxSellingPrice,
            };

        const normalizedValues = isJob ? syncJobPurchasePrices(values) : values;

        await onSubmit?.({
          ...normalizedValues,
          devxProductType: isStockMode ? 'product' : defaultDevxProductType || 'product',
          customType: values.customType,
          categoryFiles,
          variations:
            hasVariations && !isStockMode
              ? variationsList.map((variation) =>
                  isJob
                    ? syncJobPurchasePrices(applyParentPricesToVariation(variation, parentContext))
                    : applyParentPricesToVariation(variation, parentContext),
                )
              : [],
          variationOptions: hasVariations && !isStockMode ? variationOptionsArray : [],
          tags: tagArray,
          hasVariations: isStockMode ? false : hasVariations,
          category: categoryValues,
          stockMode: isStockMode,
        });
        handleOpenChange(false);
      } catch {
        // Keep drawer open; parent shows the error toast.
      }
    },
    [
      categoryFiles,
      variationsList,
      variationOptionsArray,
      hasVariations,
      tagArray,
      categoryValues,
      defaultDevxProductType,
      handleOpenChange,
      isJob,
      isStockMode,
      onSubmit,
      scrollToSection,
    ],
  );

  const setSectionRef = useCallback(
    (sectionId) => (node) => {
      if (node) sectionRefs.current[sectionId] = node;
    },
    [],
  );

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange}>
      <Drawer.Content className='flex h-full max-h-dvh max-w-[800px] flex-col overflow-hidden bg-bg-weak-100'>
        <Drawer.Header
          className='sticky top-0 z-10 shrink-0 border-b border-stroke-soft-200 bg-bg-white-0 px-8 py-5'
          showCloseButton={false}
        >
          <div className='flex w-full items-start gap-4'>
            <div className='flex size-11 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 p-2.5 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
              <RiBox3Line className='size-6 text-text-sub-500' aria-hidden />
            </div>
            <div className='flex min-w-0 flex-1 flex-col gap-1 pr-8'>
              <Drawer.Title className='text-label-lg text-text-main-900'>
                {isStockMode ? 'Add Stock Item' : 'Add Item'}
              </Drawer.Title>
              <p className='paragraph-small text-text-sub-500'>
                {isStockMode
                  ? 'Enter product details for a maintain-stock item.'
                  : 'Enter below details to add new item.'}
              </p>
            </div>
            <Drawer.Close asChild>
              <Button.Root
                type='button'
                variant='neutral'
                mode='ghost'
                size='xsmall'
                className='absolute right-4 top-4'
                aria-label='Close add item drawer'
              >
                <Button.Icon as={RiCloseLine} />
              </Button.Root>
            </Drawer.Close>
          </div>
        </Drawer.Header>

        <form
          onSubmit={handleSubmit(onSubmitForm)}
          className='flex min-h-0 flex-1 flex-col overflow-hidden'
        >
          <Drawer.Body className='flex min-h-0 flex-1 flex-row overflow-hidden p-0'>
            {/* Sidebar Nav */}
            <nav
              className='flex h-full w-[240px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-stroke-soft-200 bg-bg-weak-100 p-4'
              aria-label='Add item sections'
            >
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type='button'
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      'flex w-full items-center gap-1.5 rounded-lg p-2 text-left transition-colors cursor-pointer',
                      isActive
                        ? 'bg-bg-white-0 shadow-regular-sm font-medium text-text-main-900'
                        : 'text-text-sub-500 hover:bg-bg-white-0/60',
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-5 shrink-0',
                        isActive ? 'text-primary-base' : 'text-text-sub-500',
                      )}
                      aria-hidden
                    />
                    <span className='min-w-0 flex-1 truncate text-label-sm'>{section.label}</span>
                    {isActive ? (
                      <RiArrowRightSLine
                        className='size-5 shrink-0 text-text-sub-500'
                        aria-hidden
                      />
                    ) : null}
                  </button>
                );
              })}
            </nav>

            {/* Main Scroll Area */}
            <div
              ref={scrollContainerRef}
              className='h-full min-h-0 min-w-0 flex-1 overflow-y-auto bg-bg-white-0 px-8 pb-8 pt-5'
            >
              <div className='flex flex-col gap-5'>
                {/* ── Basic Information ── */}
                <section
                  id='basic'
                  ref={setSectionRef('basic')}
                  className='flex scroll-mt-4 flex-col gap-4'
                >
                  {/* Product Name — Figma title/x-large */}
                  <div className='flex flex-col gap-1'>
                    <Controller
                      name='productName'
                      control={control}
                      render={({ field }) => (
                        <Input.Root size='medium' hasError={Boolean(errors.productName)}>
                          <Input.Wrapper className='px-4 py-3'>
                            <Input.Input
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              placeholder='Enter product name'
                              className='text-[24px] font-medium leading-8 tracking-[-0.36px] placeholder:text-text-soft-400'
                            />
                          </Input.Wrapper>
                        </Input.Root>
                      )}
                    />
                    {errors.productName && <ErrorText>{errors.productName.message}</ErrorText>}
                  </div>

                  {/* Add description */}
                  <div className='flex flex-col gap-2'>
                    {isDescriptionOpen || String(watchedDescription || '').trim() ? (
                      <div className='flex flex-col gap-1.5'>
                        <Label.Root className='text-label-sm text-text-sub-500'>
                          Description
                        </Label.Root>
                        <Controller
                          name='description'
                          control={control}
                          render={({ field }) => (
                            <Textarea.Root
                              size='medium'
                              value={field.value || ''}
                              onChange={(event) => field.onChange(event.target.value)}
                              placeholder='Type here...'
                              rows={4}
                            />
                          )}
                        />
                        {errors.description && <ErrorText>{errors.description.message}</ErrorText>}
                      </div>
                    ) : (
                      <button
                        type='button'
                        onClick={() => setIsDescriptionOpen(true)}
                        className='flex w-full items-center gap-1.5 rounded-lg border border-transparent py-1.5 pl-2 pr-1.5 text-left hover:border-stroke-sub-300 cursor-pointer'
                      >
                        <RiStickyNoteLine className='size-5 text-text-soft-400' />
                        <span className='text-paragraph-md text-text-soft-400'>
                          Add description
                        </span>
                      </button>
                    )}
                  </div>

                  <ProductCategoryCascade
                    values={categoryValues}
                    onChange={setCategoryValues}
                    error={errors.productType?.message}
                    assetType={categoryAssetType}
                    brandSlot={
                      <Controller
                        name='brand'
                        control={control}
                        render={({ field }) => (
                          <ProductFormSearchableField
                            field={PRODUCT_FORM_FIELDS.BRAND}
                            label='Brand'
                            value={field.value}
                            onChange={field.onChange}
                            error={errors.brand?.message}
                            categoryGroup={categoryValues.categoryGroup}
                            categoryType={categoryValues.categoryType}
                            productGroup={categoryValues.productGroup}
                            assetType={categoryAssetType}
                          />
                        )}
                      />
                    }
                    vendorSlot={
                      <Controller
                        name='vendors'
                        control={control}
                        render={({ field }) => (
                          <ProductFormMultiSearchableField
                            field={PRODUCT_FORM_FIELDS.VENDOR}
                            label='Vendor'
                            value={field.value}
                            onChange={field.onChange}
                            error={errors.vendors?.message}
                            categoryGroup={categoryValues.categoryGroup}
                            categoryType={categoryValues.categoryType}
                            productGroup={categoryValues.productGroup}
                            assetType={categoryAssetType}
                          />
                        )}
                      />
                    }
                    uomSlot={
                      <Controller
                        name='unitOfMeasure'
                        control={control}
                        render={({ field }) => (
                          <ProductFormSearchableField
                            field={PRODUCT_FORM_FIELDS.UOM}
                            label='UOM'
                            required
                            value={field.value}
                            onChange={field.onChange}
                            error={errors.unitOfMeasure?.message}
                            assetType={categoryAssetType}
                          />
                        )}
                      />
                    }
                  />

                  {/* Make */}
                  <Controller
                    name='make'
                    control={control}
                    render={({ field }) => (
                      <TextField
                        label={isStockMode ? 'OEM / Company' : 'Make'}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={isStockMode ? 'Enter OEM / company' : 'Enter make'}
                        error={errors.make?.message}
                      />
                    )}
                  />

                  {isStockMode ? (
                    <Controller
                      name='customType'
                      control={control}
                      render={({ field }) => (
                        <FormField label='Type' required error={errors.customType?.message}>
                          <Select.Root value={field.value || ''} onValueChange={field.onChange}>
                            <Select.Trigger hasError={Boolean(errors.customType)}>
                              <Select.Value placeholder='Select type' />
                            </Select.Trigger>
                            <Select.Content>
                              {STOCKS_ADD_PRODUCT_TYPE_OPTIONS.map((option) => (
                                <Select.Item key={option.value} value={option.value}>
                                  {option.label}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        </FormField>
                      )}
                    />
                  ) : null}

                  {!isStockMode ? (
                    <>
                      {/* Product Website Link */}
                      <Controller
                        name='productWebsiteLink'
                        control={control}
                        render={({ field }) => (
                          <TextField
                            label='Product Website Link'
                            value={field.value}
                            onChange={field.onChange}
                            placeholder='https://www.example.com'
                            error={errors.productWebsiteLink?.message}
                          />
                        )}
                      />
                    </>
                  ) : null}

                  {/* HSN Code */}
                  <FormField label='HSN Code' required error={errors.hsnCode?.message}>
                    <Controller
                      name='hsnCode'
                      control={control}
                      render={({ field }) => (
                        <ProductFormSearchableSelect
                          field={PRODUCT_FORM_FIELDS.HSN_CODE}
                          value={field.value}
                          onValueChange={field.onChange}
                          hasError={Boolean(errors.hsnCode)}
                          placeholder='Select HSN code'
                          searchPlaceholder='Search HSN code or description'
                          noResultsMessage='No HSN codes found'
                          getOptionValue={(opt) => opt.value}
                          getOptionLabel={(opt) => opt.label}
                          renderOptionLabel={(opt) => (
                            <HsnOptionLabel
                              title={opt.title ?? opt.value}
                              description={opt.description}
                            />
                          )}
                          renderTriggerValue={({ selectedOption, placeholder, value }) => (
                            <span className='block min-w-0 max-w-full truncate'>
                              {(selectedOption && selectedOption.label) || value || placeholder}
                            </span>
                          )}
                        />
                      )}
                    />
                  </FormField>

                  {!isStockMode ? (
                    <>
                      {/* Brochure */}
                      <BrochureUploadField
                        files={categoryFiles.brochures || []}
                        onAddFiles={(fileList) => handleAddFiles('brochures', fileList)}
                        onRemoveFile={(fileId) => handleRemoveFile('brochures', fileId)}
                      />

                      {/* Tags */}
                      <div className='flex flex-col gap-1'>
                        <Label.Root>Tags</Label.Root>
                        <Input.Root size='medium'>
                          <Input.Wrapper>
                            <Input.Input
                              placeholder='Type here'
                              onKeyDown={handleTagInput}
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                            />
                          </Input.Wrapper>
                        </Input.Root>
                        {tagArray.length > 0 ? (
                          <div className='flex flex-wrap gap-2 pt-1'>
                            {tagArray.map((item) => (
                              <Tag.Root key={item} variant='stroke'>
                                <span className='text-label-xs text-text-sub-600'>{item}</span>
                                <Tag.DismissButton
                                  onClick={() => removeTag(item)}
                                  aria-label={`Remove ${item}`}
                                />
                              </Tag.Root>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : null}

                  {/* Photos & Video */}
                  <PhotosVideoField
                    label={hasVariations ? 'Photos & Video (template)' : 'Photos & Video'}
                    files={categoryFiles.productImages || []}
                    onAddFiles={(fileList) => handleAddFiles('productImages', fileList)}
                    onRemoveFile={(fileId) => handleRemoveFile('productImages', fileId)}
                  />

                  {/* Has variations? */}
                  {!isStockMode ? (
                    <>
                      <div className='flex items-center gap-2'>
                        <Checkbox.Root
                          id='has-variations'
                          checked={hasVariations}
                          onCheckedChange={(checked) => {
                            setHasVariations(checked);
                            if (!checked) {
                              setVariationOptionInput('');
                              setVariationOptionsArray([]);
                              setVariationsList([]);
                              setActiveSection(ADD_ITEM_SECTIONS[0].id);
                              if (scrollContainerRef.current)
                                scrollContainerRef.current.scrollTop = 0;
                            }
                          }}
                        />
                        <Label.Root
                          htmlFor='has-variations'
                          className='text-label-sm text-text-main-900 cursor-pointer'
                        >
                          Has variations?
                        </Label.Root>
                      </div>

                      {hasVariations ? (
                        <ProductsInlineTagsField
                          label='Variation Options'
                          tags={variationOptionsArray}
                          inputValue={variationOptionInput}
                          onInputChange={setVariationOptionInput}
                          onInputKeyDown={handleVariationOptionInput}
                          onRemoveTag={removeVariationOption}
                          placeholder='Type here'
                        />
                      ) : null}
                    </>
                  ) : null}

                  {!isStockMode ? (
                    <div
                      id='specification'
                      ref={setSectionRef('specification')}
                      className='flex scroll-mt-4 flex-col gap-4 border-t border-stroke-soft-200 pt-5'
                    >
                      <FormSectionTitle icon={RiTaskLine}>
                        {getSpecificationSectionTitle(
                          isJob ? PRODUCTS_TAB_IDS.JOB : defaultDevxProductType,
                        )}
                      </FormSectionTitle>
                      <Controller
                        name='specificationNotes'
                        control={control}
                        render={({ field }) => (
                          <Textarea.Root
                            size='medium'
                            value={field.value || ''}
                            onChange={(event) => field.onChange(event.target.value)}
                            placeholder='Type here....'
                            rows={4}
                          />
                        )}
                      />
                      {errors.specificationNotes && (
                        <ErrorText>{errors.specificationNotes.message}</ErrorText>
                      )}
                    </div>
                  ) : null}
                </section>

                {/* ── Pricing ── */}
                <section
                  id='pricing'
                  ref={setSectionRef('pricing')}
                  className='flex scroll-mt-4 flex-col gap-3 border-t border-stroke-soft-200 pt-8'
                >
                  <FormSectionTitle icon={RiMoneyDollarCircleLine}>Pricing</FormSectionTitle>

                  <div className='flex flex-col gap-4'>
                    {isStockMode ? (
                      <Controller
                        name='minPurchasePrice'
                        control={control}
                        render={({ field }) => (
                          <SinglePriceField
                            label='Price'
                            value={field.value}
                            onChange={handleStockPriceChange}
                            required
                            placeholder='Enter price'
                          />
                        )}
                      />
                    ) : isJob ? (
                      <JobPricingFields
                        materialRate={watchedMaterialBasicRate}
                        labourRate={watchedLabourBaseRate}
                        totalRate={watchedMinPurchasePrice}
                        onMaterialRateChange={handleJobMaterialRateChange}
                        onLabourRateChange={handleJobLabourRateChange}
                        onTotalRateChange={handleJobTotalRateChange}
                        sellingMin={watchedMinSellingPrice}
                        sellingMax={watchedMaxSellingPrice}
                        onSellingMinChange={handleJobSellingMinChange}
                        onSellingMaxChange={handleJobSellingMaxChange}
                        requireRates={!hasVariations || applyPriceToAllVariations}
                      />
                    ) : (
                      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <Controller
                          name='minPurchasePrice'
                          control={control}
                          render={({ field: minField }) => (
                            <Controller
                              name='maxPurchasePrice'
                              control={control}
                              render={({ field: maxField }) => (
                                <PriceRangeField
                                  label='Purchase Price'
                                  minValue={minField.value}
                                  maxValue={maxField.value}
                                  onMinChange={minField.onChange}
                                  onMaxChange={maxField.onChange}
                                  required={!hasVariations || applyPriceToAllVariations}
                                />
                              )}
                            />
                          )}
                        />
                        <Controller
                          name='minSellingPrice'
                          control={control}
                          render={({ field: minField }) => (
                            <Controller
                              name='maxSellingPrice'
                              control={control}
                              render={({ field: maxField }) => (
                                <PriceRangeField
                                  label='Selling Price'
                                  minValue={minField.value}
                                  maxValue={maxField.value}
                                  onMinChange={minField.onChange}
                                  onMaxChange={maxField.onChange}
                                  required={!hasVariations || applyPriceToAllVariations}
                                />
                              )}
                            />
                          )}
                        />
                      </div>
                    )}

                    {!isStockMode ? (
                      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <Controller
                          name='gstRate'
                          control={control}
                          render={({ field }) => (
                            <TextField
                              label='GST Rate'
                              value={field.value}
                              onChange={field.onChange}
                              placeholder='Enter rate'
                              suffix='%'
                              error={errors.gstRate?.message}
                            />
                          )}
                        />
                        <Controller
                          name='moq'
                          control={control}
                          render={({ field }) => (
                            <TextField
                              label='MOQ'
                              value={field.value}
                              onChange={field.onChange}
                              placeholder='Enter moq'
                              error={errors.moq?.message}
                            />
                          )}
                        />
                      </div>
                    ) : null}

                    {!isStockMode ? (
                      <FormField label='Pricing Notes' error={errors.pricingNotes?.message}>
                        <Controller
                          name='pricingNotes'
                          control={control}
                          render={({ field }) => (
                            <Textarea.Root
                              size='medium'
                              value={field.value}
                              onChange={(event) => field.onChange(event.target.value)}
                              placeholder='Type here....'
                              rows={4}
                            />
                          )}
                        />
                      </FormField>
                    ) : null}

                    {hasVariations ? (
                      <Controller
                        name='applyPriceToAllVariations'
                        control={control}
                        render={({ field }) => (
                          <div className='flex items-center gap-2'>
                            <Checkbox.Root
                              id='apply-price-to-all'
                              checked={Boolean(field.value)}
                              onCheckedChange={(checked) => field.onChange(checked === true)}
                            />
                            <Label.Root
                              htmlFor='apply-price-to-all'
                              className='text-paragraph-sm text-text-main-900 cursor-pointer'
                            >
                              Apply this price to all variations
                            </Label.Root>
                          </div>
                        )}
                      />
                    ) : null}
                  </div>
                </section>

                {/* ── Variations (conditional) ── */}
                {hasVariations && (
                  <section
                    id='variations'
                    ref={setSectionRef('variations')}
                    className='flex scroll-mt-4 flex-col gap-3 border-t border-stroke-soft-200 pt-8'
                  >
                    <div className='flex items-center justify-between gap-4'>
                      <FormSectionTitle icon={RiPantoneLine}>Variations</FormSectionTitle>
                      <Button.Root
                        type='button'
                        variant='neutral'
                        mode='stroke'
                        size='small'
                        onClick={handleAddManualVariation}
                        className='min-w-[76px] gap-0.5 bg-bg-white-0 px-2 py-2 shadow-regular-xs shrink-0'
                      >
                        <Button.Icon as={RiAddLine} />
                        Add More Variation
                      </Button.Root>
                    </div>

                    <VariationsListContent
                      variations={variationsList}
                      onUpdate={updateVariation}
                      onRemove={handleRemoveVariation}
                      onAddFiles={handleAddVariationFiles}
                      onRemoveFile={handleRemoveVariationFile}
                      requirePrices={!applyPriceToAllVariations}
                      pricingMode={isJob ? 'job' : 'product'}
                    />
                  </section>
                )}

                {!isStockMode ? (
                  <section
                    id='media'
                    ref={setSectionRef('media')}
                    className='flex scroll-mt-4 flex-col border-t border-stroke-soft-200 pt-8'
                  >
                    <DocumentsSection
                      open={open}
                      categoryFiles={categoryFiles}
                      onAddFiles={handleAddFiles}
                      onRemoveFile={handleRemoveFile}
                      simpleMode={isJob}
                    />
                  </section>
                ) : null}
              </div>
            </div>
          </Drawer.Body>

          <Drawer.Footer className='sticky bottom-0 z-10 shrink-0 border-t border-stroke-soft-200 bg-bg-white-0 px-8 py-6'>
            <div className='flex justify-end gap-3'>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='medium'
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button.Root>
              <Button.Root
                type='submit'
                variant='primary'
                mode='filled'
                size='medium'
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding…' : 'Add'}
              </Button.Root>
            </div>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default ProductsAddItemDrawer;
