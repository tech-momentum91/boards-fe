import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiArrowUpSLine,
  RiCheckLine,
  RiCloseLine,
  RiDownloadLine,
  RiFilePdf2Line,
  RiInformationFill,
  RiZoomInLine,
  RiZoomOutLine,
} from 'react-icons/ri';

import { normalizeBoqTemplateProductRow } from '@/api/boqProductPayload';
import {
  fetchPoScopeTerms,
  fetchPoTypeOptions,
  createDraftProcurementPurchaseOrder,
  getPackageVendorComparison,
  getPurchaseBoqVendorQuoteRates,
} from '@/api/projectProcurements';
import { fetchActiveVendors } from '@/api/vendors';
import { BOQ_PRODUCT_COLUMN_CONFIG_SOURCES } from '@/components/boq/boq-templates/components/boq-template-products-column-config';
import BoqTemplateProductsTable from '@/components/boq/boq-templates/components/boq-template-products-table';
import { formatBoqCompactRupeeAmount } from '@/components/boq/boq-templates/components/boq-template-product-master-utils';
import { buildBoqTemplateQuantityLabel } from '@/components/boq/boq-templates/components/boq-template-products-utils';
import ProjectBoqProductsToolbar from '@/components/boq/project-boqs/components/project-boq-products-toolbar';
import BoqListEmptyState from '@/components/boq/shared/boq-list-empty-state';
import RaisePoProductCategoryFields from '@/components/procurements/raise-po-product-category-fields';
import {
  applyPurchaseBoqVendorQuoteRatesToItems,
  enrichRaisePoLineItemsWithPackageTaxonomy,
  getDirectPoLineItemsMissingVendorQuotes,
  resolveDefaultRaisePoCategoryValues,
  splitRaisePoCategoryValuesForPayload,
} from '@/components/procurements/project-procurement-purchase-boq-selection-utils';
import {
  EMPTY_PRODUCT_CATEGORY,
  isCategorySelectionStarted,
} from '@/components/products/product-category-utils';
import {
  applyVendorQuoteRatesToItems,
  buildVendorComparisonPendingItems,
  buildVendorComparisonSelectedItems,
} from '@/components/procurements/project-procurement-vendor-comparison-selection-utils';
import { useProjectProcurementRaisePoLineItemsColumnConfig } from '@/components/procurements/project-procurement-raise-po-line-items-column-config';
import {
  buildPoPreviewEmbedUrl,
  DUMMY_PO_PREVIEW_PDF_URL,
} from '@/components/procurements/constants';
import { formatProcurementAmount } from '@/components/procurements/project-procurements-utils';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import { Datepicker } from '@/components/ui/datepicker';
import * as Drawer from '@/components/ui/drawer';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Popover from '@/components/ui/popover';
import { SearchableSelect } from '@/components/ui/searchable-select';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';

const FALLBACK_PO_TYPE_OPTIONS = [
  { value: 'Supply Only', label: 'Supply Only' },
  { value: 'Supply & Install', label: 'Supply & Install' },
  { value: 'Labour Only', label: 'Labour Only' },
  { value: 'Turnkey', label: 'Turnkey' },
];

const STATE_OPTIONS = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
].map((name) => ({ value: name, label: name }));

const WIZARD_STEPS = [
  { id: 1, label: 'Project Details' },
  { id: 2, label: 'Line Items' },
  { id: 3, label: 'Scope & Commercial Terms' },
];

const EMPTY_FORM = {
  vendorId: '',
  categoryValues: { ...EMPTY_PRODUCT_CATEGORY },
  poType: '',
  expectedDelivery: undefined,
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  state: '',
  city: '',
  address: '',
  /** @type {Record<string, { templateId: string, content: string, milestones: Array<{ id?: string, name: string, percentage: string|number, remarks: string }> }>} */
  scopeSelections: {},
};

function buildRaisePoScopeTerms(form, scopeCategories = []) {
  const categoryById = new Map(scopeCategories.map((category) => [category.id, category]));

  return Object.entries(form.scopeSelections ?? {})
    .filter(([, selection]) => selection?.templateId)
    .map(([categoryId, selection]) => {
      const category = categoryById.get(categoryId);
      return {
        categoryId,
        templateId: selection.templateId,
        content: selection.content ?? '',
        milestones: Array.isArray(selection.milestones) ? selection.milestones : [],
        isPaymentTerms: Boolean(category?.is_payment_terms ?? category?.isPaymentTerms),
      };
    });
}

function parsePackageCategories(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item ?? '').trim()).filter(Boolean);
      }
    } catch {
      // fall through to CSV split
    }
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
}

function isRaisePoLineAlreadyPoRaised(item) {
  if (item?.poRaised) return true;
  const status = String(item?.procurementStatus ?? item?.procurement_status ?? '')
    .trim()
    .toLowerCase();
  return status === 'po-released' || status === 'delivered';
}

function filterRaisePoPendingPackageItems(packageItems = []) {
  return packageItems.filter((item) => !isRaisePoLineAlreadyPoRaised(item));
}

function buildRaisePoPayload({
  form,
  packageName,
  purchaseBoqName = '',
  isDirectPo = false,
  packageCategories = [],
  selectedItems = [],
  comparisonCategories = [],
  comparisonSelectedItemIds,
  scopeCategories = [],
}) {
  const comparisonSelection =
    comparisonSelectedItemIds instanceof Set ? comparisonSelectedItemIds : null;
  const resolvedItems =
    selectedItems.length > 0
      ? selectedItems
      : comparisonSelection && comparisonSelection.size > 0
        ? buildVendorComparisonSelectedItems(
            comparisonCategories,
            comparisonSelectedItemIds,
            form.vendorId,
          )
        : [];

  const categoryValues = form.categoryValues ?? { ...EMPTY_PRODUCT_CATEGORY };
  const defaults = resolveDefaultRaisePoCategoryValues(resolvedItems, packageCategories);
  const mergedValues = isCategorySelectionStarted(categoryValues)
    ? categoryValues
    : isCategorySelectionStarted(defaults)
      ? defaults
      : categoryValues;
  const { category, subCategory, productType } = splitRaisePoCategoryValuesForPayload(mergedValues);

  return {
    packageName,
    purchaseBoqName,
    isDirectPo: isDirectPo ? 1 : 0,
    vendorId: form.vendorId,
    category,
    subCategory,
    productType,
    poType: form.poType,
    expectedDelivery: form.expectedDelivery ? format(form.expectedDelivery, 'yyyy-MM-dd') : '',
    contact: {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    },
    location: {
      state: form.state,
      city: form.city.trim(),
      address: form.address.trim(),
    },
    items: resolvedItems,
    scopeTerms: buildRaisePoScopeTerms(form, scopeCategories),
  };
}

function getDirectPoVendorQuoteValidationError(items = [], ratesByItemCode = {}) {
  const missingItems = getDirectPoLineItemsMissingVendorQuotes(items, ratesByItemCode);
  if (missingItems.length === 0) return null;

  const labels = missingItems
    .map((item) => String(item.product ?? item.itemCode ?? item.item ?? '').trim())
    .filter(Boolean);
  const detail = labels.length > 0 ? `: ${labels.join(', ')}` : '';
  return `A submitted vendor quotation is required for every selected line item before creating a Purchase Order${detail}.`;
}

/** Figma labels — used only when the scope-terms API returns no categories. */
const FALLBACK_SCOPE_CATEGORIES = [
  'Scope of Work',
  'Payment Terms',
  'Billing Documentation',
  'Safety & Insurance',
  'Warranty',
  'Taxes',
  'Retention',
  'Liquidated Damages',
  'Delivery Clause',
  'Insurance',
].map((label) => ({
  id: label,
  label,
  description: '',
  is_payment_terms: label === 'Payment Terms',
  templates: [],
}));

const emptyScopeSelection = () => ({
  templateId: '',
  content: '',
  milestones: [],
});

