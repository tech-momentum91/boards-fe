import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RiArrowRightSLine } from 'react-icons/ri';

import { CATEGORIES_MASTER_ROOT } from '@/pages/profile/categories-master-paths';

function CategoriesSectionShell({ sectionLabel, children }) {
  const navigate = useNavigate();

  return (
    <div className='flex w-full flex-col'>
      <div className='mb-5 flex items-center gap-2 border-b border-stroke-soft-200 pb-2'>
        <button
          type='button'
          onClick={() => navigate(CATEGORIES_MASTER_ROOT)}
          className='text-label-sm text-text-sub-500'
        >
          Categories Master
        </button>
        <RiArrowRightSLine className='size-4 text-text-sub-500' />
        <span className='text-label-sm text-text-strong-950'>{sectionLabel}</span>
      </div>
      {children}
    </div>
  );
}

export default CategoriesSectionShell;
