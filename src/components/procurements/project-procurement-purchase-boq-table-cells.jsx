import React, { memo, useCallback, useMemo, useRef } from 'react';
import { RiBox3Line, RiSplitCellsVertical } from 'react-icons/ri';

import { PRODUCT_FORM_FIELDS } from '@/api/productFormOptions';
import {
  formatBoqTableRupeeRate,
  formatBoqTableRupeeValue,
} from '@/components/boq/boq-templates/components/boq-template-product-master-utils';
import { splitBoqTemplateQuantityLabel } from '@/components/boq/boq-templates/components/boq-template-products-utils';
import ProductFormSearchableSelect from '@/components/products/product-form-searchable-select';
import {
  applyMainCategorySelection,
  buildProductTypeOptionId,
  formatProductCategoryPath,
  getProductCategoryDisplayLabel,
  parseProductCategoryPath,
  PRODUCT_CATEGORY_LEVELS,
  resolveProductCategoryPathFromRow,
} from '@/components/products/product-category-utils';
import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
import { normalizePurchaseBoqPackages } from '@/components/procurements/project-procurement-purchase-boq-package-utils';
import { cn } from '@/utils/cn';

const CATEGORY_TAG_CLASS =
  'inline-flex h-8 max-w-full items-center truncate rounded-lg border border-[#eaecf0] bg-white px-2.5 text-label-sm font-medium text-[#344054]';

const resolveHoverTitle = (value) => {
  const text = String(value ?? '').trim();
  if (!text || text === '--' || text === '-') return undefined;
  return text;
};

/** Truncated text with tooltip showing the full value on hover. */
export const PurchaseBoqTruncatedText = memo(
  ({ children, title, className, as: Component = 'span' }) => {
    const resolvedTitle = resolveHoverTitle(
      title ?? (typeof children === 'string' ? children : ''),
    );
    const content = (
      <Component className={cn('min-w-0 max-w-full truncate', className)}>{children}</Component>
    );

    if (!resolvedTitle) return content;

    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{content}</Tooltip.Trigger>
        <Tooltip.Content
          size='xsmall'
          variant='dark'
          side='top'
          className='z-[80] max-w-xs whitespace-normal break-words'
        >
          {resolvedTitle}
        </Tooltip.Content>
      </Tooltip.Root>
    );
  },
);

PurchaseBoqTruncatedText.displayName = 'PurchaseBoqTruncatedText';

const ProductPlaceholderImage = () => (
  <div className='size-8 shrink-0 rounded bg-bg-weak-100' aria-hidden />
);

/** Figma — split icon, top-right corner of product cell. */
export const PurchaseBoqSplitCornerIcon = memo(() => (
  <span
    className='pointer-events-none absolute right-[3px] top-1 z-[1] inline-flex size-5 items-center justify-center rounded border border-stroke-soft-200 bg-bg-white-0 text-text-soft-400'
    title='Split line item'
    aria-hidden
  >
    <RiSplitCellsVertical className='size-3.5' />
  </span>
));

PurchaseBoqSplitCornerIcon.displayName = 'PurchaseBoqSplitCornerIcon';

const PurchaseBoqPackageTooltipContent = memo(({ items = [] }) => (
  <div className={cn('flex flex-col', items.length > 1 && 'gap-2')}>
    {items.map((entry) => {
      const hasDistinctName = entry.name && entry.name !== entry.code;

      return (
        <div key={entry.id} className='whitespace-nowrap'>
          {hasDistinctName ? (
            <>
              <p className='text-paragraph-xs leading-4 text-text-white-0'>{entry.name}</p>
              <p className='text-paragraph-xs leading-4 text-text-white-0/50'>{entry.code}</p>
            </>
          ) : (
            <p className='text-paragraph-xs leading-4 text-text-white-0'>{entry.code}</p>
          )}
        </div>
      );
    })}
  </div>
));

PurchaseBoqPackageTooltipContent.displayName = 'PurchaseBoqPackageTooltipContent';

