import React, { useMemo } from 'react';
import { RiMoneyDollarCircleLine, RiPriceTag3Line } from 'react-icons/ri';

import ProductDetailDescription from '@/components/products/product-detail-description';
import { ProductDetailPropertyCard } from '@/components/products/product-detail-property-card';
import {
  buildPackageMetaLabel,
  formatPackageGstRate,
  formatPackageMoq,
  getProductCategoryFieldValues,
} from '@/components/products/product-package/product-package-utils';
import {
  PackageDetailField,
  PackageDetailFieldGrid,
} from '@/components/products/product-package/product-package-detail-fields';
import { formatProductPrice } from '@/components/products/products-price-utils';
import { cn } from '@/utils/cn';

export default function ProductPackageDetailHeroPanel({ product, onProductUpdated }) {
  const metaLabel = useMemo(() => buildPackageMetaLabel(product), [product]);
  const categories = useMemo(() => getProductCategoryFieldValues(product), [product]);

  const specificationText =
    product.specificationNotes || 'No package specification has been added.';

  const isInactive = product.status === 'Inactive';

  return (
    <section className='relative overflow-hidden rounded-2xl border border-black/10 p-7'>
      <div
        className='pointer-events-none absolute inset-0 rounded-2xl mix-blend-luminosity'
        style={{
          backgroundImage:
            'linear-gradient(166deg, #ecfdf5 0%, #ffffff 50%, rgba(209, 250, 229, 0.7) 100%)',
        }}
        aria-hidden
      />

      <div className='relative z-10 flex flex-col gap-3'>
        <div className='flex flex-col gap-1'>
          <h1 className='text-[18px] font-semibold leading-7 text-[#0a0a0a]'>{product.name}</h1>
          <div className='flex flex-wrap items-start gap-2'>
            <span
              className={cn(
                'inline-flex items-center rounded-md border px-2 py-[3px] text-label-xs font-medium',
                isInactive
                  ? 'border-error-base/30 bg-error-lighter text-error-base'
                  : 'border-success-base/30 bg-success-lighter text-success-base',
              )}
            >
              {product.status || 'Active'}
            </span>
            {metaLabel ? (
              <span className='inline-flex items-center rounded-md border border-stroke-soft-200 bg-bg-white-0 px-2 py-[3px] text-label-xs font-medium text-text-sub-600'>
                {metaLabel}
              </span>
            ) : null}
          </div>
        </div>

        <ProductDetailDescription
          productId={product.id}
          description={product.description}
          onProductUpdated={onProductUpdated}
        />

        <PackageDetailFieldGrid columns={4}>
          <PackageDetailField label='Category Group' value={categories.categoryGroup} />
          <PackageDetailField label='Category Type' value={categories.categoryType} />
          <PackageDetailField label='Product Group' value={categories.productGroup} />
          <PackageDetailField label='Product Type' value={categories.productType} />
        </PackageDetailFieldGrid>

        <div className='flex w-full gap-2.5 py-1'>
          <ProductDetailPropertyCard
            value={formatProductPrice(product, true)}
            label='Purchase Price'
            icon={RiPriceTag3Line}
            tone='white'
          />
          <ProductDetailPropertyCard
            value={formatProductPrice(product, false)}
            label='Selling Price'
            icon={RiMoneyDollarCircleLine}
            tone='white'
          />
          <ProductDetailPropertyCard
            value={formatPackageGstRate(product.gstRate)}
            label='GST Rate'
            icon={RiMoneyDollarCircleLine}
            tone='white'
          />
          <ProductDetailPropertyCard
            value={formatPackageMoq(product)}
            label='MOQ'
            icon={RiMoneyDollarCircleLine}
            tone='white'
          />
        </div>

        <div className='flex flex-col gap-2'>
          <h2 className='text-[11px] font-normal uppercase leading-[16.5px] tracking-[1.1px] text-[#737373]'>
            Package Specification
          </h2>
          <p className='text-label-sm font-normal leading-5 text-text-sub-500'>
            {specificationText}
          </p>
        </div>
      </div>
    </section>
  );
}
