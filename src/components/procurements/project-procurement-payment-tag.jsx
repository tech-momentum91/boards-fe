import React from 'react';

export default function ProjectProcurementPaymentTag({ value }) {
  if (!value) return <span className='text-paragraph-sm text-text-soft-400'>—</span>;

  return (
    <span
      className='inline-block max-w-full truncate rounded-[6px] border border-[#d0d5dd] bg-white px-2 py-[3px] text-[12px] font-medium leading-[18px] text-[#344054]'
      title={String(value)}
    >
      {value}
    </span>
  );
}