/** Figma 34512:224754 — package icon, top-right corner of product cell. */
export const PurchaseBoqPackageCornerIcon = memo(({ packages = [], packageCode = '' }) => {
  const items = useMemo(
    () => normalizePurchaseBoqPackages(packages, packageCode),
    [packageCode, packages],
  );

  const iconClassName =
    'absolute right-[3px] top-1 z-[1] inline-flex size-5 items-center justify-center text-text-soft-400';

  if (items.length === 0) {
    return (
      <span className={cn(iconClassName, 'pointer-events-none')} aria-hidden>
        <RiBox3Line className='size-5' />
      </span>
    );
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type='button'
          className={iconClassName}
          data-prevent-row-click
          aria-label={`Package: ${items.map((entry) => entry.name || entry.code).join(', ')}`}
        >
          <RiBox3Line className='size-5' />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content size='xsmall' variant='dark' side='top' className='z-[80]'>
        <PurchaseBoqPackageTooltipContent items={items} />
      </Tooltip.Content>
    </Tooltip.Root>
  );
});

PurchaseBoqPackageCornerIcon.displayName = 'PurchaseBoqPackageCornerIcon';

export const PurchaseBoqPackageItemNameCell = memo(({ product, className }) => (
  <div className={cn('flex min-w-0 flex-1 items-center gap-3', className)}>
    <ProductPlaceholderImage />
    <PurchaseBoqTruncatedText
      title={product}
      className='min-w-0 flex-1 text-label-sm font-medium leading-5 text-[#16201b]'
    >
      {product || '--'}
    </PurchaseBoqTruncatedText>
  </div>
));

PurchaseBoqPackageItemNameCell.displayName = 'PurchaseBoqPackageItemNameCell';

export function splitPurchaseBoqProductName(product = '') {
  const raw = String(product ?? '').trim();
  const openIndex = raw.lastIndexOf(' (');

  if (openIndex <= 0 || !raw.endsWith(')')) {
    return { primary: raw || '--', secondary: '' };
  }

  return {
    primary: raw.slice(0, openIndex),
    secondary: raw.slice(openIndex + 1),
  };
}

export const PurchaseBoqProductNameCell = memo(
  ({ product, isSplitLine = false, isPackaged = false }) => {
    const fullName = String(product ?? '').trim() || '--';
    const hoverTitle = resolveHoverTitle(fullName);

    if (isPackaged && !isSplitLine) {
      return (
        <PurchaseBoqTruncatedText
          title={fullName}
          className='min-w-0 flex-1 text-label-sm font-medium leading-5 text-[#16201b]'
        >
          {fullName}
        </PurchaseBoqTruncatedText>
      );
    }

    const { primary, secondary } = splitPurchaseBoqProductName(product);

    const nameContent = (
      <div className='flex min-w-0 flex-1 items-center'>
        <div className='min-w-0 flex-1 text-label-sm font-medium text-[#16201b]'>
          <p className='mb-0 truncate leading-5'>{primary}</p>
          {secondary ? <p className='mb-0 truncate leading-5'>{secondary}</p> : null}
        </div>
      </div>
    );

    if (!hoverTitle) return nameContent;

    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{nameContent}</Tooltip.Trigger>
        <Tooltip.Content
          size='xsmall'
          variant='dark'
          side='top'
          className='z-[80] max-w-xs whitespace-normal break-words'
        >
          {hoverTitle}
        </Tooltip.Content>
      </Tooltip.Root>
    );
  },
);

PurchaseBoqProductNameCell.displayName = 'PurchaseBoqProductNameCell';

export const PurchaseBoqCategoryTag = memo(({ label }) => {
  const raw = String(label ?? '').trim();
  if (!raw) return <span className='text-label-sm font-medium text-text-sub-500'>--</span>;

  const displayLabel = getProductCategoryDisplayLabel(raw) || raw;

  return (
    <span className={CATEGORY_TAG_CLASS} title={resolveHoverTitle(raw)}>
      {displayLabel}
    </span>
  );
});

PurchaseBoqCategoryTag.displayName = 'PurchaseBoqCategoryTag';

