import React from 'react';
import { RiLayoutGridLine } from 'react-icons/ri';

import * as Badge from '@/components/ui/badge';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';

function formatCarpetArea(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return '—';
  const numeric = Number(normalized.replaceAll(',', ''));
  if (Number.isFinite(numeric)) {
    return `${numeric.toLocaleString('en-IN')} Sqft`;
  }
  return `${normalized} Sqft`;
}

function areaTypeBadgeColor(areaType) {
  const normalized = String(areaType ?? '').toLowerCase();
  if (normalized.includes('managed')) return 'purple';
  if (normalized.includes('breakout')) return 'orange';
  if (normalized.includes('meeting')) return 'blue';
  if (normalized.includes('reception')) return 'green';
  return 'gray';
}

export function ProjectLayoutAreaInfoContent({ annotation }) {
  const areaLabel = annotation?.area_label ?? annotation?.label ?? 'Untitled area';
  const areaType = annotation?.area_type ?? 'Area';
  const carpetArea = annotation?.carpet_area ?? '';

  return (
    <div className='space-y-3'>
      <Badge.Root size='small' variant='light' color={areaTypeBadgeColor(areaType)}>
        {String(areaType).toUpperCase()}
      </Badge.Root>

      <h3 className='text-title-h6 text-text-main-900'>{areaLabel}</h3>

      <div className='flex items-center gap-2 text-paragraph-sm text-text-sub-500'>
        <RiLayoutGridLine className='size-4 shrink-0 text-text-soft-400' />
        <span>{formatCarpetArea(carpetArea)}</span>
      </div>
    </div>
  );
}

export default function ProjectLayoutAreaInfoPopover({
  annotation,
  open = false,
  onOpenChange,
  anchorStyle,
  className,
}) {
  if (!annotation) return null;

  const areaLabel = annotation?.area_label ?? annotation?.label ?? 'Untitled area';

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      {anchorStyle ? (
        <Popover.Anchor asChild>
          <div style={anchorStyle} className='pointer-events-none size-0' aria-hidden />
        </Popover.Anchor>
      ) : (
        <Popover.Trigger asChild>
          <button
            type='button'
            className={cn(
              'flex size-8 cursor-pointer items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0/95 text-text-sub-600 shadow-regular-xs hover:bg-bg-weak-50',
              className,
            )}
            aria-label={`View details for ${areaLabel}`}
          />
        </Popover.Trigger>
      )}
      <Popover.Content align='center' side='right' className='w-[280px] p-4'>
        <ProjectLayoutAreaInfoContent annotation={annotation} />
      </Popover.Content>
    </Popover.Root>
  );
}
