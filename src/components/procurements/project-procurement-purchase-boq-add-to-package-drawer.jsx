import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  RiAddLine,
  RiArrowLeftLine,
  RiArrowDownSLine,
  RiBox3Line,
  RiCheckLine,
  RiExpandUpDownFill,
  RiLoader4Line,
  RiSearchLine,
} from 'react-icons/ri';

import { groupBoqTemplateProductsByCategory } from '@/components/boq/boq-templates/components/boq-template-products-utils';
import { PROJECT_BOQ_TYPES } from '@/components/boq/constants';
import ExpandableClampText from '@/components/boq/shared/expandable-clamp-text';
import BoqFinancialSummaryChips from '@/components/boq/shared/boq-financial-summary-chips';
import {
  PurchaseBoqPackageCornerIcon,
  PurchaseBoqProductNameCell,
} from '@/components/procurements/project-procurement-purchase-boq-table-cells';
import { createPurchaseBoqPackageFromInput } from '@/components/procurements/project-procurement-purchase-boq-package-utils';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import * as Drawer from '@/components/ui/drawer';
import { Datepicker } from '@/components/ui/datepicker';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';

const DRAWER_TABLE_GRID =
  'grid items-stretch [grid-template-columns:40px_minmax(220px,249px)_113px_113px_151px_minmax(280px,1fr)]';

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
    <Badge.Root size='small' variant='light' color={config.color}>
      {config.label}
    </Badge.Root>
  );
};

const ProductPlaceholderImage = () => (
  <div className='size-8 shrink-0 rounded bg-bg-weak-100' aria-hidden />
);

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

const HeaderLabel = ({ label }) => (
  <div className='flex items-center gap-0.5'>
    <span className='whitespace-nowrap text-label-sm font-medium text-text-soft-400'>{label}</span>
    <RiExpandUpDownFill className='size-5 shrink-0 text-text-soft-400' aria-hidden />
  </div>
);