/** Table cell showing 4th-level category with full breadcrumb (Group › Type › Group › Type). */
export const BoqProductCategoryPathCell = memo(({ row = {}, path: pathProp }) => {
  const raw = String(pathProp ?? resolveProductCategoryPathFromRow(row)).trim();
  if (!raw) return <span className='text-label-sm font-medium text-text-sub-500'>--</span>;

  const values = parseProductCategoryPath(raw);
  const breadcrumb = formatProductCategoryPath(values) || raw;
  const parts = breadcrumb
    .split(/\s*>\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  const title =
    values.productType || values.productGroup || values.categoryType || values.categoryGroup || raw;

  return (
    <span className='flex min-w-0 w-full flex-col gap-0.5' title={resolveHoverTitle(breadcrumb)}>
      <span className='truncate text-label-sm font-medium text-text-main-900'>{title}</span>
      {parts.length > 1 ? (
        <span className='truncate text-paragraph-xs text-text-sub-500'>{parts.join(' › ')}</span>
      ) : null}
    </span>
  );
});

BoqProductCategoryPathCell.displayName = 'BoqProductCategoryPathCell';

const resolveCategoryLabelFromOption = (option) => {
  const row = option?.row || {};
  return (
    row.productType ||
    row.productGroup ||
    row.categoryType ||
    row.categoryGroup ||
    option?.value ||
    option?.label ||
    ''
  )
    .toString()
    .trim();
};

const CategoryOptionLabel = ({ title, breadcrumb }) => {
  const parts = String(breadcrumb || '')
    .split('>')
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <span className='flex min-w-0 w-full flex-col gap-0.5 py-0.5'>
      <span className='truncate text-paragraph-sm font-medium text-text-main-900'>{title}</span>
      {parts.length > 0 ? (
        <span className='truncate text-paragraph-xs text-text-sub-500'>{parts.join(' › ')}</span>
      ) : null}
    </span>
  );
};

/**
 * Searchable category dropdown — options are 4th-level (product type) only.
 * Persists the full 4-level path; trigger shows the 4th-level name.
 */
export const PurchaseBoqCategorySelect = memo(
  ({ value = '', onValueChange, placeholder = 'Select category', disabled = false, className }) => {
    const latestOptionsRef = useRef([]);
    const trimmed = String(value ?? '').trim();

    const categoryValues = useMemo(() => parseProductCategoryPath(trimmed), [trimmed]);

    const selectedId = useMemo(
      () => (trimmed ? buildProductTypeOptionId(categoryValues) : ''),
      [categoryValues, trimmed],
    );
    const displayValue = useMemo(
      () => getProductCategoryDisplayLabel(trimmed) || trimmed,
      [trimmed],
    );

    const handleOptionsLoaded = useCallback((options) => {
      latestOptionsRef.current = options;
    }, []);

    const handleChange = useCallback(
      (optionId, pickedOption) => {
        if (!optionId) {
          onValueChange?.('');
          return;
        }
        const picked =
          pickedOption ??
          latestOptionsRef.current.find((opt) => opt.id === optionId) ??
          latestOptionsRef.current.find((opt) => opt.value === optionId);
        if (!picked) return;

        const { values } = applyMainCategorySelection({
          ...picked,
          selectedLevel: PRODUCT_CATEGORY_LEVELS.length - 1,
        });
        const nextPath =
          formatProductCategoryPath(values) || resolveCategoryLabelFromOption(picked);
        onValueChange?.(nextPath);
      },
      [onValueChange],
    );

    return (
      <div className={cn('min-w-0 w-full', className)} data-prevent-row-click>
        <ProductFormSearchableSelect
          field={PRODUCT_FORM_FIELDS.PRODUCT_TYPE}
          value={selectedId}
          onValueChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          getOptionValue={(opt) => opt.id}
          getOptionLabel={(opt) => opt.label}
          renderOptionLabel={(opt) => (
            <CategoryOptionLabel title={opt.title ?? opt.value} breadcrumb={opt.breadcrumb} />
          )}
          renderTriggerValue={({ placeholder: triggerPlaceholder }) => (
            <span className='block min-w-0 max-w-full truncate'>
              {displayValue || triggerPlaceholder}
            </span>
          )}
          onOptionsLoaded={handleOptionsLoaded}
        />
      </div>
    );
  },
);

