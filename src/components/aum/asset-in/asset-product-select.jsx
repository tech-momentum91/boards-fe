import React, { memo, useMemo, useState } from 'react';
import { RiAddLine, RiImageLine, RiSearchLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import { resolveFileUrl } from '@/lib/utils';
import { cn } from '@/utils/cn';

function ProductOption({ product }) {
  const imageUrl = product.image ? resolveFileUrl(product.image) : '';
  return (
    <>
      <div className='relative size-8 shrink-0 overflow-hidden rounded bg-bg-weak-100'>
        {imageUrl ? (
          <img src={imageUrl} alt='' className='size-full object-cover' />
        ) : (
          <RiImageLine className='absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-text-soft-400' />
        )}
      </div>
      <div className='min-w-0 flex-1'>
        <p className='truncate text-paragraph-sm font-medium text-text-strong-950'>
          {product.name}
        </p>
        <p className='truncate text-paragraph-xs text-text-sub-500'>{product.brand}</p>
      </div>
    </>
  );
}

const AssetProductSelect = memo(
  ({ value = '', products = [], onValueChange, onCreateNew, className, isLoading = false }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredProducts = useMemo(() => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return products;

      return products.filter(
        (product) =>
          product.name?.toLowerCase().includes(query) ||
          product.brand?.toLowerCase().includes(query) ||
          product.code?.toLowerCase().includes(query),
      );
    }, [products, searchQuery]);

    const handleOpenChange = (open) => {
      if (!open) {
        setSearchQuery('');
      }
    };

    return (
      <Select.Root
        value={value}
        onValueChange={onValueChange}
        onOpenChange={handleOpenChange}
        matchTriggerWidth={false}
        variant='borderless'
      >
        <Select.Trigger
          className={cn(
            'h-8 min-h-8 min-w-0 w-full max-w-full rounded-lg bg-transparent px-1.5 py-0 text-paragraph-sm',
            '!border-0 !shadow-none !outline-none !ring-0',
            'before:!hidden',
            'hover:!bg-transparent hover:!shadow-none hover:!ring-0',
            'focus:!shadow-none focus:!outline-none focus:!ring-0',
            'data-[state=open]:!border-0 data-[state=open]:!shadow-none data-[state=open]:before:!hidden',
            'data-[state=open]:!ring-1 data-[state=open]:!ring-inset data-[state=open]:!ring-primary-base',
            'data-[placeholder]:text-text-soft-400 data-[placeholder]:opacity-100',
            className,
          )}
        >
          <Select.Value placeholder='Select' />
        </Select.Trigger>

        <Select.Content
          layout='searchable'
          sideOffset={4}
          className={cn(
            'w-[373px] min-w-[373px] max-w-[373px] rounded-2xl p-0',
            'shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]',
            '[&>button]:hidden',
            '[&>div]:gap-0 [&>div]:p-0',
          )}
        >
          <div className='border-b border-stroke-soft-200 p-2'>
            <Input.Root size='small' className='rounded-lg'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  placeholder='Search...'
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => event.stopPropagation()}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <div
            className='flex max-h-[240px] flex-col gap-0.5 overflow-y-auto p-2'
            onWheel={(event) => event.stopPropagation()}
          >
            {isLoading ? (
              <div className='px-2 py-6 text-center text-paragraph-sm text-text-soft-400'>
                Loading products...
              </div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <Select.Item
                  key={product.value}
                  value={product.value}
                  className='gap-2 p-2 pr-2 opacity-80 data-highlighted:opacity-100 [&>svg]:hidden'
                >
                  <ProductOption product={product} />
                </Select.Item>
              ))
            ) : (
              <div className='px-2 py-6 text-center text-paragraph-sm text-text-soft-400'>
                No products found
              </div>
            )}
          </div>

          <div className='border-t border-stroke-soft-200 p-2'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              className='w-full gap-0.5 p-1.5 font-medium text-text-sub-500 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onCreateNew?.();
              }}
            >
              <Button.Icon as={RiAddLine} />
              Create New
            </Button.Root>
          </div>
        </Select.Content>
      </Select.Root>
    );
  },
);

AssetProductSelect.displayName = 'AssetProductSelect';

export default AssetProductSelect;
