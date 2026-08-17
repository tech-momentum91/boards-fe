import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowDownSLine, RiCheckLine, RiSearchLine } from 'react-icons/ri';

import { listProducts, mapBundleProductRow } from '@/api/products';
import { buildProductsListApiFilters } from '@/components/products/products-filters';
import { PRODUCTS_TAB_IDS } from '@/components/products/constants';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import { selectVariants } from '@/components/ui/select';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/utils/cn';

const SEARCH_DEBOUNCE_MS = 300;

const CONTENT_CLASS =
  'relative z-[600] max-h-[300px] w-(--radix-popover-trigger-width) min-w-[280px] overflow-hidden rounded-2xl bg-bg-white-0 p-0 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200';

function mapListRowToBundleItem(row, quantity = '1') {
  return mapBundleProductRow({
    ...row,
    id: row.id,
    name: row.name,
    item_code: row.productCode,
    qty: quantity,
    quantity,
  });
}

export default function ProductPackageItemNameSearch({
  value,
  onSelect,
  categoryFilters = {},
  excludeProductIds = [],
  placeholder = 'Search product...',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef(null);
  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  const { triggerRoot, triggerArrow } = selectVariants({
    size: 'xsmall',
    hasError: false,
  });

  const excludeSet = useMemo(() => new Set(excludeProductIds), [excludeProductIds]);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    setIsLoading(true);

    const filters = buildProductsListApiFilters(
      {
        categoryGroup: categoryFilters.categoryGroup ? [categoryFilters.categoryGroup] : [],
        categoryType: categoryFilters.categoryType ? [categoryFilters.categoryType] : [],
        productGroup: categoryFilters.productGroup ? [categoryFilters.productGroup] : [],
        productType: categoryFilters.productType ? [categoryFilters.productType] : [],
      },
      PRODUCTS_TAB_IDS.PRODUCT,
    );

    listProducts({
      devxProductType: PRODUCTS_TAB_IDS.PRODUCT,
      keyword: debouncedSearch,
      limitPageLength: 50,
      excludeTemplates: true,
      filters,
    })
      .then(({ rows }) => {
        if (cancelled) return;
        setOptions(rows.filter((row) => !excludeSet.has(row.id)));
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, debouncedSearch, categoryFilters, excludeSet]);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setOptions([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const idFrame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(idFrame);
  }, [open]);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.id === value) ?? null,
    [options, value],
  );

  const isDebouncing = searchQuery.trim() !== debouncedSearch.trim();
  const listEmptyMessage = isLoading || isDebouncing ? 'Loading...' : 'No products found';

  const handlePick = (row) => {
    onSelect?.(mapListRowToBundleItem(row));
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover.Root modal={false} open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type='button'
          disabled={disabled}
          data-state={open ? 'open' : 'closed'}
          data-placeholder={value ? undefined : ''}
          className={cn(
            triggerRoot(),
            'h-8 w-full min-w-0 max-w-full border-0 bg-transparent pr-2 shadow-none ring-0 hover:bg-bg-weak-50',
          )}
        >
          <span className='flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-left'>
            {selectedOption?.imageUrl ? (
              <img
                src={selectedOption.imageUrl}
                alt=''
                className='size-6 shrink-0 rounded object-cover'
              />
            ) : (
              <div className='size-6 shrink-0 rounded bg-bg-weak-100' aria-hidden />
            )}
            <span className='truncate text-paragraph-sm font-medium text-text-main-900'>
              {selectedOption?.name || placeholder}
            </span>
          </span>
          <RiArrowDownSLine className={triggerArrow()} aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Content
        align='start'
        sideOffset={8}
        collisionPadding={16}
        showArrow={false}
        unstyled
        className={CONTENT_CLASS}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className='flex flex-col'>
          <div className='border-b border-stroke-soft-200 p-2'>
            <Input.Root size='small'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  ref={searchInputRef}
                  placeholder='Search by name or code...'
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => event.stopPropagation()}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>
          <div
            className='flex max-h-[236px] flex-col gap-1 overflow-y-auto p-2'
            onWheel={(event) => event.stopPropagation()}
          >
            {options.length > 0 ? (
              options.map((option) => {
                const isSelected = value === option.id;
                return (
                  <button
                    key={option.id}
                    type='button'
                    role='option'
                    aria-selected={isSelected}
                    className={cn(
                      'group relative flex w-full cursor-pointer select-none items-center gap-2 rounded-lg p-2 pr-9 text-left',
                      'transition duration-200 ease-out hover:bg-bg-weak-50 focus-visible:bg-bg-weak-50 focus-visible:outline-0',
                    )}
                    onClick={() => handlePick(option)}
                  >
                    {option.imageUrl ? (
                      <img
                        src={option.imageUrl}
                        alt=''
                        className='size-8 shrink-0 rounded object-cover'
                      />
                    ) : (
                      <div className='size-8 shrink-0 rounded bg-bg-weak-100' aria-hidden />
                    )}
                    <span className='min-w-0 flex-1'>
                      <span className='block truncate text-paragraph-sm font-medium text-text-main-900'>
                        {option.name}
                      </span>
                      <span className='block truncate text-paragraph-xs text-text-soft-400'>
                        {[option.productCode, option.brand].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {isSelected ? (
                      <RiCheckLine className='pointer-events-none absolute right-2 top-1/2 size-5 shrink-0 -translate-y-1/2 text-text-soft-400' />
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div className='px-4 py-8 text-center text-paragraph-sm text-text-soft-400'>
                {listEmptyMessage}
              </div>
            )}
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