PurchaseBoqCategorySelect.displayName = 'PurchaseBoqCategorySelect';

export const PurchaseBoqPackageTag = memo(({ packageCode }) => {
  if (!packageCode) return <span className='text-label-sm font-medium text-text-sub-500'>-</span>;

  return (
    <span className={CATEGORY_TAG_CLASS} title={resolveHoverTitle(packageCode)}>
      {packageCode}
    </span>
  );
});

PurchaseBoqPackageTag.displayName = 'PurchaseBoqPackageTag';

export const PurchaseBoqPackageCell = memo(({ packages = [], packageCode = '' }) => {
  const items = useMemo(
    () => normalizePurchaseBoqPackages(packages, packageCode),
    [packageCode, packages],
  );

  if (items.length === 0) {
    return <span className='text-label-sm font-medium text-text-sub-500'>-</span>;
  }

  const primary = items[0];
  const tag = (
    <span className={CATEGORY_TAG_CLASS} title={resolveHoverTitle(primary.code)}>
      {primary.code}
    </span>
  );

  if (items.length === 1) return tag;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button type='button' className='max-w-full text-left' data-prevent-row-click>
          {tag}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content size='xsmall' variant='dark' side='top' className='z-[80]'>
        <PurchaseBoqPackageTooltipContent items={items} />
      </Tooltip.Content>
    </Tooltip.Root>
  );
});

PurchaseBoqPackageCell.displayName = 'PurchaseBoqPackageCell';

export const PurchaseBoqVendorTags = memo(({ vendors = [] }) => {
  const items = Array.isArray(vendors) ? vendors.filter(Boolean) : [];
  if (items.length === 0) {
    return <span className='text-label-sm font-medium text-text-sub-500'>-</span>;
  }

  return (
    <div className='flex min-w-0 flex-wrap items-center gap-1'>
      {items.map((vendor) => {
        const label = typeof vendor === 'string' ? vendor : vendor?.name || vendor?.label || '';
        return (
          <span key={label} className={CATEGORY_TAG_CLASS} title={resolveHoverTitle(label)}>
            {label}
          </span>
        );
      })}
    </div>
  );
});

PurchaseBoqVendorTags.displayName = 'PurchaseBoqVendorTags';

const PURCHASE_BOQ_STATUS_BADGE = {
  'pending-procurement': { label: 'Pending Procurement', color: 'blue' },
  'pending-quote': { label: 'Pending Quote', color: 'blue' },
  'package-pending': { label: 'Package Created', color: 'orange' },
  'rfq-sent': { label: 'RFQ Sent', color: 'purple' },
  'quotation-received': { label: 'Quotation Received', color: 'sky' },
  'vendor-finalized': { label: 'Vendor Finalized', color: 'teal' },
  'po-released': { label: 'PO Released', color: 'green' },
  delivered: { label: 'Delivered', color: 'green' },
};

export const PurchaseBoqStatusBadge = memo(({ status }) => {
  const config = PURCHASE_BOQ_STATUS_BADGE[status] ?? {
    label: String(status || '--'),
    color: 'gray',
  };

  return (
    <Badge.Root
      size='medium'
      variant='light'
      color={config.color}
      className='max-w-full shrink-0 whitespace-nowrap'
      title={resolveHoverTitle(config.label)}
    >
      {config.label}
    </Badge.Root>
  );
});

PurchaseBoqStatusBadge.displayName = 'PurchaseBoqStatusBadge';

export const PurchaseBoqRateCell = memo(({ value }) => {
  const formatted = formatBoqTableRupeeRate(value);
  return (
    <PurchaseBoqTruncatedText
      title={formatted}
      className='block w-full text-right text-label-sm font-medium text-text-main-900'
    >
      {formatted}
    </PurchaseBoqTruncatedText>
  );
});

