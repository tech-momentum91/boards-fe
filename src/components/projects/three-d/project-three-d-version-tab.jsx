import React from 'react';
import { cn } from '@/utils/cn';

const VERSION_TAB_CLIP = 'polygon(0 0, calc(100% - 10px) 0, 100% 100%, 0 100%)';

export default function ProjectThreeDVersionTab({ version, isActive = false, onClick, className }) {
  return (
    <button
      type='button'
      onClick={onClick}
      style={{ clipPath: VERSION_TAB_CLIP }}
      className={cn(
        'relative -mr-1.5 shrink-0 py-1.5 pl-3 pr-5 text-label-sm transition first:ml-0',
        'rounded-tl-md rounded-tr-md',
        isActive
          ? 'z-10 mb-[-1px] bg-neutral-800 pb-[calc(0.375rem+1px)] text-text-white-0'
          : 'bg-[#2d313d] text-text-soft-400 hover:text-text-white-0',
        className,
      )}
    >
      {version}
    </button>
  );
}
