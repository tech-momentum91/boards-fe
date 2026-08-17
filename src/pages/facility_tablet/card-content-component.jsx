import React from 'react';

export default function CardContentComponent({ children }) {
  return (
    <div className='w-full p-2 border border-stroke-soft-200 rounded-lg gap-1.5 bg-white flex flex-col'>
      {children}
    </div>
  );
}
