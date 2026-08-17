import React from 'react';
import { RiBuildingLine, RiUserLine } from 'react-icons/ri';

import * as Tag from '@/components/ui/tag';
import { cn } from '@/utils/cn';

function MetaItem({ icon: Icon, children, className }) {
  return (
    <div className={cn('flex min-w-0 items-center', className)}>
      <div className='flex min-w-0 items-center gap-1.5'>
        <Icon className='size-4 shrink-0 text-text-sub-500' aria-hidden />
        <div className='min-w-0 truncate'>{children}</div>
      </div>
    </div>
  );
}

function MediaPreviewCaption({
  title,
  clientLabel,
  centerName,
  floor,
  centerCode,
  tags = [],
  pageIndex = 0,
  pageTotal = 1,
  className,
}) {
  const visibleTags = Array.isArray(tags) ? tags.filter(Boolean) : [];
  const showCounter = pageTotal > 1;

  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-col overflow-hidden rounded-2xl bg-bg-white-0',
        className,
      )}
    >
      <div
        className={cn(
          'relative flex w-full min-w-0 items-center gap-2 px-4 py-3',
          showCounter && 'pr-16',
        )}
      >
        <p className='shrink-0 text-label-md font-semibold leading-6 text-text-main-900'>{title}</p>

        <div className='flex min-w-0 flex-1 items-center gap-3 overflow-hidden'>
          {clientLabel ? (
            <MetaItem icon={RiUserLine} className='max-w-[45%] shrink'>
              <p className='truncate text-label-xs font-medium leading-4 text-text-sub-500 capitalize'>
                {clientLabel}
              </p>
            </MetaItem>
          ) : null}

          {centerName ? (
            <MetaItem icon={RiBuildingLine} className='min-w-0 flex-1'>
              <p className='truncate text-label-xs font-medium leading-4'>
                <span className='text-text-sub-500 capitalize'>{centerName}</span>
                {floor ? (
                  <span className='text-text-sub-500 capitalize'>{`, ${floor}`}</span>
                ) : null}
                {centerCode ? <span className='text-text-soft-400'> ({centerCode})</span> : null}
              </p>
            </MetaItem>
          ) : null}
        </div>

        {showCounter ? (
          <Tag.Root
            variant='stroke'
            className='absolute right-2.5 top-2.5 h-7 shrink-0 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
            aria-live='polite'
          >
            {pageIndex + 1}/{pageTotal}
          </Tag.Root>
        ) : null}
      </div>

      {visibleTags.length > 0 ? (
        <div className='flex w-full flex-wrap items-center gap-1.5 border-t border-stroke-soft-200 bg-[rgba(246,248,250,0.8)] px-4 py-2.5'>
          {visibleTags.map((tag) => (
            <Tag.Root key={tag} variant='stroke' className='h-[22px] shrink-0'>
              {tag}
            </Tag.Root>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default MediaPreviewCaption;
