import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiArrowRightSLine,
  RiBox3Line,
  RiMoneyDollarCircleLine,
  RiPaletteLine,
  RiSettings3Line,
} from 'react-icons/ri';

import {
  billingCategoriesPath,
  opexCategoriesPath,
  productCategoriesPath,
} from '@/pages/profile/categories-master-paths';
import { cn } from '@/utils/cn';

/** Hub cards — set `path` when the category section route exists. */
const CATEGORIES_MASTER_CARDS = [
  {
    path: opexCategoriesPath(),
    title: 'OPEX',
    description: 'Operational expense categories',
    icon: RiSettings3Line,
  },
  {
    path: billingCategoriesPath(),
    title: 'Billing',
    description: 'Billing and payment categories',
    icon: RiMoneyDollarCircleLine,
  },
  {
    path: productCategoriesPath(),
    title: 'Product',
    description: 'Product categories',
    icon: RiBox3Line,
  },
  {
    title: 'Material',
    description: 'Material categories',
    icon: RiPaletteLine,
  },
];

/**
 * Settings &gt; Categories Master landing (`/settings/categories-master`).
 */
export default function CategoriesMasterLanding() {
  const navigate = useNavigate();

  const handleCardNavigate = useCallback(
    (path) => {
      if (path) navigate(path);
    },
    [navigate],
  );

  return (
    <div className='mt-6 flex w-full flex-col gap-6'>
      <div className='flex flex-col'>
        <h2 className='text-title-xl text-text-main-900'>Categories Master</h2>
        <p className='paragraph-small text-text-sub-500'>
          Configure all system level categories from here.
        </p>
      </div>

      <div className='grid grid-cols-2 gap-4'>
        {CATEGORIES_MASTER_CARDS.map((card) => {
          const hasRoute = Boolean(card.path);
          return (
            <button
              key={card.path ?? card.title}
              type='button'
              disabled={!hasRoute}
              onClick={() => handleCardNavigate(card.path)}
              aria-label={hasRoute ? `Open ${card.title}` : `${card.title} (coming soon)`}
              className={cn(
                'h-[74px] rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-4 py-3 flex items-center justify-between text-left transition-colors',
                hasRoute ? 'hover:bg-bg-weak-50' : 'opacity-60 cursor-not-allowed',
              )}
            >
              <div className='flex items-center gap-4 min-w-0'>
                <div className='size-10 rounded-xl bg-bg-weak-50 flex items-center justify-center shrink-0'>
                  <card.icon className='size-6 text-text-sub-500' aria-hidden />
                </div>
                <div className='min-w-0'>
                  <p className='label-small text-text-main-900'>{card.title}</p>
                  <p className='paragraph-xsmall text-text-sub-500 truncate'>{card.description}</p>
                </div>
              </div>
              <RiArrowRightSLine className='size-4 text-text-soft-400 shrink-0' aria-hidden />
            </button>
          );
        })}
      </div>
    </div>
  );
}