PurchaseBoqRateCell.displayName = 'PurchaseBoqRateCell';

export const PurchaseBoqValueCell = memo(({ value }) => {
  const formatted = formatBoqTableRupeeValue(value);
  return (
    <PurchaseBoqTruncatedText
      title={formatted}
      className='block w-full text-right text-label-sm font-medium text-text-main-900'
    >
      {formatted}
    </PurchaseBoqTruncatedText>
  );
});

PurchaseBoqValueCell.displayName = 'PurchaseBoqValueCell';

export const PurchaseBoqQuantityPill = memo(({ quantity }) => {
  const { prefix, suffix } = splitBoqTemplateQuantityLabel(quantity);
  const full = `${prefix}${suffix || ''}`;

  return (
    <span
      className='inline-flex h-8 max-w-full items-center justify-center rounded-lg bg-bg-weak-100 px-1.5 py-1.5 text-label-sm font-medium text-text-sub-500'
      title={resolveHoverTitle(full)}
    >
      <span className='truncate px-1'>
        {prefix}
        {suffix ? <span className='font-bold'>{suffix}</span> : null}
      </span>
    </span>
  );
});

PurchaseBoqQuantityPill.displayName = 'PurchaseBoqQuantityPill';

const JOURNEY_PROCUREMENT_STEPS = [
  {
    id: 'package-created',
    label: 'Package Created',
    iconSrc: '/icons/purchase-boq-journey/file-unknown-fill.svg',
  },
  {
    id: 'rfq-sent',
    label: 'RFQ Sent',
    iconSrc: '/icons/purchase-boq-journey/file-text-fill.svg',
  },
  {
    id: 'quotation-received',
    label: 'Quotation Received',
    iconSrc: '/icons/purchase-boq-journey/shake-hands-fill.svg',
  },
  {
    id: 'po-released',
    label: 'PO Released',
    iconSrc: '/icons/purchase-boq-journey/task-fill.svg',
  },
];

/** Figma 34419:193316 — procurement icon track width. */
const JOURNEY_PROCUREMENT_TRACK_WIDTH = 248;
/** Figma 34906:255821 — post-procurement dot track width. */
const JOURNEY_EXECUTION_TRACK_WIDTH = 171;
const JOURNEY_EXECUTION_STEP_COUNT = 6;
const JOURNEY_PROCUREMENT_STEP_COUNT = JOURNEY_PROCUREMENT_STEPS.length;
const JOURNEY_STEP_CENTER_INSET = 12;

/** Completed fixed-step counts derived from procurement status (fallback). */
const JOURNEY_COMPLETED_BY_STATUS = {
  'pending-procurement': 0,
  'package-pending': 1,
  'rfq-sent': 2,
  'quotation-received': 3,
  'vendor-finalized': 3,
  'po-released': 4,
  delivered: 4,
};

/**
 * `journeyActiveStep` is the count of completed procurement steps (0–4).
 * Prefer procurement status (source of truth), then the stored step count.
 */
export const resolvePurchaseBoqJourneyCompletedCount = ({
  journeyActiveStep,
  procurementStatus,
} = {}) => {
  const fromStatus = JOURNEY_COMPLETED_BY_STATUS[procurementStatus];
  if (Number.isFinite(fromStatus)) {
    return fromStatus;
  }
  const fromField = Number(journeyActiveStep);
  if (Number.isFinite(fromField)) {
    return Math.max(0, Math.min(fromField, JOURNEY_PROCUREMENT_STEP_COUNT));
  }
  return 0;
};

const resolveJourneyStepState = (stepIndex, completedCount) => {
  if (stepIndex < completedCount) return 'completed';
  return 'pending';
};

const resolveProcurementProgressPercent = (completedCount) => {
  if (completedCount <= 1) return 0;
  return ((completedCount - 1) / (JOURNEY_PROCUREMENT_STEP_COUNT - 1)) * 100;
};

