import React from 'react';

const CardLayout = ({ cardTitle, cardDescription, children }) => {
  return (
    <div className='w-full min-h-full flex flex-col gap-5  items-start justify-between'>
      <div className=' flex flex-col items-start justify-center'>
        <span className='text-[var(--color-text-main-900)] label-small '>{cardTitle}</span>
        <span className='text-[var(--color-text-sub-500)] paragraph-xsmall '>
          {cardDescription}
        </span>
      </div>
      {children}
    </div>
  );
};

export default CardLayout;
