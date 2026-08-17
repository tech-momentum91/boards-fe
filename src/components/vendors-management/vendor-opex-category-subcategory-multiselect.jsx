import React, { useMemo, useState } from 'react';
import { RiArrowDownSLine, RiLoader4Line, RiSearchLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Dropdown from '@/components/ui/dropdown';
import * as Popover from '@/components/ui/popover';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
import ErrorText from '@/components/ui/error-text';
import { Root as Checkbox } from '@/components/ui/checkbox';
import { VENDOR_OPEX_TRIGGER_BADGE_MAX } from '@/components/vendors-management/constants';
import { cn } from '@/utils/cn';
import { buildGroupedSubCategories } from '@/utils/vendor-utils';

/**
 * Category + sub-category multiselect (same UX as create vendor drawer).
 */
export function VendorOpexCategorySubcategoryMultiselect({
  categoryData = [],
  categoryLoading = false,
  categories = [],
  subCategories = [],
  onCategoriesChange,
  onSubCategoriesChange,
  categoriesError,
  subCategoriesError,
  disabled = false,
  /** Called when the category dropdown closes (after internal state updates). */
  onCategoryDropdownClose,
  /** Called when the sub-category dropdown closes. */
  onSubCategoryDropdownClose,
  showLabels = true,
  labelCategoryClassName = 'text-paragraph-sm opacity-72 text-text-sub-500',
  /** Hide trigger chevron (e.g. vendor detail next to EditableFieldWrapper pencil). */
  showChevron = true,
  /** Category | Sub-category side-by-side (~50% each). Ignored when fieldScope is category/subcategory. */
  twoColumnLayout = false,
  /** Render only one column when the parent grid lays out Category | Sub-category | Centers. */
  fieldScope = 'both',
  /**
   * Vendor detail: Popover panels + trigger chrome aligned with `CenterAccessDropdown`
   * (search focus, padding, row buttons).
   */
  vendorDetailSurface = false,
}) {
  const [categorySearch, setCategorySearch] = useState('');
  const [subCategorySearch, setSubCategorySearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [subCategoryMenuOpen, setSubCategoryMenuOpen] = useState(false);

  const categoryOptions = useMemo(
    () => categoryData.map((item) => ({ value: item.category, label: item.category })),
    [categoryData],
  );

  const groupedSubCategories = useMemo(
    () => buildGroupedSubCategories(categories, categoryData),
    [categories, categoryData],
  );

  const allSubCategoryValues = useMemo(
    () => groupedSubCategories.flatMap((g) => g.subcategories.map((s) => s.value)),
    [groupedSubCategories],
  );

  const filteredGroupedSubCategories = useMemo(() => {
    if (!subCategorySearch.trim()) return groupedSubCategories;
    const term = subCategorySearch.toLowerCase();
    return groupedSubCategories
      .map((g) => ({
        ...g,
        subcategories: g.subcategories.filter((s) => s.label.toLowerCase().includes(term)),
      }))
      .filter((g) => g.subcategories.length > 0 || g.category.toLowerCase().includes(term));
  }, [groupedSubCategories, subCategorySearch]);

  const filteredCategoryOptions = useMemo(
    () =>
      categoryOptions.filter((o) => o.label.toLowerCase().includes(categorySearch.toLowerCase())),
    [categoryOptions, categorySearch],
  );

  const getCategoryButtonLabel = (selectedValues) => {
    if (categoryLoading) return 'Loading...';
    if (selectedValues.length === 0) return 'Select category';
    if (selectedValues.length === categoryOptions.length && categoryOptions.length > 0)
      return 'All Categories';
    if (selectedValues.length === 1)
      return categoryOptions.find((o) => o.value === selectedValues[0])?.label ?? '1 Category';
    return `${selectedValues.length} Categories`;
  };

  const getSubCategoryButtonLabel = (selectedValues) => {
    if (!categories?.length) return 'Select category first';
    if (selectedValues.length === 0) return 'Select sub-category';
    if (selectedValues.length === allSubCategoryValues.length && allSubCategoryValues.length > 0) {
      return 'All Sub-Categories';
    }
    if (selectedValues.length === 1)
      return allSubCategoryValues.find((v) => v === selectedValues[0]) ?? '1 Sub-Category';
    return `${selectedValues.length} Sub-Categories`;
  };

  const patchCategories = (nextCategories) => {
    const prev = categories || [];
    const removed = prev.filter((c) => !nextCategories.includes(c));
    let nextSubs = [...(subCategories || [])];
    removed.forEach((cat) => {
      const found = categoryData.find((item) => item.category === cat);
      const removedSubs = found?.subcategories || [];
      nextSubs = nextSubs.filter((s) => !removedSubs.includes(s));
    });
    onCategoriesChange?.(nextCategories);
    onSubCategoriesChange?.(nextSubs);
  };

  const handleCategoryMenuOpenChange = (open) => {
    if (!open) {
      setCategorySearch('');
      queueMicrotask(() => onCategoryDropdownClose?.());
    }
    if (vendorDetailSurface) setCategoryMenuOpen(open);
  };

  const handleSubCategoryMenuOpenChange = (open) => {
    if (!open) {
      setSubCategorySearch('');
      setCollapsedGroups({});
      queueMicrotask(() => onSubCategoryDropdownClose?.());
    }
    if (vendorDetailSurface) setSubCategoryMenuOpen(open);
  };

  const detailPopoverPanelClass =
    'flex min-w-[300px] w-(--radix-popper-anchor-width) flex-col gap-3 p-3';

  const renderCategoryVendorDetailTriggerSummary = () => {
    if (categoryLoading) {
      return <span className='truncate text-label-sm text-text-strong-950'>Loading...</span>;
    }
    if (!categories?.length) {
      return <span className='truncate text-label-sm text-text-strong-950'>Select category</span>;
    }
    const allSelected =
      categoryOptions.length > 0 &&
      categories.length === categoryOptions.length &&
      categoryOptions.every((o) => categories.includes(o.value));
    if (allSelected) {
      const inner = (
        <Badge.Root size='small' variant='light' color='gray' className='max-w-full'>
          <span className='block min-w-0 truncate'>All Categories</span>
        </Badge.Root>
      );
      return (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <div className='min-w-0 max-w-full cursor-default'>{inner}</div>
          </Tooltip.Trigger>
          <Tooltip.Content side='bottom' className='max-w-sm break-words'>
            All categories are selected.
          </Tooltip.Content>
        </Tooltip.Root>
      );
    }
    const labels = [...categories]
      .map((c) => categoryOptions.find((o) => o.value === c)?.label ?? c)
      .filter(Boolean);
    const visibleLabels = labels.slice(0, VENDOR_OPEX_TRIGGER_BADGE_MAX);
    const overflowLabels = labels.slice(VENDOR_OPEX_TRIGGER_BADGE_MAX);
    const overflowCount = overflowLabels.length;
    return (
      <div className='flex min-w-0 max-w-full flex-wrap items-center gap-2'>
        {visibleLabels.map((label, index) => (
          <Badge.Root
            key={`${label}-${index}`}
            variant='lighter'
            color='gray'
            size='medium'
            className='max-w-[min(100%,10rem)]'
          >
            <span className='paragraph-small block min-w-0 truncate font-medium text-text-strong-950'>
              {label}
            </span>
          </Badge.Root>
        ))}
        {overflowCount > 0 ? (
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Badge.Root
                variant='lighter'
                color='gray'
                size='medium'
                className='shrink-0 cursor-default'
              >
                <span className='text-label-xs font-semibold text-text-strong-950'>
                  +{overflowCount}
                </span>
              </Badge.Root>
            </Tooltip.Trigger>
            <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
              <div className='flex flex-col gap-1'>
                <span className='mb-1 text-paragraph-sm font-medium text-text-strong-950'>
                  Additional categories ({overflowCount})
                </span>
                {overflowLabels.map((label, index) => (
                  <div key={index} className='text-paragraph-sm text-text-sub-600'>
                    {label}
                  </div>
                ))}
              </div>
            </Tooltip.Content>
          </Tooltip.Root>
        ) : null}
      </div>
    );
  };

  const renderSubCategoryVendorDetailTriggerSummary = () => {
    if (!categories?.length) {
      return (
        <span className='truncate text-label-sm text-text-strong-950'>Select category first</span>
      );
    }
    if (!subCategories?.length) {
      return (
        <span className='truncate text-label-sm text-text-strong-950'>Select sub-category</span>
      );
    }
    const allSelected =
      allSubCategoryValues.length > 0 &&
      subCategories.length === allSubCategoryValues.length &&
      allSubCategoryValues.every((id) => subCategories.includes(id));
    if (allSelected) {
      const inner = (
        <Badge.Root size='small' variant='light' color='gray' className='max-w-full'>
          <span className='block min-w-0 truncate'>All Sub-Categories</span>
        </Badge.Root>
      );
      return (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <div className='min-w-0 max-w-full cursor-default'>{inner}</div>
          </Tooltip.Trigger>
          <Tooltip.Content side='bottom' className='max-w-sm break-words'>
            All sub-categories for the selected categories are selected.
          </Tooltip.Content>
        </Tooltip.Root>
      );
    }
    const labels = [...subCategories].map(String).filter(Boolean);
    const visibleLabels = labels.slice(0, VENDOR_OPEX_TRIGGER_BADGE_MAX);
    const overflowLabels = labels.slice(VENDOR_OPEX_TRIGGER_BADGE_MAX);
    const overflowCount = overflowLabels.length;
    return (
      <div className='flex min-w-0 max-w-full flex-wrap items-center gap-2'>
        {visibleLabels.map((label, index) => (
          <Badge.Root
            key={`${label}-${index}`}
            variant='lighter'
            color='gray'
            size='medium'
            className='max-w-[min(100%,10rem)]'
          >
            <span className='paragraph-small block min-w-0 truncate font-medium text-text-strong-950'>
              {label}
            </span>
          </Badge.Root>
        ))}
        {overflowCount > 0 ? (
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Badge.Root
                variant='lighter'
                color='gray'
                size='medium'
                className='shrink-0 cursor-default'
              >
                <span className='text-label-xs font-semibold text-text-strong-950'>
                  +{overflowCount}
                </span>
              </Badge.Root>
            </Tooltip.Trigger>
            <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
              <div className='flex flex-col gap-1'>
                <span className='mb-1 text-paragraph-sm font-medium text-text-strong-950'>
                  Additional sub-categories ({overflowCount})
                </span>
                {overflowLabels.map((label, index) => (
                  <div key={index} className='text-paragraph-sm text-text-sub-600'>
                    {label}
                  </div>
                ))}
              </div>
            </Tooltip.Content>
          </Tooltip.Root>
        ) : null}
      </div>
    );
  };

  const categoryTriggerDisabled = disabled || (vendorDetailSurface && categoryLoading);

  const categoryMenuBody = (
    <>
      <Input.Root>
        <Input.Wrapper>
          <Input.Icon>
            <RiSearchLine />
          </Input.Icon>
          <Input.Input
            placeholder='Search categories...'
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
          />
        </Input.Wrapper>
      </Input.Root>

      {vendorDetailSurface ? (
        <button
          type='button'
          className='flex items-center gap-3 rounded-lg px-2 py-2 text-left outline-none transition hover:bg-bg-weak-50 focus-visible:ring-2 focus-visible:ring-primary-base'
          onClick={() => {
            const allIds = categoryOptions.map((o) => o.value);
            const allSelected = allIds.every((id) => categories.includes(id));
            patchCategories(allSelected ? [] : allIds);
          }}
        >
          <Checkbox
            checked={
              categoryOptions.length > 0 &&
              categoryOptions.every((o) => categories.includes(o.value))
                ? true
                : categories.length > 0 &&
                    !categoryOptions.every((o) => categories.includes(o.value))
                  ? 'indeterminate'
                  : false
            }
            readOnly
          />
          <div className='flex flex-row items-center gap-2'>
            <span className='text-paragraph-sm text-text-strong-950'>All Categories</span>
            <span className='text-paragraph-xs text-text-soft-400'>({categoryOptions.length})</span>
          </div>
        </button>
      ) : (
        <Dropdown.Item
          className='flex items-center gap-3 rounded-lg px-2 py-2'
          onSelect={(e) => {
            e.preventDefault();
            const allIds = categoryOptions.map((o) => o.value);
            const allSelected = allIds.every((id) => categories.includes(id));
            patchCategories(allSelected ? [] : allIds);
          }}
        >
          <Checkbox
            checked={
              categoryOptions.length > 0 &&
              categoryOptions.every((o) => categories.includes(o.value))
                ? true
                : categories.length > 0 &&
                    !categoryOptions.every((o) => categories.includes(o.value))
                  ? 'indeterminate'
                  : false
            }
            readOnly
          />
          <div className='flex items-center gap-2'>
            <span className='text-paragraph-sm text-text-strong-950'>All Categories</span>
            <span className='text-paragraph-xs text-text-soft-400'>({categoryOptions.length})</span>
          </div>
        </Dropdown.Item>
      )}

      <div
        className={cn(
          'flex flex-col overflow-y-auto pr-1',
          vendorDetailSurface ? 'max-h-[360px] gap-1' : 'max-h-[240px] gap-1',
        )}
      >
        {filteredCategoryOptions.length === 0 ? (
          <p className='px-2 py-2 text-paragraph-sm text-text-soft-400'>No categories found</p>
        ) : (
          filteredCategoryOptions.map((opt) => {
            const checked = categories.includes(opt.value);
            const toggle = () => {
              const isRemoving = categories.includes(opt.value);
              const updated = isRemoving
                ? categories.filter((v) => v !== opt.value)
                : [...categories, opt.value];
              patchCategories(updated);
            };
            if (vendorDetailSurface) {
              return (
                <button
                  key={opt.value}
                  type='button'
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left outline-none transition hover:bg-bg-weak-50 focus-visible:ring-2 focus-visible:ring-primary-base',
                    checked && 'bg-bg-weak-100',
                  )}
                  onClick={toggle}
                >
                  <Checkbox checked={checked} readOnly />
                  <span className='truncate text-paragraph-sm text-text-strong-950'>
                    {opt.label}
                  </span>
                </button>
              );
            }
            return (
              <Dropdown.Item
                key={opt.value}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-2 py-2',
                  checked && 'bg-bg-weak-100',
                )}
                onSelect={(e) => {
                  e.preventDefault();
                  toggle();
                }}
              >
                <Checkbox checked={checked} readOnly />
                <span className='truncate text-paragraph-sm text-text-strong-950'>{opt.label}</span>
              </Dropdown.Item>
            );
          })
        )}
      </div>
    </>
  );

  const categoryTriggerButton = (
    <Button.Root
      variant='neutral'
      mode='stroke'
      size='small'
      disabled={categoryTriggerDisabled}
      className={cn(
        'w-full min-w-0 gap-2 px-3',
        showChevron ? 'justify-between' : 'justify-start pr-9',
      )}
    >
      {vendorDetailSurface ? (
        <>
          <div className='flex min-w-0 flex-1 items-center gap-2 overflow-hidden'>
            {renderCategoryVendorDetailTriggerSummary()}
          </div>
          {categoryLoading ? (
            <RiLoader4Line className='size-4 shrink-0 animate-spin text-text-sub-600' />
          ) : showChevron ? (
            <RiArrowDownSLine className='size-4 shrink-0 text-text-strong-950' />
          ) : null}
        </>
      ) : (
        <>
          <span className='min-w-0 flex-1 truncate text-label-sm text-text-strong-950'>
            {getCategoryButtonLabel(categories)}
          </span>
          {showChevron ? (
            <RiArrowDownSLine className='size-4 shrink-0 text-text-strong-950' />
          ) : null}
        </>
      )}
    </Button.Root>
  );

  const categoryColumn = (
    <div className='flex min-w-0 flex-col gap-1'>
      {showLabels ? (
        <div className={labelCategoryClassName}>
          <Label.Root>
            Category <Label.Asterisk />
          </Label.Root>
        </div>
      ) : null}
      {vendorDetailSurface ? (
        <Popover.Root open={categoryMenuOpen} onOpenChange={handleCategoryMenuOpenChange}>
          <Popover.Trigger asChild>{categoryTriggerButton}</Popover.Trigger>
          <Popover.Content
            align='end'
            sideOffset={8}
            showArrow={false}
            className={detailPopoverPanelClass}
          >
            {categoryMenuBody}
          </Popover.Content>
        </Popover.Root>
      ) : (
        <Dropdown.Root onOpenChange={handleCategoryMenuOpenChange}>
          <Dropdown.Trigger asChild>{categoryTriggerButton}</Dropdown.Trigger>
          <Dropdown.Content
            align='start'
            sideOffset={8}
            className='w-(--radix-popper-anchor-width) min-w-[200px]'
          >
            <div className='flex flex-col gap-3'>{categoryMenuBody}</div>
          </Dropdown.Content>
        </Dropdown.Root>
      )}
      {categoriesError ? <ErrorText>{categoriesError}</ErrorText> : null}
    </div>
  );

  const subCategoryTriggerDisabled = disabled || !categories?.length;

  const subCategoryMenuBody = (
    <>
      <Input.Root>
        <Input.Wrapper>
          <Input.Icon>
            <RiSearchLine />
          </Input.Icon>
          <Input.Input
            placeholder='Search sub-categories...'
            value={subCategorySearch}
            onChange={(e) => setSubCategorySearch(e.target.value)}
          />
        </Input.Wrapper>
      </Input.Root>

      {vendorDetailSurface ? (
        <button
          type='button'
          className='flex items-center gap-3 rounded-lg px-2 py-2 text-left outline-none transition hover:bg-bg-weak-50 focus-visible:ring-2 focus-visible:ring-primary-base'
          onClick={() => {
            const allSelected =
              allSubCategoryValues.length > 0 &&
              allSubCategoryValues.every((id) => subCategories.includes(id));
            onSubCategoriesChange?.(allSelected ? [] : [...allSubCategoryValues]);
          }}
        >
          <Checkbox
            checked={
              allSubCategoryValues.length > 0 &&
              allSubCategoryValues.every((id) => subCategories.includes(id))
                ? true
                : subCategories.length > 0 &&
                    !(
                      allSubCategoryValues.length > 0 &&
                      allSubCategoryValues.every((id) => subCategories.includes(id))
                    )
                  ? 'indeterminate'
                  : false
            }
            readOnly
          />
          <div className='flex flex-row items-center gap-2'>
            <span className='text-paragraph-sm text-text-strong-950'>All Sub-Categories</span>
            <span className='text-paragraph-xs text-text-soft-400'>
              ({allSubCategoryValues.length})
            </span>
          </div>
        </button>
      ) : (
        <Dropdown.Item
          className='flex items-center gap-3 rounded-lg px-2 py-2'
          onSelect={(e) => {
            e.preventDefault();
            const allSelected =
              allSubCategoryValues.length > 0 &&
              allSubCategoryValues.every((id) => subCategories.includes(id));
            onSubCategoriesChange?.(allSelected ? [] : [...allSubCategoryValues]);
          }}
        >
          <Checkbox
            checked={
              allSubCategoryValues.length > 0 &&
              allSubCategoryValues.every((id) => subCategories.includes(id))
                ? true
                : subCategories.length > 0 &&
                    !(
                      allSubCategoryValues.length > 0 &&
                      allSubCategoryValues.every((id) => subCategories.includes(id))
                    )
                  ? 'indeterminate'
                  : false
            }
            readOnly
          />
          <div className='flex items-center gap-2'>
            <span className='text-paragraph-sm text-text-strong-950'>All Sub-Categories</span>
            <span className='text-paragraph-xs text-text-soft-400'>
              ({allSubCategoryValues.length})
            </span>
          </div>
        </Dropdown.Item>
      )}

      <div
        className={cn(
          'flex flex-col overflow-y-auto pr-1',
          vendorDetailSurface ? 'max-h-[360px] gap-2' : 'max-h-[300px] gap-2',
        )}
      >
        {filteredGroupedSubCategories.length === 0 ? (
          <p className='px-2 py-2 text-paragraph-sm text-text-soft-400'>No sub-categories found</p>
        ) : (
          filteredGroupedSubCategories.map((group) => {
            const groupIds = group.subcategories.map((s) => s.value);
            const selectedInGroup = groupIds.filter((id) => subCategories.includes(id)).length;
            const groupAllSelected = selectedInGroup === groupIds.length;
            const groupIndeterminate = selectedInGroup > 0 && !groupAllSelected;
            const isCollapsed = collapsedGroups[group.category];

            if (vendorDetailSurface) {
              return (
                <div key={group.category} className='flex flex-col gap-1'>
                  <div
                    role='button'
                    tabIndex={0}
                    className='flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-text-soft-400 outline-none transition hover:bg-bg-weak-50 focus-visible:ring-2 focus-visible:ring-primary-base'
                    onClick={() =>
                      setCollapsedGroups((previous) => ({
                        ...previous,
                        [group.category]: !previous[group.category],
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setCollapsedGroups((previous) => ({
                          ...previous,
                          [group.category]: !previous[group.category],
                        }));
                      }
                    }}
                  >
                    <div
                      className='flex items-center'
                      onClick={(e) => {
                        e.stopPropagation();
                        const allGroupSelected = groupIds.every((id) => subCategories.includes(id));
                        const updated = allGroupSelected
                          ? subCategories.filter((v) => !groupIds.includes(v))
                          : [...new Set([...subCategories, ...groupIds])];
                        onSubCategoriesChange?.(updated);
                      }}
                    >
                      <Checkbox
                        checked={
                          groupAllSelected ? true : groupIndeterminate ? 'indeterminate' : false
                        }
                        readOnly
                      />
                    </div>
                    <span className='flex-1 cursor-pointer text-[11px] font-medium uppercase tracking-[0.08em]'>
                      {group.category}
                    </span>
                    <RiArrowDownSLine
                      className={cn(
                        'size-4 shrink-0 transition-transform',
                        isCollapsed ? '-rotate-90' : 'rotate-0',
                      )}
                    />
                  </div>

                  {!isCollapsed &&
                    group.subcategories.map((sub) => {
                      const checked = subCategories.includes(sub.value);
                      return (
                        <button
                          key={sub.value}
                          type='button'
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-2 py-2 pl-6 text-left outline-none transition hover:bg-bg-weak-50 focus-visible:ring-2 focus-visible:ring-primary-base',
                            checked && 'bg-bg-weak-100',
                          )}
                          onClick={() => {
                            const updated = checked
                              ? subCategories.filter((v) => v !== sub.value)
                              : [...subCategories, sub.value];
                            onSubCategoriesChange?.(updated);
                          }}
                        >
                          <Checkbox checked={checked} readOnly />
                          <span className='flex-1 truncate text-paragraph-sm text-text-strong-950'>
                            {sub.label}
                          </span>
                        </button>
                      );
                    })}
                </div>
              );
            }

            return (
              <div key={group.category} className='flex flex-col gap-1'>
                <Dropdown.Item
                  className='flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-text-soft-400 hover:bg-bg-weak-50'
                  onSelect={(e) => {
                    e.preventDefault();
                    setCollapsedGroups((previous) => ({
                      ...previous,
                      [group.category]: !previous[group.category],
                    }));
                  }}
                >
                  <div
                    className='flex items-center'
                    onClick={(e) => {
                      e.stopPropagation();
                      const allGroupSelected = groupIds.every((id) => subCategories.includes(id));
                      const updated = allGroupSelected
                        ? subCategories.filter((v) => !groupIds.includes(v))
                        : [...new Set([...subCategories, ...groupIds])];
                      onSubCategoriesChange?.(updated);
                    }}
                  >
                    <Checkbox
                      checked={
                        groupAllSelected ? true : groupIndeterminate ? 'indeterminate' : false
                      }
                      readOnly
                    />
                  </div>
                  <span className='flex-1 cursor-pointer text-[11px] font-medium uppercase tracking-[0.08em]'>
                    {group.category}
                  </span>
                  <RiArrowDownSLine
                    className={cn(
                      'size-4 transition-transform',
                      isCollapsed ? '-rotate-90' : 'rotate-0',
                    )}
                  />
                </Dropdown.Item>

                {!isCollapsed &&
                  group.subcategories.map((sub) => {
                    const checked = subCategories.includes(sub.value);
                    return (
                      <Dropdown.Item
                        key={sub.value}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-2 py-2 pl-6',
                          checked && 'bg-bg-weak-100',
                        )}
                        onSelect={(e) => {
                          e.preventDefault();
                          const updated = checked
                            ? subCategories.filter((v) => v !== sub.value)
                            : [...subCategories, sub.value];
                          onSubCategoriesChange?.(updated);
                        }}
                      >
                        <Checkbox checked={checked} readOnly />
                        <span className='flex-1 truncate text-paragraph-sm text-text-strong-950'>
                          {sub.label}
                        </span>
                      </Dropdown.Item>
                    );
                  })}
              </div>
            );
          })
        )}
      </div>
    </>
  );

  const subCategoryTriggerButton = (
    <Button.Root
      variant='neutral'
      mode='stroke'
      size='small'
      disabled={subCategoryTriggerDisabled}
      className={cn(
        'w-full min-w-0 gap-2 px-3',
        showChevron ? 'justify-between' : 'justify-start pr-9',
      )}
    >
      {vendorDetailSurface ? (
        <>
          <div className='flex min-w-0 flex-1 items-center gap-2 overflow-hidden'>
            {renderSubCategoryVendorDetailTriggerSummary()}
          </div>
          {showChevron ? (
            <RiArrowDownSLine className='size-4 shrink-0 text-text-strong-950' />
          ) : null}
        </>
      ) : (
        <>
          <span className='min-w-0 flex-1 truncate text-label-sm text-text-strong-950'>
            {getSubCategoryButtonLabel(subCategories)}
          </span>
          {showChevron ? (
            <RiArrowDownSLine className='size-4 shrink-0 text-text-strong-950' />
          ) : null}
        </>
      )}
    </Button.Root>
  );

  const subCategoryColumn = (
    <div className='flex min-w-0 flex-col gap-1'>
      {showLabels ? (
        <div className={labelCategoryClassName}>
          <Label.Root>
            Sub-Category <Label.Asterisk />
          </Label.Root>
        </div>
      ) : null}
      {vendorDetailSurface ? (
        <Popover.Root open={subCategoryMenuOpen} onOpenChange={handleSubCategoryMenuOpenChange}>
          <Popover.Trigger asChild>{subCategoryTriggerButton}</Popover.Trigger>
          <Popover.Content
            align='end'
            sideOffset={8}
            showArrow={false}
            className={detailPopoverPanelClass}
          >
            {subCategoryMenuBody}
          </Popover.Content>
        </Popover.Root>
      ) : (
        <Dropdown.Root onOpenChange={handleSubCategoryMenuOpenChange}>
          <Dropdown.Trigger asChild>{subCategoryTriggerButton}</Dropdown.Trigger>
          <Dropdown.Content
            align='start'
            sideOffset={8}
            className='w-(--radix-popper-anchor-width) min-w-[200px]'
          >
            <div className='flex flex-col gap-3'>{subCategoryMenuBody}</div>
          </Dropdown.Content>
        </Dropdown.Root>
      )}
      {subCategoriesError ? <ErrorText>{subCategoriesError}</ErrorText> : null}
    </div>
  );

  if (fieldScope === 'category') return categoryColumn;
  if (fieldScope === 'subcategory') return subCategoryColumn;

  if (twoColumnLayout) {
    return (
      <div className='grid w-full grid-cols-2 gap-x-12 gap-y-4'>
        {categoryColumn}
        {subCategoryColumn}
      </div>
    );
  }

  return (
    <>
      {categoryColumn}
      {subCategoryColumn}
    </>
  );
}

export default VendorOpexCategorySubcategoryMultiselect;