const JourneyProgressTrack = ({ width, progressPercent, children }) => (
  <div className='relative flex shrink-0 items-center gap-2' style={{ width: `${width}px` }}>
    <span
      className='pointer-events-none absolute top-1/2 h-[2px] -translate-y-1/2 bg-[#d9d9d9]'
      style={{ left: JOURNEY_STEP_CENTER_INSET, right: JOURNEY_STEP_CENTER_INSET }}
      aria-hidden
    />
    {progressPercent > 0 ? (
      <span
        className='pointer-events-none absolute top-1/2 h-[2px] -translate-y-1/2 bg-primary-light transition-[width]'
        style={{
          left: JOURNEY_STEP_CENTER_INSET,
          width: `calc((100% - ${JOURNEY_STEP_CENTER_INSET * 2}px) * ${Math.max(0, Math.min(100, progressPercent)) / 100})`,
        }}
        aria-hidden
      />
    ) : null}
    {children}
  </div>
);

const JourneyPendingDot = () => (
  <span
    className='relative z-[1] inline-flex size-6 shrink-0 items-center justify-center'
    aria-hidden
  >
    <span className='size-3 shrink-0 rounded-full bg-[#e7e8ec]' />
  </span>
);

const JourneyIconStep = ({ step, state }) => {
  const isDone = state === 'completed';

  if (!isDone) {
    return <JourneyPendingDot />;
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span
          className='relative z-[1] inline-flex size-6 shrink-0 items-center justify-center overflow-clip rounded-full bg-primary-light p-[4.5px] shadow-[0px_0.75px_1.5px_0px_rgba(228,229,231,0.24)]'
          aria-label={step.label}
        >
          <img src={step.iconSrc} alt='' className='size-[15px] object-contain' aria-hidden />
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content size='xsmall' side='top'>
        {step.label}
      </Tooltip.Content>
    </Tooltip.Root>
  );
};

/** Post-procurement dots — labels vary by PO type, so no default hover. */
const JourneyDotStep = ({ state }) => {
  const isDone = state === 'completed';

  return (
    <span
      className='relative z-[1] inline-flex size-6 shrink-0 items-center justify-center'
      aria-hidden
    >
      <span
        className={cn('size-3 shrink-0 rounded-full', isDone ? 'bg-primary-light' : 'bg-[#e7e8ec]')}
      />
    </span>
  );
};

export const PurchaseBoqJourneyTracker = memo(
  ({ activeStepIndex, procurementStatus, completedCount: completedCountProp }) => {
    const completedCount =
      completedCountProp != null
        ? Math.max(0, Math.min(Number(completedCountProp) || 0, JOURNEY_PROCUREMENT_STEP_COUNT))
        : resolvePurchaseBoqJourneyCompletedCount({
            journeyActiveStep: activeStepIndex,
            procurementStatus,
          });

    const procurementProgressPercent = resolveProcurementProgressPercent(completedCount);

    return (
      <div className='flex min-w-[455px] shrink-0 items-center gap-3'>
        <JourneyProgressTrack
          width={JOURNEY_PROCUREMENT_TRACK_WIDTH}
          progressPercent={procurementProgressPercent}
        >
          {JOURNEY_PROCUREMENT_STEPS.map((step, index) => (
            <JourneyIconStep
              key={step.id}
              step={step}
              state={resolveJourneyStepState(index, completedCount)}
            />
          ))}
        </JourneyProgressTrack>

        <span className='h-8 w-px shrink-0 bg-stroke-soft-200' aria-hidden />

        <JourneyProgressTrack width={JOURNEY_EXECUTION_TRACK_WIDTH} progressPercent={0}>
          {Array.from({ length: JOURNEY_EXECUTION_STEP_COUNT }, (_, index) => (
            <JourneyDotStep
              key={`execution-step-${index}`}
              state={resolveJourneyStepState(index, 0)}
            />
          ))}
        </JourneyProgressTrack>
      </div>
    );
  },
);

PurchaseBoqJourneyTracker.displayName = 'PurchaseBoqJourneyTracker';
