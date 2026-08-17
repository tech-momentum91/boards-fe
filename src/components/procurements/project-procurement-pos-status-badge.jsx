import React from 'react';

import { PROJECT_PROCUREMENT_POS_STATUS_BADGE_STYLES } from '@/components/procurements/constants';
import { cn } from '@/utils/cn';

function resolveStatusStyleKey(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll('_', ' ');

  if (!normalized) return '';
  if (PROJECT_PROCUREMENT_POS_STATUS_BADGE_STYLES[normalized]) return normalized;

  if (normalized.includes('pending') && normalized.includes('appro')) {
    return 'pending approval';
  }
  if (normalized === 'submitted' || normalized.includes('releas')) {
    return 'released';
  }
  if (normalized.includes('draft')) return 'draft';
  if (normalized.includes('cancel')) return 'cancelled';

  return normalized;
}

export default function ProjectProcurementPosStatusBadge({ value }) {
  if (value == null || value === '') {
    return <span className='text-paragraph-sm text-text-soft-400'>—</span>;
  }

  const label = String(value).trim();
  const styleKey = resolveStatusStyleKey(label);

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-full px-2 py-[2px] text-[11px] font-medium uppercase leading-[12px] tracking-[0.22px]',
        PROJECT_PROCUREMENT_POS_STATUS_BADGE_STYLES[styleKey] ?? 'bg-bg-weak-100 text-text-sub-500',
      )}
      title={label}
    >
      {label}
    </span>
  );
}
