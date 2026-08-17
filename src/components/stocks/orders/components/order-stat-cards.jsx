import React, { memo } from 'react';
import { RiAlertFill, RiCheckboxCircleFill, RiEdit2Fill, RiShoppingCartFill } from 'react-icons/ri';

const CARDS = [
  { key: 'total', label: 'Total Orders', Icon: RiShoppingCartFill, color: '#6E3FF3' },
  { key: 'draft', label: 'Draft', Icon: RiEdit2Fill, color: '#525866' },
  { key: 'partial', label: 'Partial', Icon: RiAlertFill, color: '#F17B2C' },
  { key: 'fullyReceived', label: 'Fully Received', Icon: RiCheckboxCircleFill, color: '#36A736' },
];

const OrderStatCards = memo(({ total, draft, partial, fullyReceived }) => {
  const values = { total, draft, partial, fullyReceived };

  return (
    <div className='grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
      {CARDS.map((def) => {
        const Icon = def.Icon;
        return (
          <div
            key={def.key}
            className='flex min-w-0 flex-col gap-0 overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-weak-100 px-4 py-3'
          >
            <div className='flex w-full items-center gap-4'>
              <div className='flex min-w-0 flex-1 flex-col gap-1'>
                <div className='text-[20px] font-medium leading-7 text-text-main-900'>
                  {values[def.key]}
                </div>
                <div className='text-[12px] font-medium uppercase leading-4 text-text-sub-500 opacity-72 [font-family:var(--font-figtree,Figtree),ui-sans-serif,sans-serif] tracking-[0.48px]'>
                  {def.label}
                </div>
              </div>
              <div
                className='flex size-8 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 p-1.5 shadow-[0px_2px_4px_0px_rgba(27,28,29,0.04)]'
                aria-hidden
              >
                <Icon className='size-5 text-text-sub-600' color={def.color} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

OrderStatCards.displayName = 'OrderStatCards';

export default OrderStatCards;
