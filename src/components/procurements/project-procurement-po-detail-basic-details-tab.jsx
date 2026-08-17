import React from 'react';

import * as Tag from '@/components/ui/tag';
import { formatDateDisplay } from '@/utils/date-utils';

function DetailField({ label, children }) {
  return (
    <div className='flex min-h-[42px] min-w-0 flex-1 flex-col gap-1'>
      <span className='text-paragraph-sm tracking-[-0.084px] text-text-sub-500 opacity-72'>
        {label}
      </span>
      {children}
    </div>
  );
}

function DetailValue({ value }) {
  return (
    <span className='text-paragraph-sm font-medium tracking-[-0.084px] text-text-main-900'>
      {value ?? '—'}
    </span>
  );
}

function CategoryTag({ value }) {
  if (!value) return <DetailValue value={null} />;

  return (
    <Tag.Root
      variant='stroke'
      className='h-auto w-fit gap-1 self-start rounded-[6px] px-2 py-[3px] text-[12px] font-medium leading-[18px] text-[#344054] shadow-[0px_1px_1px_rgba(228,229,231,0.24)] ring-[#d0d5dd]'
    >
      {value}
    </Tag.Root>
  );
}

export default function ProjectProcurementPoDetailBasicDetailsTab({ details = {} }) {
  return (
    <div className='flex flex-col gap-5 pb-6'>
      <div className='flex gap-3'>
        <DetailField label='Package'>
          <DetailValue value={details.package} />
        </DetailField>
        <DetailField label='Category'>
          <CategoryTag value={details.category} />
        </DetailField>
      </div>

      <div className='flex gap-3'>
        <DetailField label='PO Date'>
          <DetailValue value={formatDateDisplay(details.po_date, '—')} />
        </DetailField>
        <DetailField label='PO Type'>
          <DetailValue value={details.po_type} />
        </DetailField>
      </div>

      <div className='flex gap-3'>
        <DetailField label='GST Type'>
          <DetailValue value={details.gst_type} />
        </DetailField>
        <DetailField label='Payment Template'>
          <DetailValue value={details.payment_template} />
        </DetailField>
      </div>
    </div>
  );
}
