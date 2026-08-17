import React, { memo } from 'react';

import { formatBoqCompactRupeeAmount } from '@/components/boq/boq-templates/components/boq-template-product-master-utils';
import { cn } from '@/utils/cn';

const formatMarginPercent = (value) => {
  const percent = Number(value);
  if (!Number.isFinite(percent)) return '0%';
  const rounded = Math.round(percent * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
};

const formatPoCount = (value) => {
  const count = Number(value);
  if (!Number.isFinite(count)) return '0';
  return String(Math.max(0, Math.round(count)));
};

const SUMMARY_FIELDS = [
  { key: 'buyTotal', label: 'Buy', format: formatBoqCompactRupeeAmount },
  { key: 'sellTotal', label: 'Sell', format: formatBoqCompactRupeeAmount },
  { key: 'marginTotal', label: 'Margin', format: formatBoqCompactRupeeAmount },
  {
    key: 'marginPercent',
    label: 'Margin %',
    format: formatMarginPercent,
  },
  { key: 'total', label: 'Total', format: formatBoqCompactRupeeAmount },
  { key: 'poCount', label: 'PO', format: formatPoCount },
  { key: 'poTotal', label: 'PO', format: formatBoqCompactRupeeAmount },
  { key: 'pendingTotal', label: 'Pending', format: formatBoqCompactRupeeAmount },
];

const SUMMARY_FIELDS_BY_VARIANT = {
  full: ['buyTotal', 'sellTotal', 'marginTotal', 'marginPercent'],
  'buy-only': ['buyTotal', 'marginTotal', 'marginPercent'],
  'sell-only': ['sellTotal', 'marginTotal', 'marginPercent'],
  'margin-percent-only': ['marginPercent'],
  'purchase-boq': ['total', 'poTotal', 'pendingTotal'],
};

const CHIP_VARIANTS = {
  dark: {
    chip: 'bg-white/10 text-[#eaf2ec]',
    label: 'text-[#a9c7b6]',
    value: 'text-[#eaf2ec]',
  },
  light: {
    chip: 'border border-stroke-soft-200 bg-bg-weak-100',
    label: 'text-text-soft-400',
    value: 'text-text-sub-500',
  },
};

const BoqFinancialSummaryChips = memo(
  ({
    buyTotal = 0,
    sellTotal = 0,
    marginTotal = 0,
    marginPercent = 0,
    total,
    poCount = 0,
    poTotal,
    pendingTotal,
    variant = 'light',
    className,
    summaryVariant = 'full',
  }) => {
    const styles = CHIP_VARIANTS[variant] ?? CHIP_VARIANTS.light;
    const resolvedTotal = total ?? buyTotal;
    const resolvedPoTotal = poTotal ?? poCount ?? 0;
    const resolvedPending = pendingTotal ?? resolvedTotal;
    const values = {
      buyTotal,
      sellTotal,
      marginTotal,
      marginPercent,
      total: resolvedTotal,
      poCount,
      poTotal: resolvedPoTotal,
      pendingTotal: resolvedPending,
    };
    const visibleFieldKeys =
      SUMMARY_FIELDS_BY_VARIANT[summaryVariant] ?? SUMMARY_FIELDS_BY_VARIANT.full;

    return (
      <div className={cn('flex shrink-0 items-center gap-[6px]', className)}>
        {SUMMARY_FIELDS.filter((field) => visibleFieldKeys.includes(field.key)).map(
          ({ key, label, format }) => (
            <div key={key} className={cn('shrink-0 rounded-[4px] px-[7px] py-[5px]', styles.chip)}>
              <div className='flex items-center gap-[4px] whitespace-nowrap font-bold'>
                <span
                  className={cn(
                    'text-[9px] uppercase leading-normal tracking-[0.72px]',
                    styles.label,
                  )}
                >
                  {label}
                </span>
                <span className={cn('text-[12px] leading-normal', styles.value)}>
                  {format(values[key])}
                </span>
              </div>
            </div>
          ),
        )}
      </div>
    );
  },
);

BoqFinancialSummaryChips.displayName = 'BoqFinancialSummaryChips';

export default BoqFinancialSummaryChips;
