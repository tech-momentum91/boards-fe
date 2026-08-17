import React from 'react';
import {
  RiDeleteBinLine,
  RiDownloadLine,
  RiImageLine,
  RiLinkM,
  RiMoneyDollarCircleLine,
  RiPriceTag3Line,
} from 'react-icons/ri';

import ProductDetailDescription from '@/components/products/product-detail-description';
import { ProductDetailPropertyCard } from '@/components/products/product-detail-property-card';
import { formatStockProductPrice } from '@/components/products/product-detail-stock';
import { formatProductPrice } from '@/components/products/products-price-utils';
import { formatJobRate, isJobProductType } from '@/components/products/products-job-pricing';
import * as CompactButton from '@/components/ui/compact-button';
import * as FileFormatIcon from '@/components/ui/file-format-icon';
import { formatFileSize } from '@/utils/file-utils';
import { showSuccessToast } from '@/utils/error-utils';
import { getVariationThumbnailUrl } from '@/components/products/variation-media';
import { cn } from '@/utils/cn';

export default function ProductDetailHeroPanel({
  product,
  isStockView = false,
  showVariations = true,
  selectedVariationId = null,
  onVariationSelect,
  onBrochureDelete,
  isRemovingBrochure = false,
  onProductUpdated,
  onDescriptionSaved,
}) {
  const metaParts = [
    product.productCode,
    product.category || product.categoryType,
    product.productType,
    isStockView ? product.customType : null,
  ].filter(Boolean);

  const brochureFile = product.brochure
    ? {
        fileName: product.brochure.name,
        size: product.brochure.size,
      }
    : null;

  const purchasePriceValue = isStockView
    ? formatStockProductPrice(product)
    : formatProductPrice(product, true);
  const sellingPriceValue = formatProductPrice(product, false);
  const isJob = isJobProductType(product.devxProductType);
  const totalRateValue = formatJobRate(product.minPurchasePrice || product.maxPurchasePrice);

  return (
    <div className='flex min-h-0 min-w-0 flex-1 flex-col justify-center bg-bg-white-0 p-6 lg:overflow-y-auto'>
      <div className='flex w-full flex-col gap-5'>
        {/* Badges, title, description, link */}
        <div className='flex flex-col gap-4'>
          <div className='flex flex-wrap items-start gap-2'>
            <span className='inline-flex items-center rounded-md border border-success-base/30 bg-success-lighter px-2 py-[3px] text-label-xs font-medium text-success-base'>
              {product.status || 'Active'}
            </span>
            {metaParts.length > 0 ? (
              <span className='inline-flex items-center rounded-md border border-stroke-soft-200 bg-bg-white-0 px-2 py-[3px] text-label-xs font-medium text-text-sub-600'>
                {metaParts.join(' · ')}
              </span>
            ) : null}
          </div>

          <div className='flex flex-col gap-2.5'>
            <h1 className='text-[23.574px] font-semibold leading-[28px] text-[#101828]'>
              {product.name}
            </h1>
            <ProductDetailDescription
              productId={product.id}
              description={product.description}
              onProductUpdated={onProductUpdated}
              onDescriptionSaved={onDescriptionSaved}
            />
            {product.website && !isStockView ? (
              <div className='flex items-center gap-2'>
                <RiLinkM className='size-5 shrink-0 text-text-sub-500' aria-hidden />
                <a
                  href={product.website}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='truncate text-label-sm font-medium text-text-sub-500 underline decoration-solid underline-offset-2 hover:text-primary-base'
                >
                  {product.website}
                </a>
              </div>
            ) : null}
          </div>
        </div>

        {/* Property cards */}
        <div className='flex w-full gap-2.5'>
          <ProductDetailPropertyCard
            value={product.brand || '--'}
            label='Brand'
            icon={RiPriceTag3Line}
          />
          {isJob ? (
            <ProductDetailPropertyCard
              value={totalRateValue}
              label='Total Rate'
              icon={RiMoneyDollarCircleLine}
            />
          ) : (
            <ProductDetailPropertyCard
              value={purchasePriceValue}
              label={isStockView ? 'Price' : 'Purchase Price'}
              icon={RiMoneyDollarCircleLine}
            />
          )}
          {!isStockView ? (
            <ProductDetailPropertyCard
              value={sellingPriceValue}
              label='Selling Price'
              icon={RiMoneyDollarCircleLine}
            />
          ) : null}
        </div>

        {/* Brochure */}
        {!isStockView && brochureFile ? (
          <BrochureCard
            fileName={brochureFile.fileName}
            size={brochureFile.size}
            onDownload={() => {
              if (product.brochure?.url) {
                window.open(product.brochure.url, '_blank', 'noopener,noreferrer');
                return;
              }
              showSuccessToast(`Downloading ${brochureFile.fileName}...`);
            }}
            onDelete={onBrochureDelete}
            isDeleting={isRemovingBrochure}
          />
        ) : null}

        {/* Variations */}
        {showVariations && product.variations?.length ? (
          <div className='flex w-full flex-col gap-1'>
            <h3 className='text-label-md font-semibold text-text-main-900'>Variations</h3>
            <div className='flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]'>
              {product.variations.map((variation) => (
                <VariationItem
                  key={variation.id}
                  variation={variation}
                  isSelected={selectedVariationId === variation.id}
                  onSelect={() => onVariationSelect?.(variation)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BrochureCard({ fileName, size, onDownload, onDelete, isDeleting = false }) {
  return (
    <div className='w-full rounded-xl border border-stroke-soft-200 bg-[rgba(246,248,250,0.6)] py-3 pl-3.5 pr-4 shadow-regular-xs'>
      <div className='flex items-center gap-3'>
        <FileFormatIcon.Root format='pdf' size='xsmall' color='red' className='!size-6 shrink-0' />
        <div className='flex min-w-0 flex-1 items-center gap-1'>
          <span className='truncate text-label-sm font-medium text-text-main-900'>{fileName}</span>
          {size ? (
            <span className='shrink-0 text-paragraph-xs text-text-sub-500'>
              {formatFileSize(size)}
            </span>
          ) : null}
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          <CompactButton.Root
            variant='ghost'
            size='medium'
            onClick={onDownload}
            disabled={isDeleting}
            aria-label='Download brochure'
            className='p-0.5'
          >
            <CompactButton.Icon as={RiDownloadLine} />
          </CompactButton.Root>
          <CompactButton.Root
            variant='ghost'
            size='medium'
            onClick={onDelete}
            disabled={isDeleting || !onDelete}
            aria-label='Delete brochure'
            className='p-0.5'
          >
            <CompactButton.Icon as={RiDeleteBinLine} />
          </CompactButton.Root>
        </div>
      </div>
    </div>
  );
}

function VariationItem({ variation, isSelected = false, onSelect }) {
  const thumbnailUrl = getVariationThumbnailUrl(variation);

  return (
    <button
      type='button'
      onClick={onSelect}
      className='w-[82px] shrink-0 text-left'
      aria-pressed={isSelected}
      aria-label={`View media for ${variation.name || 'variation'}`}
    >
      <div className='relative mb-0 pt-1.5'>
        <div
          className={cn(
            'flex size-[76px] items-center justify-center overflow-hidden rounded-lg',
            'border bg-bg-weak-100 shadow-regular-xs transition-colors',
            isSelected
              ? 'border-primary-base ring-2 ring-primary-base/30'
              : 'border-stroke-soft-200 hover:border-stroke-sub-300',
          )}
        >
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={variation.name} className='size-full object-cover' />
          ) : (
            <RiImageLine className='size-5 text-text-soft-400' />
          )}
        </div>
      </div>
      <p
        className={cn(
          'mt-0 truncate text-label-sm font-medium opacity-72',
          isSelected ? 'text-text-main-900' : 'text-text-sub-500',
        )}
      >
        {variation.name}
      </p>
    </button>
  );
}
