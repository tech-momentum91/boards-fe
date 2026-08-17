import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RiArrowDownSLine,
  RiAsterisk,
  RiCloseLine,
  RiFolderLine,
  RiSearchLine,
} from 'react-icons/ri';

import { BOQ_LABELS, BOQ_SEARCH_DEBOUNCE_MS } from '@/components/boq/constants';
import {
  buildProjectBoqFamilyBadgeMembers,
  getDefaultProjectBoqFamilyCode,
} from '@/components/boq/boq-helper';
import BoqTemplatePreviousProjectsSidebar from '@/components/boq/boq-templates/components/boq-template-previous-projects-sidebar';
import {
  fetchBoqPreviousProjectProducts,
  fetchBoqPreviousProjects,
} from '@/api/boqTemplateProjects';
import BoqTemplateProductMasterTable from '@/components/boq/boq-templates/components/boq-template-product-master-table';
import { groupBoqTemplateProductsByCategory } from '@/components/boq/boq-templates/components/boq-template-products-utils';
import {
  computeBoqProductMasterSelectionSummary,
  formatBoqRupeeAmount,
} from '@/components/boq/boq-templates/components/boq-template-product-master-utils';
import {
  filterBoqPreviousProjectProducts,
  formatBoqPreviousProjectItemCount,
} from '@/components/boq/boq-templates/components/boq-template-previous-projects-utils';
import BoqListEmptyState from '@/components/boq/shared/boq-list-empty-state';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import * as CompactButton from '@/components/ui/compact-button';
import * as Input from '@/components/ui/input';
import * as LinkButton from '@/components/ui/link-button';
import * as Modal from '@/components/ui/modal';
import * as Popover from '@/components/ui/popover';
import { showErrorToast } from '@/utils/error-utils';

import { cn } from '@/utils/cn';

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

const CategoryLevelHeader = ({ label, isFullySelected, isPartiallySelected, onToggleCategory }) => (
  <div className='sticky top-0 z-10 -mx-3 flex h-[30px] shrink-0 items-center gap-2 border-b border-[#e2e6e0] bg-[#1c4a3a] px-3'>
    <Checkbox.Root
      checked={isFullySelected ? true : isPartiallySelected ? 'indeterminate' : false}
      onCheckedChange={onToggleCategory}
      aria-label={`Select all in ${label}`}
    />
    <span className='truncate text-[12px] font-semibold uppercase tracking-[0.56px] text-white'>
      {label}
    </span>
  </div>
);