/** Prefer plain text in the PO textarea when masters store HTML. */
function toPlainTextContent(value) {
  const raw = String(value ?? '');
  if (!raw || !/<[a-z][\S\s]*>/i.test(raw)) return raw;
  if (typeof document === 'undefined') {
    return raw
      .replaceAll(/<[^>]+>/g, ' ')
      .replaceAll(/\s+/g, ' ')
      .trim();
  }
  const el = document.createElement('div');
  el.innerHTML = raw;
  return (el.textContent || '').trim();
}

const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Searchable single-select — uses shared DevX SearchableSelect. */
const SearchableFormSelect = memo(
  ({
    value,
    options = [],
    onChange,
    placeholder = 'Select',
    isLoading = false,
    error = null,
    emptyLabel = 'No options found',
    disabled = false,
    compact = false,
    onOpenChange,
  }) => (
    <SearchableSelect
      value={value}
      onValueChange={onChange}
      options={options}
      placeholder={placeholder}
      searchPlaceholder='Search here...'
      emptyMessage={isLoading ? 'Loading…' : (error ?? emptyLabel)}
      noResultsMessage={emptyLabel}
      disabled={disabled || isLoading}
      matchTriggerWidth
      showArrow
      size={compact ? 'xsmall' : 'medium'}
      variant={compact ? 'compact' : undefined}
      onOpenChange={onOpenChange}
      contentClassName={
        compact
          ? 'min-w-[240px] w-[max(240px,var(--radix-popover-trigger-width))]'
          : 'min-w-[var(--radix-popover-trigger-width)]'
      }
      triggerClassName={compact ? 'w-full max-w-[240px]' : undefined}
    />
  ),
);
SearchableFormSelect.displayName = 'SearchableFormSelect';

const PlainFormSelect = memo(
  ({
    value,
    options = [],
    onChange,
    placeholder = 'Select',
    isLoading = false,
    error = null,
    emptyLabel = 'No options found',
    disabled = false,
    compact = false,
    onOpenChange,
  }) => {
    const [open, setOpen] = useState(false);

    const handleOpenChange = useCallback(
      (next) => {
        setOpen(next);
        onOpenChange?.(next);
      },
      [onOpenChange],
    );

    const selectedOption = useMemo(
      () => options.find((option) => option.value === value) ?? null,
      [options, value],
    );

    return (
      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger asChild>
          <button
            type='button'
            disabled={disabled || isLoading}
            className={cn(
              'flex items-center rounded-lg border bg-bg-white-0 text-left transition-shadow',
              'disabled:pointer-events-none disabled:opacity-60',
              compact
                ? 'w-full max-w-[240px] gap-1.5 py-1.5 pl-2 pr-1.5'
                : 'w-full gap-2 px-2.5 py-2',
              open
                ? 'border-stroke-strong-900 shadow-[0px_0px_0px_2px_white,0px_0px_0px_4px_#e4e5e7]'
                : 'border-stroke-soft-200 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]',
            )}
          >
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-paragraph-sm',
                selectedOption ? 'text-text-main-900' : 'text-text-sub-500',
              )}
            >
              {isLoading ? 'Loading…' : selectedOption ? selectedOption.label : placeholder}
            </span>
            {open ? (
              <RiArrowUpSLine className='size-5 shrink-0 text-text-soft-400' aria-hidden />
            ) : (
              <RiArrowDownSLine className='size-5 shrink-0 text-text-soft-400' aria-hidden />
            )}
          </button>
        </Popover.Trigger>
        <Popover.Content
          align={compact ? 'end' : 'start'}
          sideOffset={8}
          showArrow={false}
          unstyled
          className={cn(
            'z-[80] overflow-hidden rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-0 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]',
            compact
              ? 'min-w-[240px] w-[max(240px,var(--radix-popover-trigger-width))]'
              : 'w-[var(--radix-popover-trigger-width)]',
          )}
        >
          <div className='flex max-h-[220px] flex-col gap-1 overflow-y-auto p-2' role='listbox'>
            {isLoading ? (
              <p className='px-2 py-4 text-center text-paragraph-sm text-text-soft-400'>Loading…</p>
            ) : error ? (
              <p className='px-2 py-4 text-center text-paragraph-sm text-error-base'>{error}</p>
            ) : options.length > 0 ? (
              options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type='button'
                    role='option'
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange?.(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 overflow-hidden rounded-lg p-2 text-left transition-colors',
                      isSelected
                        ? 'bg-bg-weak-100 text-label-sm font-medium text-text-main-900'
                        : 'bg-bg-white-0 text-paragraph-sm font-normal text-text-main-900 hover:bg-bg-weak-100',
                    )}
                  >
                    <span className='min-w-0 flex-1 truncate'>{option.label}</span>
                    {isSelected ? (
                      <RiCheckLine className='size-5 shrink-0 text-text-soft-400' aria-hidden />
                    ) : null}
                  </button>
                );
              })
            ) : (
              <p className='px-2 py-4 text-center text-paragraph-sm text-text-soft-400'>
                {emptyLabel}
              </p>
            )}
          </div>
        </Popover.Content>
      </Popover.Root>
    );
  },
);
PlainFormSelect.displayName = 'PlainFormSelect';

/**
 * Single-select dropdown that mirrors the Figma "Default Dropdown" control.
 * Use `searchable` for vendor/state lists — delegates to shared SearchableSelect.
 */
const FormSelect = memo(
  ({
    value,
    options = [],
    onChange,
    placeholder = 'Select',
    searchable = false,
    isLoading = false,
    error = null,
    emptyLabel = 'No options found',
    disabled = false,
    /** Compact trigger used in Step 3 accordion rows (Figma ~82×32). */
    compact = false,
    onOpenChange,
  }) => {
    if (searchable) {
      return (
        <SearchableFormSelect
          value={value}
          options={options}
          onChange={onChange}
          placeholder={placeholder}
          isLoading={isLoading}
          error={error}
          emptyLabel={emptyLabel}
          disabled={disabled}
          compact={compact}
          onOpenChange={onOpenChange}
        />
      );
    }

    return (
      <PlainFormSelect
        value={value}
        options={options}
        onChange={onChange}
        placeholder={placeholder}
        isLoading={isLoading}
        error={error}
        emptyLabel={emptyLabel}
        disabled={disabled}
        compact={compact}
        onOpenChange={onOpenChange}
      />
    );
  },
);
FormSelect.displayName = 'FormSelect';

const FieldLabel = memo(({ children, required = false }) => {
  return (
    <div className='flex items-center gap-px'>
      <Label.Root className='text-label-sm text-text-main-900'>{children}</Label.Root>
      {required ? <span className='text-label-sm text-icon-soft-400'>*</span> : null}
    </div>
  );
});
FieldLabel.displayName = 'FieldLabel';

const SectionLabel = memo(({ children }) => {
  return (
    <p className='text-[12px] font-bold uppercase leading-4 tracking-[0.48px] text-text-soft-400'>
      {children}
    </p>
  );
});
SectionLabel.displayName = 'SectionLabel';

/** Text input styled to match the Figma "Text Input" control. */
const FormInput = memo(
  ({ value, onChange, placeholder, type = 'text', autoComplete = 'off', inputMode, ariaLabel }) => {
    return (
      <Input.Root size='medium'>
        <Input.Wrapper>
          <Input.Input
            type={type}
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
            placeholder={placeholder}
            autoComplete={autoComplete}
            inputMode={inputMode}
            aria-label={ariaLabel}
          />
        </Input.Wrapper>
      </Input.Root>
    );
  },
);
FormInput.displayName = 'FormInput';

/** Phone control: fixed +91 country prefix + number input (single-country per design). */
const PhoneField = memo(({ value, onChange }) => {
  return (
    <div className='flex w-full items-stretch overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
      <span className='flex shrink-0 items-center gap-0.5 px-2.5 py-2 text-paragraph-sm text-text-main-900'>
        +91
        <RiArrowDownSLine className='size-5 text-text-soft-400' aria-hidden />
      </span>
      <input
        type='tel'
        inputMode='tel'
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder='(555) 000-0000'
        autoComplete='off'
        aria-label='Phone number'
        className='min-w-0 flex-1 border-l border-stroke-soft-200 bg-transparent px-3 py-2 text-paragraph-sm text-text-main-900 outline-none placeholder:text-text-soft-400'
      />
    </div>
  );
});
PhoneField.displayName = 'PhoneField';

