import React, { memo } from 'react';
import { RiArrowDownSLine, RiRadioButtonLine } from 'react-icons/ri';

import { cn } from '@/utils/cn';

const AumAssetGroupDivider = memo(
  ({
    name,
    depth = 0,
    expanded = true,
    onToggle,
    badge,
    trailing,
    trailingClassName,
    className,
  }) => {
    const indentStyle = { paddingLeft: `${depth * 26}px` };

    return (
      <button
        type='button'
        onClick={onToggle}
        style={indentStyle}
        className={cn(
          'relative flex min-h-10 w-full items-center border-t border-stroke-soft-200 py-1.5 text-left',
          trailingClassName ?? (trailing ? 'pr-0' : 'pr-4'),
          className,
        )}
        aria-expanded={expanded}
      >
        <span className='flex min-w-0 items-center gap-1.5'>
          <RiRadioButtonLine className='size-[18px] shrink-0 text-text-soft-400' aria-hidden />
          <span className='truncate text-label-sm font-semibold text-text-sub-500'>{name}</span>
          {badge ? (
            <span className='inline-flex shrink-0 items-center rounded-full border border-stroke-soft-200 bg-bg-white-0 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.22px] text-text-sub-500'>
              {badge}
            </span>
          ) : null}
          <span className={expanded ? '-scale-y-100' : undefined}>
            <RiArrowDownSLine className='size-5 shrink-0 text-text-sub-500' aria-hidden />
          </span>
        </span>

        {trailing ? (
          <div className='sticky right-0 z-10 ml-auto flex shrink-0 items-center bg-bg-white-0 pl-3'>
            {trailing}
          </div>
        ) : null}
      </button>
    );
  },
);

AumAssetGroupDivider.displayName = 'AumAssetGroupDivider';

export default AumAssetGroupDivider;