function PackageSelectDropdown({
  packages = [],
  value,
  onValueChange,
  isCreating = false,
  createValue = '',
  onCreateValueChange,
  onStartCreate,
  onCancelCreate,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredPackages = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return packages;
    return packages.filter(
      (entry) =>
        entry.code.toLowerCase().includes(query) || entry.name.toLowerCase().includes(query),
    );
  }, [packages, search]);

  const selectedPackage = packages.find((entry) => entry.id === value) ?? null;

  if (isCreating) {
    return (
      <div className='flex items-center gap-2'>
        <button
          type='button'
          onClick={onCancelCreate}
          disabled={disabled}
          className='inline-flex h-10 shrink-0 items-center gap-1 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 text-label-sm font-medium text-text-sub-500 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)] hover:bg-bg-weak-50 disabled:pointer-events-none disabled:opacity-50'
          aria-label='Back to package selection'
        >
          <RiArrowLeftLine className='size-5' aria-hidden />
          <span>Back</span>
        </button>
        <Input.Root className='min-w-0 flex-1'>
          <Input.Wrapper>
            <Input.Input
              value={createValue}
              onChange={(event) => onCreateValueChange?.(event.target.value)}
              placeholder='Enter package name'
              disabled={disabled}
            />
          </Input.Wrapper>
        </Input.Root>
      </div>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type='button'
          disabled={disabled}
          className='flex w-full items-center gap-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 py-2 text-left shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'
        >
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-paragraph-sm',
              selectedPackage ? 'text-text-main-900' : 'text-text-sub-500',
            )}
          >
            {selectedPackage?.name ?? selectedPackage?.code ?? 'Select'}
          </span>
          <RiArrowDownSLine
            className={cn(
              'size-5 shrink-0 text-text-soft-400 transition-transform',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
      </Popover.Trigger>
      <Popover.Content align='start' className='z-[60] w-[var(--radix-popover-trigger-width)] p-0'>
        <div className='border-b border-stroke-soft-200 p-2'>
          <Input.Root>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder='Search here...'
              />
            </Input.Wrapper>
          </Input.Root>
        </div>
        <div className='flex max-h-[220px] flex-col gap-1 overflow-y-auto p-2'>
          {filteredPackages.map((entry) => {
            const isSelected = value === entry.id;
            return (
              <button
                key={entry.id}
                type='button'
                onClick={() => {
                  onValueChange?.(entry.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-label-sm transition-colors',
                  isSelected
                    ? 'bg-bg-weak-100 font-medium text-text-main-900'
                    : 'text-text-main-900 hover:bg-bg-weak-50',
                )}
              >
                <span className='min-w-0 flex-1 truncate'>{entry.name || entry.code}</span>
                {isSelected ? <RiCheckLine className='size-5 shrink-0 text-text-main-900' /> : null}
              </button>
            );
          })}
        </div>
        <div className='border-t border-stroke-soft-200 p-2'>
          <button
            type='button'
            onClick={() => {
              onStartCreate?.();
              setOpen(false);
            }}
            className='flex w-full items-center justify-center gap-0.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 py-1.5 text-label-sm font-medium text-text-sub-500 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)] hover:bg-bg-weak-50'
          >
            <RiAddLine className='size-5' aria-hidden />
            <span>Create New</span>
          </button>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

function AddToPackageSelectedItemsTable({
  products = [],
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  packagePreview = null,
}) {
  const allSelected =
    products.length > 0 && products.every((product) => selectedIds.has(product.id));
  const someSelected = products.some((product) => selectedIds.has(product.id)) && !allSelected;

  return (
    <div className='overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
      <div className='overflow-x-auto'>
        <div className='min-w-[946px]'>
          <div className={cn(DRAWER_TABLE_GRID, 'border-b border-stroke-soft-200 bg-bg-weak-100')}>
            <div className='flex items-center border-r border-black/[0.08] px-3 py-2'>
              <Checkbox.Root
                size='small'
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={onToggleSelectAll}
                aria-label='Select all items'
              />
            </div>
            {['Name', 'BOQ ID', 'BOQ Type', 'Area/ location', 'Description'].map((label, index) => (
              <div
                key={label}
                className={cn(
                  'flex items-center px-3 py-2',
                  index < 4 && 'border-r border-black/[0.08]',
                )}
              >
                <HeaderLabel label={label} />
              </div>
            ))}
          </div>

          {products.map((product, index) => (
            <div
              key={product.id}
              className={cn(
                DRAWER_TABLE_GRID,
                'border-b border-[#ededed] last:border-b-0',
                index % 2 === 1 ? 'bg-[#fbfbfb]' : 'bg-bg-white-0',
              )}
            >
              <div className='flex items-center border-r border-black/[0.07] px-3 py-3'>
                <Checkbox.Root
                  size='small'
                  checked={selectedIds.has(product.id)}
                  onCheckedChange={() => onToggleSelect?.(product.id)}
                  aria-label={`Select ${product.product}`}
                />
              </div>
              <div className='relative flex items-center gap-3 border-r border-black/[0.07] px-3 py-3'>
                {packagePreview ? (
                  <PurchaseBoqPackageCornerIcon packages={[packagePreview]} />
                ) : null}
                <ProductPlaceholderImage />
                <PurchaseBoqProductNameCell
                  product={product.product}
                  isSplitLine={product.isSplitLine}
                />
              </div>
              <div className='flex items-center border-r border-black/[0.07] px-3 py-3'>
                <span className='truncate text-label-sm font-medium text-text-main-900'>
                  {product.boqId || product.sourceProjectBoq || product.itemCode || '--'}
                </span>
              </div>
              <div className='flex items-center border-r border-black/[0.07] px-3 py-3'>
                <BoqTypeBadge boqType={product.boqType} />
              </div>
              <div className='flex items-center border-r border-black/[0.07] px-3 py-3'>
                <span className='truncate text-label-sm font-medium text-text-main-900'>
                  {product.areaLocation || '--'}
                </span>
              </div>
              <div className='px-3 py-3'>
                <ExpandableClampText
                  as='div'
                  disabled
                  text={product.description}
                  lines={2}
                  textClassName='font-normal'
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProjectProcurementPurchaseBoqAddToPackageDrawer({
  open,
  onOpenChange,
  products = [],
  packages = [],
  onConfirm,
}) {
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [isCreatingPackage, setIsCreatingPackage] = useState(false);
  const [newPackageName, setNewPackageName] = useState('');
  const [expectedClosureDate, setExpectedClosureDate] = useState(null);
  const [drawerSelectedIds, setDrawerSelectedIds] = useState(() => new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionsInFlightRef = useRef(new Set());

  useEffect(() => {
    if (!open) {
      setSelectedPackageId('');
      setIsCreatingPackage(false);
      setNewPackageName('');
      setExpectedClosureDate(null);
      setDrawerSelectedIds(new Set());
      return;
    }

    setDrawerSelectedIds(new Set(products.map((product) => product.id)));
  }, [open, products]);

  const groupedSections = useMemo(() => {
    const categories = groupBoqTemplateProductsByCategory(products, {
      sectionField: 'purchaseCategory',
      groupBySectionOnly: true,
    });
    return categories.flatMap((category) =>
      category.sections.map((section) => ({
        section: section.section,
        products: section.products,
        buyTotal: section.buyTotal ?? 0,
      })),
    );
  }, [products]);

  const selectedItemLabel = useMemo(() => {
    const count = drawerSelectedIds.size;
    return count === 1 ? '1 Item selected' : `${count} Items selected`;
  }, [drawerSelectedIds.size]);

  const handleToggleDrawerSelect = useCallback((productId) => {
    setDrawerSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }, []);

  const handleToggleSectionSelectAll = useCallback((sectionProducts) => {
    const sectionIds = sectionProducts.map((product) => product.id);
    setDrawerSelectedIds((previous) => {
      const allSelected = sectionIds.every((id) => previous.has(id));
      const next = new Set(previous);
      if (allSelected) {
        sectionIds.forEach((id) => next.delete(id));
      } else {
        sectionIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, []);

  const resolvedPackage = useMemo(() => {
    if (isCreatingPackage) {
      return createPurchaseBoqPackageFromInput(newPackageName);
    }
    return packages.find((entry) => entry.id === selectedPackageId) ?? null;
  }, [isCreatingPackage, newPackageName, packages, selectedPackageId]);

  const canSubmit = Boolean(resolvedPackage) && drawerSelectedIds.size > 0 && !isSubmitting;

  const handleSubmit = useCallback(async () => {
    if (
      !resolvedPackage ||
      drawerSelectedIds.size === 0 ||
      isSubmitting ||
      submissionsInFlightRef.current.size > 0
    ) {
      return;
    }

    const submissionToken = Symbol('package-submission');
    submissionsInFlightRef.current.add(submissionToken);
    setIsSubmitting(true);
    try {
      const succeeded = await onConfirm?.({
        package: resolvedPackage,
        productIds: [...drawerSelectedIds],
        expectedClosureDate:
          isCreatingPackage && expectedClosureDate ? format(expectedClosureDate, 'yyyy-MM-dd') : '',
      });
      if (succeeded !== false) {
        onOpenChange?.(false);
      }
    } finally {
      submissionsInFlightRef.current.delete(submissionToken);
      setIsSubmitting(false);
    }
  }, [
    drawerSelectedIds,
    expectedClosureDate,
    isCreatingPackage,
    isSubmitting,
    onConfirm,
    onOpenChange,
    resolvedPackage,
  ]);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      if (isSubmitting && !nextOpen) return;
      onOpenChange?.(nextOpen);
    },
    [isSubmitting, onOpenChange],
  );

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange}>
      <Drawer.Content
        title='Add to Package'
        className='flex h-full max-w-[min(954px,calc(100vw-16px))] flex-col overflow-hidden'
      >
        <Drawer.Header className='shrink-0 gap-4 px-6 py-5' showCloseButton>
          <span className='flex size-12 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 text-text-sub-500'>
            <RiBox3Line className='size-6' aria-hidden />
          </span>
          <div className='flex min-w-0 flex-1 flex-col gap-1 pr-10'>
            <Drawer.Title>Add to Package</Drawer.Title>
            <p className='text-paragraph-sm text-text-sub-500'>{selectedItemLabel}</p>
          </div>
        </Drawer.Header>

        <Drawer.Body className='min-h-0 flex-1 gap-6 overflow-y-auto px-6 py-6'>
          <div
            className={cn(
              'grid gap-4',
              isCreatingPackage ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1',
            )}
          >
            <div className='flex flex-col gap-1'>
              <Label.Root>
                Package<span className='text-text-soft-400'>*</span>
              </Label.Root>
              <PackageSelectDropdown
                packages={packages}
                value={selectedPackageId}
                onValueChange={setSelectedPackageId}
                isCreating={isCreatingPackage}
                createValue={newPackageName}
                onCreateValueChange={setNewPackageName}
                onStartCreate={() => {
                  setIsCreatingPackage(true);
                  setSelectedPackageId('');
                  setNewPackageName('');
                }}
                onCancelCreate={() => {
                  setIsCreatingPackage(false);
                  setNewPackageName('');
                  setExpectedClosureDate(null);
                }}
                disabled={isSubmitting}
              />
            </div>

            {isCreatingPackage ? (
              <div className='flex flex-col gap-1'>
                <Label.Root>Expected Closure Date</Label.Root>
                <Datepicker
                  variant='bordered'
                  size='medium'
                  value={expectedClosureDate}
                  onChange={(date) => setExpectedClosureDate(date ?? null)}
                  placeholder='DD / MM / YYYY'
                  formatDate={(date) => format(date, 'dd / MM / yyyy')}
                  triggerAriaLabel='Expected closure date'
                  className='w-full'
                />
              </div>
            ) : null}
          </div>

          <div className='flex min-w-0 flex-col gap-4'>
            <p className='text-label-sm font-medium uppercase tracking-[0.84px] text-text-sub-500'>
              Selected items
            </p>

            {groupedSections.map((group) => (
              <div key={group.section} className='flex min-w-0 flex-col gap-4'>
                <div className='flex min-w-0 items-center gap-3'>
                  <span className='inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-primary-lighter p-1.5 text-label-xs font-medium text-primary-base'>
                    {group.section}
                    <RiArrowDownSLine className='size-5' aria-hidden />
                  </span>
                  <DottedDivider />
                  <div className='shrink-0'>
                    <BoqFinancialSummaryChips
                      buyTotal={group.buyTotal}
                      total={group.buyTotal}
                      pendingTotal={group.buyTotal}
                      variant='light'
                      summaryVariant='purchase-boq'
                    />
                  </div>
                </div>

                <AddToPackageSelectedItemsTable
                  products={group.products}
                  selectedIds={drawerSelectedIds}
                  onToggleSelect={handleToggleDrawerSelect}
                  onToggleSelectAll={() => handleToggleSectionSelectAll(group.products)}
                  packagePreview={isCreatingPackage ? resolvedPackage : null}
                />
              </div>
            ))}
          </div>
        </Drawer.Body>

        <Drawer.Footer className='shrink-0 border-t border-stroke-soft-200 px-6 py-4'>
          <div className='flex items-center justify-end gap-3'>
            <Drawer.Close asChild>
              <Button.Root type='button' variant='neutral' mode='stroke' disabled={isSubmitting}>
                Cancel
              </Button.Root>
            </Drawer.Close>
            <Button.Root
              type='button'
              variant='primary'
              mode='filled'
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <>
                  <Button.Icon as={RiLoader4Line} className='animate-spin' />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button.Root>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer.Root>
  );
}