const StepIndicator = memo(({ currentStep }) => {
  return (
    <div className='flex items-center justify-center gap-2.5'>
      {WIZARD_STEPS.map((step, index) => {
        const isActive = step.id === currentStep;
        const isComplete = step.id < currentStep;
        return (
          <React.Fragment key={step.id}>
            <div className='flex shrink-0 items-center gap-2'>
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full text-label-xs',
                  isComplete
                    ? 'bg-success-base text-text-white-0'
                    : isActive
                      ? 'bg-[#375dfb] text-text-white-0'
                      : 'border border-stroke-soft-200 bg-bg-white-0 text-text-sub-500',
                )}
              >
                {isComplete ? (
                  <RiCheckLine className='size-3.5' aria-hidden />
                ) : (
                  <span className='leading-none font-medium'>{step.id}</span>
                )}
              </span>
              <span
                className={cn(
                  'whitespace-nowrap text-paragraph-sm',
                  isActive ? 'font-medium text-text-main-900' : 'font-normal text-text-sub-500',
                )}
              >
                {step.label}
              </span>
            </div>
            {index < WIZARD_STEPS.length - 1 ? (
              <RiArrowRightSLine className='size-5 shrink-0 text-text-soft-400' aria-hidden />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
});
StepIndicator.displayName = 'StepIndicator';

const SectionHeading = memo(({ title, description }) => {
  return (
    <div className='flex flex-col gap-1'>
      <p className='text-label-sm text-text-main-900'>{title}</p>
      {description ? <p className='text-paragraph-xs text-text-sub-500'>{description}</p> : null}
    </div>
  );
});
SectionHeading.displayName = 'SectionHeading';

function ProjectDetailsStep({
  form,
  onChange,
  projectName,
  vendorOptions,
  isLoadingVendors,
  vendorsError,
  poTypeOptions,
  isLoadingPoTypes,
  poTypesError,
}) {
  return (
    <div className='flex flex-col gap-5 pb-6'>
      <SectionHeading
        title='Project Details'
        description='Core PO information — vendor, project & delivery parameters'
      />

      <div className='flex flex-col gap-5'>
        {/* Project Details */}
        <div className='flex flex-col gap-4'>
          <div className='flex gap-4'>
            <div className='flex flex-1 flex-col gap-1'>
              <FieldLabel>Vendor</FieldLabel>
              <FormSelect
                value={form.vendorId}
                options={vendorOptions}
                onChange={(value) => onChange({ vendorId: value })}
                placeholder='Enter vendor name'
                searchable
                isLoading={isLoadingVendors}
                error={vendorsError}
                emptyLabel='No vendors found'
              />
            </div>
            <div className='flex flex-1 flex-col gap-1'>
              <FieldLabel>Project</FieldLabel>
              <div className='flex items-center gap-2 rounded-lg border border-stroke-soft-200 bg-bg-weak-50 px-2.5 py-2 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
                <span className='min-w-0 flex-1 truncate text-paragraph-sm text-text-main-900'>
                  {projectName || '—'}
                </span>
              </div>
            </div>
          </div>

          <RaisePoProductCategoryFields
            values={form.categoryValues ?? EMPTY_PRODUCT_CATEGORY}
            onChange={(categoryValues) => onChange({ categoryValues })}
          />

          <div className='flex gap-4'>
            <div className='flex flex-1 flex-col gap-1'>
              <FieldLabel required>PO Type</FieldLabel>
              <FormSelect
                value={form.poType}
                options={poTypeOptions}
                onChange={(value) => onChange({ poType: value })}
                isLoading={isLoadingPoTypes}
                error={poTypesError}
                emptyLabel='No PO types found'
              />
            </div>
            <div className='flex flex-1 flex-col gap-1'>
              <FieldLabel>Expected Delivery</FieldLabel>
              <Datepicker
                variant='bordered'
                size='medium'
                value={form.expectedDelivery}
                onChange={(date) => onChange({ expectedDelivery: date })}
                placeholder='DD/MM/YY'
                formatDate={(date) => format(date, 'dd/MM/yy')}
                className='w-full'
              />
            </div>
          </div>
        </div>

        {/* Contact Details */}
        {/* <div className='flex flex-col gap-4'>
          <SectionLabel>Contact Details</SectionLabel>
          <div className='flex gap-4'>
            <div className='flex flex-1 flex-col gap-1'>
              <FieldLabel>First Name</FieldLabel>
              <FormInput
                value={form.firstName}
                onChange={(value) => onChange({ firstName: value })}
                placeholder='Enter first name'
                ariaLabel='First name'
              />
            </div>
            <div className='flex flex-1 flex-col gap-1'>
              <FieldLabel>Last Name</FieldLabel>
              <FormInput
                value={form.lastName}
                onChange={(value) => onChange({ lastName: value })}
                placeholder='Enter last name'
                ariaLabel='Last name'
              />
            </div>
          </div>
          <div className='flex gap-4'>
            <div className='flex flex-1 flex-col gap-1'>
              <FieldLabel>Email</FieldLabel>
              <FormInput
                type='email'
                value={form.email}
                onChange={(value) => onChange({ email: value })}
                placeholder='Example@gmail.com'
                inputMode='email'
                ariaLabel='Email'
              />
            </div>
            <div className='flex flex-1 flex-col gap-1'>
              <FieldLabel>Phone Number</FieldLabel>
              <PhoneField value={form.phone} onChange={(value) => onChange({ phone: value })} />
            </div>
          </div>
        </div>

      
        <div className='flex flex-col gap-4'>
          <SectionLabel>Location</SectionLabel>
          <div className='flex gap-4'>
            <div className='flex flex-1 flex-col gap-1'>
              <FieldLabel>State</FieldLabel>
              <FormSelect
                value={form.state}
                options={STATE_OPTIONS}
                onChange={(value) => onChange({ state: value })}
                searchable
                emptyLabel='No states found'
              />
            </div>
            <div className='flex flex-1 flex-col gap-1'>
              <FieldLabel>City</FieldLabel>
              <FormInput
                value={form.city}
                onChange={(value) => onChange({ city: value })}
                placeholder='Enter city'
                ariaLabel='City'
              />
            </div>
          </div>
          <div className='flex flex-col gap-1'>
            <FieldLabel>Address</FieldLabel>
            <FormInput
              value={form.address}
              onChange={(value) => onChange({ address: value })}
              placeholder='Enter address'
              ariaLabel='Address'
            />
          </div>
        </div> */}
      </div>
    </div>
  );
}

/** Figma 34834:120475 — Value / Disc. Value overlay chips on the TOTAL row. */
const LineItemsTotalChip = memo(
  ({
    label,
    value,
    showInfo = false,
    /** @type {Array<{ label: string, value: string }>|undefined} */
    breakdownItems,
  }) => {
    const [infoOpen, setInfoOpen] = useState(false);
    const hasBreakdown = Array.isArray(breakdownItems) && breakdownItems.length > 0;

    return (
      <div className='inline-flex shrink-0 items-center gap-1.5 rounded border border-stroke-soft-200 bg-bg-weak-100 px-[5px] py-[3px]'>
        <span className='text-[9px] font-bold uppercase leading-none tracking-[0.72px] text-text-soft-400'>
          {label}
        </span>
        <span className='inline-flex items-center gap-0.5'>
          <span className='text-[12px] font-bold leading-none text-text-soft-400'>{value}</span>
          {showInfo && hasBreakdown ? (
            <Tooltip.Provider delayDuration={0}>
              <Tooltip.Root open={infoOpen} onOpenChange={setInfoOpen}>
                <Tooltip.Trigger asChild>
                  <button
                    type='button'
                    className='inline-flex shrink-0 items-center justify-center'
                    aria-label={`${label} breakdown`}
                    aria-expanded={infoOpen}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setInfoOpen((previous) => !previous);
                    }}
                  >
                    <RiInformationFill className='size-4 text-text-soft-400' aria-hidden />
                  </button>
                </Tooltip.Trigger>
                {/* Figma 34834:120507 — Actual Amt. / GST dark tooltip */}
                <Tooltip.Content
                  size='xsmall'
                  variant='dark'
                  side='top'
                  align='center'
                  sideOffset={6}
                  className='z-[80] rounded bg-[#20232d] px-1.5 py-0.5 shadow-[0px_12px_24px_0px_rgba(134,140,152,0.12),0px_1px_2px_0px_rgba(228,229,231,0.24)]'
                  onPointerDownOutside={() => setInfoOpen(false)}
                >
                  <div className='flex flex-col whitespace-pre text-[12px] font-semibold leading-[18px] text-text-white-0'>
                    {breakdownItems.map((item) => (
                      <p key={item.label} className='whitespace-nowrap'>
                        <span className='text-white/50'>{item.label}:</span>{' '}
                        <span>{item.value}</span>
                      </p>
                    ))}
                  </div>
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          ) : null}
        </span>
      </div>
    );
  },
);
LineItemsTotalChip.displayName = 'LineItemsTotalChip';

function parseGstRatePercent(value) {
  if (value === undefined || value === null || value === '') return 0;
  const cleaned = String(value).replace('%', '').trim();
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveLineItemGstAmount(item, taxableAmount) {
  const explicit = item.gstAmount ?? item.gst_amount ?? item.taxAmount ?? item.tax_amount;
  if (explicit !== undefined && explicit !== null && explicit !== '') {
    return toNumber(explicit);
  }
  const rate = parseGstRatePercent(item.gstRate ?? item.gst_rate ?? item.taxRate ?? item.tax_rate);
  if (rate === 0) return 0;
  return taxableAmount * (rate / 100);
}

function normalizeRaisePoLineItem(item, index) {
  const qty = toNumber(item.quantity ?? item.qty);
  const rate = toNumber(item.vendorRate ?? item.rate);
  const discPercent = toNumber(item.discountPercent ?? item.discPercent);
  const rawExplicit = item.lineValue ?? item.poValue ?? item.value ?? item.amount;
  const amount =
    rawExplicit !== undefined && rawExplicit !== null && rawExplicit !== ''
      ? toNumber(rawExplicit)
      : qty * rate;
  const rawDiscValue = item.discountValue ?? item.discValue;
  const discValue =
    rawDiscValue !== undefined && rawDiscValue !== null && rawDiscValue !== ''
      ? toNumber(rawDiscValue)
      : amount * (discPercent / 100);
  const gstAmount = resolveLineItemGstAmount(item, Math.max(0, amount - discValue));

  return {
    key: String(item.id ?? item.name ?? `${item.itemCode || item.product}-${index}`),
    product: item.product || item.itemCode || '—',
    brand: item.brand || '—',
    description: item.description || '',
    qty,
    units: item.units || '—',
    rate,
    amount,
    discPercent,
    discValue,
    gstAmount,
    remarks: item.remarks || '—',
    raw: item,
  };
}

function mapRaisePoItemToProductRow(item, index) {
  const normalized = normalizeRaisePoLineItem(item, index);
  const baseRow =
    item?.id != null && (item?.product != null || item?.itemCode != null)
      ? normalizeBoqTemplateProductRow(item)
      : {};

  const quantityByFloor = Array.isArray(baseRow.quantityByFloor)
    ? baseRow.quantityByFloor
    : Array.isArray(item?.quantityByFloor)
      ? item.quantityByFloor
      : [];

  const quantityLabel = String(baseRow.quantity ?? item?.quantity ?? '').trim();
  const quantityFromFloors =
    quantityByFloor.length > 0 ? buildBoqTemplateQuantityLabel(quantityByFloor) : '';
  // Prefer floor labels (e.g. "Floor 1 - 10") over a bare numeric qty so UI matches Internal BOQ.
  const quantity =
    (quantityLabel && Number.isNaN(Number(quantityLabel)) ? quantityLabel : '') ||
    quantityFromFloors ||
    quantityLabel ||
    (normalized.qty != null && normalized.qty !== '' ? String(normalized.qty) : '');

  return {
    ...baseRow,
    id: String(baseRow.id ?? normalized.key),
    product: baseRow.product || normalized.product,
    brand: baseRow.brand || normalized.brand,
    description: baseRow.description ?? normalized.description,
    units: baseRow.units || normalized.units,
    quantity,
    quantityByFloor,
    vendorRate: normalized.rate,
    purchaseRate: normalized.rate,
    lineValue: normalized.amount,
    discPercent: normalized.discPercent,
    discValue: normalized.discValue,
    remarks: normalized.remarks === '—' ? '' : normalized.remarks,
    gstAmount: normalized.gstAmount,
  };
}

function LineItemsStep({ items }) {
  const columnConfigHook = useProjectProcurementRaisePoLineItemsColumnConfig();
  const [search, setSearch] = useState('');
  const [allDescriptionsExpanded, setAllDescriptionsExpanded] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState(() => new Set());

  const products = useMemo(
    () => (Array.isArray(items) ? items.map(mapRaisePoItemToProductRow) : []),
    [items],
  );

  const normalizedById = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(items)) return map;
    items.forEach((item, index) => {
      const row = mapRaisePoItemToProductRow(item, index);
      map.set(String(row.id), normalizeRaisePoLineItem(item, index));
    });
    return map;
  }, [items]);

  useEffect(() => {
    setSelectedProductIds(new Set(products.map((product) => String(product.id))));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => {
      const haystack = [
        product.product,
        product.brand,
        product.description,
        product.units,
        product.remarks,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [products, search]);

  const selectedRows = useMemo(
    () =>
      filteredProducts
        .filter((product) => selectedProductIds.has(String(product.id)))
        .map((product) => normalizedById.get(String(product.id)))
        .filter(Boolean),
    [filteredProducts, normalizedById, selectedProductIds],
  );

  const totalActualAmt = useMemo(
    () => selectedRows.reduce((sum, row) => sum + Math.max(0, row.amount - row.discValue), 0),
    [selectedRows],
  );

  const totalGstAmt = useMemo(
    () => selectedRows.reduce((sum, row) => sum + row.gstAmount, 0),
    [selectedRows],
  );

  const totalValue = totalActualAmt + totalGstAmt;

  const totalDiscValue = useMemo(
    () => selectedRows.reduce((sum, row) => sum + row.discValue, 0),
    [selectedRows],
  );

  const valueBreakdownItems = useMemo(
    () => [
      {
        label: 'Actual Amt.',
        value: formatBoqCompactRupeeAmount(totalActualAmt),
      },
      {
        label: 'GST',
        value: formatBoqCompactRupeeAmount(totalGstAmt),
      },
    ],
    [totalActualAmt, totalGstAmt],
  );

  const itemCountLabel = `${products.length} ${products.length === 1 ? 'Item' : 'Items'}`;

  const handleSelectedProductIdsChange = useCallback((nextIds) => {
    setSelectedProductIds(new Set([...nextIds].map(String)));
  }, []);

  return (
    <div className='flex flex-col gap-4 pb-6'>
      <div className='flex items-center gap-2'>
        <p className='text-label-sm font-medium tracking-[-0.084px] text-text-main-900'>
          Line Items
        </p>
        <p className='text-[12px] font-medium leading-[18px] text-text-soft-400'>
          {itemCountLabel}
        </p>
      </div>

      <ProjectBoqProductsToolbar
        searchValue={search}
        onSearchChange={setSearch}
        showNewProduct={false}
        showPreview={false}
        showVersionStatus={false}
        showViewMode={false}
        columnConfig={columnConfigHook}
        allDescriptionsExpanded={allDescriptionsExpanded}
        onAllDescriptionsExpandedChange={setAllDescriptionsExpanded}
      />

      {products.length === 0 ? (
        <BoqListEmptyState
          embedded
          title='No line items selected'
          description='Select items from the package to include in this purchase order.'
        />
      ) : filteredProducts.length === 0 ? (
        <BoqListEmptyState
          embedded
          title='No products found'
          description='Try adjusting your search.'
        />
      ) : (
        <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
          <div className='max-h-[420px] overflow-auto [&>div>div]:rounded-none [&>div>div]:border-0'>
            <BoqTemplateProductsTable
              products={filteredProducts}
              columnConfig={columnConfigHook.columns}
              allDescriptionsExpanded={allDescriptionsExpanded}
              onAllDescriptionsExpandedChange={setAllDescriptionsExpanded}
              readOnly
              disableEdit
              enableRowSelection
              selectedProductIds={selectedProductIds}
              onSelectedProductIdsChange={handleSelectedProductIdsChange}
              hideSelectionBar
              columnConfigSource={BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.RAISE_PO_LINE_ITEMS}
            />
          </div>
          <div className='border-t border-stroke-soft-200 bg-[#fbfbfb] px-3 py-3'>
            <div className='flex items-center justify-between gap-3'>
              <span className='text-[14px] font-bold uppercase leading-5 tracking-[0.84px] text-text-sub-500'>
                TOTAL
              </span>
              <div className='flex items-center justify-end gap-1.5'>
                <LineItemsTotalChip
                  label='Value'
                  value={formatBoqCompactRupeeAmount(totalValue)}
                  showInfo
                  breakdownItems={valueBreakdownItems}
                />
                <LineItemsTotalChip
                  label='Disc. Value'
                  value={totalDiscValue === 0 ? '0' : formatBoqCompactRupeeAmount(totalDiscValue)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentMilestonesPreview({ milestones = [] }) {
  if (milestones.length === 0) {
    return (
      <p className='rounded-xl border border-dashed border-stroke-soft-200 px-3 py-4 text-center text-paragraph-sm text-text-soft-400'>
        No milestones on this template.
      </p>
    );
  }

  return (
    <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
      <table className='w-full border-collapse text-left'>
        <thead>
          <tr className='border-b border-stroke-soft-200 bg-bg-weak-50'>
            <th className='px-3 py-2.5 text-label-sm font-medium text-text-soft-400'>Milestone</th>
            <th className='px-3 py-2.5 text-label-sm font-medium text-text-soft-400'>Percentage</th>
            <th className='px-3 py-2.5 text-label-sm font-medium text-text-soft-400'>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {milestones.map((milestone, index) => (
            <tr
              key={milestone.id ?? `${milestone.name}-${index}`}
              className='border-b border-stroke-soft-200 last:border-b-0'
            >
              <td className='px-3 py-2.5 text-label-sm text-text-main-900'>
                {milestone.name || '—'}
              </td>
              <td className='px-3 py-2.5 text-label-sm text-text-sub-500'>
                {milestone.percentage !== '' && milestone.percentage != null
                  ? `${milestone.percentage}%`
                  : '—'}
              </td>
              <td className='px-3 py-2.5 text-paragraph-sm text-text-sub-500'>
                {milestone.remarks || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ScopeCategoryAccordion = memo(
  ({ category, selection, isExpanded, onToggle, onSelectTemplate }) => {
    const templateOptions = useMemo(
      () =>
        (category.templates ?? []).map((template) => ({
          value: template.id,
          label: template.name || template.id,
        })),
      [category.templates],
    );

    const contentText = String(selection?.content ?? '').trim();
    const milestones = Array.isArray(selection?.milestones) ? selection.milestones : [];
    const hasTemplate = Boolean(selection?.templateId);

    return (
      <div
        className={cn(
          'overflow-hidden rounded-[10px] border border-stroke-soft-200 bg-[#fbfbfb]',
          'shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]',
        )}
      >
        {/* Figma 34750:92256 collapsed / 34750:93805 expanded header */}
        <div className='flex h-11 items-center justify-between gap-2'>
          <button
            type='button'
            onClick={onToggle}
            aria-expanded={isExpanded}
            className='flex h-12 min-w-0 flex-1 items-center gap-2 py-3 pl-2.5 pr-5 text-left'
          >
            <RiArrowDownSLine
              className={cn(
                'size-5 shrink-0 text-text-sub-500 transition-transform duration-200',
                !isExpanded && '-rotate-90',
              )}
              aria-hidden
            />
            <span className='min-w-0 truncate text-label-sm font-medium text-text-sub-500'>
              {category.label}
            </span>
          </button>
          <div
            className='flex shrink-0 items-center justify-end p-3'
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <FormSelect
              compact
              value={selection?.templateId ?? ''}
              options={templateOptions}
              onChange={(templateId) => onSelectTemplate(category, templateId)}
              placeholder='Select'
              emptyLabel={templateOptions.length === 0 ? 'No templates' : 'No options found'}
              disabled={templateOptions.length === 0}
            />
          </div>
        </div>

        {isExpanded ? (
          <div className='flex flex-col gap-4 border-t border-stroke-soft-200 bg-bg-white-0 p-4'>
            {/* Figma 34750:93805 — read-only template content (view only, no edit/delete) */}
            {contentText ? (
              <p className='whitespace-pre-wrap text-label-sm font-medium leading-5 text-text-sub-500'>
                {contentText}
              </p>
            ) : (
              <p className='text-paragraph-sm text-text-soft-400'>
                {hasTemplate
                  ? 'This template has no content.'
                  : 'Select a template to view its terms.'}
              </p>
            )}

            {category.is_payment_terms && hasTemplate ? (
              <PaymentMilestonesPreview milestones={milestones} />
            ) : null}
          </div>
        ) : null}
      </div>
    );
  },
);
ScopeCategoryAccordion.displayName = 'ScopeCategoryAccordion';

function ScopeCommercialTermsStep({
  categories,
  isLoading,
  loadError,
  onRetry,
  selections,
  expandedCategoryId,
  onToggleCategory,
  onSelectTemplate,
}) {
  return (
    <div className='flex flex-col gap-5 pb-6'>
      <SectionHeading
        title='Scope & Commercial Terms'
        description='Set scope & commercial terms for this purchase order.'
      />

      {isLoading ? (
        <p className='py-8 text-center text-paragraph-sm text-text-soft-400'>
          Loading scope &amp; commercial terms…
        </p>
      ) : (
        <div className='flex flex-col gap-2'>
          {loadError ? (
            <div className='mb-1 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2'>
              <p className='min-w-0 flex-1 text-paragraph-xs text-error-base'>{loadError}</p>
              <button
                type='button'
                onClick={onRetry}
                className='shrink-0 text-label-sm font-medium text-text-sub-500 underline hover:text-text-main-900'
              >
                Retry
              </button>
            </div>
          ) : null}
          {categories.map((category) => (
            <ScopeCategoryAccordion
              key={category.id}
              category={category}
              selection={selections[category.id] ?? emptyScopeSelection()}
              isExpanded={expandedCategoryId === category.id}
              onToggle={() => onToggleCategory(category.id)}
              onSelectTemplate={onSelectTemplate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const PdfPreviewPanel = memo(
  ({ fileName = 'PO-2026-DRAFT.pdf', pageCount = 0, src = DUMMY_PO_PREVIEW_PDF_URL }) => {
    const [zoom, setZoom] = useState(100);
    const zoomScale = zoom / 100;
    const embedSrc = useMemo(() => buildPoPreviewEmbedUrl(src), [src]);

    const handleDownload = useCallback(() => {
      if (!src) return;

      const anchor = Object.assign(document.createElement('a'), {
        href: src,
        download: fileName || 'purchase-order.pdf',
        target: '_blank',
        rel: 'noreferrer',
      });
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }, [fileName, src]);

    return (
      <div className='flex h-full min-w-0 w-1/2 flex-col'>
        <div className='flex shrink-0 items-center justify-between border-b border-stroke-soft-200 px-4 py-3'>
          <div className='flex min-w-0 items-center gap-1.5'>
            <RiFilePdf2Line className='size-6 shrink-0 text-error-base' aria-hidden />
            <span className='truncate text-label-sm text-text-sub-500'>{fileName}</span>
            {pageCount ? (
              <span className='shrink-0 text-paragraph-sm text-text-soft-400'>
                {pageCount} {pageCount === 1 ? 'Page' : 'Pages'}
              </span>
            ) : null}
          </div>
          <div className='flex shrink-0 items-center gap-2'>
            <CompactButton.Root
              variant='stroke'
              size='medium'
              onClick={() => setZoom((current) => Math.max(25, current - 10))}
              aria-label='Zoom out'
            >
              <CompactButton.Icon as={RiZoomOutLine} />
            </CompactButton.Root>
            <span className='text-label-xs font-semibold uppercase tracking-[0.48px] text-text-soft-400'>
              {zoom}%
            </span>
            <CompactButton.Root
              variant='stroke'
              size='medium'
              onClick={() => setZoom((current) => Math.min(200, current + 10))}
              aria-label='Zoom in'
            >
              <CompactButton.Icon as={RiZoomInLine} />
            </CompactButton.Root>
            <span className='h-5 w-px bg-stroke-soft-200' aria-hidden />
            <CompactButton.Root
              variant='stroke'
              size='medium'
              aria-label='Download PDF'
              onClick={handleDownload}
              disabled={!src}
            >
              <CompactButton.Icon as={RiDownloadLine} />
            </CompactButton.Root>
          </div>
        </div>
        <div className='flex min-h-0 flex-1 overflow-auto bg-bg-weak-100'>
          {embedSrc ? (
            <div
              className='mx-auto min-h-full w-full origin-top'
              style={{
                transform: `scale(${zoomScale})`,
                width: `${100 / zoomScale}%`,
                minHeight: `${100 / zoomScale}%`,
              }}
            >
              <iframe
                src={embedSrc}
                title={fileName}
                className='h-full min-h-[720px] w-full border-0 bg-white'
              />
            </div>
          ) : (
            <div className='flex flex-1 items-center justify-center'>
              <p className='text-paragraph-sm text-text-soft-400'>PO preview will appear here.</p>
            </div>
          )}
        </div>
      </div>
    );
  },
);
PdfPreviewPanel.displayName = 'PdfPreviewPanel';

/** Primary green CTA — Figma Modal Footer `34750:93917` (`#079455`, p-2, rounded-lg). */
const GreenButton = memo(({ children, disabled, onClick, type = 'button' }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1 overflow-hidden rounded-lg p-2',
        'bg-[#079455] text-label-sm font-medium tracking-[-0.084px] text-text-white-0',
        'shadow-[0px_1px_2px_0px_rgba(55,93,251,0.08)] transition-colors hover:bg-[#068049]',
        'disabled:pointer-events-none disabled:opacity-50',
      )}
    >
      <span className='px-1'>{children}</span>
    </button>
  );
});
GreenButton.displayName = 'GreenButton';

const ProjectProcurementRaisePoDrawer = memo(
  ({
    open = false,
    onOpenChange,
    packageData,
    selectedItems = [],
    comparisonCategories = [],
    comparisonSelectedItemIds,
    itemCount: itemCountProp,
    projectName,
    defaultVendorId = '',
    onSubmit,
    onDraftSaved,
  }) => {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState(EMPTY_FORM);
    const [vendors, setVendors] = useState([]);
    const [isLoadingVendors, setIsLoadingVendors] = useState(false);
    const [vendorsError, setVendorsError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [scopeCategories, setScopeCategories] = useState([]);
    const [poTypeOptions, setPoTypeOptions] = useState(FALLBACK_PO_TYPE_OPTIONS);
    const [isLoadingPoTypes, setIsLoadingPoTypes] = useState(false);
    const [poTypesError, setPoTypesError] = useState(null);
    const [isLoadingScopeTerms, setIsLoadingScopeTerms] = useState(false);
    const [scopeTermsError, setScopeTermsError] = useState(null);
    const [expandedScopeCategoryId, setExpandedScopeCategoryId] = useState('');
    const [scopeTermsReloadKey, setScopeTermsReloadKey] = useState(0);
    const [packageComparisonCategories, setPackageComparisonCategories] = useState([]);
    const [directPoVendorRates, setDirectPoVendorRates] = useState({});

    const isDirectPo = Boolean(
      packageData?.isDirectPo || (!packageData?.name && selectedItems.length > 0),
    );
    const purchaseBoqName = packageData?.purchaseBoqName ?? packageData?.purchase_boq ?? '';

    // Reset transient state whenever the drawer closes; seed defaults on open.
    useEffect(() => {
      if (!open) {
        setStep(1);
        setForm(EMPTY_FORM);
        setVendorsError(null);
        setIsSubmitting(false);
        setIsSavingDraft(false);
        setScopeCategories([]);
        setPoTypeOptions(FALLBACK_PO_TYPE_OPTIONS);
        setPoTypesError(null);
        setIsLoadingPoTypes(false);
        setScopeTermsError(null);
        setIsLoadingScopeTerms(false);
        setExpandedScopeCategoryId('');
        setPackageComparisonCategories([]);
        setDirectPoVendorRates({});
        return;
      }
      setForm({
        ...EMPTY_FORM,
        vendorId: defaultVendorId || '',
      });
    }, [open, defaultVendorId, packageData?.categories, packageData?.category]);

    // Load active vendors once the drawer is opened.
    useEffect(() => {
      if (!open) return undefined;
      let cancelled = false;
      setIsLoadingVendors(true);
      setVendorsError(null);
      fetchActiveVendors()
        .then((result) => {
          if (cancelled) return;
          setVendors(Array.isArray(result) ? result : []);
        })
        .catch((error) => {
          if (cancelled) return;
          setVendors([]);
          setVendorsError(error?.message || 'Failed to load vendors.');
        })
        .finally(() => {
          if (cancelled) return;
          setIsLoadingVendors(false);
        });
      return () => {
        cancelled = true;
      };
    }, [open]);

    // Load vendor comparison rates for quote-based line item pricing (package items flow).
    useEffect(() => {
      if (!open || !packageData?.name || comparisonCategories.length > 0) return undefined;

      let cancelled = false;
      getPackageVendorComparison(packageData.name)
        .then((result) => {
          if (cancelled) return;
          setPackageComparisonCategories(
            Array.isArray(result?.categories) ? result.categories : [],
          );
        })
        .catch(() => {
          if (!cancelled) setPackageComparisonCategories([]);
        });

      return () => {
        cancelled = true;
      };
    }, [open, packageData?.name, comparisonCategories.length]);

    // Load submitted vendor quotation rates for direct PO line items.
    useEffect(() => {
      if (!open || !isDirectPo || !purchaseBoqName || !form.vendorId) {
        setDirectPoVendorRates({});
        return undefined;
      }

      let cancelled = false;
      getPurchaseBoqVendorQuoteRates(purchaseBoqName, form.vendorId)
        .then((result) => {
          if (cancelled) return;
          setDirectPoVendorRates(result?.rates ?? {});
        })
        .catch((error) => {
          if (cancelled) return;
          setDirectPoVendorRates({});
          showErrorToast(error, {
            defaultMessage: 'Failed to load vendor quotation rates for the selected items.',
          });
        });

      return () => {
        cancelled = true;
      };
    }, [form.vendorId, isDirectPo, open, purchaseBoqName]);

    // Load PO type options when the drawer opens.
    useEffect(() => {
      if (!open) return undefined;
      let cancelled = false;
      setIsLoadingPoTypes(true);
      setPoTypesError(null);
      fetchPoTypeOptions()
        .then((options) => {
          if (cancelled) return;
          setPoTypeOptions(options.length > 0 ? options : FALLBACK_PO_TYPE_OPTIONS);
        })
        .catch((error) => {
          if (cancelled) return;
          setPoTypeOptions(FALLBACK_PO_TYPE_OPTIONS);
          setPoTypesError(extractErrorMessage(error, 'Failed to load PO types.'));
        })
        .finally(() => {
          if (cancelled) return;
          setIsLoadingPoTypes(false);
        });
      return () => {
        cancelled = true;
      };
    }, [open]);

    // Load scope & commercial term categories when reaching step 3 (or on retry).
    useEffect(() => {
      if (!open || step !== 3) return undefined;
      let cancelled = false;
      setIsLoadingScopeTerms(true);
      setScopeTermsError(null);
      fetchPoScopeTerms()
        .then((result) => {
          if (cancelled) return;
          const next =
            Array.isArray(result?.categories) && result.categories.length > 0
              ? result.categories
              : FALLBACK_SCOPE_CATEGORIES;
          setScopeCategories(next);
          setExpandedScopeCategoryId((previous) => {
            if (previous && next.some((category) => category.id === previous)) {
              return previous;
            }
            return '';
          });
        })
        .catch((error) => {
          if (cancelled) return;
          setScopeCategories(FALLBACK_SCOPE_CATEGORIES);
          setScopeTermsError(
            extractErrorMessage(error, 'Failed to load scope & commercial terms.'),
          );
        })
        .finally(() => {
          if (cancelled) return;
          setIsLoadingScopeTerms(false);
        });
      return () => {
        cancelled = true;
      };
    }, [open, step, scopeTermsReloadKey]);

    const handleRetryScopeTerms = useCallback(() => {
      setScopeTermsReloadKey((current) => current + 1);
    }, []);

    const handleToggleScopeCategory = useCallback((categoryId) => {
      setExpandedScopeCategoryId((previous) => (previous === categoryId ? '' : categoryId));
    }, []);

    const handleSelectScopeTemplate = useCallback((category, templateId) => {
      const template = (category.templates ?? []).find((item) => item.id === templateId) ?? null;
      setForm((previous) => ({
        ...previous,
        scopeSelections: {
          ...previous.scopeSelections,
          [category.id]: {
            templateId: templateId ?? '',
            content: toPlainTextContent(template?.content ?? ''),
            milestones: Array.isArray(template?.milestones)
              ? template.milestones.map((milestone, index) => ({
                  id: milestone.id ?? `${category.id}-${index}`,
                  name: milestone.name ?? '',
                  percentage: milestone.percentage ?? '',
                  remarks: milestone.remarks ?? '',
                }))
              : [],
          },
        },
      }));
      setExpandedScopeCategoryId(category.id);
    }, []);

    const vendorOptions = useMemo(() => {
      const seen = new Set();
      return vendors.filter((option) => {
        if (!option?.value || seen.has(option.value)) return false;
        seen.add(option.value);
        return true;
      });
    }, [vendors]);

    const handleFormChange = useCallback((patch) => {
      setForm((previous) => ({ ...previous, ...patch }));
    }, []);

    const quoteCategorySource = useMemo(
      () => (comparisonCategories.length > 0 ? comparisonCategories : packageComparisonCategories),
      [comparisonCategories, packageComparisonCategories],
    );

    const baseLineItems = useMemo(() => {
      const packageItems = Array.isArray(packageData?.items) ? packageData.items : [];
      let items;
      if (selectedItems.length > 0) {
        items = selectedItems.filter((item) => !isRaisePoLineAlreadyPoRaised(item));
      } else if (comparisonSelectedItemIds instanceof Set && comparisonSelectedItemIds.size > 0) {
        items = buildVendorComparisonSelectedItems(
          comparisonCategories,
          comparisonSelectedItemIds,
          form.vendorId,
        );
      } else if (comparisonCategories.length > 0) {
        items = buildVendorComparisonPendingItems(comparisonCategories, form.vendorId);
      } else {
        items = filterRaisePoPendingPackageItems(packageItems);
      }
      return enrichRaisePoLineItemsWithPackageTaxonomy(items, packageItems);
    }, [
      comparisonCategories,
      comparisonSelectedItemIds,
      form.vendorId,
      packageData?.items,
      selectedItems,
    ]);

    const resolvedLineItems = useMemo(() => {
      const withPackageQuotes = applyVendorQuoteRatesToItems(
        baseLineItems,
        quoteCategorySource,
        form.vendorId,
      );
      if (!isDirectPo || !form.vendorId) return withPackageQuotes;
      return applyPurchaseBoqVendorQuoteRatesToItems(withPackageQuotes, directPoVendorRates);
    }, [baseLineItems, directPoVendorRates, form.vendorId, isDirectPo, quoteCategorySource]);

    const packageCategories = useMemo(
      () => parsePackageCategories(packageData?.categories ?? packageData?.category),
      [packageData?.categories, packageData?.category],
    );

    useEffect(() => {
      if (!open) return;
      const defaults = resolveDefaultRaisePoCategoryValues(resolvedLineItems, packageCategories);
      if (!isCategorySelectionStarted(defaults)) return;
      setForm((previous) => {
        if (isCategorySelectionStarted(previous.categoryValues)) return previous;
        return { ...previous, categoryValues: defaults };
      });
    }, [open, packageCategories, resolvedLineItems]);

    const itemCount =
      itemCountProp ??
      (resolvedLineItems.length > 0
        ? resolvedLineItems.length
        : Array.isArray(packageData?.items)
          ? packageData.items.length
          : 0);

    const headerCategoryLabel =
      String(form.categoryValues?.productType ?? '').trim() ||
      String(form.categoryValues?.productGroup ?? '').trim();

    const headerMeta = useMemo(() => {
      const parts = [];
      if (packageData?.code) parts.push(packageData.code);
      const amount = formatProcurementAmount(
        packageData?.packageValue ?? packageData?.package_value,
      );
      if (amount) parts.push(amount);
      parts.push(`${itemCount} ${itemCount === 1 ? 'Item' : 'Items'}`);
      return parts;
    }, [itemCount, packageData?.code, packageData?.packageValue, packageData?.package_value]);

    const isLastStep = step === WIZARD_STEPS.length;
    // Per the design only PO Type is required to advance from step 1.
    const canProceed = step === 1 ? Boolean(form.poType) : true;

    const handleNext = useCallback(() => {
      if (!isLastStep) {
        setStep((current) => Math.min(WIZARD_STEPS.length, current + 1));
      }
    }, [isLastStep]);

    const handleBack = useCallback(() => {
      setStep((current) => Math.max(1, current - 1));
    }, []);

    const handleSaveDraft = useCallback(async () => {
      if (isSavingDraft || isSubmitting) return;

      const packageName = packageData?.name ?? '';
      if (!isDirectPo && !packageName) {
        showErrorToast(new Error('Package is missing.'));
        return;
      }
      if (isDirectPo && !purchaseBoqName) {
        showErrorToast(new Error('Purchase BOQ is missing.'));
        return;
      }
      if (!form.vendorId) {
        showErrorToast(new Error('Select a vendor before saving the Purchase Order draft.'));
        return;
      }
      if (!String(form.categoryValues?.productType ?? '').trim()) {
        showErrorToast(new Error('Select a product type before saving the Purchase Order.'));
        return;
      }
      const directPoQuoteError = isDirectPo
        ? getDirectPoVendorQuoteValidationError(resolvedLineItems, directPoVendorRates)
        : null;
      if (directPoQuoteError) {
        showErrorToast(new Error(directPoQuoteError));
        return;
      }

      const payload = buildRaisePoPayload({
        form,
        packageName,
        purchaseBoqName,
        isDirectPo,
        packageCategories,
        selectedItems: resolvedLineItems,
        comparisonCategories,
        comparisonSelectedItemIds,
        scopeCategories,
      });

      setIsSavingDraft(true);
      try {
        const result = await createDraftProcurementPurchaseOrder(payload);
        showSuccessToast(result?.message || `Draft Purchase Order ${result?.name || ''} saved.`);
        await onDraftSaved?.(result);
        onOpenChange?.(false);
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to save Purchase Order draft.' });
      } finally {
        setIsSavingDraft(false);
      }
    }, [
      comparisonCategories,
      comparisonSelectedItemIds,
      directPoVendorRates,
      form,
      isDirectPo,
      isSavingDraft,
      isSubmitting,
      onDraftSaved,
      onOpenChange,
      packageCategories,
      packageData?.name,
      purchaseBoqName,
      resolvedLineItems,
      scopeCategories,
    ]);

    const handleSubmit = useCallback(async () => {
      if (isSubmitting || isSavingDraft) return;

      const packageName = packageData?.name ?? '';
      if (!isDirectPo && !packageName) {
        showErrorToast(new Error('Package is missing.'));
        return;
      }
      if (isDirectPo && !purchaseBoqName) {
        showErrorToast(new Error('Purchase BOQ is missing.'));
        return;
      }
      if (!form.vendorId) {
        showErrorToast(new Error('Select a vendor before sending the Purchase Order.'));
        return;
      }
      if (!form.poType) {
        showErrorToast(new Error('Select a PO Type before sending the Purchase Order.'));
        return;
      }
      if (!String(form.categoryValues?.productType ?? '').trim()) {
        showErrorToast(new Error('Select a product type before sending the Purchase Order.'));
        return;
      }
      if (resolvedLineItems.length === 0) {
        showErrorToast(
          new Error('Select at least one line item before sending the Purchase Order.'),
        );
        return;
      }
      const directPoQuoteError = isDirectPo
        ? getDirectPoVendorQuoteValidationError(resolvedLineItems, directPoVendorRates)
        : null;
      if (directPoQuoteError) {
        showErrorToast(new Error(directPoQuoteError));
        return;
      }

      const payload = buildRaisePoPayload({
        form,
        packageName,
        purchaseBoqName,
        isDirectPo,
        packageCategories,
        selectedItems: resolvedLineItems,
        comparisonCategories,
        comparisonSelectedItemIds,
        scopeCategories,
      });

      setIsSubmitting(true);
      try {
        if (onSubmit) {
          await onSubmit({ ...payload, is_submit: 1 });
        } else {
          const result = await createDraftProcurementPurchaseOrder(payload, { submit: true });
          showSuccessToast(result?.message || `Purchase Order ${result?.name || ''} sent.`);
          await onDraftSaved?.(result);
        }
        onOpenChange?.(false);
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to send Purchase Order.' });
      } finally {
        setIsSubmitting(false);
      }
    }, [
      comparisonCategories,
      comparisonSelectedItemIds,
      directPoVendorRates,
      form,
      isDirectPo,
      isSavingDraft,
      isSubmitting,
      onDraftSaved,
      onOpenChange,
      onSubmit,
      packageCategories,
      packageData?.name,
      purchaseBoqName,
      resolvedLineItems,
      scopeCategories,
    ]);

    return (
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <Drawer.Content title='Create Purchase Order' className='max-w-none w-full overflow-hidden'>
          {/* Header */}
          <div className='relative flex shrink-0 items-center gap-4 border-b border-stroke-soft-200 px-6 py-[18px]'>
            <div className='flex min-w-0 flex-1 flex-col gap-1'>
              <p className='truncate text-label-lg font-medium tracking-[-0.27px] text-text-main-900'>
                Create Purchase Order
              </p>
              <div className='flex flex-wrap items-center gap-2'>
                {headerMeta.map((part, index) => (
                  <React.Fragment key={part}>
                    {index > 0 ? (
                      <span className='size-1 shrink-0 rounded-full bg-icon-soft-400' aria-hidden />
                    ) : null}
                    <span className='text-label-sm font-medium uppercase tracking-[0.84px] text-text-sub-500 opacity-70'>
                      {part}
                    </span>
                  </React.Fragment>
                ))}
                {headerCategoryLabel ? (
                  <>
                    <span className='size-1 shrink-0 rounded-full bg-icon-soft-400' aria-hidden />
                    <span className='inline-flex items-center rounded-md border border-[#d0d5dd] bg-bg-white-0 px-2 py-[3px] text-[12px] font-medium text-[#344054] shadow-[0px_1px_1px_0px_rgba(228,229,231,0.24)]'>
                      {headerCategoryLabel}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
            <Drawer.Close asChild>
              <CompactButton.Root
                variant='ghost'
                size='medium'
                className='absolute right-4 top-4'
                aria-label='Close create purchase order'
              >
                <CompactButton.Icon as={RiCloseLine} />
              </CompactButton.Root>
            </Drawer.Close>
          </div>

          {/* Body: form (left) + PDF preview (right) — 50/50 split */}
          <div className='flex min-h-0 flex-1'>
            <div className='flex h-full min-w-0 w-1/2 flex-col border-r border-stroke-soft-200'>
              {/* Stepper */}
              <div className='flex h-12 shrink-0 items-center overflow-x-auto border-b border-stroke-soft-200 bg-[rgba(246,248,250,0.6)] px-6'>
                <StepIndicator currentStep={step} />
              </div>

              {/* Step content */}
              <div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
                {step === 1 ? (
                  <ProjectDetailsStep
                    form={form}
                    onChange={handleFormChange}
                    projectName={projectName}
                    vendorOptions={vendorOptions}
                    isLoadingVendors={isLoadingVendors}
                    vendorsError={vendorsError}
                    poTypeOptions={poTypeOptions}
                    isLoadingPoTypes={isLoadingPoTypes}
                    poTypesError={poTypesError}
                  />
                ) : step === 2 ? (
                  <LineItemsStep items={resolvedLineItems} />
                ) : (
                  <ScopeCommercialTermsStep
                    categories={scopeCategories}
                    isLoading={isLoadingScopeTerms}
                    loadError={scopeTermsError}
                    onRetry={handleRetryScopeTerms}
                    selections={form.scopeSelections}
                    expandedCategoryId={expandedScopeCategoryId}
                    onToggleCategory={handleToggleScopeCategory}
                    onSelectTemplate={handleSelectScopeTemplate}
                  />
                )}
              </div>

              {/* Footer — step 1: 34750:93917 · step 2: 34750:90862 · step 3: 34750:91768 (Send PO) */}
              <div className='flex shrink-0 items-center justify-center border-t border-stroke-soft-200 bg-bg-white-0 px-6 py-5'>
                <div className='flex min-w-0 flex-1 items-center justify-between'>
                  <button
                    type='button'
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft || isSubmitting || !form.vendorId}
                    className='shrink-0 text-label-sm font-medium tracking-[-0.084px] text-text-sub-500 underline decoration-solid transition-colors hover:text-text-main-900 disabled:pointer-events-none disabled:opacity-50'
                  >
                    {isSavingDraft ? 'Saving draft…' : 'Save a Draft'}
                  </button>
                  <div className='flex shrink-0 items-center gap-3'>
                    {step > 1 ? (
                      <button
                        type='button'
                        onClick={handleBack}
                        className='inline-flex items-center justify-center gap-1 overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-2 text-label-sm font-medium tracking-[-0.084px] text-text-sub-500 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)] transition-colors hover:bg-bg-weak-50'
                      >
                        <span className='px-1'>Previous</span>
                      </button>
                    ) : null}
                    {isLastStep ? (
                      <GreenButton
                        onClick={handleSubmit}
                        disabled={!canProceed || isSubmitting || isSavingDraft}
                      >
                        {isSubmitting ? 'Sending…' : 'Send PO'}
                      </GreenButton>
                    ) : (
                      <GreenButton onClick={handleNext} disabled={!canProceed}>
                        Next
                      </GreenButton>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <PdfPreviewPanel fileName='PO-2026-DRAFT.pdf' pageCount={0} />
          </div>
        </Drawer.Content>
      </Drawer.Root>
    );
  },
);

ProjectProcurementRaisePoDrawer.displayName = 'ProjectProcurementRaisePoDrawer';

export default ProjectProcurementRaisePoDrawer;
