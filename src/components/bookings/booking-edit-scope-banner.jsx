import React from 'react';
import { RiCloseLine, RiInformationFill } from 'react-icons/ri';
import {
  BOOKING_EDIT_SCOPE,
  EDIT_SCOPE_MESSAGES,
  EDIT_SCOPE_TOGGLE_OPTIONS,
} from '@/components/bookings/constants';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';

function BookingEditScopeBanner({ scope, onScopeChange, onDismiss }) {
  const showScopeToggle = scope === BOOKING_EDIT_SCOPE.THIS_ONLY;
  const message = EDIT_SCOPE_MESSAGES[scope];

  return (
    <div
      role='status'
      aria-live='polite'
      className='shrink-0 flex items-center justify-between gap-4 p-2 bg-[#C2D6FF] text-[#162664]'
    >
      <div className='flex items-center gap-2 min-w-0'>
        <RiInformationFill />
        <p className='text-paragraph-xs'>{message}</p>
      </div>

      <div className='flex items-center gap-3 shrink-0'>
        {showScopeToggle && (
          <div className='flex gap-2'>
            {EDIT_SCOPE_TOGGLE_OPTIONS.map((opt) => (
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                onClick={() => onScopeChange(opt.value)}
                key={opt.value}
              >
                {opt.label}
              </Button.Root>
            ))}
          </div>
        )}

        <CompactButton.Root onClick={onDismiss} variant='ghost'>
          <CompactButton.Icon as={RiCloseLine} />
        </CompactButton.Root>
      </div>
    </div>
  );
}

export default BookingEditScopeBanner;
