import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  RiArrowRightSLine,
  RiHammerLine,
  RiMoneyDollarCircleLine,
  RiPercentLine,
  RiPriceTag3Line,
  RiRuler2Line,
} from 'react-icons/ri';

import {
  resolveBoqPurchasePriceBounds,
  resolveBoqSellingPriceBounds,
} from '@/components/boq/boq-templates/components/boq-template-product-master-utils';
import BoqErStatusDropdown from '@/components/boq/shared/boq-er-status-dropdown';
import { BOQ_ER_STATUS } from '@/components/boq/shared/boq-er-utils';
import { cn } from '@/utils/cn';

const formatRupeeSpaced = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₹ 0';
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
};

const SpecLabelCell = ({ icon: Icon, label }) => (
  <div className='flex h-10 w-[140px] shrink-0 items-center gap-1.5 border-r border-stroke-soft-200 bg-[rgba(246,248,250,0.6)] pl-4'>
    <Icon className='size-5 shrink-0 text-text-main-900' aria-hidden />
    <span className='text-[14px] font-medium leading-5 tracking-[-0.084px] text-text-main-900'>
      {label}
    </span>
  </div>
);

const QuantityUnitsValue = ({ children }) => (
  <div className='flex h-8 w-full items-center rounded-lg bg-bg-white-0 pl-2 pr-1.5 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
    <div className='inline-flex items-center rounded-lg bg-bg-weak-100 p-1.5'>
      <span className='px-1 text-[14px] font-medium leading-5 tracking-[-0.084px] text-text-sub-500'>
        {children}
      </span>
      <RiArrowRightSLine className='size-5 shrink-0 rotate-90 text-text-sub-500' aria-hidden />
    </div>
  </div>
);

const DropdownValue = ({ children, valueClassName }) => (
  <div className='relative flex h-8 w-full items-center rounded-lg bg-bg-white-0 py-1.5 pl-2 pr-1.5'>
    <span
      className={cn(
        'min-w-0 flex-1 truncate text-[14px] font-normal leading-5 tracking-[-0.084px] text-text-main-900',
        valueClassName,
      )}
    >
      {children}
    </span>
  </div>
);

const SpecRowPair = ({ left, right }) => (
  <div className='flex w-full border-b border-stroke-soft-200'>
    <div className='flex h-10 min-w-0 flex-1 border-r border-stroke-soft-200'>{left}</div>
    <div className='flex h-10 min-w-0 flex-1'>{right}</div>
  </div>
);

const SpecCell = ({ label, icon, children }) => (
  <div className='flex min-w-0 flex-1 items-center'>
    <SpecLabelCell icon={icon} label={label} />
    <div className='flex min-w-0 flex-1 items-center px-2'>{children}</div>
  </div>
);

const ProductDescription = ({ description }) => {
  const textRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);

  const measureTruncation = useCallback(() => {
    const node = textRef.current;
    if (!node || isExpanded) {
      setIsTruncated(false);
      return;
    }
    setIsTruncated(node.scrollHeight > node.clientHeight + 1);
  }, [isExpanded]);

  useEffect(() => {
    setIsExpanded(false);
  }, [description]);

  useEffect(() => {
    measureTruncation();
  }, [description, measureTruncation]);

  useEffect(() => {
    const node = textRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(() => measureTruncation());
    observer.observe(node);
    return () => observer.disconnect();
  }, [measureTruncation]);

  if (!description) return null;

  const showToggle = isTruncated || isExpanded;

  return (
    <div className='text-[14px] font-normal leading-5 tracking-[-0.084px] text-text-sub-500'>
      <p ref={textRef} className={cn(!isExpanded && 'line-clamp-2')}>
        {description}
      </p>
      {showToggle ? (
        <button
          type='button'
          className='mt-0.5 text-primary-base'
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? 'View Less' : 'View More'}
        </button>
      ) : null}
    </div>
  );
};

const BoqErEstimationProductPanel = ({
  product,
  quantityLabel = '',
  erStatus = BOQ_ER_STATUS.IN_PROGRESS,
  onErStatusChange,
  erStatusDisabled = false,
}) => {
  const purchaseBounds = resolveBoqPurchasePriceBounds(product);
  const sellingBounds = resolveBoqSellingPriceBounds(product);
  const purchaseRate = Number(product.purchaseRate ?? purchaseBounds.min) || purchaseBounds.min;
  const sellingRate = Number(product.sellingRate ?? sellingBounds.max) || sellingBounds.max;
  const marginPercent =
    sellingRate > 0 ? Math.round(((sellingRate - purchaseRate) / sellingRate) * 100) : 0;

  return (
    <div className='flex w-full flex-col gap-5 px-8 pb-5 pt-8'>
      <div className='flex w-full max-w-[640px] flex-col gap-3'>
        <div className='flex flex-col gap-3'>
          <div className='flex flex-wrap items-center gap-2'>
            {product.brand ? (
              <span className='inline-flex items-center rounded-[6px] border border-[#d0d5dd] px-2.5 py-1 text-[14px] font-medium leading-5 text-[#344054]'>
                {product.brand}
              </span>
            ) : null}
            <BoqErStatusDropdown
              status={erStatus}
              onStatusChange={onErStatusChange}
              disabled={erStatusDisabled}
            />
          </div>
          <h2 className='text-[24px] font-semibold leading-8 text-text-main-900'>
            {product.product || 'Untitled product'}
          </h2>
        </div>
        <ProductDescription description={product.description} />
      </div>

      <div className='w-full max-w-[640px] overflow-hidden rounded-xl border border-stroke-soft-200'>
        <SpecRowPair
          left={
            <SpecCell label='Quantity' icon={RiRuler2Line}>
              <QuantityUnitsValue>{quantityLabel || '—'}</QuantityUnitsValue>
            </SpecCell>
          }
          right={
            <SpecCell label='Units' icon={RiPriceTag3Line}>
              <QuantityUnitsValue>{product.units || 'Sqft'}</QuantityUnitsValue>
            </SpecCell>
          }
        />
        <SpecRowPair
          left={
            <SpecCell label='Purchase' icon={RiMoneyDollarCircleLine}>
              <DropdownValue>{formatRupeeSpaced(purchaseRate)}</DropdownValue>
            </SpecCell>
          }
          right={
            <SpecCell label='Selling' icon={RiMoneyDollarCircleLine}>
              <DropdownValue>{formatRupeeSpaced(sellingRate)}</DropdownValue>
            </SpecCell>
          }
        />
        <SpecRowPair
          left={
            <SpecCell label='Margin %' icon={RiPercentLine}>
              <DropdownValue valueClassName='text-[#079455]'>{marginPercent}%</DropdownValue>
            </SpecCell>
          }
          right={
            <SpecCell label='Make' icon={RiHammerLine}>
              <DropdownValue>{product.make || 'NA'}</DropdownValue>
            </SpecCell>
          }
        />
      </div>
    </div>
  );
};

export default memo(BoqErEstimationProductPanel);
