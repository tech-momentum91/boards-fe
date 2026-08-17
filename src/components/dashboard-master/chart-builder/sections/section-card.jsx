import React, { useState } from 'react';
import { RiArrowDownSLine } from 'react-icons/ri';

/**
 * Collapsible accordion row for the Chart Builder right panel.
 * Matches Figma: flat rows with bottom border, chevron toggle.
 */
export default function SectionCard({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className='border-b border-stroke-soft-200'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-bg-weak-50'
      >
        <span className='label-small text-text-sub-500'>{title}</span>
        <RiArrowDownSLine
          className={`size-5 text-text-sub-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className='flex flex-col gap-4 px-5 pb-6 pt-1'>{children}</div>}
    </div>
  );
}
