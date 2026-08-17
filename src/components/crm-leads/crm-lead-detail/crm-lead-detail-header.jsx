import React from 'react';
import { RiArrowLeftLine } from 'react-icons/ri';
import * as Button from '@/components/ui/button';

const CrmLeadDetailHeader = ({ lead, onBack }) => {
  const name = lead?.lead_name || lead?.name || '--';
  const contactSubtitle = String(lead?.contact_display_name || '').trim() || lead?.contact || '';

  return (
    <div className='flex h-[88px] shrink-0 items-center justify-between border-b border-stroke-soft-200 px-6 py-5'>
      <div className='flex flex-1 items-center gap-4'>
        <Button.Root
          variant='neutral'
          mode='stroke'
          size='xsmall'
          onClick={onBack}
          className='shrink-0'
        >
          <Button.Icon as={RiArrowLeftLine} />
        </Button.Root>
        <div className='flex flex-col gap-1'>
          <h1 className='text-title-h5 text-text-main-900'>{name}</h1>
          {(lead?.account || contactSubtitle) && (
            <div className='flex items-center gap-2 text-paragraph-sm text-text-sub-500'>
              {lead.account && <span>{lead.account}</span>}
              {lead.account && contactSubtitle && <span>·</span>}
              {contactSubtitle && <span>{contactSubtitle}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrmLeadDetailHeader;
