import React from 'react';
import commingSoon from '@/assets/images/commingSoon.png';

const ComingSoonMessage = () => {
  return (
    <div className='w-full h-full min-h-[60vh] flex flex-col items-center mt-16 px-6 py-22'>
      <img src={commingSoon} alt='comming soon' className='mb-6' />
      <p className='text-2xl font-medium leading-[32px] mb-2 text-text-main-900 text-center inline-block'>
        Coming soon!
      </p>
      <p className='font-normal text-sm leading-5 tracking-[-0.6%] text-[#525866]'>
        We will be updating this very soon.
      </p>
    </div>
  );
};

export default ComingSoonMessage;