const ProductSection = ({ section, products, selectedIds, onToggle, onToggleGroup }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const groupIds = products.map((row) => row.id);
  const selectedInGroup = groupIds.filter((id) => selectedIds.has(id)).length;
  const allSelected = groupIds.length > 0 && selectedInGroup === groupIds.length;
  const partiallySelected = selectedInGroup > 0 && !allSelected;

  return (
    <section className='flex flex-col'>
      <div className='flex items-center gap-2 py-3'>
        <Checkbox.Root
          checked={allSelected ? true : partiallySelected ? 'indeterminate' : false}
          onCheckedChange={() => onToggleGroup?.(groupIds)}
          aria-label={`Select all in ${section}`}
        />
        <Button.Root
          type='button'
          variant='primary'
          mode='lighter'
          size='xxsmall'
          className='h-auto max-w-full shrink-0 gap-0.5 rounded-lg bg-primary-lighter p-1.5 text-[12px] font-medium leading-[18px] text-primary-base hover:bg-primary-lighter hover:ring-transparent'
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((previous) => !previous)}
        >
          <span className='truncate px-1'>{section}</span>
          <Button.Icon
            as={RiArrowDownSLine}
            className={cn('size-5 transition-transform duration-200', !isExpanded && '-rotate-90')}
          />
        </Button.Root>
        <DottedDivider />
      </div>

      {isExpanded ? (
        <BoqTemplateProductMasterTable
          products={products}
          selectedIds={selectedIds}
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

const resolveFamilyMemberCode = (member, index = 0) =>
  String(member?.code || member?.id || member?.name || `member-${index}`).trim();

const resolveFamilyMemberLabel = (member) =>
  member?.badgeLabel || member?.familyLabel || member?.boqName || resolveFamilyMemberCode(member);

const PreviousProjectFamilyDropdown = ({
  members = [],
  selectedBoqCode,
  onSelect,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);

  const selectedMember = useMemo(
    () =>
      members.find((member, index) => resolveFamilyMemberCode(member, index) === selectedBoqCode),
    [members, selectedBoqCode],
  );

  const selectedLabel = selectedMember ? resolveFamilyMemberLabel(selectedMember) : 'BOQ family';

  if (members.length === 0) return null;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type='button'
          disabled={disabled}
          className={cn(
            'flex h-9 w-[240px] shrink-0 items-center justify-between gap-2 rounded-lg border border-stroke-soft-200',
            'bg-bg-white-0 px-2.5 py-2 text-left text-paragraph-sm shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]',
            'transition-colors hover:bg-bg-weak-50 disabled:pointer-events-none disabled:opacity-50',
          )}
          aria-label='BOQ family'
          aria-expanded={open}
        >
          <span className='min-w-0 truncate font-medium text-text-main-900'>{selectedLabel}</span>
          <RiArrowDownSLine
            className={cn(
              'size-5 shrink-0 text-text-sub-500 transition-transform',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
      </Popover.Trigger>

      <Popover.Content
        align='end'
        sideOffset={4}
        className='z-[80] w-[280px] rounded-2xl border border-stroke-soft-200 p-2 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
      >
        <div className='max-h-[280px] overflow-y-auto'>
          {members.map((member, index) => {
            const code = resolveFamilyMemberCode(member, index);
            const label = resolveFamilyMemberLabel(member);
            const itemCount = Number(member.products ?? member.itemCount ?? 0);
            const isSelected = selectedBoqCode === code;

            return (
              <button
                key={code}
                type='button'
                onClick={() => {
                  onSelect?.(code);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left',
                  isSelected ? 'bg-bg-weak-100' : 'hover:bg-bg-weak-100',
                )}
              >
                <span className='truncate text-paragraph-sm font-medium text-text-main-900'>
                  {label}
                </span>
                <span className='shrink-0 text-paragraph-xs text-text-soft-400'>
                  {formatBoqPreviousProjectItemCount(itemCount)}
                </span>
              </button>
            );
          })}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};

const BoqTemplateAddPreviousProjectsModal = ({
  open,
  onOpenChange,
  onAddProducts,
  isSubmitting = false,
  excludeProjectId,
}) => {
  const projectSearchId = React.useId();
  const productSearchId = React.useId();

  const [projects, setProjects] = useState([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState(null);

  const [allProducts, setAllProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState(null);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedBoqCode, setSelectedBoqCode] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [debouncedProjectSearch, setDebouncedProjectSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());
  }, [open, selectedProjectId]);

  const resetState = useCallback(() => {
    setProjects([]);
    setIsProjectsLoading(false);
    setProjectsError(null);
    setAllProducts([]);
    setIsProductsLoading(false);
    setProductsError(null);
    setSelectedProjectId('');
    setSelectedBoqCode('');
    setProjectSearch('');
    setDebouncedProjectSearch('');
    setProductSearch('');
    setDebouncedProductSearch('');
    setSelectedIds(new Set());
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
    const timer = setTimeout(
      () => setDebouncedProjectSearch(projectSearch),
      BOQ_SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [open, projectSearch]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(
      () => setDebouncedProductSearch(productSearch),
      BOQ_SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [open, productSearch]);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    setIsProjectsLoading(true);
    setProjectsError(null);

    fetchBoqPreviousProjects({
      keyword: debouncedProjectSearch,
      excludeProjectId,
    })
      .then((rows) => {
        if (cancelled) return;
        setProjects(rows);
        setSelectedProjectId((previous) => {
          if (previous && rows.some((row) => row.id === previous)) return previous;
          return rows[0]?.id ?? '';
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setProjects([]);
        setSelectedProjectId('');
        const message = error?.message || 'Failed to load previous projects.';
        setProjectsError(message);
        showErrorToast(error, { defaultMessage: 'Failed to load previous projects.' });
      })
      .finally(() => {
        if (!cancelled) setIsProjectsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedProjectSearch, excludeProjectId, open]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const familyMembers = useMemo(
    () => selectedProject?.familyMembers ?? selectedProject?.family_members ?? [],
    [selectedProject],
  );

  const labeledFamilyMembers = useMemo(() => {
    if (!Array.isArray(familyMembers) || familyMembers.length === 0) return [];
    return buildProjectBoqFamilyBadgeMembers(familyMembers);
  }, [familyMembers]);

  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedBoqCode('');
      return undefined;
    }

    setSelectedBoqCode((previous) => {
      const members = buildProjectBoqFamilyBadgeMembers(familyMembers);
      const memberCodes = members
        .map((member, index) => resolveFamilyMemberCode(member, index))
        .filter(Boolean);
      if (previous && memberCodes.includes(previous)) return previous;
      const defaultCode = getDefaultProjectBoqFamilyCode(familyMembers);
      if (defaultCode && memberCodes.includes(defaultCode)) return defaultCode;
      return memberCodes[0] ?? '';
    });
    return undefined;
  }, [familyMembers, selectedProjectId]);

  useEffect(() => {
    if (!open || !selectedProjectId || !selectedBoqCode) {
      setAllProducts([]);
      return undefined;
    }

    let cancelled = false;
    setIsProductsLoading(true);
    setProductsError(null);

    fetchBoqPreviousProjectProducts({
      projectId: selectedProjectId,
      boqCode: selectedBoqCode,
    })
      .then(({ products }) => {
        if (cancelled) return;
        const rows = Array.isArray(products) ? products : [];
        setAllProducts(rows);
      })
      .catch((error) => {
        if (cancelled) return;
        setAllProducts([]);
        const message = error?.message || 'Failed to load BOQ products.';
        setProductsError(message);
        showErrorToast(error, { defaultMessage: 'Failed to load BOQ products.' });
      })
      .finally(() => {
        if (!cancelled) setIsProductsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, selectedBoqCode, selectedProjectId]);

  const filteredProducts = useMemo(
    () =>
      filterBoqPreviousProjectProducts(allProducts, {
        searchQuery: debouncedProductSearch,
      }),
    [allProducts, debouncedProductSearch],
  );

  const groupedCategories = useMemo(
    () => groupBoqTemplateProductsByCategory(filteredProducts),
    [filteredProducts],
  );

  const selectedProducts = useMemo(
    () => allProducts.filter((row) => selectedIds.has(row.id)),
    [allProducts, selectedIds],
  );

  const selectionSummary = useMemo(
    () => computeBoqProductMasterSelectionSummary(selectedProducts),
    [selectedProducts],
  );

  const selectedCount = selectedIds.size;

  const handleToggleProduct = useCallback((productId) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }, []);

  const handleToggleGroup = useCallback((groupIds) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      const allSelected = groupIds.every((id) => next.has(id));
      for (const id of groupIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleProjectSelect = useCallback((projectId) => {
    setSelectedProjectId(projectId);
    setSelectedBoqCode('');
    setSelectedIds(new Set());
    setProductSearch('');
    setDebouncedProductSearch('');
  }, []);

  const handleFamilyChange = useCallback((boqCode) => {
    setSelectedBoqCode(boqCode);
    setSelectedIds(new Set());
    setProductSearch('');
    setDebouncedProductSearch('');
  }, []);

  const handleAddProducts = useCallback(async () => {
    if (selectedCount === 0 || isSubmitting) return;
    try {
      await onAddProducts?.(selectedProducts);
      handleOpenChange(false);
    } catch {
      // Keep modal open when add fails.
    }
  }, [handleOpenChange, isSubmitting, onAddProducts, selectedCount, selectedProducts]);

  const isLoading = isProjectsLoading;
  const isContentLoading = isProductsLoading;

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Content
        className='flex max-h-[min(853px,calc(100dvh-32px))] w-full max-w-[min(1240px,calc(100vw-32px))] flex-col overflow-hidden p-0'
        showClose={false}
        overlayClassName='z-[60]'
      >
        <div className='flex shrink-0 items-center gap-4 border-b border-stroke-soft-200 px-5 py-4'>
          <span className='flex shrink-0 items-center justify-center rounded-full bg-success-lighter p-2.5'>
            <RiFolderLine className='size-6 text-success-base' aria-hidden />
          </span>
          <div className='flex min-w-0 flex-1 flex-col gap-1 pr-8'>
            <Modal.Title>Add from previous projects</Modal.Title>
            <Modal.Description>Copy items from completed BOQ&apos;s</Modal.Description>
          </div>
          <Modal.Close asChild>
            <CompactButton.Root
              variant='ghost'
              size='medium'
              className='absolute right-4 top-4 shrink-0'
            >
              <CompactButton.Icon as={RiCloseLine} />
            </CompactButton.Root>
          </Modal.Close>
        </div>

        <div className='flex min-h-0 flex-1 overflow-hidden'>
          <aside className='flex w-[257px] shrink-0 flex-col border-r border-stroke-soft-200 bg-bg-white-0'>
            <div className='shrink-0 p-3'>
              <Input.Root size='small'>
                <Input.Wrapper>
                  <Input.Icon as={RiSearchLine} />
                  <Input.Input
                    id={projectSearchId}
                    value={projectSearch}
                    onChange={(event) => setProjectSearch(event.target.value)}
                    placeholder='search projects'
                    autoComplete='off'
                    aria-label='Search projects'
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>

            <BoqTemplatePreviousProjectsSidebar
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={handleProjectSelect}
              isLoading={isLoading}
            />
          </aside>

          <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
            <div className='flex shrink-0 items-center gap-2 p-3'>
              <Input.Root size='small' className='min-w-0 flex-1'>
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

              {selectedProjectId && labeledFamilyMembers.length > 0 ? (
                <PreviousProjectFamilyDropdown
                  members={labeledFamilyMembers}
                  selectedBoqCode={selectedBoqCode}
                  onSelect={handleFamilyChange}
                  disabled={isContentLoading}
                />
              ) : null}
            </div>

            <div className='min-h-0 flex-1 overflow-y-auto px-3 pb-3'>
              {projectsError ? (
                <BoqListEmptyState
                  embedded
                  title='Unable to load projects'
                  description={projectsError}
                />
              ) : isLoading ? (
                <BoqListEmptyState
                  embedded
                  title='Loading projects…'
                  description='Fetching projects with BOQs.'
                />
              ) : !selectedProjectId ? (
                <BoqListEmptyState
                  embedded
                  title='Select a project'
                  description='Choose a project with an existing BOQ from the sidebar.'
                />
              ) : productsError ? (
                <BoqListEmptyState
                  embedded
                  title='Unable to load products'
                  description={productsError}
                />
              ) : isContentLoading ? (
                <BoqListEmptyState
                  embedded
                  title='Loading products…'
                  description='Fetching BOQ items for the selected family.'
                />
              ) : !selectedBoqCode ? (
                <BoqListEmptyState
                  embedded
                  title='Select a BOQ'
                  description='Choose Design, Main, or an Additional BOQ from the BOQ family dropdown.'
                />
              ) : allProducts.length === 0 ? (
                <BoqListEmptyState
                  embedded
                  title='No products in this BOQ'
                  description='This BOQ has no products yet. Try another family member.'
                />
              ) : groupedCategories.length === 0 ? (
                <BoqListEmptyState
                  embedded
                  title='No products found'
                  description='Try another family or adjust your search.'
                />
              ) : (
                <div className='flex flex-col gap-8'>
                  {groupedCategories.map((category) => {
                    const categoryProductIds = category.products.map((row) => row.id);
                    const selectedInCategory = categoryProductIds.filter((id) =>
                      selectedIds.has(id),
                    ).length;
                    const isCategoryFullySelected =
                      categoryProductIds.length > 0 &&
                      selectedInCategory === categoryProductIds.length;
                    const isCategoryPartiallySelected =
                      selectedInCategory > 0 && !isCategoryFullySelected;

                    return (
                      <div key={category.categoryId} className='flex flex-col'>
                        <CategoryLevelHeader
                          label={category.label}
                          isFullySelected={isCategoryFullySelected}
                          isPartiallySelected={isCategoryPartiallySelected}
                          onToggleCategory={() => handleToggleGroup(categoryProductIds)}
                        />

                        <div className='flex flex-col gap-6 pt-1'>
                          {category.sections.map((group) => (
                            <ProductSection
                              key={`${category.categoryId}-${group.section}`}
                              section={group.section}
                              products={group.products}
                              selectedIds={selectedIds}
                              onToggle={handleToggleProduct}
                              onToggleGroup={handleToggleGroup}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
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
              disabled={selectedCount === 0 || isSubmitting}
              onClick={handleAddProducts}
            >
              {isSubmitting ? 'Adding…' : 'Add selected items'}
            </Button.Root>
          </div>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default BoqTemplateAddPreviousProjectsModal;
