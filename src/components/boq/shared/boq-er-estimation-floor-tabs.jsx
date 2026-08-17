import React, { memo } from 'react';

import { cn } from '@/utils/cn';

const BoqErEstimationFloorTabs = ({ floors = [], activeFloorIndex, onFloorChange }) => (
  <div className='flex shrink-0 items-center gap-6 border-b border-t border-stroke-soft-200 bg-bg-weak-100 px-8 py-2'>
    {floors.map((floor, index) => {
      const isActive = index === activeFloorIndex;
      return (
        <button
          key={floor}
          type='button'
          onClick={() => onFloorChange?.(index)}
          className={cn(
            'relative flex items-center pb-px text-[14px] font-medium leading-5 tracking-[-0.084px] transition-colors',
            isActive ? 'text-text-main-900' : 'text-text-sub-500',
          )}
        >
          {floor}
          {isActive ? (
            <span className='absolute inset-x-0 -bottom-2 h-0.5 rounded-full bg-[#079455]' />
          ) : null}
        </button>
      );
    })}
  </div>
);

export default memo(BoqErEstimationFloorTabs);
