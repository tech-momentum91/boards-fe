import React from 'react';
import { RiStarSmileFill } from 'react-icons/ri';

const CsiThankYou = () => {
  return (
    <div className='w-full h-full flex items-center justify-center px-4 py-10'>
      <div className='max-w-md w-full bg-white border border-stroke-soft-200 rounded-2xl p-6 shadow-regular-large text-center'>
        <div className='mx-auto mb-4 flex items-center justify-center rounded-full bg-success-lighter size-14'>
          <RiStarSmileFill className='size-7 text-success-dark' />
        </div>
        <h1 className='text-title-h5 text-text-main-900 mb-2'>Thank you for your feedback!</h1>
        <p className='text-paragraph-sm text-text-sub-500'>
          Your responses have been recorded. We appreciate you taking the time to share your
          experience and help us improve our services.
        </p>
      </div>
    </div>
  );
};

export default CsiThankYou;
