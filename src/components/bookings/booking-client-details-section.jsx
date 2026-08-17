import React from 'react';
import { RiUser2Line, RiUser2Fill, RiTokenSwapFill } from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';

const BookingClientDetailsSection = ({ booking, client }) => {
  const clientName =
    booking?.client_name || client?.customer_name || client?.name || booking?.client || '--';

  const phone = client?.phone || booking?.clientPhone || booking?.client_phone || '--';
  const email = client?.email || booking?.clientEmail || booking?.client_email || '--';

  const creditsUsed =
    (booking?.used_credits ?? booking?.creditsUsed ?? booking?.credits_used ?? booking?.credits) ||
    0;

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <RiUser2Line size={20} className='text-text-sub-500' />
          <span className='label-small text-text-sub-500'>Client Details</span>
        </div>
        {/* Credits Badge in Header */}
        <Badge.Root variant='light' color='gray' size='small'>
          <Badge.Icon as={RiTokenSwapFill} />
          {creditsUsed || 0} Credit Used
        </Badge.Root>
      </div>
      <div className='border border-stroke-soft-200 rounded-xl p-3 bg-white'>
        <div className='flex gap-3 items-center'>
          <div
            className='w-9 h-9 rounded-full flex items-center justify-center shrink-0'
            style={{
              background: 'linear-gradient(to bottom, #ffdac2, #fef3eb)',
            }}
          >
            <RiUser2Fill className='size-5' style={{ color: '#c2540a' }} />
          </div>
          <div className='flex-1 min-w-0'>
            <p className='text-label-sm text-text-main-900 mb-1'>{clientName}</p>
            <div className='flex items-center gap-1.5'>
              <p className='text-paragraph-xs text-text-sub-500'>{phone}</p>
              <span className='size-1 rounded-full bg-text-sub-500' />
              <p className='text-paragraph-xs text-text-sub-500'>{email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingClientDetailsSection;
