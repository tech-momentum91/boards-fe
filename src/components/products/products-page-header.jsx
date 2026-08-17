import React from 'react';
import { RiBox3Line } from 'react-icons/ri';

const ProductsPageHeader = () => {
  return (
    <header className='relative flex shrink-0 items-center border-b border-stroke-soft-200 bg-bg-white-0 py-4 pl-8 pr-6'>
      <div className='flex items-center gap-3.5'>
        <div className='flex size-10 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 p-2.5 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
          <RiBox3Line className='size-5 text-text-sub-500' aria-hidden />
        </div>
        <h1 className='label-large text-text-main-900'>Products</h1>
      </div>
    </header>
  );
};

export default ProductsPageHeader;
